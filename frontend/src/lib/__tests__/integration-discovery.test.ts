// ─── Integration Tests: Discovery → Query Pipeline ──────────────────────────
//
// Verifies the full flow: discoverOrg metadata → classifyOrgHeuristic → 
// setOrgMapping → orgQuery generates correct SOQL.
//
// These are NOT live Salesforce tests. They use mock bundles to simulate
// what discoverOrg would return, then verify the entire downstream pipeline.

import { describe, it, expect, beforeEach } from "vitest";
import { classifyOrgHeuristic } from "../schema-discovery";
import { orgQuery, setOrgMapping, clearOrgMapping, getOrgMapping } from "../org-query";
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

function makeBundle(overrides?: Partial<OrgMetadataBundle>): OrgMetadataBundle {
  return {
    orgId: "00DINTEGRATION",
    discoveredAt: new Date().toISOString(),
    allObjects: [
      { name: "Account", label: "Account", custom: false, queryable: true },
      { name: "Contact", label: "Contact", custom: false, queryable: true },
      { name: "Task", label: "Task", custom: false, queryable: true },
      { name: "Opportunity", label: "Opportunity", custom: false, queryable: true },
    ],
    accountDescribe: {
      name: "Account", label: "Account", custom: false,
      fields: [
        makeField({ name: "Name", type: "string", custom: false }),
        makeField({ name: "OwnerId", type: "reference", custom: false, referenceTo: ["User"] }),
        makeField({ name: "Type", type: "picklist", custom: false }),
      ],
      recordTypeInfos: [{ name: "Master", developerName: "Master", active: true, defaultRecordTypeMapping: true }],
      childRelationships: [{ childSObject: "Contact", field: "AccountId", relationshipName: "Contacts" }],
    },
    contactDescribe: {
      name: "Contact", label: "Contact", custom: false,
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
    recordCounts: { accounts: 35, accountsByRecordType: {}, contacts: 47, financialAccounts: 0, opportunities: 1, recentTasks: 92 },
    accountTypeValues: [],
    apiCallsMade: 11,
    durationMs: 3400,
    errors: [],
    ...overrides,
  };
}

// ─── Integration: Demo Org (Type = 'Household' in data) ─────────────────────

describe("Integration: Demo Org (data-level Type detection)", () => {
  beforeEach(() => clearOrgMapping());

  it("full pipeline: discover → classify → set mapping → query", () => {
    // Step 1: Simulate what discoverOrg returns for the demo org
    const bundle = makeBundle({
      accountTypeValues: [
        { value: "Household", count: 22 },
        { value: "Business", count: 8 },
        { value: "Trust", count: 5 },
      ],
    });

    // Step 2: Classify
    const mapping = classifyOrgHeuristic(bundle);
    expect(mapping.household.filterField).toBe("Type");
    expect(mapping.household.filterValue).toBe("Household");
    expect(mapping.household.confidence).toBeGreaterThanOrEqual(0.85);

    // Step 3: Store mapping
    setOrgMapping(mapping);
    expect(getOrgMapping()).toBe(mapping);

    // Step 4: Verify query generation
    const listSoql = orgQuery.listHouseholds("Id, Name, Description, CreatedDate", 200);
    expect(listSoql).toContain("FROM Account");
    expect(listSoql).toContain("Type = 'Household'");
    expect(listSoql).toContain("LIMIT 200");

    const searchSoql = orgQuery.searchHouseholds("Id, Name", "Shakespeare", 10);
    expect(searchSoql).toContain("Type = 'Household'");
    expect(searchSoql).toContain("Shakespeare");

    // Step 5: Verify creation fields
    const fields = orgQuery.newHouseholdFields("Shakespeare Household", "Created by Min");
    expect(fields.Type).toBe("Household");
    expect(fields.Name).toBe("Shakespeare Household");
  });
});

// ─── Integration: FSC Org (RecordType-based) ────────────────────────────────

describe("Integration: FSC Org (RecordType detection)", () => {
  beforeEach(() => clearOrgMapping());

  it("full pipeline: discover → classify → set mapping → query", () => {
    const bundle = makeBundle({
      accountDescribe: {
        name: "Account", label: "Account", custom: false,
        fields: [
          makeField({ name: "Name", type: "string", custom: false }),
          makeField({ name: "OwnerId", type: "reference", custom: false, referenceTo: ["User"] }),
          makeField({ name: "Primary_Advisor__c", type: "reference", custom: true, label: "Primary Advisor", referenceTo: ["User"] }),
          makeField({ name: "Total_AUM__c", type: "currency", custom: true, label: "Total AUM" }),
        ],
        recordTypeInfos: [
          { name: "Master", developerName: "Master", active: true, defaultRecordTypeMapping: false },
          { name: "Household", developerName: "IndustriesHousehold", active: true, defaultRecordTypeMapping: true },
          { name: "Individual", developerName: "IndustriesIndividual", active: true, defaultRecordTypeMapping: false },
        ],
        childRelationships: [{ childSObject: "Contact", field: "AccountId", relationshipName: "Contacts" }],
      },
      fscObjectsFound: ["FinServ__FinancialAccount__c"],
      financialAccountDescribe: {
        name: "FinServ__FinancialAccount__c", label: "Financial Account", custom: true,
        fields: [
          makeField({ name: "FinServ__Balance__c", type: "currency", custom: true, label: "Balance" }),
          makeField({ name: "FinServ__PrimaryOwner__c", type: "reference", custom: true, referenceTo: ["Account"] }),
        ],
        recordTypeInfos: [],
        childRelationships: [],
      },
      recordCounts: { accounts: 340, accountsByRecordType: { IndustriesHousehold: 280 }, contacts: 600, financialAccounts: 1200, opportunities: 0, recentTasks: 800 },
      accountTypeValues: [],
    });

    // Classify
    const mapping = classifyOrgHeuristic(bundle);
    expect(mapping.household.recordTypeDeveloperName).toBe("IndustriesHousehold");
    expect(mapping.household.confidence).toBeGreaterThanOrEqual(0.90);
    expect(mapping.financialAccount.available).toBe(true);
    expect(mapping.aum.source).toBe("financial_account_rollup");

    // Store and query
    setOrgMapping(mapping);

    const listSoql = orgQuery.listHouseholds("Id, Name", 100);
    expect(listSoql).toContain("RecordType.DeveloperName = 'IndustriesHousehold'");
    expect(listSoql).not.toContain("Type = 'Household'");

    // Creation should NOT set Type (uses RecordType instead)
    const fields = orgQuery.newHouseholdFields("Smith Household", "Test");
    expect(fields.Type).toBeUndefined();

    // Advisor field from mapping
    expect(orgQuery.advisorField()).toBe("Primary_Advisor__c");
  });
});

// ─── Integration: Custom Object Org ─────────────────────────────────────────

describe("Integration: Custom Object Org", () => {
  beforeEach(() => clearOrgMapping());

  it("full pipeline with custom household object", () => {
    const bundle = makeBundle({
      candidateCustomObjects: [{
        name: "HH_Group__c",
        label: "Household Group",
        fields: [
          { name: "Name", label: "Name", type: "string", referenceTo: [] },
          { name: "Lead_Advisor__c", label: "Lead Advisor", type: "reference", referenceTo: ["User"] },
          { name: "AUM__c", label: "AUM", type: "currency", referenceTo: [] },
        ],
        childRelationships: [{ childSObject: "Contact", field: "HH_Group__c" }],
      }],
      contactDescribe: {
        name: "Contact", label: "Contact", custom: false,
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
      accountTypeValues: [],
    });

    const mapping = classifyOrgHeuristic(bundle);
    setOrgMapping(mapping);

    // Queries go against custom object
    expect(orgQuery.householdObject()).toBe("HH_Group__c");
    const soql = orgQuery.listHouseholds("Id, Name", 50);
    expect(soql).toContain("FROM HH_Group__c");
    expect(soql).not.toContain("Type =");

    // Contact lookup is custom
    expect(orgQuery.contactHouseholdLookup()).toBe("HH_Group__c");
  });
});

// ─── Integration: Mapping Persistence ───────────────────────────────────────

describe("Integration: Mapping Cache Lifecycle", () => {
  beforeEach(() => clearOrgMapping());

  it("returns null when no mapping is set", () => {
    expect(getOrgMapping()).toBeNull();
  });

  it("returns demo defaults when no mapping is set", () => {
    expect(orgQuery.householdFilter()).toBe("Type = 'Household'");
    expect(orgQuery.householdObject()).toBe("Account");
  });

  it("uses mapping after set", () => {
    const bundle = makeBundle({
      accountTypeValues: [{ value: "Household", count: 10 }],
    });
    const mapping = classifyOrgHeuristic(bundle);
    setOrgMapping(mapping);

    expect(getOrgMapping()).not.toBeNull();
    expect(orgQuery.householdFilter()).toBe("Type = 'Household'");
  });

  it("reverts to defaults after clear", () => {
    const bundle = makeBundle({
      accountDescribe: {
        name: "Account", label: "Account", custom: false,
        fields: [makeField({ name: "Name", type: "string", custom: false })],
        recordTypeInfos: [
          { name: "Master", developerName: "Master", active: true, defaultRecordTypeMapping: false },
          { name: "Household", developerName: "IndustriesHousehold", active: true, defaultRecordTypeMapping: true },
        ],
        childRelationships: [],
      },
      accountTypeValues: [],
    });
    const mapping = classifyOrgHeuristic(bundle);
    setOrgMapping(mapping);

    // Should use RecordType
    expect(orgQuery.householdFilter()).toContain("RecordType");

    // Clear
    clearOrgMapping();

    // Should revert to demo default
    expect(orgQuery.householdFilter()).toBe("Type = 'Household'");
  });
});
