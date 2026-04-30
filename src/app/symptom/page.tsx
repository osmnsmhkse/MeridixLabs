"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Types ──────────────────────────────────────────────────────────────────

type Urgency = "green" | "amber" | "red";
type Stage = "idle" | "loading" | "result" | "error";

interface Cause {
  name: string;
  confidence: string;
  detail: string;
}

interface ParsedResult {
  mostLikely: Cause[];
  lessCommon: Cause[];
  seriousButRare: string;
  whatWouldChangeThis: string[];
  whatToDo: { urgency: Urgency; text: string };
  stopReadingIf: string | null;
}

// ── Parsers ────────────────────────────────────────────────────────────────

const SECTION_KEYS = [
  "MOST_LIKELY",
  "LESS_COMMON",
  "SERIOUS_BUT_RARE",
  "WHAT_WOULD_CHANGE_THIS",
  "WHAT_TO_DO",
  "STOP_READING_IF",
] as const;

function parseSections(text: string): Record<string, string> {
  const positions: { key: string; idx: number }[] = [];
  for (const key of SECTION_KEYS) {
    const idx = text.indexOf(key);
    if (idx !== -1) positions.push({ key, idx });
  }
  positions.sort((a, b) => a.idx - b.idx);
  const result: Record<string, string> = {};
  for (let i = 0; i < positions.length; i++) {
    const { key, idx } = positions[i];
    const start = idx + key.length;
    const end = positions[i + 1]?.idx ?? text.length;
    result[key] = text.slice(start, end).trim();
  }
  return result;
}

function parseCauses(text: string): Cause[] {
  const causes: Cause[] = [];
  const blocks = text.split(/(?=CAUSE:)/g).filter((b) => b.trim());
  for (const block of blocks) {
    const nameMatch = block.match(/CAUSE:\s*(.+)/);
    const confMatch = block.match(/CONFIDENCE:\s*(.+)/);
    const detailMatch = block.match(/DETAIL:\s*([\s\S]+?)(?=\nCAUSE:|$)/);
    if (nameMatch && confMatch && detailMatch) {
      causes.push({
        name: nameMatch[1].trim(),
        confidence: confMatch[1].trim(),
        detail: detailMatch[1].trim(),
      });
    }
  }
  return causes;
}

function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 0);
}

function detectUrgency(text: string): Urgency {
  if (/^RED:/m.test(text)) return "red";
  if (/^AMBER:/m.test(text)) return "amber";
  return "green";
}

function parseWhatToDo(text: string): { urgency: Urgency; text: string } {
  const urgency = detectUrgency(text);
  const body = text.replace(/^(GREEN|AMBER|RED):\s*/m, "").trim();
  return { urgency, text: body };
}

function parseStopReading(text: string): string | null {
  if (!text || text === "NONE" || text.trim() === "NONE") return null;
  return text.trim();
}

function parseResult(raw: string): ParsedResult {
  const sections = parseSections(raw);
  return {
    mostLikely: parseCauses(sections["MOST_LIKELY"] ?? ""),
    lessCommon: parseCauses(sections["LESS_COMMON"] ?? ""),
    seriousButRare: sections["SERIOUS_BUT_RARE"] ?? "",
    whatWouldChangeThis: parseBullets(sections["WHAT_WOULD_CHANGE_THIS"] ?? ""),
    whatToDo: parseWhatToDo(sections["WHAT_TO_DO"] ?? ""),
    stopReadingIf: parseStopReading(sections["STOP_READING_IF"] ?? ""),
  };
}

// ── Confidence badge ───────────────────────────────────────────────────────

function confidenceBadge(label: string) {
  const lower = label.toLowerCase();
  if (lower.includes("very common"))
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400">
        Very common
      </span>
    );
  if (lower.includes("common"))
    return (
      <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400">
        Common
      </span>
    );
  return (
    <span className="inline-block px-2 py-0.5 text-[11px] font-semibold rounded-full bg-slate-100 text-slate-500 dark:bg-slate-700 dark:text-slate-400">
      Less common
    </span>
  );
}

// ── Urgency config ─────────────────────────────────────────────────────────

