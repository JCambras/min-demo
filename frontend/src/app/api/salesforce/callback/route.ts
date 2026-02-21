import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { exchangeCodeForTokens, getAccessToken } from "@/lib/sf-connection";
import { writeAuthEvent } from "@/lib/audit";

// GET /api/salesforce/callback?code=xxx — OAuth callback from Salesforce
export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const code = url.searchParams.get("code");
    const error = url.searchParams.get("error");
    const errorDesc = url.searchParams.get("error_description");

    if (error) {
      // User denied access or other OAuth error
      return NextResponse.redirect(new URL(`/?sf_error=${encodeURIComponent(errorDesc || error)}`, url.origin));
    }

    if (!code) {
      return NextResponse.redirect(new URL("/?sf_error=no_code", url.origin));
    }

    // Get the domain we stored during auth initiation
    const cookieStore = await cookies();
    const domainCookie = cookieStore.get("min_sf_domain");
    const domain = domainCookie?.value;

    if (!domain) {
      return NextResponse.redirect(new URL("/?sf_error=session_expired", url.origin));
    }

    // Exchange the authorization code for tokens
    const conn = await exchangeCodeForTokens(code, domain);

    // Clean up the domain cookie
    cookieStore.delete("min_sf_domain");

    // Audit: log successful OAuth login
    try {
      const sfAuth = await getAccessToken();
      writeAuthEvent(sfAuth, "login", `OAuth login to ${conn.instanceUrl}`, {
        source: "oauth",
        orgId: conn.orgId || "unknown",
        userName: conn.userName || "unknown",
      });
    } catch { /* auth event logging is best-effort */ }

    // Redirect to home with success indicator
    return NextResponse.redirect(
      new URL(`/?sf_connected=true&sf_org=${encodeURIComponent(conn.instanceUrl)}`, url.origin)
    );
  } catch (error) {
    console.error("OAuth callback error:", error);
    // Audit: log failed login attempt (no SF context available)
    writeAuthEvent(null, "auth_failed", error instanceof Error ? error.message : "callback_failed");
    const url = new URL(request.url);
    return NextResponse.redirect(
      new URL(`/?sf_error=${encodeURIComponent(error instanceof Error ? error.message : "callback_failed")}`, url.origin)
    );
  }
}
