"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import WordReveal from "@/components/WordReveal";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslations } from "next-intl";
import { useToolContext } from "@/components/ToolChatProvider";

const VisitChatPanel = dynamic(() => import("@/components/VisitChatPanel"), {
  ssr: false,
});

// ── Types ────────────────────────────────────────────────────────────────────

type Mode = "prep" | "debrief";
type Tier = "simple" | "medium" | "expert";
type Stage = "idle" | "loading" | "result" | "error";

interface PrepResult {
  clarify: string | null;
  topQuestions: { question: string; why: string }[];
  testsToDiscuss: { test: string; why: string }[];
  conditionsToRuleOut: { condition: string; why: string }[];
  howToCommunicate: {
    onset: string;
    location: string;
    duration: string;
    character: string;
    aggravating: string;
    relieving: string;
    severity: string;
    associated: string;
  };
  whatToBring: string[];
}

interface PrescribedItem {
  item: string;
  what: string;
  why: string;
  goal: string;
}

interface FollowUpItem {
  step: string;
  when: string;
  why: string;
  urgent: boolean;
}

interface JargonItem {
  term: string;
  plain: string;
}

interface DebriefResult {
  clarify: string | null;
  whatWasDiscussed: string;
  whatWasPrescribed: PrescribedItem[];
  followUpPlan: FollowUpItem[];
  warningSigns: string[];
  jargonDecoder: JargonItem[];
  remainingQuestions: string[];
}

// ── Parsers ──────────────────────────────────────────────────────────────────

const PREP_SECTION_KEYS = [
  "CLARIFY",
  "TOP_QUESTIONS",
  "TESTS_TO_DISCUSS",
  "CONDITIONS_TO_RULE_OUT",
  "HOW_TO_COMMUNICATE",
  "WHAT_TO_BRING",
] as const;

const DEBRIEF_SECTION_KEYS = [
  "CLARIFY",
  "WHAT_WAS_DISCUSSED",
  "WHAT_WAS_PRESCRIBED",
  "FOLLOW_UP_PLAN",
  "WARNING_SIGNS",
  "JARGON_DECODER",
  "REMAINING_QUESTIONS",
] as const;

function parseSections(text: string, keys: readonly string[]): Record<string, string> {
  const positions: { key: string; idx: number }[] = [];
  for (const key of keys) {
    const re = new RegExp(`(^|\\n)${key}(?=\\s*\\n|\\s*$)`, "g");
    const m = re.exec(text);
    if (m) positions.push({ key, idx: m.index + (m[1] ? 1 : 0) });
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

function parseBullets(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 0);
}

function parseNumberedList(text: string): string[] {
  const items: string[] = [];
  let current = "";
  for (const line of text.split("\n")) {
    const t = line.trim();
    if (/^\d+[.)]\s+/.test(t)) {
      if (current.trim()) items.push(current.trim());
      current = t.replace(/^\d+[.)]\s+/, "");
    } else if (current && t) {
      current += " " + t;
    }
  }
  if (current.trim()) items.push(current.trim());
  return items.filter(Boolean);
}

function parseLabeledBlocks<T>(
  text: string,
  startLabel: string,
  fields: readonly string[]
): T[] {
  const items: T[] = [];
  const blocks = text.split(new RegExp(`(?=^${startLabel}:)`, "gm")).filter((b) => b.trim());
  for (const block of blocks) {
    if (!new RegExp(`^${startLabel}:`).test(block.trim())) continue;
    const out: Record<string, string> = {};
    for (let i = 0; i < fields.length; i++) {
      const field = fields[i];
      const nextField = fields[i + 1];
      const re = nextField
        ? new RegExp(`${field}:\\s*([\\s\\S]+?)(?=\\n${nextField}:|$)`)
        : new RegExp(`${field}:\\s*([\\s\\S]+)`);
      const m = block.match(re);
      out[field.toLowerCase()] = m ? m[1].trim() : "";
    }
    items.push(out as unknown as T);
  }
  return items;
}

function parseInlineLabel(text: string, label: string): string {
  const m = text.match(new RegExp(`(?:^|\\n)${label}:\\s*([^\\n]+)`));
  return m ? m[1].trim() : "";
}

function parsePrepResult(raw: string): PrepResult {
  const s = parseSections(raw, PREP_SECTION_KEYS);
  return {
    clarify: s["CLARIFY"] ? s["CLARIFY"].trim() : null,
    topQuestions: parseLabeledBlocks<{ question: string; why: string }>(
      s["TOP_QUESTIONS"] ?? "",
      "QUESTION",
      ["QUESTION", "WHY"]
    ),
    testsToDiscuss: parseLabeledBlocks<{ test: string; why: string }>(
      s["TESTS_TO_DISCUSS"] ?? "",
      "TEST",
      ["TEST", "WHY"]
    ),
    conditionsToRuleOut: parseLabeledBlocks<{ condition: string; why: string }>(
      s["CONDITIONS_TO_RULE_OUT"] ?? "",
      "CONDITION",
      ["CONDITION", "WHY"]
    ),
    howToCommunicate: {
      onset: parseInlineLabel(s["HOW_TO_COMMUNICATE"] ?? "", "ONSET"),
      location: parseInlineLabel(s["HOW_TO_COMMUNICATE"] ?? "", "LOCATION"),
      duration: parseInlineLabel(s["HOW_TO_COMMUNICATE"] ?? "", "DURATION"),
      character: parseInlineLabel(s["HOW_TO_COMMUNICATE"] ?? "", "CHARACTER"),
      aggravating: parseInlineLabel(s["HOW_TO_COMMUNICATE"] ?? "", "AGGRAVATING"),
      relieving: parseInlineLabel(s["HOW_TO_COMMUNICATE"] ?? "", "RELIEVING"),
      severity: parseInlineLabel(s["HOW_TO_COMMUNICATE"] ?? "", "SEVERITY"),
      associated: parseInlineLabel(s["HOW_TO_COMMUNICATE"] ?? "", "ASSOCIATED"),
    },
    whatToBring: parseBullets(s["WHAT_TO_BRING"] ?? ""),
  };
}

