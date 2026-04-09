import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

interface FlagItem {
  marker: string;
  value: string;
  unit: string;
  reference: string;
  status: "high" | "low" | "normal";
}

interface QuestionsRequest {
  mode: "lab" | "radiology";
  flags: FlagItem[];
  specialist?: string;
  action?: string;
  simple?: string;
  language?: string;
}

export async function POST(request: NextRequest) {
  try {
    const body: QuestionsRequest = await request.json();
    const { mode, flags, specialist, action, simple, language = "en" } = body;

    // Build a plain-text summary of abnormal/notable findings
    const notableFlags = flags.filter((f) => f.status !== "normal");
    const allFlags = flags.length > 0 ? flags : [];

    const findingLines =
      allFlags.length > 0
        ? allFlags
            .map(
              (f) =>
                `- ${f.marker}: ${f.value} ${f.unit} (reference: ${f.reference}, status: ${f.status})`
            )
            .join("\n")
        : "No specific flagged values provided.";

    const contextLines: string[] = [];
    if (findingLines) contextLines.push(`Findings / Flagged Values:\n${findingLines}`);
    if (specialist)   contextLines.push(`Specialist recommendation: ${specialist}`);
    if (action)       contextLines.push(`Recommended action: ${action}`);
    if (simple)       contextLines.push(`Plain-language summary: ${simple}`);

    const isRadiology = mode === "radiology";

    const systemPrompt = isRadiology
      ? `You are a patient advocate and medical communication expert at Meridix Labs. Your job is to help patients prepare for their doctor appointments after receiving a radiology or pathology report interpretation.

Given the imaging findings and clinical context, generate exactly 5 specific, well-phrased questions the patient should ask their doctor. Each question must:
- Reference specific findings, measurements, or diagnoses from the report (e.g., "the 4 mm lung nodule")
- Be written from the patient's first-person perspective
- Be clear, polite, and appropriately detailed — not vague
- Address practical concerns: next steps, follow-up imaging, urgency, specialists, and what to watch for
- Never be alarmist — frame questions with curiosity and calm, not fear

Format your response as a JSON array of exactly 5 strings. Each string is one complete question. Return ONLY valid JSON, no markdown fences, no extra text.

Example format:
["Question 1 here?", "Question 2 here?", "Question 3 here?", "Question 4 here?", "Question 5 here?"]`
      : `You are a patient advocate and medical communication expert at Meridix Labs. Your job is to help patients prepare for their doctor appointments after receiving lab result interpretations.

Given the lab results and clinical context, generate exactly 5 specific, well-phrased questions the patient should ask their doctor. Each question must:
- Reference specific lab values, markers, and numbers from their results (e.g., "my glucose came back at 112 mg/dL")
- Be written from the patient's first-person perspective
- Be clear, polite, and specific — not vague or generic
- Address practical concerns: further testing, lifestyle changes, medications, follow-up, and what the numbers mean for their health
- Match the patient's actual values — do not make up numbers or markers not mentioned
- Never be alarmist — frame questions with curiosity and calm, not fear

Format your response as a JSON array of exactly 5 strings. Each string is one complete question. Return ONLY valid JSON, no markdown fences, no extra text.

Example format:
["Question 1 here?", "Question 2 here?", "Question 3 here?", "Question 4 here?", "Question 5 here?"]`;

    const userPrompt = `Please generate 5 specific patient questions based on these results.

Report type: ${isRadiology ? "Radiology / Pathology Report" : "Lab Results"}
Language for output: ${language}

${contextLines.join("\n\n")}

${notableFlags.length === 0 && allFlags.length > 0 ? "All values are within normal range — focus questions on understanding results, confirming normalcy, and general follow-up." : ""}`;

    const response = await client.messages.create({
      model: "claude-sonnet-4-0",
      max_tokens: 800,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
    });

    const rawText =
      response.content[0].type === "text" ? response.content[0].text : "";

    let questions: string[];

    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      questions = JSON.parse(cleaned);
      if (!Array.isArray(questions)) throw new Error("Not an array");
      questions = questions.slice(0, 5).map(String);
    } catch {
      // Fallback: split on numbered lines
      const lines = rawText
        .split(/\n/)
        .map((l) => l.replace(/^\d+[\.\)]\s*/, "").replace(/^["']|["']$/g, "").trim())
        .filter((l) => l.length > 20 && l.endsWith("?"));
      questions = lines.slice(0, 5);
    }

    if (questions.length === 0) {
      return NextResponse.json(
        { error: "Could not generate questions. Please try again." },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, questions });
  } catch (error) {
    console.error("Questions API error:", error);

    if (error instanceof Anthropic.APIError) {
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Too many requests. Please wait a moment and try again." },
          { status: 429 }
        );
      }
      if (error.status === 401) {
        return NextResponse.json(
          { error: "AI service configuration error." },
          { status: 500 }
        );
      }
    }

    return NextResponse.json(
      { error: "Something went wrong generating questions. Please try again." },
      { status: 500 }
    );
  }
}
