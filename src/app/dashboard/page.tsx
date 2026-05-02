"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { BODY_SYSTEMS, CATALOG } from "@/lib/biomarkers";
import {
  normalizeAnalyses,
  groupBySystem,
  biggestMovers,
  overallScore,
  type Analysis,
  type NormalizedSeries,
  type SystemBreakdown,
  type BiggestMover,
} from "@/lib/dashboardData";
import { detectMedications, relevantInteractions, type DetectedInteraction } from "@/lib/medInteractions";
import { computeAllRisks, tierColor, type RiskScore } from "@/lib/riskScores";

interface InsightItem {
  title: string;
  body: string;
  category?: "trend" | "risk" | "medication" | "system" | "general";
  severity?: "info" | "watch" | "important";
}

interface ProfileShape {
  age: number | null;
  sex: "male" | "female" | "other" | null;
  medications: string | null;
}

const AUTH_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function DashboardPage() {
  if (!AUTH_ENABLED) return <AuthDisabledNotice />;
  return <DashboardInner />;
}

function AuthDisabledNotice() {
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-surface px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold text-ink">Accounts aren&apos;t enabled</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          The account system is coming soon. Every Meridix Labs tool works without signing up.
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg text-sm hover:bg-brand-blue-hover transition-all"
        >
          Go home
        </Link>
      </div>
    </div>
  );
}

