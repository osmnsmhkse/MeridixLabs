import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import Anthropic from "@anthropic-ai/sdk";
import { searchArticles, type PubMedArticle, type ArticleType } from "@/lib/pubmed";
import { resolveSearchTerms, type Direction } from "@/lib/markerSearchTerms";
import { supabaseServer, isAccountsEnabled } from "@/lib/supabase";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Cache lifetime — PubMed evidence for a marker changes slowly. 30 days.
const CACHE_TTL_MS = 30 * 24 * 60 * 60 * 1000;
// Cap how many distinct abnormal markers we process per request.
const MAX_MARKERS = 8;
const ARTICLES_PER_MARKER = 4;

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  tr: "Turkish",
  fr: "French",
  de: "German",
  ar: "Arabic",
  ru: "Russian",
  it: "Italian",
  zh: "Simplified Chinese",
};

interface Flag {
  marker: string;
  value: string;
  unit: string;
  reference: string;
  status: string;
}

export interface RelatedArticle {
  pmid: string;
  title: string;
  journal: string;
  year: string | null;
  pubType: ArticleType;
  url: string;
  note?: string; // plain-language relevance note, grounded strictly in abstract
}

export interface MarkerGroup {
  marker: string;
  direction: Direction;
  articles: RelatedArticle[];
}

function normalizeKey(marker: string, direction: Direction, lang: string): string {
  return `${marker.trim().toLowerCase().replace(/\s+/g, " ")}|${direction}|${lang}`;
}

// ── Cache helpers (degrade silently if Supabase isn't configured) ───────────
async function readCache(key: string): Promise<RelatedArticle[] | null> {
  if (!isAccountsEnabled()) return null;
  try {
    const { data, error } = await supabaseServer()
      .from("pubmed_marker_cache")
      .select("articles, fetched_at")
      .eq("marker_key", key)
      .maybeSingle();
    if (error || !data) return null;
    if (Date.now() - new Date(data.fetched_at as string).getTime() > CACHE_TTL_MS) return null;
    return (data.articles as RelatedArticle[]) ?? null;
  } catch {
    return null;
  }
}

async function writeCache(key: string, label: string, articles: RelatedArticle[]): Promise<void> {
  if (!isAccountsEnabled()) return;
  try {
    await supabaseServer()
      .from("pubmed_marker_cache")
      .upsert(
        { marker_key: key, marker_label: label, articles, fetched_at: new Date().toISOString() },
        { onConflict: "marker_key" }
      );
  } catch {
    /* caching is best-effort */
  }
}

// ── Relevance notes — one Anthropic call per marker, grounded ONLY in the
// abstracts returned by PubMed. Articles without an abstract get no note. ────
async function addRelevanceNotes(
  marker: string,
  direction: Direction,
  articles: PubMedArticle[],
  languageName: string
): Promise<RelatedArticle[]> {
  const base: RelatedArticle[] = articles.map((a) => ({
    pmid: a.pmid,
    title: a.title,
    journal: a.journal,
    year: a.year,
    pubType: a.pubType,
    url: a.url,
  }));

  const withAbstracts = articles.filter((a) => a.abstract && a.abstract.length > 40);
  if (withAbstracts.length === 0) return base;

  const dirWord = direction === "high" ? "elevated" : direction === "low" ? "low" : "abnormal";
  const blocks = withAbstracts
    .map((a) => `PMID ${a.pmid}\nTitle: ${a.title}\nAbstract: ${a.abstract}`)
    .join("\n\n---\n\n");

  const prompt = `A patient has a ${dirWord} ${marker} on their lab report. For each article below, write ONE short plain-language sentence explaining how the article relates to a ${dirWord} ${marker} — written for a worried patient, in ${languageName}.

STRICT RULES:
- Ground each sentence ONLY in that article's abstract text below. Do not add facts not present in the abstract.
- Do not give medical advice or imply a diagnosis.
- If an abstract does not actually relate to ${marker}, return an empty string for that PMID.
- Return ONLY valid JSON, no markdown: an object mapping PMID string → one-sentence note string.

${blocks}`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 700,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = response.content[0].type === "text" ? response.content[0].text : "{}";
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const notes = JSON.parse(cleaned) as Record<string, string>;
    for (const article of base) {
      const note = notes[article.pmid];
      if (typeof note === "string" && note.trim().length > 0) article.note = note.trim();
    }
  } catch (err) {
    console.error(`[related-studies] relevance notes failed for "${marker}" (continuing without):`, err);
  }
  return base;
}

async function processMarker(marker: string, direction: Direction, lang: string): Promise<MarkerGroup | null> {
  const key = normalizeKey(marker, direction, lang);

  const cached = await readCache(key);
  if (cached) {
    return cached.length > 0 ? { marker, direction, articles: cached } : null;
  }

  const terms = await resolveSearchTerms(marker, direction);
  if (!terms) return null;

  const articles = await searchArticles(terms, { retmax: ARTICLES_PER_MARKER, withAbstracts: true });
  const languageName = LANGUAGE_NAMES[lang] || "English";
  const withNotes = await addRelevanceNotes(marker, direction, articles, languageName);

  // Cache even empty results to avoid re-hitting NCBI for markers with no hits.
  await writeCache(key, marker, withNotes);

  return withNotes.length > 0 ? { marker, direction, articles: withNotes } : null;
}

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "ai-heavy");
  if (_rl) return _rl;
  try {
    const { flags, lang } = (await request.json()) as { flags?: Flag[]; lang?: string };
    const language = (lang && LANGUAGE_NAMES[lang]) ? lang : "en";

    if (!Array.isArray(flags)) {
      return NextResponse.json({ groups: [] });
    }

    // Only abnormal markers, deduped by normalized name (first occurrence wins).
    const seen = new Set<string>();
    const abnormal: Array<{ marker: string; direction: Direction }> = [];
    for (const f of flags) {
      if (!f?.marker || f.status === "normal") continue;
      const norm = f.marker.trim().toLowerCase();
      if (seen.has(norm)) continue;
      seen.add(norm);
      abnormal.push({ marker: f.marker.trim(), direction: f.status as Direction });
      if (abnormal.length >= MAX_MARKERS) break;
    }

    if (abnormal.length === 0) {
      return NextResponse.json({ groups: [] });
    }

    const results = await Promise.all(
      abnormal.map((m) => processMarker(m.marker, m.direction, language))
    );
    const groups = results.filter((g): g is MarkerGroup => g !== null);

    return NextResponse.json({ groups });
  } catch (err) {
    console.error("[related-studies] route error:", err);
    // Never break the results page — return empty rather than an error status.
    return NextResponse.json({ groups: [] });
  }
}
