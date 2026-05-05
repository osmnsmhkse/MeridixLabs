"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";
import AppleHealthSection from "@/components/AppleHealthSection";
import NextStepBar from "@/components/NextStepBar";
import LabPanelBySystem from "@/components/LabPanelBySystem";
import LabChatPanel from "@/components/LabChatPanel";
import { track } from "@/lib/track";

const AUTH_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// ── Returning-user localStorage hook ─────────────────────────────────────────
const LS_KEY = "meridix_user";

interface UserData {
  firstVisit: string;
  lastVisit:  string;
  interpretationCount: number;
  saveBannerDismissed: boolean;
}

function readUserData(): UserData | null {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? (JSON.parse(raw) as UserData) : null;
  } catch { return null; }
}

function writeUserData(data: UserData) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(data)); } catch { /* noop */ }
}

function useReturningUser() {
  const [userData, setUserData] = useState<UserData | null>(null);
  const [daysSinceLastVisit, setDaysSinceLastVisit] = useState(0);

  useEffect(() => {
    const now = new Date().toISOString();
    const existing = readUserData();
    if (existing) {
      // Compute days from the STORED lastVisit before overwriting it
      const days = Math.floor(
        (Date.now() - new Date(existing.lastVisit).getTime()) / (1000 * 60 * 60 * 24)
      );
      setDaysSinceLastVisit(days);
      const updated = { ...existing, lastVisit: now };
      writeUserData(updated);
      setUserData(updated);
    }
    // If no data yet, only create entry on first completed analysis
  }, []);

  const recordInterpretation = useCallback(() => {
    const now = new Date().toISOString();
    const existing = readUserData();
    const updated: UserData = existing
      ? { ...existing, lastVisit: now, interpretationCount: existing.interpretationCount + 1 }
      : { firstVisit: now, lastVisit: now, interpretationCount: 1, saveBannerDismissed: false };
    writeUserData(updated);
    setUserData(updated);
  }, []);

  const dismissBanner = useCallback(() => {
    setUserData((prev) => {
      if (!prev) return prev;
      const updated = { ...prev, saveBannerDismissed: true };
      writeUserData(updated);
      return updated;
    });
  }, []);

  return { userData, recordInterpretation, dismissBanner, daysSinceLastVisit };
}

type Tier = "simple" | "medium" | "expert";
type ReportMode = "lab" | "radiology";
type ErrorCode =
  | "FILE_TOO_LARGE"
  | "WRONG_FILE_TYPE"
  | "NO_LAB_VALUES"
  | "NON_MEDICAL"
  | "NETWORK_ERROR"
  | "SERVER_ERROR";

interface AnalysisFlag {
  marker: string;
  value: string;
  unit: string;
  reference: string;
  status: "high" | "low" | "normal";
}

type OverallStatus = "normal" | "amber" | "red";
type UrgencyLevel = "routine" | "soon" | "weeks";

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
  labs?: AnalysisFlag[];
  medication_context?: string;
  health_insights?: string;
  supplements?: string;
  overall_status?: OverallStatus;
  summary_headline?: string;
  urgency?: UrgencyLevel;
}

// ── Anonymous-user analysis persistence (localStorage) ───────────────────────
// Signed-in users save through /api/save-analysis → Supabase. Anonymous users
// keep a snapshot of their most recent analysis on this device so refreshing
// the page (or coming back to /app later) restores their interpretation and
// chat history. Cleared on "New upload" or after 30 days.
const ANON_STORE_KEY = "meridix_anon_analysis_v1";
const ANON_TTL_MS = 30 * 24 * 60 * 60 * 1000; // 30 days

interface AnonAnalysis {
  result: AnalysisResult;
  fileName: string;
  isSample: boolean;
  reportMode: ReportMode;
  activeTier: Tier;
  savedAt: number;
}

function readAnonAnalysis(): AnonAnalysis | null {
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

function writeAnonAnalysis(data: Omit<AnonAnalysis, "savedAt">) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(
      ANON_STORE_KEY,
      JSON.stringify({ ...data, savedAt: Date.now() }),
    );
  } catch {
    /* quota or disabled */
  }
}

function clearAnonAnalysis() {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(ANON_STORE_KEY);
  } catch {
    /* noop */
  }
}

// ── Pre-built demo result (instant, no API call) ──────────────────────────────
const DEMO_RESULT: AnalysisResult = {
  overall_status: "amber",
  summary_headline: "Your glucose and LDL cholesterol are mildly elevated, and your vitamin D is low — common findings that are easy to address.",
  urgency: "weeks",
  simple: "Your blood test shows a few things worth paying attention to. Your blood sugar (glucose) is a little higher than ideal — not diabetes, but in a range your doctor will want to track. Your 'bad' cholesterol (LDL) is borderline high, and your vitamin D is low, which is very common if you spend most of your time indoors. The good news: all three of these respond really well to simple lifestyle changes like diet adjustments, more sunlight, and exercise.",
  medium: "The panel reveals three notable findings. Fasting glucose of 112 mg/dL falls in the impaired fasting glucose range (100–125 mg/dL per ADA criteria), suggesting possible early insulin resistance. LDL cholesterol at 134 mg/dL is borderline high per ATP-III guidelines (optimal <100, borderline 130–159). Vitamin D at 18 ng/mL is insufficient (optimal 30–100 ng/mL). Sodium is mildly low at 134 mEq/L — often a dietary or hydration issue. All other values including kidney function and liver markers are within normal range.",
  expert: "BMP findings: (1) Impaired fasting glucose — 112 mg/dL meets ADA criteria for prediabetes (IFG: 100–125). Recommend HbA1c for 3-month glycemic confirmation, fasting insulin, and HOMA-IR to assess insulin resistance. (2) Borderline LDL — 134 mg/dL. Per ACC/AHA 2019 guidelines, formal 10-year ASCVD risk assessment is indicated before initiating pharmacological therapy in the absence of established ASCVD. (3) Vitamin D insufficiency — 18 ng/mL. Supplementation with 2,000 IU cholecalciferol daily with recheck in 3 months. (4) Mild hyponatremia — 134 mEq/L. Likely euvolemic or dietary; reassess hydration status and sodium intake before pursuing SIADH or adrenal workup given no other corroborating findings.",
  etiology: "The elevated glucose is most commonly driven by a diet high in refined carbohydrates, physical inactivity, excess visceral fat, or family history of type 2 diabetes. Borderline LDL typically results from dietary saturated/trans fat intake, a sedentary lifestyle, or genetic predisposition (familial hypercholesterolemia). Low vitamin D is nearly universal in people who spend most of their time indoors — modern indoor lifestyles are the primary driver, with darker skin tone and higher body weight also contributing to reduced UV-B conversion.",
  mechanism: "Impaired fasting glucose reflects reduced peripheral insulin sensitivity or impaired first-phase insulin secretion from β-cells, resulting in insufficient suppression of hepatic glucose output after an overnight fast — the earliest detectable signal before frank type 2 diabetes develops. Elevated LDL reflects increased hepatic cholesterol synthesis or reduced LDL-receptor-mediated clearance; over time, cholesterol accumulates in arterial walls, initiating and propagating atherosclerosis. Vitamin D deficiency occurs when insufficient 7-dehydrocholesterol is converted to pre-vitamin D3 in skin via UV-B exposure, impairing downstream synthesis of calcitriol, which regulates calcium absorption, immune function, and insulin secretion.",
  diseases: "Prediabetes / early type 2 diabetes mellitus (glucose elevation), Metabolic syndrome (glucose + lipid pattern), Familial hypercholesterolemia (if LDL elevation is persistent and family history is positive), Hypothyroidism (can raise both glucose and LDL — worth ruling out with TSH), Vitamin D deficiency-related fatigue, immune dysfunction, and long-term bone health risk. Note: These are educational possibilities, not diagnoses.",
  specialist: "A Primary Care Physician or Internal Medicine specialist is the ideal first contact — they can order follow-up tests (HbA1c, TSH, repeat fasting lipid panel) and coordinate referrals. If prediabetes is confirmed, an Endocrinologist or Certified Diabetes Educator may be helpful. If LDL remains elevated after lifestyle changes, a Cardiologist or lipid specialist may be consulted.",
  action: "Schedule a follow-up with your doctor in the next few weeks. Ask about: (1) HbA1c to assess your 3-month average blood sugar, (2) Fasting lipid panel repeat, (3) TSH to rule out thyroid involvement, (4) Vitamin D supplementation dosing. In the meantime: reduce refined sugars, increase dietary fiber, get 20–30 minutes of moderate daily exercise, and consider a Vitamin D3 supplement with your doctor's guidance.",
  flags: [
    { marker: "Glucose", value: "112", unit: "mg/dL", reference: "70–99", status: "high" },
    { marker: "LDL Cholesterol", value: "134", unit: "mg/dL", reference: "< 100", status: "high" },
    { marker: "Vitamin D", value: "18", unit: "ng/mL", reference: "30–100", status: "low" },
    { marker: "Sodium", value: "134", unit: "mEq/L", reference: "136–145", status: "low" },
    { marker: "Creatinine", value: "0.9", unit: "mg/dL", reference: "0.7–1.2", status: "normal" },
    { marker: "TSH", value: "2.1", unit: "mIU/L", reference: "0.4–4.0", status: "normal" },
  ],
  labs: [
    { marker: "Glucose",         value: "112", unit: "mg/dL",  reference: "70-99",   status: "high"   },
    { marker: "HbA1c",           value: "5.8", unit: "%",      reference: "4-5.6",   status: "high"   },
    { marker: "LDL Cholesterol", value: "134", unit: "mg/dL",  reference: "<100",    status: "high"   },
    { marker: "HDL Cholesterol", value: "52",  unit: "mg/dL",  reference: ">40",     status: "normal" },
    { marker: "Total Cholesterol", value: "212", unit: "mg/dL", reference: "<200",   status: "high"   },
    { marker: "Triglycerides",   value: "128", unit: "mg/dL",  reference: "<150",    status: "normal" },
    { marker: "ALT",             value: "28",  unit: "U/L",    reference: "7-56",    status: "normal" },
    { marker: "AST",             value: "24",  unit: "U/L",    reference: "10-40",   status: "normal" },
    { marker: "Creatinine",      value: "0.9", unit: "mg/dL",  reference: "0.7-1.2", status: "normal" },
    { marker: "BUN",             value: "14",  unit: "mg/dL",  reference: "7-20",    status: "normal" },
    { marker: "TSH",             value: "2.1", unit: "mIU/L",  reference: "0.4-4.0", status: "normal" },
    { marker: "Vitamin D",       value: "18",  unit: "ng/mL",  reference: "30-100",  status: "low"    },
    { marker: "Vitamin B12",     value: "420", unit: "pg/mL",  reference: "211-911", status: "normal" },
    { marker: "Sodium",          value: "134", unit: "mEq/L",  reference: "136-145", status: "low"    },
    { marker: "Potassium",       value: "4.2", unit: "mEq/L",  reference: "3.5-5.1", status: "normal" },
    { marker: "Calcium",         value: "9.4", unit: "mg/dL",  reference: "8.5-10.2",status: "normal" },
    { marker: "Hemoglobin",      value: "14.8", unit: "g/dL",  reference: "13-17",   status: "normal" },
    { marker: "Hematocrit",      value: "44",  unit: "%",      reference: "40-53",   status: "normal" },
    { marker: "Platelets",       value: "245", unit: "10^3/μL",reference: "150-450", status: "normal" },
    { marker: "CRP",             value: "2.1", unit: "mg/L",   reference: "<5",      status: "normal" },
  ],
  supplements: "**Vitamin D3 (2,000 IU/day with a fatty meal):** Directly addresses your low Vitamin D of 18 ng/mL. Cholecalciferol (D3) is the most bioavailable form. Take with lunch or dinner for better absorption. Recheck blood levels in 3 months — your doctor may recommend a higher dose based on follow-up results.\n\n**Omega-3 Fatty Acids (1,000–2,000 mg EPA+DHA/day):** Targets your borderline LDL and supports cardiovascular health. Fish oil or algae-based omega-3s have strong clinical evidence for lowering triglycerides and reducing cardiovascular risk. Look for a product with >500 mg combined EPA+DHA per capsule.\n\n**Magnesium Glycinate (300 mg at bedtime):** Supports insulin sensitivity and glucose metabolism — directly relevant to your prediabetic glucose level. Magnesium also improves sleep quality, and poor sleep is independently associated with elevated blood sugar. The glycinate form is gentle on the stomach.\n\n**Berberine (500 mg twice daily with meals):** Has strong clinical evidence for improving insulin sensitivity and lowering fasting glucose — comparable to low-dose metformin in several studies. Discuss with your doctor before starting, as berberine can interact with certain medications.\n\n**Lifestyle (most impactful):** 150 minutes/week of moderate aerobic exercise (brisk walking, cycling, swimming). Even a 10-minute walk after meals measurably reduces postprandial glucose spikes. Reducing refined carbohydrates and increasing dietary fiber can improve all three flagged values — glucose, LDL, and Vitamin D absorption — within 8–12 weeks.",
};

const TIER_CONFIG: Record<Tier, { label: string; icon: React.ReactNode; audience: string; activeClass: string; inactiveIconClass: string }> = {
  simple: {
    label: "Simple",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
      </svg>
    ),
    audience: "Plain language",
    activeClass: "text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5",
    inactiveIconClass: "text-ink-tertiary",
  },
  medium: {
    label: "Medium",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
        <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
      </svg>
    ),
    audience: "Educated patient",
    activeClass: "text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5",
    inactiveIconClass: "text-ink-tertiary",
  },
  expert: {
    label: "Expert",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0">
        <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
    ),
    audience: "Clinical detail",
    activeClass: "text-purple-700 border-b-2 border-purple-500 bg-purple-500/5",
    inactiveIconClass: "text-ink-tertiary",
  },
};

// ── Error configuration ──────────────────────────────────────────────────────
interface ErrorConfig {
  icon: React.ReactNode;
  title: string;
  message: string;
  accent: string; // border + bg accent class pair
}

