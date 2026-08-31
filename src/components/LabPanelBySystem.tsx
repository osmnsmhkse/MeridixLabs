"use client";

import { useMemo, useState } from "react";
import { findBiomarker, BODY_SYSTEMS, type BiomarkerDef, type BodySystem } from "@/lib/biomarkers";
import { useTranslations } from "next-intl";
import { RangeTrack, StatusPill, ACCENT, buildTrack } from "./biomarkerVisuals";
import { isTabularValue } from "@/lib/valueDisplay";

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

// ── Visual range track (shared signature visual — matches the marketing hero) ──

function RangeBar({ lab }: { lab: ParsedLab }) {
  const track = buildTrack(lab.numValue, lab.refLow, lab.refHigh, lab.def?.direction ?? "u-shape");
  if (!track) return null;
  return (
    <div className="mt-2.5">
      <RangeTrack zones={track.zones} pct={track.pct} status={lab.status} />
    </div>
  );
}

// ── Status label (feeds the shared StatusPill) ────────────────────────────────

function useStatusLabel() {
  const t = useTranslations("LabPanel");
  return (status: ParsedLab["status"]) =>
    status === "high" ? t("highStatus") :
    status === "low" ? t("lowStatus") :
    status === "normal" ? t("normalStatus") : "—";
}

// ── Flagged marker row ────────────────────────────────────────────────────────

function FlaggedMarkerRow({ lab }: { lab: ParsedLab }) {
  const statusLabel = useStatusLabel();
  const a = ACCENT[lab.status];
  // Qualitative readings read as prose below lg rather than as a tabular
  // numeral. Restored to the tabular size at lg so desktop is untouched.
  // (Group 3 restacks this row; this is the typography half only.)
  const valueSize = isTabularValue(lab.rawValue)
    ? "text-[15px]"
    : "text-[13px] leading-snug lg:text-[15px] lg:leading-normal";

  return (
    <div className="relative py-3.5">
      {/* status spine */}
      <span className={`absolute left-0 top-4 bottom-4 w-[2px] rounded-full ${a.spine}`} />

      <div className="flex items-start justify-between gap-3 pl-3.5">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-[13px] font-semibold text-ink min-w-0 [overflow-wrap:anywhere]">{lab.marker}</p>
            <StatusPill status={lab.status} label={statusLabel(lab.status)} />
          </div>
          {lab.blurb && (
            <p className="text-[11px] text-ink-tertiary leading-snug mt-0.5 [overflow-wrap:anywhere]">{lab.blurb}</p>
          )}
        </div>
        <div className="flex items-baseline gap-1.5 min-w-0 max-w-[55%] lg:max-w-none">
          <span className={`font-mono-data ${valueSize} font-bold tabular-nums [overflow-wrap:anywhere] ${a.text}`}>{lab.rawValue}</span>
          {lab.unit && <span className="font-mono-data text-[11px] text-ink-tertiary shrink-0">{lab.unit}</span>}
        </div>
      </div>

      <div className="pl-3.5">
        <RangeBar lab={lab} />
      </div>

      {lab.reference && (
        <p className="font-mono-data text-[10px] text-ink-tertiary mt-2 pl-3.5">ref · {lab.reference}</p>
      )}
    </div>
  );
}

// ── In-range table ────────────────────────────────────────────────────────────

function InRangeTable({ labs }: { labs: ParsedLab[] }) {
  const t = useTranslations("LabPanel");
  return (
    <div className="overflow-x-auto rounded-lg border border-surface-border">
      <table className="w-full text-sm">
        <thead className="bg-surface-raised">
          <tr className="text-left">
            <th className="px-4 py-2.5 text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">{t("markerHeader")}</th>
            <th className="px-4 py-2.5 text-right text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">{t("resultHeader")}</th>
            <th className="px-4 py-2.5 text-right text-[10px] font-bold text-ink-tertiary uppercase tracking-wider hidden sm:table-cell">{t("rangeHeader")}</th>
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
            <p className={`text-sm font-bold ${headerColor}`}>{t(group.system as Parameters<typeof t>[0])}</p>
            <p className="text-[11px] text-ink-tertiary leading-snug mt-0.5 hidden sm:block">{t(`${group.system}Desc` as Parameters<typeof t>[0])}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">{t("inRangeLabel")}</span>
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

      {/* Flagged markers — signature range tracks, hairline-separated */}
      {group.flagged.length > 0 && (
        <div className="px-5 divide-y divide-surface-border">
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
              {group.inRange.length} {t("inRangeMarkersLabel")}
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
            <p className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">{t("labPanelHeader")}</p>
            <p className="text-2xl font-extrabold text-ink tabular-nums leading-tight mt-1">
              {totalMarkers}
              <span className="text-base font-semibold text-ink-tertiary ml-1.5">{t("markersUnit")} · {groups.length} {t("systemsUnit")}</span>
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-900/60">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" aria-hidden />
              {totalMarkers - totalFlagged} {t("inRangeUnit")} · {inRangePct}%
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
                  <p className={`text-[11px] font-semibold leading-tight break-words ${
                    allClear ? "text-emerald-800 dark:text-emerald-300" : "text-red-800 dark:text-red-300"
                  }`}>{t(g.system as Parameters<typeof t>[0])}</p>
                  <p className="text-[10px] tabular-nums text-ink-tertiary mt-0.5">
                    {allClear
                      ? `${g.total}/${g.total} ${t("clearStatus")}`
                      : `${g.flagged.length} ${t("ofConnector")} ${g.total} ${t("flagged")}`}
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
