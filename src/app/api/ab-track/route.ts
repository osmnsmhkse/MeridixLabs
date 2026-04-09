import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_FILE =
  process.env.NODE_ENV === "production"
    ? "/tmp/meridix-ab.json"
    : path.join(process.cwd(), "data", "ab-test.json");

const VARIANTS = new Set(["A", "B", "C"]);
const ACTIONS  = new Set(["shown", "clicked"]);

interface ABEvent {
  variant: string;
  action: "shown" | "clicked";
  timestamp: string;
}

async function readEvents(): Promise<ABEvent[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as ABEvent[];
  } catch {
    return [];
  }
}

async function appendEvent(entry: ABEvent): Promise<void> {
  const dir = path.dirname(DATA_FILE);
  try { await fs.mkdir(dir, { recursive: true }); } catch { /* already exists */ }
  const events = await readEvents();
  events.push(entry);
  // Cap at 200,000 entries
  const trimmed = events.length > 200_000 ? events.slice(-200_000) : events;
  await fs.writeFile(DATA_FILE, JSON.stringify(trimmed), "utf-8");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json() as Record<string, unknown>;
    const { variant, action } = body;

    if (typeof variant !== "string" || !VARIANTS.has(variant)) {
      return NextResponse.json({ error: "Invalid variant." }, { status: 400 });
    }
    if (typeof action !== "string" || !ACTIONS.has(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    await appendEvent({ variant, action: action as "shown" | "clicked", timestamp: new Date().toISOString() });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("ab-track error:", err);
    // Never 500 to client — tracking must not break the app
    return NextResponse.json({ ok: false });
  }
}
