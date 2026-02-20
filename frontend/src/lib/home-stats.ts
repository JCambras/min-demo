// ─── Home Stats Types & Computation ─────────────────────────────────────────
//
// Single source of truth for stat card types and the buildHomeStats computation.
// Imported by: page.tsx, TaskManager, and any future component that needs stats.

import { isMeetingNote, isComplianceReview, isDocuSignSend, classifyTask, DOCUSIGN_SEND, COMPLIANCE_REVIEW, MEETING_NOTE, FOLLOW_UP } from "./task-subjects";
import { formatDate } from "./format";
import type { TriageThresholdConfig } from "./triage-config";
import { DEFAULT_TRIAGE_CONFIG } from "./triage-config";

export interface StatDetailItem {
  label: string;
  sub: string;
  url: string;
  householdId?: string;
  householdName?: string;
  priority?: string;
  due?: string;
  type?: string;
  daysOutstanding?: number;
}

export interface Insight {
  severity: "critical" | "high" | "medium";
  headline: string;
  detail: string;
  householdId?: string;
  url?: string;
  action?: string;
}

export interface TriageSnoozeOption {
  label: string;
  date?: string; // ISO date string or descriptive date
}

export interface TriageSource {
  system: string;   // e.g., "Schwab portal", "CRM (Redtail)"
  timestamp: string; // e.g., "7:04 AM today", "Nov 12, 2025"
  fresh?: boolean;   // controls opacity — stale sources appear more muted
}

export interface TriageItem {
  id: string;
  urgency: "now" | "today" | "this-week";
  label: string;
  reason: string;
  url: string;
  householdId?: string;
  householdName?: string;
  action: string;
  category: "overdue" | "unsigned" | "compliance" | "followup" | "stale";
  snoozeOptions?: TriageSnoozeOption[];
  sources?: TriageSource[];
}

export interface HomeStats {
  overdueTasks: number;
  openTasks: number;
  readyForReview: number;
  unsignedEnvelopes: number;
  upcomingMeetings: number;
  overdueTaskItems: StatDetailItem[];
  openTaskItems: StatDetailItem[];
  readyForReviewItems: StatDetailItem[];
  unsignedItems: StatDetailItem[];
  upcomingMeetingItems: StatDetailItem[];
  recentItems: { subject: string; household: string; url: string; type: string; householdId?: string; householdName?: string }[];
  insights: Insight[];
  triageItems: TriageItem[];
}

// ─── Canonical CRM Record Shapes ────────────────────────────────────────────

export type SFTask = {
  id: string;
  subject: string;
  status: string;
  priority: string;
  createdAt: string;
  dueDate: string;
  householdName?: string;
  householdId?: string;
  description?: string;
};

export type SFHousehold = {
  id: string;
  name: string;
  createdAt: string;
  description?: string;
};

// ─── Helpers ────────────────────────────────────────────────────────────────

function daysSince(date: string): number {
  return Math.max(1, Math.floor((Date.now() - new Date(date).getTime()) / 86400000));
}

/** Strip internal prefixes from task subjects for display */
function humanizeSubject(subject: string, householdName?: string): string {
  const hh = (householdName || "").replace(" Household", "");
  let s = subject;
  // DocuSign tasks: "SEND DOCU — Smith IRA" → "DocuSign: Smith IRA"
  if (s.includes(DOCUSIGN_SEND)) {
    s = s.replace(`${DOCUSIGN_SEND} — `, "").replace(householdName || "___", "").trim();
    return `DocuSign: ${hh ? `${hh} ` : ""}${s}`.trim();
  }
  // Compliance: "COMPLIANCE REVIEW PASSED — Smith" → "Compliance review passed — Smith"
  if (s.includes(COMPLIANCE_REVIEW)) {
    return s.replace(COMPLIANCE_REVIEW, "Compliance review");
  }
  // Meeting notes: "MEETING NOTE — Jones (Annual)" → "Meeting note — Jones (Annual)"
  if (s.includes(MEETING_NOTE)) {
    return s.replace(MEETING_NOTE, "Meeting note");
  }
  // Follow-ups: "FOLLOW-UP: Call Jones" → "Follow-up: Call Jones"
  if (s.includes(FOLLOW_UP)) {
    return s.replace(FOLLOW_UP, "Follow-up");
  }
  return s;
}

