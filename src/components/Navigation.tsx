"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { useLanguage, LANGUAGES, LangCode } from "@/contexts/LanguageContext";
import { useTheme } from "@/contexts/ThemeContext";
import { track } from "@/lib/track";

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

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => pathname === path;

  const navLinks = [
    { href: "/app",     label: "Analyze",       mobileOnly: false },
    { href: "/learn",   label: "Practice",      mobileOnly: false },
    { href: "/trends",  label: "Trend Tracker", mobileOnly: false },
    { href: "/blog",    label: "Blog",          mobileOnly: false },
    { href: "/about",   label: "About",         mobileOnly: false },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-md shadow-sm shadow-ink/5 border-b border-surface-border"
          : "bg-white dark:bg-slate-900"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">

          {/* Logo — light/dark variants swapped via CSS to avoid hydration mismatch */}
          <Link href="/" className="flex items-center">
            <Image
              src="/meridix-logo-light.svg"
              alt="Meridix Labs"
              width={200}
              height={51}
              priority
              className="block dark:hidden"
            />
            <Image
              src="/meridix-logo-dark.svg"
              alt="Meridix Labs"
              width={200}
              height={51}
              priority
              className="hidden dark:block"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-5">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors whitespace-nowrap ${
                  isActive(link.href)
                    ? "text-brand-blue"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side: theme toggle + language + CTAs */}
          <div className="hidden md:flex items-center gap-2">
            <ThemeToggle />
            <LanguageSelector />
            <Link
              href="/for-doctors"
              className={`inline-flex items-center gap-1.5 px-4 py-2 border font-semibold rounded-lg text-sm transition-all duration-200 ${
                isActive("/for-doctors")
                  ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                  : "border-slate-300 dark:border-slate-600 text-ink-secondary hover:border-brand-blue hover:text-brand-blue"
              }`}
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 flex-shrink-0">
                <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
              </svg>
              For Doctors
            </Link>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold rounded-lg text-sm transition-all duration-200 shadow-sm hover:shadow-md hover:shadow-brand-blue/20"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
              </svg>
              Analyze My Results
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
            {navLinks.map((link) => (
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
