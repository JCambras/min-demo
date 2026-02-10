import { cookies, headers } from "next/headers";
import { NextResponse } from "next/server";

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

  const cookieStore = await cookies();
  const sfConn = cookieStore.get("min_sf_connection")?.value;
  if (sfConn) return null;

  // Keep local development flexible while blocking unauthenticated production access.
  if (process.env.NODE_ENV !== "production" && hasEnvSalesforceCreds()) {
    return null;
  }

  return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
}
