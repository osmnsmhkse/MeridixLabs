import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface LabValue {
  marker: string;
  value: string;
  unit: string;
  reference: string;
  status: "normal" | "high" | "low";
}

export interface PracticeCase {
  patient: { age: number; sex: "male" | "female"; complaint: string; clinical_context?: string };
  labs: LabValue[];
}

const DIFFICULTY_GUIDANCE = {
  beginner: `Generate a straightforward case with 1-2 clearly abnormal values pointing to a single common condition (e.g., type 2 diabetes, iron-deficiency anemia, hypothyroidism, UTI). Include 6-8 lab values. At least 4 should be normal to make the abnormals stand out clearly.`,
  intermediate: `Generate a moderately complex case with 3-4 abnormal values forming a recognizable clinical pattern (e.g., CKD with anemia and electrolyte imbalances, liver disease with coagulopathy, Cushing's syndrome, metabolic syndrome). Include 8-10 lab values.`,
  advanced: `Generate a complex, multi-system case with 5+ abnormal values that require synthesis to diagnose (e.g., DKA, rhabdomyolysis, SIADH, adrenal insufficiency, TTP, paraneoplastic syndrome, uncommon endocrine disorder). Include 10 lab values. Some values should have subtle abnormalities that require clinical knowledge to recognize as significant.`,
};

export async function POST(request: NextRequest) {
  try {
    const { difficulty = "beginner" } = await request.json();

    const guidance = DIFFICULTY_GUIDANCE[difficulty as keyof typeof DIFFICULTY_GUIDANCE] ?? DIFFICULTY_GUIDANCE.beginner;

    const prompt = `You are a medical educator generating a realistic, anonymized practice case for a medical student.

${guidance}

Generate a fictional but clinically realistic patient case. Return ONLY valid JSON with this exact structure:
{
  "patient": {
    "age": <number>,
    "sex": "<male|female>",
    "complaint": "<one sentence chief complaint, e.g. 'A 54-year-old male presenting with fatigue, increased thirst, and frequent urination for 3 months.'>",
    "clinical_context": "<optional 1-2 sentence additional context such as PMH, medications, or exam findings>"
  },
  "labs": [
    { "marker": "<test name>", "value": "<numeric value>", "unit": "<unit>", "reference": "<range e.g. 3.5–5.1>", "status": "<normal|high|low>" }
  ]
}

Rules:
- Use realistic reference ranges for adult patients
- Values must be clinically consistent with each other and the chief complaint
- Include a mix of CBC, BMP/CMP, and relevant specific markers for the case
- Never use real patient names or identifiers
- The case must be solvable from the lab values given
- Return ONLY the JSON object, no markdown fences, no extra text`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-0",
      max_tokens: 1500,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed: PracticeCase;
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(cleaned);
      if (!parsed.patient || !Array.isArray(parsed.labs)) throw new Error("Invalid structure");
    } catch {
      return NextResponse.json({ error: "Failed to generate case. Please try again." }, { status: 422 });
    }

    return NextResponse.json({ success: true, case: parsed });
  } catch (err) {
    console.error("practice-case error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
