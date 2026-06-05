// GET /api/lab-chat-history?analysisId=<uuid>
// Returns persisted chat messages for a specific lab analysis owned by the
// currently signed-in user. Anonymous users keep history client-side in
// localStorage and never call this route.

import { NextRequest, NextResponse } from "next/server";
import { errorResponse } from "@/lib/apiError";
import { currentUser } from "@clerk/nextjs/server";
import { supabaseServer } from "@/lib/supabase";

export async function GET(request: NextRequest) {
  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const url = new URL(request.url);
    const analysisId = url.searchParams.get("analysisId");
    if (!analysisId) {
      return NextResponse.json({ error: "Missing analysisId" }, { status: 400 });
    }

    const sb = supabaseServer();

    // Confirm the analysis belongs to this user before returning any messages.
    const { data: analysis, error: aErr } = await sb
      .from("lab_analyses")
      .select("id")
      .eq("id", analysisId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (aErr) throw aErr;
    if (!analysis) return NextResponse.json({ messages: [] });

    const { data, error } = await sb
      .from("lab_chat_messages")
      .select("role, content, created_at")
      .eq("analysis_id", analysisId)
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });

    if (error) throw error;

    return NextResponse.json({
      messages: (data ?? []).map((m) => ({ role: m.role, content: m.content })),
    });
  } catch (err) {
    return errorResponse("lab-chat-history", err);
  }
}
