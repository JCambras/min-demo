import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

interface AuditRecordInput {
  id: string;
  action: string;
  result: "success" | "error";
  actor?: string;
  household: string;
  householdId?: string;
  timestamp: string;
  detail?: string;
  durationMs?: number;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      records,
      dateRange,
      totalCount,
      successCount,
      errorCount,
    }: {
      records: AuditRecordInput[];
      dateRange: string;
      totalCount: number;
      successCount: number;
      errorCount: number;
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
        doc.text(`Min Audit Trail — Page ${doc.getNumberOfPages()}`, margin, ph - 12);
        doc.text(`Generated ${new Date().toLocaleDateString()}`, pw - margin, ph - 12, { align: "right" });
        doc.addPage();
        y = 25;
      }
    };

    // ─── Header Banner ──────────────────────────────────────────────────────

    doc.setFillColor(15, 23, 42); // slate-900
    doc.rect(0, 0, pw, 8, "F");

    y = 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30);
    doc.text("AUDIT TRAIL REPORT", margin, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Period: ${dateRange}`, margin, y);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(30);
    doc.text(`${records.length} records`, pw - margin, 22, { align: "right" });

    // ─── Summary Stat Boxes ─────────────────────────────────────────────────

    y += 10;
    drawLine(y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text("SUMMARY", margin, y);

    y += 6;
    const boxW = contentW / 3;
    const boxH = 18;
    const boxY = y;

    // Total
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, boxY, boxW - 3, boxH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(50);
    doc.text(String(totalCount), margin + (boxW - 3) / 2, boxY + 8, { align: "center" });
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("TOTAL", margin + (boxW - 3) / 2, boxY + 14, { align: "center" });

    // Success
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(margin + boxW, boxY, boxW - 3, boxH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(22, 101, 52);
    doc.text(String(successCount), margin + boxW + (boxW - 3) / 2, boxY + 8, { align: "center" });
    doc.setFontSize(7);
    doc.text("SUCCESS", margin + boxW + (boxW - 3) / 2, boxY + 14, { align: "center" });

    // Errors
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(margin + boxW * 2, boxY, boxW - 3, boxH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(153, 27, 27);
    doc.text(String(errorCount), margin + boxW * 2 + (boxW - 3) / 2, boxY + 8, { align: "center" });
    doc.setFontSize(7);
    doc.text("ERRORS", margin + boxW * 2 + (boxW - 3) / 2, boxY + 14, { align: "center" });

    y = boxY + boxH + 6;

    // ─── Record Table ───────────────────────────────────────────────────────

    y += 4;
    drawLine(y);
    y += 8;

    // Table header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("TIME", margin, y);
    doc.text("ACTION", margin + contentW * 0.2, y);
    doc.text("RESULT", margin + contentW * 0.5, y);
    doc.text("HOUSEHOLD", margin + contentW * 0.6, y);
    doc.text("ACTOR", margin + contentW * 0.78, y);

    y += 3;
    drawLine(y, [200, 200, 200]);
    y += 5;

    for (const r of records) {
      checkPageBreak(14);

      // Timestamp
      const ts = new Date(r.timestamp);
      const dateStr = ts.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      const timeStr = ts.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });

      doc.setFont("helvetica", "normal");
      doc.setFontSize(7);
      doc.setTextColor(100);
      doc.text(`${dateStr} ${timeStr}`, margin, y);

      // Action
      doc.setFontSize(8);
      doc.setTextColor(30);
      const actionLines = doc.splitTextToSize(r.action, contentW * 0.28);
      doc.text(actionLines[0], margin + contentW * 0.2, y);

      // Result
      if (r.result === "success") {
        doc.setTextColor(22, 101, 52);
      } else {
        doc.setTextColor(153, 27, 27);
      }
      doc.setFont("helvetica", "bold");
      doc.setFontSize(7);
      doc.text(r.result.toUpperCase(), margin + contentW * 0.5, y);

      // Household
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80);
      doc.setFontSize(7);
      doc.text(r.household || "—", margin + contentW * 0.6, y);

      // Actor
      doc.setTextColor(100);
      doc.text(r.actor || "—", margin + contentW * 0.78, y);

      y += 4;

      // Detail line
      if (r.detail) {
        doc.setFontSize(6.5);
        doc.setTextColor(140);
        const detailLines = doc.splitTextToSize(r.detail, contentW * 0.75);
        doc.text(detailLines[0], margin + contentW * 0.2, y);
        y += 3;
      }

      y += 3;
    }

    // ─── Footer ──────────────────────────────────────────────────────────────

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(160);
      doc.text(`Min Audit Trail — Page ${i} of ${totalPages}`, margin, ph - 12);
      doc.text(`Generated ${new Date().toLocaleDateString()} by Min`, pw - margin, ph - 12, { align: "right" });
      doc.setTextColor(140);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6);
      doc.text("SEC Rule 17a-4 compliant audit log. Decision-support tool only.", pw / 2, ph - 7, { align: "center" });
    }

    // Generate
    const pdfBase64 = doc.output("datauristring");
    const today = new Date().toISOString().slice(0, 10);

    return NextResponse.json({
      success: true,
      pdf: pdfBase64,
      filename: `Min_Audit_Trail_${today}.pdf`,
    });
  } catch (error) {
    console.error("Audit PDF error:", error);
    return NextResponse.json({ error: "Failed to generate audit PDF" }, { status: 500 });
  }
}
