// ─── Org Query Builder Tests ────────────────────────────────────────────────
//
// Verifies that orgQuery generates correct SOQL for different org patterns.

import { describe, it, expect, beforeEach } from "vitest";
import { orgQuery, setOrgMapping, clearOrgMapping } from "../org-query";
import type { OrgMapping } from "../schema-discovery";

// ─── Test Helpers ───────────────────────────────────────────────────────────

function makeMapping(overrides?: Partial<OrgMapping>): OrgMapping {
  return {
    orgId: "00DTEST",
    discoveredAt: new Date().toISOString(),
    version: 1,
    confidence: 0.85,
    personAccountsEnabled: false,
    household: {
      object: "Account",
      recordTypeDeveloperName: null,
      recordTypeId: null,
      filterField: "Type",
      filterValue: "Household",
      nameField: "Name",
      primaryAdvisorField: "OwnerId",
      totalAumField: null,
      serviceTierField: null,
      clientStatusField: null,
      confidence: 0.85,
    },
    contact: {
      object: "Contact",
      householdLookup: "AccountId",
      firstNameField: "FirstName",
      lastNameField: "LastName",
      emailField: "Email",
      phoneField: "Phone",
      isPrimaryField: null,
      confidence: 0.90,
    },
    financialAccount: { available: false, object: null, householdLookup: null, balanceField: null, accountTypeField: null, statusField: null, confidence: 0.90 },
    aum: { source: "not_found", object: null, field: null, confidence: 0.80 },
    complianceReview: { type: "task_pattern", object: "Task", confidence: 0.60 },
    pipeline: { type: "opportunity", object: "Opportunity", stageField: "StageName", amountField: "Amount", confidence: 0.90 },
    automationRisks: { riskLevel: "low", taskFlowCount: 0, accountTriggerCount: 0, blockingValidationRules: [] },
    warnings: [],
    ...overrides,
  };
}

// ─── Tests ──────────────────────────────────────────────────────────────────

describe("orgQuery — No Mapping (Demo Defaults)", () => {
  beforeEach(() => clearOrgMapping());

  it("uses Account as household object", () => {
    expect(orgQuery.householdObject()).toBe("Account");
  });

  it("uses Type = Household as filter", () => {
    expect(orgQuery.householdFilter()).toBe("Type = 'Household'");
  });

  it("generates correct list query", () => {
    const soql = orgQuery.listHouseholds("Id, Name", 50);
    expect(soql).toBe("SELECT Id, Name FROM Account WHERE Type = 'Household' ORDER BY CreatedDate DESC LIMIT 50");
  });

  it("generates correct search query", () => {
    const soql = orgQuery.searchHouseholds("Id, Name", "Smith", 10);
    expect(soql).toBe("SELECT Id, Name FROM Account WHERE Type = 'Household' AND Name LIKE '%Smith%' ORDER BY CreatedDate DESC LIMIT 10");
  });

  it("returns Household as type value for creation", () => {
    expect(orgQuery.householdTypeValue()).toBe("Household");
  });

  it("returns AccountId as contact lookup", () => {
    expect(orgQuery.contactHouseholdLookup()).toBe("AccountId");
  });
});

describe("orgQuery — Type Picklist Mapping", () => {
  beforeEach(() => setOrgMapping(makeMapping()));

  it("uses Type filter from mapping", () => {
    expect(orgQuery.householdFilter()).toBe("Type = 'Household'");
  });

  it("generates AND clause", () => {
    expect(orgQuery.householdFilterAnd()).toBe(" AND Type = 'Household'");
  });

  it("generates WHERE clause", () => {
    expect(orgQuery.householdFilterWhere()).toBe(" WHERE Type = 'Household'");
  });
});

describe("orgQuery — RecordType Mapping (FSC)", () => {
  beforeEach(() => {
    setOrgMapping(makeMapping({
      household: {
        object: "Account",
        recordTypeDeveloperName: "IndustriesHousehold",
        recordTypeId: "012000000000001AAA",
        filterField: null,
        filterValue: null,
        nameField: "Name",
        primaryAdvisorField: "Primary_Advisor__c",
        totalAumField: "Total_AUM__c",
        serviceTierField: "Service_Tier__c",
        clientStatusField: null,
        confidence: 0.95,
      },
    }));
  });

  it("uses RecordType filter", () => {
    expect(orgQuery.householdFilter()).toBe("RecordType.DeveloperName = 'IndustriesHousehold'");
  });

  it("generates correct list query", () => {
    const soql = orgQuery.listHouseholds("Id, Name", 100);
    expect(soql).toContain("RecordType.DeveloperName = 'IndustriesHousehold'");
    expect(soql).toContain("LIMIT 100");
  });

  it("returns null for type value (uses RecordType instead)", () => {
    expect(orgQuery.householdTypeValue()).toBeNull();
  });

  it("returns RecordType developer name", () => {
    expect(orgQuery.householdRecordTypeDeveloperName()).toBe("IndustriesHousehold");
  });

  it("returns custom advisor field", () => {
    expect(orgQuery.advisorField()).toBe("Primary_Advisor__c");
  });
});

