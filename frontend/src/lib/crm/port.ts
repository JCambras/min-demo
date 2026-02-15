// ─── CRMPort Interface ────────────────────────────────────────────────────────
//
// The contract all CRM adapters implement. This is the "port" in the
// hexagonal / ports-and-adapters architecture.
//
// Auth is adapter-specific: `CRMContext.auth` is `unknown`, each adapter
// casts to its own type (SF uses `SFContext`).

import type {
  CRMContact,
  CRMHousehold,
  CRMTask,
  CRMRecord,
  CRMBatchResult,
  CRMCapabilities,
  CRMTaskInput,
  CRMContactInput,
  CRMHouseholdInput,
  CRMFinancialAccount,
  CRMFinancialAccountInput,
} from "./types";

// ─── CRM Context ────────────────────────────────────────────────────────────
// Each adapter casts `auth` to its own credential type.

export interface CRMContext {
  auth: unknown;
  instanceUrl: string;
}

// ─── CRMPort ────────────────────────────────────────────────────────────────

export interface CRMPort {
  /** Unique adapter identifier, e.g. "salesforce", "wealthbox", "redtail". */
  readonly providerId: string;

  /** Human-readable provider name, e.g. "Salesforce", "Wealthbox". */
  readonly providerName: string;

  /** Declares which optional features this adapter supports. */
  capabilities(): CRMCapabilities;

  // ── Contacts ────────────────────────────────────────────────────────────

  searchContacts(
    ctx: CRMContext,
    query: string,
    limit?: number,
  ): Promise<CRMContact[]>;

  createContacts(
    ctx: CRMContext,
    contacts: CRMContactInput[],
  ): Promise<CRMBatchResult>;

  // ── Households ──────────────────────────────────────────────────────────

  searchHouseholds(
    ctx: CRMContext,
    query: string,
    limit: number,
    offset: number,
  ): Promise<{ households: CRMHousehold[]; hasMore: boolean }>;

  /** Fetch a single household by ID (lightweight, no contacts/tasks). */
  getHousehold(
    ctx: CRMContext,
    id: string,
  ): Promise<CRMHousehold | null>;

  getHouseholdDetail(
    ctx: CRMContext,
    id: string,
  ): Promise<{ household: CRMHousehold | null; contacts: CRMContact[]; tasks: CRMTask[] }>;

  createHousehold(
    ctx: CRMContext,
    input: CRMHouseholdInput,
  ): Promise<CRMRecord>;

  updateHousehold(
    ctx: CRMContext,
    id: string,
    data: Record<string, unknown>,
  ): Promise<CRMRecord>;

  findHouseholdByName(
    ctx: CRMContext,
    name: string,
  ): Promise<CRMRecord | null>;

  // ── Tasks ───────────────────────────────────────────────────────────────

  queryTasks(
    ctx: CRMContext,
    limit: number,
    offset: number,
  ): Promise<{ tasks: CRMTask[]; households: CRMHousehold[]; tasksHasMore: boolean; householdsHasMore: boolean }>;

  createTask(
    ctx: CRMContext,
    input: CRMTaskInput,
  ): Promise<CRMRecord>;

  createTasksBatch(
    ctx: CRMContext,
    inputs: CRMTaskInput[],
  ): Promise<CRMBatchResult>;

  completeTask(
    ctx: CRMContext,
    taskId: string,
  ): Promise<CRMRecord>;

  /** Query workflow-prefixed tasks for a household (or all if no householdId). */
  queryWorkflowTasks(
    ctx: CRMContext,
    options?: { householdId?: string; activeOnly?: boolean; limit?: number },
  ): Promise<CRMTask[]>;

  // ── Optional (CRM-specific capabilities) ────────────────────────────────

  createContactRelationship?(
    ctx: CRMContext,
    contactId: string,
    relatedContactId: string,
    role: string,
  ): Promise<CRMRecord | null>;

  createFinancialAccounts?(
    ctx: CRMContext,
    inputs: CRMFinancialAccountInput[],
  ): Promise<{ accounts: { id: string; url: string; accountType: string }[]; fscAvailable: boolean }>;

  queryFinancialAccounts?(
    ctx: CRMContext,
    householdIds?: string[],
  ): Promise<{
    accounts: CRMFinancialAccount[];
    totalAum: number;
    aumByHousehold: Record<string, number>;
    fscAvailable: boolean;
  }>;
}
