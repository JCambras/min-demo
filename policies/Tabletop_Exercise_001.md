# Tabletop Exercise Record — TEX-2026-02-001

**Date:** February 21, 2026
**Scenario:** Scenario 1 — Wrong Client Data Displayed (Cross-Tenant Data Leakage)
**Participants:** Jon Cambras (Incident Commander, Technical Lead, Communications Lead)
**Facilitator:** Jon Cambras (self-facilitated; no external advisor yet engaged)
**Duration:** 45 minutes
**Reference:** Incident Response Plan v1.0, Section 6, Scenario 1

---

## Scenario Narrative

**9:14 AM ET — Detection.** Langford Steele's COO, Sarah Mitchell, calls to report that when she opened the Smith household in Min, the contact details section briefly showed a phone number and email belonging to a Chen & Associates client ("Margaret Yuen") before refreshing to the correct data. She took a screenshot. The Smith household has org_id `langford`; Chen & Associates uses org_id `chen`.

**9:15 AM — Initial Assessment.** This is a potential cross-tenant data leakage event. Even though only a phone number and email were exposed (not SSN or financial data), any PII visible to the wrong org constitutes a SEV-1 incident per the IRP severity classification. The incident clock starts now.

---

## Walkthrough: IRP Scenario 1 Steps

### Step 1: Confirm the Report

**Question:** How do we confirm what Sarah saw?

**Answer:** Ask Sarah to forward the screenshot. Check the MIN:AUDIT trail in Salesforce for the `langford` org — look for a `getHouseholdDetail` action at ~9:14 AM for the Smith household. Cross-reference with the Turso `audit_log` table for the same timestamp. Check if a `chen` org query ran within the same second (possible race condition).

**Execution command:**
```sql
-- Turso: check for overlapping org queries
SELECT * FROM audit_log
WHERE created_at BETWEEN '2026-02-21T14:13:00' AND '2026-02-21T14:15:00'
ORDER BY created_at;
```

**Finding:** The audit trail would show which org_id each query was associated with. If both `langford` and `chen` queries appear in rapid succession, this suggests a caching or connection pooling issue.

### Step 2: Check Tenant Isolation

**Question:** How do we verify tenant isolation is intact?

**Answer:** Run the tenant isolation test suite (`pnpm test -- --run db-persistence`). Manually query Turso to verify org_id filtering:

```sql
-- Verify no cross-org data exists
SELECT org_id, COUNT(*) FROM daily_snapshots GROUP BY org_id;
SELECT org_id, COUNT(*) FROM events GROUP BY org_id;
```

Check the Salesforce side: each org authenticates with its own OAuth token, so Salesforce data is inherently isolated at the org level. The risk is in Turso (shared database with org_id filtering) or in-memory caching.

**Finding:** Min's Turso queries all use parameterized `WHERE org_id = ?` clauses. The 5 tenant isolation tests verify this. However, there is no application-level cache that could mix org data — React state is per-session. The most likely root cause would be a bug in the API layer returning cached response data across requests.

### Step 3: Disable Affected User Sessions

**Question:** How do we immediately contain the exposure?

**Answer:**
1. Revoke Sarah Mitchell's Salesforce OAuth token via `/services/oauth2/revoke`
2. Clear the `min_sf_connection` cookie for the `langford` org
3. If the root cause is a shared cache: restart the Vercel deployment (promote current deployment to force cold start)

**Execution:** Token revocation is implemented in `revokeAndClearConnection()` in `sf-connection.ts`. In practice, we'd ask Sarah to log out (which triggers revocation) and log back in.

### Step 4: Preserve Evidence

**Question:** What evidence do we need to capture immediately?

**Answer (per IRP §8.1 Evidence Preservation Checklist):**

| # | Evidence | Method | Status |
|---|----------|--------|--------|
| 1 | Sarah's screenshot | Requested via email | Pending |
| 2 | Turso audit_log for both orgs at incident time | `SELECT * FROM audit_log WHERE created_at BETWEEN ... ORDER BY created_at` | Can execute |
| 3 | Salesforce MIN:AUDIT records for both orgs | SOQL query in both org contexts | Can execute |
| 4 | Vercel function logs at incident time | Export from Vercel dashboard | Can execute |
| 5 | Salesforce login history for both orgs | Setup → Login History → Export | Can execute |
| 6 | Git log for recent deployments | `git log --oneline --since="2026-02-20"` | Can execute |

**Finding:** All 6 evidence sources are accessible. Turso and Salesforce provide dual-write audit records. The evidence preservation checklist in the IRP is actionable.

### Step 5: Identify Root Cause

**Question:** What are the most likely root causes?

**Answer (ranked by probability):**

1. **Vercel edge function reuse** — If two requests from different orgs hit the same serverless function instance and share module-level state, data could leak. Check: are there any module-level variables that cache query results?
2. **HTTP response caching** — A CDN or browser cache returns a previous org's API response. Check: API routes return `Cache-Control: no-store` for sensitive data; PDF routes already have this header.
3. **React state bleed** — Impossible in Min's architecture (each user has their own browser session/React state tree).
4. **Turso query bug** — A missing `WHERE org_id = ?` clause. Check: tenant isolation tests (5 tests) cover all 4 tables.

**Finding:** Root cause #1 is the highest risk. Min does not currently use module-level caching for query results (all data is fetched per-request), so this is unlikely but should be verified. Root cause #2 is mitigated by `Cache-Control: no-store` on PDF routes but not on all API routes.

**Gap identified:** API responses for sensitive data (household detail, contacts, tasks) do not currently set `Cache-Control: no-store`. This should be added.

