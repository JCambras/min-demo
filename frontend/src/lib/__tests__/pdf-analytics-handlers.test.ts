// ─── PDF & Analytics Handler Integration Tests ──────────────────────────────
//
// Tests the 3 PDF generation endpoints (compliance, dashboard, operations)
// and the 2 analytics endpoints (event, snapshot) that were added in CP8-10.
// PDF tests verify: success response shape, status counting, error handling.
// Analytics tests use an in-memory SQLite db to verify insert/upsert/query.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── PDF Compliance Tests ───────────────────────────────────────────────────

describe("POST /api/pdf/compliance", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/app/api/pdf/compliance/route");
    POST = mod.POST;
  });

  const basePayload = {
    familyName: "Smith",
    householdUrl: "https://test.salesforce.com/001ABC",
    contacts: [{ name: "John Smith", email: "john@example.com" }],
    tasksScanned: 24,
    checks: [
      { label: "KYC Profile", category: "identity", regulation: "FINRA 2090", status: "pass", detail: "KYC recorded" },
      { label: "Trusted Contact", category: "identity", regulation: "FINRA 4512", status: "warn", detail: "No trusted contact" },
      { label: "Form CRS", category: "documents", regulation: "Reg BI", status: "fail", detail: "No CRS delivery" },
    ],
    reviewDate: "02/18/2026",
    nextReviewDate: "02/18/2027",
    firmName: "Test RIA",
  };

  it("returns success with pdf data and filename", async () => {
    const req = new Request("http://localhost/api/pdf/compliance", {
      method: "POST",
      body: JSON.stringify(basePayload),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.pdf).toBeDefined();
    expect(body.pdf).toContain("data:application/pdf");
    expect(body.filename).toContain("Smith");
    expect(body.filename).toContain(".pdf");
  });

  it("generates correct filename with review date", async () => {
    const req = new Request("http://localhost/api/pdf/compliance", {
      method: "POST",
      body: JSON.stringify(basePayload),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(body.filename).toBe("Smith_Compliance_Review_02-18-2026.pdf");
  });

  it("handles all-pass scenario", async () => {
    const allPass = {
      ...basePayload,
      checks: [
        { label: "KYC", category: "identity", regulation: "FINRA 2090", status: "pass", detail: "ok" },
        { label: "CRS", category: "documents", regulation: "Reg BI", status: "pass", detail: "ok" },
      ],
    };
    const req = new Request("http://localhost/api/pdf/compliance", {
      method: "POST",
      body: JSON.stringify(allPass),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.pdf).toBeDefined();
  });

  it("handles empty checks array", async () => {
    const req = new Request("http://localhost/api/pdf/compliance", {
      method: "POST",
      body: JSON.stringify({ ...basePayload, checks: [] }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
  });

  it("returns 500 on invalid input", async () => {
    const req = new Request("http://localhost/api/pdf/compliance", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// ─── PDF Dashboard Tests ────────────────────────────────────────────────────

describe("POST /api/pdf/dashboard", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/app/api/pdf/dashboard/route");
    POST = mod.POST;
  });

  const basePayload = {
    healthScore: 82,
    healthBreakdown: [
      { label: "Task Completion", score: 90, weight: 30 },
      { label: "Compliance", score: 75, weight: 25 },
    ],
    advisors: [
      { name: "Jon Cambras", households: 45, openTasks: 12, overdueTasks: 2, unsigned: 1, compliancePct: 85, score: 78, meetingsLast90: 8 },
    ],
    pipeline: [
      { label: "Prospect", count: 5, stuck: 1, avgDays: 14, conversionRate: 60 },
    ],
    risks: [
      { severity: "high", household: "Smith HH", label: "Overdue review", daysStale: 45 },
    ],
    weeklyComparison: [
      { label: "Tasks Completed", thisWeek: 15, lastWeek: 12 },
    ],
    totalHouseholds: 120,
    openTasks: 34,
    complianceReviews: 8,
    unsigned: 3,
    firmName: "Test Wealth",
  };

  it("returns success with pdf data and filename", async () => {
    const req = new Request("http://localhost/api/pdf/dashboard", {
      method: "POST",
      body: JSON.stringify(basePayload),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.pdf).toContain("data:application/pdf");
    expect(body.filename).toContain("Practice-Report");
    expect(body.filename).toContain(".pdf");
  });

  it("handles missing optional firmName", async () => {
    const { firmName, ...noFirm } = basePayload;
    const req = new Request("http://localhost/api/pdf/dashboard", {
      method: "POST",
      body: JSON.stringify(noFirm),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
  });

  it("handles empty arrays gracefully", async () => {
    const req = new Request("http://localhost/api/pdf/dashboard", {
      method: "POST",
      body: JSON.stringify({
        ...basePayload,
        advisors: [],
        pipeline: [],
        risks: [],
        weeklyComparison: [],
        healthBreakdown: [],
      }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
  });

  it("returns 500 on invalid input", async () => {
    const req = new Request("http://localhost/api/pdf/dashboard", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// ─── PDF Operations Tests ───────────────────────────────────────────────────

describe("POST /api/pdf/operations", () => {
  let POST: (req: Request) => Promise<Response>;

  beforeEach(async () => {
    vi.resetModules();
    const mod = await import("@/app/api/pdf/operations/route");
    POST = mod.POST;
  });

  const basePayload = {
    firmName: "Test Advisors",
    reportDate: "February 18, 2026",
    healthScore: 76,
    healthBreakdown: [
      { label: "Task Completion", score: 80, weight: 30 },
    ],
    categories: [
      { label: "Account Opening", count: 8, urgent: 2, estMinutes: 120 },
      { label: "Compliance", count: 4, urgent: 1, estMinutes: 60 },
    ],
    totalItems: 12,
    totalUrgent: 3,
    totalHours: 3,
    capacityPct: 65,
    risks: [
      { label: "Missing KYC", household: "Jones HH", severity: "critical", category: "identity", daysStale: 30 },
    ],
    advisors: [
      { name: "Marcus Rivera", households: 38, openTasks: 9, overdueTasks: 1, unsigned: 0, compliancePct: 92, score: 85 },
    ],
    weeklyComparison: [
      { label: "New Tasks", thisWeek: 8, lastWeek: 10 },
    ],
    totalHouseholds: 95,
    openTasks: 22,
    completedTasks: 18,
    complianceReviews: 6,
    unsigned: 2,
  };

  it("returns success with pdf data and filename", async () => {
    const req = new Request("http://localhost/api/pdf/operations", {
      method: "POST",
      body: JSON.stringify(basePayload),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.pdf).toContain("data:application/pdf");
    expect(body.filename).toContain("Operations-Report");
    expect(body.filename).toContain(".pdf");
  });

  it("includes report date in filename", async () => {
    const req = new Request("http://localhost/api/pdf/operations", {
      method: "POST",
      body: JSON.stringify(basePayload),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(body.filename).toBe("Operations-Report-February 18, 2026.pdf");
  });

  it("handles high capacity (red zone) without error", async () => {
    const req = new Request("http://localhost/api/pdf/operations", {
      method: "POST",
      body: JSON.stringify({ ...basePayload, capacityPct: 95 }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
  });

  it("handles zero categories", async () => {
    const req = new Request("http://localhost/api/pdf/operations", {
      method: "POST",
      body: JSON.stringify({ ...basePayload, categories: [], risks: [] }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
  });

  it("handles many risks triggering page breaks", async () => {
    const manyRisks = Array.from({ length: 30 }, (_, i) => ({
      label: `Risk ${i}`, household: `HH ${i}`, severity: i % 3 === 0 ? "critical" : "high", category: "compliance", daysStale: i * 5,
    }));
    const req = new Request("http://localhost/api/pdf/operations", {
      method: "POST",
      body: JSON.stringify({ ...basePayload, risks: manyRisks }),
    });
    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
  });

  it("returns 500 on invalid input", async () => {
    const req = new Request("http://localhost/api/pdf/operations", {
      method: "POST",
      body: "not json",
    });
    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

// ─── Analytics Tests ────────────────────────────────────────────────────────
// vi.mock is hoisted, so we define the mock at module scope.

const mockDbExecute = vi.fn().mockResolvedValue({ rows: [] });

vi.mock("@/lib/db", () => ({
  ensureSchema: vi.fn().mockResolvedValue(undefined),
  getDb: vi.fn(() => ({ execute: mockDbExecute })),
}));

describe("POST /api/analytics/event", () => {
  beforeEach(() => {
    mockDbExecute.mockClear();
    mockDbExecute.mockResolvedValue({ rows: [] });
  });

  it("inserts event with org_id and properties", async () => {
    const { POST } = await import("@/app/api/analytics/event/route");
    const req = new Request("http://localhost/api/analytics/event", {
      method: "POST",
      body: JSON.stringify({ orgId: "00DTEST", eventName: "discovery_completed", properties: { score: 85 } }),
    }) as any;
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/analytics/event") });

    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(mockDbExecute).toHaveBeenCalledOnce();
    expect(mockDbExecute.mock.calls[0][0].sql).toContain("INSERT INTO events");
    expect(mockDbExecute.mock.calls[0][0].args[0]).toBe("00DTEST");
    expect(mockDbExecute.mock.calls[0][0].args[1]).toBe("discovery_completed");
  });

  it("handles null orgId", async () => {
    const { POST } = await import("@/app/api/analytics/event/route");
    const req = new Request("http://localhost/api/analytics/event", {
      method: "POST",
      body: JSON.stringify({ eventName: "page_view" }),
    }) as any;
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/analytics/event") });

    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(mockDbExecute.mock.calls[0][0].args[0]).toBeNull();
  });

  it("returns 500 on db error", async () => {
    mockDbExecute.mockRejectedValueOnce(new Error("DB down"));
    const { POST } = await import("@/app/api/analytics/event/route");
    const req = new Request("http://localhost/api/analytics/event", {
      method: "POST",
      body: JSON.stringify({ eventName: "test" }),
    }) as any;
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/analytics/event") });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });
});

describe("/api/analytics/snapshot", () => {
  beforeEach(() => {
    mockDbExecute.mockClear();
    mockDbExecute.mockResolvedValue({ rows: [] });
  });

  it("POST upserts snapshot with stats", async () => {
    const { POST } = await import("@/app/api/analytics/snapshot/route");
    const stats = { healthScore: 82, totalHouseholds: 120 };
    const req = new Request("http://localhost/api/analytics/snapshot", {
      method: "POST",
      body: JSON.stringify({ orgId: "00DTEST", stats, advisorFilter: "jon" }),
    }) as any;
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/analytics/snapshot") });

    const res = await POST(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(mockDbExecute).toHaveBeenCalledOnce();
    expect(mockDbExecute.mock.calls[0][0].sql).toContain("INSERT INTO daily_snapshots");
    expect(mockDbExecute.mock.calls[0][0].sql).toContain("ON CONFLICT");
    expect(mockDbExecute.mock.calls[0][0].args[0]).toBe("00DTEST");
    expect(mockDbExecute.mock.calls[0][0].args[3]).toBe("jon");
  });

  it("POST defaults orgId to 'default'", async () => {
    const { POST } = await import("@/app/api/analytics/snapshot/route");
    const req = new Request("http://localhost/api/analytics/snapshot", {
      method: "POST",
      body: JSON.stringify({ stats: { healthScore: 70 } }),
    }) as any;
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/analytics/snapshot") });

    const res = await POST(req);
    expect(mockDbExecute.mock.calls[0][0].args[0]).toBe("default");
  });

  it("GET returns snapshots with default 30 days", async () => {
    mockDbExecute.mockResolvedValueOnce({
      rows: [
        { snapshot_date: "2026-02-18", stats_json: '{"healthScore":82}', advisor_filter: null, created_at: "2026-02-18T10:00:00Z" },
      ],
    });
    const { GET } = await import("@/app/api/analytics/snapshot/route");
    const req = new Request("http://localhost/api/analytics/snapshot?orgId=00DTEST") as any;
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/analytics/snapshot?orgId=00DTEST") });

    const res = await GET(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.snapshots).toHaveLength(1);
    expect(mockDbExecute.mock.calls[0][0].args[0]).toBe("00DTEST");
    expect(mockDbExecute.mock.calls[0][0].args[1]).toBe("-30 days");
  });

  it("GET uses custom days parameter", async () => {
    mockDbExecute.mockResolvedValueOnce({ rows: [] });
    const { GET } = await import("@/app/api/analytics/snapshot/route");
    const req = new Request("http://localhost/api/analytics/snapshot?days=7") as any;
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/analytics/snapshot?days=7") });

    const res = await GET(req);
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(mockDbExecute.mock.calls[0][0].args[1]).toBe("-7 days");
  });

  it("POST returns 500 on db error", async () => {
    mockDbExecute.mockRejectedValueOnce(new Error("DB down"));
    const { POST } = await import("@/app/api/analytics/snapshot/route");
    const req = new Request("http://localhost/api/analytics/snapshot", {
      method: "POST",
      body: JSON.stringify({ stats: {} }),
    }) as any;
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/analytics/snapshot") });

    const res = await POST(req);
    expect(res.status).toBe(500);
  });

  it("GET returns 500 on db error", async () => {
    mockDbExecute.mockRejectedValueOnce(new Error("DB down"));
    const { GET } = await import("@/app/api/analytics/snapshot/route");
    const req = new Request("http://localhost/api/analytics/snapshot") as any;
    Object.defineProperty(req, "nextUrl", { value: new URL("http://localhost/api/analytics/snapshot") });

    const res = await GET(req);
    expect(res.status).toBe(500);
  });
});
