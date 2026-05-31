// Canonical brand facts. Single source of truth for SEO / structured data.
// Keep this consistent with the Footer links and your real social profiles —
// search engines use `socialLinks` (schema.org `sameAs`) to recognize that
// "Meridix Labs" is the entity that owns meridixlabs.com.

export const SITE_URL = "https://www.meridixlabs.com";

export const SITE = {
  name: "Meridix Labs",
  // Helps Google match the searched spelling "meridixlabs" to this entity.
  alternateNames: ["MeridixLabs", "Meridix", "meridixlabs"],
  url: SITE_URL,
  description:
    "Meridix Labs is an AI-powered medical interpretation platform that helps patients understand their own health — from lab results and symptoms to diagnoses and medications — in plain English.",
  email: "contact@meridixlabs.com",
  logo: `${SITE_URL}/icon-512.png`,
  founder: "Osman Semih Kose",
  twitterHandle: "@meridixlabs",
} as const;

// Public profiles owned by Meridix Labs. Only include URLs you actually control.
// LinkedIn intentionally omitted until a real company-page URL is confirmed.
export const socialLinks: string[] = [
  "https://www.instagram.com/meridixlabs",
  "https://twitter.com/meridixlabs",
  "https://x.com/meridixlabs",
];
