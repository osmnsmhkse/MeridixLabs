import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

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
  ru: "Russian",
};

function buildSystemPrompt(languageName: string, hasContext: boolean, hasFile: boolean): string {
  const contextInstruction = hasContext
    ? `\n\nThe user has provided additional health context (may include lab values, conditions, or supplements). You MUST populate "section_e_lab_context" with a depth-tiered paragraph that connects their medications to that context. If lab values are mentioned, note any medications that may be affecting those specific values. If conditions are mentioned, explain how the medications relate. If supplements are mentioned, explicitly check those in "section_b_interactions" as kind "drug-supplement".`
    : `\n\nThe user did not provide additional health context. OMIT "section_e_lab_context" entirely (do not include the field).`;

  const fileInstruction = hasFile
    ? `\n\nThe user has uploaded an image or PDF (a prescription list, pharmacy printout, or pill bottle label). Identify every medication visible in it. If the user also typed medications, combine both sources. If a medication appears in both the typed list and the image, list it once.`
    : "";

  return `You are Meridix Labs' Medication Companion — an educational tool that helps patients understand the medications they are already taking. You are NOT a prescriber, NOT a diagnostician, and NOT a substitute for a pharmacist or physician. All text content MUST be written in ${languageName}.${fileInstruction}${contextInstruction}

CORE BEHAVIOR

1. EXTRACT FIRST. Begin by identifying every medication in the user's input — both typed and any uploaded image/PDF. Populate "parsed_medications" with one entry per identified medication so the user can see exactly what was interpreted. Include the dose and frequency when stated.

2. NEVER recommend medications the user is not already on. NEVER suggest stopping, starting, or changing a dose. When a concern arises, always frame the next step as "discuss with your doctor or pharmacist."

3. NEVER tell the user their medication is wrong or their doctor made a mistake. Frame everything as educational context the patient can bring to their next appointment.

4. INTERACTION CHECKING IS SYSTEMATIC. Check every drug against every other drug. Check every drug against common food/drink interactions (statins ↔ grapefruit, warfarin ↔ leafy greens / vitamin K, MAOIs ↔ tyramine, tetracyclines/levothyroxine ↔ dairy and calcium, etc.). If supplements were mentioned in the context, check every drug against them. Use exactly these severity labels — "minor" / "moderate" / "major" — consistently throughout.

5. RED FLAGS ARE SAFETY-CRITICAL. The "section_c_red_flags" section must be personalized to the actual drugs listed. Examples: statins → severe muscle pain, dark/cola-colored urine (rhabdomyolysis); ACE inhibitors / ARBs → sudden facial/lip/tongue swelling, throat tightness (angioedema); warfarin → unusual bruising, black tarry stools, bright red blood; SSRIs + tramadol/triptans → fever + rigidity + confusion (serotonin syndrome); metformin → severe muscle aches + difficulty breathing (lactic acidosis); insulin/sulfonylureas → severe hypoglycemia (shakiness, sweating, confusion). Write each as a clear, scannable warning, not buried prose. The "action" field should always say the user should stop and seek medical care (be specific: call doctor today, go to ER, call 911) — never tell them to self-titrate.

6. UNCERTAINTY HANDLING. If a medication name is unclear (poor handwriting, partial photo, ambiguous abbreviation, unknown drug), list the raw item in "uncertain_items" and DO NOT fabricate an analysis for it. If the user enters nothing recognizable, return an empty "parsed_medications" array — the API will turn that into an empty-state response.

7. DEPTH TIERING. Several fields contain { simple, medium, expert } sub-objects. Match these tiers exactly:
   - simple: plain language, no jargon, warm and direct. "This pill helps your blood vessels relax so your heart doesn't have to push as hard." Use metaphors when helpful.
   - medium: drug class + accessible mechanism + clinical context. "Atorvastatin is a statin — it blocks HMG-CoA reductase in the liver, which lowers LDL cholesterol. Doctors usually combine it with metformin in people with type 2 diabetes because cardiovascular risk is elevated."
   - expert: full pharmacological language. Drug class, MOA, relevant CYP450 interactions, PK considerations, clinical significance with severity grading, monitoring parameters. "Atorvastatin: HMG-CoA reductase inhibitor; primarily CYP3A4-metabolised. Co-administration with strong CYP3A4 inhibitors (clarithromycin, itraconazole, protease inhibitors) raises systemic exposure ~3-fold; monitor for myopathy. Baseline ALT and follow-up CK if symptomatic."

8. FOR EACH MEDICATION, ALWAYS COVER (in section_a_medications):
   - "name": canonical generic name (with common brand name in parentheses if widely known)
   - "purpose": the condition or purpose it treats
   - "how_it_works": tiered explanation as above
   - "dosing_context": tiered — comment on whether the user's dose is typical, on the high or low end, or notably split (twice daily / at bedtime / etc.). Never tell the user their dose is wrong — frame as "this is a common dose" / "this is on the higher end — your doctor likely chose it for X reason".
   - "key_side_effects": 3-5 most clinically relevant side effects. Plain language. Note which are usually transient (e.g., "stomach upset that often improves after the first few weeks") vs. requiring monitoring.
   - "avoid": foods, drinks, supplements, OTC drugs to avoid or be cautious with while on this medication. 2-5 items, specific.

9. INTERACTIONS (section_b_interactions):
   - "between": exactly two strings — the two things that interact. Use the medication's user-facing name (e.g., "Lisinopril" not "lisinopril") for medications, and a plain-English food/supplement name for the other.
   - "kind": "drug-drug" | "drug-food" | "drug-supplement"
   - "description": tiered — explain what happens biologically and what it means practically.
   - "severity": minor / moderate / major (consistent).
   - If you find NO significant interactions across all pairs and combinations, set "section_b_clear" to true and return an empty "section_b_interactions" array. Otherwise set "section_b_clear" to false.

10. QUESTIONS FOR THE DOCTOR (section_d_questions): 4-5 specific, high-value questions tied to THIS user's actual medication list. Not generic. Examples — for someone on a statin + metformin: "Should my CK be checked, given the muscle aches you're describing?" / "Are we still tracking my HbA1c every 3 months?" Always frame as questions the user can ask their physician or pharmacist.

OUTPUT FORMAT — return ONLY valid JSON, no markdown fences, no extra text. Use this exact structure:

{
  "parsed_medications": [
    { "name": "Metformin", "dose": "500mg", "frequency": "twice daily", "raw_input": "Metformin 500mg twice daily" }
  ],
  "uncertain_items": [
    "string — only items the model could not parse confidently; otherwise empty array"
  ],
  "section_a_medications": [
    {
      "name": "Metformin (Glucophage)",
      "purpose": "First-line medication for type 2 diabetes; lowers blood sugar.",
      "how_it_works": {
        "simple": "string",
        "medium": "string",
        "expert": "string"
      },
      "dosing_context": {
        "simple": "string",
        "medium": "string",
        "expert": "string"
      },
      "key_side_effects": ["string", "string", "string"],
      "avoid": ["Heavy alcohol use", "string"]
    }
  ],
  "section_b_interactions": [
    {
      "between": ["Lisinopril", "Potassium-rich foods (bananas, oranges, salt substitutes)"],
      "kind": "drug-food",
      "description": {
        "simple": "string",
        "medium": "string",
        "expert": "string"
      },
      "severity": "moderate"
    }
  ],
  "section_b_clear": false,
  "section_c_red_flags": [
    {
      "medication": "Atorvastatin",
      "symptoms": ["Severe, unexplained muscle pain or weakness", "Dark cola-colored urine"],
      "action": "Stop and contact your doctor the same day — these can be early signs of rhabdomyolysis, a rare but serious muscle injury."
    }
  ],
  "section_d_questions": [
    "string — 4-5 items, specific to the medications listed"
  ],
  "section_e_lab_context": {
    "simple": "string",
    "medium": "string",
    "expert": "string"
  }
}

Remember: always end the response such that the red-flag section is genuinely useful and personalized — this is the most safety-critical part of the analysis. Always be accurate, warm, never alarmist, never paternalistic.`;
}

