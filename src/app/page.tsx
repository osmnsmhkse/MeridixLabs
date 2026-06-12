"use client";

import Link from "next/link";
import { useTranslations } from "next-intl";
import HeroCTA from "@/components/HeroCTA";
import WordReveal from "@/components/WordReveal";
import LabInterpretationDemo from "@/components/LabInterpretationDemo";

/* Editorial arrow — quiet, consistent */
function Arrow({ className = "w-4 h-4" }: { className?: string }) {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className={className} aria-hidden="true">
      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
    </svg>
  );
}

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

  const TOOLS = [
    { href: "/app",           label: tSuite("mostUsed"),           title: tSuite("labTitle"),          desc: tSuite("labDesc") },
    { href: "/symptom",       label: tSuite("symptomLabel"),       title: tSuite("symptomTitle"),      desc: tSuite("symptomDesc") },
    { href: "/diagnosed",     label: tSuite("diagnosisLabel"),     title: tSuite("diagnosisTitle"),    desc: tSuite("diagnosisDesc") },
    { href: "/imaging",       label: tSuite("imagingLabel"),       title: tSuite("imagingTitle"),      desc: tSuite("imagingDesc") },
    { href: "/trends",        label: tSuite("trendLabel"),         title: tSuite("trendTitle"),        desc: tSuite("trendDesc") },
    { href: "/medications",   label: tSuite("medicationLabel"),    title: tSuite("medicationTitle"),   desc: tSuite("medicationDesc") },
    { href: "/visit",         label: tSuite("visitLabel"),         title: tSuite("visitTitle"),        desc: tSuite("visitDesc") },
    { href: "/genetics",      label: tSuite("geneticsLabel"),      title: tSuite("geneticsTitle"),     desc: tSuite("geneticsDesc") },
    { href: "/pediatric",     label: tSuite("pediatricLabel"),     title: tSuite("pediatricTitle"),    desc: tSuite("pediatricDesc") },
    { href: "/womens-health", label: tSuite("womensHealthLabel"),  title: tSuite("womensHealthTitle"), desc: tSuite("womensHealthDesc") },
  ];

  return (
    <div className="min-h-screen">

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative -mt-16 gradient-hero overflow-hidden">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 pt-36 lg:pt-44 pb-16 lg:pb-24">

          <div className="chip text-ink-secondary reveal">
            {tHero("badge")}
          </div>

          {/* Giant editorial headline */}
          <h1 className="mt-8 font-display text-ink leading-[0.98] tracking-tightest text-[clamp(2.9rem,8.4vw,8rem)] max-w-[18ch]">
            <WordReveal text={tHero("title")} base={0.1} />{" "}
            <WordReveal
              text={tHero("highlight")}
              startIndex={tHero("title").split(" ").length}
              base={0.1}
            />
          </h1>

          {/* Sub-row: copy left, actions right */}
          <div className="mt-12 lg:mt-16 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8 reveal reveal-delay-3">
            <p className="max-w-md text-base sm:text-lg text-ink-secondary leading-relaxed text-pretty">
              {tHero("subtitle")}
            </p>
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 flex-shrink-0">
              <HeroCTA />
              <a
                href="#how-it-works"
                className="btn-ghost inline-flex items-center gap-2 px-6 py-3.5 font-medium text-[15px]"
              >
                {tHero("seeHow")}
              </a>
            </div>
          </div>

          {/* The product, centered — performs its own entrance */}
          <div className="mt-16 lg:mt-20 max-w-3xl mx-auto">
            <LabInterpretationDemo />
          </div>

          {/* The 4-step promise — quiet spec strip, rules draw in */}
          <div className="mt-16 lg:mt-20 grid grid-cols-2 lg:grid-cols-4 gap-y-8">
            {[tHero("p1"), tHero("p2"), tHero("p3"), tHero("p4")].map((step, i) => (
              <div key={step} className={`reveal reveal-delay-${i + 1} rule-draw-v pl-5 pr-6`}>
                <p className="kicker-mono text-ink-tertiary mb-2 tabular-nums">{String(i + 1).padStart(2, "0")}</p>
                <p className="text-sm font-medium text-ink leading-snug text-pretty">{step}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── ENTRY PATHS ──────────────────────────────────────── */}
      <section className="relative bg-surface border-t border-surface-border">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10">
          <div className="grid grid-cols-1 md:grid-cols-3 md:divide-x divide-surface-border">
            {[
              { href: "/symptom",   step: tHero("startHere"),     title: tSuite("symptomLabel"),   desc: tSuite("symptomDesc") },
              { href: "/app",       step: tHero("labCard"),       title: tSuite("labTitle"),       desc: tSuite("labDesc") },
              { href: "/diagnosed", step: tHero("diagnosisCard"), title: tSuite("diagnosisLabel"), desc: tSuite("diagnosisDesc") },
            ].map((item, i) => (
              <Link
                key={item.href}
                href={item.href}
                className={`group block reveal reveal-delay-${i + 1} py-12 md:py-16 px-0 md:px-10 ${i === 0 ? "md:pl-0" : ""} ${i === 2 ? "md:pr-0" : ""} border-t md:border-t-0 border-surface-border first:border-t-0 transition-colors`}
              >
                <p className="kicker-mono text-ink-tertiary mb-6">{item.step}</p>
                <div className="flex items-baseline justify-between gap-4">
                  <h3 className="font-display text-2xl sm:text-[1.7rem] text-ink leading-tight">
                    {item.title}
                  </h3>
                  <span className="text-ink-tertiary group-hover:text-ink group-hover:translate-x-1 transition-all duration-300 flex-shrink-0">
                    <Arrow />
                  </span>
                </div>
                <p className="mt-3 text-sm text-ink-secondary leading-relaxed max-w-xs">{item.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="relative bg-duck">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-24 lg:py-36">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16 lg:mb-24 reveal">
            <div className="lg:col-span-4">
              <span className="chip text-ink-secondary">{tHow("badge")}</span>
            </div>
            <div className="lg:col-span-8">
              <h2 className="font-display text-ink tracking-tightest leading-[1.02] text-4xl sm:text-5xl lg:text-[3.6rem] max-w-[16ch]">
                {tHow("title")}
              </h2>
              <p className="mt-5 text-base sm:text-lg text-ink-secondary max-w-xl text-pretty">{tHow("subtitle")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-10 md:gap-12">
            {[
              { step: "01", title: tHow("step1Title"), description: tHow("step1Desc") },
              { step: "02", title: tHow("step2Title"), description: tHow("step2Desc") },
              { step: "03", title: tHow("step3Title"), description: tHow("step3Desc") },
            ].map((item, i) => (
              <div key={item.step} className={`reveal reveal-delay-${i + 1} rule-draw pt-8`} style={{ ["--rule-opacity" as string]: 0.3 }}>
                <p className="numeral text-[2.75rem] text-ink-tertiary/70">{item.step}</p>
                <h3 className="mt-6 font-display text-xl sm:text-2xl text-ink leading-snug">{item.title}</h3>
                <p className="mt-3 text-sm text-ink-secondary leading-relaxed text-pretty">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── PRODUCT SUITE — editorial index ──────────────────── */}
      <section className="relative bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-24 lg:py-36">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-14 lg:mb-20 reveal">
            <div className="lg:col-span-4">
              <span className="chip text-ink-secondary">{tSuite("badge")}</span>
            </div>
            <div className="lg:col-span-8">
              <h2 className="font-display text-ink tracking-tightest leading-[1.02] text-4xl sm:text-5xl lg:text-[3.6rem]">
                {tSuite("title")} {tSuite("titleHighlight")}
              </h2>
              <p className="mt-5 text-base sm:text-lg text-ink-secondary max-w-xl text-pretty">
                {tSuite("subtitle")}
              </p>
            </div>
          </div>

          <div className="reveal rule-draw" style={{ ["--rule-opacity" as string]: 0.16 }}>
            {TOOLS.map((tool, i) => (
              <Link
                key={tool.href}
                href={tool.href}
                className="group grid grid-cols-[2.5rem_1fr_2rem] md:grid-cols-[4rem_minmax(0,5fr)_minmax(0,6fr)_3rem] items-baseline gap-4 md:gap-8 py-7 md:py-8 border-b border-surface-border transition-colors duration-300 hover:bg-surface-raised -mx-5 lg:-mx-10 px-5 lg:px-10"
              >
                <span className="kicker-mono text-ink-tertiary tabular-nums">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span className="min-w-0">
                  <span className="block kicker-mono text-ink-tertiary mb-1.5">{tool.label}</span>
                  <span className="block font-display text-xl sm:text-2xl text-ink leading-tight">
                    {tool.title}
                  </span>
                </span>
                <span className="hidden md:block text-sm text-ink-secondary leading-relaxed text-pretty self-center">
                  {tool.desc}
                </span>
                <span className="text-ink-tertiary group-hover:text-ink group-hover:translate-x-1 transition-all duration-300 self-center justify-self-end">
                  <Arrow />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ─── STATS ────────────────────────────────────────────── */}
      <section className="relative bg-paper">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-20 lg:py-28">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-y-12">
            {[
              { number: tStats("reportsCount"), label: tStats("reportsLabel") },
              { number: tStats("speedCount"),   label: tStats("speedLabel") },
              { number: tStats("tiersCount"),   label: tStats("tiersLabel") },
              { number: tStats("toolsCount"),   label: tStats("toolsLabel") },
            ].map((stat, i) => (
              <div key={stat.label} className={`reveal reveal-delay-${i + 1} rule-draw-v pl-6 pr-4`}>
                <span data-countup className="numeral block text-[2.9rem] sm:text-[3.6rem] text-ink">
                  {stat.number}
                </span>
                <p className="mt-3 kicker-mono text-ink-tertiary">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 pt-8 border-t border-ink/10 dark:border-white/10 flex flex-wrap gap-x-12 gap-y-3 reveal reveal-delay-1">
            {[tStats("encrypted"), tStats("resultsInSeconds"), tStats("advancedAI"), tStats("freeToTry")].map((item) => (
              <span key={item} className="kicker-mono text-ink-secondary">{item}</span>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TIERS ────────────────────────────────────────────── */}
      <section className="relative bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-24 lg:py-36">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 mb-16 lg:mb-24 reveal">
            <div className="lg:col-span-4">
              <span className="chip text-ink-secondary">{tTiers("badge")}</span>
            </div>
            <div className="lg:col-span-8">
              <h2 className="font-display text-ink tracking-tightest leading-[1.02] text-4xl sm:text-5xl lg:text-[3.6rem] max-w-[16ch]">
                {tTiers("title")}
              </h2>
              <p className="mt-5 text-base sm:text-lg text-ink-secondary max-w-xl text-pretty">{tTiers("subtitle")}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { tier: tTiers("simple"), audience: tTiers("noBackground"), example: tTiers("simpleExample"), highlight: tTiers("simpleDesc") },
              { tier: tTiers("medium"), audience: tTiers("educated"),     example: tTiers("mediumExample"), highlight: tTiers("mediumDesc") },
              { tier: tTiers("expert"), audience: tTiers("clinician"),    example: tTiers("expertExample"), highlight: tTiers("expertDesc") },
            ].map((tier, i) => (
              <div key={tier.tier} className={`reveal reveal-delay-${i + 1} bento p-8 flex flex-col bg-duck border-0`}>
                <p className="kicker-mono text-ink-tertiary">{tier.audience}</p>
                <h3 className="mt-5 font-display text-[1.9rem] text-ink leading-tight">{tier.tier}</h3>
                <p className="mt-6 text-sm text-ink-secondary leading-relaxed border-l border-ink/20 dark:border-white/20 pl-4 flex-1">
                  {tier.example}
                </p>
                <p className="mt-8 pt-5 border-t border-ink/10 dark:border-white/10 kicker-mono text-ink-tertiary">
                  {tier.highlight}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="relative bg-duck">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-24 lg:py-36">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-start">
            <div className="reveal">
              <span className="chip text-ink-secondary">{tFeatures("badge")}</span>
              <h2 className="mt-8 font-display text-ink tracking-tightest leading-[1.04] text-4xl sm:text-5xl max-w-[16ch]">
                {tFeatures("title")}
              </h2>
              <p className="mt-5 text-base sm:text-lg text-ink-secondary leading-relaxed text-pretty max-w-lg">
                {tFeatures("subtitle")}
              </p>
              <div className="mt-12">
                {[
                  { title: tFeatures("flaggedTitle"),    desc: tFeatures("flaggedDesc") },
                  { title: tFeatures("etiologyTitle"),   desc: tFeatures("etiologyDesc") },
                  { title: tFeatures("specialistTitle"), desc: tFeatures("specialistDesc") },
                  { title: tFeatures("privacyTitle"),    desc: tFeatures("privacyDesc") },
                  { title: tFeatures("speedTitle"),      desc: tFeatures("speedDesc") },
                ].map((feat, i) => (
                  <div key={feat.title} className={`reveal reveal-delay-${Math.min(i + 1, 5)} rule-draw grid grid-cols-[3rem_1fr] gap-4 py-5`}>
                    <span className="kicker-mono text-ink-tertiary tabular-nums pt-0.5">{String(i + 1).padStart(2, "0")}</span>
                    <div>
                      <h4 className="text-[15px] font-medium text-ink">{feat.title}</h4>
                      <p className="text-sm text-ink-secondary mt-1 leading-relaxed">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="lg:sticky lg:top-24">
              <LabInterpretationDemo />
            </div>
          </div>
        </div>
      </section>

      {/* ─── TESTIMONIALS ─────────────────────────────────────── */}
      <section className="relative bg-surface">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-24 lg:py-32">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">
            {[
              { quote: tTestimonials("quote1"), author: tTestimonials("author1") },
              { quote: tTestimonials("quote2"), author: tTestimonials("author2") },
            ].map((item, i) => (
              <figure key={item.author} className={`reveal reveal-delay-${i + 1} rule-draw pt-8`} style={{ ["--rule-opacity" as string]: 0.3 }}>
                <blockquote className="font-display text-xl sm:text-2xl text-ink leading-snug text-pretty">
                  &ldquo;{item.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-6 kicker-mono text-ink-tertiary">{item.author}</figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ─── DISCLAIMER BAND ─────────────────────────────────── */}
      <section className="bg-surface border-t border-surface-border">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-6">
          <p className="text-xs text-ink-tertiary text-pretty">
            {tDisclaimer("short")}
          </p>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────── */}
      <section className="relative bg-navy">
        <div className="max-w-[1440px] mx-auto px-5 lg:px-10 py-28 lg:py-40">
          <div className="reveal">
            <h2 className="font-display text-white tracking-tightest leading-[1.0] text-[clamp(2.6rem,6.5vw,5.5rem)] max-w-[16ch]">
              {tCTA("title")}
            </h2>
            <p className="mt-7 text-base sm:text-lg max-w-xl text-pretty" style={{ color: "rgba(255,255,255,0.65)" }}>
              {tCTA("subtitle")}
            </p>
            <div className="mt-12 flex flex-col sm:flex-row items-start sm:items-center gap-3">
              <Link
                href="/app"
                className="inline-flex items-center gap-2.5 px-7 py-4 rounded-lg text-[15px] font-medium bg-white text-[#1B1E24] hover:bg-[#EDF1F5] transition-colors"
              >
                {tCTA("button")}
                <Arrow className="w-4 h-4" />
              </Link>
              <a
                href="#how-it-works"
                className="inline-flex items-center px-7 py-4 rounded-lg text-[15px] font-medium text-white/85 border border-white/25 hover:border-white/60 hover:text-white transition-colors"
              >
                {tCTA("seeHow")}
              </a>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
