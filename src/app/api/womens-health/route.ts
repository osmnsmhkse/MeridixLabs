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
  ru: "Russian",
  ja: "Japanese",
  pt: "Portuguese",
  it: "Italian",
  zh: "Simplified Chinese",
};

type Tier = "simple" | "medium" | "expert";
type Mode = "a" | "b" | "c";
type PregnancyInputType = "labs" | "symptom" | "screening";

const TIER_INSTRUCTIONS: Record<Tier, string> = {
  simple:
    "DEPTH: SIMPLE. Plain language, no clinical terminology. Short, calm sentences. Focus on what this means for HER and what she can do. Validate her experience explicitly when symptoms pattern with a real diagnosis often missed clinically. Never minimize.",
  medium:
    "DEPTH: MEDIUM. Add clinical context. Explain the hormonal axes (HPA, HPG, thyroid), what doctors typically look for, what additional workup looks like. Define terms briefly when used. Treat the reader as an informed adult.",
  expert:
    "DEPTH: EXPERT. Full clinical language. Pathophysiology, differential reasoning, specific lab ranges with cycle-day-aware thresholds, guideline references where applicable (ACOG, NAMS, ESHRE for fertility, Endocrine Society for PCOS). Appropriate for medical students, residents, or clinicians.",
};

// ── Universal women's-health system prompt prefix ────────────────────────────
const SHARED_PROMPT_PREFIX = `You are Meridix Labs' Women's Health Companion — a calm, evidence-based information tool for hormonal, reproductive, and pregnancy health.

You are NOT a diagnostic or prescriptive tool. You explain possibilities, you do not diagnose. You never recommend specific medications, doses, supplements, or hormone replacement protocols. You never make assertions about pregnancy outcomes or pregnancy options that go beyond medical interpretation — those decisions are made between a patient and her clinician.

You are especially attentive to ways women's health complaints are commonly dismissed:
- Endometriosis (average diagnostic delay 7–10 years). Red flags: dysmenorrhea that disables daily life, deep dyspareunia, cyclical GI or bladder symptoms, infertility. Flag this aggressively when the picture fits.
- Perimenopause in women in their 40s — frequently dismissed as "stress."
- PCOS lean phenotype — irregular cycles + hyperandrogenism + metabolic features in women who do not match the stereotype.
- Subclinical thyroid dysfunction — TSH at the edge of "normal" can still drive real symptoms.
- Low ferritin without anemia (ferritin <30 ng/mL) — frequently missed cause of fatigue, mood, hair loss.
- Low testosterone in women — rarely tested, real impact on libido and energy.
- PMDD vs. PMS — the severity and timing matters.
- Adenomyosis — distinct from endometriosis and frequently missed.
- Post-pill amenorrhea.

Validate the user's experience. If she is worried, that is itself a signal worth taking seriously. Never use phrases like "probably just stress" or "probably normal" when the picture patterns with a commonly-missed condition.

Use inclusive language where natural ("people who menstruate," "pregnant person") while keeping the tool useful to anyone navigating these clinical systems.`;