function DashboardInner() {
  const { isLoaded, isSignedIn, user } = useUser();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [profile, setProfile] = useState<ProfileShape | null>(null);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);
  const [insights, setInsights] = useState<InsightItem[]>([]);
  const [insightsLoading, setInsightsLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      try {
        const [a, p] = await Promise.all([
          fetch("/api/user-analyses").then((r) => r.json()),
          fetch("/api/user-profile").then((r) => r.json()).catch(() => null),
        ]);
        setAnalyses(a?.analyses ?? []);
        if (p?.profile) {
          setProfile({
            age: p.profile.age ?? null,
            sex: p.profile.sex ?? null,
            medications: p.profile.medications ?? null,
          });
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || analyses.length === 0) return;
    setInsightLoading(true);
    setInsightsLoading(true);
    (async () => {
      try {
        const r = await fetch("/api/dashboard-summary", { method: "POST" });
        const j = await r.json();
        if (r.ok) setInsight(j.insight ?? null);
      } finally { setInsightLoading(false); }
    })();
    (async () => {
      try {
        const r = await fetch("/api/insights-feed", { method: "POST" });
        const j = await r.json();
        if (r.ok && Array.isArray(j.insights)) setInsights(j.insights as InsightItem[]);
      } finally { setInsightsLoading(false); }
    })();
  }, [isSignedIn, analyses.length]);

  const { systems, movers, score, scoreStats, seriesMap, latest, totalFlags, risks, interactions, zoneStats, scoreDelta, scoreSeries } = useMemo(() => {
    const seriesMap = normalizeAnalyses(analyses);
    const systems = groupBySystem(seriesMap);
    const movers = biggestMovers(seriesMap, 3);

    // Compute aggregate score: prefer normalized; fall back to AVERAGE across all stored health_scores
    const validScores: number[] = analyses
      .map((a) => a.health_score)
      .filter((s): s is number => typeof s === "number");
    const avgStored = validScores.length > 0
      ? Math.round(validScores.reduce((a, b) => a + b, 0) / validScores.length)
      : null;
    const score = overallScore(systems) ?? avgStored;
    const scoreStats = {
      avg: avgStored,
      min: validScores.length > 0 ? Math.min(...validScores) : null,
      max: validScores.length > 0 ? Math.max(...validScores) : null,
      latestStored: analyses[0]?.health_score ?? null,
      reportsCount: analyses.length,
    };

    // Score over time, oldest → newest, for timeline chart
    const scoreSeries = analyses
      .filter((a) => typeof a.health_score === "number")
      .slice()
      .sort((a, b) => {
        const ad = new Date(a.report_date ?? a.created_at).getTime();
        const bd = new Date(b.report_date ?? b.created_at).getTime();
        return ad - bd;
      })
      .map((a) => ({
        date: a.report_date ?? a.created_at,
        score: a.health_score as number,
      }));

    const latest = analyses[0] ?? null;
    const totalFlags = analyses.reduce((acc, a) => acc + (a.flags?.length ?? 0), 0);
    const risks = computeAllRisks({
      series: seriesMap,
      age: profile?.age ?? null,
      sex: profile?.sex ?? null,
    });
    const meds = detectMedications(profile?.medications);
    const trackedSlugs = new Set(seriesMap.keys());
    const interactions = relevantInteractions(meds, trackedSlugs, CATALOG);

    // Zone breakdown — prefer normalized series, fall back to raw flags from latest report
    let zoneOptimal = 0, zoneNormal = 0, zoneOutOfRange = 0, zoneTotal = 0;
    if (seriesMap.size > 0) {
      for (const s of systems) {
        zoneOptimal += s.optimal; zoneNormal += s.normal; zoneOutOfRange += s.outOfRange; zoneTotal += s.total;
      }
    } else if (latest) {
      const flagged = latest.flags?.length ?? 0;
      const rawTotal = (latest.labs_raw as unknown[] | null)?.length ?? 0;
      zoneOutOfRange = flagged;
      zoneNormal = Math.max(0, rawTotal - flagged);
      zoneTotal = rawTotal;
    }
    const zoneStats = { optimal: zoneOptimal, normal: zoneNormal, outOfRange: zoneOutOfRange, total: zoneTotal };

    // Score trend vs previous report
    const scoreDelta =
      analyses.length >= 2 && analyses[0]?.health_score != null && analyses[1]?.health_score != null
        ? analyses[0].health_score - analyses[1].health_score
        : null;

    return { systems, movers, score, scoreStats, seriesMap, latest, totalFlags, risks, interactions, zoneStats, scoreDelta, scoreSeries };
  }, [analyses, profile]);

  if (!isLoaded || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-surface">
        <div className="text-sm text-ink-tertiary">Loading your dashboard…</div>
      </div>
    );
  }

  const greeting = user?.firstName ? `Welcome back, ${user.firstName}` : "Welcome back";

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-6 flex flex-col md:flex-row md:items-end md:justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold text-ink">{greeting}</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              Your private health dashboard — labs, trends, and timeline.
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/dashboard/chat"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-brand-blue/40 bg-brand-blue/5 text-brand-blue hover:bg-brand-blue/10 font-semibold rounded-lg text-sm transition-all"
            >
              <span aria-hidden>💬</span> Ask AI
            </Link>
            <Link
              href="/dashboard/goals"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-surface-border text-ink-secondary hover:border-brand-blue hover:text-brand-blue font-semibold rounded-lg text-sm transition-all"
            >
              🎯 Goals
            </Link>
            <Link
              href="/dashboard/supplements"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-surface-border text-ink-secondary hover:border-brand-blue hover:text-brand-blue font-semibold rounded-lg text-sm transition-all"
            >
              💊 Supplements
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-surface-border text-ink-secondary hover:border-brand-blue hover:text-brand-blue font-semibold rounded-lg text-sm transition-all"
            >
              Profile
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold rounded-lg text-sm transition-all"
            >
              New analysis
            </Link>
          </div>
        </div>

        {analyses.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* ── ULTRA HERO: Score, Timeline, Donut, Body, Stats ── */}
            <div className="rounded-3xl border border-surface-border bg-gradient-to-br from-white via-white to-brand-blue/5 dark:from-slate-900 dark:via-slate-900 dark:to-brand-blue/10 overflow-hidden mb-6 shadow-sm">

              {/* Top: gauge | timeline | donut */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-0">

                {/* Score hero */}
                <div className="md:col-span-4 p-6 border-b md:border-b-0 md:border-r border-surface-border flex flex-col">
                  <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-1">Overall Health Score</p>
                  <p className="text-[10px] text-ink-tertiary mb-4">Aggregated across all reports</p>

                  <div className="flex items-center gap-5 flex-1">
                    <BigGauge score={score} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline gap-2 flex-wrap">
                        <span className={`text-5xl font-black tabular-nums leading-none ${scoreColor(score ?? 0)}`}>{score ?? "—"}</span>
                        <span className="text-sm font-bold text-ink-tertiary">/100</span>
                      </div>
                      <p className={`mt-1.5 text-base font-bold ${scoreColor(score ?? 0)}`}>
                        {(score ?? 0) >= 85 ? "Excellent" : (score ?? 0) >= 70 ? "Good" : (score ?? 0) >= 55 ? "Fair" : "Needs attention"}
                      </p>
                      {scoreDelta != null && (
                        <p className={`mt-1 text-xs font-bold inline-flex items-center gap-1 ${scoreDelta > 0 ? "text-emerald-600" : scoreDelta < 0 ? "text-red-600" : "text-ink-tertiary"}`}>
                          {scoreDelta > 0 ? "▲" : scoreDelta < 0 ? "▼" : "="} {Math.abs(scoreDelta)} from previous
                        </p>
                      )}
                    </div>
                  </div>

                  {scoreStats.avg != null && scoreStats.min != null && scoreStats.max != null && analyses.length >= 2 && (
                    <div className="mt-5 grid grid-cols-3 gap-2 border-t border-surface-border pt-4">
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wide">Avg</p>
                        <p className={`text-lg font-bold tabular-nums ${scoreColor(scoreStats.avg)}`}>{scoreStats.avg}</p>
                      </div>
                      <div className="text-center border-x border-surface-border">
                        <p className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wide">Best</p>
                        <p className="text-lg font-bold tabular-nums text-emerald-600">{scoreStats.max}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wide">Lowest</p>
                        <p className="text-lg font-bold tabular-nums text-red-600">{scoreStats.min}</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Timeline chart */}
                <div className="md:col-span-5 p-6 border-b md:border-b-0 md:border-r border-surface-border flex flex-col">
                  <div className="flex items-center justify-between mb-3">
                    <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest">Score Over Time</p>
                    <span className="text-[10px] text-ink-tertiary">{scoreSeries.length} report{scoreSeries.length === 1 ? "" : "s"}</span>
                  </div>
                  <div className="flex-1 flex items-center">
                    {scoreSeries.length >= 2 ? (
                      <ScoreTimeline data={scoreSeries} />
                    ) : (
                      <div className="text-center w-full py-8">
                        <p className="text-xs text-ink-tertiary">Upload at least 2 reports to see your trend.</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Zone donut */}
                <div className="md:col-span-3 p-6 flex flex-col">
                  <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3">Zone Breakdown</p>
                  <div className="flex-1 flex items-center justify-center">
                    {zoneStats.total > 0 ? (
                      <ZoneDonut stats={zoneStats} />
                    ) : (
                      <p className="text-xs text-ink-tertiary text-center">No biomarkers tracked.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom: body diagram + system rankings + key metrics */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border-t border-surface-border">

                {/* Body diagram */}
                <div className="md:col-span-4 p-6 border-b md:border-b-0 md:border-r border-surface-border bg-surface-raised/30">
                  <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3">Body Map</p>
                  <BodyDiagram systems={systems} />
                </div>

                {/* System rankings */}
                <div className="md:col-span-5 p-6 border-b md:border-b-0 md:border-r border-surface-border">
                  <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3">System Health</p>
                  {systems.length > 0 ? (
                    <ul className="space-y-2.5">
                      {systems.slice().sort((a, b) => a.score - b.score).slice(0, 6).map((s) => {
                        const meta = BODY_SYSTEMS[s.system];
                        return (
                          <li key={s.system} className="flex items-center gap-3">
                            <span className="text-base flex-shrink-0">{meta.emoji}</span>
                            <span className="text-xs font-semibold text-ink min-w-[110px] flex-shrink-0">{meta.label}</span>
                            <div className="flex-1 h-2 rounded-full overflow-hidden bg-surface-border">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{
                                  width: `${s.score}%`,
                                  background: s.score >= 80 ? "#10b981" : s.score >= 60 ? "#f59e0b" : "#ef4444",
                                }}
                              />
                            </div>
                            <span className={`text-xs font-bold tabular-nums w-8 text-right ${scoreColor(s.score)}`}>{s.score}</span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-xs text-ink-tertiary">System scores require recognized biomarkers.</p>
                      <p className="text-[10px] text-ink-tertiary mt-1">Try uploading reports in English for best results.</p>
                    </div>
                  )}
                </div>

                {/* Key metrics */}
                <div className="md:col-span-3 p-6">
                  <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3">Key Metrics</p>
                  <div className="space-y-3">
                    <MetricRow icon="📊" label="Markers" value={zoneStats.total > 0 ? String(zoneStats.total) : String(analyses.reduce((a, b) => a + ((b.labs_raw as unknown[] | null ?? []).length), 0))} />
                    <MetricRow icon="📁" label="Reports" value={String(analyses.length)} />
                    <MetricRow icon="🚩" label="Total Flags" value={String(totalFlags)} valueClass={totalFlags > 0 ? "text-red-600" : "text-emerald-600"} />
                    <MetricRow icon="📅" label="Latest" value={formatShortDate(latest?.report_date ?? latest?.created_at ?? "")} />
                    {scoreSeries.length > 0 && (
                      <MetricRow icon="📈" label="Tracking" value={`${formatShortDate(scoreSeries[0].date)} →`} />
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* AI summary - full width */}
            <div className="rounded-2xl border border-brand-blue/30 bg-gradient-to-br from-brand-blue/5 to-transparent p-5 mb-6">
              <div className="flex items-start justify-between gap-4 flex-wrap">
                <div className="flex-1 min-w-0">
                  <p className="text-[11px] font-bold text-brand-blue uppercase tracking-widest">AI Summary</p>
                  {insightLoading ? (
                    <div className="mt-3 flex items-center gap-2 text-sm text-ink-tertiary">
                      <span className="w-3 h-3 rounded-full bg-brand-blue/30 animate-pulse" />
                      Reading your history…
                    </div>
                  ) : insight ? (
                    <p className="mt-3 text-sm text-ink leading-relaxed">{insight}</p>
                  ) : (
                    <p className="mt-3 text-sm text-ink-tertiary">No summary available yet.</p>
                  )}
                </div>
                <Link href="/dashboard/chat" className="text-xs text-brand-blue hover:underline font-semibold whitespace-nowrap">Ask a follow-up →</Link>
              </div>
            </div>

            {/* Biggest movers */}
            {movers.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">Biggest changes</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {movers.map((m) => <MoverCard key={m.series.def.slug} mover={m} />)}
                </div>
              </div>
            )}

            {/* Body systems grid (detailed) */}
            {systems.length > 0 && (
              <>
                <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">Body systems · detail</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {systems.map((s) => <SystemCard key={s.system} breakdown={s} />)}
                </div>
              </>
            )}

            {/* AI insights feed */}
            <div className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">Worth noticing</p>
                {!insightsLoading && insights.length > 0 && (
                  <Link href="/dashboard/chat" className="text-xs text-brand-blue hover:underline">Ask follow-ups →</Link>
                )}
              </div>
              {insightsLoading ? (
                <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 p-5 text-sm text-ink-tertiary">
                  Surfacing patterns from your data…
                </div>
              ) : insights.length === 0 ? (
                <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 p-5 text-sm text-ink-tertiary">
                  Upload more reports to see longitudinal insights.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  {insights.slice(0, 3).map((i, idx) => <InsightCard key={idx} insight={i} />)}
                </div>
              )}
            </div>

            {/* Risk scores */}
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">Risk assessments</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
              {risks.map((r) => <RiskCard key={r.id} risk={r} />)}
            </div>

            {/* Medication interactions */}
            {interactions.length > 0 && (
              <div className="mb-6">
                <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">Medication insights</p>
                <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 overflow-hidden">
                  <ul className="divide-y divide-surface-border">
                    {interactions.map((i, idx) => <InteractionRow key={idx} item={i} />)}
                  </ul>
                </div>
              </div>
            )}

            {/* Reports list */}
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">All reports</p>
            <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 overflow-hidden">
              <ul className="divide-y divide-surface-border">
                {analyses.map((a) => (
                  <ReportRow
                    key={a.id}
                    analysis={a}
                    onDelete={(id) => setAnalyses((prev) => prev.filter((x) => x.id !== id))}
                    onUpdate={(id, patch) => setAnalyses((prev) => prev.map((x) => x.id === id ? { ...x, ...patch } : x))}
                  />
                ))}
              </ul>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function BigGauge({ score }: { score: number | null }) {
  const s = score ?? 0;
  const radius = 56;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - s / 100);
  const color = s >= 80 ? "#10b981" : s >= 60 ? "#f59e0b" : "#ef4444";
  const trackColor = "rgba(148,163,184,0.18)";
  const gradId = "gauge-grad-hero";
  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
        <defs>
          <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={color} stopOpacity="0.7" />
            <stop offset="100%" stopColor={color} stopOpacity="1" />
          </linearGradient>
        </defs>
        <circle cx="64" cy="64" r={radius} fill="none" stroke={trackColor} strokeWidth="11" />
        <circle
          cx="64" cy="64" r={radius}
          fill="none"
          stroke={`url(#${gradId})`}
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1100ms cubic-bezier(0.22, 1, 0.36, 1)" }}
        />
        {/* Tick marks at 25/50/75 */}
        {[0.25, 0.5, 0.75].map((p) => {
          const angle = p * 2 * Math.PI;
          const x1 = 64 + Math.cos(angle) * (radius - 7);
          const y1 = 64 + Math.sin(angle) * (radius - 7);
          const x2 = 64 + Math.cos(angle) * (radius + 7);
          const y2 = 64 + Math.sin(angle) * (radius + 7);
          return <line key={p} x1={x1} y1={y1} x2={x2} y2={y2} stroke="rgba(148,163,184,0.5)" strokeWidth="1.5" />;
        })}
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div
          className="w-20 h-20 rounded-full flex items-center justify-center"
          style={{ background: `radial-gradient(circle, ${color}25 0%, transparent 70%)` }}
        >
          <svg viewBox="0 0 24 24" fill="none" className="w-9 h-9" style={{ color }}>
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
      </div>
    </div>
  );
}

function ScoreTimeline({ data }: { data: { date: string; score: number }[] }) {
  const W = 320, H = 110, PAD_X = 14, PAD_Y_TOP = 12, PAD_Y_BOT = 22;
  const innerW = W - PAD_X * 2;
  const innerH = H - PAD_Y_TOP - PAD_Y_BOT;
  const xs = data.map((_, i) => PAD_X + (i * innerW) / Math.max(1, data.length - 1));
  const ys = data.map((d) => PAD_Y_TOP + innerH - (d.score / 100) * innerH);
  const linePath = xs.map((x, i) => `${i === 0 ? "M" : "L"} ${x} ${ys[i]}`).join(" ");
  const areaPath = `${linePath} L ${xs[xs.length - 1]} ${PAD_Y_TOP + innerH} L ${xs[0]} ${PAD_Y_TOP + innerH} Z`;
  const lastIdx = data.length - 1;
  const lastY = ys[lastIdx];
  const lastScore = data[lastIdx].score;
  const lastColor = lastScore >= 80 ? "#10b981" : lastScore >= 60 ? "#f59e0b" : "#ef4444";

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto">
      <defs>
        <linearGradient id="timeline-area" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.25" />
          <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
        </linearGradient>
        <linearGradient id="timeline-line" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#3b82f6" />
          <stop offset="100%" stopColor="#6366f1" />
        </linearGradient>
      </defs>
      {/* baseline grid lines at 50 and 80 */}
      {[50, 80].map((g) => {
        const y = PAD_Y_TOP + innerH - (g / 100) * innerH;
        return (
          <g key={g}>
            <line x1={PAD_X} y1={y} x2={W - PAD_X} y2={y} stroke="rgba(148,163,184,0.18)" strokeDasharray="2,3" />
            <text x={W - PAD_X + 2} y={y + 3} fontSize="8" fill="rgba(148,163,184,0.7)">{g}</text>
          </g>
        );
      })}
      {/* area + line */}
      <path d={areaPath} fill="url(#timeline-area)" />
      <path d={linePath} fill="none" stroke="url(#timeline-line)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      {/* dots */}
      {xs.map((x, i) => (
        <circle key={i} cx={x} cy={ys[i]} r={i === lastIdx ? 4 : 2.5} fill={i === lastIdx ? lastColor : "#ffffff"} stroke={i === lastIdx ? "#fff" : "#3b82f6"} strokeWidth="1.5" />
      ))}
      {/* last value pill */}
      <g transform={`translate(${xs[lastIdx] - 18},${Math.max(0, lastY - 22)})`}>
        <rect width="36" height="16" rx="8" fill={lastColor} />
        <text x="18" y="11" fontSize="9" fontWeight="700" fill="#fff" textAnchor="middle">{lastScore}</text>
      </g>
      {/* x-axis date labels */}
      <text x={PAD_X} y={H - 5} fontSize="9" fill="rgba(148,163,184,0.85)">{formatShortDate(data[0].date)}</text>
      <text x={W - PAD_X} y={H - 5} fontSize="9" fill="rgba(148,163,184,0.85)" textAnchor="end">{formatShortDate(data[lastIdx].date)}</text>
    </svg>
  );
}

function ZoneDonut({ stats }: { stats: { optimal: number; normal: number; outOfRange: number; total: number } }) {
  const { optimal, normal, outOfRange, total } = stats;
  const segs = [
    { v: optimal, color: "#10b981", label: "Optimal" },
    { v: normal, color: "#f59e0b", label: "Normal" },
    { v: outOfRange, color: "#ef4444", label: "Flagged" },
  ].filter((s) => s.v > 0);

  const R = 42, r = 28, CX = 50, CY = 50;
  let startAngle = -Math.PI / 2;
  const totalSafe = total > 0 ? total : 1;

  return (
    <div className="flex flex-col items-center w-full">
      <div className="relative">
        <svg viewBox="0 0 100 100" className="w-28 h-28">
          {segs.map((s, i) => {
            const sweep = (s.v / totalSafe) * 2 * Math.PI;
            const endAngle = startAngle + sweep;
            const x1 = CX + R * Math.cos(startAngle);
            const y1 = CY + R * Math.sin(startAngle);
            const x2 = CX + R * Math.cos(endAngle);
            const y2 = CY + R * Math.sin(endAngle);
            const x3 = CX + r * Math.cos(endAngle);
            const y3 = CY + r * Math.sin(endAngle);
            const x4 = CX + r * Math.cos(startAngle);
            const y4 = CY + r * Math.sin(startAngle);
            const large = sweep > Math.PI ? 1 : 0;
            const d = `M ${x1} ${y1} A ${R} ${R} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${r} ${r} 0 ${large} 0 ${x4} ${y4} Z`;
            startAngle = endAngle;
            return <path key={i} d={d} fill={s.color} stroke="#fff" strokeWidth="1.2" />;
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-bold text-ink leading-none">{total}</span>
          <span className="text-[9px] font-bold text-ink-tertiary uppercase tracking-wider mt-0.5">markers</span>
        </div>
      </div>
      <div className="mt-4 w-full space-y-1.5">
        {segs.map((s, i) => (
          <div key={i} className="flex items-center justify-between text-xs">
            <span className="flex items-center gap-1.5 text-ink-secondary">
              <span className="w-2 h-2 rounded-full" style={{ background: s.color }} />
              {s.label}
            </span>
            <span className="font-bold text-ink tabular-nums">{s.v}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BodyDiagram({ systems }: { systems: SystemBreakdown[] }) {
  const get = (sys: string) => systems.find((s) => s.system === sys);
  const card = get("cardiovascular");
  const liver = get("liver");
  const kidney = get("kidney");
  const metab = get("metabolic");
  const thyroid = get("thyroid");
  const blood = get("hematology");

  // Status → color palette (active organs glow; inactive stay muted but visible)
  const colorFor = (s?: SystemBreakdown) => {
    if (!s) return { primary: "#64748b", glow: "#94a3b8", core: "#cbd5e1", active: false };
    if (s.score >= 80) return { primary: "#10b981", glow: "#6ee7b7", core: "#a7f3d0", active: true };
    if (s.score >= 60) return { primary: "#f59e0b", glow: "#fcd34d", core: "#fde68a", active: true };
    return { primary: "#ef4444", glow: "#fca5a5", core: "#fecaca", active: true };
  };

  const cardC = colorFor(card);
  const liverC = colorFor(liver);
  const kidneyC = colorFor(kidney);
  const metabC = colorFor(metab);
  const thyroidC = colorFor(thyroid);
  const bloodC = colorFor(blood);

  const organGradients: Array<[string, ReturnType<typeof colorFor>]> = [
    ["heart", cardC],
    ["liver", liverC],
    ["kidney", kidneyC],
    ["stomach", metabC],
    ["thyroid", thyroidC],
    ["blood", bloodC],
  ];

  return (
    <div className="flex flex-col gap-3">
      {/* ─── Holographic scanner panel ─── */}
      <div
        className="relative rounded-2xl overflow-hidden border border-cyan-400/20 shadow-xl shadow-cyan-500/10"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 50% 0%, rgba(56,189,248,0.18) 0%, transparent 60%), radial-gradient(ellipse at 50% 100%, rgba(99,102,241,0.18) 0%, transparent 60%), linear-gradient(180deg, #0a1428 0%, #0a1c2e 50%, #050d1c 100%)",
        }}
      >
        {/* Grid mesh background — fades at edges */}
        <div
          className="absolute inset-0 opacity-[0.22] pointer-events-none"
          style={{
            backgroundImage:
              "linear-gradient(rgba(125,211,252,0.55) 1px, transparent 1px), linear-gradient(90deg, rgba(125,211,252,0.55) 1px, transparent 1px)",
            backgroundSize: "18px 18px",
            maskImage: "radial-gradient(ellipse at center, black 50%, transparent 95%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, black 50%, transparent 95%)",
          }}
        />

        {/* Scanning line (animated, uses .scan-line from globals.css) */}
        <div className="absolute inset-x-0 top-0 bottom-0 scan-line pointer-events-none" />

        {/* Status pill */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-10 pointer-events-none">
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
          <span className="text-[9px] font-bold text-cyan-300/90 uppercase tracking-[0.25em]">Body Scan</span>
        </div>

        {/* Body SVG */}
        <svg viewBox="0 0 200 430" className="relative w-full h-auto" style={{ filter: "drop-shadow(0 0 12px rgba(99,102,241,0.15))" }}>
          <defs>
            {/* Body silhouette gradient — translucent cyan/indigo */}
            <linearGradient id="body-fill" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(165,243,252,0.18)" />
              <stop offset="50%" stopColor="rgba(99,102,241,0.10)" />
              <stop offset="100%" stopColor="rgba(56,189,248,0.04)" />
            </linearGradient>

            {/* Body rim-light stroke gradient */}
            <linearGradient id="body-stroke" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="rgba(186,230,253,0.95)" />
              <stop offset="55%" stopColor="rgba(125,211,252,0.7)" />
              <stop offset="100%" stopColor="rgba(99,102,241,0.55)" />
            </linearGradient>

            {/* Organ glow filter */}
            <filter id="organGlow" x="-100%" y="-100%" width="300%" height="300%">
              <feGaussianBlur stdDeviation="2.4" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>

            {/* Per-organ radial gradients (3D shading: light from upper-left) */}
            {organGradients.map(([id, c]) => (
              <radialGradient key={id} id={`organ-${id}`} cx="32%" cy="28%" r="75%">
                <stop offset="0%" stopColor={c.core} stopOpacity={c.active ? 1 : 0.7} />
                <stop offset="45%" stopColor={c.glow} stopOpacity={c.active ? 0.95 : 0.55} />
                <stop offset="100%" stopColor={c.primary} stopOpacity={c.active ? 0.6 : 0.2} />
              </radialGradient>
            ))}
          </defs>

          {/* Body silhouette */}
          <g fill="url(#body-fill)" stroke="url(#body-stroke)" strokeWidth="1.1" strokeLinejoin="round">
            {/* head */}
            <ellipse cx="100" cy="42" rx="24" ry="30" />
            {/* neck */}
            <path d="M 88 68 L 88 86 Q 100 90 112 86 L 112 68 Z" />
            {/* torso */}
            <path d="
              M 72 86
              Q 60 88 56 100
              L 52 138
              Q 50 162 53 188
              L 58 220
              Q 62 230 74 232
              L 126 232
              Q 138 230 142 220
              L 147 188
              Q 150 162 148 138
              L 144 100
              Q 140 88 128 86
              Z
            " />
            {/* left arm */}
            <path d="
              M 56 100
              Q 38 110 32 150
              Q 28 198 36 240
              L 52 238
              Q 54 200 56 170
              Q 58 140 62 110
              Z
            " />
            {/* right arm */}
            <path d="
              M 144 100
              Q 162 110 168 150
              Q 172 198 164 240
              L 148 238
              Q 146 200 144 170
              Q 142 140 138 110
              Z
            " />
            {/* left leg */}
            <path d="
              M 74 232
              Q 66 252 68 285
              Q 70 322 76 360
              L 82 410
              L 100 410
              L 102 360
              Q 104 322 102 285
              Q 100 252 100 234
              Z
            " />
            {/* right leg */}
            <path d="
              M 126 232
              Q 134 252 132 285
              Q 130 322 124 360
              L 118 410
              L 100 410
              L 98 360
              Q 96 322 98 285
              Q 100 252 100 234
              Z
            " />
          </g>

          {/* Subtle anatomical hint lines (collarbone, sternum) */}
          <g stroke="rgba(165,243,252,0.28)" strokeWidth="0.6" fill="none" strokeLinecap="round">
            <path d="M 72 96 Q 100 104 128 96" />
            <line x1="100" y1="106" x2="100" y2="216" strokeDasharray="2 4" />
          </g>

          {/* ─── Organs (with depth glow) ─── */}
          <g filter="url(#organGlow)">
            {/* Thyroid — bow-tie at base of neck */}
            <path
              d="M 91 80 Q 86 78 86 82 Q 90 84 95 84 L 105 84 Q 110 84 114 82 Q 114 78 109 80 Q 100 76 91 80 Z"
              fill="url(#organ-thyroid)"
              stroke={thyroidC.glow}
              strokeWidth="0.5"
              strokeOpacity={thyroidC.active ? 0.8 : 0.25}
            />

            {/* Heart — anatomically left of midline */}
            <path
              d="M 86 122
                 C 79 114, 68 117, 68 128
                 C 68 140, 86 156, 92 162
                 C 98 156, 116 140, 116 128
                 C 116 117, 105 114, 98 122
                 C 94 127, 90 127, 86 122 Z"
              fill="url(#organ-heart)"
              stroke={cardC.glow}
              strokeWidth="0.7"
              strokeOpacity={cardC.active ? 0.85 : 0.25}
            />

            {/* Liver — upper right abdomen, large lobe */}
            <path
              d="M 104 168
                 Q 132 165 142 178
                 Q 146 192 138 202
                 Q 124 208 110 204
                 Q 99 198 100 184
                 Q 100 173 104 168 Z"
              fill="url(#organ-liver)"
              stroke={liverC.glow}
              strokeWidth="0.7"
              strokeOpacity={liverC.active ? 0.85 : 0.25}
            />

            {/* Stomach (metabolic) — upper-left under ribs */}
            <path
              d="M 70 178
                 Q 64 188 70 202
                 Q 80 212 92 206
                 Q 96 192 90 180
                 Q 80 173 70 178 Z"
              fill="url(#organ-stomach)"
              stroke={metabC.glow}
              strokeWidth="0.7"
              strokeOpacity={metabC.active ? 0.85 : 0.25}
            />

            {/* Kidneys — bean-shaped, lower back */}
            <path
              d="M 76 212 Q 68 216 70 228 Q 73 238 82 235 Q 87 230 86 222 Q 84 213 76 212 Z"
              fill="url(#organ-kidney)"
              stroke={kidneyC.glow}
              strokeWidth="0.6"
              strokeOpacity={kidneyC.active ? 0.85 : 0.25}
            />
            <path
              d="M 124 212 Q 132 216 130 228 Q 127 238 118 235 Q 113 230 114 222 Q 116 213 124 212 Z"
              fill="url(#organ-kidney)"
              stroke={kidneyC.glow}
              strokeWidth="0.6"
              strokeOpacity={kidneyC.active ? 0.85 : 0.25}
            />

            {/* Blood — central droplet at chest level (sternum) */}
            <path
              d="M 100 102 Q 95 110 95 116 Q 95 122 100 122 Q 105 122 105 116 Q 105 110 100 102 Z"
              fill="url(#organ-blood)"
              stroke={bloodC.glow}
              strokeWidth="0.6"
              strokeOpacity={bloodC.active ? 0.85 : 0.25}
            />
          </g>

          {/* Active-organ pulse rings (one ring per active flagged organ for emphasis) */}
          {[
            { c: cardC, cx: 92, cy: 138, r: 22 },
            { c: liverC, cx: 122, cy: 188, r: 22 },
            { c: kidneyC, cx: 100, cy: 224, r: 26 },
            { c: metabC, cx: 81, cy: 192, r: 18 },
          ].filter((x) => x.c.active && x.c !== cardC ? false : true).map((p, i) =>
            p.c.active && p.c.primary !== "#10b981" ? (
              <circle
                key={i}
                cx={p.cx}
                cy={p.cy}
                r={p.r}
                fill="none"
                stroke={p.c.glow}
                strokeWidth="0.5"
                opacity="0.4"
              >
                <animate attributeName="r" values={`${p.r * 0.6};${p.r * 1.1};${p.r * 0.6}`} dur="3s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0;0.5;0" dur="3s" repeatCount="indefinite" />
              </circle>
            ) : null
          )}
        </svg>

        {/* Tech corner brackets */}
        <div className="absolute top-2 left-2 w-3 h-3 border-l-2 border-t-2 border-cyan-400/50 pointer-events-none" />
        <div className="absolute top-2 right-2 w-3 h-3 border-r-2 border-t-2 border-cyan-400/50 pointer-events-none" />
        <div className="absolute bottom-2 left-2 w-3 h-3 border-l-2 border-b-2 border-cyan-400/50 pointer-events-none" />
        <div className="absolute bottom-2 right-2 w-3 h-3 border-r-2 border-b-2 border-cyan-400/50 pointer-events-none" />

        {/* Bottom telemetry strip */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex items-center gap-3 text-[8px] font-mono-data text-cyan-300/70 uppercase tracking-widest pointer-events-none">
          <span>SYS·{systems.length.toString().padStart(2, "0")}</span>
          <span className="opacity-50">|</span>
          <span>CH·{systems.filter((s) => s.score < 80).length.toString().padStart(2, "0")}</span>
          <span className="opacity-50">|</span>
          <span className="text-emerald-300/80">LIVE</span>
        </div>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 w-full">
        {[
          { c: cardC, label: "Heart", sys: card },
          { c: liverC, label: "Liver", sys: liver },
          { c: kidneyC, label: "Kidney", sys: kidney },
          { c: metabC, label: "Metabolic", sys: metab },
          { c: thyroidC, label: "Thyroid", sys: thyroid },
          { c: bloodC, label: "Blood", sys: blood },
        ].map((it, i) => (
          <div key={i} className="flex items-center gap-1.5 text-[10px]">
            <span
              className="w-2 h-2 rounded-full flex-shrink-0"
              style={{
                background: it.c.primary,
                boxShadow: it.c.active ? `0 0 8px ${it.c.glow}` : "none",
                opacity: it.c.active ? 1 : 0.45,
              }}
            />
            <span className="text-ink-secondary truncate">{it.label}</span>
            {it.sys && <span className={`font-bold tabular-nums ${scoreColor(it.sys.score)} ml-auto`}>{it.sys.score}</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

function MetricRow({ icon, label, value, valueClass }: { icon: string; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-1.5 text-xs text-ink-secondary">
        <span className="text-base leading-none">{icon}</span>
        {label}
      </span>
      <span className={`text-sm font-bold tabular-nums ${valueClass ?? "text-ink"}`}>{value}</span>
    </div>
  );
}

function formatShortDate(iso: string): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric" }); }
  catch { return iso; }
}

function RadialGauge({ score }: { score: number | null }) {
  const s = score ?? 0;
  const radius = 40;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - s / 100);
  const color = s >= 80 ? "#059669" : s >= 60 ? "#d97706" : "#dc2626";
  return (
    <div className="relative w-24 h-24 shrink-0">
      <svg viewBox="0 0 96 96" className="w-full h-full -rotate-90">
        <circle cx="48" cy="48" r={radius} fill="none" stroke="currentColor" strokeWidth="9" className="text-surface-border" />
        <circle
          cx="48" cy="48" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="9"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1000ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-12 h-12 rounded-full" style={{ background: `${color}15` }} />
      </div>
    </div>
  );
}

function MoverCard({ mover }: { mover: BiggestMover }) {
  const { series, meaning, direction, magnitudePct } = mover;
  const tone =
    meaning === "better" ? "text-emerald-600 border-emerald-500/30 bg-emerald-500/5" :
    meaning === "worse" ? "text-red-600 border-red-500/30 bg-red-500/5" :
    "text-ink-secondary border-surface-border bg-white dark:bg-slate-900";
  const arrow = direction === "up" ? "↑" : "↓";
  return (
    <Link
      href={`/dashboard/biomarkers/${series.def.slug}`}
      className={`block rounded-2xl border p-4 hover:shadow-sm transition-all ${tone}`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide">{series.def.canonical}</p>
      <p className="mt-1 text-xl font-bold text-ink">
        {series.latest.raw}{series.latest.unit ? <span className="text-xs text-ink-tertiary ml-1">{series.latest.unit}</span> : null}
      </p>
      <p className="mt-1 text-xs font-semibold">
        {arrow} {magnitudePct.toFixed(0)}% {meaning === "better" ? "· improving" : meaning === "worse" ? "· worsening" : ""}
      </p>
    </Link>
  );
}

function SystemCard({ breakdown }: { breakdown: SystemBreakdown }) {
  const meta = BODY_SYSTEMS[breakdown.system];
  const hasIssues = breakdown.outOfRange > 0;
  return (
    <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 p-5 transition-all">
      <div className="flex items-center justify-between gap-2">
        <p className="text-sm font-bold text-ink flex items-center gap-2">
          <span aria-hidden>{meta.emoji}</span> {meta.label}
        </p>
        <span className={`text-lg font-bold ${scoreColor(breakdown.score)}`}>{breakdown.score}</span>
      </div>
      <div className="mt-3 flex items-center gap-1 h-1.5 rounded-full overflow-hidden bg-surface-border">
        {breakdown.optimal > 0 && <div className="h-full bg-emerald-500" style={{ flex: breakdown.optimal }} />}
        {breakdown.normal > 0 && <div className="h-full bg-amber-500" style={{ flex: breakdown.normal }} />}
        {breakdown.outOfRange > 0 && <div className="h-full bg-red-500" style={{ flex: breakdown.outOfRange }} />}
      </div>
      <p className="mt-2 text-xs text-ink-tertiary">
        {breakdown.total} marker{breakdown.total === 1 ? "" : "s"} tracked
        {hasIssues && <span className="text-red-600 font-semibold"> · {breakdown.outOfRange} out of range</span>}
      </p>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {breakdown.series.slice(0, 6).map((s) => (
          <Link
            key={s.def.slug}
            href={`/dashboard/biomarkers/${s.def.slug}`}
            className={`text-[11px] font-semibold px-2 py-0.5 rounded-full hover:ring-2 hover:ring-brand-blue/30 transition-all ${zoneChipCx(s.latestZone)}`}
          >
            {s.def.canonical}
          </Link>
        ))}
        {breakdown.series.length > 6 && (
          <span className="text-[11px] text-ink-tertiary px-1.5 py-0.5">+{breakdown.series.length - 6}</span>
        )}
      </div>
    </div>
  );
}

function zoneChipCx(z: NormalizedSeries["latestZone"]): string {
  if (z === "optimal") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (z === "normal") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}

function scoreColor(n: number): string {
  if (n >= 80) return "text-emerald-600";
  if (n >= 60) return "text-amber-600";
  return "text-red-600";
}

function EmptyState() {
  return (
    <div className="rounded-2xl border-2 border-dashed border-surface-border bg-white dark:bg-slate-900 p-10 text-center">
      <h3 className="text-lg font-bold text-ink">No reports yet</h3>
      <p className="mt-1.5 text-sm text-ink-secondary max-w-sm mx-auto">
        Upload your first blood test to see it explained, scored, and tracked over time.
      </p>
      <Link
        href="/app"
        className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold rounded-lg text-sm transition-all"
      >
        Analyze a report
      </Link>
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch {
    return iso;
  }
}

// ── Tier 2 cards ──

function InsightCard({ insight }: { insight: InsightItem }) {
  const sev = insight.severity ?? "info";
  const tone =
    sev === "important" ? "border-red-500/30 bg-red-500/5" :
    sev === "watch" ? "border-amber-500/30 bg-amber-500/5" :
    "border-surface-border bg-white dark:bg-slate-900";
  const sevLabel =
    sev === "important" ? "Important" :
    sev === "watch" ? "Watch" : "Info";
  const sevTone =
    sev === "important" ? "text-red-700 dark:text-red-300" :
    sev === "watch" ? "text-amber-700 dark:text-amber-300" :
    "text-ink-tertiary";
  return (
    <div className={`rounded-2xl border p-4 ${tone}`}>
      <p className={`text-[10px] font-bold uppercase tracking-wider ${sevTone}`}>{sevLabel}</p>
      <p className="mt-1 text-sm font-bold text-ink leading-snug">{insight.title}</p>
      <p className="mt-1.5 text-xs text-ink-secondary leading-relaxed">{insight.body}</p>
    </div>
  );
}

function RiskCard({ risk }: { risk: RiskScore }) {
  const c = tierColor(risk.tier);
  const colorMap: Record<string, string> = {
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-700 dark:text-emerald-300",
    amber:   "border-amber-500/30 bg-amber-500/5 text-amber-700 dark:text-amber-300",
    orange:  "border-orange-500/30 bg-orange-500/5 text-orange-700 dark:text-orange-300",
    red:     "border-red-500/30 bg-red-500/5 text-red-700 dark:text-red-300",
    slate:   "border-surface-border bg-white dark:bg-slate-900 text-ink-tertiary",
  };
  const tierLabel =
    risk.tier === "low" ? "Low" :
    risk.tier === "borderline" ? "Borderline" :
    risk.tier === "intermediate" ? "Intermediate" :
    risk.tier === "high" ? "High" : "—";
  return (
    <div className={`rounded-2xl border p-4 ${colorMap[c]}`}>
      <p className="text-[10px] font-bold uppercase tracking-wider">{risk.label}</p>
      <p className="mt-1 text-2xl font-bold text-ink">
        {risk.value != null ? risk.value : "—"}
        {risk.unit && <span className="text-xs font-semibold text-ink-tertiary ml-1">{risk.unit}</span>}
      </p>
      <p className="mt-0.5 text-xs font-bold">{tierLabel}</p>
      <p className="mt-1.5 text-[11px] text-ink-secondary leading-snug">{risk.blurb}</p>
      {risk.missing.length > 0 && (
        <p className="mt-1.5 text-[10px] text-ink-tertiary">Missing: {risk.missing.slice(0, 3).join(", ")}</p>
      )}
    </div>
  );
}

function ReportRow({ analysis, onDelete, onUpdate }: {
  analysis: Analysis;
  onDelete: (id: string) => void;
  onUpdate: (id: string, patch: { source_filename?: string | null; report_date?: string | null }) => void;
}) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(analysis.source_filename ?? "");
  const [editDate, setEditDate] = useState((analysis.report_date ?? analysis.created_at ?? "").slice(0, 10));
  const [saving, setSaving] = useState(false);

  async function createShare() {
    setSharing(true);
    try {
      const r = await fetch("/api/share", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ analysis_id: analysis.id, expires_days: 30 }),
      });
      const j = await r.json();
      if (r.ok && j.share?.token) {
        const url = `${window.location.origin}/share/${j.share.token}`;
        setShareUrl(url);
        try { await navigator.clipboard.writeText(url); setCopied(true); setTimeout(() => setCopied(false), 2500); } catch {}
      }
    } finally { setSharing(false); }
  }

  async function handleDelete() {
    setDeleting(true);
    try {
      const r = await fetch(`/api/user-analyses?id=${analysis.id}`, { method: "DELETE" });
      if (r.ok) onDelete(analysis.id);
    } finally { setDeleting(false); setConfirmDelete(false); }
  }

  async function handleSave() {
    const newName = editName.trim();
    const newDate = editDate || null;
    const currentDate = (analysis.report_date ?? "").slice(0, 10) || null;
    const nameChanged = newName && newName !== analysis.source_filename;
    const dateChanged = newDate !== currentDate;
    if (!nameChanged && !dateChanged) { setEditing(false); return; }

    const patch: { source_filename?: string; report_date?: string | null } = {};
    if (nameChanged) patch.source_filename = newName;
    if (dateChanged) patch.report_date = newDate;

    setSaving(true);
    try {
      const r = await fetch(`/api/user-analyses?id=${analysis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });
      if (r.ok) { onUpdate(analysis.id, patch); setEditing(false); }
    } finally { setSaving(false); }
  }

  const flagCount = analysis.flags?.length ?? 0;

  return (
    <li className="px-5 py-3.5 hover:bg-surface-raised/60 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
                placeholder="Report name"
                className="flex-1 text-sm font-semibold text-ink bg-surface-raised border border-brand-blue/40 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
              <input
                type="date"
                value={editDate}
                onChange={(e) => setEditDate(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
                className="text-sm text-ink bg-surface-raised border border-brand-blue/40 rounded-lg px-2.5 py-1.5 outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="text-xs font-bold text-white bg-brand-blue hover:bg-brand-blue-hover px-3 py-1.5 rounded-lg disabled:opacity-50 transition-colors"
                >
                  {saving ? "…" : "Save"}
                </button>
                <button
                  onClick={() => { setEditing(false); setEditName(analysis.source_filename ?? ""); setEditDate((analysis.report_date ?? analysis.created_at ?? "").slice(0, 10)); }}
                  className="text-xs text-ink-tertiary hover:text-ink transition-colors px-1"
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <Link
              href={`/dashboard/reports/${analysis.id}`}
              className="group flex items-center gap-1.5"
            >
              <p className="text-sm font-semibold text-ink group-hover:text-brand-blue transition-colors truncate">
                {analysis.source_filename ?? "Lab report"}
              </p>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-ink-tertiary group-hover:text-brand-blue opacity-0 group-hover:opacity-100 transition-all flex-shrink-0">
                <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          )}
          <p className="text-xs text-ink-tertiary mt-0.5">
            {formatDate(analysis.report_date ?? analysis.created_at)}
            {flagCount > 0 && <span className="text-red-500 font-semibold"> · {flagCount} flag{flagCount === 1 ? "" : "s"}</span>}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {analysis.health_score != null && (
            <span className={`text-sm font-bold tabular-nums ${scoreColor(analysis.health_score)}`}>{analysis.health_score}</span>
          )}

          {/* Share */}
          <button
            onClick={createShare}
            disabled={sharing}
            className="text-xs font-semibold text-ink-tertiary hover:text-brand-blue disabled:opacity-50 transition-colors px-1.5 py-1"
            title="Share"
          >
            {sharing ? "…" : copied ? "✓" : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M15 8a3 3 0 10-2.977-2.63l-4.94 2.47a3 3 0 100 4.319l4.94 2.47a3 3 0 10.895-1.789l-4.94-2.47a3.027 3.027 0 000-.74l4.94-2.47C13.456 7.68 14.19 8 15 8z" /></svg>
            )}
          </button>

          {/* Edit */}
          {!editing && !confirmDelete && (
            <button
              onClick={() => { setEditName(analysis.source_filename ?? ""); setEditDate((analysis.report_date ?? analysis.created_at ?? "").slice(0, 10)); setEditing(true); }}
              className="text-xs text-ink-tertiary hover:text-ink transition-colors px-1.5 py-1"
              title="Rename"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" /></svg>
            </button>
          )}

          {/* Delete */}
          {!editing && (
            confirmDelete ? (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-ink-tertiary">Delete?</span>
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="text-xs font-bold text-red-600 hover:text-red-700 disabled:opacity-50 transition-colors"
                >
                  {deleting ? "…" : "Yes"}
                </button>
                <button
                  onClick={() => setConfirmDelete(false)}
                  className="text-xs text-ink-tertiary hover:text-ink transition-colors"
                >
                  No
                </button>
              </div>
            ) : (
              <button
                onClick={() => setConfirmDelete(true)}
                className="text-xs text-ink-tertiary hover:text-red-500 transition-colors px-1.5 py-1"
                title="Delete"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              </button>
            )
          )}
        </div>
      </div>

      {shareUrl && (
        <div className="mt-2 rounded-lg bg-emerald-500/5 border border-emerald-500/30 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-300 break-all">
          {copied ? "Copied! " : ""}Expires in 30 days: <span className="font-mono">{shareUrl}</span>
        </div>
      )}
    </li>
  );
}

function InteractionRow({ item }: { item: DetectedInteraction }) {
  const sev = item.effect.severity;
  const sevTone =
    sev === "important" ? "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300" :
    sev === "common"    ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300" :
    "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300";
  const sevLabel = sev === "important" ? "Important" : sev === "common" ? "Common" : "Monitor";
  return (
    <li className="px-5 py-3 flex items-start gap-3">
      <span className={`shrink-0 mt-0.5 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${sevTone}`}>{sevLabel}</span>
      <div className="min-w-0">
        <p className="text-sm text-ink">
          <span className="font-bold">{item.med.display}</span>
          {item.marker && <span className="text-ink-tertiary"> · affects </span>}
          {item.marker && (
            <Link href={`/dashboard/biomarkers/${item.marker.slug}`} className="font-semibold text-brand-blue hover:underline">
              {item.marker.canonical}
            </Link>
          )}
        </p>
        <p className="mt-0.5 text-xs text-ink-secondary leading-relaxed">{item.effect.note}</p>
      </div>
    </li>
  );
}
