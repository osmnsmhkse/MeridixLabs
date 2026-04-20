"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { bySlug, BODY_SYSTEMS, CATALOG, type BiomarkerDef } from "@/lib/biomarkers";
import { normalizeAnalyses, type Analysis, type NormalizedSeries } from "@/lib/dashboardData";

const AUTH_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export default function BiomarkerPage() {
  if (!AUTH_ENABLED) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-surface px-4">
        <p className="text-sm text-ink-tertiary">Accounts aren&apos;t enabled.</p>
      </div>
    );
  }
  return <BiomarkerInner />;
}

function BiomarkerInner() {
  const params = useParams<{ slug: string }>();
  const slug = params?.slug ?? "";
  const def = bySlug(slug);
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const [analyses, setAnalyses] = useState<Analysis[]>([]);
  const [loading, setLoading] = useState(true);
  const [insight, setInsight] = useState<string | null>(null);
  const [insightLoading, setInsightLoading] = useState(false);

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      try {
        const r = await fetch("/api/user-analyses");
        const j = await r.json();
        if (r.ok) setAnalyses(j.analyses ?? []);
      } finally {
        setLoading(false);
      }
    })();
  }, [isSignedIn]);

  const series = useMemo(() => {
    if (!def) return null;
    const map = normalizeAnalyses(analyses);
    return map.get(def.slug) ?? null;
  }, [analyses, def]);

  useEffect(() => {
    if (!isSignedIn || !def || !series) return;
    setInsightLoading(true);
    (async () => {
      try {
        const r = await fetch("/api/biomarker-insight", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ slug: def.slug }),
        });
        const j = await r.json();
        if (r.ok) setInsight(j.insight ?? null);
      } finally {
        setInsightLoading(false);
      }
    })();
  }, [isSignedIn, def, series]);

  if (!def) {
    return (
      <div className="min-h-[calc(100vh-4rem)] bg-surface py-10 px-4">
        <div className="max-w-3xl mx-auto">
          <Link href="/dashboard" className="text-sm text-brand-blue hover:underline">← Back to dashboard</Link>
          <h1 className="mt-3 text-2xl font-bold text-ink">Unknown biomarker</h1>
          <p className="mt-2 text-sm text-ink-secondary">This marker isn&apos;t in our catalog yet.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-surface">
        <div className="text-sm text-ink-tertiary">Loading…</div>
      </div>
    );
  }

  const meta = BODY_SYSTEMS[def.system];

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">
        <Link href="/dashboard" className="text-sm text-brand-blue hover:underline">← Dashboard</Link>

        <div className="mt-3 flex items-start justify-between gap-4 mb-6">
          <div>
            <p className={`text-xs font-semibold uppercase tracking-wide ${meta.color}`}>
              <span aria-hidden>{meta.emoji}</span> {meta.label}
            </p>
            <h1 className="mt-1 text-3xl font-bold text-ink">{def.canonical}</h1>
            {def.blurb && <p className="mt-1 text-sm text-ink-secondary">{def.blurb}</p>}
          </div>
          {series && (
            <div className="text-right shrink-0">
              <p className="text-3xl font-bold text-ink">{series.latest.raw}</p>
              {def.unit && <p className="text-xs text-ink-tertiary">{def.unit}</p>}
              <p className={`mt-1 text-xs font-semibold ${zoneColorClass(series.latestZone)}`}>
                {zoneLabel(series.latestZone)}
              </p>
            </div>
          )}
        </div>

        {/* Zones legend */}
        <div className="flex flex-wrap gap-3 mb-5 text-xs text-ink-secondary">
          {def.optimal && <Legend swatch="bg-emerald-500" label={`Optimal ${def.optimal[0]}–${def.optimal[1]}${def.unit ? ` ${def.unit}` : ""}`} />}
          {def.normal && <Legend swatch="bg-amber-500/50" label={`Normal ${def.normal[0]}–${def.normal[1]}${def.unit ? ` ${def.unit}` : ""}`} />}
          <Legend swatch="bg-red-500/40" label="Out of range" />
        </div>

        {/* AI insight */}
        <div className="rounded-2xl border border-brand-blue/30 bg-gradient-to-br from-brand-blue/5 to-transparent p-5 mb-6">
          <p className="text-xs font-semibold text-brand-blue uppercase tracking-wide">AI interpretation</p>
          {insightLoading ? (
            <p className="mt-2 text-sm text-ink-tertiary">Reading your history…</p>
          ) : insight ? (
            <p className="mt-2 text-sm text-ink leading-relaxed">{insight}</p>
          ) : (
            <p className="mt-2 text-sm text-ink-tertiary">Upload more reports to see personalized commentary.</p>
          )}
        </div>

        {/* History chart */}
        {series && series.readings.length > 0 ? (
          <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 p-5 mb-6">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">History</p>
            <HistoryChart series={series} def={def} />
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs font-semibold text-ink-tertiary uppercase tracking-wide">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Value</th>
                    <th className="py-2">Zone</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {[...series.readings].reverse().map((r, i) => (
                    <tr key={i}>
                      <td className="py-2 pr-4 text-ink-secondary">{new Date(r.date).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" })}</td>
                      <td className="py-2 pr-4 font-semibold text-ink">{r.raw}{r.unit ? <span className="text-ink-tertiary ml-1">{r.unit}</span> : null}</td>
                      <td className="py-2">
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${zoneChipCx(r.zone)}`}>
                          {zoneLabel(r.zone)}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="rounded-2xl border-2 border-dashed border-surface-border p-8 text-center mb-6">
            <p className="text-sm text-ink-secondary">No readings for this marker in your reports yet.</p>
          </div>
        )}

        {/* Related markers in same system */}
        <RelatedMarkers def={def} />
      </div>
    </div>
  );
}

function HistoryChart({ series, def }: { series: NormalizedSeries; def: BiomarkerDef }) {
  const w = 760, h = 220, padL = 44, padR = 16, padT = 16, padB = 32;
  const readings = series.readings;
  const values = readings.map((r) => r.value);
  let yMin = Math.min(...values, def.optimal?.[0] ?? Infinity, def.normal?.[0] ?? Infinity);
  let yMax = Math.max(...values, def.optimal?.[1] ?? -Infinity, def.normal?.[1] ?? -Infinity);
  if (!isFinite(yMin) || !isFinite(yMax)) { yMin = Math.min(...values); yMax = Math.max(...values); }
  const yPad = (yMax - yMin) * 0.1 || yMax * 0.1 || 1;
  yMin -= yPad; yMax += yPad;
  const yRange = yMax - yMin || 1;

  const dates = readings.map((r) => new Date(r.date).getTime());
  const xMin = Math.min(...dates), xMax = Math.max(...dates);
  const xRange = xMax - xMin || 1;

  const xFor = (t: number) => padL + (readings.length === 1 ? (w - padL - padR) / 2 : ((t - xMin) / xRange) * (w - padL - padR));
  const yFor = (v: number) => padT + (1 - (v - yMin) / yRange) * (h - padT - padB);

  const zoneRect = (lo: number, hi: number, cls: string, key: string) => {
    const y1 = Math.min(yFor(lo), yFor(hi));
    const y2 = Math.max(yFor(lo), yFor(hi));
    return <rect key={key} x={padL} y={y1} width={w - padL - padR} height={y2 - y1} className={cls} />;
  };

  const points = readings.map((r) => `${xFor(new Date(r.date).getTime())},${yFor(r.value)}`).join(" ");

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-56">
      {/* zones */}
      {def.normal && zoneRect(def.normal[0], def.normal[1], "fill-amber-500/10", "normal")}
      {def.optimal && zoneRect(def.optimal[0], def.optimal[1], "fill-emerald-500/15", "optimal")}
      {/* axes */}
      <line x1={padL} y1={padT} x2={padL} y2={h - padB} className="stroke-surface-border" strokeWidth="1" />
      <line x1={padL} y1={h - padB} x2={w - padR} y2={h - padB} className="stroke-surface-border" strokeWidth="1" />
      {/* y labels */}
      {[yMin, (yMin + yMax) / 2, yMax].map((v, i) => (
        <text key={i} x={padL - 6} y={yFor(v) + 3} textAnchor="end" className="fill-ink-tertiary text-[10px]">
          {v.toFixed(v >= 10 ? 0 : 1)}
        </text>
      ))}
      {/* line */}
      {readings.length > 1 && (
        <polyline points={points} fill="none" className="stroke-brand-blue" strokeWidth="2" />
      )}
      {/* points */}
      {readings.map((r, i) => {
        const cx = xFor(new Date(r.date).getTime());
        const cy = yFor(r.value);
        const color = r.zone === "optimal" ? "#059669" : r.zone === "normal" ? "#d97706" : "#dc2626";
        return (
          <g key={i}>
            <circle cx={cx} cy={cy} r="5" fill={color} />
            <text x={cx} y={h - padB + 14} textAnchor="middle" className="fill-ink-tertiary text-[10px]">
              {new Date(r.date).toLocaleDateString(undefined, { month: "short", year: "2-digit" })}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

function RelatedMarkers({ def }: { def: BiomarkerDef }) {
  const related = CATALOG.filter((d) => d.system === def.system && d.slug !== def.slug).slice(0, 6);
  if (!related.length) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-2">Related in {BODY_SYSTEMS[def.system].label}</p>
      <div className="flex flex-wrap gap-2">
        {related.map((d) => (
          <Link key={d.slug} href={`/dashboard/biomarkers/${d.slug}`} className="text-xs font-semibold px-3 py-1.5 rounded-full border border-surface-border text-ink-secondary hover:border-brand-blue hover:text-brand-blue transition-all">
            {d.canonical}
          </Link>
        ))}
      </div>
    </div>
  );
}

function Legend({ swatch, label }: { swatch: string; label: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={`inline-block w-3 h-3 rounded-sm ${swatch}`} />
      {label}
    </span>
  );
}

function zoneLabel(z: NormalizedSeries["latestZone"]): string {
  if (z === "optimal") return "Optimal";
  if (z === "normal") return "Normal";
  return "Out of range";
}

function zoneColorClass(z: NormalizedSeries["latestZone"]): string {
  if (z === "optimal") return "text-emerald-600";
  if (z === "normal") return "text-amber-600";
  return "text-red-600";
}

function zoneChipCx(z: NormalizedSeries["latestZone"]): string {
  if (z === "optimal") return "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300";
  if (z === "normal") return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
}
