"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { CATALOG, BODY_SYSTEMS, bySlug } from "@/lib/biomarkers";

const AUTH_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

interface Goal {
  id: string;
  marker_slug: string;
  marker_label: string;
  direction: "decrease" | "increase" | "reach-range";
  target_value: number | null;
  target_unit: string | null;
  target_date: string | null;
  status: "active" | "achieved" | "paused" | "archived";
  baseline_value: number | null;
  baseline_date: string | null;
  notes: string | null;
  latest_value: number | null;
  latest_date: string | null;
  progress_pct: number | null;
  created_at: string;
}

interface Intervention {
  id: string;
  goal_id: string | null;
  kind: "diet" | "exercise" | "supplement" | "medication" | "lifestyle" | "other";
  name: string;
  dose: string | null;
  notes: string | null;
  started_at: string;
  ended_at: string | null;
}

const KIND_OPTIONS: { value: Intervention["kind"]; label: string; emoji: string }[] = [
  { value: "diet",       label: "Diet",       emoji: "🥗" },
  { value: "exercise",   label: "Exercise",   emoji: "🏃" },
  { value: "supplement", label: "Supplement", emoji: "💊" },
  { value: "medication", label: "Medication", emoji: "💉" },
  { value: "lifestyle",  label: "Lifestyle",  emoji: "🌿" },
  { value: "other",      label: "Other",      emoji: "✨" },
];

