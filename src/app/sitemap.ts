import { MetadataRoute } from "next";
import { getAllPosts } from "@/lib/blog";

const BASE_URL = "https://www.meridixlabs.com";

const STATIC_PAGES: { url: string; priority: number; changeFrequency: MetadataRoute.Sitemap[number]["changeFrequency"] }[] = [
  { url: "/",            priority: 1.0,  changeFrequency: "weekly" },
  { url: "/learn",       priority: 0.8,  changeFrequency: "monthly" },
  { url: "/blog",        priority: 0.8,  changeFrequency: "weekly" },
  { url: "/about",       priority: 0.8,  changeFrequency: "monthly" },
  { url: "/for-doctors", priority: 0.8,  changeFrequency: "monthly" },
  { url: "/app",         priority: 0.8,  changeFrequency: "monthly" },
  { url: "/symptom",     priority: 0.7,  changeFrequency: "monthly" },
  { url: "/diagnosed",   priority: 0.7,  changeFrequency: "monthly" },
  { url: "/trends",      priority: 0.7,  changeFrequency: "monthly" },
  { url: "/genetics",    priority: 0.8,  changeFrequency: "monthly" },
  { url: "/pediatric",   priority: 0.8,  changeFrequency: "monthly" },
  { url: "/privacy",     priority: 0.3,  changeFrequency: "yearly" },
  { url: "/terms",       priority: 0.3,  changeFrequency: "yearly" },
];

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString();

  const staticEntries: MetadataRoute.Sitemap = STATIC_PAGES.map(({ url, priority, changeFrequency }) => ({
    url: `${BASE_URL}${url}`,
    lastModified: now,
    changeFrequency,
    priority,
  }));

  const blogEntries: MetadataRoute.Sitemap = getAllPosts().map((post) => ({
    url: `${BASE_URL}/blog/${post.slug}`,
    lastModified: new Date(post.date).toISOString(),
    changeFrequency: "monthly",
    priority: 0.64,
  }));

  return [...staticEntries, ...blogEntries];
}
