// ─── Financial Account & ConfirmIntent Handler Tests ────────────────────────
//
// Tests the financial account handlers (createFinancialAccounts,
// queryFinancialAccounts) and the confirmIntent handler (household + contact
// batch creation, duplicate detection, workflow triggers).

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

vi.mock("@/lib/workflows", () => ({
  fireWorkflowTrigger: vi.fn().mockResolvedValue({ triggered: [], tasksCreated: 0, skippedSteps: 0, errors: [] }),
}));

vi.mock("@/lib/audit", () => ({
  shouldAudit: vi.fn(() => false),
  writeAuditLog: vi.fn(),
}));

// ─── Imports (after mocks) ───────────────────────────────────────────────────

import { financialAccountHandlers } from "@/app/api/salesforce/handlers/financial-accounts";
import { householdHandlers } from "@/app/api/salesforce/handlers/households";
import { query, create, createContactsBatch } from "@/lib/sf-client";
import { SFQueryError } from "@/lib/sf-client";
import { fireWorkflowTrigger } from "@/lib/workflows";
import { validate } from "@/lib/sf-validation";

const mockCtx = { accessToken: "mock-token", instanceUrl: "https://test.salesforce.com" };
const VALID_HH_ID = "0011234567890ABCDE";
const VALID_CONTACT_ID = "0031234567890ABCDE";

// ═════════════════════════════════════════════════════════════════════════════
// FINANCIAL ACCOUNT HANDLERS
// ═════════════════════════════════════════════════════════════════════════════

