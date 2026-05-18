"use client";

// Genetic Test Explainer — three input modes (paste / report upload / raw
// DNA data upload), depth toggle, calibrated AI explanation with prominent
// elevation of pathogenic findings, copy-able questions for a genetic
// counselor, and a static FAQ section for SEO.

import { useCallback, useRef, useState } from "react";
import { useLanguage } from "@/contexts/LanguageContext";

// ── Types (mirror the API JSON schema) ──────────────────────────────────────

type Tier = "simple" | "medium" | "expert";
type InputMode = "paste" | "report" | "raw";
type Stage = "idle" | "loading" | "result" | "error";

type Significance =
  | "benign"
  | "likely_benign"
  | "modest_effect"
  | "moderate_effect"
  | "vus"
  | "likely_pathogenic"
  | "pathogenic";

type CounselorTier = "not_needed" | "discuss" | "strongly_recommended";

interface VariantBlock {
  identification: string;
  what_it_does: string;
  clinical_significance: string;
  what_this_means_for_you: string;
  misconceptions: string;
  tier: Significance;
}

interface GeneticsResult {
  category: "consumer" | "clinical" | "single_variant" | "non_genetic";
  test_source_guess?: string;
  summary_headline: string;
  overall_significance: Significance;
  variants: VariantBlock[];
  common_misconceptions?: string;
  questions_for_doctor?: string[];
  counselor_recommendation: {
    tier: CounselorTier;
    reasoning: string;
    resource_text?: string;
  };
  brca_23andme_caveat?: string;
}

type ErrorCode =
  | "NO_INPUT"
  | "WRONG_FILE_TYPE"
  | "FILE_TOO_LARGE"
  | "NO_VARIANTS_FOUND"
  | "UNRECOGNIZED_FORMAT"
  | "ZIP_NOT_SUPPORTED"
  | "NON_GENETIC"
  | "NETWORK_ERROR"
  | "SERVER_ERROR";

// ── Significance visual config ──────────────────────────────────────────────

const SIG_CONFIG: Record<
  Significance,
  { label: string; bg: string; border: string; chip: string; iconColor: string }
