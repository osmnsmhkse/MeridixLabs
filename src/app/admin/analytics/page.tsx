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

interface AnalyticsData {
  interpretations: { today: number; thisWeek: number; allTime: number };
  tierDistribution: Record<string, number>;
  topTier: string | null;
  langDistribution: Record<string, number>;
  topLanguage: string | null;
  topSpecialist: string | null;
  dailySeries: { date: string; count: number }[];
  totals: {
    uploads: number;
    demos: number;
    shares: number;
    emails: number;
    specialistClicks: number;
  };
  generatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const TIER_LABELS: Record<string, string> = { simple: "Simple 💬", medium: "Medium 📋", expert: "Expert 🔬" };
const LANG_NAMES: Record<string, string> = {
  en: "English", es: "Spanish", tr: "Turkish", fr: "French", de: "German",
  ar: "Arabic", ja: "Japanese", pt: "Portuguese", it: "Italian", zh: "Chinese",
};

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
            {/* ── Interpretation stat cards ─────────────────────────────── */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Interpretations</h2>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <StatCard label="Today"     value={data.interpretations.today}     color="blue"   />
                <StatCard label="This Week" value={data.interpretations.thisWeek}  color="green"  />
                <StatCard label="All Time"  value={data.interpretations.allTime}   color="violet" />
                <StatCard label="Uploads"   value={data.totals.uploads}            color="amber"
                  sub={`${data.totals.demos} demos`}
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
              </div>
            </div>

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
