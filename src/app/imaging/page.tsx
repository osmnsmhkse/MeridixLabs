"use client";

// Imaging Report Explainer (/imaging)
// ───────────────────────────────────────────────────────────────────────────
// Standalone, focused tool that uploads a written radiology / pathology
// report (PDF or image) and returns a plain-English explanation at three
// depth tiers (Simple / Medium / Expert). Powered by /api/analyze with
// mode=radiology — the same endpoint that powers the Lab Analyzer's
// radiology toggle, but exposed here as its own dedicated experience.

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import WordReveal from "@/components/WordReveal";
import { useTranslations } from "next-intl";
import { useUser } from "@clerk/nextjs";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
import LabChatPanel from "@/components/LabChatPanel";
import NextStepBar from "@/components/NextStepBar";
import { useToolContext } from "@/components/ToolChatProvider";
import { track } from "@/lib/track";

const AUTH_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// ── Types ───────────────────────────────────────────────────────────────────

type Tier = "simple" | "medium" | "expert";
type ErrorCode =
  | "FILE_TOO_LARGE"
  | "WRONG_FILE_TYPE"
  | "NO_LAB_VALUES"
  | "NON_MEDICAL"
  | "NETWORK_ERROR"
  | "SERVER_ERROR";

type OverallStatus = "normal" | "amber" | "red";
type UrgencyLevel = "routine" | "soon" | "weeks";

interface AnalysisFlag {
  marker: string;
  value: string;
  unit: string;
  reference: string;
  status: "high" | "low" | "normal";
}

interface AnalysisResult {
  simple: string;
  medium: string;
  expert: string;
  etiology?: string;
  mechanism?: string;
  diseases?: string;
  specialist?: string;
  action: string;
  flags: AnalysisFlag[];
  medication_context?: string;
  overall_status?: OverallStatus;
  summary_headline?: string;
  urgency?: UrgencyLevel;
  modality?: string;
  body_part?: string;
  questions_for_doctor?: string[];
}

// ── Anonymous-user persistence (localStorage) ───────────────────────────────
const ANON_STORE_KEY = "meridix_imaging_anon_v1";
const ANON_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface AnonAnalysis {
  result: AnalysisResult;
  fileName: string;
  activeTier: Tier;
  savedAt: number;
}

function readAnon(): AnonAnalysis | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(ANON_STORE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AnonAnalysis;
    if (!parsed?.result || typeof parsed.savedAt !== "number") return null;
    if (Date.now() - parsed.savedAt > ANON_TTL_MS) {
      localStorage.removeItem(ANON_STORE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeAnon(data: Omit<AnonAnalysis, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(ANON_STORE_KEY, JSON.stringify({ ...data, savedAt: Date.now() }));
  } catch {
    /* noop */
  }
}

function clearAnon() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ANON_STORE_KEY);
  } catch {
    /* noop */
  }
}

// ── Tier config (sky accent for Imaging) ────────────────────────────────────
const TIER_CONFIG: Record<Tier, { activeClass: string; icon: ReactNode }> = {
  simple: {
    activeClass: "text-sky-700 border-b-2 border-sky-500 bg-sky-500/5",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    ),
  },
  medium: {
    activeClass: "text-sky-700 border-b-2 border-sky-500 bg-sky-500/5",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ),
  },
  expert: {
    activeClass: "text-sky-700 border-b-2 border-sky-500 bg-sky-500/5",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
  },
};

// ── Specialist extraction (mirrors the Lab Analyzer pattern) ────────────────
function extractSpecialist(text: string): string {
  const known = [
    "Pulmonologist", "Cardiologist", "Orthopedist", "Neurologist", "Neurosurgeon",
    "Gastroenterologist", "Hepatologist", "Urologist", "Nephrologist", "Gynecologist",
    "Obstetrician", "Breast Surgeon", "Oncologist", "ENT", "Otolaryngologist",
    "Vascular Surgeon", "Radiologist", "Rheumatologist", "Endocrinologist",
    "Dermatologist", "Ophthalmologist", "General Practitioner",
    "Internal Medicine Physician", "Primary Care Physician",
  ];
  for (const s of known) {
    if (text.toLowerCase().includes(s.toLowerCase())) return s;
  }
  const m = text.match(/\b([A-Z][a-z]+(?:ologist|iatrist|ician|surgeon|ist))\b/);
  return m ? m[1] : "specialist";
}

// ── Loading animation ───────────────────────────────────────────────────────
const STEP_DELAYS = [0, 1500, 3500, 6500] as const;

