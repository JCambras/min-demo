# Dr. Vale — Enterprise Readiness Audit

**Auditor**: Dr. Elena Vale, Principal Security Architect
**Date**: 2026-02-17
**Scope**: Full-stack security, reliability, and correctness audit post-Phase 2
**Codebase**: min-demo (Salesforce RIA advisor platform)
**Build**: `43b8d13` — Phase 2 complete, 448 tests passing

---

## Executive Summary

Phase 1 and Phase 2 addressed the schema discovery blind spots identified in the Dara Osei audit. The detection engine is now significantly more capable — Practifi, junctions, hierarchies, FLS, required fields, and hybrid orgs are all handled. **However, the broader application has structural security gaps that must be resolved before enterprise deployment.** This audit identifies 47 findings across 6 categories.

### Confidence Scorecard

| Area | Score | Phase 2 Change | Notes |
|------|-------|----------------|-------|
| Schema Discovery | B+ | +2 grades | Practifi, junction, FLS, hybrid all landed |
| Query Builder | B- | +1 grade | Compound filters work; SOQL sanitization gaps remain |
| CRM Adapter | B | +1 grade | Junction + hierarchy paths added |
| API Security | **F** | unchanged | Zero authentication on all endpoints |
| Input Validation | C- | unchanged | Unbounded arrays, weak email validation |
| Test Coverage | C+ | +1 grade | 448 tests; 0% on CSRF, salesforce.ts, logger |
| Error Handling | C | unchanged | All-or-nothing queries, swallowed errors |

---

## Phase 3 Findings (Priority Order)

### P0 — Critical (blocks production deployment)

---

#### P0-1: Zero Authentication on All Endpoints

**Severity**: CRITICAL
**Files**: Every route under `src/app/api/`

No endpoint validates user identity. There is no session token, no JWT, no middleware-level auth check. Any HTTP client can call any endpoint anonymously.

**Impact**:
- Anyone can query financial account balances (`queryFinancialAccounts`)
- Anyone can enumerate household PII (`getHouseholdDetail`)
- Anyone can trigger Salesforce OAuth flows (`/api/salesforce/auth`)
- Anyone can seed test data into production (`/api/salesforce/seed/*`)
- SEC Rule 17a-4 requires identity-tracked audit trails — impossible without auth

**Example** — `/api/salesforce/route.ts` dispatches to all handlers with zero auth:
```typescript
// Line 47-159: No session check, no token validation
const { action, data } = await request.json();
const handler = allHandlers[action];
const response = await handler(data, adapter, crmCtx);
```

**Recommendation**: Add session middleware in `proxy.ts` that validates a signed session cookie before routing to any handler. Exempt only `/api/salesforce/auth` and `/api/salesforce/callback`.

---

#### P0-2: No Authorization on Data Access

**Severity**: CRITICAL
**Files**: `src/app/api/salesforce/handlers/households.ts:62`, `handlers/financial-accounts.ts:63`

Even with authentication, there is no check that the caller has permission to view a given household. An authenticated advisor could view any other advisor's clients by passing arbitrary household IDs.

```typescript
// households.ts:62 — No ownership check
getHouseholdDetail: async (raw, adapter, ctx) => {
  const data = validate.getHouseholdDetail(raw);
  const result = await adapter.getHouseholdDetail(ctx, data.householdId);
  // Returns contacts, tasks, notes for ANY household ID
```

**Recommendation**: Before returning data, verify the requesting user owns or has sharing access to the household. Use the Salesforce `UserRecordAccess` object or enforce sharing rules in the SOQL query.

---

#### P0-3: Account Hierarchy Detection Not Wired Up

**Severity**: HIGH
**File**: `src/lib/schema-discovery.ts:586`

The `accountHierarchyDetected` field is hardcoded to `false` in `discoverOrg()`. The plan called for a `soqlCount()` check against `Account WHERE ParentId != null`, but it was never implemented. The adapter code in `salesforce.ts` that queries child-account contacts will never execute.

```typescript
// schema-discovery.ts:586
accountHierarchyDetected: false, // populated in Step 5c when implemented
```

