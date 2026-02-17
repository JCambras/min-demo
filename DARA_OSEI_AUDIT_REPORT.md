# DARA OSEI — Schema Discovery & Salesforce Intelligence Audit
## Min Codebase Review — February 2026

---

### Executive Summary

Min has a **meaningfully more sophisticated Salesforce integration than I expected from an AI-generated codebase.** The Schema Discovery Engine (`schema-discovery.ts`, 1,048 lines) makes 7–8 API calls to introspect an org's metadata and dynamically generates SOQL through `org-query.ts` — this is the right architecture. The hexagonal CRM port/adapter pattern (`crm/port.ts` → `crm/adapters/salesforce.ts`) means swapping Wealthbox or Redtail in later is real, not theoretical.

That said, the integration was built and tested against one pattern — Account with `Type = 'Household'` — and there are seven patterns in the wild. The gaps are exactly where I'd expect from a team that hasn't yet deployed to a $1B+ firm with FSC, managed packages, and an M&A history. Here's what needs to change.

---

## SECTION 1: HOUSEHOLD DETECTION PATTERN COVERAGE

Min's household detection lives in `detectHousehold()` at `schema-discovery.ts:668-768`. It implements four detection patterns plus a fallback. Here's how those map to the seven real-world patterns.

---

### Pattern 1 — Native FSC Household (FinServ__Household__c)

**PARTIALLY HANDLED**

Min does **not** query `FinServ__Household__c` as its own object. Instead, it detects FSC indirectly via Account RecordTypes — `schema-discovery.ts:674-691` searches `acct.recordTypeInfos` for any RecordType with `developerName` matching `/household/i`. This catches `IndustriesHousehold` (the default FSC RecordType), which is how most FSC orgs surface households.

However: FSC's native data model has `FinServ__Household__c` as a separate object, with `FinServ__RelatedContact__c` junction records and `FinServ__PrimaryGroup__c` on Contact. Min never queries these objects. The `FSC_OBJECT_PREFIXES` list at `schema-discovery.ts:135-144` includes `FinServ__ContactContactRelation__c` and `FinServ__AccountAccountRelation__c` but **not** `FinServ__Household__c`.

**What breaks:** An org that uses `FinServ__Household__c` as the actual household object (not just Account with a RecordType) will have its household detection fall through to Pattern 3 (custom object) or Pattern 4 (fallback). The `RIA_CONCEPT_KEYWORDS` at line 148 include `"household"` so `FinServ__Household__c` *could* match Pattern 3 — but it would get 0.65 confidence and a warning instead of 0.95. The `FinServ__RelatedContact__c` membership model is completely ignored.

**Fix location:** `schema-discovery.ts:668` — add a check before Pattern 1 that looks for `FinServ__Household__c` in `allObjects` and, if found, queries its describe to understand the membership junction.

---

### Pattern 2 — Account Hierarchy (Parent-Child Accounts)

**PARTIALLY HANDLED**

Min detects `Account` with `Type = 'Household'` (Pattern 2, line 693-712) and with RecordType (Pattern 1, line 674-691). Both produce `object: "Account"`, which is correct.

Min does **not** traverse `ParentId` relationships. In a parent-child hierarchy, individual Contacts have their own Account records, and those child Accounts roll up to a parent Account via `Account.ParentId`. Min queries `Contact WHERE AccountId = '${householdId}'` (`salesforce.ts:242`) — this finds Contacts directly on the household Account, but misses Contacts sitting on child Accounts underneath it.

**What breaks:** A firm with "Smith Household" (parent Account) → "John Smith" (child Account) → Contact "John Smith" would show 0 contacts on the Smith Household in Min. The household would appear empty.

**Fix location:** `salesforce.ts:242` — when getting household contacts, also query `Contact WHERE Account.ParentId = '${safeId}'` and merge results.

---

### Pattern 3 — Custom Junction Objects

**PARTIALLY HANDLED**

The Schema Discovery Engine detects custom objects matching `/household|hh_|family|client_group|relationship_group/i` at `schema-discovery.ts:734-752`. If found, it inspects the object's fields for advisor, AUM, tier, and status fields using `findFieldByPattern()` at lines 1038-1047.

However, Min does **not** discover junction objects that *link* Contacts to a custom household. `detectContact()` at `schema-discovery.ts:770-819` looks for a reference field on Contact that points to the custom household object, but doesn't look for a separate junction table like `Household_Member__c` with lookups to both Contact and the custom household object.

**What breaks:** An org with `Custom_HH__c` (household) and `HH_Member__c` (junction with `Contact__c` and `Household__c` lookups) would have its household detected, but Min's Contact query would fail because there's no direct reference field on Contact. Contacts would appear as zero.

**Fix location:** `schema-discovery.ts:770` — after checking for a direct reference field on Contact, also search `allObjects` for junction objects with two reference fields: one pointing to Contact, one pointing to the detected household object.