> = {
  benign: {
    label: "Benign",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  likely_benign: {
    label: "Likely benign",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    border: "border-emerald-200 dark:border-emerald-800",
    chip: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    iconColor: "text-emerald-600 dark:text-emerald-400",
  },
  modest_effect: {
    label: "Modest effect",
    bg: "bg-sky-50 dark:bg-sky-900/20",
    border: "border-sky-200 dark:border-sky-800",
    chip: "bg-sky-100 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300",
    iconColor: "text-sky-600 dark:text-sky-400",
  },
  moderate_effect: {
    label: "Moderate effect",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  vus: {
    label: "Uncertain significance",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    border: "border-amber-200 dark:border-amber-800",
    chip: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    iconColor: "text-amber-600 dark:text-amber-400",
  },
  likely_pathogenic: {
    label: "Likely pathogenic",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-300 dark:border-red-700",
    chip: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    iconColor: "text-red-600 dark:text-red-400",
  },
  pathogenic: {
    label: "Pathogenic",
    bg: "bg-red-50 dark:bg-red-900/20",
    border: "border-red-400 dark:border-red-600",
    chip: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300",
    iconColor: "text-red-600 dark:text-red-400",
  },
};

const SERIOUS: Set<Significance> = new Set(["likely_pathogenic", "pathogenic"]);

// ── Static SEO FAQ entries (must match the JSON-LD in page.tsx) ─────────────

const FAQ_ENTRIES: { q: string; a: string }[] = [
  {
    q: "What does MTHFR C677T mean?",
    a: "MTHFR C677T (rs1801133) is one of the most-searched variants in consumer genetics. It's a common variant in the MTHFR gene that modestly reduces the activity of an enzyme involved in folate metabolism. Heterozygous (C/T) carriers retain about 70% of normal enzyme activity; homozygous (T/T) carriers retain about 30%. Despite extensive online attention and wellness-industry claims, large studies have not found that this variant meaningfully increases risk of cardiovascular disease, miscarriage, depression, or autism in the general population. Standard folic acid is absorbed and utilized effectively by the vast majority of carriers — specialized methylfolate supplementation is rarely necessary. A C677T result is not a diagnosis and does not on its own require treatment or lifestyle changes. If you've been told your symptoms are 'because of MTHFR,' that explanation is almost certainly wrong. The most useful next step is a conversation with a primary care physician or genetic counselor who can put the result in the context of your actual labs (such as homocysteine) and family history.",
  },
  {
    q: "I have one or two copies of APOE ε4. Does that mean I'll get Alzheimer's?",
    a: "No. APOE ε4 is the strongest known common genetic risk factor for late-onset Alzheimer's disease, but it is a risk factor, not a determinant. Many people with one or even two copies of ε4 never develop Alzheimer's, and many people without any ε4 copies do develop it. Lifestyle factors — cardiovascular health, sleep quality, blood pressure control, education and cognitive engagement — meaningfully modify your actual risk. APOE results are best interpreted with a genetic counselor, especially before sharing with family members. The ε4 finding is also relevant if you ever face a head injury or anesthesia decision, but on its own it is not a reason to make major life changes. If you found out about your APOE status through a consumer test and feel anxious, that anxiety alone is a reason to speak with a counselor — they can put the result in context and help you decide what (if anything) to do with the information.",
  },
  {
    q: "I got a 'BRCA negative' result from 23andMe. Does that mean I don't have a BRCA mutation?",
    a: "Critically, no — and this is one of the most dangerous misunderstandings in consumer genetic testing. 23andMe tests only three specific BRCA1 and BRCA2 variants that are most common in Ashkenazi Jewish populations (185delAG and 5382insC in BRCA1, and 6174delT in BRCA2). There are thousands of other BRCA pathogenic variants that 23andMe does NOT test for. A negative 23andMe BRCA result rules out only those three specific variants and nothing else. If you have a family history of breast, ovarian, prostate, or pancreatic cancer — especially in close relatives, at young ages, or across generations — you should pursue clinical BRCA testing through a genetic counselor regardless of what your 23andMe report shows. A clinical sequencing panel (often covered by insurance when family history meets criteria) tests for the full range of pathogenic variants in BRCA1, BRCA2, and related genes. This distinction has clinically meaningful consequences and is worth raising with a genetic counselor or your primary care physician.",
  },
  {
    q: "What is Factor V Leiden and how worried should I be?",
    a: "Factor V Leiden (rs6025) is a well-characterized variant that increases the risk of abnormal blood clotting. Heterozygous carriers (one copy) have roughly a 4–8× higher relative risk of deep vein thrombosis compared to non-carriers; homozygous carriers (two copies) have a substantially higher risk. However, the absolute lifetime risk for heterozygotes remains modest in the absence of other risk factors — most heterozygous carriers will never have a clotting event. The variant changes risk during specific high-risk situations: major surgery, prolonged immobilization (long-haul flights, hospitalization), pregnancy, and hormonal contraceptives or hormone replacement therapy. Those windows are when the diagnosis matters most clinically. If you've been told you carry Factor V Leiden, the most important next steps are: (1) inform any future surgeon or obstetrician, (2) discuss hormonal contraceptive options with your physician, and (3) understand the warning signs of deep vein thrombosis and pulmonary embolism. This is a case where the genetic result actually changes specific clinical decisions, so a conversation with your physician is worthwhile.",
  },
  {
    q: "I'm a HFE C282Y homozygote. Do I have hemochromatosis?",
    a: "Not necessarily — and this is an important distinction. C282Y/C282Y is the genotype most commonly associated with hereditary hemochromatosis (iron overload), but penetrance is highly variable. Many homozygotes never develop clinically significant iron overload, and many never need treatment. The genotype indicates susceptibility; whether you actually have iron overload requires blood testing — typically a ferritin level and transferrin saturation. Most homozygotes who do develop iron overload can be managed effectively with periodic therapeutic phlebotomy (essentially, donating blood on a schedule), which is straightforward and low-burden. Heterozygous carriers (one copy) and compound heterozygotes (C282Y/H63D) generally do not develop clinically significant iron overload, though mildly elevated iron studies are possible. If you've been told you carry C282Y, the practical next step is checking your iron labs — ferritin, transferrin saturation, and iron — and discussing the results with your primary care physician. A genetic counselor can help if family planning is involved.",
  },
  {
    q: "What does ALDH2 *2 (the alcohol flush variant) mean for my health?",
    a: "ALDH2 *2 (rs671, also called the 'Asian flush' variant) reduces the activity of the enzyme that breaks down acetaldehyde — the toxic intermediate produced when your body metabolizes alcohol. Carriers experience facial flushing, nausea, headache, and elevated heart rate after even small amounts of alcohol; homozygous carriers (A/A) are essentially intolerant of alcohol. The variant is very common in East Asian populations. The most important health implication is not the unpleasant short-term flush — it's that long-term alcohol consumption in ALDH2 *2 carriers is associated with significantly higher rates of esophageal cancer and other upper-GI cancers, because the slower acetaldehyde clearance means a known carcinogen lingers in tissues longer. If you carry this variant and drink regularly despite the flush response, that's a meaningful health risk worth raising with your physician. The variant does not preclude drinking entirely, but it does shift the risk calculus, and 'pushing through' the flush is precisely the pattern most associated with cancer risk in long-term studies.",
  },
];

// ── Tier toggle (fuchsia accent) ────────────────────────────────────────────

function TierTabs({ active, onChange }: { active: Tier; onChange: (t: Tier) => void }) {
  const tiers: { id: Tier; label: string; sub: string }[] = [
    { id: "simple",  label: "Simple",  sub: "Plain language"     },
    { id: "medium",  label: "Medium",  sub: "Some clinical context" },
    { id: "expert",  label: "Expert",  sub: "Full notation"      },
  ];
  return (
    <div className="flex border-b border-surface-border bg-surface-raised">
      {tiers.map((t) => {
        const isActive = active === t.id;
        return (
          <button
            key={t.id}
            onClick={() => onChange(t.id)}
            className={`flex-1 px-3 py-2.5 text-xs sm:text-sm font-semibold transition-all duration-150 ${
              isActive
                ? "text-fuchsia-700 dark:text-fuchsia-300 border-b-2 border-fuchsia-500 bg-fuchsia-500/5"
                : "text-ink-tertiary hover:text-ink-secondary border-b-2 border-transparent"
            }`}
          >
            <div>{t.label}</div>
            <div className="text-[10px] font-normal opacity-70 mt-0.5 hidden sm:block">{t.sub}</div>
          </button>
        );
      })}
    </div>
  );
}

// ── Variant card ────────────────────────────────────────────────────────────

function VariantCard({ v, index }: { v: VariantBlock; index: number }) {
  const cfg = SIG_CONFIG[v.tier] ?? SIG_CONFIG.modest_effect;
  const isSerious = SERIOUS.has(v.tier);
  return (
    <article
      className={`rounded-2xl border ${cfg.border} ${cfg.bg} ${isSerious ? "ring-1 ring-red-300/60 dark:ring-red-700/60" : ""} overflow-hidden`}
    >
      <header className="px-5 py-3.5 flex items-center justify-between gap-3 border-b border-current/10">
        <div className="flex items-center gap-2.5 min-w-0">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.iconColor}`}>
            Variant {index + 1}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${cfg.chip}`}>
            {cfg.label}
          </span>
        </div>
      </header>
      <div className="p-5 space-y-4">
        <Section title="What this variant is" body={v.identification} />
        <Section title="What it does" body={v.what_it_does} />
        <Section title="Clinical significance" body={v.clinical_significance} accent={isSerious} />
        <Section title="What this means for you" body={v.what_this_means_for_you} />
        {v.misconceptions && <Section title="Common misconceptions" body={v.misconceptions} />}
      </div>
    </article>
  );
}

