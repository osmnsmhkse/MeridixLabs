import fs from "fs";
import path from "path";

/* ── Visual block primitives ─────────────────────────────────────────────
   Tone drives the colour language of every data-driven visual so the whole
   blog speaks one palette (and stays theme-aware via Tailwind tokens).      */
export type Tone = "normal" | "low" | "caution" | "danger" | "info";

export interface RangeZone {
  label: string;
  from: number;
  to: number;
  tone: Tone;
}
export interface RangeMarker {
  value: number;
  label?: string;
}

/* ── Content blocks ──────────────────────────────────────────────────────
   The article body is a typed, serialisable array. Adding a variant here +
   a case in the renderer makes that capability available to every article. */
export type ContentBlock =
  | { type: "p"; text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "callout"; text: string }
  /* ReferenceRangeBar — shows where a value sits across low/normal/high zones */
  | {
      type: "rangeBar";
      title: string;
      unit?: string;
      min: number;
      max: number;
      zones: RangeZone[];
      marker?: RangeMarker;
      caption?: string;
    }
  /* ComparisonTable — side-by-side (e.g. AST vs ALT, direct vs indirect) */
  | {
      type: "comparison";
      title?: string;
      columns: [string, string];
      rows: { label: string; a: string; b: string }[];
      caption?: string;
    }
  /* DecisionTree — "when to worry vs watch" triage flow */
  | {
      type: "decisionTree";
      title?: string;
      branches: { if: string; then: string; tone: Tone }[];
      caption?: string;
    }
  /* Figure — reusable left-to-right process/physiology flow diagram */
  | {
      type: "figure";
      title?: string;
      variant: "flow";
      nodes: { label: string; sub?: string }[];
      caption?: string;
    };

/* ── Frontmatter ─────────────────────────────────────────────────────────
   Every field below is optional, so an article that hasn't been enriched
   yet still renders. Fill them in to unlock E-E-A-T, FAQ, schema, etc.      */
export interface Author {
  name: string;
  role?: string;
}
export interface Reviewer {
  name: string;
  credential?: string;
}
export interface FaqItem {
  q: string;
  a: string;
}
export interface Reference {
  label: string;
  url: string;
  source?: string;
}

export interface BlogPost {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  /** Hand-authored meta description (<=155 chars, never cut mid-word). */
  description?: string;
  author?: Author;
  reviewer?: Reviewer;
  /** ISO date the clinical content was last reviewed. */
  lastReviewed?: string;
  keyTakeaways?: string[];
  faq?: FaqItem[];
  references?: Reference[];
  /** Explicit slugs of topically related articles (drives internal linking). */
  related?: string[];
  content: ContentBlock[];
}

export type BlogPostMeta = Omit<BlogPost, "content">;

const postsDir = path.join(process.cwd(), "content/blog");

export function getAllPosts(): BlogPostMeta[] {
  const files = fs.readdirSync(postsDir).filter((f) => f.endsWith(".json"));
  return files
    .map((f) => {
      const raw = JSON.parse(
        fs.readFileSync(path.join(postsDir, f), "utf-8")
      ) as BlogPost;
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { content, ...meta } = raw;
      return meta;
    })
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const raw = fs.readFileSync(path.join(postsDir, `${slug}.json`), "utf-8");
    return JSON.parse(raw) as BlogPost;
  } catch {
    return null;
  }
}

/** Pull all human-readable text out of a block (for read-time estimation). */
function blockText(b: ContentBlock): string {
  switch (b.type) {
    case "ul":
      return b.items.join(" ");
    case "rangeBar":
      return [b.title, b.caption, ...b.zones.map((z) => z.label)].filter(Boolean).join(" ");
    case "comparison":
      return [b.title, b.caption, ...b.rows.flatMap((r) => [r.label, r.a, r.b])]
        .filter(Boolean)
        .join(" ");
    case "decisionTree":
      return [b.title, b.caption, ...b.branches.flatMap((x) => [x.if, x.then])]
        .filter(Boolean)
        .join(" ");
    case "figure":
      return [b.title, b.caption, ...b.nodes.flatMap((n) => [n.label, n.sub])]
        .filter(Boolean)
        .join(" ");
    default:
      return "text" in b ? b.text : "";
  }
}

export function estimateReadTime(content: ContentBlock[]): number {
  const words = content.map(blockText).join(" ").trim().split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

/** Stable anchor id from a heading (for the table of contents). */
export function slugifyHeading(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-")
    .slice(0, 60);
}

/**
 * Sentence-boundary-safe meta description. Prefers the hand-authored
 * `description`; otherwise clamps the excerpt to ~155 chars on a sentence
 * boundary, falling back to a word boundary — never mid-word.
 */
export function metaDescription(post: { description?: string; excerpt: string }, max = 155): string {
  if (post.description && post.description.trim()) return post.description.trim();
  const clean = post.excerpt.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;

  const slice = clean.slice(0, max + 1);
  const lastStop = Math.max(
    slice.lastIndexOf(". "),
    slice.lastIndexOf("? "),
    slice.lastIndexOf("! ")
  );
  if (lastStop >= max * 0.55) return clean.slice(0, lastStop + 1).trim();

  const lastSpace = clean.slice(0, max - 1).lastIndexOf(" ");
  return clean.slice(0, lastSpace > 0 ? lastSpace : max - 1).trim() + "…";
}
