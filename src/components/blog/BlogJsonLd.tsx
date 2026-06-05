import { SITE_URL } from "@/lib/site";
import { metaDescription, type BlogPost } from "@/lib/blog";
import { jsonLdString } from "@/lib/jsonld";

const isPlaceholder = (v?: string) => !v || /todo|pending|\[.*\]/i.test(v);

/**
 * BlogJsonLd — per-article structured data:
 *   • MedicalWebPage  — the article itself (author, reviewer, dates)
 *   • BreadcrumbList  — Home › Blog › Article
 *   • FAQPage         — mirrors the on-page FAQ (only when present)
 *
 * The site-wide Organization / WebSite live in <StructuredData> (root layout);
 * we reference them by @id rather than redefining them here.
 */
export default function BlogJsonLd({ post }: { post: BlogPost }) {
  const url = `${SITE_URL}/blog/${post.slug}`;
  const description = metaDescription(post);
  const image = `${SITE_URL}/og-image.png`;

  const authorValid = post.author && !isPlaceholder(post.author.name);
  const reviewerValid = post.reviewer && !isPlaceholder(post.reviewer.name);

  const webPage: Record<string, unknown> = {
    "@type": "MedicalWebPage",
    "@id": `${url}#webpage`,
    url,
    name: post.title,
    headline: post.title,
    description,
    inLanguage: "en",
    datePublished: post.date,
    dateModified: post.lastReviewed ?? post.date,
    isPartOf: { "@id": `${SITE_URL}/#website` },
    publisher: { "@id": `${SITE_URL}/#organization` },
    mainEntityOfPage: url,
    image: { "@type": "ImageObject", url: image, width: 1200, height: 630 },
    author: authorValid
      ? { "@type": "Person", name: post.author!.name }
      : { "@id": `${SITE_URL}/#organization` },
  };
  // `lastReviewed` asserts a clinical review happened — only emit it once a
  // real reviewer is credited (placeholders stay out of structured data).
  if (reviewerValid) {
    if (post.lastReviewed) webPage.lastReviewed = post.lastReviewed;
    webPage.reviewedBy = {
      "@type": "Person",
      name: post.reviewer!.name,
      ...(post.reviewer!.credential ? { jobTitle: post.reviewer!.credential } : {}),
    };
  }

  const breadcrumb = {
    "@type": "BreadcrumbList",
    "@id": `${url}#breadcrumb`,
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Home", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Blog", item: `${SITE_URL}/blog` },
      { "@type": "ListItem", position: 3, name: post.title, item: url },
    ],
  };

  const graph: Record<string, unknown>[] = [webPage, breadcrumb];

  if (post.faq?.length) {
    graph.push({
      "@type": "FAQPage",
      "@id": `${url}#faq`,
      mainEntity: post.faq.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: f.a },
      })),
    });
  }

  const json = { "@context": "https://schema.org", "@graph": graph };

  return (
    <script
      type="application/ld+json"
      // jsonLdString() escapes `<` so author-supplied FAQ text can't break out.
      dangerouslySetInnerHTML={{ __html: jsonLdString(json) }}
    />
  );
}
