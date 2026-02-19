// ─── Regulatory Update Data ─────────────────────────────────────────────────
// Feed of recent regulatory changes relevant to RIAs.
// Extracted from RegulatoryFeed component for reuse and testability.

export interface RegulatoryUpdate {
  id: string;
  date: string;
  agency: "SEC" | "FINRA" | "DOL";
  title: string;
  summary: string;
  impact: "high" | "medium" | "low";
  actionRequired: string;
  sourceUrl?: string;
  checkSuggestion?: { label: string; keyword: string };
}

export const UPDATES: RegulatoryUpdate[] = [
  {
    id: "reg-1",
    date: "2026-02-10",
    agency: "SEC",
    title: "Updated Marketing Rule Guidance",
    summary: "SEC staff issued new FAQ guidance on testimonial and endorsement arrangements under Rule 206(4)-1. Clarifies documentation requirements for social media testimonials and third-party ratings.",
    impact: "high",
    actionRequired: "Review all marketing materials and social media policies. Document any testimonial or endorsement arrangements. Update compliance manual section on advertising.",
    sourceUrl: "https://www.sec.gov/investment/marketing-rule-faq",
    checkSuggestion: { label: "Marketing Rule Compliance", keyword: "marketing rule" },
  },
  {
    id: "reg-2",
    date: "2026-01-28",
    agency: "SEC",
    title: "Cybersecurity Risk Management Rule Effective",
    summary: "New Rule 10 under the Exchange Act requires written cybersecurity incident response policies and annual risk assessments. Applies to all registered investment advisers.",
    impact: "high",
    actionRequired: "Conduct annual cybersecurity risk assessment. Document incident response procedures. Train all staff on cyber hygiene protocols.",
    sourceUrl: "https://www.sec.gov/rules/final/2023/33-11216.pdf",
    checkSuggestion: { label: "Cybersecurity Risk Assessment", keyword: "cybersecurity" },
  },
  {
    id: "reg-3",
    date: "2026-01-15",
    agency: "FINRA",
    title: "Consolidated Audit Trail (CAT) Reporting Update",
    summary: "FINRA extended the Phase 2d implementation timeline for small introducing brokers. New deadline for full CAT compliance is Q3 2026.",
    impact: "low",
    actionRequired: "Review CAT reporting obligations. Confirm your clearing firm handles CAT submissions. No immediate action for most RIAs.",
    sourceUrl: "https://www.catnmsplan.com/specifications/technical",
  },
  {
    id: "reg-4",
    date: "2025-12-20",
    agency: "DOL",
    title: "Retirement Security Rule (Fiduciary Rule 2.0)",
    summary: "DOL published final rule expanding the definition of fiduciary advice for retirement accounts. Affects rollover recommendations and annuity sales.",
    impact: "high",
    actionRequired: "Review all rollover recommendation procedures. Update IRA rollover documentation to include comparative analysis. Train advisors on new fiduciary obligations for retirement assets.",
    sourceUrl: "https://www.dol.gov/agencies/ebsa/laws-and-regulations/rules-and-regulations/completed-rulemaking/1210-AC02",
    checkSuggestion: { label: "Rollover Fiduciary Compliance", keyword: "rollover" },
  },
  {
    id: "reg-5",
    date: "2025-12-05",
    agency: "SEC",
    title: "Form ADV Annual Amendment Reminder",
    summary: "Firms with December fiscal year-end must file their annual ADV amendment by March 31, 2026. Updated instructions include new Item 5 fee reporting requirements.",
    impact: "medium",
    actionRequired: "Begin compiling ADV amendment data. Review Item 5 fee disclosures for accuracy. Schedule ADV delivery to existing clients within 120 days.",
    sourceUrl: "https://www.sec.gov/about/forms/formadv-instructions.pdf",
  },
];

export const IMPACT_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-600",
  medium: "bg-amber-100 text-amber-600",
  low: "bg-slate-100 text-slate-500",
};

export const AGENCY_COLORS: Record<string, string> = {
  SEC: "bg-blue-100 text-blue-600",
  FINRA: "bg-purple-100 text-purple-600",
  DOL: "bg-teal-100 text-teal-600",
};

export const DISMISSED_KEY = "min-reg-dismissed";
