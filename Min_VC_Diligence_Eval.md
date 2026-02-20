# Min — Series A Venture Diligence Evaluation

**Evaluation #6: Full Investment Diligence**

**Evaluator:** Elena Voss, Partner — Meridian Ventures
**Fund:** Meridian Ventures Fund III ($400M, fintech-focused)
**Date:** February 2026
**Company:** Min (Practice Intelligence for RIAs)
**Founder:** Jon Cambras, CEO/CTO/CPO
**Stage:** Pre-revenue, seeking Seed/Pre-Series A
**Format:** 90-minute deep dive + 5 reference calls + technical diligence + IC memo

---

> *"Every middleware company in wealthtech tells me the same story: 'We sit on top of everything and make it better.' I've watched four of them die. The question isn't whether the architecture is clean — it's whether anyone will pay for the middle."*
>
> — Elena Voss, Meridian Ventures Partner Meeting, November 2025

---

## Part 1: The Venture Partner

### Who Is Elena Voss

Elena Voss has been investing in fintech infrastructure for four years, but she's been living inside the financial services technology stack for seventeen. Her career arc — McKinsey financial services practice to Envestnet VP Strategy to venture capital — gives her a specific and uncommon vantage point: she understands both the economics of financial advisory firms and the architecture of the systems that serve them.

At McKinsey (2009–2015), Elena spent six years in the financial services practice, focused exclusively on wealth management. She staffed three major engagements that shaped her worldview: a post-merger technology integration for a $30B RIA roll-up (where she learned that CRM migration is where acquisitions go to die), a digital transformation project for a top-10 broker-dealer (where she learned that compliance technology is bought out of fear, not aspiration), and a pricing study for a custodian's technology platform (where she learned that RIAs will pay for pain relief but resist paying for optimization).

She left McKinsey as an Associate Partner in 2015, recruited by Envestnet's CEO to lead corporate strategy and M&A evaluation. At Envestnet (2015–2019), she evaluated over 40 potential acquisitions, completed 6, and killed 34. The kills taught her more than the completions. She learned to spot three patterns that predict failure in wealthtech companies:

1. **The "platform" trap** — companies that try to be everything to everyone, building 20 features at moderate quality instead of 3 features at exceptional quality
2. **The custodian dependency** — companies whose product only works with one custodian, limiting their addressable market to 30-40% of RIAs
3. **The integration tax** — companies that require 60+ days of implementation, creating a sales cycle that kills startups before they reach cash-flow positive

She joined Meridian Ventures in 2022, recruited by the founding partners specifically for her wealthtech operating experience. Meridian's Fund III ($400M, vintage 2023) targets fintech infrastructure — the pipes, not the faces. Elena's portfolio includes four companies relevant to her evaluation of Min:

**ComplianceOS** ($8M Series A, 2023) — automated compliance monitoring for broker-dealers. Elena led the deal. The company is now at $4.2M ARR, growing 85% year-over-year. This investment taught her that compliance technology can scale if (a) the product genuinely reduces examination risk, (b) the buyer is the CCO, not the CEO, and (c) the wedge is narrow enough to close in under 30 days.

**DataMesh** ($12M Series A, 2023) — data infrastructure for wealth management platforms. Elena co-led with a data infrastructure fund. The company aggregates custodial data across Schwab, Fidelity, Pershing, and Altus, normalizing it into a unified API. This investment taught her that multi-custodian data normalization is a 3-year engineering problem, not a 6-month sprint.

**AdvisorAI** ($6M Seed, 2022) — AI-powered meeting preparation and client communication for financial advisors. Elena's only wealthtech loss. The company raised a Seed, built an impressive demo, acquired 12 pilot customers, converted 3 to paying, then ran out of runway in 14 months. **This is the investment that haunts her**, and the one most relevant to her evaluation of Min. AdvisorAI died for three reasons Elena now screens for obsessively:

1. The buyer (the advisor) had no budget authority and no operational pain — they thought the product was "cool" but wouldn't champion it internally
2. The product tried to serve advisors, ops staff, and compliance simultaneously — three buyers with three different value propositions, none strong enough to close independently
3. The founder was a technologist who built a beautiful product but couldn't articulate the economic value in the buyer's language — he sold features, not pain relief

**WealthBridge** ($5M Seed, 2024) — middleware connecting financial planning tools (MoneyGuidePro, eMoney) to CRM and portfolio management systems. Early stage, pre-revenue. Elena led the deal based on the founder's deep domain expertise and a narrow, defensible wedge. This investment is the closest analog to Min in her portfolio.

### Elena's Investment Criteria

Elena evaluates every wealthtech deal against seven dimensions. She assigns each a score from 1 to 5 and requires a minimum weighted average of 3.2 to bring a deal to IC. Her weights reflect lessons from AdvisorAI:

| Dimension | Weight | What She's Looking For |
|-----------|--------|----------------------|
| Buyer clarity | 25% | One buyer, one budget, one pain point. Not "advisors and ops and compliance." |
| Wedge sharpness | 20% | Can the product close its first 10 customers with a single, narrow value proposition? |
| Expansion credibility | 15% | After the wedge, is there a natural path to 3-5x ACV expansion? |
| Technical defensibility | 15% | Is there a technical asset that gets harder to replicate with each customer? |
| Market timing | 10% | Is there a forcing function (regulatory change, platform shift, demographic wave)? |
| Founder-market fit | 10% | Does the founder understand the buyer's world from the inside? |
| Unit economics path | 5% | Can this company reach $100M ARR with <$200M in total capital raised? |

The weights are deliberate. Buyer clarity at 25% is the AdvisorAI lesson: a product can be technically brilliant and still die if no one has the authority and urgency to buy it. Unit economics at 5% reflects her belief that at seed/pre-Series A, the unit economics are theoretical — she'd rather see a founder who deeply understands the buyer than one who has a polished financial model.

### Why She Took the Meeting

Elena's deal flow in wealthtech averages 15-20 inbound pitches per quarter. She takes meetings on roughly 30% of them. Min reached her through two independent channels within the same week:

**Channel 1:** Ryan Marsh, an RIA technology consultant she respects (and who is an LP in Fund III through his family office), sent her a one-line text: *"Just saw something at T3 that reminded me of the DataMesh thesis but for compliance. Solo founder, rough around the edges, but the schema discovery thing is real. Worth 30 minutes."*

**Channel 2:** A compliance officer at one of her portfolio companies forwarded a LinkedIn post from Jon Cambras showing Min's triage queue, with the note: *"This is what we've been trying to build internally for 6 months."*

Two independent signals from credible sources in the same week is Elena's threshold for "this is probably worth investigating." She pulled up Min's website, watched the demo video, and scheduled a 90-minute call with Jon.

Three things interested her before the call:

1. **The compliance wedge** — her ComplianceOS investment proved that compliance technology can be a venture-scale business if the wedge is sharp enough. Min appeared to have a similar wedge: automated compliance monitoring for RIAs, sold to the COO.

2. **The CRM overlay positioning** — Min sits on top of Salesforce rather than replacing it. This is the positioning that WealthBridge uses (on top of planning tools, not replacing them). Elena believes overlay/middleware positioning is structurally correct for wealthtech because RIAs won't rip and replace their CRM, but she also knows it's where four companies in her deal flow have died.

3. **The solo founder building with AI tools** — Elena has seen three solo founders in the past 18 months building products that would have required 5-person teams two years ago. She's increasingly convinced that AI-assisted development changes the venture math for technical founders, but she hasn't yet made an investment that tests this thesis.

What concerned her before the call:

1. **Scope creep** — the website showed 20+ features. This is Pattern #1 from her kill list (the "platform" trap).
2. **Single custodian** — she could tell from the demo that Schwab was the only deeply integrated custodian. This is Pattern #2 (custodian dependency).
3. **Zero customers** — no logos, no case studies, no testimonials. Pre-revenue is fine at seed, but zero customers usually means zero validated demand.

### Her Mental Model for Middleware Failures

Elena has a specific framework she applies to every "middleware for RIAs" pitch. She calls it the "Middleware Mortality Model," and it's built from autopsy reports on four dead companies she evaluated at Envestnet:

**Skience** (evaluated 2017) — attempted to build a unified middleware layer across Salesforce, Redtail, and Junxure. Died because the canonical data model lost too much CRM-specific fidelity. Firms that had invested $200K+ in Salesforce customization found that Skience could only surface 40% of their custom objects. The lesson: *middleware that flattens CRM data into a lowest-common-denominator model will always be rejected by the firms that need it most.*

**ActiFi** (evaluated 2018) — workflow automation that read from CRM but never wrote back. Advisors had to update both ActiFi and Salesforce, doubling their data entry burden. Adoption collapsed within 90 days at every pilot. The lesson: *read-only middleware creates parallel workflows that no one maintains.*

**Two others** (names withheld) — both failed because they required 90+ day implementations, burning through their cash reserves on professional services before achieving product-market fit. The lesson: *if your middleware takes longer to implement than the CRM it sits on top of, you don't have a product — you have a consulting engagement.*

Elena will be specifically testing whether Min avoids these three failure modes:
- Does Min preserve CRM fidelity, or does it flatten data into a generic model?
- Does Min write back to the CRM, or is it read-only?
- Can Min be implemented in under 30 days?

### The AdvisorAI Lesson

AdvisorAI is the ghost in every wealthtech meeting Elena takes. The company had everything that looks good on paper: strong technical founder, genuine AI capabilities (it actually used LLMs for meeting summarization, not keyword matching), positive user feedback during pilots, and a large addressable market.

It died because of three failures that Elena now tests for explicitly:

**Failure 1: The buyer couldn't buy.** Advisors loved the product but had no budget authority. Every deal required CEO or COO approval, turning a self-serve product into an enterprise sale. The sales cycle was 90+ days for a $200/month product. The math never worked.

**Failure 2: The product served three masters.** AdvisorAI tried to be a meeting prep tool (for advisors), a client communication platform (for ops), and a compliance documentation engine (for CCOs). Each persona needed different features, different integrations, different pricing. The roadmap became a political negotiation instead of a product strategy.

**Failure 3: The founder sold technology, not outcomes.** When AdvisorAI's founder presented to a firm, he demonstrated the AI capabilities: "Watch how it summarizes this meeting transcript." The buyer's response was always "That's cool." Cool doesn't close. The founder never learned to say: "Your compliance team spends 12 hours per week producing documentation that AdvisorAI generates in 15 minutes. That's $32,000 per year in labor cost, plus the reduction in examination risk."

Elena will be testing Jon for all three of these failure patterns during the deep dive.

---

## Part 2: The 90-Minute Deep Dive

### Pre-Meeting Notes

*Elena's prep notes, handwritten on a legal pad before the call:*

> Min — Jon Cambras, solo founder/CTPO
>
> Pre-read: T3 booth video, LinkedIn posts (3), Ryan Marsh text, compliance officer forward
>
> Thesis to test: "Compliance-first middleware for RIAs, sold to COO, expand into practice management"
>
> Red flags to probe: 20 features (platform trap?), single custodian, zero customers, solo founder
>
> Time allocation: Market (15 min), Wedge/Expansion (20 min), Defensibility (20 min), Unit Economics/GTM (20 min), Founder (15 min)
>
> Key question: Would I fund this at $8-10M pre, $2-3M raise?

---

### Block 1: Market (15 minutes)

**Elena:** Jon, thanks for making time. I'll be direct about how I use these 90 minutes. I'm going to ask you about twenty questions across five areas. Some of them will feel aggressive — that's not personal, it's how I stress-test every deal. I'd rather find the weak spots now than after I've written a check. Fair?

**Jon:** Absolutely. I'd rather know what the weak spots are too.

**Elena:** Good. Let's start with the market. Define your customer for me. Not the TAM slide — the actual human being who wakes up and decides to buy Min.

**Jon:** The COO at an SEC-registered RIA, typically managing $250 million to a billion in AUM. Firm size is 10 to 30 people, 3 to 8 advisors. The COO is usually the single operational point of failure — she's responsible for compliance monitoring, client onboarding, Salesforce administration, custodian paperwork, and advisor accountability. She doesn't have a team. She is the team.

**Elena:** Why the COO and not the CCO?

**Jon:** Because at firms this size, they're often the same person. The COO title is more common, but the compliance monitoring function always lives with her. At the bigger end of our range — $750 million to a billion — you start seeing a dedicated CCO, and then Min becomes a tool that the COO champions and the CCO validates. But the budget authority is with the COO.

*Elena's internal note: Good. He's identified a single buyer with budget authority. This is the opposite of AdvisorAI's failure. The COO at a $250M-$1B firm has both the pain and the purchasing power. She's not asking anyone's permission to spend $3,000-$5,000 a month on operational tooling.*

**Elena:** How many of these firms exist?

**Jon:** There are approximately 15,000 SEC-registered RIAs in the US. About 4,500 are in the $250M to $1B AUM range. Of those, roughly 60% use Salesforce as their CRM — that's about 2,700 firms. That's my immediate addressable market.

**Elena:** You said 60% use Salesforce. What's your source on that?

**Jon:** T3 survey data, cross-referenced with Kitces research and industry conversations. The actual number may be higher — Salesforce doesn't break out Financial Services Cloud adoption specifically for RIAs, and some firms use Salesforce Enterprise rather than FSC. But I'm comfortable with 2,700 as a floor.

**Elena:** And the other 40%?

**Jon:** Redtail, Wealthbox, and a long tail of smaller CRMs. Redtail is the largest — maybe 20% of the market. Wealthbox is growing fast in the $100M to $500M segment. Those are my second and third CRM adapters. The architecture already supports them — I have a `CRMPort` interface and a factory pattern that resolves the active adapter from an environment variable. Salesforce is the only implemented adapter today, but the abstraction layer is in place.

*Elena's internal note: He knows the architecture supports expansion but hasn't built the adapters. That's honest. The question is whether the canonical data model can handle the differences between Salesforce and Redtail without losing fidelity. That's what killed Skience.*

**Elena:** What's your TAM number?

**Jon:** I think the honest answer is that the TAM depends on which version of Min we're talking about. If Min stays as a Salesforce-only compliance and operations overlay, the TAM is about 2,700 firms at $60,000 ACV, which is roughly $160 million. If Min expands to three CRMs and moves upmarket to include firms over a billion, the addressable market is closer to 8,000 firms, and the TAM approaches $500 million to $700 million depending on ACV assumptions.

**Elena:** Which version are you raising for?

**Jon:** I'm raising for the version that proves the wedge works with Salesforce-first firms and builds the foundation for CRM expansion. I think trying to be all things to all CRMs at seed stage is how companies die.

*Elena's internal note: The right answer. He's not inflating the TAM to make the market look bigger. But I notice he jumped from $60K ACV without justifying it. I need to probe pricing later.*

**Elena [Q4]:** What's the forcing function? Why does this market exist now and not three years ago?

**Jon:** Three things converged. First, the SEC's examination priorities have shifted toward technology governance — the 2024 and 2025 examination priority letters both explicitly call out firms' use of technology for compliance monitoring, which creates regulatory pressure to demonstrate systematic oversight. Second, the RIA M&A wave — over 200 acquisitions per year — creates integration chaos where acquiring firms need to consolidate compliance monitoring across multiple legacy systems. And third, honestly, the AI development tooling that lets a solo founder build a product with 20 screens and 1,400 lines of schema discovery logic that would have required a 5-person team two years ago. The cost to build this product dropped by 80%, which means you can attempt this market at seed scale instead of Series A scale.

*Elena's internal note: The SEC regulatory pressure is real — I've seen it in ComplianceOS's pipeline. The M&A angle is interesting and differentiated. And he's being transparent about using AI coding tools, which I appreciate more than founders who hide it. But "20 screens" — there's the platform trap flag. I need to probe that.*

**Elena's Block 1 Assessment:**

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Market size | 3.5 | $160M in current form is investable but not exciting. $500M+ requires CRM expansion that's unproven. |
| Buyer clarity | 4.5 | Single buyer (COO), clear budget authority, real pain point. Best answer I've heard on buyer identification in 6 months. |
| Timing | 3.5 | SEC pressure is real but not new. M&A angle is differentiated. |
| Founder knowledge | 4.0 | Knows the numbers, doesn't inflate them. |

---

### Block 2: Wedge and Expansion (20 minutes)

**Elena:** You mentioned 20 screens. Walk me through what those are.

