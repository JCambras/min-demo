# Min Product Evaluation #4: The T3 Conference Booth Test
## Full Simulation & Analysis

---

# PART 1: THE BOOTH SETUP

## 1. Booth Signage

**Banner backdrop (10 words max, readable from 15 feet):**

> **Min — Your practice has 7 things that need you right now.**

Why this works: Every COO who reads that sentence has a physical reaction. They *know* their practice has things falling through cracks. The number "7" is specific enough to feel real, vague enough to provoke curiosity. It doesn't say "operations platform" or "workflow automation" or "compliance solution" — it says *you have problems you don't know about*, and that's the sentence that stops feet.

Secondary line (smaller, below the main banner):

> **Operations intelligence for RIA firms. Connected to Salesforce.**

This line does two jobs: it tells non-target attendees to keep walking (if you're not an RIA, this isn't for you), and it tells Salesforce shops that this plugs into what they already have.

## 2. The Attract-Mode Screen

The large monitor displays a **slow-cycling dashboard view** that rotates between three screens, each held for 8 seconds:

**Screen A: The Triage Queue (Home Screen)**
The headline "7 items need you" is visible from 15 feet. Below it, 3-4 triage cards are visible — each with a red or amber left border, a one-line description ("Patel: DocuSign awaiting signature — 6 days"), and action buttons. The effect from a distance: colored urgency indicators, real household names, real timelines. It looks like a *real practice* with *real problems*.

**Screen B: The Dashboard Health View**
Household health cards in a grid — each with a circular health ring (green/yellow/red), a family name, and an AUM figure. The Thompson card shows a red ring at 55/100. The Rivera card shows green at 92/100. From 15 feet, the visual is immediately legible: some families are healthy, some aren't. The viewer's brain asks: *how does it know?*

**Screen C: Compliance Scan Results**
A compliance check list mid-scan — green checkmarks cascading down (KYC Profile: Pass, Trusted Contact: Pass), then an amber warning (PTE 2020-02: Missing), then a red fail (Beneficiary Designations: Not Found). The visual effect: this thing is *checking* something, finding *real problems*, and showing them in a way that looks authoritative. The regulatory language (FINRA Rule 2090, SEC Rule 204-3) is visible and communicates credibility.

The three screens cycle continuously. No screensaver. No logo animation. A *working product* showing *real data*.

## 3. The One-Liner

When someone stops and looks at the screen, Jon says:

> **"This is what your practice looks like when everything talks to each other — Salesforce, DocuSign, compliance, all in one triage queue."**

