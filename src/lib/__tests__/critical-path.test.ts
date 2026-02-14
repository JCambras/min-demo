// ─── Critical Path Tests ────────────────────────────────────────────────────
//
// Tests covering the riskiest logic in Min:
//   1. SOQL sanitization (security)
//   2. Salesforce ID validation (security)
//   3. Home stats computation (revenue — the $250K screen)
//   4. Task classification (correctness across 8+ consumers)
//   5. Input validation (data integrity)
//   6. Response normalization (client-server contract)
//   7. Date formatting (consistency)

import { describe, it, expect } from "vitest";
import { sanitizeSOQL, isValidSalesforceId, requireSalesforceId, SFValidationError } from "@/lib/sf-client";
import { buildHomeStats } from "@/lib/home-stats";
import type { SFTask, SFHousehold } from "@/lib/home-stats";
import { classifyTask, isComplianceReview, isMeetingNote, isDocuSignSend, isGoal, isFollowUp } from "@/lib/task-subjects";
import { validate } from "@/lib/sf-validation";
import { normalizeResponse } from "@/lib/sf-response";
import { formatDate, formatDateTime, toISODate } from "@/lib/format";
import { assertNever } from "@/lib/types";

// ═════════════════════════════════════════════════════════════════════════════
// 1. SOQL SANITIZATION
// ═════════════════════════════════════════════════════════════════════════════

