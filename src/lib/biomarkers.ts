// Canonical biomarker catalog.
// Maps raw marker names (various aliases used by labs) to a single canonical
// identity with body-system classification, preferred unit, optimal/normal
// ranges, and direction of concern. Used to build body-system dashboards,
// reference zones on charts, and trend interpretation.

export type BodySystem =
  | "cardiovascular"
  | "metabolic"
  | "liver"
  | "kidney"
  | "thyroid"
  | "inflammation"
  | "hematology"
  | "nutrients"
  | "hormonal"
  | "other";

export type Direction = "higher-worse" | "lower-worse" | "u-shape";

export interface BiomarkerDef {
  slug: string;                // url-safe canonical id, e.g. "ldl-cholesterol"
  canonical: string;           // human name, e.g. "LDL Cholesterol"
  aliases: string[];           // lowercase partials that map to this marker
  system: BodySystem;
  unit?: string;               // preferred unit
  optimal?: [number, number];  // ideal range
  normal?: [number, number];   // clinical "normal" range (wider)
  direction: Direction;
  blurb?: string;              // one-line layman description
}

export const BODY_SYSTEMS: Record<BodySystem, { label: string; emoji: string; color: string }> = {
  cardiovascular: { label: "Cardiovascular", emoji: "❤️", color: "text-red-600" },
  metabolic:      { label: "Metabolic",      emoji: "⚡", color: "text-amber-600" },
  liver:          { label: "Liver",          emoji: "🫀", color: "text-orange-600" },
  kidney:         { label: "Kidney",         emoji: "💧", color: "text-cyan-600" },
  thyroid:        { label: "Thyroid",        emoji: "🦋", color: "text-purple-600" },
  inflammation:   { label: "Inflammation",   emoji: "🔥", color: "text-rose-600" },
  hematology:     { label: "Blood",          emoji: "🩸", color: "text-red-700" },
  nutrients:      { label: "Vitamins & Minerals", emoji: "🌿", color: "text-emerald-600" },
  hormonal:       { label: "Hormones",       emoji: "⚗️", color: "text-pink-600" },
  other:          { label: "Other",          emoji: "🧪", color: "text-slate-600" },
};

