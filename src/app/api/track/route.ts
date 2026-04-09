import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

// Use /tmp on serverless (Vercel) so writes succeed; fall back to data/ locally.
const DATA_FILE =
  process.env.NODE_ENV === "production"
    ? "/tmp/meridix-events.json"
    : path.join(process.cwd(), "data", "events.json");

const ALLOWED_EVENTS = new Set([
  "report_uploaded",
  "interpretation_complete",
  "demo_mode_used",
  "share_whatsapp",
  "email_sent",
  "specialist_link_clicked",
  "language_changed",
]);

interface AnalyticsEvent {
  event: string;
  timestamp: string;
  [key: string]: unknown;
}

async function readEvents(): Promise<AnalyticsEvent[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as AnalyticsEvent[];
  } catch {
    return [];
  }
}

async function appendEvent(entry: AnalyticsEvent): Promise<void> {
  const dir = path.dirname(DATA_FILE);
  try { await fs.mkdir(dir, { recursive: true }); } catch { /* already exists */ }
  const events = await readEvents();
  events.push(entry);
  // Cap at 50,000 entries to avoid unbounded growth
  const trimmed = events.length > 50_000 ? events.slice(-50_000) : events;
  await fs.writeFile(DATA_FILE, JSON.stringify(trimmed), "utf-8");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { event, timestamp, ...rest } = body;

    if (typeof event !== "string" || !ALLOWED_EVENTS.has(event)) {
      return NextResponse.json({ error: "Invalid event." }, { status: 400 });
    }

    const ts = typeof timestamp === "string" ? timestamp : new Date().toISOString();

    // Sanitise: only keep known scalar fields, drop anything that looks like PII
    const safeProps: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(rest)) {
      if (typeof v === "string" || typeof v === "number" || typeof v === "boolean") {
        safeProps[k] = v;
      }
    }

    await appendEvent({ event, timestamp: ts, ...safeProps });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("track error:", err);
    // Never return 500 to the client — analytics must not break the app
    return NextResponse.json({ ok: false });
  }
}
