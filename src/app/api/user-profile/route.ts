// GET/PATCH the current user's profile row.
// All requests require a signed-in Clerk user.

import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiError";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase";
import { ensureProfileForCurrentUser } from "@/lib/userProfile";

export async function GET() {
  try {
    const profile = await ensureProfileForCurrentUser();
    if (!profile) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    return NextResponse.json({ profile });
  } catch (err) {
    return errorResponse("user-profile", err);
  }
}

const ALLOWED = new Set([
  "display_name", "age", "sex", "medications", "allergies",
  "weight_kg", "height_cm", "ethnicity", "fasting_default",
  "conditions", "family_history", "lifestyle_notes", "profile_depth",
]);

export async function PATCH(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await request.json();
    const patch: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body ?? {})) {
      if (ALLOWED.has(k)) patch[k] = v;
    }
    if (Object.keys(patch).length === 0) {
      return NextResponse.json({ error: "No valid fields." }, { status: 400 });
    }

    // Ensure row exists
    await ensureProfileForCurrentUser();

    const sb = supabaseServer();
    const { data, error } = await sb
      .from("users_profile")
      .update(patch)
      .eq("user_id", user.id)
      .select("*")
      .single();

    if (error) throw error;
    return NextResponse.json({ profile: data });
  } catch (err) {
    return errorResponse("user-profile", err);
  }
}
