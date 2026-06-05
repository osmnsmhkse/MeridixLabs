import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  tr: "Turkish",
  fr: "French",
  de: "German",
  ar: "Arabic",
  ru: "Russian",
  ja: "Japanese",
  pt: "Portuguese",
  it: "Italian",
  zh: "Simplified Chinese",
};

type Tier = "simple" | "medium" | "expert";
type Mode = "a" | "b" | "c";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const TIER_INSTRUCTIONS: Record<Tier, string> = {
  simple:
    "DEPTH: SIMPLE. Plain language, no medical jargon. Short, calm sentences. Validate experience. Focus on what this means for HER and what she can do.",
  medium:
    "DEPTH: MEDIUM. Add clinical context. Explain hormonal axes, what doctors typically look for, what additional workup looks like.",
  expert:
    "DEPTH: EXPERT. Full clinical language. Differential reasoning, pathophysiology, cycle-day-aware ranges, guideline references (ACOG, NAMS, ESHRE) where applicable.",
};

const MODE_FRAMING: Record<Mode, string> = {
  a: "The user uploaded or pasted hormone or fertility lab results. Every answer must respect cycle-day context — if cycle day is unknown, do not interpret day-specific values (estradiol, LH, FSH, progesterone) authoritatively.",
  b: "The user described cycle or symptom concerns. Be aggressive about flagging commonly-dismissed patterns (endometriosis, lean PCOS, perimenopause in 40s, ferritin deficiency, subclinical thyroid, adenomyosis, PMDD).",
  c: "The user is tracking a pregnancy. Apply trimester-appropriate reasoning. Always escalate universal pregnancy red flags directly (heavy bleeding, severe one-sided pain, severe headache with visual changes after week 20, sudden facial/hand swelling with headache, decreased fetal movement after 24–28 weeks, fever >100.4°F, sudden gush of fluid, regular contractions before 37 weeks, hyperemesis with inability to keep fluids down, thoughts of self-harm).",
};

function buildSystemPrompt(
  mode: Mode,
  inputSummary: string,
  analysisSnapshot: string,
  tier: Tier,
  langCode: string,
): string {
  const langName = LANGUAGE_NAMES[langCode] ?? "English";
  const langInstruction =
    langCode !== "en" ? `\n\nIMPORTANT: Respond in ${langName}.` : "";

  return `You are Meridix Labs' Women's Health Companion AI — calm, evidence-based, and never dismissive. The user has already received the guidance below; you are here for follow-up questions specific to HER situation.

${TIER_INSTRUCTIONS[tier]}

— USER'S CONTEXT (what she shared) —
${inputSummary}
— END —

— GUIDANCE ALREADY SHOWN —
${analysisSnapshot}
— END GUIDANCE —

${MODE_FRAMING[mode]}

RULES:
- Be concise. 1–3 short paragraphs unless she asks for more. No bullet-point spam.
- Validate her experience. If she's worried, that is a signal worth taking seriously.
- Never minimize symptoms that pattern with a commonly-missed condition (endometriosis, lean PCOS, perimenopause in 40s, low ferritin without anemia, subclinical thyroid).
- Never recommend specific medications, doses, supplements, or hormone replacement protocols.
- Never make assertions about pregnancy outcomes or pregnancy options that go beyond medical interpretation — those decisions are between her and her clinician.
- If she describes a NEW symptom that maps to a red flag (universal pediatric red flag, pregnancy red flag, severe pelvic pain, severe one-sided abdominal pain, post-menopausal bleeding, fever with pelvic symptoms, decreased fetal movement after 24–28 weeks, severe headache with visual changes in pregnancy after week 20), escalate clearly — "call your provider now" or "go to the ER" — no hedging.
- Never diagnose. Describe possibilities and what evaluation can determine.
- Use inclusive language where natural ("people who menstruate," "pregnant person") while keeping the help concrete.
- Do not end every reply with "I'm an AI" boilerplate — the platform shows the disclaimer.${langInstruction}`;
}

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "ai");
  if (_rl) return _rl;
  let body: {
    messages?: ChatMsg[];
    inputSummary?: string;
    analysisSnapshot?: string;
    tier?: Tier;
    language?: string;
    mode?: Mode;
  };

  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = Array.isArray(body.messages) ? body.messages : [];
  const inputSummary = (body.inputSummary ?? "").slice(0, 4000);
  const analysisSnapshot = (body.analysisSnapshot ?? "").slice(0, 8000);
  const tier: Tier =
    body.tier === "simple" || body.tier === "expert" ? body.tier : "medium";
  const language = body.language ?? "en";
  const mode: Mode =
    body.mode === "a" || body.mode === "b" || body.mode === "c" ? body.mode : "b";

  if (!messages.length || !inputSummary) {
    return new Response(JSON.stringify({ error: "Missing messages or context." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = buildSystemPrompt(
    mode,
    inputSummary,
    analysisSnapshot,
    tier,
    language,
  );
  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map((m) => ({
            role: m.role,
            content: m.content,
          })) as Anthropic.MessageParam[],
        });

        for await (const event of stream) {
          if (
            event.type === "content_block_delta" &&
            event.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(event.delta.text));
          }
        }

        controller.close();
      } catch (err) {
        console.error("[womens-health-chat] stream error:", err);
        const message = err instanceof Error ? err.message : "Stream failed";
        try {
          controller.enqueue(encoder.encode(`\n\n[error] ${message}`));
        } catch {
          /* noop */
        }
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      "X-Accel-Buffering": "no",
    },
  });
}
