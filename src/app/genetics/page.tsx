import type { Metadata } from "next";
import GeneticsClient from "./GeneticsClient";

export const metadata: Metadata = {
  title: "Genetic Test Explainer — What Does My DNA Result Mean? | Meridix Labs",
  description:
    "Paste any variant or upload your 23andMe, AncestryDNA, MyHeritage, Invitae, or GeneDx report and get a calibrated, plain-English explanation. MTHFR, APOE, BRCA, Factor V Leiden, hemochromatosis, ALDH2 and more — what each variant is, what it does, how significant it is, and what to do about it.",
  alternates: { canonical: "https://www.meridixlabs.com/genetics" },
  keywords: [
    "genetic test explainer",
    "what does MTHFR mean",
    "APOE4 explained",
    "BRCA1 BRCA2 23andMe",
    "Factor V Leiden",
    "hemochromatosis HFE",
    "ALDH2 alcohol flush",
    "23andMe raw data interpretation",
    "AncestryDNA health",
    "Invitae report",
    "genetic counselor",
  ],
  openGraph: {
    title: "Genetic Test Explainer — Understand Your DNA Results",
    description:
      "23andMe, Invitae, MyHeritage — paste any variant or upload your full report and understand what it actually means.",
    url: "https://www.meridixlabs.com/genetics",
    siteName: "Meridix Labs",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Genetic Test Explainer — Meridix Labs",
    description:
      "Paste a variant or upload your DNA report. Understand what your results actually mean — calibrated, not alarmist.",
  },
};

