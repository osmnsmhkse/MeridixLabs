// Generates 3–4 suggested follow-up questions for the lab chat panel,
// driven by the user's flagged biomarkers. Pure client-side logic — no
// API call needed for instant render alongside the interpretation.

type Tier = "simple" | "medium" | "expert";

interface Flag {
  marker: string;
  value: string;
  unit: string;
  reference: string;
  status: "high" | "low" | "normal";
}

interface Suggestion {
  label: string;
  question: string;
}

// Marker name normalization — collapses common variants to a canonical key.
function normalizeMarker(name: string): string {
  const n = name.toLowerCase().trim();
  if (n.includes("glucose") || n === "fasting glucose" || n === "blood sugar") return "glucose";
  if (n.includes("hba1c") || n.includes("a1c") || n.includes("glycated")) return "hba1c";
  if (n.includes("ldl")) return "ldl";
  if (n.includes("hdl")) return "hdl";
  if ((n.includes("total") && n.includes("cholesterol")) || n === "cholesterol") return "total_cholesterol";
  if (n.includes("triglyceride")) return "triglycerides";
  if (n.includes("vitamin d") || n.includes("25-oh") || n === "25(oh)d") return "vitamin_d";
  if (n.includes("b12") || n.includes("cobalamin")) return "b12";
  if (n.includes("folate") || n.includes("folic")) return "folate";
  if (n.includes("ferritin")) return "ferritin";
  if (n === "iron" || n.includes("serum iron")) return "iron";
  if (n.includes("hemoglobin") || n === "hgb" || n === "hb") return "hemoglobin";
  if (n.includes("hematocrit")) return "hematocrit";
  if (n.includes("platelet")) return "platelets";
  if (n === "tsh" || n.includes("thyroid stimulating")) return "tsh";
  if (n.includes("free t3") || n === "ft3") return "ft3";
  if (n.includes("free t4") || n === "ft4") return "ft4";
  if (n === "ast" || n.includes("aspartate")) return "ast";
  if (n === "alt" || n.includes("alanine")) return "alt";
  if (n === "ggt") return "ggt";
  if (n.includes("alkaline phos")) return "alp";
  if (n.includes("bilirubin")) return "bilirubin";
  if (n.includes("creatinine")) return "creatinine";
  if (n === "bun" || n.includes("urea nitrogen")) return "bun";
  if (n === "egfr") return "egfr";
  if (n.includes("uric acid")) return "uric_acid";
  if (n === "sodium" || n === "na") return "sodium";
  if (n === "potassium" || n === "k") return "potassium";
  if (n === "calcium" || n === "ca") return "calcium";
  if (n === "magnesium" || n === "mg") return "magnesium";
  if (n === "chloride") return "chloride";
  if (n === "co2" || n.includes("bicarbonate")) return "co2";
  if (n === "crp" || n.includes("c-reactive")) return "crp";
  if (n === "esr") return "esr";
  if (n.includes("insulin")) return "insulin";
  if (n.includes("testosterone")) return "testosterone";
  if (n === "psa") return "psa";
  if (n.includes("cortisol")) return "cortisol";
  if (n.includes("white blood") || n === "wbc") return "wbc";
  if (n.includes("red blood") || n === "rbc") return "rbc";
  return "other";
}

type Direction = "high" | "low";

