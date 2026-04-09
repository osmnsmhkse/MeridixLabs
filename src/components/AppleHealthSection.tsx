"use client";

import { useState, useEffect, useRef } from "react";

function useIsIOS() {
  const [isIOS, setIsIOS] = useState(false);
  useEffect(() => {
    const ua = navigator.userAgent;
    setIsIOS(
      /iPad|iPhone|iPod/.test(ua) ||
      (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1)
    );
  }, []);
  return isIOS;
}

function HeartIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
      <path d="M11.645 20.91l-.007-.003-.022-.012a15.247 15.247 0 01-.383-.218 25.18 25.18 0 01-4.244-3.17C4.688 15.36 2.25 12.174 2.25 8.25 2.25 5.322 4.714 3 7.688 3A5.5 5.5 0 0112 5.052 5.5 5.5 0 0116.313 3c2.973 0 5.437 2.322 5.437 5.25 0 3.925-2.438 7.111-4.739 9.256a25.175 25.175 0 01-4.244 3.17 15.247 15.247 0 01-.383.219l-.022.012-.007.004-.003.001a.752.752 0 01-.704 0l-.003-.001z" />
    </svg>
  );
}

const EXPORT_STEPS = [
  {
    step: "01",
    title: "Open the Health app",
    desc: 'Tap the red heart icon on your Home Screen.',
  },
  {
    step: "02",
    title: "Go to your profile",
    desc: 'Tap your profile picture or initials in the top-right corner.',
  },
  {
    step: "03",
    title: "Export All Health Data",
    desc: 'Scroll down and tap "Export All Health Data." This creates a ZIP file.',
  },
  {
    step: "04",
    title: "Share the export here",
    desc: 'Tap "Share" on the export screen, choose "Save to Files," then upload it below. You can also share screenshots of specific health summaries.',
  },
];

interface AppleHealthSectionProps {
  onHealthFileChange: (file: File | null) => void;
  healthFile: File | null;
}

export default function AppleHealthSection({
  onHealthFileChange,
  healthFile,
}: AppleHealthSectionProps) {
  const isIOS = useIsIOS();
  const [showInstructions, setShowInstructions] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const formatSize = (bytes: number) =>
    bytes < 1024 * 1024
      ? `${(bytes / 1024).toFixed(1)} KB`
      : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;

  const handleFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] ?? null;
    onHealthFileChange(f);
  };

  const clearFile = () => {
    onHealthFileChange(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  return (
    <div className="rounded-2xl border border-surface-border bg-gradient-to-br from-red-50/60 to-pink-50/40 dark:from-red-950/20 dark:to-pink-950/10 dark:border-red-900/30 overflow-hidden">
      {/* Header */}
      <div className="px-5 pt-4 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-red-500 flex items-center justify-center flex-shrink-0 text-white mt-0.5">
            <HeartIcon />
          </div>
          <div>
            <p className="text-sm font-bold text-ink">Have wearable data?</p>
            <p className="text-xs text-ink-secondary mt-0.5 leading-relaxed">
              Combine it with your lab results for a fuller picture.
            </p>
          </div>
        </div>
        {/* Platform badge */}
        {isIOS ? (
          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[10px] font-bold">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
            Ready
          </span>
        ) : (
          <span className="flex-shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 text-[10px] font-semibold">
            iOS Only
          </span>
        )}
      </div>

      {isIOS ? (
        /* ── iOS: full import UI ────────────────────────────── */
        <div className="px-5 pb-4 space-y-3">
          {/* Active health file chip */}
          {healthFile ? (
            <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white dark:bg-slate-800 border border-red-200 dark:border-red-800">
              <div className="w-8 h-8 rounded-lg bg-red-100 dark:bg-red-900/30 flex items-center justify-center flex-shrink-0 text-red-500">
                <HeartIcon />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-ink truncate">{healthFile.name}</p>
                <p className="text-xs text-ink-tertiary">{formatSize(healthFile.size)} · Health export</p>
              </div>
              <button
                onClick={clearFile}
                className="text-ink-tertiary hover:text-ink-secondary p-1.5 rounded-lg hover:bg-surface-raised flex-shrink-0"
                aria-label="Remove health file"
              >
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
          ) : (
            /* Import button */
            <>
              <input
                ref={fileRef}
                type="file"
                accept="application/pdf,image/*,.zip"
                className="hidden"
                onChange={handleFile}
              />
              <button
                onClick={() => fileRef.current?.click()}
                className="w-full flex items-center justify-center gap-2.5 py-3.5 px-4 rounded-xl bg-white dark:bg-slate-800 border border-red-200 dark:border-red-700 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:border-red-300 font-semibold text-sm transition-all duration-200"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-5 h-5 flex-shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
                Import Apple Health Data
              </button>
            </>
          )}

          {/* Instructions toggle */}
          <button
            onClick={() => setShowInstructions(!showInstructions)}
            className="w-full flex items-center justify-between text-xs text-ink-tertiary hover:text-ink-secondary transition-colors py-0.5"
          >
            <span className="flex items-center gap-1.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              How to export from Apple Health
            </span>
            <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-transform ${showInstructions ? "rotate-180" : ""}`}>
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>

          {showInstructions && (
            <div className="bg-white dark:bg-slate-800 rounded-xl border border-surface-border p-4 space-y-3.5">
              {EXPORT_STEPS.map((s) => (
                <div key={s.step} className="flex gap-3">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 text-[11px] font-bold flex items-center justify-center mt-0.5">
                    {s.step}
                  </span>
                  <div>
                    <p className="text-xs font-semibold text-ink">{s.title}</p>
                    <p className="text-xs text-ink-tertiary mt-0.5 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
              <p className="text-[11px] text-ink-tertiary border-t border-surface-border pt-3 leading-relaxed">
                You can also upload a screenshot or PDF of specific health metrics — like your heart rate trends, step count, or sleep summary.
              </p>
            </div>
          )}

          {/* What the AI will do */}
          {healthFile && (
            <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-red-50/80 dark:bg-red-900/20 border border-red-100 dark:border-red-800">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-xs text-red-700 dark:text-red-300 leading-relaxed">
                <strong>Cross-reference mode on.</strong> The AI will look for connections between your wearable data and your lab values — like resting heart rate patterns, sleep trends, or activity levels that may explain certain findings.
              </p>
            </div>
          )}
        </div>
      ) : (
        /* ── Non-iOS: coming soon note ──────────────────────── */
        <div className="px-5 pb-4">
          <div className="flex items-start gap-2.5 px-4 py-3.5 rounded-xl bg-white/70 dark:bg-slate-800/60 border border-surface-border">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ink-tertiary flex-shrink-0 mt-0.5">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
            </svg>
            <p className="text-xs text-ink-secondary leading-relaxed">
              <strong>Currently available for Apple Health.</strong> Google Fit and Garmin Connect support coming soon.
              <br />
              <span className="text-ink-tertiary">Open this page on your iPhone or iPad to import health data.</span>
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
