import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import {
  getPostBySlug,
  getAllPosts,
  formatDate,
  estimateReadTime,
  metaDescription,
  slugifyHeading,
  type ContentBlock,
  type BlogPost,
  type BlogPostMeta,
} from "@/lib/blog";
import { SITE_URL } from "@/lib/site";
import ReferenceRangeBar from "@/components/blog/ReferenceRangeBar";
import ComparisonTable from "@/components/blog/ComparisonTable";
import DecisionTree from "@/components/blog/DecisionTree";
import Figure from "@/components/blog/Figure";
import KeyTakeaways from "@/components/blog/KeyTakeaways";
import TableOfContents from "@/components/blog/TableOfContents";
import ArticleFAQ from "@/components/blog/ArticleFAQ";
import Byline from "@/components/blog/Byline";
import References from "@/components/blog/References";
import BlogJsonLd from "@/components/blog/BlogJsonLd";

/* ── Static params ───────────────────────────────────────────────────── */
export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }));
}

/* ── Per-post metadata ───────────────────────────────────────────────── */
export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return { title: "Post Not Found — Meridix Labs" };

  const description = metaDescription(post); // sentence-safe, never mid-word
  const canonical = `/blog/${post.slug}`;

  return {
    title: `${post.title} — Meridix Labs`,
    description,
    alternates: { canonical }, // self-referential — fixes homepage-canonical bug
    openGraph: {
      title: post.title,
      description,
      url: `${SITE_URL}${canonical}`,
      siteName: "Meridix Labs",
      type: "article",
      publishedTime: post.date,
      modifiedTime: post.lastReviewed ?? post.date,
      images: [{ url: `${SITE_URL}/og-image.png`, width: 1200, height: 630, alt: post.title }],
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description,
    },
  };
}

/* ── Content block renderer ──────────────────────────────────────────── */
function renderBlock(block: ContentBlock, idx: number) {
  switch (block.type) {
    case "h2":
      return (
        <h2
          key={idx}
          id={slugifyHeading(block.text)}
          className="text-2xl font-extrabold text-ink tracking-tight mt-10 mb-4 scroll-mt-24"
        >
          {block.text}
        </h2>
      );
    case "h3":
      return <h3 key={idx} className="text-lg font-bold text-ink mt-7 mb-3">{block.text}</h3>;
    case "p":
      return <p key={idx} className="text-ink-secondary leading-relaxed text-base mb-4">{block.text}</p>;
    case "ul":
      return (
        <ul key={idx} className="mb-5 space-y-2">
          {block.items.map((item, i) => (
            <li key={i} className="flex items-start gap-2.5 text-ink-secondary text-sm leading-relaxed">
              <span className="mt-1.5 w-1.5 h-1.5 rounded-full bg-brand-blue flex-shrink-0" />
              {item}
            </li>
          ))}
        </ul>
      );
    case "callout":
      return (
        <div key={idx} className="my-6 px-5 py-4 rounded-xl bg-brand-blue-light dark:bg-brand-blue/10 border-l-4 border-brand-blue">
          <p className="text-sm text-brand-blue font-medium leading-relaxed italic">{block.text}</p>
        </div>
      );
    case "rangeBar":
      return <ReferenceRangeBar key={idx} {...block} />;
    case "comparison":
      return <ComparisonTable key={idx} {...block} />;
    case "decisionTree":
      return <DecisionTree key={idx} {...block} />;
    case "figure":
      return <Figure key={idx} {...block} />;
    default:
      return null;
  }
}

/* ── Mid-article CTA ─────────────────────────────────────────────────── */
function MidArticleCTA() {
  return (
    <div className="my-10 flex items-start gap-4 p-5 rounded-2xl border border-brand-blue/20 bg-brand-blue-light dark:bg-brand-blue/10">
      <div className="w-10 h-10 rounded-xl bg-brand-blue flex items-center justify-center flex-shrink-0">
        <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5 text-white">
          <path d="M9 2a1 1 0 000 2h2a1 1 0 100-2H9z" />
          <path fillRule="evenodd" d="M4 5a2 2 0 012-2 3 3 0 003 3h2a3 3 0 003-3 2 2 0 012 2v11a2 2 0 01-2 2H6a2 2 0 01-2-2V5zm3 4a1 1 0 000 2h.01a1 1 0 100-2H7zm3 0a1 1 0 000 2h3a1 1 0 100-2h-3zm-3 4a1 1 0 100 2h.01a1 1 0 100-2H7zm3 0a1 1 0 100 2h3a1 1 0 100-2h-3z" clipRule="evenodd" />
        </svg>
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-bold text-ink mb-0.5">Have your own results to check?</p>
        <p className="text-xs text-ink-secondary leading-relaxed mb-3">
          Upload your lab report and get an instant AI explanation — values flagged, causes explained, specialist guidance included.
        </p>
        <Link
          href="/app"
          className="inline-flex items-center gap-1.5 text-xs font-bold text-brand-blue hover:underline"
        >
          Analyze my results — it&apos;s free →
        </Link>
      </div>
    </div>
  );
}