This sentence does three things:
1. It names the systems they already use (Salesforce, DocuSign) — instant relevance
2. It names the problem they already have (systems don't talk to each other) — instant recognition
3. It introduces the concept (triage queue) without jargon — instant curiosity

It is NOT: "Min is an AI-powered operations orchestration platform." It is NOT: "We help RIA firms streamline workflows." Those sentences make people nod politely and keep walking.

## 4. The Collateral

**On the table:**

- **One-pager** (see below)
- **QR code stand** linking to a 90-second video walkthrough (the demo tour Min already has built in)
- **Business cards** — Jon's, with the tagline: "Your practice has things that need you. Min finds them."
- **No swag.** No pens, no stress balls. The collateral IS the product. If the demo doesn't sell it, a branded pen won't either.

**The One-Pager (exact content):**

---

**MIN — Operations Intelligence for RIA Firms**

**The problem you already know about:**
Your firm runs on Salesforce, DocuSign, and spreadsheets. When a client's beneficiary designation is missing, you find out during an SEC exam. When a DocuSign envelope has been unsigned for 12 days, nobody notices until the client calls. When a new hire onboards a client, they skip 3 of the 23 compliance steps because nobody told them the steps exist.

**What Min does:**
Min connects to your Salesforce org (read/write, SOC 2, AES-256 encrypted) and builds a single prioritized view of everything that needs attention across your practice. Not a dashboard you check — a triage queue that finds you.

**What changes on Day 1:**
- Every household gets a health score (compliance, DocuSign, tasks, meetings)
- Every morning, your team sees the 5-7 things that actually need them — ranked by risk
- Every compliance review runs 23 checks against FINRA, SEC, DOL, and ERISA rules
- Every action is audit-trailed: who did what, when, why, with what evidence

**What it connects to:**
Salesforce (live today) | DocuSign | Schwab | Fidelity
Redtail, Wealthbox — coming soon

**See it live:** [QR code] or email jon@minfp.com

---

## 5. The Staffing Strategy

**Person 2: A COO from a friendly firm (not a hired booth assistant).**

Why: Conference attendees trust peers over salespeople. If the second person at the booth is a COO who has *used* Min (or is piloting it), they become the most powerful sales tool in the booth. When Jon is deep in a demo, the COO-staffer can have the peer conversation: "Yeah, we had the same problem — unsigned envelopes sitting for weeks and nobody knowing. This thing flags it on day one."

If a friendly COO isn't available, the second person should be someone who can:
1. Make eye contact and say "Want to see what your practice looks like when everything's connected?" (foot traffic hook)
2. Capture lead info (name, firm, email, role) on a tablet
3. Handle the "What does this cost?" question with: "It depends on firm size — Jon can walk you through it, or we can send you pricing after a quick call."

Their job is NOT to demo. Their job is to catch the people who glance at the booth while Jon is occupied with someone else.

---

# PART 2: EIGHT ATTENDEES IN ONE DAY

---

## Attendee 1: Sarah Chen, COO — $300M Firm
*The exact target buyer*

**The approach:**
Sarah is walking toward the Orion booth. She has a printed schedule in her hand. Min is booth #247, which she's passing on her right. The attract-mode screen is cycling — it's on Screen A, the triage queue. She sees "7 items need you" in large text. She sees colored urgency cards. She sees the word "DocuSign" in one of them. Her feet slow. She's dealt with unsigned DocuSign envelopes this week — two of them. She turns her head. She sees the banner: "Your practice has 7 things that need you right now." She stops.

**The first 10 seconds:**
The screen shows the home triage queue. Jon sees her stop and reads her badge — it says "COO" under her name. He says:

> "This is what your practice looks like when everything talks to each other — Salesforce, DocuSign, compliance, all in one triage queue."

Sarah doesn't respond yet. She's reading the screen. She sees "O'Brien: Advisory agreement unsigned — 12 days" with a red left border. She says: **"Is that real data?"**

Jon: "It's demo data modeled on a real practice — 8 households, about $28M total AUM. But yes, it pulls live from Salesforce. That unsigned envelope? It found it by reading DocuSign task records in your SF org."

Sarah stays.

**The 3-minute interaction:**

**0:30** — Jon clicks on the Thompson household triage card (red border, "at-risk"). He says: "This family is $4.7M, no compliance review in 180 days, no meeting logged in 47 days. Min scored them at 55 out of 100. The system surfaced them because they're the highest-risk household in the practice."

Sarah leans in. "How does it calculate the score?"

Jon: "Four factors, weighted: compliance coverage, DocuSign velocity, task completion rate, and meeting frequency. It's not AI magic — it's structured scoring based on what's actually in your Salesforce. If you haven't run a compliance review, that's a zero. If DocuSign envelopes are sitting unsigned for 12 days, that drags the score down."

**1:00** — Jon clicks "Run Check" next to a compliance item. The compliance screen opens. The progressive scan begins — 7 steps cascade: "Pull household records... Check KYC... Verify suitability..." Green checkmarks appear. Then a yellow warning: "PTE 2020-02: No documentation found." Then red: "Beneficiary Designations: Not found."

Sarah: "Wait — it checks for PTE? On rollovers?"

Jon: "Only on rollovers. It detects the account type from the Salesforce task history and conditionally triggers the PTE check. 23 checks total — FINRA 2090, SEC 204-3, DOL prohibited transaction exemption, ERISA. Each one cites the regulation and shows what evidence it found or didn't find."

**1:30** — Sarah says the magic words: **"We just had an SEC exam. They asked for exactly this — documentation that we'd reviewed beneficiary designations for every retirement account. We didn't have it. It took us three weeks to reconstruct."**

Jon doesn't oversell. He clicks to the audit trail screen. "Every action in Min is logged — who ran the review, when, what it found, what the result was. SEC Rule 17a-4 format. You can export the entire trail as a text file."

**2:00** — Sarah: "Does it write back to Salesforce?"

Jon: "Everything. When you complete a task here, it completes in SF. When you log a meeting, it creates the task in SF. When you run a compliance review, the result is recorded as a SF task with the full audit payload. Your existing reports and dashboards still work — Min just adds the intelligence layer."

**2:30** — Sarah: "What's the integration look like? We have a pretty customized SF org."

Jon: "Standard OAuth 2.0. When you first connect, Min runs a discovery scan — reads your data model, detects households, contacts, account types. It adapts to your schema. No custom objects required, no managed package. It reads and writes using standard SOQL."

**2:45** — Sarah: "How much?"

Jon: "It depends on firm size and household count. The best next step is a 30-minute call where I connect to your actual Salesforce — not demo data — and show you what your practice looks like. Usually that call sells itself. Can I get your email and we'll schedule something this week?"

**The verdict:**
Sarah gives Jon her card. She says: "Send me times for Thursday or Friday. And send me that one-pager — my CEO is going to ask what I found at T3." She takes the one-pager and the QR code. She texts someone while walking away. She does not continue to the Orion booth.

**The debrief:**
Sarah validated two things: (1) the compliance scan is the hook for COOs who've been through an exam, and (2) the audit trail is the closer. She didn't ask about dashboards, health scores, or the home screen. She cared about: what does it check, does it write to SF, and can I prove it to an examiner. The 3-minute demo should lead with compliance for COO personas. The "unsigned DocuSign" triage card is what stopped her feet — that's the attract-mode element that works.

---

## Attendee 2: David Park, Senior Advisor — $150M Personal Book
*The advisor who doesn't know he needs this*

**The approach:**
David is wandering. He's seen the custodian booths, stopped at a financial planning software demo, and is now in the general vendor area. He sees the health ring dashboard on Min's attract screen — green, yellow, and red circles with family names. It looks like a client health dashboard. He's curious. He walks up.

**The first 10 seconds:**
The screen cycles to the triage queue. David reads "7 items need you." Jon sees his badge says "Senior Advisor" and adjusts.

> "Morning — this shows you which clients need attention right now, pulled straight from Salesforce. The red ones are urgent."

David: "I use Salesforce. Well, my assistant uses it."

**The 3-minute interaction:**

**0:15** — Jon clicks the Rivera household. "This family is $3.2M. Health score of 92 — they're in good shape. Last compliance review was clean, DocuSign is current, last meeting was 32 days ago. The system suggests scheduling a Q2 check-in."

David nods but isn't leaning in yet.

**0:40** — Jon clicks the Thompson household. "This one's different. $4.7M, but the health score is 55. No compliance review has been run in over 180 days. No meeting logged in 47 days. Three overdue tasks."

David: "Whose client is that?"

Jon: "James Wilder's. In a real practice, your COO would see this and flag it. The question is — does your firm know which households look like this right now?"

David pauses. "Honestly? Probably not. Our COO keeps a spreadsheet but I don't think she has visibility into all of it."

**1:15** — Jon shows the advisor scoreboard on the dashboard. "This ranks every advisor by household count, open tasks, compliance percentage, and an overall score. If your COO had this, she'd know exactly which advisors need support and which clients are falling through cracks."

David: "That's... actually really useful. Not for me — for our operations team."

**1:45** — Jon: "That's exactly right. This is built for your COO and operations team. But advisors benefit because it means your clients don't get missed. Have you ever had a client call asking about paperwork you didn't know was stuck?"

David laughs. "Last month. A beneficiary update that was sitting in someone's inbox for three weeks."

Jon clicks the family view for O'Brien. Shows the unsigned advisory agreement at 12 days. "Min would have flagged this on day 5. Your COO would see it in her morning triage."

**2:15** — David: "Can you send me something I can forward to our COO? Her name's Maria — she'd want to see this."

Jon hands him the one-pager. "There's a QR code there for a 90-second video too. If Maria wants a live walkthrough, my email's on the card."

**The verdict:**
David takes the one-pager and a business card. He says "I'm going to send this to Maria." He does not ask for a personal follow-up. He is not a buyer, but he's now an internal referrer.

**The debrief:**
David validated that the advisor scoreboard and household health scores communicate value to non-operations people — but only when framed as "your COO needs this." The key moment was when David said "Honestly? Probably not." That's the recognition moment. The demo worked because Jon didn't try to sell David on operations features — he showed David what his *COO* would see, and David's self-interest (my clients not getting missed) kicked in. For advisor personas: lead with household health, pivot to "your COO needs this," hand them the one-pager as a forwarding tool.

---

## Attendee 3: Mike Torino, Independent Advisor — $40M Practice
*The tire-kicker*

**The approach:**
Mike walks up while Jon is between conversations. He's carrying a conference tote bag stuffed with brochures. He's visited 30 booths. He reads the banner and says: "What's Min?"

**The first 10 seconds:**
Jon: "This is what your practice looks like when everything talks to each other — Salesforce, DocuSign, compliance, all in one triage queue."

Mike: "I use Redtail, not Salesforce."

This is the first qualification signal. Min doesn't support Redtail yet.

**The 8-minute interaction:**

Jon should say: "Redtail integration is on our roadmap. Right now we're Salesforce-only. Happy to show you a quick demo if you're curious, or I can take your info and let you know when Redtail goes live."

Instead, Mike says: "Sure, show me what it does." And Jon, not wanting to be rude, starts the demo.

**0:30** — Jon shows the triage queue. Mike: "That's cool. Does it do financial planning?"

Jon: "No, it's operations — compliance, onboarding, task management."

Mike: "Does it integrate with eMoney? I use eMoney for planning."

Jon: "Not currently. It's focused on the Salesforce ecosystem."

**1:30** — Mike: "What about portfolio rebalancing? I'm looking for a rebalancing tool."

Jon: "That's not what Min does. Min handles the operational side — making sure nothing falls through the cracks."

**2:30** — Mike asks about pricing. Jon explains it depends on firm size. Mike: "I'm a solo advisor. Would it work for a one-person shop?"

This is the second qualification signal. Mike's $40M practice with one advisor is below Min's target market. Min's value scales with complexity — multiple advisors, multiple custodians, hundreds of households. A solo advisor with 30 clients doesn't have a triage problem.

**3:30** — Mike starts describing his tech stack in detail. He uses 12 different tools. He wants to know if Min replaces any of them. Jon is now three minutes into a conversation with someone who isn't a buyer, and two people have glanced at the booth and kept walking because Jon was occupied.

**5:00** — Mike: "Can I get a free trial?"

Jon: "We do guided onboarding, not self-serve trials. The best thing would be—"

Mike: "I want to try it myself first. I don't do sales calls."

**7:00** — Mike is now asking about Min's API. He's not a developer. He's asking because he asks everyone about their API.

**8:00** — Jon finally says: "Mike, I want to be respectful of your time. We're Salesforce-only right now, and Min is really built for multi-advisor practices. Let me take your card and I'll email you when we launch Redtail support. In the meantime, the QR code on that one-pager links to a video walkthrough you can watch at your own pace."

Mike takes the one-pager, drops his card in the fishbowl, and moves to the next booth.

**The verdict:**
8 minutes wasted. Two potential prospects walked past. Mike will never buy Min.

**The debrief:**
This interaction reveals a critical booth problem: **Jon needs a faster qualification mechanism.** The fix is a two-part strategy:

1. **The signage should pre-qualify.** Adding "Multi-advisor Salesforce practices" to the secondary line on the banner would cause solo Redtail advisors to self-select out.
2. **Jon needs a 15-second qualification script.** When someone says "I use Redtail" or "I'm a solo advisor," the response should be: "We're Salesforce-only, built for multi-advisor firms. Here's a one-pager — I'll let you know when that changes." Polite, fast, definitive.

The second person at the booth (the COO-staffer) should handle these conversations so Jon stays available for qualified prospects.

---

## Attendee 4: Lisa Reyes, Practifi Sales Rep
*Competitive reconnaissance*

**The approach:**
Lisa is wearing a generic conference badge — it says her name and "Financial Services Technology" as her company (she registered with a vague description). She approaches the booth when the attract screen is showing the dashboard health view. She looks closely. She says: "Interesting. What's the data source?"

**The first 10 seconds:**
Jon: "Everything comes from Salesforce — live connection, reads households, tasks, DocuSign activity, and builds a health score for each family."

Lisa nods slowly. She's cataloging.

**The 3-minute interaction:**

**0:20** — Lisa: "So it's a Salesforce overlay? Like a managed package?"

Jon: "No managed package. It's a standalone app that connects via OAuth. Reads and writes through the API. No custom objects installed in your org."

Lisa mentally notes: *No SF AppExchange presence. Harder to discover. But also means no lock-in.*

**0:45** — Lisa: "What's the compliance piece do? We have clients asking about compliance automation."

Jon shows the compliance scan. Lisa watches 23 checks cascade. She reads the regulation citations. She asks: "Are these configurable? Can firms add their own checks?"

Jon: "Yes — there's a custom check builder. Firms can add keyword-based checks tied to their own policies."

Lisa notes: *Practifi doesn't have a compliance scan engine. This is a real differentiator. But it's keyword-based, not AI — I can position that as a limitation.*

**1:30** — Lisa: "How do you handle multi-custodian firms?"

Jon: "Right now it's reading from Salesforce, which means whatever custodian data is in your SF org. We're building direct custodian integrations — Schwab and Fidelity first. The reconciliation view on the dashboard already shows matched vs. orphaned accounts."

Lisa notes: *They don't have live custodian feeds yet. Practifi does. That's our attack angle.*

**2:00** — Lisa: "What about workflow automation? We hear a lot about that."

Jon shows the workflow screen briefly. Lisa evaluates it against Practifi's workflow engine.

**2:30** — Lisa: "Pricing model?"

Jon: "Based on firm size and household count. We do custom proposals after a discovery call."

Lisa: "Got it. Can I take a one-pager?"

She takes the one-pager, thanks Jon, and leaves. She does not give her card.

**The verdict:**
Lisa learned three things she'll use competitively:
1. **Attack angle:** "Min doesn't have direct custodian integrations — you're still dependent on your CRM data being accurate."
2. **Attack angle:** "Min's compliance engine is keyword-based, not semantic — it can miss things that aren't labeled correctly in your Salesforce."
3. **Can't attack:** The 23-check compliance scan with regulation citations is something Practifi doesn't have. The audit trail with SEC 17a-4 compliance is defensible. The triage queue with urgency-ranked items is a genuinely different UX paradigm.

**The debrief:**

Jon didn't recognize Lisa. That's fine — most competitive visitors won't identify themselves.

**Competitive defense strategy for booth demos:**
- **Don't demo the workflow screen** to strangers. It's the weakest differentiator and the easiest for competitors to compare against their own.
- **Do demo compliance and audit trail.** These are deep, regulation-specific, and hard to replicate. Competitors can't "add" 23 checks with FINRA/SEC/DOL citations in a sprint.
- **When asked about custodian integrations:** "We reconcile custodial data that's already in your Salesforce, and direct integrations are in development. The compliance and triage value doesn't depend on custodian feeds — it depends on what's in your CRM."
- **When asked about AI:** Don't claim AI. Say "structured intelligence" or "rules-based with configurable thresholds." Overpromising AI invites skepticism and competitive attack.

---

## Attendee 5: Patricia Owens, CCO — $2B Firm
*The compliance officer who's been burned*

**The approach:**
Patricia sees the attract screen during the compliance scan cycle. She sees regulation names — FINRA Rule 2090, SEC Rule 204-3. She walks directly to the booth. She doesn't look at the banner. She points at the screen and says: "What compliance checks does this run?"

**The first 10 seconds:**
Jon recognizes the intensity. He doesn't deliver the one-liner. He answers her question directly.

> "Twenty-three checks across five categories — identity and KYC, suitability, document delivery, account setup, and regulatory. Each check cites the specific regulation and shows what evidence it found in your Salesforce."

Patricia: "Show me the suitability check."

**The 3-minute interaction:**

**0:20** — Jon navigates to a compliance result and expands the suitability section. "FINRA Rule 2111 and Reg BI. It looks for a suitability questionnaire task, risk tolerance documentation, and investment objective in the household record. If any are missing, it flags them."

Patricia: "What's the evidence? If an examiner asks me to prove we verified suitability for account 47 out of 200, what do I hand them?"

Jon clicks the evidence panel. "Each check shows what it found — the task subject, creation date, completion status, and the contact it's associated with. For suitability, it shows whether a suitability task exists, whether it's completed, and what data points are present."

Patricia: "That's the task. What about the actual questionnaire? The document?"

**1:00** — Jon pauses. This is the hardest compliance question he'll face at the booth. Min checks whether a *task* exists in Salesforce for suitability — it doesn't verify the actual document content. If the questionnaire is stored as a PDF attachment in Salesforce, Min doesn't parse it.

Jon is honest: "Right now, Min verifies that the compliance step was completed — that the task exists and was marked done. It doesn't open and parse the underlying document. If your suitability questionnaire is a PDF attached to the contact record, Min confirms the task was completed, but the actual document review is still on your team."

Patricia nods. She expected this. "So it's a checklist, not a document verification system."

Jon: "That's fair for the suitability check specifically. But the value is in the aggregate — running 23 checks across every household simultaneously and surfacing the gaps. Without Min, your team is doing this manually, household by household, before an exam."

**1:45** — Patricia: "Show me the audit trail."

Jon navigates to the audit screen. Shows the log: timestamps, action types, results, actor names, household associations.

Patricia: "Can I export this for an examiner?"

Jon: "Yes — text-based export, SEC Rule 17a-4 format. Every action that touches Min is logged: compliance reviews, task completions, triage resolutions, even dismissed items include the dismissal reason."

Patricia leans in for the first time. "Dismissal reasons are logged?"

Jon: "If someone dismisses a triage item — a flagged compliance gap, an unsigned envelope — they have to type a reason. That reason is recorded in the audit trail with a timestamp and the actor's name. It's designed for exactly the situation you're describing — proving to an examiner that flagged items were reviewed and dispositioned, not ignored."

**2:30** — Patricia: "How does this handle annual reviews? We need to prove we review every client relationship at least annually."

Jon shows the "Annual Review" check in the compliance engine. "It checks the household creation date. If a household is older than 365 days and no compliance review task has been recorded, it flags it as a warning. The batch scan runs this across every household simultaneously."

Patricia: "What if I need different review frequencies for different client tiers?"

Jon: "The compliance schedule settings let you set frequency — daily, weekly, monthly scans. Custom checks let you add firm-specific keywords. But tiered review frequencies based on client classification — that's a feature request I'm writing down right now."

**3:00** — Patricia: "I need to see this with our actual data. Not demo data."

Jon: "That's exactly the right next step. I'll connect to your Salesforce in a 30-minute call and run the scan against your real households. You'll see every gap in your firm in real time."

**The verdict:**
Patricia gives Jon her card. She writes "COMPLIANCE DEMO — REAL DATA" on the back. She says: "Schedule me for next week. And send me the audit trail export format — I want to show it to our outside counsel."

She does not take the one-pager. She took the card.

**The debrief:**
Patricia exposed a real product gap: Min checks for task *existence*, not document *content*. For sophisticated CCOs, that's a meaningful distinction. However, she was sold by two things: (1) the batch scan across all households simultaneously (her current process is manual), and (2) the audit trail with dismissal reasons (she's been burned by examiners asking "what happened to this flagged item?").

