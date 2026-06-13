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
  },
  {
    slug: "perimenopause-symptoms",
    eyebrow: "Perimenopause",
    title: "Perimenopause symptoms in your 40s",
    summary:
      "The symptoms are real, the labs are often normal, and women in their early 40s are routinely told it's stress. What perimenopause actually looks like.",
  },
  {
    slug: "lean-pcos",
    eyebrow: "PCOS",
    title: "Lean PCOS — the phenotype doctors miss",
    summary:
      "PCOS doesn't require obesity. Why thin women with PCOS are often told they can't have it, and what the actual diagnostic criteria say.",
  },
  {
    slug: "nipt-results",
    eyebrow: "Pregnancy screening",
    title: "Understanding your NIPT result",
    summary:
      "Screening vs diagnostic. What \"low risk\" and \"high risk\" really mean — and why the false-positive rate matters more than the percentage.",
  },
  {
    slug: "endometriosis-red-flags",
    eyebrow: "Endometriosis",
    title: "Endometriosis red flags worth pushing on",
    summary:
      "The average diagnostic delay is 7–10 years. The symptom patterns most likely to be endometriosis — and how to be heard.",
  },
  {
    slug: "ferritin-without-anemia",
    eyebrow: "Iron",
    title: "Low ferritin without anemia — why you still feel awful",
    summary:
      "Your hemoglobin is normal. Your ferritin is 18. You're exhausted, your hair is shedding, and your doctor said you're \"fine.\" Here's why you're not.",
  },
];

export default function WomensHealthLearnIndex() {
  return (
    <main className="min-h-screen bg-surface pt-24 pb-24">
      <section className="max-w-3xl mx-auto px-4 sm:px-6 text-center mb-12">
        <div className="chip text-ink-secondary mb-5">
          <span className="kicker-mono">Women&apos;s Health — Learn</span>
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
                className="group flex flex-col h-full p-6 rounded-3xl bg-surface-raised border border-surface-border hover:border-ink/25 hover:-translate-y-0.5 transition-all duration-300"
              >
                <div className="self-start kicker-mono text-ink-tertiary mb-4">
                  {a.eyebrow}
                </div>
                <h2 className="text-lg font-extrabold text-ink leading-snug mb-2 group-hover:text-brand-blue transition-colors">
                  {a.title}
                </h2>
                <p className="text-sm text-ink-secondary leading-relaxed flex-1 mb-4">{a.summary}</p>
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-blue group-hover:gap-2.5 transition-all">
                  Read more
                  <svg viewBox="0 0 20 20" fill="currentColor" className="w-3.5 h-3.5">
                    <path fillRule="evenodd" d="M3 10a.75.75 0 01.75-.75h10.638L10.23 5.29a.75.75 0 111.04-1.08l5.5 5.25a.75.75 0 010 1.08l-5.5 5.25a.75.75 0 11-1.04-1.08l4.158-3.96H3.75A.75.75 0 013 10z" clipRule="evenodd" />
                  </svg>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="max-w-3xl mx-auto px-4 sm:px-6 mt-12 text-center">
        <div className="rounded-3xl border border-surface-border bg-surface-raised p-6 sm:p-8">
          <h2 className="text-lg sm:text-xl font-extrabold text-ink mb-2">Want a personalized read?</h2>
          <p className="text-sm text-ink-secondary leading-relaxed max-w-lg mx-auto mb-5">
            Upload your labs or describe your symptoms in your own words. The Women&apos;s Health Companion gives you a calibrated, cycle-day-aware interpretation.
          </p>
          <Link
            href="/womens-health"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-brand-blue hover:bg-brand-blue-hover text-white font-bold text-sm transition-all"
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
