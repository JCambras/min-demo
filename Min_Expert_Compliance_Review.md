# Min Expert Compliance Review

**Evaluation #3: Independent Compliance Technology Assessment**

**Prepared by:** Marcus Webb, Principal — Webb Compliance Advisory
**Prepared for:** David Ridgeway, CEO/CCO, Ridgeline Wealth Partners
**Date:** February 20, 2026
**Classification:** Confidential — Ridgeline Internal Use Only
**Document Version:** 1.0 — Final Report

---

**Engagement Summary**

| Field | Detail |
|---|---|
| Engagement Type | Independent Compliance Technology Assessment |
| Platform Evaluated | Min — Salesforce-native compliance overlay for RIAs |
| Evaluation Period | February 17–19, 2026 (2-day technical review + 1-day report) |
| Methodology | Webb Compliance Advisory 5-Dimension Framework |
| Scope | Compliance engine, scoring model, regulatory coverage, architecture, operability |
| Core Question | "Is this technically sound?" |

---

## Part 1: The Expert

### Who I Am

My name is Marcus Webb. I run Webb Compliance Advisory, a boutique consulting practice that does exactly one thing: I evaluate compliance technology for registered investment advisers. I have been doing this, in various forms, for eighteen years.

The trajectory matters because it shapes how I evaluate. I spent four years as a FINRA examiner in the Dallas District Office, primarily examining small-to-mid-sized broker-dealers during the post-2008 remediation wave. I walked into firms that had purchased compliance software and treated it as absolution — a box checked, a license purchased, a problem solved. In every case, the software was doing less than the firm believed. In most cases, the firm could not articulate what the software actually checked. That experience inoculated me against marketing language permanently.

After FINRA, I spent eight years as Chief Compliance Officer at Meridian Capital Partners, a $5B multi-custodian RIA with offices in Houston and Denver. We custodied with Schwab, Fidelity, and Pershing simultaneously. I built our compliance program from a two-page policy manual into a framework that survived three SEC examinations without a single formal finding. During those years, I evaluated every compliance platform that came to market — SmartRIA, RIA in a Box, NRS (now COMPLY), Compliance.ai, and a dozen smaller vendors that no longer exist. I wrote the procedures. I trained the staff. I sat across from SEC examiners and defended the choices. The CCO chair teaches you something no amount of consulting can replicate: the difference between what looks compliant on a screen and what holds up in a conference room with an examiner who has subpoena power.

For the last six years, I have been an independent consultant. I have evaluated twenty-seven compliance platforms for RIA clients ranging from $200M single-office practices to $12B multi-state enterprises. I write a quarterly column for Investment Advisor magazine on compliance technology. I am occasionally invited to speak at T3, Schwab IMPACT, and the NSCP national conference. My evaluations are known in the industry for a specific quality: they are blunt. I do not write to preserve relationships with vendors. I write so that CCOs can make informed decisions that will survive examination scrutiny.

### The Webb Test

Every evaluation I conduct follows the same five-dimension framework. I developed it during my first year of consulting after recognizing that most compliance technology evaluations focus on feature lists and ignore the questions examiners actually ask. The five dimensions are:

**1. Methodology Soundness.** How does the engine determine compliance status? What is the detection mechanism? What are its false-positive and false-negative characteristics? A compliance engine that produces false passes is more dangerous than one that produces false fails, because a false fail generates a follow-up task while a false pass generates complacency.

**2. Regulatory Coverage.** Does the engine cover the regulations an examiner will ask about? Not the regulations the vendor thinks are important — the regulations that appear on SEC and FINRA examination priority letters, deficiency letters, and enforcement actions. Coverage depth matters more than coverage breadth. I would rather see five checks done with genuine verification than fifty checks done with surface-level matching.

**3. Evidence Quality.** What does the engine produce as proof? An examiner does not want to hear "the software said it was compliant." An examiner wants to see the evidence trail: what was checked, when, what was found, and who reviewed the finding. Evidence must be specific enough to reconstruct the compliance determination months or years after the fact.

**4. Architecture & Security.** How is the data stored, transmitted, and protected? What happens if the vendor disappears? What are the data dependencies? A compliance system that creates a new single point of failure has traded one risk for another.

**5. Operability.** Can the actual humans at the actual firm use this system in their actual workflow? A technically perfect system that no one uses is not a compliance system — it is shelfware. Operability includes adoption friction, workflow integration, training requirements, and the delta between what the CCO expects the system to do and what it actually does.

I score each dimension independently, then synthesize into an overall letter grade. The grade is my professional opinion. Firms have disagreed with my grades. Firms have also thanked me, usually about eighteen months later, usually after an examination.

A note on what I do not evaluate. I do not evaluate user interface design, visual aesthetics, or marketing positioning. I do not evaluate pricing, sales process, or customer support responsiveness. I do not evaluate features that are unrelated to compliance methodology — if Min has reporting dashboards, revenue intelligence, or client communication tools, those are outside my scope. My evaluation is narrowly focused on the compliance engine, the regulatory coverage, and the examination defensibility of the platform's outputs. If Min has beautiful charts, I will not mention them. If Min has ugly charts that contain accurate compliance data, I will praise the data and ignore the aesthetics.

### Why Ridgeline Hired Me

