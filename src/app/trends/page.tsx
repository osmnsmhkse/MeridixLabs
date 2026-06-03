"use client";

import { useState, useCallback, useRef, useEffect, useMemo } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
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
  AreaChart,
  Area,
} from "recharts";
import TrendChatPanel from "@/components/TrendChatPanel";
import { useToolContext } from "@/components/ToolChatProvider";

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

interface MarkerSummary {
  marker: string;
  unit: string;
  reference: string;
  category: string;
  points: ChartPoint[];
  trend: "improving" | "worsening" | "stable" | "fluctuating";
  changePercent: number;
  latestStatus: "high" | "low" | "normal";
}

// ── Constants ────────────────────────────────────────────────────────────────
const MARKER_CATEGORIES: Record<string, string[]> = {
  "Blood Count": ["WBC", "RBC", "Hemoglobin", "Hematocrit", "Platelets", "MCV", "MCH", "MCHC", "RDW", "MPV", "Neutrophils", "Lymphocytes", "Monocytes", "Eosinophils", "Basophils"],
  "Lipids": ["Total Cholesterol", "Cholesterol", "LDL", "HDL", "Triglycerides", "VLDL", "LDL/HDL Ratio", "Non-HDL Cholesterol"],
  "Liver": ["ALT", "AST", "ALP", "GGT", "Bilirubin", "Direct Bilirubin", "Indirect Bilirubin", "Albumin", "Total Protein", "Globulin"],
  "Kidney": ["Creatinine", "BUN", "Urea", "Uric Acid", "eGFR", "BUN/Creatinine Ratio", "Cystatin C"],
  "Thyroid": ["TSH", "T3", "T4", "Free T3", "Free T4", "Anti-TPO", "Thyroglobulin"],
  "Diabetes": ["Glucose", "Fasting Glucose", "HbA1c", "Insulin", "HOMA-IR", "C-Peptide", "Fructosamine"],
  "Vitamins & Minerals": ["Vitamin D", "Vitamin B12", "Folate", "Iron", "Ferritin", "TIBC", "Transferrin", "Calcium", "Magnesium", "Zinc", "Phosphorus", "Potassium", "Sodium"],
  "Inflammation": ["CRP", "ESR", "hs-CRP", "Fibrinogen", "Procalcitonin", "IL-6"],
  "Hormones": ["Testosterone", "Estradiol", "Progesterone", "Cortisol", "DHEA-S", "FSH", "LH", "Prolactin"],
};

