// ── PubMed E-utilities service (server-side only) ──────────────────────────
// Queries NCBI's E-utilities for REAL peer-reviewed articles. The LLM is never
// a source of citations — every article returned here resolves to a live
// PubMed page. All functions degrade gracefully: on any error or empty result
// they return an empty array and never throw to the caller.
//
// NCBI rate limits unauthenticated callers to 3 requests/second. We serialise
// requests through a tiny throttle. Setting NCBI_API_KEY (added to the query
// string when present) lifts the limit to 10 req/sec — the throttle interval
// adjusts automatically.

const EUTILS_BASE = "https://eutils.ncbi.nlm.nih.gov/entrez/eutils";
const NCBI_API_KEY = process.env.NCBI_API_KEY;

// Min gap between requests. 3 req/s → ~334ms; with a key, 10 req/s → ~110ms.
const MIN_REQUEST_GAP_MS = NCBI_API_KEY ? 110 : 350;
const REQUEST_TIMEOUT_MS = 8000;

export type ArticleType = "meta-analysis" | "guideline" | "systematic-review" | "other";

export interface PubMedArticle {
  pmid: string;
  title: string;
  journal: string;
  year: string | null;
  pubType: ArticleType;
  url: string;
  abstract?: string;
}

interface SearchOptions {
  // PubMed publication-type filters to AND into the query. Defaults to the
  // high-evidence set: meta-analyses, practice guidelines, systematic reviews.
  types?: string[];
  retmax?: number;
  // Whether to fetch abstracts (extra efetch call). Needed for relevance notes.
  withAbstracts?: boolean;
}

const DEFAULT_TYPES = ["meta-analysis[pt]", "practice guideline[pt]", "systematic review[pt]"];

// ── Throttle ────────────────────────────────────────────────────────────────
// Serialises all outbound NCBI calls so we never exceed the rate limit, even
// across concurrent requests within the same server instance.
let lastRequestAt = 0;
let chain: Promise<void> = Promise.resolve();

