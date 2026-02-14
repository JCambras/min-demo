// ─── CRM Adapter & Factory Tests ──────────────────────────────────────────────
//
// Tests the SalesforceAdapter (CRMPort implementation) and factory resolution.
// Uses the same mock pattern as existing handler tests.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────

vi.mock("@/lib/sf-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/sf-client")>("@/lib/sf-client");
  return {
    ...actual,
    query: vi.fn(),
    queryPaginated: vi.fn(),
    update: vi.fn(),
    create: vi.fn(),
    createTask: vi.fn(),
    createTasksBatch: vi.fn(),
    createContactsBatch: vi.fn(),
  };
});

vi.mock("@/lib/sf-connection", () => ({
  getAccessToken: vi.fn().mockResolvedValue({
    accessToken: "mock-token",
    instanceUrl: "https://test.salesforce.com",
  }),
}));

vi.mock("@/lib/org-query", () => ({
  orgQuery: {
    householdObject: () => "Account",
    householdFilter: () => "Type = 'Household'",
    householdFilterWhere: () => " WHERE Type = 'Household'",
    householdFilterAnd: () => " AND Type = 'Household'",
    householdTypeValue: () => "Household",
    contactHouseholdLookup: () => "AccountId",
    advisorField: () => "OwnerId",
    listHouseholds: (fields: string, limit: number, offset?: number) =>
      `SELECT ${fields} FROM Account WHERE Type = 'Household' ORDER BY CreatedDate DESC LIMIT ${limit}${offset ? ` OFFSET ${offset}` : ""}`,
    searchHouseholds: (fields: string, q: string, limit: number, offset?: number) =>
      `SELECT ${fields} FROM Account WHERE Type = 'Household' AND Name LIKE '%${q}%' ORDER BY CreatedDate DESC LIMIT ${limit}${offset ? ` OFFSET ${offset}` : ""}`,
    newHouseholdFields: (name: string, desc: string) => ({ Name: name, Description: desc, Type: "Household" }),
  },
  ensureMappingLoaded: vi.fn(),
}));

// ─── Imports (after mocks) ──────────────────────────────────────────────────

import { query, create, update, createTask, createTasksBatch, createContactsBatch } from "@/lib/sf-client";
import { SFQueryError, SFMutationError } from "@/lib/sf-client";
import { SalesforceAdapter } from "@/lib/crm/adapters/salesforce";
import { getCRMAdapter, getCRMContext, _resetAdapterCache } from "@/lib/crm/factory";
import { CRMQueryError, CRMMutationError } from "@/lib/crm/errors";
import type { CRMContext } from "@/lib/crm/port";

// ─── Helpers ────────────────────────────────────────────────────────────────

