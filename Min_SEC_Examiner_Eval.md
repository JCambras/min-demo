# Evaluation #5: SEC Examiner Evaluation of Min

## The Regulator's Lens — What Happens When Someone Paid to Find Problems Examines Your Compliance Stack

---

**Evaluation Series Context**

| # | Evaluation | Perspective | Core Question |
|---|-----------|-------------|---------------|
| 1 | COO Product Evaluation | Buyer (operator) | Does this solve my daily problems? |
| 2 | T3 Conference Booth | Market (strangers) | Can you explain this in 3 minutes? |
| 3 | Expert Compliance Review | Domain expert | Is this technically sound? |
| 4 | Advisor Adoption Study | End user (resistor) | Will my team actually use this? |
| **5** | **SEC Examiner Evaluation** | **Regulator (adversary)** | **Does your compliance tool survive the people who test compliance for a living?** |

**Why This Evaluation Matters**

Every previous evaluation tested Min from the perspective of someone who *wants* it to work — a buyer evaluating features, a conference attendee looking for solutions, an expert assessing architecture. This evaluation inverts the frame entirely.

An SEC examiner doesn't care about your product roadmap, your health scores, or your triage queue. She cares about one thing: whether the firm she's examining is meeting its fiduciary and regulatory obligations. If Min helps the firm demonstrate compliance, great. If Min creates the *appearance* of compliance without the substance, that's worse than having no tool at all — because it means the firm relied on something that gave them false confidence.

This is the evaluation that determines whether Min's compliance value proposition is real or marketing.

**Examination Subject**

Ridgeline Wealth Partners — the same firm from Evaluation #1. Sarah Kendrick, COO. $1.08B AUM. 15 headcount, 5 advisors. Salesforce FSC + Schwab. Garrison acquisition integration ongoing. SEC examination overdue — last examined in 2021.

The examination is happening now. Min has been deployed for 90 days.

---

## Part 1: The Examiner

### Lisa Nakamura — Senior Examiner, Division of Examinations

**Professional Profile**

Lisa Nakamura is a Senior Examiner in the SEC's Division of Examinations (the successor to OCIE — the Office of Compliance Inspections and Examinations, reorganized in 2020). She works out of the Atlanta Regional Office, which covers Tennessee-registered advisers including Ridgeline Wealth Partners.

She has been with the Commission for twelve years. In that time, she has conducted or supervised over 200 examinations of investment advisers, broker-dealers, and fund complexes ranging from solo practitioners managing $30M to multi-billion-dollar platforms with hundreds of advisors. She has seen every variation of compliance failure — from the genuinely fraudulent to the merely disorganized, from the sophisticated cover-up to the firm that simply forgot to update its Form ADV for three years.

**Background**

Lisa holds a JD from Georgetown University Law Center (2011) and passed the Series 65 examination before joining the SEC, having spent two years as a compliance consultant at a mid-tier consulting firm where she helped RIAs prepare for examinations. That consulting experience gives her an unusual advantage: she knows exactly what firms do to prepare for exams, which means she knows exactly where the preparation ends and the reality begins.

She is 38 years old, based in Atlanta, unmarried, and genuinely enjoys her work — a fact that makes her more dangerous than examiners who are simply processing cases. She reads industry publications. She attends compliance conferences (never at booths — always in the audience, taking notes). She has a LinkedIn profile that she never posts on but checks weekly.

**Examination Style**

Lisa's examination style is characterized by three traits that firms find simultaneously reassuring and terrifying:

1. **She is scrupulously fair.** She does not go into examinations looking for violations. She goes in looking for the truth about how a firm operates. If the truth is that the firm is well-run and compliant, she will say so in her report. She has closed more examinations with no findings than most of her colleagues.

2. **She is relentless about documentation.** Lisa's operating principle — learned from her consulting days — is that undocumented compliance is indistinguishable from non-compliance. A firm that does everything right but can't prove it gets the same deficiency letter as a firm that does nothing. She will ask for the same document three different ways if the first two responses feel rehearsed.

3. **She prefers deficiency letters to enforcement referrals.** Lisa believes that most compliance failures are operational failures, not ethical ones. She would rather issue a deficiency letter that forces a firm to fix its processes than refer a case to Enforcement that takes three years and costs everyone money. But she will make the referral without hesitation if she finds evidence of willful misconduct, client harm, or repeated failures after prior warnings.

**Technology Specialization**

Lisa is the Atlanta office's informal technology risk specialist. In 2024, she co-authored the Division's internal guidance on examining firms that use AI and algorithmic tools for compliance — guidance that informed the SEC's public AI Risk Alert. She was part of the examination team that reviewed three robo-advisors in 2023, and she personally developed the examination module for assessing vendor risk in cloud-based compliance platforms.

This specialization means she asks questions that generalist examiners don't. She understands the difference between a rule-based engine and a machine learning model. She knows what SOQL injection is. She will ask about encryption at rest. She will want to see the audit trail's append-only enforcement mechanism. And she will immediately identify the gap between "we have an audit trail" and "our audit trail is tamper-evident."

**Examination Priorities for Ridgeline**

Lisa's examination of Ridgeline Wealth Partners is driven by five priorities, each mapped to specific regulatory concerns:

| Priority | Regulatory Basis | What She's Looking For |
|----------|-----------------|----------------------|
| Books and Records | Rule 204-2 (Advisers Act) | Complete, accurate, contemporaneous records of advisory activities, recommendations, and client communications |
| Supervision | Section 203(e)(6) (Advisers Act) | Evidence that the firm has reasonable supervisory procedures and is actually following them — not just documenting them |
| Privacy and Data Protection | Regulation S-P (Rule 30) | Safeguards for client PII, breach notification procedures, vendor data handling |
| Technology Vendor Risk | 2024 Examination Priorities, AI Risk Alert | How the firm evaluates, monitors, and documents its reliance on third-party technology for compliance functions |
| Post-Acquisition Integration | General fiduciary duty | Whether the Garrison acquisition households are receiving the same standard of care as legacy clients |

Lisa received the Ridgeline examination assignment six weeks ago. She has already reviewed the firm's most recent Form ADV (Parts 1 and 2A), its last examination file from 2021 (no deficiencies found), and its AUM history showing the Garrison acquisition. She noted that the firm crossed $1B in AUM fourteen months ago but did not update its ADV brochure to reflect changes in its operational capacity. She also noted that the firm added "technology-assisted compliance monitoring" to its ADV supplement eight weeks ago — which is what flagged it for her technology-focused examination module.

She does not know what "Min" is. She has never heard of it. She will learn about it during the examination.

**Personal Disposition**

Lisa arrives at examinations at 8:15 AM — fifteen minutes before the scheduled start — because she wants to see the office before it's been prepared for her. She brings her own coffee. She is polite to everyone, asks the receptionist about their day, and remembers first names. She dresses in business casual (blazer, no tie equivalent, comfortable shoes for walking the office).

She carries a government-issued laptop, a legal pad (yellow, college-ruled), and a black pen. She takes notes by hand during interviews and transcribes them into the examination workpapers each evening. Her handwritten notes are discoverable, and she writes accordingly: factual, precise, never editorial.

When she finds something concerning, she does not react visibly. She writes it down, circles it, and moves on. The firm will not know what concerned her until they receive the examination letter — which is exactly how she wants it.

---

## Part 2: The Pre-Examination Document Request

### SEC Division of Examinations — Document Request Letter

---

**UNITED STATES SECURITIES AND EXCHANGE COMMISSION**
**Division of Examinations — Atlanta Regional Office**

**CONFIDENTIAL**

Date: [6 weeks before on-site]

Sarah Kendrick, Chief Operating Officer
Ridgeline Wealth Partners, LLC
[Address]
Nashville, TN 37203

Re: Examination of Ridgeline Wealth Partners, LLC (CRD# [XXXXXX])

Dear Ms. Kendrick:

The Division of Examinations of the U.S. Securities and Exchange Commission ("SEC" or "Commission") is conducting an examination of Ridgeline Wealth Partners, LLC ("the Firm" or "Registrant") pursuant to Section 204 of the Investment Advisers Act of 1940. This examination will cover the period from January 1, 2024 through the present.

Please provide the following documents and information no later than **[3 weeks before on-site date]**. All documents should be provided in electronic format where possible. If any requested document does not exist, please state so in writing.

---

#### Request 1: Current Form ADV Parts 1, 2A, and 2B, including all amendments filed during the examination period

**What she's asking for (surface):** Standard opening request. Every examination starts here.

**What she's really looking for (subtext):** Lisa already has the ADV from IARD. She's asking the firm to produce it so she can compare what they *think* their current ADV says versus what's actually filed. She's specifically looking for whether the "technology-assisted compliance monitoring" language in the ADV supplement matches what Min actually does. She's also checking whether the Garrison acquisition triggered any material changes that weren't disclosed — new advisory personnel, changes in custody arrangements, updated fee schedules for acquired clients.

**Good response:** Sarah produces the current ADV within hours, notes that it was updated 8 weeks ago to reflect the technology platform addition, and flags that a further amendment is in progress to update personnel disclosures for two associate advisors who now manage Garrison households.

**Red flag response:** Sarah produces an ADV that hasn't been amended since 2023. The "technology-assisted compliance monitoring" language doesn't appear. The Garrison acquisition isn't reflected in AUM figures or personnel changes.

**Does Min help or hurt?** **Helps moderately.** Min doesn't manage ADV filings, but its compliance engine includes `adv-delivery` checks (searching for "adv," "advisory," "brochure" keywords in task history). If Ridgeline has been tracking ADV delivery through Salesforce tasks, Min can demonstrate that ADV brochures were delivered to new and existing clients. However, Min cannot verify the *content* of the ADV — only that a task related to ADV delivery was completed. This is a limitation Lisa will probe on-site.

---

#### Request 2: Written supervisory procedures, compliance manual, and code of ethics currently in effect, including any amendments made during the examination period

**What she's asking for:** The firm's compliance infrastructure documentation.

**What she's really looking for:** Lisa wants to see whether the compliance manual addresses technology-assisted supervision. Specifically: does the manual describe what Min does, who is responsible for reviewing Min's outputs, what happens when Min flags an issue, and what happens when Min is unavailable? She's also checking whether the supervisory procedures were updated when Min was deployed — a firm that adds a compliance technology tool without updating its written supervisory procedures has a Section 203(e)(6) problem.

**Good response:** Sarah produces a compliance manual that includes a section on "Technology-Assisted Compliance Monitoring" describing Min's role, its limitations (read-only, rule-based, Salesforce-dependent), the human review process for all Min outputs, and a business continuity provision for operating without Min. The manual clearly states that Min is a *tool*, not a *supervisor* — the CCO and COO retain all supervisory responsibility.

**Red flag response:** The compliance manual makes no mention of Min. Or worse: it delegates supervisory responsibility to Min ("all compliance monitoring is conducted through the Min platform"). This would suggest the firm is using technology to replace supervision rather than enhance it — exactly the concern Lisa's AI Risk Alert guidance addresses.

**Does Min help or hurt?** **Neutral — depends entirely on the firm's documentation.** Min doesn't generate supervisory procedure templates. It doesn't produce compliance manuals. This is a gap identified in the plan: Min should provide a Supervisory Procedure Template that firms can adapt. Without it, Ridgeline is responsible for writing its own procedures describing Min's role — and most firms won't do this well.

---

#### Request 3: A complete list of all third-party technology vendors used for client-facing or compliance functions, including contracts, due diligence documentation, and data security assessments for each

**What she's asking for:** Vendor inventory.

**What she's really looking for:** This is Lisa's technology-risk request. She wants to know every piece of software that touches client data or compliance decisions. She will cross-reference this list against the firm's privacy policy (Reg S-P) and supervisory procedures. For Min specifically, she will want: (a) the contract or terms of service, (b) any vendor due diligence the firm performed before deploying Min, (c) Min's data security documentation (SOC 2, penetration testing results, encryption standards), and (d) evidence that the firm evaluated Min's suitability for its specific regulatory obligations.

**Good response:** Sarah produces a vendor matrix that includes Min alongside Salesforce, Schwab, DocuSign, SmartRIA, and any other platforms. For Min, the matrix includes: deployment date, data accessed (Salesforce read/write, no direct custodial access), encryption standards (AES-256-GCM), authentication method (Salesforce OAuth), data residency, and a note that Min stores no client data independently — all data resides in the firm's Salesforce org.

**Red flag response:** No vendor due diligence documentation exists for Min. Or: the firm cannot articulate what data Min accesses, where it stores data, or how it authenticates. This suggests the firm deployed a compliance tool without performing the same due diligence it would (should) perform on any other vendor.

**Does Min help or hurt?** **Hurts — because Min doesn't provide this documentation.** Min has no vendor due diligence packet, no SOC 2 report (or attestation of progress toward one), no standardized security documentation that a firm can hand to an examiner. The firm's Salesforce org stores all Min audit data, and Min's encryption is strong (AES-256-GCM with scrypt key derivation, CSRF protection, SOQL injection prevention). But none of this is packaged in a format an examiner can review. Sarah would need to produce this documentation herself — and she may not understand Min's security architecture well enough to do it accurately.

---

#### Request 4: For the period January 1, 2024 through present, all records of investment recommendations, including suitability determinations, best-interest evaluations, and documentation of the basis for each recommendation

**What she's asking for:** Rule 204-2(a)(7) records — the core "books and records" of an advisory firm.

**What she's really looking for:** Lisa is checking whether recommendations are documented contemporaneously (at the time they're made, not reconstructed later) and whether the documentation includes the *basis* for the recommendation — not just "we recommended X" but "we recommended X because the client's risk tolerance is moderate, their time horizon is 15 years, and their income needs require 3% annual distribution." She will cross-reference recommendation records against client suitability profiles to check for inconsistencies.

**Good response:** Sarah produces recommendation documentation from Salesforce showing suitability profiles, investment policy statements, and task-level records of recommendation discussions. Min's compliance engine can support this by demonstrating that suitability checks (`suitability-profile` keywords: "risk," "investment objective," "suitability") have been run across households and that gaps were flagged and addressed.

**Red flag response:** Recommendation records are sparse or retrospective. The Garrison acquisition households have no suitability documentation from the transition period. Min's compliance scan shows `fail` results for suitability across multiple Garrison households, and no remediation tasks were created.

**Does Min help or hurt?** **Helps significantly.** Min's compliance engine runs suitability checks as part of its 30+ built-in compliance scan. When a household fails the `suitability-profile` check, it means no tasks containing "risk," "investment objective," or "suitability" keywords were found in the household's Salesforce record. This is a powerful early warning system. But it's keyword-based, not content-based — Min verifies that a suitability-related task *exists*, not that the suitability determination was *correct*. Lisa will note this distinction.

---

#### Request 5: Client complaint log for the examination period, including disposition of each complaint and any remedial actions taken

**What she's asking for:** Evidence of complaint handling.

**What she's really looking for:** Lisa is checking two things: (1) whether the firm actually receives and documents complaints (firms that report zero complaints are not necessarily clean — they may just not be tracking), and (2) whether complaints triggered any changes to supervisory procedures or compliance monitoring. She will also check whether any complaints relate to the Garrison acquisition transition — acquired clients frequently complain about communication gaps, fee changes, or unfamiliar advisors.

**Good response:** Sarah produces a complaint log (even if it shows only 2-3 complaints) with clear documentation of investigation, resolution, and any procedural changes. She can show Min's audit trail demonstrating that complaint-related households received enhanced monitoring after the complaint.

