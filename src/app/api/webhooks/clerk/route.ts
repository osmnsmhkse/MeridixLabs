import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { isAccountsEnabled, supabaseServer } from "@/lib/supabase";

// Clerk webhook receiver. Mirrors account lifecycle into Supabase so the
// admin dashboard can show total sign-ups (including dormant accounts that
// never fire a product event).
//
// Set CLERK_WEBHOOK_SIGNING_SECRET (the "whsec_..." value Clerk shows when
// you create the endpoint). Requests are verified with the Svix scheme.

const TOLERANCE_MS = 5 * 60 * 1000; // reject timestamps older than 5 minutes

/** Verify a Svix-signed webhook (the scheme Clerk uses). */
function verifySignature(
  secret: string,
  svixId: string | null,
  svixTimestamp: string | null,
  svixSignature: string | null,
  body: string,
): boolean {
  if (!svixId || !svixTimestamp || !svixSignature) return false;

  // Replay protection
  const tsSec = Number(svixTimestamp);
  if (!Number.isFinite(tsSec)) return false;
  if (Math.abs(Date.now() - tsSec * 1000) > TOLERANCE_MS) return false;

  // Secret is "whsec_<base64>"; the signing key is the base64 part decoded.
  const key = Buffer.from(secret.replace(/^whsec_/, ""), "base64");
  const signedContent = `${svixId}.${svixTimestamp}.${body}`;
  const expected = crypto.createHmac("sha256", key).update(signedContent).digest("base64");

  // Header is space-separated "v1,<sig> v1,<sig>" — match any.
  const expectedBuf = Buffer.from(expected);
  return svixSignature.split(" ").some((part) => {
    const sig = part.split(",")[1];
    if (!sig) return false;
    const sigBuf = Buffer.from(sig);
    return sigBuf.length === expectedBuf.length && crypto.timingSafeEqual(sigBuf, expectedBuf);
  });
}

interface ClerkUserEvent {
  type: string;
  data: {
    id: string;
    created_at?: number; // epoch ms
    email_addresses?: { id: string; email_address: string }[];
    primary_email_address_id?: string | null;
  };
}

function primaryEmail(data: ClerkUserEvent["data"]): string | null {
  const list = data.email_addresses ?? [];
  if (list.length === 0) return null;
  const primary = list.find((e) => e.id === data.primary_email_address_id);
  return (primary ?? list[0]).email_address ?? null;
}

export async function POST(request: NextRequest) {
  const secret = process.env.CLERK_WEBHOOK_SIGNING_SECRET;
  if (!secret) {
    console.error("[clerk-webhook] CLERK_WEBHOOK_SIGNING_SECRET not configured");
    return NextResponse.json({ error: "Webhook not configured" }, { status: 500 });
  }

  // Raw body is required for signature verification.
  const body = await request.text();
  const ok = verifySignature(
    secret,
    request.headers.get("svix-id"),
    request.headers.get("svix-timestamp"),
    request.headers.get("svix-signature"),
    body,
  );
  if (!ok) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let evt: ClerkUserEvent;
  try {
    evt = JSON.parse(body) as ClerkUserEvent;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!isAccountsEnabled()) {
    // Nothing to persist to; acknowledge so Clerk doesn't retry forever.
    return NextResponse.json({ ok: true, skipped: "accounts disabled" });
  }

  try {
    const supabase = supabaseServer();
    const { id } = evt.data;

    if (evt.type === "user.created" || evt.type === "user.updated") {
      const created = evt.data.created_at ? new Date(evt.data.created_at).toISOString() : new Date().toISOString();
      const { error } = await supabase.from("clerk_users").upsert(
        {
          id,
          email: primaryEmail(evt.data),
          created_at: created,
          deleted_at: null,
        },
        { onConflict: "id" },
      );
      if (error) console.error("[clerk-webhook] upsert failed:", error);
    } else if (evt.type === "user.deleted") {
      // Erase the user's data (GDPR/KVKK right to erasure). Deleting the
      // profile row cascades to all linked health tables. We keep the
      // clerk_users row (for the signups metric) but scrub its email and
      // stamp deleted_at. Also drop analytics rows that carry the user id.
      const [profileRes, mirrorRes] = await Promise.all([
        supabase.from("users_profile").delete().eq("user_id", id),
        supabase
          .from("clerk_users")
          .update({ deleted_at: new Date().toISOString(), email: null })
          .eq("id", id),
      ]);
      if (profileRes.error) console.error("[clerk-webhook] profile erase failed:", profileRes.error);
      if (mirrorRes.error) console.error("[clerk-webhook] mirror scrub failed:", mirrorRes.error);
      await supabase.from("analytics_events").delete().eq("user_id", id);
    }
    // Other event types are acknowledged and ignored.
  } catch (err) {
    console.error("[clerk-webhook] handler threw:", err);
    // Acknowledge to avoid infinite retries; the error is logged.
  }

  return NextResponse.json({ ok: true });
}
