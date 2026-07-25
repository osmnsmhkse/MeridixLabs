import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import Anthropic from "@anthropic-ai/sdk";
import { IDENTITY_CONFIDENTIALITY } from "@/lib/toolChatConfig";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "ai-heavy");
  if (_rl) return _rl;
  try {
    const { marker, unit, reference, dataPoints } = await request.json() as {
      marker: string;
      unit: string;
      reference: string;
      dataPoints: Array<{ date: string; value: number; status: string }>;
    };

    if (!marker || !dataPoints?.length) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    const sorted = [...dataPoints].sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    );

    const tableLines = sorted.map(
      (d) =>
        `  ${new Date(d.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}: ${d.value} ${unit} (${d.status})`
    );

    const first = sorted[0].value;
    const last  = sorted[sorted.length - 1].value;
    const pct   = (((last - first) / first) * 100).toFixed(1);
    const dir   = last > first ? "increased" : last < first ? "decreased" : "stayed stable";

    const prompt = `You are a medical educator at Meridix Labs. A patient is tracking their ${marker} (${unit}) over time.

Trend data:
${tableLines.join("\n")}

Reference range: ${reference || "not provided"}
Overall change: ${dir} by ${Math.abs(Number(pct))}% from first to last reading.

Write a 2–3 sentence trend summary in plain, warm language. Note whether the trend is improving, worsening, or stable. If improving, acknowledge the effort. If worsening, be calm and suggest next steps. Never diagnose. Be encouraging and educational.`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 300,
      system: IDENTITY_CONFIDENTIALITY,
      messages: [{ role: "user", content: prompt }],
    });

    const summary =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ summary });
  } catch (error) {
    console.error("Trend summary error:", error);
    return NextResponse.json(
      { error: "Could not generate trend summary." },
      { status: 500 }
    );
  }
}
