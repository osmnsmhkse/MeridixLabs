"use client";

import Link from "next/link";
import Image from "next/image";
import { useTranslations } from "next-intl";

export default function Footer() {
  const t = useTranslations("Footer");

  return (
    <footer className="relative bg-surface border-t border-surface-border">
      {/* Giant editorial statement */}
      <div className="max-w-[1440px] mx-auto px-5 lg:px-10 pt-20 pb-16 sm:pt-28 sm:pb-24">
        <p className="font-display text-brand-blue leading-[1.02] tracking-tightest text-[clamp(2.4rem,7vw,6.5rem)]">
          {t("peakLine")}
        </p>
      </div>

      {/* Link columns */}
      <div className="border-t border-surface-border">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-14 grid grid-cols-1 md:grid-cols-12 gap-10">
          {/* Brand */}
          <div className="md:col-span-6">
            <Link href="/" className="inline-flex items-center mb-5">
              <Image
                src="/meridix-logo-light.svg"
                alt="Meridix Labs"
                width={150}
                height={38}
                className="block dark:hidden"
              />
              <Image
                src="/meridix-logo-dark.svg"
                alt="Meridix Labs"
                width={150}
                height={38}
                className="hidden dark:block"
              />
            </Link>
            <p className="text-sm text-ink-secondary leading-relaxed max-w-xs">
              {t("tagline")}
            </p>
            <p className="mt-5 kicker-mono text-ink-tertiary">{t("poweredBy")}</p>
          </div>

          {/* Product */}
          <div className="md:col-span-3">
            <h3 className="kicker-mono text-ink-tertiary mb-5">
              {t("productSection")}
            </h3>
            <ul className="space-y-3">
              {[
                { label: t("analyzeResults"), href: "/app"           },
                { label: t("howItWorks"),     href: "/#how-it-works" },
                { label: t("features"),       href: "/#features"     },
              ].map((item) => (
                <li key={item.href}>
                  <Link href={item.href} className="text-sm text-ink-secondary hover:text-ink transition-colors">
                    {item.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Company */}
          <div className="md:col-span-3">
            <h3 className="kicker-mono text-ink-tertiary mb-5">
              {t("companySection")}
            </h3>
            <ul className="space-y-3 mb-6">
              <li>
                <Link href="/about" className="text-sm text-ink-secondary hover:text-ink transition-colors">
                  {t("about")}
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="text-sm text-ink-secondary hover:text-ink transition-colors">
                  {t("privacyPolicy")}
                </Link>
              </li>
              <li>
                <Link href="/terms" className="text-sm text-ink-secondary hover:text-ink transition-colors">
                  {t("termsOfService")}
                </Link>
              </li>
            </ul>
            <div className="flex items-center gap-4">
              {/* X / Twitter */}
              <a
                href="https://twitter.com/meridixlabs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("followX")}
                className="text-ink-tertiary hover:text-ink transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                </svg>
              </a>

              {/* Instagram */}
              <a
                href="https://www.instagram.com/meridixlabs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("instagram")}
                className="text-ink-tertiary hover:text-ink transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" />
                </svg>
              </a>

              {/* LinkedIn */}
              <a
                href="https://www.linkedin.com/company/meridixlabs"
                target="_blank"
                rel="noopener noreferrer"
                aria-label={t("linkedin")}
                className="text-ink-tertiary hover:text-ink transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="currentColor" className="w-4 h-4">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433a2.062 2.062 0 01-2.063-2.065 2.064 2.064 0 112.063 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                </svg>
              </a>

              {/* Mail */}
              <a
                href="mailto:contact@meridixlabs.com"
                aria-label={t("email")}
                className="text-ink-tertiary hover:text-ink transition-colors"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} className="w-4 h-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
                </svg>
              </a>
            </div>
          </div>
        </div>
      </div>

      {/* Bottom bar */}
      <div className="border-t border-surface-border">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <p className="text-xs text-ink-tertiary">
            &copy; {new Date().getFullYear()} Meridix Labs. {t("rights")}
          </p>
          <p className="text-xs text-ink-tertiary md:text-right max-w-md">
            {t("disclaimer")}
          </p>
        </div>
      </div>
    </footer>
  );
}
