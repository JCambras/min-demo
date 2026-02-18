import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

interface OpsCategory {
  label: string;
  count: number;
  urgent: number;
  estMinutes: number;
}

interface RiskInput {
  label: string;
  household: string;
  severity: string;
  category: string;
  daysStale: number;
}

interface AdvisorInput {
  name: string;
  households: number;
  openTasks: number;
  overdueTasks: number;
  unsigned: number;
  compliancePct: number;
  score: number;
}

interface WeeklyInput {
  label: string;
  thisWeek: number;
  lastWeek: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      firmName,
      reportDate,
      healthScore,
      healthBreakdown,
      categories,
      totalItems,
      totalUrgent,
      totalHours,
      capacityPct,
      risks,
      advisors,
      weeklyComparison,
      totalHouseholds,
      openTasks,
      completedTasks,
      complianceReviews,
      unsigned,
    }: {
      firmName?: string;
      reportDate: string;
      healthScore: number;
      healthBreakdown: { label: string; score: number; weight: number }[];
      categories: OpsCategory[];
      totalItems: number;
      totalUrgent: number;
      totalHours: number;
      capacityPct: number;
      risks: RiskInput[];
      advisors: AdvisorInput[];
      weeklyComparison: WeeklyInput[];
      totalHouseholds: number;
      openTasks: number;
      completedTasks: number;
      complianceReviews: number;
      unsigned: number;
    } = body;

    const doc = new jsPDF();
    const pw = doc.internal.pageSize.getWidth();
    const ph = doc.internal.pageSize.getHeight();
    const margin = 20;
    const contentW = pw - margin * 2;
    let y = 0;

    // ─── Helpers ─────────────────────────────────────────────────────────────

    const drawLine = (yPos: number, color = [220, 220, 220]) => {
      doc.setDrawColor(color[0], color[1], color[2]);
      doc.setLineWidth(0.3);
      doc.line(margin, yPos, pw - margin, yPos);
    };

    const checkPageBreak = (needed: number) => {
      if (y + needed > ph - 30) {
        doc.setFontSize(7);
        doc.setTextColor(160);
        doc.text(`${firmName || "Min"} — Monthly Operations Report — Page ${doc.getNumberOfPages()}`, margin, ph - 12);
        doc.text(`Generated ${reportDate}`, pw - margin, ph - 12, { align: "right" });
        doc.addPage();
        y = 25;
      }
    };

    const drawBar = (x: number, yPos: number, width: number, pct: number, color: [number, number, number]) => {
      doc.setFillColor(240, 240, 244);
      doc.roundedRect(x, yPos, width, 4, 2, 2, "F");
      doc.setFillColor(...color);
      doc.roundedRect(x, yPos, width * Math.min(pct / 100, 1), 4, 2, 2, "F");
    };

    // ─── Cover / Header ─────────────────────────────────────────────────────

    doc.setFillColor(15, 23, 42);
    doc.rect(0, 0, pw, 55, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    if (firmName) {
      doc.setFontSize(12);
      doc.text(firmName.toUpperCase(), pw / 2, 18, { align: "center" });
    }
    doc.setFontSize(16);
    doc.text("MONTHLY OPERATIONS REPORT", pw / 2, firmName ? 30 : 22, { align: "center" });
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(reportDate, pw / 2, firmName ? 40 : 32, { align: "center" });
    doc.setFontSize(8);
    doc.text("Powered by Min", pw / 2, firmName ? 48 : 40, { align: "center" });

    // ─── Health Score ─────────────────────────────────────────────────────

    y = 70;
    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text("Practice Health Score", margin, y);

    const scoreColor: [number, number, number] = healthScore >= 80 ? [34, 197, 94] : healthScore >= 60 ? [245, 158, 11] : [239, 68, 68];
    doc.setFontSize(36);
    doc.setTextColor(...scoreColor);
    doc.text(`${healthScore}`, pw - margin, y, { align: "right" });

    y += 12;
    doc.setTextColor(30, 41, 59);
    for (const b of healthBreakdown || []) {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.text(b.label, margin, y);
      doc.text(`${b.score}%`, margin + contentW * 0.55, y);
      const barColor: [number, number, number] = b.score >= 80 ? [34, 197, 94] : b.score >= 60 ? [245, 158, 11] : [239, 68, 68];
      drawBar(margin + contentW * 0.6, y - 3, contentW * 0.4, b.score, barColor);
      y += 10;
    }

    // ─── Quick Stats ──────────────────────────────────────────────────────

    y += 6;
    drawLine(y);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Practice Summary", margin, y);
    y += 8;

    const statPairs = [
      ["Total Households", `${totalHouseholds}`],
      ["Open Tasks", `${openTasks}`],
      ["Completed Tasks", `${completedTasks}`],
      ["Compliance Reviews", `${complianceReviews}`],
      ["Unsigned Envelopes", `${unsigned}`],
    ];
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const [label, val] of statPairs) {
      doc.setTextColor(100);
      doc.text(label, margin, y);
      doc.setTextColor(30, 41, 59);
      doc.setFont("helvetica", "bold");
      doc.text(val, margin + 60, y);
      doc.setFont("helvetica", "normal");
      y += 7;
    }

    // ─── Operations Workload ──────────────────────────────────────────────

    y += 8;
    drawLine(y);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.setTextColor(30, 41, 59);
    doc.text("Operations Workload", margin, y);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100);
    doc.text(`${totalItems} items | ${totalUrgent} urgent | ~${totalHours}h estimated | ${capacityPct}% daily capacity`, margin + 55, y);
    y += 10;

    // Capacity bar
    const capColor: [number, number, number] = capacityPct >= 80 ? [239, 68, 68] : capacityPct >= 50 ? [245, 158, 11] : [34, 197, 94];
    drawBar(margin, y, contentW, capacityPct, capColor);
    y += 10;

    // Category rows
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("CATEGORY", margin, y);
    doc.text("COUNT", margin + contentW * 0.5, y);
    doc.text("URGENT", margin + contentW * 0.63, y);
    doc.text("EST. TIME", margin + contentW * 0.78, y);
    y += 6;

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const cat of categories || []) {
      if (cat.count === 0) continue;
      doc.text(cat.label, margin, y);
      doc.text(`${cat.count}`, margin + contentW * 0.52, y);
      if (cat.urgent > 0) doc.setTextColor(239, 68, 68);
      doc.text(`${cat.urgent}`, margin + contentW * 0.67, y);
      doc.setTextColor(30, 41, 59);
      doc.text(`${cat.estMinutes} min`, margin + contentW * 0.8, y);
      y += 8;
    }

    // ─── Weekly Comparison ──────────────────────────────────────────────

    y += 8;
    checkPageBreak(60);
    drawLine(y);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Weekly Comparison", margin, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    doc.text("METRIC", margin, y);
    doc.text("THIS WEEK", margin + 70, y);
    doc.text("LAST WEEK", margin + 100, y);
    doc.text("CHANGE", margin + 130, y);
    y += 6;

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const w of weeklyComparison || []) {
      doc.text(w.label, margin, y);
      doc.text(`${w.thisWeek}`, margin + 75, y);
      doc.text(`${w.lastWeek}`, margin + 105, y);
      const diff = w.thisWeek - w.lastWeek;
      const sign = diff > 0 ? "+" : "";
      if (diff > 0) doc.setTextColor(34, 197, 94);
      else if (diff < 0) doc.setTextColor(239, 68, 68);
      else doc.setTextColor(148, 163, 184);
      doc.text(`${sign}${diff}`, margin + 135, y);
      doc.setTextColor(30, 41, 59);
      y += 8;
    }

    // ─── Advisor Scoreboard ──────────────────────────────────────────────

    checkPageBreak(40 + (advisors || []).length * 10);
    y += 8;
    drawLine(y);
    y += 10;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Advisor Scoreboard", margin, y);
    y += 10;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(148, 163, 184);
    const acols = [margin, margin + 42, margin + 62, margin + 82, margin + 104, margin + 126, margin + 148];
    doc.text("ADVISOR", acols[0], y);
    doc.text("HH", acols[1], y);
    doc.text("OPEN", acols[2], y);
    doc.text("OVERDUE", acols[3], y);
    doc.text("UNSIGNED", acols[4], y);
    doc.text("COMP %", acols[5], y);
    doc.text("SCORE", acols[6], y);
    y += 6;

    doc.setTextColor(30, 41, 59);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    for (const a of advisors || []) {
      checkPageBreak(12);
      doc.text(a.name.length > 18 ? a.name.slice(0, 17) + "..." : a.name, acols[0], y);
      doc.text(`${a.households}`, acols[1], y);
      doc.text(`${a.openTasks}`, acols[2], y);
      if (a.overdueTasks > 0) doc.setTextColor(239, 68, 68);
      doc.text(`${a.overdueTasks}`, acols[3], y);
      doc.setTextColor(30, 41, 59);
      if (a.unsigned > 0) doc.setTextColor(37, 99, 235);
      doc.text(`${a.unsigned}`, acols[4], y);
      doc.setTextColor(30, 41, 59);
      doc.text(`${a.compliancePct}%`, acols[5], y);
      const sc: [number, number, number] = a.score >= 80 ? [34, 197, 94] : a.score >= 60 ? [245, 158, 11] : [239, 68, 68];
      doc.setTextColor(...sc);
      doc.text(`${a.score}`, acols[6], y);
      doc.setTextColor(30, 41, 59);
      y += 9;
    }

    // ─── Risk Radar ─────────────────────────────────────────────────────

    if ((risks || []).length > 0) {
      checkPageBreak(30);
      y += 8;
      drawLine(y);
      y += 10;
      doc.setFont("helvetica", "bold");
      doc.setFontSize(11);
      doc.text(`Risk Radar (${risks.length} items)`, margin, y);
      y += 10;

      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      for (const r of risks.slice(0, 15)) {
        checkPageBreak(10);
        const sevColor: [number, number, number] = r.severity === "critical" ? [239, 68, 68] : r.severity === "high" ? [245, 158, 11] : [148, 163, 184];
        doc.setTextColor(...sevColor);
        doc.setFont("helvetica", "bold");
        doc.text(`[${r.severity.toUpperCase()}]`, margin, y);
        doc.setTextColor(30, 41, 59);
        doc.setFont("helvetica", "normal");
        const riskText = doc.splitTextToSize(`${r.household} — ${r.label} (${r.daysStale}d)`, contentW - 30);
        doc.text(riskText, margin + 28, y);
        y += riskText.length * 4 + 3;
      }
    }

    // ─── Footer on all pages ────────────────────────────────────────────

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(160);
      doc.text(`${firmName || "Min"} — Monthly Operations Report — Page ${i} of ${totalPages}`, margin, ph - 12);
      doc.text(`Generated ${reportDate} by Min (AdviceOne)`, pw - margin, ph - 12, { align: "right" });
    }

    const pdfBase64 = doc.output("datauristring");
    const filename = `Operations-Report-${reportDate.replace(/\//g, "-")}.pdf`;

    return NextResponse.json({ success: true, pdf: pdfBase64, filename });
  } catch (error) {
    console.error("Operations PDF error:", error);
    return NextResponse.json({ error: "Failed to generate operations PDF" }, { status: 500 });
  }
}
