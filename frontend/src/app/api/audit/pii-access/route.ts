import { NextResponse } from "next/server";
import { writePIIAccessEvent } from "@/lib/audit";
import { getStoredConnection } from "@/lib/sf-connection";

// POST /api/audit/pii-access — log when a user reveals masked PII
//
// Called client-side when the "eye" icon is clicked to reveal an SSN,
// ID number, or bank account number. Fire-and-forget from the client.

const VALID_FIELDS = new Set(["ssn", "idNumber", "bankAcct"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { field, clientLabel } = body;

    if (!field || !VALID_FIELDS.has(field)) {
      return NextResponse.json(
        { success: false, error: "Invalid field" },
        { status: 400 },
      );
    }

    if (!clientLabel || typeof clientLabel !== "string" || clientLabel.length > 200) {
      return NextResponse.json(
        { success: false, error: "Valid clientLabel is required" },
        { status: 400 },
      );
    }

    // Get SF context if available (may be null if not connected)
    let sfCtx = null;
    try {
      const conn = await getStoredConnection();
      if (conn) {
        sfCtx = {
          accessToken: conn.accessToken,
          instanceUrl: conn.instanceUrl,
        };
      }
    } catch {
      // No SF context — still log to Turso
    }

    await writePIIAccessEvent(
      sfCtx,
      field as "ssn" | "idNumber" | "bankAcct",
      clientLabel,
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("PII access audit error:", error);
    return NextResponse.json(
      { success: false, error: "Audit logging failed" },
      { status: 500 },
    );
  }
}
