// ─── Compliance Template Data ───────────────────────────────────────────────
// Pre-built compliance frameworks that firms can adopt.
// Extracted from ComplianceTemplates component for reuse and testability.

export interface TemplateCheck {
  id: string;
  label: string;
  keyword: string;
  regulation: string;
  whyItMatters: string;
  failStatus: "fail" | "warn";
}

export interface ComplianceTemplate {
  id: string;
  name: string;
  author: string;
  description: string;
  checks: TemplateCheck[];
  category: "examiner" | "essentials" | "regulatory" | "annual";
  firms: number; // how many firms use this
}

export const TEMPLATES: ComplianceTemplate[] = [
  {
    id: "examiner-ready",
    name: "Examiner-Ready Framework",
    author: "Maggie Chen-Ramirez, CFP, Former FINRA Examiner",
    description: "20 checks covering the most common FINRA/SEC exam deficiencies. Built from 8 years of examination experience.",
    category: "examiner",
    firms: 47,
    checks: [
      { id: "er-fee-billing", label: "Fee Billing Reconciliation", keyword: "fee billing", regulation: "IAA Sec. 206", whyItMatters: "Examiners check fee calculations against client agreements. Unreconciled billing is a top-5 deficiency.", failStatus: "fail" },
      { id: "er-privacy-notice", label: "Annual Privacy Notice Delivery", keyword: "privacy notice", regulation: "Reg S-P", whyItMatters: "Firms must deliver privacy notices annually. Missing delivery is an easy finding for examiners.", failStatus: "fail" },
      { id: "er-oba", label: "Outside Business Activity Review", keyword: "outside business", regulation: "FINRA Rule 3270", whyItMatters: "Undisclosed OBAs are a common exam finding. Quarterly review demonstrates supervisory diligence.", failStatus: "warn" },
      { id: "er-gift-review", label: "Gifts & Entertainment Review", keyword: "gift", regulation: "FINRA Rule 3220", whyItMatters: "Gift limits ($100 for FINRA) require documentation. Examiner will review gift log.", failStatus: "warn" },
      { id: "er-political", label: "Political Contribution Check", keyword: "political contribution", regulation: "SEC Rule 206(4)-5", whyItMatters: "Pay-to-play rules require monitoring. One violation can trigger a 2-year revenue ban.", failStatus: "fail" },
      { id: "er-complaint", label: "Client Complaint Log Review", keyword: "complaint", regulation: "FINRA Rule 4530", whyItMatters: "All complaints must be documented and reviewed. Examiners always ask for the complaint log.", failStatus: "fail" },
      { id: "er-cybersecurity", label: "Cybersecurity Assessment", keyword: "cybersecurity", regulation: "SEC Reg S-ID/S-P", whyItMatters: "Annual cybersecurity risk assessment is expected. SEC considers this a priority exam focus.", failStatus: "warn" },
      { id: "er-bcp", label: "Business Continuity Plan Review", keyword: "business continuity", regulation: "FINRA Rule 4370", whyItMatters: "Annual BCP review and update required. Must include pandemic scenarios post-2020.", failStatus: "warn" },
    ],
  },
  {
    id: "small-ria",
    name: "Small RIA Essentials",
    author: "Min Best Practices Team",
    description: "8 essential checks for firms under 100 households. Covers the basics without overwhelming a small team.",
    category: "essentials",
    firms: 124,
    checks: [
      { id: "sr-kyc", label: "KYC Profile Current", keyword: "kyc", regulation: "FINRA Rule 2090", whyItMatters: "Know Your Customer is foundational. Updated profiles prevent suitability issues.", failStatus: "fail" },
      { id: "sr-suitability", label: "Suitability Review", keyword: "suitability", regulation: "Reg BI", whyItMatters: "Best interest standard requires documented suitability analysis.", failStatus: "fail" },
      { id: "sr-formcrs", label: "Form CRS Delivery", keyword: "form crs", regulation: "Form CRS Rule", whyItMatters: "Must be delivered to new clients and updated annually.", failStatus: "fail" },
      { id: "sr-adv", label: "ADV Part 2A Current", keyword: "adv", regulation: "SEC Rule 204-3", whyItMatters: "Annual amendment and delivery required within 120 days of fiscal year end.", failStatus: "warn" },
      { id: "sr-beneficiary", label: "Beneficiary Designations", keyword: "beneficiary", regulation: "Firm Best Practice", whyItMatters: "Missing beneficiaries create estate complications and client complaints.", failStatus: "warn" },
    ],
  },
  {
    id: "reg-bi",
    name: "Reg BI Complete",
    author: "Min Regulatory Team",
    description: "Comprehensive Regulation Best Interest compliance framework. All four obligations covered.",
    category: "regulatory",
    firms: 89,
    checks: [
      { id: "rb-disclosure", label: "Disclosure Obligation", keyword: "disclosure", regulation: "Reg BI - Disclosure", whyItMatters: "Full and fair disclosure of material facts about the relationship.", failStatus: "fail" },
      { id: "rb-care", label: "Care Obligation", keyword: "care obligation", regulation: "Reg BI - Care", whyItMatters: "Reasonable diligence, care, and skill in making recommendations.", failStatus: "fail" },
      { id: "rb-conflict", label: "Conflict of Interest", keyword: "conflict", regulation: "Reg BI - Conflict", whyItMatters: "Identify, disclose, and mitigate or eliminate conflicts of interest.", failStatus: "fail" },
      { id: "rb-compliance", label: "Compliance Obligation", keyword: "compliance program", regulation: "Reg BI - Compliance", whyItMatters: "Written policies and procedures to achieve compliance with Reg BI.", failStatus: "fail" },
    ],
  },
  {
    id: "annual-review",
    name: "Annual Review Checklist",
    author: "Min Best Practices Team",
    description: "Year-end compliance review covering all annual filing and delivery requirements.",
    category: "annual",
    firms: 156,
    checks: [
      { id: "ar-adv-amend", label: "ADV Annual Amendment Filed", keyword: "adv amendment", regulation: "SEC Rule 204-1", whyItMatters: "Must be filed within 90 days of fiscal year end.", failStatus: "fail" },
      { id: "ar-adv-delivery", label: "ADV Summary of Changes Delivered", keyword: "adv delivery", regulation: "SEC Rule 204-3", whyItMatters: "Updated brochure or summary must go to all existing clients.", failStatus: "fail" },
      { id: "ar-privacy", label: "Annual Privacy Notice", keyword: "privacy notice", regulation: "Reg S-P", whyItMatters: "Required annual delivery to all clients.", failStatus: "fail" },
      { id: "ar-compliance-review", label: "Annual Compliance Program Review", keyword: "annual review", regulation: "SEC Rule 206(4)-7", whyItMatters: "CCO must review adequacy of compliance policies at least annually.", failStatus: "fail" },
      { id: "ar-code-ethics", label: "Code of Ethics Acknowledgment", keyword: "code of ethics", regulation: "SEC Rule 204A-1", whyItMatters: "All supervised persons must acknowledge the code annually.", failStatus: "warn" },
      { id: "ar-custody", label: "Custody Rule Compliance", keyword: "custody", regulation: "SEC Rule 206(4)-2", whyItMatters: "Annual surprise exam or audited financial statements if custody applies.", failStatus: "fail" },
    ],
  },
];

export const CATEGORY_COLORS: Record<string, string> = {
  examiner: "bg-purple-100 text-purple-600",
  essentials: "bg-blue-100 text-blue-600",
  regulatory: "bg-red-100 text-red-600",
  annual: "bg-amber-100 text-amber-600",
};
