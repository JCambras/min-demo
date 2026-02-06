import { NextResponse } from "next/server";
import { jsPDF } from "jspdf";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { familyName, members, date } = body;

    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Helper for centered text
    const centerText = (text: string, y: number, size: number = 12) => {
      doc.setFontSize(size);
      const textWidth = doc.getTextWidth(text);
      doc.text(text, (pageWidth - textWidth) / 2, y);
    };

    // === PAGE 1: Cover Page ===
    doc.setFont("helvetica", "bold");
    centerText("CLIENT ONBOARDING PACKET", 40, 24);
    
    doc.setFont("helvetica", "normal");
    centerText(`Prepared for the ${familyName} Family`, 60, 16);
    centerText(date || new Date().toLocaleDateString(), 75, 12);
    
    doc.setFontSize(12);
    doc.text("This packet contains:", 40, 110);
    doc.text("• Investment Policy Statement (IPS)", 50, 125);
    doc.text("• Risk Assessment Questionnaire", 50, 135);
    doc.text("• Form ADV Disclosure", 50, 145);
    doc.text("• Privacy Policy", 50, 155);
    
    doc.setFontSize(10);
    doc.setTextColor(100);
    centerText("Prepared by Min — AdviceOne Wealth Management", 280, 10);
    doc.setTextColor(0);

    // === PAGE 2: Client Information ===
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Client Information", 20, 30);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    
    let y = 50;
    doc.text(`Household: ${familyName} Family`, 20, y);
    y += 15;
    
    doc.text("Family Members:", 20, y);
    y += 10;
    
    for (const member of members) {
      doc.text(`• ${member.firstName} ${member.lastName}`, 30, y);
      y += 7;
      doc.setFontSize(10);
      doc.setTextColor(100);
      doc.text(`Email: ${member.email} | Phone: ${member.phone}`, 35, y);
      doc.setTextColor(0);
      doc.setFontSize(12);
      y += 12;
    }

    // === PAGE 3: Investment Policy Statement ===
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Investment Policy Statement", 20, 30);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    const ipsText = `This Investment Policy Statement ("IPS") establishes the investment objectives, policies, and guidelines for the ${familyName} Family portfolio.

INVESTMENT OBJECTIVES
The primary objectives of this portfolio are:
1. Capital preservation
2. Long-term growth
3. Income generation appropriate to client needs

RISK TOLERANCE
To be determined based on Risk Assessment Questionnaire.

ASSET ALLOCATION
Target allocation to be established following initial consultation.

TIME HORIZON
Investment time horizon to be discussed and documented.

REBALANCING
Portfolio will be reviewed quarterly and rebalanced as needed to maintain target allocation within acceptable ranges.

REVIEW
This IPS will be reviewed annually or upon significant life changes.`;

    const ipsLines = doc.splitTextToSize(ipsText, pageWidth - 40);
    doc.text(ipsLines, 20, 50);

    // === PAGE 4: Risk Questionnaire ===
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Risk Assessment Questionnaire", 20, 30);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(11);
    
    const questions = [
      "1. What is your primary investment goal?\n   [ ] Preserve capital  [ ] Generate income  [ ] Grow wealth  [ ] Aggressive growth",
      "2. When do you expect to need this money?\n   [ ] Less than 3 years  [ ] 3-5 years  [ ] 5-10 years  [ ] 10+ years",
      "3. If your portfolio lost 20% in a month, you would:\n   [ ] Sell everything  [ ] Sell some  [ ] Hold  [ ] Buy more",
      "4. How would you describe your investment knowledge?\n   [ ] Beginner  [ ] Intermediate  [ ] Advanced  [ ] Expert",
      "5. What percentage of your income do you save monthly?\n   [ ] Less than 5%  [ ] 5-10%  [ ] 10-20%  [ ] More than 20%",
    ];
    
    y = 50;
    for (const q of questions) {
      const lines = doc.splitTextToSize(q, pageWidth - 40);
      doc.text(lines, 20, y);
      y += 25;
    }
    
    doc.text("Client Signature: _______________________  Date: ___________", 20, 250);

    // === PAGE 5: Form ADV Disclosure ===
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Form ADV Part 2A Disclosure", 20, 30);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    const advText = `ITEM 1: COVER PAGE
This brochure provides information about the qualifications and business practices of AdviceOne Wealth Management. If you have any questions about the contents of this brochure, please contact us at info@adviceone.com.

ITEM 2: MATERIAL CHANGES
This section will describe any material changes since the last annual update.

ITEM 3: TABLE OF CONTENTS
[See full Form ADV for complete table of contents]

ITEM 4: ADVISORY BUSINESS
AdviceOne Wealth Management provides comprehensive financial planning and investment advisory services to individuals and families.

ITEM 5: FEES AND COMPENSATION
Our fees are based on a percentage of assets under management, typically ranging from 0.50% to 1.25% annually, depending on account size.

ITEM 6: PERFORMANCE-BASED FEES
We do not charge performance-based fees.

ITEM 7: TYPES OF CLIENTS
We provide services to individuals, families, trusts, and retirement accounts.

By signing below, I acknowledge receipt of Form ADV Part 2A.

Client Signature: _______________________  Date: ___________`;

    const advLines = doc.splitTextToSize(advText, pageWidth - 40);
    doc.text(advLines, 20, 45);

    // === PAGE 6: Privacy Policy ===
    doc.addPage();
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.text("Privacy Policy", 20, 30);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    
    const privacyText = `COMMITMENT TO PRIVACY
AdviceOne Wealth Management is committed to safeguarding the confidential information of our clients.

INFORMATION WE COLLECT
We collect nonpublic personal information about you from:
- Applications and forms you complete
- Your transactions with us
- Consumer reporting agencies

INFORMATION WE SHARE
We do not sell your personal information to anyone. We may share information with:
- Service providers who assist in our operations
- Regulatory authorities as required by law

PROTECTING YOUR INFORMATION
We maintain physical, electronic, and procedural safeguards to protect your information. Access is limited to employees who need it to provide services to you.

YOUR RIGHTS
You have the right to:
- Access your personal information
- Correct inaccurate information  
- Request deletion of your information (subject to legal requirements)

CONTACT US
For questions about our privacy practices, contact us at privacy@adviceone.com.

By signing below, I acknowledge receipt of this Privacy Policy.

Client Signature: _______________________  Date: ___________`;

    const privacyLines = doc.splitTextToSize(privacyText, pageWidth - 40);
    doc.text(privacyLines, 20, 45);

    // Generate PDF as base64
    const pdfBase64 = doc.output("datauristring");

    return NextResponse.json({
      success: true,
      pdf: pdfBase64,
      filename: `${familyName}_Onboarding_Packet.pdf`,
    });
  } catch (error) {
    console.error("PDF error:", error);
    return NextResponse.json(
      { error: "Failed to generate PDF" },
      { status: 500 }
    );
  }
}