const QUESTION_BANK: Record<string, Partial<Record<Direction, Suggestion>>> = {
  glucose: {
    high: { label: "Lower glucose",    question: "What can I do to lower my glucose, and how concerned should I be about prediabetes?" },
    low:  { label: "Low glucose",      question: "Why might my glucose be low, and what does that mean for me?" },
  },
  hba1c: {
    high: { label: "HbA1c context",    question: "What does my HbA1c tell me about my blood sugar over the last 3 months?" },
  },
  ldl: {
    high: { label: "Heart risk",       question: "Should I be worried about my LDL? Do I need to see a cardiologist?" },
    low:  { label: "Low LDL",          question: "Is having low LDL a problem, or is it usually a good thing?" },
  },
  hdl: {
    low:  { label: "Raise HDL",        question: "How can I raise my HDL cholesterol naturally?" },
  },
  total_cholesterol: {
    high: { label: "Total cholesterol",question: "How concerning is my total cholesterol given my other lipid values?" },
  },
  triglycerides: {
    high: { label: "High triglycerides", question: "What lifestyle changes most help triglycerides, and how fast can they drop?" },
  },
  vitamin_d: {
    low:  { label: "Vitamin D plan",   question: "How much vitamin D should I take, and how long until levels normalize?" },
    high: { label: "High vitamin D",   question: "Is my vitamin D level too high? Should I stop supplementing?" },
  },
  b12: {
    low:  { label: "Low B12",          question: "What causes low B12, and should I get tested for absorption issues?" },
  },
  folate: {
    low:  { label: "Low folate",       question: "What foods or supplements help raise folate?" },
  },
  ferritin: {
    low:  { label: "Iron stores",      question: "Does my low ferritin mean I'm anemic? What should I do next?" },
    high: { label: "High ferritin",    question: "What can cause high ferritin, and is it something I should investigate?" },
  },
  iron: {
    low:  { label: "Low iron",         question: "How should I raise my iron levels, and which supplement form is best?" },
  },
  hemoglobin: {
    low:  { label: "Anemia?",          question: "Does low hemoglobin mean I'm anemic? What's the next step?" },
    high: { label: "High hemoglobin",  question: "What could cause my hemoglobin to be elevated?" },
  },
  hematocrit: {
    low:  { label: "Low hematocrit",   question: "What does a low hematocrit mean alongside my other values?" },
    high: { label: "High hematocrit",  question: "Should I be worried about my elevated hematocrit?" },
  },
  platelets: {
    low:  { label: "Platelets low",    question: "What can cause low platelets, and how serious is it at my level?" },
    high: { label: "Platelets high",   question: "Why might my platelets be elevated?" },
  },
  tsh: {
    high: { label: "Underactive thyroid?", question: "Could my TSH suggest hypothyroidism? Should I get free T3 and T4 checked?" },
    low:  { label: "Overactive thyroid?",  question: "Could my low TSH mean an overactive thyroid?" },
  },
  ft3: {
    high: { label: "T3 high",          question: "What does an elevated free T3 mean for me?" },
    low:  { label: "T3 low",           question: "What does a low free T3 mean for me?" },
  },
  ft4: {
    high: { label: "T4 high",          question: "What does my free T4 result tell me about my thyroid?" },
    low:  { label: "T4 low",           question: "What does a low free T4 mean clinically?" },
  },
  ast: {
    high: { label: "Liver enzymes",    question: "Should I worry about my elevated liver enzymes? What's the most likely cause?" },
  },
  alt: {
    high: { label: "Liver enzymes",    question: "Should I worry about my elevated ALT? What's the most likely cause?" },
  },
  ggt: {
    high: { label: "GGT elevated",     question: "What does an elevated GGT typically point to?" },
  },
  alp: {
    high: { label: "ALP elevated",     question: "What can cause an elevated alkaline phosphatase?" },
  },
  bilirubin: {
    high: { label: "Bilirubin",        question: "What might cause my bilirubin to be elevated?" },
  },
  creatinine: {
    high: { label: "Kidney check",     question: "Does my creatinine suggest a kidney issue? Should I see a nephrologist?" },
    low:  { label: "Low creatinine",   question: "Is low creatinine ever a concern?" },
  },
  bun: {
    high: { label: "BUN elevated",     question: "What can cause an elevated BUN, and how does it compare to my creatinine?" },
  },
  egfr: {
    low:  { label: "eGFR low",         question: "What does my eGFR tell me about kidney function, and what should I do next?" },
  },
  uric_acid: {
    high: { label: "Gout risk",        question: "Does high uric acid mean I'm at risk of gout? What changes lower it?" },
  },
  sodium: {
    low:  { label: "Low sodium",       question: "What might be causing my low sodium, and how serious is it?" },
    high: { label: "High sodium",      question: "What can cause my sodium to run high?" },
  },
  potassium: {
    low:  { label: "Low potassium",    question: "What causes low potassium, and what should I do about it?" },
    high: { label: "High potassium",   question: "Should I be concerned about my high potassium?" },
  },
  calcium: {
    low:  { label: "Low calcium",      question: "What does a low calcium mean, especially with my other values?" },
    high: { label: "High calcium",     question: "What might cause my calcium to be elevated?" },
  },
  magnesium: {
    low:  { label: "Low magnesium",    question: "How can I raise my magnesium, and what symptoms might come from low levels?" },
  },
  crp: {
    high: { label: "Inflammation",     question: "What does a high CRP suggest about inflammation in my body?" },
  },
  esr: {
    high: { label: "Inflammation",     question: "What can an elevated ESR indicate?" },
  },
  insulin: {
    high: { label: "Insulin resistance", question: "Does my high insulin suggest insulin resistance?" },
  },
  testosterone: {
    low:  { label: "Low testosterone", question: "What can cause low testosterone, and what should I ask my doctor about?" },
    high: { label: "High testosterone",question: "What can cause an elevated testosterone level?" },
  },
  psa: {
    high: { label: "Prostate check",   question: "Should I see a urologist about my elevated PSA?" },
  },
  cortisol: {
    high: { label: "Cortisol high",    question: "What might be driving my high cortisol?" },
    low:  { label: "Cortisol low",     question: "What can cause cortisol to run low?" },
  },
  wbc: {
    high: { label: "WBC elevated",     question: "What can cause an elevated white blood cell count?" },
    low:  { label: "WBC low",          question: "Should I be concerned about my low WBC?" },
  },
  rbc: {
    high: { label: "RBC elevated",     question: "What can cause an elevated red blood cell count?" },
    low:  { label: "RBC low",          question: "What might cause a low red blood cell count?" },
  },
};

