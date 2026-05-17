import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { LabValue, PracticeCase } from "@/types/learn";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Re-export for any external consumers still importing from this route.
// Prefer @/types/learn for new code.
export type { LabValue, PracticeCase };

const DIFFICULTY_GUIDANCE = {
  beginner: `Generate a straightforward case with 1–2 clearly abnormal values pointing to a single common condition (e.g., type 2 diabetes, iron-deficiency anemia, hypothyroidism, UTI). Include 6–8 lab values total. At least 4 should be normal.`,
  intermediate: `Generate a moderately complex case with 3–4 abnormal values forming a recognizable clinical pattern (e.g., CKD with anemia and electrolyte imbalances, liver disease with coagulopathy, Cushing's syndrome, metabolic syndrome). Include 8–10 lab values.`,
  advanced: `Generate a complex, multi-system case with 5+ abnormal values that require synthesis to diagnose (e.g., DKA, rhabdomyolysis, SIADH, adrenal insufficiency, TTP, paraneoplastic syndrome, uncommon endocrine disorder). Include 10–12 lab values. Some values should have subtle abnormalities requiring clinical expertise.`,
};

const SPECIALTY_GUIDANCE: Record<string, string> = {
  mixed:         "Choose any medical specialty — vary across cardiology, endocrinology, nephrology, hematology, hepatology, and pulmonology.",
  cardiology:    "Focus on cardiovascular conditions: heart failure, ACS, arrhythmias, hypertensive emergency, lipid disorders, cardiac biomarkers (troponin, BNP, CK-MB). Include relevant cardiac labs.",
  endocrinology: "Focus on endocrine conditions: diabetes (type 1/2, DKA, HHS), thyroid disorders (hypo/hyperthyroidism, thyroid storm), adrenal conditions (Cushing's, Addison's, pheochromocytoma), pituitary disorders, calcium/parathyroid disorders, PMOS.",
  nephrology:    "Focus on renal conditions: acute kidney injury, CKD, nephrotic/nephritic syndrome, electrolyte disorders (hypo/hypernatremia, hypo/hyperkalemia, acid-base disturbances). Include BMP/CMP with eGFR and urine markers.",
  hematology:    "Focus on blood conditions: anemia (iron deficiency, B12/folate, hemolytic, aplastic), polycythemia, leukemia patterns, lymphoma markers, bleeding/clotting disorders (hemophilia, TTP, DIC, thrombocytopenia). Include CBC with differential.",
  hepatology:    "Focus on liver/GI conditions: hepatitis (viral, alcoholic, autoimmune), cirrhosis, acute liver failure, cholestatic disease, pancreatitis, GI bleeding. Include LFTs, bilirubin, albumin, coagulation studies.",
  pulmonology:   "Focus on respiratory conditions: COPD exacerbation, pneumonia, pulmonary embolism, interstitial lung disease, pulmonary hypertension, respiratory failure (ABG interpretation). Include ABG values, CBC, BNP, D-dimer where relevant.",
};

export async function POST(request: NextRequest) {
  try {
    const { difficulty = "beginner", specialty = "mixed" } = await request.json();

    const diffGuide = DIFFICULTY_GUIDANCE[difficulty as keyof typeof DIFFICULTY_GUIDANCE] ?? DIFFICULTY_GUIDANCE.beginner;
    const specGuide = SPECIALTY_GUIDANCE[specialty] ?? SPECIALTY_GUIDANCE.mixed;

    const prompt = `You are a medical educator generating a realistic, anonymized practice case for a medical student or resident.

DIFFICULTY: ${difficulty}
${diffGuide}

SPECIALTY FOCUS: ${specialty}
${specGuide}

Generate a fictional but clinically realistic patient case. Return ONLY valid JSON:
{
  "patient": {
    "age": <number>,
    "sex": "<male|female>",
    "complaint": "<One sentence chief complaint including age, sex, and presenting symptoms. E.g. 'A 54-year-old male presenting with fatigue, increased thirst, and frequent urination for 3 months.'>",
    "clinical_context": "<1–2 sentences of additional context: relevant PMH, current medications, pertinent physical exam findings, or social history that aids clinical reasoning>"
  },
  "labs": [
    { "marker": "<test name>", "value": "<numeric value>", "unit": "<unit>", "reference": "<range e.g. 3.5–5.1 or <5.7>", "status": "<normal|high|low>" }
  ],
  "hints": [
    "<Hint 1: Draw attention to one specific finding or relationship between values without naming the diagnosis. E.g. 'Notice the relationship between two of the metabolic markers — they often move together in one condition.'>",
    "<Hint 2: Name the organ system and type of abnormality. E.g. 'This is an endocrine disorder affecting carbohydrate metabolism — think about what regulates blood glucose.'>",
    "<Hint 3: Near-answer hint naming the pathophysiological mechanism. E.g. 'The combination of elevated glucose and HbA1c with normal kidneys suggests impaired insulin secretion or action rather than secondary hyperglycemia.'>"
  ],
  "learning_tags": ["<Concept 1>", "<Concept 2>", "<Concept 3>", "<Concept 4 optional>"]
}

Rules:
- Use realistic adult reference ranges
- All lab values must be clinically consistent with each other and the chief complaint
- The case must be diagnosable from the labs and clinical context given
- Never use real patient names or identifiers
- Hints must be progressive: hint 1 is subtle, hint 3 is near-explicit
- Learning tags should be 2-4 word clinical concepts (e.g. "Type 2 Diabetes", "Insulin Resistance", "HbA1c Monitoring")
- Return ONLY the JSON object, no markdown fences, no extra text`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-0",
      max_tokens: 2000,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed: PracticeCase;
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(cleaned);
      if (!parsed.patient || !Array.isArray(parsed.labs)) throw new Error("Invalid structure");
      if (!Array.isArray(parsed.hints) || parsed.hints.length < 3) {
        parsed.hints = ["Look carefully at each value relative to its reference range.", "Focus on which organ system these abnormalities point to.", "Consider the most common condition causing this lab pattern."];
      }
      if (!Array.isArray(parsed.learning_tags)) parsed.learning_tags = [];
    } catch {
      return NextResponse.json({ error: "Failed to generate case. Please try again." }, { status: 422 });
    }

    return NextResponse.json({ success: true, case: parsed });
  } catch (err) {
    console.error("practice-case error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
