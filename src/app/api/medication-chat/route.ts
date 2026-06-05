// POST /api/medication-chat
// Streaming chat endpoint for the Medication Companion results page.
//
// Body: {
//   messages:        { role: "user"|"assistant", content: string }[],
//   analysisContext: { result, tier, language? },
// }
//
// Streams plain UTF-8 text chunks (no SSE framing). Client reads via
// response.body.getReader() and appends chunks to the assistant bubble.

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
  ja: "Japanese",
  pt: "Portuguese",
  it: "Italian",
  zh: "Simplified Chinese",
  ru: "Russian",
};

type Tier = "simple" | "medium" | "expert";

interface DepthBlock { simple: string; medium: string; expert: string }

interface ParsedMedication { name: string; dose?: string; frequency?: string; raw_input?: string }

interface SectionAMed {
  name: string;
  purpose: string;
  how_it_works: DepthBlock;
  dosing_context: DepthBlock;
  key_side_effects: string[];
  avoid: string[];
}

interface SectionBInteraction {
  between: [string, string];
  kind: "drug-drug" | "drug-food" | "drug-supplement";
  description: DepthBlock;
  severity: "minor" | "moderate" | "major";
}

interface SectionCRedFlag {
  medication: string;
  symptoms: string[];
  action: string;
}

interface AnalysisResult {
  parsed_medications?: ParsedMedication[];
  uncertain_items?: string[];
  section_a_medications?: SectionAMed[];
  section_b_interactions?: SectionBInteraction[];
  section_b_clear?: boolean;
  section_c_red_flags?: SectionCRedFlag[];
  section_d_questions?: string[];
  section_e_lab_context?: DepthBlock | null;
}

interface AnalysisContext {
  result: AnalysisResult;
  tier: Tier;
  language?: string;
}

interface ChatMsg { role: "user" | "assistant"; content: string }

const TIER_GUIDANCE: Record<Tier, string> = {
  simple:
    "Speak in plain, warm English — like talking to a worried friend. Avoid jargon. If you must use a medical term, define it the first time.",
  medium:
    "Assume the reader understands basic biology and is comfortable with common medical terms. Briefly explain anything specialised, and reference clinical context where useful.",
  expert:
    "Use full clinical terminology. Reference drug class, MOA, CYP450 interactions, severity grading, and monitoring parameters where appropriate. Keep it concise and rigorous.",
};

function fmtMedList(meds: ParsedMedication[] | undefined): string {
  if (!meds?.length) return "  (no parsed medications)";
  return meds
    .map((m) => `  • ${m.name}${m.dose ? " " + m.dose : ""}${m.frequency ? " " + m.frequency : ""}`)
    .join("\n");
}

function fmtSectionA(meds: SectionAMed[] | undefined, tier: Tier): string {
  if (!meds?.length) return "  (none)";
  return meds
    .map((m) => {
      const how = m.how_it_works?.[tier] ?? "";
      const dose = m.dosing_context?.[tier] ?? "";
      const sides = m.key_side_effects?.length ? m.key_side_effects.join(", ") : "(none listed)";
      const avoid = m.avoid?.length ? m.avoid.join(", ") : "(none listed)";
      return `  - ${m.name}\n      purpose: ${m.purpose}\n      how it works: ${how}\n      dosing context: ${dose}\n      key side effects: ${sides}\n      avoid: ${avoid}`;
    })
    .join("\n");
}

function fmtInteractions(ix: SectionBInteraction[] | undefined, tier: Tier, clear: boolean | undefined): string {
  if (clear || !ix?.length) return "  (no significant interactions found in this list)";
  return ix
    .map((i) => `  - [${i.severity.toUpperCase()}] ${i.between?.[0]} ↔ ${i.between?.[1]} (${i.kind}): ${i.description?.[tier] ?? ""}`)
    .join("\n");
}

function fmtRedFlags(rf: SectionCRedFlag[] | undefined): string {
  if (!rf?.length) return "  (none specific)";
  return rf
    .map((r) => `  - ${r.medication}: ${r.symptoms?.join("; ")} → ${r.action}`)
    .join("\n");
}

function buildSystemPrompt(ctx: AnalysisContext): string {
  const { result, tier, language } = ctx;
  const today = new Date().toISOString().slice(0, 10);
  const languageName = LANGUAGE_NAMES[language ?? "en"] || "English";

  return `You are Meridix Labs' Medication Companion AI — the user's private guide for understanding the medications they have already been prescribed. They have already seen the AI analysis below; you are here for follow-up questions about THIS specific medication list.

ALL replies must be written in ${languageName}.

DEPTH TIER: ${tier.toUpperCase()}
${TIER_GUIDANCE[tier]}

Rules:
- Ground every answer in the medication list and analysis below. If asked about something outside this list (e.g. a medication the user is not on), say so clearly — do not give blanket recommendations.
- NEVER tell the user to start, stop, or change a dose. Always frame next steps as "discuss with your doctor or pharmacist."
- NEVER tell the user their medication is wrong or their doctor made a mistake.
- Be concise. 1-3 short paragraphs unless the user asks for more depth. No bullet-point spam.
- If the user describes a symptom that matches the red-flag list, gently and clearly point them to that warning and tell them to seek care now — don't bury the lede.
- The platform already shows a global medical disclaimer. Do NOT end every reply with boilerplate. Add a single relevant clinical caveat only when it materially matters.

Today's date: ${today}.

— PARSED MEDICATION LIST —
${fmtMedList(result.parsed_medications)}
${result.uncertain_items?.length ? `\n— ITEMS THE ANALYSIS COULDN'T PARSE CONFIDENTLY —\n  ${result.uncertain_items.join("\n  ")}` : ""}

— SECTION A: MEDICATIONS (${tier} tier — what the user is currently reading) —
${fmtSectionA(result.section_a_medications, tier)}

— SECTION B: INTERACTIONS (${tier} tier) —
${fmtInteractions(result.section_b_interactions, tier, result.section_b_clear)}

— SECTION C: RED-FLAG WARNINGS (always shown) —
${fmtRedFlags(result.section_c_red_flags)}

— SECTION D: QUESTIONS THE USER MIGHT ASK THEIR DOCTOR —
${result.section_d_questions?.length ? result.section_d_questions.map((q) => `  - ${q}`).join("\n") : "  (none)"}
${result.section_e_lab_context ? `\n— SECTION E: PERSONALISED LAB / CONTEXT NOTES (${tier} tier) —\n  ${result.section_e_lab_context[tier]}` : ""}`;
}

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "ai");
  if (_rl) return _rl;
  let body: {
    messages?: ChatMsg[];
    analysisContext?: AnalysisContext;
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
  const analysisContext = body.analysisContext;

  if (!messages.length) {
    return new Response(JSON.stringify({ error: "No messages." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
  if (!analysisContext?.result) {
    return new Response(JSON.stringify({ error: "Missing analysisContext." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = buildSystemPrompt(analysisContext);

  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemPrompt,
          messages: messages.map((m) => ({ role: m.role, content: m.content })) as Anthropic.MessageParam[],
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
        console.error("[medication-chat] stream error:", err);
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
