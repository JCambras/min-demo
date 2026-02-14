// ─── Salesforce Adapter ───────────────────────────────────────────────────────
//
// Implements CRMPort by wrapping existing sf-client primitives and org-query.
// Each method delegates to the same underlying functions the handlers already
// use, then maps results to canonical CRM types.
//
// Every method also returns the `raw` SF record so handlers can pass through
// SF-shaped data to the frontend during the migration period.

import type { CRMPort, CRMContext } from "../port";
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
} from "../types";
import { CRMQueryError, CRMMutationError } from "../errors";
import type { SFContext } from "@/lib/sf-client";
import {
  query,
  create,
  update,
  createTask,
  createTasksBatch,
  createContactsBatch,
  sanitizeSOQL,
  SFQueryError,
  SFMutationError,
} from "@/lib/sf-client";
import { orgQuery } from "@/lib/org-query";

// ─── FSC Account Type Mapping ───────────────────────────────────────────────

const ACCOUNT_TYPE_MAP: Record<string, { fscType: string; taxStatus: string }> = {
  "IRA":                { fscType: "Individual Retirement", taxStatus: "Tax-Deferred" },
  "Roth IRA":           { fscType: "Roth IRA",            taxStatus: "Tax-Free" },
  "Individual":         { fscType: "Brokerage",           taxStatus: "Taxable" },
  "Individual TOD":     { fscType: "Brokerage",           taxStatus: "Taxable" },
  "SEP IRA":            { fscType: "SEP IRA",             taxStatus: "Tax-Deferred" },
  "SIMPLE IRA":         { fscType: "SIMPLE IRA",          taxStatus: "Tax-Deferred" },
  "401(k)":             { fscType: "401k",                taxStatus: "Tax-Deferred" },
  "529 Plan":           { fscType: "529 Education",       taxStatus: "Tax-Free" },
  "JTWROS":             { fscType: "Joint Brokerage",     taxStatus: "Taxable" },
  "JTWROS TOD":         { fscType: "Joint Brokerage",     taxStatus: "Taxable" },
  "Joint TIC":          { fscType: "Joint Brokerage",     taxStatus: "Taxable" },
  "Community Property": { fscType: "Joint Brokerage",     taxStatus: "Taxable" },
};

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Extract SFContext from CRMContext.auth. */
function sfCtx(ctx: CRMContext): SFContext {
  return ctx.auth as SFContext;
}

/** Wrap SF errors into CRM errors for consistent handling. */
function wrapError(err: unknown): never {
  if (err instanceof SFQueryError) {
    throw new CRMQueryError(err.message, err.status);
  }
  if (err instanceof SFMutationError) {
    throw new CRMMutationError(err.message, err.status, err.objectType);
  }
  throw err;
}

// ─── Mapping Functions ──────────────────────────────────────────────────────

function mapContact(raw: Record<string, unknown>): CRMContact {
  const account = raw.Account as Record<string, unknown> | undefined;
  return {
    id: raw.Id as string,
    firstName: (raw.FirstName as string) || "",
    lastName: (raw.LastName as string) || "",
    email: (raw.Email as string) || "",
    phone: (raw.Phone as string) || "",
    householdId: (raw.AccountId as string) || null,
    householdName: (account?.Name as string) || null,
    createdAt: (raw.CreatedDate as string) || null,
    raw,
  };
}

function mapHousehold(raw: Record<string, unknown>): CRMHousehold {
  const owner = raw["Owner.Name"] ?? (raw.Owner as Record<string, unknown>)?.Name;
  return {
    id: raw.Id as string,
    name: (raw.Name as string) || "",
    description: (raw.Description as string) || "",
    createdAt: (raw.CreatedDate as string) || null,
    advisorName: (owner as string) || null,
    raw,
  };
}

function mapTask(raw: Record<string, unknown>): CRMTask {
  const what = raw.What as Record<string, unknown> | undefined;
  return {
    id: raw.Id as string,
    subject: (raw.Subject as string) || "",
    status: (raw.Status as string) || "",
    priority: (raw.Priority as string) || "",
    description: (raw.Description as string) || "",
    createdAt: (raw.CreatedDate as string) || null,
    dueDate: (raw.ActivityDate as string) || null,
    householdId: (what?.Id as string) || (raw.WhatId as string) || null,
    householdName: (what?.Name as string) || null,
    contactId: (raw.WhoId as string) || null,
    raw,
  };
}