**Product note:** Tiered review frequencies (Gold/Silver/Bronze clients with different compliance cadences) should be added to the compliance schedule settings. Patricia won't be the last person to ask.

**Demo note:** For CCO personas, skip the home screen entirely. Start at compliance, show the scan, show the audit trail. These people don't care about health scores or dashboards — they care about evidence.

---

## Attendee 6: Ryan Marsh, RIA Technology Consultant
*90 seconds or less*

**The approach:**
Ryan has been walking the floor for 4 hours. He's seen 40 booths. He stops at Min because he doesn't recognize the name and he's paid to know every product. He looks at the screen. He looks at his watch. He gives Jon exactly 90 seconds.

**The first 10 seconds:**
The screen shows the triage queue. Ryan reads it. He says nothing. He's evaluating.

Jon reads his badge — "RIA Technology Consulting." Jon skips the one-liner and goes direct:

> "Salesforce-native operations layer. Reads your CRM, scores every household, surfaces what needs attention, runs compliance checks against 23 regulatory requirements, and audit-trails everything."

Ryan: "Who's behind it?"

Jon: "I'm Jon Cambras — I built it. Background in RIA operations, former advisor."

**The 30-second mark:**
Ryan: "Show me something I haven't seen."

Jon clicks into the compliance scan. Lets it run for 5 seconds — checkmarks cascading. Then clicks to the audit trail. Shows the logged dismissal with reason. Then clicks to the family view. Shows the health ring. Shows the provenance — taps a data point and the source attribution appears: "CRM (Salesforce) · updated 2 days ago."