---

### Pattern 4 — Practifi (cloupra__Household__c)

**NOT HANDLED**

There is zero awareness of the `cloupra__` namespace anywhere in the codebase. The `FSC_OBJECT_PREFIXES` list (line 135-144) only checks `FinServ__` objects. The `identifyCandidateObjects()` function at line 366-374 explicitly skips `FinServ__` objects but has no skip/include logic for `cloupra__`.

The `RIA_CONCEPT_KEYWORDS` (line 147-152) would match `cloupra__Household__c` because it contains "household" — so Pattern 3 (custom object detection) would fire. But:
- Confidence would be 0.65 instead of the 0.95+ it deserves
- The `cloupra__` membership junction (`cloupra__Client_Group_Member__c`) would not be detected
- Practifi's AUM fields (`cloupra__AUM__c`, `cloupra__Total_Assets__c`) might be missed by `findAumField()` if their labels don't match the regex at line 1018

**What breaks:** Practifi orgs are common in the $200M-$1B segment. Min would limp along with low confidence and likely miss household members and AUM data. A Practifi-specific implementation partner would immediately flag this.

**Fix location:** Add `cloupra__` namespace detection to `schema-discovery.ts`. Add Practifi-specific objects to `FSC_OBJECT_PREFIXES` (or a new `MANAGED_PACKAGE_PREFIXES` list). Map `cloupra__Household__c` → household, `cloupra__Client_Group_Member__c` → junction, `cloupra__AUM__c` → AUM.

---

### Pattern 5 — XLR8 Overlay

**NOT HANDLED**

No reference to XLR8, `xlr8__`, or XLR8-specific objects anywhere in the codebase. XLR8 orgs would fall through to Pattern 3 (custom object detection) or Pattern 4 (fallback), depending on how the XLR8 objects are named.

**What breaks:** XLR8 overlays add their own relationship and account hierarchy objects. Min wouldn't understand the overlay structure and would likely show raw Salesforce Account data instead of XLR8's enriched model.

**Fix location:** Lower priority than Practifi — XLR8's market share is smaller. When addressed, add `xlr8__` namespace detection similar to Practifi.

---

### Pattern 6 — No Household Structure

**PARTIALLY HANDLED**

If no household pattern is detected, `detectHousehold()` falls through to Pattern 4 (fallback) at line 754-767: `object: "Account"`, no filter, confidence 0.40, with warning "No household pattern detected. Defaulting to all Accounts."

This means Min would treat **every Account as a household** — including business accounts, vendor records, and competitor records. The home screen would show "247 Households" when there are actually 30 clients and 217 non-client accounts.

**What breaks:** Flat-Contact orgs (advisor keeps clients as loose Contacts with no household grouping) get polluted household lists. The Practice Health Score becomes meaningless. Compliance review coverage drops to single digits because most "households" aren't real clients.

**Fix location:** `schema-discovery.ts:754` — when falling through to fallback, also check if Contact records outnumber Account records, or if there are any enrichment fields (email, phone) concentrated on Contacts rather than Accounts. Add a heuristic for "flat Contact" orgs that surfaces Contacts directly.

---

### Pattern 7 — Hybrid / Halfway Migration

**NOT HANDLED**

Min's detection is a **first-match waterfall** — it returns the first pattern that matches and ignores all others. At `schema-discovery.ts:674-767`:
1. If RecordType matches → return immediately (line 678)
2. If Type picklist matches → return immediately (line 698)
3. If data-level Type matches → return immediately (line 719)
4. If custom object matches → return immediately (line 738)
5. Fallback (line 755)

An org halfway through migrating from Account Type = 'Household' to FSC RecordType `IndustriesHousehold` would have Pattern 1 match. The households still in the old Type = 'Household' model would become invisible. Min would show 40% of households and miss 60%.

**What breaks:** Any org in the middle of a data model migration sees incomplete data. This is especially dangerous because the advisor thinks they're seeing everything — there's no warning that households exist in a second location.

**Fix location:** `schema-discovery.ts:668` — after the waterfall, run all pattern checks (not just first-match) and if multiple patterns return with confidence > 0.5, flag a "hybrid detection" warning. The query layer (`org-query.ts`) would need to support compound filters: `WHERE (RecordType.DeveloperName = 'IndustriesHousehold' OR Type = 'Household')`.

---

### Household Detection Summary

