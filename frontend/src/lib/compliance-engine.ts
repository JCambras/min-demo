// ─── Compliance Engine ──────────────────────────────────────────────────────
//
// Core business logic for household compliance checking.
// Extracted from ComplianceScreen so it can be shared across:
//   - ComplianceScreen (full scan UI)
//   - HomeScreen (regulatory feed → custom check persistence)
//   - PracticePlaybook (config export)

import { custodian } from "@/lib/custodian";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CheckResult {
  id: string;
  category: "identity" | "suitability" | "documents" | "account" | "regulatory" | "firm";
  label: string;
  regulation: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  evidence?: string[];
  whyItMatters: string;
}

export interface CustomCheck {
  id: string;
  label: string;
  keyword: string;        // keyword to search for in task text
  regulation: string;     // e.g. "Firm Internal Policy"
  whyItMatters: string;
  failStatus: "fail" | "warn";  // severity when keyword not found
}

export interface ComplianceSchedule {
  id: string;
  name: string;
  frequency: "daily" | "weekly" | "monthly";
  criteria: "all" | "below-threshold";
  threshold: number;       // score threshold when criteria = "below-threshold"
  emailReport: boolean;
  emailTo: string;
  enabled: boolean;
  createdAt: string;
  lastRunAt?: string;
  lastRunHouseholds?: number;
  lastRunFails?: number;
  lastRunSkipped?: number;
}

// Lightweight SF record shapes used by the compliance engine.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SFHousehold = { id: string; name: string; description: string; createdAt: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SFContact = { id: string; firstName: string; lastName: string; email: string; phone: string; createdAt: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type SFTask = { id: string; subject: string; status: string; priority: string; description: string; createdAt: string; dueDate: string };

// ─── Persistence Keys ───────────────────────────────────────────────────────

export const CUSTOM_CHECKS_KEY = "min-custom-compliance-checks";
export const SCHEDULES_KEY = "min-compliance-schedules";

// ─── Load / Save Helpers ────────────────────────────────────────────────────

export function loadCustomChecks(): CustomCheck[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CUSTOM_CHECKS_KEY) || "[]"); } catch { return []; }
}

export function saveCustomChecks(checks: CustomCheck[]) {
  localStorage.setItem(CUSTOM_CHECKS_KEY, JSON.stringify(checks));
}

export function loadSchedules(): ComplianceSchedule[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(SCHEDULES_KEY) || "[]"); } catch { return []; }
}

export function saveSchedules(schedules: ComplianceSchedule[]) {
  localStorage.setItem(SCHEDULES_KEY, JSON.stringify(schedules));
}

// ─── Compliance Check Runner ────────────────────────────────────────────────
// Given a household's SF data, produce compliance check results.

