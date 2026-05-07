import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Terms of Service — Meridix Labs",
  description:
    "The terms that govern your use of Meridix Labs — written in plain English.",
};

const LAST_UPDATED = "May 5, 2026";
const CONTACT_EMAIL = "contact@meridixlabs.com";

export default async function TermsPage() {
  const t = await getTranslations("Terms");
  return (
    <div className="min-h-screen bg-white">
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="gradient-hero pt-36 pb-14 relative overflow-hidden">
        <div className="absolute top-1/3 left-1/4 w-72 h-72 bg-brand-blue/8 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-white border border-brand-blue/30 text-brand-blue text-xs font-semibold mb-5 shadow-sm">
            {t("title")}
          </span>
          <h1 className="text-4xl sm:text-5xl font-extrabold text-ink tracking-tight leading-tight mb-4">
            {t("subtitle")}
          </h1>
          <p className="text-lg text-ink-secondary leading-relaxed max-w-2xl">
            {t("intro")}
          </p>
          <p className="mt-6 text-xs text-ink-tertiary">{t("lastUpdated")} {LAST_UPDATED}</p>
        </div>
      </section>

      {/* ─── BODY ────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          {/* 1 */}
          <Section number="1" title={t("s1Title").replace(/^\d+\.\s*/, "")}>
            <p>
              These Terms of Service (&quot;Terms&quot;) are an agreement between you
              and Meridix Labs (&quot;Meridix,&quot; &quot;we,&quot; &quot;us&quot;).
              They govern your use of meridixlabs.com and the related services
              (collectively, the &quot;Service&quot;).
            </p>
            <p>
              By using the Service, you confirm that you are at least 16 years old and
              that you accept these Terms. If you don&apos;t agree, please don&apos;t
              use the Service.
            </p>
          </Section>

          {/* 2 */}
          <Section number="2" title={t("s2Title").replace(/^\d+\.\s*/, "")}>
            <p>
              Meridix Labs is an educational tool that uses AI to help you understand
              your medical lab results, symptoms, and diagnoses in plain language. We
              accept uploads of common lab reports (blood tests, lipid panels,
              metabolic panels, etc.) and produce a layperson-friendly interpretation
              along with optional follow-up tools (chat, trend tracking, learning
              modules, and so on).
            </p>
          </Section>

          {/* 3 — the important one */}
          <Section number="3" title={t("s3Title").replace(/^\d+\.\s*/, "")}>
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 mb-4">
              <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                <strong>{t("readCarefully")}</strong> Meridix Labs does not
                provide medical advice, diagnosis, or treatment. The Service is for
                educational and informational purposes only. Using Meridix Labs does
                not establish a doctor-patient relationship.
              </p>
            </div>
            <p>
              Specifically:
            </p>
            <ul className="space-y-2 mt-3">
              <Item>
                The interpretations we generate are produced by an AI model. They may
                contain errors, omissions, or out-of-date information.
              </Item>
              <Item>
                Reference ranges, severity flags, and recommended actions vary by lab,
                jurisdiction, age, sex, ethnicity, and individual context that we may
                not capture.
              </Item>
              <Item>
                Never make a medical decision based solely on Meridix Labs. Always
                confirm with a qualified physician.
              </Item>
              <Item>
                If you believe you may have a medical emergency, call your local
                emergency number or go to the nearest emergency department immediately.
                <strong className="text-ink"> Do not use Meridix Labs in an emergency.</strong>
              </Item>
              <Item>
                Meridix Labs is not a substitute for a licensed clinician. We are not
                regulated as a medical device, and we have not been reviewed by the FDA
                or any equivalent authority.
              </Item>
            </ul>
          </Section>

          {/* 4 */}
          <Section number="4" title={t("s4Title").replace(/^\d+\.\s*/, "")}>
            <p>
              You can use most of the Service anonymously. If you create an account,
              you are responsible for keeping your sign-in credentials safe and for any
              activity under your account. Notify us immediately if you suspect
              unauthorized access.
            </p>
            <p>
              We use a third-party authentication provider (Clerk). When you sign up
              you agree to their terms as well as ours. We never see your password.
            </p>
          </Section>

          {/* 5 */}
          <Section number="5" title={t("s5Title").replace(/^\d+\.\s*/, "")}>
            <p>You agree not to:</p>
            <ul className="space-y-2 mt-3">
              <Item>
                Use the Service to provide medical advice to other people, or to
                process Protected Health Information (PHI) covered by HIPAA or
                equivalent laws.
              </Item>
              <Item>
                Upload data that doesn&apos;t belong to you, or that you don&apos;t
                have permission to share with us.
              </Item>
              <Item>
                Reverse-engineer the Service, scrape it at scale, or attempt to extract
                model weights or system prompts.
              </Item>
              <Item>
                Use the Service to generate content that is illegal, harmful,
                misleading, or that infringes anyone&apos;s rights.
              </Item>
              <Item>
                Attempt to interfere with the Service&apos;s security, integrity, or
                availability.
              </Item>
              <Item>
                Resell, sublicense, or repackage the Service without our written permission.
              </Item>
            </ul>
            <p className="mt-4">
              We may suspend or terminate accounts that violate these Terms, with or
              without notice, at our discretion.
            </p>
          </Section>

          {/* 6 */}
          <Section number="6" title={t("s6Title").replace(/^\d+\.\s*/, "")}>
            <p>
              You keep ownership of the lab reports you upload and the questions you
              ask. By using the Service, you grant Meridix Labs a limited, worldwide,
              royalty-free license to process your content solely for the purpose of
              providing the Service to you (running the AI interpretation, storing
              results in your account, generating chat replies, etc.).
            </p>
            <p>
              We do not use your uploads or chat history to train AI models, and we do
              not share your content with third parties except the operational
              sub-processors described in our{" "}
              <Link href="/privacy" className="text-brand-blue hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </Section>

          {/* 7 */}
          <Section number="7" title={t("s7Title").replace(/^\d+\.\s*/, "")}>
            <p>
              The Service&apos;s code, design, branding, copy, and any documentation we
              produce are owned by Meridix Labs and protected by copyright and other
              intellectual-property laws. You may use the Service for your personal,
              non-commercial purposes, but you may not copy, redistribute, or create
              derivative works without our written permission.
            </p>
            <p>
              The AI interpretations themselves are generated specifically for you. You
              can copy, save, or share them with your physician — that&apos;s the whole
              point of the product.
            </p>
          </Section>

          {/* 8 */}
          <Section number="8" title={t("s8Title").replace(/^\d+\.\s*/, "")}>
            <p>
              We work hard to keep the Service available, but we don&apos;t promise it
              will always be uninterrupted or error-free. We may add, remove, or change
              features at any time, and we may discontinue the Service entirely with
              reasonable notice.
            </p>
            <p>
              The Service is currently provided free of charge. If we introduce paid
              features in the future, we will give you clear notice before any charge
              applies.
            </p>
          </Section>

          {/* 9 */}
          <Section number="9" title={t("s9Title").replace(/^\d+\.\s*/, "")}>
            <p className="text-xs text-ink-tertiary leading-relaxed uppercase tracking-wide">
              The Service is provided on an &quot;AS IS&quot; and &quot;AS AVAILABLE&quot;
              basis, without warranties of any kind, whether express or implied,
              including without limitation warranties of merchantability, fitness for a
              particular purpose, accuracy, or non-infringement. We do not warrant that
              the Service will meet your requirements, that AI interpretations will be
              accurate or complete, or that the Service will be available at any
              particular time.
            </p>
          </Section>

          {/* 10 */}
          <Section number="10" title={t("s10Title").replace(/^\d+\.\s*/, "")}>
            <p className="text-xs text-ink-tertiary leading-relaxed uppercase tracking-wide">
              To the maximum extent permitted by law, Meridix Labs and its affiliates
              shall not be liable for any indirect, incidental, special, consequential,
              or punitive damages, or any loss of profits, revenues, data, or goodwill,
              arising out of or in connection with your use of the Service. Our total
              cumulative liability for any claim arising out of or relating to the
              Service is limited to one hundred U.S. dollars (US$100), or, where the
              law of your jurisdiction does not permit such a cap, the minimum amount
              that the law allows.
            </p>
            <p className="text-xs text-ink-tertiary leading-relaxed">
              Some jurisdictions do not allow the exclusion of certain warranties or
              the limitation of liability for incidental or consequential damages, so
              parts of this section may not apply to you. Nothing in these Terms
              excludes liability that cannot lawfully be excluded.
            </p>
          </Section>

          {/* 11 */}
          <Section number="11" title={t("s11Title").replace(/^\d+\.\s*/, "")}>
            <p>
              You agree to defend, indemnify, and hold harmless Meridix Labs from any
              claims, damages, or costs arising out of (a) your use of the Service in
              violation of these Terms, (b) your violation of any law or third-party
              right, or (c) content you upload to the Service.
            </p>
          </Section>

          {/* 12 */}
          <Section number="12" title={t("s12Title").replace(/^\d+\.\s*/, "")}>
            <p>
              You can stop using the Service and delete your account at any time. We
              can suspend or terminate your access if you violate these Terms. The
              sections that by their nature should survive termination (ownership,
              disclaimers, limitations of liability, indemnification, governing law)
              will continue to apply after termination.
            </p>
          </Section>

          {/* 13 */}
          <Section number="13" title={t("s13Title").replace(/^\d+\.\s*/, "")}>
            <p>
              Meridix Labs is operated by an individual founder based in the Republic
              of Türkiye. These Terms are governed by the laws of the Republic of
              Türkiye, without regard to conflict-of-laws principles. Any disputes
              arising out of or relating to these Terms or the Service will be
              resolved by the competent Turkish courts in Istanbul, except where
              mandatory consumer-protection laws of your country of residence give
              you the right to bring a claim in your local courts.
            </p>
            <p>
              We&apos;ll always try to resolve issues directly with you first — please
              email{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-blue hover:underline">
                {CONTACT_EMAIL}
              </a>{" "}
              before escalating.
            </p>
          </Section>

          {/* 14 */}
          <Section number="14" title={t("s14Title").replace(/^\d+\.\s*/, "")}>
            <p>
              We may update these Terms from time to time. When we do, we&apos;ll
              update the &quot;Last updated&quot; date at the top of this page and, for
              material changes, give account-holders advance notice. Your continued use
              of the Service after the update constitutes acceptance of the revised
              Terms.
            </p>
          </Section>

          {/* 15 */}
          <Section number="15" title={t("s15Title").replace(/^\d+\.\s*/, "")}>
            <p>
              Questions about these Terms? Email us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-blue hover:underline">
                {CONTACT_EMAIL}
              </a>.
            </p>
            <p className="mt-4 text-xs text-ink-tertiary leading-relaxed">
              See also our{" "}
              <Link href="/privacy" className="text-brand-blue hover:underline">
                Privacy Policy
              </Link>
              .
            </p>
          </Section>
        </div>
      </section>

      {/* ─── FOOTNOTE ────────────────────────────────────────── */}
      <section className="py-10 bg-surface-raised border-t border-surface-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <p className="text-xs text-ink-tertiary leading-relaxed">
            These Terms are provided in plain English to be readable. They are not
            legal advice. If you need a binding interpretation, please contact us.
          </p>
        </div>
      </section>
    </div>
  );
}

// ── Helpers (kept local to match the privacy page) ────────────
function Section({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h2 className="flex items-baseline gap-3 text-xl sm:text-2xl font-extrabold text-ink tracking-tight mb-4">
        <span className="text-brand-blue text-base">{number}.</span>
        {title}
      </h2>
      <div className="text-ink-secondary text-sm sm:text-base leading-relaxed space-y-3">
        {children}
      </div>
    </div>
  );
}

function Item({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5 text-sm sm:text-base text-ink-secondary leading-relaxed">
      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-blue flex-shrink-0" />
      <span>{children}</span>
    </li>
  );
}
