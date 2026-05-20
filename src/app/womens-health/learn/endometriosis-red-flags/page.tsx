import type { Metadata } from "next";
import { ArticleShell } from "../_components/ArticleShell";

export const metadata: Metadata = {
  title: "Endometriosis Red Flags Worth Pushing On | Meridix Labs",
  description:
    "Average diagnostic delay is 7–10 years. The symptom patterns most likely to be endometriosis, why imaging often misses it, and how to be heard.",
  alternates: { canonical: "/womens-health/learn/endometriosis-red-flags" },
  keywords: [
    "endometriosis symptoms",
    "endometriosis red flags",
    "endometriosis diagnostic delay",
    "painful periods endometriosis",
    "deep dyspareunia",
    "cyclical bowel pain",
    "endometriosis vs normal period pain",
  ],
  openGraph: {
    title: "Endometriosis red flags worth pushing on",
    description:
      "The symptom patterns most likely to be endometriosis — and why getting heard is half the battle.",
    url: "https://www.meridixlabs.com/womens-health/learn/endometriosis-red-flags",
  },
};

export default function EndometriosisRedFlagsPage() {
  return (
    <ArticleShell
      eyebrow="Endometriosis"
      title="Endometriosis red flags worth pushing on"
      intro="The average time from first symptom to endometriosis diagnosis is 7 to 10 years. The condition affects roughly 1 in 10 women of reproductive age. The diagnostic delay isn't because the disease is hidden — it's because painful periods get normalized, imaging often looks clean, and the patient ends up being told it's stress, IBS, anxiety, or in her head. This article is about the patterns most likely to be endometriosis and how to keep your doctor on the case."
      tldr="Endometriosis is more likely than normal period pain when: pain disables you (not just slows you down), it follows your cycle, it shows up in your bowel or bladder with your period, sex hurts deeply, or fertility is a struggle. Imaging can be entirely normal in endometriosis. A normal pelvic ultrasound does not rule it out."
      sections={[
        {
          heading: "Normal period pain vs probable endometriosis",
          body: (
            <>
              <p>
                Most women have some menstrual discomfort. Cramps that respond to ibuprofen, last a day or two, and don't disable you are common. That's not what we're talking about.
              </p>
              <p>The patterns that should raise endometriosis as a real possibility:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Pain that disables you.</strong> Missing school, work, or social plans because of period pain. Vomiting from the pain. Curling up on the bathroom floor. Pain that doesn't respond to over-the-counter doses.</li>
                <li><strong>Pain that started in adolescence and got worse.</strong> Many endometriosis patients describe pain that was always bad, was minimized at the time, and progressed through their 20s.</li>
                <li><strong>Deep dyspareunia.</strong> Pain with deep penetration during sex, especially in certain positions, that follows the cycle. Different from entry-level pain (which has different causes).</li>
                <li><strong>Cyclical bowel symptoms.</strong> Painful bowel movements, diarrhea, or constipation that flare with your period. Cyclical rectal pain.</li>
                <li><strong>Cyclical bladder symptoms.</strong> Urinary urgency, dysuria without infection, or bladder pain that worsens around your period.</li>
                <li><strong>Cyclical referred pain.</strong> Shoulder pain (yes, really — diaphragmatic endometriosis can cause this), low back pain, or pain down the leg with periods.</li>
                <li><strong>Heavy bleeding.</strong> Soaking through pads or tampons every 1–2 hours for several hours.</li>
                <li><strong>Infertility.</strong> Especially with normal semen analysis and ovulation — endometriosis is a major cause of "unexplained" infertility.</li>
                <li><strong>Bloating ("endo belly")</strong>, fatigue, and pelvic pain outside the period.</li>
              </ul>
              <p>
                Any one of these alone can have other causes. Multiple in combination, especially cycling with your period, raise the probability substantially.
              </p>
            </>
          ),
        },
        {
          heading: "Why imaging often looks normal",
          body: (
            <>
              <p>
                Endometriosis can be missed by:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Pelvic exam</strong> — endometriosis is often invisible on exam. A normal pelvic exam does not rule it out.</li>
                <li><strong>Standard transvaginal ultrasound</strong> — picks up endometriomas (chocolate cysts on the ovaries) and sometimes deep nodules, but routinely misses superficial peritoneal disease. A normal pelvic ultrasound does not rule it out.</li>
                <li><strong>Standard MRI</strong> — better than ultrasound for deep infiltrating disease, especially with a dedicated endometriosis protocol, but still misses superficial implants.</li>
              </ul>
              <p>
                The diagnostic gold standard remains <strong>laparoscopy with histologic confirmation</strong>. That's not the right first step for everyone, and many specialists now diagnose and treat empirically based on clinical picture before going to surgery — but it remains the only way to confirm with certainty.
              </p>
              <p>
                If you've been told your imaging is "normal" but your symptoms fit, a normal imaging study should not close the case.
              </p>
            </>
          ),
        },
        {
          heading: "Adenomyosis — the cousin that gets missed too",
          body: (
            <>
              <p>
                Adenomyosis is when endometrial-like tissue grows into the muscular wall of the uterus itself. It causes heavy, painful periods, a tender or enlarged uterus, and chronic pelvic pain. It often coexists with endometriosis and is frequently missed because the symptoms overlap.
              </p>
              <p>
                Adenomyosis can be suggested on transvaginal ultrasound (asymmetric myometrial thickening, sub-endometrial cysts, junctional zone changes) or MRI, but historically required a pathology specimen after hysterectomy for definitive diagnosis. Modern imaging diagnosis is increasingly accepted.
              </p>
              <p>
                If your periods are heavy and painful and your ultrasound mentions a "globular uterus" or "asymmetric myometrium," adenomyosis is worth asking about.
              </p>
            </>
          ),
        },
        {
          heading: "How to be heard",
          body: (
            <>
              <p>The reality is that getting diagnosed often requires advocacy. Practical things that help:</p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Track your symptoms.</strong> A simple log of pain scores by cycle day, bowel and bladder symptoms, sex-related pain, and time missed from work or school is more useful than describing memory.</li>
                <li><strong>Bring specifics.</strong> "My period pain is bad" gets dismissed. "On day 1 and 2 my pain is 8/10, I've vomited from it three of the last four cycles, sex has been painful deep for the past 6 months, and my period also causes diarrhea and rectal pain" is harder to dismiss.</li>
                <li><strong>Use the right words.</strong> Dyspareunia (painful intercourse), dyschezia (painful bowel movements), dysmenorrhea (painful periods), dysuria (painful urination). Clinical vocabulary lands.</li>
                <li><strong>Ask for the differential.</strong> "What conditions could cause this pattern? What's your reasoning for not pursuing endometriosis as part of the differential?" Forces specificity.</li>
                <li><strong>If you're not heard, see a different provider.</strong> Endometriosis specialists exist (many are minimally invasive gynecologic surgeons or work in dedicated endometriosis centers). The wait can be long but the conversation is different.</li>
              </ul>
            </>
          ),
        },
      ]}
      oftenMissed={
        <>
          <p>
            <strong>"Periods are supposed to hurt."</strong> No. Some discomfort is common; disabling pain is not. Pain that interferes with normal life is a symptom worth investigating, not a feature of being female.
          </p>
          <p>
            <strong>"Your ultrasound is normal, so it's not endometriosis."</strong> A normal pelvic ultrasound is consistent with endometriosis. Most endometriosis does not show on ultrasound. This is the single most common misstep in the diagnostic pathway.
          </p>
          <p>
            <strong>"It's just IBS."</strong> Cyclical bowel symptoms — diarrhea or constipation that follow your period — are not standard IBS. They are a classic endometriosis pattern. If your "IBS" gets worse with your period, the picture deserves a second look.</p>
          <p>
            <strong>"Try the pill first and come back if it doesn't work."</strong> Continuous hormonal suppression is a real and reasonable treatment for endometriosis-spectrum pain — but its use should be paired with the conversation that the diagnosis is being treated empirically, that symptom return after stopping is expected, and that the pill is not addressing whether disease is present or progressing.
          </p>
          <p>
            <strong>Skipping the conversation about fertility.</strong> If you're hoping to conceive at some point, the timing conversation with someone who treats endometriosis is worth having earlier rather than later. Endometriosis-related infertility is treatable; ignoring it costs time.
          </p>
        </>
      }
      questions={[
        "Given the cyclical pattern of my pain, my dyspareunia, and my GI symptoms, is endometriosis on the differential? If not, what's your reasoning?",
        "I understand my pelvic ultrasound was normal. Knowing ultrasound often misses endometriosis, what's the next step in the workup?",
        "Is adenomyosis also on the table, given my heavy bleeding and uterine tenderness?",
        "Can I get a referral to a gynecologist with specific experience in endometriosis or to a tertiary center if needed?",
        "If we treat empirically with hormonal suppression, what's our plan if symptoms persist or if I want to conceive in the future?",
      ]}
      faq={[
        {
          question: "Do you need surgery to diagnose endometriosis?",
          answer:
            "Surgery (laparoscopy with biopsy) is the gold standard for definitive diagnosis. Modern practice increasingly accepts clinical diagnosis when the symptom pattern fits — especially when treatment is going to be the same either way. The conversation about whether and when to do laparoscopy should be specific to your situation.",
        },
        {
          question: "Can endometriosis cause infertility?",
          answer:
            "Yes. Endometriosis is one of the leading causes of so-called unexplained infertility. The mechanisms include altered pelvic anatomy, inflammation that affects egg and embryo quality, and impaired implantation. The good news is that endometriosis-related infertility is treatable — surgery, fertility treatment, or both, depending on the picture.",
        },
        {
          question: "Does pregnancy cure endometriosis?",
          answer:
            "No. The 'pregnancy cures endometriosis' myth has done real damage. Pregnancy can suppress symptoms during the pregnancy and breastfeeding, but the disease itself returns when cycles resume. Pregnancy is not a treatment.",
        },
        {
          question: "Can teenagers have endometriosis?",
          answer:
            "Yes. Many endometriosis patients trace their first symptoms back to adolescence. Early-onset severe dysmenorrhea — pain that disables a teenager — should be taken seriously, not normalized as 'just bad periods.' Earlier recognition reduces years of pain.",
        },
      ]}
      related={[
        { href: "/womens-health/learn/ferritin-without-anemia", label: "Low ferritin without anemia" },
        { href: "/womens-health/learn/lean-pcos", label: "Lean PCOS — the phenotype doctors miss" },
      ]}
    />
  );
}
