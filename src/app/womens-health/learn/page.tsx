import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Women's Health — Learn | Meridix Labs",
  description:
    "Plain-English explanations of hormone labs, cycle conditions, perimenopause, PCOS, endometriosis, NIPT results, and prenatal screening — written without the dismissal.",
  alternates: { canonical: "/womens-health/learn" },
  openGraph: {
    title: "Women's Health — Learn",
    description:
      "Plain-English explanations of hormone labs, cycle conditions, and pregnancy screening.",
    url: "https://www.meridixlabs.com/womens-health/learn",
  },
};

const ARTICLES = [
  {
    slug: "low-amh",
    eyebrow: "Fertility labs",
    title: "What does low AMH actually mean?",
    summary:
      "AMH is one of the most misread lab values in women's medicine. What low AMH does — and does not — say about your fertility.",
    accent: "from-rose-100 to-rose-50 dark:from-rose-900/30 dark:to-rose-950/20",
    iconColor: "text-rose-600 dark:text-rose-300",
  },
  {
    slug: "perimenopause-symptoms",
    eyebrow: "Perimenopause",
    title: "Perimenopause symptoms in your 40s",
    summary:
      "The symptoms are real, the labs are often normal, and women in their early 40s are routinely told it's stress. What perimenopause actually looks like.",
    accent: "from-violet-100 to-violet-50 dark:from-violet-900/30 dark:to-violet-950/20",
    iconColor: "text-violet-600 dark:text-violet-300",
  },
  {
    slug: "lean-pcos",
    eyebrow: "PCOS",
    title: "Lean PCOS — the phenotype doctors miss",
    summary:
      "PCOS doesn't require obesity. Why thin women with PCOS are often told they can't have it, and what the actual diagnostic criteria say.",
    accent: "from-fuchsia-100 to-violet-50 dark:from-fuchsia-900/30 dark:to-violet-950/20",
    iconColor: "text-fuchsia-600 dark:text-fuchsia-300",
  },
  {
    slug: "nipt-results",
    eyebrow: "Pregnancy screening",
    title: "Understanding your NIPT result",
    summary:
      "Screening vs diagnostic. What \"low risk\" and \"high risk\" really mean — and why the false-positive rate matters more than the percentage.",
    accent: "from-indigo-100 to-violet-50 dark:from-indigo-900/30 dark:to-violet-950/20",
    iconColor: "text-indigo-600 dark:text-indigo-300",
  },
  {
    slug: "endometriosis-red-flags",
    eyebrow: "Endometriosis",
    title: "Endometriosis red flags worth pushing on",
    summary:
      "The average diagnostic delay is 7–10 years. The symptom patterns most likely to be endometriosis — and how to be heard.",
    accent: "from-rose-100 to-violet-50 dark:from-rose-900/30 dark:to-violet-950/20",
    iconColor: "text-rose-600 dark:text-rose-300",
  },
  {
    slug: "ferritin-without-anemia",
    eyebrow: "Iron",
    title: "Low ferritin without anemia — why you still feel awful",
    summary:
      "Your hemoglobin is normal. Your ferritin is 18. You're exhausted, your hair is shedding, and your doctor said you're \"fine.\" Here's why you're not.",
    accent: "from-amber-100 to-rose-50 dark:from-amber-900/30 dark:to-rose-950/20",
    iconColor: "text-amber-600 dark:text-amber-300",
  },
];

export default function WomensHealthLearnIndex() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50/30 via-violet-50/20 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 pt-24 pb-24">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5 bg-gradient-to-r from-rose-100 to-violet-100 dark:from-rose-900/30 dark:to-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200/40 dark:border-violet-800/40">
          Women&apos;s Health — Learn
        </div>
        <h1 className="text-3xl sm:text-5xl font-extrabold text-ink tracking-tight mb-4">
          The patterns women&apos;s medicine commonly misses
        </h1>
        <p className="text-base sm:text-lg text-ink-secondary leading-relaxed">
          Plain-English explainers on hormone labs, perimenopause, PCOS, endometriosis, NIPT, and iron — calibrated, not dismissive.
        </p>
      </section>

      <section className="max-w-5xl mx-auto px-4 sm:px-6">
        <ul className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {ARTICLES.map((a) => (
            <li key={a.slug}>
              <Link
                href={`/womens-health/learn/${a.slug}`}
                className="group flex flex-col h-full p-6 rounded-3xl bg-white dark:bg-slate-900 border border-surface-border hover:border-violet-400/50 hover:shadow-lg hover:shadow-violet-500/10 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className={`inline-flex self-start items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest mb-4 bg-gradient-to-r ${a.accent} ${a.iconColor}`}>
                  {a.eyebrow}
                </div>
                <h2 className="text-lg font-extrabold text-ink leading-snug mb-2 group-hover:text-violet-700 dark:group-hover:text-violet-300 transition-colors">
                  {a.title}
                </h2>
                <p className="text-sm text-ink-secondary leading-relaxed flex-1 mb-4">{a.summary}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-violet-600 dark:text-violet-300 group-hover:gap-2.5 transition-all">
                  Read more
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5 text-violet-500">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 mt-12 text-center">
        <div className="rounded-3xl border border-violet-300/60 dark:border-violet-800/60 bg-gradient-to-br from-rose-50 via-violet-50 to-white dark:from-rose-950/30 dark:via-violet-950/30 dark:to-slate-900 p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-extrabold text-ink mb-2">Want a personalized read?</h2>
          <p className="text-sm text-ink-secondary leading-relaxed max-w-lg mx-auto mb-5">
            Upload your labs or describe your symptoms in your own words. The Women&apos;s Health Companion gives you a calibrated, cycle-day-aware interpretation.
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
        </div>
      </section>
    </main>
  );
}
