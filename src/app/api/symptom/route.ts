import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import Anthropic from "@anthropic-ai/sdk";
import { IDENTITY_CONFIDENTIALITY } from "@/lib/toolChatConfig";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SUPPORTED_IMAGE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);

// Cap on base64 payload size — Claude vision tolerates up to ~5MB raw per image.
// Base64 inflates by ~4/3, so 7MB of base64 ≈ 5.2MB raw.
const MAX_IMAGE_BASE64_BYTES = 7 * 1024 * 1024;

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

function buildSystemPrompt(
  symptom: string,
  age: string,
  sex: string,
  duration: string,
  history: string,
  langCode = "en"
): string {
  const langName = LANGUAGE_NAMES[langCode] ?? "English";
  const langInstruction =
    langCode !== "en"
      ? `\n\nCRITICAL: Write ALL content in ${langName}. The six section headers (MOST_LIKELY, LESS_COMMON, etc.) must remain exactly as written in English — they are machine-parsed separators. Everything else must be in ${langName}.`
      : "";

  const contextParts: string[] = [];
  if (age) contextParts.push(`Age: ${age}`);
  if (sex) contextParts.push(`Sex: ${sex}`);
  if (duration) contextParts.push(`Duration: ${duration}`);
  if (history) contextParts.push(`Relevant history: ${history}`);
  const contextBlock =
    contextParts.length > 0
      ? `\n\nPatient context provided:\n${contextParts.join("\n")}`
      : "";

  return `You are a knowledgeable and calm medical educator. A person has come to you with a symptom and wants to understand what it might mean — not a diagnosis, but calibrated health context so they can think clearly and act appropriately.${contextBlock}

The user may have attached a photo (e.g., a skin rash, wound, eye condition, swelling, or injury) in addition to — or instead of — their text description. When a photo is present, integrate visual observations with any text. If only a photo is provided with no description, analyze the photo on its own using the same structured output below. When the visible findings clearly point to a medical specialty (e.g., Dermatology, Ophthalmology, Orthopedics, ENT, Emergency Medicine), name that specialty inside the WHAT_TO_DO section.

Your job is to give them the clearest, most honest, most useful answer possible. You are NOT their doctor. You are the well-informed friend who helps them understand what to look into next.

Be direct. Be specific. Do not hedge every sentence. Do not pad with disclaimers. One reminder to see a doctor is enough — don't repeat it. The person is an adult.

Respond with exactly these 7 sections, in this order. Each section header must appear on its own line, in all caps, exactly as written below.

MOST_LIKELY
List the 3 most probable causes for this symptom given everything you know. For each cause, provide:
- A name (short, plain English, no Latin unless you immediately explain it)
- A confidence label: one of "Very common", "Common", or "Less common" — based on actual epidemiology, not hedging
- A 2–3 sentence explanation of what this cause is, why it fits this symptom, and any distinguishing features that make it more or less likely given the context provided

Format each cause as:
CAUSE: [Name]
CONFIDENCE: [Very common / Common / Less common]
DETAIL: [2–3 sentence explanation]

LESS_COMMON
List 2–3 causes that are less frequent but still plausible and clinically important to mention. Same format as MOST_LIKELY (CAUSE / CONFIDENCE / DETAIL). Keep this section shorter and more clinical.

SERIOUS_BUT_RARE
Name 1–2 serious conditions this symptom can sometimes represent. Be honest but provide statistical grounding — e.g., "This is possible but accounts for fewer than 1 in 200 cases of this symptom in otherwise healthy adults." Do NOT catastrophize. Do NOT lead with worst-case scenarios. The purpose of this section is to acknowledge serious possibilities briefly, not to frighten.

WHAT_WOULD_CHANGE_THIS
Provide a bullet list of specific findings, symptoms, or context factors that would meaningfully shift the picture — either toward something more serious or toward something more benign. These should be concrete and specific to this symptom. Format as a bullet list with each item starting with "- ". 6–8 bullets.

WHAT_TO_DO
Give a single, specific, actionable recommendation. This should be the most useful thing this person can do right now.

Start this section with exactly one of these urgency tags on its own line:
GREEN: (means: no rush, self-monitor or routine care)
AMBER: (means: see a doctor within the next few days)
RED: (means: seek urgent care today)

Then write 2–4 sentences explaining what to do and why, specific to this symptom and context. Be concrete — "schedule a routine appointment" is better than "see a doctor." "Go to urgent care if you develop X" is better than "seek medical attention."

HOME_CARE
Provide practical, safe, evidence-based home care advice the person can follow right now — before or instead of seeing a doctor. This should include:
- Immediate comfort measures or first aid (e.g. cold compress, rest, hydration, OTC medications with specific names and typical adult doses)
- Lifestyle adjustments that can help (posture, sleep, diet changes, activity modifications)
- Simple monitoring instructions (what to track, how long to wait before escalating)
- When this section is NOT appropriate (e.g. if the urgency is RED), say clearly: "For this symptom pattern, home management is not recommended — please seek professional care first."

Write 4–6 concise bullet points. Be specific and actionable — "Take 400mg ibuprofen every 6 hours with food" is better than "consider pain relief." Keep it practical and grounded.

Format as a bullet list with each item starting with "- ".

STOP_READING_IF
If ANY of the following would apply to this symptom — chest pain radiating to the arm/jaw, sudden severe headache, difficulty breathing, facial drooping, sudden vision loss, inability to speak or understand speech, severe abdominal rigidity, signs of sepsis — write a brief 1–2 sentence alert that these are emergency symptoms requiring 911/emergency services immediately.

If none of those apply to this symptom, write exactly: NONE${langInstruction}`;
}

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "ai-heavy");
  if (_rl) return _rl;
  try {
    const body = (await request.json()) as {
      symptom?: string;
      age?: string;
      sex?: string;
      duration?: string;
      history?: string;
      language?: string;
      image?: { mediaType?: string; data?: string } | null;
    };

    const {
      symptom = "",
      age = "",
      sex = "",
      duration = "",
      history = "",
      language = "en",
      image = null,
    } = body;

    const symptomClean = typeof symptom === "string" ? symptom.trim().slice(0, 400) : "";
    const historyClean = typeof history === "string" ? history.trim().slice(0, 500) : "";
    // Bound the small context fields too (cheap, prevents prompt-stuffing).
    const ageClean = typeof age === "string" ? age.trim().slice(0, 16) : "";
    const sexClean = typeof sex === "string" ? sex.trim().slice(0, 16) : "";
    const durationClean = typeof duration === "string" ? duration.trim().slice(0, 60) : "";
    const languageClean = typeof language === "string" ? language.trim().slice(0, 8) : "en";

    let imageBlock:
      | { type: "image"; source: { type: "base64"; media_type: "image/jpeg" | "image/png" | "image/webp" | "image/gif"; data: string } }
      | null = null;

    if (image && typeof image.data === "string" && typeof image.mediaType === "string") {
      if (!SUPPORTED_IMAGE_TYPES.has(image.mediaType)) {
        return NextResponse.json(
          { error: "Unsupported image format. Please use JPG, PNG, or WEBP." },
          { status: 400 }
        );
      }
      if (image.data.length > MAX_IMAGE_BASE64_BYTES) {
        return NextResponse.json(
          { error: "Image is too large. Please use an image under 5MB." },
          { status: 400 }
        );
      }
      imageBlock = {
        type: "image",
        source: {
          type: "base64",
          media_type: image.mediaType as "image/jpeg" | "image/png" | "image/webp" | "image/gif",
          data: image.data,
        },
      };
    }

    // Need at least a symptom or an image.
    if (symptomClean.length < 2 && !imageBlock) {
      return NextResponse.json(
        { error: "Please describe a symptom or upload a photo." },
        { status: 400 }
      );
    }

    const textForUser = symptomClean
      ? `My symptom: ${symptomClean}`
      : "I've attached a photo of what I'm concerned about. Please analyze it.";

    const userContent: Anthropic.ContentBlockParam[] = [];
    if (imageBlock) userContent.push(imageBlock);
    userContent.push({ type: "text", text: textForUser });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3000,
      system: buildSystemPrompt(
        symptomClean,
        ageClean,
        sexClean,
        durationClean,
        historyClean,
        languageClean
      ) + IDENTITY_CONFIDENTIALITY,
      messages: [{ role: "user", content: userContent }],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({
      text,
      symptom: symptomClean,
      hadImage: !!imageBlock,
    });
  } catch (err) {
    console.error("symptom API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
