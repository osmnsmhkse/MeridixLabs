import type { Metadata } from "next";
import { ArticleShell } from "../_components/ArticleShell";

export const metadata: Metadata = {
  title: "Lean PCOS — The Phenotype Doctors Miss | Meridix Labs",
  description:
    "PCOS doesn't require obesity. Why thin women with PCOS are commonly told they can't have it, what the Rotterdam criteria actually say, and the labs that fit.",
  alternates: { canonical: "/womens-health/learn/lean-pcos" },
  keywords: [
    "lean PCOS",
    "lean PCOS symptoms",
    "thin PCOS",
    "PCOS without weight gain",
    "Rotterdam criteria PCOS",
    "PCOS irregular cycles",
    "PCOS lean phenotype",
  ],
  openGraph: {
    title: "Lean PCOS — the phenotype doctors miss",
    description:
      "PCOS does not require obesity. The diagnostic criteria, the labs that fit, and why lean women are often told they can't have it.",
    url: "https://www.meridixlabs.com/womens-health/learn/lean-pcos",
  },
};

export default function LeanPcosPage() {
  return (
    <ArticleShell
      eyebrow="PCOS"
      title="Lean PCOS — the phenotype doctors miss"
      intro="Polycystic ovary syndrome is the most common endocrine disorder in women of reproductive age. Roughly 20–30% of women with PCOS are not overweight. Yet thin women with classic PCOS symptoms — irregular cycles, acne, hair growth or loss, infertility — are routinely told they can't have PCOS because they don't look the part."
      tldr="PCOS is diagnosed by the Rotterdam criteria, not by body size. Two of three features are enough: irregular cycles, signs of hyperandrogenism, and polycystic-appearing ovaries on ultrasound. Lean women can have any combination — and lean PCOS comes with its own metabolic picture that gets missed because clinicians stop looking."
      sections={[
        {
          heading: "The actual diagnostic criteria",
          body: (
            <>
              <p>
                The Rotterdam criteria (2003, endorsed by the international PCOS guideline 2018/2023) require <strong>two of these three</strong>:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>
                  <strong>Oligo- or anovulation.</strong> Cycles longer than 35 days, fewer than 8 cycles per year, or anovulatory cycles (no ovulation even if bleeding occurs).
                </li>
                <li>
                  <strong>Clinical or biochemical hyperandrogenism.</strong> Clinical: hirsutism (terminal hair on the face, chest, back, abdomen), acne (especially adult-onset along the jawline and chin), androgenic alopecia (male-pattern hair loss). Biochemical: elevated total or free testosterone, elevated DHEA-S, low SHBG, elevated free androgen index.
                </li>
                <li>
                  <strong>Polycystic ovary morphology on ultrasound.</strong> 20 or more follicles per ovary (using current high-resolution criteria from the 2023 guideline; older 12-follicle threshold is outdated). Ovarian volume &gt; 10 mL is also supportive.
                </li>
              </ol>
              <p>
                Body weight is not in the criteria. There is no minimum BMI for a PCOS diagnosis.
              </p>
            </>
          ),
        },
        {
          heading: "What lean PCOS looks like",
          body: (
            <>
              <p>
                Lean PCOS (sometimes called the non-obese phenotype) most commonly presents as:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>Irregular or absent periods that started in adolescence and never normalized — or cycles that became irregular after stopping hormonal contraception.</li>
                <li>Adult cystic acne, often along the jaw and chin, that doesn't respond well to standard topical treatment.</li>
                <li>Terminal hair growth on the upper lip, chin, lower abdomen, or chest.</li>
                <li>Androgenic alopecia — thinning at the part line or crown.</li>
                <li>Trouble conceiving, especially in the form of anovulation rather than poor egg quality.</li>
                <li>Normal or even low BMI with normal-appearing body composition.</li>
              </ul>
              <p>
                The metabolic side is more subtle than in PCOS with obesity, but it is still there: women with lean PCOS often have insulin resistance disproportionate to their weight, mild dyslipidemia, and elevated cardiovascular risk markers compared to age-matched women without PCOS.
              </p>
            </>
          ),
        },
        {
          heading: "The labs that fit",
          body: (
            <>
              <p>A reasonable workup for suspected PCOS — lean or otherwise — includes:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Total testosterone and free testosterone</strong> (or total testosterone with SHBG to calculate the free androgen index)</li>
                <li><strong>DHEA-S</strong> — useful to look for adrenal contribution and to help rule out other causes of androgen excess</li>
                <li><strong>17-hydroxyprogesterone</strong> — to rule out non-classic congenital adrenal hyperplasia, which can mimic PCOS</li>
                <li><strong>TSH</strong> — thyroid dysfunction can mimic and worsen the picture</li>
                <li><strong>Prolactin</strong> — elevated prolactin can cause irregular cycles and shouldn't be missed</li>
                <li><strong>LH and FSH</strong> on day 3 (an LH:FSH ratio &gt; 2 is suggestive but not required)</li>
                <li><strong>AMH</strong> — typically elevated in PCOS, reflecting the high antral follicle count, but not diagnostic on its own</li>
                <li><strong>Fasting glucose, HbA1c, fasting insulin, and lipid panel</strong> — for metabolic baseline regardless of weight</li>
                <li><strong>25-hydroxy vitamin D</strong> — frequently deficient and worth correcting</li>
                <li><strong>Transvaginal ultrasound</strong> — for polycystic ovary morphology and to check the endometrium if cycles have been very long</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Why this matters beyond fertility",
          body: (
            <>
              <p>
                PCOS isn't just about reproduction. Long cycles mean unopposed estrogen, which is a real risk factor for endometrial hyperplasia and endometrial cancer over time. Cycles that last more than three months without bleeding should be addressed for this reason alone.
              </p>
              <p>
                Insulin resistance — present in many lean PCOS patients — raises long-term risk for type 2 diabetes, fatty liver disease, and cardiovascular disease. A baseline metabolic assessment in your 20s and 30s is genuinely useful, not optional.
              </p>
              <p>
                Mood disorders, particularly anxiety and depression, are more common in PCOS than in women without it, and the link is biological, not just situational. This deserves its own attention.
              </p>
            </>
          ),
        },
      ]}
      oftenMissed={
        <>
          <p>
            <strong>"You're too thin to have PCOS."</strong> 20–30% of women with PCOS are not overweight. Body weight is not a diagnostic criterion. The Rotterdam criteria are clear on this. If you have two of the three Rotterdam features, you have PCOS — whatever your BMI.
          </p>
          <p>
            <strong>"Your testosterone is normal."</strong> A normal total testosterone does not rule out PCOS. SHBG is often elevated in lean women and can mask high free testosterone. Ask for free testosterone (or total with SHBG) and look at the clinical signs of hyperandrogenism — acne, hirsutism, hair loss — which can be present even with technically normal numbers.
          </p>
          <p>
            <strong>Skipping the metabolic workup in lean patients.</strong> Lean PCOS does not equal metabolically healthy. Fasting insulin, HbA1c, and a lipid panel belong in the workup regardless of weight.
          </p>
          <p>
            <strong>Treating only the most visible symptom.</strong> Prescribing oral contraception to "regulate" cycles without acknowledging the underlying diagnosis can mask the picture for years. The pill is a reasonable choice for some patients — but it should be a knowing choice that fits a broader plan, not a way to avoid a diagnosis.
          </p>
          <p>
            <strong>Missing non-classic congenital adrenal hyperplasia.</strong> About 1–10% of women with PCOS-like presentations actually have late-onset CAH, which is a different condition requiring different treatment. A 17-hydroxyprogesterone level (drawn in the morning, early follicular phase) is the standard screen and is often skipped.
          </p>
        </>
      }
      questions={[
        "Given my cycle pattern, acne/hirsutism, and family history, do I meet two of the three Rotterdam criteria for PCOS?",
        "Can we draw free testosterone (or total with SHBG), DHEA-S, 17-hydroxyprogesterone, and LH/FSH on day 3 — and TSH, prolactin, fasting insulin, HbA1c, and a lipid panel?",
        "What's the plan to make sure my cycles don't go more than 3 months without bleeding, given the endometrial risk of unopposed estrogen?",
        "Even though I'm not overweight, what should we monitor metabolically going forward?",
        "If we're considering hormonal contraception to manage symptoms, what's our plan if and when I want to stop it to conceive?",
      ]}
      faq={[
        {
          question: "Can you have PCOS with regular periods?",
          answer:
            "Yes, though it's less common. You can meet the Rotterdam criteria with hyperandrogenism plus polycystic ovary morphology on ultrasound, even with apparently regular bleeding. Some 'regular' cycles in PCOS are actually anovulatory — bleeding can occur without ovulation. A luteal-phase progesterone check (around day 21) can clarify.",
        },
        {
          question: "Does lean PCOS get worse with age?",
          answer:
            "Cycles often become more regular in the late 30s and 40s as ovarian reserve declines. The metabolic picture can worsen, especially if not addressed. Heart disease risk in PCOS catches up to and can exceed the general population in midlife. Long-term care matters.",
        },
        {
          question: "Will losing weight cure my PCOS?",
          answer:
            "Many lean PCOS patients don't have weight to lose. For those with weight to lose, modest weight loss (5–10% of body weight) often improves cycles, insulin sensitivity, and androgens in PCOS — but it doesn't cure the underlying condition. Treatment is about managing the picture over time, not curing it.",
        },
        {
          question: "Is PCOS inherited?",
          answer:
            "PCOS clusters in families. A first-degree relative with PCOS, type 2 diabetes, or early heart disease raises your risk. Genetic studies have identified multiple susceptibility loci, but no single gene explains it. If PCOS runs in your family and you have symptoms, that's worth raising.",
        },
      ]}
      related={[
        { href: "/womens-health/learn/low-amh", label: "What does low AMH actually mean?" },
        { href: "/womens-health/learn/endometriosis-red-flags", label: "Endometriosis red flags worth pushing on" },
      ]}
    />
  );
}
