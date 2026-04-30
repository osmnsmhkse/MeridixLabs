// GET    /api/goals          → list current user's goals (newest first)
// POST   /api/goals          → create goal
// PATCH  /api/goals?id=...   → update fields (status, target, notes)
// DELETE /api/goals?id=...   → delete

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase";
import { ensureProfileForCurrentUser } from "@/lib/userProfile";
import { bySlug } from "@/lib/biomarkers";
import { normalizeAnalyses, type Analysis } from "@/lib/dashboardData";

const ALLOWED_PATCH = new Set([
  "marker_slug","marker_label","direction","target_value","target_unit",
  "target_date","status","baseline_value","baseline_date","notes","achieved_at",
]);

function describeError(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    const e = err as { message?: string; code?: string; details?: string; hint?: string };
    const parts = [e.message, e.code && `code=${e.code}`, e.details, e.hint].filter(Boolean);
    return parts.join(" | ") || JSON.stringify(err);
  }
  return String(err);
}

export async function GET() {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("health_goals")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });
    if (error) throw error;

    // Compute progress for each goal from latest reading
    const { data: rows } = await sb
      .from("lab_analyses")
      .select("id, created_at, report_date, source_filename, tier, summary, flags, labs_raw, health_score")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    const map = normalizeAnalyses((rows ?? []) as Analysis[]);

    const goals = (data ?? []).map((g) => {
      const series = map.get(g.marker_slug);
      const latest = series?.latest;
      let progressPct: number | null = null;
      if (latest && g.target_value != null && g.baseline_value != null && g.baseline_value !== g.target_value) {
        const total = g.target_value - g.baseline_value;
        const done  = latest.value - g.baseline_value;
        progressPct = Math.max(0, Math.min(100, Math.round((done / total) * 100)));
      }
      return {
        ...g,
        latest_value: latest?.value ?? null,
        latest_date: latest?.date ?? null,
        progress_pct: progressPct,
      };
    });

    // Also fetch interventions linked to these goals
    const { data: interventions } = await sb
      .from("interventions")
      .select("*")
      .eq("user_id", user.id)
      .order("started_at", { ascending: false });

    return NextResponse.json({ goals, interventions: interventions ?? [] });
  } catch (err) {
    console.error("goals GET error:", err);
    return NextResponse.json({ error: "Something went wrong.", detail: describeError(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureProfileForCurrentUser();

    const body = await request.json();
    const { marker_slug, direction, target_value, target_unit, target_date, notes } = body ?? {};
    if (!marker_slug) return NextResponse.json({ error: "marker_slug required" }, { status: 400 });
    if (!direction || !["decrease","increase","reach-range"].includes(direction)) {
      return NextResponse.json({ error: "direction must be decrease|increase|reach-range" }, { status: 400 });
    }

    const def = bySlug(marker_slug);
    const marker_label = def?.canonical ?? marker_slug;

    // Snapshot current value as baseline if available
    const sb = supabaseServer();
    const { data: rows } = await sb
      .from("lab_analyses")
      .select("id, created_at, report_date, labs_raw")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(20);
    const map = normalizeAnalyses((rows ?? []) as Analysis[]);
    const series = map.get(marker_slug);
    const baseline_value = series?.latest.value ?? null;
    const baseline_date  = series?.latest.date?.slice(0, 10) ?? null;

    const { data, error } = await sb
      .from("health_goals")
      .insert({
        user_id: user.id,
        marker_slug,
        marker_label,
        direction,
        target_value: target_value != null ? Number(target_value) : null,
        target_unit: target_unit ?? def?.unit ?? null,
        target_date: target_date ?? null,
        notes: notes ?? null,
        baseline_value,
        baseline_date,
      })
      .select("*")
      .single();
    if (error) throw error;

    return NextResponse.json({ goal: data });
  } catch (err) {
    console.error("goals POST error:", err);
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
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body ?? {})) {
      if (ALLOWED_PATCH.has(k)) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields." }, { status: 400 });
    }

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("health_goals")
      .update(patch)
      .eq("id", id)
      .eq("user_id", user.id)
      .select("*")
      .single();
    if (error) throw error;
    return NextResponse.json({ goal: data });
  } catch (err) {
    console.error("goals PATCH error:", err);
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
    const { error } = await sb.from("health_goals").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("goals DELETE error:", err);
    return NextResponse.json({ error: "Something went wrong.", detail: describeError(err) }, { status: 500 });
  }
}
