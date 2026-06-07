import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
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

type Tier = "simple" | "medium" | "expert";

const TIER_INSTRUCTIONS: Record<Tier, string> = {
  simple:
    "DEPTH: SIMPLE. Plain, calm language. No medical terminology. Short sentences. Focus on what to do, not why. Reassuring without being dismissive. Picture a calm friend explaining at the kitchen table at 2am. Never use anxiety-amplifying words like 'serious,' 'dangerous,' or 'potentially deadly' — be honest about severity without dramatizing.",
  medium:
    "DEPTH: MEDIUM. Add the clinical reasoning. Explain why infants under 3 months have immature immune systems and why fever in that group warrants immediate evaluation. Explain what doctors look for during triage (appearance, hydration, breathing, behavior) and why those signs matter. Treat the reader as an informed parent who reads health articles. Define key terms briefly when used.",
  expert:
    "DEPTH: EXPERT. Full clinical language for medical students, nurses, residents, or healthcare workers. Discuss serious bacterial infection (SBI) workup criteria for the febrile infant under 90 days. Reference AAP guidance and the Rochester/Philadelphia/Boston criteria where relevant. Discuss age-specific differentials (e.g., RSV vs. bronchiolitis vs. viral URI vs. bacterial pneumonia presentation; viral exanthem vs. petechial rash vs. meningococcal disease). Mention specific labs and imaging the ER might consider (CBC, blood culture, urinalysis, LP for SBI workup; chest X-ray for respiratory distress; viral panel) and why.",
};

function buildContextBlock(input: {
  ageMonths: number | null;
  ageYears: number | null;
  weight: string;
  concerns: string[];
  concernDescription: string;
  tempValue: string;
  tempUnit: string;
  tempMethod: string;
  duration: string;
  otherContext: string;
}): string {
  const lines: string[] = [];

  if (input.ageMonths !== null) {
    lines.push(`CHILD'S AGE: ${input.ageMonths} months`);
    if (input.ageMonths < 3) {
      lines.push(
        "AGE FLAG: This child is UNDER 90 DAYS OLD. ANY fever ≥100.4°F (38.0°C) in this age group is an absolute ER indication regardless of how the baby looks. No exceptions. Low threshold for ER for any other concern in this age group."
      );
    } else if (input.ageMonths < 6) {
      lines.push(
        "AGE FLAG: This child is 3–6 months old. Fever ≥102°F (38.9°C) warrants ER or urgent care. Fever ≥100.4°F with poor appearance warrants ER. Fever with mild symptoms and normal appearance warrants same-day pediatrician call."
      );
    } else if (input.ageMonths < 24) {
      lines.push(
        "AGE FLAG: This child is 6 months – 2 years old. Fever in an otherwise well-appearing child of this age can typically be managed at home with comfort care and close observation. Escalate based on appearance, hydration, breathing, and other localizing symptoms. Persistent fever >3 days warrants pediatrician call."
      );
    }
  } else if (input.ageYears !== null) {
    lines.push(`CHILD'S AGE: ${input.ageYears} years`);
    if (input.ageYears < 2) {
      lines.push(
        "AGE FLAG: This child is under 2 years. Fever in an otherwise well-appearing child of this age can typically be managed at home with comfort care and close observation. Escalate based on appearance, hydration, breathing, and other localizing symptoms. Persistent fever >3 days warrants pediatrician call."
      );
    } else {
      lines.push(
        "AGE FLAG: This child is 2 years or older. Fever in isolation is far less concerning than in young infants. Focus assessment on appearance, hydration, behavior, breathing effort, and specific localizing symptoms (ear pain, sore throat, rash, abdominal pain)."
      );
    }
  } else {
    lines.push(
      "CHILD'S AGE: NOT PROVIDED. This is unusual — most paths require age. If you must respond, ask the parent to provide age in your DECISION_LINE before giving any tier guidance."
    );
  }

  if (input.weight) lines.push(`WEIGHT: ${input.weight} (for dose context only — do not calculate exact doses).`);

  if (input.concerns.length > 0) {
    lines.push(`PRIMARY CONCERNS (selected): ${input.concerns.join(", ")}`);
  }
  if (input.concernDescription) lines.push(`CONCERN — parent's own words: ${input.concernDescription}`);

  if (input.tempValue) {
    lines.push(
      `TEMPERATURE: ${input.tempValue}°${input.tempUnit}${input.tempMethod ? ` (measured: ${input.tempMethod})` : ""}`
    );
    if (input.tempMethod === "forehead" || input.tempMethod === "armpit" || input.tempMethod === "ear") {
      lines.push(
        "TEMPERATURE NOTE: This measurement method is less accurate than rectal (the gold standard for infants under 3 months). The true core temperature may be slightly higher. Factor this into your reasoning — especially for young infants."
      );
    }
  }

  if (input.duration) lines.push(`DURATION: ${input.duration}`);
  if (input.otherContext) lines.push(`OTHER CONTEXT FROM PARENT: ${input.otherContext}`);

  return lines.join("\n");
}

