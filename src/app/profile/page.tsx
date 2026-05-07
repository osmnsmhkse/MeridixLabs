"use client";

import { useEffect, useState, Suspense } from "react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";

const AUTH_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

type Depth = "minimal" | "standard" | "comprehensive";

interface Profile {
  user_id: string;
  email: string | null;
  display_name: string | null;
  age: number | null;
  sex: "male" | "female" | "other" | null;
  medications: string | null;
  allergies: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  ethnicity: string | null;
  fasting_default: boolean | null;
  conditions: string | null;
  family_history: string | null;
  lifestyle_notes: string | null;
  profile_depth: Depth;
}

export default function ProfilePage() {
  const t = useTranslations("Profile");
  if (!AUTH_ENABLED) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-surface px-4">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold text-ink">{t("authDisabledTitle")}</h1>
          <p className="mt-2 text-sm text-ink-secondary">
            {t("authDisabledBody")}
          </p>
          <Link href="/" className="mt-4 inline-flex items-center px-4 py-2 bg-brand-blue text-white font-semibold rounded-lg text-sm hover:bg-brand-blue-hover transition-all">
            {t("goHome")}
          </Link>
        </div>
      </div>
    );
  }
  return (
    <Suspense fallback={<div className="min-h-[calc(100vh-4rem)] flex items-center justify-center"><div className="text-sm text-ink-tertiary">{t("loadingProfile")}</div></div>}>
      <ProfileInner />
    </Suspense>
  );
}

