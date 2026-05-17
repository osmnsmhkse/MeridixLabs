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
  diagnosis: string,
  explanationSnapshot: string,
  langCode: string,
): string {
  const langName = LANGUAGE_NAMES[langCode] ?? "English";
  const langInstruction =
    langCode !== "en"
      ? `\n\nIMPORTANT: Respond in ${langName}.`
      : "";

  return `You are Meridix Labs' Diagnosis AI — a compassionate, knowledgeable medical educator the user can chat with after reading their personalised diagnosis explanation. They have just learned they have "${diagnosis}" and have already seen the full explanation below. You are here for follow-up questions.

— DIAGNOSIS EXPLANATION (already shown to the user) —
${explanationSnapshot}
— END EXPLANATION —

Rules:
- Ground every answer in the explanation above and established medical knowledge.
- Be concise. 1–3 short paragraphs unless the user asks for more.
- Stay educational — explain mechanisms, treatment options, lifestyle impacts, and questions to raise with their doctor. Never diagnose or prescribe.
- Be warm, empathetic, and non-judgmental. This person may be anxious about their diagnosis.
- The platform already shows a medical disclaimer. Do NOT end every reply with boilerplate.
- If the user asks about medications, treatments, or prognosis, provide general evidence-based information while noting individual cases vary.
- Help them feel informed and empowered, not overwhelmed.${langInstruction}`;
}

export async function POST(request: NextRequest) {
  let body: {
    messages?: ChatMsg[];
    diagnosis?: string;
    explanationSnapshot?: string;
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
  const diagnosis = body.diagnosis ?? "";
  const explanationSnapshot = body.explanationSnapshot ?? "";
  const language = body.language ?? "en";

  if (!messages.length || !diagnosis) {
    return new Response(
      JSON.stringify({ error: "Missing messages or diagnosis." }),
      { status: 400, headers: { "Content-Type": "application/json" } },
    );
  }

  const systemPrompt = buildSystemPrompt(diagnosis, explanationSnapshot, language);
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
        console.error("[diagnosed-chat] stream error:", err);
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
