# Strategic Plan: Min vs. Practifi Competitive Response

**Source:** Practifi Leadership Dinner (Feb 2026)
**Author:** Jon Cambras, CTPO
**Date:** 2026-02-19

---

## Executive Summary

The Practifi dinner surfaced seven structural vulnerabilities, five of which Min already addresses or can address with existing architecture. Practifi's leadership explicitly acknowledges they cannot solve CRM-agnostic orchestration, custodian intelligence, or mid-market adoption — and would partner with whoever does. Min should position as the complementary layer Practifi can't build, not a replacement.

---

## Vulnerability Map: Practifi Gaps vs. Min Strengths

| # | Practifi Admitted Weakness | Min Current State | Action Required |
|---|---------------------------|-------------------|-----------------|
| 1 | **Salesforce lock-in** — can't serve 70%+ of RIAs on Wealthbox/Redtail | CRM adapter factory (`lib/crm/factory.ts`) with hexagonal ports pattern; Wealthbox/Redtail adapters stubbed | **Build Wealthbox + Redtail adapters** |
| 2 | **$25K-$35K/yr total cost** for mid-market (6-8 users) | Min has no per-user CRM licensing dependency | **Lead with TCO comparison in sales materials** |
| 3 | **30% feature adoption** — ops teams too busy to learn the tool | Min's zero-config design: reads existing CRM, works immediately; no workflow builder to learn | **Already addressed by design — make this the headline** |
| 4 | **No custodian intelligence** — triggers workflows but can't validate field-level correctness | Full NIGO prevention engine (`lib/custodian-rules.ts`) covering Schwab, Fidelity, Pershing, Altus with account-type-specific validation | **Already built — this is a key differentiator** |
| 5 | **No cross-system orchestration** — "someone else will do that eventually" | Declarative workflow engine (`lib/workflows.ts`) with multi-step chains, triggers, conditional execution | **Extend to cross-CRM triggers** |
| 6 | **Salesforce platform risk** — quarterly release compatibility sprints | Min controls its own stack; no managed-package dependency | **Already addressed architecturally** |
| 7 | **Partnership instinct over competition** — "we'd probably integrate with it" | CRM adapter pattern already supports Salesforce alongside Practifi | **Pursue Practifi partnership / AppExchange listing** |

---

## Strategic Priorities (Ordered by Impact)

### P1: Ship Wealthbox + Redtail Adapters (Unlocks 70% of market)

**Why:** Practifi's CEO said "someone else will [build the CRM-agnostic layer] eventually." The adapter factory at `lib/crm/factory.ts` and normalized types at `lib/crm/types.ts` already define the contract. Salesforce adapter is complete and proves the pattern.

**Work:**
- Implement `WealthboxAdapter` against `CRMPort` interface (contacts, households, tasks, financial accounts)
- Implement `RedtailAdapter` against same interface
- Wire `NEXT_PUBLIC_CRM_PROVIDER` env var to select adapter at runtime
- Validate all existing workflows, compliance checks, and NIGO rules work through the normalized types

**Validation:** A firm on Wealthbox should get the same account-opening intelligence, NIGO prevention, and workflow automation as a firm on Salesforce — without changing CRMs.

---

### P2: Practifi Partnership Track (They told us the playbook)

**Why:** Glenn said explicitly: "If someone built a custodian intelligence layer... we'd probably integrate with it. That's not a competitive threat to us. That's a gap in the market we're not going to fill." Conor confirmed: "We trigger the workflow. We don't validate the content."

**Approach:**
- Position Min as the custodian intelligence + cross-system completion layer for Practifi firms
- Min reads from Salesforce (where Practifi lives), adds NIGO validation and field-level custodian intelligence Practifi can't provide
- Offer as complementary: "Min handles what happens after Practifi triggers the workflow"
- Explore AppExchange listing or embedded component

**Key message to Practifi:** "We're not replacing your CRM experience. We're adding the custodian intelligence layer you told us you can't build."

---

### P3: Mid-Market TCO Positioning (Price is Practifi's Achilles heel)

**Why:** Glenn admitted every deal under $1B faces pricing objections. A 6-user firm pays $25K-$35K/yr for Practifi + Salesforce. Redtail is $99/month total.

**Two positioning tracks:**

