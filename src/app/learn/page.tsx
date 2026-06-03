"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { useTranslations } from "next-intl";
import type { PracticeCase, EvaluationResult } from "@/types/learn";

// ── Types ─────────────────────────────────────────────────────────────────────
type Difficulty = "beginner" | "intermediate" | "advanced";
type Specialty   = "mixed" | "cardiology" | "endocrinology" | "nephrology" | "hematology" | "hepatology" | "pulmonology";
type Mode        = "guided" | "exam";
type PageState   = "idle" | "generating" | "viewing" | "evaluating" | "result";

interface RecentCase {
  id: string;
  difficulty: Difficulty;
  specialty: Specialty;
  grade: string;
  diagnosis: string;
  xpEarned: number;
}

interface SessionData {
  casesCompleted: number;
  flagsCorrect: number;
  flagsTotal: number;
  streak: number;
  bestStreak: number;
  xp: number;
  recentCases: RecentCase[];
}

// ── Config ────────────────────────────────────────────────────────────────────
const DIFFICULTY_CONFIG = {
  beginner:     { label: "diffBeginner",     xp: 50,  color: "emerald", desc: "diffBeginnerDesc" },
  intermediate: { label: "diffIntermediate", xp: 100, color: "amber",   desc: "diffIntermediateDesc" },
  advanced:     { label: "diffAdvanced",     xp: 200, color: "red",     desc: "diffAdvancedDesc" },
} as const;

const SPECIALTY_CONFIG: Record<Specialty, { label: string; icon: React.ReactNode; color: string }> = {
  mixed:         { label: "Mixed",         color: "violet",   icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM14 11a1 1 0 011 1v1h1a1 1 0 110 2h-1v1a1 1 0 11-2 0v-1h-1a1 1 0 110-2h1v-1a1 1 0 011-1z"/></svg> },
  cardiology:    { label: "Cardiology",    color: "red",      icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd"/></svg> },
  endocrinology: { label: "Endocrinology", color: "amber",    icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/></svg> },
  nephrology:    { label: "Nephrology",    color: "blue",     icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z"/><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd"/></svg> },
  hematology:    { label: "Hematology",    color: "rose",     icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187a1.993 1.993 0 00-.114-.035l1.063-1.063A3 3 0 009 8.172z" clipRule="evenodd"/></svg> },
  hepatology:    { label: "Hepatology",    color: "orange",   icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/></svg> },
  pulmonology:   { label: "Pulmonology",   color: "sky",      icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M2 10a8 8 0 018-8v8h8a8 8 0 11-16 0z"/><path d="M12 2.252A8.014 8.014 0 0117.748 8H12V2.252z"/></svg> },
};

const GRADE_CONFIG: Record<string, { bg: string; text: string; border: string; label: string }> = {
  "A+": { bg: "bg-emerald-500", text: "text-white",       border: "border-emerald-400", label: "Outstanding!" },
  "A":  { bg: "bg-green-500",   text: "text-white",       border: "border-green-400",   label: "Excellent!" },
  "B":  { bg: "bg-blue-500",    text: "text-white",       border: "border-blue-400",    label: "Good work" },
  "C":  { bg: "bg-amber-500",   text: "text-white",       border: "border-amber-400",   label: "Keep practicing" },
  "D":  { bg: "bg-red-500",     text: "text-white",       border: "border-red-400",     label: "Review needed" },
};

const SESSION_KEY = "meridix_learn_v3";

function readSession(): SessionData {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    if (raw) return { casesCompleted: 0, flagsCorrect: 0, flagsTotal: 0, streak: 0, bestStreak: 0, xp: 0, recentCases: [], ...JSON.parse(raw) };
  } catch { /* noop */ }
  return { casesCompleted: 0, flagsCorrect: 0, flagsTotal: 0, streak: 0, bestStreak: 0, xp: 0, recentCases: [] };
}

function writeSession(data: SessionData) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch { /* noop */ }
}

function calcXP(difficulty: Difficulty, grade: string, mode: Mode, hintsUsed: number, timeRemaining: number, timerDuration: number): number {
  const base = { beginner: 50, intermediate: 100, advanced: 200 }[difficulty];
  const gradeMult: Record<string, number> = { "A+": 1.5, "A": 1.25, "B": 1.0, "C": 0.75, "D": 0.5 };
  const modeMult = mode === "exam" ? 1.0 : 0.75;
  const hintPenalty = hintsUsed * 10;
  const timerBonus = mode === "exam" && timerDuration > 0 && timeRemaining > timerDuration * 0.5 ? 25 : 0;
  return Math.max(5, Math.round(base * (gradeMult[grade] ?? 1.0) * modeMult) - hintPenalty + timerBonus);
}

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function GradeCircle({ grade, scorePct }: { grade: string; scorePct: number }) {
  const cfg = GRADE_CONFIG[grade] ?? GRADE_CONFIG["B"];
  return (
    <div className="flex flex-col items-center gap-2">
      <div className={`w-24 h-24 rounded-full ${cfg.bg} flex flex-col items-center justify-center shadow-lg`}>
        <span className="text-3xl font-extrabold text-white leading-none">{grade}</span>
        <span className="text-xs text-white/80 font-medium">{scorePct}%</span>
      </div>
      <span className="text-sm font-semibold text-ink">{cfg.label}</span>
    </div>
  );
}

function ConfidenceStars({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          onClick={() => onChange(star)}
          className={`w-7 h-7 rounded transition-colors ${star <= value ? "text-amber-400" : "text-ink-tertiary hover:text-amber-300"}`}
        >
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 mx-auto">
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"/>
          </svg>
        </button>
      ))}
    </div>
  );
}