| Pattern | Status | Confidence | Risk |
|---------|--------|-----------|------|
| 1. Native FSC Household | PARTIALLY HANDLED | 0.95 (via RecordType) | Misses FinServ__Household__c object, membership junction |
| 2. Account Hierarchy | PARTIALLY HANDLED | 0.85 | Misses child Account contacts via ParentId |
| 3. Custom Junction | PARTIALLY HANDLED | 0.65 | Finds household object, misses junction tables |
| 4. Practifi | NOT HANDLED | N/A | No cloupra__ awareness |
| 5. XLR8 | NOT HANDLED | N/A | No xlr8__ awareness |
| 6. No Household | PARTIALLY HANDLED | 0.40 | Polluted household lists, meaningless metrics |
| 7. Hybrid Migration | NOT HANDLED | N/A | Silent data loss — most dangerous gap |

---

## SECTION 2: PERSON ACCOUNT DETECTION

### Detection

Min detects Person Accounts at `schema-discovery.ts:357-360`:

```typescript
function detectPersonAccounts(accountDescribe: ObjectDescribe | null): boolean {
  if (!accountDescribe) return false;
  return accountDescribe.fields.some(f => f.name === "IsPersonAccount");
}
```

This is correct detection. The result is stored in `OrgMetadataBundle.personAccountsEnabled` and surfaced in the discovery health report.

### What's Missing: Everything After Detection

**Scenario A — Standard Contact Model: HANDLED**

Min's queries assume standard Account + Contact. `searchContacts()` at `salesforce.ts:163-164` queries `Contact WHERE FirstName LIKE ...`. `getHouseholdDetail()` at `salesforce.ts:242` queries `Contact WHERE ${contactLookup} = '${safeId}'`. This works correctly on standard orgs.

**Scenario B — Person Account Model: NOT HANDLED**

On a Person Account org, there are no separate Contact records for Person Accounts. The Account IS the Contact. `Account.IsPersonAccount = true`, and fields like `FirstName`, `LastName`, `Email` exist directly on Account.

**Every Contact query returns zero results:**

| Query | File:Line | Result on Person Account Org |
|-------|-----------|------------------------------|
| `SELECT ... FROM Contact WHERE FirstName LIKE '%q%'...` | `salesforce.ts:163-164` | Returns 0 records — Contacts don't exist |
| `SELECT ... FROM Contact WHERE ${lookup} = '${id}'` | `salesforce.ts:242` | Returns 0 records — no Contact rows |
| `createContacts()` with `{FirstName, LastName, Email, Phone, AccountId}` | `salesforce.ts:172-190` | May succeed but creates orphaned Contact records that don't link to Person Account |

**Specific fixes needed:**

1. **Contact search** (`salesforce.ts:163-164`): When `personAccountsEnabled`, also query:
   ```soql
   SELECT Id, FirstName, LastName, PersonEmail, Phone, Name FROM Account
   WHERE IsPersonAccount = true AND (FirstName LIKE '%q%' OR LastName LIKE '%q%' OR PersonEmail LIKE '%q%')
   ```

2. **Household detail contacts** (`salesforce.ts:242`): When `personAccountsEnabled`, query:
   ```soql
   SELECT Id, FirstName, LastName, PersonEmail, Phone, PersonContactId FROM Account
   WHERE IsPersonAccount = true AND ParentId = '${safeId}'
   ```

3. **Contact creation** (`salesforce.ts:172-190`): On Person Account orgs, creating a "Contact" means creating a Person Account (Account with `RecordTypeId` pointing to a Person Account RecordType). Min needs to detect the Person Account RecordType and use it.

**Scenario C — Hybrid (Migration Stalled): NOT HANDLED**

Some records are Person Accounts, some are regular Accounts + Contacts. Min would need to union both query patterns — standard Contact queries AND Person Account Account queries — then deduplicate on `PersonContactId`.

**Duplicate risk:** Person Accounts expose a derived `PersonContactId` field. If Min queries both Contact and Account, the same person could appear twice — once from the Contact table and once from the Account table. Deduplication requires checking `Account.PersonContactId` against `Contact.Id`.

---

## SECTION 3: AUM FIELD DETECTION

### Current Detection

Min's AUM detection lives in `detectAum()` at `schema-discovery.ts:883-917`. It checks three sources in priority order:

**Source 1: Financial Account Rollup** (line 888-896)
- Condition: `FinServ__FinancialAccount__c` exists with a balance field and record count > 0
- Result: `source: "financial_account_rollup"`, field = `FinServ__Balance__c`, confidence 0.90
- **Handles patterns 8 (real-time calculation from FinServ__FinancialAccount__c records)**

**Source 2: Account Direct Field** (line 898-908)
- Uses `findAumField()` at `schema-discovery.ts:1014-1020`:
  ```typescript
  f.custom && f.type === "currency" &&
  /aum|asset.*under|total.*asset|total.*aum|book.*size|portfolio.*value/i.test(f.label)
  ```
- **Handles patterns 2, 4, 7** (custom rollup, manually entered, batch-populated fields) — IF the field label matches the regex

**Source 3: Not Found** (line 910-917)
- Confidence 0.80 that AUM genuinely isn't in Salesforce

### Coverage of 11 AUM Locations

