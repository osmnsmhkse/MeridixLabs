// Server-side parser for raw DNA data exports from the major consumer testing
// companies (23andMe, AncestryDNA, MyHeritage). These files are typically
// 15-50MB and contain hundreds of thousands of SNP rows — we never want to
// send the whole thing to the model. Instead we walk the file line-by-line
// and keep only rows whose rsID appears in our curated WATCH_RSIDS set.

import { WATCH_RSIDS, VARIANT_BY_RSID, type VariantDef } from "./variants";

export type RawDnaSource = "23andme" | "ancestrydna" | "myheritage" | "unknown";

export interface MatchedSnp {
  rsid: string;
  chromosome: string;
  position: string;
  genotype: string; // e.g. "CT", "AA", "--"
  variant: VariantDef; // catalog entry for prompt grounding
}

export interface ParseResult {
  source: RawDnaSource;
  totalRows: number;
  matched: MatchedSnp[];
  // First ~1000 chars of the raw header — useful if the model needs to see
  // the export's own version/date metadata to confirm provenance.
  headerExcerpt: string;
}

// Detect source from the leading comment block.
function detectSource(headerText: string): RawDnaSource {
  const lower = headerText.toLowerCase();
  if (lower.includes("23andme")) return "23andme";
  if (lower.includes("ancestrydna") || lower.includes("ancestry.com")) return "ancestrydna";
  if (lower.includes("myheritage")) return "myheritage";
  return "unknown";
}

// 23andMe / Ancestry / MyHeritage formats are all tab- or comma-separated with
// columns: rsid, chromosome, position, genotype. Comment lines start with "#".
// We parse defensively — any row with a recognizable rsID + 2-letter genotype
// is kept.
export function parseRawDna(text: string): ParseResult {
  const headerExcerpt = text.slice(0, 1000);
  const source = detectSource(headerExcerpt);

  const matched: MatchedSnp[] = [];
  let totalRows = 0;

  // Split on any newline. For very large files this is still memory-bound,
  // but the API route already guards on a per-route size ceiling.
  const lines = text.split(/\r?\n/);

  for (const line of lines) {
    if (!line || line[0] === "#") continue;
    totalRows++;

    // Try tab-separated first (23andMe + Ancestry), then comma (MyHeritage).
    let cols = line.split("\t");
    if (cols.length < 4) cols = line.split(",");
    if (cols.length < 4) continue;

    const rsid = cols[0].trim().replace(/^"|"$/g, "");
    if (!rsid.startsWith("rs")) continue;
    if (!WATCH_RSIDS.has(rsid)) continue;

    const chromosome = cols[1].trim().replace(/^"|"$/g, "");
    const position = cols[2].trim().replace(/^"|"$/g, "");
    const genotype = cols[3].trim().replace(/^"|"$/g, "").toUpperCase();

    const variant = VARIANT_BY_RSID.get(rsid);
    if (!variant) continue;

    matched.push({ rsid, chromosome, position, genotype, variant });
  }

  return { source, totalRows, matched, headerExcerpt };
}
