// ─── Demo Data Foundation ──────────────────────────────────────────────────
// Pure data file — no React, no side effects.
// Generates realistic practice data for the COO demo without Salesforce.

import type { SFTask, SFHousehold } from "./home-stats";

// ─── Helpers ──────────────────────────────────────────────────────────────

const DAY = 86400000;
const now = () => Date.now();
const daysAgo = (d: number) => new Date(now() - d * DAY).toISOString();
const daysFromNow = (d: number) => new Date(now() + d * DAY).toISOString();
let _id = 1000;
const uid = () => `demo-${_id++}`;

// ─── Household Health Definitions ──────────────────────────────────────────

export interface DemoHouseholdHealth {
  id: string;
  name: string;
  aum: number;
  healthScore: number;
  advisor: string;
  status: "on-track" | "needs-attention" | "at-risk";
  breakdown: { label: string; score: number; weight: number; detail: string }[];
  suggestedActions: { id: string; label: string; detail: string; category: string }[];
  contacts: { id: string; firstName: string; lastName: string; email: string; phone: string }[];
}

function computeHealth(breakdown: { score: number; weight: number }[]): number {
  return Math.round(breakdown.reduce((s, b) => s + b.score * b.weight / 100, 0));
}

function computeStatus(score: number): "on-track" | "needs-attention" | "at-risk" {
  if (score >= 80) return "on-track";
  if (score >= 60) return "needs-attention";
  return "at-risk";
}

