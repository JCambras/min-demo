// ─── Task Subject Constants ──────────────────────────────────────────────────
//
// Min creates Salesforce Tasks with structured subject prefixes.
// These prefixes are used for:
//   1. Creating tasks (api/salesforce/route.ts)
//   2. Classifying tasks for display (dashboard, task manager, family, query)
//   3. Filtering tasks for stats (home-stats, dashboard)
//   4. Parsing tasks for intelligence (briefing)
//
// This is the ONLY place these strings are defined.
// If you change a prefix here, update the corresponding handler in route.ts.

// ─── Subject Prefixes ───────────────────────────────────────────────────────

/** Compliance review task subjects start with this */
export const COMPLIANCE_REVIEW = "COMPLIANCE REVIEW";

/** Meeting note task subjects start with this */
export const MEETING_NOTE = "MEETING NOTE";

/** DocuSign send task subjects start with this */
export const DOCUSIGN_SEND = "SEND DOCU";

/** Follow-up task subjects start with this */
export const FOLLOW_UP = "FOLLOW-UP";

/** Planning goal task subjects start with this */
export const GOAL = "GOAL:";

/** Paperwork generation task subjects start with this */
export const PAPERWORK = "Paperwork generated";

/** Funding configuration task subjects start with this */
export const FUNDING = "Funding configured";

/** MoneyLink/ACH setup task subjects start with this */
export const MONEYLINK = "MoneyLink setup";

/** Beneficiary designation task subjects start with this */
export const BENEFICIARY = "Beneficiary designations";

/** Completeness check task subjects start with this */
export const COMPLETENESS = "Completeness check";

/** DocuSign configuration task subjects start with this */
export const DOCUSIGN_CONFIG = "DocuSign configured";

// ─── Classification ─────────────────────────────────────────────────────────
//
// Standardized task type classification used across the UI.
// Every component that categorizes tasks should use these functions
// instead of inline string matching.

export type TaskType = "compliance" | "meeting" | "docusign" | "followup" | "goal" | "task";

/**
 * Classify a task by its subject line.
 * Returns a stable TaskType used for icons, colors, and filtering.
 */
export function classifyTask(subject: string): TaskType {
  if (!subject) return "task";
  const s = subject.toUpperCase();
  if (s.includes(COMPLIANCE_REVIEW)) return "compliance";
  if (s.includes(DOCUSIGN_SEND) || s.includes("DOCUSIGN")) return "docusign";
  if (s.includes(MEETING_NOTE)) return "meeting";
  if (s.includes(FOLLOW_UP)) return "followup";
  if (s.startsWith(GOAL)) return "goal";
  return "task";
}

// ─── Matchers ───────────────────────────────────────────────────────────────
// Predicate functions for filtering task arrays.
// Prefer these over inline .includes() calls.

export function isComplianceReview(subject?: string): boolean {
  return !!subject?.includes(COMPLIANCE_REVIEW);
}

export function isMeetingNote(subject?: string): boolean {
  return !!subject?.includes(MEETING_NOTE);
}

export function isDocuSignSend(subject?: string): boolean {
  return !!subject && (subject.includes(DOCUSIGN_SEND) || subject.includes("DocuSign"));
}

export function isFollowUp(subject?: string): boolean {
  return !!subject?.includes(FOLLOW_UP);
}

export function isGoal(subject?: string): boolean {
  return !!subject && (subject.includes(GOAL) || subject.includes("PLAN:") || subject.includes("MILESTONE:"));
}

export function isPaperwork(subject?: string): boolean {
  return !!subject?.includes(PAPERWORK);
}

// ─── Display Labels ─────────────────────────────────────────────────────────

export const TASK_TYPE_LABELS: Record<TaskType, string> = {
  compliance: "Compliance",
  meeting: "Meeting",
  docusign: "DocuSign",
  followup: "Follow-up",
  goal: "Goal",
  task: "General",
};
