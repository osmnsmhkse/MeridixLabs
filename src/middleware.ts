// Clerk middleware — attaches auth context to requests when configured.
// All routes remain PUBLIC by default. The platform is fully usable
// without signing up; account-only pages/API routes check auth() inline.
//
// This middleware ALSO sets a per-request, nonce-based Content-Security-Policy
// in REPORT-ONLY mode (see src/lib/csp.ts). Report-Only cannot block anything,
// so it is safe to ship live; violations are POSTed to /api/csp-report. The
// nonce is exposed to server components via the `x-nonce` request header and
// applied to Next.js's own scripts automatically (Next reads the CSP header).

import type { NextRequest, NextFetchEvent } from "next/server";
import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";
import { buildContentSecurityPolicy, generateNonce } from "@/lib/csp";

const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

// While we observe the report stream we ship Report-Only. Flip to
// "content-security-policy" (enforce) only after the stream is clean — see
// the enforce-mode checklist in the PR / SECURITY_AUDIT.md.
const CSP_HEADER = "content-security-policy-report-only";

/**
 * Build a NextResponse.next() that carries the CSP nonce on the request
 * (so server components can read `x-nonce`) and the CSP on the response.
 * The CSP is also mirrored onto the request headers so Next.js stamps the
 * nonce onto its own inline hydration scripts.
 */
function withCsp(req: NextRequest): NextResponse {
  const nonce = generateNonce();
  const csp = buildContentSecurityPolicy(nonce);

  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set(CSP_HEADER, csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set(CSP_HEADER, csp);
  return response;
}

const _clerk = CLERK_ENABLED
  ? clerkMiddleware((_auth, req) => {
      // Preserve Clerk's default behaviour (NextResponse.next) while adding
      // our CSP. No route is protected in middleware, so returning next() is
      // exactly what Clerk would do — we just decorate the response.
      return withCsp(req);
    })
  : null;

export default function middleware(req: NextRequest, event: NextFetchEvent) {
  if (_clerk) return _clerk(req, event);
  return withCsp(req);
}

export const config = {
  matcher: [
    // Match everything except Next internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