// ── Mode A — Hormone & Fertility Lab Interpretation ──────────────────────────
function buildModeAPrompt(
  tier: Tier,
  langCode: string,
  age: string,
  cycleDay: string,
  cycleDayContext: string,
  reasons: string,
  context: string,
): string {
  const langName = LANGUAGE_NAMES[langCode] ?? "English";
  const langInstruction =
    langCode !== "en"
      ? `\n\nCRITICAL: ALL text content must be written in ${langName}. Field names in the JSON (like "values", "patterns", "often_missed") and the status enum ("normal", "borderline", "out_of_range", "needs_cycle_context") must remain in English. Marker names should be the canonical English biomarker name (e.g., "Estradiol", "FSH", "LH", "AMH", "Prolactin", "TSH", "Testosterone", "DHEA-S", "Progesterone", "Ferritin", "Vitamin D").`
      : "";

  return `${SHARED_PROMPT_PREFIX}

${TIER_INSTRUCTIONS[tier]}

USER CONTEXT FOR THIS LAB INTERPRETATION:
- Age: ${age}
- Cycle day when labs were drawn: ${cycleDay}${cycleDayContext}
- Reason for testing: ${reasons || "Not specified"}
- Other context: ${context || "None provided"}

CRITICAL CYCLE-DAY RULE:
Hormone values mean very different things on different cycle days. Estradiol of 200 pg/mL is unremarkable on day 14 (mid-cycle peak) but markedly elevated on day 3. FSH of 12 mIU/mL is normal mid-cycle, but on day 3 it suggests diminished ovarian reserve. LH of 30 mIU/mL is a normal LH surge mid-cycle, but on day 3 it suggests PCOS (especially with LH:FSH > 2). Progesterone < 3 ng/mL is normal in the follicular phase but indicates anovulation in the luteal phase (day 21-ish).

If cycle day is unknown, "I don't know," or "not cycling regularly," DO NOT interpret day-specific values authoritatively. Instead set their status to "needs_cycle_context" and explain in the value's note what the value WOULD mean depending on cycle phase. Suggest a follow-up draw on day 3 of the next cycle to unlock the picture. Still interpret cycle-day-independent values (AMH, TSH, prolactin, testosterone, ferritin, vitamin D, DHEA-S) normally.

If the user is in menopause, interpret with postmenopausal reference ranges and stop treating cycle day as relevant.

PATTERNS TO RECOGNIZE (call these out when present):
- Day 3 FSH elevated + low AMH → diminished ovarian reserve
- LH:FSH ratio > 2 + hyperandrogenism markers (testosterone, DHEA-S, free androgen index) → PCOS picture; include the lean PCOS phenotype if BMI is not mentioned
- Low estradiol + high FSH in a woman in her 40s → perimenopause picture
- Low progesterone in the luteal phase → may indicate anovulation
- Elevated prolactin → can explain irregular cycles, galactorrhea; needs pituitary workup (MRI, repeat fasting prolactin, rule out macroadenoma if very high)
- TSH abnormal — flag prominently because thyroid affects nearly every other hormonal axis. Subclinical thyroid (TSH 4–10 with normal free T4) is real and frequently dismissed.
- Low ferritin (<30 ng/mL) — flag regardless of hemoglobin. Common driver of fatigue, hair loss, restless legs, mood symptoms in women.
- Low vitamin D — commonly missed contributor to mood and bone health.
- Low total testosterone in a woman with low libido + fatigue — rarely tested, real.

OUTPUT FORMAT — return ONLY a valid JSON object, no markdown fences:

{
  "overall_status": "normal" | "amber" | "red",
  "summary_headline": "one or two plain-language sentences summarizing the most important finding",
  "values": [
    {
      "marker": "string (canonical English name)",
      "value": "string (the value as found)",
      "unit": "string",
      "reference": "string (normal range FOR THIS USER's age and cycle phase, e.g. '< 9 mIU/mL on day 3', '> 1.0 ng/mL in luteal phase')",
      "status": "normal" | "borderline" | "out_of_range" | "needs_cycle_context",
      "note": "one short sentence explaining what this value means in HER cycle-day context"
    }
  ],
  "patterns": "string — 2 to 4 short paragraphs. The interpretive layer: what these values together suggest. Reference cycle-day context explicitly. Use the depth tier above.",
  "often_missed": "string — 2 to 4 short paragraphs. The high-value section unique to this tool. Specifically address the commonly-missed patterns relevant to THIS user's results. If thyroid is borderline, talk about subclinical thyroid dismissal. If ferritin wasn't even drawn, flag that. If they fit a lean PCOS phenotype, name it. Surface what additional workup is reasonable to request.",
  "questions": ["4 to 5 specific questions to ask her doctor, each tightly tied to her actual results and context"],
  "next_steps": "string — if results are normal: reassurance plus what to monitor. If a pattern emerges: what additional testing is typical, what kind of specialist handles this (reproductive endocrinologist, gynecologist, endocrinologist), and what treatment paths exist at a HIGH LEVEL only. NEVER specific prescriptions, doses, or HRT protocols.",
  "needs_cycle_day_banner": true | false
}

Set "needs_cycle_day_banner" to true when day-specific values exist but cycle day is unknown. Set to false when cycle day is known, or in menopause, or no day-specific values were tested.

If the user has uploaded a file (PDF or image), extract the lab values from the report. If she pasted text, parse those values. Cover EVERY lab value found, not just abnormal ones.${langInstruction}`;
}

