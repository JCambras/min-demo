// ─── Schema Discovery Engine ────────────────────────────────────────────────
//
// The moat. Connects to any Salesforce org, reads its metadata, and produces
// a structured bundle that can be classified into an OrgMapping.
//
// Phase 1: Pre-fetch metadata via Describe + Tooling APIs (7-8 API calls).
//          Returns an OrgMetadataBundle suitable for classification.
//
// This module is READ-ONLY. It never writes to the org. It never modifies
// any object, field, or record. Safe to run against production orgs.
//
// API calls made:
//   1. GET /sobjects/                           → list all objects
//   2. GET /sobjects/Account/describe/          → Account fields + RecordTypes
//   3. GET /sobjects/Contact/describe/          → Contact fields
//   4. GET /sobjects/FinServ__FinancialAccount__c/describe/ → FSC (may 404)
//   5. Tooling: SELECT ... FROM FlowDefinitionView  → active flows
//   6. Tooling: SELECT ... FROM ApexTrigger         → active triggers
//   7. Tooling: SELECT ... FROM ValidationRule      → active validation rules
//   8. SELECT COUNT() FROM Account (+ per RecordType) → record counts

import type { SFContext } from "./sf-client";

const SF_API_VERSION = "v59.0";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface FieldDescribe {
  name: string;
  label: string;
  type: string;
  custom: boolean;
  referenceTo: string[];
  picklistValues: { value: string; label: string; active: boolean }[];
  length: number;
  nillable: boolean;
  updateable: boolean;
}

export interface RecordTypeInfo {
  name: string;
  developerName: string;
  active: boolean;
  defaultRecordTypeMapping: boolean;
}

export interface ChildRelationship {
  childSObject: string;
  field: string;
  relationshipName: string | null;
}

export interface ObjectDescribe {
  name: string;
  label: string;
  custom: boolean;
  fields: FieldDescribe[];
  recordTypeInfos: RecordTypeInfo[];
  childRelationships: ChildRelationship[];
}

export interface ActiveFlow {
  label: string;
  processType: string;
  triggerType: string;
  triggerObject: string;
}

export interface ActiveTrigger {
  name: string;
  object: string;
}

export interface ValidationRuleInfo {
  name: string;
  object: string;
  errorMessage: string;
  active: boolean;
}

export interface CandidateCustomObject {
  name: string;
  label: string;
  fields: { name: string; label: string; type: string; referenceTo: string[] }[];
  childRelationships: { childSObject: string; field: string }[];
}

export interface OrgMetadataBundle {
  // Org info
  orgId: string;
  discoveredAt: string;

  // Object catalog
  allObjects: { name: string; label: string; custom: boolean; queryable: boolean }[];

  // Core object describes
  accountDescribe: ObjectDescribe | null;
  contactDescribe: ObjectDescribe | null;
  financialAccountDescribe: ObjectDescribe | null;  // null if FSC not installed

  // FSC detection
  fscObjectsFound: string[];
  personAccountsEnabled: boolean;

  // Custom objects that might map to RIA concepts
  candidateCustomObjects: CandidateCustomObject[];

  // Automation inventory
  activeFlows: ActiveFlow[];
  activeTriggers: ActiveTrigger[];
  activeValidationRules: ValidationRuleInfo[];

  // Record counts for data quality assessment
  recordCounts: {
    accounts: number;
    accountsByRecordType: Record<string, number>;
    contacts: number;
    financialAccounts: number;
    opportunities: number;
    recentTasks: number;
  };

  // Discovery metadata
  apiCallsMade: number;
  durationMs: number;
  errors: string[];  // non-fatal errors encountered during discovery
}

// ─── Known FSC Objects ──────────────────────────────────────────────────────
// Objects in the FinServ__ namespace that indicate FSC is installed.

const FSC_OBJECT_PREFIXES = [
  "FinServ__FinancialAccount__c",
  "FinServ__FinancialGoal__c",
  "FinServ__FinancialHolding__c",
  "FinServ__AssetsAndLiabilities__c",
  "FinServ__ContactContactRelation__c",
  "FinServ__AccountAccountRelation__c",
  "FinServ__Revenue__c",
  "FinServ__Securities__c",
];