// Schema.org FAQPage for the static SEO FAQ block. Mirrors the user-visible
// FAQs rendered in GeneticsClient.
const FAQ_JSONLD = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What does MTHFR C677T mean?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "MTHFR C677T (rs1801133) is one of the most-searched variants in consumer genetics. It's a common variant in the MTHFR gene that modestly reduces the activity of an enzyme involved in folate metabolism. Heterozygous (C/T) carriers retain about 70% of normal enzyme activity; homozygous (T/T) carriers retain about 30%. Despite extensive online attention and wellness-industry claims, large studies have not found that this variant meaningfully increases risk of cardiovascular disease, miscarriage, depression, or autism in the general population. Standard folic acid is absorbed and utilized effectively by the vast majority of carriers — specialized methylfolate supplementation is rarely necessary. A C677T result is not a diagnosis and does not on its own require treatment or lifestyle changes. If you've been told your symptoms are 'because of MTHFR,' that explanation is almost certainly wrong. The most useful next step is a conversation with a primary care physician or genetic counselor who can put the result in the context of your actual labs (such as homocysteine) and family history.",
      },
    },
    {
      "@type": "Question",
      name: "I have one or two copies of APOE ε4. Does that mean I'll get Alzheimer's?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "No. APOE ε4 is the strongest known common genetic risk factor for late-onset Alzheimer's disease, but it is a risk factor, not a determinant. Many people with one or even two copies of ε4 never develop Alzheimer's, and many people without any ε4 copies do develop it. Lifestyle factors — cardiovascular health, sleep quality, blood pressure control, education and cognitive engagement — meaningfully modify your actual risk. APOE results are best interpreted with a genetic counselor, especially before sharing with family members. The ε4 finding is also relevant if you ever face a head injury or anesthesia decision, but on its own it is not a reason to make major life changes. If you found out about your APOE status through a consumer test and feel anxious, that anxiety alone is a reason to speak with a counselor — they can put the result in context and help you decide what (if anything) to do with the information.",
      },
    },
    {
      "@type": "Question",
      name: "I got a 'BRCA negative' result from 23andMe. Does that mean I don't have a BRCA mutation?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Critically, no — and this is one of the most dangerous misunderstandings in consumer genetic testing. 23andMe tests only three specific BRCA1 and BRCA2 variants that are most common in Ashkenazi Jewish populations (185delAG and 5382insC in BRCA1, and 6174delT in BRCA2). There are thousands of other BRCA pathogenic variants that 23andMe does NOT test for. A negative 23andMe BRCA result rules out only those three specific variants and nothing else. If you have a family history of breast, ovarian, prostate, or pancreatic cancer — especially in close relatives, at young ages, or across generations — you should pursue clinical BRCA testing through a genetic counselor regardless of what your 23andMe report shows. A clinical sequencing panel (often covered by insurance when family history meets criteria) tests for the full range of pathogenic variants in BRCA1, BRCA2, and related genes. This distinction has clinically meaningful consequences and is worth raising with a genetic counselor or your primary care physician.",
      },
    },
    {
      "@type": "Question",
      name: "What is Factor V Leiden and how worried should I be?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Factor V Leiden (rs6025) is a well-characterized variant that increases the risk of abnormal blood clotting. Heterozygous carriers (one copy) have roughly a 4–8× higher relative risk of deep vein thrombosis compared to non-carriers; homozygous carriers (two copies) have a substantially higher risk. However, the absolute lifetime risk for heterozygotes remains modest in the absence of other risk factors — most heterozygous carriers will never have a clotting event. The variant changes risk during specific high-risk situations: major surgery, prolonged immobilization (long-haul flights, hospitalization), pregnancy, and hormonal contraceptives or hormone replacement therapy. Those windows are when the diagnosis matters most clinically. If you've been told you carry Factor V Leiden, the most important next steps are: (1) inform any future surgeon or obstetrician, (2) discuss hormonal contraceptive options with your physician, and (3) understand the warning signs of deep vein thrombosis and pulmonary embolism. This is a case where the genetic result actually changes specific clinical decisions, so a conversation with your physician is worthwhile.",
      },
    },
    {
      "@type": "Question",
      name: "I'm a HFE C282Y homozygote. Do I have hemochromatosis?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Not necessarily — and this is an important distinction. C282Y/C282Y is the genotype most commonly associated with hereditary hemochromatosis (iron overload), but penetrance is highly variable. Many homozygotes never develop clinically significant iron overload, and many never need treatment. The genotype indicates susceptibility; whether you actually have iron overload requires blood testing — typically a ferritin level and transferrin saturation. Most homozygotes who do develop iron overload can be managed effectively with periodic therapeutic phlebotomy (essentially, donating blood on a schedule), which is straightforward and low-burden. Heterozygous carriers (one copy) and compound heterozygotes (C282Y/H63D) generally do not develop clinically significant iron overload, though mildly elevated iron studies are possible. If you've been told you carry C282Y, the practical next step is checking your iron labs — ferritin, transferrin saturation, and iron — and discussing the results with your primary care physician. A genetic counselor can help if family planning is involved.",
      },
    },
    {
      "@type": "Question",
      name: "What does ALDH2 *2 (the alcohol flush variant) mean for my health?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "ALDH2 *2 (rs671, also called the 'Asian flush' variant) reduces the activity of the enzyme that breaks down acetaldehyde — the toxic intermediate produced when your body metabolizes alcohol. Carriers experience facial flushing, nausea, headache, and elevated heart rate after even small amounts of alcohol; homozygous carriers (A/A) are essentially intolerant of alcohol. The variant is very common in East Asian populations. The most important health implication is not the unpleasant short-term flush — it's that long-term alcohol consumption in ALDH2 *2 carriers is associated with significantly higher rates of esophageal cancer and other upper-GI cancers, because the slower acetaldehyde clearance means a known carcinogen lingers in tissues longer. If you carry this variant and drink regularly despite the flush response, that's a meaningful health risk worth raising with your physician. The variant does not preclude drinking entirely, but it does shift the risk calculus, and 'pushing through' the flush is precisely the pattern most associated with cancer risk in long-term studies.",
      },
    },
  ],
};

export default function GeneticsPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(FAQ_JSONLD) }}
      />
      <GeneticsClient />
    </>
  );
}
