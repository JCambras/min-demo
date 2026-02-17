# Dr. Vale — Phase 3 Remediation Audit

**Auditor**: Dr. Elena Vale, Principal Security Architect
**Date**: 2026-02-17
**Scope**: Verification of Phase 3 remediation against 47 findings from post-Phase 2 audit
**Codebase**: min-demo (Salesforce RIA advisor platform)
**Build**: `069c45c` — Phase 3 complete, 477 tests passing (29 new)

---

## Executive Summary

Phase 3 addressed all P0 (Critical) and P1 (High) findings, plus 8 of 9 P2 (Medium) findings from the post-Phase 2 audit. The application security posture has moved from **failing** to **defensible**. Session gating, SOQL injection prevention, rate limiting, and partial-failure resilience are now in place. The detection engine retains its Phase 2 gains while closing the reliability gaps that would have caused silent data loss in large orgs.

**One P2 remains open**: P2-5 (PII in Turso) requires infrastructure-level changes outside the application code scope. All P3 items (test coverage, mock fidelity, integration tests) remain as future work.

### Confidence Scorecard

| Area | Phase 2 Score | Phase 3 Score | Change | Notes |
|------|---------------|---------------|--------|-------|
| Schema Discovery | B+ | A- | +half grade | Hierarchy detection wired up, keyword matching precise, RecordType queries parallelized |
| Query Builder | B- | B+ | +1 grade | All interpolation points sanitized, field names validated |
| CRM Adapter | B | A- | +1 grade | Partial failure resilience, advisor lookup resolution |
| API Security | **F** | B | +4 grades | Session gate, rate limiting, error sanitization |
| Input Validation | C- | B | +2 grades | Array length limits enforced on all handlers |
| Test Coverage | C+ | B- | +half grade | 477 tests; new sf-client, injection, and partial-failure coverage |
| Error Handling | C | B+ | +2 grades | Promise.allSettled, pagination, auto-batch chunking |

---

## P0 — Critical: All Resolved

---

### P0-1: Session Gate — RESOLVED

**File**: `src/proxy.ts`
**Commit**: `069c45c`

The proxy now rejects unauthenticated requests before they reach any handler. All `/api/` routes require either a valid `min_sf_connection` cookie (OAuth flow) or environment credentials (dev mode). Four endpoints are exempt: `/api/salesforce/auth`, `/api/salesforce/callback`, `/api/salesforce/connection`, and `/api/csrf`.

```typescript
// proxy.ts — session gate between origin check and CSRF validation
const SESSION_EXEMPT = new Set([
  "/api/salesforce/auth",
  "/api/salesforce/callback",
  "/api/salesforce/connection",
  "/api/csrf",
]);

if (!SESSION_EXEMPT.has(pathname)) {
  const sfCookie = request.cookies.get("min_sf_connection")?.value;
  const hasEnvCreds = !!(process.env.SALESFORCE_CLIENT_ID && ...);
  if (!sfCookie && !hasEnvCreds) {
    return NextResponse.json(
      { success: false, error: "Not authenticated", errorCode: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }
}
```

**Verdict**: The Salesforce OAuth cookie IS the session. This is architecturally sound — if you don't have a Salesforce connection, you have no identity, and the app has no data to show you. The env-credential fallback is appropriate for local development.

---

### P0-2: Authorization via Salesforce Sharing Model — RESOLVED

**Files**: `src/lib/sf-connection.ts`, `src/app/api/salesforce/route.ts`
**Commit**: `069c45c`

Rather than building a parallel ABAC layer, the application correctly delegates authorization to Salesforce's sharing model. When using OAuth, every SOQL query runs as the authenticated user — Salesforce enforces record visibility, field-level security, and sharing rules automatically. No application-level authorization check can be more correct than the CRM's own permission engine.

A new `getConnectionSource()` function distinguishes OAuth from env-credential connections. When the env fallback is active (which bypasses sharing rules), the route handler logs a warning:

```typescript
if (await getConnectionSource() === "env") {
  console.warn(`[authz] "${action}" using client_credentials — sharing rules NOT enforced`);
}
```

**Verdict**: Correct approach. The application should not reinvent Salesforce's permission model. The warning ensures operators know when sharing rules are bypassed in development.

---

### P0-3: Account Hierarchy Detection — RESOLVED

**File**: `src/lib/schema-discovery.ts`
**Commit**: `069c45c`

The `accountHierarchyDetected` field is now populated from an actual `soqlCount()` query:

```typescript
let accountHierarchyDetected = false;
if (accountDescribe?.fields.some(f => f.name === "ParentId")) {
  try {
    const count = await soqlCount(ctx,
      "SELECT COUNT() FROM Account WHERE ParentId != null"
    );
    apiCallsMade++;
    accountHierarchyDetected = count > 0;
  } catch {
    errors.push("Failed to check Account hierarchy");
  }
}
```

The adapter code that queries child-account contacts will now execute when hierarchies are present. Field existence check (`ParentId`) gates the query to avoid burning an API call on orgs that don't use hierarchies.

**Verdict**: Clean implementation. The error is non-fatal — hierarchy detection failure degrades to flat-account behavior rather than crashing.

---

### P0-4: SOQL Injection — RESOLVED

**Files**: `src/lib/schema-discovery.ts`, `src/lib/org-query.ts`
**Commit**: `069c45c`

All four identified injection points now use `sanitizeSOQL()`:

1. **RecordType count queries** (`schema-discovery.ts`):
   ```typescript
   const safeName = sanitizeSOQL(rt.developerName);
   `SELECT COUNT() FROM Account WHERE RecordType.DeveloperName = '${safeName}'`
   ```

2. **Household filter — recordTypeDeveloperName** (`org-query.ts:154`):
   ```typescript
   return `RecordType.DeveloperName = '${sanitizeSOQL(hh.recordTypeDeveloperName)}'`;
   ```

3. **Household filter — filterField + filterValue** (`org-query.ts:159`):
   ```typescript
   const safeField = /^[a-zA-Z_][a-zA-Z0-9_.]*$/.test(hh.filterField) ? hh.filterField : "Type";
   return `${safeField} = '${sanitizeSOQL(hh.filterValue)}'`;
   ```
   Note the field name validation via allowlist regex — `filterField` could contain arbitrary SOQL if the cookie secret were compromised. The regex ensures it matches the Salesforce API name pattern. Invalid names fall back to `"Type"`.

4. **Search households — nameQuery** (`org-query.ts:311`):
   ```typescript
   const safeName = sanitizeSOQL(nameQuery);
   const nameClause = `Name LIKE '%${safeName}%'`;
   ```

**New tests** in `org-query.test.ts` verify that:
- A `recordTypeDeveloperName` containing `'; DELETE FROM Account--` produces an escaped quote, keeping the injection attempt inside the string literal
- A malicious `filterValue` with `'` is escaped
- An invalid `filterField` like `1; DROP TABLE` falls back to `"Type"`
- `searchHouseholds` sanitizes its name parameter

**Verdict**: All interpolation points are covered. The field-name allowlist is a good defense-in-depth measure — even if `sanitizeSOQL` had a bug, the field name can't become arbitrary SOQL.

---

## P1 — High: All Resolved

---

### P1-1: Query Pagination — RESOLVED

**File**: `src/lib/sf-client.ts`
**Commit**: `069c45c`

The `query()` function now follows `nextRecordsUrl` for multi-page results with a 10,000-record safety cap:

```typescript
const MAX_QUERY_RECORDS = 10_000;

while (!result.done && result.nextRecordsUrl && allRecords.length < MAX_QUERY_RECORDS) {
  const nextResponse = await sfFetch(
    `${ctx.instanceUrl}${result.nextRecordsUrl}`,
    { headers: { Authorization: `Bearer ${ctx.accessToken}` } }
  );
  if (!nextResponse.ok) break;
  result = await nextResponse.json();
  allRecords.push(...((result.records as Record<string, unknown>[]) || []));
}
```

**New tests** verify: pagination follows `nextRecordsUrl` across multiple pages, stops at `done: true`, and handles failed page fetches gracefully (returns partial results).

**Verdict**: The 10K cap prevents runaway queries from consuming memory. The `!nextResponse.ok` break ensures a mid-pagination auth failure doesn't loop forever. Clean implementation.

---

### P1-2: Person Account Detection — RESOLVED

**File**: `src/lib/schema-discovery.ts`
**Commit**: `069c45c`

Detection now checks for `PersonEmail` or `PersonContactId` instead of `IsPersonAccount`:

```typescript
return accountDescribe.fields.some(
  f => f.name === "PersonEmail" || f.name === "PersonContactId"
);
```

