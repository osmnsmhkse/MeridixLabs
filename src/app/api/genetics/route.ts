import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import Anthropic from "@anthropic-ai/sdk";
import { IDENTITY_CONFIDENTIALITY } from "@/lib/toolChatConfig";
import {
  VARIANT_CATALOG,
  SIGNIFICANCE_LABEL,
  type Significance,
} from "@/lib/genetics/variants";
import { parseRawDna, type MatchedSnp } from "@/lib/genetics/parseRawDna";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  es: "Spanish",
  tr: "Turkish",
  fr: "French",
  de: "German",
  ar: "Arabic",
  ja: "Japanese",
  pt: "Portuguese",
  it: "Italian",
  zh: "Simplified Chinese",
};

type Tier = "simple" | "medium" | "expert";

const TIER_INSTRUCTIONS: Record<Tier, string> = {
  simple:
    "DEPTH: SIMPLE. Plain, everyday language. Skip rsID notation. Frame each gene in lay terms (e.g. \"this gene helps your body process folate\"). Reassuring tone for benign / common variants, calm-but-serious tone for clinically significant findings. No medical jargon — and if a clinical term is unavoidable, immediately explain it in everyday words on the same line.",
  medium:
    "DEPTH: MEDIUM. Add the gene name and the common variant name. Explain the biochemical pathway in accessible terms. Include effect-size estimates where the research supports them (e.g. \"about a 3-fold relative increase in clotting risk, on a low absolute baseline\"). Treat the reader as an informed adult who reads health articles.",
  expert:
    "DEPTH: EXPERT. Use full notation — rsID, gene symbol, HGVS c. and p. nomenclature where applicable. Discuss penetrance, allele frequency in relevant populations, GWAS evidence quality, and where the variant sits in the ACMG framework. Treat the reader as a clinician, genetic counselor, or highly health-literate patient.",
};

// Curated catalog snippet fed to the model so its baseline knowledge of the
// well-studied variants is grounded in our editorial line (matched effect
// size, the appropriate misconception correction, etc.).
function buildCatalogReference(): string {
  return VARIANT_CATALOG.map(
    (v) =>
      `- ${v.rsid} | ${v.gene} | ${v.commonName} | category=${v.category} | significance=${SIGNIFICANCE_LABEL[v.significance]} | ${v.description}${v.misconception ? `  MISCONCEPTION: ${v.misconception}` : ""}`,
  ).join("\n");
}

function summarizeExtractedSnps(matched: MatchedSnp[]): string {
  if (matched.length === 0) return "(No matching SNPs were found in the curated catalog.)";
  return matched
    .map((m) => `- ${m.rsid} (${m.variant.gene} ${m.variant.commonName}): genotype ${m.genotype} on chr${m.chromosome}:${m.position}`)
    .join("\n");
}