| # | Location | Handled? | Notes |
|---|----------|----------|-------|
| 1 | `FinServ__TotalFinancialAccounts__c` | **NO** | This is a *standard* FSC field, not custom. `findAumField()` filters on `f.custom` — standard fields are excluded. This is the most common FSC AUM field and Min misses it. |
| 2 | Custom rollup on Account | YES | If label matches regex |
| 3 | Formula field from external object | PARTIAL | Field exists on Account so detectable, but it's read-only. Min can read it but not write/recalculate it. |
| 4 | Manually entered currency field | YES | If label matches regex |
| 5 | Practifi `cloupra__AUM__c` | **NO** | `findAumField()` checks `f.custom` (true for managed package fields) but the label "AUM" would need to match. If Practifi labels it "Assets Under Management" the regex would catch `asset.*under`. If labeled just "AUM", it would match. **Fragile.** |
| 6 | XLR8-specific field | **NO** | Same as Practifi — depends on label matching |
| 7 | Batch-populated custom field | YES | If label matches regex |
| 8 | Real-time from FinServ__FinancialAccount__c | YES | Source 1 handles this |
| 9 | Custom object rollup | **NO** | `findAumField()` only searches Account describe, not custom household objects |
| 10 | Managed package object (BridgeFT, Addepar, Orion) | **NO** | No cross-object AUM detection |
| 11 | Not in Salesforce | YES | Source 3 correctly identifies this |

### False Positive Risk