/* ── Related posts (topical — driven by frontmatter `related`) ───────── */
function RelatedPosts({ post }: { post: BlogPost }) {
  const all = getAllPosts();

  // Prefer explicit topical links; backfill with most-recent others.
  const explicit = (post.related ?? [])
    .map((slug) => all.find((p) => p.slug === slug))
    .filter((p): p is BlogPostMeta => Boolean(p));

  const backfill = all.filter(
    (p) => p.slug !== post.slug && !explicit.some((r) => r.slug === p.slug)
  );

  const related = [...explicit, ...backfill].slice(0, 3);
  if (related.length === 0) return null;

  return (
    <div className="mt-14 pt-10 border-t border-surface-border">
      <h2 className="text-lg font-bold text-ink mb-5">Related reading</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {related.map((rp) => (
          <Link
            key={rp.slug}
            href={`/blog/${rp.slug}`}
            className="group flex flex-col p-4 rounded-xl border border-surface-border hover:border-brand-blue/30 hover:shadow-md hover:shadow-brand-blue/5 bg-surface-raised transition-all duration-200"
          >
            <span className="text-[10px] font-bold text-brand-blue uppercase tracking-widest mb-2">Health Education</span>
            <p className="text-sm font-semibold text-ink leading-snug mb-2 group-hover:text-brand-blue transition-colors line-clamp-2">
              {rp.title}
            </p>
            <p className="text-xs text-ink-tertiary leading-relaxed line-clamp-2 flex-1 mb-3">
              {rp.excerpt}
            </p>
            <span className="text-xs font-semibold text-brand-blue">Read article →</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ── Page component ──────────────────────────────────────────────────── */
export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const readTime = estimateReadTime(post.content);

  // Table of contents from body H2s.
  const headings = post.content
    .filter((b): b is Extract<ContentBlock, { type: "h2" }> => b.type === "h2")
    .map((b) => ({ id: slugifyHeading(b.text), text: b.text }));

  // Split content: first ~40% gets rendered, then mid-CTA, then the rest.
  const splitIdx = Math.floor(post.content.length * 0.4);
  const firstHalf = post.content.slice(0, splitIdx);
  const secondHalf = post.content.slice(splitIdx);

  return (
    <div className="min-h-screen bg-surface">
      <BlogJsonLd post={post} />

      {/* Article header */}
      <section className="gradient-hero pt-36 pb-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav aria-label="Breadcrumb" className="flex items-center gap-2 text-xs text-ink-tertiary mb-6">
            <Link href="/" className="hover:text-brand-blue transition-colors">Home</Link>
            <span aria-hidden>›</span>
            <Link href="/blog" className="hover:text-brand-blue transition-colors">Blog</Link>
            <span aria-hidden>›</span>
            <span className="text-ink-secondary truncate max-w-[200px]">{post.title}</span>
          </nav>

          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-ink tracking-tight leading-tight mb-5">
            {post.title}
          </h1>

          <div className="flex flex-wrap items-center gap-4 text-sm text-ink-tertiary">
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
              </svg>
              {formatDate(post.date)}
            </div>
            <div className="flex items-center gap-1.5">
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
              </svg>
              {readTime} min read
            </div>
            <span className="px-2.5 py-1 rounded-full bg-surface-raised border border-brand-blue/20 text-brand-blue text-xs font-semibold">
              Health Education
            </span>
          </div>

          {/* E-E-A-T byline: author + medical reviewer + last reviewed */}
          <Byline author={post.author} reviewer={post.reviewer} lastReviewed={post.lastReviewed} />
        </div>
      </section>

      {/* Article body */}
      <section className="py-12">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Excerpt lead */}
          <p className="text-lg text-ink-secondary leading-relaxed border-l-4 border-brand-blue pl-5 mb-8 italic">
            {post.excerpt}
          </p>

          {/* Key takeaways + on-this-page nav */}
          {post.keyTakeaways && <KeyTakeaways items={post.keyTakeaways} />}
          <TableOfContents headings={headings} />

          {/* First portion of content */}
          <div>{firstHalf.map((block, idx) => renderBlock(block, idx))}</div>

          {/* Mid-article CTA — appears naturally mid-read */}
          <MidArticleCTA />

          {/* Remainder of content */}
          <div>{secondHalf.map((block, idx) => renderBlock(block, idx + firstHalf.length))}</div>

          {/* FAQ — also feeds FAQPage schema */}
          {post.faq && <ArticleFAQ items={post.faq} />}

          {/* References & sources */}
          {post.references && <References items={post.references} />}

          {/* Medical disclaimer — preserves educational-tool framing */}
          <p className="mt-8 text-xs text-ink-tertiary leading-relaxed italic">
            This article is for general education and is not medical advice. Reference ranges vary between
            laboratories, and only a qualified clinician who knows your full history can interpret your
            results. Always discuss your own lab work with your physician.
          </p>

          {/* Divider */}
          <div className="mt-14 pt-10 border-t border-surface-border" />

          {/* End CTA card */}
          <div className="rounded-2xl bg-gradient-to-br from-brand-blue to-blue-500 p-7 text-white">
            <p className="text-xs font-bold uppercase tracking-widest text-white/70 mb-2">Meridix Labs</p>
            <h3 className="text-xl font-extrabold mb-2 leading-snug">
              Want to understand your own lab results?
            </h3>
            <p className="text-white/80 text-sm mb-5 leading-relaxed">
              Upload your blood test, lipid panel, or CBC and get an instant AI interpretation — in plain English or full clinical detail. Free to try.
            </p>
            <Link
              href="/app"
              className="inline-flex items-center gap-2 px-6 py-3 bg-white hover:bg-brand-blue-light text-brand-blue font-bold rounded-xl text-sm transition-all duration-200 shadow-lg shadow-black/10"
            >
              Try Meridix Labs →
            </Link>
          </div>

          {/* Related posts */}
          <RelatedPosts post={post} />

          {/* Back link */}
          <div className="mt-10">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-sm text-ink-tertiary hover:text-brand-blue transition-colors"
            >
              <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4">
                <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
              </svg>
              Back to all articles
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
