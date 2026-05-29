"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { BODY_SYSTEMS, CATALOG } from "@/lib/biomarkers";
import {
  normalizeAnalyses,
  groupBySystem,
  biggestMovers,
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
  const t = useTranslations("Profile");
  return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-surface px-4">
      <div className="max-w-md text-center">
        <h1 className="text-xl font-bold text-ink">{t("authDisabledTitle")}</h1>
        <p className="mt-2 text-sm text-ink-secondary">
          {t("authDisabledBody")}
        </p>
        <Link
          href="/"
          className="mt-4 inline-flex items-center px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg text-sm hover:bg-brand-blue-hover transition-all"
        >
          {t("goHome")}
        </Link>
      </div>
    </div>
  );
}

function DashboardInner() {
  const t = useTranslations("Dashboard");
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

  const { systems, movers, seriesMap, latest, totalFlags, risks, interactions, zoneStats, trackingStart } = useMemo(() => {
    const seriesMap = normalizeAnalyses(analyses);
    const systems = groupBySystem(seriesMap);
    const movers = biggestMovers(seriesMap, 3);

    // Earliest report date, for the "tracking since" metric
    const trackingStart = analyses.length > 0
      ? analyses
          .map((a) => a.report_date ?? a.created_at)
          .sort((a, b) => new Date(a).getTime() - new Date(b).getTime())[0]
      : null;

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

    return { systems, movers, seriesMap, latest, totalFlags, risks, interactions, zoneStats, trackingStart };
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
              <ActionIcon name="chat" /> Ask AI
            </Link>
            <Link
              href="/dashboard/goals"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-surface-border text-ink-secondary hover:border-brand-blue hover:text-brand-blue font-semibold rounded-lg text-sm transition-all"
            >
              <ActionIcon name="target" /> Goals
            </Link>
            <Link
              href="/dashboard/supplements"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-surface-border text-ink-secondary hover:border-brand-blue hover:text-brand-blue font-semibold rounded-lg text-sm transition-all"
            >
              <ActionIcon name="pill" /> Supplements
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-1.5 px-3.5 py-2 border border-surface-border text-ink-secondary hover:border-brand-blue hover:text-brand-blue font-semibold rounded-lg text-sm transition-all"
            >
              <ActionIcon name="user" /> Profile
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold rounded-lg text-sm transition-all"
            >
              <ActionIcon name="plus" /> New analysis
            </Link>
          </div>
        </div>

        {analyses.length === 0 ? (
          <EmptyState />
        ) : (
          <>
            {/* ── ULTRA HERO: Snapshot, Metrics, Donut, Body, Systems ── */}
            <div className="rounded-3xl border border-surface-border bg-gradient-to-br from-white via-white to-brand-blue/5 dark:from-slate-900 dark:via-slate-900 dark:to-brand-blue/10 overflow-hidden mb-6 shadow-sm">

              {/* Top: snapshot | metrics | donut */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-0">

                {/* Snapshot — zone & flags */}
                <div className="md:col-span-5 p-6 border-b md:border-b-0 md:border-r border-surface-border flex flex-col">
                  <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-1">Health Snapshot</p>
                  <p className="text-[10px] text-ink-tertiary mb-4">Across all reports</p>

                  <div className="grid grid-cols-3 gap-3 flex-1">
                    <ZoneStat label="Optimal" value={zoneStats.optimal} color="emerald" />
                    <ZoneStat label="In range" value={zoneStats.normal} color="amber" />
                    <ZoneStat label="Out of range" value={zoneStats.outOfRange} color="red" />
                  </div>

                  <div className="mt-5 flex items-center gap-2 border-t border-surface-border pt-4">
                    <span className={`inline-flex items-center justify-center w-7 h-7 rounded-lg ${totalFlags > 0 ? "bg-red-100 text-red-600 dark:bg-red-900/30" : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/30"}`}>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M3 3a1 1 0 011-1h10a1 1 0 01.78 1.625L11.28 8l3.5 4.375A1 1 0 0114 14H5v4a1 1 0 11-2 0V3z" /></svg>
                    </span>
                    <p className="text-sm text-ink-secondary">
                      <span className={`font-bold ${totalFlags > 0 ? "text-red-600" : "text-emerald-600"}`}>{totalFlags}</span> flagged marker{totalFlags === 1 ? "" : "s"} {totalFlags > 0 ? "to review" : "— all clear"}
                    </p>
                  </div>
                </div>

                {/* Key metrics */}
                <div className="md:col-span-4 p-6 border-b md:border-b-0 md:border-r border-surface-border">
                  <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3">{t("keyMetrics")}</p>
                  <div className="space-y-3">
                    <MetricRow icon="markers" label="Markers" value={zoneStats.total > 0 ? String(zoneStats.total) : String(analyses.reduce((a, b) => a + ((b.labs_raw as unknown[] | null ?? []).length), 0))} />
                    <MetricRow icon="reports" label="Reports" value={String(analyses.length)} />
                    <MetricRow icon="flags" label="Total Flags" value={String(totalFlags)} valueClass={totalFlags > 0 ? "text-red-600" : "text-emerald-600"} />
                    <MetricRow icon="latest" label="Latest" value={formatShortDate(latest?.report_date ?? latest?.created_at ?? "")} />
                    {trackingStart && (
                      <MetricRow icon="tracking" label="Tracking" value={`${formatShortDate(trackingStart)} →`} />
                    )}
                  </div>
                </div>

                {/* Zone donut */}
                <div className="md:col-span-3 p-6 flex flex-col">
                  <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3">{t("zoneBreaddown")}</p>
                  <div className="flex-1 flex items-center justify-center">
                    {zoneStats.total > 0 ? (
                      <ZoneDonut stats={zoneStats} />
                    ) : (
                      <p className="text-xs text-ink-tertiary text-center">No biomarkers tracked.</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Bottom: body diagram + system breakdown */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-0 border-t border-surface-border">

                {/* Body diagram */}
                <div className="md:col-span-4 p-6 border-b md:border-b-0 md:border-r border-surface-border bg-surface-raised/30">
                  <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3">Body Map</p>
                  <BodyDiagram systems={systems} />
                </div>

                {/* System breakdown */}
                <div className="md:col-span-8 p-6">
                  <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3">System Health</p>
                  {systems.length > 0 ? (
                    <ul className="space-y-2.5">
                      {systems.slice().sort((a, b) => b.outOfRange - a.outOfRange || b.total - a.total).slice(0, 6).map((s) => {
                        const meta = BODY_SYSTEMS[s.system];
                        const inRange = s.optimal + s.normal;
                        const pct = s.total ? Math.round((inRange / s.total) * 100) : 0;
                        const barColor = s.outOfRange === 0 ? "#10b981" : s.outOfRange / s.total >= 0.5 ? "#ef4444" : "#f59e0b";
                        return (
                          <li key={s.system} className="flex items-center gap-3">
                            <span className="text-base flex-shrink-0">{meta.emoji}</span>
                            <span className="text-xs font-semibold text-ink min-w-[110px] flex-shrink-0">{meta.label}</span>
                            <div className="flex-1 h-2 rounded-full overflow-hidden bg-surface-border">
                              <div
                                className="h-full rounded-full transition-all duration-700"
                                style={{ width: `${pct}%`, background: barColor }}
                              />
                            </div>
                            <span className={`text-xs font-semibold tabular-nums text-right whitespace-nowrap ${s.outOfRange > 0 ? "text-red-600" : "text-emerald-600"}`}>
                              {s.outOfRange > 0 ? `${s.outOfRange} of ${s.total} out` : `${s.total} in range`}
                            </span>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-xs text-ink-tertiary">System breakdown requires recognized biomarkers.</p>
                      <p className="text-[10px] text-ink-tertiary mt-1">Try uploading reports in English for best results.</p>
                    </div>
                  )}
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
                  {t("noInsights")}
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

function ZoneStat({ label, value, color }: { label: string; value: number; color: "emerald" | "amber" | "red" }) {
  const tone = {
    emerald: "border-emerald-500/30 bg-emerald-500/5 text-emerald-600",
    amber: "border-amber-500/30 bg-amber-500/5 text-amber-600",
    red: "border-red-500/30 bg-red-500/5 text-red-600",
  }[color];
  return (
    <div className={`rounded-xl border p-3 flex flex-col items-center justify-center text-center ${tone}`}>
      <span className="text-3xl font-black tabular-nums leading-none">{value}</span>
      <span className="mt-1 text-[10px] font-bold uppercase tracking-wide text-ink-tertiary">{label}</span>
    </div>
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

// ── Particle body — generated once at module load ─────────────────────────────
// The body is rendered as a network of dots and connecting lines that fill
// an implicit human silhouette. Deterministic (seeded) so SSR and client match.

type Region =
  | { kind: "ellipse"; cx: number; cy: number; rx: number; ry: number }
  | { kind: "rect"; x1: number; y1: number; x2: number; y2: number };

const BODY_REGIONS: Region[] = [
  { kind: "ellipse", cx: 100, cy: 44, rx: 23, ry: 28 },           // head
  { kind: "rect",    x1: 88, y1: 70, x2: 112, y2: 88 },           // neck
  { kind: "ellipse", cx: 100, cy: 116, rx: 50, ry: 30 },          // shoulders
  { kind: "ellipse", cx: 100, cy: 168, rx: 42, ry: 36 },          // chest
  { kind: "ellipse", cx: 100, cy: 220, rx: 44, ry: 22 },          // hips
  { kind: "ellipse", cx: 50,  cy: 145, rx: 11, ry: 38 },          // L upper arm
  { kind: "ellipse", cx: 39,  cy: 200, rx: 9,  ry: 32 },          // L forearm
  { kind: "ellipse", cx: 32,  cy: 240, rx: 8,  ry: 8  },          // L hand
  { kind: "ellipse", cx: 150, cy: 145, rx: 11, ry: 38 },          // R upper arm
  { kind: "ellipse", cx: 161, cy: 200, rx: 9,  ry: 32 },          // R forearm
  { kind: "ellipse", cx: 168, cy: 240, rx: 8,  ry: 8  },          // R hand
  { kind: "ellipse", cx: 84,  cy: 280, rx: 17, ry: 48 },          // L thigh
  { kind: "ellipse", cx: 81,  cy: 360, rx: 12, ry: 42 },          // L calf
  { kind: "ellipse", cx: 80,  cy: 405, rx: 10, ry: 6  },          // L foot
  { kind: "ellipse", cx: 116, cy: 280, rx: 17, ry: 48 },          // R thigh
  { kind: "ellipse", cx: 119, cy: 360, rx: 12, ry: 42 },          // R calf
  { kind: "ellipse", cx: 120, cy: 405, rx: 10, ry: 6  },          // R foot
];

function isInsideBody(x: number, y: number): boolean {
  for (const r of BODY_REGIONS) {
    if (r.kind === "ellipse") {
      const dx = (x - r.cx) / r.rx;
      const dy = (y - r.cy) / r.ry;
      if (dx * dx + dy * dy <= 1) return true;
    } else {
      if (x >= r.x1 && x <= r.x2 && y >= r.y1 && y <= r.y2) return true;
    }
  }
  return false;
}

// Mulberry32 — small, fast, deterministic
function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

interface BodyMesh {
  points: [number, number][];
  lines: [number, number, number, number][];
}

function generateBodyMesh(seed: number, target: number): BodyMesh {
  const rand = mulberry32(seed);
  const points: [number, number][] = [];
  const W = 200, H = 420;
  let safety = 0;
  while (points.length < target && safety < target * 12) {
    safety++;
    const x = rand() * W;
    const y = rand() * H;
    if (isInsideBody(x, y)) points.push([x, y]);
  }

  // Build lines: connect each point to its 2 closest neighbours within MAX_DIST.
  const lines: [number, number, number, number][] = [];
  const MAX_DIST = 11;
  const MAX_DIST_SQ = MAX_DIST * MAX_DIST;
  const seen = new Set<string>();
  for (let i = 0; i < points.length; i++) {
    const [xi, yi] = points[i];
    const candidates: { j: number; d: number }[] = [];
    for (let j = 0; j < points.length; j++) {
      if (i === j) continue;
      const dx = xi - points[j][0];
      const dy = yi - points[j][1];
      const d = dx * dx + dy * dy;
      if (d < MAX_DIST_SQ) candidates.push({ j, d });
    }
    candidates.sort((a, b) => a.d - b.d);
    const k = Math.min(2, candidates.length);
    for (let n = 0; n < k; n++) {
      const j = candidates[n].j;
      const key = i < j ? `${i}-${j}` : `${j}-${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      lines.push([xi, yi, points[j][0], points[j][1]]);
    }
  }
  return { points, lines };
}

// Computed once per page load — no per-render cost.
const BODY_MESH = generateBodyMesh(1337, 720);

function BodyDiagram({ systems }: { systems: SystemBreakdown[] }) {
  const get = (sys: string) => systems.find((s) => s.system === sys);
  const card = get("cardiovascular");
  const liver = get("liver");
  const kidney = get("kidney");
  const metab = get("metabolic");
  const thyroid = get("thyroid");
  const blood = get("hematology");

  // Zone composition → marker color
  const colorFor = (s?: SystemBreakdown) => {
    if (!s || s.total === 0) return { primary: "#94a3b8", glow: "#cbd5e1", core: "#ffffff", active: false };
    if (s.outOfRange === 0) return { primary: "#10b981", glow: "#6ee7b7", core: "#ffffff", active: true };
    if (s.outOfRange / s.total >= 0.5) return { primary: "#ef4444", glow: "#fca5a5", core: "#ffffff", active: true };
    return { primary: "#f59e0b", glow: "#fcd34d", core: "#ffffff", active: true };
  };

  const cardC = colorFor(card);
  const liverC = colorFor(liver);
  const kidneyC = colorFor(kidney);
  const metabC = colorFor(metab);
  const thyroidC = colorFor(thyroid);
  const bloodC = colorFor(blood);

  // Organ marker positions (cx/cy/radius/score-color/label)
  const organMarkers = [
    { id: "thyroid", cx: 100, cy: 80,  r: 5.5, c: thyroidC, sys: thyroid, label: "Thyroid" },
    { id: "blood",   cx: 100, cy: 110, r: 5.0, c: bloodC,   sys: blood,   label: "Blood"   },
    { id: "heart",   cx: 90,  cy: 138, r: 7.5, c: cardC,    sys: card,    label: "Heart"   },
    { id: "liver",   cx: 122, cy: 178, r: 7.0, c: liverC,   sys: liver,   label: "Liver"   },
    { id: "stomach", cx: 82,  cy: 188, r: 6.0, c: metabC,   sys: metab,   label: "Metabolic" },
    { id: "kidney",  cx: 100, cy: 218, r: 6.5, c: kidneyC,  sys: kidney,  label: "Kidney"  },
  ];

  return (
    <div className="flex flex-col gap-3">
      <div
        className="relative rounded-2xl overflow-hidden border border-surface-border"
        style={{
          background: "radial-gradient(ellipse 60% 70% at 50% 45%, rgba(241,245,249,0.95) 0%, rgba(248,250,252,1) 60%, #ffffff 100%)",
        }}
      >
        {/* Floating ECG decorations behind the body */}
        <svg
          viewBox="0 0 200 420"
          className="absolute inset-0 w-full h-full pointer-events-none"
          aria-hidden
        >
          <g stroke="rgba(148,163,184,0.20)" strokeWidth="0.6" strokeLinecap="round" strokeLinejoin="round" fill="none">
            <path d="M 12 90 l 5 0 l 2 -6 l 3 12 l 3 -16 l 3 14 l 3 -4 l 9 0" />
            <path d="M 158 70 l 5 0 l 2 -5 l 3 10 l 3 -14 l 3 12 l 3 -3 l 8 0" />
            <path d="M 18 230 l 5 0 l 2 -5 l 3 10 l 3 -14 l 3 12 l 3 -3 l 6 0" />
            <path d="M 162 240 l 5 0 l 2 -6 l 3 12 l 3 -16 l 3 14 l 3 -4 l 6 0" />
            <path d="M 14 360 l 5 0 l 2 -5 l 3 10 l 3 -14 l 3 12 l 3 -3 l 6 0" />
            <path d="M 156 350 l 5 0 l 2 -6 l 3 12 l 3 -16 l 3 14 l 3 -4 l 6 0" />
          </g>
        </svg>

        {/* Body SVG */}
        <svg viewBox="0 0 200 420" className="relative w-full h-auto block">
          {/* Soft ambient halo behind body */}
          <ellipse cx="100" cy="220" rx="90" ry="195" fill="rgba(148,163,184,0.05)" />

          {/* Mesh lines (drawn first, behind dots) */}
          <g stroke="rgba(249,115,22,0.45)" strokeWidth="0.35" fill="none" strokeLinecap="round">
            {BODY_MESH.lines.map((l, i) => (
              <line key={i} x1={l[0]} y1={l[1]} x2={l[2]} y2={l[3]} />
            ))}
          </g>

          {/* Particle dots */}
          <g fill="#f97316">
            {BODY_MESH.points.map((p, i) => (
              <circle key={i} cx={p[0]} cy={p[1]} r="0.95" />
            ))}
          </g>

          {/* Organ markers — outer pulse ring (for active organs that aren't optimal) */}
          {organMarkers.map((m) =>
            m.c.active && m.c.primary !== "#10b981" ? (
              <g key={`pulse-${m.id}`}>
                <circle cx={m.cx} cy={m.cy} r={m.r * 2.6} fill="none" stroke={m.c.primary} strokeWidth="0.6" opacity="0.5">
                  <animate attributeName="r" values={`${m.r * 1.6};${m.r * 3.2};${m.r * 1.6}`} dur="2.6s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;0.55;0" dur="2.6s" repeatCount="indefinite" />
                </circle>
                <circle cx={m.cx} cy={m.cy} r={m.r * 1.9} fill="none" stroke={m.c.primary} strokeWidth="0.5" opacity="0.4">
                  <animate attributeName="r" values={`${m.r * 1.3};${m.r * 2.4};${m.r * 1.3}`} dur="2.6s" begin="0.4s" repeatCount="indefinite" />
                  <animate attributeName="opacity" values="0;0.4;0" dur="2.6s" begin="0.4s" repeatCount="indefinite" />
                </circle>
              </g>
            ) : null
          )}

          {/* Organ markers — colored circle with white core (matches reference) */}
          {organMarkers.map((m) => (
            <g key={`marker-${m.id}`}>
              {/* outer halo */}
              <circle cx={m.cx} cy={m.cy} r={m.r + 2.5} fill={m.c.primary} opacity={m.c.active ? 0.18 : 0.08} />
              {/* main filled circle */}
              <circle
                cx={m.cx}
                cy={m.cy}
                r={m.r}
                fill={m.c.primary}
                stroke="white"
                strokeWidth="1.2"
                opacity={m.c.active ? 0.95 : 0.5}
              />
              {/* inner highlight */}
              <circle
                cx={m.cx - m.r * 0.25}
                cy={m.cy - m.r * 0.25}
                r={m.r * 0.35}
                fill="white"
                opacity={m.c.active ? 0.55 : 0.35}
              />
              <title>{m.sys ? `${m.label} · ${m.sys.outOfRange > 0 ? `${m.sys.outOfRange} of ${m.sys.total} out of range` : `${m.sys.total} in range`}` : m.label}</title>
            </g>
          ))}
        </svg>
      </div>

      {/* Legend */}
      <div className="grid grid-cols-3 gap-x-3 gap-y-1.5 w-full">
        {organMarkers.map((m) => (
          <div key={m.id} className="flex items-center gap-1.5 text-[10px]">
            <span
              className="w-2.5 h-2.5 rounded-full flex-shrink-0 border border-white"
              style={{
                background: m.c.primary,
                boxShadow: m.c.active ? `0 0 8px ${m.c.glow}` : "none",
                opacity: m.c.active ? 1 : 0.5,
              }}
            />
            <span className="text-ink-secondary truncate">{m.label}</span>
            {m.sys && m.sys.outOfRange > 0 && <span className="font-bold tabular-nums text-red-600 ml-auto">{m.sys.outOfRange}!</span>}
          </div>
        ))}
      </div>
    </div>
  );
}

type ActionIconName = "chat" | "target" | "pill" | "user" | "plus";

function ActionIcon({ name }: { name: ActionIconName }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.7,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "w-4 h-4 flex-shrink-0",
    "aria-hidden": true as const,
  };
  switch (name) {
    case "chat":
      return (
        <svg {...common}><path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8z" /></svg>
      );
    case "target":
      return (
        <svg {...common}><circle cx="12" cy="12" r="9" /><circle cx="12" cy="12" r="5" /><circle cx="12" cy="12" r="1.5" fill="currentColor" /></svg>
      );
    case "pill":
      return (
        <svg {...common}><rect x="2.5" y="8.5" width="19" height="7" rx="3.5" transform="rotate(-30 12 12)" /><path d="M14.5 6.5l-7 7" /></svg>
      );
    case "user":
      return (
        <svg {...common}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>
      );
    case "plus":
      return (
        <svg {...common}><path d="M12 5v14M5 12h14" /></svg>
      );
  }
}

type MetricIconName = "markers" | "reports" | "flags" | "latest" | "tracking";

function MetricIcon({ name }: { name: MetricIconName }) {
  const common = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.6,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className: "w-4 h-4 text-ink-tertiary flex-shrink-0",
  };
  switch (name) {
    case "markers": // bar chart
      return (
        <svg {...common}><path d="M3 21h18M6 17V9m6 8V5m6 12v-6" /></svg>
      );
    case "reports": // document
      return (
        <svg {...common}><path d="M14 3H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V9z" /><path d="M14 3v6h6M8 13h8M8 17h6" /></svg>
      );
    case "flags": // flag
      return (
        <svg {...common}><path d="M5 3v18" /><path d="M5 4h11l-2 4 2 4H5" /></svg>
      );
    case "latest": // calendar
      return (
        <svg {...common}><rect x="3" y="5" width="18" height="16" rx="2" /><path d="M3 10h18M8 3v4M16 3v4" /></svg>
      );
    case "tracking": // trending line
      return (
        <svg {...common}><path d="M3 17l6-6 4 4 8-8" /><path d="M14 7h7v7" /></svg>
      );
  }
}

function MetricRow({ icon, label, value, valueClass }: { icon: MetricIconName; label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="flex items-center gap-2 text-xs text-ink-secondary">
        <MetricIcon name={icon} />
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
        {hasIssues ? (
          <span className="text-xs font-bold text-red-600 whitespace-nowrap">{breakdown.outOfRange} out</span>
        ) : (
          <span className="text-xs font-bold text-emerald-600 whitespace-nowrap">In range</span>
        )}
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

function EmptyState() {
  const t = useTranslations("Dashboard");
  return (
    <div className="rounded-2xl border-2 border-dashed border-surface-border bg-white dark:bg-slate-900 p-10 text-center">
      <h3 className="text-lg font-bold text-ink">{t("noReports")}</h3>
      <p className="mt-1.5 text-sm text-ink-secondary max-w-sm mx-auto">
        {t("noReportsDesc")}
      </p>
      <Link
        href="/app"
        className="mt-4 inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold rounded-lg text-sm transition-all"
      >
        {t("uploadFirst")}
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
