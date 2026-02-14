// ─── Schema Discovery Engine Tests ──────────────────────────────────────────
//
// Tests the heuristic classification logic against the 4 major org patterns:
//   1. FSC with RecordType 'Household' on Account (~60% of RIAs)
//   2. Standard SF with Type picklist = 'Household' (~20%)
//   3. Custom household object (~15%)
//   4. Fallback — no clear household pattern (~5%)

import { describe, it, expect } from "vitest";
import { classifyOrgHeuristic } from "../schema-discovery";
import type { OrgMetadataBundle, ObjectDescribe, FieldDescribe } from "../schema-discovery";

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeField(overrides: Partial<FieldDescribe> & { name: string; type: string }): FieldDescribe {
  return {
    label: overrides.label || overrides.name,
    custom: overrides.custom ?? overrides.name.endsWith("__c"),
    referenceTo: overrides.referenceTo || [],
    picklistValues: overrides.picklistValues || [],
    length: overrides.length || 255,
    nillable: overrides.nillable ?? true,
    updateable: overrides.updateable ?? true,
    ...overrides,
  };
}

function makeAccountDescribe(overrides?: Partial<ObjectDescribe>): ObjectDescribe {
  return {
    name: "Account",
    label: "Account",
    custom: false,
    fields: [
      makeField({ name: "Name", type: "string", custom: false }),
      makeField({ name: "OwnerId", type: "reference", custom: false, referenceTo: ["User"] }),
      makeField({ name: "Type", type: "picklist", custom: false }),
      makeField({ name: "CreatedDate", type: "datetime", custom: false }),
    ],
    recordTypeInfos: [{ name: "Master", developerName: "Master", active: true, defaultRecordTypeMapping: true }],
    childRelationships: [
      { childSObject: "Contact", field: "AccountId", relationshipName: "Contacts" },
    ],
    ...overrides,
  };
}

function makeBundle(overrides?: Partial<OrgMetadataBundle>): OrgMetadataBundle {
  return {
    orgId: "00D000000000001",
    discoveredAt: new Date().toISOString(),
    allObjects: [
      { name: "Account", label: "Account", custom: false, queryable: true },
      { name: "Contact", label: "Contact", custom: false, queryable: true },
      { name: "Task", label: "Task", custom: false, queryable: true },
      { name: "Opportunity", label: "Opportunity", custom: false, queryable: true },
    ],
    accountDescribe: makeAccountDescribe(),
    contactDescribe: {
      name: "Contact",
      label: "Contact",
      custom: false,
      fields: [
        makeField({ name: "FirstName", type: "string", custom: false }),
        makeField({ name: "LastName", type: "string", custom: false }),
        makeField({ name: "Email", type: "email", custom: false }),
        makeField({ name: "Phone", type: "phone", custom: false }),
        makeField({ name: "AccountId", type: "reference", custom: false, referenceTo: ["Account"] }),
      ],
      recordTypeInfos: [],
      childRelationships: [],
    },
    financialAccountDescribe: null,
    fscObjectsFound: [],
    personAccountsEnabled: false,
    candidateCustomObjects: [],
    activeFlows: [],
    activeTriggers: [],
    activeValidationRules: [],
    recordCounts: {
      accounts: 100,
      accountsByRecordType: {},
      contacts: 250,
      financialAccounts: 0,
      opportunities: 0,
      recentTasks: 500,
    },
    apiCallsMade: 8,
    durationMs: 3200,
    errors: [],
    accountTypeValues: [],
    ...overrides,
  };
}

// ─── Pattern 1: FSC with Household RecordType ───────────────────────────────