function buildSystemPrompt(
  tier: Tier,
  langCode: string,
  context: string,
  extractedSummary: string | null,
  sourceLabel: string | null,
): string {
  const langName = LANGUAGE_NAMES[langCode] ?? "English";
  const langInstruction =
    langCode !== "en"
      ? `\n\nLANGUAGE: Write all human-facing content in ${langName}. Field names in the JSON response and the ACMG terminology stay in English; everything else (descriptions, plain-language explanations, recommendations) must be translated.`
      : "";

  const extractedBlock = extractedSummary
    ? `\n\nThe user uploaded a raw DNA file from ${sourceLabel ?? "a consumer testing company"}. We parsed it server-side and extracted only the clinically-relevant variants below. Treat these as the ground truth for what the user has tested for — do NOT speculate about variants they did not provide.\n\nEXTRACTED VARIANTS:\n${extractedSummary}`
    : "";

  const userContext = context
    ? `\n\nUSER CONTEXT (provided by the user as relevant background): ${context}`
    : "";

  return `You are Meridix Labs' Genetic Test Explainer — a careful, calibrated educator who helps people understand what their genetic test results actually mean.

You are NOT a diagnostic tool. You are NOT a substitute for a genetic counselor or physician. You explain genetic information at an appropriate depth so the person can have a more informed conversation with a qualified professional.

${TIER_INSTRUCTIONS[tier]}

CATEGORIZATION RULES — the FIRST thing you must do internally:

1. CONSUMER DNA tests (23andMe, AncestryDNA, MyHeritage) — these use genotyping chips. Findings are mostly about common variants with modest effect sizes (MTHFR, ACTN3, caffeine metabolism, lactose tolerance, mild disease risk, ancestry traits). TONE: educational, curious, non-alarming. Most findings are interesting, not actionable. Reframe wellness-industry hype with accurate research.

2. CLINICAL genetic tests (Invitae, Color, GeneDx, Natera, Myriad, Ambry, Prevention Genetics) — these use proper sequencing. Findings can include BRCA1/2 pathogenic variants, Lynch syndrome, hereditary cardiomyopathy, pharmacogenomic variants. TONE: serious, careful, strongly directive about seeing a genetic counselor for ANY pathogenic or likely pathogenic variant.

3. SINGLE-VARIANT query — the user pasted one variant or SNP they want explained. Identify which of the two categories above the variant belongs to and tone accordingly.

CRITICAL BEHAVIORAL CONSTRAINTS:
- NEVER tell the user they "have" or "don't have" a disease based on a single variant. Variants confer risk probabilistically; disease is multifactorial.
- For pathogenic or likely pathogenic findings in cancer-predisposition, cardiac, or neurological genes: ALWAYS strongly recommend a board-certified genetic counselor before any clinical action. Do not minimize. Do not soften.
- For minor common variants (MTHFR, COMT, OXTR, etc.): be EXPLICIT about how much the consumer-wellness narrative has inflated their importance. The internet noise around MTHFR is the canonical example — correct it directly without scolding the user for asking.
- Distinguish "this variant is associated with [condition] in research studies" from "this variant causes [condition]." Use the former phrasing.
- For BRCA findings on 23andMe specifically: emphasize that 23andMe only tests three Ashkenazi-Jewish founder variants out of thousands of known BRCA variants. A NEGATIVE 23andMe BRCA result does NOT rule out a clinically significant BRCA pathogenic variant. Anyone with relevant family history needs clinical sequencing through a genetic counselor.
- NEVER recommend supplements, lifestyle interventions, or specific medications based on genetic findings. Always defer to a genetic counselor or physician.
- If the input is ambiguous or appears non-genetic (e.g. lab results, a symptom description), set "category" to "non_genetic" and explain in summary_headline that the tool expected a genetic test result.${userContext}${extractedBlock}

GROUND-TRUTH CATALOG. Use this as your reference for the well-studied variants. Match your editorial line to these descriptions; do not invent novel effect sizes that contradict them. If a variant the user asks about is not in this catalog, draw on the standard published literature and clearly indicate when evidence is weaker.

${buildCatalogReference()}

OUTPUT FORMAT — return ONLY valid JSON, no markdown fences, no commentary. Schema:

{
  "category": "consumer" | "clinical" | "single_variant" | "non_genetic",
  "test_source_guess": "23andMe" | "AncestryDNA" | "MyHeritage" | "Invitae" | "Color" | "GeneDx" | "Natera" | "Myriad" | "Ambry" | "Unknown" | "N/A",
  "summary_headline": "One or two sentences. The single most important takeaway. Match tone to the highest-significance finding.",
  "overall_significance": "benign" | "likely_benign" | "modest_effect" | "moderate_effect" | "vus" | "likely_pathogenic" | "pathogenic",
  "variants": [
    {
      "identification": "Gene name + variant name + genotype, depth-appropriate. e.g. 'MTHFR C677T, heterozygous (one copy of the T variant)' for simple, 'MTHFR c.665C>T (p.Ala222Val); rs1801133; heterozygous C/T' for expert.",
      "what_it_does": "What the gene normally does and what this specific variant changes about that function. Depth-appropriate.",
      "clinical_significance": "Be explicit. For clinical variants, use ACMG categories (Benign / Likely Benign / VUS / Likely Pathogenic / Pathogenic). For consumer findings, frame effect size: 'slightly increases risk' vs. 'meaningfully increases risk' vs. 'highly penetrant for [condition]'.",
      "what_this_means_for_you": "The practical 'so what.' For benign / minor: reassuring context. For serious: clear next steps and strong encouragement to see a genetic counselor.",
      "misconceptions": "Address the most common misunderstandings about this specific variant. Be direct without being condescending.",
      "tier": "benign" | "likely_benign" | "modest_effect" | "moderate_effect" | "vus" | "likely_pathogenic" | "pathogenic"
    }
  ],
  "common_misconceptions": "Overall misconceptions about this kind of result (the category as a whole, not just one variant). 2-4 sentences.",
  "questions_for_doctor": ["3-5 specific questions tailored to the actual findings. Not generic — reference the specific variant(s) by name."],
  "counselor_recommendation": {
    "tier": "not_needed" | "discuss" | "strongly_recommended",
    "reasoning": "Short paragraph explaining the reasoning for the recommendation level. For pathogenic / likely pathogenic findings this MUST be 'strongly_recommended' and the reasoning must say so plainly.",
    "resource_text": "One sentence pointing the user to findageneticcounselor.org (the National Society of Genetic Counselors directory) for any 'discuss' or 'strongly_recommended' recommendation. Omit or leave brief for 'not_needed'."
  },
  "brca_23andme_caveat": "ONLY include this field as a non-empty string if the result involves BRCA1 or BRCA2 from a 23andMe-style consumer test. State that 23andMe only tests three founder variants and a 'negative' consumer-chip result does NOT rule out BRCA pathogenic variants — clinical sequencing through a genetic counselor is required for anyone with relevant family history. Omit (or leave empty) otherwise."
}

Be accurate, calibrated, and never alarmist for benign findings or minimizing for serious ones. Be the careful colleague who happens to know genetics very well — not the over-eager consumer wellness blog and not the dismissive clinician.${langInstruction}`;
}

