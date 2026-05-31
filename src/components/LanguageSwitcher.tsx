"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage, LANGUAGES, type LangCode } from "@/contexts/LanguageContext";

// Script mark — the letters "A" / "文" set as two-tone text, evoking
// translation between scripts without reproducing any app logo.
function ScriptMark({ className }: { className?: string }) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex items-center font-semibold leading-none tracking-tight select-none ${className ?? ""}`}
    >
      <span>A</span>
      <span className="text-brand-blue">文</span>
    </span>
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
  /**
   * When true, the language list expands inline (no floating dropdown).
   * Use inside mobile menus where an absolute-positioned dropdown would be clipped.
   */
  inline?: boolean;
}

export default function LanguageSwitcher({ compact = false, inline = false }: Props) {
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

  // ── Inline mode (used inside mobile menus to avoid overflow clipping) ────────
  if (inline) {
    return (
      <div className="w-full">
        <button
          onClick={() => setOpen(!open)}
          aria-expanded={open}
          className="w-full flex items-center gap-2 py-2.5 px-4 rounded-lg text-sm font-medium text-ink-secondary hover:text-ink hover:bg-surface-raised transition-colors"
        >
          <ScriptMark className="text-[15px] flex-shrink-0" />
          <span className="flex-1 text-left">{currentNative}</span>
          <ChevronIcon open={open} />
        </button>
        {open && (
          <div className="mt-1 mx-2 rounded-xl border border-surface-border bg-surface-raised/60 overflow-hidden">
            {(Object.entries(LANGUAGES) as [LangCode, { english: string; native: string }][]).map(
              ([code, { english, native }]) => {
                const isSelected = code === lang;
                return (
                  <button
                    key={code}
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
                      <svg viewBox="0 0 16 16" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0 text-brand-blue">
                        <path fillRule="evenodd" d="M12.207 4.793a1 1 0 010 1.414l-5 5a1 1 0 01-1.414 0l-2-2a1 1 0 011.414-1.414L6.5 9.086l4.293-4.293a1 1 0 011.414 0z" clipRule="evenodd" />
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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        aria-label="Switch language"
        aria-expanded={open}
        className="flex items-center gap-1.5 px-2 py-1.5 rounded-lg text-ink-secondary hover:text-ink hover:bg-surface-raised transition-colors text-xs font-semibold"
      >
        <ScriptMark className="text-[15px] flex-shrink-0" />
        <span>{lang.toUpperCase()}</span>
        <ChevronIcon open={open} />
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
