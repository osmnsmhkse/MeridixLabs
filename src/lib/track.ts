/**
 * Fire-and-forget analytics tracker.
 * Never throws, never blocks the UI.
 * No personal data is sent — only event type, an anonymous per-browser id,
 * a timestamp, and anonymous metadata.
 */

const ANON_KEY = "meridix_anon_id";

/**
 * A stable, random per-browser id used to count unique visitors.
 * Persisted in localStorage; contains no personal data. Returns "" when
 * localStorage is unavailable (SSR / privacy mode), in which case the event
 * is still recorded, just without a visitor id.
 */
export function getAnonId(): string {
  try {
    if (typeof window === "undefined") return "";
    let id = window.localStorage.getItem(ANON_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `a_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
      window.localStorage.setItem(ANON_KEY, id);
    }
    return id;
  } catch {
    return "";
  }
}

export function track(event: string, props: Record<string, unknown> = {}): void {
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        event,
        timestamp: new Date().toISOString(),
        anonId: getAnonId(),
        ...props,
      }),
    }).catch(() => {/* silently ignore network errors */});
  } catch {
    // noop — analytics must never break the app
  }
}
