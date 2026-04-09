import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { promises as fs } from "fs";
import path from "path";

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  practice_type: string;
  country: string;
  submitted_at: string;
}

const DATA_FILE = path.join(process.cwd(), "data", "doctor-waitlist.json");

async function readWaitlist(): Promise<WaitlistEntry[]> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return JSON.parse(raw) as WaitlistEntry[];
  } catch {
    return [];
  }
}

async function appendToWaitlist(entry: WaitlistEntry): Promise<void> {
  const dir = path.dirname(DATA_FILE);
  try { await fs.mkdir(dir, { recursive: true }); } catch { /* already exists */ }
  const entries = await readWaitlist();
  entries.push(entry);
  await fs.writeFile(DATA_FILE, JSON.stringify(entries, null, 2), "utf-8");
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, practice_type, country } = body as {
      name: string;
      email: string;
      practice_type: string;
      country: string;
    };

    if (!name?.trim() || !email?.trim() || !practice_type?.trim() || !country?.trim()) {
      return NextResponse.json({ error: "All fields are required." }, { status: 400 });
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json({ error: "Invalid email address." }, { status: 400 });
    }

    const entry: WaitlistEntry = {
      id: `wl_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      practice_type: practice_type.trim(),
      country: country.trim(),
      submitted_at: new Date().toISOString(),
    };

    // Persist to JSON file
    try {
      await appendToWaitlist(entry);
    } catch (fileErr) {
      console.error("Failed to write waitlist file:", fileErr);
      // Non-fatal on serverless — file writes may not persist, email is the source of truth
    }

    // Send notification email via Resend (if configured)
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        await resend.emails.send({
          from: "Meridix Labs <noreply@meridixlabs.com>",
          to: ["osmansemihkose@gmail.com"],
          subject: `New doctor waitlist signup — ${name} (${practice_type})`,
          html: `
            <div style="font-family:sans-serif;max-width:500px;margin:0 auto;padding:24px;">
              <h2 style="margin:0 0 16px;color:#1e3a5f;">New Doctor Waitlist Entry</h2>
              <table style="width:100%;border-collapse:collapse;">
                <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;color:#374151;width:140px;">Name</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#374151;">${entry.name}</td></tr>
                <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;color:#374151;">Email</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#374151;">${entry.email}</td></tr>
                <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;color:#374151;">Practice</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#374151;">${entry.practice_type}</td></tr>
                <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;color:#374151;">Country</td><td style="padding:8px 12px;border-bottom:1px solid #f1f5f9;color:#374151;">${entry.country}</td></tr>
                <tr><td style="padding:8px 12px;background:#f8fafc;font-weight:600;color:#374151;">Submitted</td><td style="padding:8px 12px;color:#374151;">${new Date(entry.submitted_at).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" })}</td></tr>
              </table>
              <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">Meridix Labs · meridixlabs.com</p>
            </div>
          `,
        });
      } catch (emailErr) {
        console.error("Failed to send waitlist notification email:", emailErr);
        // Non-fatal — entry is already saved
      }
    }

    return NextResponse.json({ success: true, id: entry.id });
  } catch (err) {
    console.error("doctor-waitlist error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