function getErrorConfig(code: ErrorCode, fileSizeMB?: string): ErrorConfig {
  const amberAccent = "border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20";
  const redAccent   = "border-red-200   dark:border-red-800   bg-red-50   dark:bg-red-900/20";

  const fileIcon = (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );

  switch (code) {
    case "FILE_TOO_LARGE":
      return {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
          </svg>
        ),
        title: "File too large",
        message: `Your file is ${fileSizeMB ?? "over 10"}MB — we accept up to 10MB. Try compressing the PDF or taking a cleaner photo.`,
        accent: amberAccent,
      };
    case "WRONG_FILE_TYPE":
      return {
        icon: fileIcon,
        title: "Unsupported file type",
        message: "We accept PDF, JPG, and PNG files. If your report is in another format, take a screenshot and upload that instead.",
        accent: amberAccent,
      };
    case "NO_LAB_VALUES":
      return {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 15.803a7.5 7.5 0 0010.607 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 9.75l-6 6M9 9.75l6 6" />
          </svg>
        ),
        title: "No lab values found",
        message:
          "We couldn't find recognizable lab values in this file. Make sure the image is clear and the report is a standard lab result (blood test, urine test, metabolic panel, etc.).",
        accent: amberAccent,
      };
    case "NON_MEDICAL":
      return {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.879 7.519c1.171-1.025 3.071-1.025 4.242 0 1.172 1.025 1.172 2.687 0 3.712-.203.179-.43.326-.67.442-.745.361-1.45.999-1.45 1.827v.75M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9 5.25h.008v.008H12v-.008z" />
          </svg>
        ),
        title: "Doesn't look like a lab report",
        message:
          "This doesn't look like a lab report. Meridix Labs works with blood tests, urine tests, metabolic panels, and similar clinical lab results.",
        accent: amberAccent,
      };
    case "NETWORK_ERROR":
    case "SERVER_ERROR":
    default:
      return {
        icon: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        ),
        title: "Something went wrong",
        message:
          "Something went wrong on our end. This happens occasionally — please try again. If it keeps happening, email us at contact@meridixlabs.com",
        accent: redAccent,
      };
  }
}

