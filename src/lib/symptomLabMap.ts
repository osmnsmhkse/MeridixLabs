// Map common symptom keywords to biomarker slugs that are clinically
// associated with that symptom. Used to cross-reference the user's
// symptom-tool entries against their actual lab history — surfacing
// "your fatigue could be related to your low ferritin" connections.
//
// Keep mappings clinically defensible; don't include speculative links.

import { CATALOG, BiomarkerDef } from "./biomarkers";

interface SymptomEntry {
  symptom: string;
  keywords: string[];           // lowercase substrings to match user's free-text symptom
  marker_slugs: string[];       // ordered by clinical relevance (most relevant first)
  rationale: string;            // shown to user
}

export const SYMPTOM_LAB_MAP: SymptomEntry[] = [
  {
    symptom: "Fatigue / tiredness",
    keywords: ["fatigue","tired","exhaustion","exhausted","low energy","sluggish","weak"],
    marker_slugs: ["ferritin","hemoglobin","vitamin-b12","tsh","vitamin-d","glucose","hba1c"],
    rationale: "Iron deficiency, B12 deficiency, thyroid issues, or unrecognized prediabetes are common medical causes.",
  },
  {
    symptom: "Brain fog / poor concentration",
    keywords: ["brain fog","foggy","concentrate","focus","memory","forgetful"],
    marker_slugs: ["vitamin-b12","tsh","free-t4","vitamin-d","hba1c","glucose"],
    rationale: "Thyroid dysfunction, B12 deficiency, and blood sugar instability frequently present with cognitive symptoms.",
  },
  {
    symptom: "Hair loss / thinning",
    keywords: ["hair loss","thinning hair","hair fall","losing hair","alopecia"],
    marker_slugs: ["ferritin","tsh","vitamin-d","zinc","iron"],
    rationale: "Low ferritin (even with normal hemoglobin), thyroid issues, and vitamin D / zinc deficiency are well-documented contributors.",
  },
  {
    symptom: "Cold intolerance",
    keywords: ["cold","always cold","cold hands","cold feet","cold all the time"],
    marker_slugs: ["tsh","free-t4","ferritin","hemoglobin"],
    rationale: "Hypothyroidism and anemia commonly cause increased cold sensitivity.",
  },
  {
    symptom: "Weight gain",
    keywords: ["weight gain","gaining weight","gained weight"],
    marker_slugs: ["tsh","insulin","hba1c","cortisol","free-t4"],
    rationale: "Thyroid issues and insulin resistance are reversible drivers of unexplained weight changes.",
  },
  {
    symptom: "Weight loss (unintended)",
    keywords: ["unintended weight loss","losing weight","unexplained weight loss"],
    marker_slugs: ["tsh","free-t4","glucose","hba1c"],
    rationale: "Hyperthyroidism and uncontrolled diabetes can cause unintentional weight loss.",
  },
  {
    symptom: "Anxiety / palpitations",
    keywords: ["anxiety","anxious","palpitation","racing heart","heart racing","panic"],
    marker_slugs: ["tsh","free-t4","magnesium","glucose","cortisol"],
    rationale: "Hyperthyroidism, low magnesium, and hypoglycemia can mimic or worsen anxiety symptoms.",
  },
  {
    symptom: "Depression / low mood",
    keywords: ["depress","low mood","sad","hopeless","mood"],
    marker_slugs: ["vitamin-d","vitamin-b12","tsh","folate","ferritin"],
    rationale: "Vitamin D, B12, and thyroid abnormalities often co-occur with depressive symptoms.",
  },
  {
    symptom: "Muscle aches / weakness",
    keywords: ["muscle ache","muscle pain","weakness","sore muscles","myalgia"],
    marker_slugs: ["vitamin-d","magnesium","potassium","tsh","creatinine"],
    rationale: "Low vitamin D, electrolyte imbalances, and thyroid dysfunction commonly cause myalgia.",
  },
  {
    symptom: "Frequent infections / poor immunity",
    keywords: ["infection","sick often","immune","colds","catching cold"],
    marker_slugs: ["vitamin-d","zinc","wbc","iron","ferritin"],
    rationale: "Vitamin D and zinc deficiency, plus iron deficiency, weaken immune defenses.",
  },
  {
    symptom: "Increased thirst / urination",
    keywords: ["thirsty","thirst","urinate","peeing","frequent urination","polyuria"],
    marker_slugs: ["glucose","hba1c","sodium","creatinine"],
    rationale: "Classic warning signs of diabetes or kidney issues.",
  },
  {
    symptom: "Headaches",
    keywords: ["headache","migraine"],
    marker_slugs: ["magnesium","sodium","glucose","hemoglobin"],
    rationale: "Low magnesium, electrolyte shifts, and anemia can trigger headaches.",
  },
  {
    symptom: "Joint pain",
    keywords: ["joint pain","joints hurt","arthritis","stiff joints"],
    marker_slugs: ["uric-acid","crp","esr","vitamin-d"],
    rationale: "High uric acid suggests gout; CRP/ESR screen for inflammatory arthritis; low vitamin D associates with diffuse pain.",
  },
  {
    symptom: "Stomach / digestive issues",
    keywords: ["bloating","stomach","nausea","reflux","gerd","abdominal","ibs"],
    marker_slugs: ["alt","ast","bilirubin-total","albumin","ferritin","vitamin-b12"],
    rationale: "Liver enzymes screen for hepatobiliary causes; B12/ferritin can drop in malabsorption.",
  },
  {
    symptom: "Sleep issues",
    keywords: ["insomnia","can't sleep","sleep","poor sleep","wake up"],
    marker_slugs: ["magnesium","cortisol","tsh","ferritin"],
    rationale: "Low magnesium and ferritin (restless legs), elevated cortisol, and thyroid issues all disrupt sleep.",
  },
  {
    symptom: "Low libido / sexual function",
    keywords: ["libido","sex drive","erectile","ed","sexual"],
    marker_slugs: ["testosterone-total","testosterone-free","shbg","tsh","prolactin","vitamin-d"],
    rationale: "Low testosterone, thyroid issues, and elevated prolactin are common workup targets.",
  },
];

export interface RelatedLabs {
  matchedSymptom: string;
  rationale: string;
  markers: BiomarkerDef[];
}

/**
 * Given free-text symptom input, return related biomarker categories
 * the user might have in their lab history.
 */
export function relatedLabsForSymptoms(symptomText: string): RelatedLabs[] {
  if (!symptomText) return [];
  const lower = symptomText.toLowerCase();
  const out: RelatedLabs[] = [];
  const seenSymptoms = new Set<string>();
  for (const entry of SYMPTOM_LAB_MAP) {
    if (entry.keywords.some((k) => lower.includes(k)) && !seenSymptoms.has(entry.symptom)) {
      seenSymptoms.add(entry.symptom);
      const markers = entry.marker_slugs
        .map((slug) => CATALOG.find((c) => c.slug === slug))
        .filter(Boolean) as BiomarkerDef[];
      out.push({ matchedSymptom: entry.symptom, rationale: entry.rationale, markers });
    }
  }
  return out;
}
