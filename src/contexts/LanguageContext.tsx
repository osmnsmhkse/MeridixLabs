"use client";

import { createContext, useContext, useState, useEffect } from "react";

export const LANGUAGES: Record<string, { english: string; native: string }> = {
  en: { english: "English", native: "English"  },
  es: { english: "Spanish", native: "Español"  },
  tr: { english: "Turkish", native: "Türkçe"   },
  fr: { english: "French",  native: "Français" },
  de: { english: "German",  native: "Deutsch"  },
  ar: { english: "Arabic",  native: "العربية"  },
  ru: { english: "Russian", native: "Русский"  },
  it: { english: "Italian", native: "Italiano" },
  zh: { english: "Chinese", native: "中文"      },
};

export type LangCode = keyof typeof LANGUAGES;

export const LANGUAGE_NAMES_FOR_PROMPT: Record<string, string> = {
  en: "English",
  es: "Spanish",
  tr: "Turkish",
  fr: "French",
  de: "German",
  ar: "Arabic",
  ru: "Russian",
  it: "Italian",
  zh: "Simplified Chinese",
};

// ── Cookie helpers ─────────────────────────────────────────────────────────

function getLocaleCookie(): LangCode | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(/(?:^|;\s*)meridix-locale=([^;]+)/);
  const val = match?.[1];
  return val && val in LANGUAGES ? (val as LangCode) : null;
}

function setLocaleCookie(lang: LangCode) {
  document.cookie = `meridix-locale=${lang};path=/;max-age=31536000;SameSite=Lax`;
}

// ── Context ────────────────────────────────────────────────────────────────

interface LanguageContextType {
  lang: LangCode;
  setLang: (l: LangCode) => void;
}

const LanguageContext = createContext<LanguageContextType>({
  lang: "en",
  setLang: () => {},
});

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [lang, setLangState] = useState<LangCode>("en");

  useEffect(() => {
    // Prefer the cookie (kept in sync with next-intl server locale),
    // fall back to the legacy localStorage key for existing users.
    const fromCookie = getLocaleCookie();
    const fromStorage = localStorage.getItem("meridix-lang") as LangCode | null;
    const resolved: LangCode =
      fromCookie ??
      (fromStorage && LANGUAGES[fromStorage] ? (fromStorage as LangCode) : null) ??
      "en";

    setLangState(resolved);
    // Ensure both storage mechanisms stay in sync.
    setLocaleCookie(resolved);
    localStorage.setItem("meridix-lang", resolved);
  }, []);

  const setLang = (l: LangCode) => {
    setLangState(l);
    localStorage.setItem("meridix-lang", l);
    setLocaleCookie(l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
