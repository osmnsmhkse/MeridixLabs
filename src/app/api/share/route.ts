// POST /api/share              → create a share token for an analysis
//   Body: { analysis_id, expires_days? (default 30) }
// DELETE /api/share?token=...   → revoke
// GET    /api/share?token=...   → public read of a shared analysis (no auth)

import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiError";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase";
import { randomBytes } from "crypto";

function genToken(): string {
  return randomBytes(18).toString("base64url");
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const { analysis_id, expires_days } = body ?? {};
    if (!analysis_id) return NextResponse.json({ error: "analysis_id required" }, { status: 400 });

    const sb = supabaseServer();

    // Confirm the analysis belongs to this user
    const { data: own } = await sb
      .from("lab_analyses").select("id").eq("id", analysis_id).eq("user_id", user.id).maybeSingle();
    if (!own) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });

    const days = Math.max(1, Math.min(365, Number(expires_days) || 30));
    const expires_at = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString();
    const token = genToken();

    const { data, error } = await sb
      .from("analysis_shares")
      .insert({ token, analysis_id, user_id: user.id, expires_at })
      .select("*").single();
    if (error) throw error;
    return NextResponse.json({ share: data });
  } catch (err) {
    return errorResponse("share", err);
  }
}

export async function GET(request: NextRequest) {
  try {
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const sb = supabaseServer();
    const { data: share } = await sb
      .from("analysis_shares").select("*").eq("token", token).maybeSingle();
    if (!share) return NextResponse.json({ error: "Not found." }, { status: 404 });
    if (share.expires_at && new Date(share.expires_at).getTime() < Date.now()) {
      return NextResponse.json({ error: "Link expired." }, { status: 410 });
    }

    const { data: analysis } = await sb
      .from("lab_analyses")
      .select("id, created_at, report_date, source_filename, tier, summary, flags, labs_raw, health_score, patient_context")
      .eq("id", share.analysis_id).maybeSingle();
    if (!analysis) return NextResponse.json({ error: "Analysis not found." }, { status: 404 });

    // Best-effort view-count bump (don't fail the request if this errors)
    sb.from("analysis_shares")
      .update({ view_count: (share.view_count ?? 0) + 1, last_viewed_at: new Date().toISOString() })
      .eq("token", token).then(() => undefined, () => undefined);

    // Fetch a display name (no email) for the report header
    const { data: profile } = await sb
      .from("users_profile").select("display_name").eq("user_id", share.user_id).maybeSingle();

    return NextResponse.json({
      analysis,
      sharedBy: profile?.display_name ?? "A Meridix Labs user",
      expiresAt: share.expires_at,
    });
  } catch (err) {
    return errorResponse("share", err);
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(request.url);
    const token = url.searchParams.get("token");
    if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

    const sb = supabaseServer();
    const { error } = await sb.from("analysis_shares").delete().eq("token", token).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse("share", err);
  }
}
