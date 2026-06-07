// DELETE /api/account
// Permanently deletes the signed-in user's account and ALL linked data.
//
// This is the mechanism the Privacy Policy / Terms promise ("delete your
// entire account and all linked data"). Deleting the users_profile row cascades
// (ON DELETE CASCADE) to lab_analyses, lab_chat_messages, symptom/diagnosis/
// practice sessions, health_goals, interventions, user_supplements, and
// analysis_shares. We then erase analytics rows + the Clerk mirror, and finally
// delete the Clerk account itself so the user is fully removed.

import { NextRequest, NextResponse } from "next/server";
import { currentUser, clerkClient } from "@clerk/nextjs/server";
import { supabaseServer, isAccountsEnabled } from "@/lib/supabase";
import { rateLimit } from "@/lib/ratelimit";
import { errorResponse } from "@/lib/apiError";

export async function DELETE(request: NextRequest) {
  const _rl = await rateLimit(request, "auth");
  if (_rl) return _rl;

  try {
    const user = await currentUser();
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    if (!isAccountsEnabled()) {
      return NextResponse.json({ error: "Accounts are not configured." }, { status: 503 });
    }

    const sb = supabaseServer();
    const userId = user.id;

    // 1) Delete the profile row → cascades all linked health data.
    const { error: profileErr } = await sb.from("users_profile").delete().eq("user_id", userId);
    if (profileErr) throw profileErr;

    // 2) Best-effort: erase analytics rows that carry the user id, and scrub
    //    PII from the signups mirror (keep the row's deleted_at for counting,
    //    but remove the email).
    await Promise.allSettled([
      sb.from("analytics_events").delete().eq("user_id", userId),
      sb.from("clerk_users").update({ deleted_at: new Date().toISOString(), email: null }).eq("id", userId),
    ]);

    // 3) Delete the Clerk account itself (fires the user.deleted webhook, which
    //    is idempotent with the steps above).
    try {
      const client = await clerkClient();
      await client.users.deleteUser(userId);
    } catch (e) {
      // Data is already deleted; surface a soft warning but still succeed.
      console.error("[account] Clerk user deletion failed (data already removed):", e);
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    return errorResponse("account-delete", err);
  }
}