Ryan: "The provenance layer is interesting. Nobody else shows where the data came from."

**The 60-second mark:**
Ryan: "What's different from Practifi?"

Jon: "Practifi is a CRM replacement. Min sits on top of your existing Salesforce. No migration, no new CRM. And the compliance engine — 23 regulatory checks with audit trail — that's not something any CRM does."

Ryan: "Pricing?"

Jon: "Custom, based on firm size. Entry point is a 30-minute discovery call where I connect to their Salesforce live."

**The 90-second mark:**
Ryan reaches into his pocket. He hands Jon his card. "Send me a one-pager and your pricing framework. I have three clients who are drowning in operations and already on Salesforce. Two of them just went through exams."

He walks away. 87 seconds.

**The verdict:**
Ryan is the highest-leverage contact of the day. One recommendation from him could produce 3-5 qualified prospects. He asked for three things: one-pager, pricing, and specifically mentioned clients who've been through exams.

**The debrief:**
Ryan validated the 90-second demo path: compliance scan + audit trail + provenance. He didn't need the triage queue, the dashboard, or the onboarding flow. He needed to see *one thing nobody else does* (provenance/source attribution), *one thing that matters* (compliance with regulation citations), and *one structural differentiator* (sits on Salesforce, doesn't replace it). The "what's different from Practifi" question will come up at every booth — the answer "overlay, not replacement" is the correct positioning.

---

## Attendee 7: Robert Hargrove, CEO — $500M Practice
*About to sell his firm*

