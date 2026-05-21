import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";
import { Resend } from "resend";

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

function buildThankYouHtml(stars: string, category: string, message: string): string {
  const messageBlock = message
    ? `<tr><td style="padding:0 32px 24px;">
        <p style="margin:0 0 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Your message</p>
        <div style="background:#f8fafc;border-radius:10px;padding:14px 18px;border-left:3px solid #3b82f6;">
          <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${message.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</p>
        </div>
      </td></tr>`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Thanks for your feedback</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <tr><td style="background:#1e3a5f;padding:28px 32px;">
          <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Meridix Labs</p>
          <p style="margin:6px 0 0;font-size:13px;color:#93c5fd;">Your health, clearly explained</p>
        </td></tr>

        <tr><td style="padding:32px 32px 8px;text-align:center;">
          <p style="margin:0 0 8px;font-size:32px;">${stars}</p>
          <p style="margin:0 0 6px;font-size:20px;font-weight:700;color:#1e3a5f;">Thank you for your feedback!</p>
          <p style="margin:0;font-size:14px;color:#64748b;line-height:1.6;">We received your <strong>${category}</strong> feedback and truly appreciate you taking the time to share it. It helps us build better tools for everyone.</p>
        </td></tr>

        ${messageBlock}

        <tr><td style="padding:0 32px 32px;text-align:center;">
          <p style="margin:0 0 16px;font-size:14px;color:#64748b;line-height:1.6;">Have more to say? We'd love to hear from you anytime.</p>
          <a href="https://meridixlabs.com" style="display:inline-block;background:#1e3a5f;color:#ffffff;font-size:14px;font-weight:600;padding:12px 28px;border-radius:8px;text-decoration:none;">Visit Meridix Labs</a>
        </td></tr>

        <tr><td style="padding:20px 32px 28px;border-top:1px solid #f1f5f9;">
          <p style="margin:0;font-size:12px;color:#94a3b8;line-height:1.6;text-align:center;">
            You received this because you submitted feedback at <a href="https://meridixlabs.com" style="color:#3b82f6;text-decoration:none;">meridixlabs.com</a>.<br>
            This is not medical advice. Always consult a qualified physician.
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

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

  // Send thank-you email to the user if they provided one
  if (email && process.env.RESEND_API_KEY) {
    try {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const stars = "★".repeat(rating) + "☆".repeat(5 - rating);
      await resend.emails.send({
        from: "Meridix Labs <noreply@meridixlabs.com>",
        to: [email],
        subject: "Thanks for your feedback — Meridix Labs",
        html: buildThankYouHtml(stars, category, message),
      });
    } catch (err) {
      console.warn("[feedback] failed to send thank-you email:", err);
    }
  }

  return NextResponse.json({ success: true });
}
