"use client";

import { useState, useEffect, useCallback } from "react";
import type { PracticeCase, LabValue } from "../api/practice-case/route";
import type { EvaluationResult } from "../api/evaluate-interpretation/route";

// ── Session score tracker ─────────────────────────────────────────────────────
const SESSION_KEY = "meridix_learn_session";

interface SessionData {
  casesCompleted: number;
  flagsCorrect: number;
  flagsTotal: number;
}

function readSession(): SessionData {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? JSON.parse(raw) : { casesCompleted: 0, flagsCorrect: 0, flagsTotal: 0 };
  } catch { return { casesCompleted: 0, flagsCorrect: 0, flagsTotal: 0 }; }
}

function writeSession(data: SessionData) {
  try { sessionStorage.setItem(SESSION_KEY, JSON.stringify(data)); } catch { /* noop */ }
}

// ── Sub-components ────────────────────────────────────────────────────────────
type Difficulty = "beginner" | "intermediate" | "advanced";

const DIFFICULTY_CONFIG = {
  beginner:     { label: "Beginner",     color: "text-emerald-600 dark:text-emerald-400", bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-200 dark:border-emerald-800", desc: "1–2 abnormal values, common conditions" },
  intermediate: { label: "Intermediate", color: "text-amber-600 dark:text-amber-400",   bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800",         desc: "3–4 abnormal values, clinical patterns" },
  advanced:     { label: "Advanced",     color: "text-red-600 dark:text-red-400",        bg: "bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800",                 desc: "5+ abnormal values, complex multi-system" },
} as const;

function StatusBadge({ status }: { status: LabValue["status"] }) {
  if (status === "high") return <span className="text-[10px] font-bold text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 px-1.5 py-0.5 rounded-full">↑ HIGH</span>;
  if (status === "low")  return <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/30 border border-blue-200 dark:border-blue-800 px-1.5 py-0.5 rounded-full">↓ LOW</span>;
  return <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-800 px-1.5 py-0.5 rounded-full">✓ NL</span>;
}

function ScoreBar({ session }: { session: SessionData }) {
  return (
    <div className="flex items-center gap-4 text-sm">
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-brand-blue" />
        <span className="text-ink-secondary">Cases today: <strong className="text-ink">{session.casesCompleted}</strong></span>
      </div>
      <div className="text-ink-tertiary">·</div>
      <div className="flex items-center gap-1.5">
        <span className="w-2 h-2 rounded-full bg-emerald-500" />
        <span className="text-ink-secondary">Correct flags: <strong className="text-ink">{session.flagsCorrect}/{session.flagsTotal}</strong></span>
      </div>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────
type PageState = "idle" | "generating" | "viewing" | "evaluating" | "result";

export default function LearnPage() {
  const [pageState, setPageState] = useState<PageState>("idle");
  const [difficulty, setDifficulty] = useState<Difficulty>("beginner");
  const [practiceCase, setPracticeCase] = useState<PracticeCase | null>(null);
  const [studentAnswer, setStudentAnswer] = useState("");
  const [evaluation, setEvaluation] = useState<EvaluationResult | null>(null);
  const [session, setSession] = useState<SessionData>({ casesCompleted: 0, flagsCorrect: 0, flagsTotal: 0 });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setSession(readSession());
  }, []);

  const generateCase = useCallback(async () => {
    setError(null);
    setPageState("generating");
    setPracticeCase(null);
    setStudentAnswer("");
    setEvaluation(null);
    try {
      const res = await fetch("/api/practice-case", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ difficulty }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to generate case.");
      setPracticeCase(json.case as PracticeCase);
      setPageState("viewing");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPageState("idle");
    }
  }, [difficulty]);

  const submitInterpretation = useCallback(async () => {
    if (!practiceCase || !studentAnswer.trim()) return;
    setError(null);
    setPageState("evaluating");
    try {
      const res = await fetch("/api/evaluate-interpretation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ practiceCase, studentAnswer, difficulty }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to evaluate.");
      const ev = json.evaluation as EvaluationResult;
      setEvaluation(ev);
      setPageState("result");

      // Update session score
      const updated: SessionData = {
        casesCompleted: session.casesCompleted + 1,
        flagsCorrect:   session.flagsCorrect + ev.flags_correct,
        flagsTotal:     session.flagsTotal + ev.flags_total,
      };
      writeSession(updated);
      setSession(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
      setPageState("viewing");
    }
  }, [practiceCase, studentAnswer, difficulty, session]);

  const nextCase = () => {
    setPageState("idle");
    setPracticeCase(null);
    setStudentAnswer("");
    setEvaluation(null);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-violet-50 to-white dark:from-slate-900 dark:to-slate-900 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">

        {/* Header */}
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 text-xs font-semibold uppercase tracking-wider mb-5 shadow-sm">
            🎓 Med Student Mode
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
            Practice Clinical Interpretation
          </h1>
          <p className="mt-3 text-base text-ink-secondary max-w-xl mx-auto leading-relaxed">
            AI-generated patient cases. Interpret the labs, then see how your reasoning compares.
          </p>

          {/* Session score */}
          <div className="mt-5 flex justify-center">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white dark:bg-slate-800 border border-surface-border shadow-sm">
              <ScoreBar session={session} />
            </div>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 flex items-center gap-2.5 p-4 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 flex-shrink-0">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <p className="text-sm text-red-700 dark:text-red-400">{error}</p>
          </div>
        )}

        {/* ── IDLE: difficulty selector + generate ── */}
        {(pageState === "idle" || pageState === "generating") && (
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-ink/5 dark:shadow-black/30 border border-surface-border p-6 sm:p-8 space-y-6">
            <div>
              <h2 className="text-base font-bold text-ink mb-3">Select difficulty</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                {(Object.entries(DIFFICULTY_CONFIG) as [Difficulty, typeof DIFFICULTY_CONFIG["beginner"]][]).map(([key, cfg]) => (
                  <button
                    key={key}
                    onClick={() => setDifficulty(key)}
                    className={`p-4 rounded-2xl border-2 text-left transition-all duration-150 ${
                      difficulty === key
                        ? cfg.bg + " border-current"
                        : "border-surface-border dark:border-slate-700 hover:border-surface-border/80 bg-surface-raised dark:bg-slate-700/50"
                    }`}
                  >
                    <p className={`text-sm font-bold ${difficulty === key ? cfg.color : "text-ink"}`}>{cfg.label}</p>
                    <p className="text-xs text-ink-tertiary mt-1 leading-snug">{cfg.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={generateCase}
              disabled={pageState === "generating"}
              className="w-full py-4 bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-sm transition-all duration-200 shadow-md shadow-violet-500/20 hover:shadow-violet-500/30 hover:-translate-y-0.5 flex items-center justify-center gap-2.5"
            >
              {pageState === "generating" ? (
                <>
                  <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                  </svg>
                  Generating case…
                </>
              ) : (
                <>
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                  </svg>
                  Generate Practice Case
                </>
              )}
            </button>

            {session.casesCompleted > 0 && (
              <p className="text-center text-xs text-ink-tertiary">
                You&apos;ve completed {session.casesCompleted} case{session.casesCompleted === 1 ? "" : "s"} this session. Keep going!
              </p>
            )}
          </div>
        )}

        {/* ── VIEWING: case + student input ── */}
        {(pageState === "viewing" || pageState === "evaluating") && practiceCase && (
          <div className="space-y-4">
            {/* Case card */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
              {/* Patient info header */}
              <div className="px-5 py-4 border-b border-surface-border bg-surface-raised flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5 text-violet-600 dark:text-violet-400">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wider mb-0.5">Patient Case · {DIFFICULTY_CONFIG[difficulty].label}</p>
                  <p className="text-sm font-semibold text-ink">{practiceCase.patient.complaint}</p>
                  {practiceCase.patient.clinical_context && (
                    <p className="text-xs text-ink-secondary mt-1 leading-relaxed">{practiceCase.patient.clinical_context}</p>
                  )}
                </div>
              </div>

              {/* Lab table */}
              <div className="p-5">
                <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider mb-3">Laboratory Results</p>
                <div className="rounded-xl border border-surface-border overflow-hidden">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="bg-surface-raised border-b border-surface-border">
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-tertiary uppercase tracking-wide">Test</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-tertiary uppercase tracking-wide">Result</th>
                        <th className="text-left px-4 py-2.5 text-xs font-semibold text-ink-tertiary uppercase tracking-wide hidden sm:table-cell">Reference</th>
                        <th className="px-4 py-2.5"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {practiceCase.labs.map((lab, i) => (
                        <tr key={i} className={`border-b border-surface-border last:border-0 ${lab.status !== "normal" ? "bg-amber-50/40 dark:bg-amber-900/5" : ""}`}>
                          <td className="px-4 py-2.5 font-medium text-ink text-sm">{lab.marker}</td>
                          <td className={`px-4 py-2.5 font-bold text-sm ${lab.status === "high" ? "text-red-600 dark:text-red-400" : lab.status === "low" ? "text-blue-600 dark:text-blue-400" : "text-ink"}`}>
                            {lab.value} <span className="font-normal text-ink-tertiary text-xs">{lab.unit}</span>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-ink-tertiary hidden sm:table-cell">{lab.reference}</td>
                          <td className="px-4 py-2.5 text-right"><StatusBadge status={lab.status} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Student interpretation input */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm p-5 space-y-3">
              <div>
                <h3 className="text-sm font-bold text-ink mb-0.5">What&apos;s your interpretation?</h3>
                <p className="text-xs text-ink-tertiary">What&apos;s the most likely diagnosis or clinical concern? Which values stand out to you?</p>
              </div>
              <textarea
                value={studentAnswer}
                onChange={(e) => setStudentAnswer(e.target.value)}
                disabled={pageState === "evaluating"}
                placeholder="e.g. The elevated glucose and HbA1c suggest type 2 diabetes. The sodium is mildly low which could be related…"
                rows={4}
                className="w-full px-4 py-3 rounded-xl border border-surface-border dark:border-slate-700 bg-white dark:bg-slate-900 text-ink placeholder:text-ink-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/30 focus:border-violet-500 transition-all resize-none disabled:opacity-50"
              />
              <button
                onClick={submitInterpretation}
                disabled={pageState === "evaluating" || !studentAnswer.trim()}
                className="w-full py-3.5 bg-violet-600 hover:bg-violet-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2"
              >
                {pageState === "evaluating" ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Evaluating…
                  </>
                ) : "Submit my interpretation"}
              </button>
            </div>
          </div>
        )}

        {/* ── RESULT: evaluation ── */}
        {pageState === "result" && practiceCase && evaluation && (
          <div className="space-y-4">
            {/* Score for this case */}
            <div className={`rounded-2xl border-2 p-5 ${
              evaluation.flags_correct >= evaluation.flags_total
                ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50 dark:bg-emerald-900/20"
                : evaluation.flags_correct >= Math.ceil(evaluation.flags_total / 2)
                ? "border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-900/20"
                : "border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20"
            }`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-tertiary mb-1">Case Result</p>
                  <p className="text-base font-bold text-ink">
                    {evaluation.flags_correct >= evaluation.flags_total
                      ? "Excellent work!"
                      : evaluation.flags_correct >= Math.ceil(evaluation.flags_total / 2)
                      ? "Good effort — review the missed points"
                      : "Keep practicing — see the notes below"}
                  </p>
                  <p className="text-xs text-ink-tertiary mt-0.5">AI diagnosis: <span className="font-semibold text-ink">{evaluation.ai_diagnosis}</span></p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-3xl font-extrabold text-ink">{evaluation.flags_correct}<span className="text-lg text-ink-tertiary">/{evaluation.flags_total}</span></p>
                  <p className="text-xs text-ink-tertiary">flags identified</p>
                </div>
              </div>
            </div>

            {/* Case recap */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
              <div className="px-5 py-3.5 border-b border-surface-border bg-surface-raised">
                <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">Comparison</p>
              </div>
              <div className="p-5 space-y-4">
                {/* You identified */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-blue-500">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink uppercase tracking-wide mb-1">You identified</p>
                    <p className="text-sm text-ink-secondary leading-relaxed">{evaluation.student_identified}</p>
                  </div>
                </div>

                <div className="border-t border-surface-border" />

                {/* AI identified */}
                <div className="flex items-start gap-3">
                  <div className="w-7 h-7 rounded-lg bg-violet-50 dark:bg-violet-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-violet-500">
                      <path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-ink uppercase tracking-wide mb-1">AI identified</p>
                    <p className="text-sm text-ink-secondary leading-relaxed">{evaluation.ai_interpretation}</p>
                  </div>
                </div>

                {/* Missed */}
                {evaluation.student_missed && evaluation.student_missed.toLowerCase() !== "nothing" && (
                  <>
                    <div className="border-t border-surface-border" />
                    <div className="flex items-start gap-3">
                      <div className="w-7 h-7 rounded-lg bg-amber-50 dark:bg-amber-900/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-amber-500">
                          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-xs font-bold text-amber-700 dark:text-amber-400 uppercase tracking-wide mb-1">Missed or incomplete</p>
                        <p className="text-sm text-ink-secondary leading-relaxed">{evaluation.student_missed}</p>
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Educational notes */}
            <div className="bg-violet-50 dark:bg-violet-900/10 border border-violet-200 dark:border-violet-800 rounded-2xl p-5">
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-600 dark:text-violet-400">
                    <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-violet-700 dark:text-violet-400 uppercase tracking-wide mb-1.5">Teaching point</p>
                  <p className="text-sm text-ink-secondary leading-relaxed">{evaluation.educational_notes}</p>
                </div>
              </div>
            </div>

            {/* Session score update */}
            <div className="flex items-center justify-between px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-surface-border shadow-sm">
              <ScoreBar session={session} />
              <button
                onClick={nextCase}
                className="flex items-center gap-2 py-2.5 px-5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl text-sm transition-all duration-200 flex-shrink-0"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Next case
              </button>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
