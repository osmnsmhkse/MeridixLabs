// Shared rate limiter (Upstash Redis) for serverless.
//
// In-memory counters DO NOT work on Vercel — every invocation is isolated, so
// a module-global Map resets per cold start and isn't shared across instances.
// A central store is required. We use Upstash Redis via @upstash/ratelimit.
//
// FAIL-OPEN: if the store isn't configured (env vars absent) or errors at
// runtime, requests are allowed through. For a patient-facing health app,
// availability beats hard-blocking on an infra dependency — better to be
// briefly unprotected than to 500 every request because Redis is down.
// Provision the store and set these env vars to turn limiting ON:
//
//   UPSTASH_REDIS_REST_URL
//   UPSTASH_REDIS_REST_TOKEN
//
// (Vercel's "Upstash" / KV marketplace integration sets these automatically.)

import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";
import { NextResponse } from "next/server";

const url = process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.UPSTASH_REDIS_REST_TOKEN;

const redis = url && token ? new Redis({ url, token }) : null;

if (!redis && process.env.NODE_ENV === "production") {
  // eslint-disable-next-line no-console
  console.warn(
    "[ratelimit] UPSTASH_REDIS_REST_URL / _TOKEN not set — rate limiting is DISABLED (fail-open).",
  );
}

/**
 * Tiers, tuned to each route's cost/abuse profile. Anonymous traffic is keyed
 * by IP; signed-in traffic is keyed by Clerk user id (passed by the caller).
 */
export type RateTier = "ai" | "ai-heavy" | "email" | "auth" | "write";

const TIERS: Record<RateTier, { tokens: number; window: `${number} ${"s" | "m" | "h"}` }> = {
  ai: { tokens: 30, window: "1 m" }, // chat + per-question AI routes
  "ai-heavy": { tokens: 12, window: "1 m" }, // file upload → vision/doc analysis
  email: { tokens: 3, window: "10 m" }, // outbound email (abuse/cost)
  auth: { tokens: 8, window: "1 m" }, // admin password attempts (brute-force)
  write: { tokens: 40, window: "1 m" }, // public DB writes (feedback/track)
};

const cache = new Map<RateTier, Ratelimit>();

function limiterFor(tier: RateTier): Ratelimit | null {
  if (!redis) return null;
  let lim = cache.get(tier);
  if (!lim) {
    const cfg = TIERS[tier];
    lim = new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(cfg.tokens, cfg.window),
      prefix: `mrx:rl:${tier}`,
      analytics: false,
    });
    cache.set(tier, lim);
  }
  return lim;
}

/** Best-effort client IP from proxy headers (Vercel sets x-forwarded-for). */
export function clientIp(req: Request): string {
  const xff = req.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]!.trim();
  return req.headers.get("x-real-ip") ?? "0.0.0.0";
}

/**
 * Enforce a rate limit. Returns a 429 `NextResponse` when the caller is over
 * the limit, or `null` when the request may proceed (including when limiting
 * is disabled or the store errors — fail-open).
 *
 * Pass `userId` for signed-in routes so the limit is per-account rather than
 * per-IP (fairer behind shared NATs / mobile networks).
 */
export async function rateLimit(
  req: Request,
  tier: RateTier,
  opts: { userId?: string | null } = {},
): Promise<NextResponse | null> {
  const limiter = limiterFor(tier);
  if (!limiter) return null;

  const key = opts.userId ? `u:${opts.userId}` : `ip:${clientIp(req)}`;
  try {
    const { success, limit, remaining, reset } = await limiter.limit(key);
    if (success) return null;

    const retryAfter = Math.max(1, Math.ceil((reset - Date.now()) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please slow down and try again in a moment." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
          "RateLimit-Limit": String(limit),
          "RateLimit-Remaining": String(remaining),
        },
      },
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[ratelimit] store error — failing open:", err);
    return null;
  }
}
