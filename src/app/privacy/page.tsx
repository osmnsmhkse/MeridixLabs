import Link from "next/link";
import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";

export const metadata: Metadata = {
  title: "Privacy Policy — Meridix Labs",
  description:
    "How Meridix Labs collects, stores, and protects your health data — written in plain English.",
};

const LAST_UPDATED = "May 28, 2026";
const CONTACT_EMAIL = "contact@meridixlabs.com";

export default async function PrivacyPolicyPage() {
  const t = await getTranslations("Privacy");
  return (
    <div className="min-h-screen bg-surface">
      {/* ─── HERO ─────────────────────────────────────────────── */}
      <section className="gradient-hero -mt-16 pt-52 pb-14 relative overflow-hidden">
        <div className="absolute top-1/3 right-1/4 w-72 h-72 bg-brand-blue/8 rounded-full blur-3xl pointer-events-none" />
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 relative z-10">
          <span className="inline-block px-4 py-1.5 rounded-full bg-surface-raised border border-brand-blue/30 text-brand-blue text-xs font-semibold mb-5 shadow-sm">
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

      {/* ─── TL;DR ───────────────────────────────────────────── */}
      <section className="py-12 bg-surface-raised border-y border-surface-border">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-xs font-bold text-brand-blue uppercase tracking-widest mb-4">
            {t("sixtySecTitle")}
          </h2>
          <ul className="space-y-3 text-sm text-ink-secondary leading-relaxed">
            <Bullet>
              Meridix Labs <strong className="text-ink">requires an account</strong> to use most
              tools end-to-end. We save your profile, lab analyses, diagnosis and symptom
              sessions, chat messages, supplements, goals, and trend data to your account so you
              can come back to them later.
            </Bullet>
            <Bullet>
              After your lab report is analyzed, we keep the <strong className="text-ink">structured
              interpretation and extracted values</strong> on your account — not the original
              PDF or image file, which is discarded after processing.
            </Bullet>
            <Bullet>
              Everything we store is <strong className="text-ink">encrypted at rest</strong> in our
              database and only accessible to you when you sign in.
            </Bullet>
            <Bullet>
              You can <strong className="text-ink">delete individual records or your entire
              account</strong> at any time from the dashboard, or by emailing us.
            </Bullet>
            <Bullet>
              We <strong className="text-ink">do not sell your data</strong> to third parties, we
              don&apos;t run ads, and we don&apos;t use your health data to train AI models.
            </Bullet>
            <Bullet>
              Meridix Labs is an <strong className="text-ink">educational tool, not a medical
              service</strong>. We are not a HIPAA-covered entity. Don&apos;t upload data you
              wouldn&apos;t be comfortable trusting to a consumer health app.
            </Bullet>
          </ul>
        </div>
      </section>

      {/* ─── BODY ────────────────────────────────────────────── */}
      <section className="py-16">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">

          {/* 1. Who we are */}
          <Section number="1" title={t("s1Title").replace(/^\d+\.\s*/, "")}>
            <p>
              Meridix Labs (&quot;Meridix,&quot; &quot;we,&quot; &quot;us&quot;) operates the
              website at meridixlabs.com and the related services that help you understand
              your medical lab results. The service is operated by an individual founder
              based in the Republic of Türkiye and is the &quot;data controller&quot; for
              the personal data described in this policy.
            </p>
            <p>
              This Privacy Policy explains what information we collect when you use those
              services, why we collect it, and what your rights are. By using Meridix Labs
              you accept this Privacy Policy. If you don&apos;t agree with it, please
              don&apos;t use the service.
            </p>
          </Section>

          {/* 2. What we collect */}
          <Section number="2" title={t("s2Title").replace(/^\d+\.\s*/, "")}>
            <h3 className="text-base font-bold text-ink mt-2 mb-2">
              2.1 — Account information
            </h3>
            <p>
              You need an account to use most Meridix Labs tools end-to-end. When you
              sign up we collect:
            </p>
            <ul className="space-y-2 mt-3 mb-4">
              <Item>
                <strong>Account identifiers</strong> from our authentication provider:
                email address, display name, and sign-in method. Your password is held
                only by the auth provider — we never see it.
              </Item>
              <Item>
                <strong>Profile data you choose to provide:</strong> age, sex, weight,
                height, ethnicity, medications, allergies, conditions, family history,
                and lifestyle notes. This is optional, but it makes interpretations more
                accurate.
              </Item>
            </ul>

            <h3 className="text-base font-bold text-ink mt-6 mb-2">
              2.2 — Health inputs and AI outputs you generate
            </h3>
            <p>
              When you use the tools, we save the inputs you provide and the AI-generated
              outputs to your account so you can return to them, track them over time,
              and have continuity across tools:
            </p>
            <ul className="space-y-2 mt-3 mb-4">
              <Item>
                <strong>Lab analyses:</strong> the extracted lab values, abnormal flags,
                AI interpretation, summary, source filename, and date. <em>The original
                uploaded file (PDF or image) is not retained</em> — it is processed in
                memory by the AI provider and discarded once the structured
                interpretation has been generated.
              </Item>
              {/*
                TODO(legal/eng): This policy states Symptom-checker and Diagnosis-explainer
                sessions are saved, and the in-tool reassurance copy for Diagnosed/Medications/
                Pediatric says "Saved privately to your account." But as of this audit NO API
                route writes to the symptom_sessions / diagnosis_sessions / practice_sessions
                tables (the /api/symptom, /api/diagnosed, /api/womens-health routes are
                stateless and never call Supabase). Decide one of:
                  (a) wire the persistence so the copy + policy become true, OR
                  (b) soften this policy section and the sibling tool copy to match reality.
                This is a human/product+legal decision — do not silently flip it either way.
              */}
              <Item>
                <strong>Diagnosis explainer sessions</strong> — the condition you asked
                about and the AI&apos;s explanation.
              </Item>
              <Item>
                <strong>Symptom-checker sessions</strong> — symptoms you entered and the
                AI&apos;s differential and follow-up suggestions.
              </Item>
              <Item>
                <strong>Visit-prep sessions</strong> — the notes and questions you
                generate for upcoming appointments.
              </Item>
              <Item>
                <strong>Lab-chat messages</strong> — your follow-up conversations with
                the AI about your reports.
              </Item>
              <Item>
                <strong>Supplements, medications, health goals, and interventions</strong>{" "}
                you track in your dashboard.
              </Item>
              <Item>
                <strong>Trend data</strong> derived from your lab analyses over time, so
                you can see how individual biomarkers have moved.
              </Item>
            </ul>

            <h3 className="text-base font-bold text-ink mt-6 mb-2">
              2.3 — Operational data
            </h3>
            <ul className="space-y-2 mt-3 mb-4">
              <Item>
                <strong>Anonymous usage metrics</strong> (which tools were used,
                completion rates, selected language) — used in aggregate to improve the
                product. Not tied to your identity.
              </Item>
              <Item>
                <strong>Server logs</strong> (IP address, request timestamps) collected
                by our hosting provider for operational and security purposes.
              </Item>
            </ul>

            <h3 className="text-base font-bold text-ink mt-6 mb-2">
              2.4 — What we do NOT collect
            </h3>
            <ul className="space-y-2 mt-3">
              <Item>The original PDF or image of your lab report after analysis.</Item>
              <Item>
                Your password — authentication is handled by our identity provider,
                which never shares passwords with us.
              </Item>
              <Item>
                Payment information — we don&apos;t currently charge for the service.
              </Item>
              <Item>
                Social media data, contact lists, browsing history, or location data.
              </Item>
            </ul>
          </Section>

          {/* 3. Why */}
          <Section number="3" title={t("s3Title").replace(/^\d+\.\s*/, "")}>
            <p>We use the information we collect for these purposes only:</p>
            <ul className="space-y-2 mt-3">
              <Item>
                <strong>Providing the service</strong> — running the AI interpretation,
                showing your saved analyses, powering the chat panel, and producing the
                outputs you ask for.
              </Item>
              <Item>
                <strong>Continuity across sessions</strong> — so you can come back to a
                previous lab analysis, diagnosis explainer, or symptom-checker session
                without re-entering everything.
              </Item>
              <Item>
                <strong>Trend tracking</strong> — so we can show how your lab values
                have moved over time across multiple uploads.
              </Item>
              <Item>
                <strong>Personalization within the tools</strong> — using your profile
                (age, sex, medications, conditions) to make AI interpretations more
                relevant.
              </Item>
              <Item>
                <strong>Improving the service</strong> — anonymous, aggregate usage
                metrics help us decide what to build next.
              </Item>
              <Item>
                <strong>Communicating with you</strong> — transactional emails (account
                verification, a copy of an interpretation if you request one). We do
                not send marketing emails without your explicit opt-in.
              </Item>
              <Item>
                <strong>Security</strong> — detecting abuse and protecting accounts.
              </Item>
            </ul>
            <p className="mt-4">
              <strong className="text-ink">We do not</strong> sell your data, share it
              with advertisers, use your health data to train AI models, or hand it to
              third parties except the operational sub-processors listed below in
              Section 5.
            </p>
          </Section>

          {/* 4. Storage and security */}
          <Section number="4" title={t("s4Title").replace(/^\d+\.\s*/, "")}>
            <ul className="space-y-2 mt-3">
              <Item>
                <strong>Where it&apos;s stored:</strong> Your account data, profile,
                analyses, sessions, chat messages, supplements, goals, and trend data are
                stored in our managed Postgres database (Supabase). The website itself is
                hosted on Vercel.
              </Item>
              <Item>
                <strong>Encryption in transit:</strong> All traffic between your browser
                and our servers uses HTTPS/TLS.
              </Item>
              <Item>
                <strong>Encryption at rest:</strong> Data stored in our database is
                encrypted at rest by our database provider.
              </Item>
              <Item>
                <strong>Access control:</strong> Database reads and writes go through
                server-side API routes with row-level security enabled and
                deny-by-default policies. Only the signed-in user&apos;s own server
                requests can read or write their records.
              </Item>
              <Item>
                <strong>No original-file retention:</strong> Raw lab files (PDFs and
                images) are passed to the AI provider in memory for analysis and are
                not written to disk on our servers. Only the resulting structured
                interpretation is saved.
              </Item>
            </ul>
            <p className="mt-4 text-xs text-ink-tertiary leading-relaxed">
              No system is 100% secure. While we apply commercially reasonable safeguards,
              we can&apos;t guarantee absolute security. If we ever discover a breach
              affecting your data, we will notify you promptly as required by applicable
              law.
            </p>
          </Section>

          {/* 5. Sub-processors */}
          <Section number="5" title={t("s5Title").replace(/^\d+\.\s*/, "")}>
            <p>
              We rely on a small number of trusted vendors to operate Meridix Labs. They
              are bound by their own privacy commitments, and we only share with them what
              they need to do their job:
            </p>
            <div className="mt-4 space-y-3">
              <Vendor
                name="Anthropic (Claude AI)"
                purpose="AI interpretation of your lab reports, diagnosis and symptom sessions, and chat replies."
                what="Your uploaded file (in memory only, not stored), the chat messages and inputs you send, and the structured patient context you provide. Anthropic processes inputs to return outputs and does not use this data to train its models."
                policy="https://www.anthropic.com/legal/privacy"
                purposeLabel={t("s5VendorPurpose")}
                sharesLabel={t("s5VendorShares")}
                policyLabel={t("privacyLink")}
              />
              <Vendor
                name="Supabase"
                purpose="Managed Postgres database that stores your account, profile, analyses, sessions, chat history, supplements, goals, and trend data — encrypted at rest."
                what="All the data described in Sections 2.1 and 2.2 above."
                policy="https://supabase.com/privacy"
                purposeLabel={t("s5VendorPurpose")}
                sharesLabel={t("s5VendorShares")}
                policyLabel={t("privacyLink")}
              />
              <Vendor
                name="Clerk"
                purpose="User authentication and account management."
                what="Your email, display name, and authentication tokens."
                policy="https://clerk.com/privacy"
                purposeLabel={t("s5VendorPurpose")}
                sharesLabel={t("s5VendorShares")}
                policyLabel={t("privacyLink")}
              />
              <Vendor
                name="Resend"
                purpose="Sending transactional email (e.g., a copy of an interpretation if you request one)."
                what="Your email address and the contents of the email we send you."
                policy="https://resend.com/legal/privacy-policy"
                purposeLabel={t("s5VendorPurpose")}
                sharesLabel={t("s5VendorShares")}
                policyLabel={t("privacyLink")}
              />
              <Vendor
                name="Vercel"
                purpose="Website hosting and serverless infrastructure that runs Meridix Labs."
                what="Standard server logs (IP address, request timestamps) for operational and security purposes. Application data is stored in Supabase, not on Vercel."
                policy="https://vercel.com/legal/privacy-policy"
                purposeLabel={t("s5VendorPurpose")}
                sharesLabel={t("s5VendorShares")}
                policyLabel={t("privacyLink")}
              />
            </div>
            <p className="mt-4 text-xs text-ink-tertiary leading-relaxed">
              We may add or change sub-processors over time. When we do, we&apos;ll update
              this list and the &quot;Last updated&quot; date at the top of this policy.
            </p>
          </Section>

          {/* 6. Cookies */}
          <Section number="6" title={t("s6Title").replace(/^\d+\.\s*/, "")}>
            <p>
              We use a small number of cookies and local-storage entries, all strictly
              necessary for the service to work:
            </p>
            <ul className="space-y-2 mt-3">
              <Item>
                <strong>Authentication cookies</strong> set by Clerk to keep you signed in.
              </Item>
              <Item>
                <strong>localStorage entries</strong> set by us to remember UI
                preferences (e.g., language choice, returning-visitor flag, last-viewed
                tool). These never leave your browser. Your medical data is stored
                server-side on your account, not in localStorage.
              </Item>
            </ul>
            <p className="mt-4">
              We do <strong>not</strong> use third-party advertising cookies, tracking
              pixels, or cross-site analytics tools. Because everything we set is
              strictly necessary, we don&apos;t show a cookie consent banner — but you
              can clear cookies and localStorage at any time from your browser settings.
            </p>
          </Section>

          {/* 7. Data retention */}
          <Section number="7" title={t("s7Title").replace(/^\d+\.\s*/, "")}>
            <ul className="space-y-2 mt-3">
              <Item>
                <strong>Account data and health records:</strong> Kept indefinitely
                while your account is active, so your history and trend data remain
                available to you. We do not run an inactivity-based deletion sweep — your
                data stays until you delete it. You can delete individual records or your
                entire account at any time; once you do, we delete all linked records
                within 30 days.
              </Item>
              <Item>
                <strong>Original lab files:</strong> Not retained. Discarded as soon as
                the AI interpretation has been generated.
              </Item>
              <Item>
                <strong>Server logs:</strong> Standard operational logs (kept by our
                hosting provider) are retained for up to 30 days.
              </Item>
              <Item>
                <strong>Email records:</strong> When you ask us to email you a
                transactional message, that record may be kept by our email provider for
                up to 90 days.
              </Item>
            </ul>
          </Section>

          {/* 8. Your rights */}
          <Section number="8" title={t("s8Title").replace(/^\d+\.\s*/, "")}>
            <p>
              You have the following rights over your data. To exercise any of them, use
              the dashboard tools described below or email us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-blue hover:underline">
                {CONTACT_EMAIL}
              </a>.
            </p>
            <ul className="space-y-2 mt-3">
              <Item>
                <strong>Access:</strong> View all your saved analyses, sessions, and
                chat history directly in your account dashboard.
              </Item>
              <Item>
                <strong>Correction:</strong> Edit your profile information from the
                dashboard at any time.
              </Item>
              <Item>
                <strong>Deletion:</strong> Delete an individual record from the
                dashboard, or delete your entire account and all linked data from your
                account settings. If you can&apos;t find what you need, email us at the
                address above and we will action it within 30 days.
              </Item>
              <Item>
                <strong>Portability:</strong> Request a copy of your data in a
                machine-readable format by emailing us.
              </Item>
              <Item>
                <strong>Withdraw consent:</strong> Stop using the service at any time
                and delete your account.
              </Item>
              <Item>
                <strong>Complain:</strong> If you&apos;re in the EU/UK and believe we&apos;ve
                handled your data improperly, you can lodge a complaint with your local
                data-protection authority.
              </Item>
            </ul>
            <p className="mt-4 text-xs text-ink-tertiary leading-relaxed">
              <strong className="text-ink-secondary">If you&apos;re in Türkiye:</strong> The
              rights above include your statutory rights under KVKK (Kişisel Verilerin
              Korunması Kanunu) Article 11 — to learn whether we process your data, to
              request information about how it&apos;s being used, to request correction or
              deletion, and to object to processing. Requests can be sent to the contact
              address below. If you&apos;re not satisfied with our response, you can lodge
              a complaint with the Turkish Personal Data Protection Authority (KVKK).
            </p>
            <p className="mt-3 text-xs text-ink-tertiary leading-relaxed">
              <strong className="text-ink-secondary">If you&apos;re in the EU/UK:</strong>{" "}
              The rights above include your statutory GDPR/UK-GDPR rights to access,
              rectification, erasure, restriction, portability, and objection.
            </p>
            <p className="mt-3 text-xs text-ink-tertiary leading-relaxed">
              <strong className="text-ink-secondary">If you&apos;re in the U.S.:</strong>{" "}
              For users in California (CCPA), Colorado (CPA), Virginia (VCDPA), and other
              U.S. states with privacy laws, the rights above include your statutory
              rights to access, delete, and opt out of the &quot;sale&quot; of personal
              data. We do not sell personal data.
            </p>
          </Section>

          {/* 9. Health data */}
          <Section number="9" title={t("s9Title").replace(/^\d+\.\s*/, "")}>
            <div className="rounded-2xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 p-5 mb-4">
              <p className="text-sm text-amber-900 dark:text-amber-200 leading-relaxed">
                <strong>Meridix Labs is an educational tool, not a medical service.</strong>{" "}
                We are not a HIPAA-covered entity, and using Meridix Labs does not
                establish a doctor-patient relationship. Our AI interpretations are not
                medical advice, diagnoses, or treatment recommendations. Always consult a
                qualified physician for decisions about your health.
              </p>
            </div>
            <p>
              Because we are not a HIPAA-covered entity, please consider the following
              before uploading any data:
            </p>
            <ul className="space-y-2 mt-3">
              <Item>
                Don&apos;t upload data you&apos;d be uncomfortable trusting to a consumer
                health app.
              </Item>
              <Item>
                If you&apos;re testing on someone else&apos;s lab report (e.g., a family
                member&apos;s), you must have their permission.
              </Item>
              <Item>
                If you&apos;re a healthcare provider, do not use Meridix Labs to process
                Protected Health Information (PHI) covered by HIPAA. Our service is
                designed for individual personal use.
              </Item>
            </ul>
          </Section>

          {/* 10. Children */}
          <Section number="10" title={t("s10Title").replace(/^\d+\.\s*/, "")}>
            <p>
              Meridix Labs is not intended for users under 16. We do not knowingly collect
              data from children under 16. If you believe a child has provided us with
              personal data, please email us and we&apos;ll delete it promptly.
            </p>
          </Section>

          {/* 11. International */}
          <Section number="11" title={t("s11Title").replace(/^\d+\.\s*/, "")}>
            <p>
              Meridix Labs is operated from the Republic of Türkiye and serves users
              globally. Because our sub-processors (listed in Section 5) have
              infrastructure outside Türkiye, your personal data may be transferred to
              and processed in the United States, the European Union, or other regions.
            </p>
            <p>
              By using Meridix Labs you consent to your data being processed in those
              regions, subject to the safeguards described in this policy and our
              sub-processors&apos; own international-transfer commitments (e.g., Standard
              Contractual Clauses for EU-origin data, KVKK-compliant transfer mechanisms
              for Türkiye-origin data). If you do not consent to these transfers, please
              do not use the Service.
            </p>
          </Section>

          {/* 12. Changes */}
          <Section number="12" title={t("s12Title").replace(/^\d+\.\s*/, "")}>
            <p>
              We may update this Privacy Policy from time to time as the service evolves.
              When we make a material change, we will update the &quot;Last updated&quot;
              date at the top of this page and, for significant changes, notify
              account-holders by email. Your continued use of Meridix Labs after such an
              update constitutes acceptance of the revised policy.
            </p>
          </Section>

          {/* 13. Contact */}
          <Section number="13" title={t("s13Title").replace(/^\d+\.\s*/, "")}>
            <p>
              Questions, requests, or concerns about your privacy? Email us at{" "}
              <a href={`mailto:${CONTACT_EMAIL}`} className="text-brand-blue hover:underline">
                {CONTACT_EMAIL}
              </a>.
              We aim to respond to data-related requests within 30 days.
            </p>
            <p className="mt-4 text-xs text-ink-tertiary leading-relaxed">
              See also our{" "}
              <Link href="/terms" className="text-brand-blue hover:underline">
                Terms of Service
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
            This policy is provided in plain English to be readable. It is not legal
            advice. If you need a binding interpretation of how it applies to a
            particular situation, please contact us.
          </p>
        </div>
      </section>
    </div>
  );
}