describe("sanitizeSOQL", () => {
  it("passes through normal strings", () => {
    expect(sanitizeSOQL("John Smith")).toBe("John Smith");
  });

  it("escapes single quotes (SQL injection)", () => {
    expect(sanitizeSOQL("O'Brien")).toBe("O\\'Brien");
    expect(sanitizeSOQL("'; DELETE FROM Account; --")).toBe("\\'; DELETE FROM Account; --");
  });

  it("escapes backslashes before quotes", () => {
    expect(sanitizeSOQL("test\\value")).toBe("test\\\\value");
    expect(sanitizeSOQL("a\\'b")).toBe("a\\\\\\'b");
  });

  it("strips LIKE wildcards", () => {
    expect(sanitizeSOQL("test%")).toBe("test");
    expect(sanitizeSOQL("test_value")).toBe("testvalue");
    expect(sanitizeSOQL("%admin%")).toBe("admin");
  });

  it("strips control characters", () => {
    expect(sanitizeSOQL("test\x00value")).toBe("testvalue");
    expect(sanitizeSOQL("test\nvalue")).toBe("testvalue");
    expect(sanitizeSOQL("test\rvalue")).toBe("testvalue");
  });

  it("truncates at 200 characters", () => {
    const long = "a".repeat(300);
    expect(sanitizeSOQL(long)).toHaveLength(200);
  });

  it("returns empty string for non-string input", () => {
    expect(sanitizeSOQL(undefined)).toBe("");
    expect(sanitizeSOQL(null)).toBe("");
    expect(sanitizeSOQL(42)).toBe("");
    expect(sanitizeSOQL({})).toBe("");
  });

  it("handles combined injection attempts", () => {
    const attack = "' OR '1'='1' --";
    const result = sanitizeSOQL(attack);
    expect(result).not.toContain("'1'='1'");
    expect(result).toContain("\\'");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. SALESFORCE ID VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

describe("isValidSalesforceId", () => {
  it("accepts 15-character alphanumeric IDs", () => {
    expect(isValidSalesforceId("001000000000001")).toBe(true);
    expect(isValidSalesforceId("003Dn00000ABC12")).toBe(true);
  });

  it("accepts 18-character alphanumeric IDs", () => {
    expect(isValidSalesforceId("001000000000001AAA")).toBe(true);
    expect(isValidSalesforceId("003Dn00000ABC12XYZ")).toBe(true);
  });

  it("rejects IDs with wrong length", () => {
    expect(isValidSalesforceId("001")).toBe(false);
    expect(isValidSalesforceId("0010000000000011234567")).toBe(false);
    expect(isValidSalesforceId("00100000000000")).toBe(false); // 14 chars
    expect(isValidSalesforceId("0010000000000011")).toBe(false); // 16 chars
  });

  it("rejects IDs with special characters", () => {
    expect(isValidSalesforceId("001000000000001!")).toBe(false);
    expect(isValidSalesforceId("001000-000000001")).toBe(false);
    expect(isValidSalesforceId("001 00000000001")).toBe(false);
    expect(isValidSalesforceId("001'00000000001")).toBe(false);
  });

  it("rejects non-string input", () => {
    expect(isValidSalesforceId(undefined)).toBe(false);
    expect(isValidSalesforceId(null)).toBe(false);
    expect(isValidSalesforceId(42)).toBe(false);
    expect(isValidSalesforceId({})).toBe(false);
    expect(isValidSalesforceId("")).toBe(false);
  });
});

describe("requireSalesforceId", () => {
  it("returns the ID for valid input", () => {
    expect(requireSalesforceId("001000000000001")).toBe("001000000000001");
  });

  it("throws SFValidationError for invalid input", () => {
    expect(() => requireSalesforceId("bad")).toThrow(SFValidationError);
    expect(() => requireSalesforceId(null)).toThrow(SFValidationError);
  });

  it("includes the label in the error message", () => {
    expect(() => requireSalesforceId("bad", "household ID")).toThrow("household ID");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. BUILD HOME STATS
// ═════════════════════════════════════════════════════════════════════════════

describe("buildHomeStats", () => {
  const now = new Date();
  const yesterday = new Date(now.getTime() - 86400000).toISOString();
  const lastWeek = new Date(now.getTime() - 3 * 86400000).toISOString();
  const twoWeeksAgo = new Date(now.getTime() - 14 * 86400000).toISOString();
  const tomorrow = new Date(now.getTime() + 86400000).toISOString().split("T")[0];
  const pastDue = new Date(now.getTime() - 2 * 86400000).toISOString().split("T")[0];

  const households: SFHousehold[] = [
    { Id: "001000000000001", Name: "Smith Household", CreatedDate: twoWeeksAgo },
    { Id: "001000000000002", Name: "Jones Household", CreatedDate: lastWeek, Description: "Assigned Advisor: Jon Cambras" },
  ];

  const tasks: SFTask[] = [
    { Id: "t1", Subject: "COMPLIANCE REVIEW PASSED — Smith", Status: "Completed", Priority: "Normal", CreatedDate: lastWeek, ActivityDate: "", What: { Name: "Smith Household", Id: "001000000000001" } },
    { Id: "t2", Subject: "SEND DOCU — Smith IRA", Status: "Not Started", Priority: "High", CreatedDate: yesterday, ActivityDate: pastDue, What: { Name: "Smith Household", Id: "001000000000001" } },
    { Id: "t3", Subject: "MEETING NOTE — Jones", Status: "Completed", Priority: "Normal", CreatedDate: lastWeek, ActivityDate: "", What: { Name: "Jones Household", Id: "001000000000002" } },
    { Id: "t4", Subject: "FOLLOW-UP: Call Jones", Status: "Not Started", Priority: "Normal", CreatedDate: yesterday, ActivityDate: tomorrow, What: { Name: "Jones Household", Id: "001000000000002" } },
  ];

  const url = "https://test.salesforce.com";

  it("computes correct counts", () => {
    const stats = buildHomeStats(tasks, households, url);
    expect(stats.openTasks).toBe(2); // t2 + t4
    expect(stats.overdueTasks).toBe(1); // t2 (past due)
    expect(stats.unsignedEnvelopes).toBe(1); // t2
    expect(stats.readyForReview).toBe(1); // Jones (Smith has a review)
  });

  it("filters by advisor when specified", () => {
    const stats = buildHomeStats(tasks, households, url, "Jon Cambras");
    // Jon only has Jones Household
    expect(stats.readyForReview).toBe(1); // Jones has no review
    expect(stats.openTasks).toBe(1); // t4 (Jones follow-up)
    expect(stats.unsignedEnvelopes).toBe(0); // t2 is Smith's, not Jon's
  });

  it("returns empty stats for no data", () => {
    const stats = buildHomeStats([], [], url);
    expect(stats.openTasks).toBe(0);
    expect(stats.overdueTasks).toBe(0);
    expect(stats.readyForReview).toBe(0);
    expect(stats.unsignedEnvelopes).toBe(0);
    expect(stats.upcomingMeetings).toBe(0);
    expect(stats.recentItems).toHaveLength(0);
  });

  it("classifies recent items correctly", () => {
    const stats = buildHomeStats(tasks, households, url);
    const types = stats.recentItems.map(r => r.type);
    expect(types).toContain("compliance");
    expect(types).toContain("meeting");
  });

  it("generates valid Salesforce URLs", () => {
    const stats = buildHomeStats(tasks, households, url);
    stats.overdueTaskItems.forEach(item => {
      expect(item.url).toMatch(/^https:\/\/test\.salesforce\.com\//);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. TASK CLASSIFICATION
// ═════════════════════════════════════════════════════════════════════════════

describe("classifyTask", () => {
  it("classifies compliance reviews", () => {
    expect(classifyTask("COMPLIANCE REVIEW PASSED — Smith")).toBe("compliance");
    expect(classifyTask("COMPLIANCE REVIEW FLAGGED — Jones")).toBe("compliance");
  });

  it("classifies meeting notes", () => {
    expect(classifyTask("MEETING NOTE — Smith (Annual)")).toBe("meeting");
  });

  it("classifies DocuSign tasks", () => {
    expect(classifyTask("SEND DOCU — Smith IRA")).toBe("docusign");
    expect(classifyTask("DocuSign configured — 3 envelopes")).toBe("docusign");
  });

  it("classifies follow-ups", () => {
    expect(classifyTask("FOLLOW-UP: Call about rollover")).toBe("followup");
  });

  it("classifies goals", () => {
    expect(classifyTask("GOAL: Retirement readiness review")).toBe("goal");
  });

  it("defaults to task for unknown subjects", () => {
    expect(classifyTask("Funding configured — Smith")).toBe("task");
    expect(classifyTask("MoneyLink setup — Chase")).toBe("task");
    expect(classifyTask("")).toBe("task");
  });
});

describe("task matchers", () => {
  it("isComplianceReview matches correctly", () => {
    expect(isComplianceReview("COMPLIANCE REVIEW PASSED")).toBe(true);
    expect(isComplianceReview("Some other task")).toBe(false);
    expect(isComplianceReview(undefined)).toBe(false);
  });

  it("isMeetingNote matches correctly", () => {
    expect(isMeetingNote("MEETING NOTE — Smith")).toBe(true);
    expect(isMeetingNote("Meeting scheduled")).toBe(false);
  });

  it("isDocuSignSend matches SEND DOCU and DocuSign", () => {
    expect(isDocuSignSend("SEND DOCU — IRA")).toBe(true);
    expect(isDocuSignSend("DocuSign configured")).toBe(true);
    expect(isDocuSignSend("Some other task")).toBe(false);
  });

  it("isGoal matches GOAL:, PLAN:, MILESTONE:", () => {
    expect(isGoal("GOAL: Retirement")).toBe(true);
    expect(isGoal("PLAN: Estate")).toBe(true);
    expect(isGoal("MILESTONE: AUM target")).toBe(true);
    expect(isGoal("Regular task")).toBe(false);
  });

  it("isFollowUp matches FOLLOW-UP", () => {
    expect(isFollowUp("FOLLOW-UP: Call Jones")).toBe(true);
    expect(isFollowUp("Follow up on meeting")).toBe(false);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. INPUT VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

describe("validate", () => {
  describe("searchContacts", () => {
    it("accepts valid input", () => {
      expect(validate.searchContacts({ query: "Smith" })).toEqual({ query: "Smith" });
    });

    it("rejects missing query", () => {
      expect(() => validate.searchContacts({})).toThrow(SFValidationError);
      expect(() => validate.searchContacts({ query: "" })).toThrow(SFValidationError);
    });

    it("rejects non-object input", () => {
      expect(() => validate.searchContacts(null)).toThrow(SFValidationError);
      expect(() => validate.searchContacts("string")).toThrow(SFValidationError);
    });
  });

  describe("completeTask", () => {
    it("accepts valid Salesforce ID", () => {
      expect(validate.completeTask({ taskId: "00T000000000001" })).toEqual({ taskId: "00T000000000001" });
    });

    it("rejects invalid ID", () => {
      expect(() => validate.completeTask({ taskId: "bad-id" })).toThrow(SFValidationError);
      expect(() => validate.completeTask({ taskId: "'; DROP TABLE --" })).toThrow(SFValidationError);
    });
  });

  describe("queryTasks", () => {
    it("defaults limit to 200", () => {
      expect(validate.queryTasks({})).toEqual({ limit: 200 });
    });

    it("clamps limit to 500 max", () => {
      expect(validate.queryTasks({ limit: 9999 })).toEqual({ limit: 500 });
    });

    it("clamps limit to 1 min", () => {
      expect(validate.queryTasks({ limit: -5 })).toEqual({ limit: 1 });
    });
  });

  describe("getHouseholdDetail", () => {
    it("accepts valid household ID", () => {
      const result = validate.getHouseholdDetail({ householdId: "001000000000001" });
      expect(result.householdId).toBe("001000000000001");
    });

    it("rejects invalid household ID", () => {
      expect(() => validate.getHouseholdDetail({ householdId: "not-valid" })).toThrow(SFValidationError);
    });
  });

  describe("recordComplianceReview", () => {
    it("accepts valid compliance review data", () => {
      const result = validate.recordComplianceReview({
        householdId: "001000000000001",
        familyName: "Smith",
        passed: true,
        failCount: 0,
        checks: [{ label: "ADV", status: "pass", detail: "Current" }],
      });
      expect(result.passed).toBe(true);
      expect(result.checks).toHaveLength(1);
    });

    it("rejects missing required fields", () => {
      expect(() => validate.recordComplianceReview({ householdId: "001000000000001" })).toThrow(SFValidationError);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. RESPONSE NORMALIZATION
// ═════════════════════════════════════════════════════════════════════════════

describe("normalizeResponse", () => {
  it("passes through success responses", () => {
    const raw = { success: true, tasks: [], households: [] };
    const result = normalizeResponse(raw);
    expect(result.success).toBe(true);
  });

  it("normalizes new structured error format", () => {
    const raw = { success: false, error: { code: "VALIDATION_ERROR", message: "Bad input" } };
    const result = normalizeResponse(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Bad input");
      expect(result.errorCode).toBe("VALIDATION_ERROR");
    }
  });

  it("normalizes old flat error format", () => {
    const raw = { success: false, error: "Something went wrong" };
    const result = normalizeResponse(raw);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe("Something went wrong");
      expect(typeof result.errorCode).toBe("string");
    }
  });

  it("preserves extra fields like isDuplicate", () => {
    const raw = { success: false, isDuplicate: true, existingId: "001xxx", error: "Already exists" };
    const result = normalizeResponse(raw);
    expect(result.isDuplicate).toBe(true);
    expect(result.existingId).toBe("001xxx");
  });

  it("handles missing error field gracefully", () => {
    const raw = { success: false };
    const result = normalizeResponse(raw);
    if (!result.success) {
      expect(result.error).toBe("Unknown error");
      expect(result.errorCode).toBe("INTERNAL_ERROR");
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. DATE FORMATTING
// ═════════════════════════════════════════════════════════════════════════════

describe("formatDate", () => {
  it("formats ISO strings consistently", () => {
    const result = formatDate("2026-02-14T12:00:00Z");
    expect(result).toMatch(/Feb/);
    expect(result).toMatch(/14/);
    expect(result).toMatch(/2026/);
  });

  it("returns fallback for undefined/null", () => {
    expect(formatDate(undefined)).toBe("");
    expect(formatDate(null)).toBe("");
    expect(formatDate(null, "N/A")).toBe("N/A");
  });

  it("returns fallback for invalid dates", () => {
    expect(formatDate("not-a-date")).toBe("");
    expect(formatDate("not-a-date", "Invalid")).toBe("Invalid");
  });

  it("accepts Date objects", () => {
    const result = formatDate(new Date(2026, 1, 14));
    expect(result).toMatch(/Feb/);
    expect(result).toMatch(/14/);
  });
});

describe("toISODate", () => {
  it("returns YYYY-MM-DD format", () => {
    const result = toISODate(new Date(2026, 1, 14));
    expect(result).toBe("2026-02-14");
  });

  it("returns today if no input", () => {
    const result = toISODate();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 8. ASSERT NEVER (EXHAUSTIVENESS)
// ═════════════════════════════════════════════════════════════════════════════

describe("assertNever", () => {
  it("throws with a message for unexpected values", () => {
    expect(() => assertNever("unexpected" as never)).toThrow("Unexpected value: unexpected");
  });

  it("throws custom message when provided", () => {
    expect(() => assertNever("x" as never, "Unhandled screen")).toThrow("Unhandled screen");
  });
});