const _DEMO_HOUSEHOLDS_RAW: Omit<DemoHouseholdHealth, "healthScore" | "status">[] = [
  {
    id: "hh-rivera", name: "Rivera Household", aum: 3_200_000,
    advisor: "Jon Cambras",
    breakdown: [
      { label: "Compliance Coverage", score: 100, weight: 30, detail: "Annual review completed 45 days ago" },
      { label: "DocuSign Velocity", score: 95, weight: 25, detail: "All envelopes signed within 3 days" },
      { label: "Tasks On Time", score: 88, weight: 25, detail: "1 task completed 2 days late" },
      { label: "Meeting Coverage (90d)", score: 85, weight: 20, detail: "Last meeting 32 days ago" },
    ],
    suggestedActions: [
      { id: "act-r1", label: "Schedule Q2 check-in", detail: "Last meeting was 32 days ago — schedule before 60-day mark", category: "meeting" },
    ],
    contacts: [
      { id: "c-rivera-1", firstName: "Carlos", lastName: "Rivera", email: "carlos.rivera@email.com", phone: "(555) 234-5678" },
      { id: "c-rivera-2", firstName: "Maria", lastName: "Rivera", email: "maria.rivera@email.com", phone: "(555) 234-5679" },
    ],
  },
  {
    id: "hh-patel", name: "Patel Household", aum: 5_100_000,
    advisor: "Marcus Rivera",
    breakdown: [
      { label: "Compliance Coverage", score: 100, weight: 30, detail: "Annual review completed 60 days ago" },
      { label: "DocuSign Velocity", score: 72, weight: 25, detail: "1 envelope unsigned for 6 days" },
      { label: "Tasks On Time", score: 90, weight: 25, detail: "All tasks on schedule" },
      { label: "Meeting Coverage (90d)", score: 80, weight: 20, detail: "Last meeting 52 days ago" },
    ],
    suggestedActions: [
      { id: "act-p1", label: "Follow up on DocuSign", detail: "IRA beneficiary form unsigned for 6 days — send reminder", category: "docusign" },
      { id: "act-p2", label: "Schedule portfolio review", detail: "High-AUM client — last meeting was 52 days ago", category: "meeting" },
    ],
    contacts: [
      { id: "c-patel-1", firstName: "Raj", lastName: "Patel", email: "raj.patel@email.com", phone: "(555) 345-6789" },
      { id: "c-patel-2", firstName: "Priya", lastName: "Patel", email: "priya.patel@email.com", phone: "(555) 345-6790" },
    ],
  },
  {
    id: "hh-chen", name: "Chen/Richards Household", aum: 6_300_000,
    advisor: "Jon Cambras",
    breakdown: [
      { label: "Compliance Coverage", score: 60, weight: 30, detail: "Compliance review 11 months old — renewal due" },
      { label: "DocuSign Velocity", score: 80, weight: 25, detail: "PTE form sent 4 days ago, awaiting signature" },
      { label: "Tasks On Time", score: 70, weight: 25, detail: "RMD deadline in 22 days — task created but not started" },
      { label: "Meeting Coverage (90d)", score: 75, weight: 20, detail: "Last meeting 68 days ago" },
    ],
    suggestedActions: [
      { id: "act-c1", label: "Process RMD before deadline", detail: "Required minimum distribution due in 22 days — $47,200 from Traditional IRA", category: "task" },
      { id: "act-c2", label: "Complete PTE documentation", detail: "PTE 2020-02 form sent for signature — follow up if not signed by Friday", category: "docusign" },
      { id: "act-c3", label: "Schedule annual review meeting", detail: "Last meeting was 68 days ago — approaching 90-day window", category: "meeting" },
    ],
    contacts: [
      { id: "c-chen-1", firstName: "Wei", lastName: "Chen", email: "wei.chen@email.com", phone: "(555) 456-7890" },
      { id: "c-chen-2", firstName: "Sarah", lastName: "Richards", email: "sarah.richards@email.com", phone: "(555) 456-7891" },
    ],
  },
  {
    id: "hh-nakamura", name: "Nakamura Household", aum: 1_800_000,
    advisor: "Amy Sato",
    breakdown: [
      { label: "Compliance Coverage", score: 0, weight: 30, detail: "No compliance review on file" },
      { label: "DocuSign Velocity", score: 100, weight: 25, detail: "All documents signed" },
      { label: "Tasks On Time", score: 85, weight: 25, detail: "1 follow-up task pending" },
      { label: "Meeting Coverage (90d)", score: 100, weight: 20, detail: "Meeting logged 14 days ago" },
    ],
    suggestedActions: [
      { id: "act-n1", label: "Run first compliance review", detail: "Client onboarded 35 days ago — no KYC/suitability review on file", category: "compliance" },
    ],
    contacts: [
      { id: "c-nakamura-1", firstName: "Kenji", lastName: "Nakamura", email: "kenji.nakamura@email.com", phone: "(555) 567-8901" },
    ],
  },
  {
    id: "hh-obrien", name: "O'Brien Household", aum: 2_400_000,
    advisor: "Diane Rivera",
    breakdown: [
      { label: "Compliance Coverage", score: 100, weight: 30, detail: "Review completed 90 days ago" },
      { label: "DocuSign Velocity", score: 30, weight: 25, detail: "DocuSign stuck for 12 days — no response" },
      { label: "Tasks On Time", score: 55, weight: 25, detail: "2 overdue tasks (8 and 5 days past due)" },
      { label: "Meeting Coverage (90d)", score: 80, weight: 20, detail: "Last meeting 55 days ago" },
    ],
    suggestedActions: [
      { id: "act-o1", label: "Escalate unsigned DocuSign", detail: "Advisory agreement unsigned 12 days — call client directly", category: "docusign" },
      { id: "act-o2", label: "Complete overdue tasks", detail: "2 tasks past due — TOA follow-up and beneficiary update", category: "task" },
    ],
    contacts: [
      { id: "c-obrien-1", firstName: "Patrick", lastName: "O'Brien", email: "patrick.obrien@email.com", phone: "(555) 678-9012" },
      { id: "c-obrien-2", firstName: "Siobhan", lastName: "O'Brien", email: "siobhan.obrien@email.com", phone: "(555) 678-9013" },
    ],
  },
  {
    id: "hh-jackson", name: "Jackson Household", aum: 2_800_000,
    advisor: "Michelle Osei",
    breakdown: [
      { label: "Compliance Coverage", score: 100, weight: 30, detail: "Review completed 120 days ago" },
      { label: "DocuSign Velocity", score: 50, weight: 25, detail: "1 envelope unsigned for 9 days" },
      { label: "Tasks On Time", score: 40, weight: 25, detail: "Meeting overdue by 15 days" },
      { label: "Meeting Coverage (90d)", score: 30, weight: 20, detail: "No meeting in 95 days" },
    ],
    suggestedActions: [
      { id: "act-j1", label: "Schedule overdue meeting", detail: "No advisor meeting in 95 days — well past 90-day best practice", category: "meeting" },
      { id: "act-j2", label: "Follow up on unsigned Roth conversion", detail: "Roth conversion docs unsigned 9 days — tax year deadline approaching", category: "docusign" },
    ],
    contacts: [
      { id: "c-jackson-1", firstName: "Darnell", lastName: "Jackson", email: "darnell.jackson@email.com", phone: "(555) 789-0123" },
      { id: "c-jackson-2", firstName: "Tamika", lastName: "Jackson", email: "tamika.jackson@email.com", phone: "(555) 789-0124" },
    ],
  },
  {
    id: "hh-thompson", name: "Thompson Household", aum: 4_700_000,
    advisor: "James Wilder",
    breakdown: [
      { label: "Compliance Coverage", score: 0, weight: 30, detail: "No compliance review — client for 180+ days" },
      { label: "DocuSign Velocity", score: 60, weight: 25, detail: "1 unsigned envelope (7 days)" },
      { label: "Tasks On Time", score: 35, weight: 25, detail: "3 overdue tasks — oldest is 21 days past due" },
      { label: "Meeting Coverage (90d)", score: 0, weight: 20, detail: "No advisor activity in 47 days" },
    ],
    suggestedActions: [
      { id: "act-t1", label: "Run compliance review immediately", detail: "High-AUM client ($4.7M) with zero compliance documentation — regulatory risk", category: "compliance" },
      { id: "act-t2", label: "Schedule urgent client meeting", detail: "No advisor activity in 47 days — stale account flag triggered", category: "meeting" },
      { id: "act-t3", label: "Resolve 3 overdue tasks", detail: "Beneficiary update, TOA follow-up, and account funding — all past due", category: "task" },
    ],
    contacts: [
      { id: "c-thompson-1", firstName: "Robert", lastName: "Thompson", email: "robert.thompson@email.com", phone: "(555) 890-1234" },
      { id: "c-thompson-2", firstName: "Linda", lastName: "Thompson", email: "linda.thompson@email.com", phone: "(555) 890-1235" },
    ],
  },
  {
    id: "hh-whitfield", name: "Whitfield Household", aum: 1_200_000,
    advisor: "Kevin Trịnh",
    breakdown: [
      { label: "Compliance Coverage", score: 0, weight: 30, detail: "No compliance review — new client, nothing done" },
      { label: "DocuSign Velocity", score: 0, weight: 25, detail: "Account opening docs never sent" },
      { label: "Tasks On Time", score: 30, weight: 25, detail: "4 tasks created, none started" },
      { label: "Meeting Coverage (90d)", score: 50, weight: 20, detail: "Initial meeting logged — no follow-up" },
    ],
    suggestedActions: [
      { id: "act-w1", label: "Send account opening paperwork", detail: "New client onboarded 18 days ago — no account opened yet", category: "docusign" },
      { id: "act-w2", label: "Run compliance review", detail: "KYC and suitability review needed before first trade", category: "compliance" },
      { id: "act-w3", label: "Start all pending tasks", detail: "4 onboarding tasks untouched — client may be losing confidence", category: "task" },
    ],
    contacts: [
      { id: "c-whitfield-1", firstName: "Angela", lastName: "Whitfield", email: "angela.whitfield@email.com", phone: "(555) 901-2345" },
    ],
  },
];