**The approach:**
Robert is browsing casually. He's not buying software — he's understanding the landscape. He stops at Min's booth because the dashboard health cards remind him of something an acquirer mentioned: "operational maturity metrics." He wants to understand what that means in practice.

**The first 10 seconds:**
Jon delivers the one-liner. Robert nods and says: "Tell me more about the health scores."

**The 3-minute interaction:**

**0:15** — Jon shows the dashboard. "Every household gets a health score from 0-100 based on four factors: compliance coverage, DocuSign velocity, task completion, and meeting frequency. The firm gets an aggregate practice health score."

Robert: "If I showed this to a potential acquirer, what would they see?"

Jon recognizes the angle immediately. "They'd see operational transparency. An acquirer evaluating your firm would see exactly how many households have current compliance reviews, how many have unsigned paperwork, how many have overdue tasks. If your practice scores 85+ across the board, that's a signal that the business runs without the founder."

**0:45** — Robert: "That's exactly what they're asking about. The PE group wants to know if the business is 'key-person dependent.' They want to know if I leave, do the processes still work."

Jon: "Min is evidence that they do. The audit trail proves that compliance reviews happen on schedule, that flagged items get dispositioned with documented reasons, that meetings happen at regular intervals. It's not just that you're operationally sound — it's that you can *prove* it."

**1:30** — Robert: "Can you show me what a board report looks like from this?"

Jon clicks the "Board Report" export on the dashboard. A structured text report generates: practice health score, household breakdown, compliance coverage percentage, advisor scoreboard, risk summary.

Robert: "If I had this running for six months before an acquisition, with a documented trail..."

Jon: "You'd have six months of operational evidence. Compliance cadence, task throughput, meeting frequency, risk disposition — all timestamped and auditable. That's the kind of documentation that de-risks an acquisition for the buyer."

**2:15** — Robert: "How long does implementation take?"

Jon: "Connection to Salesforce takes about 10 minutes. Discovery scan is automated. Meaningful data starts appearing within a day — Min reads your existing task and activity history. To get six months of forward-looking audit trail, you'd need six months of usage."

Robert: "So I should have started this six months ago."

Jon: "The next best time is today. And frankly, even three months of clean operational data changes the conversation with an acquirer."

**2:45** — Robert takes a business card. "I'm not buying this for operations — I'm buying this for the exit narrative. Send me pricing and what a 90-day implementation looks like."

**The verdict:**
Robert is a buyer, but for a reason Jon didn't anticipate at the start of the day. He doesn't care about triage queues or compliance scans — he cares about provable operational maturity for an acquisition. This is a high-value use case that Min already supports but hasn't marketed.

**The debrief:**
Robert revealed a new positioning angle: **Min as acquisition readiness infrastructure.** The board report export, the audit trail, the health scores — these are exactly what PE-backed aggregators want to see during due diligence. This should become a dedicated marketing angle: "Prove your practice runs without you."

**Language for this use case:**
- "Operational maturity, documented and auditable"
- "Six months of Min data is six months of proof that the business runs on process, not personality"
- "Acquirers want to see compliance cadence, not just compliance completion"

---

## Attendee 8: Angela Torres, COO — $400M Firm
*Already saw the LinkedIn post*

**The approach:**
Angela walks directly to the booth. She's been looking for it. She saw Jon's LinkedIn post about Min a month ago — the one with the triage queue screenshot that got 200+ likes. She's been thinking about it since. She says: "You're the Min guy. I've been waiting to see this in person."

**The first 10 seconds:**
Jon: "You've seen the post! What caught your eye?"

Angela: "The triage queue. The idea that every morning I'd see the 5-7 things that actually matter instead of scrolling through a Salesforce report."

**The 3-minute interaction:**

**0:15** — Jon shows the live triage queue. Angela reads every card. She's comparing what she sees to what she imagined from the LinkedIn post.

"The urgency coloring is good. The 'now' vs 'today' distinction — that's useful. How does it decide what's 'now'?"

Jon: "High-priority overdue tasks and DocuSign envelopes unsigned more than 5 days are 'now.' Normal-priority overdue or due-today items are 'today.' Households that have never had a compliance review are 'this week.'"

Angela: "Can I customize those thresholds?"

Jon: "Not yet in the UI. That's coming. Right now the thresholds are hardcoded based on what we've seen works for most practices."

**0:45** — Angela clicks the Snooze button on a triage card. The snooze options appear: "Tomorrow," "Before account submission (Feb 21)," "End of week."

"Wait — those snooze options are contextual? They're different per item?"

Jon: "Yes. If it's a DocuSign item with a deadline, the snooze options reference that deadline. If it's a general task, they're calendar-based."

Angela: "That's not in the LinkedIn post. That's better than I expected."

**1:15** — Angela: "Show me what happens when I dismiss something."

Jon clicks Dismiss. A text input appears: "Reason for dismissing..."

Angela types: "Client confirmed via phone, will sign next week." Clicks Confirm.

Jon navigates to the audit trail. Shows the dismiss action logged with her reason, timestamp, and household.

Angela: "So if someone on my team dismisses something without a good reason, I can see it."

Jon: "Exactly. And during an audit, you can prove that every flagged item was reviewed and dispositioned by a human with a documented reason."

**1:45** — Angela: "Okay, the LinkedIn post made it look like a triage tool. This is more than that. Show me the compliance piece."

Jon runs a quick compliance scan. Angela watches the 23 checks cascade.

"The LinkedIn post didn't mention compliance. Why not?"

Jon: "Because the triage queue is the hook — it's what makes people stop. Compliance is the depth. If I led with '23 regulatory checks,' most people's eyes would glaze over. But once you see the triage queue and think 'I want this,' the compliance engine is what makes you think 'I need this.'"

Angela: "Smart. The post undersold the product."

**2:15** — Angela: "What's not working yet? What's the gap between what you showed on LinkedIn and what exists today?"

Jon is honest: "Two things. First, custodian integrations — right now it reads from Salesforce, not directly from Schwab or Fidelity. If your SF data is stale, Min's data is stale. Second, custom threshold configuration for the triage queue — the urgency rules are hardcoded. Those are both on the roadmap."

Angela: "I can live with both of those. Our SF data is clean — we have someone who maintains it. And the default thresholds are close to what I'd set anyway."

**2:45** — Angela: "Let's schedule a real demo. I want to connect my Salesforce and see my actual practice."

Jon: "I'll send you a calendar link today. 30-minute call, I'll connect live and we'll look at your real data."

Angela: "Do it. And Jon — lead with the compliance piece in the next LinkedIn post. The triage queue got me in the door, but the compliance scan is why I'm scheduling a demo."

