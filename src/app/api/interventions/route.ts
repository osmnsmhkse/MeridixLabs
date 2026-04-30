// GET    /api/interventions          → list current user's interventions
// POST   /api/interventions          → create
// PATCH  /api/interventions?id=...   → update (mark ended, etc.)
// DELETE /api/interventions?id=...   → delete

import { NextRequest, NextResponse } from "next/server";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase";
import { ensureProfileForCurrentUser } from "@/lib/userProfile";

const KINDS = new Set(["diet","exercise","supplement","medication","lifestyle","other"]);

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
    const { data, error } = await sb
      .from("interventions").select("*").eq("user_id", user.id)
      .order("started_at", { ascending: false });
    if (error) throw error;
    return NextResponse.json({ interventions: data ?? [] });
  } catch (err) {
    return NextResponse.json({ error: "Something went wrong.", detail: describeError(err) }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    await ensureProfileForCurrentUser();

    const body = await request.json();
    const { kind, name, dose, notes, started_at, goal_id } = body ?? {};
    if (!kind || !KINDS.has(kind)) return NextResponse.json({ error: "Invalid kind." }, { status: 400 });
    if (!name?.trim()) return NextResponse.json({ error: "name required" }, { status: 400 });

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("interventions")
      .insert({
        user_id: user.id, kind, name: name.trim(),
        dose: dose ?? null, notes: notes ?? null,
        started_at: started_at ?? new Date().toISOString().slice(0, 10),
        goal_id: goal_id ?? null,
      })
      .select("*").single();
    if (error) throw error;
    return NextResponse.json({ intervention: data });
  } catch (err) {
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
    const allowed = ["name","dose","notes","ended_at","goal_id"];
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body ?? {})) if (allowed.includes(k)) patch[k] = v;
    if (!Object.keys(patch).length) return NextResponse.json({ error: "No valid fields." }, { status: 400 });

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("interventions").update(patch)
      .eq("id", id).eq("user_id", user.id).select("*").single();
    if (error) throw error;
    return NextResponse.json({ intervention: data });
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
    const { error } = await sb.from("interventions").delete().eq("id", id).eq("user_id", user.id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: "Something went wrong.", detail: describeError(err) }, { status: 500 });
  }
}
