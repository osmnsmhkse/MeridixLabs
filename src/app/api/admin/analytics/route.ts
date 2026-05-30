import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { isAccountsEnabled, supabaseServer } from "@/lib/supabase";

// Local-dev fallback files (production reads from Supabase).
const DATA_FILE    = path.join(process.cwd(), "data", "events.json");
const AB_DATA_FILE = path.join(process.cwd(), "data", "ab-test.json");

interface AnalyticsEvent {
  event: string;
  timestamp: string;
  tier?: string;
  language?: string;
  specialist?: string;
  page?: string;
  anonId?: string | null;
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

// Shape returned by the analytics_summary() Postgres function (and matched by
// the local-dev file fallback below).
interface Summary {
  interpretations: { today: number; thisWeek: number; allTime: number };
  uniqueVisitors: number;
  signedInUsers: number;
  totals: {
    uploads: number;
    demos: number;
    shares: number;
    emails: number;
    specialistClicks: number;
    chatMessages: number;
  };
  tierDistribution: Record<string, number>;
  topTier: string | null;
  langDistribution: Record<string, number>;
  topLanguage: string | null;
  topSpecialist: string | null;
  toolUsage: Record<string, number>;
  dailySeries: { date: string; count: number }[];
  abVariants: Record<string, { shown: number; clicked: number }>;
}

function topEntry(map: Map<string, number>): string | null {
  let best: [string, number] | null = null;
  for (const [k, v] of map.entries()) {
    if (!best || v > best[1]) best = [k, v];
  }
  return best ? best[0] : null;
}

// ── Build the final dashboard payload from a Summary ───────────────────────
function buildResponse(s: Summary) {
  const abStats: Record<string, ABVariantStats> = {};
  let totalAbEvents = 0;
  for (const v of ["A", "B", "C"]) {
    const shown   = s.abVariants[v]?.shown   ?? 0;
    const clicked = s.abVariants[v]?.clicked ?? 0;
    totalAbEvents += shown + clicked;
    abStats[v] = { shown, clicked, rate: shown > 0 ? Math.round((clicked / shown) * 1000) / 10 : 0 };
  }
  const allSufficient = ["A", "B", "C"].every((v) => abStats[v].shown >= 200);
  let winner: string | null = null;
  if (allSufficient) {
    winner = ["A", "B", "C"].reduce((best, v) => (abStats[v].rate > abStats[best].rate ? v : best), "A");
  }

  return {
    interpretations: s.interpretations,
    uniqueVisitors: s.uniqueVisitors,
    signedInUsers: s.signedInUsers,
    tierDistribution: s.tierDistribution,
    topTier: s.topTier,
    langDistribution: s.langDistribution,
    topLanguage: s.topLanguage,
    topSpecialist: s.topSpecialist,
    toolUsage: s.toolUsage,
    dailySeries: s.dailySeries,
    totals: { ...s.totals, specialistClicks: s.totals.specialistClicks },
    abTest: { variants: abStats, winner, variantText: VARIANT_TEXT, totalEvents: totalAbEvents },
    generatedAt: new Date().toISOString(),
  };
}

// ── Local-dev fallback: compute Summary from JSON files ────────────────────
async function summarizeFromFiles(): Promise<Summary> {
  let events: AnalyticsEvent[] = [];
  try { events = JSON.parse(await fs.readFile(DATA_FILE, "utf-8")) as AnalyticsEvent[]; } catch { /* none */ }
  let abEvents: ABEvent[] = [];
  try { abEvents = JSON.parse(await fs.readFile(AB_DATA_FILE, "utf-8")) as ABEvent[]; } catch { /* none */ }

  const now = new Date();
  const todayStart = new Date(now); todayStart.setUTCHours(0, 0, 0, 0);
  const todayMs = todayStart.getTime();
  const weekMs  = todayMs - 6 * 86_400_000;

  const interp = events.filter((e) => e.event === "interpretation_complete");
  const count  = (pred: (e: AnalyticsEvent) => boolean) => events.filter(pred).length;
  const inSet  = (e: AnalyticsEvent, names: string[]) => names.includes(e.event);

  const tierCounts = new Map<string, number>();
  const langCounts = new Map<string, number>();
  for (const e of interp) {
    if (e.tier)     tierCounts.set(e.tier, (tierCounts.get(e.tier) ?? 0) + 1);
    if (e.language) langCounts.set(e.language, (langCounts.get(e.language) ?? 0) + 1);
  }

  const specialistCounts = new Map<string, number>();
  for (const e of events) {
    if (inSet(e, ["specialist_link_clicked", "imaging_specialist_link"]) && e.specialist) {
      specialistCounts.set(e.specialist, (specialistCounts.get(e.specialist) ?? 0) + 1);
    }
  }

  const toolUsage = new Map<string, number>();
  for (const e of events) {
    if (e.event === "page_view" && typeof e.page === "string") {
      toolUsage.set(e.page, (toolUsage.get(e.page) ?? 0) + 1);
    }
  }

  const daily = new Map<string, number>();
  for (let i = 29; i >= 0; i--) daily.set(new Date(todayMs - i * 86_400_000).toISOString().slice(0, 10), 0);
  for (const e of interp) {
    const key = e.timestamp.slice(0, 10);
    if (daily.has(key)) daily.set(key, (daily.get(key) ?? 0) + 1);
  }

  const visitors = new Set<string>();
  for (const e of events) if (typeof e.anonId === "string" && e.anonId) visitors.add(e.anonId);

  const abVariants: Record<string, { shown: number; clicked: number }> = {};
  for (const v of ["A", "B", "C"]) {
    abVariants[v] = {
      shown:   abEvents.filter((e) => e.variant === v && e.action === "shown").length,
      clicked: abEvents.filter((e) => e.variant === v && e.action === "clicked").length,
    };
  }

  return {
    interpretations: {
      today:    interp.filter((e) => new Date(e.timestamp).getTime() >= todayMs).length,
      thisWeek: interp.filter((e) => new Date(e.timestamp).getTime() >= weekMs).length,
      allTime:  interp.length,
    },
    uniqueVisitors: visitors.size,
    signedInUsers: 0, // file fallback has no Clerk ids
    totals: {
      uploads:          count((e) => inSet(e, ["report_uploaded", "imaging_report_uploaded", "scan_image_uploaded"])),
      demos:            count((e) => e.event === "demo_mode_used"),
      shares:           count((e) => inSet(e, ["share_whatsapp", "imaging_share_whatsapp"])),
      emails:           count((e) => inSet(e, ["email_sent", "imaging_email_sent"])),
      specialistClicks: count((e) => inSet(e, ["specialist_link_clicked", "imaging_specialist_link"])),
      chatMessages:     count((e) => e.event === "chat_message"),
    },
    tierDistribution: Object.fromEntries(tierCounts),
    topTier: topEntry(tierCounts),
    langDistribution: Object.fromEntries(langCounts),
    topLanguage: topEntry(langCounts),
    topSpecialist: topEntry(specialistCounts),
    toolUsage: Object.fromEntries(toolUsage),
    dailySeries: Array.from(daily.entries()).map(([date, c]) => ({ date, count: c })),
    abVariants,
  };
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

  try {
    let summary: Summary;
    if (isAccountsEnabled()) {
      const { data, error } = await supabaseServer().rpc("analytics_summary");
      if (error) throw error;
      summary = data as Summary;
    } else {
      summary = await summarizeFromFiles();
    }
    return NextResponse.json(buildResponse(summary));
  } catch (err) {
    console.error("admin analytics error:", err);
    return NextResponse.json({ error: "Failed to load analytics." }, { status: 500 });
  }
}