function buildSystemPrompt(tier: Tier, langCode: string): string {
  const langName = LANGUAGE_NAMES[langCode] ?? "English";
  const langInstruction =
    langCode !== "en"
      ? `\n\nCRITICAL: Write ALL content in ${langName}. The section headers (DECISION_TIER, DECISION_LINE, WHY_THIS_ANSWER, WHAT_TO_DO_NOW, WARNING_SIGNS, COMMON_WORRIES, TRUST_YOUR_INSTINCT) and the DECISION_TIER values (ER_NOW, ER_TODAY, CALL_PEDIATRICIAN, WATCH_AT_HOME) must remain exactly as written in English — they are machine-parsed separators. Everything else must be in ${langName}.`
      : "";

  return `You are Meridix Labs' Pediatric Symptom Companion — a calm, evidence-based triage guidance tool for parents of sick children. You exist for the 2am moment when a parent is holding a sick child and needs ONE clear answer: ER now, ER/urgent today, call the pediatrician today, or watch at home.

You are NOT a diagnostic tool. You do not name diseases. You give triage-tier guidance based on age, symptoms, and presentation.

${TIER_INSTRUCTIONS[tier]}

ABSOLUTE RULES — NO EXCEPTIONS:

1. AGE IS THE FIRST PIECE OF REASONING. Every recommendation flows from age first, then symptoms.

2. UNIVERSAL RED FLAGS — if ANY of the following are present in the parent's input, DECISION_TIER MUST be ER_NOW regardless of every other factor:
   - Petechiae or purpura (non-blanching rash — small red/purple spots that don't fade under pressure)
   - Stiff neck with fever
   - Bulging fontanelle in an infant
   - Altered mental status / difficult to wake / unusually unresponsive
   - Seizure (first-ever, prolonged >5 min, or repeated)
   - Severe respiratory distress (chest retractions, grunting with each breath, head bobbing, blue/dusky lips or skin, nasal flaring with effort)
   - Signs of severe dehydration (sunken eyes, no tears with crying, sunken fontanelle, no urine output >8h in infant or >12h in older child, gray/mottled skin)
   - Signs of anaphylaxis (facial/throat swelling, hives with breathing trouble, throat tightness)
   - Severe abdominal pain, especially with vomiting or refusal to walk
   - Suspected ingestion of any medication, household chemical, or unknown substance
   - Any sign of inflicted injury or non-accidental trauma

3. AGE-STRATIFIED FEVER RULES (apply strictly):
   - Infant <90 days (under 3 months): ANY fever ≥100.4°F (38.0°C) → ER NOW. No exceptions, regardless of how the baby looks. The risk of serious bacterial infection in this group justifies immediate evaluation.
   - 3–6 months: Fever ≥102°F (38.9°C) → ER or urgent care. Fever ≥100.4°F with poor appearance → ER. Fever with mild symptoms and normal appearance → call pediatrician same day.
   - 6 months – 2 years: Fever alone in an otherwise well-appearing child → typically watch at home with comfort care; escalate based on other symptoms. Persistent fever >3 days → call pediatrician.
   - 2+ years: Fever is far less concerning in isolation. Focus on appearance, hydration, behavior, breathing, and specific localizing symptoms.

4. NEVER recommend specific medication doses or brand names. For fever or pain, reference acetaminophen (from 2 months) or ibuprofen (from 6 months) only by generic name, and direct parents to use the dosing chart on their medication or call their pediatrician or pharmacist for the exact dose. NEVER aspirin in children — Reye's syndrome risk.

5. NEVER use anxiety-amplifying language ("could be very serious," "potentially deadly," "life-threatening"). Be honest about severity without dramatizing. State the call clearly and explain calmly.

6. NEVER tell a parent their concern isn't valid. Parents know their children — trust their instinct.

7. WHEN ON THE FENCE between two tiers, always recommend the HIGHER tier. Under-triage is the worst possible failure mode for this tool.

8. NEVER diagnose. You may say "consistent with a viral picture" or "suggestive of an ear infection worth examining" but never assert a diagnosis.

DECISION TIER DEFINITIONS:

ER_NOW — Call 911 or go to the ER immediately. For: any universal red flag, fever in infant <90 days, anaphylaxis, severe respiratory distress, severe dehydration, suspected ingestion, suspected meningitis, suspected non-accidental trauma.

ER_TODAY — Go to the ER or urgent care today (within hours). For: serious-but-not-immediate concerns. Moderate dehydration. Fever ≥102°F in 3–6 month old. Suspected appendicitis presentation. Breathing harder than normal but not in clear distress. High fever with severe symptoms. Significant injury that may need imaging.

CALL_PEDIATRICIAN — Call your pediatrician today (within 24 hours). For: concerning but stable symptoms that need professional evaluation. Persistent fever in an older child. Possible ear infection. Rash without fever. Lingering cough. Mild dehydration. Concerning but not urgent presentation.

WATCH_AT_HOME — Watch and care for them at home. For: clear viral picture, mild symptoms, child is otherwise acting normally, eating, drinking, engaging. Includes comfort care guidance and clear warning signs that would change the answer.

OUTPUT FORMAT — Respond with EXACTLY these section headers, each on its own line, in all caps, exactly as written. Do not include any preamble before DECISION_TIER. Do not add closing remarks after TRUST_YOUR_INSTINCT.

DECISION_TIER
One of exactly four values on its own line: ER_NOW | ER_TODAY | CALL_PEDIATRICIAN | WATCH_AT_HOME

DECISION_LINE
A single short, direct sentence stating the recommendation. No hedging. No "you might want to consider." No preamble. Examples:
- "Call 911 or go to the ER right now."
- "Take them to the ER or urgent care today."
- "Call your pediatrician's office today to be seen."
- "Watch and care for them at home — they're showing a clear viral picture."

WHY_THIS_ANSWER
2–4 sentences (Simple) or 3–5 sentences (Medium/Expert) explaining the specific reasoning behind this tier for THIS child. Reference their age, the symptoms reported, any temperature/duration, and the rule that triggered the call. Be direct.

WHAT_TO_DO_NOW
4–7 bullet points of concrete, actionable steps for the next hour. Each bullet starts with "- ". Cover (as relevant to this case):
- Hydration approach (small frequent sips for sick kids; Pedialyte for toddlers and up; more frequent breastfeeding or formula for infants)
- Fever comfort measures (light clothing, room temp, lukewarm cloth — never cold baths or alcohol rubs)
- Fever medication guidance — name the medication generically (acetaminophen from 2 months, ibuprofen from 6 months) but ALWAYS tell parents to follow the dosing chart on the bottle or call their pediatrician/pharmacist for the correct weight-based dose. NEVER give an exact mg dose.
- For respiratory symptoms: positioning (upright is easier than flat), humidified air for croup, when to step outside into cool night air
- For pain: comfort measures, when to medicate
- For rash: monitoring approach, glass-test for petechiae
- For ER_NOW tiers: skip home care and lead with "head to the ER — call 911 if [specific scenario]"

WARNING_SIGNS
5–8 specific, scannable warning signs that would CHANGE the recommendation upward. Each bullet starts with "- ". Be concrete and specific to the child's presentation:
- "If the fever climbs above 104°F (40°C) — escalate"
- "If they become difficult to wake or unusually quiet — go to the ER"
- "If you see any small purple or red spots that don't fade when you press on them with a clear glass — go to the ER immediately"
- "If breathing becomes labored, with the ribs sucking in below them or grunting with each breath — go to the ER"
- "If they haven't had a wet diaper in [age-appropriate timeframe] — call your pediatrician"
- Tailor to the symptoms and age provided. Do NOT use generic warning signs.

COMMON_WORRIES
2–3 short paragraphs (one paragraph each, separated by a blank line) that proactively address the real anxieties parents have about THIS specific presentation — informed by what parents actually Google at 2am. Examples to model on:
- For high fever in a healthy older child: "Fever itself doesn't cause brain damage — fevers caused by infection don't go that high. Febrile seizures are scary to witness but almost always harmless and don't cause lasting effects."
- For respiratory infection: gentle real-talk about croup vs. RSV vs. common cold and what's actually concerning versus what just sounds bad
- For rash: how to distinguish viral exanthem from the rashes that need urgent care
Address the worry directly. Do not be dismissive. Do not be alarmist.

TRUST_YOUR_INSTINCT
One short, sincere paragraph (2–4 sentences). Always include this closing message: if you feel something is wrong with your child even if this guidance said "watch at home," trust that instinct and seek care. Parents know their children better than any tool. This tool should never make a parent feel silly for going to the doctor or ER. Use warm, direct language. Do not hedge.${langInstruction}`;
}

