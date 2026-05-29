"use client";

import { useState, useCallback } from "react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface FeedbackEntry {
  id: string;
  rating: number;
  category: string | null;
  message: string | null;
  email: string | null;
  page: string | null;
  user_agent: string | null;
  received_at: string;
}

interface FeedbackData {
  summary: {
    total: number;
    avgRating: number;
    ratingCounts: Record<string, number>;
    categoryCounts: Record<string, number>;
    withMessage: number;
    withEmail: number;
  };
  entries: FeedbackEntry[];
  generatedAt: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function stars(rating: number): string {
  return "★".repeat(rating) + "☆".repeat(5 - rating);
}

function ratingColor(rating: number): string {
  if (rating >= 4) return "text-emerald-400";
  if (rating === 3) return "text-amber-400";
  return "text-red-400";
}

function timeAgo(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" });
}

// ── Sub-components ────────────────────────────────────────────────────────────

function BarRow({ label, value, max }: { label: string; value: number; max: number }) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <span className="w-32 text-xs text-slate-400 font-medium truncate flex-shrink-0">{label}</span>
      <div className="flex-1 h-2 rounded-full bg-slate-700 overflow-hidden">
        <div className="h-full rounded-full bg-blue-500 transition-all duration-700" style={{ width: `${pct}%` }} />
      </div>
      <span className="w-8 text-right text-xs font-bold text-slate-300 flex-shrink-0">{value}</span>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function AdminFeedbackPage() {
  const [password, setPassword] = useState("");
  const [authed, setAuthed]     = useState(false);
  const [data, setData]         = useState<FeedbackData | null>(null);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

  const load = useCallback(async (pw: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/feedback", {
        headers: { Authorization: "Basic " + btoa(":" + pw) },
      });
      if (res.status === 401 || res.status === 403) {
        setError("Access denied. Check your password.");
        setAuthed(false);
        return;
      }
      if (res.status === 503) {
        setError("Supabase isn't configured, so feedback isn't being stored yet.");
        return;
      }
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      setData(await res.json());
      setAuthed(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load feedback.");
    } finally {
      setLoading(false);
    }
  }, []);

  // ── Password gate ────────────────────────────────────────────────────────────
  if (!authed) {
    return (
      <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center px-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            load(password);
          }}
          className="w-full max-w-sm rounded-2xl border border-slate-800 bg-slate-900 p-7 space-y-5"
        >
          <div>
            <h1 className="text-lg font-bold text-white">Feedback Inbox</h1>
            <p className="text-sm text-slate-400 mt-1">Enter the admin password to continue.</p>
          </div>
          <input
            type="password"
            autoFocus
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Admin password"
            className="w-full rounded-lg bg-slate-800 border border-slate-700 px-3 py-2.5 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {error && <p className="text-sm text-red-400">{error}</p>}
          <button
            type="submit"
            disabled={loading || !password}
            className="w-full rounded-lg bg-blue-600 hover:bg-blue-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors disabled:opacity-50"
          >
            {loading ? "Checking…" : "View feedback"}
          </button>
        </form>
      </div>
    );
  }

  // ── Derived values ─────────────────────────────────────────────────────────
  const catEntries = data
    ? Object.entries(data.summary.categoryCounts).sort((a, b) => b[1] - a[1])
    : [];
  const catMax = catEntries[0]?.[1] ?? 1;
  const ratingMax = data
    ? Math.max(...Object.values(data.summary.ratingCounts).map(Number), 1)
    : 1;

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-bold text-white">Meridix Labs</p>
            <p className="text-xs text-slate-400">Feedback Inbox</p>
          </div>
          <button
            onClick={() => load(password)}
            disabled={loading}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors disabled:opacity-50"
          >
            {loading ? "Loading…" : "Refresh"}
          </button>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-8 space-y-8">
        {error && (
          <div className="p-4 rounded-xl bg-red-950/40 border border-red-800 text-red-300 text-sm">{error}</div>
        )}

        {data && (
          <>
            {/* ── Summary cards ──────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Total</p>
                <p className="text-3xl font-extrabold text-blue-400">{data.summary.total}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Avg Rating</p>
                <p className="text-3xl font-extrabold text-amber-400">
                  {data.summary.avgRating || "—"}
                  <span className="text-base text-slate-500"> / 5</span>
                </p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">With Message</p>
                <p className="text-3xl font-extrabold text-violet-400">{data.summary.withMessage}</p>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <p className="text-xs text-slate-500 uppercase tracking-widest mb-2">Left Email</p>
                <p className="text-3xl font-extrabold text-emerald-400">{data.summary.withEmail}</p>
              </div>
            </div>

            {/* ── Distributions ──────────────────────────────────────────── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Ratings</h3>
                <div className="space-y-3">
                  {[5, 4, 3, 2, 1].map((r) => (
                    <BarRow
                      key={r}
                      label={stars(r)}
                      value={Number(data.summary.ratingCounts[r] ?? 0)}
                      max={ratingMax}
                    />
                  ))}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">Categories</h3>
                {catEntries.length > 0 ? (
                  <div className="space-y-3">
                    {catEntries.map(([cat, count]) => (
                      <BarRow key={cat} label={cat} value={count} max={catMax} />
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-600">No data yet.</p>
                )}
              </div>
            </div>

            {/* ── Entries ────────────────────────────────────────────────── */}
            <section>
              <h2 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4">
                All Feedback ({data.entries.length})
              </h2>
              {data.entries.length === 0 ? (
                <div className="rounded-2xl border border-slate-800 bg-slate-900 p-10 text-center">
                  <p className="text-sm text-slate-500">No feedback submitted yet.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {data.entries.map((f) => (
                    <div key={f.id} className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
                      <div className="flex items-start justify-between gap-4 flex-wrap">
                        <div className="flex items-center gap-3">
                          <span className={`text-lg font-bold tracking-tight ${ratingColor(f.rating)}`}>
                            {stars(f.rating)}
                          </span>
                          <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-800 border border-slate-700 text-slate-300">
                            {f.category || "General"}
                          </span>
                        </div>
                        <span className="text-xs text-slate-500">{timeAgo(f.received_at)}</span>
                      </div>

                      {f.message?.trim() ? (
                        <p className="mt-3 text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">{f.message}</p>
                      ) : (
                        <p className="mt-3 text-sm text-slate-600 italic">No message left.</p>
                      )}

                      <div className="mt-3 flex items-center gap-4 flex-wrap text-xs text-slate-500">
                        {f.email && (
                          <a href={`mailto:${f.email}`} className="text-blue-400 hover:text-blue-300">
                            {f.email}
                          </a>
                        )}
                        {f.page && <span className="font-mono">{f.page}</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </section>

            <p className="text-xs text-slate-600 text-center pb-4">
              Generated at {new Date(data.generatedAt).toLocaleString()}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
