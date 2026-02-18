// ─── Custodian Rules Engine ──────────────────────────────────────────────────
//
// Account-opening rules for each custodian × account type.
// Covers: required documents, conditional documents, signer counts,
// beneficiary requirements, income eligibility (Roth), contribution limits,
// and NIGO (Not In Good Order) rejection risks with prevention strategies.
//
// This is a DATA file — no React, no API calls.

import type { CustodianId } from "@/lib/custodian";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface DocumentRule {
  name: string;
  reason: string;
  regulation?: string;
}

export interface ConditionalDocumentRule extends DocumentRule {
  condition: string;
  triggerField: string;
  triggerValue: string;
}

export interface IncomeEligibility {
  maxMAGI_single: number;
  maxMAGI_joint: number;
  year: number;
  phaseOutStart_single: number;
  phaseOutStart_joint: number;
  alternatives: string[];
  alternativeNote: string;
}

export interface ContributionLimit {
  under50: number;
  over50: number;
  year: number;
}

export interface NIGORisk {
  risk: string;
  frequency: "most_common" | "common" | "occasional";
  impact: string;
  prevention: string;
}

export interface AccountTypeRules {
  accountType: string;
  custodianId: CustodianId;
  displayName: string;
  signerCount: number;
  requiresBeneficiary: boolean;
  beneficiaryNote?: string;
  requiredDocuments: DocumentRule[];
  conditionalDocuments: ConditionalDocumentRule[];
  incomeEligibility?: IncomeEligibility;
  contributionLimit?: ContributionLimit;
  nigoRisks: NIGORisk[];
  estimatedMinutes: number;
  notes?: string;
}

// ─── Frequency ordering (for sorting) ────────────────────────────────────────

const FREQUENCY_ORDER: Record<NIGORisk["frequency"], number> = {
  most_common: 0,
  common: 1,
  occasional: 2,
};

// ─── Schwab Account Type Rules ───────────────────────────────────────────────

