import { NextResponse } from "next/server";

// Production must NOT leak internal error detail (DB messages, column names,
// stack traces) to clients. This helper ALWAYS logs the full error server-side
// and returns a generic message in production; `detail` is included only in
// development to preserve local debuggability.

const IS_DEV = process.env.NODE_ENV !== "production";

function describe(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (err && typeof err === "object") {
    // Supabase errors are plain objects { message, code, details, hint }.
    const e = err as { message?: string; code?: string; details?: string; hint?: string };
    const parts = [e.message, e.code && `code=${e.code}`, e.details, e.hint].filter(Boolean);
    if (parts.length) return parts.join(" | ");
    try {
      return JSON.stringify(err);
    } catch {
      return "Unknown error";
    }
  }
  return String(err);
}

/** Log the error and return a generic 500 (with detail only in dev). */
export function errorResponse(context: string, err: unknown, status = 500): NextResponse {
  // eslint-disable-next-line no-console
  console.error(`[${context}]`, err);
  const body: { error: string; detail?: string } = { error: "Something went wrong." };
  if (IS_DEV) body.detail = describe(err);
  return NextResponse.json(body, { status });
}