// Derive healthScore and status from breakdown weights — single source of truth
export const DEMO_HOUSEHOLDS: DemoHouseholdHealth[] = _DEMO_HOUSEHOLDS_RAW.map(hh => {
  const healthScore = computeHealth(hh.breakdown);
  return { ...hh, healthScore, status: computeStatus(healthScore) };
});

// ─── SFTask / SFHousehold Generators ──────────────────────────────────────

function makeSFHouseholds(): SFHousehold[] {
  return DEMO_HOUSEHOLDS.map(hh => ({
    id: hh.id,
    name: hh.name,
    createdAt: hh.healthScore >= 80 ? daysAgo(120) : hh.healthScore >= 60 ? daysAgo(90) : hh.id === "hh-whitfield" ? daysAgo(18) : daysAgo(180),
    description: `Assigned Advisor: ${hh.advisor}\nAccounts planned: ${hh.aum > 3_000_000 ? "Individual, Roth IRA, Trust" : "Individual, Roth IRA"}${hh.id === "hh-chen" ? "\nAccount Type: Trust — Chen Family Irrevocable Trust" : hh.id === "hh-patel" ? "\nAccount Type: Entity — Patel Family Foundation (Endowment)" : ""}\nRevenue Config: avgAum=${hh.aum} bps=85`,
    advisorName: hh.advisor,
  }));
}

