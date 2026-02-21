// ─── Data Persistence Tests ──────────────────────────────────────────────────
//
// Tests for Turso/libSQL persistence layer (db.ts), PII stripping,
// and analytics event tracking.

import { describe, it, expect, beforeEach, vi } from "vitest";
import { createClient } from "@libsql/client";
import type { Client } from "@libsql/client";

// ─── db.ts tests (using in-memory SQLite) ────────────────────────────────────

describe("db.ts — ensureSchema", () => {
  let db: Client;

  beforeEach(() => {
    db = createClient({ url: "file::memory:" });
  });

  async function runSchema(client: Client) {
    await client.batch([
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
  }

  it("creates all three tables without error", async () => {
    await runSchema(db);
    const tables = await db.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      args: [],
    });
    const names = tables.rows.map((r) => r.name);
    expect(names).toContain("daily_snapshots");
    expect(names).toContain("org_patterns");
    expect(names).toContain("events");
  });

  it("is idempotent — running twice does not error", async () => {
    await runSchema(db);
    await runSchema(db);
    const tables = await db.execute({
      sql: "SELECT name FROM sqlite_master WHERE type='table' ORDER BY name",
      args: [],
    });
    expect(tables.rows.length).toBeGreaterThanOrEqual(3);
  });
});

// ─── Snapshot CRUD ───────────────────────────────────────────────────────────

describe("daily_snapshots table", () => {
  let db: Client;

  beforeEach(async () => {
    db = createClient({ url: "file::memory:" });
    await db.execute({
      sql: `CREATE TABLE daily_snapshots (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT NOT NULL,
        snapshot_date TEXT NOT NULL,
        stats_json TEXT NOT NULL,
        advisor_filter TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now')),
        UNIQUE(org_id, snapshot_date, advisor_filter)
      )`,
      args: [],
    });
  });

  it("inserts a snapshot row", async () => {
    await db.execute({
      sql: "INSERT INTO daily_snapshots (org_id, snapshot_date, stats_json) VALUES (?, ?, ?)",
      args: ["org1", "2025-01-15", '{"totalAum": 5000000}'],
    });
    const result = await db.execute({ sql: "SELECT * FROM daily_snapshots", args: [] });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].org_id).toBe("org1");
    expect(JSON.parse(result.rows[0].stats_json as string)).toEqual({ totalAum: 5000000 });
  });

  it("upserts on same org+date+filter — overwrites stats", async () => {
    await db.execute({
      sql: "INSERT INTO daily_snapshots (org_id, snapshot_date, stats_json, advisor_filter) VALUES (?, ?, ?, ?)",
      args: ["org1", "2025-01-15", '{"v": 1}', "Jon Cambras"],
    });
    await db.execute({
      sql: `INSERT INTO daily_snapshots (org_id, snapshot_date, stats_json, advisor_filter)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(org_id, snapshot_date, advisor_filter) DO UPDATE SET
              stats_json = excluded.stats_json`,
      args: ["org1", "2025-01-15", '{"v": 2}', "Jon Cambras"],
    });
    const result = await db.execute({ sql: "SELECT * FROM daily_snapshots", args: [] });
    expect(result.rows).toHaveLength(1);
    expect(JSON.parse(result.rows[0].stats_json as string)).toEqual({ v: 2 });
  });

  it("different advisor_filter creates separate rows", async () => {
    await db.execute({
      sql: "INSERT INTO daily_snapshots (org_id, snapshot_date, stats_json, advisor_filter) VALUES (?, ?, ?, ?)",
      args: ["org1", "2025-01-15", '{"filter": "all"}', null],
    });
    await db.execute({
      sql: "INSERT INTO daily_snapshots (org_id, snapshot_date, stats_json, advisor_filter) VALUES (?, ?, ?, ?)",
      args: ["org1", "2025-01-15", '{"filter": "jon"}', "Jon Cambras"],
    });
    const result = await db.execute({ sql: "SELECT * FROM daily_snapshots", args: [] });
    expect(result.rows).toHaveLength(2);
  });
});

// ─── Org Patterns ────────────────────────────────────────────────────────────

