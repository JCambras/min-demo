import { NextResponse } from "next/server";
import { getConnectionStatus, clearConnection, revokeAndClearConnection, getAccessToken } from "@/lib/sf-connection";
import { writeAuthEvent } from "@/lib/audit";

// GET /api/salesforce/connection — current connection status
export async function GET() {
  try {
    const status = await getConnectionStatus();
    return NextResponse.json({ success: true, ...status });
  } catch (error) {
    console.error("Connection status error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Status check failed" },
      { status: 500 }
    );
  }
}

// DELETE /api/salesforce/connection — disconnect OAuth (revokes refresh token at Salesforce)
export async function DELETE() {
  try {
    // Capture auth context before clearing (for audit logging)
    let sfAuth = null;
    try { sfAuth = await getAccessToken(); } catch { /* may already be disconnected */ }
    await revokeAndClearConnection();
    writeAuthEvent(sfAuth, "logout_revoke", "OAuth disconnect with token revocation");
    return NextResponse.json({ success: true, message: "Disconnected from Salesforce" });
  } catch (error) {
    console.error("Disconnect error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Disconnect failed" },
      { status: 500 }
    );
  }
}

// POST /api/salesforce/connection — session logout (idle timeout)
// Clears the OAuth cookie without revoking the refresh token,
// so re-authenticating is fast but the browser session is dead.
export async function POST() {
  try {
    let sfAuth = null;
    try { sfAuth = await getAccessToken(); } catch { /* may already be disconnected */ }
    await clearConnection();
    writeAuthEvent(sfAuth, "logout", "Session cleared (idle timeout)");
    return NextResponse.json({ success: true, message: "Session cleared" });
  } catch (error) {
    console.error("Session logout error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Session logout failed" },
      { status: 500 }
    );
  }
}
