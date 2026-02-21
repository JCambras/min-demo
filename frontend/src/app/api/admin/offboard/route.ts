import { NextResponse } from "next/server";
import { getDb, ensureSchema } from "@/lib/db";

// DELETE /api/admin/offboard — purge all Turso data for an org_id
//
// Used during customer offboarding to comply with data deletion requirements.
// Deletes from: daily_snapshots, org_patterns, events, audit_log.
// Salesforce audit records remain in the customer's org (customer-controlled).

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    const orgId = body.orgId;

    if (!orgId || typeof orgId !== "string" || orgId.length > 100) {
      return NextResponse.json(
        { success: false, error: "Valid orgId is required" },
        { status: 400 },
      );
    }

    await ensureSchema();
    const db = getDb();

    // Delete from all tables that store org-specific data
    const results = await db.batch([
      { sql: "DELETE FROM daily_snapshots WHERE org_id = ?", args: [orgId] },
      { sql: "DELETE FROM org_patterns WHERE org_id = ?", args: [orgId] },
      { sql: "DELETE FROM events WHERE org_id = ?", args: [orgId] },
      { sql: "DELETE FROM audit_log WHERE org_id = ?", args: [orgId] },
    ]);

    const deleted = {
      daily_snapshots: results[0].rowsAffected,
      org_patterns: results[1].rowsAffected,
      events: results[2].rowsAffected,
      audit_log: results[3].rowsAffected,
    };

    const totalDeleted = Object.values(deleted).reduce((a, b) => a + b, 0);

    return NextResponse.json({
      success: true,
      orgId,
      deleted,
      totalDeleted,
      message: `Purged ${totalDeleted} records for org ${orgId}`,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Offboard error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Offboard failed" },
      { status: 500 },
    );
  }
}
