"use client";

import { useState, useRef, useEffect } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { useLanguage } from "@/contexts/LanguageContext";
import { useTranslations } from "next-intl";
import { useToolContext } from "@/components/ToolChatProvider";

const SymptomChatPanel = dynamic(() => import("@/components/SymptomChatPanel"), {
  ssr: false,
});

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
  homeCare: string[];
  stopReadingIf: string | null;
}

// ── Parsers ────────────────────────────────────────────────────────────────

const SECTION_KEYS = [
  "MOST_LIKELY",
  "LESS_COMMON",
  "SERIOUS_BUT_RARE",
  "WHAT_WOULD_CHANGE_THIS",
  "WHAT_TO_DO",
  "HOME_CARE",
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
    homeCare: parseBullets(sections["HOME_CARE"] ?? ""),
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
    labelKey: "noUrgency" as const,
    labelColor: "text-emerald-700 dark:text-emerald-400",
    dot: "bg-emerald-500",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/40",
    border: "border-amber-200 dark:border-amber-800",
    icon: "text-amber-600",
    labelKey: "seeDoctorSoon" as const,
    labelColor: "text-amber-700 dark:text-amber-400",
    dot: "bg-amber-500",
  },
  red: {
    bg: "bg-red-50 dark:bg-red-950/40",
    border: "border-red-200 dark:border-red-800",
    icon: "text-red-600",
    labelKey: "seekCareToday" as const,
    labelColor: "text-red-700 dark:text-red-400",
    dot: "bg-red-500",
  },
};

// ── Image compression (client-side) ────────────────────────────────────────

const MAX_IMAGE_DIM = 1568;
const JPEG_QUALITY = 0.85;
const MAX_FILE_BYTES = 5 * 1024 * 1024;
const ACCEPTED_TYPES = ["image/jpeg", "image/png", "image/webp"];

interface CompressedImage {
  data: string;        // base64, no data URL prefix
  mediaType: "image/jpeg";
  previewUrl: string;  // full data URL for <img>
  filename: string;
}