function XPBadge({ xp }: { xp: number }) {
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-amber-500">
        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
      </svg>
      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">{xp.toLocaleString()} XP</span>
    </div>
  );
}

function StreakBadge({ streak }: { streak: number }) {
  if (streak === 0) return null;
  return (
    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800">
      <span className="text-sm">🔥</span>
      <span className="text-xs font-bold text-orange-700 dark:text-orange-400">{streak} streak</span>
    </div>
  );
}

function TimerDisplay({ seconds, total }: { seconds: number; total: number }) {
  const pct = total > 0 ? (seconds / total) * 100 : 100;
  const urgent = seconds < 60;
  const warning = seconds < total * 0.33;
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${urgent ? "bg-red-50 dark:bg-red-900/20 border-red-300 dark:border-red-700" : warning ? "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800" : "bg-surface-raised border-surface-border"}`}>
      <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 ${urgent ? "text-red-500 animate-pulse" : warning ? "text-amber-500" : "text-ink-tertiary"}`}>
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
      </svg>
      <span className={`text-sm font-bold tabular-nums ${urgent ? "text-red-600 dark:text-red-400" : warning ? "text-amber-600 dark:text-amber-400" : "text-ink"}`}>
        {formatTime(seconds)}
      </span>
      <div className="w-16 h-1.5 bg-surface-border rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all ${urgent ? "bg-red-500" : warning ? "bg-amber-500" : "bg-emerald-500"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function LearnPage() {
  const t = useTranslations("Learn");
  const [pageState,      setPageState]      = useState<PageState>("idle");
  const [difficulty,     setDifficulty]     = useState<Difficulty>("beginner");
  const [specialty,      setSpecialty]      = useState<Specialty>("mixed");
  const [mode,           setMode]           = useState<Mode>("guided");
  const [timerDuration,  setTimerDuration]  = useState<number>(600); // seconds
  const [practiceCase,   setPracticeCase]   = useState<PracticeCase | null>(null);
  const [evaluation,     setEvaluation]     = useState<EvaluationResult | null>(null);
  const [session,        setSession]        = useState<SessionData>({ casesCompleted: 0, flagsCorrect: 0, flagsTotal: 0, streak: 0, bestStreak: 0, xp: 0, recentCases: [] });
  const [error,          setError]          = useState<string | null>(null);

  // Interaction state
  const [flaggedIndices,   setFlaggedIndices]   = useState<Set<number>>(new Set());
  const [hintsRevealed,    setHintsRevealed]    = useState<number>(0);
  const [studentDiagnosis, setStudentDiagnosis] = useState("");
  const [studentNextStep,  setStudentNextStep]  = useState("");
  const [confidence,       setConfidence]       = useState<number>(0);
  const [timeRemaining,    setTimeRemaining]     = useState<number>(600);
  const [timerExpired,     setTimerExpired]      = useState(false);
  const [xpEarned,         setXpEarned]          = useState(0);

  const timerRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    setSession(readSession());
  }, []);

  // Timer logic
  useEffect(() => {
    if (pageState === "viewing" && mode === "exam" && !timerExpired) {
      timerRef.current = setInterval(() => {
        setTimeRemaining((t) => {
          if (t <= 1) {
            clearInterval(timerRef.current!);
            setTimerExpired(true);
            return 0;
          }
          return t - 1;
        });
      }, 1000);
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [pageState, mode, timerExpired]);

  const generateCase = useCallback(async () => {
    setError(null);
    setPageState("generating");
    setPracticeCase(null);
    setStudentDiagnosis("");
    setStudentNextStep("");
    setConfidence(0);
    setFlaggedIndices(new Set());
    setHintsRevealed(0);
    setTimeRemaining(timerDuration);
    setTimerExpired(false);
    setEvaluation(null);
    try {
      const res  = await fetch("/api/practice-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty, specialty }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate case.");
      setPracticeCase(json.case as PracticeCase);
      setPageState("viewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPageState("idle");
    }
  }, [difficulty, specialty, timerDuration]);

  const submitInterpretation = useCallback(async () => {
    if (!practiceCase || !studentDiagnosis.trim()) return;
    if (timerRef.current) clearInterval(timerRef.current);
    setError(null);
    setPageState("evaluating");

    const flaggedMarkers = Array.from(flaggedIndices).map((i) => practiceCase.labs[i]?.marker).filter(Boolean);

    try {
      const res  = await fetch("/api/evaluate-interpretation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          practiceCase,
          studentAnswer: studentDiagnosis,
          studentNextStep: studentNextStep.trim() || undefined,
          studentFlaggedMarkers: flaggedMarkers,
          difficulty,
          confidence: confidence || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to evaluate.");
      const ev = json.evaluation as EvaluationResult;
      setEvaluation(ev);

      const xp = calcXP(difficulty, ev.grade, mode, hintsRevealed, timeRemaining, timerDuration);
      setXpEarned(xp);

      const isStreak = ev.score_pct >= 65;
      const newStreak = isStreak ? session.streak + 1 : 0;

      const recent: RecentCase = {
        id: Date.now().toString(),
        difficulty,
        specialty,
        grade: ev.grade,
        diagnosis: ev.ai_diagnosis.slice(0, 60),
        xpEarned: xp,
      };

      const updated: SessionData = {
        casesCompleted: session.casesCompleted + 1,
        flagsCorrect:   session.flagsCorrect + ev.flags_correct,
        flagsTotal:     session.flagsTotal   + ev.flags_total,
        streak:         newStreak,
        bestStreak:     Math.max(session.bestStreak, newStreak),
        xp:             session.xp + xp,
        recentCases:    [recent, ...session.recentCases].slice(0, 5),
      };
      writeSession(updated);
      setSession(updated);
      setPageState("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPageState("viewing");
    }
  }, [practiceCase, studentDiagnosis, studentNextStep, flaggedIndices, difficulty, specialty, mode, hintsRevealed, timeRemaining, timerDuration, confidence, session]);

  const nextCase = (newDifficulty?: Difficulty) => {
    if (newDifficulty) setDifficulty(newDifficulty);
    setPageState("idle");
    setPracticeCase(null);
    setEvaluation(null);
    setError(null);
    setFlaggedIndices(new Set());
    setHintsRevealed(0);
    setStudentDiagnosis("");
    setStudentNextStep("");
    setConfidence(0);
    setTimerExpired(false);
  };

  const toggleFlag = (i: number) => {
    setFlaggedIndices((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i); else next.add(i);
      return next;
    });
  };

  const accuracy = session.flagsTotal > 0
    ? Math.round((session.flagsCorrect / session.flagsTotal) * 100)
    : null;

  // ── RENDER ─────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50/80 to-white dark:from-slate-900 dark:to-slate-900 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* ── HEADER ── */}
        <div className="text-center mb-8">
          <div className="chip text-violet-600 dark:text-violet-400 mb-5">
            Clinical Practice Mode
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold headline-accent tracking-tight">
            Practice Clinical Interpretation
          </h1>
          <p className="mt-3 text-base text-ink-secondary max-w-xl mx-auto">
            AI-generated cases with specialty focus, progressive hints, and instant expert feedback.
          </p>

          {/* Session stats row */}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-2.5">
            <XPBadge xp={session.xp} />
            {session.streak > 0 && <StreakBadge streak={session.streak} />}
            {accuracy !== null && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-500">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>
                </svg>
                <span className="text-xs font-bold text-blue-700 dark:text-blue-400">{accuracy}% accuracy</span>
              </div>
            )}
            {session.casesCompleted > 0 && (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-surface-raised border border-surface-border">
                <span className="text-xs font-bold text-ink">{session.casesCompleted}</span>
                <span className="text-xs text-ink-tertiary">cases today</span>
              </div>
            )}
          </div>
        </div>

        {/* Error banner */}
        {error && (
          <div className="mb-4 flex items-center gap-2.5 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 flex-shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
            </svg>
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            IDLE — Setup panel
        ══════════════════════════════════════════════════════ */}
        {(pageState === "idle" || pageState === "generating") && (
          <div className="space-y-4">

            {/* Specialty selector */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm p-5">
              <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-3">Specialty Focus</p>
              <div className="flex flex-wrap gap-2">
                {(Object.entries(SPECIALTY_CONFIG) as [Specialty, typeof SPECIALTY_CONFIG["mixed"]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setSpecialty(key)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 ${
                      specialty === key
                        ? `bg-${cfg.color}-100 dark:bg-${cfg.color}-900/30 border-${cfg.color}-300 dark:border-${cfg.color}-700 text-${cfg.color}-700 dark:text-${cfg.color}-400`
                        : "bg-surface-raised border-surface-border text-ink-secondary hover:border-surface-border/60 hover:text-ink"
                    }`}
                  >
                    <span className={specialty === key ? `text-${cfg.color}-600 dark:text-${cfg.color}-400` : "text-ink-tertiary"}>{cfg.icon}</span>
                    {cfg.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Difficulty + Mode */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {/* Difficulty */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm p-5">
                <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-3">Difficulty</p>
                <div className="space-y-2">
                  {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG["beginner"]][]).map(([key, cfg]) => (
                    <button
                      key={key}
                      onClick={() => setDifficulty(key)}
                      className={`w-full flex items-center justify-between p-3 rounded-xl border-2 text-left transition-all duration-150 ${
                        difficulty === key
                          ? `bg-${cfg.color}-50 dark:bg-${cfg.color}-900/20 border-${cfg.color}-300 dark:border-${cfg.color}-700`
                          : "border-surface-border bg-surface-raised hover:border-surface-border/80"
                      }`}
                    >
                      <div>
                        <p className={`text-sm font-bold ${difficulty === key ? `text-${cfg.color}-700 dark:text-${cfg.color}-400` : "text-ink"}`}>{cfg.label}</p>
                        <p className="text-[11px] text-ink-tertiary mt-0.5">{cfg.desc}</p>
                      </div>
                      <span className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${difficulty === key ? `bg-${cfg.color}-100 dark:bg-${cfg.color}-900/40 text-${cfg.color}-700 dark:text-${cfg.color}-300` : "bg-surface-border/50 text-ink-tertiary"}`}>
                        +{cfg.xp} XP
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Mode */}
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm p-5 space-y-4">
                <div>
                  <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-3">Practice Mode</p>
                  <div className="grid grid-cols-2 gap-2">
                    {([
                      { key: "guided", label: "Guided", desc: "Hints available · 0.75× XP", icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd"/></svg> },
                      { key: "exam",   label: "Exam",   desc: "Timed · full XP · no hints",  icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/></svg> },
                    ] as { key: Mode; label: string; desc: string; icon: React.ReactNode }[]).map((opt) => (
                      <button
                        key={opt.key}
                        onClick={() => setMode(opt.key)}
                        className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border-2 text-center transition-all ${
                          mode === opt.key
                            ? "bg-violet-50 dark:bg-violet-900/20 border-violet-300 dark:border-violet-700 text-violet-700 dark:text-violet-400"
                            : "border-surface-border bg-surface-raised text-ink-tertiary hover:border-surface-border/80 hover:text-ink"
                        }`}
                      >
                        {opt.icon}
                        <span className="text-xs font-bold">{opt.label}</span>
                        <span className="text-[10px] text-ink-tertiary leading-tight">{opt.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Timer options — only in exam mode */}
                {mode === "exam" && (
                  <div>
                    <p className="text-[11px] font-semibold text-ink-tertiary mb-2">Time limit</p>
                    <div className="flex gap-2">
                      {([300, 600, 900] as const).map((sec) => (
                        <button
                          key={sec}
                          onClick={() => setTimerDuration(sec)}
                          className={`flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                            timerDuration === sec
                              ? "bg-violet-600 text-white border-violet-600"
                              : "bg-surface-raised border-surface-border text-ink-secondary hover:border-violet-300"
                          }`}
                        >
                          {sec / 60} min
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Generate button */}
            <button
              onClick={generateCase}
              disabled={pageState === "generating"}
              className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-sm transition-all duration-200 shadow-lg shadow-violet-500/20 hover:shadow-violet-500/40 hover:-translate-y-0.5 flex items-center justify-center gap-2.5"
            >
              {pageState === "generating" ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                  </svg>
                  Generating {SPECIALTY_CONFIG[specialty].label} case…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                  </svg>
                  Generate {DIFFICULTY_CONFIG[difficulty].label} {SPECIALTY_CONFIG[specialty].label} Case
                </>
              )}
            </button>

            {/* Recent cases */}
            {session.recentCases.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm p-5">
                <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-3">Recent Cases</p>
                <div className="space-y-2">
                  {session.recentCases.map((rc) => {
                    const gradeCfg = GRADE_CONFIG[rc.grade] ?? GRADE_CONFIG["B"];
                    return (
                      <div key={rc.id} className="flex items-center gap-3 py-1.5">
                        <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-extrabold text-white flex-shrink-0 ${gradeCfg.bg}`}>{rc.grade}</span>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-semibold text-ink truncate">{rc.diagnosis}</p>
                          <p className="text-[10px] text-ink-tertiary">{DIFFICULTY_CONFIG[rc.difficulty]?.label} · {SPECIALTY_CONFIG[rc.specialty]?.label}</p>
                        </div>
                        <span className="text-[11px] font-bold text-amber-600 dark:text-amber-400 flex-shrink-0">+{rc.xpEarned} XP</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            VIEWING — Case + interactive answer panel
        ══════════════════════════════════════════════════════ */}
        {(pageState === "viewing" || pageState === "evaluating") && practiceCase && (
          <div className="space-y-4">

            {/* Top bar: difficulty + specialty + timer */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <span className={`text-xs font-bold px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/30 text-violet-700 dark:text-violet-400`}>
                  {DIFFICULTY_CONFIG[difficulty].label}
                </span>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-surface-raised border border-surface-border text-ink-secondary">
                  {SPECIALTY_CONFIG[specialty].label}
                </span>
                {mode === "guided" && (
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800">Guided</span>
                )}
              </div>
              {mode === "exam" && (
                <TimerDisplay seconds={timeRemaining} total={timerDuration} />
              )}
            </div>

            {/* Timer expired banner */}
            {timerExpired && (
              <div className="flex items-center gap-2.5 p-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 flex-shrink-0">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd"/>
                </svg>
                <p className="text-sm font-semibold text-red-700 dark:text-red-400">Time&apos;s up — submit your best interpretation!</p>
              </div>
            )}

            {/* Patient case card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-border bg-violet-50/50 dark:bg-violet-900/10 flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-violet-600 dark:text-violet-400">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-[11px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest mb-1">Patient Presentation</p>
                  <p className="text-sm font-semibold text-ink leading-snug">{practiceCase.patient.complaint}</p>
                  {practiceCase.patient.clinical_context && (
                    <p className="text-xs text-ink-secondary mt-1.5 leading-relaxed">{practiceCase.patient.clinical_context}</p>
                  )}
                </div>
              </div>

              {/* Lab table — status hidden, click to flag */}
              <div className="p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">Laboratory Results</p>
                  <span className="text-[11px] text-ink-tertiary bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 px-2 py-0.5 rounded-full font-medium">
                    Click rows to flag significant values
                  </span>
                </div>
                <div className="rounded-xl border border-surface-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-raised border-b border-surface-border">
                        <th className="text-left px-4 py-2.5 text-[11px] font-bold text-ink-tertiary uppercase tracking-wide">Test</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-bold text-ink-tertiary uppercase tracking-wide">Result</th>
                        <th className="text-left px-4 py-2.5 text-[11px] font-bold text-ink-tertiary uppercase tracking-wide">Reference</th>
                        <th className="px-4 py-2.5 text-[11px] font-bold text-ink-tertiary uppercase tracking-wide text-center">Flag?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {practiceCase.labs.map((lab, i) => {
                        const isFlagged = flaggedIndices.has(i);
                        return (
                          <tr
                            key={i}
                            onClick={() => toggleFlag(i)}
                            className={`border-b border-surface-border last:border-0 cursor-pointer select-none transition-colors ${
                              isFlagged
                                ? "bg-amber-50 dark:bg-amber-900/15 hover:bg-amber-100/60 dark:hover:bg-amber-900/25"
                                : "hover:bg-surface-raised/60"
                            }`}
                          >
                            <td className="px-4 py-3 font-semibold text-ink text-sm">{lab.marker}</td>
                            <td className="px-4 py-3 font-bold text-ink text-sm">
                              {lab.value} <span className="font-normal text-ink-tertiary text-xs">{lab.unit}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-ink-tertiary">{lab.reference}</td>
                            <td className="px-4 py-3 text-center">
                              <div className={`w-5 h-5 rounded-md border-2 flex items-center justify-center mx-auto transition-all ${
                                isFlagged
                                  ? "bg-amber-500 border-amber-500"
                                  : "border-surface-border hover:border-amber-400"
                              }`}>
                                {isFlagged && (
                                  <svg viewBox="0 0 12 12" fill="currentColor" className="w-3 h-3 text-white">
                                    <path d="M2 6l2.5 2.5L10 3"/>
                                  </svg>
                                )}
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {flaggedIndices.size > 0 && (
                  <p className="mt-2 text-xs text-amber-700 dark:text-amber-400 font-semibold">
                    {flaggedIndices.size} value{flaggedIndices.size !== 1 ? "s" : ""} flagged as significant
                  </p>
                )}
              </div>
            </div>

            {/* Hints — guided mode only */}
            {mode === "guided" && practiceCase.hints && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm p-5">
                <div className="flex items-center justify-between mb-3">
                  <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">Progressive Hints</p>
                  <span className="text-[11px] text-ink-tertiary">{hintsRevealed}/3 used · −10 XP each</span>
                </div>
                <div className="space-y-2">
                  {practiceCase.hints.map((hint, i) => {
                    const revealed = i < hintsRevealed;
                    const isNext   = i === hintsRevealed;
                    return (
                      <div key={i} className={`rounded-xl border p-3 transition-all ${
                        revealed ? "bg-blue-50 dark:bg-blue-900/10 border-blue-200 dark:border-blue-800" : "bg-surface-raised border-surface-border"
                      }`}>
                        <div className="flex items-start gap-2.5">
                          <span className={`w-5 h-5 rounded-full flex-shrink-0 flex items-center justify-center text-[10px] font-bold mt-0.5 ${revealed ? "bg-blue-500 text-white" : "bg-surface-border text-ink-tertiary"}`}>{i + 1}</span>
                          {revealed ? (
                            <p className="text-sm text-ink-secondary leading-relaxed">{hint}</p>
                          ) : isNext ? (
                            <button
                              onClick={() => setHintsRevealed(i + 1)}
                              className="text-sm font-semibold text-blue-600 dark:text-blue-400 hover:underline"
                            >
                              Reveal hint {i + 1} (−10 XP)
                            </button>
                          ) : (
                            <p className="text-sm text-ink-tertiary italic">Locked — reveal hint {i} first</p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Answer panel */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm p-5 space-y-4">
              <div>
                <h3 className="text-sm font-bold text-ink mb-0.5">Your Interpretation</h3>
                <p className="text-xs text-ink-tertiary">What&apos;s the most likely diagnosis or clinical concern? What pattern do you see?</p>
              </div>

              <textarea
                value={studentDiagnosis}
                onChange={(e) => setStudentDiagnosis(e.target.value)}
                disabled={pageState === "evaluating"}
                placeholder="e.g. The elevated glucose and HbA1c together suggest Type 2 Diabetes. The low sodium may reflect SIADH or dilutional hyponatremia…"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-900 text-ink placeholder:text-ink-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all resize-none disabled:opacity-50 leading-relaxed"
              />

              <div>
                <label className="text-xs font-bold text-ink-tertiary uppercase tracking-wide block mb-1.5">
                  Next Diagnostic Step <span className="font-normal normal-case text-ink-tertiary">(optional)</span>
                </label>
                <input
                  type="text"
                  value={studentNextStep}
                  onChange={(e) => setStudentNextStep(e.target.value)}
                  disabled={pageState === "evaluating"}
                  placeholder="e.g. Order HbA1c, repeat fasting glucose, check TSH"
                  className="w-full px-4 py-2.5 rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-900 text-ink placeholder:text-ink-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all disabled:opacity-50"
                />
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold text-ink-tertiary uppercase tracking-wide mb-1.5">Confidence</p>
                  <ConfidenceStars value={confidence} onChange={setConfidence} />
                </div>
                <button
                  onClick={submitInterpretation}
                  disabled={pageState === "evaluating" || !studentDiagnosis.trim()}
                  className="py-3 px-6 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all duration-200 flex items-center gap-2 shadow-md shadow-violet-500/20"
                >
                  {pageState === "evaluating" ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                      </svg>
                      Evaluating…
                    </>
                  ) : (
                    <>
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                      </svg>
                      Submit
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════════════════════════════════════════
            RESULT — Full evaluation
        ══════════════════════════════════════════════════════ */}
        {pageState === "result" && practiceCase && evaluation && (
          <div className="space-y-4">

            {/* Score + XP header */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm p-6">
              <div className="flex flex-col sm:flex-row items-center gap-6">
                <GradeCircle grade={evaluation.grade} scorePct={evaluation.score_pct} />
                <div className="flex-1 text-center sm:text-left">
                  <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-1">AI Diagnosis</p>
                  <p className="text-base font-bold text-ink leading-snug mb-3">{evaluation.ai_diagnosis}</p>
                  <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                    <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-amber-500">
                        <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd"/>
                      </svg>
                      <span className="text-xs font-bold text-amber-700 dark:text-amber-400">+{xpEarned} XP earned</span>
                    </div>
                    <div className="px-3 py-1.5 rounded-full bg-surface-raised border border-surface-border text-xs font-semibold text-ink-secondary">
                      {evaluation.flags_correct}/{evaluation.flags_total} findings caught
                    </div>
                    {mode === "exam" && timerDuration > 0 && (
                      <div className="px-3 py-1.5 rounded-full bg-surface-raised border border-surface-border text-xs font-semibold text-ink-secondary">
                        {formatTime(timeRemaining)} remaining
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Per-finding breakdown */}
            {evaluation.key_findings && evaluation.key_findings.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-surface-border bg-surface-raised">
                  <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">Finding Breakdown</p>
                </div>
                <div className="divide-y divide-surface-border">
                  {evaluation.key_findings.map((f, i) => (
                    <div key={i} className={`flex items-start gap-3 p-4 ${f.student_caught ? "bg-emerald-50/40 dark:bg-emerald-900/5" : "bg-red-50/40 dark:bg-red-900/5"}`}>
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${f.student_caught ? "bg-emerald-100 dark:bg-emerald-900/40" : "bg-red-100 dark:bg-red-900/40"}`}>
                        {f.student_caught ? (
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                          </svg>
                        ) : (
                          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-red-600 dark:text-red-400">
                            <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/>
                          </svg>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-bold text-ink">{f.marker}</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${f.student_caught ? "bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400" : "bg-red-100 dark:bg-red-900/40 text-red-700 dark:text-red-400"}`}>
                            {f.student_caught ? "Caught ✓" : "Missed ✗"}
                          </span>
                        </div>
                        <p className="text-xs text-ink-secondary leading-relaxed">{f.significance}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Lab table revealed — now with actual status */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-border bg-surface-raised">
                <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">Lab Results Revealed</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-surface-raised border-b border-surface-border">
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold text-ink-tertiary uppercase tracking-wide">Test</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold text-ink-tertiary uppercase tracking-wide">Result</th>
                      <th className="text-left px-4 py-2.5 text-[11px] font-bold text-ink-tertiary uppercase tracking-wide">Reference</th>
                      <th className="px-4 py-2.5 text-[11px] font-bold text-ink-tertiary uppercase tracking-wide">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {practiceCase.labs.map((lab, i) => (
                      <tr key={i} className={`border-b border-surface-border last:border-0 ${lab.status !== "normal" ? "bg-amber-50/50 dark:bg-amber-900/5" : ""}`}>
                        <td className="px-4 py-2.5 font-semibold text-ink">{lab.marker}</td>
                        <td className={`px-4 py-2.5 font-bold ${lab.status === "high" ? "text-red-600 dark:text-red-400" : lab.status === "low" ? "text-sky-600 dark:text-sky-400" : "text-ink"}`}>
                          {lab.value} <span className="font-normal text-ink-tertiary text-xs">{lab.unit}</span>
                        </td>
                        <td className="px-4 py-2.5 text-xs text-ink-tertiary">{lab.reference}</td>
                        <td className="px-4 py-2.5 text-center">
                          {lab.status === "high" && <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-1.5 py-0.5 rounded-full">↑ HIGH</span>}
                          {lab.status === "low"  && <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 bg-sky-50 dark:bg-sky-900/30 border border-sky-200 dark:border-sky-800 px-1.5 py-0.5 rounded-full">↓ LOW</span>}
                          {lab.status === "normal" && <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-full">✓ NL</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Your answer vs AI answer */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
              <div className="px-5 py-3 border-b border-surface-border bg-surface-raised">
                <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">Comparison</p>
              </div>
              <div className="divide-y divide-surface-border">
                <div className="p-4 flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-500">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-blue-700 dark:text-blue-400 uppercase tracking-wide mb-1">You identified</p>
                    <p className="text-sm text-ink-secondary leading-relaxed">{evaluation.student_identified}</p>
                  </div>
                </div>
                <div className="p-4 flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-violet-500">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"/>
                    </svg>
                  </div>
                  <div>
                    <p className="text-[11px] font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wide mb-1">AI interpretation</p>
                    <p className="text-sm text-ink-secondary leading-relaxed">{evaluation.ai_interpretation}</p>
                  </div>
                </div>
                {evaluation.student_missed && evaluation.student_missed.toLowerCase() !== "nothing major" && (
                  <div className="p-4 flex gap-3">
                    <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-amber-500">
                        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd"/>
                      </svg>
                    </div>
                    <div>
                      <p className="text-[11px] font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">Missed or incomplete</p>
                      <p className="text-sm text-ink-secondary leading-relaxed">{evaluation.student_missed}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Teaching point */}
            <div className="bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-600 dark:text-violet-400">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z"/>
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-widest mb-1.5">Teaching Point</p>
                  <p className="text-sm text-ink-secondary leading-relaxed">{evaluation.educational_notes}</p>
                </div>
              </div>
            </div>

            {/* Next steps */}
            {evaluation.next_steps && evaluation.next_steps.length > 0 && (
              <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
                <div className="px-5 py-3 border-b border-surface-border bg-surface-raised">
                  <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">Recommended Next Steps</p>
                </div>
                <div className="p-4 space-y-3">
                  {evaluation.next_steps.map((step, i) => (
                    <div key={i} className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center flex-shrink-0 text-[11px] font-bold text-emerald-700 dark:text-emerald-400">
                        {i + 1}
                      </div>
                      <p className="text-sm text-ink-secondary leading-relaxed">{step}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Learning tags */}
            {practiceCase.learning_tags && practiceCase.learning_tags.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-bold text-ink-tertiary uppercase tracking-widest">Concepts:</span>
                {practiceCase.learning_tags.map((tag) => (
                  <span key={tag} className="px-2.5 py-1 bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-400 text-xs font-semibold rounded-full">
                    {tag}
                  </span>
                ))}
              </div>
            )}

            {/* Action row */}
            <div className="flex flex-wrap gap-2.5">
              <button
                onClick={() => nextCase()}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm transition-all"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd"/>
                </svg>
                Next Case (Same)
              </button>
              {difficulty !== "advanced" && (
                <button
                  onClick={() => nextCase(difficulty === "beginner" ? "intermediate" : "advanced")}
                  className="flex items-center gap-2 py-3 px-5 bg-surface-raised hover:bg-surface-border/50 border border-surface-border text-ink font-semibold rounded-xl text-sm transition-all"
                >
                  Try Harder ↑
                </button>
              )}
              {difficulty !== "beginner" && (
                <button
                  onClick={() => nextCase(difficulty === "advanced" ? "intermediate" : "beginner")}
                  className="flex items-center gap-2 py-3 px-5 bg-surface-raised hover:bg-surface-border/50 border border-surface-border text-ink font-semibold rounded-xl text-sm transition-all"
                >
                  Easier ↓
                </button>
              )}
            </div>

          </div>
        )}

      </div>
    </div>
  );
}
