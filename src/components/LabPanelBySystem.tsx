"use client";

import { useMemo, useState } from "react";
import { findBiomarker, BODY_SYSTEMS, type BiomarkerDef, type BodySystem } from "@/lib/biomarkers";

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
          <span className="text-2xl flex-shrink-0" aria-hidden>{meta.emoji}</span>
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
              {flaggedCount} flagged
            </span>
          ) : (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300 uppercase tracking-wider">
              All clear
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
                {totalFlagged} flagged
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
                <span className="text-base leading-none flex-shrink-0" aria-hidden>{meta.emoji}</span>
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
