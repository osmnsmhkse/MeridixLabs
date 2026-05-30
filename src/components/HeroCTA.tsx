"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { useLanguage } from "@/contexts/LanguageContext";
import { getAnonId } from "@/lib/track";

// ── Variant config ────────────────────────────────────────────────────────────

type Variant = "A" | "B" | "C";

export const VARIANT_TEXT: Record<Variant, string> = {
  A: "Analyze My Results — Free",
  B: "Understand My Lab Report",
  C: "Get a Free Explanation",
};

const LS_KEY = "ab_variant";

function assignVariant(): Variant {
  const r = Math.random();
  if (r < 1 / 3) return "A";
  if (r < 2 / 3) return "B";
  return "C";
}

// ── Fire-and-forget tracker ───────────────────────────────────────────────────

function trackAB(variant: Variant, action: "shown" | "clicked"): void {
  try {
    fetch("/api/ab-track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ variant, action, anonId: getAnonId() }),
    }).catch(() => {/* silently ignore network errors */});
  } catch {
    // noop — tracking must never break the UI
  }
}

// ── Upload icon (shared between placeholder & live button) ────────────────────

function UploadIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 flex-shrink-0">
      <path
        fillRule="evenodd"
        d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z"
        clipRule="evenodd"
      />
    </svg>
  );
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function HeroCTA() {
  const [variant, setVariant] = useState<Variant | null>(null);
  const trackedShown = useRef(false);
  const router = useRouter();
  const t = useTranslations("Hero");
  const { lang } = useLanguage();

  // Assign or restore variant from localStorage on first client render
  useEffect(() => {
    let v = localStorage.getItem(LS_KEY) as Variant | null;
    if (!v || !["A", "B", "C"].includes(v)) {
      v = assignVariant();
      localStorage.setItem(LS_KEY, v);
    }
    setVariant(v);
  }, []);

  // Fire "shown" exactly once per page load (after variant is resolved)
  useEffect(() => {
    if (variant && !trackedShown.current) {
      trackedShown.current = true;
      trackAB(variant, "shown");
    }
  }, [variant]);

  const handleClick = () => {
    if (variant) trackAB(variant, "clicked");
    router.push("/app");
  };

  const baseClass =
    "inline-flex items-center gap-2 px-8 py-4 bg-brand-blue text-white font-bold rounded-xl text-base shadow-lg shadow-brand-blue/25";

  // For non-English locales use the translated CTA; for English keep A/B variant text.
  const displayText =
    lang !== "en" || !variant ? t("heroCta") : VARIANT_TEXT[variant];

  // Invisible placeholder while hydrating — keeps layout stable (no shift)
  if (!variant) {
    return (
      <button
        className={`${baseClass} opacity-0 pointer-events-none`}
        aria-hidden="true"
        tabIndex={-1}
      >
        <UploadIcon />
        {displayText}
      </button>
    );
  }

  return (
    <button
      onClick={handleClick}
      className={`${baseClass} hover:bg-brand-blue-hover transition-all duration-200 hover:shadow-xl hover:shadow-brand-blue/30 hover:-translate-y-0.5`}
    >
      <UploadIcon />
      {displayText}
    </button>
  );
}
