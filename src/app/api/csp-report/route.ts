// CSP violation sink. The browser POSTs here when a (Report-Only) CSP
// directive would have been violated. We just log a compact summary so we
// can see what a strict policy would block before promoting it to enforce
// mode. Never throws; always returns 204.

import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

interface CspReportBody {
  "csp-report"?: Record<string, unknown>;
  // Reporting API ("report-to") batches violations as an array instead.
  body?: Record<string, unknown>;
}

export async function POST(request: NextRequest) {
  try {
    const raw = await request.text();
    if (raw) {
      let summary = raw.slice(0, 2000);
      try {
        const parsed = JSON.parse(raw) as CspReportBody | CspReportBody[];
        const report = Array.isArray(parsed) ? parsed[0] : parsed;
        const r = report?.["csp-report"] ?? report?.body ?? report;
        if (r && typeof r === "object") {
          const o = r as Record<string, unknown>;
          summary = JSON.stringify({
            documentUri: o["document-uri"] ?? o["documentURL"],
            violatedDirective: o["violated-directive"] ?? o["effectiveDirective"],
            blockedUri: o["blocked-uri"] ?? o["blockedURL"],
          });
        }
      } catch {
        /* keep the raw slice */
      }
      // eslint-disable-next-line no-console
      console.warn("[csp-report]", summary);
    }
  } catch {
    /* swallow — reporting must never break */
  }
  return new NextResponse(null, { status: 204 });
}
