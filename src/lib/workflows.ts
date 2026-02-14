// ─── Workflow Automation Engine ──────────────────────────────────────────────
//
// Declarative workflow chains that fire automatically when Min actions complete.
// This is the difference between a dashboard and an operating system.
//
// Architecture:
//   1. WorkflowTemplate — defines the chain (trigger → steps with delays/conditions)
//   2. WorkflowInstance — a running instance for a specific household
//   3. Engine functions — evaluate triggers, advance chains, create tasks
//
// The engine is stateless per-request: workflow instances are stored as
// Salesforce tasks with a special prefix, so they survive server restarts
// and are visible in the firm's SF org.

import type { SFContext, TaskInput } from "./sf-client";
import { createTask, createTasksBatch, query, sanitizeSOQL } from "./sf-client";

// ─── Types ──────────────────────────────────────────────────────────────────

export type TriggerEvent =
  | "household_created"       // confirmIntent completed
  | "docusign_sent"           // sendDocusign completed
  | "docusign_completed"      // task with SEND DOCU marked complete
  | "compliance_reviewed"     // recordComplianceReview completed
  | "meeting_completed"       // recordMeetingNote completed
  | "task_completed"          // any task completed
  | "scheduled";              // time-based (checked on dashboard load)

export interface WorkflowStep {
  id: string;
  label: string;                          // Human-readable step name
  taskSubject: string;                    // SF task subject to create
  taskDescription?: string;               // SF task description
  taskPriority?: "High" | "Normal" | "Low";
  taskStatus?: "Not Started" | "In Progress";
  delayDays: number;                      // Days after previous step to create this task
  condition?: {                           // Optional: only fire if condition met
    type: "task_exists" | "task_missing" | "days_since_created";
    subjectContains?: string;
    minDays?: number;
  };
}

export interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  trigger: TriggerEvent;
  triggerSubjectContains?: string;        // For task_completed: filter by subject
  steps: WorkflowStep[];
  enabled: boolean;
}

export interface WorkflowInstance {
  templateId: string;
  householdId: string;
  householdName: string;
  startedAt: string;                      // ISO date
  currentStepIndex: number;               // Which step we're on
  completedSteps: string[];               // Step IDs that are done
  status: "active" | "completed" | "paused";
}

