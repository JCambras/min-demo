// ─── Task Domain Handlers ────────────────────────────────────────────────────
//
// All operations on tasks: querying, completing, creating.

import { NextResponse } from "next/server";
import type { CRMPort, CRMContext } from "@/lib/crm/port";
import { validate } from "@/lib/sf-validation";

type Handler = (data: unknown, adapter: CRMPort, ctx: CRMContext) => Promise<NextResponse>;

export const taskHandlers: Record<string, Handler> = {
  queryTasks: async (raw, adapter, ctx) => {
    const data = validate.queryTasks(raw);
    const result = await adapter.queryTasks(ctx, data.limit, data.offset);
    return NextResponse.json({
      success: true,
      tasks: result.tasks.map(t => t.raw),
      households: result.households.map(h => h.raw),
      instanceUrl: ctx.instanceUrl,
      pagination: {
        tasks: { offset: data.offset, limit: data.limit, hasMore: result.tasksHasMore },
        households: { offset: data.offset, limit: data.limit, hasMore: result.householdsHasMore },
      },
    });
  },

  completeTask: async (raw, adapter, ctx) => {
    const data = validate.completeTask(raw);
    const record = await adapter.completeTask(ctx, data.taskId);
    return NextResponse.json({ success: true, taskId: record.id, taskUrl: `${ctx.instanceUrl}/${record.id}` });
  },

  createTask: async (raw, adapter, ctx) => {
    const data = validate.createTask(raw);
    const record = await adapter.createTask(ctx, {
      subject: data.subject,
      householdId: data.householdId,
      status: data.status || "Not Started",
      priority: data.priority || "Normal",
      dueDate: data.dueDate,
      description: data.description || `Created by Min at ${new Date().toISOString()}`,
    });
    return NextResponse.json({ success: true, taskId: record.id, taskUrl: `${ctx.instanceUrl}/${record.id}` });
  },
};