const SCHWAB_RULES: AccountTypeRules[] = [
  // 1. Individual Brokerage
  {
    accountType: "Individual Brokerage",
    custodianId: "schwab",
    displayName: "Schwab Individual Brokerage",
    signerCount: 1,
    requiresBeneficiary: false,
    requiredDocuments: [
      { name: "Account Application", reason: "Required for all new accounts" },
      { name: "Form CRS", reason: "SEC-required client relationship summary" },
      { name: "Advisory Addendum", reason: "Required for advisory accounts" },
    ],
    conditionalDocuments: [
      {
        name: "MoneyLink Authorization",
        reason: "Required for ACH funding setup",
        condition: "Funding via ACH",
        triggerField: "funding_method",
        triggerValue: "ACH",
      },
      {
        name: "Transfer of Assets (TOA) Form",
        reason: "Required to transfer assets from another institution",
        condition: "Funding via transfer from another brokerage",
        triggerField: "funding_method",
        triggerValue: "Transfer",
      },
      {
        name: "Letter of Authorization (LOA)",
        reason: "Authorizes the transfer of assets on client's behalf",
        condition: "Funding via transfer from another brokerage",
        triggerField: "funding_method",
        triggerValue: "Transfer",
      },
    ],
    nigoRisks: [
      {
        risk: "Missing employment information",
        frequency: "common",
        impact: "3-5 business day delay",
        prevention: "Employment section marked required in application flow",
      },
      {
        risk: "Unsigned application",
        frequency: "occasional",
        impact: "Application returned, 5-7 business day delay",
        prevention: "DocuSign enforces signature before submission",
      },
    ],
    estimatedMinutes: 15,
  },

  // 2. JTWROS
  {
    accountType: "JTWROS",
    custodianId: "schwab",
    displayName: "Schwab Joint Tenants with Right of Survivorship",
    signerCount: 2,
    requiresBeneficiary: false,
    requiredDocuments: [
      { name: "Joint Account Application", reason: "Required for all joint accounts" },
      { name: "Form CRS", reason: "SEC-required client relationship summary" },
      { name: "Advisory Addendum", reason: "Required for advisory accounts" },
    ],
    conditionalDocuments: [
      {
        name: "MoneyLink Authorization",
        reason: "Required for ACH funding setup",
        condition: "Funding via ACH",
        triggerField: "funding_method",
        triggerValue: "ACH",
      },
      {
        name: "Transfer of Assets (TOA) Form",
        reason: "Required to transfer assets from another institution",
        condition: "Funding via transfer from another brokerage",
        triggerField: "funding_method",
        triggerValue: "Transfer",
      },
      {
        name: "Letter of Authorization (LOA)",
        reason: "Authorizes the transfer of assets on client's behalf",
        condition: "Funding via transfer from another brokerage",
        triggerField: "funding_method",
        triggerValue: "Transfer",
      },
    ],
    nigoRisks: [
      {
        risk: "Only one owner signed",
        frequency: "most_common",
        impact: "Application returned, 5-7 business day delay",
        prevention: "DocuSign routing requires both owner signatures before submission",
      },
      {
        risk: "Mismatched addresses between owners",
        frequency: "common",
        impact: "3-5 business day delay for address verification",
        prevention: "Address validation compares both owners during intake",
      },
      {
        risk: "Missing second owner SSN",
        frequency: "common",
        impact: "Application rejected, 5-7 business day delay",
        prevention: "SSN field required for both owners in application flow",
      },
    ],
    estimatedMinutes: 20,
    notes: "Both owners must sign all documents. Both have equal, undivided interest.",
  },

  // 3. Joint TIC
  {
    accountType: "Joint TIC",
    custodianId: "schwab",
    displayName: "Schwab Joint Tenants in Common",
    signerCount: 2,
    requiresBeneficiary: true,
    beneficiaryNote: "Unlike JTWROS, TIC has no right of survivorship — each owner's share passes to their estate or named beneficiaries. Beneficiary designation is required.",
    requiredDocuments: [
      { name: "Joint Account Application", reason: "Required for all joint accounts" },
      { name: "Beneficiary Designation", reason: "Required — no survivorship rights in TIC" },
      { name: "Form CRS", reason: "SEC-required client relationship summary" },
      { name: "Advisory Addendum", reason: "Required for advisory accounts" },
    ],
    conditionalDocuments: [
      {
        name: "MoneyLink Authorization",
        reason: "Required for ACH funding setup",
        condition: "Funding via ACH",
        triggerField: "funding_method",
        triggerValue: "ACH",
      },
      {
        name: "Transfer of Assets (TOA) Form",
        reason: "Required to transfer assets from another institution",
        condition: "Funding via transfer from another brokerage",
        triggerField: "funding_method",
        triggerValue: "Transfer",
      },
      {
        name: "Letter of Authorization (LOA)",
        reason: "Authorizes the transfer of assets on client's behalf",
        condition: "Funding via transfer from another brokerage",
        triggerField: "funding_method",
        triggerValue: "Transfer",
      },
    ],
    nigoRisks: [
      {
        risk: "Missing beneficiary designation",
        frequency: "most_common",
        impact: "5-7 business day delay",
        prevention: "Beneficiary form auto-included for all TIC accounts",
      },
      {
        risk: "Only one owner signed",
        frequency: "most_common",
        impact: "Application returned, 5-7 business day delay",
        prevention: "DocuSign routing requires both owner signatures before submission",
      },
      {
        risk: "Mismatched addresses between owners",
        frequency: "common",
        impact: "3-5 business day delay for address verification",
        prevention: "Address validation compares both owners during intake",
      },
      {
        risk: "Missing second owner SSN",
        frequency: "common",
        impact: "Application rejected, 5-7 business day delay",
        prevention: "SSN field required for both owners in application flow",
      },
      {
        risk: "Percentage ownership doesn't total 100%",
        frequency: "occasional",
        impact: "Application returned, 3-5 business day delay",
        prevention: "Ownership percentage validation enforced before submission",
      },
    ],
    estimatedMinutes: 25,
    notes: "Unlike JTWROS, each owner's share passes to their beneficiaries, not the surviving owner.",
  },

  // 4. Traditional IRA
  {
    accountType: "Traditional IRA",
    custodianId: "schwab",
    displayName: "Schwab Traditional IRA",
    signerCount: 1,
    requiresBeneficiary: true,
    beneficiaryNote: "Schwab requires beneficiary designations on file before funding any IRA. Submitting without one is the most common IRA NIGO rejection, typically adding 5-7 business days.",
    requiredDocuments: [
      { name: "IRA Account Application", reason: "Required for all IRA accounts" },
      { name: "Beneficiary Designation", reason: "Required before IRA funding" },
      { name: "Form CRS", reason: "SEC-required client relationship summary" },
      { name: "Advisory Addendum", reason: "Required for advisory accounts" },
    ],
    conditionalDocuments: [
      {
        name: "Rollover Recommendation",
        reason: "DOL requires documentation that rollover is in client's best interest",
        regulation: "DOL PTE 2020-02",
        condition: "Funding via rollover from employer plan",
        triggerField: "funding_method",
        triggerValue: "Rollover",
      },
      {
        name: "PTE 2020-02 Exemption",
        reason: "Prohibited Transaction Exemption required for rollover recommendations",
        regulation: "DOL PTE 2020-02",
        condition: "Funding via rollover from employer plan",
        triggerField: "funding_method",
        triggerValue: "Rollover",
      },
      {
        name: "Transfer of Assets (TOA) Form",
        reason: "Required to transfer assets from another institution",
        condition: "Funding via transfer from another brokerage",
        triggerField: "funding_method",
        triggerValue: "Transfer",
      },
      {
        name: "MoneyLink Authorization",
        reason: "Required for ACH funding setup",
        condition: "Funding via ACH",
        triggerField: "funding_method",
        triggerValue: "ACH",
      },
    ],
    contributionLimit: { under50: 7000, over50: 8000, year: 2024 },
    nigoRisks: [
      {
        risk: "Missing beneficiary designation",
        frequency: "most_common",
        impact: "5-7 business day delay",
        prevention: "Beneficiary form auto-included for all retirement accounts",
      },
      {
        risk: "Missing tax withholding election",
        frequency: "common",
        impact: "3-5 business day delay",
        prevention: "Tax withholding section required in IRA application flow",
      },
      {
        risk: "Unsigned application",
        frequency: "occasional",
        impact: "Application returned, 5-7 business day delay",
        prevention: "DocuSign enforces signature before submission",
      },
    ],
    estimatedMinutes: 15,
  },

  // 5. Roth IRA
  {
    accountType: "Roth IRA",
    custodianId: "schwab",
    displayName: "Schwab Roth IRA",
    signerCount: 1,
    requiresBeneficiary: true,
    beneficiaryNote: "Schwab requires beneficiary designations on file before funding any IRA. Submitting without one is the most common IRA NIGO rejection, typically adding 5-7 business days.",
    requiredDocuments: [
      { name: "Roth IRA Account Application", reason: "Required for Roth IRA accounts" },
      { name: "Beneficiary Designation", reason: "Required before IRA funding" },
      { name: "Form CRS", reason: "SEC-required client relationship summary" },
      { name: "Advisory Addendum", reason: "Required for advisory accounts" },
    ],
    conditionalDocuments: [
      {
        name: "Rollover Recommendation",
        reason: "DOL requires documentation that rollover is in client's best interest",
        regulation: "DOL PTE 2020-02",
        condition: "Funding via rollover from employer plan",
        triggerField: "funding_method",
        triggerValue: "Rollover",
      },
      {
        name: "PTE 2020-02 Exemption",
        reason: "Prohibited Transaction Exemption required for rollover recommendations",
        regulation: "DOL PTE 2020-02",
        condition: "Funding via rollover from employer plan",
        triggerField: "funding_method",
        triggerValue: "Rollover",
      },
      {
        name: "Transfer of Assets (TOA) Form",
        reason: "Required to transfer assets from another institution",
        condition: "Funding via transfer from another brokerage",
        triggerField: "funding_method",
        triggerValue: "Transfer",
      },
      {
        name: "MoneyLink Authorization",
        reason: "Required for ACH funding setup",
        condition: "Funding via ACH",
        triggerField: "funding_method",
        triggerValue: "ACH",
      },
    ],
    incomeEligibility: {
      maxMAGI_single: 161000,
      maxMAGI_joint: 240000,
      year: 2024,
      phaseOutStart_single: 146000,
      phaseOutStart_joint: 230000,
      alternatives: ["Traditional IRA", "Backdoor Roth conversion"],
      alternativeNote: "Two options: convert this to a Traditional IRA (no income limit), or set up a backdoor Roth conversion (contribute to Traditional, then convert). Which would you prefer?",
    },
    contributionLimit: { under50: 7000, over50: 8000, year: 2024 },
    nigoRisks: [
      {
        risk: "Missing beneficiary designation",
        frequency: "most_common",
        impact: "5-7 business day delay",
        prevention: "Beneficiary form auto-included for all retirement accounts",
      },
      {
        risk: "Missing tax withholding election",
        frequency: "common",
        impact: "3-5 business day delay",
        prevention: "Tax withholding section required in IRA application flow",
      },
      {
        risk: "Income eligibility not verified",
        frequency: "common",
        impact: "Excess contribution penalty (6% per year) if over limit",
        prevention: "Income verification step required before Roth IRA application",
      },
      {
        risk: "Unsigned application",
        frequency: "occasional",
        impact: "Application returned, 5-7 business day delay",
        prevention: "DocuSign enforces signature before submission",
      },
    ],
    estimatedMinutes: 15,
    notes: "No RMDs during owner's lifetime. Tax-free qualified distributions.",
  },

  // 6. Rollover IRA
  {
    accountType: "Rollover IRA",
    custodianId: "schwab",
    displayName: "Schwab Rollover IRA",
    signerCount: 1,
    requiresBeneficiary: true,
    beneficiaryNote: "Schwab requires beneficiary designations on file before funding any IRA. Submitting without one is the most common IRA NIGO rejection, typically adding 5-7 business days.",
    requiredDocuments: [
      { name: "IRA Account Application", reason: "Required for all IRA accounts" },
      { name: "Beneficiary Designation", reason: "Required before IRA funding" },
      { name: "Rollover Recommendation", reason: "DOL requires documentation that rollover is in client's best interest", regulation: "DOL PTE 2020-02" },
      { name: "PTE 2020-02 Exemption", reason: "Prohibited Transaction Exemption required for rollover recommendations", regulation: "DOL PTE 2020-02" },
      { name: "Form CRS", reason: "SEC-required client relationship summary" },
      { name: "Advisory Addendum", reason: "Required for advisory accounts" },
    ],
    conditionalDocuments: [
      {
        name: "Transfer of Assets (TOA) Form",
        reason: "Required to transfer assets from employer plan or another brokerage",
        condition: "Rollover from employer plan or another brokerage",
        triggerField: "funding_method",
        triggerValue: "Transfer",
      },
    ],
    contributionLimit: { under50: 7000, over50: 8000, year: 2024 },
    nigoRisks: [
      {
        risk: "Missing rollover recommendation",
        frequency: "most_common",
        impact: "7-10 business day delay — DOL requires it",
        prevention: "Rollover Recommendation auto-included for all Rollover IRA accounts",
      },
      {
        risk: "Missing beneficiary designation",
        frequency: "common",
        impact: "5-7 business day delay",
        prevention: "Beneficiary form auto-included for all retirement accounts",
      },
      {
        risk: "60-day rollover window expired",
        frequency: "occasional",
        impact: "Requires IRS waiver — significant delay",
        prevention: "Rollover timeline validation during intake warns if approaching 60-day limit",
      },
    ],
    estimatedMinutes: 20,
    notes: "DOL PTE 2020-02 requires a written rollover recommendation documenting why the rollover is in the client's best interest.",
  },

  // 7. SEP IRA
  {
    accountType: "SEP IRA",
    custodianId: "schwab",
    displayName: "Schwab SEP IRA",
    signerCount: 1,
    requiresBeneficiary: true,
    beneficiaryNote: "Schwab requires beneficiary designations on file before funding any IRA. Submitting without one is the most common IRA NIGO rejection, typically adding 5-7 business days.",
    requiredDocuments: [
      { name: "SEP IRA Account Application", reason: "Required for SEP IRA accounts" },
      { name: "SEP Plan Agreement (IRS Form 5305-SEP)", reason: "IRS-required plan document for SEP IRAs" },
      { name: "Beneficiary Designation", reason: "Required before IRA funding" },
      { name: "Form CRS", reason: "SEC-required client relationship summary" },
      { name: "Advisory Addendum", reason: "Required for advisory accounts" },
    ],
    conditionalDocuments: [],
    contributionLimit: { under50: 69000, over50: 69000, year: 2024 },
    nigoRisks: [
      {
        risk: "Missing SEP plan agreement",
        frequency: "most_common",
        impact: "7-10 business day delay",
        prevention: "SEP Plan Agreement (5305-SEP) auto-included in document packet",
      },
      {
        risk: "Missing beneficiary designation",
        frequency: "common",
        impact: "5-7 business day delay",
        prevention: "Beneficiary form auto-included for all retirement accounts",
      },
      {
        risk: "Contribution exceeds 25% of compensation",
        frequency: "occasional",
        impact: "Excess contribution penalty",
        prevention: "Compensation-based contribution calculator shown during funding step",
      },
    ],
    estimatedMinutes: 20,
    notes: "Employer contributions only. Employee salary deferrals not permitted under SEP.",
  },

  // 8. Trust Account
  {
    accountType: "Trust",
    custodianId: "schwab",
    displayName: "Schwab Trust Account",
    signerCount: 1,
    requiresBeneficiary: false,
    requiredDocuments: [
      { name: "Trust Account Application", reason: "Required for trust accounts" },
      { name: "Trust Certification/Abstract", reason: "Verifies trust existence, trustees, and key provisions" },
      { name: "Form CRS", reason: "SEC-required client relationship summary" },
      { name: "Advisory Addendum", reason: "Required for advisory accounts" },
    ],
    conditionalDocuments: [
      {
        name: "Full Trust Document",
        reason: "Required when trust certification is insufficient or incomplete",
        condition: "Trust certification does not contain sufficient detail",
        triggerField: "trust_certification_sufficient",
        triggerValue: "No",
      },
    ],
    nigoRisks: [
      {
        risk: "Trust certification expired or incomplete",
        frequency: "most_common",
        impact: "7-14 business day delay",
        prevention: "Trust certification date and completeness validated during intake",
      },
      {
        risk: "Trustee not authorized in trust document",
        frequency: "common",
        impact: "Account opening blocked until resolved",
        prevention: "Trustee name cross-referenced against trust certification during intake",
      },
      {
        risk: "Missing EIN for irrevocable trusts",
        frequency: "common",
        impact: "5-7 business day delay",
        prevention: "EIN field required when trust type is irrevocable",
      },
    ],
    estimatedMinutes: 25,
    notes: "Signer must be named as trustee in the trust document. Revocable trusts use grantor's SSN; irrevocable trusts require a separate EIN.",
  },
];