**Jon:** Home screen with triage queue, flow screen for onboarding workflows, account onboarding with NIGO prevention, compliance scanning, meeting briefing, client query, practice dashboard, family view, task manager, financial planning, workflow engine, revenue intelligence, documents, client portal, activity feed, audit trail, settings, and then two special-purpose modes — booth mode for conferences and a guided tour for demos.

**Elena:** Jon, I'm going to be blunt. That's a platform, not a wedge. You just described 18 functional screens for a company with zero customers. How do you reconcile that with a wedge-first strategy?

**Jon:** *(pause)* You're right that it looks like a platform. I think the honest answer is that I built a lot of it because the AI coding tools made it fast and because I'm a product person who sees the full picture. But the go-to-market isn't 18 screens. The go-to-market is three capabilities: the morning triage queue, the compliance scan with audit trail, and the NIGO prevention for account openings. Everything else is depth that proves this isn't a one-trick pony — it's a practice intelligence platform that starts with compliance.

**Elena:** How long does it take to demonstrate the wedge?

**Jon:** Seven minutes. I can show the triage queue resolving a real household issue, run a compliance scan that finds real regulatory gaps, and walk through an account opening with NIGO-specific validation — all in seven minutes. At T3, that's what converted people. The compliance scan was the foot-traffic stopper. The NIGO prevention was the moment where COOs said "I need this."

**Elena:** What's the expansion path after the wedge?

**Jon:** The wedge is compliance and operations monitoring. That's the $36,000 to $60,000 ACV entry point. The expansion has three stages. Stage one is deeper compliance: custom compliance checks, firm-specific playbooks, examination readiness kits. That takes the ACV from $60,000 to $80,000 and happens within the first year of a customer relationship. Stage two is practice intelligence: the revenue dashboard, planning integration, workflow automation — that's the stuff that makes the COO's job easier beyond compliance. That takes the ACV to $100,000 to $120,000. Stage three is multi-entity: supporting RIA roll-ups that acquire firms and need to consolidate compliance monitoring across 3 to 5 legacy CRM configurations. That's the $150,000+ ACV and it's where the schema discovery engine becomes genuinely irreplaceable.

*Elena's internal note: The expansion story is credible in structure but untested. He hasn't sold Stage 1, let alone validated Stage 2 or 3. But the M&A/consolidation use case for Schema Discovery is genuinely interesting — I haven't seen another company position for that. Filing that away for the IC memo.*

**Elena:** Let's talk about the compliance scan specifically. One of the reference calls I plan to make is with a compliance expert. Before I do that — describe to me exactly what the compliance engine does and what it doesn't do.

**Jon:** The compliance engine runs 30-plus checks across six categories: identity, suitability, documents, account-specific, regulatory, and firm-specific. Each check looks at a household's tasks, contacts, and financial accounts in Salesforce and determines whether the required compliance action has been taken. It produces a pass, warn, or fail result with the specific regulation cited — Rule 17a-3, FINRA 2090, Reg BI, whatever applies.

What it does: it detects whether a relevant task exists in the CRM that addresses each compliance requirement. It generates audit-ready PDFs with regulatory citations. It provides remediation templates that tell the ops team exactly what to do, who should do it, and how long it should take.

What it doesn't do — and I should be upfront about this — is verify that the task was actually completed satisfactorily. It uses keyword matching to find tasks with relevant subjects. So if there's a task called "Send beneficiary designation form" in the CRM, the check passes. But the engine doesn't know whether that form was actually signed and returned. It's detecting task existence, not document completion.

**Elena:** That's a significant distinction. Has anyone tested this in a way that would find false positives?

**Jon:** Yes. I had an independent compliance expert — 18 years evaluating compliance technology, former FINRA examiner — do a deep-dive assessment. He found exactly this issue and called it "the false-pass problem." A task with subject "Send beneficiary form" in "Not Started" status passes the beneficiary check because the keyword "beneficiar" is found. His assessment was that the detection is adequate for flagging and inadequate for certifying. He graded the overall system B-plus and said implementing status-aware matching would move it to A-minus.

*Elena's internal note: This is the moment that changed my assessment of Jon. Most founders at this stage would have said "our compliance engine is comprehensive and accurate." He volunteered the limitation, cited the independent assessment, and described the fix. That's founder honesty at a level I rarely see. The false-pass problem is real, but it's a code fix, not an architectural flaw. I'm giving him significant credit for this.*

**Elena:** What's the fix?

**Jon:** Status-aware matching. Instead of just checking whether a task with the right keywords exists, the engine would also check whether the task status is in a configurable "completed" list — "Completed," "Signed," "Approved," whatever the firm uses. The expert recommended dual-status reporting: a task that exists but isn't complete would show "PENDING" instead of "PASS." The code change is in the `hasTask` function in `compliance-engine.ts`. It's a targeted fix, not an architectural rework.

**Elena:** Why haven't you shipped it?

**Jon:** *(pause)* Prioritization. I've been focused on schema discovery and the CRM abstraction layer because those are the foundational technical assets. The false-pass fix is important, but it's a feature improvement, not a new capability. I should have shipped it already. That's fair criticism.

*Elena's internal note: The pause was real. He didn't have a polished answer. He just admitted he deprioritized a compliance fix for a compliance product. That's a yellow flag, but a minor one — it tells me he's an architect first and a product manager second. Fixable with the right hire.*

**Elena:** Tell me about the schema discovery engine. Ryan Marsh called it "the real thing." What is it?

**Jon:** Schema discovery is the technical moat. When Min connects to a Salesforce org, it makes 7 to 8 API calls to read the org's metadata — object catalog, field definitions, record types, managed packages, active flows, validation rules, record counts. It then classifies the org's structure: Does it use Financial Services Cloud? Practifi? XLR8? Is it using Account record types for households, or a custom object? How are contacts related to households?

The engine produces a confidence score. If confidence is above 0.70, Min auto-maps the org and proceeds. If confidence is below 0.70, it presents a manual mapping interface where the COO can tell Min which objects represent households, where AUM lives, and how contacts are grouped.

This matters because every Salesforce org in the RIA space is different. A firm that bought FSC out of the box looks nothing like a firm that's been on Salesforce Enterprise for 10 years with custom objects built by Accelerize360. The schema discovery engine is 1,439 lines of code that handles this variation automatically.

**Elena:** How many unique org configurations has it been tested against?

**Jon:** *(pause)* I've tested it against my demo org, two partner orgs from the T3 conference follow-ups, and synthetic configurations that simulate FSC, Practifi, XLR8, and standard Salesforce Enterprise setups. The honest answer is probably 5 to 7 real orgs and another 8 to 10 synthetic configurations.

**Elena:** So fewer than 10 real orgs.

**Jon:** Fewer than 10 real orgs, yes.

*Elena's internal note: This is where the "pre-revenue" reality hits. The schema discovery engine is architecturally impressive — 1,439 lines of classification logic with confidence scoring and managed package detection. But it's been tested against fewer than 10 real orgs. At DataMesh, their data normalization engine didn't stabilize until they'd processed 50+ unique configurations. Schema discovery is the moat, but the moat hasn't been stress-tested.*

**Elena's Block 2 Assessment:**

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Wedge sharpness | 3.5 | The compliance scan is sharp. The 20-screen surface area dilutes the story. |
| Expansion credibility | 3.0 | Logical but entirely untested. The M&A consolidation use case is the most interesting expansion path. |
| Product honesty | 5.0 | Volunteered the false-pass problem unprompted. Best founder transparency I've seen in 12 months. |
| Schema discovery moat | 4.0 | Architecturally impressive. Needs 50+ real orgs to prove it generalizes. |

---

### Block 3: Defensibility (20 minutes)

**Elena:** Let's talk about what's defensible. If I fund Min and 18 months from now Salesforce launches an Agentforce capability that does compliance monitoring for RIAs — what happens?

**Jon:** Salesforce won't build what Min builds, and here's why. Salesforce's business model is to sell platform and let ISVs build vertical solutions. Financial Services Cloud is a data model, not a compliance engine. Agentforce is a horizontal AI orchestration layer — it'll generate reports, summarize records, maybe trigger flows. But it won't encode that Schwab requires a W-9 within 30 days of account opening and that missing the Roth IRA MAGI threshold for a joint filer requires a recharacterization workflow. That level of custodian-specific, regulation-specific operational knowledge isn't what Salesforce builds. They build platforms. We build the intelligence layer on top.

**Elena:** I have a Salesforce expert in my reference call list. She spent five years on the FSC team. You're telling me her former team won't build this?

**Jon:** I'm saying they haven't in 10 years of FSC existing, and their incentive structure doesn't reward it. Salesforce makes money when firms hire consultants to customize FSC. A product that auto-discovers org configurations and removes the need for 60-day implementations actively cannibalizes Salesforce's consulting ecosystem. The partner channel would revolt.

*Elena's internal note: This is a strong structural argument. It's the same argument DataMesh makes about custodians not building their own data normalization. The incentive misalignment between Salesforce's platform business and a vertical compliance product is real. But "they haven't done it in 10 years" is not the same as "they won't do it." Agentforce changes the equation. I'll probe Megan Calloway on this specifically.*

**Elena:** What about Practifi?

**Jon:** Practifi is a full CRM replacement built on the Salesforce platform. They're going after the same firms but with a different proposition: "Replace your Salesforce configuration with ours." Their implementation takes 3 to 6 months and costs $80 to $120 per user per month. Min sits on top of whatever you already have and adds intelligence in under 30 days. We're complementary, not competitive — a firm running Practifi could also run Min for the compliance and triage capabilities that Practifi doesn't provide. The schema discovery engine actually detects Practifi managed packages and adapts to their object model.

**Elena:** And Nitrogen? SmartRIA?

**Jon:** Nitrogen is portfolio risk analytics — they're measuring investment risk, not operational compliance. Different buyer, different budget, minimal overlap. SmartRIA is the closest competitor: compliance calendar and workflow management for RIAs. But SmartRIA is a standalone system — it doesn't read from your CRM, doesn't know your household structure, doesn't see your tasks. It's a separate compliance application that ops staff have to maintain in parallel. Min operates on your existing data. That's the fundamental difference.

**Elena:** What prevents a well-funded competitor from replicating Min's compliance engine in six months?

**Jon:** Three things. First, the custodian knowledge base. Min encodes 24 account-type definitions across 3 custodians, 96 required documents, 48 conditional documents, and 72 NIGO risks with specific prevention strategies. That's not code — it's operational knowledge that takes years of custodian-specific experience to accumulate. Each custodian changes their forms and requirements quarterly. Maintaining it is a moat in itself.

Second, the schema discovery engine. 1,439 lines of heuristic classification logic that handles FSC, Practifi, XLR8, Wealthbox Sync, standard Account RecordTypes, unrestricted picklist values, account hierarchies, and custom objects. A competitor would need to encounter the same variety of org configurations to build the same heuristics. That requires customer diversity, which requires time.

Third — and this is the one I think matters most long-term — the mapping data. Every time Min connects to a new org and either auto-classifies it or receives a manual mapping, that mapping becomes training data for improving the classification heuristics. After 100 orgs, our classification accuracy should be significantly higher than any new entrant. After 500 orgs, it should be nearly unassailable. It's a data network effect that compounds with each customer.

*Elena's internal note: The data network effect argument is the strongest defensibility claim. It's the same pattern that made Plaid defensible — each bank integration improved the categorization model for all other banks. But it requires reaching critical mass (100+ orgs) before the effect kicks in. With zero customers today, the moat is theoretical. The custodian knowledge base is real and immediate, but it's a content moat, not a technical moat. Any well-funded competitor with a former custodian operations VP could replicate it in 6 months. The schema discovery engine is the genuine technical asset.*

**Elena:** Let's talk about the custodian depth gap. My understanding is that your custodian rules are comprehensive for Schwab but significantly thinner for Fidelity and Pershing. True?

**Jon:** *(longer pause)* That's true. Schwab has full NIGO rules, field-level validation, and conditional document logic. Fidelity and Pershing have account-type structures and basic document requirements, but the actual NIGO rejection rules and field-level requirements are Schwab-depth only. The reason is that I built the Schwab rules from direct operational experience and custodian documentation. Fidelity and Pershing require the same depth of primary-source research, and I haven't completed that work.

**Elena:** So when you tell a COO that Min supports three custodians, what does "supports" mean for Fidelity?

**Jon:** It means Min knows the account types, knows the required documents at a category level, and can flag missing items. It doesn't mean Min knows that Fidelity requires spousal consent for community property states on joint IRAs, or that Fidelity's specific ACAT transfer form has different fields than Schwab's. That level of depth is Schwab-only today.

**Elena:** Has anyone discovered this gap during a demo?

**Jon:** Yes. My enterprise sales assessment identified it explicitly. The evaluator said "trust evaporates" when a sophisticated buyer discovers the depth discrepancy. She recommended I either bring Fidelity to parity before selling to multi-custodian firms, or be explicit upfront that Min is Schwab-first.