**Recommendation**: Add the hierarchy detection query in Step 5c of `discoverOrg()`:
```typescript
let accountHierarchyDetected = false;
if (accountDescribe?.fields.some(f => f.name === "ParentId")) {
  try {
    const count = await soqlCount(ctx, "SELECT COUNT() FROM Account WHERE ParentId != null");
    apiCallsMade++;
    accountHierarchyDetected = count > 0;
  } catch { /* non-critical */ }
}
```

---

#### P0-4: SOQL Injection via Unsanitized String Interpolation

**Severity**: HIGH
**Files**: `schema-discovery.ts:356`, `org-query.ts:154,159`, `salesforce.ts:177`

Multiple locations interpolate strings into SOQL without using `sanitizeSOQL()`:

1. **RecordType count queries** — `schema-discovery.ts:356`:
   ```typescript
   `SELECT COUNT() FROM Account WHERE RecordType.DeveloperName = '${rt.developerName}'`
   ```
   `rt.developerName` comes from the Salesforce describe API. While unlikely to be malicious, it's raw interpolation without sanitization.

2. **Household filter values** — `org-query.ts:154,159`:
   ```typescript
   return `RecordType.DeveloperName = '${hh.recordTypeDeveloperName}'`;
   return `${hh.filterField} = '${hh.filterValue}'`;
   ```
   These values come from an encrypted cookie. If the cookie secret is compromised, an attacker controls SOQL fragments.

3. **Contact search** — `salesforce.ts:177`:
   ```typescript
   `WHERE FirstName LIKE '%${q}%' OR LastName LIKE '%${q}%'`
   ```
   While `q` passes through `sanitizeSOQL()` in the adapter, the escaping converts `'` to `\'` which can still produce malformed SOQL when wrapped in single quotes.

**Recommendation**: Apply `sanitizeSOQL()` consistently at every interpolation point. Consider a tagged template literal (`soql\`...\``) that auto-sanitizes interpolated values.

---

### P1 — High (blocks enterprise deployment at scale)

---

#### P1-1: No Pagination for >2,000 Records

**Severity**: HIGH
**File**: `src/lib/sf-client.ts:179-194`

The `query()` function returns `result.records` without checking `result.done`. Salesforce SOQL returns at most 2,000 records per call (or 5,000 depending on context). Large orgs will silently lose data.

Additionally, `sf-validation.ts` caps OFFSET at 2,000 — records beyond position 2,000 are inaccessible.

**Recommendation**: Check `result.done` and either auto-paginate using `nextRecordsUrl` or return `{ records, done, totalSize }` so callers can paginate.

---

#### P1-2: Person Account Detection is Inverted

**Severity**: HIGH
**File**: `src/lib/schema-discovery.ts:382-385`

```typescript
function detectPersonAccounts(accountDescribe: ObjectDescribe | null): boolean {
  return accountDescribe.fields.some(f => f.name === "IsPersonAccount");
}
```

The `IsPersonAccount` **field exists on all Account objects** regardless of whether Person Accounts are enabled. The correct check is whether Account records with `IsPersonAccount = true` actually exist, or whether the `PersonContact` fields (like `PersonEmail`) are present in the describe.

**Recommendation**: Check for `PersonEmail` or `PersonContactId` in the describe fields — these only exist when Person Accounts are actually enabled.

---

#### P1-3: `getHouseholdDetail()` Is All-or-Nothing

**Severity**: HIGH
**File**: `src/lib/crm/adapters/salesforce.ts:269-273`

```typescript
const [hhRecords, contactRecords, taskRecords] = await Promise.all([...]);
```

If any one of the three parallel queries fails, the entire call throws. A network blip on the Task query means the user sees an error page instead of partial data (household + contacts but no tasks).

**Recommendation**: Use `Promise.allSettled()` and return partial results. The frontend should handle missing sections gracefully.

---

#### P1-4: Advisor Field Query Doesn't Resolve Lookups

**Severity**: MEDIUM-HIGH
**File**: `src/lib/crm/adapters/salesforce.ts:389`

