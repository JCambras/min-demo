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
    managedPackage: { platform: null, prefix: null, confidence: 0 },
    householdPatterns: [],
    isHybrid: false,
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
      usesAccountHierarchy: false,
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
      junction: null,
      confidence: 0.90,
    },
    financialAccount: { available: false, object: null, householdLookup: null, balanceField: null, accountTypeField: null, statusField: null, confidence: 0.90 },
    aum: { source: "not_found", object: null, field: null, confidence: 0.80 },
    complianceReview: { type: "task_pattern", object: "Task", confidence: 0.60 },
    pipeline: { type: "opportunity", object: "Opportunity", stageField: "StageName", amountField: "Amount", confidence: 0.90 },
    automationRisks: { riskLevel: "low", taskFlowCount: 0, accountTriggerCount: 0, blockingValidationRules: [] },
    requiredFieldGaps: [],
    flsWarnings: [],
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
        usesAccountHierarchy: false,
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
        usesAccountHierarchy: false,
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
        junction: null,
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
        serviceTierField: null, clientStatusField: null, usesAccountHierarchy: false, confidence: 0.95,
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
        serviceTierField: null, clientStatusField: null, usesAccountHierarchy: false, confidence: 0.95,
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
        serviceTierField: null, clientStatusField: null, usesAccountHierarchy: false, confidence: 0.95,
      },
    }));
    expect(orgQuery.householdRecordTypeId()).toBe("012000000000001AAA");
  });
});

// ─── Phase 2: New Accessor Tests ─────────────────────────────────────────────

describe("orgQuery — contactJunction", () => {
  beforeEach(() => clearOrgMapping());

  it("returns null when no mapping is set", () => {
    expect(orgQuery.contactJunction()).toBeNull();
  });

  it("returns null when mapping has no junction", () => {
    setOrgMapping(makeMapping());
    expect(orgQuery.contactJunction()).toBeNull();
  });

  it("returns junction when mapping has one", () => {
    setOrgMapping(makeMapping({
      contact: {
        object: "Contact",
        householdLookup: "AccountId",
        firstNameField: "FirstName",
        lastNameField: "LastName",
        emailField: "Email",
        phoneField: "Phone",
        isPrimaryField: null,
        junction: { object: "cloupra__Client_Group_Member__c", contactLookup: "cloupra__Contact__c", householdLookup: "cloupra__Household__c" },
        confidence: 0.80,
      },
    }));
    const j = orgQuery.contactJunction();
    expect(j).not.toBeNull();
    expect(j!.object).toBe("cloupra__Client_Group_Member__c");
    expect(j!.contactLookup).toBe("cloupra__Contact__c");
  });
});

describe("orgQuery — usesAccountHierarchy", () => {
  beforeEach(() => clearOrgMapping());

  it("returns false when no mapping is set", () => {
    expect(orgQuery.usesAccountHierarchy()).toBe(false);
  });

  it("returns false when mapping has hierarchy disabled", () => {
    setOrgMapping(makeMapping());
    expect(orgQuery.usesAccountHierarchy()).toBe(false);
  });

  it("returns true when mapping has hierarchy enabled", () => {
    setOrgMapping(makeMapping({
      household: {
        ...makeMapping().household,
        usesAccountHierarchy: true,
      },
    }));
    expect(orgQuery.usesAccountHierarchy()).toBe(true);
  });
});

describe("orgQuery — isHybridOrg", () => {
  beforeEach(() => clearOrgMapping());

  it("returns false when no mapping is set", () => {
    expect(orgQuery.isHybridOrg()).toBe(false);
  });

  it("returns false when single pattern", () => {
    setOrgMapping(makeMapping({ isHybrid: false }));
    expect(orgQuery.isHybridOrg()).toBe(false);
  });

  it("returns true when hybrid", () => {
    setOrgMapping(makeMapping({ isHybrid: true }));
    expect(orgQuery.isHybridOrg()).toBe(true);
  });
});

