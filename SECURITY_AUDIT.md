# Meridix Labs — Security & Privacy Audit

**Date:** 2026-06-05
**Branch:** `security-hardening`
**Scope:** Static audit only — no code changed. Patient-facing medical AI platform handling sensitive health data; bar is higher than a normal SaaS app.

**Stack confirmed against the repo:**
- Next.js `^16.2.2` (App Router) + TypeScript + Tailwind, deployed on Vercel.
- **Auth: Clerk** (`@clerk/nextjs ^7.2.3`) — *not* Supabase Auth (the prompt assumed Supabase auth; the real model is Clerk for identity + Supabase service-role for data).
- Supabase (`@supabase/supabase-js`) for Postgres persistence. Recently migrated from a stateless model to persisting data.
- Anthropic Claude API as the AI backend (`@anthropic-ai/sdk`), Voyage AI for RAG embeddings, Resend for email, next-intl for i18n (9 languages incl. RTL Arabic).

## Overall posture

The codebase is **better than average on the fundamentals that are usually broken**: no secrets in `NEXT_PUBLIC_`, all AI calls are server-side, Row-Level Security is enabled deny-by-default on **every** table, every user-data route correctly scopes by the authenticated Clerk user (no IDOR found), AI output is rendered as escaped React text (no XSS sink), and the Privacy Policy is genuinely thorough and current.

The **real, exploitable gaps** are concentrated in four areas:
1. **No rate limiting anywhere** + several uncapped inputs → direct Anthropic cost-blowup / DoS.
2. **An unauthenticated `send-email` endpoint** that sends Meridix-branded HTML email to any attacker-supplied recipient with attacker-controllable body → spam/phishing relay + AI cost.
3. **Zero security headers** (no CSP, no `X-Frame-Options`, no `nosniff`, etc.).
4. **Account/data deletion is promised in the policy but not implemented** → GDPR Art. 17 / KVKK erasure-right gap, plus two stale "we don't store your input" microcopy strings.

Plus a **HIGH npm advisory in the Clerk auth library** and **HIGH advisories in Next.js** (both within the installed version ranges).

---

## 1. Secrets & API key exposure

**Status: GOOD.** No action required to remediate a leak — but see the RLS invariant note.

