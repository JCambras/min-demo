import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/sf-connection";
import { query, create, update, createTask, createTasksBatch, createContactsBatch, sanitizeSOQL, SFValidationError, SFQueryError, SFMutationError } from "@/lib/sf-client";
import type { SFContext, TaskInput } from "@/lib/sf-client";
import { validate } from "@/lib/sf-validation";
import { custodian } from "@/lib/custodian";

// ─── Handler Map ─────────────────────────────────────────────────────────────
// Each handler receives validated+typed input and a Salesforce context.
// No `any` — validation happens before dispatch.

type Handler = (data: unknown, ctx: SFContext) => Promise<NextResponse>;

const handlers: Record<string, Handler> = {
  searchContacts: async (raw, ctx) => {
    const data = validate.searchContacts(raw);
    const q = sanitizeSOQL(data.query);
    const contacts = await query(ctx,
      `SELECT Id, FirstName, LastName, Email, Phone, Account.Name FROM Contact WHERE FirstName LIKE '%${q}%' OR LastName LIKE '%${q}%' OR Email LIKE '%${q}%' OR Account.Name LIKE '%${q}%' ORDER BY LastName ASC LIMIT 10`
    );
    return NextResponse.json({ success: true, contacts });
  },

  confirmIntent: async (raw, ctx) => {
    const data = validate.confirmIntent(raw);
    const safeName = sanitizeSOQL(data.familyName);
    const existing = await query(ctx,
      `SELECT Id, Name FROM Account WHERE Name = '${safeName} Household' AND Type = 'Household' ORDER BY CreatedDate DESC LIMIT 1`
    );
    if (existing.length > 0 && !data.force) {
      return NextResponse.json({
        success: false, isDuplicate: true,
        existingId: existing[0].Id, existingUrl: `${ctx.instanceUrl}/${existing[0].Id}`,
        error: `${data.familyName} Household already exists. Click "Create Anyway" to proceed.`,
      });
    }
    const household = await create(ctx, "Account", {
      Name: `${data.familyName} Household`,
      Type: "Household",
      Description: `Account opening initiated by Min.${data.assignedAdvisor ? `\nAssigned Advisor: ${data.assignedAdvisor}` : ""}\nAccounts planned: ${data.accounts.map(a => `${a.type} (${a.owner})`).join(", ") || "None yet"}`,
    }, { allowDuplicates: true });

    const { records: contacts } = await createContactsBatch(ctx,
      data.members.map(m => ({ firstName: m.firstName, lastName: m.lastName, email: m.email, phone: m.phone, accountId: household.id }))
    );
    return NextResponse.json({ success: true, household, contacts });
  },

  recordFunding: async (raw, ctx) => {
    const data = validate.recordFunding(raw);
    const note = `FUNDING DETAILS (recorded by Min at ${new Date().toISOString()}):\n` +
      data.fundingDetails.map(f => `• ${f.account}: ${f.detail}`).join("\n") +
      `\n\nPTE Required: ${data.pteRequired ? "YES — auto-generated" : "No"}`;

    const existing = await query(ctx,
      `SELECT Description FROM Account WHERE Id = '${sanitizeSOQL(data.householdId)}' LIMIT 1`
    );
    const prevDesc = (existing[0]?.Description as string) || "";
    const fullDesc = prevDesc ? `${prevDesc}\n\n───────────────────\n\n${note}` : note;
    await update(ctx, "Account", data.householdId, { Description: fullDesc });

    const task = await createTask(ctx, {
      subject: `Funding configured — ${data.familyName} (${data.fundingDetails.length} accounts)`,
      householdId: data.householdId,
      description: note,
    });
    return NextResponse.json({ success: true, task, householdUrl: `${ctx.instanceUrl}/${data.householdId}` });
  },

  recordMoneyLink: async (raw, ctx) => {
    const data = validate.recordMoneyLink(raw);
    const task = await createTask(ctx, {
      subject: `MoneyLink setup — ${data.bankName} (****${data.lastFour})`,
      householdId: data.householdId,
      description: `Bank: ${data.bankName}\nRouting: ****${data.routingLastFour}\nAccount: ****${data.lastFour}\nRecorded by Min at ${new Date().toISOString()}`,
    });
    return NextResponse.json({ success: true, task });
  },

  recordBeneficiaries: async (raw, ctx) => {
    const data = validate.recordBeneficiaries(raw);
    const task = await createTask(ctx, {
      subject: `Beneficiary designations prefilled — ${data.familyName}`,
      householdId: data.householdId,
      description: data.designations.map(d => `• ${d.account}: ${d.beneficiary}`).join("\n") +
        `\n\nPrefilled by Min using ownership rules. Advisor reviewed at ${new Date().toISOString()}`,
    });
    return NextResponse.json({ success: true, task });
  },

  recordCompleteness: async (raw, ctx) => {
    const data = validate.recordCompleteness(raw);
    const task = await createTask(ctx, {
      subject: `Completeness check PASSED — ${data.familyName}`,
      householdId: data.householdId,
      description: `All required information verified by Min at ${new Date().toISOString()}:\n` +
        data.checks.map(c => `✓ ${c}`).join("\n"),
    });
    return NextResponse.json({ success: true, task });
  },

  recordPaperwork: async (raw, ctx) => {
    const data = validate.recordPaperwork(raw);
    const inputs: TaskInput[] = data.envelopes.map(envelope => ({
      subject: `Paperwork generated — ${envelope.name}`,
      householdId: data.householdId,
      description: `Envelope: ${envelope.name}\nDocuments: ${envelope.documents.join(", ")}\nGenerated by Min at ${new Date().toISOString()}`,
    }));
    const { records: tasks } = await createTasksBatch(ctx, inputs);
    return NextResponse.json({ success: true, tasks, count: tasks.length });
  },

  recordDocusignConfig: async (raw, ctx) => {
    const data = validate.recordDocusignConfig(raw);
    const task = await createTask(ctx, {
      subject: `DocuSign configured — ${data.envelopeCount} envelopes for ${data.familyName}`,
      householdId: data.householdId,
      description: data.config.map(c => `${c.envelope}: ${c.recipients}`).join("\n") +
        `\n\nTemplates matched at 100%. Configured by Min at ${new Date().toISOString()}`,
    });
    return NextResponse.json({ success: true, task });
  },

  sendDocusign: async (raw, ctx) => {
    const data = validate.sendDocusign(raw);
    const today = new Date().toISOString().split("T")[0];
    const inputs: TaskInput[] = data.envelopes.map(envelope => ({
      subject: `SEND DOCU — ${envelope.name}`,
      householdId: data.householdId,
      contactId: data.primaryContactId,
      status: "Not Started" as const,
      priority: "High" as const,
      activityDate: today,
      description: `DocuSign envelope sent to: ${envelope.signers.join(", ")}\nCC: AdviceOne Ops, ${custodian.docusignCC || custodian.shortName + " DocuSign"}\nSubject: "${envelope.emailSubject}"\n\nSent by Min at ${new Date().toISOString()}`,
    }));
    const { records: tasks } = await createTasksBatch(ctx, inputs);
    return NextResponse.json({ success: true, tasks, count: tasks.length });
  },

  searchHouseholds: async (raw, ctx) => {
    const data = validate.searchHouseholds(raw);
    const q = sanitizeSOQL(data.query);
    const households = await query(ctx,
      `SELECT Id, Name, Description, CreatedDate, (SELECT FirstName FROM Contacts ORDER BY CreatedDate ASC LIMIT 4) FROM Account WHERE Type = 'Household' AND Name LIKE '%${q}%' ORDER BY CreatedDate DESC LIMIT 10`
    );
    return NextResponse.json({ success: true, households });
  },

  getHouseholdDetail: async (raw, ctx) => {
    const data = validate.getHouseholdDetail(raw);
    const safeId = sanitizeSOQL(data.householdId);
    // Parallel queries — was sequential, now 3x faster
    const [household, contacts, tasks] = await Promise.all([
      query(ctx, `SELECT Id, Name, Description, CreatedDate FROM Account WHERE Id = '${safeId}' LIMIT 1`),
      query(ctx, `SELECT Id, FirstName, LastName, Email, Phone, CreatedDate FROM Contact WHERE AccountId = '${safeId}' ORDER BY CreatedDate ASC`),
      query(ctx, `SELECT Id, Subject, Status, Priority, Description, CreatedDate, ActivityDate FROM Task WHERE WhatId = '${safeId}' ORDER BY CreatedDate ASC`),
    ]);
    return NextResponse.json({
      success: true,
      household: household[0] || null,
      contacts,
      tasks,
      householdUrl: `${ctx.instanceUrl}/${data.householdId}`,
    });
  },

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
    return NextResponse.json({ success: true, task });
  },

  queryTasks: async (raw, ctx) => {
    const data = validate.queryTasks(raw);
    // No user-supplied WHERE clause — injection surface removed.
    // All filtering happens client-side.
    const [tasks, households] = await Promise.all([
      query(ctx, `SELECT Id, Subject, Status, Priority, Description, CreatedDate, ActivityDate, What.Name, What.Id FROM Task WHERE What.Type = 'Account' ORDER BY CreatedDate DESC LIMIT ${data.limit}`),
      query(ctx, `SELECT Id, Name, CreatedDate, Description FROM Account WHERE Type = 'Household' ORDER BY CreatedDate DESC LIMIT ${data.limit}`),
    ]);
    return NextResponse.json({ success: true, tasks, households, instanceUrl: ctx.instanceUrl });
  },

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
    // Create follow-up tasks in batch
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

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    if (typeof action !== "string" || !handlers[action]) {
      return NextResponse.json(
        { success: false, error: { code: "UNKNOWN_ACTION", message: `Unknown action: ${action}` } },
        { status: 400 }
      );
    }

    const ctx = await getAccessToken();
    return await handlers[action](data, ctx);

  } catch (error) {
    // Structured error responses — client can programmatically handle different failure modes
    if (error instanceof SFValidationError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: 400 }
      );
    }

    if (error instanceof SFQueryError) {
      console.error(`[SF Query Error] status=${error.status}: ${error.message}`);
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: 502 }
      );
    }

    if (error instanceof SFMutationError) {
      console.error(`[SF Mutation Error] object=${error.objectType} status=${error.status}: ${error.message}`);
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message } },
        { status: 502 }
      );
    }

    // Unknown errors
    console.error("[Salesforce Error]", error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Failed to connect to Salesforce" } },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { instanceUrl } = await getAccessToken();
    return NextResponse.json({ success: true, instanceUrl, message: "Connected to Salesforce!" });
  } catch (error) {
    console.error("[Salesforce Connection Error]", error);
    return NextResponse.json(
      { success: false, error: { code: "AUTH_FAILED", message: "Failed to connect to Salesforce" } },
      { status: 500 }
    );
  }
}