function LoadingAnimation() {
  const t = useTranslations("Imaging");
  const steps = [
    t("loadingStep1"),
    t("loadingStep2"),
    t("loadingStep3"),
    t("loadingStep4"),
  ];
  const patience = [t("patience1"), t("patience2"), t("patience3"), t("patience4")];
  const [activeStep, setActiveStep] = useState(0);
  const [patienceIdx, setPatienceIdx] = useState(0);
  const [showPatience, setShowPatience] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const timers = STEP_DELAYS.slice(1).map((delay, i) =>
      setTimeout(() => setActiveStep(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    const showTimer = setTimeout(
      () => setShowPatience(true),
      STEP_DELAYS[STEP_DELAYS.length - 1] + 1500
    );
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!showPatience) return;
    const id = setInterval(() => {
      setPatienceIdx((p) => (p + 1) % patience.length);
    }, 4000);
    return () => clearInterval(id);
  }, [showPatience, patience.length]);

  useEffect(() => {
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="py-10 px-4 flex flex-col items-center gap-8">
      <div className="w-full max-w-xs space-y-4">
        {steps.map((label, i) => {
          if (i > activeStep) return null;
          const done = i < activeStep;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                {done ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                      <path d="M2.5 6l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-sky-500/25 border-t-sky-500 animate-spin" />
                )}
              </div>
              <span className={`text-sm leading-snug ${done ? "text-ink-secondary" : "text-ink font-semibold"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>

      <div className="w-full max-w-xs space-y-2.5 pt-1">
        {[92, 78, 85].map((w, i) => (
          <div key={i} className="h-2.5 rounded-full shimmer" style={{ width: `${w}%` }} />
        ))}
      </div>

      <div className={`text-center transition-opacity duration-700 ${showPatience ? "opacity-100" : "opacity-0"}`}>
        <p className="text-xs text-ink-secondary font-medium">{patience[patienceIdx]}</p>
        {elapsedSec >= 8 && (
          <p className="text-[11px] text-ink-tertiary mt-1">{elapsedSec}s elapsed · still running</p>
        )}
      </div>

      <p className="text-xs text-ink-tertiary text-center max-w-[280px] leading-relaxed">
        {t("loadingPrivacy")}
      </p>
    </div>
  );
}

// ── Error card ──────────────────────────────────────────────────────────────
function ErrorCard({
  code,
  fileSizeMB,
  onReset,
}: {
  code: ErrorCode;
  fileSizeMB?: string;
  onReset: () => void;
}) {
  const t = useTranslations("Imaging");
  const amber = "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20";
  const red = "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-900/20";

  const cfg = (() => {
    switch (code) {
      case "FILE_TOO_LARGE":
        return {
          accent: amber,
          title: t("errFileLargeTitle"),
          message: t("errFileLarge", { size: fileSizeMB ?? "over 10" }),
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          ),
        };
      case "WRONG_FILE_TYPE":
        return {
          accent: amber,
          title: t("errFileTypeTitle"),
          message: t("errFileType"),
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          ),
        };
      case "NO_LAB_VALUES":
        return {
          accent: amber,
          title: t("errNoLabValuesTitle"),
          message: t("errNoLabValues"),
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 9.75l-6 6M9 9.75l6 6" />
            </svg>
          ),
        };
      case "NON_MEDICAL":
        return {
          accent: amber,
          title: t("errNonMedicalTitle"),
          message: t("errNonMedical"),
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          ),
        };
      default:
        return {
          accent: red,
          title: t("errGenericTitle"),
          message: t("errGeneric"),
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ),
        };
    }
  })();

  const isAmber = cfg.accent === amber;
  return (
    <div className={`rounded-2xl border p-6 ${cfg.accent} flex flex-col items-center text-center gap-4`}>
      <div
        className={`w-14 h-14 rounded-full flex items-center justify-center ${
          isAmber ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600" : "bg-red-100 dark:bg-red-900/40 text-red-600"
        }`}
      >
        {cfg.icon}
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className={`text-base font-bold ${isAmber ? "text-amber-900 dark:text-amber-200" : "text-red-900 dark:text-red-200"}`}>
          {cfg.title}
        </p>
        <p className={`text-sm leading-relaxed ${isAmber ? "text-amber-800 dark:text-amber-300" : "text-red-800 dark:text-red-300"}`}>
          {cfg.message}
        </p>
      </div>
      <button
        onClick={onReset}
        className={`mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
          isAmber
            ? "bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
            : "bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20"
        }`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
        {t("tryAgain")}
      </button>
    </div>
  );
}

// ── Mobile-aware detection ──────────────────────────────────────────────────
function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768 || navigator.maxTouchPoints > 0);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// ── Upload zone (mobile / desktop) ──────────────────────────────────────────
function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function FilePreview({
  preview,
  onClear,
  onAnalyze,
}: {
  preview: { name: string; size: string };
  onClear: () => void;
  onAnalyze: () => void;
}) {
  const t = useTranslations("Imaging");
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-sky-300/50 bg-sky-50/60 dark:bg-sky-900/10">
        <div className="w-12 h-12 bg-sky-100 dark:bg-sky-900/40 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-sky-600 dark:text-sky-400" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{preview.name}</p>
          <p className="text-xs text-ink-tertiary mt-0.5">{preview.size}</p>
          <p className="text-xs text-sky-600 dark:text-sky-400 mt-1 font-medium">{t("readyToAnalyze")}</p>
        </div>
        <button onClick={onClear} className="text-ink-tertiary hover:text-ink-secondary p-2 rounded-lg hover:bg-surface-raised flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <button
        onClick={onAnalyze}
        className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-base transition-all duration-200 shadow-lg shadow-sky-600/20 hover:shadow-sky-600/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
        {t("analyzeBtnLabel")}
      </button>
    </div>
  );
}

function MobileUploadZone({ onFileSelect }: { onFileSelect: (f: File) => void }) {
  const t = useTranslations("Imaging");
  const [preview, setPreview] = useState<{ name: string; size: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const filesRef = useRef<HTMLInputElement>(null);

  const handle = useCallback((f: File) => {
    setPreview({ name: f.name, size: formatSize(f.size) });
    setSelectedFile(f);
  }, []);
  const clear = () => {
    setPreview(null);
    setSelectedFile(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (filesRef.current) filesRef.current.value = "";
  };

  if (preview && selectedFile) {
    return <FilePreview preview={preview} onClear={clear} onAnalyze={() => onFileSelect(selectedFile)} />;
  }
  return (
    <div className="space-y-3">
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }} />
      <input ref={filesRef} type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }} />
      <button
        onClick={() => cameraRef.current?.click()}
        className="w-full py-5 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-2xl text-base transition-all duration-200 shadow-lg shadow-sky-600/25 flex items-center justify-center gap-3"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
        {t("takePhotoBtn")}
      </button>
      <button
        onClick={() => filesRef.current?.click()}
        className="w-full py-3.5 bg-white dark:bg-slate-800 hover:bg-surface-raised border border-surface-border hover:border-sky-400/40 text-ink-secondary hover:text-ink font-semibold rounded-2xl text-sm transition-all duration-200 flex items-center justify-center gap-2.5"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        {t("chooseFilesBtn")}
      </button>
    </div>
  );
}

function DesktopUploadZone({ onFileSelect }: { onFileSelect: (f: File) => void }) {
  const t = useTranslations("Imaging");
  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<{ name: string; size: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handle = useCallback((f: File) => {
    setPreview({ name: f.name, size: formatSize(f.size) });
    setSelectedFile(f);
  }, []);

  const onDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) handle(f);
  }, [handle]);

  const clear = () => {
    setPreview(null);
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => !preview && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer ${
          dragging
            ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20 scale-[1.01]"
            : preview
            ? "border-sky-400/40 bg-sky-50/60 dark:bg-sky-900/10 cursor-default"
            : "border-surface-border hover:border-sky-400/50 hover:bg-sky-50/30 dark:hover:bg-sky-900/10"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handle(f); }}
        />
        {preview ? (
          <div className="p-8 flex items-center gap-5">
            <div className="w-14 h-14 bg-sky-100 dark:bg-sky-900/40 rounded-2xl flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-sky-600 dark:text-sky-400" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{preview.name}</p>
              <p className="text-xs text-ink-tertiary mt-0.5">{preview.size}</p>
              <p className="text-xs text-sky-600 dark:text-sky-400 mt-1">{t("readyToAnalyze")}</p>
            </div>
            <button onClick={(e) => { e.stopPropagation(); clear(); }} className="text-ink-tertiary hover:text-ink-secondary p-2 rounded-lg hover:bg-surface-raised">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-surface-raised border border-surface-border rounded-2xl flex items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-ink-tertiary" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-base font-semibold text-ink mb-1">{t("dropReportHere")}</p>
            <p className="text-sm text-ink-secondary mb-4">{t("orClickBrowse")}</p>
            <div className="flex items-center gap-2 text-xs text-ink-tertiary">
              {["PDF", "JPG", "PNG"].map((f) => (
                <span key={f} className="px-2 py-1 rounded-md bg-surface-raised border border-surface-border font-medium">{f}</span>
              ))}
              <span>{t("upTo10MB")}</span>
            </div>
          </div>
        )}
      </div>
      {preview && selectedFile && (
        <button
          onClick={() => onFileSelect(selectedFile)}
          className="w-full py-4 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-base transition-all duration-200 shadow-lg shadow-sky-600/20 hover:shadow-sky-600/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          {t("analyzeBtnLabel")}
        </button>
      )}
    </div>
  );
}

function UploadZone({ onFileSelect }: { onFileSelect: (f: File) => void }) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileUploadZone onFileSelect={onFileSelect} />;
  return <DesktopUploadZone onFileSelect={onFileSelect} />;
}

// ── Finding badge ───────────────────────────────────────────────────────────
function FindingBadge({ flag }: { flag: AnalysisFlag }) {
  const cfg = {
    high: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      valueColor: "text-amber-700 dark:text-amber-400",
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      iconColor: "text-amber-600 dark:text-amber-400",
      icon: (
        <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
          <path d="M6 2l4 8H2L6 2z" />
        </svg>
      ),
    },
    low: {
      bg: "bg-sky-50 dark:bg-sky-900/20",
      border: "border-sky-200 dark:border-sky-800",
      valueColor: "text-sky-700 dark:text-sky-400",
      iconBg: "bg-sky-100 dark:bg-sky-900/40",
      iconColor: "text-sky-600 dark:text-sky-400",
      icon: (
        <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
          <path d="M6 10L2 2h8L6 10z" />
        </svg>
      ),
    },
    normal: {
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      valueColor: "text-emerald-700 dark:text-emerald-400",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      icon: (
        <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 1.414l-6 6a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L5 8.586l5.293-5.293z" clipRule="evenodd" />
        </svg>
      ),
    },
  }[flag.status];

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-xl ${cfg.bg} border ${cfg.border}`}>
      <div className="flex items-center gap-2">
        <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.iconBg} ${cfg.iconColor}`}>
          {cfg.icon}
        </span>
        <span className="text-sm font-bold text-ink leading-tight">{flag.marker}</span>
      </div>
      <div className="flex items-end justify-between gap-2">
        <div>
          <span className={`text-xl font-extrabold tracking-tight leading-none ${cfg.valueColor}`}>{flag.value}</span>
          {flag.unit && (
            <span className={`text-xs font-semibold ml-1.5 ${cfg.valueColor} opacity-80`}>{flag.unit}</span>
          )}
        </div>
        {flag.reference && (
          <span className="text-[11px] text-ink-tertiary bg-white/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md border border-surface-border/50 flex-shrink-0">
            {flag.reference}
          </span>
        )}
      </div>
    </div>
  );
}

// ── Questions-to-doctor section ─────────────────────────────────────────────
function QuestionsSection({ questions }: { questions: string[] }) {
  const t = useTranslations("Imaging");
  const [copied, setCopied] = useState(false);

  const copyAll = async () => {
    const text = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-surface-border bg-surface-raised flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400">
            <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink">{t("questionsToAsk")}</p>
          <p className="text-[11px] text-ink-tertiary mt-0.5">{t("questionsSubtitle")}</p>
        </div>
      </div>
      <div className="p-5 space-y-4">
        <ol className="space-y-3">
          {questions.map((q, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-ink-secondary leading-relaxed flex-1">{q}</p>
            </li>
          ))}
        </ol>
        <button
          onClick={copyAll}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 ${
            copied
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-surface-border bg-surface-raised hover:border-sky-300 hover:bg-sky-50 dark:hover:bg-sky-900/10 text-ink-secondary hover:text-sky-700"
          }`}
        >
          {copied ? (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {t("copiedQuestions")}
            </>
          ) : (
            <>
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
              </svg>
              {t("copyAllQuestions")}
            </>
          )}
        </button>
      </div>
    </div>
  );
}

