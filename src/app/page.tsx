"use client";

import React, { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useTranslations } from "next-intl";
import HeroCTA from "@/components/HeroCTA";

type DemoTier = "Simple" | "Medium" | "Expert";

// ─── Mouse spotlight tracker ───────────────────────────────────────
function useSpotlight<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: MouseEvent) => {
      const rect = el.getBoundingClientRect();
      el.style.setProperty("--mx", `${e.clientX - rect.left}px`);
      el.style.setProperty("--my", `${e.clientY - rect.top}px`);
    };
    el.addEventListener("mousemove", onMove);
    return () => el.removeEventListener("mousemove", onMove);
  }, []);
  return ref;
}

// ─── Live ticking number (no API — just simulates motion) ─────────
function LiveTick({ base, jitter = 4, suffix = "", className = "" }: { base: number; jitter?: number; suffix?: string; className?: string }) {
  const [v, setV] = useState(base);
  useEffect(() => {
    const id = setInterval(() => {
      setV(base + Math.floor((Math.random() - 0.5) * jitter * 2));
    }, 1800);
    return () => clearInterval(id);
  }, [base, jitter]);
  return <span className={`display-num num-flicker ${className}`}>{v.toLocaleString()}{suffix}</span>;
}

// ─── Sparkline svg (decorative, deterministic-ish) ────────────────
function Spark({ color = "#22D3EE", h = 32, w = 96 }: { color?: string; h?: number; w?: number }) {
  const points = [4, 9, 6, 14, 10, 18, 12, 22, 16, 26, 12, 30, 24, 20];
  const max = Math.max(...points);
  const step = w / (points.length - 1);
  const path = points.map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - (p / max) * (h - 4) - 2}`).join(" ");
  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-full">
      <defs>
        <linearGradient id={`sg-${color.replace("#", "")}`} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor={color} stopOpacity="0.35" />
          <stop offset="100%" stopColor={color} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${path} L ${w} ${h} L 0 ${h} Z`} fill={`url(#sg-${color.replace("#", "")})`} />
      <path className="sparkline-path" d={path} fill="none" stroke={color} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

// ─── Activity strip (pulsing vertical bars) ───────────────────────
function ActivityStrip({ count = 36 }: { count?: number }) {
  return (
    <div className="flex items-end gap-[2px] h-8">
      {Array.from({ length: count }).map((_, i) => (
        <span
          key={i}
          className="bar-tick w-[3px] rounded-sm bg-gradient-to-t from-brand-blue/40 to-cyan-400"
          style={{ animationDelay: `${(i % 12) * 0.08}s`, height: `${20 + (i * 37) % 60}%` }}
        />
      ))}
    </div>
  );
}

// ─── Terminal-style section divider ───────────────────────────────
function TerminalRule({ id, label }: { id: string; label: string }) {
  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="terminal-divider">
        <span className="text-brand-blue">┌─</span>
        <span>SYS::{id}</span>
        <span className="text-ink-tertiary">·</span>
        <span className="text-ink-secondary">{label}</span>
      </div>
    </div>
  );
}

// ─── HUD bracket helper for any wrapping div ──────────────────────
function HudBrackets({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <div className={`hud-brackets ${className}`}>
      <span className="hud-tr" />
      <span className="hud-bl" />
      {children}
    </div>
  );
}

