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
type Mode = "prep" | "debrief";

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

const TIER_INSTRUCTIONS: Record<Tier, string> = {
  simple:
    "DEPTH: SIMPLE. Plain language, no medical jargon. Like a well-read friend helping prepare for or unpack the visit.",
  medium:
    "DEPTH: MEDIUM. Add clinical context — what tests typically reveal, how doctors think about the presentation, common follow-up patterns.",
  expert:
    "DEPTH: EXPERT. Full clinical reasoning. Reference standard workup pathways, diagnostic criteria, and guideline-driven decision-making where relevant.",
};

function buildPrepSystemPrompt(
  inputSummary: string,
  analysisSnapshot: string,
  tier: Tier,
  langName: string,
  langInstruction: string,
): string {
  return `You are Meridix Labs' Visit Companion AI — a calm, well-read assistant helping a patient PREPARE for an upcoming doctor's appointment. They have already seen the full visit-prep kit below; you are here for follow-up questions about THIS upcoming visit.

${TIER_INSTRUCTIONS[tier]}

— PATIENT'S CONCERN AND CONTEXT —
${inputSummary}
— END —

— VISIT-PREP KIT ALREADY SHOWN —
${analysisSnapshot}
— END KIT —

Rules:
- Ground every answer in the patient's specific concern and context above. No generic advice.
- Frame everything as "things to raise with the doctor" or "questions to consider asking" — never as recommendations, diagnoses, or instructions.
- Be concise. 1–3 short paragraphs unless asked for more.
- If the patient asks "should I go to urgent care instead" or describes a clearly worsening symptom, take it seriously and tell them honestly when to escalate.
- Never diagnose. Never tell them what their condition is. You help them prepare smart questions, you don't replace the visit.
- Suggest follow-up questions, vocabulary to use, or test names to ask about — tailored to their picture.
- The platform shows a disclaimer. Skip the "I'm an AI" / "consult your doctor" boilerplate unless materially relevant.${langInstruction}`;
}

function buildDebriefSystemPrompt(
  inputSummary: string,
  analysisSnapshot: string,
  tier: Tier,
  langName: string,
  langInstruction: string,
): string {
  return `You are Meridix Labs' Visit Companion AI — a calm, well-read assistant helping a patient UNDERSTAND a doctor's visit that already happened. They have already seen the full visit debrief below; you are here for follow-up questions about what was discussed, prescribed, or recommended.

${TIER_INSTRUCTIONS[tier]}

— PATIENT'S NOTES / PAPERWORK CONTEXT —
${inputSummary}
— END —

— VISIT DEBRIEF ALREADY SHOWN —
${analysisSnapshot}
— END DEBRIEF —

Rules:
- Ground every answer in what was actually discussed during their visit. Don't invent details.
- Explain medical terms, prescriptions, test names, and follow-up instructions in plain English (or the appropriate clinical depth based on tier).
- Translate jargon — never second-guess the doctor's clinical decisions.
- Be concise. 1–3 short paragraphs unless asked for more.
- If the patient mentions a NEW or worsening symptom (not in the visit notes), take it seriously and tell them honestly when to contact the doctor again or seek urgent care.
- If asked about a medication, explain what it does, why it might have been prescribed for their picture, and common things to monitor. Never give specific dose changes — that's the doctor's job.
- Never tell the patient their doctor was wrong. If something seems off, frame it as "this is worth asking your doctor about."
- The platform shows a disclaimer. Skip "I'm an AI" / "consult your doctor" boilerplate unless materially relevant.${langInstruction}`;
}

export async function POST(request: NextRequest) {
  let body: {
    messages?: ChatMsg[];
    mode?: Mode;
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
  const mode: Mode = body.mode === "debrief" ? "debrief" : "prep";
  const inputSummary = (body.inputSummary ?? "").slice(0, 4000);
  const analysisSnapshot = (body.analysisSnapshot ?? "").slice(0, 8000);
  const tier: Tier =
    body.tier === "simple" || body.tier === "expert" ? body.tier : "medium";
  const language = body.language ?? "en";
  const langName = LANGUAGE_NAMES[language] ?? "English";
  const langInstruction =
    language !== "en" ? `\n\nIMPORTANT: Respond in ${langName}.` : "";

  if (!messages.length || !inputSummary) {
    return new Response(JSON.stringify({ error: "Missing messages or context." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt =
    mode === "prep"
      ? buildPrepSystemPrompt(inputSummary, analysisSnapshot, tier, langName, langInstruction)
      : buildDebriefSystemPrompt(inputSummary, analysisSnapshot, tier, langName, langInstruction);

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
        console.error("[visit-chat] stream error:", err);
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
