// Curated catalog of clinically and consumer-relevant variants.
// Extracted server-side from raw 23andMe / Ancestry / MyHeritage data files
// and used to ground the AI's interpretation with reliable significance tiers.
// Significance follows ACMG-style framing where applicable; "modest_effect"
// and "moderate_effect" are for common SNPs whose impact is real but not
// pathogenic in the clinical sense.

export type Significance =
  | "benign"
  | "likely_benign"
  | "modest_effect"
  | "moderate_effect"
  | "vus"
  | "likely_pathogenic"
  | "pathogenic";

export type VariantCategory =
  | "consumer"       // common SNP, found on direct-to-consumer chips
  | "clinical"       // disease-associated variant typically tested clinically
  | "pharmacogenomic"; // affects medication metabolism

export interface VariantDef {
  rsid: string;            // dbSNP id, e.g. "rs1801133"
  gene: string;            // gene symbol, e.g. "MTHFR"
  commonName: string;      // human-friendly name, e.g. "MTHFR C677T"
  hgvs?: string;           // HGVS notation when applicable, e.g. "c.665C>T"
  alleles: string[];       // possible alleles at this locus
  riskAllele?: string;     // the allele typically associated with the effect
  category: VariantCategory;
  significance: Significance;
  description: string;     // 1-2 sentence neutral summary
  misconception?: string;  // common consumer misunderstanding worth correcting
  sources?: string[];      // canonical references (ClinVar, SNPedia, etc.)
}

// Fast lookup set used by the raw-data parser.
export const WATCH_RSIDS: Set<string> = new Set([
  "rs1801133", "rs1801131",                 // MTHFR
  "rs429358",  "rs7412",                    // APOE
  "rs6025",                                 // Factor V Leiden
  "rs1800562", "rs1799945",                 // HFE hemochromatosis
  "rs1799963",                              // Prothrombin G20210A
  "rs671",                                  // ALDH2
  "rs4244285", "rs12248560",                // CYP2C19 *2 and *17
  "rs3892097", "rs1065852",                 // CYP2D6 *4 markers
  "rs4988235",                              // LCT (lactase persistence)
  "rs4129267",                              // IL6R (commonly reported)
  "rs2476601",                              // PTPN22 (autoimmune)
  "rs17822931",                             // ABCC11 (earwax / sweat)
  "rs4680",                                 // COMT (Val158Met)
  "rs53576",                                // OXTR (oft-misinterpreted)
]);

