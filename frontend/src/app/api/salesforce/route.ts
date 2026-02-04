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

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, data } = body;

    const { accessToken, instanceUrl } = await getAccessToken();

    if (action === "createContact") {
      const response = await fetch(
        `${instanceUrl}/services/data/v59.0/sobjects/Contact`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            FirstName: data.firstName,
            LastName: data.lastName,
            Email: data.email,
            Phone: data.phone,
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result[0]?.message || "Failed to create contact");
      }

      return NextResponse.json({
        success: true,
        id: result.id,
        url: `${instanceUrl}/${result.id}`,
      });
    }

    if (action === "createHousehold") {
      const response = await fetch(
        `${instanceUrl}/services/data/v59.0/sobjects/Account`,
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            Name: data.name,
            Type: "Household",
          }),
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result[0]?.message || "Failed to create household");
      }

      return NextResponse.json({
        success: true,
        id: result.id,
        url: `${instanceUrl}/${result.id}`,
      });
    }

    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    console.error("Salesforce error:", error);
    return NextResponse.json(
      { error: "Failed to connect to Salesforce" },
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
