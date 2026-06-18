// POST /api/insights-feed
// Returns 3 short, specific "things worth noticing" derived from the user's
// lab history + profile + medications. Combines deterministic signals
// (med→lab interactions, big movers, risk-tier changes) with a Claude pass
// for natural-language phrasing.

import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiError";
import { rateLimit } from "@/lib/ratelimit";
import { currentUser } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { IDENTITY_CONFIDENTIALITY } from "@/lib/toolChatConfig";
import { supabaseServer } from "@/lib/supabase";
import { normalizeAnalyses, biggestMovers, groupBySystem, Analysis } from "@/lib/dashboardData";
import { detectMedications, relevantInteractions } from "@/lib/medInteractions";
import { CATALOG } from "@/lib/biomarkers";
import { computeAllRisks } from "@/lib/riskScores";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface ProfileRow {
  age?: number | null;
  sex?: "male" | "female" | "other" | null;
  medications?: string | null;
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const _rl = await rateLimit(request, "ai", { userId: user.id });
    if (_rl) return _rl;

    const sb = supabaseServer();
    const [{ data: profile }, { data: rows }] = await Promise.all([
      sb.from("users_profile").select("*").eq("user_id", user.id).maybeSingle(),
      sb.from("lab_analyses")
        .select("id, created_at, report_date, source_filename, tier, summary, flags, labs_raw, health_score")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);

    const analyses = (rows ?? []) as Analysis[];
    if (!analyses.length) return NextResponse.json({ insights: [] });

    const map = normalizeAnalyses(analyses);
    const movers = biggestMovers(map, 5);
    const systems = groupBySystem(map);

    const prof = (profile ?? null) as ProfileRow | null;
    const meds = detectMedications(prof?.medications);
    const trackedSlugs = new Set(map.keys());
    const interactions = relevantInteractions(meds, trackedSlugs, CATALOG);

    const risks = computeAllRisks({
      series: map,
      age: prof?.age ?? null,
      sex: prof?.sex ?? null,
    }).filter((r) => r.tier && r.tier !== "low");

    const evidence = {
      reports_count: analyses.length,
      top_movers: movers.map((m) => ({
        marker: m.series.def.canonical,
        from: m.series.first.raw,
        to: m.series.latest.raw,
        delta_pct: Math.round(m.series.deltaPct),
        meaning: m.meaning,
        latest_zone: m.series.latestZone,
      })),
      worst_systems: systems.filter((s) => s.outOfRange > 0)
        .sort((a, b) => b.outOfRange - a.outOfRange)
        .slice(0, 3)
        .map((s) => ({ system: s.system, out_of_range: s.outOfRange, total: s.total })),
      med_interactions: interactions.slice(0, 5).map((i) => ({
        medication: i.med.display, marker: i.marker?.canonical, note: i.effect.note, severity: i.effect.severity,
      })),
      elevated_risks: risks.map((r) => ({ id: r.id, label: r.label, tier: r.tier, blurb: r.blurb })),
    };

    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 700,
      system: IDENTITY_CONFIDENTIALITY,
      messages: [{
        role: "user",
        content: `Generate exactly 3 short health insights for this user based on the evidence below. Each insight is a specific, actionable observation grounded in their actual data — no generic wellness platitudes.

Evidence:
${JSON.stringify(evidence, null, 2)}

Output a JSON array of exactly 3 insight objects with this shape:
[
  {
    "title": "<6-10 word title that names the specific finding>",
    "body": "<2-3 sentence explanation referencing actual numbers and what they mean for the user>",
    "category": "trend" | "risk" | "medication" | "system" | "general",
    "severity": "info" | "watch" | "important"
  }
]

Return ONLY the JSON array, nothing else. No code fence.`,
      }],
    });

    const text = resp.content.find((c) => c.type === "text")?.text?.trim() ?? "[]";
    const cleaned = text.replace(/^```(?:json)?\n?/, "").replace(/\n?```$/, "");
    let insights: unknown[] = [];
    try { insights = JSON.parse(cleaned); } catch {
      console.warn("insights-feed: failed to parse Claude output", cleaned.slice(0, 200));
    }

    return NextResponse.json({ insights });
  } catch (err) {
    return errorResponse("insights-feed", err);
  }
}