// ─── Workflow Templates ─────────────────────────────────────────────────────

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  // ═══════════════════════════════════════════════════════════════════════════
  // NEW CLIENT ONBOARDING CHAIN
  // Trigger: Household created → DocuSign → Compliance → 90-day check-in
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "new-client-onboarding",
    name: "New Client Onboarding",
    description: "Automatically creates tasks for the full onboarding sequence: paperwork → DocuSign → compliance review → initial meeting → 90-day check-in.",
    trigger: "household_created",
    enabled: true,
    steps: [
      {
        id: "nco-1-welcome",
        label: "Send Welcome Package",
        taskSubject: "WORKFLOW — Send welcome package",
        taskDescription: "New client onboarding workflow: Send welcome email with firm overview, fee disclosure, and privacy policy. Auto-created by Min workflow engine.",
        taskPriority: "High",
        taskStatus: "Not Started",
        delayDays: 0,
      },
      {
        id: "nco-2-docusign",
        label: "Prepare DocuSign Envelopes",
        taskSubject: "WORKFLOW — Prepare DocuSign envelopes",
        taskDescription: "Generate and send all required account opening documents via DocuSign. Auto-created by Min workflow engine.",
        taskPriority: "High",
        taskStatus: "Not Started",
        delayDays: 1,
      },
      {
        id: "nco-3-compliance",
        label: "Run Compliance Review",
        taskSubject: "WORKFLOW — Run compliance review",
        taskDescription: "Complete initial compliance review for the new household. Verify KYC, suitability, and documentation completeness. Auto-created by Min workflow engine.",
        taskPriority: "High",
        taskStatus: "Not Started",
        delayDays: 3,
      },
      {
        id: "nco-4-meeting",
        label: "Schedule Initial Meeting",
        taskSubject: "WORKFLOW — Schedule initial client meeting",
        taskDescription: "Book and conduct the initial strategy meeting with the new client. Review investment objectives, risk tolerance, and planning needs. Auto-created by Min workflow engine.",
        taskPriority: "Normal",
        taskStatus: "Not Started",
        delayDays: 7,
      },
      {
        id: "nco-5-funding-check",
        label: "Verify Funding Complete",
        taskSubject: "WORKFLOW — Verify account funding",
        taskDescription: "Confirm all accounts are funded as planned. Follow up on any pending transfers or MoneyLink setups. Auto-created by Min workflow engine.",
        taskPriority: "Normal",
        taskStatus: "Not Started",
        delayDays: 14,
      },
      {
        id: "nco-6-90day",
        label: "90-Day Check-In",
        taskSubject: "WORKFLOW — 90-day new client check-in",
        taskDescription: "Conduct 90-day check-in: review portfolio performance, validate allocation is on target, confirm client satisfaction, update financial plan if needed. Auto-created by Min workflow engine.",
        taskPriority: "Normal",
        taskStatus: "Not Started",
        delayDays: 90,
      },
    ],
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // DOCUMENT EXPIRATION CHAIN
  // Trigger: Scheduled (checked on dashboard load) — creates renewal tasks
  // for documents approaching expiration
  // ═══════════════════════════════════════════════════════════════════════════
  {
    id: "document-expiration",
    name: "Document Expiration Tracking",
    description: "Monitors client ID documents for expiration. Creates warning tasks at 60, 30, and 7 days before expiration, with automatic escalation.",
    trigger: "scheduled",
    enabled: true,
    steps: [
      {
        id: "dex-1-60day",
        label: "60-Day Warning",
        taskSubject: "WORKFLOW — Document expiring in 60 days",
        taskDescription: "Client identification document is expiring within 60 days. Request updated documentation from client. Auto-created by Min workflow engine.",
        taskPriority: "Normal",
        taskStatus: "Not Started",
        delayDays: 0, // Fires when condition met
        condition: { type: "days_since_created", minDays: 305 }, // ~365 - 60
      },
      {
        id: "dex-2-30day",
        label: "30-Day Urgent Notice",
        taskSubject: "WORKFLOW — Document expiring in 30 days — ACTION REQUIRED",
        taskDescription: "URGENT: Client identification document expires in 30 days. If not renewed, account may be restricted per compliance policy. Auto-created by Min workflow engine.",
        taskPriority: "High",
        taskStatus: "Not Started",
        delayDays: 30,
      },
      {
        id: "dex-3-7day",
        label: "7-Day Escalation",
        taskSubject: "WORKFLOW — Document expires in 7 days — ESCALATE",
        taskDescription: "ESCALATION: Client document expires in 7 days. Notify compliance officer and client relationship manager. Account restrictions may apply. Auto-created by Min workflow engine.",
        taskPriority: "High",
        taskStatus: "Not Started",
        delayDays: 23, // 30 days after first, 7 days before expiry
      },
    ],
  },
];

// ─── Engine Functions ───────────────────────────────────────────────────────

const WORKFLOW_PREFIX = "WORKFLOW —";

/**
 * Fire workflows triggered by an event.
 * Called by route handlers after completing an action.
 * Returns the tasks created by the workflow engine.
 */
export async function fireWorkflowTrigger(
  ctx: SFContext,
  event: TriggerEvent,
  householdId: string,
  householdName: string,
  options?: { subjectContains?: string }
): Promise<{ triggered: string[]; tasksCreated: number }> {
  const triggered: string[] = [];
  let tasksCreated = 0;

  // Find matching templates
  const matches = WORKFLOW_TEMPLATES.filter(t =>
    t.enabled &&
    t.trigger === event &&
    (!t.triggerSubjectContains || options?.subjectContains?.includes(t.triggerSubjectContains))
  );

  for (const template of matches) {
    // Check if this workflow is already running for this household
    const existing = await query(ctx,
      `SELECT Id FROM Task WHERE WhatId = '${sanitizeSOQL(householdId)}' AND Subject LIKE '${WORKFLOW_PREFIX}%' AND Description LIKE 'WORKFLOW_ID:${sanitizeSOQL(template.id)}%' LIMIT 1`
    );

    // Don't double-fire: if any workflow task exists for this template + household, skip
    // Unless it's the document expiration workflow, which should always check
    if (existing.length > 0 && template.id !== "document-expiration") continue;

    // Create immediate tasks (delayDays === 0)
    const immediateTasks: TaskInput[] = template.steps
      .filter(step => step.delayDays === 0)
      .map(step => ({
        subject: `${step.taskSubject} — ${householdName}`,
        householdId,
        status: step.taskStatus || "Not Started",
        priority: step.taskPriority || "Normal",
        description: `WORKFLOW_ID:${template.id} STEP:${step.id}\n${step.taskDescription || ""}\n\nWorkflow: ${template.name}\nStep: ${step.label}\nTriggered: ${new Date().toISOString()}`,
      }));

    // Create scheduled tasks (delayDays > 0) with future due dates
    const scheduledTasks: TaskInput[] = template.steps
      .filter(step => step.delayDays > 0)
      .map(step => {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + step.delayDays);
        return {
          subject: `${step.taskSubject} — ${householdName}`,
          householdId,
          status: step.taskStatus || "Not Started",
          priority: step.taskPriority || "Normal",
          activityDate: dueDate.toISOString().split("T")[0],
          description: `WORKFLOW_ID:${template.id} STEP:${step.id}\n${step.taskDescription || ""}\n\nWorkflow: ${template.name}\nStep: ${step.label}\nDue: ${dueDate.toISOString().split("T")[0]}\nTriggered: ${new Date().toISOString()}`,
        };
      });

    const allTasks = [...immediateTasks, ...scheduledTasks];
    if (allTasks.length > 0) {
      const { records } = await createTasksBatch(ctx, allTasks);
      tasksCreated += records.length;
      triggered.push(template.name);
    }
  }

  return { triggered, tasksCreated };
}