const ALLOWED_FILE_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "text/plain",
  "text/csv",
  "application/octet-stream",
];

// Larger ceiling than the other tools — raw 23andMe text files commonly run
// 15-50MB. Reports (PDF/image) still get the standard 10MB treatment via the
// same code path; we just don't reject raw text files above 10MB.
const MAX_RAW_DNA_SIZE = 60 * 1024 * 1024;
const MAX_REPORT_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "ai-heavy");
  if (_rl) return _rl;
  try {
    const formData = await request.formData();
    const mode = (formData.get("mode") as string) || "paste";
    const langCode = (formData.get("language") as string) || "en";
    const tierRaw = (formData.get("tier") as string) || "medium";
    const tier: Tier = tierRaw === "simple" || tierRaw === "expert" ? tierRaw : "medium";
    const text = ((formData.get("text") as string) || "").trim();
    const context = ((formData.get("context") as string) || "").trim().slice(0, 1000);
    const file = formData.get("file") as File | null;

    // ── Mode: paste ──────────────────────────────────────────────────────────
    if (mode === "paste") {
      if (!text || text.length < 2) {
        return NextResponse.json(
          { error: "Please paste a variant or SNP to explain.", errorCode: "NO_INPUT" },
          { status: 400 },
        );
      }
      const systemPrompt = buildSystemPrompt(tier, langCode, context, null, null);
      const userMessage = `Please explain this genetic variant or finding:\n\n${text.slice(0, 4000)}`;
      return await callClaude(systemPrompt, [{ type: "text", text: userMessage }]);
    }

    // ── Mode: report (PDF / image of a clinical or consumer report) ─────────
    if (mode === "report") {
      if (!file) {
        return NextResponse.json(
          { error: "Please upload your genetic test report.", errorCode: "NO_INPUT" },
          { status: 400 },
        );
      }
      if (!ALLOWED_FILE_TYPES.includes(file.type) && !file.name.match(/\.(pdf|png|jpe?g|webp)$/i)) {
        return NextResponse.json(
          { error: "Unsupported file type. Please upload a PDF or image.", errorCode: "WRONG_FILE_TYPE" },
          { status: 400 },
        );
      }
      if (file.size > MAX_REPORT_SIZE) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return NextResponse.json(
          { error: "Report file too large.", errorCode: "FILE_TOO_LARGE", fileSizeMB },
          { status: 400 },
        );
      }

      const buf = await file.arrayBuffer();
      const base64 = Buffer.from(buf).toString("base64");
      const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);

      const block: Anthropic.ContentBlockParam = isPdf
        ? ({
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64 },
          } as Anthropic.DocumentBlockParam)
        : ({
            type: "image",
            source: {
              type: "base64",
              media_type: (file.type || "image/png") as
                | "image/jpeg"
                | "image/png"
                | "image/gif"
                | "image/webp",
              data: base64,
            },
          } as Anthropic.ImageBlockParam);

      const systemPrompt = buildSystemPrompt(tier, langCode, context, null, null);
      const promptText =
        "Please analyze this genetic test report. Auto-detect whether it's from a consumer DNA testing company or a clinical genetic testing lab and calibrate your tone accordingly.";

      return await callClaude(systemPrompt, [block, { type: "text", text: promptText }]);
    }

    // ── Mode: raw (raw DNA data file from 23andMe / Ancestry / MyHeritage) ──
    if (mode === "raw") {
      if (!file) {
        return NextResponse.json(
          { error: "Please upload your raw DNA data file.", errorCode: "NO_INPUT" },
          { status: 400 },
        );
      }
      if (file.size > MAX_RAW_DNA_SIZE) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return NextResponse.json(
          { error: "Raw DNA file too large.", errorCode: "FILE_TOO_LARGE", fileSizeMB },
          { status: 400 },
        );
      }

      // We accept .txt and .csv only. ZIP support is a planned follow-up.
      const isZip = /\.zip$/i.test(file.name) || file.type === "application/zip";
      if (isZip) {
        return NextResponse.json(
          {
            error:
              "ZIP files aren't supported yet. Please unzip your 23andMe / Ancestry / MyHeritage download and upload the .txt or .csv file inside.",
            errorCode: "ZIP_NOT_SUPPORTED",
          },
          { status: 400 },
        );
      }

      const text = await file.text();
      const parsed = parseRawDna(text);

      if (parsed.matched.length === 0) {
        return NextResponse.json(
          {
            error:
              parsed.source === "unknown"
                ? "We couldn't recognize this as a 23andMe, AncestryDNA, or MyHeritage raw data file."
                : "No variants from our curated catalog were found in this file.",
            errorCode: parsed.source === "unknown" ? "UNRECOGNIZED_FORMAT" : "NO_VARIANTS_FOUND",
          },
          { status: 422 },
        );
      }

      const sourceLabel =
        parsed.source === "23andme" ? "23andMe"
        : parsed.source === "ancestrydna" ? "AncestryDNA"
        : parsed.source === "myheritage" ? "MyHeritage"
        : "an unrecognized consumer DNA testing service";

      const systemPrompt = buildSystemPrompt(
        tier,
        langCode,
        context,
        summarizeExtractedSnps(parsed.matched),
        sourceLabel,
      );
      const promptText = `Please interpret this user's raw consumer-DNA data. Source: ${sourceLabel}. ${parsed.matched.length} variants from our curated catalog were extracted (see the SYSTEM prompt). Walk through each one with the appropriate calibration and tone.`;

      return await callClaude(systemPrompt, [{ type: "text", text: promptText }]);
    }

    return NextResponse.json(
      { error: "Invalid mode.", errorCode: "NO_INPUT" },
      { status: 400 },
    );
  } catch (error) {
    return handleApiError(error);
  }
}

