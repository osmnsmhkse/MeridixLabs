"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { Show, UserButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const AUTH_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const TOOL_HREFS = ["/app", "/symptom", "/diagnosed", "/imaging", "/trends", "/medications", "/visit", "/genetics", "/pediatric", "/womens-health"];

// ── Theme toggle ───────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const t = useTranslations("Nav");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-8 h-8" />;
  return (
    <button
      onClick={toggle}
      aria-label={t("toggleDarkMode")}
      className="relative w-8 h-8 flex items-center justify-center text-ink-secondary hover:text-ink transition-colors"
    >
      <Sun className={`absolute w-4 h-4 transition-all duration-300 ${theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}`} />
      <Moon className={`absolute w-4 h-4 transition-all duration-300 ${theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"}`} />
    </button>
  );
}

// ── Tools dropdown — flat editorial index ──────────────────────────────────

function ToolsDropdown({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations("Nav");

  const TOOLS = [
    { href: "/app",           label: t("labAnalyzer"),         description: t("labAnalyzerDesc") },
    { href: "/symptom",       label: t("symptomChecker"),      description: t("symptomCheckerDesc") },
    { href: "/diagnosed",     label: t("diagnosisExplainer"),  description: t("diagnosisExplainerDesc") },
    { href: "/imaging",       label: t("imagingExplainer"),    description: t("imagingExplainerDesc") },
    { href: "/trends",        label: t("trendTracker"),        description: t("trendTrackerDesc") },
    { href: "/medications",   label: t("medicationCompanion"), description: t("medicationCompanionDesc") },
    { href: "/visit",         label: t("visitCompanion"),      description: t("visitCompanionDesc") },
    { href: "/genetics",      label: t("geneticsExplainer"),   description: t("geneticsExplainerDesc") },
    { href: "/pediatric",     label: t("pediatricCompanion"),  description: t("pediatricCompanionDesc") },
    { href: "/womens-health", label: t("womensHealth"),        description: t("womensHealthDesc") },
  ];

  const isToolActive = TOOLS.some((tool) => pathname === tool.href);

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
        className={`flex items-center gap-1 text-[13.5px] font-medium transition-colors ${
          isToolActive ? "text-ink" : "text-ink-secondary hover:text-ink"
        }`}
      >
        {t("tools")}
        <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3 h-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      </button>

      {open && (
        <div className="absolute left-0 top-full mt-4 w-[640px] bg-surface border border-surface-border rounded-xl shadow-lift overflow-hidden z-50">
          <div className="grid grid-cols-2">
            {TOOLS.map((tool, i) => (
              <Link
                key={tool.href}
                href={tool.href}
                onClick={() => setOpen(false)}
                className={`group flex items-baseline gap-3 px-5 py-3.5 border-surface-border transition-colors hover:bg-surface-raised ${
                  i % 2 === 0 ? "border-r" : ""
                } ${i > 1 ? "border-t" : ""} ${pathname === tool.href ? "bg-surface-raised" : ""}`}
              >
                <span className="kicker-mono text-ink-tertiary tabular-nums flex-shrink-0 w-5">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block text-[13.5px] font-medium text-ink group-hover:text-ink transition-colors">
                    {tool.label}
                  </span>
                  <span className="block text-xs text-ink-tertiary mt-0.5 leading-relaxed truncate">
                    {tool.description}
                  </span>
                </span>
              </Link>
            ))}
          </div>
          <div className="px-5 py-2.5 border-t border-surface-border bg-surface-raised">
            <p className="kicker-mono text-ink-tertiary">{t("moreToolsSoon")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main navigation — quiet full-width bar ─────────────────────────────────

export default function Navigation() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const pathname = usePathname();
  const t = useTranslations("Nav");

  const FLAT_LINKS = [
    { href: "/learn", label: t("practice") },
    { href: "/blog",  label: t("blog")     },
    { href: "/about", label: t("about")    },
  ];

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 12);
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const isActive = (path: string) => pathname === path;
  const isToolActive = TOOL_HREFS.some((href) => pathname === href);

  return (
    <>
    <header
      data-site-nav
      className={`nav-enter fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${
        scrolled || mobileOpen
          ? "glass border-b border-surface-border"
          : "bg-transparent border-b border-transparent"
      }`}
    >
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 h-16 flex items-center gap-8">
        {/* Logo */}
        <Link href="/" className="flex items-center flex-shrink-0">
          <Image
            src="/meridix-logo-light.svg"
            alt="Meridix Labs"
            width={128}
            height={34}
            priority
            className="block dark:hidden"
          />
          <Image
            src="/meridix-logo-dark.svg"
            alt="Meridix Labs"
            width={128}
            height={34}
            priority
            className="hidden dark:block"
          />
        </Link>

        {/* Desktop nav */}
        <nav className="hidden lg:flex items-center gap-6">
          <ToolsDropdown pathname={pathname} />
          {FLAT_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={`text-[13.5px] font-medium transition-colors whitespace-nowrap ${
                isActive(link.href) ? "text-ink" : "text-ink-secondary hover:text-ink"
              }`}
            >
              {link.label}
            </Link>
          ))}
          <Link
            href="/for-doctors"
            className={`text-[13.5px] font-medium transition-colors whitespace-nowrap ${
              isActive("/for-doctors") ? "text-ink" : "text-ink-secondary hover:text-ink"
            }`}
          >
            {t("forDoctors")}
          </Link>
        </nav>

        {/* Right side */}
        <div className="hidden lg:flex items-center gap-3 ms-auto">
          <ThemeToggle />
          <LanguageSwitcher compact />

          {AUTH_ENABLED ? (
            <>
              <Show when="signed-out">
                <Link
                  href="/sign-in"
                  className="hidden lg:inline-flex items-center text-[13.5px] font-medium text-ink-secondary hover:text-ink transition-colors"
                >
                  {t("signIn")}
                </Link>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/dashboard"
                  className={`inline-flex items-center text-[13.5px] font-medium transition-colors ${
                    isActive("/dashboard") ? "text-ink" : "text-ink-secondary hover:text-ink"
                  }`}
                >
                  {t("dashboard")}
                </Link>
                <UserButton appearance={{ elements: { avatarBox: "w-7 h-7" } }} />
              </Show>
            </>
          ) : null}

          <Link
            href="/app"
            className="btn-premium inline-flex items-center px-4 py-2 font-medium text-[13.5px]"
          >
            {t("analyzeResults")}
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button
          className="lg:hidden ms-auto text-ink p-2 transition-colors"
          onClick={() => setMobileOpen(!mobileOpen)}
          aria-label={t("toggleMenu")}
        >
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-5 h-5">
            {mobileOpen
              ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              : <path strokeLinecap="round" strokeLinejoin="round" d="M4 7h16M4 12h16M4 17h16" />}
          </svg>
        </button>
      </div>
    </header>

    {/* Mobile menu — flat sheet */}
    {mobileOpen && (
      <div data-mobile-menu className="lg:hidden fixed left-0 right-0 bottom-0 z-40 bg-surface overflow-y-auto">
        <div className="px-5 py-4">
          {/* Tools section */}
          <button
            onClick={() => setMobileToolsOpen(!mobileToolsOpen)}
            className={`w-full flex items-center justify-between py-3.5 border-b border-surface-border text-[15px] font-medium transition-colors ${
              isToolActive ? "text-ink" : "text-ink-secondary"
            }`}
          >
            {t("tools")}
            <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${mobileToolsOpen ? "rotate-180" : ""}`}>
              <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
          {mobileToolsOpen && (
            <div className="border-b border-surface-border">
              {[
                { href: "/app",           label: t("labAnalyzer")         },
                { href: "/symptom",       label: t("symptomChecker")      },
                { href: "/diagnosed",     label: t("diagnosisExplainer")  },
                { href: "/imaging",       label: t("imagingExplainer")    },
                { href: "/trends",        label: t("trendTracker")        },
                { href: "/medications",   label: t("medicationCompanion") },
                { href: "/visit",         label: t("visitCompanion")      },
                { href: "/genetics",      label: t("geneticsExplainer")   },
                { href: "/pediatric",     label: t("pediatricCompanion")  },
                { href: "/womens-health", label: t("womensHealth")        },
              ].map((tool, i) => (
                <Link
                  key={tool.href}
                  href={tool.href}
                  onClick={() => setMobileOpen(false)}
                  className={`flex items-baseline gap-3 py-3 text-[14px] transition-colors ${
                    isActive(tool.href) ? "text-ink font-medium" : "text-ink-secondary"
                  }`}
                >
                  <span className="kicker-mono text-ink-tertiary tabular-nums">{String(i + 1).padStart(2, "0")}</span>
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
              className={`block py-3.5 border-b border-surface-border text-[15px] font-medium transition-colors ${
                isActive(link.href) ? "text-ink" : "text-ink-secondary"
              }`}
            >
              {link.label}
            </Link>
          ))}

          <Link
            href="/for-doctors"
            onClick={() => setMobileOpen(false)}
            className={`block py-3.5 border-b border-surface-border text-[15px] font-medium transition-colors ${
              isActive("/for-doctors") ? "text-ink" : "text-ink-secondary"
            }`}
          >
            {t("forDoctors")}
          </Link>

          <div className="py-3 flex items-center gap-2 border-b border-surface-border">
            <ThemeToggle />
            <LanguageSwitcher inline />
          </div>

          {AUTH_ENABLED && (
            <div className="border-b border-surface-border">
              <Show when="signed-out">
                <Link
                  href="/sign-in"
                  onClick={() => setMobileOpen(false)}
                  className="block py-3.5 text-[15px] font-medium text-ink-secondary transition-colors"
                >
                  {t("signIn")}
                </Link>
              </Show>
              <Show when="signed-in">
                <Link
                  href="/dashboard"
                  onClick={() => setMobileOpen(false)}
                  className="block py-3.5 text-[15px] font-medium text-ink-secondary transition-colors"
                >
                  {t("dashboard")}
                </Link>
                <Link
                  href="/profile"
                  onClick={() => setMobileOpen(false)}
                  className="block py-3.5 text-[15px] font-medium text-ink-secondary transition-colors"
                >
                  {t("profile")}
                </Link>
              </Show>
            </div>
          )}

          <Link
            href="/app"
            onClick={() => setMobileOpen(false)}
            className="btn-premium block mt-5 py-3.5 px-4 font-medium text-[15px] text-center"
          >
            {t("analyzeMy")}
          </Link>
        </div>
      </div>
    )}
    </>
  );
}
