"use client";

import { useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { Sun, Moon } from "lucide-react";
import { useTheme } from "@/contexts/ThemeContext";
import { track } from "@/lib/track";
import { Show, UserButton } from "@clerk/nextjs";
import { useTranslations } from "next-intl";
import LanguageSwitcher from "@/components/LanguageSwitcher";

const AUTH_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const TOOL_HREFS = ["/app", "/symptom", "/diagnosed", "/trends"];

// ── Theme toggle ───────────────────────────────────────────────────────────

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  const t = useTranslations("Nav");
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <div className="w-9 h-9" />;
  return (
    <button
      onClick={toggle}
      aria-label={t("toggleDarkMode")}
      className="relative w-9 h-9 flex items-center justify-center rounded-lg text-ink-secondary hover:text-ink hover:bg-surface-raised transition-colors"
    >
      <Sun className={`absolute w-4 h-4 transition-all duration-300 ${theme === "dark" ? "opacity-100 rotate-0 scale-100" : "opacity-0 -rotate-90 scale-50"}`} />
      <Moon className={`absolute w-4 h-4 transition-all duration-300 ${theme === "light" ? "opacity-100 rotate-0 scale-100" : "opacity-0 rotate-90 scale-50"}`} />
    </button>
  );
}

// ── Tools dropdown ─────────────────────────────────────────────────────────

