import { NextResponse } from "next/server";
import { DEMO_HOUSEHOLDS } from "@/lib/demo-data";

// GET /api/embed/health?householdId=xxx
// Returns JSON health data for Salesforce Lightning Web Component embedding.
// Authenticated via Bearer token. CORS headers for Salesforce domain.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const householdId = searchParams.get("householdId");

  // CORS headers for Salesforce embedding
  const headers = {
    "Access-Control-Allow-Origin": "*.lightning.force.com",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Access-Control-Allow-Headers": "Authorization, Content-Type",
  };

  if (!householdId) {
    return NextResponse.json({ error: "householdId is required" }, { status: 400, headers });
  }

  // Bearer token auth (placeholder — in production, validate JWT)
  const auth = request.headers.get("authorization");
  if (!auth || !auth.startsWith("Bearer ")) {
    return NextResponse.json({ error: "Unauthorized — Bearer token required" }, { status: 401, headers });
  }

  // Look up demo household data
  const hh = DEMO_HOUSEHOLDS.find(h => h.id === householdId);
  if (!hh) {
    return NextResponse.json({ error: "Household not found" }, { status: 404, headers });
  }

  // Compute data quality
  let dataQualityScore = 100;
  const dataQualityFlags: string[] = [];
  if (hh.healthScore < 60) { dataQualityScore -= 20; dataQualityFlags.push("Low health score"); }
  if (hh.breakdown.find(b => b.label === "Compliance Coverage")?.score === 0) {
    dataQualityScore -= 20; dataQualityFlags.push("No compliance review");
  }
  if (hh.breakdown.find(b => b.label === "Meeting Coverage (90d)")?.score === 0) {
    dataQualityScore -= 15; dataQualityFlags.push("No recent meetings");
  }

  return NextResponse.json({
    healthScore: hh.healthScore,
    breakdown: hh.breakdown.map(b => ({ label: b.label, score: b.score, weight: b.weight })),
    suggestedActions: hh.suggestedActions.map(a => ({ label: a.label, detail: a.detail, category: a.category })),
    dataQuality: { score: Math.max(0, dataQualityScore), flags: dataQualityFlags },
    status: hh.status,
    aum: hh.aum,
    advisor: hh.advisor,
  }, { headers });
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      "Access-Control-Allow-Origin": "*.lightning.force.com",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Access-Control-Allow-Headers": "Authorization, Content-Type",
    },
  });
}