describe("financialAccountHandlers", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── createFinancialAccounts ──────────────────────────────────────────────

  describe("createFinancialAccounts", () => {
    const validInput = {
      householdId: VALID_HH_ID,
      primaryContactId: VALID_CONTACT_ID,
      accounts: [
        { type: "IRA", owner: "John Smith", amount: "250,000" },
        { type: "Roth IRA", owner: "Jane Smith", amount: "100,000" },
      ],
    };

    it("creates FSC FinancialAccount records for each account", async () => {
      (create as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "a0B0000000FA01", url: "https://test.salesforce.com/a0B0000000FA01" })
        .mockResolvedValueOnce({ id: "a0B0000000FA02", url: "https://test.salesforce.com/a0B0000000FA02" });

      const response = await financialAccountHandlers.createFinancialAccounts(validInput, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.financialAccounts).toHaveLength(2);
      expect(body.fscAvailable).toBe(true);
      expect(body.count).toBe(2);
      expect(body.financialAccounts[0].accountType).toBe("IRA");
      expect(body.financialAccounts[1].accountType).toBe("Roth IRA");
    });

    it("maps account types to correct FSC types and tax statuses", async () => {
      (create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a0B1", url: "" });

      await financialAccountHandlers.createFinancialAccounts({
        householdId: VALID_HH_ID,
        accounts: [{ type: "IRA", owner: "John" }],
      }, mockCtx);

      const createCall = (create as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(createCall[1]).toBe("FinServ__FinancialAccount__c");
      const fields = createCall[2];
      expect(fields.FinServ__FinancialAccountType__c).toBe("Individual Retirement");
      expect(fields.FinServ__TaxStatus__c).toBe("Tax-Deferred");
      expect(fields.FinServ__Household__c).toBe(VALID_HH_ID);
      expect(fields.FinServ__Status__c).toBe("New");
    });

    it("parses dollar amounts correctly", async () => {
      (create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a0B1", url: "" });

      await financialAccountHandlers.createFinancialAccounts({
        householdId: VALID_HH_ID,
        accounts: [{ type: "Individual", owner: "John", amount: "$1,250,000" }],
      }, mockCtx);

      const fields = (create as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(fields.FinServ__Balance__c).toBe(1250000);
    });

    it("degrades gracefully when FSC is not installed (INVALID_TYPE)", async () => {
      (create as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("INVALID_TYPE: sObject type 'FinServ__FinancialAccount__c' is not supported"));

      const response = await financialAccountHandlers.createFinancialAccounts(validInput, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.fscAvailable).toBe(false);
      expect(body.financialAccounts).toHaveLength(0);
      expect(body.count).toBe(0);
      // Should only attempt first account before breaking
      expect(create).toHaveBeenCalledOnce();
    });

    it("continues on non-FSC errors (partial success)", async () => {
      (create as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce({ id: "a0B1", url: "" })
        .mockRejectedValueOnce(new Error("FIELD_CUSTOM_VALIDATION_EXCEPTION"))
        .mockResolvedValueOnce({ id: "a0B3", url: "" });

      const response = await financialAccountHandlers.createFinancialAccounts({
        householdId: VALID_HH_ID,
        accounts: [
          { type: "IRA", owner: "John" },
          { type: "Roth IRA", owner: "Jane" },
          { type: "Individual", owner: "John" },
        ],
      }, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.financialAccounts).toHaveLength(2);
      expect(body.fscAvailable).toBe(true);
    });

    it("falls back to Brokerage/Taxable for unknown account types", async () => {
      (create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "a0B1", url: "" });

      await financialAccountHandlers.createFinancialAccounts({
        householdId: VALID_HH_ID,
        accounts: [{ type: "Custom Weird Type", owner: "John" }],
      }, mockCtx);

      const fields = (create as ReturnType<typeof vi.fn>).mock.calls[0][2];
      expect(fields.FinServ__FinancialAccountType__c).toBe("Brokerage");
      expect(fields.FinServ__TaxStatus__c).toBe("Taxable");
    });

    it("rejects empty accounts array", async () => {
      await expect(
        financialAccountHandlers.createFinancialAccounts({
          householdId: VALID_HH_ID,
          accounts: [],
        }, mockCtx)
      ).rejects.toThrow("accounts array must not be empty");
    });

    it("rejects too many accounts", async () => {
      const tooMany = Array.from({ length: 21 }, (_, i) => ({ type: "IRA", owner: `Owner ${i}` }));
      await expect(
        financialAccountHandlers.createFinancialAccounts({
          householdId: VALID_HH_ID,
          accounts: tooMany,
        }, mockCtx)
      ).rejects.toThrow("accounts array exceeds maximum of 20");
    });

    it("rejects invalid householdId", async () => {
      await expect(
        financialAccountHandlers.createFinancialAccounts({
          householdId: "bad-id",
          accounts: [{ type: "IRA", owner: "John" }],
        }, mockCtx)
      ).rejects.toThrow("Invalid Salesforce ID");
    });
  });

  // ─── queryFinancialAccounts ───────────────────────────────────────────────

  describe("queryFinancialAccounts", () => {
    it("returns accounts with AUM aggregation", async () => {
      const mockAccounts = [
        { Id: "a0B1", Name: "John — IRA", FinServ__Balance__c: 250000, FinServ__Household__c: "001A" },
        { Id: "a0B2", Name: "Jane — Roth", FinServ__Balance__c: 100000, FinServ__Household__c: "001A" },
        { Id: "a0B3", Name: "Bob — IRA", FinServ__Balance__c: 500000, FinServ__Household__c: "001B" },
      ];
      (query as ReturnType<typeof vi.fn>).mockResolvedValue(mockAccounts);

      const response = await financialAccountHandlers.queryFinancialAccounts({}, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.fscAvailable).toBe(true);
      expect(body.accounts).toHaveLength(3);
      expect(body.totalAum).toBe(850000);
      expect(body.aumByHousehold["001A"]).toBe(350000);
      expect(body.aumByHousehold["001B"]).toBe(500000);
      expect(body.count).toBe(3);
    });

    it("filters by householdIds when provided", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await financialAccountHandlers.queryFinancialAccounts({
        householdIds: [VALID_HH_ID],
      }, mockCtx);

      const soql = (query as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
      expect(soql).toContain("WHERE FinServ__Household__c IN");
      expect(soql).toContain(VALID_HH_ID);
    });

    it("omits WHERE clause when no householdIds", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await financialAccountHandlers.queryFinancialAccounts({}, mockCtx);

      const soql = (query as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
      expect(soql).not.toContain("WHERE");
      expect(soql).toContain("ORDER BY");
    });

    it("degrades gracefully when FSC is not installed", async () => {
      (query as ReturnType<typeof vi.fn>).mockRejectedValue(
        new SFQueryError("sObject type 'FinServ__FinancialAccount__c' is not supported", 400)
      );

      const response = await financialAccountHandlers.queryFinancialAccounts({}, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.fscAvailable).toBe(false);
      expect(body.accounts).toHaveLength(0);
      expect(body.totalAum).toBe(0);
    });

    it("re-throws unexpected query errors", async () => {
      (query as ReturnType<typeof vi.fn>).mockRejectedValue(
        new SFQueryError("Unexpected error", 500)
      );

      await expect(
        financialAccountHandlers.queryFinancialAccounts({}, mockCtx)
      ).rejects.toThrow("Unexpected error");
    });

    it("handles accounts with null/zero balances", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValue([
        { Id: "a0B1", FinServ__Balance__c: null, FinServ__Household__c: "001A" },
        { Id: "a0B2", FinServ__Balance__c: 0, FinServ__Household__c: "001A" },
      ]);

      const response = await financialAccountHandlers.queryFinancialAccounts({}, mockCtx);
      const body = await response.json();

      expect(body.totalAum).toBe(0);
      expect(body.count).toBe(2);
    });

    it("rejects invalid householdIds", async () => {
      await expect(
        financialAccountHandlers.queryFinancialAccounts({
          householdIds: ["bad!"],
        }, mockCtx)
      ).rejects.toThrow("not a valid Salesforce ID");
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// CONFIRM INTENT HANDLER
// ═════════════════════════════════════════════════════════════════════════════

describe("householdHandlers.confirmIntent", () => {
  beforeEach(() => vi.clearAllMocks());

  const validInput = {
    familyName: "Thompson",
    accounts: [
      { type: "IRA", owner: "John Thompson" },
      { type: "Roth IRA", owner: "Jane Thompson" },
    ],
    members: [
      { firstName: "John", lastName: "Thompson", email: "john@example.com", phone: "555-1234" },
      { firstName: "Jane", lastName: "Thompson", email: "jane@example.com", phone: "555-5678" },
    ],
  };

  it("creates household, contacts, and fires workflow trigger", async () => {
    // No existing household
    (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    // Household creation
    (create as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: VALID_HH_ID, url: `https://test.salesforce.com/${VALID_HH_ID}` })
      // FSC relationship creation (may or may not succeed)
      .mockResolvedValueOnce({ id: "a0R1", url: "" });
    // Contact batch
    (createContactsBatch as ReturnType<typeof vi.fn>).mockResolvedValue({
      records: [
        { id: "003A", url: "", name: "John Thompson" },
        { id: "003B", url: "", name: "Jane Thompson" },
      ],
      errors: [],
    });

    const response = await householdHandlers.confirmIntent(validInput, mockCtx);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.household.id).toBe(VALID_HH_ID);
    expect(body.contacts).toHaveLength(2);
    expect(body.workflows).toBeDefined();

    // Verify household creation used orgQuery.newHouseholdFields
    const createCalls = (create as ReturnType<typeof vi.fn>).mock.calls;
    expect(createCalls[0][1]).toBe("Account");
    expect(createCalls[0][2].Name).toBe("Thompson Household");
    expect(createCalls[0][2].Type).toBe("Household");

    // Verify contacts were created with household ID
    const batchCall = (createContactsBatch as ReturnType<typeof vi.fn>).mock.calls[0][1];
    expect(batchCall).toHaveLength(2);
    expect(batchCall[0].accountId).toBe(VALID_HH_ID);
    expect(batchCall[0].firstName).toBe("John");
    expect(batchCall[1].firstName).toBe("Jane");

    // Verify workflow trigger
    expect(fireWorkflowTrigger).toHaveBeenCalledWith(
      mockCtx, "household_created", VALID_HH_ID, "Thompson Household"
    );
  });

  it("returns duplicate warning when household exists and force=false", async () => {
    (query as ReturnType<typeof vi.fn>).mockResolvedValue([
      { Id: "001EXISTING", Name: "Thompson Household" },
    ]);

    const response = await householdHandlers.confirmIntent(validInput, mockCtx);
    const body = await response.json();

    expect(body.success).toBe(false);
    expect(body.isDuplicate).toBe(true);
    expect(body.existingId).toBe("001EXISTING");
    expect(body.existingUrl).toContain("001EXISTING");
    expect(body.error).toContain("already exists");

    // Should NOT create anything
    expect(create).not.toHaveBeenCalled();
    expect(createContactsBatch).not.toHaveBeenCalled();
  });

  it("creates household when force=true despite duplicate", async () => {
    (query as ReturnType<typeof vi.fn>).mockResolvedValue([
      { Id: "001EXISTING", Name: "Thompson Household" },
    ]);
    (create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: VALID_HH_ID, url: "" });
    (createContactsBatch as ReturnType<typeof vi.fn>).mockResolvedValue({ records: [], errors: [] });

    const response = await householdHandlers.confirmIntent({ ...validInput, force: true }, mockCtx);
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.household.id).toBe(VALID_HH_ID);
    expect(create).toHaveBeenCalled();
  });

  it("includes assignedAdvisor in household description", async () => {
    (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: VALID_HH_ID, url: "" });
    (createContactsBatch as ReturnType<typeof vi.fn>).mockResolvedValue({ records: [], errors: [] });

    await householdHandlers.confirmIntent({
      ...validInput,
      assignedAdvisor: "Marcus Rivera",
    }, mockCtx);

    const desc = (create as ReturnType<typeof vi.fn>).mock.calls[0][2].Description as string;
    expect(desc).toContain("Assigned Advisor: Marcus Rivera");
  });

  it("includes account plan in household description", async () => {
    (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: VALID_HH_ID, url: "" });
    (createContactsBatch as ReturnType<typeof vi.fn>).mockResolvedValue({ records: [], errors: [] });

    await householdHandlers.confirmIntent(validInput, mockCtx);

    const desc = (create as ReturnType<typeof vi.fn>).mock.calls[0][2].Description as string;
    expect(desc).toContain("IRA (John Thompson)");
    expect(desc).toContain("Roth IRA (Jane Thompson)");
  });

  it("creates FSC contact relationship for 2+ contacts", async () => {
    (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (create as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: VALID_HH_ID, url: "" })  // household
      .mockResolvedValueOnce({ id: "a0R1", url: "" });        // FSC relationship
    (createContactsBatch as ReturnType<typeof vi.fn>).mockResolvedValue({
      records: [
        { id: "003A", url: "", name: "John" },
        { id: "003B", url: "", name: "Jane" },
      ],
      errors: [],
    });

    const response = await householdHandlers.confirmIntent(validInput, mockCtx);
    const body = await response.json();

    expect(body.relationship).toBeDefined();

    // FSC relationship creation
    const relCall = (create as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(relCall[1]).toBe("FinServ__ContactContactRelation__c");
    expect(relCall[2].FinServ__Contact__c).toBe("003A");
    expect(relCall[2].FinServ__RelatedContact__c).toBe("003B");
    expect(relCall[2].FinServ__Role__c).toBe("Spouse");
  });

  it("degrades gracefully when FSC relationship creation fails", async () => {
    (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (create as ReturnType<typeof vi.fn>)
      .mockResolvedValueOnce({ id: VALID_HH_ID, url: "" })
      .mockRejectedValueOnce(new Error("INVALID_TYPE: FinServ__ContactContactRelation__c"));
    (createContactsBatch as ReturnType<typeof vi.fn>).mockResolvedValue({
      records: [
        { id: "003A", url: "", name: "John" },
        { id: "003B", url: "", name: "Jane" },
      ],
      errors: [],
    });

    const response = await householdHandlers.confirmIntent(validInput, mockCtx);
    const body = await response.json();

    // Should still succeed — FSC is optional
    expect(body.success).toBe(true);
    expect(body.relationship).toBeNull();
  });

  it("skips FSC relationship for single contact", async () => {
    (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);
    (create as ReturnType<typeof vi.fn>).mockResolvedValue({ id: VALID_HH_ID, url: "" });
    (createContactsBatch as ReturnType<typeof vi.fn>).mockResolvedValue({
      records: [{ id: "003A", url: "", name: "John" }],
      errors: [],
    });

    await householdHandlers.confirmIntent({
      familyName: "Solo",
      accounts: [{ type: "IRA", owner: "John" }],
      members: [{ firstName: "John", lastName: "Solo", email: "j@e.com", phone: "555" }],
    }, mockCtx);

    // create should only be called once (household), not twice (no relationship)
    expect(create).toHaveBeenCalledOnce();
  });

  it("rejects missing familyName", async () => {
    await expect(
      householdHandlers.confirmIntent({
        accounts: [{ type: "IRA", owner: "John" }],
        members: [{ firstName: "John", lastName: "Smith", email: "j@e.com", phone: "555" }],
      }, mockCtx)
    ).rejects.toThrow("Missing required field: familyName");
  });

  it("rejects missing accounts array", async () => {
    await expect(
      householdHandlers.confirmIntent({
        familyName: "Smith",
        members: [{ firstName: "John", lastName: "Smith", email: "j@e.com", phone: "555" }],
      }, mockCtx)
    ).rejects.toThrow("Missing required array: accounts");
  });

  it("rejects missing members array", async () => {
    await expect(
      householdHandlers.confirmIntent({
        familyName: "Smith",
        accounts: [{ type: "IRA", owner: "John" }],
      }, mockCtx)
    ).rejects.toThrow("Missing required array: members");
  });

  it("rejects member with missing required fields", async () => {
    await expect(
      householdHandlers.confirmIntent({
        familyName: "Smith",
        accounts: [{ type: "IRA", owner: "John" }],
        members: [{ firstName: "John" }], // missing lastName, email, phone
      }, mockCtx)
    ).rejects.toThrow("Missing required field: lastName");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATION — FINANCIAL & CONFIRM INTENT INPUT SHAPES
// ═════════════════════════════════════════════════════════════════════════════

describe("Financial & ConfirmIntent Validation", () => {
  describe("validate.createFinancialAccounts", () => {
    it("validates complete input", () => {
      const result = validate.createFinancialAccounts({
        householdId: VALID_HH_ID,
        primaryContactId: VALID_CONTACT_ID,
        accounts: [{ type: "IRA", owner: "John" }],
      });
      expect(result.householdId).toBe(VALID_HH_ID);
      expect(result.primaryContactId).toBe(VALID_CONTACT_ID);
      expect(result.accounts).toHaveLength(1);
    });

    it("accepts optional amount field", () => {
      const result = validate.createFinancialAccounts({
        householdId: VALID_HH_ID,
        accounts: [{ type: "IRA", owner: "John", amount: "$250,000" }],
      });
      expect(result.accounts[0].amount).toBe("$250,000");
    });

    it("works without primaryContactId", () => {
      const result = validate.createFinancialAccounts({
        householdId: VALID_HH_ID,
        accounts: [{ type: "IRA", owner: "John" }],
      });
      expect(result.primaryContactId).toBeUndefined();
    });
  });

  describe("validate.confirmIntent", () => {
    it("validates complete input with optional fields", () => {
      const result = validate.confirmIntent({
        familyName: "Smith",
        force: true,
        assignedAdvisor: "Jon Cambras",
        accounts: [{ type: "IRA", owner: "John" }],
        members: [{ firstName: "John", lastName: "Smith", email: "j@e.com", phone: "555" }],
      });
      expect(result.familyName).toBe("Smith");
      expect(result.force).toBe(true);
      expect(result.assignedAdvisor).toBe("Jon Cambras");
    });

    it("defaults force to false", () => {
      const result = validate.confirmIntent({
        familyName: "Smith",
        accounts: [{ type: "IRA", owner: "John" }],
        members: [{ firstName: "John", lastName: "Smith", email: "j@e.com", phone: "555" }],
      });
      expect(result.force).toBe(false);
    });

    it("validates nested account objects", () => {
      expect(() => validate.confirmIntent({
        familyName: "Smith",
        accounts: [{ owner: "John" }], // missing type
        members: [{ firstName: "John", lastName: "Smith", email: "j@e.com", phone: "555" }],
      })).toThrow("Missing required field: type");
    });

    it("validates nested member objects", () => {
      expect(() => validate.confirmIntent({
        familyName: "Smith",
        accounts: [{ type: "IRA", owner: "John" }],
        members: [{ firstName: "John", email: "j@e.com", phone: "555" }], // missing lastName
      })).toThrow("Missing required field: lastName");
    });
  });
});
