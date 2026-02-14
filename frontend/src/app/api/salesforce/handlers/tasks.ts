// ─── Task Domain Handlers ────────────────────────────────────────────────────
//
// All operations on tasks: querying, completing, creating.

import { NextResponse } from "next/server";
import { query, update, createTask } from "@/lib/sf-client";
import type { SFContext } from "@/lib/sf-client";
import { validate } from "@/lib/sf-validation";
import { orgQuery } from "@/lib/org-query";

type Handler = (data: unknown, ctx: SFContext) => Promise<NextResponse>;

export const taskHandlers: Record<string, Handler> = {
  queryTasks: async (raw, ctx) => {
    const data = validate.queryTasks(raw);

    // Include advisor field in household query (schema-aware)
    const advisorField = orgQuery.advisorField();
    const advisorSelect = advisorField === "OwnerId" ? "Owner.Name" : advisorField;
    const hhFields = `Id, Name, CreatedDate, Description, ${advisorSelect}`;

    // Fetch limit+1 to detect if more records exist (N+1 pagination pattern)
    const fetchLimit = data.limit + 1;
    const offsetClause = data.offset ? ` OFFSET ${data.offset}` : "";
    const householdSoql = orgQuery.listHouseholds(hhFields, fetchLimit, data.offset);

    const [allTasks, allHouseholds] = await Promise.all([
      query(ctx, `SELECT Id, Subject, Status, Priority, Description, CreatedDate, ActivityDate, What.Name, What.Id FROM Task WHERE What.Type = 'Account' ORDER BY CreatedDate DESC LIMIT ${fetchLimit}${offsetClause}`),
      query(ctx, householdSoql),
    ]);

    const tasksHasMore = allTasks.length > data.limit;
    const hhHasMore = allHouseholds.length > data.limit;

    return NextResponse.json({
      success: true,
      tasks: tasksHasMore ? allTasks.slice(0, data.limit) : allTasks,
      households: hhHasMore ? allHouseholds.slice(0, data.limit) : allHouseholds,
      instanceUrl: ctx.instanceUrl,
      pagination: {
        tasks: { offset: data.offset, limit: data.limit, hasMore: tasksHasMore },
        households: { offset: data.offset, limit: data.limit, hasMore: hhHasMore },
      },
    });
  },

  completeTask: async (raw, ctx) => {
    const data = validate.completeTask(raw);
    await update(ctx, "Task", data.taskId, { Status: "Completed" });
    return NextResponse.json({ success: true, taskId: data.taskId, taskUrl: `${ctx.instanceUrl}/${data.taskId}` });
  },

  createTask: async (raw, ctx) => {
    const data = validate.createTask(raw);
    const task = await createTask(ctx, {
      subject: data.subject,
      householdId: data.householdId,
      status: (data.status as "Completed" | "Not Started" | "In Progress") || "Not Started",
      priority: (data.priority as "High" | "Normal" | "Low") || "Normal",
      activityDate: data.dueDate,
      description: data.description || `Created by Min at ${new Date().toISOString()}`,
    });
    return NextResponse.json({ success: true, taskId: task.id, taskUrl: `${ctx.instanceUrl}/${task.id}` });
  },
};
