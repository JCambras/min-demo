import { NextResponse } from "next/server";
import { DEMO_HOUSEHOLDS } from "@/lib/demo-data";

// GET /api/embed/widget?householdId=xxx&theme=light
// Returns a self-contained HTML snippet (mini health ring + score) for iframe embedding.

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const householdId = searchParams.get("householdId");
  const theme = searchParams.get("theme") || "light";

  if (!householdId) {
    return new NextResponse("<p>Missing householdId</p>", {
      status: 400,
      headers: { "Content-Type": "text/html" },
    });
  }

  const hh = DEMO_HOUSEHOLDS.find(h => h.id === householdId);
  if (!hh) {
    return new NextResponse("<p>Household not found</p>", {
      status: 404,
      headers: { "Content-Type": "text/html" },
    });
  }

  const isDark = theme === "dark";
  const bg = isDark ? "#1e293b" : "#ffffff";
  const textColor = isDark ? "#e2e8f0" : "#1e293b";
  const subtextColor = isDark ? "#94a3b8" : "#64748b";
  const ringColor = hh.healthScore >= 80 ? "#22c55e" : hh.healthScore >= 60 ? "#f59e0b" : "#ef4444";
  const ringBg = isDark ? "#334155" : "#e2e8f0";

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Min Health Score</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: ${bg}; padding: 16px; }
    .widget { display: flex; align-items: center; gap: 16px; }
    .ring-container { position: relative; width: 64px; height: 64px; flex-shrink: 0; }
    .ring-container svg { transform: rotate(-90deg); }
    .ring-score { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: 700; color: ${textColor}; }
    .info h3 { font-size: 14px; font-weight: 600; color: ${textColor}; margin-bottom: 2px; }
    .info p { font-size: 11px; color: ${subtextColor}; }
    .status { display: inline-block; font-size: 10px; font-weight: 600; padding: 2px 8px; border-radius: 12px; margin-top: 4px; }
    .on-track { background: #dcfce7; color: #166534; }
    .needs-attention { background: #fef3c7; color: #92400e; }
    .at-risk { background: #fee2e2; color: #991b1b; }
  </style>
</head>
<body>
  <div class="widget">
    <div class="ring-container">
      <svg width="64" height="64" viewBox="0 0 64 64">
        <circle cx="32" cy="32" r="28" fill="none" stroke="${ringBg}" stroke-width="6"/>
        <circle cx="32" cy="32" r="28" fill="none" stroke="${ringColor}" stroke-width="6"
          stroke-dasharray="${(hh.healthScore / 100) * 175.9} 175.9"
          stroke-linecap="round"/>
      </svg>
      <div class="ring-score">${hh.healthScore}</div>
    </div>
    <div class="info">
      <h3>${hh.name.replace(" Household", "")}</h3>
      <p>$${(hh.aum / 1_000_000).toFixed(1)}M AUM · ${hh.advisor}</p>
      <span class="status ${hh.status}">${hh.status === "on-track" ? "On Track" : hh.status === "needs-attention" ? "Needs Attention" : "At Risk"}</span>
    </div>
  </div>
</body>
</html>`;

  return new NextResponse(html, {
    headers: {
      "Content-Type": "text/html",
      "Access-Control-Allow-Origin": "*",
    },
  });
}
