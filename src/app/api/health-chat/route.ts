// POST /api/health-chat
// Body: { messages: { role: "user"|"assistant", content: string | ContentBlock[] }[] }
//   ContentBlock = { type: "text", text } | { type: "image", source: { type: "base64", media_type, data } }
// Returns a Claude response grounded in the signed-in user's lab history
// + profile. Profile + recent labs become a system message; the user's
// chat turns are appended verbatim. Multimodal content blocks are passed
// through to Claude untouched (used for attachment uploads from the chat UI).

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase";
import { normalizeAnalyses, groupBySystem, biggestMovers, Analysis } from "@/lib/dashboardData";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SYSTEM_TEMPLATE = `You are Meridix Labs' personal health AI — the user's private interpreter for their own lab and clinical history. You help them understand patterns in their data, ask thoughtful follow-up questions, and explain medical reasoning in plain English.

Rules:
- Ground every answer in the data provided below. If the data doesn't support an answer, say so honestly — do not speculate beyond the evidence.
- Cite specific values with units when you reference them (e.g., "your LDL of 142 mg/dL on Apr 30").
- Give the user real, useful information. Don't refuse to share medical reasoning, lab interpretation, or general guidance — that's the entire purpose of this product.
- Always frame medication and dietary suggestions as "things to discuss with your physician" rather than prescriptions.
- Be concise. 1-3 short paragraphs unless the user explicitly asks for more depth. No bullet point spam.
- Do NOT include disclaimers like "I'm an AI" or "consult your doctor" boilerplate at the end of every message — the platform already shows a global disclaimer. One sentence at most when actually clinically relevant.

Today's date: {today}.

— USER PROFILE —
{profile}

— LAB HISTORY (oldest → newest) —
{labs}

— BIOMARKER TRENDS (top movers since first report) —
{movers}

— BODY-SYSTEM SCORES —
{systems}
`;

function fmtProfile(p: Record<string, unknown> | null): string {
  if (!p) return "No profile information.";
  const lines: string[] = [];
  const push = (label: string, key: string) => {
    const v = p[key];
    if (v != null && v !== "") lines.push(`${label}: ${v}`);
  };
  push("Age", "age");
  push("Sex", "sex");
  push("Weight (kg)", "weight_kg");
  push("Height (cm)", "height_cm");
  push("Ethnicity", "ethnicity");
  push("Medications", "medications");
  push("Allergies", "allergies");
  push("Conditions", "conditions");
  push("Family history", "family_history");
  push("Lifestyle notes", "lifestyle_notes");
  return lines.length ? lines.join("\n") : "No profile fields filled in.";
}

function fmtLabs(analyses: Analysis[]): string {
  if (!analyses.length) return "No lab reports on file yet.";
  const out: string[] = [];
  for (const a of [...analyses].reverse()) {
    const date = a.report_date ?? a.created_at?.slice(0, 10);
    out.push(`\n[${date}] ${a.source_filename ?? "report"} — score ${a.health_score ?? "?"}, ${a.flags?.length ?? 0} flags`);
    if (a.summary) out.push(`  Summary: ${a.summary}`);
    const labs = (a.labs_raw ?? []).slice(0, 30);
    for (const l of labs) {
      const s = l.status && l.status !== "normal" ? ` [${l.status.toUpperCase()}]` : "";
      out.push(`  • ${l.marker}: ${l.value}${l.unit ? " " + l.unit : ""}${l.reference ? ` (ref ${l.reference})` : ""}${s}`);
    }
  }
  return out.join("\n");
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    type ContentBlock =
      | { type: "text"; text: string }
      | { type: "image"; source: { type: "base64"; media_type: string; data: string } };
    interface IncomingMsg {
      role: "user" | "assistant";
      content: string | ContentBlock[];
    }
    const messages: IncomingMsg[] = Array.isArray(body?.messages) ? body.messages : [];
    if (!messages.length) return NextResponse.json({ error: "No messages." }, { status: 400 });

    const sb = supabaseServer();
    const [{ data: profile }, { data: rows }] = await Promise.all([
      sb.from("users_profile").select("*").eq("user_id", user.id).maybeSingle(),
      sb.from("lab_analyses")
        .select("id, created_at, report_date, source_filename, tier, summary, flags, labs_raw, health_score")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(20),
    ]);

    const analyses = (rows ?? []) as Analysis[];
    const map = normalizeAnalyses(analyses);
    const systems = groupBySystem(map);
    const movers = biggestMovers(map, 5);

    const moversTxt = movers.length
      ? movers.map((m) => `${m.series.def.canonical}: ${m.series.first.raw}${m.series.first.unit ? " " + m.series.first.unit : ""} → ${m.series.latest.raw}${m.series.latest.unit ? " " + m.series.latest.unit : ""} (${m.series.deltaPct >= 0 ? "+" : ""}${Math.round(m.series.deltaPct)}%, ${m.meaning})`).join("\n")
      : "Need at least 2 reports to see trends.";

    const systemsTxt = systems.length
      ? systems.map((s) => `${s.system}: ${s.score}/100 (${s.optimal} optimal · ${s.normal} in-range · ${s.outOfRange} out)`).join("\n")
      : "No biomarkers normalized yet.";

    const sys = SYSTEM_TEMPLATE
      .replace("{today}", new Date().toISOString().slice(0, 10))
      .replace("{profile}", fmtProfile(profile as Record<string, unknown> | null))
      .replace("{labs}", fmtLabs(analyses))
      .replace("{movers}", moversTxt)
      .replace("{systems}", systemsTxt);

    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 1024,
      system: sys,
      messages: messages as Anthropic.MessageParam[],
    });

    const reply = resp.content
      .map((c) => (c.type === "text" ? c.text : ""))
      .join("")
      .trim();

    return NextResponse.json({ reply });
  } catch (err) {
    console.error("health-chat error:", err);
    return NextResponse.json({
      error: "Something went wrong.",
      detail: err instanceof Error ? err.message : String(err),
    }, { status: 500 });
  }
}
