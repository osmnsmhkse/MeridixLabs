import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE =
  process.env.NODE_ENV === "production"
    ? "/tmp/meridix-events.json"
    : path.join(process.cwd(), "data", "events.json");

const AB_DATA_FILE =
  process.env.NODE_ENV === "production"
    ? "/tmp/meridix-ab.json"
    : path.join(process.cwd(), "data", "ab-test.json");

interface AnalyticsEvent {
  event: string;
  timestamp: string;
  tier?: string;
  language?: string;
  specialist?: string;
  from?: string;
  to?: string;
  fileType?: string;
  fileSize?: number;
  [key: string]: unknown;
}

interface ABEvent {
  variant: string;
  action: "shown" | "clicked";
  timestamp: string;
}

interface ABVariantStats {
  shown: number;
  clicked: number;
  rate: number; // conversion rate 0–100
}

const VARIANT_TEXT: Record<string, string> = {
  A: "Analyze My Results — Free",
  B: "Understand My Lab Report",
  C: "Get a Free Explanation",
};

function startOfDay(date: Date): Date {
  const d = new Date(date);
  d.setUTCHours(0, 0, 0, 0);
  return d;
}

function toDateKey(ts: string): string {
  return ts.slice(0, 10); // "YYYY-MM-DD"
}

function topEntry(map: Map<string, number>): string | null {
  let best: [string, number] | null = null;
  for (const [k, v] of map.entries()) {
    if (!best || v > best[1]) best = [k, v];
  }
  return best ? best[0] : null;
}

export async function GET(request: NextRequest) {
  // Re-check auth inside the route handler for defence-in-depth
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const decoded = Buffer.from(authHeader.slice(6), "base64").toString("utf-8");
    const password = decoded.slice(decoded.indexOf(":") + 1);
    if (!process.env.ADMIN_PASSWORD || password !== process.env.ADMIN_PASSWORD) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  } else {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  let events: AnalyticsEvent[] = [];
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    events = JSON.parse(raw) as AnalyticsEvent[];
  } catch {
    // File doesn't exist yet — return empty stats
  }

  const now = new Date();
  const todayStart = startOfDay(now).getTime();
  const weekStart  = new Date(todayStart - 6 * 24 * 60 * 60 * 1000).getTime();

  // ── Interpretation counts ──────────────────────────────────────────────────
  const interpretations = events.filter((e) => e.event === "interpretation_complete");
  const today = interpretations.filter((e) => new Date(e.timestamp).getTime() >= todayStart).length;
  const thisWeek = interpretations.filter((e) => new Date(e.timestamp).getTime() >= weekStart).length;
  const allTime = interpretations.length;

  // ── Tier distribution ──────────────────────────────────────────────────────
  const tierCounts = new Map<string, number>();
  for (const e of interpretations) {
    if (e.tier) tierCounts.set(e.tier, (tierCounts.get(e.tier) ?? 0) + 1);
  }
  const tierDistribution = Object.fromEntries(tierCounts.entries());
  const topTier = topEntry(tierCounts);

  // ── Language distribution ──────────────────────────────────────────────────
  const langCounts = new Map<string, number>();
  for (const e of interpretations) {
    if (e.language) langCounts.set(e.language, (langCounts.get(e.language) ?? 0) + 1);
  }
  const langDistribution = Object.fromEntries(langCounts.entries());
  const topLanguage = topEntry(langCounts);

  // ── Specialist clicks ──────────────────────────────────────────────────────
  const specialistEvents = events.filter((e) => e.event === "specialist_link_clicked");
  const specialistCounts = new Map<string, number>();
  for (const e of specialistEvents) {
    if (e.specialist) specialistCounts.set(e.specialist, (specialistCounts.get(e.specialist) ?? 0) + 1);
  }
  const topSpecialist = topEntry(specialistCounts);

  // ── Daily interpretations — last 30 days ──────────────────────────────────
  const dailyCounts = new Map<string, number>();
  for (let i = 29; i >= 0; i--) {
    const d = new Date(todayStart - i * 24 * 60 * 60 * 1000);
    dailyCounts.set(toDateKey(d.toISOString()), 0);
  }
  for (const e of interpretations) {
    const key = toDateKey(e.timestamp);
    if (dailyCounts.has(key)) {
      dailyCounts.set(key, (dailyCounts.get(key) ?? 0) + 1);
    }
  }
  const dailySeries = Array.from(dailyCounts.entries()).map(([date, count]) => ({ date, count }));

  // ── Other totals ──────────────────────────────────────────────────────────
  const uploads  = events.filter((e) => e.event === "report_uploaded").length;
  const demos    = events.filter((e) => e.event === "demo_mode_used").length;
  const shares   = events.filter((e) => e.event === "share_whatsapp").length;
  const emails   = events.filter((e) => e.event === "email_sent").length;

  // ── A/B test results ──────────────────────────────────────────────────────
  let abEvents: ABEvent[] = [];
  try {
    const raw = await fs.readFile(AB_DATA_FILE, "utf-8");
    abEvents = JSON.parse(raw) as ABEvent[];
  } catch { /* file doesn't exist yet */ }

  const abStats: Record<string, ABVariantStats> = {};
  for (const v of ["A", "B", "C"]) {
    const shown   = abEvents.filter((e) => e.variant === v && e.action === "shown").length;
    const clicked = abEvents.filter((e) => e.variant === v && e.action === "clicked").length;
    abStats[v] = {
      shown,
      clicked,
      rate: shown > 0 ? Math.round((clicked / shown) * 1000) / 10 : 0,
    };
  }

  // Determine winner: variant with highest rate where all have 200+ shown
  const allSufficient = ["A", "B", "C"].every((v) => abStats[v].shown >= 200);
  let winner: string | null = null;
  if (allSufficient) {
    winner = ["A", "B", "C"].reduce((best, v) =>
      abStats[v].rate > abStats[best].rate ? v : best
    , "A");
  }

  return NextResponse.json({
    interpretations: { today, thisWeek, allTime },
    tierDistribution,
    topTier,
    langDistribution,
    topLanguage,
    topSpecialist,
    dailySeries,
    totals: { uploads, demos, shares, emails, specialistClicks: specialistEvents.length },
    abTest: { variants: abStats, winner, variantText: VARIANT_TEXT, totalEvents: abEvents.length },
    generatedAt: new Date().toISOString(),
  });
}