export const CATALOG: BiomarkerDef[] = [
  // ── Cardiovascular / Lipids ──
  { slug: "total-cholesterol", canonical: "Total Cholesterol", aliases: ["total cholesterol","cholesterol total","cholesterol, total"], system: "cardiovascular", unit: "mg/dL", optimal: [125, 180], normal: [125, 200], direction: "higher-worse", blurb: "Sum of all cholesterol types in blood." },
  { slug: "ldl-cholesterol", canonical: "LDL Cholesterol", aliases: ["ldl","ldl-c","ldl cholesterol","ldl chol","ldl, calculated"], system: "cardiovascular", unit: "mg/dL", optimal: [40, 100], normal: [40, 130], direction: "higher-worse", blurb: "The cholesterol that clogs arteries." },
  { slug: "hdl-cholesterol", canonical: "HDL Cholesterol", aliases: ["hdl","hdl-c","hdl cholesterol","hdl chol"], system: "cardiovascular", unit: "mg/dL", optimal: [60, 100], normal: [40, 100], direction: "lower-worse", blurb: "Protective cholesterol — higher is better." },
  { slug: "triglycerides", canonical: "Triglycerides", aliases: ["triglycerides","trig"], system: "cardiovascular", unit: "mg/dL", optimal: [50, 100], normal: [50, 150], direction: "higher-worse", blurb: "Fat in the bloodstream." },
  { slug: "non-hdl-cholesterol", canonical: "Non-HDL Cholesterol", aliases: ["non-hdl","non hdl","non-hdl cholesterol"], system: "cardiovascular", unit: "mg/dL", optimal: [60, 130], normal: [60, 160], direction: "higher-worse" },
  { slug: "apob", canonical: "ApoB", aliases: ["apob","apolipoprotein b"], system: "cardiovascular", unit: "mg/dL", optimal: [40, 80], normal: [40, 110], direction: "higher-worse", blurb: "Count of atherogenic lipid particles." },
  { slug: "lp-a", canonical: "Lipoprotein(a)", aliases: ["lp(a)","lipoprotein(a)","lipoprotein a","lpa"], system: "cardiovascular", unit: "nmol/L", optimal: [0, 75], normal: [0, 125], direction: "higher-worse" },

  // ── Metabolic / Glucose ──
  { slug: "glucose", canonical: "Glucose (Fasting)", aliases: ["glucose","fasting glucose","glucose fasting","glucose, serum"], system: "metabolic", unit: "mg/dL", optimal: [70, 90], normal: [70, 99], direction: "higher-worse", blurb: "Blood sugar after fasting." },
  { slug: "hba1c", canonical: "Hemoglobin A1c", aliases: ["hba1c","a1c","hemoglobin a1c","glycohemoglobin"], system: "metabolic", unit: "%", optimal: [4.5, 5.4], normal: [4.5, 5.6], direction: "higher-worse", blurb: "Average blood sugar over ~3 months." },
  { slug: "insulin", canonical: "Insulin (Fasting)", aliases: ["insulin","fasting insulin"], system: "metabolic", unit: "µIU/mL", optimal: [2, 8], normal: [2, 18], direction: "higher-worse" },
  { slug: "homa-ir", canonical: "HOMA-IR", aliases: ["homa-ir","homa ir","homa"], system: "metabolic", optimal: [0.5, 1.5], normal: [0.5, 2.5], direction: "higher-worse", blurb: "Insulin resistance index." },

  // ── Liver ──
  { slug: "alt", canonical: "ALT", aliases: ["alt","alt (sgpt)","sgpt","alanine aminotransferase"], system: "liver", unit: "U/L", optimal: [10, 25], normal: [7, 35], direction: "higher-worse" },
  { slug: "ast", canonical: "AST", aliases: ["ast","ast (sgot)","sgot","aspartate aminotransferase"], system: "liver", unit: "U/L", optimal: [10, 25], normal: [8, 33], direction: "higher-worse" },
  { slug: "alp", canonical: "ALP", aliases: ["alp","alkaline phosphatase"], system: "liver", unit: "U/L", optimal: [40, 90], normal: [40, 130], direction: "higher-worse" },
  { slug: "ggt", canonical: "GGT", aliases: ["ggt","gamma-glutamyl transferase","gamma gt"], system: "liver", unit: "U/L", optimal: [5, 25], normal: [5, 40], direction: "higher-worse" },
  { slug: "bilirubin-total", canonical: "Bilirubin (Total)", aliases: ["bilirubin","bilirubin total","total bilirubin"], system: "liver", unit: "mg/dL", optimal: [0.2, 1.0], normal: [0.2, 1.2], direction: "higher-worse" },
  { slug: "albumin", canonical: "Albumin", aliases: ["albumin"], system: "liver", unit: "g/dL", optimal: [4.2, 5.0], normal: [3.5, 5.0], direction: "lower-worse" },

  // ── Kidney ──
  { slug: "creatinine", canonical: "Creatinine", aliases: ["creatinine"], system: "kidney", unit: "mg/dL", optimal: [0.6, 1.1], normal: [0.5, 1.3], direction: "higher-worse" },
  { slug: "egfr", canonical: "eGFR", aliases: ["egfr","gfr","estimated gfr"], system: "kidney", unit: "mL/min/1.73m²", optimal: [90, 120], normal: [60, 120], direction: "lower-worse", blurb: "Kidney filtration rate." },
  { slug: "bun", canonical: "BUN", aliases: ["bun","blood urea nitrogen","urea"], system: "kidney", unit: "mg/dL", optimal: [8, 20], normal: [7, 25], direction: "higher-worse" },
  { slug: "uric-acid", canonical: "Uric Acid", aliases: ["uric acid"], system: "kidney", unit: "mg/dL", optimal: [3.5, 6.0], normal: [3.5, 7.2], direction: "higher-worse" },
  { slug: "cystatin-c", canonical: "Cystatin C", aliases: ["cystatin c","cystatin-c"], system: "kidney", unit: "mg/L", optimal: [0.5, 0.9], normal: [0.5, 1.0], direction: "higher-worse" },

  // ── Thyroid ──
  { slug: "tsh", canonical: "TSH", aliases: ["tsh","thyroid stimulating hormone"], system: "thyroid", unit: "µIU/mL", optimal: [1.0, 2.5], normal: [0.4, 4.5], direction: "u-shape", blurb: "Main thyroid regulator." },
  { slug: "free-t4", canonical: "Free T4", aliases: ["free t4","ft4","t4 free"], system: "thyroid", unit: "ng/dL", optimal: [1.0, 1.5], normal: [0.8, 1.8], direction: "u-shape" },
  { slug: "free-t3", canonical: "Free T3", aliases: ["free t3","ft3","t3 free"], system: "thyroid", unit: "pg/mL", optimal: [3.0, 4.0], normal: [2.3, 4.2], direction: "u-shape" },
  { slug: "tpo-ab", canonical: "TPO Antibodies", aliases: ["tpo","tpo ab","anti-tpo","tpoab","thyroid peroxidase"], system: "thyroid", unit: "IU/mL", optimal: [0, 9], normal: [0, 34], direction: "higher-worse" },

  // ── Inflammation ──
  { slug: "crp", canonical: "hs-CRP", aliases: ["crp","hs-crp","c-reactive protein","high sensitivity crp"], system: "inflammation", unit: "mg/L", optimal: [0, 1.0], normal: [0, 3.0], direction: "higher-worse", blurb: "Systemic inflammation marker." },
  { slug: "esr", canonical: "ESR", aliases: ["esr","sed rate","erythrocyte sedimentation rate"], system: "inflammation", unit: "mm/hr", optimal: [0, 15], normal: [0, 30], direction: "higher-worse" },
  { slug: "ferritin", canonical: "Ferritin", aliases: ["ferritin"], system: "inflammation", unit: "ng/mL", optimal: [50, 150], normal: [20, 300], direction: "u-shape", blurb: "Iron storage; also an inflammation marker." },
  { slug: "homocysteine", canonical: "Homocysteine", aliases: ["homocysteine"], system: "inflammation", unit: "µmol/L", optimal: [5, 8], normal: [5, 15], direction: "higher-worse" },

  // ── Hematology / CBC ──
  { slug: "hemoglobin", canonical: "Hemoglobin", aliases: ["hemoglobin","hgb","hb"], system: "hematology", unit: "g/dL", optimal: [13.5, 16], normal: [12, 17.5], direction: "u-shape" },
  { slug: "hematocrit", canonical: "Hematocrit", aliases: ["hematocrit","hct"], system: "hematology", unit: "%", optimal: [40, 48], normal: [36, 52], direction: "u-shape" },
  { slug: "wbc", canonical: "WBC", aliases: ["wbc","white blood cell","white blood cells","leukocytes"], system: "hematology", unit: "10³/µL", optimal: [4.5, 8.5], normal: [4.0, 11.0], direction: "u-shape" },
  { slug: "rbc", canonical: "RBC", aliases: ["rbc","red blood cell","red blood cells","erythrocytes"], system: "hematology", unit: "10⁶/µL", optimal: [4.5, 5.5], normal: [4.0, 6.0], direction: "u-shape" },
  { slug: "platelets", canonical: "Platelets", aliases: ["platelets","plt"], system: "hematology", unit: "10³/µL", optimal: [200, 350], normal: [150, 450], direction: "u-shape" },
  { slug: "mcv", canonical: "MCV", aliases: ["mcv"], system: "hematology", unit: "fL", optimal: [85, 95], normal: [80, 100], direction: "u-shape" },
  { slug: "rdw", canonical: "RDW", aliases: ["rdw"], system: "hematology", unit: "%", optimal: [11, 13], normal: [11, 15], direction: "higher-worse" },

  // ── Vitamins & Minerals ──
  { slug: "vitamin-d", canonical: "Vitamin D (25-OH)", aliases: ["vitamin d","25-oh vitamin d","25(oh)d","vitamin d, 25-oh","vit d"], system: "nutrients", unit: "ng/mL", optimal: [40, 60], normal: [30, 100], direction: "lower-worse" },
  { slug: "vitamin-b12", canonical: "Vitamin B12", aliases: ["b12","vitamin b12","vit b12","cobalamin"], system: "nutrients", unit: "pg/mL", optimal: [500, 900], normal: [232, 1245], direction: "lower-worse" },
  { slug: "folate", canonical: "Folate", aliases: ["folate","folic acid"], system: "nutrients", unit: "ng/mL", optimal: [10, 25], normal: [3.4, 25], direction: "lower-worse" },
  { slug: "iron", canonical: "Iron", aliases: ["iron","serum iron"], system: "nutrients", unit: "µg/dL", optimal: [70, 150], normal: [50, 170], direction: "u-shape" },
  { slug: "tibc", canonical: "TIBC", aliases: ["tibc","total iron binding capacity"], system: "nutrients", unit: "µg/dL", optimal: [250, 400], normal: [240, 450], direction: "u-shape" },
  { slug: "magnesium", canonical: "Magnesium", aliases: ["magnesium","mg"], system: "nutrients", unit: "mg/dL", optimal: [2.0, 2.4], normal: [1.7, 2.4], direction: "lower-worse" },
  { slug: "calcium", canonical: "Calcium", aliases: ["calcium"], system: "nutrients", unit: "mg/dL", optimal: [9.2, 10.2], normal: [8.6, 10.3], direction: "u-shape" },
  { slug: "sodium", canonical: "Sodium", aliases: ["sodium","na"], system: "nutrients", unit: "mmol/L", optimal: [138, 142], normal: [135, 145], direction: "u-shape" },
  { slug: "potassium", canonical: "Potassium", aliases: ["potassium","k"], system: "nutrients", unit: "mmol/L", optimal: [4.0, 4.8], normal: [3.5, 5.2], direction: "u-shape" },
  { slug: "zinc", canonical: "Zinc", aliases: ["zinc"], system: "nutrients", unit: "µg/dL", optimal: [80, 120], normal: [60, 130], direction: "lower-worse" },

  // ── Hormones ──
  { slug: "testosterone-total", canonical: "Testosterone (Total)", aliases: ["testosterone","total testosterone","testosterone total"], system: "hormonal", unit: "ng/dL", optimal: [500, 900], normal: [240, 950], direction: "u-shape" },
  { slug: "testosterone-free", canonical: "Testosterone (Free)", aliases: ["free testosterone","testosterone free"], system: "hormonal", unit: "pg/mL", optimal: [15, 25], normal: [5, 30], direction: "u-shape" },
  { slug: "estradiol", canonical: "Estradiol", aliases: ["estradiol","e2"], system: "hormonal", unit: "pg/mL", direction: "u-shape" },
  { slug: "shbg", canonical: "SHBG", aliases: ["shbg","sex hormone binding globulin"], system: "hormonal", unit: "nmol/L", optimal: [20, 50], normal: [10, 80], direction: "u-shape" },
  { slug: "cortisol", canonical: "Cortisol", aliases: ["cortisol"], system: "hormonal", unit: "µg/dL", optimal: [8, 16], normal: [6, 23], direction: "u-shape" },
  { slug: "dhea-s", canonical: "DHEA-S", aliases: ["dhea-s","dhea s","dheas"], system: "hormonal", unit: "µg/dL", direction: "u-shape" },
  { slug: "psa", canonical: "PSA", aliases: ["psa","prostate specific antigen"], system: "hormonal", unit: "ng/mL", optimal: [0, 2.5], normal: [0, 4.0], direction: "higher-worse" },
];

