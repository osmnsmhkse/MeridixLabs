// POST /api/biomarker-insight
// Body: { slug: string }
// Returns a short Claude-generated plain-English interpretation of the
// signed-in user's history for that biomarker.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { currentUser } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase";
import { bySlug } from "@/lib/biomarkers";
import { normalizeAnalyses, Analysis } from "@/lib/dashboardData";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "ai");
  if (_rl) return _rl;
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { slug } = await request.json();
    const def = slug ? bySlug(slug) : null;
    if (!def) return NextResponse.json({ error: "Unknown biomarker" }, { status: 400 });

    const sb = supabaseServer();
    const [{ data: rows, error }, { data: profile }] = await Promise.all([
      sb.from("lab_analyses")
        .select("id, created_at, report_date, source_filename, tier, summary, flags, labs_raw, health_score")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(20),
      sb.from("users_profile")
        .select("age, sex, medications, conditions")
        .eq("user_id", user.id)
        .single(),
    ]);
    if (error) throw error;

    const map = normalizeAnalyses((rows ?? []) as Analysis[]);
    const series = map.get(def.slug);
    if (!series) return NextResponse.json({ insight: null });

    const context = {
      marker: {
        name: def.canonical,
        system: def.system,
        unit: def.unit,
        optimal: def.optimal,
        normal: def.normal,
        direction: def.direction,
      },
      patient: {
        age: profile?.age ?? null,
        sex: profile?.sex ?? null,
        medications: profile?.medications ?? null,
        conditions: profile?.conditions ?? null,
      },
      readings: series.readings.map((r) => ({ date: r.date.slice(0, 10), value: r.value, zone: r.zone })),
      delta_pct: Math.round(series.deltaPct),
      latest_zone: series.latestZone,
    };

    const resp = await client.messages.create({
      model: "claude-sonnet-4-0",
      max_tokens: 500,
      messages: [{
        role: "user",
        content: `You explain one biomarker's trend for a patient in plain English. Write 2-4 sentences max. Cover: (1) what this marker means, (2) where their value is and the trend, (3) one concrete thing that commonly influences it. No medical advice, no "consult your doctor" disclaimers, no bullets, no headers. Data:\n\n${JSON.stringify(context)}\n\nReturn ONLY the paragraph.`,
      }],
    });

    const insight = resp.content[0].type === "text" ? resp.content[0].text.trim() : "";
    return NextResponse.json({ insight });
  } catch (err) {
    console.error("biomarker-insight error:", err);
    return NextResponse.json({ insight: null, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