```typescript
const advisorSelect = advisorField === "OwnerId" ? "Owner.Name" : advisorField;
```

When `advisorField` is a custom lookup like `Primary_Advisor__c`, the code selects the raw ID instead of the relationship name (`Primary_Advisor__r.Name`). The dashboard will show a Salesforce ID instead of a name.

**Recommendation**: If the advisor field is a reference type, append `__r.Name` for the SOQL select.

---

#### P1-5: `sanitizeSOQL()` Strips Characters Instead of Escaping

**Severity**: MEDIUM-HIGH
**File**: `src/lib/sf-client.ts:55`

```typescript
.replace(/[%_]/g, "")  // strip LIKE wildcards
```

This removes `%` and `_` from user input. A contact named "John_Q" becomes "JohnQ". The correct behavior for LIKE contexts is to escape them (`\%`, `\_`), not remove them.

**Recommendation**: Escape wildcards instead of stripping: `.replace(/%/g, "\\%").replace(/_/g, "\\_")`.

---

#### P1-6: Unbounded Array Inputs in Handlers

**Severity**: MEDIUM-HIGH
**Files**: `handlers/onboarding.ts:17`, `handlers/households.ts:38`

Arrays in request bodies have no length limits. An attacker can pass 10,000 members in `confirmIntent`, triggering 10,000 Salesforce create calls.

```typescript
const members = requireArray(d, "members").map(m => { ... });
// No cap on array length
```

**Recommendation**: Add `maxLength` parameter to `requireArray()`: `requireArray(d, "members", 50)`.

---

#### P1-7: Batch Operations Silently Drop Records Beyond 25

**Severity**: MEDIUM
**File**: `src/lib/sf-client.ts:371`

```typescript
const batch = inputs.slice(0, 25);
```

The Composite API is limited to 25 subrequests. If `createTasksBatch()` receives 50 inputs, the last 25 are silently dropped.

**Recommendation**: Either throw if `inputs.length > 25`, or automatically batch into multiple Composite calls.

---

### P2 — Medium (should fix before GA)

---

#### P2-1: RecordType Count Queries Are Sequential

**File**: `src/lib/schema-discovery.ts:354-359`

RecordType-based count queries run in a `for` loop with `await`. An org with 8 RecordTypes makes 8 sequential API calls (~4 seconds). Should parallelize with `Promise.all()`.

---

#### P2-2: Account Type Query Misses Minority Values

**File**: `src/lib/schema-discovery.ts:542-546`

The `GROUP BY Type ORDER BY COUNT(Id) DESC LIMIT 20` query only returns the top 20 Type values. If "Household" is the 21st most common type, the heuristic misses it entirely.

**Recommendation**: Increase to `LIMIT 50`, or better, check the schema picklist first and only fall back to data query when the picklist is unrestricted.

---

#### P2-3: `identifyCandidateObjects()` Keyword Matching Is Too Broad

**File**: `src/lib/schema-discovery.ts:405-408`

Keywords like `"aum"` match `"maximum"`, `"premium"`. Keywords like `"family"` match `"familiarization"`. No word-boundary enforcement.

**Recommendation**: Use word-boundary regex: `/\baum\b/i` instead of `nameLower.includes("aum")`.

---

#### P2-4: Verbose Error Messages Leak Internal Details

**Files**: `discover/route.ts:108`, `salesforce/route.ts:153`

Error responses expose Salesforce instance URLs, field names, and stack traces. Attackers learn org configuration from error messages.

**Recommendation**: Return generic messages in production; log full details server-side.

---

#### P2-5: PII Unencrypted in Turso Database

**File**: `api/analytics/event/route.ts:10-11`

Analytics events store raw JSON including household names and IDs. No field-level encryption on the database.

---

#### P2-6: PDF Endpoints Return PII Without Security Headers

**Files**: `api/pdf/compliance/route.ts:328`, `api/pdf/dashboard/route.ts:228`

PDF responses containing SSNs and account numbers lack `Cache-Control: no-store` and `Content-Disposition: attachment` headers. Proxy caches could store sensitive PDFs.

---

#### P2-7: Cookie Encryption Key Has Hardcoded Dev Fallback