// Generic fallbacks when no specific mapping fires.
const FALLBACKS: Suggestion[] = [
  { label: "Specialist?",          question: "Which specialist (if any) should I see based on these results?" },
  { label: "Next steps",           question: "What are the most important next steps for me right now?" },
  { label: "Lifestyle changes",    question: "What lifestyle changes would have the biggest impact on these values?" },
  { label: "Repeat testing",       question: "How soon should I repeat these tests, and which ones matter most?" },
];

const TIER_NORMAL_FALLBACKS: Record<Tier, Suggestion[]> = {
  simple: [
    { label: "Big picture",        question: "Can you sum up what these results mean for me in one paragraph?" },
    { label: "Anything to watch?", question: "Even though everything's in range, is there anything I should keep an eye on?" },
    { label: "Stay this healthy",  question: "What can I do to maintain results this good?" },
    { label: "Repeat testing",     question: "When should I get tested again?" },
  ],
  medium: [
    { label: "Trends to watch",    question: "Are any of my in-range values close to a threshold I should track?" },
    { label: "Optimization",       question: "Beyond reference ranges, are any values worth optimizing further?" },
    { label: "Repeat testing",     question: "What's a sensible re-test interval for these markers?" },
    { label: "Adjacent tests",     question: "Are there related tests I should consider adding next time?" },
  ],
  expert: [
    { label: "Subclinical signals",question: "Any subclinical patterns worth flagging despite all values being in range?" },
    { label: "Follow-up panel",    question: "What follow-up panel would you suggest given this baseline?" },
    { label: "Cardio risk score",  question: "How would these values feed into a 10-year ASCVD risk estimate?" },
    { label: "Surveillance",       question: "Recommended surveillance interval given this profile?" },
  ],
};

