// Medication ↔ lab interaction catalog.
// Maps a normalized medication name to known lab effects, with severity and
// a one-line plain-English explanation. Curated from common clinical
// references (UpToDate, Lexicomp, AHFS) — not exhaustive, but covers the
// most prescribed drugs and the most common lab confounders.
//
// We match against the free-text `medications` field on the user profile,
// using keyword + alias detection. Output is informational only — the UI
// must always frame these as "things worth knowing" not "your meds caused this."

import type { BiomarkerDef } from "./biomarkers";

export type Effect = "increases" | "decreases" | "interferes-with";
export type Severity = "monitor" | "common" | "important";

export interface MedEffect {
  marker_slug: string;       // matches BiomarkerDef.slug
  effect: Effect;
  severity: Severity;
  note: string;              // one-liner shown in UI
}

export interface MedDef {
  key: string;               // canonical, lowercase
  display: string;           // capitalized for UI
  aliases: string[];         // matched against the medications text (lowercase, partial)
  klass: string;             // drug class label
  effects: MedEffect[];
}

export const MED_CATALOG: MedDef[] = [
  // ── Statins ──
  {
    key: "statin", display: "Statins (atorvastatin, rosuvastatin, simvastatin, etc.)",
    aliases: ["statin","atorvastatin","lipitor","rosuvastatin","crestor","simvastatin","zocor","pravastatin","pitavastatin","lovastatin"],
    klass: "Lipid-lowering",
    effects: [
      { marker_slug: "ldl-cholesterol", effect: "decreases", severity: "common", note: "Statins lower LDL — your reading reflects the medication." },
      { marker_slug: "alt", effect: "increases", severity: "monitor", note: "Mildly elevated ALT/AST is common; usually monitored, not stopped." },
      { marker_slug: "ast", effect: "increases", severity: "monitor", note: "Mildly elevated ALT/AST is common; usually monitored, not stopped." },
      { marker_slug: "hba1c", effect: "increases", severity: "monitor", note: "Statins can slightly raise HbA1c; the cardiovascular benefit usually outweighs this." },
    ],
  },
  // ── Metformin ──
  {
    key: "metformin", display: "Metformin",
    aliases: ["metformin","glucophage","glumetza","fortamet"],
    klass: "Antidiabetic (biguanide)",
    effects: [
      { marker_slug: "glucose", effect: "decreases", severity: "common", note: "Metformin lowers fasting glucose — reading reflects the medication." },
      { marker_slug: "hba1c", effect: "decreases", severity: "common", note: "Metformin lowers HbA1c by ~1–1.5%." },
      { marker_slug: "vitamin-b12", effect: "decreases", severity: "important", note: "Long-term metformin reduces B12 absorption — annual B12 check is recommended." },
    ],
  },
  // ── Levothyroxine ──
  {
    key: "levothyroxine", display: "Levothyroxine",
    aliases: ["levothyroxine","synthroid","levoxyl","euthyrox","tirosint"],
    klass: "Thyroid hormone",
    effects: [
      { marker_slug: "tsh", effect: "decreases", severity: "common", note: "Levothyroxine suppresses TSH — target depends on your thyroid history." },
      { marker_slug: "free-t4", effect: "increases", severity: "common", note: "Free T4 is what the medication directly raises." },
    ],
  },
  // ── ACE inhibitors ──
  {
    key: "ace", display: "ACE inhibitors (lisinopril, enalapril, ramipril, etc.)",
    aliases: ["lisinopril","prinivil","zestril","enalapril","vasotec","ramipril","altace","benazepril","quinapril","perindopril","captopril"],
    klass: "Antihypertensive",
    effects: [
      { marker_slug: "potassium", effect: "increases", severity: "important", note: "ACE inhibitors can raise potassium — periodic monitoring advised." },
      { marker_slug: "creatinine", effect: "increases", severity: "monitor", note: "A small creatinine bump after starting is expected; large jumps need evaluation." },
    ],
  },
  // ── ARBs ──
  {
    key: "arb", display: "ARBs (losartan, valsartan, telmisartan, etc.)",
    aliases: ["losartan","cozaar","valsartan","diovan","telmisartan","micardis","olmesartan","benicar","irbesartan","candesartan"],
    klass: "Antihypertensive",
    effects: [
      { marker_slug: "potassium", effect: "increases", severity: "important", note: "ARBs can raise potassium — periodic monitoring advised." },
      { marker_slug: "creatinine", effect: "increases", severity: "monitor", note: "A small creatinine bump after starting is expected." },
    ],
  },
  // ── Thiazide diuretics ──
  {
    key: "thiazide", display: "Thiazides (HCTZ, chlorthalidone)",
    aliases: ["hydrochlorothiazide","hctz","chlorthalidone","indapamide"],
    klass: "Diuretic",
    effects: [
      { marker_slug: "sodium", effect: "decreases", severity: "important", note: "Thiazides can lower sodium (hyponatremia) — especially in older adults." },
      { marker_slug: "potassium", effect: "decreases", severity: "important", note: "Thiazides can lower potassium." },
      { marker_slug: "uric-acid", effect: "increases", severity: "monitor", note: "Thiazides raise uric acid — relevant if you have gout." },
      { marker_slug: "glucose", effect: "increases", severity: "monitor", note: "Thiazides can mildly worsen glucose tolerance." },
    ],
  },
  // ── Loop diuretics ──
  {
    key: "loop-diuretic", display: "Loop diuretics (furosemide, torsemide)",
    aliases: ["furosemide","lasix","torsemide","bumetanide"],
    klass: "Diuretic",
    effects: [
      { marker_slug: "potassium", effect: "decreases", severity: "important", note: "Loop diuretics deplete potassium." },
      { marker_slug: "magnesium", effect: "decreases", severity: "monitor", note: "Magnesium often drops alongside potassium." },
      { marker_slug: "creatinine", effect: "increases", severity: "monitor", note: "Volume depletion can transiently raise creatinine." },
    ],
  },
  // ── SSRIs ──
  {
    key: "ssri", display: "SSRIs (sertraline, escitalopram, fluoxetine, etc.)",
    aliases: ["sertraline","zoloft","escitalopram","lexapro","fluoxetine","prozac","paroxetine","paxil","citalopram","celexa"],
    klass: "Antidepressant",
    effects: [
      { marker_slug: "sodium", effect: "decreases", severity: "monitor", note: "SSRIs can rarely cause hyponatremia (SIADH), especially in older adults." },
    ],
  },
  // ── PPIs ──
  {
    key: "ppi", display: "Proton pump inhibitors (omeprazole, pantoprazole, etc.)",
    aliases: ["omeprazole","prilosec","pantoprazole","protonix","esomeprazole","nexium","lansoprazole","prevacid","rabeprazole"],
    klass: "Acid suppressor",
    effects: [
      { marker_slug: "vitamin-b12", effect: "decreases", severity: "monitor", note: "Long-term PPI use can lower B12 absorption." },
      { marker_slug: "magnesium", effect: "decreases", severity: "monitor", note: "Long-term PPI use can lower magnesium." },
    ],
  },
  // ── Beta blockers ──
  {
    key: "beta-blocker", display: "Beta blockers (metoprolol, atenolol, etc.)",
    aliases: ["metoprolol","lopressor","toprol","atenolol","tenormin","bisoprolol","carvedilol","coreg","propranolol","inderal","nebivolol"],
    klass: "Antihypertensive / antiarrhythmic",
    effects: [
      { marker_slug: "triglycerides", effect: "increases", severity: "monitor", note: "Some beta blockers slightly raise triglycerides." },
      { marker_slug: "hdl-cholesterol", effect: "decreases", severity: "monitor", note: "Older non-selective beta blockers may lower HDL." },
    ],
  },
  // ── NSAIDs ──
  {
    key: "nsaid", display: "NSAIDs (ibuprofen, naproxen, diclofenac, etc.)",
    aliases: ["ibuprofen","advil","motrin","naproxen","aleve","diclofenac","voltaren","celecoxib","celebrex","meloxicam","mobic"],
    klass: "Pain / inflammation",
    effects: [
      { marker_slug: "creatinine", effect: "increases", severity: "monitor", note: "Chronic NSAID use can reduce kidney function." },
      { marker_slug: "potassium", effect: "increases", severity: "monitor", note: "NSAIDs can mildly raise potassium." },
    ],
  },
  // ── Oral contraceptives / HRT ──
  {
    key: "estrogen", display: "Estrogen / oral contraceptives",
    aliases: ["estrogen","estradiol","ethinyl estradiol","oral contraceptive","birth control pill","ocp","hrt","yasmin","yaz","loestrin","ortho","nuvaring"],
    klass: "Hormonal",
    effects: [
      { marker_slug: "shbg", effect: "increases", severity: "common", note: "Estrogen raises SHBG — interpret testosterone with this in mind." },
      { marker_slug: "triglycerides", effect: "increases", severity: "monitor", note: "Estrogens can raise triglycerides." },
      { marker_slug: "tsh", effect: "increases", severity: "monitor", note: "May increase total T4 binding; free T4/TSH is the better measure." },
    ],
  },
  // ── Allopurinol ──
  {
    key: "allopurinol", display: "Allopurinol",
    aliases: ["allopurinol","zyloprim"],
    klass: "Uric acid lowering",
    effects: [
      { marker_slug: "uric-acid", effect: "decreases", severity: "common", note: "Allopurinol lowers uric acid — reading reflects the medication." },
    ],
  },
  // ── SGLT2 inhibitors ──
  {
    key: "sglt2", display: "SGLT2 inhibitors (empagliflozin, dapagliflozin, etc.)",
    aliases: ["empagliflozin","jardiance","dapagliflozin","farxiga","canagliflozin","invokana","ertugliflozin"],
    klass: "Antidiabetic",
    effects: [
      { marker_slug: "glucose", effect: "decreases", severity: "common", note: "SGLT2 inhibitors lower glucose." },
      { marker_slug: "hba1c", effect: "decreases", severity: "common", note: "SGLT2 inhibitors lower HbA1c." },
      { marker_slug: "creatinine", effect: "increases", severity: "monitor", note: "Small creatinine rise after starting is expected and usually benign." },
    ],
  },
  // ── GLP-1 agonists ──
  {
    key: "glp1", display: "GLP-1 agonists (semaglutide, liraglutide, etc.)",
    aliases: ["semaglutide","ozempic","wegovy","liraglutide","victoza","saxenda","tirzepatide","mounjaro","zepbound","dulaglutide","trulicity"],
    klass: "Antidiabetic / weight loss",
    effects: [
      { marker_slug: "glucose", effect: "decreases", severity: "common", note: "GLP-1 agonists lower fasting glucose." },
      { marker_slug: "hba1c", effect: "decreases", severity: "common", note: "GLP-1 agonists lower HbA1c by ~1–2%." },
    ],
  },
];