*Elena's internal note: Second moment of radical transparency. He's telling me that his sales advisor said "trust evaporates." Most founders would spin this as "we support three custodians with Schwab as the deepest integration." The honesty is a positive founder signal, but the gap itself is a real go-to-market constraint. If 70% of $500M+ firms use multiple custodians (Megan Calloway's data), then single-custodian depth limits Min to the lower end of the market.*

**Elena:** You mentioned that the CRM architecture is designed to support Wealthbox and Redtail. Walk me through exactly how far along those adapters are.

**Jon:** The architecture is ready. I have a `CRMPort` interface in `port.ts` that defines the full contract: search contacts, search households, get household detail, create tasks, batch operations, workflow queries. I have canonical types in `types.ts` — `CRMContact`, `CRMHousehold`, `CRMTask`, `CRMFinancialAccount` — that are CRM-agnostic. The factory in `factory.ts` resolves the active adapter from an environment variable. The Salesforce adapter is the only implemented adapter. Wealthbox and Redtail are commented out in the factory's switch statement — literally `// case "wealthbox":` with the adapter class referenced but not built.

**Elena:** How long to build the Wealthbox adapter?

**Jon:** With the architecture in place and the canonical types defined, the adapter itself is probably 2 to 3 weeks of focused work. The harder part is ensuring the canonical type mapping preserves enough CRM-specific fidelity to be useful. Wealthbox's data model is simpler than Salesforce — no record types, no managed packages, no custom objects. So the mapping is actually easier. But the schema discovery engine would need a Wealthbox-specific version, which is a month of work.

**Elena:** And Redtail?

**Jon:** Redtail is harder. Their API is older, rate-limited, and less well-documented. The adapter is probably 4 to 6 weeks. And Redtail firms tend to be smaller — $50M to $200M AUM — which changes the pricing model. I'd want to validate demand before investing 6 weeks of engineering time.

*Elena's internal note: The architecture for CRM expansion is correctly designed. The canonical types are clean. But the work isn't done, and the timeline estimates are solo-founder estimates — multiply by 1.5x for reality. Wealthbox in 6 weeks, Redtail in 9 weeks. That's the first half of the year gone on CRM expansion alone, with no time for the compliance engine improvements that the expert review identified as critical. This is the solo-founder resource constraint manifesting.*

**Elena's Block 3 Assessment:**

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Salesforce competitive risk | 3.5 | Structural argument is sound. Agentforce is a 24-month wildcard, not an 18-month threat. |
| Technical moat (current) | 3.0 | Schema discovery is real IP. But <10 real orgs tested. Moat is theoretical until 100+ orgs. |
| Technical moat (projected) | 4.5 | If data network effect materializes, this becomes genuinely defensible at scale. |
| Custodian depth | 2.5 | Schwab-only depth is a meaningful GTM constraint for the target market. |
| CRM expansion readiness | 3.0 | Architecture is correct. Implementation is 4-6 months of solo-founder time. |

---

### Block 4: Unit Economics and GTM (20 minutes)

**Elena:** Talk to me about pricing. What do you charge?

**Jon:** I haven't started charging yet. I have two pricing models I'm evaluating. The first is per-user, at $39 to $49 per user per month, which is where two independent advisors told me the market would bear. The second is per-firm, tiered by AUM: $3,000 per month for firms under $300M, $5,000 for $300M to $750M, $8,000 for $750M to $2B, and $12,000 for over $2B.

**Elena:** Which model are you leaning toward?

**Jon:** Per-firm. My enterprise sales advisor was emphatic about this: "Don't price per user. Per-user pricing punishes the exact behavior you want, which is broad adoption across the firm." The COO needs advisors to use Min for the health scores and briefings to be meaningful. If every additional user costs $49 per month, the COO will restrict access to save budget, which undermines the product's value.

**Elena:** What's your target ACV?

**Jon:** $60,000 for the $300M to $750M segment, which is the sweet spot. That's $5,000 per month. The buyer's math works because a COO at a $500M firm spends approximately $32,000 to $34,000 per year in quantifiable labor on the tasks Min automates — morning triage, compliance monitoring, examination prep, NIGO prevention. Add a compliance risk premium for reducing examination exposure, and the total pain is $50,000 to $75,000 per year. At $60,000, Min costs less than the pain.

*Elena's internal note: The pricing logic is sound but theoretical. He's pricing against pain he's identified but hasn't validated with a paying customer. The buyer's math works in the spreadsheet — $60K < $75K of quantified pain — but the buyer's behavior may not follow the buyer's math. At AdvisorAI, the pain was also quantifiable, but the behavior was "that's nice, we'll think about it." I need to hear from a real COO whether she'd write this check.*

**Elena:** How do you acquire customers?

**Jon:** Three channels. First, conferences — T3, the Kitces Platform conference, the Schwab IMPACT conference. I've done one conference (T3) and the conversion was strong: 50% qualified-lead rate from booth traffic, 3 hot leads, and 1 technology consultant who's now referring me to firms. The estimated CAC from conferences is $7,000 to $10,000 per customer, which works at a $60,000 ACV.

Second, consultant partnerships. The RIA technology consultant channel is how 40% of wealthtech purchases happen. Consultants like Ryan Marsh, who saw Min at T3, influence buying decisions at 20 to 50 firms. One consultant relationship equals 3 to 5 referrals per year. The economics require a referral fee — 12% of first-year revenue — which I'm prepared to offer.

Third, content marketing and LinkedIn. My LinkedIn posts about Min have generated inbound interest from 4 COOs, one of whom pre-sold herself on the product before coming to the T3 booth. This is a low-CAC channel that builds over time but doesn't scale predictably.

**Elena:** What's your sales cycle?

**Jon:** I believe it can be 30 days or less. The demo is 7 minutes. The pilot is a Salesforce connection — read-only initially — that takes 10 minutes to set up. The pilot period is 30 days. If the COO sees value in the first week, the close happens in week 3 or 4. If she doesn't see value in the first week, she won't see it in week 12.

**Elena:** "I believe it can be" — that's a belief, not data. Have you completed a single sales cycle?

**Jon:** No. I have not completed a sales cycle. I have 3 qualified leads from T3 and 1 pre-sold COO, but none of them have gone through a full evaluate-pilot-close cycle. I don't have data on sales cycle length, conversion rate, or churn. That's one of the things I need the funding to test.

*Elena's internal note: This is the fundamental pre-revenue challenge. Everything about the GTM is logical but unvalidated. The pricing makes mathematical sense. The channels are the right channels. The sales cycle hypothesis is reasonable. But there are zero data points. I've seen this exact same quality of GTM thinking in AdvisorAI's pitch deck, and AdvisorAI still died.*

*The difference — and this is what I keep coming back to — is the buyer. AdvisorAI's buyer was the advisor (aspiration, no authority). Min's buyer is the COO (pain, authority). The COO is the best buyer in an RIA. She has budget, she has pain, and she has the authority to make decisions without committee approval. That's the structural advantage that might make Min's unvalidated GTM work where AdvisorAI's didn't.*

**Elena:** What does the first year look like financially? Give me the honest version, not the pitch deck version.

**Jon:** The honest version: I close 5 to 8 customers in the first 12 months. Average ACV of $48,000 — lower than the $60,000 target because early customers will negotiate hard and I need reference logos more than I need revenue optimization. That's $240,000 to $384,000 in first-year ARR. My burn rate as a solo founder is roughly $15,000 per month — I'm not paying myself market rate, I'm covering tools, infrastructure, and one conference per quarter. So I need $180,000 in operating capital for 12 months. With a $2 million raise, I have 18 months of runway before I need to add an engineer, and the $15,000 to $20,000 per month burn gives me time to find product-market fit without the pressure of a high burn rate.

**Elena:** When does the first hire happen?

**Jon:** Month 6. A senior engineer who takes over schema discovery edge cases, CRM adapter development, and customer onboarding while I focus on sales, product strategy, and compliance engine improvements. Salary target is $130,000 to $160,000 with meaningful equity. This hire needs to be someone who can work autonomously — I won't have time to manage them closely.

**Elena:** That's one engineer at month 6. When does the team reach 5?

**Jon:** End of year 2. By then I should have 20 to 30 customers and enough revenue to justify two more engineers and a head of customer success. The fifth person is either a second ops person or a designer, depending on what the product needs at that point.

*Elena's internal note: The financial plan is sane for a solo founder. $15K/month burn is responsible. The first hire at month 6 is the right timing — he needs revenue validation before committing to a senior salary. The risk is that month 6 arrives, he has 3 customers instead of 5-8, and the hire gets delayed, which delays CRM expansion, which delays the market expansion, which delays the Series A metrics. It's the classic chicken-and-egg for solo founders.*

**Elena's Block 4 Assessment:**

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Pricing logic | 4.0 | Per-firm tiered pricing is correct. Math works at $60K ACV against $75K of pain. |
| GTM credibility | 2.5 | Right channels, right buyer, zero data. Everything is hypothesis. |
| First-year plan | 3.5 | Conservative and honest. 5-8 customers is achievable if the product converts. |
| Unit economics path | 3.0 | Works on paper at 100 customers. Getting to 100 requires CRM expansion that's 12-18 months out. |

---

### Block 5: Founder (15 minutes)

**Elena:** Last block. Tell me about yourself. Not your resume — tell me why you're building this.

**Jon:** I spent years in the RIA space, mostly on the technology side — building, configuring, integrating the systems that advisory firms run on. The thing that always frustrated me was that the COO is the most important operational person in an RIA, and she has the worst tools. The advisors get beautiful portfolio management software and planning tools. The COO gets Salesforce reports and Excel spreadsheets. The gap between the sophistication of the advisory function and the primitiveness of the operations function is absurd. That's what I'm building for — giving the COO an intelligence layer that matches the quality of the tools her advisors use.

**Elena:** Why you? What makes you the right person to build this?

**Jon:** I understand the buyer's world because I lived in it. I know what a morning looks like when you open Salesforce and try to figure out which of 140 households need attention today. I know what it feels like to prepare for an SEC examination by pulling task records one at a time. And I'm a builder — I can ship product fast because I understand the domain deeply enough to make good architectural decisions without a product manager or domain expert translating for me.

The trade-off is that I'm not a salesperson. I'm a product builder who can sell, not a salesperson who can build. I think that's the right founder profile for the first 12 months, when the product needs to be exceptional to compensate for the lack of brand, references, and sales process. After 12 months, I need a VP of Sales or a Head of Customer Success who can build the repeatable motion.

*Elena's internal note: He's self-aware about the sales gap. That's good. But "I can sell" and "I have sold" are different statements. The T3 conference performance suggests he can connect with buyers — Ryan Marsh, a very skeptical audience, gave him an A+ rating. The question is whether he can close. Conference demos and enterprise sales are different skills.*

**Elena:** You're building this with AI coding tools. What does that mean concretely?

**Jon:** I use AI-assisted coding tools — Claude Code, primarily — for about 70% of my development work. The AI handles implementation: translating architectural decisions into code, writing boilerplate, generating test files, building UI components. I handle the architecture, the domain knowledge, and the product decisions. The schema discovery engine, for example — the architectural decisions (what metadata to fetch, how to classify org types, what confidence thresholds to use) are mine. The implementation of those decisions (the actual TypeScript code, the API call patterns, the type definitions) was AI-assisted.

This means I can ship at 3 to 5x the velocity of a traditional solo developer. The 20 screens, 1,439 lines of schema discovery, 30+ compliance checks, the custodian knowledge base — a traditional team would need 3 to 4 engineers working for 6 months. I built it in a fraction of that time.

**Elena:** What's the risk of that velocity?

**Jon:** Two risks. First, code consistency — when AI writes code, it doesn't always remember the conventions from a different file. I spend 20% of my time on code review and architectural coherence. Second, the bus factor. I'm the only person who understands the full system. The AI can help a new engineer ramp up faster than they would with traditional code, but there's still a meaningful knowledge transfer challenge when I make my first hire.

**Elena:** If Min fails, why will it have failed?

**Jon:** *(long pause)* Because I couldn't close. Not because the product was wrong or the market didn't exist, but because I couldn't convert the interest into revenue fast enough. The COO would see the demo, love it, and then... not buy. Because she's busy. Because she doesn't have a procurement process for a $60,000 product. Because she needs to convince her CEO and doesn't have the internal selling skills. The product would be right, the market would be right, and the sales motion would be wrong. That's how Min fails.

*Elena's internal note: This is the most important answer of the entire meeting. He didn't say "because Salesforce killed us" or "because we ran out of money" or "because the compliance regulations changed." He said "because I couldn't close." He understands that the risk is on the demand side, not the supply side. He understands that building the product is the easy part. And he's scared of the right thing.*

*This is the opposite of AdvisorAI's founder, who believed to the end that the product was perfect and the market just needed to catch up. Jon knows the product has gaps (false-pass problem, Fidelity depth, zero customers). He knows the market is unvalidated. And he knows his biggest personal weakness is closing.*

*That level of self-awareness is either the sign of a founder who will adapt and survive, or a founder who is too realistic to have the irrational conviction required to push through the valley of death. I've seen both patterns. I can't tell which one Jon is yet.*

**Elena:** Last question. What do you need from me that isn't money?

**Jon:** *(immediate, not rehearsed)* I need you to tell me when I'm wrong. About pricing, about positioning, about which feature to build next. I've been building this alone, and the danger of building alone is that you optimize for what you think is important rather than what the market tells you is important. I need an investor who's seen how these businesses succeed and fail, who will call me when I'm heading toward Pattern #1 or Pattern #2 or Pattern #3 on your kill list, and who will make introductions to COOs who will say yes or no in 30 days instead of "let me think about it" for 90.

*Elena's internal note: He asked for governance, not connections. He asked for accountability, not brand. That's a mature founder answer. But it's also the answer of a founder who knows he needs help. At AdvisorAI, the founder asked for money and introductions. Jon is asking for judgment. I like it, but I want to validate it against the reference calls before I give it too much weight.*

**Elena's Block 5 Assessment:**

| Criterion | Score (1-5) | Notes |
|-----------|-------------|-------|
| Founder-market fit | 4.0 | Deep domain knowledge. Understands the buyer's world from the inside. |
| Self-awareness | 5.0 | Best I've seen. Knows exactly where his gaps are. |
| Builder capability | 4.5 | AI-assisted velocity is real. 20 screens as a solo founder is remarkable output. |
| Closing ability | 2.0 | Unproven. Conference demos ≠ enterprise sales. The critical unknown. |
| Coachability | 4.5 | Asked for judgment, not money. Strong signal but needs validation. |

---

### Post-Meeting Aggregate Score

| Block | Weight | Score | Weighted |
|-------|--------|-------|----------|
| Market | 20% | 3.6 | 0.72 |
| Wedge/Expansion | 25% | 3.6 | 0.90 |
| Defensibility | 20% | 3.4 | 0.68 |
| Unit Economics/GTM | 20% | 3.3 | 0.66 |
| Founder | 15% | 4.0 | 0.60 |
| **Total** | **100%** | | **3.56** |

*Elena's IC threshold is 3.2. Min clears it at 3.56. She moves to reference calls.*

*Her handwritten note at the bottom of the legal pad: "He knows what he doesn't know. That's either the strongest signal or the most dangerous one. Reference calls will decide."*

---

## Part 3: Reference Calls

*Elena conducts five reference calls over four days following the deep dive. She records and transcribes each call. Below are the transcripts with her annotations.*

### Reference Call 1: Sarah Kendrick — COO, Ridgeline Wealth Partners

**Context:** Sarah participated in the most comprehensive product evaluation (Evaluation #1). Her firm is $1.08B AUM, SEC-registered, Nashville, 15 headcount. She used Min against her actual Salesforce org in a supervised evaluation and produced the most detailed assessment of Min's operational capabilities. Elena found her through Jon's reference list.

**Duration:** 34 minutes

---

**Elena:** Sarah, thanks for taking the time. I'm evaluating Min for a potential investment. I understand you participated in a product evaluation — can you tell me about that experience?

**Sarah:** Sure. I spent a full day with Min connected to my Salesforce org. Real data, real households, real compliance issues. Not a demo environment. I tested the morning dashboard, the compliance scan, the household resolution workflow, the account opening with NIGO prevention, and the batch compliance scan across all 47 of our active households.

**Elena:** What was your overall impression?

**Sarah:** I'll give you the same answer I gave my CEO: "I could not go back to not having this." But that comes with a big asterisk. Min is the best read-only intelligence layer I've ever seen for an RIA. It's not a replacement for Salesforce or Schwab or SmartRIA — it's an overlay that tells me what those systems can't: which clients are at risk and why, with the specific regulatory citation.

**Elena:** What specifically did it do that your current tools don't?

**Sarah:** Three things. First, my morning routine. I spend — spent — 40 minutes every morning assembling a spreadsheet of what needs attention across 140 households. I cross-reference Salesforce reports, Schwab alerts, my email, and a running task list. Min replaced that with a 2-second dashboard load that showed me everything triaged by urgency. In the evaluation, it found an O'Brien household issue — unsigned advisory agreement, 12 days overdue — and I resolved it in 90 seconds. Search, see the problem, create the remediation task, push it back to Salesforce. That's a workflow that normally takes me 7 minutes per household, and I do it 15 times a day.

Second, the compliance scan found 6 critical failures I didn't know about. Two of them were households where beneficiary designations were never updated after a spouse died. That's not a paperwork issue — that's a potential lawsuit. Min flagged it because it has the regulatory logic to know that a beneficiary review is required after a life event.

Third, the audit-ready PDFs. My compliance consultant charges $400 an hour to produce the kind of documentation Min generated in 10 minutes. Formatted with regulatory citations, pass/fail breakdowns, attestation blocks. When we did our SEC examination prep, the work that would have taken me two weeks took one morning.

**Elena:** Would you pay for this?

**Sarah:** *(pause)* Yes, but not at the price I think Jon wants. I'd pay $3,000 a month, maybe $3,500. At $5,000 a month, I'd need to convince David — my CEO — and David would ask for a 90-day pilot first. At $5,000 a month, I'd also expect it to do things it doesn't do yet. I'd expect multi-custodian support — we're adding Fidelity next quarter. I'd expect alert management — snooze, dismiss, contextual overrides. And I'd expect a Salesforce Lightning embed so my advisors can see their own compliance scores without opening a separate application.

**Elena:** What are Min's biggest weaknesses?

**Sarah:** Alert fatigue is the biggest operational risk. In the evaluation, the triage queue surfaced everything at the same priority level. If I can't manage the noise — snooze a known issue for 30 days, dismiss something with a reason, escalate something to an advisor — the dashboard becomes useless within a month. Jon knows this. It was item #1 on my prioritized punch list.

The other major gap is that Min is read-only for compliance. I can see the issues, I can create tasks in Salesforce from Min, but I can't close the loop inside Min. The resolution happens in Salesforce, and Min doesn't know whether the resolution actually occurred. The compliance expert's "false-pass problem" — I don't know the technical details, but operationally, that's the same issue I feel. Min tells me things need attention. It doesn't tell me whether they've been addressed.

**Elena:** If Jon came to you and said "I need a 90-day pilot customer, no charge," would you do it?

**Sarah:** Yes. Tomorrow. With one condition — he gives me a written commitment on what happens to my data if the company folds. SOC 2 report or equivalent. If Min disappears in 18 months, I need to know my Salesforce data is untouched and my audit trail is exportable.

**Elena:** Last question — would you introduce Min to other COOs you know?

**Sarah:** *(immediate)* I already have two in mind. Dani Prescott at Alder Wealth and Christine Moore at Bridgeway Partners. Both are in the same boat I'm in — COOs drowning in operational overhead with no good tools. But I wouldn't make the introduction until I've done a 30-day pilot on my own org. I won't put my name behind something I haven't used in production.

*Elena's annotation: Sarah is the dream first customer. She has the pain ($40K+ in quantifiable labor), the authority (direct budget control up to $36K, CEO approval above that), and the willingness to champion (already has 2 referral targets). The price sensitivity is real — $3,000-$3,500 vs Jon's $5,000 target. That delta matters. The SOC 2 requirement is the same ask as the SEC examiner's vendor due diligence finding. Two independent signals pointing to the same gap.*

*Key signal: "Yes. Tomorrow." That's unambiguous demand. But she's paying $3,000, not $5,000. And she wants a pilot, not a purchase. This is a $36K-$42K ACV customer, not a $60K ACV customer.*

*Additional context from the call (post-main transcript):*

**Elena:** What are you using today for compliance monitoring?

**Sarah:** SmartRIA for the compliance calendar — $500 a month. An Excel spreadsheet that I update manually every Monday for household-level compliance tracking. And my memory, which is the most unreliable system of all. The spreadsheet takes me about 3 hours a week to maintain. SmartRIA tells me when annual reviews are due, but it doesn't know about my households, doesn't read my Salesforce data, and doesn't generate the kind of documentation that Min produces.

**Elena:** So your total spend on compliance monitoring tools is about $6,000 a year, plus 150 hours of labor at — what's your loaded cost?

**Sarah:** *(laughs)* I don't bill internally, but if I'm being honest, my loaded cost is probably $85 an hour. So that's about $12,750 in labor plus $6,000 in tools. Call it $19,000 a year. If Min replaces both the spreadsheet and SmartRIA, the direct ROI at $36,000 a year is about 1.9x. If you add the compliance risk reduction — what it would cost me if an SEC examiner found the two beneficiary gaps that Min caught — the ROI is much higher. Those gaps could have been a deficiency finding, which could have been a fine, which could have been a PR problem. The insurance value is real, even if it's hard to quantify.

**Elena:** Would David — your CEO — understand that math?

**Sarah:** David understands two things: revenue and risk. If I show him that Min caught two beneficiary gaps that could have resulted in an SEC finding, he'll sign the check at $3,000 a month without blinking. At $5,000 a month, he'll want to see it work for 90 days first. It's not the math — it's the confidence. David doesn't trust new vendors until he sees them work.

*Elena's additional annotation: The buyer's math works at $36K/year. The ROI is clear: $19K in direct labor and tool savings, plus compliance risk reduction that's worth $10K-$20K/year in examination exposure. David's 90-day pilot requirement at $5K/month is a negotiation signal, not a rejection. The play for Jon is to offer a 90-day pilot at $3,000/month, then upsell to $5,000/month at renewal once the product has proven its value and Sarah can show David the SEC examination prep result.*

---

### Reference Call 2: Megan Calloway — Principal, Calloway Advisory Technology (Salesforce/FSC Expert)

**Context:** Megan is the Salesforce Financial Services Cloud expert who conducted Evaluation #3 — the most technically rigorous assessment of Min's architecture. She spent 5 years on the Salesforce FSC team, then 3 years implementing FSC at Silverline (34 implementations), and is now an independent consultant who evaluates and recommends RIA technology. She's the closest thing to a CTO-level technical reference for a Salesforce-based product.

**Duration:** 28 minutes

---

**Elena:** Megan, I'm told you did the most thorough technical evaluation of Min's architecture. I'd love your candid assessment.

**Megan:** I'll be direct. Min has the right architecture. The CRM abstraction layer — the `CRMPort` interface with canonical types and a factory pattern — is the correct design for a CRM-agnostic product. Most companies in this space either hard-code Salesforce APIs throughout the stack (creating a spaghetti mess when they try to add a second CRM) or they build such a generic abstraction that it loses all CRM-specific fidelity. Min threads the needle: the canonical types are expressive enough to capture household structures, task workflows, and financial accounts, while the adapter pattern preserves the ability to map CRM-specific fields.

But the architecture being right doesn't mean the product is ready. Let me tell you three things.

**Elena:** Please.

**Megan:** First — and this is the thing I'd want a VC to hear — the schema discovery engine is genuinely novel. I've evaluated probably 30 Salesforce ISV products in my career, and Min is the first one that auto-discovers the org's configuration instead of requiring a 60-day implementation. It detects FSC, Practifi, XLR8, managed packages, account record types, unrestricted picklist values, even custom household objects. It has a confidence threshold of 0.70, and when confidence is low, it falls back to manual mapping. This is the technical asset that makes Min different from every other middleware company in the space.

Second — the single-custodian depth gap is not a bug, it's a strategic risk. Min's custodian rules for Schwab are the deepest I've seen outside of Schwab's own tooling. Twenty-four account types, 96 required documents, NIGO risks with prevention strategies. For Fidelity and Pershing, it's the structure without the depth. When I asked Jon about this, he was transparent — Schwab is from direct operational experience, the others need the same primary-source research. That's honest, but it means Min is a Schwab-first product selling into a multi-custodian market. Seventy percent of RIAs with $500M-plus AUM use two or more custodians. That limits Min's addressable market until Fidelity reaches parity.

Third — this is the one that concerns me most as a potential technical reference — the SOQL query patterns are not production-ready for scale. Min doesn't use bulk query patterns, composite requests, or cursor-based pagination. At 10 customers, this won't matter. At 100 customers with large Salesforce orgs, Min will hit the 100,000-API-call daily limit. The schema discovery engine alone makes 7-8 API calls per org. When you add ongoing data synchronization, task creation, and compliance scanning, a single active customer could generate 200-500 API calls per day. At 100 customers, that's potentially 50,000 API calls daily from Min's Salesforce Connected App. That's manageable, but it requires optimization work that hasn't been done.

**Elena:** Salesforce Agentforce — how real is the competitive threat?

**Megan:** I was on the FSC team until 2021, so I know how Salesforce product development works. Agentforce is a horizontal AI platform — it'll do report generation, natural language queries, maybe automated flow triggers. It will not encode that a Schwab IRA beneficiary change form requires the medallion signature guarantee for designations over $100K. That level of vertical operational knowledge is what ISVs build, not what Salesforce builds. The threat is real at 24-36 months if Salesforce decides to build a vertical compliance agent specifically for wealth management. But that would be a 2-year development cycle at Salesforce, and they'd need to hire people who understand the custodial operations that Min already encodes.

My honest assessment: Min has an 18-24 month window before Agentforce becomes a meaningful competitive factor. If Min has 100+ customers and a working Wealthbox adapter by then, Salesforce becomes a distribution partner, not a competitor. If Min is still at 20 customers on Salesforce-only, Agentforce eats it alive.

**Elena:** Would you refer your clients to Min?

**Megan:** Today? Only to single-custodian Schwab firms with standard-to-moderate Salesforce customization. That's maybe 30% of my client base. If Min ships the Wealthbox adapter and brings Fidelity to Schwab-depth parity, I'd refer 60% of my clients. The remaining 40% are large firms with $300K+ in Salesforce customization who need Practifi, not Min.

The condition for any referral: I need a partnership structure. If Min cuts me out of the value chain — if a COO I refer goes directly to Min and I don't see a referral fee or implementation engagement — I'll recommend Practifi instead. This is the consulting channel reality that every wealthtech startup has to navigate.

**Elena:** What's your 12-month prediction for Min?

**Megan:** If Jon ships the false-pass fix, brings Fidelity to Schwab depth, and maintains the schema discovery engine's heuristics quarterly, Min will be the most important new product in the RIA compliance space in 2026. If he tries to build all 20 features to production quality with one person, he'll build a demo that impresses at conferences and disappoints in production. Focus is the difference between a B+ product that sells and an A- product that doesn't ship.

*Elena's annotation: Megan is the most technically credible voice in my reference set. Her assessment aligns with my deep-dive findings: architecture is correct, schema discovery is genuinely novel, single-custodian depth limits the addressable market, and focus risk is real.*

*The 18-24 month Agentforce window is the most useful data point. It sets a clear strategic clock: Min needs 100+ customers and a second CRM adapter within 24 months, or the competitive dynamics shift fundamentally.*

*The consultant partnership requirement is a GTM reality I need to factor into the unit economics. 12% referral fees on a $60K ACV = $7,200 per customer. That's not trivial, but it's a well-understood channel cost in B2B SaaS.*

---

### Reference Call 3: Rachel Winters — COO, Clarity Wealth Management ($420M AUM)

**Context:** Elena found Rachel through her network. Rachel evaluated Min at T3, had two follow-up calls with Jon, and declined to proceed with a pilot. Elena wants to understand the "no" — what stops a qualified buyer from converting.

**Duration:** 22 minutes

---

**Elena:** Rachel, I understand you looked at Min and decided not to move forward. Can you walk me through what happened?

**Rachel:** Sure. I saw Min at the T3 conference. The triage queue caught my eye — I was literally that morning thinking about how I spend my first hour every day figuring out what's broken. The compliance scan was impressive. The NIGO prevention was relevant because we're on Schwab. Jon gave me a good demo, I scheduled two follow-up calls, and then I passed.

**Elena:** What killed it?

**Rachel:** Two things. First, we're on Redtail, not Salesforce. Jon was upfront about it — Min only works with Salesforce today. He said the Redtail adapter was on the roadmap. I appreciated the honesty, but I can't wait 6 months for a maybe. I need a solution now. My compliance monitoring is a Google Sheet that I update manually every Monday. It's terrible, but it's terrible today, and Min is a promise for Q3.

**Elena:** Was there anything else besides the CRM?

**Rachel:** Yes. Jon showed me the compliance scan, and I asked him how many firms were using it in production. He said zero. I asked for a reference customer. He said he didn't have one yet. I understand he's early stage, and I don't hold that against him personally. But I'm not going to be the guinea pig for a compliance tool. If Min shows me that my Patel household has a beneficiary issue and I act on that, I need to trust the result. I need to know that 10 other COOs have relied on this system and it was right. If I'm the first, and it's wrong, and I present the scan to my CCO... that's my credibility on the line.

**Elena:** If Min had a Redtail adapter and 10 reference customers, would you reconsider?

**Rachel:** In a heartbeat. The product solves a real problem. The triage queue alone would save me 5 hours a week. The compliance scan would replace a $6,000/year subscription to SmartRIA that I hate. But "the product is good" isn't enough. I need the product to be proven.

**Elena:** What is SmartRIA charging you?

**Rachel:** $500 a month. And it doesn't do what Min does — it's a compliance calendar, not a compliance intelligence engine. If Min were available for Redtail and had 10 customers, I'd pay $400 a month — maybe $500 — on top of SmartRIA, not instead of it. Eventually Min might replace SmartRIA, but not until it has regulatory calendar features.

**Elena:** One more thing — what would you want to see in the product before you'd commit to a paid contract, assuming the Redtail adapter existed and there were 10 reference customers?

**Rachel:** Honestly? Two things. First, I'd want to run the compliance scan against my actual Redtail data and compare it against my Monday spreadsheet. If Min catches things I missed — and I suspect it would — that's the sale. Second, I'd want to talk to one of those 10 reference customers. Not a testimonial on a website — a phone call with a COO my size who's been using it for 3 months. I want to hear "it saved me 5 hours a week and caught something I missed" from someone who isn't Jon.

**Elena:** If that phone call went well, how fast would you close?

**Rachel:** Same week. My compliance monitoring problem isn't going away. I'm actively looking for a solution. If Min were available for Redtail today, I'd be doing a pilot today. The only reason I'm not is that the product literally doesn't work with my CRM. That's not a product quality issue — it's a market coverage issue. Jon knows this. He was apologetic about it at T3.

*Elena's annotation: This is the most important reference call. Rachel is a qualified buyer who said no, and her reasons are instructive:*

*1. CRM lock-out: Redtail is 20% of the market. Every Redtail firm is a lost sale until the adapter ships. Rachel's frustration is palpable — she's actively looking for a solution and Min would be her first choice if it worked with her CRM.*

*2. Zero-reference-customer barrier: Rachel isn't irrationally cautious — she's rationally cautious. She'll be the first to adopt once someone else goes first. This is the classic early-adopter chicken-and-egg: you need references to get customers, and you need customers to get references. Her requirement — "a phone call with a COO my size" — is exactly what Sarah Kendrick would provide if Sarah becomes Customer #1.*

*3. Price anchor: Rachel would pay $400-$500/month ($4,800-$6,000/year). That's dramatically below Jon's $60K ACV target. Is Rachel's firm too small ($420M) for the $60K tier? Or is the pricing model wrong? At $5,000/year, Min needs 20x more customers to reach the same revenue as at $60K/year. This is the fundamental pricing challenge: the mass market pays less than the enterprise market, but the enterprise market requires features (multi-custodian, references, SOC 2) that don't exist yet.*

*4. Closing speed: Rachel said "same week" if the reference call went well. That's a 7-day sales cycle from pilot to paid. If Min can replicate this speed with 10+ firms, the revenue ramp could be steeper than my model assumes. The limiting factor isn't willingness to pay — it's willingness to be first.*

---

### Reference Call 4: David Park — Partner, Cascade Ventures (Investor in Compliance Workflow Company)

**Context:** Elena knows David from LP events. Cascade invested $15M in RIA HQ, a compliance and workflow management platform for RIAs. She wants the perspective of an investor who has already bet on this market.

**Duration:** 26 minutes

---

**Elena:** David, I'm looking at a company called Min that's building compliance intelligence for RIAs. You invested in RIA HQ. How do you see the competitive landscape?

**David:** I know of Min — saw some LinkedIn activity. The compliance space for RIAs is interesting because it's simultaneously crowded and empty. There are 15 companies that claim to do "compliance for RIAs," but they all do different things. SmartRIA does compliance calendar. ComplySci does employee compliance. RIA in a Box does outsourced CCO services. RIA HQ does workflow management with compliance templates. Nobody does what Min appears to do — real-time compliance monitoring on top of the CRM with custodian-specific operational knowledge.

**Elena:** Is there room for both RIA HQ and Min?

**David:** Yes, because they serve different buyers. RIA HQ is a standalone platform that the CCO uses for compliance program management — policies, procedures, regulatory filings, employee attestations. Min appears to be a CRM overlay that the COO uses for operational compliance monitoring — "are my households compliant, and what do I need to do today?" Different buyer, different budget, different use case. A firm could use both.

The overlap risk is if either company expands into the other's territory. If RIA HQ adds CRM integration and real-time monitoring, they become a Min competitor. If Min adds compliance program management, they become an RIA HQ competitor. But both of those expansions are non-trivial — they require different technical architectures and different go-to-market motions.

**Elena:** What would concern you about investing in Min?

**David:** Three things. First, the solo-founder risk is real. I've lost money on two solo-founder wealthtech companies. Both built impressive V1 products, acquired 5-10 customers, then drowned in customer support tickets while trying to build V2. The transition from "I can build anything" to "I need to support what I built while building what's next" is where solo founders break. It's not a talent issue — it's a bandwidth issue.

Second, the Salesforce dependency. Min sits on top of Salesforce, which means Min's product roadmap is partially dictated by Salesforce's platform roadmap. When Salesforce deprecated the SOAP API, every ISV had to spend 3 months migrating. When they changed the API call limits in 2023, every ISV had to optimize. You're not building on your own platform — you're building on someone else's.

Third — and this is the one I'd probe hardest if I were doing diligence — is the AI coding tools question. Min was built with AI assistance, which means the velocity is impressive but the code continuity is uncertain. When Jon hires Engineer #2, can that person understand and maintain code that was co-authored by an AI? The documentation requirements are different. The architectural decisions are embedded in the code in a way that might not be transferable. This is a new risk category that we're all still learning to evaluate.

**Elena:** If Min offered to sell to you — if Jon said "I want to merge Min into RIA HQ" — would you be interested?

**David:** At the right price, possibly. The schema discovery engine is the asset I'd be buying. RIA HQ has been struggling with Salesforce integration because every org is different, and we've been doing it through professional services — 40-60 hours per implementation. If Min's schema discovery can auto-map org configurations, that cuts our implementation time by 70% and changes our unit economics. I'd pay $2-4M for that technology and the founder.

**Elena:** Let me push on the competitive landscape. If you had $2M to invest in the RIA compliance space right now, would you invest in Min or would you invest in expanding RIA HQ's capabilities to cover Min's territory?

**David:** *(long pause)* That's the right question. If I had $2M and could only choose one: I'd invest in Min and then figure out the partnership with RIA HQ. Here's why. RIA HQ is a workflow management platform. Adding real-time CRM monitoring, auto-schema-discovery, and custodian-specific rules would require rebuilding 40% of RIA HQ's architecture. It would take 12-18 months and $3-5M. Acquiring Min and integrating the schema discovery engine would take 6 months and $2-4M. The build-vs-buy math favors buy.

But here's the nuance: I'd only acquire Min if Jon were willing to come with it. The schema discovery engine is 1,400 lines of code, but the domain knowledge embedded in those heuristics — why the confidence threshold is 0.70, why Practifi's prefix is `cloupra__` and not something more obvious, why account hierarchy detection matters for household identification — that knowledge is in Jon's head. The code is the artifact of the knowledge, not the knowledge itself.

**Elena:** Is that a vulnerability or an asset?

**David:** Both. It's a vulnerability because the bus factor is 1. It's an asset because no acquirer gets full value without the founder. Which means in a failure scenario, the acqui-hire price includes a meaningful retention package for Jon. He's not just selling code — he's selling his brain.

**Elena:** What about the broader competitive threat landscape? If Goldman or Schwab or Fidelity decided to build this internally?

**David:** Schwab and Fidelity won't build this because it requires CRM integration, and they don't want to be in the CRM business. They want advisors to use their custodial platform and connect their own CRM. Building an overlay on top of 5 different CRMs is a startup problem, not a custodian problem.

Goldman is more interesting. They acquired United Capital in 2019 and have been building a technology platform for RIAs through their Ayco and Personal Financial Management businesses. If Goldman decided to build compliance monitoring for their captive RIA network, they could — but they'd build it for Goldman firms only, not for the open market. That's not a competitive threat to Min; it's a market segmentation.

The real competitive threat is another well-funded startup that sees the same opportunity and hires a 5-person team to execute faster. That's why speed to market matters. Min's 18-month head start in domain knowledge and schema discovery heuristics is a real advantage, but it's not an insurmountable one if a competitor raises $10M and hires 3 engineers from Practifi.

*Elena's annotation: David's perspective is valuable because he's an investor, not a customer. His competitive landscape analysis confirms my thesis: the compliance space is fragmented, and Min occupies a genuinely unoccupied niche (real-time CRM overlay with custodian knowledge). The potential acqui-hire at $2-4M is a floor valuation — it means that even in a failure scenario, Min's IP (schema discovery) has salvage value.*

*The "another well-funded startup" risk is the one I haven't adequately considered. If a competitor raises $10M on the same thesis, they can hire 3-5 engineers and potentially reach market parity in 12 months. Min's defensibility depends on reaching 100+ customers before a funded competitor emerges. That's the strategic clock.*

*The solo-founder risk and Salesforce dependency concerns align with my own analysis. The AI coding tools risk is a new dimension — David is right that this is a category we're still learning to evaluate. I'll probe this in the technical diligence section.*

---

### Reference Call 5: Lisa Nakamura — Senior Examiner, SEC Division of Examinations (Retired)

**Context:** Lisa conducted Evaluation #5 — a simulated 3-day SEC examination of a firm using Min. She retired from the SEC 4 months ago and is now an independent compliance consultant. Elena reached her through a mutual contact at a compliance conference. Elena is careful to note that Lisa speaks as a former examiner, not on behalf of the SEC.

**Duration:** 31 minutes

---

**Elena:** Lisa, I appreciate you making time. I understand you conducted a detailed assessment of how Min would perform under SEC examination. I'm interested in your perspective as a former examiner — does Min create regulatory risk or reduce it?

**Lisa:** It reduces it. Materially. And I want to be specific about why, because the answer is nuanced.

The concern most firms have about compliance technology is that it creates a new surface area for examination. If you tell the SEC "we use an automated system for compliance monitoring," the examiner is going to ask: How does it work? Who oversees it? What happens when it's wrong? How do you know it's right? These are hard questions, and most compliance technology products make them harder because they use AI or machine learning in ways that the firm can't explain.

Min defuses all of this because it's not AI. It's a rule-based engine. When I examined it — when I conducted the simulated examination — I asked the standard AI risk questions, and the answer was: "It's keyword matching against CRM tasks, weighted by regulatory categories, with deterministic scoring." That's not AI. That's a spreadsheet with an interface. And from a regulatory perspective, that's vastly easier to explain, document, and defend than a probabilistic model.

**Elena:** What about the "false-pass" problem? A compliance expert found that the engine doesn't distinguish between a completed task and an open task.

**Lisa:** He's right, and that finding matters. But here's the regulatory context: the false-pass problem is a precision issue, not a safety issue. The system errs toward detecting activity — it finds the task, even if the task isn't complete. The dangerous failure mode in compliance technology is false negatives — not detecting an issue that exists. Min's false-pass problem means it occasionally says "you're fine" when the reality is "you've started but haven't finished." That's a less dangerous error than "you haven't started and you don't know."

In an examination, what I'd be looking for is evidence that the firm has a systematic process for identifying compliance gaps. Min provides that. The false-pass means the firm might not know that a specific remediation is incomplete, but the firm would know that the compliance check was run and the issue was flagged. That's significantly better than what I see at 90% of the firms I examine, which is: no systematic process at all.

**Elena:** What findings did you issue in the simulated examination?

**Lisa:** Three formal findings, all procedural. First: inadequate vendor due diligence. No SOC 2 report, no data processing agreement, no formal security assessment of Min as a vendor. This is the finding that Min contributed to — Jon hasn't created the vendor documentation package that firms need to satisfy their compliance obligations. Second: supervisory procedures don't describe the Min-based workflow. The COO replaced her manual spreadsheet with Min's triage queue without updating the firm's written procedures. Third: the ADV disclosure uses "technology-assisted" without specifying that the technology is rule-based, not AI/ML.

Here's the important part: none of these are enforcement-level concerns. These are the kinds of procedural gaps I see in well-run firms that adopted new technology without fully updating their compliance infrastructure. The technology itself is sound. The surrounding documentation is incomplete.

**Elena:** You mentioned that Min "improved the firm's compliance posture materially." What does that mean concretely?

**Lisa:** It means I identified five areas where Min prevented deficiencies that would have existed without it. Undocumented compliance monitoring — the firm now has a 90-day continuous audit trail, which it didn't have before. Undetected documentation gaps — Min's compliance scan found household-level issues that manual review had missed. Inconsistent household oversight — Min surfaces issues that had been addressed and then regressed. Override without documentation — Min requires mandatory dismiss reasons for any triaged item that's dismissed without action. And abandoned compliance reviews — Min logs when a user starts a review and doesn't complete it.

The audit trail alone is worth the investment. I've examined hundreds of firms, and the most common deficiency I cite is "inability to demonstrate systematic compliance oversight." Min solves that completely. The audit trail with mandatory dismiss reasons and abandonment logging is more comprehensive than what I see at firms paying $50,000 a year for outsourced compliance.

**Elena:** If I told you this company has zero customers and a solo founder, does that change your assessment of the technology?

**Lisa:** It changes my assessment of the business risk, not the technology. The technology is sound. The compliance engine catches the right things. The audit trail is comprehensive. The custodian knowledge base has genuine regulatory depth. What concerns me about a solo founder with zero customers is the vendor continuity question — what happens to the audit trail data if Min shuts down? And the maintenance question — custodian rules change quarterly, regulations get updated, examination priorities shift annually. A solo founder can build the V1. Can a solo founder maintain it while onboarding customers, building new features, and keeping the knowledge base current? That's a business question, not a technology question.

**Elena:** Last question — if you were advising a firm that was evaluating Min, what would you tell them?

**Lisa:** I'd tell them to do the pilot. Connect to Salesforce, run the compliance scan, compare the results against your own manual review. If Min finds issues you missed, you have your answer. But I'd also tell them to demand the vendor due diligence packet before going live. And I'd tell them to update their supervisory procedures to explicitly describe the Min-based workflow, because the first examiner who walks in and asks about it will want to see documentation.

And I'd say one more thing: every competitor in this space ships technology. Nobody ships the regulatory implementation support — the supervisory procedure templates, the ADV disclosure language, the examiner FAQ. If Min ships that documentation alongside the product, Min isn't selling a compliance tool. Min is selling examination readiness. That's a fundamentally different value proposition, and it's the one that would make me recommend Min to every firm I advise.

*Elena's annotation: Lisa is the most credible voice in my entire reference set. A 12-year SEC examiner with 200+ examinations is the regulatory gold standard. Her assessment — "Min reduces regulatory risk materially" — is the single strongest reference point for an investment thesis.*

*Key insight I hadn't considered: the false-pass problem is less dangerous than I thought, because it errs toward false positives (detecting activity that isn't complete) rather than false negatives (missing activity entirely). The regulatory risk profile of keyword matching that catches too much is better than AI that might miss things.*

*The vendor documentation gap is now a confirmed finding from 3 independent sources: the SEC examiner, Sarah Kendrick (SOC 2 requirement), and Marcus Webb (the compliance expert). This is a $50K-$100K investment in documentation and certification, not a technology problem. It's a business operations gap that a funded company can close in 90 days.*

*Lisa's "examination readiness" positioning insight is the most actionable GTM advice from any reference call. It reframes Min from "compliance technology" (crowded category) to "examination readiness platform" (empty category). I'll include this in the IC memo.*

---

## Part 4: Technical Diligence

*Elena engages James Okonkwo, CTO of DataMesh (one of her portfolio companies) and former VP Engineering at Orion Advisor Solutions, to conduct technical diligence on Min's codebase. James has built data infrastructure products for the wealth management industry for 12 years and has specific expertise in CRM integration architecture, multi-tenant SaaS, and Salesforce API patterns. He reviews the codebase over two days and delivers his assessment.*

### Technical Diligence Report

**Prepared by:** James Okonkwo, CTO, DataMesh
**Date:** February 2026
**Scope:** Architecture review, scalability assessment, code quality, security posture, solo-founder risk

---

### 1. Architecture Assessment

**Overall Grade: B+**

Min is a full-stack Next.js application (v16.1.6) with React 19.2.3, TypeScript, and Tailwind CSS 4. The application uses Next.js API routes as its backend — there is no separate API service. Data persistence is split between Salesforce (primary CRM data via OAuth) and Turso (SQLite-compatible, used for org mappings and application state). Authentication state is stored in an encrypted cookie (AES-256-GCM, 90-day TTL) with scrypt key derivation.

**What's well-architected:**

The CRM abstraction layer is correctly designed. The `CRMPort` interface (`port.ts`, 144 lines) defines 14 methods across contacts, households, tasks, and financial accounts, plus 3 optional methods for CRM-specific capabilities (contact relationships, financial account creation, financial account queries). The `CRMCapabilities` interface declares feature flags (financial accounts, contact relationships, batch operations, workflows, audit log) that allow the application to gracefully degrade when an adapter doesn't support a capability.

The canonical type system (`types.ts`, 110 lines) defines 10 types across read models (`CRMContact`, `CRMHousehold`, `CRMTask`, `CRMFinancialAccount`), write models (`CRMContactInput`, `CRMHouseholdInput`, `CRMTaskInput`, `CRMFinancialAccountInput`), and aggregate types (`CRMBatchResult`, `CRMCapabilities`). These types are expressive enough to model RIA operations without being so Salesforce-specific that they'd require rewriting for Wealthbox or Redtail.

The factory pattern (`factory.ts`, 67 lines) uses a singleton cache with environment-variable-based provider resolution. This is the correct pattern for single-tenant deployment (one CRM per deployment). The comment on line 7 — "Per-tenant dispatch is a future enhancement" — indicates awareness that multi-tenant (one deployment serving multiple CRMs) is a different architecture, which is the right thing to defer.

**What needs work:**

The application is a monolith. All 20+ screens, all API routes, the compliance engine, the schema discovery engine, the custodian rules, the audit system, and the CRM adapter all run in a single Next.js process. At 10 customers, this is fine — Next.js is designed for this. At 100+ customers with concurrent compliance scans hitting Salesforce APIs, the single-process architecture will bottleneck on API call concurrency and memory pressure.

There is no background job infrastructure. Compliance batch scans (reported at 14 minutes for 47 households in Evaluation #1) run synchronously in the API route handler. Next.js API routes have a default timeout of 30 seconds (configurable to 300 seconds on Vercel). Long-running scans need a queue (BullMQ, Inngest, or similar) and worker process. This is a known gap — Sarah Kendrick flagged it in Evaluation #1 as "batch scan too slow."

There is no CI/CD pipeline visible in the repository. No GitHub Actions, no Vercel configuration, no deployment scripts. For a solo founder with zero customers, this is acceptable. For a company with paying customers, it's a risk — untested deployments hitting production.

### 2. Schema Discovery Engine — Deep Dive

**Grade: A-**

The schema discovery engine (`schema-discovery.ts`, 1,439 lines) is the most architecturally significant component in the codebase. I've built Salesforce integration products for 8 years, and this is the first auto-discovery implementation I've seen that handles the actual complexity of the RIA Salesforce ecosystem.

**What it does:**

Phase 1 makes 7-8 read-only API calls: global object catalog, Account describe (fields + RecordTypes), Contact describe, FinancialAccount describe (may 404 if FSC not installed), plus Tooling API queries for active flows, triggers, and validation rules, plus record count queries.

Phase 2 classifies the org against known patterns:
- **FSC detection:** Checks for `FinServ__` namespaced objects (8 known FSC objects)
- **Managed package detection:** Recognizes Practifi (`cloupra__`), XLR8 (`XLR8__`), and Wealthbox Sync (`wealthbox__`) by object prefixes, including their specific household objects, junction objects, and AUM fields
- **Household identification priority:** Managed package → Account RecordType → Type picklist → Type in data → Custom object → Account hierarchy → Fallback
- **Custom object heuristics:** Scans for objects with names matching RIA concept keywords (`household`, `family`, `client_group`, `relationship_group`, etc.) and scores them based on field references to Account/Contact objects
- **Confidence scoring:** Overall mapping confidence based on how many signals confirm the classification. Threshold of 0.70 triggers manual mapping fallback.

**What's impressive:**

The `accountTypeValues` field in `OrgMetadataBundle` — this handles the case where a Salesforce org has an unrestricted picklist on Account.Type, which means the describe endpoint doesn't enumerate the values. Min queries actual data to discover the values in use. This is a edge case that most Salesforce developers never encounter, and it tells me the founder has either worked with diverse Salesforce orgs or has been advised by someone who has.

The managed package detection with specific object mappings (Practifi's `cloupra__Household__c`, XLR8's `XLR8__Client_Group__c`, Wealthbox Sync's `wealthbox__Household__c`) is not something you can build from documentation. This comes from implementation experience — these prefixes and object names are learned from real orgs.

**What concerns me:**

The confidence scoring algorithm needs more test coverage. I see test files in the repository (17 test files across the codebase), but the schema discovery classification logic — the core IP of the company — needs exhaustive unit tests with synthetic org configurations. Every permutation of FSC/non-FSC, RecordType/non-RecordType, managed package/custom object, hierarchy/non-hierarchy should have a test case. This is the code that must work perfectly for every new customer.

The 0.70 confidence threshold is a single global value. Different classification decisions may need different thresholds. Household detection with 0.68 confidence is very different from FSC detection with 0.68 confidence — the former affects every query in the system, the latter affects financial account queries only.

### 3. Scalability to 100 Customers on 3 CRMs

**Grade: C+**

**Current state:** Min is a single-tenant, single-CRM deployment. Each customer would run their own instance of the Next.js application, connected to their own Salesforce org via OAuth. This is fine for Salesforce-only deployments — it's how most Salesforce ISV products operate.

**Scaling to 100 Salesforce customers:**

The primary bottleneck is Salesforce API calls. Min's Connected App gets a pool of API calls based on Salesforce edition and license count. The standard allocation for Enterprise Edition is 100,000 API calls per 24-hour period per org. Min currently does not track or rate-limit its API usage. At moderate usage (morning triage load + 2 compliance scans + ongoing task creation), a single customer might consume 200-500 API calls per day. At 100 customers, that's 20,000-50,000 daily API calls — within limits, but without headroom for burst usage (batch scans, schema re-discovery, concurrent users).

The fix is straightforward: implement API call budgeting per org, composite requests to batch multiple queries into a single API call, and cursor-based pagination for large result sets. This is standard Salesforce ISV optimization work — well-documented, not technically risky, but it's 2-3 weeks of focused engineering.

**Scaling to 3 CRMs:**

The CRM architecture supports this. The `CRMPort` interface and canonical types are designed for multiple adapters. The challenge is in the details:

- **Wealthbox:** REST API, well-documented, rate-limited to 100 requests/minute. The data model is simpler than Salesforce — flat contacts with tags instead of hierarchical accounts with record types. The adapter is buildable in 2-3 weeks. The schema discovery equivalent is simpler because Wealthbox orgs are more homogeneous.

- **Redtail:** REST API (v2), less well-documented, rate-limited to 200 requests/15 minutes. Contact-centric (not account-centric), which requires the canonical type mapping to handle a fundamentally different data model. The adapter is 4-6 weeks. The canonical `CRMHousehold` type assumes account-centric grouping, which will need adjustment for Redtail's contact-centric model.

- **Multi-CRM per customer:** This is the hard problem. The current factory (`factory.ts`) resolves a single CRM per deployment via environment variable. A firm that uses both Salesforce and Wealthbox (for different advisors or after an acquisition) would need the factory to support per-household CRM resolution. This is an architectural change, not a configuration change. It's not reflected in the current design.

### 4. AI Dependency Risk

**Grade: B**

Min uses AI coding tools (primarily Claude Code) for development, but the product itself is not AI-dependent. The compliance engine is a rule-based keyword matcher. The schema discovery engine is a heuristic classifier. The custodian rules engine is a static data file. There is no machine learning model, no training data dependency, no API call to an AI service at runtime.

**What this means for investors:**

- **No AI vendor dependency** at runtime. Min works if OpenAI, Anthropic, or any other AI provider goes down. This is a strength — many competitors in the "AI for compliance" space would stop functioning without their AI provider.
- **No AI explainability problem.** When an SEC examiner asks "how does this work?", the answer is "keyword matching against CRM tasks with regulatory rule weights." That's fully auditable and deterministic.
- **AI development dependency.** The code was co-authored by AI tools, which creates a knowledge transfer challenge. When Engineer #2 joins, they need to understand code that was generated by an AI based on architectural prompts from the founder. The code is clean and well-commented (I see section headers, JSDoc comments, and inline explanations throughout), but the implicit architectural decisions — why `CRMPort` has 14 methods and not 8, why the confidence threshold is 0.70 and not 0.80 — live in the founder's head, not in documentation.

**Recommendation:** Before the first hire, Jon should produce an architecture decision record (ADR) document that captures the 10-15 most significant architectural decisions and their rationale. This is a weekend of writing that reduces the bus factor significantly.

### 5. Data Architecture / Canonical Model

**Grade: B+**

The canonical type system is well-designed for the current scope. Ten types across read, write, and aggregate models. The types are:

- Expressive enough to model RIA operations (households, contacts, tasks, financial accounts)
- Generic enough to support multiple CRMs (no Salesforce-specific fields in canonical types)
- Typed with TypeScript interfaces (not runtime-validated, but statically checked)

**Strengths:**
- `CRMTask` includes `status` as a string field, which allows different CRMs to use different status values without normalization loss
- `CRMHousehold` includes optional `contacts` array for eager loading
- `CRMFinancialAccount` includes `taxStatus` and `accountType` separately, which is the correct model for RIA data (these are distinct dimensions)
- `CRMCapabilities` flag interface allows graceful degradation

**Gaps:**
- No activity/event type — calendar integration is a frequently requested feature that the current model doesn't support
- No document/attachment type — document management is one of the 20 screens, but the canonical model doesn't abstract document storage
- `CRMContact.householdId` is nullable, which means the data model supports "orphan" contacts — contacts not associated with any household. This is correct for Salesforce (where contacts can exist without account association) but may need validation logic for CRMs that enforce contact-household relationships

### 6. Solo-Founder Code Continuity Score

**Score: 3 out of 5**

| Factor | Assessment |
|--------|-----------|
| Code readability | **4/5** — Clean TypeScript, section headers, consistent patterns. A competent engineer could read and understand any individual file. |
| Architectural coherence | **4/5** — Hexagonal pattern is consistently applied. CRM abstraction, compliance engine, custodian rules, and audit system are cleanly separated. |
| Test coverage | **2/5** — 17 test files for 137 source files. Core business logic (schema discovery classification, compliance engine matching) needs significantly more coverage. |
| Documentation | **2/5** — Code comments are good. Architecture documentation is absent. No ADR, no system design doc, no onboarding guide for new engineers. |
| Deployment documentation | **1/5** — No CI/CD, no deployment runbook, no environment variable documentation beyond inline comments. |
| Data model documentation | **3/5** — TypeScript types serve as implicit documentation. No ERD, no data flow diagram. |

**Overall risk assessment:** If Jon were hit by a bus tomorrow, a competent senior engineer could understand the codebase in 2-3 weeks and maintain it. They could not make confident architectural decisions (extend schema discovery, add a CRM adapter, change the compliance engine's matching logic) for 6-8 weeks because the architectural rationale isn't documented. The bus factor is real but mitigable with 2-3 days of documentation work.

### 7. Security Posture / SOC 2 Readiness

**Grade: C**

**Current state:**

The application has reasonable security fundamentals:
- OAuth 2.0 for Salesforce authentication (standard, well-implemented)
- AES-256-GCM encryption for session state stored in cookies with scrypt key derivation
- PII scrubbing in the audit logger (SSN, DOB, bank account numbers, routing numbers are redacted before writing audit records)
- SOQL parameterization via a `sanitizeSOQL` function to prevent injection
- No secrets committed to the repository (`.env` based configuration)
- Read-only Salesforce access for schema discovery (explicitly stated in code comments)

**What's missing for SOC 2:**

SOC 2 Type II requires 12 categories of controls. Min is missing or deficient in the following:

| SOC 2 Category | Current State | Gap |
|----------------|--------------|-----|
| Access controls | OAuth + encrypted cookie | No role-based access, no MFA, no session timeout policy |
| Change management | No CI/CD | No code review process, no deployment approval, no rollback procedure |
| Incident response | None | No incident response plan, no security contact, no breach notification process |
| Vendor management | None | No subprocessor list (Turso, Vercel, Salesforce API), no DPA with Turso |
| Data retention | Audit trail in Salesforce | No formal retention policy, no data deletion capability |
| Encryption | AES-256-GCM for cookies | No encryption at rest for Turso DB (SQLite files on disk) |
| Logging & monitoring | Audit trail for mutations | No application error monitoring, no security event logging |
| Business continuity | Salesforce data ownership | No backup strategy for Turso data, no disaster recovery plan |

**SOC 2 timeline estimate:** 4-6 months from decision to start, with a compliance automation platform (Vanta, Drata, or Secureframe). Cost: $15,000-$25,000 for the platform plus 3-4 weeks of engineering time. This is a standard investment for a B2B SaaS company closing its first enterprise customers.

**Immediate security concerns (pre-SOC 2):**

1. The default encryption key in `sf-connection.ts` line 11 — `"min-demo-dev-key-change-in-prod!!"` — is a development fallback that throws in production if `SF_COOKIE_SECRET` isn't set. This is the correct pattern (fail-closed in production), but the string itself in source code is a code smell that security auditors flag.

2. The audit trail is "immutable by convention" (code comment in `audit.ts` line 14) — audit tasks are written to Salesforce with a `MIN:AUDIT` prefix, and the comment notes that a validation rule should prevent edits. But the validation rule is deployed separately, not by Min. If the validation rule isn't in place, the audit trail is editable by any Salesforce admin. This was identified in the SEC examination simulation.

3. No rate limiting on API routes. A malicious actor with a valid session cookie could make unlimited API calls to Min's endpoints, which would consume the customer's Salesforce API budget.

### 8. Summary Assessment

| Dimension | Grade | Investor Relevance |
|-----------|-------|-------------------|
| Architecture design | B+ | Correct patterns, clean abstraction. Ready for CRM expansion. |
| Schema discovery | A- | Genuinely novel. Core IP. Needs more test coverage. |
| Scalability (current) | C+ | Fine for 10 customers. Needs optimization work for 100+. |
| AI dependency | B | No runtime AI dependency (strength). AI development dependency (manageable risk). |
| Data model | B+ | Clean canonical types. Missing document and activity models. |
| Code continuity | 3/5 | Readable code, missing documentation. Bus factor is real but mitigable. |
| Security / SOC 2 | C | Reasonable fundamentals. 4-6 months from SOC 2 readiness. |

**Bottom line:** The technical foundation is sound. The architecture is correctly designed for multi-CRM expansion. The schema discovery engine is genuine technical IP that would take a competitor 12-18 months to replicate (and longer to match in heuristic accuracy). The gaps — scalability optimization, test coverage, documentation, SOC 2 — are all standard pre-Series A technical debt that can be addressed with the first engineering hire and 4-6 months of focused work. None of the gaps are architectural — they're all execution debt, which is the expected state for a solo-founder pre-revenue product.

**Risk rating:** YELLOW — investable with conditions on technical milestones in the first 12 months.

---

## Part 5: Investment Committee Memo

**CONFIDENTIAL — MERIDIAN VENTURES INTERNAL**

**To:** Meridian Ventures Investment Committee
**From:** Elena Voss, Partner
**Date:** February 2026
**Subject:** Min — Practice Intelligence for RIAs — Investment Recommendation
**Deal Lead:** Elena Voss
**Technical Advisor:** James Okonkwo, CTO, DataMesh (portfolio company)

---

### 1. Company Overview

**Min** is a pre-revenue software company building a practice intelligence platform for SEC-registered Registered Investment Advisors (RIAs). The product sits on top of a firm's existing CRM (currently Salesforce only) and provides real-time compliance monitoring, operational triage, account-opening workflow management with NIGO (Not In Good Order) prevention, and audit-ready documentation.

The product is built by a solo founder, Jon Cambras, who serves as CEO, CTO, and CPO. Jon has deep domain experience in RIA technology operations and is building with AI-assisted coding tools, which has enabled him to ship a product with 20 functional screens, a 1,439-line schema discovery engine, 30+ compliance checks, and a custodian knowledge base covering 3 custodians and 8 account types — output that would typically require a 3-4 person engineering team over 6 months.

Min is pre-revenue, pre-customer. The product has been evaluated by 6 independent assessors (a COO, conference attendees, a Salesforce expert, a compliance expert, an SEC examiner, and an enterprise sales strategist), all of whom validated the core value proposition while identifying specific gaps. No firm is currently paying for or using Min in production.

**The ask:** $2M at $8-10M pre-money valuation ($10-12M post-money). 18 months of runway at $15K/month burn rate, with first engineering hire at month 6.

---

### 2. Market Opportunity

**The buyer:** The COO at an SEC-registered RIA managing $250M-$1B in AUM. This buyer has direct budget authority for operational tooling up to $36K-$50K/year (above that typically requires CEO approval). She is the single operational point of failure at the firm — responsible for compliance monitoring, client onboarding, Salesforce administration, custodian paperwork, and advisor accountability. Her current tools: Salesforce reports, Excel spreadsheets, and a standalone compliance calendar product (typically SmartRIA at $500/month or similar).

**Quantified pain:** Based on reference call data and industry benchmarks, the COO at a $500M firm spends approximately $32,000-$34,000/year in labor cost on tasks that Min automates. Adding a compliance risk premium (reduced examination exposure) brings the total addressable pain to $50,000-$75,000/year per firm.

**Market sizing:**

| Segment | Count | Source | Min's Addressable? |
|---------|-------|--------|-------------------|
| SEC-registered RIAs (total) | ~15,000 | SEC IAPD | Universe |
| $250M-$1B AUM | ~4,500 | SEC filings | Target segment |
| Of those, on Salesforce | ~2,700 | T3/Kitces data (60% SF penetration) | Addressable today |
| Of those, Schwab-primary custodian | ~1,100 | Schwab market share (~40%) | Fully serviceable today |
| $100M-$250M AUM, Salesforce | ~2,000 | SEC filings | Growth segment (lower ACV) |
| $1B+ AUM, Salesforce | ~800 | SEC filings | Enterprise segment (higher ACV, longer sales cycle) |

**TAM/SAM/SOM (Elena's estimates, not founder's):**

| Metric | Calculation | Value |
|--------|------------|-------|
| TAM | 15,000 RIAs × $48K blended ACV | $720M |
| SAM (Salesforce, $250M+ AUM) | 3,500 firms × $60K ACV | $210M |
| SOM (Schwab-primary, Salesforce, $250M-$1B) | 1,100 firms × $48K ACV | $53M |
| Year 1 target | 5-8 customers × $48K ACV | $240K-$384K |
| Year 3 target (with Wealthbox) | 40-60 customers × $55K blended ACV | $2.2M-$3.3M |
| Year 7 target (3 CRMs, full market) | 600-1,000 customers × $80K blended ACV | $48M-$80M |

**My assessment:** The $100M revenue question depends on whether Min can (a) expand beyond Salesforce to capture the full RIA market, (b) move upmarket to $1B+ firms with $100K+ ACVs, and (c) expand ACV through practice intelligence features beyond compliance. Each of these is achievable but unproven. At current addressable market (Salesforce + Schwab), the ceiling is ~$53M — a good business but not venture-scale. At full potential (3 CRMs, multi-custodian, practice intelligence), $100M ARR is achievable in 7-8 years with ~$30M in total capital.

---

### 3. Product Assessment

**What exists (verified through 6 independent evaluations):**

- **Triage queue:** Replaces the COO's manual morning workflow. Reduces 40-minute spreadsheet assembly to a 2-second dashboard load. Triages households by urgency using regulatory, operational, and activity signals.

- **Compliance engine:** 30+ checks across 6 categories (identity, suitability, documents, account, regulatory, firm). Each check cites the specific regulation (Rule 17a-3, FINRA 2090, Reg BI, DOL PTE 2020-02). Produces pass/warn/fail results with remediation templates (10+ templates with step-by-step workflows including assignee and follow-up timeline). Independent compliance expert graded it B+, said it would reach A- with one targeted fix (status-aware task matching).

- **Custodian knowledge base:** 24 account-type definitions across Schwab, Fidelity, and Pershing. 96 required documents, 48 conditional documents, 72 NIGO risks with prevention strategies. Schwab depth is comprehensive (described as "the deepest custodian-specific compliance content I have seen at this price point" by an 18-year compliance expert). Fidelity and Pershing have account structures but not field-level NIGO rules.

- **Schema discovery engine:** 1,439 lines of heuristic classification logic that auto-discovers Salesforce org configurations. Detects FSC, Practifi, XLR8, Wealthbox Sync managed packages. Identifies household models across 6 different Salesforce patterns. Confidence scoring with 0.70 threshold and manual mapping fallback. Described as "genuinely novel" by the Salesforce expert with 34 FSC implementations.

- **Audit trail:** Immutable (by convention) audit logging with PII scrubbing, mandatory dismiss reasons, and abandonment logging. Passed a 90-day cross-reference test in the SEC examination simulation. Described as "unprecedented" by the SEC examiner.

- **CRM abstraction layer:** Hexagonal architecture with `CRMPort` interface, canonical types, and factory pattern. Salesforce is the only implemented adapter. Wealthbox and Redtail are architecturally supported but not built.

**What doesn't exist yet (gaps identified across evaluations):**

| Gap | Impact | Difficulty | Source |
|-----|--------|-----------|--------|
| Status-aware compliance matching | Eliminates false-pass problem | 1-2 weeks | Compliance expert |
| Multi-custodian support per household | Unlocks 70% of $500M+ firms | 3-4 months | Salesforce expert |
| Wealthbox CRM adapter | Adds ~20% of market | 6 weeks | Founder estimate |
| Alert management (snooze/dismiss) | #1 retention lever | 2-3 weeks | COO evaluation |
| SOC 2 / vendor documentation | Required for first enterprise close | 4-6 months | SEC examiner, all references |
| Salesforce Lightning embed | Advisor adoption | 4-6 weeks | COO evaluation |
| Background job processing | Required for batch operations at scale | 2-3 weeks | Technical diligence |

---

### 4. Competitive Landscape

The RIA compliance technology market is fragmented. No single competitor occupies Min's exact position (CRM-overlay compliance intelligence with custodian operational knowledge). The competitive map:

| Competitor | What They Do | Where Min Wins | Where They Win |
|-----------|-------------|---------------|---------------|
| **SmartRIA** | Compliance calendar + workflow | Min has CRM integration, custodian knowledge, real-time monitoring | SmartRIA has regulatory calendar, established customer base (500+ firms), SOC 2 |
| **RIA in a Box** | Outsourced CCO services | Min is technology, not services (scales differently) | RIA in a Box has human judgment, established brand |
| **Practifi** | Full CRM replacement on Salesforce platform | Min is faster to implement (30 days vs 6 months), lower cost ($60K vs $100K+) | Practifi has deeper workflow, larger team, Salesforce AppExchange presence |
| **Orion Compliance** | Compliance module within Orion ecosystem | Min works with any CRM; Orion requires Orion portfolio management | Orion has custodian data integration (Min doesn't) |
| **Salesforce Agentforce** | Horizontal AI on Salesforce platform | Min has vertical operational knowledge Salesforce won't build | Salesforce has distribution, brand, and unlimited R&D budget |

**Competitive positioning assessment:**

Min's competitive advantage is narrow and deep: it's the only product that (a) sits on top of the existing CRM instead of replacing it, (b) auto-discovers the CRM's configuration, (c) encodes custodian-specific operational knowledge, and (d) writes back to the CRM as system of record. This combination doesn't exist in any other product. The question is whether this narrow advantage can sustain a venture-scale business before one of the larger players replicates it.

To understand why this combination is harder to replicate than it appears, consider the historical pattern. ActiFi (acquired by Broadridge in 2017) failed because it read from CRM but never wrote back — creating a parallel workflow that no one maintained. Skience (acquired by Docupace in 2020) failed because its canonical data model lost too much CRM-specific fidelity — firms with $200K+ in Salesforce customization found that Skience could only surface 40% of their custom objects. Both companies had multi-million-dollar budgets and multi-year head starts. Min's architecture explicitly addresses both failure modes: the `CRMPort` interface includes write operations (task creation, household updates), and the schema discovery engine preserves org-specific fidelity by adapting to the org's structure rather than forcing it into a generic model.

The question for the IC is not "can someone build what Min has built?" — the answer is yes, with $5-10M and 12-18 months. The question is "will someone build it?" Given the small market size relative to horizontal SaaS opportunities and the deep domain expertise required, I believe the probability of a well-funded new entrant targeting this exact niche is moderate (30-40% within 24 months). The more likely competitive threat is an adjacent player (SmartRIA, RIA HQ, or Orion) adding CRM overlay capabilities to their existing platform.

**Competitive timeline:** Based on the Salesforce expert's assessment, Min has an 18-24 month window before Agentforce becomes a meaningful competitive factor. SmartRIA could build CRM integration in 6-12 months if they choose to. Practifi has no incentive to become an overlay (they are a replacement). A well-funded startup could replicate Min's approach in 12-18 months with a 3-5 person team, but would need 6-12 additional months to build comparable schema discovery heuristics without Min's customer data. The total competitive moat is approximately 24-30 months from today — enough time to reach 100+ customers if the demand thesis validates.

---

### 5. Business Model

**Pricing model:** Per-firm, tiered by AUM:

| Tier | AUM Range | Monthly | Annual |
|------|-----------|---------|--------|
| Growth | $100M-$300M | $3,000 | $36,000 |
| Professional | $300M-$750M | $5,000 | $60,000 |
| Enterprise | $750M-$2B | $8,000 | $96,000 |
| Strategic | $2B+ | $12,000 | $144,000 |

**Unit economics (projected, not validated):**

| Metric | Estimate | Source/Basis |
|--------|----------|-------------|
| Blended ACV | $48,000-$60,000 | Weighted by target segment distribution |
| CAC (conferences) | $7,000-$10,000 | T3 conference data (3 hot leads from 1 booth) |
| CAC (consultant referral) | $5,760-$7,200 | 12% referral fee on $48K-$60K ACV |
| CAC (content/inbound) | $2,000-$3,000 | Estimated based on LinkedIn traction |
| Blended CAC | $5,000-$7,000 | 40% consultant, 30% conference, 30% inbound |
| Gross margin | 85-90% | SaaS, minimal COGS (Turso, Vercel hosting) |
| LTV (3-year, 90% retention) | $130,000-$162,000 | $48K-$60K × 2.7 (3-year retention factor) |
| LTV/CAC | 18-32x | Exceptional if numbers hold |

**My assessment of unit economics:** The LTV/CAC ratio looks exceptional on paper, but every input is estimated. Actual CAC won't be known until 10+ customers have been acquired through multiple channels. Actual retention won't be known for 12+ months. The gross margin estimate is realistic — infrastructure costs for a Next.js/Turso application are genuinely low (~$50-$100/month per customer).

The pricing concern from reference calls: Sarah Kendrick (the strongest lead) would pay $3,000-$3,500/month, not $5,000/month. Rachel Winters (the Redtail COO who declined) would pay $400-$500/month. These data points suggest the realized ACV may be $36,000-$42,000 in the first year, not $48,000-$60,000. Early customers negotiate hard, and the founder acknowledged he'll discount to acquire reference logos.

---

### 6. Defensibility

Min's defensibility operates on three layers:

**Layer 1: Custodian Knowledge Base (Current, Moderate Moat)**

The custodian rules engine encodes operational knowledge that takes years of direct experience to accumulate. 24 account types, 96 required documents, 48 conditional documents, 72 NIGO risks. This is a content moat — replicable by a well-funded competitor who hires former custodian operations staff, but it takes 6-12 months and requires ongoing maintenance (custodian forms and requirements change quarterly). The moat is moderate because the knowledge exists in human heads — it's not proprietary data, it's encoded expertise.

**Layer 2: Schema Discovery (Near-term, Strong Moat)**

The schema discovery engine is genuine technical IP. 1,439 lines of heuristic classification logic that handles 6+ Salesforce org patterns, 3 managed packages, custom objects, unrestricted picklists, and account hierarchies. A competitor could build a comparable engine, but they'd need exposure to the same diversity of org configurations to develop the same heuristics. This is a time-and-data moat — each new customer's org configuration improves the classification accuracy for all future customers. At 100+ customers, the moat becomes strong. At the current 0 customers, it's a promising foundation.

**Layer 3: Data Network Effect (Future, Potentially Very Strong Moat)**

If Min reaches 200+ customers across diverse Salesforce configurations, the schema discovery mappings become a proprietary dataset that no competitor can replicate without equivalent customer volume. This is analogous to Plaid's bank integration moat — each new integration improves categorization accuracy for all customers. The data network effect is the strongest potential moat, but it requires reaching critical mass (estimated 100-200 customers) before it activates.

**Defensibility assessment:** Min's current defensibility is moderate. The custodian knowledge base is replicable in 12 months. The schema discovery engine is replicable in 18 months. The data network effect doesn't exist yet. The 18-24 month window before Agentforce competition means Min needs to reach 100+ customers and establish the data network effect before the competitive dynamics shift. This is achievable but requires near-perfect execution.

---

### 7. Risks (Ranked by Impact × Probability)

| Rank | Risk | Impact | Probability | Mitigation |
|------|------|--------|-------------|-----------|
| 1 | **Failure to close first 5 customers within 9 months** | Critical — invalidates demand thesis | 35% | 90-day free pilot removes purchase friction. Sarah Kendrick is a warm lead. |
| 2 | **Solo founder burnout / bandwidth collapse** | High — all IP in one person | 25% | First hire at month 6. Architecture documentation before first hire. $15K/month burn preserves runway. |
| 3 | **Salesforce platform risk (Agentforce)** | High — could obsolete the product category | 15% (in 24 months) | CRM expansion to Wealthbox reduces Salesforce dependency. 100+ customers create switching costs. |
| 4 | **Single custodian depth limits market** | Medium — caps addressable market at ~$53M | 50% | Fidelity parity investment (est. 3-4 months). Schwab-first GTM is viable for first 20 customers. |
| 5 | **Compliance false-pass liability** | Medium — reputational risk if a firm relies on false pass | 20% | Status-aware matching fix is 1-2 weeks of engineering. Can be shipped before first paying customer. |
| 6 | **SOC 2 delays block enterprise sales** | Medium — enterprise customers require it | 40% | $15K-$25K investment + 4-6 months. Can start immediately post-funding. |
| 7 | **Price compression in early deals** | Low — affects unit economics, not viability | 60% | Expected. First-year ACV likely $36K-$42K, not $60K. Factor into model. |
| 8 | **AI development tool dependency** | Low — code is standard TypeScript | 10% | No lock-in. Code is readable without AI context. |

**Risk I'm most worried about:** Risk #1. Everything about this deal depends on converting interest into revenue. The product has been evaluated by 6 experts, all of whom validated the core value proposition. The reference calls confirm demand exists. But zero customers is zero customers. If Jon can't close Sarah Kendrick within 90 days of funding, the thesis is in trouble.

**Risk I'm least worried about:** Risk #8. After reviewing the codebase, the AI development tool dependency is negligible. The code is clean, well-typed TypeScript with standard patterns. Any senior engineer could understand and maintain it regardless of how it was authored.

---

### 8. Bull Case: $500M+ Outcome (the "Min Becomes Palantir for RIAs" Scenario)

**Assumptions:**
- Min closes 10 customers in Year 1 (5 at $36K, 5 at $48K), reaching $420K ARR
- Wealthbox adapter ships in Month 8, adding 30% to addressable market
- Fidelity custodian parity reaches Schwab depth by Month 12
- Schema discovery processes 100+ unique org configurations by Month 18, establishing data network effect
- Series A at Month 18-20 at $30-40M valuation on $3M ARR and strong retention metrics
- Redtail adapter and enterprise tier ship in Year 2
- Multi-custodian per-household support ships in Year 2
- Year 3: 150 customers, $12M ARR, 120% net retention (upsell from compliance into practice intelligence)
- Year 5: 500 customers, $45M ARR, expansion into $2B+ firms and broker-dealer market
- Year 7: 1,200 customers, $120M ARR. Possible IPO or strategic acquisition.

**What has to go right:**
1. Jon closes the first 5 customers in 9 months (the demand thesis validates)
2. Schema discovery generalizes to 90%+ of Salesforce orgs (the moat thesis validates)
3. The Wealthbox adapter doesn't require rewriting the canonical data model (the architecture thesis validates)
4. Net retention exceeds 100% (the expansion thesis validates)
5. The first engineering hire is a strong autonomous senior engineer who can maintain the codebase while Jon sells

**Why I believe the bull case is possible (not probable, but possible):**
- The SEC regulatory pressure is real and increasing — examination frequency is up 15% year-over-year
- The RIA M&A wave creates 200+ integration events per year, each one a potential Min customer
- The schema discovery data network effect has no precedent to compare against, but the structural logic is sound
- Solo founders with AI tools represent a new category of capital-efficient company formation — Min could reach $5M ARR with only $3M in total capital raised, which is exceptional capital efficiency

**Bull case return:** At $120M ARR and 15x revenue multiple, Min would be worth $1.8B. Our $2M at $10M pre-money would be worth ~$360M (180x return). Even at a more conservative $60M ARR and 10x multiple, our stake would be worth ~$120M (60x return).

---

### 9. Bear Case: 0.5x Return (the "AdvisorAI Redux" Scenario)

**Assumptions:**
- Min closes 3 customers in Year 1, all at $36K ACV ($108K ARR)
- Customer feedback reveals that the 20-screen product is 80% of the way to useful and the last 20% (alert management, multi-custodian, status-aware matching) takes 12 months to ship
- Schema discovery fails on 30% of real orgs due to edge cases not encountered in testing
- Wealthbox adapter requires canonical data model changes that break existing Salesforce adapter behavior
- Jon's bandwidth is consumed by customer support for 3 firms, leaving no time for product development
- Month 12: 3 customers, $108K ARR, burn rate has increased to $25K/month (first hire), 8 months of runway remaining
- Month 18: Raise attempt at $15M pre-money, insufficient metrics for venture interest. Bridge round at $8M, flat to down round.
- Month 24: 5 customers, $240K ARR. Salesforce Agentforce launches compliance module. Two customers evaluate Agentforce.
- Month 30: Acqui-hire by RIA HQ or similar for $3-4M. Investors get 1.5-2x on $2M invested.

**What goes wrong:**
1. Jon can sell but can't close — demos convert to pilots but pilots don't convert to paid (the "30-day pilot" becomes a "90-day free trial" becomes churn)
2. Schema discovery edge cases consume 60% of engineering time — each new org reveals a classification pattern that wasn't anticipated
3. The first hire is wrong — a senior engineer who can code but can't work autonomously, requiring Jon to manage them instead of selling
4. The Agentforce threat materializes faster than expected because Salesforce acquires a vertical compliance company
5. The market turns out to be smaller than estimated — the 2,700 Salesforce RIA number is an overcount

**Bear case return:** Acqui-hire at $3-4M. Our $2M returns $600K-$800K. 0.3-0.4x return. Not a total loss (the IP has salvage value), but a significant underperformance.

**Why the bear case is realistic:**
- AdvisorAI followed an almost identical pattern: strong product evaluation feedback, enthusiastic early conversations, failure to convert interest into revenue
- The solo-founder bandwidth collapse is the most common failure mode I've seen in early-stage wealthtech
- Schema discovery is tested on <10 real orgs — the failure rate on novel org configurations is unknown

---

### 10. The Ask: Raise Amount, Valuation, Fairness

**Jon's ask:** $2M at $8-10M pre-money valuation.

**Fairness assessment:**

| Dimension | Assessment |
|-----------|-----------|
| **Stage-appropriate?** | Yes. Pre-revenue seed rounds in vertical SaaS typically range from $1.5-4M at $6-15M pre-money. Jon's ask is within range. |
| **Valuation justified?** | At the low end ($8M pre), yes. The schema discovery IP, custodian knowledge base, and CRM architecture represent 6-9 months of development value. At $10M pre, it's aggressive for a company with zero customers. |
| **Capital sufficient?** | Yes, at current burn rate. $2M at $15K/month = 133 months of solo-founder runway. With first hire at month 6, runway drops to 60-70 months. This is more than enough to reach Series A metrics (assuming the demand thesis validates). |
| **Dilution fair?** | At $10M pre-money, $2M buys 16.7% of the company. At $8M pre-money, it's 20%. Both are within the standard seed range (15-25%). |

**My recommendation on terms:** $2M at $8M pre-money ($10M post-money, 20% ownership). The lower valuation reflects the zero-customer risk. If Jon wants $10M pre-money, I'd want a milestone-based structure: $1.5M upfront, $500K released upon closing 3 paying customers within 9 months. This aligns incentives and protects against the demand risk.

---

### 11. Recommendation

**CONDITIONAL INVEST — $2M at $8M pre-money, with 3 conditions**

I recommend investing $2M in Min at $8M pre-money valuation, subject to three conditions:

**Condition 1: 90-Day Customer Milestone**

Before or within 90 days of funding, Jon must close at least 1 paying customer (not a free pilot — a signed contract with a non-zero annual commitment). This customer can be at a discounted ACV ($36K minimum). The purpose is to validate that demand converts to revenue, not just interest. Sarah Kendrick is the most likely first customer based on reference calls.

*Why this condition:* The single biggest risk in this deal is the gap between "COOs love the demo" and "COOs write checks." One paying customer doesn't prove product-market fit, but it proves that the purchase friction can be overcome. If Jon cannot close a single customer within 90 days — with a ready product, warm leads, and investor backing — the demand thesis is invalid.

**Condition 2: Technical Milestones in First 6 Months**

Within 6 months of funding, the following must be shipped:

1. Status-aware compliance matching (the false-pass fix)
2. Alert management (snooze, dismiss, escalate) in the triage queue
3. SOC 2 readiness process initiated (Vanta/Drata/Secureframe engagement signed)
4. Architecture decision record (ADR) document for the first engineering hire

*Why this condition:* These are the minimum technical requirements for closing enterprise customers. The false-pass fix is critical for compliance credibility. Alert management is the #1 retention lever. SOC 2 is required for the vendor due diligence packet that every reference call identified as a gap. The ADR reduces bus factor risk.

**Condition 3: Board Seat with Monthly Business Reviews**

Meridian takes a board observer seat (converting to a full board seat at Series A) with monthly business reviews covering: customer pipeline, conversion metrics, product milestone progress, and burn rate. The purpose is governance, not control — Jon specifically asked for an investor who would "tell me when I'm wrong."

*Why this condition:* Solo-founder companies with pre-revenue status need active board governance to avoid the common failure modes: building features no one asked for, underinvesting in sales, and ignoring unit economics. Jon's self-awareness about his sales gap is a positive signal, but awareness without accountability doesn't change behavior.

**Why I recommend investing despite the risks:**

1. **The buyer is right.** The COO at a $250M-$1B RIA has budget authority, operational pain, and urgency created by SEC examination pressure. This is the best buyer persona in the RIA ecosystem. AdvisorAI failed because the advisor buyer had no authority. Min's buyer has authority.

2. **The product is validated, not by one evaluator, but by six.** A COO who said "I could not go back to not having this." A Salesforce expert who said "genuinely novel." A compliance expert who graded it B+ and said "the clearest upgrade path I've identified for any platform." An SEC examiner who said "improved compliance posture materially." An enterprise sales strategist who said "you've built something real." These are not friends doing the founder a favor — they are domain experts with specific methodologies who independently reached the same conclusion: the core product works.

3. **The schema discovery engine is genuine IP.** After DataMesh's technical review, I'm confident that the schema discovery engine is not replicable in under 12 months. It encodes operational knowledge about Salesforce org diversity that only comes from implementation experience. With customer data flowing through it, the data network effect creates a compounding moat.

4. **The founder's self-awareness is exceptional.** In 4 years of investing, Jon is the most self-aware founder I've met. He knows his product's weaknesses (volunteered the false-pass problem unprompted). He knows his personal weaknesses (identified closing as his biggest risk). He knows his market's limitations (single custodian, zero customers). And he asked for governance rather than autonomy. This is either the sign of a founder who will listen, adapt, and survive — or a founder who is too realistic to push through the valley. I'm betting on the former, hedged by the conditions above.

5. **The capital efficiency is exceptional.** $2M buys 18+ months of runway at the current burn rate. If Min reaches $500K ARR within 18 months, the company will have raised $2M total to reach a Series A-ready revenue milestone. That's 10x more capital-efficient than the median vertical SaaS company in our portfolio. The AI-assisted development model fundamentally changes the capital equation for technical founders.

**Why I could be wrong:**

Jon might not be able to close. Conference demos and enterprise sales are different muscles. The 90-day customer milestone is my hedge against this risk, but if the first close takes 120 days instead of 90, and the second takes another 90, the revenue trajectory is too slow for Series A fundraising. The worst-case scenario isn't that Min is a bad product — it's that Min is a good product that can't find its way to revenue fast enough to justify the venture model.

---

## Closing Deliverables

### 10 Takeaways from Venture Diligence

These takeaways focus on Min as a business, not a product. The product has been evaluated extensively in Evaluations #1-5. This evaluation tests whether the business can reach venture scale.

**1. The buyer is the strongest asset Min has.**

The COO at a $250M-$1B RIA is the single best buyer persona in the wealthtech ecosystem. She has budget authority ($36K-$50K without CEO approval), measurable pain ($32K-$75K/year in labor and risk), urgency (SEC examination pressure), and decision-making speed (30-day sales cycles are realistic). Every failed wealthtech investment I've analyzed died because the buyer couldn't buy. Min's buyer can buy. This doesn't guarantee success, but it eliminates the most common failure mode.

**2. The product is real. The business is not.**

Six independent evaluators across five evaluations have validated Min's core capabilities. The compliance engine catches the right things. The schema discovery engine is genuinely novel. The custodian knowledge base has regulatory depth that surprises 18-year compliance experts. The audit trail passed a simulated SEC examination. But none of this matters until someone pays for it. The gap between "this is impressive" and "here's a wire transfer" is where most pre-revenue startups die. Min has exceptional product validation and zero revenue validation.

**3. The $60K ACV is aspirational. The realized ACV will be $36K-$48K.**

Reference calls consistently showed price sensitivity below the founder's target. The strongest lead (Sarah Kendrick) would pay $3,000-$3,500/month ($36K-$42K/year), not $5,000/month ($60K/year). The declined lead (Rachel Winters) would pay $400-$500/month ($4,800-$6,000/year) — a completely different pricing tier. Early customers will negotiate hard, and the founder acknowledged he'll discount for reference logos. Financial modeling should use $42K blended ACV for Year 1, not $60K.

**4. Single-custodian depth is a real market constraint, not just a product gap.**

Seventy percent of RIAs with $500M+ AUM use two or more custodians. Min's Schwab-only depth limits the fully addressable market to approximately 1,100 firms (Salesforce + Schwab-primary). That's a $53M TAM — a good business at 30% market share ($16M ARR), but not a venture-scale outcome. The path to $100M+ ARR requires Fidelity parity, which is 3-4 months of focused engineering that competes with every other priority (CRM expansion, alert management, SOC 2, customer support). The trade-offs are real and the bandwidth is finite.

**5. Schema discovery is the right moat, but the moat hasn't been dug yet.**

The schema discovery engine is the most defensible technical asset in the company. Its value increases with each customer's org configuration it processes. But with fewer than 10 real orgs tested, the engine is a promising foundation, not a proven moat. The confidence scoring algorithm needs exhaustive testing. The heuristic classification needs exposure to the long tail of Salesforce customization patterns. The moat becomes strong at 100+ customers. At zero customers, it's an architectural blueprint for a moat.

**6. The solo-founder model is both the strength and the constraint.**

Jon's AI-assisted development velocity is remarkable — 20 screens, 1,439 lines of schema discovery, 30+ compliance checks, and a custodian knowledge base, built by one person. This capital efficiency changes the venture math: $2M can fund 18+ months of product development and early sales. But the same solo-founder model means every hour spent on customer support is an hour not spent on product development. Every hour spent on Fidelity custodian research is an hour not spent on the Wealthbox adapter. The bandwidth constraint will become the binding constraint within 6 months of the first paying customer.

**7. The vendor documentation gap is a $0 problem being treated as a $0 problem.**

Three independent sources identified the same gap: Min doesn't provide a vendor due diligence packet (SOC 2 report, DPA, security assessment), supervisory procedure templates, or ADV disclosure language. This was the SEC examiner's #1 formal finding. It was Sarah Kendrick's pre-condition for a pilot. It was the compliance expert's recommended deliverable. The fix is documentation, not engineering. It costs time and legal review, not code. Yet it remains unaddressed because it doesn't feel like a product feature. This is a classic founder blind spot — solving technical problems while ignoring the business infrastructure that enables sales.

**8. The "examination readiness" positioning is a better story than "compliance intelligence."**

Lisa Nakamura, the former SEC examiner, offered the most actionable positioning insight of the entire diligence process: "If Min ships the vendor documentation alongside the product, Min isn't selling a compliance tool. Min is selling examination readiness." This reframes the competitive conversation entirely. "Compliance intelligence" puts Min in a crowded category with SmartRIA, Orion Compliance, and every "AI for compliance" startup. "Examination readiness" puts Min in an empty category where the competition is spreadsheets and $400/hour compliance consultants. The positioning shift costs nothing and changes everything about the GTM narrative.

**9. The consultant channel is undervalued in the GTM strategy.**

One reference call (and one T3 conference interaction) revealed that technology consultants are the highest-leverage GTM channel for Min. Ryan Marsh, a single technology consultant, can generate 3-5 qualified referrals per year. There are approximately 50-75 independent RIA technology consultants in the US who influence purchasing decisions at 20-50 firms each. Winning 10 of these consultants as active referral partners could generate 30-50 qualified leads per year at a CAC of $5,760-$7,200 (12% referral fee on $48K-$60K ACV). This is half the CAC of conferences and 10x more predictable. Jon should invest disproportionate time in the consultant channel during Year 1.

**10. The market timing is better than it looks.**

Three secular forces are converging to create the market Min is addressing. First, the SEC's examination frequency is up 15% year-over-year, and the 2025 and 2026 examination priority letters both explicitly address technology governance — this creates regulatory urgency. Second, the RIA M&A wave (200+ acquisitions per year) creates integration chaos that Min's schema discovery engine is uniquely positioned to solve. Third, the AI development tooling revolution means a solo founder can now build a competitive product at seed scale that would have required $5M+ and a 5-person team three years ago. The intersection of these three forces creates a 24-month window of opportunity. If Min can reach 100+ customers and establish the data network effect within that window, the business becomes defensible. If it can't, the window closes as larger players enter the market.

---

### 5 Questions Jon Must Answer Before Raising

These are not questions about the product. They are questions about the business that every investor will ask, and for which Jon does not currently have satisfactory answers.

**Question 1: "What is your 90-day close plan?"**

Not "what is your sales strategy" — what are the specific names, firms, dollar amounts, and calendar dates for the first 5 customer conversations? Who will you call on Day 1 after the wire clears? What is the pilot structure (duration, success criteria, conversion terms)? What is the specific ACV for each target? What happens if Sarah Kendrick says yes but only at $3,000/month?

*Why this question matters:* Every investor I respect will ask for the 90-day close plan. It separates founders who have a strategy from founders who have a hope. Jon has warm leads (Sarah Kendrick, the T3 follow-ups, Angela Torres). He needs to convert those leads into a sequenced plan with dates and dollar amounts.

**Question 2: "What does Min not do?"**

Jon needs a one-paragraph answer that he can deliver to every prospect, every investor, and every consultant: "Min does not verify that compliance tasks have been completed — it detects that they have been initiated. Min does not provide live custodial data — it encodes custodian-specific operational rules. Min does not replace Salesforce — it reads from and writes back to Salesforce as the system of record. Min does not use AI or machine learning — it uses deterministic rule-based matching with regulatory citations."

*Why this question matters:* The compliance expert's "false-pass problem," the Salesforce expert's "canonical model loses FSC fidelity," the sales strategist's "your AUM numbers aren't real" — all of these gaps were discovered during evaluation because the product's limitations weren't upfront. Setting expectations accurately before the demo prevents trust erosion during the demo. Honest scoping of capabilities is Min's fastest path to trust.

**Question 3: "What is the first hire's job description?"**

Not "senior engineer" — what specific problems will this person solve in their first 90 days? Schema discovery edge cases? Wealthbox adapter? Fidelity custodian rules? SOC 2 engineering requirements? Customer onboarding support? The answer to this question reveals Jon's prioritization of the competing demands on his bandwidth.

*Why this question matters:* The first hire is the most consequential decision in Year 1. The wrong hire (too junior, wrong specialization, can't work autonomously) costs 6 months and $80K in wasted salary. The right hire unblocks the single biggest constraint: Jon's bandwidth. The job description should be written before the fundraise, not after.

**Question 4: "What does the vendor documentation package look like?"**

Three independent evaluators identified the same gap. This is not a feature request — it's a sales prerequisite. Jon needs to produce (or commission a compliance attorney to produce): a data security whitepaper, a data processing agreement template, a SOC 2 readiness timeline, supervisory procedure templates for Min-based workflows, and ADV disclosure language guidance. This package costs $5,000-$15,000 and a month of calendar time. It should be in progress before the fundraise, not after.

*Why this question matters:* Because investors will ask whether the first customer can close, and the answer is "not without a vendor due diligence packet." If the packet doesn't exist, the 90-day customer milestone becomes a 150-day customer milestone (90 days for the packet + 60 days for the sale). That delays everything.

**Question 5: "What is the Series A bar?"**

Jon needs to articulate the specific metrics he'll need to raise a Series A in 18-24 months: ARR target, customer count, net retention, logo quality, and the narrative. Based on current market conditions for vertical SaaS, the bar is approximately: $2-3M ARR, 30-50 customers, 90%+ gross retention, 110%+ net retention, at least 2 customers above $75K ACV, and a clear path to $10M ARR. Knowing the bar shapes every prioritization decision in Year 1.

*Why this question matters:* Because a $2M seed with $15K/month burn gives Jon 18+ months before he needs to raise again. But the Series A market requires specific proof points, and the proof points take 12-18 months to build. If Jon doesn't reverse-engineer his priorities from the Series A bar, he risks arriving at Month 18 with a great product and insufficient metrics.

---

### The Diligence Synthesis: What the Numbers Don't Show

Beyond the ten takeaways, four patterns emerged from the diligence process that don't fit neatly into any scoring rubric but are important for the IC's decision:

**Pattern 1: The "Tomorrow" Pattern.** When Elena asked Sarah Kendrick if she'd do a free pilot, the answer was "Yes. Tomorrow." When she asked Rachel Winters if she'd reconsider with a Redtail adapter and 10 references, Rachel said "In a heartbeat." When she asked Angela Torres (from the T3 conference) whether the product delivered on the LinkedIn promise, Angela said "The LinkedIn post undersold the product." Three independent buyers, three immediate affirmative responses. This is not the language of polite interest — it's the language of unmet demand. Elena has invested in six companies, and the pre-sale language for the three that succeeded sounded exactly like this. The three that struggled used words like "interesting," "promising," and "we'd consider it."

**Pattern 2: The Consistent Gap Pattern.** Every evaluator — every single one, across five evaluations and six reference calls — identified the same three gaps: vendor documentation, multi-custodian support, and the false-pass problem. When six independent assessors with different expertise, different evaluation criteria, and different relationship to the product all identify the same three issues, those issues are real. But the consistency also means the issues are well-understood, well-bounded, and addressable. No evaluator identified a structural flaw — a problem that couldn't be fixed. The gaps are execution debt, not architectural debt.

**Pattern 3: The Regulatory Tailwind Pattern.** The SEC examiner, the compliance expert, and the enterprise sales strategist all independently identified the same macro trend: SEC examination pressure is increasing, and firms that can demonstrate systematic compliance monitoring have a meaningful advantage in examinations. This is not a product feature — it's a market timing observation. The regulatory environment is moving in Min's direction, creating urgency that didn't exist 3 years ago and may not exist 3 years from now. The window is open, and Min is positioned to walk through it.

**Pattern 4: The Founder Honesty Pattern.** In the 90-minute deep dive, Jon volunteered three significant product limitations unprompted: the false-pass problem, the Fidelity depth gap, and his inability to close enterprise deals. In my experience, founders who volunteer weaknesses are either demoralized (rare at this stage) or deeply self-aware (also rare). Jon's transparency was independently corroborated by every evaluator's experience — Megan Calloway noted his honesty about implementation timelines, Sarah Kendrick noted his transparency about product limitations, and Marcus Webb noted that "the product is ahead of its documentation" (implying the founder communicates capability accurately). This pattern of radical transparency is either the strongest or the most unusual founder signal I've encountered at Meridian. It doesn't predict success — but it predicts coachability, which is the single best predictor of a first-time founder's ability to navigate the valley of death.

---

### Investment Thesis in 3 Sentences

The COO at a mid-market RIA has $50K-$75K/year of quantifiable operational pain, budget authority to spend $36K-$60K/year on relief, and increasing regulatory urgency from SEC examination pressure. Min is the only product that sits on top of the existing CRM, auto-discovers the firm's data structure, and provides compliance monitoring with custodian-specific operational knowledge — a combination that would take any competitor 12-18 months to replicate. At $2M invested with $15K/month burn, Min has 18 months to convert validated product interest into revenue, making this among the most capital-efficient bets in our portfolio's history.

### Anti-Thesis in 3 Sentences

Min has zero customers, zero revenue, and a solo founder who has never closed an enterprise deal — the gap between enthusiastic product evaluations and signed contracts has killed every comparable company in our deal flow history. The addressable market at current product capability (Salesforce + Schwab-primary) is ~$53M, which caps the upside at 30% market share ($16M ARR) absent CRM and custodian expansion that will consume 6-12 months of a single engineer's time. The 18-24 month window before Salesforce Agentforce competition means Min must reach 100+ customers to establish defensibility, a pace that requires 2.5 new customers per month in Year 2 — a velocity that no vertical SaaS company in our portfolio has achieved at this stage.

---

*End of Venture Diligence Evaluation*

*Prepared by Elena Voss, Partner, Meridian Ventures*
*February 2026*

*This document is confidential and intended for Meridian Ventures Investment Committee review only. Distribution outside of Meridian Ventures requires written approval from the deal lead.*

---

**Evaluation Cross-Reference Index**

| Evaluation | Evaluator | Role | Key Finding Referenced |
|-----------|-----------|------|----------------------|
| #1 | Sarah Kendrick | COO, Ridgeline Wealth Partners | "I could not go back to not having this" — demand validation, price sensitivity ($3,000-$3,500/mo) |
| #2 | T3 Conference Attendees | Mixed (COOs, CCOs, consultants) | 50% qualified-lead rate, consultant channel value (Ryan Marsh), acquisition positioning (Robert Hargrove) |
| #3 | Megan Calloway | Salesforce/FSC Expert | Schema discovery "genuinely novel," 18-24 month Agentforce window, single-custodian market constraint |
| #3b | Marcus Webb | Compliance Expert | False-pass problem (critical), B+ grade, "clearest upgrade path" |
| #5 | Lisa Nakamura | SEC Examiner (Retired) | "Improved compliance posture materially," vendor documentation gap, examination readiness positioning |
| Sales | Sarah Chen | Enterprise Sales Strategy | $39/user entry pricing, Schwab-only depth "trust evaporates," 90-day pilot structure |

---
