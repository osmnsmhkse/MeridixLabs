"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { useLanguage, LANGUAGES, LangCode } from "@/contexts/LanguageContext";

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

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm text-ink-secondary hover:text-ink hover:bg-surface-raised transition-colors"
        aria-label="Select language"
      >
        {/* Globe icon */}
        <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-4 h-4">
          <circle cx="10" cy="10" r="8" />
          <path d="M10 2c-2 3-2 13 0 16M10 2c2 3 2 13 0 16M2 10h16" strokeLinecap="round" />
        </svg>
        <span className="font-medium uppercase text-xs tracking-wide">{lang}</span>
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 transition-transform ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-48 bg-white border border-surface-border rounded-xl shadow-lg shadow-ink/8 overflow-hidden z-50">
          <div className="p-1.5">
            {(Object.entries(LANGUAGES) as [LangCode, string][]).map(([code, name]) => (
              <button
                key={code}
                onClick={() => { setLang(code); setOpen(false); }}
                className={`w-full text-left flex items-center justify-between px-3 py-2 rounded-lg text-sm transition-colors ${
                  lang === code
                    ? "bg-brand-blue-light text-brand-blue font-semibold"
                    : "text-ink-secondary hover:bg-surface-raised hover:text-ink"
                }`}
              >
                <span>{name}</span>
                {lang === code && (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-blue">
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
    { href: "/",      label: "Home"    },
    { href: "/app",   label: "Analyze" },
    { href: "/about", label: "About"   },
  ];

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled
          ? "bg-white/95 backdrop-blur-md shadow-sm shadow-ink/5 border-b border-surface-border"
          : "bg-white"
      }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-18">

          {/* Logo */}
          <Link href="/" className="flex items-center">
            <Image
              src="/meridixlabs-logo-primary.svg"
              alt="Meridix Labs"
              width={213}
              height={40}
              priority
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-7">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors ${
                  isActive(link.href)
                    ? "text-brand-blue"
                    : "text-ink-secondary hover:text-ink"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side: language + CTA */}
          <div className="hidden md:flex items-center gap-2">
            <LanguageSelector />
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
                    ? "text-brand-blue bg-brand-blue-light"
                    : "text-ink-secondary hover:text-ink hover:bg-surface-raised"
                }`}
              >
                {link.label}
              </Link>
            ))}
            <div className="px-4 py-2">
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
