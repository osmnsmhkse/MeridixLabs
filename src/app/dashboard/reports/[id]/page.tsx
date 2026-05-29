"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

interface AnalysisFlag {
  marker: string;
  value: string | number;
  unit?: string;
  reference?: string;
  status: string;
}

interface RawLab {
  marker: string;
  value: string | number;
  unit?: string;
  reference?: string;
  status?: string;
}

interface AnalysisResult {
  simple?: string;
  medium?: string;
  expert?: string;
  action?: string;
  specialist?: string;
  etiology?: string;
  mechanism?: string;
  diseases?: string;
  supplements?: string;
  health_insights?: string;
  medication_context?: string;
  summary_headline?: string;
  urgency?: string;
  overall_status?: string;
  flags?: AnalysisFlag[];
}

interface FullAnalysis {
  id: string;
  created_at: string;
  report_date: string | null;
  source_filename: string | null;
  tier: string | null;
  summary: string | null;
  flags: AnalysisFlag[] | null;
  labs_raw: RawLab[] | null;
  health_score: number | null;
  analysis: AnalysisResult | null;
}

type Tier = "simple" | "medium" | "expert";

export default function ReportDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [data, setData] = useState<FullAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [tier, setTier] = useState<Tier>("simple");

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/user-analyses/${id}`);
        if (!r.ok) {
          setError(r.status === 404 ? "Report not found." : "Failed to load report.");
          return;
        }
        const j = await r.json();
        setData(j.analysis);
      } catch {
        setError("Failed to load report.");
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-surface">
      <p className="text-sm text-ink-tertiary">Loading report…</p>
    </div>
  );

  if (error || !data) return (
    <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-surface px-4">
      <div className="text-center">
        <p className="text-sm text-red-600 mb-3">{error ?? "Report not found."}</p>
        <Link href="/dashboard" className="text-sm text-brand-blue hover:underline">← Back to dashboard</Link>
      </div>
    </div>
  );

  const result = data.analysis;
  const flags = data.flags ?? result?.flags ?? [];
  const labs = data.labs_raw ?? [];
  const filename = data.source_filename ?? "Lab report";
  const date = formatDate(data.report_date ?? data.created_at);

  const tierText = result?.[tier] ?? result?.simple ?? data.summary ?? null;

  const urgencyBadge =
    result?.urgency === "days" ? { label: "Urgent", cx: "bg-red-100 text-red-700" } :
    result?.urgency === "weeks" ? { label: "Soon", cx: "bg-amber-100 text-amber-700" } :
    result?.urgency === "months" ? { label: "Routine", cx: "bg-emerald-100 text-emerald-700" } :
    null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        {/* Back + header */}
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink mb-4 transition-colors"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" /></svg>
            Back
          </button>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <h1 className="text-xl font-bold text-ink leading-tight">{filename}</h1>
              <p className="mt-0.5 text-sm text-ink-tertiary">{date}</p>
            </div>
            <div className="flex items-center gap-3">
              {urgencyBadge && (
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${urgencyBadge.cx}`}>{urgencyBadge.label}</span>
              )}
            </div>
          </div>
          {result?.summary_headline && (
            <p className="mt-3 text-sm text-ink-secondary leading-relaxed border-l-4 border-brand-blue/30 pl-3 italic">
              {result.summary_headline}
            </p>
          )}
        </div>

        {/* Tier tabs + interpretation */}
        {(result?.simple || result?.medium || result?.expert || data.summary) && (
          <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 overflow-hidden mb-5 shadow-sm">
            <div className="border-b border-surface-border px-5 pt-4 bg-surface-raised">
              <div className="flex gap-0.5">
                {(["simple", "medium", "expert"] as Tier[]).map((t) => {
                  const hasContent = !!result?.[t];
                  if (!hasContent) return null;
                  const labels = { simple: "Simple", medium: "Medium", expert: "Expert" };
                  const active = t === tier;
                  return (
                    <button
                      key={t}
                      onClick={() => setTier(t)}
                      className={`px-4 py-2 rounded-t-lg text-sm font-semibold transition-all duration-200 ${
                        active ? "bg-white dark:bg-slate-900 text-brand-blue border-b-2 border-brand-blue -mb-px" : "text-ink-tertiary hover:text-ink-secondary"
                      }`}
                    >
                      {labels[t]}
                    </button>
                  );
                })}
              </div>
            </div>
            <div className="p-6">
              {tierText ? (
                tierText.split("\n\n").map((p, i) => (
                  <p key={i} className="text-sm text-ink-secondary leading-relaxed mb-3 last:mb-0">{p}</p>
                ))
              ) : (
                <p className="text-sm text-ink-tertiary">No interpretation available.</p>
              )}
            </div>
            {result?.action && (
              <div className="border-t border-brand-blue/10 bg-brand-blue/5 p-5">
                <p className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-1.5">What should you do?</p>
                <p className="text-sm text-ink-secondary leading-relaxed">{result.action}</p>
              </div>
            )}
          </div>
        )}

        {/* Flagged markers */}
        {flags.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">
              Flagged Markers · {flags.length}
            </p>
            <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <ul className="divide-y divide-surface-border">
                {flags.map((f, i) => {
                  const isHigh = f.status === "high";
                  const isLow = f.status === "low";
                  const isNormal = f.status === "normal" || f.status === "ok";
                  const dot = isHigh ? "bg-red-500" : isLow ? "bg-amber-500" : isNormal ? "bg-emerald-500" : "bg-slate-400";
                  const valColor = isHigh ? "text-red-600" : isLow ? "text-amber-600" : "text-emerald-600";
                  return (
                    <li key={i} className="flex items-center justify-between px-5 py-3 gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
                        <span className="text-sm font-semibold text-ink truncate">{f.marker}</span>
                      </div>
                      <div className="flex items-center gap-3 shrink-0 text-right">
                        <span className={`text-sm font-bold font-mono-data ${valColor}`}>
                          {f.value}{f.unit && <span className="text-xs font-normal text-ink-tertiary ml-1">{f.unit}</span>}
                        </span>
                        {f.reference && (
                          <span className="text-xs text-ink-tertiary hidden sm:block">ref {f.reference}</span>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}

        {/* Specialist */}
        {result?.specialist && (
          <div className="rounded-2xl border border-brand-blue/20 bg-brand-blue/5 p-5 mb-5">
            <p className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-1.5">Which specialist?</p>
            <p className="text-sm text-ink-secondary leading-relaxed">{result.specialist}</p>
          </div>
        )}

        {/* All labs table */}
        {labs.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">
              All Lab Values · {labs.length}
            </p>
            <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-surface-border bg-surface-raised">
                      <th className="text-left px-5 py-2.5 text-xs font-bold text-ink-tertiary uppercase tracking-wide">Marker</th>
                      <th className="text-right px-5 py-2.5 text-xs font-bold text-ink-tertiary uppercase tracking-wide">Value</th>
                      <th className="text-right px-5 py-2.5 text-xs font-bold text-ink-tertiary uppercase tracking-wide hidden sm:table-cell">Reference</th>
                      <th className="text-right px-5 py-2.5 text-xs font-bold text-ink-tertiary uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {labs.map((lab, i) => {
                      const isHigh = lab.status === "high";
                      const isLow = lab.status === "low";
                      const isNormal = lab.status === "normal" || lab.status === "ok" || !lab.status;
                      const valColor = isHigh ? "text-red-600" : isLow ? "text-amber-600" : isNormal ? "text-emerald-600" : "text-ink";
                      const badge = isHigh ? "bg-red-100 text-red-700" : isLow ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700";
                      const label = isHigh ? "High" : isLow ? "Low" : "Normal";
                      return (
                        <tr key={i} className="hover:bg-surface-raised/50 transition-colors">
                          <td className="px-5 py-3 font-semibold text-ink">{lab.marker}</td>
                          <td className={`px-5 py-3 text-right font-mono-data font-bold ${valColor}`}>
                            {lab.value}{lab.unit && <span className="text-xs font-normal text-ink-tertiary ml-1">{lab.unit}</span>}
                          </td>
                          <td className="px-5 py-3 text-right text-ink-tertiary hidden sm:table-cell">{lab.reference ?? "—"}</td>
                          <td className="px-5 py-3 text-right">
                            <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${badge}`}>{label}</span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Deep dive sections */}
        {(result?.etiology || result?.mechanism || result?.diseases) && (
          <div className="mb-5 space-y-3">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">Deeper Analysis</p>
            {result?.etiology && <CollapsibleSection title="Causes" body={result.etiology} />}
            {result?.mechanism && <CollapsibleSection title="Mechanism" body={result.mechanism} />}
            {result?.diseases && <CollapsibleSection title="Possible conditions" body={result.diseases} />}
          </div>
        )}

      </div>
    </div>
  );
}

function CollapsibleSection({ title, body }: { title: string; body: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-ink hover:bg-surface-raised transition-colors"
      >
        {title}
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-ink-tertiary transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-4 border-t border-surface-border">
          <p className="mt-3 text-sm text-ink-secondary leading-relaxed">{body}</p>
        </div>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "long", day: "numeric" }); }
  catch { return iso; }
}