function mapFinancialAccount(raw: Record<string, unknown>): CRMFinancialAccount {
  const household = raw["FinServ__Household__r"] as Record<string, unknown> | undefined;
  const owner = raw["FinServ__PrimaryOwner__r"] as Record<string, unknown> | undefined;
  return {
    id: raw.Id as string,
    name: (raw.Name as string) || "",
    accountType: (raw.FinServ__FinancialAccountType__c as string) || "",
    taxStatus: (raw.FinServ__TaxStatus__c as string) || "",
    balance: Number(raw.FinServ__Balance__c) || 0,
    householdId: (raw.FinServ__Household__c as string) || null,
    householdName: (household?.Name as string) || null,
    ownerName: (owner?.Name as string) || null,
    status: (raw.FinServ__Status__c as string) || "",
    openDate: (raw.FinServ__OpenDate__c as string) || null,
    raw,
  };
}

// ─── Adapter ────────────────────────────────────────────────────────────────

export class SalesforceAdapter implements CRMPort {
  readonly providerId = "salesforce";
  readonly providerName = "Salesforce";

  capabilities(): CRMCapabilities {
    return {
      financialAccounts: true,  // via FSC (graceful degradation if absent)
      contactRelationships: true, // via FSC
      batchOperations: true,    // Composite API
      workflows: true,          // handled externally via fireWorkflowTrigger
      auditLog: true,           // handled externally via audit module
    };
  }

  // ── Contacts ──────────────────────────────────────────────────────────

  async searchContacts(ctx: CRMContext, searchQuery: string, limit = 10): Promise<CRMContact[]> {
    try {
      const q = sanitizeSOQL(searchQuery);
      const records = await query(sfCtx(ctx),
        `SELECT Id, FirstName, LastName, Email, Phone, AccountId, Account.Name, CreatedDate FROM Contact WHERE FirstName LIKE '%${q}%' OR LastName LIKE '%${q}%' OR Email LIKE '%${q}%' OR Account.Name LIKE '%${q}%' ORDER BY LastName ASC LIMIT ${limit}`
      );
      return records.map(mapContact);
    } catch (err) {
      wrapError(err);
    }
  }

  async createContacts(ctx: CRMContext, contacts: CRMContactInput[]): Promise<CRMBatchResult> {
    try {
      const result = await createContactsBatch(sfCtx(ctx),
        contacts.map(c => ({
          firstName: c.firstName,
          lastName: c.lastName,
          email: c.email,
          phone: c.phone,
          accountId: c.householdId,
        }))
      );
      return {
        records: result.records.map(r => ({ id: r.id, url: r.url })),
        errors: result.errors,
      };
    } catch (err) {
      wrapError(err);
    }
  }

  // ── Households ────────────────────────────────────────────────────────

  async searchHouseholds(
    ctx: CRMContext,
    searchQuery: string,
    limit: number,
    offset: number,
  ): Promise<{ households: CRMHousehold[]; hasMore: boolean }> {
    try {
      const q = sanitizeSOQL(searchQuery);
      const fetchLimit = limit + 1;
      const soql = orgQuery.searchHouseholds(
        "Id, Name, Description, CreatedDate",
        q, fetchLimit, offset
      );
      const records = await query(sfCtx(ctx), soql);
      const hasMore = records.length > limit;
      const slice = hasMore ? records.slice(0, limit) : records;
      return {
        households: slice.map(mapHousehold),
        hasMore,
      };
    } catch (err) {
      wrapError(err);
    }
  }

  async getHouseholdDetail(
    ctx: CRMContext,
    id: string,
  ): Promise<{ household: CRMHousehold | null; contacts: CRMContact[]; tasks: CRMTask[] }> {
    try {
      const safeId = sanitizeSOQL(id);
      const obj = orgQuery.householdObject();
      const contactLookup = orgQuery.contactHouseholdLookup();
      const [hhRecords, contactRecords, taskRecords] = await Promise.all([
        query(sfCtx(ctx), `SELECT Id, Name, Description, CreatedDate FROM ${obj} WHERE Id = '${safeId}' LIMIT 1`),
        query(sfCtx(ctx), `SELECT Id, FirstName, LastName, Email, Phone, CreatedDate FROM Contact WHERE ${contactLookup} = '${safeId}' ORDER BY CreatedDate ASC`),
        query(sfCtx(ctx), `SELECT Id, Subject, Status, Priority, Description, CreatedDate, ActivityDate FROM Task WHERE WhatId = '${safeId}' ORDER BY CreatedDate ASC`),
      ]);
      return {
        household: hhRecords[0] ? mapHousehold(hhRecords[0]) : null,
        contacts: contactRecords.map(mapContact),
        tasks: taskRecords.map(mapTask),
      };
    } catch (err) {
      wrapError(err);
    }
  }