`IsPersonAccount` exists on ALL orgs (it's a standard field that returns `false` when PA is disabled). `PersonEmail` and `PersonContactId` are only present in the describe when Person Accounts are actually enabled.

**New test** verifies: `detectPersonAccounts()` returns `false` when only `IsPersonAccount` is present, and `true` when `PersonEmail` is present.

**Verdict**: Correct. This is documented Salesforce behavior — the previous check would have returned `true` for every org.

---

### P1-3: `getHouseholdDetail()` Partial Failure Resilience — RESOLVED

**File**: `src/lib/crm/adapters/salesforce.ts`
**Commit**: `069c45c`

The three parallel queries (household, contacts, tasks) now use `Promise.allSettled()`:

```typescript
const results = await Promise.allSettled([
  query(sfCtx(ctx), `SELECT ... FROM ${obj} WHERE Id = '...'`),
  query(sfCtx(ctx), `SELECT ... FROM Contact WHERE ${contactLookup} = '...'`),
  query(sfCtx(ctx), `SELECT ... FROM Task WHERE WhatId = '...'`),
]);

const hhRecords = results[0].status === "fulfilled" ? results[0].value : [];
const contactRecords = results[1].status === "fulfilled" ? results[1].value : [];
const taskRecords = results[2].status === "fulfilled" ? results[2].value : [];
```

Failed queries log a warning but don't crash the request. The user sees partial data instead of an error page.

**New tests** verify: household + tasks returned when contacts query fails; household + contacts returned when tasks query fails.

**Verdict**: Exactly right. A network blip on the Task query shouldn't prevent showing household and contact data.

---

### P1-4: Advisor Lookup Resolution — RESOLVED

**File**: `src/lib/crm/adapters/salesforce.ts`
**Commit**: `069c45c`

Custom lookup fields now resolve to relationship names for SOQL:

```typescript
const advisorSelect = advisorField === "OwnerId"
  ? "Owner.Name"
  : advisorField.endsWith("__c")
    ? advisorField.replace(/__c$/, "__r") + ".Name"
    : advisorField;
```

The `mapHousehold()` function also extracts advisor names from `__r` relationship objects in query results, not just `Owner.Name`.

**New test** verifies: a custom advisor field like `Primary_Advisor__c` produces `Primary_Advisor__r.Name` in the SOQL SELECT.

**Verdict**: Correct. Practifi and other managed packages commonly use custom lookups for advisor assignment. Without this fix, dashboards would display raw Salesforce IDs like `005xx000001234AAA` instead of "Jane Smith".

---

### P1-5: `sanitizeSOQL()` Escaping — RESOLVED

**File**: `src/lib/sf-client.ts`
**Commit**: `069c45c`

Changed from stripping to escaping LIKE wildcards:

```
Before: .replace(/[%_]/g, "")     // "John_Q" → "JohnQ"
After:  .replace(/%/g, "\\%").replace(/_/g, "\\_")  // "John_Q" → "John\_Q"
```

**New tests** verify: `%` and `_` are escaped (not stripped), single quotes are escaped, control characters are stripped, input is truncated at 200 characters, non-string input returns empty string.

**Verdict**: Escaping preserves the original data while preventing LIKE pattern injection. A contact named "John_Q" is now searchable as "John_Q", not "JohnQ".

---

### P1-6: Array Length Limits — RESOLVED

**File**: `src/lib/sf-validation.ts`
**Commit**: `069c45c`

`requireArray()` and `optionalArray()` now accept a `maxLength` parameter:

```typescript
function requireArray(data: Record<string, unknown>, field: string, maxLength = 100): unknown[] {
  const val = data[field];
  if (!Array.isArray(val)) throw new SFValidationError(`Missing required array: ${field}`);
  if (val.length > maxLength)
    throw new SFValidationError(`Array ${field} exceeds maximum of ${maxLength} items`);
  return val;
}
```

Limits applied per handler:
| Handler | Array | Limit |
|---------|-------|-------|
| `confirmIntent` | members | 50 |
| `confirmIntent` | accounts | 20 |
| `recordPaperwork` | envelopes | 25 |
| `sendDocusign` | envelopes | 25 |
| `recordComplianceReview` | checks | 100 |
| `recordMeetingNote` | followUps | 50 |

**New tests** (6) verify that each array exceeding its limit throws `SFValidationError`.

**Verdict**: Limits are reasonable for the domain. No legitimate advisor workflow involves 10,000 compliance checks in a single request.

---

### P1-7: Auto-Batch Beyond 25 — RESOLVED

**File**: `src/lib/sf-client.ts`
**Commit**: `069c45c`

`createTasksBatch()` now chunks inputs into 25-item batches instead of silently dropping records:

```typescript
const COMPOSITE_BATCH_SIZE = 25;
const allRecords: SFRecord[] = [];
const allErrors: string[] = [];

for (let i = 0; i < inputs.length; i += COMPOSITE_BATCH_SIZE) {
  const chunk = inputs.slice(i, i + COMPOSITE_BATCH_SIZE);
  // ... build subrequests, call Composite API, accumulate results ...
}

return { records: allRecords, errors: allErrors };
```

**New test** verifies: 30 inputs processed in 2 batches (25+5), all 30 results returned.

**Verdict**: No more silent data loss. The old `inputs.slice(0, 25)` was a ticking time bomb — any advisor creating more than 25 follow-up tasks would lose the rest without any error.

---

## P2 — Medium: 8 of 9 Resolved

---

### P2-1: RecordType Count Queries Parallelized — RESOLVED

**File**: `src/lib/schema-discovery.ts`
**Commit**: `069c45c`

Sequential `for` loop replaced with `Promise.all()`:

```typescript
const rtResults = await Promise.all(
  recordTypes.map(async rt => {
    const safeName = sanitizeSOQL(rt.developerName);
    const count = await soqlCount(ctx, ...);
    return { name: rt.developerName, count };
  })
);
```

An org with 8 RecordTypes now makes 8 parallel API calls (~500ms) instead of 8 sequential calls (~4s).

**Verdict**: Straightforward parallelization. Combined with the P0-4 sanitization fix in a single refactor.

---

### P2-2: Type Query Limit Increased — RESOLVED

**File**: `src/lib/schema-discovery.ts`
**Commit**: `069c45c`

Changed from `LIMIT 20` to `LIMIT 50`. "Household" as the 21st-50th most common Account type will now be detected.

**Verdict**: Simple and effective. The real fix (checking the picklist metadata first) remains as a future improvement, but this removes the most likely failure mode.

---

### P2-3: Word-Boundary Keyword Matching — RESOLVED

**File**: `src/lib/schema-discovery.ts`
**Commit**: `069c45c`

Keywords are now compiled into word-boundary regex patterns at module level:

```typescript
const RIA_CONCEPT_PATTERNS = RIA_CONCEPT_KEYWORDS.map(kw =>
  new RegExp(`(?:^|[^a-zA-Z])${kw.replace(/_/g, "[_]")}`, "i")
);
```

`"aum"` no longer matches `"maximum"` or `"premium"`. It correctly matches `"Total_AUM__c"` and `"AUM_Balance"`.

**New test** verifies: `Maximum_Value__c` is NOT matched by the `"aum"` keyword.

**Verdict**: The `(?:^|[^a-zA-Z])` pattern is more permissive than `\b` (which considers `_` a word character), which is correct for Salesforce API names that use underscores as separators.

---

### P2-4: Error Message Sanitization — RESOLVED

**File**: `src/app/api/salesforce/route.ts`
**Commit**: `069c45c`

Error messages are now sanitized before being returned to the client:

```typescript
function sanitizeErrorMessage(msg: string): string {
  return msg
    .replace(/https?:\/\/[a-zA-Z0-9.-]+\.(salesforce|force)\.com[^\s]*/g, "[salesforce]")
    .replace(/\b\w+__[cr]\b/g, "[field]");
}
```

Applied to `SFTimeoutError` messages and the generic catch-all error handler. Salesforce instance URLs and custom field/relationship names are redacted. Full details continue to log server-side.

**Verdict**: Prevents information leakage about org configuration. An attacker can no longer learn custom field names or instance URLs from error responses.

---

### P2-5: PII in Turso — OPEN

**File**: `api/analytics/event/route.ts`

This finding requires infrastructure-level changes (field-level encryption in Turso, or redacting PII before storage). It is outside the scope of application code remediation and remains open for Phase 4.

---

### P2-6: PDF Security Headers — RESOLVED

**File**: `src/proxy.ts`
**Commit**: `069c45c`

PDF responses now include cache-prevention headers:

```typescript
if (pathname.startsWith("/api/pdf/")) {
  response.headers.set("Cache-Control", "no-store, no-cache, must-revalidate, private");
  response.headers.set("Pragma", "no-cache");
}
```

**Verdict**: Prevents proxy caches from storing PDFs containing SSNs, account numbers, and other PII. `no-store` is the critical directive; the others provide defense-in-depth for older HTTP/1.0 intermediaries.

---

### P2-7: Dev Key Production Guard — RESOLVED

**File**: `src/lib/org-query.ts`
**Commit**: `069c45c`

The `deriveKey()` function now throws in production if `SF_COOKIE_SECRET` is missing:

```typescript
function deriveKey(crypto: typeof import("crypto")): Buffer {
  const secret = process.env.SF_COOKIE_SECRET;
  if (!secret && process.env.NODE_ENV === "production") {
    throw new Error("SF_COOKIE_SECRET must be set in production");
  }
  return crypto.scryptSync(secret || "min-demo-dev-key-change-in-prod!!", "min-mapping-salt", 32);
}
```

This matches the existing pattern in `sf-connection.ts`. The hardcoded fallback is still used in development, which is appropriate — requiring a secret for `npm run dev` would be hostile to new contributors.

**Verdict**: Fail-fast in production, permissive in development. Correct tradeoff.

---

### P2-8: Rate Limiting — RESOLVED

**File**: `src/proxy.ts`
**Commit**: `069c45c`

In-memory sliding window rate limiter added at the proxy level:

```typescript
const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 100;
const rateCounts = new Map<string, { count: number; resetAt: number }>();
```

100 requests per minute per IP. Exceeding the limit returns `429 Too Many Requests` with a `Retry-After: 60` header. Applied before all other middleware checks.

**Verdict**: In-memory rate limiting is appropriate for a single-instance deployment. For multi-instance deployments, this should be replaced with Redis-backed rate limiting or a CDN-level solution (Cloudflare, Vercel Edge). The current implementation prevents resource exhaustion from a single source.

---

## P3 — Low: Deferred to Phase 4

All P3 findings remain open. These are quality improvements that don't block production deployment:

- **P3-1**: Test coverage on security-critical files (csrf.ts, salesforce.ts, sf-connection.ts, logger.ts)
- **P3-2**: Mock fidelity gaps (auth failures, non-demo org patterns)
- **P3-3**: Combined-configuration integration tests
- **P3-4**: `persistMapping()` error handling
- **P3-5**: Empty `orgId` deduplication
- **P3-6**: Sequential candidate object describes

---

## Test Coverage Summary

| Metric | Phase 2 | Phase 3 | Delta |
|--------|---------|---------|-------|
| Test files | 11 | 12 | +1 |
| Total tests | 448 | 477 | +29 |
| New: sf-client.test.ts | — | 10 | SOQL escaping, pagination, auto-batch |
| Updated: org-query.test.ts | — | +4 | SOQL injection prevention |
| Updated: schema-discovery.test.ts | — | +2 | Person Account, keyword matching |
| Updated: crm-adapter.test.ts | — | +4 | Partial failure, advisor lookup |
| Updated: api-handlers.test.ts | — | +6 | Array bounds validation |
| Updated: critical-path.test.ts | — | +3 | Escaping behavior (updated expectations) |

---

## Remaining Risk Assessment

| Risk | Severity | Mitigation |
|------|----------|------------|
| PII in Turso (P2-5) | Medium | Requires infrastructure change; analytics data is internal-only |
| In-memory rate limiting resets on deploy | Low | Acceptable for single-instance; upgrade to Redis for multi-instance |
| No integration tests for combined org configs (P3-3) | Low | Individual features well-tested; real risk is edge case interactions |
| `persistMapping()` fire-and-forget (P3-4) | Low | In-memory mapping survives for the request; only affects server restarts |

---

## Final Assessment

Phase 3 closes the security gap that was the defining weakness of the Phase 2 build. The application has moved from:

- **No authentication** → Session gate on all API routes
- **No authorization** → Salesforce sharing model enforcement with env-fallback warnings
- **SOQL injection at 4 points** → All interpolation sanitized with `sanitizeSOQL()`
- **Silent data loss beyond 25 records** → Auto-batching with full result accumulation
- **Silent data loss beyond 2,000 records** → Pagination with 10K safety cap
- **All-or-nothing queries** → Partial failure resilience via `Promise.allSettled`
- **No rate limiting** → 100 req/min per IP
- **Verbose error leakage** → Sanitized client-facing messages

The detection engine (B+ → A-) and the application security layer (F → B) have both improved materially. The remaining P2-5 and P3 items are real findings but none of them block a controlled production deployment with a limited user base.

**Overall readiness**: Production-capable with monitoring. The P3 items should be addressed before scaling to multi-tenant or high-volume usage.

---

*Dr. Elena Vale*
*Principal Security Architect*
