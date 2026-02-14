// ─── Onboarding & Compliance Handler Tests ──────────────────────────────────
//
// Tests the 9 handler functions in onboarding.ts and compliance-meetings.ts
// with mocked Salesforce client. Covers: all 7 onboarding steps, compliance
// review, meeting notes with follow-ups, input validation, and workflow triggers.

import { describe, it, expect, vi, beforeEach } from "vitest";

// ─── Mocks ───────────────────────────────────────────────────────────────────
// Same pattern as api-handlers.test.ts: real validators, stubbed network ops

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

import { onboardingHandlers } from "@/app/api/salesforce/handlers/onboarding";
import { complianceHandlers, meetingHandlers } from "@/app/api/salesforce/handlers/compliance-meetings";
import { query, update, createTask, createTasksBatch } from "@/lib/sf-client";
import { fireWorkflowTrigger } from "@/lib/workflows";
import { validate } from "@/lib/sf-validation";

const mockCtx = { accessToken: "mock-token", instanceUrl: "https://test.salesforce.com" };
const VALID_HH_ID = "0011234567890ABCDE";
const VALID_CONTACT_ID = "0031234567890ABCDE";

// ═════════════════════════════════════════════════════════════════════════════
// ONBOARDING HANDLERS
// ═════════════════════════════════════════════════════════════════════════════

