/**
 * Fire-and-forget analytics tracker.
 * Never throws, never blocks the UI.
 * No personal data is sent — only event type, timestamp, and anonymous metadata.
 */
export function track(event: string, props: Record<string, unknown> = {}): void {
  try {
    fetch("/api/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ event, timestamp: new Date().toISOString(), ...props }),
    }).catch(() => {/* silently ignore network errors */});
  } catch {
    // noop — analytics must never break the app
  }
}