const mockSfCtx = { accessToken: "mock-token", instanceUrl: "https://test.salesforce.com" };
const crmCtx: CRMContext = { auth: mockSfCtx };
const VALID_HH_ID = "0011234567890ABCDE";
const VALID_CONTACT_ID = "0031234567890ABCDE";
const VALID_TASK_ID = "00T1234567890ABCDE";

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("SalesforceAdapter", () => {
  let adapter: SalesforceAdapter;

  beforeEach(() => {
    vi.clearAllMocks();
    adapter = new SalesforceAdapter();
  });

  // ── Identity & Capabilities ───────────────────────────────────────────

  describe("identity", () => {
    it("has correct providerId and providerName", () => {
      expect(adapter.providerId).toBe("salesforce");
      expect(adapter.providerName).toBe("Salesforce");
    });

    it("reports all capabilities", () => {
      const caps = adapter.capabilities();
      expect(caps.financialAccounts).toBe(true);
      expect(caps.contactRelationships).toBe(true);
      expect(caps.batchOperations).toBe(true);
      expect(caps.workflows).toBe(true);
      expect(caps.auditLog).toBe(true);
    });
  });

  // ── searchContacts ────────────────────────────────────────────────────

  describe("searchContacts", () => {
    it("returns mapped CRMContact array", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { Id: "003A", FirstName: "John", LastName: "Doe", Email: "john@test.com", Phone: "555-1234", AccountId: VALID_HH_ID, Account: { Name: "Doe Household" }, CreatedDate: "2024-01-15T00:00:00Z" },
      ]);

      const contacts = await adapter.searchContacts(crmCtx, "john");
      expect(contacts).toHaveLength(1);
      expect(contacts[0]).toEqual({
        id: "003A",
        firstName: "John",
        lastName: "Doe",
        email: "john@test.com",
        phone: "555-1234",
        householdId: VALID_HH_ID,
        householdName: "Doe Household",
        createdAt: "2024-01-15T00:00:00Z",
        raw: expect.any(Object),
      });
    });

    it("passes limit to SOQL", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
      await adapter.searchContacts(crmCtx, "jane", 5);
      const soql = (query as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
      expect(soql).toContain("LIMIT 5");
    });

    it("uses default limit of 10", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
      await adapter.searchContacts(crmCtx, "test");
      const soql = (query as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
      expect(soql).toContain("LIMIT 10");
    });

    it("wraps SFQueryError into CRMQueryError", async () => {
      (query as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new SFQueryError("bad query", 400));
      await expect(adapter.searchContacts(crmCtx, "x")).rejects.toThrow(CRMQueryError);
    });
  });

  // ── createContacts ────────────────────────────────────────────────────

  describe("createContacts", () => {
    it("delegates to createContactsBatch and returns CRMBatchResult", async () => {
      (createContactsBatch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [{ id: "003A", url: "https://test.salesforce.com/003A", name: "John Doe" }],
        errors: [],
      });

      const result = await adapter.createContacts(crmCtx, [
        { firstName: "John", lastName: "Doe", email: "j@test.com", phone: "555", householdId: VALID_HH_ID },
      ]);
      expect(result.records).toHaveLength(1);
      expect(result.records[0].id).toBe("003A");
      expect(result.errors).toHaveLength(0);
    });

    it("maps householdId to accountId in sf-client call", async () => {
      (createContactsBatch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ records: [], errors: [] });

      await adapter.createContacts(crmCtx, [
        { firstName: "A", lastName: "B", email: "a@b.com", phone: "123", householdId: VALID_HH_ID },
      ]);

      const sfContacts = (createContactsBatch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(sfContacts[0].accountId).toBe(VALID_HH_ID);
    });
  });

  // ── searchHouseholds ──────────────────────────────────────────────────

  describe("searchHouseholds", () => {
    it("returns mapped households with N+1 pagination", async () => {
      // Request limit=2, return 3 records → hasMore=true
      (query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { Id: "001A", Name: "Alpha Household", Description: "Desc", CreatedDate: "2024-01-01T00:00:00Z" },
        { Id: "001B", Name: "Beta Household", Description: "Desc", CreatedDate: "2024-01-02T00:00:00Z" },
        { Id: "001C", Name: "Gamma Household", Description: "Desc", CreatedDate: "2024-01-03T00:00:00Z" },
      ]);

      const result = await adapter.searchHouseholds(crmCtx, "test", 2, 0);
      expect(result.households).toHaveLength(2);
      expect(result.hasMore).toBe(true);
      expect(result.households[0].name).toBe("Alpha Household");
    });

    it("returns hasMore=false when records fit within limit", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        { Id: "001A", Name: "A", Description: "", CreatedDate: "2024-01-01T00:00:00Z" },
      ]);

      const result = await adapter.searchHouseholds(crmCtx, "a", 10, 0);
      expect(result.hasMore).toBe(false);
      expect(result.households).toHaveLength(1);
    });
  });

  // ── getHouseholdDetail ────────────────────────────────────────────────

  describe("getHouseholdDetail", () => {
    it("returns household, contacts, and tasks", async () => {
      (query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ Id: VALID_HH_ID, Name: "Doe Household", Description: "Test", CreatedDate: "2024-01-01T00:00:00Z" }])
        .mockResolvedValueOnce([{ Id: VALID_CONTACT_ID, FirstName: "Jane", LastName: "Doe", Email: "jane@test.com", Phone: "555", CreatedDate: "2024-01-01T00:00:00Z" }])
        .mockResolvedValueOnce([{ Id: VALID_TASK_ID, Subject: "Follow up", Status: "Not Started", Priority: "High", Description: "", CreatedDate: "2024-01-05T00:00:00Z", ActivityDate: "2024-02-01" }]);

      const result = await adapter.getHouseholdDetail(crmCtx, VALID_HH_ID);
      expect(result.household).not.toBeNull();
      expect(result.household!.name).toBe("Doe Household");
      expect(result.contacts).toHaveLength(1);
      expect(result.contacts[0].firstName).toBe("Jane");
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].subject).toBe("Follow up");
    });

    it("returns null household when not found", async () => {
      (query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]);

      const result = await adapter.getHouseholdDetail(crmCtx, VALID_HH_ID);
      expect(result.household).toBeNull();
    });
  });

  // ── createHousehold ───────────────────────────────────────────────────

  describe("createHousehold", () => {
    it("delegates to create with orgQuery fields", async () => {
      (create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "001X", url: "https://test.salesforce.com/001X" });

      const result = await adapter.createHousehold(crmCtx, { name: "Smith Household", description: "New family" });
      expect(result.id).toBe("001X");

      const callArgs = (create as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1]).toBe("Account"); // orgQuery.householdObject()
      expect(callArgs[2]).toEqual({ Name: "Smith Household", Description: "New family", Type: "Household" });
    });
  });

  // ── updateHousehold ───────────────────────────────────────────────────

  describe("updateHousehold", () => {
    it("delegates to update", async () => {
      (update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: VALID_HH_ID, url: `https://test.salesforce.com/${VALID_HH_ID}` });

      const result = await adapter.updateHousehold(crmCtx, VALID_HH_ID, { Description: "Updated" });
      expect(result.id).toBe(VALID_HH_ID);
      expect((update as ReturnType<typeof vi.fn>).mock.calls[0][3]).toEqual({ Description: "Updated" });
    });

    it("wraps SFMutationError into CRMMutationError", async () => {
      (update as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new SFMutationError("fail", 400, "Account"));
      await expect(adapter.updateHousehold(crmCtx, VALID_HH_ID, {})).rejects.toThrow(CRMMutationError);
    });
  });

  // ── findHouseholdByName ───────────────────────────────────────────────

  describe("findHouseholdByName", () => {
    it("returns record when found", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([{ Id: "001Y", Name: "Test Household" }]);

      const result = await adapter.findHouseholdByName(crmCtx, "Test Household");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("001Y");
    });

    it("returns null when not found", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      const result = await adapter.findHouseholdByName(crmCtx, "Ghost");
      expect(result).toBeNull();
    });

    it("includes household filter in SOQL", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);
      await adapter.findHouseholdByName(crmCtx, "Test");
      const soql = (query as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
      expect(soql).toContain("AND Type = 'Household'");
    });
  });

  // ── queryTasks ────────────────────────────────────────────────────────

  describe("queryTasks", () => {
    it("returns tasks and households with pagination", async () => {
      (query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([
          { Id: "00T1", Subject: "Call client", Status: "Not Started", Priority: "High", Description: "", CreatedDate: "2024-01-10T00:00:00Z", ActivityDate: "2024-02-01", What: { Id: VALID_HH_ID, Name: "Doe HH" } },
        ])
        .mockResolvedValueOnce([
          { Id: VALID_HH_ID, Name: "Doe HH", CreatedDate: "2024-01-01T00:00:00Z", Description: "" },
        ]);

      const result = await adapter.queryTasks(crmCtx, 10, 0);
      expect(result.tasks).toHaveLength(1);
      expect(result.tasks[0].subject).toBe("Call client");
      expect(result.tasks[0].householdName).toBe("Doe HH");
      expect(result.households).toHaveLength(1);
      expect(result.hasMore).toBe(false);
    });
  });

  // ── createTask ────────────────────────────────────────────────────────

  describe("createTask", () => {
    it("delegates to sf-client createTask", async () => {
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "00T_NEW", url: "https://test.salesforce.com/00T_NEW" });

      const result = await adapter.createTask(crmCtx, {
        subject: "Follow up",
        householdId: VALID_HH_ID,
        status: "Not Started",
        priority: "High",
      });
      expect(result.id).toBe("00T_NEW");
    });
  });

  // ── createTasksBatch ──────────────────────────────────────────────────

  describe("createTasksBatch", () => {
    it("delegates to sf-client createTasksBatch", async () => {
      (createTasksBatch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [
          { id: "00T_A", url: "https://test.salesforce.com/00T_A" },
          { id: "00T_B", url: "https://test.salesforce.com/00T_B" },
        ],
        errors: [],
      });

      const result = await adapter.createTasksBatch(crmCtx, [
        { subject: "Task A", householdId: VALID_HH_ID },
        { subject: "Task B", householdId: VALID_HH_ID },
      ]);
      expect(result.records).toHaveLength(2);
      expect(result.errors).toHaveLength(0);
    });

    it("propagates errors from batch", async () => {
      (createTasksBatch as ReturnType<typeof vi.fn>).mockResolvedValueOnce({
        records: [{ id: "00T_A", url: "url" }],
        errors: ["Second task failed"],
      });

      const result = await adapter.createTasksBatch(crmCtx, [
        { subject: "Task A", householdId: VALID_HH_ID },
        { subject: "Task B", householdId: VALID_HH_ID },
      ]);
      expect(result.records).toHaveLength(1);
      expect(result.errors).toEqual(["Second task failed"]);
    });
  });

  // ── completeTask ──────────────────────────────────────────────────────

  describe("completeTask", () => {
    it("updates task status to Completed", async () => {
      (update as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: VALID_TASK_ID, url: `https://test.salesforce.com/${VALID_TASK_ID}` });

      const result = await adapter.completeTask(crmCtx, VALID_TASK_ID);
      expect(result.id).toBe(VALID_TASK_ID);

      const callArgs = (update as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(callArgs[1]).toBe("Task");
      expect(callArgs[3]).toEqual({ Status: "Completed" });
    });
  });

  // ── createContactRelationship ─────────────────────────────────────────

  describe("createContactRelationship", () => {
    it("creates FSC relationship record", async () => {
      (create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "a0X1", url: "https://test.salesforce.com/a0X1" });

      const result = await adapter.createContactRelationship!(crmCtx, "003A", "003B", "Spouse");
      expect(result).not.toBeNull();
      expect(result!.id).toBe("a0X1");
    });

    it("returns null when FSC is not installed", async () => {
      (create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new SFMutationError("INVALID_TYPE: FinServ__ContactContactRelation__c", 400, "FinServ__ContactContactRelation__c")
      );

      const result = await adapter.createContactRelationship!(crmCtx, "003A", "003B", "Spouse");
      expect(result).toBeNull();
    });
  });

  // ── createFinancialAccounts ───────────────────────────────────────────

  describe("createFinancialAccounts", () => {
    it("creates FSC financial accounts", async () => {
      (create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "a0F1", url: "https://test.salesforce.com/a0F1" });

      const result = await adapter.createFinancialAccounts!(crmCtx, [
        { name: "John IRA", accountType: "IRA", owner: "John Doe", amount: 100000, householdId: VALID_HH_ID },
      ]);
      expect(result.accounts).toHaveLength(1);
      expect(result.fscAvailable).toBe(true);
    });

    it("degrades gracefully when FSC is absent", async () => {
      (create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new SFMutationError("INVALID_TYPE: sObject type not found", 400, "FinServ__FinancialAccount__c")
      );

      const result = await adapter.createFinancialAccounts!(crmCtx, [
        { name: "Test", accountType: "IRA", owner: "Test", householdId: VALID_HH_ID },
      ]);
      expect(result.accounts).toHaveLength(0);
      expect(result.fscAvailable).toBe(false);
    });

    it("maps known account types to FSC types", async () => {
      (create as ReturnType<typeof vi.fn>).mockResolvedValueOnce({ id: "a0F1", url: "url" });

      await adapter.createFinancialAccounts!(crmCtx, [
        { name: "Roth", accountType: "Roth IRA", owner: "Jane", householdId: VALID_HH_ID },
      ]);

      const fields = (create as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(fields.FinServ__FinancialAccountType__c).toBe("Roth IRA");
      expect(fields.FinServ__TaxStatus__c).toBe("Tax-Free");
    });
  });

  // ── queryFinancialAccounts ────────────────────────────────────────────

  describe("queryFinancialAccounts", () => {
    it("queries and aggregates financial accounts", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([
        {
          Id: "a0F1", Name: "IRA Account",
          FinServ__FinancialAccountType__c: "Individual Retirement",
          FinServ__TaxStatus__c: "Tax-Deferred",
          FinServ__Balance__c: 250000,
          FinServ__Household__c: VALID_HH_ID,
          FinServ__Household__r: { Name: "Doe HH" },
          FinServ__PrimaryOwner__c: "003A",
          FinServ__PrimaryOwner__r: { Name: "John Doe" },
          FinServ__Status__c: "Active",
          FinServ__OpenDate__c: "2023-06-15",
        },
      ]);

      const result = await adapter.queryFinancialAccounts!(crmCtx);
      expect(result.fscAvailable).toBe(true);
      expect(result.accounts).toHaveLength(1);
      expect(result.totalAum).toBe(250000);
      expect(result.aumByHousehold[VALID_HH_ID]).toBe(250000);
      expect(result.accounts[0].accountType).toBe("Individual Retirement");
      expect(result.accounts[0].ownerName).toBe("John Doe");
    });

    it("filters by householdIds when provided", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValueOnce([]);

      await adapter.queryFinancialAccounts!(crmCtx, [VALID_HH_ID]);
      const soql = (query as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
      expect(soql).toContain("WHERE FinServ__Household__c IN");
      expect(soql).toContain(VALID_HH_ID);
    });

    it("degrades gracefully when FSC is absent", async () => {
      (query as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new SFQueryError("INVALID_TYPE: sObject type not found", 400)
      );

      const result = await adapter.queryFinancialAccounts!(crmCtx);
      expect(result.fscAvailable).toBe(false);
      expect(result.accounts).toHaveLength(0);
      expect(result.totalAum).toBe(0);
    });
  });

  // ── Error Mapping ─────────────────────────────────────────────────────

  describe("error mapping", () => {
    it("maps SFQueryError to CRMQueryError with status", async () => {
      (query as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new SFQueryError("SOQL syntax", 400));

      try {
        await adapter.searchContacts(crmCtx, "test");
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(CRMQueryError);
        expect((err as CRMQueryError).status).toBe(400);
        expect((err as CRMQueryError).code).toBe("CRM_QUERY_FAILED");
      }
    });

    it("maps SFMutationError to CRMMutationError with objectType", async () => {
      (create as ReturnType<typeof vi.fn>).mockRejectedValueOnce(
        new SFMutationError("REQUIRED_FIELD_MISSING", 400, "Account")
      );

      try {
        await adapter.createHousehold(crmCtx, { name: "Test", description: "" });
        expect.unreachable("should have thrown");
      } catch (err) {
        expect(err).toBeInstanceOf(CRMMutationError);
        expect((err as CRMMutationError).objectType).toBe("Account");
        expect((err as CRMMutationError).code).toBe("CRM_MUTATION_FAILED");
      }
    });

    it("re-throws unknown errors without wrapping", async () => {
      (query as ReturnType<typeof vi.fn>).mockRejectedValueOnce(new Error("network down"));

      await expect(adapter.searchContacts(crmCtx, "x")).rejects.toThrow("network down");
    });
  });
});