// ── Helpers ──────────────────────────────────────────────────
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

function Bullet({ children }: { children: React.ReactNode }) {
  return (
    <li className="flex items-start gap-2.5">
      <svg viewBox="0 0 20 20" fill="currentColor" className="w-4 h-4 text-brand-blue flex-shrink-0 mt-0.5">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
      </svg>
      <span>{children}</span>
    </li>
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

function Vendor({
  name,
  purpose,
  what,
  policy,
  purposeLabel,
  sharesLabel,
  policyLabel,
}: {
  name: string;
  purpose: string;
  what: string;
  policy: string;
  purposeLabel: string;
  sharesLabel: string;
  policyLabel: string;
}) {
  return (
    <div className="rounded-xl border border-surface-border bg-white dark:bg-slate-900 p-4">
      <div className="flex items-baseline justify-between gap-3 mb-1.5 flex-wrap">
        <p className="font-bold text-ink">{name}</p>
        <a
          href={policy}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs text-brand-blue hover:underline whitespace-nowrap"
        >
          {policyLabel}
        </a>
      </div>
      <p className="text-xs text-ink-tertiary mb-1.5">
        <strong className="text-ink-secondary">{purposeLabel}</strong> {purpose}
      </p>
      <p className="text-xs text-ink-tertiary">
        <strong className="text-ink-secondary">{sharesLabel}</strong> {what}
      </p>
    </div>
  );
}
