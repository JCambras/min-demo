import { NextResponse } from "next/server";

async function getAccessToken() {
  const params = new URLSearchParams();
  params.append("grant_type", "client_credentials");
  params.append("client_id", process.env.SALESFORCE_CLIENT_ID!);
  params.append("client_secret", process.env.SALESFORCE_CLIENT_SECRET!);

  const response = await fetch(
    "https://orgfarm-ebd962788a-dev-ed.develop.my.salesforce.com/services/oauth2/token",
    {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params,
    }
  );

  const data = await response.json();

  if (!response.ok) {
    console.error("Token error:", data);
    throw new Error(data.error_description || "Failed to get access token");
  }

  return {
    accessToken: data.access_token,
    instanceUrl: data.instance_url,
  };
}

async function createRecord(
  accessToken: string,
  instanceUrl: string,
  objectType: string,
  data: Record<string, unknown>
) {
  const response = await fetch(
    `${instanceUrl}/services/data/v59.0/sobjects/${objectType}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new Error(result[0]?.message || `Failed to create ${objectType}`);
  }

  return {
    id: result.id,
    url: `${instanceUrl}/${result.id}`,
  };
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    const { accessToken, instanceUrl } = await getAccessToken();

    // Create a single contact
    if (action === "createContact") {
      const result = await createRecord(accessToken, instanceUrl, "Contact", {
        FirstName: data.firstName,
        LastName: data.lastName,
        Email: data.email,
        Phone: data.phone,
        AccountId: data.accountId || null,
      });

      return NextResponse.json({ success: true, ...result });
    }

    // Create a household (Account)
    if (action === "createHousehold") {
      const result = await createRecord(accessToken, instanceUrl, "Account", {
        Name: data.name,
        Type: "Household",
      });

      return NextResponse.json({ success: true, ...result });
    }

    // Create a task
    if (action === "createTask") {
      const result = await createRecord(accessToken, instanceUrl, "Task", {
        Subject: data.subject,
        WhoId: data.contactId,
        Status: "Not Started",
        Priority: data.priority || "Normal",
        ActivityDate: data.dueDate || null,
        Description: data.description || null,
      });

      return NextResponse.json({ success: true, ...result });
    }

    // Create entire family (household + contacts + tasks)
    if (action === "createFamily") {
      const results: Record<string, unknown> = {};

      // 1. Create household
      const household = await createRecord(accessToken, instanceUrl, "Account", {
        Name: `${data.familyName} Household`,
        Type: "Household",
      });
      results.household = household;

      // 2. Create contacts
      const contacts = [];
      for (const member of data.members) {
        const contact = await createRecord(accessToken, instanceUrl, "Contact", {
          FirstName: member.firstName,
          LastName: member.lastName,
          Email: member.email,
          Phone: member.phone,
          AccountId: household.id,
        });
        contacts.push({ ...contact, name: `${member.firstName} ${member.lastName}` });
      }
      results.contacts = contacts;

      // 3. Create tasks for primary contact
      const primaryContact = contacts[0];
      const tasks = [];
      
      const taskList = [
        { subject: "Schedule introductory meeting", priority: "High" },
        { subject: "Review signed documents", priority: "Normal" },
        { subject: "Set up portfolio accounts", priority: "Normal" },
      ];

      for (const taskData of taskList) {
        const task = await createRecord(accessToken, instanceUrl, "Task", {
          Subject: taskData.subject,
          WhoId: primaryContact.id,
          Status: "Not Started",
          Priority: taskData.priority,
        });
        tasks.push({ ...task, subject: taskData.subject });
      }
      results.tasks = tasks;

      return NextResponse.json({ success: true, ...results });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Salesforce error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to connect to Salesforce" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { accessToken, instanceUrl } = await getAccessToken();
    return NextResponse.json({
      success: true,
      instanceUrl: instanceUrl,
      message: "Connected to Salesforce!",
    });
  } catch (error) {
    console.error("Salesforce error:", error);
    return NextResponse.json(
      { error: "Failed to connect to Salesforce" },
      { status: 500 }
    );
  }
}
