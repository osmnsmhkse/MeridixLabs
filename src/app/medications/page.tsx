"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import dynamic from "next/dynamic";
import WordReveal from "@/components/WordReveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslations } from "next-intl";
import type { MedicationAnalysis } from "@/components/MedicationChatPanel";
import { useToolContext } from "@/components/ToolChatProvider";

const MedicationChatPanel = dynamic(() => import("@/components/MedicationChatPanel"), {
  ssr: false,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type Tier = "simple" | "medium" | "expert";
type Stage = "idle" | "loading" | "result" | "error";
type ErrorCode = "NO_INPUT" | "WRONG_FILE_TYPE" | "FILE_TOO_LARGE" | "NO_MEDICATIONS" | "SERVER_ERROR" | "NETWORK_ERROR";

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const LAB_ANALYSIS_KEY = "meridix_anon_analysis_v1";

// ── Severity config (mirrors Lab Analyzer's high/low/normal palette) ──

const SEVERITY_CONFIG: Record<
  "major" | "moderate" | "minor",
  { bg: string; border: string; chip: string; iconColor: string; valueColor: string; iconBg: string; label: string }
> = {
  major: {
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-200 dark:border-red-800",
    chip: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    iconColor: "text-red-600 dark:text-red-400",
    valueColor: "text-red-700 dark:text-red-300",
    iconBg: "bg-red-100 dark:bg-red-900/40",
    label: "major",
  },
  moderate: {
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    iconColor: "text-amber-600 dark:text-amber-400",
    valueColor: "text-amber-700 dark:text-amber-300",
    iconBg: "bg-amber-100 dark:bg-amber-900/40",
    label: "moderate",
  },
  minor: {
    bg: "bg-sky-50 dark:bg-sky-900/20",
    border: "border-sky-200 dark:border-sky-800",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    iconColor: "text-sky-600 dark:text-sky-400",
    valueColor: "text-sky-700 dark:text-sky-300",
    iconBg: "bg-sky-100 dark:bg-sky-900/40",
    label: "minor",
  },
};

// ── Main page ─────────────────────────────────────────────────────────────────

export default function MedicationsPage() {
  const { lang } = useLanguage();
  const t = useTranslations("Medications");

  const [stage, setStage] = useState<Stage>("idle");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [context, setContext] = useState("");
  const [contextOpen, setContextOpen] = useState(false);
  const [hasRecentLabAnalysis, setHasRecentLabAnalysis] = useState(false);

  const [result, setResult] = useState<MedicationAnalysis | null>(null);
  useToolContext(result ? JSON.stringify(result) : null);
  const [activeTier, setActiveTier] = useState<Tier>("simple");
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [mobileTab, setMobileTab] = useState<"results" | "ask">("results");

  const resultRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Detect a previous Lab Analyzer session in localStorage so we can surface
  // the lab-context banner. Anonymous-only — signed-in users see the same
  // banner because the spec just says "if they've previously used the Lab Analyzer".
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LAB_ANALYSIS_KEY);
      if (raw) setHasRecentLabAnalysis(true);
    } catch {
      /* ignore */
    }
  }, []);

  const submit = useCallback(async () => {
    const hasText = text.trim().length > 0;
    const hasFile = !!file;
    if (!hasText && !hasFile) {
      setErrorCode("NO_INPUT");
      setErrorMessage(t("errorNoInput"));
      setStage("error");
      return;
    }

    setStage("loading");
    setResult(null);
    setErrorCode(null);
    setErrorMessage("");

    const formData = new FormData();
    if (hasText) formData.append("text", text.trim());
    if (hasFile && file) formData.append("file", file);
    if (context.trim()) formData.append("context", context.trim());
    formData.append("language", lang);

    try {
      const res = await fetch("/api/medications", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = (json.errorCode as ErrorCode) ?? "SERVER_ERROR";
        setErrorCode(code);
        setErrorMessage(json.error ?? t("errorServer"));
        setStage("error");
        return;
      }
      setResult(json.data as MedicationAnalysis);
      setActiveTier("simple");
      setStage("result");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setErrorCode("NETWORK_ERROR");
      setErrorMessage(t("errorNetwork"));
      setStage("error");
    }
  }, [text, file, context, lang, t]);

  const reset = () => {
    setStage("idle");
    setResult(null);
    setErrorCode(null);
    setErrorMessage("");
    setMobileTab("results");
  };

  const handleFile = (f: File) => {
    if (!ALLOWED_FILE_TYPES.includes(f.type)) {
      setErrorCode("WRONG_FILE_TYPE");
      setErrorMessage(t("errorWrongFileType"));
      setStage("error");
      return;
    }
    if (f.size > MAX_FILE_SIZE) {
      const fileSizeMB = (f.size / (1024 * 1024)).toFixed(1);
      setErrorCode("FILE_TOO_LARGE");
      setErrorMessage(t("errorFileTooLarge").replace("{size}", fileSizeMB));
      setStage("error");
      return;
    }
    setFile(f);
    setErrorCode(null);
    setErrorMessage("");
  };

  const showInput = stage === "idle" || stage === "error";

  return (
    <div className="glass-tool min-h-screen pt-20 pb-24">
      {/* ── Hero ────────────────────────────────────────────────────── */}
      {(showInput || stage === "loading") && (
        <section className="relative isolate overflow-hidden pt-12 pb-8 text-center">
          <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
            <div className="chip text-ink-secondary mb-6">
              <span className="kicker-mono">{t("badge")}</span>
            </div>
            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-ink tracking-tightest leading-[1.03] mb-4">
              <WordReveal text={t("title")} base={0.05} />
            </h1>
            <p className="text-lg text-ink-secondary leading-relaxed max-w-xl mx-auto text-pretty">
              {t("subtitle")}
            </p>
          </div>
        </section>
      )}

      {/* ── Input card ──────────────────────────────────────────────── */}
      {showInput && (
        <section className="max-w-2xl mx-auto px-4 sm:px-6">
          <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm p-6 sm:p-7">
            {/* Error banner */}
            {stage === "error" && errorMessage && (
              <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                {errorMessage}
              </div>
            )}

            {/* Text input — primary */}
            <label htmlFor="med-text" className="block text-sm font-semibold text-ink mb-2">
              {t("inputLabelType")}
            </label>
            <textarea
              id="med-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={5}
              placeholder={t("placeholderType")}
              className="w-full px-4 py-3 rounded-xl border border-surface-border bg-slate-50 dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition"
            />

            {/* "Or" divider */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px bg-surface-border" />
              <span className="text-[11px] font-bold text-ink-tertiary uppercase tracking-wider">{t("or")}</span>
              <div className="flex-1 h-px bg-surface-border" />
            </div>

            {/* File upload — secondary */}
            <label className="block text-sm font-semibold text-ink mb-2">
              {t("inputLabelUpload")}
            </label>
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) handleFile(f);
              }}
            />
            {file ? (
              <div className="flex items-center gap-3 p-4 rounded-xl border border-surface-border bg-surface-raised">
                <div className="w-10 h-10 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-brand-blue">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-ink truncate">{file.name}</p>
                  <p className="text-xs text-ink-tertiary">{(file.size / 1024).toFixed(0)} KB</p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setFile(null);
                    if (inputRef.current) inputRef.current.value = "";
                  }}
                  className="text-ink-tertiary hover:text-ink-secondary p-1.5 rounded-lg hover:bg-surface-raised"
                  aria-label={t("removeFile")}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => inputRef.current?.click()}
                className="w-full flex items-center justify-center gap-2.5 px-4 py-3 rounded-xl border border-dashed border-surface-border hover:border-brand-blue/50 transition text-sm text-ink-secondary"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-ink-tertiary">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                <span>{t("uploadPrompt")}</span>
                <span className="text-[11px] text-ink-tertiary">· JPG, PNG, PDF · ≤10MB</span>
              </button>
            )}

            {/* Collapsible context */}
            <button
              type="button"
              onClick={() => setContextOpen(!contextOpen)}
              className="mt-5 flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${contextOpen ? "rotate-90" : ""}`}>
                <path
                  fillRule="evenodd"
                  d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z"
                  clipRule="evenodd"
                />
              </svg>
              {t("contextToggle")}
            </button>

            {contextOpen && (
              <div className="mt-3">
                {hasRecentLabAnalysis && (
                  <div className="mb-3 flex items-start gap-2.5 p-3 rounded-xl bg-brand-blue-light dark:bg-brand-blue/10 border border-brand-blue/30 text-xs leading-relaxed">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-brand-blue flex-shrink-0 mt-0.5">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path
                        fillRule="evenodd"
                        d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                        clipRule="evenodd"
                      />
                    </svg>
                    <span className="text-brand-blue-dark dark:text-brand-blue-light">
                      {t("labCrossRefBanner")}
                    </span>
                  </div>
                )}
                <textarea
                  value={context}
                  onChange={(e) => setContext(e.target.value)}
                  rows={3}
                  placeholder={t("contextPlaceholder")}
                  className="w-full px-3 py-2.5 rounded-xl border border-surface-border bg-slate-50 dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-blue/40 transition"
                />
              </div>
            )}

            {/* Submit */}
            <button
              onClick={submit}
              className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-3 bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold rounded-xl text-sm transition-all duration-200"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path
                  fillRule="evenodd"
                  d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z"
                  clipRule="evenodd"
                />
              </svg>
              {t("submit")}
            </button>

            <p className="mt-3 text-center text-xs text-ink-tertiary">
              {t("reassurance")}
            </p>
          </div>
        </section>
      )}

      {/* ── Loading skeleton ─────────────────────────────────────────── */}
      {stage === "loading" && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-10 space-y-5">
          <div className="flex items-center gap-3 px-5 py-4 rounded-2xl bg-surface-raised border border-surface-border">
            <svg className="animate-spin w-5 h-5 text-brand-blue" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
            </svg>
            <p className="text-sm font-semibold text-ink">{t("loadingMessage")}</p>
          </div>
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border p-5 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-4/5" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-3/5" />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Result ──────────────────────────────────────────────────── */}
      {stage === "result" && result && (
        <div ref={resultRef} className="max-w-5xl mx-auto px-4 sm:px-6 mt-10">
          {/* Mobile tab switcher */}
          <div className="flex gap-1 mb-5 xl:hidden bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {([
              {
                key: "results" as const,
                label: t("mobileTabResults"),
                icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M4.5 2A1.5 1.5 0 003 3.5v13A1.5 1.5 0 004.5 18h11a1.5 1.5 0 001.5-1.5V7.621a1.5 1.5 0 00-.44-1.06l-4.12-4.122A1.5 1.5 0 0011.378 2H4.5zM10 8a.75.75 0 01.75.75v1.5h1.5a.75.75 0 010 1.5h-1.5v1.5a.75.75 0 01-1.5 0v-1.5h-1.5a.75.75 0 010-1.5h1.5v-1.5A.75.75 0 0110 8z" clipRule="evenodd" />
                  </svg>
                ),
              },
              {
                key: "ask" as const,
                label: t("mobileTabAsk"),
                icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M10 2c-2.236 0-4.43.18-6.57.524C1.993 2.755 1 4.014 1 5.426v5.148c0 1.413.993 2.67 2.43 2.902 1.168.188 2.352.327 3.55.414.28.02.521.18.642.413l1.713 3.293a.75.75 0 001.33 0l1.713-3.293a.783.783 0 01.642-.413 41.102 41.102 0 003.55-.414c1.437-.232 2.43-1.49 2.43-2.902V5.426c0-1.413-.993-2.67-2.43-2.902A41.289 41.289 0 0010 2zM6.75 6a.75.75 0 000 1.5h6.5a.75.75 0 000-1.5h-6.5zm0 2.5a.75.75 0 000 1.5h3.5a.75.75 0 000-1.5h-3.5z" clipRule="evenodd" />
                  </svg>
                ),
              },
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

          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6 xl:items-start space-y-5 xl:space-y-0">
            {/* ─── Results column ─── */}
            <div className={`space-y-5 min-w-0 ${mobileTab === "ask" ? "hidden xl:block" : ""}`}>
              <ParsedMedicationsCard parsed={result.parsed_medications ?? []} uncertain={result.uncertain_items ?? []} />

              <DepthToggle activeTier={activeTier} onChange={setActiveTier} />

              {/* SECTION C — red flags FIRST (most safety-critical, surfaced early) */}
              {result.section_c_red_flags && result.section_c_red_flags.length > 0 && (
                <RedFlagsCard items={result.section_c_red_flags} />
              )}

              {/* SECTION A — medications */}
              {result.section_a_medications && result.section_a_medications.length > 0 && (
                <MedicationsSection meds={result.section_a_medications} tier={activeTier} />
              )}

              {/* SECTION B — interactions */}
              <InteractionsSection
                interactions={result.section_b_interactions ?? []}
                clear={result.section_b_clear ?? false}
                tier={activeTier}
              />

              {/* SECTION E — lab context */}
              {result.section_e_lab_context && (
                <LabContextCard text={result.section_e_lab_context[activeTier]} />
              )}

              {/* SECTION D — questions */}
              {result.section_d_questions && result.section_d_questions.length > 0 && (
                <QuestionsCard questions={result.section_d_questions} />
              )}

              {/* Reset */}
              <div className="text-center pt-2">
                <button
                  onClick={reset}
                  className="text-sm text-ink-tertiary hover:text-ink transition-colors underline underline-offset-2"
                >
                  {t("checkAnother")}
                </button>
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5">
                  <path
                    fillRule="evenodd"
                    d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                  {t("disclaimer")}
                </p>
              </div>
            </div>

            {/* ─── Sticky chat sidebar ─── */}
            <aside className={`xl:sticky xl:top-24 min-w-0 scroll-mt-6 ${mobileTab !== "ask" ? "hidden xl:block" : ""}`}>
              <MedicationChatPanel result={result} tier={activeTier} language={lang} />
            </aside>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function ParsedMedicationsCard({
  parsed,
  uncertain,
}: {
  parsed: { name: string; dose?: string; frequency?: string; raw_input?: string }[];
  uncertain: string[];
}) {
  const t = useTranslations("Medications");
  if (parsed.length === 0 && uncertain.length === 0) return null;
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border">
        <h2 className="font-bold text-ink text-base">{t("parsedTitle")}</h2>
        <p className="text-xs text-ink-tertiary mt-0.5">{t("parsedDesc")}</p>
      </div>
      <div className="px-5 py-4">
        {parsed.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {parsed.map((m, i) => (
              <span
                key={i}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-raised border border-surface-border text-sm"
              >
                <span className="font-semibold text-ink">{m.name}</span>
                {m.dose && <span className="text-ink-secondary">· {m.dose}</span>}
                {m.frequency && <span className="text-ink-tertiary text-xs">· {m.frequency}</span>}
              </span>
            ))}
          </div>
        )}
        {uncertain.length > 0 && (
          <div className="mt-3 p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
            <p className="text-xs font-semibold text-amber-800 dark:text-amber-300 mb-1.5">
              {t("uncertainTitle")}
            </p>
            <p className="text-xs text-amber-700 dark:text-amber-400">{uncertain.join(" · ")}</p>
          </div>
        )}
      </div>
    </div>
  );
}

