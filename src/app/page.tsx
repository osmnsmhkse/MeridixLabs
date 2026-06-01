"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import HeroCTA from "@/components/HeroCTA";
import WordReveal from "@/components/WordReveal";
import LabInterpretationDemo from "@/components/LabInterpretationDemo";

export default function LandingPage() {
  const tHero = useTranslations("Hero");
  const tHow = useTranslations("HowItWorks");
  const tTiers = useTranslations("Tiers");
  const tSuite = useTranslations("Suite");
  const tStats = useTranslations("Stats");
  const tFeatures = useTranslations("Features");
  const tCTA = useTranslations("CTA");
  const tDisclaimer = useTranslations("Disclaimer");
  const tTestimonials = useTranslations("Testimonials");

  return (
    <div className="min-h-screen">

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative isolate overflow-hidden gradient-hero grain -mt-16 pt-44 pb-16 lg:pt-48 lg:pb-24">
        {/* Aurora ambient field */}
        <div className="aurora-field" aria-hidden="true" data-parallax="0.2">
          <div className="aurora-blob animate-aurora" style={{ top: "-8%", left: "8%", width: "44vw", height: "44vw", background: "radial-gradient(circle at 30% 30%, rgba(74,133,239,0.55), transparent 60%)" }} />
          <div className="aurora-blob animate-aurora" style={{ top: "0%", right: "2%", width: "40vw", height: "40vw", background: "radial-gradient(circle at 60% 40%, rgba(99,102,241,0.5), transparent 62%)", animationDelay: "-6s" }} />
          <div className="aurora-blob animate-aurora" style={{ bottom: "-12%", left: "32%", width: "38vw", height: "38vw", background: "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.32), transparent 64%)", animationDelay: "-11s" }} />
        </div>
        {/* Refined dot grid */}
        <div className="absolute inset-0 dot-grid opacity-70 pointer-events-none" aria-hidden="true" data-parallax="0.06" />

        <div className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-10 items-center lg:items-start">

            {/* ── Left: supporting message (lean) ─────────── */}
            <div className="lg:col-span-5 min-w-0 text-center lg:text-left lg:pt-6">
              <div className="chip text-brand-blue mb-6 reveal justify-center lg:justify-start">
                <span className="text-ink tracking-[0.14em]">{tHero("badge")}</span>
              </div>

              <h1 className="font-display font-bold text-ink leading-[1.02] tracking-tightest mb-5 text-[2.5rem] sm:text-[3.15rem] lg:text-[3.1rem] xl:text-[3.6rem]">
                <WordReveal text={tHero("title")} base={0.12} />{" "}
                <WordReveal
                  text={tHero("highlight")}
                  startIndex={tHero("title").split(" ").length}
                  base={0.12}
                  wordClassName="text-gradient-premium"
                />
              </h1>

              <p className="max-w-md mx-auto lg:mx-0 text-base sm:text-lg text-ink-secondary leading-relaxed mb-7 reveal reveal-delay-2 text-pretty">
                {tHero("subtitle")}
              </p>

              <div className="flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3 reveal reveal-delay-3">
                <HeroCTA />
                <a
                  href="#how-it-works"
                  className="btn-ghost inline-flex items-center gap-2 px-7 py-4 font-semibold rounded-full text-base"
                >
                  {tHero("seeHow")}
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </a>
              </div>

              {/* The 4-second promise — what you walk away with */}
              <div className="grid grid-cols-2 gap-2.5 mt-8 max-w-md mx-auto lg:mx-0 reveal reveal-delay-4">
                {[
                  { text: tHero("p1"), icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M10 3a1 1 0 01.707.293l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 7.707a1 1 0 01-1.414-1.414l3-3A1 1 0 0110 3zM4 15a1 1 0 011 1v1h10v-1a1 1 0 112 0v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1a1 1 0 011-1z" clipRule="evenodd" /></svg> },
                  { text: tHero("p2"), icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" /></svg> },
                  { text: tHero("p3"), icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z" clipRule="evenodd" /></svg> },
                  { text: tHero("p4"), icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4"><path fillRule="evenodd" d="M16.704 4.153a.75.75 0 01.143 1.052l-8 10.5a.75.75 0 01-1.127.075l-4.5-4.5a.75.75 0 011.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 011.05-.143z" clipRule="evenodd" /></svg> },
                ].map((s, i) => (
                  <div key={s.text} className="flex items-center gap-2.5 rounded-xl border border-surface-border bg-surface/70 px-3 py-2.5 text-left">
                    <span className="w-7 h-7 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center flex-shrink-0">{s.icon}</span>
                    <span className="text-[12.5px] font-semibold text-ink-secondary leading-tight">
                      <span className="font-mono-data text-ink-tertiary mr-1">{i + 1}</span>{s.text}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Right: the product, dominant ─────────────── */}
            <div className="lg:col-span-7 min-w-0 reveal reveal-delay-2">
              <LabInterpretationDemo />
            </div>
          </div>

          {/* ── 3 entry paths ───────────────────────────── */}
          <div className="mt-16 lg:mt-20 grid grid-cols-1 sm:grid-cols-3 gap-4 reveal reveal-delay-3">
            {[
              {
                href: "/symptom",
                color: "text-emerald-600 dark:text-emerald-400",
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
                className="group bento bento-hover bento-spot flex flex-col gap-3 p-5"
              >
                <div className="relative z-10 flex items-center justify-between">
                  <span className={`kicker-mono ${item.color} opacity-70`}>{item.step}</span>
                  <svg viewBox="0 0 20 20" fill="currentColor" className={`w-4 h-4 ${item.color} opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all duration-300`}>
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="relative z-10 flex items-center gap-2.5">
                  <div className={`w-9 h-9 rounded-xl ${item.iconBg} ${item.color} flex items-center justify-center flex-shrink-0`}>
                    {item.icon}
                  </div>
                  <p className={`text-[15px] font-bold ${item.color}`}>{item.title}</p>
                </div>
                <p className="relative z-10 text-[13px] text-ink-tertiary leading-relaxed">{item.desc}</p>
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
            <span className="chip text-brand-blue mx-auto">
              <span className="kicker-mono text-brand-blue">{tHow("badge")}</span>
            </span>
            <h2 className="mt-5 font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-ink tracking-tightest leading-[1.02]">{tHow("title")}</h2>
            <p className="mt-4 text-lg text-ink-secondary max-w-xl mx-auto text-pretty">{tHow("subtitle")}</p>
          </div>

          {/* Steps */}
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {[
                {
                  step: "01",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-[22px] h-[22px]"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
                  title: tHow("step1Title"),
                  description: tHow("step1Desc"),
                },
                {
                  step: "02",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-[22px] h-[22px]"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3" /></svg>,
                  title: tHow("step2Title"),
                  description: tHow("step2Desc"),
                },
                {
                  step: "03",
                  icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-[22px] h-[22px]"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>,
                  title: tHow("step3Title"),
                  description: tHow("step3Desc"),
                },
              ].map((item, i) => (
                <div key={i} className={`reveal reveal-delay-${i + 1} group bento bento-hover relative flex flex-col p-7`}>
                  {/* Header: soft icon tile + editorial step number */}
                  <div className="relative z-10 flex items-center justify-between mb-6">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-brand-blue/10 to-brand-indigo/10 border border-brand-blue/15 flex items-center justify-center text-brand-blue group-hover:from-brand-blue/[0.16] group-hover:to-brand-indigo/[0.16] group-hover:border-brand-blue/25 transition-all duration-300">
                      {item.icon}
                    </div>
                    <span className="font-display text-3xl font-bold text-ink-tertiary/30 tabular-nums leading-none select-none">{item.step}</span>
                  </div>
                  <h3 className="relative z-10 font-display text-lg font-bold text-ink mb-2 tracking-tight">{item.title}</h3>
                  <p className="relative z-10 text-ink-secondary text-sm leading-relaxed">{item.description}</p>
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
            <span className="chip text-brand-blue mx-auto">
              <span className="kicker-mono text-brand-blue">{tTiers("badge")}</span>
            </span>
            <h2 className="mt-5 font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-ink tracking-tightest leading-[1.02]">{tTiers("title")}</h2>
            <p className="mt-4 text-lg text-ink-secondary max-w-xl mx-auto text-pretty">{tTiers("subtitle")}</p>
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
              <div key={i} className={`reveal reveal-delay-${i + 1} group bento bento-hover bento-spot p-6`}>
                <div className="relative z-10 flex items-center justify-between mb-5">
                  <div className="conic-icon w-10 h-10 rounded-xl bg-surface-raised border border-surface-border flex items-center justify-center group-hover:border-current/20 transition-all duration-300">{tier.icon}</div>
                  <span className={`kicker-mono px-2.5 py-1 rounded-full ${tier.badge}`}>{tier.audience}</span>
                </div>
                <h3 className="relative z-10 font-display text-xl font-bold text-ink mb-3 tracking-tight">{tier.tier}</h3>
                <p className="relative z-10 text-sm text-ink-secondary leading-relaxed mb-5 border-l-2 border-surface-border pl-4 italic">{tier.example}</p>
                <div className="relative z-10 gradient-line mb-4" />
                <p className="relative z-10 kicker-mono text-ink-tertiary">{tier.highlight}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRODUCT SUITE (bento) ────────────────────────────── */}
      <section className="relative py-28 bg-surface overflow-hidden grain">
        <div className="absolute inset-0 dot-grid opacity-40 pointer-events-none" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14 reveal">
            <span className="chip text-brand-blue mx-auto">
              <span className="kicker-mono text-brand-blue">{tSuite("badge")}</span>
            </span>
            <h2 className="mt-5 font-display text-4xl sm:text-5xl lg:text-[3.5rem] font-bold text-ink tracking-tightest leading-[1.02]">
              {tSuite("title") && <>{tSuite("title")}<br className="hidden sm:block" /> </>}<span className="text-gradient-premium">{tSuite("titleHighlight")}</span>
            </h2>
            <p className="mt-4 text-lg text-ink-secondary max-w-2xl mx-auto text-pretty">
              {tSuite("subtitle")}
            </p>
          </div>

          {/* Featured tool — Lab Analyzer (large bento tile) */}
          <div className="reveal mb-5">
            <Link
              href="/app"
              className="group bento ring-gradient bento-hover relative flex flex-col sm:flex-row items-start gap-8 p-8 sm:p-10 overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/5 via-transparent to-brand-indigo/5 pointer-events-none" />
              <div className="absolute inset-0 scan-line pointer-events-none opacity-20" />
              <div className="relative z-10 flex-shrink-0 w-16 h-16 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-indigo flex items-center justify-center shadow-glow-blue group-hover:scale-110 transition-all duration-500">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-8 h-8 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
              </div>
              <div className="relative z-10 flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-3">
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-gradient-to-r from-brand-blue/12 to-brand-indigo/12 rounded-full text-[11px] font-bold text-brand-blue uppercase tracking-wider">
                    <span className="w-1 h-1 rounded-full bg-brand-blue animate-pulse" />
                    {tSuite("mostUsed")}
                  </span>
                </div>
                <h3 className="font-display text-2xl sm:text-3xl font-bold text-ink mb-2 tracking-tight">{tSuite("labTitle")}</h3>
                <p className="text-ink-secondary leading-relaxed mb-4 max-w-xl">
                  {tSuite("labDesc")}
                </p>
                <div className="flex flex-wrap gap-2 mb-5">
                  {tSuite("labTags").split(",").map((tag) => (
                    <span key={tag} className="px-2.5 py-1 bg-surface-raised text-ink-secondary text-xs rounded-full border border-surface-border">{tag.trim()}</span>
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

          {/* Secondary tools */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
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
              {
                href: "/visit",
                label: tSuite("visitLabel"),
                title: tSuite("visitTitle"),
                desc: tSuite("visitDesc"),
                cta: tSuite("visitCta"),
                color: "text-brand-indigo dark:text-indigo-400",
                hoverBorder: "hover:border-indigo-300 dark:hover:border-indigo-700",
                hoverGlow: "hover:shadow-indigo-500/8",
                iconBg: "bg-indigo-100 dark:bg-indigo-900/40",
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-brand-indigo dark:text-indigo-400"><path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" /></svg>,
              },
              {
                href: "/genetics",
                label: tSuite("geneticsLabel"),
                title: tSuite("geneticsTitle"),
                desc: tSuite("geneticsDesc"),
                cta: tSuite("geneticsCta"),
                color: "text-fuchsia-600 dark:text-fuchsia-400",
                hoverBorder: "hover:border-fuchsia-300 dark:hover:border-fuchsia-700",
                hoverGlow: "hover:shadow-fuchsia-500/8",
                iconBg: "bg-fuchsia-100 dark:bg-fuchsia-900/40",
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-fuchsia-600 dark:text-fuchsia-400"><path fillRule="evenodd" d="M3.5 2a.5.5 0 01.5.5V4h12V2.5a.5.5 0 011 0V4a4 4 0 01-1.553 3.163C13.86 8.292 12 9.756 12 12c0 2.244 1.86 3.708 3.447 4.837A4 4 0 0117 20v-1.5a.5.5 0 01-1 0V18H4v1.5a.5.5 0 01-1 0V20a4 4 0 011.553-3.163C6.14 15.708 8 14.244 8 12c0-2.244-1.86-3.708-3.447-4.837A4 4 0 013 4V2.5a.5.5 0 01.5-.5zM6 5h8c0 .76-.25 1.5-.84 2.07L10 9.65 6.84 7.07A2.83 2.83 0 016 5zm0 11l3-2.16V11l-2.95 2.21A2.79 2.79 0 006 16zm5-2.16l3 2.16c0-.78-.4-1.5-1.05-1.95L11 11v2.84z" clipRule="evenodd" /></svg>,
              },
              {
                href: "/pediatric",
                label: tSuite("pediatricLabel"),
                title: tSuite("pediatricTitle"),
                desc: tSuite("pediatricDesc"),
                cta: tSuite("pediatricCta"),
                color: "text-rose-600 dark:text-rose-400",
                hoverBorder: "hover:border-rose-300 dark:hover:border-rose-700",
                hoverGlow: "hover:shadow-rose-500/8",
                iconBg: "bg-rose-100 dark:bg-rose-900/40",
                icon: <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-rose-600 dark:text-rose-400"><path d="M9.653 16.915l-.005-.003-.019-.01a20.759 20.759 0 01-1.162-.682 22.045 22.045 0 01-2.582-1.9C4.045 12.733 2 10.352 2 7.5a4.5 4.5 0 018-2.828A4.5 4.5 0 0118 7.5c0 2.852-2.044 5.233-3.885 6.82a22.049 22.049 0 01-3.744 2.582l-.019.01-.005.003h-.002a.739.739 0 01-.69.001l-.002-.001z" /></svg>,
              },
              {
                href: "/womens-health",
                label: tSuite("womensHealthLabel"),
                title: tSuite("womensHealthTitle"),
                desc: tSuite("womensHealthDesc"),
                cta: tSuite("womensHealthCta"),
                color: "text-violet-600 dark:text-violet-400",
                hoverBorder: "hover:border-violet-300 dark:hover:border-violet-700",
                hoverGlow: "hover:shadow-violet-500/8",
                iconBg: "bg-gradient-to-br from-rose-100 to-violet-100 dark:from-rose-900/40 dark:to-violet-900/40",
                icon: <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth={1.6} className="w-5 h-5 text-violet-600 dark:text-violet-400"><path strokeLinecap="round" strokeLinejoin="round" d="M10 3a3.5 3.5 0 100 7 3.5 3.5 0 000-7zm0 7v6m-2.5-2.5h5" /></svg>,
              },
            ].map((tool, i) => (
              <Link key={tool.href} href={tool.href} className={`reveal reveal-delay-${Math.min(i + 1, 5)} group bento bento-hover bento-spot flex flex-col p-6`}>
                <div className={`relative z-10 w-11 h-11 rounded-xl ${tool.iconBg} flex items-center justify-center mb-4 flex-shrink-0 group-hover:scale-110 transition-transform duration-500`}>
                  {tool.icon}
                </div>
                <p className={`relative z-10 text-[11px] font-bold ${tool.color} uppercase tracking-wider mb-1.5`}>{tool.label}</p>
                <h3 className="relative z-10 font-display text-lg font-bold text-ink mb-2 tracking-tight">{tool.title}</h3>
                <p className="relative z-10 text-sm text-ink-secondary leading-relaxed flex-1 mb-4">{tool.desc}</p>
                <span className={`relative z-10 inline-flex items-center gap-1.5 text-sm font-bold ${tool.color} group-hover:gap-2.5 transition-all duration-300`}>
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
              <div key={i} className="flex flex-col items-center justify-center py-8 px-4 bg-surface">
                <span data-countup className={`font-display text-3xl sm:text-[2.6rem] font-bold tracking-tightest ${stat.color}`}>{stat.number}</span>
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
            <div className="bento bento-hover p-6">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-brand-blue/25 mb-3"><path d="M9.5 6C6.5 6 4 8.5 4 11.5V18h6v-6H7c0-1.7 1.1-3 2.5-3V6zm10 0c-3 0-5.5 2.5-5.5 5.5V18h6v-6h-3c0-1.7 1.1-3 2.5-3V6z"/></svg>
              <p className="text-[15px] text-ink-secondary leading-relaxed mb-4">
                &ldquo;{tTestimonials("quote1")}&rdquo;
              </p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-brand-indigo flex items-center justify-center">
                  <span className="text-[10px] font-bold text-white">S</span>
                </div>
                <span className="text-xs text-ink-tertiary">{tTestimonials("author1")}</span>
              </div>
            </div>
            <div className="bento bento-hover p-6">
              <svg viewBox="0 0 24 24" fill="currentColor" className="w-7 h-7 text-violet-500/25 mb-3"><path d="M9.5 6C6.5 6 4 8.5 4 11.5V18h6v-6H7c0-1.7 1.1-3 2.5-3V6zm10 0c-3 0-5.5 2.5-5.5 5.5V18h6v-6h-3c0-1.7 1.1-3 2.5-3V6z"/></svg>
              <p className="text-[15px] text-ink-secondary leading-relaxed mb-4">
                &ldquo;{tTestimonials("quote2")}&rdquo;
              </p>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center">
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
              <span className="chip text-brand-blue">
                <span className="kicker-mono text-brand-blue">{tFeatures("badge")}</span>
              </span>
              <h2 className="mt-5 font-display text-4xl sm:text-5xl font-bold text-ink tracking-tightest leading-[1.05]">{tFeatures("title")}</h2>
              <p className="mt-4 text-lg text-ink-secondary leading-relaxed text-pretty">{tFeatures("subtitle")}</p>
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
              <div className="absolute -inset-6 bg-gradient-to-br from-brand-blue/15 via-brand-indigo/10 to-brand-cyan/10 rounded-[2.5rem] blur-3xl" />
              <div className="relative">
                <LabInterpretationDemo />
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
      <section className="relative py-16 px-4 bg-surface overflow-hidden">
        <div className="max-w-6xl mx-auto reveal">
          {/* Cinematic dark card */}
          <div
            className="relative isolate overflow-hidden rounded-[2rem] px-8 py-24 sm:py-28 text-center grain vignette dark-grid-overlay"
            style={{
              background: "linear-gradient(180deg, #0B1224 0%, #0A0F20 50%, #070A16 100%)",
              border: "1px solid rgba(99,130,255,0.22)"
            }}
          >
            {/* Aurora glow */}
            <div className="aurora-field" aria-hidden="true" data-parallax="0.16">
              <div className="aurora-blob animate-aurora" style={{ top: "-20%", left: "12%", width: "40vw", height: "40vw", background: "radial-gradient(circle at 40% 40%, rgba(74,133,239,0.5), transparent 60%)" }} />
              <div className="aurora-blob animate-aurora" style={{ bottom: "-25%", right: "8%", width: "36vw", height: "36vw", background: "radial-gradient(circle at 60% 50%, rgba(139,92,246,0.45), transparent 62%)", animationDelay: "-8s" }} />
              <div className="aurora-blob animate-aurora" style={{ top: "20%", right: "30%", width: "26vw", height: "26vw", background: "radial-gradient(circle at 50% 50%, rgba(34,211,238,0.3), transparent 64%)", animationDelay: "-13s" }} />
            </div>

            <div className="relative z-10">
              <h2 className="font-display text-[2.6rem] sm:text-6xl lg:text-[4.2rem] font-bold text-white tracking-tightest mb-5 leading-[0.98] text-balance">
                {tCTA("title")}
              </h2>
              <p className="text-lg sm:text-xl mb-10 max-w-2xl mx-auto text-pretty" style={{ color: "rgba(200,210,245,0.78)" }}>
                {tCTA("subtitle")}
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                <Link
                  href="/app"
                  className="group inline-flex items-center gap-3 px-8 py-4 rounded-full text-base font-bold transition-all duration-300 hover:-translate-y-0.5"
                  style={{ background: "linear-gradient(180deg, #fff, #e8eeff)", color: "#0B1224", boxShadow: "0 12px 36px -10px rgba(120,160,255,0.6)" }}
                >
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                    <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                  </svg>
                  {tCTA("button")}
                </Link>
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 px-7 py-4 rounded-full text-base font-semibold transition-all duration-200 hover:bg-white/5"
                  style={{ color: "rgba(210,218,250,0.85)", border: "1px solid rgba(255,255,255,0.2)" }}
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
