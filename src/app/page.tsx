"use client";

import React from "react";
import Link from "next/link";
import { useState } from "react";
import { useTranslations } from "next-intl";
import HeroCTA from "@/components/HeroCTA";

type DemoTier = "Simple" | "Medium" | "Expert";

export default function LandingPage() {
  const [demoTier, setDemoTier] = useState<DemoTier>("Simple");

  const tHero = useTranslations("Hero");
  const tHow = useTranslations("HowItWorks");
  const tTiers = useTranslations("Tiers");
  const tSuite = useTranslations("Suite");
  const tStats = useTranslations("Stats");
  const tFeatures = useTranslations("Features");
  const tCTA = useTranslations("CTA");
  const tDisclaimer = useTranslations("Disclaimer");
  const tTestimonials = useTranslations("Testimonials");

  const DEMO_TIERS: Record<DemoTier, { summary: string; specialist: { label: string; body: React.ReactNode } }> = {
    Simple: {
      summary: tTiers("demoSimpleSummary"),
      specialist: {
        label: tTiers("demoSimpleSpecialistLabel"),
        body: tTiers.rich("demoSimpleSpecialistBody", { b: (chunks) => <strong>{chunks}</strong> }),
      },
    },
    Medium: {
      summary: tTiers("demoMediumSummary"),
      specialist: {
        label: tTiers("demoMediumSpecialistLabel"),
        body: tTiers.rich("demoMediumSpecialistBody", { b: (chunks) => <strong>{chunks}</strong> }),
      },
    },
    Expert: {
      summary: tTiers("demoExpertSummary"),
      specialist: {
        label: tTiers("demoExpertSpecialistLabel"),
        body: tTiers.rich("demoExpertSpecialistBody", { b: (chunks) => <strong>{chunks}</strong> }),
      },
    },
  };

  return (
    <div className="min-h-screen">

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-hero">
        {/* Mesh drift ambient */}
        <div className="mesh-bg" />
        {/* Masked grid */}
        <div className="grid-mask" />

        {/* Orbiting particles */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-0 h-0 pointer-events-none">
          <div className="orbit-particle absolute">
            <div className="w-1.5 h-1.5 rounded-full bg-brand-blue/50" />
          </div>
          <div className="orbit-particle-sm absolute">
            <div className="w-1 h-1 rounded-full bg-brand-indigo/60" />
          </div>
        </div>

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-16 pb-20 text-center">
          {/* Eyebrow badge */}
          <div className="inline-flex items-center gap-2.5 px-4 py-2 rounded-full bg-white dark:bg-slate-900 border border-surface-border text-ink-secondary text-sm font-medium mb-8 reveal shadow-soft">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-50" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-brand-blue" />
            </span>
            <span className="text-ink font-medium">{tHero("badge")}</span>
            <span className="text-ink-tertiary kicker-mono">v2</span>
          </div>

          <h1 className="text-5xl sm:text-6xl lg:text-[5.5rem] font-extrabold text-ink leading-[0.97] tracking-tightest mb-6 reveal reveal-delay-1">
            {tHero("title")}{" "}
            <span className="text-gradient-blue">{tHero("highlight")}</span>
          </h1>

          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-ink-secondary leading-relaxed mb-10 reveal reveal-delay-2">
            {tHero("subtitle")}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 reveal reveal-delay-3">
            <HeroCTA />
            <a
              href="#how-it-works"
              className="inline-flex items-center gap-2 px-7 py-3.5 border border-surface-border hover:border-brand-blue/30 text-ink-secondary hover:text-ink font-medium rounded-2xl text-base transition-all duration-300 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm hover:shadow-soft"
            >
              {tHero("seeHow")}
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
          </div>

          {/* Trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-8 gap-y-2 mt-8 reveal reveal-delay-4">
            {[
              { icon: "✓", text: tHero("trustEncrypted") },
              { icon: "⚡", text: tHero("trustSpeed") },
              { icon: "◎", text: tHero("trustAI") },
              { icon: "✦", text: tHero("trustFree") },
            ].map((s) => (
              <span key={s.text} className="inline-flex items-center gap-1.5 text-xs text-ink-tertiary">
                <span className="text-brand-blue">{s.icon}</span>
                {s.text}
              </span>
            ))}
          </div>

          {/* 3-tool entry points */}
          <div className="mt-12 grid grid-cols-1 sm:grid-cols-3 gap-3 max-w-3xl mx-auto reveal reveal-delay-4">
            {[
              {
                href: "/symptom",
                color: "text-emerald-600 dark:text-emerald-400",
                border: "border-emerald-200/60 dark:border-emerald-800/40 hover:border-emerald-400/60",
                iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
                icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" />
                  </svg>
                ),
                step: tHero("startHere"),
                title: tSuite("symptomLabel"),
                desc: tSuite("symptomDesc"),
              },
              {
                href: "/app",
                color: "text-brand-blue",
                border: "border-brand-blue/20 dark:border-brand-blue/30 hover:border-brand-blue/50",
                iconBg: "bg-brand-blue/10",
                icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                    <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                  </svg>
                ),
                step: tHero("labCard"),
                title: tSuite("labTitle"),
                desc: tSuite("labDesc"),
              },
              {
                href: "/diagnosed",
                color: "text-violet-600 dark:text-violet-400",
                border: "border-violet-200/60 dark:border-violet-800/40 hover:border-violet-400/60",
                iconBg: "bg-violet-100 dark:bg-violet-900/40",
                icon: (
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                    <path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" />
                  </svg>
                ),
                step: tHero("diagnosisCard"),
                title: tSuite("diagnosisLabel"),
                desc: tSuite("diagnosisDesc"),
              },
            ].map((item) => (
              <a
                key={item.href}
                href={item.href}
                className={`group flex flex-col gap-3 p-4 rounded-2xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm border ${item.border} transition-all duration-300 hover:shadow-lift hover:-translate-y-1`}
              >
                <div className="flex items-center justify-between">
                  <span className={`kicker-mono ${item.color} opacity-60`}>{item.step}</span>
                  <svg viewBox="0 0 20 20" fill="currentColor" className={`w-3.5 h-3.5 ${item.color} opacity-0 group-hover:opacity-100 transition-opacity`}>
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex items-center gap-2.5">
                  <div className={`w-8 h-8 rounded-lg ${item.iconBg} ${item.color} flex items-center justify-center flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <p className={`text-sm font-semibold ${item.color}`}>{item.title}</p>
                </div>
                <p className="text-xs text-ink-tertiary leading-relaxed">{item.desc}</p>
              </a>
            ))}
          </div>
        </div>

        {/* Gradient line at bottom */}
        <div className="absolute bottom-0 left-0 right-0 gradient-line" />
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="relative py-28 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 grid-mask opacity-60" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-slate-900 border border-surface-border rounded-full text-brand-blue shadow-soft">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>
              <span className="kicker-mono text-brand-blue">{tHow("badge")}</span>
            </span>
            <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold text-ink tracking-tightest">{tHow("title")}</h2>
            <p className="mt-4 text-lg text-ink-secondary max-w-xl mx-auto">{tHow("subtitle")}</p>
          </div>

          {/* Steps with connecting line */}
          <div className="relative">
            {/* Dashed connecting line (desktop) */}
            <div className="hidden md:block absolute top-[68px] left-[16.6%] right-[16.6%] h-px"
              style={{ background: "repeating-linear-gradient(to right, rgba(74,133,239,0.25) 0 6px, transparent 6px 14px)" }} />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              {[
                {
                  step: "01",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
                  title: tHow("step1Title"),
                  description: tHow("step1Desc"),
                },
                {
                  step: "02",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3" /></svg>,
                  title: tHow("step2Title"),
                  description: tHow("step2Desc"),
                },
                {
                  step: "03",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>,
                  title: tHow("step3Title"),
                  description: tHow("step3Desc"),
                },
              ].map((item, i) => (
                <div key={i} className={`reveal reveal-delay-${i + 1} group relative flex flex-col items-center text-center p-8 rounded-2xl border border-surface-border bg-white dark:bg-slate-900 hover:border-brand-blue/25 transition-all duration-300 shadow-soft hover:shadow-lift`}>
                  {/* Step number badge — mono style */}
                  <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full bg-white dark:bg-slate-900 border border-surface-border shadow-soft">
                    <span className="step-badge text-brand-blue">{tHow("step")} {item.step}</span>
                  </div>
                  {/* Icon with conic spin */}
                  <div className="conic-icon w-14 h-14 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900 border border-surface-border rounded-2xl flex items-center justify-center text-brand-blue mb-6 mt-3 group-hover:border-brand-blue/30 transition-all duration-300">
                    {item.icon}
                  </div>
                  <h3 className="text-xl font-bold text-ink mb-3 tracking-tighter3">{item.title}</h3>
                  <p className="text-ink-secondary text-sm leading-relaxed">{item.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── TIER SHOWCASE ────────────────────────────────────── */}
      <section className="relative py-28 bg-surface-raised overflow-hidden">
        <div className="absolute inset-0 grid-mask opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-slate-900 border border-surface-border rounded-full text-brand-blue shadow-soft">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5"><path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" /></svg>
              <span className="kicker-mono text-brand-blue">{tTiers("badge")}</span>
            </span>
            <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold text-ink tracking-tightest">{tTiers("title")}</h2>
            <p className="mt-4 text-lg text-ink-secondary max-w-xl mx-auto">{tTiers("subtitle")}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                tier: tTiers("simple"),
                badge: "bg-emerald-50 text-emerald-700 border border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800",
                borderHover: "hover:border-emerald-300 dark:hover:border-emerald-700",
                glowColor: "hover:shadow-emerald-500/8",
                audience: tTiers("noBackground"),
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-500"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg>,
                example: tTiers("simpleExample"),
                highlight: tTiers("simpleDesc"),
              },
              {
                tier: tTiers("medium"),
                badge: "bg-brand-blue-light text-brand-blue-dark border border-brand-blue-mid dark:bg-brand-blue/20 dark:text-blue-300 dark:border-brand-blue/40",
                borderHover: "hover:border-brand-blue/40",
                glowColor: "hover:shadow-brand-blue/10",
                audience: tTiers("educated"),
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-brand-blue"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>,
                example: tTiers("mediumExample"),
                highlight: tTiers("mediumDesc"),
              },
              {
                tier: tTiers("expert"),
                badge: "bg-purple-50 text-purple-700 border border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800",
                borderHover: "hover:border-purple-300 dark:hover:border-purple-700",
                glowColor: "hover:shadow-purple-500/8",
                audience: tTiers("clinician"),
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-purple-500"><path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187 1.949-1.95A3 3 0 009 8.172z" clipRule="evenodd" /></svg>,
                example: tTiers("expertExample"),
                highlight: tTiers("expertDesc"),
              },
            ].map((tier, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1} group p-6 rounded-2xl bg-white dark:bg-slate-900 border border-surface-border ${tier.borderHover} hover:shadow-lift transition-all duration-300 shadow-soft`}>
                <div className="flex items-center justify-between mb-5">
                  <div className="conic-icon w-10 h-10 rounded-xl bg-slate-50 dark:bg-slate-800 border border-surface-border flex items-center justify-center group-hover:border-current/20 transition-all duration-300">{tier.icon}</div>
                  <span className={`kicker-mono px-2.5 py-1 rounded-full ${tier.badge}`}>{tier.audience}</span>
                </div>
                <h3 className="text-xl font-bold text-ink mb-3 tracking-tighter3">{tier.tier}</h3>
                <p className="text-sm text-ink-secondary leading-relaxed mb-5 border-l-2 border-surface-border pl-4 italic">{tier.example}</p>
                <div className="gradient-line mb-4" />
                <p className="kicker-mono text-ink-tertiary">{tier.highlight}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRODUCT SUITE ────────────────────────────────────── */}
      <section className="relative py-28 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <div className="absolute inset-0 grid-mask opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-slate-900 border border-surface-border rounded-full shadow-soft">
              <span className="w-1.5 h-1.5 rounded-full bg-brand-blue pulse-glow" />
              <span className="kicker-mono text-brand-blue">{tSuite("badge")}</span>
            </span>
            <h2 className="mt-4 text-4xl sm:text-5xl font-extrabold text-ink tracking-tightest">
              {tSuite("title") && <>{tSuite("title")}<br className="hidden sm:block" /> </>}{tSuite("titleHighlight")}
            </h2>
            <p className="mt-4 text-lg text-ink-secondary max-w-2xl mx-auto">
              {tSuite("subtitle")}
            </p>
          </div>

          {/* Featured tool — Lab Analyzer */}
          <div className="reveal mb-6">
            <Link
              href="/app"
              className="group relative flex flex-col sm:flex-row items-start gap-8 p-8 rounded-2xl bg-white dark:bg-slate-900 border border-surface-border border-glow hover:shadow-2xl hover:shadow-brand-blue/10 transition-all duration-500 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/3 via-transparent to-brand-indigo/3 pointer-events-none" />
              {/* Scan line effect */}
              <div className="absolute inset-0 scan-line pointer-events-none opacity-20" />
              <div className="flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-indigo flex items-center justify-center shadow-lg shadow-brand-blue/30 group-hover:scale-110 group-hover:shadow-xl group-hover:shadow-brand-blue/40 transition-all duration-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
              </div>
              <div className="flex-1 min-w-0 relative">
                <div className="flex items-center gap-3 mb-2">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-brand-blue/10 to-brand-indigo/10 rounded-full text-[11px] font-bold text-brand-blue uppercase tracking-wider">
                    <span className="w-1 h-1 rounded-full bg-brand-blue animate-pulse" />
                    {tSuite("mostUsed")}
                  </span>
                </div>
                <h3 className="text-2xl font-extrabold text-ink mb-2">{tSuite("labTitle")}</h3>
                <p className="text-ink-secondary leading-relaxed mb-4 max-w-xl">
                  {tSuite("labDesc")}
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {tSuite("labTags").split(",").map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-slate-100 dark:bg-slate-800 text-ink-secondary text-xs rounded-full border border-surface-border">{tag.trim()}</span>
                  ))}
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-bold text-brand-blue group-hover:gap-3 transition-all duration-300">
                  {tSuite("labCta")}
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 group-hover:translate-x-1 transition-transform duration-300">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </span>
              </div>
            </Link>
          </div>

          {/* 5 secondary tools */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-5">
            {[
              {
                href: "/symptom",
                label: tSuite("symptomLabel"),
                title: tSuite("symptomTitle"),
                desc: tSuite("symptomDesc"),
                cta: tSuite("symptomCta"),
                color: "text-emerald-600 dark:text-emerald-400",
                hoverBorder: "hover:border-emerald-300 dark:hover:border-emerald-700",
                hoverGlow: "hover:shadow-emerald-500/8",
                iconBg: "bg-emerald-100 dark:bg-emerald-900/40",
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-emerald-600 dark:text-emerald-400"><path fillRule="evenodd" d="M9 3.5a5.5 5.5 0 100 11 5.5 5.5 0 000-11zM2 9a7 7 0 1112.452 4.391l3.328 3.329a.75.75 0 11-1.06 1.06l-3.329-3.328A7 7 0 012 9z" clipRule="evenodd" /></svg>,
              },
              {
                href: "/diagnosed",
                label: tSuite("diagnosisLabel"),
                title: tSuite("diagnosisTitle"),
                desc: tSuite("diagnosisDesc"),
                cta: tSuite("diagnosisCta"),
                color: "text-violet-600 dark:text-violet-400",
                hoverBorder: "hover:border-violet-300 dark:hover:border-violet-700",
                hoverGlow: "hover:shadow-violet-500/8",
                iconBg: "bg-violet-100 dark:bg-violet-900/40",
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-violet-600 dark:text-violet-400"><path fillRule="evenodd" d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" clipRule="evenodd" /></svg>,
              },
              {
                href: "/imaging",
                label: tSuite("imagingLabel"),
                title: tSuite("imagingTitle"),
                desc: tSuite("imagingDesc"),
                cta: tSuite("imagingCta"),
                color: "text-sky-600 dark:text-sky-400",
                hoverBorder: "hover:border-sky-300 dark:hover:border-sky-700",
                hoverGlow: "hover:shadow-sky-500/8",
                iconBg: "bg-sky-100 dark:bg-sky-900/40",
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-sky-600 dark:text-sky-400"><path fillRule="evenodd" d="M10 12a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" /><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.064 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd" /></svg>,
              },
              {
                href: "/trends",
                label: tSuite("trendLabel"),
                title: tSuite("trendTitle"),
                desc: tSuite("trendDesc"),
                cta: tSuite("trendCta"),
                color: "text-amber-600 dark:text-amber-400",
                hoverBorder: "hover:border-amber-300 dark:hover:border-amber-700",
                hoverGlow: "hover:shadow-amber-500/8",
                iconBg: "bg-amber-100 dark:bg-amber-900/40",
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-amber-600 dark:text-amber-400"><path fillRule="evenodd" d="M12 7a1 1 0 110-2h5a1 1 0 011 1v5a1 1 0 11-2 0V8.414l-4.293 4.293a1 1 0 01-1.414 0L8 10.414l-4.293 4.293a1 1 0 01-1.414-1.414l5-5a1 1 0 011.414 0L11 10.586 14.586 7H12z" clipRule="evenodd" /></svg>,
              },
              {
                href: "/medications",
                label: tSuite("medicationLabel"),
                title: tSuite("medicationTitle"),
                desc: tSuite("medicationDesc"),
                cta: tSuite("medicationCta"),
                color: "text-teal-600 dark:text-teal-400",
                hoverBorder: "hover:border-teal-300 dark:hover:border-teal-700",
                hoverGlow: "hover:shadow-teal-500/8",
                iconBg: "bg-teal-100 dark:bg-teal-900/40",
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-teal-600 dark:text-teal-400"><path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" /><path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" /></svg>,
              },
            ].map((tool, i) => (
              <Link key={tool.href} href={tool.href} className={`reveal reveal-delay-${i + 1} group relative flex flex-col p-6 rounded-2xl bg-white dark:bg-slate-900 border border-surface-border ${tool.hoverBorder} hover:shadow-xl ${tool.hoverGlow} transition-all duration-500 overflow-hidden card-hover`}>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-current/5 to-transparent rounded-full -translate-y-10 translate-x-10 pointer-events-none opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                <div className={`w-11 h-11 rounded-xl ${tool.iconBg} flex items-center justify-center mb-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-500`}>
                  {tool.icon}
                </div>
                <p className={`text-[11px] font-bold ${tool.color} uppercase tracking-wider mb-1.5`}>{tool.label}</p>
                <h3 className="text-lg font-bold text-ink mb-2">{tool.title}</h3>
                <p className="text-sm text-ink-secondary leading-relaxed flex-1 mb-4">{tool.desc}</p>
                <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${tool.color} group-hover:gap-2.5 transition-all duration-300`}>
                  {tool.cta}
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform duration-300"><path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" /></svg>
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TRUST STRIP ────────────────────────────────────── */}
      <section className="relative py-20 bg-white dark:bg-slate-900 border-y border-surface-border overflow-hidden">
        <div className="absolute inset-0 grid-mask opacity-30" />
        <div className="relative max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Stats strip — bordered like the reference design */}
          <div className="grid grid-cols-2 sm:grid-cols-4 divide-x divide-surface-border border border-surface-border rounded-2xl overflow-hidden mb-16 reveal shadow-soft">
            {[
              { number: tStats("reportsCount"), label: tStats("reportsLabel"), color: "text-brand-blue" },
              { number: tStats("speedCount"), label: tStats("speedLabel"), color: "text-emerald-500" },
              { number: tStats("tiersCount"), label: tStats("tiersLabel"), color: "text-violet-500" },
              { number: tStats("toolsCount"), label: tStats("toolsLabel"), color: "text-amber-500" },
            ].map((stat, i) => (
              <div key={i} className="flex flex-col items-center justify-center py-8 px-4 bg-white dark:bg-slate-900">
                <span className={`text-3xl sm:text-4xl font-extrabold tracking-tightest ${stat.color}`}>{stat.number}</span>
                <p className="mt-1.5 text-xs text-ink-tertiary">{stat.label}</p>
              </div>
            ))}
          </div>

          {/* Gradient divider */}
          <div className="gradient-line mb-16" />

          {/* Compact trust signals */}
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-4 mb-16 reveal reveal-delay-1">
            {[
              { icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>, text: tStats("encrypted") },
              { icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg>, text: tStats("resultsInSeconds") },
              { icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path d="M9 4.804A7.968 7.968 0 005.5 4c-1.255 0-2.443.29-3.5.804v10A7.969 7.969 0 015.5 14c1.669 0 3.218.51 4.5 1.385A7.962 7.962 0 0114.5 14c1.255 0 2.443.29 3.5.804v-10A7.968 7.968 0 0014.5 4c-1.669 0-3.218.51-4.5 1.385V15" /></svg>, text: tStats("advancedAI") },
              { icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>, text: tStats("freeToTry") },
            ].map((item) => (
              <div key={item.text} className="flex items-center gap-2.5 text-sm text-ink-secondary">
                <span className="text-brand-blue">{item.icon}</span>
                {item.text}
              </div>
            ))}
          </div>

          {/* Feedback cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 reveal reveal-delay-2">
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-surface-border hover:border-brand-blue/20 hover:shadow-lg hover:shadow-brand-blue/5 transition-all duration-500">
              <p className="text-sm text-ink-secondary leading-relaxed mb-4">
                &ldquo;{tTestimonials("quote1")}&rdquo;
              </p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-brand-blue to-brand-indigo flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">S</span>
                </div>
                <span className="text-xs text-ink-tertiary">{tTestimonials("author1")}</span>
              </div>
            </div>
            <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-surface-border hover:border-violet-500/20 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-500">
              <p className="text-sm text-ink-secondary leading-relaxed mb-4">
                &ldquo;{tTestimonials("quote2")}&rdquo;
              </p>
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">M</span>
                </div>
                <span className="text-xs text-ink-tertiary">{tTestimonials("author2")}</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="relative py-28 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="absolute inset-0 grid-mask opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="reveal">
              <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-white dark:bg-slate-900 border border-surface-border rounded-full shadow-soft">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-brand-blue"><path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg>
                <span className="kicker-mono text-brand-blue">{tFeatures("badge")}</span>
              </span>
              <h2 className="mt-4 text-4xl font-extrabold text-ink tracking-tightest leading-tight">{tFeatures("title")}</h2>
              <p className="mt-4 text-lg text-ink-secondary leading-relaxed">{tFeatures("subtitle")}</p>
              <div className="mt-10 space-y-5">
                {[
                  { title: tFeatures("flaggedTitle"), desc: tFeatures("flaggedDesc"), color: "text-red-500", bgColor: "bg-red-50 dark:bg-red-900/20 border-red-100 dark:border-red-900", icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg> },
                  { title: tFeatures("etiologyTitle"), desc: tFeatures("etiologyDesc"), color: "text-brand-blue", bgColor: "bg-brand-blue-light dark:bg-brand-blue/10 border-brand-blue-mid dark:border-brand-blue/20", icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M7 2a1 1 0 00-.707 1.707L7 4.414v3.758a1 1 0 01-.293.707l-4 4C.817 14.769 2.156 18 4.828 18h10.343c2.673 0 4.012-3.231 2.122-5.121l-4-4A1 1 0 0113 8.172V4.414l.707-.707A1 1 0 0013 2H7zm2 6.172V4h2v4.172a3 3 0 00.879 2.12l1.027 1.028a4 4 0 00-2.171.102l-.47.156a4 4 0 01-2.53 0l-.563-.187 1.949-1.95A3 3 0 009 8.172z" clipRule="evenodd" /></svg> },
                  { title: tFeatures("specialistTitle"), desc: tFeatures("specialistDesc"), color: "text-violet-500", bgColor: "bg-violet-50 dark:bg-violet-900/20 border-violet-100 dark:border-violet-900", icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path d="M8 9a3 3 0 100-6 3 3 0 000 6zM8 11a6 6 0 016 6H2a6 6 0 016-6zM16 7a1 1 0 10-2 0v1h-1a1 1 0 100 2h1v1a1 1 0 102 0v-1h1a1 1 0 100-2h-1V7z" /></svg> },
                  { title: tFeatures("privacyTitle"), desc: tFeatures("privacyDesc"), color: "text-emerald-500", bgColor: "bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-900", icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" /></svg> },
                  { title: tFeatures("speedTitle"), desc: tFeatures("speedDesc"), color: "text-amber-500", bgColor: "bg-amber-50 dark:bg-amber-900/20 border-amber-100 dark:border-amber-900", icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5"><path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" /></svg> },
                ].map((feat, i) => (
                  <div key={feat.title} className={`reveal reveal-delay-${Math.min(i + 1, 5)} group flex items-start gap-4`}>
                    <div className={`w-10 h-10 rounded-xl ${feat.bgColor} border flex items-center justify-center flex-shrink-0 ${feat.color} group-hover:scale-110 transition-transform duration-300`}>{feat.icon}</div>
                    <div>
                      <h4 className="font-semibold text-ink">{feat.title}</h4>
                      <p className="text-sm text-ink-secondary mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="relative reveal reveal-delay-2">
              <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/6 to-brand-indigo/4 rounded-3xl blur-2xl" />
              <div className="relative bg-white dark:bg-slate-800 rounded-3xl shadow-xl shadow-brand-blue/10 border border-surface-border overflow-hidden scan-line">
                <div className="bg-surface-raised px-6 py-4 border-b border-surface-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-gradient-to-br from-brand-blue to-brand-indigo rounded-lg flex items-center justify-center">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-ink font-semibold text-sm">Basic Metabolic Panel</span>
                  </div>
                  <span className="inline-flex items-center gap-1.5 text-brand-blue text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-brand-blue pulse-glow" />
                    Analyzed
                  </span>
                </div>
                <div className="border-b border-surface-border px-6 pt-4 bg-white dark:bg-slate-800">
                  <div className="flex gap-1">
                    {(["Simple","Medium","Expert"] as DemoTier[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setDemoTier(t)}
                        className={`px-4 py-2 rounded-t-lg text-sm font-medium transition-colors duration-200 ${t === demoTier ? "bg-brand-blue-light text-brand-blue-dark border-b-2 border-brand-blue" : "text-ink-tertiary hover:text-ink-secondary"}`}
                      >{t === "Simple" ? tTiers("simple") : t === "Medium" ? tTiers("medium") : tTiers("expert")}</button>
                    ))}
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <p className="text-sm text-ink-secondary leading-relaxed">{DEMO_TIERS[demoTier].summary}</p>
                  {/* Biomarker rows — left-border marker style */}
                  <div className="relative flex items-center justify-between p-3 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800 overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-xl" />
                    <div className="flex items-center gap-2 pl-2"><span className="text-sm font-semibold text-ink">Glucose</span></div>
                    <div className="text-right">
                      <span className="font-mono-data text-sm font-semibold text-amber-600">112</span>
                      <span className="font-mono-data text-xs text-ink-tertiary ml-1">mg/dL</span>
                      <p className="font-mono-data text-[11px] text-ink-tertiary">ref 70–99</p>
                    </div>
                  </div>
                  <div className="relative flex items-center justify-between p-3 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 overflow-hidden">
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-emerald-400 rounded-l-xl" />
                    <div className="flex items-center gap-2 pl-2"><span className="text-sm font-semibold text-ink">Creatinine</span></div>
                    <div className="text-right">
                      <span className="font-mono-data text-sm font-semibold text-emerald-600">0.9</span>
                      <span className="font-mono-data text-xs text-ink-tertiary ml-1">mg/dL</span>
                      <p className="font-mono-data text-[11px] text-ink-tertiary">ref 0.7–1.2</p>
                    </div>
                  </div>
                  <div className="p-3 rounded-xl bg-gradient-to-r from-brand-blue/5 to-brand-indigo/5 border border-brand-blue/20">
                    <p className="kicker-mono text-brand-blue-dark mb-1">{DEMO_TIERS[demoTier].specialist.label}</p>
                    <p className="text-xs text-ink-secondary">{DEMO_TIERS[demoTier].specialist.body}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DISCLAIMER BAND ─────────────────────────────────── */}
      <section className="py-5 bg-amber-50 dark:bg-amber-900/20 border-y border-amber-100 dark:border-amber-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-3 text-center">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            {tDisclaimer("short")}
          </p>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────── */}
      <section className="relative py-16 px-4 bg-white dark:bg-slate-950 overflow-hidden">
        <div className="max-w-5xl mx-auto reveal">
          {/* Dark gradient card with internal grid */}
          <div
            className="relative overflow-hidden rounded-3xl px-8 py-20 text-center dark-grid-overlay"
            style={{
              background: "radial-gradient(60% 80% at 50% 0%, rgba(99,102,241,0.4) 0, transparent 70%), radial-gradient(60% 80% at 50% 100%, rgba(74,133,239,0.4) 0, transparent 70%), linear-gradient(180deg, #16195a, #0e1040)",
              border: "1px solid rgba(99,102,241,0.25)"
            }}
          >
            <div className="relative z-10">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tightest mb-5 leading-[1.02]">
                {tCTA("title")}
              </h2>
              <p className="text-lg mb-10" style={{ color: "rgba(200,205,255,0.75)" }}>
                {tCTA("subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/app"
                  className="group inline-flex items-center gap-3 px-8 py-3.5 rounded-2xl text-base font-semibold transition-all duration-300 hover:-translate-y-px"
                  style={{ background: "linear-gradient(180deg, #fff, #e8eeff)", color: "#16195a", boxShadow: "0 10px 30px -10px rgba(255,255,255,0.3)" }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  {tCTA("button")}
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 px-7 py-3.5 rounded-2xl text-base font-medium transition-all duration-200"
                  style={{ background: "transparent", color: "rgba(200,205,255,0.8)", border: "1px solid rgba(255,255,255,0.18)" }}
                >
                  {tCTA("seeHow")}
                </a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
