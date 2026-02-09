import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/sf-connection";
import { custodian } from "@/lib/custodian";

async function queryRecords(accessToken: string, instanceUrl: string, soql: string) {
  const response = await fetch(
    `${instanceUrl}/services/data/v59.0/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const result = await response.json();
  if (!response.ok) throw new Error(result[0]?.message || "Query failed");
  return result.records || [];
}

async function createRecord(
  accessToken: string,
  instanceUrl: string,
  objectType: string,
  data: Record<string, unknown>,
  allowDuplicates = false
) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${accessToken}`,
    "Content-Type": "application/json",
  };
  if (allowDuplicates) {
    headers["Sforce-Duplicate-Rule-Header"] = "allowSave=true";
  }

  const response = await fetch(
    `${instanceUrl}/services/data/v59.0/sobjects/${objectType}`,
    { method: "POST", headers, body: JSON.stringify(data) }
  );

  const result = await response.json();
  if (!response.ok) {
    const errorMsg = result[0]?.message || "";
    throw new Error(errorMsg || `Failed to create ${objectType}`);
  }

  return { id: result.id, url: `${instanceUrl}/${result.id}` };
}

async function updateRecord(
  accessToken: string,
  instanceUrl: string,
  objectType: string,
  recordId: string,
  data: Record<string, unknown>
) {
  const response = await fetch(
    `${instanceUrl}/services/data/v59.0/sobjects/${objectType}/${recordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const result = await response.json();
    throw new Error(result[0]?.message || `Failed to update ${objectType}`);
  }

  return { id: recordId, url: `${instanceUrl}/${recordId}` };
}

// ─── Handler Map ─────────────────────────────────────────────────────────────
type SFCtx = { accessToken: string; instanceUrl: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Handler = (data: any, ctx: SFCtx) => Promise<NextResponse>;

function safeSOQL(input: string): string {
  return (input || "").replace(/'/g, "\\'").replace(/[%_]/g, "");
}

const handlers: Record<string, Handler> = {
  searchContacts: async (data, { accessToken, instanceUrl }) => {
    const q = safeSOQL(data.query);
    const contacts = await queryRecords(accessToken, instanceUrl,
      `SELECT Id, FirstName, LastName, Email, Phone, Account.Name FROM Contact WHERE FirstName LIKE '%${q}%' OR LastName LIKE '%${q}%' OR Email LIKE '%${q}%' OR Account.Name LIKE '%${q}%' ORDER BY LastName ASC LIMIT 10`
    );
    return NextResponse.json({ success: true, contacts });
  },

  confirmIntent: async (data, { accessToken, instanceUrl }) => {
    const safeName = safeSOQL(data.familyName);
    const existing = await queryRecords(accessToken, instanceUrl,
      `SELECT Id, Name FROM Account WHERE Name = '${safeName} Household' AND Type = 'Household' ORDER BY CreatedDate DESC LIMIT 1`
    );
    if (existing.length > 0 && !data.force) {
      return NextResponse.json({ success: false, isDuplicate: true, existingId: existing[0].Id, existingUrl: `${instanceUrl}/${existing[0].Id}`, error: `${data.familyName} Household already exists. Click "Create Anyway" to proceed.` });
    }
    const household = await createRecord(accessToken, instanceUrl, "Account", { Name: `${data.familyName} Household`, Type: "Household", Description: `Account opening initiated by Min.\nAccounts planned: ${data.accounts.map((a: Record<string, string>) => `${a.type} (${a.owner})`).join(", ")}` }, true);
    const contacts = [];
    for (const member of data.members) {
      const contact = await createRecord(accessToken, instanceUrl, "Contact", { FirstName: member.firstName, LastName: member.lastName, Email: member.email, Phone: member.phone, AccountId: household.id }, true);
      contacts.push({ ...contact, name: `${member.firstName} ${member.lastName}` });
    }
    return NextResponse.json({ success: true, household, contacts });
  },

  recordFunding: async (data, { accessToken, instanceUrl }) => {
    const note = `FUNDING DETAILS (recorded by Min at ${new Date().toLocaleString()}):\n` + data.fundingDetails.map((f: Record<string, string>) => `• ${f.account}: ${f.detail}`).join("\n") + `\n\nPTE Required: ${data.pteRequired ? "YES — auto-generated" : "No"}`;
    // Append to existing description instead of overwriting
    const existing = await queryRecords(accessToken, instanceUrl, `SELECT Description FROM Account WHERE Id = '${data.householdId}' LIMIT 1`);
    const prevDesc = existing[0]?.Description || "";
    const fullDesc = prevDesc ? `${prevDesc}\n\n───────────────────\n\n${note}` : note;
    await updateRecord(accessToken, instanceUrl, "Account", data.householdId, { Description: fullDesc });
    const task = await createRecord(accessToken, instanceUrl, "Task", { Subject: `Funding configured — ${data.familyName} (${data.fundingDetails.length} accounts)`, WhatId: data.householdId, Status: "Completed", Priority: "Normal", Description: note });
    return NextResponse.json({ success: true, task, householdUrl: `${instanceUrl}/${data.householdId}` });
  },

  recordMoneyLink: async (data, { accessToken, instanceUrl }) => {
    const task = await createRecord(accessToken, instanceUrl, "Task", { Subject: `MoneyLink setup — ${data.bankName} (****${data.lastFour})`, WhatId: data.householdId, Status: "Completed", Priority: "Normal", Description: `Bank: ${data.bankName}\nRouting: ****${data.routingLastFour}\nAccount: ****${data.lastFour}\nRecorded by Min at ${new Date().toLocaleString()}` });
    return NextResponse.json({ success: true, task });
  },

  recordBeneficiaries: async (data, { accessToken, instanceUrl }) => {
    const task = await createRecord(accessToken, instanceUrl, "Task", { Subject: `Beneficiary designations prefilled — ${data.familyName}`, WhatId: data.householdId, Status: "Completed", Priority: "Normal", Description: data.designations.map((d: Record<string, string>) => `• ${d.account}: ${d.beneficiary}`).join("\n") + `\n\nPrefilled by Min using ownership rules. Advisor reviewed at ${new Date().toLocaleString()}` });
    return NextResponse.json({ success: true, task });
  },

  recordCompleteness: async (data, { accessToken, instanceUrl }) => {
    const task = await createRecord(accessToken, instanceUrl, "Task", { Subject: `Completeness check PASSED — ${data.familyName}`, WhatId: data.householdId, Status: "Completed", Priority: "Normal", Description: `All required information verified by Min at ${new Date().toLocaleString()}:\n` + data.checks.map((c: string) => `✓ ${c}`).join("\n") });
    return NextResponse.json({ success: true, task });
  },

  recordPaperwork: async (data, { accessToken, instanceUrl }) => {
    const tasks = [];
    for (const envelope of data.envelopes) {
      const task = await createRecord(accessToken, instanceUrl, "Task", { Subject: `Paperwork generated — ${envelope.name}`, WhatId: data.householdId, Status: "Completed", Priority: "Normal", Description: `Envelope: ${envelope.name}\nDocuments: ${envelope.documents.join(", ")}\nGenerated by Min at ${new Date().toLocaleString()}` });
      tasks.push({ ...task, name: envelope.name });
    }
    return NextResponse.json({ success: true, tasks, count: tasks.length });
  },

  recordDocusignConfig: async (data, { accessToken, instanceUrl }) => {
    const task = await createRecord(accessToken, instanceUrl, "Task", { Subject: `DocuSign configured — ${data.envelopeCount} envelopes for ${data.familyName}`, WhatId: data.householdId, Status: "Completed", Priority: "Normal", Description: data.config.map((c: Record<string, string>) => `${c.envelope}: ${c.recipients}`).join("\n") + `\n\nTemplates matched at 100%. Configured by Min at ${new Date().toLocaleString()}` });
    return NextResponse.json({ success: true, task });
  },

  sendDocusign: async (data, { accessToken, instanceUrl }) => {
    const tasks = [];
    const today = new Date().toISOString().split("T")[0];
    for (const envelope of data.envelopes) {
      const task = await createRecord(accessToken, instanceUrl, "Task", { Subject: `SEND DOCU — ${envelope.name}`, WhatId: data.householdId, WhoId: data.primaryContactId, Status: "Not Started", Priority: "High", ActivityDate: today, Description: `DocuSign envelope sent to: ${envelope.signers.join(", ")}\nCC: AdviceOne Ops, ${custodian.docusignCC || custodian.shortName + " DocuSign"}\nSubject: "${envelope.emailSubject}"\n\nSent by Min at ${new Date().toLocaleString()}` });
      tasks.push({ ...task, name: envelope.name });
    }
    return NextResponse.json({ success: true, tasks, count: tasks.length });
  },

  searchHouseholds: async (data, { accessToken, instanceUrl }) => {
    const q = safeSOQL(data.query);
    const households = await queryRecords(accessToken, instanceUrl,
      `SELECT Id, Name, Description, CreatedDate FROM Account WHERE Type = 'Household' AND Name LIKE '%${q}%' ORDER BY CreatedDate DESC LIMIT 10`
    );
    return NextResponse.json({ success: true, households });
  },

  getHouseholdDetail: async (data, { accessToken, instanceUrl }) => {
    // Get household
    const household = await queryRecords(accessToken, instanceUrl,
      `SELECT Id, Name, Description, CreatedDate FROM Account WHERE Id = '${safeSOQL(data.householdId)}' LIMIT 1`
    );
    // Get contacts
    const contacts = await queryRecords(accessToken, instanceUrl,
      `SELECT Id, FirstName, LastName, Email, Phone, CreatedDate FROM Contact WHERE AccountId = '${safeSOQL(data.householdId)}' ORDER BY CreatedDate ASC`
    );
    // Get all tasks (completed and open)
    const tasks = await queryRecords(accessToken, instanceUrl,
      `SELECT Id, Subject, Status, Priority, Description, CreatedDate, ActivityDate FROM Task WHERE WhatId = '${safeSOQL(data.householdId)}' ORDER BY CreatedDate ASC`
    );
    return NextResponse.json({
      success: true,
      household: household[0] || null,
      contacts,
      tasks,
      householdUrl: `${instanceUrl}/${data.householdId}`,
    });
  },

  recordComplianceReview: async (data, { accessToken, instanceUrl }) => {
    const task = await createRecord(accessToken, instanceUrl, "Task", {
      Subject: `COMPLIANCE REVIEW ${data.passed ? "PASSED" : "FLAGGED"} — ${data.familyName}`,
      WhatId: data.householdId,
      Status: "Completed",
      Priority: data.passed ? "Normal" : "High",
      Description: `Compliance review conducted by Min at ${new Date().toLocaleString()}\n\n` +
        `Result: ${data.passed ? "ALL CHECKS PASSED" : `${data.failCount} ITEMS REQUIRE ATTENTION`}\n\n` +
        `${data.checks.map((c: { label: string; status: string; detail: string }) => `${c.status === "pass" ? "✓" : c.status === "warn" ? "⚠" : "✗"} ${c.label}: ${c.detail}`).join("\n")}\n\n` +
        `Reviewed by: ${data.reviewerName || "Advisor"}\nNext review due: ${data.nextReviewDate || "90 days"}`,
    });
    return NextResponse.json({ success: true, task });
  },
};

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;
    const ctx = await getAccessToken();

    const handler = handlers[action];
    if (!handler) {
      return NextResponse.json({ success: false, error: `Unknown action: ${action}` }, { status: 400 });
    }

    return await handler(data, ctx);
  } catch (error) {
    console.error("Salesforce error:", error);
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : "Failed to connect to Salesforce" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { instanceUrl } = await getAccessToken();
    return NextResponse.json({ success: true, instanceUrl, message: "Connected to Salesforce!" });
  } catch (error) {
    console.error("Salesforce error:", error);
    return NextResponse.json({ error: "Failed to connect to Salesforce" }, { status: 500 });
  }
}