function Section({ title, body, accent }: { title: string; body: string; accent?: boolean }) {
  return (
    <div>
      <p className={`text-[11px] font-bold uppercase tracking-widest mb-1.5 ${accent ? "text-red-700 dark:text-red-300" : "text-ink-tertiary"}`}>
        {title}
      </p>
      <p className="text-sm text-ink-secondary leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}

// ── Counselor recommendation card ───────────────────────────────────────────

function CounselorCard({ rec }: { rec: GeneticsResult["counselor_recommendation"] }) {
  const cfg = {
    not_needed: {
      label: "A counselor isn't necessary for this one",
      bg: "bg-emerald-50 dark:bg-emerald-900/20",
      border: "border-emerald-200 dark:border-emerald-800",
      iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
      iconColor: "text-emerald-600 dark:text-emerald-400",
      titleColor: "text-emerald-800 dark:text-emerald-300",
    },
    discuss: {
      label: "Worth discussing with a genetic counselor",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      border: "border-amber-200 dark:border-amber-800",
      iconBg: "bg-amber-100 dark:bg-amber-900/40",
      iconColor: "text-amber-600 dark:text-amber-400",
      titleColor: "text-amber-800 dark:text-amber-300",
    },
    strongly_recommended: {
      label: "Strongly recommended: see a genetic counselor",
      bg: "bg-red-50 dark:bg-red-900/20",
      border: "border-red-300 dark:border-red-700",
      iconBg: "bg-red-100 dark:bg-red-900/40",
      iconColor: "text-red-600 dark:text-red-400",
      titleColor: "text-red-800 dark:text-red-300",
    },
  }[rec.tier];

  if (!cfg) return null;

  return (
    <section
      className={`rounded-2xl border-2 ${cfg.border} ${cfg.bg} p-5 ${rec.tier === "strongly_recommended" ? "shadow-lg" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${cfg.iconBg}`}>
          <svg viewBox="0 0 20 20" fill="currentColor" className={`w-5 h-5 ${cfg.iconColor}`}>
            <path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" />
          </svg>
        </div>
        <div className="min-w-0 flex-1">
          <p className={`text-sm font-bold ${cfg.titleColor} mb-1.5`}>{cfg.label}</p>
          <p className="text-sm text-ink-secondary leading-relaxed">{rec.reasoning}</p>
          {rec.resource_text && (
            <p className="text-xs text-ink-tertiary mt-3 leading-relaxed">
              {rec.resource_text}{" "}
              <a
                href="https://findageneticcounselor.nsgc.org/"
                target="_blank"
                rel="noopener noreferrer"
                className="font-semibold text-fuchsia-700 dark:text-fuchsia-400 hover:underline"
              >
                findageneticcounselor.nsgc.org
              </a>
            </p>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Questions section (with copy-all) ───────────────────────────────────────

function QuestionsSection({ questions }: { questions: string[] }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    const text = questions.map((q, i) => `${i + 1}. ${q}`).join("\n");
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <section className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm">
      <div className="px-5 py-3.5 border-b border-surface-border bg-surface-raised flex items-center gap-2.5">
        <div className="w-6 h-6 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center flex-shrink-0">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-fuchsia-600 dark:text-fuchsia-400">
            <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
          </svg>
        </div>
        <p className="text-sm font-semibold text-ink">Questions to ask a genetic counselor or doctor</p>
      </div>
      <div className="p-5 space-y-4">
        <ol className="space-y-3">
          {questions.map((q, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 w-6 h-6 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/40 text-fuchsia-700 dark:text-fuchsia-300 text-xs font-bold flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <p className="text-sm text-ink-secondary leading-relaxed flex-1">{q}</p>
            </li>
          ))}
        </ol>
        <button
          onClick={copy}
          className={`w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border text-sm font-semibold transition-all duration-200 ${
            copied
              ? "border-emerald-300 bg-emerald-50 text-emerald-700"
              : "border-surface-border bg-surface-raised hover:border-fuchsia-300 hover:bg-fuchsia-50 dark:hover:bg-fuchsia-900/10 text-ink-secondary hover:text-fuchsia-700"
          }`}
        >
          {copied ? "Copied all questions ✓" : "Copy all questions"}
        </button>
      </div>
    </section>
  );
}

// ── Status banner (top of result) ───────────────────────────────────────────

function StatusBanner({ result }: { result: GeneticsResult }) {
  const sig = result.overall_significance;
  const cfg = SIG_CONFIG[sig] ?? SIG_CONFIG.modest_effect;
  const isSerious = SERIOUS.has(sig);
  return (
    <div className={`rounded-2xl border-2 ${cfg.border} ${cfg.bg} p-5 space-y-3 ${isSerious ? "ring-1 ring-red-300/60 dark:ring-red-700/60 shadow-lg" : ""}`}>
      <div className="flex items-center gap-2 flex-wrap">
        <span className={`text-[11px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full ${cfg.chip}`}>
          Overall: {cfg.label}
        </span>
        {result.test_source_guess && result.test_source_guess !== "N/A" && (
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/60 dark:bg-slate-700/60 text-ink-tertiary border border-surface-border">
            Source: {result.test_source_guess}
          </span>
        )}
        {result.category && (
          <span className="text-[11px] font-medium px-2.5 py-1 rounded-full bg-white/60 dark:bg-slate-700/60 text-ink-tertiary border border-surface-border">
            {result.category === "consumer" ? "Consumer DNA test"
              : result.category === "clinical" ? "Clinical genetic test"
              : "Single-variant query"}
          </span>
        )}
      </div>
      <p className="text-base text-ink leading-relaxed font-medium">{result.summary_headline}</p>
    </div>
  );
}

// ── Loading + error scaffolding ─────────────────────────────────────────────

function LoadingAnimation() {
  return (
    <div className="py-12 flex flex-col items-center gap-5">
      <div className="w-12 h-12 rounded-full border-2 border-fuchsia-200 dark:border-fuchsia-900 border-t-fuchsia-500 animate-spin" />
      <p className="text-sm text-ink-secondary font-medium">Analyzing your genetic data…</p>
      <p className="text-xs text-ink-tertiary text-center max-w-xs">
        We don't store your file — it's analyzed in memory and discarded once the response is built.
      </p>
    </div>
  );
}

function ErrorCard({
  code,
  message,
  fileSizeMB,
  onReset,
}: {
  code: ErrorCode;
  message?: string;
  fileSizeMB?: string;
  onReset: () => void;
}) {
  const friendly = (() => {
    switch (code) {
      case "NO_INPUT": return "Please paste a variant or upload a file to continue.";
      case "WRONG_FILE_TYPE": return "That file type isn't supported. Upload a PDF or image for a report, or a .txt / .csv file for raw DNA data.";
      case "FILE_TOO_LARGE": return `That file is ${fileSizeMB ?? "too large"} MB. Raw DNA files can be up to 60 MB; reports up to 10 MB.`;
      case "NO_VARIANTS_FOUND": return "We couldn't find any clinically relevant variants from our curated catalog in this file. The file parsed, but none of the SNPs we currently watch were present.";
      case "UNRECOGNIZED_FORMAT": return "We couldn't recognize this as a 23andMe, AncestryDNA, or MyHeritage raw data export. Try uploading the original .txt file from the testing company.";
      case "ZIP_NOT_SUPPORTED": return "ZIP files aren't supported yet. Please unzip your download and upload the .txt or .csv file inside.";
      case "NON_GENETIC": return "This doesn't look like a genetic test result. Try pasting a specific variant or uploading a report from a DNA testing company.";
      case "NETWORK_ERROR": return "Network error. Please check your connection and try again.";
      default: return message ?? "Something went wrong. Please try again.";
    }
  })();
  return (
    <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-6 text-center space-y-4">
      <div className="w-12 h-12 mx-auto rounded-full bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-6 h-6 text-amber-600">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>
      </div>
      <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed max-w-md mx-auto">{friendly}</p>
      <button
        onClick={onReset}
        className="px-5 py-2 rounded-xl bg-white dark:bg-slate-800 border border-amber-200 dark:border-amber-700 text-amber-800 dark:text-amber-300 text-sm font-semibold hover:bg-amber-50 dark:hover:bg-amber-900/30"
      >
        Try again
      </button>
    </div>
  );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function GeneticsClient() {
  const { lang } = useLanguage();

  const [stage, setStage] = useState<Stage>("idle");
  const [mode, setMode] = useState<InputMode>("paste");
  const [text, setText] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [context, setContext] = useState("");
  const [contextOpen, setContextOpen] = useState(false);
  const [tier, setTier] = useState<Tier>("medium");

  const [result, setResult] = useState<GeneticsResult | null>(null);
  const [errorCode, setErrorCode] = useState<ErrorCode | null>(null);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [fileSizeMB, setFileSizeMB] = useState<string | undefined>(undefined);

  const resultRef = useRef<HTMLDivElement>(null);
  const reportInputRef = useRef<HTMLInputElement>(null);
  const rawInputRef = useRef<HTMLInputElement>(null);

  const reset = () => {
    setStage("idle");
    setResult(null);
    setErrorCode(null);
    setErrorMessage("");
    setFileSizeMB(undefined);
  };

  const submit = useCallback(async () => {
    if (mode === "paste" && !text.trim()) {
      setErrorCode("NO_INPUT");
      setStage("error");
      return;
    }
    if (mode !== "paste" && !file) {
      setErrorCode("NO_INPUT");
      setStage("error");
      return;
    }

    setStage("loading");
    setResult(null);
    setErrorCode(null);
    setErrorMessage("");

    const fd = new FormData();
    fd.append("mode", mode);
    fd.append("language", lang);
    fd.append("tier", tier);
    if (mode === "paste") fd.append("text", text.trim());
    else if (file) fd.append("file", file);
    if (context.trim()) fd.append("context", context.trim());

    try {
      const res = await fetch("/api/genetics", { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setErrorCode((json.errorCode as ErrorCode) ?? "SERVER_ERROR");
        setErrorMessage(json.error ?? "");
        setFileSizeMB(json.fileSizeMB);
        setStage("error");
        return;
      }
      setResult(json.data as GeneticsResult);
      setStage("result");
      setTimeout(() => resultRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
    } catch {
      setErrorCode("NETWORK_ERROR");
      setStage("error");
    }
  }, [mode, text, file, context, lang, tier]);

  const handleReportFile = (f: File) => {
    setFile(f);
    setErrorCode(null);
  };
  const handleRawFile = (f: File) => {
    setFile(f);
    setErrorCode(null);
  };

  const showInput = stage === "idle" || stage === "error";

  return (
    <div className="min-h-screen bg-gradient-to-b from-fuchsia-50/60 to-white dark:from-slate-900 dark:to-slate-900 pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* ── Hero ──────────────────────────────────────────────────── */}
        <div className="text-center mb-8">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-fuchsia-300/40 text-fuchsia-700 dark:text-fuchsia-400 text-xs font-semibold uppercase tracking-wider mb-5 shadow-sm">
            Got DNA results?
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-snug">
            Genetic Test Explainer
          </h1>
          <p className="mt-3 text-base text-ink-secondary max-w-xl mx-auto leading-relaxed">
            Understand what your DNA results actually mean.
          </p>
          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
            {[
              "Educational, not diagnostic",
              "Calibrated to clinical significance",
              "Your file is never stored",
            ].map((t) => (
              <span key={t} className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-slate-800 border border-surface-border text-xs text-ink-secondary font-medium shadow-sm">
                <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-500" />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* ── Input card ────────────────────────────────────────────── */}
        {showInput && (
          <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-ink/5 dark:shadow-black/30 border border-surface-border overflow-hidden">
            {/* Mode tabs */}
            <div className="flex border-b border-surface-border">
              {([
                { id: "paste",  label: "Paste a variant",        sub: "Most common" },
                { id: "report", label: "Upload your report",     sub: "PDF or image" },
                { id: "raw",    label: "Upload raw DNA data",    sub: ".txt / .csv" },
              ] as { id: InputMode; label: string; sub: string }[]).map((t) => {
                const isActive = mode === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => { setMode(t.id); setErrorCode(null); }}
                    className={`flex-1 px-3 sm:px-4 py-3.5 text-sm font-semibold transition-all duration-150 ${
                      isActive
                        ? "text-fuchsia-700 dark:text-fuchsia-300 border-b-2 border-fuchsia-500 bg-fuchsia-500/5"
                        : "text-ink-tertiary hover:text-ink-secondary border-b-2 border-transparent hover:bg-surface-raised"
                    }`}
                  >
                    <div>{t.label}</div>
                    <div className="text-[10px] font-normal opacity-70 mt-0.5">{t.sub}</div>
                  </button>
                );
              })}
            </div>

            <div className="p-6 space-y-5">
              {/* Mode: paste */}
              {mode === "paste" && (
                <div>
                  <label htmlFor="paste-input" className="block text-sm font-semibold text-ink mb-2">
                    Paste a variant or SNP you want explained
                  </label>
                  <textarea
                    id="paste-input"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={5}
                    placeholder="e.g. MTHFR C677T heterozygous, or rs1801133 (C;T), or BRCA1 c.5266dupC pathogenic"
                    className="w-full px-4 py-3 rounded-xl border border-surface-border bg-slate-50 dark:bg-slate-900 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-fuchsia-400 transition"
                  />
                </div>
              )}

              {/* Mode: report */}
              {mode === "report" && (
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Upload your genetic test report
                  </label>
                  <p className="text-xs text-ink-tertiary mb-3">
                    Accepts clinical reports from Invitae, Color, GeneDx, Natera, Myriad, Ambry — as well as 23andMe Health reports and MyHeritage health PDFs. PDF or image, up to 10 MB.
                  </p>
                  <input
                    ref={reportInputRef}
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleReportFile(f); }}
                  />
                  {file ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50/60 dark:bg-fuchsia-900/15">
                      <div className="w-10 h-10 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/40 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{file.name}</p>
                        <p className="text-xs text-ink-tertiary">{(file.size / 1024).toFixed(0)} KB</p>
                      </div>
                      <button onClick={() => setFile(null)} className="text-ink-tertiary hover:text-ink p-2 rounded-lg hover:bg-surface-raised">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => reportInputRef.current?.click()}
                      className="w-full py-8 px-6 rounded-xl border-2 border-dashed border-surface-border hover:border-fuchsia-400/50 hover:bg-fuchsia-50/30 dark:hover:bg-fuchsia-900/10 transition-colors flex flex-col items-center gap-2"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-ink-tertiary">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <p className="text-sm font-semibold text-ink">Click to upload your report</p>
                      <p className="text-xs text-ink-tertiary">PDF, JPG, PNG, WebP — up to 10 MB</p>
                    </button>
                  )}
                </div>
              )}

              {/* Mode: raw */}
              {mode === "raw" && (
                <div>
                  <label className="block text-sm font-semibold text-ink mb-2">
                    Or upload your raw DNA data file
                  </label>
                  <p className="text-xs text-ink-tertiary mb-3">
                    From 23andMe, AncestryDNA, or MyHeritage. We'll highlight the variants most worth knowing about. <strong className="text-ink-secondary">Important:</strong> please unzip the download first and upload the .txt or .csv file inside (ZIP support is on the way). Up to 60 MB.
                  </p>
                  <input
                    ref={rawInputRef}
                    type="file"
                    accept=".txt,.csv,text/plain,text/csv"
                    className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleRawFile(f); }}
                  />
                  {file ? (
                    <div className="flex items-center gap-3 p-4 rounded-xl border border-fuchsia-200 dark:border-fuchsia-800 bg-fuchsia-50/60 dark:bg-fuchsia-900/15">
                      <div className="w-10 h-10 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/40 flex items-center justify-center flex-shrink-0">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                        </svg>
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-ink truncate">{file.name}</p>
                        <p className="text-xs text-ink-tertiary">{(file.size / (1024 * 1024)).toFixed(1)} MB</p>
                      </div>
                      <button onClick={() => setFile(null)} className="text-ink-tertiary hover:text-ink p-2 rounded-lg hover:bg-surface-raised">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                          <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                        </svg>
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => rawInputRef.current?.click()}
                      className="w-full py-8 px-6 rounded-xl border-2 border-dashed border-surface-border hover:border-fuchsia-400/50 hover:bg-fuchsia-50/30 dark:hover:bg-fuchsia-900/10 transition-colors flex flex-col items-center gap-2"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-ink-tertiary">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                      </svg>
                      <p className="text-sm font-semibold text-ink">Click to upload your raw data</p>
                      <p className="text-xs text-ink-tertiary">.txt or .csv — up to 60 MB</p>
                    </button>
                  )}
                </div>
              )}

              {/* Optional context */}
              <div>
                <button
                  onClick={() => setContextOpen(!contextOpen)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary hover:text-ink"
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 transition-transform ${contextOpen ? "rotate-90" : ""}`}>
                    <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  Any context? (optional)
                </button>
                {contextOpen && (
                  <textarea
                    value={context}
                    onChange={(e) => setContext(e.target.value)}
                    rows={2}
                    placeholder="e.g. My mother had breast cancer, or I'm trying to understand my caffeine sensitivity"
                    className="mt-2 w-full px-4 py-2.5 rounded-xl border border-surface-border bg-slate-50 dark:bg-slate-900 text-ink placeholder-ink-tertiary text-sm resize-none focus:outline-none focus:ring-2 focus:ring-fuchsia-400 transition"
                  />
                )}
              </div>

              {/* Tier toggle */}
              <div className="rounded-xl border border-surface-border overflow-hidden">
                <TierTabs active={tier} onChange={setTier} />
              </div>

              {/* Submit */}
              {stage === "error" && errorCode && (
                <ErrorCard
                  code={errorCode}
                  message={errorMessage}
                  fileSizeMB={fileSizeMB}
                  onReset={reset}
                />
              )}
              {stage !== "error" && (
                <button
                  onClick={submit}
                  className="w-full py-3.5 bg-fuchsia-600 hover:bg-fuchsia-700 text-white font-bold rounded-xl text-base transition-all duration-200 shadow-lg shadow-fuchsia-600/20 hover:shadow-fuchsia-600/40 hover:-translate-y-0.5 flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0"
                  disabled={(mode === "paste" && !text.trim()) || (mode !== "paste" && !file)}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
                  </svg>
                  Explain my genetics
                </button>
              )}
            </div>
          </section>
        )}

        {/* ── Loading ───────────────────────────────────────────────── */}
        {stage === "loading" && (
          <section className="bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-ink/5 dark:shadow-black/30 border border-surface-border p-6 sm:p-8">
            <LoadingAnimation />
          </section>
        )}

        {/* ── Result ────────────────────────────────────────────────── */}
        {stage === "result" && result && (
          <div ref={resultRef} className="space-y-5">
            {/* Status banner */}
            <StatusBanner result={result} />

            {/* Counselor recommendation — surfaced near the top when serious */}
            {SERIOUS.has(result.overall_significance) && (
              <CounselorCard rec={result.counselor_recommendation} />
            )}

            {/* BRCA + 23andMe caveat */}
            {result.brca_23andme_caveat && (
              <section className="rounded-2xl border-2 border-red-300 dark:border-red-700 bg-red-50 dark:bg-red-900/20 p-5">
                <div className="flex items-start gap-3">
                  <div className="w-9 h-9 rounded-xl bg-red-100 dark:bg-red-900/40 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-600">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-red-800 dark:text-red-300 mb-1.5 uppercase tracking-wider">Important: 23andMe BRCA limitation</p>
                    <p className="text-sm text-ink-secondary leading-relaxed">{result.brca_23andme_caveat}</p>
                  </div>
                </div>
              </section>
            )}

            {/* Depth toggle */}
            <div className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm">
              <TierTabs active={tier} onChange={(t) => { setTier(t); submit(); }} />
              <div className="px-5 py-3 text-xs text-ink-tertiary border-b border-surface-border bg-surface-raised">
                Change the depth and we'll re-explain at that level.
              </div>
            </div>

            {/* Variant cards */}
            <div className="space-y-4">
              <p className="text-[11px] font-bold text-ink-tertiary uppercase tracking-widest px-0.5">
                {result.variants.length === 1 ? "Your variant" : `Your variants (${result.variants.length})`}
              </p>
              {result.variants.map((v, i) => (
                <VariantCard key={i} v={v} index={i} />
              ))}
            </div>

            {/* Overall misconceptions */}
            {result.common_misconceptions && (
              <section className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm">
                <div className="px-5 py-3.5 border-b border-surface-border bg-surface-raised flex items-center gap-2.5">
                  <div className="w-6 h-6 rounded-lg bg-fuchsia-100 dark:bg-fuchsia-900/30 flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-fuchsia-600 dark:text-fuchsia-400">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <p className="text-sm font-semibold text-ink">What people commonly get wrong</p>
                </div>
                <div className="p-5">
                  <p className="text-sm text-ink-secondary leading-relaxed">{result.common_misconceptions}</p>
                </div>
              </section>
            )}

            {/* Questions for counselor */}
            {result.questions_for_doctor && result.questions_for_doctor.length > 0 && (
              <QuestionsSection questions={result.questions_for_doctor} />
            )}

            {/* Counselor recommendation — also surfaced at the bottom regardless of tier */}
            {!SERIOUS.has(result.overall_significance) && (
              <CounselorCard rec={result.counselor_recommendation} />
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-amber-700 dark:text-amber-300 leading-relaxed">
                <strong>This tool explains genetic information for educational purposes.</strong> It does not replace genetic counseling, clinical genetic testing, or medical advice. For any significant finding, please consult a board-certified genetic counselor.
              </p>
            </div>

            {/* New analysis */}
            <button
              onClick={reset}
              className="w-full py-3 rounded-xl border border-surface-border bg-white dark:bg-slate-800 text-ink-secondary hover:text-fuchsia-700 hover:border-fuchsia-300 text-sm font-semibold transition-colors"
            >
              Explain another variant or report
            </button>
          </div>
        )}

        {/* ── Static FAQ section (SEO) ──────────────────────────────── */}
        <section className="mt-16">
          <div className="text-center mb-8">
            <span className="inline-block px-3 py-1 rounded-full bg-fuchsia-100 dark:bg-fuchsia-900/30 text-fuchsia-700 dark:text-fuchsia-400 text-[11px] font-bold uppercase tracking-wider mb-3">
              FAQ
            </span>
            <h2 className="text-2xl sm:text-3xl font-extrabold text-ink tracking-tight">
              Common questions about genetic variants
            </h2>
            <p className="mt-2 text-sm text-ink-secondary max-w-xl mx-auto">
              The most-searched questions about the variants people care about most.
            </p>
          </div>
          <div className="space-y-3">
            {FAQ_ENTRIES.map((f, i) => (
              <FaqItem key={i} q={f.q} a={f.a} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

// ── Collapsible FAQ item ────────────────────────────────────────────────────

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <details
      open={open}
      onToggle={(e) => setOpen((e.target as HTMLDetailsElement).open)}
      className="bg-white dark:bg-slate-800 rounded-2xl border border-surface-border overflow-hidden shadow-sm"
    >
      <summary className="cursor-pointer list-none px-5 py-4 flex items-center justify-between gap-3 hover:bg-surface-raised">
        <h3 className="text-sm sm:text-base font-semibold text-ink leading-snug">{q}</h3>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 text-ink-tertiary flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </summary>
      <div className="px-5 pb-5 pt-0 border-t border-surface-border">
        <p className="text-sm text-ink-secondary leading-relaxed pt-4">{a}</p>
      </div>
    </details>
  );
}