export default function GoalsPage() {
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
  const [goals, setGoals] = useState<Goal[]>([]);
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [loading, setLoading] = useState(true);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  const load = async () => {
    const r = await fetch("/api/goals");
    const j = await r.json();
    if (r.ok) {
      setGoals(j.goals ?? []);
      setInterventions(j.interventions ?? []);
    }
    setLoading(false);
  };

  useEffect(() => { if (isSignedIn) load(); }, [isSignedIn]);

  if (!isLoaded || loading) {
    return <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center text-sm text-ink-tertiary">Loading…</div>;
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-start justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-ink">Goals & interventions</h1>
            <p className="mt-1 text-sm text-ink-secondary">Set targets for specific biomarkers and track what you&apos;re doing about them.</p>
          </div>
          <Link href="/dashboard" className="text-sm text-ink-secondary hover:text-ink">← Dashboard</Link>
        </div>

        <button
          onClick={() => setCreating(true)}
          className="mb-6 inline-flex items-center gap-1.5 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold rounded-lg text-sm transition-all"
        >
          + New goal
        </button>

        {creating && <NewGoalForm onClose={() => setCreating(false)} onCreated={load} />}

        {goals.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-surface-border bg-white dark:bg-slate-900 p-10 text-center">
            <h3 className="text-lg font-bold text-ink">No goals yet</h3>
            <p className="mt-1.5 text-sm text-ink-secondary max-w-sm mx-auto">
              Pick a biomarker (LDL, vitamin D, A1c…) and set a target. We&apos;ll track your progress automatically as you upload reports.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {goals.map((g) => (
              <GoalCard
                key={g.id}
                goal={g}
                interventions={interventions.filter((i) => i.goal_id === g.id)}
                onUpdated={load}
              />
            ))}
          </div>
        )}

        {/* Standalone interventions (no goal) */}
        {interventions.filter((i) => !i.goal_id).length > 0 && (
          <div className="mt-8">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">Other interventions</p>
            <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 overflow-hidden">
              <ul className="divide-y divide-surface-border">
                {interventions.filter((i) => !i.goal_id).map((i) => (
                  <InterventionRow key={i.id} item={i} onChanged={load} />
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function NewGoalForm({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [markerSlug, setMarkerSlug] = useState(CATALOG[0].slug);
  const [direction, setDirection] = useState<"decrease" | "increase" | "reach-range">("decrease");
  const [targetValue, setTargetValue] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const def = bySlug(markerSlug);

  // Group catalog by system for the dropdown
  const groups = useMemo(() => {
    const map = new Map<string, typeof CATALOG>();
    for (const c of CATALOG) {
      const arr = map.get(c.system) ?? [];
      arr.push(c);
      map.set(c.system, arr);
    }
    return map;
  }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      const r = await fetch("/api/goals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marker_slug: markerSlug,
          direction,
          target_value: targetValue ? Number(targetValue) : null,
          target_unit: def?.unit ?? null,
          target_date: targetDate || null,
          notes: notes.trim() || null,
        }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.detail || j.error || "Failed");
      onCreated(); onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form onSubmit={submit} className="rounded-2xl border border-brand-blue/30 bg-brand-blue/5 p-5 mb-6 space-y-4">
      <p className="text-sm font-bold text-ink">New goal</p>

      <label className="block">
        <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">Biomarker</span>
        <select
          value={markerSlug}
          onChange={(e) => setMarkerSlug(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-surface-border bg-white dark:bg-slate-950 px-3 py-2 text-sm text-ink"
        >
          {Array.from(groups.entries()).map(([sys, items]) => (
            <optgroup key={sys} label={BODY_SYSTEMS[sys as keyof typeof BODY_SYSTEMS]?.label ?? sys}>
              {items.map((c) => <option key={c.slug} value={c.slug}>{c.canonical}</option>)}
            </optgroup>
          ))}
        </select>
      </label>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="block">
          <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">Direction</span>
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as typeof direction)}
            className="mt-1.5 w-full rounded-lg border border-surface-border bg-white dark:bg-slate-950 px-3 py-2 text-sm text-ink"
          >
            <option value="decrease">Lower it</option>
            <option value="increase">Raise it</option>
            <option value="reach-range">Reach optimal range</option>
          </select>
        </label>
        <label className="block">
          <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">Target value{def?.unit ? ` (${def.unit})` : ""}</span>
          <input
            type="number" step="0.1" value={targetValue}
            onChange={(e) => setTargetValue(e.target.value)}
            placeholder={def?.optimal ? `e.g., ${def.optimal[direction === "increase" ? 1 : 0]}` : ""}
            className="mt-1.5 w-full rounded-lg border border-surface-border bg-white dark:bg-slate-950 px-3 py-2 text-sm text-ink"
          />
        </label>
      </div>

      <label className="block">
        <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">Target date (optional)</span>
        <input type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)}
          className="mt-1.5 w-full rounded-lg border border-surface-border bg-white dark:bg-slate-950 px-3 py-2 text-sm text-ink" />
      </label>

      <label className="block">
        <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">Notes (optional)</span>
        <textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)}
          placeholder="Why this goal? Any context for future you."
          className="mt-1.5 w-full rounded-lg border border-surface-border bg-white dark:bg-slate-950 px-3 py-2 text-sm text-ink" />
      </label>

      {error && <p className="text-sm text-red-600">{error}</p>}

      <div className="flex gap-2">
        <button type="submit" disabled={submitting}
          className="px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover disabled:opacity-50 text-white font-semibold rounded-lg text-sm">
          {submitting ? "Creating…" : "Create goal"}
        </button>
        <button type="button" onClick={onClose}
          className="px-4 py-2 text-sm font-medium text-ink-secondary hover:text-ink">
          Cancel
        </button>
      </div>
    </form>
  );
}

function GoalCard({ goal, interventions, onUpdated }: { goal: Goal; interventions: Intervention[]; onUpdated: () => void }) {
  const [adding, setAdding] = useState(false);

  const progress = goal.progress_pct ?? 0;
  const tone =
    goal.status === "achieved" ? "border-emerald-500/40 bg-emerald-500/5" :
    goal.status === "paused"   ? "border-surface-border bg-white dark:bg-slate-900 opacity-70" :
    "border-surface-border bg-white dark:bg-slate-900";

  async function setStatus(status: Goal["status"]) {
    await fetch(`/api/goals?id=${goal.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, achieved_at: status === "achieved" ? new Date().toISOString() : null }),
    });
    onUpdated();
  }
  async function remove() {
    if (!confirm("Delete this goal? This won't affect your interventions.")) return;
    await fetch(`/api/goals?id=${goal.id}`, { method: "DELETE" });
    onUpdated();
  }

  return (
    <div className={`rounded-2xl border p-5 ${tone}`}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-bold text-ink">{goal.marker_label}</p>
          <p className="mt-0.5 text-xs text-ink-secondary">
            {goal.direction === "decrease" ? "Lower" : goal.direction === "increase" ? "Raise" : "Reach optimal"}
            {goal.target_value != null && ` to ${goal.target_value}${goal.target_unit ? ` ${goal.target_unit}` : ""}`}
            {goal.target_date && ` by ${formatDate(goal.target_date)}`}
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {goal.status === "active" && (
            <button onClick={() => setStatus("achieved")} className="text-xs font-semibold text-emerald-600 hover:text-emerald-700">Achieved ✓</button>
          )}
          {goal.status !== "archived" && (
            <button onClick={remove} className="text-xs text-ink-tertiary hover:text-red-600">Delete</button>
          )}
        </div>
      </div>

      {/* Progress bar */}
      {goal.target_value != null && goal.baseline_value != null && (
        <div className="mt-4">
          <div className="flex items-center justify-between text-xs text-ink-tertiary mb-1.5">
            <span>From {goal.baseline_value} → {goal.target_value}</span>
            <span className="font-semibold text-ink">{progress}%</span>
          </div>
          <div className="h-2 rounded-full bg-surface-border overflow-hidden">
            <div className="h-full bg-brand-blue transition-all" style={{ width: `${progress}%` }} />
          </div>
          {goal.latest_value != null && (
            <p className="mt-1.5 text-xs text-ink-tertiary">Latest reading: {goal.latest_value}{goal.target_unit ? ` ${goal.target_unit}` : ""}{goal.latest_date && ` · ${formatDate(goal.latest_date)}`}</p>
          )}
        </div>
      )}

      {goal.notes && <p className="mt-3 text-xs text-ink-secondary leading-relaxed">{goal.notes}</p>}

      {/* Interventions */}
      <div className="mt-4 pt-4 border-t border-surface-border">
        <div className="flex items-center justify-between mb-2">
          <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">What I&apos;m doing</p>
          <button onClick={() => setAdding(true)} className="text-xs text-brand-blue hover:underline">+ Add</button>
        </div>
        {interventions.length === 0 && !adding && (
          <p className="text-xs text-ink-tertiary">No interventions logged yet.</p>
        )}
        <ul className="space-y-1.5">
          {interventions.map((i) => <InterventionLine key={i.id} item={i} onChanged={onUpdated} />)}
        </ul>
        {adding && <AddInterventionForm goalId={goal.id} onClose={() => setAdding(false)} onAdded={onUpdated} />}
      </div>
    </div>
  );
}

function InterventionLine({ item, onChanged }: { item: Intervention; onChanged: () => void }) {
  const opt = KIND_OPTIONS.find((k) => k.value === item.kind);
  async function end() {
    await fetch(`/api/interventions?id=${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ended_at: new Date().toISOString().slice(0, 10) }),
    });
    onChanged();
  }
  async function remove() {
    if (!confirm("Remove this intervention?")) return;
    await fetch(`/api/interventions?id=${item.id}`, { method: "DELETE" });
    onChanged();
  }
  return (
    <li className="flex items-center justify-between text-sm gap-3">
      <span className={`min-w-0 ${item.ended_at ? "line-through text-ink-tertiary" : "text-ink"}`}>
        <span className="mr-1.5">{opt?.emoji}</span>
        <span className="font-medium">{item.name}</span>
        {item.dose && <span className="text-ink-tertiary"> · {item.dose}</span>}
      </span>
      <div className="flex gap-2 text-xs">
        {!item.ended_at && <button onClick={end} className="text-ink-tertiary hover:text-ink">End</button>}
        <button onClick={remove} className="text-ink-tertiary hover:text-red-600">Delete</button>
      </div>
    </li>
  );
}

