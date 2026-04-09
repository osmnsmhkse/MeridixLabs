import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

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

function buildSystemPrompt(languageName: string): string {
  return `You are a senior medical expert at Meridix Labs. You will receive an image or PDF of a medical lab result. Your job is to analyze the results thoroughly and return a JSON object with the following fields. All text content MUST be written in ${languageName}.

Fields required:

1. "simple" — A warm, plain-language explanation for someone with no medical background. Avoid all jargon. Explain like you would to a worried friend.

2. "medium" — An explanation for an educated patient who wants context and understands basic biology. Use some medical terms but explain them briefly.

3. "expert" — Full clinical-level interpretation for a physician or medical student. Use standard medical terminology, reference ranges, clinical implications, and relevant guidelines.

4. "etiology" — A detailed explanation of the POSSIBLE CAUSES of any abnormal values found. What lifestyle factors, conditions, medications, or diseases could cause these specific results? Be comprehensive and educational.

5. "mechanism" — Explain the BIOLOGICAL MECHANISM behind the abnormal findings. What is happening at the physiological or cellular level? Why does the body produce these values when something is wrong?

6. "diseases" — List and briefly explain the POSSIBLE CONDITIONS OR DISEASES this pattern of results may be associated with. Include both common and important rare ones. Do not diagnose — explain possibilities.

7. "specialist" — State clearly WHICH MEDICAL SPECIALIST(S) the patient should consider seeing based on these results. Be specific (e.g., "Endocrinologist for glucose/thyroid issues", "Cardiologist for lipid abnormalities", "Nephrologist for kidney markers"). If results are normal, say so.

8. "action" — A concise, practical recommendation: what should the patient do next? Is it urgent, semi-urgent, or routine?

9. "flags" — An array of notable lab markers: { marker, value, unit, reference, status } where status is "high", "low", or "normal". Only include clinically notable markers.

Always be accurate, warm, thorough, and never alarmist. Never make a definitive diagnosis — you are explaining possibilities, not diagnosing. Be educational and empowering.

Return ONLY valid JSON, no markdown fences, no extra text. Example structure:
{
  "simple": "string",
  "medium": "string",
  "expert": "string",
  "etiology": "string",
  "mechanism": "string",
  "diseases": "string",
  "specialist": "string",
  "action": "string",
  "flags": [
    { "marker": "Glucose", "value": "112", "unit": "mg/dL", "reference": "70–99", "status": "high" }
  ]
}`;
}

const SAMPLE_REPORT_TEXT = `
BASIC METABOLIC PANEL
Patient: Demo Patient
Date: 2026-04-09

TEST              RESULT    UNITS     REFERENCE RANGE   FLAG
-------------------------------------------------------------
Glucose           112       mg/dL     70 - 99           HIGH
Sodium            134       mEq/L     136 - 145         LOW
Potassium         3.4       mEq/L     3.5 - 5.1         LOW
Chloride          101       mEq/L     98 - 107          Normal
CO2 (Bicarbonate) 21        mEq/L     22 - 29           LOW
BUN               22        mg/dL     7 - 20            HIGH
Creatinine        0.9       mg/dL     0.7 - 1.2         Normal
Calcium           10.8      mg/dL     8.5 - 10.2        HIGH

eGFR: >60 mL/min/1.73m²
`.trim();

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const isSample = formData.get("sample") === "true";
    const file = formData.get("file") as File | null;
    const langCode = (formData.get("language") as string) || "en";
    const languageName = LANGUAGE_NAMES[langCode] || "English";

    let messageContent: Anthropic.MessageParam["content"];

    if (isSample) {
      // Use the pre-defined sample report as plain text — no file needed
      messageContent = [
        {
          type: "text",
          text: `Please analyze this medical lab report and return the full JSON interpretation as instructed.\n\n${SAMPLE_REPORT_TEXT}`,
        },
      ];
    } else {
      if (!file) {
        return NextResponse.json({ error: "No file provided" }, { status: 400 });
      }

      const allowedTypes = ["image/jpeg", "image/jpg", "image/png", "image/webp", "application/pdf"];
      if (!allowedTypes.includes(file.type)) {
        return NextResponse.json(
          { error: "Unsupported file type. Please upload a PDF, JPG, or PNG." },
          { status: 400 }
        );
      }

      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        return NextResponse.json(
          { error: "File too large. Maximum size is 10MB." },
          { status: 400 }
        );
      }

      const fileBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(fileBuffer).toString("base64");

      if (file.type === "application/pdf") {
        messageContent = [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64Data },
          } as Anthropic.DocumentBlockParam,
          { type: "text", text: "Please analyze this medical lab report and return the full JSON interpretation as instructed." },
        ];
      } else {
        const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        messageContent = [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Data },
          } as Anthropic.ImageBlockParam,
          { type: "text", text: "Please analyze this medical lab report and return the full JSON interpretation as instructed." },
        ];
      }
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-0",
      max_tokens: 6000,
      system: buildSystemPrompt(languageName),
      messages: [{ role: "user", content: messageContent }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed: {
      simple: string;
      medium: string;
      expert: string;
      etiology?: string;
      mechanism?: string;
      diseases?: string;
      specialist?: string;
      action: string;
      flags: Array<{ marker: string; value: string; unit: string; reference: string; status: "high" | "low" | "normal" }>;
    };

    try {
      const cleaned = rawText
        .replace(/^```json\s*/i, "")
        .replace(/^```\s*/i, "")
        .replace(/\s*```$/i, "")
        .trim();
      parsed = JSON.parse(cleaned);
    } catch {
      parsed = {
        simple: rawText,
        medium: rawText,
        expert: rawText,
        action: "Please consult your doctor to discuss these results in more detail.",
        flags: [],
      };
    }

    if (!parsed.simple || !parsed.medium || !parsed.expert || !parsed.action) {
      return NextResponse.json(
        { error: "The AI could not parse this document as a medical lab result. Please ensure you're uploading a lab report." },
        { status: 422 }
      );
    }

    return NextResponse.json({ success: true, data: parsed });

  } catch (error) {
    console.error("API route error:", error);

    if (error instanceof Anthropic.APIError) {
      const message = error.message ?? "";
      if (message.toLowerCase().includes("credit balance is too low")) {
        return NextResponse.json(
          { error: "The AI service is temporarily unavailable. Please try again shortly." },
          { status: 503 }
        );
      }
      if (error.status === 401) {
        return NextResponse.json(
          { error: "AI service configuration error. Please contact support." },
          { status: 500 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Too many requests right now. Please wait a few seconds and try again." },
          { status: 429 }
        );
      }
      if (error.status >= 500) {
        return NextResponse.json(
          { error: "The AI service is having issues. Please try again in a moment." },
          { status: 503 }
        );
      }
    }

    return NextResponse.json({ error: "Something went wrong. Please try again." }, { status: 500 });
  }
}
