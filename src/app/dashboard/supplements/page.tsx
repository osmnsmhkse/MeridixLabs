"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { SUPPLEMENT_CATALOG, type SupplementDef, type EvidenceTier } from "@/lib/supplements";

const AUTH_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

interface UserSupplement {
  id: string;
  supplement_key: string;
  display_name: string;
  dose: string | null;
  reason: string | null;
  source: "self" | "ai-suggested";
  started_at: string;
  ended_at: string | null;
}

interface Suggestion {
  supplement: SupplementDef;
  reasons: string[];
  warnings: string[];
}

export default function SupplementsPage() {
  if (!AUTH_ENABLED) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-surface px-4">
        <div className="text-center">
          <h1 className="text-xl font-bold text-ink">Accounts aren&apos;t enabled</h1>
          <Link href="/" className="mt-3 inline-block text-sm text-brand-blue hover:underline">Go home</Link>
        </div>
      </div>
    );
  }
  return <Inner />;
}

function Inner() {
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [stack, setStack] = useState<UserSupplement[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [browsing, setBrowsing] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  const load = async () => {
    const r = await fetch("/api/supplements");
    const j = await r.json();
    if (r.ok) {
      setStack(j.stack ?? []);
      setSuggestions(j.suggestions ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { if (isSignedIn) load(); }, [isSignedIn]);

  async function add(key: string, source: "self" | "ai-suggested" = "self", reason?: string) {
    await fetch("/api/supplements", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ supplement_key: key, source, reason }),
    });
    load();
  }
  async function remove(id: string) {
    if (!confirm("Remove from stack?")) return;
    await fetch(`/api/supplements?id=${id}`, { method: "DELETE" });
    load();
  }

  if (!isLoaded || loading) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-sm text-ink-tertiary">Loading…</div>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink">Supplement stack</h1>
            <p className="mt-1 text-sm text-ink-secondary">Your current stack, with evidence-based suggestions tied to your labs.</p>
          </div>
          <Link href="/dashboard" className="text-sm text-ink-secondary hover:text-ink">← Dashboard</Link>
        </div>

        {/* Current stack */}
        <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">Your stack</p>
        {stack.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-surface-border bg-white dark:bg-slate-900 p-8 text-center mb-6">
            <p className="text-sm text-ink-secondary">Nothing added yet.</p>
          </div>
        ) : (
          <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 overflow-hidden mb-6">
            <ul className="divide-y divide-surface-border">
              {stack.map((s) => {
                const def = SUPPLEMENT_CATALOG.find((d) => d.key === s.supplement_key);
                return (
                  <li key={s.id} className="px-5 py-3 flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {s.display_name}
                        {def && <EvBadge tier={def.evidence} />}
                      </p>
                      <p className="text-xs text-ink-tertiary">
                        {s.dose ?? def?.typicalDose ?? "—"}
                        {s.reason && <> · {s.reason}</>}
                      </p>
                    </div>
                    <button onClick={() => remove(s.id)} className="text-xs text-ink-tertiary hover:text-red-600">Remove</button>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {/* AI suggestions */}
        {suggestions.length > 0 && (
          <>
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">Suggested for you</p>
            <p className="text-xs text-ink-tertiary mb-3">Based on biomarkers currently outside their reference range. Always discuss new supplements with your physician.</p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6">
              {suggestions.map((s) => (
                <SuggestionCard
                  key={s.supplement.key}
                  suggestion={s}
                  onAdd={() => add(s.supplement.key, "ai-suggested", s.reasons[0])}
                />
              ))}
            </div>
          </>
        )}

        {/* Browse full catalog */}
        <button
          onClick={() => setBrowsing((b) => !b)}
          className="text-sm text-brand-blue hover:underline"
        >
          {browsing ? "Hide" : "Browse"} full catalog ({SUPPLEMENT_CATALOG.length})
        </button>
        {browsing && (
          <div className="mt-3 grid grid-cols-1 md:grid-cols-2 gap-3">
            {SUPPLEMENT_CATALOG.map((d) => {
              const inStack = stack.some((s) => s.supplement_key === d.key);
              return (
                <div key={d.key} className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 p-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-sm font-bold text-ink">{d.display}<EvBadge tier={d.evidence} /></p>
                      <p className="text-xs text-ink-tertiary">{d.typicalDose}</p>
                    </div>
                    {!inStack && (
                      <button onClick={() => add(d.key)} className="text-xs font-semibold text-brand-blue hover:underline whitespace-nowrap">+ Add</button>
                    )}
                  </div>
                  <p className="mt-2 text-xs text-ink-secondary leading-relaxed">{d.blurb}</p>
                </div>
              );
            })}
          </div>
        )}

        <p className="mt-8 text-xs text-ink-tertiary">
          Educational information only. Not medical advice. Some supplements interact with medications and conditions — always confirm with your physician.
        </p>
      </div>
    </div>
  );
}

function SuggestionCard({ suggestion, onAdd }: { suggestion: Suggestion; onAdd: () => void }) {
  const { supplement, reasons, warnings } = suggestion;
  return (
    <div className="rounded-2xl border border-brand-blue/30 bg-brand-blue/5 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-bold text-ink">{supplement.display}<EvBadge tier={supplement.evidence} /></p>
          <p className="text-xs text-ink-tertiary">{supplement.typicalDose}</p>
        </div>
        <button onClick={onAdd} className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-blue text-white hover:bg-brand-blue-hover whitespace-nowrap">Add</button>
      </div>
      <p className="mt-2 text-xs text-ink-secondary leading-relaxed">{supplement.blurb}</p>
      <ul className="mt-2 space-y-0.5">
        {reasons.map((r, i) => <li key={i} className="text-[11px] text-emerald-700 dark:text-emerald-300">✓ {r}</li>)}
      </ul>
      {warnings.length > 0 && (
        <div className="mt-2 rounded-lg bg-amber-100 dark:bg-amber-900/30 px-2.5 py-2">
          {warnings.map((w, i) => (
            <p key={i} className="text-[11px] text-amber-800 dark:text-amber-200 leading-snug">⚠ {w}</p>
          ))}
        </div>
      )}
    </div>
  );
}

function EvBadge({ tier }: { tier: EvidenceTier }) {
  const map = {
    strong:   "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
    moderate: "bg-amber-100   text-amber-800   dark:bg-amber-900/30   dark:text-amber-300",
    limited:  "bg-slate-100   text-slate-700   dark:bg-slate-800       dark:text-slate-300",
  };
  return <span className={`ml-2 align-middle text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full ${map[tier]}`}>{tier} evidence</span>;
}