describe("org_patterns table", () => {
  let db: Client;

  beforeEach(async () => {
    db = createClient({ url: "file::memory:" });
    await db.execute({
      sql: `CREATE TABLE org_patterns (
        org_id TEXT PRIMARY KEY,
        mapping_json TEXT NOT NULL,
        bundle_summary_json TEXT NOT NULL,
        discovered_at TEXT NOT NULL,
        updated_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    });
  });

  it("inserts and retrieves org patterns", async () => {
    const mapping = { household: "Account", contact: "Contact" };
    await db.execute({
      sql: "INSERT INTO org_patterns (org_id, mapping_json, bundle_summary_json, discovered_at) VALUES (?, ?, ?, ?)",
      args: ["org1", JSON.stringify(mapping), '{"apiCalls": 12}', "2025-01-15T10:00:00Z"],
    });
    const result = await db.execute({
      sql: "SELECT mapping_json, discovered_at FROM org_patterns WHERE org_id = ?",
      args: ["org1"],
    });
    expect(result.rows).toHaveLength(1);
    expect(JSON.parse(result.rows[0].mapping_json as string)).toEqual(mapping);
  });

  it("upserts on same org_id — updates mapping", async () => {
    await db.execute({
      sql: "INSERT INTO org_patterns (org_id, mapping_json, bundle_summary_json, discovered_at) VALUES (?, ?, ?, ?)",
      args: ["org1", '{"v": 1}', '{}', "2025-01-15T10:00:00Z"],
    });
    await db.execute({
      sql: `INSERT INTO org_patterns (org_id, mapping_json, bundle_summary_json, discovered_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(org_id) DO UPDATE SET
              mapping_json = excluded.mapping_json,
              bundle_summary_json = excluded.bundle_summary_json,
              updated_at = excluded.updated_at`,
      args: ["org1", '{"v": 2}', '{"apiCalls": 15}', "2025-01-15T10:00:00Z", "2025-01-15T11:00:00Z"],
    });
    const result = await db.execute({ sql: "SELECT * FROM org_patterns", args: [] });
    expect(result.rows).toHaveLength(1);
    expect(JSON.parse(result.rows[0].mapping_json as string)).toEqual({ v: 2 });
  });
});

// ─── Events ──────────────────────────────────────────────────────────────────

describe("events table", () => {
  let db: Client;

  beforeEach(async () => {
    db = createClient({ url: "file::memory:" });
    await db.execute({
      sql: `CREATE TABLE events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        org_id TEXT,
        event_name TEXT NOT NULL,
        properties_json TEXT,
        created_at TEXT NOT NULL DEFAULT (datetime('now'))
      )`,
      args: [],
    });
  });

  it("inserts an event with properties", async () => {
    await db.execute({
      sql: "INSERT INTO events (org_id, event_name, properties_json) VALUES (?, ?, ?)",
      args: ["org1", "stats_loaded", '{"advisorFilter": "all"}'],
    });
    const result = await db.execute({ sql: "SELECT * FROM events", args: [] });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].event_name).toBe("stats_loaded");
  });

  it("inserts an event without org_id or properties", async () => {
    await db.execute({
      sql: "INSERT INTO events (org_id, event_name, properties_json) VALUES (?, ?, ?)",
      args: [null, "screen_view", null],
    });
    const result = await db.execute({ sql: "SELECT * FROM events", args: [] });
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].org_id).toBeNull();
    expect(result.rows[0].properties_json).toBeNull();
  });
});

// ─── PII Stripping ──────────────────────────────────────────────────────────

describe("stripPII", () => {
  // Inline the stripPII logic for testing (same as useFlowState.ts)
  const PII_FIELDS = ["ssn", "idNumber", "dob"] as const;

  function stripPII(client: Record<string, string>): Record<string, string> {
    const stripped = { ...client };
    for (const field of PII_FIELDS) {
      stripped[field] = "";
    }
    return stripped;
  }

  it("removes ssn, idNumber, and dob", () => {
    const client = {
      firstName: "John",
      lastName: "Doe",
      ssn: "123-45-6789",
      idNumber: "DL12345",
      dob: "1990-01-15",
      email: "john@example.com",
      phone: "555-1234",
    };
    const stripped = stripPII(client);
    expect(stripped.ssn).toBe("");
    expect(stripped.idNumber).toBe("");
    expect(stripped.dob).toBe("");
  });

  it("preserves non-PII fields", () => {
    const client = {
      firstName: "Jane",
      lastName: "Smith",
      ssn: "999-99-9999",
      idNumber: "PA0001",
      dob: "1985-06-20",
      email: "jane@example.com",
      phone: "555-9999",
      city: "New York",
      state: "NY",
    };
    const stripped = stripPII(client);
    expect(stripped.firstName).toBe("Jane");
    expect(stripped.lastName).toBe("Smith");
    expect(stripped.email).toBe("jane@example.com");
    expect(stripped.phone).toBe("555-9999");
    expect(stripped.city).toBe("New York");
    expect(stripped.state).toBe("NY");
  });

  it("does not mutate the original object", () => {
    const client = { firstName: "A", ssn: "111-22-3333", idNumber: "X", dob: "2000-01-01" };
    stripPII(client);
    expect(client.ssn).toBe("111-22-3333");
    expect(client.idNumber).toBe("X");
    expect(client.dob).toBe("2000-01-01");
  });
});

// ─── trackEvent resilience ──────────────────────────────────────────────────

describe("trackEvent", () => {
  it("does not throw when fetch fails", async () => {
    const originalFetch = globalThis.fetch;
    globalThis.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    try {
      // Import dynamically to get the real module
      const { trackEvent } = await import("@/lib/analytics");
      // Should not throw
      expect(() => trackEvent("test_event", { key: "value" })).not.toThrow();
    } finally {
      globalThis.fetch = originalFetch;
    }
  });
});

// ─── Tenant Isolation ───────────────────────────────────────────────────────
// Verify org_id=A cannot access data belonging to org_id=B.

describe("Tenant Isolation", () => {
  let db: Client;

  beforeEach(async () => {
    db = createClient({ url: "file::memory:" });
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
      {
        sql: `CREATE TABLE IF NOT EXISTS audit_log (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          org_id TEXT,
          action TEXT NOT NULL,
          result TEXT NOT NULL,
          actor TEXT,
          household_id TEXT,
          detail TEXT,
          duration_ms INTEGER,
          request_id TEXT,
          payload_json TEXT,
          sf_synced INTEGER NOT NULL DEFAULT 0,
          created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )`,
        args: [],
      },
    ]);
  });

  it("daily_snapshots: org_id=A query returns zero rows from org_id=B", async () => {
    // Insert data for two different orgs
    await db.execute({
      sql: "INSERT INTO daily_snapshots (org_id, snapshot_date, stats_json) VALUES (?, ?, ?)",
      args: ["org_A", "2026-02-21", '{"tasks":5}'],
    });
    await db.execute({
      sql: "INSERT INTO daily_snapshots (org_id, snapshot_date, stats_json) VALUES (?, ?, ?)",
      args: ["org_B", "2026-02-21", '{"tasks":99}'],
    });

    // Query as org_A
    const result = await db.execute({
      sql: "SELECT * FROM daily_snapshots WHERE org_id = ?",
      args: ["org_A"],
    });

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].org_id).toBe("org_A");
    expect(result.rows[0].stats_json).toBe('{"tasks":5}');
    // Ensure org_B data is NOT returned
    expect(result.rows.every(r => r.org_id !== "org_B")).toBe(true);
  });

  it("org_patterns: org_id=A query returns zero rows from org_id=B", async () => {
    await db.execute({
      sql: "INSERT INTO org_patterns (org_id, mapping_json, bundle_summary_json, discovered_at) VALUES (?, ?, ?, ?)",
      args: ["org_A", '{"household":"Account"}', '{"summary":"A"}', "2026-02-21"],
    });
    await db.execute({
      sql: "INSERT INTO org_patterns (org_id, mapping_json, bundle_summary_json, discovered_at) VALUES (?, ?, ?, ?)",
      args: ["org_B", '{"household":"Custom__c"}', '{"summary":"B"}', "2026-02-21"],
    });

    const result = await db.execute({
      sql: "SELECT * FROM org_patterns WHERE org_id = ?",
      args: ["org_A"],
    });

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].org_id).toBe("org_A");
    expect(result.rows[0].mapping_json).toBe('{"household":"Account"}');
  });

  it("events: org_id=A query returns zero rows from org_id=B", async () => {
    await db.execute({
      sql: "INSERT INTO events (org_id, event_name, properties_json) VALUES (?, ?, ?)",
      args: ["org_A", "page_view", '{"page":"home"}'],
    });
    await db.execute({
      sql: "INSERT INTO events (org_id, event_name, properties_json) VALUES (?, ?, ?)",
      args: ["org_B", "page_view", '{"page":"dashboard"}'],
    });

    const result = await db.execute({
      sql: "SELECT * FROM events WHERE org_id = ?",
      args: ["org_A"],
    });

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].org_id).toBe("org_A");
  });

  it("audit_log: org_id=A query returns zero rows from org_id=B", async () => {
    await db.execute({
      sql: "INSERT INTO audit_log (org_id, action, result) VALUES (?, ?, ?)",
      args: ["org_A", "confirmIntent", "success"],
    });
    await db.execute({
      sql: "INSERT INTO audit_log (org_id, action, result) VALUES (?, ?, ?)",
      args: ["org_B", "sendDocusign", "success"],
    });

    const result = await db.execute({
      sql: "SELECT * FROM audit_log WHERE org_id = ?",
      args: ["org_A"],
    });

    expect(result.rows.length).toBe(1);
    expect(result.rows[0].action).toBe("confirmIntent");
    expect(result.rows.every(r => r.org_id !== "org_B")).toBe(true);
  });

  it("wildcard org_id query is impossible with parameterized queries", async () => {
    await db.execute({
      sql: "INSERT INTO daily_snapshots (org_id, snapshot_date, stats_json) VALUES (?, ?, ?)",
      args: ["org_A", "2026-02-21", '{"tasks":1}'],
    });
    await db.execute({
      sql: "INSERT INTO daily_snapshots (org_id, snapshot_date, stats_json) VALUES (?, ?, ?)",
      args: ["org_B", "2026-02-21", '{"tasks":2}'],
    });

    // Attempt SQL injection via org_id parameter — parameterized query prevents it
    const result = await db.execute({
      sql: "SELECT * FROM daily_snapshots WHERE org_id = ?",
      args: ["' OR 1=1 --"],
    });

    expect(result.rows.length).toBe(0);
  });
});
