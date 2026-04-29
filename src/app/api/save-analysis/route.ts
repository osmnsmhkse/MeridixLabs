// POST body: { analysis, flags, labs_raw, tier, summary, patient_context,
//               source_filename, report_date, health_score }
// Saves one lab analysis row for the current user.

import { NextRequest, NextResponse } from "next/server";
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
    console.error("save-analysis error:", err);
    return NextResponse.json({
      error: "Something went wrong.",
      detail: describeError(err),
      stack: err instanceof Error ? err.stack?.split("\n").slice(0, 5).join("\n") : undefined,
    }, { status: 500 });
  }
}

// Surface Supabase / plain-object errors as readable strings.
// Supabase errors are plain objects with { message, code, details, hint }
// and don't extend Error, so the default String(err) yields "[object Object]".
function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as { message?: string; code?: string; details?: string; hint?: string };
    const parts = [e.message, e.code && `code=${e.code}`, e.details, e.hint].filter(Boolean);
    if (parts.length) return parts.join(" | ");
    try { return JSON.stringify(err); } catch { return "Unknown error"; }
  }
  return String(err);
}
