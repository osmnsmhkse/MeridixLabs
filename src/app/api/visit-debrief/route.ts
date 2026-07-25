import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import Anthropic from "@anthropic-ai/sdk";
import { IDENTITY_CONFIDENTIALITY } from "@/lib/toolChatConfig";

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
    "DEPTH: SIMPLE. Use plain, conversational language. No medical jargon — if you must use a clinical term, explain it in everyday words on the same line. Reassuring tone. Focus on what this means for them and what they do next.",
  medium:
    "DEPTH: MEDIUM. Use clear language with some clinical context. Briefly explain key medical terms, why specific tests are ordered, what diagnoses mean mechanically, and reference ranges where helpful.",
  expert:
    "DEPTH: EXPERT. Use full clinical language. Include differential reasoning, pathophysiology, clinical significance of findings, and the typical workup pathway. Use diagnostic criteria and guidelines where named.",
};

function buildSystemPrompt(tier: Tier, langCode: string): string {
  const langName = LANGUAGE_NAMES[langCode] ?? "English";
  const langInstruction =
    langCode !== "en"
      ? `\n\nCRITICAL: Write ALL content in ${langName}. The section headers (CLARIFY, WHAT_WAS_DISCUSSED, WHAT_WAS_PRESCRIBED, FOLLOW_UP_PLAN, WARNING_SIGNS, JARGON_DECODER, REMAINING_QUESTIONS) and the inline labels (ITEM:, WHAT:, WHY:, GOAL:, STEP:, WHEN:, URGENT:, TERM:, PLAIN:) must remain exactly as written in English — they are machine-parsed separators. Everything else must be in ${langName}.`
      : "";

  return `You are Meridix Labs' Doctor's Visit Companion — a visit debrief and translation assistant. The user has just had a doctor's appointment and is sharing their after-visit summary, discharge notes, or personal notes from the appointment. Your job is to translate what happened into plain English, surface what matters, and help them know exactly what to do next.

You handle three kinds of input:
1. AI-generated after-visit summaries (from tools like Abridge, Nabla, Commure) — typically structured but terse with heavy clinical shorthand. Translate the shorthand.
2. Discharge paperwork or printed visit summaries — denser clinical language, possibly with templated boilerplate. Cut through the boilerplate and find what's specific to this patient.
3. Handwritten or informal patient notes — incomplete, fragmentary, sometimes just impressions. Extract every clinically useful detail; don't dismiss the input just because it isn't formal.

${TIER_INSTRUCTIONS[tier]}

Critical rules:
- NEVER contradict, second-guess, or undermine the treating physician's decisions. Your job is to TRANSLATE and CONTEXTUALIZE — not to give a second opinion.
- NEVER make a diagnosis the doctor did not make. If the notes are inconclusive, say so honestly.
- If the notes mention "follow up in X weeks", "return if symptoms worsen", "repeat labs in Y months", or any time-sensitive instruction — surface it PROMINENTLY in the FOLLOW_UP_PLAN section.
- Be EXHAUSTIVE in JARGON_DECODER. After-visit summaries are dense with unexplained terminology — extract every term a non-clinician would not understand and translate it. Don't skip any.
- If the input is too vague to produce a useful debrief, respond with ONLY the CLARIFY section.
- If the user provided an optional "specific question" alongside their notes, address it directly inside the relevant section AND ensure it surfaces in REMAINING_QUESTIONS if it wasn't fully answered by the notes.

Respond with exactly these section headers, each on its own line, in all caps, exactly as written.

CLARIFY
ONLY include this section IF the notes are too vague to produce a useful debrief (e.g. a single word like "headache" or "follow up"). Write one short, specific question that would unlock a useful translation — e.g. "What did the doctor say about the headache — any diagnosis, tests, or follow-up plan you can share?" If the input is workable, OMIT this section entirely.

WHAT_WAS_DISCUSSED
Plain-English summary of the key clinical conclusions from the visit. If a diagnosis was made, explain what it is and what it means. If the visit was inconclusive or the doctor is still gathering information, explain that clearly — that is useful information too. 1–3 paragraphs. Do not invent conclusions that aren't in the notes.

WHAT_WAS_PRESCRIBED
For every medication, test, referral, procedure, or lifestyle change recommended in the notes, list it with what it is, why it was recommended, and the intended goal. Match the depth tier. If nothing was prescribed or recommended, write a single item explaining that. Format each item as:
ITEM: [medication / test / referral / lifestyle change — name + dose if given]
WHAT: [plain-English description of what it is]
WHY: [the reason it was recommended, inferred from the notes if not stated]
GOAL: [what success looks like — symptom relief, range normalization, ruling out a condition, etc.]

FOLLOW_UP_PLAN
A structured timeline of what needs to happen next, when, and why. Flag anything time-sensitive. If the notes are silent on follow-up, write one item noting that and suggest the user clarify with the office. Format each item as:
STEP: [the action — e.g. "Repeat TSH", "See cardiology", "Start medication"]
WHEN: [the timeframe stated in the notes, or "Not specified — confirm with the office"]
WHY: [why this step matters in plain English]
URGENT: [yes or no — "yes" only if the notes indicate the timeframe is short or non-optional]

WARNING_SIGNS
Specific symptoms that mean "don't wait — call your doctor or go to urgent care." These must be PERSONALIZED to what was discussed at THIS visit — not a generic list. For example, after a cardiac workup, flag chest pain radiating to the arm, sudden shortness of breath, fainting. After an abdominal workup, flag fever with abdominal rigidity, blood in stool, intractable vomiting. 4–7 bullets, each on its own line starting with "- ".

JARGON_DECODER
Identify EVERY piece of medical jargon, abbreviation, shorthand phrase, or unexplained clinical concept in the original notes and translate it into plain English. Be exhaustive — this is the most important section for many users. Include things like "rule out malignancy", "no acute findings", "unremarkable", "incidental finding", "WNL", "PRN", "QD", "BID", "follow-up in 6 weeks", named drugs, named tests, anatomical terms, etc. Format each item as:
TERM: [the exact phrase or abbreviation as written in the notes]
PLAIN: [what it actually means, written for someone with no medical background]

REMAINING_QUESTIONS
Based on the notes, surface 3–4 specific questions the patient might not have thought to ask but would probably want answered at their next visit or through a portal message. Tailor each to what is actually in the notes. Use a numbered list (1. 2. 3. etc.).${langInstruction}`;
}

