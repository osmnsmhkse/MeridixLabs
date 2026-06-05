import { NextRequest, NextResponse } from "next/server";
import { rateLimit } from "@/lib/ratelimit";
import { Resend } from "resend";
import Anthropic from "@anthropic-ai/sdk";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

interface FlagItem {
  marker: string;
  value: string;
  unit: string;
  reference: string;
  status: "high" | "low" | "normal";
}

interface SendEmailBody {
  email: string;
  mode: "lab" | "radiology";
  lang?: string;
  overall_status?: "normal" | "amber" | "red";
  summary_headline?: string;
  urgency?: "routine" | "soon" | "weeks";
  simple: string;
  specialist?: string;
  action?: string;
  flags?: FlagItem[];
}

async function generateQuestions(body: SendEmailBody): Promise<string[]> {
  const { mode, flags = [], specialist, action, simple, lang = "en" } = body;
  const isRadiology = mode === "radiology";

  const flagLines = flags.length > 0
    ? flags.map((f) => `- ${f.marker}: ${f.value} ${f.unit} (reference: ${f.reference}, status: ${f.status})`).join("\n")
    : "No specific flagged values provided.";

  const context = [
    `Findings:\n${flagLines}`,
    specialist && `Specialist recommendation: ${specialist}`,
    action     && `Recommended action: ${action}`,
    `Plain-language summary: ${simple}`,
  ].filter(Boolean).join("\n\n");

  const systemPrompt = isRadiology
    ? `You are a patient advocate at Meridix Labs. Generate exactly 5 specific questions a patient should ask their doctor about their radiology/pathology report. Each question must reference specific findings from the report, be written in first person, and not be alarmist. Return ONLY a JSON array of 5 strings.`
    : `You are a patient advocate at Meridix Labs. Generate exactly 5 specific questions a patient should ask their doctor about their lab results. Each question must reference specific lab values and markers, be written in first person, and not be alarmist. Return ONLY a JSON array of 5 strings.`;

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-0",
    max_tokens: 800,
    system: systemPrompt,
    messages: [{
      role: "user",
      content: `Generate 5 patient questions. Language: ${lang}.\n\n${context}`,
    }],
  });

  const raw = response.content[0].type === "text" ? response.content[0].text : "[]";
  try {
    const cleaned = raw.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/\s*```$/i, "").trim();
    const arr = JSON.parse(cleaned);
    if (Array.isArray(arr)) return arr.slice(0, 5).map(String);
  } catch { /* fall through */ }
  return [];
}

function statusLabel(status: string | undefined): string {
  if (status === "normal") return "All values look normal";
  if (status === "amber")  return "One or two values to discuss with your doctor";
  if (status === "red")    return "Multiple values need medical attention";
  return "";
}

function statusColor(status: string | undefined): string {
  if (status === "normal") return "#16a34a";
  if (status === "amber")  return "#d97706";
  if (status === "red")    return "#dc2626";
  return "#64748b";
}

function statusBg(status: string | undefined): string {
  if (status === "normal") return "#f0fdf4";
  if (status === "amber")  return "#fffbeb";
  if (status === "red")    return "#fef2f2";
  return "#f8fafc";
}

function urgencyLabel(urgency: string | undefined): string {
  if (urgency === "routine") return "Routine follow-up";
  if (urgency === "soon")    return "Discuss with a doctor soon";
  if (urgency === "weeks")   return "Schedule an appointment within a few weeks";
  return "";
}

function buildHtml(body: SendEmailBody, questions: string[], date: string): string {
  const { overall_status, summary_headline, urgency, simple, specialist, flags = [] } = body;

  const flagRows = flags
    .filter((f) => f.status !== "normal")
    .map((f) => {
      const arrow = f.status === "high" ? "↑" : "↓";
      const color = f.status === "high" ? "#dc2626" : "#2563eb";
      return `<tr>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#374151;font-weight:600;">${f.marker}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:${color};font-weight:700;">${arrow} ${f.value} ${f.unit}</td>
        <td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;font-size:13px;color:#6b7280;">ref: ${f.reference}</td>
      </tr>`;
    })
    .join("");

  const questionItems = questions.length > 0
    ? questions.map((q, i) => `<li style="margin:0 0 10px;font-size:14px;color:#374151;line-height:1.6;">${i + 1}. ${q}</li>`).join("")
    : `<li style="color:#6b7280;font-size:14px;">Visit meridixlabs.com to generate your personalized questions.</li>`;

  const urgencyText = urgencyLabel(urgency);

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Your Meridix Labs Interpretation</title></head>
<body style="margin:0;padding:0;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f8fafc;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" style="max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr><td style="background:#1e3a5f;padding:28px 32px;">
          <p style="margin:0;font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Meridix Labs</p>
          <p style="margin:6px 0 0;font-size:13px;color:#93c5fd;">Your health, clearly explained</p>
        </td></tr>

        <!-- Overall assessment -->
        ${overall_status ? `
        <tr><td style="padding:24px 32px 0;">
          <div style="background:${statusBg(overall_status)};border:1.5px solid ${statusColor(overall_status)}30;border-radius:12px;padding:16px 20px;">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${statusColor(overall_status)};">Overall Assessment</p>
            <p style="margin:0 0 8px;font-size:15px;font-weight:700;color:${statusColor(overall_status)};">${statusLabel(overall_status)}</p>
            ${summary_headline ? `<p style="margin:0 0 ${urgencyText ? "10px" : "0"};font-size:14px;color:#374151;line-height:1.6;">${summary_headline}</p>` : ""}
            ${urgencyText ? `<p style="margin:0;font-size:13px;font-weight:600;color:${statusColor(overall_status)};">⏱ ${urgencyText}</p>` : ""}
          </div>
        </td></tr>` : ""}

        <!-- Flagged values -->
        ${flagRows ? `
        <tr><td style="padding:24px 32px 0;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Flagged Values</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #f1f5f9;border-radius:10px;overflow:hidden;">
            <tr style="background:#f8fafc;">
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Marker</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Result</th>
              <th style="padding:8px 12px;text-align:left;font-size:11px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.05em;">Reference</th>
            </tr>
            ${flagRows}
          </table>
        </td></tr>` : ""}

        <!-- Simple explanation -->
        <tr><td style="padding:24px 32px 0;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Plain-Language Explanation</p>
          <div style="background:#f8fafc;border-radius:10px;padding:16px 20px;">
            <p style="margin:0;font-size:14px;color:#374151;line-height:1.7;">${simple.replace(/\n/g, "<br>")}</p>
          </div>
        </td></tr>

        <!-- Specialist -->
        ${specialist ? `
        <tr><td style="padding:20px 32px 0;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Specialist Recommendation</p>
          <div style="background:#eff6ff;border-radius:10px;padding:16px 20px;border-left:3px solid #3b82f6;">
            <p style="margin:0;font-size:14px;color:#1e40af;line-height:1.6;">${specialist}</p>
          </div>
        </td></tr>` : ""}

        <!-- Doctor questions -->
        <tr><td style="padding:20px 32px 0;">
          <p style="margin:0 0 12px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94a3b8;">Questions to Bring to Your Doctor</p>
          <ul style="margin:0;padding:0 0 0 0;list-style:none;">
            ${questionItems}
          </ul>
        </td></tr>

        <!-- Divider -->
        <tr><td style="padding:24px 32px 0;"><hr style="border:none;border-top:1px solid #f1f5f9;margin:0;"></td></tr>

        <!-- Footer -->
        <tr><td style="padding:20px 32px 28px;">
          <p style="margin:0 0 8px;font-size:12px;color:#94a3b8;line-height:1.6;">
            This interpretation was generated by <strong>Meridix Labs</strong> — an educational tool. This is not medical advice. Always consult a qualified physician.
          </p>
          <p style="margin:0;font-size:12px;color:#94a3b8;">
            <a href="https://meridixlabs.com" style="color:#3b82f6;text-decoration:none;">meridixlabs.com</a> · Generated on ${date}
          </p>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export async function POST(request: NextRequest) {
  const _rl = await rateLimit(request, "email");
  if (_rl) return _rl;
  try {
    const body: SendEmailBody = await request.json();
    const { email, simple } = body;

    if (!email || !simple) {
      return NextResponse.json({ error: "Missing required fields." }, { status: 400 });
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: "Email service not configured." }, { status: 503 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const date = new Date().toLocaleDateString("en-US", {
      year: "numeric", month: "long", day: "numeric",
    });

    // Generate doctor questions server-side
    let questions: string[] = [];
    try {
      questions = await generateQuestions(body);
    } catch {
      // Non-fatal — email sends without questions
    }

    const html = buildHtml(body, questions, date);

    const { error } = await resend.emails.send({
      from:    "Meridix Labs <noreply@meridixlabs.com>",
      to:      [email],
      subject: `Your Meridix Labs interpretation — ${date}`,
      html,
    });

    if (error) {
      console.error("Resend error:", error);
      return NextResponse.json({ error: "Failed to send email. Please try again." }, { status: 500 });
    }

    return NextResponse.json({ success: true });

  } catch (err) {
    console.error("Send-email route error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
