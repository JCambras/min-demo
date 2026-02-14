import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { CSRF_COOKIE_NAME, CSRF_HEADER_NAME } from "@/lib/csrf";

// ─── Next.js 16 Proxy (replaces middleware.ts) ───────────────────────────────
//
// Runs on every matched request before the route handler.
// Next.js 16: proxy.ts runs on Node.js runtime (NOT Edge).
//
//   1. CSRF validation on mutations (POST, PUT, DELETE) to /api/*
//   2. Origin header checking
//   3. Security headers on all responses
//
// @runtime nodejs
// See: https://nextjs.org/docs/app/api-reference/file-conventions/proxy

const MUTATION_METHODS = new Set(["POST", "PUT", "DELETE", "PATCH"]);

// Routes exempt from CSRF (OAuth callbacks, connection checks)
const CSRF_EXEMPT = new Set([
  "/api/salesforce/callback",   // OAuth redirect from Salesforce
  "/api/salesforce/connection", // GET only, but path-matched
  "/api/csrf",                  // Token issuer
]);

export function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  const method = request.method;

  // Only apply to API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ── Origin Check ──
  // Reject requests from different origins (prevents cross-site API abuse)
  const requestOrigin = request.headers.get("origin");
  if (requestOrigin && requestOrigin !== origin) {
    // Allow Salesforce OAuth callback redirects
    if (!pathname.startsWith("/api/salesforce/callback")) {
      return NextResponse.json(
        { success: false, error: "Cross-origin request blocked" },
        { status: 403 },
      );
    }
  }

  // ── CSRF Validation ──
  // Only on mutation methods, only on non-exempt routes
  if (MUTATION_METHODS.has(method) && !CSRF_EXEMPT.has(pathname)) {
    const cookieToken = request.cookies.get(CSRF_COOKIE_NAME)?.value;
    const headerToken = request.headers.get(CSRF_HEADER_NAME);

    if (!cookieToken || !headerToken || cookieToken !== headerToken) {
      return NextResponse.json(
        { success: false, error: "CSRF validation failed", errorCode: "CSRF_ERROR" },
        { status: 403 },
      );
    }
  }

  // ── Security Headers ──
  const response = NextResponse.next();

  // Prevent MIME type sniffing
  response.headers.set("X-Content-Type-Options", "nosniff");

  // Prevent clickjacking
  response.headers.set("X-Frame-Options", "DENY");

  // XSS protection (legacy browsers)
  response.headers.set("X-XSS-Protection", "1; mode=block");

  // Prevent referrer leakage
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");

  return response;
}

// ─── Matcher ────────────────────────────────────────────────────────────────
// Only run middleware on API routes — don't slow down page loads

export const config = {
  matcher: "/api/:path*",
};
