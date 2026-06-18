// ── Marker → PubMed search-term mapping (server-side) ──────────────────────
// Converts a lab marker (+ abnormal direction) into PubMed search terms. Common
// markers use a curated static map; anything unmapped falls back to a single
// Anthropic call that produces 1–3 concise MeSH-style phrases. Fallback results
// are cached in-process so the same marker is never sent to the LLM twice
// within a server instance's lifetime.
//
// NOTE: the LLM only ever produces SEARCH TERMS here — never citations. Every
// article shown to the user comes from the live PubMed query these terms drive.

import Anthropic from "@anthropic-ai/sdk";
import { IDENTITY_CONFIDENTIALITY } from "./toolChatConfig";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export type Direction = "high" | "low" | "normal";

// Canonical marker names match the English names the analyze prompt emits.
// Keys are lowercased for lookup. Values are PubMed-friendly query strings.
const STATIC_MAP: Record<string, string> = {
  "ldl cholesterol": "LDL cholesterol cardiovascular risk",
  "ldl": "LDL cholesterol cardiovascular risk",
  "hdl cholesterol": "HDL cholesterol cardiovascular",
  "total cholesterol": "hypercholesterolemia cardiovascular risk",
  "triglycerides": "hypertriglyceridemia cardiovascular",
  "hba1c": "glycemic control diabetes",
  "glucose": "fasting glucose impaired glucose tolerance",
  "insulin": "insulin resistance metabolic syndrome",
  "tsh": "thyroid dysfunction hypothyroidism",
  "free t4": "thyroid hormone dysfunction",
  "free t3": "thyroid hormone dysfunction",
  "ferritin": "iron deficiency ferritin",
  "iron": "iron deficiency anemia",
  "hemoglobin": "anemia hemoglobin",
  "hematocrit": "anemia",
  "vitamin d": "vitamin D deficiency supplementation",
  "vitamin b12": "vitamin B12 deficiency",
  "folate": "folate deficiency",
  "creatinine": "chronic kidney disease renal function",
  "bun": "renal function blood urea nitrogen",
  "egfr": "chronic kidney disease glomerular filtration",
  "alt": "elevated liver enzymes hepatic",
  "ast": "elevated liver enzymes hepatic",
  "ggt": "gamma-glutamyl transferase liver",
  "alkaline phosphatase": "alkaline phosphatase liver bone",
  "bilirubin": "hyperbilirubinemia liver",
  "albumin": "hypoalbuminemia",
  "uric acid": "hyperuricemia gout",
  "crp": "C-reactive protein inflammation",
  "sodium": "hyponatremia electrolyte",
  "potassium": "hyperkalemia hypokalemia electrolyte",
  "calcium": "calcium disorder hypercalcemia hypocalcemia",
  "magnesium": "magnesium deficiency",
  "platelets": "thrombocytopenia thrombocytosis",
  "testosterone": "testosterone deficiency hypogonadism",
  "psa": "prostate specific antigen screening",
  "cortisol": "cortisol adrenal dysfunction",
};

const fallbackCache = new Map<string, string[]>();

function normalize(marker: string): string {
  return marker.trim().toLowerCase().replace(/\s+/g, " ");
}

// Generate MeSH-style phrases for an unmapped marker. Returns [] on any failure
// so the caller can simply skip that marker — never throws.
async function generateTerms(marker: string, direction: Direction): Promise<string[]> {
  const cacheKey = `${normalize(marker)}|${direction}`;
  const cached = fallbackCache.get(cacheKey);
  if (cached) return cached;

  const dirWord = direction === "high" ? "elevated" : direction === "low" ? "low" : "abnormal";
  const prompt = `You generate PubMed search phrases. A lab marker named "${marker}" is ${dirWord} on a patient's report.
Return 1–3 concise MeSH-style search phrases that would surface meta-analyses, clinical guidelines, and systematic reviews relevant to this finding. Use standard clinical terminology. Do NOT invent article titles or citations — only search phrases.
Return ONLY a JSON array of strings, no markdown. Example: ["phrase one", "phrase two"]`;

  try {
    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 200,
      system: IDENTITY_CONFIDENTIALITY,
      messages: [{ role: "user", content: prompt }],
    });
    const raw = response.content[0].type === "text" ? response.content[0].text : "[]";
    const cleaned = raw
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) return [];
    const terms = parsed.filter((t): t is string => typeof t === "string" && t.trim().length > 0).slice(0, 3);
    fallbackCache.set(cacheKey, terms);
    return terms;
  } catch (err) {
    console.error(`[markerSearchTerms] fallback generation failed for "${marker}":`, err);
    return [];
  }
}

// Resolve a marker to a single PubMed query string. Static map wins; otherwise
// fall back to the LLM. Returns null when nothing usable could be produced.
export async function resolveSearchTerms(marker: string, direction: Direction): Promise<string | null> {
  const key = normalize(marker);
  if (STATIC_MAP[key]) return STATIC_MAP[key];

  const generated = await generateTerms(marker, direction);
  if (generated.length === 0) return null;
  return generated.join(" OR ");
}