function parseDebriefResult(raw: string): DebriefResult {
  const s = parseSections(raw, DEBRIEF_SECTION_KEYS);
  const followUpRaw = parseLabeledBlocks<{
    step: string;
    when: string;
    why: string;
    urgent: string;
  }>(s["FOLLOW_UP_PLAN"] ?? "", "STEP", ["STEP", "WHEN", "WHY", "URGENT"]);
  return {
    clarify: s["CLARIFY"] ? s["CLARIFY"].trim() : null,
    whatWasDiscussed: s["WHAT_WAS_DISCUSSED"] ?? "",
    whatWasPrescribed: parseLabeledBlocks<PrescribedItem>(
      s["WHAT_WAS_PRESCRIBED"] ?? "",
      "ITEM",
      ["ITEM", "WHAT", "WHY", "GOAL"]
    ),
    followUpPlan: followUpRaw.map((f) => ({
      step: f.step,
      when: f.when,
      why: f.why,
      urgent: /^y(es)?$/i.test(f.urgent.trim()),
    })),
    warningSigns: parseBullets(s["WARNING_SIGNS"] ?? ""),
    jargonDecoder: parseLabeledBlocks<JargonItem>(
      s["JARGON_DECODER"] ?? "",
      "TERM",
      ["TERM", "PLAIN"]
    ),
    remainingQuestions: parseNumberedList(s["REMAINING_QUESTIONS"] ?? ""),
  };
}

// ── Shared sub-components ────────────────────────────────────────────────────

function CopyButton({ text, label }: { text: string; label: string }) {
  const t = useTranslations("Visit");
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
          {t("copied")}
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
  if (!text) return null;
  return (
    <div className="space-y-3">
      {text.split("\n\n").filter(Boolean).map((para, i) => (
        <p key={i} className="text-ink-secondary leading-relaxed text-sm">{para}</p>
      ))}
    </div>
  );
}

function SectionCard({
  accent,
  emphasize,
  icon,
  label,
  sublabel,
  children,
}: {
  accent: string;
  emphasize?: boolean;
  icon: React.ReactNode;
  label: string;
  sublabel?: string;
  children: React.ReactNode;
}) {
  const wrapper = emphasize
    ? `rounded-2xl bg-white dark:bg-slate-800 border-2 shadow-lg overflow-hidden ${accent}`
    : `rounded-2xl bg-white dark:bg-slate-800 border border-surface-border shadow-sm overflow-hidden border-l-4 ${accent}`;
  return (
    <div className={wrapper}>
      <div className="px-6 pt-5 pb-1 flex items-start gap-2.5">
        <span className="flex-shrink-0 mt-0.5">{icon}</span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink uppercase tracking-wider">{label}</h3>
          {sublabel && <p className="mt-1 text-xs text-ink-tertiary leading-relaxed">{sublabel}</p>}
        </div>
      </div>
      <div className="px-6 pb-6 pt-3">{children}</div>
    </div>
  );
}

// ── Mode A sections ──────────────────────────────────────────────────────────

function TopQuestionsSection({ items }: { items: { question: string; why: string }[] }) {
  const t = useTranslations("Visit");
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const toggle = (i: number) => setChecked((p) => ({ ...p, [i]: !p[i] }));
  const allText = items.map((q, i) => `${i + 1}. ${q.question}`).join("\n");

  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-brand-blue/30 shadow-lg shadow-brand-blue/5 overflow-hidden">
      {/* Prominent header with subtle gradient — this is the hero section */}
      <div className="px-6 pt-5 pb-4 bg-gradient-to-r from-brand-blue/5 via-brand-indigo/3 to-transparent border-b border-brand-blue/10">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-brand-blue to-brand-indigo flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-ink tracking-tight">{t("sectionTopQuestions")}</h3>
            <p className="text-xs text-ink-tertiary mt-0.5">{t("sectionTopQuestionsDesc")}</p>
          </div>
        </div>
      </div>
      <div className="px-6 py-5">
        <ol className="space-y-4">
          {items.map((q, i) => (
            <li key={i} className="flex items-start gap-3">
              <button
                onClick={() => toggle(i)}
                className={`mt-0.5 w-7 h-7 rounded-full flex items-center justify-center flex-shrink-0 text-xs font-bold border-2 transition-all duration-150 ${
                  checked[i]
                    ? "bg-brand-blue border-brand-blue text-white"
                    : "border-brand-blue/30 bg-white dark:bg-slate-900 text-brand-blue hover:border-brand-blue/60"
                }`}
                aria-label={`Mark question ${i + 1} as asked`}
              >
                {checked[i] ? (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  <span>{i + 1}</span>
                )}
              </button>
              <div className="min-w-0 flex-1">
                <p className={`text-sm font-semibold leading-relaxed transition-colors ${checked[i] ? "text-ink-tertiary line-through" : "text-ink"}`}>
                  {q.question}
                </p>
                {q.why && (
                  <p className="mt-1 text-xs text-ink-tertiary leading-relaxed">
                    <span className="font-semibold text-brand-blue">{t("labelWhy")}:</span>{" "}
                    {q.why}
                  </p>
                )}
              </div>
            </li>
          ))}
        </ol>
        <div className="mt-5 pt-4 border-t border-surface-border">
          <CopyButton text={allText} label={t("copyAllQuestions")} />
        </div>
      </div>
    </div>
  );
}

