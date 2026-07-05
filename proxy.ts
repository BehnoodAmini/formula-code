import { NextResponse, type NextRequest } from "next/server";

/**
 * Next 16 request boundary (successor to middleware.ts).
 * Kept deliberately thin: security headers only. Rate limiting for the two
 * API endpoints lives in the route handlers themselves, where Node state
 * is straightforward.
 */
export default function proxy(_req: NextRequest) {
  const res = NextResponse.next();
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()",
  );
  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
