# Sarah Chen — Min Product Assessment

**Reviewer:** Sarah Chen, Enterprise RIA Sales Strategy
**Date:** February 19, 2026
**Product:** Min by AdviceOne (current build)
**Target buyer:** COO at a $250M-$500M RIA, 6-12 employees, Salesforce org, Schwab primary custodian

---

## The Honest Summary

You've built something real. The compliance engine has genuine regulatory depth — DOL PTE 2020-02, FINRA 2090/2111/4512, Reg BI — this isn't checkbox theater. The NIGO prevention for Schwab is field-level specific and would actually prevent rejections. The schema discovery engine that auto-reads any Salesforce org is a legitimate differentiator nobody else has.

But you're not ready for a $250K/year enterprise close. You're ready for a pilot. And there's a meaningful gap between "impressive demo" and "bet my operations on this." My job is to show you that gap so you can close it.

---

## 1. Buyer Reaction — What the COO Actually Says

**First 2 minutes (Home Screen):**
> "Okay, this is clean. I like that it's showing me the three things I need to do before noon. My current process is opening Salesforce, running three reports, cross-referencing a spreadsheet, and then Slacking my ops manager. This does that in one screen."

*She's leaning in. The triage list is doing what you want it to do.*

**Minutes 3-5 (Compliance Scan):**
> "Wait — it just scanned Smith Family against FINRA 2090, Reg BI, PTE 2020-02, and told me we're missing a trusted contact designation? And it explains why in plain English? Our current process is Diane pulling a spreadsheet quarterly and manually checking 127 households. This took eleven seconds."

*This is the moment. She's doing math in her head — Diane spends two days a quarter on this. That's eight days a year. Min does it in minutes.*

**Minutes 5-8 (Account Opening + NIGO Prevention):**
> "So if my ops person is opening a Roth for a client making $155K, it flags the income phase-out and suggests backdoor Roth instead? And it auto-includes the PTE docs if it's a rollover? We had three NIGOs last month because someone forgot the MoneyLink authorization."

*She's nodding. NIGO prevention is not abstract to her. Every NIGO is a 5-7 day delay and an angry client call. This is a pain she feels weekly.*

**Minute 9 (Schema Discovery):**
> "And this works on our Salesforce org as-is? We don't have to migrate data or rebuild our objects?"

*This is where you separate from Practifi. Their implementation is 4-8 weeks. You're reading her existing org in seconds.*

**Minutes 10-12 (Dashboard):**
> "The practice health score is interesting. The benchmarks — where do those come from?"

*Red flag. She's asking because the benchmarks are hardcoded assumptions, not real industry data. She'll figure this out.*