function TestsSection({ items }: { items: { test: string; why: string }[] }) {
  const t = useTranslations("Visit");
  if (items.length === 0) return null;
  return (
    <SectionCard
      accent="border-l-sky-400"
      label={t("sectionTests")}
      sublabel={t("sectionTestsDesc")}
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-sky-500">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
      }
    >
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="flex items-start gap-3">
            <span className="mt-0.5 w-6 h-6 rounded-lg bg-sky-50 dark:bg-sky-900/30 border border-sky-100 dark:border-sky-800/60 flex items-center justify-center flex-shrink-0">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-sky-500">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink leading-snug">{it.test}</p>
              {it.why && <p className="mt-0.5 text-xs text-ink-tertiary leading-relaxed">{it.why}</p>}
            </div>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function ConditionsSection({ items }: { items: { condition: string; why: string }[] }) {
  const t = useTranslations("Visit");
  if (items.length === 0) return null;
  return (
    <SectionCard
      accent="border-l-violet-400"
      label={t("sectionConditions")}
      sublabel={t("sectionConditionsDesc")}
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-500">
          <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
        </svg>
      }
    >
      <ul className="space-y-3">
        {items.map((it, i) => (
          <li key={i} className="rounded-xl border border-violet-100 dark:border-violet-900/40 bg-violet-50/50 dark:bg-violet-950/20 px-4 py-3">
            <p className="text-sm font-semibold text-ink leading-snug">{it.condition}</p>
            {it.why && <p className="mt-1 text-xs text-ink-secondary leading-relaxed">{it.why}</p>}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function CommunicateSection({
  data,
}: {
  data: PrepResult["howToCommunicate"];
}) {
  const t = useTranslations("Visit");
  const ROWS: { key: keyof PrepResult["howToCommunicate"]; label: string }[] = [
    { key: "onset", label: t("labelOnset") },
    { key: "location", label: t("labelLocation") },
    { key: "duration", label: t("labelDuration") },
    { key: "character", label: t("labelCharacter") },
    { key: "aggravating", label: t("labelAggravating") },
    { key: "relieving", label: t("labelRelieving") },
    { key: "severity", label: t("labelSeverity") },
    { key: "associated", label: t("labelAssociated") },
  ];
  const hasAny = ROWS.some((r) => data[r.key]);
  if (!hasAny) return null;

  return (
    <SectionCard
      accent="border-l-slate-300 dark:border-l-slate-600"
      label={t("sectionCommunicate")}
      sublabel={t("sectionCommunicateDesc")}
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-slate-400">
          <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
        </svg>
      }
    >
      <dl className="grid grid-cols-1 sm:grid-cols-[140px_1fr] gap-y-3 gap-x-4">
        {ROWS.map((row) => (
          <div key={row.key} className="contents">
            <dt className="text-xs font-bold text-ink-tertiary uppercase tracking-wider sm:pt-0.5">
              {row.label}
            </dt>
            <dd className="text-sm text-ink-secondary leading-relaxed">
              {data[row.key] || <span className="italic text-ink-tertiary">—</span>}
            </dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

function WhatToBringSection({ items }: { items: string[] }) {
  const t = useTranslations("Visit");
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const toggle = (i: number) => setChecked((p) => ({ ...p, [i]: !p[i] }));
  if (items.length === 0) return null;
  return (
    <SectionCard
      accent="border-l-emerald-400"
      label={t("sectionWhatToBring")}
      sublabel={t("sectionWhatToBringDesc")}
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
      }
    >
      <ul className="space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3">
            <button
              onClick={() => toggle(i)}
              className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-all duration-150 ${
                checked[i]
                  ? "bg-emerald-500 border-emerald-500"
                  : "border-surface-border dark:border-slate-600 hover:border-emerald-400"
              }`}
              aria-label={`Check item ${i + 1}`}
            >
              {checked[i] && (
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-white">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              )}
            </button>
            <span className={`text-sm leading-relaxed transition-colors ${checked[i] ? "text-ink-tertiary line-through" : "text-ink-secondary"}`}>
              {item}
            </span>
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

// ── Mode B sections ──────────────────────────────────────────────────────────

function WhatWasDiscussedSection({ text }: { text: string }) {
  const t = useTranslations("Visit");
  if (!text) return null;
  return (
    <SectionCard
      accent="border-l-brand-blue"
      label={t("sectionDiscussed")}
      sublabel={t("sectionDiscussedDesc")}
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

function PrescribedSection({ items }: { items: PrescribedItem[] }) {
  const t = useTranslations("Visit");
  if (items.length === 0) return null;
  return (
    <SectionCard
      accent="border-l-violet-400"
      label={t("sectionPrescribed")}
      sublabel={t("sectionPrescribedDesc")}
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-500">
          <path fillRule="evenodd" d="M14.5 3a3.5 3.5 0 00-2.475 5.975L7.025 13.475a3.5 3.5 0 104.95 4.95l5-5a3.5 3.5 0 00-2.475-5.975h-.025L18.5 6.5A3.5 3.5 0 0014.5 3zm-1.768 5.732l-4 4 1.768 1.768 4-4-1.768-1.768z" clipRule="evenodd" />
        </svg>
      }
    >
      <ul className="space-y-3.5">
        {items.map((p, i) => (
          <li
            key={i}
            className="rounded-xl border border-violet-100 dark:border-violet-900/40 bg-white dark:bg-slate-900 px-4 py-3.5"
          >
            <p className="text-sm font-bold text-ink leading-snug">{p.item}</p>
            {p.what && (
              <p className="mt-1.5 text-xs text-ink-secondary leading-relaxed">{p.what}</p>
            )}
            {p.why && (
              <p className="mt-1.5 text-xs text-ink-secondary leading-relaxed">
                <span className="font-semibold text-violet-600 dark:text-violet-400">
                  {t("labelWhy")}:
                </span>{" "}
                {p.why}
              </p>
            )}
            {p.goal && (
              <p className="mt-1 text-xs text-ink-secondary leading-relaxed">
                <span className="font-semibold text-violet-600 dark:text-violet-400">
                  {t("labelGoal")}:
                </span>{" "}
                {p.goal}
              </p>
            )}
          </li>
        ))}
      </ul>
    </SectionCard>
  );
}

function FollowUpSection({ items }: { items: FollowUpItem[] }) {
  const t = useTranslations("Visit");
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-amber-300 dark:border-amber-700/60 shadow-lg shadow-amber-500/5 overflow-hidden">
      <div className="px-6 pt-5 pb-4 bg-gradient-to-r from-amber-50/80 via-amber-50/40 to-transparent dark:from-amber-950/30 dark:via-amber-950/15 border-b border-amber-200/60 dark:border-amber-800/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-600 dark:text-amber-400">
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-ink tracking-tight">{t("sectionFollowUp")}</h3>
            <p className="text-xs text-ink-tertiary mt-0.5">{t("sectionFollowUpDesc")}</p>
          </div>
        </div>
      </div>
      <ol className="px-6 py-5 space-y-4">
        {items.map((f, i) => (
          <li key={i} className="flex items-start gap-3">
            <span
              className={`mt-0.5 flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                f.urgent
                  ? "bg-red-500 text-white"
                  : "bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-400"
              }`}
            >
              {i + 1}
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <p className="text-sm font-semibold text-ink leading-snug">{f.step}</p>
                {f.urgent && (
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-800 text-[10px] font-bold uppercase tracking-wider text-red-700 dark:text-red-400">
                    <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
                    {t("labelTimeSensitive")}
                  </span>
                )}
              </div>
              {f.when && (
                <p className="mt-1 text-xs text-ink-secondary leading-relaxed">
                  <span className="font-semibold text-amber-700 dark:text-amber-400">
                    {t("labelWhen")}:
                  </span>{" "}
                  {f.when}
                </p>
              )}
              {f.why && (
                <p className="mt-0.5 text-xs text-ink-tertiary leading-relaxed">{f.why}</p>
              )}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

function WarningSignsSection({ items }: { items: string[] }) {
  const t = useTranslations("Visit");
  if (items.length === 0) return null;
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border-2 border-red-300 dark:border-red-800/60 shadow-lg shadow-red-500/5 overflow-hidden">
      <div className="px-6 pt-5 pb-4 bg-gradient-to-r from-red-50/80 via-red-50/40 to-transparent dark:from-red-950/30 dark:via-red-950/15 border-b border-red-200/60 dark:border-red-800/50">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-600 dark:text-red-400">
              <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-extrabold text-ink tracking-tight">{t("sectionWarning")}</h3>
            <p className="text-xs text-ink-tertiary mt-0.5">{t("sectionWarningDesc")}</p>
          </div>
        </div>
      </div>
      <ul className="px-6 py-5 space-y-2.5">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-ink-secondary leading-relaxed">
            <span className="flex-shrink-0 mt-1 w-1.5 h-1.5 rounded-full bg-red-500" />
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function JargonDecoderSection({ items }: { items: JargonItem[] }) {
  const t = useTranslations("Visit");
  if (items.length === 0) return null;
  return (
    <SectionCard
      accent="border-l-sky-400"
      label={t("sectionJargon")}
      sublabel={t("sectionJargonDesc")}
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-sky-500">
          <path fillRule="evenodd" d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.669 0-3.218.51-4.5 1.385V15" clipRule="evenodd" />
        </svg>
      }
    >
      <dl className="divide-y divide-surface-border">
        {items.map((j, i) => (
          <div key={i} className="grid grid-cols-1 sm:grid-cols-[200px_1fr] gap-y-1 gap-x-4 py-3 first:pt-0 last:pb-0">
            <dt>
              <span className="inline-block px-2 py-0.5 rounded-md bg-sky-50 dark:bg-sky-900/30 border border-sky-100 dark:border-sky-800/60 text-xs font-mono-data text-sky-700 dark:text-sky-300">
                {j.term}
              </span>
            </dt>
            <dd className="text-sm text-ink-secondary leading-relaxed">{j.plain}</dd>
          </div>
        ))}
      </dl>
    </SectionCard>
  );
}

function RemainingQuestionsSection({ items }: { items: string[] }) {
  const t = useTranslations("Visit");
  const [checked, setChecked] = useState<Record<number, boolean>>({});
  const toggle = (i: number) => setChecked((p) => ({ ...p, [i]: !p[i] }));
  const allText = items.map((q, i) => `${i + 1}. ${q}`).join("\n");
  if (items.length === 0) return null;
  return (
    <SectionCard
      accent="border-l-pink-400"
      label={t("sectionRemainingQuestions")}
      sublabel={t("sectionRemainingQuestionsDesc")}
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-pink-500">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      }
    >
      <ol className="space-y-3 mb-4">
        {items.map((q, i) => (
          <li key={i} className="flex items-start gap-3">
            <button
              onClick={() => toggle(i)}
              className={`mt-0.5 w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border transition-all duration-150 ${
                checked[i]
                  ? "bg-pink-500 border-pink-500"
                  : "border-surface-border dark:border-slate-600 hover:border-pink-400"
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
      <CopyButton text={allText} label={t("copyAllQuestions")} />
    </SectionCard>
  );
}

// ── Loading state ────────────────────────────────────────────────────────────

function LoadingState({ message }: { message: string }) {
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDot((d) => (d + 1) % 4), 600);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full border-2 border-brand-blue/20 animate-ping absolute inset-0" style={{ animationDuration: "2s" }} />
        <div className="w-16 h-16 rounded-full border-2 border-brand-blue/30 flex items-center justify-center relative">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-brand-blue">
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
      </div>
      <p className="text-base font-semibold text-ink">
        {message}
        {".".repeat(dot)}
      </p>
    </div>
  );
}

// ── Tier toggle ──────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<Tier, { label: string; aud: string; active: string }> = {
  simple: {
    label: "tierSimple",
    aud: "tierSimpleLabel",
    active: "text-emerald-700 dark:text-emerald-400 border-b-2 border-emerald-500 bg-emerald-500/5",
  },
  medium: {
    label: "tierMedium",
    aud: "tierMediumLabel",
    active: "text-brand-blue border-b-2 border-brand-blue bg-brand-blue/5",
  },
  expert: {
    label: "tierExpert",
    aud: "tierExpertLabel",
    active: "text-purple-700 dark:text-purple-400 border-b-2 border-purple-500 bg-purple-500/5",
  },
};

function TierToggle({ tier, onChange }: { tier: Tier; onChange: (t: Tier) => void }) {
  const t = useTranslations("Visit");
  return (
    <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-800 overflow-hidden">
      <p className="px-5 py-2.5 text-xs font-bold text-ink-tertiary uppercase tracking-wider border-b border-surface-border bg-surface-raised">
        {t("tierTitle")}
      </p>
      <div className="flex">
        {(Object.keys(TIER_CONFIG) as Tier[]).map((key) => {
          const cfg = TIER_CONFIG[key];
          const isActive = key === tier;
          return (
            <button
              key={key}
              onClick={() => onChange(key)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-3 text-xs sm:text-sm font-semibold transition-all duration-200 ${
                isActive
                  ? cfg.active
                  : "text-ink-tertiary hover:text-ink-secondary hover:bg-surface-raised"
              }`}
            >
              <span>{t(cfg.label)}</span>
              {isActive && (
                <span className="hidden sm:inline-block text-xs font-normal opacity-60">
                  — {t(cfg.aud)}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ── Mode tabs ────────────────────────────────────────────────────────────────

function ModeTabs({ mode, onChange }: { mode: Mode; onChange: (m: Mode) => void }) {
  const t = useTranslations("Visit");
  const TABS: { key: Mode; title: string; subtitle: string; icon: React.ReactNode }[] = [
    {
      key: "prep",
      title: t("tabBefore"),
      subtitle: t("tabBeforeSubtitle"),
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
        </svg>
      ),
    },
    {
      key: "debrief",
      title: t("tabAfter"),
      subtitle: t("tabAfterSubtitle"),
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
        </svg>
      ),
    },
  ];
  return (
    <div className="grid grid-cols-2 gap-2 p-1.5 bg-surface-raised dark:bg-slate-800 rounded-2xl border border-surface-border">
      {TABS.map((tab) => {
        const isActive = mode === tab.key;
        return (
          <button
            key={tab.key}
            onClick={() => onChange(tab.key)}
            className={`flex items-center gap-3 px-4 py-3 rounded-xl text-left transition-all duration-200 ${
              isActive
                ? "bg-white dark:bg-slate-900 shadow-md text-ink border border-brand-blue/30"
                : "text-ink-secondary hover:text-ink hover:bg-white/60 dark:hover:bg-slate-900/60"
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 transition-colors ${
                isActive
                  ? "bg-gradient-to-br from-brand-blue to-brand-indigo text-white"
                  : "bg-white dark:bg-slate-900 text-ink-tertiary border border-surface-border"
              }`}
            >
              {tab.icon}
            </div>
            <div className="min-w-0">
              <p className={`text-sm font-bold leading-tight ${isActive ? "text-ink" : "text-ink-secondary"}`}>
                {tab.title}
              </p>
              <p className="text-[11px] text-ink-tertiary mt-0.5 leading-tight">{tab.subtitle}</p>
            </div>
          </button>
        );
      })}
    </div>
  );
}

// ── File upload (Mode B) ─────────────────────────────────────────────────────

const ACCEPTED = "application/pdf,image/jpeg,image/jpg,image/png,image/webp";
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function FileUploader({
  file,
  onChange,
  onError,
}: {
  file: File | null;
  onChange: (f: File | null) => void;
  onError: (msg: string) => void;
}) {
  const t = useTranslations("Visit");
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files || files.length === 0) return;
    const f = files[0];
    if (f.size > MAX_FILE_BYTES) {
      onError(t("errorFileTooLarge"));
      return;
    }
    const ok = ["application/pdf", "image/jpeg", "image/jpg", "image/png", "image/webp"];
    if (!ok.includes(f.type)) {
      onError(t("errorFileType"));
      return;
    }
    onChange(f);
  };

  if (file) {
    return (
      <div className="rounded-xl border border-brand-blue/30 bg-brand-blue-light/40 dark:bg-brand-blue/10 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-surface-border flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-blue">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{file.name}</p>
          <p className="text-[11px] text-ink-tertiary">
            {(file.size / 1024).toFixed(0)} KB
          </p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-semibold text-ink-secondary hover:text-red-600 transition-colors px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          {t("debriefFileRemove")}
        </button>
      </div>
    );
  }

  return (
    <label
      onDragEnter={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        handleFiles(e.dataTransfer.files);
      }}
      className={`flex items-center justify-center gap-3 px-4 py-4 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
        dragging
          ? "border-brand-blue bg-brand-blue-light/60 dark:bg-brand-blue/10"
          : "border-surface-border hover:border-brand-blue/40 hover:bg-brand-blue-light/30 dark:hover:bg-brand-blue/5"
      }`}
    >
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED}
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-ink-tertiary flex-shrink-0">
        <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
      </svg>
      <div className="min-w-0">
        <p className="text-sm font-semibold text-ink leading-tight">{t("debriefFileDrop")}</p>
        <p className="text-xs text-ink-tertiary mt-0.5">{t("debriefFileHint")}</p>
      </div>
    </label>
  );
}

// ── Clarify card (shared between modes) ──────────────────────────────────────

function ClarifyCard({ message }: { message: string }) {
  const t = useTranslations("Visit");
  return (
    <div className="rounded-2xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-800/60 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-amber-100 dark:border-amber-800/40 bg-amber-50/60 dark:bg-amber-950/20 flex items-center gap-2.5">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-sm font-semibold text-ink">{t("clarifyTitle")}</p>
      </div>
      <div className="p-5">
        <p className="text-sm text-ink-secondary leading-relaxed">{message}</p>
        <p className="mt-3 text-xs text-ink-tertiary leading-relaxed">{t("clarifyHint")}</p>
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function VisitPage() {
  const { lang } = useLanguage();
  const t = useTranslations("Visit");

  const [mode, setMode] = useState<Mode>("prep");
  const [tier, setTier] = useState<Tier>("medium");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [mobileTab, setMobileTab] = useState<"results" | "ask">("results");

  // Mode A inputs + result
  const [prepConcern, setPrepConcern] = useState("");
  const [prepResults, setPrepResults] = useState("");
  const [prepHistory, setPrepHistory] = useState("");
  const [prepResult, setPrepResult] = useState<PrepResult | null>(null);
  const [prepRawText, setPrepRawText] = useState("");
  const [prepInputSummary, setPrepInputSummary] = useState("");

  // Mode B inputs + result
  const [debriefNotes, setDebriefNotes] = useState("");
  const [debriefFile, setDebriefFile] = useState<File | null>(null);
  const [debriefContext, setDebriefContext] = useState("");
  const [debriefResult, setDebriefResult] = useState<DebriefResult | null>(null);
  const [debriefRawText, setDebriefRawText] = useState("");
  const [debriefInputSummary, setDebriefInputSummary] = useState("");

  useToolContext(
    prepResult
      ? JSON.stringify({ mode: "prep", ...prepResult })
      : debriefResult
        ? JSON.stringify({ mode: "debrief", ...debriefResult })
        : null,
  );

  const resultRef = useRef<HTMLDivElement>(null);

  // Switching tabs clears everything per spec.
  const switchMode = (next: Mode) => {
    if (next === mode) return;
    setMode(next);
    setStage("idle");
    setErrorMsg("");
    setPrepConcern("");
    setPrepResults("");
    setPrepHistory("");
    setPrepResult(null);
    setDebriefNotes("");
    setDebriefFile(null);
    setDebriefContext("");
    setDebriefResult(null);
  };

  const submitPrep = useCallback(async () => {
    const concern = prepConcern.trim();
    if (!concern) {
      setErrorMsg(t("prepRequired"));
      setStage("error");
      return;
    }
    setStage("loading");
    setErrorMsg("");
    setPrepResult(null);

    try {
      const res = await fetch("/api/visit-prep", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          concern,
          recentResults: prepResults,
          healthContext: prepHistory,
          tier,
          language: lang,
        }),
      });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !json.text) {
        setErrorMsg(json.error ?? t("errorGeneric"));
        setStage("error");
        return;
      }
      setPrepResult(parsePrepResult(json.text));
      setPrepRawText(json.text);
      const summary = [
        `Main concern: ${concern}`,
        prepResults.trim() && `Recent results: ${prepResults.trim()}`,
        prepHistory.trim() && `Health context: ${prepHistory.trim()}`,
      ]
        .filter(Boolean)
        .join("\n");
      setPrepInputSummary(summary);
      setStage("result");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setErrorMsg(t("errorGeneric"));
      setStage("error");
    }
  }, [prepConcern, prepResults, prepHistory, tier, lang, t]);

  const submitDebrief = useCallback(async () => {
    const notes = debriefNotes.trim();
    if (!notes && !debriefFile) {
      setErrorMsg(t("debriefRequired"));
      setStage("error");
      return;
    }
    setStage("loading");
    setErrorMsg("");
    setDebriefResult(null);

    try {
      const fd = new FormData();
      fd.append("notes", notes);
      fd.append("context", debriefContext.trim());
      fd.append("tier", tier);
      fd.append("language", lang);
      if (debriefFile) fd.append("file", debriefFile);

      const res = await fetch("/api/visit-debrief", { method: "POST", body: fd });
      const json = (await res.json()) as { text?: string; error?: string };
      if (!res.ok || !json.text) {
        setErrorMsg(json.error ?? t("errorGeneric"));
        setStage("error");
        return;
      }
      setDebriefResult(parseDebriefResult(json.text));
      setDebriefRawText(json.text);
      const summary = [
        notes && `Notes / paperwork: ${notes}`,
        debriefFile && `Uploaded: ${debriefFile.name} (${(debriefFile.size / 1024).toFixed(0)} KB)`,
        debriefContext.trim() && `Specific question: ${debriefContext.trim()}`,
      ]
        .filter(Boolean)
        .join("\n");
      setDebriefInputSummary(summary);
      setStage("result");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setErrorMsg(t("errorGeneric"));
      setStage("error");
    }
  }, [debriefNotes, debriefFile, debriefContext, tier, lang, t]);

  const resetCurrent = () => {
    setStage("idle");
    setErrorMsg("");
    if (mode === "prep") {
      setPrepResult(null);
    } else {
      setDebriefResult(null);
    }
  };

  const showInputCard = stage === "idle" || stage === "error";
  const isLoading = stage === "loading";
  const hasResult = stage === "result";

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-light to-white dark:from-[#0B1424] dark:to-[#070B16]">
      {/* Hero */}
      <section className="relative isolate overflow-hidden grain pt-32 pb-10 px-4 sm:px-6">
        <div className="aurora-field" aria-hidden="true" data-parallax="0.16">
          <div className="aurora-blob animate-aurora" style={{ top: "-20%", left: "22%", width: "30vw", height: "30vw", background: "radial-gradient(circle at 40% 40%, rgba(99,102,241,0.36), transparent 62%)" }} />
          <div className="aurora-blob animate-aurora" style={{ top: "-10%", right: "20%", width: "26vw", height: "26vw", background: "radial-gradient(circle at 60% 50%, rgba(74,133,239,0.3), transparent 64%)", animationDelay: "-7s" }} />
        </div>
        <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto text-center">
          <div className="chip text-brand-indigo mb-6">
            <span className="kicker-mono text-brand-indigo">{t("badge")}</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-bold tracking-tightest leading-[1.03] mb-3">
            <WordReveal text={t("title")} base={0.05} wordClassName="text-gradient-blue" />
          </h1>
          <p className="text-lg text-ink-secondary leading-relaxed text-pretty">{t("subtitle")}</p>
        </div>
      </section>

      {/* Mode tabs + tier toggle (always visible) */}
      <section className="px-4 sm:px-6 pb-6">
        <div className="max-w-2xl mx-auto space-y-3">
          <ModeTabs mode={mode} onChange={switchMode} />
          <TierToggle tier={tier} onChange={setTier} />
        </div>
      </section>

      {/* Input card */}
      {showInputCard && (
        <section className="px-4 sm:px-6 pb-16">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-ink/5 dark:shadow-black/30 border border-surface-border p-6 sm:p-8">
              {stage === "error" && errorMsg && (
                <div className="mb-5 flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-100 dark:border-red-900 text-red-700 dark:text-red-400 text-sm">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  {errorMsg}
                </div>
              )}

              {mode === "prep" ? (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="prep-concern" className="block text-xs font-bold text-ink uppercase tracking-widest mb-2">
                      {t("prepConcernLabel")}
                    </label>
                    <textarea
                      id="prep-concern"
                      value={prepConcern}
                      onChange={(e) => setPrepConcern(e.target.value)}
                      rows={4}
                      placeholder={t("prepConcernPlaceholder")}
                      className="w-full px-4 py-3 rounded-2xl border border-surface-border dark:border-slate-700 bg-surface-raised dark:bg-slate-900 text-ink text-sm placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="prep-results" className="block text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-2">
                      {t("prepResultsLabel")}
                    </label>
                    <textarea
                      id="prep-results"
                      value={prepResults}
                      onChange={(e) => setPrepResults(e.target.value)}
                      rows={3}
                      placeholder={t("prepResultsPlaceholder")}
                      className="w-full px-4 py-3 rounded-2xl border border-surface-border dark:border-slate-700 bg-surface-raised dark:bg-slate-900 text-ink text-sm placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label htmlFor="prep-history" className="block text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-2">
                      {t("prepHistoryLabel")}
                    </label>
                    <textarea
                      id="prep-history"
                      value={prepHistory}
                      onChange={(e) => setPrepHistory(e.target.value)}
                      rows={2}
                      placeholder={t("prepHistoryPlaceholder")}
                      className="w-full px-4 py-3 rounded-2xl border border-surface-border dark:border-slate-700 bg-surface-raised dark:bg-slate-900 text-ink text-sm placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all resize-none"
                    />
                  </div>
                  <button
                    onClick={submitPrep}
                    disabled={!prepConcern.trim()}
                    className="w-full py-4 bg-brand-blue hover:bg-brand-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-base transition-all duration-200 shadow-md shadow-brand-blue/20 hover:shadow-lg hover:shadow-brand-blue/25 flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
                    </svg>
                    {t("prepSubmit")}
                  </button>
                  <p className="text-center text-xs text-ink-tertiary flex items-center justify-center gap-1.5">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    {t("prepReassurance")}
                  </p>
                </div>
              ) : (
                <div className="space-y-5">
                  <div>
                    <label htmlFor="debrief-notes" className="block text-xs font-bold text-ink uppercase tracking-widest mb-2">
                      {t("debriefNotesLabel")}
                    </label>
                    <textarea
                      id="debrief-notes"
                      value={debriefNotes}
                      onChange={(e) => setDebriefNotes(e.target.value)}
                      rows={8}
                      placeholder={t("debriefNotesPlaceholder")}
                      className="w-full px-4 py-3 rounded-2xl border border-surface-border dark:border-slate-700 bg-surface-raised dark:bg-slate-900 text-ink text-sm placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all resize-none"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-2">
                      {t("debriefFileLabel")}
                    </label>
                    <FileUploader
                      file={debriefFile}
                      onChange={(f) => {
                        setDebriefFile(f);
                        if (stage === "error") {
                          setStage("idle");
                          setErrorMsg("");
                        }
                      }}
                      onError={(msg) => {
                        setErrorMsg(msg);
                        setStage("error");
                      }}
                    />
                  </div>
                  <div>
                    <label htmlFor="debrief-context" className="block text-xs font-bold text-ink-tertiary uppercase tracking-widest mb-2">
                      {t("debriefContextLabel")}
                    </label>
                    <textarea
                      id="debrief-context"
                      value={debriefContext}
                      onChange={(e) => setDebriefContext(e.target.value)}
                      rows={2}
                      placeholder={t("debriefContextPlaceholder")}
                      className="w-full px-4 py-3 rounded-2xl border border-surface-border dark:border-slate-700 bg-surface-raised dark:bg-slate-900 text-ink text-sm placeholder:text-ink-tertiary focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-all resize-none"
                    />
                  </div>
                  <button
                    onClick={submitDebrief}
                    disabled={!debriefNotes.trim() && !debriefFile}
                    className="w-full py-4 bg-brand-blue hover:bg-brand-blue-hover disabled:opacity-40 disabled:cursor-not-allowed text-white font-bold rounded-2xl text-base transition-all duration-200 shadow-md shadow-brand-blue/20 hover:shadow-lg hover:shadow-brand-blue/25 flex items-center justify-center gap-2"
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                      <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                    </svg>
                    {t("debriefSubmit")}
                  </button>
                  <p className="text-center text-xs text-ink-tertiary flex items-center justify-center gap-1.5">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    {t("debriefFilePrivacy")}
                  </p>
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Loading */}
      {isLoading && (
        <section className="px-4 sm:px-6 pb-20">
          <div className="max-w-2xl mx-auto">
            <div className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-ink/5 dark:shadow-black/30 border border-surface-border">
              <LoadingState
                message={mode === "prep" ? t("prepLoading") : t("debriefLoading")}
              />
            </div>
          </div>
        </section>
      )}

      {/* Result */}
      {hasResult && (
        <div ref={resultRef} className="max-w-5xl mx-auto px-4 sm:px-6 pb-20">
          {/* Mobile tab switcher (hidden on xl+; suppressed in clarify state) */}
          {((mode === "prep" && prepResult && !prepResult.clarify) ||
            (mode === "debrief" && debriefResult && !debriefResult.clarify)) && (
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
          )}

          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6 xl:items-start space-y-5 xl:space-y-0">
            <div className={`space-y-5 min-w-0 ${mobileTab === "ask" ? "hidden xl:block" : ""}`}>
            {mode === "prep" && prepResult && (
              prepResult.clarify ? (
                <ClarifyCard message={prepResult.clarify} />
              ) : (
                <>
                  <TopQuestionsSection items={prepResult.topQuestions} />
                  <TestsSection items={prepResult.testsToDiscuss} />
                  <ConditionsSection items={prepResult.conditionsToRuleOut} />
                  <CommunicateSection data={prepResult.howToCommunicate} />
                  <WhatToBringSection items={prepResult.whatToBring} />
                </>
              )
            )}

            {mode === "debrief" && debriefResult && (
              debriefResult.clarify ? (
                <ClarifyCard message={debriefResult.clarify} />
              ) : (
                <>
                  <WhatWasDiscussedSection text={debriefResult.whatWasDiscussed} />
                  <PrescribedSection items={debriefResult.whatWasPrescribed} />
                  <FollowUpSection items={debriefResult.followUpPlan} />
                  <WarningSignsSection items={debriefResult.warningSigns} />
                  <JargonDecoderSection items={debriefResult.jargonDecoder} />
                  <RemainingQuestionsSection items={debriefResult.remainingQuestions} />
                </>
              )
            )}

            {/* Action bar */}
            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <button
                onClick={resetCurrent}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-6 py-3 rounded-xl border border-surface-border hover:border-brand-blue/40 hover:bg-brand-blue-light text-ink-secondary hover:text-brand-blue text-sm font-semibold transition-all duration-200"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1zm.008 9.057a1 1 0 011.276.61A5.002 5.002 0 0014.001 13H11a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0v-2.101a7.002 7.002 0 01-11.601-2.566 1 1 0 01.61-1.276z" clipRule="evenodd" />
                </svg>
                {t("startOver")}
              </button>
            </div>

            {/* Disclaimer band */}
            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 mt-2">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
                {t("disclaimer")}{" "}
                {mode === "prep" ? t("disclaimerPrep") : t("disclaimerDebrief")}
              </p>
            </div>
            </div>{/* end results column */}

            {/* Sticky chat sidebar (xl+) / tab-switched (mobile) — only when a non-clarify result exists */}
            {((mode === "prep" && prepResult && !prepResult.clarify) ||
              (mode === "debrief" && debriefResult && !debriefResult.clarify)) && (
              <aside className={`xl:sticky xl:top-24 min-w-0 scroll-mt-6 ${mobileTab !== "ask" ? "hidden xl:block" : ""}`}>
                <VisitChatPanel
                  mode={mode}
                  inputSummary={mode === "prep" ? prepInputSummary : debriefInputSummary}
                  analysisSnapshot={mode === "prep" ? prepRawText : debriefRawText}
                  tier={tier}
                  language={lang}
                />
              </aside>
            )}
          </div>{/* end 2-column grid */}
        </div>
      )}
    </div>
  );
}
