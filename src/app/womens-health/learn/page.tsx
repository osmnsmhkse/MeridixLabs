import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Women's Health — Learn | Meridix Labs",
  description:
    "Plain-English explanations of hormone labs, cycle conditions, perimenopause, PCOS, endometriosis, and prenatal screening. Educational content from Meridix Labs.",
  alternates: { canonical: "/womens-health/learn" },
  openGraph: {
    title: "Women's Health — Learn",
    description:
      "Plain-English explanations of hormone labs, cycle conditions, and pregnancy.",
    url: "https://www.meridixlabs.com/womens-health/learn",
  },
};

export default function WomensHealthLearnIndex() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-rose-50/30 via-violet-50/20 to-white dark:from-slate-900 dark:via-slate-900 dark:to-slate-950 pt-24 pb-24">
      <section className="max-w-2xl mx-auto px-4 sm:px-6 text-center">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold mb-5 bg-gradient-to-r from-rose-100 to-violet-100 dark:from-rose-900/30 dark:to-violet-900/30 text-violet-700 dark:text-violet-300 border border-violet-200/40 dark:border-violet-800/40">
          Learn
        </div>
        <h1 className="text-3xl sm:text-4xl font-extrabold text-ink tracking-tight mb-3">
          Women's Health, explained
        </h1>
        <p className="text-base text-ink-secondary leading-relaxed mb-8">
          Plain-English guides on hormone labs, cycles, perimenopause, PCOS,
          endometriosis, and prenatal screening — coming soon.
        </p>
        <Link
          href="/womens-health"
          className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-gradient-to-br from-rose-600 to-violet-600 hover:from-rose-700 hover:to-violet-700 text-white font-bold text-sm transition-all shadow-md shadow-violet-500/20 hover:shadow-lg hover:shadow-violet-500/30"
        >
          Open the Women's Health Companion
        </Link>
      </section>
    </main>
  );
}
