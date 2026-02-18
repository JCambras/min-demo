// ─── Home Stats Types & Computation ─────────────────────────────────────────
//
// Single source of truth for stat card types and the buildHomeStats computation.
// Imported by: page.tsx, TaskManager, and any future component that needs stats.

import { isMeetingNote, isComplianceReview, isDocuSignSend, classifyTask, DOCUSIGN_SEND, COMPLIANCE_REVIEW, MEETING_NOTE, FOLLOW_UP } from "./task-subjects";
import { formatDate } from "./format";

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
  recentItems: { subject: string; household: string; url: string; type: string }[];
  insights: Insight[];
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
): HomeStats {
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
    if (days >= 5) {
      const hh = (worst.householdName || "").replace(" Household", "");
      insights.push({
        severity: days > 10 ? "critical" : "high",
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
    if (coveragePct < 80) {
      insights.push({
        severity: coveragePct < 50 ? "critical" : "high",
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
    if (stalestDays >= 30) {
      const hh = filteredHH.find(h => h.id === stalestId);
      const name = (hh?.name || "").replace(" Household", "");
      insights.push({
        severity: stalestDays > 60 ? "critical" : "medium",
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
      severity: days > 7 ? "critical" : "high",
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
    })),
    insights: topInsights,
  };
}
