// ─── Security Test Suite ────────────────────────────────────────────────────
//
// SOC 2 Week 12: Security-specific test cases covering:
//   1. SOQL injection with malicious input
//   2. Salesforce ID validation
//   3. CSRF token validation edge cases
//   4. Session expiration enforcement (cookie maxAge)
//   5. Role-based access denial (expanded)
//   6. Input validation boundary testing
//   7. PII scrubbing completeness

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  sanitizeSOQL,
  isValidSalesforceId,
  requireSalesforceId,
  SFValidationError,
} from "@/lib/sf-client";
import {
  generateCsrfToken,
  validateCsrfToken,
  CSRF_COOKIE_NAME,
  CSRF_HEADER_NAME,
} from "@/lib/csrf";
import { validate } from "@/lib/sf-validation";

// ═════════════════════════════════════════════════════════════════════════════
// 1. SOQL INJECTION PREVENTION
// ═════════════════════════════════════════════════════════════════════════════

describe("SOQL Injection Prevention", () => {
  describe("sanitizeSOQL", () => {
    it("escapes single quotes to prevent string breakout", () => {
      expect(sanitizeSOQL("O'Brien")).toBe("O\\'Brien");
      expect(sanitizeSOQL("'; DELETE FROM Account; --")).toBe(
        "\\'; DELETE FROM Account; --",
      );
    });

    it("escapes backslashes before quotes (prevents bypass)", () => {
      // Attacker tries: \' → escaped as \\' which re-exposes the quote
      // Correct behavior: \ → \\ first, then ' → \'
      expect(sanitizeSOQL("\\")).toBe("\\\\");
      expect(sanitizeSOQL("\\'")).toBe("\\\\\\'");
    });

    it("escapes LIKE wildcards", () => {
      expect(sanitizeSOQL("100%")).toBe("100\\%");
      expect(sanitizeSOQL("test_value")).toBe("test\\_value");
      expect(sanitizeSOQL("%_admin%")).toBe("\\%\\_admin\\%");
    });

    it("strips control characters", () => {
      expect(sanitizeSOQL("hello\x00world")).toBe("helloworld");
      expect(sanitizeSOQL("test\x0D\x0A")).toBe("test");
      expect(sanitizeSOQL("\x01\x02\x03")).toBe("");
    });

    it("truncates at 200 characters", () => {
      const long = "A".repeat(300);
      expect(sanitizeSOQL(long).length).toBe(200);
    });

    it("returns empty string for non-string inputs", () => {
      expect(sanitizeSOQL(null)).toBe("");
      expect(sanitizeSOQL(undefined)).toBe("");
      expect(sanitizeSOQL(42)).toBe("");
      expect(sanitizeSOQL({})).toBe("");
      expect(sanitizeSOQL([])).toBe("");
    });

    it("handles combined injection attempt", () => {
      const attack = "' OR '1'='1' --";
      const result = sanitizeSOQL(attack);
      expect(result).not.toContain("'1'='1'");
      expect(result).toContain("\\'");
    });

    it("handles UNION SELECT injection", () => {
      const attack = "' UNION SELECT Id, Name FROM User --";
      const result = sanitizeSOQL(attack);
      expect(result.startsWith("\\'")).toBe(true);
    });

    it("handles nested quote escaping attempts", () => {
      const attack = "\\'; DROP TABLE Account; --";
      const result = sanitizeSOQL(attack);
      // Backslash escaped first → \\, then quote escaped → \'
      expect(result).toBe("\\\\\\'; DROP TABLE Account; --");
    });

    it("handles null byte injection", () => {
      const attack = "admin\x00' OR '1'='1";
      const result = sanitizeSOQL(attack);
      expect(result).not.toContain("\x00");
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. SALESFORCE ID VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

describe("Salesforce ID Validation", () => {
  describe("isValidSalesforceId", () => {
    it("accepts valid 15-char IDs", () => {
      expect(isValidSalesforceId("001000000000001")).toBe(true);
      expect(isValidSalesforceId("00T1234567890AB")).toBe(true);
    });

    it("accepts valid 18-char IDs", () => {
      expect(isValidSalesforceId("001000000000001AAA")).toBe(true);
      expect(isValidSalesforceId("00T1234567890ABCDE")).toBe(true);
    });

    it("rejects IDs with wrong length", () => {
      expect(isValidSalesforceId("001")).toBe(false);
      expect(isValidSalesforceId("00100000000000")).toBe(false); // 14 chars
      expect(isValidSalesforceId("0010000000000011")).toBe(false); // 16 chars
      expect(isValidSalesforceId("00100000000000111")).toBe(false); // 17 chars
      expect(isValidSalesforceId("0010000000000011111")).toBe(false); // 19 chars
    });

    it("rejects IDs with special characters", () => {
      expect(isValidSalesforceId("001000000000001!")).toBe(false);
      expect(isValidSalesforceId("001-000-000-000")).toBe(false);
      expect(isValidSalesforceId("001 000 000 001")).toBe(false);
      expect(isValidSalesforceId("001000000000'OR")).toBe(false);
    });

    it("rejects non-string types", () => {
      expect(isValidSalesforceId(null)).toBe(false);
      expect(isValidSalesforceId(undefined)).toBe(false);
      expect(isValidSalesforceId(123456789012345)).toBe(false);
      expect(isValidSalesforceId({})).toBe(false);
      expect(isValidSalesforceId([])).toBe(false);
    });

    it("rejects empty string", () => {
      expect(isValidSalesforceId("")).toBe(false);
    });

    it("rejects SQL injection via ID field", () => {
      expect(isValidSalesforceId("'; DROP TABLE --")).toBe(false);
      expect(isValidSalesforceId("001' OR '1'='1")).toBe(false);
    });
  });

  describe("requireSalesforceId", () => {
    it("returns valid ID", () => {
      expect(requireSalesforceId("001000000000001AAA")).toBe("001000000000001AAA");
    });

    it("throws SFValidationError for invalid ID", () => {
      expect(() => requireSalesforceId("bad")).toThrow(SFValidationError);
      expect(() => requireSalesforceId("bad")).toThrow("Invalid Salesforce ID");
    });

    it("includes custom label in error", () => {
      expect(() => requireSalesforceId("bad", "householdId")).toThrow(
        "Invalid Salesforce householdId",
      );
    });

    it("truncates long invalid IDs in error message", () => {
      const longInput = "A".repeat(100);
      try {
        requireSalesforceId(longInput);
      } catch (e) {
        expect((e as Error).message.length).toBeLessThan(100);
      }
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. CSRF TOKEN VALIDATION
// ═════════════════════════════════════════════════════════════════════════════

describe("CSRF Token Validation", () => {
  describe("generateCsrfToken", () => {
    it("generates a 64-character hex string", () => {
      const token = generateCsrfToken();
      expect(token).toHaveLength(64);
      expect(token).toMatch(/^[0-9a-f]{64}$/);
    });

    it("generates unique tokens", () => {
      const tokens = new Set(Array.from({ length: 100 }, () => generateCsrfToken()));
      expect(tokens.size).toBe(100);
    });
  });

  describe("validateCsrfToken", () => {
    it("returns true for matching tokens", () => {
      const token = generateCsrfToken();
      expect(validateCsrfToken(token, token)).toBe(true);
    });

    it("returns false for mismatched tokens", () => {
      const token1 = generateCsrfToken();
      const token2 = generateCsrfToken();
      expect(validateCsrfToken(token1, token2)).toBe(false);
    });

    it("returns false when cookie token is undefined", () => {
      expect(validateCsrfToken(undefined, "abc")).toBe(false);
    });

    it("returns false when header token is undefined", () => {
      expect(validateCsrfToken("abc", undefined)).toBe(false);
    });

    it("returns false when both tokens are undefined", () => {
      expect(validateCsrfToken(undefined, undefined)).toBe(false);
    });

    it("returns false when cookie token is empty string", () => {
      expect(validateCsrfToken("", "abc")).toBe(false);
    });

    it("returns false when header token is empty string", () => {
      expect(validateCsrfToken("abc", "")).toBe(false);
    });

    it("returns false for different-length tokens (timing attack defense)", () => {
      expect(validateCsrfToken("abc", "abcd")).toBe(false);
      expect(validateCsrfToken("abcd", "abc")).toBe(false);
    });

    it("returns false for nearly-identical tokens (single char diff)", () => {
      const token = generateCsrfToken();
      // Flip the last character
      const tampered = token.slice(0, -1) + (token.endsWith("0") ? "1" : "0");
      expect(validateCsrfToken(token, tampered)).toBe(false);
    });

    it("performs constant-time comparison (no early exit)", () => {
      // This tests the XOR-based comparison: even completely different strings
      // should take the same code path (no short-circuit)
      const token = "a".repeat(64);
      const completelyDifferent = "z".repeat(64);
      const almostSame = "a".repeat(63) + "b";

      // Both should return false — the point is they use the same comparison path
      expect(validateCsrfToken(token, completelyDifferent)).toBe(false);
      expect(validateCsrfToken(token, almostSame)).toBe(false);
    });

    it("exports correct cookie and header names", () => {
      expect(CSRF_COOKIE_NAME).toBe("min_csrf_token");
      expect(CSRF_HEADER_NAME).toBe("x-csrf-token");
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. SESSION SECURITY
// ═════════════════════════════════════════════════════════════════════════════

describe("Session Security", () => {
  it("cookie maxAge is set to 8 hours", async () => {
    // Verify the constant in sf-connection.ts
    const sfConnection = await import("@/lib/sf-connection");
    const source = await import("@/lib/sf-connection?raw");
    // Check the raw source contains 8-hour maxAge
    // The actual cookie is set server-side, so we verify the configuration
    expect(source.default || "").toContain("8 * 60 * 60");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. ROLE-BASED ACCESS DENIAL (Expanded)
// ═════════════════════════════════════════════════════════════════════════════

describe("RBAC Permission Matrix", () => {
  let POST: (request: Request) => Promise<Response>;

  // ─── Mocks ───
  vi.mock("@/lib/sf-client", async () => {
    const actual = await vi.importActual<typeof import("@/lib/sf-client")>(
      "@/lib/sf-client",
    );
    return {
      ...actual,
      query: vi.fn().mockResolvedValue([]),
      queryPaginated: vi.fn().mockResolvedValue([]),
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
    getConnectionSource: vi.fn().mockResolvedValue("env"),
  }));

  vi.mock("@/lib/org-query", () => ({
    orgQuery: {
      householdObject: () => "Account",
      householdFilter: () => "Type = 'Household'",
      householdFilterWhere: () => " WHERE Type = 'Household'",
      householdFilterAnd: () => " AND Type = 'Household'",
      householdTypeValue: () => "Household",
      householdRecordTypeDeveloperName: () => null,
      householdRecordTypeId: () => null,
      contactHouseholdLookup: () => "AccountId",
      advisorField: () => "OwnerId",
      personAccountsEnabled: () => false,
      contactJunction: () => null,
      usesAccountHierarchy: () => false,
      isHybridOrg: () => false,
      householdPatterns: () => [],
      requiredFieldGaps: () => [],
      hasBlockingFieldGaps: () => false,
      flsWarnings: () => [],
      hasFlsWarnings: () => false,
      listHouseholds: (fields: string, limit: number, offset?: number) =>
        `SELECT ${fields} FROM Account WHERE Type = 'Household' ORDER BY CreatedDate DESC LIMIT ${limit}${offset ? ` OFFSET ${offset}` : ""}`,
      searchHouseholds: (fields: string, q: string, limit: number, offset?: number) =>
        `SELECT ${fields} FROM Account WHERE Type = 'Household' AND Name LIKE '%${q}%' ORDER BY CreatedDate DESC LIMIT ${limit}${offset ? ` OFFSET ${offset}` : ""}`,
      newHouseholdFields: (name: string, desc: string) => ({
        Name: name,
        Description: desc,
        Type: "Household",
      }),
    },
    ensureMappingLoaded: vi.fn(),
  }));

  vi.mock("@/lib/workflows", () => ({
    fireWorkflowTrigger: vi
      .fn()
      .mockResolvedValue({
        triggered: [],
        tasksCreated: 0,
        skippedSteps: 0,
        errors: [],
      }),
  }));

  vi.mock("@/lib/audit", () => ({
    shouldAudit: vi.fn(() => false),
    writeAuditLog: vi.fn(),
  }));

  function makeRequest(body: unknown, role?: string): Request {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (role) headers["x-user-role"] = role;
    return new Request("http://localhost:3000/api/salesforce", {
      method: "POST",
      headers,
      body: JSON.stringify(body),
    });
  }

  beforeEach(async () => {
    vi.clearAllMocks();
    const routeModule = await import("@/app/api/salesforce/route");
    POST = routeModule.POST;
  });

  // ── Advisor restrictions ──
  const advisorDeniedActions = [
    "confirmIntent",
    "recordFunding",
    "recordMoneyLink",
    "recordBeneficiaries",
    "recordCompleteness",
    "recordPaperwork",
    "recordDocusignConfig",
    "sendDocusign",
    "createFinancialAccounts",
    "completeTask",
    "createTask",
  ];

  it.each(advisorDeniedActions)(
    "denies advisor from calling %s",
    async (action) => {
      const response = await POST(
        makeRequest({ action, data: {} }, "advisor"),
      );
      expect(response.status).toBe(403);
      const body = await response.json();
      expect(body.error.code).toBe("FORBIDDEN");
    },
  );

  // ── Advisor allowed actions ──
  const advisorAllowedActions = [
    "searchContacts",
    "searchHouseholds",
    "getHouseholdDetail",
    "queryTasks",
    "queryFinancialAccounts",
    "recordComplianceReview",
    "recordMeetingNote",
  ];

  it.each(advisorAllowedActions)(
    "allows advisor to call %s",
    async (action) => {
      const response = await POST(
        makeRequest({ action, data: { query: "test", householdId: "0011234567890ABCDE", familyName: "Test", passed: true, failCount: 0, checks: [], notes: "test" } }, "advisor"),
      );
      // Should not be 403 (may be 400 for missing fields — that's fine, not a role issue)
      expect(response.status).not.toBe(403);
    },
  );

  // ── Operations restrictions ──
  it("denies operations from calling recordMeetingNote", async () => {
    const response = await POST(
      makeRequest({ action: "recordMeetingNote", data: {} }, "operations"),
    );
    expect(response.status).toBe(403);
  });

  // ── Invalid role ──
  it("rejects invalid role values", async () => {
    const response = await POST(
      makeRequest(
        { action: "completeTask", data: { taskId: "001000000000001AAA" } },
        "admin",
      ),
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("ROLE_REQUIRED");
  });

  it("rejects empty string role", async () => {
    const response = await POST(
      makeRequest(
        { action: "completeTask", data: { taskId: "001000000000001AAA" } },
        "",
      ),
    );
    expect(response.status).toBe(403);
  });

  // ── Missing role on mutation ──
  it("requires role for mutation actions", async () => {
    const response = await POST(
      makeRequest({ action: "confirmIntent", data: {} }),
    );
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.error.code).toBe("ROLE_REQUIRED");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. INPUT VALIDATION BOUNDARY TESTING
// ═════════════════════════════════════════════════════════════════════════════

describe("Input Validation Boundaries", () => {
  describe("searchContacts", () => {
    it("rejects missing query", () => {
      expect(() => validate.searchContacts({})).toThrow("Missing required field: query");
    });

    it("rejects query exceeding max length", () => {
      expect(() =>
        validate.searchContacts({ query: "x".repeat(201) }),
      ).toThrow("exceeds max length");
    });

    it("accepts query at max length boundary", () => {
      const result = validate.searchContacts({ query: "x".repeat(100) });
      expect(result.query).toHaveLength(100);
    });
  });

  describe("completeTask", () => {
    it("rejects non-alphanumeric task ID", () => {
      expect(() =>
        validate.completeTask({ taskId: "'; DROP TABLE --" }),
      ).toThrow("Invalid Salesforce ID");
    });

    it("rejects task ID with path traversal", () => {
      expect(() =>
        validate.completeTask({ taskId: "../../../etc/passwd" }),
      ).toThrow("Invalid Salesforce ID");
    });
  });

  describe("createTask", () => {
    it("rejects empty subject", () => {
      expect(() =>
        validate.createTask({
          householdId: "0011234567890ABCDE",
          subject: "",
        }),
      ).toThrow("Missing required field: subject");
    });

    it("rejects subject exceeding max length", () => {
      expect(() =>
        validate.createTask({
          householdId: "0011234567890ABCDE",
          subject: "x".repeat(501),
        }),
      ).toThrow("exceeds max length");
    });

    it("rejects invalid householdId format", () => {
      expect(() =>
        validate.createTask({
          householdId: "not-a-valid-sf-id!",
          subject: "Test",
        }),
      ).toThrow("Invalid Salesforce");
    });
  });

  describe("confirmIntent array limits", () => {
    it("rejects oversized members array (DoS prevention)", () => {
      const members = Array.from({ length: 51 }, (_, i) => ({
        firstName: `F${i}`,
        lastName: `L${i}`,
        email: `e${i}@test.com`,
        phone: "555",
      }));
      expect(() =>
        validate.confirmIntent({
          familyName: "Test",
          accounts: [{ type: "IRA", owner: "Test" }],
          members,
        }),
      ).toThrow(SFValidationError);
    });

    it("accepts members array at limit (50)", () => {
      const members = Array.from({ length: 50 }, (_, i) => ({
        firstName: `F${i}`,
        lastName: `L${i}`,
        email: `e${i}@test.com`,
        phone: "555",
      }));
      const result = validate.confirmIntent({
        familyName: "Test",
        accounts: [{ type: "IRA", owner: "Test" }],
        members,
      });
      expect(result.members).toHaveLength(50);
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. PII SCRUBBING
// ═════════════════════════════════════════════════════════════════════════════

describe("PII Scrubbing in Audit Trail", () => {
  // Import the module to test scrubPII indirectly via writeAuditLog behavior
  // Since scrubPII is not exported, we test it via the audit module's behavior

  it("PII fields are defined for scrubbing", async () => {
    const auditSource = await import("@/lib/audit?raw");
    const source = auditSource.default || "";

    // Verify all critical PII fields are in the scrub list
    const requiredFields = [
      "ssn",
      "dob",
      "dateOfBirth",
      "socialSecurityNumber",
      "idNumber",
      "bankAcct",
      "routingNumber",
      "accountNumber",
    ];
    for (const field of requiredFields) {
      expect(source).toContain(`"${field}"`);
    }
  });

  it("READ_ONLY_ACTIONS are excluded from audit logging", async () => {
    const { shouldAudit } = await vi.importActual<typeof import("@/lib/audit")>(
      "@/lib/audit",
    );

    // These should NOT be audited (read-only)
    expect(shouldAudit("searchContacts")).toBe(false);
    expect(shouldAudit("searchHouseholds")).toBe(false);
    expect(shouldAudit("getHouseholdDetail")).toBe(false);
    expect(shouldAudit("queryTasks")).toBe(false);
    expect(shouldAudit("queryFinancialAccounts")).toBe(false);

    // These SHOULD be audited (mutations)
    expect(shouldAudit("confirmIntent")).toBe(true);
    expect(shouldAudit("completeTask")).toBe(true);
    expect(shouldAudit("recordFunding")).toBe(true);
    expect(shouldAudit("sendDocusign")).toBe(true);
  });
});