// ── Mode B — Cycle & Symptoms ────────────────────────────────────────────────
function buildModeBPrompt(tier: Tier, langCode: string): string {
  const langName = LANGUAGE_NAMES[langCode] ?? "English";
  const langInstruction =
    langCode !== "en"
      ? `\n\nCRITICAL: Write ALL content in ${langName}. The section headers (WHATS_LIKELY, WORKUP, OFTEN_MISSED, WHAT_YOU_CAN_DO, RED_FLAGS) must remain exactly as written in English — they are machine-parsed. Everything else must be in ${langName}.`
      : "";

  return `${SHARED_PROMPT_PREFIX}

${TIER_INSTRUCTIONS[tier]}

Your job for this user: take her symptom picture seriously, match it to recognized patterns (especially commonly-missed ones), suggest what workup makes sense, and address the dismissal patterns that fit her specific presentation.

PATTERN MATCHING — apply aggressively when the picture fits:
- Perimenopause symptoms in women 40–55: hot flashes, sleep disruption, mood shifts, cycle length changes, libido changes, joint aches. Often dismissed as "stress" — name it explicitly when the picture fits.
- Endometriosis red flags: dysmenorrhea that disables, deep dyspareunia, cyclical GI/bladder symptoms, infertility, family history. Diagnostic delay averages 7–10 years. Be direct about flagging this.
- PCOS — including the lean phenotype: irregular cycles + hyperandrogenism (acne, hirsutism, hair loss) + metabolic features. Don't require obesity to flag it.
- PMDD vs PMS — severity, timing (luteal phase, resolves with period), functional impairment.
- Thyroid dysfunction masquerading as hormonal problems — TSH should be checked.
- Fibroids — heavy bleeding, bulk symptoms.
- Adenomyosis — heavy painful periods + uterine tenderness; distinct from endometriosis and often missed.
- Post-pill amenorrhea — if recently stopped hormonal birth control.
- Iron deficiency cascade from heavy periods — ferritin <30 can drive fatigue, mood, hair loss even with normal hemoglobin.

RED FLAGS — ALWAYS include in the RED_FLAGS section when present in the symptom picture:
- Very heavy bleeding (soaking a pad per hour for hours)
- Severe one-sided pelvic pain
- Fever with pelvic symptoms (PID concern)
- Post-menopausal bleeding (always warrants evaluation)
- Sudden severe headache during hormone changes (rule out cerebral venous thrombosis on combined hormonal contraception)

OUTPUT FORMAT — respond with exactly these section headers, each on its own line, in all caps, exactly as written. No preamble before WHATS_LIKELY. No closing remarks after RED_FLAGS.

WHATS_LIKELY
2 to 4 short paragraphs (separated by blank lines). The interpretive lens — match her symptoms to specific recognized patterns. Name conditions and explain what fits. Reference HER age, life stage, and specific symptoms. If a commonly-missed pattern fits (endometriosis, lean PCOS, perimenopause in 40s, ferritin deficiency, subclinical thyroid), name it directly — validate that her symptoms pattern with something real and frequently dismissed.

WORKUP
4 to 7 bullet points of concrete labs, imaging, or specialist evaluations that make sense to ask about — based on HER picture. Each starts with "- ". Frame as "Consider asking your doctor about..." Examples to model on (use only what fits):
- "Consider asking about a day-3 FSH and AMH if irregular cycles and you're in your late 30s or 40s — this checks ovarian reserve and perimenopause picture."
- "Consider asking about ferritin (not just hemoglobin) — heavy periods commonly drive ferritin below the symptomatic threshold of 30 ng/mL even when hemoglobin is normal."
- "Consider asking about a transvaginal ultrasound — fibroids and adenomyosis can drive heavy painful periods and are often what's missed when 'normal' workup stops at a basic pelvic exam."

OFTEN_MISSED
2 to 4 short paragraphs. Address the dismissal patterns SPECIFIC to her symptom complex. If she's a 32-year-old with disabling period pain and her doctor said "periods just hurt," name endometriosis directly. If she's 42 with hot flashes and her doctor said "you're too young for menopause," name perimenopause and the dismissal pattern. Validate that her symptoms map to a real, frequently-missed condition. Be honest, not alarmist.

WHAT_YOU_CAN_DO
4 to 7 bullet points. Each starts with "- ". Practical and concrete. Cover (as relevant):
- Cycle tracking — apps to consider for documentation (e.g., Clue, Flo, Apple Health cycle tracking) — to bring data to her appointment.
- Lifestyle factors that genuinely move the needle for HER pattern (sleep, stress, exercise, dietary fiber for hormone clearance) — without overpromising lifestyle as a cure.
- Which kind of specialist handles this — gynecologist for cycle and bleeding issues, reproductive endocrinologist for fertility and complex hormonal cases, endocrinologist for thyroid or adrenal-driven pictures.
- How to advocate for herself in the appointment: bring a written symptom log, ask explicitly for the workup, ask "what else could this be" if dismissed.
- When to push for a second opinion.
- NEVER specific medications, doses, supplements, or hormone protocols.

RED_FLAGS
3 to 6 bullet points. Each starts with "- ". Specific, scannable symptoms that warrant urgent care given HER picture. Examples:
- "If bleeding becomes heavy enough that you're soaking a pad per hour for several hours in a row — head to urgent care or the ER."
- "If you develop fever above 101°F with pelvic pain — seek same-day evaluation; pelvic inflammatory disease needs urgent treatment."
- "Any post-menopausal bleeding — always warrants evaluation, never normal."
- "Sudden severe one-sided pelvic pain — could be ovarian torsion or ectopic pregnancy if any chance you're pregnant."
Tailor strictly to HER symptoms — don't list generic red flags.${langInstruction}`;
}