// ─── Factory Tests ──────────────────────────────────────────────────────────

describe("CRM Factory", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    _resetAdapterCache();
    // Reset env var
    delete process.env.NEXT_PUBLIC_CRM_PROVIDER;
  });

  it("defaults to salesforce when env var is unset", () => {
    const adapter = getCRMAdapter();
    expect(adapter.providerId).toBe("salesforce");
    expect(adapter).toBeInstanceOf(SalesforceAdapter);
  });

  it("resolves salesforce when env var is explicitly set", () => {
    process.env.NEXT_PUBLIC_CRM_PROVIDER = "salesforce";
    const adapter = getCRMAdapter();
    expect(adapter.providerId).toBe("salesforce");
  });

  it("is case-insensitive", () => {
    process.env.NEXT_PUBLIC_CRM_PROVIDER = "Salesforce";
    const adapter = getCRMAdapter();
    expect(adapter.providerId).toBe("salesforce");
  });

  it("returns singleton (same instance on repeated calls)", () => {
    const a1 = getCRMAdapter();
    const a2 = getCRMAdapter();
    expect(a1).toBe(a2);
  });

  it("throws for unknown provider", () => {
    process.env.NEXT_PUBLIC_CRM_PROVIDER = "unknown_crm";
    expect(() => getCRMAdapter()).toThrow("Unknown CRM provider: unknown_crm");
  });

  it("getCRMContext resolves SF auth", async () => {
    const ctx = await getCRMContext();
    expect(ctx.auth).toEqual(mockSfCtx);
  });

  it("_resetAdapterCache allows re-resolution", () => {
    const a1 = getCRMAdapter();
    _resetAdapterCache();
    const a2 = getCRMAdapter();
    expect(a1).not.toBe(a2);
    // Both are SalesforceAdapter but different instances
    expect(a1.providerId).toBe(a2.providerId);
  });
});

// ─── Error Type Tests ───────────────────────────────────────────────────────

describe("CRM Error Types", () => {
  it("CRMQueryError has correct code and httpStatus", () => {
    const err = new CRMQueryError("test", 502);
    expect(err.code).toBe("CRM_QUERY_FAILED");
    expect(err.httpStatus).toBe(502);
    expect(err.status).toBe(502);
    expect(err.name).toBe("CRMQueryError");
  });

  it("CRMMutationError has correct code and httpStatus", () => {
    const err = new CRMMutationError("test", 400, "Account");
    expect(err.code).toBe("CRM_MUTATION_FAILED");
    expect(err.httpStatus).toBe(502);
    expect(err.status).toBe(400);
    expect(err.objectType).toBe("Account");
    expect(err.name).toBe("CRMMutationError");
  });
});
