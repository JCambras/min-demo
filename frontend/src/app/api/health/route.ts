import { NextResponse } from "next/server";
import { getDb, ensureSchema } from "@/lib/db";
import { getConnectionStatus } from "@/lib/sf-connection";

// GET /api/health — system health check for monitoring
export async function GET() {
  const checks: Record<string, { status: "ok" | "degraded" | "down"; latencyMs?: number; detail?: string }> = {};
  let overall: "ok" | "degraded" | "down" = "ok";

  // Check 1: Application is running (implicit — if this responds, app is up)
  checks.app = { status: "ok" };

  // Check 2: Turso database reachable
  try {
    const start = Date.now();
    await ensureSchema();
    const db = getDb();
    await db.execute({ sql: "SELECT 1", args: [] });
    checks.database = { status: "ok", latencyMs: Date.now() - start };
  } catch (err) {
    checks.database = { status: "down", detail: err instanceof Error ? err.message : "unreachable" };
    overall = "degraded";
  }

  // Check 3: Salesforce connection status
  try {
    const sfStatus = await getConnectionStatus();
    if (sfStatus.connected) {
      checks.salesforce = { status: "ok", detail: `source: ${sfStatus.source}` };
    } else {
      checks.salesforce = { status: "degraded", detail: "not connected" };
      if (overall === "ok") overall = "degraded";
    }
  } catch (err) {
    checks.salesforce = { status: "down", detail: err instanceof Error ? err.message : "error" };
    overall = "degraded";
  }

  const httpStatus = overall === "ok" ? 200 : overall === "degraded" ? 200 : 503;

  return NextResponse.json({
    status: overall,
    timestamp: new Date().toISOString(),
    checks,
  }, { status: httpStatus });
}
