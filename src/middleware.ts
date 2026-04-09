import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  if (!request.nextUrl.pathname.startsWith("/admin")) {
    return NextResponse.next();
  }

  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Basic ")) {
    const base64 = authHeader.slice(6);
    const decoded = Buffer.from(base64, "base64").toString("utf-8");
    const colonIdx = decoded.indexOf(":");
    const password = decoded.slice(colonIdx + 1);
    const adminPassword = process.env.ADMIN_PASSWORD;
    if (adminPassword && password === adminPassword) {
      return NextResponse.next();
    }
  }

  return new NextResponse(null, {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="Meridix Labs Admin", charset="UTF-8"',
    },
  });
}

export const config = {
  matcher: ["/admin/:path*"],
};