function categorizeMarker(marker: string): string {
  const normalized = marker.toLowerCase().trim();
  for (const [category, markers] of Object.entries(MARKER_CATEGORIES)) {
    if (markers.some((m) => normalized.includes(m.toLowerCase()) || m.toLowerCase().includes(normalized))) {
      return category;
    }
  }
  return "Other";
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

function determineTrend(points: ChartPoint[]): { trend: "improving" | "worsening" | "stable" | "fluctuating"; changePercent: number } {
  if (points.length < 2) return { trend: "stable", changePercent: 0 };

  const sorted = [...points].sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());
  const first = sorted[0];
  const last = sorted[sorted.length - 1];
  const changePercent = first.value !== 0 ? ((last.value - first.value) / first.value) * 100 : 0;

  const ref = parseRefRange(first.reference);
  if (!ref) {
    if (Math.abs(changePercent) < 5) return { trend: "stable", changePercent };
    return { trend: changePercent > 0 ? "worsening" : "improving", changePercent };
  }

  const [low, high] = ref;
  const firstInRange = first.value >= low && first.value <= high;
  const lastInRange = last.value >= low && last.value <= high;

  if (firstInRange && lastInRange) return { trend: "stable", changePercent };
  if (!firstInRange && lastInRange) return { trend: "improving", changePercent };
  if (firstInRange && !lastInRange) return { trend: "worsening", changePercent };

  const firstDist = Math.min(Math.abs(first.value - low), Math.abs(first.value - high));
  const lastDist = Math.min(Math.abs(last.value - low), Math.abs(last.value - high));

  if (lastDist < firstDist) return { trend: "improving", changePercent };
  if (lastDist > firstDist) return { trend: "worsening", changePercent };

  // Check for fluctuation
  const statuses = sorted.map((p) => p.status);
  const changes = statuses.filter((s, i) => i > 0 && s !== statuses[i - 1]).length;
  if (changes >= 2) return { trend: "fluctuating", changePercent };

  return { trend: "stable", changePercent };
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
    <div className="bg-surface-raised border border-surface-border rounded-xl shadow-xl p-3.5 min-w-[140px]">
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

// ── Mini sparkline for overview cards ────────────────────────────────────────
function Sparkline({ points, trend }: { points: ChartPoint[]; trend: string }) {
  const color = trend === "improving" ? "#10B981" : trend === "worsening" ? "#EF4444" : trend === "fluctuating" ? "#F59E0B" : "#6B7280";
  const sorted = [...points].sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

  return (
    <ResponsiveContainer width="100%" height={40}>
      <AreaChart data={sorted} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
        <defs>
          <linearGradient id={`spark-${trend}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
            <stop offset="100%" stopColor={color} stopOpacity={0} />
          </linearGradient>
        </defs>
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2}
          fill={`url(#spark-${trend})`}
          dot={false}
        />
      </AreaChart>
    </ResponsiveContainer>
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
          : "border-surface-border bg-surface-raised"
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

        <div className="flex flex-col gap-1 flex-shrink-0">
          <label className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-wider">
            Report Date
          </label>
          <input
            type="date"
            value={slot.date}
            onChange={(e) => onDateChange(slot.id, e.target.value)}
            max={new Date().toISOString().split("T")[0]}
            className="px-3 py-2 rounded-xl border border-surface-border text-sm text-ink bg-surface-raised focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all"
          />
        </div>
      </div>
    </div>
  );
}

// ── Trend icon ────────────────────────────────────────────────────────────────
function TrendIcon({ trend, size = "md" }: { trend: string; size?: "sm" | "md" }) {
  const s = size === "sm" ? "w-4 h-4" : "w-5 h-5";
  if (trend === "improving") return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={`${s} text-emerald-500`}>
      <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
    </svg>
  );
  if (trend === "worsening") return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={`${s} text-red-500`}>
      <path fillRule="evenodd" d="M12 13a1 1 0 100 2h5a1 1 0 001-1V9a1 1 0 10-2 0v2.586l-4.293-4.293a1 1 0 00-1.414 0L8 9.586 3.707 5.293a1 1 0 00-1.414 1.414l5 5a1 1 0 001.414 0L11 9.414 14.586 13H12z" clipRule="evenodd" />
    </svg>
  );
  if (trend === "fluctuating") return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={`${s} text-amber-500`}>
      <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
      <path d="M5 7l2-2 2 2M11 13l2 2 2-2" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={`${s} text-ink-tertiary`}>
      <path fillRule="evenodd" d="M3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
    </svg>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────
export default function TrendsPage() {
  const t = useTranslations("Trends");
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
  useToolContext(trendSummary || null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"overview" | "detail" | "timeline">("overview");
  const [filterCategory, setFilterCategory] = useState<string>("All");

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

  const readySlots = slots.filter((s) => s.file && s.date);
  const canAnalyze = readySlots.length >= 2;

  // All unique markers across analyzed reports
  const allMarkers = Array.from(
    new Set(analyzedReports.flatMap((r) => r.flags.map((f) => f.marker)))
  ).sort();

  // Build comprehensive marker summaries
  const markerSummaries: MarkerSummary[] = useMemo(() => {
    return allMarkers.map((marker) => {
      const points: ChartPoint[] = analyzedReports
        .filter((r) => r.flags.some((f) => f.marker === marker))
        .map((r) => {
          const flag = r.flags.find((f) => f.marker === marker)!;
          return {
            displayDate: fmt(r.date),
            rawDate: r.date,
            value: parseFloat(flag.value),
            status: flag.status,
            unit: flag.unit,
            reference: flag.reference,
          };
        })
        .sort((a, b) => new Date(a.rawDate).getTime() - new Date(b.rawDate).getTime());

      const { trend, changePercent } = determineTrend(points);
      const category = categorizeMarker(marker);
      const latestStatus = points.length > 0 ? points[points.length - 1].status : "normal";
      const flag = analyzedReports.flatMap((r) => r.flags).find((f) => f.marker === marker)!;

      return {
        marker,
        unit: flag.unit,
        reference: flag.reference,
        category,
        points,
        trend,
        changePercent,
        latestStatus,
      };
    });
  }, [analyzedReports, allMarkers]);

  // Filter markers by category
  const categories = useMemo(() => {
    const cats = Array.from(new Set(markerSummaries.map((m) => m.category)));
    return ["All", ...cats.sort()];
  }, [markerSummaries]);

  const filteredSummaries = useMemo(() => {
    if (filterCategory === "All") return markerSummaries;
    return markerSummaries.filter((m) => m.category === filterCategory);
  }, [markerSummaries, filterCategory]);

  // Stats
  const stats = useMemo(() => {
    const improving = markerSummaries.filter((m) => m.trend === "improving").length;
    const worsening = markerSummaries.filter((m) => m.trend === "worsening").length;
    const stable = markerSummaries.filter((m) => m.trend === "stable").length;
    const abnormal = markerSummaries.filter((m) => m.latestStatus !== "normal").length;
    return { improving, worsening, stable, abnormal, total: markerSummaries.length };
  }, [markerSummaries]);

  // Build chart data for selected marker
  const chartData: ChartPoint[] = selectedMarker
    ? (markerSummaries.find((m) => m.marker === selectedMarker)?.points ?? [])
    : [];

  const refRange =
    chartData.length > 0 ? parseRefRange(chartData[0].reference) : null;

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

  // Timeline data — all markers chronologically
  const timelineData = useMemo(() => {
    const entries: Array<{ date: string; displayDate: string; marker: string; value: number; unit: string; status: string; reference: string }> = [];
    for (const report of analyzedReports) {
      for (const flag of report.flags) {
        entries.push({
          date: report.date,
          displayDate: fmt(report.date),
          marker: flag.marker,
          value: parseFloat(flag.value),
          unit: flag.unit,
          status: flag.status,
          reference: flag.reference,
        });
      }
    }
    return entries.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [analyzedReports]);

  // Build trend snapshot for chat
  const trendSnapshot = useMemo(() => {
    if (!markerSummaries.length) return "";
    const lines = markerSummaries.map((m) => {
      const latest = m.points[m.points.length - 1];
      return `${m.marker}: ${latest?.value ?? "?"} ${m.unit} (${m.latestStatus}) — trend: ${m.trend} (${m.changePercent > 0 ? "+" : ""}${m.changePercent.toFixed(1)}%) — ref: ${m.reference}`;
    });
    return `Reports analyzed: ${analyzedReports.length}\nDate range: ${analyzedReports.map((r) => fmt(r.date)).join(" → ")}\nTotal markers tracked: ${markerSummaries.length}\n\nMarker details:\n${lines.join("\n")}`;
  }, [markerSummaries, analyzedReports]);

  const allDataPointsForChat = useMemo(() => {
    return markerSummaries.flatMap((m) =>
      m.points.map((p) => ({
        date: p.rawDate,
        value: p.value,
        status: p.status,
        marker: m.marker,
        unit: m.unit,
        reference: m.reference,
      }))
    );
  }, [markerSummaries]);

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
  const handleMarkerSelect = async (marker: string) => {
    setSelectedMarker(marker);
    setActiveTab("detail");
    setTrendSummary("");
    if (!marker) return;

    const summary = markerSummaries.find((m) => m.marker === marker);
    if (!summary || summary.points.length < 2) return;

    setSummaryLoading(true);
    try {
      const res = await fetch("/api/trend-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          marker,
          unit: summary.unit,
          reference: summary.reference,
          dataPoints: summary.points.map((p) => ({
            date: p.rawDate,
            value: p.value,
            status: p.status,
          })),
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
    setActiveTab("overview");
    sessionStorage.removeItem("meridix-trends");
    setSlots([
      { id: uid(), file: null, date: "" },
      { id: uid(), file: null, date: "" },
    ]);
  };

  const hasResults = analyzedReports.length >= 2;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-light to-white dark:from-[#0B1424] dark:to-[#070B16]">
      <div className={`mx-auto px-4 sm:px-6 lg:px-8 pt-28 pb-20 ${hasResults ? "max-w-7xl" : "max-w-3xl"}`}>

        {/* Header */}
        <div className="text-center mb-10">
          <span className="chip text-amber-700 dark:text-amber-300 mb-5">
            {t("badge")}
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-amber-600 dark:text-amber-400 tracking-tight mb-3">
            {t("title")}
          </h1>
          <p className="text-ink-secondary text-lg max-w-xl mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
          <div className="mt-4 inline-flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-emerald-500">
              <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
            </svg>
            {t("privacy")}
          </div>
        </div>

        {/* ── How it works — shown only when no results yet ────── */}
        {!hasResults && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            {[
              {
                step: "1",
                icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-600 dark:text-amber-400">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                ),
                title: t("step1Title"),
                body: t("step1Desc"),
              },
              {
                step: "2",
                icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-600 dark:text-amber-400">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                ),
                title: t("step2Title"),
                body: t("step2Desc"),
              },
              {
                step: "3",
                icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-600 dark:text-amber-400">
                    <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                  </svg>
                ),
                title: t("step3Title"),
                body: t("step3Desc"),
              },
            ].map((item) => (
              <div key={item.step} className="bg-surface-raised rounded-2xl border border-surface-border px-5 py-4 flex gap-3">
                <div className="w-8 h-8 rounded-lg bg-amber-100 dark:bg-amber-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                  {item.icon}
                </div>
                <div>
                  <p className="text-sm font-bold text-ink mb-0.5">{item.title}</p>
                  <p className="text-xs text-ink-secondary leading-relaxed">{item.body}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Setup / Upload phase ─────────────────────────────── */}
        {!hasResults && (
          <div className="bg-surface-raised rounded-3xl shadow-xl shadow-ink/5 border border-surface-border p-6 sm:p-8 space-y-4">
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
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Main content — left 2 columns */}
            <div className="lg:col-span-2 space-y-6">
              {/* Reports summary bar */}
              <div className="bg-surface-raised rounded-2xl border border-surface-border px-5 py-4 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                  <span className="text-sm font-semibold text-ink">
                    {analyzedReports.length} reports analyzed
                  </span>
                  <span className="text-ink-tertiary text-xs">·</span>
                  <span className="text-xs text-ink-tertiary">
                    {analyzedReports.map((r) => fmt(r.date)).join(" → ")}
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

              {/* Stats cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-surface-raised rounded-xl border border-surface-border px-4 py-3">
                  <p className="text-2xl font-extrabold text-ink">{stats.total}</p>
                  <p className="text-xs text-ink-tertiary mt-0.5">Markers Tracked</p>
                </div>
                <div className="bg-emerald-50 rounded-xl border border-emerald-200 px-4 py-3">
                  <p className="text-2xl font-extrabold text-emerald-700">{stats.improving}</p>
                  <p className="text-xs text-emerald-600 mt-0.5">Improving</p>
                </div>
                <div className="bg-red-50 rounded-xl border border-red-200 px-4 py-3">
                  <p className="text-2xl font-extrabold text-red-700">{stats.worsening}</p>
                  <p className="text-xs text-red-600 mt-0.5">Need Attention</p>
                </div>
                <div className="bg-amber-50 rounded-xl border border-amber-200 px-4 py-3">
                  <p className="text-2xl font-extrabold text-amber-700">{stats.abnormal}</p>
                  <p className="text-xs text-amber-600 mt-0.5">Out of Range</p>
                </div>
              </div>

              {/* Tab navigation */}
              <div className="bg-surface-raised rounded-2xl border border-surface-border overflow-hidden">
                <div className="flex border-b border-surface-border">
                  {([
                    { key: "overview", label: "All Markers", icon: "M4 5a2 2 0 012-2h4.586A2 2 0 0112 3.586L15.414 7A2 2 0 0116 8.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" },
                    { key: "detail", label: "Detailed View", icon: "M2 11a1 1 0 011-1h2a1 1 0 011 1v5a1 1 0 01-1 1H3a1 1 0 01-1-1v-5zM8 7a1 1 0 011-1h2a1 1 0 011 1v9a1 1 0 01-1 1H9a1 1 0 01-1-1V7zM14 4a1 1 0 011-1h2a1 1 0 011 1v12a1 1 0 01-1 1h-2a1 1 0 01-1-1V4z" },
                    { key: "timeline", label: "Timeline", icon: "M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" },
                  ] as const).map((tab) => (
                    <button
                      key={tab.key}
                      onClick={() => setActiveTab(tab.key)}
                      className={`flex-1 py-3.5 text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                        activeTab === tab.key
                          ? "text-brand-blue border-b-2 border-brand-blue bg-brand-blue-light/30"
                          : "text-ink-tertiary hover:text-ink hover:bg-surface-raised/50"
                      }`}
                    >
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d={tab.icon} />
                      </svg>
                      {tab.label}
                    </button>
                  ))}
                </div>

                {/* ── Overview Tab ── */}
                {activeTab === "overview" && (
                  <div className="p-5">
                    {/* Category filter */}
                    <div className="flex flex-wrap gap-2 mb-5">
                      {categories.map((cat) => (
                        <button
                          key={cat}
                          onClick={() => setFilterCategory(cat)}
                          className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                            filterCategory === cat
                              ? "bg-brand-blue text-white shadow-sm"
                              : "bg-surface-raised text-ink-tertiary hover:text-ink hover:bg-surface-raised/80 border border-surface-border"
                          }`}
                        >
                          {cat}
                          {cat !== "All" && (
                            <span className="ml-1 opacity-70">
                              ({markerSummaries.filter((m) => m.category === cat).length})
                            </span>
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Marker cards grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {filteredSummaries.map((summary) => (
                        <button
                          key={summary.marker}
                          onClick={() => handleMarkerSelect(summary.marker)}
                          className={`text-left rounded-xl border p-4 transition-all hover:shadow-md hover:-translate-y-0.5 ${
                            selectedMarker === summary.marker
                              ? "border-brand-blue bg-brand-blue-light/20 shadow-sm"
                              : "border-surface-border bg-surface-raised hover:border-brand-blue/30"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <div className="min-w-0">
                              <p className="text-sm font-bold text-ink truncate">{summary.marker}</p>
                              <p className="text-[10px] text-ink-tertiary uppercase tracking-wider">{summary.category}</p>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              <TrendIcon trend={summary.trend} size="sm" />
                              <span className={`text-xs font-bold ${
                                summary.trend === "improving" ? "text-emerald-600" :
                                summary.trend === "worsening" ? "text-red-600" :
                                summary.trend === "fluctuating" ? "text-amber-600" :
                                "text-ink-tertiary"
                              }`}>
                                {summary.changePercent !== 0 && (
                                  <>{summary.changePercent > 0 ? "+" : ""}{summary.changePercent.toFixed(1)}%</>
                                )}
                              </span>
                            </div>
                          </div>

                          {/* Latest value */}
                          <div className="flex items-baseline gap-1.5 mb-2">
                            <span className={`text-lg font-extrabold ${
                              summary.latestStatus !== "normal" ? "text-red-500" : "text-emerald-600"
                            }`}>
                              {summary.points[summary.points.length - 1]?.value}
                            </span>
                            <span className="text-xs text-ink-tertiary">{summary.unit}</span>
                            <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                              summary.latestStatus === "high" ? "bg-red-100 text-red-700" :
                              summary.latestStatus === "low" ? "bg-amber-100 text-amber-700" :
                              "bg-emerald-100 text-emerald-700"
                            }`}>
                              {summary.latestStatus}
                            </span>
                          </div>

                          {/* Sparkline */}
                          {summary.points.length >= 2 && (
                            <Sparkline points={summary.points} trend={summary.trend} />
                          )}

                          {summary.points.length === 1 && (
                            <p className="text-[10px] text-ink-tertiary italic mt-1">Single data point</p>
                          )}
                        </button>
                      ))}
                    </div>

                    {filteredSummaries.length === 0 && (
                      <div className="text-center py-8">
                        <p className="text-sm text-ink-tertiary">No markers in this category.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Detail Tab ── */}
                {activeTab === "detail" && (
                  <div className="p-5 space-y-5">
                    {/* Marker selector */}
                    <div>
                      <label className="block text-xs font-bold text-ink-tertiary uppercase tracking-wider mb-2">
                        Select a lab value to track
                      </label>
                      <select
                        value={selectedMarker}
                        onChange={(e) => handleMarkerSelect(e.target.value)}
                        className="w-full px-4 py-3 rounded-xl border border-surface-border text-sm text-ink bg-surface-raised focus:outline-none focus:border-brand-blue focus:ring-2 focus:ring-brand-blue/10 transition-all appearance-none cursor-pointer"
                      >
                        <option value="">— Choose a marker —</option>
                        {allMarkers.map((m) => {
                          const summary = markerSummaries.find((s) => s.marker === m);
                          return (
                            <option key={m} value={m}>
                              {m}{summary?.unit ? ` (${summary.unit})` : ""} — {summary?.trend}
                            </option>
                          );
                        })}
                      </select>
                    </div>

                    {/* Chart */}
                    {selectedMarker && chartData.length > 0 && (
                      <div className="rounded-xl border border-surface-border overflow-hidden">
                        <div className="px-5 py-3.5 border-b border-surface-border bg-surface-raised flex items-center justify-between">
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
                          <ResponsiveContainer width="100%" height={280}>
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
                      <div className="rounded-xl border border-surface-border overflow-hidden">
                        <div className="px-5 py-3 border-b border-surface-border bg-surface-raised flex items-center gap-2">
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

                    {/* Data table for selected marker */}
                    {selectedMarker && chartData.length > 0 && (
                      <div className="rounded-xl border border-surface-border overflow-hidden">
                        <div className="px-5 py-3 border-b border-surface-border bg-surface-raised">
                          <span className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">Value History</span>
                        </div>
                        <div className="divide-y divide-surface-border/60">
                          {chartData.map((point, i) => (
                            <div key={i} className="px-5 py-3 flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
                                  point.status !== "normal" ? "bg-red-500" : "bg-emerald-500"
                                }`} />
                                <span className="text-sm text-ink-secondary">{point.displayDate}</span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={`text-sm font-bold ${
                                  point.status !== "normal" ? "text-red-600" : "text-ink"
                                }`}>
                                  {point.value} {point.unit}
                                </span>
                                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                                  point.status === "high" ? "bg-red-100 text-red-700" :
                                  point.status === "low" ? "bg-amber-100 text-amber-700" :
                                  "bg-emerald-100 text-emerald-700"
                                }`}>
                                  {point.status}
                                </span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {selectedMarker && chartData.length === 1 && (
                      <div className="p-4 rounded-xl bg-amber-50 border border-amber-100 text-sm text-amber-700">
                        Only one of your reports contains <strong>{selectedMarker}</strong>. Upload at least 2 reports that include this value to see a trend.
                      </div>
                    )}

                    {!selectedMarker && (
                      <div className="text-center py-10">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-8 h-8 text-ink-tertiary/40 mx-auto mb-3">
                          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
                        </svg>
                        <p className="text-sm text-ink-tertiary">Select a marker above to see its detailed trend chart.</p>
                        <p className="text-xs text-ink-tertiary mt-1">Or click any marker card in the Overview tab.</p>
                      </div>
                    )}
                  </div>
                )}

                {/* ── Timeline Tab ── */}
                {activeTab === "timeline" && (
                  <div className="p-5">
                    <div className="relative">
                      {/* Timeline line */}
                      <div className="absolute left-[18px] top-0 bottom-0 w-0.5 bg-surface-border" />

                      {/* Group by date */}
                      {Object.entries(
                        timelineData.reduce((acc, entry) => {
                          if (!acc[entry.date]) acc[entry.date] = [];
                          acc[entry.date].push(entry);
                          return acc;
                        }, {} as Record<string, typeof timelineData>)
                      ).map(([date, entries]) => (
                        <div key={date} className="relative pl-12 pb-6 last:pb-0">
                          {/* Date dot */}
                          <div className="absolute left-[10px] top-1 w-4 h-4 rounded-full bg-brand-blue border-4 border-white shadow-sm" />

                          <div className="bg-surface-raised/50 rounded-xl border border-surface-border p-4">
                            <p className="text-sm font-bold text-ink mb-3">{fmt(date)}</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                              {entries.map((entry, i) => (
                                <div
                                  key={i}
                                  className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-surface-raised border border-surface-border/60"
                                >
                                  <div className="flex items-center gap-2 min-w-0">
                                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${
                                      entry.status !== "normal" ? "bg-red-500" : "bg-emerald-500"
                                    }`} />
                                    <span className="text-xs text-ink truncate">{entry.marker}</span>
                                  </div>
                                  <span className={`text-xs font-bold flex-shrink-0 ${
                                    entry.status !== "normal" ? "text-red-600" : "text-ink"
                                  }`}>
                                    {entry.value} {entry.unit}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Markers that have no overlap warning */}
              {allMarkers.length === 0 && (
                <div className="p-5 rounded-2xl bg-amber-50 border border-amber-100">
                  <p className="text-sm font-semibold text-amber-800 mb-1">No shared markers found</p>
                  <p className="text-xs text-amber-700 leading-relaxed mb-3">
                    Your reports don&apos;t have overlapping lab values. Trends work best when reports are from the same test type.
                  </p>
                  <button
                    onClick={resetAll}
                    className="text-xs font-semibold text-amber-800 underline underline-offset-2 hover:text-amber-900"
                  >
                    Try different reports →
                  </button>
                </div>
              )}
            </div>

            {/* Chat sidebar — right column */}
            <div className="lg:col-span-1">
              <div className="lg:sticky lg:top-24">
                <TrendChatPanel
                  trendSnapshot={trendSnapshot}
                  allDataPoints={allDataPointsForChat}
                  language="en"
                />
              </div>
            </div>
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
