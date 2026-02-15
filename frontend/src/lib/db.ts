// @runtime nodejs — Server-only. Do NOT import from client components.
import { createClient, type Client } from "@libsql/client";

let client: Client | null = null;
let schemaReady = false;

export function getDb(): Client {
  if (!client) {
    const url = process.env.TURSO_DATABASE_URL;
    if (!url) throw new Error("TURSO_DATABASE_URL not set");
    client = createClient({
      url,
      authToken: process.env.TURSO_AUTH_TOKEN || undefined,
    });
  }
  return client;
}

export async function ensureSchema(): Promise<void> {
  if (schemaReady) return;
  const db = getDb();
  await db.batch([
    {
      sql: `CREATE TABLE IF NOT EXISTS daily_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        snapshot_date TEXT NOT NULL,
        stats_json TEXT NOT NULL,
        advisor_filter TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(org_id, snapshot_date, advisor_filter)
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS org_patterns (
        org_id TEXT PRIMARY KEY,
        mapping_json TEXT NOT NULL,
        bundle_summary_json TEXT NOT NULL,
        discovered_at TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
    {
      sql: `CREATE TABLE IF NOT EXISTS events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT,
        event_name TEXT NOT NULL,
        properties_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    },
  ]);
  schemaReady = true;
}

/** Reset cached state — used by tests */
export function _resetForTest(): void {
  client = null;
  schemaReady = false;
}
