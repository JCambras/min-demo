import { NextResponse } from "next/server";
import { getConnectionStatus, clearConnection } from "@/lib/sf-connection";

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

// DELETE /api/salesforce/connection — disconnect OAuth
export async function DELETE() {
  try {
    await clearConnection();
    return NextResponse.json({ success: true, message: "Disconnected from Salesforce" });
  } catch (error) {
    console.error("Disconnect error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Disconnect failed" },
      { status: 500 }
    );
  }
}