function makeSFTasks(): SFTask[] {
  const tasks: SFTask[] = [];

  const t = (subject: string, hhId: string, hhName: string, status: string, priority: string, createdDaysAgo: number, dueDaysAgo?: number) => {
    tasks.push({
      id: uid(), subject, status, priority,
      householdId: hhId, householdName: hhName,
      createdAt: daysAgo(createdDaysAgo),
      dueDate: dueDaysAgo !== undefined ? (dueDaysAgo > 0 ? daysAgo(dueDaysAgo) : daysFromNow(-dueDaysAgo)) : "",
    });
  };

  // ── Rivera (92) — model client ──
  t("COMPLIANCE REVIEW PASSED — Rivera Household", "hh-rivera", "Rivera Household", "Completed", "Normal", 45);
  t("MEETING NOTE: Annual Review — Rivera", "hh-rivera", "Rivera Household", "Completed", "Normal", 32);
  t("SEND DOCU — Rivera Individual Advisory Agreement", "hh-rivera", "Rivera Household", "Completed", "Normal", 90);
  t("SEND DOCU — Rivera Roth IRA Application", "hh-rivera", "Rivera Household", "Completed", "Normal", 88);
  t("FOLLOW-UP: Confirm beneficiary update", "hh-rivera", "Rivera Household", "Completed", "Normal", 20);
  t("Account opening — Rivera Individual", "hh-rivera", "Rivera Household", "Completed", "Normal", 85);

  // ── Patel (87) — high AUM, minor DocuSign delay ──
  t("COMPLIANCE REVIEW PASSED — Patel Household", "hh-patel", "Patel Household", "Completed", "Normal", 60);
  t("MEETING NOTE: Portfolio Review — Patel", "hh-patel", "Patel Household", "Completed", "Normal", 52);
  t("SEND DOCU — Patel IRA Beneficiary Form", "hh-patel", "Patel Household", "Not Started", "Normal", 6);
  t("SEND DOCU — Patel Trust Amendment", "hh-patel", "Patel Household", "Completed", "Normal", 30);
  t("Account opening — Patel Trust", "hh-patel", "Patel Household", "Completed", "Normal", 100);
  t("FOLLOW-UP: Tax document delivery", "hh-patel", "Patel Household", "Completed", "Normal", 15);

  // ── Chen/Richards (71) — RMD deadline, needs PTE ──
  t("COMPLIANCE REVIEW PASSED — Chen/Richards Household", "hh-chen", "Chen/Richards Household", "Completed", "Normal", 330);
  t("MEETING NOTE: Estate Planning — Chen/Richards", "hh-chen", "Chen/Richards Household", "Completed", "Normal", 68);
  t("SEND DOCU — Chen PTE 2020-02 Form", "hh-chen", "Chen/Richards Household", "Not Started", "High", 4);
  t("Process RMD — Chen Traditional IRA", "hh-chen", "Chen/Richards Household", "Not Started", "High", 10, -22);
  t("Account opening — Chen Rollover IRA", "hh-chen", "Chen/Richards Household", "Completed", "Normal", 200);
  t("FOLLOW-UP: Confirm rollover receipt", "hh-chen", "Chen/Richards Household", "Completed", "Normal", 180);

  // ── Nakamura (73) — missing compliance review ──
  t("MEETING NOTE: Onboarding Call — Nakamura", "hh-nakamura", "Nakamura Household", "Completed", "Normal", 14);
  t("SEND DOCU — Nakamura Individual Application", "hh-nakamura", "Nakamura Household", "Completed", "Normal", 30);
  t("SEND DOCU — Nakamura Roth IRA Application", "hh-nakamura", "Nakamura Household", "Completed", "Normal", 28);
  t("Account opening — Nakamura Individual", "hh-nakamura", "Nakamura Household", "Completed", "Normal", 25);
  t("FOLLOW-UP: Complete risk tolerance questionnaire", "hh-nakamura", "Nakamura Household", "Not Started", "Normal", 10, 3);

  // ── O'Brien (68) — 2 overdue tasks, DocuSign stuck 12d ──
  t("COMPLIANCE REVIEW PASSED — O'Brien Household", "hh-obrien", "O'Brien Household", "Completed", "Normal", 90);
  t("MEETING NOTE: Quarterly Review — O'Brien", "hh-obrien", "O'Brien Household", "Completed", "Normal", 55);
  t("SEND DOCU — O'Brien Advisory Agreement Renewal", "hh-obrien", "O'Brien Household", "Not Started", "High", 12);
  t("FOLLOW-UP: TOA status check — O'Brien", "hh-obrien", "O'Brien Household", "Not Started", "Normal", 15, 8);
  t("FOLLOW-UP: Beneficiary update — O'Brien", "hh-obrien", "O'Brien Household", "Not Started", "Normal", 12, 5);
  t("Account opening — O'Brien JTWROS", "hh-obrien", "O'Brien Household", "Completed", "Normal", 100);

  // ── Jackson (62) — amber: meeting overdue, 1 unsigned ──
  t("COMPLIANCE REVIEW PASSED — Jackson Household", "hh-jackson", "Jackson Household", "Completed", "Normal", 120);
  t("MEETING NOTE: Tax Planning — Jackson", "hh-jackson", "Jackson Household", "Completed", "Normal", 95);
  t("SEND DOCU — Jackson Roth Conversion Docs", "hh-jackson", "Jackson Household", "Not Started", "Normal", 9);
  t("FOLLOW-UP: Schedule annual meeting — Jackson", "hh-jackson", "Jackson Household", "Not Started", "Normal", 20, 15);
  t("Account opening — Jackson Roth IRA", "hh-jackson", "Jackson Household", "Completed", "Normal", 150);
  t("SEND DOCU — Jackson Advisory Agreement", "hh-jackson", "Jackson Household", "Completed", "Normal", 145);

  // ── Thompson (55) — RED: no review, 3 overdue, stale 45d ──
  t("SEND DOCU — Thompson Trust Amendment", "hh-thompson", "Thompson Household", "Not Started", "Normal", 7);
  t("FOLLOW-UP: Beneficiary update — Thompson", "hh-thompson", "Thompson Household", "Not Started", "High", 28, 21);
  t("FOLLOW-UP: TOA follow-up — Thompson", "hh-thompson", "Thompson Household", "Not Started", "High", 25, 14);
  t("FOLLOW-UP: Account funding — Thompson", "hh-thompson", "Thompson Household", "Not Started", "Normal", 20, 10);
  t("Account opening — Thompson Individual", "hh-thompson", "Thompson Household", "Completed", "Normal", 180);
  t("Account opening — Thompson Trust", "hh-thompson", "Thompson Household", "Completed", "Normal", 175);

  // ── Whitfield (48) — RED: new client, nothing done ──
  t("MEETING NOTE: Initial Consultation — Whitfield", "hh-whitfield", "Whitfield Household", "Completed", "Normal", 18);
  t("FOLLOW-UP: Send account opening paperwork", "hh-whitfield", "Whitfield Household", "Not Started", "High", 15, 10);
  t("FOLLOW-UP: Complete KYC questionnaire", "hh-whitfield", "Whitfield Household", "Not Started", "High", 15, 8);
  t("FOLLOW-UP: Set up direct deposit", "hh-whitfield", "Whitfield Household", "Not Started", "Normal", 15, 5);
  t("FOLLOW-UP: Schedule follow-up meeting", "hh-whitfield", "Whitfield Household", "Not Started", "Normal", 15, 3);

  return tasks;
}

