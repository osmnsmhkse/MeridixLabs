"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslations } from "next-intl";
import { useToolContext } from "@/components/ToolChatProvider";

const DiagnosisChatPanel = dynamic(() => import("@/components/DiagnosisChatPanel"), {
  ssr: false,
});

// ── Types ─────────────────────────────────────────────────────────────────────

type PageState = "idle" | "loading" | "result" | "error";

interface DiagnosisResult {
  diagnosis: string;
  whatThisIs: string;
  whatCausedIt: string;
  whatLifeLooksLike: { prose: string; bullets: string[] };
  nextSixMonths: string;
  questionsForDoctor: string[];
  explainingToOthers: { label: string; template: string }[];
}

// ── Parsing helpers ───────────────────────────────────────────────────────────

const SECTION_KEYS = [
  "WHAT_THIS_IS",
  "WHAT_CAUSED_IT",
  "WHAT_LIFE_LOOKS_LIKE",
  "NEXT_SIX_MONTHS",
  "QUESTIONS_FOR_DOCTOR",
  "EXPLAINING_TO_OTHERS",
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

function parseNumberedList(text: string): string[] {
  const items: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (/^\d+[\.\)]\s+/.test(t)) {
      if (current.trim()) items.push(current.trim());
      current = t.replace(/^\d+[\.\)]\s+/, "");
    } else if (current && t) {
      current += " " + t;
    }
  }
  if (current.trim()) items.push(current.trim());
  return items.filter(Boolean);
}

function parseLifeSection(text: string): { prose: string; bullets: string[] } {
  const bullets: string[] = [];
  const proseLines: string[] = [];
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (/^[-•*]\s+/.test(t)) {
      bullets.push(t.replace(/^[-•*]\s+/, ""));
    } else if (t) {
      proseLines.push(t);
    }
  }
  return { bullets, prose: proseLines.join("\n\n") };
}

function parseExplainingTemplates(text: string): { label: string; template: string }[] {
  // Split on lines that start a new numbered item
  const chunks = text.split(/\n(?=\d+[\.\)]\s)/);
  return chunks
    .map((chunk) => {
      const t = chunk.trim();
      if (!/^\d+[\.\)]\s/.test(t)) return null;
      const newline = t.indexOf("\n");
      if (newline === -1) return null;
      const label = t.slice(0, newline).replace(/^\d+[\.\)]\s*/, "").replace(/:$/, "").trim();
      const template = t.slice(newline).trim().replace(/^[""\u201c\u201d]|[""\u201c\u201d]$/g, "");
      return { label, template };
    })
    .filter((x): x is { label: string; template: string } => x !== null && x.template.length > 0);
}

function parseResult(text: string, diagnosis: string): DiagnosisResult {
  const sections = parseSections(text);
  return {
    diagnosis,
    whatThisIs: sections["WHAT_THIS_IS"] ?? "",
    whatCausedIt: sections["WHAT_CAUSED_IT"] ?? "",
    whatLifeLooksLike: parseLifeSection(sections["WHAT_LIFE_LOOKS_LIKE"] ?? ""),
    nextSixMonths: sections["NEXT_SIX_MONTHS"] ?? "",
    questionsForDoctor: parseNumberedList(sections["QUESTIONS_FOR_DOCTOR"] ?? ""),
    explainingToOthers: parseExplainingTemplates(sections["EXPLAINING_TO_OTHERS"] ?? ""),
  };
}

// ── Small sub-components ──────────────────────────────────────────────────────

function CopyButton({ text, label = "Copy" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <button
      onClick={copy}
      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs font-semibold text-ink-secondary hover:text-ink hover:border-brand-blue/40 hover:bg-brand-blue-light transition-all duration-150"
    >
      {copied ? (
        <>
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-emerald-500">
            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
          </svg>
          Copied
        </>
      ) : (
        <>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-3.5 h-3.5">
            <rect x="7" y="7" width="10" height="10" rx="1.5" />
            <path d="M3 13V4a1 1 0 011-1h9" strokeLinecap="round" />
          </svg>
          {label}
        </>
      )}
    </button>
  );
}