The regex `/aum|asset.*under|total.*asset|total.*aum|book.*size|portfolio.*value/i` could match:
- `Total_Assets_Owned__c` (a personal net worth field, not AUM)
- `Book_Size_Legacy__c` (a deprecated field from a previous system)
- `Portfolio_Value_Estimate__c` (an advisor's estimate, not actual custodian data)

**Recommendation:** After detecting a candidate AUM field, check if it has data by running `SELECT MAX(${field}), COUNT(Id) FROM Account WHERE ${field} != null LIMIT 1`. If zero rows have data, it's likely deprecated. If the max value is unreasonably small (< $10,000 on an RIA), it might be the wrong field.

### Critical Miss: FinServ__TotalFinancialAccounts__c

This is the **#1 most common AUM field in FSC orgs** and Min misses it because `findAumField()` at line 1017 requires `f.custom === true`. Standard FSC rollup fields like `FinServ__TotalFinancialAccounts__c` are technically "managed package" fields — `custom` might be `true` for managed package fields depending on the describe response. But the field label is "Total Financial Accounts" which does **not** match the regex (`/aum|asset.*under|total.*asset|total.*aum|book.*size|portfolio.*value/i`). It would need `total.*financial` or an explicit check.

**Fix:** Add `FinServ__TotalFinancialAccounts__c` as a hardcoded first-check before the regex heuristic. If the field exists on Account, it IS the AUM field — no heuristic needed.

---

## SECTION 4: SOQL QUERY HARDCODING AUDIT

### 4A — Hardcoded Object Assumptions

**Contact queries assume separate Contact records exist:**

| File:Line | Query | Person Account Impact |
|-----------|-------|----------------------|
| `salesforce.ts:163-164` | `FROM Contact WHERE FirstName LIKE...` | Returns 0 results |
| `salesforce.ts:242` | `FROM Contact WHERE ${lookup} = '${id}'` | Returns 0 results |
| `salesforce.ts:312` | `FROM Task WHERE What.Type = 'Account'` | Works, but task attribution to Person Account Contact is lost |

**Household queries are dynamic (good):**
- `orgQuery.householdObject()` returns the correct object based on discovery
- `orgQuery.householdFilter()` builds the correct WHERE clause
- `orgQuery.searchHouseholds()` composes correct SOQL

**FinServ__ queries assume FSC is installed:**

| File:Line | Query | Non-FSC Impact |
|-----------|-------|----------------|
| `salesforce.ts:455-478` | `FROM FinServ__FinancialAccount__c` | Caught by try/catch, returns `fscAvailable: false` |
| `salesforce.ts:398-417` | Create `FinServ__ContactContactRelation__c` | Caught, returns `null` |

The FSC graceful degradation pattern is **well implemented**. Non-FSC orgs see empty financial accounts and no contact relationships, but nothing breaks.

### 4B — Hardcoded Field Assumptions

**Standard fields assumed on Contact:** `FirstName`, `LastName`, `Email`, `Phone`, `AccountId`, `Account.Name`, `CreatedDate` — these exist on all Salesforce editions. Safe.

**Standard fields assumed on Account:** `Id`, `Name`, `Description`, `CreatedDate`, `Type`, `OwnerId` — safe on all editions.

**Standard fields assumed on Task:** `Id`, `Subject`, `Status`, `Priority`, `Description`, `CreatedDate`, `ActivityDate`, `WhatId`, `WhoId`, `What.Name` — safe.

**FSC fields hardcoded in financial account query** (`salesforce.ts:455-478`):
- `FinServ__FinancialAccountType__c`
- `FinServ__TaxStatus__c`
- `FinServ__Balance__c`
- `FinServ__Household__c`
- `FinServ__PrimaryOwner__c`
- `FinServ__Status__c`
- `FinServ__OpenDate__c`

These only run when FSC is detected, and failures are caught. **Safe as implemented.**

**Person Account fields NOT handled:**
- `Account.PersonEmail` (needed for email search on Person Account orgs)
- `Account.PersonContactId` (needed for deduplication)
- `Account.IsPersonAccount` (needed for filtering)
- `Account.FirstName`, `Account.LastName` (exist on Person Account records)

### 4C — Missing WHERE Clause Safety

**Unbounded queries identified:**

| File:Line | Query | Risk |
|-----------|-------|------|
| `salesforce.ts:242` | `FROM Contact WHERE ${lookup} = '${id}'` | No LIMIT. A household with 500+ contacts (corporate client) would return all. Low practical risk but should add `LIMIT 200`. |
| `salesforce.ts:243` | `FROM Task WHERE WhatId = '${id}'` | No LIMIT. A long-running household could have thousands of tasks. Should add `LIMIT 500 ORDER BY CreatedDate DESC`. |

**LIKE query performance:**
- `salesforce.ts:164`: `Contact WHERE FirstName LIKE '%q%' OR LastName LIKE '%q%' OR Email LIKE '%q%' OR Account.Name LIKE '%q%'` — four LIKE clauses with leading wildcards. On orgs with 100K+ Contacts, this will be slow. Consider SOSL (`FIND {q} IN ALL FIELDS RETURNING Contact(...)`) for better performance.
- All LIKE queries have LIMIT clauses (10-100). Acceptable.

**SOQL injection prevention (`sanitizeSOQL` at `sf-client.ts:50-58`):**
- Escapes backslashes first (correct order)
- Escapes single quotes
- Strips `%` and `_` wildcards
- Strips control characters
- 200-char length limit

**Edge case not handled:** Unicode right single quotation mark (`\u2019`, `'`). Salesforce SOQL does not interpret this as a string delimiter, so it's not an injection vector. **Safe.**

**Test coverage:** `critical-path.test.ts` lines 26-71 test normal strings, single quote injection, backslash escaping, LIKE wildcard stripping, control character removal, 200-char truncation, non-string input, and combined injection attempts. **Solid.**

### 4D — API Version

**Hardcoded in two files:**
- `sf-client.ts:12`: `const SF_API_VERSION = "v59.0";`
- `schema-discovery.ts:24`: `const SF_API_VERSION = "v59.0";`

v59.0 is Salesforce Winter '24 (released January 2024). As of February 2026, this is stable and still supported. Salesforce's API version deprecation policy gives ~3 years.

**Should this be configurable?** Yes. Different orgs may have features only available in newer API versions. Some enterprise orgs lock their Connected Apps to a specific API version. Making this an env variable (`SF_API_VERSION=v59.0`) with a sensible default costs nothing and prevents a future fire drill.

**Risk if not changed:** Low for now. v59.0 supports all current FSC features. Will need updating when Salesforce releases features Min wants to use from v62.0+.

---

## SECTION 5: WRITE OPERATION SIDE EFFECTS

### 5A — Flow/Process Builder Triggers

Min performs 8 distinct write operations. Here's the trigger risk for each:

**Household creation** (`salesforce.ts:255-264`, calls `create()` on Account/custom object):
- **Record-Triggered Flows:** Creating an Account almost certainly fires flows on enterprise orgs. Common triggers: auto-assign advisor, create default tasks, send welcome email, assign to territory. Min creates the household, then immediately creates contacts and tasks — a flow that also creates contacts/tasks could produce duplicates.
- **Validation Rules:** If the org requires `BillingState`, `Industry`, `Phone`, or any custom required fields beyond `Name`, the create will fail with `REQUIRED_FIELD_MISSING`. Min catches this as `SFMutationError` (line 253-263) but the error message is generic.

**Task creation** (`sf-client.ts:319-332`, `351-425`):
- **Record-Triggered Flows on Task:** Creating a Task with `Status = 'Completed'` may trigger a flow that recalculates compliance scores, sends notifications, or updates the parent Account. Min creates compliance review tasks, meeting notes, and follow-ups — all as Completed Tasks. If a flow sends a "task completed" email, the advisor gets flooded.
- **MIN:AUDIT tasks** (from `audit.ts`): These are also Task records. A flow triggered by Task creation would fire on audit records too, creating noise.

**Contact creation** (`salesforce.ts:172-190`):
- **Duplicate Rules:** Min passes `Sforce-Duplicate-Rule-Header: allowSave=true` (via `sf-client.ts:242-243`). This bypasses all duplicate matching rules. On orgs where duplicate rules exist for compliance (e.g., SEC Rule 17a-4 requires no duplicate client records), this is **dangerous**. Min should let the duplicate rule fire, catch the `DUPLICATES_DETECTED` error, and present the match to the advisor instead of silently creating a duplicate.

**Account.Description update** (`salesforce.ts:266-274`):
- Min appends funding details to `Account.Description`. If the org has a validation rule that requires `Description` to be under 1,000 characters, or requires it to match a format, the update fails. More critically: validation rules on Account may require OTHER fields to be populated (e.g., a rule that says "if Type = 'Household' then Phone is required"). Min's update only sends `Description` — the validation rule evaluates the full record and may reject because `Phone` is null.

### 5B — Required Field Gaps

**Contact creation fields:** `{FirstName, LastName, Email, Phone, AccountId}` — Min sends exactly these 5 fields (`salesforce.ts:175-180`).

Common required fields Min misses:
- `FinServ__PersonalEmail__c` (FSC — separate from standard Email)
- `Birthdate` (compliance-required on many orgs)
- `MailingStreet`, `MailingCity`, `MailingState`, `MailingPostalCode` (required by KYC flows)
- `RecordTypeId` (if the org has multiple Contact RecordTypes with no default)

**Task creation fields:** `{Subject, WhatId, WhoId, Status, Priority, ActivityDate, Description}` (`sf-client.ts:319-332`).

Common required fields Min misses:
- `CallType` (required on some orgs for Tasks with RecordType 'Call')
- `Type` (some orgs require Task Type: 'Call', 'Email', 'Other')
- `OwnerId` (defaults to running user, but some orgs override)
- Custom required fields from consulting implementations (e.g., `Compliance_Category__c`)

**Recommendation:** During schema discovery, fetch required fields for Account, Contact, and Task by checking `field.nillable === false && !field.defaultedOnCreate`. Warn the user during onboarding if Min can't populate a required field.

### 5C — Record Type Handling

Min **does not** specify RecordType when creating Contacts, Accounts, or Tasks (`salesforce.ts:255-264`, `172-190`; `sf-client.ts:319-332`).

**For households:** `orgQuery.newHouseholdFields()` in `org-query.ts` sets `Type` if the mapping uses Type-based filtering but does NOT set `RecordTypeId` even when `recordTypeDeveloperName` is known. The mapping stores `householdRecordTypeDeveloperName()` but it's never used in creation. This means a newly created household on an FSC org may get the wrong RecordType (the user's default, which could be "Business" or "Individual" instead of "Household").