async function compressImage(file: File): Promise<CompressedImage> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(new Error("read-failed"));
    reader.readAsDataURL(file);
  });

  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const i = new Image();
    i.onload = () => resolve(i);
    i.onerror = () => reject(new Error("decode-failed"));
    i.src = dataUrl;
  });

  let { width, height } = img;
  if (width > MAX_IMAGE_DIM || height > MAX_IMAGE_DIM) {
    if (width >= height) {
      height = Math.round((height * MAX_IMAGE_DIM) / width);
      width = MAX_IMAGE_DIM;
    } else {
      width = Math.round((width * MAX_IMAGE_DIM) / height);
      height = MAX_IMAGE_DIM;
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas-unsupported");
  ctx.drawImage(img, 0, 0, width, height);

  const compressed = canvas.toDataURL("image/jpeg", JPEG_QUALITY);
  return {
    data: compressed.split(",")[1] ?? "",
    mediaType: "image/jpeg",
    previewUrl: compressed,
    filename: file.name,
  };
}

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
  const t = useTranslations("Symptom");

  const [symptom, setSymptom] = useState("");
  const [age, setAge] = useState("");
  const [sex, setSex] = useState("");
  const [duration, setDuration] = useState("");
  const [history, setHistory] = useState("");
  const [contextOpen, setContextOpen] = useState(false);

  const [stage, setStage] = useState<Stage>("idle");
  const [result, setResult] = useState<ParsedResult | null>(null);
  useToolContext(result ? JSON.stringify(result) : null);
  const [rawAnalysis, setRawAnalysis] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [queriedSymptom, setQueriedSymptom] = useState("");
  const [mobileTab, setMobileTab] = useState<"results" | "ask">("results");

  // Symptom→lab cross-reference (Tier 3)
  const [relatedLabs, setRelatedLabs] = useState<RelatedLabsResponse | null>(null);

  // Optional photo
  const [image, setImage] = useState<CompressedImage | null>(null);
  const [imageError, setImageError] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [resultHadImage, setResultHadImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resultRef = useRef<HTMLDivElement>(null);

  async function handleFile(file: File | null) {
    if (!file) return;
    setImageError("");
    if (!ACCEPTED_TYPES.includes(file.type)) {
      setImageError(t("photoErrorType"));
      return;
    }
    if (file.size > MAX_FILE_BYTES) {
      setImageError(t("photoErrorSize"));
      return;
    }
    try {
      const compressed = await compressImage(file);
      setImage(compressed);
    } catch {
      setImageError(t("photoErrorProcess"));
    }
  }

  function removeImage() {
    setImage(null);
    setImageError("");
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function submit(overrideSymptom?: string) {
    const sym = (overrideSymptom ?? symptom).trim();
    if (!sym && !image) return;
    setStage("loading");
    setResult(null);
    setErrorMsg("");
    setQueriedSymptom(sym || t("photoFallbackQuery"));

    try {
      const res = await fetch("/api/symptom", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          symptom: sym,
          age,
          sex,
          duration,
          history,
          language: lang,
          image: image ? { mediaType: image.mediaType, data: image.data } : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Unknown error");
      const rawText = data.text as string;
      const parsed = parseResult(rawText);
      setResult(parsed);
      setRawAnalysis(rawText);
      setResultHadImage(!!data.hadImage);
      setStage("result");

      // Fire-and-forget: fetch related labs from user's history (works
      // for anon users too — they get the recommendation list without values).
      // Skip when the user provided only a photo — no text to cross-reference.
      if (sym) {
        fetch("/api/symptom-related-labs", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ symptoms: sym }),
        })
          .then((r) => r.json())
          .then((j) => setRelatedLabs(j))
          .catch(() => undefined);
      }
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
      <section className="relative isolate overflow-hidden grain pt-12 pb-8 text-center">
        <div className="aurora-field" aria-hidden="true">
          <div className="aurora-blob animate-aurora" style={{ top: "-30%", left: "20%", width: "30vw", height: "30vw", background: "radial-gradient(circle at 40% 40%, rgba(139,92,246,0.4), transparent 62%)" }} />
          <div className="aurora-blob animate-aurora" style={{ top: "-15%", right: "18%", width: "26vw", height: "26vw", background: "radial-gradient(circle at 60% 50%, rgba(74,133,239,0.3), transparent 64%)", animationDelay: "-7s" }} />
        </div>
        <div className="absolute inset-0 dot-grid opacity-50 pointer-events-none" />
        <div className="relative z-10 max-w-2xl mx-auto px-4 sm:px-6">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-violet-100/80 dark:bg-violet-900/30 border border-violet-200/70 dark:border-violet-800/50 backdrop-blur text-violet-700 dark:text-violet-300 mb-6">
            <span className="relative flex h-1.5 w-1.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-500 opacity-60" />
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-violet-500" />
            </span>
            <span className="kicker-mono">{t("badge")}</span>
          </div>
          <h1 className="font-display text-4xl sm:text-5xl lg:text-[3.4rem] font-bold text-ink tracking-tightest leading-[1.03] mb-4">
            {t("title")}
          </h1>
          <p className="text-lg text-ink-secondary leading-relaxed max-w-xl mx-auto text-pretty">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* Input card */}
      <section className="max-w-2xl mx-auto px-4 sm:px-6">
        <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm p-6">
          {/* Symptom textarea */}
          <label className="block text-sm font-semibold text-ink mb-2">
            {t("inputLabel")}
          </label>
          <textarea
            value={symptom}
            onChange={(e) => setSymptom(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) submit();
            }}
            rows={3}
            placeholder={t("placeholder")}
            className="w-full px-4 py-3 rounded-xl border border-surface-border bg-slate-50 dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
          />

          {/* Photo upload (optional) */}
          <div className="mt-4">
            <div className="flex items-center gap-1.5 mb-2">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ink-tertiary">
                <path fillRule="evenodd" d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 018.07 3h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm13.5 3a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-1.5 0a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              <label className="text-sm font-semibold text-ink">
                {t("photoLabel")} <span className="font-normal text-ink-tertiary">{t("photoOptional")}</span>
              </label>
            </div>

            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              capture="environment"
              onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
              className="hidden"
              aria-label={t("photoUploadAria")}
            />

            {!image ? (
              <div
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => {
                  e.preventDefault();
                  setIsDragging(false);
                  handleFile(e.dataTransfer.files?.[0] ?? null);
                }}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    fileInputRef.current?.click();
                  }
                }}
                className={`cursor-pointer rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
                  isDragging
                    ? "border-violet-500 bg-violet-50 dark:bg-violet-950/30"
                    : "border-surface-border bg-slate-50/60 dark:bg-slate-800/40 hover:border-violet-300 dark:hover:border-violet-700 hover:bg-violet-50/40 dark:hover:bg-violet-950/20"
                }`}
              >
                <div className="flex flex-col items-center gap-1.5">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-ink-tertiary">
                    <path d="M5.5 13a3.5 3.5 0 01-.369-6.98 4 4 0 117.753-1.977A4.5 4.5 0 1113.5 13H11V9.413l1.293 1.293a1 1 0 001.414-1.414l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13H5.5z" />
                    <path d="M9 13h2v5a1 1 0 11-2 0v-5z" />
                  </svg>
                  <p className="text-sm font-medium text-ink-secondary">
                    {t("photoDropzone")}
                  </p>
                  <p className="text-xs text-ink-tertiary">{t("photoFormats")}</p>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-3 rounded-xl border border-surface-border bg-slate-50 dark:bg-slate-800/60 p-3">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={image.previewUrl}
                  alt={t("photoPreviewAlt")}
                  className="w-14 h-14 rounded-lg object-cover flex-shrink-0 border border-surface-border"
                />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-ink truncate">{image.filename}</p>
                  <p className="text-xs text-ink-tertiary mt-0.5">{t("photoAttached")}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-xs font-medium text-violet-600 dark:text-violet-400 hover:underline"
                  >
                    {t("photoReplace")}
                  </button>
                  <button
                    type="button"
                    onClick={removeImage}
                    className="text-xs font-medium text-red-600 dark:text-red-400 hover:underline"
                    aria-label={t("photoRemoveAria")}
                  >
                    {t("photoRemove")}
                  </button>
                </div>
              </div>
            )}

            {imageError && (
              <p className="mt-2 text-xs text-red-600 dark:text-red-400">{imageError}</p>
            )}
          </div>

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
            {t("contextToggle")}
          </button>

          {contextOpen && (
            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1.5">{t("ageLabel")}</label>
                <select
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-border bg-slate-50 dark:bg-slate-800 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                >
                  <option value="">{t("preferNot")}</option>
                  <option value="Under 18">{t("under18")}</option>
                  <option value="18–30">{t("age18to30")}</option>
                  <option value="31–50">{t("age31to50")}</option>
                  <option value="51–70">{t("age51to70")}</option>
                  <option value="Over 70">{t("over70")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1.5">{t("sexLabel")}</label>
                <select
                  value={sex}
                  onChange={(e) => setSex(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-border bg-slate-50 dark:bg-slate-800 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                >
                  <option value="">{t("preferNot")}</option>
                  <option value="Male">{t("male")}</option>
                  <option value="Female">{t("female")}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-ink-secondary mb-1.5">{t("durationLabel")}</label>
                <select
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-surface-border bg-slate-50 dark:bg-slate-800 text-ink text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                >
                  <option value="">{t("notSure")}</option>
                  <option value="Less than 24 hours">{t("lessThan24")}</option>
                  <option value="1–3 days">{t("oneToThreeDays")}</option>
                  <option value="4–7 days">{t("fourToSevenDays")}</option>
                  <option value="1–4 weeks">{t("oneToFourWeeks")}</option>
                  <option value="More than a month">{t("moreThanMonth")}</option>
                </select>
              </div>
              <div className="sm:col-span-3">
                <label className="block text-xs font-semibold text-ink-secondary mb-1.5">
                  {t("historyLabel")}
                </label>
                <textarea
                  value={history}
                  onChange={(e) => setHistory(e.target.value)}
                  rows={2}
                  placeholder={t("historyPlaceholder")}
                  className="w-full px-3 py-2 rounded-lg border border-surface-border bg-slate-50 dark:bg-slate-800 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-violet-400 transition"
                />
              </div>
            </div>
          )}

          {/* Submit */}
          <button
            onClick={() => submit()}
            disabled={(!symptom.trim() && !image) || stage === "loading"}
            className="mt-5 w-full flex items-center justify-center gap-2 px-6 py-3 bg-violet-600 hover:bg-violet-700 disabled:bg-slate-200 dark:disabled:bg-slate-800 disabled:text-slate-400 text-white font-semibold rounded-xl text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-violet-500/20"
          >
            {stage === "loading" ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M4 12a8 8 0 018-8" stroke="currentColor" strokeWidth="3" strokeLinecap="round" className="opacity-75" />
                </svg>
                {t("analyzing")}
              </>
            ) : (
              <>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                </svg>
                {t("submit")}
              </>
            )}
          </button>

          {/* Reassurance */}
          <p className="mt-3 text-center text-xs text-ink-tertiary">
            {t("reassurance")}
          </p>
        </div>

        {/* Example chips */}
        {stage === "idle" && (
          <div className="mt-5">
            <p className="text-xs text-ink-tertiary mb-3 text-center">{t("tryExample")}</p>
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
        <div ref={resultRef} className="max-w-5xl mx-auto px-4 sm:px-6 mt-10">

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

          {/* 2-column grid: results left, sticky chat right (xl+) */}
          <div className="xl:grid xl:grid-cols-[minmax(0,1fr)_360px] xl:gap-6 xl:items-start space-y-5 xl:space-y-0">

            {/* ─── Results column ─── */}
            <div className={`space-y-5 min-w-0 ${mobileTab === "ask" ? "hidden xl:block" : ""}`}>
          {/* Emergency info note — collapsible, soft tone */}
          {result.stopReadingIf && (
            <details className="group rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50/60 dark:bg-amber-950/20 overflow-hidden">
              <summary className="flex items-center gap-3 px-5 py-3.5 cursor-pointer select-none list-none [&::-webkit-details-marker]:hidden">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-500 dark:text-amber-400 flex-shrink-0">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a.75.75 0 000 1.5h.253a.25.25 0 01.244.304l-.459 2.066A1.75 1.75 0 0010.747 15H11a.75.75 0 000-1.5h-.253a.25.25 0 01-.244-.304l.459-2.066A1.75 1.75 0 009.253 9H9z" clipRule="evenodd" />
                </svg>
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300 flex-1">{t("emergencyNoteTitle")}</p>
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400 dark:text-amber-500 transition-transform group-open:rotate-180">
                  <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
                </svg>
              </summary>
              <div className="px-5 pb-4 pt-1">
                <p className="text-sm text-amber-900 dark:text-amber-300/90 leading-relaxed">{result.stopReadingIf}</p>
              </div>
            </details>
          )}

          {/* Queried symptom label */}
          <div className="flex items-center gap-2 flex-wrap">
            <p className="text-sm text-ink-secondary">
              {t("resultsFor")} <span className="font-semibold text-ink">{queriedSymptom}</span>
            </p>
            {resultHadImage && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-violet-100 dark:bg-violet-900/40 text-violet-700 dark:text-violet-300 text-[11px] font-semibold">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
                  <path fillRule="evenodd" d="M1 8a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 018.07 3h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0016.07 6H17a2 2 0 012 2v8a2 2 0 01-2 2H3a2 2 0 01-2-2V8zm13.5 3a4.5 4.5 0 11-9 0 4.5 4.5 0 019 0zm-1.5 0a3 3 0 11-6 0 3 3 0 016 0z" clipRule="evenodd" />
                </svg>
                {t("photoAnalyzed")}
              </span>
            )}
          </div>

          {/* MOST_LIKELY */}
          {result.mostLikely.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-surface-border">
                <h2 className="font-bold text-ink text-base">{t("mostLikely")}</h2>
                <p className="text-xs text-ink-tertiary mt-0.5">{t("mostLikelyDesc")}</p>
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
                <h2 className="font-bold text-ink-secondary text-sm">{t("lessCommon")}</h2>
                <p className="text-xs text-ink-tertiary mt-0.5">{t("lessCommonDesc")}</p>
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
                  <h2 className="font-bold text-amber-800 dark:text-amber-400 text-sm mb-1">{t("seriousRare")}</h2>
                  <p className="text-sm text-amber-900 dark:text-amber-300 leading-relaxed whitespace-pre-line">{result.seriousButRare}</p>
                </div>
              </div>
            </div>
          )}

          {/* WHAT_WOULD_CHANGE_THIS */}
          {result.whatWouldChangeThis.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-surface-border shadow-sm p-5">
              <h2 className="font-bold text-ink text-sm mb-3">{t("whatChange")}</h2>
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
                  {t(URGENCY_CONFIG[result.whatToDo.urgency].labelKey)}
                </h2>
              </div>
              <p className="text-sm leading-relaxed text-ink-secondary">{result.whatToDo.text}</p>
            </div>
          )}

          {/* HOME_CARE */}
          {result.homeCare.length > 0 && (
            <div className="bg-white dark:bg-slate-900 rounded-2xl border border-teal-200 dark:border-teal-800 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-teal-100 dark:border-teal-800/60 bg-teal-50/50 dark:bg-teal-950/20">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-lg bg-teal-100 dark:bg-teal-900/40 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4.5 h-4.5 text-teal-600 dark:text-teal-400">
                      <path d="M10.707 2.293a1 1 0 00-1.414 0l-7 7a1 1 0 001.414 1.414L4 10.414V17a1 1 0 001 1h2a1 1 0 001-1v-2a1 1 0 011-1h2a1 1 0 011 1v2a1 1 0 001 1h2a1 1 0 001-1v-6.586l.293.293a1 1 0 001.414-1.414l-7-7z" />
                    </svg>
                  </div>
                  <div>
                    <h2 className="font-bold text-ink text-sm">{t("homeCareTitle")}</h2>
                    <p className="text-[11px] text-ink-tertiary mt-0.5">{t("homeCareDesc")}</p>
                  </div>
                </div>
              </div>
              <div className="px-5 py-4">
                <ul className="space-y-3">
                  {result.homeCare.map((item, i) => (
                    <li key={i} className="flex items-start gap-3 text-sm text-ink-secondary leading-relaxed">
                      <span className="flex-shrink-0 w-5 h-5 rounded-full bg-teal-100 dark:bg-teal-900/30 flex items-center justify-center mt-0.5">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-teal-600 dark:text-teal-400">
                          <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" />
                        </svg>
                      </span>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Symptom → lab cross-reference (Tier 3) */}
          {relatedLabs && relatedLabs.groups.length > 0 && (
            <RelatedLabsCard data={relatedLabs} />
          )}

          {/* Try again */}
          <div className="text-center pt-2">
            <button
              onClick={() => { setStage("idle"); setResult(null); setRawAnalysis(""); setSymptom(""); setRelatedLabs(null); setMobileTab("results"); setImage(null); setImageError(""); setResultHadImage(false); if (fileInputRef.current) fileInputRef.current.value = ""; }}
              className="text-sm text-ink-tertiary hover:text-ink transition-colors underline underline-offset-2"
            >
              {t("checkAnother")}
            </button>
          </div>
            </div>{/* end results column */}

            {/* ─── Sticky chat sidebar (xl+) / tab-switched (mobile) ─── */}
            <aside className={`xl:sticky xl:top-24 min-w-0 scroll-mt-6 ${mobileTab !== "ask" ? "hidden xl:block" : ""}`}>
              <SymptomChatPanel
                symptom={queriedSymptom}
                analysisSnapshot={rawAnalysis}
                language={lang}
              />
            </aside>
          </div>{/* end 2-column grid */}
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
  const t = useTranslations("Symptom");
  const haveAny = data.groups.some((g) => g.markers.some((m) => m.value != null));

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl border border-brand-blue/30 shadow-sm p-5">
      <div className="flex items-start justify-between gap-2 mb-3">
        <div>
          <p className="text-[10px] font-bold uppercase tracking-wider text-brand-blue">{t("relatedLabsTitle")}</p>
          <h2 className="font-bold text-ink text-sm mt-1">{t("relatedLabsDesc")}</h2>
        </div>
        {data.signedIn === false && (
          <Link href="/sign-up" className="text-xs font-semibold text-brand-blue hover:underline whitespace-nowrap">
            {t("relatedLabsButton")}
          </Link>
        )}
      </div>

      {data.signedIn === false ? (
        <p className="text-xs text-ink-secondary leading-relaxed mb-3">
          {t("relatedLabsSignUp")}
        </p>
      ) : !haveAny ? (
        <p className="text-xs text-ink-secondary leading-relaxed mb-3">
          {t("relatedLabsDesc")}
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
