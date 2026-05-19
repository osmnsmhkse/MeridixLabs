"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslations } from "next-intl";

const PediatricChatPanel = dynamic(() => import("@/components/PediatricChatPanel"), {
  ssr: false,
});

// ── Types ────────────────────────────────────────────────────────────────────

type Tier = "simple" | "medium" | "expert";
type Stage = "idle" | "loading" | "result" | "error";
type AgeMode = "months" | "years";
type DecisionTier = "ER_NOW" | "ER_TODAY" | "CALL_PEDIATRICIAN" | "WATCH_AT_HOME";

interface ParsedResult {
  decisionTier: DecisionTier;
  decisionLine: string;
  whyThisAnswer: string;
  whatToDoNow: string[];
  warningSigns: string[];
  commonWorries: string;
  trustYourInstinct: string;
}

// ── Parsers ──────────────────────────────────────────────────────────────────

const SECTION_KEYS = [
  "DECISION_TIER",
  "DECISION_LINE",
  "WHY_THIS_ANSWER",
  "WHAT_TO_DO_NOW",
  "WARNING_SIGNS",
  "COMMON_WORRIES",
  "TRUST_YOUR_INSTINCT",
] as const;

function parseSections(text: string): Record<string, string> {
  const positions: { key: string; idx: number }[] = [];
  for (const key of SECTION_KEYS) {
    const re = new RegExp(`(^|\\n)${key}(?=\\s*\\n|\\s*$)`);
    const m = re.exec(text);
    if (m) positions.push({ key, idx: m.index + (m[1] ? 1 : 0) });
  }
  positions.sort((a, b) => a.idx - b.idx);
  const out: Record<string, string> = {};
  for (let i = 0; i < positions.length; i++) {
    const { key, idx } = positions[i];
    const start = idx + key.length;
    const end = positions[i + 1]?.idx ?? text.length;
    out[key] = text.slice(start, end).trim();
  }
  return out;
}

function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 0);
}

function parseDecisionTier(raw: string): DecisionTier {
  const upper = raw.toUpperCase();
  if (upper.includes("ER_NOW")) return "ER_NOW";
  if (upper.includes("ER_TODAY")) return "ER_TODAY";
  if (upper.includes("CALL_PEDIATRICIAN")) return "CALL_PEDIATRICIAN";
  if (upper.includes("WATCH_AT_HOME")) return "WATCH_AT_HOME";
  return "CALL_PEDIATRICIAN";
}

function parseResult(raw: string): ParsedResult {
  const s = parseSections(raw);
  return {
    decisionTier: parseDecisionTier(s["DECISION_TIER"] ?? ""),
    decisionLine: (s["DECISION_LINE"] ?? "").trim(),
    whyThisAnswer: (s["WHY_THIS_ANSWER"] ?? "").trim(),
    whatToDoNow: parseBullets(s["WHAT_TO_DO_NOW"] ?? ""),
    warningSigns: parseBullets(s["WARNING_SIGNS"] ?? ""),
    commonWorries: (s["COMMON_WORRIES"] ?? "").trim(),
    trustYourInstinct: (s["TRUST_YOUR_INSTINCT"] ?? "").trim(),
  };
}

// ── Decision config (the four tiers) ─────────────────────────────────────────

const DECISION_CONFIG: Record<
  DecisionTier,
  {
    labelKey:
      | "decisionErNow"
      | "decisionErToday"
      | "decisionCallPed"
      | "decisionWatchHome";
    bg: string;
    border: string;
    headerBg: string;
    accent: string;
    iconBg: string;
    dot: string;
    icon: React.ReactNode;
  }
