"use client";

import React, { useEffect, useRef, useState } from "react";

/* ════════════════════════════════════════════════════════════════════════
   Meridix — Lab Interpretation surface
   ────────────────────────────────────────────────────────────────────────
   The product, made visible. This is the signature Meridix asset: a real
   report interpretation with our proprietary biomarker **range tracks**
   (zone bands + a precise "you are here" caret, à la Apple Health / Levels),
   plain-English annotations, risk context, and a clear next step.

   When the surface scrolls into view it *performs the analysis*: the
   stage settles in, zone bands grow, carets land, values count up, and
   the verdict card arrives once the status flips to "Analyzed". All
   transform/opacity, all gated behind prefers-reduced-motion.
   ════════════════════════════════════════════════════════════════════════ */

type Tier = "Simple" | "Medium" | "Expert";
type Tone = "good" | "warn" | "bad" | "neutral";
type Status = "high" | "low" | "borderline" | "normal";

type Marker = {
  name: string;
  value: string;
  unit: string;
  status: Status;
  statusLabel: string;
  pct: number; // marker position along the track, 0–100
  zones: { w: number; tone: Tone }[];
  ref: string;
  flagged?: boolean;
};

// ── The panel: a realistic mixed-result lipid + metabolic snapshot ──────────
const MARKERS: Marker[] = [
  {
    name: "LDL Cholesterol",
    value: "168",
    unit: "mg/dL",
    status: "high",
    statusLabel: "High",
    pct: 71,
    zones: [
      { w: 33, tone: "good" },
      { w: 33, tone: "warn" },
      { w: 16, tone: "bad" },
      { w: 18, tone: "bad" },
    ],
    ref: "Optimal < 100",
    flagged: true,
  },
  {
    name: "Triglycerides",
    value: "182",
    unit: "mg/dL",
    status: "borderline",
    statusLabel: "Borderline",
    pct: 53,
    zones: [
      { w: 40, tone: "good" },
      { w: 20, tone: "warn" },
      { w: 40, tone: "bad" },
    ],
    ref: "Normal < 150",
  },
  {
    name: "HDL Cholesterol",
    value: "38",
    unit: "mg/dL",
    status: "low",
    statusLabel: "Low",
    pct: 26,
    zones: [
      { w: 29, tone: "warn" },
      { w: 27, tone: "neutral" },
      { w: 44, tone: "good" },
    ],
    ref: "Protective ≥ 60",
  },
  {
    name: "Fasting Glucose",
    value: "92",
    unit: "mg/dL",
    status: "normal",
    statusLabel: "In range",
    pct: 40,
    zones: [
      { w: 13, tone: "warn" },
      { w: 36, tone: "good" },
      { w: 32, tone: "warn" },
      { w: 19, tone: "bad" },
    ],
    ref: "Normal 70–99",
  },
];

// ── Tier-specific clinical narrative (focused on the flagged LDL) ───────────
const NARRATIVE: Record<Tier, { summary: string; means: string; next: string }> = {
  Simple: {
    summary:
      "We reviewed 8 markers. Most look healthy — but your LDL (“bad”) cholesterol is high and worth acting on.",
    means:
      "Your LDL cholesterol is above the recommended range. Elevated LDL contributes to plaque buildup inside arteries and increases long-term cardiovascular risk.",
    next: "Discuss lifestyle modification and a lipid testing follow-up with your physician.",
  },
  Medium: {
    summary:
      "8 markers reviewed. LDL-C is elevated at 168 mg/dL alongside borderline triglycerides and low HDL — a pattern that raises cardiovascular risk.",
    means:
      "Your LDL cholesterol is above the recommended range. Elevated LDL drives plaque buildup inside the artery wall (atherosclerosis), which compounds over years and raises long-term cardiovascular risk.",
    next: "Discuss lifestyle modification and a repeat fasting lipid panel in 8–12 weeks. Ask your physician about your 10-year ASCVD risk score.",
  },
  Expert: {
    summary:
      "Lipid panel: LDL-C 168 mg/dL (optimal <100), TG 182 mg/dL (borderline), HDL-C 38 mg/dL (low). Non-HDL-C elevated — calculate 10-yr ASCVD risk per ACC/AHA.",
    means:
      "LDL-C 168 mg/dL exceeds the optimal threshold (<100 mg/dL). Sustained elevation promotes atherosclerotic plaque formation and increases ASCVD risk; non-HDL-C is the stronger residual-risk marker here.",
    next: "Initiate lifestyle modification and repeat a fasting lipid panel in 8–12 weeks. Stratify 10-yr ASCVD risk; consider a moderate-intensity statin if risk ≥ 7.5% per ACC/AHA guidance.",
  },
};

// ── Tone → soft zone fill ───────────────────────────────────────────────────
const ZONE: Record<Tone, string> = {
  good: "bg-emerald-400/35 dark:bg-emerald-400/25",
  warn: "bg-amber-400/40 dark:bg-amber-400/25",
  bad: "bg-rose-400/40 dark:bg-rose-500/30",
  neutral: "bg-slate-300/50 dark:bg-slate-500/25",
};

