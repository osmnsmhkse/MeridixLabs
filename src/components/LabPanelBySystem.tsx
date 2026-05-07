"use client";

import { useMemo, useState } from "react";
import { findBiomarker, BODY_SYSTEMS, type BiomarkerDef, type BodySystem } from "@/lib/biomarkers";
import { useTranslations } from "next-intl";

// ── Types ─────────────────────────────────────────────────────────────────────

interface RawLab {
  marker: string;
  value: string | number;
  unit?: string;
  reference?: string;
  status?: string;
}

interface ParsedLab {
  marker: string;
  rawValue: string;
  numValue: number | null;
  unit: string;
  reference: string;
  refLow: number | null;
  refHigh: number | null;
  status: "high" | "low" | "normal" | "unknown";
  def: BiomarkerDef | null;
  blurb?: string;
}

interface SystemGroup {
  system: BodySystem;
  flagged: ParsedLab[];
  inRange: ParsedLab[];
  total: number;
}

// ── Parsing helpers ───────────────────────────────────────────────────────────

function parseNumeric(v: string | number | undefined | null): number | null {
  if (v == null) return null;
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  const m = String(v).replace(",", ".").match(/-?\d+(?:\.\d+)?/);
  if (!m) return null;
  const n = parseFloat(m[0]);
  return Number.isFinite(n) ? n : null;
}

