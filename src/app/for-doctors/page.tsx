"use client";

import { useState } from "react";
import Link from "next/link";
import WordReveal from "@/components/WordReveal";
import type { Metadata } from "next";
import { useTranslations } from "next-intl";

const PRACTICE_TYPES = [
  "General Practice / Family Medicine",
  "Internal Medicine",
  "Cardiology",
  "Endocrinology",
  "Nephrology",
  "Oncology",
  "Gastroenterology",
  "Hematology",
  "Pediatrics",
  "Obstetrics & Gynecology",
  "Other Specialty",
  "Hospital / Health System",
  "Independent Lab",
];

const COUNTRIES = [
  "United States", "United Kingdom", "Canada", "Australia", "Germany",
  "France", "Netherlands", "Turkey", "India", "Brazil", "Other",
];

function CheckIcon() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
      <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
    </svg>
  );
}

function ArrowRight() {
  return (
    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
      <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
    </svg>
  );
}

export default function ForDoctorsPage() {
  const t = useTranslations("ForDoctors");
  const [form, setForm] = useState({
    name: "",
    email: "",
    practice_type: "",
    country: "",
  });
  const [status, setStatus] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [errorMsg, setErrorMsg] = useState("");

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.practice_type || !form.country) return;
    setStatus("loading");
    setErrorMsg("");
    try {
      const res = await fetch("/api/doctor-waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data.success) throw new Error(data.error || "Submission failed.");
      setStatus("success");
    } catch (err: unknown) {
      setStatus("error");
      setErrorMsg(err instanceof Error ? err.message : "Something went wrong. Please try again.");
    }
  };

  const steps = [
    {
      number: "01",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
        </svg>
      ),
      title: t("step1Title"),
      desc: t("step1Desc"),
    },
    {
      number: "02",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.129.166 2.27.293 3.423.379.35.026.67.21.865.501L12 21l2.755-4.133a1.14 1.14 0 01.865-.501 48.172 48.172 0 003.423-.379c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0012 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018z" />
        </svg>
      ),
      title: t("step2Title"),
      desc: t("step2Desc"),
    },
    {
      number: "03",
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      ),
      title: t("step3Title"),
      desc: t("step3Desc"),
    },
  ];

  const benefits = [
    t("benefit1"),
    t("benefit2"),
    t("benefit3"),
    t("benefit4"),
    t("benefit5"),
    t("benefit6"),
  ];

  return (
    <div className="min-h-screen">

      {/* ─── HERO ──────────────────────────────────────────────────── */}
      <section className="relative pt-36 pb-24 overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-800">
        {/* Background glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[900px] h-[500px] bg-brand-blue/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute top-20 right-1/4 w-64 h-64 bg-violet-500/8 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <div className="text-center max-w-4xl mx-auto">
            <span className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-brand-blue/15 border border-brand-blue/30 backdrop-blur text-brand-blue mb-8">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-brand-blue opacity-60" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-brand-blue" />
              </span>
              <span className="kicker-mono">{t("badge")}</span>
            </span>

            <h1 className="font-display text-5xl sm:text-6xl lg:text-7xl font-bold text-white tracking-tightest leading-[1.03] mb-6">
              <WordReveal text={t("heroTitle")} base={0.05} />
            </h1>

            <p className="text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed mb-10">
              {t("heroSubtitle")}
            </p>

            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <a
                href="#waitlist"
                className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold rounded-xl text-base transition-all duration-200 shadow-lg shadow-brand-blue/25 hover:shadow-xl hover:shadow-brand-blue/30"
              >
                {t("joinWaitlist")}
                <ArrowRight />
              </a>
              <a
                href="#how-it-works"
                className="inline-flex items-center gap-2 px-7 py-3.5 border border-slate-600 hover:border-slate-400 text-slate-300 hover:text-white font-semibold rounded-xl text-base transition-all duration-200"
              >
                {t("seeHow")}
              </a>
            </div>
          </div>

          {/* Stats row */}
          <div className="mt-20 grid grid-cols-1 sm:grid-cols-3 gap-px bg-slate-700/50 rounded-2xl overflow-hidden border border-slate-700/50">
            {[
              { stat: t("stat1Value"), label: t("stat1Label") },
              { stat: t("stat2Value"), label: t("stat2Label") },
              { stat: t("stat3Value"), label: t("stat3Label") },
            ].map(({ stat, label }) => (
              <div key={stat} className="bg-slate-900/80 px-8 py-7 text-center">
                <p data-countup className="font-display text-3xl font-bold text-white mb-1 tracking-tightest">{stat}</p>
                <p className="text-sm text-slate-400 leading-snug">{label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW IT WORKS ──────────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-surface">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-semibold mb-4">
              {t("howTitle")}
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight mb-4">
              {t("howSubtitle")}
            </h2>
            <p className="text-lg text-ink-secondary max-w-xl mx-auto">
              {t("howBody")}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {steps.map((step) => (
              <div
                key={step.number}
                className="relative bg-surface-raised border border-surface-border rounded-2xl p-8 hover:shadow-lg hover:shadow-ink/5 transition-all duration-300"
              >
                <div className="flex items-center gap-4 mb-6">
                  <span className="text-5xl font-black text-brand-blue/15 leading-none select-none">
                    {step.number}
                  </span>
                  <div className="w-12 h-12 flex items-center justify-center rounded-xl bg-brand-blue/10 text-brand-blue flex-shrink-0">
                    {step.icon}
                  </div>
                </div>
                <h3 className="text-xl font-bold text-ink mb-3">{step.title}</h3>
                <p className="text-ink-secondary leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          {/* Connector line for desktop */}
          <div className="hidden lg:flex items-center justify-center mt-4 -mt-[calc(50%-1rem)] pointer-events-none absolute left-0 right-0" />
        </div>
      </section>

      {/* ─── BENEFITS ──────────────────────────────────────────────── */}
      <section className="py-20 bg-gradient-to-b from-slate-50 to-white dark:from-slate-900/50 dark:to-slate-900">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div>
              <span className="inline-block px-4 py-1.5 rounded-full bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400 text-sm font-semibold mb-5">
                {t("benefitsTitle")}
              </span>
              <h2 className="text-4xl font-extrabold text-ink tracking-tight mb-6">
                {t("benefitsSubtitle")}
              </h2>
              <p className="text-lg text-ink-secondary leading-relaxed mb-8">
                {t("benefitsBody")}
              </p>
              <ul className="space-y-3">
                {benefits.map((b) => (
                  <li key={b} className="flex items-start gap-3">
                    <span className="mt-0.5 flex-shrink-0 w-5 h-5 rounded-full bg-emerald-100 dark:bg-emerald-900/40 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                      <CheckIcon />
                    </span>
                    <span className="text-ink-secondary">{b}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Visual card mockup */}
            <div className="relative">
              <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl shadow-ink/10 border border-surface-border p-6 space-y-4">
                <div className="flex items-center gap-3 pb-4 border-b border-surface-border">
                  <div className="w-8 h-8 rounded-full bg-brand-blue/10 flex items-center justify-center">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-blue">
                      <path d="M10 9a3 3 0 100-6 3 3 0 000 6zM6 8a2 2 0 11-4 0 2 2 0 014 0zM1.49 15.326a.78.78 0 01-.358-.442 3 3 0 014.308-3.516 6.484 6.484 0 00-1.905 3.959c-.023.222-.014.442.025.654a4.97 4.97 0 01-2.07-.655zM16.44 15.98a4.97 4.97 0 002.07-.654.78.78 0 00.357-.442 3 3 0 00-4.308-3.517 6.484 6.484 0 011.907 3.96 2.32 2.32 0 01-.026.654zM18 8a2 2 0 11-4 0 2 2 0 014 0zM5.304 16.19a.844.844 0 01-.277-.71 5 5 0 019.947 0 .843.843 0 01-.277.71A6.975 6.975 0 0110 18a6.974 6.974 0 01-4.696-1.81z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">Patient: Sarah M., 47F</p>
                    <p className="text-xs text-ink-tertiary">Annual CBC + CMP — Apr 10, 2026</p>
                  </div>
                  <span className="ml-auto inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                    2 values to discuss
                  </span>
                </div>
                {[
                  { label: "Hemoglobin A1c", value: "6.3%", ref: "< 5.7%", status: "high" },
                  { label: "LDL Cholesterol", value: "142 mg/dL", ref: "< 100 mg/dL", status: "high" },
                  { label: "eGFR", value: "88 mL/min", ref: "> 60 mL/min", status: "normal" },
                  { label: "TSH", value: "2.1 mIU/L", ref: "0.4–4.0 mIU/L", status: "normal" },
                ].map((row) => (
                  <div key={row.label} className="flex items-center justify-between py-1.5">
                    <div>
                      <p className="text-sm font-medium text-ink">{row.label}</p>
                      <p className="text-xs text-ink-tertiary">ref: {row.ref}</p>
                    </div>
                    <span className={`text-sm font-bold ${row.status === "high" ? "text-red-500" : "text-emerald-600"}`}>
                      {row.status === "high" ? "↑ " : ""}{row.value}
                    </span>
                  </div>
                ))}
                <div className="pt-3 border-t border-surface-border">
                  <p className="text-xs text-ink-tertiary mb-2">Patient explanation sent via</p>
                  <div className="flex items-center gap-2">
                    <span className="px-3 py-1.5 rounded-lg bg-brand-blue/10 text-brand-blue text-xs font-semibold">✉ Email</span>
                    <span className="px-3 py-1.5 rounded-lg bg-slate-100 dark:bg-slate-700 text-ink-secondary text-xs font-semibold">SMS</span>
                    <span className="ml-auto text-xs text-emerald-600 font-semibold flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Delivered
                    </span>
                  </div>
                </div>
              </div>
              {/* Floating badge */}
              <div className="absolute -bottom-4 -right-4 bg-white dark:bg-slate-800 border border-surface-border rounded-xl px-4 py-3 shadow-xl shadow-ink/10">
                <p className="text-xs text-ink-tertiary mb-0.5">Patient opened</p>
                <p className="text-sm font-bold text-ink">2 hrs before appointment</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── PRICING ───────────────────────────────────────────────── */}
      <section className="py-24 bg-surface">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-blue/10 text-brand-blue text-sm font-semibold mb-4">
              {t("pricingTitle")}
            </span>
            <h2 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight mb-4">
              {t("pricingSubtitle")}
            </h2>
            <p className="text-lg text-ink-secondary max-w-xl mx-auto">
              {t("pricingBody")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-3xl mx-auto">
            {/* Starter */}
            <div className="bg-surface-raised border border-surface-border rounded-2xl p-8">
              <p className="text-sm font-semibold text-ink-tertiary uppercase tracking-widest mb-3">{t("starterTitle")}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-extrabold text-ink">{t("starterPrice")}</span>
              </div>
              <p className="text-sm text-ink-tertiary mb-6">{t("starterLimit")}</p>
              <ul className="space-y-3 mb-8">
                {[
                  t("starterF1"),
                  t("starterF2"),
                  t("starterF3"),
                  t("starterF4"),
                  t("starterF5"),
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-brand-blue flex-shrink-0"><CheckIcon /></span>
                    <span className="text-sm text-ink-secondary">{f}</span>
                  </li>
                ))}
              </ul>
              <a href="#waitlist" className="block w-full text-center py-2.5 rounded-xl border border-brand-blue text-brand-blue font-semibold text-sm hover:bg-brand-blue hover:text-white transition-colors">
                {t("starterCta")}
              </a>
            </div>

            {/* Practice */}
            <div className="relative bg-brand-blue rounded-2xl p-8 text-white shadow-xl shadow-brand-blue/25">
              <span className="absolute top-4 right-4 px-2.5 py-1 bg-white/15 rounded-full text-xs font-semibold">Most popular</span>
              <p className="text-sm font-semibold text-blue-200 uppercase tracking-widest mb-3">{t("practiceTitle")}</p>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-4xl font-extrabold">{t("practicePrice")}</span>
              </div>
              <p className="text-sm text-blue-200 mb-6">{t("practiceLimit")}</p>
              <ul className="space-y-3 mb-8">
                {[
                  t("practiceF1"),
                  t("practiceF2"),
                  t("practiceF3"),
                  t("practiceF4"),
                  t("practiceF5"),
                ].map((f) => (
                  <li key={f} className="flex items-start gap-2.5">
                    <span className="mt-0.5 text-blue-200 flex-shrink-0"><CheckIcon /></span>
                    <span className="text-sm text-blue-100">{f}</span>
                  </li>
                ))}
              </ul>
              <a href="#waitlist" className="block w-full text-center py-2.5 rounded-xl bg-white text-brand-blue font-semibold text-sm hover:bg-blue-50 transition-colors">
                {t("practiceCta")}
              </a>
            </div>
          </div>

          <p className="text-center text-sm text-ink-tertiary mt-8">
            {t("trialNote")}
          </p>
        </div>
      </section>

      {/* ─── WAITLIST FORM ─────────────────────────────────────────── */}
      <section id="waitlist" className="py-24 bg-gradient-to-b from-slate-950 to-slate-900">
        <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <span className="inline-block px-4 py-1.5 rounded-full bg-brand-blue/20 border border-brand-blue/30 text-brand-blue text-sm font-semibold mb-4">
              {t("earlyAccessBadge")}
            </span>
            <h2 className="text-4xl font-extrabold text-white tracking-tight mb-4">
              {t("earlyAccessTitle")}
            </h2>
            <p className="text-slate-400 text-lg">
              {t("earlyAccessBody")}
            </p>
          </div>

          {status === "success" ? (
            <div className="bg-emerald-900/30 border border-emerald-700/40 rounded-2xl px-8 py-12 text-center">
              <div className="w-16 h-16 rounded-full bg-emerald-900/50 flex items-center justify-center mx-auto mb-5">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-8 h-8 text-emerald-400">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">{t("successTitle")}</h3>
              <p className="text-slate-400">
                {t("successBody")}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="bg-slate-800/60 border border-slate-700/50 rounded-2xl p-8 space-y-5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    {t("formName")} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={form.name}
                    onChange={handleChange}
                    required
                    placeholder={t("formNamePlaceholder")}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-colors"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1.5">
                    {t("formEmail")} <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={form.email}
                    onChange={handleChange}
                    required
                    placeholder={t("formEmailPlaceholder")}
                    className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-600 text-white placeholder-slate-500 text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {t("formPracticeType")} <span className="text-red-400">*</span>
                </label>
                <select
                  name="practice_type"
                  value={form.practice_type}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-colors appearance-none"
                >
                  <option value="" disabled>{t("formPracticeTypePlaceholder")}</option>
                  {PRACTICE_TYPES.map((t) => (
                    <option key={t} value={t}>{t}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1.5">
                  {t("formCountry")} <span className="text-red-400">*</span>
                </label>
                <select
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                  required
                  className="w-full px-4 py-3 rounded-xl bg-slate-900/80 border border-slate-600 text-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-blue/50 focus:border-brand-blue transition-colors appearance-none"
                >
                  <option value="" disabled>{t("formCountryPlaceholder")}</option>
                  {COUNTRIES.map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>

              {status === "error" && (
                <p className="text-red-400 text-sm bg-red-900/20 border border-red-800/40 rounded-lg px-4 py-3">
                  {errorMsg}
                </p>
              )}

              <button
                type="submit"
                disabled={status === "loading"}
                className="w-full py-3.5 bg-brand-blue hover:bg-brand-blue-hover disabled:opacity-60 disabled:cursor-not-allowed text-white font-semibold rounded-xl text-sm transition-all duration-200 flex items-center justify-center gap-2 shadow-lg shadow-brand-blue/25"
              >
                {status === "loading" ? (
                  <>
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Submitting…
                  </>
                ) : (
                  <>
                    {t("formSubmit")}
                    <ArrowRight />
                  </>
                )}
              </button>

              <p className="text-center text-xs text-slate-500">
                {t("formNoSpam")}
              </p>
            </form>
          )}
        </div>
      </section>

    </div>
  );
}