function DepthToggle({ activeTier, onChange }: { activeTier: Tier; onChange: (t: Tier) => void }) {
  const t = useTranslations("Medications");
  const tiers: { key: Tier; label: string; active: string }[] = [
    { key: "simple", label: t("tierSimple"), active: "text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5" },
    { key: "medium", label: t("tierMedium"), active: "text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5" },
    { key: "expert", label: t("tierExpert"), active: "text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5" },
  ];
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
      <div className="border-b border-surface-border px-2 sm:px-5 pt-2 bg-surface-raised">
        <div className="flex">
          {tiers.map((tier) => {
            const isActive = tier.key === activeTier;
            return (
              <button
                key={tier.key}
                onClick={() => onChange(tier.key)}
                className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-t-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                  isActive ? tier.active : "text-ink-tertiary hover:text-ink-secondary hover:bg-surface-border/40"
                }`}
              >
                {tier.label}
              </button>
            );
          })}
        </div>
      </div>
      <div className="px-5 py-3 text-xs text-ink-tertiary">
        {t("depthHint")}
      </div>
    </div>
  );
}

function RedFlagsCard({ items }: { items: { medication: string; symptoms: string[]; action: string }[] }) {
  const t = useTranslations("Medications");
  return (
    <div className="rounded-2xl border-2 border-red-300 dark:border-red-800 bg-red-50/70 dark:bg-red-950/30 overflow-hidden shadow-sm">
      <div className="px-5 py-4 border-b border-red-200 dark:border-red-800 bg-red-100/50 dark:bg-red-900/30 flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/50 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-600 dark:text-red-400">
            <path
              fillRule="evenodd"
              d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
              clipRule="evenodd"
            />
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
            {t("redFlagsKicker")}
          </p>
          <h2 className="text-base font-extrabold text-red-900 dark:text-red-200 leading-tight">
            {t("redFlagsTitle")}
          </h2>
        </div>
      </div>
      <div className="divide-y divide-red-200/70 dark:divide-red-800/60">
        {items.map((item, i) => (
          <div key={i} className="px-5 py-4">
            <p className="text-sm font-bold text-red-900 dark:text-red-200 mb-2">{item.medication}</p>
            <ul className="space-y-1.5 mb-3">
              {item.symptoms.map((s, j) => (
                <li key={j} className="flex items-start gap-2 text-sm text-red-900 dark:text-red-200">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 mt-1 flex-shrink-0 text-red-500">
                    <path fillRule="evenodd" d="M9 2a1 1 0 012 0v6a1 1 0 11-2 0V2zm1 13a1.5 1.5 0 100-3 1.5 1.5 0 000 3z" clipRule="evenodd" />
                  </svg>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
            <div className="rounded-lg bg-white dark:bg-slate-900 border border-red-200 dark:border-red-800 px-3 py-2 text-xs text-red-800 dark:text-red-300 leading-relaxed">
              <span className="font-semibold">{t("redFlagsActionLabel")} </span>
              {item.action}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MedicationsSection({
  meds,
  tier,
}: {
  meds: Array<{
    name: string;
    purpose: string;
    how_it_works: { simple: string; medium: string; expert: string };
    dosing_context: { simple: string; medium: string; expert: string };
    key_side_effects: string[];
    avoid: string[];
  }>;
  tier: Tier;
}) {
  const t = useTranslations("Medications");
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-0.5">
          {t("sectionAKicker")}
        </p>
        <h2 className="font-bold text-ink text-base">{t("sectionATitle")}</h2>
        <p className="text-xs text-ink-tertiary mt-0.5">{t("sectionADesc")}</p>
      </div>
      <div className="divide-y divide-surface-border">
        {meds.map((m, i) => (
          <div key={i} className="px-5 py-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="w-9 h-9 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-sm font-extrabold text-brand-blue">{i + 1}</span>
              </div>
              <div className="min-w-0">
                <h3 className="text-base font-bold text-ink leading-tight">{m.name}</h3>
                <p className="text-sm text-ink-secondary mt-1 leading-relaxed">{m.purpose}</p>
              </div>
            </div>

            <div className="space-y-3 ml-12">
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-1">
                  {t("howItWorksLabel")}
                </p>
                <p className="text-sm text-ink-secondary leading-relaxed">{m.how_it_works[tier]}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-1">
                  {t("dosingContextLabel")}
                </p>
                <p className="text-sm text-ink-secondary leading-relaxed">{m.dosing_context[tier]}</p>
              </div>

              {m.key_side_effects.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-1.5">
                    {t("sideEffectsLabel")}
                  </p>
                  <ul className="space-y-1.5">
                    {m.key_side_effects.map((se, j) => (
                      <li key={j} className="flex items-start gap-2 text-sm text-ink-secondary leading-relaxed">
                        <span className="w-1 h-1 rounded-full bg-ink-tertiary mt-2 flex-shrink-0" />
                        <span>{se}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {m.avoid.length > 0 && (
                <div className="rounded-xl bg-amber-50 dark:bg-amber-900/15 border border-amber-100 dark:border-amber-800/60 px-3 py-2.5">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700 dark:text-amber-400 mb-1.5">
                    {t("avoidLabel")}
                  </p>
                  <ul className="space-y-1">
                    {m.avoid.map((a, j) => (
                      <li key={j} className="text-sm text-amber-900 dark:text-amber-200/90 leading-relaxed flex items-start gap-1.5">
                        <span>•</span>
                        <span>{a}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function InteractionsSection({
  interactions,
  clear,
  tier,
}: {
  interactions: Array<{
    between: [string, string];
    kind: "drug-drug" | "drug-food" | "drug-supplement";
    description: { simple: string; medium: string; expert: string };
    severity: "minor" | "moderate" | "major";
  }>;
  clear: boolean;
  tier: Tier;
}) {
  const t = useTranslations("Medications");

  if (clear || interactions.length === 0) {
    return (
      <div className="bg-emerald-50 dark:bg-emerald-900/20 rounded-2xl border border-emerald-200 dark:border-emerald-800 px-5 py-4 flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-600 dark:text-emerald-400">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
            {t("sectionBKicker")}
          </p>
          <h2 className="text-base font-bold text-emerald-900 dark:text-emerald-200 leading-tight">
            {t("interactionsClearTitle")}
          </h2>
          <p className="text-sm text-emerald-900/90 dark:text-emerald-200/90 leading-relaxed mt-1">
            {t("interactionsClearDesc")}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border">
        <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-0.5">
          {t("sectionBKicker")}
        </p>
        <h2 className="font-bold text-ink text-base">{t("sectionBTitle")}</h2>
        <p className="text-xs text-ink-tertiary mt-0.5">{t("sectionBDesc")}</p>
      </div>
      <div className="divide-y divide-surface-border">
        {interactions.map((ix, i) => {
          const cfg = SEVERITY_CONFIG[ix.severity];
          const kindLabel =
            ix.kind === "drug-drug" ? t("kindDrugDrug") : ix.kind === "drug-food" ? t("kindDrugFood") : t("kindDrugSupplement");
          return (
            <div key={i} className={`px-5 py-4 ${cfg.bg}`}>
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold uppercase tracking-wider ${cfg.chip}`}>
                    {t(`severity${ix.severity.charAt(0).toUpperCase() + ix.severity.slice(1)}` as `severityMinor` | `severityModerate` | `severityMajor`)}
                  </span>
                  <span className="text-[11px] text-ink-tertiary">{kindLabel}</span>
                </div>
              </div>
              <p className={`text-sm font-bold ${cfg.valueColor} mb-1.5`}>
                {ix.between[0]} <span className="text-ink-tertiary font-normal">↔</span> {ix.between[1]}
              </p>
              <p className="text-sm text-ink-secondary leading-relaxed">{ix.description[tier]}</p>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function LabContextCard({ text }: { text: string }) {
  const t = useTranslations("Medications");
  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-brand-blue/30 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-brand-blue/20 bg-brand-blue-light/50 dark:bg-brand-blue/10">
        <p className="text-[10px] font-bold uppercase tracking-wider text-brand-blue mb-0.5">
          {t("sectionEKicker")}
        </p>
        <h2 className="font-bold text-ink text-base">{t("sectionETitle")}</h2>
      </div>
      <div className="px-5 py-4">
        <p className="text-sm text-ink-secondary leading-relaxed">{text}</p>
      </div>
    </div>
  );
}

function QuestionsCard({ questions }: { questions: string[] }) {
  const t = useTranslations("Medications");
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const [copied, setCopied] = useState(false);
  const toggle = (i: number) => setChecked((p) => ({ ...p, [i]: !p[i] }));
  const allText = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");

  const copy = () => {
    navigator.clipboard.writeText(allText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-surface-border flex items-start justify-between gap-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-ink-tertiary mb-0.5">
            {t("sectionDKicker")}
          </p>
          <h2 className="font-bold text-ink text-base">{t("sectionDTitle")}</h2>
          <p className="text-xs text-ink-tertiary mt-0.5">{t("sectionDDesc")}</p>
        </div>
        <button
          onClick={copy}
          className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs font-semibold text-ink-secondary hover:text-ink hover:border-ink/25 transition-all"
        >
          {copied ? (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-emerald-500">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t("copied")}
            </>
          ) : (
            <>
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-3.5 h-3.5">
                <rect x="7" y="7" width="10" height="10" rx="1.5" />
                <path d="M3 13V4a1 1 0 011-1h9" strokeLinecap="round" />
              </svg>
              {t("copyAll")}
            </>
          )}
        </button>
      </div>
      <div className="px-5 py-4">
        <ol className="space-y-3">
          {questions.map((q, i) => (
            <li key={i} className="flex items-start gap-3">
              <button
                onClick={() => toggle(i)}
                className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-all duration-150 ${
                  checked[i]
                    ? "bg-brand-blue border-brand-blue"
                    : "border-surface-border hover:border-brand-blue"
                }`}
                aria-label={`Mark question ${i + 1} as asked`}
              >
                {checked[i] && (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
              <span className={`text-sm leading-relaxed transition-colors ${checked[i] ? "text-ink-tertiary line-through" : "text-ink-secondary"}`}>
                {q}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
