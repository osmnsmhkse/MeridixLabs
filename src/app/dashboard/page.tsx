"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { BODY_SYSTEMS } from "@/lib/biomarkers";
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
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      try {
        const r = await fetch("/api/user-analyses");
        const j = await r.json();
        if (r.ok) setAnalyses(j.analyses ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [isSignedIn]);

  useEffect(() => {
    if (!isSignedIn || analyses.length === 0) return;
    setInsightLoading(true);
    (async () => {
      try {
        const r = await fetch("/api/dashboard-summary", { method: "POST" });
        const j = await r.json();
        if (r.ok) setInsight(j.insight ?? null);
      } finally {
        setInsightLoading(false);
      }
    })();
  }, [isSignedIn, analyses.length]);

  const { systems, movers, score, seriesMap, latest, totalFlags } = useMemo(() => {
    const seriesMap = normalizeAnalyses(analyses);
    const systems = groupBySystem(seriesMap);
    const movers = biggestMovers(seriesMap, 3);
    const score = overallScore(systems) ?? analyses[0]?.health_score ?? null;
    const latest = analyses[0] ?? null;
    const totalFlags = analyses.reduce((acc, a) => acc + (a.flags?.length ?? 0), 0);
    return { systems, movers, score, seriesMap, latest, totalFlags };
  }, [analyses]);

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
          <div className="flex items-center gap-2">
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