describe("onboardingHandlers", () => {
  beforeEach(() => vi.clearAllMocks());

  // ─── recordFunding ────────────────────────────────────────────────────────

  describe("recordFunding", () => {
    const validInput = {
      householdId: VALID_HH_ID,
      familyName: "Smith",
      fundingDetails: [
        { account: "Joint Brokerage", detail: "Wire $500K from Chase" },
        { account: "IRA", detail: "Rollover from Fidelity" },
      ],
      pteRequired: true,
    };

    it("queries existing description and appends funding note", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValue([
        { Description: "Existing notes here" },
      ]);
      (update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: VALID_HH_ID, url: `https://test.salesforce.com/${VALID_HH_ID}` });
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T0000000TASK01", url: "https://test.salesforce.com/00T0000000TASK01" });

      const response = await onboardingHandlers.recordFunding(validInput, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.task).toBeDefined();
      expect(body.householdUrl).toContain(VALID_HH_ID);

      // Should query existing description
      expect(query).toHaveBeenCalledOnce();

      // Should update with concatenated description
      const updateCall = (update as ReturnType<typeof vi.fn>).mock.calls[0];
      expect(updateCall[1]).toBe("Account");
      expect(updateCall[2]).toBe(VALID_HH_ID);
      const newDesc = updateCall[3].Description as string;
      expect(newDesc).toContain("Existing notes here");
      expect(newDesc).toContain("FUNDING DETAILS");
      expect(newDesc).toContain("Joint Brokerage: Wire $500K from Chase");
      expect(newDesc).toContain("PTE Required: YES");
    });

    it("handles empty existing description", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValue([{}]);
      (update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: VALID_HH_ID, url: "" });
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T0000000TASK01", url: "" });

      await onboardingHandlers.recordFunding(validInput, mockCtx);

      const newDesc = (update as ReturnType<typeof vi.fn>).mock.calls[0][3].Description as string;
      // Should not contain separator when no existing description
      expect(newDesc).not.toContain("───────────────────");
      expect(newDesc).toContain("FUNDING DETAILS");
    });

    it("creates task with funding summary in subject", async () => {
      (query as ReturnType<typeof vi.fn>).mockResolvedValue([]);
      (update as ReturnType<typeof vi.fn>).mockResolvedValue({ id: VALID_HH_ID, url: "" });
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T0000000TASK01", url: "" });

      await onboardingHandlers.recordFunding(validInput, mockCtx);

      expect(createTask).toHaveBeenCalledWith(mockCtx, expect.objectContaining({
        subject: expect.stringContaining("Funding configured — Smith (2 accounts)"),
        householdId: VALID_HH_ID,
      }));
    });

    it("rejects missing householdId", async () => {
      await expect(
        onboardingHandlers.recordFunding({ familyName: "Smith", fundingDetails: [], pteRequired: false }, mockCtx)
      ).rejects.toThrow("Invalid Salesforce ID");
    });

    it("rejects missing fundingDetails", async () => {
      await expect(
        onboardingHandlers.recordFunding({ householdId: VALID_HH_ID, familyName: "Smith", pteRequired: false }, mockCtx)
      ).rejects.toThrow("Missing required array: fundingDetails");
    });
  });

  // ─── recordMoneyLink ──────────────────────────────────────────────────────

  describe("recordMoneyLink", () => {
    it("creates task with bank details (masked)", async () => {
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T0000000TASK02", url: "" });

      const response = await onboardingHandlers.recordMoneyLink({
        householdId: VALID_HH_ID,
        bankName: "Chase",
        lastFour: "4567",
        routingLastFour: "1234",
      }, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(createTask).toHaveBeenCalledWith(mockCtx, expect.objectContaining({
        subject: "MoneyLink setup — Chase (****4567)",
        householdId: VALID_HH_ID,
      }));

      // Description should contain masked routing/account
      const desc = (createTask as ReturnType<typeof vi.fn>).mock.calls[0][1].description;
      expect(desc).toContain("****1234");
      expect(desc).toContain("****4567");
    });

    it("rejects missing bankName", async () => {
      await expect(
        onboardingHandlers.recordMoneyLink({ householdId: VALID_HH_ID, lastFour: "1234", routingLastFour: "5678" }, mockCtx)
      ).rejects.toThrow("Missing required field: bankName");
    });
  });

  // ─── recordBeneficiaries ──────────────────────────────────────────────────

  describe("recordBeneficiaries", () => {
    it("creates task with beneficiary designations", async () => {
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T0000000TASK03", url: "" });

      const response = await onboardingHandlers.recordBeneficiaries({
        householdId: VALID_HH_ID,
        familyName: "Johnson",
        designations: [
          { account: "IRA", beneficiary: "Jane Johnson (Spouse, 100%)" },
          { account: "Roth IRA", beneficiary: "Kids Trust (50%), Jane Johnson (50%)" },
        ],
      }, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(createTask).toHaveBeenCalledWith(mockCtx, expect.objectContaining({
        subject: "Beneficiary designations prefilled — Johnson",
        householdId: VALID_HH_ID,
      }));

      const desc = (createTask as ReturnType<typeof vi.fn>).mock.calls[0][1].description;
      expect(desc).toContain("IRA: Jane Johnson (Spouse, 100%)");
      expect(desc).toContain("Roth IRA: Kids Trust (50%), Jane Johnson (50%)");
    });

    it("rejects missing designations array", async () => {
      await expect(
        onboardingHandlers.recordBeneficiaries({ householdId: VALID_HH_ID, familyName: "Smith" }, mockCtx)
      ).rejects.toThrow("Missing required array: designations");
    });
  });

  // ─── recordCompleteness ───────────────────────────────────────────────────

  describe("recordCompleteness", () => {
    it("creates task with completeness checks", async () => {
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T0000000TASK04", url: "" });

      const response = await onboardingHandlers.recordCompleteness({
        householdId: VALID_HH_ID,
        familyName: "Williams",
        checks: ["KYC verified", "Risk profile complete", "Suitability confirmed"],
      }, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(createTask).toHaveBeenCalledWith(mockCtx, expect.objectContaining({
        subject: "Completeness check PASSED — Williams",
      }));

      const desc = (createTask as ReturnType<typeof vi.fn>).mock.calls[0][1].description;
      expect(desc).toContain("✓ KYC verified");
      expect(desc).toContain("✓ Risk profile complete");
      expect(desc).toContain("✓ Suitability confirmed");
    });

    it("rejects non-string check items", async () => {
      await expect(
        onboardingHandlers.recordCompleteness({
          householdId: VALID_HH_ID,
          familyName: "Smith",
          checks: [123],
        }, mockCtx)
      ).rejects.toThrow("Each check must be a string");
    });
  });

  // ─── recordPaperwork ──────────────────────────────────────────────────────

  describe("recordPaperwork", () => {
    it("creates batch tasks for each envelope", async () => {
      (createTasksBatch as ReturnType<typeof vi.fn>).mockResolvedValue({
        records: [
          { id: "00T0000000TASK05", url: "" },
          { id: "00T0000000TASK06", url: "" },
        ],
        errors: [],
      });

      const response = await onboardingHandlers.recordPaperwork({
        householdId: VALID_HH_ID,
        envelopes: [
          { name: "New Account Application", documents: ["IRA App", "W-9"] },
          { name: "Transfer Form", documents: ["ACAT Form"] },
        ],
      }, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.tasks).toHaveLength(2);
      expect(body.count).toBe(2);

      // Verify batch input shape
      const batchInputs = (createTasksBatch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(batchInputs).toHaveLength(2);
      expect(batchInputs[0].subject).toBe("Paperwork generated — New Account Application");
      expect(batchInputs[1].subject).toBe("Paperwork generated — Transfer Form");
      expect(batchInputs[0].description).toContain("IRA App, W-9");
    });

    it("rejects missing envelopes", async () => {
      await expect(
        onboardingHandlers.recordPaperwork({ householdId: VALID_HH_ID }, mockCtx)
      ).rejects.toThrow("Missing required array: envelopes");
    });

    it("rejects non-string document entries", async () => {
      await expect(
        onboardingHandlers.recordPaperwork({
          householdId: VALID_HH_ID,
          envelopes: [{ name: "App", documents: [123] }],
        }, mockCtx)
      ).rejects.toThrow("Each document must be a string");
    });
  });

  // ─── recordDocusignConfig ─────────────────────────────────────────────────

  describe("recordDocusignConfig", () => {
    it("creates task with envelope config summary", async () => {
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T0000000TASK07", url: "" });

      const response = await onboardingHandlers.recordDocusignConfig({
        householdId: VALID_HH_ID,
        familyName: "Davis",
        envelopeCount: 3,
        config: [
          { envelope: "IRA Application", recipients: "John Davis, Jane Davis" },
          { envelope: "Joint Account", recipients: "John Davis, Jane Davis" },
        ],
      }, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(createTask).toHaveBeenCalledWith(mockCtx, expect.objectContaining({
        subject: "DocuSign configured — 3 envelopes for Davis",
        householdId: VALID_HH_ID,
      }));

      const desc = (createTask as ReturnType<typeof vi.fn>).mock.calls[0][1].description;
      expect(desc).toContain("IRA Application: John Davis, Jane Davis");
      expect(desc).toContain("Templates matched at 100%");
    });

    it("rejects missing config array", async () => {
      await expect(
        onboardingHandlers.recordDocusignConfig({
          householdId: VALID_HH_ID,
          familyName: "Smith",
        }, mockCtx)
      ).rejects.toThrow("Missing required array: config");
    });
  });

  // ─── sendDocusign ─────────────────────────────────────────────────────────

  describe("sendDocusign", () => {
    const validInput = {
      householdId: VALID_HH_ID,
      primaryContactId: VALID_CONTACT_ID,
      envelopes: [
        { name: "IRA Application", signers: ["John Smith", "Jane Smith"], emailSubject: "Sign your IRA docs" },
        { name: "Joint Brokerage", signers: ["John Smith"], emailSubject: "Sign your brokerage docs" },
      ],
    };

    it("creates batch tasks with High priority and Not Started status", async () => {
      (createTasksBatch as ReturnType<typeof vi.fn>).mockResolvedValue({
        records: [
          { id: "00T0000000TASK08", url: "" },
          { id: "00T0000000TASK09", url: "" },
        ],
        errors: [],
      });

      const response = await onboardingHandlers.sendDocusign(validInput, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.tasks).toHaveLength(2);
      expect(body.count).toBe(2);

      const batchInputs = (createTasksBatch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(batchInputs).toHaveLength(2);

      // Each task should have SEND DOCU prefix, High priority, Not Started
      for (const input of batchInputs) {
        expect(input.subject).toMatch(/^SEND DOCU — /);
        expect(input.priority).toBe("High");
        expect(input.status).toBe("Not Started");
        expect(input.activityDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
        expect(input.contactId).toBe(VALID_CONTACT_ID);
      }

      // Verify signer details in description
      expect(batchInputs[0].description).toContain("John Smith, Jane Smith");
      expect(batchInputs[0].description).toContain("Sign your IRA docs");
    });

    it("fires docusign_sent workflow trigger", async () => {
      (createTasksBatch as ReturnType<typeof vi.fn>).mockResolvedValue({ records: [{ id: "00T1", url: "" }], errors: [] });

      await onboardingHandlers.sendDocusign(validInput, mockCtx);

      expect(fireWorkflowTrigger).toHaveBeenCalledWith(
        mockCtx,
        "docusign_sent",
        VALID_HH_ID,
        "IRA Application", // first envelope name
      );
    });

    it("works without primaryContactId", async () => {
      (createTasksBatch as ReturnType<typeof vi.fn>).mockResolvedValue({ records: [{ id: "00T1", url: "" }], errors: [] });

      const response = await onboardingHandlers.sendDocusign({
        householdId: VALID_HH_ID,
        envelopes: [{ name: "App", signers: ["John"], emailSubject: "Sign" }],
      }, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      const batchInputs = (createTasksBatch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(batchInputs[0].contactId).toBeUndefined();
    });

    it("rejects missing envelopes", async () => {
      await expect(
        onboardingHandlers.sendDocusign({ householdId: VALID_HH_ID }, mockCtx)
      ).rejects.toThrow("Missing required array: envelopes");
    });

    it("rejects non-string signers", async () => {
      await expect(
        onboardingHandlers.sendDocusign({
          householdId: VALID_HH_ID,
          envelopes: [{ name: "App", signers: [123], emailSubject: "Sign" }],
        }, mockCtx)
      ).rejects.toThrow("Each signer must be a string");
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// COMPLIANCE HANDLERS
// ═════════════════════════════════════════════════════════════════════════════

describe("complianceHandlers", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("recordComplianceReview", () => {
    const passedInput = {
      householdId: VALID_HH_ID,
      familyName: "Anderson",
      passed: true,
      failCount: 0,
      checks: [
        { label: "KYC Status", status: "pass", detail: "Verified 2024-01-15" },
        { label: "Suitability", status: "pass", detail: "Risk profile matches allocation" },
      ],
      reviewerName: "Sarah Chen",
      nextReviewDate: "2024-07-15",
    };

    it("creates PASSED task with Normal priority", async () => {
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T0000000COMP01", url: "" });

      const response = await complianceHandlers.recordComplianceReview(passedInput, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(createTask).toHaveBeenCalledWith(mockCtx, expect.objectContaining({
        subject: "COMPLIANCE REVIEW PASSED — Anderson",
        householdId: VALID_HH_ID,
        priority: "Normal",
      }));

      const desc = (createTask as ReturnType<typeof vi.fn>).mock.calls[0][1].description;
      expect(desc).toContain("ALL CHECKS PASSED");
      expect(desc).toContain("✓ KYC Status: Verified 2024-01-15");
      expect(desc).toContain("Reviewed by: Sarah Chen");
      expect(desc).toContain("Next review due: 2024-07-15");
    });

    it("creates FLAGGED task with High priority when failed", async () => {
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T0000000COMP02", url: "" });

      const response = await complianceHandlers.recordComplianceReview({
        householdId: VALID_HH_ID,
        familyName: "Brown",
        passed: false,
        failCount: 2,
        checks: [
          { label: "KYC Status", status: "fail", detail: "Expired ID" },
          { label: "AML Screen", status: "warn", detail: "Name match requires review" },
        ],
      }, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(createTask).toHaveBeenCalledWith(mockCtx, expect.objectContaining({
        subject: "COMPLIANCE REVIEW FLAGGED — Brown",
        priority: "High",
      }));

      const desc = (createTask as ReturnType<typeof vi.fn>).mock.calls[0][1].description;
      expect(desc).toContain("2 ITEMS REQUIRE ATTENTION");
      expect(desc).toContain("✗ KYC Status: Expired ID");
      expect(desc).toContain("⚠ AML Screen: Name match requires review");
    });

    it("fires compliance_reviewed workflow trigger", async () => {
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T1", url: "" });

      await complianceHandlers.recordComplianceReview(passedInput, mockCtx);

      expect(fireWorkflowTrigger).toHaveBeenCalledWith(
        mockCtx,
        "compliance_reviewed",
        VALID_HH_ID,
        "Anderson Household",
      );
    });

    it("uses defaults when optional fields are omitted", async () => {
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T1", url: "" });

      await complianceHandlers.recordComplianceReview({
        householdId: VALID_HH_ID,
        familyName: "Taylor",
        passed: true,
        checks: [{ label: "KYC", status: "pass", detail: "OK" }],
      }, mockCtx);

      const desc = (createTask as ReturnType<typeof vi.fn>).mock.calls[0][1].description;
      expect(desc).toContain("Reviewed by: Advisor");
      expect(desc).toContain("Next review due: 90 days");
    });

    it("rejects missing passed boolean", async () => {
      await expect(
        complianceHandlers.recordComplianceReview({
          householdId: VALID_HH_ID,
          familyName: "Smith",
          checks: [],
        }, mockCtx)
      ).rejects.toThrow("Missing required boolean: passed");
    });

    it("rejects missing checks array", async () => {
      await expect(
        complianceHandlers.recordComplianceReview({
          householdId: VALID_HH_ID,
          familyName: "Smith",
          passed: true,
        }, mockCtx)
      ).rejects.toThrow("Missing required array: checks");
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// MEETING HANDLERS
// ═════════════════════════════════════════════════════════════════════════════

describe("meetingHandlers", () => {
  beforeEach(() => vi.clearAllMocks());

  describe("recordMeetingNote", () => {
    const fullInput = {
      householdId: VALID_HH_ID,
      familyName: "Garcia",
      contactId: VALID_CONTACT_ID,
      meetingType: "Annual Review",
      meetingDate: "2024-03-15",
      attendees: "Jon Cambras, John Garcia, Jane Garcia",
      duration: "60 min",
      notes: "Discussed portfolio rebalancing and retirement timeline. Client wants to increase equity allocation.",
      followUps: ["Rebalance portfolio to 70/30", "Send updated financial plan"],
      followUpDays: 14,
    };

    it("creates meeting task with full details", async () => {
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T0000000MEET01", url: "" });
      (createTasksBatch as ReturnType<typeof vi.fn>).mockResolvedValue({ records: [], errors: [] });

      const response = await meetingHandlers.recordMeetingNote(fullInput, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.task).toBeDefined();

      expect(createTask).toHaveBeenCalledWith(mockCtx, expect.objectContaining({
        subject: "MEETING NOTE — Garcia (Annual Review)",
        householdId: VALID_HH_ID,
        contactId: VALID_CONTACT_ID,
        activityDate: "2024-03-15",
      }));

      const desc = (createTask as ReturnType<typeof vi.fn>).mock.calls[0][1].description;
      expect(desc).toContain("Meeting: Annual Review");
      expect(desc).toContain("Date: 2024-03-15");
      expect(desc).toContain("Attendees: Jon Cambras, John Garcia, Jane Garcia");
      expect(desc).toContain("Duration: 60 min");
      expect(desc).toContain("Discussed portfolio rebalancing");
      expect(desc).toContain("FOLLOW-UP ITEMS:");
      expect(desc).toContain("1. Rebalance portfolio to 70/30");
      expect(desc).toContain("2. Send updated financial plan");
    });

    it("creates follow-up tasks via batch", async () => {
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T0000000MEET01", url: "" });
      (createTasksBatch as ReturnType<typeof vi.fn>).mockResolvedValue({
        records: [
          { id: "00T0000000FU01", url: "" },
          { id: "00T0000000FU02", url: "" },
        ],
        errors: [],
      });

      const response = await meetingHandlers.recordMeetingNote(fullInput, mockCtx);
      const body = await response.json();

      expect(body.followUpTasks).toHaveLength(2);
      expect(body.followUpCount).toBe(2);

      const batchInputs = (createTasksBatch as ReturnType<typeof vi.fn>).mock.calls[0][1];
      expect(batchInputs).toHaveLength(2);
      expect(batchInputs[0].subject).toBe("FOLLOW-UP: Rebalance portfolio to 70/30");
      expect(batchInputs[1].subject).toBe("FOLLOW-UP: Send updated financial plan");

      // Each follow-up should be Not Started with contactId
      for (const input of batchInputs) {
        expect(input.status).toBe("Not Started");
        expect(input.contactId).toBe(VALID_CONTACT_ID);
        expect(input.householdId).toBe(VALID_HH_ID);
        // Due date should be in the future
        expect(input.activityDate).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      }
    });

    it("handles no follow-ups gracefully", async () => {
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T0000000MEET02", url: "" });
      (createTasksBatch as ReturnType<typeof vi.fn>).mockResolvedValue({ records: [], errors: [] });

      const response = await meetingHandlers.recordMeetingNote({
        householdId: VALID_HH_ID,
        familyName: "Lee",
        notes: "Quick check-in, no action items.",
      }, mockCtx);
      const body = await response.json();

      expect(body.success).toBe(true);
      expect(body.followUpCount).toBe(0);

      // Description should NOT contain follow-up block
      const desc = (createTask as ReturnType<typeof vi.fn>).mock.calls[0][1].description;
      expect(desc).not.toContain("FOLLOW-UP ITEMS:");

      // Batch should be called with empty array
      expect(createTasksBatch).toHaveBeenCalledWith(mockCtx, []);
    });

    it("uses defaults for optional fields", async () => {
      (createTask as ReturnType<typeof vi.fn>).mockResolvedValue({ id: "00T1", url: "" });
      (createTasksBatch as ReturnType<typeof vi.fn>).mockResolvedValue({ records: [], errors: [] });

      await meetingHandlers.recordMeetingNote({
        householdId: VALID_HH_ID,
        familyName: "Park",
        notes: "General discussion",
      }, mockCtx);

      expect(createTask).toHaveBeenCalledWith(mockCtx, expect.objectContaining({
        subject: "MEETING NOTE — Park",  // no meetingType suffix
      }));

      const desc = (createTask as ReturnType<typeof vi.fn>).mock.calls[0][1].description;
      expect(desc).toContain("Meeting: General");
      expect(desc).toContain("Attendees: Advisor + Client");
      expect(desc).toContain("Duration: 30 min");
    });

    it("rejects missing notes", async () => {
      await expect(
        meetingHandlers.recordMeetingNote({
          householdId: VALID_HH_ID,
          familyName: "Smith",
        }, mockCtx)
      ).rejects.toThrow("Missing required field: notes");
    });

    it("rejects missing familyName", async () => {
      await expect(
        meetingHandlers.recordMeetingNote({
          householdId: VALID_HH_ID,
          notes: "Some notes",
        }, mockCtx)
      ).rejects.toThrow("Missing required field: familyName");
    });

    it("rejects non-string follow-up items", async () => {
      await expect(
        meetingHandlers.recordMeetingNote({
          householdId: VALID_HH_ID,
          familyName: "Smith",
          notes: "Notes here",
          followUps: [123],
        }, mockCtx)
      ).rejects.toThrow("Each follow-up must be a string");
    });
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// VALIDATION — ONBOARDING & COMPLIANCE INPUT SHAPES
// ═════════════════════════════════════════════════════════════════════════════

describe("Onboarding & Compliance Validation", () => {

  describe("validate.recordFunding", () => {
    it("validates complete input", () => {
      const result = validate.recordFunding({
        householdId: VALID_HH_ID,
        familyName: "Smith",
        fundingDetails: [{ account: "IRA", detail: "Wire" }],
        pteRequired: true,
      });
      expect(result.householdId).toBe(VALID_HH_ID);
      expect(result.pteRequired).toBe(true);
      expect(result.fundingDetails).toHaveLength(1);
    });

    it("defaults pteRequired to false when not provided", () => {
      const result = validate.recordFunding({
        householdId: VALID_HH_ID,
        familyName: "Smith",
        fundingDetails: [{ account: "IRA", detail: "Wire" }],
      });
      expect(result.pteRequired).toBe(false);
    });
  });

  describe("validate.sendDocusign", () => {
    it("validates complete input with optional contactId", () => {
      const result = validate.sendDocusign({
        householdId: VALID_HH_ID,
        primaryContactId: VALID_CONTACT_ID,
        envelopes: [{ name: "App", signers: ["John"], emailSubject: "Sign" }],
      });
      expect(result.primaryContactId).toBe(VALID_CONTACT_ID);
      expect(result.envelopes).toHaveLength(1);
    });

    it("accepts input without primaryContactId", () => {
      const result = validate.sendDocusign({
        householdId: VALID_HH_ID,
        envelopes: [{ name: "App", signers: ["John"], emailSubject: "Sign" }],
      });
      expect(result.primaryContactId).toBeUndefined();
    });

    it("rejects invalid primaryContactId", () => {
      expect(() => validate.sendDocusign({
        householdId: VALID_HH_ID,
        primaryContactId: "bad!",
        envelopes: [{ name: "App", signers: ["John"], emailSubject: "Sign" }],
      })).toThrow("Invalid Salesforce ID");
    });
  });

  describe("validate.recordComplianceReview", () => {
    it("validates checks array shape", () => {
      const result = validate.recordComplianceReview({
        householdId: VALID_HH_ID,
        familyName: "Smith",
        passed: true,
        checks: [{ label: "KYC", status: "pass", detail: "OK" }],
      });
      expect(result.checks[0]).toEqual({ label: "KYC", status: "pass", detail: "OK" });
      expect(result.failCount).toBe(0); // defaults
      expect(result.reviewerName).toBeUndefined();
    });
  });

  describe("validate.recordMeetingNote", () => {
    it("defaults followUps to empty array", () => {
      const result = validate.recordMeetingNote({
        householdId: VALID_HH_ID,
        familyName: "Smith",
        notes: "Discussion",
      });
      expect(result.followUps).toEqual([]);
      expect(result.followUpDays).toBe(7); // default
    });

    it("validates notes max length", () => {
      expect(() => validate.recordMeetingNote({
        householdId: VALID_HH_ID,
        familyName: "Smith",
        notes: "x".repeat(10001),
      })).toThrow("exceeds max length");
    });
  });
});