const URGENCY_CONFIG = {
  green: {
    bg: "bg-emerald-50 dark:bg-emerald-950/40",
    border: "border-emerald-200 dark:border-emerald-800",
    icon: "text-emerald-600",
    label: "No immediate urgency",
    labelColor: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-600",
    label: "See a doctor soon",
    labelColor: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-600",
    label: "Seek care today",
    labelColor: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
};

// ── Example chips ──────────────────────────────────────────────────────────

const EXAMPLES = [
  "Persistent headache behind one eye",
  "Sharp chest pain when breathing",
  "Sudden dizziness when standing",
  "Fatigue that doesn't improve with sleep",
  "Swollen lymph nodes in the neck",
  "Tingling in both hands at night",
];

// ── Main component ─────────────────────────────────────────────────────────

export default function SymptomPage() {
  const { lang } = useLanguage();

  const [symptom, setSymptom] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [duration, setDuration] = useState("");
  const [history, setHistory] = useState("");
  const [contextOpen, setContextOpen] = useState(false);

  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<ParsedResult | null>(null);
  const [errorMsg, setErrorMsg] = useState("");
  const [queriedSymptom, setQueriedSymptom] = useState("");

  // Symptom→lab cross-reference (Tier 3)
  const [relatedLabs, setRelatedLabs] = useState<RelatedLabsResponse | null>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  async function submit(overrideSymptom?: string) {
    const sym = (overrideSymptom ?? symptom).trim();
    if (!sym) return;
    setStage("loading");
    setResult(null);
    setErrorMsg("");
    setQueriedSymptom(sym);

    try {
      const res = await fetch("/api/symptom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ symptom: sym, age, sex, duration, history, language: lang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      const parsed = parseResult(data.text as string);
      setResult(parsed);
      setStage("result");

      // Fire-and-forget: fetch related labs from user's history (works
      // for anon users too — they get the recommendation list without values).
      fetch("/api/symptom-related-labs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ symptoms: sym }),
      })
        .then((r) => r.json())
        .then((j) => setRelatedLabs(j))
        .catch(() => undefined);
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Something went wrong.");
      setStage("error");
    }
  }

  useEffect(() => {
    if (stage === "result" && resultRef.current) {
      setTimeout(() => {
        resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }, 100);
    }
  }, [stage]);

  return (
    <main className="min-h-screen bg-slate-50 dark:bg-slate-950 pt-20 pb-24">
      {/* Hero */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 pt-12 pb-8 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-violet-100 dark:bg-violet-900/30 rounded-full text-violet-700 dark:text-violet-400 text-xs font-semibold mb-6">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
          </svg>
          Symptom Checker
        </div>
        <h1 className="text-4xl sm:text-5xl font-bold text-ink tracking-tight mb-4">
          Before you Google&nbsp;it.
        </h1>
        <p className="text-lg text-ink-secondary leading-relaxed max-w-xl mx-auto">
          Describe what you&apos;re feeling. We&apos;ll explain the most likely causes, what to watch for, and what to do next — clearly and without alarm.
        </p>
      </section>

      {/* Input card */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm p-6">
          {/* Symptom textarea */}
          <label className="block text-sm font-semibold text-ink mb-2">
            What symptom are you experiencing?
          </label>
          <textarea
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={3}
            placeholder="e.g. Sharp pain in my lower right abdomen that started two days ago…"
            className="w-full px-4 py-3 rounded-xl border border-surface-border bg-slate-50 dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
          />

          {/* Collapsible context */}
          <button
            type="button"
            onClick={() => setContextOpen(!contextOpen)}
            className="mt-3 flex items-center gap-1.5 text-sm text-ink-secondary hover:text-ink transition-colors"
          >
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className={`w-4 h-4 transition-transform ${contextOpen ? "rotate-90" : ""}`}
            >
              <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
            </svg>
            Add context (optional)
          </button>

          {contextOpen && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1.5">Age</label>
                <select
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-border bg-slate-50 dark:bg-slate-800 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                >
                  <option value="">Prefer not to say</option>
                  <option value="Under 18">Under 18</option>
                  <option value="18–30">18–30</option>
                  <option value="31–50">31–50</option>
                  <option value="51–70">51–70</option>
                  <option value="Over 70">Over 70</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1.5">Sex</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-border bg-slate-50 dark:bg-slate-800 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                >
                  <option value="">Prefer not to say</option>
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1.5">Duration</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-border bg-slate-50 dark:bg-slate-800 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                >
                  <option value="">Not sure</option>
                  <option value="Less than 24 hours">Less than 24 hours</option>
                  <option value="1–3 days">1–3 days</option>
                  <option value="4–7 days">4–7 days</option>
                  <option value="1–4 weeks">1–4 weeks</option>
                  <option value="More than a month">More than a month</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                  Relevant history (medications, conditions, recent events)
                </label>
                <textarea
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                  rows={2}
                  placeholder="e.g. I take metformin for type 2 diabetes, no recent travel…"
                  className="w-full px-3 py-2 rounded-lg border border-surface-border bg-slate-50 dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={() => submit()}
            disabled={!symptom.trim() || stage === "loading"}
            className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-violet-500/20"
          >
            {stage === "loading" ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                Analyzing…
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
                What does this most likely mean?
              </>
            )}
          </button>

          {/* Reassurance */}
          <p className="mt-3 text-center text-xs text-ink-tertiary">
            This does not store your input. This is not a diagnosis. It is calibrated health context.
          </p>
        </div>

        {/* Example chips */}
        {stage === "idle" && (
          <div className="mt-5">
            <p className="text-xs text-ink-tertiary mb-3 text-center">Try an example:</p>
            <div className="flex flex-wrap gap-2 justify-center">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  onClick={() => { setSymptom(ex); submit(ex); }}
                  className="px-3 py-1.5 rounded-full border border-surface-border bg-white dark:bg-slate-900 text-ink-secondary hover:text-ink hover:border-violet-300 dark:hover:border-violet-700 text-xs transition-colors"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Error */}
      {stage === "error" && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-6">
          <div className="bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-800 rounded-xl p-4 text-sm text-red-700 dark:text-red-400">
            {errorMsg}
          </div>
        </div>
      )}

      {/* Results */}
      {stage === "result" && result && (
        <div ref={resultRef} className="max-w-2xl mx-auto px-4 sm:px-6 mt-10 space-y-5">
          {/* STOP_READING_IF sticky banner */}
          {result.stopReadingIf && (
            <div className="sticky top-20 z-40 bg-red-600 text-white rounded-xl px-5 py-4 shadow-lg flex items-start gap-3">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
              </svg>
              <div>
                <p className="font-bold text-sm mb-0.5">Stop and seek emergency care if:</p>
                <p className="text-sm text-red-100">{result.stopReadingIf}</p>
              </div>
            </div>
          )}

          {/* Queried symptom label */}
          <div className="flex items-center gap-2">
            <p className="text-sm text-ink-secondary">
              Showing results for: <span className="font-semibold text-ink">{queriedSymptom}</span>
            </p>
          </div>

          {/* MOST_LIKELY */}
          {result.mostLikely.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-border">
                <h2 className="font-bold text-ink text-base">Most Likely Causes</h2>
                <p className="text-xs text-ink-tertiary mt-0.5">Ranked by likelihood for this symptom</p>
              </div>
              <div className="divide-y divide-surface-border">
                {result.mostLikely.map((cause, i) => (
                  <div key={i} className="px-5 py-4 flex gap-4">
                    <div className="flex-shrink-0 w-9 h-9 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                      <span className="text-base font-black text-violet-600 dark:text-violet-400">{i + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1.5">
                        <h3 className="font-semibold text-ink text-sm">{cause.name}</h3>
                        {confidenceBadge(cause.confidence)}
                      </div>
                      <p className="text-sm text-ink-secondary leading-relaxed">{cause.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* LESS_COMMON */}
          {result.lessCommon.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm overflow-hidden opacity-90">
              <div className="px-5 py-4 border-b border-surface-border">
                <h2 className="font-bold text-ink-secondary text-sm">Also worth knowing</h2>
                <p className="text-xs text-ink-tertiary mt-0.5">Less common but clinically relevant</p>
              </div>
              <div className="divide-y divide-surface-border">
                {result.lessCommon.map((cause, i) => (
                  <div key={i} className="px-5 py-3.5 flex gap-4">
                    <div className="flex-shrink-0 w-7 h-7 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center mt-0.5">
                      <span className="text-xs font-bold text-ink-secondary">{result.mostLikely.length + i + 1}</span>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <h3 className="font-medium text-ink text-sm">{cause.name}</h3>
                        {confidenceBadge(cause.confidence)}
                      </div>
                      <p className="text-sm text-ink-secondary leading-relaxed">{cause.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SERIOUS_BUT_RARE */}
          {result.seriousButRare && (
            <div className="bg-amber-50 dark:bg-amber-950/20 rounded-2xl border border-amber-200 dark:border-amber-800 p-5">
              <div className="flex items-start gap-3">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5">
                  <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
                </svg>
                <div>
                  <h2 className="font-bold text-amber-800 dark:text-amber-400 text-sm mb-1">Serious but rare</h2>
                  <p className="text-sm text-amber-900 dark:text-amber-300 leading-relaxed whitespace-pre-line">{result.seriousButRare}</p>
                </div>
              </div>
            </div>
          )}

          {/* WHAT_WOULD_CHANGE_THIS */}
          {result.whatWouldChangeThis.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm p-5">
              <h2 className="font-bold text-ink text-sm mb-3">What would change the picture?</h2>
              <ul className="space-y-2">
                {result.whatWouldChangeThis.map((item, i) => (
                  <li key={i} className="flex items-start gap-2.5 text-sm text-ink-secondary">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400 flex-shrink-0 mt-0.5">
                      <path fillRule="evenodd" d="M7.21 14.77a.75.75 0 01.02-1.06L11.168 10 7.23 6.29a.75.75 0 111.04-1.08l4.5 4.25a.75.75 0 010 1.08l-4.5 4.25a.75.75 0 01-1.06-.02z" clipRule="evenodd" />
                    </svg>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* WHAT_TO_DO */}
          {result.whatToDo.text && (
            <div className={`rounded-2xl border p-5 ${URGENCY_CONFIG[result.whatToDo.urgency].bg} ${URGENCY_CONFIG[result.whatToDo.urgency].border}`}>
              <div className="flex items-center gap-2 mb-3">
                <span className={`inline-block w-2 h-2 rounded-full ${URGENCY_CONFIG[result.whatToDo.urgency].dot}`} />
                <h2 className={`font-bold text-sm ${URGENCY_CONFIG[result.whatToDo.urgency].labelColor}`}>
                  {URGENCY_CONFIG[result.whatToDo.urgency].label}
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-ink-secondary">{result.whatToDo.text}</p>
            </div>
          )}

          {/* Symptom → lab cross-reference (Tier 3) */}
          {relatedLabs && relatedLabs.groups.length > 0 && (
            <RelatedLabsCard data={relatedLabs} />
          )}

          {/* Try again */}
          <div className="text-center pt-2">
            <button
              onClick={() => { setStage("idle"); setResult(null); setSymptom(""); setRelatedLabs(null); }}
              className="text-sm text-ink-tertiary hover:text-ink transition-colors underline underline-offset-2"
            >
              Check another symptom
            </button>
          </div>
        </div>
      )}

      {/* Loading skeleton */}
      {stage === "loading" && (
        <div className="max-w-2xl mx-auto px-4 sm:px-6 mt-10 space-y-5">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border p-5 animate-pulse">
              <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/3 mb-3" />
              <div className="space-y-2">
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-full" />
                <div className="h-3 bg-slate-100 dark:bg-slate-800 rounded w-4/5" />
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
  );
}

// ── Tier 3: Symptom → lab cross-reference ──────────────────────────────────

interface RelatedMarker {
  slug: string;
  name: string;
  value: number | null;
  raw: string | null;
  unit: string | null;
  zone: "optimal" | "normal" | "out-of-range" | null;
  date: string | null;
}
interface RelatedGroup {
  symptom: string;
  rationale: string;
  markers: RelatedMarker[];
}
interface RelatedLabsResponse {
  signedIn?: boolean;
  groups: RelatedGroup[];
}

function RelatedLabsCard({ data }: { data: RelatedLabsResponse }) {
  const haveAny = data.groups.some((g) => g.markers.some((m) => m.value != null));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-brand-blue/30 shadow-sm p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">From your labs</p>
          <h2 className="font-bold text-ink text-sm mt-1">Possibly related to your lab history</h2>
        </div>
        {data.signedIn === false && (
          <Link href="/sign-up" className="text-xs font-semibold text-brand-blue hover:underline whitespace-nowrap">
            Sign up →
          </Link>
        )}
      </div>

      {data.signedIn === false ? (
        <p className="text-xs text-ink-secondary leading-relaxed mb-3">
          When you have an account, we can also check your saved labs against this symptom. For now, here&apos;s what&apos;s commonly worth measuring:
        </p>
      ) : !haveAny ? (
        <p className="text-xs text-ink-secondary leading-relaxed mb-3">
          You don&apos;t have these markers in your saved reports yet. They&apos;re commonly worth measuring for this symptom.
        </p>
      ) : null}

      <div className="space-y-4">
        {data.groups.map((g) => (
          <div key={g.symptom}>
            <p className="text-xs font-semibold text-ink">{g.symptom}</p>
            <p className="mt-0.5 text-xs text-ink-tertiary leading-relaxed">{g.rationale}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {g.markers.map((m) => (
                <RelatedMarkerChip key={m.slug} marker={m} signedIn={data.signedIn ?? false} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function RelatedMarkerChip({ marker, signedIn }: { marker: RelatedMarker; signedIn: boolean }) {
  const has = marker.value != null;
  const tone = !has
    ? "border-surface-border text-ink-tertiary"
    : marker.zone === "optimal"
    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
    : marker.zone === "normal"
    ? "border-amber-500/40 bg-amber-500/10 text-amber-700 dark:text-amber-300"
    : "border-red-500/40 bg-red-500/10 text-red-700 dark:text-red-300";

  const inner = (
    <span className={`text-[11px] font-semibold px-2 py-1 rounded-full border ${tone}`}>
      {marker.name}
      {has && <span className="ml-1 font-normal opacity-80">· {marker.raw}{marker.unit ? ` ${marker.unit}` : ""}</span>}
    </span>
  );

  if (signedIn && has) {
    return <Link href={`/dashboard/biomarkers/${marker.slug}`}>{inner}</Link>;
  }
  return inner;
}