| # | Finding | Severity |
|---|---------|----------|
| 1.1 | **No secret is exposed via `NEXT_PUBLIC_`.** The only `NEXT_PUBLIC_*` vars in use are `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY`, `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`, and the Clerk redirect-URL vars — all designed to be public. | Info |
| 1.2 | **All Anthropic calls are server-side.** `ANTHROPIC_API_KEY` is referenced only in `src/app/api/**/route.ts` (30 routes) and `src/lib/markerSearchTerms.ts`, which is imported only by `src/app/api/related-studies/route.ts:4` (server). No `@anthropic-ai/sdk` import appears in any `"use client"` file. | Info |
| 1.3 | **Service-role key is server-only.** `SUPABASE_SERVICE_ROLE_KEY` is used only in `supabaseServer()` (`src/lib/supabase.ts:24-32`), never in `supabaseBrowser()`. | Info |
| 1.4 | **Client bundle is clean.** Greppped `.next/static/**` for the actual values of `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `VOYAGE_API_KEY`, `CLERK_SECRET_KEY`, `ADMIN_PASSWORD` → **none present** in client bundles. | Info |
| 1.5 | **Git history is clean.** `git log --all -p` grep for `sk-ant-`, `service_role`, `whsec_…`, `eyJ…` JWTs, `re_…`, `pa-…` returned no committed real secrets. `.env.local` was never committed (only `.env.local.example` with placeholders is tracked). `.gitignore` includes `.env*.local`. | Info |
| 1.6 | **RLS-invariant dependency (document this).** Shipping the Supabase anon key to the browser is safe **only because** every table has RLS enabled with *no* permissive policies (deny-by-default — see §4). If anyone ever adds a policy granting `anon`/`authenticated` read access, the browser-shipped anon key (`src/lib/supabase.ts:35-42`) instantly becomes a data-exfiltration vector for that table. This is a latent footgun, not a current bug. | Low |

**Rotation:** No leaked secret found → **no rotation required.** (`ADMIN_PASSWORD` is a weak human-readable string — see §5.4 — consider rotating to a long random value when you wire up rate limiting.)

**Proposed fix (1.6):** Add a short comment block in `src/lib/supabase.ts` documenting the deny-by-default invariant, and a CI check (or a note in the RLS migration) that no `CREATE POLICY ... TO anon` is ever added.

---

## 2. Security headers

**Status: MISSING ENTIRELY.** `next.config.ts` has **no `headers()` function**, `src/middleware.ts` only runs Clerk and returns `NextResponse.next()` with no headers, and there is **no `vercel.json`**. So the app currently ships **none** of the standard security headers.

| Header | Current | Risk if absent | Severity |
|---|---|---|---|
| `Content-Security-Policy` | ❌ none | No defense-in-depth against XSS / data exfiltration on a page that renders personal health results | **High** |
| `X-Frame-Options` / CSP `frame-ancestors` | ❌ none | **Clickjacking** — the dashboard and results pages can be framed by any site | **High** |
| `X-Content-Type-Options: nosniff` | ❌ none | MIME-sniffing of user-uploaded/served content | Medium |
| `Referrer-Policy: strict-origin-when-cross-origin` | ❌ none | Leaks full URLs (which can carry context) to third parties | Medium |
| `Permissions-Policy` | ❌ none | `camera`, `microphone`, `geolocation`, `payment` not locked down | Medium |
| `Strict-Transport-Security` (`includeSubDomains`) | ⚠️ unconfirmed | Vercel may add HSTS for the apex domain, but it is **not set by the app** and `includeSubDomains`/`preload` is unverified | Medium |

**Proposed fix (Phase 2):**
- Add a static `headers()` block in `next.config.ts` for the always-on headers (`X-Content-Type-Options`, `X-Frame-Options: DENY`, `Referrer-Policy`, `Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()`, `Strict-Transport-Security: max-age=63072000; includeSubDomains; preload`).
- Add **CSP via middleware** (`src/middleware.ts`), shipped as **`Content-Security-Policy-Report-Only` first** so it cannot white-screen the live app, wired to a `/api/csp-report` endpoint that logs violations. Promote to enforce mode only after observing a clean report stream.
- ⚠️ **Sequence with §7:** Next.js has an open advisory *"cross-site scripting in App Router applications using CSP nonces"* in the installed range. **Upgrade Next.js (7.x advisory below) before** rolling out a nonce-based CSP, or the nonce mechanism itself is the bug.
- Note the inline theme script at `src/app/layout.tsx:79-85` will need a nonce (or a hash) under a strict CSP.

---

## 3. Rate limiting & cost protection

**Status: NO RATE LIMITING EXISTS.** Grep for `ratelimit` / `upstash` / `@vercel/kv` / `Ratelimit` across `src/` and `package.json` → **nothing**. This is the single biggest operational risk for a public AI tool.

### 3.1 — Anthropic-calling routes (cost-blowup surface) — **Critical**

30 route handlers call the Claude API. The **public, unauthenticated** ones are directly abusable for unbounded cost / DoS:

`analyze`, `analyze-scan`, `symptom`, `symptom-chat`, `diagnosed`, `diagnosed-chat`, `genetics`, `genetics-chat`, `pediatric`, `pediatric-chat`, `medications`, `medication-chat`, `womens-health`, `womens-health-chat`, `visit-prep`, `visit-debrief`, `visit-chat`, `trend-summary`, `trend-chat`, `chat`, `practice-case`, `questions`, `clinical-trials`, `evaluate-interpretation`, `related-studies`, `send-email`.

(The auth-gated Anthropic routes — `biomarker-insight`, `dashboard-summary`, `health-chat`, `insights-feed`, `lab-chat` — still need per-user limits.)

- **`src/app/api/chat/route.ts`** is the worst offender: `sanitizeMessages()` (line 51) filters by role/non-empty but applies **no cap on the number of messages, no per-message length cap, and no cap on `toolContext`** (line 70). The entire array + context is streamed straight to `claude-sonnet-4-6`. An attacker can POST a huge `messages`/`toolContext` payload repeatedly. **Critical.**
- **`src/app/api/send-email/route.ts`** calls Claude (`generateQuestions`, line 28-55) on every unauthenticated request — see §3.3.

### 3.2 — In-memory limiting won't work on Vercel

Each serverless invocation is isolated, so any `Map`/module-global counter resets per cold start and isn't shared across instances. A **shared store (Upstash Redis or Vercel KV)** is required. *(Recommendation: `@upstash/ratelimit` + `@upstash/redis`, sliding window, per-IP for anonymous routes and per-`userId` where a Clerk session exists. You provision the store and set the env vars; I integrate.)* — **Critical**

### 3.3 — `send-email` is an open, abusable relay — **High**

`src/app/api/send-email/route.ts:200-247` is **unauthenticated** and:
- Sends a fully Meridix-branded HTML email **from `noreply@meridixlabs.com`** (line 236) **to any `email` the caller supplies** (line 237) → spam / email-bombing / brand-reputation abuse.
- Interpolates attacker-controllable fields (`simple`, `specialist`, `summary_headline`, `flags[].marker/value`) into the email HTML **without escaping** (`buildHtml`, lines 102-168; e.g. line 159 `simple.replace(/\n/g,"<br>")`) → **HTML/link injection** into an email sent from your domain (phishing amplification). Contrast: the feedback route *does* escape (`feedback/route.ts` thank-you HTML).
- Calls Claude per request → token cost.

**Proposed fix:** strict per-IP rate limit, escape all interpolated fields, and consider requiring an auth session (or at minimum a CAPTCHA/proof-of-work) to send.

### 3.4 — Input-length caps are inconsistent — **High**

| Route | Cap status |
|---|---|
| `symptom` | ✅ `symptom.slice(0,400)`, `history.slice(0,500)`, image ≤ 7 MB (`symptom/route.ts:133-134,15`) |
| `pediatric` | ✅ multiple `.slice()` caps (`pediatric/route.ts:263-270`) |
| `medications` | ✅ `text.slice(0,4000)`, `context.slice(0,2000)`, file ≤ 10 MB (`medications/route.ts:169,175,128`) |
| `analyze` | ⚠️ file ≤ 10 MB + type allow-list (good), but **no per-request throttle** (`analyze/route.ts`) |
| `chat` | ❌ **no caps at all** (see §3.1) |
| `feedback` / `track` / `ab-track` | ✅ message/anon caps, but **no throttle** → DB-spam/storage abuse |
| Other `*-chat` routes | ⚠️ verify per-route; several pass user text through with no explicit cap |

**Proposed fix:** standard input caps on every user-pasted field (symptoms, lab text, chat messages, `toolContext`), and a shared rate-limit helper applied to all of the above.

---

## 4. Injection: SQL & XSS

### 4.1 — SQL — **GOOD (no findings)**
- All DB access uses the Supabase query builder (parameterized). No raw SQL, no string-concatenated queries.
- Only two `.rpc()` calls: `analytics_summary` (no args — `admin/analytics/route.ts:205`) and `match_knowledge_chunks` (`src/lib/retrieval.ts:40`, passed a typed parameter object — embedding vector + `match_count` + `specialty_filter`). Neither concatenates user input into SQL. Safe.

### 4.2 — Row-Level Security — **GOOD (highest-priority item, and it's already correct)**

**Every table has RLS enabled with deny-by-default (no permissive policies).** The model: the service-role key bypasses RLS server-side; the anon key can do nothing. Verified across `supabase/schema.sql` and all migrations:

| Table | RLS enabled | Source |
|---|---|---|
| `users_profile`, `lab_analyses`, `lab_chat_messages`, `symptom_sessions`, `diagnosis_sessions`, `practice_sessions`, `feedback` | ✅ | `schema.sql` |
| `health_goals`, `interventions`, `user_supplements`, `analysis_shares` | ✅ | `2026-04-30-tier3.sql` |
| `doctor_waitlist` | ✅ | `2026-05-20-rls-doctor-waitlist.sql` |
| `knowledge_chunks` | ✅ | `2026-05-28-knowledge-chunks.sql` |
| `analytics_events`, `ab_events`, `clerk_users` | ✅ | `2026-05-30-analytics.sql` |
| `pubmed_marker_cache` | ✅ | `2026-05-30-related-studies-cache.sql` |

- **Historical note (not actionable):** `doctor_waitlist` was created on 2026-05-14 but RLS wasn't enabled until 2026-05-20 — a 6-day window where the anon key could have read/written it. Already closed; flagging only so the pattern (always enable RLS *in the same migration* that creates a table) is adopted going forward. **Low.**

### 4.3 — XSS — **GOOD overall; one email-side issue**
- **AI/user text is rendered as escaped React text**, not HTML. The shared chat UI renders `{text}` inside `<div className="… whitespace-pre-wrap">` (`src/components/ChatComponents.tsx:71`); `whitespace-pre-wrap` preserves newlines but does **not** interpret HTML. There is **no markdown library** (`react-markdown`/`marked`/`remark` absent) and **no `.innerHTML`/`insertAdjacentHTML`** on dynamic content anywhere in components. → **No DOM-XSS sink for AI output today; no sanitizer is required right now.**
- The 4 `dangerouslySetInnerHTML` uses are all **static, non-user JSON-LD / theme scripts**: `src/app/layout.tsx:79` (theme no-flash script), `src/components/StructuredData.tsx:56` (site JSON-LD), `src/components/blog/BlogJsonLd.tsx:82` (author-authored blog JSON-LD), `src/app/genetics/page.tsx:100` (static FAQ JSON-LD). **Low** — as defense-in-depth, escape `<` in `JSON.stringify(...)` output (`</script>` breakout) even though the data is not user-controlled.
- **Email HTML injection (carryover from §3.3):** `send-email/route.ts` interpolates attacker-controllable fields into email HTML without escaping. **Medium-High.** Fix = HTML-escape every interpolated value (mirror the feedback route's escaping).
- **Forward-looking guard:** if a markdown renderer is ever added for AI medical text (likely), it **must** go through a sanitizer (`rehype-sanitize` / DOMPurify). Worth a code-owner note so the current safe-by-default rendering isn't quietly replaced.

### 4.4 — Request-body validation — **Medium**
- **No `zod` (or any schema validator) anywhere.** Routes do ad-hoc, inconsistent validation — some solid (`feedback` category allow-list + `MAX_MESSAGE`; `interventions` `KINDS` set; profile field allow-lists), some minimal (`chat`, `analyze`, `send-email` accept loosely-typed bodies).
- **Proposed fix:** add `zod` schemas to API route inputs, prioritizing the public Anthropic routes and `send-email`. Reject oversized/oddly-typed bodies before doing any AI/DB work.

### 4.5 — Dynamic `require` (blog) — **Low**
`src/app/blog/page.tsx:49` does `require('../../../content/blog/${post.slug}.json')`. `post.slug` originates from the content directory listing (not user input), so no path traversal today; validate `slug` against the known set as defense-in-depth.

---

## 5. Auth & access control

### 5.1 — User-data routes: **GOOD (no IDOR found)**
Every route that reads/writes user data calls `currentUser()` / `auth()` and scopes the query with `.eq("user_id", user.id)`. There is **no route that trusts a client-supplied user id.** Verified:
- `user-analyses` (GET/PATCH/DELETE), `user-analyses/[id]` (GET), `save-analysis`, `user-profile` (GET/PATCH), `goals`, `interventions`, `supplements`, `lab-chat-history`, `lab-chat`, `share` (POST/DELETE confirm ownership before acting). All correctly user-scoped.

### 5.2 — Clerk webhook: **GOOD**
`src/app/api/webhooks/clerk/route.ts` verifies the Svix signature with `crypto.timingSafeEqual` (line 40), enforces a 5-minute replay tolerance (line 27), and reads the **raw** body for verification (line 69). Solid.

### 5.3 — Public share tokens: **acceptable**
`share` GET (`share/route.ts:56-94`) is intentionally public but token-gated. Tokens are 18 random bytes → base64url (144-bit, `genToken` line 20-22), with server-side expiry enforcement (line 66). Guessing is infeasible. (No rate limit needed for guessing given the entropy; it will still benefit from the global limiter.)

### 5.4 — Admin auth — **Medium**
`admin/analytics` and `admin/feedback` use HTTP Basic against a single shared `ADMIN_PASSWORD`:
- **Non-timing-safe comparison:** `password !== process.env.ADMIN_PASSWORD` (`admin/analytics/route.ts:195`, `admin/feedback/route.ts:20`). **Low** (network timing attacks on a string compare are largely impractical, but cheap to fix with `crypto.timingSafeEqual`).
- **No rate limiting / lockout** on the admin endpoints → brute-forceable. `admin/feedback` returns user-submitted **emails + free-text messages** (PII). **Medium.**
- **Weak shared secret:** the configured `ADMIN_PASSWORD` is a short human-readable string. Rotate to a long random value. **Medium.**
- **Proposed fix:** timing-safe compare + apply the §3 rate limiter to admin routes + rotate to a strong secret. (Consider gating admin behind Clerk with an allow-listed admin user id as a later hardening.)

### 5.5 — CORS — **GOOD**
No explicit CORS headers and no wildcard `Access-Control-Allow-Origin: *` anywhere; routes default to same-origin. No action.

### 5.6 — Error responses leak internals — **Medium**
Many routes return internal error detail to the client:
- **Stack traces:** `save-analysis/route.ts:59` and `user-profile/route.ts:19` return `stack` (first 5 lines) in the 500 body.
- **DB error internals:** numerous routes return `detail: describeError(err)`, which surfaces Supabase `message | code | details | hint` to the client — e.g. `share/route.ts:52,92,109`, `goals/route.ts:77,131,165,185`, `interventions`, `supplements`, `lab-chat-history/route.ts:49`.
- **Risk:** discloses schema/column names, constraint names, and internal structure to anyone hitting the endpoint.
- **Proposed fix:** return a generic `{ error: "Something went wrong." }` in production; keep the detail in `console.error` (server logs) only. Gate any detail behind `process.env.NODE_ENV !== "production"`.

---

## 6. Privacy / legal copy vs reality

### 6.1 — The Privacy Policy itself is **accurate and current** (good news)
`src/app/privacy/page.tsx` (Last updated **May 28, 2026**, post-migration) correctly discloses:
- **Account requirement** and **what's stored** (profile, lab analyses, sessions, chat, supplements, goals, trends) — §2.1/2.2.
- **Where** it's stored: Supabase Postgres + Vercel hosting (§4, lines ~244-260), encryption at rest/in transit, RLS deny-by-default.
- **All five sub-processors**: Anthropic, Supabase, Clerk, Resend, Vercel (§5, lines ~286-330).
- **Retention** (indefinite while active; deletion within 30 days; logs 30 days; email 90 days — §7).
- **Rights**: GDPR, **KVKK Art. 11**, CCPA (§8), plus international-transfer/SCC language (§11) and a **not-medical-advice / not-HIPAA disclaimer** (§9). Terms page carries the disclaimer too (`terms/page.tsx:57-126`).

So §6 is **not** a wholesale "policy still says stateless" problem. The mismatches are narrower and specific:

### 6.2 — Stale "we don't store your input" microcopy — **Medium**
Two tool-level reassurance strings contradict the now-persistent, account-based model (and the Privacy Policy):
- `messages/en.json:244` (`/symptom`): **"This does not store your input. This is not a diagnosis…"**
- `messages/en.json:1547` (`/womens-health`): **"Your information stays private — we don't save what you share."**
- **Risk:** On a health tool, telling users their input isn't stored — while the platform persists health data for signed-in users and sends *all* inputs to Anthropic — is misleading and inconsistent with your own policy. This is a trust/legal-liability issue, not just wording.
- **Note:** these strings exist in the other 8 language files too (same keys) and must be corrected in all locales (do not change i18n behavior — just the copy values).
- **Proposed fix:** reword to match reality (e.g. "We send this securely to our AI to generate your guidance. If you're signed in, your sessions are saved to your account; you can delete them anytime. See our Privacy Policy.").

### 6.3 — Account/data **deletion promised but not implemented** — **Medium-High (priority privacy gap)**
- The policy (`privacy/page.tsx:407`) and Terms (`terms/page.tsx:258`) state users can **"delete your entire account and all linked data from your account settings."**
- **Reality:** there is **no account-deletion endpoint or UI** (no such API route; nothing in `src/app/profile` or `src/app/dashboard`), and **no code deletes `users_profile` anywhere.**
- The Clerk `user.deleted` webhook (`webhooks/clerk/route.ts:109-114`) only **soft-deletes the `clerk_users` mirror row** (`deleted_at`). It never deletes `users_profile` or any health table. Because `lab_analyses`, `lab_chat_messages`, etc. cascade from `users_profile` (`ON DELETE CASCADE`) and `users_profile` is **never deleted**, the cascade **never fires** → **a user's health records persist in Supabase indefinitely after they delete their account.**
- **Risk:** GDPR Art. 17 / KVKK erasure right is not actually actionable as described; the copy over-promises a self-serve flow that doesn't exist. Real legal liability for a health app.
- **Proposed fix (Phase 2):** implement a real "delete my account & data" route that deletes the `users_profile` row (cascading all linked health data) for the authenticated user, and have the Clerk `user.deleted` webhook hard-delete the same. Until self-serve UI exists, the copy should say deletion is by request (email) — but the safest fix is to build the mechanism the policy already promises. *(Flag the legal wording for human review.)*

### 6.4 — Policy over-discloses unused storage — **Low**
The policy lists **"Symptom-checker sessions"** and **"Diagnosis explainer sessions"** as stored (§2.2). In reality the `symptom_sessions`, `diagnosis_sessions`, and `practice_sessions` tables exist in the schema but **no route writes to them** (no `.from("symptom_sessions").insert(...)` anywhere). The `/symptom`, `/diagnosed`, and `/womens-health` API routes don't touch Supabase at all (stateless).
- **Risk:** minor inaccuracy (over-disclosure is lower-risk than under-disclosure, but still wrong).
- **Proposed fix:** either wire up the intended persistence or soften the policy to match what's actually stored. Note this *interacts* with 6.2 — if you DO persist symptom sessions, the "does not store your input" microcopy becomes flatly false.

### 6.5 — Data export is manual-only — **Low**
Policy promises portability "by emailing us" (§8) — acceptable under GDPR/KVKK, but there's no self-serve export. Consider a `/api/export` (authenticated, returns the user's rows as JSON) later. *(Not required for compliance.)*

---

## 7. Dependencies & misc

### 7.1 — `npm audit`: 12 advisories (6 High, 6 Moderate) — **High**

**High (actionable):**
- **`@clerk/nextjs` (installed `^7.2.3`, vulnerable range `7.0.0–7.2.3`) + `@clerk/backend`/`@clerk/react`/`@clerk/shared`** — *"Clerk has an authorization bypass when combining organization, billing, or reverification checks."* This is an **auth-bypass advisory in the auth library of a health app.** Even if those specific features aren't used today, upgrade promptly. **High.**
- **`next` (installed `^16.2.2`, in vulnerable range)** — multiple, including *Middleware/Proxy bypass in App Router* (this app's auth runs in middleware), ***XSS in App Router using CSP nonces*** (directly blocks the §2 nonce-CSP plan), cache poisoning, SSRF via WebSocket upgrades, and Image-Optimization DoS. **High — upgrade Next.js, and do it before the nonce CSP rollout.**
- **`js-cookie` (≤3.0.5)** — prototype-hijack / cookie-attribute injection; transitive via Clerk, resolved by the Clerk upgrade.

**Moderate:** `resend → svix → uuid` (uuid bounds check), `postcss <8.5.10` (`</style>` XSS in stringify), `ws` (uninitialized memory disclosure). Mostly resolved by `npm audit fix` / dependency bumps.

**Proposed fix:** upgrade Clerk and Next.js to patched versions (verify exact fixed versions at PR time), then `npm audit fix` for the moderates. **Do not blind-`--force`** on a production health app — bump, build, lint, and smoke-test auth + middleware before deploy.

### 7.2 — No `/.well-known/security.txt` — **Low**
`public/.well-known/` does not exist. Add `public/.well-known/security.txt` (RFC 9116) with a contact and expiry so researchers can report responsibly.

### 7.3 — No CI secret-scanning — **Low**
No GitHub Actions / pre-commit secret scanner. Add a `gitleaks` step on push so a future accidental secret commit is caught (history is clean today).

### 7.4 — `serverActions.bodySizeLimit: "10mb"` — **Info**
`next.config.ts` raises the server-action body limit to 10 MB to support file uploads. Reasonable, but it widens the surface for large-payload abuse on any server action — pair with the §3 input caps and rate limiting.

---

## Prioritized punch list

### 🔴 Critical
1. **§3.1/3.2 — Add rate limiting to every Anthropic-calling route** (per-IP, plus per-user where a Clerk session exists) using a shared store (Upstash/KV). In-memory will not work on Vercel.
2. **§3.1/3.4 — Cap user inputs**, starting with `chat` (messages count + per-message length + `toolContext`) which is currently fully uncapped.

### 🟠 High
3. **§3.3 — Lock down `send-email`**: per-IP rate limit, HTML-escape all interpolated fields, and require auth/CAPTCHA (open branded-email relay today).
4. **§2 — Add security headers**: static set in `next.config.ts` + CSP via middleware in **Report-Only** mode first (`/api/csp-report`). Sequence after #6.
5. **§7.1 — Upgrade Clerk (auth-bypass HIGH) and Next.js (App Router/middleware + CSP-nonce XSS HIGH)**, then `npm audit fix`. Upgrade Next **before** the nonce CSP.
6. **§6.3 — Implement real account/data deletion** (authenticated route that deletes `users_profile` → cascades health data; hard-delete in the `user.deleted` webhook). Closes the GDPR Art. 17 / KVKK gap the policy already promises.

### 🟡 Medium
7. **§6.2 — Fix the stale "we don't store your input" microcopy** in `/symptom` (`en.json:244`) and `/womens-health` (`en.json:1547`) across all 9 locales.
8. **§4.4 — Add `zod` validation** to API route bodies (public Anthropic routes + `send-email` first).
9. **§5.6 — Stop leaking error internals/stack traces** to clients (`save-analysis:59`, `user-profile:19`, and all `detail: describeError(err)` returns) — generic message in prod, detail to server logs only.
10. **§5.4 — Harden admin auth**: timing-safe compare, rate-limit the admin endpoints, rotate `ADMIN_PASSWORD` to a strong random value.
11. **§4.3 — HTML-escape the `send-email` template fields** (overlaps #3).

### 🟢 Low
12. **§6.4 — Reconcile the policy's symptom/diagnosis-session storage claim** with reality (persist them, or soften the copy).
13. **§4.3 — Escape `</script>` in the JSON-LD `dangerouslySetInnerHTML`** blocks (defense-in-depth).
14. **§7.2 — Add `/.well-known/security.txt`.**
15. **§7.3 — Add a `gitleaks` CI step.**
16. **§1.6 — Document the RLS deny-by-default invariant** in `src/lib/supabase.ts` and guard against future `TO anon` policies.
17. **§4.5 — Validate the blog `slug`** before the dynamic `require`.

### ⚪ Manual steps (you do these — flagged in Phase 2)
- Provision the rate-limit store (Upstash Redis or Vercel KV) and add its env vars. **Expected var names:** `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (or `KV_REST_API_URL` / `KV_REST_API_TOKEN` if you use Vercel KV — tell me which).
- Run the new RLS/any new migration SQL against the remote Supabase DB (I will only write the migration file).
- Rotate `ADMIN_PASSWORD` (no leak found, but it's weak).
- Legal review of the revised privacy/terms wording (I'll mark legal-judgment spots with visible `TODO` comments rather than invent guarantees).

---

**No secret rotation is required** — the git history, client bundle, and `NEXT_PUBLIC_` surface are all clean.

**END OF PHASE 1. No code was changed.**

---
---

# PHASE 2 — Remediation status (implemented 2026-06-05)

Branch `security-hardening`. Build passes (`next build` ✓, TypeScript strict ✓);
runtime-verified that headers/CSP/nonce land and the app boots. Rate limiting is
**fail-open** until you provision Upstash, so nothing breaks before then.

### ✅ Implemented

| Audit item | What shipped |
|---|---|
| §2 Headers | Static headers in `next.config.ts` (nosniff, X-Frame-Options DENY, Referrer-Policy, Permissions-Policy, HSTS preload). **Report-Only** nonce CSP in `src/middleware.ts` (`src/lib/csp.ts`) → `/api/csp-report`. |
| §3 Rate limiting | `src/lib/ratelimit.ts` (Upstash, fail-open). Guards on all 30 Anthropic routes + `send-email` (email tier) + `feedback`/`track`/`ab-track` (write tier) + admin (auth tier). Per-user keying on the auth'd AI routes. |
| §3 Input caps | `src/lib/inputLimits.ts`; `chat` now caps messages count/length + `toolContext` (was uncapped); `symptom` context fields capped. |
| §3/§4 send-email | zod schema (shape + length caps) + `escapeHtml()` on every interpolated field (was HTML/link-injectable). |
| §4 XSS hardening | `src/lib/jsonld.ts` escapes `<` in all JSON-LD; CSP nonce threaded to root-layout inline scripts. (No AI-HTML sink exists — confirmed.) |
| §5 Error leakage | `src/lib/apiError.ts` → generic prod errors, detail only in dev, always logs. Removed all `detail`/`stack` leaks. |
| §5 Admin auth | `src/lib/adminAuth.ts` constant-time compare + rate limit on both admin routes. |
| §4 RLS | `supabase/migrations/2026-06-05-security-baseline.sql` (idempotent re-assert + documents the deny-by-default invariant). **Not applied — run it yourself.** |
| §6 Account deletion | `DELETE /api/account` (erases `users_profile` → cascade, scrubs analytics + mirror, deletes Clerk user); `user.deleted` webhook now erases data; "Danger zone" UI on /profile (i18n in all 9 locales). |
| §6 Stale copy | Fixed `Symptom.reassurance` + `WomensHealth.loadingPrivacy` "we don't store" claims across 9 locales; TODO in privacy §2.2 re: unused session tables. |
| §7 security.txt / CI | `public/.well-known/security.txt` + `.github/workflows/secret-scan.yml` (gitleaks). |

### 🚫 Intentionally NOT done this pass (flagged for you)
- **§7.1 Clerk + Next.js upgrades (HIGH advisories).** Framework version bumps on a live medical app can break auth/rendering and were **not** in the Phase-2 task list. Do these as a separate, individually-tested change. Upgrade Next.js **before** flipping CSP to nonce-enforce (the nonce-XSS advisory is in the current range).
- **zod everywhere.** Added to the highest-risk public route (`send-email`); other routes rely on input caps + rate limits. Extend route-by-route.
- **§6.4 symptom/diagnosis session persistence.** Left a visible TODO instead of guessing — wire persistence or soften copy (product+legal decision).

### 🔧 Manual steps you own
1. **Provision Upstash** and set `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` in Vercel (until then, limiting is OFF/fail-open).
2. **Run** `supabase/migrations/2026-06-05-security-baseline.sql` on the remote DB.
3. **Configure the Clerk webhook** to send `user.deleted` (so deletions erase data) and ensure `CLERK_SECRET_KEY` is set (needed by `/api/account` to delete the Clerk user).
4. **Rotate `ADMIN_PASSWORD`** to a long random value.
5. **Legal review** of the privacy/terms wording + resolve the §2.2 TODO.

### CSP enforce-mode checklist (before flipping Report-Only → enforce)
1. Provision Upstash + deploy; let real traffic run for a few days.
2. Watch `[csp-report]` logs. Expect entries for the page-level JSON-LD on **/genetics** and **/blog/\*** (not yet nonced) — nonce or hash those before enforcing.
3. Confirm **no** legit violations for Clerk (`*.clerk.accounts.dev`, `clerk.meridixlabs.com`, Turnstile), Supabase, Google Fonts, or first-party scripts. Add any missing origin to `src/lib/csp.ts`.
4. Verify sign-in/sign-up, the dashboard, and every AI tool work with the policy attached (Report-Only won't have blocked them, so read the reports, not the UI).
5. **Upgrade Next.js past the CSP-nonce-XSS advisory first.**
6. Flip `CSP_HEADER` in `src/middleware.ts` from `content-security-policy-report-only` to `content-security-policy`. Redeploy and smoke-test immediately.

**No secret rotation required** — git history, client bundle, and `NEXT_PUBLIC_` surface are all clean.
