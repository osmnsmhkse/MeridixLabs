"use client";

/* ════════════════════════════════════════════════════════════════════════
   Meridix — shared biomarker visual language
   ────────────────────────────────────────────────────────────────────────
   The signature "range track" (soft zone bands + a you-are-here caret), the
   status accent system, the heartbeat mark, and the status pill. Used by the
   marketing hero (LabInterpretationDemo) AND the live Lab Analyzer result
   view (LabPanelBySystem) so the product looks the same everywhere.
   ════════════════════════════════════════════════════════════════════════ */

export type Tone = "good" | "warn" | "bad" | "neutral";
export type Status = "high" | "low" | "borderline" | "normal" | "unknown";

// ── Tone → soft zone fill (calm, Apple-Health-like — never alarmist) ────────
export const ZONE: Record<Tone, string> = {
  good: "bg-emerald-400/35 dark:bg-emerald-400/25",
  warn: "bg-amber-400/40 dark:bg-amber-400/25",
  bad: "bg-rose-400/40 dark:bg-rose-500/30",
  neutral: "bg-slate-300/50 dark:bg-slate-500/25",
};

// ── Status → accent system (spine, value text, pill, caret) ─────────────────
export const ACCENT: Record<Status, { spine: string; text: string; pill: string; caret: string }> = {
  high: {
    spine: "bg-rose-500",
    text: "text-rose-600 dark:text-rose-400",
    pill: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/50 dark:text-rose-300 dark:border-rose-900",
    caret: "bg-rose-500",
  },
  low: {
    spine: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    pill: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
    caret: "bg-amber-500",
  },
  borderline: {
    spine: "bg-amber-500",
    text: "text-amber-600 dark:text-amber-400",
    pill: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/50 dark:text-amber-300 dark:border-amber-900",
    caret: "bg-amber-500",
  },
  normal: {
    spine: "bg-emerald-500",
    text: "text-emerald-600 dark:text-emerald-400",
    pill: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/50 dark:text-emerald-300 dark:border-emerald-900",
    caret: "bg-emerald-500",
  },
  unknown: {
    spine: "bg-slate-400",
    text: "text-ink-secondary",
    pill: "bg-surface-raised text-ink-secondary border-surface-border",
    caret: "bg-slate-400",
  },
};

// ── Signature heartbeat glyph — the Meridix mark, recognisable sans logo ────
export function PulseMark({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden="true">
      <path
        d="M2 13h3.2l1.7-5.4a.9.9 0 0 1 1.72.05L11 18l2-9.2a.9.9 0 0 1 1.73-.06L16.2 13H22"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

// ── The range track: soft zone bands + a precise you-are-here caret ─────────
export function RangeTrack({
  zones,
  pct,
  status,
}: {
  zones: { w: number; tone: Tone }[];
  pct: number;
  status: Status;
}) {
  const left = Math.max(2, Math.min(98, pct));
  return (
    // Pinned to LTR: the zone bands are flex children and would mirror under an
    // RTL document, while the caret is positioned with an inline percentage and
    // would not — leaving the marker pointing at the wrong zone. A numeric scale
    // reading low-to-high left-to-right is also the usual convention in RTL UIs.
    <div className="relative" dir="ltr">
      <div className="flex h-2 rounded-full overflow-hidden bg-surface-raised">
        {zones.map((z, i) => (
          <div key={i} className={ZONE[z.tone]} style={{ width: `${z.w}%` }} />
        ))}
      </div>
      <div className="absolute top-1/2 -translate-y-1/2" style={{ left: `${left}%` }}>
        <div className={`-translate-x-1/2 w-3 h-3 rounded-full ${ACCENT[status].caret} ring-2 ring-surface shadow-sm`} />
      </div>
    </div>
  );
}

// ── Status pill — matches the accent system ─────────────────────────────────
export function StatusPill({ status, label, className = "" }: { status: Status; label: string; className?: string }) {
  return (
    <span className={`text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${ACCENT[status].pill} ${className}`}>
      {label}
    </span>
  );
}

/* ── Zone builder for REAL report data ──────────────────────────────────────
   Turns numeric reference thresholds into direction-aware zone bands + the
   caret position. The "worse" direction is coloured rose; the opposite
   out-of-range side is amber, so a track reads its clinical meaning at a
   glance without being alarmist. Returns null when we can't place the value. */
export type Direction = "higher-worse" | "lower-worse" | "u-shape";

export function buildTrack(
  numValue: number | null,
  refLow: number | null,
  refHigh: number | null,
  direction: Direction = "u-shape"
): { zones: { w: number; tone: Tone }[]; pct: number } | null {
  if (numValue == null || (refLow == null && refHigh == null)) return null;

  // Frame a sensible window around the reference band + the value.
  let barMin: number, barMax: number;
  if (refLow != null && refHigh != null) {
    const span = Math.max(refHigh - refLow, 1);
    const pad = span * 0.55;
    barMin = Math.min(refLow - pad, numValue - span * 0.25);
    barMax = Math.max(refHigh + pad, numValue + span * 0.25);
  } else if (refHigh != null) {
    barMin = Math.min(0, numValue - refHigh * 0.25);
    barMax = Math.max(refHigh * 1.6, numValue * 1.25, refHigh + 1);
  } else if (refLow != null) {
    barMin = Math.max(0, Math.min(refLow * 0.4, numValue * 0.75));
    barMax = Math.max(refLow * 1.8, numValue * 1.25, refLow + 1);
  } else {
    return null;
  }

  const range = Math.max(barMax - barMin, 0.0001);
  const pos = (v: number) => Math.max(0, Math.min(100, ((v - barMin) / range) * 100));
  const lowP = refLow != null ? pos(refLow) : 0;
  const highP = refHigh != null ? pos(refHigh) : 100;

  const lowTone: Tone = direction === "lower-worse" ? "bad" : "warn";
  const highTone: Tone = direction === "higher-worse" ? "bad" : "warn";

  const zones: { w: number; tone: Tone }[] = [];
  if (lowP > 0.5) zones.push({ w: lowP, tone: lowTone });
  if (highP - lowP > 0.5) zones.push({ w: highP - lowP, tone: "good" });
  if (100 - highP > 0.5) zones.push({ w: 100 - highP, tone: highTone });
  if (zones.length === 0) zones.push({ w: 100, tone: "good" });

  return { zones, pct: pos(numValue) };
}