**For contacts:** No RecordType specified. If the org has "Individual" and "Business" Contact RecordTypes, the default is used — which may not be "Individual".

**For tasks:** No RecordType specified. If the org has "Client Activity", "Internal", and "Compliance" Task RecordTypes with different required field sets, the default RecordType may impose requirements Min doesn't meet.

### 5D — Audit Trail Implications

Min writes to `Account.Description` by appending text (`salesforce.ts:266-274`; `onboarding.ts` handlers). On orgs with Field History Tracking on Description:
- Every append creates an audit trail entry with the old and new Description value
- The Description field has a 32,000 character limit — repeated appending will eventually hit this
- Min's operational notes (funding details, ACH info, beneficiary designations) appear in the compliance audit trail alongside advisor's manual notes

**Recommendation:** Min should use a dedicated custom field (`Min_Notes__c`, Long Text Area) or a custom object (`Min_Activity__c`) instead of `Description`. This separates Min's operational data from advisor-entered information and avoids polluting the compliance audit trail.

---

## SECTION 6: FIELD-LEVEL SECURITY & SHARING MODEL RISKS

### 6A — Field-Level Security

**Min does NOT check FLS.** After searching the entire codebase: zero occurrences of `WITH SECURITY_ENFORCED`, zero calls to check `field.accessible` or `field.createable` before querying/writing.

**Schema Discovery reads field metadata** (`schema-discovery.ts:410-412` calls `/sobjects/Account/describe/` and `/sobjects/Contact/describe/`). The describe response includes `createable`, `updateable`, and `accessible` flags per field. **Min has the data but doesn't use it.**

**The null-vs-inaccessible problem:**
If Min queries `SELECT Total_AUM__c FROM Account WHERE Id = '...'` and the API user's profile doesn't have read access to `Total_AUM__c`, Salesforce returns the record with `Total_AUM__c: null` — NOT an error. Min interprets this as `$0 AUM`. The advisor sees a $50M client displayed as a $0 client. There is no way to distinguish "field is null" from "field is not accessible" without checking FLS first.

