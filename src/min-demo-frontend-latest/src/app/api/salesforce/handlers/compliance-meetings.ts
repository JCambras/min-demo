// ─── Compliance & Meeting Domain Handlers ────────────────────────────────────

import { NextResponse } from "next/server";
import { createTask, createTasksBatch } from "@/lib/sf-client";
import type { SFContext, TaskInput } from "@/lib/sf-client";
import { validate } from "@/lib/sf-validation";
import { fireWorkflowTrigger } from "@/lib/workflows";

type Handler = (data: unknown, ctx: SFContext) => Promise<NextResponse>;

export const complianceHandlers: Record<string, Handler> = {
  recordComplianceReview: async (raw, ctx) => {
    const data = validate.recordComplianceReview(raw);
    const task = await createTask(ctx, {
      subject: `COMPLIANCE REVIEW ${data.passed ? "PASSED" : "FLAGGED"} — ${data.familyName}`,
      householdId: data.householdId,
      priority: data.passed ? "Normal" : "High",
      description: `Compliance review conducted by Min at ${new Date().toISOString()}\n\n` +
        `Result: ${data.passed ? "ALL CHECKS PASSED" : `${data.failCount} ITEMS REQUIRE ATTENTION`}\n\n` +
        data.checks.map(c => `${c.status === "pass" ? "✓" : c.status === "warn" ? "⚠" : "✗"} ${c.label}: ${c.detail}`).join("\n") +
        `\n\nReviewed by: ${data.reviewerName || "Advisor"}\nNext review due: ${data.nextReviewDate || "90 days"}`,
    });
    await fireWorkflowTrigger(ctx, "compliance_reviewed", data.householdId, `${data.familyName} Household`);
    return NextResponse.json({ success: true, task });
  },
};

export const meetingHandlers: Record<string, Handler> = {
  recordMeetingNote: async (raw, ctx) => {
    const data = validate.recordMeetingNote(raw);
    const followUpBlock = data.followUps.length > 0
      ? `\n\nFOLLOW-UP ITEMS:\n${data.followUps.map((f, i) => `${i + 1}. ${f}`).join("\n")}`
      : "";
    const task = await createTask(ctx, {
      subject: `MEETING NOTE — ${data.familyName}${data.meetingType ? ` (${data.meetingType})` : ""}`,
      householdId: data.householdId,
      contactId: data.contactId,
      activityDate: data.meetingDate || new Date().toISOString().split("T")[0],
      description:
        `Meeting: ${data.meetingType || "General"}\n` +
        `Date: ${data.meetingDate || new Date().toISOString().split("T")[0]}\n` +
        `Attendees: ${data.attendees || "Advisor + Client"}\n` +
        `Duration: ${data.duration || "30 min"}\n\n` +
        `NOTES:\n${data.notes}` +
        followUpBlock +
        `\n\nRecorded by Min at ${new Date().toISOString()}`,
    });
    const dueDate = new Date();
    dueDate.setDate(dueDate.getDate() + (data.followUpDays || 7));
    const dueDateStr = dueDate.toISOString().split("T")[0];
    const followUpInputs: TaskInput[] = data.followUps.map(followUp => ({
      subject: `FOLLOW-UP: ${followUp}`,
      householdId: data.householdId,
      contactId: data.contactId,
      status: "Not Started" as const,
      activityDate: dueDateStr,
      description: `Follow-up from meeting on ${data.meetingDate || new Date().toISOString().split("T")[0]}\n\nOriginal note: ${followUp}\n\nCreated by Min at ${new Date().toISOString()}`,
    }));
    const { records: followUpTasks } = await createTasksBatch(ctx, followUpInputs);
    return NextResponse.json({ success: true, task, followUpTasks, followUpCount: followUpTasks.length });
  },
};
