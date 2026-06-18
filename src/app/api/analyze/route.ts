import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import Anthropic from "@anthropic-ai/sdk";
import { IDENTITY_CONFIDENTIALITY } from "@/lib/toolChatConfig";
import { retrieveChunks, type RetrievedChunk } from "@/lib/retrieval";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// ── RAG helpers ────────────────────────────────────────────────────
// Build a retrieval query from patient context + a curated set of
// common-abnormal topics. Since Claude reads the document and we don't
// know which markers are abnormal up front, we cast a moderately wide
// net so the knowledge base surfaces broadly useful reference chunks
// for the lab/radiology categories patients most often encounter.
const COMMON_LAB_TOPICS = [
  "complete blood count interpretation",
  "lipid panel cholesterol LDL HDL triglycerides",
  "comprehensive metabolic panel kidney liver electrolytes",
  "thyroid function TSH T3 T4 hypothyroidism hyperthyroidism",
  "vitamin D deficiency",
  "iron ferritin anemia",
  "glucose HbA1c prediabetes diabetes",
  "liver enzymes AST ALT",
];

const COMMON_RADIOLOGY_TOPICS = [
  "pulmonary nodule Fleischner follow-up",
  "incidental adrenal adenoma imaging",
  "hepatic renal cyst Bosniak",
  "degenerative changes spine",
  "breast imaging BI-RADS",
];

function buildRetrievalQuery(
  mode: string,
  age: string | null,
  sex: string | null,
  medications: string | null
): string {
  const parts: string[] = [];
  if (age) parts.push(`${age}-year-old`);
  if (sex) parts.push(sex);
  if (medications) parts.push(`taking ${medications}`);
  const topics = mode === "radiology" ? COMMON_RADIOLOGY_TOPICS : COMMON_LAB_TOPICS;
  parts.push(topics.join("; "));
  return parts.join(" — ");
}

function formatReferenceMaterial(chunks: RetrievedChunk[]): {
  block: string;
  citations: Array<{ n: number; source_name: string; source_url: string; source_body: string }>;
} {
  if (chunks.length === 0) return { block: "", citations: [] };

  const citations = chunks.map((c, i) => ({
    n: i + 1,
    source_name: c.source_name,
    source_url: c.source_url,
    source_body: c.source_body,
  }));

  const formatted = chunks
    .map(
      (c, i) =>
        `[${i + 1}] ${c.source_name} — ${c.source_body}\nURL: ${c.source_url}\n${c.content}`
    )
    .join("\n\n---\n\n");

  const block = `

<reference_material>
The following passages are excerpts from curated medical sources. Ground your interpretation in this material wherever it is clinically relevant. After any factual clinical claim that is supported by a passage, append a bracketed citation like [1] or [2, 3] using the numbers below. Do NOT cite a source if it does not actually support the claim. If no passage covers a claim, state it on its own (no citation) using standard medical knowledge.

${formatted}
</reference_material>`;

  return { block, citations };
}

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

