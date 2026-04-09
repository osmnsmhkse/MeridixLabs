"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";

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
}

const TIER_CONFIG: Record<Tier, { label: string; emoji: string; audience: string; activeClass: string }> = {
  simple: {
    label: "Simple",
    emoji: "💬",
    audience: "Plain language",
    activeClass: "bg-brand-blue/10 text-brand-blue border-b-2 border-brand-blue",
  },
  medium: {
    label: "Medium",
    emoji: "📋",
    audience: "Educated patient",
    activeClass: "bg-brand-blue/10 text-brand-blue border-b-2 border-brand-blue",
  },
  expert: {
    label: "Expert",
    emoji: "🔬",
    audience: "Clinical detail",
    activeClass: "bg-purple-500/10 text-purple-700 border-b-2 border-purple-500",
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
  const amberAccent = "border-amber-200 bg-amber-50";
  const redAccent   = "border-red-200   bg-red-50";

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
          "Something went wrong on our end. This happens occasionally — please try again. If it keeps happening, email us at hello@meridixlabs.com",
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
        isAmber ? "bg-amber-100 text-amber-600" : "bg-red-100 text-red-600"
      }`}>
        {cfg.icon}
      </div>

      {/* Text */}
      <div className="space-y-1.5 max-w-sm">
        <p className={`text-base font-bold ${isAmber ? "text-amber-900" : "text-red-900"}`}>
          {cfg.title}
        </p>
        <p className={`text-sm leading-relaxed ${isAmber ? "text-amber-800" : "text-red-800"}`}>
          {cfg.message}
        </p>
      </div>

      {/* Try Again */}
      <button
        onClick={onReset}
        className={`mt-1 flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 ${
          isAmber
            ? "bg-white border border-amber-200 text-amber-800 hover:bg-amber-50 hover:border-amber-300"
            : "bg-white border border-red-200 text-red-700 hover:bg-red-50 hover:border-red-300"
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
const STEP_DELAYS = [0, 1500, 3000, 5000] as const;

type StepStatus = "waiting" | "active" | "done";

function StepRow({
  label,
  status,
}: {
  label: string;
  status: StepStatus;
}) {
  // Slide-in: start offset on mount, transition to resting position after 1 frame
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
      {/* Icon: spinner when active, checkmark when done */}
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

      {/* Label */}
      <span
        className={`text-sm leading-snug transition-colors duration-300 ${
          status === "active"
            ? "text-ink font-semibold"
            : "text-ink-secondary"
        }`}
      >
        {label}
      </span>
    </div>
  );
}

function LoadingAnimation({ mode }: { mode: ReportMode }) {
  const steps = mode === "radiology" ? LOADING_STEPS_RADIOLOGY : LOADING_STEPS_LAB;
  // activeStep: the index currently spinning. Steps before it are "done".
  const [activeStep, setActiveStep] = useState(0);

  useEffect(() => {
    const timers = STEP_DELAYS.slice(1).map((delay, i) =>
      setTimeout(() => setActiveStep(i + 1), delay)
    );
    return () => timers.forEach(clearTimeout);
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

      {/* Connector line skeleton while waiting — subtle pulse */}
      <div className="w-full max-w-xs space-y-2.5 pt-1">
        {[92, 78, 85].map((w, i) => (
          <div
            key={i}
            className="h-2.5 rounded-full shimmer"
            style={{ width: `${w}%` }}
          />
        ))}
      </div>

      {/* Privacy reassurance */}
      <p className="text-xs text-ink-tertiary text-center max-w-[260px] leading-relaxed">
        Your file is never stored. This session is completely private.
      </p>
    </div>
  );
}

function FlagBadge({ flag }: { flag: AnalysisFlag }) {
  const config = {
    high:   { bg: "bg-amber-50",  border: "border-amber-200",  text: "text-amber-700",  badge: "bg-amber-100 text-amber-700",  icon: "↑" },
    low:    { bg: "bg-blue-50",   border: "border-blue-200",   text: "text-blue-700",   badge: "bg-blue-100 text-blue-700",   icon: "↓" },
    normal: { bg: "bg-green-50",  border: "border-green-200",  text: "text-green-700",  badge: "bg-green-100 text-green-700", icon: "✓" },
  }[flag.status];

  return (
    <div className={`flex items-center justify-between p-3.5 rounded-xl ${config.bg} border ${config.border}`}>
      <div className="flex items-center gap-2.5">
        <span className={`w-6 h-6 rounded-full ${config.badge} flex items-center justify-center text-xs font-bold`}>{config.icon}</span>
        <span className="text-sm font-semibold text-ink">{flag.marker}</span>
      </div>
      <div className="text-right">
        <span className={`text-sm font-bold ${config.text}`}>{flag.value} {flag.unit}</span>
        {flag.reference && <p className="text-xs text-ink-tertiary">ref: {flag.reference}</p>}
      </div>
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
    <div className="bg-white rounded-2xl border border-surface-border overflow-hidden shadow-sm">
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
              <div className="p-5 bg-brand-blue-light/50">
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
    <div className="bg-white rounded-2xl border border-surface-border overflow-hidden shadow-sm print:hidden">
      {/* Header — always visible, toggles section */}
      <button
        onClick={handleToggle}
        className="w-full flex items-center justify-between px-5 py-4 hover:bg-surface-raised/60 transition-colors"
      >
        <div className="flex items-center gap-2.5">
          <span className="text-base">📋</span>
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

function ResultsPanel({ result, fileName, onReset, isSample, mode, lang }: { result: AnalysisResult; fileName: string; onReset: () => void; isSample: boolean; mode: ReportMode; lang: string }) {
  const [activeTier, setActiveTier] = useState<Tier>("simple");
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
        <div className="flex items-center gap-2.5 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200">
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

      {/* Flagged values / Key findings */}
      {result.flags && result.flags.length > 0 && (
        <div className="bg-white rounded-2xl border border-surface-border overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-surface-border bg-surface-raised">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">
              {mode === "radiology" ? "Key Findings" : "Flagged Values"}
            </p>
          </div>
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.flags.map((flag, i) => <FlagBadge key={i} flag={flag} />)}
          </div>
        </div>
      )}

      {/* Tier toggle + interpretation */}
      <div className="bg-white rounded-2xl border border-surface-border overflow-hidden shadow-sm">
        <div className="border-b border-surface-border px-5 pt-4 bg-surface-raised">
          <div className="flex gap-0.5">
            {(["simple", "medium", "expert"] as Tier[]).map((tier) => {
              const cfg = TIER_CONFIG[tier];
              const isActive = tier === activeTier;
              return (
                <button
                  key={tier}
                  onClick={() => setActiveTier(tier)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-t-lg text-sm font-medium transition-all duration-200 ${
                    isActive ? cfg.activeClass : "text-ink-tertiary hover:text-ink-secondary hover:bg-surface-border/40"
                  }`}
                >
                  <span>{cfg.emoji}</span>
                  <span>{cfg.label}</span>
                  {isActive && (
                    <span className="hidden sm:inline-block text-xs font-normal opacity-60">— {cfg.audience}</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-6">
          <div className="animate-fade-in">
            {paragraphs.map((para, i) => (
              <p key={i} className="text-ink-secondary leading-relaxed text-sm sm:text-base mb-3 last:mb-0">{para}</p>
            ))}
          </div>
        </div>
      </div>

      {/* Deep Dive */}
      <DeepDiveSection result={result} mode={mode} />

      {/* Action recommendation */}
      <div className="bg-brand-blue-light border border-brand-blue-mid rounded-2xl p-5">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 bg-brand-blue/15 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-brand-blue">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-xs font-bold text-brand-blue-dark uppercase tracking-widest mb-1.5">What should you do?</p>
            <p className="text-sm text-ink-secondary leading-relaxed">{result.action}</p>
          </div>
        </div>
      </div>

      {/* Doctor questions */}
      <DoctorQuestionsSection result={result} mode={mode} lang={lang} />

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 border border-amber-100 print:hidden">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Meridix Labs is an educational tool.</strong> This is not medical advice. Always consult a qualified physician.
        </p>
      </div>

      {/* Copy + Print action buttons */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-1 print:hidden">
        <button
          onClick={handleCopy}
          className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 ${
            copied
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-surface-border bg-white hover:border-brand-blue/30 hover:bg-brand-blue-light text-ink-secondary hover:text-brand-blue"
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
          className="flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl border border-surface-border bg-white hover:border-brand-blue/30 hover:bg-brand-blue-light text-ink-secondary hover:text-brand-blue text-sm font-semibold transition-all duration-200"
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
            <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a1 1 0 001 1h6a1 1 0 001-1v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a1 1 0 00-1-1H6a1 1 0 00-1 1zm2 0h6v3H7V4zm-1 9a1 1 0 112 0 1 1 0 01-2 0zm2 1v2h4v-2H8z" clipRule="evenodd" />
          </svg>
          Download as PDF
        </button>
      </div>

      {/* Toast notification (shown briefly after copy) */}
      {copied && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 bg-ink text-white text-sm font-medium rounded-xl shadow-xl animate-fade-in pointer-events-none">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-400">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Copied to clipboard!
        </div>
      )}
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
        className="w-full py-3.5 bg-white hover:bg-surface-raised border border-surface-border hover:border-brand-blue/30 text-ink-secondary hover:text-ink font-semibold rounded-2xl text-sm transition-all duration-200 flex items-center justify-center gap-2.5"
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

export default function AppPage() {
  const { lang } = useLanguage();
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [fileSizeMB, setFileSizeMB] = useState<string | undefined>(undefined);
  const [fileName, setFileName] = useState<string>("");
  const [isSample, setIsSample] = useState(false);
  const [reportMode, setReportMode] = useState<ReportMode>("lab");

  const setErrorState = (code: ErrorCode, msg?: string, sizeMB?: string) => {
    setErrorCode(code);
    setError(msg ?? code);
    setFileSizeMB(sizeMB);
    setState("error");
  };

  const handleFileSelect = async (file: File) => {
    // ── Client-side pre-validation (instant, no round-trip) ──────────────────
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      const mb = (file.size / (1024 * 1024)).toFixed(1);
      setFileName(file.name);
      setErrorState("FILE_TOO_LARGE", undefined, mb);
      return;
    }
    const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
    if (!allowedTypes.includes(file.type)) {
      setFileName(file.name);
      setErrorState("WRONG_FILE_TYPE");
      return;
    }

    setFileName(file.name);
    setIsSample(false);
    setError(null);
    setErrorCode(null);
    setFileSizeMB(undefined);
    setState("loading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", lang);
      formData.append("mode", reportMode);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setErrorState(
          (json.errorCode as ErrorCode) ?? "SERVER_ERROR",
          json.error,
          json.fileSizeMB,
        );
        return;
      }

      setResult(json.data);
      setState("success");
    } catch {
      // fetch() itself threw — network failure / timeout
      setErrorState("NETWORK_ERROR");
    }
  };

  const handleSample = async () => {
    setFileName("Sample — Basic Metabolic Panel");
    setIsSample(true);
    setError(null);
    setErrorCode(null);
    setFileSizeMB(undefined);
    setState("loading");

    try {
      const formData = new FormData();
      formData.append("sample", "true");
      formData.append("language", lang);
      formData.append("mode", "lab"); // sample is always a lab report

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) {
        setErrorState((json.errorCode as ErrorCode) ?? "SERVER_ERROR", json.error);
        return;
      }

      setResult(json.data);
      setState("success");
    } catch {
      setErrorState("NETWORK_ERROR");
    }
  };

  const handleReset = () => {
    setState("idle");
    setResult(null);
    setError(null);
    setErrorCode(null);
    setFileSizeMB(undefined);
    setFileName("");
    setIsSample(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-light to-white pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white border border-brand-blue/30 text-brand-blue text-xs font-semibold uppercase tracking-wider mb-5 shadow-sm">
            AI Lab Interpreter
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-snug">
            Upload your lab report.{" "}
            <span className="text-gradient-blue">Understand it in seconds.</span>
          </h1>
          <p className="mt-3 text-base text-ink-secondary max-w-xl mx-auto leading-relaxed">
            Our AI reads every value, flags what's abnormal, and explains the biology — in plain English or full clinical detail.
          </p>

          {/* Trust badges */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {[
              { icon: "🔒", label: "Never stored" },
              { icon: "✓",  label: "No account required" },
              { icon: "⚡", label: "Results in seconds" },
              { icon: "🌍", label: "10 languages" },
            ].map((b) => (
              <span key={b.label} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white border border-surface-border text-xs text-ink-secondary font-medium shadow-sm">
                <span>{b.icon}</span>
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
        <div className="bg-white rounded-3xl shadow-xl shadow-ink/5 border border-surface-border p-6 sm:p-8">
          {state === "error" && errorCode ? (
            <ErrorCard code={errorCode} fileSizeMB={fileSizeMB} onReset={handleReset} />
          ) : state === "idle" ? (
            <div className="space-y-4">
              {/* Report mode toggle */}
              <div className="flex p-1 bg-surface-raised rounded-2xl border border-surface-border gap-1">
                {([
                  { mode: "lab",       emoji: "🩸", label: "Lab Results"                },
                  { mode: "radiology", emoji: "🩻", label: "Radiology / Pathology"      },
                ] as { mode: ReportMode; emoji: string; label: string }[]).map((opt) => (
                  <button
                    key={opt.mode}
                    onClick={() => setReportMode(opt.mode)}
                    className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-all duration-200 ${
                      reportMode === opt.mode
                        ? "bg-white shadow-sm border border-surface-border text-ink"
                        : "text-ink-tertiary hover:text-ink-secondary"
                    }`}
                  >
                    <span>{opt.emoji}</span>
                    <span>{opt.label}</span>
                  </button>
                ))}
              </div>

              {/* Mode hint */}
              {reportMode === "radiology" && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-purple-50 border border-purple-100">
                  <span className="text-purple-500 text-sm mt-px flex-shrink-0">🩻</span>
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
                    className="w-full py-3 px-5 rounded-xl border border-surface-border hover:border-brand-blue/40 bg-surface-raised hover:bg-brand-blue-light text-ink-secondary hover:text-brand-blue font-medium text-sm transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 opacity-60">
                      <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                      <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                    </svg>
                    Try with a sample report
                  </button>
                </>
              )}
            </div>
          ) : state === "loading" ? (
            <LoadingAnimation mode={reportMode} />
          ) : result ? (
            <ResultsPanel result={result} fileName={fileName} onReset={handleReset} isSample={isSample} mode={reportMode} lang={lang} />
          ) : null}
        </div>

        {/* "Here's what you'll get" preview — only shown on idle */}
        {state === "idle" && (
          <div className="mt-8">
            <p className="text-center text-xs font-semibold text-ink-tertiary uppercase tracking-widest mb-4">Here's what you'll get</p>
            <div className="bg-white rounded-2xl border border-surface-border shadow-sm overflow-hidden">

              {reportMode === "lab" ? (
                <>
                  {/* Lab — Flagged value chip */}
                  <div className="px-5 pt-5 pb-3 flex items-center gap-3">
                    <span className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">Flagged Values</span>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-amber-500 text-xs font-bold">↑</span>
                      <span className="text-xs font-semibold text-ink">Glucose</span>
                      <span className="text-xs font-bold text-amber-600">112 mg/dL</span>
                      <span className="text-xs text-ink-tertiary">ref: 70–99</span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="border-t border-b border-surface-border px-5 py-0 bg-surface-raised flex gap-0.5">
                    {[
                      { label: "💬 Simple",  active: true  },
                      { label: "📋 Medium", active: false },
                      { label: "🔬 Expert",  active: false },
                    ].map((tab) => (
                      <span key={tab.label} className={`px-4 py-2.5 text-xs font-medium rounded-t-lg ${tab.active ? "bg-white text-brand-blue border-b-2 border-brand-blue -mb-px" : "text-ink-tertiary"}`}>
                        {tab.label}
                      </span>
                    ))}
                  </div>

                  {/* Lab sample content */}
                  <div className="px-5 py-4 space-y-2">
                    <p className="text-xs text-ink-secondary leading-relaxed">
                      <span className="font-semibold text-emerald-600">Simple: </span>
                      Your blood sugar is a little high — like having more sugar in your blood than ideal. Worth mentioning to your doctor.
                    </p>
                    <p className="text-xs text-ink-tertiary leading-relaxed">
                      <span className="font-semibold text-brand-blue">Medium: </span>
                      Fasting glucose of 112 mg/dL falls in the pre-diabetic range (100–125). Your insulin response may be losing efficiency.
                    </p>
                    <p className="text-xs text-ink-tertiary leading-relaxed">
                      <span className="font-semibold text-purple-600">Expert: </span>
                      IFG per ADA criteria. Consider HbA1c + OGTT to stratify T2DM risk. Review MetS components.
                    </p>
                  </div>

                  {/* Specialist */}
                  <div className="px-5 py-3 border-t border-surface-border bg-brand-blue-light/50 flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-brand-blue flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                    </div>
                    <p className="text-xs text-ink-secondary">
                      <span className="font-bold text-brand-blue uppercase tracking-wider text-[10px]">Which specialist? </span>
                      Consider seeing an <strong>Endocrinologist</strong> to evaluate glucose metabolism.
                    </p>
                  </div>
                </>
              ) : (
                <>
                  {/* Radiology — Key finding chip */}
                  <div className="px-5 pt-5 pb-3 flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold text-ink-tertiary uppercase tracking-wider">Key Findings</span>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200">
                      <span className="text-amber-500 text-xs font-bold">↑</span>
                      <span className="text-xs font-semibold text-ink">Pulmonary Nodule</span>
                      <span className="text-xs font-bold text-amber-600">4 mm</span>
                      <span className="text-xs text-ink-tertiary">ref: &lt;6mm low risk</span>
                    </div>
                    <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-green-50 border border-green-200">
                      <span className="text-green-600 text-xs font-bold">✓</span>
                      <span className="text-xs font-semibold text-ink">Hepatic Cyst</span>
                      <span className="text-xs font-bold text-green-600">incidental</span>
                      <span className="text-xs text-ink-tertiary">benign</span>
                    </div>
                  </div>

                  {/* Tabs */}
                  <div className="border-t border-b border-surface-border px-5 py-0 bg-surface-raised flex gap-0.5">
                    {[
                      { label: "💬 Simple",  active: true  },
                      { label: "📋 Medium", active: false },
                      { label: "🔬 Expert",  active: false },
                    ].map((tab) => (
                      <span key={tab.label} className={`px-4 py-2.5 text-xs font-medium rounded-t-lg ${tab.active ? "bg-white text-purple-600 border-b-2 border-purple-500 -mb-px" : "text-ink-tertiary"}`}>
                        {tab.label}
                      </span>
                    ))}
                  </div>

                  {/* Radiology sample content */}
                  <div className="px-5 py-4 space-y-2">
                    <p className="text-xs text-ink-secondary leading-relaxed">
                      <span className="font-semibold text-emerald-600">Simple: </span>
                      This is a CT scan of your chest. The scan found a tiny spot on your lung (4 mm) — this is very common and almost always harmless. There&apos;s also a small fluid-filled cyst on your liver, which is an incidental finding requiring no action.
                    </p>
                    <p className="text-xs text-ink-tertiary leading-relaxed">
                      <span className="font-semibold text-brand-blue">Medium: </span>
                      A 4 mm pulmonary nodule is below the Fleischner Society threshold for routine follow-up in low-risk patients. The 8 mm hepatic cyst has benign morphology and is incidental.
                    </p>
                    <p className="text-xs text-ink-tertiary leading-relaxed">
                      <span className="font-semibold text-purple-600">Expert: </span>
                      4 mm solid RUL nodule — no follow-up recommended per Fleischner (low risk, &lt;6 mm). Simple hepatic cyst, homogeneous, no septations — Bosniak I, benign.
                    </p>
                  </div>

                  {/* Specialist */}
                  <div className="px-5 py-3 border-t border-surface-border bg-purple-50/50 flex items-center gap-2.5">
                    <div className="w-6 h-6 rounded-lg bg-purple-500 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-white">
                        <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                      </svg>
                    </div>
                    <p className="text-xs text-ink-secondary">
                      <span className="font-bold text-purple-600 uppercase tracking-wider text-[10px]">Which specialist? </span>
                      Discuss with your <strong>ordering physician</strong> first. A <strong>Pulmonologist</strong> may advise on the nodule if clinically indicated.
                    </p>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
