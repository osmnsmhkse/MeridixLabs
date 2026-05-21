"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import dynamic from "next/dynamic";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslations } from "next-intl";
import { useToolContext } from "@/components/ToolChatProvider";

const WomensHealthChatPanel = dynamic(
  () => import("@/components/WomensHealthChatPanel"),
  { ssr: false },
);

// ── Types ────────────────────────────────────────────────────────────────────

type Tier = "simple" | "medium" | "expert";
type Mode = "a" | "b" | "c";
type Stage = "idle" | "loading" | "result" | "error";
type CycleDayMeta = "" | "value" | "unknown" | "irregular" | "menopause";
type PregnancyInputType = "labs" | "symptom" | "screening";

interface LabValue {
  marker: string;
  value: string;
  unit: string;
  reference: string;
  status: "normal" | "borderline" | "out_of_range" | "needs_cycle_context";
  note?: string;
}

interface ModeAResult {
  overall_status?: "normal" | "amber" | "red";
  summary_headline?: string;
  values?: LabValue[];
  patterns?: string;
  often_missed?: string;
  questions?: string[];
  next_steps?: string;
  needs_cycle_day_banner?: boolean;
}

interface ModeBResult {
  whatsLikely: string;
  workup: string[];
  oftenMissed: string;
  whatYouCanDo: string[];
  redFlags: string[];
}

interface ModeCResult {
  testExplainer: string;
  symptomContext: string;
  redFlagsTriggered: boolean;
  redFlagsBody: string;
  redFlagsList: string[];
  whatToKnow: string[];
  questions: string[];
}

// ── Plaintext parsers (Modes B and C use section-delimited responses) ────────

const MODE_B_KEYS = [
  "WHATS_LIKELY",
  "WORKUP",
  "OFTEN_MISSED",
  "WHAT_YOU_CAN_DO",
  "RED_FLAGS",
] as const;

const MODE_C_KEYS = [
  "TEST_EXPLAINER",
  "SYMPTOM_CONTEXT",
  "PREGNANCY_RED_FLAGS",
  "WHAT_TO_KNOW",
  "QUESTIONS_FOR_PROVIDER",
] as const;

function parseSections(text: string, keys: readonly string[]): Record<string, string> {
  const positions: { key: string; idx: number }[] = [];
  for (const key of keys) {
    const re = new RegExp(`(^|\\n)${key}(?=\\s*\\n|\\s*$)`);
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

function parseNumberedOrLines(text: string): string[] {
  return text
    .split("\n")
    .map((l) => l.replace(/^\d+[.)]\s*/, "").replace(/^[-•*]\s*/, "").trim())
    .filter((l) => l.length > 0);
}

function parseModeB(raw: string): ModeBResult {
  const s = parseSections(raw, MODE_B_KEYS);
  return {
    whatsLikely: s["WHATS_LIKELY"] ?? "",
    workup: parseBullets(s["WORKUP"] ?? ""),
    oftenMissed: s["OFTEN_MISSED"] ?? "",
    whatYouCanDo: parseBullets(s["WHAT_YOU_CAN_DO"] ?? ""),
    redFlags: parseBullets(s["RED_FLAGS"] ?? ""),
  };
}

function parseModeC(raw: string): ModeCResult {
  const s = parseSections(raw, MODE_C_KEYS);
  const redFlagsRaw = (s["PREGNANCY_RED_FLAGS"] ?? "").trim();
  const triggered = /^TRIGGERED\b/i.test(redFlagsRaw);
  const redFlagsBody = triggered
    ? redFlagsRaw.replace(/^TRIGGERED\s*\n?/i, "").trim()
    : "";
  const redFlagsList = triggered ? [] : parseBullets(redFlagsRaw);
  return {
    testExplainer: s["TEST_EXPLAINER"] ?? "",
    symptomContext: s["SYMPTOM_CONTEXT"] ?? "",
    redFlagsTriggered: triggered,
    redFlagsBody,
    redFlagsList,
    whatToKnow: parseBullets(s["WHAT_TO_KNOW"] ?? ""),
    questions: parseNumberedOrLines(s["QUESTIONS_FOR_PROVIDER"] ?? ""),
  };
}

// ── Tier toggle ──────────────────────────────────────────────────────────────

function TierToggle({ tier, onChange }: { tier: Tier; onChange: (t: Tier) => void }) {
  const t = useTranslations("WomensHealth");
  const OPTIONS: { key: Tier; labelKey: "tierSimple" | "tierMedium" | "tierExpert"; activeClass: string }[] = [
    { key: "simple", labelKey: "tierSimple", activeClass: "text-emerald-700 dark:text-emerald-400 border-emerald-400 bg-emerald-500/5" },
    { key: "medium", labelKey: "tierMedium", activeClass: "text-violet-700 dark:text-violet-300 border-violet-400 bg-violet-500/5" },
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

// ── Mode picker (the rose+violet hero) ──────────────────────────────────────

function ModePickerCard({
  mode,
  title,
  desc,
  iconBg,
  iconColor,
  icon,
  onPick,
}: {
  mode: Mode;
  title: string;
  desc: string;
  iconBg: string;
  iconColor: string;
  icon: React.ReactNode;
  onPick: (m: Mode) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onPick(mode)}
      className="group text-left flex flex-col gap-4 p-6 rounded-3xl bg-white dark:bg-slate-900 border border-surface-border hover:border-violet-400/50 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-0.5 transition-all duration-300"
    >
      <div className={`w-12 h-12 rounded-2xl ${iconBg} ${iconColor} flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform`}>
        {icon}
      </div>
      <div>
        <h3 className="text-base font-extrabold text-ink leading-snug mb-2">{title}</h3>
        <p className="text-sm text-ink-secondary leading-relaxed">{desc}</p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-sm font-bold text-transparent bg-clip-text bg-gradient-to-r from-rose-600 to-violet-600 group-hover:gap-2.5 transition-all">
        <span>Choose this</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-violet-500 group-hover:translate-x-0.5 transition-transform">
          <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
        </svg>
      </span>
    </button>
  );
}

function ModePicker({ onPick }: { onPick: (m: Mode) => void }) {
  const t = useTranslations("WomensHealth");
  return (
    <section className="max-w-5xl mx-auto px-4 sm:px-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight mb-2">
          {t("modePickerTitle")}
        </h2>
        <p className="text-sm text-ink-secondary max-w-xl mx-auto">{t("modePickerSubtitle")}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <ModePickerCard
          mode="a"
          title={t("modeATitle")}
          desc={t("modeADesc")}
          iconBg="bg-rose-100 dark:bg-rose-900/30"
          iconColor="text-rose-600 dark:text-rose-300"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 2.25h6m-3 0v2.25M8.25 4.5h7.5l-1.5 3.75v9.75A2.25 2.25 0 0112 20.25a2.25 2.25 0 01-2.25-2.25V8.25l-1.5-3.75zM7 13.5h10" />
            </svg>
          }
          onPick={onPick}
        />
        <ModePickerCard
          mode="b"
          title={t("modeBTitle")}
          desc={t("modeBDesc")}
          iconBg="bg-violet-100 dark:bg-violet-900/30"
          iconColor="text-violet-600 dark:text-violet-300"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 21a9 9 0 100-18 9 9 0 000 18zm0-12v3l2 1.5" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9a9 9 0 0116.8 0M3.6 15a9 9 0 0016.8 0" />
            </svg>
          }
          onPick={onPick}
        />
        <ModePickerCard
          mode="c"
          title={t("modeCTitle")}
          desc={t("modeCDesc")}
          iconBg="bg-gradient-to-br from-rose-100 to-violet-100 dark:from-rose-900/30 dark:to-violet-900/30"
          iconColor="text-rose-700 dark:text-rose-300"
          icon={
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 3.75a4.5 4.5 0 00-4.5 4.5v3a4.5 4.5 0 003.75 4.434V19.5a.75.75 0 001.5 0v-3.816A4.501 4.501 0 0016.5 11.25v-3a4.5 4.5 0 00-4.5-4.5z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 20.25h4.5" />
            </svg>
          }
          onPick={onPick}
        />
      </div>
    </section>
  );
}