// ── Turkish locale bank ───────────────────────────────────────────────
const QUESTION_BANK_TR: Record<string, Partial<Record<Direction, Suggestion>>> = {
  glucose:          { high: { label: "Glikoz düşürme",      question: "Glikozumu düşürmek için ne yapabilirim ve prediyabet konusunda ne kadar endişe etmeliyim?" }, low:  { label: "Düşük glikoz",      question: "Glikozum neden düşük olabilir ve bu benim için ne anlama geliyor?" } },
  hba1c:            { high: { label: "HbA1c bağlamı",       question: "HbA1c'm son 3 aydaki kan şekerim hakkında ne söylüyor?" } },
  ldl:              { high: { label: "Kalp riski",           question: "LDL'm konusunda endişelenmeli miyim? Kardiyoloğa görünmem gerekiyor mu?" }, low: { label: "Düşük LDL", question: "Düşük LDL bir sorun mu yoksa genellikle iyi bir şey mi?" } },
  hdl:              { low:  { label: "HDL artırma",          question: "HDL kolesterolümü doğal yollarla nasıl artırabilirim?" } },
  total_cholesterol:{ high: { label: "Toplam kolesterol",    question: "Diğer lipit değerlerime göre toplam kolesterolüm ne kadar endişe verici?" } },
  triglycerides:    { high: { label: "Yüksek trigliserit",   question: "Trigliseritlere en çok hangi yaşam tarzı değişiklikleri yardımcı olur ve ne kadar sürede düşebilirler?" } },
  vitamin_d:        { low:  { label: "D vitamini planı",     question: "Ne kadar D vitamini almalıyım ve seviyeler ne zaman normale döner?" }, high: { label: "Yüksek D vitamini", question: "D vitamini seviyem çok yüksek mi? Takviyeyi bırakmalı mıyım?" } },
  b12:              { low:  { label: "Düşük B12",            question: "Düşük B12'ye ne yol açar ve emilim sorunları için test yaptırmalı mıyım?" } },
  folate:           { low:  { label: "Düşük folat",          question: "Folatı artırmaya yardımcı olan yiyecekler veya takviyeler nelerdir?" } },
  ferritin:         { low:  { label: "Demir depoları",       question: "Düşük ferritim anemi mi demek? Sırada ne yapmalıyım?" }, high: { label: "Yüksek ferritin", question: "Yüksek ferritine ne yol açabilir ve araştırmalı mıyım?" } },
  iron:             { low:  { label: "Düşük demir",          question: "Demir seviyelerimi nasıl yükseltmeliyim ve hangi takviye formu en iyi?" } },
  hemoglobin:       { low:  { label: "Anemi?",               question: "Düşük hemoglobin anemi mi demek? Sonraki adım ne?" }, high: { label: "Yüksek hemoglobin", question: "Hemoglobinimin yüksek olmasına ne yol açabilir?" } },
  hematocrit:       { low:  { label: "Düşük hematokrit",     question: "Diğer değerlerimle birlikte düşük hematokrit ne anlama gelir?" }, high: { label: "Yüksek hematokrit", question: "Yüksek hematokritten endişe etmeli miyim?" } },
  platelets:        { low:  { label: "Düşük trombosit",      question: "Düşük trombosit sayısına ne yol açabilir ve benim seviyemde ne kadar ciddi?" }, high: { label: "Yüksek trombosit", question: "Trombositler neden yüksek olabilir?" } },
  tsh:              { high: { label: "Tiroid yavaş mı?",     question: "TSH'm hipotiroidizmi gösterebilir mi? Serbest T3 ve T4 kontrolü yaptırmalı mıyım?" }, low: { label: "Tiroid hızlı mı?", question: "Düşük TSH'm aşırı aktif tiroid anlamına gelebilir mi?" } },
  ft3:              { high: { label: "T3 yüksek",            question: "Yüksek serbest T3 benim için ne anlama geliyor?" }, low: { label: "T3 düşük", question: "Düşük serbest T3 benim için ne anlama geliyor?" } },
  ft4:              { high: { label: "T4 yüksek",            question: "Serbest T4 sonucum tiroidim hakkında ne söylüyor?" }, low: { label: "T4 düşük", question: "Düşük serbest T4 klinik olarak ne anlama geliyor?" } },
  ast:              { high: { label: "Karaciğer enzimleri",  question: "Yüksek karaciğer enzimlerinden endişe etmeli miyim? Muhtemel neden nedir?" } },
  alt:              { high: { label: "Karaciğer enzimleri",  question: "Yüksek ALT'tan endişe etmeli miyim? Muhtemel neden nedir?" } },
  ggt:              { high: { label: "GGT yüksek",           question: "Yüksek GGT genellikle neyi işaret eder?" } },
  alp:              { high: { label: "ALP yüksek",           question: "Yüksek alkalen fosfataza ne yol açabilir?" } },
  bilirubin:        { high: { label: "Bilirubin",            question: "Bilirubinimin yüksek olmasına ne yol açabilir?" } },
  creatinine:       { high: { label: "Böbrek kontrolü",      question: "Kreatininim böbrek sorununu gösteriyor mu? Nefrologa gitmeli miyim?" }, low: { label: "Düşük kreatinin", question: "Düşük kreatinin endişe verici midir?" } },
  bun:              { high: { label: "Yüksek BUN",           question: "Yüksek BUN'a ne yol açabilir ve kreatininimle nasıl karşılaştırılır?" } },
  egfr:             { low:  { label: "Düşük eGFR",           question: "eGFR'm böbrek fonksiyonu hakkında ne söylüyor ve sırada ne yapmalıyım?" } },
  uric_acid:        { high: { label: "Gut riski",            question: "Yüksek ürik asit gut riskim olduğu anlamına mı geliyor? Hangi değişiklikler düşürür?" } },
  sodium:           { low:  { label: "Düşük sodyum",         question: "Düşük sodyumuma ne yol açıyor olabilir ve ne kadar ciddi?" }, high: { label: "Yüksek sodyum", question: "Sodyumum neden yüksek olabilir?" } },
  potassium:        { low:  { label: "Düşük potasyum",       question: "Düşük potasyuma ne yol açar ve ne yapmalıyım?" }, high: { label: "Yüksek potasyum", question: "Yüksek potasyumdan endişe etmeli miyim?" } },
  calcium:          { low:  { label: "Düşük kalsiyum",       question: "Diğer değerlerimle birlikte düşük kalsiyum ne anlama geliyor?" }, high: { label: "Yüksek kalsiyum", question: "Kalsiyumum neden yüksek olabilir?" } },
  magnesium:        { low:  { label: "Düşük magnezyum",      question: "Magnezyumumu nasıl artırabilirim ve düşük seviyelerin belirtileri nelerdir?" } },
  crp:              { high: { label: "İltihaplanma",         question: "Yüksek CRP vücudumdaki iltihaplanma hakkında ne anlama geliyor?" } },
  esr:              { high: { label: "İltihaplanma",         question: "Yüksek ESR neye işaret edebilir?" } },
  insulin:          { high: { label: "İnsülin direnci",      question: "Yüksek insülinim insülin direncine işaret ediyor mu?" } },
  testosterone:     { low:  { label: "Düşük testosteron",    question: "Düşük testosterona ne yol açabilir ve doktoruma ne sormalıyım?" }, high: { label: "Yüksek testosteron", question: "Testosteron seviyesini yükseltebilecek nedir?" } },
  psa:              { high: { label: "Prostat kontrolü",     question: "Yüksek PSA'm için ürologa görünmeli miyim?" } },
  cortisol:         { high: { label: "Yüksek kortizol",      question: "Yüksek kortizolüme ne yol açıyor olabilir?" }, low: { label: "Düşük kortizol", question: "Kortizol neden düşük olabilir?" } },
  wbc:              { high: { label: "Yüksek WBC",           question: "Yüksek beyaz kan hücresi sayısına ne yol açabilir?" }, low: { label: "Düşük WBC", question: "Düşük WBC'den endişe etmeli miyim?" } },
  rbc:              { high: { label: "Yüksek RBC",           question: "Yüksek kırmızı kan hücresi sayısına ne yol açabilir?" }, low: { label: "Düşük RBC", question: "Düşük kırmızı kan hücresi sayısına ne yol açabilir?" } },
};

