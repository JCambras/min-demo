import { NextRequest, NextResponse } from "next/server";
import { getDb, ensureSchema } from "@/lib/db";
import { sanitizeEventProperties } from "@/lib/analytics";

export async function POST(req: NextRequest) {
  try {
    await ensureSchema();
    const { orgId, eventName, properties } = await req.json();
    const safeProps = properties ? sanitizeEventProperties(properties) : null;
    const db = getDb();
    await db.execute({
      sql: "INSERT INTO events (org_id, event_name, properties_json) VALUES (?, ?, ?)",
      args: [orgId || null, eventName, safeProps ? JSON.stringify(safeProps) : null],
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[Analytics]", error);
    return NextResponse.json({ success: false }, { status: 500 });
  }
}