**Track A — Non-Salesforce firms (the 70%):**
"You don't need Practifi + Salesforce at $35K/year. You need Min + your existing CRM."
- Min adds workflow automation, custodian intelligence, compliance checks on top of Wealthbox/Redtail
- No CRM migration required
- Fraction of the cost

**Track B — Existing Salesforce/Practifi firms:**
"Min adds the layer Practifi can't reach — custodian-specific validation, cross-system completion, zero-config adoption."
- Complementary, not replacement
- Solves the "stuff that happens outside Salesforce" problem Glenn mentioned

---

### P4: Zero-Config Adoption as Core Differentiator (Exploit their churn risk)

**Why:** Practifi's biggest churn risk is firms that pay but don't adopt. Conor said: "They're using it as a contact database with a nicer UI." Their implementation takes 4-8 weeks. Their ops teams are "too busy doing the work the tool is supposed to automate."

**Min's counter-positioning:**
- Min reads from the existing CRM and works on connect — no implementation project
- No workflow builder to learn — workflows are pre-built and triggered automatically
- NIGO prevention works passively — it validates as the user works, not as a separate learning exercise
- Compliance scanning runs in batch — ops team doesn't need to change behavior

**Proof point:** Track time-to-value metric. Target: "producing value within 24 hours of CRM connection" vs. Practifi's 4-8 week implementation.

---

### P5: Custodian Intelligence Moat (They can't follow us here)

**Why:** Practifi explicitly decided the maintenance burden of custodian-specific validation is too high for a 50-person company. Min already has this built.

**Current state (already shipped):**
- `lib/custodian-rules.ts` — Multi-custodian NIGO prevention (Schwab, Fidelity, Pershing, Altus)
- Account-type-specific validation (8 account types)
- Frequency-based risk ranking
- Beneficiary, income, rollover, signature validation
- Dynamic document requirements by account type + funding method

**Extend:**
- Add form-version tracking per custodian (detect when Schwab/Fidelity update forms)
- Build custodian-specific field mapping (which fields map to which form sections)
- Track NIGO rejection patterns to improve rules over time
- Expose as API for potential Practifi integration (see P2)

---

## Go-to-Market Sequence

```
Month 1-2:  Ship Wealthbox adapter (P1a)
            Begin Practifi partnership outreach (P2)
            Publish TCO comparison content (P3)

Month 3-4:  Ship Redtail adapter (P1b)
            Launch "Zero-Config Challenge" — connect CRM, producing value in 24hrs (P4)
            Expand custodian intelligence API (P5)

Month 5-6:  Practifi AppExchange listing or embedded integration (P2)
            Mid-market case studies: Min + Wealthbox vs. Practifi + Salesforce (P3)
            Custodian form-version tracking (P5)
```

---

## Key Quotes to Reference Internally

> "The number of RIAs on Salesforce is somewhere around 15-18% of the market. We can grow within that, but we can never be the horizontal practice management layer for the whole industry. **Someone else will do that eventually.**" — Glenn Elliott, CEO

> "If someone built a custodian intelligence layer that sat between the CRM and the custodian and just knew what Schwab or Fidelity or Pershing required, and they exposed that as an API or a component, **we'd probably integrate with it.** That's not a competitive threat to us. That's a gap in the market we're not going to fill." — Glenn Elliott, CEO

> "The ops teams that need automation most are the ones **too busy to learn the automation.**" — Conor Curtis, Head of Product

> "Practifi is great inside Salesforce, but **what about the stuff that happens outside Salesforce?** We just can't be the ones to solve that. We made our architectural bet eleven years ago." — Glenn Elliott, CEO

---

## Risks

| Risk | Mitigation |
|------|------------|
| Practifi sees us as competitive, not complementary | Lead with partnership language; don't target their existing customers for CRM replacement |
| Wealthbox/Redtail API limitations vs. Salesforce | Validate CRUD operations early; scope adapter to CRMPort contract — anything outside the contract is a feature gap to document |
| Custodian form changes break our rules | Build form-version tracking; monitor custodian release notes; instrument NIGO rejections for feedback loop |
| Mid-market firms don't buy at all (not a Practifi-vs-Min issue) | Zero-config positioning reduces risk for buyer — trial requires no commitment beyond CRM read access |
