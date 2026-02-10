import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { getStoredConnection } from "./sf-connection";

function hasEnvSalesforceCreds(): boolean {
  return !!(
    process.env.SALESFORCE_CLIENT_ID &&
    process.env.SALESFORCE_CLIENT_SECRET &&
    process.env.SALESFORCE_INSTANCE_URL
  );
}

export async function requireProtectedApiAccess(request: Request): Promise<NextResponse | null> {
  // CSRF hardening for browser requests that include an Origin header.
  const reqHeaders = await headers();
  const origin = reqHeaders.get("origin");
  if (origin) {
    const reqOrigin = new URL(request.url).origin;
    if (origin !== reqOrigin) {
      return NextResponse.json({ success: false, error: "Forbidden origin" }, { status: 403 });
    }
  }

  // Verify the cookie actually decrypts to a valid connection — not just that it exists.
  const stored = await getStoredConnection();
  if (stored) return null;

  // Keep local development flexible while blocking unauthenticated production access.
  if (process.env.NODE_ENV !== "production" && hasEnvSalesforceCreds()) {
    return null;
  }

  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}