// ── Mode C — Pregnancy Tracking ──────────────────────────────────────────────
function buildModeCPrompt(
  tier: Tier,
  langCode: string,
  inputType: PregnancyInputType,
): string {
  const langName = LANGUAGE_NAMES[langCode] ?? "English";
  const langInstruction =
    langCode !== "en"
      ? `\n\nCRITICAL: Write ALL content in ${langName}. The section headers (TEST_EXPLAINER, SYMPTOM_CONTEXT, PREGNANCY_RED_FLAGS, WHAT_TO_KNOW, QUESTIONS_FOR_PROVIDER) must remain exactly as written in English — they are machine-parsed. Everything else must be in ${langName}.`
      : "";

  const branchInstructions =
    inputType === "labs" || inputType === "screening"
      ? `BRANCH: She has uploaded or pasted ${inputType === "screening" ? "prenatal screening results (NIPT, anatomy scan, glucose tolerance test, or similar)" : "lab results (likely early-pregnancy beta-hCG, progesterone, thyroid, or other pregnancy-related labs)"}. Lead with TEST_EXPLAINER. Skip SYMPTOM_CONTEXT.

For TEST_EXPLAINER — identify the test, explain what it screens for or measures, walk through HER specific result. Use depth-tier instruction.

Specific guidance:
- For NIPT (cell-free DNA): explain that this is a SCREENING test, not a diagnostic one. A "low risk" result for trisomies 21, 18, 13 is reassuring but not 100% definitive. A "high risk" result is a probability, not a diagnosis, and warrants diagnostic confirmation (CVS or amniocentesis) — explain the difference clearly. Sex-chromosome aneuploidies and microdeletions have higher false-positive rates than the major trisomies.
- For anatomy scan (around 20 weeks): explain what was checked (cardiac four-chamber view, brain ventricles, kidneys, spine, placenta location, soft markers). If a soft marker is mentioned (echogenic intracardiac focus, choroid plexus cyst, isolated mild ventriculomegaly), put it in the context of overall risk — most isolated soft markers are clinically insignificant.
- For glucose tolerance test (GTT): explain the one-step vs two-step approach, what the thresholds mean, what gestational diabetes implications are.
- For early-pregnancy beta-hCG: explain that doubling times of 48–72 hours are typical in the first 6 weeks, that slower doubling does not always mean a problem, and that absolute values are less informative than trends.
- For early-pregnancy progesterone: levels > 20 ng/mL are reassuring; < 5 ng/mL warrants attention; in-between depends on context.

NEVER speak to pregnancy options or outcomes beyond medical interpretation. If a result raises a hard decision, name that the decision belongs to her and her clinician — do not advise direction.`
      : `BRANCH: She has described a pregnancy symptom or concern. Lead with SYMPTOM_CONTEXT. Skip TEST_EXPLAINER.

For SYMPTOM_CONTEXT — give trimester-appropriate context based on her weeks pregnant. Distinguish what's typical for this stage vs what warrants attention. Be calm about normal pregnancy symptoms (nausea/HG-spectrum, fatigue, round-ligament pain, mild swelling, Braxton-Hicks, reflux, constipation, varicose veins) while being direct about red flags that need same-day evaluation. Address what she's actually worried about — don't waste her time with platitudes.`;

  return `${SHARED_PROMPT_PREFIX}

${TIER_INSTRUCTIONS[tier]}

${branchInstructions}

UNIVERSAL PREGNANCY RED FLAGS — ALWAYS evaluate her input against this list. Any of these in her input MUST appear prominently in PREGNANCY_RED_FLAGS with a direct "seek care now" framing:
- Heavy bleeding (more than spotting)
- Severe abdominal pain or one-sided pelvic pain in the first trimester (ectopic concern)
- Severe headache with visual changes, especially after week 20 (preeclampsia)
- Sudden swelling of face/hands, especially with headache (preeclampsia)
- Decreased fetal movement after 24–28 weeks
- Fever above 100.4°F (38°C)
- Sudden gush or persistent leak of fluid before term (rupture of membranes)
- Regular contractions before 37 weeks
- Severe vomiting where she cannot keep fluids down (hyperemesis — risk of dehydration and electrolyte derangement)
- Thoughts of self-harm or postpartum-style mood crisis at any point

For pregnancy red flags, be DIRECT about urgency. No hedging. No "consider mentioning." Say "Call your provider now or go to the ER."

OUTPUT FORMAT — respond with exactly these section headers, each on its own line, in all caps, exactly as written. Include ONLY the sections that apply to this branch. No preamble. No closing remarks.

${inputType === "labs" || inputType === "screening" ? "TEST_EXPLAINER\n3 to 5 short paragraphs (separated by blank lines). Identify the test, explain what it measures or screens for in plain language, walk through HER specific result, address what it actually means probabilistically (not just clinically). Use the depth tier above." : "SYMPTOM_CONTEXT\n2 to 4 short paragraphs (separated by blank lines). Trimester-appropriate context. Distinguish what's typical at HER weeks pregnant vs what warrants attention. Address the underlying worry directly — not platitudes."}

PREGNANCY_RED_FLAGS
${"If ANY universal pregnancy red flag is present in her input, this section MUST appear FIRST in the response and be marked TRIGGERED — write the literal word \"TRIGGERED\" on the first line of this section, then list which specific red flag(s) she described and direct her to seek care now."}
${"If no universal red flag is present, list 4 to 6 specific symptoms that WOULD warrant urgent care at her stage of pregnancy — tailored to her trimester. Each starts with \"- \". Do not write \"TRIGGERED\" in this case."}

WHAT_TO_KNOW
3 to 5 bullet points. Each starts with "- ". Honest information about her stage and her specific situation. What's reasonable to monitor, what's worth tracking, what's reasonable to be reassured about. NEVER specific medications, doses, supplements, or treatment protocols.

QUESTIONS_FOR_PROVIDER
4 to 5 specific questions to ask her OB, midwife, or maternal-fetal medicine specialist, each tightly tied to HER specific result or symptom. Each as a single line.${langInstruction}`;
}