const ALIAS_INDEX: Map<string, BiomarkerDef> = (() => {
  const m = new Map<string, BiomarkerDef>();
  for (const def of CATALOG) {
    m.set(def.canonical.toLowerCase(), def);
    for (const a of def.aliases) m.set(a.toLowerCase(), def);
  }
  return m;
})();

export function findBiomarker(rawName: string): BiomarkerDef | null {
  if (!rawName) return null;
  const key = rawName.trim().toLowerCase();
  if (ALIAS_INDEX.has(key)) return ALIAS_INDEX.get(key)!;
  // substring fallback: pick the longest matching alias
  let best: BiomarkerDef | null = null;
  let bestLen = 0;
  for (const def of CATALOG) {
    for (const a of [def.canonical.toLowerCase(), ...def.aliases]) {
      if ((key.includes(a) || a.includes(key)) && a.length > bestLen) {
        best = def;
        bestLen = a.length;
      }
    }
  }
  return best;
}

export function bySlug(slug: string): BiomarkerDef | null {
  return CATALOG.find((d) => d.slug === slug) ?? null;
}

export type Zone = "optimal" | "normal" | "out-of-range";

export function zoneFor(def: BiomarkerDef, value: number): Zone {
  if (def.optimal && value >= def.optimal[0] && value <= def.optimal[1]) return "optimal";
  if (def.normal && value >= def.normal[0] && value <= def.normal[1]) return "normal";
  return "out-of-range";
}

export function zoneColor(z: Zone): string {
  if (z === "optimal") return "emerald";
  if (z === "normal") return "amber";
  return "red";
}
