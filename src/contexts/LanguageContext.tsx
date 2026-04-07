"use client";

import { createContext, useContext, useState, useEffect } from "react";

export const LANGUAGES = {
  en: "English",
  es: "Español",
  de: "Deutsch",
  fr: "Français",
  it: "Italiano",
  tr: "Türkçe",
  ru: "Русский",
  zh: "中文",
  ja: "日本語",
  ar: "العربية",
} as const;

export type LangCode = keyof typeof LANGUAGES;

export const LANGUAGE_NAMES_FOR_PROMPT: Record<LangCode, string> = {
  en: "English",
  es: "Spanish",
  de: "German",
  fr: "French",
  it: "Italian",
  tr: "Turkish",
  ru: "Russian",
  zh: "Simplified Chinese",
  ja: "Japanese",
  ar: "Arabic",
};

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
    const stored = localStorage.getItem("meridix-lang") as LangCode;
    if (stored && LANGUAGES[stored]) setLangState(stored);
  }, []);

  const setLang = (l: LangCode) => {
    setLangState(l);
    localStorage.setItem("meridix-lang", l);
  };

  return (
    <LanguageContext.Provider value={{ lang, setLang }}>
      {children}
    </LanguageContext.Provider>
  );
}

export const useLanguage = () => useContext(LanguageContext);
