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

function buildPatientContext(age: string | null, sex: string | null, medications: string | null): string {
  const sexLabel = sex === "male" ? "male" : sex === "female" ? "female" : null;
  const parts: string[] = [];

  if (age && sexLabel) {
    parts.push(`Patient is a ${age}-year-old ${sexLabel}. Adjust reference ranges and clinical interpretation accordingly. For example, note that creatinine ranges differ between males and females, and certain values like PSA are male-specific.`);
  } else if (age) {
    parts.push(`Patient is ${age} years old. Adjust clinical interpretation for age-related reference ranges where applicable.`);
  } else if (sexLabel) {
    parts.push(`Patient is ${sexLabel}. Adjust reference ranges and clinical interpretation for sex-specific values (e.g., creatinine, hemoglobin, PSA).`);
  }

  if (medications) {
    parts.push(`The patient is currently taking: ${medications}. Flag any lab values that may be directly affected or caused by these medications. For example: statins affect liver enzymes (AST, ALT), metformin may affect B12 levels, ACE inhibitors may raise creatinine and potassium, corticosteroids raise glucose, diuretics affect electrolytes. Note these connections explicitly in the interpretation and in the "medication_context" field.`);
  }

  return parts.length > 0
    ? `\n\nIMPORTANT PATIENT CONTEXT: ${parts.join(" ")} Reference this context where clinically relevant throughout all interpretation tiers.`
    : "";
}

function buildHealthCrossRefInstruction(hasHealth: boolean): string {
  if (!hasHealth) return "";
  return `

WEARABLE / APPLE HEALTH DATA INCLUDED: The user has also provided an export from Apple Health or a wearable device alongside their lab report. You MUST:
1. Cross-reference the wearable data with the lab results where clinically relevant. Look for patterns such as: elevated resting heart rate correlating with anemia or thyroid issues; poor sleep patterns that may explain elevated cortisol or blood sugar; low daily step counts that may relate to metabolic markers; HRV trends that may reflect autonomic or cardiovascular context.
2. In the "health_insights" field (see below), write 2–4 sentences describing specific connections you found between the wearable data and the lab values. Be specific — mention actual metrics from both sources. Example: "Your Apple Health data shows an elevated resting heart rate of 88 bpm over the past 30 days, which may be consistent with your low hemoglobin level of 10.2 g/dL — anemia can cause the heart to work harder to compensate for reduced oxygen delivery."
3. If no meaningful connections exist, say so briefly and explain why the data is still useful for their overall health picture.
14. "health_insights" — ONLY include this field when wearable/Apple Health data was provided alongside the lab report. Write 2–4 sentences identifying specific patterns or connections between the wearable data and the lab values. Be concrete and reference actual values from both sources. If no clear connection exists, write a brief note explaining what the wearable data suggests about lifestyle factors relevant to these results.`;
}

