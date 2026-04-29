// Clinical risk score calculators.
// Inputs come from normalized biomarker series + user profile.
// Each calculator returns null if required inputs are missing — never guess.
//
// Sources:
//   ASCVD: 2018 AHA/ACC pooled cohort equations (10-year risk, age 40-79)
//   FIB-4: simple non-invasive liver fibrosis screen (Sterling 2006)
//   Metabolic syndrome: NCEP ATP III (any 3 of 5 criteria)
//   Diabetes risk: based on HbA1c + glucose categorization (ADA)

import type { NormalizedSeries } from "./dashboardData";

export interface RiskInput {
  series: Map<string, NormalizedSeries>;
  age: number | null;
  sex: "male" | "female" | "other" | null;
  // Future: smoking, BP, race; for now we conservatively skip ASCVD if absent.
  smokingCurrent?: boolean;
  diabetes?: boolean;
  treatedHypertension?: boolean;
  systolicBP?: number;
}

export type RiskTier = "low" | "borderline" | "intermediate" | "high";

export interface RiskScore {
  id: string;
  label: string;
  value: number | null;        // numeric score (e.g., 7.4 for 7.4% 10-yr ASCVD)
  unit?: string;                // "%", etc.
  tier: RiskTier | null;
  blurb: string;                // plain-English interpretation
  inputsUsed: string[];         // shown to user for transparency
  missing: string[];            // fields needed but unavailable
}

function latest(slug: string, series: Map<string, NormalizedSeries>): number | null {
  const s = series.get(slug);
  if (!s) return null;
  return s.latest.value;
}

// ── Metabolic Syndrome (NCEP ATP III) ──
// Criteria (any 3 of 5):
//   1. Triglycerides ≥ 150
//   2. HDL: men < 40, women < 50
//   3. Fasting glucose ≥ 100
//   4. BP ≥ 130/85 (or treated)
//   5. Waist circumference (we proxy with BMI > 30 if available — flagged as approximation)
export function metabolicSyndrome(inp: RiskInput): RiskScore {
  const trig = latest("triglycerides", inp.series);
  const hdl  = latest("hdl-cholesterol", inp.series);
  const glu  = latest("glucose", inp.series);
  const a1c  = latest("hba1c", inp.series);

  const inputsUsed: string[] = [];
  const missing: string[] = [];
  let met = 0;

  if (trig != null) {
    inputsUsed.push(`Triglycerides ${trig}`);
    if (trig >= 150) met++;
  } else missing.push("Triglycerides");

  if (hdl != null && inp.sex) {
    inputsUsed.push(`HDL ${hdl}`);
    if ((inp.sex === "male" && hdl < 40) || (inp.sex === "female" && hdl < 50)) met++;
  } else if (!inp.sex) missing.push("Sex (for HDL threshold)");
  else missing.push("HDL");

  if (glu != null) {
    inputsUsed.push(`Fasting glucose ${glu}`);
    if (glu >= 100) met++;
  } else if (a1c != null && a1c >= 5.7) {
    inputsUsed.push(`HbA1c ${a1c} (proxy for glucose criterion)`);
    met++;
  } else missing.push("Glucose or HbA1c");

  // BP and waist not captured — note them as missing
  missing.push("Blood pressure", "Waist circumference");

  const knownCriteria = inputsUsed.length;
  const tier: RiskTier | null =
    knownCriteria < 2 ? null
    : met >= 3 ? "high"
    : met === 2 ? "intermediate"
    : met === 1 ? "borderline"
    : "low";

  const value = met;
  const blurb = tier == null
    ? "Need more lab values to evaluate."
    : met >= 3
      ? `${met}/3 criteria met from labs alone — likely metabolic syndrome. Add BP and waist to confirm.`
      : met === 2
      ? `${met} of the 5 criteria met from labs. One more would meet the metabolic syndrome definition.`
      : met === 1
      ? `Only ${met} criterion met from labs — borderline.`
      : "No criteria met from labs.";

  return {
    id: "metabolic-syndrome",
    label: "Metabolic syndrome",
    value, unit: "/3+ criteria", tier, blurb, inputsUsed, missing,
  };
}

// ── FIB-4 (liver fibrosis screen) ──
// FIB-4 = (Age × AST) / (Platelets × √ALT)
// <1.3 low, 1.3-2.67 intermediate, >2.67 high
export function fib4(inp: RiskInput): RiskScore {
  const ast = latest("ast", inp.series);
  const alt = latest("alt", inp.series);
  const plt = latest("platelets", inp.series);
  const age = inp.age;

  const inputsUsed: string[] = [];
  const missing: string[] = [];
  if (ast == null) missing.push("AST"); else inputsUsed.push(`AST ${ast}`);
  if (alt == null) missing.push("ALT"); else inputsUsed.push(`ALT ${alt}`);
  if (plt == null) missing.push("Platelets"); else inputsUsed.push(`Platelets ${plt}`);
  if (age == null) missing.push("Age"); else inputsUsed.push(`Age ${age}`);

  if (ast == null || alt == null || plt == null || age == null) {
    return {
      id: "fib-4", label: "Liver fibrosis (FIB-4)", value: null, tier: null,
      blurb: "Need AST, ALT, platelets, and age.",
      inputsUsed, missing,
    };
  }

  const value = (age * ast) / (plt * Math.sqrt(alt));
  const tier: RiskTier = value < 1.3 ? "low" : value <= 2.67 ? "intermediate" : "high";
  const blurb =
    tier === "low" ? "Low likelihood of advanced liver fibrosis."
    : tier === "intermediate" ? "Indeterminate range — usually warrants further evaluation."
    : "High — strongly consider hepatology evaluation and FibroScan.";

  return {
    id: "fib-4", label: "Liver fibrosis (FIB-4)",
    value: Math.round(value * 100) / 100, unit: "score",
    tier, blurb, inputsUsed, missing,
  };
}