// ── Deep dive (causes / mechanism / diseases / specialist) ──────────────────
function DeepDive({ result }: { result: AnalysisResult }) {
  const t = useTranslations("Imaging");
  const [open, setOpen] = useState(true);

  const sections = [
    {
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      color: "text-amber-600 bg-amber-50 dark:bg-amber-900/20",
      label: t("causesTitle"),
      sublabel: t("causesSubLabel"),
      content: result.etiology,
    },
    {
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
      ),
      color: "text-sky-600 bg-sky-50 dark:bg-sky-900/20",
      label: t("mechanismTitle"),
      sublabel: t("mechanismSubLabel"),
      content: result.mechanism,
    },
    {
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      ),
      color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20",
      label: t("diagnosesTitle"),
      sublabel: t("diagnosesSubLabel"),
      content: result.diseases,
    },
  ].filter((s) => s.content);

  if (!result.etiology && !result.mechanism && !result.diseases && !result.specialist) return null;

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 bg-surface-raised hover:bg-surface-border/30 transition-colors"
      >
        <span className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">{t("deeperAnalysis")}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-ink-tertiary transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="divide-y divide-surface-border">
          {result.specialist && (() => {
            const specialist = extractSpecialist(result.specialist);
            const mapsUrl = `https://www.google.com/maps/search/${encodeURIComponent(specialist + " near me")}`;
            const zocdocUrl = `https://www.zocdoc.com/search?dr_specialty=${encodeURIComponent(specialist)}`;
            return (
              <div className="p-5 bg-sky-50/60 dark:bg-sky-900/10">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-sky-600 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-widest mb-1">{t("specialistTitle")}</p>
                    <p className="text-sm text-ink-secondary leading-relaxed mb-3">{result.specialist}</p>
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track("imaging_specialist_link", { specialist, destination: "maps" })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-sky-400/40 text-sky-700 dark:text-sky-400 hover:bg-sky-600 hover:text-white hover:border-sky-600 text-xs font-semibold transition-all duration-150"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        {t("findNearYou")}
                      </a>
                      <a
                        href={zocdocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track("imaging_specialist_link", { specialist, destination: "zocdoc" })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-ink-secondary hover:border-sky-400/40 hover:text-sky-700 hover:bg-sky-50 dark:hover:bg-sky-900/10 text-xs font-semibold transition-all duration-150"
                      >
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        {t("bookZocdoc")}
                      </a>
                    </div>
                    <p className="mt-2 text-[10px] text-ink-tertiary">{t("zocdocDisclaimer")}</p>
                  </div>
                </div>
              </div>
            );
          })()}
          {sections.map((s, i) => (
            <div key={i} className="p-5">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${s.color} flex items-center justify-center flex-shrink-0`}>
                  {s.icon}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-ink mb-0.5">{s.label}</p>
                  <p className="text-xs text-ink-tertiary mb-2">{s.sublabel}</p>
                  <p className="text-sm text-ink-secondary leading-relaxed">{s.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Share + Email + Print actions ───────────────────────────────────────────
function ShareSection({ simple }: { simple: string }) {
  const t = useTranslations("Imaging");
  const [copied, setCopied] = useState(false);
  const shareText = `Here's a summary of my imaging report from Meridix Labs:\n\n${simple}\n\nFull interpretation at meridixlabs.com`;

  const onWhatsApp = () => {
    track("imaging_share_whatsapp");
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank", "noopener,noreferrer");
  };
  const onCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-800 overflow-hidden shadow-sm print:hidden">
      <div className="px-5 py-3.5 border-b border-surface-border bg-surface-raised flex items-center gap-2">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-ink-tertiary">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">Share</p>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          <button
            onClick={onWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-surface-border bg-white dark:bg-slate-800 hover:border-[#25D366]/50 hover:bg-[#25D366]/5 text-ink-secondary hover:text-[#128C7E] text-sm font-semibold transition-all duration-200"
          >
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#25D366] flex-shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            {t("shareWhatsApp")}
          </button>
          <button
            onClick={onCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 ${
              copied
                ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                : "border-surface-border bg-white dark:bg-slate-800 hover:border-sky-400/40 hover:bg-sky-50 dark:hover:bg-sky-900/10 text-ink-secondary hover:text-sky-700"
            }`}
          >
            {copied ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                {t("copySummaryDone")}
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                {t("copySummary")}
              </>
            )}
          </button>
        </div>
        <p className="text-[11px] text-ink-tertiary">{t("sharePrivacyNote")}</p>
      </div>
    </div>
  );
}

function EmailSection({ result }: { result: AnalysisResult }) {
  const t = useTranslations("Imaging");
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg] = useState("");

  const send = async () => {
    if (!email.trim()) return;
    setStatus("sending");
    setErrMsg("");
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: email.trim(),
          mode: "radiology",
          overall_status: result.overall_status,
          summary_headline: result.summary_headline,
          urgency: result.urgency,
          simple: result.simple,
          specialist: result.specialist,
          action: result.action,
          flags: result.flags ?? [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send.");
      track("imaging_email_sent");
      setStatus("sent");
    } catch (e) {
      setErrMsg(e instanceof Error ? e.message : "Something went wrong.");
      setStatus("error");
    }
  };

  return (
    <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-800 overflow-hidden shadow-sm print:hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-raised/60 transition-colors">
        <div className="flex items-center gap-2.5">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-sky-600 flex-shrink-0">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
          </svg>
          <span className="text-sm font-semibold text-ink">{t("emailTitle")}</span>
          {status === "sent" && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">{t("emailSentBadge")}</span>
          )}
        </div>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-ink-tertiary transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>
      {open && (
        <div className="px-5 pb-5 space-y-3 border-t border-surface-border pt-4">
          {status === "sent" ? (
            <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-500 flex-shrink-0">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">{t("emailSentTitle")}</p>
                <p className="text-xs text-emerald-600 dark:text-emerald-400 mt-0.5">Your interpretation has been sent to {email}</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && send()}
                  disabled={status === "sending"}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-900 text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all text-sm disabled:opacity-50"
                />
                <button
                  onClick={send}
                  disabled={status === "sending" || !email.trim()}
                  className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all duration-200 flex items-center gap-2 flex-shrink-0"
                >
                  {status === "sending" ? t("emailSendingBtn") : t("emailSendBtn")}
                </button>
              </div>
              {status === "error" && <p className="text-xs text-red-600 dark:text-red-400">{errMsg}</p>}
              <p className="text-[11px] text-ink-tertiary">{t("emailPrivacyNote")}</p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ── Results panel ───────────────────────────────────────────────────────────
function ResultsPanel({
  result,
  fileName,
  onReset,
  activeTier,
  setActiveTier,
  savedAnalysisId,
  isSignedIn,
}: {
  result: AnalysisResult;
  fileName: string;
  onReset: () => void;
  activeTier: Tier;
  setActiveTier: (t: Tier) => void;
  savedAnalysisId: string | null;
  isSignedIn: boolean;
}) {
  const t = useTranslations("Imaging");
  const [copied, setCopied] = useState(false);
  const [mobileTab, setMobileTab] = useState<"results" | "report" | "ask">("results");
  const paragraphs = result[activeTier].split(/\n+/).filter(Boolean);

  const handleCopy = async () => {
    const flagLines = result.flags?.length
      ? result.flags.map((f) => `  ${f.status === "high" ? "↑" : f.status === "low" ? "✓" : "·"} ${f.marker}: ${f.value}${f.unit ? " " + f.unit : ""}${f.reference ? ` (${f.reference})` : ""}`).join("\n")
      : "  No significant findings.";
    const text = [
      `MERIDIX LABS — Imaging Report Interpretation`,
      `File: ${fileName}`,
      `Date: ${new Date().toLocaleDateString()}`,
      result.modality || result.body_part ? `Study: ${[result.modality, result.body_part].filter(Boolean).join(" — ")}` : "",
      "",
      "━━━ SIMPLE ━━━",
      result.simple,
      "",
      "━━━ MEDIUM ━━━",
      result.medium,
      "",
      "━━━ EXPERT ━━━",
      result.expert,
      "",
      `━━━ KEY FINDINGS ━━━`,
      flagLines,
      ...(result.specialist ? ["", "━━━ WHICH SPECIALIST TO SEE ━━━", result.specialist] : []),
      ...(result.etiology ? ["", "━━━ WHAT COULD CAUSE THIS FINDING ━━━", result.etiology] : []),
      ...(result.mechanism ? ["", "━━━ TISSUE MECHANISM ━━━", result.mechanism] : []),
      ...(result.diseases ? ["", "━━━ POSSIBLE DIAGNOSES ━━━", result.diseases] : []),
      ...(result.questions_for_doctor?.length ? ["", "━━━ QUESTIONS TO ASK YOUR DOCTOR ━━━", ...result.questions_for_doctor.map((q, i) => `${i + 1}. ${q}`)] : []),
      "",
      "━━━ WHAT TO DO NEXT ━━━",
      result.action,
      "",
      "─────────────────────────────────────────",
      "Meridix Labs is an educational tool. This is not medical advice.",
      "Always consult a qualified physician.",
    ].filter((line) => line !== "").join("\n").replace(/\n\n+/g, "\n\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => window.print();

  return (
    <div id="print-zone" className="animate-fade-in space-y-5">
      {/* Print-only header */}
      <div className="hidden print:block mb-6 pb-4 border-b border-gray-200">
        <p className="text-xl font-extrabold text-gray-900 tracking-tight">Meridix Labs</p>
        <p className="text-sm text-gray-500 mt-0.5">meridixlabs.com — AI-powered imaging report interpretation</p>
        <p className="text-xs text-gray-400 mt-1">File: {fileName} · {new Date().toLocaleDateString()}</p>
      </div>

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-sky-100 dark:bg-sky-900/30 flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-sky-600 dark:text-sky-400">
              <path fillRule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate max-w-[200px] sm:max-w-sm">{fileName}</p>
            <p className="text-xs text-ink-tertiary">{t("analysisComplete")}</p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-sm font-medium text-sky-700 dark:text-sky-400 border border-sky-300/40 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-all px-3 py-1.5 rounded-lg"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          {t("newUpload")}
        </button>
      </div>

      {/* Modality + body-part chip strip */}
      {(result.modality || result.body_part) && (
        <div className="flex flex-wrap gap-2">
          {result.modality && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 text-xs font-semibold text-sky-700 dark:text-sky-400">
              <span className="text-[10px] uppercase tracking-wider text-sky-500/70">{t("modalityLabel")}</span>
              {result.modality}
            </span>
          )}
          {result.body_part && (
            <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-xs font-semibold text-purple-700 dark:text-purple-400">
              <span className="text-[10px] uppercase tracking-wider text-purple-500/70">{t("bodyPartLabel")}</span>
              {result.body_part}
            </span>
          )}
        </div>
      )}

      {/* Overall summary card */}
      {result.overall_status && result.summary_headline && (() => {
        const STATUS = {
          normal: {
            border: "border-emerald-300 dark:border-emerald-700",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
            iconBg: "bg-emerald-100 dark:bg-emerald-800/40",
            iconColor: "text-emerald-600 dark:text-emerald-400",
            labelColor: "text-emerald-800 dark:text-emerald-300",
            label: t("statusNormal"),
            icon: (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
            ),
          },
          amber: {
            border: "border-amber-300 dark:border-amber-700",
            bg: "bg-amber-50 dark:bg-amber-900/20",
            iconBg: "bg-amber-100 dark:bg-amber-800/40",
            iconColor: "text-amber-600 dark:text-amber-400",
            labelColor: "text-amber-800 dark:text-amber-300",
            label: t("statusAmber"),
            icon: (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ),
          },
          red: {
            border: "border-red-300 dark:border-red-700",
            bg: "bg-red-50 dark:bg-red-900/20",
            iconBg: "bg-red-100 dark:bg-red-800/40",
            iconColor: "text-red-600 dark:text-red-400",
            labelColor: "text-red-800 dark:text-red-300",
            label: t("statusRed"),
            icon: (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ),
          },
        } as const;
        const URG = {
          routine: { label: t("urgencyRoutine"), color: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
          soon: { label: t("urgencySoon"), color: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
          weeks: { label: t("urgencyWeeks"), color: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
        } as const;
        const sc = STATUS[result.overall_status];
        const uc = result.urgency ? URG[result.urgency] : null;
        return (
          <div className={`rounded-2xl border-2 ${sc.border} ${sc.bg} p-5 space-y-3`}>
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${sc.iconBg} ${sc.iconColor}`}>
                {sc.icon}
              </div>
              <p className={`text-sm font-bold ${sc.labelColor}`}>{sc.label}</p>
            </div>
            <p className="text-sm text-ink-secondary leading-relaxed pl-12">{result.summary_headline}</p>
            {uc && (
              <div className="pl-12 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${uc.dot}`} />
                <p className={`text-xs font-semibold ${uc.color}`}>{uc.label}</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* Mobile tab strip */}
      <div className="xl:hidden sticky top-[72px] z-30 -mx-6 sm:-mx-8 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm border-b border-surface-border print:hidden">
        <div className="flex">
          {([
            {
              id: "results" as const, label: t("yourResults"),
              icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0"><path fillRule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>,
            },
            {
              id: "report" as const, label: t("reportTab"),
              icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" /></svg>,
            },
            {
              id: "ask" as const, label: t("askAi"),
              icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>,
            },
          ] as const).map((tab) => (
            <button
              key={tab.id}
              onClick={() => setMobileTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-3.5 text-xs font-bold transition-colors border-b-2 ${
                mobileTab === tab.id ? "text-sky-600 border-sky-500" : "text-ink-tertiary border-transparent hover:text-ink-secondary"
              }`}
            >
              {tab.icon}
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Two-column layout: results | sticky chat */}
      <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6 xl:items-start space-y-5 xl:space-y-0">
        <div className={`space-y-5 min-w-0 ${mobileTab === "ask" ? "hidden xl:block" : ""}`}>
          {/* Section 1: results card */}
          <div className={mobileTab === "report" ? "hidden xl:block" : ""}>
            <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3 px-0.5">{t("yourResults")}</p>
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm">
              {/* Findings */}
              {result.flags && result.flags.length > 0 ? (
                <>
                  <div className="px-5 py-3 border-b border-surface-border bg-surface-raised flex items-center justify-between">
                    <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">{t("keyFindings")}</p>
                    <span className="text-[11px] text-ink-tertiary bg-white dark:bg-slate-700 border border-surface-border px-2 py-0.5 rounded-full">
                      {result.flags.length} finding{result.flags.length !== 1 ? "s" : ""}
                    </span>
                  </div>
                  <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {result.flags.map((flag, i) => (
                      <FindingBadge key={i} flag={flag} />
                    ))}
                  </div>
                </>
              ) : (
                <div className="px-5 py-4 border-b border-surface-border bg-emerald-50/60 dark:bg-emerald-900/10 flex items-start gap-2">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <p className="text-sm text-emerald-700 dark:text-emerald-300 leading-relaxed">{t("noFindings")}</p>
                </div>
              )}

              {/* Tier tabs */}
              <div className={`border-b border-surface-border px-2 sm:px-5 pt-4 bg-surface-raised ${result.flags && result.flags.length > 0 ? "border-t" : ""}`}>
                <div className="flex">
                  {(["simple", "medium", "expert"] as Tier[]).map((tier) => {
                    const cfg = TIER_CONFIG[tier];
                    const isActive = tier === activeTier;
                    return (
                      <button
                        key={tier}
                        onClick={() => setActiveTier(tier)}
                        className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-t-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                          isActive ? cfg.activeClass : "text-ink-tertiary hover:text-ink-secondary hover:bg-surface-border/40"
                        }`}
                      >
                        {cfg.icon}
                        <span className="capitalize">{t(`tier${tier.charAt(0).toUpperCase() + tier.slice(1)}` as "tierSimple" | "tierMedium" | "tierExpert")}</span>
                        {isActive && (
                          <span className="hidden sm:inline-block text-xs font-normal opacity-50 ml-0.5">
                            — {t(`tier${tier.charAt(0).toUpperCase() + tier.slice(1)}Label` as "tierSimpleLabel" | "tierMediumLabel" | "tierExpertLabel")}
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Interpretation prose */}
              <div className="p-6">
                <div className="animate-fade-in">
                  {paragraphs.map((para, i) => (
                    <p key={i} className="text-ink-secondary leading-relaxed text-sm sm:text-base mb-3 last:mb-0">{para}</p>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="border-t border-sky-200/40 bg-sky-50/60 dark:bg-sky-900/10 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 bg-sky-600/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-sky-600">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-sky-700 dark:text-sky-400 uppercase tracking-widest mb-1.5">{t("whatShouldYouDo")}</p>
                    <p className="text-sm text-ink-secondary leading-relaxed">{result.action}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Section 2-4: report content */}
          <div className={`space-y-5 ${mobileTab === "results" ? "hidden xl:block" : ""}`}>
            {(result.etiology || result.mechanism || result.diseases || result.specialist) && (
              <div>
                <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3 px-0.5">{t("deeperAnalysis")}</p>
                <div className="space-y-3">
                  <DeepDive result={result} />
                  {result.medication_context && (
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm">
                      <div className="px-5 py-3.5 border-b border-surface-border bg-surface-raised flex items-center gap-2.5">
                        <div className="w-6 h-6 rounded-lg bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-violet-600 dark:text-violet-400">
                            <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
                          </svg>
                        </div>
                        <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">Medication Context</p>
                      </div>
                      <div className="p-5">
                        <p className="text-sm text-ink-secondary leading-relaxed">{result.medication_context}</p>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {result.questions_for_doctor && result.questions_for_doctor.length > 0 && (
              <div>
                <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3 px-0.5">Next Steps</p>
                <QuestionsSection questions={result.questions_for_doctor} />
              </div>
            )}

            <div className="print:hidden">
              <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3 px-0.5">{t("saveShare")}</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                <ShareSection simple={result.simple} />
                <EmailSection result={result} />
              </div>
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <button
                  onClick={handleCopy}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                    copied
                      ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                      : "border-surface-border bg-white dark:bg-slate-800 hover:border-sky-400/40 hover:bg-sky-50 dark:hover:bg-sky-900/10 text-ink-secondary hover:text-sky-700"
                  }`}
                >
                  {copied ? (
                    <>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                      {t("copySummaryDone")}
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                        <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                      </svg>
                      {t("copyToClipboard")}
                    </>
                  )}
                </button>
                <button
                  onClick={handlePrint}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-surface-border bg-white dark:bg-slate-800 hover:border-sky-400/40 hover:bg-sky-50 dark:hover:bg-sky-900/10 text-ink-secondary hover:text-sky-700 text-sm font-semibold transition-all duration-200"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a1 1 0 001 1h6a1 1 0 001-1v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a1 1 0 00-1-1H6a1 1 0 00-1 1zm2 0h6v3H7V4zm-1 9a1 1 0 112 0 1 1 0 01-2 0zm2 1v2h4v-2H8z" clipRule="evenodd" />
                  </svg>
                  {t("downloadPdf")}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sticky chat sidebar */}
        <aside className={`xl:sticky xl:top-24 print:hidden min-w-0 scroll-mt-6 ${mobileTab !== "ask" ? "hidden xl:block" : ""}`}>
          <LabChatPanel
            result={result}
            tier={activeTier}
            fileName={fileName}
            isSample={false}
            savedAnalysisId={savedAnalysisId}
            isSignedIn={isSignedIn}
          />
        </aside>
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 print:hidden">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          <strong>Meridix Labs is an educational tool.</strong> This is not medical advice. Always consult a qualified physician — your ordering doctor first.
        </p>
      </div>

      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-ink text-white text-sm font-medium rounded-xl shadow-xl animate-fade-in pointer-events-none">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          {t("copiedToClipboard")}
        </div>
      )}

      <NextStepBar currentPage="app" />
    </div>
  );
}

// ── Scan Image tab (NEW — vision-based scan interpretation) ─────────────────

type ScanDepth = "simple" | "medium" | "expert";
type ScanTypeKey = "auto" | "xray" | "ct" | "mri" | "ultrasound" | "mammogram";
type ScanUrgency = "routine" | "soon" | "urgent";
type ScanErrorKind =
  | "not_medical_image"
  | "insufficient_quality"
  | "file_too_large"
  | "wrong_file_type"
  | "generic";

interface ScanResult {
  scan_type: string;
  body_region: string;
  image_quality: string;
  key_findings: string[];
  normal_structures: string[];
  areas_of_concern: string[];
  plain_english_summary: string;
  medium_summary: string;
  expert_summary: string;
  questions_to_ask_doctor: string[];
  urgency_flag: ScanUrgency;
  disclaimer: string;
}

const SCAN_TYPES: { key: ScanTypeKey; label: string }[] = [
  { key: "auto", label: "Auto-detect" },
  { key: "xray", label: "X-Ray" },
  { key: "ct", label: "CT Scan" },
  { key: "mri", label: "MRI" },
  { key: "ultrasound", label: "Ultrasound" },
  { key: "mammogram", label: "Mammogram" },
];

function ScanLoadingAnimation() {
  const steps = [
    "Reading your scan...",
    "Identifying anatomy...",
    "Analyzing visible findings...",
    "Generating your interpretation...",
  ];
  const [activeStep, setActiveStep] = useState(0);
  const [elapsedSec, setElapsedSec] = useState(0);

  useEffect(() => {
    const timers = STEP_DELAYS.slice(1).map((delay, i) =>
      setTimeout(() => setActiveStep(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);
  useEffect(() => {
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="py-10 px-4 flex flex-col items-center gap-8">
      <div className="w-full max-w-xs space-y-4">
        {steps.map((label, i) => {
          if (i > activeStep) return null;
          const done = i < activeStep;
          return (
            <div key={i} className="flex items-center gap-3">
              <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
                {done ? (
                  <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
                      <path d="M2.5 6l2.5 2.5 4.5-5" stroke="white" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                ) : (
                  <div className="w-5 h-5 rounded-full border-2 border-sky-500/25 border-t-sky-500 animate-spin" />
                )}
              </div>
              <span className={`text-sm leading-snug ${done ? "text-ink-secondary" : "text-ink font-semibold"}`}>
                {label}
              </span>
            </div>
          );
        })}
      </div>
      <div className="w-full max-w-xs space-y-2.5 pt-1">
        {[92, 78, 85].map((w, i) => (
          <div key={i} className="h-2.5 rounded-full shimmer" style={{ width: `${w}%` }} />
        ))}
      </div>
      <p className="text-xs text-ink-secondary font-medium">Analyzing your scan...</p>
      {elapsedSec >= 8 && (
        <p className="text-[11px] text-ink-tertiary -mt-6">{elapsedSec}s elapsed · still running</p>
      )}
      <p className="text-xs text-ink-tertiary text-center max-w-[280px] leading-relaxed">
        Your original image is discarded after analysis. Only the AI interpretation is saved to your account.
      </p>
    </div>
  );
}

function ScanErrorCard({
  kind,
  message,
  onReset,
}: {
  kind: ScanErrorKind;
  message: string;
  onReset: () => void;
}) {
  const cfg = (() => {
    switch (kind) {
      case "not_medical_image":
        return {
          title: "That doesn't look like a medical scan",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
            </svg>
          ),
        };
      case "insufficient_quality":
        return {
          title: "Image quality is too low",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.036 12.322a1.012 1.012 0 010-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          ),
        };
      case "file_too_large":
        return {
          title: "That image is too large",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
            </svg>
          ),
        };
      case "wrong_file_type":
        return {
          title: "Unsupported file type",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
            </svg>
          ),
        };
      default:
        return {
          title: "Something went wrong",
          icon: (
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          ),
        };
    }
  })();

  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6 flex flex-col items-center text-center gap-4">
      <div className="w-14 h-14 rounded-full flex items-center justify-center bg-amber-100 dark:bg-amber-900/40 text-amber-600">
        {cfg.icon}
      </div>
      <div className="space-y-1.5 max-w-sm">
        <p className="text-base font-bold text-amber-900 dark:text-amber-200">{cfg.title}</p>
        <p className="text-sm leading-relaxed text-amber-800 dark:text-amber-300">{message}</p>
      </div>
      <button
        onClick={onReset}
        className="mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
        Try again
      </button>
    </div>
  );
}

function ScanResultsPanel({
  result,
  depth,
  setDepth,
  previewUrl,
  onReset,
}: {
  result: ScanResult;
  depth: ScanDepth;
  setDepth: (d: ScanDepth) => void;
  previewUrl: string | null;
  onReset: () => void;
}) {
  const [normalsOpen, setNormalsOpen] = useState(false);

  const urgency = result.urgency_flag;
  const URG_STYLE: Record<ScanUrgency, { dot: string; bg: string; border: string; text: string; label: string }> = {
    routine: {
      dot: "bg-emerald-500",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      text: "text-emerald-700 dark:text-emerald-400",
      label: "Routine",
    },
    soon: {
      dot: "bg-amber-500",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      text: "text-amber-700 dark:text-amber-400",
      label: "Soon (within days)",
    },
    urgent: {
      dot: "bg-red-500",
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-200 dark:border-red-800",
      text: "text-red-700 dark:text-red-400",
      label: "Urgent (same day)",
    },
  };
  const uc = URG_STYLE[urgency] ?? URG_STYLE.routine;

  const summary =
    depth === "simple"
      ? result.plain_english_summary
      : depth === "medium"
      ? result.medium_summary
      : result.expert_summary;

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {previewUrl && (
            <div className="w-12 h-12 rounded-xl overflow-hidden flex-shrink-0 border border-surface-border bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Scan preview" className="w-full h-full object-cover" />
            </div>
          )}
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink truncate">Scan interpretation</p>
            <p className="text-xs text-ink-tertiary">Analysis complete</p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-sm font-medium text-sky-700 dark:text-sky-400 border border-sky-300/40 bg-sky-50 dark:bg-sky-900/20 hover:bg-sky-100 dark:hover:bg-sky-900/40 transition-all px-3 py-1.5 rounded-lg flex-shrink-0"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          Analyze another scan
        </button>
      </div>

      {/* Metadata pills */}
      <div className="flex flex-wrap gap-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-sky-50 dark:bg-sky-900/20 border border-sky-200 dark:border-sky-800 text-xs font-semibold text-sky-700 dark:text-sky-400">
          <span className="text-[10px] uppercase tracking-wider text-sky-500/70">Scan</span>
          {result.scan_type}
        </span>
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 text-xs font-semibold text-purple-700 dark:text-purple-400">
          <span className="text-[10px] uppercase tracking-wider text-purple-500/70">Region</span>
          {result.body_region}
        </span>
        <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full ${uc.bg} ${uc.border} border text-xs font-semibold ${uc.text}`}>
          <span className={`w-2 h-2 rounded-full ${uc.dot}`} />
          {uc.label}
        </span>
      </div>

      {result.image_quality && (
        <p className="text-xs text-ink-tertiary px-0.5">Image quality: {result.image_quality}</p>
      )}

      {/* Key findings */}
      {result.key_findings && result.key_findings.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm">
          <div className="px-5 py-3 border-b border-surface-border bg-surface-raised">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">Key Findings</p>
          </div>
          <ul className="p-5 space-y-2.5">
            {result.key_findings.map((f, i) => (
              <li key={i} className="flex gap-3 text-sm text-ink-secondary leading-relaxed">
                <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-sky-500" />
                <span>{f}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Areas of concern */}
      {result.areas_of_concern && result.areas_of_concern.length > 0 ? (
        <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5">
          <div className="flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-800/40 text-amber-600 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-amber-900 dark:text-amber-200 mb-2">Areas of concern</p>
              <ul className="space-y-2">
                {result.areas_of_concern.map((c, i) => (
                  <li key={i} className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed flex gap-2">
                    <span className="flex-shrink-0 mt-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
                    <span>{c}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      ) : (
        <div className="rounded-2xl border border-emerald-200 dark:border-emerald-800 bg-emerald-50 dark:bg-emerald-900/20 p-4 flex items-center gap-3">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-600 flex-shrink-0">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">No areas of concern identified</p>
        </div>
      )}

      {/* Normal structures (collapsible) */}
      {result.normal_structures && result.normal_structures.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm">
          <button
            onClick={() => setNormalsOpen((o) => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-surface-raised/60 transition-colors"
          >
            <span className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">
              Structures within normal limits ({result.normal_structures.length})
            </span>
            <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-ink-tertiary transition-transform ${normalsOpen ? "rotate-180" : ""}`}>
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {normalsOpen && (
            <ul className="px-5 pb-5 pt-1 space-y-2 border-t border-surface-border">
              {result.normal_structures.map((s, i) => (
                <li key={i} className="flex gap-3 text-sm text-ink-secondary leading-relaxed">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  <span>{s}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Summary with depth toggle */}
      <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm">
        <div className="border-b border-surface-border px-2 sm:px-5 pt-4 bg-surface-raised">
          <div className="flex">
            {(["simple", "medium", "expert"] as ScanDepth[]).map((tier) => {
              const cfg = TIER_CONFIG[tier];
              const isActive = tier === depth;
              const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
              return (
                <button
                  key={tier}
                  onClick={() => setDepth(tier)}
                  className={`flex-1 flex items-center justify-center gap-1.5 sm:gap-2 px-2 sm:px-4 py-2 sm:py-2.5 rounded-t-lg text-xs sm:text-sm font-semibold transition-all duration-200 ${
                    isActive ? cfg.activeClass : "text-ink-tertiary hover:text-ink-secondary hover:bg-surface-border/40"
                  }`}
                >
                  {cfg.icon}
                  {tierLabel}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-6">
          {summary.split(/\n+/).filter(Boolean).map((para, i) => (
            <p key={i} className="text-ink-secondary leading-relaxed text-sm sm:text-base mb-3 last:mb-0">{para}</p>
          ))}
        </div>
      </div>

      {/* Questions */}
      {result.questions_to_ask_doctor && result.questions_to_ask_doctor.length > 0 && (
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-surface-border bg-surface-raised flex items-center gap-2.5">
            <div className="w-6 h-6 rounded-lg bg-sky-100 dark:bg-sky-900/30 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400">
                <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
              </svg>
            </div>
            <p className="text-sm font-semibold text-ink">Questions to ask your doctor</p>
          </div>
          <ol className="p-5 space-y-3">
            {result.questions_to_ask_doctor.map((q, i) => (
              <li key={i} className="flex gap-3">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-sky-100 dark:bg-sky-900/40 text-sky-700 dark:text-sky-400 text-xs font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <p className="text-sm text-ink-secondary leading-relaxed flex-1">{q}</p>
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Disclaimer */}
      <p className="text-[11px] text-ink-tertiary text-center leading-relaxed px-4">
        {result.disclaimer}
      </p>
    </div>
  );
}

function ScanImageTab() {
  const [file, setFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [depth, setDepth] = useState<ScanDepth>("simple");
  const [scanType, setScanType] = useState<ScanTypeKey>("auto");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<ScanResult | null>(null);
  const [errorKind, setErrorKind] = useState<ScanErrorKind | null>(null);
  const [errorMsg, setErrorMsg] = useState<string>("");
  const [dragging, setDragging] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
  }, [previewUrl]);

  const ALLOWED = ["image/jpeg", "image/jpg", "image/png", "image/webp"];
  const MAX_SIZE = 10 * 1024 * 1024;

  const handlePick = (f: File) => {
    if (f.size > MAX_SIZE) {
      setErrorKind("file_too_large");
      setErrorMsg(`Your image is ${(f.size / (1024 * 1024)).toFixed(1)} MB — please upload an image under 10 MB.`);
      setState("error");
      return;
    }
    if (!ALLOWED.includes(f.type)) {
      setErrorKind("wrong_file_type");
      setErrorMsg("Please upload a JPG, PNG, or WEBP image.");
      setState("error");
      return;
    }
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(f);
    setPreviewUrl(URL.createObjectURL(f));
    setState("idle");
    setErrorKind(null);
    setErrorMsg("");
  };

  const handleAnalyze = async () => {
    if (!file) return;
    track("scan_image_uploaded", { fileType: file.type, fileSize: file.size, scanType });
    setState("loading");
    try {
      const fd = new FormData();
      fd.append("image", file);
      fd.append("depth", depth);
      fd.append("scan_type", scanType);
      const res = await fetch("/api/analyze-scan", { method: "POST", body: fd });
      const json = await res.json();

      if (!res.ok) {
        const kind: ScanErrorKind =
          json?.error === "file_too_large"
            ? "file_too_large"
            : json?.error === "wrong_file_type"
            ? "wrong_file_type"
            : "generic";
        setErrorKind(kind);
        setErrorMsg(json?.message ?? "Something went wrong. Please try again.");
        setState("error");
        return;
      }

      if (json?.error === "not_medical_image") {
        setErrorKind("not_medical_image");
        setErrorMsg(json.message ?? "This doesn't appear to be a medical scan.");
        setState("error");
        return;
      }
      if (json?.error === "insufficient_quality") {
        setErrorKind("insufficient_quality");
        setErrorMsg(json.message ?? "The image quality is insufficient for interpretation.");
        setState("error");
        return;
      }

      setResult(json.data as ScanResult);
      setState("success");
      track("scan_image_interpretation_complete");
    } catch {
      setErrorKind("generic");
      setErrorMsg("Something went wrong. Please try again.");
      setState("error");
    }
  };

  const handleReset = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null);
    setPreviewUrl(null);
    setResult(null);
    setState("idle");
    setErrorKind(null);
    setErrorMsg("");
    if (inputRef.current) inputRef.current.value = "";
  };

  if (state === "loading") return <ScanLoadingAnimation />;
  if (state === "error" && errorKind) {
    return <ScanErrorCard kind={errorKind} message={errorMsg} onReset={handleReset} />;
  }
  if (state === "success" && result) {
    return (
      <ScanResultsPanel
        result={result}
        depth={depth}
        setDepth={setDepth}
        previewUrl={previewUrl}
        onReset={handleReset}
      />
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-sky-500 mt-px flex-shrink-0">
          <path fillRule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
          <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-sky-700 dark:text-sky-300 leading-relaxed">
          Upload the actual scan image (X-ray, CT, MRI, ultrasound, mammogram). We&apos;ll interpret what&apos;s visible in the image itself.
        </p>
      </div>

      {/* Upload area */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          const f = e.dataTransfer.files[0];
          if (f) handlePick(f);
        }}
        onClick={() => !file && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 ${
          file
            ? "border-sky-400/40 bg-sky-50/60 dark:bg-sky-900/10 cursor-default"
            : dragging
            ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20 scale-[1.01] cursor-pointer"
            : "border-surface-border hover:border-sky-400/50 hover:bg-sky-50/30 dark:hover:bg-sky-900/10 cursor-pointer"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handlePick(f); }}
        />
        {file && previewUrl ? (
          <div className="p-5 flex flex-col sm:flex-row items-start sm:items-center gap-4">
            <div className="w-full sm:w-32 h-32 rounded-xl overflow-hidden flex-shrink-0 border border-surface-border bg-slate-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={previewUrl} alt="Scan preview" className="w-full h-full object-contain" />
            </div>
            <div className="flex-1 min-w-0 w-full">
              <p className="text-sm font-semibold text-ink truncate">{file.name}</p>
              <p className="text-xs text-ink-tertiary mt-0.5">{formatSize(file.size)}</p>
              <p className="text-xs text-sky-600 dark:text-sky-400 mt-1 font-medium">Ready to analyze</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); handleReset(); }}
              className="text-ink-tertiary hover:text-ink-secondary p-2 rounded-lg hover:bg-surface-raised flex-shrink-0 self-end sm:self-auto"
              aria-label="Remove image"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
          </div>
        ) : (
          <div className="p-12 flex flex-col items-center text-center">
            <div className="w-16 h-16 bg-surface-raised border border-surface-border rounded-2xl flex items-center justify-center mb-5">
              <svg viewBox="0 0 24 24" fill="none" className="w-8 h-8 text-ink-tertiary" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909m-18 3.75h16.5a1.5 1.5 0 001.5-1.5V6a1.5 1.5 0 00-1.5-1.5H3.75A1.5 1.5 0 002.25 6v12a1.5 1.5 0 001.5 1.5zm10.5-11.25h.008v.008h-.008V8.25zm.375 0a.375.375 0 11-.75 0 .375.375 0 01.75 0z" />
              </svg>
            </div>
            <p className="text-base font-semibold text-ink mb-1">Drop your scan image here</p>
            <p className="text-sm text-ink-secondary mb-4">or click to browse files</p>
            <div className="flex items-center gap-2 text-xs text-ink-tertiary">
              {["JPG", "PNG", "WEBP"].map((f) => (
                <span key={f} className="px-2 py-1 rounded-md bg-surface-raised border border-surface-border font-medium">{f}</span>
              ))}
              <span>· up to 10 MB</span>
            </div>
          </div>
        )}
      </div>

      {/* Scan type pills */}
      <div>
        <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2.5 px-0.5">Scan type</p>
        <div className="flex flex-wrap gap-2">
          {SCAN_TYPES.map((s) => {
            const active = s.key === scanType;
            return (
              <button
                key={s.key}
                onClick={() => setScanType(s.key)}
                className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all duration-150 border ${
                  active
                    ? "bg-sky-600 border-sky-600 text-white shadow-sm shadow-sky-600/20"
                    : "bg-white dark:bg-slate-800 border-surface-border text-ink-secondary hover:border-sky-400/50 hover:text-sky-700 dark:hover:text-sky-400"
                }`}
              >
                {s.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Depth selector */}
      <div>
        <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-2.5 px-0.5">Explanation depth</p>
        <div className="grid grid-cols-3 gap-2">
          {(["simple", "medium", "expert"] as ScanDepth[]).map((d) => {
            const labels: Record<ScanDepth, { label: string; sub: string }> = {
              simple: { label: "Simple", sub: "Plain language" },
              medium: { label: "Medium", sub: "Educated patient" },
              expert: { label: "Expert", sub: "Clinical detail" },
            };
            const active = d === depth;
            return (
              <button
                key={d}
                onClick={() => setDepth(d)}
                className={`flex flex-col items-center justify-center gap-0.5 px-2 py-3 rounded-xl border text-xs font-semibold transition-all duration-150 ${
                  active
                    ? "border-sky-500 bg-sky-50 dark:bg-sky-900/20 text-sky-700 dark:text-sky-400"
                    : "border-surface-border bg-white dark:bg-slate-800 text-ink-secondary hover:border-sky-400/40 hover:text-sky-700"
                }`}
              >
                <span>{labels[d].label}</span>
                <span className="text-[10px] font-normal text-ink-tertiary">{labels[d].sub}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Analyze button */}
      <button
        onClick={handleAnalyze}
        disabled={!file}
        className="w-full py-4 bg-sky-600 hover:bg-sky-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-base transition-all duration-200 shadow-lg shadow-sky-600/20 hover:shadow-sky-600/40 hover:-translate-y-0.5 disabled:hover:translate-y-0 disabled:hover:shadow-sky-600/20 flex items-center justify-center gap-2"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
        Analyze Scan
      </button>

      <p className="text-[11px] text-ink-tertiary text-center leading-relaxed">
        Your original image is discarded after analysis — only the AI interpretation is saved to your account. This is an AI-generated educational interpretation, not a radiological diagnosis.
      </p>
    </div>
  );
}

// ── Clerk auth bridge (mirrors the Lab Analyzer pattern) ────────────────────
function ClerkAuthBridge({ onChange }: { onChange: (loaded: boolean, signedIn: boolean) => void }) {
  const { isLoaded, isSignedIn } = useUser();
  useEffect(() => {
    onChange(isLoaded, !!isSignedIn);
  }, [isLoaded, isSignedIn, onChange]);
  return null;
}

// ── Main page ───────────────────────────────────────────────────────────────
export default function ImagingPage() {
  const t = useTranslations("Imaging");
  const { lang } = useLanguage();

  const [mainTab, setMainTab] = useState<"report" | "scan">("report");
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  useToolContext(result ? JSON.stringify(result) : null);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [fileSizeMB, setFileSizeMB] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string>("");
  const [activeTier, setActiveTier] = useState<Tier>("simple");

  const [clerkLoaded, setClerkLoaded] = useState(!AUTH_ENABLED);
  const [clerkSignedIn, setClerkSignedIn] = useState(false);
  const isSignedIn = AUTH_ENABLED && clerkSignedIn;
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);

  // Restore last anonymous result on mount (anonymous users only)
  const restoredRef = useRef(false);
  useEffect(() => {
    if (!clerkLoaded) return;
    if (isSignedIn) return;
    if (restoredRef.current) return;
    if (state !== "idle" || result !== null) return;
    const saved = readAnon();
    restoredRef.current = true;
    if (!saved) return;
    setResult(saved.result);
    setFileName(saved.fileName);
    setActiveTier(saved.activeTier);
    setState("success");
  }, [clerkLoaded, isSignedIn, state, result]);

  // Persist anonymous result so a refresh restores it
  useEffect(() => {
    if (!clerkLoaded) return;
    if (isSignedIn) return;
    if (state !== "success" || !result) return;
    writeAnon({ result, fileName, activeTier });
  }, [activeTier, clerkLoaded, isSignedIn, state, result, fileName]);

  const setError = (code: ErrorCode, sizeMB?: string) => {
    setErrorCode(code);
    setFileSizeMB(sizeMB);
    setState("error");
  };

  const handleFileSelect = async (file: File) => {
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileName(file.name);
      setError("FILE_TOO_LARGE", (file.size / (1024 * 1024)).toFixed(1));
      return;
    }
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setFileName(file.name);
      setError("WRONG_FILE_TYPE");
      return;
    }
    track("imaging_report_uploaded", { fileType: file.type, fileSize: file.size });
    setFileName(file.name);
    setState("loading");

    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("mode", "radiology");
      fd.append("language", lang);

      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok) {
        setError((json.errorCode as ErrorCode) ?? "SERVER_ERROR", json.fileSizeMB);
        return;
      }
      setResult(json.data);
      setState("success");
      track("imaging_interpretation_complete", { language: lang });

      // Save for signed-in users
      if (isSignedIn) {
        try {
          const extractedDate =
            typeof json.data?.report_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(json.data.report_date)
              ? json.data.report_date
              : null;
          const saveRes = await fetch("/api/save-analysis", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              analysis: json.data,
              flags: json.data?.flags ?? [],
              labs_raw: [],
              tier: "simple",
              summary: json.data?.summary_headline ?? json.data?.medium?.slice(0, 240) ?? null,
              patient_context: { language: lang },
              source_filename: file.name,
              health_score: null,
              report_date: extractedDate,
            }),
          });
          if (saveRes.ok) {
            const sj = await saveRes.json().catch(() => null);
            if (sj?.id) setSavedAnalysisId(sj.id);
          }
        } catch {
          /* save is best-effort */
        }
      }
    } catch {
      setError("NETWORK_ERROR");
    }
  };

  const handleReset = () => {
    setState("idle");
    setResult(null);
    setErrorCode(null);
    setFileSizeMB(undefined);
    setFileName("");
    setActiveTier("simple");
    setSavedAnalysisId(null);
    if (!isSignedIn) clearAnon();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-sky-50 to-white dark:from-slate-900 dark:to-slate-900 pt-24 pb-20">
      {AUTH_ENABLED && (
        <ClerkAuthBridge
          onChange={(loaded, signedIn) => { setClerkLoaded(loaded); setClerkSignedIn(signedIn); }}
        />
      )}

      <div className={`mx-auto px-4 sm:px-6 lg:px-8 ${result && state !== "loading" ? "max-w-3xl xl:max-w-6xl" : "max-w-3xl"}`}>
        {/* Page header */}
        <div className="text-center mb-8">
          <span className="chip text-sky-700 dark:text-sky-300 mb-5">
            <span className="kicker-mono">{t("heroBadge")}</span>
          </span>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-bold headline-accent tracking-tightest leading-[1.02]">
            <WordReveal text={t("heroTitle")} base={0.05} />{" "}
            <WordReveal text={t("heroHighlight")} startIndex={t("heroTitle").split(" ").length} base={0.05} wordClassName="headline-accent" />
          </h1>
          <p className="mt-4 text-base sm:text-lg text-ink-secondary max-w-xl mx-auto leading-relaxed text-pretty">{t("heroSubtitle")}</p>

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-emerald-500"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>, label: t("trustReportNeverStored") },
              { icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-sky-500"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>, label: t("trustFreeToTry") },
              { icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-amber-500"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>, label: t("trustResultsInSeconds") },
              { icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-violet-500"><path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" /></svg>, label: t("trust10Languages") },
            ].map((b) => (
              <span key={b.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-surface-border text-xs text-ink-secondary font-medium shadow-sm">
                {b.icon}
                {b.label}
              </span>
            ))}
          </div>

          {lang !== "en" && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-sky-700 bg-sky-50 dark:bg-sky-900/20 px-3 py-1.5 rounded-full border border-sky-200 dark:border-sky-800">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                <circle cx="10" cy="10" r="8" /><path d="M10 2c-2 3-2 13 0 16M10 2c2 3 2 13 0 16M2 10h16" strokeLinecap="round" />
              </svg>
              {t("resultsWillBeIn", { lang: LANGUAGES[lang]?.native ?? lang })}
            </div>
          )}
        </div>

        {/* Main card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-ink/5 dark:shadow-black/30 border border-surface-border p-6 sm:p-8">
          {/* Mode tabs — Report vs Scan Image */}
          <div className="mb-6 -mx-2 sm:-mx-3">
            <div role="tablist" aria-label="Imaging mode" className="flex gap-1 p-1 rounded-2xl bg-surface-raised border border-surface-border">
              {([
                {
                  id: "report" as const,
                  label: "Imaging Report",
                  sub: "Written report",
                  icon: (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h8a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm3 1h6v2H7V5zm0 4h6v1H7V9zm0 3h6v1H7v-1z" clipRule="evenodd" />
                    </svg>
                  ),
                },
                {
                  id: "scan" as const,
                  label: "Scan Image",
                  sub: "Actual scan",
                  icon: (
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
                      <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                    </svg>
                  ),
                },
              ]).map((tab) => {
                const active = mainTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setMainTab(tab.id)}
                    className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 sm:py-3 rounded-xl text-sm font-semibold transition-all duration-150 ${
                      active
                        ? "bg-white dark:bg-slate-700 text-sky-700 dark:text-sky-400 shadow-sm border border-sky-200/60 dark:border-sky-800/60"
                        : "text-ink-tertiary hover:text-ink-secondary"
                    }`}
                  >
                    {tab.icon}
                    <span className="flex flex-col items-start leading-tight">
                      <span>{tab.label}</span>
                      <span className={`text-[10px] font-normal ${active ? "text-sky-500/70 dark:text-sky-400/60" : "text-ink-tertiary/70"}`}>
                        {tab.sub}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {mainTab === "report" ? (
            state === "error" && errorCode ? (
              <ErrorCard code={errorCode} fileSizeMB={fileSizeMB} onReset={handleReset} />
            ) : state === "idle" ? (
              <div className="space-y-4">
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-sky-500 mt-px flex-shrink-0">
                    <path fillRule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                    <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                  </svg>
                  <p className="text-xs text-sky-700 dark:text-sky-300 leading-relaxed">{t("modeHint")}</p>
                </div>
                <UploadZone onFileSelect={handleFileSelect} />
              </div>
            ) : state === "loading" ? (
              <LoadingAnimation />
            ) : result ? (
              <ResultsPanel
                result={result}
                fileName={fileName}
                onReset={handleReset}
                activeTier={activeTier}
                setActiveTier={setActiveTier}
                savedAnalysisId={savedAnalysisId}
                isSignedIn={isSignedIn}
              />
            ) : null
          ) : (
            <ScanImageTab />
          )}
        </div>

        {/* Saved confirmation (signed-in users) */}
        {AUTH_ENABLED && isSignedIn && result && savedAnalysisId && (
          <div className="mt-4 animate-fade-in flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-600">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-ink">Saved to your account</p>
                <p className="text-xs text-ink-secondary mt-0.5">This imaging report is in your dashboard.</p>
              </div>
            </div>
            <Link href="/dashboard" className="text-xs font-semibold text-sky-700 dark:text-sky-400 hover:underline flex-shrink-0 whitespace-nowrap">
              View dashboard →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
