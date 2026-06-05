import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { promises as fs } from "fs";
import path from "path";
import { isAccountsEnabled, supabaseServer } from "@/lib/supabase";

// Local-dev fallback only. In production events go to Supabase.
const DATA_FILE = path.join(process.cwd(), "data", "ab-test.json");

const VARIANTS = new Set(["A", "B", "C"]);
const ACTIONS  = new Set(["shown", "clicked"]);

interface ABEvent {
  variant: string;
  action: "shown" | "clicked";
  timestamp: string;
  anonId?: string | null;
}

async function appendEventToFile(entry: ABEvent): Promise<void> {
  const dir = path.dirname(DATA_FILE);
  try { await fs.mkdir(dir, { recursive: true }); } catch { /* already exists */ }
  let events: ABEvent[] = [];
  try {
    events = JSON.parse(await fs.readFile(DATA_FILE, "utf-8")) as ABEvent[];
  } catch { /* no file yet */ }
  events.push(entry);
  const trimmed = events.length > 200_000 ? events.slice(-200_000) : events;
  await fs.writeFile(DATA_FILE, JSON.stringify(trimmed), "utf-8");
}

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "write");
  if (_rl) return _rl;
  try {
    const body = await request.json() as Record<string, unknown>;
    const { variant, action, anonId } = body;

    if (typeof variant !== "string" || !VARIANTS.has(variant)) {
      return NextResponse.json({ error: "Invalid variant." }, { status: 400 });
    }
    if (typeof action !== "string" || !ACTIONS.has(action)) {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const anon = typeof anonId === "string" ? anonId.slice(0, 64) : null;

    if (isAccountsEnabled()) {
      const { error } = await supabaseServer().from("ab_events").insert({
        variant,
        action,
        anon_id: anon,
      });
      if (error) console.error("ab-track insert failed:", error);
    } else {
      await appendEventToFile({
        variant,
        action: action as "shown" | "clicked",
        timestamp: new Date().toISOString(),
        anonId: anon,
      });
    }

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("ab-track error:", err);
    // Never 500 to client — tracking must not break the app
    return NextResponse.json({ ok: false });
  }
}
