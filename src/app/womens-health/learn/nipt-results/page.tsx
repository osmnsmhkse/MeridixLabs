import type { Metadata } from "next";
import { ArticleShell } from "../_components/ArticleShell";

export const metadata: Metadata = {
  title: "Understanding Your NIPT Result | Meridix Labs",
  description:
    "What 'low risk' and 'high risk' really mean on a NIPT report. Screening vs diagnostic, false positives, sex chromosomes, microdeletions — explained calmly.",
  alternates: { canonical: "/womens-health/learn/nipt-results" },
  keywords: [
    "what does my NIPT result mean",
    "NIPT positive",
    "NIPT false positive",
    "NIPT low risk",
    "NIPT high risk",
    "NIPT vs amniocentesis",
    "cell-free DNA screening",
  ],
  openGraph: {
    title: "Understanding your NIPT result",
    description:
      "Screening vs diagnostic. What 'low risk' and 'high risk' actually mean — and why the positive predictive value matters more than the percentage.",
    url: "https://www.meridixlabs.com/womens-health/learn/nipt-results",
  },
};

export default function NiptResultsPage() {
  return (
    <ArticleShell
      eyebrow="Pregnancy screening"
      title="Understanding your NIPT result"
      intro="Non-invasive prenatal testing (NIPT, also called cell-free DNA screening) analyzes fetal DNA fragments found in the pregnant person's blood. It is a screening test, not a diagnostic test, and that distinction shapes everything about how to read the result."
      tldr="A 'low risk' NIPT is highly reassuring for the conditions it screens. A 'high risk' NIPT is a probability, not a diagnosis, and the chance it's actually wrong depends on which condition it flagged. Sex chromosome aneuploidies and microdeletions have much higher false-positive rates than the major trisomies (21, 18, 13)."
      sections={[
        {
          heading: "What NIPT actually tests",
          body: (
            <>
              <p>
                During pregnancy, small fragments of placental DNA circulate in the pregnant person's bloodstream alongside her own DNA. NIPT sequences these fragments and looks for over- or under-representation of specific chromosomes. Because the DNA is placental rather than directly fetal, NIPT measures the placenta — which almost always matches the fetus but occasionally doesn't (a phenomenon called confined placental mosaicism).
              </p>
              <p>
                NIPT can be drawn from about 10 weeks of pregnancy onward. It is typically offered to screen for:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Trisomy 21</strong> (Down syndrome)</li>
                <li><strong>Trisomy 18</strong> (Edwards syndrome)</li>
                <li><strong>Trisomy 13</strong> (Patau syndrome)</li>
                <li><strong>Sex chromosome aneuploidies</strong> — XYY, XXX, XXY (Klinefelter), monosomy X (Turner)</li>
                <li><strong>Fetal sex</strong></li>
                <li>Optionally, specific <strong>microdeletion syndromes</strong> (e.g., 22q11.2 / DiGeorge)</li>
              </ul>
            </>
          ),
        },
        {
          heading: "Screening vs diagnostic — the most important distinction",
          body: (
            <>
              <p>
                A <strong>screening test</strong> tells you how likely it is that something is present. It gives a probability.
              </p>
              <p>
                A <strong>diagnostic test</strong> confirms or rules out the condition. CVS (chorionic villus sampling) at 10–13 weeks or amniocentesis at 15+ weeks are the diagnostic tests in pregnancy. Both carry a small procedure-related miscarriage risk (modern estimates: roughly 0.1–0.2% above background).
              </p>
              <p>
                NIPT is a screen. No matter how it's marketed, "99% accurate" never means "99% diagnostic." It means high sensitivity for the conditions tested — the screen rarely misses a true positive. What you also need to know is its <strong>positive predictive value</strong>: if the screen says "high risk," what's the chance it's actually correct?
              </p>
            </>
          ),
        },
        {
          heading: "What 'low risk' means",
          body: (
            <>
              <p>
                A "low risk" or "negative" NIPT result is highly reassuring for the conditions screened. The false-negative rate for trisomy 21, the most-studied indication, is roughly 0.1–0.3% — meaning a low-risk result misses an affected pregnancy roughly 1–3 times per 1,000. False-negative rates for trisomies 18 and 13 are similar in modern labs.
              </p>
              <p>
                A low-risk NIPT does <strong>not</strong> tell you anything about the many other genetic conditions that can affect a pregnancy. It does not replace the anatomy scan. It does not detect single-gene disorders, neural tube defects, or most structural anomalies.
              </p>
            </>
          ),
        },
        {
          heading: "What 'high risk' means — and what it doesn't",
          body: (
            <>
              <p>
                A "high risk" NIPT result is a probability statement, not a diagnosis. The chance that a high-risk result reflects a truly affected pregnancy — the <strong>positive predictive value (PPV)</strong> — depends on three things:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li>The condition tested</li>
                <li>The age of the pregnant person (which affects the background rate)</li>
                <li>The lab's specific performance</li>
              </ul>
              <p>
                Rough PPV estimates from the published literature:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Trisomy 21:</strong> PPV roughly 80–90% depending on age (much higher in pregnant people over 35; somewhat lower in those under 25)</li>
                <li><strong>Trisomy 18:</strong> PPV roughly 60–80%</li>
                <li><strong>Trisomy 13:</strong> PPV roughly 40–60%</li>
                <li><strong>Sex chromosome aneuploidies (XXY, XYY, XXX, monosomy X):</strong> PPV often only 30–50%</li>
                <li><strong>Microdeletions (22q11.2 and others):</strong> PPV can be as low as 5–20%</li>
              </ul>
              <p>
                What this means: a "high risk" for a microdeletion is much more likely to be wrong than right. A "high risk" for trisomy 21 in a 38-year-old is much more likely to be right than wrong. The same headline word — "positive" or "high risk" — carries very different real-world meaning depending on what it flagged.
              </p>
              <p>
                A high-risk NIPT should be followed by diagnostic testing (CVS or amniocentesis) before any irreversible decision. Genetic counseling is the appropriate next step in nearly every case.
              </p>
            </>
          ),
        },
        {
          heading: "Things that can cause unexpected results",
          body: (
            <>
              <p>
                Beyond a true fetal aneuploidy, several things can produce an unexpected NIPT result:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Confined placental mosaicism</strong> — the placenta has the change but the fetus doesn't. This is the most common reason for a "false-positive."</li>
                <li><strong>Vanishing twin</strong> — DNA from a co-twin lost early in pregnancy can confuse the result.</li>
                <li><strong>Maternal mosaicism or maternal chromosomal differences</strong> — the change is in the pregnant person, not the fetus.</li>
                <li><strong>Maternal cancer</strong> — rare but documented; certain occult cancers can shed DNA that confuses the screen.</li>
                <li><strong>Low fetal fraction</strong> — too little fetal DNA in the sample. The test should be redrawn; results from low-fraction samples are unreliable.</li>
              </ul>
            </>
          ),
        },
      ]}
      oftenMissed={
        <>
          <p>
            <strong>Treating a "high risk" NIPT as a diagnosis.</strong> Most clinicians know better, but the framing of result letters and the emotional weight of the moment can lead to decisions made on a probability that has not been confirmed. CVS or amniocentesis is the diagnostic step, and the difference matters.
          </p>
          <p>
            <strong>Not mentioning the PPV.</strong> A 25-year-old getting a "positive for trisomy 13" with a PPV of maybe 40% deserves to hear that number. A pregnant person flagged for a microdeletion with a PPV under 20% deserves to hear that the screen is more likely wrong than right.
          </p>
          <p>
            <strong>Skipping the genetic counselor.</strong> Genetic counseling is the appropriate next step after a high-risk result. The conversation is worth having even if you're certain about the decision you'd make.
          </p>
          <p>
            <strong>Assuming a low-risk NIPT covers everything.</strong> NIPT does not detect neural tube defects, most structural anomalies, or single-gene disorders. The anatomy scan and other screening (e.g., AFP/quad screen for neural tube defects) still matter.
          </p>
        </>
      }
      questions={[
        "What is the positive predictive value of this specific result, for someone of my age and background risk?",
        "Was the fetal fraction high enough for this result to be reliable?",
        "What's the next step — CVS, amniocentesis, or watchful waiting with anatomy scan — and what does each tell us?",
        "Can we get a referral to a genetic counselor before making any decisions?",
        "If this is a sex chromosome or microdeletion finding, what's the false-positive rate the lab reports for this specific call?",
      ]}
      faq={[
        {
          question: "If NIPT is 99% accurate, why isn't a high-risk result a diagnosis?",
          answer:
            "The 99% headline number is detection rate (sensitivity) — the chance the screen catches a true case. The number that matters for your individual result is positive predictive value (PPV) — the chance that a high-risk call is actually correct. For some conditions PPV is high; for others (sex chromosomes, microdeletions) it can be quite low. The 99% number does not mean 99% of high-risk results turn out to be affected pregnancies.",
        },
        {
          question: "Can NIPT determine fetal sex?",
          answer:
            "Yes, and with high accuracy. NIPT detects Y-chromosome DNA fragments. It typically becomes reliable from about 10 weeks of pregnancy onward.",
        },
        {
          question: "What if NIPT can't get a result?",
          answer:
            "About 1–5% of NIPT samples return as 'no call' or 'inconclusive,' usually due to low fetal fraction. Most labs redraw and the second attempt succeeds. A persistent no-call is associated with a slightly higher risk of aneuploidy and warrants discussion with a genetic counselor and consideration of diagnostic testing.",
        },
        {
          question: "Does a low-risk NIPT mean my baby is healthy?",
          answer:
            "It means low risk for the specific conditions tested. Most chromosomal aneuploidies are screened, but many other things — structural anomalies, single-gene disorders, neural tube defects — are not. The anatomy scan around 20 weeks remains important.",
        },
      ]}
      related={[
        { href: "/womens-health/learn/perimenopause-symptoms", label: "Perimenopause symptoms in your 40s" },
        { href: "/womens-health/learn/low-amh", label: "What does low AMH actually mean?" },
      ]}
    />
  );
}