export const VARIANT_CATALOG: VariantDef[] = [
  // ── MTHFR ─────────────────────────────────────────────────────────────────
  {
    rsid: "rs1801133",
    gene: "MTHFR",
    commonName: "MTHFR C677T",
    hgvs: "c.665C>T (p.Ala222Val)",
    alleles: ["C", "T"],
    riskAllele: "T",
    category: "consumer",
    significance: "modest_effect",
    description:
      "A common variant in the MTHFR gene that modestly reduces the activity of an enzyme involved in folate metabolism. Heterozygous (C/T) carriers have about 30% reduced enzyme activity; homozygous (T/T) carriers have about 60–70% reduced activity. Despite intense online attention, large studies have not found that this variant meaningfully increases risk of cardiovascular disease, miscarriage, depression, or autism in the general population.",
    misconception:
      "MTHFR variants are heavily over-discussed in wellness circles. Standard folic acid is absorbed and used effectively by the vast majority of carriers; specialized methylfolate supplementation is rarely necessary. A C677T result is not a diagnosis and does not require treatment on its own.",
    sources: ["ClinVar", "SNPedia", "NIH MedlinePlus"],
  },
  {
    rsid: "rs1801131",
    gene: "MTHFR",
    commonName: "MTHFR A1298C",
    hgvs: "c.1286A>C (p.Glu429Ala)",
    alleles: ["A", "C"],
    riskAllele: "C",
    category: "consumer",
    significance: "modest_effect",
    description:
      "A second common MTHFR variant. On its own it has a smaller effect than C677T. Compound heterozygosity (one copy of each) reduces enzyme activity moderately but, like C677T alone, is not a clinically significant finding for most people.",
    misconception:
      "This variant is often packaged with C677T in consumer reports as if it explained a wide range of symptoms. The current clinical evidence does not support that narrative.",
    sources: ["ClinVar", "SNPedia"],
  },

  // ── APOE ──────────────────────────────────────────────────────────────────
  {
    rsid: "rs429358",
    gene: "APOE",
    commonName: "APOE ε4 (rs429358)",
    alleles: ["T", "C"],
    riskAllele: "C",
    category: "consumer",
    significance: "moderate_effect",
    description:
      "One of two SNPs that together define the APOE ε2/ε3/ε4 alleles. The ε4 allele is the strongest known common genetic risk factor for late-onset Alzheimer's disease, but it is a risk factor, not a determinant — many ε4 carriers never develop Alzheimer's, and many non-carriers do.",
    misconception:
      "Carrying one or two copies of ε4 does not mean you will get Alzheimer's. Lifestyle, cardiovascular health, and sleep meaningfully modify risk. Most genetic counselors recommend interpreting APOE results with a counselor before drawing any conclusions about future risk.",
    sources: ["ClinVar", "Alzheimer's Association", "SNPedia"],
  },
  {
    rsid: "rs7412",
    gene: "APOE",
    commonName: "APOE ε2 (rs7412)",
    alleles: ["C", "T"],
    riskAllele: "C",
    category: "consumer",
    significance: "moderate_effect",
    description:
      "The second SNP that, combined with rs429358, defines the APOE allele a person carries. The ε2 variant is associated with reduced Alzheimer's risk in most studies but is also linked to a rare lipid disorder (type III hyperlipoproteinemia) in homozygous carriers.",
    sources: ["ClinVar", "SNPedia"],
  },

  // ── Factor V Leiden ───────────────────────────────────────────────────────
  {
    rsid: "rs6025",
    gene: "F5",
    commonName: "Factor V Leiden",
    hgvs: "c.1601G>A (p.Arg534Gln)",
    alleles: ["G", "A"],
    riskAllele: "A",
    category: "clinical",
    significance: "likely_pathogenic",
    description:
      "A well-characterized variant that increases the risk of abnormal blood clotting (venous thromboembolism). Heterozygous carriers have roughly a 4–8× higher lifetime risk of deep vein thrombosis; homozygous carriers have a substantially higher risk. The absolute lifetime risk for heterozygotes remains modest in the absence of other risk factors.",
    misconception:
      "Most heterozygous carriers will never have a clotting event. The variant changes risk during high-risk situations (surgery, immobilization, pregnancy, hormonal contraceptives) — those windows are when counseling matters most.",
    sources: ["ClinVar", "NIH GHR"],
  },

  // ── Hemochromatosis (HFE) ─────────────────────────────────────────────────
  {
    rsid: "rs1800562",
    gene: "HFE",
    commonName: "HFE C282Y",
    hgvs: "c.845G>A (p.Cys282Tyr)",
    alleles: ["G", "A"],
    riskAllele: "A",
    category: "clinical",
    significance: "likely_pathogenic",
    description:
      "The primary variant causing hereditary hemochromatosis (iron overload). Homozygous C282Y/C282Y is the most common genotype in clinically affected individuals, though penetrance is variable — many homozygotes never develop iron overload severe enough to need treatment. Heterozygous carriers are usually unaffected.",
    sources: ["ClinVar", "NIH GHR"],
  },
  {
    rsid: "rs1799945",
    gene: "HFE",
    commonName: "HFE H63D",
    hgvs: "c.187C>G (p.His63Asp)",
    alleles: ["C", "G"],
    riskAllele: "G",
    category: "clinical",
    significance: "modest_effect",
    description:
      "A milder HFE variant. On its own H63D is rarely sufficient to cause clinical hemochromatosis. Compound heterozygotes (one C282Y and one H63D) have intermediate risk and may show mildly elevated iron studies; clinical significance depends on iron labs, not the genotype alone.",
    sources: ["ClinVar"],
  },

  // ── Prothrombin ───────────────────────────────────────────────────────────
  {
    rsid: "rs1799963",
    gene: "F2",
    commonName: "Prothrombin G20210A",
    hgvs: "c.*97G>A",
    alleles: ["G", "A"],
    riskAllele: "A",
    category: "clinical",
    significance: "likely_pathogenic",
    description:
      "A variant in the prothrombin gene that increases the level of clotting factor II, raising the risk of venous thrombosis. Heterozygous carriers have about a 2–3× higher relative risk of deep vein thrombosis; the absolute lifetime risk remains modest without additional risk factors.",
    sources: ["ClinVar"],
  },

  // ── ALDH2 ─────────────────────────────────────────────────────────────────
  {
    rsid: "rs671",
    gene: "ALDH2",
    commonName: "ALDH2 *2 (alcohol flush)",
    hgvs: "c.1510G>A (p.Glu504Lys)",
    alleles: ["G", "A"],
    riskAllele: "A",
    category: "consumer",
    significance: "moderate_effect",
    description:
      "Reduces the activity of the enzyme that breaks down acetaldehyde during alcohol metabolism. Very common in East Asian populations. Carriers experience facial flushing, nausea, and elevated heart rate when drinking alcohol; homozygotes (A/A) are nearly intolerant of alcohol. Long-term alcohol consumption in carriers is linked to higher esophageal cancer risk.",
    sources: ["ClinVar", "SNPedia"],
  },

  // ── Pharmacogenomic: CYP2C19 ──────────────────────────────────────────────
  {
    rsid: "rs4244285",
    gene: "CYP2C19",
    commonName: "CYP2C19 *2",
    alleles: ["G", "A"],
    riskAllele: "A",
    category: "pharmacogenomic",
    significance: "moderate_effect",
    description:
      "Defines the CYP2C19 *2 loss-of-function allele. Carriers have reduced CYP2C19 enzyme activity, which affects metabolism of several medications — most notably clopidogrel (Plavix), certain proton pump inhibitors, and some antidepressants. A documented loss-of-function genotype can change drug-choice and dosing recommendations.",
    sources: ["CPIC", "ClinVar"],
  },
  {
    rsid: "rs12248560",
    gene: "CYP2C19",
    commonName: "CYP2C19 *17",
    alleles: ["C", "T"],
    riskAllele: "T",
    category: "pharmacogenomic",
    significance: "moderate_effect",
    description:
      "Defines the CYP2C19 *17 rapid-metabolizer allele. Carriers metabolize CYP2C19 substrates faster than average; this can reduce the effectiveness of drugs that need slow metabolism (like some PPIs) and increase the active form of prodrugs.",
    sources: ["CPIC"],
  },

  // ── Pharmacogenomic: CYP2D6 ───────────────────────────────────────────────
  {
    rsid: "rs3892097",
    gene: "CYP2D6",
    commonName: "CYP2D6 *4",
    alleles: ["G", "A"],
    riskAllele: "A",
    category: "pharmacogenomic",
    significance: "moderate_effect",
    description:
      "A common loss-of-function variant defining the CYP2D6 *4 allele. CYP2D6 metabolizes a wide range of drugs including codeine, tamoxifen, certain antidepressants, and beta-blockers. Note: 23andMe-style chips capture only some CYP2D6 alleles and cannot fully characterize CYP2D6 status — a clinical pharmacogenomic panel is required for treatment decisions.",
    misconception:
      "Consumer-chip CYP2D6 results are incomplete. Do not change medications based on a 23andMe-style report alone.",
    sources: ["CPIC"],
  },
  {
    rsid: "rs1065852",
    gene: "CYP2D6",
    commonName: "CYP2D6 *10 / *4 marker",
    alleles: ["G", "A"],
    riskAllele: "A",
    category: "pharmacogenomic",
    significance: "modest_effect",
    description:
      "A SNP that, depending on haplotype context, marks the CYP2D6 *10 or *4 alleles. Like other consumer CYP2D6 variants, it should not be used in isolation to make clinical decisions about medication.",
    sources: ["CPIC"],
  },

  // ── Lactose tolerance ─────────────────────────────────────────────────────
  {
    rsid: "rs4988235",
    gene: "LCT",
    commonName: "LCT (lactase persistence)",
    alleles: ["G", "A"],
    riskAllele: "G",
    category: "consumer",
    significance: "benign",
    description:
      "A regulatory variant upstream of the LCT gene. The A allele is associated with continued lactase production into adulthood (lactose tolerance). The G/G genotype is associated with reduced lactase production after childhood (the typical mammalian pattern), and is more common in East Asian, African, and many Indigenous populations.",
    sources: ["SNPedia", "NIH GHR"],
  },

  // ── COMT ──────────────────────────────────────────────────────────────────
  {
    rsid: "rs4680",
    gene: "COMT",
    commonName: "COMT Val158Met",
    alleles: ["G", "A"],
    riskAllele: "A",
    category: "consumer",
    significance: "modest_effect",
    description:
      "A variant in the COMT gene that affects breakdown of catecholamines (dopamine, norepinephrine, epinephrine) in the prefrontal cortex. The Met (A) allele is associated with slower COMT activity; the Val (G) allele with faster activity. Effects on cognition, stress response, and personality have been studied extensively but effect sizes are small.",
    misconception:
      "Consumer narratives often describe COMT genotypes as 'warrior vs. worrier' personalities. Real-world effects are subtle, context-dependent, and not predictive at the individual level.",
    sources: ["SNPedia"],
  },

  // ── OXTR ──────────────────────────────────────────────────────────────────
  {
    rsid: "rs53576",
    gene: "OXTR",
    commonName: "OXTR (oxytocin receptor)",
    alleles: ["A", "G"],
    riskAllele: "A",
    category: "consumer",
    significance: "modest_effect",
    description:
      "A SNP in the oxytocin receptor gene. Early studies linked the G allele to higher empathy and social sensitivity. Larger replications have shown small or inconsistent effects.",
    misconception:
      "Despite frequent claims, this single SNP does not meaningfully determine empathy, attachment style, or social behavior.",
    sources: ["SNPedia"],
  },

  // ── PTPN22 ────────────────────────────────────────────────────────────────
  {
    rsid: "rs2476601",
    gene: "PTPN22",
    commonName: "PTPN22 R620W",
    alleles: ["G", "A"],
    riskAllele: "A",
    category: "consumer",
    significance: "modest_effect",
    description:
      "A variant associated with modestly increased risk of several autoimmune conditions including type 1 diabetes, rheumatoid arthritis, and lupus. The effect is real but small at the individual level — most carriers do not develop autoimmune disease.",
    sources: ["ClinVar", "SNPedia"],
  },

  // ── ABCC11 (earwax) ───────────────────────────────────────────────────────
  {
    rsid: "rs17822931",
    gene: "ABCC11",
    commonName: "ABCC11 (earwax / body odor)",
    alleles: ["C", "T"],
    riskAllele: "T",
    category: "consumer",
    significance: "benign",
    description:
      "A SNP that determines wet versus dry earwax type and influences apocrine sweat composition. The T/T genotype gives dry earwax and reduced body odor and is most common in East Asian populations. Of no clinical significance.",
    sources: ["SNPedia"],
  },

  // ── BRCA1/2 — catalog entries for prompt context only (23andMe limit) ─────
  {
    rsid: "rs80357713",
    gene: "BRCA1",
    commonName: "BRCA1 185delAG (Ashkenazi founder)",
    alleles: ["—", "del"],
    category: "clinical",
    significance: "pathogenic",
    description:
      "One of three Ashkenazi-Jewish founder variants in BRCA1/2 that 23andMe tests for. Pathogenic — strongly associated with increased lifetime risk of breast and ovarian cancer. A positive result from any consumer test must be confirmed clinically and discussed with a genetic counselor.",
    misconception:
      "A negative 23andMe BRCA result does NOT rule out other BRCA1 or BRCA2 pathogenic variants. 23andMe tests only three of the thousands of known BRCA variants. For anyone with a family history of breast, ovarian, prostate, or pancreatic cancer, a full clinical sequencing test through a genetic counselor is the appropriate next step.",
    sources: ["ClinVar", "NCCN", "23andMe Health"],
  },
  {
    rsid: "rs80357906",
    gene: "BRCA1",
    commonName: "BRCA1 5382insC (Ashkenazi founder)",
    alleles: ["—", "ins"],
    category: "clinical",
    significance: "pathogenic",
    description:
      "Second of the three Ashkenazi-Jewish founder variants in BRCA1/2 that 23andMe tests for. Pathogenic.",
    misconception:
      "A negative consumer-chip BRCA result is not equivalent to a negative clinical BRCA sequencing test.",
    sources: ["ClinVar", "NCCN"],
  },
  {
    rsid: "rs80359550",
    gene: "BRCA2",
    commonName: "BRCA2 6174delT (Ashkenazi founder)",
    alleles: ["—", "del"],
    category: "clinical",
    significance: "pathogenic",
    description:
      "Third of the three Ashkenazi-Jewish founder variants in BRCA1/2 that 23andMe tests for. Pathogenic.",
    misconception:
      "Negative consumer-chip BRCA testing rules out only these three specific variants and nothing else.",
    sources: ["ClinVar", "NCCN"],
  },
];

// Quick index by rsID for the parser and prompt builder.
export const VARIANT_BY_RSID: Map<string, VariantDef> = new Map(
  VARIANT_CATALOG.map((v) => [v.rsid, v]),
);

// Human-friendly label for a significance tier.
export const SIGNIFICANCE_LABEL: Record<Significance, string> = {
  benign: "Benign",
  likely_benign: "Likely benign",
  modest_effect: "Modest effect",
  moderate_effect: "Moderate effect",
  vus: "Variant of uncertain significance",
  likely_pathogenic: "Likely pathogenic",
  pathogenic: "Pathogenic",
};

// Which tiers warrant the elevated UI treatment + strong counselor CTA.
export const SERIOUS_SIGNIFICANCE: Set<Significance> = new Set([
  "likely_pathogenic",
  "pathogenic",
]);
