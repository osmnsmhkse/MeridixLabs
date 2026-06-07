// Content-Security-Policy builder + per-request nonce.
//
// Shipped in REPORT-ONLY mode first (see src/middleware.ts) so it can never
// white-screen the live app. Violations are POSTed to /api/csp-report. Once
// the report stream is clean, promote to enforce mode by switching the header
// name in middleware (see the checklist in SECURITY_AUDIT.md / the PR).
//
// The policy is nonce-based: Next.js automatically stamps the per-request
// nonce onto its own framework/hydration <script> tags when it sees a nonce
// in the CSP header, and we stamp it onto our own inline scripts in the root
// layout. `'strict-dynamic'` lets nonce'd scripts load their dependencies;
// the trailing `https:`/`'unsafe-inline'` are ignored by modern browsers
// (which honor the nonce) and act only as a fallback for very old browsers.

/** Cryptographically-random base64 nonce. Edge-runtime safe (Web Crypto). */
export function generateNonce(): string {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Build the CSP string for a given nonce.
 *
 * Third-party origins reflect what the app actually loads:
 *   • Clerk   — auth scripts, telemetry, hosted account UI
 *   • Supabase — REST/realtime (defensive; app data goes through our API)
 *   • Google Fonts — stylesheet + font files
 * Because this ships Report-Only first, a missing origin is non-breaking —
 * it simply shows up in the report stream so we can add it before enforcing.
 */
export function buildContentSecurityPolicy(nonce: string): string {
  const directives: Record<string, string[]> = {
    "default-src": ["'self'"],
    "base-uri": ["'self'"],
    "object-src": ["'none'"],
    "frame-ancestors": ["'none'"],
    "form-action": ["'self'"],
    "script-src": [
      "'self'",
      `'nonce-${nonce}'`,
      "'strict-dynamic'",
      "https:",
      "'unsafe-inline'", // ignored by browsers that support nonce/strict-dynamic
    ],
    "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
    "font-src": ["'self'", "https://fonts.gstatic.com", "data:"],
    "img-src": ["'self'", "data:", "blob:", "https:"],
    "connect-src": [
      "'self'",
      "https://*.supabase.co",
      "wss://*.supabase.co",
      "https://*.clerk.accounts.dev",
      "https://clerk.meridixlabs.com",
      "https://*.clerk.com",
    ],
    "frame-src": [
      "'self'",
      "https://*.clerk.accounts.dev",
      "https://challenges.cloudflare.com", // Clerk bot-protection (Turnstile)
    ],
    "worker-src": ["'self'", "blob:"],
    "manifest-src": ["'self'"],
    "upgrade-insecure-requests": [],
  };

  const policy = Object.entries(directives)
    .map(([k, v]) => (v.length ? `${k} ${v.join(" ")}` : k))
    .join("; ");

  // Reporting (both the legacy and modern reporting directives).
  return `${policy}; report-uri /api/csp-report; report-to csp-endpoint`;
}
