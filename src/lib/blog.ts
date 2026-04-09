import fs from "fs";
import path from "path";

export type ContentBlock =
  | { type: "p";  text: string }
  | { type: "h2"; text: string }
  | { type: "h3"; text: string }
  | { type: "ul"; items: string[] }
  | { type: "callout"; text: string };

export interface BlogPost {
  title:    string;
  slug:     string;
  date:     string;
  excerpt:  string;
  content:  ContentBlock[];
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
    .sort(
      (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime()
    );
}

export function getPostBySlug(slug: string): BlogPost | null {
  try {
    const raw = fs.readFileSync(
      path.join(postsDir, `${slug}.json`),
      "utf-8"
    );
    return JSON.parse(raw) as BlogPost;
  } catch {
    return null;
  }
}

export function estimateReadTime(content: ContentBlock[]): number {
  const words = content
    .map((b) =>
      b.type === "ul"
        ? b.items.join(" ")
        : "text" in b
        ? b.text
        : ""
    )
    .join(" ")
    .split(/\s+/).length;
  return Math.max(1, Math.ceil(words / 200));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
