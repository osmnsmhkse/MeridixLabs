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

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const TIER_INSTRUCTIONS: Record<Tier, string> = {
  simple:
    "DEPTH: SIMPLE. Plain language, no jargon. Explain like a patient genetic counsellor at a kitchen table.",
  medium:
    "DEPTH: MEDIUM. Mention gene names and basic mechanism. Distinguish risk factors from determinants. Explain penetrance when relevant.",
  expert:
    "DEPTH: EXPERT. Use full clinical genetics language — penetrance, expressivity, allele frequency, ACMG variant classification. Reference standard clinical pathways (e.g., when clinical confirmatory testing is indicated, what a clinical panel covers vs. consumer testing).",
};

function buildSystemPrompt(
  inputSummary: string,
  analysisSnapshot: string,
  tier: Tier,
  langCode: string,
): string {
  const langName = LANGUAGE_NAMES[langCode] ?? "English";
  const langInstruction =
    langCode !== "en" ? `\n\nIMPORTANT: Respond in ${langName}.` : "";

  return `You are Meridix Labs' Genetics AI — a calibrated, calm companion for someone interpreting a genetic test result. They have already seen the full explanation below; you are here for follow-up questions about THIS variant or report.

${TIER_INSTRUCTIONS[tier]}

— USER'S INPUT (variant text, report excerpt, or context they provided) —
${inputSummary}
— END —

— EXPLANATION ALREADY SHOWN —
${analysisSnapshot}
— END EXPLANATION —

Rules:
- Ground every answer in the user's specific variant(s) and the explanation above. Don't drift into generic genetics 101.
- Be CALIBRATED. Consumer genetics is full of overhyped claims. A risk factor is not a determinant. Penetrance varies — most carriers of most variants never develop the associated condition. Say so clearly when relevant.
- Be especially careful with: APOE ε4 (risk factor, not determinant); BRCA "negative" from 23andMe (only 3 Ashkenazi variants — not a full BRCA workup); MTHFR (the online narrative is wildly overblown); Factor V Leiden (real but absolute risk is modest in heterozygotes without other factors); HFE C282Y (homozygosity ≠ active hemochromatosis); ALDH2 *2 (real cancer risk only with continued alcohol use).
- When clinical confirmatory testing is warranted (family history of cancer, planning a pregnancy, planning surgery, etc.), say so directly — recommend a genetic counsellor referral.
- Be concise. 1–3 short paragraphs unless the user asks for more.
- Never diagnose. Never tell them they "have" a disease — variants are predispositions, not diagnoses.
- Never recommend specific medication or supplement regimens off the back of a variant. That requires a physician's evaluation.
- The platform shows a disclaimer. Skip the "I'm an AI" / "consult your doctor" boilerplate unless materially relevant.${langInstruction}`;
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

  if (!messages.length || !inputSummary) {
    return new Response(JSON.stringify({ error: "Missing messages or context." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = buildSystemPrompt(inputSummary, analysisSnapshot, tier, language);
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
        console.error("[genetics-chat] stream error:", err);
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