David Ridgeway called me in late January 2026. The context was straightforward: Ridgeline Wealth Partners ($1.08B AUM, SEC-registered, Nashville) has been running Min for approximately 90 days. Their COO, Sarah Kendrick, evaluated Min before deployment (Evaluation #1) and was impressed by the compliance scanning and dashboard capabilities. The firm recently completed a simulated SEC examination (Evaluation #5) in which Min's audit trail and compliance framework were tested by a former SEC examiner persona. That evaluation produced three formal findings — all procedural, none substantive — but it surfaced questions about Min's underlying methodology that Ridgeline's internal team could not answer.

David wanted three things from me. First, validate the compliance engine's methodology before Ridgeline's next actual SEC examination, which is statistically overdue (last exam was 2021). Second, assess whether Min's regulatory coverage is sufficient for a multi-custodian RIA that is mid-acquisition (the Garrison Practice integration, $180M, 47 households). Third, provide an independent opinion that Ridgeline can reference in its vendor due diligence documentation — which the simulated SEC examination identified as a critical gap.

I agreed to a two-day technical deep dive followed by one day of report writing. I asked for access to the Min codebase, the compliance engine source, and the demo dataset. I did not ask for marketing materials. I have never found marketing materials useful.

### My Evaluation Approach

Day one: I read the compliance engine source code line by line. I traced every check from trigger to output. I mapped every keyword to its intended regulatory requirement. I built a spreadsheet of every check, its detection mechanism, its evidence output, and its failure mode. I did this for all thirty-plus built-in checks, all four community templates, and the custom check framework.

Day two: I reviewed the custodian rules engine, the scoring model, the triage algorithm, the audit trail, and the regulatory updates feed. I ran the compliance scan against the demo dataset households and compared Min's outputs against what I would expect if I were conducting the same review manually. I noted every discrepancy.

Day three: I wrote this report.

What follows is the most thorough technical evaluation of Min's compliance methodology that has been conducted to date. It is based entirely on source code review and behavioral verification. I did not rely on vendor demonstrations, marketing claims, or user testimonials. I read what the code does, and I will tell you what it means.

---

## Part 2: Methodology Audit

### How the Compliance Engine Works

Min's compliance engine lives in a single TypeScript file: `compliance-engine.ts`. The core function is `runComplianceChecks()`, which accepts four inputs: a household record, an array of contacts, an array of tasks, and an optional account type. It returns an array of `CheckResult` objects, each containing a check ID, category, label, regulation citation, pass/warn/fail status, detail string, optional evidence array, a "why it matters" explanation, and optional remediation steps.

The engine's detection mechanism is keyword matching. Here is the exact sequence:

First, the engine collects all task subjects and descriptions into a single lowercase string:

```typescript
const taskSubjects = tasks.map(t => (t.subject || "").toLowerCase());
const taskDescs = tasks.map(t => (t.description || "").toLowerCase());
const allTaskText = [...taskSubjects, ...taskDescs].join(" ");
```

Second, it defines three helper functions:

```typescript
const hasTask = (keyword: string) => allTaskText.includes(keyword.toLowerCase());
const hasCheck = (checkId: string) => (map[checkId] || []).some(kw => hasTask(kw));
const matchedKeywords = (checkId: string) => (map[checkId] || []).filter(kw => hasTask(kw));
```

`hasTask` checks whether a keyword appears anywhere in the concatenated task text. `hasCheck` checks whether any keyword in a check's keyword list matches. `matchedKeywords` returns which specific keywords matched.

Third, the engine runs each check by calling `hasCheck` with the check's ID. If the check's keywords match, the check passes. If they do not match, the check fails or warns depending on the check's severity configuration.

This is the entirety of the detection mechanism. Every compliance determination in Min reduces to: "Does this keyword substring appear somewhere in the concatenated text of all Salesforce task subjects and descriptions for this household?"

Let me be precise about what this is and what it is not. This is a keyword-presence detector. It detects whether a word or phrase exists in task records. It is not a document parser, a status verifier, a content analyzer, or a semantic reasoner. It does not examine document contents, verify signatures, check dates, validate completeness, or confirm that an action was performed successfully. It checks whether a task record containing a relevant keyword exists.

### The Task Status Blind Spot

This is the most significant methodology finding in this evaluation.

Min's `hasTask` function searches the concatenated text of all tasks regardless of task status. The `SFTask` type includes a `status` field with values like "Completed," "Not Started," "In Progress," and "Waiting on Client." The compliance engine does not filter on this field. It does not check it. It does not reference it.

Let me demonstrate with a concrete example from the demo dataset. The Patel Household has a task with subject "SEND DOCU — Patel IRA Beneficiary Form" and status "Not Started." This task was created 6 days ago. The beneficiary form has not been sent. It has not been signed. The IRA does not have a beneficiary designation on file.

Min's beneficiary-designation check uses the keyword "beneficiar" (intentionally truncated to match both "beneficiary" and "beneficiaries"). When the compliance engine runs against the Patel household, it concatenates all task text including "send docu — patel ira beneficiary form" into the `allTaskText` string. It then calls `hasTask("beneficiar")`. The substring "beneficiar" appears in "beneficiary." The check passes.

The check passes despite the fact that the beneficiary form has not been sent, has not been signed, and the IRA has no beneficiary designation on file. The task's status is "Not Started." Min does not know this. Min does not look.

This is a false pass. It is not an edge case. It is a structural property of the detection mechanism. Every check in the engine is vulnerable to this pattern. Any time a firm creates a Salesforce task with a relevant keyword in the subject — "Send KYC questionnaire," "Schedule suitability review," "Prepare ADV delivery" — the corresponding compliance check will pass, regardless of whether the task has been completed, started, or abandoned.

The implications for examination defense are severe. If Ridgeline presents Min's compliance scan to an SEC examiner showing "Beneficiary Designations Complete: PASS" for the Patel household, and the examiner then requests the actual beneficiary designation form and discovers it was never signed, the firm has presented a compliance tool that generated a false attestation. This does not merely undermine Min's credibility — it undermines the firm's supervisory framework, because it demonstrates that the firm relied on automated compliance checking without understanding or validating its methodology.

I want to be clear: I do not believe this is a design defect born of negligence. I believe this is a deliberate architectural trade-off. Filtering by task status would require defining which statuses constitute "completion" across every Salesforce implementation — and those statuses are not standardized. "Completed," "Closed," "Done," "Resolved," and custom picklist values all exist in the wild. The Min team likely chose breadth of detection over precision of verification, reasoning that finding a relevant task is better than missing it entirely.

That reasoning is correct for flagging. It is incorrect for certifying. The problem is not the detection mechanism — the problem is the label. When Min reports "Beneficiary Designations Complete: PASS," the word "Complete" and the status "PASS" imply verification. Min has not verified. Min has detected.

### Evidence Generation Overstates Verification

The false-pass problem extends to Min's evidence generation. When the suitability check matches the keyword "risk" in a task, the engine generates evidence with the string "Risk tolerance documented." Let me trace this precisely.

In `compliance-engine.ts`, lines 326-328:

```typescript
const suitKeywords = matchedKeywords("suitability-profile");
const suitEvidence: string[] = [];
if (suitKeywords.some(kw => kw === "risk")) suitEvidence.push("Risk tolerance documented");
```

The word "documented" implies that Min has verified the existence and content of a risk tolerance document. Min has not. Min has verified that the word "risk" appears somewhere in a task subject or description. The word "risk" could appear in "Risk tolerance questionnaire completed" (legitimate), "Follow up on risk discussion" (ambiguous), "Risk — need to discuss with client" (not documented), or even "At risk of missing deadline" (unrelated to risk tolerance entirely).

Similarly, the evidence string "Investment objectives documented" is generated when the keyword "investment objective" matches. "Suitability questionnaire completed" is generated when "suitability" matches. Each of these evidence strings asserts a level of verification that the engine did not perform.

For examination purposes, this matters enormously. Evidence is not decoration — it is the compliance record. When an examiner reviews Min's output and sees "Risk tolerance documented," the examiner will expect to find a documented risk tolerance assessment. If the firm's actual risk tolerance documentation is incomplete, inconsistent, or absent, the discrepancy between Min's evidence assertion and reality creates a credibility problem that is worse than having no automated evidence at all.

The fix is linguistic, not architectural. Evidence strings should describe what was detected, not what was verified. "Risk tolerance documented" should be "Task containing 'risk' found in household records." "Suitability questionnaire completed" should be "Task containing 'suitability' found in household records." This is less impressive on a dashboard. It is more defensible in an examination.

### Substring Matching: Precision vs. Recall

Min's keyword matching uses JavaScript's `String.includes()` method, which performs substring matching. This means the keyword "advisory" will match "advisory agreement," "advisory addendum," "advisory council meeting," and any other text containing the substring "advisory." The keyword is mapped to the ADV delivery check (`adv-delivery`), alongside "adv" and "brochure."

Let me enumerate the substring matching risks I identified:

**"adv" matches too broadly.** The keyword "adv" is intended to detect ADV Part 2A delivery. It will match "adv delivery," "adv amendment," "advisory agreement," "advanced planning," and "advocate." In the Ridgeline dataset, a task subject containing "advisory" in any context — "advisory committee review," "advisory fee reconciliation" — would trigger the ADV delivery check.

**"advisory" creates cross-check contamination.** The keyword "advisory" is mapped to `adv-delivery`. A task like "Signed advisory agreement" would pass the ADV delivery check, but signing an advisory agreement is not the same as delivering the ADV Part 2A brochure. These are distinct regulatory requirements (SEC Rule 204-3 for ADV delivery vs. contractual obligation for advisory agreement), and conflating them through keyword overlap is a methodology weakness.

**"beneficiar" is intentionally truncated.** The keyword "beneficiar" catches both "beneficiary" and "beneficiaries," which is sensible. However, substring matching means it would also match "beneficiarius" (Latin, unlikely in Salesforce) or any compound word containing the substring. The truncation is pragmatic — it increases recall at the cost of theoretical precision. In practice, the false-positive risk from this specific truncation is negligible.

**"privacy" matches broadly.** The keyword "privacy" is mapped to the privacy notice delivery check. It will match "privacy notice sent," "privacy policy update," "privacy settings changed," and "data privacy review." Some of these are related to the Regulation S-P requirement; others are not. A firm that logs IT security tasks in Salesforce with subjects like "Update privacy settings on client portal" would get a false pass on the privacy notice delivery check.

**"risk" is a high-frequency word.** The keyword "risk" is mapped to the suitability profile check. This is arguably the most problematic keyword in the map because "risk" appears in countless Salesforce task contexts: "risk tolerance assessment" (correct match), "at risk of missing deadline" (false match), "risk management review" (possibly related, possibly not), "cybersecurity risk assessment" (unrelated). Given that suitability is a core examination focus, the false-pass rate on this keyword deserves attention.

**"rollover" and "pte" for PTE compliance.** The PTE 2020-02 check triggers when a rollover is detected (keywords: "rollover," "pte") and then checks for PTE documentation (keyword: "pte"). This is a two-stage check — detection of the rollover, then verification of the documentation — which is methodologically stronger than a single-stage check. However, both stages still rely on keyword presence without status filtering.

### Comparison to Alternative Approaches

To evaluate Min's methodology fairly, I need to compare it against the alternatives. In my eighteen years of evaluating compliance platforms, I have seen five distinct approaches to automated compliance verification:

**1. Keyword matching (Min's approach).** Search task records for relevant terms. Advantages: fast, simple, works across any Salesforce implementation regardless of customization. Disadvantages: no content verification, no status awareness, substring false positives. Accuracy profile: high recall (catches most relevant items), lower precision (includes false positives), and critically — no ability to distinguish between planned, in-progress, and completed actions.

**2. Status-aware keyword matching.** Same as keyword matching, but filtering tasks to "Completed" or equivalent status before matching. Advantages: eliminates the false-pass problem for tasks in non-complete states. Disadvantages: requires knowing which status values mean "completed" across implementations, and does not verify content. Accuracy profile: significantly higher precision than basic keyword matching with modest implementation complexity.

**3. Document parsing.** Extract and analyze the content of attached documents (PDFs, signed forms, questionnaires). Advantages: verifies actual content, not just task existence. Disadvantages: requires document attachment conventions, OCR or PDF parsing capability, and significantly more processing time. Accuracy profile: highest precision, but only for firms that consistently attach documents to Salesforce records.

**4. API-level verification.** Connect directly to DocuSign, custodians, or other systems to verify status programmatically. Advantages: ground-truth verification (DocuSign confirms the envelope was signed, the custodian confirms the account was opened). Disadvantages: requires API integrations with each system, per-custodian development, and ongoing maintenance as APIs change. Accuracy profile: highest possible for the specific integrations built, but limited to integrated systems.

**5. Semantic analysis.** Use natural language processing or large language models to interpret task text in context. Advantages: can distinguish "risk tolerance assessment completed" from "at risk of deadline." Disadvantages: non-deterministic, requires careful prompt engineering or model training, introduces AI/ML regulatory complexity (SEC 2024 AI Risk Alert), and is difficult to audit. Accuracy profile: potentially high precision but not deterministic — the same input may produce different outputs, which is disqualifying for compliance use.

Min chose approach #1. I would have recommended approach #2 as the minimum viable improvement. Status-aware keyword matching eliminates the false-pass problem — the single most significant finding in this evaluation — without requiring document parsing, API integrations, or AI. It requires one additional filter: checking that at least one matching task has a status in a configurable "completed" status list (defaulting to "Completed" with the ability for firms to add custom statuses like "Closed" or "Done").

### The Concatenation Problem

There is a secondary issue with the keyword matching approach that deserves attention. The engine concatenates all task subjects and descriptions into a single string before searching:

```typescript
const allTaskText = [...taskSubjects, ...taskDescs].join(" ");
```

This concatenation means that keywords can match across task boundaries. If one task has subject "Schedule risk discussion" and another has subject "Update tolerance levels," the concatenated string contains both "risk" and "tolerance" — but neither task individually refers to "risk tolerance." In practice, this is unlikely to cause false passes for phrase-level keywords like "trusted contact" or "form crs," but it could theoretically affect single-word keywords like "risk" or "privacy."

The concatenation also means that task descriptions — which may contain notes, instructions, or copy-pasted email content — contribute to the match pool alongside task subjects. A description containing "Note: client called to discuss risk in equity markets" would trigger the suitability check's "risk" keyword, even though the task has nothing to do with risk tolerance documentation.

The mitigation for this is straightforward: keyword overrides. Firms that experience false positives from description-level matches can override the default keywords with more specific phrases (e.g., replacing "risk" with "risk tolerance assessment" or "risk profile completed"). The keyword override system is well-designed for this purpose. But firms need to know the issue exists in order to know they should configure around it.

### Remediation Templates: A Bright Spot

One area where Min's methodology exceeds expectations is the remediation template system. For each check that fails or warns, the engine can attach a multi-step remediation workflow. I reviewed all thirteen built-in remediation templates:

Each template specifies an ordered sequence of actions, with each action assigned to a role (advisor, ops, client, or custodian), a follow-up timeframe in days, and optional form URLs. The beneficiary-designation template, for example, specifies five steps: (1) ops downloads the custodian beneficiary change form, (2) ops sends the form via DocuSign, (3) client completes and signs, (4) ops submits to custodian, (5) custodian confirms processing. Each step has a realistic timeframe (1 day for internal steps, 7 days for client actions, 5 days for custodian processing).

This is operationally sophisticated. Most compliance platforms I have evaluated stop at "this check failed." Min tells you what to do about it, who should do it, and how long it should take. The role assignments (advisor vs. ops vs. client vs. custodian) reflect genuine operational understanding of the account-opening workflow. The follow-up day counts are realistic, not aspirational.

The remediation templates also serve an examination-defense purpose: they demonstrate that the firm has pre-defined response procedures for compliance deficiencies. An examiner who sees that a failed beneficiary check immediately triggers a five-step remediation workflow with role assignments and timeframes will conclude that the firm has thought through its response procedures — which is exactly the kind of evidence that demonstrates supervisory diligence.

### Methodology Verdict

Min's keyword matching methodology is adequate for flagging and inadequate for certifying.

Let me define those terms precisely, because the distinction is the most important takeaway from this entire evaluation. Flagging means identifying that a compliance requirement has been addressed in some form — a relevant task exists, someone has at least created a record related to the requirement. Certifying means confirming that the requirement has been fulfilled — the document was signed, the form was completed, the review was conducted and approved.

Min flags correctly. In my review of the demo dataset, every legitimate compliance action was detected by the appropriate check. The KYC check found KYC tasks. The suitability check found suitability-related tasks. The DocuSign check found DocuSign-related tasks. The recall rate — the percentage of actual compliance actions that Min detects — is high. I estimate 85-90% for firms using standard Salesforce task naming conventions, with the gap primarily in firms using non-standard terminology that does not include any of the configured keywords.

The gap is in what "pass" means. When Min reports a check as "PASS," it means "I found a task with a relevant keyword." It does not mean "this compliance requirement has been fulfilled." The distance between those two statements is where examination risk lives.

I want to quantify this gap using the demo dataset. The Ridgeline demo includes 8 households with a total of approximately 50 Salesforce tasks. Of these tasks, roughly 30% have status "Not Started" — meaning the action has not been performed. Any compliance check that matches keywords in these "Not Started" tasks produces a false pass. In the Patel household specifically, the beneficiary form is the clearest example, but the pattern extends to any household where compliance-related tasks have been created but not yet executed.

For Ridgeline's purposes, this means: Min is a powerful compliance monitoring tool, but it should never be described as a compliance verification tool. In supervisory procedures, in ADV disclosures, and in examination responses, Min should be characterized as a flagging system that identifies potential gaps and highlights areas requiring human review. The human review — actually confirming that the beneficiary form was signed, that the ADV was delivered, that the risk tolerance questionnaire was completed — remains the firm's responsibility.

I have a parallel from my CCO years at Meridian that illustrates why this matters. In 2017, we deployed a compliance monitoring tool that checked for suitability documentation by looking for suitability questionnaire task records in our CRM. During a 2018 SEC examination, the examiner requested suitability documentation for 20 randomly-selected client accounts. For 3 of those accounts, the CRM showed a "Suitability questionnaire sent" task, but the questionnaire had never been returned. Our compliance tool showed "pass." The examiner found "deficiency." We spent three months remediating, and the experience directly informed how I evaluate compliance technology today. The tool was not wrong — it accurately detected that a suitability task existed. It was incomplete — it did not verify that the task had been resolved. Min has the same incompleteness, and I want Ridgeline to understand it before they sit across from an examiner.

This is not a damning finding. Every compliance technology I have evaluated in eighteen years has some version of this gap. The question is whether the vendor and the firm are honest about where the automation ends and where human judgment begins. Min's gap is clearly identifiable and clearly documentable. That makes it manageable. What makes it dangerous is if nobody tells the firm it exists.

---

## Part 3: Regulatory Coverage Assessment

### Check-by-Check Review

Min's compliance engine runs 30+ built-in checks across six categories: identity, suitability, documents, account, regulatory, and firm (custom). I reviewed each check against its cited regulation, its keyword mapping, its pass/fail/warn severity, its evidence generation, and its remediation template.

#### Identity & KYC (3 checks)

**KYC Profile Completed** — FINRA Rule 2090. Keywords: "kyc," "suitability." Severity: fail. This check correctly cites FINRA Rule 2090, which requires firms to know the essential facts concerning every customer. The keyword "suitability" as a secondary trigger for the KYC check is defensible — many firms combine KYC and suitability into a single intake process. The evidence generation pulls contact data (name, email, phone) to show what CRM data exists. This is one of the stronger checks because it combines keyword detection with contact record analysis.

**Trusted Contact Designated** — FINRA Rule 4512. Keywords: "trusted contact." Severity: warn. Correctly cites Rule 4512, which requires firms to make reasonable efforts to obtain trusted contact information for new accounts opened after February 5, 2018. The "warn" severity rather than "fail" is appropriate — the rule requires reasonable efforts, not mandatory designation. The phrase-level keyword "trusted contact" is specific enough to minimize false matches.

**Identity Verification** — USA PATRIOT Act / CIP Rule. Keywords: "identity verified," "gov id." Severity: fail. Correctly cites the Customer Identification Program requirement. The "fail" severity is appropriate — CIP is a legal obligation, not a best practice. The keywords are reasonably specific, though "gov id" could theoretically match non-CIP contexts.

**Assessment:** Identity checks are well-constructed. Regulation citations are accurate. Severity assignments are appropriate. The dual-keyword approach for KYC (covering both "kyc" and "suitability") demonstrates awareness of varied firm practices. The KYC check's enrichment with contact data (pulling names, email, and phone populated indicators from CRM records) goes beyond pure keyword matching — it combines task-based detection with record-based evidence, which produces a more complete picture for review. I would like to see this pattern extended to other checks where CRM data can supplement keyword detection.

One observation on the trusted contact check: FINRA Rule 4512 requires "reasonable efforts" to obtain trusted contact information, not mandatory designation. Min's "warn" severity correctly reflects this — a warning flags the missing information for review without asserting a regulatory failure. Several competing platforms incorrectly classify trusted contact as a "fail," which overstates the regulatory requirement. Min gets the severity calibration right here.

#### Suitability (2-3 checks depending on account type)

**Suitability Profile Current** — FINRA Rule 2111 / Reg BI. Keywords: "risk," "investment objective," "suitability." Severity: fail. This is the check where the evidence overstatement problem is most acute. The keyword "risk" is too broad — it will match non-suitability contexts. However, the check correctly cites both FINRA 2111 (the suitability rule that applies to broker-dealers) and Reg BI (the best interest standard), and the "fail" severity is appropriate. The evidence breakdown — separately logging "Risk tolerance documented," "Investment objectives documented," and "Suitability questionnaire completed" based on which keywords matched — is a good design pattern that shows which specific components were detected.

**PTE 2020-02 Documentation** — DOL Prohibited Transaction Exemption. Keywords: "pte." Trigger: detected when "rollover" or "pte" keywords appear in tasks. Severity: warn. This is a conditional check — it only runs when a rollover is detected, which is methodologically sound. The DOL citation is correct. PTE 2020-02 requires documented proof that a rollover recommendation is in the client's best interest. The "warn" severity is appropriate for the initial detection; I would prefer "fail" for retirement accounts where a rollover has been clearly identified, but the conditional trigger partially mitigates this.

**Assessment:** Suitability checks cover the core requirements. The PTE conditional logic is particularly well-designed — it avoids alerting on non-rollover accounts while ensuring rollover accounts get heightened scrutiny. The "risk" keyword breadth is the primary weakness.

#### Documents (3 checks)

**Form CRS Delivered** — SEC Rule 17a-14 / Reg BI. Keywords: "form crs," "client relationship summary." Severity: fail. Correctly cites the SEC requirement. Form CRS must be delivered before or at the time of an investment recommendation. The "fail" severity is appropriate — this is a priority examination item. The phrase-level keywords are specific enough to minimize false matches.

**ADV Part 2A Disclosure** — SEC Rule 204-3 (Brochure Rule). Keywords: "adv," "advisory," "brochure." Severity: warn. Correctly cites the Brochure Rule. The "warn" severity is debatable — ADV delivery within 48 hours of engagement is mandatory, not advisory. However, the warn-rather-than-fail approach may reflect the reality that many firms deliver ADV as part of the engagement process and do not create separate tasks for it. The keyword breadth issue I described earlier ("advisory" matching non-ADV contexts) applies here.

**Privacy Notice Delivered** — Regulation S-P. Keywords: "privacy." Severity: warn. Correctly cites Reg S-P. The single-word keyword "privacy" has the broadest false-match risk of any keyword in the system. The "warn" severity is appropriate — privacy notice delivery is required but is rarely an enforcement priority.

**Assessment:** Document delivery checks correctly cite their regulations and cover the three most common delivery requirements (Form CRS, ADV, Privacy Notice). The missing check is the advisory agreement itself — while this is a contractual rather than regulatory requirement, examiners frequently request advisory agreements during examinations. Some firms may capture this through the "adv"/"advisory" keywords, but the conflation with ADV Part 2A delivery is problematic.

There is also a temporal gap in the document delivery checks. Regulation S-P requires annual privacy notice delivery. SEC Rule 204-3 requires ADV delivery within 48 hours of engagement and annual offer to deliver thereafter. Min checks whether a privacy or ADV task exists anywhere in the household's task history — it does not check when the task was created or whether it is within the required period. A privacy notice delivered three years ago will still pass the check today. This is the "periodic requirement" limitation I will address in the findings: keyword-presence checking cannot enforce time-based requirements without date filtering.

For Ridgeline specifically, the Form CRS delivery check is the most immediately relevant. Form CRS is a priority examination item — SEC examiners consistently check for delivery records, and the SEC published a Risk Alert specifically about Form CRS compliance in 2023. Min's check correctly uses the phrase-level keyword "form crs" (minimizing false matches) and assigns "fail" severity (reflecting the examination priority). This is the right configuration.

#### Account Setup (3-4 checks)

**Beneficiary Designations Complete** — Firm Best Practice / ERISA. Keywords: "beneficiar." Severity: warn. This is the check I used to demonstrate the false-pass problem. The severity assignment is reasonable — beneficiary designation is a best practice for non-retirement accounts and a custodial requirement for retirement accounts. The truncated keyword is pragmatic. The "why it matters" text correctly identifies this as the #1 Schwab NIGO rejection reason for IRA applications, which demonstrates custodian-specific knowledge embedded in the engine.

**All Signatures Obtained** — Custodial Requirement. Keywords: "docusign," "docu." Severity: fail. This check has an interesting additional behavior: it filters tasks to find those matching the signature keywords and includes up to three task subjects with their statuses as evidence. This is the only check in the engine that references individual task status in its evidence output. However, the pass/fail determination still uses the keyword-presence mechanism — the task status appears in the evidence display but does not affect the pass/fail decision.

**ACH Authorization** — NACHA Operating Rules. Keywords: "moneylink," "ach." Severity: pass (only appears when detected). This check only generates a result when ACH-related keywords are found, always showing as "pass." It is effectively a documentation check — if the firm has an ACH task, Min confirms it exists. The NACHA citation is correct.

**Assessment:** Account setup checks are functional but represent the area where the false-pass problem is most visible. The Patel beneficiary example is a clear demonstration. The signatures check's inclusion of task status in evidence — without using it for the pass/fail determination — creates an interesting inconsistency: the evidence shows "Envelope: SEND DOCU — Patel IRA Beneficiary Form (Not Started)" while the check shows "PASS."

#### Account-Type-Specific Checks (2-3 per type)

Min runs additional checks based on account type: trust accounts get 3 additional checks (trust certification, trustee verification, trust agreement), entity accounts get 3 additional checks (authorized signers, ERISA compliance, entity resolution), and retirement accounts get 2 additional checks (PTE compliance if no rollover detected, RMD tracking).

**Trust checks** cite "Custodial Requirement / Trust Compliance," "UCC / State Trust Law," and "Firm Best Practice" respectively. These citations are reasonable — trust compliance requirements derive from a combination of custodial rules, state trust law (principally the Uniform Trust Code as adopted), and firm policies. The keyword pairs are specific: "trust certification" / "trust cert," "trustee" / "trust verification," "trust agreement" / "trust document."

**Entity checks** cite "Custodial Requirement," "ERISA / DOL," and "State Corporate Law." The ERISA check is particularly well-designed: it uses "erisa" and "plan document" as keywords, and its "why it matters" text correctly notes that ERISA applies only to employee benefit plans, not to all entities. The "warn" severity rather than "fail" reflects the conditional applicability.

**Retirement checks** include RMD tracking (IRC Section 401(a)(9)) and conditional PTE compliance. The RMD check uses "rmd" and "required minimum" as keywords and correctly cites the Internal Revenue Code section governing required minimum distributions. The "warn" severity is appropriate — RMD applicability depends on the account holder's age, which Min does not check.

**Assessment:** Account-type-specific checks significantly improve Min's coverage depth over a one-size-fits-all approach. The trust, entity, and retirement checks address the most common account-type-specific regulatory requirements. The regulation citations are accurate. This represents a meaningful improvement over what the COO evaluation (Evaluation #1) identified as "one-size-fits-all" checking. These checks appear to have been added in response to that feedback.

#### Regulatory (2 checks)

**Completeness Check Passed** — SEC Examination Readiness. Keywords: "completeness." Severity: fail. This check is unusual in that it produces evidence including the number of Salesforce records scanned and the number of completed tasks — operational metadata rather than compliance-specific evidence. The "fail" severity is aggressive for what is fundamentally a self-referential check (did the firm create a "completeness check" task?).

**Annual Review Due** — SEC Examination Best Practice. No keywords — triggered by household creation date exceeding 365 days. This is the only time-based check in the engine and represents a different detection paradigm entirely. Rather than keyword matching, it performs a date calculation against the household's `createdAt` field. This is methodologically sound: annual reviews are time-triggered, not event-triggered.

**Assessment:** The annual review check's date-based approach is superior to keyword matching for time-triggered requirements. I would prefer to see more checks adopt this pattern — for example, ADV delivery should check whether the last delivery was within the required timeframe, not just whether a delivery task exists.

#### Firm Custom Checks

Min supports custom checks defined by firms. Each custom check specifies a keyword, regulation citation, "why it matters" text, and fail/warn severity. The custom checks use the same `hasTask()` keyword matching mechanism as built-in checks.

The custom check framework is Min's primary extensibility mechanism. It is how firms fill the coverage gaps I will enumerate in the next section. Combined with the keyword override system (which allows firms to replace default keywords for built-in checks), custom checks provide meaningful flexibility.

**Assessment:** The custom check framework is well-designed from an extensibility standpoint. The ability to define keyword, regulation, severity, and explanation text per check gives firms sufficient control. The limitation is the same as the built-in checks: keyword presence without status verification.

### Regulatory Citation Accuracy

I verified every regulatory citation in the compliance engine against the current regulatory text:

| Check | Citation | Accurate? | Notes |
|---|---|---|---|
| KYC Profile | FINRA Rule 2090 | Yes | Know Your Customer obligation |
| Trusted Contact | FINRA Rule 4512 | Yes | Customer Account Information rule |
| Identity Verification | USA PATRIOT Act / CIP | Yes | 31 CFR 1010.220 |
| Suitability Profile | FINRA Rule 2111 / Reg BI | Yes | Both applicable depending on registration |
| PTE Documentation | DOL PTE 2020-02 | Yes | Prohibited Transaction Exemption |
| Form CRS | SEC Rule 17a-14 / Reg BI | Yes | Form CRS delivery requirement |
| ADV Delivery | SEC Rule 204-3 | Yes | Brochure Rule |
| Privacy Notice | Regulation S-P | Yes | Privacy of consumer financial information |
| Beneficiary | ERISA / Firm Best Practice | Yes | Appropriate dual citation |
| Signatures | Custodial Requirement | Yes | Custodian-specific, not a single regulation |
| ACH Authorization | NACHA Operating Rules | Yes | Electronic payment authorization |
| Completeness | SEC Examination Readiness | Yes | Best practice, not specific regulation |
| Trust Certification | Custodial / Trust Compliance | Yes | Composite requirement |
| Trustee Verification | UCC / State Trust Law | Yes | Uniform Trust Code |
| ERISA Compliance | ERISA / DOL | Yes | Employee benefit plan requirement |
| RMD Tracking | IRC Section 401(a)(9) | Yes | Required Minimum Distribution code section |
| Annual Review | SEC Examination Best Practice | Yes | Not a codified rule |

Every regulatory citation in the compliance engine is accurate. This is notable. In my experience evaluating compliance platforms, roughly 40% contain at least one citation error — usually confusing FINRA rules with SEC rules, or citing repealed provisions. Min's citations demonstrate genuine regulatory knowledge embedded in the development process.

### Coverage Gap Analysis

Here I must distinguish between what Min checks by default, what Min checks via community templates, and what an SEC examiner would ask about that Min does not check at all.

#### Missing from Default Checks — Available via Templates

The following compliance areas are not covered by Min's built-in checks but are available through the four community templates:

| Gap Area | Regulation | Template Source | Template Adoption |
|---|---|---|---|
| Fee Billing Reconciliation | IAA Section 206 | Examiner-Ready Framework | 47 firms |
| Outside Business Activities | FINRA Rule 3270 | Examiner-Ready Framework | 47 firms |
| Gifts & Entertainment | FINRA Rule 3220 | Examiner-Ready Framework | 47 firms |
| Political Contributions | SEC Rule 206(4)-5 | Examiner-Ready Framework | 47 firms |
| Client Complaint Log | FINRA Rule 4530 | Examiner-Ready Framework | 47 firms |
| Cybersecurity Assessment | SEC Reg S-ID/S-P | Examiner-Ready Framework | 47 firms |
| Business Continuity Plan | FINRA Rule 4370 | Examiner-Ready Framework | 47 firms |
| Code of Ethics | SEC Rule 204A-1 | Annual Review Checklist | 156 firms |
| Custody Rule | SEC Rule 206(4)-2 | Annual Review Checklist | 156 firms |
| Annual Compliance Review | SEC Rule 206(4)-7 | Annual Review Checklist | 156 firms |

#### Missing from Both Default Checks and Templates

These compliance areas are not covered by Min in any form:

| Gap Area | Regulation | Examination Priority |
|---|---|---|
| Anti-Money Laundering (AML) | Bank Secrecy Act / FinCEN | High — SEC exam request standard item |
| Insider Trading Prevention | Securities Exchange Act Section 10(b) | Medium — typically policy-based review |
| Advertising & Marketing Review | SEC Rule 206(4)-1 (Marketing Rule) | High — 2024-2026 exam priority |
| Trade Allocation & Best Execution | FINRA Rule 5310 / Advisers Act | High — standard exam review area |
| Portfolio Management Compliance | Advisers Act Section 206 | High — core fiduciary obligation |
| Books & Records Retention | SEC Rule 204-2 | High — foundational requirement |
| Proxy Voting | SEC Rule 206(4)-6 | Medium — if firm votes proxies |
| Business Continuity Testing | FINRA Rule 4370 | Medium — annual testing requirement |
| Valuation Procedures | ASC 820 / SEC guidance | Medium — if firm holds illiquid assets |

The largest gaps are AML program compliance, advertising and marketing review (a 2024-2026 SEC examination priority), and trade allocation and best execution review. These are standard SEC examination topics that appear on virtually every document request list.

### Custodian Rules Engine: A Competitive Strength

The custodian rules engine (`custodian-rules.ts`) deserves separate analysis because it represents Min's deepest and most differentiated content. The engine covers three custodians — Schwab, Fidelity, and Pershing — with eight account types each:

1. Individual Brokerage
2. JTWROS (Joint Tenants with Right of Survivorship)
3. Joint TIC (Tenants in Common)
4. Traditional IRA
5. Roth IRA
6. Rollover IRA
7. SEP IRA
8. Trust

For each custodian-account-type combination (24 total), the engine specifies:

- **Required documents** with regulatory citations where applicable
- **Conditional documents** with trigger conditions (e.g., "Funding via rollover" triggers Rollover Recommendation and PTE 2020-02)
- **Signer count** requirements
- **Beneficiary requirements** with custodian-specific notes
- **Income eligibility** parameters (Roth IRA MAGI limits with phase-out ranges)
- **Contribution limits** (current year)
- **NIGO risks** ranked by frequency (most common, common, occasional) with impact descriptions and prevention strategies
- **Estimated processing time** in minutes

I reviewed the custodian-specific content in detail. Several elements demonstrate genuine operational knowledge:

**Fidelity spousal consent for community property states.** The Fidelity Traditional IRA entry includes a NIGO risk for "Spousal consent missing for beneficiary in community property state" with the prevention strategy "State residency check flags community property requirement during intake." This is a Fidelity-specific requirement that most compliance platforms miss. Community property states (Arizona, California, Idaho, Louisiana, Nevada, New Mexico, Texas, Washington, Wisconsin) require spousal consent for IRA beneficiary designations that name someone other than the spouse. Fidelity enforces this; Schwab handles it differently. The fact that this nuance is encoded in the rules engine is impressive.

**Pershing ACAT-specific risks.** The Pershing entries reference ACAT (Automated Customer Account Transfer Service) specifics: "Account number format incorrect on ACAT form" and "ACAT form missing contra-firm DTC number." These are Pershing-specific operational realities — Pershing uses the ACATS system for all inter-firm transfers, and DTC participant number errors are a known cause of rejected transfers. This level of custodian-specific detail is rare.

**Trust certification staleness.** The Fidelity Trust entry includes a conditional document requirement: "Trustee Affidavit — Fidelity may require a trustee affidavit when trust certification is older than 12 months." The corresponding NIGO risk specifically addresses this: "Trust certification older than 12 months without affidavit." Pershing's trust entry has a different conditional: "Corporate Resolution — Pershing requires a corporate resolution for trusts established by a business entity." These are genuinely different requirements between custodians, and encoding them correctly is operationally valuable.

**Contribution limits and income eligibility.** The Roth IRA entries across all three custodians include income eligibility parameters: MAGI limits of $161,000 (single) and $240,000 (joint), with phase-out ranges starting at $146,000 and $230,000 respectively, citing 2024 tax year values. The engine includes alternative recommendations ("Traditional IRA" or "Backdoor Roth conversion") for clients who exceed the limits. The contribution limits ($7,000 under 50, $8,000 over 50 for IRAs; $69,000 for SEP IRAs) are accurate for the 2024 tax year. These are not compliance checks per se — they are operational guardrails that prevent excess contribution penalties (6% per year on excess amounts). Their inclusion in the custodian rules engine rather than the compliance engine is architecturally appropriate.

**Estimated processing times.** Each account type includes an estimated processing time in minutes: 15 for individual and IRA accounts, 20 for joint, rollover, and SEP accounts, 25 for TIC, trust, and complex accounts. These estimates are realistic based on my operational experience — a routine individual brokerage account opening takes 12-18 minutes with DocuSign, while a trust account with certification review takes 20-30 minutes. The inclusion of processing time estimates is unusual for a compliance tool and demonstrates that the custodian rules engine was designed by someone with account-opening operational experience, not just regulatory knowledge.

**Cross-custodian comparison capability.** Because all three custodians follow the same data schema (`AccountTypeRules`), the engine enables direct comparison of custodian requirements for the same account type. For a Traditional IRA, for example: Schwab requires 4 documents, Fidelity requires 5 (adding the Fidelity IRA Customer Agreement), and Pershing requires 5 (adding the IRA Custodial Agreement). The NIGO risks differ: Schwab lists 3 risks, Fidelity lists 4 (adding spousal consent for community property states), and Pershing lists 4 (adding IRA custodial agreement signature). This cross-custodian visibility is particularly valuable for multi-custodian firms like Ridgeline, which currently uses Schwab as primary custodian and is considering Fidelity for a $22M endowment.

**Assessment:** The custodian rules engine is the strongest component of Min's compliance framework. Three custodians multiplied by eight account types multiplied by 3-5 NIGO risks each yields approximately 100 discrete risk items, each with prevention strategies. I counted the specific data points: 24 account-type definitions, 96 required documents, 48 conditional documents, 72 NIGO risks with prevention strategies, 6 income eligibility configurations, and 12 contribution limit specifications. In my eighteen years of evaluating compliance platforms, I have not seen this level of custodian-specific detail in a comparable product. SmartRIA focuses on compliance calendar management, not custodial document rules. RIA in a Box provides outsourced CCO services but not custodian-specific NIGO prevention. This is a genuine competitive moat.

The custodian rules engine also represents Min's most defensible competitive position. Replicating this data requires deep operational knowledge of each custodian's requirements — knowledge that changes when custodians update their forms, policies, or processing rules. The maintenance burden is significant, which means competitors cannot easily replicate it, but it also means Min must have a process for keeping the data current. I did not see evidence of a formal custodian rules update process, and I would recommend establishing one (quarterly review against each custodian's current form library and processing guidelines).

### Templates as Community Intelligence

Min's four compliance templates represent a community-driven approach to coverage gap filling:

**Examiner-Ready Framework** (47 firms, 8 checks). Authored by "Maggie Chen-Ramirez, CFP, Former FINRA Examiner." Covers fee billing reconciliation, annual privacy notices, outside business activities, gifts and entertainment, political contributions, client complaints, cybersecurity, and business continuity. This template alone fills 8 of the 10 gaps I identified in the "available via templates" table above.

**Small RIA Essentials** (124 firms, 5 checks). Authored by "Min Best Practices Team." Covers KYC, suitability, Form CRS, ADV, and beneficiary designations. This template overlaps significantly with the built-in checks but may serve as a simplified configuration for small firms that find the full check suite overwhelming.

**Reg BI Complete** (89 firms, 4 checks). Authored by "Min Regulatory Team." Covers Regulation Best Interest's four obligations: disclosure, care, conflict of interest, and compliance. This is the most regulation-specific template, mapping directly to Reg BI's four-obligation framework.

**Annual Review Checklist** (156 firms, 6 checks). Authored by "Min Best Practices Team." Covers ADV annual amendment, ADV summary delivery, annual privacy notice, annual compliance program review, code of ethics acknowledgment, and custody rule compliance. This is the most-adopted template, which makes sense — annual review requirements are universal for SEC-registered advisers.

The template architecture is well-designed. Templates are arrays of check definitions that can be installed as custom checks. Each template check includes the same fields as a custom check: keyword, regulation, severity, and explanation. The adoption statistics (47, 124, 89, 156 firms respectively) provide social proof and help firms assess template quality.

**Assessment:** The template system is a smart architectural decision. Rather than attempting to build every possible compliance check into the core engine (which would require maintaining currency with evolving regulations across practice areas), Min provides a core engine covering foundational requirements and a template marketplace covering specialized needs. This is the right trade-off for a product serving firms of varying sizes and complexity levels.

---

## Part 4: Scoring & Prioritization Review

### Health Score Methodology

Min assigns each household a health score from 0 to 100, composed of four equally-weighted-but-not-equal components:

| Component | Weight | Source |
|---|---|---|
| Compliance Coverage | 30% | Whether a compliance review has been conducted |
| DocuSign Velocity | 25% | How quickly DocuSign envelopes are signed |
| Tasks On Time | 25% | Percentage of tasks completed by due date |
| Meeting Coverage (90d) | 20% | Recency of last advisor meeting |

The score is computed in `demo-data.ts` using a straightforward weighted average:

```typescript
function computeHealth(breakdown: { score: number; weight: number }[]): number {
  return Math.round(breakdown.reduce((s, b) => s + b.score * b.weight / 100, 0));
}
```

Status thresholds are: 80+ = "on-track" (green), 60-79 = "needs-attention" (amber), below 60 = "at-risk" (red).

I have several methodological questions about this scoring model.

**Why is DocuSign velocity a compliance metric?** The speed at which clients sign documents is an operational efficiency indicator, not a compliance measurement. A DocuSign envelope that has been waiting 9 days (Jackson household, Roth conversion docs) may indicate client non-responsiveness, not a compliance failure. Conversely, a client who signs within minutes provides no additional compliance assurance over one who signs in 3 days. DocuSign velocity is legitimately useful for operational triage ("which envelopes need follow-up?") but is not a compliance measurement, and including it in a score labeled "health" alongside compliance coverage creates a category confusion.

**Why is meeting coverage only 20%?** For an SEC-registered investment adviser, the advisory relationship is the central regulatory construct. The frequency and documentation of client meetings is relevant to demonstrating suitability of ongoing recommendations, monitoring client circumstances for material changes, and fulfilling the duty of care under Reg BI. I would argue that meeting coverage should be weighted higher than DocuSign velocity for compliance purposes.

**Are the weights empirically validated?** The weights — 30/25/25/20 — appear to be fixed constants, not derived from any empirical analysis of which factors predict examination outcomes, client complaints, or compliance deficiencies. I asked myself: would an SEC examiner weight these factors the same way? The answer is no. An examiner would weight compliance coverage and suitability documentation far above DocuSign velocity and meeting frequency. The current weights produce a score that is operationally useful but not compliance-calibrated.

**Should weights vary by account type?** The Patel household ($5.1M, entity/trust) and the Whitfield household ($1.2M, new individual) receive the same weighting model. A trust account with RMD obligations, PTE documentation requirements, and trust certification renewal deadlines faces fundamentally different compliance risks than a new individual account. The Chen/Richards household ($6.3M trust with an RMD deadline in 22 days) receives a Tasks On Time score of 70% — the same weight category as any other household with late tasks. An RMD miss carries a 25% excise tax penalty. A late follow-up call carries no regulatory consequence. The scoring model treats these equally.

**Should weights vary by AUM?** Examination likelihood and examination intensity both correlate with AUM. A $6.3M household represents materially more examination risk than a $1.2M household. The scoring model does not reflect this.

**Assessment:** The health score is operationally useful. It provides a quick visual indicator of which households need attention, and the decomposition into four components (visible via breakdown detail) allows users to understand why a score is low. However, the score should not be characterized as a compliance metric. It is an operational health indicator that includes compliance as one of four components. For examination purposes, only the compliance coverage component is directly relevant. The remaining three components measure operational efficiency, which is correlated with but not equivalent to compliance posture.

### Triage Algorithm

Min's triage system (`home-stats.ts`, `triage-config.ts`) produces a prioritized queue of action items for the morning workflow. The algorithm uses three urgency tiers:

| Tier | Label | Sources |
|---|---|---|
| "now" | Urgent | High-priority overdue tasks; DocuSign unsigned > threshold days |
| "today" | Today | Normal-priority overdue tasks; tasks due today/tomorrow |
| "this-week" | This Week | Unreviewed households; stale households |

The triage configuration is fully customizable via `TriageThresholdConfig`:

```typescript
unsignedDocuSignDays: 5      // days before DocuSign triggers "now"
dueSoonDays: 1               // days until due to qualify as "due soon"
complianceUnreviewedDays: 7  // days without review to appear in triage
staleHouseholdDays: 30       // days of inactivity for "stale" classification
triageCap: 7                 // maximum triage items shown
```

The configurable thresholds are a strength. Different firms have different tolerance levels for unsigned documents or unreviewed households. The default values are reasonable starting points.

**The 7-item cap.** The `triageCap` of 7 limits the displayed triage items. This is operationally sound — a queue longer than 7 items loses its triage utility and becomes a task list. However, item #8 is invisible. If the queue contains 3 "now" items, 3 "today" items, and the cap is reached, the "this-week" items — including unreviewed households with potential compliance gaps — will not appear. The user has no indication that triage items were suppressed. A "7 of 12 items shown" indicator would address this.

**Triage does not map to regulatory risk.** The urgency tiers are operational (when does this need attention?) not regulatory (what is the examination risk?). A high-priority overdue task about scheduling a birthday card for a client and a high-priority overdue task about processing an RMD before the IRS deadline both receive "now" urgency. The triage system does not distinguish between regulatory obligations and operational convenience. This is appropriate for a morning workflow tool but insufficient for compliance prioritization.

**Snooze options are contextually intelligent.** The `computeSnooze` function generates context-specific snooze options. The Patel NIGO item gets "Before account submission (Feb 21)" as a snooze option. The Chen RMD item gets "2 weeks before deadline (Mar 1)" and "3 days before deadline (Mar 10)." Generic items get "Tomorrow," "Next Monday," and "In 2 weeks." This is the kind of hidden operational depth that demonstrates genuine product investment. The SEC examination (Evaluation #5) flagged dismiss reasons as a critical audit mechanism; contextual snooze options that reference actual deadlines are the positive counterpart.

**Assessment:** The triage algorithm is the strongest operational feature in Min. It is correctly designed as a morning workflow tool, not a compliance system. The configurable thresholds, contextual snooze options, and multi-source data attribution are well-implemented. The limitation is the same as the health score: it should not be characterized as a compliance prioritization system. It is an operational prioritization system that includes compliance-relevant items.

### Insight Generation

Min generates up to 4 automated insights, capped at 3 for display, sorted by severity (critical, high, medium):

1. **Longest-unsigned DocuSign** — triggers when an envelope has been unsigned for longer than the configured threshold. Severity escalates from "high" to "critical" based on a separate critical-days threshold.

2. **Compliance coverage gap** — triggers when the percentage of households that have been compliance-reviewed falls below a configured threshold. The default thresholds are 80% (high) and 50% (critical).

3. **Stalest household** — triggers when any household's last activity exceeds the configured stale-days threshold. Identifies the specific household by name.

4. **High-priority overdue tasks** — triggers when any high-priority task is past due, with severity escalation based on days overdue.

**Assessment:** The insights are genuinely useful for a COO morning workflow. They surface the most actionable items across the practice without requiring the user to dig through individual households. The severity escalation thresholds are configurable, the insights are specific (naming households and timeframes, not generic warnings), and the cap of 3 prevents information overload. As the COO evaluation (Evaluation #1) noted, this replaces a 40-minute manual spreadsheet assembly with a 2-second dashboard load.

### Detailed Scoring Analysis: The Demo Households

To make the scoring analysis concrete, I reviewed the health scores for all 8 demo households and assessed whether the scores accurately reflect the compliance posture I would assign based on manual review:

| Household | AUM | Health Score | Min Status | My Assessment | Delta |
|---|---|---|---|---|---|
| Rivera | $3.2M | 92 | On-track | Accurate | None — model client |
| Patel | $5.1M | 87 | On-track | Overstated | False pass on beneficiary |
| Nakamura | $1.8M | 73 | Needs-attention | Accurate | No compliance review is correctly flagged |
| Chen/Richards | $6.3M | 71 | Needs-attention | Understated | RMD deadline risk warrants "at-risk" |
| O'Brien | $2.4M | 68 | Needs-attention | Accurate | DocuSign and overdue tasks correctly reflected |
| Jackson | $2.8M | 62 | Needs-attention | Accurate | Meeting gap and unsigned docs reflected |
| Thompson | $4.7M | 55 | At-risk | Accurate but late | Zero compliance review + 3 overdue tasks |
| Whitfield | $1.2M | 17.5 | At-risk | Accurate | New client, nothing done |

The most concerning discrepancy is Chen/Richards. This household has $6.3M in assets, a trust with fiduciary complexity, an RMD deadline in 22 days, a PTE form awaiting signature, and a compliance review that is 11 months old. The Tasks On Time score of 70% does not reflect the severity of an approaching RMD deadline — missing an RMD incurs a 25% excise tax on the shortfall amount. If the Traditional IRA balance requires a $47,200 RMD (as noted in the suggested actions), the penalty for missing the deadline would be $11,800. A scoring model that assigns the same weight to "meeting overdue by 3 days" and "RMD deadline in 22 days with $11,800 penalty exposure" is not calibrated to regulatory risk.

The Patel household at 87 (on-track, green) is also concerning given the false-pass finding. The household has an unsigned beneficiary form — a known NIGO risk — but the health score does not reflect this because the compliance check passes (the task with the keyword exists, regardless of status). An examiner reviewing the Patel household would see a different picture than Min's green-light suggests.

### Comparison to Risk-Based Frameworks

Larger RIAs use risk-based supervision frameworks that assign risk scores to accounts based on factors like AUM, account complexity, client age, product type, and transaction frequency. Min's scoring model is simpler — it measures operational health rather than regulatory risk. A risk-based framework would:

1. Assign higher base scores to accounts with higher AUM, more complex structures, or higher transaction frequency
2. Adjust scores based on account type (retirement accounts carry RMD and PTE risk; trust accounts carry fiduciary and documentation risk)
3. Weight compliance factors more heavily than operational factors
4. Map scores directly to supervisory review frequencies (annual for low-risk, quarterly for medium-risk, monthly for high-risk)
5. Incorporate client-specific risk factors (age, investment experience, vulnerable adult status)

Min does not do any of this. Its scoring model is uniform across all account types and AUM tiers. For Ridgeline's current size ($1.08B, 8 households in demo), this uniformity is manageable — with 8 households, Sarah can manually calibrate her attention. For larger firms or firms with highly heterogeneous account types, the lack of risk-based weighting would become a limitation.

I want to note, however, that implementing full risk-based supervision scoring is a significant product investment that may not be appropriate for Min's current market position. A platform targeting $200M-$2B RIAs does not need the same risk-based infrastructure as a platform targeting $10B+ enterprises. The current scoring model's principal sin is not that it lacks sophistication — it is that it presents an operational score as if it were a compliance score. Clarity of labeling would resolve 80% of the issue without requiring a scoring overhaul.

---

## Part 5: Architecture & Audit Assessment

### Audit Trail

Min's audit system (`audit.ts`) writes immutable records to Salesforce for every mutation action. The design has several notable properties:

**Fire-and-forget architecture.** Audit failures are caught and logged to the console but never block the user action. This is the correct design — compliance monitoring should never impede the advised workflow. The `writeAuditLog` function wraps the entire write operation in a try/catch that swallows errors:

```typescript
try {
  await writeAuditRecord(ctx, { action, result, detail, durationMs, requestId, householdId }, data);
} catch (err) {
  console.error("[MIN:AUDIT] Failed to write audit log", { action, result, error: err.message });
}
```

**PII scrubbing.** Before writing audit records, Min strips sensitive fields including SSN, DOB, social security numbers, ID numbers, bank accounts, and routing numbers. Arrays are replaced with item counts. Strings longer than 100 characters are truncated. This is implemented in the `scrubPII` function, which recursively walks the payload object. The PII field list covers the most common sensitive fields. I would recommend adding "mothersMaidenName," "securityAnswer," and "taxId" to the list.

**Abandonment logging.** The `ComplianceScreen.tsx` component logs scan abandonment — when a user views compliance results but navigates away without recording the review:

```typescript
if (state.checks.length > 0) {
  const failCount = state.checks.filter(r => r.status === "fail").length;
  callSF("createTask", {
    subject: `MIN:AUDIT — complianceScanAbandoned — ${failCount > 0 ? "withFailures" : "clean"}`,
    description: `Compliance scan abandoned without recording.\nFailures: ${failCount}\nHousehold: ${state.selectedHousehold?.name || "unknown"}`,
    householdId: state.selectedHousehold?.id || "",
  }).catch(() => {});
}
```

This is sophisticated. As the SEC examination (Evaluation #5) noted, abandonment logging is unprecedented in the examiner's experience. It creates a record not just of what was done, but of what was started and not finished — which is precisely the kind of evidence that demonstrates supervisory diligence (or reveals supervisory gaps).

**Read-only action exemptions.** The audit system exempts read-only actions from logging: `searchContacts`, `searchHouseholds`, `getHouseholdDetail`, `queryTasks`, `queryFinancialAccounts`. This is appropriate — logging every search would create noise without compliance value.

**Assessment:** The audit trail is well-designed and represents one of Min's strongest features. The fire-and-forget architecture, PII scrubbing, abandonment logging, and read-only exemptions demonstrate thoughtful design. The SEC examination's finding that the audit trail "passed the 90-day stress test" validates this assessment. The primary gap, as that examination identified, is that the audit trail relies on Salesforce validation rules for immutability rather than cryptographic guarantees — a Salesforce system administrator could theoretically modify audit records. This is an acceptable trade-off for the current deployment model but should be documented in vendor due diligence materials.

### Data Freshness

Min is entirely dependent on Salesforce for its data. It reads from Salesforce on every navigation — there is no cache layer, no local data store, no background sync. This has implications:

**Real-time accuracy for CRM data.** Contact information, task records, and household details reflect the current state of Salesforce. If an advisor updates a task status to "Completed" in Salesforce, Min's next compliance scan will reflect that change.

**T+1 or worse for custodial data.** Custodial positions, balances, and transaction data enter Salesforce through the firm's custodial reconciliation process, which typically runs overnight. Min's view of custodial data is therefore T+1 at best. For compliance checks that depend on account balances or positions, this lag is generally acceptable. For time-sensitive items (RMD deadlines, contribution limits), the lag could matter.

**No freshness indicators in compliance checks.** Min's triage system includes source attribution with freshness indicators ("Salesforce - updated 2 days ago"), but the compliance checks themselves do not indicate when the underlying data was last updated. A compliance scan that passes today may be based on tasks that were created months ago with no recent updates.

### Competitive Positioning

Having evaluated 27 compliance platforms over six years, I can position Min relative to its competitive landscape:

**SmartRIA** ($2,000-5,000/year for small RIAs). Focused on compliance calendar management, annual review scheduling, and policy document management. Strengths: structured annual review workflows, regulatory calendar with deadline tracking, policy document library. Weaknesses: no Salesforce integration (separate data entry), no custodian-specific NIGO rules, no real-time compliance scanning. Min's advantage: real-time scanning from live CRM data; SmartRIA's advantage: structured annual review workflows and policy management.

**RIA in a Box** ($1,500-4,000/month for outsourced CCO). Provides outsourced CCO services including compliance manual creation, annual review facilitation, and regulatory filing support. Strengths: human expertise, regulatory filing management, compliance manual templates. Weaknesses: not technology-first (human-dependent), slower turnaround (days vs. seconds), not real-time. Min's advantage: instantaneous scanning, continuous monitoring; RIA in a Box's advantage: human judgment, regulatory filing support, comprehensive compliance manual.

**Compliance.ai** (enterprise pricing). Regulatory intelligence platform focused on regulatory change tracking and impact analysis. Strengths: comprehensive regulatory database, change tracking, impact assessment. Weaknesses: focused on regulatory intelligence, not operational compliance; no Salesforce integration; no household-level scanning. Min's advantage: operational compliance scanning from CRM data; Compliance.ai's advantage: regulatory intelligence breadth and depth.

**NRS/COMPLY** (enterprise pricing). Enterprise compliance management platform for larger firms. Strengths: comprehensive compliance program management, multi-entity support, regulatory filing integration. Weaknesses: enterprise pricing and implementation complexity, less suitable for small/mid-size RIAs. Min's advantage: Salesforce-native, fast deployment, lower cost; NRS/COMPLY's advantage: enterprise-grade compliance program management.

**Practifi** (Salesforce-native CRM, $125-200/user/month). This is the competitor the T3 evaluation surfaced most directly. Ryan Marsh, an RIA technology consultant, asked "What's different from Practifi?" The answer: Practifi is a CRM replacement (requiring data migration from existing Salesforce), while Min is an overlay (no migration required). Practifi does not currently offer compliance scanning, custodian rules, or audit trails at Min's depth. However, as the COO evaluation (Evaluation #1) identified, Practifi's Salesforce-native architecture means it could theoretically add compliance scanning capabilities. Min's competitive response should be depth and speed — maintaining deeper compliance coverage and faster time-to-value than a CRM vendor adding compliance as a secondary feature.

**Overall positioning:** Min occupies a unique position in the compliance technology landscape. It is not a compliance calendar (SmartRIA), not an outsourced CCO (RIA in a Box), not a regulatory intelligence platform (Compliance.ai), not an enterprise compliance suite (COMPLY), and not a CRM replacement (Practifi). It is a real-time compliance monitoring overlay for Salesforce-native RIAs, with specific depth in custodian rules and account-opening compliance. This positioning is narrow but defensible. The risk is that Min's narrowness becomes a limitation as firms grow — a $500M RIA may find Min sufficient, while a $5B multi-custodian enterprise may need the broader capabilities of an enterprise suite. Min's growth strategy should account for this ceiling.

The Salesforce dependency is both a strength and a constraint. Min can only serve firms that use Salesforce. According to T3 industry surveys, approximately 30% of RIAs use Salesforce as their primary CRM. This constrains Min's total addressable market but provides focus — every feature can be optimized for the Salesforce data model, and deployment friction is minimal because no data migration is required. Firms not on Salesforce are simply not Min's market. This is the right constraint for a focused product.

### The Overlay Advantage

Min's architectural choice to function as a Salesforce overlay — rather than a standalone platform or a Salesforce managed package — has significant implications:

**Data ownership.** All data remains in Salesforce. The firm owns its data unambiguously. If Min disappears, the firm retains all CRM data, all task records, all audit logs (written as Salesforce tasks), and all compliance documentation. This is the strongest possible business continuity posture for a compliance technology.

**No migration risk.** Deploying Min requires no data migration. Removing Min requires no data migration. This reduces both adoption friction and exit risk, which is a competitive advantage when selling to CCOs who have been burned by vendor lock-in.

**Integration depth limitation.** The overlay architecture means Min cannot modify Salesforce schema, create custom objects, or install managed package components. This limits Min's ability to create purpose-built data structures (like a dedicated audit log custom object) and constrains it to writing audit records as standard tasks with prefix conventions. The current approach works but is architecturally inelegant.

**Examination implications of the overlay.** During the simulated SEC examination (Evaluation #5), the examiner rated Min's business continuity posture as GREEN — the strongest possible rating. The reasoning: all data lives in Salesforce, Min is an overlay not infrastructure, and the firm can operate without Min (degraded but functional). This is a direct consequence of the architectural choice. Standalone compliance platforms that store data independently create a different business continuity profile — if the platform goes offline, the compliance data is inaccessible. Min's overlay approach means the compliance data (tasks, contacts, households) is always accessible through Salesforce regardless of Min's availability.

However, the overlay approach also means that Min's value-add features — the compliance scan results, the health scores, the triage queue, the audit trail analysis — are only available through Min. The raw data is in Salesforce, but the compliance interpretation of that data is in Min. If Min becomes unavailable, the firm retains the data but loses the analysis. This is the correct trade-off for a compliance monitoring tool: the analysis is valuable but not irreplaceable, while the data is both valuable and irreplaceable.

### Regulatory Updates Feed

Min includes a regulatory updates feed (`regulatory-updates.ts`) with 5 current regulatory updates, each including agency (SEC/FINRA/DOL), impact assessment (high/medium/low), required actions, and optional custom check suggestions. The current updates cover:

1. SEC Updated Marketing Rule Guidance (Feb 2026, high impact)
2. SEC Cybersecurity Risk Management Rule (Jan 2026, high impact)
3. FINRA CAT Reporting Update (Jan 2026, low impact)
4. DOL Retirement Security Rule / Fiduciary Rule 2.0 (Dec 2025, high impact)
5. SEC Form ADV Annual Amendment Reminder (Dec 2025, medium impact)

Three of the five updates include custom check suggestions — if the firm clicks "add check," Min creates a custom compliance check with a pre-configured keyword and regulation citation. The Marketing Rule update suggests keyword "marketing rule," the Cybersecurity update suggests keyword "cybersecurity," and the Retirement Security Rule update suggests keyword "rollover."

This feed serves two functions. First, it keeps the platform current with regulatory developments without requiring code changes — new updates can be added to the data file. Second, the custom check suggestions provide a bridge from regulatory awareness to compliance monitoring: "This regulation changed. Here is a check you can add to catch it."

The feed is a smart feature, but its current implementation is static — the 5 updates are hardcoded in a data file. A production implementation would need a dynamic feed, either from an API or a content management system, to maintain currency as regulations evolve. For demonstration purposes, the static feed effectively illustrates the concept.

**Assessment:** The overlay architecture is the right choice for Min's market position. For firms in the $200M-$2B AUM range that already use Salesforce, the overlay approach minimizes deployment friction and elimination risk while providing meaningful compliance monitoring capabilities. The architecture limitations (no custom objects, no schema modifications) are acceptable trade-offs. The regulatory updates feed adds a forward-looking dimension that most compliance platforms lack — anticipating regulatory changes rather than only monitoring current compliance status.

---

## Part 6: The Webb Report — Findings & Verdict

### Overall Assessment

**Grade: B+**

Min is a technically sound compliance monitoring platform with one significant methodology gap, several coverage gaps that are partially addressed by community templates, and a genuinely impressive custodian rules engine that represents rare market depth. The product's architecture — Salesforce overlay, rule-based engine, comprehensive audit trail — is well-suited to its target market of SEC-registered RIAs in the $200M-$2B range.

The B+ reflects the following calibration against my grading scale:

- **A range (A-, A, A+):** Platform is technically sound, covers core regulatory requirements comprehensively, produces examination-defensible evidence, and requires minimal supplementation. Reserved for platforms I would recommend without significant caveats.
- **B range (B-, B, B+):** Platform is technically sound with identified gaps that are manageable through firm procedures or configuration. Produces useful compliance monitoring but requires human oversight to compensate for methodology limitations. Recommended with clearly documented conditions.
- **C range:** Platform has fundamental methodology problems or significant coverage gaps that create examination risk. May be useful for specific use cases but is not suitable as a primary compliance monitoring tool.
- **D/F:** Platform is unreliable, produces misleading results, or creates more compliance risk than it mitigates.

Min's B+ places it in the upper range of "recommended with conditions." The conditions are specific, documented below, and all correctable.

### Strengths Ranked by Regulatory Impact

**1. Custodian Rules Engine — High Impact.** Three custodians, eight account types each, with NIGO risks, prevention strategies, and custodian-specific document requirements. This is the deepest custodian-specific compliance content I have seen in a compliance platform at this price point. The Fidelity spousal consent requirement, the Pershing ACAT risks, and the trust certification staleness handling demonstrate operational knowledge that goes beyond regulatory citations into practical account-opening experience. Impact: directly prevents NIGO rejections, which are the most common source of operational delay and client frustration during account opening.

**2. Audit Trail with Abandonment Logging — High Impact.** The combination of fire-and-forget audit logging, PII scrubbing, and scan abandonment tracking creates an examination-ready evidence trail. The SEC examination (Evaluation #5) validated this: complete consistency across a 90-day cross-reference, and the abandonment logging was called "unprecedented." Impact: directly addresses SEC examination standard request items for supervisory review records and technology platform documentation.

**3. Regulatory Citation Accuracy — Medium-High Impact.** Every regulatory citation in the engine is accurate. FINRA 2090, 2111, 4512; SEC 17a-14, 204-3; DOL PTE 2020-02; IRC 401(a)(9) — all correctly applied. Impact: accurate citations demonstrate that the compliance checks are grounded in actual regulatory requirements, not marketing-driven feature lists. An examiner reviewing Min's output will find citations that match current regulatory text.

**4. Account-Type-Specific Checks — Medium Impact.** Trust, entity, and retirement accounts receive specialized checks that reflect their specific regulatory requirements. Trust certification, trustee verification, ERISA compliance, RMD tracking, PTE documentation — these are the checks that distinguish a compliance tool from a generic task monitor. Impact: addresses the most common account-type-specific examination questions.

**5. Template and Custom Check Extensibility — Medium Impact.** The ability for firms to define custom checks with keywords, regulation citations, and severity levels — combined with four community templates covering 23 additional checks used by 416 firm-installations — provides meaningful coverage extension without requiring code changes. Impact: allows firms to fill coverage gaps specific to their practice, regulatory focus areas, or examination history.

### Gaps Ranked by Examination Risk

**1. The False-Pass Problem — High Risk.** Keyword matching without task status filtering produces false passes when relevant tasks exist but have not been completed. A beneficiary form task in "Not Started" status will pass the beneficiary check. A KYC task that was created but never completed will pass the KYC check. This directly undermines the reliability of the compliance scan output. Risk: if a firm presents Min's compliance output to an examiner and the examiner discovers false passes, the firm's entire supervisory framework is questioned.

**2. Evidence Strings Overstate Verification — Medium-High Risk.** "Risk tolerance documented," "Suitability questionnaire completed," and similar evidence strings assert verification that was not performed. If these strings appear in compliance records presented during an examination, and the underlying documentation does not support the assertion, the firm faces a credibility gap. Risk: evidence is the primary examination artifact. Inaccurate evidence descriptions create specific examination deficiencies.

**3. Missing Default Coverage for Core Examination Areas — Medium Risk.** AML program compliance, advertising and marketing review, trade allocation and best execution, and books and records retention are not covered by default checks. Some are partially available via templates. Risk: SEC examination document request lists routinely include these topics. Firms relying solely on Min's default checks will have gaps that require manual compliance monitoring.

**4. Health Score Conflates Operational and Compliance Metrics — Medium Risk.** DocuSign velocity and meeting frequency are operational metrics, not compliance metrics. Including them in a "health score" alongside compliance coverage creates the impression that the score is a compliance measurement. Risk: if a firm characterizes the health score as a compliance metric in supervisory procedures or ADV disclosures, and an examiner determines that 45% of the score (DocuSign + meetings) is not compliance-related, the firm's supervisory framework is questioned.

**5. Fixed Scoring Weights Across Account Types — Low-Medium Risk.** All households receive identical scoring weights regardless of account type, AUM, client age, or risk profile. A $6.3M trust with RMD obligations gets the same model as a $1.2M new individual account. Risk: for firms with heterogeneous account types, this may result in under-prioritizing high-risk accounts and over-prioritizing low-risk accounts.

### The False-Pass Problem: Detailed Analysis

This is the finding I expect will generate the most discussion, so I want to be precise about its scope, its cause, and its remediation.

**Scope:** Every keyword-based check in the compliance engine is vulnerable. The vulnerability exists whenever a task with a relevant keyword has a non-complete status. In the demo dataset, I identified one clear example (Patel beneficiary form, "Not Started") and several potential examples depending on firm task-naming conventions.

**Cause:** The `hasTask` function searches concatenated task text without filtering by status:

```typescript
const hasTask = (keyword: string) => allTaskText.includes(keyword.toLowerCase());
```

The `allTaskText` variable is constructed from all tasks, regardless of status:

```typescript
const taskSubjects = tasks.map(t => (t.subject || "").toLowerCase());
const taskDescs = tasks.map(t => (t.description || "").toLowerCase());
const allTaskText = [...taskSubjects, ...taskDescs].join(" ");
```

**Why it matters:** A compliance check that produces false passes is more dangerous than one that produces false fails. A false fail generates investigation and resolution — someone checks the issue and either confirms it (genuine gap) or overrides it (false alarm). Either outcome is documented. A false pass generates complacency — no one investigates because the system says everything is fine. If the system is wrong, the gap persists undetected until an examiner finds it.

**Remediation options, in order of preference:**

1. **Status-aware matching (recommended).** Add a configuration option for "completed" task statuses (defaulting to ["Completed"]) and filter tasks to those statuses before keyword matching. This eliminates false passes for tasks in progress or not started. Implementation complexity: low — requires one additional filter step.

2. **Dual-status reporting.** For each check, report whether matching tasks are in completed or non-completed status. A check with all matching tasks completed shows "PASS." A check with matching tasks in non-complete status shows "PENDING" (new status). A check with no matching tasks shows "FAIL" or "WARN." Implementation complexity: moderate — requires a new status value and UI treatment.

3. **Evidence-level status inclusion.** Include task status in evidence strings: "Task 'SEND DOCU — Patel IRA Beneficiary Form' found (Status: Not Started)." This does not change the pass/fail determination but makes the limitation visible to the reviewer. Implementation complexity: minimal — evidence string formatting change.

4. **Documentation only.** Document the limitation in user-facing materials and require firms to note in their supervisory procedures that Min's "pass" status indicates task existence, not task completion. Implementation complexity: none (product change), moderate (documentation).

I recommend implementing option 1 or 2 as a product change, and option 4 immediately as an interim measure.

### Recommended Improvements

#### Product Changes (for the Min development team)

1. **Implement status-aware keyword matching.** Add a configurable "completed status" list and filter tasks before matching. This is the single highest-impact improvement.

2. **Revise evidence strings to describe detection, not verification.** Change "Risk tolerance documented" to "Task referencing 'risk' found" (or similar language that accurately describes what was checked).

3. **Add a "PENDING" check status** for checks where relevant tasks exist but are not in completed status. This gives users visibility into in-progress compliance items.

4. **Add a suppressed-items indicator to triage.** When triage items exceed the cap (default 7), display "7 of N items shown" to prevent information loss.

5. **Add time-based checks for periodic requirements.** ADV delivery should check not just whether an ADV task exists but whether one exists within the required timeframe. Privacy notice delivery should check annually. These are the requirements most likely to surface in an examination.

#### Firm Procedure Changes (for Ridgeline)

1. **Document Min's methodology in supervisory procedures.** Explicitly state that Min uses keyword-based task detection, not document verification. State that "pass" means a relevant task exists in Salesforce, and that human review is required to confirm the underlying compliance action was completed.

2. **Install the Examiner-Ready Framework template.** This adds 8 checks covering fee billing, OBAs, gifts and entertainment, political contributions, complaints, cybersecurity, and business continuity — the most commonly examined areas not in Min's default checks.

3. **Install the Annual Review Checklist template.** This adds code of ethics and custody rule checks, which are annual requirements for SEC-registered advisers.

4. **Customize keyword overrides for Ridgeline's Salesforce conventions.** Review each default keyword mapping and verify that Ridgeline's actual task naming conventions match. Add firm-specific keywords where they do not.

5. **Establish a quarterly keyword review process.** As Ridgeline's Salesforce usage evolves (new task naming conventions, new automation, new staff with different habits), the keyword mappings should be reviewed and updated.

#### Documentation Changes

1. **Create a "Min Methodology" document** that describes the keyword matching approach, its strengths (breadth, speed, Salesforce compatibility), and its limitations (no status verification, no document parsing). This document should be included in vendor due diligence packets.

2. **Add a disclaimer to compliance scan outputs** stating that results indicate task presence in Salesforce and require human verification for compliance certification purposes.

3. **Reference the methodology in ADV disclosures.** Per the SEC examination finding (Evaluation #5), ADV language should specify that Min is rule-based (not AI/ML) and that results require human review.

### "Would I Recommend This to a Client?" Verdict

Yes, with three conditions.

**Condition 1: The firm understands what "pass" means.** Min's compliance scan is a powerful flagging tool, not a certification tool. A firm that understands this distinction — that "pass" means "a relevant task exists" and not "this requirement has been verified" — will use Min effectively as part of a human-supervised compliance program. A firm that treats Min's output as definitive compliance certification is creating examination risk.

**Condition 2: The firm installs appropriate templates and custom checks.** Min's default 30+ checks cover foundational compliance requirements but have significant gaps in areas that appear on standard SEC examination document request lists. The Examiner-Ready Framework and Annual Review Checklist templates fill most of these gaps. Custom checks should be configured for any firm-specific compliance requirements.

**Condition 3: The firm implements the status-aware matching fix or documents the limitation.** The false-pass problem is the single most significant finding in this evaluation. Until Min implements status-aware matching (my preferred solution), the firm must document this limitation in its supervisory procedures and train staff to verify task completion status for any Min "pass" result before representing compliance status to an examiner.

Subject to these conditions, Min provides meaningful compliance monitoring value that exceeds any comparable product in its market segment. The custodian rules engine alone is worth the investment. The audit trail with abandonment logging is genuinely innovative. The real-time Salesforce scanning eliminates the "stale data" problem that plagues calendar-based compliance systems. And the rule-based architecture avoids the regulatory complexity that AI/ML-based competitors will face as SEC and FINRA guidance on algorithmic compliance continues to evolve.

### Cross-Reference with Evaluations #1, #2, and #5

This section maps findings across all four completed evaluations (including this one) to identify patterns, validate observations, and surface findings that only become visible through multi-perspective analysis.

**What the expert sees that others missed:**

The false-pass problem was not identified in any prior evaluation. The COO evaluation (Evaluation #1) identified "one-size-fits-all" checking as a concern — Sarah Kendrick noted that trust accounts, entity accounts, and individual accounts all received the same check matrix, producing "false passes on complex accounts and false fails on simple ones." This was directionally correct, and Min subsequently added account-type-specific checks (trust, entity, retirement). But the task-status blind spot is a different problem entirely: it affects all checks regardless of account type. Sarah's evaluation tested Min as a black box — she saw the outputs but could not inspect the mechanism. The task-status blind spot only becomes visible when you read how `hasTask` constructs its search space.

The T3 conference evaluation (Evaluation #2) came closest to identifying the issue. Patricia Owens, a CCO at a $2B firm and former SEC examiner, observed: "So it's a checklist, not a document verification system." This is directionally correct — Min verifies task existence, not document content. But Patricia's observation focused on the lack of document parsing (Min doesn't read PDFs or verify signatures), not on the task-status problem. Her insight was that Min checks for the task, not the document. My finding goes deeper: Min doesn't even check whether the task was completed.

The SEC examination simulation (Evaluation #5) described Min's methodology as "keyword-based, not document-content-based" and confirmed that checks are "keyword-based — Min verifies task existence, not document content." However, the examination focused on the audit trail and supervisory procedures rather than the detection mechanism itself. Lisa Nakamura tested whether the firm's implementation was compliant, not whether the product's methodology was sound. That distinction — testing the operator vs. testing the engine — is exactly why this evaluation exists.

The false-pass problem is the kind of finding that requires source code review. No amount of end-user testing reveals it, because the outputs look correct — a check passes, and a relevant task exists. The problem is in what "relevant" means when a task has been created but not completed. You have to read the code to see that `allTaskText` does not filter by `t.status`.

**What others found that the expert validates:**

1. **The audit trail is genuinely strong** (Evaluation #5). I confirm this finding unconditionally. The fire-and-forget architecture, PII scrubbing, and abandonment logging are well-designed and examination-ready. The SEC examination found "complete consistency in 90-day cross-reference between Min export and Salesforce Task records" and called the abandonment logging "unprecedented." From a methodology perspective, the audit trail represents the opposite of the false-pass problem: it is precise, honest, and examination-defensible. The audit system records what actually happened, including what was started and not finished. If the compliance engine applied the same honesty standard — recording what was detected rather than implying what was verified — the evidence overstatement problem would resolve itself.

2. **The custodian rules depth is a differentiator** (Evaluations #1 and #2). I confirm this and elevate it to Min's single strongest competitive advantage. The COO evaluation noted custodian-specific NIGO prevention as a high-value feature. The T3 evaluation demonstrated that the custodian rules engine stopped booth traffic at a compliance technology conference — attendees who had experienced NIGO rejections recognized the value immediately. My source code review reveals the depth behind this: 24 complete account-type definitions with 72 NIGO risks, each with prevention strategies grounded in custodian-specific operational experience. The Fidelity spousal consent requirement, the Pershing ACAT form validation, and the trust certification staleness handling are details that competitors would need deep custodial operational experience to replicate.

3. **Alert fatigue is a real risk** (Evaluation #1). I partially validate this finding with nuance. Sarah Kendrick predicted "alert fatigue will set in within a month" based on the Jackson household example, where Min flagged critical alerts for a client who was hospitalized. Since Evaluation #1, Min has added contextual snooze options (the T3 evaluation showed attendees reacting positively to deadline-relative snooze options) and configurable triage thresholds. These partially mitigate the alert fatigue concern. However, the 7-item triage cap suppresses items without indication, which means compliance-relevant items can be hidden behind operational items. And the health score's inclusion of non-compliance operational metrics (DocuSign velocity at 25%, meeting frequency at 20%) dilutes the compliance signal, contributing to the fatigue Sarah predicted.

4. **Rule-based architecture is a regulatory advantage** (Evaluation #5). I strongly confirm this and consider it one of Min's most underappreciated strategic assets. When the SEC examiner confirmed Min was rule-based, the entire AI investigation line was defused. The examiner stated: "It is not, in any meaningful sense, artificial intelligence." In the current regulatory environment — with the SEC's 2024 AI Risk Alert, FINRA's inquiries into algorithmic compliance, and growing scrutiny of "AI-powered" compliance tools — Min's rule-based architecture is a significant advantage. Deterministic, auditable, reproducible compliance checking avoids the regulatory uncertainty that AI/ML-based competitors will face. Every competitor claiming "AI-powered compliance" will need to address questions about model validation, bias, explainability, and supervisory adequacy that Min simply does not trigger.

5. **Vendor due diligence materials are missing** (Evaluation #5). I confirm this as the most urgent operational gap across all evaluations. The SEC examination identified inadequate vendor due diligence as the #1 formal finding — the highest-severity finding in that evaluation. My evaluation, conducted specifically as a vendor assessment, encountered the same gap from a different angle: I was asked to evaluate Min's methodology, but Min does not provide a methodology description document, a technology architecture overview, a security posture statement, or a data flow diagram. Every firm deploying Min faces the same examination exposure. This is not a Min-specific failing — it is a common gap in early-stage compliance technology — but it is the most urgent item to address because it affects every current and future client simultaneously.

**Cross-evaluation pattern synthesis:**

Looking across all four evaluations, a clear pattern emerges. Min's technical capabilities validate repeatedly and consistently. The compliance scanning, the audit trail, the custodian rules engine, the triage algorithm — these are technically sound, operationally useful, and competitively differentiated. The COO loved the dashboard. Conference attendees reacted to the compliance scan. The SEC examiner validated the audit trail. I found the custodian rules engine genuinely impressive.

The gaps are always in the surrounding ecosystem — documentation, procedures, training, vendor materials, and methodology transparency. Min the product works. The support infrastructure around Min — the materials a firm needs to deploy, operate, document, and defend Min — is incomplete. The false-pass problem is the exception: it is a genuine product methodology issue. But the vendor documentation gap, the supervisory procedure gap, the ADV disclosure gap, and the evidence language gap are all solvable without code changes. They require documentation, not development.

This is actually the best possible finding pattern for a compliance technology product. Methodology gaps require product changes. Documentation gaps require writing. Writing is faster and cheaper than coding. If I were advising Min's product team, I would say: fix the false-pass problem (one code change), revise the evidence strings (one code change), and then spend three months producing the documentation package that every client firm needs. The product is ahead of its documentation. That is a solvable problem.

---

## Closing Deliverables

### 10 Technical Findings Ordered by Methodology Impact

**Finding 1: Task Status Blind Spot (Critical)**
The compliance engine searches all task text regardless of task status. Tasks in "Not Started," "In Progress," or "Waiting on Client" status match identically to "Completed" tasks. This produces false passes for any compliance check where a relevant task has been created but not completed. Demonstrated with the Patel beneficiary form: "SEND DOCU — Patel IRA Beneficiary Form" (status: Not Started) passes the beneficiary-designation check.

**Finding 2: Evidence Strings Assert Verification Not Performed (High)**
Evidence text like "Risk tolerance documented" and "Suitability questionnaire completed" implies content verification. The engine verified keyword presence, not content. Evidence descriptions should match the actual detection performed: "Task containing 'risk' found in household records."

**Finding 3: Substring Matching Creates Cross-Check Contamination (Medium)**
The keyword "advisory" in the ADV delivery check matches advisory agreements, advisory committee notes, and any other text containing "advisory" — not just ADV Part 2A delivery. The keyword "risk" matches risk tolerance assessments, risk management reviews, and "at-risk" deadline warnings. Substring matching produces false positives that inflate compliance pass rates.

**Finding 4: Default Coverage Gaps for Standard Examination Topics (Medium)**
AML program compliance, advertising/marketing review (SEC Marketing Rule), trade allocation and best execution, and books and records retention are not covered by default checks and are not available through community templates. These are standard SEC examination request items.

**Finding 5: Health Score Conflates Operational and Compliance Metrics (Medium)**
The health score includes DocuSign velocity (25%) and meeting frequency (20%) alongside compliance coverage (30%) and task timeliness (25%). DocuSign velocity and meeting frequency are operational indicators, not compliance measurements. Characterizing the aggregate score as a "health" metric without distinguishing operational from compliance components creates examination risk if the score is cited as a compliance measurement.

**Finding 6: Fixed Scoring Weights Do Not Reflect Account Risk (Medium)**
All households receive identical scoring weights regardless of account type, AUM tier, client age, or risk profile. A $6.3M trust with RMD obligations and a $1.2M new individual account receive the same weighting model. Risk-based supervision methodologies would weight accounts differently based on their risk characteristics.

**Finding 7: Triage Suppresses Items Without Indication (Low-Medium)**
The 7-item triage cap drops items beyond the cap without any user indication that items were suppressed. Compliance-relevant items (unreviewed households) may be suppressed if operational items (overdue tasks, unsigned envelopes) consume the visible queue.

**Finding 8: No Time-Based Checking for Periodic Requirements (Low-Medium)**
ADV delivery, privacy notice delivery, and annual reviews are periodic regulatory requirements with specific timeframes. Min checks whether a relevant task exists at any point in history, not whether one exists within the required period. A privacy notice delivered 3 years ago will pass the privacy notice check today.

**Finding 9: PII Scrubbing Field List Is Incomplete (Low)**
The audit system's PII field list covers SSN, DOB, bank account, and routing number. It does not cover mother's maiden name, security question answers, tax identification number (TIN), passport number, or driver's license number. These fields may appear in Salesforce task descriptions for certain compliance workflows.

**Finding 10: Audit Trail Immutability Is Convention-Based (Low)**
Audit records are written as Salesforce tasks with a "MIN:AUDIT" prefix. Immutability depends on Salesforce validation rules preventing edits, which a system administrator can bypass. Cryptographic immutability (hash chaining, blockchain-style integrity) is not implemented. This is acceptable for current deployment but should be documented in vendor due diligence materials.

### Compliance Engine Gap Matrix

| Regulatory Area | Default Check | Template Available | Fully Uncovered | SEC Exam Priority |
|---|---|---|---|---|
| KYC / Know Your Customer | Yes | — | — | High |
| Trusted Contact | Yes | — | — | Medium |
| Identity / CIP | Yes | — | — | High |
| Suitability / Reg BI | Yes | — | — | High |
| PTE 2020-02 (Rollovers) | Yes | — | — | High |
| Form CRS Delivery | Yes | — | — | High |
| ADV Part 2A Delivery | Yes | — | — | High |
| Privacy Notice (Reg S-P) | Yes | — | — | Medium |
| Beneficiary Designations | Yes | — | — | Medium |
| Signatures / DocuSign | Yes | — | — | Medium |
| ACH Authorization | Yes | — | — | Low |
| Completeness Check | Yes | — | — | Medium |
| Annual Review | Yes | — | — | Medium |
| Trust Certification | Yes (trust accts) | — | — | Medium |
| Trustee Verification | Yes (trust accts) | — | — | Medium |
| Trust Agreement | Yes (trust accts) | — | — | Medium |
| Authorized Signers | Yes (entity accts) | — | — | Medium |
| ERISA Compliance | Yes (entity accts) | — | — | Medium |
| Entity Resolution | Yes (entity accts) | — | — | Medium |
| RMD Tracking | Yes (retirement) | — | — | High |
| Fee Billing Reconciliation | — | Examiner-Ready | — | High |
| Outside Business Activities | — | Examiner-Ready | — | Medium |
| Gifts & Entertainment | — | Examiner-Ready | — | Medium |
| Political Contributions | — | Examiner-Ready | — | Medium |
| Client Complaints | — | Examiner-Ready | — | High |
| Cybersecurity Assessment | — | Examiner-Ready | — | High |
| Business Continuity | — | Examiner-Ready | — | Medium |
| Code of Ethics | — | Annual Review | — | Medium |
| Custody Rule | — | Annual Review | — | High |
| Annual Compliance Review | — | Annual Review | — | High |
| Anti-Money Laundering | — | — | Yes | High |
| Advertising / Marketing Rule | — | — | Yes | High |
| Trade Allocation / Best Exec | — | — | Yes | High |
| Books & Records Retention | — | — | Yes | High |
| Insider Trading Prevention | — | — | Yes | Medium |
| Proxy Voting | — | — | Yes | Low |

**Summary:** 20 regulatory areas covered by default checks. 10 additional areas covered by community templates (available but require installation). 6 areas fully uncovered. Of the 6 uncovered areas, 4 are high-priority SEC examination topics.

**Reading the matrix for examination preparation:** If Ridgeline's next SEC examination follows the standard Division of Examinations playbook, the examiner will request documentation across approximately 15-20 of these regulatory areas. Min's default checks cover the foundational areas (KYC, suitability, document delivery, account setup). The Examiner-Ready Framework template covers the most common deficiency areas (fee billing, OBAs, complaints, cybersecurity). The Annual Review Checklist template covers periodic requirements (ADV amendment, code of ethics, custody). The fully uncovered areas — AML, Marketing Rule, trade allocation, books and records — will require manual compliance monitoring or additional custom checks.

My recommendation for Ridgeline: install both the Examiner-Ready Framework (47 firms using it) and the Annual Review Checklist (156 firms using it). Together, these add 14 checks covering the most commonly examined areas not in the default engine. Then create custom checks for AML and Marketing Rule compliance — the two highest-priority uncovered areas. This configuration would give Ridgeline coverage across approximately 34 regulatory areas, which is comprehensive for an RIA of their size.

**Template adoption as a signal:** The adoption statistics are informative. The Annual Review Checklist is used by 156 firms — over 3x the next most popular template. This suggests that annual review requirements are the most commonly felt gap in the default engine. The Examiner-Ready Framework at 47 firms suggests that firms preparing for examinations recognize the default coverage gaps. The Reg BI Complete template at 89 firms indicates meaningful demand for regulation-specific check frameworks. These adoption patterns validate the template architecture as a viable gap-filling mechanism — firms are actually using it.

### 5 Methodology Changes the Expert Would Require

These are not suggestions. These are the minimum changes I would require before recommending Min to a client firm for use as a primary compliance monitoring tool. They constitute the technical floor — below this, I cannot in good conscience recommend the platform for regulatory reliance.

**1. Implement Status-Aware Keyword Matching**

The compliance engine must filter tasks by completion status before performing keyword matching. The default "completed" status list should be configurable (defaulting to "Completed") to accommodate firms with custom Salesforce status picklists. Tasks in non-complete statuses that contain relevant keywords should be flagged as "PENDING" rather than "PASS." This eliminates the false-pass problem — the single most significant finding in this evaluation.

Technical specification: Add a `completedStatuses` configuration (stored alongside keyword overrides in localStorage) with default value `["Completed"]`. In `runComplianceChecks()`, create a second filtered task set containing only tasks with status in the configured list. Use this filtered set for pass/fail determination. Use the unfiltered set to detect "PENDING" items.

**2. Revise All Evidence Strings to Match Actual Detection**

Every evidence string in the compliance engine must accurately describe what was detected, not what was verified. "Risk tolerance documented" must become "Task referencing risk tolerance found in household records." "Suitability questionnaire completed" must become "Task referencing suitability found in household records." "Government ID verified and on file" must become "Task referencing identity verification found in household records."

The principle: evidence strings should be factual descriptions of the detection, not interpretive conclusions about compliance status. The human reviewer draws the conclusion; the tool provides the observation.

**3. Add a Compliance Scan Disclaimer**

Every compliance scan output — dashboard display, PDF export, and Salesforce task record — must include a disclaimer stating: "Min compliance checks verify the presence of relevant Salesforce task records. They do not verify document content, signature status, or regulatory filing completion. Human review is required to confirm compliance for each item."

This disclaimer must be non-removable by end users and must appear in every format in which compliance results are presented. This is not a "nice to have" — it is a legal necessity for any compliance tool that will be presented to regulators.

**4. Separate Compliance Score from Operational Score**

The health score must either (a) separate compliance metrics (compliance coverage, regulatory check pass rate) from operational metrics (DocuSign velocity, meeting frequency, task timeliness) into distinct scores, or (b) relabel the aggregate score to clearly indicate it includes non-compliance components. Presenting a score that includes 45% non-compliance operational metrics under a label that implies comprehensive health assessment creates definitional confusion that is exploitable during examination.

My recommendation: create two scores — a "Compliance Score" (based solely on compliance check results) and an "Operational Score" (based on DocuSign velocity, task timeliness, and meeting coverage). Display both. Let the user understand the distinction.

**5. Add Coverage for Anti-Money Laundering and Marketing Rule**

AML program compliance and advertising/marketing rule compliance are high-priority SEC examination topics that are not covered by default checks or community templates. At minimum, add these as built-in checks with appropriate keywords and regulatory citations. AML: keywords "aml," "anti-money," "suspicious activity," "bsa"; regulation "Bank Secrecy Act / FinCEN CDD Rule." Marketing Rule: keywords "marketing," "testimonial," "endorsement," "advertising"; regulation "SEC Rule 206(4)-1."

These are the two highest-priority coverage gaps. Of the 6 fully uncovered regulatory areas, these two appear on every SEC examination document request list I have reviewed in the past four years. The AML check is particularly important for firms like Ridgeline that are mid-acquisition — the Garrison Practice integration involves onboarding 47 households, each of which requires CIP verification and potential suspicious activity monitoring. The Marketing Rule check is important because SEC Rule 206(4)-1 (the Marketing Rule, effective November 2022) has been a stated examination priority in every SEC examination priorities letter since 2023, and the February 2026 regulatory update in Min's own feed confirms updated guidance on testimonial and endorsement arrangements. If Min's regulatory feed is telling the firm about Marketing Rule changes, the compliance engine should be checking for Marketing Rule compliance.

I want to be explicit about the standard I am applying here. These five changes are not improvements — they are requirements. They represent the minimum methodology standard I would need to see before I could recommend Min to a client firm for regulatory reliance. A firm that deploys Min without these changes can still benefit from Min's operational features (triage, dashboard, custodian rules), but it cannot characterize Min as a compliance monitoring system in supervisory procedures or ADV disclosures without accepting the false-pass risk, the evidence overstatement risk, and the coverage gap risk.

I have given Min a B+ grade, which places it in the "recommended with conditions" range. The five changes above are the conditions. If Min implements changes 1 through 3 (status-aware matching, revised evidence strings, scan disclaimer), the grade would move to A-. If Min implements all five changes, the grade would move to A. This is the clearest upgrade path I have identified for any compliance platform in recent memory: the product is close to excellent, and the gap between current state and excellent is well-defined and achievable.

---

**About Webb Compliance Advisory**

Webb Compliance Advisory provides independent compliance technology evaluation and regulatory strategy consulting for SEC-registered investment advisers. Marcus Webb has evaluated 27 compliance platforms for RIA clients and publishes quarterly analysis of compliance technology trends in Investment Advisor magazine. Webb Compliance Advisory does not accept compensation from technology vendors, does not participate in referral arrangements, and does not hold equity positions in any compliance technology company.

**Contact:** marcus@webbcompliance.com | (713) 555-0184

**Disclaimer:** This evaluation reflects the professional opinion of Marcus Webb based on source code review and behavioral verification conducted February 17-19, 2026. It is not legal advice and should not be relied upon as a substitute for legal counsel. Regulatory requirements change; citations and assessments are current as of the evaluation date.

---

### Appendix: Evaluation Cross-Reference Matrix

| Finding Area | Eval #1 (COO) | Eval #2 (T3 Booth) | Eval #3 (Expert — this report) | Eval #5 (SEC Examiner) |
|---|---|---|---|---|
| **Audit trail quality** | Noted, not prioritized | Strongest trust signal | Confirmed strong; methodology exceeds requirements | Passed 90-day stress test; "unprecedented" abandonment logging |
| **Dismiss/snooze reasons** | Alert fatigue predicted | Contextual snooze praised | Triage cap suppresses items | 61% substantive, 13% insufficient; quality enforcement needed |
| **Rule-based vs. AI** | Not evaluated | "Intelligence" vocabulary failed | Strategic regulatory advantage confirmed | Defused entire AI investigation line |
| **Business continuity** | "What if Min disappears?" | Acquisition readiness angle | Overlay = strongest continuity posture | GREEN rating; no vendor dependency |
| **Vendor documentation** | Not evaluated | Competitive probe by Practifi rep | Methodology document missing; vendor packet needed | #1 formal finding; most urgent gap |
| **Compliance check depth** | One-size-fits-all (later fixed) | "Checklist, not document verification" | False-pass problem identified; status-aware fix needed | Keyword-based, not content-based |
| **Custodian rules** | NIGO prevention valued | Conference foot-traffic stopper | Strongest component; competitive moat; 100+ discrete risks | Not directly evaluated |
| **Health scoring** | Decomposition praised | Not evaluated | Conflates operational and compliance; fixed weights per acct type | Not directly evaluated |
| **Thompson household** | At-risk, no compliance review | Demo example for booth visitors | Zero compliance review correctly flagged at-risk | 3+ week delay concern |
| **Patel household** | Minor DocuSign delay noted | Not specifically discussed | False-pass demonstration (beneficiary form Not Started → PASS) | Not directly evaluated |
| **Evidence quality** | Not evaluated | Not evaluated | Overstates verification; strings imply content review | Not directly evaluated |
| **Template system** | Not evaluated | Not evaluated | Smart architecture; community intelligence; adoption-validated | Not directly evaluated |

This matrix demonstrates the complementary value of multi-perspective evaluation. The COO tested operational utility. The conference tested market positioning. The SEC examiner tested implementation compliance. The expert tested methodology soundness. Each perspective reveals findings invisible to the others. Together, they provide the most comprehensive assessment of a compliance technology platform I have seen in my consulting practice.

---

*End of Document*
