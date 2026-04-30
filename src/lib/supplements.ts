// Supplement catalog with evidence-tier and biomarker effects.
// Curated from common clinical references (NIH ODS, Cochrane reviews,
// Examine.com summaries). Evidence tiers are conservative — "strong" means
// multiple high-quality RCTs in healthy or deficient populations; "moderate"
// means meta-analyses with mixed effect sizes; "limited" means smaller or
// lower-quality data. This is an educational catalog; the UI must always
// frame it as "things to discuss with your physician."

export type EvidenceTier = "strong" | "moderate" | "limited";

export interface SupplementEffect {
  marker_slug: string;          // biomarker slug
  direction: "lowers" | "raises" | "improves";
  evidence: EvidenceTier;
  note: string;
}

export interface SupplementInteraction {
  kind: "medication" | "condition" | "supplement";
  match: string[];              // lowercase substrings
  note: string;
}

export interface SupplementDef {
  key: string;                   // canonical, lowercase
  display: string;
  category: "vitamin" | "mineral" | "omega-3" | "botanical" | "amino-acid" | "probiotic" | "other";
  typicalDose: string;
  evidence: EvidenceTier;
  blurb: string;                 // one-line plain-English description
  effects: SupplementEffect[];
  interactions: SupplementInteraction[];
  upperLimit?: string;           // safe upper limit / caution
}

