// POST /api/chat
// Unified streaming chat endpoint for the persistent ToolChatSidebar.
//
// Body: {
//   messages:    { role: "user"|"assistant", content: string }[],
//   toolName:    string         // e.g. "Lab Analyzer"
//   toolContext?: string | null // serialized results from the tool page
// }
//
// Streams plain UTF-8 text chunks (no SSE framing). Client reads via
// response.body.getReader() and appends chunks to the assistant bubble.

import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import Anthropic from "@anthropic-ai/sdk";
import { GLOBAL_SYSTEM_PROMPT, TOOL_CHAT_REGISTRY } from "@/lib/toolChatConfig";
import {
  MAX_MESSAGE_CHARS,
  MAX_MESSAGES,
  MAX_TOOL_CONTEXT_CHARS,
  capText,
} from "@/lib/inputLimits";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface ChatRequestBody {
  messages?: ChatMsg[];
  toolName?: string;
  toolContext?: string | null;
}

function findHintFor(toolName: string): string {
  const entry = TOOL_CHAT_REGISTRY.find((t) => t.toolName === toolName);
  return entry?.systemHint ?? "";
}

function buildSystemPrompt(toolName: string, toolContext: string | null): string {
  const hint = findHintFor(toolName);
  const today = new Date().toISOString().slice(0, 10);

  const contextBlock = toolContext
    ? `\n\n— TOOL CONTEXT (results currently on screen) —\n${toolContext}\n`
    : "\n\n(The user has not generated results yet. Help them describe their situation or use the tool.)";

  return `${GLOBAL_SYSTEM_PROMPT}

ACTIVE TOOL: ${toolName}
${hint}

Today's date: ${today}.${contextBlock}`;
}

function sanitizeMessages(messages: ChatMsg[]): Anthropic.MessageParam[] {
  return messages
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string" && m.content.trim().length > 0)
    // Cap conversation length (keep the most recent turns) and per-turn size
    // so a single request can't balloon the token bill.
    .slice(-MAX_MESSAGES)
    .map((m) => ({ role: m.role, content: capText(m.content, MAX_MESSAGE_CHARS) }));
}

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "ai");
  if (_rl) return _rl;
  let body: ChatRequestBody;
  try {
    body = await request.json();
  } catch {
    return new Response(JSON.stringify({ error: "Invalid JSON" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const messages = Array.isArray(body.messages) ? sanitizeMessages(body.messages) : [];
  const toolName = typeof body.toolName === "string" && body.toolName.trim() ? body.toolName.trim().slice(0, 80) : "Meridix";
  const toolContext = typeof body.toolContext === "string" && body.toolContext.trim()
    ? capText(body.toolContext, MAX_TOOL_CONTEXT_CHARS)
    : null;

  if (!messages.length) {
    return new Response(JSON.stringify({ error: "No messages." }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const systemPrompt = buildSystemPrompt(toolName, toolContext);
  const encoder = new TextEncoder();

  const readable = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        const stream = await client.messages.stream({
          model: "claude-sonnet-4-6",
          max_tokens: 1024,
          system: systemPrompt,
          messages,
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
        console.error("[chat] stream error:", err);
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
