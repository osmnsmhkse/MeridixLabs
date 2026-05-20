import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

/**
 * Feedback API route.
 *
 * TODO — Future integrations:
 *   1. Supabase: persist each entry into a `feedback` table.
 *      Suggested schema:
 *        feedback(
 *          id          uuid primary key default gen_random_uuid(),
 *          created_at  timestamptz not null default now(),
 *          rating      int  not null check (rating between 1 and 5),
 *          category    text,
 *          message     text,
 *          email       text,
 *          page        text,
 *          user_agent  text
 *        );
 *      Enable RLS; allow service-role inserts only.
 *
 *   2. Resend: email notification to founders@meridixlabs.com on each submit
 *      (or only when rating <= 2 / category = 'Bug Report').
 *
 *   3. Slack: POST to an incoming webhook (env: FEEDBACK_SLACK_WEBHOOK_URL)
 *      with a formatted block kit message so the team sees feedback in real time.
 */

interface FeedbackPayload {
  rating: number;
  category?: string;
  message?: string;
  email?: string;
  page?: string;
  timestamp?: string;
  userAgent?: string;
}

interface StoredFeedback extends FeedbackPayload {
  id: string;
  received_at: string;
}

const MAX_MESSAGE = 1000;
const VALID_CATEGORIES = new Set([
  "General",
  "Lab Analyzer",
  "Symptom Checker",
  "Diagnosis Explainer",
  "Imaging Explainer",
  "Medication Companion",
  "Doctor's Visit Companion",
  "Bug Report",
  "Feature Request",
]);

export async function POST(request: NextRequest) {
  let body: FeedbackPayload;
  try {
    body = (await request.json()) as FeedbackPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
  }

  const rating = Number(body.rating);
  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json(
      { error: "Rating must be an integer between 1 and 5" },
      { status: 400 }
    );
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (message.length > MAX_MESSAGE) {
    return NextResponse.json(
      { error: `Message must be ${MAX_MESSAGE} characters or fewer` },
      { status: 400 }
    );
  }

  const category =
    typeof body.category === "string" && VALID_CATEGORIES.has(body.category)
      ? body.category
      : "General";

  const email = typeof body.email === "string" ? body.email.trim() : "";
  if (email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address" }, { status: 400 });
    }
  }

  // Capture page server-side from Referer if client didn't pass it
  let page = typeof body.page === "string" ? body.page : "";
  if (!page) {
    const referer = request.headers.get("referer") || "";
    try {
      page = referer ? new URL(referer).pathname : "";
    } catch {
      page = "";
    }
  }

  const userAgent =
    (typeof body.userAgent === "string" && body.userAgent) ||
    request.headers.get("user-agent") ||
    "";

  const entry: StoredFeedback = {
    id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    received_at: new Date().toISOString(),
    rating,
    category,
    message,
    email: email || undefined,
    page,
    timestamp: body.timestamp,
    userAgent,
  };

  if (process.env.NODE_ENV === "development") {
    // Structured log for local dev
    console.log("[feedback]", JSON.stringify(entry, null, 2));

    // Append to a local file so submissions are easy to inspect during testing
    try {
      const logPath = path.join(process.cwd(), "feedback-log.json");
      let existing: StoredFeedback[] = [];
      try {
        const raw = await fs.readFile(logPath, "utf8");
        existing = JSON.parse(raw) as StoredFeedback[];
        if (!Array.isArray(existing)) existing = [];
      } catch {
        existing = [];
      }
      existing.push(entry);
      await fs.writeFile(logPath, JSON.stringify(existing, null, 2), "utf8");
    } catch (err) {
      console.warn("[feedback] failed to write local log file:", err);
    }
  } else {
    // In production, still surface a compact log line for now until Supabase is wired
    console.log("[feedback]", JSON.stringify(entry));
  }

  // FUTURE: Supabase integration
  //   const supabase = createClient(
  //     process.env.NEXT_PUBLIC_SUPABASE_URL!,
  //     process.env.SUPABASE_SERVICE_ROLE_KEY!
  //   );
  //   await supabase.from("feedback").insert({
  //     rating: entry.rating,
  //     category: entry.category,
  //     message: entry.message,
  //     email: entry.email,
  //     page: entry.page,
  //     user_agent: entry.userAgent,
  //   });

  return NextResponse.json({ success: true });
}
