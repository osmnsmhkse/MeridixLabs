import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface TrialCategory {
  condition: string;
  condition_query: string; // URL-encoded for ClinicalTrials.gov ?cond=
  description: string;     // one plain-English sentence of what trials typically involve
  url: string;
}

export async function POST(request: NextRequest) {
  try {
    const { flags } = await request.json() as {
      flags: Array<{ marker: string; value: string; unit: string; reference: string; status: string }>;
    };

    const abnormal = flags.filter((f) => f.status !== "normal");

    if (abnormal.length === 0) {
      return NextResponse.json({ trials: [] });
    }

    const flagLines = abnormal
      .map((f) => `${f.marker}: ${f.value} ${f.unit} (ref: ${f.reference}, ${f.status.toUpperCase()})`)
      .join("\n");

    const prompt = `A patient's lab results show the following abnormal values:

${flagLines}

Based on these abnormal lab values:
1. Identify the 2–3 most likely medical condition categories these values suggest (e.g., "Type 2 Diabetes", "Iron-Deficiency Anemia", "Chronic Kidney Disease", "Hypothyroidism", "Dyslipidemia").
2. For each condition category, write a single plain-English sentence describing what clinical trials for that condition typically involve (e.g., what intervention is being tested: medication, lifestyle change, device, etc.).
3. Provide the exact search term to use on ClinicalTrials.gov (use the most standard clinical name that gets the most relevant results).

Rules:
- Choose only condition categories, not specific drugs or procedures.
- Use the standard clinical name that ClinicalTrials.gov recognises (e.g., "Type 2 Diabetes Mellitus", "Iron Deficiency Anemia", "Chronic Kidney Disease").
- Write descriptions for patients, not clinicians — avoid jargon.
- Never suggest a definitive diagnosis. Frame as "conditions commonly associated with these lab patterns."
- Return ONLY valid JSON, no markdown:

[
  {
    "condition": "Human-readable condition name",
    "condition_query": "URL-safe search term for ClinicalTrials.gov (use + for spaces)",
    "description": "One sentence describing what trials for this condition typically involve."
  }
]`;

    const response = await client.messages.create({
      model: "claude-haiku-4-5",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "[]";

    let parsed: Array<{ condition: string; condition_query: string; description: string }>;
    try {
      const cleaned = raw
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
      if (!Array.isArray(parsed)) throw new Error("Not an array");
    } catch {
      return NextResponse.json({ error: "Failed to generate trial categories." }, { status: 422 });
    }

    const trials: TrialCategory[] = parsed.slice(0, 3).map((item) => ({
      condition: item.condition,
      condition_query: item.condition_query,
      description: item.description,
      url: `https://clinicaltrials.gov/search?cond=${encodeURIComponent(item.condition_query.replace(/\+/g, " "))}`,
    }));

    return NextResponse.json({ trials });
  } catch (err) {
    console.error("clinical-trials error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