// ─── Rules Registry ──────────────────────────────────────────────────────────
// Keyed by custodianId for easy extension to Fidelity/Pershing later.

const RULES_REGISTRY: Record<string, AccountTypeRules[]> = {
  schwab: SCHWAB_RULES,
};

// ─── Exported Functions ──────────────────────────────────────────────────────

/** Get rules for a specific account type at a specific custodian */
export function getRulesForAccountType(
  custodianId: CustodianId,
  accountType: string,
): AccountTypeRules | null {
  const rules = RULES_REGISTRY[custodianId];
  if (!rules) return null;
  return rules.find((r) => r.accountType === accountType) ?? null;
}

/** Get all account types for a custodian */
export function getAccountTypesList(custodianId: CustodianId): AccountTypeRules[] {
  return RULES_REGISTRY[custodianId] ?? [];
}

/** Get all account type names (for dropdown population) */
export function getAllAccountTypeNames(custodianId: CustodianId): string[] {
  return (RULES_REGISTRY[custodianId] ?? []).map((r) => r.accountType);
}

/** Resolve which documents are needed given an account type and funding context */
export function getRequiredDocuments(
  custodianId: CustodianId,
  accountType: string,
  context: { fundingMethod?: string; [key: string]: string | undefined },
): DocumentRule[] {
  const rules = getRulesForAccountType(custodianId, accountType);
  if (!rules) return [];

  const docs: DocumentRule[] = [...rules.requiredDocuments];

  for (const cond of rules.conditionalDocuments) {
    const fieldValue = context[cond.triggerField];
    if (fieldValue === cond.triggerValue) {
      docs.push({
        name: cond.name,
        reason: cond.reason,
        regulation: cond.regulation,
      });
    }
  }

  return docs;
}