function ProfileInner() {
  const t = useTranslations("Profile");
  const { isLoaded, isSignedIn } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const welcome = searchParams.get("welcome") === "1";

  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [depth, setDepth] = useState<Depth>("minimal");

  useEffect(() => {
    if (isLoaded && !isSignedIn) router.replace("/sign-in");
  }, [isLoaded, isSignedIn, router]);

  useEffect(() => {
    if (!isSignedIn) return;
    (async () => {
      try {
        const r = await fetch("/api/user-profile");
        const j = await r.json();
        if (!r.ok) throw new Error(j.error || "Failed to load");
        setProfile(j.profile);
        setDepth(j.profile?.profile_depth ?? "minimal");
      } catch (e) {
        setError(e instanceof Error ? e.message : "Something went wrong.");
      } finally {
        setLoading(false);
      }
    })();
  }, [isSignedIn]);

  function update<K extends keyof Profile>(key: K, value: Profile[K]) {
    setProfile((p) => (p ? { ...p, [key]: value } : p));
    setSaved(false);
  }

  async function save() {
    if (!profile) return;
    setSaving(true);
    setError(null);
    try {
      const payload = { ...profile, profile_depth: depth };
      const r = await fetch("/api/user-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || "Failed to save");
      setProfile(j.profile);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setSaving(false);
    }
  }

  if (!isLoaded || loading) {
    return (
      <div className="min-h-[calc(100vh-4rem)] flex items-center justify-center bg-surface">
        <div className="text-sm text-ink-tertiary">{t("loadingProfile")}</div>
      </div>
    );
  }
  if (!profile) return null;

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-surface py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          {welcome && (
            <div className="mb-4 rounded-xl border border-brand-blue/30 bg-brand-blue/5 px-4 py-3 text-sm text-ink">
              {t("welcomeTitle")} {t("welcomeBody")}
            </div>
          )}
          <h1 className="text-2xl font-bold text-ink">{t("yourProfile")}</h1>
          <p className="mt-1 text-sm text-ink-secondary">
            {t("profileDesc")}
          </p>
        </div>

        {/* Profile depth toggle */}
        <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 p-5 mb-6">
          <p className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide mb-3">{t("depthTitle")}</p>
          <div className="grid grid-cols-3 gap-2">
            {(["minimal", "standard", "comprehensive"] as const).map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => setDepth(d)}
                className={`rounded-xl border px-3 py-2.5 text-xs font-semibold capitalize transition-all ${
                  depth === d
                    ? "border-brand-blue bg-brand-blue/10 text-brand-blue"
                    : "border-surface-border text-ink-secondary hover:border-brand-blue/50"
                }`}
              >
                {d === "minimal" ? t("depthMinimal") : d === "standard" ? t("depthStandard") : t("depthComprehensive")}
              </button>
            ))}
          </div>
          <p className="mt-3 text-xs text-ink-tertiary">
            {depth === "minimal" && t("depthMinimalDesc")}
            {depth === "standard" && t("depthStandardDesc")}
            {depth === "comprehensive" && t("depthComprehensiveDesc")}
          </p>
        </div>

        {/* Form */}
        <div className="rounded-2xl border border-surface-border bg-white dark:bg-slate-900 p-5 md:p-6 space-y-5">
          <Section title={t("sectionBasics")}>
            <Row>
              <Field label={t("fieldName")}>
                <input
                  type="text"
                  value={profile.display_name ?? ""}
                  onChange={(e) => update("display_name", e.target.value || null)}
                  className={inputCx}
                  placeholder={t("namePlaceholder")}
                />
              </Field>
              <Field label={t("fieldEmail")}>
                <input type="email" value={profile.email ?? ""} disabled className={inputCx + " opacity-60 cursor-not-allowed"} />
              </Field>
            </Row>
            <Row>
              <Field label={t("fieldAge")}>
                <input
                  type="number"
                  min={0}
                  max={120}
                  value={profile.age ?? ""}
                  onChange={(e) => update("age", e.target.value ? parseInt(e.target.value, 10) : null)}
                  className={inputCx}
                />
              </Field>
              <Field label={t("fieldSex")}>
                <select
                  value={profile.sex ?? ""}
                  onChange={(e) => update("sex", (e.target.value || null) as Profile["sex"])}
                  className={inputCx}
                >
                  <option value="">—</option>
                  <option value="female">{t("sexFemale")}</option>
                  <option value="male">{t("sexMale")}</option>
                  <option value="other">{t("sexOther")}</option>
                </select>
              </Field>
            </Row>
            <Field label={t("fieldMedications")}>
              <textarea
                rows={3}
                value={profile.medications ?? ""}
                onChange={(e) => update("medications", e.target.value || null)}
                className={textareaCx}
                placeholder={t("medPlaceholder")}
              />
            </Field>
            <Field label={t("fieldAllergies")}>
              <input
                type="text"
                value={profile.allergies ?? ""}
                onChange={(e) => update("allergies", e.target.value || null)}
                className={inputCx}
                placeholder={t("allergyPlaceholder")}
              />
            </Field>
          </Section>

          {(depth === "standard" || depth === "comprehensive") && (
            <Section title={t("sectionStandard")}>
              <Row>
                <Field label={t("fieldWeight")}>
                  <input
                    type="number"
                    step="0.1"
                    value={profile.weight_kg ?? ""}
                    onChange={(e) => update("weight_kg", e.target.value ? Number(e.target.value) : null)}
                    className={inputCx}
                  />
                </Field>
                <Field label={t("fieldHeight")}>
                  <input
                    type="number"
                    value={profile.height_cm ?? ""}
                    onChange={(e) => update("height_cm", e.target.value ? Number(e.target.value) : null)}
                    className={inputCx}
                  />
                </Field>
              </Row>
              <Field label={t("fieldEthnicity")}>
                <input
                  type="text"
                  value={profile.ethnicity ?? ""}
                  onChange={(e) => update("ethnicity", e.target.value || null)}
                  className={inputCx}
                  placeholder={t("ethnicityNote")}
                />
              </Field>
              <label className="flex items-center gap-2 text-sm text-ink-secondary">
                <input
                  type="checkbox"
                  checked={!!profile.fasting_default}
                  onChange={(e) => update("fasting_default", e.target.checked)}
                  className="w-4 h-4 rounded border-surface-border"
                />
                {t("fastingLabel")}
              </label>
            </Section>
          )}

          {depth === "comprehensive" && (
            <Section title={t("sectionComprehensive")}>
              <Field label={t("fieldConditions")}>
                <textarea
                  rows={3}
                  value={profile.conditions ?? ""}
                  onChange={(e) => update("conditions", e.target.value || null)}
                  className={textareaCx}
                  placeholder={t("conditionsPlaceholder")}
                />
              </Field>
              <Field label={t("fieldFamilyHistory")}>
                <textarea
                  rows={3}
                  value={profile.family_history ?? ""}
                  onChange={(e) => update("family_history", e.target.value || null)}
                  className={textareaCx}
                  placeholder={t("familyPlaceholder")}
                />
              </Field>
              <Field label={t("fieldLifestyle")}>
                <textarea
                  rows={3}
                  value={profile.lifestyle_notes ?? ""}
                  onChange={(e) => update("lifestyle_notes", e.target.value || null)}
                  className={textareaCx}
                  placeholder={t("lifestylePlaceholder")}
                />
              </Field>
            </Section>
          )}

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-brand-blue hover:bg-brand-blue-hover text-white font-semibold rounded-lg text-sm disabled:opacity-50 transition-all"
            >
              {saving ? "Saving…" : t("saveProfile")}
            </button>
            <Link
              href="/dashboard"
              className="inline-flex items-center px-4 py-2.5 text-sm font-medium text-ink-secondary hover:text-ink"
            >
              {t("goDashboard")}
            </Link>
            {saved && <span className="text-sm text-emerald-600">Saved ✓</span>}
          </div>
        </div>

        <p className="mt-4 text-xs text-ink-tertiary">
          {t("privacyNote")}
        </p>
      </div>
    </div>
  );
}

const inputCx =
  "w-full rounded-lg border border-surface-border bg-white dark:bg-slate-950 px-3 py-2 text-sm text-ink focus:border-brand-blue focus:ring-1 focus:ring-brand-blue outline-none transition";
const textareaCx = inputCx + " font-normal leading-relaxed";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="text-xs font-semibold text-ink-tertiary uppercase tracking-wide">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
function Row({ children }: { children: React.ReactNode }) {
  return <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>;
}
function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-4">
      <h2 className="text-sm font-bold text-ink">{title}</h2>
      {children}
    </div>
  );
}