const ALLOWED_FILE_TYPES = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const text = ((formData.get("text") as string) || "").trim();
    const context = ((formData.get("context") as string) || "").trim();
    const file = formData.get("file") as File | null;
    const langCode = (formData.get("language") as string) || "en";
    const languageName = LANGUAGE_NAMES[langCode] || "English";

    const hasFile = !!(file && file.size > 0);
    const hasText = text.length > 0;

    if (!hasText && !hasFile) {
      return NextResponse.json(
        { error: "Please add at least one medication.", errorCode: "NO_INPUT" },
        { status: 400 },
      );
    }

    if (hasFile && file) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return NextResponse.json(
          { error: "Unsupported file type. Use JPG, PNG, WebP, or PDF.", errorCode: "WRONG_FILE_TYPE" },
          { status: 400 },
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return NextResponse.json(
          { error: "File too large. Max 10MB.", errorCode: "FILE_TOO_LARGE", fileSizeMB },
          { status: 400 },
        );
      }
    }

    const userBlocks: Anthropic.ContentBlockParam[] = [];

    const intro: string[] = [];
    if (hasText) {
      intro.push(`MEDICATIONS THE USER TYPED:\n${text.slice(0, 4000)}`);
    }
    if (hasFile) {
      intro.push(`The user also uploaded an image or PDF of their medication list — see the attached document. Identify every medication visible in it.`);
    }
    if (context) {
      intro.push(`ADDITIONAL HEALTH CONTEXT FROM USER:\n${context.slice(0, 2000)}`);
    }
    intro.push(`Please analyze and return the full JSON object as instructed.`);

    if (hasFile && file) {
      const fileBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(fileBuffer).toString("base64");
      const block: Anthropic.ContentBlockParam = file.type === "application/pdf"
        ? ({
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64Data },
          } as Anthropic.DocumentBlockParam)
        : ({
            type: "image",
            source: {
              type: "base64",
              media_type: file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64Data,
            },
          } as Anthropic.ImageBlockParam);
      userBlocks.push(block);
    }
    userBlocks.push({ type: "text", text: intro.join("\n\n") });

    const systemPrompt = buildSystemPrompt(languageName, context.length > 0, hasFile);

    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{ role: "user", content: userBlocks }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    interface DepthBlock { simple: string; medium: string; expert: string }
    interface ParsedAnalysis {
      parsed_medications?: Array<{ name: string; dose?: string; frequency?: string; raw_input?: string }>;
      uncertain_items?: string[];
      section_a_medications?: Array<{
        name: string;
        purpose: string;
        how_it_works: DepthBlock;
        dosing_context: DepthBlock;
        key_side_effects: string[];
        avoid: string[];
      }>;
      section_b_interactions?: Array<{
        between: [string, string];
        kind: "drug-drug" | "drug-food" | "drug-supplement";
        description: DepthBlock;
        severity: "minor" | "moderate" | "major";
      }>;
      section_b_clear?: boolean;
      section_c_red_flags?: Array<{ medication: string; symptoms: string[]; action: string }>;
      section_d_questions?: string[];
      section_e_lab_context?: DepthBlock | null;
    }

    let parsed: ParsedAnalysis;
    try {
      // Be lenient: strip code fences, then if that still fails, slice to the
      // outermost { ... } so we tolerate stray prose around the JSON.
      const stripped = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      try {
        parsed = JSON.parse(stripped);
      } catch {
        const first = stripped.indexOf("{");
        const last = stripped.lastIndexOf("}");
        if (first === -1 || last === -1 || last <= first) throw new Error("no JSON object found");
        parsed = JSON.parse(stripped.slice(first, last + 1));
      }
    } catch (e) {
      console.error("[medications] JSON parse failed:", e, "\nraw first 500 chars:", rawText.slice(0, 500), "\nraw last 200 chars:", rawText.slice(-200));
      return NextResponse.json(
        { error: "Could not parse the response. Please try again.", errorCode: "SERVER_ERROR" },
        { status: 502 },
      );
    }

    const meds = parsed.section_a_medications ?? [];
    const parsedList = parsed.parsed_medications ?? [];
    if (meds.length === 0 && parsedList.length === 0) {
      return NextResponse.json(
        {
          error: "We couldn't recognise any medications in your input. Try listing them by name (e.g. 'Lisinopril 10mg').",
          errorCode: "NO_MEDICATIONS",
        },
        { status: 422 },
      );
    }

    return NextResponse.json({ success: true, data: parsed });
  } catch (error) {
    console.error("medications API error:", error);

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
          { error: "Too many requests.", errorCode: "SERVER_ERROR" },
          { status: 429 },
        );
      }
      if (error.status >= 500) {
        return NextResponse.json(
          { error: "AI service error.", errorCode: "SERVER_ERROR" },
          { status: 503 },
        );
      }
    }

    return NextResponse.json(
      { error: "Something went wrong.", errorCode: "SERVER_ERROR" },
      { status: 500 },
    );
  }
}