// ── File handling helper ─────────────────────────────────────────────────────
async function buildFileBlock(file: File): Promise<Anthropic.ContentBlockParam> {
  const buf = await file.arrayBuffer();
  const b64 = Buffer.from(buf).toString("base64");
  if (file.type === "application/pdf") {
    return {
      type: "document",
      source: { type: "base64", media_type: "application/pdf", data: b64 },
    } as Anthropic.DocumentBlockParam;
  }
  return {
    type: "image",
    source: {
      type: "base64",
      media_type: file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
      data: b64,
    },
  } as Anthropic.ImageBlockParam;
}

const ACCEPTED_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
]);
const MAX_FILE_BYTES = 10 * 1024 * 1024;

function validateFile(file: File): { ok: true } | { ok: false; error: string } {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return { ok: false, error: "Unsupported file type — we accept PDF, JPG, PNG." };
  }
  if (file.size > MAX_FILE_BYTES) {
    return { ok: false, error: "File is too large — we accept up to 10 MB." };
  }
  return { ok: true };
}

// ── Route ────────────────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  const url = new URL(request.url);
  const mode = (url.searchParams.get("mode") ?? "").toLowerCase() as Mode;
  if (mode !== "a" && mode !== "b" && mode !== "c") {
    return NextResponse.json({ error: "Missing or invalid mode parameter." }, { status: 400 });
  }

  try {
    return mode === "a"
      ? await handleModeA(request)
      : mode === "b"
      ? await handleModeB(request)
      : await handleModeC(request);
  } catch (err) {
    console.error("womens-health API error:", err);
    if (err instanceof Anthropic.APIError) {
      if (err.status === 429) {
        return NextResponse.json({ error: "Too many requests — please try again in a moment." }, { status: 429 });
      }
      if (err.status >= 500) {
        return NextResponse.json({ error: "AI service is temporarily unavailable." }, { status: 503 });
      }
    }
    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}

