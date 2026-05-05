import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "About — Meridix Labs",
  description:
    "We believe everyone deserves to understand their own health data. Learn about the mission behind Meridix Labs.",
};

export default function AboutPage() {
  return (
    <div className="min-h-screen">
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="gradient-hero pt-36 pb-20 relative overflow-hidden">
        <div className="absolute top-1/4 right-1/4 w-80 h-80 bg-brand-blue/8 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
          <span className="inline-block px-4 py-2 rounded-full bg-white border border-brand-blue/30 text-brand-blue text-sm font-semibold mb-6 shadow-sm">
            Our mission
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold text-ink tracking-tight leading-tight mb-6">
            Everyone deserves to
            <br />
            <span className="text-gradient-blue">understand their health.</span>
          </h1>
          <p className="text-xl text-ink-secondary max-w-2xl mx-auto leading-relaxed">
            We built Meridix Labs because we were tired of leaving the doctor's
            office with a printout full of numbers and no idea what any of it
            meant.
          </p>
        </div>
      </section>

      {/* ─── MISSION ─────────────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-ink tracking-tight mb-5">
                The gap we're closing
              </h2>
              <div className="space-y-4 text-ink-secondary leading-relaxed">
                <p>
                  Every year, billions of lab tests are ordered around the world.
                  Patients receive their results — often through a portal, sometimes
                  in the mail — and are expected to make sense of values they've
                  never seen before, with reference ranges that seem designed to
                  confuse.
                </p>
                <p>
                  The brilliant doctor who ordered those tests is busy. The
                  follow-up appointment is weeks away. And the patient is left with
                  anxiety, questions, and no answers.
                </p>
                <p>
                  That's the gap Meridix Labs exists to close. Not to replace your
                  physician — but to be the brilliant, patient friend who can sit
                  down with you and explain what those numbers actually mean.
                </p>
              </div>
            </div>
            <div className="space-y-4">
              {[
                {
                  stat: "1 in 3",
                  label:
                    "patients don't understand their lab results when they leave",
                },
                {
                  stat: "67%",
                  label:
                    "of people feel anxious when they receive abnormal results without context",
                },
                {
                  stat: "< 8 min",
                  label:
                    "is the average time a physician spends discussing lab findings per visit",
                },
              ].map((item) => (
                <div
                  key={item.stat}
                  className="p-5 rounded-2xl bg-surface-raised border border-surface-border"
                >
                  <div className="text-3xl font-extrabold text-brand-blue mb-1">
                    {item.stat}
                  </div>
                  <p className="text-sm text-ink-secondary">{item.label}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── VALUES ───────────────────────────────────────────── */}
      <section className="py-24 bg-surface-raised">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-14">
            <h2 className="text-4xl font-extrabold text-ink tracking-tight">
              What we believe
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"/>
                    <path d="M9 9a3 3 0 015.12-2.12M12 17v-5m0 0h.01"/>
                    <circle cx="12" cy="12" r="1" fill="currentColor" stroke="none"/>
                  </svg>
                ),
                color: "text-brand-blue bg-brand-blue/8",
                title: "Clarity over complexity",
                desc: "Medical information should be accessible to anyone who wants it — not locked behind jargon.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
                    <circle cx="9" cy="7" r="4"/>
                    <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75"/>
                  </svg>
                ),
                color: "text-violet-600 bg-violet-50",
                title: "You are the expert on you",
                desc: "We give you information so you can have a better, more informed conversation with your doctor.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                    <path d="M7 11V7a5 5 0 0110 0v4"/>
                  </svg>
                ),
                color: "text-emerald-600 bg-emerald-50",
                title: "Privacy is non-negotiable",
                desc: "Your file is never stored. Your interpretation is encrypted, tied to your account, and deletable anytime — we never share or sell your health data.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                    <path d="M9 12l2 2 4-4"/>
                  </svg>
                ),
                color: "text-amber-600 bg-amber-50",
                title: "Honest, never alarmist",
                desc: "We explain — we don't diagnose. We are warm and accurate, not sensational or scary.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <circle cx="12" cy="12" r="10"/>
                    <path d="M2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/>
                  </svg>
                ),
                color: "text-sky-600 bg-sky-50",
                title: "Health literacy for everyone",
                desc: "Whether you're a worried parent or a medical student, everyone deserves the right level of detail.",
              },
              {
                icon: (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-5 h-5">
                    <path d="M22 12h-4l-3 9L9 3l-3 9H2"/>
                  </svg>
                ),
                color: "text-rose-600 bg-rose-50",
                title: "Doctors remain essential",
                desc: "We exist to prepare you for your doctor visit, not to replace it. Always.",
              },
            ].map((v) => (
              <div
                key={v.title}
                className="p-6 rounded-2xl bg-white border border-surface-border card-hover"
              >
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${v.color}`}>
                  {v.icon}
                </div>
                <h3 className="font-bold text-ink mb-2">{v.title}</h3>
                <p className="text-sm text-ink-secondary leading-relaxed">
                  {v.desc}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── HOW WE BUILT IT ──────────────────────────────────── */}
      <section className="py-24 bg-white">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
            <div>
              <h2 className="text-3xl font-extrabold text-ink tracking-tight mb-5">
                Built on world-class AI
              </h2>
              <div className="space-y-4 text-ink-secondary leading-relaxed text-sm">
                <p>
                  Meridix Labs is powered by Claude, Anthropic's frontier AI model,
                  which has been trained on vast medical literature and clinical
                  guidelines. We've carefully designed our prompting to ensure
                  interpretations are accurate, calibrated, and never alarmist.
                </p>
                <p>
                  Our three-tier system (Simple, Medium, Expert) was designed with
                  input from physicians, nurses, and patients to ensure each level
                  is genuinely useful — not just dumbed down or jargon-filled.
                </p>
                <p>
                  Every response includes a practical "What should you do?" section,
                  because knowledge without guidance is incomplete.
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {[
                {
                  label: "AI Model",
                  value: "Claude by Anthropic",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M12 2a2 2 0 012 2c0 .74-.4 1.39-1 1.73V7h1a7 7 0 017 7h1a1 1 0 010 2h-1v1a2 2 0 01-2 2H5a2 2 0 01-2-2v-1H2a1 1 0 010-2h1a7 7 0 017-7h1V5.73A2 2 0 0110 4a2 2 0 012-2z"/>
                      <path d="M9 14h.01M15 14h.01M9.5 17.5c.83.67 2.17.67 3 0"/>
                    </svg>
                  ),
                  color: "text-brand-blue bg-brand-blue/10",
                },
                {
                  label: "Interpretation depth",
                  value: "3 tiers — Simple to Expert",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M18 20V10M12 20V4M6 20v-6"/>
                    </svg>
                  ),
                  color: "text-violet-600 bg-violet-50",
                },
                {
                  label: "Supported test types",
                  value: "All standard lab panels",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M9 3H5a2 2 0 00-2 2v4m6-6h10a2 2 0 012 2v4M9 3v18m0 0h10a2 2 0 002-2V9M9 21H5a2 2 0 01-2-2V9m0 0h18"/>
                    </svg>
                  ),
                  color: "text-emerald-600 bg-emerald-50",
                },
                {
                  label: "Data retention",
                  value: "Encrypted · account-bound · deletable",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                      <path d="M7 11V7a5 5 0 0110 0v4"/>
                    </svg>
                  ),
                  color: "text-slate-600 bg-slate-100",
                },
                {
                  label: "Format support",
                  value: "PDF, JPG, PNG",
                  icon: (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4">
                      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
                      <polyline points="14,2 14,8 20,8"/>
                      <line x1="16" y1="13" x2="8" y2="13"/>
                      <line x1="16" y1="17" x2="8" y2="17"/>
                      <polyline points="10,9 9,9 8,9"/>
                    </svg>
                  ),
                  color: "text-amber-600 bg-amber-50",
                },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center gap-4 p-4 rounded-xl bg-surface-raised border border-surface-border"
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${row.color}`}>
                    {row.icon}
                  </div>
                  <div className="flex-1 flex items-center justify-between">
                    <span className="text-sm text-ink-tertiary">{row.label}</span>
                    <span className="text-sm font-semibold text-ink">
                      {row.value}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* ─── DISCLAIMER ───────────────────────────────────────── */}
      <section className="py-12 bg-amber-50 border-y border-amber-100">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 text-amber-700 font-semibold text-sm mb-3">
            <svg
              viewBox="0 0 20 20"
              fill="currentColor"
              className="w-5 h-5 text-amber-500"
            >
              <path
                fillRule="evenodd"
                d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z"
                clipRule="evenodd"
              />
            </svg>
            Important notice
          </div>
          <p className="text-amber-800 text-sm leading-relaxed">
            Meridix Labs is an educational tool designed to help you understand
            your lab results. It is <strong>not</strong> a medical device, does
            not provide diagnoses, and is not a substitute for professional
            medical advice, diagnosis, or treatment. Always seek the guidance of
            a qualified physician or other qualified health provider with any
            questions you may have regarding a medical condition.
          </p>
        </div>
      </section>

      {/* ─── CTA ──────────────────────────────────────────────── */}
      <section className="py-24 gradient-blue">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <h2 className="text-4xl font-extrabold text-white mb-4">
            Try it now — it's free.
          </h2>
          <p className="text-white/70 mb-8">
            No sign-up. No credit card. Just your lab results and instant clarity.
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-8 py-4 bg-white hover:bg-brand-blue-light text-brand-blue font-bold rounded-xl text-base transition-all duration-200 shadow-xl shadow-black/10"
          >
            Analyze My Results
          </Link>
        </div>
      </section>
    </div>
  );
}
