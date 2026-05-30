"use client";

import { useState, useEffect, useCallback } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// ── Types ─────────────────────────────────────────────────────────────────────

interface ABVariantStats {
  shown: number;
  clicked: number;
  rate: number;
}

interface AnalyticsData {
  interpretations: { today: number; thisWeek: number; allTime: number };
  signups: { today: number; thisWeek: number; total: number };
  uniqueVisitors: number;
  signedInUsers: number;
  tierDistribution: Record<string, number>;
  topTier: string | null;
  langDistribution: Record<string, number>;
  topLanguage: string | null;
  topSpecialist: string | null;
  toolUsage: Record<string, number>;
  dailySeries: { date: string; count: number }[];
  totals: {
    uploads: number;
    demos: number;
    shares: number;
    emails: number;
    specialistClicks: number;
    chatMessages: number;
  };
  abTest: {
    variants: Record<string, ABVariantStats>;
    winner: string | null;
    variantText: Record<string, string>;
    totalEvents: number;
  };
  generatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = { simple: "Simple 💬", medium: "Medium 📋", expert: "Expert 🔬" };
const LANG_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", tr: "Turkish", fr: "French", de: "German",
  ar: "Arabic", ja: "Japanese", pt: "Portuguese", it: "Italian", zh: "Chinese",
};
const TOOL_LABELS: Record<string, string> = {
  "/app": "Lab Analyzer", "/imaging": "Imaging Explainer", "/symptom": "Symptom Checker",
  "/diagnosed": "Diagnosis Explainer", "/medications": "Medication Companion",
  "/visit": "Visit Companion", "/trends": "Trends", "/dashboard": "Dashboard",
  "/genetics": "Genetics", "/pediatric": "Pediatric", "/womens-health": "Women's Health",
  "/": "Home", "/learn": "Learn", "/blog": "Blog", "/profile": "Profile",
};
function toolLabel(path: string): string {
  return TOOL_LABELS[path] ?? path;
}

function fmt(n: number): string {
  return n >= 1000 ? `${(n / 1000).toFixed(1)}k` : String(n);
}

function shortDate(iso: string): string {
  const d = new Date(iso + "T00:00:00Z");
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function StatCard({
  label,
  value,
  sub,
  color = "blue",
}: {
  label: string;
  value: string | number;
  sub?: string;
  color?: "blue" | "green" | "violet" | "amber";
}) {
  const ring = {
    blue:   "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900",
    green:  "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900",
    violet: "bg-violet-50 dark:bg-violet-950/30 border-violet-100 dark:border-violet-900",
    amber:  "bg-amber-50 dark:bg-amber-950/30 border-amber-100 dark:border-amber-900",
  }[color];
  const text = {
    blue:   "text-blue-700 dark:text-blue-400",
    green:  "text-emerald-700 dark:text-emerald-400",
    violet: "text-violet-700 dark:text-violet-400",
    amber:  "text-amber-700 dark:text-amber-400",
  }[color];

  return (
    <div className={`rounded-2xl border p-5 ${ring}`}>
      <p className="text-xs font-semibold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
      <p className={`text-3xl font-extrabold ${text}`}>{fmt(Number(value))}</p>
      {sub && <p className="text-xs text-slate-400 mt-1">{sub}</p>}
    </div>
  );
}

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-28 text-xs text-slate-600 dark:text-slate-400 font-medium truncate flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-100 dark:bg-slate-700 overflow-hidden">
        <div
          className="h-full rounded-full bg-blue-500 transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-8 text-right text-xs font-bold text-slate-700 dark:text-slate-300 flex-shrink-0">{value}</span>
    </div>
  );
}