describe("orgQuery — compound householdFilter (hybrid)", () => {
  beforeEach(() => clearOrgMapping());

  it("generates compound OR filter when multiple same-object patterns exist", () => {
    setOrgMapping(makeMapping({
      isHybrid: true,
      householdPatterns: [
        { type: "recordType", filter: "RecordType.DeveloperName = 'IndustriesHousehold'", confidence: 0.95 },
        { type: "typePicklist", filter: "Type = 'Household'", confidence: 0.85 },
      ],
    }));
    expect(orgQuery.householdFilter()).toBe("(RecordType.DeveloperName = 'IndustriesHousehold' OR Type = 'Household')");
  });

  it("falls through to single-pattern logic when only one filterable pattern", () => {
    setOrgMapping(makeMapping({
      householdPatterns: [
        { type: "recordType", filter: "RecordType.DeveloperName = 'IndustriesHousehold'", confidence: 0.95 },
        { type: "managed_package", filter: "", confidence: 0.95 },
      ],
      household: {
        ...makeMapping().household,
        recordTypeDeveloperName: "IndustriesHousehold",
        filterField: null,
        filterValue: null,
      },
    }));
    expect(orgQuery.householdFilter()).toBe("RecordType.DeveloperName = 'IndustriesHousehold'");
  });

  it("falls through to single-pattern logic when empty householdPatterns", () => {
    setOrgMapping(makeMapping({
      householdPatterns: [],
    }));
    expect(orgQuery.householdFilter()).toBe("Type = 'Household'");
  });
});

describe("orgQuery — requiredFieldGaps and FLS", () => {
  beforeEach(() => clearOrgMapping());

  it("returns empty arrays when no mapping", () => {
    expect(orgQuery.requiredFieldGaps()).toEqual([]);
    expect(orgQuery.flsWarnings()).toEqual([]);
    expect(orgQuery.hasBlockingFieldGaps()).toBe(false);
    expect(orgQuery.hasFlsWarnings()).toBe(false);
  });

  it("returns gaps and warnings from mapping", () => {
    setOrgMapping(makeMapping({
      requiredFieldGaps: [
        { object: "Account", fields: [{ name: "Industry", label: "Industry", type: "picklist" }], severity: "blocking" },
      ],
      flsWarnings: [
        { field: "Total_AUM__c", object: "Account", issue: "not_readable", impact: "AUM will show as $0" },
      ],
    }));
    expect(orgQuery.requiredFieldGaps()).toHaveLength(1);
    expect(orgQuery.hasBlockingFieldGaps()).toBe(true);
    expect(orgQuery.flsWarnings()).toHaveLength(1);
    expect(orgQuery.hasFlsWarnings()).toBe(true);
  });

  it("hasBlockingFieldGaps returns false for warning-level gaps only", () => {
    setOrgMapping(makeMapping({
      requiredFieldGaps: [
        { object: "Contact", fields: [{ name: "Birthdate", label: "Birthdate", type: "date" }], severity: "warning" },
      ],
    }));
    expect(orgQuery.hasBlockingFieldGaps()).toBe(false);
  });
});

// ─── Phase 3: SOQL Injection Prevention ──────────────────────────────────────

describe("orgQuery — SOQL injection prevention (Phase 3)", () => {
  beforeEach(() => clearOrgMapping());

  it("escapes malicious recordTypeDeveloperName", () => {
    setOrgMapping(makeMapping({
      household: {
        ...makeMapping().household,
        recordTypeDeveloperName: "Household' OR 1=1--",
        filterField: null,
        filterValue: null,
      },
    }));
    const filter = orgQuery.householdFilter();
    // The single quote in the value should be escaped with backslash
    expect(filter).toContain("\\'");
    // The injection cannot break out of the string literal because the quote is escaped
    expect(filter).toBe("RecordType.DeveloperName = 'Household\\' OR 1=1--'");
  });

  it("escapes malicious filterValue", () => {
    setOrgMapping(makeMapping({
      household: {
        ...makeMapping().household,
        recordTypeDeveloperName: null,
        filterField: "Type",
        filterValue: "Household'; DELETE--",
      },
    }));
    const filter = orgQuery.householdFilter();
    // The single quote should be escaped, preventing breakout
    expect(filter).toContain("\\'");
    // The value stays inside the SOQL string literal (escaped quote prevents breakout)
    expect(filter).toBe("Type = 'Household\\'; DELETE--'");
  });

  it("sanitizes filterField against invalid characters", () => {
    setOrgMapping(makeMapping({
      household: {
        ...makeMapping().household,
        recordTypeDeveloperName: null,
        filterField: "Type'; DROP TABLE--",
        filterValue: "Household",
      },
    }));
    const filter = orgQuery.householdFilter();
    // Invalid field name should fall back to "Type"
    expect(filter).toMatch(/^Type =/);
  });

  it("sanitizes nameQuery in searchHouseholds", () => {
    const soql = orgQuery.searchHouseholds("Id, Name", "Smith'; DROP--", 10);
    // The single quote in the search term should be escaped
    expect(soql).toContain("\\'");
    // The injection stays inside the LIKE string literal
    expect(soql).toContain("Name LIKE '%Smith\\'; DROP--%'");
  });
});
