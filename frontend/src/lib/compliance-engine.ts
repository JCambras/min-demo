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

// ─── Keyword Mapping ────────────────────────────────────────────────────────
// Each compliance check matches against one or more keywords in task text.
// Firms can override the defaults to match their own naming conventions.
// e.g. a firm using "Client Profile Update" instead of "KYC" can add that keyword.

/** Maps check IDs → arrays of keywords to search for in task subjects/descriptions. */
export type KeywordMap = Record<string, string[]>;

/**
 * Default keywords for each built-in compliance check.
 * These match common Salesforce task naming conventions.
 */
export const DEFAULT_KEYWORD_MAP: KeywordMap = {
  "kyc-profile":              ["kyc", "suitability"],
  "trusted-contact":          ["trusted contact"],
  "identity-verified":        ["identity verified", "gov id"],
  "suitability-profile":      ["risk", "investment objective", "suitability"],
  "pte-trigger":              ["rollover", "pte"],
  "pte-compliance":           ["pte"],
  "form-crs":                 ["form crs", "client relationship summary"],
  "adv-delivery":             ["adv", "advisory", "brochure"],
  "privacy-notice":           ["privacy"],
  "beneficiary-designation":  ["beneficiar"],
  "signatures":               ["docusign", "docu"],
  "ach-authorization":        ["moneylink", "ach"],
  "completeness-check":       ["completeness"],
};

/** Human-readable labels for keyword map entries (used in config UI). */
export const KEYWORD_CHECK_LABELS: Record<string, string> = {
  "kyc-profile":              "KYC Profile Completed",
  "trusted-contact":          "Trusted Contact Designated",
  "identity-verified":        "Identity Verification",
  "suitability-profile":      "Suitability Profile Current",
  "pte-trigger":              "PTE Rollover Detection",
  "pte-compliance":           "PTE 2020-02 Documentation",
  "form-crs":                 "Form CRS Delivered",
  "adv-delivery":             "ADV Part 2A Disclosure",
  "privacy-notice":           "Privacy Notice Delivered",
  "beneficiary-designation":  "Beneficiary Designations",
  "signatures":               "Signatures Obtained",
  "ach-authorization":        "ACH Authorization",
  "completeness-check":       "Completeness Check",
};

// ─── Persistence Keys ───────────────────────────────────────────────────────

export const CUSTOM_CHECKS_KEY = "min-custom-compliance-checks";
export const SCHEDULES_KEY = "min-compliance-schedules";
export const KEYWORD_MAP_KEY = "min-compliance-keyword-map";

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

/** Load firm-specific keyword overrides. Only contains check IDs that were customized. */
export function loadKeywordMap(): KeywordMap {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(KEYWORD_MAP_KEY) || "{}"); } catch { return {}; }
}

/** Save firm-specific keyword overrides. */
export function saveKeywordMap(overrides: KeywordMap) {
  localStorage.setItem(KEYWORD_MAP_KEY, JSON.stringify(overrides));
}

/**
 * Merge default keywords with firm overrides.
 * If a check ID exists in overrides, those keywords replace the defaults entirely.
 * Check IDs not in overrides keep their defaults.
 */
export function getEffectiveKeywordMap(overrides?: KeywordMap): KeywordMap {
  return { ...DEFAULT_KEYWORD_MAP, ...(overrides ?? loadKeywordMap()) };
}

// ─── Compliance Check Runner ────────────────────────────────────────────────
// Given a household's SF data, produce compliance check results.

