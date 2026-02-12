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

// ─── Salesforce Record Shapes ───────────────────────────────────────────────

export type SFTask = {
  Id: string;
  Subject: string;
  Status: string;
  Priority: string;
  CreatedDate: string;
  ActivityDate: string;
  What?: { Name: string; Id?: string; Description?: string };
};

export type SFHousehold = {
  Id: string;
  Name: string;
  CreatedDate: string;
  Description?: string;
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
        .filter(h => getHouseholdAdvisor(h.Description) === filterAdvisor)
        .map(h => h.Id)
    );
    filteredHH = households.filter(h => advisorHHIds.has(h.Id));
    filteredTasks = tasks.filter(t => t.What?.Id && advisorHHIds.has(t.What.Id));
  }

  const open = filteredTasks.filter(t => t.Status !== "Completed");
  const completed = filteredTasks.filter(t => t.Status === "Completed");
  const overdue = open.filter(t => t.ActivityDate && new Date(t.ActivityDate).getTime() < now);
  const meetings = filteredTasks.filter(t => isMeetingNote(t.Subject));
  const compReviews = filteredTasks.filter(t => isComplianceReview(t.Subject));
  const reviewed = new Set<string>();
  compReviews.forEach(t => { if (t.What?.Name) reviewed.add(t.What.Name); });
  const unsigned = filteredTasks.filter(t =>
    t.Status === "Not Started" && isDocuSignSend(t.Subject)
  );
  const unreviewedHH = filteredHH.filter(h => !reviewed.has(h.Name));
  const upMeetings = meetings.filter(t => thisWeek(t.CreatedDate));

  const taskToItem = (t: SFTask): StatDetailItem => ({
    label: t.Subject,
    sub: `${t.What?.Name || ""}${t.ActivityDate ? ` · Due ${formatDate(t.ActivityDate)}` : ""}`,
    url: `${instanceUrl}/${t.Id}`,
    priority: t.Priority,
    due: t.ActivityDate ? formatDate(t.ActivityDate) : "",
    householdId: t.What?.Id,
    householdName: t.What?.Name,
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
      label: h.Name,
      sub: `Created ${formatDate(h.CreatedDate)} · No compliance review`,
      url: `${instanceUrl}/${h.Id}`,
      householdId: h.Id,
      householdName: h.Name,
    })),
    unsignedItems: unsigned.slice(0, 20).map(t => ({
      label: t.Subject.replace(`${DOCUSIGN_SEND} — `, ""),
      sub: `${t.What?.Name || ""} · Awaiting signature`,
      url: `${instanceUrl}/${t.Id}`,
    })),
    upcomingMeetingItems: upMeetings.slice(0, 20).map(t => ({
      label: t.Subject,
      sub: `${t.What?.Name || ""} · ${formatDate(t.CreatedDate)}`,
      url: `${instanceUrl}/${t.Id}`,
    })),
    recentItems: completed.slice(0, 5).map(t => ({
      subject: t.Subject,
      household: t.What?.Name || "",
      url: `${instanceUrl}/${t.Id}`,
      type: classifyTask(t.Subject),
    })),
  };
}