// ─── Exports ──────────────────────────────────────────────────────────────

/** Returns demo data in the exact shape buildPracticeData / buildHomeStats expect. */
export function getDemoSFData(): { tasks: SFTask[]; households: SFHousehold[]; instanceUrl: string } {
  // Reset ID counter so data is stable across calls
  _id = 1000;
  return {
    tasks: makeSFTasks(),
    households: makeSFHouseholds(),
    instanceUrl: "https://demo.salesforce.com",
  };
}

/** Returns household detail for FamilyScreen (same shape as callSF("getHouseholdDetail")). */
export function getDemoHouseholdDetail(householdId: string) {
  const hh = DEMO_HOUSEHOLDS.find(h => h.id === householdId);
  if (!hh) return null;

  const sfData = getDemoSFData();
  const household = sfData.households.find(h => h.id === householdId)!;
  const tasks = sfData.tasks.filter(t => t.householdId === householdId).map(t => ({
    id: t.id,
    subject: t.subject,
    status: t.status,
    priority: t.priority,
    createdAt: t.createdAt,
    dueDate: t.dueDate,
    description: "",
  }));

  return {
    success: true,
    household,
    contacts: hh.contacts,
    tasks,
    householdUrl: `https://demo.salesforce.com/${householdId}`,
  };
}

