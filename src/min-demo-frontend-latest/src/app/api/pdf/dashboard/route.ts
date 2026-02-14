import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { healthScore, healthBreakdown, advisors, pipeline, risks, weeklyComparison, totalHouseholds, openTasks, complianceReviews, unsigned, firmName } = body;

    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentWidth = pw - 2 * margin;
    let y = 0;

    const centerText = (text: string, yPos: number, size: number = 12) => {
      doc.setFontSize(size);
      const tw = doc.getTextWidth(text);
      doc.text(text, (pw - tw) / 2, yPos);
    };

    const drawBar = (x: number, yPos: number, width: number, pct: number, color: [number, number, number]) => {
      doc.setFillColor(240, 240, 244);
      doc.roundedRect(x, yPos, width, 4, 2, 2, "F");
      doc.setFillColor(...color);
      doc.roundedRect(x, yPos, width * Math.min(pct / 100, 1), 4, 2, 2, "F");
    };

    // ═══ PAGE 1: Cover + Health Score ═══
    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pw, 65, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    if (firmName) {
      centerText(firmName.toUpperCase(), 20, 14);
      centerText("WEEKLY OPERATIONS REPORT", 32, 16);
    } else {
      centerText("PRACTICE INTELLIGENCE REPORT", 25, 18);
    }
    doc.setFont("helvetica", "normal");
    centerText(`Generated ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}`, firmName ? 42 : 35, 10);
    centerText("Powered by Min", firmName ? 52 : 45, 9);

    doc.setTextColor(30, 41, 59);
    y = 80;

    // Health Score
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Practice Health Score", margin, y);

    const scoreColor: [number, number, number] = healthScore >= 80 ? [34, 197, 94] : healthScore >= 60 ? [245, 158, 11] : [239, 68, 68];
    doc.setFontSize(48);
    doc.setTextColor(...scoreColor);
    doc.text(`${healthScore}`, pw - margin - 30, y + 5);
    doc.setFontSize(10);
    doc.text("/100", pw - margin - 30 + doc.getTextWidth(`${healthScore}`) + 2, y + 5);

    doc.setTextColor(30, 41, 59);
    y += 15;

    // Breakdown bars
    for (const b of healthBreakdown || []) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(b.label, margin, y);
      doc.text(`${b.score}% (${b.weight}% weight)`, pw - margin - 50, y);
      const barColor: [number, number, number] = b.score >= 80 ? [34, 197, 94] : b.score >= 60 ? [245, 158, 11] : [239, 68, 68];
      drawBar(margin, y + 3, contentWidth, b.score, barColor);
      y += 14;
    }

    // Quick stats
    y += 10;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pw - margin, y);
    y += 12;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Summary", margin, y);
    y += 10;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    const summaryItems = [
      `Total Households: ${totalHouseholds}`,
      `Open Tasks: ${openTasks}`,
      `Compliance Reviews: ${complianceReviews}`,
      `Unsigned Envelopes: ${unsigned}`,
    ];
    for (const item of summaryItems) {
      doc.text(item, margin, y);
      y += 8;
    }

    // ═══ Weekly Comparison ═══
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Weekly Comparison", margin, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("METRIC", margin, y);
    doc.text("THIS WEEK", margin + 80, y);
    doc.text("LAST WEEK", margin + 110, y);
    doc.text("CHANGE", margin + 140, y);
    y += 6;

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const w of weeklyComparison || []) {
      doc.text(w.label, margin, y);
      doc.text(`${w.thisWeek}`, margin + 85, y);
      doc.text(`${w.lastWeek}`, margin + 115, y);
      const diff = w.thisWeek - w.lastWeek;
      const sign = diff > 0 ? "+" : "";
      if (diff > 0) doc.setTextColor(34, 197, 94);
      else if (diff < 0) doc.setTextColor(239, 68, 68);
      else doc.setTextColor(148, 163, 184);
      doc.text(`${sign}${diff}`, margin + 145, y);
      doc.setTextColor(30, 41, 59);
      y += 8;
    }

    // ═══ PAGE 2: Advisor Scoreboard ═══
    doc.addPage();
    y = 25;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Advisor Scoreboard", margin, y);
    y += 12;

    // Table header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    const cols = [margin, margin + 45, margin + 72, margin + 92, margin + 112, margin + 135, margin + 155];
    doc.text("ADVISOR", cols[0], y);
    doc.text("HH", cols[1], y);
    doc.text("OPEN", cols[2], y);
    doc.text("OVERDUE", cols[3], y);
    doc.text("UNSIGNED", cols[4], y);
    doc.text("COMP %", cols[5], y);
    doc.text("SCORE", cols[6], y);
    y += 3;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, y, pw - margin, y);
    y += 6;

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const a of advisors || []) {
      doc.text(a.name, cols[0], y);
      doc.text(`${a.households}`, cols[1], y);
      doc.text(`${a.openTasks}`, cols[2], y);
      if (a.overdueTasks > 0) doc.setTextColor(239, 68, 68);
      doc.text(`${a.overdueTasks}`, cols[3], y);
      doc.setTextColor(30, 41, 59);
      if (a.unsigned > 0) doc.setTextColor(37, 99, 235);
      doc.text(`${a.unsigned}`, cols[4], y);
      doc.setTextColor(30, 41, 59);
      doc.text(`${a.compliancePct}%`, cols[5], y);
      const sc: [number, number, number] = a.score >= 80 ? [34, 197, 94] : a.score >= 60 ? [245, 158, 11] : [239, 68, 68];
      doc.setTextColor(...sc);
      doc.text(`${a.score}`, cols[6], y);
      doc.setTextColor(30, 41, 59);
      y += 10;
    }

    // Pipeline
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Client Pipeline", margin, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const stage of pipeline || []) {
      const stuckLabel = stage.stuck > 0 ? ` (${stage.stuck} stuck)` : "";
      doc.text(`${stage.label}: ${stage.count}${stuckLabel}`, margin, y);
      const barW = contentWidth * 0.6;
      const maxC = Math.max(...(pipeline || []).map((s: { count: number }) => s.count), 1);
      const pct = stage.count / maxC * 100;
      const barColor: [number, number, number] = stage.stuck > 0 ? [245, 158, 11] : [148, 163, 184];
      drawBar(margin + 60, y - 3, barW, pct, barColor);
      y += 10;
    }

    // Risk Radar
    y += 10;
    if (y > ph - 60) { doc.addPage(); y = 25; }
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.text("Risk Radar", margin, y);
    y += 12;

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const r of risks || []) {
      if (y > ph - 20) { doc.addPage(); y = 25; }
      const sevColor: [number, number, number] = r.severity === "critical" ? [239, 68, 68] : r.severity === "high" ? [245, 158, 11] : [148, 163, 184];
      doc.setTextColor(...sevColor);
      doc.setFont("helvetica", "bold");
      doc.text(`[${r.severity.toUpperCase()}]`, margin, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "normal");
      doc.text(`${r.household} — ${r.label} (${r.daysStale}d)`, margin + 28, y);
      y += 8;
    }

    // Footer on last page
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    centerText("This report was generated by Min Practice Intelligence. Data sourced from Salesforce.", ph - 15, 8);

    // Generate
    const pdfData = doc.output("datauristring");
    const filename = `Practice-Report-${new Date().toISOString().split("T")[0]}.pdf`;

    return NextResponse.json({ success: true, pdf: pdfData, filename });
  } catch (error) {
    return NextResponse.json({ success: false, error: error instanceof Error ? error.message : "PDF generation failed" }, { status: 500 });
  }
}
