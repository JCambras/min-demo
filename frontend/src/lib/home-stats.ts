// ─── Home Stats Types & Computation ─────────────────────────────────────────
//
// Single source of truth for stat card types and the buildHomeStats computation.
// Imported by: page.tsx, TaskManager, and any future component that needs stats.

import { isMeetingNote, isComplianceReview, isDocuSignSend, classifyTask, DOCUSIGN_SEND } from "./task-subjects";
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
    label: t.subject,
    sub: `${t.householdName || ""}${t.dueDate ? ` · Due ${formatDate(t.dueDate)}` : ""}`,
    url: `${instanceUrl}/${t.id}`,
    priority: t.priority,
    due: t.dueDate ? formatDate(t.dueDate) : "",
    householdId: t.householdId,
    householdName: t.householdName,
  });

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
      label: t.subject.replace(`${DOCUSIGN_SEND} — `, ""),
      sub: `${t.householdName || ""} · Awaiting signature`,
      url: `${instanceUrl}/${t.id}`,
    })),
    upcomingMeetingItems: upMeetings.slice(0, 20).map(t => ({
      label: t.subject,
      sub: `${t.householdName || ""} · ${formatDate(t.createdAt)}`,
      url: `${instanceUrl}/${t.id}`,
    })),
    recentItems: completed.slice(0, 5).map(t => ({
      subject: t.subject,
      household: t.householdName || "",
      url: `${instanceUrl}/${t.id}`,
      type: classifyTask(t.subject),
    })),
  };
}