async function callClaude(
  systemPrompt: string,
  content: Anthropic.MessageParam["content"],
): Promise<NextResponse> {
  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 4000,
    system: systemPrompt + IDENTITY_CONFIDENTIALITY,
    messages: [{ role: "user", content }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "";

  type VariantBlock = {
    identification: string;
    what_it_does: string;
    clinical_significance: string;
    what_this_means_for_you: string;
    misconceptions: string;
    tier: Significance;
  };
  type Parsed = {
    category: "consumer" | "clinical" | "single_variant" | "non_genetic";
    test_source_guess?: string;
    summary_headline: string;
    overall_significance: Significance;
    variants: VariantBlock[];
    common_misconceptions?: string;
    questions_for_doctor?: string[];
    counselor_recommendation: {
      tier: "not_needed" | "discuss" | "strongly_recommended";
      reasoning: string;
      resource_text?: string;
    };
    brca_23andme_caveat?: string;
  };

  let parsed: Parsed;
  try {
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();
    parsed = JSON.parse(cleaned) as Parsed;
  } catch {
    return NextResponse.json(
      { error: "Could not parse the AI response. Please try again.", errorCode: "SERVER_ERROR" },
      { status: 502 },
    );
  }

  if (parsed.category === "non_genetic") {
    return NextResponse.json(
      {
        error:
          "This doesn't look like a genetic test result. Try pasting a specific variant (e.g. \"MTHFR C677T heterozygous\") or uploading a report from a DNA testing company.",
        errorCode: "NON_GENETIC",
      },
      { status: 422 },
    );
  }

  return NextResponse.json({ success: true, data: parsed });
}

function handleApiError(error: unknown): NextResponse {
  if (error instanceof Anthropic.APIError) {
    const message = error.message ?? "";
    if (message.toLowerCase().includes("credit balance is too low")) {
      return NextResponse.json(
        { error: "AI service temporarily unavailable.", errorCode: "SERVER_ERROR" },
        { status: 503 },
      );
    }
    if (error.status === 401) {
      return NextResponse.json(
        { error: "AI service configuration error.", errorCode: "SERVER_ERROR" },
        { status: 500 },
      );
    }
    if (error.status === 429) {
      return NextResponse.json(
        { error: "Too many requests. Please try again shortly.", errorCode: "SERVER_ERROR" },
        { status: 429 },
      );
    }
    if (error.status && error.status >= 500) {
      return NextResponse.json(
        { error: "AI service error.", errorCode: "SERVER_ERROR" },
        { status: 503 },
      );
    }
  }
  return NextResponse.json(
    { error: "Something went wrong. Please try again.", errorCode: "SERVER_ERROR" },
    { status: 500 },
  );
}
