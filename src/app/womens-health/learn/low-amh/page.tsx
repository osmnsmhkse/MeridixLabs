import type { Metadata } from "next";
import { ArticleShell } from "../_components/ArticleShell";

export const metadata: Metadata = {
  title: "What Does Low AMH Actually Mean? | Meridix Labs",
  description:
    "AMH measures ovarian reserve — not whether you can get pregnant. What low AMH does and doesn't say about fertility, by age, in plain language.",
  alternates: { canonical: "/womens-health/learn/low-amh" },
  keywords: [
    "what does low AMH mean",
    "low AMH",
    "AMH levels by age",
    "diminished ovarian reserve",
    "AMH and fertility",
    "AMH normal range",
    "low AMH still get pregnant",
  ],
  openGraph: {
    title: "What does low AMH actually mean?",
    description:
      "Plain-English explainer on AMH, diminished ovarian reserve, and what the value actually predicts.",
    url: "https://www.meridixlabs.com/womens-health/learn/low-amh",
  },
};

export default function LowAmhPage() {
  return (
    <ArticleShell
      eyebrow="Fertility labs"
      title="What does low AMH actually mean?"
      intro="Anti-Müllerian Hormone is one of the most-Googled and most-misunderstood lab values in women's medicine. Here is what AMH actually measures, what a low number tells you, and — just as important — what it does not."
      tldr="AMH reflects how many eggs are still in your ovaries. It is a strong predictor of how you'll respond to IVF and a rough marker of how close you may be to menopause. It is a weak predictor of whether you can get pregnant naturally in any given month."
      sections={[
        {
          heading: "What AMH is",
          body: (
            <>
              <p>
                Anti-Müllerian Hormone (AMH) is produced by the small (antral) follicles in your ovaries. Each of those follicles contains an immature egg. Because AMH is made by the follicles themselves, the level in your blood gives an estimate of how many follicles you still have — what's called your ovarian reserve.
              </p>
              <p>
                AMH is relatively stable across the menstrual cycle, which is why — unlike FSH or estradiol — it can be measured on any day. Hormonal birth control suppresses AMH somewhat; values can read 20–30% lower while on the pill, ring, or hormonal IUD, and recover within a few months after stopping.
              </p>
            </>
          ),
        },
        {
          heading: "AMH by age — rough ranges",
          body: (
            <>
              <p>Reference ranges vary slightly by lab and units, but a useful mental model:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Under 30:</strong> typically 2.0–6.8 ng/mL</li>
                <li><strong>30–34:</strong> typically 1.5–4.0 ng/mL</li>
                <li><strong>35–37:</strong> typically 1.0–3.0 ng/mL</li>
                <li><strong>38–40:</strong> typically 0.7–2.5 ng/mL</li>
                <li><strong>41–42:</strong> typically 0.3–1.5 ng/mL</li>
                <li><strong>43+:</strong> typically &lt; 1.0 ng/mL</li>
              </ul>
              <p>
                A 38-year-old with an AMH of 1.2 ng/mL is well within range for her age. A 28-year-old with the same number is not.
              </p>
              <p>
                The label "low AMH" or "diminished ovarian reserve" is typically applied at &lt; 1.0 ng/mL regardless of age, but the clinical meaning depends entirely on how young you are when you see that number.
              </p>
            </>
          ),
        },
        {
          heading: "What low AMH predicts well",
          body: (
            <>
              <p><strong>How you'll respond to IVF.</strong> If you go through ovarian stimulation, AMH is a strong predictor of how many eggs you'll get from a cycle. Low AMH usually means fewer eggs retrieved per cycle, which is real and worth knowing before you decide on a fertility path.</p>
              <p><strong>Approximately how close you are to menopause.</strong> AMH drops in the years leading up to menopause. A very low or undetectable AMH in your 40s is consistent with perimenopause; in your 30s it can flag early ovarian insufficiency, which is rare but important to diagnose.</p>
              <p><strong>Whether ovarian reserve is on the low side of average.</strong> Combined with a day-3 FSH and an antral follicle count on transvaginal ultrasound, AMH is the standard way to assess reserve.</p>
            </>
          ),
        },
        {
          heading: "What low AMH does NOT predict",
          body: (
            <>
              <p><strong>It does not predict your monthly chance of getting pregnant naturally.</strong> This is the single most important thing to understand. Large prospective studies — including Steiner et al. in JAMA (2017) — have shown that AMH does not reliably predict natural conception in women without infertility. Plenty of women with very low AMH conceive naturally; plenty of women with high AMH struggle. AMH measures egg quantity, not egg quality, and not the dozens of other things that determine whether a given month produces a pregnancy.</p>
              <p><strong>It does not measure egg quality.</strong> Egg quality is what determines miscarriage risk and live-birth rate. There is no blood test for egg quality. Age is the best proxy we have.</p>
              <p><strong>It is not a fertility "pass/fail" test.</strong> AMH is part of a picture, not a verdict.</p>
            </>
          ),
        },
        {
          heading: "When a low AMH actually matters",
          body: (
            <>
              <p>The cases where low AMH should change your plan:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>You are considering IVF and the number tells you what to expect from each cycle.</li>
                <li>You are considering egg freezing and the number helps decide how many cycles you'll need to bank a reasonable number of eggs.</li>
                <li>You are under 35 with an AMH below 1.0 ng/mL — that's not age-typical, and it's worth a workup for premature ovarian insufficiency (autoimmune, genetic like fragile X premutation, or post-surgical/chemotherapy causes).</li>
                <li>You are trying to conceive naturally and need help deciding whether to start a workup sooner than the standard 12 months (under 35) or 6 months (35+).</li>
              </ul>
            </>
          ),
        },
      ]}
      oftenMissed={
        <>
          <p>
            <strong>"Your AMH is low, you'll need IVF."</strong> This is the most common dismissal pattern, and it is not how AMH works. Low AMH does not mean you can't conceive naturally. It changes the conversation about IVF response and timeline, not the conversation about whether to keep trying.
          </p>
          <p>
            <strong>Checking AMH while on hormonal contraception and treating the value as a stable number.</strong> Suppression of 20–30% is common. If your AMH is borderline and you've been on the pill, repeat the test 2–3 months after stopping for an accurate read.
          </p>
          <p>
            <strong>Not pairing AMH with an antral follicle count.</strong> AMH alone can mislead. The transvaginal ultrasound count of antral follicles (typically days 2–5) gives a real-time view that adds significantly to the picture. Reproductive endocrinologists use both.
          </p>
          <p>
            <strong>Missing premature ovarian insufficiency in younger women.</strong> A 28-year-old with an AMH of 0.4 ng/mL deserves a workup for autoimmune ovarian disease, fragile X premutation, and karyotype — not a shrug and a referral to IVF. POI can have implications for bone health, cardiovascular health, and family-planning timeline that need to be addressed regardless of fertility goals.
          </p>
        </>
      }
      questions={[
        "What is my AMH for my age, and how does it compare to the typical range for women my age?",
        "What's my antral follicle count on ultrasound? Does it line up with my AMH?",
        "Was I on hormonal birth control in the months before this draw, and could that have suppressed the value?",
        "Given my age and reserve picture, what's the right time horizon before we start a fertility workup vs. keep trying?",
        "Should we screen for premature ovarian insufficiency causes (fragile X premutation, thyroid antibodies, karyotype) given how low this is for my age?",
      ]}
      faq={[
        {
          question: "Can I still get pregnant naturally with low AMH?",
          answer:
            "Yes. AMH predicts how many eggs your ovaries have left, not whether any given cycle will result in pregnancy. Many women with very low AMH conceive naturally, and many with high AMH struggle. AMH should not be read as a yes-or-no fertility test.",
        },
        {
          question: "Does low AMH cause miscarriage?",
          answer:
            "AMH itself does not cause miscarriage. Miscarriage risk is most closely tied to age (which affects egg quality), not to AMH directly. Two women the same age with very different AMH values have similar miscarriage rates, all else being equal.",
        },
        {
          question: "Can I raise my AMH?",
          answer:
            "There is no proven intervention that meaningfully and durably raises AMH. Some supplements are marketed for this; the evidence does not support clinically meaningful change. The number reflects how many follicles are still there. Your time, money, and energy are better spent on things that affect egg quality and overall reproductive health — sleep, exercise, smoking cessation, and timing decisions — than on chasing the AMH number.",
        },
        {
          question: "How fast does AMH drop?",
          answer:
            "AMH drops gradually through the 30s and accelerates in the late 30s and 40s. Individual variation is wide. For most women, a check every 12–18 months is enough to see the trajectory. More frequent testing rarely changes the plan.",
        },
      ]}
      related={[
        { href: "/womens-health/learn/perimenopause-symptoms", label: "Perimenopause symptoms in your 40s" },
        { href: "/womens-health/learn/lean-pcos", label: "Lean PCOS — the phenotype doctors miss" },
      ]}
    />
  );
}