**The verdict:**
Angela is the warmest lead of the day. She came pre-sold, the live demo exceeded her expectations (contextual snooze, dismiss-with-reason, compliance depth), and she identified a specific gap between the marketing and the product that is actually a *positive* gap (the product is deeper than the marketing suggested). She scheduled a follow-up on the spot.

**The debrief:**
Angela's feedback is gold: **the LinkedIn content should show more of the compliance engine.** The triage queue is the top-of-funnel hook, but the compliance scan is the bottom-of-funnel closer. The two-post strategy: Post 1 shows the triage queue (awareness), Post 2 shows the compliance scan (conversion).

The "contextual snooze options" moment was the strongest reaction of the day — a feature Angela didn't know existed that exceeded expectations. This suggests the product has hidden depth that the marketing isn't surfacing. Future content should highlight these "wait, it does that?" moments.

---

# PART 3: THE 3-MINUTE DEMO SCRIPT

Based on all 8 interactions, here is the optimized click-by-click script.

---

## Seconds 0-10: The Hook

**On screen:** Home screen, triage queue visible. "7 items need you" headline. Red and amber urgency cards.

**Jon says:** "This is what your practice looks like when everything talks to each other — Salesforce, DocuSign, compliance, all in one triage queue."

**Goal:** They stay.

---

## Seconds 10-40: The Problem

**Jon clicks:** The Thompson household triage card (red border, "at-risk").

**On screen:** The card expands to show: "$4.7M household, no compliance review in 180+ days, no meeting in 47 days, 3 overdue tasks."

**Jon says:** "This household is $4.7 million — and nobody at the firm has reviewed their compliance in six months. No meeting in 47 days. Three overdue tasks. Before Min, nobody knew. Now it's the first thing you see when you open the app."

**Goal:** Recognition. The attendee thinks "that's my life — we have households like that and we don't know it."

---

## Seconds 40-90: The First Lightbulb

**Jon clicks:** "Run Check" on the Thompson compliance item.

**On screen:** The compliance scan begins. 7 steps cascade with checkmarks. Green: KYC Profile Pass. Green: Trusted Contact Pass. Then amber: "PTE 2020-02: No documentation found." Then red: "Beneficiary Designations: Not found." The regulation name and rule number are visible next to each check.

**Jon says:** "Twenty-three checks. FINRA, SEC, DOL, ERISA. It just found two gaps in this household — a missing beneficiary designation and no PTE documentation for their rollover IRA. This runs in about 10 seconds per household. You can batch-scan your entire firm."

**Goal:** Surprise. "Wait — it checks for PTE on rollovers? It knows the regulation numbers?"

---

## Seconds 90-120: The Second Lightbulb

**Jon clicks:** Navigate to the audit trail screen.

**On screen:** The audit log. Rows showing: "triageDismiss — success — Angela Torres — Thompson Household — 'Client confirmed via phone, will sign next week' — 2:34 PM."

**Jon says:** "Every action is logged. When someone dismisses a flagged item, they have to type why. When someone completes a task, it's timestamped. When someone runs a compliance review, the result is recorded. If an examiner asks 'what happened to this flagged item six months ago?' — you have the answer."

**Goal:** Trust. The compliance scan finds problems; the audit trail proves you handled them. This is the one-two punch.

---

## Seconds 120-150: The Proof

**Jon clicks:** Navigate to the family view for Thompson. Tap a data point with the dotted underline.

**On screen:** The provenance popover appears: "CRM (Salesforce) · updated 3 days ago."

**Jon says:** "Every data point shows where it came from and when it was last updated. This isn't a black box — you can see exactly what Min is reading from your Salesforce. If the data is stale, the freshness indicator tells you."

**Goal:** "This is real engineering, not a demo trick." The provenance layer is the thing nobody else shows.

---

## Seconds 150-180: The Close

**Jon says:** "The best next step is a 30-minute call where I connect to your actual Salesforce — not demo data — and we look at your real practice. You'll see every household's health score, every compliance gap, and the triage queue for your firm. Can I grab your email and send you a calendar link?"

**On screen:** Jon pulls out his phone to take down their info (or hands them his card with QR code).

**Goal:** A scheduled follow-up, not a business card exchange.

---

# PART 4: WHAT THE BOOTH REVEALED ABOUT THE PRODUCT

## 1. The 10-Second Test

**Did the signage stop the right people?** Yes. The "7 things that need you right now" hook stopped Sarah (COO), Patricia (CCO), and Angela (pre-sold COO). The attract-mode screen's cycling between triage/health/compliance worked — different screens hooked different personas.

**Did it stop the wrong people?** Yes — Mike (solo Redtail advisor). The signage doesn't pre-qualify by firm size or CRM.

**Recommended signage change:** Add "Multi-advisor Salesforce practices" to the secondary line. New secondary: "Operations intelligence for multi-advisor RIA firms on Salesforce."

## 2. The Vocabulary Test

| Word | Landed? | Notes |
|------|---------|-------|
| "Triage queue" | Yes | Every persona understood it immediately |
| "Health score" | Yes | Robert (acquisition) and David (advisor) both reacted positively |
| "Compliance scan" | Yes | Strongest universal reaction |
| "Orchestration" | Not used | Correctly avoided — too abstract for a booth |
| "Audit trail" | Yes, strongly | Patricia and Angela both leaned in |
| "NIGO" | Not used | Would confuse non-ops attendees |
| "Provenance" | Mixed | Ryan (consultant) loved it; others didn't notice until shown |
| "Operational maturity" | Yes | Robert specifically — use for acquisition angle only |

**Recommendation:** Lead with "triage," "compliance scan," and "audit trail." These three terms are universally understood by the target audience. Avoid "orchestration," "intelligence layer," and "NIGO" at the booth.

## 3. The Feature Hierarchy

**Strongest reaction (across all personas):**
1. **Compliance scan with regulation citations** — Every persona except Mike reacted. Patricia, Angela, and Ryan all leaned in.
2. **Audit trail with dismissal reasons** — The "prove it to an examiner" moment landed with Patricia, Angela, and Robert.
3. **Triage queue with urgency ranking** — The foot-traffic stopper. Works as the hook, not the closer.

**Weakest reaction:**
1. **Workflow automation** — Nobody asked about it. Lisa (Practifi) asked, but competitively, not with interest.
2. **Dashboard revenue intelligence** — Nobody cared about AUM calculations at the booth.
3. **Onboarding flow** — Nobody asked to see onboarding in the 3-minute window.

**Conclusion:** Lead every demo with compliance + audit trail. Use triage as the attract screen. Save onboarding and workflows for the 30-minute follow-up call.

## 4. The Qualification Test

**Fastest self-qualification signals:**