// ── Status → accent system ──────────────────────────────────────────────────
const ACCENT: Record<Status, { spine: string; text: string; pill: string; caret: string }> = {
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
};

// Per-row stagger (s) — rows analyze one after another
const ROW_DELAY = 0.16;

// ── Signature heartbeat glyph — the Meridix mark, recognisable sans logo ────
function PulseMark({ className = "w-4 h-4" }: { className?: string }) {
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

// ── Count-up value — renders final number on the server, rolls when live ───
function RollingValue({
  value,
  live,
  reduce,
  delayMs,
}: {
  value: string;
  live: boolean;
  reduce: boolean;
  delayMs: number;
}) {
  const target = parseInt(value, 10);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    if (!live || reduce || !isFinite(target)) return;
    let raf = 0;
    const dur = 900;
    const t0 = performance.now() + delayMs;
    const step = (now: number) => {
      const p = Math.min(1, Math.max(0, (now - t0) / dur));
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(String(Math.round(target * eased)));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [live, reduce, target, delayMs]);

  return <>{display}</>;
}

// ── One biomarker, rendered as the signature range track ────────────────────
//  A flat readout row (hairline-separated), so the range track is the hero
//  and we avoid stacking a frosted card inside the frosted panel.
function BiomarkerTrack({
  m,
  row,
  live,
  reduce,
  dim,
}: {
  m: Marker;
  row: number;
  live: boolean;
  reduce: boolean;
  dim?: boolean;
}) {
  const a = ACCENT[m.status];
  const base = row * ROW_DELAY;
  return (
    <div
      className={`relative py-3.5 transition-opacity duration-300 ${dim ? "opacity-55" : ""}`}
    >
      {/* status spine */}
      <span className={`absolute left-0 top-4 bottom-4 w-[2px] rounded-full ${a.spine}`} />

      <div className="flex items-center justify-between gap-3 pl-3.5">
        <span className="text-[13px] font-semibold text-ink">{m.name}</span>
        <div className="flex items-baseline gap-1.5">
          <span className="font-mono-data text-[15px] font-bold text-ink tabular-nums">
            <RollingValue value={m.value} live={live} reduce={reduce} delayMs={base * 1000} />
          </span>
          <span className="font-mono-data text-[11px] text-ink-tertiary">{m.unit}</span>
          <span
            className={`demo-pill ml-1 self-center text-[10px] font-bold uppercase tracking-wide px-1.5 py-0.5 rounded-md border ${a.pill}`}
            style={{ ["--zd" as string]: `${base + 0.65}s` }}
          >
            {m.statusLabel}
          </span>
        </div>
      </div>

      {/* range track with zone bands + you-are-here caret */}
      <div className="relative mt-2.5 pl-3.5">
        <div className="flex h-2 rounded-full overflow-hidden">
          {m.zones.map((z, i) => (
            <div
              key={i}
              className={`demo-zone ${ZONE[z.tone]}`}
              style={{ width: `${z.w}%`, ["--zd" as string]: `${base + i * 0.07}s` }}
            />
          ))}
        </div>
        <div
          className="absolute top-1/2 -translate-x-1/2 -translate-y-1/2"
          style={{ left: `calc(${m.pct}% + 0.875rem)` }}
        >
          <div className="demo-caret" style={{ ["--zd" as string]: `${base + 0.55}s` }}>
            <div className={`w-3 h-3 rounded-full ${a.caret} ring-2 ring-surface shadow-sm`} />
          </div>
        </div>
      </div>

      <p className="font-mono-data text-[10px] text-ink-tertiary mt-2 pl-3.5">ref · {m.ref}</p>
    </div>
  );
}

export default function LabInterpretationDemo() {
  const [tier, setTier] = useState<Tier>("Simple");
  const [live, setLive] = useState(false);
  const [analyzed, setAnalyzed] = useState(false);
  const [reduce, setReduce] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const n = NARRATIVE[tier];

  // The performance begins when the surface enters the viewport
  useEffect(() => {
    const prefersReduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    setReduce(prefersReduce);
    if (prefersReduce) {
      setLive(true);
      setAnalyzed(true);
      return;
    }
    const el = rootRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setLive(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  // Status flips once the rows have finished landing
  useEffect(() => {
    if (!live || reduce) return;
    const t = setTimeout(() => setAnalyzed(true), 1700);
    return () => clearTimeout(t);
  }, [live, reduce]);

  return (
    <div ref={rootRef} className={`demo-stage relative ${live ? "is-live" : ""}`}>
      <div className="bento">
        {/* Window header */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-4 sm:py-5 border-b border-surface-border">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center text-white flex-shrink-0">
              <PulseMark className="w-5 h-5" />
            </div>
            <div className="leading-tight min-w-0">
              <p className="text-[15px] font-bold text-ink truncate">Lipid Panel — Cardiovascular</p>
              <p className="text-[11px] text-ink-tertiary">Meridix · Report Interpretation</p>
            </div>
          </div>
          <span className="inline-flex items-center text-emerald-600 dark:text-emerald-400 text-[11px] font-bold uppercase tracking-wider flex-shrink-0">
            {analyzed ? (
              <span className="status-in inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                Analyzed
                <span className="text-ink-tertiary font-mono-data font-semibold normal-case tracking-normal">· 6.4s</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 dot-breathe" />
                Analyzing
                <span className="text-ink-tertiary font-mono-data font-semibold normal-case tracking-normal">…</span>
              </span>
            )}
          </span>
        </div>

        {/* Uploaded source — step 1, made visible */}
        <div className="flex items-center justify-between gap-3 px-5 sm:px-7 py-2.5 border-b border-surface-border demo-meta">
          <span className="inline-flex items-center gap-2 text-[11px] text-ink-secondary min-w-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-brand-blue flex-shrink-0">
              <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
            </svg>
            <span className="font-mono-data truncate">lipid-panel.pdf</span>
            <span className="text-ink-tertiary">·</span>
            <span className="text-ink-tertiary whitespace-nowrap">8 markers detected</span>
          </span>
          <span className="hidden sm:inline-flex items-center gap-1 text-[10px] text-ink-tertiary kicker-mono flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-500"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
            Encrypted
          </span>
        </div>

        {/* Body */}
        <div className="px-5 sm:px-7 py-5 sm:py-6">
          {/* Toolbar — reading-level depth control */}
          <div className="flex items-center justify-between gap-3">
            <span className="text-[10px] kicker-mono text-ink-tertiary">Reading level</span>
            <div className="inline-flex items-center gap-0.5 rounded-lg p-0.5 bg-black/[0.04] dark:bg-white/[0.06]">
              {(["Simple", "Medium", "Expert"] as Tier[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTier(t)}
                  className={`px-3 py-1 rounded-md text-xs font-medium transition-all duration-200 ${
                    t === tier
                      ? "bg-ink text-surface shadow-sm"
                      : "text-ink-tertiary hover:text-ink-secondary"
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Lead summary */}
          <p className="mt-3.5 text-sm sm:text-[15px] text-ink-secondary leading-relaxed text-pretty">
            {n.summary}
          </p>

          {/* Two-column console — collapses to one when the panel is narrow */}
          <div className="demo-cols mt-5">
            {/* Biomarker range tracks — the flagged ones first */}
            <section className="min-w-0">
              <div className="flex items-baseline justify-between mb-0.5">
                <span className="kicker-mono text-ink-tertiary">Biomarkers</span>
                <span className="font-mono-data text-[10px] text-ink-tertiary">4 of 8 shown</span>
              </div>
              <div className="divide-y divide-surface-border">
                {MARKERS.map((m, i) => (
                  <BiomarkerTrack
                    key={m.name}
                    m={m}
                    row={i}
                    live={live}
                    reduce={reduce}
                    dim={m.status === "normal"}
                  />
                ))}
              </div>
            </section>

            {/* Signature interpretation annotation — focused on the flag */}
            <aside className="demo-verdict-col flex min-w-0">
              <div className="demo-verdict relative flex flex-col w-full rounded-2xl border border-brand-blue/25 bg-brand-blue/[0.06] p-4 sm:p-5 overflow-hidden">
                <div className="absolute left-0 top-4 bottom-4 w-1 rounded-full bg-brand-blue" />
                <div className="flex items-center gap-2 mb-3.5 pl-2">
                  <span className="w-5 h-5 rounded-md bg-brand-blue text-white flex items-center justify-center flex-shrink-0">
                    <PulseMark className="w-3 h-3" />
                  </span>
                  <span className="kicker-mono text-brand-blue-dark dark:text-brand-blue">Meridix interpretation</span>
                  <span className="ml-auto text-[10px] text-ink-tertiary font-mono-data whitespace-nowrap">↳ LDL Cholesterol</span>
                </div>

                <div className="pl-2 space-y-4 flex-1">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-1">What this means</p>
                    <p className="text-[13px] text-ink-secondary leading-relaxed">{n.means}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-1">Recommended next step</p>
                    <p className="text-[13px] text-ink-secondary leading-relaxed flex items-start gap-1.5">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-brand-blue mt-0.5 flex-shrink-0"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                      <span>{n.next}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-4 mt-4 pl-2 border-t border-brand-blue/15">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary">Suggested specialist</span>
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 dark:bg-rose-950/50 text-rose-700 dark:text-rose-300 border border-rose-200 dark:border-rose-900 text-[11px] font-semibold">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3"><path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" /></svg>
                    Preventive Cardiology
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </div>
      </div>
    </div>
  );
}
