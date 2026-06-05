import { NextRequest, NextResponse } from "next/server";
import { isAccountsEnabled, supabaseServer } from "@/lib/supabase";
import { isAdminAuthorized } from "@/lib/adminAuth";
import { rateLimit } from "@/lib/ratelimit";

interface FeedbackRow {
  id: string;
  rating: number;
  category: string | null;
  message: string | null;
  email: string | null;
  page: string | null;
  user_agent: string | null;
  received_at: string;
}

export async function GET(request: NextRequest) {
  // Throttle brute-force attempts on the shared admin password.
  const _rl = await rateLimit(request, "auth");
  if (_rl) return _rl;

  if (!isAdminAuthorized(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  if (!isAccountsEnabled()) {
    return NextResponse.json(
      { error: "Supabase is not configured — feedback is not being stored." },
      { status: 503 }
    );
  }

  const { data, error } = await supabaseServer()
    .from("feedback")
    .select("id, rating, category, message, email, page, user_agent, received_at")
    .order("received_at", { ascending: false })
    .limit(1000);

  if (error) {
    console.error("[admin/feedback] query failed:", error);
    return NextResponse.json({ error: "Failed to load feedback." }, { status: 500 });
  }

  const rows = (data ?? []) as FeedbackRow[];

  // ── Summary stats ──────────────────────────────────────────────────
  const total = rows.length;
  const avgRating =
    total > 0 ? Math.round((rows.reduce((s, r) => s + r.rating, 0) / total) * 10) / 10 : 0;

  const ratingCounts: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const categoryCounts: Record<string, number> = {};
  let withMessage = 0;
  let withEmail = 0;

  for (const r of rows) {
    ratingCounts[r.rating] = (ratingCounts[r.rating] ?? 0) + 1;
    const cat = r.category || "General";
    categoryCounts[cat] = (categoryCounts[cat] ?? 0) + 1;
    if (r.message?.trim()) withMessage++;
    if (r.email?.trim()) withEmail++;
  }

  return NextResponse.json({
    summary: { total, avgRating, ratingCounts, categoryCounts, withMessage, withEmail },
    entries: rows,
    generatedAt: new Date().toISOString(),
  });
}