> = {
  ER_NOW: {
    labelKey: "decisionErNow",
    bg: "bg-red-50 dark:bg-red-950/30",
    border: "border-red-300 dark:border-red-800",
    headerBg: "bg-gradient-to-r from-red-100/80 via-red-50/60 to-transparent dark:from-red-900/40 dark:via-red-950/30",
    accent: "text-red-700 dark:text-red-300",
    iconBg: "bg-red-500/10 dark:bg-red-500/20",
    dot: "bg-red-500",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 12 2.25 21.75 18H2.25Zm9.75-3.75v-3M12 17.25h.008v.008H12v-.008Z" />
      </svg>
    ),
  },
  ER_TODAY: {
    labelKey: "decisionErToday",
    bg: "bg-orange-50 dark:bg-orange-950/30",
    border: "border-orange-300 dark:border-orange-800",
    headerBg: "bg-gradient-to-r from-orange-100/80 via-orange-50/60 to-transparent dark:from-orange-900/40 dark:via-orange-950/30",
    accent: "text-orange-700 dark:text-orange-300",
    iconBg: "bg-orange-500/10 dark:bg-orange-500/20",
    dot: "bg-orange-500",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  CALL_PEDIATRICIAN: {
    labelKey: "decisionCallPed",
    bg: "bg-amber-50 dark:bg-amber-950/30",
    border: "border-amber-300 dark:border-amber-800",
    headerBg: "bg-gradient-to-r from-amber-100/80 via-amber-50/60 to-transparent dark:from-amber-900/40 dark:via-amber-950/30",
    accent: "text-amber-700 dark:text-amber-300",
    iconBg: "bg-amber-500/10 dark:bg-amber-500/20",
    dot: "bg-amber-500",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 0 0 2.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.105a2.25 2.25 0 0 0-2.276.659l-.97.97a14.94 14.94 0 0 1-6.586-6.586l.97-.97a2.25 2.25 0 0 0 .66-2.276L7.217 3.31A1.125 1.125 0 0 0 6.125 2.25H4.5A2.25 2.25 0 0 0 2.25 4.5v2.25Z" />
      </svg>
    ),
  },
  WATCH_AT_HOME: {
    labelKey: "decisionWatchHome",
    bg: "bg-emerald-50 dark:bg-emerald-950/30",
    border: "border-emerald-300 dark:border-emerald-800",
    headerBg: "bg-gradient-to-r from-emerald-100/80 via-emerald-50/60 to-transparent dark:from-emerald-900/40 dark:via-emerald-950/30",
    accent: "text-emerald-700 dark:text-emerald-300",
    iconBg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    dot: "bg-emerald-500",
    icon: (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-6 h-6">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955c.44-.439 1.152-.439 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
};

// ── Concern chips (multi-select) ─────────────────────────────────────────────

const CONCERN_OPTIONS = [
  { id: "fever", labelKey: "concernFever", apiLabel: "Fever" },
  { id: "cough", labelKey: "concernCough", apiLabel: "Cough or breathing trouble" },
  { id: "vomiting", labelKey: "concernVomiting", apiLabel: "Vomiting or diarrhea" },
  { id: "rash", labelKey: "concernRash", apiLabel: "Rash" },
  { id: "pain", labelKey: "concernPain", apiLabel: "Pain" },
  { id: "lethargy", labelKey: "concernLethargy", apiLabel: "Lethargy or behavior change" },
  { id: "crying", labelKey: "concernCrying", apiLabel: "Inconsolable crying or fussiness" },
  { id: "injury", labelKey: "concernInjury", apiLabel: "Injury" },
  { id: "other", labelKey: "concernOther", apiLabel: "Other" },
] as const;

type ConcernId = (typeof CONCERN_OPTIONS)[number]["id"];

// ── Duration chips (single-select) ───────────────────────────────────────────

const DURATION_OPTIONS = [
  { id: "<6h", labelKey: "durationLess6h", apiLabel: "Less than 6 hours" },
  { id: "6-24h", labelKey: "duration6to24h", apiLabel: "6 to 24 hours" },
  { id: "1-2d", labelKey: "duration1to2d", apiLabel: "1 to 2 days" },
  { id: "3-5d", labelKey: "duration3to5d", apiLabel: "3 to 5 days" },
  { id: ">5d", labelKey: "durationMore5d", apiLabel: "More than 5 days" },
] as const;

// ── Temperature methods ──────────────────────────────────────────────────────

const TEMP_METHODS = [
  { id: "rectal", labelKey: "tempMethodRectal", apiLabel: "rectal" },
  { id: "oral", labelKey: "tempMethodOral", apiLabel: "oral" },
  { id: "ear", labelKey: "tempMethodEar", apiLabel: "ear" },
  { id: "forehead", labelKey: "tempMethodForehead", apiLabel: "forehead" },
  { id: "armpit", labelKey: "tempMethodArmpit", apiLabel: "armpit" },
  { id: "unsure", labelKey: "tempMethodUnsure", apiLabel: "unsure" },
] as const;

// ── Tier toggle ──────────────────────────────────────────────────────────────

function TierToggle({ tier, onChange }: { tier: Tier; onChange: (t: Tier) => void }) {
  const t = useTranslations("Pediatric");
  const OPTIONS: { key: Tier; labelKey: "tierSimple" | "tierMedium" | "tierExpert"; activeClass: string }[] = [
    { key: "simple", labelKey: "tierSimple", activeClass: "text-emerald-700 dark:text-emerald-400 border-emerald-400 bg-emerald-500/5" },
    { key: "medium", labelKey: "tierMedium", activeClass: "text-rose-700 dark:text-rose-300 border-rose-400 bg-rose-500/5" },
    { key: "expert", labelKey: "tierExpert", activeClass: "text-purple-700 dark:text-purple-400 border-purple-400 bg-purple-500/5" },
  ];
  return (
    <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 overflow-hidden">
      <p className="px-4 py-2.5 text-[11px] font-bold text-ink-tertiary uppercase tracking-wider border-b border-surface-border bg-surface-raised">
        {t("tierTitle")}
      </p>
      <div className="flex">
        {OPTIONS.map((opt) => {
          const isActive = opt.key === tier;
          return (
            <button
              key={opt.key}
              type="button"
              onClick={() => onChange(opt.key)}
              className={`flex-1 px-3 py-3 text-sm font-semibold border-b-2 transition-all duration-200 ${
                isActive ? opt.activeClass : "text-ink-tertiary border-transparent hover:text-ink-secondary hover:bg-surface-raised"
              }`}
            >
              {t(opt.labelKey)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Segmented (two-option) toggle — reused for age mode, weight unit, temp unit
function SegmentedToggle<T extends string>({
  options,
  value,
  onChange,
  size = "md",
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
  size?: "sm" | "md";
}) {
  const sizeClass = size === "sm" ? "px-3 py-1.5 text-xs" : "px-4 py-2 text-sm";
  return (
    <div className="inline-flex p-1 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800">
      {options.map((opt) => {
        const isActive = opt.id === value;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`${sizeClass} font-semibold rounded-lg transition-all duration-150 ${
              isActive
                ? "bg-white dark:bg-slate-900 text-ink shadow-sm"
                : "text-ink-tertiary hover:text-ink-secondary"
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── Loading state ────────────────────────────────────────────────────────────

function LoadingState() {
  const t = useTranslations("Pediatric");
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDot((d) => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full border-2 border-rose-500/20 animate-ping absolute inset-0" style={{ animationDuration: "2s" }} />
        <div className="w-16 h-16 rounded-full border-2 border-rose-500/30 flex items-center justify-center relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-rose-500">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
          </svg>
        </div>
      </div>
      <p className="text-base font-semibold text-ink">
        {t("loadingMessage")}
        {".".repeat(dot)}
      </p>
      <p className="mt-2 text-xs text-ink-tertiary max-w-xs">{t("loadingPrivacy")}</p>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function PediatricPage() {
  const { lang } = useLanguage();
  const t = useTranslations("Pediatric");

  // Age
  const [ageMode, setAgeMode] = useState<AgeMode>("years");
  const [ageInput, setAgeInput] = useState<string>("");

  // Weight
  const [weight, setWeight] = useState<string>("");
  const [weightUnit, setWeightUnit] = useState<"kg" | "lb">("lb");

  // Concerns
  const [concerns, setConcerns] = useState<Set<ConcernId>>(new Set());
  const [concernDescription, setConcernDescription] = useState<string>("");

  // Temperature
  const [tempValue, setTempValue] = useState<string>("");
  const [tempUnit, setTempUnit] = useState<"F" | "C">("F");
  const [tempMethod, setTempMethod] = useState<string>("");

  // Duration
  const [duration, setDuration] = useState<string>("");

  // Other context
  const [otherContext, setOtherContext] = useState<string>("");

  // Depth + state machine
  const [tier, setTier] = useState<Tier>("medium");
  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [rawAnalysis, setRawAnalysis] = useState<string>("");
  const [submittedSummary, setSubmittedSummary] = useState<string>("");
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<"results" | "ask">("results");

  const resultRef = useRef<HTMLDivElement>(null);

  const toggleConcern = (id: ConcernId) => {
    setConcerns((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const showTempField = concerns.has("fever");

  const ageValid = useMemo(() => {
    const n = Number(ageInput);
    if (!ageInput || Number.isNaN(n) || n < 0) return false;
    if (ageMode === "months") return n >= 0 && n <= 36;
    return n > 0 && n <= 21;
  }, [ageInput, ageMode]);

  const canSubmit = ageValid && (concerns.size > 0 || concernDescription.trim().length > 0);

  async function submit() {
    if (!canSubmit) return;
    setStage("loading");
    setErrorMsg("");
    setResult(null);

    const ageNum = Number(ageInput);
    const concernLabels: string[] = Array.from(concerns)
      .map((id) => CONCERN_OPTIONS.find((c) => c.id === id)?.apiLabel)
      .filter((s): s is NonNullable<typeof s> => Boolean(s));
    const tempMethodLabel =
      TEMP_METHODS.find((m) => m.id === tempMethod)?.apiLabel ?? "";
    const durationApi = DURATION_OPTIONS.find((d) => d.id === duration)?.apiLabel ?? "";

    const payload = {
      ageMonths: ageMode === "months" ? ageNum : null,
      ageYears: ageMode === "years" ? ageNum : null,
      weight: weight ? `${weight} ${weightUnit}` : "",
      concerns: concernLabels,
      concernDescription,
      tempValue,
      tempUnit,
      tempMethod: tempMethodLabel,
      duration: durationApi,
      otherContext,
      tier,
      language: lang,
    };

    // Build a human-readable summary the chat can use for follow-up context
    const summaryLines: string[] = [];
    if (payload.ageMonths !== null) summaryLines.push(`Age: ${payload.ageMonths} months`);
    if (payload.ageYears !== null) summaryLines.push(`Age: ${payload.ageYears} years`);
    if (payload.weight) summaryLines.push(`Weight: ${payload.weight}`);
    if (payload.concerns.length) summaryLines.push(`Concerns: ${payload.concerns.join(", ")}`);
    if (payload.concernDescription) summaryLines.push(`Parent describes: ${payload.concernDescription}`);
    if (payload.tempValue) {
      summaryLines.push(
        `Temperature: ${payload.tempValue}°${payload.tempUnit}` +
          (payload.tempMethod ? ` (${payload.tempMethod})` : "")
      );
    }
    if (payload.duration) summaryLines.push(`Duration: ${payload.duration}`);
    if (payload.otherContext) summaryLines.push(`Other context: ${payload.otherContext}`);
    const summary = summaryLines.join("\n");

    try {
      const res = await fetch("/api/pediatric", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !data.text) {
        setErrorMsg(data.error ?? t("errorGeneric"));
        setStage("error");
        return;
      }
      setResult(parseResult(data.text));
      setRawAnalysis(data.text);
      setSubmittedSummary(summary);
      setStage("result");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setErrorMsg(t("errorGeneric"));
      setStage("error");
    }
  }

  const reset = () => {
    setStage("idle");
    setResult(null);
    setErrorMsg("");
  };

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-20 pb-24">
      {/* Hero */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 pt-10 pb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-rose-100 dark:bg-rose-900/30 rounded-full text-rose-700 dark:text-rose-300 text-xs font-semibold mb-5">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
          </svg>
          {t("badge")}
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight mb-3 leading-tight">
          {t("title")}
        </h1>
        <p className="text-lg text-ink-secondary leading-relaxed max-w-xl mx-auto">
          {t("subtitle")}
        </p>
      </section>

      {/* Form */}
      {(stage === "idle" || stage === "error") && (
        <section className="max-w-2xl mx-auto px-4 sm:px-6">
          {/* Tier toggle */}
          <div className="mb-4">
            <TierToggle tier={tier} onChange={setTier} />
          </div>

          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-surface-border shadow-sm p-5 sm:p-7 space-y-6">

            {stage === "error" && errorMsg && (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Age (REQUIRED) */}
            <div>
              <label className="block text-sm font-bold text-ink mb-2">
                {t("ageLabel")} <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-ink-tertiary mb-3">{t("ageHint")}</p>
              <div className="flex flex-wrap items-center gap-3">
                <SegmentedToggle<AgeMode>
                  options={[
                    { id: "months", label: t("ageUnitMonths") },
                    { id: "years", label: t("ageUnitYears") },
                  ]}
                  value={ageMode}
                  onChange={(v) => {
                    setAgeMode(v);
                    setAgeInput("");
                  }}
                />
                <div className="flex-1 min-w-[140px]">
                  <input
                    type="number"
                    inputMode="numeric"
                    min={ageMode === "months" ? 0 : 1}
                    max={ageMode === "months" ? 36 : 21}
                    value={ageInput}
                    onChange={(e) => setAgeInput(e.target.value)}
                    placeholder={ageMode === "months" ? t("agePlaceholderMonths") : t("agePlaceholderYears")}
                    className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink text-base placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400 transition"
                  />
                </div>
              </div>
            </div>

            {/* Weight (optional) */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                {t("weightLabel")} <span className="text-ink-tertiary text-xs font-normal">— {t("optional")}</span>
              </label>
              <p className="text-xs text-ink-tertiary mb-3">{t("weightHint")}</p>
              <div className="flex flex-wrap items-center gap-3">
                <SegmentedToggle<"kg" | "lb">
                  options={[
                    { id: "lb", label: "lb" },
                    { id: "kg", label: "kg" },
                  ]}
                  value={weightUnit}
                  onChange={setWeightUnit}
                />
                <div className="flex-1 min-w-[140px]">
                  <input
                    type="number"
                    inputMode="decimal"
                    value={weight}
                    onChange={(e) => setWeight(e.target.value)}
                    placeholder={t("weightPlaceholder")}
                    className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink text-base placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400 transition"
                  />
                </div>
              </div>
            </div>

            {/* Concerns (REQUIRED) */}
            <div>
              <label className="block text-sm font-bold text-ink mb-2">
                {t("concernsLabel")} <span className="text-rose-500">*</span>
              </label>
              <p className="text-xs text-ink-tertiary mb-3">{t("concernsHint")}</p>
              <div className="flex flex-wrap gap-2">
                {CONCERN_OPTIONS.map((opt) => {
                  const isActive = concerns.has(opt.id);
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => toggleConcern(opt.id)}
                      className={`min-h-[44px] px-4 py-2 rounded-full border text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-500/20"
                          : "bg-white dark:bg-slate-800 border-surface-border text-ink-secondary hover:border-rose-300 dark:hover:border-rose-700 hover:text-ink"
                      }`}
                    >
                      {t(opt.labelKey)}
                    </button>
                  );
                })}
              </div>
              <textarea
                value={concernDescription}
                onChange={(e) => setConcernDescription(e.target.value)}
                rows={2}
                placeholder={t("concernDescriptionPlaceholder")}
                className="mt-3 w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400 transition"
              />
            </div>

            {/* Temperature (conditional — fever selected) */}
            {showTempField && (
              <div className="rounded-2xl border border-rose-200 dark:border-rose-900/60 bg-rose-50/40 dark:bg-rose-950/20 p-4 sm:p-5">
                <label className="block text-sm font-bold text-ink mb-2">
                  {t("tempLabel")}
                </label>
                <p className="text-xs text-ink-tertiary mb-3">{t("tempHint")}</p>
                <div className="flex flex-wrap items-center gap-3 mb-3">
                  <SegmentedToggle<"F" | "C">
                    options={[
                      { id: "F", label: "°F" },
                      { id: "C", label: "°C" },
                    ]}
                    value={tempUnit}
                    onChange={setTempUnit}
                  />
                  <div className="flex-1 min-w-[140px]">
                    <input
                      type="number"
                      inputMode="decimal"
                      step="0.1"
                      value={tempValue}
                      onChange={(e) => setTempValue(e.target.value)}
                      placeholder={tempUnit === "F" ? "101.4" : "38.6"}
                      className="w-full px-4 py-3 rounded-xl border border-surface-border bg-white dark:bg-slate-800 text-ink text-base placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400 transition"
                    />
                  </div>
                </div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                  {t("tempMethodLabel")}
                </label>
                <select
                  value={tempMethod}
                  onChange={(e) => setTempMethod(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-surface-border bg-white dark:bg-slate-800 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400 transition"
                >
                  <option value="">{t("tempMethodSelect")}</option>
                  {TEMP_METHODS.map((m) => (
                    <option key={m.id} value={m.id}>
                      {t(m.labelKey)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Duration */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                {t("durationLabel")}
              </label>
              <div className="flex flex-wrap gap-2">
                {DURATION_OPTIONS.map((opt) => {
                  const isActive = duration === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setDuration(isActive ? "" : opt.id)}
                      className={`min-h-[44px] px-4 py-2 rounded-full border text-sm font-medium transition-all duration-150 ${
                        isActive
                          ? "bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-500/20"
                          : "bg-white dark:bg-slate-800 border-surface-border text-ink-secondary hover:border-rose-300 dark:hover:border-rose-700 hover:text-ink"
                      }`}
                    >
                      {t(opt.labelKey)}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Other context */}
            <div>
              <label className="block text-sm font-semibold text-ink mb-2">
                {t("otherContextLabel")} <span className="text-ink-tertiary text-xs font-normal">— {t("optional")}</span>
              </label>
              <textarea
                value={otherContext}
                onChange={(e) => setOtherContext(e.target.value)}
                rows={3}
                placeholder={t("otherContextPlaceholder")}
                className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-rose-400/40 focus:border-rose-400 transition"
              />
            </div>

            {/* Submit */}
            <button
              type="button"
              onClick={submit}
              disabled={!canSubmit}
              className="w-full min-h-[52px] py-4 bg-rose-600 hover:bg-rose-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-bold rounded-2xl text-base transition-all duration-200 shadow-md shadow-rose-500/20 hover:shadow-lg hover:shadow-rose-500/30 disabled:shadow-none flex items-center justify-center gap-2"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
              </svg>
              {t("submit")}
            </button>

            <p className="text-center text-xs text-ink-tertiary flex items-center justify-center gap-1.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              {t("reassurance")}
            </p>
          </div>
        </section>
      )}

      {/* Loading */}
      {stage === "loading" && (
        <section className="max-w-2xl mx-auto px-4 sm:px-6 mt-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-surface-border shadow-sm">
            <LoadingState />
          </div>
        </section>
      )}

      {/* Result */}
      {stage === "result" && result && (
        <div ref={resultRef} className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 scroll-mt-24">

          {/* Mobile tab switcher (hidden on xl+) */}
          <div className="flex gap-1 mb-5 xl:hidden bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {([
              { key: "results" as const, label: t("mobileTabResults"), icon: (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zM10 8a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 0110 8z" clipRule="evenodd" />
                </svg>
              )},
              { key: "ask" as const, label: t("mobileTabAsk"), icon: (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902 1.168.188 2.352.327 3.55.414.28.02.521.18.642.413l1.713 3.293a.75.75 0 001.33 0l1.713-3.293a.783.783 0 01.642-.413 41.102 41.102 0 003.55-.414c1.437-.232 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2zM6.75 6a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 2.5a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" clipRule="evenodd" />
                </svg>
              )},
            ]).map((tab) => (
              <button
                key={tab.key}
                onClick={() => setMobileTab(tab.key)}
                className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mobileTab === tab.key
                    ? "bg-white dark:bg-slate-900 text-ink shadow-sm"
                    : "text-ink-tertiary hover:text-ink-secondary"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* 2-column grid: results left, sticky chat right (xl+) */}
          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6 xl:items-start space-y-5 xl:space-y-0">

            {/* ─── Results column ─── */}
            <div className={`space-y-5 min-w-0 ${mobileTab === "ask" ? "hidden xl:block" : ""}`}>
              <DecisionCard result={result} />
              <WhySection text={result.whyThisAnswer} />
              <WhatToDoSection items={result.whatToDoNow} />
              <WarningSignsSection items={result.warningSigns} />
              <CommonWorriesSection text={result.commonWorries} />
              <TrustInstinctCard text={result.trustYourInstinct} />

              {/* Reset */}
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-surface-border hover:border-rose-300 dark:hover:border-rose-700 text-ink-secondary hover:text-ink text-sm font-semibold transition-all duration-150"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  {t("checkAnother")}
                </button>
              </div>

              {/* Calm disclaimer */}
              <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 mt-2">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  {t("disclaimer")}
                </p>
              </div>
            </div>

            {/* ─── Sticky chat sidebar (xl+) / tab-switched (mobile) ─── */}
            <aside className={`xl:sticky xl:top-24 min-w-0 scroll-mt-6 ${mobileTab !== "ask" ? "hidden xl:block" : ""}`}>
              <PediatricChatPanel
                inputSummary={submittedSummary}
                analysisSnapshot={rawAnalysis}
                tier={tier}
                language={lang}
              />
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Result sections ──────────────────────────────────────────────────────────

function DecisionCard({ result }: { result: ParsedResult }) {
  const t = useTranslations("Pediatric");
  const cfg = DECISION_CONFIG[result.decisionTier];
  return (
    <div className={`rounded-3xl border-2 shadow-lg overflow-hidden ${cfg.bg} ${cfg.border}`}>
      <div className={`px-5 py-4 border-b ${cfg.border} ${cfg.headerBg}`}>
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-2xl ${cfg.iconBg} ${cfg.accent} flex items-center justify-center flex-shrink-0`}>
            {cfg.icon}
          </div>
          <div className="min-w-0">
            <p className={`text-[10px] font-extrabold uppercase tracking-widest ${cfg.accent} opacity-80`}>
              {t("decisionEyebrow")}
            </p>
            <h2 className={`text-base font-extrabold tracking-tight ${cfg.accent}`}>
              {t(cfg.labelKey)}
            </h2>
          </div>
        </div>
      </div>
      <div className="px-5 sm:px-6 py-5">
        <p className="text-lg sm:text-xl font-bold text-ink leading-snug">
          {result.decisionLine}
        </p>
      </div>
    </div>
  );
}

function WhySection({ text }: { text: string }) {
  const t = useTranslations("Pediatric");
  if (!text) return null;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-surface-border">
        <h3 className="text-sm font-bold text-ink uppercase tracking-wider">{t("sectionWhy")}</h3>
      </div>
      <div className="px-5 py-4 space-y-3">
        {text.split("\n\n").filter(Boolean).map((para, i) => (
          <p key={i} className="text-sm text-ink-secondary leading-relaxed">{para}</p>
        ))}
      </div>
    </div>
  );
}

function WhatToDoSection({ items }: { items: string[] }) {
  const t = useTranslations("Pediatric");
  if (items.length === 0) return null;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-teal-200 dark:border-teal-800/60 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-teal-100 dark:border-teal-900/40 bg-teal-50/60 dark:bg-teal-950/20 flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-teal-600 dark:text-teal-400">
            <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
          </svg>
        </div>
        <h3 className="text-sm font-bold text-ink uppercase tracking-wider">{t("sectionWhatToDo")}</h3>
      </div>
      <ul className="px-5 py-4 space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-ink-secondary leading-relaxed">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mt-0.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-teal-600 dark:text-teal-400">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function WarningSignsSection({ items }: { items: string[] }) {
  const t = useTranslations("Pediatric");
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-900 border-2 border-red-300 dark:border-red-800/60 shadow-lg shadow-red-500/5 overflow-hidden">
      <div className="px-5 py-4 bg-gradient-to-r from-red-50/80 via-red-50/40 to-transparent dark:from-red-950/30 dark:via-red-950/15 border-b border-red-200/60 dark:border-red-800/50 flex items-center gap-2.5">
        <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-600 dark:text-red-400">
            <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="text-sm font-extrabold text-ink tracking-tight uppercase">{t("sectionWarning")}</h3>
          <p className="text-[11px] text-ink-tertiary mt-0.5">{t("sectionWarningDesc")}</p>
        </div>
      </div>
      <ul className="px-5 py-4 space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-ink-secondary leading-relaxed">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495z" clipRule="evenodd" />
            </svg>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}

function CommonWorriesSection({ text }: { text: string }) {
  const t = useTranslations("Pediatric");
  if (!text) return null;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-surface-border bg-surface-raised">
        <h3 className="text-sm font-bold text-ink uppercase tracking-wider">{t("sectionWorries")}</h3>
        <p className="text-[11px] text-ink-tertiary mt-0.5">{t("sectionWorriesDesc")}</p>
      </div>
      <div className="px-5 py-4 space-y-3">
        {text.split("\n\n").filter(Boolean).map((para, i) => (
          <p key={i} className="text-sm text-ink-secondary leading-relaxed">{para}</p>
        ))}
      </div>
    </div>
  );
}

function TrustInstinctCard({ text }: { text: string }) {
  const t = useTranslations("Pediatric");
  if (!text) return null;
  return (
    <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800/60 bg-emerald-50/60 dark:bg-emerald-950/20 p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-600 dark:text-emerald-400">
            <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
          </svg>
        </div>
        <div className="min-w-0">
          <h3 className="text-xs font-bold text-emerald-700 dark:text-emerald-300 uppercase tracking-wider mb-1">
            {t("sectionTrustInstinct")}
          </h3>
          <p className="text-sm text-ink-secondary leading-relaxed italic">{text}</p>
        </div>
      </div>
    </div>
  );
}

