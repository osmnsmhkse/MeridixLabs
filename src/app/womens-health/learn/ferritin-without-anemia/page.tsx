import type { Metadata } from "next";
import { ArticleShell } from "../_components/ArticleShell";

export const metadata: Metadata = {
  title: "Low Ferritin Without Anemia — Why You Still Feel Awful | Meridix Labs",
  description:
    "Normal hemoglobin, ferritin 18, and exhausted? Why low ferritin causes fatigue, hair loss, brain fog, and restless legs even when your CBC is 'fine.'",
  alternates: { canonical: "/womens-health/learn/ferritin-without-anemia" },
  keywords: [
    "low ferritin without anemia",
    "iron deficiency without anemia",
    "ferritin and fatigue",
    "ferritin hair loss",
    "ferritin restless legs",
    "ferritin 30 symptoms",
    "iron deficiency symptoms",
  ],
  openGraph: {
    title: "Low ferritin without anemia — why you still feel awful",
    description:
      "Normal hemoglobin doesn't mean normal iron. Why ferritin below 30 ng/mL causes real symptoms — and why this is missed.",
    url: "https://www.meridixlabs.com/womens-health/learn/ferritin-without-anemia",
  },
};

export default function FerritinWithoutAnemiaPage() {
  return (
    <ArticleShell
      eyebrow="Iron"
      title="Low ferritin without anemia — why you still feel awful"
      intro="Your hemoglobin is normal. Your CBC is 'fine.' Your ferritin is 18 ng/mL. You're exhausted, your hair is shedding in the shower, your legs twitch at night, and your brain feels like it's running on dial-up. This is one of the most common patterns missed in women's primary care, and the missing concept is the difference between iron in circulation and iron in storage."
      tldr="Hemoglobin is the last thing to drop when iron is low. Ferritin reflects your iron stores — your savings account. You can deplete that account while your circulating iron (hemoglobin) still looks normal. Symptoms of low iron stores include fatigue, hair loss, brain fog, restless legs, exercise intolerance, and mood changes. A ferritin under 30 ng/mL is symptomatic for most people. Under 15 is severe."
      sections={[
        {
          heading: "Why hemoglobin can look fine while you feel terrible",
          body: (
            <>
              <p>
                Think of your body's iron as two pools: the iron that's actively in your red blood cells doing work (reflected by hemoglobin), and the iron you have in storage in your liver and tissues (reflected by ferritin).
              </p>
              <p>
                When iron intake or absorption can't keep up with what you lose, your body protects the active pool by drawing from storage. Ferritin drops first. Symptoms start. Then, only when storage is essentially empty, does hemoglobin finally fall. At that point you have iron-deficiency anemia — but the symptoms started long before, while your CBC looked normal.
              </p>
              <p>
                This is why "your bloodwork is normal" can be technically accurate and clinically wrong at the same time. The bloodwork in question (CBC) wasn't measuring the right pool.
              </p>
            </>
          ),
        },
        {
          heading: "Symptoms of low iron stores",
          body: (
            <>
              <p>
                The symptom picture of low ferritin (even with normal hemoglobin) includes:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Fatigue</strong> — disproportionate to sleep and activity. Often described as feeling foggy and depleted even after a full night's sleep.</li>
                <li><strong>Hair shedding</strong> — chronic telogen effluvium. Iron stores below about 30–40 ng/mL are associated with increased hair shedding. Hair grows back when stores are restored, but it takes months.</li>
                <li><strong>Brain fog</strong> — trouble concentrating, word-finding issues, slowed thinking.</li>
                <li><strong>Restless legs syndrome</strong> — strong association with low ferritin. RLS responds well to iron repletion in many patients.</li>
                <li><strong>Exercise intolerance</strong> — disproportionate fatigue, breathlessness, or heart-rate jumps with mild exertion.</li>
                <li><strong>Mood symptoms</strong> — anxiety, low mood, irritability. Iron is required for serotonin and dopamine synthesis.</li>
                <li><strong>Cold hands and feet</strong>, brittle nails, pica (cravings for ice, dirt, starch), and sore tongue in more severe cases.</li>
              </ul>
            </>
          ),
        },
        {
          heading: "What 'normal' ferritin actually means",
          body: (
            <>
              <p>
                Lab reference ranges for ferritin are wide — often something like 11–307 ng/mL in women. That range reflects what the population looks like, not what's clinically optimal. The bottom of that range is depleted territory.
              </p>
              <p>
                Functional thresholds most clinicians who treat iron deficiency use:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>&lt; 15 ng/mL:</strong> severely depleted. Almost always symptomatic. Iron-deficiency anemia is usually present or imminent.</li>
                <li><strong>15–30 ng/mL:</strong> depleted stores. Most people are symptomatic in this range. Repletion is generally appropriate.</li>
                <li><strong>30–50 ng/mL:</strong> low-normal. Many people are still symptomatic here, especially women with heavy periods or restless legs syndrome (where guidelines often target ferritin &gt; 75 ng/mL).</li>
                <li><strong>50–100 ng/mL:</strong> generally adequate for most people.</li>
                <li><strong>&gt; 100 ng/mL:</strong> adequate to high. Persistent values &gt; 200–300 ng/mL warrant looking for an underlying cause (inflammation, hemochromatosis, liver disease).</li>
              </ul>
              <p>
                Note that ferritin is also an acute-phase reactant — it rises with inflammation, infection, recent illness, and chronic conditions like obesity. A "normal" ferritin in the setting of high inflammation can still represent functional iron deficiency. CRP and transferrin saturation can help interpret.
              </p>
            </>
          ),
        },
        {
          heading: "Why this is so common in menstruating women",
          body: (
            <>
              <p>
                Iron losses from menstruation are substantial. A normal period loses roughly 30–80 mL of blood, which is 15–40 mg of iron — meaningful against typical daily absorption of 1–2 mg from diet.
              </p>
              <p>
                Heavy menstrual bleeding — soaking through pads or tampons frequently, passing large clots, flooding — can lose 100+ mg of iron per cycle. Many women with heavy periods are in a chronic iron deficit they cannot eat their way out of.
              </p>
              <p>
                Pregnancy and breastfeeding also deplete iron stores. So does endurance exercise. Plant-based diets supply iron in a less-absorbable form (non-heme) that requires more careful planning to meet needs.
              </p>
              <p>
                Combine any of these and a slow chronic deficit is the default state, not the exception.
              </p>
            </>
          ),
        },
        {
          heading: "What testing actually clarifies the picture",
          body: (
            <>
              <p>
                When iron deficiency is on the differential, useful labs include:
              </p>
              <ul className="list-disc pl-5 space-y-1.5">
                <li><strong>Ferritin</strong> — the key marker for stores. Interpret alongside inflammation markers.</li>
                <li><strong>Serum iron, TIBC, and transferrin saturation</strong> — give a snapshot of circulating iron and capacity to carry more.</li>
                <li><strong>CBC with differential</strong> — for hemoglobin, MCV, and red cell distribution width (RDW).</li>
                <li><strong>CRP</strong> — to flag inflammation that can falsely elevate ferritin.</li>
                <li><strong>Reticulocyte count</strong> — sometimes useful to assess marrow response.</li>
              </ul>
              <p>
                For persistent low ferritin without obvious cause (heavy periods, blood donation, pregnancy/breastfeeding), evaluation for occult blood loss (GI, especially in anyone over 40) is appropriate.
              </p>
            </>
          ),
        },
      ]}
      oftenMissed={
        <>
          <p>
            <strong>"Your hemoglobin is normal, you're not anemic."</strong> Anemia is the late stage of iron deficiency. The symptoms start when stores are low, long before hemoglobin drops. A normal CBC does not rule out symptomatic iron deficiency.
          </p>
          <p>
            <strong>Skipping ferritin altogether.</strong> Many "fatigue" workups in women include a CBC and a TSH but not a ferritin. If iron deficiency is on the differential and ferritin wasn't drawn, the workup is incomplete.
          </p>
          <p>
            <strong>Treating "low-normal" ferritin as fine.</strong> The lab's lower limit (often 11–15 ng/mL) is not the clinical threshold. Many women are symptomatic at ferritin levels of 20–40 ng/mL. The number on the page being "in range" is not the same as feeling well.
          </p>
          <p>
            <strong>Missing the heavy-period contribution.</strong> Iron deficiency in a menstruating woman is heavy menstrual bleeding until proven otherwise. Treating the iron without addressing the bleeding can leave you in a cycle of perpetual repletion.
          </p>
          <p>
            <strong>Not retesting after repletion.</strong> Whether oral or IV, repletion takes time and follow-up. A ferritin recheck 8–12 weeks after starting (or after IV infusion) tells you whether stores are actually rising.
          </p>
        </>
      }
      questions={[
        "Can we check ferritin, iron studies (serum iron, TIBC, transferrin saturation), CRP, and a CBC?",
        "Given my ferritin is below 30 ng/mL and I have [hair loss / fatigue / restless legs], is repletion appropriate?",
        "If my periods are heavy, what's the plan to address the underlying bleeding alongside iron repletion?",
        "If I've tried oral iron and ferritin isn't rising or I can't tolerate it, am I a candidate for IV iron?",
        "When will we recheck ferritin to confirm stores are actually replenishing?",
      ]}
      faq={[
        {
          question: "How long does it take to raise ferritin?",
          answer:
            "With oral iron and good absorption, ferritin rises by roughly 10–20 ng/mL per month. Getting from 18 to 80 ng/mL can therefore take 3–6 months. IV iron is faster — typically a single or split-dose infusion can replete stores within weeks. Choice depends on starting level, tolerance of oral iron, underlying cause, and availability.",
        },
        {
          question: "Are there foods that block iron absorption?",
          answer:
            "Yes. Calcium, tea, coffee, and high-fiber foods reduce non-heme iron absorption. Vitamin C in the same meal improves it. Take iron supplements away from calcium, tea, and coffee — and not at the same time as a thyroid medication if you take one.",
        },
        {
          question: "Why does oral iron upset my stomach?",
          answer:
            "GI side effects are very common with conventional ferrous iron salts (constipation, nausea, dark stools). Lower-dose iron taken every other day appears to absorb better than daily dosing in many studies, with fewer side effects. Gentler formulations exist. If you can't tolerate any oral form, IV iron is a real option.",
        },
        {
          question: "Is iron deficiency linked to depression and anxiety?",
          answer:
            "Iron is required for synthesis of serotonin, dopamine, and norepinephrine. Low iron stores are associated with mood symptoms, and repletion can improve mood and energy in many patients. This doesn't mean iron deficiency causes depression in everyone — but in someone with low ferritin and mood symptoms, repletion is a reasonable part of the plan.",
        },
      ]}
      related={[
        { href: "/womens-health/learn/endometriosis-red-flags", label: "Endometriosis red flags worth pushing on" },
        { href: "/womens-health/learn/perimenopause-symptoms", label: "Perimenopause symptoms in your 40s" },
      ]}
    />
  );
}
