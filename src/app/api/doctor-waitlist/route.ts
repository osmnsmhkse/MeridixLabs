import { NextRequest, NextResponse } from "next/server";
import { Resend } from "resend";
import { createClient } from "@supabase/supabase-js";

interface WaitlistEntry {
  id: string;
  name: string;
  email: string;
  practice_type: string;
  country: string;
  submitted_at: string;
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

    // Persist to Supabase
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );
    const { error: dbError } = await supabase.from("doctor_waitlist").insert({
      id: entry.id,
      name: entry.name,
      email: entry.email,
      practice_type: entry.practice_type,
      country: entry.country,
      submitted_at: entry.submitted_at,
    });
    if (dbError) {
      console.error("Failed to insert waitlist entry into Supabase:", dbError);
    }

    // Send both emails in parallel via Resend
    if (process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);

      const confirmationEmail = resend.emails.send({
        from: "Meridix Labs <noreply@meridixlabs.com>",
        to: [entry.email],
        subject: "You're on the Meridix for Doctors waitlist",
        html: `
          <div style="font-family:sans-serif;max-width:560px;margin:0 auto;padding:32px 24px;background:#0f172a;color:#e2e8f0;">
            <div style="margin-bottom:24px;">
              <span style="font-size:22px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">Meridix Labs</span>
            </div>
            <h1 style="margin:0 0 12px;font-size:26px;font-weight:800;color:#ffffff;line-height:1.2;">You're on the list, ${entry.name.split(" ")[0]}.</h1>
            <p style="margin:0 0 20px;font-size:16px;color:#94a3b8;line-height:1.6;">
              Thanks for your interest in <strong style="color:#e2e8f0;">Meridix for Doctors</strong>. We're building a smarter way for clinicians to share lab results with patients — clearly explained, in plain language, delivered instantly.
            </p>
            <div style="background:#1e293b;border:1px solid #334155;border-radius:12px;padding:20px 24px;margin-bottom:24px;">
              <p style="margin:0 0 12px;font-size:13px;font-weight:600;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;">What happens next</p>
              <ul style="margin:0;padding:0 0 0 20px;color:#cbd5e1;font-size:15px;line-height:1.8;">
                <li>We'll send you a <strong style="color:#e2e8f0;">personal invite</strong> when Meridix for Doctors launches.</li>
                <li>You'll receive <strong style="color:#e2e8f0;">early-bird pricing</strong> — locked in before public launch.</li>
                <li>Early access members get priority onboarding support.</li>
              </ul>
            </div>
            <div style="background:#1e3a5f;border-radius:10px;padding:16px 20px;margin-bottom:28px;">
              <p style="margin:0;font-size:14px;color:#93c5fd;line-height:1.5;">
                <strong style="color:#bfdbfe;">Your spot is confirmed.</strong> We registered your interest as a <em>${entry.practice_type}</em> practitioner in ${entry.country}. We'll be in touch soon.
              </p>
            </div>
            <p style="margin:0 0 6px;font-size:13px;color:#475569;">Questions? Reply to this email — we read every one.</p>
            <p style="margin:0;font-size:12px;color:#334155;">Meridix Labs · meridixlabs.com</p>
          </div>
        `,
      });

      const adminNotification = resend.emails.send({
        from: "Meridix Labs <noreply@meridixlabs.com>",
        to: ["osmanskose19@gmail.com"],
        subject: `[Waitlist] ${entry.name} — ${entry.practice_type}, ${entry.country}`,
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
            <p style="margin:16px 0 4px;font-size:13px;color:#64748b;">View all signups → <a href="https://supabase.com/dashboard/project/kncdtvjnfatevbsvgjtt/editor" style="color:#3b82f6;">Supabase Table Editor</a></p>
            <p style="margin:0;font-size:12px;color:#94a3b8;">Meridix Labs · meridixlabs.com</p>
          </div>
        `,
      });

      const [confirmResult, adminResult] = await Promise.allSettled([confirmationEmail, adminNotification]);
      if (confirmResult.status === "rejected") console.error("Confirmation email failed:", confirmResult.reason);
      if (adminResult.status === "rejected") console.error("Admin notification failed:", adminResult.reason);
    }

    return NextResponse.json({ success: true, id: entry.id });
  } catch (err) {
    console.error("doctor-waitlist error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