**Red flag response:** "We have received no complaints during the examination period." (This is almost never true for a firm with 200+ households and an active acquisition integration. Lisa will press on how complaints are defined and captured.)

**Does Min help or hurt?** **Neutral.** Min doesn't have a complaint tracking module. Complaints would exist in Salesforce as tasks or cases, and Min would surface them in the household view if they're tagged appropriately. But Min doesn't categorize or escalate complaints specifically. This is an area where Min's compliance engine could add value — a compliance check for complaint documentation completeness — but currently doesn't.

---

#### Request 6: For 10 client accounts selected by the examination staff (to be provided upon commencement of on-site examination), complete account documentation including: account opening documents, suitability questionnaires, investment policy statements, fee agreements, all correspondence, and transaction history

**What she's asking for:** Deep dive material.

**What she's really looking for:** Lisa will select the 10 accounts strategically. She will include: at least 2 Garrison acquisition households, at least 1 trust account, at least 1 retirement account with RMD obligations, at least 1 account flagged by Min (if she discovers Min during the examination), and at least 1 account that Min shows as healthy (to check whether "healthy" means "actually compliant" or "no one has looked closely"). She's testing whether the firm's documentation quality is consistent across account types and whether acquired clients received the same onboarding rigor as organic clients.

**Good response:** Sarah can pull complete documentation for all 10 accounts from Salesforce within 24 hours. For each account, she can show Min's compliance scan results, health score breakdown, and any audit trail entries. She can explain gaps in Garrison documentation and show the remediation plan with deadlines.

**Red flag response:** Documentation is incomplete for 3+ accounts. Garrison households have no suitability questionnaires. Trust accounts are missing trust certifications. The retirement account has no RMD tracking documentation. Sarah cannot explain the gaps or provides explanations that suggest she's seeing these gaps for the first time.

**Does Min help or hurt?** **Helps strongly — this is Min's core value proposition.** Min's compliance engine runs account-type-specific checks: trust accounts are checked for `trust-certification`, `trustee-verification`, and `trust-agreement` keywords; retirement accounts are checked for `rmd-tracking` and `pte-compliance`; entity accounts are checked for `authorized-signers`, `erisa-compliance`, and `entity-resolution`. If Sarah has been running compliance scans on these households, she will know about documentation gaps *before* the examiner finds them. If she hasn't been running scans, Min's value is theoretical rather than actual.

---

#### Request 7: A description of the Firm's data security program, including: policies for protection of client personally identifiable information (PII), incident response procedures, vendor data handling agreements, and any breach notifications issued during the examination period

**What she's asking for:** Regulation S-P (Rule 30) compliance.

**What she's really looking for:** Lisa wants to understand the firm's entire data lifecycle — where PII enters the system, where it's stored, who has access, and how it's protected. For Min specifically, she will want to know: (a) does Min access client PII, (b) where is that PII stored, (c) is PII encrypted in transit and at rest, (d) does Min's audit trail contain PII, and (e) who at the Min company has access to Ridgeline's data.

**Good response:** Sarah produces a data security policy that specifically addresses Min's data handling. She can explain that Min accesses Salesforce data through authenticated API connections using OAuth with AES-256-GCM encrypted credentials, that Min does not store client data independently (all data resides in the firm's Salesforce org), that Min's audit trail scrubs PII before logging (SSN, DOB, bank accounts, routing numbers are replaced with `[REDACTED]`), and that Min's audit records are stored as Salesforce Tasks controlled by the firm's own Salesforce permissions.

**Red flag response:** The data security policy doesn't mention Min. Sarah cannot explain Min's data handling. She doesn't know whether Min scrubs PII. She doesn't know where audit records are stored.

**Does Min help or hurt?** **Mixed.** Min's PII scrubbing is a genuine strength — the `scrubPII()` function recursively redacts sensitive fields (SSN, DOB, ID numbers, bank accounts, routing numbers, last-four digits) before writing audit records. However, there's a gap: while audit records are scrubbed, the compliance review *task descriptions* recorded in Salesforce may contain client names and contact details in plaintext. Lisa will identify this inconsistency. Additionally, Min's audit tasks include an `Actor` field (the user who performed the action) — this is operational data, not PII, but Lisa will want to understand the full data map.

---

#### Request 8: For any technology platform used for compliance monitoring or supervision, provide: (a) a description of the platform's methodology, (b) documentation of any testing or validation performed, (c) records of any errors, failures, or overrides, and (d) the Firm's procedures for reviewing and acting on the platform's outputs

**What she's asking for:** This is the Min-specific request, even though Lisa doesn't know Min's name yet.

**What she's really looking for:** This is Lisa's AI Risk Alert request. She's probing four things: (1) Is the firm using AI/ML for compliance, and if so, do they understand how it works? (2) Does the firm blindly follow the technology's outputs, or does it exercise independent judgment? (3) When the technology is wrong, does the firm catch the error? (4) Is there a human override mechanism, and is it documented?

