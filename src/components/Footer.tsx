"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="relative bg-surface-raised border-t border-surface-border overflow-hidden">
      {/* Terminal header strip */}
      <div className="relative border-b border-surface-border bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="kicker-mono text-ink-tertiary">meridix://core</span>
            <span className="text-surface-border">·</span>
            <span className="kicker-mono text-emerald-500 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full live-dot" />
              SYSTEM ONLINE
            </span>
            <span className="text-surface-border hidden sm:inline">·</span>
            <span className="kicker-mono text-ink-tertiary hidden sm:inline">v2.4 / 9 modules</span>
          </div>
          <div className="hidden md:flex items-center gap-3 kicker-mono text-ink-tertiary">
            <span>LAT&nbsp;<span className="text-brand-blue">128ms</span></span>
            <div className="w-12 tracer-line" />
            <span>UPTIME&nbsp;<span className="text-emerald-500">99.98%</span></span>
          </div>
        </div>
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-14">
        {/* Subtle grid background */}
        <div className="crt-grid opacity-30" />

        <div className="relative grid grid-cols-1 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div className="md:col-span-2">
            <Link href="/" className="inline-flex items-center mb-4">
              <Image
                src="/meridix-logo-light.svg"
                alt="Meridix Labs"
                width={185}
                height={47}
                className="block dark:hidden"
              />
              <Image
                src="/meridix-logo-dark.svg"
                alt="Meridix Labs"
                width={185}
                height={47}
                className="hidden dark:block"
              />
            </Link>
            <p className="text-sm text-ink-secondary leading-relaxed max-w-xs">
              {t("tagline")}
            </p>
            <div className="mt-5 flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1.5 kicker-mono text-ink-tertiary bg-surface dark:bg-slate-800 px-3 py-1.5 rounded-full border border-surface-border">
                <span className="w-1.5 h-1.5 rounded-full bg-brand-blue animate-pulse" />
                {t("poweredBy")}
              </span>
              <span className="inline-flex items-center gap-1.5 kicker-mono text-ink-tertiary bg-surface dark:bg-slate-800 px-3 py-1.5 rounded-full border border-surface-border">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                HIPAA_READY
              </span>
            </div>
          </div>

          {/* Product */}
          <div>
            <h3 className="kicker-mono text-ink-tertiary mb-4 flex items-center gap-2">
              <span className="text-brand-blue">┌─</span>
              {t("productSection")}
            </h3>
            <ul className="space-y-2.5">
              {[
                { label: t("analyzeResults"), href: "/app",           k: "01" },
                { label: t("howItWorks"),     href: "/#how-it-works", k: "02" },
                { label: t("features"),       href: "/#features",     k: "03" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="group inline-flex items-center gap-2 text-sm text-ink-secondary hover:text-brand-blue transition-colors">
                    <span className="kicker-mono text-ink-tertiary group-hover:text-brand-blue transition-colors">{item.k}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div>
            <h3 className="kicker-mono text-ink-tertiary mb-4 flex items-center gap-2">
              <span className="text-brand-blue">┌─</span>
              {t("companySection")}
            </h3>
            <ul className="space-y-2.5 mb-5">
              {[
                { label: t("about"),         href: "/about",   k: "01" },
                { label: t("privacyPolicy"), href: "/privacy", k: "02" },
                { label: t("termsOfService"),href: "/terms",   k: "03" },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="group inline-flex items-center gap-2 text-sm text-ink-secondary hover:text-brand-blue transition-colors">
                    <span className="kicker-mono text-ink-tertiary group-hover:text-brand-blue transition-colors">{item.k}</span>
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
            <div className="flex items-center gap-2">
              {/* X / Twitter */}
              <a
                href="https://twitter.com/meridixlabs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("followX")}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border dark:border-slate-700 bg-surface dark:bg-slate-800 text-ink-tertiary hover:text-brand-blue hover:border-brand-blue/40 transition-all duration-200"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="#"
                aria-label={t("linkedin")}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border dark:border-slate-700 bg-surface dark:bg-slate-800 text-ink-tertiary hover:text-brand-blue hover:border-brand-blue/40 transition-all duration-200"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-3.5 h-3.5">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>

              {/* Mail */}
              <a
                href="mailto:contact@meridixlabs.com"
                aria-label={t("email")}
                className="w-8 h-8 flex items-center justify-center rounded-lg border border-surface-border dark:border-slate-700 bg-surface dark:bg-slate-800 text-ink-tertiary hover:text-brand-blue hover:border-brand-blue/40 transition-all duration-200"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-3.5 h-3.5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </a>
            </div>
          </div>
        </div>

        {/* Tracer line above bottom bar */}
        <div className="relative mt-12 tracer-line opacity-50" />
      </div>

      {/* Bottom bar */}
      <div className="border-t border-surface-border bg-white dark:bg-slate-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col md:flex-row items-center justify-between gap-3">
          <p className="kicker-mono text-ink-tertiary">
            © {new Date().getFullYear()} MERIDIX_LABS · {t("rights")}
          </p>
          <p className="text-xs text-ink-tertiary text-center md:text-right max-w-md">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}
