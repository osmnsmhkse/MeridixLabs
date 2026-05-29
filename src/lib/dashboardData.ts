// Derive dashboard views from raw lab_analyses rows.
// Normalizes biomarkers via the catalog, groups them by body system, and
// builds longitudinal series suitable for the redesigned dashboard.

import { findBiomarker, zoneFor, BiomarkerDef, BodySystem, CATALOG } from "./biomarkers";

export interface RawFlag {
  marker: string;
  value: string;
  unit?: string;
  reference?: string;
  status?: "normal" | "high" | "low";
  severity?: "mild" | "moderate" | "severe";
}

export interface RawLab {
  marker: string;
  value: string;
  unit?: string;
  reference?: string;
  status?: "normal" | "high" | "low";
}

export interface Analysis {
  id: string;
  created_at: string;
  report_date: string | null;
  source_filename: string | null;
  tier: string | null;
  summary: string | null;
  flags: RawFlag[] | null;
  labs_raw: RawLab[] | null;
  health_score: number | null;
}

export interface Reading {
  date: string;          // ISO
  value: number;         // numeric
  raw: string;           // original string (may include operators like "<5")
  unit?: string;
  zone: "optimal" | "normal" | "out-of-range";
}

export interface NormalizedSeries {
  def: BiomarkerDef;
  readings: Reading[];   // sorted oldest → newest
  latest: Reading;
  first: Reading;
  deltaPct: number;      // latest vs first, as %
  latestZone: "optimal" | "normal" | "out-of-range";
}

export function normalizeAnalyses(analyses: Analysis[]): Map<string, NormalizedSeries> {
  const out = new Map<string, NormalizedSeries>();
  const sorted = [...analyses].sort((a, b) => {
    const da = new Date(a.report_date ?? a.created_at).getTime();
    const db = new Date(b.report_date ?? b.created_at).getTime();
    return da - db;
  });

  for (const a of sorted) {
    const date = a.report_date ?? a.created_at;
    for (const lab of a.labs_raw ?? []) {
      const def = findBiomarker(lab.marker);
      if (!def) continue;
      const num = parseFloat(lab.value);
      if (!isFinite(num)) continue;
      const reading: Reading = {
        date,
        value: num,
        raw: lab.value,
        unit: lab.unit ?? def.unit,
        zone: zoneFor(def, num),
      };
      const prev = out.get(def.slug);
      if (prev) prev.readings.push(reading);
      else out.set(def.slug, {
        def,
        readings: [reading],
        latest: reading,
        first: reading,
        deltaPct: 0,
        latestZone: reading.zone,
      });
    }
  }

  for (const s of out.values()) {
    s.readings.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    s.first = s.readings[0];
    s.latest = s.readings[s.readings.length - 1];
    s.deltaPct = s.first.value === 0 ? 0 : ((s.latest.value - s.first.value) / s.first.value) * 100;
    s.latestZone = s.latest.zone;
  }
  return out;
}

export interface SystemBreakdown {
  system: BodySystem;
  total: number;
  optimal: number;
  normal: number;
  outOfRange: number;
  series: NormalizedSeries[];
}

export function groupBySystem(map: Map<string, NormalizedSeries>): SystemBreakdown[] {
  const systems = new Map<BodySystem, SystemBreakdown>();
  for (const s of map.values()) {
    const sys = s.def.system;
    if (!systems.has(sys)) {
      systems.set(sys, { system: sys, total: 0, optimal: 0, normal: 0, outOfRange: 0, series: [] });
    }
    const b = systems.get(sys)!;
    b.series.push(s);
    b.total++;
    if (s.latestZone === "optimal") b.optimal++;
    else if (s.latestZone === "normal") b.normal++;
    else b.outOfRange++;
  }
  for (const b of systems.values()) {
    b.series.sort((a, b) => a.def.canonical.localeCompare(b.def.canonical));
  }
  const order: BodySystem[] = ["cardiovascular","metabolic","liver","kidney","thyroid","inflammation","hematology","nutrients","hormonal","other"];
  return order.map((o) => systems.get(o)).filter(Boolean) as SystemBreakdown[];
}

export interface BiggestMover {
  series: NormalizedSeries;
  direction: "up" | "down";
  magnitudePct: number;
  meaning: "better" | "worse" | "neutral";
}

export function biggestMovers(map: Map<string, NormalizedSeries>, n = 3): BiggestMover[] {
  const eligible = Array.from(map.values()).filter((s) => s.readings.length >= 2);
  const ranked = eligible
    .map((s) => {
      const direction: "up" | "down" = s.deltaPct >= 0 ? "up" : "down";
      let meaning: "better" | "worse" | "neutral" = "neutral";
      if (s.def.direction === "higher-worse") meaning = direction === "up" ? "worse" : "better";
      else if (s.def.direction === "lower-worse") meaning = direction === "up" ? "better" : "worse";
      return { series: s, direction, magnitudePct: Math.abs(s.deltaPct), meaning };
    })
    .sort((a, b) => b.magnitudePct - a.magnitudePct);
  return ranked.slice(0, n);
}