function buildSystemPrompt(languageName: string, patientContext = "", hasHealthData = false): string {
  const healthInstruction = buildHealthCrossRefInstruction(hasHealthData);
  return `You are a senior medical expert at Meridix Labs.${patientContext} You will receive an image or PDF of a medical lab result. Your job is to analyze the results thoroughly and return a JSON object with the following fields. All text content MUST be written in ${languageName}.

Fields required:

1. "overall_status" — ONE of exactly three string values: "normal" (all values within reference range or clinically insignificant deviations), "amber" (one or two values mildly abnormal and worth discussing with a doctor), or "red" (multiple or significantly abnormal values that need medical attention). Choose based on clinical significance, not just raw flag count.

2. "summary_headline" — A single plain-English sentence (max 2 sentences) summarizing the most important finding(s). Write as if speaking directly to the patient. Example: "Your glucose is slightly elevated and your sodium is a little low — both are worth a conversation with your doctor." Never use alarmist language.

3. "urgency" — ONE of exactly three string values: "routine" (no urgent action needed, standard follow-up), "weeks" (schedule an appointment within a few weeks), or "soon" (discuss with a doctor soon — not urgent but don't delay). Never suggest emergency care.

4. "simple" — A warm, plain-language explanation for someone with no medical background. Avoid all jargon. Explain like you would to a worried friend.

5. "medium" — An explanation for an educated patient who wants context and understands basic biology. Use some medical terms but explain them briefly.

6. "expert" — Full clinical-level interpretation for a physician or medical student. Use standard medical terminology, reference ranges, clinical implications, and relevant guidelines.

7. "etiology" — A detailed explanation of the POSSIBLE CAUSES of any abnormal values found. What lifestyle factors, conditions, medications, or diseases could cause these specific results? Be comprehensive and educational.

8. "mechanism" — Explain the BIOLOGICAL MECHANISM behind the abnormal findings. What is happening at the physiological or cellular level? Why does the body produce these values when something is wrong?

9. "diseases" — List and briefly explain the POSSIBLE CONDITIONS OR DISEASES this pattern of results may be associated with. Include both common and important rare ones. Do not diagnose — explain possibilities.

10. "specialist" — State clearly WHICH MEDICAL SPECIALIST(S) the patient should consider seeing based on these results. Be specific (e.g., "Endocrinologist for glucose/thyroid issues", "Cardiologist for lipid abnormalities", "Nephrologist for kidney markers"). If results are normal, say so.

11. "action" — A concise, practical recommendation: what should the patient do next? Is it urgent, semi-urgent, or routine?

12. "flags" — An array of notable lab markers: { marker, value, unit, reference, status } where status is "high", "low", or "normal". Only include clinically notable markers.

12b. "labs" — REQUIRED. An array containing EVERY measured lab value found in the report (not just abnormal ones), in the order they appear. Same shape: { marker, value, unit, reference, status } where status is "high", "low", or "normal". Use the marker name EXACTLY as written in the report. Use the canonical English biomarker name when the report is in another language (e.g., "Hemoglobin" not "Hemoglobin/HGB", "Vitamin D" not "Vit D 25-OH"). Always include the reference range as a string like "70-99" or "<100" or ">40". For Turkish/non-English reports, translate marker names to English: HEMOGLOBIN→Hemoglobin, GLUKOZ→Glucose, KREATİNİN→Creatinine, KOLESTEROL→Total Cholesterol, HDL KOL→HDL Cholesterol, LDL KOL→LDL Cholesterol, TRİGLİSERİT→Triglycerides, ÜRİK ASİT→Uric Acid, AST→AST, ALT (SGPT)→ALT, GGT→GGT, ALKALEN FOSFATAZ→Alkaline Phosphatase, BİLİRUBİN→Bilirubin, ALBÜMİN→Albumin, DEMİR→Iron, FERRİTİN→Ferritin, FOLAT→Folate, B12→Vitamin B12, D VİTAMİNİ→Vitamin D, TSH→TSH, T3→Free T3, T4→Free T4, KALSİYUM→Calcium, MAGNEZYUM→Magnesium, SODYUM→Sodium, POTASYUM→Potassium, KLOR→Chloride, CRP→CRP, HBA1C→HbA1c, INSULIN→Insulin, TESTOSTERON→Testosterone, etc.

13. "medication_context" — ONLY include this field if the patient provided a medication list. If present, write a plain-language paragraph explaining which of the patient's specific medications may be influencing which lab values in this report, and why. Be specific (e.g., "Your metformin may be affecting your B12 level…"). If no medications were provided, omit this field entirely.

14. "supplements" — ONLY include this field when one or more abnormal (high or low) values are present in the flags. Provide 3–5 specific, actionable supplement or lifestyle recommendations directly tied to the flagged biomarkers. Use this format for each: start with the supplement name and dose in double asterisks (e.g., **Vitamin D3 (2,000 IU/day)**), followed by a colon and a plain-English explanation of which biomarker it targets, why it helps, and a practical note. End each item with a reminder to consult a doctor. Separate recommendations with two newlines. If all values are normal, omit this field entirely. Never recommend supplements for radiology/pathology reports.

Always be accurate, warm, thorough, and never alarmist. Never make a definitive diagnosis — you are explaining possibilities, not diagnosing. Be educational and empowering.

EXTRACT THE REPORT DATE: scan the document for the date the lab/test was performed or collected (look for labels like "Tarih", "Numune Tarihi", "Date", "Collection Date", "Sample Date", "Report Date", "Düzenleme Tarihi", "Rapor Tarihi", or any clearly dated header). Return it in ISO format (YYYY-MM-DD) in the "report_date" field. If multiple dates appear, prefer the COLLECTION/SAMPLE date over the print date. If no date can be found with confidence, set "report_date" to null.

Return ONLY valid JSON, no markdown fences, no extra text. Example structure:
{
  "report_date": "2024-08-15",
  "overall_status": "amber",
  "summary_headline": "Your glucose is slightly elevated and your sodium is a little low — both are worth a conversation with your doctor.",
  "urgency": "weeks",
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
  ],
  "labs": [
    { "marker": "Glucose",     "value": "112", "unit": "mg/dL",  "reference": "70-99",   "status": "high"   },
    { "marker": "Sodium",      "value": "138", "unit": "mEq/L",  "reference": "136-145", "status": "normal" },
    { "marker": "Creatinine",  "value": "0.9", "unit": "mg/dL",  "reference": "0.7-1.2", "status": "normal" }
  ],
  "medication_context": "string (optional — only when medications were provided)",
  "health_insights": "string (optional — only when Apple Health/wearable data was provided)",
  "supplements": "string (optional — only when abnormal values are present)"
}${healthInstruction}`;
}

