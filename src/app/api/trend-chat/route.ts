import { NextRequest } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ChatMsg {
  role: "user" | "assistant";
  content: string;
}

interface TrendDataPoint {
  date: string;
  value: number;
  status: string;
  marker: string;
  unit: string;
  reference: string;
}

function buildSystemPrompt(
  trendSnapshot: string,
  allDataPoints: TrendDataPoint[],
): string {
  const markerSummary = Object.entries(
    allDataPoints.reduce((acc, dp) => {
      if (!acc[dp.marker]) acc[dp.marker] = [];
      acc[dp.marker].push(dp);
      return acc;
    }, {} as Record<string, TrendDataPoint[]>)
  )
    .map(([marker, points]) => {
      const sorted = points.sort(
        (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
      );
      const first = sorted[0];
      const last = sorted[sorted.length - 1];
      const change =
        sorted.length > 1
          ? `${(((last.value - first.value) / first.value) * 100).toFixed(1)}%`
          : "single reading";
      return `  ${marker}: ${sorted.map((p) => `${p.value} ${p.unit} (${p.date}, ${p.status})`).join(" → ")} | ref: ${first.reference} | change: ${change}`;
    })
    .join("\n");

  return `You are Meridix Labs' Trend AI — a calm, knowledgeable medical educator helping users understand their lab value trends over time. You have access to their complete trend data.

— TREND DATA —
${trendSnapshot}

— RAW DATA POINTS —
${markerSummary}
— END DATA —

Rules:
- Ground every answer in the trend data above and established medical knowledge.
- Be concise. 1–3 short paragraphs unless the user asks for more detail.
- Identify patterns: improving, worsening, stable, or fluctuating trends.
- When discussing multiple markers, note relationships between them (e.g., liver enzymes together, lipid panel as a group).
- Suggest actionable lifestyle changes when relevant (diet, exercise, hydration, sleep).
- Stay educational — explain what markers mean, why trends matter, and what questions to raise with a clinician. Never diagnose or prescribe.
- The platform already shows a medical disclaimer. Do NOT end every reply with "I'm an AI" or "consult your doctor" boilerplate. Add a clinical caveat only when it materially matters.
- If the user asks about something not covered in their data, say so honestly.
- Be warm, encouraging about improvements, and calm about areas of concern.`;
}

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "ai");
  if (_rl) return _rl;
  let body: {
    messages?: ChatMsg[];
    trendSnapshot?: string;
    allDataPoints?: TrendDataPoint[];
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
  const trendSnapshot = body.trendSnapshot ?? "";
  const allDataPoints = body.allDataPoints ?? [];

  if (!messages.length || !trendSnapshot) {
    return new Response(
      JSON.stringify({ error: "Missing messages or trend data." }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const systemPrompt = buildSystemPrompt(trendSnapshot, allDataPoints);

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
        console.error("[trend-chat] stream error:", err);
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