const VALID_TIERS = new Set(["simple", "medium", "expert"]);

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "ai-heavy");
  if (_rl) return _rl;
  try {
    const body = (await request.json()) as {
      ageMonths?: number | null;
      ageYears?: number | null;
      weight?: string;
      concerns?: string[];
      concernDescription?: string;
      tempValue?: string;
      tempUnit?: string;
      tempMethod?: string;
      duration?: string;
      otherContext?: string;
      tier?: Tier;
      language?: string;
    };

    const {
      ageMonths = null,
      ageYears = null,
      weight = "",
      concerns = [],
      concernDescription = "",
      tempValue = "",
      tempUnit = "F",
      tempMethod = "",
      duration = "",
      otherContext = "",
      tier = "medium",
      language = "en",
    } = body;

    const ageProvided =
      (typeof ageMonths === "number" && ageMonths >= 0) ||
      (typeof ageYears === "number" && ageYears > 0);

    if (!ageProvided) {
      return NextResponse.json(
        { error: "Please tell us your child's age — it's the most important field for this kind of guidance." },
        { status: 400 }
      );
    }

    const hasConcern =
      (Array.isArray(concerns) && concerns.length > 0) ||
      (typeof concernDescription === "string" && concernDescription.trim().length > 0);

    if (!hasConcern) {
      return NextResponse.json(
        { error: "Please tell us what's worrying you about your child — pick a concern or describe it." },
        { status: 400 }
      );
    }

    const tierClean: Tier = VALID_TIERS.has(tier) ? tier : "medium";

    const contextBlock = buildContextBlock({
      ageMonths: typeof ageMonths === "number" ? ageMonths : null,
      ageYears: typeof ageYears === "number" ? ageYears : null,
      weight: weight.trim().slice(0, 40),
      concerns: Array.isArray(concerns) ? concerns.slice(0, 12).map((c) => String(c).slice(0, 60)) : [],
      concernDescription: concernDescription.trim().slice(0, 800),
      tempValue: tempValue.trim().slice(0, 10),
      tempUnit: tempUnit === "C" ? "C" : "F",
      tempMethod: tempMethod.trim().slice(0, 30),
      duration: duration.trim().slice(0, 60),
      otherContext: otherContext.trim().slice(0, 800),
    });

    const message = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 3500,
      system: buildSystemPrompt(tierClean, language),
      messages: [
        {
          role: "user",
          content: `My child is sick. Please assess and give me clear triage guidance.\n\n${contextBlock}`,
        },
      ],
    });

    const text =
      message.content[0].type === "text" ? message.content[0].text : "";

    return NextResponse.json({ text });
  } catch (err) {
    console.error("pediatric API error:", err);
    return NextResponse.json(
      { error: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
