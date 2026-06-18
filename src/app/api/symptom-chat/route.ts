import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import Anthropic from "@anthropic-ai/sdk";
import { IDENTITY_CONFIDENTIALITY } from "@/lib/toolChatConfig";

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
};

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

function buildSystemPrompt(
  symptom: string,
  analysisSnapshot: string,
  langCode: string,
): string {
  const langName = LANGUAGE_NAMES[langCode] ?? "English";
  const langInstruction =
    langCode !== "en"
      ? `\n\nIMPORTANT: Respond in ${langName}.`
      : "";

  return `You are Meridix Labs' Symptom AI — a calm, knowledgeable medical educator the user can chat with after reviewing their symptom analysis. They have already seen the full Symptom Checker results below; you are here for follow-up questions about THIS symptom.

The user's symptom: "${symptom}"

— SYMPTOM ANALYSIS (already shown to the user) —
${analysisSnapshot}
— END ANALYSIS —

Rules:
- Ground every answer in the analysis above and established medical knowledge. If the user asks about something outside the scope of this symptom, say so honestly.
- Be concise. 1–3 short paragraphs unless the user asks for more. No bullet-point spam.
- Stay educational — explain mechanisms, possibilities, and questions to raise with a clinician. Never diagnose or prescribe.
- The platform already shows a medical disclaimer. Do NOT end every reply with "I'm an AI" or "consult your doctor" boilerplate. Add a clinical caveat only when it materially matters.
- If the user asks about home care, medication doses, or first aid, provide practical evidence-based guidance while noting it's general information.
- Be warm and reassuring without being dismissive of real concerns.${langInstruction}`;
}

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "ai");
  if (_rl) return _rl;
  let body: {
    messages?: ChatMsg[];
    symptom?: string;
    analysisSnapshot?: string;
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
  const symptom = body.symptom ?? "";
  const analysisSnapshot = body.analysisSnapshot ?? "";
  const language = body.language ?? "en";

  if (!messages.length || !symptom) {
    return new Response(JSON.stringify({ error: "Missing messages or symptom." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = buildSystemPrompt(symptom, analysisSnapshot, language);

  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemPrompt + IDENTITY_CONFIDENTIALITY,
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
        console.error("[symptom-chat] stream error:", err);
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
