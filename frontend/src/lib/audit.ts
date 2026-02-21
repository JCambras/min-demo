// ─── Min Audit Logger ────────────────────────────────────────────────────────
//
// Writes an immutable audit record for every Min mutation action.
// SEC Rule 17a-4 requires books and records retention — this is the compliance
// trail that proves "who used Min to do what, when."
//
// Current implementation: writes to Task with MIN:AUDIT prefix.
// Future: swap to Min_Audit_Log__c custom object by changing writeAuditRecord().
//
// Design:
//   - Fire-and-forget: audit failures are logged but never block the user action
//   - PII-scrubbed: strips SSN, DOB, and other sensitive fields before writing
//   - Immutable by convention: MIN:AUDIT tasks should have a validation rule
//     preventing edits in Salesforce (deploy separately)

import type { SFContext } from "@/lib/sf-client";
import { createTask } from "@/lib/sf-client";
import { getDb, ensureSchema } from "@/lib/db";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuditEntry {
  action: string;           // e.g. "confirmIntent", "completeTask"
  actor?: string;           // advisor name (from session, when available)
  householdId?: string;     // affected household (when applicable)
  result: "success" | "error";
  detail?: string;          // human-readable summary
  durationMs?: number;      // how long the action took
  requestId?: string;       // unique request trace ID
}

// Actions that are read-only — no audit record needed
const READ_ONLY_ACTIONS = new Set([
  "searchContacts",
  "searchHouseholds",
  "getHouseholdDetail",
  "queryTasks",
  "queryFinancialAccounts",
]);

// PII fields to strip from audit payloads
const PII_FIELDS = new Set([
  "ssn", "dob", "dateOfBirth", "socialSecurityNumber",
  "idNumber", "bankAcct", "routingNumber", "accountNumber",
  "lastFour", "routingLastFour",
]);

// ─── PII Scrubbing ──────────────────────────────────────────────────────────

function scrubPII(data: unknown): Record<string, unknown> {
  if (!data || typeof data !== "object") return {};
  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
    if (PII_FIELDS.has(key)) {
      scrubbed[key] = "[REDACTED]";
    } else if (Array.isArray(value)) {
      scrubbed[key] = `[${value.length} items]`;
    } else if (value && typeof value === "object") {
      scrubbed[key] = scrubPII(value);
    } else if (typeof value === "string" && value.length > 100) {
      scrubbed[key] = value.slice(0, 80) + "…";
    } else {
      scrubbed[key] = value;
    }
  }
  return scrubbed;
}

// ─── Extract Household ID ───────────────────────────────────────────────────

function extractHouseholdId(data: unknown): string | undefined {
  if (!data || typeof data !== "object") return undefined;
  const d = data as Record<string, unknown>;
  return (d.householdId as string) || undefined;
}

// ─── Write-Ahead Audit Buffer ───────────────────────────────────────────────
// Step 1: Write to Turso (synchronous, local) — this is the durable record.
// Step 2: Replicate to Salesforce (async) — this is the customer-visible copy.
// If Salesforce write fails, the Turso record survives for later retry.

async function writeToTurso(entry: AuditEntry, payload: Record<string, unknown>): Promise<void> {
  try {
    await ensureSchema();
    const db = getDb();
    await db.execute({
      sql: `INSERT INTO audit_log (org_id, action, result, actor, household_id, detail, duration_ms, request_id, payload_json, sf_synced)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0)`,
      args: [
        null, // org_id — could be extracted from context in future
        entry.action,
        entry.result,
        entry.actor || null,
        entry.householdId || extractHouseholdId(payload) || null,
        entry.detail || null,
        entry.durationMs || null,
        entry.requestId || null,
        JSON.stringify(scrubPII(payload)).slice(0, 4000),
      ],
    });
  } catch (err) {
    // Turso write failed — log but don't block. Salesforce write may still succeed.
    console.error("[MIN:AUDIT] Turso write-ahead failed", {
      action: entry.action,
      error: err instanceof Error ? err.message : "Unknown",
    });
  }
}