export default function LandingPage() {
  const [demoTier, setDemoTier] = useState<DemoTier>("Simple");
  const heroRef = useSpotlight<HTMLDivElement>();

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
      specialist: { label: tTiers("demoSimpleSpecialistLabel"), body: tTiers.rich("demoSimpleSpecialistBody", { b: (c) => <strong className="panel-text-bright">{c}</strong> }) },
    },
    Medium: {
      summary: tTiers("demoMediumSummary"),
      specialist: { label: tTiers("demoMediumSpecialistLabel"), body: tTiers.rich("demoMediumSpecialistBody", { b: (c) => <strong className="panel-text-bright">{c}</strong> }) },
    },
    Expert: {
      summary: tTiers("demoExpertSummary"),
      specialist: { label: tTiers("demoExpertSpecialistLabel"), body: tTiers.rich("demoExpertSpecialistBody", { b: (c) => <strong className="panel-text-bright">{c}</strong> }) },
    },
  };

  return (
    <div className="min-h-screen">

      {/* ════════════════════════════════════════════════════════ */}
      {/* HERO — instrument console                                */}
      {/* ════════════════════════════════════════════════════════ */}
      <section
        ref={heroRef}
        className="relative min-h-[92vh] flex items-center overflow-hidden gradient-hero pt-20 pb-24"
      >
        <div className="crt-grid" />
        <div className="spotlight" />
        <div className="crt-scanlines" />

        {/* Glow orbs */}
        <div className="absolute -top-32 -left-20 w-[420px] h-[420px] rounded-full orb-float pointer-events-none"
             style={{ background: "radial-gradient(circle at 50% 50%, rgba(74,133,239,0.22), transparent 70%)", filter: "blur(50px)" }} />
        <div className="absolute -bottom-40 -right-20 w-[520px] h-[520px] rounded-full orb-float pointer-events-none"
             style={{ background: "radial-gradient(circle at 50% 50%, rgba(99,102,241,0.18), transparent 70%)", filter: "blur(60px)", animationDelay: "-6s" }} />

        <div className="relative z-10 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Top status bar */}
          <div className="flex items-center justify-between mb-10 reveal">
            <div className="flex items-center gap-3 px-3 py-1.5 rounded-full bg-white/70 dark:bg-slate-900/70 backdrop-blur border border-surface-border">
              <span className="w-2 h-2 rounded-full live-dot" />
              <span className="kicker-mono text-emerald-600 dark:text-emerald-400">SYSTEM ONLINE</span>
              <span className="text-ink-tertiary">·</span>
              <span className="kicker-mono text-ink-tertiary">v2.4 / meridix-core</span>
            </div>
            <div className="hidden md:flex items-center gap-4 kicker-mono text-ink-tertiary">
              <span>LAT&nbsp;<span className="text-brand-blue">128ms</span></span>
              <span className="text-ink-tertiary/40">|</span>
              <span>UPTIME&nbsp;<span className="text-emerald-500">99.98%</span></span>
              <span className="text-ink-tertiary/40">|</span>
              <span>NODES&nbsp;<span className="text-brand-blue">07</span></span>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 items-center">
            {/* Left column — headline */}
            <div className="lg:col-span-7 relative">
              <span className="kicker-mono text-brand-blue mb-4 inline-block reveal">// {tHero("badge")}</span>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-ink leading-[0.96] tracking-tightest mb-6 reveal reveal-delay-1">
                {tHero("title")}{" "}
                <span className="text-gradient-sci caret-blink">{tHero("highlight")}</span>
              </h1>

              <p className="max-w-xl text-lg text-ink-secondary leading-relaxed mb-8 reveal reveal-delay-2">
                {tHero("subtitle")}
              </p>

              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 reveal reveal-delay-3">
                <HeroCTA />
                <a
                  href="#how-it-works"
                  className="inline-flex items-center gap-2 px-6 py-3.5 rounded-2xl text-sm font-semibold text-ink-secondary hover:text-ink border border-surface-border hover:border-brand-blue/40 bg-white/70 dark:bg-slate-900/70 backdrop-blur transition"
                >
                  <span className="kicker-mono">›_</span>
                  {tHero("seeHow")}
                </a>
              </div>

              {/* Trust signals — terminal style */}
              <div className="mt-10 grid grid-cols-2 sm:grid-cols-4 gap-3 reveal reveal-delay-4">
                {[
                  { k: "01", t: tHero("trustEncrypted") },
                  { k: "02", t: tHero("trustSpeed") },
                  { k: "03", t: tHero("trustAI") },
                  { k: "04", t: tHero("trustFree") },
                ].map((s) => (
                  <div key={s.k} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/60 dark:bg-slate-900/60 border border-surface-border">
                    <span className="kicker-mono text-brand-blue">{s.k}</span>
                    <span className="text-xs text-ink-secondary truncate">{s.t}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Right column — live console panel */}
            <div className="lg:col-span-5 relative reveal reveal-delay-2">
              <HudBrackets>
                <div className="sci-panel scan-sweep">
                  {/* Panel chrome */}
                  <div className="flex items-center justify-between px-4 py-2.5 border-b panel-border">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
                      <span className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
                    </div>
                    <span className="kicker-mono panel-text-dim">meridix://scan/active</span>
                    <span className="kicker-mono text-cyan-live flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-live shadow-cyan-glow animate-pulse" />
                      LIVE
                    </span>
                  </div>

                  {/* Console body */}
                  <div className="p-5 space-y-4">
                    {/* Pseudo log lines */}
                    <div className="font-mono text-[11px] leading-relaxed space-y-1">
                      <p className="panel-text-dim">$ meridix --analyze report.pdf</p>
                      <p className="panel-text">› <span className="text-cyan-live">[OK]</span> parsing reference ranges</p>
                      <p className="panel-text">› <span className="text-cyan-live">[OK]</span> cross-checking 142 biomarkers</p>
                      <p className="panel-text">› <span className="text-emerald-400">[OK]</span> generating interpretation<span className="caret-blink" /></p>
                    </div>

                    {/* Metric rows */}
                    <div className="space-y-2 pt-2">
                      <div className="panel-row-warn rounded-lg px-3 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="kicker-mono text-amber-400">FLAG</span>
                          <span className="text-sm panel-text-bright font-semibold">Glucose</span>
                        </div>
                        <div className="text-right">
                          <span className="display-num text-amber-400 text-sm">112</span>
                          <span className="kicker-mono panel-text-dim ml-1">mg/dL</span>
                        </div>
                      </div>
                      <div className="panel-row-ok rounded-lg px-3 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="kicker-mono text-emerald-400">OK&nbsp;&nbsp;</span>
                          <span className="text-sm panel-text-bright font-semibold">Creatinine</span>
                        </div>
                        <div className="text-right">
                          <span className="display-num text-emerald-400 text-sm">0.9</span>
                          <span className="kicker-mono panel-text-dim ml-1">mg/dL</span>
                        </div>
                      </div>
                      <div className="panel-row rounded-lg px-3 py-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="kicker-mono panel-text-dim">···&nbsp;</span>
                          <span className="text-sm panel-text-bright font-semibold">Sodium</span>
                        </div>
                        <div className="text-right">
                          <span className="display-num panel-text-bright text-sm">134</span>
                          <span className="kicker-mono panel-text-dim ml-1">mEq/L</span>
                        </div>
                      </div>
                    </div>

                    {/* Mini activity strip */}
                    <div className="pt-2">
                      <div className="flex items-center justify-between mb-2">
                        <span className="kicker-mono panel-text-dim">SIGNAL</span>
                        <span className="kicker-mono text-cyan-live">+0.4σ</span>
                      </div>
                      <ActivityStrip count={42} />
                    </div>
                  </div>

                  {/* Footer chrome */}
                  <div className="px-4 py-2 border-t panel-border flex items-center justify-between">
                    <span className="kicker-mono panel-text-dim">elapsed&nbsp;<span className="text-cyan-live">2.31s</span></span>
                    <div className="tracer-line w-24" />
                    <span className="kicker-mono panel-text-dim">conf&nbsp;<span className="text-emerald-400">97%</span></span>
                  </div>
                </div>
              </HudBrackets>
            </div>
          </div>

          {/* Quick-entry tools row */}
          <div className="mt-14 reveal reveal-delay-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { href: "/symptom",   color: "emerald", k: "01", step: tHero("startHere"),       title: tSuite("symptomLabel"),  desc: tSuite("symptomDesc") },
                { href: "/app",       color: "blue",    k: "02", step: tHero("labCard"),         title: tSuite("labTitle"),      desc: tSuite("labDesc") },
                { href: "/diagnosed", color: "violet",  k: "03", step: tHero("diagnosisCard"),   title: tSuite("diagnosisLabel"),desc: tSuite("diagnosisDesc") },
              ].map((item) => {
                const cMap: Record<string, { text: string; border: string; dot: string }> = {
                  emerald: { text: "text-emerald-500", border: "hover:border-emerald-400/60", dot: "bg-emerald-400" },
                  blue:    { text: "text-brand-blue",  border: "hover:border-brand-blue/60",  dot: "bg-brand-blue" },
                  violet:  { text: "text-violet-500",  border: "hover:border-violet-400/60",  dot: "bg-violet-400" },
                };
                const c = cMap[item.color];
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`group relative p-5 rounded-2xl bg-white/70 dark:bg-slate-900/70 backdrop-blur border border-surface-border ${c.border} transition-all duration-300 hover:-translate-y-0.5`}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="kicker-mono text-ink-tertiary">{item.k} · {item.step}</span>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} opacity-60 group-hover:opacity-100`} />
                    </div>
                    <p className={`text-sm font-semibold ${c.text} mb-1`}>{item.title}</p>
                    <p className="text-xs text-ink-tertiary leading-relaxed line-clamp-2">{item.desc}</p>
                    <div className="tracer-line mt-3 opacity-30 group-hover:opacity-100 transition-opacity" />
                  </Link>
                );
              })}
            </div>
          </div>
        </div>

        {/* Bottom edge tracer */}
        <div className="absolute bottom-0 left-0 right-0 tracer-line" />
      </section>

      {/* ════════════════════════════════════════════════════════ */}
      {/* HOW IT WORKS                                             */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="py-6 bg-white dark:bg-slate-900">
        <TerminalRule id="02.01" label={tHow("badge")} />
      </div>

      <section id="how-it-works" className="relative py-24 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="crt-grid opacity-50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14 reveal">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tightest leading-[1.05]">
              {tHow("title")}
            </h2>
            <p className="mt-4 text-lg text-ink-secondary">{tHow("subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-px bg-surface-border rounded-2xl overflow-hidden border border-surface-border">
            {[
              { k: "01", t: tHow("step1Title"), d: tHow("step1Desc") },
              { k: "02", t: tHow("step2Title"), d: tHow("step2Desc") },
              { k: "03", t: tHow("step3Title"), d: tHow("step3Desc") },
            ].map((step, i) => (
              <div
                key={step.k}
                className={`reveal reveal-delay-${i + 1} group relative bg-white dark:bg-slate-900 p-8 hover:bg-surface-raised transition-colors duration-300`}
              >
                <div className="flex items-center justify-between mb-6">
                  <span className="display-num text-3xl text-brand-blue/70">{step.k}</span>
                  <div className="flex items-center gap-1">
                    <span className="w-1 h-1 rounded-full bg-brand-blue/40" />
                    <span className="w-1 h-1 rounded-full bg-brand-blue/40" />
                    <span className="w-1 h-1 rounded-full bg-brand-blue group-hover:shadow-cyan-glow transition-shadow" />
                  </div>
                </div>
                <h3 className="text-xl font-bold text-ink mb-2 tracking-tighter3">{step.t}</h3>
                <p className="text-sm text-ink-secondary leading-relaxed">{step.d}</p>
                <div className="tracer-line mt-6 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════ */}
      {/* TIERS                                                    */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="py-6 bg-surface-raised">
        <TerminalRule id="02.02" label={tTiers("badge")} />
      </div>

      <section className="relative py-24 bg-surface-raised overflow-hidden">
        <div className="crt-grid opacity-40" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl mb-14 reveal">
            <h2 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tightest leading-[1.05]">
              {tTiers("title")}
            </h2>
            <p className="mt-4 text-lg text-ink-secondary">{tTiers("subtitle")}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              { tier: tTiers("simple"),  k: "L01", audience: tTiers("noBackground"), example: tTiers("simpleExample"), highlight: tTiers("simpleDesc"), accent: "emerald" },
              { tier: tTiers("medium"),  k: "L02", audience: tTiers("educated"),     example: tTiers("mediumExample"), highlight: tTiers("mediumDesc"), accent: "blue" },
              { tier: tTiers("expert"),  k: "L03", audience: tTiers("clinician"),    example: tTiers("expertExample"), highlight: tTiers("expertDesc"), accent: "violet" },
            ].map((tier, i) => {
              const aMap: Record<string, { text: string; dot: string; border: string }> = {
                emerald: { text: "text-emerald-500", dot: "bg-emerald-400", border: "hover:border-emerald-300/60" },
                blue:    { text: "text-brand-blue",  dot: "bg-brand-blue",  border: "hover:border-brand-blue/40" },
                violet:  { text: "text-violet-500",  dot: "bg-violet-400",  border: "hover:border-violet-300/60" },
              };
              const a = aMap[tier.accent];
              return (
                <HudBrackets key={tier.k} className={`reveal reveal-delay-${i + 1}`}>
                  <div className={`p-6 bg-white dark:bg-slate-900 border border-surface-border ${a.border} rounded-2xl transition-all duration-300 hover:shadow-lift group`}>
                    <div className="flex items-center justify-between mb-5">
                      <span className="kicker-mono text-ink-tertiary">{tier.k}</span>
                      <span className={`inline-flex items-center gap-1.5 kicker-mono ${a.text}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${a.dot}`} />
                        {tier.audience}
                      </span>
                    </div>
                    <h3 className="text-xl font-bold text-ink mb-3 tracking-tighter3">{tier.tier}</h3>
                    <p className="text-sm text-ink-secondary leading-relaxed mb-5 pl-3 border-l-2 border-surface-border italic">{tier.example}</p>
                    <div className="tracer-line mb-4 opacity-50 group-hover:opacity-100 transition-opacity" />
                    <p className="kicker-mono text-ink-tertiary">{tier.highlight}</p>
                  </div>
                </HudBrackets>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════ */}
      {/* PRODUCT SUITE                                            */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="py-6 bg-slate-50 dark:bg-slate-950">
        <TerminalRule id="03.00" label={tSuite("badge")} />
      </div>

      <section className="relative py-24 bg-slate-50 dark:bg-slate-950 overflow-hidden">
        <div className="crt-grid opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-end justify-between mb-12 gap-6 flex-wrap reveal">
            <div className="max-w-2xl">
              <h2 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tightest leading-[1.05]">
                {tSuite("title")}{" "}<span className="text-gradient-sci">{tSuite("titleHighlight")}</span>
              </h2>
              <p className="mt-4 text-lg text-ink-secondary">{tSuite("subtitle")}</p>
            </div>
            <div className="hidden md:flex items-center gap-3 kicker-mono text-ink-tertiary">
              <span>MODULES</span>
              <span className="display-num text-2xl text-brand-blue">09</span>
              <div className="w-px h-8 bg-surface-border" />
              <ActivityStrip count={20} />
            </div>
          </div>

          {/* Featured: Lab Analyzer */}
          <HudBrackets className="mb-6 reveal">
            <Link
              href="/app"
              className="group relative flex flex-col sm:flex-row items-start gap-8 p-8 rounded-2xl bg-white dark:bg-slate-900 border border-brand-blue/25 hover:border-brand-blue/50 hover:shadow-2xl hover:shadow-brand-blue/10 transition-all duration-500 overflow-hidden scan-sweep"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-brand-blue/4 via-transparent to-brand-indigo/4 pointer-events-none" />

              <div className="relative flex-shrink-0 w-20 h-20 rounded-2xl bg-gradient-to-br from-brand-blue to-brand-indigo flex items-center justify-center shadow-lg shadow-brand-blue/30 group-hover:scale-105 transition-transform">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-10 h-10 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 002.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 00-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 00.75-.75 2.25 2.25 0 00-.1-.664m-5.8 0A2.251 2.251 0 0113.5 2.25H15c1.012 0 1.867.668 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25z" />
                </svg>
                <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-live shadow-cyan-glow animate-pulse" />
              </div>

              <div className="flex-1 min-w-0 relative">
                <div className="flex items-center gap-2 mb-2 flex-wrap">
                  <span className="kicker-mono text-brand-blue">// MODULE_PRIMARY</span>
                  <span className="kicker-mono px-2 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue">{tSuite("mostUsed")}</span>
                </div>
                <h3 className="text-2xl font-extrabold text-ink mb-2 tracking-tighter3">{tSuite("labTitle")}</h3>
                <p className="text-ink-secondary leading-relaxed mb-4 max-w-xl">{tSuite("labDesc")}</p>
                <div className="flex flex-wrap gap-1.5 mb-5">
                  {tSuite("labTags").split(",").map((tag) => (
                    <span key={tag} className="kicker-mono px-2 py-1 bg-slate-100 dark:bg-slate-800 text-ink-secondary rounded-md border border-surface-border">{tag.trim()}</span>
                  ))}
                </div>
                <span className="inline-flex items-center gap-2 text-sm font-bold text-brand-blue group-hover:gap-3 transition-all">
                  <span className="kicker-mono">›</span>
                  {tSuite("labCta")}
                </span>
              </div>

              {/* Side decoration — sparkline */}
              <div className="hidden md:block relative w-32 h-20 flex-shrink-0">
                <Spark color="#4A85EF" w={128} h={64} />
                <div className="absolute bottom-0 left-0 right-0 flex items-center justify-between">
                  <span className="kicker-mono text-ink-tertiary">24H</span>
                  <span className="kicker-mono text-brand-blue">+12%</span>
                </div>
              </div>
            </Link>
          </HudBrackets>

          {/* Secondary tool grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { href: "/symptom",     label: tSuite("symptomLabel"),     title: tSuite("symptomTitle"),     desc: tSuite("symptomDesc"),     cta: tSuite("symptomCta"),     accent: "emerald", k: "S01" },
              { href: "/diagnosed",   label: tSuite("diagnosisLabel"),   title: tSuite("diagnosisTitle"),   desc: tSuite("diagnosisDesc"),   cta: tSuite("diagnosisCta"),   accent: "violet",  k: "D02" },
              { href: "/imaging",     label: tSuite("imagingLabel"),     title: tSuite("imagingTitle"),     desc: tSuite("imagingDesc"),     cta: tSuite("imagingCta"),     accent: "sky",     k: "I03" },
              { href: "/trends",      label: tSuite("trendLabel"),       title: tSuite("trendTitle"),       desc: tSuite("trendDesc"),       cta: tSuite("trendCta"),       accent: "amber",   k: "T04" },
              { href: "/medications", label: tSuite("medicationLabel"),  title: tSuite("medicationTitle"),  desc: tSuite("medicationDesc"),  cta: tSuite("medicationCta"),  accent: "teal",    k: "M05" },
              { href: "/visit",       label: tSuite("visitLabel"),       title: tSuite("visitTitle"),       desc: tSuite("visitDesc"),       cta: tSuite("visitCta"),       accent: "indigo",  k: "V06" },
              { href: "/genetics",    label: tSuite("geneticsLabel"),    title: tSuite("geneticsTitle"),    desc: tSuite("geneticsDesc"),    cta: tSuite("geneticsCta"),    accent: "fuchsia", k: "G07" },
              { href: "/pediatric",   label: tSuite("pediatricLabel"),   title: tSuite("pediatricTitle"),   desc: tSuite("pediatricDesc"),   cta: tSuite("pediatricCta"),   accent: "rose",    k: "P08" },
            ].map((tool) => {
              const map: Record<string, { text: string; dot: string; border: string; spark: string }> = {
                emerald: { text: "text-emerald-500", dot: "bg-emerald-400", border: "hover:border-emerald-300/70", spark: "#10B981" },
                violet:  { text: "text-violet-500",  dot: "bg-violet-400",  border: "hover:border-violet-300/70",  spark: "#8B5CF6" },
                sky:     { text: "text-sky-500",     dot: "bg-sky-400",     border: "hover:border-sky-300/70",     spark: "#0EA5E9" },
                amber:   { text: "text-amber-500",   dot: "bg-amber-400",   border: "hover:border-amber-300/70",   spark: "#F59E0B" },
                teal:    { text: "text-teal-500",    dot: "bg-teal-400",    border: "hover:border-teal-300/70",    spark: "#14B8A6" },
                indigo:  { text: "text-brand-indigo",dot: "bg-indigo-400",  border: "hover:border-indigo-300/70",  spark: "#6366F1" },
                fuchsia: { text: "text-fuchsia-500", dot: "bg-fuchsia-400", border: "hover:border-fuchsia-300/70", spark: "#D946EF" },
                rose:    { text: "text-rose-500",    dot: "bg-rose-400",    border: "hover:border-rose-300/70",    spark: "#F43F5E" },
              };
              const c = map[tool.accent];
              return (
                <Link
                  key={tool.href}
                  href={tool.href}
                  className={`group relative flex flex-col p-5 rounded-2xl bg-white dark:bg-slate-900 border border-surface-border ${c.border} hover:shadow-xl transition-all duration-300 overflow-hidden`}
                >
                  <div className="flex items-center justify-between mb-4">
                    <span className="kicker-mono text-ink-tertiary">{tool.k}</span>
                    <span className={`flex items-center gap-1 kicker-mono ${c.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${c.dot} group-hover:shadow-cyan-glow`} />
                      {tool.label}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-ink mb-1.5 tracking-tighter3 glitch-on-hover">{tool.title}</h3>
                  <p className="text-sm text-ink-secondary leading-relaxed flex-1 mb-4 line-clamp-3">{tool.desc}</p>
                  <div className="flex items-end justify-between gap-3">
                    <span className={`inline-flex items-center gap-1.5 text-sm font-bold ${c.text} group-hover:gap-2.5 transition-all`}>
                      <span className="kicker-mono">›</span>
                      {tool.cta}
                    </span>
                    <div className="w-16 h-6 opacity-50 group-hover:opacity-100 transition-opacity">
                      <Spark color={c.spark} w={64} h={24} />
                    </div>
                  </div>
                  <div className="tracer-line absolute bottom-0 left-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════ */}
      {/* TRUST / STATS                                            */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="py-6 bg-white dark:bg-slate-900">
        <TerminalRule id="04.00" label="// telemetry feed" />
      </div>

      <section className="relative py-20 bg-white dark:bg-slate-900 border-y border-surface-border overflow-hidden">
        <div className="crt-grid opacity-20" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Big stat readouts */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-surface-border rounded-2xl overflow-hidden border border-surface-border mb-14 reveal">
            {[
              { v: tStats("reportsCount"), l: tStats("reportsLabel"), c: "text-brand-blue",   spark: "#4A85EF" },
              { v: tStats("speedCount"),   l: tStats("speedLabel"),   c: "text-emerald-500",  spark: "#10B981" },
              { v: tStats("tiersCount"),   l: tStats("tiersLabel"),   c: "text-violet-500",   spark: "#8B5CF6" },
              { v: tStats("toolsCount"),   l: tStats("toolsLabel"),   c: "text-amber-500",    spark: "#F59E0B" },
            ].map((s) => (
              <div key={s.l} className="relative bg-white dark:bg-slate-900 px-5 py-8 flex flex-col gap-2">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full live-dot" />
                  <span className="kicker-mono text-ink-tertiary">LIVE</span>
                </div>
                <div className={`display-num text-4xl sm:text-5xl ${s.c} num-flicker`}>{s.v}</div>
                <p className="text-xs text-ink-tertiary">{s.l}</p>
                <div className="absolute right-3 top-3 w-16 h-8 opacity-60">
                  <Spark color={s.spark} w={64} h={32} />
                </div>
              </div>
            ))}
          </div>

          {/* Marquee strip — trust signals */}
          <div className="mb-14 reveal reveal-delay-1 relative overflow-hidden border-y border-surface-border">
            <div className="flex w-[200%] marquee-track">
              {Array.from({ length: 2 }).map((_, dup) => (
                <div key={dup} className="flex items-center gap-10 px-4 py-5 w-1/2 shrink-0">
                  {[tStats("encrypted"), tStats("resultsInSeconds"), tStats("advancedAI"), tStats("freeToTry"), tStats("encrypted"), tStats("resultsInSeconds"), tStats("advancedAI"), tStats("freeToTry")].map((t, i) => (
                    <span key={i} className="kicker-mono text-ink-tertiary inline-flex items-center gap-3 whitespace-nowrap">
                      <span className="w-1.5 h-1.5 rounded-full bg-brand-blue" />
                      {t}
                      <span className="text-surface-border">/</span>
                    </span>
                  ))}
                </div>
              ))}
            </div>
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 reveal reveal-delay-2">
            {[
              { q: tTestimonials("quote1"), a: tTestimonials("author1"), accent: "from-brand-blue to-brand-indigo", letter: "S", id: "USR_001" },
              { q: tTestimonials("quote2"), a: tTestimonials("author2"), accent: "from-violet-500 to-purple-600",   letter: "M", id: "USR_002" },
            ].map((t) => (
              <HudBrackets key={t.id}>
                <div className="p-6 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-surface-border hover:border-brand-blue/30 transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <span className="kicker-mono text-ink-tertiary">{t.id}</span>
                    <span className="kicker-mono text-emerald-500 flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                      VERIFIED
                    </span>
                  </div>
                  <p className="text-sm text-ink-secondary leading-relaxed mb-5">&ldquo;{t.q}&rdquo;</p>
                  <div className="flex items-center gap-2 pt-4 border-t border-surface-border">
                    <div className={`w-7 h-7 rounded-full bg-gradient-to-br ${t.accent} flex items-center justify-center`}>
                      <span className="text-[10px] font-bold text-white">{t.letter}</span>
                    </div>
                    <span className="text-xs text-ink-tertiary">{t.a}</span>
                  </div>
                </div>
              </HudBrackets>
            ))}
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════ */}
      {/* FEATURES + LIVE DEMO                                     */}
      {/* ════════════════════════════════════════════════════════ */}
      <div className="py-6 bg-white dark:bg-slate-900">
        <TerminalRule id="05.00" label={tFeatures("badge")} />
      </div>

      <section id="features" className="relative py-24 bg-white dark:bg-slate-900 overflow-hidden">
        <div className="crt-grid opacity-30" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-14 items-start">
            {/* Left — feature list */}
            <div className="reveal">
              <h2 className="text-4xl font-extrabold text-ink tracking-tightest leading-tight">{tFeatures("title")}</h2>
              <p className="mt-4 text-lg text-ink-secondary leading-relaxed">{tFeatures("subtitle")}</p>
              <div className="mt-10 space-y-4">
                {[
                  { k: "F01", t: tFeatures("flaggedTitle"),    d: tFeatures("flaggedDesc"),    c: "red" },
                  { k: "F02", t: tFeatures("etiologyTitle"),   d: tFeatures("etiologyDesc"),   c: "blue" },
                  { k: "F03", t: tFeatures("specialistTitle"), d: tFeatures("specialistDesc"), c: "violet" },
                  { k: "F04", t: tFeatures("privacyTitle"),    d: tFeatures("privacyDesc"),    c: "emerald" },
                  { k: "F05", t: tFeatures("speedTitle"),      d: tFeatures("speedDesc"),      c: "amber" },
                ].map((feat, i) => {
                  const cMap: Record<string, string> = {
                    red:     "text-red-500",
                    blue:    "text-brand-blue",
                    violet:  "text-violet-500",
                    emerald: "text-emerald-500",
                    amber:   "text-amber-500",
                  };
                  return (
                    <div key={feat.k} className={`reveal reveal-delay-${Math.min(i + 1, 5)} group flex items-start gap-4 p-4 rounded-xl border border-transparent hover:border-surface-border hover:bg-surface-raised transition`}>
                      <div className="flex flex-col items-center gap-1 flex-shrink-0 pt-0.5">
                        <span className={`kicker-mono ${cMap[feat.c]}`}>{feat.k}</span>
                        <span className={`w-1.5 h-1.5 rounded-full ${cMap[feat.c]} bg-current opacity-70 group-hover:opacity-100`} />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-bold text-ink tracking-tighter3">{feat.t}</h4>
                        <p className="text-sm text-ink-secondary mt-1 leading-relaxed">{feat.d}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right — interactive tier demo (dark sci-panel) */}
            <div className="relative reveal reveal-delay-2">
              <HudBrackets>
                <div className="sci-panel scan-sweep">
                  <div className="px-5 py-3 border-b panel-border flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-brand-blue to-brand-indigo flex items-center justify-center">
                        <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-white">
                          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <div>
                        <p className="text-sm font-semibold panel-text-bright">Basic Metabolic Panel</p>
                        <p className="kicker-mono panel-text-dim">scan_id://0x4A85EF · 09:42 UTC</p>
                      </div>
                    </div>
                    <span className="kicker-mono text-cyan-live inline-flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-cyan-live shadow-cyan-glow animate-pulse" />
                      ANALYZED
                    </span>
                  </div>

                  {/* Tier tabs */}
                  <div className="px-5 pt-4 flex gap-1">
                    {(["Simple", "Medium", "Expert"] as DemoTier[]).map((t) => (
                      <button
                        key={t}
                        onClick={() => setDemoTier(t)}
                        className={`px-4 py-2 rounded-t-lg text-xs font-semibold transition-colors duration-200 kicker-mono ${
                          t === demoTier
                            ? "bg-brand-blue/15 text-cyan-live border-b-2 border-cyan-live"
                            : "panel-text-dim hover:text-white"
                        }`}
                      >
                        {t === "Simple" ? `L01·${tTiers("simple")}` : t === "Medium" ? `L02·${tTiers("medium")}` : `L03·${tTiers("expert")}`}
                      </button>
                    ))}
                  </div>

                  <div className="p-5 space-y-3">
                    <p className="text-sm panel-text leading-relaxed">{DEMO_TIERS[demoTier].summary}</p>

                    <div className="panel-row-warn rounded-lg px-3 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="kicker-mono text-amber-400">FLAG</span>
                        <span className="text-sm panel-text-bright font-semibold">Glucose</span>
                      </div>
                      <div className="text-right">
                        <span className="display-num text-amber-400 text-sm">112</span>
                        <span className="kicker-mono panel-text-dim ml-1">mg/dL</span>
                        <p className="kicker-mono panel-text-dim">ref 70–99</p>
                      </div>
                    </div>
                    <div className="panel-row-ok rounded-lg px-3 py-2.5 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="kicker-mono text-emerald-400">OK&nbsp;&nbsp;</span>
                        <span className="text-sm panel-text-bright font-semibold">Creatinine</span>
                      </div>
                      <div className="text-right">
                        <span className="display-num text-emerald-400 text-sm">0.9</span>
                        <span className="kicker-mono panel-text-dim ml-1">mg/dL</span>
                        <p className="kicker-mono panel-text-dim">ref 0.7–1.2</p>
                      </div>
                    </div>

                    <div className="rounded-lg px-3 py-3 border border-cyan-live/30 bg-cyan-live/5">
                      <p className="kicker-mono text-cyan-live mb-1.5">// {DEMO_TIERS[demoTier].specialist.label}</p>
                      <p className="text-xs panel-text leading-relaxed">{DEMO_TIERS[demoTier].specialist.body}</p>
                    </div>
                  </div>

                  <div className="px-5 py-2.5 border-t panel-border flex items-center justify-between">
                    <span className="kicker-mono panel-text-dim">conf <span className="text-emerald-400">97%</span></span>
                    <div className="tracer-line w-24" />
                    <span className="kicker-mono panel-text-dim">elapsed <span className="text-cyan-live">2.31s</span></span>
                  </div>
                </div>
              </HudBrackets>

              {/* Floating live ticker beside panel */}
              <div className="absolute -top-4 -right-4 hidden md:flex items-center gap-2 px-3 py-1.5 rounded-full bg-white dark:bg-slate-900 border border-surface-border shadow-lift">
                <span className="kicker-mono text-ink-tertiary">REPORTS·24h</span>
                <LiveTick base={1247} jitter={3} className="text-brand-blue text-sm" />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════ */}
      {/* DISCLAIMER BAND                                          */}
      {/* ════════════════════════════════════════════════════════ */}
      <section className="py-4 bg-amber-50 dark:bg-amber-900/20 border-y border-amber-200/50 dark:border-amber-800/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-3">
          <span className="kicker-mono text-amber-700 dark:text-amber-400">// NOTICE</span>
          <p className="text-sm text-amber-800 dark:text-amber-300">{tDisclaimer("short")}</p>
        </div>
      </section>

      {/* ════════════════════════════════════════════════════════ */}
      {/* FINAL CTA — dark holographic                             */}
      {/* ════════════════════════════════════════════════════════ */}
      <section className="relative py-20 px-4 bg-white dark:bg-slate-950 overflow-hidden">
        <div className="max-w-6xl mx-auto reveal">
          <HudBrackets>
            <div
              className="relative overflow-hidden rounded-3xl px-8 sm:px-12 py-20 text-center"
              style={{
                background:
                  "radial-gradient(60% 80% at 50% 0%, rgba(99,102,241,0.45) 0, transparent 70%), radial-gradient(60% 80% at 50% 100%, rgba(34,211,238,0.25) 0, transparent 70%), linear-gradient(180deg, #0a0e26, #050818)",
                border: "1px solid rgba(99,102,241,0.3)",
              }}
            >
              {/* Internal grid */}
              <div
                className="absolute inset-0 opacity-40 pointer-events-none"
                style={{
                  backgroundImage:
                    "linear-gradient(to right, rgba(74,133,239,0.08) 1px, transparent 1px), linear-gradient(to bottom, rgba(74,133,239,0.08) 1px, transparent 1px)",
                  backgroundSize: "40px 40px",
                  WebkitMaskImage: "radial-gradient(70% 70% at 50% 50%, #000, transparent 80%)",
                  maskImage: "radial-gradient(70% 70% at 50% 50%, #000, transparent 80%)",
                }}
              />
              <div className="noise-overlay" />

              {/* Status row */}
              <div className="relative z-10 flex items-center justify-center gap-3 mb-8">
                <span className="w-2 h-2 rounded-full live-dot" />
                <span className="kicker-mono" style={{ color: "rgba(34,211,238,0.85)" }}>READY · awaiting input</span>
              </div>

              <div className="relative z-10">
                <h2 className="text-4xl sm:text-6xl font-extrabold text-white tracking-tightest mb-5 leading-[1.02]">
                  {tCTA("title")}
                </h2>
                <p className="text-lg mb-10 max-w-xl mx-auto" style={{ color: "rgba(200,205,255,0.7)" }}>
                  {tCTA("subtitle")}
                </p>

                <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
                  <Link
                    href="/app"
                    className="group inline-flex items-center gap-3 px-8 py-4 rounded-2xl text-base font-bold transition-all duration-300 hover:-translate-y-0.5"
                    style={{
                      background: "linear-gradient(180deg, #fff, #d8e0ff)",
                      color: "#0a0e26",
                      boxShadow: "0 10px 40px -10px rgba(74,133,239,0.5), inset 0 1px 0 rgba(255,255,255,0.8)",
                    }}
                  >
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                      <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                    {tCTA("button")}
                    <span className="kicker-mono opacity-50 group-hover:opacity-100 transition">›</span>
                  </Link>
                  <a
                    href="#how-it-works"
                    className="inline-flex items-center gap-2 px-7 py-4 rounded-2xl text-sm font-semibold transition"
                    style={{
                      background: "rgba(255,255,255,0.04)",
                      color: "rgba(200,205,255,0.85)",
                      border: "1px solid rgba(255,255,255,0.16)",
                    }}
                  >
                    <span className="kicker-mono">›_</span>
                    {tCTA("seeHow")}
                  </a>
                </div>

                {/* Bottom tracer + readout */}
                <div className="mt-12 flex items-center gap-4 justify-center kicker-mono" style={{ color: "rgba(180,190,235,0.55)" }}>
                  <span>SECURE_CHANNEL</span>
                  <div className="w-20 tracer-line" />
                  <span>TLS·1.3</span>
                  <div className="w-20 tracer-line" />
                  <span>HIPAA_READY</span>
                </div>
              </div>
            </div>
          </HudBrackets>
        </div>
      </section>
    </div>
  );
}