describe("Pattern 1: FSC Household RecordType", () => {
  const bundle = makeBundle({
    accountDescribe: makeAccountDescribe({
      recordTypeInfos: [
        { name: "Master", developerName: "Master", active: true, defaultRecordTypeMapping: false },
        { name: "Household", developerName: "IndustriesHousehold", active: true, defaultRecordTypeMapping: true },
        { name: "Individual", developerName: "IndustriesIndividual", active: true, defaultRecordTypeMapping: false },
      ],
      fields: [
        makeField({ name: "Name", type: "string", custom: false }),
        makeField({ name: "OwnerId", type: "reference", custom: false, referenceTo: ["User"] }),
        makeField({ name: "Primary_Advisor__c", type: "reference", custom: true, label: "Primary Advisor", referenceTo: ["User"] }),
        makeField({ name: "Total_AUM__c", type: "currency", custom: true, label: "Total AUM" }),
        makeField({ name: "Service_Tier__c", type: "picklist", custom: true, label: "Service Tier", picklistValues: [
          { value: "Platinum", label: "Platinum", active: true },
          { value: "Gold", label: "Gold", active: true },
          { value: "Standard", label: "Standard", active: true },
        ]}),
        makeField({ name: "Client_Status__c", type: "picklist", custom: true, label: "Client Status" }),
      ],
    }),
    fscObjectsFound: ["FinServ__FinancialAccount__c", "FinServ__ContactContactRelation__c"],
    recordCounts: {
      accounts: 340,
      accountsByRecordType: { IndustriesHousehold: 280, IndustriesIndividual: 60 },
      contacts: 600,
      financialAccounts: 1200,
      opportunities: 0,
      recentTasks: 800,
    },
  });

  const mapping = classifyOrgHeuristic(bundle);

  it("detects Account as household object", () => {
    expect(mapping.household.object).toBe("Account");
  });

  it("uses Household RecordType", () => {
    expect(mapping.household.recordTypeDeveloperName).toBe("IndustriesHousehold");
  });

  it("finds Primary_Advisor__c field", () => {
    expect(mapping.household.primaryAdvisorField).toBe("Primary_Advisor__c");
  });

  it("finds Total_AUM__c field", () => {
    expect(mapping.household.totalAumField).toBe("Total_AUM__c");
  });

  it("finds Service_Tier__c field", () => {
    expect(mapping.household.serviceTierField).toBe("Service_Tier__c");
  });

  it("has high confidence (>= 0.90)", () => {
    expect(mapping.household.confidence).toBeGreaterThanOrEqual(0.90);
  });

  it("finds Client_Status__c", () => {
    expect(mapping.household.clientStatusField).toBe("Client_Status__c");
  });
});

// ─── Pattern 2: Standard SF with Type = 'Household' ────────────────────────

describe("Pattern 2: Account Type Picklist", () => {
  const bundle = makeBundle({
    accountDescribe: makeAccountDescribe({
      fields: [
        makeField({ name: "Name", type: "string", custom: false }),
        makeField({ name: "OwnerId", type: "reference", custom: false, referenceTo: ["User"] }),
        makeField({
          name: "Type", type: "picklist", custom: false,
          picklistValues: [
            { value: "Household", label: "Household", active: true },
            { value: "Business", label: "Business", active: true },
            { value: "Trust", label: "Trust", active: true },
          ],
        }),
      ],
    }),
  });

  const mapping = classifyOrgHeuristic(bundle);

  it("detects Account as household object", () => {
    expect(mapping.household.object).toBe("Account");
  });

  it("uses Type filter field", () => {
    expect(mapping.household.filterField).toBe("Type");
    expect(mapping.household.filterValue).toBe("Household");
  });

  it("has no RecordType", () => {
    expect(mapping.household.recordTypeDeveloperName).toBeNull();
  });

  it("has good confidence (>= 0.80)", () => {
    expect(mapping.household.confidence).toBeGreaterThanOrEqual(0.80);
  });
});

// ─── Pattern 2b: Data-Level Type Detection (unrestricted picklist) ──────────
// This is the exact scenario in the demo org: Type = 'Household' exists in data
// but isn't defined as a picklist value in the schema.