function ProseBlock({ text }: { text: string }) {
  return (
    <div className="space-y-3">
      {text.split("\n\n").filter(Boolean).map((para, i) => (
        <p key={i} className="text-ink-secondary leading-relaxed text-sm">{para}</p>
      ))}
    </div>
  );
}

// ── Section card wrapper ──────────────────────────────────────────────────────

function SectionCard({
  accent,
  icon,
  label,
  children,
}: {
  accent: string;
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`rounded-2xl bg-white dark:bg-slate-800 border border-surface-border shadow-sm overflow-hidden border-l-4 ${accent}`}>
      <div className="px-6 pt-5 pb-1 flex items-center gap-2.5">
        <span className="flex-shrink-0">{icon}</span>
        <h3 className="text-sm font-bold text-ink uppercase tracking-wider">{label}</h3>
      </div>
      <div className="px-6 pb-6 pt-3">{children}</div>
    </div>
  );
}

// ── Result sections ───────────────────────────────────────────────────────────

function WhatThisIsSection({ text }: { text: string }) {
  const t = useTranslations("Diagnosed");
  return (
    <SectionCard
      accent="border-l-brand-blue"
      label={t("sectionWhatIsIt")}
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-blue">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      }
    >
      <ProseBlock text={text} />
    </SectionCard>
  );
}

function WhatCausedItSection({ text }: { text: string }) {
  const t = useTranslations("Diagnosed");
  return (
    <SectionCard
      accent="border-l-slate-300 dark:border-l-slate-600"
      label={t("sectionCaused")}
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400">
          <path d="M11 3a1 1 0 10-2 0v1a1 1 0 102 0V3zM15.657 5.757a1 1 0 00-1.414-1.414l-.707.707a1 1 0 001.414 1.414l.707-.707zM18 10a1 1 0 01-1 1h-1a1 1 0 110-2h1a1 1 0 011 1zM5.05 6.464A1 1 0 106.464 5.05l-.707-.707a1 1 0 00-1.414 1.414l.707.707zM5 10a1 1 0 01-1 1H3a1 1 0 110-2h1a1 1 0 011 1zM8 16v-1h4v1a2 2 0 11-4 0zM12 14c.015-.995.512-1.953 1.218-2.655A6.002 6.002 0 0010 4a6 6 0 00-3.218 11.045C7.488 15.953 7.985 16.911 8 17.916V18h4v-.084c.015-1.005.512-1.963 1.218-2.665z" />
        </svg>
      }
    >
      <ProseBlock text={text} />
    </SectionCard>
  );
}

