// Clerk middleware — attaches auth context to requests when configured.
// All routes remain PUBLIC by default. The platform is fully usable
// without signing up; account-only pages/API routes check auth() inline.

import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { clerkMiddleware } from "@clerk/nextjs/server";

const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

const _clerk = CLERK_ENABLED ? clerkMiddleware() : null;

export default function middleware(req: NextRequest, event: Parameters<NonNullable<typeof _clerk>>[1]) {
  if (_clerk) return _clerk(req, event);
  return NextResponse.next();
}

export const config = {
  matcher: [
    // Match everything except Next internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