const CustomTooltip = ({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number }>;
  label?: string;
}) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 shadow-xl text-sm">
      <p className="font-semibold text-slate-800 dark:text-slate-200">{label}</p>
      <p className="text-blue-600 dark:text-blue-400 font-bold">{payload[0].value} interpretations</p>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminAnalyticsPage() {
  const [data, setData]       = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState<string | null>(null);
  const [lastRefresh, setLastRefresh] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/analytics");
      if (res.status === 401 || res.status === 403) {
        setError("Access denied. Check your password.");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setLastRefresh(new Date());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load analytics.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // ── Derived values ─────────────────────────────────────────────────────────

  const tierEntries = data
    ? Object.entries(data.tierDistribution).sort((a, b) => b[1] - a[1])
    : [];
  const tierMax = tierEntries[0]?.[1] ?? 1;

  const langEntries = data
    ? Object.entries(data.langDistribution).sort((a, b) => b[1] - a[1]).slice(0, 6)
    : [];
  const langMax = langEntries[0]?.[1] ?? 1;

  const toolEntries = data
    ? Object.entries(data.toolUsage).sort((a, b) => b[1] - a[1]).slice(0, 8)
    : [];
  const toolMax = toolEntries[0]?.[1] ?? 1;

  const chartData = data?.dailySeries.map((d) => ({
    ...d,
    label: shortDate(d.date),
  }));

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-bold text-white">Meridix Labs</p>
              <p className="text-xs text-slate-400">Internal Analytics</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            {lastRefresh && (
              <p className="hidden sm:block text-xs text-slate-500">
                Updated {lastRefresh.toLocaleTimeString()}
              </p>
            )}
            <button
              onClick={load}
              disabled={loading}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-50"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`}>
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              {loading ? "Loading…" : "Refresh"}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">

        {/* Error state */}
        {error && (
          <div className="flex items-start gap-3 p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5 text-red-400">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
            </svg>
            <div>
              <p className="font-semibold text-sm">{error}</p>
              <button onClick={load} className="text-xs underline mt-1 text-red-400 hover:text-red-300">Try again</button>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && !data && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="rounded-2xl border border-slate-800 bg-slate-900 p-5 h-24 animate-pulse" />
            ))}
          </div>
        )}

        {data && (
          <>
            {/* ── Audience ──────────────────────────────────────────────── */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Audience</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Unique Visitors"  value={data.uniqueVisitors} color="blue"   sub="distinct browsers" />
                <StatCard label="Total Sign-ups"   value={data.signups.total}  color="green"
                  sub={data.signups.thisWeek > 0 ? `+${data.signups.thisWeek} this week` : "all accounts"} />
                <StatCard label="Signed-in Users"  value={data.signedInUsers}  color="violet" sub="active accounts" />
                <StatCard label="Reports Uploaded" value={data.totals.uploads} color="amber"  sub={`${data.totals.demos} demos`} />
              </div>
            </section>

            {/* ── Interpretation stat cards ─────────────────────────────── */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Interpretations</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Today"     value={data.interpretations.today}     color="blue"   />
                <StatCard label="This Week" value={data.interpretations.thisWeek}  color="green"  />
                <StatCard label="All Time"  value={data.interpretations.allTime}   color="violet" />
                <StatCard label="Chat Messages" value={data.totals.chatMessages}   color="amber"
                  sub="follow-up questions"
                />
              </div>
            </section>

            {/* ── Activity totals ───────────────────────────────────────── */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">User Activity</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">WhatsApp Shares</p>
                  <p className="text-2xl font-extrabold text-emerald-400">{fmt(data.totals.shares)}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Emails Sent</p>
                  <p className="text-2xl font-extrabold text-blue-400">{fmt(data.totals.emails)}</p>
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Specialist Clicks</p>
                  <p className="text-2xl font-extrabold text-violet-400">{fmt(data.totals.specialistClicks)}</p>
                  {data.topSpecialist && (
                    <p className="text-xs text-slate-500 mt-1 truncate">Top: {data.topSpecialist}</p>
                  )}
                </div>
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Top Tier</p>
                  <p className="text-2xl font-extrabold text-amber-400">
                    {data.topTier ? TIER_LABELS[data.topTier] ?? data.topTier : "—"}
                  </p>
                </div>
              </div>
            </section>

            {/* ── Line chart + distributions ────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              {/* Daily interpretations chart */}
              <div className="lg:col-span-2 rounded-2xl border border-slate-800 bg-slate-900 p-6">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-5">
                  Daily Interpretations — Last 30 Days
                </h2>
                {chartData && chartData.some((d) => d.count > 0) ? (
                  <ResponsiveContainer width="100%" height={220}>
                    <LineChart data={chartData} margin={{ top: 4, right: 8, left: -20, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                      <XAxis
                        dataKey="label"
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                        interval={4}
                      />
                      <YAxis
                        tick={{ fontSize: 10, fill: "#64748b" }}
                        tickLine={false}
                        axisLine={false}
                        allowDecimals={false}
                      />
                      <Tooltip content={<CustomTooltip />} />
                      <Line
                        type="monotone"
                        dataKey="count"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, fill: "#3b82f6", stroke: "#1e293b", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[220px] flex items-center justify-center">
                    <p className="text-sm text-slate-600">No interpretation data yet.</p>
                  </div>
                )}
              </div>

              {/* Distributions column */}
              <div className="space-y-5">
                {/* Tier breakdown */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Tier Breakdown</h3>
                  {tierEntries.length > 0 ? (
                    <div className="space-y-3">
                      {tierEntries.map(([tier, count]) => (
                        <BarRow
                          key={tier}
                          label={TIER_LABELS[tier] ?? tier}
                          value={count}
                          max={tierMax}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">No data yet.</p>
                  )}
                </div>

                {/* Language breakdown */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                    Top Languages
                  </h3>
                  {langEntries.length > 0 ? (
                    <div className="space-y-3">
                      {langEntries.map(([code, count]) => (
                        <BarRow
                          key={code}
                          label={LANG_NAMES[code] ?? code.toUpperCase()}
                          value={count}
                          max={langMax}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">No data yet.</p>
                  )}
                </div>

                {/* Tool usage (page views) */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                  <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                    Tool Usage
                  </h3>
                  {toolEntries.length > 0 ? (
                    <div className="space-y-3">
                      {toolEntries.map(([page, count]) => (
                        <BarRow
                          key={page}
                          label={toolLabel(page)}
                          value={count}
                          max={toolMax}
                        />
                      ))}
                    </div>
                  ) : (
                    <p className="text-xs text-slate-600">No data yet.</p>
                  )}
                </div>
              </div>
            </div>

            {/* ── A/B Test ─────────────────────────────────────────────── */}
            <section>
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest">
                  Hero CTA A/B Test
                </h2>
                <span className="text-xs text-slate-600">
                  {data.abTest.totalEvents} total events
                </span>
              </div>

              {/* Status banner */}
              {(() => {
                const ab = data.abTest;
                const minShown = Math.min(...Object.values(ab.variants).map((v) => v.shown));
                const needMore = 200 - minShown;
                if (ab.winner) {
                  return (
                    <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-sm">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 text-emerald-400">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>
                        <strong>Winner: Variant {ab.winner}</strong> — &ldquo;{ab.variantText[ab.winner]}&rdquo; has the highest conversion rate with 200+ shown per variant.
                      </span>
                    </div>
                  );
                }
                if (needMore > 0) {
                  return (
                    <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-amber-950/30 border border-amber-800/60 text-amber-400 text-sm">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      <span>Need ~{needMore} more impressions on the lowest variant to reach 200 shown — keep collecting data.</span>
                    </div>
                  );
                }
                return null;
              })()}

              {/* Variant table */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900 overflow-hidden">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-800">
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Variant</th>
                      <th className="text-left px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest hidden sm:table-cell">Button Text</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Shown</th>
                      <th className="text-right px-4 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Clicked</th>
                      <th className="text-right px-5 py-3 text-xs font-bold text-slate-500 uppercase tracking-widest">Rate</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {["A", "B", "C"].map((v) => {
                      const stats = data.abTest.variants[v] ?? { shown: 0, clicked: 0, rate: 0 };
                      const isWinner = data.abTest.winner === v;
                      const isLeading = !data.abTest.winner && stats.rate === Math.max(
                        ...Object.values(data.abTest.variants).map((s) => s.rate)
                      ) && stats.shown > 0;
                      return (
                        <tr key={v} className={`transition-colors ${isWinner ? "bg-emerald-950/20" : "hover:bg-slate-800/40"}`}>
                          <td className="px-5 py-4">
                            <div className="flex items-center gap-2">
                              <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold flex-shrink-0 ${
                                isWinner
                                  ? "bg-emerald-600 text-white"
                                  : "bg-slate-800 text-slate-300"
                              }`}>
                                {v}
                              </span>
                              {isWinner && (
                                <span className="hidden sm:inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 bg-emerald-950/50 border border-emerald-800 px-2 py-0.5 rounded-full">
                                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                  </svg>
                                  Winner
                                </span>
                              )}
                              {isLeading && !isWinner && (
                                <span className="hidden sm:inline-flex text-xs font-semibold text-blue-400 bg-blue-950/50 border border-blue-800 px-2 py-0.5 rounded-full">
                                  Leading
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-4 hidden sm:table-cell">
                            <span className="text-xs text-slate-400 font-mono">
                              {data.abTest.variantText[v]}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-sm font-semibold text-slate-300">{stats.shown.toLocaleString()}</span>
                            {stats.shown < 200 && (
                              <p className="text-[10px] text-slate-600">{200 - stats.shown} to go</p>
                            )}
                          </td>
                          <td className="px-4 py-4 text-right">
                            <span className="text-sm font-semibold text-slate-300">{stats.clicked.toLocaleString()}</span>
                          </td>
                          <td className="px-5 py-4 text-right">
                            <div className="flex flex-col items-end gap-1.5">
                              <span className={`text-base font-extrabold ${
                                isWinner ? "text-emerald-400" :
                                isLeading ? "text-blue-400" :
                                "text-slate-300"
                              }`}>
                                {stats.shown > 0 ? `${stats.rate.toFixed(1)}%` : "—"}
                              </span>
                              {/* Mini bar */}
                              {stats.shown > 0 && (() => {
                                const maxRate = Math.max(
                                  ...Object.values(data.abTest.variants).map((s) => s.rate), 1
                                );
                                const pct = Math.round((stats.rate / maxRate) * 100);
                                return (
                                  <div className="w-16 h-1.5 rounded-full bg-slate-800 overflow-hidden">
                                    <div
                                      className={`h-full rounded-full transition-all duration-700 ${isWinner ? "bg-emerald-500" : "bg-blue-500"}`}
                                      style={{ width: `${pct}%` }}
                                    />
                                  </div>
                                );
                              })()}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-slate-600 mt-2 pl-1">
                Variant assigned once per visitor via localStorage · Rate = clicked ÷ shown · Winner declared at 200+ shown per variant
              </p>
            </section>

            {/* ── Footer ───────────────────────────────────────────────── */}
            <p className="text-xs text-slate-600 text-center pb-4">
              No personal data stored · Events are anonymous · Generated at {new Date(data.generatedAt).toLocaleString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