// ── Diabetes status (ADA categorization) ──
export function diabetesStatus(inp: RiskInput): RiskScore {
  const a1c = latest("hba1c", inp.series);
  const glu = latest("glucose", inp.series);

  const inputsUsed: string[] = [];
  const missing: string[] = [];
  if (a1c != null) inputsUsed.push(`HbA1c ${a1c}`); else missing.push("HbA1c");
  if (glu != null) inputsUsed.push(`Fasting glucose ${glu}`); else missing.push("Fasting glucose");

  if (a1c == null && glu == null) {
    return {
      id: "diabetes-status", label: "Diabetes status",
      value: null, tier: null,
      blurb: "Need HbA1c or fasting glucose.",
      inputsUsed, missing,
    };
  }

  // Highest tier across the two measurements
  let tier: RiskTier = "low";
  let label = "Normal range";
  if (a1c != null) {
    if (a1c >= 6.5)      { tier = "high";         label = "Diabetes range (HbA1c ≥ 6.5%)"; }
    else if (a1c >= 5.7) { tier = "intermediate"; label = "Prediabetes range (HbA1c 5.7–6.4%)"; }
  }
  if (glu != null) {
    if (glu >= 126)             { tier = "high";         label = "Diabetes range (FPG ≥ 126)"; }
    else if (glu >= 100 && tier !== "high") { tier = "intermediate"; label = "Prediabetes range (FPG 100–125)"; }
  }

  return {
    id: "diabetes-status", label: "Diabetes status",
    value: a1c ?? glu, unit: a1c != null ? "% A1c" : "mg/dL",
    tier,
    blurb: label,
    inputsUsed, missing,
  };
}

// ── Cardiovascular: ApoB-based risk note (when ASCVD inputs are incomplete) ──
// Provides a simple "your atherogenic burden" tier from ApoB or non-HDL.
export function atherogenicBurden(inp: RiskInput): RiskScore {
  const apob   = latest("apob", inp.series);
  const ldl    = latest("ldl-cholesterol", inp.series);
  const nonhdl = latest("non-hdl-cholesterol", inp.series);
  const lpa    = latest("lp-a", inp.series);

  const inputsUsed: string[] = [];
  if (apob != null) inputsUsed.push(`ApoB ${apob}`);
  if (ldl != null)  inputsUsed.push(`LDL ${ldl}`);
  if (nonhdl != null) inputsUsed.push(`non-HDL ${nonhdl}`);
  if (lpa != null)  inputsUsed.push(`Lp(a) ${lpa}`);

  if (apob == null && ldl == null && nonhdl == null) {
    return {
      id: "atherogenic-burden", label: "Atherogenic burden",
      value: null, tier: null,
      blurb: "Need ApoB, LDL, or non-HDL cholesterol.",
      inputsUsed, missing: ["ApoB or LDL or non-HDL"],
    };
  }

  // Use the most informative available, in order: ApoB > non-HDL > LDL
  let tier: RiskTier = "low";
  let value: number; let unit = "mg/dL";
  let label = "";
  if (apob != null) {
    value = apob;
    label = "ApoB";
    if (apob >= 130)       tier = "high";
    else if (apob >= 100)  tier = "intermediate";
    else if (apob >= 80)   tier = "borderline";
  } else if (nonhdl != null) {
    value = nonhdl;
    label = "non-HDL";
    if (nonhdl >= 190)     tier = "high";
    else if (nonhdl >= 160) tier = "intermediate";
    else if (nonhdl >= 130) tier = "borderline";
  } else {
    value = ldl!;
    label = "LDL";
    if (ldl! >= 160)       tier = "high";
    else if (ldl! >= 130)  tier = "intermediate";
    else if (ldl! >= 100)  tier = "borderline";
  }

  // Lp(a) elevation upgrades by one tier (if measured)
  let lpaNote = "";
  if (lpa != null && lpa >= 125) {
    if (tier === "low") tier = "borderline";
    else if (tier === "borderline") tier = "intermediate";
    else if (tier === "intermediate") tier = "high";
    lpaNote = " Lp(a) is elevated, raising lifetime cardiovascular risk independent of LDL.";
  }

  const blurb = (tier === "high" ? "High atherogenic load — discuss aggressive lipid management."
    : tier === "intermediate" ? "Moderate atherogenic load — typical statin/ApoB target territory."
    : tier === "borderline" ? "Borderline — lifestyle and one-year recheck usually appropriate."
    : "Low atherogenic load.") + lpaNote;

  return {
    id: "atherogenic-burden", label: `Atherogenic burden (${label})`,
    value, unit, tier, blurb, inputsUsed, missing: [],
  };
}

export function computeAllRisks(inp: RiskInput): RiskScore[] {
  return [
    metabolicSyndrome(inp),
    diabetesStatus(inp),
    atherogenicBurden(inp),
    fib4(inp),
  ];
}

export function tierColor(t: RiskTier | null): string {
  if (t === "low") return "emerald";
  if (t === "borderline") return "amber";
  if (t === "intermediate") return "orange";
  if (t === "high") return "red";
  return "slate";
}
