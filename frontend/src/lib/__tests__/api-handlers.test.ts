// ─── API Route Handler Integration Tests ─────────────────────────────────────
//
// Tests the handler functions with mocked Salesforce client.
// Covers: queryTasks pagination, searchHouseholds pagination, completeTask,
// createTask, searchContacts, getHouseholdDetail, input validation,
// and the POST dispatcher routing + error handling.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────
// Mock sf-client: keep real validators/errors, stub network operations

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

import { taskHandlers } from "@/app/api/salesforce/handlers/tasks";
import { householdHandlers } from "@/app/api/salesforce/handlers/households";
import { query, update, createTask } from "@/lib/sf-client";
import { validate } from "@/lib/sf-validation";
import { SalesforceAdapter } from "@/lib/crm/adapters/salesforce";
import type { CRMContext } from "@/lib/crm/port";

const mockCtx = { accessToken: "mock-token", instanceUrl: "https://test.salesforce.com" };
const adapter = new SalesforceAdapter();
const crmCtx: CRMContext = { auth: mockCtx, instanceUrl: "https://test.salesforce.com" };

// ═════════════════════════════════════════════════════════════════════════════
// TASK HANDLERS
// ═════════════════════════════════════════════════════════════════════════════

describe("taskHandlers", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("queryTasks", () => {
    it("returns tasks, households, and pagination metadata", async () => {
      const mockTasks = [
        { Id: "00T1", Subject: "Test Task", Status: "Not Started", Priority: "Normal", CreatedDate: "2024-01-01", What: { Name: "Smith HH", Id: "001A" } },
      ];
      const mockHouseholds = [
        { Id: "001A", Name: "Smith HH", CreatedDate: "2024-01-01", Description: "Assigned Advisor: Jon Cambras", Owner: { Name: "API User" } },
      ];

      (query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(mockTasks)      // tasks query
        .mockResolvedValueOnce(mockHouseholds); // households query

      const response = await taskHandlers.queryTasks({ limit: 200 }, adapter, crmCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.tasks).toHaveLength(1);
      expect(body.households).toHaveLength(1);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.tasks.hasMore).toBe(false);
      expect(body.pagination.households.hasMore).toBe(false);
    });

    it("detects hasMore when results exceed limit (N+1 pattern)", async () => {
      // Request limit=2, return 3 records → hasMore=true, slice to 2
      const threeTasks = Array.from({ length: 3 }, (_, i) => ({
        Id: `00T${i}`, Subject: `Task ${i}`, Status: "Not Started", Priority: "Normal",
        CreatedDate: "2024-01-01", What: { Name: "HH", Id: "001A" },
      }));
      const threeHouseholds = Array.from({ length: 3 }, (_, i) => ({
        Id: `001${i}`, Name: `HH ${i}`, CreatedDate: "2024-01-01",
      }));

      (query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce(threeTasks)
        .mockResolvedValueOnce(threeHouseholds);

      const response = await taskHandlers.queryTasks({ limit: 2 }, adapter, crmCtx);
      const body = await response.json();

      expect(body.tasks).toHaveLength(2);
      expect(body.households).toHaveLength(2);
      expect(body.pagination.tasks.hasMore).toBe(true);
      expect(body.pagination.households.hasMore).toBe(true);
    });

    it("includes OFFSET in SOQL when offset > 0", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await taskHandlers.queryTasks({ limit: 50, offset: 100 }, adapter, crmCtx);

      const calls = (query as ReturnType<typeof vi.fn>).mock.calls;
      const taskSoql = calls[0][1] as string;
      const hhSoql = calls[1][1] as string;

      expect(taskSoql).toContain("OFFSET 100");
      expect(hhSoql).toContain("OFFSET 100");
    });

    it("omits OFFSET when offset is 0", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await taskHandlers.queryTasks({ limit: 50 }, adapter, crmCtx);

      const taskSoql = (query as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
      expect(taskSoql).not.toContain("OFFSET");
    });

    it("includes Owner.Name in household SOQL for advisor resolution", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await taskHandlers.queryTasks({ limit: 10 }, adapter, crmCtx);

      const hhSoql = (query as ReturnType<typeof vi.fn>).mock.calls[1][1] as string;
      expect(hhSoql).toContain("Owner.Name");
    });
  });

  describe("completeTask", () => {
    it("marks task as Completed", async () => {
      (update as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "00T1234567890ABCDE",
        url: "https://test.salesforce.com/00T1234567890ABCDE",
      });

      const response = await taskHandlers.completeTask({ taskId: "00T1234567890ABCDE" }, adapter, crmCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.taskId).toBe("00T1234567890ABCDE");
      expect(update).toHaveBeenCalledWith(mockCtx, "Task", "00T1234567890ABCDE", { Status: "Completed" });
    });

    it("rejects invalid Salesforce ID", async () => {
      await expect(
        taskHandlers.completeTask({ taskId: "not-valid!" }, adapter, crmCtx)
      ).rejects.toThrow("Invalid Salesforce ID");
    });
  });

  describe("createTask", () => {
    it("creates a task with provided fields", async () => {
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({
        id: "00T9999999999ABCDE",
        url: "https://test.salesforce.com/00T9999999999ABCDE",
      });

      const response = await taskHandlers.createTask(
        { householdId: "0011234567890ABCDE", subject: "Follow up", status: "Not Started", priority: "High" },
        adapter, crmCtx,
      );
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.taskId).toBe("00T9999999999ABCDE");
      expect(createTask).toHaveBeenCalledWith(mockCtx, expect.objectContaining({
        subject: "Follow up",
        householdId: "0011234567890ABCDE",
        status: "Not Started",
        priority: "High",
      }));
    });

    it("rejects missing subject", async () => {
      await expect(
        taskHandlers.createTask({ householdId: "0011234567890ABCDE" }, adapter, crmCtx)
      ).rejects.toThrow("Missing required field: subject");
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// HOUSEHOLD HANDLERS
// ═════════════════════════════════════════════════════════════════════════════

describe("householdHandlers", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("searchHouseholds", () => {
    it("returns matching households with pagination", async () => {
      const mockResults = [
        { Id: "001A", Name: "Smith Household", CreatedDate: "2024-01-01" },
      ];
      (query as ReturnType<typeof vi.fn>).mockResolvedValue(mockResults);

      const response = await householdHandlers.searchHouseholds({ query: "Smith" }, adapter, crmCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.households).toHaveLength(1);
      expect(body.pagination).toBeDefined();
      expect(body.pagination.hasMore).toBe(false);
      expect(body.pagination.offset).toBe(0);
      expect(body.pagination.limit).toBe(10);
    });

    it("detects hasMore with N+1 pattern", async () => {
      // Default limit=10, so 11 results → hasMore=true
      const elevenResults = Array.from({ length: 11 }, (_, i) => ({
        Id: `001${String(i).padStart(2, "0")}`, Name: `HH ${i}`, CreatedDate: "2024-01-01",
      }));
      (query as ReturnType<typeof vi.fn>).mockResolvedValue(elevenResults);

      const response = await householdHandlers.searchHouseholds({ query: "HH" }, adapter, crmCtx);
      const body = await response.json();

      expect(body.households).toHaveLength(10);
      expect(body.pagination.hasMore).toBe(true);
    });

    it("respects custom limit and offset", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      const response = await householdHandlers.searchHouseholds(
        { query: "Smith", limit: 5, offset: 20 },
        adapter, crmCtx,
      );
      const body = await response.json();

      expect(body.pagination.limit).toBe(5);
      expect(body.pagination.offset).toBe(20);

      const soql = (query as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
      expect(soql).toContain("LIMIT 6"); // N+1
      expect(soql).toContain("OFFSET 20");
    });
  });

  describe("searchContacts", () => {
    it("returns matching contacts", async () => {
      const mockContacts = [
        { Id: "003A", FirstName: "John", LastName: "Smith", Email: "john@example.com" },
      ];
      (query as ReturnType<typeof vi.fn>).mockResolvedValue(mockContacts);

      const response = await householdHandlers.searchContacts({ query: "Smith" }, adapter, crmCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.contacts).toHaveLength(1);
    });

    it("includes search term in SOQL LIKE clause", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);

      await householdHandlers.searchContacts({ query: "Jones" }, adapter, crmCtx);

      const soql = (query as ReturnType<typeof vi.fn>).mock.calls[0][1] as string;
      expect(soql).toContain("Jones");
      expect(soql).toContain("LIKE");
    });
  });

  describe("getHouseholdDetail", () => {
    it("returns household with contacts and tasks in parallel", async () => {
      (query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([{ Id: "001A", Name: "Smith Household" }])
        .mockResolvedValueOnce([{ Id: "003A", FirstName: "John", LastName: "Smith" }])
        .mockResolvedValueOnce([{ Id: "00T1", Subject: "Follow up" }]);

      const response = await householdHandlers.getHouseholdDetail(
        { householdId: "0011234567890ABCDE" },
        adapter, crmCtx,
      );
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.household).toBeDefined();
      expect(body.contacts).toHaveLength(1);
      expect(body.tasks).toHaveLength(1);
      expect(body.householdUrl).toContain("0011234567890ABCDE");
    });

    it("returns null household when not found", async () => {
      (query as ReturnType<typeof vi.fn>)
        .mockResolvedValueOnce([])   // no household
        .mockResolvedValueOnce([])   // no contacts
        .mockResolvedValueOnce([]);  // no tasks

      const response = await householdHandlers.getHouseholdDetail(
        { householdId: "0011234567890ABCDE" },
        adapter, crmCtx,
      );
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.household).toBeNull();
    });

    it("rejects invalid household ID", async () => {
      await expect(
        householdHandlers.getHouseholdDetail({ householdId: "bad-id" }, adapter, crmCtx)
      ).rejects.toThrow("Invalid Salesforce ID");
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// INPUT VALIDATION — PAGINATION PARAMS
// ═════════════════════════════════════════════════════════════════════════════

describe("Pagination Validation", () => {
  describe("validate.queryTasks", () => {
    it("defaults limit=200 and offset=0", () => {
      const result = validate.queryTasks({});
      expect(result.limit).toBe(200);
      expect(result.offset).toBe(0);
    });

    it("clamps limit to [1, 500]", () => {
      expect(validate.queryTasks({ limit: 0 }).limit).toBe(200); // 0 is falsy → default 200
      expect(validate.queryTasks({ limit: -10 }).limit).toBe(1);
      expect(validate.queryTasks({ limit: 1000 }).limit).toBe(500);
      expect(validate.queryTasks({ limit: 100 }).limit).toBe(100);
    });

    it("clamps offset to [0, 2000]", () => {
      expect(validate.queryTasks({ offset: -5 }).offset).toBe(0);
      expect(validate.queryTasks({ offset: 5000 }).offset).toBe(2000);
      expect(validate.queryTasks({ offset: 500 }).offset).toBe(500);
    });
  });

  describe("validate.searchHouseholds", () => {
    it("defaults limit=10 and offset=0", () => {
      const result = validate.searchHouseholds({ query: "Smith" });
      expect(result.limit).toBe(10);
      expect(result.offset).toBe(0);
    });

    it("clamps limit to [1, 50]", () => {
      expect(validate.searchHouseholds({ query: "x", limit: 0 }).limit).toBe(10); // 0 is falsy → default 10
      expect(validate.searchHouseholds({ query: "x", limit: -5 }).limit).toBe(1);
      expect(validate.searchHouseholds({ query: "x", limit: 100 }).limit).toBe(50);
      expect(validate.searchHouseholds({ query: "x", limit: 25 }).limit).toBe(25);
    });

    it("clamps offset to [0, 2000]", () => {
      expect(validate.searchHouseholds({ query: "x", offset: -1 }).offset).toBe(0);
      expect(validate.searchHouseholds({ query: "x", offset: 3000 }).offset).toBe(2000);
    });

    it("rejects missing query", () => {
      expect(() => validate.searchHouseholds({})).toThrow("Missing required field: query");
    });

    it("rejects query exceeding max length", () => {
      expect(() => validate.searchHouseholds({ query: "x".repeat(101) })).toThrow("exceeds max length");
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// POST DISPATCHER — ROUTING & ERROR HANDLING
// ═════════════════════════════════════════════════════════════════════════════

describe("POST Dispatcher", () => {
  let POST: (request: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.clearAllMocks();
    // Dynamic import to get the mocked version
    const routeModule = await import("@/app/api/salesforce/route");
    POST = routeModule.POST;
  });

  function makeRequest(body: unknown): Request {
    return new Request("http://localhost:3000/api/salesforce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
  }

  it("returns 400 for unknown action", async () => {
    const response = await POST(makeRequest({ action: "nonExistentAction", data: {} }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("UNKNOWN_ACTION");
  });

  it("returns 400 for missing action", async () => {
    const response = await POST(makeRequest({ data: {} }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.success).toBe(false);
  });

  it("routes queryTasks to task handler", async () => {
    (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await POST(makeRequest({ action: "queryTasks", data: { limit: 10 } }));
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.pagination).toBeDefined();
  });

  it("routes searchHouseholds to household handler", async () => {
    (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await POST(makeRequest({ action: "searchHouseholds", data: { query: "Smith" } }));
    const body = await response.json();

    expect(body.success).toBe(true);
    expect(body.households).toBeDefined();
  });

  it("returns 400 for validation errors", async () => {
    // completeTask with invalid ID → SFValidationError → 400
    const response = await POST(makeRequest({ action: "completeTask", data: { taskId: "bad!" } }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.error.code).toBe("VALIDATION_ERROR");
  });

  // ─── Request Tracing (Item 9) ─────────────────────────────────────────
  it("includes requestId in successful responses", async () => {
    (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response = await POST(makeRequest({ action: "queryTasks", data: { limit: 10 } }));
    const body = await response.json();

    expect(body.requestId).toBeDefined();
    expect(body.requestId).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("includes requestId in error responses", async () => {
    const response = await POST(makeRequest({ action: "nonExistentAction", data: {} }));
    const body = await response.json();

    expect(body.requestId).toBeDefined();
    expect(typeof body.requestId).toBe("string");
    expect(body.requestId.length).toBe(36); // UUID length
  });

  it("includes requestId in validation error responses", async () => {
    const response = await POST(makeRequest({ action: "completeTask", data: { taskId: "bad!" } }));
    const body = await response.json();

    expect(response.status).toBe(400);
    expect(body.requestId).toBeDefined();
  });

  it("generates unique requestId per request", async () => {
    (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);

    const response1 = await POST(makeRequest({ action: "queryTasks", data: {} }));
    const response2 = await POST(makeRequest({ action: "queryTasks", data: {} }));
    const body1 = await response1.json();
    const body2 = await response2.json();

    expect(body1.requestId).not.toBe(body2.requestId);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// ADVISOR ASSIGNMENT (usePracticeData)
// ═════════════════════════════════════════════════════════════════════════════

describe("Advisor Assignment", () => {
  // Import the pure function directly
  let buildPracticeData: typeof import("@/app/dashboard/usePracticeData").buildPracticeData;
  let KNOWN_ADVISORS: string[];

  beforeEach(async () => {
    const mod = await import("@/app/dashboard/usePracticeData");
    buildPracticeData = mod.buildPracticeData;
    KNOWN_ADVISORS = mod.KNOWN_ADVISORS;
  });

  it("uses advisorName when diverse ownership exists", () => {
    const households = [
      { id: "001A", name: "Smith HH", createdAt: "2024-01-01", advisorName: "Advisor A" },
      { id: "001B", name: "Jones HH", createdAt: "2024-01-01", advisorName: "Advisor B" },
    ];
    const tasks = [
      { id: "00T1", subject: "Test", status: "Not Started", priority: "Normal", createdAt: "2024-01-01", dueDate: "2024-02-01", description: "", householdName: "Smith HH", householdId: "001A" },
    ];
    const data = buildPracticeData(tasks, households, "https://test.salesforce.com");

    // Advisor A should own Smith HH, Advisor B should own Jones HH
    const advisorA = data.advisors.find(a => a.name === "Advisor A");
    const advisorB = data.advisors.find(a => a.name === "Advisor B");
    expect(advisorA).toBeDefined();
    expect(advisorB).toBeDefined();
    expect(advisorA!.households).toBe(1);
    expect(advisorB!.households).toBe(1);
  });

  it("falls back to description parsing when single owner (demo mode)", () => {
    const households = [
      { id: "001A", name: "Smith HH", createdAt: "2024-01-01", description: "Assigned Advisor: Jon Cambras", advisorName: "API User" },
      { id: "001B", name: "Jones HH", createdAt: "2024-01-01", description: "Assigned Advisor: Marcus Rivera", advisorName: "API User" },
    ];
    const data = buildPracticeData([], households, "https://test.salesforce.com");

    const jon = data.advisors.find(a => a.name === "Jon Cambras");
    const marcus = data.advisors.find(a => a.name === "Marcus Rivera");
    expect(jon).toBeDefined();
    expect(marcus).toBeDefined();
  });

  it("uses round-robin when no advisor info available", () => {
    const households = [
      { id: "001A", name: "HH A", createdAt: "2024-01-01" },
      { id: "001B", name: "HH B", createdAt: "2024-01-01" },
    ];
    const data = buildPracticeData([], households, "https://test.salesforce.com");

    // Round-robin assigns households to known advisors
    expect(data.advisors.length).toBeGreaterThanOrEqual(2);
    // Both households should be assigned to advisors from the KNOWN_ADVISORS list
    const advisorNames = data.advisors.map(a => a.name);
    expect(advisorNames.some(n => KNOWN_ADVISORS.includes(n))).toBe(true);
  });
});
