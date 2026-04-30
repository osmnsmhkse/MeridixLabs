// GET /api/user-analyses/[id] — fetch one analysis including full analysis JSON

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const { id } = await params;
    const sb = supabaseServer();
    const { data, error } = await sb
      .from("lab_analyses")
      .select("id, created_at, report_date, source_filename, tier, summary, flags, labs_raw, health_score, patient_context, analysis")
      .eq("id", id)
      .eq("user_id", user.id)
      .single();

    if (error) {
      if (error.code === "PGRST116") return NextResponse.json({ error: "Not found" }, { status: 404 });
      throw error;
    }
    return NextResponse.json({ analysis: data });
  } catch (err) {
    console.error("user-analyses/[id] GET error:", err);
    return NextResponse.json({ error: "Something went wrong." }, { status: 500 });
  }
}
