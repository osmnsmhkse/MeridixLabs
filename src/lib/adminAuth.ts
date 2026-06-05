import crypto from "crypto";
import type { NextRequest } from "next/server";

// Constant-time comparison so the admin password check doesn't leak length /
// prefix information via response timing.
function timingSafeEqualStr(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) {
    // Still do a comparison to keep timing roughly constant, then fail.
    crypto.timingSafeEqual(ab, ab);
    return false;
  }
  return crypto.timingSafeEqual(ab, bb);
}

/**
 * HTTP Basic admin auth for /api/admin/*. Returns true only when ADMIN_PASSWORD
 * is configured and matches (constant-time). Pair with the "auth"-tier rate
 * limiter to throttle brute-force attempts.
 */
export function isAdminAuthorized(request: NextRequest): boolean {
  const expected = process.env.ADMIN_PASSWORD;
  if (!expected) return false;
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Basic ")) return false;
  const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
  const password = decoded.slice(decoded.indexOf(":") + 1);
  return timingSafeEqualStr(password, expected);
}
