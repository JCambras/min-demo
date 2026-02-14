import { NextResponse } from "next/server";
import { buildAuthUrl } from "@/lib/sf-connection";

// POST /api/salesforce/auth — initiate OAuth flow
// Body: { domain: "myorg.my.salesforce.com" }
export async function POST(request: Request) {
  try {
    const { domain } = await request.json();
    if (!domain) {
      return NextResponse.json({ success: false, error: "Salesforce domain is required" }, { status: 400 });
    }

    // Store domain in a short-lived cookie so callback knows where to exchange
    const authUrl = buildAuthUrl(domain);
    const response = NextResponse.json({ success: true, authUrl });

    // Set domain cookie for the callback to use
    response.cookies.set("min_sf_domain", domain, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 600, // 10 minutes — just long enough for the OAuth dance
      path: "/",
    });

    return response;
  } catch (error) {
    console.error("Auth initiation error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to initiate auth" },
      { status: 500 }
    );
  }
}
