"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage, LANGUAGES, type LangCode } from "@/contexts/LanguageContext";

// Globe icon
function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.6"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <circle cx="10" cy="10" r="8" />
      <path d="M10 2a13.5 13.5 0 0 1 0 16M10 2a13.5 13.5 0 0 0 0 16M2 10h16" />
    </svg>
  );
}

// Chevron icon
function ChevronIcon({ open }: { open: boolean }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="currentColor"
      className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}
    >
      <path
        fillRule="evenodd"
        d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
        clipRule="evenodd"
      />
    </svg>
  );
}

interface Props {
  /** When true, renders a compact icon-only trigger (for tight nav bars). */
  compact?: boolean;
}

export default function LanguageSwitcher({ compact = false }: Props) {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => setMounted(true), []);

  // Close on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);

  function select(code: LangCode) {
    if (code === lang) {
      setOpen(false);
      return;
    }
    setLang(code);
    setOpen(false);
    window.location.reload();
  }

  // Show a stable skeleton while mounting to avoid hydration mismatch
  if (!mounted) {
    return <div className="w-9 h-9" />;
  }

  const currentNative = LANGUAGES[lang]?.native ?? lang.toUpperCase();

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Switch language"
        aria-expanded={open}
        className={`flex items-center gap-1.5 rounded-lg text-ink-secondary hover:text-ink hover:bg-surface-raised transition-colors ${
          compact ? "w-9 h-9 justify-center" : "px-2.5 py-1.5 text-xs font-semibold"
        }`}
      >
        <GlobeIcon className="w-4 h-4 flex-shrink-0" />
        {!compact && (
          <>
            <span className="hidden sm:inline">{currentNative}</span>
            <ChevronIcon open={open} />
          </>
        )}
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 w-52 bg-white dark:bg-slate-900 border border-surface-border rounded-2xl shadow-xl shadow-ink/10 overflow-hidden z-50 py-1.5"
          role="listbox"
          aria-label="Language options"
        >
          {(Object.entries(LANGUAGES) as [LangCode, { english: string; native: string }][]).map(
            ([code, { english, native }]) => {
              const isSelected = code === lang;
              return (
                <button
                  key={code}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => select(code)}
                  className={`w-full flex items-center justify-between gap-3 px-4 py-2.5 text-left transition-colors ${
                    isSelected
                      ? "bg-brand-blue/8 text-brand-blue"
                      : "text-ink hover:bg-surface-raised"
                  }`}
                >
                  <span className="text-sm font-medium">{native}</span>
                  <span className="text-xs text-ink-tertiary">{english}</span>
                  {isSelected && (
                    <svg
                      viewBox="0 0 16 16"
                      fill="currentColor"
                      className="w-3.5 h-3.5 flex-shrink-0 text-brand-blue"
                    >
                      <path
                        fillRule="evenodd"
                        d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z"
                        clipRule="evenodd"
                      />
                    </svg>
                  )}
                </button>
              );
            },
          )}
        </div>
      )}
    </div>
  );
}