function ErrorCard({
  code,
  fileSizeMB,
  onReset,
}: {
  code: ErrorCode;
  fileSizeMB?: string;
  onReset: () => void;
}) {
  const cfg = getErrorConfig(code, fileSizeMB);
  const isAmber = cfg.accent.includes("amber");

  return (
    <div className={`rounded-2xl border p-6 ${cfg.accent} flex flex-col items-center text-center gap-4`}>
      {/* Icon circle */}
      <div className={`w-14 h-14 rounded-full flex items-center justify-center ${
        isAmber ? "bg-amber-100 dark:bg-amber-900/40 text-amber-600" : "bg-red-100 dark:bg-red-900/40 text-red-600"
      }`}>
        {cfg.icon}
      </div>

      {/* Text */}
      <div className="space-y-1.5 max-w-sm">
        <p className={`text-base font-bold ${isAmber ? "text-amber-900 dark:text-amber-200" : "text-red-900 dark:text-red-200"}`}>
          {cfg.title}
        </p>
        <p className={`text-sm leading-relaxed ${isAmber ? "text-amber-800 dark:text-amber-300" : "text-red-800 dark:text-red-300"}`}>
          {cfg.message}
        </p>
      </div>

      {/* Try Again */}
      <button
        onClick={onReset}
        className={`mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
          isAmber
            ? "bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:border-amber-300"
            : "bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700 text-red-700 dark:text-red-300 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300"
        }`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
        </svg>
        Try Again
      </button>
    </div>
  );
}

const LOADING_STEPS_LAB = [
  "Reading your report...",
  "Identifying lab values...",
  "Analyzing against clinical ranges...",
  "Generating your explanation...",
] as const;

const LOADING_STEPS_RADIOLOGY = [
  "Reading your report...",
  "Identifying imaging findings...",
  "Analyzing clinical significance...",
  "Generating your explanation...",
] as const;

// Delays (ms) at which each step becomes the active step
const STEP_DELAYS = [0, 1500, 3500, 6500] as const;

// Messages shown while the final step is still running (cycling every ~4s)
const PATIENCE_MESSAGES = [
  "This usually takes 10–20 seconds...",
  "Almost there — reading every value carefully...",
  "Complex reports take a little longer...",
  "Still working — your privacy is protected throughout...",
] as const;

type StepStatus = "waiting" | "active" | "done";

function StepRow({
  label,
  status,
}: {
  label: string;
  status: StepStatus;
}) {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const id = requestAnimationFrame(() => setVisible(true));
    return () => cancelAnimationFrame(id);
  }, []);

  if (status === "waiting") return null;

  return (
    <div
      className={`flex items-center gap-3 transition-all duration-500 ease-out ${
        visible ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-3"
      }`}
    >
      <div className="w-6 h-6 flex-shrink-0 flex items-center justify-center">
        {status === "active" ? (
          <div className="w-5 h-5 rounded-full border-2 border-brand-blue/25 border-t-brand-blue animate-spin" />
        ) : (
          <div className="w-5 h-5 rounded-full bg-emerald-500 flex items-center justify-center">
            <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
              <path
                d="M2.5 6l2.5 2.5 4.5-5"
                stroke="white"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>
      <span
        className={`text-sm leading-snug transition-colors duration-300 ${
          status === "active" ? "text-ink font-semibold" : "text-ink-secondary"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function LoadingAnimation({ mode }: { mode: ReportMode }) {
  const steps = mode === "radiology" ? LOADING_STEPS_RADIOLOGY : LOADING_STEPS_LAB;
  const [activeStep, setActiveStep] = useState(0);
  const [patienceIdx, setPatienceIdx] = useState(0);
  const [showPatience, setShowPatience] = useState(false);
  const [elapsedSec, setElapsedSec] = useState(0);

  // Advance through steps on a timer
  useEffect(() => {
    const timers = STEP_DELAYS.slice(1).map((delay, i) =>
      setTimeout(() => setActiveStep(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
  }, []);

  // After all steps are "active", show the patience message and cycle it
  useEffect(() => {
    const showTimer = setTimeout(() => setShowPatience(true), STEP_DELAYS[STEP_DELAYS.length - 1] + 1500);
    return () => clearTimeout(showTimer);
  }, []);

  useEffect(() => {
    if (!showPatience) return;
    const id = setInterval(() => {
      setPatienceIdx((prev) => (prev + 1) % PATIENCE_MESSAGES.length);
    }, 4000);
    return () => clearInterval(id);
  }, [showPatience]);

  // Elapsed time counter — shown after 8s so users know it's still running
  useEffect(() => {
    const id = setInterval(() => setElapsedSec((s) => s + 1), 1000);
    return () => clearInterval(id);
  }, []);

  const getStatus = (i: number): StepStatus => {
    if (i > activeStep) return "waiting";
    if (i === activeStep) return "active";
    return "done";
  };

  return (
    <div className="py-10 px-4 flex flex-col items-center gap-8">
      {/* Step list */}
      <div className="w-full max-w-xs space-y-4">
        {steps.map((label, i) => (
          <StepRow key={i} label={label} status={getStatus(i)} />
        ))}
      </div>

      {/* Shimmer skeleton preview */}
      <div className="w-full max-w-xs space-y-2.5 pt-1">
        {[92, 78, 85].map((w, i) => (
          <div key={i} className="h-2.5 rounded-full shimmer" style={{ width: `${w}%` }} />
        ))}
      </div>

      {/* Patience message — fades in after last step is reached */}
      <div className={`text-center transition-opacity duration-700 ${showPatience ? "opacity-100" : "opacity-0"}`}>
        <p className="text-xs text-ink-secondary font-medium transition-all duration-500">
          {PATIENCE_MESSAGES[patienceIdx]}
        </p>
        {elapsedSec >= 8 && (
          <p className="text-[11px] text-ink-tertiary mt-1">
            {elapsedSec}s elapsed · still running
          </p>
        )}
      </div>

      {/* Privacy reassurance */}
      <p className="text-xs text-ink-tertiary text-center max-w-[280px] leading-relaxed">
        Your file is never stored. Only the AI interpretation is saved to your account.
      </p>
    </div>
  );
}

// ── Confidence signal helpers ─────────────────────────────────────────────────

type ConfidenceLevel = "borderline" | "abnormal" | "normal";

const BORDERLINE_PHRASES = [
  "borderline",
  "mildly elevated",
  "slightly elevated",
  "mildly low",
  "slightly low",
  "mild increase",
  "mild decrease",
  "trending",
  "within range but",
  "marginally",
  "just above",
  "just below",
  "slightly above",
  "slightly below",
  "mildly abnormal",
  "mildly raised",
  "mildly reduced",
  "mildly increased",
  "mildly decreased",
];

function parseRefBounds(ref: string): { lo: number; hi: number } | null {
  // "70–99" / "70-99" / "70 - 99"
  const rangePat = ref.match(/(\d+\.?\d*)\s*[–\-]\s*(\d+\.?\d*)/);
  if (rangePat) return { lo: parseFloat(rangePat[1]), hi: parseFloat(rangePat[2]) };
  // "> 60" / "≥60"
  const gtPat = ref.match(/[>≥]\s*(\d+\.?\d*)/);
  if (gtPat) return { lo: parseFloat(gtPat[1]), hi: Infinity };
  // "< 150" / "≤150"
  const ltPat = ref.match(/[<≤]\s*(\d+\.?\d*)/);
  if (ltPat) return { lo: 0, hi: parseFloat(ltPat[1]) };
  return null;
}

// Combines numeric proximity (within 10% of boundary) and text-signal scanning.
function computeConfidence(flag: AnalysisFlag, interpretationText: string): ConfidenceLevel {
  const val = parseFloat(flag.value);
  const bounds = parseRefBounds(flag.reference);

  // ── 1. Numeric proximity — abnormal values within 10% of the boundary ──────
  if (!isNaN(val) && bounds) {
    const { lo, hi } = bounds;
    if (flag.status === "high" && isFinite(hi) && hi > 0) {
      if ((val - hi) / hi <= 0.10) return "borderline";
    }
    if (flag.status === "low" && lo > 0) {
      if ((lo - val) / lo <= 0.10) return "borderline";
    }
  }

  // ── 2. Text signal — look for borderline phrases near the marker name ───────
  const lowerText = interpretationText.toLowerCase();
  const lowerMarker = flag.marker.toLowerCase();
  const markerIdx = lowerText.indexOf(lowerMarker);

  if (markerIdx !== -1) {
    // Scan a 200-char window centred on the first mention of the marker
    const excerpt = lowerText.slice(Math.max(0, markerIdx - 100), markerIdx + 100);
    if (BORDERLINE_PHRASES.some((p) => excerpt.includes(p))) return "borderline";
  }

  // ── 3. Default from status ───────────────────────────────────────────────────
  if (flag.status === "normal") return "normal";
  return "abnormal";
}

// ── Confidence pill ───────────────────────────────────────────────────────────

function ConfidencePill({ confidence, status }: { confidence: ConfidenceLevel; status: AnalysisFlag["status"] }) {
  if (confidence === "borderline") {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-yellow-50 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-800 text-yellow-700 dark:text-yellow-300 text-[10px] font-bold leading-none whitespace-nowrap">
        ⚠ Borderline
      </span>
    );
  }
  if (confidence === "abnormal") {
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-[10px] font-bold leading-none whitespace-nowrap">
        {status === "high" ? "↑" : "↓"} Abnormal
      </span>
    );
  }
  // normal
  return (
    <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 text-green-600 dark:text-green-400 text-[10px] font-bold leading-none whitespace-nowrap">
      ✓ Normal
    </span>
  );
}

// ── Range Gauge ───────────────────────────────────────────────────────────────

function RangeGauge({
  value,
  min,
  max,
}: {
  value: number;
  min: number;
  max: number;
  unit: string;
}) {
  const range = max - min;
  if (range <= 0) return null;

  const pad      = range * 0.28;
  const dispMin  = min - pad;
  const dispMax  = max + pad;
  const dispRange = dispMax - dispMin;

  const clampedVal = Math.max(dispMin + dispRange * 0.01, Math.min(dispMax - dispRange * 0.01, value));
  const valPct     = ((clampedVal - dispMin) / dispRange) * 100;
  const refMinPct  = ((min - dispMin) / dispRange) * 100;
  const refMaxPct  = ((max - dispMin) / dispRange) * 100;

  const fillStartPct = Math.min(refMinPct, valPct);
  const fillWidthPct = Math.abs(valPct - refMinPct);

  const threshold = range * 0.15;
  const color =
    value < min || value > max                              ? "red"
    : value <= min + threshold || value >= max - threshold  ? "amber"
    :                                                         "green";

  const c = {
    green: { fill: "bg-emerald-400 dark:bg-emerald-500", dot: "bg-emerald-500 dark:bg-emerald-400", zone: "bg-emerald-200/60 dark:bg-emerald-800/30" },
    amber: { fill: "bg-amber-400 dark:bg-amber-500",     dot: "bg-amber-500 dark:bg-amber-400",     zone: "bg-amber-200/60 dark:bg-amber-800/30" },
    red:   { fill: "bg-red-400 dark:bg-red-500",         dot: "bg-red-500 dark:bg-red-400",         zone: "bg-red-200/40 dark:bg-red-900/20" },
  }[color];

  return (
    <div className="select-none pt-1">
      {/* Track */}
      <div className="relative h-2 rounded-full bg-black/8 dark:bg-white/10">
        {/* Normal zone highlight */}
        <div
          className={`absolute top-0 h-full rounded-full ${c.zone}`}
          style={{ left: `${refMinPct}%`, width: `${refMaxPct - refMinPct}%` }}
        />
        {/* Colored fill from ref-start toward value */}
        <div
          className={`absolute top-0 h-full rounded-full ${c.fill} opacity-75`}
          style={{ left: `${fillStartPct}%`, width: `${fillWidthPct}%` }}
        />
        {/* Marker dot */}
        <div
          className="absolute top-1/2 z-10 -translate-y-1/2 -translate-x-1/2"
          style={{ left: `${valPct}%` }}
        >
          <div className={`w-4 h-4 rounded-full ring-2 ring-white dark:ring-slate-800 shadow-md ${c.dot}`} />
        </div>
      </div>

      {/* Labels row — left = min, center = "Normal zone", right = max */}
      <div className="flex items-center justify-between mt-2 px-0.5">
        <span className="text-[9px] text-ink-tertiary tabular-nums">{min}</span>
        <span className="text-[9px] text-ink-tertiary/60 tracking-wide">normal range</span>
        <span className="text-[9px] text-ink-tertiary tabular-nums">{max}</span>
      </div>
    </div>
  );
}

// ── Flag badge ────────────────────────────────────────────────────────────────

function FlagBadge({ flag, confidence }: { flag: AnalysisFlag; confidence: ConfidenceLevel }) {
  const cfg = {
    high: {
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      valueColor: "text-amber-600 dark:text-amber-400",
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      iconColor: "text-amber-600 dark:text-amber-400",
      icon: (
        <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
          <path d="M6 2l4 8H2L6 2z"/>
        </svg>
      ),
    },
    low: {
      bg: "bg-sky-50 dark:bg-sky-900/20",
      border: "border-sky-200 dark:border-sky-800",
      valueColor: "text-sky-600 dark:text-sky-400",
      iconBg: "bg-sky-100 dark:bg-sky-900/40",
      iconColor: "text-sky-600 dark:text-sky-400",
      icon: (
        <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
          <path d="M6 10L2 2h8L6 10z"/>
        </svg>
      ),
    },
    normal: {
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      valueColor: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      icon: (
        <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3">
          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 1.414l-6 6a1 1 0 01-1.414 0l-3-3a1 1 0 111.414-1.414L5 8.586l5.293-5.293z" clipRule="evenodd"/>
        </svg>
      ),
    },
  }[flag.status];

  const bounds   = parseRefBounds(flag.reference);
  const numValue = parseFloat(flag.value);
  const showGauge =
    bounds !== null &&
    isFinite(bounds.lo) &&
    isFinite(bounds.hi) &&
    !isNaN(numValue) &&
    bounds.hi > bounds.lo;

  return (
    <div className={`flex flex-col gap-3 p-4 rounded-xl ${cfg.bg} border ${cfg.border}`}>

      {/* Row 1: status icon + marker name — full width, no truncation */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 ${cfg.iconBg} ${cfg.iconColor}`}>
            {cfg.icon}
          </span>
          <span className="text-sm font-bold text-ink leading-tight">{flag.marker}</span>
        </div>
        <ConfidencePill confidence={confidence} status={flag.status} />
      </div>

      {/* Row 2: large value + ref range */}
      <div className="flex items-end justify-between gap-2">
        <div>
          <span className={`text-2xl font-extrabold tracking-tight leading-none ${cfg.valueColor}`}>
            {flag.value}
          </span>
          <span className={`text-xs font-semibold ml-1.5 ${cfg.valueColor} opacity-80`}>
            {flag.unit}
          </span>
        </div>
        {flag.reference && (
          <span className="text-[11px] text-ink-tertiary bg-white/60 dark:bg-slate-700/60 px-2 py-0.5 rounded-md border border-surface-border/50 flex-shrink-0">
            ref {flag.reference}
          </span>
        )}
      </div>

      {/* Row 3: gauge bar — no floating label, clean lines */}
      {showGauge && (
        <RangeGauge value={numValue} min={bounds!.lo} max={bounds!.hi} unit={flag.unit} />
      )}
    </div>
  );
}

// Pulls the first recognisable specialist title out of free-form AI text.
// e.g. "Consider seeing an Endocrinologist for…" → "Endocrinologist"
function extractSpecialist(text: string): string {
  const known = [
    "Endocrinologist","Cardiologist","Nephrologist","Gastroenterologist",
    "Neurologist","Pulmonologist","Rheumatologist","Oncologist","Urologist",
    "Dermatologist","Ophthalmologist","Orthopedist","Psychiatrist",
    "Hematologist","Hepatologist","Allergist","Immunologist","Gynecologist",
    "Obstetrician","Pediatrician","Geriatrician","Vascular Surgeon",
    "General Practitioner","Internal Medicine Physician","Primary Care Physician",
    "Infectious Disease Specialist","Sleep Specialist",
  ];
  for (const s of known) {
    if (text.toLowerCase().includes(s.toLowerCase())) return s;
  }
  // Fallback: grab first word ending in common specialist suffixes
  const m = text.match(/\b([A-Z][a-z]+(?:ologist|iatrist|ician|surgeon|ist))\b/);
  return m ? m[1] : "specialist";
}

// ── Supplements & Lifestyle Section ──────────────────────────────────────────
function SupplementsSection({ supplements }: { supplements: string }) {
  const items = supplements.split(/\n\n+/).filter(Boolean);

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-emerald-200 dark:border-emerald-800/50 overflow-hidden shadow-sm">
      {/* Header */}
      <div className="px-5 py-3.5 border-b border-emerald-100 dark:border-emerald-800/30 bg-emerald-50/60 dark:bg-emerald-900/10 flex items-center gap-2.5">
        <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
            <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-xs font-bold text-emerald-800 dark:text-emerald-300 uppercase tracking-wider">Supplements &amp; Lifestyle</p>
          <p className="text-[10px] text-emerald-600 dark:text-emerald-500">Personalized to your flagged values</p>
        </div>
        <span className="text-[10px] bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded-full font-semibold border border-emerald-200 dark:border-emerald-800">
          {items.length} recommendations
        </span>
      </div>

      {/* Items */}
      <div className="divide-y divide-surface-border">
        {items.map((item, i) => {
          const match = item.match(/^\*\*([^*]+)\*\*:?\s*([\s\S]*)$/);
          const title = match ? match[1].trim() : "";
          const body = match ? match[2].trim() : item;
          return (
            <div key={i} className="p-4 flex gap-3 hover:bg-surface-raised/40 transition-colors">
              <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 mt-0.5 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                {i + 1}
              </div>
              <div className="min-w-0">
                {title && <p className="text-sm font-semibold text-ink mb-1">{title}</p>}
                <p className="text-sm text-ink-secondary leading-relaxed">{body}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer disclaimer */}
      <div className="px-5 py-3 border-t border-surface-border bg-surface-raised flex items-center gap-2">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-ink-tertiary flex-shrink-0">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        <p className="text-[10px] text-ink-tertiary">These are educational suggestions only. Always consult your doctor before starting any supplement.</p>
      </div>
    </div>
  );
}

function DeepDiveSection({ result, mode }: { result: AnalysisResult; mode: ReportMode }) {
  const [open, setOpen] = useState(true);

  const isRadiology = mode === "radiology";

  const sections = [
    {
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      color: "text-amber-600 bg-amber-50",
      label: isRadiology ? "What Could Cause This Finding" : "Possible Causes",
      sublabel: isRadiology ? "Conditions that can produce this imaging appearance" : "What could lead to these results?",
      content: result.etiology,
    },
    {
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
      ),
      color: "text-brand-blue bg-brand-blue-light",
      label: isRadiology ? "What's Happening in the Tissue" : "Body Mechanism",
      sublabel: isRadiology ? "The biological process behind the imaging finding" : "What's happening inside your body?",
      content: result.mechanism,
    },
    {
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      ),
      color: "text-purple-600 bg-purple-50",
      label: isRadiology ? "Possible Diagnoses" : "Associated Conditions",
      sublabel: isRadiology ? "What conditions are on the differential?" : "What conditions could be related?",
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
        <div className="flex items-center gap-2.5">
          <span className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">Deep Dive Analysis</span>
          <span className="text-xs bg-brand-blue text-white px-2 py-0.5 rounded-full font-semibold">NEW</span>
        </div>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-ink-tertiary transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="divide-y divide-surface-border">
          {/* Specialist — prominent card at top */}
          {result.specialist && (() => {
            const specialist = extractSpecialist(result.specialist);
            const mapsUrl  = `https://www.google.com/maps/search/${encodeURIComponent(specialist + " near me")}`;
            const zocdocUrl = `https://www.zocdoc.com/search?dr_specialty=${encodeURIComponent(specialist)}`;
            return (
              <div className="p-5 bg-brand-blue-light/50 dark:bg-brand-blue/5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
                      <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                    </svg>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-1">Which Specialist to See</p>
                    <p className="text-sm text-ink-secondary leading-relaxed mb-3">{result.specialist}</p>

                    {/* Action buttons */}
                    <div className="flex flex-wrap gap-2">
                      <a
                        href={mapsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track("specialist_link_clicked", { specialist, destination: "maps" })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-brand-blue/30 text-brand-blue hover:bg-brand-blue hover:text-white text-xs font-semibold transition-all duration-150"
                      >
                        {/* Map pin icon */}
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                          <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                        </svg>
                        Find one near you →
                      </a>
                      <a
                        href={zocdocUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={() => track("specialist_link_clicked", { specialist, destination: "zocdoc" })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-ink-secondary hover:border-brand-blue/30 hover:text-brand-blue hover:bg-brand-blue-light text-xs font-semibold transition-all duration-150"
                      >
                        {/* Calendar icon */}
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                        </svg>
                        Book on Zocdoc →
                      </a>
                    </div>

                    {/* Non-endorsement note */}
                    <p className="mt-2 text-[10px] text-ink-tertiary">
                      Meridix Labs does not endorse any specific provider.
                    </p>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Other deep dive sections */}
          {sections.map((section, i) => (
            <div key={i} className="p-5">
              <div className="flex items-start gap-3">
                <div className={`w-9 h-9 rounded-xl ${section.color} flex items-center justify-center flex-shrink-0`}>
                  {section.icon}
                </div>
                <div>
                  <p className="text-sm font-semibold text-ink mb-0.5">{section.label}</p>
                  <p className="text-xs text-ink-tertiary mb-2">{section.sublabel}</p>
                  <p className="text-sm text-ink-secondary leading-relaxed">{section.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Clinical Trials Section ───────────────────────────────────────────────────

interface TrialCategory {
  condition: string;
  condition_query: string;
  description: string;
  url: string;
}

function ClinicalTrialsSection({ flags }: { flags: AnalysisFlag[] }) {
  const [open, setOpen]           = useState(false);
  const [trials, setTrials]       = useState<TrialCategory[] | null>(null);
  const [loading, setLoading]     = useState(false);
  const [error, setError]         = useState<string | null>(null);

  const abnormalFlags = flags.filter((f) => f.status !== "normal");
  if (abnormalFlags.length === 0) return null;

  const fetchTrials = async () => {
    if (trials) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/clinical-trials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ flags }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not load trial categories.");
      setTrials(json.trials as TrialCategory[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !trials && !loading) fetchTrials();
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm print:hidden">
      {/* Header */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-raised/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base leading-none">📋</span>
          <span className="text-sm font-semibold text-ink">Relevant clinical trials</span>
          <span className="hidden sm:inline-flex items-center gap-1 text-xs text-ink-tertiary border border-surface-border rounded-full px-2.5 py-0.5 bg-surface-raised ml-1">
            {open && trials ? `${trials.length} condition${trials.length !== 1 ? "s" : ""}` : "Click to explore"}
          </span>
        </div>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-ink-tertiary transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="border-t border-surface-border">
          {/* Loading */}
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 px-5">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 border-[3px] border-brand-blue/20 rounded-full" />
                <div className="absolute inset-0 border-[3px] border-brand-blue border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm text-ink-secondary font-medium">Finding relevant trial categories…</p>
              <p className="text-xs text-ink-tertiary">Matching your flagged values to known condition types</p>
            </div>
          )}

          {/* Error */}
          {error && !loading && (
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => { setError(null); fetchTrials(); }}
                className="w-full py-2.5 rounded-xl border border-surface-border text-sm font-semibold text-ink-secondary hover:text-ink hover:border-brand-blue/30 hover:bg-brand-blue-light transition-all duration-150"
              >
                Try again
              </button>
            </div>
          )}

          {/* Results */}
          {trials && !loading && (
            <div className="p-5 space-y-4">
              {/* Context note */}
              <p className="text-xs text-ink-tertiary leading-relaxed">
                Based on your flagged lab values, the following condition categories commonly have active clinical trials you may be eligible to explore.
              </p>

              {/* Trial cards */}
              <div className="space-y-3">
                {trials.map((trial, i) => (
                  <div
                    key={i}
                    className="rounded-xl border border-surface-border bg-surface-raised/50 hover:border-brand-blue/30 hover:bg-brand-blue-light/30 transition-all duration-150 overflow-hidden"
                  >
                    <div className="px-4 py-3.5 flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {/* Condition name */}
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="flex-shrink-0 w-5 h-5 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-bold flex items-center justify-center">
                            {i + 1}
                          </span>
                          <p className="text-sm font-semibold text-ink truncate">{trial.condition}</p>
                        </div>
                        {/* Description */}
                        <p className="text-xs text-ink-secondary leading-relaxed pl-7">
                          {trial.description}
                        </p>
                      </div>

                      {/* External link */}
                      <a
                        href={trial.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-blue hover:bg-brand-blue-hover text-white text-xs font-semibold transition-colors mt-0.5"
                        aria-label={`Search ClinicalTrials.gov for ${trial.condition}`}
                      >
                        Search trials
                        <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                          <path fillRule="evenodd" d="M4.22 11.78a.75.75 0 010-1.06l5.72-5.72H6.75a.75.75 0 010-1.5h5.5a.75.75 0 01.75.75v5.5a.75.75 0 01-1.5 0V6.06l-5.72 5.72a.75.75 0 01-1.06 0z" clipRule="evenodd" />
                        </svg>
                      </a>
                    </div>

                    {/* ClinicalTrials.gov footer strip */}
                    <div className="px-4 py-2 border-t border-surface-border/60 bg-surface-raised flex items-center gap-1.5">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-ink-tertiary flex-shrink-0">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                      </svg>
                      <p className="text-[10px] text-ink-tertiary">
                        Opens <strong>ClinicalTrials.gov</strong> — NIH&apos;s official registry of clinical studies
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              {/* Disclaimer */}
              <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                  <strong>Eligibility for any trial must be determined by a physician.</strong> Meridix Labs does not endorse any specific trial or institution. These links open an independent, publicly accessible database maintained by the NIH.
                </p>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function DoctorQuestionsSection({
  result,
  mode,
  lang,
}: {
  result: AnalysisResult;
  mode: ReportMode;
  lang: string;
}) {
  const [open, setOpen]               = useState(false);
  const [questions, setQuestions]     = useState<string[] | null>(null);
  const [loading, setLoading]         = useState(false);
  const [error, setError]             = useState<string | null>(null);
  const [copiedAll, setCopiedAll]     = useState(false);

  const generate = async () => {
    if (questions) return; // already generated — don't re-fetch
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          flags:     result.flags   ?? [],
          specialist: result.specialist,
          action:    result.action,
          simple:    result.simple,
          language:  lang,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Could not generate questions.");
      setQuestions(json.questions as string[]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const next = !open;
    setOpen(next);
    if (next && !questions && !loading) generate();
  };

  const handleCopyAll = async () => {
    if (!questions) return;
    const text = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  return (
    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm print:hidden">
      {/* Header — always visible, toggles section */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-raised/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <div className="w-6 h-6 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-brand-blue">
              <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
            </svg>
          </div>
          <span className="text-sm font-semibold text-ink">Questions to bring to your doctor</span>
          {!open && !questions && (
            <span className="hidden sm:inline-flex items-center gap-1 text-xs text-ink-tertiary border border-surface-border rounded-full px-2.5 py-0.5 bg-surface-raised ml-1">
              Click to generate
            </span>
          )}
          {questions && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">
              {questions.length} ready
            </span>
          )}
        </div>
        <svg
          viewBox="0 0 20 20"
          fill="currentColor"
          className={`w-4 h-4 text-ink-tertiary transition-transform duration-200 flex-shrink-0 ${open ? "rotate-180" : ""}`}
        >
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {/* Expanded body */}
      {open && (
        <div className="border-t border-surface-border">
          {loading && (
            <div className="flex flex-col items-center justify-center gap-3 py-10 px-5">
              <div className="relative w-10 h-10">
                <div className="absolute inset-0 border-3 border-brand-blue/20 rounded-full" />
                <div className="absolute inset-0 border-[3px] border-brand-blue border-t-transparent rounded-full animate-spin" />
              </div>
              <p className="text-sm text-ink-secondary font-medium">Crafting your questions…</p>
              <p className="text-xs text-ink-tertiary">Tailoring to your specific results</p>
            </div>
          )}

          {error && !loading && (
            <div className="p-5 space-y-3">
              <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-red-50 border border-red-100">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-red-700">{error}</p>
              </div>
              <button
                onClick={() => { setError(null); generate(); }}
                className="w-full py-2.5 rounded-xl border border-surface-border text-sm font-semibold text-ink-secondary hover:text-ink hover:border-brand-blue/30 hover:bg-brand-blue-light transition-all duration-150"
              >
                Try again
              </button>
            </div>
          )}

          {questions && !loading && (
            <div className="p-5 space-y-4">
              {/* Intro note */}
              <p className="text-xs text-ink-tertiary leading-relaxed">
                These questions are tailored to your specific results. Bring this list to your next appointment — you can copy them below.
              </p>

              {/* Numbered questions */}
              <ol className="space-y-3">
                {questions.map((q, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 w-6 h-6 rounded-full bg-brand-blue/10 text-brand-blue text-xs font-bold flex items-center justify-center mt-0.5">
                      {i + 1}
                    </span>
                    <p className="text-sm text-ink-secondary leading-relaxed flex-1">{q}</p>
                  </li>
                ))}
              </ol>

              {/* Copy all button */}
              <button
                onClick={handleCopyAll}
                className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 ${
                  copiedAll
                    ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                    : "border-surface-border bg-surface-raised hover:border-brand-blue/30 hover:bg-brand-blue-light text-ink-secondary hover:text-brand-blue"
                }`}
              >
                {copiedAll ? (
                  <>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                    </svg>
                    Copied!
                  </>
                ) : (
                  <>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                      <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                    </svg>
                    Copy all questions
                  </>
                )}
              </button>

              {/* Regenerate link */}
              <button
                onClick={() => { setQuestions(null); generate(); }}
                className="w-full text-xs text-ink-tertiary hover:text-ink-secondary transition-colors py-1"
              >
                ↻ Generate different questions
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function EmailSection({ result }: { result: AnalysisResult }) {
  const [open, setOpen]       = useState(false);
  const [email, setEmail]     = useState("");
  const [status, setStatus]   = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [errMsg, setErrMsg]   = useState("");

  const handleSend = async () => {
    if (!email.trim()) return;
    setStatus("sending");
    setErrMsg("");
    try {
      const res = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email:           email.trim(),
          mode:            "lab",
          overall_status:  result.overall_status,
          summary_headline: result.summary_headline,
          urgency:         result.urgency,
          simple:          result.simple,
          specialist:      result.specialist,
          action:          result.action,
          flags:           result.flags ?? [],
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to send.");
      track("email_sent");
      setStatus("sent");
    } catch (err) {
      setErrMsg(err instanceof Error ? err.message : "Something went wrong.");
      setStatus("error");
    }
  };

  return (
    <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-800 overflow-hidden shadow-sm print:hidden">
      {/* Header toggle */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-raised/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          {/* Mail icon */}
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 text-brand-blue flex-shrink-0">
            <rect x="2" y="4" width="20" height="16" rx="2" />
            <path d="m22 7-8.97 5.7a1.94 1.94 0 01-2.06 0L2 7" />
          </svg>
          <span className="text-sm font-semibold text-ink">Email this to myself</span>
          {status === "sent" && (
            <span className="text-xs bg-emerald-100 text-emerald-700 px-2 py-0.5 rounded-full font-semibold">Sent!</span>
          )}
        </div>
        <svg
          viewBox="0 0 20 20" fill="currentColor"
          className={`w-4 h-4 text-ink-tertiary transition-transform duration-200 ${open ? "rotate-180" : ""}`}
        >
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
                <p className="text-sm font-semibold text-emerald-800 dark:text-emerald-300">Sent! Check your inbox.</p>
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
                  onKeyDown={(e) => e.key === "Enter" && handleSend()}
                  disabled={status === "sending"}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-900 text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-sm disabled:opacity-50"
                />
                <button
                  onClick={handleSend}
                  disabled={status === "sending" || !email.trim()}
                  className="px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-hover disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all duration-200 flex items-center gap-2 flex-shrink-0"
                >
                  {status === "sending" ? (
                    <>
                      <svg className="w-3.5 h-3.5 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                      Sending…
                    </>
                  ) : "Send"}
                </button>
              </div>

              {status === "error" && (
                <p className="text-xs text-red-600 dark:text-red-400">{errMsg}</p>
              )}

              <p className="text-[11px] text-ink-tertiary flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 flex-shrink-0">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                We don&apos;t store your email. The full report file is never sent — only the AI interpretation.
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}

function ShareSection({ simple }: { simple: string }) {
  const [copied, setCopied] = useState(false);

  const shareText = `Here's a summary of my lab results from Meridix Labs:\n\n${simple}\n\nFull interpretation at meridixlabs.com`;

  const handleWhatsApp = () => {
    track("share_whatsapp");
    const url = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  const handleCopy = async () => {
    await navigator.clipboard.writeText(shareText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-800 overflow-hidden shadow-sm print:hidden">
      <div className="px-5 py-3.5 border-b border-surface-border bg-surface-raised flex items-center gap-2">
        {/* Share icon */}
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5 text-ink-tertiary">
          <circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" />
          <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" /><line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
        </svg>
        <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">Share with family</p>
      </div>
      <div className="p-5 space-y-3">
        <div className="flex flex-col sm:flex-row gap-2.5">
          {/* WhatsApp */}
          <button
            onClick={handleWhatsApp}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-[#25D366]/50 hover:bg-[#25D366]/5 dark:hover:bg-[#25D366]/10 text-ink-secondary hover:text-[#128C7E] dark:hover:text-[#25D366] text-sm font-semibold transition-all duration-200"
          >
            {/* WhatsApp logo */}
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-[#25D366] flex-shrink-0">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            Share via WhatsApp
          </button>

          {/* Copy summary */}
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 ${
              copied
                ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                : "border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-blue/30 hover:bg-brand-blue-light dark:hover:bg-brand-blue/10 text-ink-secondary hover:text-brand-blue"
            }`}
          >
            {copied ? (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 flex-shrink-0">
                  <rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
                Copy summary
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-ink-tertiary flex items-center gap-1.5">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 flex-shrink-0">
            <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
          </svg>
          Only the simple summary is shared — never the full report or file.
        </p>
      </div>
    </div>
  );
}

function ResultsPanel({
  result,
  fileName,
  onReset,
  isSample,
  mode,
  lang,
  activeTier,
  setActiveTier,
  savedAnalysisId,
  isSignedIn,
}: {
  result: AnalysisResult;
  fileName: string;
  onReset: () => void;
  isSample: boolean;
  mode: ReportMode;
  lang: string;
  activeTier: Tier;
  setActiveTier: (t: Tier) => void;
  savedAnalysisId: string | null;
  isSignedIn: boolean;
}) {
  const [copied, setCopied] = useState(false);
  const paragraphs = result[activeTier].split(/\n+/).filter(Boolean);

  const handleCopy = async () => {
    const flagLines = result.flags?.length
      ? result.flags.map(f => `  ${f.status === "high" ? "↑" : f.status === "low" ? "↓" : "✓"} ${f.marker}: ${f.value} ${f.unit} (ref: ${f.reference})`).join("\n")
      : mode === "radiology" ? "  No significant findings." : "  No flagged values.";

    const reportLabel = mode === "radiology" ? "Radiology / Pathology Interpretation" : "Lab Interpretation";
    const flagsLabel  = mode === "radiology" ? "KEY FINDINGS" : "FLAGGED VALUES";

    const text = [
      `MERIDIX LABS — ${reportLabel}`,
      `File: ${fileName}`,
      `Date: ${new Date().toLocaleDateString()}`,
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
      `━━━ ${flagsLabel} ━━━`,
      flagLines,
      ...(result.specialist ? ["", "━━━ WHICH SPECIALIST TO SEE ━━━", result.specialist] : []),
      ...(result.etiology   ? ["", mode === "radiology" ? "━━━ WHAT COULD CAUSE THIS FINDING ━━━" : "━━━ POSSIBLE CAUSES ━━━", result.etiology]   : []),
      ...(result.mechanism  ? ["", mode === "radiology" ? "━━━ TISSUE MECHANISM ━━━" : "━━━ BODY MECHANISM ━━━",                                    result.mechanism]  : []),
      ...(result.diseases   ? ["", mode === "radiology" ? "━━━ POSSIBLE DIAGNOSES ━━━" : "━━━ ASSOCIATED CONDITIONS ━━━",                           result.diseases]   : []),
      "",
      "━━━ WHAT SHOULD YOU DO? ━━━",
      result.action,
      "",
      "─────────────────────────────────────────",
      "Meridix Labs is an educational tool. This is not medical advice.",
      "Always consult a qualified physician.",
    ].join("\n");

    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handlePrint = () => window.print();

  return (
    <div id="print-zone" className="animate-fade-in space-y-5">

      {/* Print-only header — hidden on screen, shown when printing */}
      <div className="hidden print:block mb-6 pb-4 border-b border-gray-200">
        <p className="text-xl font-extrabold text-gray-900 tracking-tight">Meridix Labs</p>
        <p className="text-sm text-gray-500 mt-0.5">meridixlabs.com — AI-powered lab interpretation</p>
        <p className="text-xs text-gray-400 mt-1">File: {fileName} · {new Date().toLocaleDateString()}</p>
        {isSample && <p className="text-xs text-amber-600 mt-1">⚠ Sample report for demonstration purposes</p>}
      </div>

      {/* Sample banner */}
      {isSample && (
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-amber-800 font-medium">This is a sample report for demonstration purposes</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${mode === "radiology" ? "bg-purple-50" : "bg-brand-blue/10"}`}>
            {mode === "radiology" ? (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-purple-600">
                <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4zm2 0h1V9h-1v2zm1-4V5h-1v2h1zM5 5H4v2h1V5zM4 9H3v2h1V9zm0 4H3v2h1v-2z" clipRule="evenodd" />
              </svg>
            ) : (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-brand-blue">
                <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
              </svg>
            )}
          </div>
          <div>
            <p className="text-sm font-semibold text-ink truncate max-w-[200px] sm:max-w-sm">{fileName}</p>
            <p className="text-xs text-ink-tertiary">
              {mode === "radiology" ? "Radiology / Pathology — Analysis complete" : "Analysis complete"}
            </p>
          </div>
        </div>
        <button
          onClick={onReset}
          className="flex items-center gap-1.5 text-sm text-ink-tertiary hover:text-ink transition-colors px-3 py-1.5 rounded-lg hover:bg-surface-raised"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
          </svg>
          New upload
        </button>
      </div>

      {/* Overall summary card */}
      {result.overall_status && result.summary_headline && (() => {
        const STATUS_CONFIG = {
          normal: {
            border: "border-emerald-300 dark:border-emerald-700",
            bg: "bg-emerald-50 dark:bg-emerald-900/20",
            iconBg: "bg-emerald-100 dark:bg-emerald-800/40",
            iconColor: "text-emerald-600 dark:text-emerald-400",
            labelColor: "text-emerald-800 dark:text-emerald-300",
            label: "All values look normal",
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
            label: "One or two values to discuss with your doctor",
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
            label: "Multiple values need medical attention",
            icon: (
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
            ),
          },
        } as const;

        const URGENCY_CONFIG = {
          routine: { label: "Routine follow-up", color: "text-emerald-700 dark:text-emerald-400", dot: "bg-emerald-500" },
          soon:    { label: "Discuss with a doctor soon", color: "text-red-700 dark:text-red-400", dot: "bg-red-500" },
          weeks:   { label: "Schedule an appointment within a few weeks", color: "text-amber-700 dark:text-amber-400", dot: "bg-amber-500" },
        } as const;

        const sc = STATUS_CONFIG[result.overall_status!];
        const uc = result.urgency ? URGENCY_CONFIG[result.urgency] : null;

        return (
          <div className={`rounded-2xl border-2 ${sc.border} ${sc.bg} p-5 space-y-3`}>
            {/* Status label + icon */}
            <div className="flex items-center gap-3">
              <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${sc.iconBg} ${sc.iconColor}`}>
                {sc.icon}
              </div>
              <p className={`text-sm font-bold ${sc.labelColor}`}>{sc.label}</p>
            </div>

            {/* Headline summary */}
            <p className="text-sm text-ink-secondary leading-relaxed pl-12">{result.summary_headline}</p>

            {/* Urgency signal */}
            {uc && (
              <div className="pl-12 flex items-center gap-2">
                <span className={`w-2 h-2 rounded-full flex-shrink-0 ${uc.dot}`} />
                <p className={`text-xs font-semibold ${uc.color}`}>{uc.label}</p>
              </div>
            )}
          </div>
        );
      })()}

      {/* ─── SECTION 1: YOUR RESULTS ─────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3 px-0.5">
          Your Results
        </p>

        {/* Single unified card: flags + tier tabs + interpretation + action */}
        <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm">

          {/* Flagged values — merged at the top of this card */}
          {result.flags && result.flags.length > 0 && (() => {
            const interpretationText = [
              result.simple, result.medium, result.expert,
              result.etiology, result.mechanism, result.diseases,
            ].filter(Boolean).join(" ");
            const confidences = result.flags.map((f) => computeConfidence(f, interpretationText));
            const hasBorderline = confidences.some((c) => c === "borderline");
            return (
              <>
                <div className="px-5 py-3 border-b border-surface-border bg-surface-raised flex items-center justify-between">
                  <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
                    {mode === "radiology" ? "Key Findings" : "Flagged Values"}
                  </p>
                  <span className="text-[11px] text-ink-tertiary bg-white dark:bg-slate-700 border border-surface-border px-2 py-0.5 rounded-full">
                    {result.flags.length} value{result.flags.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {result.flags.map((flag, i) => (
                    <FlagBadge key={i} flag={flag} confidence={confidences[i]} />
                  ))}
                </div>
                {hasBorderline && (
                  <div className="px-5 py-3 border-t border-yellow-100 dark:border-yellow-900 bg-yellow-50/60 dark:bg-yellow-900/10 flex items-start gap-2">
                    <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-px">
                      <path fillRule="evenodd" d="M8 1.5a6.5 6.5 0 100 13 6.5 6.5 0 000-13zM0 8a8 8 0 1116 0A8 8 0 010 8zm8-3.5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 018 4.5zm0 7a.75.75 0 110-1.5.75.75 0 010 1.5z" clipRule="evenodd" />
                    </svg>
                    <p className="text-[11px] text-yellow-800 dark:text-yellow-300 leading-relaxed">
                      Borderline values may require clinical context to interpret accurately. Always confirm with your physician.
                    </p>
                  </div>
                )}
              </>
            );
          })()}

          {/* Tier tabs */}
          <div className={`border-b border-surface-border px-5 pt-4 bg-surface-raised ${result.flags && result.flags.length > 0 ? "border-t" : ""}`}>
            <div className="flex gap-0.5">
              {(["simple", "medium", "expert"] as Tier[]).map((tier) => {
                const cfg = TIER_CONFIG[tier];
                const isActive = tier === activeTier;
                return (
                  <button
                    key={tier}
                    onClick={() => setActiveTier(tier)}
                    className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-semibold transition-all duration-200 ${
                      isActive ? cfg.activeClass : `text-ink-tertiary hover:text-ink-secondary hover:bg-surface-border/40 ${cfg.inactiveIconClass}`
                    }`}
                  >
                    {cfg.icon}
                    <span>{cfg.label}</span>
                    {isActive && (
                      <span className="hidden sm:inline-block text-xs font-normal opacity-50 ml-0.5">— {cfg.audience}</span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Interpretation text */}
          <div className="p-6">
            <div className="animate-fade-in">
              {paragraphs.map((para, i) => (
                <p key={i} className="text-ink-secondary leading-relaxed text-sm sm:text-base mb-3 last:mb-0">{para}</p>
              ))}
            </div>
          </div>

          {/* What should you do? — merged at the bottom of the results card */}
          <div className="border-t border-brand-blue/10 bg-brand-blue-light/50 dark:bg-brand-blue/5 p-5">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 bg-brand-blue/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-brand-blue">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div>
                <p className="text-xs font-bold text-brand-blue-dark dark:text-brand-blue uppercase tracking-widest mb-1.5">What should you do?</p>
                <p className="text-sm text-ink-secondary leading-relaxed">{result.action}</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* ─── SECTION 1.5: LAB PANEL BY BODY SYSTEM (lab reports only) ────────── */}
      {mode === "lab" && (((result.labs?.length ?? 0) > 0) || ((result.flags?.length ?? 0) > 0)) && (
        <div>
          <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3 px-0.5">
            Lab Panel · Grouped by Body System
          </p>
          <LabPanelBySystem labs={result.labs} flags={result.flags} />
        </div>
      )}

      {/* ─── SECTION 2: DEEPER ANALYSIS ──────────────────────────────────────── */}
      {(result.etiology || result.mechanism || result.diseases || result.specialist || result.medication_context || result.health_insights) && (
        <div>
          <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3 px-0.5">
            Deeper Analysis
          </p>
          <div className="space-y-3">
            <DeepDiveSection result={result} mode={mode} />

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

            {result.health_insights && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-red-200 dark:border-red-900/50 overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-red-100 dark:border-red-900/30 bg-red-50/60 dark:bg-red-950/20 flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-red-500 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4 text-white">
                      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-red-700 dark:text-red-400 uppercase tracking-wider">Apple Health · Wearable Insights</p>
                    <p className="text-[10px] text-red-500/80 dark:text-red-500">Cross-referenced with your lab results</p>
                  </div>
                </div>
                <div className="p-5">
                  <p className="text-sm text-ink-secondary leading-relaxed">{result.health_insights}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── SECTION 2.5: SUPPLEMENTS & LIFESTYLE ─────────────────────────────── */}
      {result.supplements && mode === "lab" && (
        <div>
          <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3 px-0.5">
            Supplements &amp; Lifestyle
          </p>
          <SupplementsSection supplements={result.supplements} />
        </div>
      )}

      {/* ─── SECTION 3: NEXT STEPS ────────────────────────────────────────────── */}
      <div>
        <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3 px-0.5">
          Next Steps
        </p>
        <div className="space-y-3">
          <DoctorQuestionsSection result={result} mode={mode} lang={lang} />
          {result.flags && result.flags.length > 0 && (
            <ClinicalTrialsSection flags={result.flags} />
          )}
        </div>
      </div>

      {/* ─── SECTION 4: SAVE & SHARE ─────────────────────────────────────────── */}
      <div className="print:hidden">
        <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3 px-0.5">
          Save &amp; Share
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
          <ShareSection simple={result.simple} />
          <EmailSection result={result} />
        </div>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <button
            onClick={handleCopy}
            className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 ${
              copied
                ? "border-emerald-300 bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400"
                : "border-surface-border bg-white dark:bg-slate-800 dark:border-slate-700 hover:border-brand-blue/30 hover:bg-brand-blue-light dark:hover:bg-brand-blue/10 text-ink-secondary hover:text-brand-blue"
            }`}
          >
            {copied ? (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                Copied!
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path d="M8 3a1 1 0 011-1h2a1 1 0 110 2H9a1 1 0 01-1-1z" />
                  <path d="M6 3a2 2 0 00-2 2v11a2 2 0 002 2h8a2 2 0 002-2V5a2 2 0 00-2-2 3 3 0 01-3 3H9a3 3 0 01-3-3z" />
                </svg>
                Copy to Clipboard
              </>
            )}
          </button>
          <button
            onClick={handlePrint}
            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-800 hover:border-brand-blue/30 hover:bg-brand-blue-light dark:hover:bg-brand-blue/10 text-ink-secondary hover:text-brand-blue text-sm font-semibold transition-all duration-200"
          >
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
              <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a1 1 0 001 1h6a1 1 0 001-1v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a1 1 0 00-1-1H6a1 1 0 00-1 1zm2 0h6v3H7V4zm-1 9a1 1 0 112 0 1 1 0 01-2 0zm2 1v2h4v-2H8z" clipRule="evenodd" />
            </svg>
            Download as PDF
          </button>
        </div>
      </div>

      {/* ─── SECTION: ASK FOLLOW-UP QUESTIONS (chat panel) ──────────── */}
      <div>
        <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest mb-3 px-0.5 print:hidden">
          Follow-up Questions
        </p>
        <LabChatPanel
          result={result}
          tier={activeTier}
          fileName={fileName}
          isSample={isSample}
          savedAnalysisId={savedAnalysisId}
          isSignedIn={isSignedIn}
        />
      </div>

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 print:hidden">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
          <strong>Meridix Labs is an educational tool.</strong> This is not medical advice. Always consult a qualified physician.
        </p>
      </div>

      {/* Toast notification */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-ink text-white text-sm font-medium rounded-xl shadow-xl animate-fade-in pointer-events-none">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Copied to clipboard!
        </div>
      )}

      <NextStepBar currentPage="app" />
    </div>
  );
}

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(false);
  useEffect(() => {
    const check = () =>
      setIsMobile(window.innerWidth < 768 || navigator.maxTouchPoints > 0);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

// ── Shared file preview + analyze button (used by both upload UIs) ──────────
function FilePreview({
  preview,
  onClear,
  onAnalyze,
}: {
  preview: { name: string; size: string };
  onClear: () => void;
  onAnalyze: () => void;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4 p-4 rounded-2xl border border-brand-blue/30 bg-brand-blue-light/50">
        <div className="w-12 h-12 bg-brand-blue/10 rounded-xl flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 24 24" fill="none" className="w-6 h-6 text-brand-blue" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink truncate">{preview.name}</p>
          <p className="text-xs text-ink-tertiary mt-0.5">{preview.size}</p>
          <p className="text-xs text-brand-blue mt-1 font-medium">Ready to analyze</p>
        </div>
        <button
          onClick={onClear}
          className="text-ink-tertiary hover:text-ink-secondary p-2 rounded-lg hover:bg-surface-raised flex-shrink-0"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
          </svg>
        </button>
      </div>
      <button
        onClick={onAnalyze}
        className="w-full py-4 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold rounded-xl text-base transition-all duration-200 shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
        Analyze My Results
      </button>
    </div>
  );
}

// ── Mobile upload UI ─────────────────────────────────────────────────────────
function MobileUploadZone({ onFileSelect, error }: { onFileSelect: (file: File) => void; error: string | null }) {
  const [preview, setPreview] = useState<{ name: string; size: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const cameraRef = useRef<HTMLInputElement>(null);
  const filesRef  = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024 ? `${(bytes / 1024).toFixed(1)} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const handleFile = useCallback((file: File) => {
    setPreview({ name: file.name, size: formatSize(file.size) });
    setSelectedFile(file);
  }, []);

  const clearFile = () => {
    setPreview(null);
    setSelectedFile(null);
    if (cameraRef.current) cameraRef.current.value = "";
    if (filesRef.current)  filesRef.current.value  = "";
  };

  if (preview && selectedFile) {
    return (
      <div className="space-y-3">
        {error && <ErrorBanner message={error} />}
        <FilePreview preview={preview} onClear={clearFile} onAnalyze={() => onFileSelect(selectedFile)} />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Hidden inputs */}
      <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />
      <input ref={filesRef}  type="file" accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf" className="hidden"
        onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }} />

      {/* Camera button — primary */}
      <button
        onClick={() => cameraRef.current?.click()}
        className="w-full py-5 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold rounded-2xl text-base transition-all duration-200 shadow-lg shadow-brand-blue/25 flex items-center justify-center gap-3"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6.827 6.175A2.31 2.31 0 015.186 7.23c-.38.054-.757.112-1.134.175C2.999 7.58 2.25 8.507 2.25 9.574V18a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9.574c0-1.067-.75-1.994-1.802-2.169a47.865 47.865 0 00-1.134-.175 2.31 2.31 0 01-1.64-1.055l-.822-1.316a2.192 2.192 0 00-1.736-1.039 48.774 48.774 0 00-5.232 0 2.192 2.192 0 00-1.736 1.039l-.821 1.316z" />
          <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 12.75a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zM18.75 10.5h.008v.008h-.008V10.5z" />
        </svg>
        Take a Photo of Your Lab Report
      </button>

      {/* Files button — secondary */}
      <button
        onClick={() => filesRef.current?.click()}
        className="w-full py-3.5 bg-white dark:bg-slate-800 hover:bg-surface-raised border border-surface-border dark:border-slate-700 hover:border-brand-blue/30 text-ink-secondary hover:text-ink font-semibold rounded-2xl text-sm transition-all duration-200 flex items-center justify-center gap-2.5"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
        </svg>
        Choose from Files
      </button>

      {error && <ErrorBanner message={error} />}
    </div>
  );
}

// ── Error banner (shared) ────────────────────────────────────────────────────
function ErrorBanner({ message }: { message: string }) {
  return (
    <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 border border-red-100">
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
      </svg>
      <p className="text-sm text-red-700">{message}</p>
    </div>
  );
}

// ── Desktop upload UI (original drag-and-drop) ───────────────────────────────
function DesktopUploadZone({ onFileSelect, error }: { onFileSelect: (file: File) => void; error: string | null }) {

  const [dragging, setDragging] = useState(false);
  const [preview, setPreview] = useState<{ name: string; size: string; type: string } | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleFile = useCallback((file: File) => {
    setPreview({ name: file.name, size: formatSize(file.size), type: file.type });
    setSelectedFile(file);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  }, [handleFile]);

  const clearFile = () => {
    setPreview(null);
    setSelectedFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  return (
    <div className="space-y-4">
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !preview && inputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl transition-all duration-200 cursor-pointer ${
          dragging
            ? "border-brand-blue bg-brand-blue-light scale-[1.01]"
            : preview
            ? "border-brand-blue/40 bg-brand-blue-light/50 cursor-default"
            : "border-surface-border hover:border-brand-blue/50 hover:bg-brand-blue-light/30"
        }`}
      >
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/jpg,image/png,image/webp,application/pdf"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        />

        {preview ? (
          <div className="p-8 flex items-center gap-5">
            <div className="w-14 h-14 bg-brand-blue/10 rounded-2xl flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-brand-blue" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
              </svg>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-ink truncate">{preview.name}</p>
              <p className="text-xs text-ink-tertiary mt-0.5">{preview.size}</p>
              <p className="text-xs text-brand-blue mt-1">Ready to analyze</p>
            </div>
            <button
              onClick={(e) => { e.stopPropagation(); clearFile(); }}
              className="text-ink-tertiary hover:text-ink-secondary p-2 rounded-lg hover:bg-surface-raised"
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
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
              </svg>
            </div>
            <p className="text-base font-semibold text-ink mb-1">Drop your lab report here</p>
            <p className="text-sm text-ink-secondary mb-4">or click to browse files</p>
            <div className="flex items-center gap-2 text-xs text-ink-tertiary">
              {["PDF", "JPG", "PNG"].map((fmt) => (
                <span key={fmt} className="px-2 py-1 rounded-md bg-surface-raised border border-surface-border font-medium">{fmt}</span>
              ))}
              <span>· up to 10 MB</span>
            </div>
          </div>
        )}
      </div>

      {error && <ErrorBanner message={error} />}

      {preview && selectedFile && (
        <button
          onClick={() => onFileSelect(selectedFile)}
          className="w-full py-4 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold rounded-xl text-base transition-all duration-200 shadow-lg shadow-brand-blue/20 hover:shadow-brand-blue/40 hover:-translate-y-0.5 flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          Analyze My Results
        </button>
      )}
    </div>
  );
}

// ── Router: picks Mobile or Desktop based on device ──────────────────────────
function UploadZone({ onFileSelect, error }: { onFileSelect: (file: File) => void; error: string | null }) {
  const isMobile = useIsMobile();
  if (isMobile) return <MobileUploadZone onFileSelect={onFileSelect} error={error} />;
  return <DesktopUploadZone onFileSelect={onFileSelect} error={error} />;
}

// ── Patient context collection form ──────────────────────────────────────────
type PatientSex = "male" | "female" | "prefer_not" | "";

function ContextForm({
  fileName,
  onContinue,
  onSkip,
  initialAge = "",
  initialSex = "",
  initialMedications = "",
  profileLoaded = false,
}: {
  fileName: string;
  onContinue: (age: string, sex: PatientSex, medications: string) => void;
  onSkip: () => void;
  initialAge?: string;
  initialSex?: PatientSex;
  initialMedications?: string;
  profileLoaded?: boolean;
}) {
  const [age, setAge] = useState(initialAge);
  const [sex, setSex] = useState<PatientSex>(initialSex);
  const [medications, setMedications] = useState(initialMedications);

  useEffect(() => {
    if (profileLoaded) {
      if (initialAge) setAge(initialAge);
      if (initialSex) setSex(initialSex);
      if (initialMedications) setMedications(initialMedications);
    }
  }, [profileLoaded, initialAge, initialSex, initialMedications]);

  return (
    <div className="animate-fade-in space-y-6 py-1">
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-brand-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-brand-blue">
            <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
          </svg>
        </div>
        <div>
          <h2 className="text-base font-bold text-ink">Personalize your interpretation</h2>
          <p className="text-sm text-ink-secondary mt-0.5 leading-snug">
            Optional — helps the AI apply the right reference ranges for your age and sex.
          </p>
        </div>
      </div>

      {/* Autofill indicator for signed-in users */}
      {profileLoaded && (initialAge || initialSex || initialMedications) && (
        <div className="flex items-center gap-2 px-3 py-2 bg-brand-blue/5 border border-brand-blue/20 rounded-xl">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-brand-blue flex-shrink-0">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          <span className="text-xs text-brand-blue font-medium">Filled in from your profile — edit anything below.</span>
        </div>
      )}

      {/* File name chip */}
      {fileName && (
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-raised rounded-xl border border-surface-border">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-ink-tertiary flex-shrink-0">
            <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
            <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
          </svg>
          <span className="text-xs text-ink-secondary truncate font-medium">{fileName}</span>
        </div>
      )}

      {/* Age input */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-ink">How old are you?</label>
        <input
          type="number"
          placeholder="e.g. 35"
          value={age}
          onChange={(e) => setAge(e.target.value)}
          min={1}
          max={120}
          className="w-full px-4 py-3 rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-900 text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-sm"
        />
      </div>

      {/* Sex toggle */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-ink">Biological sex</label>
        <div className="flex gap-2">
          {(["male", "female", "prefer_not"] as const).map((option) => (
            <button
              key={option}
              onClick={() => setSex(sex === option ? "" : option)}
              className={`flex-1 py-2.5 px-2 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                sex === option
                  ? "bg-brand-blue text-white border-brand-blue shadow-sm"
                  : "bg-surface-raised dark:bg-slate-700 border-surface-border dark:border-slate-600 text-ink-secondary hover:border-brand-blue/40 hover:text-ink"
              }`}
            >
              {option === "male" ? "Male" : option === "female" ? "Female" : "Prefer not to say"}
            </button>
          ))}
        </div>
      </div>

      {/* Medications input */}
      <div className="space-y-1.5">
        <label className="text-sm font-semibold text-ink">Any medications you&apos;re currently taking? <span className="font-normal text-ink-tertiary">(optional)</span></label>
        <input
          type="text"
          placeholder="e.g. metformin, lisinopril, atorvastatin"
          value={medications}
          onChange={(e) => setMedications(e.target.value)}
          className="w-full px-4 py-3 rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-900 text-ink placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all text-sm"
        />
      </div>

      {/* Privacy note */}
      <div className="flex items-center gap-1.5">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-ink-tertiary flex-shrink-0">
          <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-ink-tertiary">Used to tailor this interpretation. Saved to your account if you&apos;re signed in.</p>
      </div>

      {/* Actions */}
      <div className="space-y-2.5 pt-1">
        <button
          onClick={() => onContinue(age, sex, medications)}
          className="w-full py-3.5 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold rounded-xl text-sm transition-all duration-200 shadow-md shadow-brand-blue/20 hover:shadow-brand-blue/30 hover:-translate-y-0.5 flex items-center justify-center gap-2"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
          </svg>
          Continue
        </button>
        <button
          onClick={onSkip}
          className="w-full text-xs text-ink-tertiary hover:text-ink-secondary transition-colors py-1.5"
        >
          Skip — use standard ranges
        </button>
      </div>
    </div>
  );
}

export default function AppPage() {
  const { lang } = useLanguage();
  const { userData, recordInterpretation, dismissBanner, daysSinceLastVisit } = useReturningUser();
  const [state, setState] = useState<"idle" | "context" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [fileSizeMB, setFileSizeMB] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string>("");
  const [isSample, setIsSample] = useState(false);
  const [reportMode, setReportMode] = useState<ReportMode>("lab");
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  const [healthFile, setHealthFile] = useState<File | null>(null);
  const [demoTier, setDemoTier] = useState<"simple" | "medium" | "expert">("simple");
  const [activeTier, setActiveTier] = useState<Tier>("simple");

  // ── Signed-in profile autofill ─────────────────────────────────────
  // Note: useUser() must be called inside a ClerkProvider. When AUTH_ENABLED
  // is false (e.g., Vercel without Clerk env vars), Providers.tsx does NOT
  // wrap with ClerkProvider, so we route Clerk state through a subcomponent
  // that only mounts when AUTH_ENABLED is true.
  const [clerkLoaded, setClerkLoaded] = useState(!AUTH_ENABLED);
  const [clerkSignedIn, setClerkSignedIn] = useState(false);
  const isSignedIn = AUTH_ENABLED && clerkSignedIn;

  const [profile, setProfile] = useState<null | {
    age: number | null;
    sex: "male" | "female" | "other" | null;
    medications: string | null;
  }>(null);
  const [profileLoaded, setProfileLoaded] = useState(false);
  const [savedAnalysisId, setSavedAnalysisId] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!AUTH_ENABLED) { setProfileLoaded(true); return; }
    if (!clerkLoaded) return;
    if (!clerkSignedIn) { setProfileLoaded(true); return; }
    (async () => {
      try {
        const r = await fetch("/api/user-profile", { credentials: "include" });
        if (r.ok) {
          const j = await r.json();
          setProfile({
            age: j.profile?.age ?? null,
            sex: j.profile?.sex ?? null,
            medications: j.profile?.medications ?? null,
          });
        } else {
          console.warn("[meridix] user-profile fetch failed:", r.status, await r.text());
        }
      } catch (e) {
        console.warn("[meridix] user-profile fetch error:", e);
      } finally {
        setProfileLoaded(true);
      }
    })();
  }, [clerkLoaded, clerkSignedIn]);

  // ── Restore last anonymous analysis on mount (anonymous users only) ──
  // Signed-in users get their history from Supabase, so we only restore
  // the localStorage snapshot when Clerk has resolved and the user is not
  // signed in. We only auto-restore once, and only when the page is in the
  // empty/idle state (so we never clobber a fresh session).
  const anonRestoreAttemptedRef = useRef(false);
  useEffect(() => {
    if (!clerkLoaded) return;
    if (isSignedIn) return;
    if (anonRestoreAttemptedRef.current) return;
    if (state !== "idle" || result !== null) return;

    const saved = readAnonAnalysis();
    anonRestoreAttemptedRef.current = true;
    if (!saved) return;

    setResult(saved.result);
    setFileName(saved.fileName);
    setIsSample(saved.isSample);
    setReportMode(saved.reportMode);
    setActiveTier(saved.activeTier);
    setState("success");
  }, [clerkLoaded, isSignedIn, state, result]);

  // ── Persist tier changes so a refresh restores the same depth ──
  useEffect(() => {
    if (!clerkLoaded) return;
    if (isSignedIn) return;
    if (state !== "success" || !result) return;
    if (isSample) return; // don't persist demo data
    writeAnonAnalysis({
      result,
      fileName,
      isSample,
      reportMode,
      activeTier,
    });
  }, [activeTier, clerkLoaded, isSignedIn, state, result, fileName, isSample, reportMode]);

  const setErrorState = (code: ErrorCode, msg?: string, sizeMB?: string) => {
    setErrorCode(code);
    setError(msg ?? code);
    setFileSizeMB(sizeMB);
    setState("error");
  };

  const runAnalysis = async (file: File | null, sampleMode: boolean, age = "", sex = "", medications = "", healthData: File | null = null) => {
    setState("loading");
    try {
      const formData = new FormData();
      if (sampleMode) {
        formData.append("sample", "true");
        formData.append("mode", "lab");
      } else if (file) {
        formData.append("file", file);
        formData.append("mode", reportMode);
      }
      formData.append("language", lang);
      if (age)  formData.append("patientAge", age);
      if (sex && sex !== "prefer_not") formData.append("patientSex", sex);
      if (medications.trim()) formData.append("patientMedications", medications.trim());
      if (healthData) formData.append("healthFile", healthData);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setErrorState((json.errorCode as ErrorCode) ?? "SERVER_ERROR", json.error, json.fileSizeMB);
        return;
      }
      setResult(json.data);
      setState("success");
      recordInterpretation();
      track("interpretation_complete", { tier: "simple", language: lang });

      // Save to account for signed-in users
      console.log("[meridix] save check — isSignedIn:", isSignedIn, "sampleMode:", sampleMode);
      if (isSignedIn && !sampleMode) {
        try {
          const flagMarkers = new Set<string>((json.data?.flags ?? []).map((f: { marker: string }) => f.marker));
          const labsRaw = (json.data?.labs ?? []).map((l: { marker: string; value: string; unit?: string; reference?: string; status?: string }) => ({
            marker: l.marker, value: l.value, unit: l.unit, reference: l.reference,
            status: flagMarkers.has(l.marker) ? (l.status ?? "high") : "normal",
          }));
          const flagsCount = json.data?.flags?.length ?? 0;
          const healthScore = Math.max(20, 100 - flagsCount * 8);

          console.log("[meridix] calling /api/save-analysis…");
          const extractedDate = typeof json.data?.report_date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(json.data.report_date)
            ? json.data.report_date
            : null;
          const saveRes = await fetch("/api/save-analysis", {
            method: "POST",
            credentials: "include",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              analysis: json.data,
              flags: json.data?.flags ?? [],
              labs_raw: labsRaw,
              tier: "simple",
              summary: json.data?.summary ?? json.data?.medium?.slice(0, 240) ?? null,
              patient_context: { age, sex, medications, language: lang },
              source_filename: file?.name ?? fileName ?? null,
              health_score: healthScore,
              report_date: extractedDate,
            }),
          });
          const saveText = await saveRes.text();
          console.log("[meridix] save-analysis response:", saveRes.status, saveText);
          if (saveRes.ok) {
            try {
              const sj = JSON.parse(saveText);
              setSavedAnalysisId(sj.id ?? null);
            } catch { /* noop */ }
          } else {
            setSaveError(`Save failed (${saveRes.status}): ${saveText.slice(0, 200)}`);
          }
        } catch (e) {
          console.warn("[meridix] save-analysis exception:", e);
          setSaveError(e instanceof Error ? e.message : "Network error while saving.");
        }
      }
    } catch {
      setErrorState("NETWORK_ERROR");
    }
  };

  const handleFileSelect = (file: File) => {
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setFileName(file.name);
      setErrorState("FILE_TOO_LARGE", undefined, (file.size / (1024 * 1024)).toFixed(1));
      return;
    }
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setFileName(file.name);
      setErrorState("WRONG_FILE_TYPE");
      return;
    }
    track("report_uploaded", { fileType: file.type, fileSize: file.size });
    setFileName(file.name);
    setIsSample(false);
    setPendingFile(file);
    setError(null);
    setErrorCode(null);
    setFileSizeMB(undefined);
    setState("context");
  };

  const handleSample = () => {
    track("demo_mode_used");
    setFileName("Sample — Basic Metabolic Panel");
    setIsSample(true);
    setPendingFile(null);
    setError(null);
    setErrorCode(null);
    setFileSizeMB(undefined);
    // Load pre-built demo result instantly — no API call needed
    setResult(DEMO_RESULT);
    setState("success");
  };

  const handleReset = () => {
    setState("idle");
    setResult(null);
    setError(null);
    setErrorCode(null);
    setFileSizeMB(undefined);
    setFileName("");
    setIsSample(false);
    setPendingFile(null);
    setHealthFile(null);
    setActiveTier("simple");
    setSavedAnalysisId(null);
    setSaveError(null);
    // Anonymous users: drop the persisted snapshot so the next visit is fresh
    if (!isSignedIn) clearAnonAnalysis();
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-light to-white dark:from-slate-900 dark:to-slate-900 pt-24 pb-20">
      {AUTH_ENABLED && (
        <ClerkAuthBridge
          onChange={(loaded, signedIn) => { setClerkLoaded(loaded); setClerkSignedIn(signedIn); }}
        />
      )}
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="text-center mb-8">
          {userData && userData.interpretationCount > 1 && state === "idle" ? (
            /* Returning user greeting */
            <>
              <span className="inline-block px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-brand-blue/30 text-brand-blue text-xs font-semibold uppercase tracking-wider mb-5 shadow-sm">
                Welcome back
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-snug">
                Ready to analyze{" "}
                <span className="text-gradient-blue">another report?</span>
              </h1>
              <p className="mt-3 text-base text-ink-secondary max-w-xl mx-auto leading-relaxed">
                {daysSinceLastVisit >= 30
                  ? "It's been a while — time for a check-up?"
                  : `You've interpreted ${userData.interpretationCount} report${userData.interpretationCount === 1 ? "" : "s"} with Meridix Labs.`}
              </p>
              {daysSinceLastVisit >= 30 && (
                <p className="mt-1 text-sm text-ink-tertiary">
                  You&apos;ve interpreted {userData.interpretationCount} report{userData.interpretationCount === 1 ? "" : "s"} with Meridix Labs.
                </p>
              )}
            </>
          ) : (
            /* Default hero */
            <>
              <span className="inline-block px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-brand-blue/30 text-brand-blue text-xs font-semibold uppercase tracking-wider mb-5 shadow-sm">
                AI Lab Interpreter
              </span>
              <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-snug">
                Upload your lab report.{" "}
                <span className="text-gradient-blue">Understand it in seconds.</span>
              </h1>
              <p className="mt-3 text-base text-ink-secondary max-w-xl mx-auto leading-relaxed">
                Our AI reads every value, flags what's abnormal, and explains the biology — in plain English or full clinical detail.
              </p>
            </>
          )}

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {[
              {
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-emerald-500"><path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" /></svg>,
                label: "File never stored",
              },
              {
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-brand-blue"><path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" /></svg>,
                label: "Free to try",
              },
              {
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-amber-500"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>,
                label: "Results in seconds",
              },
              {
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-violet-500"><path fillRule="evenodd" d="M4.083 9h1.946c.089-1.546.383-2.97.837-4.118A6.004 6.004 0 004.083 9zM10 2a8 8 0 100 16A8 8 0 0010 2zm0 2c-.076 0-.232.032-.465.262-.238.234-.497.623-.737 1.182-.389.907-.673 2.142-.766 3.556h3.936c-.093-1.414-.377-2.649-.766-3.556-.24-.56-.5-.948-.737-1.182C10.232 4.032 10.076 4 10 4zm3.971 5c-.089-1.546-.383-2.97-.837-4.118A6.004 6.004 0 0115.917 9h-1.946zm-2.003 2H8.032c.093 1.414.377 2.649.766 3.556.24.56.5.948.737 1.182.233.23.389.262.465.262.076 0 .232-.032.465-.262.238-.234.498-.623.737-1.182.389-.907.673-2.142.766-3.556zm1.166 4.118c.454-1.147.748-2.572.837-4.118h1.946a6.004 6.004 0 01-2.783 4.118zm-6.268 0C6.412 13.97 6.118 12.546 6.03 11H4.083a6.004 6.004 0 002.783 4.118z" clipRule="evenodd" /></svg>,
                label: "10 languages",
              },
            ].map((b) => (
              <span key={b.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-surface-border dark:border-slate-700 text-xs text-ink-secondary font-medium shadow-sm">
                {b.icon}
                {b.label}
              </span>
            ))}
          </div>

          {lang !== "en" && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-blue bg-brand-blue-light px-3 py-1.5 rounded-full border border-brand-blue-mid">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                <circle cx="10" cy="10" r="8" /><path d="M10 2c-2 3-2 13 0 16M10 2c2 3 2 13 0 16M2 10h16" strokeLinecap="round" />
              </svg>
              Results will be in {LANGUAGES[lang]?.english ?? lang}
            </div>
          )}
        </div>

        {/* Main card */}
        <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-ink/5 dark:shadow-black/30 border border-surface-border p-6 sm:p-8">
          {state === "error" && errorCode ? (
            <ErrorCard code={errorCode} fileSizeMB={fileSizeMB} onReset={handleReset} />
          ) : state === "context" ? (
            <ContextForm
              fileName={fileName}
              onContinue={(age, sex, medications) => runAnalysis(pendingFile, isSample, age, sex, medications, healthFile)}
              onSkip={() => runAnalysis(pendingFile, isSample, "", "", "", healthFile)}
              profileLoaded={profileLoaded}
              initialAge={profile?.age != null ? String(profile.age) : ""}
              initialSex={profile?.sex === "other" ? "prefer_not" : (profile?.sex ?? "") as PatientSex}
              initialMedications={profile?.medications ?? ""}
            />
          ) : state === "idle" ? (
            <div className="space-y-4">
              {/* Report mode toggle */}
              <div className="flex p-1 bg-surface-raised rounded-2xl border border-surface-border gap-1">
                {([
                  {
                    mode: "lab",
                    icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z" clipRule="evenodd" /></svg>,
                    label: "Lab Results",
                  },
                  {
                    mode: "radiology",
                    icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4zm2 0h1V9h-1v2zm1-4V5h-1v2h1zM5 5H4v2h1V5zM4 9H3v2h1V9zm0 4H3v2h1v-2z" clipRule="evenodd" /></svg>,
                    label: "Radiology / Pathology",
                  },
                ] as { mode: ReportMode; icon: React.ReactNode; label: string }[]).map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => setReportMode(opt.mode)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      reportMode === opt.mode
                        ? "bg-white dark:bg-slate-700 shadow-sm border border-surface-border text-ink"
                        : "text-ink-tertiary hover:text-ink-secondary"
                    }`}
                  >
                    {opt.icon}
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Mode hint */}
              {reportMode === "radiology" && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-purple-500 mt-px flex-shrink-0 flex-shrink-0"><path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm3 2h6v4H7V5zm8 8v2h1v-2h-1zm-2-2H7v4h6v-4zm2 0h1V9h-1v2zm1-4V5h-1v2h1zM5 5H4v2h1V5zM4 9H3v2h1V9zm0 4H3v2h1v-2z" clipRule="evenodd" /></svg>
                  <p className="text-xs text-purple-700 leading-relaxed">
                    <strong>Radiology &amp; Pathology mode:</strong> Upload a CT, MRI, X-ray, ultrasound, or biopsy report. The AI will identify every finding, flag what needs follow-up, and explain incidental findings clearly.
                  </p>
                </div>
              )}

              <UploadZone onFileSelect={handleFileSelect} error={null} />
              {reportMode === "lab" && (
                <>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-px bg-surface-border" />
                    <span className="text-xs text-ink-tertiary font-medium">or</span>
                    <div className="flex-1 h-px bg-surface-border" />
                  </div>
                  <button
                    onClick={handleSample}
                    className="w-full py-3.5 px-5 rounded-xl border border-brand-blue/25 bg-brand-blue-light/60 hover:bg-brand-blue-light text-brand-blue font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2.5 group"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
                    </svg>
                    See a live demo — no upload needed
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 opacity-50 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                    </svg>
                  </button>
                </>
              )}

              {/* Apple Health import */}
              <AppleHealthSection
                onHealthFileChange={setHealthFile}
                healthFile={healthFile}
              />

              {/* Privacy trust strip */}
              <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-2 pt-2">
                {[
                  { icon: <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-emerald-500"><path fillRule="evenodd" d="M8 1a.5.5 0 01.5.5v1h1A1.5 1.5 0 0111 4v7.5a1.5 1.5 0 01-1.5 1.5h-3A1.5 1.5 0 015 11.5V4a1.5 1.5 0 011.5-1.5h1V1.5A.5.5 0 018 1zm0 5a.5.5 0 100 1 .5.5 0 000-1z" clipRule="evenodd" /></svg>, text: "File never stored" },
                  { icon: <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-brand-blue"><path d="M8 1a2 2 0 012 2v4H6V3a2 2 0 012-2zm3 6V3a3 3 0 00-6 0v4a2 2 0 00-2 2v5a2 2 0 002 2h6a2 2 0 002-2V9a2 2 0 00-2-2z"/></svg>, text: "End-to-end encrypted" },
                  { icon: <svg viewBox="0 0 16 16" fill="currentColor" className="w-3 h-3 text-violet-500"><path fillRule="evenodd" d="M8 15A7 7 0 108 1a7 7 0 000 14zm3.354-9.646a.5.5 0 00-.708-.708L7 9.293 5.354 7.646a.5.5 0 10-.708.708l2 2a.5.5 0 00.708 0l4-4z" clipRule="evenodd" /></svg>, text: "No data sold, ever" },
                ].map((item) => (
                  <span key={item.text} className="flex items-center gap-1.5 text-[11px] text-ink-tertiary">
                    {item.icon}
                    {item.text}
                  </span>
                ))}
              </div>
            </div>
          ) : state === "loading" ? (
            <LoadingAnimation mode={reportMode} />
          ) : result ? (
            <ResultsPanel
              result={result}
              fileName={fileName}
              onReset={handleReset}
              isSample={isSample}
              mode={reportMode}
              lang={lang}
              activeTier={activeTier}
              setActiveTier={setActiveTier}
              savedAnalysisId={savedAnalysisId}
              isSignedIn={isSignedIn}
            />
          ) : null}
        </div>

        {/* Save failed banner (signed-in users) */}
        {AUTH_ENABLED && isSignedIn && result && !isSample && saveError && (
          <div className="mt-4 animate-fade-in flex items-start gap-3 px-4 py-3.5 rounded-2xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink">Couldn&apos;t save to your account</p>
              <p className="mt-0.5 text-xs text-ink-secondary break-all">{saveError}</p>
            </div>
          </div>
        )}

        {/* Saved-to-account confirmation (signed-in users) */}
        {AUTH_ENABLED && isSignedIn && result && !isSample && savedAnalysisId && (
          <div className="mt-4 animate-fade-in flex items-center justify-between gap-3 px-4 py-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-200 dark:border-emerald-800">
            <div className="flex items-center gap-3">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-600">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="text-sm font-semibold text-ink">Saved to your account</p>
                <p className="text-xs text-ink-secondary mt-0.5">This report will show up in your dashboard trends.</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="text-xs font-semibold text-brand-blue hover:underline flex-shrink-0 whitespace-nowrap"
            >
              View dashboard →
            </Link>
          </div>
        )}

        {/* Sign-up nudge (anonymous users, after first interpretation) */}
        {AUTH_ENABLED && !isSignedIn && userData && userData.interpretationCount === 1 && !userData.saveBannerDismissed && result && !isSample && (
          <div className="mt-4 animate-fade-in flex items-start justify-between gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-brand-blue/20 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-blue">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Save this report to your account</p>
                <p className="text-xs text-ink-secondary mt-0.5">Track trends over time and skip the age/sex questions next visit — free, no card needed.</p>
                <div className="mt-2 flex gap-2">
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center px-3 py-1.5 bg-brand-blue text-white text-xs font-semibold rounded-lg hover:bg-brand-blue-hover transition-colors"
                  >
                    Create free account
                  </Link>
                  <button
                    onClick={dismissBanner}
                    className="text-xs text-ink-tertiary hover:text-ink-secondary transition-colors px-2 py-1"
                  >
                    Maybe later
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Fallback banner when auth is disabled (original behavior) */}
        {!AUTH_ENABLED && userData && userData.interpretationCount === 1 && !userData.saveBannerDismissed && result && (
          <div className="mt-4 animate-fade-in flex items-start justify-between gap-3 px-4 py-3.5 rounded-2xl bg-white dark:bg-slate-800 border border-brand-blue/20 shadow-sm">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-brand-blue/10 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-blue">
                  <path d="M5 4a2 2 0 012-2h6a2 2 0 012 2v14l-5-2.5L5 18V4z" />
                </svg>
              </div>
              <div>
                <p className="text-sm font-semibold text-ink">Save your results?</p>
                <p className="text-xs text-ink-secondary mt-0.5">Create a free account to track changes over time.</p>
              </div>
            </div>
            <button
              onClick={dismissBanner}
              className="text-xs text-ink-tertiary hover:text-ink-secondary transition-colors flex-shrink-0 mt-1 px-2 py-1 rounded-lg hover:bg-surface-raised"
            >
              Maybe later
            </button>
          </div>
        )}

        {/* "Here's what you'll get" preview — only shown on idle */}
        {state === "idle" && (
          <div className="mt-12">
            {/* Section header */}
            <div className="text-center mb-6">
              <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-[11px] font-bold text-brand-blue uppercase tracking-widest mb-3">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue pulse-glow" />
                Live preview · See what you&apos;ll get
              </span>
              <h3 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight leading-[1.1]">
                Your full report — in <span className="text-brand-blue">12 seconds</span>
              </h3>
              <p className="mt-2 text-sm text-ink-secondary max-w-xl mx-auto">
                Three reading depths, flagged values explained, specialist guidance, an action plan, and supplement recommendations — all from one upload.
              </p>
            </div>

            {/* Feature chips */}
            <div className="flex items-center justify-center gap-2 flex-wrap mb-6">
              {[
                { icon: "🔬", label: "3 reading depths" },
                { icon: "🚩", label: "Flag detection" },
                { icon: "👨‍⚕️", label: "Specialist match" },
                { icon: "💊", label: "Supplement plan" },
                { icon: "⚡", label: "Action steps" },
                { icon: "📊", label: "Trend tracking" },
              ].map((f) => (
                <span key={f.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-surface-border text-xs font-medium text-ink-secondary shadow-soft">
                  <span aria-hidden>{f.icon}</span>{f.label}
                </span>
              ))}
            </div>

            {/* Showcase card with gradient glow */}
            <div className="relative">
              <div
                className="absolute -inset-1 rounded-3xl opacity-60 blur-xl pointer-events-none"
                style={{ background: "radial-gradient(60% 60% at 30% 20%, rgba(74,133,239,0.35), transparent 70%), radial-gradient(60% 60% at 80% 80%, rgba(139,92,246,0.25), transparent 70%)" }}
                aria-hidden
              />
              <div className="relative bg-white dark:bg-slate-900 rounded-3xl border border-surface-border shadow-xl shadow-brand-blue/10 overflow-hidden">

                {reportMode === "lab" ? (
                  <>
                    {/* Report header bar */}
                    <div className="px-5 py-3.5 border-b border-surface-border bg-gradient-to-r from-surface-raised via-surface-raised/70 to-transparent flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue to-brand-indigo flex items-center justify-center flex-shrink-0 shadow-soft">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                            <path d="M4 2a2 2 0 00-2 2v12a2 2 0 002 2h12a2 2 0 002-2V4a2 2 0 00-2-2H4zm3 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h6a1 1 0 110 2H8a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-ink truncate">Sample_Lab_Panel.pdf</p>
                          <p className="text-[11px] text-ink-tertiary flex items-center gap-1.5">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-500"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            Analyzed in 11.4s · 12 markers detected
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-3 flex-shrink-0">
                        <div className="text-right">
                          <p className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Health Score</p>
                          <p className="text-2xl font-black text-amber-600 leading-none tabular-nums">72</p>
                        </div>
                        <div className="relative w-12 h-12">
                          <svg viewBox="0 0 48 48" className="w-12 h-12 -rotate-90">
                            <circle cx="24" cy="24" r="20" fill="none" stroke="rgba(148,163,184,0.18)" strokeWidth="4" />
                            <circle cx="24" cy="24" r="20" fill="none" stroke="#f59e0b" strokeWidth="4" strokeLinecap="round" strokeDasharray={2 * Math.PI * 20} strokeDashoffset={2 * Math.PI * 20 * (1 - 72 / 100)} />
                          </svg>
                          <div className="absolute inset-0 flex items-center justify-center">
                            <span className="text-[10px] font-bold text-amber-600">FAIR</span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Flags strip */}
                    <div className="px-5 pt-4 pb-3.5">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">3 values need attention</span>
                        <span className="text-[10px] text-emerald-600 font-bold">9 in range ✓</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        {[
                          { arrow: "↑", marker: "Glucose", value: "112", unit: "mg/dL", ref: "70–99" },
                          { arrow: "↓", marker: "Vitamin D", value: "18", unit: "ng/mL", ref: "30–100" },
                          { arrow: "↑", marker: "LDL", value: "134", unit: "mg/dL", ref: "<100" },
                        ].map((f) => (
                          <div key={f.marker} className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 overflow-hidden">
                            <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                            <span className="text-amber-500 text-xs font-bold pl-1">{f.arrow}</span>
                            <span className="text-xs font-semibold text-ink">{f.marker}</span>
                            <span className="text-xs font-bold text-amber-600 font-mono-data">{f.value}</span>
                            <span className="text-[10px] text-ink-tertiary">{f.unit}</span>
                            <span className="text-[10px] text-ink-tertiary hidden sm:inline">· ref {f.ref}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-t border-surface-border px-5 pt-3 bg-surface-raised/40 flex gap-0.5">
                      {([
                        { id: "simple",  label: "💬 Simple",  hint: "Plain English" },
                        { id: "medium",  label: "📋 Medium",  hint: "More detail" },
                        { id: "expert",  label: "🔬 Expert",  hint: "Clinical depth" },
                      ] as const).map((tab) => {
                        const active = tab.id === demoTier;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setDemoTier(tab.id)}
                            className={`group relative px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${active ? "bg-white dark:bg-slate-900 text-brand-blue border-b-2 border-brand-blue -mb-px" : "text-ink-tertiary hover:text-ink-secondary"}`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tier content */}
                    <div className="px-5 py-5 bg-surface-raised/40 min-h-[120px]">
                      {demoTier === "simple" && (
                        <div className="flex gap-3 animate-fade-in">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm">💬</span>
                          </div>
                          <p className="text-sm text-ink-secondary leading-relaxed">
                            Your blood sugar is a little high and your vitamin D is low — both are common and easy to address. The good news: your kidney and liver markers all look great. Worth a chat with your doctor about lifestyle tweaks.
                          </p>
                        </div>
                      )}
                      {demoTier === "medium" && (
                        <div className="flex gap-3 animate-fade-in">
                          <div className="w-7 h-7 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm">📋</span>
                          </div>
                          <p className="text-sm text-ink-secondary leading-relaxed">
                            Fasting glucose of 112 mg/dL falls in the impaired fasting glucose range (100–125 per ADA). LDL at 134 mg/dL is borderline-high (ATP-III). Vitamin D at 18 ng/mL indicates insufficiency. All three respond well to diet, exercise, and supplementation.
                          </p>
                        </div>
                      )}
                      {demoTier === "expert" && (
                        <div className="flex gap-3 animate-fade-in">
                          <div className="w-7 h-7 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm">🔬</span>
                          </div>
                          <p className="text-sm text-ink-secondary leading-relaxed">
                            IFG per ADA (FPG 100–125 mg/dL). Recommend HbA1c + 2-hr OGTT to stratify T2DM progression risk. Borderline LDL — formal 10-yr ASCVD assessment per ACC/AHA 2019. 25-OH vit D insufficiency: cholecalciferol 2,000 IU daily, recheck in 12 weeks.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Specialist + Action grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-surface-border">
                      <div className="p-4 bg-brand-blue/5 sm:border-r border-surface-border">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-brand-blue flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-brand-blue uppercase tracking-wider">Which specialist?</p>
                            <p className="text-xs text-ink-secondary leading-relaxed mt-0.5">
                              <strong>Endocrinologist</strong> for glucose metabolism and pre-diabetes evaluation.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border-t sm:border-t-0 border-surface-border">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">What to do</p>
                            <p className="text-xs text-ink-secondary leading-relaxed mt-0.5">
                              HbA1c test in 4–6 weeks · D3 2,000 IU daily · 30-min walk after meals.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Supplement teaser */}
                    <div className="px-5 py-3 border-t border-surface-border bg-gradient-to-r from-emerald-500/5 to-transparent flex items-center gap-2.5">
                      <span className="text-base">💊</span>
                      <p className="text-xs text-ink-secondary">
                        <span className="font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-wider text-[10px]">Supplement plan </span>
                        <strong>Vitamin D3</strong> 2,000 IU · <strong>Berberine</strong> 500 mg · <strong>Omega-3</strong> 1,000 mg — full dosing &amp; rationale included.
                      </p>
                    </div>
                  </>
                ) : (
                  <>
                    {/* Radiology header */}
                    <div className="px-5 py-3.5 border-b border-surface-border bg-gradient-to-r from-purple-500/5 via-purple-500/2 to-transparent flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-fuchsia-500 flex items-center justify-center flex-shrink-0 shadow-soft">
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                            <path fillRule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                            <path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" />
                          </svg>
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-ink truncate">Chest_CT_Report.pdf</p>
                          <p className="text-[11px] text-ink-tertiary flex items-center gap-1.5">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-500"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                            Analyzed in 9.7s · 2 findings
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30 dark:text-emerald-300 px-2.5 py-1 rounded-full uppercase tracking-wider">Routine follow-up</span>
                      </div>
                    </div>

                    {/* Findings strip */}
                    <div className="px-5 pt-4 pb-3.5">
                      <div className="flex items-center justify-between mb-2.5">
                        <span className="text-[10px] font-bold text-ink-tertiary uppercase tracking-wider">Key findings</span>
                      </div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400" />
                          <span className="text-amber-500 text-xs font-bold pl-1">↑</span>
                          <span className="text-xs font-semibold text-ink">Pulmonary Nodule</span>
                          <span className="text-xs font-bold text-amber-600 font-mono-data">4 mm</span>
                          <span className="text-[10px] text-ink-tertiary hidden sm:inline">· ref &lt;6 mm low risk</span>
                        </div>
                        <div className="relative flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 overflow-hidden">
                          <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400" />
                          <span className="text-emerald-600 text-xs font-bold pl-1">✓</span>
                          <span className="text-xs font-semibold text-ink">Hepatic Cyst</span>
                          <span className="text-xs font-bold text-emerald-600">benign · Bosniak I</span>
                        </div>
                      </div>
                    </div>

                    {/* Tabs */}
                    <div className="border-t border-surface-border px-5 pt-3 bg-surface-raised/40 flex gap-0.5">
                      {([
                        { id: "simple",  label: "💬 Simple"  },
                        { id: "medium",  label: "📋 Medium"  },
                        { id: "expert",  label: "🔬 Expert"  },
                      ] as const).map((tab) => {
                        const active = tab.id === demoTier;
                        return (
                          <button
                            key={tab.id}
                            type="button"
                            onClick={() => setDemoTier(tab.id)}
                            className={`px-4 py-2.5 text-xs font-semibold rounded-t-lg transition-all ${active ? "bg-white text-purple-600 border-b-2 border-purple-500 -mb-px" : "text-ink-tertiary hover:text-ink-secondary"}`}
                          >
                            {tab.label}
                          </button>
                        );
                      })}
                    </div>

                    {/* Tier content */}
                    <div className="px-5 py-5 bg-surface-raised/40 min-h-[120px]">
                      {demoTier === "simple" && (
                        <div className="flex gap-3 animate-fade-in">
                          <div className="w-7 h-7 rounded-full bg-emerald-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm">💬</span>
                          </div>
                          <p className="text-sm text-ink-secondary leading-relaxed">
                            This is a CT scan of your chest. The scan found a tiny spot on your lung (4 mm) — very common and almost always harmless. There&apos;s also a small fluid-filled cyst on your liver, which is incidental and needs no action.
                          </p>
                        </div>
                      )}
                      {demoTier === "medium" && (
                        <div className="flex gap-3 animate-fade-in">
                          <div className="w-7 h-7 rounded-full bg-brand-blue/10 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm">📋</span>
                          </div>
                          <p className="text-sm text-ink-secondary leading-relaxed">
                            A 4 mm pulmonary nodule is below the Fleischner Society threshold for routine follow-up in low-risk patients. The 8 mm hepatic cyst has benign morphology with no septations or enhancement — incidental, simple cyst.
                          </p>
                        </div>
                      )}
                      {demoTier === "expert" && (
                        <div className="flex gap-3 animate-fade-in">
                          <div className="w-7 h-7 rounded-full bg-purple-100 flex items-center justify-center flex-shrink-0">
                            <span className="text-sm">🔬</span>
                          </div>
                          <p className="text-sm text-ink-secondary leading-relaxed">
                            4 mm solid RUL nodule — no follow-up per Fleischner 2017 (low risk, &lt;6 mm). Simple hepatic cyst, homogeneous, no septations or enhancement — Bosniak I, benign. Correlate with priors if available.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Specialist + Action grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 border-t border-surface-border">
                      <div className="p-4 bg-purple-500/5 sm:border-r border-surface-border">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                              <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Which specialist?</p>
                            <p className="text-xs text-ink-secondary leading-relaxed mt-0.5">
                              Discuss with your <strong>ordering physician</strong> first; <strong>Pulmonology</strong> if clinically indicated.
                            </p>
                          </div>
                        </div>
                      </div>
                      <div className="p-4 border-t sm:border-t-0 border-surface-border">
                        <div className="flex items-start gap-2.5">
                          <div className="w-7 h-7 rounded-lg bg-emerald-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                            </svg>
                          </div>
                          <div className="min-w-0">
                            <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">What to do</p>
                            <p className="text-xs text-ink-secondary leading-relaxed mt-0.5">
                              No urgent action · routine follow-up only · keep this report for your records.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Trust footer */}
            <div className="mt-6 flex items-center justify-center gap-5 flex-wrap text-[11px] text-ink-tertiary">
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> No signup needed
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" /> File never stored
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-purple-500" /> 100% educational use
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// Bridges Clerk's useUser() state to the parent via a callback.
// Only mounted when AUTH_ENABLED is true, so when Clerk env vars are
// absent (e.g., on Vercel before env vars are configured) this never
// runs and useUser() is never invoked outside a ClerkProvider.
function ClerkAuthBridge({ onChange }: { onChange: (loaded: boolean, signedIn: boolean) => void }) {
  const { isLoaded, isSignedIn } = useUser();
  useEffect(() => {
    onChange(isLoaded, !!isSignedIn);
  }, [isLoaded, isSignedIn, onChange]);
  return null;
}