/** Describe a recent activity item in plain language */
function describeActivity(subject: string, householdName?: string): string {
  const hh = (householdName || "").replace(" Household", "");
  if (subject.includes(COMPLIANCE_REVIEW)) {
    const passed = subject.toUpperCase().includes("PASSED");
    return `${hh ? `${hh}: ` : ""}Compliance review ${passed ? "passed" : "flagged"}`;
  }
  if (subject.includes(MEETING_NOTE)) {
    return `${hh ? `${hh}: ` : ""}Meeting notes recorded`;
  }
  if (subject.includes(DOCUSIGN_SEND)) {
    const doc = subject.replace(`${DOCUSIGN_SEND} — `, "").replace(householdName || "___", "").trim();
    return `${hh ? `${hh}: ` : ""}DocuSign completed${doc ? ` — ${doc}` : ""}`;
  }
  if (subject.includes(FOLLOW_UP)) {
    const detail = subject.replace(`${FOLLOW_UP}: `, "").trim();
    return `${hh ? `${hh}: ` : ""}${detail} completed`;
  }
  return humanizeSubject(subject, householdName);
}

export function getHouseholdAdvisor(desc?: string): string | null {
  if (!desc) return null;
  const match = desc.match(/Assigned Advisor:\s*(.+)/i);
  return match ? match[1].trim() : null;
}

// ─── Stats Builder (pure function) ──────────────────────────────────────────