**File**: `src/lib/sf-connection.ts:10-13`, `src/lib/org-query.ts:105`

```typescript
const secret = process.env.SF_COOKIE_SECRET || "min-demo-dev-key-change-in-prod!!";
```

Hardcoded fallback visible in source. Should fail fast if env var is missing.

---

#### P2-8: No Rate Limiting on Any Endpoint

**Files**: All routes

Zero rate limiting. PDF generation, schema discovery, and analytics endpoints are all vulnerable to resource exhaustion attacks.

---

### P3 — Low (quality improvements)

---

#### P3-1: 0% Test Coverage on Security-Critical Files

No tests exist for:
- `csrf.ts` — Token generation and constant-time comparison
- `salesforce.ts` — CSRF retry, timeout abort, exponential backoff
- `sf-connection.ts` — OAuth flow, token exchange, encryption
- `logger.ts` — Log formatting and data serialization

---

#### P3-2: Mock Fidelity Gaps in Test Suite

- `sf-connection` mock always succeeds (never tests auth failures)
- `orgQuery` mock is hardcoded to demo defaults (never tests FSC/Practifi paths in handler tests)
- `createContactsBatch` mock returns extra `name` field not in real response
- `fireWorkflowTrigger` mock always succeeds (never tests workflow failures)

---

#### P3-3: No Integration Tests for Combined Org Configurations

No test exercises Person Accounts + FSC + RecordType + custom advisor field together. Each feature is tested in isolation but the intersection is untested.

---

#### P3-4: `persistMapping()` Is Fire-and-Forget

**File**: `src/lib/org-query.ts:20-23`

If cookie persistence fails, the in-memory mapping is set but the cookie is not. On server restart, the mapping is lost with no indication.

---

#### P3-5: Empty `orgId` Causes Deduplication Failures

**File**: `src/lib/schema-discovery.ts:560-568`

If the Organization query fails, `orgId` is `""`. Two different orgs could both map to `orgId: ""` in the database, overwriting each other's mappings.

---

#### P3-6: Sequential Candidate Object Describes Hit Rate Limits

**File**: `src/lib/schema-discovery.ts:465-478`

Managed package object describes run in a sequential `for` loop inside `discoverOrg()`. With 2+ objects, this adds latency. Parallel with concurrency limit would be better.

---

## Remediation Roadmap

### Phase 3a — Security Hardening (P0s)
1. Add session middleware with signed cookie validation
2. Add household-level authorization checks
3. Wire up account hierarchy detection in `discoverOrg()`
4. Fix SOQL sanitization at all interpolation points
5. Fix Person Account detection (check for `PersonEmail` field)

### Phase 3b — Reliability (P1s)
6. Add query pagination (respect `done` flag)
7. Use `Promise.allSettled()` in `getHouseholdDetail()`
8. Resolve advisor lookup fields correctly
9. Fix `sanitizeSOQL()` to escape instead of strip
10. Add array length limits to request validation
11. Auto-batch Composite API calls beyond 25

### Phase 3c — Hardening (P2s)
12. Parallelize RecordType count queries
13. Increase Type value query limit
14. Add word-boundary matching for candidate objects
15. Sanitize error responses for production
16. Add rate limiting middleware
17. Add security headers to PDF responses
18. Remove hardcoded encryption key fallback

### Phase 3d — Test Coverage (P3s)
19. Add tests for csrf.ts, salesforce.ts, sf-connection.ts
20. Improve mock fidelity (auth failures, non-demo org patterns)
21. Add combined-configuration integration tests
22. Fix persistMapping error handling

---

## What Phase 2 Got Right

The schema discovery engine is now genuinely enterprise-capable:
- **Practifi detection** works end-to-end with junction objects
- **Hybrid org detection** generates correct compound SOQL filters
- **FLS warnings** catch silent data loss before it happens
- **Required field gaps** prevent creation failures before they occur
- **448 tests** with 41 new Phase 2 tests — all green

The detection engine is no longer the bottleneck. **The application security layer is.**

---

*Dr. Elena Vale*
*Principal Security Architect*
