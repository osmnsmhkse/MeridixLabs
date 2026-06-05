// Shared input-size caps for user-pasted content sent to the AI.
// Uncapped input length is a direct token-cost / abuse risk (the rate limiter
// bounds requests-per-window; these bound cost-per-request). Values are
// deliberately generous for real medical use but block pathological payloads.

export const MAX_MESSAGE_CHARS = 8_000; // a single chat turn
export const MAX_MESSAGES = 24; // turns kept from a conversation
export const MAX_TOOL_CONTEXT_CHARS = 16_000; // serialized on-screen results
export const MAX_FREETEXT_CHARS = 6_000; // a pasted symptom/condition/report field

/** Truncate a string to `max` characters (safe for null/non-string input). */
export function capText(value: unknown, max: number): string {
  if (typeof value !== "string") return "";
  return value.length > max ? value.slice(0, max) : value;
}
