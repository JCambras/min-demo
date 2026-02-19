// ─── Core Types ──────────────────────────────────────────────────────────────

export type Screen = "home" | "flow" | "onboard" | "compliance" | "settings" | "briefing" | "meeting" | "query" | "dashboard" | "family" | "taskManager" | "planning" | "workflows" | "money" | "documents" | "portal" | "activity" | "audit";

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

/** A firm managed under the shared-services model */
export interface ManagedFirm {
  id: string;
  name: string;
  shortName: string;
  households: number;
  color: string;           // badge color (hex)
  complianceThresholdDays: number; // days between required reviews
}

const FIRMS_KEY = "min-managed-firms";

export const DEFAULT_FIRMS: ManagedFirm[] = [
  { id: "langford", name: "Langford Steele Wealth Management", shortName: "Langford", households: 420, color: "#0f172a", complianceThresholdDays: 90 },
  { id: "chen", name: "Chen & Associates", shortName: "Chen", households: 65, color: "#7c3aed", complianceThresholdDays: 60 },
  { id: "omalley", name: "O'Malley Financial Group", shortName: "O'Malley", households: 48, color: "#0891b2", complianceThresholdDays: 90 },
  { id: "brooks", name: "Brooks Capital Advisors", shortName: "Brooks", households: 55, color: "#059669", complianceThresholdDays: 90 },
  { id: "reeves", name: "Reeves Wealth Partners", shortName: "Reeves", households: 42, color: "#dc2626", complianceThresholdDays: 60 },
];

export function loadFirms(): ManagedFirm[] {
  if (typeof window === "undefined") return DEFAULT_FIRMS;
  try { const raw = localStorage.getItem(FIRMS_KEY); return raw ? JSON.parse(raw) : DEFAULT_FIRMS; } catch { return DEFAULT_FIRMS; }
}

export function saveFirms(firms: ManagedFirm[]) {
  localStorage.setItem(FIRMS_KEY, JSON.stringify(firms));
}

// ─── Household Notes ──────────────────────────────────────────────────────

export interface HouseholdNote {
  id: string;
  householdId: string;
  text: string;
  author: string;
  createdAt: string;
  pinned: boolean;
  category: "general" | "hold" | "urgent" | "context";
}

const HOUSEHOLD_NOTES_KEY = "min-household-notes";

export function loadNotes(householdId?: string): HouseholdNote[] {
  if (typeof window === "undefined") return [];
  try {
    const all: HouseholdNote[] = JSON.parse(localStorage.getItem(HOUSEHOLD_NOTES_KEY) || "[]");
    return householdId ? all.filter(n => n.householdId === householdId) : all;
  } catch { return []; }
}

export function saveNote(note: HouseholdNote) {
  const all = loadNotes();
  const idx = all.findIndex(n => n.id === note.id);
  if (idx >= 0) all[idx] = note; else all.push(note);
  localStorage.setItem(HOUSEHOLD_NOTES_KEY, JSON.stringify(all));
}

export function deleteNote(id: string) {
  const all = loadNotes().filter(n => n.id !== id);
  localStorage.setItem(HOUSEHOLD_NOTES_KEY, JSON.stringify(all));
}

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