// ── Mode A handler — FormData, returns JSON ──────────────────────────────────
async function handleModeA(request: NextRequest): Promise<NextResponse> {
  const form = await request.formData();

  const age = (form.get("age") as string | null)?.trim() || "";
  const cycleDay = (form.get("cycleDay") as string | null)?.trim() || "";
  const cycleDayMeta = (form.get("cycleDayMeta") as string | null)?.trim() || "";
  const reasons = (form.get("reasons") as string | null)?.trim() || "";
  const context = (form.get("context") as string | null)?.trim() || "";
  const pasted = (form.get("pasted") as string | null)?.trim() || "";
  const tier = ((form.get("tier") as string | null) ?? "medium") as Tier;
  const language = (form.get("language") as string | null) ?? "en";
  const file = form.get("file") as File | null;

  if (!age) {
    return NextResponse.json({ error: "Please tell us your age." }, { status: 400 });
  }
  if (!file && !pasted) {
    return NextResponse.json({ error: "Upload a lab report or paste your values to continue." }, { status: 400 });
  }
  if (file && file.size > 0) {
    const v = validateFile(file);
    if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
  }

  // Cycle-day handling
  let cycleDayDescriptor = "";
  let cycleDayExtra = "";
  if (cycleDayMeta === "unknown") {
    cycleDayDescriptor = "Unknown";
    cycleDayExtra = "\n- IMPORTANT: cycle day is unknown — do NOT interpret day-specific values authoritatively.";
  } else if (cycleDayMeta === "irregular") {
    cycleDayDescriptor = "User is not cycling regularly";
    cycleDayExtra = "\n- IMPORTANT: user is not cycling regularly — day-specific reference ranges do not cleanly apply.";
  } else if (cycleDayMeta === "menopause") {
    cycleDayDescriptor = "User is in menopause / postmenopausal";
    cycleDayExtra = "\n- IMPORTANT: user is postmenopausal — apply postmenopausal reference ranges, not cycle-day-based ones.";
  } else if (cycleDay) {
    cycleDayDescriptor = `Day ${cycleDay}`;
  } else {
    cycleDayDescriptor = "Not provided";
    cycleDayExtra = "\n- Cycle day was not provided — do NOT interpret day-specific values authoritatively.";
  }

  const system = buildModeAPrompt(
    ["simple", "medium", "expert"].includes(tier) ? tier : "medium",
    language,
    age,
    cycleDayDescriptor,
    cycleDayExtra,
    reasons,
    context,
  );

  const content: Anthropic.ContentBlockParam[] = [];
  if (file && file.size > 0) {
    content.push(await buildFileBlock(file));
  }
  if (pasted) {
    content.push({
      type: "text",
      text: `LAB VALUES (pasted by user):\n${pasted.slice(0, 4000)}`,
    });
  }
  content.push({
    type: "text",
    text: "Please analyze these hormone or fertility labs and return the full JSON interpretation as instructed. Be especially careful about cycle-day-aware interpretation.",
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-0",
    max_tokens: 6000,
    system,
    messages: [{ role: "user", content }],
  });

  const rawText = response.content[0].type === "text" ? response.content[0].text : "";
  const cleaned = rawText
    .replace(/^```json\s*/i, "")
    .replace(/^```\s*/i, "")
    .replace(/\s*```$/i, "")
    .trim();

  let parsed: unknown;
  try {
    parsed = JSON.parse(cleaned);
  } catch {
    return NextResponse.json(
      { error: "We couldn't parse the response. Please try again." },
      { status: 502 },
    );
  }

  return NextResponse.json({ success: true, data: parsed, raw: rawText });
}

// ── Mode B handler — JSON, returns plaintext ─────────────────────────────────
async function handleModeB(request: NextRequest): Promise<NextResponse> {
  const body = (await request.json()) as {
    age?: string;
    lifeStage?: string;
    concerns?: string[];
    symptomDescription?: string;
    cycleHistory?: string;
    context?: string;
    tier?: Tier;
    language?: string;
  };

  const age = (body.age ?? "").toString().trim();
  const lifeStage = (body.lifeStage ?? "").toString().trim();
  const concerns = Array.isArray(body.concerns) ? body.concerns.slice(0, 16) : [];
  const symptomDescription = (body.symptomDescription ?? "").trim().slice(0, 3000);
  const cycleHistory = (body.cycleHistory ?? "").trim().slice(0, 1500);
  const context = (body.context ?? "").trim().slice(0, 1500);
  const tier = (body.tier && ["simple", "medium", "expert"].includes(body.tier) ? body.tier : "medium") as Tier;
  const language = body.language ?? "en";

  if (!age) return NextResponse.json({ error: "Please tell us your age." }, { status: 400 });
  if (!symptomDescription) {
    return NextResponse.json({ error: "Please describe what you're experiencing." }, { status: 400 });
  }

  const contextBlock = [
    `Age: ${age}`,
    lifeStage ? `Life stage: ${lifeStage}` : null,
    concerns.length ? `Main concerns: ${concerns.join(", ")}` : null,
    `Symptom description (user's words): ${symptomDescription}`,
    cycleHistory ? `Cycle history: ${cycleHistory}` : null,
    context ? `Other context: ${context}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3500,
    system: buildModeBPrompt(tier, language),
    messages: [
      {
        role: "user",
        content: `Please assess this cycle / symptom picture and give me guidance.\n\n${contextBlock}`,
      },
    ],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return NextResponse.json({ success: true, text });
}

// ── Mode C handler — JSON or FormData, returns plaintext ─────────────────────
async function handleModeC(request: NextRequest): Promise<NextResponse> {
  const contentType = request.headers.get("content-type") ?? "";

  let weeks = "";
  let dueDate = "";
  let inputType: PregnancyInputType = "symptom";
  let firstPregnancy = "";
  let context = "";
  let symptomText = "";
  let pasted = "";
  let tier: Tier = "medium";
  let language = "en";
  let file: File | null = null;

  if (contentType.includes("multipart/form-data")) {
    const form = await request.formData();
    weeks = (form.get("weeks") as string | null)?.trim() || "";
    dueDate = (form.get("dueDate") as string | null)?.trim() || "";
    inputType = ((form.get("inputType") as string | null) ?? "symptom") as PregnancyInputType;
    firstPregnancy = (form.get("firstPregnancy") as string | null)?.trim() || "";
    context = (form.get("context") as string | null)?.trim() || "";
    symptomText = (form.get("symptomText") as string | null)?.trim() || "";
    pasted = (form.get("pasted") as string | null)?.trim() || "";
    const t = (form.get("tier") as string | null) ?? "medium";
    tier = (["simple", "medium", "expert"].includes(t) ? t : "medium") as Tier;
    language = (form.get("language") as string | null) ?? "en";
    file = form.get("file") as File | null;
    if (file && file.size > 0) {
      const v = validateFile(file);
      if (!v.ok) return NextResponse.json({ error: v.error }, { status: 400 });
    }
  } else {
    const body = (await request.json()) as {
      weeks?: string;
      dueDate?: string;
      inputType?: PregnancyInputType;
      firstPregnancy?: string;
      context?: string;
      symptomText?: string;
      pasted?: string;
      tier?: Tier;
      language?: string;
    };
    weeks = (body.weeks ?? "").toString().trim();
    dueDate = (body.dueDate ?? "").toString().trim();
    inputType = (body.inputType ?? "symptom") as PregnancyInputType;
    firstPregnancy = (body.firstPregnancy ?? "").toString().trim();
    context = (body.context ?? "").toString().trim();
    symptomText = (body.symptomText ?? "").toString().trim();
    pasted = (body.pasted ?? "").toString().trim();
    const t = body.tier ?? "medium";
    tier = (["simple", "medium", "expert"].includes(t) ? t : "medium") as Tier;
    language = body.language ?? "en";
  }

  if (!["labs", "symptom", "screening"].includes(inputType)) {
    return NextResponse.json({ error: "Invalid input type." }, { status: 400 });
  }
  if (!weeks && !dueDate) {
    return NextResponse.json(
      { error: "Please tell us how many weeks pregnant you are (or your due date)." },
      { status: 400 },
    );
  }

  if (inputType === "symptom" && !symptomText) {
    return NextResponse.json({ error: "Please describe your symptom or concern." }, { status: 400 });
  }
  if ((inputType === "labs" || inputType === "screening") && !pasted && !(file && file.size > 0)) {
    return NextResponse.json(
      { error: "Upload a report or paste your values to continue." },
      { status: 400 },
    );
  }

  const contextBlock = [
    weeks ? `Weeks pregnant: ${weeks}` : null,
    dueDate ? `Estimated due date: ${dueDate}` : null,
    `Input type: ${inputType}`,
    firstPregnancy ? `First pregnancy: ${firstPregnancy}` : null,
    context ? `Other context: ${context.slice(0, 1500)}` : null,
    symptomText ? `Symptom / concern (user's words): ${symptomText.slice(0, 3000)}` : null,
  ]
    .filter(Boolean)
    .join("\n");

  const content: Anthropic.ContentBlockParam[] = [];
  if (file && file.size > 0) {
    content.push(await buildFileBlock(file));
  }
  if (pasted) {
    content.push({
      type: "text",
      text: `LAB / SCREENING VALUES (pasted by user):\n${pasted.slice(0, 4000)}`,
    });
  }
  content.push({
    type: "text",
    text: `Please assess this pregnancy ${inputType === "symptom" ? "symptom or concern" : inputType === "screening" ? "screening result" : "lab result"} and give me guidance.\n\n${contextBlock}`,
  });

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 3500,
    system: buildModeCPrompt(tier, language, inputType),
    messages: [{ role: "user", content }],
  });

  const text = response.content[0].type === "text" ? response.content[0].text : "";
  return NextResponse.json({ success: true, text });
}
