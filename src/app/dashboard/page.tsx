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

  const { systems, movers, score, seriesMap, latest, totalFlags, risks, interactions } = useMemo(() => {
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
    return { systems, movers, score, seriesMap, latest, totalFlags, risks, interactions };
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
              <span aria-hidden>💬</span> Ask AI about my labs
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-surface-border text-ink-secondary hover:border-brand-blue hover:text-brand-blue font-semibold rounded-lg text-sm transition-all"
            >
              Edit profile
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
            {/* Hero: gauge + insight banner */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mb-6">
              <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 p-6 flex items-center gap-5">
                <RadialGauge score={score} />
                <div>
                  <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">Overall health score</p>
                  <p className="mt-1 text-sm text-ink-secondary">
                    Derived from {seriesMap.size} tracked biomarker{seriesMap.size === 1 ? "" : "s"} across {analyses.length} report{analyses.length === 1 ? "" : "s"}.
                  </p>
                  <p className="mt-2 text-xs text-ink-tertiary">
                    {totalFlags} flag{totalFlags === 1 ? "" : "s"} total · last report {formatDate(latest?.report_date ?? latest?.created_at ?? "")}
                  </p>
                </div>
              </div>
              <div className="lg:col-span-2 rounded-2xl border border-brand-blue/30 bg-gradient-to-br from-brand-blue/5 to-transparent p-5">
                <p className="text-xs font-semibold text-brand-blue uppercase tracking-wide">AI summary</p>
                {insightLoading ? (
                  <p className="mt-2 text-sm text-ink-tertiary">Reading your history…</p>
                ) : insight ? (
                  <p className="mt-2 text-sm text-ink leading-relaxed">{insight}</p>
                ) : (
                  <p className="mt-2 text-sm text-ink-tertiary">No summary yet.</p>
                )}
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
                  <li key={a.id} className="px-5 py-3 flex items-center justify-between gap-3 hover:bg-surface-raised transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink truncate">{a.source_filename ?? "Lab report"}</p>
                      <p className="text-xs text-ink-tertiary">
                        {formatDate(a.report_date ?? a.created_at)} · {a.flags?.length ?? 0} flag{(a.flags?.length ?? 0) === 1 ? "" : "s"}
                      </p>
                    </div>
                    {a.health_score != null && (
                      <span className={`text-sm font-bold ${scoreColor(a.health_score)}`}>{a.health_score}</span>
                    )}
                  </li>
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
  const radius = 52;
  const circ = 2 * Math.PI * radius;
  const offset = circ * (1 - s / 100);
  const color = s >= 80 ? "#059669" : s >= 60 ? "#d97706" : "#dc2626";
  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg viewBox="0 0 128 128" className="w-full h-full -rotate-90">
        <circle cx="64" cy="64" r={radius} fill="none" stroke="currentColor" strokeWidth="10" className="text-surface-border" />
        <circle
          cx="64" cy="64" r={radius}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 800ms ease" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold" style={{ color }}>{score ?? "—"}</span>
        <span className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">of 100</span>
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