| Signal | Meaning | Response |
|--------|---------|----------|
| "I use Redtail / Wealthbox" | Not a current prospect | "Salesforce-only today. Here's a one-pager — I'll let you know when that changes." |
| "I'm a solo advisor" | Below target market | "Min is built for multi-advisor practices. Happy to connect when your firm grows." |
| "Who handles operations at your firm?" | If they say "me" + large firm = qualified | Continue demo |
| "We just had an SEC exam" | Highly qualified | Pivot immediately to compliance scan + audit trail |
| Badge says "COO" or "CCO" | Target buyer | Full demo path |

**Recommended qualification question (Jon asks first):** "How many advisors does your firm have, and are you on Salesforce?" This question takes 5 seconds and eliminates 60% of non-target visitors.

## 5. The Competitive Test

**What Lisa (Practifi) learned:**
- Min doesn't have direct custodian integrations yet
- Min's compliance engine is keyword/task-based, not document-level
- Min is a Salesforce overlay, not a CRM replacement

**What she couldn't learn:**
- The depth of the 23 compliance checks (she saw the scan but not the underlying engine)
- The provenance layer and freshness indicators (Jon didn't show these)
- The batch scan capability (not demonstrated)

**Competitive defense for booth demos:**
- Don't show workflows to unknown visitors (competitive parity with Practifi)
- Do show compliance + audit trail (competitive differentiation)
- When asked "how is this different from [competitor]?": "We sit on top of your existing Salesforce — no migration. And the compliance engine with 23 regulatory checks and SEC-ready audit trail isn't something any CRM provides."

## 6. The Objection Map

| Rank | Objection | Frequency | One-Sentence Response |
|------|-----------|-----------|----------------------|
| 1 | "We don't use Salesforce" | 2/8 | "We're Salesforce-only today — here's a one-pager for when Redtail/Wealthbox goes live." |
| 2 | "Does it verify actual documents, not just tasks?" | 1/8 (but high-impact) | "Today it verifies that the compliance step was completed — document-level parsing is on the roadmap." |
| 3 | "Can I customize the triage thresholds?" | 1/8 | "Default thresholds work for most practices — custom configuration is coming in the next release." |
| 4 | "How much does it cost?" | 3/8 | "It depends on firm size — the best way is a 30-minute call where I connect to your real Salesforce." |
| 5 | "How long does implementation take?" | 2/8 | "Salesforce connection is 10 minutes. Discovery is automated. You'll see real data within a day." |
| 6 | "Is my data safe?" | 1/8 | "SOC 2 compliant, AES-256 encryption, data stays in your Salesforce — Min reads and writes, never stores." |

## 7. The Follow-Up Strategy

| Attendee | Lead Quality | Follow-Up |
|----------|-------------|-----------|
| Sarah Chen (COO, $300M) | A — Hot | Scheduled demo for Thursday/Friday. Send one-pager + pricing framework within 2 hours. She'll forward to CEO. |
| David Park (Advisor, $150M) | C — Referrer | Email one-pager + "feel free to forward to Maria (your COO)." No direct follow-up unless Maria reaches out. |
| Mike Torino (Solo, $40M) | D — Not qualified | Add to Redtail waitlist. No follow-up. |
| Lisa Reyes (Practifi) | N/A — Competitor | No follow-up. Note competitive angles for defense preparation. |
| Patricia Owens (CCO, $2B) | A — Hot | Scheduled demo for next week. Send audit trail export format sample + pricing. She'll involve outside counsel. |
| Ryan Marsh (Consultant) | A+ — Multiplier | Send one-pager + pricing framework + "happy to do a walkthrough for any of your clients." Ryan is worth 3-5 referrals. Follow up Day 1, Day 3, Day 7. |
| Robert Hargrove (CEO, $500M) | B — Acquisition angle | Send pricing + "90-day operational readiness" framing. This is a different sales conversation — position Min as acquisition prep, not operations tool. |
| Angela Torres (COO, $400M) | A — Hot, pre-sold | Calendar link sent same day. She's ready to buy. Don't oversell — just connect to her Salesforce and let the data do the work. |

**Summary:** 3 hot leads (Sarah, Patricia, Angela), 1 multiplier (Ryan), 1 acquisition angle (Robert), 1 referrer (David), 1 competitor (Lisa), 1 disqualified (Mike). That's a 50% qualified-lead rate from booth traffic, which is exceptional.

---

# PART 5: BOARD AND OPS TEAM REVIEW

## Board of Advisors Review

### Is T3 the right go-to-market channel for Min's current stage?

**Yes, with caveats.** T3 concentrates the exact buyer persona (COOs, CCOs, firm principals at $200M-$2B practices) in one place for three days. The simulation produced 3 hot leads and 1 multiplier from 8 interactions. Extrapolated across a full conference day (30-40 booth interactions), that's potentially 15-20 qualified leads.

However, Min is pre-revenue. A $15K-$25K booth investment is significant. The board recommends a **minimal booth** (10x10 standard, not premium) with a focus on quality of interaction over quantity. The 3-minute demo script is tight enough to handle volume.

### Does the 3-minute demo communicate the right things?

**Yes.** The compliance scan + audit trail combination was the consistent closer across all qualified personas. The triage queue works as the hook but isn't the reason anyone scheduled a follow-up. The 3-minute script correctly front-loads the hook and back-loads the proof.

**Risk:** The 3-minute demo could create the impression that Min is "only" a compliance tool. The follow-up 30-minute demo must broaden the value proposition to include onboarding, task management, and the full operations layer.

### Cost-benefit vs. other channels?

| Channel | Cost | Expected Leads | Cost/Lead | Timeline |
|---------|------|----------------|-----------|----------|
| T3 Conference | $20K | 15-20 qualified | $1,000-1,333 | Immediate |
| Consultant partnerships (Ryan Marsh type) | $2K (meals/travel) | 3-5 per consultant | $400-667 | 2-4 months |
| LinkedIn content marketing | $0 (Jon's time) | 1-2 per post | $0 | Ongoing, slow |
| Direct outreach (cold email) | $500/mo (tools) | 2-3/month | $167-250 | Slow, low conversion |

**Recommendation:** Do T3, but treat it as a consultant-acquisition channel, not a direct-sales channel. If Jon converts Ryan Marsh (or 2-3 similar consultants), the ROI of the conference multiplies over 12 months. Simultaneously, increase LinkedIn cadence to pre-warm future conference attendees (the Angela Torres effect).

### Conversion rate estimate?

- Booth visit to scheduled demo: 40% (3-4 out of 8 in the simulation)
- Scheduled demo to pilot: 30% (based on the demo connecting to real Salesforce data)
- Pilot to paying customer: 50% (if the real data produces the "holy shit" moment)
- **Net: Booth visit to paying customer: ~6%**
- **Per conference: 30-40 visits x 6% = 2-3 paying customers**

At a $20K conference cost, that's $7K-$10K customer acquisition cost. Acceptable for enterprise RIA software if ACV is $10K+.

### T3 vs. smaller regional events?

**Do both.** T3 is the flagship — it's where consultants and large firms concentrate. But FPA chapter meetings and local study groups offer 5-10 qualified attendees per event at near-zero cost. Jon should do 1 T3 + 4-6 regional events per year. The 3-minute demo script works for both — just swap the large monitor for a laptop.

---

## Operating Team Review

### Elena (Product) — Attract-Mode Screen Revisions

1. **Lock the triage queue as the default attract screen.** It generated the most foot traffic stops. The health dashboard is visually appealing but doesn't communicate urgency. The compliance scan is too detailed to read from 15 feet.

2. **Add a "demo mode" attract loop.** When the app is idle for 60 seconds, it should auto-cycle through: Triage queue (8 sec) → One household health card expanding (8 sec) → Compliance scan running in fast-forward (8 sec) → Audit trail scrolling (8 sec). This 32-second loop tells the full story without human interaction.

3. **Increase triage card font size for conference mode.** The current 14px text is readable from 3 feet but not 15 feet. Add a `?booth=true` URL parameter that scales the triage cards to 1.5x size.

### Omar (Engineering) — Conference Demo Build Punch List

| Item | Priority | Effort | Notes |
|------|----------|--------|-------|
| Booth mode URL parameter (`?booth=true`) — larger fonts, attract loop | P0 | 1 day | For attract screen visibility |
| Custom triage threshold configuration UI | P1 | 3 days | Angela and Patricia both asked |
| Tiered compliance review frequencies | P1 | 2 days | Patricia specifically requested |
| Document-level compliance verification (stretch) | P2 | 2 weeks | Patricia's hardest question — at least a roadmap answer |
| Audit trail PDF export (not just text) | P1 | 1 day | Patricia wanted to show outside counsel |
| "Acquisition readiness" dashboard view | P2 | 3 days | Robert's use case — could be a dashboard tab |

### Rachel (Go-to-Market) — Pre-Conference Checklist

**Jon should rehearse:**
1. The 3-minute script — 20 times, timed, until it's muscle memory
2. The 15-second qualification question: "How many advisors, and are you on Salesforce?"
3. The Practifi competitive response: "We're an overlay, not a replacement. Plus 23 regulatory checks."
4. The pricing deflection: "It depends on firm size — best next step is a 30-minute call with your real data."
5. The compliance depth question (Patricia's "what about the actual document?"): Honest answer + redirect to batch scan value

**Edge cases to prepare for:**
- "Does this use AI?" → "Structured intelligence — rules-based compliance checks with configurable thresholds. No black-box AI making decisions about your clients' compliance."
- "What about [competitor]?" → For any competitor: "Happy to discuss — what are you using today?" (learn before responding)
- "Can I see the code?" → "It's proprietary, but the security architecture is on the one-pager: SOC 2, AES-256, OAuth 2.0, no client data stored on our servers."
- "Do you have references?" → Have 1-2 pilot firms ready to name (with permission)

### Rachel — Lead Capture & Follow-Up Workflow

**At the booth:**
Capture on a tablet: Name, Firm, Email, Role, # Advisors, CRM, One qualifier note ("just had SEC exam," "looking for compliance," "acquisition angle")

**Within 2 hours of conversation:**
- Email: "Great meeting you at T3. Here's the one-pager we discussed. [Attached] I'd love to connect to your Salesforce and show you your actual practice data. Here are three times this week: [Calendar link]."
- Attach: One-pager PDF + link to 90-second video

**Day 3 (if no response):**
- Email: "Following up from T3 — I know the post-conference inbox is brutal. The offer stands: 30-minute call, I connect to your Salesforce live, you see your practice's compliance gaps and health scores in real time. No commitment. [Calendar link]"

**Day 7 (if no response):**
- Email: "Last note from me — if the timing isn't right, no worries. I'll send you our monthly product update so you can see what's new. If you ever want to take a look, just reply. — Jon"

**For Ryan (consultant):**
- Day 1: One-pager + pricing framework + "I'd love to give your clients a walkthrough — happy to do joint calls"
- Day 3: Follow up with a specific client scenario: "If you have clients who've been through SEC exams, the compliance scan + audit trail is usually the hook"
- Day 7: Check in — "Any clients come to mind?"

---

# 10 Takeaways from the Conference Test

*Ordered by impact. These are about communication and positioning, not features.*

1. **The compliance scan is the closer, not the hook.** The triage queue stops feet; the compliance scan schedules demos. The 3-minute script must include both, in that order.

2. **"Sits on top of Salesforce" is the single most important structural differentiator.** Every competitor is a CRM replacement or a managed package. Min is neither. This positioning wins the Practifi comparison, the "we don't want to migrate" objection, and the consultant recommendation.

3. **The audit trail with dismissal reasons is the moment that builds trust.** Across all qualified personas, the reaction to "dismissed items require a typed reason, and that reason is logged" was the strongest trust signal.

4. **Conferences are consultant-acquisition channels, not direct-sales channels.** One Ryan Marsh is worth ten business cards. Prioritize consultant relationships over individual leads.

5. **The signage must pre-qualify.** "Multi-advisor Salesforce practices" added to the banner prevents 8-minute conversations with solo Redtail advisors.

6. **The "acquisition readiness" use case is real and unmarketed.** Robert Hargrove revealed a buyer persona (PE-backed acquisition targets) that Min serves but doesn't speak to. This is worth a dedicated landing page and LinkedIn post.

7. **Jon needs a 15-second qualification script before the demo begins.** "How many advisors, and are you on Salesforce?" is the gatekeeper question that protects demo time.

8. **The product is deeper than the marketing.** Angela Torres expected a triage tool and found a compliance engine. This is a marketing problem, not a product problem. Future LinkedIn content should show compliance scans, audit trails, and provenance — not just the home screen.

9. **CCOs are a viable buyer persona, not just COOs.** Patricia Owens was one of the two strongest leads. The compliance scan + audit trail combination speaks directly to post-examination anxiety. Conference signage should mention "compliance" visibly.

10. **The three words that work at a booth: triage, compliance, audit.** These are universally understood by the target audience, communicate urgency and depth, and don't require explanation. "Orchestration," "intelligence," and "workflow" are conference noise.

---

# The 3 Sentences

**1. The sentence that stops foot traffic (signage):**

> Your practice has 7 things that need you right now.

**2. The sentence that hooks a qualified prospect (Jon's opener):**

> This is what your practice looks like when everything talks to each other — Salesforce, DocuSign, compliance, all in one triage queue.

**3. The sentence that closes for a follow-up (Jon's ask):**

> The best next step is 30 minutes where I connect to your actual Salesforce and you see your real practice — every compliance gap, every stuck envelope, every household that needs attention. Can I send you a calendar link?
