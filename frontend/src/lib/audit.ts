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

// ─── Types ──────────────────────────────────────────────────────────────────

export interface AuditEntry {
  action: string;           // e.g. "confirmIntent", "completeTask"
  actor?: string;           // advisor name (from session, when available)
  householdId?: string;     // affected household (when applicable)
  result: "success" | "error";
  detail?: string;          // human-readable summary
  durationMs?: number;      // how long the action took
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

// ─── Write Audit Record ─────────────────────────────────────────────────────
// Currently writes to Task. To switch to custom object:
//   Replace createTask() with create(ctx, "Min_Audit_Log__c", { ... })

async function writeAuditRecord(ctx: SFContext, entry: AuditEntry, payload: Record<string, unknown>): Promise<void> {
  const householdId = entry.householdId || extractHouseholdId(payload);

  // Build description with scrubbed payload
  const description = [
    `MIN AUDIT LOG`,
    `Action: ${entry.action}`,
    `Result: ${entry.result}`,
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
    householdId: householdId || undefined,
    status: "Completed",
    priority: entry.result === "error" ? "High" : "Low",
    description,
  });
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Returns true if this action should be audited.
 */
export function shouldAudit(action: string): boolean {
  return !READ_ONLY_ACTIONS.has(action);
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
): Promise<void> {
  if (!shouldAudit(action)) return;

  try {
    await writeAuditRecord(ctx, {
      action,
      result,
      detail,
      durationMs,
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