  async createHousehold(ctx: CRMContext, input: CRMHouseholdInput): Promise<CRMRecord> {
    try {
      const obj = orgQuery.householdObject();
      const fields = orgQuery.newHouseholdFields(input.name, input.description);
      const record = await create(sfCtx(ctx), obj, fields, { allowDuplicates: true });
      return { id: record.id, url: record.url };
    } catch (err) {
      wrapError(err);
    }
  }

  async updateHousehold(ctx: CRMContext, id: string, data: Record<string, unknown>): Promise<CRMRecord> {
    try {
      const obj = orgQuery.householdObject();
      const record = await update(sfCtx(ctx), obj, id, data);
      return { id: record.id, url: record.url };
    } catch (err) {
      wrapError(err);
    }
  }

  async findHouseholdByName(ctx: CRMContext, name: string): Promise<CRMRecord | null> {
    try {
      const safeName = sanitizeSOQL(name);
      const obj = orgQuery.householdObject();
      const filter = orgQuery.householdFilter();
      const filterClause = filter ? ` AND ${filter}` : "";
      const records = await query(sfCtx(ctx),
        `SELECT Id, Name FROM ${obj} WHERE Name = '${safeName}'${filterClause} ORDER BY CreatedDate DESC LIMIT 1`
      );
      if (records.length === 0) return null;
      return {
        id: records[0].Id as string,
        url: `${sfCtx(ctx).instanceUrl}/${records[0].Id}`,
      };
    } catch (err) {
      wrapError(err);
    }
  }

  // ── Tasks ─────────────────────────────────────────────────────────────

  async queryTasks(
    ctx: CRMContext,
    limit: number,
    offset: number,
  ): Promise<{ tasks: CRMTask[]; households: CRMHousehold[]; hasMore: boolean }> {
    try {
      const fetchLimit = limit + 1;
      const offsetClause = offset ? ` OFFSET ${offset}` : "";
      const advisorField = orgQuery.advisorField();
      const advisorSelect = advisorField === "OwnerId" ? "Owner.Name" : advisorField;
      const hhFields = `Id, Name, CreatedDate, Description, ${advisorSelect}`;
      const householdSoql = orgQuery.listHouseholds(hhFields, fetchLimit, offset);

      const [taskRecords, hhRecords] = await Promise.all([
        query(sfCtx(ctx),
          `SELECT Id, Subject, Status, Priority, Description, CreatedDate, ActivityDate, What.Name, What.Id FROM Task WHERE What.Type = 'Account' ORDER BY CreatedDate DESC LIMIT ${fetchLimit}${offsetClause}`
        ),
        query(sfCtx(ctx), householdSoql),
      ]);

      const tasksHasMore = taskRecords.length > limit;
      const hhHasMore = hhRecords.length > limit;

      return {
        tasks: (tasksHasMore ? taskRecords.slice(0, limit) : taskRecords).map(mapTask),
        households: (hhHasMore ? hhRecords.slice(0, limit) : hhRecords).map(mapHousehold),
        hasMore: tasksHasMore || hhHasMore,
      };
    } catch (err) {
      wrapError(err);
    }
  }

  async createTask(ctx: CRMContext, input: CRMTaskInput): Promise<CRMRecord> {
    try {
      const record = await createTask(sfCtx(ctx), {
        subject: input.subject,
        householdId: input.householdId,
        status: (input.status as "Completed" | "Not Started" | "In Progress") || "Not Started",
        priority: (input.priority as "High" | "Normal" | "Low") || "Normal",
        activityDate: input.dueDate,
        description: input.description,
        contactId: input.contactId,
      });
      return { id: record.id, url: record.url };
    } catch (err) {
      wrapError(err);
    }
  }

  async createTasksBatch(ctx: CRMContext, inputs: CRMTaskInput[]): Promise<CRMBatchResult> {
    try {
      const result = await createTasksBatch(sfCtx(ctx),
        inputs.map(i => ({
          subject: i.subject,
          householdId: i.householdId,
          status: (i.status as "Completed" | "Not Started" | "In Progress") || "Completed",
          priority: (i.priority as "High" | "Normal" | "Low") || "Normal",
          activityDate: i.dueDate,
          description: i.description,
          contactId: i.contactId,
        }))
      );
      return {
        records: result.records.map(r => ({ id: r.id, url: r.url })),
        errors: result.errors,
      };
    } catch (err) {
      wrapError(err);
    }
  }

