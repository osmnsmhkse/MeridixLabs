"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useLanguage, LANGUAGES } from "@/contexts/LanguageContext";

type Tier = "simple" | "medium" | "expert";

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

const LOADING_STEPS = [
  "Reading your lab report…",
  "Identifying test markers…",
  "Comparing values to reference ranges…",
  "Flagging anything out of range…",
  "Analyzing possible causes…",
  "Explaining the biology behind your results…",
  "Writing your Simple explanation…",
  "Writing your Expert explanation…",
  "Identifying which specialist to see…",
  "Preparing your recommendations…",
  "Almost done…",
];

function LoadingAnimation() {
  const [stepIndex, setStepIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStepIndex((i) => (i < LOADING_STEPS.length - 1 ? i + 1 : i));
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex flex-col items-center justify-center py-20 gap-6">
      <div className="relative w-20 h-20">
        <div className="absolute inset-0 border-4 border-brand-blue/20 rounded-full" />
        <div className="absolute inset-0 border-4 border-brand-blue border-t-transparent rounded-full animate-spin" />
        <div className="absolute inset-2 border-2 border-brand-blue/30 border-b-transparent rounded-full animate-spin [animation-direction:reverse] [animation-duration:1.5s]" />
        <div className="absolute inset-0 flex items-center justify-center">
          <svg viewBox="0 0 24 24" fill="none" className="w-7 h-7 text-brand-blue" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3" />
          </svg>
        </div>
      </div>

      <div className="text-center min-h-[52px]">
        <p className="text-ink font-semibold text-lg transition-all duration-500">
          {LOADING_STEPS[stepIndex]}
        </p>
        <p className="text-ink-tertiary text-sm mt-1">This usually takes 15–25 seconds</p>
      </div>

      <div className="flex items-center gap-1.5">
        {LOADING_STEPS.map((_, i) => (
          <div key={i} className={`rounded-full transition-all duration-300 ${
            i === stepIndex ? "w-4 h-2 bg-brand-blue" : i < stepIndex ? "w-2 h-2 bg-brand-blue/40" : "w-2 h-2 bg-surface-border"
          }`} />
        ))}
      </div>

      <div className="w-full max-w-md space-y-3 mt-2">
        {[100, 75, 88].map((w, i) => (
          <div key={i} className="h-3 rounded-full shimmer" style={{ width: `${w}%` }} />
        ))}
      </div>
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

function DeepDiveSection({ result }: { result: AnalysisResult }) {
  const [open, setOpen] = useState(true);

  const sections = [
    {
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
      ),
      color: "text-amber-600 bg-amber-50",
      label: "Possible Causes",
      sublabel: "What could lead to these results?",
      content: result.etiology,
    },
    {
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.255 0-2.443.29-3.5.804V12a1 1 0 11-2 0V4.804z" />
        </svg>
      ),
      color: "text-brand-blue bg-brand-blue-light",
      label: "Body Mechanism",
      sublabel: "What's happening inside your body?",
      content: result.mechanism,
    },
    {
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
          <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h4a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
        </svg>
      ),
      color: "text-purple-600 bg-purple-50",
      label: "Associated Conditions",
      sublabel: "What conditions could be related?",
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
          {result.specialist && (
            <div className="p-5 bg-brand-blue-light/50">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
                    <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                  </svg>
                </div>
                <div>
                  <p className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-1">Which Specialist to See</p>
                  <p className="text-sm text-ink-secondary leading-relaxed">{result.specialist}</p>
                </div>
              </div>
            </div>
          )}

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

function ResultsPanel({ result, fileName, onReset }: { result: AnalysisResult; fileName: string; onReset: () => void }) {
  const [activeTier, setActiveTier] = useState<Tier>("simple");
  const paragraphs = result[activeTier].split(/\n+/).filter(Boolean);

  return (
    <div className="animate-fade-in space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-brand-blue/10 rounded-xl flex items-center justify-center">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-brand-blue">
              <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
              <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold text-ink truncate max-w-[200px] sm:max-w-sm">{fileName}</p>
            <p className="text-xs text-ink-tertiary">Analysis complete</p>
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

      {/* Flagged values */}
      {result.flags && result.flags.length > 0 && (
        <div className="bg-white rounded-2xl border border-surface-border overflow-hidden shadow-sm">
          <div className="px-5 py-3.5 border-b border-surface-border bg-surface-raised">
            <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">Flagged values</p>
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
      <DeepDiveSection result={result} />

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

      {/* Disclaimer */}
      <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 border border-amber-100">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>
        <p className="text-xs text-amber-700 leading-relaxed">
          <strong>Meridix Labs is an educational tool.</strong> This is not medical advice. Always consult a qualified physician.
        </p>
      </div>
    </div>
  );
}

function UploadZone({ onFileSelect, error }: { onFileSelect: (file: File) => void; error: string | null }) {
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
              onClick={(e) => { e.stopPropagation(); setPreview(null); setSelectedFile(null); if (inputRef.current) inputRef.current.value = ""; }}
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

      {error && (
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-red-50 border border-red-100">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {preview && (
        <button
          onClick={() => selectedFile && onFileSelect(selectedFile)}
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

export default function AppPage() {
  const { lang } = useLanguage();
  const [state, setState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");

  const handleFileSelect = async (file: File) => {
    setFileName(file.name);
    setError(null);
    setState("loading");

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("language", lang);

      const res = await fetch("/api/analyze", { method: "POST", body: formData });
      const json = await res.json();

      if (!res.ok) throw new Error(json.error || "Analysis failed. Please try again.");

      setResult(json.data);
      setState("success");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
      setState("error");
    }
  };

  const handleReset = () => { setState("idle"); setResult(null); setError(null); setFileName(""); };

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-blue-light to-white pt-24 pb-20">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Page header */}
        <div className="text-center mb-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white border border-brand-blue/30 text-brand-blue text-xs font-semibold uppercase tracking-wider mb-4 shadow-sm">
            AI Lab Interpreter
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight">Analyze your results</h1>
          <p className="mt-3 text-lg text-ink-secondary max-w-xl mx-auto">
            Upload a photo or PDF of your lab report. Get a full explanation — causes, mechanisms, and which doctor to see.
          </p>
          {lang !== "en" && (
            <div className="mt-3 inline-flex items-center gap-1.5 text-xs text-brand-blue bg-brand-blue-light px-3 py-1.5 rounded-full border border-brand-blue-mid">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-3.5 h-3.5">
                <circle cx="10" cy="10" r="8" /><path d="M10 2c-2 3-2 13 0 16M10 2c2 3 2 13 0 16M2 10h16" strokeLinecap="round" />
              </svg>
              Results will be in {LANGUAGES[lang]}
            </div>
          )}
        </div>

        {/* Main card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-ink/5 border border-surface-border p-6 sm:p-8">
          {state === "idle" || state === "error" ? (
            <UploadZone onFileSelect={handleFileSelect} error={state === "error" ? error : null} />
          ) : state === "loading" ? (
            <LoadingAnimation />
          ) : result ? (
            <ResultsPanel result={result} fileName={fileName} onReset={handleReset} />
          ) : null}
        </div>

        {/* Trust badges */}
        {(state === "idle" || state === "error") && (
          <div className="mt-8 flex flex-wrap items-center justify-center gap-5 text-xs text-ink-tertiary">
            {[
              { icon: "🔒", label: "Never stored" },
              { icon: "✓",  label: "No account required" },
              { icon: "🤖", label: "Powered by Claude AI" },
              { icon: "⚡", label: "Results in seconds" },
              { icon: "🌍", label: "10 languages" },
            ].map((b) => (
              <span key={b.label} className="flex items-center gap-1.5">
                <span>{b.icon}</span>
                {b.label}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
