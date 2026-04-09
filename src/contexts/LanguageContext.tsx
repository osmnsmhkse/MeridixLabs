"use client";

import { createContext, useContext, useState, useEffect } from "react";

export const LANGUAGES: Record<string, { english: string; native: string }> = {
  en: { english: "English",    native: "English"    },
  es: { english: "Spanish",    native: "Español"    },
  tr: { english: "Turkish",    native: "Türkçe"     },
  fr: { english: "French",     native: "Français"   },
  de: { english: "German",     native: "Deutsch"    },
  ar: { english: "Arabic",     native: "العربية"    },
  ja: { english: "Japanese",   native: "日本語"      },
  pt: { english: "Portuguese", native: "Português"  },
  it: { english: "Italian",    native: "Italiano"   },
  zh: { english: "Chinese",    native: "中文"        },
};

export type LangCode = keyof typeof LANGUAGES;

export const LANGUAGE_NAMES_FOR_PROMPT: Record<string, string> = {
  en: "English",
  es: "Spanish",
  tr: "Turkish",
  fr: "French",
  de: "German",
  ar: "Arabic",
  ja: "Japanese",
  pt: "Portuguese",
  it: "Italian",
  zh: "Simplified Chinese",
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