  async completeTask(ctx: CRMContext, taskId: string): Promise<CRMRecord> {
    try {
      const record = await update(sfCtx(ctx), "Task", taskId, { Status: "Completed" });
      return { id: record.id, url: record.url };
    } catch (err) {
      wrapError(err);
    }
  }

  // ── Optional: Contact Relationships (FSC) ─────────────────────────────

  async createContactRelationship(
    ctx: CRMContext,
    contactId: string,
    relatedContactId: string,
    role: string,
  ): Promise<CRMRecord | null> {
    try {
      const record = await create(sfCtx(ctx), "FinServ__ContactContactRelation__c", {
        FinServ__Contact__c: contactId,
        FinServ__RelatedContact__c: relatedContactId,
        FinServ__Role__c: role,
        FinServ__InverseRole__c: role,
        FinServ__AssociationType__c: "Household Member",
      });
      return { id: record.id, url: record.url };
    } catch {
      // FSC not installed — degrade gracefully
      return null;
    }
  }

  // ── Optional: Financial Accounts (FSC) ────────────────────────────────

  async createFinancialAccounts(
    ctx: CRMContext,
    inputs: CRMFinancialAccountInput[],
  ): Promise<{ accounts: CRMRecord[]; fscAvailable: boolean }> {
    const accounts: CRMRecord[] = [];
    let fscAvailable = true;

    for (const acct of inputs) {
      const mapping = ACCOUNT_TYPE_MAP[acct.accountType] || { fscType: "Brokerage", taxStatus: "Taxable" };

      try {
        const record = await create(sfCtx(ctx), "FinServ__FinancialAccount__c", {
          Name: `${acct.owner} — ${acct.accountType}`,
          FinServ__FinancialAccountType__c: mapping.fscType,
          FinServ__TaxStatus__c: mapping.taxStatus,
          FinServ__Household__c: acct.householdId,
          FinServ__PrimaryOwner__c: acct.primaryContactId || undefined,
          FinServ__Balance__c: acct.amount || undefined,
          FinServ__Status__c: "New",
          FinServ__OpenDate__c: new Date().toISOString().split("T")[0],
        });
        accounts.push({ id: record.id, url: record.url });
      } catch (err) {
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("INVALID_TYPE") || msg.includes("NOT_FOUND") || msg.includes("sObject type")) {
          fscAvailable = false;
          break;
        }
      }
    }

    return { accounts, fscAvailable };
  }

  async queryFinancialAccounts(
    ctx: CRMContext,
    householdIds?: string[],
  ): Promise<{
    accounts: CRMFinancialAccount[];
    totalAum: number;
    aumByHousehold: Record<string, number>;
    fscAvailable: boolean;
  }> {
    try {
      let soql = `SELECT Id, Name, FinServ__FinancialAccountType__c, FinServ__TaxStatus__c,
        FinServ__Balance__c, FinServ__Household__c, FinServ__Household__r.Name,
        FinServ__PrimaryOwner__c, FinServ__PrimaryOwner__r.Name,
        FinServ__Status__c, FinServ__OpenDate__c
        FROM FinServ__FinancialAccount__c`;

      if (householdIds && householdIds.length > 0) {
        const ids = householdIds.map(id => `'${sanitizeSOQL(id)}'`).join(",");
        soql += ` WHERE FinServ__Household__c IN (${ids})`;
      }

      soql += ` ORDER BY FinServ__Household__r.Name, Name LIMIT 500`;

      const records = await query(sfCtx(ctx), soql);
      const accounts = records.map(mapFinancialAccount);

      const totalAum = accounts.reduce((sum, a) => sum + a.balance, 0);
      const byHousehold: Record<string, number> = {};
      for (const a of accounts) {
        if (a.householdId) {
          byHousehold[a.householdId] = (byHousehold[a.householdId] || 0) + a.balance;
        }
      }

      return { accounts, totalAum, aumByHousehold: byHousehold, fscAvailable: true };
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("INVALID_TYPE") || msg.includes("NOT_FOUND") || msg.includes("sObject type")) {
        return { accounts: [], totalAum: 0, aumByHousehold: {}, fscAvailable: false };
      }
      wrapError(err);
    }
  }
}