### Step 6: Patch and Deploy

**Question:** What would the fix look like?

**Answer:** Add `Cache-Control: no-store, private` header to all API responses containing client data. This is a one-line addition to `proxy.ts` (extend the existing PDF cache-control logic to all `/api/salesforce/*` routes). Deploy via Emergency Change process (direct push, post-implementation review within 24 hours).

### Step 7: Notify Affected Clients

**Question:** Who needs to be notified and what do we say?

**Answer:**
- **Sarah Mitchell (Langford Steele COO):** Immediate call to confirm containment, explain root cause, describe fix timeline
- **Margaret Yuen (Chen & Associates client):** If her PII (phone, email) was confirmed exposed, notification required per Customer Breach Notification Template (IRP §10.1)
- **Chen & Associates:** Notify the firm that their client's contact data was briefly visible to another org

**Notification timeline:** Per IRP, SEV-1 requires customer notification preparation to begin immediately. Actual notification within 72 hours of confirmation.

**Finding:** The Customer Breach Notification Template in the IRP is ready to use. However, we need Chen & Associates' primary contact information readily available — this should be documented in the vendor/customer register.

### Step 8: Regulatory Notification

**Question:** Does this require regulatory notification?

**Answer:** A phone number and email are PII under most state breach notification laws, but many states have safe harbors for data that is not highly sensitive (i.e., not SSN, financial account numbers, or health data). Consult legal counsel. If SSN or financial data had been exposed, notification would be mandatory.

**Finding:** Legal counsel designation is critical and not yet complete (IRP §3.2 lists this as TBD).

### Step 9: Post-Incident Review

**Question:** What would the post-incident review cover?

**Answer:** Schedule blameless post-mortem within 48 hours. Document timeline, root cause, impact, and lessons learned using Internal Incident Report Template (IRP §10.3). Create action items for preventing recurrence.

---

## Discussion Questions & Answers

### 1. How would we detect this incident?

**Current state:** Detection relies on user reports. Min does not have automated cross-tenant data leak detection.

**Gap:** No automated monitoring for cross-tenant anomalies. A future improvement would be to add a check that verifies API response org_id matches the authenticated session's org_id.

### 2. What would be our first containment action?

**Answer:** Revoke the affected user's OAuth token and force re-authentication. If the issue is systemic, promote the last known-good Vercel deployment to force a cold restart.

**Assessment:** Containment procedures are clear and executable. Token revocation is implemented and tested.

### 3. Who needs to be notified and when?

**Answer:** (1) Affected user's firm immediately, (2) exposed client's firm within 24 hours, (3) exposed client per state notification requirements (30-60 days), (4) regulators if required.

**Assessment:** Communication templates exist. Contact information for external parties needs to be documented.

### 4. What evidence would we need to preserve?

**Answer:** 6 evidence sources identified (see Step 4). All are accessible within minutes.

**Assessment:** Evidence preservation checklist is actionable. Chain of custody process documented. Dual-write audit buffer (Turso + Salesforce) provides independent records.

### 5. How would we communicate with affected clients?

**Answer:** Customer Breach Notification Template (IRP §10.1) with specifics filled in.

**Assessment:** Template is ready. Needs legal review before first actual use.

### 6. What would prevent this from happening?

**Answer:** (1) Add `Cache-Control: no-store` to all API responses, (2) add automated cross-tenant verification in API middleware, (3) continue expanding tenant isolation test coverage, (4) engage penetration tester to specifically test multi-tenant boundaries.

---

## Findings Summary

| # | Type | Finding |
|---|------|---------|
| 1 | Gap | API responses for client data do not set `Cache-Control: no-store` (only PDF routes do) |
| 2 | Gap | No automated detection for cross-tenant data anomalies |
| 3 | Gap | External IR contact and legal counsel not yet designated |
| 4 | Gap | Customer/firm contact registry not maintained for incident notification |
| 5 | Positive | Tenant isolation test suite (5 tests) covers all 4 Turso tables |
| 6 | Positive | Write-ahead audit buffer provides dual evidence sources (Turso + Salesforce) |
| 7 | Positive | Token revocation is implemented and wired into logout flow |
| 8 | Positive | Evidence preservation checklist is actionable with specific commands |
| 9 | Positive | Communication templates are complete and ready to customize |
| 10 | Positive | PII scrubbing prevents SSN/financial data from appearing in audit logs |

---

## Action Items

| # | Finding | Action | Owner | Due Date | Status |
|---|---------|--------|-------|----------|--------|
| 1 | API responses missing cache headers | Add `Cache-Control: no-store, private` to all `/api/salesforce/*` responses in `proxy.ts` | Jon Cambras | March 7, 2026 | Not started |
| 2 | No external IR contact | Identify and engage attorney or security consultant | Jon Cambras | April 2026 | Not started |
| 3 | No customer contact registry | Create contact list for all active customer firms | Jon Cambras | March 2026 | Not started |
| 4 | Communication templates need legal review | Send IRP §10 templates to legal counsel for review | Jon Cambras | After #2 | Blocked |

---

## Exercise Assessment

**Overall readiness: Moderate.**

The IRP's Scenario 1 playbook is well-structured and the steps are executable. Technical controls (tenant isolation tests, audit trail, token revocation, evidence preservation) are strong. The primary gaps are organizational: no external IR contact, no legal counsel designated, and no customer contact registry. These are known items on the SOC 2 roadmap.

**Next tabletop exercise:** Q2 2026 — Scenario 2: Compromised OAuth Token / Unauthorized Salesforce Access

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | 2026-02-21 | Jon Cambras | Initial tabletop exercise — Scenario 1 |
