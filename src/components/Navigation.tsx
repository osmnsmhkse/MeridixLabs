"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { useLanguage, LANGUAGES, LangCode } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { track } from "@/lib/track";

// ── Tool definitions ───────────────────────────────────────────────────────

const TOOLS = [
  {
    href: "/app",
    label: "Lab Analyzer",
    description: "Upload a blood test and get a plain-English explanation",
    color: "text-brand-blue",
    bg: "bg-brand-blue-light dark:bg-brand-blue/10",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/symptom",
    label: "Symptom Checker",
    description: "Understand what a symptom most likely means before you Google it",
    color: "text-emerald-600 dark:text-emerald-400",
    bg: "bg-emerald-50 dark:bg-emerald-900/20",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/diagnosed",
    label: "Diagnosis Explainer",
    description: "Just got a diagnosis? Learn what it means for your life",
    color: "text-violet-600 dark:text-violet-400",
    bg: "bg-violet-50 dark:bg-violet-900/20",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
      </svg>
    ),
  },
  {
    href: "/trends",
    label: "Trend Tracker",
    description: "Track how your biomarkers change over time across tests",
    color: "text-amber-600 dark:text-amber-400",
    bg: "bg-amber-50 dark:bg-amber-900/20",
    icon: (
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
        <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
      </svg>
    ),
  },
];

// ── Theme toggle ───────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;
  return (
    <button
      onClick={toggle}
      aria-label="Toggle dark mode"
      className="relative w-9 h-9 flex items-center justify-center rounded-lg text-ink-secondary hover:text-ink hover:bg-surface-raised transition-colors"
    >
      <Sun className={`absolute w-4 h-4 transition-all duration-300 ${theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}`} />
      <Moon className={`absolute w-4 h-4 transition-all duration-300 ${theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"}`} />
    </button>
  );
}

// ── Language selector ──────────────────────────────────────────────────────

