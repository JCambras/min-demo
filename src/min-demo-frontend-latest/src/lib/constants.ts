import type { FlowStep } from "./types";

// ─── Intent & Account Types ─────────────────────────────────────────────────

export const INTENT_CHIPS = [
  "Open new accounts",
  "Rollover (401k, TSP, pension)",
  "Transfer assets (TOA)",
  "ACH / MoneyLink setup",
  "Beneficiary update",
  "Something else",
];

export const INDIV_TYPES = [
  "IRA", "Roth IRA", "Individual", "Individual TOD",
  "SEP IRA", "SIMPLE IRA", "401(k)", "529 Plan",
];

export const JOINT_TYPES = [
  { label: "Joint Tenants with Right of Survivorship", abbr: "JTWROS" },
  { label: "Joint Tenants with Right of Survivorship — Transfer on Death", abbr: "JTWROS TOD" },
  { label: "Tenants in Common", abbr: "Joint TIC" },
  { label: "Community Property", abbr: "Community Property" },
];

// ─── Reference Data ─────────────────────────────────────────────────────────

export const US_STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export const RELATIONSHIPS = [
  "Spouse", "Child", "Parent", "Sibling", "Grandchild",
  "Trust", "Estate", "Charity", "Friend", "Other",
];

export const BROKERAGES = [
  "Fidelity Investments", "Vanguard", "Merrill Lynch", "Morgan Stanley",
  "Edward Jones", "TD Ameritrade", "E*Trade", "Charles Schwab",
  "UBS Financial", "Raymond James", "Wells Fargo Advisors",
  "Ameriprise Financial", "LPL Financial", "TIAA", "Northwestern Mutual",
  "Principal Financial", "Empower Retirement", "John Hancock",
  "T. Rowe Price", "Nationwide", "Lincoln Financial", "MassMutual",
  "ADP Retirement", "Prudential", "MetLife",
];

export const ROUTING_DB: Record<string, { name: string; full: string }[]> = {
  "35": [{ name: "TruMark Financial Credit Union", full: "236083524" }],
  "352": [{ name: "TruMark Financial Credit Union", full: "236083524" }],
  "3524": [{ name: "TruMark Financial Credit Union", full: "236083524" }],
  "00": [{ name: "Bank of America (East)", full: "011000015" }, { name: "Bank of America (West)", full: "026009593" }],
  "0001": [{ name: "Bank of America", full: "011000015" }],
  "67": [{ name: "Chase Bank", full: "021000021" }, { name: "US Bank", full: "042100678" }],
  "6789": [{ name: "Chase Bank", full: "021006789" }],
  "22": [{ name: "Wells Fargo", full: "121042211" }],
  "2211": [{ name: "Wells Fargo", full: "121042211" }],
  "44": [{ name: "PNC Bank", full: "043000096" }],
  "4455": [{ name: "PNC Bank", full: "031207607" }],
  "99": [{ name: "Citizens Bank", full: "011500120" }],
  "9900": [{ name: "Citizens Bank", full: "021313103" }],
};

// ─── Flow Configuration ─────────────────────────────────────────────────────

export const FLOW_STEPS_ORDER: FlowStep[] = [
  "context", "client-type", "enter-client-p1", "select-accounts-p1",
  "funding", "moneylink", "beneficiaries", "review", "generating", "complete",
];

export const STEP_LABELS: Record<string, string> = {
  context: "Intent", "client-type": "Client", "search-existing": "Client",
  "enter-client-p1": "Details", "enter-client-p2": "Details",
  "select-accounts-p1": "Accounts", "select-accounts-p2": "Accounts",
  "select-accounts-joint": "Accounts",
  funding: "Funding", moneylink: "ACH", beneficiaries: "Beneficiaries",
  review: "Review", generating: "Generating", complete: "Done",
};

// Open Accounts GEN_STEPS removed — derived from pipeline in useFlowState.ts
// See CONVENTIONS.md: step labels come from the pipeline, not a separate constant.

export const OB_GEN_STEPS = [
  "Creating household record",
  "Creating contact records",
  "Recording KYC & suitability",
  "Running compliance review",
  "Done",
];

export const OB_STEP_LABELS: Record<string, string> = {
  "ob-p1": "Primary", "ob-p2": "Spouse", "ob-review": "Review",
  "ob-generating": "Creating", "ob-complete": "Done",
};

export const OB_STEPS_ORDER = ["ob-p1", "ob-p2", "ob-review", "ob-generating", "ob-complete"];

// ─── Home Screen Actions ────────────────────────────────────────────────────

// Home screen QUICK_ACTIONS moved to page.tsx — removed from here to avoid stale duplicates.
