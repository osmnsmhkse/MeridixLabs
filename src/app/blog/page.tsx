import Link from "next/link";
import type { Metadata } from "next";
import { getAllPosts, formatDate, estimateReadTime } from "@/lib/blog";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Blog — Meridix Labs",
  description:
    "Plain-English guides to understanding your lab results. Learn what blood tests, lipid panels, and CBCs actually mean for your health.",
  alternates: { canonical: "/blog" },
  openGraph: {
    title: "Meridix Labs Blog",
    description:
      "Plain-English guides to understanding your lab results.",
    url: "https://www.meridixlabs.com/blog",
    siteName: "Meridix Labs",
    type: "website",
  },
};

export default async function BlogIndexPage() {
  const t = await getTranslations("Blog");
  const posts = getAllPosts();

  return (
    <div className="glass-site min-h-screen">
      {/* Hero */}
      <section className="gradient-hero -mt-16 pt-52 pb-16">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <span className="chip text-brand-blue mb-5">
            {t("badge")}
          </span>
          <h1 className="text-5xl sm:text-6xl font-extrabold headline-accent tracking-tight leading-tight mb-4">
            {t("title")}
          </h1>
          <p className="text-xl text-ink-secondary max-w-2xl mx-auto leading-relaxed">
            {t("subtitle")}
          </p>
        </div>
      </section>

      {/* Posts grid */}
      <section className="py-20">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-7">
            {posts.map((post) => {
              // Load full post just to get read time — light operation
              // eslint-disable-next-line @typescript-eslint/no-var-requires
              const full = require(`../../../content/blog/${post.slug}.json`);
              const readTime = estimateReadTime(full.content);

              return (
                <Link
                  key={post.slug}
                  href={`/blog/${post.slug}`}
                  className="group flex flex-col rounded-2xl border border-surface-border bg-surface-raised hover:border-brand-blue/30 hover:shadow-lg hover:shadow-brand-blue/5 transition-all duration-300 overflow-hidden"
                >
                  {/* Coloured top accent */}
                  <div className="h-1.5 w-full bg-brand-blue" />

                  <div className="p-6 flex flex-col flex-1">
                    {/* Meta */}
                    <div className="flex items-center gap-3 text-xs text-ink-tertiary mb-3">
                      <span>{formatDate(post.date)}</span>
                      <span>·</span>
                      <span>{readTime} {t("minRead")}</span>
                    </div>

                    {/* Title */}
                    <h2 className="text-base font-bold text-ink leading-snug mb-3 group-hover:text-brand-blue transition-colors">
                      {post.title}
                    </h2>

                    {/* Excerpt */}
                    <p className="text-sm text-ink-secondary leading-relaxed line-clamp-4 flex-1">
                      {post.excerpt}
                    </p>

                    {/* Read more */}
                    <div className="mt-5 flex items-center gap-1 text-sm font-semibold text-brand-blue">
                      {t("readArticle")}
                      <svg
                        viewBox="0 0 20 20"
                        fill="currentColor"
                        className="w-4 h-4 translate-x-0 group-hover:translate-x-1 transition-transform"
                      >
                        <path
                          fillRule="evenodd"
                          d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                          clipRule="evenodd"
                        />
                      </svg>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      </section>

      {/* Bottom CTA */}
      <section className="py-16 bg-surface-raised border-t border-surface-border">
        <div className="max-w-2xl mx-auto px-4 text-center">
          <p className="text-lg font-semibold text-ink mb-2">
            {t("ctaTitle")}
          </p>
          <p className="text-ink-secondary text-sm mb-6">
            {t("ctaBody")}
          </p>
          <Link
            href="/app"
            className="inline-flex items-center gap-2 px-7 py-3.5 bg-brand-blue hover:bg-brand-blue-hover text-white font-bold rounded-xl text-sm transition-all duration-200 shadow-md shadow-brand-blue/20"
          >
            {t("ctaButton")}
          </Link>
        </div>
      </section>
    </div>
  );
}