**Good response:** Sarah describes Min's methodology accurately: rule-based compliance checks using keyword matching against Salesforce task records, not AI or machine learning. She explains the triage system's deterministic logic (overdue tasks, unsigned documents, stale households, compliance coverage gaps). She produces audit trail records showing dismissed items with mandatory reasons — evidence that the firm exercises independent judgment. She can point to specific instances where Min flagged an issue that turned out to be a false positive (e.g., the Jackson household hospital stay from Evaluation #1), and the dismiss reason documents why the flag was overridden.

**Red flag response:** Sarah describes Min as "AI-powered" or cannot explain how it determines what to flag. She has no documentation of overrides or dismissals. The audit trail shows that every Min recommendation was approved without exception — suggesting rubber-stamping rather than independent review.

**Does Min help or hurt?** **Helps enormously — IF the firm uses it correctly.** Min's architecture is a massive advantage here. It is *not* AI. It is *not* machine learning. It is a deterministic, rule-based engine that searches for keyword matches in structured data. This means: (a) every output is explainable ("this household failed the KYC check because no task containing 'kyc' or 'suitability' was found"), (b) there is no black-box risk, (c) the firm can verify any output by looking at the underlying Salesforce data. Lisa's AI Risk Alert concerns are largely defused. But the firm must understand this distinction well enough to explain it — if Sarah calls Min "AI" in front of the examiner, it will trigger a much deeper line of questioning.

---

#### Request 9: Records of all supervisory reviews conducted during the examination period, including: the reviewer's identity, the scope of each review, findings, and corrective actions taken

**What she's asking for:** Evidence that supervision actually happens.

**What she's really looking for:** Lisa wants to see a pattern of regular, substantive supervisory review — not a single annual review crammed into December. She's checking whether supervision is proactive (finding problems before they affect clients) or reactive (responding to complaints or regulatory inquiries). She also wants to verify that the designated supervisory person (typically the CCO or COO) is actually performing reviews, not delegating them to junior staff without oversight.

**Good response:** Sarah produces Min's audit trail export for the examination period, showing a continuous record of compliance scans, triage actions, and dismissals with reasons. The audit trail demonstrates: (a) regular cadence (scans run weekly or bi-weekly per household), (b) substantive review (dismiss reasons reference specific client circumstances, not generic "N/A"), (c) remediation follow-through (flagged issues led to task creation and eventual resolution), (d) multiple reviewers (Sarah and at least one other qualified person).

**Red flag response:** Supervisory reviews are quarterly at best. The audit trail shows long gaps (weeks without any compliance activity). Dismiss reasons are perfunctory ("reviewed and dismissed," "not applicable," "will address later"). Remediation tasks were created but never completed.

**Does Min help or hurt?** **Helps powerfully — this is the audit trail's primary purpose.** Every Min action creates a `MIN:AUDIT` Salesforce Task with timestamp, actor, action, result, and detail. The audit trail is exportable as both plaintext (TXT) and PDF. For a 90-day examination period, Sarah can produce a complete chronological record of every compliance action taken through Min. The audit trail includes: triage resolutions, triage dismissals (with mandatory reasons), triage snoozes (with selected option), compliance scan executions, compliance scan recordings, and compliance scan abandonments (yes — Min logs when a user starts a compliance scan and leaves without recording the results, including how many failures were present at the time of abandonment). This level of documentation is rare and impressive.

---

#### Request 10: Any communications, marketing materials, or disclosures related to the Firm's use of technology in managing client accounts or compliance functions

**What she's asking for:** Client-facing disclosures about technology use.

**What she's really looking for:** The 2024 AI Risk Alert specifically flagged firms that use AI or technology-assisted tools without adequate disclosure to clients. Lisa is checking whether Ridgeline's ADV brochure, client agreements, or other communications mention the use of technology for compliance monitoring. She's also checking whether any marketing materials overstate what the technology does — for example, claiming "AI-powered compliance" when the tool is rule-based, or implying that technology monitoring eliminates compliance risk.

**Good response:** Sarah produces the updated ADV supplement that describes "technology-assisted compliance monitoring" in accurate, non-promotional terms. The disclosure explains that the firm uses a technology platform to assist with compliance monitoring and documentation, that the platform is one component of the firm's broader supervisory program, and that all technology outputs are reviewed by qualified personnel before action is taken.

**Red flag response:** No disclosure exists. Or: marketing materials claim that Min provides "automated compliance" or "AI-driven regulatory protection." Or: the firm's ADV doesn't mention technology-assisted monitoring despite adding it 90 days ago.

**Does Min help or hurt?** **Hurts — because Min doesn't provide disclosure templates.** Min doesn't generate ADV language, client disclosure templates, or marketing compliance guidance. The firm is responsible for accurately describing Min in its regulatory filings and client communications. If the firm describes Min as "AI" (it isn't) or "automated compliance" (it requires human review), the examiner will flag a disclosure deficiency. Min should proactively provide: (a) suggested ADV language describing its rule-based methodology, (b) a client FAQ template, (c) guidance on what *not* to say about the platform. This documentation gap creates unnecessary risk for the firm.

---

**Production Timeline and Format**

All documents should be produced electronically in PDF, Excel, or native format as appropriate. If the Firm uses a document management system, the staff may request direct access during the on-site examination.

The on-site portion of this examination is scheduled for [dates — 3 consecutive business days]. The examination team will consist of two staff members. Please designate a primary contact and ensure that the Firm's Chief Compliance Officer and any personnel responsible for technology systems are available during the on-site period.

If you have any questions regarding this request, please contact the undersigned at the number below.

Sincerely,

**Lisa Nakamura**
Senior Examiner
Division of Examinations
U.S. Securities and Exchange Commission
Atlanta Regional Office

---

### Document Request Scorecard: How Min Affects Ridgeline's Response

| Request | Min Impact | Assessment |
|---------|-----------|------------|
| 1. Form ADV | Moderate help | ADV delivery tracking via compliance checks; cannot verify ADV content |
| 2. Supervisory procedures | Neutral | Min provides no supervisory procedure templates; firm must document Min's role independently |
| 3. Vendor inventory | Hurts | No vendor due diligence packet, no SOC 2, no security documentation for examiner review |
| 4. Recommendation records | Significant help | Suitability compliance checks flag undocumented recommendations before examiner finds them |
| 5. Complaint log | Neutral | No complaint-specific tracking module |
| 6. Account documentation (10 selected) | Strong help | Account-type-specific compliance checks (trust, retirement, entity) identify gaps proactively |
| 7. Data security program | Mixed | Strong PII scrubbing in audit; gap in SF task description plaintext; no packaged security documentation |
| 8. Technology platform description | Enormous help (if used correctly) | Rule-based architecture defuses AI concerns; mandatory dismiss reasons demonstrate independent judgment |
| 9. Supervisory review records | Powerful help | 90-day audit trail with continuous documentation, abandonment logging, dismiss reasons |
| 10. Technology disclosures | Hurts | No ADV language templates, no disclosure guidance, no marketing compliance guardrails |

**Net assessment of pre-examination readiness:** Min helps Ridgeline respond to 5 of 10 requests substantively. It is neutral on 2 requests. It actively hurts on 3 requests — all related to documentation that Min should provide but doesn't (vendor due diligence, supervisory procedure templates, disclosure guidance). Sarah's preparation quality depends entirely on whether she understands Min well enough to translate its technical capabilities into examiner-ready documentation.

---

## Part 3: The Three-Day On-Site Examination

### Day 1: Technology and Systems Review

*Monday, 8:15 AM. Lisa Nakamura arrives at Ridgeline Wealth Partners' Nashville office fifteen minutes before the scheduled 8:30 start. She badges in at reception, accepts a visitor pass, and declines the offered coffee. She notices the office layout: open floor plan, five advisor offices along the window wall, a glass-walled conference room, and a cluster of operations desks near the kitchen. Three monitors are visible at the ops desks. One of them is showing something she hasn't seen before — a dashboard with colored cards and a number "7" in a red circle.*

*She writes in her notepad: "Ops desk — unknown dashboard application — red indicator showing 7 items."*

*Sarah Kendrick meets her in the lobby at 8:28.*

---

#### Scene 1: Opening Conference (8:30 – 9:15 AM)

**Lisa:** "Good morning, Ms. Kendrick. I'm Lisa Nakamura, Senior Examiner with the SEC's Division of Examinations. Thank you for hosting us. Before we begin, I want to set expectations. This is a routine examination — we conduct these regularly as part of our risk-based program. Our goal is to assess the firm's compliance with applicable securities laws and regulations. We'll be here for three days. I'll need access to your systems, time with key personnel, and the ability to request additional documents as questions arise. Is the firm's Chief Compliance Officer available?"

**Sarah:** "Thank you, Lisa. Yes — David Ridgeway serves as our designated CCO. He's available all three days, though he has client meetings tomorrow afternoon. I'm the primary operational contact and I oversee our day-to-day compliance monitoring. We've prepared a conference room for you with network access and a printer."

**Lisa:** "Perfect. I reviewed the documents you produced in response to our request letter. I have some follow-up questions, but let's start with a general overview. Walk me through how the firm monitors its compliance obligations on a daily basis."

**Sarah:** "We have a multi-layered approach. Our compliance manual — which you have — outlines the supervisory procedures. SmartRIA handles our annual compliance calendar and policy management. And about ninety days ago, we deployed a technology platform called Min that connects to our Salesforce CRM and provides real-time compliance monitoring, triage of operational issues, and an audit trail of all actions taken."

*Lisa writes: "Min — technology platform — deployed ~90 days — connected to Salesforce — compliance monitoring + triage + audit trail. SmartRIA = separate compliance calendar. Two systems."*

**Lisa:** "I noticed your ADV supplement was updated eight weeks ago to reference 'technology-assisted compliance monitoring.' Is Min what that refers to?"

**Sarah:** "Yes, exactly."

**Lisa:** "Tell me what Min does. In your own words — not the vendor's marketing language."

**Sarah:** "Min reads our Salesforce data — household records, tasks, contacts, DocuSign status — and runs compliance checks against each household. It flags things like missing suitability documentation, unsigned envelopes that have been sitting too long, overdue tasks, households that haven't been reviewed recently. It gives each household a health score based on four factors: compliance coverage, DocuSign completion speed, task timeliness, and meeting frequency. And it surfaces the most urgent issues in a triage queue each morning. Everything we do in Min — every action, every dismissal, every compliance scan — gets logged to an audit trail that's stored back in Salesforce as task records."

*Lisa writes: "Min = reads SF data, runs compliance checks, health scores (4 factors), triage queue, audit trail stored as SF Tasks. Claims real-time. Claims everything logged."*

**Lisa:** "Does Min make recommendations? Does it tell your advisors what to do?"

**Sarah:** "It flags issues and prioritizes them. The triage queue ranks items by urgency — things due now, things due today, things to address this week. But it doesn't make investment recommendations or take any autonomous action. Every item in the triage queue requires a human to review it and choose to resolve, dismiss, or snooze it. And if you dismiss something, you have to provide a reason — you can't just click 'dismiss' and move on."

*Lisa circles "mandatory dismiss reasons" in her notepad and writes "verify" next to it.*

**Lisa:** "Is Min powered by artificial intelligence or machine learning?"

**Sarah:** *pauses* "I — honestly, I'm not sure how to characterize it technically. It's not like ChatGPT. It doesn't learn from our data or generate new text. It runs specific checks based on rules — like, 'does this household have a task with the word suitability in it.' So I'd call it rule-based rather than AI."

*Lisa writes: "COO describes as rule-based, not AI/ML. Uncertain on technical characterization — potential ADV disclosure issue if described as 'technology-assisted' without specificity. VERIFY architecture."*

> **Examiner's internal note:** *Sarah's answer is good but imprecise. The fact that she hesitated suggests the firm hasn't formalized its understanding of Min's methodology — which means its ADV language may be similarly imprecise. I'll need to see the actual system to confirm the rule-based claim. If it's genuinely rule-based, the firm's supervision burden is significantly lower than if it were ML-based. But the ADV should say "rule-based" explicitly, not just "technology-assisted."*

**Concern level: YELLOW** — The firm is using a compliance technology platform but may not have adequately documented its methodology in regulatory filings or supervisory procedures.

---

#### Scene 2: The Triage Walkthrough (9:30 – 10:30 AM)

**Lisa:** "I'd like to see Min in action. Can you show me the dashboard I noticed on the operations desk when I walked in?"

**Sarah:** "Of course." *She logs in to Min on the conference room display.* "This is our home screen. The triage queue is at the top — these are the items Min has identified as needing attention today, ranked by urgency."

**Lisa:** "How many items does it show?"

**Sarah:** "It caps at a configurable number — right now we have it set to show the top items. Today it's showing five."

**Lisa:** "Walk me through the first one."

**Sarah:** "This is the Thompson household — $4.7 million. Min is flagging it because there's no compliance review on record, three overdue tasks, and no advisor meeting logged in 47 days. The health score is 55 — that's in our 'at risk' range, below 60."

**Lisa:** "What are the four components of the health score?"

**Sarah:** "Compliance coverage — that's 30% of the score. DocuSign velocity — how quickly envelopes get signed — that's 25%. Tasks on time — 25%. And meeting coverage over the last 90 days — 20%."

*Lisa writes: "Health score weights: compliance 30%, DocuSign 25%, tasks 25%, meetings 20%. Thompson: 55/100 = at-risk. 3 overdue tasks, 47 days no meeting, no compliance review."*

**Lisa:** "If I were to calculate this score myself using your Salesforce data, would I get the same number?"

**Sarah:** "Yes — everything Min calculates comes directly from Salesforce. There's no separate data store."

**Lisa:** "Good. I'll want to verify that for a few households later. Now — what do you do with this triage item? Walk me through the decision."

**Sarah:** "I have three options: resolve, dismiss, or snooze. If I click resolve, it navigates me to the relevant workflow — in this case, I'd go to the compliance scan for the Thompson household. If I click dismiss, it asks me for a reason — and the reason is mandatory, I can't skip it. If I click snooze, it gives me contextual options — for Thompson, it shows 'Tomorrow,' 'Next Monday,' and 'In 2 weeks.'"

**Lisa:** "Let's test the dismiss function. Can you dismiss this item for me?"

**Sarah:** *clicks dismiss* "See — it's prompting me for a reason. I have to type something before I can confirm."

**Lisa:** "What's the minimum? Can you type a single character?"

**Sarah:** *types "x"* "It... it lets me submit that."

*Lisa writes: "Dismiss reason: mandatory but no minimum length or quality validation. 'x' accepted as valid reason. CONCERN — mandatory field is necessary but not sufficient."*

**Lisa:** "After you dismiss, where does that reason go?"

**Sarah:** "It's logged to the audit trail — I can show you." *She navigates to the audit screen.* "Here — you can see the record. 'triageDismiss — success,' timestamp, actor — that's me — and the reason in the detail field."

**Lisa:** "Is there a way to edit or delete that audit record after the fact?"

**Sarah:** "I... don't think so? The records are stored as Salesforce Tasks. Let me check."

*Lisa writes: "Audit records = SF Tasks. COO uncertain whether they can be edited. CRITICAL QUESTION — append-only enforcement."*

> **Examiner's internal note:** *The mandatory dismiss reason is excellent — most firms I examine have no documentation at all for why flagged items were overridden. But "mandatory" only works if the reason is substantive, and a single-character input passes validation. This is a design gap, not a compliance failure — the tool enables documentation but doesn't enforce quality. I also need to verify whether audit records are truly immutable. If they're standard Salesforce Tasks, they can be edited by anyone with the right permissions unless the firm has deployed validation rules to prevent it.*

**Concern level: YELLOW** — Dismiss reasons are mandatory (good) but lack quality enforcement (gap). Audit trail immutability depends on Salesforce configuration, not Min's architecture.

---

#### Scene 3: NIGO Correction Trace (10:30 – 11:15 AM)

**Lisa:** "I want to trace a specific workflow end-to-end. You mentioned the Garrison acquisition — can you show me a household that came from that acquisition and walk me through how Min handles it?"

**Sarah:** "Sure. Let me pull up the Patel household. They came over from Garrison — $620,000. Min is flagging an unsigned beneficiary designation form for their IRA. It's been sitting in DocuSign for six days."

**Lisa:** "How did Min detect the unsigned form?"

**Sarah:** "Min reads the task list from Salesforce. There's a task — 'SEND DOCU — Patel IRA Beneficiary Form' — that's been in 'Not Started' status. Min's triage engine picks up high-priority tasks that haven't been acted on and surfaces them based on age and priority."

**Lisa:** "What happens if someone completes the task in Salesforce but doesn't use Min?"

**Sarah:** "Min would see the updated status the next time it refreshes. The triage item would disappear because the underlying task is no longer overdue."

**Lisa:** "How often does Min refresh?"

**Sarah:** "Every time you navigate to a screen, it pulls fresh data from Salesforce. There's no cached layer — it's always reading live data."

*Lisa writes: "Min = real-time read from SF. No cache. Triage items resolve when underlying SF data changes. VERIFY — ask about custodial data freshness vs. SF data freshness."*

**Lisa:** "I want to understand the NIGO prevention for this account type. What specific checks does Min perform for an IRA account?"

**Sarah:** "For retirement accounts, Min checks for RMD tracking documentation, PTE compliance — that's the DOL's Prohibited Transaction Exemption for rollovers — and the standard checks like beneficiary designations, suitability profiles, and document completeness."

**Lisa:** "If I were opening a new IRA account through your firm today, what would Min flag if the beneficiary form was missing?"

**Sarah:** "It would show up in the compliance scan as a 'fail' result for the beneficiary-designation check. And if a DocuSign envelope was created but unsigned, it would appear in the triage queue once it exceeded our threshold — we have that set at a few days for unsigned documents."

*Lisa writes: "IRA-specific checks: RMD, PTE, beneficiary, suitability, completeness. DocuSign tracking by age. Thresholds configurable. NIGO detection is deterministic — rules, not predictions."*

**Lisa:** "Let me ask a harder question. When has Min been wrong? Can you show me a case where Min flagged something that wasn't actually a problem?"

**Sarah:** *thinks* "Yes — actually, a good example. The Jackson household. Min flagged them for having two overdue tasks and a DocuSign envelope unsigned for twelve days. But Mr. Jackson was in the hospital for emergency surgery. We deliberately paused all paperwork at the family's request. Min didn't know that — it just saw overdue items and flagged them."

**Lisa:** "What did you do?"

**Sarah:** "We dismissed the triage items with a reason — I wrote something like 'Client hospitalized, all paperwork paused per family request, will resume when client recovers.' It's in the audit trail."

**Lisa:** "Can you show me that entry?"

**Sarah:** *navigates to audit trail, searches* "Here it is. triageDismiss — success. Detail: 'Client hospitalized — paperwork paused per family request — resume on recovery.'"

*Lisa writes: "False positive handled correctly. Dismiss reason is substantive and specific. Audit trail captures the context. GOOD — this is exactly what I want to see. The tool flagged, the human overrode with documented judgment."*

> **Examiner's internal note:** *This is the strongest evidence so far that the firm is using Min as a tool, not a crutch. The Jackson example demonstrates: (1) Min flagged an issue, (2) the firm evaluated it independently, (3) the firm made a judgment call to override, (4) the override was documented with specific reasoning. This is the textbook use of technology-assisted supervision. I'll note this as a positive finding.*

**Concern level: GREEN** — The firm demonstrated appropriate independent judgment when overriding a technology flag, with documented reasoning.

---

#### Scene 4: Audit Trail Deep Examination (11:15 AM – 12:30 PM)

**Lisa:** "I want to spend serious time with the audit trail. Can you export the last 90 days?"

**Sarah:** "Absolutely." *She navigates to the audit screen.* "I can export as text or PDF. The PDF version includes a header with the date range and totals."

**Lisa:** "Give me the PDF."

*Sarah initiates the PDF export. The document generates and downloads.*

**Lisa:** *reviewing the PDF* "I see entries for: triageResolve, triageDismiss, triageSnooze, complianceScan, complianceScanRecorded, complianceScanAbandoned... wait. 'ComplianceScanAbandoned.' What does that mean?"

**Sarah:** "If someone starts a compliance scan on a household and leaves the screen without recording the results, Min logs it. It even notes how many failures were present when the scan was abandoned."

*Lisa looks up from the PDF.*

**Lisa:** "Min tracks when your staff walks away from a compliance problem?"

**Sarah:** "Yes."

*Lisa writes: "ABANDONMENT LOGGING. Min records when compliance scans are started but not completed, including failure count at time of abandonment. This is sophisticated. I have not seen this in any other platform. VERY GOOD."*

**Lisa:** "Let me ask about the format. Each entry has: action, result, actor, timestamp, detail. Where's the household identifier?"

**Sarah:** "It should be in the description field — the full record includes the household name and ID."

**Lisa:** "I see 'Household: Thompson' in some entries but not all. Is the household always captured?"

**Sarah:** "For household-specific actions, yes. For system-level actions like... actually, I think all audit entries should have a household. Let me check."

*Lisa writes: "Household attribution may be inconsistent across audit entry types. VERIFY — some entries may lack household context."*

**Lisa:** "Now — the critical question. These audit records are Salesforce Tasks. That means they're governed by your Salesforce sharing rules and record-type permissions. Who in your org can edit a completed Task?"

**Sarah:** "Our Salesforce admin... I think system administrators can edit any record. But we have a validation rule that prevents editing Tasks with the 'MIN:AUDIT' prefix in the subject."

**Lisa:** "When was that validation rule deployed?"

**Sarah:** "It was... I'd need to check with our Salesforce admin. It was part of the Min implementation."

**Lisa:** "I'd like to verify that validation rule. Can your admin show me the Salesforce Setup page for Task validation rules?"

*Sarah calls the Salesforce admin. After a few minutes, the admin pulls up the validation rule.*

**Lisa:** *reviewing the screen* "I see the validation rule. It prevents editing Tasks where the subject contains 'MIN:AUDIT' — except for system administrators. Why the system administrator exception?"

**Sarah:** "I think that's a Salesforce requirement — system admins always have full access."

*Lisa writes: "Validation rule exists but has sysadmin bypass. In theory, a system administrator could edit or delete audit records. This is a limitation of using SF Tasks for audit storage. Not a compliance failure per se — but the firm should document the risk and have compensating controls (e.g., login history review, setup audit trail monitoring)."*

> **Examiner's internal note:** *The audit trail architecture is stronger than I expected. Using Salesforce Tasks means the firm owns its own audit data (good — no vendor lock-in, no "who watches the watchman" problem). The validation rule prevents casual editing (good). But the sysadmin bypass means the audit trail is not truly tamper-evident. For most firms this is fine — they're not going to tamper with their own audit records. But for examination purposes, I need to note that the audit trail's integrity depends on Salesforce access controls, not cryptographic guarantees. The abandonment logging is genuinely impressive and rare.*

**Concern level: YELLOW** — Audit trail is comprehensive and well-structured, but not cryptographically tamper-evident. Sysadmin bypass exists. Compensating controls recommended.

---

#### Scene 5: Business Continuity (1:30 – 2:15 PM)

**Lisa:** "Let's talk about what happens when Min goes down. If the Min platform is unavailable — server outage, vendor goes out of business, contract dispute — what happens to your compliance program?"

**Sarah:** "All of our data is in Salesforce. Min doesn't store anything independently. If Min disappeared tomorrow, we'd still have every household record, every task, every compliance review, every audit entry — all as Salesforce records. We'd lose the dashboard, the triage queue, the health scores, and the automated compliance scanning. We'd go back to doing what we did before Min — manual spreadsheet reviews, individual household checks, SmartRIA for the compliance calendar."

**Lisa:** "How long would it take you to resume normal operations without Min?"

**Sarah:** "Honestly? We could operate the same day. It would be slower — my morning review would go from two minutes back to forty minutes. Compliance scans that take thirty seconds would become manual checklist reviews that take an hour per household. But we could do it. The data is all there."

**Lisa:** "What about the audit trail? If Min is unavailable, how do you continue logging compliance actions?"

**Sarah:** "We'd go back to manual Salesforce task creation. Before Min, we logged compliance reviews as tasks in Salesforce — we just did it by hand. Min automated the logging and added structure, but the underlying mechanism is the same."

*Lisa writes: "BCP: strong. All data in SF. Min is overlay, not infrastructure. Firm can operate without Min (slower but functional). Audit trail mechanism = SF Tasks regardless. No single-vendor dependency on data. GOOD."*

> **Examiner's internal note:** *This is the right architecture. The firm's data doesn't depend on the vendor. If Min vanishes, the firm loses convenience but not capability. This is a significant positive finding — many firms I examine have deep vendor dependencies where the loss of a platform means the loss of data. The Salesforce-as-foundation approach eliminates that risk.*

**Concern level: GREEN** — Strong business continuity posture. No data dependency on Min. All records persist independently in Salesforce.

---

#### Scene 6: End of Day 1 Review (4:00 – 4:30 PM)

*Lisa spends the final thirty minutes of Day 1 organizing her notes and flagging items for Day 2.*

**Day 1 Summary — Lisa's Workpaper Notes:**

| Topic | Finding | Concern Level | Follow-Up Needed |
|-------|---------|--------------|-----------------|
| Min methodology | Rule-based, not AI/ML — COO description largely accurate | Green | Verify architecture technically on Day 2 |
| Triage queue | Deterministic prioritization, configurable thresholds, mandatory dismiss reasons | Green/Yellow | Test dismiss reason quality across full 90-day export |
| NIGO detection | Account-type-specific checks, DocuSign tracking, threshold-based escalation | Green | Spot-check against custodial records |
| Audit trail | Comprehensive, includes abandonment logging, stored as SF Tasks with validation rule | Yellow | Sysadmin bypass concern; verify validation rule scope |
| False positive handling | Jackson example demonstrated appropriate override with documentation | Green | Review all dismissals for pattern of substance |
| Business continuity | All data in Salesforce; Min is overlay; firm can operate without it | Green | No further action needed |
| ADV disclosure | "Technology-assisted" language may be insufficiently specific | Yellow | Review ADV language against actual Min capabilities |
| Supervisory procedures | Need to verify compliance manual describes Min's role | Yellow | Request section on technology supervision |

---

### Day 2: Deep Dives and Supervisory Assessment

*Tuesday, 8:15 AM. Lisa arrives and notices the same operations desk showing Min's dashboard. The red "7" from yesterday is now a "5." She notes this without comment.*

---

#### Scene 7: Supervision of Approve/Dismiss Decisions (8:30 – 10:00 AM)

**Lisa:** "Ms. Kendrick, I want to understand the supervisory layer on top of Min. When Min flags an issue and your operations team dismisses it, who reviews that dismissal?"

**Sarah:** "I review all dismissals. I check the audit trail at least weekly — usually more frequently — to make sure the reasons are substantive and appropriate."

**Lisa:** "Is that documented anywhere? Is there a procedure that says 'Sarah reviews all dismissals weekly'?"

**Sarah:** *hesitates* "It's... it's what I do. I'm not sure it's written in the compliance manual explicitly."

**Lisa:** "Let me reframe. Your compliance manual describes supervisory review procedures. Does it specifically address who reviews technology-generated flags and the decisions made in response to those flags?"

**Sarah:** "I'd need to check the specific language. I know we added a section about Min when we updated the ADV, but I'm not certain the compliance manual was updated at the same time."

*Lisa writes: "Supervisory procedures may not explicitly address Min-generated flags. COO reviews dismissals informally but no documented procedure. CONCERN — Section 203(e)(6) requires written supervisory procedures reasonably designed to prevent violations. If Min is part of the supervision program, procedures must describe oversight of Min outputs."*

**Lisa:** "Here's my concern, and I want to be direct. Min generates flags. Your team acts on those flags — resolving, dismissing, or snoozing them. That's a supervisory function. If the written supervisory procedures don't describe this process — who reviews Min's outputs, how often, what constitutes an acceptable dismiss reason, who escalates concerns — then you have an undocumented supervisory process. That's a procedural gap, not a substantive one. But it's the kind of gap I have to note."

**Sarah:** "I understand. We should formalize that."

**Lisa:** "Have you replaced any manual compliance checks with Min? Things you used to do by hand that you now rely on Min to flag?"

**Sarah:** "We haven't *eliminated* anything. SmartRIA still runs our annual compliance calendar. But honestly — yes, in practice, I've stopped doing the weekly spreadsheet review that I used to do. Min's morning triage gives me a better picture in two minutes than my spreadsheet gave me in forty. So I've shifted my time from building the spreadsheet to reviewing Min's output."

*Lisa writes: "Delegation concern confirmed. COO has replaced manual spreadsheet review with Min triage. Not a compliance failure if Min is reliable and supervised — but must be documented as a supervisory procedure change. The firm chose to rely on a technology tool and should own that decision in writing."*

> **Examiner's internal note:** *This is the delegation question, and Sarah answered it honestly — which is more valuable than a rehearsed answer. The firm hasn't formally delegated supervision to Min, but in practice, Min has replaced the manual process. This is common and not inherently problematic. But the supervisory procedures must reflect reality. If the firm's written procedures describe a manual spreadsheet review that Sarah no longer performs, the procedures are outdated and potentially misleading.*

**Concern level: YELLOW** — Supervisory procedures likely do not describe the current Min-dependent workflow. Firm has informally replaced manual review with technology-assisted review without updating written procedures.

---

#### Scene 8: Vendor Risk Assessment (10:00 – 11:00 AM)

**Lisa:** "I want to discuss Min as a vendor. What due diligence did the firm perform before deploying Min?"

**Sarah:** "We evaluated it over a one-week period — I personally tested every feature. We reviewed its integration with Salesforce, confirmed it uses our existing authentication, and verified that it doesn't store data outside of Salesforce."

**Lisa:** "Do you have documentation of that evaluation?"

**Sarah:** "I have my notes from the evaluation. And we wrote the first evaluation up — it was a formal product evaluation document."

**Lisa:** "I'd like to see that. Now — did you request any security documentation from Min? SOC 2 report, penetration testing results, data processing agreement?"

**Sarah:** "I... no. We didn't request a SOC 2. I know Min encrypts the connection and uses Salesforce's OAuth, but I didn't ask for a formal security assessment."

**Lisa:** "Does Min have a SOC 2?"

**Sarah:** "I don't know."

*Lisa writes: "No vendor due diligence documentation beyond COO's evaluation notes. No SOC 2 requested or received. No DPA. No formal security assessment. COO evaluated functionality but not security posture. DEFICIENCY — Reg S-P requires reasonable policies for vendor data handling. Firm's vendor oversight program has a gap for this technology vendor."*

**Lisa:** "Let me understand Min's data flow. Where does Min run? Is it cloud-hosted? On-premises?"

**Sarah:** "It's a web application that I access through a browser. It connects to our Salesforce through the API. I believe it's cloud-hosted, but I don't know the specific infrastructure."

**Lisa:** "Does Min have access to client Social Security numbers?"

**Sarah:** "It can read whatever's in Salesforce. So if SSNs are in Salesforce — which they are for some fields — Min can theoretically access them. But the audit trail scrubs PII. I've seen that in the audit records — sensitive fields show as '[REDACTED]' instead of the actual values."

**Lisa:** "How do you know the scrubbing is comprehensive? Have you tested it?"

**Sarah:** "I haven't tested it systematically. I've seen it in practice — when I look at audit entries, I see redacted fields. But I haven't verified every possible PII field."

*Lisa writes: "Min accesses SF data including PII. Audit trail scrubs PII (SSN, DOB visible as [REDACTED]). COO has not independently verified scrubbing completeness. Firm is relying on vendor's self-reported privacy controls without independent verification. CONCERN — reasonable but unverified."*

> **Examiner's internal note:** *The vendor risk picture is mixed. Min's architecture is actually quite good for privacy — it reads from Salesforce (which the firm already trusts), scrubs PII before writing audit records, and stores audit data back in Salesforce (which the firm controls). But the firm hasn't documented any of this. Sarah knows these facts from experience but hasn't formalized them into a vendor risk assessment. This is a documentation deficiency, not a technical one — Min's actual data handling is reasonable, but the firm can't prove it performed due diligence.*

**Concern level: RED** — Vendor due diligence is inadequate. No SOC 2, no DPA, no formal security assessment. This is a clear deficiency under Regulation S-P's reasonable safeguards requirement.

---

#### Scene 9: The Five-Household Spot Check (11:00 AM – 12:30 PM)

**Lisa:** "I've selected five households for detailed review. I want to cross-reference Min's data against your Salesforce records and, where possible, against custodial records."

*Lisa has selected: (1) Rivera (healthy, on-track), (2) Patel (Garrison acquisition, unsigned DocuSign), (3) Chen (retirement account, RMD due), (4) Thompson (at-risk, multiple issues), (5) Whitfield (new client, minimal activity).*

**Lisa:** "Let's start with Rivera. Min shows a health score of 92 — your healthiest household. Pull up the Rivera record in both Min and Salesforce side by side."

*Sarah opens both screens.*

**Lisa:** "I see four contacts in the household, $1.2 million AUM. What's the compliance coverage score?"

**Sarah:** "Rivera shows 95 for compliance — they had a compliance review recorded two months ago."

**Lisa:** "Show me that compliance review in Salesforce."

*Sarah navigates to the Salesforce task record for the Rivera compliance review.*

**Lisa:** "I see the task record. 'Compliance review completed — 23 checks passed, 0 warnings, 0 failures.' Who performed this review?"

**Sarah:** "That was me — Sarah Kendrick."

**Lisa:** "How long did the review take?"

**Sarah:** "With Min? About thirty seconds for the automated scan, then maybe two minutes for me to review the results and record them."

*Lisa writes: "Rivera compliance review: 23 checks, 0 failures, ~2.5 minutes total. Need to verify this isn't rubber-stamping. Check time-to-approve metrics if available."*

**Lisa:** "Is there a way to see how long it takes between when Min shows compliance results and when the user records them? A time delta between 'scan complete' and 'review recorded'?"

**Sarah:** "I don't think Min tracks that specifically. The audit trail has timestamps for when the review was recorded, but not when the scan was displayed."

*Lisa writes: "NO TIME-TO-APPROVE METRIC. Cannot verify whether compliance results are being reviewed or rubber-stamped. This is a design gap — the tool should capture the time between result display and user action. Without this, I cannot distinguish between 'reviewed in 2 minutes' and 'clicked approve in 2 seconds.' CONCERN."*

**Lisa:** "Let's move to Chen. You mentioned an RMD due in 22 days. Show me the RMD tracking in Min and in Salesforce."

*Sarah pulls up the Chen household.*

**Sarah:** "Here's the triage item — 'Process RMD — Chen Traditional IRA.' It's flagged as high priority with the due date. And in Salesforce, here's the corresponding task."

**Lisa:** "What's the RMD amount and how was it calculated?"

**Sarah:** "Min doesn't calculate RMD amounts. It flags that an RMD-related task exists and is approaching its due date. The actual calculation is done by Schwab — they send us the RMD amount based on the prior year-end account value and the IRS life expectancy tables."

**Lisa:** "Good. I want to see the Schwab statement for this account. Does Min show custodial data?"

**Sarah:** "Min doesn't connect to Schwab directly. It only reads Salesforce. If the Schwab account value is in Salesforce, Min can display it, but it might lag by a day or so depending on when our team last updated the CRM."

*Lisa writes: "Min = CRM data only. No direct custodial feed. AUM and account values may lag custodian by T+1 or more. VERIFY — check Chen AUM in Min vs. Schwab statement."*

*Sarah produces the Schwab statement. The account value matches the Salesforce record within $200 (market movement from the previous day).*

**Lisa:** "Close enough. The variance is market movement. Now — Thompson. Min shows a health score of 55, 'at risk.' Three overdue tasks, no compliance review, no meeting in 47 days. Walk me through what you've done about this."

**Sarah:** "Thompson is a concern for us. The advisor — James Wilder — has been slow on follow-ups. I've escalated it twice through our internal process. Min has been flagging Thompson in the triage queue consistently. We've snoozed it once and then addressed two of the three overdue tasks. The compliance scan is scheduled for this week."

**Lisa:** "Show me the snooze record."

*Sarah navigates to the audit trail and finds the Thompson snooze entry.*

**Lisa:** "I see: 'triageSnooze — success. Detail: In 2 weeks.' That was three weeks ago. It re-surfaced after the snooze period and you still hadn't completed the compliance review?"

**Sarah:** "That's correct. We were focused on the Garrison migration accounts and Thompson fell behind. But Min kept surfacing it — it doesn't let things stay quiet."

*Lisa writes: "Thompson pattern: flagged → snoozed 2 weeks → re-surfaced → still not addressed for another week. Min re-surfaces snoozed items (GOOD — no permanent suppression). But firm took 3+ weeks to address an at-risk household. Operational concern, not technology concern."*

> **Examiner's internal note:** *The spot check reveals Min working correctly: healthy households check out, at-risk households are genuinely at risk, and the data matches Salesforce (and roughly matches the custodian). Thompson is a supervision concern — the firm snoozed an at-risk household and didn't follow through promptly — but Min's behavior is exactly right. It re-surfaced the item, logged the snooze, and provided a continuous record of the firm's delayed response. Ironically, Min's audit trail is the evidence I'd use to write the deficiency letter about the firm's supervision of Thompson.*

**Concern level: YELLOW** (Thompson supervision) / **GREEN** (Min data accuracy)

---

#### Scene 10: Regulation S-P — PII Handling Deep Dive (1:30 – 2:30 PM)

**Lisa:** "I want to trace how client PII flows through your systems, specifically through Min. I'm going to ask you to run a compliance scan on a household while I watch, and then we'll look at what data was transmitted and stored."

*Sarah runs a compliance scan on the Patel household. Lisa watches the screen.*

**Lisa:** "I see the scan results showing contact names — 'Raj Patel,' 'Priya Patel' — and email addresses. When you record this review, what gets stored in Salesforce?"

**Sarah:** "The compliance review task gets created with the household name, the check results — pass, warn, fail for each category — and any remediation steps."

**Lisa:** "Do the check results include contact PII?"

**Sarah:** "The task description includes contact names as part of the household context. But SSNs, dates of birth, account numbers — those are redacted in the audit trail."

**Lisa:** "Show me a Min audit record. I want to see what '[REDACTED]' looks like."

*Sarah pulls up an audit record.*

**Lisa:** "I see: 'Actor: Sarah Kendrick. Detail: Compliance scan recorded — 18 pass, 3 warn, 2 fail. Household: Patel.' No SSN, no DOB. Good. But the contact names are in plaintext — 'Raj Patel, Priya Patel' — in the task description."

**Sarah:** "Right. Names are in there. Is that a concern?"

**Lisa:** "Client names in a Salesforce Task aren't inherently a privacy issue — they're within your CRM system, which is already subject to your Reg S-P safeguards. But I want to confirm: does Min transmit this data to any system *outside* of Salesforce?"

**Sarah:** "No. Everything Min reads comes from Salesforce and everything it writes goes back to Salesforce. The only external transmission I know of is when we export a PDF — that goes through Min's backend to generate the document and then downloads to my browser."

**Lisa:** "Does the PDF contain client PII?"

**Sarah:** "It would include household names and contact names. Not SSNs or account numbers."

*Lisa writes: "PII flow: SF → Min (read) → SF (write). Audit records scrub sensitive PII (SSN, DOB, accounts). Contact names in plaintext in SF Tasks = within existing Reg S-P perimeter. PDF export transmits names through Min backend = transient PII exposure outside SF. ACCEPTABLE but firm should document this data flow."*

**Lisa:** "One more question. You mentioned Min uses Salesforce OAuth for authentication. Does Min store any Salesforce credentials — passwords, API tokens, refresh tokens?"

**Sarah:** "I log in through Salesforce — Min redirects me to the Salesforce login page and then I come back authenticated. I don't enter credentials into Min directly."

**Lisa:** "That's the OAuth flow. But Min needs to maintain a session — typically with a refresh token. Where is that stored?"

**Sarah:** "I honestly don't know the technical details of how the session is maintained."

*Lisa writes: "COO cannot describe token storage mechanism. Min stores OAuth tokens — likely in encrypted cookies (based on ADV description of 'secure authentication'). Firm should understand and document credential storage. Not a violation, but a due diligence gap."*

> **Examiner's internal note:** *Min's PII handling is actually quite good. The scrubbing of sensitive PII in audit records is a genuine privacy control. The fact that all data stays within the Salesforce ecosystem means the firm's existing Reg S-P controls apply. The PDF export is a minor transient exposure — client names pass through Min's backend but aren't stored. The main concern is that the firm can't articulate Min's security architecture — they're relying on a vendor they haven't fully evaluated. The technology is fine; the documentation is the gap.*

**Concern level: YELLOW** — PII handling is technically sound but inadequately documented by the firm. Vendor security posture not independently verified.

---

#### Scene 11: The AI Disclosure Question (2:30 – 3:15 PM)

**Lisa:** "I want to return to the ADV language. Your supplement says 'technology-assisted compliance monitoring.' I've now seen Min in operation. Based on what I've observed, Min appears to be a rule-based system that matches keywords in Salesforce data against predefined compliance requirements. Is that accurate?"

**Sarah:** "Yes, that's accurate."

**Lisa:** "It is not, in any meaningful sense, artificial intelligence. It doesn't learn, it doesn't predict, it doesn't generate recommendations based on patterns in historical data. Correct?"

**Sarah:** "Correct. It's more like a very sophisticated checklist."

**Lisa:** "Good. Now here's my concern. Your ADV says 'technology-assisted compliance monitoring' without specifying the methodology. In the current regulatory environment — and I'll reference the Division's 2024 AI Risk Alert — firms using technology for compliance or advisory functions face heightened scrutiny around disclosure. The question is whether 'technology-assisted' is sufficiently descriptive, or whether it could be interpreted by clients as implying AI or machine learning capabilities."

**Sarah:** "I see. We were trying to be accurate without being overly technical."

**Lisa:** "I'd recommend your ADV explicitly state that your compliance monitoring technology uses rule-based checks against structured CRM data, that it does not employ artificial intelligence or machine learning, and that all technology outputs are reviewed by qualified supervisory personnel before action is taken. This protects the firm in two ways: it prevents clients from over-relying on technology they don't understand, and it prevents examiners like me from spending half a day investigating an AI system that doesn't exist."

**Sarah:** "That's very helpful guidance. We'll update the language."

*Lisa writes: "ADV RECOMMENDATION: Update 'technology-assisted compliance monitoring' to specify: (1) rule-based, not AI/ML, (2) operates on structured CRM data, (3) human review required for all outputs. Not a deficiency — the current language isn't false. But it's ambiguous in a regulatory environment that scrutinizes technology claims."*

> **Examiner's internal note:** *This is an observation, not a deficiency. The firm's ADV language is technically accurate — Min is technology-assisted compliance monitoring. But regulatory ambiguity creates risk. If a client or plaintiff's attorney later claims the firm used 'AI' for compliance, the ADV's vague language won't help. The firm should get ahead of this with explicit, descriptive language. I'll include this as a recommendation, not a finding.*

**Concern level: GREEN** (current language is not false) / **YELLOW** (recommended improvement for clarity and regulatory protection)

---

#### Scene 12: End of Day 2 Review (4:00 – 4:30 PM)

**Day 2 Summary — Lisa's Workpaper Notes:**

| Topic | Finding | Concern Level | Follow-Up Needed |
|-------|---------|--------------|-----------------|
| Supervisory procedures | Do not explicitly address Min workflows or oversight of technology flags | Red/Yellow | Include in deficiency letter |
| Delegation of supervision | COO replaced manual review with Min triage; not documented as procedure change | Yellow | Include in deficiency letter |
| Vendor due diligence | No SOC 2, no DPA, no formal security assessment for Min | Red | Include in deficiency letter |
| Household spot checks | Data accurate across all 5 households; matches SF; close to custodial records | Green | No further action |
| Time-to-approve | Min doesn't track time between result display and user action | Yellow | Note as design observation; recommend product change |
| PII handling | Good scrubbing; all data within SF perimeter; PDF transient exposure acceptable | Yellow | Note documentation gap |
| AI disclosure | ADV language is accurate but ambiguous | Yellow | Recommend specificity |
| Thompson supervision | 3+ weeks to address at-risk household despite repeated Min flags | Yellow | Include in observations |

---

### Day 3: Targeted Testing and Exit

*Wednesday, 8:15 AM. Lisa arrives for the final day. She has two specific tests planned, followed by the exit interview.*

---

#### Scene 13: The 90-Day Audit Export Cross-Reference (8:30 – 10:30 AM)

**Lisa:** "Ms. Kendrick, I'd like to do something I don't normally get to do in examinations. I have your 90-day audit trail export from Min. I also have your Salesforce task records for the same period, which your admin exported for me yesterday. I'm going to cross-reference them."

**Sarah:** "Of course."

*Lisa spends ninety minutes comparing the two data sets. Her staff member assists with the comparison.*

**Lisa:** "I'm seeing good consistency. Every 'MIN:AUDIT' task in Salesforce corresponds to an entry in the Min export. I found three entries in the Min export that don't have corresponding Salesforce tasks — can you explain those?"

**Sarah:** "Let me look... these might be audit writes that failed silently. Min attempts to log everything, but if the Salesforce write fails — network issue, API limit — the audit entry might exist in the export but not in Salesforce."

**Lisa:** "So the export is generated from Salesforce data?"

**Sarah:** "Yes — the export reads from Salesforce Tasks."

**Lisa:** "Then how would the export show entries that don't exist in Salesforce?"

**Sarah:** "You're right — that doesn't make sense. Let me look more carefully at the IDs..."

*After review, the discrepancy turns out to be a filtering issue — the admin's Salesforce export used a different date range than the Min export. After correcting the date range, all records match.*

*Lisa writes: "90-day cross-reference: COMPLETE MATCH after date range correction. Every Min audit entry corresponds to a SF Task. No orphaned entries, no missing entries. Export is reliable and accurate. Audit trail integrity: VERIFIED for this examination period."*

**Lisa:** "Good. Now I want to look at dismiss patterns. How many triage items were dismissed in the last 90 days?"

**Sarah:** "Let me filter... I count 23 dismissals."

**Lisa:** "I want to read every dismiss reason."

*Lisa reviews all 23 dismiss reasons. She categorizes them:*

- **Substantive and specific** (14): References client circumstances, advisor conversations, pending actions, or documented business decisions. Examples: "Client hospitalized — paperwork paused per family request," "Duplicate flag — same issue tracked in SmartRIA annual review," "Advisor confirmed updated suitability questionnaire submitted via DocuSign yesterday — task will clear on next sync."
- **Adequate but generic** (6): Provides a reason but lacks specificity. Examples: "Being addressed separately," "Not applicable to this account type," "Will follow up next week."
- **Insufficient** (3): Too brief or uninformative. Examples: "ok," "handled," "n/a."

*Lisa writes: "Dismiss reason quality: 61% substantive, 26% adequate, 13% insufficient. Mandatory field works — 100% have reasons (unlike most firms). But 3 entries are effectively meaningless. 'ok' and 'handled' provide no examiner with any useful information about WHY the item was dismissed. Design recommendation: minimum character count and/or quality prompt. Compliance recommendation: supervisory review should catch these."*

**Lisa:** "Ms. Kendrick, I found three dismiss reasons that I consider insufficient: 'ok,' 'handled,' and 'n/a.' Can you tell me who entered these?"

**Sarah:** *checks audit trail* "Those were entered by Brett Langston — one of our associate advisors."

**Lisa:** "Was Brett's use of Min supervised? Did you review these dismissals?"

**Sarah:** "I review the audit trail weekly. I... I should have caught those. Honestly, I may have seen them and not flagged them because the underlying issues were actually resolved — I can verify the Salesforce tasks were completed."

**Lisa:** "I appreciate the honesty. The underlying tasks being resolved is important — it means the dismiss didn't mask a real problem. But the dismiss reason is the documentation of *why* the human overrode the technology flag. 'Ok' doesn't tell me anything. It doesn't tell the next examiner anything. And it doesn't tell your firm's compliance record anything. This is a supervision gap."

*Lisa writes: "3/23 insufficient dismiss reasons from single associate advisor. Underlying issues were resolved (mitigating). COO did not catch during weekly review (supervision gap). Recommend: (1) minimum character/quality enforcement in Min, (2) supervisory review checklist for dismiss reason quality, (3) associate advisor training on documentation standards."*

> **Examiner's internal note:** *This is a nuanced finding. The mandatory dismiss reason works — 100% compliance with the field. But 13% of entries are essentially empty compliance. The fact that it's concentrated in one user (an associate advisor) suggests a training issue, not a systemic problem. The COO's weekly review should have caught this. I'll note it as an observation with recommendations, not a deficiency — because the underlying issues were resolved and the dismiss reasons, while poor, don't mask actual compliance failures.*

**Concern level: YELLOW** — Dismiss reason quality varies by user. Supervisory review of dismiss reasons not consistently catching insufficient documentation.

---

#### Scene 14: The Rubber-Stamp Test (10:30 – 11:30 AM)

**Lisa:** "I want to examine something I flagged on Day 1. Min doesn't track the time between when compliance results are displayed and when a user records them. I'm going to look at the timestamps in your audit trail to see if I can infer review times."

*Lisa examines audit trail timestamps for compliance scans:*

| Household | Scan Recorded Timestamp | Prior Action Timestamp | Implied Gap |
|-----------|------------------------|----------------------|-------------|
| Rivera | 10:14:23 AM | 10:11:45 AM (scan started) | ~2.5 minutes |
| Patel | 10:22:07 AM | 10:18:30 AM (scan started) | ~3.5 minutes |
| Chen | 2:45:12 PM | 2:41:00 PM (scan started) | ~4 minutes |
| Nakamura | 10:31:44 AM | 10:30:02 AM (scan started) | ~1.7 minutes |
| Thompson | — | — | Not yet recorded |
| O'Brien | 11:05:33 AM | 10:58:12 AM (scan started) | ~7 minutes |
| Jackson | 3:12:45 PM | 3:11:30 PM (scan started) | ~1.25 minutes |

*Lisa writes: "Implied review times range from ~1.25 to ~7 minutes. O'Brien (7 min) had failures requiring remediation review. Jackson (1.25 min) had all passes. These times seem reasonable — but I'm inferring from gaps between audit entries, not from actual time-to-approve data. A 1.25-minute review of an all-pass scan is plausible. A 1.25-minute review of a scan with failures would be concerning."*

**Lisa:** "I notice the Jackson scan took about 75 seconds between start and recording. Jackson had... how many check results?"

**Sarah:** "Jackson had 20 checks — I think they were mostly passes with a couple of warnings."

**Lisa:** "Is 75 seconds enough time to review 20 compliance check results?"

**Sarah:** "For an all-pass or mostly-pass scan, yes. You're essentially confirming that everything looks right. If there were failures, I'd spend more time — like with O'Brien, which took seven minutes because I was reviewing the failed checks and creating remediation tasks."

**Lisa:** "That's a reasonable answer. But here's my observation for the record: without explicit time-to-approve tracking, neither you nor I can distinguish between a 75-second deliberate review and a 75-second rubber stamp. Your firm should consider requesting that Min add this metric. It protects you as much as it protects your clients."

*Lisa writes: "RUBBER STAMP ASSESSMENT: Current evidence suggests genuine review (time varies by complexity, failures get more time). But evidence is circumstantial — inferred from timestamp gaps, not direct measurement. Min should add explicit time-to-approve tracking. This is a product design recommendation, not a compliance deficiency — the firm is not required to have this metric, but having it would strengthen the supervisory record."*

**Lisa:** "One more thing. I noticed Min has a 5-second undo window after dismiss and snooze actions. Does that concern you?"

**Sarah:** "The undo? It's just a safety net in case you accidentally dismiss the wrong item."

**Lisa:** "I understand its purpose. But from a documentation perspective, if someone dismisses an item and immediately undoes it within 5 seconds, is the original dismiss action logged?"

**Sarah:** "I believe the undo removes the action — so only the final state is logged."

*Lisa writes: "5-second undo window: if used, original action may not be logged. This means the audit trail reflects the final decision, not the decision-making process. ACCEPTABLE for user experience purposes, but the firm should be aware that the undo window creates a brief gap in audit completeness."*

> **Examiner's internal note:** *The rubber-stamp risk is real but manageable. The timestamp evidence suggests genuine review with time proportional to complexity. The 5-second undo is a minor documentation gap — acceptable for UX but should be disclosed to the firm. The bigger issue is the absence of explicit time-to-approve tracking. This is a product design issue, not a firm compliance issue, but I'll recommend it because it would strengthen the firm's supervisory record significantly.*

**Concern level: YELLOW** — No direct evidence of rubber-stamping, but absence of time-to-approve metric means inability to prove deliberate review.

---

#### Scene 15: Exit Interview (1:30 – 3:00 PM)

*Lisa and her staff member meet with Sarah Kendrick and David Ridgeway (CEO/CCO) in the conference room.*

**Lisa:** "Mr. Ridgeway, Ms. Kendrick, thank you for your cooperation over the past three days. Before I discuss our preliminary observations, I want to emphasize that these are preliminary — our formal findings will be communicated in writing after our workpapers are reviewed by the branch chief. I also want to say that your cooperation has been exemplary. Ms. Kendrick in particular has been transparent, knowledgeable, and forthcoming, including about areas where the firm has gaps. That level of honesty makes examinations more productive for everyone."

**David:** "Thank you, Lisa. We take compliance seriously and we appreciate the feedback."

**Lisa:** "I'll organize my preliminary observations into three categories: areas of strength, areas of concern, and recommendations."

**Lisa:** "Areas of strength. First, your audit trail. The Min platform provides a continuous, detailed record of compliance actions that is significantly more comprehensive than what I typically see in firms of your size. The mandatory dismiss reasons, the abandonment logging, and the chronological completeness are genuinely impressive. Second, your false positive handling — the Jackson example demonstrated that your team exercises independent judgment when overriding technology flags, and documents the reasoning. Third, your business continuity posture — the fact that all data resides in Salesforce means you're not dependent on a single vendor for your compliance records. And fourth, the fact that Min is rule-based rather than AI-based significantly simplifies your supervisory obligations and disclosure requirements."

**David:** "That's good to hear."

**Lisa:** "Areas of concern. First and most significant: vendor due diligence. You deployed a technology platform that accesses client data and generates compliance outputs without performing a formal vendor risk assessment, without obtaining a SOC 2 report or equivalent, and without executing a data processing agreement. This is a Regulation S-P issue and it will appear in our findings."

"Second: your supervisory procedures do not adequately describe Min's role in your compliance program. If Min is part of how you supervise, your written procedures need to say so — who reviews Min's outputs, how often, what constitutes an adequate response, and who has oversight of the process."

"Third: dismiss reason quality. Three of twenty-three dismissals had insufficient reasoning. Your weekly review process didn't catch them. This is a supervision gap — minor, but it suggests the review process needs formalization."

**David:** "These are all fixable."

**Lisa:** "They are. And I want to be clear — none of these are enforcement-level concerns. These are the kinds of procedural gaps I see in well-run firms that adopted new technology without fully updating their compliance infrastructure. The technology itself is sound. The implementation is the issue."

**Lisa:** "Recommendations — and these go beyond what will be in the formal letter. First, update your ADV to explicitly describe Min's rule-based methodology and disclaim AI/ML. Second, create a vendor due diligence file for Min that includes security documentation, data flow mapping, and a business continuity assessment. Third, update your supervisory procedures to describe the Min workflow — triage, dismiss, resolve, snooze — and who oversees it. Fourth, implement a dismiss reason quality standard — minimum character count, required specificity, and supervisory review protocol. Fifth, consider requesting that Min add time-to-approve tracking to strengthen your supervisory documentation."

**Sarah:** "This is incredibly actionable. Thank you."

**Lisa:** "One final observation for Ms. Kendrick personally. You clearly understand this system and your firm's compliance obligations. Your honest answers — including when you didn't know something — were more valuable than rehearsed responses. If this system is going to work, it needs an operator like you who understands both what it does and what it doesn't do. Don't let the technology become a substitute for your judgment. It's a tool. You're the supervisor."

*Lisa writes her final examination summary note: "Ridgeline Wealth Partners: Well-run firm with genuine commitment to compliance. Min technology platform provides strong compliance infrastructure with meaningful audit trail. Primary deficiencies are documentation-related (vendor due diligence, supervisory procedures, ADV specificity), not substantive compliance failures. No evidence of client harm. No enforcement referral warranted. Recommend deficiency letter with specific corrective actions."*

**Concern level: Overall — YELLOW with GREEN trajectory** — Deficiencies are procedural and correctable. Firm is motivated and capable of remediation.

---

## Part 4: Formal Examination Findings

### SEC Division of Examinations — Examination Findings Letter

---

**UNITED STATES SECURITIES AND EXCHANGE COMMISSION**
**Division of Examinations — Atlanta Regional Office**

**CONFIDENTIAL**

Date: [4 weeks after on-site]

David Ridgeway, Chief Compliance Officer
Ridgeline Wealth Partners, LLC
[Address]
Nashville, TN 37203

Re: Examination Findings — Ridgeline Wealth Partners, LLC (CRD# [XXXXXX])

Dear Mr. Ridgeway:

The Division of Examinations of the U.S. Securities and Exchange Commission ("Staff") has completed its examination of Ridgeline Wealth Partners, LLC ("the Firm"). The examination covered the period from January 1, 2024 through [examination date] and focused on the Firm's compliance program, supervisory procedures, technology vendor oversight, and client data protection.

Set forth below are the Staff's findings and observations. The Firm is requested to respond in writing within 30 days, describing the corrective actions taken or planned with respect to each finding.

---

### Finding 1: Inadequate Vendor Due Diligence for Technology Compliance Platform

**Regulatory Reference:** Rule 206(4)-7 (Compliance Rule), Regulation S-P (Rule 30 — Safeguards Rule)

**Observation:** The Firm deployed a third-party technology platform ("Min") approximately 90 days prior to the examination. Min accesses the Firm's Salesforce CRM data, including client personally identifiable information, and generates compliance monitoring outputs used by the Firm's operations team for supervisory purposes. The Firm did not perform a formal vendor risk assessment prior to deployment. No SOC 2 Type II report or equivalent security attestation was obtained or requested. No data processing agreement was executed. The Firm's Chief Operating Officer evaluated the platform's functionality but did not assess its security architecture, data handling practices, or business continuity provisions.

**Concern:** Regulation S-P requires registered investment advisers to adopt written policies and procedures reasonably designed to safeguard customer records and information. The deployment of a technology platform that accesses client PII without formal security due diligence may not satisfy the "reasonableness" standard under Rule 30. While the Staff notes that Min's actual data handling practices appear sound — the platform operates within the Firm's Salesforce environment, scrubs sensitive PII from audit records, and does not maintain an independent data store — the Firm's inability to demonstrate that it verified these practices prior to deployment is a procedural deficiency.

**Recommendation:** The Firm should: (1) obtain Min's security documentation, including any SOC 2 attestation, penetration testing results, and data flow architecture; (2) execute a data processing agreement addressing data access, storage, breach notification, and termination provisions; (3) document its vendor risk assessment in a format suitable for examination production; (4) incorporate Min into its ongoing vendor monitoring program with periodic re-assessment.

**Min's Role:** Min **contributed to this finding** by not providing a vendor due diligence packet, SOC 2 documentation, or standardized security materials that the firm could use to satisfy this requirement. The Firm bears primary responsibility for performing due diligence, but the vendor's lack of examination-ready documentation created a gap that the Firm failed to fill independently.

---

### Finding 2: Supervisory Procedures Do Not Address Technology-Assisted Compliance Monitoring

**Regulatory Reference:** Section 203(e)(6) of the Investment Advisers Act of 1940, Rule 206(4)-7

**Observation:** The Firm's written supervisory procedures, last updated prior to Min's deployment, do not describe the technology-assisted compliance monitoring workflow that the Firm employs daily. Specifically, the procedures do not address: (a) who is responsible for reviewing Min's triage outputs, (b) the frequency and scope of triage review, (c) standards for dismiss reason quality, (d) escalation procedures for unresolved flags, (e) oversight of associate advisor use of the platform, or (f) business continuity procedures for operating without the platform.

The Staff observed that the Chief Operating Officer has replaced a prior manual spreadsheet-based compliance review with Min's triage function. This operational change — which the COO described as moving "from forty minutes to two minutes" for morning review — was not reflected in the Firm's written supervisory procedures. The procedures still reference the manual review process.

**Concern:** Section 203(e)(6) authorizes the Commission to sanction advisers for failure to reasonably supervise. Rule 206(4)-7 requires written compliance policies and procedures reasonably designed to prevent violations. When written procedures do not reflect actual practice, the procedures cannot serve their regulatory purpose — they become artifacts rather than operational documents. The Firm's actual supervisory practices (including Min-based monitoring) appear substantively adequate, but the written procedures do not document them.

**Recommendation:** The Firm should update its supervisory procedures to include: (1) a description of Min's role as a compliance monitoring tool, including its rule-based methodology and Salesforce integration; (2) designated supervisory responsibility for reviewing Min outputs (triage items, compliance scans, audit trail); (3) frequency standards for review (daily triage, weekly audit trail, monthly comprehensive); (4) dismiss reason quality standards (minimum specificity, prohibited generic responses, supervisory review checklist); (5) escalation procedures (timeframes for addressing flagged items, documentation of delays); (6) business continuity provisions for Min unavailability.

**Min's Role:** Min **contributed to this finding** by not providing a Supervisory Procedure Template that firms can adapt to their compliance manuals. The absence of vendor-provided guidance left the Firm responsible for independently drafting procedures for a technology workflow it did not design. Min should provide model supervisory procedure language that firms can customize.

---

### Finding 3: Form ADV Disclosure Lacks Specificity Regarding Technology Methodology

**Regulatory Reference:** Form ADV Part 2A (Item 13 — Review of Accounts), 2024 Division Examination Priorities (Technology and AI Risk)

**Observation:** The Firm's ADV brochure supplement, amended approximately eight weeks prior to the examination, describes the Firm's use of "technology-assisted compliance monitoring" without specifying the technology's methodology. The term "technology-assisted" is accurate but ambiguous — it could encompass rule-based systems, machine learning models, generative AI, or simple spreadsheet automation. In the current regulatory environment, where the Division has issued specific guidance on AI and algorithmic trading/compliance tools, vague technology references create unnecessary regulatory risk.

The Staff confirmed during the examination that the Firm's compliance technology (Min) is a rule-based system that matches keywords in structured CRM data against predefined compliance requirements. It does not employ artificial intelligence, machine learning, natural language processing, or predictive analytics. The Firm's COO accurately described this distinction during the examination but noted uncertainty about the precise technical characterization.

**Concern:** While the current ADV language is not false or misleading, its ambiguity could: (a) lead clients to assume AI-based monitoring when none exists, (b) trigger heightened regulatory scrutiny in future examinations, or (c) create liability exposure if the Firm's compliance monitoring is later challenged as inadequate and the ADV's vague language is cited as evidence of overstatement.

**Recommendation:** The Firm should amend its ADV to explicitly state: (1) the compliance monitoring technology uses a rule-based, deterministic methodology that checks structured CRM data against predefined regulatory requirements; (2) the technology does not employ artificial intelligence, machine learning, or predictive analytics; (3) all technology outputs are reviewed by qualified supervisory personnel before action is taken; (4) the technology is one component of the Firm's broader supervisory program and does not replace human supervisory judgment.

**Min's Role:** Min **contributed to this finding** by not providing recommended ADV disclosure language. A template disclosure — accurately describing Min's rule-based methodology and explicitly disclaiming AI/ML — would have prevented this ambiguity. This is a documentation gap the vendor should address proactively.

---

### Observation A: Dismiss Reason Quality Variability

**Note:** *This is a staff observation, not a formal deficiency finding. It is included for the Firm's benefit and does not require a formal response, though the Staff recommends the Firm consider the following.*

**Regulatory Reference:** General supervisory obligations, Rule 204-2 (Books and Records)

**Observation:** The Staff reviewed all 23 triage dismissals recorded during the 90-day examination period. The Min platform requires a mandatory dismiss reason for every dismissed item — a compliance control significantly stronger than what the Staff typically observes. However, the quality of dismiss reasons varied:

- 14 of 23 (61%) were substantive and specific, referencing client circumstances, pending actions, or documented business decisions
- 6 of 23 (26%) were adequate but generic ("being addressed separately," "not applicable to this account type")
- 3 of 23 (13%) were insufficient ("ok," "handled," "n/a")

All three insufficient entries were from a single associate advisor. The COO's weekly audit trail review did not identify these entries as inadequate. The Staff confirmed that the underlying issues associated with the three insufficient dismissals were actually resolved — the dismiss reasons did not mask compliance failures.

**Recommendation:** The Firm should: (1) establish minimum dismiss reason quality standards (suggested: minimum 15 characters, prohibition on generic single-word entries); (2) include dismiss reason quality in the COO's supervisory review checklist; (3) provide training to associate advisors on documentation standards; (4) consider requesting Min implement programmatic quality enforcement (minimum length, keyword filtering).

**Min's Role:** Min **enabled this observation** — without the mandatory dismiss field, there would be no documentation at all. But Min **could prevent this issue** by enforcing minimum character counts or prompting for specific reason categories. The mandatory field is a floor, not a ceiling — the tool should encourage substantive documentation, not just non-empty documentation.

---

### Observation B: Audit Trail Integrity Mechanism

**Note:** *Staff observation — not a formal deficiency finding.*

**Regulatory Reference:** Rule 204-2 (Books and Records — preservation requirements)

**Observation:** Min's audit trail is stored as Salesforce Task records with a subject prefix of "MIN:AUDIT." The Firm has deployed a Salesforce validation rule that prevents editing of these Task records. However, the validation rule includes an exception for Salesforce system administrators, who retain the ability to modify or delete audit records. The Firm has two system administrators.

The Staff does not believe the Firm has tampered with audit records. The 90-day cross-reference between the Min export and direct Salesforce query showed complete consistency. However, the sysadmin bypass means the audit trail is not tamper-evident in a cryptographic or technical sense — its integrity depends on access controls and organizational discipline rather than architectural guarantees.

**Recommendation:** The Firm should: (1) document the sysadmin bypass as a known limitation in its compliance procedures; (2) implement compensating controls (periodic review of Salesforce Setup Audit Trail for MIN:AUDIT record modifications, restriction of sysadmin profiles to the minimum necessary personnel); (3) consider requesting Min implement cryptographic integrity verification (e.g., hash chains) for audit records.

**Min's Role:** Min's use of Salesforce Tasks for audit storage is a **strength** (firm owns its data, no vendor lock-in) and a **limitation** (Salesforce's permission model doesn't support true append-only storage). A future enhancement to add cryptographic hash chaining or digital signatures to audit records would significantly strengthen the tamper-evidence of the audit trail.

---

### Observation C: Time-to-Approve Metric Absence

**Note:** *Staff observation — not a formal deficiency finding.*

**Regulatory Reference:** General supervisory obligations

**Observation:** Min does not track the elapsed time between when compliance check results are displayed to a user and when the user records (approves) those results. Without this metric, neither the Firm nor an examiner can objectively verify that compliance results were reviewed before being approved. The Staff examined timestamp gaps in the audit trail and found patterns consistent with genuine review (time varied proportionally with result complexity), but this analysis was inferential rather than direct.

**Recommendation:** The Firm should request that Min add explicit time-to-approve tracking as a standard audit trail field. This metric would: (1) provide objective evidence of deliberate review, (2) enable supervisory oversight of review quality (abnormally fast approvals flagged for re-review), (3) strengthen the Firm's position in future examinations.

**Min's Role:** This is a **product design gap**. Min should capture the timestamp when compliance results are first displayed and the timestamp when the user takes action, recording the delta in the audit trail. This single metric would provide examiners with the clearest possible evidence that technology-assisted supervision involves actual human review.

---

### Findings Where Min PREVENTED Deficiencies

The Staff notes that Min's presence prevented several issues that would otherwise have been examination concerns:

| Prevented Issue | How Min Prevented It | Without Min |
|----------------|---------------------|-------------|
| **Undocumented compliance monitoring** | 90-day continuous audit trail with timestamps, actors, and actions | Firm would have only SmartRIA annual reviews and manual Salesforce entries — sporadic, inconsistent |
| **Undetected documentation gaps** | Compliance engine flagged missing suitability profiles, unsigned documents, and expired trust certifications for Garrison households | Gaps would have been discovered by the examiner, not the firm — significantly worse optics |
| **Inconsistent household oversight** | Health scores and triage prioritization ensured at-risk households received attention | Thompson household might have gone unreviewed for months without triage re-surfacing |
| **Override without documentation** | Mandatory dismiss reasons created a record of supervisory judgment for every override | Overrides would be invisible — the examiner would see flagged items and resolved items with no record of how the decision was made |
| **Abandoned compliance reviews** | Abandonment logging captured instances where staff started reviews and didn't finish | Without abandonment logging, the examiner would have no evidence of incomplete reviews |

### Findings Where Min CREATED New Risks

| Created Risk | How Min Created It | Mitigation Available |
|-------------|-------------------|---------------------|
| **Vendor dependency without due diligence** | Min's deployment wasn't accompanied by formal security assessment or DPA | Firm can retrospectively obtain security documentation and execute DPA |
| **Supervisory procedure obsolescence** | Min replaced manual review process without triggering procedure update | Firm can update procedures to reflect current workflow |
| **ADV ambiguity** | "Technology-assisted" language triggered examination scrutiny | Firm can amend ADV to explicitly describe rule-based methodology |
| **Delegation appearance** | Min's efficiency (40 minutes → 2 minutes) could suggest reduced supervisory attention | Time savings redirected to quality review, not reduced effort — but must be documented |

### Summary Assessment: Net Compliance Posture Impact

**Before Min:** Ridgeline Wealth Partners had a functional but documentation-thin compliance program. SmartRIA provided annual compliance calendar management. Day-to-day supervision relied on the COO's manual spreadsheet review — thorough but undocumented. The firm would have entered this examination with significant production challenges: no continuous audit trail, no systematic compliance scanning, limited ability to demonstrate regular supervisory review, and undiscovered documentation gaps in Garrison acquisition households.

**After Min (90 days):** The firm has a continuous, exportable audit trail. Compliance scans have been run across households with results recorded. Documentation gaps have been identified and partially remediated. Triage items have been tracked, addressed, or dismissed with reasons. The firm can produce examination-ready documentation that demonstrates active, ongoing supervision.

**Net assessment:** Min's deployment **improved** Ridgeline's compliance posture materially. The three formal findings in this letter — vendor due diligence, supervisory procedures, ADV disclosure — are implementation deficiencies, not indicators of substantive compliance failure. They are correctable within 60 days. The compliance infrastructure Min provides — audit trail, compliance scanning, triage documentation, abandonment logging — would not exist without the platform, and the firm's examination would have been significantly more difficult without it.

**The examination team does not recommend enforcement referral.** The findings warrant a deficiency letter with a 30-day response period and a follow-up review in 12 months to verify corrective actions.

Sincerely,

**Lisa Nakamura**
Senior Examiner
Division of Examinations
U.S. Securities and Exchange Commission
Atlanta Regional Office

---

## Part 5: Board & Ops Team Review

### Board Review: What This Examination Means for Min

*The following section represents the Min team's internal review of the SEC examination findings — what was validated, what was exposed, what needs to change, and what the examination reveals about Min's product-market positioning.*

---

#### 5.1 Validation vs. Undermining of the Compliance Value Proposition

**What the examination validated:**

The SEC examiner's findings contain the single most important external validation Min has received to date. Not from a buyer. Not from an expert. From a regulator whose job is to find what's wrong.

Lisa Nakamura's summary assessment states: *"Min's deployment improved Ridgeline's compliance posture materially."* She followed with: *"The compliance infrastructure Min provides — audit trail, compliance scanning, triage documentation, abandonment logging — would not exist without the platform."* And her net recommendation: no enforcement referral, deficiency letter with correctable findings.

This means:

1. **The audit trail works.** The 90-day cross-reference between Min's export and Salesforce showed complete consistency. Every audit entry was accounted for. The examiner called the abandonment logging "sophisticated" and noted she had "not seen this in any other platform." This is not a feature — it's a compliance moat. No competitor can replicate this without fundamentally rethinking their audit architecture.

2. **Mandatory dismiss reasons work.** The examiner reviewed all 23 dismissals and found 61% substantive, 26% adequate, 13% insufficient. She noted this is "significantly stronger than what the Staff typically observes." The mandatory field prevented the most common examination finding — overrides with no documentation. That said, mandatory is not sufficient. Quality enforcement is the next step (see product changes below).

3. **Rule-based architecture is a regulatory advantage.** The examiner's first question — "Is Min powered by artificial intelligence?" — revealed the significance of this distinction. When Sarah confirmed Min is rule-based, Lisa's notes shifted from "AI investigation needed" to "architecture verification." The entire AI Risk Alert line of questioning was defused. This is not a limitation — it's a positioning advantage. Every competitor claiming "AI-powered compliance" faces a supervisory burden Min does not.

4. **Business continuity through Salesforce is a feature.** The examiner specifically noted as a positive finding that all data resides in Salesforce — no vendor lock-in, no data dependency. When asked "what happens if Min goes down," the answer was "everything is still in Salesforce." This architecture converts a potential vendor-risk finding into a risk-mitigation finding.

5. **The NIGO detection trace worked.** The examiner walked through the Patel household's unsigned beneficiary form and found the triage logic correct, the threshold reasonable, and the escalation mechanism appropriate. The false positive handling (Jackson hospital stay) was cited as "textbook use of technology-assisted supervision."

**What the examination exposed:**

The three formal findings — vendor due diligence, supervisory procedures, ADV disclosure — all share a common root cause: **Min doesn't provide the documentation that surrounds the product.** The technology works. The compliance infrastructure works. But the firm-facing documentation that helps the firm implement Min within its regulatory framework doesn't exist.

This is not a technology problem. It's a go-to-market problem. Min is shipping a product and expecting the firm to figure out the regulatory implementation independently. Most firms won't. Sarah Kendrick is unusually capable — she understood Min's architecture well enough to answer most of the examiner's questions accurately. But she couldn't answer the vendor security questions, didn't know about token storage, and hadn't updated supervisory procedures. A less capable COO would have had a worse examination.

**The examination revealed that Min's compliance value proposition is real and defensible — but it's incomplete without supporting documentation.**

---

#### 5.2 Product Changes vs. Guidance Changes

The examination findings fall into three categories, and it's critical to distinguish between them:

**Category 1: Product Changes Required**

These are things Min must build into the software:

| Change | Examiner Basis | Effort | Priority |
|--------|---------------|--------|----------|
| Minimum dismiss reason character count (≥15 characters) | 3/23 insufficient dismiss reasons; "ok" and "n/a" accepted | Small — UI validation | P1 |
| Time-to-approve tracking (scan displayed → user action) | Cannot distinguish review from rubber-stamp; examiner inferred from timestamp gaps | Medium — new audit field | P1 |
| Dismiss reason category prompts (dropdown + free text) | Examiner wants structured reasons, not just free text | Medium — UX redesign | P2 |

**Category 2: Documentation/Guidance to Create**

These are documents Min must provide to firms:

| Document | Examiner Basis | Effort | Priority |
|----------|---------------|--------|----------|
| Vendor Due Diligence Packet (security architecture, data flow, encryption standards, no-independent-storage attestation) | Finding 1 — firm couldn't produce vendor security documentation | Medium — write once, maintain | P0 |
| Supervisory Procedure Template (model language for compliance manuals describing Min workflows) | Finding 2 — firm didn't update supervisory procedures for Min | Medium — legal/compliance review needed | P0 |
| ADV Disclosure Template (recommended language explicitly describing rule-based methodology, disclaiming AI/ML) | Finding 3 — ADV language was ambiguous | Small — template language | P0 |
| Examination Readiness Kit (pre-packaged responses to common examiner questions about Min) | Multiple examiner questions Sarah couldn't fully answer | Large — comprehensive | P1 |
| Data Flow Map (visual diagram of SF → Min → SF data path, encryption points, PII handling) | Examiner asked about data flow; COO couldn't articulate token storage | Small — one-page diagram | P1 |

**Category 3: Enablement/Training**

These are things Min should help firms understand:

| Topic | Examiner Basis | Format |
|-------|---------------|--------|
| "Min is not AI" talking points for examiner interviews | Examiner's first technology question; COO hesitated on characterization | One-page FAQ |
| Dismiss reason quality training for associate advisors | 3/23 insufficient reasons from single associate | In-app guidance + training doc |
| Audit trail review checklist for COOs | COO's weekly review didn't catch insufficient dismiss reasons | Checklist template |
| Business continuity documentation template | Examiner asked about Min downtime; firm should pre-document the answer | Template |

---

#### 5.3 The Examination Readiness Kit

The single most valuable deliverable from this evaluation is the concept of an **Examination Readiness Kit** — a pre-packaged set of documents, talking points, and prepared responses that Min provides to every firm. This kit converts examination preparation from a firm-specific scramble into a standardized, repeatable process.

**Kit Contents:**

1. **Min Technology Description** (2 pages)
   - What Min is: rule-based compliance monitoring platform integrated with Salesforce CRM
   - What Min is not: not AI, not ML, not autonomous, not a robo-advisor
   - How it works: keyword matching against structured CRM data, deterministic triage prioritization, four-component health scoring
   - Data architecture: reads from Salesforce, writes audit records to Salesforce as Tasks, no independent data store

2. **Data Flow & Security Document** (2 pages)
   - Authentication: Salesforce OAuth (authorization code flow)
   - Encryption: AES-256-GCM with scrypt key derivation for stored credentials
   - Transport: HTTPS with secure cookies (httpOnly, SameSite=Lax)
   - PII handling: sensitive fields (SSN, DOB, bank accounts, routing numbers) scrubbed before audit logging
   - Data residency: all client data resides in firm's Salesforce org
   - Session security: CSRF double-submit cookies, SOQL injection prevention, rate limiting

3. **Vendor Due Diligence Questionnaire** (completed) (4 pages)
   - Pre-filled responses to standard vendor due diligence questions
   - Data access scope, retention policies, breach notification procedures
   - Business continuity and disaster recovery provisions
   - Subprocessor list and data sharing practices

4. **Recommended ADV Language** (1 page)
   - Template disclosure for Form ADV Part 2A, Item 13
   - Explicitly describes rule-based methodology
   - Disclaims AI/ML
   - Affirms human supervisory review of all outputs

5. **Supervisory Procedure Template** (3 pages)
   - Model language for compliance manuals
   - Covers: triage review, dismiss standards, escalation, audit trail review, business continuity
   - Customizable for firm-specific roles and frequencies

6. **Examiner FAQ** (2 pages)
   - 15 questions an examiner is likely to ask about Min, with recommended answers
   - Includes: "Is this AI?", "Where is data stored?", "Can audit records be edited?", "What happens if Min goes down?", "Does Min make recommendations?", "Who reviews Min's outputs?"

7. **90-Day Audit Trail Summary Template** (1 page)
   - Pre-formatted summary of audit trail statistics for examination production
   - Total records, action breakdown, dismiss reason summary, error rates, user activity distribution

---

#### 5.4 The Rubber-Stamp Design Question

The examiner raised a question that goes beyond this examination and into Min's long-term product architecture: **does Min's design encourage or discourage rubber-stamping?**

Current state: Min's compliance scan takes ~30 seconds. Results are displayed. The user can record (approve) them immediately. There is no delay, no confirmation step, no "are you sure you reviewed these results?" prompt. The 5-second undo window after dismiss/snooze actions suggests the design optimizes for speed — users can act, undo if wrong, and move on.

Speed is a feature for operations efficiency. It's a risk for compliance integrity.

The examiner's rubber-stamp test was inconclusive — timestamp analysis suggested genuine review (time varied by complexity). But the absence of time-to-approve tracking means the firm *cannot prove* that review occurred. This is the kind of gap that a sophisticated plaintiff's attorney or a return examination by a less charitable examiner could exploit.

**Design recommendation:** Min should implement a "deliberate review" pattern for compliance scans with failures:

1. When a compliance scan produces **zero failures**, allow immediate recording (the review is confirmation that everything passed)
2. When a compliance scan produces **one or more failures**, require the user to expand each failure category and view the details before the "Record" button becomes active
3. Track and log the time-to-approve in the audit trail for all compliance recordings
4. For recordings under 30 seconds with failures present, display a confirmation: "You reviewed [N] failures in [X] seconds. Are you sure you want to record these results?"

This doesn't slow down the happy path (all-pass scans). It adds friction only where friction is warranted (scans with failures). And it creates the audit evidence that examiners will look for.

---

#### 5.5 AI Disclosure Proactive Guidance

The examination revealed an industry-wide issue that Min is uniquely positioned to address: **firms don't know how to describe their technology tools in regulatory filings.**

Sarah described Min as "technology-assisted compliance monitoring" — accurate but vague. She hesitated when asked whether Min is AI. She couldn't articulate the difference between rule-based and ML-based in examiner-ready language. This is not Sarah's failure — it's an information gap that Min, as the vendor, should fill.

**Proactive guidance Min should provide to every firm:**

1. **"What to Call Us" One-Pager**
   - Approved language: "rule-based compliance monitoring," "deterministic compliance scanning," "technology-assisted supervisory tool"
   - Explicitly prohibited language: "AI-powered," "machine learning," "predictive compliance," "automated supervision," "intelligent monitoring"
   - Explanation of why this matters: the 2024 AI Risk Alert, examination priorities, disclosure requirements

2. **Form ADV Template Language**
   - Ready-to-file language for Part 2A, Item 13 (Review of Accounts)
   - Ready-to-file language for Part 2A, Item 16 (Investment Discretion) — noting that Min does not exercise discretion
   - Ready-to-file language for ADV supplement regarding technology use

3. **Client Communication Template**
   - For firms that want to inform clients about their compliance technology
   - Emphasizes: human oversight, tool not replacement, data privacy

This guidance prevents the ADV ambiguity finding in future examinations for every Min client. It's a one-time effort with firm-wide impact — and it converts a regulatory risk into a competitive advantage. No competitor is providing this.

---

#### 5.6 Vendor Due Diligence Packet — What It Must Contain

The vendor due diligence finding is the most operationally urgent issue from the examination. Every Min client faces the same risk: deploying Min without the documentation an examiner would expect.

**Minimum contents for a vendor due diligence packet:**

1. **Company Information**
   - Legal entity name, jurisdiction, key personnel
   - Years in operation, client count, assets under influence

2. **Security Architecture**
   - Encryption standards: AES-256-GCM with scrypt key derivation (at rest), HTTPS/TLS (in transit)
   - Authentication: Salesforce OAuth authorization code flow
   - Session management: httpOnly cookies, SameSite=Lax, CSRF double-submit pattern
   - Input validation: SOQL injection prevention (character escaping, length limits, ID format validation)
   - Security headers: X-Content-Type-Options, X-Frame-Options, Referrer-Policy
   - Rate limiting: per-IP sliding window (configurable)

3. **Data Handling**
   - Data accessed: Salesforce CRM records (households, contacts, tasks, custom objects)
   - Data stored: no independent client data store — all data resides in firm's Salesforce org
   - Audit records: stored as Salesforce Task objects within firm's org
   - PII handling: sensitive fields (SSN, DOB, bank accounts, routing numbers) scrubbed via `scrubPII()` function before audit record creation
   - Data retention: governed by firm's Salesforce retention policies, not Min's
   - Data deletion: Min does not retain data to delete — firm controls all data lifecycle

4. **SOC 2 Status**
   - Current attestation status (or timeline to attestation)
   - Scope of attestation (Trust Services Criteria covered)
   - How to request the most recent report

5. **Business Continuity**
   - Min's availability SLA
   - Impact of Min downtime on firm operations (degraded but functional — all data in SF)
   - Recovery procedures
   - Firm can operate without Min — detailed explanation of what changes

6. **Incident Response**
   - Breach notification timeline and procedures
   - Firm communication protocol
   - Regulatory notification support

7. **Known Limitations** (honesty builds trust)
   - OAuth flow does not currently implement PKCE (planned)
   - No HSTS header (planned)
   - No Content Security Policy header (planned)
   - Audit trail append-only enforcement depends on Salesforce validation rules (sysadmin bypass exists)
   - PII scrubbing covers defined field patterns; does not detect context-aware PII (e.g., PII embedded in free-text task descriptions)

---

### Ops Team Review: Prioritized Punch List

#### 5.7 The Prioritized Punch List

Based on the SEC examination findings, observations, and the examiner's informal recommendations, the following is a prioritized list of changes for Min's product, documentation, and enablement teams.

**P0 — Ship Within 30 Days (Before Firms Respond to Deficiency Letters)**

| # | Item | Type | Owner | Deliverable |
|---|------|------|-------|-------------|
| 1 | Vendor Due Diligence Packet | Documentation | Product + Legal | PDF packet covering security, data handling, SOC 2 status, BCP, incident response |
| 2 | Supervisory Procedure Template | Documentation | Product + Compliance | Model compliance manual language for Min workflows |
| 3 | ADV Disclosure Template | Documentation | Product + Legal | Ready-to-file Form ADV language describing rule-based methodology |
| 4 | Minimum dismiss reason length (≥15 chars) | Product | Engineering | UI validation preventing single-word dismiss reasons |

**P1 — Ship Within 60 Days**

| # | Item | Type | Owner | Deliverable |
|---|------|------|-------|-------------|
| 5 | Time-to-approve tracking | Product | Engineering | New audit trail field: `displayedAt` timestamp + `timeToApproveMs` delta |
| 6 | Examination Readiness Kit | Documentation | Product + Compliance | 7-document kit (see Section 5.3) |
| 7 | Data Flow Map | Documentation | Engineering + Product | One-page visual diagram of SF → Min → SF data path |
| 8 | Examiner FAQ | Documentation | Product | 15-question FAQ with recommended answers |
| 9 | Dismiss reason category prompts | Product | Engineering + Design | Structured dropdown (reason categories) + free text |

**P2 — Ship Within 90 Days**

| # | Item | Type | Owner | Deliverable |
|---|------|------|-------|-------------|
| 10 | Deliberate review pattern for failed scans | Product | Engineering + Design | Require category expansion before recording scans with failures |
| 11 | "What to Call Us" guidance | Enablement | Marketing + Legal | One-pager on approved/prohibited language for describing Min |
| 12 | Audit trail review checklist | Enablement | Product | Downloadable checklist for COO weekly review |
| 13 | SOC 2 Type II engagement | Operations | Leadership + Vendor | Begin SOC 2 audit process |
| 14 | PKCE implementation for OAuth | Product | Engineering | Add code_challenge/code_verifier to authorization code flow |

---

#### 5.8 "Examiner Mode" Concept

The examination revealed a powerful product concept: **Examiner Mode** — a view of Min's data specifically designed for regulatory examination production.

During the examination, Lisa Nakamura spent significant time with the audit trail export, cross-referencing records, analyzing dismiss patterns, and examining timestamp gaps. This analysis was manual and time-consuming. Min could automate much of it.

**Examiner Mode would provide:**

1. **Audit Trail Summary Dashboard**
   - Total records by period (selectable date range)
   - Action type breakdown (resolve, dismiss, snooze, compliance scan, etc.)
   - Actor distribution (who is doing the work?)
   - Dismiss reason word cloud and quality scoring
   - Error rate and error type analysis

2. **Dismiss Reason Audit Report**
   - All dismiss reasons with timestamp, actor, household, and original triage item
   - Quality scoring: substantive (green), adequate (yellow), insufficient (red)
   - Filter by quality, actor, date range

3. **Time-to-Approve Analysis** (requires P1 feature)
   - Distribution of review times by action type
   - Flagging of anomalously fast approvals
   - Comparison of review times when failures are present vs. all-pass

4. **Compliance Coverage Report**
   - Percentage of households scanned, by period
   - Households never scanned (highlight)
   - Scan frequency per household
   - Failure trend over time (are failures decreasing as firm remediates?)

5. **Cross-Reference Export**
   - Min audit trail + Salesforce Task records aligned for side-by-side verification
   - Discrepancy flagging (if any records don't match)

6. **Examiner-Ready PDF Package**
   - One-click generation of a comprehensive examination package
   - Includes: audit trail summary, dismiss analysis, coverage report, compliance scan results by household, data flow description, vendor security summary

This isn't a current-sprint feature — it's a product vision. But the SEC examination proved that the data exists to build it. And the existence of Examiner Mode would convert SEC examinations from a compliance risk into a *sales event* — if a firm can produce an Examiner-Ready PDF package in five minutes, the examiner's first reaction is positive, and the firm's COO becomes Min's most credible champion.

---

#### 5.9 Cross-Reference with Previous Evaluations

| Theme | Eval #1 (COO) | Eval #2 (T3 Booth) | Eval #5 (SEC Examiner) |
|-------|--------------|--------------------|-----------------------|
| **Audit trail value** | Sarah noticed it but didn't prioritize | Strongest trust signal at booth; "prove it to an examiner" | Examiner called it "sophisticated" and "significantly more comprehensive than typical" |
| **Dismiss reasons** | Not tested in depth | Conference attendees reacted to "dismiss with reason" | 61% substantive, 26% adequate, 13% insufficient — mandatory field validated but quality enforcement needed |
| **Rule-based vs. AI** | Not discussed | Vocabulary test: "intelligence" failed; "compliance scan" landed | Rule-based architecture defused AI Risk Alert scrutiny entirely |
| **Business continuity** | Sarah asked "what if Min disappears?" — satisfied by SF architecture | Robert Hargrove valued "operational maturity, documented and auditable" | Examiner rated BCP as GREEN — no vendor dependency on data |
| **Vendor documentation** | Not evaluated | Lisa Reyes (Practifi) probed for competitive gaps | Vendor due diligence was the #1 formal finding — biggest gap |
| **Supervisory procedures** | Sarah replaced spreadsheet with Min; didn't think about procedures | Not relevant at booth | #2 formal finding — procedures don't describe Min workflow |
| **ADV disclosure** | Not discussed | Not discussed | #3 formal finding — "technology-assisted" is ambiguous |
| **Account-type compliance** | Sarah wanted trust/entity-specific checks (Eval #1 recommendation #2) | Not demonstrated at booth | Examiner verified IRA-specific checks (RMD, PTE, beneficiary) — these are now implemented |
| **Thompson household** | Identified as at-risk in Eval #1 | Used as demo example at T3 | Examiner found 3+ week delay in addressing after snooze — operational concern |
| **Garrison acquisition** | 47 households, 60% migrated, documentation gaps | Not discussed | Patel household (Garrison) used for NIGO trace; documentation gaps being addressed via Min |

**Pattern across evaluations:** Min's technical capabilities consistently validate. The gaps are always in the surrounding ecosystem — documentation, procedures, training, vendor materials. The product works. The product *implementation support* is incomplete.

---

## Closing Deliverables

### 10 Takeaways from the SEC Examination

*Ordered by regulatory impact — highest first.*

**1. Vendor due diligence is not optional, and Min must help firms do it.**

The examiner's most significant finding was the absence of vendor due diligence documentation. This isn't a Sarah problem — it's a Min problem. Every firm that deploys Min without a vendor due diligence packet is exposed to the same finding. Min must ship a Vendor Due Diligence Packet as a standard part of onboarding. This is P0 priority.

**2. Supervisory procedures must describe the technology workflow.**

When a firm adds a technology tool to its compliance program, the written supervisory procedures must be updated. Min replaced Sarah's manual spreadsheet review — a material change in supervisory methodology — without triggering a procedure update. Min should provide a Supervisory Procedure Template that firms can adapt. This is P0 priority.

**3. "Technology-assisted" is not specific enough for regulatory filings.**

The ADV language was technically accurate but regulatory ambiguous. In an environment where AI-related examinations are increasing, vague technology references create unnecessary risk. Min should provide ADV template language that explicitly describes the rule-based methodology and disclaims AI/ML. This is P0 priority.

**4. Rule-based architecture is a regulatory moat.**

The examiner's entire AI investigation line was defused when Sarah confirmed Min is rule-based. Every competitor claiming "AI-powered compliance" faces supervisory, disclosure, and examination burdens that Min does not. This is not a limitation to overcome — it's a positioning advantage to amplify. Marketing should lean into this distinction.

**5. The audit trail is Min's most defensible feature — and it passed the stress test.**

A 90-day cross-reference showed complete consistency between Min's export and Salesforce records. The examiner found the abandonment logging unprecedented. Mandatory dismiss reasons provided documentation the examiner rarely sees. The audit trail isn't a feature — it's the compliance moat. Protect it, improve it (hash chains, quality enforcement), and market it explicitly.

**6. Mandatory dismiss reasons work, but quality enforcement is the next step.**

13% of dismiss reasons were insufficient — single words that provided no examiner value. The mandatory field is a floor. Min needs minimum character counts (≥15), category prompts, and eventually quality scoring. The dismiss reason is the artifact that proves human judgment — it must be substantive.

**7. Time-to-approve tracking is the missing metric for examiner credibility.**

The examiner could not objectively verify that compliance results were reviewed before being approved. Timestamp analysis was inferential. Min must capture `displayedAt` and `timeToApproveMs` as standard audit trail fields. This single metric would provide the clearest possible evidence that technology-assisted supervision involves actual human review.

**8. Business continuity through Salesforce converts a vendor risk into a risk mitigation.**

The examiner rated business continuity as GREEN specifically because Min doesn't create data dependency. All records persist in Salesforce regardless of Min's availability. This architecture choice — reading from and writing to the firm's own CRM — is the answer to "who watches the watchman?" The firm watches itself, through its own Salesforce data.

**9. PII handling is strong but has a documentation gap.**

Min's PII scrubbing (SSN, DOB, bank accounts, routing numbers redacted before audit logging) is a genuine privacy control. But the firm couldn't articulate this to the examiner because Min doesn't provide a data flow diagram or PII handling documentation. The technology is good; the communication of the technology is the gap.

**10. The examination proved Min's compliance value proposition is real — and revealed the documentation gap that prevents firms from realizing it.**

Every formal finding in the deficiency letter was a documentation problem, not a technology problem. Min works. Min's audit trail works. Min's compliance scanning works. Min's triage and prioritization work. But the firm couldn't prove it had evaluated Min's security, couldn't point to supervisory procedures describing Min's role, and couldn't explain Min's methodology in examination-ready language. The technology is the easy part. The regulatory implementation support is the hard part — and the opportunity.

---

### Examination Readiness Checklist

*For any Min client firm preparing for or anticipating an SEC examination.*

#### Documents to Have Ready

- [ ] Current Form ADV Parts 1, 2A, 2B with technology-specific disclosure language describing Min's rule-based methodology
- [ ] Updated compliance manual / supervisory procedures with section on technology-assisted compliance monitoring (use Min's Supervisory Procedure Template)
- [ ] Min Vendor Due Diligence file: security documentation, data flow map, completed due diligence questionnaire, data processing agreement
- [ ] 90-day audit trail export (PDF) — generate monthly and archive
- [ ] Compliance scan results for all households — run within 30 days of anticipated examination
- [ ] Vendor inventory matrix listing Min alongside all technology platforms, with deployment dates, data access scope, and security assessments
- [ ] Data security policy / Reg S-P safeguards documentation that specifically addresses Min's data handling (PII scrubbing, no independent data store, Salesforce-native audit records)
- [ ] Business continuity plan with section describing firm operations without Min
- [ ] Client communication / disclosure records for technology use (if applicable)

#### Procedures to Have in Place

- [ ] Documented supervisory review procedure for Min triage outputs (daily review, weekly audit trail review, monthly comprehensive review)
- [ ] Dismiss reason quality standard (minimum 15 characters, prohibited generic entries, supervisory review of all dismissals weekly)
- [ ] Escalation procedure for unresolved triage items (e.g., items snoozed twice must be escalated to CCO)
- [ ] Associate advisor training documentation for Min use and dismiss reason standards
- [ ] Audit trail integrity monitoring (periodic check of Salesforce Setup Audit Trail for MIN:AUDIT record modifications)
- [ ] Annual Min review and re-assessment (functionality, security, ongoing suitability)

#### Tests to Run Before the Examiner Arrives

- [ ] Run compliance scans on all households — identify and begin remediating any failures *before* the examiner finds them
- [ ] Review all dismiss reasons from the last 90 days — flag and address any insufficient entries
- [ ] Verify audit trail completeness: export from Min and compare against Salesforce Task query for MIN:AUDIT records
- [ ] Spot-check 5 households: compare Min health scores against Salesforce data to verify consistency
- [ ] Verify Salesforce validation rule for MIN:AUDIT tasks is active and functioning
- [ ] Test business continuity: can the COO describe how the firm would operate for one week without Min access?
- [ ] Verify the firm's ADV accurately describes Min's role — no overstatement, no AI claims, explicit rule-based language

#### Prepared Answers (Rehearse with COO and CCO)

- [ ] "What does Min do?" — *"Min is a rule-based compliance monitoring tool that connects to our Salesforce CRM. It runs deterministic compliance checks against household data, surfaces operational issues in a prioritized triage queue, and logs every action to an audit trail stored as Salesforce Tasks. It does not use artificial intelligence or machine learning."*
- [ ] "Is Min AI?" — *"No. Min uses rule-based keyword matching against structured CRM data. Every output is deterministic and explainable. There is no machine learning, no predictive modeling, and no autonomous decision-making."*
- [ ] "Where is client data stored?" — *"All client data resides in our Salesforce org. Min reads from and writes to Salesforce. Min does not maintain an independent data store. Audit records are Salesforce Task objects governed by our Salesforce permissions and retention policies."*
- [ ] "Can audit records be edited?" — *"We have a Salesforce validation rule that prevents editing of MIN:AUDIT Task records. System administrators retain edit access as a Salesforce platform requirement, but we monitor the Setup Audit Trail for any modifications to these records."*
- [ ] "What happens if Min goes down?" — *"All data remains in Salesforce. We would revert to manual compliance monitoring processes as described in our business continuity plan. We would lose Min's dashboard, triage prioritization, and automated compliance scanning, but all historical records and current client data would be unaffected."*
- [ ] "Who reviews Min's outputs?" — *"Our COO reviews triage items daily and reviews the audit trail weekly. All compliance scan results are reviewed by the COO or a designated qualified reviewer before being recorded. Every dismiss action requires a documented reason. The CCO has oversight of the entire process."*
- [ ] "Has Min ever been wrong?" — *"Yes, and that's by design. Min flags potential issues based on data patterns — sometimes the underlying situation has context that Min can't see. When that happens, we dismiss the flag with a documented reason explaining why. For example, [cite specific example like the Jackson hospitalization]. The important thing is that the override is documented and reviewable."*

---

### 5 Product Changes the Examiner Would Require

*These are not suggestions. These are the regulatory floor — the minimum changes that would prevent the examination findings from recurring across Min's client base.*

**1. Ship a Vendor Due Diligence Packet with every deployment.**

Contents: security architecture document, data flow diagram, completed vendor risk questionnaire, PII handling description, business continuity summary, SOC 2 status (or timeline). Format: PDF, updated quarterly. Distribution: provided to every firm during onboarding, available on demand. This directly prevents Finding 1 (vendor due diligence deficiency) for every client.

**2. Ship a Supervisory Procedure Template with every deployment.**

Contents: model compliance manual language describing Min's role, triage review procedures, dismiss standards, escalation protocols, audit trail review cadence, business continuity provisions. Format: Word document (editable), also provided as PDF reference. Distribution: provided during onboarding with guidance for compliance manual integration. This directly prevents Finding 2 (supervisory procedure gap) for every client.

**3. Ship ADV Disclosure Template Language with every deployment.**

Contents: ready-to-file language for Form ADV Part 2A describing Min's rule-based methodology, explicitly disclaiming AI/ML, affirming human supervisory review. Format: Word document (editable). Distribution: provided during onboarding with instructions for ADV amendment filing. This directly prevents Finding 3 (ADV ambiguity) for every client.

**4. Enforce minimum dismiss reason quality.**

Implementation: minimum 15-character length for dismiss reasons, rejection of common insufficient entries ("ok," "n/a," "handled," "done," "reviewed"), optional category dropdown preceding free text. This prevents the dismiss reason quality observation (Observation A) and strengthens the mandatory dismiss field from "exists" to "substantive."

**5. Add time-to-approve tracking to the audit trail.**

Implementation: capture `displayedAt` timestamp when compliance results are rendered to the user, capture `recordedAt` timestamp when the user records results, log `timeToApproveMs` as a standard audit trail field. For scans with failures where `timeToApproveMs < 30000` (30 seconds), display a confirmation prompt. This prevents the rubber-stamp concern (Observation C) and provides the objective metric that examiners will increasingly expect.

---

### Final Assessment

This evaluation tested Min from the hardest possible perspective — a regulator paid to find what's wrong. The result is clear:

**Min's compliance technology works.** The audit trail passed a 90-day cross-reference. The compliance scanning identified real issues. The triage prioritization surfaced genuine risks. The mandatory dismiss reasons provided documentation the examiner rarely sees. The rule-based architecture defused AI-related scrutiny. The Salesforce-native data architecture eliminated vendor dependency concerns.

**Min's compliance documentation doesn't exist.** The three formal findings were all documentation gaps — vendor due diligence, supervisory procedures, ADV disclosure. These are not technology failures. They are go-to-market failures. Min ships a product and expects the firm to figure out the regulatory implementation. Most firms won't.

**The gap is the opportunity.** Every competitor ships technology. Nobody ships the regulatory implementation support. If Min provides the Vendor Due Diligence Packet, the Supervisory Procedure Template, the ADV Disclosure Language, the Examination Readiness Kit, and the Examiner FAQ — Min doesn't just sell a compliance tool. Min sells *examination readiness*. That's a different product category with a different value proposition and a different willingness to pay.

The SEC examiner walked in looking for what's wrong. She found procedural gaps, not substantive failures. She recommended a deficiency letter, not an enforcement referral. And her closing note read: *"Min's deployment improved Ridgeline's compliance posture materially."*

That sentence — from a regulator, not a buyer — is worth more than any demo, any booth conversation, any expert review, or any product evaluation. It's the validation that the compliance value proposition is real.

Now ship the documentation that makes it complete.

---

*End of Evaluation #5*

*Evaluation Series: 1 of 5 complete (COO), 2 of 5 complete (T3 Booth), 3-4 pending, 5 of 5 complete (SEC Examiner)*