export function buildHomeStats(
  tasks: SFTask[],
  households: SFHousehold[],
  instanceUrl: string,
  filterAdvisor?: string,
  config?: TriageThresholdConfig,
): HomeStats {
  const cfg = config ?? DEFAULT_TRIAGE_CONFIG;
  const now = Date.now(), msDay = 86400000;
  const thisWeek = (d: string) => (now - new Date(d).getTime()) / msDay <= 7;

  // If filtering by advisor, scope households and tasks to that advisor's book
  let filteredHH = households;
  let filteredTasks = tasks;
  if (filterAdvisor) {
    const advisorHHIds = new Set(
      households
        .filter(h => getHouseholdAdvisor(h.description) === filterAdvisor)
        .map(h => h.id)
    );
    filteredHH = households.filter(h => advisorHHIds.has(h.id));
    filteredTasks = tasks.filter(t => t.householdId && advisorHHIds.has(t.householdId));
  }

  const open = filteredTasks.filter(t => t.status !== "Completed");
  const completed = filteredTasks.filter(t => t.status === "Completed");
  const overdue = open.filter(t => t.dueDate && new Date(t.dueDate).getTime() < now);
  const meetings = filteredTasks.filter(t => isMeetingNote(t.subject));
  const compReviews = filteredTasks.filter(t => isComplianceReview(t.subject));
  const reviewed = new Set<string>();
  compReviews.forEach(t => { if (t.householdName) reviewed.add(t.householdName); });
  const unsigned = filteredTasks.filter(t =>
    t.status === "Not Started" && isDocuSignSend(t.subject)
  );
  const unreviewedHH = filteredHH.filter(h => !reviewed.has(h.name));
  const upMeetings = meetings.filter(t => thisWeek(t.createdAt));

  const taskToItem = (t: SFTask): StatDetailItem => ({
    label: humanizeSubject(t.subject, t.householdName),
    sub: `${(t.householdName || "").replace(" Household", "")}${t.dueDate ? ` · Due ${formatDate(t.dueDate)}` : ""}`,
    url: `${instanceUrl}/${t.id}`,
    priority: t.priority,
    due: t.dueDate ? formatDate(t.dueDate) : "",
    householdId: t.householdId,
    householdName: t.householdName,
  });

  // ── Insights: named, specific, surprising ──
  const insights: Insight[] = [];

  // 1. Longest-unsigned DocuSign
  if (unsigned.length > 0) {
    const worst = unsigned.reduce((a, b) => daysSince(a.createdAt) > daysSince(b.createdAt) ? a : b);
    const days = daysSince(worst.createdAt);
    if (days >= cfg.unsignedDocuSignDays) {
      const hh = (worst.householdName || "").replace(" Household", "");
      insights.push({
        severity: days > cfg.unsignedCriticalDays ? "critical" : "high",
        headline: `${hh || "DocuSign"}: unsigned for ${days} days`,
        detail: `${humanizeSubject(worst.subject, worst.householdName)} has been waiting for a signature since ${formatDate(worst.createdAt)}.`,
        householdId: worst.householdId,
        url: `${instanceUrl}/${worst.id}`,
        action: "View envelope",
      });
    }
  }

  // 2. Compliance coverage gap
  if (filteredHH.length > 0) {
    const coveragePct = Math.round((reviewed.size / filteredHH.length) * 100);
    if (coveragePct < cfg.complianceHighPct) {
      insights.push({
        severity: coveragePct < cfg.complianceCriticalPct ? "critical" : "high",
        headline: `Compliance: ${coveragePct}% of households reviewed`,
        detail: `${unreviewedHH.length} of ${filteredHH.length} households have never had a compliance review on file.`,
        action: "Run reviews",
      });
    }
  }

  // 3. Stalest household (no activity)
  if (filteredHH.length > 0) {
    const lastActivityByHH = new Map<string, number>();
    for (const h of filteredHH) {
      lastActivityByHH.set(h.id, new Date(h.createdAt).getTime());
    }
    for (const t of filteredTasks) {
      if (t.householdId) {
        const prev = lastActivityByHH.get(t.householdId) || 0;
        const tTime = new Date(t.createdAt).getTime();
        if (tTime > prev) lastActivityByHH.set(t.householdId, tTime);
      }
    }
    let stalestId = "", stalestDays = 0;
    for (const [id, lastMs] of lastActivityByHH) {
      const d = Math.floor((now - lastMs) / msDay);
      if (d > stalestDays) { stalestDays = d; stalestId = id; }
    }
    if (stalestDays >= cfg.staleHouseholdDays) {
      const hh = filteredHH.find(h => h.id === stalestId);
      const name = (hh?.name || "").replace(" Household", "");
      insights.push({
        severity: stalestDays > cfg.staleCriticalDays ? "critical" : "medium",
        headline: `${name || "Household"}: no activity in ${stalestDays} days`,
        detail: `This household hasn't had any task, meeting, or review logged since ${formatDate(new Date(now - stalestDays * msDay).toISOString())}.`,
        householdId: stalestId,
        url: `${instanceUrl}/${stalestId}`,
        action: "View family",
      });
    }
  }

  // 4. High-priority overdue tasks
  const highPriOverdue = overdue.filter(t => t.priority === "High");
  if (highPriOverdue.length > 0) {
    const worst = highPriOverdue.reduce((a, b) => new Date(a.dueDate).getTime() < new Date(b.dueDate).getTime() ? a : b);
    const days = daysSince(worst.dueDate);
    const hh = (worst.householdName || "").replace(" Household", "");
    insights.push({
      severity: days > cfg.highPriOverdueCriticalDays ? "critical" : "high",
      headline: `${hh ? `${hh}: ` : ""}High-priority task ${days} days overdue`,
      detail: humanizeSubject(worst.subject, worst.householdName),
      householdId: worst.householdId,
      url: `${instanceUrl}/${worst.id}`,
      action: "View task",
    });
  }

  // Sort by severity (critical first), cap at 3
  const sevOrder = { critical: 0, high: 1, medium: 2 };
  insights.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);
  const topInsights = insights.slice(0, 3);

  // ── Triage: "do this before noon" prioritized queue ──
  const triage: TriageItem[] = [];
  const hhShort = (n?: string) => (n || "").replace(" Household", "");
  let triageIdx = 0;

  // Helper: compute contextual snooze options based on item
  const defaultSnooze: TriageSnoozeOption[] = [
    { label: "Tomorrow" },
    { label: "Next Monday" },
    { label: "In 2 weeks" },
  ];

  const computeSnooze = (t: SFTask, category: string): TriageSnoozeOption[] => {
    // Patel NIGO item (unsigned DocuSign)
    if (t.householdId === "hh-patel" && category === "unsigned") {
      return [
        { label: "Tomorrow" },
        { label: "Before account submission (Feb 21)", date: "2026-02-21" },
        { label: "End of week" },
      ];
    }
    // Chen RMD item (has deadline)
    if (t.householdId === "hh-chen" && t.subject.includes("RMD")) {
      return [
        { label: "2 weeks before deadline (Mar 1)", date: "2026-03-01" },
        { label: "3 days before deadline (Mar 10)", date: "2026-03-10" },
        { label: "Tomorrow" },
      ];
    }
    // Items with a due date — offer relative options
    if (t.dueDate) {
      const dueDate = new Date(t.dueDate);
      const twoWeeksBefore = new Date(dueDate.getTime() - 14 * msDay);
      const threeDaysBefore = new Date(dueDate.getTime() - 3 * msDay);
      if (twoWeeksBefore.getTime() > now) {
        return [
          { label: `2 weeks before (${twoWeeksBefore.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`, date: twoWeeksBefore.toISOString() },
          { label: `3 days before (${threeDaysBefore.toLocaleDateString("en-US", { month: "short", day: "numeric" })})`, date: threeDaysBefore.toISOString() },
          { label: "Tomorrow" },
        ];
      }
    }
    return defaultSnooze;
  };

  // Helper: generate source lines from task data
  const makeSources = (t: SFTask): TriageSource[] => {
    const sources: TriageSource[] = [];
    const createdDays = daysSince(t.createdAt);
    const createdStr = createdDays <= 1 ? "today" : createdDays <= 2 ? "yesterday" : formatDate(t.createdAt);
    if (t.subject.includes("DOCU")) {
      sources.push({ system: "DocuSign", timestamp: createdStr, fresh: createdDays <= 3 });
    } else {
      sources.push({ system: "Salesforce", timestamp: createdStr, fresh: createdDays <= 7 });
    }
    if (t.householdName) {
      sources.push({ system: "CRM (Salesforce)", timestamp: `${hhShort(t.householdName)}`, fresh: true });
    }
    return sources;
  };

  // High-priority overdue → urgency "now"
  for (const t of highPriOverdue.slice(0, 3)) {
    const days = daysSince(t.dueDate);
    triage.push({
      id: `triage-${triageIdx++}`,
      urgency: "now", category: "overdue",
      label: humanizeSubject(t.subject, t.householdName),
      reason: `High priority · ${days}d overdue`,
      url: `${instanceUrl}/${t.id}`, householdId: t.householdId, householdName: t.householdName,
      action: "Complete task",
      sources: makeSources(t),
      snoozeOptions: computeSnooze(t, "overdue"),
    });
  }

  // DocuSign unsigned > threshold days → urgency "now"
  for (const t of unsigned.filter(u => daysSince(u.createdAt) >= cfg.unsignedDocuSignDays).slice(0, 2)) {
    const days = daysSince(t.createdAt);
    triage.push({
      id: `triage-${triageIdx++}`,
      urgency: "now", category: "unsigned",
      label: `${hhShort(t.householdName)}: DocuSign awaiting signature`,
      reason: `Unsigned ${days} days`,
      url: `${instanceUrl}/${t.id}`, householdId: t.householdId, householdName: t.householdName,
      action: "Follow up",
      sources: makeSources(t),
      snoozeOptions: computeSnooze(t, "unsigned"),
    });
  }

  // Normal-priority overdue → urgency "today"
  const normalOverdue = overdue.filter(t => t.priority !== "High").slice(0, 3);
  for (const t of normalOverdue) {
    const days = daysSince(t.dueDate);
    triage.push({
      id: `triage-${triageIdx++}`,
      urgency: "today", category: "overdue",
      label: humanizeSubject(t.subject, t.householdName),
      reason: `${days}d overdue · ${hhShort(t.householdName)}`,
      url: `${instanceUrl}/${t.id}`, householdId: t.householdId, householdName: t.householdName,
      action: "Complete task",
      sources: makeSources(t),
      snoozeOptions: computeSnooze(t, "overdue"),
    });
  }

  // Tasks due today or tomorrow → urgency "today"
  const dueSoon = open.filter(t => {
    if (!t.dueDate) return false;
    const daysUntil = (new Date(t.dueDate).getTime() - now) / msDay;
    return daysUntil >= 0 && daysUntil <= cfg.dueSoonDays;
  }).slice(0, 2);
  for (const t of dueSoon) {
    const isToday = new Date(t.dueDate).toDateString() === new Date().toDateString();
    triage.push({
      id: `triage-${triageIdx++}`,
      urgency: "today", category: "followup",
      label: humanizeSubject(t.subject, t.householdName),
      reason: isToday ? `Due today · ${hhShort(t.householdName)}` : `Due tomorrow · ${hhShort(t.householdName)}`,
      url: `${instanceUrl}/${t.id}`, householdId: t.householdId, householdName: t.householdName,
      action: "Complete task",
      sources: makeSources(t),
      snoozeOptions: computeSnooze(t, "followup"),
    });
  }

  // Longest-unreviewed households → urgency "this-week"
  if (unreviewedHH.length > 0) {
    const oldest = [...unreviewedHH].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()).slice(0, 2);
    for (const h of oldest) {
      const days = Math.floor((now - new Date(h.createdAt).getTime()) / msDay);
      if (days >= cfg.complianceUnreviewedDays) {
        // Thompson inactivity → specific snooze options
        const snooze = h.id === "hh-thompson"
          ? [{ label: "Tomorrow" }, { label: "Next Monday" }, { label: "In 2 weeks" }]
          : defaultSnooze;
        triage.push({
          id: `triage-${triageIdx++}`,
          urgency: "this-week", category: "compliance",
          label: `${hhShort(h.name)}: no compliance review`,
          reason: `Client for ${days}d · never reviewed`,
          url: `${instanceUrl}/${h.id}`, householdId: h.id, householdName: h.name,
          action: "Run review",
          sources: [
            { system: "CRM (Salesforce)", timestamp: `client for ${days}d`, fresh: false },
          ],
          snoozeOptions: snooze,
        });
      }
    }
  }

  // Sort by urgency tier, cap at configured limit
  const urgOrder = { now: 0, today: 1, "this-week": 2 };
  triage.sort((a, b) => urgOrder[a.urgency] - urgOrder[b.urgency]);
  const topTriage = triage.slice(0, cfg.triageCap);

  return {
    overdueTasks: overdue.length,
    openTasks: open.length,
    readyForReview: unreviewedHH.length,
    unsignedEnvelopes: unsigned.length,
    upcomingMeetings: upMeetings.length,
    overdueTaskItems: overdue.slice(0, 20).map(taskToItem),
    openTaskItems: open.slice(0, 20).map(taskToItem),
    readyForReviewItems: unreviewedHH.slice(0, 20).map(h => ({
      label: h.name,
      sub: `Created ${formatDate(h.createdAt)} · No compliance review`,
      url: `${instanceUrl}/${h.id}`,
      householdId: h.id,
      householdName: h.name,
    })),
    unsignedItems: unsigned.slice(0, 20).map(t => ({
      label: `${(t.householdName || "").replace(" Household", "")} ${t.subject.replace(`${DOCUSIGN_SEND} — `, "").replace(t.householdName || "___", "").trim()} — DocuSign outstanding ${daysSince(t.createdAt)} days`,
      sub: `Created ${formatDate(t.createdAt)}`,
      url: `${instanceUrl}/${t.id}`,
      daysOutstanding: daysSince(t.createdAt),
    })),
    upcomingMeetingItems: upMeetings.slice(0, 20).map(t => ({
      label: humanizeSubject(t.subject, t.householdName),
      sub: `${(t.householdName || "").replace(" Household", "")} · ${formatDate(t.createdAt)}`,
      url: `${instanceUrl}/${t.id}`,
    })),
    recentItems: completed.slice(0, 5).map(t => ({
      subject: describeActivity(t.subject, t.householdName),
      household: (t.householdName || "").replace(" Household", "") || formatDate(t.createdAt),
      url: `${instanceUrl}/${t.id}`,
      type: classifyTask(t.subject),
      householdId: t.householdId || undefined,
      householdName: t.householdName || undefined,
    })),
    insights: topInsights,
    triageItems: topTriage,
  };
}