function parseRefRange(ref: string | undefined): [number | null, number | null] {
  if (!ref) return [null, null];
  const r = String(ref).replace(",", ".").trim();
  let m = r.match(/^[<≤]\s*(-?\d+(?:\.\d+)?)/);
  if (m) return [null, parseFloat(m[1])];
  m = r.match(/^[>≥]\s*(-?\d+(?:\.\d+)?)/);
  if (m) return [parseFloat(m[1]), null];
  m = r.match(/(-?\d+(?:\.\d+)?)\s*[-–—‒]\s*(-?\d+(?:\.\d+)?)/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  return [null, null];
}

function classifyZone(
  num: number | null,
  refLow: number | null,
  refHigh: number | null,
  status: string | undefined
): "high" | "low" | "normal" | "unknown" {
  if (num != null) {
    if (refHigh != null && num > refHigh) return "high";
    if (refLow != null && num < refLow) return "low";
    if (refLow != null || refHigh != null) return "normal";
  }
  const s = (status ?? "").toLowerCase();
  if (s === "high") return "high";
  if (s === "low") return "low";
  if (s === "normal" || s === "ok") return "normal";
  return "unknown";
}

function parseLab(raw: RawLab): ParsedLab {
  const def = findBiomarker(raw.marker) ?? null;
  const refLowFromCatalog = def?.normal?.[0] ?? null;
  const refHighFromCatalog = def?.normal?.[1] ?? null;
  const [refLowRaw, refHighRaw] = parseRefRange(raw.reference);
  // Prefer the report's own reference, fall back to our catalog
  const refLow = refLowRaw ?? refLowFromCatalog;
  const refHigh = refHighRaw ?? refHighFromCatalog;
  const numValue = parseNumeric(raw.value);
  const status = classifyZone(numValue, refLow, refHigh, raw.status);
  return {
    marker: def?.canonical ?? raw.marker,
    rawValue: String(raw.value),
    numValue,
    unit: raw.unit ?? def?.unit ?? "",
    reference: raw.reference ?? (refLow != null && refHigh != null ? `${refLow}–${refHigh}` : ""),
    refLow,
    refHigh,
    status,
    def,
    blurb: def?.blurb,
  };
}

// ── System icons ──────────────────────────────────────────────────────────────

function SystemIcon({ system, className = "" }: { system: BodySystem; className?: string }) {
  const svgProps = {
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.75,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    className,
    "aria-hidden": true,
  };
  switch (system) {
    case "cardiovascular":
      return (
        <svg {...svgProps}>
          <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
        </svg>
      );
    case "metabolic":
      return (
        <svg {...svgProps}>
          <path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z" />
        </svg>
      );
    case "liver":
      return (
        <svg {...svgProps}>
          <path d="M19 5c-3 0-5 1.5-7 4-2-2.5-4-4-7-4-1.5 0-3 1-3 3 0 6 5 11 10 11s10-5 10-11c0-2-1.5-3-3-3z" />
          <path d="M9 12h2" />
        </svg>
      );
    case "kidney":
      return (
        <svg {...svgProps}>
          <path d="M7 21a5 5 0 0 1-5-5V8a5 5 0 0 1 9.5-2.2 5 5 0 0 1 9.5 2.2v8a5 5 0 0 1-9.5 2.2A5 5 0 0 1 7 21z" />
          <path d="M11.5 5.8v12.4" />
        </svg>
      );
    case "thyroid":
      return (
        <svg {...svgProps}>
          <path d="M12 9c-1.2-2.5-3.5-4-6-4s-4 1.5-4 3c0 4 3 7 10 8 7-1 10-4 10-8 0-1.5-1.5-3-4-3s-4.8 1.5-6 4z" />
          <path d="M12 9v9" />
        </svg>
      );
    case "inflammation":
      return (
        <svg {...svgProps}>
          <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z" />
        </svg>
      );
    case "hematology":
      return (
        <svg {...svgProps}>
          <path d="M12 2.69 6.34 8.35a8 8 0 1 0 11.31 0z" />
          <path d="M12 13.5a3 3 0 0 0 3 3" />
        </svg>
      );
    case "nutrients":
      return (
        <svg {...svgProps}>
          <path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10z" />
          <path d="M2 21c0-3 1.85-5.36 5.08-6" />
        </svg>
      );
    case "hormonal":
      return (
        <svg {...svgProps}>
          <circle cx="12" cy="12" r="1.5" />
          <ellipse cx="12" cy="12" rx="10" ry="4.5" />
          <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(60 12 12)" />
          <ellipse cx="12" cy="12" rx="10" ry="4.5" transform="rotate(120 12 12)" />
        </svg>
      );
    case "other":
      return (
        <svg {...svgProps}>
          <path d="M10 2v8.5L4.5 19a2 2 0 0 0 1.7 3h11.6a2 2 0 0 0 1.7-3L14 10.5V2" />
          <path d="M8.5 2h7" />
          <path d="M7 16h10" />
        </svg>
      );
  }
}

// ── System metadata ───────────────────────────────────────────────────────────

const SYSTEM_DESCRIPTIONS: Record<BodySystem, string> = {
  cardiovascular: "Heart & blood vessel health — lipids, atherogenic markers, CV risk indicators.",
  metabolic: "How your body processes sugar and energy — glucose, insulin, HbA1c.",
  liver: "Liver enzymes and function markers — ALT, AST, ALP, GGT, bilirubin.",
  kidney: "Kidney filtration and waste handling — creatinine, eGFR, BUN, uric acid.",
  thyroid: "Metabolism regulation — TSH, free T3, free T4, thyroid antibodies.",
  inflammation: "Markers of inflammation and infection — CRP, ESR, ferritin.",
  hematology: "Blood cells and clotting — RBC, WBC, hemoglobin, platelets, MCV.",
  nutrients: "Vitamins, minerals, electrolytes — D, B12, folate, iron, magnesium.",
  hormonal: "Sex hormones and adrenal function — testosterone, estradiol, cortisol.",
  other: "Tests we couldn't categorize into a body system.",
};

// ── Visual range bar ──────────────────────────────────────────────────────────

function RangeBar({ lab }: { lab: ParsedLab }) {
  const { numValue, refLow, refHigh, status } = lab;
  if (numValue == null || (refLow == null && refHigh == null)) return null;

  // Determine bar window
  let barMin: number, barMax: number;
  if (refLow != null && refHigh != null) {
    const span = Math.max(refHigh - refLow, 1);
    const pad = span * 0.55;
    barMin = Math.min(refLow - pad, numValue - span * 0.25);
    barMax = Math.max(refHigh + pad, numValue + span * 0.25);
  } else if (refHigh != null) {
    barMin = 0;
    barMax = Math.max(refHigh * 1.6, numValue * 1.25, refHigh + 1);
  } else if (refLow != null) {
    barMin = Math.max(0, refLow * 0.4);
    barMax = Math.max(refLow * 1.8, numValue * 1.25, refLow + 1);
  } else return null;

  const range = Math.max(barMax - barMin, 0.0001);
  const lowPct = refLow != null ? Math.max(0, ((refLow - barMin) / range) * 100) : 0;
  const highPct = refHigh != null ? Math.min(100, ((refHigh - barMin) / range) * 100) : 100;
  const youPct = Math.max(2, Math.min(98, ((numValue - barMin) / range) * 100));

  const youColor = status === "high" || status === "low" ? "bg-red-500" : status === "normal" ? "bg-emerald-500" : "bg-slate-400";
  const youRing = status === "high" || status === "low" ? "ring-red-200 dark:ring-red-900" : status === "normal" ? "ring-emerald-200 dark:ring-emerald-900" : "ring-slate-200";

  return (
    <div className="mt-3">
      <div className="relative">
        {/* The bar itself */}
        <div className="relative h-2 rounded-full overflow-hidden bg-slate-100 dark:bg-slate-800">
          {/* Low zone */}
          {refLow != null && (
            <div className="absolute left-0 top-0 bottom-0 bg-gradient-to-r from-red-300/80 to-amber-200/70" style={{ width: `${lowPct}%` }} />
          )}
          {/* Normal zone */}
          <div
            className="absolute top-0 bottom-0 bg-gradient-to-r from-emerald-300 via-emerald-400 to-emerald-300"
            style={{ left: `${lowPct}%`, width: `${highPct - lowPct}%` }}
          />
          {/* High zone */}
          {refHigh != null && (
            <div className="absolute right-0 top-0 bottom-0 bg-gradient-to-l from-red-300/80 to-amber-200/70" style={{ width: `${100 - highPct}%` }} />
          )}
        </div>

        {/* Boundary tick marks */}
        {refLow != null && (
          <div className="absolute top-0 -translate-x-1/2 h-2 w-px bg-emerald-700/40" style={{ left: `${lowPct}%` }} />
        )}
        {refHigh != null && (
          <div className="absolute top-0 -translate-x-1/2 h-2 w-px bg-emerald-700/40" style={{ left: `${highPct}%` }} />
        )}

        {/* "You" marker */}
        <div className="absolute -top-1.5 -translate-x-1/2" style={{ left: `${youPct}%` }}>
          <div className={`w-5 h-5 rounded-full ring-4 ${youRing} ${youColor} border-2 border-white dark:border-slate-900 shadow-sm`} />
        </div>
      </div>

      {/* Threshold labels + zone hints */}
      <div className="relative h-4 mt-1.5 text-[10px] font-medium text-ink-tertiary">
        <span className="absolute left-0 text-red-500/80">Low</span>
        {refLow != null && (
          <span className="absolute -translate-x-1/2 font-mono-data text-emerald-700 dark:text-emerald-400" style={{ left: `${lowPct}%` }}>
            {fmtNum(refLow)}
          </span>
        )}
        {refHigh != null && (
          <span className="absolute -translate-x-1/2 font-mono-data text-emerald-700 dark:text-emerald-400" style={{ left: `${highPct}%` }}>
            {fmtNum(refHigh)}
          </span>
        )}
        <span className="absolute right-0 text-red-500/80">High</span>
      </div>
    </div>
  );
}

function fmtNum(n: number): string {
  if (Number.isInteger(n)) return String(n);
  return n.toFixed(n < 10 ? 2 : 1).replace(/\.?0+$/, "");
}

// ── Status badge ──────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: ParsedLab["status"] }) {
  const cx =
    status === "high" ? "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300" :
    status === "low" ? "bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300" :
    status === "normal" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300" :
    "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400";
  const label = status === "high" ? "HIGH" : status === "low" ? "LOW" : status === "normal" ? "NORMAL" : "—";
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider ${cx}`}>{label}</span>;
}

// ── Flagged marker row ────────────────────────────────────────────────────────

function FlaggedMarkerRow({ lab }: { lab: ParsedLab }) {
  const valueColor =
    lab.status === "high" ? "text-red-600 dark:text-red-400" :
    lab.status === "low" ? "text-amber-600 dark:text-amber-400" :
    "text-emerald-600 dark:text-emerald-400";

  return (
    <div className="rounded-xl border border-surface-border bg-surface-raised/40 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm font-bold text-ink">{lab.marker}</p>
            <StatusBadge status={lab.status} />
          </div>
          {lab.blurb && (
            <p className="text-[11px] text-ink-tertiary leading-snug mt-1">{lab.blurb}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          <p className={`text-xl font-extrabold tabular-nums leading-none ${valueColor}`}>
            {lab.rawValue}
            {lab.unit && <span className="text-[11px] font-semibold text-ink-tertiary ml-1">{lab.unit}</span>}
          </p>
          {lab.reference && (
            <p className="text-[10px] text-ink-tertiary mt-1 font-mono-data">ref {lab.reference}</p>
          )}
        </div>
      </div>
      <RangeBar lab={lab} />
    </div>
  );
}

// ── In-range table ────────────────────────────────────────────────────────────

function InRangeTable({ labs }: { labs: ParsedLab[] }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-surface-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-raised">
          <tr className="text-left">
            <th className="px-4 py-2.5 text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Marker</th>
            <th className="px-4 py-2.5 text-right text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Result</th>
            <th className="px-4 py-2.5 text-right text-[10px] font-bold text-ink-tertiary uppercase tracking-wider hidden sm:table-cell">Range</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-surface-border">
          {labs.map((l, i) => (
            <tr key={`${l.marker}-${i}`} className="hover:bg-surface-raised/40 transition-colors">
              <td className="px-4 py-2.5 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                <span className="text-sm font-medium text-ink">{l.marker}</span>
              </td>
              <td className="px-4 py-2.5 text-right font-mono-data text-sm font-semibold text-ink tabular-nums">
                {l.rawValue}
                {l.unit && <span className="text-[10px] text-ink-tertiary ml-1">{l.unit}</span>}
              </td>
              <td className="px-4 py-2.5 text-right text-xs text-ink-tertiary font-mono-data hidden sm:table-cell">
                {l.reference || "—"}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── System panel ──────────────────────────────────────────────────────────────

function SystemPanel({ group, defaultOpen }: { group: SystemGroup; defaultOpen: boolean }) {
  const t = useTranslations("LabPanel");
  const [showInRange, setShowInRange] = useState(defaultOpen);
  const meta = BODY_SYSTEMS[group.system];
  const description = SYSTEM_DESCRIPTIONS[group.system];
  const flaggedCount = group.flagged.length;
  const total = group.total;
  const optimalPct = total > 0 ? Math.round(((total - flaggedCount) / total) * 100) : 100;

  // Pick a color tint from the system meta (system meta has a Tailwind text-color class)
  const headerColor = meta.color;

  return (
    <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-4 border-b border-surface-border bg-gradient-to-r from-surface-raised/60 to-transparent flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 min-w-0">
          <span className={`flex items-center justify-center w-9 h-9 rounded-xl bg-surface-raised ${headerColor} flex-shrink-0`}>
            <SystemIcon system={group.system} className="w-5 h-5" />
          </span>
          <div className="min-w-0">
            <p className={`text-sm font-bold ${headerColor}`}>{meta.label}</p>
            <p className="text-[11px] text-ink-tertiary leading-snug mt-0.5 hidden sm:block">{description}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">In range</span>
            <span className={`text-xs font-bold tabular-nums ${optimalPct === 100 ? "text-emerald-600" : optimalPct >= 70 ? "text-amber-600" : "text-red-600"}`}>
              {total - flaggedCount}/{total} · {optimalPct}%
            </span>
          </div>
          {flaggedCount > 0 ? (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300 uppercase tracking-wider">
              {flaggedCount} {t("flagged")}
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 uppercase tracking-wider">
              {t("normal")}
            </span>
          )}
        </div>
      </div>

      {/* In-range progress bar (visual reinforcement) */}
      <div className="h-1 bg-surface-border">
        <div
          className={`h-full transition-all duration-700 ${optimalPct === 100 ? "bg-emerald-500" : optimalPct >= 70 ? "bg-amber-400" : "bg-red-500"}`}
          style={{ width: `${optimalPct}%` }}
        />
      </div>

      {/* Flagged markers with sliders */}
      {group.flagged.length > 0 && (
        <div className="p-5 space-y-3">
          {group.flagged.map((lab, i) => (
            <FlaggedMarkerRow key={`flag-${i}-${lab.marker}`} lab={lab} />
          ))}
        </div>
      )}

      {/* In-range markers (collapsible) */}
      {group.inRange.length > 0 && (
        <div className={group.flagged.length > 0 ? "border-t border-surface-border" : ""}>
          <button
            type="button"
            onClick={() => setShowInRange((v) => !v)}
            className="w-full px-5 py-3 flex items-center justify-between hover:bg-surface-raised/40 transition-colors"
          >
            <span className="text-xs font-semibold text-ink-secondary">
              {group.inRange.length} in-range marker{group.inRange.length === 1 ? "" : "s"}
            </span>
            <span className={`text-ink-tertiary transition-transform text-sm ${showInRange ? "rotate-180" : ""}`}>▾</span>
          </button>
          {showInRange && (
            <div className="px-5 pb-5 -mt-1">
              <InRangeTable labs={group.inRange} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────────────────────

export default function LabPanelBySystem({ labs, flags }: { labs?: RawLab[] | null; flags?: RawLab[] | null }) {
  const t = useTranslations("LabPanel");
  const groups = useMemo<SystemGroup[]>(() => {
    // Prefer labs (full panel); fall back to flags only
    const source: RawLab[] = (labs && labs.length > 0) ? labs : (flags ?? []);
    if (source.length === 0) return [];

    // Dedupe by marker (keep first occurrence)
    const seen = new Set<string>();
    const unique = source.filter((l) => {
      const k = (l.marker ?? "").toLowerCase().trim();
      if (!k || seen.has(k)) return false;
      seen.add(k);
      return true;
    });

    const parsed = unique.map(parseLab);

    // Group by system (default to "other" when biomarker isn't recognized)
    const map = new Map<BodySystem, ParsedLab[]>();
    for (const p of parsed) {
      const sys: BodySystem = p.def?.system ?? "other";
      const arr = map.get(sys) ?? [];
      arr.push(p);
      map.set(sys, arr);
    }

    // Sort within group: flagged first, then alphabetical
    const result: SystemGroup[] = [];
    for (const [system, arr] of map) {
      const flagged = arr.filter((l) => l.status === "high" || l.status === "low" || l.status === "unknown");
      const inRange = arr.filter((l) => l.status === "normal");
      flagged.sort((a, b) => a.marker.localeCompare(b.marker));
      inRange.sort((a, b) => a.marker.localeCompare(b.marker));
      result.push({ system, flagged, inRange, total: arr.length });
    }

    // Sort systems: ones with flags first (more flagged → first), then by total markers
    result.sort((a, b) => {
      if (a.flagged.length !== b.flagged.length) return b.flagged.length - a.flagged.length;
      return b.total - a.total;
    });

    return result;
  }, [labs, flags]);

  const totalMarkers = groups.reduce((acc, g) => acc + g.total, 0);
  const totalFlagged = groups.reduce((acc, g) => acc + g.flagged.length, 0);
  const inRangePct = totalMarkers > 0 ? Math.round(((totalMarkers - totalFlagged) / totalMarkers) * 100) : 100;

  if (groups.length === 0) return null;

  return (
    <div>
      {/* Top overview — stats + body systems integrated */}
      <div className="rounded-2xl border border-surface-border bg-gradient-to-br from-brand-blue/5 via-white to-emerald-500/5 dark:from-brand-blue/10 dark:via-slate-900 dark:to-emerald-500/10 p-5 mb-3">
        {/* Headline summary */}
        <div className="flex items-end justify-between gap-3 flex-wrap mb-4">
          <div>
            <p className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Lab panel</p>
            <p className="text-2xl font-extrabold text-ink tabular-nums leading-tight mt-1">
              {totalMarkers}
              <span className="text-base font-semibold text-ink-tertiary ml-1.5">markers · {groups.length} systems</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
              {totalMarkers - totalFlagged} in range · {inRangePct}%
            </span>
            {totalFlagged > 0 && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-red-50 text-red-700 border border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/60">
                <span className="w-1.5 h-1.5 rounded-full bg-red-500" aria-hidden />
                {totalFlagged} {t("flagged")}
              </span>
            )}
          </div>
        </div>

        {/* Body system grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2">
          {groups.map((g) => {
            const meta = BODY_SYSTEMS[g.system];
            const allClear = g.flagged.length === 0;
            return (
              <a
                key={g.system}
                href={`#system-${g.system}`}
                className={`flex items-center gap-2.5 px-3 py-2 rounded-xl border transition-colors ${
                  allClear
                    ? "border-emerald-200/70 bg-emerald-50/50 hover:bg-emerald-50 dark:border-emerald-900/50 dark:bg-emerald-950/20 dark:hover:bg-emerald-950/40"
                    : "border-red-200/70 bg-red-50/50 hover:bg-red-50 dark:border-red-900/50 dark:bg-red-950/20 dark:hover:bg-red-950/40"
                }`}
              >
                <SystemIcon
                  system={g.system}
                  className={`w-4 h-4 flex-shrink-0 ${
                    allClear ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
                  }`}
                />
                <div className="min-w-0 flex-1">
                  <p className={`text-[11px] font-semibold truncate ${
                    allClear ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"
                  }`}>{meta.label}</p>
                  <p className="text-[10px] tabular-nums text-ink-tertiary mt-0.5">
                    {allClear
                      ? `${g.total}/${g.total} clear`
                      : `${g.flagged.length} of ${g.total} flagged`}
                  </p>
                </div>
              </a>
            );
          })}
        </div>
      </div>

      {/* System panels */}
      <div className="space-y-3">
        {groups.map((g) => (
          <div id={`system-${g.system}`} key={g.system} className="scroll-mt-24">
            <SystemPanel group={g} defaultOpen={g.flagged.length === 0} />
          </div>
        ))}
      </div>
    </div>
  );
}