**Minute 13 (The question you don't want):**
> "What custodians do you support? We're Schwab primary but we have 40 households at Fidelity."

*This is where the demo gets uncomfortable. You support Schwab. The Fidelity/Pershing/Altus configs exist as labels — document names switch — but the actual NIGO rules, account type validations, and field-level requirements are Schwab only. If she asks you to open a Fidelity account in the demo, you'll be running Schwab rules with Fidelity branding. She'll notice.*

**Minute 15 (The other question you don't want):**
> "We use estimated AUM on the dashboard? Our actual AUM is in Salesforce FSC financial accounts. Will this pull real numbers?"

*It will — if her org has FSC financial account objects populated. If not, she's seeing estimated AUM based on $2M-per-household assumptions. For a $500M firm with 200 households, that math actually works. For a $500M firm with 80 concentrated households, the estimate is wildly wrong. She'll test this.*

---

## 2. Competitive Exposure — Where Practifi or a Spreadsheet Still Wins

### Practifi wins on:

**Workflow builder.** Practifi has a visual workflow builder that non-technical ops managers can configure. Min has a declarative workflow engine with templates — powerful but not user-configurable in the UI. The COO who wants to build her own "client birthday outreach" workflow can do it in Practifi today. In Min, it requires a code change.

**Salesforce-native experience.** Practifi lives inside Salesforce. The ops team doesn't leave Salesforce. Min is a separate application that reads from Salesforce. For firms that have built their entire process around the Salesforce UI, switching to Min is a context switch. Practifi doesn't ask them to leave home.

**Multi-custodian depth.** Practifi's Schwab integration includes real account opening API calls. Min generates documents and sends DocuSign envelopes — which is valuable — but doesn't have a direct custodian API integration. The paperwork is right, but the submission is still manual.

**Track record.** Practifi has 200+ enterprise customers. Min has zero. The COO's CEO will ask "who else uses this?" and you need an answer.

### The spreadsheet wins on:

**Flexibility.** The COO's compliance spreadsheet does exactly what she wants because she built it. Min's 16 compliance checks are good but fixed (plus custom checks via a limited UI). If her firm has a specific internal policy — say, "all accounts over $5M require a secondary review" — she can add that to her spreadsheet in 30 seconds. In Min, it's a custom check that searches task keywords. If the keyword doesn't exist in Salesforce, the check doesn't work.

**No adoption risk.** The spreadsheet already works. Nobody has to learn anything. Nobody has to connect anything. The COO knows its limitations and has workarounds. Min is better, but "better" requires change, and change has a cost the spreadsheet doesn't.

---

## 3. Deal Killers — What Stops This from Closing

### Kill Shot #1: "We're not all Schwab"

If the firm has households across Schwab, Fidelity, and Pershing — which most $500M RIAs do — your NIGO prevention and account opening intelligence only works for one custodian. The moment she opens a Fidelity account and sees Schwab-specific rules with "Fidelity" stamped on the documents, trust evaporates. She'll wonder what else is a facade.

**Fix required:** Either (a) build real Fidelity/Pershing rules, or (b) be transparent upfront: "We're Schwab-first. Fidelity and Pershing are on the roadmap. Here's the timeline."

### Kill Shot #2: "Your AUM numbers aren't real"

The revenue intelligence dashboard defaults to estimated AUM ($2M per household, 85 bps). For a sophisticated buyer, estimated AUM is a toy. She knows her actual AUM. If the dashboard shows $487M and her real AUM is $320M, she loses confidence in everything else on the screen. Worse, if she has FSC installed but the financial account objects are sparse, she'll see partially real data mixed with estimates — the worst of both worlds.

**Fix required:** Make the data source crystal clear. Show "Estimated (based on X households x $Y avg)" vs. "Actual (from N Salesforce financial accounts)" with no ambiguity.

### Kill Shot #3: "DocuSign goes to sandbox"

If she connects her DocuSign account during a pilot and envelopes route to the demo environment, that's an operational failure, not a demo quirk. Account opening is her core workflow. If the e-signature piece doesn't work in production on day one of the pilot, she'll conclude the product isn't production-ready.

**Fix required:** Production DocuSign must work before any pilot begins. No exceptions.

### Kill Shot #4: "No one else uses this"

Zero reference customers. No case studies. No logos. At $250K/year, the CEO and the compliance officer both need to sign off. The CEO will ask Glenn at Practifi for a reference. Glenn will provide three. You need at least one firm — even a friendly beta — who will take a call.

### Kill Shot #5: "What happens when it's wrong?"

The compliance engine searches Salesforce task subjects for keywords like "kyc", "suitability", "form crs". If the firm's tasks don't use those exact keywords — and many won't — the compliance check returns false negatives. She runs the scan, it says "KYC missing" when she knows KYC was completed, and now she doesn't trust the scanner. One false result undermines the entire compliance story.

**Fix required:** Show her how keyword matching works. Let her configure the keywords per check ("Our firm uses 'Client Profile Update' instead of 'KYC'"). Make this visible, not hidden.

---

## 4. Priority Features — Three Things That Move "Interesting" to "Must-Have"

### Priority #1: Multi-custodian NIGO rules (Fidelity + Pershing)

This is the difference between "nice for some of our accounts" and "this runs our operations." The `RULES_REGISTRY` pattern is already built for extension — it's keyed by custodian ID. You need Fidelity and Pershing account type rules at the same depth as Schwab: required documents, signer counts, beneficiary logic, contribution limits, NIGO risk frequencies.

**Why it matters for the close:** The COO won't pilot a tool that only works for 60% of her accounts. She needs to hand it to her ops team and say "use this for every account opening." Partial coverage means she's still maintaining the spreadsheet for the rest.

**Effort estimate:** The pattern exists. It's content work (regulatory research) more than engineering. Each custodian is ~500 lines of rules following the Schwab template.

### Priority #2: Configurable compliance keyword mapping

The compliance engine is genuinely good but brittle. It pattern-matches against Salesforce task subjects, and every firm uses different naming conventions. The fix: let the COO configure which keywords map to which compliance checks.

Instead of hardcoded `"kyc"`, let her say: "For KYC Profile Completed, search for: 'kyc', 'client profile update', 'data gathering', 'new account form'."

**Why it matters for the close:** This is the difference between "it works on your demo org" and "it works on my org." Every firm that trials Min will have this problem in the first 10 minutes. If they can fix it themselves in the UI, they stay. If they can't, they leave.

### Priority #3: Real AUM integration with clear data source labeling

The dashboard should clearly indicate: "AUM Source: 47 FSC Financial Accounts ($312M actual)" or "AUM Source: Estimated (186 households x $2M avg = $372M)". Better yet, show both and let the COO toggle. When FSC data is partial (some accounts have balances, others don't), show "Actual: $245M from 32 accounts + Estimated: $127M from 15 accounts without balances."

**Why it matters for the close:** Revenue intelligence is what gets the CEO excited. If the numbers are clearly sourced and accurate, the CEO sees Min as the "Monday meeting dashboard." If the numbers feel made up, the CEO asks why they're paying for something less accurate than their portfolio accounting system.

---

## 5. Pilot Structure — 90-Day Proof of Value

### Pre-Pilot (Week -2 to 0): Technical Validation

| Day | Activity | Success Criteria |
|-----|----------|-----------------|
| -14 | Salesforce sandbox connection + schema discovery | Min reads their org structure, detects objects, counts records |
| -10 | DocuSign production environment configuration | Test envelope sends to internal recipients successfully |
| -7 | Compliance keyword calibration | Run scan on 5 known households, COO validates results match reality |
| -3 | Custodian confirmation | Confirm primary custodian is Schwab (or Fidelity/Pershing if rules built) |
| 0 | Pilot kickoff | COO + 1 ops person trained (30-minute walkthrough, not a 4-week implementation) |

### Phase 1: Weeks 1-4 — Compliance Value

**Objective:** Prove Min catches things the spreadsheet misses.

| Week | Activity | Metric |
|------|----------|--------|
| 1 | Batch compliance scan of all households | # of findings COO didn't know about |
| 2 | COO runs daily triage from Min instead of spreadsheet | Time saved per day (target: 30+ min) |
| 3 | Run compliance scan before quarterly board meeting | Generate board-ready compliance report from Min |
| 4 | Review: "Did Min find anything new?" | Binary: yes/no. If yes, pilot continues. If no, diagnose why. |

**Champion test:** After Week 4, would the COO tell her CEO: "I'm not going back to the spreadsheet"?

### Phase 2: Weeks 5-8 — Operations Value

**Objective:** Prove Min reduces NIGO rejections and speeds account openings.

| Week | Activity | Metric |
|------|----------|--------|
| 5 | Open 3 new accounts through Min (Schwab) | NIGO rate: 0 vs. historical baseline |
| 6 | Track document completeness pre-submission | % of accounts submitted with all required docs |
| 7 | Use meeting briefing for 5 client meetings | Advisor feedback: "Did this save prep time?" |
| 8 | Review: compare NIGO rate, time-to-open, advisor prep time | Before/after metrics |

**Champion test:** Would the ops manager tell the COO: "I want this for every account opening"?

### Phase 3: Weeks 9-12 — Strategic Value

**Objective:** Prove Min gives the CEO the Monday meeting.

| Week | Activity | Metric |
|------|----------|--------|
| 9 | CEO sees practice health dashboard for first time | Reaction: "This is what I've been asking for" |
| 10 | Weekly board report generated from Min | Replaces manual report assembly |
| 11 | Principal view: advisor scoreboard + workload | Identifies capacity or performance issues |
| 12 | Final review: go/no-go for annual contract | Stakeholder alignment: COO, CEO, Compliance |

**Champion test:** Would the CEO show this dashboard to their board or partner firm?

### Pilot Pricing

Free pilot, no commitment, 90 days. Min connects read-only to their Salesforce. They invest time, not money. The cost of the pilot is your engineering time supporting them — budget 10 hours/week of dedicated support for the pilot firm.

**Why free:** You need the reference customer more than you need the revenue. The first firm that completes a successful 90-day pilot becomes your case study, your logo, and your proof point for every subsequent deal. That's worth more than $62.5K (one quarter of a $250K contract).

---

## 6. Pricing Instinct — What It's Worth to the Buyer

### The Math the COO Does

**Current cost of the problem:**
- COO time on compliance spreadsheet: 2 days/quarter = 8 days/year = ~$8,000 in loaded labor
- Ops manager time on manual account opening prep: 1 hour/account x 100 accounts/year = $5,000
- NIGO rework: 3-5 NIGOs/month x 2 hours each x $50/hr = $3,600-$6,000/year
- Advisor meeting prep: 30 min/meeting x 200 meetings/year x $150/hr advisor cost = $15,000
- Risk of compliance finding in SEC exam: unquantified but terrifying

**Total quantifiable pain:** $32,000-$34,000/year for a $500M firm

**Total with risk premium (compliance peace of mind):** $50,000-$75,000/year

### What This Means

**At $250K/year**, you're 5-8x the quantifiable pain. That's a hard sell. The COO can't build a business case where Min pays for itself on efficiency alone. You'd need to be selling to a $2B+ firm for that math to work.

**At $75,000-$100,000/year** for a $500M firm, the math works. The compliance risk alone justifies half the cost. The ops efficiency justifies the other half. The CEO dashboard is gravy.

**At $36,000-$48,000/year** ($3,000-$4,000/month), you're at price parity with Practifi + Salesforce licensing for a 6-user firm. But you're not asking them to replace their CRM — you're adding a layer on top. So the real comparison is: "$4,000/month for Min vs. $0/month for the spreadsheet she's already using." At that price, the value proposition needs to be obvious and immediate.

### My Instinct

**For a $500M RIA (target):** $4,000-$6,000/month ($48K-$72K/year). Position as "less than one ops hire, replaces half an ops hire's busywork."

**For a $1B+ firm:** $8,000-$12,000/month ($96K-$144K/year). More users, more households, more compliance surface area. The practice health dashboard alone is worth this to a CEO managing multiple advisors.

**For the pilot firm:** Free for 90 days, then $3,000/month year-one loyalty pricing. They're your reference. Treat them like a co-founder, not a customer.

### Pricing Structure

Don't price per user. The ops team has 3 people, the advisors have 4, the principal has 1. Per-user pricing punishes the exact behavior you want (broad adoption). Price per firm, tiered by AUM or household count:

| Tier | AUM Range | Households | Monthly | Annual |
|------|-----------|------------|---------|--------|
| Growth | $100M-$300M | 50-150 | $3,000 | $36,000 |
| Professional | $300M-$750M | 150-350 | $5,000 | $60,000 |
| Enterprise | $750M-$2B | 350-800 | $8,000 | $96,000 |
| Strategic | $2B+ | 800+ | $12,000 | $144,000 |

This makes the pricing conversation about firm size, not headcount. The COO doesn't have to justify adding users. Everyone gets access.

---

## The Demo Script — What to Show (and What to Skip)

### Show (in this order):

1. **Schema discovery** (60 seconds) — Connect to Salesforce, watch it auto-detect the org. This is the "zero implementation" proof point. Time it with a stopwatch. Say the number out loud.

2. **Home screen triage** (90 seconds) — "Here's what you need to do before noon." Don't explain the UI. Let her read it. If she can't understand it without explanation, the UI has a problem.

3. **Compliance batch scan** (2 minutes) — Scan 5 households. Show one that passes and one that has warnings. Click the "Why" button on a warning. Let her read the regulatory citation. Say: "Your current process takes how long?"

4. **Account opening with NIGO prevention** (3 minutes) — Open a Roth IRA for someone near the income limit. Show the income eligibility flag. Show the auto-included PTE docs for a rollover. Show the beneficiary auto-population. Say: "When was your last NIGO?"

5. **Practice health dashboard** (2 minutes) — Show the health score. Show the advisor scoreboard. Show the risk radar. Say: "This is your Monday morning meeting."

6. **PDF compliance report** (30 seconds) — Download it. Hand it to her (or share screen). Say: "This is your audit file."

### Skip:

- **Meeting briefing** — It's nice but it's not a deal closer. Save it for the pilot.
- **Onboarding flow** — Overlaps with account opening. Don't repeat yourself.
- **Workflow engine** — The templates are good but the UI isn't configurable. Don't show the engine; show the results (auto-created tasks after onboarding).
- **Revenue intelligence** — Unless you know her org has FSC financial accounts populated. If the numbers are estimated, skip it. One wrong number undermines the whole dashboard.

### The Close Line

Don't pitch. Don't ask for the sale. Ask for the pilot:

> "I'm not asking you to buy anything today. I'm asking for 90 days. We connect to your Salesforce — read-only. Your team uses Min alongside their current process for 90 days. If it doesn't save your ops team 10 hours a week by week four, we shake hands and part ways. If it does, we talk about what a year looks like."

That's the line. Memorize it.

---

## Final Assessment

**What you've built:** A genuinely intelligent compliance and operations layer for Salesforce-based RIAs. The regulatory depth is real. The NIGO prevention is specific and useful. The schema discovery is a differentiator nobody else has. The "Why" buttons show a level of care about the user that enterprise software rarely has.

**What you haven't built yet:** Multi-custodian depth, configurable compliance keywords, real AUM integration with clear sourcing, production-ready DocuSign, and the reference customer that makes all of this credible.

**Where you are:** You're 80% of the way to a product that a COO at a $500M RIA would stake her reputation on. The last 20% is the difference between "great demo" and "signed contract." That 20% is: Fidelity/Pershing rules, keyword configurability, AUM transparency, and one firm that will take a reference call.

**My confidence level that this closes a pilot in the next 60 days:** 7/10 — if you lead with compliance and NIGO prevention, connect to a real Salesforce org live in the meeting, and don't oversell the multi-custodian story.

**My confidence level that the pilot converts to a $60K/year contract:** 6/10 — dependent on whether compliance keyword matching works on their specific org without manual tuning, and whether the account opening flow handles their actual custodian mix.

Go get the pilot. Fix the gaps during it. Close the contract with proof, not promises.

---

*Sarah Chen*
*"The buyer doesn't care what it cost you to build. They care what it costs them not to have it."*
