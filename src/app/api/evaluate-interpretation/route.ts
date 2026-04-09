import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import type { PracticeCase } from "../practice-case/route";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

export interface EvaluationResult {
  ai_diagnosis: string;
  ai_interpretation: string;
  student_identified: string;
  student_missed: string;
  educational_notes: string;
  flags_correct: number;
  flags_total: number;
}

export async function POST(request: NextRequest) {
  try {
    const { practiceCase, studentAnswer, difficulty }: {
      practiceCase: PracticeCase;
      studentAnswer: string;
      difficulty: string;
    } = await request.json();

    if (!practiceCase || !studentAnswer?.trim()) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const { patient, labs } = practiceCase;

    const labTable = labs
      .map((l) => `- ${l.marker}: ${l.value} ${l.unit} (ref: ${l.reference}) [${l.status.toUpperCase()}]`)
      .join("\n");

    const abnormalLabs = labs.filter((l) => l.status !== "normal");

    const prompt = `You are a senior clinician and medical educator evaluating a medical student's interpretation of a lab case.

PATIENT CASE:
${patient.complaint}${patient.clinical_context ? "\n" + patient.clinical_context : ""}

LAB VALUES:
${labTable}

STUDENT'S INTERPRETATION:
"${studentAnswer}"

DIFFICULTY LEVEL: ${difficulty}

Your task:
1. Provide the correct, complete clinical interpretation of this case
2. Fairly assess what the student correctly identified (give credit for partially correct observations)
3. Note what important findings or diagnoses the student missed or got wrong
4. Write educational teaching notes explaining the key clinical reasoning, pathophysiology, and what to learn from this case
5. Count how many of the ${abnormalLabs.length} abnormal lab values the student meaningfully identified

Return ONLY valid JSON:
{
  "ai_diagnosis": "<primary diagnosis or top clinical concern in 1 sentence>",
  "ai_interpretation": "<full clinical interpretation paragraph — 3-5 sentences explaining the pattern, what it means, and the most likely diagnosis>",
  "student_identified": "<fair summary of what the student correctly identified — be generous with partial credit>",
  "student_missed": "<key findings, patterns, or diagnoses the student missed or misidentified — be specific>",
  "educational_notes": "<2-4 sentence teaching point explaining the clinical reasoning, relevant pathophysiology, and a practical pearl for the student to remember>",
  "flags_correct": <integer 0–${abnormalLabs.length}>,
  "flags_total": ${abnormalLabs.length}
}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-0",
      max_tokens: 1200,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed: EvaluationResult;
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json({ error: "Failed to evaluate. Please try again." }, { status: 422 });
    }

    return NextResponse.json({ success: true, evaluation: parsed });
  } catch (err) {
    console.error("evaluate-interpretation error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