/**
 * Get workflow status for a household.
 * Reads all WORKFLOW tasks and groups them by template.
 */
export async function getHouseholdWorkflows(
  ctx: SFContext,
  householdId: string
): Promise<WorkflowInstance[]> {
  const tasks = await query(ctx,
    `SELECT Id, Subject, Status, ActivityDate, CreatedDate, Description FROM Task WHERE WhatId = '${sanitizeSOQL(householdId)}' AND Subject LIKE '${WORKFLOW_PREFIX}%' ORDER BY ActivityDate ASC`
  );

  // Group tasks by workflow template using structured IDs
  const instances = new Map<string, WorkflowInstance>();

  for (const template of WORKFLOW_TEMPLATES) {
    // Prefer structured ID matching, fall back to subject heuristic
    const templateTasks = tasks.filter(t => {
      const desc = (t.Description as string) || "";
      const structMatch = desc.match(/^WORKFLOW_ID:(\S+)/);
      if (structMatch) return structMatch[1] === template.id;
      // Legacy fallback: match by subject prefix
      return (t.Subject as string).includes(template.steps[0]?.taskSubject?.split("—")[0]?.trim() || template.name);
    });

    if (templateTasks.length === 0) continue;

    const completed = templateTasks.filter(t => t.Status === "Completed");
    const allDone = completed.length === templateTasks.length;

    instances.set(template.id, {
      templateId: template.id,
      householdId,
      householdName: "",
      startedAt: templateTasks[0]?.CreatedDate as string || new Date().toISOString(),
      currentStepIndex: completed.length,
      completedSteps: completed.map(t => (t.Subject as string)),
      status: allDone ? "completed" : "active",
    });
  }

  return Array.from(instances.values());
}

/**
 * Get all active workflows across all households.
 * Used by the Workflows dashboard screen.
 */
export async function getAllActiveWorkflows(
  ctx: SFContext
): Promise<{ task: Record<string, unknown>; templateName: string; stepLabel: string }[]> {
  const tasks = await query(ctx,
    `SELECT Id, Subject, Status, Priority, ActivityDate, CreatedDate, Description, What.Name, What.Id FROM Task WHERE Subject LIKE '${WORKFLOW_PREFIX}%' AND Status != 'Completed' ORDER BY ActivityDate ASC LIMIT 100`
  );

  return tasks.map(t => {
    const subject = t.Subject as string;
    const desc = (t.Description as string) || "";
    // Prefer structured ID (new format), fall back to human-readable parsing (legacy)
    const structMatch = desc.match(/^WORKFLOW_ID:(\S+)\s+STEP:(\S+)/);
    if (structMatch) {
      const tmpl = WORKFLOW_TEMPLATES.find(wt => wt.id === structMatch[1]);
      const step = tmpl?.steps.find(s => s.id === structMatch[2]);
      return {
        task: t,
        templateName: tmpl?.name || structMatch[1],
        stepLabel: step?.label || structMatch[2],
      };
    }
    // Legacy fallback: parse from human-readable lines
    const descMatch = desc.match(/Workflow: (.+)/);
    const stepMatch = desc.match(/Step: (.+)/);
    return {
      task: t,
      templateName: descMatch?.[1]?.split("\n")[0] || "Unknown",
      stepLabel: stepMatch?.[1]?.split("\n")[0] || subject.replace(WORKFLOW_PREFIX, "").trim(),
    };
  });
}

/**
 * List available workflow templates with their enabled status.
 */
export function listTemplates(): { id: string; name: string; description: string; trigger: string; stepCount: number; enabled: boolean }[] {
  return WORKFLOW_TEMPLATES.map(t => ({
    id: t.id,
    name: t.name,
    description: t.description,
    trigger: t.trigger,
    stepCount: t.steps.length,
    enabled: t.enabled,
  }));
}
