"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceArea,
  ResponsiveContainer,
  ReferenceLine,
} from "recharts";

// ── Types ────────────────────────────────────────────────────────────────────
interface AnalysisFlag {
  marker: string;
  value: string;
  unit: string;
  reference: string;
  status: "high" | "low" | "normal";
}

interface ReportSlot {
  id: string;
  file: File | null;
  date: string;
}

interface AnalyzedReport {
  date: string;
  fileName: string;
  flags: AnalysisFlag[];
}

interface ChartPoint {
  displayDate: string;
  rawDate: string;
  value: number;
  status: "high" | "low" | "normal";
  unit: string;
  reference: string;
}

// ── Helpers ──────────────────────────────────────────────────────────────────
function uid() {
  return Math.random().toString(36).slice(2);
}

function parseRefRange(ref: string): [number, number] | null {
  const m = ref.match(/(\d+\.?\d*)\s*[–\-]\s*(\d+\.?\d*)/);
  if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  const gt = ref.match(/>\s*(\d+\.?\d*)/);
  if (gt) return [parseFloat(gt[1]), parseFloat(gt[1]) * 2];
  const lt = ref.match(/<\s*(\d+\.?\d*)/);
  if (lt) return [0, parseFloat(lt[1])];
  return null;
}

function fmt(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "2-digit",
  });
}