function ToolsDropdown({ pathname }: { pathname: string }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const t = useTranslations("Nav");

  const TOOLS = [
    {
      href: "/app",
      label: t("labAnalyzer"),
      description: t("labAnalyzerDesc"),
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
      label: t("symptomChecker"),
      description: t("symptomCheckerDesc"),
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
      label: t("diagnosisExplainer"),
      description: t("diagnosisExplainerDesc"),
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
      label: t("trendTracker"),
      description: t("trendTrackerDesc"),
      color: "text-amber-600 dark:text-amber-400",
      bg: "bg-amber-50 dark:bg-amber-900/20",
      icon: (
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
          <path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" />
        </svg>
      ),
    },
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
        className={`flex items-center gap-1.5 text-sm font-medium transition-colors ${
          isToolActive ? "text-brand-blue" : "text-ink-secondary hover:text-ink"
        }`}
      >
        {t("tools")}
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
            <p className="text-[11px] text-ink-tertiary text-center">{t("moreToolsSoon")}</p>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Main navigation ────────────────────────────────────────────────────────

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
    {/* ── Floating pill nav ─────────────────────────────── */}
    <header className="fixed top-3 left-0 right-0 z-50 flex justify-center px-4 pointer-events-none">
      <div
        className={`pointer-events-auto flex items-center gap-2 pl-4 pr-2 py-2 rounded-full transition-all duration-300 border ${
          scrolled
            ? "bg-white/95 dark:bg-slate-900/95 backdrop-blur-xl shadow-lift border-surface-border"
            : "bg-white/90 dark:bg-slate-900/90 backdrop-blur-md border-surface-border shadow-soft"
        }`}
        style={{ width: "min(1100px, calc(100% - 0px))" }}
      >
          {/* Logo */}
          <Link href="/" className="flex items-center flex-shrink-0 mr-2">
            <Image
              src="/meridix-logo-light.svg"
              alt="Meridix Labs"
              width={136}
              height={36}
              priority
              className="block dark:hidden"
            />
            <Image
              src="/meridix-logo-dark.svg"
              alt="Meridix Labs"
              width={136}
              height={36}
              priority
              className="hidden dark:block"
            />
          </Link>

          {/* Desktop nav */}
          <nav className="hidden md:flex items-center gap-1 flex-1">
            <ToolsDropdown pathname={pathname} />
            {FLAT_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`px-3 py-2 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap ${
                  isActive(link.href)
                    ? "text-brand-blue bg-brand-blue/8"
                    : "text-ink-secondary hover:text-ink hover:bg-surface-raised"
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Right side */}
          <div className="hidden md:flex items-center gap-1.5 ml-auto">
            <ThemeToggle />
            <LanguageSwitcher compact />
            <Link
              href="/for-doctors"
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 border font-medium rounded-full text-sm transition-all duration-200 ${
                isActive("/for-doctors")
                  ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                  : "border-surface-border text-ink-secondary hover:border-brand-blue/50 hover:text-brand-blue"
              }`}
            >
              {t("forDoctors")}
            </Link>

            {AUTH_ENABLED ? (
              <>
                <Show when="signed-out">
                  <Link
                    href="/sign-in"
                    className="hidden lg:inline-flex items-center px-3 py-2 text-sm font-medium text-ink-secondary hover:text-ink transition-colors rounded-full hover:bg-surface-raised"
                  >
                    {t("signIn")}
                  </Link>
                  <Link
                    href="/sign-up"
                    className="inline-flex items-center gap-1.5 px-4 py-2 border border-surface-border text-ink font-medium rounded-full text-sm hover:border-brand-blue hover:text-brand-blue transition-all duration-200"
                  >
                    {t("signUp")}
                  </Link>
                </Show>
                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-sm font-medium transition-colors rounded-full ${
                      isActive("/dashboard") ? "text-brand-blue bg-brand-blue/8" : "text-ink-secondary hover:text-ink hover:bg-surface-raised"
                    }`}
                  >
                    {t("dashboard")}
                  </Link>
                  <UserButton appearance={{ elements: { avatarBox: "w-8 h-8" } }} />
                </Show>
              </>
            ) : null}

            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-b from-brand-blue to-brand-blue-hover text-white font-semibold rounded-full text-sm transition-all duration-200 shadow-sm hover:shadow-glow-blue hover:-translate-y-px"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                <path d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" />
              </svg>
              {t("analyzeResults")}
            </Link>
          </div>

          {/* Mobile hamburger */}
          <button
            className="md:hidden ml-auto text-ink-secondary p-2 rounded-full hover:bg-surface-raised transition-colors"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label={t("toggleMenu")}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-5 h-5">
              {mobileOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
      </div>
    </header>

    {/* Mobile menu (below pill) */}
    {mobileOpen && (
      <div className="md:hidden fixed top-16 left-4 right-4 z-40 bg-white dark:bg-slate-900 border border-surface-border rounded-2xl shadow-lift overflow-y-auto max-h-[80vh]">
        <div className="py-3 space-y-1 px-2">
            {/* Tools section in mobile */}
            <button
              onClick={() => setMobileToolsOpen(!mobileToolsOpen)}
              className={`w-full flex items-center justify-between py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                isToolActive
                  ? "text-brand-blue bg-brand-blue-light dark:bg-brand-blue/20"
                  : "text-ink-secondary hover:text-ink hover:bg-surface-raised"
              }`}
            >
              {t("tools")}
              <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 transition-transform ${mobileToolsOpen ? "rotate-180" : ""}`}>
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </button>
            {mobileToolsOpen && (
              <div className="ml-4 space-y-1 pb-1">
                {[
                  { href: "/app",       label: t("labAnalyzer"),        color: "text-brand-blue"                        },
                  { href: "/symptom",   label: t("symptomChecker"),     color: "text-emerald-600 dark:text-emerald-400" },
                  { href: "/diagnosed", label: t("diagnosisExplainer"), color: "text-violet-600 dark:text-violet-400"   },
                  { href: "/trends",    label: t("trendTracker"),       color: "text-amber-600 dark:text-amber-400"     },
                ].map((tool) => (
                  <Link
                    key={tool.href}
                    href={tool.href}
                    onClick={() => setMobileOpen(false)}
                    className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                      isActive(tool.href)
                        ? `${tool.color} bg-surface-raised`
                        : "text-ink-secondary hover:text-ink hover:bg-surface-raised"
                    }`}
                  >
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
              {t("forDoctors")}
            </Link>

            <div className="px-2 py-1 flex items-center gap-2">
              <ThemeToggle />
              <LanguageSwitcher inline />
            </div>

            {AUTH_ENABLED && (
              <div className="pt-2 border-t border-surface-border mt-2 space-y-1">
                <Show when="signed-out">
                  <Link
                    href="/sign-in"
                    onClick={() => setMobileOpen(false)}
                    className="block py-2.5 px-4 rounded-lg text-sm font-medium text-ink-secondary hover:text-ink hover:bg-surface-raised transition-colors"
                  >
                    {t("signIn")}
                  </Link>
                  <Link
                    href="/sign-up"
                    onClick={() => setMobileOpen(false)}
                    className="block py-2.5 px-4 rounded-lg text-sm font-semibold text-ink border border-slate-200 dark:border-slate-700 text-center hover:border-brand-blue hover:text-brand-blue transition-all"
                  >
                    {t("signUpFree")}
                  </Link>
                </Show>
                <Show when="signed-in">
                  <Link
                    href="/dashboard"
                    onClick={() => setMobileOpen(false)}
                    className={`block py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
                      isActive("/dashboard")
                        ? "text-brand-blue bg-brand-blue-light dark:bg-brand-blue/20"
                        : "text-ink-secondary hover:text-ink hover:bg-surface-raised"
                    }`}
                  >
                    {t("dashboard")}
                  </Link>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="block py-2.5 px-4 rounded-lg text-sm font-medium text-ink-secondary hover:text-ink hover:bg-surface-raised transition-colors"
                  >
                    {t("profile")}
                  </Link>
                </Show>
              </div>
            )}

            <Link
              href="/app"
              onClick={() => setMobileOpen(false)}
              className="block py-2.5 px-4 bg-gradient-to-b from-brand-blue to-brand-blue-hover text-white font-semibold rounded-xl text-sm text-center"
            >
              {t("analyzeMy")}
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