const ALIAS_INDEX = (() => {
  const m = new Map<string, MedDef>();
  for (const d of MED_CATALOG) for (const a of d.aliases) m.set(a, d);
  return m;
})();

/**
 * Detect medications from a user's free-text profile.medications field.
 * Returns matched MedDef[] (unique).
 */
export function detectMedications(medText: string | null | undefined): MedDef[] {
  if (!medText) return [];
  const lower = medText.toLowerCase();
  const found = new Set<MedDef>();
  for (const [alias, def] of ALIAS_INDEX) {
    // word-ish boundary: alias appears as own token or partial match in word
    if (lower.includes(alias)) found.add(def);
  }
  return Array.from(found);
}

/**
 * For each detected medication, return its effects on biomarkers the user
 * has actually tracked (i.e., present in their normalized series map).
 */
export interface DetectedInteraction {
  med: MedDef;
  effect: MedEffect;
  marker?: BiomarkerDef;
}

export function relevantInteractions(
  meds: MedDef[],
  trackedSlugs: Set<string>,
  catalog: BiomarkerDef[],
): DetectedInteraction[] {
  const out: DetectedInteraction[] = [];
  for (const med of meds) {
    for (const effect of med.effects) {
      if (!trackedSlugs.has(effect.marker_slug)) continue;
      const marker = catalog.find((c) => c.slug === effect.marker_slug);
      out.push({ med, effect, marker });
    }
  }
  return out;
}