// ── Custom recharts pieces ────────────────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomDot(props: any) {
  const { cx, cy, payload } = props;
  if (!cx || !cy) return null;
  const abnormal = payload?.status !== "normal";
  return (
    <g>
      {abnormal && (
        <circle cx={cx} cy={cy} r={11} fill="#EF4444" fillOpacity={0.15} />
      )}
      <circle
        cx={cx}
        cy={cy}
        r={6}
        fill={abnormal ? "#EF4444" : "#10B981"}
        stroke="white"
        strokeWidth={2.5}
      />
    </g>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function CustomTooltip({ active, payload }: any) {
  if (!active || !payload?.length) return null;
  const d: ChartPoint = payload[0].payload;
  const abnormal = d.status !== "normal";
  return (
    <div className="bg-white border border-surface-border rounded-xl shadow-xl p-3.5 min-w-[140px]">
      <p className="text-xs text-ink-tertiary mb-1">{d.displayDate}</p>
      <p className={`text-lg font-extrabold ${abnormal ? "text-red-500" : "text-emerald-600"}`}>
        {d.value} <span className="text-sm font-normal text-ink-tertiary">{d.unit}</span>
      </p>
      <p className="text-xs mt-0.5 capitalize font-medium" style={{ color: abnormal ? "#EF4444" : "#10B981" }}>
        {d.status}
      </p>
      {d.reference && (
        <p className="text-[10px] text-ink-tertiary mt-1">Ref: {d.reference}</p>
      )}
    </div>
  );
}

// ── Report slot component ─────────────────────────────────────────────────────
function ReportSlotCard({
  slot,
  index,
  analyzedReport,
  onFileChange,
  onDateChange,
  onRemove,
  canRemove,
}: {
  slot: ReportSlot;
  index: number;
  analyzedReport: AnalyzedReport | null;
  onFileChange: (id: string, file: File) => void;
  onDateChange: (id: string, date: string) => void;
  onRemove: (id: string) => void;
  canRemove: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) onFileChange(slot.id, file);
    },
    [slot.id, onFileChange]
  );

  const isAnalyzed = !!analyzedReport;

  return (
    <div
      className={`rounded-2xl border transition-all duration-200 ${
        isAnalyzed
          ? "border-emerald-200 bg-emerald-50/30"
          : "border-surface-border bg-white"
      }`}
    >
      <div className="px-5 py-3.5 border-b border-surface-border/60 flex items-center justify-between">
        <span className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">
          Report {index + 1}
        </span>
        <div className="flex items-center gap-2">
          {isAnalyzed && (
            <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-full">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              Analyzed
            </span>
          )}
          {canRemove && (
            <button
              onClick={() => onRemove(slot.id)}
              className="text-ink-tertiary hover:text-red-500 transition-colors p-1 rounded-lg hover:bg-red-50"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          )}
        </div>
      </div>

      <div className="p-4 flex flex-col sm:flex-row gap-3 items-start">
        {/* File zone */}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) onFileChange(slot.id, f);
          }}
        />
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !slot.file && inputRef.current?.click()}
          className={`flex-1 rounded-xl border-2 border-dashed transition-all duration-200 cursor-pointer min-h-[72px] flex items-center justify-center px-4 py-3 ${
            dragging
              ? "border-brand-blue bg-brand-blue-light"
              : slot.file
              ? "border-emerald-300 bg-emerald-50 cursor-default"
              : "border-surface-border hover:border-brand-blue/40 hover:bg-brand-blue-light/20"
          }`}
        >
          {slot.file ? (
            <div className="flex items-center gap-2 w-full">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-emerald-600 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-semibold text-ink truncate">{slot.file.name}</p>
                <button
                  onClick={(e) => { e.stopPropagation(); onFileChange(slot.id, null as unknown as File); }}
                  className="text-[10px] text-red-400 hover:text-red-600 mt-0.5"
                >
                  Remove
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-ink-tertiary mx-auto mb-1">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
              <p className="text-xs text-ink-tertiary">Drop file or <span className="text-brand-blue font-medium">click</span></p>
            </div>
          )}
        </div>

        {/* Date input */}
        <div className="flex flex-col gap-1 flex-shrink-0">
          <label className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
            Report Date
          </label>
          <input
            type="date"
            value={slot.date}
            onChange={(e) => onDateChange(slot.id, e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="px-3 py-2 rounded-xl border border-surface-border text-sm text-ink bg-white focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
          />
        </div>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function TrendsPage() {
  const [slots, setSlots] = useState<ReportSlot[]>([
    { id: uid(), file: null, date: "" },
    { id: uid(), file: null, date: "" },
  ]);
  const [analyzedReports, setAnalyzedReports] = useState<AnalyzedReport[]>([]);
  const [analyzing, setAnalyzing] = useState(false);
  const [analyzeProgress, setAnalyzeProgress] = useState<{ current: number; total: number } | null>(null);
  const [analyzeError, setAnalyzeError] = useState<string | null>(null);

  const [selectedMarker, setSelectedMarker] = useState<string>("");
  const [trendSummary, setTrendSummary] = useState<string>("");
  const [summaryLoading, setSummaryLoading] = useState(false);

  // Restore from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem("meridix-trends");
      if (stored) {
        const data = JSON.parse(stored) as AnalyzedReport[];
        setAnalyzedReports(data);
      }
    } catch { /* ignore */ }
  }, []);

  // Persist to sessionStorage whenever analyzed reports change
  useEffect(() => {
    if (analyzedReports.length) {
      sessionStorage.setItem("meridix-trends", JSON.stringify(analyzedReports));
    }
  }, [analyzedReports]);

  const addSlot = () =>
    setSlots((s) => [...s, { id: uid(), file: null, date: "" }]);

  const removeSlot = (id: string) =>
    setSlots((s) => s.filter((sl) => sl.id !== id));

  const updateFile = (id: string, file: File) =>
    setSlots((s) => s.map((sl) => (sl.id === id ? { ...sl, file } : sl)));

  const updateDate = (id: string, date: string) =>
    setSlots((s) => s.map((sl) => (sl.id === id ? { ...sl, date } : sl)));

  // Which slots are ready (have both file and date)
  const readySlots = slots.filter((s) => s.file && s.date);
  const canAnalyze = readySlots.length >= 2;

  // All unique markers across analyzed reports
  const allMarkers = Array.from(
    new Set(analyzedReports.flatMap((r) => r.flags.map((f) => f.marker)))
  ).sort();

  // Build chart data for selected marker
  const chartData: ChartPoint[] = selectedMarker
    ? analyzedReports
        .filter((r) => r.flags.some((f) => f.marker === selectedMarker))
        .map((r) => {
          const flag = r.flags.find((f) => f.marker === selectedMarker)!;
          return {
            displayDate: fmt(r.date),
            rawDate: r.date,
            value: parseFloat(flag.value),
            status: flag.status,
            unit: flag.unit,
            reference: flag.reference,
          };
        })
        .sort(
          (a, b) =>
            new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime()
        )
    : [];

  const refRange =
    chartData.length > 0 ? parseRefRange(chartData[0].reference) : null;

  // Y-axis domain with padding
  const yDomain: [number, number] | undefined = (() => {
    if (!chartData.length) return undefined;
    const vals = [
      ...chartData.map((d) => d.value),
      ...(refRange ?? []),
    ];
    const min = Math.min(...vals);
    const max = Math.max(...vals);
    const pad = Math.max((max - min) * 0.25, 5);
    return [Math.max(0, Math.floor(min - pad)), Math.ceil(max + pad)];
  })();

  // Analyze all ready slots
  const handleAnalyze = async () => {
    setAnalyzing(true);
    setAnalyzeError(null);
    const results: AnalyzedReport[] = [];

    for (let i = 0; i < readySlots.length; i++) {
      const slot = readySlots[i];
      setAnalyzeProgress({ current: i + 1, total: readySlots.length });

      try {
        const form = new FormData();
        form.append("file", slot.file!);
        form.append("language", "en");

        const res = await fetch("/api/analyze", { method: "POST", body: form });
        const json = await res.json();

        if (!res.ok) throw new Error(json.error || "Analysis failed");

        results.push({
          date: slot.date,
          fileName: slot.file!.name,
          flags: json.data.flags ?? [],
        });
      } catch (err) {
        setAnalyzeError(
          `Report ${i + 1} failed: ${err instanceof Error ? err.message : "Unknown error"}`
        );
        setAnalyzing(false);
        setAnalyzeProgress(null);
        return;
      }
    }

    setAnalyzedReports(results);
    setAnalyzing(false);
    setAnalyzeProgress(null);
    setSelectedMarker("");
    setTrendSummary("");
  };

  // Generate trend summary when marker is selected
  const handleMarkerChange = async (marker: string) => {
    setSelectedMarker(marker);
    setTrendSummary("");
    if (!marker) return;

    const points = analyzedReports
      .filter((r) => r.flags.some((f) => f.marker === marker))
      .map((r) => {
        const flag = r.flags.find((f) => f.marker === marker)!;
        return { date: r.date, value: parseFloat(flag.value), status: flag.status };
      });

    if (points.length < 2) return;

    const refFlag = analyzedReports
      .flatMap((r) => r.flags)
      .find((f) => f.marker === marker);

    setSummaryLoading(true);
    try {
      const res = await fetch("/api/trend-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marker,
          unit: refFlag?.unit ?? "",
          reference: refFlag?.reference ?? "",
          dataPoints: points,
        }),
      });
      const json = await res.json();
      setTrendSummary(json.summary ?? "");
    } catch { /* silent */ }
    setSummaryLoading(false);
  };

  const resetAll = () => {
    setAnalyzedReports([]);
    setSelectedMarker("");
    setTrendSummary("");
    sessionStorage.removeItem("meridix-trends");
    setSlots([
      { id: uid(), file: null, date: "" },
      { id: uid(), file: null, date: "" },
    ]);
  };

  const hasResults = analyzedReports.length >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-light to-white">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20">

        {/* Header */}
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white border border-brand-blue/30 text-brand-blue text-xs font-semibold uppercase tracking-wider mb-5 shadow-sm">
            New Feature
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight mb-3">
            Lab Value{" "}
            <span className="text-gradient-blue">Trend Tracker</span>
          </h1>
          <p className="text-ink-secondary text-lg max-w-xl mx-auto leading-relaxed">
            Upload two or more lab reports from different dates and visualise
            how your values have changed over time.
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-emerald-500">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            Your data is never uploaded or stored on our servers
          </div>
        </div>

        {/* ── Setup / Upload phase ─────────────────────────────── */}
        {!hasResults && (
          <div className="bg-white rounded-3xl shadow-xl shadow-ink/5 border border-surface-border p-6 sm:p-8 space-y-4">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-base font-bold text-ink">Add your lab reports</h2>
              <span className="text-xs text-ink-tertiary">{readySlots.length} / {slots.length} ready</span>
            </div>

            {slots.map((slot, i) => (
              <ReportSlotCard
                key={slot.id}
                slot={slot}
                index={i}
                analyzedReport={null}
                onFileChange={updateFile}
                onDateChange={updateDate}
                onRemove={removeSlot}
                canRemove={slots.length > 2}
              />
            ))}

            <button
              onClick={addSlot}
              className="w-full py-2.5 rounded-xl border border-dashed border-surface-border hover:border-brand-blue/30 hover:bg-brand-blue-light/20 text-sm text-ink-tertiary hover:text-brand-blue transition-all duration-200 flex items-center justify-center gap-1.5"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 3a1 1 0 011 1v5h5a1 1 0 110 2h-5v5a1 1 0 11-2 0v-5H4a1 1 0 110-2h5V4a1 1 0 011-1z" clipRule="evenodd" />
              </svg>
              Add another report
            </button>

            {analyzeError && (
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100 text-sm text-red-700">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {analyzeError}
              </div>
            )}

            <button
              onClick={handleAnalyze}
              disabled={!canAnalyze || analyzing}
              className={`w-full py-4 rounded-xl font-bold text-base transition-all duration-200 flex items-center justify-center gap-2 ${
                canAnalyze && !analyzing
                  ? "bg-brand-blue hover:bg-brand-blue-hover text-white shadow-lg shadow-brand-blue/20 hover:-translate-y-0.5"
                  : "bg-surface-raised text-ink-tertiary cursor-not-allowed"
              }`}
            >
              {analyzing ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Analyzing report {analyzeProgress?.current} of {analyzeProgress?.total}…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  Analyze All Reports
                  {!canAnalyze && (
                    <span className="text-xs font-normal opacity-70">
                      (need ≥ 2 reports with dates)
                    </span>
                  )}
                </>
              )}
            </button>
          </div>
        )}

        {/* ── Results phase ────────────────────────────────────── */}
        {hasResults && (
          <div className="space-y-6">
            {/* Reports summary bar */}
            <div className="bg-white rounded-2xl border border-surface-border px-5 py-4 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-semibold text-ink">
                  {analyzedReports.length} reports analyzed
                </span>
                <span className="text-ink-tertiary text-xs">·</span>
                <span className="text-xs text-ink-tertiary">
                  {analyzedReports
                    .map((r) => fmt(r.date))
                    .join(" · ")}
                </span>
              </div>
              <button
                onClick={resetAll}
                className="text-xs text-ink-tertiary hover:text-brand-blue transition-colors flex items-center gap-1"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
                </svg>
                Start over
              </button>
            </div>

            {/* Marker selector */}
            <div className="bg-white rounded-2xl border border-surface-border p-5">
              <label className="block text-xs font-bold text-ink-tertiary uppercase tracking-wider mb-3">
                Select a lab value to track
              </label>
              <select
                value={selectedMarker}
                onChange={(e) => handleMarkerChange(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-surface-border text-sm text-ink bg-white focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all appearance-none cursor-pointer"
              >
                <option value="">— Choose a marker —</option>
                {allMarkers.map((m) => {
                  const flag = analyzedReports.flatMap((r) => r.flags).find((f) => f.marker === m);
                  return (
                    <option key={m} value={m}>
                      {m}{flag?.unit ? ` (${flag.unit})` : ""}
                    </option>
                  );
                })}
              </select>
              {allMarkers.length === 0 && (
                <p className="text-xs text-ink-tertiary mt-2">No markers detected across your reports.</p>
              )}
            </div>

            {/* Chart */}
            {selectedMarker && chartData.length > 0 && (
              <div className="bg-white rounded-2xl border border-surface-border overflow-hidden shadow-sm">
                <div className="px-5 py-4 border-b border-surface-border bg-surface-raised flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-ink">{selectedMarker}</p>
                    <p className="text-xs text-ink-tertiary mt-0.5">
                      {chartData[0]?.unit && `Unit: ${chartData[0].unit}`}
                      {chartData[0]?.reference && ` · Ref: ${chartData[0].reference}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs text-ink-tertiary">
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 inline-block" />
                      Normal
                    </span>
                    <span className="flex items-center gap-1">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" />
                      Abnormal
                    </span>
                    {refRange && (
                      <span className="flex items-center gap-1">
                        <span className="w-6 h-2.5 rounded bg-emerald-200 inline-block opacity-70" />
                        Normal range
                      </span>
                    )}
                  </div>
                </div>

                <div className="p-5">
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={chartData}
                      margin={{ top: 10, right: 20, bottom: 10, left: 0 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                      <XAxis
                        dataKey="displayDate"
                        tick={{ fontSize: 11, fill: "#94A3B8" }}
                        axisLine={{ stroke: "#E2E8F0" }}
                        tickLine={false}
                      />
                      <YAxis
                        domain={yDomain}
                        tick={{ fontSize: 11, fill: "#94A3B8" }}
                        axisLine={false}
                        tickLine={false}
                        width={45}
                      />
                      <Tooltip content={<CustomTooltip />} />

                      {/* Reference range shaded band */}
                      {refRange && (
                        <ReferenceArea
                          y1={refRange[0]}
                          y2={refRange[1]}
                          fill="#10B981"
                          fillOpacity={0.08}
                          stroke="#10B981"
                          strokeOpacity={0.25}
                          strokeDasharray="4 4"
                        />
                      )}

                      {/* Ref range boundary lines */}
                      {refRange && (
                        <>
                          <ReferenceLine y={refRange[0]} stroke="#10B981" strokeOpacity={0.4} strokeDasharray="3 3" />
                          <ReferenceLine y={refRange[1]} stroke="#10B981" strokeOpacity={0.4} strokeDasharray="3 3" />
                        </>
                      )}

                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#4A85EF"
                        strokeWidth={2.5}
                        dot={<CustomDot />}
                        activeDot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {/* AI Trend Summary */}
            {selectedMarker && chartData.length >= 2 && (
              <div className="bg-white rounded-2xl border border-surface-border overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-surface-border bg-surface-raised flex items-center gap-2">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-blue">
                    <path d="M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" />
                  </svg>
                  <span className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">AI Trend Summary</span>
                </div>
                <div className="p-5">
                  {summaryLoading ? (
                    <div className="flex items-center gap-3 text-sm text-ink-tertiary">
                      <div className="w-4 h-4 border-2 border-brand-blue/30 border-t-brand-blue rounded-full animate-spin flex-shrink-0" />
                      Generating trend analysis…
                    </div>
                  ) : trendSummary ? (
                    <p className="text-sm text-ink-secondary leading-relaxed">{trendSummary}</p>
                  ) : (
                    <p className="text-sm text-ink-tertiary italic">Summary will appear here once generated.</p>
                  )}
                </div>
              </div>
            )}

            {/* Only 1 data point warning */}
            {selectedMarker && chartData.length === 1 && (
              <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
                Only one of your reports contains <strong>{selectedMarker}</strong>. Upload at least 2 reports that include this value to see a trend.
              </div>
            )}
          </div>
        )}

        {/* Back to analyze link */}
        <div className="mt-10 text-center">
          <Link
            href="/app"
            className="text-sm text-ink-tertiary hover:text-brand-blue transition-colors inline-flex items-center gap-1.5"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
            </svg>
            Analyze a single report
          </Link>
        </div>
      </div>
    </div>
  );
}
