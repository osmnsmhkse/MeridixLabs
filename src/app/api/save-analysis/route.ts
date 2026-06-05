// POST body: { analysis, flags, labs_raw, tier, summary, patient_context,
//               source_filename, report_date, health_score }
// Saves one lab analysis row for the current user.

import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiError";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase";
import { ensureProfileForCurrentUser } from "@/lib/userProfile";

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    await ensureProfileForCurrentUser();

    const body = await request.json();
    const {
      analysis,
      flags = null,
      labs_raw = null,
      tier = null,
      summary = null,
      patient_context = null,
      source_filename = null,
      report_date = null,
      health_score = null,
    } = body ?? {};

    if (!analysis) {
      return NextResponse.json({ error: "Missing analysis." }, { status: 400 });
    }

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("lab_analyses")
      .insert({
        user_id: user.id,
        analysis,
        flags,
        labs_raw,
        tier,
        summary,
        patient_context,
        source_filename,
        report_date,
        health_score,
      })
      .select("id, created_at")
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, id: data.id, created_at: data.created_at });
  } catch (err) {
    return errorResponse("save-analysis", err);
  }
}

// Surface Supabase / plain-object errors as readable strings.
// Supabase errors are plain objects with { message, code, details, hint }
// and don't extend Error, so the default String(err) yields "[object Object]".