const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "application/pdf",
];
const MAX_FILE_SIZE = 10 * 1024 * 1024;

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "ai-heavy");
  if (_rl) return _rl;
  try {
    const formData = await request.formData();
    const notes = ((formData.get("notes") as string) || "").trim();
    const contextQ = ((formData.get("context") as string) || "").trim();
    const tierRaw = (formData.get("tier") as string) || "medium";
    const language = (formData.get("language") as string) || "en";
    const file = formData.get("file") as File | null;

    const tier: Tier =
      tierRaw === "simple" || tierRaw === "expert" ? tierRaw : "medium";

    const hasFile = !!(file && file.size > 0);
    if (!notes && !hasFile) {
      return NextResponse.json(
        { error: "Paste your notes or upload your paperwork to get started." },
        { status: 400 }
      );
    }

    if (hasFile && file) {
      if (!ALLOWED_FILE_TYPES.includes(file.type)) {
        return NextResponse.json(
          {
            error: "We accept PDF, JPG, PNG, and WebP files.",
            errorCode: "WRONG_FILE_TYPE",
          },
          { status: 400 }
        );
      }
      if (file.size > MAX_FILE_SIZE) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return NextResponse.json(
          {
            error: "That file is too large — we accept up to 10 MB.",
            errorCode: "FILE_TOO_LARGE",
            fileSizeMB,
          },
          { status: 400 }
        );
      }
    }

    const notesClean = notes.slice(0, 12000);
    const contextClean = contextQ.slice(0, 1500);

    const userContent: Anthropic.MessageParam["content"] = [];

    if (hasFile && file) {
      const fileBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(fileBuffer).toString("base64");
      const block: Anthropic.ContentBlockParam =
        file.type === "application/pdf"
          ? {
              type: "document",
              source: {
                type: "base64",
                media_type: "application/pdf",
                data: base64Data,
              },
            }
          : {
              type: "image",
              source: {
                type: "base64",
                media_type: file.type as
                  | "image/jpeg"
                  | "image/png"
                  | "image/gif"
                  | "image/webp",
                data: base64Data,
              },
            };
      userContent.push({
        type: "text",
        text: "DOCUMENT — uploaded after-visit paperwork:",
      });
      userContent.push(block);
    }

    if (notesClean) {
      userContent.push({
        type: "text",
        text: `PASTED NOTES OR SUMMARY:\n${notesClean}`,
      });
    }

    if (contextClean) {
      userContent.push({
        type: "text",
        text: `SPECIFIC QUESTION FROM THE USER:\n${contextClean}`,
      });
    }

    userContent.push({
      type: "text",
      text: "Please debrief this visit for me as instructed.",
    });

    const response = await client.messages.create({
      model: hasFile ? "claude-sonnet-4-6" : "claude-sonnet-4-6",
      max_tokens: 4000,
      system: buildSystemPrompt(tier, language) + IDENTITY_CONFIDENTIALITY,
      messages: [{ role: "user", content: userContent }],
    });

    const text =
      response.content[0].type === "text" ? response.content[0].text : "";

    return NextResponse.json({ text });
  } catch (err) {
    console.error("visit-debrief API error:", err);
    if (err instanceof Anthropic.APIError) {
      if (err.status === 429) {
        return NextResponse.json(
          { error: "Too many requests. Please try again in a moment." },
          { status: 429 }
        );
      }
      if (err.status >= 500) {
        return NextResponse.json(
          { error: "AI service temporarily unavailable." },
          { status: 503 }
        );
      }
    }
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