export const SUPPLEMENT_CATALOG: SupplementDef[] = [
  {
    key: "vitamin-d3", display: "Vitamin D3 (cholecalciferol)",
    category: "vitamin",
    typicalDose: "1000-5000 IU/day with food (dose-dependent on baseline 25-OH D)",
    evidence: "strong",
    blurb: "Raises 25-OH vitamin D in deficient individuals. Better absorbed with fat.",
    effects: [
      { marker_slug: "vitamin-d", direction: "raises", evidence: "strong", note: "Roughly +10 ng/mL per 1000 IU/day after 2-3 months in deficient adults." },
    ],
    interactions: [
      { kind: "medication", match: ["thiazide","hydrochlorothiazide","hctz"], note: "Combination with thiazides can raise calcium — monitor." },
    ],
    upperLimit: "Tolerable upper intake: 4000 IU/day for adults (NIH). Higher under physician guidance.",
  },
  {
    key: "omega-3-fish-oil", display: "Omega-3 (fish oil, EPA/DHA)",
    category: "omega-3",
    typicalDose: "1-2 g EPA+DHA/day with meals",
    evidence: "strong",
    blurb: "Lowers triglycerides; modest cardiovascular benefit at higher doses.",
    effects: [
      { marker_slug: "triglycerides", direction: "lowers", evidence: "strong", note: "~20-30% reduction at 2-4 g/day; smaller at 1 g." },
      { marker_slug: "crp", direction: "lowers", evidence: "moderate", note: "Modest anti-inflammatory effect at higher doses." },
    ],
    interactions: [
      { kind: "medication", match: ["warfarin","coumadin","apixaban","eliquis","rivaroxaban"], note: "Mild bleeding-risk additivity with anticoagulants — discuss with prescriber." },
    ],
  },
  {
    key: "magnesium-glycinate", display: "Magnesium (glycinate or citrate)",
    category: "mineral",
    typicalDose: "200-400 mg elemental Mg at night",
    evidence: "moderate",
    blurb: "Raises serum Mg; supports sleep, blood pressure, glucose handling.",
    effects: [
      { marker_slug: "magnesium", direction: "raises", evidence: "moderate", note: "Especially in users on PPIs or loop diuretics." },
      { marker_slug: "hba1c", direction: "lowers", evidence: "moderate", note: "Small reductions in insulin resistance trials." },
    ],
    interactions: [
      { kind: "medication", match: ["levothyroxine","synthroid"], note: "Separate by 4 hours — magnesium reduces absorption." },
      { kind: "medication", match: ["ciprofloxacin","levofloxacin","tetracycline","doxycycline"], note: "Chelates fluoroquinolones/tetracyclines — separate by 2-4 hours." },
    ],
  },
  {
    key: "vitamin-b12", display: "Vitamin B12 (methylcobalamin)",
    category: "vitamin",
    typicalDose: "500-1000 mcg/day sublingual",
    evidence: "strong",
    blurb: "Raises serum B12. Especially relevant for vegans, older adults, metformin users.",
    effects: [
      { marker_slug: "vitamin-b12", direction: "raises", evidence: "strong", note: "Reliable correction even with mild absorption issues." },
      { marker_slug: "homocysteine", direction: "lowers", evidence: "strong", note: "Combined with folate, lowers homocysteine." },
    ],
    interactions: [],
  },
  {
    key: "folate-l-methylfolate", display: "Folate (L-methylfolate)",
    category: "vitamin",
    typicalDose: "400-1000 mcg/day",
    evidence: "strong",
    blurb: "Lowers homocysteine; required for DNA synthesis. Methylated form bypasses MTHFR variants.",
    effects: [
      { marker_slug: "folate", direction: "raises", evidence: "strong", note: "" },
      { marker_slug: "homocysteine", direction: "lowers", evidence: "strong", note: "" },
    ],
    interactions: [
      { kind: "medication", match: ["methotrexate"], note: "May reduce methotrexate efficacy — coordinate with prescriber." },
    ],
  },
  {
    key: "berberine", display: "Berberine",
    category: "botanical",
    typicalDose: "500 mg, 2-3x daily before meals",
    evidence: "moderate",
    blurb: "Lowers fasting glucose and HbA1c; effects similar magnitude to low-dose metformin in some trials.",
    effects: [
      { marker_slug: "hba1c", direction: "lowers", evidence: "moderate", note: "0.5-1.0% reductions in pre-diabetic populations." },
      { marker_slug: "ldl-cholesterol", direction: "lowers", evidence: "moderate", note: "Modest LDL reduction." },
      { marker_slug: "triglycerides", direction: "lowers", evidence: "moderate", note: "" },
    ],
    interactions: [
      { kind: "medication", match: ["metformin"], note: "Stacks meaningfully with metformin — monitor for hypoglycemia." },
      { kind: "medication", match: ["statin","atorvastatin","simvastatin"], note: "May increase statin levels via CYP3A4 inhibition." },
    ],
  },
  {
    key: "psyllium-husk", display: "Psyllium husk (soluble fiber)",
    category: "other",
    typicalDose: "5-10 g/day with water",
    evidence: "strong",
    blurb: "Lowers LDL via bile-acid binding; helps glucose control.",
    effects: [
      { marker_slug: "ldl-cholesterol", direction: "lowers", evidence: "strong", note: "~5-10% LDL reduction at 7-10 g/day." },
      { marker_slug: "glucose", direction: "lowers", evidence: "moderate", note: "Modest postprandial glucose reduction." },
    ],
    interactions: [
      { kind: "medication", match: ["levothyroxine","synthroid","metformin"], note: "Take medications 1-2 hours before/after fiber to avoid absorption issues." },
    ],
  },
  {
    key: "coq10-ubiquinol", display: "CoQ10 (ubiquinol)",
    category: "other",
    typicalDose: "100-200 mg/day with food",
    evidence: "moderate",
    blurb: "May reduce statin-associated muscle complaints; modest BP benefit.",
    effects: [],
    interactions: [
      { kind: "medication", match: ["warfarin","coumadin"], note: "Can reduce warfarin's effect — monitor INR if starting." },
    ],
  },
  {
    key: "iron-ferrous-bisglycinate", display: "Iron (ferrous bisglycinate)",
    category: "mineral",
    typicalDose: "18-65 mg elemental iron, often every other day",
    evidence: "strong",
    blurb: "Corrects iron deficiency anemia. Better absorbed with vitamin C, away from coffee/tea/calcium.",
    effects: [
      { marker_slug: "ferritin", direction: "raises", evidence: "strong", note: "" },
      { marker_slug: "hemoglobin", direction: "raises", evidence: "strong", note: "In iron-deficient individuals." },
      { marker_slug: "iron", direction: "raises", evidence: "strong", note: "" },
    ],
    interactions: [
      { kind: "condition", match: ["hemochromatosis","iron overload"], note: "Avoid supplemental iron in iron-overload conditions." },
      { kind: "medication", match: ["levothyroxine","synthroid"], note: "Separate by 4 hours — iron reduces levothyroxine absorption." },
    ],
    upperLimit: "Iron supplementation should be guided by ferritin/iron studies — don't supplement blindly.",
  },
  {
    key: "creatine-monohydrate", display: "Creatine monohydrate",
    category: "amino-acid",
    typicalDose: "3-5 g/day, no loading needed",
    evidence: "strong",
    blurb: "Strength, lean mass, cognitive benefits. Mildly raises creatinine (lab artifact, not kidney damage).",
    effects: [
      { marker_slug: "creatinine", direction: "raises", evidence: "strong", note: "+0.1-0.3 mg/dL — interpret eGFR with caution while supplementing." },
    ],
    interactions: [],
  },
  {
    key: "zinc", display: "Zinc",
    category: "mineral",
    typicalDose: "15-30 mg/day",
    evidence: "moderate",
    blurb: "Immune function; supports testosterone in deficient men.",
    effects: [
      { marker_slug: "zinc", direction: "raises", evidence: "strong", note: "" },
    ],
    interactions: [
      { kind: "supplement", match: ["copper"], note: "Long-term high-dose zinc depletes copper — pair with copper if dosing > 25 mg/day chronically." },
      { kind: "medication", match: ["ciprofloxacin","tetracycline","doxycycline"], note: "Separate by 2-4 hours from these antibiotics." },
    ],
    upperLimit: "Tolerable upper intake: 40 mg/day for adults.",
  },
  {
    key: "ashwagandha", display: "Ashwagandha (KSM-66 or Sensoril)",
    category: "botanical",
    typicalDose: "300-600 mg standardized extract daily",
    evidence: "moderate",
    blurb: "May lower cortisol and modestly raise testosterone in stressed men.",
    effects: [
      { marker_slug: "cortisol", direction: "lowers", evidence: "moderate", note: "Most evidence in stressed/anxious populations." },
      { marker_slug: "testosterone-total", direction: "raises", evidence: "limited", note: "Small effect in stressed or low-T men." },
    ],
    interactions: [
      { kind: "medication", match: ["levothyroxine","synthroid"], note: "Can raise thyroid hormone levels — monitor TSH if hyperthyroid risk." },
      { kind: "medication", match: ["sedative","benzodiazepine","alprazolam","diazepam"], note: "Additive sedation possible." },
    ],
  },
  {
    key: "curcumin", display: "Curcumin (with piperine or phytosome)",
    category: "botanical",
    typicalDose: "500-1000 mg curcuminoids/day with fat",
    evidence: "moderate",
    blurb: "Modest anti-inflammatory effect. Use bioavailable formulation (Meriva, BCM-95, or with piperine).",
    effects: [
      { marker_slug: "crp", direction: "lowers", evidence: "moderate", note: "" },
    ],
    interactions: [
      { kind: "medication", match: ["warfarin","coumadin","apixaban","eliquis"], note: "May potentiate anticoagulants." },
    ],
  },
  {
    key: "n-acetylcysteine", display: "N-Acetylcysteine (NAC)",
    category: "amino-acid",
    typicalDose: "600-1200 mg/day",
    evidence: "moderate",
    blurb: "Glutathione precursor; mild liver-supportive effects.",
    effects: [
      { marker_slug: "alt", direction: "lowers", evidence: "moderate", note: "Small reductions in NAFLD trials." },
      { marker_slug: "ast", direction: "lowers", evidence: "moderate", note: "" },
    ],
    interactions: [
      { kind: "medication", match: ["nitroglycerin"], note: "Can enhance vasodilation — monitor BP." },
    ],
  },
];