export function runComplianceChecks(
  household: SFHousehold,
  contacts: SFContact[],
  tasks: SFTask[],
  keywordOverrides?: KeywordMap,
): CheckResult[] {
  const checks: CheckResult[] = [];
  const map = getEffectiveKeywordMap(keywordOverrides);
  const taskSubjects = tasks.map(t => (t.subject || "").toLowerCase());
  const taskDescs = tasks.map(t => (t.description || "").toLowerCase());
  const allTaskText = [...taskSubjects, ...taskDescs].join(" ");

  // Helper: does any task mention this keyword?
  const hasTask = (keyword: string) => allTaskText.includes(keyword.toLowerCase());

  // Helper: does any keyword for this check match?
  const hasCheck = (checkId: string) => (map[checkId] || []).some(kw => hasTask(kw));

  // Helper: which keywords for this check matched? (for evidence building)
  const matchedKeywords = (checkId: string) => (map[checkId] || []).filter(kw => hasTask(kw));

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
    status: hasCheck("kyc-profile") ? "pass" : "fail",
    detail: hasCheck("kyc-profile")
      ? `KYC recorded for ${contacts.length} contact(s)`
      : "No KYC/suitability record found — required before account activity",
    evidence: hasCheck("kyc-profile") ? kycEvidence : undefined,
    whyItMatters: "FINRA requires firms to know the essential facts about every customer. Without a KYC profile, the firm cannot demonstrate suitability of recommendations during an examination.",
  });

  checks.push({
    id: "trusted-contact",
    category: "identity",
    label: "Trusted Contact Designated",
    regulation: "FINRA Rule 4512",
    status: hasCheck("trusted-contact") ? "pass" : "warn",
    detail: hasCheck("trusted-contact")
      ? "Trusted contact on file"
      : "No trusted contact task found — required for new accounts opened after Feb 2018",
    whyItMatters: "A trusted contact allows the firm to reach someone if there are concerns about the client's wellbeing or potential financial exploitation. Required for all accounts opened after February 5, 2018.",
  });

  checks.push({
    id: "identity-verified",
    category: "identity",
    label: "Identity Verification",
    regulation: "USA PATRIOT Act / CIP Rule",
    status: hasCheck("identity-verified") ? "pass" : "fail",
    detail: hasCheck("identity-verified")
      ? "Government ID verified and on file"
      : "No identity verification record — required by Customer Identification Program",
    whyItMatters: "The Customer Identification Program (CIP) requires firms to verify each customer's identity using government-issued documents. Failure creates AML compliance risk and potential enforcement action.",
  });

  // ── SUITABILITY ──

  const hasSuitability = hasCheck("suitability-profile");
  const suitKeywords = matchedKeywords("suitability-profile");
  const suitEvidence: string[] = [];
  if (suitKeywords.some(kw => kw === "risk")) suitEvidence.push("Risk tolerance documented");
  if (suitKeywords.some(kw => kw === "investment objective")) suitEvidence.push("Investment objectives documented");
  if (suitKeywords.some(kw => kw === "suitability")) suitEvidence.push("Suitability questionnaire completed");
  // If matched via custom keywords not in the default evidence set, show generic evidence
  if (suitEvidence.length === 0 && hasSuitability) suitEvidence.push("Suitability profile documented");

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
  const hasRollover = hasCheck("pte-trigger");
  if (hasRollover) {
    checks.push({
      id: "pte-compliance",
      category: "suitability",
      label: "PTE 2020-02 Documentation",
      regulation: "DOL Prohibited Transaction Exemption",
      status: hasCheck("pte-compliance") ? "pass" : "warn",
      detail: hasCheck("pte-compliance")
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
    status: hasCheck("form-crs") ? "pass" : "fail",
    detail: hasCheck("form-crs")
      ? "Form CRS delivered and acknowledged"
      : "No Form CRS delivery record — required at or before account opening",
    whyItMatters: "Form CRS must be delivered before or at the time of an investment recommendation. SEC examiners check for delivery records as a priority item. Missing CRS is a common deficiency finding.",
  });

  checks.push({
    id: "adv-delivery",
    category: "documents",
    label: "ADV Part 2A Disclosure",
    regulation: "SEC Rule 204-3 (Brochure Rule)",
    status: hasCheck("adv-delivery") ? "pass" : "warn",
    detail: hasCheck("adv-delivery")
      ? "Advisory business practices addendum delivered"
      : "No ADV delivery record found — required within 48 hours of engagement",
    whyItMatters: "The Brochure Rule requires delivery of ADV Part 2A before or at the time of entering an advisory contract. It must also be offered annually. This is one of the first items SEC examiners request.",
  });

  checks.push({
    id: "privacy-notice",
    category: "documents",
    label: "Privacy Notice Delivered",
    regulation: "Regulation S-P",
    status: hasCheck("privacy-notice") ? "pass" : "warn",
    detail: hasCheck("privacy-notice")
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
    status: hasCheck("beneficiary-designation") ? "pass" : "warn",
    detail: hasCheck("beneficiary-designation")
      ? "Beneficiary designations recorded for all applicable accounts"
      : "No beneficiary designation record — recommended for all retirement accounts",
    whyItMatters: "Missing beneficiary designations cause assets to default to the estate, potentially conflicting with the client's planning intent. This is also the #1 Schwab NIGO rejection reason for IRA applications.",
  });

  const hasDocusign = hasCheck("signatures");
  const docuTasks = tasks.filter(t => (map["signatures"] || []).some(kw => (t.subject || "").toLowerCase().includes(kw)));
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

  if (hasCheck("ach-authorization")) {
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
  if (hasCheck("completeness-check")) {
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
    status: hasCheck("completeness-check") ? "pass" : "fail",
    detail: hasCheck("completeness-check")
      ? "All required information verified and completeness check recorded"
      : "No completeness check on file — creates audit risk during SEC examination",
    evidence: hasCheck("completeness-check") ? complEvidence : undefined,
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
