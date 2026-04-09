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

function buildRadiologySystemPrompt(languageName: string): string {
  return `You are a senior radiologist and pathologist at Meridix Labs. You will receive an image or PDF of a radiology report (CT, MRI, X-ray, ultrasound, PET) or a pathology/biopsy report. Your job is to interpret it thoroughly for the patient and return a JSON object with the following fields. All text content MUST be written in ${languageName}.

Fields required:

1. "simple" — A warm, plain-language explanation for someone with no medical background. Begin by identifying the imaging modality and body area (e.g., "This is a CT scan of your chest"). Then explain all findings in plain language. Clearly distinguish what is normal, what is a harmless incidental finding, and what may need follow-up. Never use alarming language for incidental findings. End with reassurance to confirm everything with their ordering physician.

2. "medium" — An explanation for an educated patient who understands basic anatomy. Name findings using proper anatomical terms and explain what they mean clinically. Clearly state which findings are incidental (very common, clinically insignificant) and which warrant further evaluation. Use phrases like "incidental finding," "benign appearance," or "warrants follow-up."

3. "expert" — Full clinical-level interpretation for a physician or radiology resident. Use standard radiological terminology (e.g., "hypodense lesion," "ground-glass opacity," "T2 hyperintense signal"). Describe each finding with location, size (if stated), morphology, and clinical significance. Reference appropriate imaging guidelines (e.g., Fleischner Society, ACR, BI-RADS, LI-RADS) where applicable.

4. "etiology" — For the most significant finding(s), explain the POSSIBLE CAUSES. What conditions, processes, or risk factors could produce this imaging appearance? Be comprehensive but measured — do not imply the worst-case scenario is likely.

5. "mechanism" — Explain the PATHOPHYSIOLOGICAL MECHANISM of the key finding(s). What is happening at the tissue or organ level that produces this appearance on imaging?

6. "diseases" — List POSSIBLE CONDITIONS OR DIAGNOSES associated with the key findings. Include the most common (benign) explanation first, then progressively less likely ones. Always note if malignancy is on the differential only to acknowledge it exists — never lead with it for ambiguous findings.

7. "specialist" — State which SPECIALIST(S) the patient should see to discuss these results. Be specific (e.g., "Pulmonologist for the lung nodule," "Gastroenterologist for the liver finding," "Radiologist for follow-up imaging"). Always add: recommend discussing these results with the ordering physician first.

8. "action" — A concise, practical next-step recommendation. Distinguish clearly: is this urgent (e.g., finding requires same-day evaluation), semi-urgent (e.g., follow-up within weeks), routine (e.g., annual surveillance), or reassuring (no action needed)? Always emphasize confirming with the ordering physician.

9. "flags" — An array of the key imaging findings as structured items: { marker, value, unit, reference, status } where:
   - "marker" is the finding name (e.g., "Pulmonary Nodule", "Hepatic Cyst", "Adrenal Adenoma")
   - "value" is the size or key descriptor (e.g., "4", "1.2", "incidental")
   - "unit" is the measurement unit or qualifier (e.g., "mm", "cm", "finding")
   - "reference" is what would be normal or the threshold for concern (e.g., "< 6mm low risk", "typically benign", "normal < 1cm")
   - "status" is "high" (warrants attention/follow-up), "low" (incidental/benign, no action), or "normal" (expected finding)
   Only include findings explicitly mentioned in the report.

CRITICAL INSTRUCTIONS:
- NEVER catastrophize incidental findings. A simple renal or hepatic cyst, adrenal adenoma, or small lung nodule below surveillance threshold is almost always benign — say so clearly.
- ALWAYS recommend the patient discuss these results with their ordering physician before drawing any conclusions.
- The most clinically significant finding should be the first item in the "flags" array.
- If the report is entirely normal, say so warmly and clearly in all tiers.
- Do not diagnose — you are interpreting possibilities and explaining the imaging findings.

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
    { "marker": "Pulmonary Nodule", "value": "4", "unit": "mm", "reference": "< 6mm low risk (Fleischner)", "status": "low" }
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
    const mode = (formData.get("mode") as string) || "lab";

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

      const analyzePrompt = mode === "radiology"
        ? "Please analyze this radiology or pathology report and return the full JSON interpretation as instructed."
        : "Please analyze this medical lab report and return the full JSON interpretation as instructed.";

      if (file.type === "application/pdf") {
        messageContent = [
          {
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64Data },
          } as Anthropic.DocumentBlockParam,
          { type: "text", text: analyzePrompt },
        ];
      } else {
        const mediaType = file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp";
        messageContent = [
          {
            type: "image",
            source: { type: "base64", media_type: mediaType, data: base64Data },
          } as Anthropic.ImageBlockParam,
          { type: "text", text: analyzePrompt },
        ];
      }
    }

    const systemPrompt = mode === "radiology"
      ? buildRadiologySystemPrompt(languageName)
      : buildSystemPrompt(languageName);

    const response = await client.messages.create({
      model: "claude-sonnet-4-0",
      max_tokens: 6000,
      system: systemPrompt,
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
