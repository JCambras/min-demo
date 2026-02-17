// ─── SF Client Tests (Phase 3) ──────────────────────────────────────────────
//
// Tests for sanitizeSOQL escaping, query pagination, and batch chunking.

import { describe, it, expect, vi, beforeEach } from "vitest";
import { sanitizeSOQL } from "../sf-client";

// ─── sanitizeSOQL ─────────────────────────────────────────────────────────

describe("sanitizeSOQL — Phase 3 escaping", () => {
  it("escapes % instead of stripping", () => {
    expect(sanitizeSOQL("test%")).toBe("test\\%");
    expect(sanitizeSOQL("%admin%")).toBe("\\%admin\\%");
  });

  it("escapes _ instead of stripping", () => {
    expect(sanitizeSOQL("test_value")).toBe("test\\_value");
    expect(sanitizeSOQL("__c")).toBe("\\_\\_c");
  });

  it("escapes single quotes", () => {
    expect(sanitizeSOQL("O'Brien")).toBe("O\\'Brien");
    expect(sanitizeSOQL("'; DROP TABLE--")).toContain("\\'");
  });

  it("strips control characters", () => {
    expect(sanitizeSOQL("test\x00val")).toBe("testval");
    expect(sanitizeSOQL("a\nb\rc")).toBe("abc");
  });

  it("truncates at 200 characters", () => {
    const long = "a".repeat(300);
    expect(sanitizeSOQL(long)).toHaveLength(200);
  });

  it("returns empty string for non-string input", () => {
    expect(sanitizeSOQL(undefined)).toBe("");
    expect(sanitizeSOQL(null)).toBe("");
    expect(sanitizeSOQL(42)).toBe("");
  });
});

// ─── query() pagination ──────────────────────────────────────────────────────

// We need to mock fetch at the module level to test the internal query logic.
// Since query() uses sfFetch which calls the global fetch, we mock fetch directly.

describe("query — pagination", () => {
  const mockCtx = { accessToken: "mock-token", instanceUrl: "https://test.salesforce.com" };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("follows nextRecordsUrl for multi-page results", async () => {
    // Dynamically import to get the real module (not mock)
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // Page 1: done=false with nextRecordsUrl
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      done: false,
      totalSize: 4,
      nextRecordsUrl: "/services/data/v59.0/query/01gxx0000004gRk-2000",
      records: [{ Id: "001A" }, { Id: "001B" }],
    }), { status: 200 }));

    // Page 2: done=true
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      done: true,
      totalSize: 4,
      records: [{ Id: "001C" }, { Id: "001D" }],
    }), { status: 200 }));

    // Re-import to use the real query function
    const { query } = await import("../sf-client");
    const results = await query(mockCtx, "SELECT Id FROM Account");

    expect(results).toHaveLength(4);
    expect(results.map(r => r.Id)).toEqual(["001A", "001B", "001C", "001D"]);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("stops at done: true on first page", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      done: true,
      totalSize: 2,
      records: [{ Id: "001A" }, { Id: "001B" }],
    }), { status: 200 }));

    const { query } = await import("../sf-client");
    const results = await query(mockCtx, "SELECT Id FROM Account");

    expect(results).toHaveLength(2);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("stops when nextRecordsUrl fetch fails", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      done: false,
      totalSize: 10,
      nextRecordsUrl: "/services/data/v59.0/query/next-page",
      records: [{ Id: "001A" }],
    }), { status: 200 }));

    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      message: "Session expired",
    }), { status: 401 }));

    const { query } = await import("../sf-client");
    const results = await query(mockCtx, "SELECT Id FROM Account");

    // Should return first page results only
    expect(results).toHaveLength(1);
  });
});

// ─── createTasksBatch — chunking ─────────────────────────────────────────────

describe("createTasksBatch — auto-batch beyond 25", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("processes 30 inputs in 2 batches (25+5)", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch");

    // Build 30 task inputs
    const inputs = Array.from({ length: 30 }, (_, i) => ({
      subject: `Task ${i}`,
      householdId: "001000000000001AAA",
    }));

    // Batch 1 (25 items): Composite API response
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      compositeResponse: Array.from({ length: 25 }, (_, i) => ({
        httpStatusCode: 201,
        body: { id: `00T_batch1_${i}`, success: true },
      })),
    }), { status: 200 }));

    // Batch 2 (5 items): Composite API response
    fetchSpy.mockResolvedValueOnce(new Response(JSON.stringify({
      compositeResponse: Array.from({ length: 5 }, (_, i) => ({
        httpStatusCode: 201,
        body: { id: `00T_batch2_${i}`, success: true },
      })),
    }), { status: 200 }));

    const { createTasksBatch } = await import("../sf-client");
    const result = await createTasksBatch(
      { accessToken: "mock-token", instanceUrl: "https://test.salesforce.com" },
      inputs
    );

    expect(result.records).toHaveLength(30);
    expect(result.errors).toHaveLength(0);
    // Should have made 2 Composite API calls
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
