import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

interface RemediationStepInput {
  order: number;
  action: string;
  assignTo: string;
  followUpDays: number;
}

interface CheckInput {
  label: string;
  category: string;
  regulation: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  remediation?: RemediationStepInput[];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const {
      familyName,
      householdUrl,
      contacts,
      tasksScanned,
      checks,
      reviewDate,
      nextReviewDate,
      firmName,
    }: {
      familyName: string;
      householdUrl: string;
      contacts: { name: string; email: string }[];
      tasksScanned: number;
      checks: CheckInput[];
      reviewDate: string;
      nextReviewDate: string;
      firmName?: string;
    } = body;

    const passCount = checks.filter(c => c.status === "pass").length;
    const warnCount = checks.filter(c => c.status === "warn").length;
    const failCount = checks.filter(c => c.status === "fail").length;
    const allPassed = failCount === 0;

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

    const statusSymbol = (status: string) => {
      if (status === "pass") return "PASS";
      if (status === "warn") return "WARN";
      return "FAIL";
    };

    const checkPageBreak = (needed: number) => {
      if (y + needed > ph - 30) {
        // Footer on current page
        doc.setFontSize(7);
        doc.setTextColor(160);
        doc.text(`${firmName ? firmName + " — " : ""}Min Compliance Report — ${familyName} Household — Page ${doc.getNumberOfPages()}`, margin, ph - 12);
        doc.text(`Generated ${reviewDate}`, pw - margin, ph - 12, { align: "right" });
        doc.addPage();
        y = 25;
      }
    };

    // ─── Header ──────────────────────────────────────────────────────────────

    // Top banner
    doc.setFillColor(allPassed ? 34 : 217, allPassed ? 139 : 119, allPassed ? 34 : 6); // green or amber
    doc.rect(0, 0, pw, 8, "F");

