import Link from "next/link";

export interface ArticleSection {
  heading: string;
  body: React.ReactNode;
}

export interface FAQItem {
  question: string;
  answer: React.ReactNode;
}

export interface ArticleShellProps {
  eyebrow: string;
  title: string;
  intro: string;
  tldr: string;
  sections: ArticleSection[];
  oftenMissed: React.ReactNode;
  questions: string[];
  faq?: FAQItem[];
  related?: { href: string; label: string }[];
}

export function ArticleShell(props: ArticleShellProps) {
  const {
    eyebrow,
    title,
    intro,
    tldr,
    sections,
    oftenMissed,
    questions,
    faq,
    related,
  } = props;

  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50/30 via-violet-50/20 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 pt-24 pb-24">
      {/* Breadcrumb */}
      <nav className="max-w-3xl mx-auto px-4 sm:px-6 mb-6 text-xs text-ink-tertiary flex items-center gap-2" aria-label="Breadcrumb">
        <Link href="/" className="hover:text-violet-600">Home</Link>
        <span>/</span>
        <Link href="/womens-health" className="hover:text-violet-600">Women&apos;s Health</Link>
        <span>/</span>
        <Link href="/womens-health/learn" className="hover:text-violet-600">Learn</Link>
        <span>/</span>
        <span className="text-ink-secondary truncate">{eyebrow}</span>
      </nav>

      {/* Hero */}
      <header className="max-w-3xl mx-auto px-4 sm:px-6 mb-10">
        <div className="chip text-violet-700 dark:text-violet-300 mb-5">
          {eyebrow}
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight leading-tight mb-4">
          {title}
        </h1>
        <p className="text-base sm:text-lg text-ink-secondary leading-relaxed">{intro}</p>
      </header>

      {/* TL;DR */}
      <section className="max-w-3xl mx-auto px-4 sm:px-6 mb-10">
        <div className="rounded-2xl border border-violet-200 dark:border-violet-800/60 bg-gradient-to-r from-rose-50/60 to-violet-50/60 dark:from-rose-950/20 dark:to-violet-950/20 p-5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-300 mb-2">In short</p>
          <p className="text-sm sm:text-base text-ink leading-relaxed">{tldr}</p>
        </div>
      </section>

      {/* Main sections */}
      <article className="max-w-3xl mx-auto px-4 sm:px-6 space-y-10">
        {sections.map((s, i) => (
          <section key={i}>
            <h2 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight mb-4">{s.heading}</h2>
            <div className="prose-content space-y-4 text-sm sm:text-base text-ink-secondary leading-relaxed">
              {s.body}
            </div>
          </section>
        ))}

        {/* Often missed */}
        <section className="rounded-2xl border-2 border-violet-300 dark:border-violet-700/60 bg-gradient-to-br from-rose-50/40 via-violet-50/40 to-white dark:from-rose-950/20 dark:via-violet-950/20 dark:to-slate-900 shadow-lg shadow-violet-500/5 overflow-hidden">
          <div className="px-5 py-4 border-b border-violet-200/60 dark:border-violet-800/40 bg-gradient-to-r from-rose-500/8 via-violet-500/8 to-transparent">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center flex-shrink-0 shadow-md shadow-violet-500/20">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} className="w-4 h-4 text-white">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.182 15.182a4.5 4.5 0 01-6.364 0M21 12a9 9 0 11-18 0 9 9 0 0118 0zM9.75 9.75c0 .414-.168.75-.375.75S9 10.164 9 9.75 9.168 9 9.375 9s.375.336.375.75zm5.625 0c0 .414-.168.75-.375.75s-.375-.336-.375-.75.168-.75.375-.75.375.336.375.75z" />
                </svg>
              </div>
              <div className="min-w-0">
                <span className="inline-flex items-center gap-1 text-[10px] font-bold tracking-widest uppercase text-violet-700 dark:text-violet-300 px-2 py-0.5 rounded-full bg-violet-100 dark:bg-violet-900/40">
                  What doctors often miss
                </span>
                <p className="text-[11px] text-ink-tertiary mt-1.5 leading-snug">The dismissal patterns worth knowing about.</p>
              </div>
            </div>
          </div>
          <div className="px-5 py-4 space-y-3 text-sm sm:text-base text-ink-secondary leading-relaxed">
            {oftenMissed}
          </div>
        </section>

        {/* Questions to ask */}
        <section>
          <h2 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight mb-4">Questions to bring to your doctor</h2>
          <ol className="space-y-3">
            {questions.map((q, i) => (
              <li key={i} className="flex items-start gap-3 text-sm sm:text-base text-ink-secondary leading-relaxed">
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center text-xs font-bold text-violet-700 dark:text-violet-300 mt-0.5">
                  {i + 1}
                </span>
                <span className="font-medium text-ink">{q}</span>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ */}
        {faq && faq.length > 0 && (
          <section>
            <h2 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight mb-4">Frequently asked</h2>
            <div className="space-y-4">
              {faq.map((item, i) => (
                <details key={i} className="group rounded-xl border border-surface-border bg-white dark:bg-slate-900 overflow-hidden">
                  <summary className="flex items-center justify-between gap-3 px-5 py-4 cursor-pointer text-sm sm:text-base font-semibold text-ink list-none">
                    <span>{item.question}</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-ink-tertiary group-open:rotate-180 transition-transform flex-shrink-0">
                      <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </summary>
                  <div className="px-5 pb-4 text-sm text-ink-secondary leading-relaxed">{item.answer}</div>
                </details>
              ))}
            </div>
          </section>
        )}

        {/* CTA back to tool */}
        <section className="rounded-3xl border border-violet-300/60 dark:border-violet-800/60 bg-gradient-to-br from-rose-50 via-violet-50 to-white dark:from-rose-950/30 dark:via-violet-950/30 dark:to-slate-900 p-6 sm:p-8 text-center">
          <h3 className="text-lg sm:text-xl font-extrabold text-ink mb-2">Want a personalized read on your situation?</h3>
          <p className="text-sm text-ink-secondary leading-relaxed max-w-lg mx-auto mb-5">
            The Women&apos;s Health Companion gives you a cycle-day-aware interpretation of your hormone labs, symptom-pattern guidance, or trimester-aware pregnancy support — calibrated, not dismissive.
          </p>
          <Link
            href="/womens-health"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-br from-rose-600 to-violet-600 hover:from-rose-700 hover:to-violet-700 text-white font-bold text-sm transition-all shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30"
          >
            Open the companion
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
              <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
            </svg>
          </Link>
        </section>

        {/* Related */}
        {related && related.length > 0 && (
          <section>
            <h2 className="text-xl sm:text-2xl font-extrabold text-ink tracking-tight mb-4">Related reads</h2>
            <ul className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {related.map((r) => (
                <li key={r.href}>
                  <Link href={r.href} className="flex items-center justify-between gap-3 px-4 py-3 rounded-xl border border-surface-border bg-white dark:bg-slate-900 hover:border-violet-400/40 hover:bg-violet-50/30 dark:hover:bg-violet-950/20 transition-all">
                    <span className="text-sm font-semibold text-ink">{r.label}</span>
                    <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-ink-tertiary">
                      <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                    </svg>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Disclaimer */}
        <div className="flex items-start gap-2.5 p-4 rounded-xl bg-amber-50 dark:bg-amber-900/20 border border-amber-100 dark:border-amber-800">
          <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-amber-500 flex-shrink-0 mt-0.5">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
          <p className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">
            This article is for education only. It is not a substitute for an OB/GYN, reproductive endocrinologist, midwife, or your own clinician. If something feels wrong, trust that and seek care.
          </p>
        </div>
      </article>
    </main>
  );
}
