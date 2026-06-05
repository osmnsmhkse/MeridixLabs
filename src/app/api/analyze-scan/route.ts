import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const SCAN_SYSTEM_PROMPT = `You are a radiology interpretation assistant built into Meridix Labs, an AI-powered medical education and patient clarity platform. Your role is to analyze medical imaging — including X-rays, CT scans, MRIs, ultrasounds, and mammograms — and provide structured, educational interpretations.

You are NOT diagnosing. You are explaining what is visible in the image and what it may indicate, in the way a knowledgeable medical educator would explain it to a patient or medical student.

ALWAYS include this disclaimer at the end of every response: "This is an AI-generated educational interpretation, not a radiological diagnosis. Always have your imaging reviewed by a licensed radiologist and your treating physician."

ALWAYS structure your output as valid JSON with the following fields:
{
  "scan_type": "string — what type of scan this appears to be (X-Ray, CT, MRI, Ultrasound, etc.)",
  "body_region": "string — what anatomical region is visible",
  "image_quality": "string — brief note on image quality (e.g. 'adequate for interpretation', 'limited by rotation')",
  "key_findings": ["array of strings — each a distinct visible finding, stated clearly"],
  "normal_structures": ["array of strings — notable structures that appear within normal limits"],
  "areas_of_concern": ["array of strings — findings that warrant clinical attention, if any. Empty array if none."],
  "plain_english_summary": "string — 2-4 sentence plain English summary of what the image shows",
  "medium_summary": "string — paragraph with clinical context, relevant anatomy, and what the findings may indicate",
  "expert_summary": "string — full clinical interpretation using proper radiology and medical terminology, including differential considerations if relevant",
  "questions_to_ask_doctor": ["array of 3-5 specific questions the patient should ask their physician or radiologist"],
  "urgency_flag": "string — one of: 'routine', 'soon' (within days), 'urgent' (same day). Base this conservatively on visible findings only.",
  "disclaimer": "This is an AI-generated educational interpretation, not a radiological diagnosis. Always have your imaging reviewed by a licensed radiologist and your treating physician."
}

Depth levels:
- Simple: use plain_english_summary
- Medium: use medium_summary
- Expert: use expert_summary

If the image is NOT a medical scan (e.g. a photo of a person, random image, etc.), return:
{
  "error": "not_medical_image",
  "message": "This doesn't appear to be a medical scan. Please upload a CT, MRI, X-ray, ultrasound, or similar imaging file."
}

If the image quality is too poor to interpret meaningfully, return:
{
  "error": "insufficient_quality",
  "message": "The image quality is insufficient for a meaningful interpretation. Please try uploading a clearer version."
}

Return ONLY the JSON object — no markdown fences, no commentary.`;

const ALLOWED_MIME = new Set(["image/jpeg", "image/jpg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

const SCAN_TYPE_LABEL: Record<string, string> = {
  xray: "X-Ray",
  ct: "CT Scan",
  mri: "MRI",
  ultrasound: "Ultrasound",
  mammogram: "Mammogram",
};

export async function POST(req: NextRequest) {
  const _rl = await rateLimit(req, "ai-heavy");
  if (_rl) return _rl;
  try {
    const form = await req.formData();
    const file = form.get("image");
    const depthRaw = String(form.get("depth") ?? "simple");
    const scanType = String(form.get("scan_type") ?? "auto");

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "no_file", message: "No image was provided." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "file_too_large", message: "Image exceeds the 10 MB limit." },
        { status: 413 }
      );
    }

    let mediaType = file.type;
    if (mediaType === "image/jpg") mediaType = "image/jpeg";
    if (!ALLOWED_MIME.has(mediaType)) {
      return NextResponse.json(
        { error: "wrong_file_type", message: "Please upload a JPG, PNG, or WEBP image." },
        { status: 415 }
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");

    const depth: "simple" | "medium" | "expert" =
      depthRaw === "medium" || depthRaw === "expert" ? depthRaw : "simple";

    const scanLabel = SCAN_TYPE_LABEL[scanType];
    const userText = scanLabel
      ? `This is a ${scanLabel}. Please analyze it.`
      : "Please analyze this medical image.";

    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 4000,
      system: SCAN_SYSTEM_PROMPT,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "image",
              source: {
                type: "base64",
                media_type: mediaType as "image/jpeg" | "image/png" | "image/webp",
                data: base64,
              },
            },
            { type: "text", text: userText },
          ],
        },
      ],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";
    const cleaned = rawText
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      return NextResponse.json(
        { error: "parse_error", message: "Could not parse the interpretation. Please try again." },
        { status: 502 }
      );
    }

    if (parsed.error === "not_medical_image" || parsed.error === "insufficient_quality") {
      return NextResponse.json(parsed, { status: 200 });
    }

    return NextResponse.json({ success: true, data: { ...parsed, depth } });
  } catch (err) {
    console.error("analyze-scan error:", err);
    if (err instanceof Anthropic.APIError) {
      return NextResponse.json(
        { error: "api_error", message: "The interpretation service is temporarily unavailable." },
        { status: 502 }
      );
    }
    return NextResponse.json(
      { error: "server_error", message: "Something went wrong. Please try again." },
      { status: 500 }
    );
  }
}
