import { NextRequest } from "next/server";
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
    "DEPTH: SIMPLE. Plain language, no medical jargon. Short sentences. Like a calm friend with medical training explaining at the kitchen table.",
  medium:
    "DEPTH: MEDIUM. Add clinical reasoning. Explain why specific age-based rules apply, what doctors look for, and the mechanism when relevant.",
  expert:
    "DEPTH: EXPERT. Full clinical language. Reference AAP guidance, serious bacterial infection (SBI) workup criteria, age-specific differentials (RSV, bronchiolitis, viral exanthem, etc.) where relevant.",
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

  return `You are Meridix Labs' Pediatric AI — a calm, evidence-based companion for a parent of a sick child. They have already seen the full triage guidance below; you are here for follow-up questions about THEIR child's specific situation.

${TIER_INSTRUCTIONS[tier]}

— CHILD AND CONCERN (as the parent reported) —
${inputSummary}
— END —

— TRIAGE GUIDANCE ALREADY SHOWN —
${analysisSnapshot}
— END GUIDANCE —

Rules:
- Ground every answer in the child's specific age and presentation above. Age is the first reasoning step, always.
- Be concise. 1–3 short paragraphs unless the parent asks for more. No bullet-point spam.
- If the parent describes a NEW symptom or change in condition, take it seriously — re-apply age-stratified triage rules and tell them clearly if the recommendation has changed.
- ANY universal pediatric red flag the parent mentions (petechiae/non-blanching rash, stiff neck with fever, altered mental status, seizure, severe respiratory distress with retractions/grunting/blue lips, signs of severe dehydration, anaphylaxis, suspected ingestion, suspected inflicted injury) — always escalate to ER NOW regardless of prior guidance.
- ANY fever in an infant under 90 days (<3 months) → ER NOW, no exceptions.
- NEVER recommend specific medication doses or brand names. For fever/pain, reference acetaminophen (from 2 months) or ibuprofen (from 6 months) generically, and tell parents to follow the dosing chart on the bottle or call their pediatrician/pharmacist. NEVER aspirin in children.
- NEVER use anxiety-amplifying language ("could be very serious," "potentially deadly"). Be honest about severity without dramatizing.
- NEVER tell a parent their concern isn't valid. If they feel something is wrong, support them in seeking care.
- When on the fence between two triage tiers, escalate to the higher one.
- Never diagnose — describe likely categories or what evaluation can determine.
- The platform shows a medical disclaimer. Do NOT end every reply with "I'm an AI" boilerplate.${langInstruction}`;
}

export async function POST(request: NextRequest) {
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
        console.error("[pediatric-chat] stream error:", err);
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