/** Check income eligibility for account types that have limits (Roth) */
export function checkIncomeEligibility(
  custodianId: CustodianId,
  accountType: string,
  householdIncome: number,
  filingStatus: "single" | "joint",
): { eligible: boolean; overLimit: boolean; inPhaseOut: boolean; alternatives: string[]; note: string } | null {
  const rules = getRulesForAccountType(custodianId, accountType);
  if (!rules?.incomeEligibility) return null;

  const ie = rules.incomeEligibility;
  const maxMAGI = filingStatus === "single" ? ie.maxMAGI_single : ie.maxMAGI_joint;
  const phaseOutStart = filingStatus === "single" ? ie.phaseOutStart_single : ie.phaseOutStart_joint;

  const overLimit = householdIncome > maxMAGI;
  const inPhaseOut = !overLimit && householdIncome >= phaseOutStart;
  const eligible = !overLimit;

  return {
    eligible,
    overLimit,
    inPhaseOut,
    alternatives: ie.alternatives,
    note: ie.alternativeNote,
  };
}

/** Get NIGO risks for an account type, sorted by frequency */
export function getNIGORisks(custodianId: CustodianId, accountType: string): NIGORisk[] {
  const rules = getRulesForAccountType(custodianId, accountType);
  if (!rules) return [];
  return [...rules.nigoRisks].sort(
    (a, b) => FREQUENCY_ORDER[a.frequency] - FREQUENCY_ORDER[b.frequency],
  );
}

/**
 * Get NIGO risks that were prevented for a completed account opening.
 * Given what data was collected, which risks are no longer applicable.
 */
export function getPreventedNIGORisks(
  custodianId: CustodianId,
  accountType: string,
  completedFields: {
    hasBeneficiary: boolean;
    signerCount: number;
    incomeVerified: boolean;
    hasRolloverRec: boolean;
  },
): NIGORisk[] {
  const rules = getRulesForAccountType(custodianId, accountType);
  if (!rules) return [];

  const prevented: NIGORisk[] = [];

  for (const risk of rules.nigoRisks) {
    const riskLower = risk.risk.toLowerCase();

    if (riskLower.includes("beneficiary") && completedFields.hasBeneficiary) {
      prevented.push(risk);
    } else if (riskLower.includes("one owner signed") && completedFields.signerCount >= 2) {
      prevented.push(risk);
    } else if (riskLower.includes("income eligibility") && completedFields.incomeVerified) {
      prevented.push(risk);
    } else if (riskLower.includes("rollover recommendation") && completedFields.hasRolloverRec) {
      prevented.push(risk);
    }
  }

  return prevented;
}
