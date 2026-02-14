// ─── Canonical CRM Data Types ─────────────────────────────────────────────────
//
// Normalized domain objects that all CRM adapters produce. These are the
// "inner" types in the hexagonal architecture — handlers and frontend code
// will eventually consume these instead of raw SF field names.
//
// The `raw` field on each type preserves the original CRM record so handlers
// can pass through CRM-shaped data to the frontend during incremental migration.

// ─── Read Types ──────────────────────────────────────────────────────────────

/** Minimal record reference returned from any mutation. */
export interface CRMRecord {
  id: string;
  url: string;
}

export interface CRMContact {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  householdId: string | null;
  householdName: string | null;
  createdAt: string | null;
  /** Original CRM record for pass-through during migration. */
  raw?: Record<string, unknown>;
}

export interface CRMHousehold {
  id: string;
  name: string;
  description: string;
  createdAt: string | null;
  advisorName: string | null;
  contacts?: CRMContact[];
  /** Original CRM record for pass-through during migration. */
  raw?: Record<string, unknown>;
}

export interface CRMTask {
  id: string;
  subject: string;
  status: string;
  priority: string;
  description: string;
  createdAt: string | null;
  dueDate: string | null;
  householdId: string | null;
  householdName: string | null;
  contactId: string | null;
  /** Original CRM record for pass-through during migration. */
  raw?: Record<string, unknown>;
}

export interface CRMFinancialAccount {
  id: string;
  name: string;
  accountType: string;
  taxStatus: string;
  balance: number;
  householdId: string | null;
  householdName: string | null;
  ownerName: string | null;
  status: string;
  openDate: string | null;
  /** Original CRM record for pass-through during migration. */
  raw?: Record<string, unknown>;
}

// ─── Write Types (creation inputs) ──────────────────────────────────────────

export interface CRMContactInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  householdId: string;
}

export interface CRMHouseholdInput {
  name: string;
  description: string;
}

export interface CRMTaskInput {
  subject: string;
  householdId: string;
  status?: string;
  priority?: string;
  description?: string;
  contactId?: string;
  dueDate?: string;
}

export interface CRMFinancialAccountInput {
  name: string;
  accountType: string;
  owner: string;
  amount?: number;
  householdId: string;
  primaryContactId?: string;
}

// ─── Batch / Aggregate Types ────────────────────────────────────────────────

export interface CRMBatchResult {
  records: CRMRecord[];
  errors: string[];
}

/** Declares which optional features an adapter supports. */
export interface CRMCapabilities {
  financialAccounts: boolean;
  contactRelationships: boolean;
  batchOperations: boolean;
  workflows: boolean;
  auditLog: boolean;
}
