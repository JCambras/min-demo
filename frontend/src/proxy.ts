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

// ─── Rate Limiting ──────────────────────────────────────────────────────────
// In-memory sliding window rate limiter per IP. Resets on server restart.
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;
const rateCounts = new Map<string, { count: number; resetAt: number }>();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = rateCounts.get(ip);
  if (!entry || now >= entry.resetAt) {
    rateCounts.set(ip, { count: 1, resetAt: now + RATE_LIMIT_WINDOW_MS });
    return true;
  }
  entry.count++;
  return entry.count <= RATE_LIMIT_MAX;
}

// Routes exempt from CSRF (OAuth callbacks, connection checks, PDF generation)
const CSRF_EXEMPT = new Set([
  "/api/salesforce/callback",   // OAuth redirect from Salesforce
  "/api/salesforce/connection", // GET only, but path-matched
  "/api/csrf",                  // Token issuer
  "/api/pdf/compliance",        // PDF generation (read-only, no state mutation)
  "/api/pdf/dashboard",         // PDF generation (read-only, no state mutation)
  "/api/pdf/operations",        // PDF generation (read-only, no state mutation)
  "/api/pdf",                   // PDF generation (read-only, no state mutation)
]);

export function proxy(request: NextRequest) {
  const { pathname, origin } = request.nextUrl;
  const method = request.method;

  // Only apply to API routes
  if (!pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  // ── Rate Limiting ──
  const clientIp = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (!checkRateLimit(clientIp)) {
    return NextResponse.json(
      { success: false, error: "Rate limit exceeded", errorCode: "RATE_LIMITED" },
      { status: 429, headers: { "Retry-After": "60" } },
    );
  }

  // ── Session Gate ──
  // Require a valid Salesforce connection (OAuth cookie or env credentials)
  // for all API routes except auth flow endpoints.
  const SESSION_EXEMPT = new Set([
    "/api/salesforce/auth",
    "/api/salesforce/callback",
    "/api/salesforce/connection",
    "/api/csrf",
    "/api/pdf",
    "/api/pdf/compliance",
    "/api/pdf/dashboard",
    "/api/pdf/operations",
    "/api/health",
  ]);

  if (!SESSION_EXEMPT.has(pathname)) {
    const sfCookie = request.cookies.get("min_sf_connection")?.value;
    const hasEnvCreds = !!(
      process.env.SALESFORCE_CLIENT_ID &&
      process.env.SALESFORCE_CLIENT_SECRET &&
      process.env.SALESFORCE_INSTANCE_URL
    );
    if (!sfCookie && !hasEnvCreds) {
      return NextResponse.json(
        { success: false, error: "Not authenticated", errorCode: "AUTH_REQUIRED" },
        { status: 401 },
      );
    }
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

  // HSTS — enforce HTTPS for 1 year including subdomains
  response.headers.set("Strict-Transport-Security", "max-age=31536000; includeSubDomains");

  // Permissions-Policy — disable browser features Min doesn't use
  response.headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=(), payment=()");

  // CSP — report-only mode initially to collect violations before enforcing
  response.headers.set(
    "Content-Security-Policy-Report-Only",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: blob:",
      "font-src 'self' data:",
      "connect-src 'self' *.salesforce.com *.force.com *.docusign.net",
      "frame-ancestors 'none'",
    ].join("; "),
  );

  // PDF responses should not be cached (contain sensitive client data)
  if (pathname.startsWith("/api/pdf/")) {
    response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
    response.headers.set("Pragma", "no-cache");
  }

  return response;
}

// ─── Matcher ────────────────────────────────────────────────────────────────
// Only run middleware on API routes — don't slow down page loads

export const config = {
  matcher: "/api/:path*",
};