function LanguageSelector() {
  const { lang, setLang } = useLanguage();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const currentLang = LANGUAGES[lang] ?? LANGUAGES["en"];

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-ink-secondary hover:text-ink hover:bg-surface-raised transition-colors"
        aria-label="Select language"
      >
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4 flex-shrink-0">
          <circle cx="10" cy="10" r="8" />
          <path d="M10 2c-2 3-2 13 0 16M10 2c2 3 2 13 0 16M2 10h16" strokeLinecap="round" />
        </svg>
        <span className="font-medium text-sm hidden sm:inline">{currentLang.english}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 flex-shrink-0 transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-56 bg-surface-raised dark:bg-slate-800 border border-surface-border dark:border-slate-700 rounded-xl shadow-lg shadow-ink/8 overflow-hidden z-50">
          <div className="px-3 py-2 border-b border-surface-border dark:border-slate-700">
            <p className="text-[10px] font-semibold text-ink-tertiary uppercase tracking-widest">Language</p>
          </div>
          <div className="p-1.5 max-h-80 overflow-y-auto">
            {Object.entries(LANGUAGES).map(([code, names]) => (
              <button
                key={code}
                onClick={() => { track("language_changed", { from: lang, to: code }); setLang(code as LangCode); setOpen(false); }}
                className={`w-full text-left flex items-center justify-between px-3 py-2.5 rounded-lg transition-colors ${
                  lang === code
                    ? "bg-brand-blue-light dark:bg-brand-blue/20 text-brand-blue"
                    : "text-ink-secondary hover:bg-surface-raised dark:hover:bg-slate-700 hover:text-ink"
                }`}
              >
                <div className="flex flex-col">
                  <span className={`text-sm font-medium ${lang === code ? "text-brand-blue" : "text-ink"}`}>
                    {names.english}
                  </span>
                  {names.native !== names.english && (
                    <span className={`text-xs mt-0.5 ${lang === code ? "text-brand-blue/70" : "text-ink-tertiary"}`}>
                      {names.native}
                    </span>
                  )}
                </div>
                {lang === code && (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-blue flex-shrink-0">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                )}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ── Tools dropdown ─────────────────────────────────────────────────────────

function ToolsDropdown({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const isToolActive = TOOLS.some((t) => pathname === t.href);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
          isToolActive ? "text-brand-blue" : "text-ink-secondary hover:text-ink"
        }`}
      >
        Tools
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-1/2 -translate-x-1/2 top-full mt-3 w-80 bg-white dark:bg-slate-900 border border-surface-border rounded-2xl shadow-xl shadow-ink/10 overflow-hidden z-50">
          <div className="p-2">
            {TOOLS.map((tool) => (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => setOpen(false)}
                className={`flex items-start gap-3 px-3 py-3 rounded-xl transition-colors group ${
                  pathname === tool.href
                    ? "bg-surface-raised"
                    : "hover:bg-surface-raised"
                }`}
              >
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 mt-0.5 ${tool.bg} ${tool.color}`}>
                  {tool.icon}
                </div>
                <div>
                  <p className={`text-sm font-semibold ${pathname === tool.href ? tool.color : "text-ink"}`}>
                    {tool.label}
                  </p>
                  <p className="text-xs text-ink-tertiary mt-0.5 leading-relaxed">{tool.description}</p>
                </div>
              </Link>
            ))}
          </div>
          <div className="px-4 py-3 border-t border-surface-border bg-surface-raised">
            <p className="text-[11px] text-ink-tertiary text-center">More tools coming soon</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main navigation ────────────────────────────────────────────────────────

const FLAT_LINKS = [
  { href: "/learn", label: "Practice" },
  { href: "/blog",  label: "Blog"     },
  { href: "/about", label: "About"    },
];

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => pathname === path;
  const isToolActive = TOOLS.some((t) => pathname === t.href);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm shadow-ink/5 border-b border-surface-border"
          : "bg-white dark:bg-slate-900"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">

          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0">
            <Image
              src="/meridix-logo-light.svg"
              alt="Meridix Labs"
              width={160}
              height={41}
              priority
              className="block dark:hidden"
            />
            <Image
              src="/meridix-logo-dark.svg"
              alt="Meridix Labs"
              width={160}
              height={41}
              priority
              className="hidden dark:block"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-6">
            <ToolsDropdown pathname={pathname} />
            {FLAT_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive(link.href) ? "text-brand-blue" : "text-ink-secondary hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <LanguageSelector />
            <Link
              href="/for-doctors"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 border font-semibold rounded-lg text-sm transition-all duration-200 ${
                isActive("/for-doctors")
                  ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                  : "border-slate-200 dark:border-slate-700 text-ink-secondary hover:border-brand-blue hover:text-brand-blue"
              }`}
            >
              For Doctors
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-4 py-2 bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold rounded-lg text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-brand-blue/20"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
              </svg>
              Analyze Results
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden text-ink-secondary p-2 rounded-lg hover:bg-surface-raised transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Toggle menu"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>

        {/* Mobile menu */}
        {mobileOpen && (
          <div className="md:hidden border-t border-surface-border py-3 space-y-1">
            {/* Tools section in mobile */}
            <button
              onClick={() => setMobileToolsOpen(!mobileToolsOpen)}
              className={`w-full flex items-center justify-between py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                isToolActive
                  ? "text-brand-blue bg-brand-blue-light dark:bg-brand-blue/20"
                  : "text-ink-secondary hover:text-ink hover:bg-surface-raised"
              }`}
            >
              Tools
              <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${mobileToolsOpen ? "rotate-180" : ""}`}>
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {mobileToolsOpen && (
              <div className="ml-4 space-y-1 pb-1">
                {TOOLS.map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    onClick={() => setMobileOpen(false)}
                    className={`flex items-center gap-3 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                      isActive(tool.href)
                        ? `${tool.color} bg-surface-raised`
                        : "text-ink-secondary hover:text-ink hover:bg-surface-raised"
                    }`}
                  >
                    <span className={`${isActive(tool.href) ? tool.color : "text-ink-tertiary"}`}>{tool.icon}</span>
                    {tool.label}
                  </Link>
                ))}
              </div>
            )}

            {FLAT_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "text-brand-blue bg-brand-blue-light dark:bg-brand-blue/20"
                    : "text-ink-secondary hover:text-ink hover:bg-surface-raised"
                }`}
              >
                {link.label}
              </Link>
            ))}

            <Link
              href="/for-doctors"
              onClick={() => setMobileOpen(false)}
              className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-colors border ${
                isActive("/for-doctors")
                  ? "text-brand-blue border-brand-blue bg-brand-blue/10"
                  : "text-ink-secondary border-slate-200 dark:border-slate-700 hover:border-brand-blue hover:text-brand-blue"
              }`}
            >
              For Doctors
            </Link>

            <div className="px-4 py-2 flex items-center gap-2">
              <ThemeToggle />
              <LanguageSelector />
            </div>

            <Link
              href="/app"
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 px-4 bg-brand-blue text-white font-semibold rounded-lg text-sm text-center"
            >
              Analyze My Results
            </Link>
          </div>
        )}
      </div>
    </header>
  );
}
