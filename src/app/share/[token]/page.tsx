"use client";

import { useEffect, useState, use } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";

interface Flag {
  marker: string;
  value: string;
  unit?: string;
  reference?: string;
  status?: "normal" | "high" | "low";
  severity?: "mild" | "moderate" | "severe";
}

interface LabValue {
  marker: string;
  value: string;
  unit?: string;
  reference?: string;
  status?: "normal" | "high" | "low";
}

interface Analysis {
  id: string;
  created_at: string;
  report_date: string | null;
  source_filename: string | null;
  tier: string | null;
  summary: string | null;
  flags: Flag[] | null;
  labs_raw: LabValue[] | null;
  health_score: number | null;
}

export default function SharedReportPage({ params }: { params: Promise<{ token: string }> }) {
  const t = useTranslations("Share");
  const { token } = use(params);
  const [data, setData] = useState<{ analysis: Analysis; sharedBy: string; expiresAt: string | null } | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch(`/api/share?token=${encodeURIComponent(token)}`);
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed");
        setData(j);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Unable to load this report.");
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  if (loading) return <div className="min-h-screen flex items-center justify-center text-sm text-ink-tertiary">{t("loading")}</div>;
  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4 bg-surface">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-ink">{t("errorTitle")}</h1>
          <p className="mt-2 text-sm text-ink-secondary">{error ?? t("errorBody")}</p>
          <Link href="/" className="mt-4 inline-block text-sm text-brand-blue hover:underline">{t("goHome")}</Link>
        </div>
      </div>
    );
  }

  const { analysis, sharedBy, expiresAt } = data;
  const flags = analysis.flags ?? [];
  const labs = analysis.labs_raw ?? [];

  return (
    <div className="min-h-screen bg-white dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-8 print:py-2 print:px-0">
      <div className="max-w-3xl mx-auto">
        {/* Print-only banner */}
        <div className="hidden print:block mb-6 pb-4 border-b border-surface-border">
          <p className="text-xs text-ink-tertiary">{t("printBanner")}</p>
        </div>

        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-6">
          <div>
            <p className="text-xs font-semibold text-brand-blue uppercase tracking-wider">{t("headerTitle")}</p>
            <h1 className="mt-1 text-2xl font-bold text-ink">{analysis.source_filename ?? t("fallbackFilename")}</h1>
            <p className="mt-1 text-sm text-ink-secondary">
              {formatDate(analysis.report_date ?? analysis.created_at)} · {t("sharedBy")} {sharedBy}
            </p>
          </div>
          <button
            onClick={() => window.print()}
            className="hidden sm:inline-flex print:hidden items-center gap-1.5 px-3.5 py-2 border border-surface-border text-ink-secondary hover:border-brand-blue hover:text-brand-blue font-semibold rounded-lg text-sm transition-all"
          >
            {t("printButton")}
          </button>
        </div>

        {/* Summary */}
        <div className="rounded-2xl border border-surface-border p-5 mb-5">
          <div className="flex items-start gap-5">
            <div className="min-w-0">
              <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">{t("summarySection")}</p>
              {analysis.summary ? (
                <p className="mt-1 text-sm text-ink leading-relaxed">{analysis.summary}</p>
              ) : (
                <p className="mt-1 text-sm text-ink-tertiary">{t("noSummary")}</p>
              )}
            </div>
          </div>
        </div>

        {/* Flags */}
        {flags.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-2">{t("flaggedSection")}</p>
            <div className="rounded-2xl border border-surface-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-raised">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-ink-tertiary text-xs uppercase tracking-wide">{t("colMarker")}</th>
                    <th className="text-left px-4 py-2 font-semibold text-ink-tertiary text-xs uppercase tracking-wide">{t("colValue")}</th>
                    <th className="text-left px-4 py-2 font-semibold text-ink-tertiary text-xs uppercase tracking-wide">{t("colReference")}</th>
                    <th className="text-left px-4 py-2 font-semibold text-ink-tertiary text-xs uppercase tracking-wide">{t("colStatus")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {flags.map((f, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 font-semibold text-ink">{f.marker}</td>
                      <td className="px-4 py-2 text-ink">{f.value}{f.unit ? ` ${f.unit}` : ""}</td>
                      <td className="px-4 py-2 text-ink-tertiary text-xs">{f.reference ?? "—"}</td>
                      <td className="px-4 py-2 text-xs">
                        <span className={`font-semibold px-2 py-0.5 rounded-full ${flagCx(f.status)}`}>{f.status?.toUpperCase() ?? "FLAG"}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* All labs */}
        {labs.length > 0 && (
          <div className="mb-5">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-2">{t("allValues")} ({labs.length})</p>
            <div className="rounded-2xl border border-surface-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-surface-raised">
                  <tr>
                    <th className="text-left px-4 py-2 font-semibold text-ink-tertiary text-xs uppercase tracking-wide">{t("colMarker")}</th>
                    <th className="text-left px-4 py-2 font-semibold text-ink-tertiary text-xs uppercase tracking-wide">{t("colValue")}</th>
                    <th className="text-left px-4 py-2 font-semibold text-ink-tertiary text-xs uppercase tracking-wide">{t("colReference")}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {labs.map((l, i) => (
                    <tr key={i}>
                      <td className="px-4 py-2 text-ink">{l.marker}</td>
                      <td className="px-4 py-2 text-ink">{l.value}{l.unit ? ` ${l.unit}` : ""}</td>
                      <td className="px-4 py-2 text-ink-tertiary text-xs">{l.reference ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 pt-5 border-t border-surface-border text-xs text-ink-tertiary">
          <p>{t("disclaimer")}</p>
          {expiresAt && <p className="mt-1">{t("linkExpires", { date: formatDate(expiresAt) })}</p>}
          <p className="mt-3">
            Generated by{" "}
            <Link href="/" className="text-brand-blue hover:underline">Meridix Labs</Link>.
          </p>
        </div>
      </div>
    </div>
  );
}

function flagCx(status?: string): string {
  if (status === "high") return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
  if (status === "low")  return "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300";
  return "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200";
}
function formatDate(iso: string): string {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleDateString(undefined, { year: "numeric", month: "short", day: "numeric" }); } catch { return iso; }
}