const FALLBACKS_TR: Suggestion[] = [
  { label: "Uzman?",             question: "Bu sonuçlara göre hangi uzmanı görmem gerekiyor?" },
  { label: "Sonraki adımlar",    question: "Şu an için en önemli sonraki adımlar nelerdir?" },
  { label: "Yaşam tarzı",        question: "Hangi yaşam tarzı değişiklikleri bu değerlere en büyük etkiyi yapardı?" },
  { label: "Tekrar test",        question: "Bu testleri ne zaman tekrar yaptırmalıyım ve hangisi en önemli?" },
];

const TIER_NORMAL_FALLBACKS_TR: Record<Tier, Suggestion[]> = {
  simple: [
    { label: "Genel bakış",        question: "Bu sonuçların benim için ne anlama geldiğini bir paragrafta özetleyebilir misin?" },
    { label: "Takip edilecek?",    question: "Her şey normal aralıkta olsa da dikkat etmem gereken bir şey var mı?" },
    { label: "Sağlığı koru",       question: "Bu kadar iyi sonuçları sürdürmek için ne yapabilirim?" },
    { label: "Tekrar test",        question: "Tekrar ne zaman test yaptırmalıyım?" },
  ],
  medium: [
    { label: "Takip edilecek",     question: "Normal aralıktaki değerlerimden herhangi biri bir eşiğe yakın mı?" },
    { label: "Optimizasyon",       question: "Referans aralıkları dışında, daha fazla optimize etmeye değer değer var mı?" },
    { label: "Tekrar test",        question: "Bu belirteçler için makul yeniden test aralığı nedir?" },
    { label: "İlgili testler",     question: "Bir sonraki sefere eklemeyi düşünmem gereken ilgili testler var mı?" },
  ],
  expert: [
    { label: "Subklinik sinyaller",question: "Değerlerin tümü normal aralıkta olsa da işaret edilmeye değer subklinik örüntüler var mı?" },
    { label: "Takip paneli",       question: "Bu taban değere göre hangi takip panelini önerirsiniz?" },
    { label: "Kardiyovasküler risk",question: "Bu değerler 10 yıllık ASCVD risk tahminini nasıl etkiler?" },
    { label: "Gözetim",            question: "Bu profile göre önerilen gözetim aralığı nedir?" },
  ],
};

