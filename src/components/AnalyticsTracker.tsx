"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

/**
 * Fires a `page_view` event on every route change. The /api/track route
 * stamps the Clerk user id (when signed in) and the anonymous visitor id
 * server-side, so this also powers the unique-visitor and active-signed-in
 * user counts on the admin dashboard.
 *
 * Rendered once, globally, from Providers. Renders nothing.
 */
export default function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    if (!pathname) return;
    // Don't double-count the same path (e.g. query-only changes / re-renders).
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;

    // Skip admin pages so internal dashboard visits don't pollute metrics.
    if (pathname.startsWith("/admin")) return;

    track("page_view", { page: pathname });
  }, [pathname]);

  return null;
}