async function writeToSalesforce(ctx: SFContext, entry: AuditEntry, payload: Record<string, unknown>): Promise<void> {
  const householdId = entry.householdId || extractHouseholdId(payload);

  const description = [
    `MIN AUDIT LOG`,
    `Action: ${entry.action}`,
    `Result: ${entry.result}`,
    entry.requestId ? `RequestId: ${entry.requestId}` : null,
    entry.actor ? `Actor: ${entry.actor}` : null,
    entry.detail ? `Detail: ${entry.detail}` : null,
    entry.durationMs ? `Duration: ${entry.durationMs}ms` : null,
    `Timestamp: ${new Date().toISOString()}`,
    ``,
    `Payload (PII-scrubbed):`,
    JSON.stringify(scrubPII(payload), null, 2).slice(0, 2000),
  ].filter(Boolean).join("\n");

  await createTask(ctx, {
    subject: `MIN:AUDIT — ${entry.action} — ${entry.result}`,
    householdId: householdId || "",
    status: "Completed",
    priority: entry.result === "error" ? "High" : "Low",
    description,
  });
}

async function writeAuditRecord(ctx: SFContext, entry: AuditEntry, payload: Record<string, unknown>): Promise<void> {
  // Step 1: Write-ahead to Turso (durable local record)
  await writeToTurso(entry, payload);

  // Step 2: Replicate to Salesforce (customer-visible copy)
  await writeToSalesforce(ctx, entry, payload);
}

// ─── PII Access Logging ─────────────────────────────────────────────────────
// Logs when a user reveals masked PII (e.g., clicks "show SSN").
// This satisfies SOC 2 CC6.1 (logical access to sensitive data is logged).

export async function writePIIAccessEvent(
  ctx: SFContext | null,
  field: "ssn" | "idNumber" | "bankAcct",
  clientLabel: string,
  metadata?: Record<string, string>,
): Promise<void> {
  const entry: AuditEntry = {
    action: `pii_access:${field}`,
    result: "success",
    detail: `User revealed ${field} for ${clientLabel}`,
    actor: metadata?.actor,
  };

  const payload = {
    field,
    clientLabel,
    ...metadata,
    timestamp: new Date().toISOString(),
  };

  // Write to Turso (always available, even without SF context)
  await writeToTurso(entry, payload);

  // Write to Salesforce if context available
  if (ctx) {
    try {
      await writeToSalesforce(ctx, entry, payload);
    } catch (err) {
      console.error("[MIN:AUDIT:PII] SF write failed for PII access log", {
        field,
        error: err instanceof Error ? err.message : "Unknown",
      });
    }
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns true if this action should be audited.
 */
export function shouldAudit(action: string): boolean {
  return !READ_ONLY_ACTIONS.has(action);
}

/**
 * Write an authentication event to the audit trail. Fire-and-forget.
 * Auth events are always audited (not subject to READ_ONLY_ACTIONS filter).
 */
export async function writeAuthEvent(
  ctx: SFContext | null,
  event: "login" | "login_env" | "logout" | "logout_revoke" | "token_refresh" | "auth_failed",
  detail?: string,
  metadata?: Record<string, string>,
): Promise<void> {
  // If we don't have a Salesforce context (e.g., auth failed before connection),
  // we can only log to console. The write-ahead buffer (when implemented) will
  // also capture these to Turso.
  if (!ctx) {
    console.warn("[MIN:AUDIT:AUTH]", event, detail || "", metadata || {});
    return;
  }

  try {
    const description = [
      `MIN AUDIT LOG — Authentication Event`,
      `Event: ${event}`,
      detail ? `Detail: ${detail}` : null,
      `Timestamp: ${new Date().toISOString()}`,
      metadata ? `\nMetadata:\n${JSON.stringify(metadata, null, 2)}` : null,
    ].filter(Boolean).join("\n");

    await createTask(ctx, {
      subject: `MIN:AUDIT — auth:${event} — success`,
      householdId: "",
      status: "Completed",
      priority: event === "auth_failed" ? "High" : "Low",
      description,
    });
  } catch (err) {
    console.error("[MIN:AUDIT:AUTH] Failed to write auth event", {
      event,
      error: err instanceof Error ? err.message : "Unknown",
    });
  }
}

/**
 * Write an audit log entry. Fire-and-forget — never throws.
 */
export async function writeAuditLog(
  ctx: SFContext,
  action: string,
  data: unknown,
  result: "success" | "error",
  detail?: string,
  durationMs?: number,
  requestId?: string,
): Promise<void> {
  if (!shouldAudit(action)) return;

  try {
    await writeAuditRecord(ctx, {
      action,
      result,
      detail,
      durationMs,
      requestId,
      householdId: extractHouseholdId(data),
    }, (data as Record<string, unknown>) || {});
  } catch (err) {
    // Audit failure must never block user actions
    console.error("[MIN:AUDIT] Failed to write audit log", {
      action,
      result,
      error: err instanceof Error ? err.message : "Unknown",
    });
  }
}