// Keywords that suggest a custom object might model an RIA concept
const RIA_CONCEPT_KEYWORDS = [
  "household", "hh_", "family", "client_group", "relationship_group",
  "client_hub", "service_group", "financial_account", "investment_account",
  "portfolio", "compliance", "review", "prospect", "pipeline", "aum",
  "advisor", "planner", "rm_", "book", "wealth",
];

// ─── Low-Level Fetchers ─────────────────────────────────────────────────────
// Each function makes exactly one API call and returns typed results.
// Errors are caught and returned as nulls + error messages, never thrown.

async function sfFetch(
  ctx: SFContext,
  path: string,
): Promise<{ data: unknown; ok: boolean; status: number }> {
  const url = `${ctx.instanceUrl}/services/data/${SF_API_VERSION}${path}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${ctx.accessToken}` },
  });
  const data = await response.json();
  return { data, ok: response.ok, status: response.status };
}

async function toolingQuery(
  ctx: SFContext,
  soql: string,
): Promise<Record<string, unknown>[]> {
  const url = `${ctx.instanceUrl}/services/data/${SF_API_VERSION}/tooling/query?q=${encodeURIComponent(soql)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${ctx.accessToken}` },
  });
  if (!response.ok) return [];
  const data = await response.json();
  return (data.records as Record<string, unknown>[]) || [];
}