export function findSupplement(key: string): SupplementDef | null {
  return SUPPLEMENT_CATALOG.find((s) => s.key === key) ?? null;
}

/**
 * Suggest supplements that target the user's out-of-range biomarkers.
 * Returns ranked list with reasons.
 */
export interface SupplementSuggestion {
  supplement: SupplementDef;
  reasons: string[];          // human-readable why-it-was-suggested
  warnings: string[];         // medication/condition interactions detected
}

export function suggestSupplements(opts: {
  outOfRangeSlugs: Set<string>;
  medsText: string | null | undefined;
  conditionsText: string | null | undefined;
}): SupplementSuggestion[] {
  const out: SupplementSuggestion[] = [];
  const medsLower = (opts.medsText ?? "").toLowerCase();
  const condsLower = (opts.conditionsText ?? "").toLowerCase();

  for (const supp of SUPPLEMENT_CATALOG) {
    const reasons: string[] = [];
    for (const eff of supp.effects) {
      if (opts.outOfRangeSlugs.has(eff.marker_slug)) {
        reasons.push(`Targets your ${eff.marker_slug.replace(/-/g, " ")} (evidence: ${eff.evidence})`);
      }
    }
    if (reasons.length === 0) continue;

    const warnings: string[] = [];
    for (const inter of supp.interactions) {
      const haystack = inter.kind === "condition" ? condsLower : medsLower;
      if (inter.match.some((m) => haystack.includes(m))) {
        warnings.push(inter.note);
      }
    }

    out.push({ supplement: supp, reasons, warnings });
  }

  // Rank: more reasons first, then strong > moderate > limited
  const tier = { strong: 0, moderate: 1, limited: 2 };
  return out.sort((a, b) => {
    if (b.reasons.length !== a.reasons.length) return b.reasons.length - a.reasons.length;
    return tier[a.supplement.evidence] - tier[b.supplement.evidence];
  });
}