**Recommendation:** During schema discovery, after detecting the AUM field, advisor field, etc., query the running user's field access:
```soql
SELECT FieldDefinition.QualifiedApiName, IsAccessible, IsCreatable, IsUpdatable
FROM UserFieldAccess
WHERE FieldDefinition.EntityDefinition.QualifiedApiName = 'Account'
AND User.Id = '${userId}'
```
Or use the describe response's `field.permissionable` and compare against the user's PermissionSet assignments.

### 6B — Record-Level Sharing

Min does **not** use `WITH SECURITY_ENFORCED` in any SOQL query. All queries run as the connected user and respect row-level sharing automatically (Salesforce enforces sharing model on API queries unless `WITHOUT SHARING` is used in Apex — REST API always enforces).

**The incomplete picture problem:**
If the org has OWD = Private on Account, and Advisor A connects Min, they only see Accounts they own or that are shared with them. Min shows "42 Households" on the dashboard — but the firm has 120 households total. Advisors B and C own the other 78. There's no indication that Min is showing a partial view.

**What this breaks:**
- Practice Health Score is calculated on a partial dataset
- "Ready for Review" count misses households the advisor can't see
- Principal role users expect to see the full book — but if they're the API user, they still only see what their profile allows

**Recommendation:** After discovery, run `SELECT COUNT() FROM Account ${householdFilter}` with the current user and compare against a `SYSTEM_MODE` count (not available via REST API). Alternatively, warn the user: "Min can see {N} households. If your org uses private sharing, you may not be seeing all records."

### 6C — Connected App Permissions

**OAuth scope:** `api refresh_token` (defined in `sf-connection.ts` `buildAuthUrl()` function).

**Is this sufficient?** `api` scope grants full API access — read/write to any object the user's profile allows. This is sufficient for all current Min operations. `full` scope is not needed (it adds access to Visualforce, which Min doesn't use).

**IP relaxation risk:** If the Connected App has "Enforce IP restrictions" enabled and the Min server's IP is not in the org's trusted IP ranges, the OAuth token will be rejected with `INVALID_SESSION_ID`. Min's error handling would surface this as a generic connection error. **Recommendation:** Catch `INVALID_SESSION_ID` specifically and advise the user to add their server IP to the Connected App's trusted IPs.

**Client Credentials flow risk** (`sf-connection.ts:120-147`): The fallback `client_credentials` flow uses a pre-configured service account. This account's permissions define what Min can see/do — and it's not the advisor's permissions. If Client Credentials is used in production (not just dev), all advisors share one permission context, which may violate FINRA/SEC requirements for advisor-level audit trails.

---

## SECTION 7: RECOMMENDED SCHEMA DISCOVERY IMPLEMENTATION PLAN

### Phase 1: Stop Assuming (P0 — Blocks Real Deployment)

| Item | Priority | Effort | What Breaks Without It |
|------|----------|--------|----------------------|
| **Person Account query handling** | P0 | M | Contact search returns 0 results on ~15% of RIA Salesforce orgs. Complete data loss for Person Account clients. |
| **FinServ__TotalFinancialAccounts__c hardcoded AUM check** | P0 | S | AUM shows as $0 on FSC orgs using the standard rollup field. Advisor loses trust in Day 1. |
| **RecordType on household creation** | P0 | S | Households created with wrong RecordType on FSC orgs. Breaks downstream automations, reporting, and list views. |
| **LIMIT clauses on unbounded Contact/Task queries** | P0 | S | Timeout on orgs with >500 contacts or >2000 tasks per household (common after 3+ years). |
| **API version as env variable** | P1 | S | Future-proofing. No immediate break but no ability to upgrade without code deploy. |

**Implementation approach:**
- `schema-discovery.ts`: Add `FinServ__TotalFinancialAccounts__c` to an explicit check list before `findAumField()` regex
- `salesforce.ts:163-164, 242`: Add Person Account branch — query Account with `IsPersonAccount = true` when `personAccountsEnabled`
- `org-query.ts`: `newHouseholdFields()` should include `RecordTypeId` when `recordTypeDeveloperName` is set (resolve DeveloperName → Id via describe)
- `salesforce.ts:242-243`: Add `LIMIT 200` to Contact query, `LIMIT 500` to Task query

### Phase 2: Discover (P1 — Blocks Enterprise Deployment)

| Item | Priority | Effort | What Breaks Without It |
|------|----------|--------|----------------------|
| **Practifi (cloupra__) namespace detection** | P1 | M | Min can't serve $200M-$1B Practifi firms — a significant market segment. |
| **Junction object detection** | P1 | M | Custom household orgs show 0 contacts per household. |
| **ParentId traversal for Account hierarchies** | P1 | M | Orgs using parent-child account model show empty households. |
| **Required field detection during discovery** | P1 | M | Create operations fail with cryptic REQUIRED_FIELD_MISSING on customized orgs. |
| **FLS check on key fields** | P1 | M | AUM shows $0, advisor field shows blank — silent data loss, no error. |
| **Hybrid/multi-pattern detection** | P1 | L | Orgs mid-migration lose 30-70% of their data with no warning. |

