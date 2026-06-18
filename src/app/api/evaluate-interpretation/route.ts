import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import Anthropic from "@anthropic-ai/sdk";
import { IDENTITY_CONFIDENTIALITY } from "@/lib/toolChatConfig";
import type { PracticeCase, KeyFinding, EvaluationResult } from "@/types/learn";

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Re-export for any external consumers still importing from this route.
// Prefer @/types/learn for new code.
export type { KeyFinding, EvaluationResult };

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "ai-heavy");
  if (_rl) return _rl;
  try {
    const {
      practiceCase,
      studentAnswer,
      studentNextStep,
      studentFlaggedMarkers,
      difficulty,
      confidence,
    }: {
      practiceCase: PracticeCase;
      studentAnswer: string;
      studentNextStep?: string;
      studentFlaggedMarkers?: string[];
      difficulty: string;
      confidence?: number;
    } = await request.json();

    if (!practiceCase || !studentAnswer?.trim()) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    const { patient, labs } = practiceCase;
    const abnormalLabs = labs.filter((l) => l.status !== "normal");

    const labTable = labs
      .map((l) => `- ${l.marker}: ${l.value} ${l.unit} (ref: ${l.reference}) [${l.status.toUpperCase()}]`)
      .join("\n");

    const flaggedStr = studentFlaggedMarkers && studentFlaggedMarkers.length > 0
      ? `\nLABS THE STUDENT FLAGGED AS SIGNIFICANT: ${studentFlaggedMarkers.join(", ")}`
      : "";

    const nextStepStr = studentNextStep?.trim()
      ? `\nSTUDENT'S PROPOSED NEXT DIAGNOSTIC STEP: "${studentNextStep}"`
      : "";

    const confidenceStr = confidence
      ? `\nSTUDENT'S SELF-REPORTED CONFIDENCE: ${confidence}/5`
      : "";

    const prompt = `You are a senior clinician and medical educator evaluating a medical student's clinical interpretation of a lab case.

PATIENT CASE:
${patient.complaint}${patient.clinical_context ? "\n" + patient.clinical_context : ""}

LAB VALUES (with actual statuses — not shown to student during the case):
${labTable}
${flaggedStr}

STUDENT'S DIAGNOSIS / INTERPRETATION:
"${studentAnswer}"
${nextStepStr}
${confidenceStr}

DIFFICULTY LEVEL: ${difficulty}
TOTAL ABNORMAL VALUES: ${abnormalLabs.length}

EVALUATION INSTRUCTIONS:
1. Provide the correct, complete clinical interpretation of this case
2. Assess what the student correctly identified — be generous with partial credit for correct reasoning even if terminology differs
3. Note specifically what important findings or diagnoses the student missed or got wrong
4. Write a focused teaching point (2–4 sentences) explaining the key clinical reasoning, relevant pathophysiology, and a practical pearl
5. Score the student holistically 0–100:
   - Abnormal lab identification (via flagging or mention in text): 40 points possible
   - Correct primary diagnosis or clinical concern: 35 points possible
   - Correct next step: 25 points possible
   - Deduct points for clearly wrong diagnoses or dangerous next steps
6. For each abnormal lab value, note whether the student caught it (mentioned it in text OR flagged it)
7. Provide exactly 3 concrete, actionable next clinical steps for this case

Grading scale: A+ ≥90, A ≥80, B ≥65, C ≥50, D <50

Return ONLY valid JSON:
{
  "ai_diagnosis": "<primary diagnosis or top clinical concern — 1 sentence>",
  "ai_interpretation": "<complete clinical interpretation — 3–5 sentences explaining the pattern, pathophysiology, and diagnosis>",
  "student_identified": "<fair summary of what the student correctly identified — include partial credit>",
  "student_missed": "<specific findings, patterns, or diagnoses the student missed or misidentified — use 'Nothing major' if student did well>",
  "educational_notes": "<2–4 sentences: key clinical reasoning, relevant pathophysiology, and one practical pearl for the student to remember>",
  "flags_correct": <integer 0–${abnormalLabs.length}>,
  "flags_total": ${abnormalLabs.length},
  "score_pct": <integer 0–100>,
  "grade": "<A+|A|B|C|D>",
  "key_findings": [
    ${abnormalLabs.map(l => `{ "marker": "${l.marker}", "significance": "<one sentence explaining clinical significance>", "student_caught": <true|false> }`).join(",\n    ")}
  ],
  "next_steps": [
    "<Actionable next step 1 — specific test, referral, or treatment>",
    "<Actionable next step 2>",
    "<Actionable next step 3>"
  ]
}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-0",
      max_tokens: 1800,
      system: IDENTITY_CONFIDENTIALITY,
      messages: [{ role: "user", content: prompt }],
    });

    const raw = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed: EvaluationResult;
    try {
      const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
      parsed = JSON.parse(cleaned);
      if (!parsed.grade) parsed.grade = parsed.score_pct >= 90 ? "A+" : parsed.score_pct >= 80 ? "A" : parsed.score_pct >= 65 ? "B" : parsed.score_pct >= 50 ? "C" : "D";
      if (!Array.isArray(parsed.key_findings)) parsed.key_findings = [];
      if (!Array.isArray(parsed.next_steps)) parsed.next_steps = [];
    } catch {
      return NextResponse.json({ error: "Failed to evaluate. Please try again." }, { status: 422 });
    }

    return NextResponse.json({ success: true, evaluation: parsed });
  } catch (err) {
    console.error("evaluate-interpretation error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
