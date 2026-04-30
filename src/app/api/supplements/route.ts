// GET    /api/supplements          → user's current stack + AI suggestions
// POST   /api/supplements          → add to stack
// PATCH  /api/supplements?id=...   → update
// DELETE /api/supplements?id=...   → remove

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase";
import { ensureProfileForCurrentUser } from "@/lib/userProfile";
import { findSupplement, suggestSupplements } from "@/lib/supplements";
import { normalizeAnalyses, type Analysis } from "@/lib/dashboardData";

interface ProfileShape { medications?: string | null; conditions?: string | null; }

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as { message?: string; code?: string; details?: string; hint?: string };
    return [e.message, e.code && `code=${e.code}`, e.details, e.hint].filter(Boolean).join(" | ") || JSON.stringify(err);
  }
  return String(err);
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = supabaseServer();
    const [{ data: stack }, { data: profile }, { data: rows }] = await Promise.all([
      sb.from("user_supplements").select("*").eq("user_id", user.id).is("ended_at", null).order("started_at", { ascending: false }),
      sb.from("users_profile").select("medications, conditions").eq("user_id", user.id).maybeSingle(),
      sb.from("lab_analyses")
        .select("id, created_at, report_date, source_filename, tier, summary, flags, labs_raw, health_score")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(10),
    ]);

    const map = normalizeAnalyses((rows ?? []) as Analysis[]);
    const outOfRangeSlugs = new Set<string>();
    for (const s of map.values()) {
      if (s.latestZone === "out-of-range" || s.latestZone === "normal") outOfRangeSlugs.add(s.def.slug);
    }
    // Only suggest for actually out-of-range (or low for "lower-worse") markers
    const targetSlugs = new Set<string>();
    for (const s of map.values()) {
      if (s.latestZone === "out-of-range") targetSlugs.add(s.def.slug);
    }

    const prof = (profile ?? null) as ProfileShape | null;
    const suggestions = suggestSupplements({
      outOfRangeSlugs: targetSlugs,
      medsText: prof?.medications,
      conditionsText: prof?.conditions,
    });

    // Don't suggest things already in the stack
    const stackKeys = new Set((stack ?? []).map((s) => s.supplement_key));
    const filteredSuggestions = suggestions.filter((s) => !stackKeys.has(s.supplement.key));

    return NextResponse.json({
      stack: stack ?? [],
      suggestions: filteredSuggestions.slice(0, 8),
    });
  } catch (err) {
    console.error("supplements GET error:", err);
    return NextResponse.json({ error: "Something went wrong.", detail: describeError(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureProfileForCurrentUser();

    const body = await request.json();
    const { supplement_key, dose, reason, source } = body ?? {};
    if (!supplement_key) return NextResponse.json({ error: "supplement_key required" }, { status: 400 });

    const def = findSupplement(supplement_key);
    if (!def) return NextResponse.json({ error: "Unknown supplement" }, { status: 400 });

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("user_supplements")
      .insert({
        user_id: user.id,
        supplement_key, display_name: def.display,
        dose: dose ?? def.typicalDose, reason: reason ?? null,
        source: source === "ai-suggested" ? "ai-suggested" : "self",
      })
      .select("*").single();
    if (error) throw error;
    return NextResponse.json({ supplement: data });
  } catch (err) {
    console.error("supplements POST error:", err);
    return NextResponse.json({ error: "Something went wrong.", detail: describeError(err) }, { status: 500 });
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const url = new URL(request.url);
    const id = url.searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Missing id" }, { status: 400 });

    const body = await request.json();
    const allowed = ["dose","reason","ended_at"];
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body ?? {})) if (allowed.includes(k)) patch[k] = v;
    if (!Object.keys(patch).length) return NextResponse.json({ error: "No valid fields." }, { status: 400 });

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("user_supplements").update(patch)
      .eq("id", id).eq("user_id", user.id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ supplement: data });
  } catch (err) {
    return NextResponse.json({ error: "Something went wrong.", detail: describeError(err) }, { status: 500 });
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
    const { error } = await sb.from("user_supplements").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Something went wrong.", detail: describeError(err) }, { status: 500 });
  }
}