// ── Chip groups ──────────────────────────────────────────────────────────────

function ChipMulti<TId extends string>({
  options,
  selected,
  onToggle,
  accent = "violet",
}: {
  options: { id: TId; label: string }[];
  selected: Set<TId>;
  onToggle: (id: TId) => void;
  accent?: "violet" | "rose";
}) {
  const activeClass =
    accent === "rose"
      ? "bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-500/20"
      : "bg-violet-500 border-violet-500 text-white shadow-sm shadow-violet-500/20";
  const hoverClass =
    accent === "rose"
      ? "hover:border-rose-300 dark:hover:border-rose-700"
      : "hover:border-violet-300 dark:hover:border-violet-700";
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = selected.has(opt.id);
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onToggle(opt.id)}
            className={`min-h-[40px] px-4 py-2 rounded-full border text-sm font-medium transition-all duration-150 ${
              isActive
                ? activeClass
                : `bg-white dark:bg-slate-800 border-surface-border text-ink-secondary ${hoverClass} hover:text-ink`
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

function ChipSingle<TId extends string>({
  options,
  value,
  onChange,
  accent = "violet",
}: {
  options: { id: TId; label: string }[];
  value: TId | "";
  onChange: (id: TId | "") => void;
  accent?: "violet" | "rose";
}) {
  const activeClass =
    accent === "rose"
      ? "bg-rose-500 border-rose-500 text-white shadow-sm shadow-rose-500/20"
      : "bg-violet-500 border-violet-500 text-white shadow-sm shadow-violet-500/20";
  const hoverClass =
    accent === "rose"
      ? "hover:border-rose-300 dark:hover:border-rose-700"
      : "hover:border-violet-300 dark:hover:border-violet-700";
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((opt) => {
        const isActive = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(isActive ? "" : opt.id)}
            className={`min-h-[40px] px-4 py-2 rounded-full border text-sm font-medium transition-all duration-150 ${
              isActive
                ? activeClass
                : `bg-white dark:bg-slate-800 border-surface-border text-ink-secondary ${hoverClass} hover:text-ink`
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

// ── File uploader ────────────────────────────────────────────────────────────

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
  const t = useTranslations("WomensHealth");
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
      <div className="rounded-xl border border-violet-400/40 bg-violet-50/60 dark:bg-violet-950/20 px-4 py-3 flex items-center gap-3">
        <div className="w-9 h-9 rounded-lg bg-white dark:bg-slate-900 border border-surface-border flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-600">
            <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4z" clipRule="evenodd" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-ink truncate">{file.name}</p>
          <p className="text-[11px] text-ink-tertiary">{(file.size / 1024).toFixed(0)} KB</p>
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-xs font-semibold text-ink-secondary hover:text-red-600 transition-colors px-2 py-1 rounded-md hover:bg-red-50 dark:hover:bg-red-950/30"
        >
          {t("uploadRemove")}
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
      className={`flex items-center justify-center gap-3 px-4 py-5 rounded-xl border-2 border-dashed cursor-pointer transition-all ${
        dragging
          ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
          : "border-surface-border hover:border-violet-400/40 hover:bg-violet-50/30 dark:hover:bg-violet-950/10"
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
        <p className="text-sm font-semibold text-ink leading-tight">{t("uploadDrop")}</p>
        <p className="text-xs text-ink-tertiary mt-0.5">{t("uploadFormats")}</p>
      </div>
    </label>
  );
}

// ── Loading state ────────────────────────────────────────────────────────────

function LoadingState() {
  const t = useTranslations("WomensHealth");
  const [dot, setDot] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setDot((d) => (d + 1) % 4), 500);
    return () => clearInterval(id);
  }, []);
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4 text-center">
      <div className="relative mb-6">
        <div className="w-16 h-16 rounded-full border-2 border-violet-500/20 animate-ping absolute inset-0" style={{ animationDuration: "2s" }} />
        <div className="w-16 h-16 rounded-full border-2 border-violet-500/30 flex items-center justify-center relative bg-gradient-to-br from-rose-100 to-violet-100 dark:from-rose-900/20 dark:to-violet-900/20">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7 text-violet-600 dark:text-violet-300">
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

// ── Section components ──────────────────────────────────────────────────────

function ProseParagraphs({ text }: { text: string }) {
  if (!text) return null;
  return (
    <div className="space-y-3">
      {text.split("\n\n").filter(Boolean).map((para, i) => (
        <p key={i} className="text-sm text-ink-secondary leading-relaxed whitespace-pre-line">{para}</p>
      ))}
    </div>
  );
}

function SectionShell({
  title,
  desc,
  accent,
  icon,
  children,
}: {
  title: string;
  desc?: string;
  accent: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className={`bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm overflow-hidden border-l-4 ${accent}`}>
      <div className="px-5 py-3.5 border-b border-surface-border flex items-start gap-2.5">
        <span className="flex-shrink-0 mt-0.5">{icon}</span>
        <div className="min-w-0">
          <h3 className="text-sm font-bold text-ink uppercase tracking-wider">{title}</h3>
          {desc && <p className="mt-1 text-xs text-ink-tertiary leading-relaxed">{desc}</p>}
        </div>
      </div>
      <div className="px-5 py-4">{children}</div>
    </div>
  );
}

// "Often missed" — the differentiator section, distinct visual identity
function OftenMissedSection({ text }: { text: string }) {
  const t = useTranslations("WomensHealth");
  if (!text) return null;
  return (
    <div className="rounded-2xl border-2 border-violet-300 dark:border-violet-700/60 bg-gradient-to-br from-rose-50/40 via-violet-50/40 to-white dark:from-rose-950/20 dark:via-violet-950/20 dark:to-slate-900 shadow-lg shadow-violet-500/5 overflow-hidden">
      <div className="px-5 py-4 border-b border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-r from-rose-500/8 via-violet-500/8 to-transparent">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-500/20">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-white">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm-.375 0h.008v.015h-.008V9.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75zm-.375 0h.008v.015h-.008V9.75z" />
            </svg>
          </div>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40">
              {t("sectionOftenMissed")}
            </span>
            <p className="text-[11px] text-ink-tertiary mt-1.5 leading-snug">{t("sectionOftenMissedDesc")}</p>
          </div>
        </div>
      </div>
      <div className="px-5 py-4">
        <ProseParagraphs text={text} />
      </div>
    </div>
  );
}

function BulletSection({
  title,
  desc,
  items,
  accent,
  icon,
}: {
  title: string;
  desc?: string;
  items: string[];
  accent: string;
  icon: React.ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <SectionShell title={title} desc={desc} accent={accent} icon={icon}>
      <ul className="space-y-3">
        {items.map((item, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-ink-secondary leading-relaxed">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center mt-0.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-violet-600 dark:text-violet-400">
                <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
              </svg>
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </SectionShell>
  );
}

function RedFlagSection({ items, title, desc }: { items: string[]; title: string; desc: string }) {
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
          <h3 className="text-sm font-extrabold text-ink tracking-tight uppercase">{title}</h3>
          <p className="text-[11px] text-ink-tertiary mt-0.5">{desc}</p>
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

function RedFlagTriggeredBanner({ body, title }: { body: string; title: string }) {
  const t = useTranslations("WomensHealth");
  return (
    <div className="rounded-3xl border-2 border-red-500 dark:border-red-600 bg-red-50 dark:bg-red-950/40 shadow-xl shadow-red-500/15 overflow-hidden">
      <div className="px-5 py-4 bg-red-600 text-white flex items-center gap-3">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 flex-shrink-0">
          <path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
        <div className="min-w-0">
          <p className="text-[10px] font-bold uppercase tracking-widest opacity-80">{t("sectionPregnancyRedFlags")}</p>
          <h3 className="text-base font-extrabold leading-tight">{title}</h3>
        </div>
      </div>
      <div className="px-5 py-5 space-y-2">
        {body.split("\n\n").filter(Boolean).map((para, i) => (
          <p key={i} className="text-sm font-semibold text-red-900 dark:text-red-200 leading-relaxed whitespace-pre-line">{para}</p>
        ))}
        <p className="mt-3 text-sm font-bold text-red-700 dark:text-red-300">{t("redFlagBannerBody")}</p>
      </div>
    </div>
  );
}

// ── Mode A — Values table ────────────────────────────────────────────────────

const STATUS_STYLES: Record<LabValue["status"], { bg: string; bar: string; text: string; labelKey: "valueNormal" | "valueBorderline" | "valueOutOfRange" | "valueUnknownCycleDay" }> = {
  normal: {
    bg: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800",
    bar: "bg-emerald-400",
    text: "text-emerald-700 dark:text-emerald-300",
    labelKey: "valueNormal",
  },
  borderline: {
    bg: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-800",
    bar: "bg-amber-400",
    text: "text-amber-700 dark:text-amber-300",
    labelKey: "valueBorderline",
  },
  out_of_range: {
    bg: "bg-rose-50 dark:bg-rose-900/20 border-rose-100 dark:border-rose-800",
    bar: "bg-rose-500",
    text: "text-rose-700 dark:text-rose-300",
    labelKey: "valueOutOfRange",
  },
  needs_cycle_context: {
    bg: "bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-800",
    bar: "bg-violet-400",
    text: "text-violet-700 dark:text-violet-300",
    labelKey: "valueUnknownCycleDay",
  },
};

function ValuesSection({ values }: { values: LabValue[] }) {
  const t = useTranslations("WomensHealth");
  if (!values || values.length === 0) return null;
  return (
    <SectionShell
      title={t("sectionValues")}
      desc={t("sectionValuesDesc")}
      accent="border-l-rose-400"
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-rose-500">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
        </svg>
      }
    >
      <div className="space-y-2">
        {values.map((v, i) => {
          const style = STATUS_STYLES[v.status] ?? STATUS_STYLES.normal;
          return (
            <div key={i} className={`relative p-3 rounded-xl border ${style.bg} overflow-hidden`}>
              <div className={`absolute left-0 top-0 bottom-0 w-1 ${style.bar} rounded-l-xl`} />
              <div className="pl-2 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-ink">{v.marker}</p>
                  {v.note && (
                    <p className="text-xs text-ink-secondary mt-1 leading-relaxed">{v.note}</p>
                  )}
                </div>
                <div className="flex flex-col items-end flex-shrink-0">
                  <div className="flex items-baseline gap-1">
                    <span className="font-mono text-sm font-bold text-ink">{v.value}</span>
                    {v.unit && <span className="font-mono text-xs text-ink-tertiary">{v.unit}</span>}
                  </div>
                  {v.reference && (
                    <p className="font-mono text-[11px] text-ink-tertiary mt-0.5">ref {v.reference}</p>
                  )}
                  <span className={`mt-1 text-[10px] font-bold uppercase tracking-widest ${style.text}`}>
                    {t(style.labelKey)}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </SectionShell>
  );
}

function CopyableQuestionsSection({ items, title, desc }: { items: string[]; title: string; desc: string }) {
  const t = useTranslations("WomensHealth");
  const [copied, setCopied] = useState(false);
  if (items.length === 0) return null;
  const allText = items.map((q, i) => `${i + 1}. ${q}`).join("\n");
  const copy = () => {
    navigator.clipboard.writeText(allText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };
  return (
    <SectionShell
      title={title}
      desc={desc}
      accent="border-l-violet-400"
      icon={
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-500">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-8-3a1 1 0 00-.867.5 1 1 0 11-1.731-1A3 3 0 0113 8a3.001 3.001 0 01-2 2.83V11a1 1 0 11-2 0v-1a1 1 0 011-1 1 1 0 100-2zm0 8a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" />
        </svg>
      }
    >
      <ol className="space-y-3 mb-4">
        {items.map((q, i) => (
          <li key={i} className="flex items-start gap-3 text-sm text-ink-secondary leading-relaxed">
            <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 mt-0.5">
              {i + 1}
            </span>
            <span className="font-medium text-ink">{q}</span>
          </li>
        ))}
      </ol>
      <button
        onClick={copy}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-surface-border text-xs font-semibold text-ink-secondary hover:text-ink hover:border-violet-400/40 hover:bg-violet-50/50 dark:hover:bg-violet-950/20 transition-all"
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
            {t("copyAllQuestions")}
          </>
        )}
      </button>
    </SectionShell>
  );
}

// ── Mode A inputs ────────────────────────────────────────────────────────────

const REASON_OPTIONS = [
  { id: "ttc", apiLabel: "Trying to conceive", key: "reasonTtc" },
  { id: "irregular", apiLabel: "Irregular cycles", key: "reasonIrregular" },
  { id: "pcos", apiLabel: "Suspected PCOS", key: "reasonPcos" },
  { id: "perimenopause", apiLabel: "Suspected perimenopause", key: "reasonPerimenopause" },
  { id: "checkup", apiLabel: "General checkup", key: "reasonCheckup" },
  { id: "loss", apiLabel: "Recurrent pregnancy loss", key: "reasonLoss" },
  { id: "libido", apiLabel: "Low libido", key: "reasonLibido" },
  { id: "fatigue", apiLabel: "Fatigue or mood", key: "reasonFatigue" },
  { id: "other", apiLabel: "Other", key: "reasonOther" },
] as const;
type ReasonId = (typeof REASON_OPTIONS)[number]["id"];

const LIFESTAGE_OPTIONS = [
  { id: "regular", apiLabel: "Regular cycles", key: "lifeStageRegular" },
  { id: "irregular", apiLabel: "Irregular cycles", key: "lifeStageIrregular" },
  { id: "bc", apiLabel: "On hormonal birth control", key: "lifeStageBC" },
  { id: "postpartum", apiLabel: "Postpartum", key: "lifeStagePostpartum" },
  { id: "perimenopause", apiLabel: "Perimenopause", key: "lifeStagePerimenopause" },
  { id: "menopause", apiLabel: "Menopause", key: "lifeStageMenopause" },
  { id: "notsure", apiLabel: "Not sure", key: "lifeStageNotSure" },
] as const;
type LifeStageId = (typeof LIFESTAGE_OPTIONS)[number]["id"];

const CONCERN_OPTIONS = [
  { id: "irregular", apiLabel: "Irregular cycles", key: "concernIrregular" },
  { id: "painful", apiLabel: "Painful periods", key: "concernPainful" },
  { id: "heavy", apiLabel: "Heavy bleeding", key: "concernHeavy" },
  { id: "missed", apiLabel: "Missed periods", key: "concernMissed" },
  { id: "pms", apiLabel: "PMS or mood", key: "concernPmsMood" },
  { id: "hotflash", apiLabel: "Hot flashes or night sweats", key: "concernHotFlash" },
  { id: "sleep", apiLabel: "Sleep issues", key: "concernSleep" },
  { id: "vaginal", apiLabel: "Vaginal symptoms", key: "concernVaginal" },
  { id: "libido", apiLabel: "Low libido", key: "concernLibido" },
  { id: "hair", apiLabel: "Hair loss or growth", key: "concernHair" },
  { id: "weight", apiLabel: "Weight changes", key: "concernWeight" },
  { id: "fertility", apiLabel: "Fertility concerns", key: "concernFertility" },
  { id: "other", apiLabel: "Other", key: "concernOther" },
] as const;
type ConcernId = (typeof CONCERN_OPTIONS)[number]["id"];

// ── Main page ───────────────────────────────────────────────────────────────

export default function WomensHealthPage() {
  const { lang } = useLanguage();
  const t = useTranslations("WomensHealth");

  const [mode, setMode] = useState<Mode | null>(null);
  const [tier, setTier] = useState<Tier>("medium");
  const [stage, setStage] = useState<Stage>("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [mobileTab, setMobileTab] = useState<"results" | "ask">("results");

  // Mode A inputs
  const [aAge, setAAge] = useState("");
  const [aCycleDayMeta, setACycleDayMeta] = useState<CycleDayMeta>("");
  const [aCycleDayValue, setACycleDayValue] = useState("");
  const [aReasons, setAReasons] = useState<Set<ReasonId>>(new Set());
  const [aContext, setAContext] = useState("");
  const [aFile, setAFile] = useState<File | null>(null);
  const [aPasted, setAPasted] = useState("");
  const [aResult, setAResult] = useState<ModeAResult | null>(null);
  const [aRaw, setARaw] = useState("");
  const [aSummary, setASummary] = useState("");

  // Mode B inputs
  const [bAge, setBAge] = useState("");
  const [bLifeStage, setBLifeStage] = useState<LifeStageId | "">("");
  const [bConcerns, setBConcerns] = useState<Set<ConcernId>>(new Set());
  const [bSymptom, setBSymptom] = useState("");
  const [bCycleHistory, setBCycleHistory] = useState("");
  const [bContext, setBContext] = useState("");
  const [bResult, setBResult] = useState<ModeBResult | null>(null);
  const [bRaw, setBRaw] = useState("");
  const [bSummary, setBSummary] = useState("");

  // Mode C inputs
  const [cWeeks, setCWeeks] = useState("");
  const [cDueDate, setCDueDate] = useState("");
  const [cInputType, setCInputType] = useState<PregnancyInputType>("symptom");
  const [cFirstPregnancy, setCFirstPregnancy] = useState<"yes" | "no" | "">("");
  const [cContext, setCContext] = useState("");
  const [cSymptom, setCSymptom] = useState("");
  const [cPasted, setCPasted] = useState("");
  const [cFile, setCFile] = useState<File | null>(null);
  const [cResult, setCResult] = useState<ModeCResult | null>(null);
  const [cRaw, setCRaw] = useState("");
  const [cSummary, setCSummary] = useState("");

  useToolContext(
    aResult
      ? JSON.stringify({ mode: "cycle", ...aResult })
      : bResult
        ? JSON.stringify({ mode: "lifestage", ...bResult })
        : cResult
          ? JSON.stringify({ mode: "pregnancy", ...cResult })
          : null,
  );

  const resultRef = useRef<HTMLDivElement>(null);

  // Switching modes resets input and result per spec
  const pickMode = (m: Mode) => {
    setMode(m);
    setStage("idle");
    setErrorMsg("");
    resetAllInputs();
  };

  const switchModeFromResult = (m: Mode) => {
    setMode(m);
    setStage("idle");
    setErrorMsg("");
    resetAllInputs();
  };

  const resetAllInputs = () => {
    setAAge("");
    setACycleDayMeta("");
    setACycleDayValue("");
    setAReasons(new Set());
    setAContext("");
    setAFile(null);
    setAPasted("");
    setAResult(null);
    setARaw("");
    setASummary("");
    setBAge("");
    setBLifeStage("");
    setBConcerns(new Set());
    setBSymptom("");
    setBCycleHistory("");
    setBContext("");
    setBResult(null);
    setBRaw("");
    setBSummary("");
    setCWeeks("");
    setCDueDate("");
    setCInputType("symptom");
    setCFirstPregnancy("");
    setCContext("");
    setCSymptom("");
    setCPasted("");
    setCFile(null);
    setCResult(null);
    setCRaw("");
    setCSummary("");
  };

  const toggleSetItem = <T extends string>(set: Set<T>, id: T): Set<T> => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    return next;
  };

  // Mode A submit
  const aCanSubmit = useMemo(() => {
    if (!aAge.trim()) return false;
    if (!aFile && !aPasted.trim()) return false;
    return true;
  }, [aAge, aFile, aPasted]);

  const submitA = useCallback(async () => {
    if (!aCanSubmit) {
      setErrorMsg(!aAge.trim() ? t("ageRequired") : t("errorPasteOrUpload"));
      setStage("error");
      return;
    }
    setStage("loading");
    setErrorMsg("");
    setAResult(null);

    const reasonLabels = Array.from(aReasons)
      .map((id) => REASON_OPTIONS.find((r) => r.id === id)?.apiLabel)
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    const formData = new FormData();
    formData.append("age", aAge.trim());
    if (aCycleDayMeta === "value") {
      formData.append("cycleDay", aCycleDayValue.trim());
    } else if (aCycleDayMeta) {
      formData.append("cycleDayMeta", aCycleDayMeta);
    }
    formData.append("reasons", reasonLabels.join(", "));
    formData.append("context", aContext.trim());
    if (aFile) formData.append("file", aFile);
    if (aPasted.trim()) formData.append("pasted", aPasted.trim());
    formData.append("tier", tier);
    formData.append("language", lang);

    try {
      const res = await fetch("/api/womens-health?mode=a", {
        method: "POST",
        body: formData,
      });
      const json = (await res.json()) as { success?: boolean; data?: ModeAResult; raw?: string; error?: string };
      if (!res.ok || !json.success || !json.data) {
        setErrorMsg(json.error ?? t("errorGeneric"));
        setStage("error");
        return;
      }
      setAResult(json.data);
      setARaw(json.raw ?? "");
      const cycleDescriptor =
        aCycleDayMeta === "value"
          ? `cycle day ${aCycleDayValue}`
          : aCycleDayMeta === "unknown"
          ? "cycle day unknown"
          : aCycleDayMeta === "irregular"
          ? "not cycling regularly"
          : aCycleDayMeta === "menopause"
          ? "in menopause"
          : "no cycle-day info";
      const summary = [
        `Age: ${aAge}`,
        cycleDescriptor,
        reasonLabels.length ? `Reasons: ${reasonLabels.join(", ")}` : null,
        aContext.trim() ? `Context: ${aContext.trim()}` : null,
        aFile ? `Uploaded: ${aFile.name}` : null,
        aPasted.trim() ? `Pasted values:\n${aPasted.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      setASummary(summary);
      setStage("result");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setErrorMsg(t("errorGeneric"));
      setStage("error");
    }
  }, [aAge, aCycleDayMeta, aCycleDayValue, aReasons, aContext, aFile, aPasted, tier, lang, t, aCanSubmit]);

  // Mode B submit
  const bCanSubmit = useMemo(() => bAge.trim() && bSymptom.trim().length > 0, [bAge, bSymptom]);

  const submitB = useCallback(async () => {
    if (!bCanSubmit) {
      setErrorMsg(!bAge.trim() ? t("ageRequired") : t("errorSymptomRequired"));
      setStage("error");
      return;
    }
    setStage("loading");
    setErrorMsg("");
    setBResult(null);

    const lifeStageLabel = LIFESTAGE_OPTIONS.find((l) => l.id === bLifeStage)?.apiLabel ?? "";
    const concernLabels = Array.from(bConcerns)
      .map((id) => CONCERN_OPTIONS.find((c) => c.id === id)?.apiLabel)
      .filter((s): s is NonNullable<typeof s> => Boolean(s));

    try {
      const res = await fetch("/api/womens-health?mode=b", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          age: bAge,
          lifeStage: lifeStageLabel,
          concerns: concernLabels,
          symptomDescription: bSymptom,
          cycleHistory: bCycleHistory,
          context: bContext,
          tier,
          language: lang,
        }),
      });
      const json = (await res.json()) as { success?: boolean; text?: string; error?: string };
      if (!res.ok || !json.text) {
        setErrorMsg(json.error ?? t("errorGeneric"));
        setStage("error");
        return;
      }
      setBResult(parseModeB(json.text));
      setBRaw(json.text);
      const summary = [
        `Age: ${bAge}`,
        lifeStageLabel ? `Life stage: ${lifeStageLabel}` : null,
        concernLabels.length ? `Concerns: ${concernLabels.join(", ")}` : null,
        `Symptoms: ${bSymptom}`,
        bCycleHistory.trim() ? `Cycle history: ${bCycleHistory.trim()}` : null,
        bContext.trim() ? `Context: ${bContext.trim()}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      setBSummary(summary);
      setStage("result");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setErrorMsg(t("errorGeneric"));
      setStage("error");
    }
  }, [bAge, bLifeStage, bConcerns, bSymptom, bCycleHistory, bContext, tier, lang, t, bCanSubmit]);

  // Mode C submit
  const cCanSubmit = useMemo(() => {
    if (!cWeeks.trim() && !cDueDate.trim()) return false;
    if (cInputType === "symptom" && !cSymptom.trim()) return false;
    if ((cInputType === "labs" || cInputType === "screening") && !cPasted.trim() && !cFile) return false;
    return true;
  }, [cWeeks, cDueDate, cInputType, cSymptom, cPasted, cFile]);

  const submitC = useCallback(async () => {
    if (!cCanSubmit) {
      if (!cWeeks.trim() && !cDueDate.trim()) setErrorMsg(t("errorWeeksRequired"));
      else if (cInputType === "symptom" && !cSymptom.trim()) setErrorMsg(t("errorSymptomRequired"));
      else setErrorMsg(t("errorPasteOrUpload"));
      setStage("error");
      return;
    }
    setStage("loading");
    setErrorMsg("");
    setCResult(null);

    const useForm = cInputType !== "symptom" && cFile !== null;
    let res: Response;
    try {
      if (useForm) {
        const formData = new FormData();
        formData.append("weeks", cWeeks);
        formData.append("dueDate", cDueDate);
        formData.append("inputType", cInputType);
        formData.append("firstPregnancy", cFirstPregnancy);
        formData.append("context", cContext);
        formData.append("pasted", cPasted);
        formData.append("tier", tier);
        formData.append("language", lang);
        if (cFile) formData.append("file", cFile);
        res = await fetch("/api/womens-health?mode=c", { method: "POST", body: formData });
      } else {
        res = await fetch("/api/womens-health?mode=c", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            weeks: cWeeks,
            dueDate: cDueDate,
            inputType: cInputType,
            firstPregnancy: cFirstPregnancy,
            context: cContext,
            symptomText: cSymptom,
            pasted: cPasted,
            tier,
            language: lang,
          }),
        });
      }
      const json = (await res.json()) as { success?: boolean; text?: string; error?: string };
      if (!res.ok || !json.text) {
        setErrorMsg(json.error ?? t("errorGeneric"));
        setStage("error");
        return;
      }
      setCResult(parseModeC(json.text));
      setCRaw(json.text);
      const summary = [
        cWeeks ? `Weeks pregnant: ${cWeeks}` : null,
        cDueDate ? `Due date: ${cDueDate}` : null,
        `Input type: ${cInputType}`,
        cFirstPregnancy ? `First pregnancy: ${cFirstPregnancy}` : null,
        cContext.trim() ? `Context: ${cContext.trim()}` : null,
        cSymptom.trim() ? `Symptom: ${cSymptom.trim()}` : null,
        cPasted.trim() ? `Pasted values:\n${cPasted.trim()}` : null,
        cFile ? `Uploaded: ${cFile.name}` : null,
      ]
        .filter(Boolean)
        .join("\n");
      setCSummary(summary);
      setStage("result");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setErrorMsg(t("errorGeneric"));
      setStage("error");
    }
  }, [cWeeks, cDueDate, cInputType, cFirstPregnancy, cContext, cSymptom, cPasted, cFile, tier, lang, t, cCanSubmit]);

  const reset = () => {
    setStage("idle");
    setErrorMsg("");
    setAResult(null);
    setBResult(null);
    setCResult(null);
  };

  const showInputCard = stage === "idle" || stage === "error";
  const isLoading = stage === "loading";
  const hasResult = stage === "result";

  return (
    <div className="min-h-screen bg-gradient-to-b from-rose-50/30 via-violet-50/20 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 pt-20 pb-24">
      {/* Hero */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6 pt-10 pb-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5 bg-gradient-to-r from-rose-100 to-violet-100 dark:from-rose-900/30 dark:to-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200/40 dark:border-violet-800/40">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
            <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
          </svg>
          {t("badge")}
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight mb-3 leading-tight">
          {t("title")}
        </h1>
        <p className="text-base sm:text-lg text-ink-secondary leading-relaxed max-w-xl mx-auto">
          {t("subtitle")}
        </p>
      </section>

      {/* Mode picker — when no mode chosen */}
      {mode === null && <ModePicker onPick={pickMode} />}

      {/* Mode-specific input form */}
      {mode !== null && showInputCard && (
        <>
          {/* Tier toggle + mode switch */}
          <section className="max-w-2xl mx-auto px-4 sm:px-6 mb-4">
            <div className="flex flex-col gap-3">
              <button
                onClick={() => {
                  setMode(null);
                  setStage("idle");
                  setErrorMsg("");
                  resetAllInputs();
                }}
                className="self-start inline-flex items-center gap-1.5 text-xs font-semibold text-violet-600 hover:text-violet-700 dark:text-violet-300 dark:hover:text-violet-200 transition-colors"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M9.707 14.707a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414l4-4a1 1 0 011.414 1.414L7.414 9H15a1 1 0 110 2H7.414l2.293 2.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                {t("changeMode")}
              </button>
              <TierToggle tier={tier} onChange={setTier} />
            </div>
          </section>

          <section className="max-w-2xl mx-auto px-4 sm:px-6">
            <div className="bg-white dark:bg-slate-900 rounded-3xl border border-surface-border shadow-sm p-5 sm:p-7 space-y-6">
              {stage === "error" && errorMsg && (
                <div className="flex items-start gap-3 p-4 rounded-xl bg-red-50 dark:bg-red-950/30 border border-red-200 dark:border-red-900 text-red-700 dark:text-red-300 text-sm">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 flex-shrink-0 mt-0.5">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                  </svg>
                  <span>{errorMsg}</span>
                </div>
              )}

              {mode === "a" && (
                <ModeAForm
                  age={aAge}
                  setAge={setAAge}
                  cycleDayMeta={aCycleDayMeta}
                  setCycleDayMeta={setACycleDayMeta}
                  cycleDayValue={aCycleDayValue}
                  setCycleDayValue={setACycleDayValue}
                  reasons={aReasons}
                  toggleReason={(id) => setAReasons((s) => toggleSetItem(s, id))}
                  context={aContext}
                  setContext={setAContext}
                  file={aFile}
                  setFile={setAFile}
                  pasted={aPasted}
                  setPasted={setAPasted}
                  onError={(m) => {
                    setErrorMsg(m);
                    setStage("error");
                  }}
                  onSubmit={submitA}
                  canSubmit={!!aCanSubmit}
                />
              )}

              {mode === "b" && (
                <ModeBForm
                  age={bAge}
                  setAge={setBAge}
                  lifeStage={bLifeStage}
                  setLifeStage={setBLifeStage}
                  concerns={bConcerns}
                  toggleConcern={(id) => setBConcerns((s) => toggleSetItem(s, id))}
                  symptom={bSymptom}
                  setSymptom={setBSymptom}
                  cycleHistory={bCycleHistory}
                  setCycleHistory={setBCycleHistory}
                  context={bContext}
                  setContext={setBContext}
                  onSubmit={submitB}
                  canSubmit={!!bCanSubmit}
                />
              )}

              {mode === "c" && (
                <ModeCForm
                  weeks={cWeeks}
                  setWeeks={setCWeeks}
                  dueDate={cDueDate}
                  setDueDate={setCDueDate}
                  inputType={cInputType}
                  setInputType={setCInputType}
                  firstPregnancy={cFirstPregnancy}
                  setFirstPregnancy={setCFirstPregnancy}
                  context={cContext}
                  setContext={setCContext}
                  symptom={cSymptom}
                  setSymptom={setCSymptom}
                  pasted={cPasted}
                  setPasted={setCPasted}
                  file={cFile}
                  setFile={setCFile}
                  onError={(m) => {
                    setErrorMsg(m);
                    setStage("error");
                  }}
                  onSubmit={submitC}
                  canSubmit={!!cCanSubmit}
                />
              )}
            </div>
          </section>
        </>
      )}

      {/* Loading */}
      {isLoading && (
        <section className="max-w-2xl mx-auto px-4 sm:px-6 mt-6">
          <div className="bg-white dark:bg-slate-900 rounded-3xl border border-surface-border shadow-sm">
            <LoadingState />
          </div>
        </section>
      )}

      {/* Result */}
      {hasResult && mode !== null && (
        <div ref={resultRef} className="max-w-5xl mx-auto px-4 sm:px-6 mt-6 scroll-mt-24">
          {/* Mobile tab switcher */}
          <div className="flex gap-1 mb-5 xl:hidden bg-slate-100 dark:bg-slate-800 rounded-xl p-1">
            {[
              { key: "results" as const, label: t("mobileTabResults") },
              { key: "ask" as const, label: t("mobileTabAsk") },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setMobileTab(tab.key)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${
                  mobileTab === tab.key
                    ? "bg-white dark:bg-slate-900 text-ink shadow-sm"
                    : "text-ink-tertiary hover:text-ink-secondary"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6 xl:items-start space-y-5 xl:space-y-0">
            <div className={`space-y-5 min-w-0 ${mobileTab === "ask" ? "hidden xl:block" : ""}`}>
              {mode === "a" && aResult && <ModeAResultBlock result={aResult} />}
              {mode === "b" && bResult && <ModeBResultBlock result={bResult} />}
              {mode === "c" && cResult && <ModeCResultBlock result={cResult} />}

              {/* Action bar */}
              <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                <button
                  type="button"
                  onClick={reset}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-surface-border hover:border-violet-300 dark:hover:border-violet-700 text-ink-secondary hover:text-ink text-sm font-semibold transition-all"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M4 2a1 1 0 011 1v2.101a7.002 7.002 0 0111.601 2.566 1 1 0 11-1.885.666A5.002 5.002 0 005.999 7H9a1 1 0 010 2H4a1 1 0 01-1-1V3a1 1 0 011-1z" clipRule="evenodd" />
                  </svg>
                  {t("startOver")}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMode(null);
                    setStage("idle");
                    resetAllInputs();
                  }}
                  className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-surface-border hover:border-violet-300 dark:hover:border-violet-700 text-ink-secondary hover:text-ink text-sm font-semibold transition-all"
                >
                  {t("switchMode")}
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
            </div>

            {/* Chat sidebar */}
            <aside className={`xl:sticky xl:top-24 min-w-0 scroll-mt-6 ${mobileTab !== "ask" ? "hidden xl:block" : ""}`}>
              <WomensHealthChatPanel
                mode={mode}
                inputSummary={mode === "a" ? aSummary : mode === "b" ? bSummary : cSummary}
                analysisSnapshot={mode === "a" ? aRaw : mode === "b" ? bRaw : cRaw}
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

// ── Forms (extracted for readability) ────────────────────────────────────────

function ModeAForm({
  age,
  setAge,
  cycleDayMeta,
  setCycleDayMeta,
  cycleDayValue,
  setCycleDayValue,
  reasons,
  toggleReason,
  context,
  setContext,
  file,
  setFile,
  pasted,
  setPasted,
  onError,
  onSubmit,
  canSubmit,
}: {
  age: string;
  setAge: (v: string) => void;
  cycleDayMeta: CycleDayMeta;
  setCycleDayMeta: (v: CycleDayMeta) => void;
  cycleDayValue: string;
  setCycleDayValue: (v: string) => void;
  reasons: Set<ReasonId>;
  toggleReason: (id: ReasonId) => void;
  context: string;
  setContext: (v: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  pasted: string;
  setPasted: (v: string) => void;
  onError: (msg: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  const t = useTranslations("WomensHealth");

  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-ink mb-2">
          {t("ageLabel")} <span className="text-rose-500">*</span>
        </label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder={t("agePlaceholder")}
          className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-ink mb-2">
          {t("cycleDayLabel")} <span className="text-rose-500">*</span>
        </label>
        <p className="text-xs text-ink-tertiary mb-3">{t("cycleDayHint")}</p>
        <div className="space-y-2">
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setCycleDayMeta(cycleDayMeta === "value" ? "" : "value")}
              className={`min-h-[40px] px-4 py-2 rounded-full border text-sm font-medium transition-all duration-150 ${
                cycleDayMeta === "value"
                  ? "bg-violet-500 border-violet-500 text-white shadow-sm shadow-violet-500/20"
                  : "bg-white dark:bg-slate-800 border-surface-border text-ink-secondary hover:border-violet-300 dark:hover:border-violet-700 hover:text-ink"
              }`}
            >
              Day:
            </button>
            <input
              type="number"
              inputMode="numeric"
              min={1}
              max={45}
              value={cycleDayValue}
              onChange={(e) => {
                setCycleDayValue(e.target.value);
                setCycleDayMeta("value");
              }}
              placeholder={t("cycleDayPlaceholder")}
              className="flex-1 min-w-[150px] px-4 py-2 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
            />
          </div>
          <ChipSingle<CycleDayMeta>
            options={[
              { id: "unknown", label: t("cycleDayUnknown") },
              { id: "irregular", label: t("cycleDayIrregular") },
              { id: "menopause", label: t("cycleDayMenopause") },
            ]}
            value={cycleDayMeta === "value" ? "" : cycleDayMeta}
            onChange={(v) => {
              setCycleDayMeta(v);
              if (v) setCycleDayValue("");
            }}
            accent="rose"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">{t("reasonLabel")}</label>
        <p className="text-xs text-ink-tertiary mb-3">{t("reasonHint")}</p>
        <ChipMulti<ReasonId>
          options={REASON_OPTIONS.map((r) => ({ id: r.id, label: t(r.key as Parameters<typeof t>[0]) }))}
          selected={reasons}
          onToggle={toggleReason}
          accent="violet"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-ink mb-2">{t("uploadLabel")}</label>
        <p className="text-xs text-ink-tertiary mb-3">{t("uploadHint")}</p>
        <FileUploader file={file} onChange={setFile} onError={onError} />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">{t("pasteLabel")}</label>
        <textarea
          value={pasted}
          onChange={(e) => setPasted(e.target.value)}
          rows={4}
          placeholder={t("pastePlaceholder")}
          className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          {t("contextLabel")} <span className="text-ink-tertiary text-xs font-normal">— optional</span>
        </label>
        <p className="text-xs text-ink-tertiary mb-3">{t("contextHint")}</p>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          placeholder={t("contextPlaceholder")}
          className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
        />
      </div>

      <SubmitButton label={t("submitMode")} onClick={onSubmit} disabled={!canSubmit} />
    </div>
  );
}

function ModeBForm({
  age,
  setAge,
  lifeStage,
  setLifeStage,
  concerns,
  toggleConcern,
  symptom,
  setSymptom,
  cycleHistory,
  setCycleHistory,
  context,
  setContext,
  onSubmit,
  canSubmit,
}: {
  age: string;
  setAge: (v: string) => void;
  lifeStage: LifeStageId | "";
  setLifeStage: (v: LifeStageId | "") => void;
  concerns: Set<ConcernId>;
  toggleConcern: (id: ConcernId) => void;
  symptom: string;
  setSymptom: (v: string) => void;
  cycleHistory: string;
  setCycleHistory: (v: string) => void;
  context: string;
  setContext: (v: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  const t = useTranslations("WomensHealth");
  return (
    <div className="space-y-6">
      <div>
        <label className="block text-sm font-bold text-ink mb-2">
          {t("ageLabel")} <span className="text-rose-500">*</span>
        </label>
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={120}
          value={age}
          onChange={(e) => setAge(e.target.value)}
          placeholder={t("agePlaceholder")}
          className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">{t("lifeStageLabel")}</label>
        <p className="text-xs text-ink-tertiary mb-3">{t("lifeStageHint")}</p>
        <ChipSingle<LifeStageId>
          options={LIFESTAGE_OPTIONS.map((l) => ({ id: l.id, label: t(l.key as Parameters<typeof t>[0]) }))}
          value={lifeStage}
          onChange={setLifeStage}
          accent="violet"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">{t("concernLabel")}</label>
        <p className="text-xs text-ink-tertiary mb-3">{t("concernHint")}</p>
        <ChipMulti<ConcernId>
          options={CONCERN_OPTIONS.map((c) => ({ id: c.id, label: t(c.key as Parameters<typeof t>[0]) }))}
          selected={concerns}
          onToggle={toggleConcern}
          accent="rose"
        />
      </div>

      <div>
        <label className="block text-sm font-bold text-ink mb-2">
          {t("symptomLabel")} <span className="text-rose-500">*</span>
        </label>
        <p className="text-xs text-ink-tertiary mb-3">{t("symptomHint")}</p>
        <textarea
          value={symptom}
          onChange={(e) => setSymptom(e.target.value)}
          rows={5}
          placeholder={t("symptomPlaceholder")}
          className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          {t("cycleHistoryLabel")} <span className="text-ink-tertiary text-xs font-normal">— {t("cycleHistoryOptional")}</span>
        </label>
        <p className="text-xs text-ink-tertiary mb-3">{t("cycleHistoryHint")}</p>
        <textarea
          value={cycleHistory}
          onChange={(e) => setCycleHistory(e.target.value)}
          rows={3}
          placeholder={t("cycleHistoryPlaceholder")}
          className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
        />
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          {t("contextLabel")} <span className="text-ink-tertiary text-xs font-normal">— optional</span>
        </label>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          placeholder={t("contextPlaceholder")}
          className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
        />
      </div>

      <SubmitButton label={t("submitSymptom")} onClick={onSubmit} disabled={!canSubmit} />
    </div>
  );
}

function ModeCForm({
  weeks,
  setWeeks,
  dueDate,
  setDueDate,
  inputType,
  setInputType,
  firstPregnancy,
  setFirstPregnancy,
  context,
  setContext,
  symptom,
  setSymptom,
  pasted,
  setPasted,
  file,
  setFile,
  onError,
  onSubmit,
  canSubmit,
}: {
  weeks: string;
  setWeeks: (v: string) => void;
  dueDate: string;
  setDueDate: (v: string) => void;
  inputType: PregnancyInputType;
  setInputType: (v: PregnancyInputType) => void;
  firstPregnancy: "yes" | "no" | "";
  setFirstPregnancy: (v: "yes" | "no" | "") => void;
  context: string;
  setContext: (v: string) => void;
  symptom: string;
  setSymptom: (v: string) => void;
  pasted: string;
  setPasted: (v: string) => void;
  file: File | null;
  setFile: (f: File | null) => void;
  onError: (m: string) => void;
  onSubmit: () => void;
  canSubmit: boolean;
}) {
  const t = useTranslations("WomensHealth");
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-bold text-ink mb-2">
            {t("weeksLabel")}
          </label>
          <input
            type="number"
            inputMode="numeric"
            min={1}
            max={44}
            value={weeks}
            onChange={(e) => setWeeks(e.target.value)}
            placeholder={t("weeksPlaceholder")}
            className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink placeholder-ink-tertiary focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
          />
        </div>
        <div>
          <label className="block text-sm font-semibold text-ink mb-2">{t("dueDateLabel")}</label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
          />
        </div>
      </div>

      <div>
        <label className="block text-sm font-bold text-ink mb-2">{t("inputTypeLabel")}</label>
        <div className="grid grid-cols-1 gap-2">
          {[
            { id: "labs" as const, title: t("inputTypeLabs"), desc: t("inputTypeLabsDesc") },
            { id: "symptom" as const, title: t("inputTypeSymptom"), desc: t("inputTypeSymptomDesc") },
            { id: "screening" as const, title: t("inputTypeScreening"), desc: t("inputTypeScreeningDesc") },
          ].map((opt) => {
            const active = inputType === opt.id;
            return (
              <button
                key={opt.id}
                type="button"
                onClick={() => setInputType(opt.id)}
                className={`text-left p-4 rounded-xl border-2 transition-all ${
                  active
                    ? "border-violet-500 bg-violet-50/60 dark:bg-violet-950/30"
                    : "border-surface-border bg-white dark:bg-slate-800 hover:border-violet-300 dark:hover:border-violet-700"
                }`}
              >
                <p className={`text-sm font-bold ${active ? "text-violet-700 dark:text-violet-300" : "text-ink"}`}>{opt.title}</p>
                <p className="text-xs text-ink-tertiary mt-0.5 leading-relaxed">{opt.desc}</p>
              </button>
            );
          })}
        </div>
      </div>

      {/* Conditional file upload + paste */}
      {(inputType === "labs" || inputType === "screening") && (
        <>
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">{t("uploadLabel")}</label>
            <FileUploader file={file} onChange={setFile} onError={onError} />
          </div>
          <div>
            <label className="block text-sm font-semibold text-ink mb-2">{t("pasteLabel")}</label>
            <textarea
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              rows={4}
              placeholder={t("pastePlaceholder")}
              className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
            />
          </div>
        </>
      )}

      {inputType === "symptom" && (
        <div>
          <label className="block text-sm font-bold text-ink mb-2">
            {t("pregnancySymptomLabel")} <span className="text-rose-500">*</span>
          </label>
          <textarea
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            rows={5}
            placeholder={t("pregnancySymptomPlaceholder")}
            className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-bold text-ink mb-2">
          {t("firstPregnancyLabel")} <span className="text-rose-500">*</span>
        </label>
        <div className="flex gap-2">
          {(["yes", "no"] as const).map((v) => {
            const isActive = firstPregnancy === v;
            return (
              <button
                key={v}
                type="button"
                onClick={() => setFirstPregnancy(isActive ? "" : v)}
                className={`flex-1 min-h-[44px] px-4 py-2 rounded-xl border text-sm font-semibold transition-all ${
                  isActive
                    ? "bg-violet-500 border-violet-500 text-white"
                    : "bg-white dark:bg-slate-800 border-surface-border text-ink-secondary hover:border-violet-300 dark:hover:border-violet-700 hover:text-ink"
                }`}
              >
                {v === "yes" ? t("firstPregnancyYes") : t("firstPregnancyNo")}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label className="block text-sm font-semibold text-ink mb-2">
          {t("pregnancyContextLabel")} <span className="text-ink-tertiary text-xs font-normal">— optional</span>
        </label>
        <p className="text-xs text-ink-tertiary mb-3">{t("pregnancyContextHint")}</p>
        <textarea
          value={context}
          onChange={(e) => setContext(e.target.value)}
          rows={3}
          placeholder={t("pregnancyContextPlaceholder")}
          className="w-full px-4 py-3 rounded-xl border border-surface-border bg-surface-raised dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400/40 focus:border-violet-400 transition"
        />
      </div>

      <SubmitButton label={t("submitPregnancy")} onClick={onSubmit} disabled={!canSubmit} />
    </div>
  );
}

function SubmitButton({
  label,
  onClick,
  disabled,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full min-h-[52px] py-4 bg-gradient-to-br from-rose-600 to-violet-600 hover:from-rose-700 hover:to-violet-700 disabled:from-slate-200 disabled:to-slate-200 dark:disabled:from-slate-800 dark:disabled:to-slate-800 disabled:text-slate-400 text-white font-bold rounded-2xl text-base transition-all duration-200 shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30 disabled:shadow-none flex items-center justify-center gap-2"
    >
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
        <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
      </svg>
      {label}
    </button>
  );
}

// ── Result blocks ────────────────────────────────────────────────────────────

function ModeAResultBlock({ result }: { result: ModeAResult }) {
  const t = useTranslations("WomensHealth");
  return (
    <>
      {result.summary_headline && (
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800/60 bg-gradient-to-r from-rose-50/60 to-violet-50/60 dark:from-rose-950/20 dark:to-violet-950/20 p-5">
          <p className="text-base font-bold text-ink leading-snug">{result.summary_headline}</p>
        </div>
      )}
      {result.needs_cycle_day_banner && (
        <div className="rounded-2xl border border-amber-300 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/20 p-4 flex items-start gap-3">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-amber-800 dark:text-amber-200 leading-relaxed">{t("noCycleDayBanner")}</p>
        </div>
      )}
      {result.values && result.values.length > 0 && <ValuesSection values={result.values} />}
      {result.patterns && (
        <SectionShell
          title={t("sectionPattern")}
          desc={t("sectionPatternDesc")}
          accent="border-l-violet-400"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-500">
              <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
            </svg>
          }
        >
          <ProseParagraphs text={result.patterns} />
        </SectionShell>
      )}
      {result.often_missed && <OftenMissedSection text={result.often_missed} />}
      {result.questions && result.questions.length > 0 && (
        <CopyableQuestionsSection
          items={result.questions}
          title={t("sectionQuestions")}
          desc={t("sectionQuestionsDesc")}
        />
      )}
      {result.next_steps && (
        <SectionShell
          title={t("sectionNextSteps")}
          accent="border-l-emerald-400"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500">
              <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          }
        >
          <ProseParagraphs text={result.next_steps} />
        </SectionShell>
      )}
    </>
  );
}

function ModeBResultBlock({ result }: { result: ModeBResult }) {
  const t = useTranslations("WomensHealth");
  return (
    <>
      {result.whatsLikely && (
        <SectionShell
          title={t("sectionLikely")}
          desc={t("sectionLikelyDesc")}
          accent="border-l-violet-400"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-500">
              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.922-.755 1.688-1.54 1.118l-3.37-2.447a1 1 0 00-1.175 0l-3.37 2.447c-.784.57-1.838-.196-1.539-1.118L5.94 12.95a1 1 0 00-.364-1.118L2.205 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
            </svg>
          }
        >
          <ProseParagraphs text={result.whatsLikely} />
        </SectionShell>
      )}
      {result.workup.length > 0 && (
        <BulletSection
          title={t("sectionWorkup")}
          desc={t("sectionWorkupDesc")}
          items={result.workup}
          accent="border-l-sky-400"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-sky-500">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
            </svg>
          }
        />
      )}
      {result.oftenMissed && <OftenMissedSection text={result.oftenMissed} />}
      {result.whatYouCanDo.length > 0 && (
        <BulletSection
          title={t("sectionDoNow")}
          desc={t("sectionDoNowDesc")}
          items={result.whatYouCanDo}
          accent="border-l-emerald-400"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          }
        />
      )}
      {result.redFlags.length > 0 && (
        <RedFlagSection items={result.redFlags} title={t("sectionRedFlags")} desc={t("sectionRedFlagsDesc")} />
      )}
    </>
  );
}

function ModeCResultBlock({ result }: { result: ModeCResult }) {
  const t = useTranslations("WomensHealth");
  return (
    <>
      {result.redFlagsTriggered && (
        <RedFlagTriggeredBanner body={result.redFlagsBody} title={t("redFlagBannerTitle")} />
      )}
      {result.testExplainer && (
        <SectionShell
          title={t("sectionTestExplainer")}
          desc={t("sectionTestExplainerDesc")}
          accent="border-l-violet-400"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-violet-500">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
            </svg>
          }
        >
          <ProseParagraphs text={result.testExplainer} />
        </SectionShell>
      )}
      {result.symptomContext && (
        <SectionShell
          title={t("sectionSymptomContext")}
          desc={t("sectionSymptomContextDesc")}
          accent="border-l-rose-400"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-rose-500">
              <path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" />
            </svg>
          }
        >
          <ProseParagraphs text={result.symptomContext} />
        </SectionShell>
      )}
      {!result.redFlagsTriggered && result.redFlagsList.length > 0 && (
        <RedFlagSection items={result.redFlagsList} title={t("sectionPregnancyRedFlags")} desc={t("sectionPregnancyRedFlagsDesc")} />
      )}
      {result.whatToKnow.length > 0 && (
        <BulletSection
          title={t("sectionPregnancyKnow")}
          desc={t("sectionPregnancyKnowDesc")}
          items={result.whatToKnow}
          accent="border-l-emerald-400"
          icon={
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-emerald-500">
              <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
            </svg>
          }
        />
      )}
      {result.questions.length > 0 && (
        <CopyableQuestionsSection
          items={result.questions}
          title={t("sectionPregnancyQuestions")}
          desc={t("sectionQuestionsDesc")}
        />
      )}
    </>
  );
}