function buildRadiologySystemPrompt(languageName: string, patientContext = ""): string {
  return `You are a senior radiologist and pathologist at Meridix Labs.${patientContext} You will receive an image or PDF of a radiology report (CT, MRI, X-ray, ultrasound, PET) or a pathology/biopsy report. Your job is to interpret it thoroughly for the patient and return a JSON object with the following fields. All text content MUST be written in ${languageName}.

Fields required:

1. "overall_status" — ONE of exactly three string values: "normal" (report is entirely normal or findings are incidental/benign with no follow-up needed), "amber" (one or two findings that warrant a conversation with a physician but are not urgent), or "red" (findings that need prompt medical attention or specialist referral). Choose based on clinical significance.

2. "summary_headline" — A single plain-English sentence (max 2 sentences) summarizing the most important finding. Write directly to the patient. Example: "Your scan showed a tiny lung nodule — this is extremely common, likely benign, and just needs a routine check in a year." Never use alarming language.

3. "urgency" — ONE of exactly three string values: "routine" (no urgent action, standard follow-up or surveillance), "weeks" (schedule an appointment within a few weeks), or "soon" (discuss with a doctor soon — not an emergency but prompt follow-up warranted). Never suggest emergency care.

4. "simple" — A warm, plain-language explanation for someone with no medical background. Begin by identifying the imaging modality and body area (e.g., "This is a CT scan of your chest"). Then explain all findings in plain language. Clearly distinguish what is normal, what is a harmless incidental finding, and what may need follow-up. Never use alarming language for incidental findings. End with reassurance to confirm everything with their ordering physician.

5. "medium" — An explanation for an educated patient who understands basic anatomy. Name findings using proper anatomical terms and explain what they mean clinically. Clearly state which findings are incidental (very common, clinically insignificant) and which warrant further evaluation. Use phrases like "incidental finding," "benign appearance," or "warrants follow-up."

6. "expert" — Full clinical-level interpretation for a physician or radiology resident. Use standard radiological terminology (e.g., "hypodense lesion," "ground-glass opacity," "T2 hyperintense signal"). Describe each finding with location, size (if stated), morphology, and clinical significance. Reference appropriate imaging guidelines (e.g., Fleischner Society, ACR, BI-RADS, LI-RADS) where applicable.

7. "etiology" — For the most significant finding(s), explain the POSSIBLE CAUSES. What conditions, processes, or risk factors could produce this imaging appearance? Be comprehensive but measured — do not imply the worst-case scenario is likely.

8. "mechanism" — Explain the PATHOPHYSIOLOGICAL MECHANISM of the key finding(s). What is happening at the tissue or organ level that produces this appearance on imaging?

9. "diseases" — List POSSIBLE CONDITIONS OR DIAGNOSES associated with the key findings. Include the most common (benign) explanation first, then progressively less likely ones. Always note if malignancy is on the differential only to acknowledge it exists — never lead with it for ambiguous findings.

10. "specialist" — State which SPECIALIST(S) the patient should see to discuss these results. Be specific (e.g., "Pulmonologist for the lung nodule," "Gastroenterologist for the liver finding," "Radiologist for follow-up imaging"). Always add: recommend discussing these results with the ordering physician first.

11. "action" — A concise, practical next-step recommendation. Distinguish clearly: is this urgent (e.g., finding requires same-day evaluation), semi-urgent (e.g., follow-up within weeks), routine (e.g., annual surveillance), or reassuring (no action needed)? Always emphasize confirming with the ordering physician.

12. "flags" — An array of the key imaging findings as structured items: { marker, value, unit, reference, status } where:
   - "marker" is the finding name (e.g., "Pulmonary Nodule", "Hepatic Cyst", "Adrenal Adenoma")
   - "value" is the size or key descriptor (e.g., "4", "1.2", "incidental")
   - "unit" is the measurement unit or qualifier (e.g., "mm", "cm", "finding")
   - "reference" is what would be normal or the threshold for concern (e.g., "< 6mm low risk", "typically benign", "normal < 1cm")
   - "status" is "high" (warrants attention/follow-up), "low" (incidental/benign, no action), or "normal" (expected finding)
   Only include findings explicitly mentioned in the report.

13. "medication_context" — ONLY include this field if the patient provided a medication list. If present, write a plain-language paragraph explaining which of the patient's specific medications may be relevant to the imaging findings (e.g., chronic steroid use and bone density, amiodarone and lung changes, immunosuppressants and infection risk). If no medications were provided, omit this field entirely.

CRITICAL INSTRUCTIONS:
- NEVER catastrophize incidental findings. A simple renal or hepatic cyst, adrenal adenoma, or small lung nodule below surveillance threshold is almost always benign — say so clearly.
- ALWAYS recommend the patient discuss these results with their ordering physician before drawing any conclusions.
- The most clinically significant finding should be the first item in the "flags" array.
- If the report is entirely normal, say so warmly and clearly in all tiers.
- Do not diagnose — you are interpreting possibilities and explaining the imaging findings.

EXTRACT THE REPORT DATE: scan the document for the date the imaging was performed or the report was issued (look for labels like "Date of Exam", "Study Date", "Report Date", "Tarih", "Tetkik Tarihi", "Rapor Tarihi"). Return ISO format (YYYY-MM-DD) in "report_date". Prefer the EXAM/STUDY date over the print date. If no date is found, set null.

Return ONLY valid JSON, no markdown fences, no extra text. Example structure:
{
  "report_date": "2024-08-15",
  "overall_status": "normal",
  "summary_headline": "Your chest CT looks reassuring — the small nodule found is very common and almost certainly harmless.",
  "urgency": "routine",
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
  ],
  "medication_context": "string (optional — only when medications were provided)"
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
    const patientAge = formData.get("patientAge") as string | null;
    const patientSex = formData.get("patientSex") as string | null;
    const patientMedications = formData.get("patientMedications") as string | null;
    const healthFile = formData.get("healthFile") as File | null;
    const patientContext = buildPatientContext(patientAge, patientSex, patientMedications);
    const hasHealthData = !!(healthFile && healthFile.size > 0);

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
          { error: "Unsupported file type.", errorCode: "WRONG_FILE_TYPE" },
          { status: 400 }
        );
      }

      const MAX_SIZE = 10 * 1024 * 1024;
      if (file.size > MAX_SIZE) {
        const fileSizeMB = (file.size / (1024 * 1024)).toFixed(1);
        return NextResponse.json(
          { error: "File too large.", errorCode: "FILE_TOO_LARGE", fileSizeMB },
          { status: 400 }
        );
      }

      const fileBuffer = await file.arrayBuffer();
      const base64Data = Buffer.from(fileBuffer).toString("base64");

      const analyzePrompt = mode === "radiology"
        ? "Please analyze this radiology or pathology report and return the full JSON interpretation as instructed."
        : "Please analyze this medical lab report and return the full JSON interpretation as instructed.";

      // Build the lab report content block
      const labBlock: Anthropic.ContentBlockParam = file.type === "application/pdf"
        ? ({
            type: "document",
            source: { type: "base64", media_type: "application/pdf", data: base64Data },
          } as Anthropic.DocumentBlockParam)
        : ({
            type: "image",
            source: {
              type: "base64",
              media_type: file.type as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
              data: base64Data,
            },
          } as Anthropic.ImageBlockParam);

      // Optionally append health export
      if (hasHealthData && healthFile) {
        const healthBuffer = await healthFile.arrayBuffer();
        const healthBase64 = Buffer.from(healthBuffer).toString("base64");
        const healthType = healthFile.type || "application/pdf";

        const healthBlock: Anthropic.ContentBlockParam = healthType === "application/pdf"
          ? ({
              type: "document",
              source: { type: "base64", media_type: "application/pdf", data: healthBase64 },
            } as Anthropic.DocumentBlockParam)
          : ({
              type: "image",
              source: {
                type: "base64",
                media_type: healthType as "image/jpeg" | "image/png" | "image/gif" | "image/webp",
                data: healthBase64,
              },
            } as Anthropic.ImageBlockParam);

        messageContent = [
          { type: "text", text: "DOCUMENT 1 — LAB REPORT:" },
          labBlock,
          { type: "text", text: "DOCUMENT 2 — APPLE HEALTH / WEARABLE EXPORT:" },
          healthBlock,
          { type: "text", text: `${analyzePrompt} Cross-reference both documents carefully and populate the "health_insights" field with specific connections you find between the wearable data and the lab values.` },
        ];
      } else {
        messageContent = [labBlock, { type: "text", text: analyzePrompt }];
      }
    }

    const systemPrompt = mode === "radiology"
      ? buildRadiologySystemPrompt(languageName, patientContext)
      : buildSystemPrompt(languageName, patientContext, hasHealthData);

    const response = await client.messages.create({
      model: "claude-sonnet-4-0",
      max_tokens: 6000,
      system: systemPrompt,
      messages: [{ role: "user", content: messageContent }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed: {
      overall_status?: "normal" | "amber" | "red";
      summary_headline?: string;
      urgency?: "routine" | "soon" | "weeks";
      simple: string;
      medium: string;
      expert: string;
      etiology?: string;
      mechanism?: string;
      diseases?: string;
      specialist?: string;
      action: string;
      flags: Array<{ marker: string; value: string; unit: string; reference: string; status: "high" | "low" | "normal" }>;
      labs?: Array<{ marker: string; value: string; unit?: string; reference?: string; status?: "high" | "low" | "normal" }>;
      medication_context?: string;
      health_insights?: string;
      supplements?: string;
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
      // Try to distinguish "not a medical doc at all" from "medical but values unreadable"
      const lowerRaw = rawText.toLowerCase();
      const nonMedicalPhrases = [
        "not a medical", "not a lab", "not a radiology", "not a pathology",
        "doesn't appear to be", "does not appear to be", "doesn't contain",
        "cannot identify any", "no medical", "not appear to contain",
        "unable to identify any medical", "this is not",
      ];
      const isNonMedical = nonMedicalPhrases.some((p) => lowerRaw.includes(p));
      return NextResponse.json(
        {
          error: "Could not parse document.",
          errorCode: isNonMedical ? "NON_MEDICAL" : "NO_LAB_VALUES",
        },
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
          { error: "AI service temporarily unavailable.", errorCode: "SERVER_ERROR" },
          { status: 503 }
        );
      }
      if (error.status === 401) {
        return NextResponse.json(
          { error: "AI service configuration error.", errorCode: "SERVER_ERROR" },
          { status: 500 }
        );
      }
      if (error.status === 429) {
        return NextResponse.json(
          { error: "Too many requests.", errorCode: "SERVER_ERROR" },
          { status: 429 }
        );
      }
      if (error.status >= 500) {
        return NextResponse.json(
          { error: "AI service error.", errorCode: "SERVER_ERROR" },
          { status: 503 }
        );
      }
    }

    return NextResponse.json({ error: "Something went wrong.", errorCode: "SERVER_ERROR" }, { status: 500 });
  }
}