function AddInterventionForm({ goalId, onClose, onAdded }: { goalId: string | null; onClose: () => void; onAdded: () => void }) {
  const [kind, setKind] = useState<Intervention["kind"]>("lifestyle");
  const [name, setName] = useState("");
  const [dose, setDose] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    await fetch("/api/interventions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal_id: goalId, kind, name: name.trim(), dose: dose.trim() || null }),
    });
    setSubmitting(false);
    onAdded(); onClose();
  }

  return (
    <form onSubmit={submit} className="mt-2 rounded-lg border border-surface-border bg-surface-raised p-3 space-y-2">
      <div className="flex gap-2">
        <select value={kind} onChange={(e) => setKind(e.target.value as Intervention["kind"])}
          className="rounded-lg border border-surface-border bg-white dark:bg-slate-950 px-2 py-1.5 text-sm text-ink">
          {KIND_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.emoji} {o.label}</option>)}
        </select>
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Name" autoFocus
          className="flex-1 rounded-lg border border-surface-border bg-white dark:bg-slate-950 px-2 py-1.5 text-sm text-ink" />
      </div>
      <input value={dose} onChange={(e) => setDose(e.target.value)} placeholder="Dose / frequency (optional)"
        className="w-full rounded-lg border border-surface-border bg-white dark:bg-slate-950 px-2 py-1.5 text-sm text-ink" />
      <div className="flex gap-2">
        <button type="submit" disabled={submitting || !name.trim()}
          className="px-3 py-1.5 bg-brand-blue hover:bg-brand-blue-hover disabled:opacity-50 text-white font-semibold rounded-lg text-xs">Add</button>
        <button type="button" onClick={onClose}
          className="px-3 py-1.5 text-xs font-medium text-ink-secondary hover:text-ink">Cancel</button>
      </div>
    </form>
  );
}

function InterventionRow({ item, onChanged }: { item: Intervention; onChanged: () => void }) {
  const opt = KIND_OPTIONS.find((k) => k.value === item.kind);
  async function remove() {
    if (!confirm("Remove this intervention?")) return;
    await fetch(`/api/interventions?id=${item.id}`, { method: "DELETE" });
    onChanged();
  }
  return (
    <li className="px-5 py-3 flex items-center justify-between gap-3">
      <div>
        <p className="text-sm text-ink">
          <span className="mr-1.5">{opt?.emoji}</span>
          <span className="font-semibold">{item.name}</span>
          {item.dose && <span className="text-ink-tertiary"> · {item.dose}</span>}
        </p>
        <p className="text-xs text-ink-tertiary">Started {formatDate(item.started_at)}{item.ended_at && ` · ended ${formatDate(item.ended_at)}`}</p>
      </div>
      <button onClick={remove} className="text-xs text-ink-tertiary hover:text-red-600">Delete</button>
    </li>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" });
  } catch { return iso; }
}