describe("Pattern 2b: Data-Level Type Detection", () => {
  const bundle = makeBundle({
    accountTypeValues: [
      { value: "Household", count: 22 },
      { value: "Business", count: 8 },
      { value: "Trust", count: 5 },
    ],
  });

  const mapping = classifyOrgHeuristic(bundle);

  it("detects Account as household object", () => {
    expect(mapping.household.object).toBe("Account");
  });

  it("uses Type = Household from data", () => {
    expect(mapping.household.filterField).toBe("Type");
    expect(mapping.household.filterValue).toBe("Household");
  });

  it("has high confidence (>= 0.85)", () => {
    expect(mapping.household.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it("does NOT fall through to the 40% fallback", () => {
    expect(mapping.household.confidence).not.toBe(0.40);
  });

  it("has no 'no household pattern' warning", () => {
    expect(mapping.warnings.some(w => /no household/i.test(w))).toBe(false);
  });
});

// ─── Pattern 3: Custom Household Object ─────────────────────────────────────

describe("Pattern 3: Custom Household Object", () => {
  const bundle = makeBundle({
    candidateCustomObjects: [{
      name: "Service_Team__c",
      label: "Service Team",
      fields: [
        { name: "Name", label: "Team Name", type: "string", referenceTo: [] },
        { name: "Primary_RM__c", label: "Primary Relationship Manager", type: "reference", referenceTo: ["User"] },
        { name: "Total_Book__c", label: "Total Book Size", type: "currency", referenceTo: [] },
        { name: "Service_Level__c", label: "Service Level", type: "picklist", referenceTo: [] },
      ],
      childRelationships: [
        { childSObject: "Contact", field: "Service_Team__c" },
      ],
    }],
    allObjects: [
      { name: "Account", label: "Account", custom: false, queryable: true },
      { name: "Contact", label: "Contact", custom: false, queryable: true },
      { name: "Service_Team__c", label: "Service Team", custom: true, queryable: true },
    ],
  });

  // Note: Service_Team__c won't match the regex for household keywords
  // (household, hh_, family, client_group, relationship_group).
  // This tests the boundary — LLM classification (Phase 2) would catch this.
  const mapping = classifyOrgHeuristic(bundle);

  it("falls back when custom object name doesn't match household keywords", () => {
    // service_team doesn't match the heuristic — this is expected.
    // This is exactly the case LLM classification handles better.
    expect(mapping.household.object).toBe("Account");
    expect(mapping.household.confidence).toBeLessThan(0.50);
  });

  it("generates a warning about no household pattern", () => {
    expect(mapping.warnings.some(w => /no household/i.test(w))).toBe(true);
  });
});

// ─── Pattern 3b: Custom object WITH household keyword ───────────────────────

describe("Pattern 3b: Custom Object with Household Keyword", () => {
  const bundle = makeBundle({
    candidateCustomObjects: [{
      name: "HH_Group__c",
      label: "Household Group",
      fields: [
        { name: "Name", label: "Household Name", type: "string", referenceTo: [] },
        { name: "Lead_Advisor__c", label: "Lead Advisor", type: "reference", referenceTo: ["User"] },
        { name: "AUM__c", label: "Assets Under Management", type: "currency", referenceTo: [] },
        { name: "Tier__c", label: "Service Tier", type: "picklist", referenceTo: [] },
      ],
      childRelationships: [
        { childSObject: "Contact", field: "HH_Group__c" },
      ],
    }],
  });

  const mapping = classifyOrgHeuristic(bundle);

  it("detects custom household object", () => {
    expect(mapping.household.object).toBe("HH_Group__c");
  });

  it("finds advisor field on custom object", () => {
    expect(mapping.household.primaryAdvisorField).toBe("Lead_Advisor__c");
  });

  it("finds AUM field on custom object", () => {
    expect(mapping.household.totalAumField).toBe("AUM__c");
  });

  it("has moderate confidence", () => {
    expect(mapping.household.confidence).toBeGreaterThanOrEqual(0.60);
    expect(mapping.household.confidence).toBeLessThan(0.80);
  });

  it("generates a warning about custom object", () => {
    expect(mapping.warnings.some(w => /HH_Group__c/i.test(w))).toBe(true);
  });
});

// ─── Pattern 4: Fallback (no clear household) ──────────────────────────────

describe("Pattern 4: No Household Pattern", () => {
  const bundle = makeBundle(); // bare minimum, no RTs, no custom objects

  const mapping = classifyOrgHeuristic(bundle);

  it("defaults to Account", () => {
    expect(mapping.household.object).toBe("Account");
  });

  it("has no filter", () => {
    expect(mapping.household.recordTypeDeveloperName).toBeNull();
    expect(mapping.household.filterField).toBeNull();
  });

  it("falls back to OwnerId for advisor", () => {
    expect(mapping.household.primaryAdvisorField).toBe("OwnerId");
  });

  it("has low confidence (<= 0.50)", () => {
    expect(mapping.household.confidence).toBeLessThanOrEqual(0.50);
  });
});

// ─── Financial Account Detection ────────────────────────────────────────────

describe("Financial Account Detection", () => {
  it("detects FSC FinancialAccount when present", () => {
    const bundle = makeBundle({
      financialAccountDescribe: {
        name: "FinServ__FinancialAccount__c",
        label: "Financial Account",
        custom: true,
        fields: [
          makeField({ name: "Name", type: "string", custom: false }),
          makeField({ name: "FinServ__Balance__c", type: "currency", custom: true, label: "Balance" }),
          makeField({ name: "FinServ__PrimaryOwner__c", type: "reference", custom: true, label: "Primary Owner", referenceTo: ["Account"] }),
          makeField({ name: "FinServ__FinancialAccountType__c", type: "picklist", custom: true, label: "Type" }),
          makeField({ name: "FinServ__Status__c", type: "picklist", custom: true, label: "Status" }),
        ],
        recordTypeInfos: [],
        childRelationships: [],
      },
      fscObjectsFound: ["FinServ__FinancialAccount__c"],
      recordCounts: {
        accounts: 100, accountsByRecordType: {}, contacts: 200,
        financialAccounts: 500, opportunities: 0, recentTasks: 300,
      },
    });

    const mapping = classifyOrgHeuristic(bundle);
    expect(mapping.financialAccount.available).toBe(true);
    expect(mapping.financialAccount.object).toBe("FinServ__FinancialAccount__c");
    expect(mapping.financialAccount.balanceField).toBe("FinServ__Balance__c");
  });

  it("marks unavailable when no FA object exists", () => {
    const bundle = makeBundle();
    const mapping = classifyOrgHeuristic(bundle);
    expect(mapping.financialAccount.available).toBe(false);
    expect(mapping.financialAccount.object).toBeNull();
  });
});

// ─── AUM Detection ──────────────────────────────────────────────────────────

describe("AUM Detection", () => {
  it("uses financial account rollup when available", () => {
    const bundle = makeBundle({
      financialAccountDescribe: {
        name: "FinServ__FinancialAccount__c",
        label: "Financial Account",
        custom: true,
        fields: [
          makeField({ name: "FinServ__Balance__c", type: "currency", custom: true, label: "Balance" }),
          makeField({ name: "FinServ__PrimaryOwner__c", type: "reference", custom: true, referenceTo: ["Account"] }),
        ],
        recordTypeInfos: [],
        childRelationships: [],
      },
      fscObjectsFound: ["FinServ__FinancialAccount__c"],
      recordCounts: {
        accounts: 100, accountsByRecordType: {}, contacts: 200,
        financialAccounts: 500, opportunities: 0, recentTasks: 300,
      },
    });

    const mapping = classifyOrgHeuristic(bundle);
    expect(mapping.aum.source).toBe("financial_account_rollup");
  });

  it("uses account field when no FA but AUM field exists", () => {
    const bundle = makeBundle({
      accountDescribe: makeAccountDescribe({
        fields: [
          makeField({ name: "Name", type: "string", custom: false }),
          makeField({ name: "OwnerId", type: "reference", custom: false, referenceTo: ["User"] }),
          makeField({ name: "Total_AUM__c", type: "currency", custom: true, label: "Total AUM" }),
        ],
      }),
    });

    const mapping = classifyOrgHeuristic(bundle);
    expect(mapping.aum.source).toBe("account_field");
    expect(mapping.aum.field).toBe("Total_AUM__c");
  });

  it("returns not_found when no AUM source exists", () => {
    const bundle = makeBundle();
    const mapping = classifyOrgHeuristic(bundle);
    expect(mapping.aum.source).toBe("not_found");
  });
});

// ─── Automation Risk Assessment ─────────────────────────────────────────────

describe("Automation Risk Assessment", () => {
  it("flags high risk when many Task flows exist", () => {
    const bundle = makeBundle({
      activeFlows: Array.from({ length: 6 }, (_, i) => ({
        label: `Task Flow ${i}`,
        processType: "RecordAfterSave",
        triggerType: "RecordAfterSave",
        triggerObject: "Task",
      })),
    });

    const mapping = classifyOrgHeuristic(bundle);
    expect(mapping.automationRisks.riskLevel).toBe("high");
    expect(mapping.automationRisks.taskFlowCount).toBe(6);
  });

  it("flags low risk when no automation exists", () => {
    const bundle = makeBundle();
    const mapping = classifyOrgHeuristic(bundle);
    expect(mapping.automationRisks.riskLevel).toBe("low");
  });
});

// ─── Contact Detection ──────────────────────────────────────────────────────

describe("Contact Detection", () => {
  it("defaults to AccountId lookup", () => {
    const bundle = makeBundle();
    const mapping = classifyOrgHeuristic(bundle);
    expect(mapping.contact.object).toBe("Contact");
    expect(mapping.contact.householdLookup).toBe("AccountId");
  });

  it("finds custom lookup when household is custom object", () => {
    const bundle = makeBundle({
      candidateCustomObjects: [{
        name: "HH_Group__c",
        label: "Household Group",
        fields: [{ name: "Name", label: "Name", type: "string", referenceTo: [] }],
        childRelationships: [{ childSObject: "Contact", field: "HH_Group__c" }],
      }],
      contactDescribe: {
        name: "Contact",
        label: "Contact",
        custom: false,
        fields: [
          makeField({ name: "FirstName", type: "string", custom: false }),
          makeField({ name: "LastName", type: "string", custom: false }),
          makeField({ name: "Email", type: "email", custom: false }),
          makeField({ name: "Phone", type: "phone", custom: false }),
          makeField({ name: "AccountId", type: "reference", custom: false, referenceTo: ["Account"] }),
          makeField({ name: "HH_Group__c", type: "reference", custom: true, referenceTo: ["HH_Group__c"] }),
        ],
        recordTypeInfos: [],
        childRelationships: [],
      },
    });

    const mapping = classifyOrgHeuristic(bundle);
    expect(mapping.contact.householdLookup).toBe("HH_Group__c");
  });
});

// ─── Overall Mapping Quality ────────────────────────────────────────────────

describe("Overall Mapping Quality", () => {
  it("produces a valid version number", () => {
    const mapping = classifyOrgHeuristic(makeBundle());
    expect(mapping.version).toBe(1);
  });

  it("includes orgId from bundle", () => {
    const mapping = classifyOrgHeuristic(makeBundle({ orgId: "00DTEST123" }));
    expect(mapping.orgId).toBe("00DTEST123");
  });

  it("confidence is between 0 and 1", () => {
    const mapping = classifyOrgHeuristic(makeBundle());
    expect(mapping.confidence).toBeGreaterThanOrEqual(0);
    expect(mapping.confidence).toBeLessThanOrEqual(1);
  });

  it("always includes automationRisks", () => {
    const mapping = classifyOrgHeuristic(makeBundle());
    expect(mapping.automationRisks).toBeDefined();
    expect(["high", "medium", "low"]).toContain(mapping.automationRisks.riskLevel);
  });
});
