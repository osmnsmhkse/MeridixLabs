import Link from "next/link";

export default function LandingPage() {
  return (
    <div className="min-h-screen">

      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden gradient-hero">
        <div className="absolute top-1/4 right-1/4 w-96 h-96 bg-brand-blue/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-1/3 left-1/4 w-72 h-72 bg-brand-blue/5 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: "radial-gradient(#4A85EF 1px, transparent 1px)", backgroundSize: "32px 32px" }} />

        <div className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-32 pb-24 text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-brand-blue/10 border border-brand-blue/20 text-brand-blue-dark text-sm font-medium mb-8 reveal">
            <span className="w-2 h-2 rounded-full bg-brand-blue animate-pulse" />
            AI-powered medical interpretation
          </div>
          <h1 className="text-5xl sm:text-6xl lg:text-[5rem] font-extrabold text-ink leading-[1.05] tracking-tight mb-6 reveal reveal-delay-1">
            Your lab results,{" "}
            <span className="text-gradient-blue">finally explained.</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg sm:text-xl text-ink-secondary leading-relaxed mb-10 reveal reveal-delay-2">
            Upload your blood test, lipid panel, or urinalysis and get an instant, clear interpretation — in plain English or full clinical detail. No jargon unless you want it.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 reveal reveal-delay-3">
            <Link href="/app" className="inline-flex items-center gap-2 px-8 py-4 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold rounded-xl text-base transition-all duration-200 shadow-lg shadow-brand-blue/25 hover:shadow-xl hover:shadow-brand-blue/30 hover:-translate-y-0.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
                <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
              </svg>
              Analyze My Results — Free
            </Link>
            <a href="#how-it-works" className="inline-flex items-center gap-2 px-8 py-4 border border-surface-border hover:border-brand-blue/30 text-ink-secondary hover:text-ink font-semibold rounded-xl text-base transition-all duration-200 bg-white hover:bg-surface-raised">
              See how it works
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </a>
          </div>
          <div className="mt-14 flex flex-wrap items-center justify-center gap-5 text-sm text-ink-tertiary reveal reveal-delay-4">
            {["Blood tests","Lipid panels","Urinalysis","Metabolic panels","Thyroid tests","Complete blood count"].map((t) => (
              <span key={t} className="flex items-center gap-1.5">
                <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-brand-blue">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
                {t}
              </span>
            ))}
          </div>
        </div>

        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 text-ink-tertiary animate-bounce">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </section>

      {/* ─── HOW IT WORKS ─────────────────────────────────────── */}
      <section id="how-it-works" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <span className="text-brand-blue font-semibold text-sm uppercase tracking-widest">Simple process</span>
            <h2 className="mt-3 text-4xl sm:text-5xl font-extrabold text-ink tracking-tight">Three steps to clarity</h2>
            <p className="mt-4 text-lg text-ink-secondary max-w-xl mx-auto">From upload to understanding in seconds. No account needed.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                step: "01",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" /></svg>,
                title: "Upload your results",
                description: "Drag and drop a PDF or photo of your lab report. We accept blood tests, urine tests, metabolic panels, and more.",
              },
              {
                step: "02",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714c0 .597.237 1.17.659 1.591L19.8 15.3" /></svg>,
                title: "AI reads your data",
                description: "Our AI, powered by Claude, analyzes every value against clinical reference ranges and explains the biology behind your results.",
              },
              {
                step: "03",
                icon: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} className="w-7 h-7"><path strokeLinecap="round" strokeLinejoin="round" d="M3.75 12h16.5m-16.5 3.75h16.5M3.75 19.5h16.5M5.625 4.5h12.75a1.875 1.875 0 010 3.75H5.625a1.875 1.875 0 010-3.75z" /></svg>,
                title: "Choose your depth",
                description: 'Toggle between Simple, Medium, and Expert — plus causes, mechanisms, which specialist to see, and a clear action plan.',
              },
            ].map((item, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1} relative flex flex-col items-center text-center p-8 rounded-2xl border border-surface-border bg-white hover:border-brand-blue/25 hover:shadow-lg hover:shadow-brand-blue/5 transition-all duration-300 card-hover`}>
                <div className="w-14 h-14 bg-brand-blue-light rounded-2xl flex items-center justify-center text-brand-blue mb-5">{item.icon}</div>
                <span className="absolute top-6 right-6 text-xs font-bold text-brand-blue/30 tracking-widest">{item.step}</span>
                <h3 className="text-xl font-bold text-ink mb-3">{item.title}</h3>
                <p className="text-ink-secondary text-sm leading-relaxed">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── TIER SHOWCASE ────────────────────────────────────── */}
      <section className="py-24 bg-surface-raised">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16 reveal">
            <span className="text-brand-blue font-semibold text-sm uppercase tracking-widest">Three levels of clarity</span>
            <h2 className="mt-3 text-4xl sm:text-5xl font-extrabold text-ink tracking-tight">Your results, your language</h2>
            <p className="mt-4 text-lg text-ink-secondary max-w-xl mx-auto">Whether you want the simple truth or the full clinical picture, you are in control.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                tier: "Simple", emoji: "💬",
                badge: "bg-emerald-50 text-emerald-700 border border-emerald-100",
                borderHover: "hover:border-emerald-200",
                audience: "No medical background",
                example: '"Your glucose is a little high — think of it like your blood has more sugar than usual. It doesn\'t mean anything scary on its own, but your doctor should know."',
                highlight: "Plain language, zero jargon",
              },
              {
                tier: "Medium", emoji: "📋",
                badge: "bg-brand-blue-light text-brand-blue-dark border border-brand-blue-mid",
                borderHover: "hover:border-brand-blue/25",
                audience: "Educated patient",
                example: '"Your fasting glucose of 112 mg/dL falls in the pre-diabetic range (100–125 mg/dL). This signals that your body\'s insulin response may be starting to lose efficiency."',
                highlight: "Key terms, with context",
              },
              {
                tier: "Expert", emoji: "🔬",
                badge: "bg-purple-50 text-purple-700 border border-purple-100",
                borderHover: "hover:border-purple-200",
                audience: "Clinician / med student",
                example: '"Fasting glucose 112 mg/dL (ref: 70–99). Consistent with IFG per ADA criteria. Consider HbA1c + OGTT to stratify T2DM risk. Review MetS components: BMI, lipid panel, BP."',
                highlight: "Full clinical language",
              },
            ].map((tier, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1} p-7 rounded-2xl bg-white border border-surface-border ${tier.borderHover} transition-all duration-200 card-hover`}>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl">{tier.emoji}</span>
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${tier.badge}`}>{tier.audience}</span>
                </div>
                <h3 className="text-xl font-bold text-ink mb-3">{tier.tier}</h3>
                <p className="text-sm text-ink-secondary italic leading-relaxed mb-4 border-l-2 border-surface-border pl-4">{tier.example}</p>
                <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wider">{tier.highlight}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ─── SOCIAL PROOF ────────────────────────────────────── */}
      <section className="py-20 bg-white border-y border-surface-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">

          {/* Stat bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 sm:gap-0 sm:divide-x sm:divide-surface-border mb-16 reveal">
            {[
              { number: "3,200+",   label: "Reports Analyzed"            },
              { number: "10",       label: "Languages Supported"         },
              { number: "< 10 sec", label: "Average Result Time"         },
            ].map((stat) => (
              <div key={stat.label} className="flex flex-col items-center text-center px-8 py-4">
                <span className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight">{stat.number}</span>
                <span className="mt-2 text-sm text-ink-secondary font-medium">{stat.label}</span>
              </div>
            ))}
          </div>

          {/* Testimonials */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                quote: "I finally understood what my cholesterol panel meant after years of just nodding at my doctor. The Expert mode was exactly what I needed.",
                author: "Sarah K.",
                meta: "34, United States",
              },
              {
                quote: "As a medical student, the Expert tier is actually useful for clinical reasoning practice. Genuinely impressive.",
                author: "Med Student",
                meta: "Turkey",
              },
              {
                quote: "My parents don't speak English well. I switched it to Spanish and they could finally read their own results.",
                author: "Anonymous",
                meta: "",
              },
            ].map((t, i) => (
              <div key={i} className={`reveal reveal-delay-${i + 1} flex flex-col p-6 rounded-2xl bg-surface-raised border border-surface-border hover:border-brand-blue/20 hover:shadow-md hover:shadow-brand-blue/5 transition-all duration-300`}>
                {/* 5 stars */}
                <div className="flex items-center gap-0.5 mb-4">
                  {[...Array(5)].map((_, s) => (
                    <svg key={s} viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-400">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                  ))}
                </div>

                {/* Quote */}
                <p className="text-sm text-ink-secondary leading-relaxed flex-1 italic">
                  &ldquo;{t.quote}&rdquo;
                </p>

                {/* Author */}
                <div className="mt-5 flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-brand-blue-light flex items-center justify-center flex-shrink-0">
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-blue">
                      <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-ink">{t.author}</p>
                    {t.meta && <p className="text-xs text-ink-tertiary">{t.meta}</p>}
                  </div>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* ─── FEATURES ─────────────────────────────────────────── */}
      <section id="features" className="py-24 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-center">
            <div className="reveal">
              <span className="text-brand-blue font-semibold text-sm uppercase tracking-widest">Built differently</span>
              <h2 className="mt-3 text-4xl font-extrabold text-ink tracking-tight leading-tight">Designed for real people,<br />not just doctors.</h2>
              <p className="mt-4 text-lg text-ink-secondary leading-relaxed">Most people receive a lab report and have no idea what it means. Meridix Labs closes that gap — with science, not guesswork.</p>
              <div className="mt-10 space-y-5">
                {[
                  { icon: "🎯", title: "Flagged abnormal values",      desc: "Out-of-range results are highlighted so you spot what matters instantly." },
                  { icon: "🔬", title: "Etiology & mechanisms",        desc: "We explain what causes abnormal values and what's happening in your body." },
                  { icon: "👨‍⚕️", title: "Specialist recommendations",  desc: "Know exactly which type of doctor to see based on your specific results." },
                  { icon: "🌍", title: "10 languages",                 desc: "Get your results explained in your native language — Spanish, Turkish, Japanese, and more." },
                  { icon: "🔒", title: "Stateless & private",          desc: "We never store your file or data. Each session is completely ephemeral." },
                  { icon: "⚡", title: "Results in seconds",           desc: "No waiting, no email, no account required. Upload and understand." },
                ].map((feat, i) => (
                  <div key={feat.title} className={`reveal reveal-delay-${Math.min(i + 1, 5)} flex items-start gap-4`}>
                    <div className="w-10 h-10 rounded-xl bg-brand-blue-light flex items-center justify-center text-lg flex-shrink-0">{feat.icon}</div>
                    <div>
                      <h4 className="font-semibold text-ink">{feat.title}</h4>
                      <p className="text-sm text-ink-secondary mt-0.5">{feat.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Mock results card */}
            <div className="relative reveal reveal-delay-2">
              <div className="absolute inset-0 bg-brand-blue/6 rounded-3xl blur-2xl" />
              <div className="relative bg-white rounded-3xl shadow-xl shadow-brand-blue/10 border border-surface-border overflow-hidden">
                <div className="bg-surface-raised px-6 py-4 border-b border-surface-border flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-brand-blue-light rounded-lg flex items-center justify-center">
                      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-blue">
                        <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
                        <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <span className="text-ink font-semibold text-sm">Basic Metabolic Panel</span>
                  </div>
                  <span className="text-brand-blue text-xs font-semibold">✓ Analyzed</span>
                </div>
                <div className="border-b border-surface-border px-6 pt-4 bg-white">
                  <div className="flex gap-1">
                    {["Simple","Medium","Expert"].map((t, i) => (
                      <button key={t} className={`px-4 py-2 rounded-t-lg text-sm font-medium ${i === 0 ? "bg-brand-blue-light text-brand-blue-dark border-b-2 border-brand-blue" : "text-ink-tertiary"}`}>{t}</button>
                    ))}
                  </div>
                </div>
                <div className="p-6 space-y-3">
                  <p className="text-sm text-ink-secondary leading-relaxed">Your glucose is slightly elevated and sodium is on the low end — worth mentioning at your next check-up.</p>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-amber-50 border border-amber-100">
                    <div className="flex items-center gap-2"><span className="text-amber-500 text-sm font-bold">↑</span><span className="text-sm font-semibold text-ink">Glucose</span></div>
                    <div className="text-right"><span className="text-sm font-bold text-amber-600">112 mg/dL</span><p className="text-xs text-ink-tertiary">ref: 70–99</p></div>
                  </div>
                  <div className="flex items-center justify-between p-3 rounded-xl bg-emerald-50 border border-emerald-100">
                    <div className="flex items-center gap-2"><span className="text-emerald-500 text-sm font-bold">✓</span><span className="text-sm font-semibold text-ink">Creatinine</span></div>
                    <div className="text-right"><span className="text-sm font-bold text-emerald-600">0.9 mg/dL</span><p className="text-xs text-ink-tertiary">ref: 0.7–1.2</p></div>
                  </div>
                  <div className="p-3 rounded-xl bg-brand-blue-light border border-brand-blue-mid">
                    <p className="text-xs font-bold text-brand-blue-dark uppercase tracking-wider mb-1">Which specialist?</p>
                    <p className="text-xs text-ink-secondary">Consider seeing an <strong>Endocrinologist</strong> to evaluate glucose metabolism and rule out pre-diabetes.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── DISCLAIMER BAND ─────────────────────────────────── */}
      <section className="py-5 bg-amber-50 border-y border-amber-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-center gap-3 text-center">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-sm text-amber-800">
            <strong>Educational tool only.</strong> Not a substitute for professional medical advice. Always consult a qualified physician.
          </p>
        </div>
      </section>

      {/* ─── FINAL CTA ────────────────────────────────────────── */}
      <section className="py-28 gradient-blue relative overflow-hidden">
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: "radial-gradient(white 1px, transparent 1px)", backgroundSize: "28px 28px" }} />
        <div className="relative z-10 max-w-3xl mx-auto px-4 text-center reveal">
          <h2 className="text-4xl sm:text-5xl font-extrabold text-white tracking-tight mb-5">Ready to understand your results?</h2>
          <p className="text-lg text-white/75 mb-10">No account. No storage. No confusion. Just clarity.</p>
          <Link href="/app" className="inline-flex items-center gap-3 px-10 py-4 bg-white hover:bg-surface-raised text-brand-blue-dark font-bold rounded-2xl text-lg transition-all duration-200 shadow-xl hover:-translate-y-0.5">
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5">
              <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM6.293 6.707a1 1 0 010-1.414l3-3a1 1 0 011.414 0l3 3a1 1 0 01-1.414 1.414L11 5.414V13a1 1 0 11-2 0V5.414L7.707 6.707a1 1 0 01-1.414 0z" clipRule="evenodd" />
            </svg>
            Upload My Lab Results
          </Link>
        </div>
      </section>
    </div>
  );
}
