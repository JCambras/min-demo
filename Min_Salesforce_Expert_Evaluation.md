# Min Product Evaluation #3: Salesforce/Schwab Integration Expert
## Conducted by Megan Calloway, Principal — Calloway Advisory Technology

---

# PART 1: THE PERSONA

## Megan Calloway

**Age:** 39. **Location:** Boston, MA (moved from SF after leaving Salesforce). **Title:** Principal, Calloway Advisory Technology — an independent consultancy advising RIAs on CRM strategy, technology selection, and implementation governance.

### Career Arc

**Phase 1: Salesforce (2016-2021)**

Megan joined Salesforce in 2016 as a Product Manager on the Financial Services Cloud team, six months after FSC's GA launch. She was directly responsible for the Household model — specifically, the pivot from the original "Account hierarchy" approach (where a Household was just an Account with child Account records) to the more relational model that introduced `FinServ__FinancialAccount__c`, `FinServ__FinancialAccountRole__c`, and the ActionPlan framework.

She sat in 200+ customer feedback sessions with RIA COOs, compliance officers, and ops managers. She heard the same complaint in every session: *"Salesforce can do anything, but it takes us 9 months and $300K to make it do the one thing we actually need."*

She saw FSC win deals on customizability and enterprise credibility. She saw it lose implementations because the platform tried to serve banking, insurance, and wealth management with the same object model. Wealth management always got the short end — Person Accounts were designed for retail banking, the Financial Account object was modeled after institutional custody, and the Household record type was an afterthought bolted onto the Account object because Salesforce refused to create a first-class Household entity.

She left in 2021, frustrated that Salesforce's horizontal strategy meant wealth management features were always six months behind the roadmap promises she made to customers.

**Phase 2: Silverline (2021-2024)**

She moved to Silverline, the largest Salesforce SI specializing in financial services. As a Senior Account Executive, she sold and scoped 34 FSC implementations for RIAs ranging from $400M to $8B AUM.

She learned the brutal economics of RIA implementations:
- Average scoped timeline: 5 months. Average actual timeline: 11 months.
- Average scoped budget: $175K. Average actual cost: $380K.
- Firms that bought FSC and used more than 40% of it within 12 months: 3 out of 34.
- Advisors who actually logged into Salesforce daily after implementation: ~35%.

She personally scoped 7 Schwab Advisor Center integrations and 3 BridgeFT implementations. She knows the specific limitations of Schwab's Advisor Services API: the account data comes back in a flat structure that doesn't match the hierarchical view advisors see in Schwab Advisor Center. Position data is T+1 at best, T+2 for some account types. Account opening via API is possible for basic account types but requires manual steps for trusts, entities, and anything involving third-party managers. The Schwab API documentation says "real-time" in places where the actual behavior is "within 24 hours." She has filed 11 support tickets with Schwab's advisor technology team.

She has implemented BridgeFT's Atlas platform for 3 clients. She knows it solves custodial data normalization beautifully for portfolio reporting and performance calculation. She also knows it does not solve real-time account opening workflows, money movement initiation, or document routing. BridgeFT is a read layer, not a write layer.

**Phase 3: Calloway Advisory Technology (2024-present)**

She launched her consultancy in early 2024. Active clients include:
- 4 firms on Salesforce FSC (ranging from vanilla to heavily customized)
- 2 firms on Wealthbox
- 1 firm on Redtail (migrating to Wealthbox)
- 1 firm evaluating CRM options from scratch

She has been pitched by or evaluated: Practifi, XLR8, Orion Planning, Jump Technology, Zocks (AI meeting notes), VRGL (statement parsing), Nitrogen (formerly Riskalyze), and AdvisorEngine in the last 12 months.

Her consulting engagements run $15K-$25K for a technology evaluation, $40K-$75K for implementation oversight. She speaks at T3 Enterprise, the Kitces Platform conference, and writes a monthly column for WealthManagement.com.

### Evaluation Framework

Megan uses a proprietary 7-factor framework she calls the "Integration Reality Score" (IRS — yes, she knows the acronym is unfortunate, and she keeps it anyway):

1. **Data Model Fidelity** — Does the product understand the actual CRM data model, or does it assume a vanilla installation?
2. **Custodian Accuracy** — Does the product reflect real custodian behaviors, or does it model an idealized version of how custodians work?
3. **Implementation Honesty** — Is the stated implementation timeline achievable, or is it marketing?
4. **Advisor Adoption Surface** — How much of the product requires advisor behavior change?
5. **Compliance Defensibility** — Would this help or hurt in an SEC examination?
6. **Architecture Portability** — What happens if the firm changes CRM or custodian?
7. **Founder Risk** — What happens if the founder gets hit by a bus?

### The Question That Kills Most Demos

*"Show me what happens when the Salesforce org doesn't look like your demo org."*

Every wealthtech product demos beautifully against a clean Salesforce sandbox. Megan asks vendors to connect to one of her client's actual orgs — the one with 47 custom fields on Account, a custom `Practice_Group__c` object that replaced FSC Households, 3 managed packages (Practifi, Conga, FormAssembly), and validation rules that block Account creation unless `Compliance_Status__c` is populated. 90% of products fail this test immediately.

### Her Blog Post: "Why RIA Middleware Always Fails" (August 2025)

**Thesis:** Middleware products for RIAs fail for three structural reasons, not product reasons:

1. **The Schema Problem.** Every Salesforce org is different. A middleware product that works for firm A's vanilla FSC breaks on firm B's customized FSC. Building adapters for every org configuration is a never-ending engineering tax that eventually bankrupts the product roadmap.

2. **The Write Problem.** Read-only integrations are easy. Writing data back to Salesforce — creating tasks, updating records, triggering workflows — requires understanding the target org's validation rules, triggers, flows, and field-level security. Most middleware products punt on writes and become expensive dashboards.

3. **The Adoption Problem.** Middleware adds a layer. Advisors already resist logging into their CRM. Adding a second system they need to check is a non-starter. The only middleware that survives is middleware that makes the CRM unnecessary to log into — and that's functionally a CRM replacement, which means you're competing with Salesforce, not complementing it.

**Her conclusion:** The only middleware that can work long-term is one that (a) auto-discovers the CRM schema so it doesn't need per-org configuration, (b) writes back to the CRM so the CRM stays the system of record, and (c) replaces the CRM login for daily operations so advisors don't need to learn two systems.

---

# PART 2: THE EXPERT EVALUATION

## Day 1: Architecture and Data Model Review

### 1. Salesforce FSC Data Model Mapping

Megan's first action is to read Min's schema discovery engine (`schema-discovery.ts` — 1,416 lines). Her eyebrows go up.

**What she finds:** Min doesn't assume a specific FSC configuration. Instead, it runs a 7-8 API call metadata collection phase that inventories the org's objects, record types, field schemas, active flows, triggers, and validation rules. It then applies heuristic classification to determine:

- How the org models Households (FSC RecordType, Account Type picklist value, custom object, or managed package like Practifi's `cloupra__Household__c`)
- Whether Person Accounts are enabled
- Whether FSC Financial Accounts exist
- Where AUM data lives (FinancialAccount rollup, custom AUM field on Account, or not available)
- What automation exists that might interfere with writes (task flows, account triggers, validation rules)

The output is an `OrgMapping` that gets persisted in an encrypted httpOnly cookie (AES-256-GCM, 90-day TTL).

**Her reaction:** "This is the first product I've evaluated that actually tries to solve the Schema Problem from my blog post. Every other product I've tested assumes vanilla FSC or requires a 40-hour configuration engagement to map custom fields. Min's approach is heuristic — it won't be perfect — but the fact that it detects Practifi managed packages, handles unrestricted picklist values by actually querying the data, and inventories automation risks is genuinely novel."

**Her concern:** "The heuristics cover maybe 85% of orgs. But the 15% they miss are the most expensive clients — the $2B+ firms with complex configurations. The fallback path when heuristics fail isn't clear. Does it surface an error? Does it degrade gracefully? What happens when it misclassifies a custom object as a household when it's actually a lead group?"

**Her specific technical observation on Household detection:** Min's priority order (Managed package → RecordType → Type picklist → Type in data → Custom object → Fallback) is correct. But she notes that some firms use a hybrid: they have a "Household" RecordType AND a custom junction object that links contacts to households. Min's OrgMapping would pick the RecordType match and miss the junction object, which means contact-to-household relationships could be wrong for those firms.

### 2. The CRM-Agnostic Architecture

Megan examines the hexagonal architecture in `crm/port.ts`, `crm/types.ts`, and `crm/adapters/salesforce.ts`.

**What she finds:** A clean `CRMPort` interface with canonical types (`CRMHousehold`, `CRMContact`, `CRMTask`, `CRMFinancialAccount`) and a factory pattern for adapter selection. Currently only the Salesforce adapter is implemented, but the contract is well-defined.

**Her assessment:** "The canonical model is pragmatic. It maps the intersection of what Salesforce FSC, Wealthbox, and Redtail can all represent: households, contacts, tasks, and financial accounts. The problem is what it loses."

**What's lost in translation:**
- **Salesforce FSC → Canonical:** Financial Account Roles (who owns what percentage of a joint account), Financial Holdings (individual positions within an account), Opportunities (pipeline deals), Cases (service requests), and the entire ActionPlan framework. These are things FSC firms use heavily.
- **Wealthbox → Canonical:** Wealthbox has tags, categories, and custom fields that don't map to anything in the canonical model. A firm that uses Wealthbox tags to segment clients by service tier loses that segmentation in Min.
- **Redtail → Canonical:** Redtail's activity categories, custom contact types, and workflow automation rules have no canonical equivalent.

"The canonical model works for the 60% of CRM data that's commodity (names, tasks, accounts). It doesn't work for the 40% that's firm-specific. And that 40% is the reason firms chose their CRM in the first place."

### 3. The Schwab Integration

Megan looks for BridgeFT integration code and doesn't find it.

**What she actually finds:** Min's custodian integration is not through BridgeFT. It's a configuration-driven custodian abstraction layer (`custodian.ts`, `custodian-rules.ts`) that models custodian-specific behaviors — document requirements, NIGO rules, signer counts, income eligibility checks, contribution limits — as a rule engine. The `ACTIVE_CUSTODIAN` environment variable switches the entire platform's custodian context.

**Her reaction:** "This is... different from what I expected. Min isn't pulling live custodial data through BridgeFT. It's encoding custodian knowledge — Schwab's NIGO rejection rules, account type requirements, document naming conventions — into a deterministic rule engine. That's actually more useful for account opening than live data would be. BridgeFT gives you position data. Min gives you 'if you submit this IRA without a beneficiary designation, Schwab will reject it as NIGO, and it's the #1 rejection reason.' That's operational intelligence, not data integration."

**Her concern:** "But the Custodian Knowledge Base is static. Schwab changes their forms and requirements quarterly. Who updates the rules? If Min is a solo-founder product, the KB maintenance is a ticking time bomb. It works perfectly today and becomes stale in 6 months."

### 4. The SOQL and Governor Limits Handling

Megan examines `sf-client.ts` and the API route handlers.

**What she finds:**
- SOQL input sanitization is centralized and mandatory (escapes quotes, LIKE wildcards, control characters, length-limited to 200 chars)
- Salesforce ID validation prevents injection via record IDs
- Client timeout: 35s (server: 30s) with 2 retries, exponential backoff (600ms * 2^attempt)
- Transient status codes (502, 503, 504) trigger retry; 4xx errors don't
- CSRF protection on all mutations with auto-refresh on 403

**Her assessment:** "The SOQL sanitization is better than what I see in most Salesforce ISV products. The governor limit handling is... adequate for current scale. Schema discovery uses 7-8 API calls per org — that's fine. But the real question is what happens at scale. If Min is polling 100 orgs for schema changes, or running health score computations that require per-household SOQL queries across 500 households, you'll hit the 100,000 daily API call limit on production orgs. I don't see bulk query patterns or composite request optimization."

### Day 1 Summary

**Architectural strength she didn't expect:** The Schema Discovery Engine. It's the first product she's seen that treats "every Salesforce org is different" as a core architectural problem rather than a configuration burden pushed onto the customer. The heuristic approach isn't perfect, but it's the right idea.

**Architectural weakness that concerns her most:** The canonical CRM model loses too much fidelity for complex FSC installations. Firms that have invested $300K+ in customizing their FSC instance will find that Min can't see 40% of what they built. This limits Min's addressable market to firms with simpler CRM configurations — which, ironically, are the firms that need Min least.

**Comparison to a specific product that tried this before:** Skience (before InvestCloud acquired it) tried to be an orchestration layer between Salesforce and custodians in 2017-2019. It failed because it hardcoded its Salesforce integration against a specific FSC configuration and broke on every customized org. Min's schema discovery approach directly addresses Skience's failure mode. The question is whether heuristic discovery can scale to handle the long tail of org configurations that Skience couldn't.

**Viability assessment:** Viable at 5-20 firms with standard-to-moderate FSC customization. Viable at 50+ firms only if the schema discovery heuristics are expanded to handle hybrid household models, junction objects, and complex validation rule environments. Not viable at 100+ firms without a manual override layer that lets implementation consultants correct heuristic misclassifications.

---

## Day 2: Feature Evaluation Against Her Client Base

### Client A: $800M firm on Salesforce FSC + Schwab

**Configuration:** Heavy customization — custom `Lead_Source_Channel__c` object, a custom account opening workflow built in Salesforce Flows (not standard process builder), 47 custom fields on Account (including `Compliance_Status__c` with a validation rule that blocks Account creation unless it's populated), and Conga for document generation.

**Assessment:** Min's Schema Discovery would detect the custom fields and the validation rule. But the Conga integration is invisible to Min — Min generates its own documents through PDF routes, so there would be duplicate document workflows. The custom Flow-based account opening process would conflict with Min's flow screen. Min would need to either replace the Flow entirely (which the firm won't agree to, since they spent $60K building it) or defer to it (which means Min's account opening flow is unusable for this client).

**Verdict:** Min works for this firm's compliance monitoring and health scoring. It does NOT work for account opening. Partial fit — 40% of Min's value proposition applies.

### Client B: $2B firm on Salesforce FSC + Schwab + Fidelity

**Configuration:** Dual-custodian. FSC with Financial Account objects that have a custom `Custodian__c` picklist field. They need health scoring and compliance monitoring across both custodians.

**Assessment:** Min's `ACTIVE_CUSTODIAN` environment variable is a single-value switch. The entire platform assumes one custodian at a time. For this firm, Min would need to run Schwab rules on Schwab accounts and Fidelity rules on Fidelity accounts simultaneously. The custodian rules engine doesn't support per-account custodian context — it's global. This is a fundamental architecture issue, not a feature gap.

**Verdict:** Not a fit today. The dual-custodian problem is solvable (make custodian context per-account instead of per-platform) but requires meaningful architectural work.

### Client C: $400M firm on Wealthbox + Schwab

**Configuration:** Min's sweet spot on paper. Clean Wealthbox with good API access, Schwab-only.

**Assessment:** The Wealthbox adapter doesn't exist yet. Min has the `CRMPort` interface ready, but no implementation. This firm can't use Min today. When the adapter ships, the canonical model will lose Wealthbox's tagging system, which this firm uses to segment clients into service tiers (Platinum / Gold / Silver). That segmentation drives their compliance review frequency — Platinum clients get quarterly reviews, Silver clients get annual. Min's compliance engine treats all households equally.

**Verdict:** Not available today. When available, partial fit — compliance monitoring works but loses the service-tier logic that drives the firm's actual compliance workflow.

### Client D: $1.2B firm migrating from Salesforce FSC to Wealthbox

**Configuration:** Mid-migration. Both systems active. CRM data spread across two platforms for the next 6-9 months.

**Assessment:** Min can't read from two CRM systems simultaneously. The `CRMPort` factory returns a single adapter. During migration, this firm would need Min connected to Salesforce (where historical data lives) AND Wealthbox (where new data goes). No path to this today.

**Verdict:** Not a fit during migration. Could evaluate post-migration when Wealthbox adapter ships.

### Day 2 Summary

**Client she'd recommend Min to first:** A $500M-$1B firm on Salesforce FSC with Schwab-only custody, moderate customization (standard record types, some custom fields, no managed packages), and a COO who currently tracks compliance in spreadsheets. This is Min's sweet spot — the firm gets immediate value from health scoring, compliance monitoring, and the account opening flow, and the Schema Discovery handles their org without manual configuration.

**Client she'd tell to wait:** Any firm with dual-custodian relationships, heavy FSC customization (managed packages, custom flows), or a CRM other than Salesforce. These firms represent 60%+ of her client base.

**Feature gap that surfaces across multiple clients:** Per-household or per-account custodian context. Every firm she works with either has multiple custodians today or is planning to add one. The single-custodian architecture is the biggest market constraint.

**Pricing assessment:** The firms that fit Min's current profile (single-custodian, moderate-complexity Salesforce) are typically paying $120-$180/user/month for Salesforce licensing + $40-$80/user/month for add-ons (Practifi, Conga, etc.). Min needs to price below the add-on layer — $30-$50/user/month — to be a complement, not a replacement. If Min prices above $60/user/month, firms will compare it to Practifi and expect Practifi-level depth. If it prices below $30/user/month, consultants won't recommend it because their implementation fee would exceed 12 months of product cost.

---

## Day 3: Go-to-Market and Competitive Assessment

### 1. The "Between Tool" Positioning

Min calls itself an orchestration layer between the CRM and the custodian. Megan has heard this exact pitch from:

- **ActiFi (2014-2018):** Tried to be the workflow layer between CRM and custodian. Failed because it couldn't write back to Salesforce reliably. Became a reporting tool. Acquired by Broadridge, now irrelevant.
- **Skience (2015-2020):** Tried to be the compliance and operations layer on top of Salesforce. Failed because it hardcoded against vanilla FSC and broke on every customized org. Acquired by InvestCloud, folded into their platform.
- **Riskalyze/Nitrogen (2015-present):** Tried to be the risk tolerance middleware between CRM and portfolio management. Succeeded in its narrow lane because it solved one specific problem (risk scoring) extremely well and didn't try to be a platform. Struggled when it expanded beyond risk into "compliance" and "client experience."

**Pattern she sees:** Middleware that succeeds picks ONE problem and solves it completely. Middleware that fails tries to be a platform from day one. Min is attempting platform-level scope (compliance + account opening + health scoring + dashboard + workflows + briefing + meetings + money movement + documents) as a solo-founder product.

### 2. The Practifi Comparison

Megan has implemented Practifi for 6 clients. It's Salesforce-native, built on the FSC data model, and solves workflow automation, compliance tracking, and practice management inside Salesforce.

**Where Min genuinely differentiates:**
- Schema Discovery — Practifi requires manual configuration for every org. Min auto-discovers.
- Custodian Knowledge Base — Practifi has no custodian-specific intelligence. Min knows Schwab's NIGO rules.
- Health Scoring — Practifi tracks workflow completion but doesn't compute a composite health score with decomposition.

**Where the differentiation is marketing:**
- "CRM-agnostic" — Today, Min is Salesforce-only. The CRM-agnostic architecture exists in code but not in production. Practifi is also Salesforce-only, but it doesn't claim otherwise.
- "AI-powered" — Min's compliance engine is keyword-matching against task text, not machine learning. The NIGO prevention is a rule engine, not AI. These are good features, but calling them AI sets expectations that the product doesn't meet.

### 3. The Salesforce Agentforce Threat

Megan still has contacts at Salesforce. She knows:

- Agentforce for Financial Services is in pilot with 8 firms as of late 2025.
- It's focused on client communication automation (email drafts, meeting prep, task creation) — not compliance or account opening.
- Salesforce's 2026 roadmap includes "Agentforce Actions for FSC" which would automate compliance reviews and household health scoring inside Salesforce.
- The 2027 roadmap includes custodian integration through MuleSoft connectors.

**Her timeline assessment:**
- **12 months (early 2027):** Agentforce for FSC will offer AI-generated meeting prep and task automation. Overlaps with Min's briefing and workflow features.
- **24 months (early 2028):** Agentforce Actions for FSC will include compliance scoring and health metrics. Direct overlap with Min's core value proposition.
- **36 months (2029):** If Salesforce executes well (big "if"), Agentforce + MuleSoft will offer custodian-aware compliance and account opening inside Salesforce natively.

"Min has a 24-month window where it offers capabilities Salesforce can't match. After that, the differentiation needs to come from implementation speed, cost, and the CRM-agnostic story. If Min hasn't built the Wealthbox and Redtail adapters by then, the CRM-agnostic positioning is hollow and Salesforce eats the entire market."

### 4. The Orion Threat

Orion owns Redtail, has Eclipse (portfolio management), has trading, and is building an integrated suite. They could build compliance monitoring and health scoring as features of the Orion platform.

**Her assessment:** "Orion is moving slowly on integration. Eclipse and Redtail still feel like separate products. But they have 2,500+ RIA clients and the data. If Orion ships a 'Practice Health Score' feature that works across Redtail + Eclipse, Min's Redtail adapter becomes irrelevant before it launches. The good news: Orion is bad at execution speed. The bad news: they have the distribution to make Min irrelevant overnight if they copy the concept."

### 5. The Channel Question

Megan would sell Min through the implementation consultant channel — people like her. Here's why:

- COOs don't buy software from cold outreach. They buy from their consultant's recommendation.
- The buying motion is: COO calls consultant → consultant evaluates 3-4 options → consultant recommends one → COO buys.
- Megan's recommendation carries $500K-$2M in lifetime value per client.

**But the channel economics need to work:**
- Consultants need a referral fee or implementation revenue. If Min's "25-day implementation" means there's no implementation revenue for the consultant, consultants won't recommend it.
- Consultants need to see the product work on their client's actual org before recommending it. The Schema Discovery demo is the key — if Megan can connect Min to a client's sandbox and see it auto-discover, she'll believe the product. If she has to take Min's word for it, she won't.

### 6. The Implementation Question

"25 days to implement" — Megan's reaction: "25 days to do what, exactly?"

Her average FSC implementation takes 6-9 months and includes: requirements gathering (4-6 weeks), data model configuration (4-6 weeks), data migration (2-4 weeks), workflow automation (4-8 weeks), testing (2-4 weeks), training (2-3 weeks), hypercare (4 weeks).

Min's 25 days presumably skips requirements gathering (Schema Discovery does it), data model configuration (auto-discovered), data migration (reads from existing CRM), and workflow automation (built-in). That leaves training and hypercare.

"If Schema Discovery actually works — and I've seen evidence that it does for standard orgs — then 25 days is honest for the firms it fits. But it's 25 days for a simpler product. My 9-month implementations deliver a fully customized CRM. Min delivers a read-and-react layer. These aren't comparable timelines for comparable outcomes."

### Day 3 Summary

**Competitive threat Min underestimates:** Salesforce Agentforce. Not because Agentforce is good today (it's not), but because Salesforce will bundle it with FSC licensing at no incremental cost. When the COO's existing vendor offers "free" compliance scoring, Min's $30-$50/month fee becomes a harder sell, even if Min's implementation is better.

**Competitive advantage Min undersells:** Schema Discovery. This is genuinely novel. Every other product requires manual configuration or professional services to map a Salesforce org. Min does it in 7-8 API calls. This should be the headline of every sales conversation: "Connect your Salesforce org. In 60 seconds, Min understands your data model. No configuration, no consultant, no waiting."

**Recommended positioning adjustment:** Stop saying "AI-powered orchestration platform." Start saying "The only operations layer that auto-discovers your Salesforce org. Connect in 60 seconds. See your practice health in 5 minutes." Lead with Schema Discovery, not AI. Lead with speed, not features.

**"Would I refer my clients to Min" verdict:** Yes, under these conditions:
1. Single-custodian (Schwab) firms only — until multi-custodian ships
2. Salesforce FSC firms with standard-to-moderate customization — until schema discovery handles edge cases
3. Firms where the COO tracks compliance in spreadsheets — Min replaces the spreadsheet, not the CRM
4. Firms that have NOT invested $200K+ in FSC customization — those firms should use Practifi, not Min
5. Megan gets a sandbox demo on the client's actual org before recommending — Schema Discovery is the proof point

---

# PART 3: THE EXPERT INTERVIEW

*The following is a simulated interview between Megan Calloway and Jon Cambras (Min's CTPO). Megan's responses reflect deep Salesforce FSC expertise, real Schwab API knowledge, and genuine competitive intelligence.*

---

**1. The Architecture Question**

*"Walk me through how Min maps to FSC's data model. Specifically: Person Accounts or Individual model? How do you handle Financial Account Roles? What happens when a firm has custom objects?"*

**Megan's assessment after Jon's explanation:**

"The schema discovery approach is the right answer to the right question. You're detecting Person Accounts, Record Types, custom objects, managed packages, and unrestricted picklist values. That covers 80-85% of the orgs I've implemented.

Here's where it breaks: Financial Account Roles. Your canonical model has `CRMFinancialAccount` with a `householdId`, but FSC's `FinancialAccountRole__c` is a junction object that links one Financial Account to multiple Accounts (owner, joint owner, beneficiary, trustee). When a $10M trust account has three roles — grantor, trustee, and beneficiary — your canonical model picks one household and loses the other two relationships. For firms that use Financial Account Roles extensively (about 30% of my FSC clients), your health score computation could attribute AUM incorrectly.

And the custom object detection — your regex matching for `/household|hh_|family|client_group/i` is clever, but I have a client whose household equivalent is called `Engagement__c`. That won't match. You need a manual override path for edge cases."

---

**2. The Schwab Question**

*"You're going through BridgeFT for custodial data. Tell me what you get from BridgeFT that you couldn't get from Schwab directly, and what you lose."*

**Megan's assessment:**

"Actually — I was surprised to find you're NOT going through BridgeFT. Your custodian integration is a rules engine, not a data pipeline. You've encoded Schwab's NIGO rejection rules, document requirements, and account type constraints into `custodian-rules.ts`. That's a fundamentally different approach.

What you get: operational intelligence that BridgeFT can't provide. BridgeFT tells you the current balance of an account. Your rules engine tells you that submitting an IRA without a beneficiary designation will get rejected by Schwab 60% of the time. That's more valuable for an operations workflow.

What you lose: live custodial data. You can't show the COO real-time account balances, position data, or pending transactions. Your health score uses estimated AUM ($2M per household assumption) instead of actual custodial AUM. For a principal trying to assess practice health, estimated AUM is a meaningful limitation.

The bigger risk: your Custodian Knowledge Base is static. Schwab changed their IRA beneficiary form requirements in Q3 2025. They updated NIGO rejection codes in January 2026. How does your KB stay current? I've seen three products build custodian rule engines, and all three fell behind within 18 months because nobody maintained the rules."

---

**3. The Schema Discovery Question**

*"You claim Min can auto-discover a firm's Salesforce configuration. I've seen firms with 200+ custom fields and 30 custom objects on FSC. Does Schema Discovery actually handle that, or does it work on clean implementations and break on real ones?"*

**Megan's assessment:**

"I looked at the code. Your Schema Discovery makes 7-8 API calls, collects metadata, and applies heuristic classification. For a firm with standard FSC — Household RecordType, standard Financial Accounts, standard Contact model — it works. I believe that.

For the 200-custom-field org: your discovery collects the metadata, but your heuristics don't know which custom fields matter. A firm with `Compliance_Review_Date__c` on Account would benefit enormously from Min reading that field, but your canonical model doesn't have a slot for it. You're collecting metadata you can't use.

For the 30-custom-object org: your `candidateCustomObjects` detection finds objects matching RIA keywords, but it can't determine relationships between custom objects. If a firm has `Engagement__c` → `Service_Agreement__c` → `Fee_Schedule__c`, your discovery sees three custom objects but doesn't understand the hierarchy.

My recommendation: ship a 'Discovery Results' screen that shows the COO what Min found and lets them correct misclassifications. Today, the discovery is a black box. Making it transparent would fix 90% of the edge cases because the COO knows their own org."

---

**4. The SOQL Limits Question**

*"Salesforce has API call limits, SOQL query limits, and governor limits that kill real-time integrations. How does Min handle this?"*

**Megan's assessment:**

"Your SOQL sanitization is solid — better than most ISVs I've reviewed. The retry logic with exponential backoff handles transient failures well.

But I don't see governor limit awareness in the query patterns. Your `queryTasks` handler fetches up to 200 tasks with a single SOQL query. For a firm with 5,000 tasks across 300 households, that works. For a firm with 50,000 tasks (which is common at $2B+ firms), you'll hit SOQL row limits (50,000 rows per transaction) and your query will silently truncate results, giving the COO an incomplete health score without any indication that data is missing.

More critically: your Schema Discovery uses the Tooling API for flows, triggers, and validation rules. The Tooling API has separate rate limits from the REST API, and they're more restrictive for sandbox orgs. I've seen Schema Discovery-like approaches fail on sandbox orgs during evaluation because the Tooling API rate limit is 5 concurrent requests for Developer Edition orgs.

You need query pagination for large orgs and explicit rate limit headers (`Sforce-Limit-Info`) monitoring."

---

**5. The Wealthbox Comparison**

*"I have clients on both Salesforce and Wealthbox. How does your canonical model handle the fidelity difference?"*

**Megan's assessment:**

"Your canonical types — `CRMHousehold`, `CRMContact`, `CRMTask`, `CRMFinancialAccount` — represent the lowest common denominator. For Wealthbox, that means you can map contacts, tasks, and basic household groupings. You lose tags (which Wealthbox firms use for everything — service tiers, client segments, marketing lists), categories, custom fields, and the activity stream.

For a Wealthbox firm, Min would provide health scoring and compliance monitoring based on tasks and contacts. That's 40-50% of the value proposition. The account opening flow and custodian rules engine would work identically regardless of CRM. But the home screen insights, triage priorities, and practice intelligence dashboard would be less rich because Wealthbox simply has less structured data to analyze.

The honest answer: Wealthbox users lose depth, Salesforce users get the full experience. That's fine — but you need to set expectations. Don't demo the Salesforce experience and tell Wealthbox prospects they'll get the same thing."

---

**6. The Middleware Graveyard**

*"I've watched ActiFi, Skience, and a dozen other middleware products for RIAs come and go. What's different about Min?"*

**Megan's assessment:**

"ActiFi failed because it was read-only. It could show you what was in Salesforce, but it couldn't write back. Advisors had to log into ActiFi to see data and log into Salesforce to act on it. Two logins, zero adoption.

Skience failed because it was hardcoded. It worked on the Salesforce configuration their engineering team tested against and broke on every other org. When clients complained, Skience sent implementation consultants to manually configure each deployment, which turned a software product into a services business. Services businesses don't scale.

Nitrogen (Riskalyze) succeeded because it picked one problem — risk tolerance scoring — and solved it completely. It didn't try to be a platform. It was a tool that produced a specific output (a risk score) that advisors could use without changing their workflow.

Min's structural difference from ActiFi: Min writes back to Salesforce. Tasks created in Min become Salesforce tasks. Compliance reviews are recorded as Salesforce records. The CRM stays the system of record. That solves the two-login problem.

Min's structural difference from Skience: Schema Discovery. Min adapts to the org instead of requiring the org to adapt to Min. That's the right architecture.

Min's risk relative to Nitrogen: scope. Nitrogen succeeded with one feature. Min is attempting 12 features (compliance, account opening, health scoring, dashboard, briefing, meeting logs, planning, money movement, documents, workflows, task management, reconciliation). Each feature needs to work as well as Nitrogen's one feature, and that's a massive surface area for a solo-founder product.

My honest assessment: Min has the right architecture to avoid ActiFi and Skience's failure modes. But it has Nitrogen's focus problem in reverse — too many features, not enough depth in each one. I'd rather see three features that are world-class than twelve features that are good."

---

**7. The Practifi Question**

*"For a firm already on FSC, why wouldn't they just use Practifi instead of adding another layer?"*

**Megan's assessment:**

"Practifi is the right answer for firms with $200K+ implementation budgets and 6+ months of runway. It's Salesforce-native, deeply integrated with the FSC data model, and handles workflow automation, compliance tracking, and practice management without adding another vendor.

Min is the right answer for firms that can't afford Practifi's implementation cost, don't want to wait 6 months, or have already invested in FSC and want operational intelligence on top of what they built. Min's Schema Discovery means you're productive in days, not months. Practifi requires a dedicated implementation partner (like me) charging $150-$250/hour.

The real differentiation: Practifi doesn't have custodian intelligence. It doesn't know Schwab's NIGO rules. It doesn't compute a composite health score. It's a better workflow tool; Min is a better intelligence tool. They're complementary, not competitive — but Min needs to understand that and position accordingly. Saying 'we replace Practifi' is wrong. Saying 'we add intelligence that Practifi doesn't provide' is right."

---

**8. The Agentforce Question**

*"Salesforce Agentforce is coming. What happens when Salesforce builds the orchestration layer themselves?"*

**Megan's assessment:**

"I know what's on the Agentforce roadmap. Client communication automation is shipping now. Compliance scoring is 18-24 months out. Custodian integration through MuleSoft is 30-36 months out.

Min has a window. But the window is defined by two things: (1) how fast Min builds the Wealthbox and Redtail adapters, and (2) how fast Agentforce gets good enough.

If Min is CRM-agnostic with three working adapters by mid-2027, Agentforce is irrelevant because Agentforce only works inside Salesforce. The CRM-agnostic story becomes Min's moat.

If Min is still Salesforce-only in mid-2027, Agentforce will eat it alive. Salesforce will bundle compliance scoring with FSC licensing at no incremental cost. No COO will pay $40/user/month for Min when Salesforce offers 'free' compliance scoring built into their existing platform.

The clock is ticking. The Wealthbox adapter isn't a feature — it's survival."

---

**9. The Implementation Question**

*"You say 25 days to implement. Walk me through exactly what happens in those 25 days."*

**Megan's assessment:**

"If Schema Discovery works on the target org — and for standard FSC installations, I believe it does — then 25 days is honest for Min's scope. But let's be clear about what '25 days' includes and what it doesn't.

**What it includes:** Connect Salesforce OAuth, run Schema Discovery, configure custodian, train COO/ops team on flows, hypercare.

**What it doesn't include:** Data migration (Min reads from existing CRM — no migration needed), data model configuration (auto-discovered), custom workflow design (Min has built-in workflows), report customization (Min's dashboard is fixed).

My 9-month implementations include all of those things. Min's 25-day implementation is faster because it's less configurable. That's a feature for firms that want opinionated software. It's a limitation for firms that need customization.

The honest pitch: 'Min is productive in 25 days because it adapts to your org instead of requiring you to configure it. If you need custom workflows, custom reports, and custom data models, use Practifi. If you want operational intelligence that works out of the box, use Min.'"

---

**10. The AI Skepticism Question**

*"Min's compliance engine and NIGO prevention — how do you ensure accuracy?"*

**Megan's assessment:**

"I reviewed the compliance engine code. It's keyword matching against Salesforce task subjects and descriptions, not machine learning. The NIGO prevention is a deterministic rule engine, not AI. These are both good engineering decisions — keyword matching is predictable, auditable, and doesn't hallucinate. Rule engines produce consistent results.

But calling them 'AI-powered' sets the wrong expectation. When a COO hears 'AI compliance,' she imagines GPT reading documents and making judgment calls. What Min actually does is search for 'kyc' in task text and check a box if it finds it. That's pattern matching, not intelligence.

The accuracy concern: keyword matching produces false positives (a task called 'Review KYC concerns with legal' would trigger a KYC pass even though it's about a concern, not a completed review) and false negatives (a task called 'Updated client profile per annual review' contains no default keywords and would miss the compliance check). The customizable keyword map mitigates this, but it shifts the accuracy burden to the firm.

My recommendation: keep the keyword engine, drop the 'AI' label, and add a 'Review Confidence' indicator — 'high confidence' when multiple keywords match, 'low confidence' when a single ambiguous keyword matches. That's more honest and more useful."

---

**11. The Custodian Intelligence Question**

*"The Custodian Knowledge Base — how did you build it? How does it stay current?"*

**Megan's assessment:**

"The KB is encoded in `custodian-rules.ts` as static TypeScript objects. It covers account types, signer requirements, document lists, NIGO risks, income eligibility, and contribution limits for Schwab (and stubs for Fidelity, Pershing, and Altus).

Building it: someone (Jon) read Schwab's Advisor Center documentation, their institutional account opening guides, their NIGO rejection reports, and encoded the rules. That's the right way to build V1.

Maintaining it: this is the problem. Schwab updates their requirements quarterly. New forms, new NIGO codes, new eligibility thresholds (IRS adjusts IRA contribution limits annually). The KB needs a maintenance process:

1. Subscribe to Schwab Advisor Services regulatory updates (they email these quarterly)
2. Subscribe to IRS contribution limit announcements (annual)
3. Review and update `custodian-rules.ts` within 30 days of each change
4. Version the KB so firms can see which version they're running

Without a maintenance process, the KB becomes stale, NIGO prevention becomes unreliable, and the product's credibility erodes. This is the most important operational process Min needs to formalize."

---

**12. The Scale Question**

*"You're a solo technical founder maintaining CRM adapters, a custodian KB, a data pipeline, and a frontend. How?"*

**Megan's assessment:**

"I've seen this movie before. I've seen solo founders build impressive V1 products, acquire 5-10 clients, then drown in support tickets, feature requests, and integration maintenance. The product stops improving because all engineering time goes to keeping existing clients running.

Min's architecture is actually well-designed for solo maintenance: the canonical CRM types mean a new adapter is scoped (implement the interface), the custodian switch pattern means adding Fidelity is mechanical (fill in the config object), and the schema discovery approach means each new client deployment is automated rather than custom.

But there are three solo-founder failure modes that architecture can't solve:

1. **Client support.** When a firm's Schema Discovery misclassifies their household object and their health scores are wrong, someone has to debug it. That someone is Jon, and he's also building features.

2. **Custodian KB maintenance.** When Schwab changes their IRA form requirements, someone has to update the rules. If Jon is on vacation, the KB is stale for two weeks and a firm submits a NIGO application.

3. **Adapter parity.** When the Wealthbox adapter ships, it needs to be maintained alongside Salesforce. Bug fixes, API changes, new features — everything is 2x. When Redtail ships, it's 3x. The engineering surface area grows linearly with each adapter while the engineering team stays at 1.

My recommendation: hire one person — a Salesforce-fluent operations engineer who can maintain the KB, triage Schema Discovery issues, and handle client onboarding. That person costs $120-$150K/year and buys 2-3 years of runway before the next hire is needed."

---

**13. The Channel Question**

*"If I were going to recommend Min to my clients, what would you need to give me?"*

**Megan's assessment:**

"Three things:

1. **A sandbox demo kit.** Let me connect Min to my client's Salesforce sandbox and see Schema Discovery work on their actual data. If it discovers correctly, I'll recommend it. If it doesn't, I won't. The demo is the proof.

2. **A referral structure.** I charge $15K-$25K for technology evaluations. If I recommend Min, I need either (a) a referral fee (10-15% of first-year revenue) or (b) an implementation partnership where I provide the 25-day onboarding and bill my hourly rate. Option (b) is better because it gives me recurring engagement with the client.

3. **A 'what Min doesn't do' page.** Every vendor tells me what their product does. Nobody tells me what it doesn't do. If you give me an honest limitations document — 'Min doesn't support multi-custodian today, Min's compliance engine uses keyword matching, Min doesn't replace your CRM' — I'll trust you more and recommend you more confidently. Honesty is the rarest feature in wealthtech."

---

**14. The Pricing Question**

*"What does Min cost? What should it cost?"*

**Megan's assessment:**

"My clients' technology stacks cost:
- Salesforce FSC licensing: $150-$300/user/month
- Practifi: $80-$120/user/month (on top of Salesforce)
- Wealthbox: $45-$65/user/month (standalone)
- Redtail: $99/database/month (flat, not per-user)

Min should price at $35-$50/user/month for the Salesforce add-on positioning, or $60-$80/user/month for the standalone-CRM-replacement positioning.

At $35-$50/user/month, Min is a no-brainer add-on for any firm already on Salesforce that wants operational intelligence. It's cheaper than Practifi, faster to implement, and complementary to existing workflows.

At $60-$80/user/month, Min starts competing with Wealthbox's total cost. A firm paying $65/user for Wealthbox won't pay another $60/user for Min on top. At that price, Min needs to replace the CRM, not complement it.

My recommendation: launch at $39/user/month with annual contracts. Position as 'the operations intelligence layer for your CRM.' Raise to $49/user after 50 clients when you have pricing power."

---

**15. The Deal-Breaker Question**

*"What's the one thing that, if you don't solve it in the next 6 months, means Min doesn't make it?"*

**Megan's assessment:**

"Multi-custodian support. Not Wealthbox, not Redtail — multi-custodian.

Here's why: 70% of RIAs with $500M+ AUM use two or more custodians. Every COO I work with manages Schwab + Fidelity, or Schwab + Pershing, or all three. If Min can only see one custodian's rules at a time, it's useless for the majority of the addressable market.

The Wealthbox adapter is important for market expansion. The Redtail adapter is important for distribution. But multi-custodian support is existential — without it, Min is a niche product for single-custodian firms under $1B, and that's not a venture-scale market."

---

**16. The Endorsement Question**

*"Under what conditions would I put my reputation behind Min and recommend it to my clients?"*

**Megan's assessment:**

"Five conditions:

1. I see Schema Discovery work on three of my clients' sandboxes. Not demo orgs — real client orgs with real customizations. If it discovers correctly on 2 out of 3, I'm satisfied.

2. Multi-custodian ships. My clients won't accept a single-custodian limitation.

3. The Custodian KB has a documented maintenance process. I need to see quarterly update commits, not just a promise.

4. Min has a transparent limitations page I can share with clients. No surprises post-purchase.

5. I have an implementation partnership that lets me bill for the 25-day onboarding. If Min cuts me out of the value chain, I'll recommend Practifi instead.

Meet those five conditions, and I'll recommend Min to every single-custodian firm in my pipeline — today. Meet condition #2, and I'll recommend it to every firm in my pipeline. That's 8 active clients and a network of 200+ COOs who call me before making technology decisions."

---

# PART 4: BOARD OF ADVISORS REVIEW

*Present to Min's Board with context from Evaluations #1 (COO of $1B RIA) and #2 (COO of $3B multi-family office).*

---

**Strategic Advisor — Richard Marsh, Former CEO of $5B RIA**

*"Does this make the firm more acquirable or more defensible?"*

"The Schema Discovery engine is a genuine technical moat. No competitor I've seen auto-discovers Salesforce configurations. That's defensible IP. But the expert raised a valid concern: the moat has a 24-month shelf life before Salesforce Agentforce potentially copies the concept. Min needs to deepen the moat — more CRM adapters, more custodians, more intelligence — before the window closes.

From an acquirability standpoint: Min is an attractive acquisition target for Orion (needs Salesforce integration), Envestnet (needs operations layer), or a Salesforce SI (needs a product to bundle with implementations). But only if Min has 50+ paying clients and multi-CRM support. A single-CRM, single-custodian product with 10 clients is a feature, not a company."

---

**Enterprise Sales Advisor — Diana Okafor, 20 Years Selling to Financial Services**

*"Can I sell this to a procurement committee?"*

"Not yet. Procurement committees at $1B+ firms require: SOC 2 Type II certification, a vendor risk assessment, a data processing agreement, and references from 3+ comparable firms. Min has zero of these today.

But the expert's channel insight changes the sales motion. You don't sell to procurement committees. You sell through consultants like Megan. She sells to the COO, the COO tells procurement 'we're buying this,' and procurement rubber-stamps it. The consultant channel bypasses the procurement gauntlet for firms under $2B. Above $2B, you need the certifications.

Immediate action: SOC 2 Type II. Start the audit now. It takes 6-9 months. Without it, every firm above $1B is inaccessible."

---

**Technology Advisor — Dr. Kenji Ito, CTO of Wealthtech Infrastructure Company**

*"Will this architecture scale?"*

"The hexagonal CRM architecture is sound. The canonical types are pragmatic. The schema discovery is clever engineering. These are positive architectural signals.

Three concerns from the expert that I share:

1. **SOQL pagination.** The current query patterns work for firms with <500 households. At 2,000+ households, SOQL row limits will silently truncate results. This needs cursor-based pagination before scaling.

2. **Single-custodian architecture.** The `ACTIVE_CUSTODIAN` global switch needs to become per-account or per-household context. This is an architectural change, not a feature addition. Do it now before 50 clients depend on the current architecture.

3. **Discovery heuristic coverage.** 85% of orgs is good for launch. It's not good for scale. The expert's recommendation — a transparent discovery results screen with manual overrides — is the right solution and should be prioritized."

---

**Regulatory Advisor — Janet Howell, Former SEC Examiner**

*"Does this help or hurt in an examination?"*

"The compliance engine is examination-friendly. It maps checks to specific regulations (FINRA 2090, 4512, SEC 17a-14, DOL PTE 2020-02), records evidence, and produces audit-ready output. The PDF export from compliance reviews would be directly usable as an examination exhibit.

One concern the expert raised that I amplify: keyword-based compliance matching can produce false positives. In an examination, showing a compliance dashboard that says '100% compliant' when the underlying evidence is a keyword match on task text is worse than showing no dashboard at all. If the examiner finds a gap that Min's dashboard said was covered, the dashboard becomes evidence of inadequate supervision.

The confidence indicator the expert recommended — 'high confidence' vs. 'low confidence' based on match quality — is not a nice-to-have. It's a regulatory necessity. Ship it."

---

**Operations Advisor — Marcus Bellini, Current COO of $3B Multi-Family Office**

*"Would I actually use this?"*

"Yes — for the compliance monitoring and health scoring. Those replace spreadsheets I maintain today. The account opening flow with NIGO prevention is compelling — we get NIGO rejections monthly and each one costs us 5-10 days.

But the expert is right about multi-custodian. We use Schwab and Fidelity. If Min only sees Schwab, the health score is a lie — it's based on half our data. I wouldn't trust a health score computed from incomplete information, and I wouldn't show it to my principal.

Ship multi-custodian or ship a very clear indicator: 'This health score reflects Schwab accounts only. Fidelity accounts are not included.' Transparency beats completeness."

---

### Board Consensus

**Middleware Graveyard Answer:** Min avoids ActiFi's failure (read-only) because it writes to Salesforce. It avoids Skience's failure (hardcoded) because Schema Discovery auto-adapts. It risks Nitrogen's limitation (narrow focus that works vs. broad scope that doesn't). The board recommends narrowing to three core features (health scoring, compliance monitoring, account opening) and making them world-class before expanding.

**Agentforce Timeline:** 24 months before meaningful overlap. Min must have Wealthbox and Redtail adapters shipping by Q4 2027 to make the CRM-agnostic story real before Agentforce arrives.

**Channel Strategy:** Partner with consultants, don't compete with them. Offer implementation partnerships with referral economics. Megan's network of 200+ COOs is more valuable than any direct sales team Min could build.

**Pricing:** Launch at $39/user/month. The expert validated this range as a no-brainer add-on price point.

**Solo-Founder Risk Mitigation:** First hire should be a Salesforce-fluent operations engineer, not a salesperson. This addresses KB maintenance, Schema Discovery edge cases, and client onboarding simultaneously.

**Revised Competitive Positioning:** "Min auto-discovers your Salesforce org in 60 seconds and shows you your practice health in 5 minutes. No configuration, no consultant, no waiting. The only operations intelligence layer that adapts to your firm — not the other way around."

**Top 3 Product Investments (Updated):**
1. **Multi-custodian architecture** (per-account custodian context) — existential
2. **Compliance confidence indicators** — regulatory necessity
3. **Schema Discovery transparency + manual overrides** — scale enabler

---

# PART 5: OPERATING TEAM REVIEW

## Elena Vasquez — VP Customer Experience

*"This expert is either a channel partner or a gate-keeper. How do we turn her into an advocate?"*

"Megan gave us her conditions. They're specific and achievable:

1. **Sandbox demo kit** — Build a self-service path where consultants can connect their client's sandbox and see Schema Discovery results. No sales call required. This is our #1 channel-enablement investment.

2. **Implementation partnership** — Create a 'Min Certified Consultant' program. Partners run the 25-day onboarding, bill their rate, and we provide training materials + sandbox environment. This gives Megan revenue from every Min deployment, aligning her incentives with ours.

3. **Honest limitations page** — Publish a 'What Min Does and Doesn't Do' page on our website. The expert specifically called this out as the rarest feature in wealthtech. It costs nothing and builds trust disproportionately.

4. **Quarterly Custodian KB updates** — Publish a changelog. When we update Schwab rules, blog about it. This proves maintenance discipline to consultants who've been burned by stale products.

5. **Post-evaluation follow-up** — Send Megan access to a sandbox instance. Let her kick the tires without a sales conversation. Consultants convert when they discover, not when they're sold."

---

## Dr. Omar Hassan — UX Researcher

*"The expert's data model fidelity concern has direct UI implications."*

"Three UI changes from this evaluation:

1. **Schema Discovery Results Screen.** Today, discovery is a black box — animated checkmarks, then 'you're all set.' The expert wants to see what Min discovered and correct misclassifications. Build a post-discovery review screen: 'Min found your household object is Account (RecordType: Household). Min found 3 custom fields on Contact. Min detected 2 active Flows on Task.' Let the user confirm or correct. This builds trust and handles edge cases.

2. **Compliance Confidence Indicators.** The expert and the regulatory advisor both flagged this. When a compliance check passes based on a strong keyword match ('COMPLIANCE REVIEW PASSED' in task subject), show high confidence. When it passes on a weak match (single keyword 'kyc' in a task description), show 'review recommended.' This prevents the false confidence problem the SEC examiner raised.

3. **Custodian Coverage Indicator.** When a firm has accounts at multiple custodians but Min is configured for one, show a banner: 'Health score reflects Schwab accounts only. Fidelity accounts not yet included.' This is the multi-custodian transparency that the operations advisor demanded."

---

## Rachel Toriyama — Staff Engineer

*"The expert raised real technical concerns. What needs to be built?"*

### Triage: Already Handled / Known Gap / New Risk

**Already Handled:**
- SOQL injection prevention (centralized sanitization) ✓
- CSRF protection on mutations ✓
- Retry logic with exponential backoff ✓
- Schema Discovery for standard FSC configurations ✓
- Audit trail for all mutations ✓

**Known Gap with Plan:**
- Multi-custodian architecture (global → per-account switch) — Q3 2026
- Wealthbox adapter — Q4 2026
- Redtail adapter — Q1 2027

**New Risk (from expert):**
- **SOQL row limit truncation at scale.** Current `queryTasks` handler can silently lose data at 50K+ rows. **Fix:** Add cursor-based pagination and a `hasMore` flag on all query responses. Priority: High. Effort: 1 sprint.
- **Tooling API rate limits on sandbox orgs.** Schema Discovery may fail on Developer Edition sandboxes during evaluation. **Fix:** Add rate limit detection and graceful fallback (skip automation inventory if Tooling API is throttled). Priority: Medium. Effort: 3 days.
- **Financial Account Role fidelity loss.** Canonical model picks one household per Financial Account, losing joint/trust multi-party relationships. **Fix:** Add `roles?: { contactId: string; role: string }[]` to `CRMFinancialAccount`. Priority: Medium. Effort: 1 sprint.
- **Custodian KB staleness.** No maintenance process. **Fix:** Create a quarterly review checklist, subscribe to Schwab Advisor Services updates, version the KB in code, add a `/api/custodian/version` endpoint. Priority: High. Effort: 2 days.
- **Discovery heuristic gaps.** Misclassification on custom objects with non-standard names. **Fix:** Add manual override path in post-discovery UI. Priority: High. Effort: 1 sprint.

---

### Master Prioritized List: All Three Evaluations

#### Foundation (appeared in all 3 evaluations — required for any customer)

| # | Item | Source | Category | Complexity |
|---|------|--------|----------|------------|
| 1 | Multi-custodian support | All 3 | Architecture | Project |
| 2 | Compliance confidence indicators | All 3 | Compliance | Sprint |
| 3 | Health score transparency (what's included, what's not) | All 3 | Dashboard | Quick Win |
| 4 | Schema Discovery manual overrides | Expert + COO #1 + COO #2 | Architecture | Sprint |
| 5 | Fidelity custodian support | All 3 | Custodian | Project |
| 6 | Export/portability of compliance records | All 3 | Compliance | Sprint |

#### Scale (appeared in 2+ evaluations — required for 10+ customers)

| # | Item | Source | Category | Complexity |
|---|------|--------|----------|------------|
| 7 | SOQL pagination for large orgs | Expert + COO #2 | Architecture | Sprint |
| 8 | Custodian KB maintenance process | Expert + COO #2 | Operations | Quick Win |
| 9 | SOC 2 Type II certification | Expert + COO #2 | Compliance | Project |
| 10 | Wealthbox CRM adapter | Expert + COO #1 | Architecture | Project |
| 11 | Implementation consultant partnership program | Expert + COO #1 | Go-to-Market | Sprint |
| 12 | Discovery results transparency screen | Expert + COO #1 | UX | Sprint |
| 13 | Redtail CRM adapter | Expert + COO #2 | Architecture | Project |
| 14 | Service tier / segmentation support | Expert + COO #2 | Compliance | Sprint |

#### Segment (unique to one evaluation — assess for market relevance)

| # | Item | Source | Category | Complexity |
|---|------|--------|----------|------------|
| 15 | CRM migration dual-read support | Expert | Architecture | Project |
| 16 | Financial Account Role multi-party support | Expert | Data Model | Sprint |
| 17 | Tooling API rate limit graceful fallback | Expert | Schema Discovery | Quick Win |
| 18 | Honest limitations page on website | Expert | Marketing | Quick Win |
| 19 | Quarterly KB changelog blog posts | Expert | Marketing | Quick Win |
| 20 | Sandbox self-service demo for consultants | Expert | Channel | Sprint |

---

### Salesforce FSC Compatibility Matrix

| FSC Configuration | Support Level | Notes |
|-------------------|--------------|-------|
| Standard FSC with Household RecordType | Full | Schema Discovery handles automatically |
| FSC with Account Type picklist = "Household" | Full | Detects via data query fallback |
| FSC with Person Accounts | Full | Detects `IsPersonAccount` |
| FSC with Financial Accounts (standard) | Full | Maps to canonical `CRMFinancialAccount` |
| FSC with Financial Account Roles | Partial | Picks primary role, loses multi-party |
| FSC with custom household object | Partial | Detects via keyword regex, may miss non-obvious names |
| FSC with Practifi managed package | Partial | Detects `cloupra__` prefix, maps household object |
| FSC with 50+ custom fields on Account | Full | Discovers but doesn't use custom fields in canonical model |
| FSC with blocking validation rules on Account/Task | Partial | Detects validation rules, doesn't automatically comply with them on writes |
| FSC with custom Flows that trigger on Task creation | Partial | Detects flows, warns about automation risk, but doesn't prevent conflicts |
| FSC with junction object household model | Not Supported | Heuristics miss junction patterns; needs manual override |
| Non-FSC Salesforce (Sales Cloud only) | Partial | Works for Account/Contact/Task; no Financial Account support |

---

### Consultant Channel Strategy

**Target:** Independent technology consultants serving RIAs ($500M-$5B AUM)

**Proof Points Required:**
1. Live Schema Discovery demo on consultant's client sandbox
2. 3+ case studies from comparable firms
3. Documented limitations page
4. Quarterly KB update evidence

**Partnership Model:**
- Tier 1 (Referral): 12% of first-year ACV, no implementation involvement
- Tier 2 (Implementation): Consultant runs 25-day onboarding at their hourly rate ($150-$250/hr), Min provides training kit + sandbox, no referral fee
- Tier 3 (Strategic): Consultant co-develops custom compliance checks or workflow templates, revenue share on IP

**Demo Kit Contents:**
- Self-service sandbox connection (no Min sales involvement)
- Discovery results report (PDF-exportable)
- Sample health score computation
- Comparison to consultant's current assessment methodology

---

### Custodian KB Maintenance Process

1. **Subscribe** to Schwab Advisor Services regulatory update emails (quarterly)
2. **Subscribe** to IRS.gov contribution limit announcements (annual, typically October)
3. **Review** Schwab's Advisor Center release notes monthly
4. **Update** `custodian-rules.ts` within 21 days of any change
5. **Version** each update with a semver tag (e.g., `schwab-rules@2026.Q1`)
6. **Publish** a changelog entry on the Min blog within 7 days of each update
7. **Expose** `/api/custodian/version` endpoint so firms can verify currency
8. **Quarterly audit** — diff rules against current Schwab documentation to catch missed updates

---

### AI Accuracy and NIGO Detection Measurement

**Current approach:** Keyword matching against Salesforce task text. Deterministic, auditable, no hallucination risk.

**Accuracy measurement framework:**
- **True positive rate:** % of compliance checks that correctly identify a completed action (target: >90%)
- **False positive rate:** % of compliance passes where the underlying action was not actually completed (target: <5%)
- **False negative rate:** % of missed compliance actions that exist in the data but weren't detected (target: <10%)
- **NIGO prevention rate:** % of submitted applications that pass first-time review at custodian (target: >95%)

**Measurement method:** Quarterly sample audit of 50 random compliance checks across 5 client orgs. Compare Min's keyword match result to manual human review of the same task records. Publish aggregate accuracy metrics.

**Communication:** "Min's compliance engine uses pattern matching, not AI. It finds evidence of compliance actions in your Salesforce task records. Accuracy depends on how consistently your team names tasks. We publish quarterly accuracy metrics."

---

### Revised Roadmap (All Three Evaluations)

**Next 30 days:**
- Compliance confidence indicators (high/low based on match quality)
- Health score custodian coverage banner ("Schwab only")
- Schema Discovery transparency screen with manual overrides
- Custodian KB maintenance process formalized
- Honest limitations page published
- SOQL pagination for queryTasks
- Tooling API rate limit graceful fallback

**Next 90 days:**
- Multi-custodian architecture (per-account context)
- Fidelity custodian rules (account types, NIGO rules, documents)
- Consultant sandbox demo kit (self-service)
- SOC 2 Type II audit initiated
- Financial Account Role multi-party support
- Compliance record export (PDF/CSV)

**Next 6 months:**
- Wealthbox CRM adapter (full `CRMPort` implementation)
- Implementation consultant partnership program launch
- Redtail CRM adapter
- Service tier / segmentation-aware compliance scheduling
- CRM migration dual-read support (experimental)
- First 3 consultant partners onboarded

---

# 10 TAKEAWAYS FROM EVALUATION #3

1. **Schema Discovery is the moat.** No competitor auto-discovers Salesforce org configurations. This should be the lead in every sales conversation, not a background feature.

2. **Multi-custodian is existential.** 70% of addressable firms use 2+ custodians. The single-custodian architecture limits Min to a niche market that isn't venture-scale.

3. **The Agentforce clock is ticking.** Salesforce will offer bundled compliance scoring by 2028. Min's survival depends on being CRM-agnostic with working Wealthbox and Redtail adapters before then.

4. **The canonical model loses too much FSC fidelity.** Financial Account Roles, ActionPlans, custom objects — firms that invested heavily in FSC customization find that Min can only see 60% of what they built.

5. **The "AI" label hurts more than it helps.** Keyword matching and rule engines are good engineering. Calling them AI sets expectations the product doesn't meet and triggers skepticism from technical evaluators.

6. **Consultants are the channel.** COOs buy from their consultant's recommendation. Building a consultant partnership program is higher-ROI than a direct sales team.

7. **The Custodian KB is a ticking time bomb without a maintenance process.** Static rules that aren't updated quarterly become a liability, not an asset.

8. **25-day implementation is honest — for the right scope.** It's faster because it's less configurable. That's a feature for firms that want opinionated software and a limitation for firms that need customization. Position accordingly.

9. **Pricing at $39/user/month hits the sweet spot.** Below Practifi's cost, above commodity tools, positioned as "add-on intelligence" rather than "CRM replacement."

10. **First hire: operations engineer, not salesperson.** The expert correctly identified that KB maintenance, Schema Discovery edge cases, and client onboarding all need the same person — someone Salesforce-fluent who isn't the founder.

---

# COMBINED STRATEGIC FINDINGS: ALL THREE EVALUATIONS

### Confirmed (3/3) — Highest Priority

| # | Finding | Recommendation | Complexity |
|---|---------|---------------|------------|
| 1 | **Multi-custodian is the #1 gap.** Every evaluator — the advisor COO, the multi-family COO, and the expert — identified single-custodian as the primary limitation. | Architect per-account custodian context. Ship Fidelity rules within 90 days. | Project |
| 2 | **Health score needs transparency.** All three evaluators wanted to understand what's included and what's not — decomposition, data sources, coverage gaps. | Add confidence indicators, custodian coverage banners, and decomposition explanations to every health metric. | Sprint |
| 3 | **Compliance output must be examination-ready.** The COO, the multi-family COO, and the expert all emphasized SEC examination defensibility. | Add confidence levels to compliance results. Export to structured PDF. Include regulation citations. | Sprint |
| 4 | **Schema Discovery is the headline.** All three evaluators found the auto-discovery concept compelling — the COOs because it meant fast deployment, the expert because it solved the Schema Problem. | Lead every sales conversation and marketing asset with Schema Discovery. Demonstrate live on prospect's sandbox. | Quick Win |
| 5 | **NIGO prevention is uniquely valuable.** No evaluator had seen custodian-specific rejection prevention built into an account opening workflow. All three called it out as differentiated. | Expand NIGO rules to Fidelity and Pershing. Publish prevention rates. | Sprint |

### Validated (2/3) — High Priority

| # | Finding | Recommendation | Complexity |
|---|---------|---------------|------------|
| 6 | **Wealthbox adapter needed for market expansion.** Expert and COO #1 both identified CRM-agnostic support as critical for the addressable market. | Ship Wealthbox adapter within 6 months. Start with read-only canonical mapping. | Project |
| 7 | **Solo-founder risk is a concern.** Expert and COO #2 both raised bus-factor and maintenance capacity questions. | Hire one Salesforce-fluent operations engineer. Formalize KB maintenance. | Quick Win (process) |
| 8 | **The consultant channel is the right GTM.** Expert and COO #1 both described buying through consultant recommendations. | Build consultant demo kit. Launch partnership program. Prioritize over direct sales. | Sprint |
| 9 | **SOC 2 is a prerequisite for $1B+ firms.** Expert and COO #2 both identified vendor risk assessment requirements. | Start SOC 2 Type II audit immediately. 6-9 month timeline. | Project |
| 10 | **Custodian KB currency is a trust issue.** Expert and COO #2 both raised concerns about rule staleness over time. | Formalize quarterly update process. Publish changelog. Version the KB. | Quick Win |

### Unique — Assess for Segment Relevance

| # | Finding | Source | Recommendation | Complexity |
|---|---------|--------|---------------|------------|
| 11 | **Financial Account Role fidelity loss affects complex FSC orgs** | Expert | Add multi-party role support to canonical model | Sprint |
| 12 | **SOQL row limits will truncate data at scale** | Expert | Cursor-based pagination on all queries | Sprint |
| 13 | **Service tier segmentation drives compliance scheduling** | Expert | Add segmentation-aware compliance rules | Sprint |
| 14 | **CRM migration dual-read needed during transitions** | Expert | Experimental: multi-adapter read mode | Project |
| 15 | **Advisors need mobile-friendly briefing view** | COO #1 | Responsive design pass on briefing screen | Sprint |

---

# THE 5 THINGS THAT MUST BE TRUE FOR MIN TO WIN

**1. Min must show data from every custodian the firm uses, or the health score is a lie.**

A practice health score computed from 50% of the firm's accounts is not a health score — it's a sampling error. Multi-custodian support is not a feature on the roadmap. It's the difference between a real product and a demo.

**2. Min must adapt to the firm's Salesforce org, not the other way around.**

This is what Schema Discovery promises and largely delivers. But the promise must extend to edge cases: junction objects, non-obvious custom objects, hybrid household models. The 15% of orgs that Schema Discovery misclassifies are the 15% with the most money to spend. A transparent discovery results screen with manual overrides closes the gap.

**3. Min must be defensible in an SEC examination, or it's a liability.**

A compliance dashboard that says "100% compliant" based on keyword matching is worse than no dashboard if the examiner finds gaps. Every compliance output must carry a confidence level, evidence citations, and regulation references. The standard is not "helpful" — it's "exhibit-ready."

**4. Min must make the CRM unnecessary to log into for daily operations, or it's a second login nobody uses.**

This is the adoption lesson from every failed middleware product. Min's home screen, health scores, and action flows must be complete enough that the COO, ops team, and advisor can do their daily work without opening Salesforce. If they still need Salesforce for anything Min covers, Min is overhead, not value.

**5. Min must survive without its founder for 90 days, or it's not a product — it's a consultancy.**

One person building features, maintaining the KB, onboarding clients, and debugging Schema Discovery edge cases is not sustainable. The product must be robust enough — and the processes documented enough — that a new engineer can maintain it if the founder is unavailable. This means: documented KB update procedures, automated Schema Discovery regression tests, and at least one other person who can deploy a hotfix.
