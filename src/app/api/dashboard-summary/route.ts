// POST /api/dashboard-summary
// Generates a short AI "what changed since last report" banner for the dashboard.
// Cached per-user in dashboard_insights so we don't re-bill every visit.

import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { currentUser } from "@clerk/nextjs/server";
import Anthropic from "@anthropic-ai/sdk";
import { supabaseServer } from "@/lib/supabase";
import { normalizeAnalyses, groupBySystem, biggestMovers, Analysis } from "@/lib/dashboardData";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const _rl = await rateLimit(request, "ai", { userId: user.id });
    if (_rl) return _rl;

    const sb = supabaseServer();
    const { data: rows, error } = await sb
      .from("lab_analyses")
      .select("id, created_at, report_date, source_filename, tier, summary, flags, labs_raw, health_score")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);
    if (error) throw error;

    const analyses = (rows ?? []) as Analysis[];
    if (analyses.length < 1) {
      return NextResponse.json({ insight: null });
    }

    const map = normalizeAnalyses(analyses);
    const systems = groupBySystem(map);
    const movers = biggestMovers(map, 5);

    // Collect raw flags from all analyses as a fallback when biomarker normalization yields no movers
    const allFlags = analyses.flatMap((a) =>
      (a.flags ?? []).map((f) => ({
        marker: (f as { marker?: string }).marker ?? "Unknown",
        value: (f as { value?: string | number }).value,
        unit: (f as { unit?: string }).unit,
        status: (f as { status?: string }).status,
        report_date: a.report_date ?? a.created_at,
      }))
    );

    const hasHistory = analyses.length >= 2;
    if (!hasHistory) {
      const latest = analyses[0];
      const flagCount = latest.flags?.length ?? 0;
      if (flagCount === 0) return NextResponse.json({ insight: "Your first report is in — every marker landed in range. Upload your next one to start tracking trends." });

      // Even with one report, generate a real summary from the flags
      const flagContext = {
        report_date: latest.report_date ?? latest.created_at,
        flags: allFlags.slice(0, 10),
        labs_total: (latest.labs_raw as unknown[])?.length ?? 0,
      };
      const resp = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [{ role: "user", content: `Write one short plain-English sentence (max 30 words) summarizing the key findings from this person's first lab report. Use specific marker names and values from the data. No disclaimers.\n\nData: ${JSON.stringify(flagContext)}\n\nReturn ONLY the sentence.` }],
      });
      const insight = resp.content[0].type === "text" ? resp.content[0].text.trim() : `Your first report flagged ${flagCount} marker${flagCount === 1 ? "" : "s"}. Upload your next lab to see how things change.`;
      return NextResponse.json({ insight });
    }

    const context = {
      reports_count: analyses.length,
      top_movers: movers.map((m) => ({
        marker: m.series.def.canonical,
        first: m.series.first.raw,
        latest: m.series.latest.raw,
        unit: m.series.latest.unit,
        delta_pct: Math.round(m.series.deltaPct),
        direction: m.direction,
        meaning: m.meaning,
        latest_zone: m.series.latestZone,
      })),
      system_breakdown: systems.map((s) => ({ system: s.system, total: s.total, optimal: s.optimal, in_range: s.normal, out_of_range: s.outOfRange })),
      // Raw flags as fallback when biomarker normalization finds no matches
      recent_flags: allFlags.slice(0, 15),
    };

    const resp = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 400,
      messages: [{
        role: "user",
        content: `You write one short, plain-English paragraph (~50 words max) summarizing what changed in this person's labs since their first report. Lead with the most important shift — positive or concerning. Use specific numbers from the data. No medical advice, no disclaimers, no bullet points. Data:\n\n${JSON.stringify(context)}\n\nReturn ONLY the paragraph text, nothing else.`,
      }],
    });

    const insight = resp.content[0].type === "text" ? resp.content[0].text.trim() : "";
    return NextResponse.json({ insight });
  } catch (err) {
    console.error("dashboard-summary error:", err);
    return NextResponse.json({ insight: null, error: err instanceof Error ? err.message : String(err) }, { status: 500 });
  }
}
