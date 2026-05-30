import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { auth } from "@clerk/nextjs/server";
import { isAccountsEnabled, supabaseServer } from "@/lib/supabase";

// Local-dev fallback only. In production events go to Supabase.
const DATA_FILE = path.join(process.cwd(), "data", "events.json");

const ALLOWED_EVENTS = new Set([
  // Lab analyzer
  "report_uploaded",
  "interpretation_complete",
  "demo_mode_used",
  "share_whatsapp",
  "email_sent",
  "specialist_link_clicked",
  "language_changed",
  "chat_message",
  // Imaging / scans
  "imaging_report_uploaded",
  "imaging_interpretation_complete",
  "imaging_share_whatsapp",
  "imaging_email_sent",
  "imaging_specialist_link",
  "scan_image_uploaded",
  "scan_image_interpretation_complete",
  // Cross-app
  "page_view",
  "signed_in",
]);

interface AnalyticsEvent {
  event: string;
  timestamp: string;
  [key: string]: unknown;
}

// ── Local-dev file fallback ────────────────────────────────────────────────
async function appendEventToFile(entry: AnalyticsEvent): Promise<void> {
  const dir = path.dirname(DATA_FILE);
  try { await fs.mkdir(dir, { recursive: true }); } catch { /* already exists */ }
  let events: AnalyticsEvent[] = [];
  try {
    events = JSON.parse(await fs.readFile(DATA_FILE, "utf-8")) as AnalyticsEvent[];
  } catch { /* no file yet */ }
  events.push(entry);
  const trimmed = events.length > 50_000 ? events.slice(-50_000) : events;
  await fs.writeFile(DATA_FILE, JSON.stringify(trimmed), "utf-8");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { event, timestamp, anonId, ...rest } = body;

    if (typeof event !== "string" || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ error: "Invalid event." }, { status: 400 });
    }

    const ts = typeof timestamp === "string" ? timestamp : new Date().toISOString();
    const anon = typeof anonId === "string" ? anonId.slice(0, 64) : null;

    // Sanitise: only keep known scalar fields, drop anything that looks like PII
    const safeProps: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        safeProps[k] = v;
      }
    }

    // Capture the Clerk user id (server-side, trusted) when signed in.
    // auth() reads the session cookie — no network round-trip.
    let userId: string | null = null;
    if (isAccountsEnabled()) {
      try {
        const { userId: uid } = await auth();
        userId = uid ?? null;
      } catch { /* anonymous */ }
    }

    if (isAccountsEnabled()) {
      const { error } = await supabaseServer().from("analytics_events").insert({
        event,
        anon_id: anon,
        user_id: userId,
        props: safeProps,
        created_at: ts,
      });
      if (error) console.error("track insert failed:", error);
    } else {
      // Local dev without Supabase configured.
      await appendEventToFile({ event, timestamp: ts, anonId: anon, ...safeProps });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("track error:", err);
    // Never return 500 to the client — analytics must not break the app
    return NextResponse.json({ ok: false });
  }
}