async function soqlCount(
  ctx: SFContext,
  soql: string,
): Promise<number> {
  const url = `${ctx.instanceUrl}/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(soql)}`;
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${ctx.accessToken}` },
  });
  if (!response.ok) return 0;
  const data = await response.json();
  return (data.totalSize as number) || 0;
}

// ─── Object Catalog ─────────────────────────────────────────────────────────
// GET /services/data/v59.0/sobjects/

async function fetchObjectCatalog(
  ctx: SFContext,
): Promise<{ name: string; label: string; custom: boolean; queryable: boolean }[]> {
  const { data, ok } = await sfFetch(ctx, "/sobjects/");
  if (!ok) return [];
  const sobjects = (data as { sobjects: { name: string; label: string; custom: boolean; queryable: boolean }[] }).sobjects || [];
  return sobjects.map(o => ({
    name: o.name,
    label: o.label,
    custom: o.custom,
    queryable: o.queryable,
  }));
}

// ─── Object Describe ────────────────────────────────────────────────────────
// GET /services/data/v59.0/sobjects/{ObjectName}/describe/

async function fetchObjectDescribe(
  ctx: SFContext,
  objectName: string,
): Promise<ObjectDescribe | null> {
  const { data, ok, status } = await sfFetch(ctx, `/sobjects/${objectName}/describe/`);
  if (!ok) {
    // 404 = object doesn't exist (e.g., FSC not installed)
    if (status === 404) return null;
    return null;
  }

  const raw = data as Record<string, unknown>;

  const fields = ((raw.fields as Record<string, unknown>[]) || []).map(f => ({
    name: f.name as string,
    label: f.label as string,
    type: f.type as string,
    custom: (f.custom as boolean) || false,
    referenceTo: (f.referenceTo as string[]) || [],
    picklistValues: ((f.picklistValues as { value: string; label: string; active: boolean }[]) || [])
      .filter(p => p.active),
    length: (f.length as number) || 0,
    nillable: (f.nillable as boolean) || false,
    updateable: (f.updateable as boolean) || false,
  }));

  const recordTypeInfos = ((raw.recordTypeInfos as Record<string, unknown>[]) || []).map(rt => ({
    name: rt.name as string,
    developerName: rt.developerName as string,
    active: (rt.active as boolean) || false,
    defaultRecordTypeMapping: (rt.defaultRecordTypeMapping as boolean) || false,
  }));

  const childRelationships = ((raw.childRelationships as Record<string, unknown>[]) || []).map(cr => ({
    childSObject: cr.childSObject as string,
    field: cr.field as string,
    relationshipName: (cr.relationshipName as string) || null,
  }));

  return {
    name: objectName,
    label: raw.label as string,
    custom: (raw.custom as boolean) || false,
    fields,
    recordTypeInfos,
    childRelationships,
  };
}

// ─── Automation Inventory ───────────────────────────────────────────────────

async function fetchActiveFlows(ctx: SFContext): Promise<ActiveFlow[]> {
  // FlowDefinitionView gives us active flow metadata without Metadata API
  const records = await toolingQuery(ctx,
    "SELECT MasterLabel, ProcessType, TriggerType, TriggerObjectOrEventLabel " +
    "FROM FlowDefinitionView " +
    "WHERE IsActive = true AND ProcessType IN ('AutoLaunchedFlow','RecordAfterSave','RecordBeforeSave','RecordBeforeDelete')"
  );
  return records.map(r => ({
    label: (r.MasterLabel as string) || "",
    processType: (r.ProcessType as string) || "",
    triggerType: (r.TriggerType as string) || "",
    triggerObject: (r.TriggerObjectOrEventLabel as string) || "",
  }));
}

async function fetchActiveTriggers(ctx: SFContext): Promise<ActiveTrigger[]> {
  const records = await toolingQuery(ctx,
    "SELECT Name, TableEnumOrId FROM ApexTrigger WHERE Status = 'Active'"
  );
  return records.map(r => ({
    name: (r.Name as string) || "",
    object: (r.TableEnumOrId as string) || "",
  }));
}

async function fetchValidationRules(ctx: SFContext): Promise<ValidationRuleInfo[]> {
  const records = await toolingQuery(ctx,
    "SELECT ValidationName, EntityDefinition.QualifiedApiName, ErrorMessage, Active " +
    "FROM ValidationRule " +
    "WHERE Active = true"
  );
  return records.map(r => ({
    name: (r.ValidationName as string) || "",
    object: ((r.EntityDefinition as Record<string, unknown>)?.QualifiedApiName as string) || "",
    errorMessage: (r.ErrorMessage as string) || "",
    active: true,
  }));
}

// ─── Record Counts ──────────────────────────────────────────────────────────

async function fetchRecordCounts(
  ctx: SFContext,
  accountDescribe: ObjectDescribe | null,
  fscAvailable: boolean,
): Promise<OrgMetadataBundle["recordCounts"]> {
  const counts = {
    accounts: 0,
    accountsByRecordType: {} as Record<string, number>,
    contacts: 0,
    financialAccounts: 0,
    opportunities: 0,
    recentTasks: 0,
  };

  // Total accounts
  counts.accounts = await soqlCount(ctx, "SELECT COUNT() FROM Account");

  // Accounts by RecordType (only if Account has RecordTypes)
  const recordTypes = (accountDescribe?.recordTypeInfos || [])
    .filter(rt => rt.active && rt.developerName !== "Master");

  for (const rt of recordTypes) {
    const count = await soqlCount(ctx,
      `SELECT COUNT() FROM Account WHERE RecordType.DeveloperName = '${rt.developerName}'`
    );
    counts.accountsByRecordType[rt.developerName] = count;
  }

  // Contacts, Opportunities, recent Tasks
  counts.contacts = await soqlCount(ctx, "SELECT COUNT() FROM Contact");
  counts.opportunities = await soqlCount(ctx, "SELECT COUNT() FROM Opportunity");
  counts.recentTasks = await soqlCount(ctx,
    "SELECT COUNT() FROM Task WHERE CreatedDate = LAST_N_DAYS:90"
  );

  // Financial Accounts (only if FSC is installed)
  if (fscAvailable) {
    counts.financialAccounts = await soqlCount(ctx,
      "SELECT COUNT() FROM FinServ__FinancialAccount__c"
    );
  }

  return counts;
}

// ─── Person Account Detection ───────────────────────────────────────────────
// Person Accounts change everything: Account and Contact merge into one record.
// Detected by checking if Account has the IsPersonAccount field.

function detectPersonAccounts(accountDescribe: ObjectDescribe | null): boolean {
  if (!accountDescribe) return false;
  return accountDescribe.fields.some(f => f.name === "IsPersonAccount");
}

// ─── Candidate Custom Object Detection ──────────────────────────────────────
// Finds custom objects whose names or labels suggest they model RIA concepts.
// We describe each candidate to get its fields and relationships.

function identifyCandidateObjects(
  allObjects: { name: string; label: string; custom: boolean; queryable: boolean }[],
): string[] {
  return allObjects
    .filter(o => {
      if (!o.custom || !o.queryable) return false;
      // Skip FSC managed objects (we handle those separately)
      if (o.name.startsWith("FinServ__")) return false;
      // Skip common non-RIA managed packages
      if (o.name.startsWith("npsp__") || o.name.startsWith("npe")) return false;
      // Check if name or label contains RIA-related keywords
      const nameLower = o.name.toLowerCase();
      const labelLower = o.label.toLowerCase();
      return RIA_CONCEPT_KEYWORDS.some(kw =>
        nameLower.includes(kw) || labelLower.includes(kw)
      );
    })
    .map(o => o.name)
    .slice(0, 10); // Cap at 10 to limit API calls
}

// ─── Main Discovery Function ────────────────────────────────────────────────
//
// Orchestrates all metadata fetches and assembles the OrgMetadataBundle.
// Total: 7-8 API calls + 1 per candidate custom object + ~4 for record counts.
// Expected latency: 3-8 seconds depending on org size and API response times.

export async function discoverOrg(ctx: SFContext): Promise<OrgMetadataBundle> {
  const startTime = Date.now();
  const errors: string[] = [];
  let apiCallsMade = 0;

  // ── Step 1: Object Catalog ────────────────────────────────────────────────
  const allObjects = await fetchObjectCatalog(ctx);
  apiCallsMade++;
  if (allObjects.length === 0) {
    errors.push("Failed to fetch object catalog — check org permissions");
  }

  // ── Step 2: Core Object Describes (parallel) ──────────────────────────────
  const fscObjectsFound = allObjects
    .filter(o => FSC_OBJECT_PREFIXES.includes(o.name))
    .map(o => o.name);

  const [accountDescribe, contactDescribe, financialAccountDescribe] = await Promise.all([
    fetchObjectDescribe(ctx, "Account"),
    fetchObjectDescribe(ctx, "Contact"),
    fscObjectsFound.includes("FinServ__FinancialAccount__c")
      ? fetchObjectDescribe(ctx, "FinServ__FinancialAccount__c")
      : Promise.resolve(null),
  ]);
  apiCallsMade += fscObjectsFound.includes("FinServ__FinancialAccount__c") ? 3 : 2;

  if (!accountDescribe) errors.push("Failed to describe Account object");
  if (!contactDescribe) errors.push("Failed to describe Contact object");

  // Person Account detection
  const personAccountsEnabled = detectPersonAccounts(accountDescribe);

  // ── Step 3: Candidate Custom Objects ──────────────────────────────────────
  const candidateNames = identifyCandidateObjects(allObjects);
  const candidateDescribes = await Promise.all(
    candidateNames.map(name => fetchObjectDescribe(ctx, name))
  );
  apiCallsMade += candidateNames.length;

  const candidateCustomObjects: CandidateCustomObject[] = candidateDescribes
    .filter((d): d is ObjectDescribe => d !== null)
    .map(d => ({
      name: d.name,
      label: d.label,
      fields: d.fields
        .filter(f => f.custom || ["Name", "OwnerId", "CreatedDate"].includes(f.name))
        .slice(0, 20)
        .map(f => ({
          name: f.name,
          label: f.label,
          type: f.type,
          referenceTo: f.referenceTo,
        })),
      childRelationships: d.childRelationships
        .filter(cr => !cr.childSObject.startsWith("FinServ__") || fscObjectsFound.length > 0)
        .slice(0, 15)
        .map(cr => ({
          childSObject: cr.childSObject,
          field: cr.field,
        })),
    }));

  // ── Step 4: Automation Inventory (parallel) ───────────────────────────────
  const [activeFlows, activeTriggers, activeValidationRules] = await Promise.all([
    fetchActiveFlows(ctx).catch(() => { errors.push("Failed to query Flows"); return []; }),
    fetchActiveTriggers(ctx).catch(() => { errors.push("Failed to query Triggers"); return []; }),
    fetchValidationRules(ctx).catch(() => { errors.push("Failed to query Validation Rules"); return []; }),
  ]);
  apiCallsMade += 3;

  // ── Step 5: Record Counts ─────────────────────────────────────────────────
  const fscAvailable = fscObjectsFound.includes("FinServ__FinancialAccount__c");
  const recordCounts = await fetchRecordCounts(ctx, accountDescribe, fscAvailable)
    .catch(() => {
      errors.push("Failed to fetch record counts");
      return {
        accounts: 0,
        accountsByRecordType: {} as Record<string, number>,
        contacts: 0,
        financialAccounts: 0,
        opportunities: 0,
        recentTasks: 0,
      };
    });
  // Count varies: 4 base + 1 per RecordType
  const rtCount = (accountDescribe?.recordTypeInfos || []).filter(rt => rt.active && rt.developerName !== "Master").length;
  apiCallsMade += 4 + rtCount;

  // ── Assemble Bundle ───────────────────────────────────────────────────────
  const durationMs = Date.now() - startTime;

  // Extract orgId from the instance URL or a simple query
  let orgId = "";
  try {
    const orgResult = await sfFetch(ctx, "/query?q=" + encodeURIComponent("SELECT Id FROM Organization LIMIT 1"));
    apiCallsMade++;
    if (orgResult.ok) {
      const records = (orgResult.data as { records: { Id: string }[] }).records;
      if (records?.[0]) orgId = records[0].Id;
    }
  } catch { /* non-critical */ }

  return {
    orgId,
    discoveredAt: new Date().toISOString(),
    allObjects,
    accountDescribe,
    contactDescribe,
    financialAccountDescribe,
    fscObjectsFound,
    personAccountsEnabled,
    candidateCustomObjects,
    activeFlows,
    activeTriggers,
    activeValidationRules,
    recordCounts,
    apiCallsMade,
    durationMs,
    errors,
  };
}

// ─── OrgMapping Types ───────────────────────────────────────────────────────
// The output of classification. One per org. Stored per-connection.
// This is what Min's query engine reads to generate SOQL.

export interface OrgMapping {
  orgId: string;
  discoveredAt: string;
  version: number;
  confidence: number;

  household: {
    object: string;
    recordTypeDeveloperName: string | null;
    filterField: string | null;
    filterValue: string | null;
    nameField: string;
    primaryAdvisorField: string | null;
    totalAumField: string | null;
    serviceTierField: string | null;
    clientStatusField: string | null;
    confidence: number;
  };

  contact: {
    object: string;
    householdLookup: string;
    firstNameField: string;
    lastNameField: string;
    emailField: string;
    phoneField: string;
    isPrimaryField: string | null;
    confidence: number;
  };

  financialAccount: {
    available: boolean;
    object: string | null;
    householdLookup: string | null;
    balanceField: string | null;
    accountTypeField: string | null;
    statusField: string | null;
    confidence: number;
  };

  aum: {
    source: "financial_account_rollup" | "account_field" | "custom_object" | "not_found";
    object: string | null;
    field: string | null;
    confidence: number;
  };

  complianceReview: {
    type: "custom_object" | "task_pattern" | "not_tracked";
    object: string | null;
    confidence: number;
  };

  pipeline: {
    type: "opportunity" | "custom_object" | "task_pattern" | "none";
    object: string | null;
    stageField: string | null;
    amountField: string | null;
    confidence: number;
  };

  automationRisks: {
    riskLevel: "high" | "medium" | "low";
    taskFlowCount: number;
    accountTriggerCount: number;
    blockingValidationRules: string[];
  };

  warnings: string[];
}

// ─── Heuristic Classification ───────────────────────────────────────────────
// Rule-based fallback when LLM classification is not available.
// Gets the job done for the 4 most common org patterns (~90% of RIAs).
// Phase 2 adds LLM classification for the remaining ~10%.

export function classifyOrgHeuristic(bundle: OrgMetadataBundle): OrgMapping {
  const warnings: string[] = [];

  // ── Household Detection ─────────────────────────────────────────────────
  const household = detectHousehold(bundle, warnings);

  // ── Contact Mapping ─────────────────────────────────────────────────────
  const contact = detectContact(bundle, household.object, warnings);

  // ── Financial Account Detection ─────────────────────────────────────────
  const financialAccount = detectFinancialAccount(bundle, warnings);

  // ── AUM Detection ───────────────────────────────────────────────────────
  const aum = detectAum(bundle, financialAccount, warnings);

  // ── Compliance Review Detection ─────────────────────────────────────────
  const complianceReview = detectComplianceReview(bundle, warnings);

  // ── Pipeline Detection ──────────────────────────────────────────────────
  const pipeline = detectPipeline(bundle, warnings);

  // ── Automation Risk Assessment ──────────────────────────────────────────
  const automationRisks = assessAutomationRisks(bundle);

  // ── Overall Confidence ──────────────────────────────────────────────────
  const confidences = [
    household.confidence,
    contact.confidence,
    financialAccount.confidence,
    aum.confidence,
  ];
  const overallConfidence = Math.round(
    (confidences.reduce((s, c) => s + c, 0) / confidences.length) * 100
  ) / 100;

  return {
    orgId: bundle.orgId,
    discoveredAt: bundle.discoveredAt,
    version: 1,
    confidence: overallConfidence,
    household,
    contact,
    financialAccount,
    aum,
    complianceReview,
    pipeline,
    automationRisks,
    warnings,
  };
}

// ─── Detection Functions ────────────────────────────────────────────────────

function detectHousehold(
  bundle: OrgMetadataBundle,
  warnings: string[],
): OrgMapping["household"] {
  const acct = bundle.accountDescribe;

  // Pattern 1: Account with RecordType 'Household' (most common FSC pattern)
  const householdRT = acct?.recordTypeInfos.find(
    rt => rt.active && /household/i.test(rt.developerName)
  );
  if (householdRT) {
    return {
      object: "Account",
      recordTypeDeveloperName: householdRT.developerName,
      filterField: null,
      filterValue: null,
      nameField: "Name",
      primaryAdvisorField: findAdvisorField(acct),
      totalAumField: findAumField(acct),
      serviceTierField: findServiceTierField(acct),
      clientStatusField: findStatusField(acct),
      confidence: 0.95,
    };
  }

  // Pattern 2: Account with Type picklist containing 'Household'
  const typeField = acct?.fields.find(f => f.name === "Type");
  const hasHouseholdType = typeField?.picklistValues.some(
    p => /household/i.test(p.value)
  );
  if (hasHouseholdType) {
    const hhValue = typeField!.picklistValues.find(p => /household/i.test(p.value))!.value;
    return {
      object: "Account",
      recordTypeDeveloperName: null,
      filterField: "Type",
      filterValue: hhValue,
      nameField: "Name",
      primaryAdvisorField: findAdvisorField(acct),
      totalAumField: findAumField(acct),
      serviceTierField: findServiceTierField(acct),
      clientStatusField: findStatusField(acct),
      confidence: 0.85,
    };
  }

  // Pattern 3: Custom object with household-like name
  const hhCandidate = bundle.candidateCustomObjects.find(o =>
    /household|hh_|family|client_group|relationship_group/i.test(o.name)
  );
  if (hhCandidate) {
    warnings.push(`Custom household object detected: ${hhCandidate.name}. Verify this is correct.`);
    return {
      object: hhCandidate.name,
      recordTypeDeveloperName: null,
      filterField: null,
      filterValue: null,
      nameField: "Name",
      primaryAdvisorField: findFieldByPattern(hhCandidate.fields, /advisor|rm|planner|rep/i, "reference"),
      totalAumField: findFieldByPattern(hhCandidate.fields, /aum|asset|balance|book|portfolio/i, "currency"),
      serviceTierField: findFieldByPattern(hhCandidate.fields, /tier|service|level|segment/i, "picklist"),
      clientStatusField: findFieldByPattern(hhCandidate.fields, /status|stage|lifecycle/i, "picklist"),
      confidence: 0.65,
    };
  }

  // Pattern 4: Fallback — treat all Accounts as potential households
  warnings.push("No household pattern detected. Defaulting to all Accounts.");
  return {
    object: "Account",
    recordTypeDeveloperName: null,
    filterField: null,
    filterValue: null,
    nameField: "Name",
    primaryAdvisorField: findAdvisorField(acct),
    totalAumField: findAumField(acct),
    serviceTierField: findServiceTierField(acct),
    clientStatusField: findStatusField(acct),
    confidence: 0.40,
  };
}

function detectContact(
  bundle: OrgMetadataBundle,
  householdObject: string,
  warnings: string[],
): OrgMapping["contact"] {
  const contactDesc = bundle.contactDescribe;
  if (!contactDesc) {
    warnings.push("Could not describe Contact object");
    return {
      object: "Contact",
      householdLookup: "AccountId",
      firstNameField: "FirstName",
      lastNameField: "LastName",
      emailField: "Email",
      phoneField: "Phone",
      isPrimaryField: null,
      confidence: 0.50,
    };
  }

  // Determine household lookup field
  let householdLookup = "AccountId"; // default
  if (householdObject !== "Account") {
    // Look for a lookup field on Contact that points to the custom household object
    const customLookup = contactDesc.fields.find(
      f => f.type === "reference" && f.referenceTo.includes(householdObject)
    );
    if (customLookup) {
      householdLookup = customLookup.name;
    } else {
      warnings.push(`Contact has no lookup to ${householdObject}. Falling back to AccountId.`);
    }
  }

  // Find isPrimary field
  const isPrimaryField = contactDesc.fields.find(
    f => f.custom && /primary|main|head/i.test(f.name) && (f.type === "boolean" || f.type === "checkbox")
  )?.name || null;

  return {
    object: "Contact",
    householdLookup,
    firstNameField: "FirstName",
    lastNameField: "LastName",
    emailField: "Email",
    phoneField: "Phone",
    isPrimaryField,
    confidence: householdLookup === "AccountId" ? 0.90 : 0.75,
  };
}

function detectFinancialAccount(
  bundle: OrgMetadataBundle,
  warnings: string[],
): OrgMapping["financialAccount"] {
  // FSC Financial Account
  if (bundle.financialAccountDescribe) {
    const fa = bundle.financialAccountDescribe;
    const balanceField = fa.fields.find(f =>
      /balance|value|amount/i.test(f.name) && f.type === "currency"
    )?.name || null;

    const householdLookup = fa.fields.find(f =>
      f.type === "reference" && (
        f.referenceTo.includes("Account") ||
        f.name.includes("Household") ||
        f.name.includes("PrimaryOwner")
      )
    )?.name || null;

    const accountTypeField = fa.fields.find(f =>
      /type|category/i.test(f.name) && f.type === "picklist"
    )?.name || null;

    return {
      available: true,
      object: fa.name,
      householdLookup,
      balanceField,
      accountTypeField,
      statusField: fa.fields.find(f => /status/i.test(f.name) && f.type === "picklist")?.name || null,
      confidence: balanceField && householdLookup ? 0.90 : 0.60,
    };
  }

  // Check for custom financial account object
  const customFA = bundle.candidateCustomObjects.find(o =>
    /financial_account|investment_account|portfolio/i.test(o.name)
  );
  if (customFA) {
    warnings.push(`Custom financial account object detected: ${customFA.name}`);
    return {
      available: true,
      object: customFA.name,
      householdLookup: customFA.fields.find(f => f.type === "reference")?.name || null,
      balanceField: findFieldByPattern(customFA.fields, /balance|value|amount/i, "currency"),
      accountTypeField: findFieldByPattern(customFA.fields, /type|category/i, "picklist"),
      statusField: findFieldByPattern(customFA.fields, /status/i, "picklist"),
      confidence: 0.55,
    };
  }

  return {
    available: false,
    object: null,
    householdLookup: null,
    balanceField: null,
    accountTypeField: null,
    statusField: null,
    confidence: 0.90, // high confidence that it's NOT available
  };
}

function detectAum(
  bundle: OrgMetadataBundle,
  financialAccount: OrgMapping["financialAccount"],
  warnings: string[],
): OrgMapping["aum"] {
  // If Financial Accounts exist with balance data, AUM = rollup
  if (financialAccount.available && financialAccount.balanceField && bundle.recordCounts.financialAccounts > 0) {
    return {
      source: "financial_account_rollup",
      object: financialAccount.object,
      field: financialAccount.balanceField,
      confidence: 0.90,
    };
  }

  // Check for AUM field directly on Account/household object
  const acct = bundle.accountDescribe;
  const aumField = findAumField(acct);
  if (aumField) {
    return {
      source: "account_field",
      object: "Account",
      field: aumField,
      confidence: 0.75,
    };
  }

  warnings.push("No AUM source detected. Min will use estimated assumptions.");
  return {
    source: "not_found",
    object: null,
    field: null,
    confidence: 0.80, // confident it's NOT there
  };
}

function detectComplianceReview(
  bundle: OrgMetadataBundle,
  warnings: string[],
): OrgMapping["complianceReview"] {
  // Check for custom compliance object
  const compObj = bundle.candidateCustomObjects.find(o =>
    /compliance.*review|review.*compliance/i.test(o.name)
  );
  if (compObj) {
    return { type: "custom_object", object: compObj.name, confidence: 0.85 };
  }

  // Check for Task-based pattern (Min's current approach)
  if (bundle.recordCounts.recentTasks > 0) {
    return { type: "task_pattern", object: "Task", confidence: 0.60 };
  }

  warnings.push("No compliance review tracking detected.");
  return { type: "not_tracked", object: null, confidence: 0.50 };
}

function detectPipeline(
  bundle: OrgMetadataBundle,
  warnings: string[],
): OrgMapping["pipeline"] {
  // Opportunity with records
  if (bundle.recordCounts.opportunities > 0) {
    return {
      type: "opportunity",
      object: "Opportunity",
      stageField: "StageName",
      amountField: "Amount",
      confidence: 0.90,
    };
  }

  // Custom pipeline object
  const pipeObj = bundle.candidateCustomObjects.find(o =>
    /prospect|pipeline|lead|opportunity/i.test(o.name)
  );
  if (pipeObj) {
    warnings.push(`Custom pipeline object detected: ${pipeObj.name}`);
    return {
      type: "custom_object",
      object: pipeObj.name,
      stageField: findFieldByPattern(pipeObj.fields, /stage|status|phase/i, "picklist"),
      amountField: findFieldByPattern(pipeObj.fields, /amount|aum|value/i, "currency"),
      confidence: 0.60,
    };
  }

  // Opportunity object exists but has no records
  if (bundle.allObjects.some(o => o.name === "Opportunity")) {
    return { type: "opportunity", object: "Opportunity", stageField: "StageName", amountField: "Amount", confidence: 0.50 };
  }

  return { type: "none", object: null, stageField: null, amountField: null, confidence: 0.70 };
}

function assessAutomationRisks(bundle: OrgMetadataBundle): OrgMapping["automationRisks"] {
  const taskFlows = bundle.activeFlows.filter(f =>
    f.triggerObject === "Task" || f.triggerObject === "Activity"
  );
  const accountTriggers = bundle.activeTriggers.filter(f =>
    f.object === "Account"
  );
  const blockingRules = bundle.activeValidationRules
    .filter(v => ["Account", "Contact", "Task"].includes(v.object))
    .map(v => `${v.object}: ${v.name}`);

  const riskLevel: "high" | "medium" | "low" =
    taskFlows.length >= 5 || accountTriggers.length >= 3 ? "high" :
    taskFlows.length >= 2 || accountTriggers.length >= 1 ? "medium" : "low";

  return {
    riskLevel,
    taskFlowCount: taskFlows.length,
    accountTriggerCount: accountTriggers.length,
    blockingValidationRules: blockingRules,
  };
}

// ─── Field Finder Helpers ───────────────────────────────────────────────────

function findAdvisorField(describe: ObjectDescribe | null): string | null {
  if (!describe) return null;
  const match = describe.fields.find(f =>
    f.custom && f.type === "reference" && f.referenceTo.includes("User") &&
    /advisor|rm|planner|rep|manager/i.test(f.label)
  );
  if (match) return match.name;
  // Fallback to OwnerId (always exists)
  return "OwnerId";
}

function findAumField(describe: ObjectDescribe | null): string | null {
  if (!describe) return null;
  return describe.fields.find(f =>
    f.custom && f.type === "currency" &&
    /aum|asset.*under|total.*asset|total.*aum|book.*size|portfolio.*value/i.test(f.label)
  )?.name || null;
}

function findServiceTierField(describe: ObjectDescribe | null): string | null {
  if (!describe) return null;
  return describe.fields.find(f =>
    f.custom && f.type === "picklist" &&
    /tier|service.*level|segment|class/i.test(f.label)
  )?.name || null;
}

function findStatusField(describe: ObjectDescribe | null): string | null {
  if (!describe) return null;
  return describe.fields.find(f =>
    f.custom && f.type === "picklist" &&
    /client.*status|status|lifecycle|stage/i.test(f.label)
  )?.name || null;
}

function findFieldByPattern(
  fields: { name: string; label: string; type: string }[],
  pattern: RegExp,
  expectedType?: string,
): string | null {
  return fields.find(f =>
    (pattern.test(f.name) || pattern.test(f.label)) &&
    (!expectedType || f.type === expectedType)
  )?.name || null;
}