function getBankForLocale(locale: string) {
  if (locale === "tr") return { bank: QUESTION_BANK_TR, fallbacks: FALLBACKS_TR, tierFallbacks: TIER_NORMAL_FALLBACKS_TR };
  return { bank: QUESTION_BANK, fallbacks: FALLBACKS, tierFallbacks: TIER_NORMAL_FALLBACKS };
}

export function suggestFollowUpQuestions(flags: Flag[], tier: Tier, locale = "en"): Suggestion[] {
  const { bank, fallbacks, tierFallbacks } = getBankForLocale(locale);
  const out: Suggestion[] = [];
  const seen = new Set<string>();

  // 1. Map abnormal flags to specific questions
  for (const f of flags) {
    if (f.status !== "high" && f.status !== "low") continue;
    const key = normalizeMarker(f.marker);
    if (seen.has(key)) continue;
    const entry = bank[key]?.[f.status];
    if (entry) {
      out.push(entry);
      seen.add(key);
    }
    if (out.length >= 4) break;
  }

  // 2. If we have flags but didn't fill 4, top up with fallbacks
  if (out.length > 0 && out.length < 4) {
    for (const fb of fallbacks) {
      if (out.length >= 4) break;
      out.push(fb);
    }
  }

  // 3. No flags at all → tier-aware "all normal" prompts
  if (out.length === 0) {
    out.push(...tierFallbacks[tier].slice(0, 4));
  }

  return out.slice(0, 4);
}