2. "summary_headline" — A single plain-language sentence (max 2 sentences) summarizing the most important finding(s). Write as if speaking directly to the patient. IMPORTANT: This must be written in ${languageName} — not English. Never use alarmist language.

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
  return `You are a senior radiologist and pathologist at Meridix Labs.${patientContext} You will receive an image or PDF of a radiology report (CT, MRI, X-ray, ultrasound, PET, mammogram) or a pathology/biopsy report. The TEXT of the report is what you analyze — you are NOT looking at the underlying scan images, only at the written report a radiologist produced. Your job is to interpret that report thoroughly for the patient and return a JSON object with the following fields. All text content MUST be written in ${languageName}.

Fields required:

1. "overall_status" — ONE of exactly three string values: "normal" (report is entirely normal or findings are incidental/benign with no follow-up needed), "amber" (one or two findings that warrant a conversation with a physician but are not urgent), or "red" (findings that need prompt medical attention or specialist referral). Choose based on clinical significance.

2. "summary_headline" — A single plain-language sentence (max 2 sentences) summarizing the most important finding. Write directly to the patient. IMPORTANT: This must be written in ${languageName} — not English. Never use alarming language. If the report is unremarkable, lead with the reassurance ("Your scan looks normal — no concerning findings.").

3. "urgency" — ONE of exactly three string values: "routine" (no urgent action, standard follow-up or surveillance), "weeks" (schedule an appointment within a few weeks), or "soon" (discuss with a doctor soon — not an emergency but prompt follow-up warranted). Never suggest emergency care.

4. "modality" — A short string naming the imaging modality (e.g., "CT", "MRI", "X-ray", "Ultrasound", "Mammogram", "PET-CT", "Pathology / Biopsy"). Detect from the report header, the "Exam:" / "Procedure:" / "Technique:" / "Tetkik" lines, or the body of the report.

5. "body_part" — A short string naming the anatomy studied (e.g., "Chest", "Abdomen and Pelvis", "Brain", "Right Knee", "Lumbar Spine", "Breast — bilateral"). Be specific where the report is specific.

6. "simple" — A warm, plain-language explanation for someone with no medical background. The VERY FIRST sentence MUST identify the modality and body part (e.g., "This is a CT scan of your chest" or "This is an MRI of your right knee"). Then explain what the radiologist saw in plain language. Clearly distinguish what is normal, what is an incidental finding (an unrelated thing the scan happened to spot), and what may need follow-up. If the radiologist wrote phrases like "no acute cardiopulmonary process," "unremarkable," "no acute abnormality," or "negative study," explicitly translate them: these mean the scan looks normal and the patient should feel reassured. If the report mentions "clinical correlation recommended" or "follow-up suggested," explain that this means the doctor will compare the scan to the patient's symptoms and history before deciding next steps — it does NOT mean something is wrong. End with reassurance to confirm everything with their ordering physician.

7. "medium" — An explanation for an educated patient who understands basic anatomy. Name findings using proper anatomical terms and explain what they mean clinically. Most radiology reports have two sections: a "Findings" section (the detailed observations) and an "Impression" section (the radiologist's bottom-line conclusion and recommendations). Briefly explain what each section is and walk through the key items in both. Clearly state which findings are incidental (very common, clinically insignificant) and which warrant further evaluation. Use phrases like "incidental finding," "benign appearance," or "warrants follow-up." Mention any follow-up tests the report suggests and why.

8. "expert" — Full clinical-level interpretation for a physician or radiology resident. Use standard radiological terminology (e.g., "hypodense lesion," "ground-glass opacity," "T2 hyperintense signal," "Hounsfield units," "Fleischner-compatible follow-up"). Distinguish the "Findings" section from the "Impression" section — the Findings section describes what was seen, the Impression is the radiologist's synthesis and recommendations. Describe each finding with location, size (if stated), morphology, and clinical significance. If the report names a specific protocol or sequence (e.g., "MRI brain with and without contrast, T1/T2/FLAIR/DWI", "CT chest with IV contrast, 1.25 mm reconstructions", "BI-RADS 2"), note what that means clinically. Reference appropriate imaging guidelines (Fleischner Society 2017, ACR Incidental Findings, BI-RADS, LI-RADS, Bosniak, PI-RADS) where applicable.

9. "etiology" — For the most significant finding(s), explain the POSSIBLE CAUSES. What conditions, processes, or risk factors could produce this imaging appearance? Be comprehensive but measured — do not imply the worst-case scenario is likely.

10. "mechanism" — Explain the PATHOPHYSIOLOGICAL MECHANISM of the key finding(s). What is happening at the tissue or organ level that produces this appearance on imaging?

11. "diseases" — List POSSIBLE CONDITIONS OR DIAGNOSES associated with the key findings. Include the most common (benign) explanation first, then progressively less likely ones. Always note if malignancy is on the differential only to acknowledge it exists — never lead with it for ambiguous findings.

12. "specialist" — State which SPECIALIST(S) the patient should see to discuss these results. Be specific based on the body part and findings: Pulmonologist for lung findings; Cardiologist for cardiac findings; Orthopedist for bone/joint findings; Neurologist or Neurosurgeon for brain/spine findings; Gastroenterologist or Hepatologist for liver/GI findings; Urologist or Nephrologist for kidney/urological findings; Gynecologist for pelvic/reproductive findings; Breast Surgeon or Oncologist for breast findings; ENT for head/neck findings; Vascular Surgeon for vascular findings. Always add: discuss these results with the ordering physician first.

13. "action" — A concise, practical next-step recommendation. Distinguish clearly: is this urgent (finding requires prompt evaluation), semi-urgent (follow-up within weeks), routine (annual surveillance or no action), or reassuring (no action needed)? Always emphasize confirming with the ordering physician.

14. "questions_for_doctor" — REQUIRED. An array of EXACTLY 5 specific, smart questions the patient should bring to their ordering doctor or specialist. These must be tailored to THIS report — reference the actual findings, modality, and body part. Avoid generic questions like "What should I do?" — instead write questions like "The report mentions a 4 mm pulmonary nodule — what is the follow-up schedule you'd recommend, and do I need a repeat CT?" or "What does 'mild degenerative changes' mean for my long-term joint health?". Each question is a single string, written in ${languageName}.

15. "flags" — An array of the key imaging findings as structured items: { marker, value, unit, reference, status } where:
   - "marker" is the finding name (e.g., "Pulmonary Nodule", "Hepatic Cyst", "Adrenal Adenoma")
   - "value" is the size or key descriptor (e.g., "4", "1.2", "incidental")
   - "unit" is the measurement unit or qualifier (e.g., "mm", "cm", "finding")
   - "reference" is what would be normal or the threshold for concern (e.g., "< 6mm low risk", "typically benign", "normal < 1cm")
   - "status" is "high" (warrants attention/follow-up), "low" (incidental/benign, no action), or "normal" (expected finding)
   Only include findings explicitly mentioned in the report. If the report is entirely normal, return an empty array or a single { marker: "Overall Study", value: "normal", unit: "", reference: "no acute findings", status: "normal" } item.

16. "medication_context" — ONLY include this field if the patient provided a medication list. If present, write a plain-language paragraph explaining which of the patient's specific medications may be relevant to the imaging findings (e.g., chronic steroid use and bone density, amiodarone and lung changes, immunosuppressants and infection risk). If no medications were provided, omit this field entirely.

DEPTH TIER BEHAVIOR (applies to fields 6, 7, 8):
- simple: plain language, no jargon, reassuring tone, focus on "what this means for you". Always identify the modality + body part first.
- medium: explain the key terms, give clinical context, walk through Findings vs Impression, mention follow-up tests that might be ordered and why.
- expert: full clinical language. Describe protocol/sequence/contrast where named. Distinguish Findings section from Impression section. Reference applicable guidelines.

CRITICAL INSTRUCTIONS:
- You are interpreting a written REPORT — you are not analyzing the underlying scan image yourself. Always frame what was seen as "your radiologist observed…" or "the report describes…", never as your own visual observation.
- NEVER make a diagnosis. Explain what the radiologist found and what it could mean as possibilities.
- NEVER catastrophize incidental findings. Simple renal or hepatic cysts, adrenal adenomas, small lung nodules below surveillance threshold, and degenerative changes are almost always benign — say so clearly.
- ALWAYS recommend the patient discuss these results with their ordering physician before drawing any conclusions.
- The most clinically significant finding should be the first item in the "flags" array.
- If the report is entirely normal or unremarkable, say so warmly and clearly in all tiers — phrases like "unremarkable" and "no acute findings" are GOOD news.

EXTRACT THE REPORT DATE: scan the document for the date the imaging was performed or the report was issued (look for labels like "Date of Exam", "Study Date", "Report Date", "Tarih", "Tetkik Tarihi", "Rapor Tarihi"). Return ISO format (YYYY-MM-DD) in "report_date". Prefer the EXAM/STUDY date over the print date. If no date is found, set null.

Return ONLY valid JSON, no markdown fences, no extra text. Example structure:
{
  "report_date": "2024-08-15",
  "overall_status": "normal",
  "summary_headline": "Your chest CT looks reassuring — the small nodule found is very common and almost certainly harmless.",
  "urgency": "routine",
  "modality": "CT",
  "body_part": "Chest",
  "simple": "string",
  "medium": "string",
  "expert": "string",
  "etiology": "string",
  "mechanism": "string",
  "diseases": "string",
  "specialist": "string",
  "action": "string",
  "questions_for_doctor": ["string", "string", "string", "string", "string"],
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
  const _rl = await rateLimit(request, "ai-heavy");
  if (_rl) return _rl;
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

    let systemPrompt = mode === "radiology"
      ? buildRadiologySystemPrompt(languageName, patientContext)
      : buildSystemPrompt(languageName, patientContext, hasHealthData);

    // RAG — retrieve grounded reference material. Silent no-op if
    // VOYAGE_API_KEY is unset or the knowledge_chunks table is empty.
    let citations: Array<{ n: number; source_name: string; source_url: string; source_body: string }> = [];
    try {
      const retrievalQuery = buildRetrievalQuery(mode, patientAge, patientSex, patientMedications);
      const chunks = await retrieveChunks(retrievalQuery, { k: 6 });
      const { block, citations: cites } = formatReferenceMaterial(chunks);
      systemPrompt += block;
      citations = cites;
    } catch (e) {
      console.error("RAG retrieval failed (continuing without grounding):", e);
    }

    const response = await client.messages.create({
      model: "claude-sonnet-4-0",
      max_tokens: 6000,
      system: systemPrompt + IDENTITY_CONFIDENTIALITY,
      messages: [{ role: "user", content: messageContent }],
    });

    const rawText = response.content[0].type === "text" ? response.content[0].text : "";

    let parsed: {
      overall_status?: "normal" | "amber" | "red";
      summary_headline?: string;
      urgency?: "routine" | "soon" | "weeks";
      modality?: string;
      body_part?: string;
      simple: string;
      medium: string;
      expert: string;
      etiology?: string;
      mechanism?: string;
      diseases?: string;
      specialist?: string;
      action: string;
      questions_for_doctor?: string[];
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

    // Only return citations actually referenced by [n] markers in the
    // model's output. Keeps the UI honest — no source listed unless the
    // model actually used it.
    const usedCitations = citations.filter((c) =>
      new RegExp(`\\[(?:\\d+,\\s*)*${c.n}(?:\\s*,\\s*\\d+)*\\]`).test(JSON.stringify(parsed))
    );

    return NextResponse.json({ success: true, data: { ...parsed, citations: usedCitations } });

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