export function runComplianceChecks(
  household: SFHousehold,
  contacts: SFContact[],
  tasks: SFTask[],
): CheckResult[] {
  const checks: CheckResult[] = [];
  const taskSubjects = tasks.map(t => (t.subject || "").toLowerCase());
  const taskDescs = tasks.map(t => (t.description || "").toLowerCase());
  const allTaskText = [...taskSubjects, ...taskDescs].join(" ");

  // Helper: does any task mention this keyword?
  const hasTask = (keyword: string) => allTaskText.includes(keyword.toLowerCase());

  // ── IDENTITY & KYC ──

  const kycEvidence: string[] = [];
  if (contacts.length > 0) kycEvidence.push(`${contacts.length} contact(s) on file`);
  contacts.forEach(c => {
    const fields = [c.firstName && c.lastName ? `Name: ${c.firstName} ${c.lastName}` : null, c.email ? "Email populated" : null, c.phone ? "Phone populated" : null].filter(Boolean);
    if (fields.length > 0) kycEvidence.push(fields.join(", "));
  });

  checks.push({
    id: "kyc-profile",
    category: "identity",
    label: "KYC Profile Completed",
    regulation: "FINRA Rule 2090 (Know Your Customer)",
    status: hasTask("kyc") || hasTask("suitability") ? "pass" : "fail",
    detail: hasTask("kyc") || hasTask("suitability")
      ? `KYC recorded for ${contacts.length} contact(s)`
      : "No KYC/suitability record found — required before account activity",
    evidence: hasTask("kyc") || hasTask("suitability") ? kycEvidence : undefined,
    whyItMatters: "FINRA requires firms to know the essential facts about every customer. Without a KYC profile, the firm cannot demonstrate suitability of recommendations during an examination.",
  });

  checks.push({
    id: "trusted-contact",
    category: "identity",
    label: "Trusted Contact Designated",
    regulation: "FINRA Rule 4512",
    status: hasTask("trusted contact") ? "pass" : "warn",
    detail: hasTask("trusted contact")
      ? "Trusted contact on file"
      : "No trusted contact task found — required for new accounts opened after Feb 2018",
    whyItMatters: "A trusted contact allows the firm to reach someone if there are concerns about the client's wellbeing or potential financial exploitation. Required for all accounts opened after February 5, 2018.",
  });

  checks.push({
    id: "identity-verified",
    category: "identity",
    label: "Identity Verification",
    regulation: "USA PATRIOT Act / CIP Rule",
    status: hasTask("identity verified") || hasTask("gov id") ? "pass" : "fail",
    detail: hasTask("identity verified") || hasTask("gov id")
      ? "Government ID verified and on file"
      : "No identity verification record — required by Customer Identification Program",
    whyItMatters: "The Customer Identification Program (CIP) requires firms to verify each customer's identity using government-issued documents. Failure creates AML compliance risk and potential enforcement action.",
  });

  // ── SUITABILITY ──

  const hasSuitability = hasTask("risk") || hasTask("investment objective") || hasTask("suitability");
  const suitEvidence: string[] = [];
  if (hasTask("risk")) suitEvidence.push("Risk tolerance documented");
  if (hasTask("investment objective")) suitEvidence.push("Investment objectives documented");
  if (hasTask("suitability")) suitEvidence.push("Suitability questionnaire completed");

  checks.push({
    id: "suitability-profile",
    category: "suitability",
    label: "Suitability Profile Current",
    regulation: "FINRA Rule 2111 / Reg BI",
    status: hasSuitability ? "pass" : "fail",
    detail: hasSuitability
      ? "Risk tolerance, investment objective, and financial profile on file"
      : "No suitability profile found — required before investment recommendations",
    evidence: hasSuitability ? suitEvidence : undefined,
    whyItMatters: "Reg BI requires a reasonable basis to believe any recommendation is in the client's best interest. Without a documented suitability profile, every recommendation is indefensible in an exam.",
  });

  // Check if any rollover was done — needs PTE documentation
  const hasRollover = hasTask("rollover") || hasTask("pte");
  if (hasRollover) {
    checks.push({
      id: "pte-compliance",
      category: "suitability",
      label: "PTE 2020-02 Documentation",
      regulation: "DOL Prohibited Transaction Exemption",
      status: hasTask("pte") ? "pass" : "warn",
      detail: hasTask("pte")
        ? "Rollover Recommendation + PTE form generated and signed"
        : "Rollover detected but no PTE documentation found",
      whyItMatters: "DOL PTE 2020-02 requires documented proof that a rollover recommendation is in the client's best interest. Missing PTE documentation is a top enforcement priority — fines can exceed $100K per violation.",
    });
  }

  // ── DOCUMENTS ──

  checks.push({
    id: "form-crs",
    category: "documents",
    label: "Form CRS Delivered",
    regulation: "SEC Rule 17a-14 / Reg BI",
    status: hasTask("form crs") || hasTask("client relationship summary") ? "pass" : "fail",
    detail: hasTask("form crs") || hasTask("client relationship summary")
      ? "Form CRS delivered and acknowledged"
      : "No Form CRS delivery record — required at or before account opening",
    whyItMatters: "Form CRS must be delivered before or at the time of an investment recommendation. SEC examiners check for delivery records as a priority item. Missing CRS is a common deficiency finding.",
  });

  checks.push({
    id: "adv-delivery",
    category: "documents",
    label: "ADV Part 2A Disclosure",
    regulation: "SEC Rule 204-3 (Brochure Rule)",
    status: hasTask("adv") || hasTask("advisory") || hasTask("brochure") ? "pass" : "warn",
    detail: hasTask("adv") || hasTask("advisory") || hasTask("brochure")
      ? "Advisory business practices addendum delivered"
      : "No ADV delivery record found — required within 48 hours of engagement",
    whyItMatters: "The Brochure Rule requires delivery of ADV Part 2A before or at the time of entering an advisory contract. It must also be offered annually. This is one of the first items SEC examiners request.",
  });

  checks.push({
    id: "privacy-notice",
    category: "documents",
    label: "Privacy Notice Delivered",
    regulation: "Regulation S-P",
    status: hasTask("privacy") ? "pass" : "warn",
    detail: hasTask("privacy")
      ? "Privacy notice delivered"
      : "No privacy notice record — required annually and at account opening",
    whyItMatters: "Regulation S-P requires initial and annual privacy notice delivery. While often overlooked, missing privacy notices can result in enforcement actions during routine examinations.",
  });

  // ── ACCOUNT SETUP ──

  checks.push({
    id: "beneficiary-designation",
    category: "account",
    label: "Beneficiary Designations Complete",
    regulation: "Firm Best Practice / ERISA",
    status: hasTask("beneficiar") ? "pass" : "warn",
    detail: hasTask("beneficiar")
      ? "Beneficiary designations recorded for all applicable accounts"
      : "No beneficiary designation record — recommended for all retirement accounts",
    whyItMatters: "Missing beneficiary designations cause assets to default to the estate, potentially conflicting with the client's planning intent. This is also the #1 Schwab NIGO rejection reason for IRA applications.",
  });

  const hasDocusign = hasTask("docusign") || hasTask("docu");
  const docuTasks = tasks.filter(t => (t.subject || "").toLowerCase().includes("docu"));
  checks.push({
    id: "signatures",
    category: "account",
    label: "All Signatures Obtained",
    regulation: `Custodial Requirement / ${custodian.shortName}`,
    status: hasDocusign ? "pass" : "fail",
    detail: hasDocusign
      ? "DocuSign envelopes sent and tracked"
      : "No signature record found — accounts cannot be funded without signed applications",
    evidence: hasDocusign ? docuTasks.slice(0, 3).map(t => `Envelope: ${t.subject} (${t.status})`) : undefined,
    whyItMatters: `${custodian.shortName} requires signed originals (or DocuSign equivalents) for all account applications. Unsigned applications will be rejected as NIGO.`,
  });

  if (hasTask("moneylink") || hasTask("ach")) {
    checks.push({
      id: "ach-authorization",
      category: "account",
      label: "ACH Authorization on File",
      regulation: "NACHA Operating Rules",
      status: "pass",
      detail: "MoneyLink/ACH authorization recorded",
      whyItMatters: "NACHA rules require explicit authorization before initiating ACH debits. The authorization form must be retained for 2 years after revocation.",
    });
  }

  // ── REGULATORY ──

  const complEvidence: string[] = [];
  if (hasTask("completeness")) {
    complEvidence.push(`${tasks.length} total SF records scanned`);
    complEvidence.push(`${contacts.length} contact(s) on file`);
    const compCount = tasks.filter(t => t.status === "Completed").length;
    if (compCount > 0) complEvidence.push(`${compCount} tasks completed`);
  }

  checks.push({
    id: "completeness-check",
    category: "regulatory",
    label: "Completeness Check Passed",
    regulation: "SEC Examination Readiness",
    status: hasTask("completeness") ? "pass" : "fail",
    detail: hasTask("completeness")
      ? "All required information verified and completeness check recorded"
      : "No completeness check on file — creates audit risk during SEC examination",
    evidence: hasTask("completeness") ? complEvidence : undefined,
    whyItMatters: "SEC examiners expect a documented completeness check showing all client information was verified before account funding. This is your first line of defense during an exam.",
  });

  // Household creation date — check staleness
  const createdDate = new Date(household.createdAt);
  const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceCreation > 365) {
    checks.push({
      id: "annual-review",
      category: "regulatory",
      label: "Annual Review Due",
      regulation: "SEC Examination Best Practice",
      status: "warn",
      detail: `Household created ${daysSinceCreation} days ago — annual review recommended`,
      whyItMatters: "The SEC expects firms to conduct regular reviews of client accounts and relationships. A household without a review in over a year signals inadequate supervision to examiners.",
    });
  }

  // ── FIRM CUSTOM CHECKS ──
  const customChecks = loadCustomChecks();
  for (const cc of customChecks) {
    const found = hasTask(cc.keyword);
    checks.push({
      id: `custom-${cc.id}`,
      category: "firm",
      label: cc.label,
      regulation: cc.regulation,
      status: found ? "pass" : cc.failStatus,
      detail: found
        ? `"${cc.keyword}" found in household records`
        : `No record matching "${cc.keyword}" — required by firm policy`,
      whyItMatters: cc.whyItMatters,
    });
  }

  return checks;
}