describe("orgQuery — Custom Object Mapping", () => {
  beforeEach(() => {
    setOrgMapping(makeMapping({
      household: {
        object: "HH_Group__c",
        recordTypeDeveloperName: null,
        recordTypeId: null,
        filterField: null,
        filterValue: null,
        nameField: "Name",
        primaryAdvisorField: "Lead_Advisor__c",
        totalAumField: "AUM__c",
        serviceTierField: null,
        clientStatusField: null,
        confidence: 0.65,
      },
      contact: {
        object: "Contact",
        householdLookup: "HH_Group__c",
        firstNameField: "FirstName",
        lastNameField: "LastName",
        emailField: "Email",
        phoneField: "Phone",
        isPrimaryField: null,
        confidence: 0.75,
      },
    }));
  });

  it("uses custom object name", () => {
    expect(orgQuery.householdObject()).toBe("HH_Group__c");
  });

  it("no filter needed (all records are households)", () => {
    expect(orgQuery.householdFilter()).toBe("");
    expect(orgQuery.householdFilterAnd()).toBe("");
    expect(orgQuery.householdFilterWhere()).toBe("");
  });

  it("generates query against custom object", () => {
    const soql = orgQuery.listHouseholds("Id, Name", 50);
    expect(soql).toBe("SELECT Id, Name FROM HH_Group__c ORDER BY CreatedDate DESC LIMIT 50");
  });

  it("uses custom contact lookup", () => {
    expect(orgQuery.contactHouseholdLookup()).toBe("HH_Group__c");
  });

  it("search query works without filter", () => {
    const soql = orgQuery.searchHouseholds("Id, Name", "Smith", 10);
    expect(soql).toBe("SELECT Id, Name FROM HH_Group__c WHERE Name LIKE '%Smith%' ORDER BY CreatedDate DESC LIMIT 10");
  });
});

describe("orgQuery — newHouseholdFields", () => {
  it("includes Type when mapping uses Type filter", () => {
    setOrgMapping(makeMapping());
    const fields = orgQuery.newHouseholdFields("Smith Household", "Created by Min");
    expect(fields.Name).toBe("Smith Household");
    expect(fields.Type).toBe("Household");
    expect(fields.Description).toBe("Created by Min");
  });

  it("excludes Type when mapping uses RecordType", () => {
    setOrgMapping(makeMapping({
      household: {
        object: "Account",
        recordTypeDeveloperName: "IndustriesHousehold",
        recordTypeId: "012000000000001AAA",
        filterField: null, filterValue: null,
        nameField: "Name", primaryAdvisorField: null, totalAumField: null,
        serviceTierField: null, clientStatusField: null, confidence: 0.95,
      },
    }));
    const fields = orgQuery.newHouseholdFields("Smith Household", "Created by Min");
    expect(fields.Type).toBeUndefined();
  });

  it("includes RecordTypeId when mapping has recordTypeId", () => {
    setOrgMapping(makeMapping({
      household: {
        object: "Account",
        recordTypeDeveloperName: "IndustriesHousehold",
        recordTypeId: "012000000000001AAA",
        filterField: null, filterValue: null,
        nameField: "Name", primaryAdvisorField: null, totalAumField: null,
        serviceTierField: null, clientStatusField: null, confidence: 0.95,
      },
    }));
    const fields = orgQuery.newHouseholdFields("Smith Household", "Created by Min");
    expect(fields.RecordTypeId).toBe("012000000000001AAA");
    expect(fields.Type).toBeUndefined();
  });

  it("excludes RecordTypeId when mapping has no recordTypeId", () => {
    setOrgMapping(makeMapping());
    const fields = orgQuery.newHouseholdFields("Smith Household", "Created by Min");
    expect(fields.RecordTypeId).toBeUndefined();
    expect(fields.Type).toBe("Household");
  });
});

describe("orgQuery — personAccountsEnabled", () => {
  beforeEach(() => clearOrgMapping());

  it("returns false when no mapping is set", () => {
    expect(orgQuery.personAccountsEnabled()).toBe(false);
  });

  it("returns false when mapping has personAccountsEnabled = false", () => {
    setOrgMapping(makeMapping({ personAccountsEnabled: false }));
    expect(orgQuery.personAccountsEnabled()).toBe(false);
  });

  it("returns true when mapping has personAccountsEnabled = true", () => {
    setOrgMapping(makeMapping({ personAccountsEnabled: true }));
    expect(orgQuery.personAccountsEnabled()).toBe(true);
  });
});

describe("orgQuery — householdRecordTypeId", () => {
  beforeEach(() => clearOrgMapping());

  it("returns null when no mapping is set", () => {
    expect(orgQuery.householdRecordTypeId()).toBeNull();
  });

  it("returns null when mapping has no recordTypeId", () => {
    setOrgMapping(makeMapping());
    expect(orgQuery.householdRecordTypeId()).toBeNull();
  });

  it("returns Id when mapping has recordTypeId", () => {
    setOrgMapping(makeMapping({
      household: {
        object: "Account",
        recordTypeDeveloperName: "IndustriesHousehold",
        recordTypeId: "012000000000001AAA",
        filterField: null, filterValue: null,
        nameField: "Name", primaryAdvisorField: null, totalAumField: null,
        serviceTierField: null, clientStatusField: null, confidence: 0.95,
      },
    }));
    expect(orgQuery.householdRecordTypeId()).toBe("012000000000001AAA");
  });
});