**Implementation approach:**
- `schema-discovery.ts`: Add `MANAGED_PACKAGE_PREFIXES` array: `["cloupra__", "xlr8__", "orion__"]`. During `identifyCandidateObjects()`, treat managed package objects with these prefixes as first-class candidates, not heuristic matches.
- `schema-discovery.ts:770-819`: After checking for a direct Contact reference to household object, search `allObjects` for junction objects with dual lookup relationships.
- `schema-discovery.ts:668-768`: Run ALL pattern checks, not first-match. Store results as `householdPatterns: Array<{pattern, confidence}>`. If multiple patterns with confidence > 0.5, flag hybrid.
- `schema-discovery.ts`: Add `detectRequiredFields()` that checks `field.nillable === false && !field.defaultedOnCreate` for Account, Contact, Task.
- `schema-discovery.ts`: Add FLS check for discovered AUM field and advisor field using describe `field.accessible`.

### Phase 3: Adapt (P2 — Enterprise Polish)

| Item | Priority | Effort | What Breaks Without It |
|------|----------|--------|----------------------|
| **XLR8 overlay detection** | P2 | M | XLR8 firms (smaller market) can't use Min. |
| **Sharing model visibility warning** | P2 | S | Advisors don't know they're seeing partial data. |
| **Duplicate rule handling** | P2 | M | Compliance orgs have duplicate records created without review. |
| **Custom field for Min notes** | P2 | M | Audit trail pollution in Description field. |
| **WITH SECURITY_ENFORCED on queries** | P2 | M | Queries may return fields the user shouldn't see (data governance risk). |
| **SOSL for contact search** | P2 | M | Contact search slow on 100K+ record orgs. |

**Implementation approach:**
- `salesforce.ts:172-190`: Remove `allowDuplicates: true` default. Catch `DUPLICATES_DETECTED`, extract match candidates from the error response, surface to UI for advisor review.
- `salesforce.ts:266-274`: Create a `Min_Activity_Log__c` custom object during onboarding (via Metadata API) or use a custom field on Account instead of Description.
- All queries in `salesforce.ts`: Append `WITH SECURITY_ENFORCED` (or detect if the connected user has full access and skip it for simplicity).

---

## CONFIDENCE SCORECARD

| Dimension | Score | Rationale |
|-----------|-------|-----------|
| **Demo org readiness** | **8/10** | Works well on demo orgs with seeded data. Schema discovery runs correctly. Financial accounts degrade gracefully. Minor: unbounded queries could be slow if demo has lots of data. |
| **Small RIA readiness ($50M-$200M)** | **6/10** | Standard Salesforce with simple setup will work. Account Type = 'Household' pattern is the most common at this tier and is well-handled. Breaks if they use Person Accounts (not uncommon for small shops) or have custom required fields. |
| **Mid-market RIA readiness ($200M-$1B, FSC)** | **4/10** | FSC RecordType detection works, but AUM via `FinServ__TotalFinancialAccounts__c` is missed. No RecordType on creation. Practifi orgs (common at this tier) are not handled. Junction object contacts are invisible. |
| **Enterprise RIA readiness ($1B+, complex FSC)** | **2/10** | Multiple household patterns likely coexist from M&A history. No hybrid detection. No FLS checks. No sharing model awareness. Required field gaps will cause creation failures. Audit trail in Description is a compliance concern. |
| **Person Account org readiness** | **1/10** | Detection works; everything else breaks. Contact search returns nothing. Household detail shows no members. Contact creation creates orphaned records. This is a complete blocker. |
| **Multi-advisor org readiness** | **3/10** | Advisor field detection works (finds custom advisor lookup or falls back to OwnerId). But no sharing model awareness means Advisor A may see Advisor B's clients (or vice versa — may miss their own clients if sharing is restrictive). No warning about partial visibility. |

---

### Final Note

The architecture is sound. The hexagonal port/adapter pattern, the encrypted cookie-based mapping cache, the Schema Discovery Engine's multi-API-call introspection approach, the SOQL sanitization discipline — these are the right foundations. The gaps are in the **breadth of pattern coverage**, not the depth of the architecture. Phase 1 is 2-3 weeks of focused work and gets Min from "demo-ready" to "small RIA deployable." Phase 2 is another 4-6 weeks and opens the $200M-$1B segment. Phase 3 is ongoing polish as you encounter enterprise edge cases in the field.

The most dangerous gap is Person Accounts (1/10). It's a permanent, irreversible setting — once an org enables it, they can't go back. And it's more common than people think: ~15% of RIA orgs have it enabled, often from a hasty Salesforce implementation years ago. Fix this first.
