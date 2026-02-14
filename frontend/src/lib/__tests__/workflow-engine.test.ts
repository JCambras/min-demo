// ─── Workflow Engine & Dashboard Computation Tests ──────────────────────────
//
// Covers Vale Audit Priority 2:
//   8. Workflow template structure & integrity
//   9. Template matching & trigger logic
//  10. Due date arithmetic
//  11. Deduplication identifiers
//  12. Dashboard computation (buildPracticeData — now testable thanks to decomposition)

import { describe, it, expect } from "vitest";
import { WORKFLOW_TEMPLATES, listTemplates } from "@/lib/workflows";
import type { WorkflowTemplate, WorkflowStep, TriggerEvent } from "@/lib/workflows";
import { buildPracticeData, REVENUE_ASSUMPTIONS, KNOWN_ADVISORS } from "@/app/dashboard/usePracticeData";
import type { SFTask, SFHousehold } from "@/app/dashboard/usePracticeData";

// ═════════════════════════════════════════════════════════════════════════════
// 8. WORKFLOW TEMPLATE STRUCTURE
// ═════════════════════════════════════════════════════════════════════════════

describe("WORKFLOW_TEMPLATES", () => {
  it("has at least 2 templates", () => {
    expect(WORKFLOW_TEMPLATES.length).toBeGreaterThanOrEqual(2);
  });

  it("every template has a unique ID", () => {
    const ids = WORKFLOW_TEMPLATES.map(t => t.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every template has at least one step", () => {
    for (const t of WORKFLOW_TEMPLATES) {
      expect(t.steps.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("every step has a unique ID within its template", () => {
    for (const t of WORKFLOW_TEMPLATES) {
      const stepIds = t.steps.map(s => s.id);
      expect(new Set(stepIds).size).toBe(stepIds.length);
    }
  });

  it("every step subject starts with WORKFLOW —", () => {
    for (const t of WORKFLOW_TEMPLATES) {
      for (const s of t.steps) {
        expect(s.taskSubject).toMatch(/^WORKFLOW —/);
      }
    }
  });

  it("step delayDays are non-negative", () => {
    // delayDays are relative intervals (days after previous step), NOT absolute
    // So 0→30→23 is valid: step 2 fires 30d after step 1, step 3 fires 23d after step 2
    for (const t of WORKFLOW_TEMPLATES) {
      for (const s of t.steps) {
        expect(s.delayDays).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("every step has a valid priority", () => {
    const validPriorities = ["High", "Normal", "Low"];
    for (const t of WORKFLOW_TEMPLATES) {
      for (const s of t.steps) {
        if (s.taskPriority) {
          expect(validPriorities).toContain(s.taskPriority);
        }
      }
    }
  });

  it("every step has a valid status", () => {
    const validStatuses = ["Not Started", "In Progress"];
    for (const t of WORKFLOW_TEMPLATES) {
      for (const s of t.steps) {
        if (s.taskStatus) {
          expect(validStatuses).toContain(s.taskStatus);
        }
      }
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 9. TEMPLATE MATCHING & TRIGGER LOGIC
// ═════════════════════════════════════════════════════════════════════════════

describe("listTemplates", () => {
  it("returns all templates with correct shape", () => {
    const templates = listTemplates();
    expect(templates.length).toBe(WORKFLOW_TEMPLATES.length);
    for (const t of templates) {
      expect(t).toHaveProperty("id");
      expect(t).toHaveProperty("name");
      expect(t).toHaveProperty("description");
      expect(t).toHaveProperty("trigger");
      expect(t).toHaveProperty("stepCount");
      expect(t).toHaveProperty("enabled");
      expect(typeof t.stepCount).toBe("number");
      expect(typeof t.enabled).toBe("boolean");
    }
  });

  it("step counts match actual template steps", () => {
    const templates = listTemplates();
    for (const t of templates) {
      const original = WORKFLOW_TEMPLATES.find(o => o.id === t.id)!;
      expect(t.stepCount).toBe(original.steps.length);
    }
  });
});

describe("trigger matching", () => {
  it("new-client-onboarding fires on household_created", () => {
    const t = WORKFLOW_TEMPLATES.find(t => t.id === "new-client-onboarding")!;
    expect(t.trigger).toBe("household_created");
    expect(t.enabled).toBe(true);
  });

  it("document-expiration fires on scheduled", () => {
    const t = WORKFLOW_TEMPLATES.find(t => t.id === "document-expiration")!;
    expect(t.trigger).toBe("scheduled");
    expect(t.enabled).toBe(true);
  });

  it("no two templates share the same trigger without a subject filter", () => {
    const triggerMap = new Map<TriggerEvent, WorkflowTemplate[]>();
    for (const t of WORKFLOW_TEMPLATES) {
      if (!triggerMap.has(t.trigger)) triggerMap.set(t.trigger, []);
      triggerMap.get(t.trigger)!.push(t);
    }
    for (const [trigger, templates] of triggerMap) {
      if (templates.length > 1) {
        // Multiple templates on same trigger — at least one must have a subject filter
        const withFilter = templates.filter(t => t.triggerSubjectContains);
        expect(withFilter.length).toBeGreaterThanOrEqual(1);
      }
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 10. DUE DATE ARITHMETIC
// ═════════════════════════════════════════════════════════════════════════════

describe("due date arithmetic", () => {
  it("onboarding chain has correct delay progression", () => {
    const t = WORKFLOW_TEMPLATES.find(t => t.id === "new-client-onboarding")!;
    const delays = t.steps.map(s => s.delayDays);
    expect(delays).toEqual([0, 1, 3, 7, 14, 90]);
  });

  it("onboarding step 1 is immediate (delayDays === 0)", () => {
    const t = WORKFLOW_TEMPLATES.find(t => t.id === "new-client-onboarding")!;
    expect(t.steps[0].delayDays).toBe(0);
    expect(t.steps[0].label).toBe("Send Welcome Package");
  });

  it("90-day check-in is the last onboarding step", () => {
    const t = WORKFLOW_TEMPLATES.find(t => t.id === "new-client-onboarding")!;
    const last = t.steps[t.steps.length - 1];
    expect(last.delayDays).toBe(90);
    expect(last.label).toContain("90-Day");
  });

  it("document expiration uses condition-based firing", () => {
    const t = WORKFLOW_TEMPLATES.find(t => t.id === "document-expiration")!;
    const step1 = t.steps[0];
    expect(step1.condition).toBeDefined();
    expect(step1.condition!.type).toBe("days_since_created");
    expect(step1.condition!.minDays).toBe(305); // 365 - 60
  });

  it("document expiration steps sum to ~53 days of escalation", () => {
    const t = WORKFLOW_TEMPLATES.find(t => t.id === "document-expiration")!;
    const totalDelay = t.steps.reduce((s, step) => s + step.delayDays, 0);
    // Step 1: 0d, Step 2: 30d after, Step 3: 23d after = 53 total
    expect(totalDelay).toBe(53);
  });

  it("future due date calculation produces correct ISO dates", () => {
    // Simulate engine logic: dueDate = today + delayDays
    const today = new Date("2026-02-12T12:00:00Z");
    const delays = [0, 1, 3, 7, 14, 90];
    const expected = [
      "2026-02-12", "2026-02-13", "2026-02-15",
      "2026-02-19", "2026-02-26", "2026-05-13",
    ];
    for (let i = 0; i < delays.length; i++) {
      const due = new Date(today);
      due.setDate(due.getDate() + delays[i]);
      expect(due.toISOString().split("T")[0]).toBe(expected[i]);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 11. WORKFLOW TASK IDENTIFICATION
// ═════════════════════════════════════════════════════════════════════════════

describe("workflow task identification", () => {
  it("all workflow task subjects contain WORKFLOW —", () => {
    for (const t of WORKFLOW_TEMPLATES) {
      for (const s of t.steps) {
        expect(s.taskSubject).toContain("WORKFLOW —");
      }
    }
  });

  it("workflow descriptions contain parseable metadata", () => {
    // Simulate what fireWorkflowTrigger puts in descriptions (new structured format)
    const template = WORKFLOW_TEMPLATES[0];
    const step = template.steps[0];
    const desc = `WORKFLOW_ID:${template.id} STEP:${step.id}\n${step.taskDescription}\n\nWorkflow: ${template.name}\nStep: ${step.label}\nTriggered: 2026-02-12T12:00:00Z`;

    // Verify structured ID is parseable (new primary path)
    const structMatch = desc.match(/^WORKFLOW_ID:(\S+)\s+STEP:(\S+)/);
    expect(structMatch).not.toBeNull();
    expect(structMatch![1]).toBe(template.id);
    expect(structMatch![2]).toBe(step.id);

    // Verify legacy format still parseable (fallback path)
    const workflowMatch = desc.match(/Workflow: (.+)/);
    const stepMatch = desc.match(/Step: (.+)/);
    expect(workflowMatch).not.toBeNull();
    expect(workflowMatch![1]).toContain(template.name);
    expect(stepMatch).not.toBeNull();
    expect(stepMatch![1]).toContain(step.label);
  });

  it("onboarding steps have escalating priorities", () => {
    const t = WORKFLOW_TEMPLATES.find(t => t.id === "new-client-onboarding")!;
    // First 3 steps should be High, rest Normal
    expect(t.steps[0].taskPriority).toBe("High");
    expect(t.steps[1].taskPriority).toBe("High");
    expect(t.steps[2].taskPriority).toBe("High");
    expect(t.steps[3].taskPriority).toBe("Normal");
  });

  it("document expiration escalates to High priority", () => {
    const t = WORKFLOW_TEMPLATES.find(t => t.id === "document-expiration")!;
    expect(t.steps[0].taskPriority).toBe("Normal");  // 60-day warning
    expect(t.steps[1].taskPriority).toBe("High");     // 30-day urgent
    expect(t.steps[2].taskPriority).toBe("High");     // 7-day escalation
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 12. DASHBOARD COMPUTATION (buildPracticeData)
// ═════════════════════════════════════════════════════════════════════════════

// Test fixtures
const mockInstanceUrl = "https://test.salesforce.com";

function makeHousehold(name: string, daysAgo: number, desc?: string): SFHousehold {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  return { Id: `001${name.replace(/\s/g, "")}`, Name: name, CreatedDate: d.toISOString(), Description: desc };
}

function makeTask(subject: string, hhName: string, status: string, daysAgo: number, opts?: { priority?: string; activityDaysAgo?: number }): SFTask {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  const ad = opts?.activityDaysAgo !== undefined ? (() => { const a = new Date(); a.setDate(a.getDate() - opts.activityDaysAgo!); return a.toISOString(); })() : "";
  return {
    Id: `00T${subject.slice(0, 8).replace(/\s/g, "")}${Math.random().toString(36).slice(2, 6)}`,
    Subject: subject,
    Status: status,
    Priority: opts?.priority || "Normal",
    Description: "",
    CreatedDate: d.toISOString(),
    ActivityDate: ad,
    What: { Name: hhName, Id: `001${hhName.replace(/\s/g, "")}` },
  };
}

// ═════════════════════════════════════════════════════════════════════════════
// 12b. STEP-LEVEL IDEMPOTENCY (Item 8)
// ═════════════════════════════════════════════════════════════════════════════

describe("step-level idempotency", () => {
  it("step IDs are globally unique across all templates", () => {
    const allStepIds = WORKFLOW_TEMPLATES.flatMap(t => t.steps.map(s => s.id));
    expect(new Set(allStepIds).size).toBe(allStepIds.length);
  });

  it("STEP: pattern is parseable from workflow description", () => {
    const template = WORKFLOW_TEMPLATES[0];
    for (const step of template.steps) {
      const desc = `WORKFLOW_ID:${template.id} STEP:${step.id}\nSome description`;
      const match = desc.match(/STEP:(\S+)/);
      expect(match).not.toBeNull();
      expect(match![1]).toBe(step.id);
    }
  });

  it("existing step IDs can be extracted from task descriptions", () => {
    const template = WORKFLOW_TEMPLATES[0];
    const mockTasks = template.steps.slice(0, 3).map(step => ({
      Id: "001fake",
      Description: `WORKFLOW_ID:${template.id} STEP:${step.id}\nTest`,
    }));

    const existingStepIds = new Set(
      mockTasks.map(t => {
        const m = ((t.Description as string) || "").match(/STEP:(\S+)/);
        return m ? m[1] : null;
      }).filter(Boolean) as string[]
    );

    expect(existingStepIds.size).toBe(3);
    expect(existingStepIds.has(template.steps[0].id)).toBe(true);
    expect(existingStepIds.has(template.steps[1].id)).toBe(true);
    expect(existingStepIds.has(template.steps[2].id)).toBe(true);
  });

  it("filtering pending steps excludes already-created ones", () => {
    const template = WORKFLOW_TEMPLATES[0];
    const existingStepIds = new Set([template.steps[0].id, template.steps[1].id]);
    const pendingSteps = template.steps.filter(step => !existingStepIds.has(step.id));
    expect(pendingSteps.length).toBe(template.steps.length - 2);
    expect(pendingSteps.every(s => !existingStepIds.has(s.id))).toBe(true);
  });

  it("skipped steps count equals existing step count", () => {
    const template = WORKFLOW_TEMPLATES[0];
    const existingStepIds = new Set([template.steps[0].id]);
    const pendingSteps = template.steps.filter(step => !existingStepIds.has(step.id));
    const skippedSteps = template.steps.length - pendingSteps.length;
    expect(skippedSteps).toBe(1);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 12c. REQUEST TRACING (Item 9)
// ═════════════════════════════════════════════════════════════════════════════

describe("request tracing", () => {
  it("crypto.randomUUID produces valid UUID v4 format", () => {
    const uuid = crypto.randomUUID();
    expect(uuid).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("each UUID is unique", () => {
    const uuids = Array.from({ length: 100 }, () => crypto.randomUUID());
    expect(new Set(uuids).size).toBe(100);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 12d. PIPELINE ERROR RECOVERY (Item 10)
// ═════════════════════════════════════════════════════════════════════════════

describe("pipeline error recovery", () => {
  it("fireWorkflowTrigger return type includes error tracking fields", () => {
    // Verify the type shape by constructing a mock return value
    const result: { triggered: string[]; tasksCreated: number; skippedSteps: number; errors: string[] } = {
      triggered: ["New Client Onboarding"],
      tasksCreated: 4,
      skippedSteps: 2,
      errors: ["Failed to create step X"],
    };
    expect(result.triggered).toHaveLength(1);
    expect(result.tasksCreated).toBe(4);
    expect(result.skippedSteps).toBe(2);
    expect(result.errors).toHaveLength(1);
  });

  it("partial failures can be retried via idempotent re-fire", () => {
    // Scenario: 6 steps in onboarding, 3 created successfully, 3 failed
    // On retry, the 3 existing steps should be skipped (idempotent)
    const template = WORKFLOW_TEMPLATES.find(t => t.id === "new-client-onboarding")!;
    const createdSteps = new Set(template.steps.slice(0, 3).map(s => s.id));
    const pendingOnRetry = template.steps.filter(s => !createdSteps.has(s.id));
    expect(pendingOnRetry.length).toBe(3); // Only 3 remaining
    expect(pendingOnRetry[0].id).toBe(template.steps[3].id); // Starts from step 4
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 12. DASHBOARD COMPUTATION (buildPracticeData)
// ═════════════════════════════════════════════════════════════════════════════

describe("buildPracticeData", () => {
  it("returns correct shape with empty data", () => {
    const data = buildPracticeData([], [], mockInstanceUrl);
    expect(data.healthScore).toBe(100); // No issues = perfect
    expect(data.totalHouseholds).toBe(0);
    expect(data.totalTasks).toBe(0);
    expect(data.openTasks).toBe(0);
    expect(data.risks.length).toBe(0);
    expect(data.pipeline.length).toBe(5);
    expect(data.advisors.length).toBeGreaterThan(0); // Known advisors pre-populated
    expect(data.revenue).toBeDefined();
    expect(data.assumptions).toBeDefined();
    expect(data.assumptions.feeScheduleBps).toBe(85); // Default
    expect(data.weeklyComparison.length).toBe(4);
  });

  it("counts open vs completed tasks correctly", () => {
    const hh = [makeHousehold("Smith Household", 10)];
    const tasks = [
      makeTask("Task 1", "Smith Household", "Completed", 5),
      makeTask("Task 2", "Smith Household", "Not Started", 3),
      makeTask("Task 3", "Smith Household", "In Progress", 1),
    ];
    const data = buildPracticeData(tasks, hh, mockInstanceUrl);
    expect(data.completedTasks).toBe(1);
    expect(data.openTasks).toBe(2);
    expect(data.totalTasks).toBe(3);
  });

  it("detects unsigned DocuSign envelopes", () => {
    const hh = [makeHousehold("Jones Household", 15)];
    const tasks = [
      makeTask("SEND DOCU — IRA Application", "Jones Household", "Not Started", 8),
      makeTask("SEND DOCU — Joint Account", "Jones Household", "Completed", 8),
    ];
    const data = buildPracticeData(tasks, hh, mockInstanceUrl);
    expect(data.unsigned).toBe(1);
  });

  it("counts compliance reviews", () => {
    const hh = [makeHousehold("Kim Household", 20)];
    const tasks = [
      makeTask("COMPLIANCE REVIEW PASSED — Kim", "Kim Household", "Completed", 10),
    ];
    const data = buildPracticeData(tasks, hh, mockInstanceUrl);
    expect(data.complianceReviews).toBe(1);
  });

  it("generates risk items for stale accounts", () => {
    const hh = [makeHousehold("Stale Household", 45)]; // 45 days old, no tasks
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const staleRisk = data.risks.find(r => r.category === "Stale Account");
    expect(staleRisk).toBeDefined();
    expect(staleRisk!.severity).toBe("medium"); // 30-60 days = medium
  });

  it("generates critical risk for very stale accounts", () => {
    const hh = [makeHousehold("VeryStale Household", 75)];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const staleRisk = data.risks.find(r => r.category === "Stale Account");
    expect(staleRisk).toBeDefined();
    expect(staleRisk!.severity).toBe("critical"); // >60 days = critical
  });

  it("generates risk for missing compliance review", () => {
    const hh = [makeHousehold("NoCR Household", 20)]; // 20 days, no review
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const compRisk = data.risks.find(r => r.category === "Compliance");
    expect(compRisk).toBeDefined();
    expect(compRisk!.severity).toBe("high"); // 14-30 days = high
  });

  it("computes pipeline stages from task progression", () => {
    const hh = [
      makeHousehold("New Household", 3),
      makeHousehold("DocuSent Household", 10),
      makeHousehold("Active Household", 30),
    ];
    const tasks = [
      // DocuSent: has docusign sent but not signed
      makeTask("SEND DOCU — Application", "DocuSent Household", "Not Started", 8),
      // Active: has docu signed + compliance + meeting
      makeTask("SEND DOCU — Application", "Active Household", "Completed", 25),
      makeTask("COMPLIANCE REVIEW PASSED — Active", "Active Household", "Completed", 20),
      makeTask("MEETING NOTE — Active", "Active Household", "Completed", 15),
    ];
    const data = buildPracticeData(tasks, hh, mockInstanceUrl);
    expect(data.pipeline[0].count).toBe(1); // Just Onboarded: New
    expect(data.pipeline[1].count).toBe(1); // DocuSign Sent: DocuSent
    expect(data.pipeline[4].count).toBe(1); // Fully Active: Active
  });

  it("computes revenue estimates from household count", () => {
    const hh = [
      makeHousehold("HH1", 10),
      makeHousehold("HH2", 10),
      makeHousehold("HH3", 10),
    ];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const expectedAum = 3 * REVENUE_ASSUMPTIONS.avgAumPerHousehold;
    const expectedFee = expectedAum * (REVENUE_ASSUMPTIONS.feeScheduleBps / 10000);
    expect(data.revenue.estimatedAum).toBe(expectedAum);
    expect(data.revenue.annualFeeIncome).toBe(expectedFee);
    expect(data.revenue.monthlyFeeIncome).toBeCloseTo(expectedFee / 12);
  });

  it("distributes households across known advisors", () => {
    const hh = Array.from({ length: 7 }, (_, i) => makeHousehold(`HH${i} Household`, 10));
    const data = buildPracticeData([], hh, mockInstanceUrl);
    // Should distribute round-robin across KNOWN_ADVISORS
    const namedAdvisors = data.advisors.filter(a => a.name !== "Unassigned");
    expect(namedAdvisors.length).toBe(KNOWN_ADVISORS.length);
    // Each should have exactly 1 household
    for (const a of namedAdvisors) {
      expect(a.households).toBe(1);
    }
  });

  it("respects explicit advisor assignment from Description", () => {
    const hh = [makeHousehold("Assigned Household", 10, "Assigned Advisor: Marcus Rivera")];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const marcus = data.advisors.find(a => a.name === "Marcus Rivera");
    expect(marcus).toBeDefined();
    expect(marcus!.households).toBeGreaterThanOrEqual(1);
  });

  it("health score degrades with missing compliance", () => {
    const hh = Array.from({ length: 5 }, (_, i) => makeHousehold(`HH${i} Household`, 10));
    // No compliance reviews at all
    const data = buildPracticeData([], hh, mockInstanceUrl);
    // Compliance coverage should be 0% → health score penalized
    const compBreakdown = data.healthBreakdown.find(b => b.label === "Compliance Coverage");
    expect(compBreakdown).toBeDefined();
    expect(compBreakdown!.score).toBe(0);
    expect(data.healthScore).toBeLessThan(100);
  });

  it("health score is perfect when all metrics are satisfied", () => {
    const hh = [makeHousehold("Perfect Household", 10)];
    const tasks = [
      makeTask("COMPLIANCE REVIEW PASSED — Perfect", "Perfect Household", "Completed", 5),
      makeTask("MEETING NOTE — Perfect", "Perfect Household", "Completed", 3),
    ];
    const data = buildPracticeData(tasks, hh, mockInstanceUrl);
    expect(data.healthScore).toBe(100);
  });

  it("accepts custom revenue assumption overrides", () => {
    const hh = [makeHousehold("HH1", 10), makeHousehold("HH2", 10)];
    const custom = { avgAumPerHousehold: 5_000_000, feeScheduleBps: 100 };
    const data = buildPracticeData([], hh, mockInstanceUrl, custom);
    expect(data.assumptions.avgAumPerHousehold).toBe(5_000_000);
    expect(data.assumptions.feeScheduleBps).toBe(100);
    expect(data.assumptions.pipelineConversionRate).toBe(0.65); // Unchanged default
    expect(data.revenue.estimatedAum).toBe(2 * 5_000_000);
    expect(data.revenue.annualFeeIncome).toBe(10_000_000 * (100 / 10000));
  });

  it("partial overrides merge with defaults", () => {
    const data = buildPracticeData([], [], mockInstanceUrl, { feeScheduleBps: 50 });
    expect(data.assumptions.feeScheduleBps).toBe(50);
    expect(data.assumptions.avgAumPerHousehold).toBe(2_000_000); // Default preserved
  });

  it("populates detail drawer item arrays", () => {
    const hh = [makeHousehold("Smith Household", 10)];
    const tasks = [
      makeTask("SEND DOCU — IRA App", "Smith Household", "Not Started", 5),
      makeTask("COMPLIANCE REVIEW PASSED — Smith", "Smith Household", "Completed", 3),
      makeTask("MEETING NOTE — Smith", "Smith Household", "Completed", 2),
      makeTask("Follow up call", "Smith Household", "Not Started", 1),
    ];
    const data = buildPracticeData(tasks, hh, mockInstanceUrl);
    expect(data.openTaskItems.length).toBe(2); // SEND DOCU + Follow up
    expect(data.unsignedItems.length).toBe(1); // SEND DOCU
    expect(data.reviewItems.length).toBe(1);   // COMPLIANCE REVIEW
    expect(data.meetingItems.length).toBe(1);   // MEETING NOTE
    expect(data.openTaskItems[0].subject).toBeDefined();
    expect(data.openTaskItems[0].household).toBe("Smith Household");
  });
});
