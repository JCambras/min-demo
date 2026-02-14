// ─── CSRF Protection ────────────────────────────────────────────────────────
//
// Double-submit cookie pattern:
//   1. Server sets an httpOnly CSRF cookie on first request (via proxy)
//   2. Client reads the token from a /api/csrf endpoint
//   3. Client sends it back in X-CSRF-Token header on POST/PUT/DELETE
//   4. Server compares header value to cookie value
//
// Uses Web Crypto API (Edge-compatible, no Node crypto dependency).

export const CSRF_COOKIE_NAME = "min_csrf_token";
export const CSRF_HEADER_NAME = "x-csrf-token";

/**
 * Generate a cryptographically random CSRF token.
 * Uses Web Crypto API — works in Edge Runtime.
 */
export function generateCsrfToken(): string {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, b => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Validate that the header token matches the cookie token.
 * Simple constant-time-ish comparison (Edge doesn't have timingSafeEqual).
 */
export function validateCsrfToken(cookieToken: string | undefined, headerToken: string | undefined): boolean {
  if (!cookieToken || !headerToken) return false;
  if (cookieToken.length !== headerToken.length) return false;
  let mismatch = 0;
  for (let i = 0; i < cookieToken.length; i++) {
    mismatch |= cookieToken.charCodeAt(i) ^ headerToken.charCodeAt(i);
  }
  return mismatch === 0;
}
