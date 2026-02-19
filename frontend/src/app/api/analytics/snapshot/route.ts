import { NextRequest, NextResponse } from "next/server";
import { getDb, ensureSchema } from "@/lib/db";
import { sanitizeStatsForAnalytics } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const { orgId, stats, advisorFilter } = await req.json();
    const safeStats = sanitizeStatsForAnalytics(stats);
    const today = new Date().toISOString().slice(0, 10);
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO daily_snapshots (org_id, snapshot_date, stats_json, advisor_filter)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(org_id, snapshot_date, advisor_filter) DO UPDATE SET
              stats_json = excluded.stats_json,
              created_at = datetime('now')`,
      args: [orgId || "default", today, JSON.stringify(safeStats), advisorFilter || null],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Snapshot]", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    await ensureSchema();
    const orgId = req.nextUrl.searchParams.get("orgId") || "default";
    const days = parseInt(req.nextUrl.searchParams.get("days") || "30", 10);
    const db = getDb();
    const result = await db.execute({
      sql: `SELECT snapshot_date, stats_json, advisor_filter, created_at
            FROM daily_snapshots
            WHERE org_id = ? AND snapshot_date >= date('now', ?)
            ORDER BY snapshot_date DESC`,
      args: [orgId, `-${days} days`],
    });
    return NextResponse.json({ success: true, snapshots: result.rows });
  } catch (error) {
    console.error("[Snapshot]", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
