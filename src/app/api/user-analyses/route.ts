// GET  /api/user-analyses          → list current user's lab analyses (newest first)
// DELETE /api/user-analyses?id=... → delete one

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "50", 10) || 50, 200);

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("lab_analyses")
      .select("id, created_at, report_date, source_filename, tier, summary, flags, labs_raw, health_score, patient_context")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({ analyses: data ?? [] });
  } catch (err) {
    console.error("user-analyses GET error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await request.json().catch(() => ({}));
    const allowed: Record<string, unknown> = {};
    if (typeof body.source_filename === "string") allowed.source_filename = body.source_filename.trim() || null;
    if (typeof body.report_date === "string") allowed.report_date = body.report_date || null;

    if (Object.keys(allowed).length === 0) return NextResponse.json({ error: "Nothing to update" }, { status: 400 });

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("lab_analyses")
      .update(allowed)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("id, source_filename, report_date")
      .single();

    if (error) throw error;
    return NextResponse.json({ analysis: data });
  } catch (err) {
    console.error("user-analyses PATCH error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const sb = supabaseServer();
    const { error } = await sb
      .from("lab_analyses")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("user-analyses DELETE error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
