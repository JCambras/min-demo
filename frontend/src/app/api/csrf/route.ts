import { NextResponse } from "next/server";
import { generateCsrfToken, CSRF_COOKIE_NAME } from "@/lib/csrf";

// GET /api/csrf — get a CSRF token
// Sets the token as an httpOnly cookie AND returns it in the response body.
// The client stores the body value and sends it as X-CSRF-Token on mutations.
// The middleware compares the header value against the cookie value.

export async function GET() {
  const token = generateCsrfToken();

  const response = NextResponse.json({ token });

  response.cookies.set(CSRF_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    maxAge: 24 * 60 * 60, // 24 hours
    path: "/",
  });

  return response;
}
