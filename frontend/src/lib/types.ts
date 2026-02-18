// ─── Core Types ──────────────────────────────────────────────────────────────

export type Screen = "home" | "flow" | "onboard" | "compliance" | "settings" | "briefing" | "meeting" | "query" | "dashboard" | "family" | "taskManager" | "planning" | "workflows" | "money" | "documents";

/**
 * Exhaustiveness check for switch statements on union types.
 * If a new variant is added to a union (e.g. Screen) and not handled,
 * TypeScript will produce a compile error at the assertNever call.
 *
 * Usage:
 *   switch (screen) {
 *     case "home": ...
 *     case "flow": ...
 *     default: assertNever(screen);
 *   }
 */
export function assertNever(value: never, message?: string): never {
  throw new Error(message || `Unexpected value: ${value}`);
}

/** Context passed between workflows to skip redundant household search */
export interface WorkflowContext {
  householdId: string;
  familyName: string;
  primaryContactId?: string;
}

export type UserRole = "advisor" | "operations" | "principal";

export type FlowStep =
  | "context" | "client-type" | "search-existing"
  | "enter-client-p1" | "enter-client-p2"
  | "select-accounts-p1" | "select-accounts-p2" | "select-accounts-joint"
  | "funding" | "moneylink" | "beneficiaries"
  | "review" | "generating" | "complete";

export type OnboardStep = "ob-p1" | "ob-p2" | "ob-review" | "ob-generating" | "ob-complete";

export type ComplianceStep = "cc-search" | "cc-scanning" | "cc-results" | "cc-recording" | "cc-complete";

export interface ClientInfo {
  firstName: string; lastName: string; email: string; phone: string;
  street: string; city: string; state: string; zip: string;
  dob: string; ssn: string; citizenship: string;
  idType: string; idNumber: string; idState: string; idExpiration: string;
  maritalStatus: string; employmentStatus: string; employer: string;
  annualIncome: string; netWorth: string; liquidNetWorth: string;
  investmentExperience: string; riskTolerance: string; investmentObjective: string;
  trustedContactName: string; trustedContactLastName: string;
  trustedContactPhone: string; trustedContactRelationship: string;
}

export interface AccountRequest {
  id: string;
  owner: string;
  type: string;
  purpose?: string;
  funding?: string;
  allocation?: string;
  amount?: string;
  fundingAmount?: string;
  signers: number;
}

export interface Beneficiary {
  accountId: string;
  name: string;
  relationship: string;
  percentage: number;
  beneType: "primary" | "contingent";
}

export interface SFEvidence {
  label: string;
  url?: string;
  timestamp?: string;
}

export interface SFRefs {
  householdId?: string;
  householdUrl?: string;
  contacts?: { id: string; url: string; name: string }[];
  primaryContactId?: string;
  envelopeIds?: string[];
}

export interface SearchResult {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  household: string;
  source: "salesforce";
}

export interface EnvStatus {
  envelopeId: string;
  status: string;
  name?: string;
}

export const emptyClient = (): ClientInfo => ({
  firstName: "", lastName: "", email: "", phone: "",
  street: "", city: "", state: "", zip: "",
  dob: "", ssn: "", citizenship: "US Citizen",
  idType: "Driver's License", idNumber: "", idState: "", idExpiration: "",
  maritalStatus: "", employmentStatus: "", employer: "",
  annualIncome: "", netWorth: "", liquidNetWorth: "",
  investmentExperience: "", riskTolerance: "", investmentObjective: "",
  trustedContactName: "", trustedContactLastName: "",
  trustedContactPhone: "", trustedContactRelationship: "",
});