/** Mock FSC FinancialAccount data for aumCoverage integration. */
export const DEMO_FSC_DATA = {
  success: true,
  fscAvailable: true,
  totalAum: DEMO_HOUSEHOLDS.reduce((sum, h) => sum + h.aum, 0),
  count: DEMO_HOUSEHOLDS.length * 2,
  aumByHousehold: Object.fromEntries(DEMO_HOUSEHOLDS.map(h => [h.id, h.aum])),
};

/** Lookup a demo household's health data by ID. */
export function getDemoHouseholdHealth(householdId: string): DemoHouseholdHealth | undefined {
  return DEMO_HOUSEHOLDS.find(h => h.id === householdId);
}

/** Demo reconciliation data for custodian-CRM matching. */
export const DEMO_RECONCILIATION = {
  matched: [
    { custodialName: "Rivera, Carlos & Maria", crmHousehold: "Rivera Household", crmId: "hh-rivera", balance: 3_200_000 },
    { custodialName: "Patel, Raj & Priya", crmHousehold: "Patel Household", crmId: "hh-patel", balance: 5_100_000 },
    { custodialName: "Chen, Wei & Richards, Sarah", crmHousehold: "Chen/Richards Household", crmId: "hh-chen", balance: 6_300_000 },
    { custodialName: "O'Brien, Patrick", crmHousehold: "O'Brien Household", crmId: "hh-obrien", balance: 2_400_000 },
    { custodialName: "Jackson, Darnell", crmHousehold: "Jackson Household", crmId: "hh-jackson", balance: 2_800_000 },
    { custodialName: "Thompson, Robert", crmHousehold: "Thompson Household", crmId: "hh-thompson", balance: 4_700_000 },
  ],
  orphanCustodial: [
    { custodialName: "Garrison, William", balance: 1_400_000, notes: "Account at Schwab — no CRM match" },
    { custodialName: "Martinez, Isabella", balance: 890_000, notes: "Account at Schwab — no CRM match" },
  ],
  orphanCrm: [
    { crmHousehold: "Whitfield Household", crmId: "hh-whitfield", notes: "New client — account opening in progress" },
  ],
};

/** Pre-seed demo household notes (called once on demo mode init). */
export function seedDemoNotes() {
  const KEY = "min-household-notes";
  if (typeof window === "undefined") return;
  try {
    const existing = JSON.parse(localStorage.getItem(KEY) || "[]");
    if (existing.length > 0) return; // already seeded
  } catch { /* */ }
  const demoNotes = [
    { id: "demo-note-1", householdId: "hh-thompson", text: "Awaiting updated beneficiary forms from attorney — do not escalate until received.", author: "Sandra Ellis", createdAt: new Date(Date.now() - 5 * 86400000).toISOString(), pinned: false, category: "context" },
    { id: "demo-note-2", householdId: "hh-jackson", text: "Client hospitalized — all pending items on hold per Brett.", author: "Emily Chen", createdAt: new Date(Date.now() - 3 * 86400000).toISOString(), pinned: true, category: "hold" },
  ];
  localStorage.setItem(KEY, JSON.stringify(demoNotes));
}