    y = 22;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(30);
    doc.text("COMPLIANCE REVIEW REPORT", margin, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(100);
    if (firmName) {
      doc.text(`${firmName} — Confidential`, margin, y);
    } else {
      doc.text("Confidential — For Internal Use Only", margin, y);
    }

    // Result badge
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    if (allPassed) {
      doc.setTextColor(34, 139, 34);
      doc.text("ALL CHECKS PASSED", pw - margin, 22, { align: "right" });
    } else {
      doc.setTextColor(217, 119, 6);
      doc.text(`${failCount} ITEM${failCount > 1 ? "S" : ""} FLAGGED`, pw - margin, 22, { align: "right" });
    }

    // ─── Household Summary ───────────────────────────────────────────────────

    y += 10;
    drawLine(y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text("HOUSEHOLD", margin, y);
    doc.text("REVIEW DATE", margin + contentW * 0.4, y);
    doc.text("NEXT REVIEW", margin + contentW * 0.7, y);

    y += 6;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(30);
    doc.text(`${familyName} Household`, margin, y);
    doc.text(reviewDate, margin + contentW * 0.4, y);
    doc.text(nextReviewDate, margin + contentW * 0.7, y);

    y += 6;
    doc.setFontSize(8);
    doc.setTextColor(100);
    const contactNames = contacts.map(c => c.name).join(", ");
    doc.text(`Contacts: ${contactNames}`, margin, y);
    doc.text(`${tasksScanned} Salesforce records scanned`, margin + contentW * 0.4, y);

    // ─── Score Summary ───────────────────────────────────────────────────────

    y += 10;
    drawLine(y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text("SUMMARY", margin, y);

    y += 6;
    doc.setFontSize(10);
    doc.setTextColor(30);

    // Score boxes
    const boxW = contentW / 4;
    const boxH = 18;
    const boxY = y;

    // Total checks
    doc.setFillColor(245, 245, 245);
    doc.roundedRect(margin, boxY, boxW - 3, boxH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(50);
    doc.text(String(checks.length), margin + (boxW - 3) / 2, boxY + 8, { align: "center" });
    doc.setFontSize(7);
    doc.setTextColor(130);
    doc.text("TOTAL", margin + (boxW - 3) / 2, boxY + 14, { align: "center" });

    // Passed
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(margin + boxW, boxY, boxW - 3, boxH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(22, 101, 52);
    doc.text(String(passCount), margin + boxW + (boxW - 3) / 2, boxY + 8, { align: "center" });
    doc.setFontSize(7);
    doc.text("PASSED", margin + boxW + (boxW - 3) / 2, boxY + 14, { align: "center" });

    // Warnings
    doc.setFillColor(254, 249, 195);
    doc.roundedRect(margin + boxW * 2, boxY, boxW - 3, boxH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(146, 64, 14);
    doc.text(String(warnCount), margin + boxW * 2 + (boxW - 3) / 2, boxY + 8, { align: "center" });
    doc.setFontSize(7);
    doc.text("WARNINGS", margin + boxW * 2 + (boxW - 3) / 2, boxY + 14, { align: "center" });

    // Failed
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(margin + boxW * 3, boxY, boxW - 3, boxH, 2, 2, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(14);
    doc.setTextColor(153, 27, 27);
    doc.text(String(failCount), margin + boxW * 3 + (boxW - 3) / 2, boxY + 8, { align: "center" });
    doc.setFontSize(7);
    doc.text("FAILED", margin + boxW * 3 + (boxW - 3) / 2, boxY + 14, { align: "center" });

    y = boxY + boxH + 6;

    // ─── Detailed Check Results ──────────────────────────────────────────────

    y += 4;
    drawLine(y);
    y += 8;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text("CHECK", margin, y);
    doc.text("STATUS", margin + contentW * 0.55, y);
    doc.text("REGULATION", margin + contentW * 0.68, y);

    y += 3;
    drawLine(y, [200, 200, 200]);
    y += 5;

    // Group by category
    const categories = [...new Set(checks.map(c => c.category))];
    const catLabels: Record<string, string> = {
      identity: "IDENTITY & KYC",
      suitability: "SUITABILITY",
      documents: "DISCLOSURES",
      account: "ACCOUNT SETUP",
      regulatory: "REGULATORY",
    };

    for (const cat of categories) {
      const catChecks = checks.filter(c => c.category === cat);
      checkPageBreak(8 + catChecks.length * 12);

      // Category header
      doc.setFont("helvetica", "bold");
      doc.setFontSize(8);
      doc.setTextColor(100);
      doc.text(catLabels[cat] || cat.toUpperCase(), margin, y);
      y += 5;

      for (const check of catChecks) {
        checkPageBreak(12);

        // Status indicator
        const statusText = statusSymbol(check.status);
        if (check.status === "pass") doc.setTextColor(22, 101, 52);
        else if (check.status === "warn") doc.setTextColor(146, 64, 14);
        else doc.setTextColor(153, 27, 27);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text(statusText, margin + contentW * 0.55, y);

        // Check label
        doc.setTextColor(30);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.text(check.label, margin + 4, y);

        // Regulation
        doc.setFontSize(7);
        doc.setTextColor(130);
        const regLines = doc.splitTextToSize(check.regulation, contentW * 0.30);
        doc.text(regLines, margin + contentW * 0.68, y);

        y += 4;

        // Detail line
        doc.setFontSize(7);
        doc.setTextColor(120);
        const detailLines = doc.splitTextToSize(check.detail, contentW * 0.52);
        doc.text(detailLines, margin + 4, y);
        y += detailLines.length * 3.5 + 4;

        // Remediation steps for failed/warned checks
        if ((check.status === "fail" || check.status === "warn") && check.remediation && check.remediation.length > 0) {
          for (const step of check.remediation) {
            checkPageBreak(6);
            doc.setFontSize(6.5);
            doc.setTextColor(80, 80, 140);
            doc.text(`  ${step.order}. ${step.action}`, margin + 8, y);
            doc.setTextColor(140);
            doc.text(`[${step.assignTo}]`, margin + contentW * 0.5, y);
            y += 3;
          }
          y += 2;
        }
      }

      y += 2;
    }

    // ─── Signature Block ─────────────────────────────────────────────────────

    checkPageBreak(50);
    y += 6;
    drawLine(y);
    y += 12;

    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.setTextColor(130);
    doc.text("ATTESTATION", margin, y);

    y += 8;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(50);
    const attestText = `I have reviewed the compliance status of the ${familyName} Household as of ${reviewDate}. ` +
      (allPassed
        ? "All required checks have passed. This household is audit-ready."
        : `${failCount} item(s) require follow-up action as noted above. Remediation should be completed before the next review date.`);
    const attestLines = doc.splitTextToSize(attestText, contentW);
    doc.text(attestLines, margin, y);
    y += attestLines.length * 4.5 + 12;

    // Signature lines
    doc.setTextColor(80);
    doc.setFontSize(8);
    drawLine(y, [180, 180, 180]);
    y += 4;
    doc.text("Reviewer Signature", margin, y);
    doc.text("Date", margin + contentW * 0.6, y);

    y += 16;
    drawLine(y, [180, 180, 180]);
    y += 4;
    doc.text("Chief Compliance Officer", margin, y);
    doc.text("Date", margin + contentW * 0.6, y);

    // ─── Disclaimer Box ─────────────────────────────────────────────────────

    checkPageBreak(30);
    y += 14;
    doc.setFillColor(240, 240, 240);
    const disclaimerText = "This report is a decision-support tool generated by Min. Final compliance determinations remain the responsibility of the firm's Chief Compliance Officer. This report does not constitute legal or regulatory advice.";
    doc.setFont("helvetica", "italic");
    doc.setFontSize(7);
    doc.setTextColor(100);
    const disclaimerLines = doc.splitTextToSize(disclaimerText, contentW - 12);
    const disclaimerH = disclaimerLines.length * 3.5 + 8;
    doc.roundedRect(margin, y, contentW, disclaimerH, 2, 2, "F");
    doc.text(disclaimerLines, margin + 6, y + 5);
    y += disclaimerH;

    // ─── Footer ──────────────────────────────────────────────────────────────

    const totalPages = doc.getNumberOfPages();
    for (let i = 1; i <= totalPages; i++) {
      doc.setPage(i);
      doc.setFontSize(7);
      doc.setTextColor(160);
      doc.text(`Min Compliance Report — ${familyName} Household — Page ${i} of ${totalPages}`, margin, ph - 12);
      doc.text(`Generated ${reviewDate} by Min (AdviceOne)`, pw - margin, ph - 12, { align: "right" });
      doc.setTextColor(140);
      doc.setFont("helvetica", "italic");
      doc.setFontSize(6);
      doc.text("Decision-support tool only — final compliance determinations are the firm's CCO responsibility.", pw / 2, ph - 7, { align: "center" });
      if (householdUrl) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(100, 130, 200);
        doc.textWithLink("View in Salesforce", margin, ph - 3, { url: householdUrl });
      }
    }

    // Generate
    const pdfBase64 = doc.output("datauristring");

    return NextResponse.json({
      success: true,
      pdf: pdfBase64,
      filename: `${familyName}_Compliance_Review_${reviewDate.replace(/\//g, "-")}.pdf`,
    });
  } catch (error) {
    console.error("Compliance PDF error:", error);
    return NextResponse.json({ error: "Failed to generate compliance PDF" }, { status: 500 });
  }
}