async function throttledFetch(url: string): Promise<Response> {
  const run = chain.then(async () => {
    const wait = MIN_REQUEST_GAP_MS - (Date.now() - lastRequestAt);
    if (wait > 0) await new Promise((r) => setTimeout(r, wait));
    lastRequestAt = Date.now();
  });
  // Keep the chain alive even if this link rejects.
  chain = run.catch(() => {});
  await run;

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    return await fetch(url, { signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function withKey(params: URLSearchParams): URLSearchParams {
  if (NCBI_API_KEY) params.set("api_key", NCBI_API_KEY);
  params.set("tool", "meridix-labs");
  return params;
}

function classifyPubType(pubTypes: string[]): ArticleType {
  const lower = pubTypes.map((p) => p.toLowerCase());
  if (lower.some((p) => p.includes("meta-analysis"))) return "meta-analysis";
  if (lower.some((p) => p.includes("guideline"))) return "guideline";
  if (lower.some((p) => p.includes("systematic review"))) return "systematic-review";
  return "other";
}

// ── esearch → PMIDs ───────────────────────────────────────────────────────
async function esearch(terms: string, types: string[], retmax: number): Promise<string[]> {
  const typeFilter = types.length > 0 ? ` AND (${types.join(" OR ")})` : "";
  const query = `(${terms})${typeFilter}`;
  const params = withKey(
    new URLSearchParams({
      db: "pubmed",
      retmode: "json",
      sort: "relevance",
      retmax: String(retmax),
      term: query,
    })
  );
  const res = await throttledFetch(`${EUTILS_BASE}/esearch.fcgi?${params.toString()}`);
  if (!res.ok) return [];
  const json = (await res.json()) as { esearchresult?: { idlist?: string[] } };
  return json.esearchresult?.idlist ?? [];
}

// ── esummary → article metadata ─────────────────────────────────────────────
async function esummary(pmids: string[]): Promise<PubMedArticle[]> {
  if (pmids.length === 0) return [];
  const params = withKey(
    new URLSearchParams({
      db: "pubmed",
      retmode: "json",
      id: pmids.join(","),
    })
  );
  const res = await throttledFetch(`${EUTILS_BASE}/esummary.fcgi?${params.toString()}`);
  if (!res.ok) return [];
  const json = (await res.json()) as {
    result?: Record<string, unknown> & { uids?: string[] };
  };
  const result = json.result;
  if (!result?.uids) return [];

  const articles: PubMedArticle[] = [];
  for (const pmid of result.uids) {
    const doc = result[pmid] as
      | {
          title?: string;
          fulljournalname?: string;
          source?: string;
          pubdate?: string;
          pubtype?: string[];
        }
      | undefined;
    if (!doc?.title) continue;
    const year = doc.pubdate ? (doc.pubdate.match(/\d{4}/)?.[0] ?? null) : null;
    articles.push({
      pmid,
      title: doc.title.replace(/\.$/, ""),
      journal: doc.fulljournalname || doc.source || "",
      year,
      pubType: classifyPubType(doc.pubtype ?? []),
      url: `https://pubmed.ncbi.nlm.nih.gov/${pmid}/`,
    });
  }
  return articles;
}

// ── efetch → abstracts ──────────────────────────────────────────────────────
// efetch with rettype=abstract returns plain text blocks. We map them back to
// PMIDs by issuing one fetch per batch and parsing the text. To keep it simple
// and robust, we request abstracts for the specific PMIDs and split on the
// record separator NCBI emits between articles.
async function fetchAbstracts(pmids: string[]): Promise<Record<string, string>> {
  if (pmids.length === 0) return {};
  const params = withKey(
    new URLSearchParams({
      db: "pubmed",
      rettype: "abstract",
      retmode: "xml",
      id: pmids.join(","),
    })
  );
  const res = await throttledFetch(`${EUTILS_BASE}/efetch.fcgi?${params.toString()}`);
  if (!res.ok) return {};
  const xml = await res.text();
  return parseAbstractsXml(xml);
}

// Minimal, dependency-free XML extraction: pull each <PubmedArticle> block,
// read its PMID and concatenate AbstractText segments. Robust to missing
// abstracts (returns no entry for that PMID).
function parseAbstractsXml(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  const articleBlocks = xml.split(/<PubmedArticle>/).slice(1);
  for (const block of articleBlocks) {
    const pmidMatch = block.match(/<PMID[^>]*>(\d+)<\/PMID>/);
    if (!pmidMatch) continue;
    const pmid = pmidMatch[1];
    const abstractParts = [...block.matchAll(/<AbstractText[^>]*>([\s\S]*?)<\/AbstractText>/g)].map(
      (m) => decodeXmlEntities(stripTags(m[1])).trim()
    );
    const abstract = abstractParts.filter(Boolean).join(" ").trim();
    if (abstract) out[pmid] = abstract;
  }
  return out;
}

function stripTags(s: string): string {
  return s.replace(/<[^>]+>/g, "");
}

function decodeXmlEntities(s: string): string {
  return s
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&amp;/g, "&");
}

// ── Public API ────────────────────────────────────────────────────────────
export async function searchArticles(terms: string, options: SearchOptions = {}): Promise<PubMedArticle[]> {
  const { types = DEFAULT_TYPES, retmax = 5, withAbstracts = true } = options;
  if (!terms.trim()) return [];
  try {
    const pmids = await esearch(terms, types, retmax);
    if (pmids.length === 0) return [];

    const articles = await esummary(pmids);
    if (articles.length === 0) return [];

    if (withAbstracts) {
      const abstracts = await fetchAbstracts(articles.map((a) => a.pmid));
      for (const a of articles) {
        if (abstracts[a.pmid]) a.abstract = abstracts[a.pmid];
      }
    }
    return articles;
  } catch (err) {
    console.error("[pubmed] searchArticles failed (returning empty):", err);
    return [];
  }
}