function WhatLifeLooksLikeSection({ data }: { data: { prose: string; bullets: string[] } }) {
  const t = useTranslations("Diagnosed");
  return (
    <SectionCard
      accent="border-l-emerald-400"
      label={t("sectionLifeNow")}
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      }
    >
      {data.prose && <div className="mb-4"><ProseBlock text={data.prose} /></div>}
      {data.bullets.length > 0 && (
        <ul className="space-y-2.5">
          {data.bullets.map((item, i) => (
            <li key={i} className="flex items-start gap-3">
              <span className="mt-0.5 w-5 h-5 rounded-full bg-emerald-50 dark:bg-emerald-900/30 border border-emerald-200 dark:border-emerald-700 flex items-center justify-center flex-shrink-0">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-500">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              </span>
              <span className="text-sm text-ink-secondary leading-relaxed">{item}</span>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}

function NextSixMonthsSection({ text }: { text: string }) {
  const t = useTranslations("Diagnosed");
  return (
    <SectionCard
      accent="border-l-amber-400"
      label={t("sectionSixMonths")}
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
      }
    >
      <ProseBlock text={text} />
    </SectionCard>
  );
}

function QuestionsSection({ questions }: { questions: string[] }) {
  const t = useTranslations("Diagnosed");
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const toggle = (i: number) => setChecked((p) => ({ ...p, [i]: !p[i] }));
  const allText = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");

  return (
    <SectionCard
      accent="border-l-violet-400"
      label={t("sectionQuestions")}
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-500">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      }
    >
      <ol className="space-y-3 mb-4">
        {questions.map((q, i) => (
          <li key={i} className="flex items-start gap-3">
            <button
              onClick={() => toggle(i)}
              className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-all duration-150 ${
                checked[i]
                  ? "bg-violet-500 border-violet-500"
                  : "border-surface-border dark:border-slate-600 hover:border-violet-400"
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
      <CopyButton text={allText} label={t("copyQuestions")} />
    </SectionCard>
  );
}

function ExplainingToOthersSection({ templates }: { templates: { label: string; template: string }[] }) {
  const t = useTranslations("Diagnosed");
  const ACCENT_COLORS = [
    "bg-blue-50 dark:bg-blue-950/30 border-blue-100 dark:border-blue-900",
    "bg-emerald-50 dark:bg-emerald-950/30 border-emerald-100 dark:border-emerald-900",
    "bg-slate-50 dark:bg-slate-800/60 border-slate-100 dark:border-slate-700",
  ];

  return (
    <SectionCard
      accent="border-l-pink-400"
      label={t("sectionExplaining")}
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-pink-500">
          <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
        </svg>
      }
    >
      <p className="text-xs text-ink-tertiary mb-4 leading-relaxed">
        {t("questionTemplates")}
      </p>
      <div className="space-y-4">
        {templates.map((t, i) => (
          <div key={i} className={`rounded-xl border p-4 ${ACCENT_COLORS[i % ACCENT_COLORS.length]}`}>
            <div className="flex items-start justify-between gap-3 mb-2">
              <p className="text-xs font-bold text-ink uppercase tracking-wider">{t.label}</p>
              <CopyButton text={t.template} />
            </div>
            <p className="text-sm text-ink-secondary leading-relaxed italic">&ldquo;{t.template}&rdquo;</p>
          </div>
        ))}
      </div>
    </SectionCard>
  );
}

// ── Loading state ─────────────────────────────────────────────────────────────

function LoadingState({ diagnosis }: { diagnosis: string }) {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDot((d) => (d + 1) % 4), 600);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      {/* Slow pulse ring */}
      <div className="relative mb-8">
        <div className="w-16 h-16 rounded-full border-2 border-brand-blue/20 animate-ping absolute inset-0" style={{ animationDuration: "2s" }} />
        <div className="w-16 h-16 rounded-full border-2 border-brand-blue/30 flex items-center justify-center relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-brand-blue">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </div>
      </div>

      <p className="text-base font-semibold text-ink mb-2">
        Taking a moment to put this together for you{".".repeat(dot)}
      </p>
      <p className="text-sm text-ink-tertiary max-w-xs leading-relaxed">
        We&apos;re preparing a full explanation of <span className="font-medium text-ink-secondary">{diagnosis}</span> — what it means, what comes next, and what to ask.
      </p>
    </div>
  );
}

// ── Main page ─────────────────────────────────────────────────────────────────

const EXAMPLE_CHIPS = [
  "Type 2 diabetes",
  "Hypertension",
  "PMOS",
  "Herniated disc",
  "Atrial fibrillation",
  "Hypothyroidism",
];

export default function DiagnosedPage() {
  const { lang } = useLanguage();
  const t = useTranslations("Diagnosed");
  const [state, setState] = useState<PageState>("idle");
  const [input, setInput] = useState("");
  const [result, setResult] = useState<DiagnosisResult | null>(null);
  useToolContext(result ? JSON.stringify(result) : null);
  const [rawExplanation, setRawExplanation] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [mobileTab, setMobileTab] = useState<"results" | "ask">("results");
  const inputRef = useRef<HTMLInputElement>(null);
  const resultRef = useRef<HTMLDivElement>(null);

  const submit = useCallback(
    async (diagnosis: string) => {
      const d = diagnosis.trim();
      if (!d) { inputRef.current?.focus(); return; }

      setState("loading");
      setResult(null);
      setErrorMsg("");

      try {
        const res = await fetch("/api/diagnosed", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ diagnosis: d, language: lang }),
        });
        const json = await res.json() as { text?: string; diagnosis?: string; error?: string };

        if (!res.ok || !json.text) {
          setErrorMsg(json.error ?? "Something went wrong. Please try again.");
          setState("error");
          return;
        }

        setRawExplanation(json.text);
        setResult(parseResult(json.text, json.diagnosis ?? d));
        setState("result");
        setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
      } catch {
        setErrorMsg("Network error. Please check your connection and try again.");
        setState("error");
      }
    },
    [lang]
  );

  const handleChip = (chip: string) => {
    setInput(chip);
    submit(chip);
  };

  const handleReset = () => {
    setState("idle");
    setResult(null);
    setRawExplanation("");
    setInput("");
    setErrorMsg("");
    setMobileTab("results");
    setTimeout(() => inputRef.current?.focus(), 50);
  };

  // ── Idle / input UI ────────────────────────────────────────────────────────
  const showInput = state === "idle" || state === "error";

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-light to-white dark:from-[#0B1424] dark:to-[#070B16]">

      {/* ── Hero ────────────────────────────────────────────────────────────── */}
      {(showInput || state === "loading") && (
        <section className="relative isolate overflow-hidden grain pt-32 pb-16 px-4 sm:px-6">
          <div className="aurora-field" aria-hidden="true">
            <div className="aurora-blob animate-aurora" style={{ top: "-20%", left: "22%", width: "30vw", height: "30vw", background: "radial-gradient(circle at 40% 40%, rgba(74,133,239,0.4), transparent 62%)" }} />
            <div className="aurora-blob animate-aurora" style={{ top: "-10%", right: "20%", width: "26vw", height: "26vw", background: "radial-gradient(circle at 60% 50%, rgba(139,92,246,0.34), transparent 64%)", animationDelay: "-7s" }} />
          </div>
          <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none" />
          <div className="relative z-10 max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/80 dark:bg-white/5 border border-brand-blue/25 backdrop-blur text-brand-blue mb-7 shadow-soft">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-blue" />
              </span>
              <span className="kicker-mono text-brand-blue">{t("badge")}</span>
            </div>

            <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-bold tracking-tightest leading-[1.03] mb-4">
              <span className="text-gradient-blue">{t("title")}</span>
            </h1>

            <p className="text-lg text-ink-secondary leading-relaxed mb-10 max-w-xl mx-auto text-pretty">
              {t("subtitle")}
            </p>
          </div>
        </section>
      )}

      {/* ── Input card ──────────────────────────────────────────────────────── */}
      {showInput && (
        <section className="px-4 sm:px-6 pb-20">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-ink/5 dark:shadow-black/30 border border-surface-border p-6 sm:p-8">

              {/* Error banner */}
              {state === "error" && errorMsg && (
                <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errorMsg}
                </div>
              )}

              {/* Input */}
              <label htmlFor="diagnosis-input" className="block text-xs font-bold text-ink uppercase tracking-widest mb-3">
                {t("inputLabel")}
              </label>
              <input
                id="diagnosis-input"
                ref={inputRef}
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submit(input)}
                placeholder={t("placeholder")}
                autoFocus
                className="w-full px-5 py-4 rounded-2xl border border-surface-border dark:border-slate-700 bg-surface-raised dark:bg-slate-900 text-ink text-base placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all"
              />

              {/* Example chips */}
              <div className="mt-4 mb-5">
                <p className="text-xs text-ink-tertiary mb-2.5">{t("commonExamples")}</p>
                <div className="flex flex-wrap gap-2">
                  {EXAMPLE_CHIPS.map((chip) => (
                    <button
                      key={chip}
                      onClick={() => handleChip(chip)}
                      className="px-3 py-1.5 rounded-full border border-surface-border dark:border-slate-700 text-xs font-medium text-ink-secondary hover:border-brand-blue/50 hover:text-brand-blue hover:bg-brand-blue-light dark:hover:bg-brand-blue/10 transition-all duration-150"
                    >
                      {chip}
                    </button>
                  ))}
                </div>
              </div>

              {/* Submit */}
              <button
                onClick={() => submit(input)}
                disabled={!input.trim()}
                className="w-full py-4 bg-brand-blue hover:bg-brand-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-base transition-all duration-200 shadow-md shadow-brand-blue/20 hover:shadow-lg hover:shadow-brand-blue/25 flex items-center justify-center gap-2"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                  <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                </svg>
                {t("submit")}
              </button>

              {/* Privacy note */}
              <p className="mt-4 text-center text-xs text-ink-tertiary flex items-center justify-center gap-1.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                  <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                {t("privacy")}
              </p>
            </div>
          </div>
        </section>
      )}

      {/* ── Loading ─────────────────────────────────────────────────────────── */}
      {state === "loading" && (
        <div className="max-w-2xl mx-auto px-4 pb-20">
          <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-ink/5 dark:shadow-black/30 border border-surface-border">
            <LoadingState diagnosis={input} />
          </div>
        </div>
      )}

      {/* ── Result ──────────────────────────────────────────────────────────── */}
      {state === "result" && result && (
        <div ref={resultRef} className="max-w-5xl mx-auto px-4 pt-12 pb-20">

          {/* Title */}
          <div className="text-center mb-8">
            <p className="text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-2">{t("yourExplanation")}</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight">
              {t("understanding")}{" "}
              <span className="text-gradient-blue">{result.diagnosis}</span>
            </h2>
          </div>

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

          {/* 2-column grid: explanation left, sticky chat right (xl+) */}
          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6 xl:items-start space-y-5 xl:space-y-0">

            {/* ─── Explanation column ─── */}
            <div className={`space-y-5 min-w-0 ${mobileTab === "ask" ? "hidden xl:block" : ""}`}>
          {/* 6 section cards */}
          <WhatThisIsSection text={result.whatThisIs} />
          <WhatCausedItSection text={result.whatCausedIt} />
          <WhatLifeLooksLikeSection data={result.whatLifeLooksLike} />
          <NextSixMonthsSection text={result.nextSixMonths} />
          {result.questionsForDoctor.length > 0 && (
            <QuestionsSection questions={result.questionsForDoctor} />
          )}
          {result.explainingToOthers.length > 0 && (
            <ExplainingToOthersSection templates={result.explainingToOthers} />
          )}

          {/* Action bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
            <button
              onClick={handleReset}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-surface-border hover:border-brand-blue/40 hover:bg-brand-blue-light text-ink-secondary hover:text-brand-blue text-sm font-semibold transition-all duration-200"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
              </svg>
              {t("startOver")}
            </button>
            <button
              onClick={() => window.print()}
              className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-surface-border hover:border-slate-400 hover:bg-surface-raised text-ink-secondary hover:text-ink text-sm font-semibold transition-all duration-200"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a1 1 0 001 1h8a1 1 0 001-1v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a1 1 0 00-1-1H6a1 1 0 00-1 1zm2 0h6v3H7V4zm-1 9H5v-2h1v2zm2 0v2h6v-2H8zm6 0h1v-2h-1v2z" clipRule="evenodd" />
              </svg>
              {t("saveAsPdf")}
            </button>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 mt-2">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
              {t("disclaimer")}
            </p>
          </div>
            </div>{/* end explanation column */}

            {/* ─── Sticky chat sidebar (xl+) / tab-switched (mobile) ─── */}
            <aside className={`xl:sticky xl:top-24 min-w-0 scroll-mt-6 ${mobileTab !== "ask" ? "hidden xl:block" : ""}`}>
              <DiagnosisChatPanel
                diagnosis={result.diagnosis}
                explanationSnapshot={rawExplanation}
                language={lang}
              />
            </aside>
          </div>{/* end 2-column grid */}
        </div>
      )}
    </div>
  );
}
