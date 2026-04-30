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

  const { systems, movers, score, seriesMap, latest, totalFlags, risks, interactions, zoneStats, scoreDelta } = useMemo(() => {
    const seriesMap = normalizeAnalyses(analyses);
    const systems = groupBySystem(seriesMap);
    const movers = biggestMovers(seriesMap, 3);
    const score = overallScore(systems) ?? analyses[0]?.health_score ?? null;
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

    return { systems, movers, score, seriesMap, latest, totalFlags, risks, interactions, zoneStats, scoreDelta };
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
            {/* Hero: enhanced health score + AI summary */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-5 mb-6">

              {/* Health score card */}
              <div className="lg:col-span-2 rounded-2xl border border-surface-border bg-white dark:bg-slate-900 p-6">
                <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-4">Overall Health Score</p>
                <div className="flex items-center gap-5">
                  <RadialGauge score={score} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-baseline gap-2">
                      <span className={`text-4xl font-extrabold ${scoreColor(score ?? 0)}`}>{score ?? "—"}</span>
                      <span className="text-sm font-semibold text-ink-tertiary">/ 100</span>
                      {scoreDelta != null && (
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded-md ${scoreDelta > 0 ? "text-emerald-700 bg-emerald-100" : scoreDelta < 0 ? "text-red-700 bg-red-100" : "text-ink-tertiary bg-surface-raised"}`}>
                          {scoreDelta > 0 ? "▲" : scoreDelta < 0 ? "▼" : "="} {Math.abs(scoreDelta)}
                        </span>
                      )}
                    </div>
                    <p className={`text-sm font-bold mt-0.5 ${scoreColor(score ?? 0)}`}>
                      {(score ?? 0) >= 85 ? "Excellent" : (score ?? 0) >= 70 ? "Good" : (score ?? 0) >= 55 ? "Fair" : "Needs attention"}
                    </p>
                  </div>
                </div>

                {/* Zone bar */}
                {zoneStats.total > 0 && (
                  <div className="mt-5">
                    <div className="flex h-2 rounded-full overflow-hidden gap-0.5">
                      {zoneStats.optimal > 0 && (
                        <div className="bg-emerald-500 rounded-full" style={{ flex: zoneStats.optimal }} title={`${zoneStats.optimal} optimal`} />
                      )}
                      {zoneStats.normal > 0 && (
                        <div className="bg-amber-400 rounded-full" style={{ flex: zoneStats.normal }} title={`${zoneStats.normal} normal`} />
                      )}
                      {zoneStats.outOfRange > 0 && (
                        <div className="bg-red-500 rounded-full" style={{ flex: zoneStats.outOfRange }} title={`${zoneStats.outOfRange} flagged`} />
                      )}
                    </div>
                    <div className="flex items-center gap-3 mt-2 flex-wrap">
                      {zoneStats.optimal > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-ink-secondary">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 inline-block" />{zoneStats.optimal} optimal
                        </span>
                      )}
                      {zoneStats.normal > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-ink-secondary">
                          <span className="w-2 h-2 rounded-full bg-amber-400 inline-block" />{zoneStats.normal} normal
                        </span>
                      )}
                      {zoneStats.outOfRange > 0 && (
                        <span className="flex items-center gap-1 text-[11px] text-red-600 font-semibold">
                          <span className="w-2 h-2 rounded-full bg-red-500 inline-block" />{zoneStats.outOfRange} flagged
                        </span>
                      )}
                    </div>
                  </div>
                )}

                <div className="mt-4 pt-4 border-t border-surface-border flex items-center gap-4 flex-wrap">
                  <span className="text-xs text-ink-tertiary">{zoneStats.total > 0 ? `${zoneStats.total} markers` : `${analyses.reduce((a, b) => a + (b.labs_raw as unknown[] | null ?? []).length, 0)} labs`}</span>
                  <span className="text-xs text-ink-tertiary">{analyses.length} report{analyses.length === 1 ? "" : "s"}</span>
                  <span className="text-xs text-ink-tertiary">Last: {formatDate(latest?.report_date ?? latest?.created_at ?? "")}</span>
                </div>
              </div>

              {/* AI summary */}
              <div className="lg:col-span-3 rounded-2xl border border-brand-blue/30 bg-gradient-to-br from-brand-blue/5 to-transparent p-5 flex flex-col">
                <p className="text-[11px] font-bold text-brand-blue uppercase tracking-widest">AI Summary</p>
                {insightLoading ? (
                  <div className="mt-3 flex items-center gap-2 text-sm text-ink-tertiary">
                    <span className="w-3 h-3 rounded-full bg-brand-blue/30 animate-pulse" />
                    Reading your history…
                  </div>
                ) : insight ? (
                  <p className="mt-3 text-sm text-ink leading-relaxed flex-1">{insight}</p>
                ) : (
                  <p className="mt-3 text-sm text-ink-tertiary">No summary available yet.</p>
                )}
                <div className="mt-4 pt-4 border-t border-brand-blue/10">
                  <Link href="/dashboard/chat" className="text-xs text-brand-blue hover:underline font-medium">Ask a follow-up question →</Link>
                </div>
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

            {/* Body systems grid */}
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">Body systems</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
              {systems.map((s) => <SystemCard key={s.system} breakdown={s} />)}
            </div>

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
                    onRename={(id, name) => setAnalyses((prev) => prev.map((x) => x.id === id ? { ...x, source_filename: name } : x))}
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

function ReportRow({ analysis, onDelete, onRename }: {
  analysis: Analysis;
  onDelete: (id: string) => void;
  onRename: (id: string, newName: string) => void;
}) {
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [sharing, setSharing] = useState(false);
  const [copied, setCopied] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editName, setEditName] = useState(analysis.source_filename ?? "");
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
    if (!editName.trim() || editName.trim() === analysis.source_filename) { setEditing(false); return; }
    setSaving(true);
    try {
      const r = await fetch(`/api/user-analyses?id=${analysis.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ source_filename: editName.trim() }),
      });
      if (r.ok) { onRename(analysis.id, editName.trim()); setEditing(false); }
    } finally { setSaving(false); }
  }

  const flagCount = analysis.flags?.length ?? 0;

  return (
    <li className="px-5 py-3.5 hover:bg-surface-raised/60 transition-colors">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          {editing ? (
            <div className="flex items-center gap-2">
              <input
                autoFocus
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") handleSave(); if (e.key === "Escape") setEditing(false); }}
                className="flex-1 text-sm font-semibold text-ink bg-surface-raised border border-brand-blue/40 rounded-lg px-2.5 py-1 outline-none focus:ring-2 focus:ring-brand-blue/30"
              />
              <button
                onClick={handleSave}
                disabled={saving}
                className="text-xs font-bold text-white bg-brand-blue hover:bg-brand-blue-hover px-2.5 py-1 rounded-lg disabled:opacity-50 transition-colors"
              >
                {saving ? "…" : "Save"}
              </button>
              <button
                onClick={() => { setEditing(false); setEditName(analysis.source_filename ?? ""); }}
                className="text-xs text-ink-tertiary hover:text-ink transition-colors"
              >
                Cancel
              </button>
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
              onClick={() => { setEditName(analysis.source_filename ?? ""); setEditing(true); }}
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
