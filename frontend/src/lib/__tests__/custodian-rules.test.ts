// ─── Custodian Rules Engine Tests ────────────────────────────────────────────
//
// Covers:
//   1. Registry — account type lookup, list, names
//   2. Per-account-type — signer count, beneficiary, docs, NIGO risks
//   3. Document resolution — conditional docs based on funding context
//   4. Income eligibility — Roth phase-out and limits
//   5. NIGO prevention — prevented risks based on completed fields
//   6. Cross-account-type consistency — structural invariants

import { describe, it, expect } from "vitest";
import {
  getRulesForAccountType,
  getAccountTypesList,
  getAllAccountTypeNames,
  getRequiredDocuments,
  checkIncomeEligibility,
  getNIGORisks,
  getPreventedNIGORisks,
} from "@/lib/custodian-rules";
import type { AccountTypeRules, NIGORisk } from "@/lib/custodian-rules";

// ═════════════════════════════════════════════════════════════════════════════
// 1. REGISTRY TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("Rules registry", () => {
  it("returns all 8 Schwab account types", () => {
    const list = getAccountTypesList("schwab");
    expect(list).toHaveLength(8);
  });

  it("returns null for unknown account type", () => {
    expect(getRulesForAccountType("schwab", "Nonexistent Account")).toBeNull();
  });

  it("returns empty for custodians without rules (fidelity)", () => {
    expect(getAccountTypesList("fidelity")).toEqual([]);
  });

  it("returns empty for custodians without rules (pershing)", () => {
    expect(getAccountTypesList("pershing")).toEqual([]);
  });

  it("getAllAccountTypeNames returns 8 strings for Schwab", () => {
    const names = getAllAccountTypeNames("schwab");
    expect(names).toHaveLength(8);
    for (const name of names) {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("getAllAccountTypeNames returns empty for fidelity", () => {
    expect(getAllAccountTypeNames("fidelity")).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. PER-ACCOUNT-TYPE TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("Individual Brokerage", () => {
  const rules = getRulesForAccountType("schwab", "Individual Brokerage")!;

  it("exists", () => expect(rules).not.toBeNull());
  it("has 1 signer", () => expect(rules.signerCount).toBe(1));
  it("does not require beneficiary", () => expect(rules.requiresBeneficiary).toBe(false));
  it("has required documents", () => expect(rules.requiredDocuments.length).toBeGreaterThan(0));
  it("has at least one NIGO risk", () => expect(rules.nigoRisks.length).toBeGreaterThan(0));
  it("estimates 15 minutes", () => expect(rules.estimatedMinutes).toBe(15));

  it("NIGO risks are in frequency order", () => {
    assertNIGOFrequencyOrder(rules.nigoRisks);
  });
});

describe("JTWROS", () => {
  const rules = getRulesForAccountType("schwab", "JTWROS")!;

  it("exists", () => expect(rules).not.toBeNull());
  it("has 2 signers", () => expect(rules.signerCount).toBe(2));
  it("does not require beneficiary", () => expect(rules.requiresBeneficiary).toBe(false));
  it("has required documents", () => expect(rules.requiredDocuments.length).toBeGreaterThan(0));
  it("has at least one NIGO risk", () => expect(rules.nigoRisks.length).toBeGreaterThan(0));
  it("estimates 20 minutes", () => expect(rules.estimatedMinutes).toBe(20));
  it("has a note about both owners", () => expect(rules.notes).toContain("Both owners"));

  it("NIGO risks are in frequency order", () => {
    assertNIGOFrequencyOrder(rules.nigoRisks);
  });
});

describe("Joint TIC", () => {
  const rules = getRulesForAccountType("schwab", "Joint TIC")!;

  it("exists", () => expect(rules).not.toBeNull());
  it("has 2 signers", () => expect(rules.signerCount).toBe(2));
  it("requires beneficiary", () => expect(rules.requiresBeneficiary).toBe(true));
  it("has required documents including Beneficiary Designation", () => {
    const docNames = rules.requiredDocuments.map((d) => d.name);
    expect(docNames).toContain("Beneficiary Designation");
  });
  it("has at least one NIGO risk", () => expect(rules.nigoRisks.length).toBeGreaterThan(0));
  it("estimates 25 minutes", () => expect(rules.estimatedMinutes).toBe(25));

  it("NIGO risks are in frequency order", () => {
    assertNIGOFrequencyOrder(rules.nigoRisks);
  });
});

describe("Traditional IRA", () => {
  const rules = getRulesForAccountType("schwab", "Traditional IRA")!;

  it("exists", () => expect(rules).not.toBeNull());
  it("has 1 signer", () => expect(rules.signerCount).toBe(1));
  it("requires beneficiary", () => expect(rules.requiresBeneficiary).toBe(true));
  it("has a beneficiary note", () => expect(rules.beneficiaryNote).toBeDefined());
  it("has required documents", () => expect(rules.requiredDocuments.length).toBeGreaterThan(0));
  it("has at least one NIGO risk", () => expect(rules.nigoRisks.length).toBeGreaterThan(0));
  it("has contribution limits", () => {
    expect(rules.contributionLimit).toBeDefined();
    expect(rules.contributionLimit!.under50).toBe(7000);
    expect(rules.contributionLimit!.over50).toBe(8000);
  });
  it("does NOT have income eligibility", () => expect(rules.incomeEligibility).toBeUndefined());
  it("estimates 15 minutes", () => expect(rules.estimatedMinutes).toBe(15));

  it("NIGO risks are in frequency order", () => {
    assertNIGOFrequencyOrder(rules.nigoRisks);
  });
});

describe("Roth IRA", () => {
  const rules = getRulesForAccountType("schwab", "Roth IRA")!;

  it("exists", () => expect(rules).not.toBeNull());
  it("has 1 signer", () => expect(rules.signerCount).toBe(1));
  it("requires beneficiary", () => expect(rules.requiresBeneficiary).toBe(true));
  it("has required documents", () => expect(rules.requiredDocuments.length).toBeGreaterThan(0));
  it("has at least one NIGO risk", () => expect(rules.nigoRisks.length).toBeGreaterThan(0));
  it("has income eligibility rules", () => {
    expect(rules.incomeEligibility).toBeDefined();
    expect(rules.incomeEligibility!.maxMAGI_single).toBe(161000);
    expect(rules.incomeEligibility!.maxMAGI_joint).toBe(240000);
  });
  it("has contribution limits", () => {
    expect(rules.contributionLimit).toBeDefined();
    expect(rules.contributionLimit!.under50).toBe(7000);
  });
  it("lists alternatives for over-income", () => {
    expect(rules.incomeEligibility!.alternatives).toContain("Traditional IRA");
    expect(rules.incomeEligibility!.alternatives).toContain("Backdoor Roth conversion");
  });
  it("estimates 15 minutes", () => expect(rules.estimatedMinutes).toBe(15));
  it("has a note about RMDs", () => expect(rules.notes).toContain("No RMDs"));

  it("NIGO risks are in frequency order", () => {
    assertNIGOFrequencyOrder(rules.nigoRisks);
  });
});

describe("Rollover IRA", () => {
  const rules = getRulesForAccountType("schwab", "Rollover IRA")!;

  it("exists", () => expect(rules).not.toBeNull());
  it("has 1 signer", () => expect(rules.signerCount).toBe(1));
  it("requires beneficiary", () => expect(rules.requiresBeneficiary).toBe(true));
  it("has required documents including Rollover Recommendation", () => {
    const docNames = rules.requiredDocuments.map((d) => d.name);
    expect(docNames).toContain("Rollover Recommendation");
    expect(docNames).toContain("PTE 2020-02 Exemption");
  });
  it("has at least one NIGO risk", () => expect(rules.nigoRisks.length).toBeGreaterThan(0));
  it("estimates 20 minutes", () => expect(rules.estimatedMinutes).toBe(20));
  it("has a note about DOL PTE 2020-02", () => expect(rules.notes).toContain("DOL PTE 2020-02"));

  it("NIGO risks are in frequency order", () => {
    assertNIGOFrequencyOrder(rules.nigoRisks);
  });
});

describe("SEP IRA", () => {
  const rules = getRulesForAccountType("schwab", "SEP IRA")!;

  it("exists", () => expect(rules).not.toBeNull());
  it("has 1 signer", () => expect(rules.signerCount).toBe(1));
  it("requires beneficiary", () => expect(rules.requiresBeneficiary).toBe(true));
  it("has required documents including SEP Plan Agreement", () => {
    const docNames = rules.requiredDocuments.map((d) => d.name);
    expect(docNames).toContain("SEP Plan Agreement (IRS Form 5305-SEP)");
  });
  it("has at least one NIGO risk", () => expect(rules.nigoRisks.length).toBeGreaterThan(0));
  it("has contribution limits (no catch-up)", () => {
    expect(rules.contributionLimit).toBeDefined();
    expect(rules.contributionLimit!.under50).toBe(69000);
    expect(rules.contributionLimit!.over50).toBe(69000); // no catch-up
  });
  it("estimates 20 minutes", () => expect(rules.estimatedMinutes).toBe(20));
  it("has a note about employer contributions only", () => expect(rules.notes).toContain("Employer contributions only"));

  it("NIGO risks are in frequency order", () => {
    assertNIGOFrequencyOrder(rules.nigoRisks);
  });
});

describe("Trust Account", () => {
  const rules = getRulesForAccountType("schwab", "Trust")!;

  it("exists", () => expect(rules).not.toBeNull());
  it("has 1 signer (trustee)", () => expect(rules.signerCount).toBe(1));
  it("does not require beneficiary", () => expect(rules.requiresBeneficiary).toBe(false));
  it("has required documents including Trust Certification", () => {
    const docNames = rules.requiredDocuments.map((d) => d.name);
    expect(docNames).toContain("Trust Certification/Abstract");
  });
  it("has at least one NIGO risk", () => expect(rules.nigoRisks.length).toBeGreaterThan(0));
  it("estimates 25 minutes", () => expect(rules.estimatedMinutes).toBe(25));
  it("has a note about trustee requirements", () => expect(rules.notes).toContain("trustee"));

  it("NIGO risks are in frequency order", () => {
    assertNIGOFrequencyOrder(rules.nigoRisks);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. DOCUMENT RESOLUTION TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("getRequiredDocuments", () => {
  it("Individual with no funding context returns base docs only", () => {
    const docs = getRequiredDocuments("schwab", "Individual Brokerage", {});
    const names = docs.map((d) => d.name);
    expect(names).toContain("Account Application");
    expect(names).toContain("Form CRS");
    expect(names).not.toContain("MoneyLink Authorization");
    expect(names).not.toContain("Transfer of Assets (TOA) Form");
  });

  it("IRA with funding_method = Rollover includes Rollover Recommendation + PTE", () => {
    const docs = getRequiredDocuments("schwab", "Traditional IRA", { funding_method: "Rollover" });
    const names = docs.map((d) => d.name);
    expect(names).toContain("Rollover Recommendation");
    expect(names).toContain("PTE 2020-02 Exemption");
  });

  it("IRA with funding_method = ACH includes MoneyLink Authorization", () => {
    const docs = getRequiredDocuments("schwab", "Traditional IRA", { funding_method: "ACH" });
    const names = docs.map((d) => d.name);
    expect(names).toContain("MoneyLink Authorization");
    expect(names).not.toContain("Rollover Recommendation");
  });

  it("JTWROS with funding_method = Transfer includes TOA + LOA", () => {
    const docs = getRequiredDocuments("schwab", "JTWROS", { funding_method: "Transfer" });
    const names = docs.map((d) => d.name);
    expect(names).toContain("Transfer of Assets (TOA) Form");
    expect(names).toContain("Letter of Authorization (LOA)");
  });

  it("Trust includes Trust Certification in base docs", () => {
    const docs = getRequiredDocuments("schwab", "Trust", {});
    const names = docs.map((d) => d.name);
    expect(names).toContain("Trust Certification/Abstract");
  });

  it("returns empty array for unknown account type", () => {
    expect(getRequiredDocuments("schwab", "Nonexistent", {})).toEqual([]);
  });

  it("returns empty array for custodian without rules", () => {
    expect(getRequiredDocuments("fidelity", "Traditional IRA", {})).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. INCOME ELIGIBILITY TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("checkIncomeEligibility", () => {
  it("Roth IRA, single, $100K → eligible", () => {
    const result = checkIncomeEligibility("schwab", "Roth IRA", 100000, "single");
    expect(result).not.toBeNull();
    expect(result!.eligible).toBe(true);
    expect(result!.overLimit).toBe(false);
    expect(result!.inPhaseOut).toBe(false);
  });

  it("Roth IRA, single, $150K → in phase-out", () => {
    const result = checkIncomeEligibility("schwab", "Roth IRA", 150000, "single");
    expect(result).not.toBeNull();
    expect(result!.eligible).toBe(true);
    expect(result!.overLimit).toBe(false);
    expect(result!.inPhaseOut).toBe(true);
  });

  it("Roth IRA, single, $170K → over limit, returns alternatives", () => {
    const result = checkIncomeEligibility("schwab", "Roth IRA", 170000, "single");
    expect(result).not.toBeNull();
    expect(result!.eligible).toBe(false);
    expect(result!.overLimit).toBe(true);
    expect(result!.inPhaseOut).toBe(false);
    expect(result!.alternatives).toContain("Traditional IRA");
    expect(result!.alternatives).toContain("Backdoor Roth conversion");
  });

  it("Roth IRA, joint, $200K → eligible", () => {
    const result = checkIncomeEligibility("schwab", "Roth IRA", 200000, "joint");
    expect(result).not.toBeNull();
    expect(result!.eligible).toBe(true);
    expect(result!.overLimit).toBe(false);
    expect(result!.inPhaseOut).toBe(false);
  });

  it("Roth IRA, joint, $235K → in phase-out", () => {
    const result = checkIncomeEligibility("schwab", "Roth IRA", 235000, "joint");
    expect(result).not.toBeNull();
    expect(result!.eligible).toBe(true);
    expect(result!.overLimit).toBe(false);
    expect(result!.inPhaseOut).toBe(true);
  });

  it("Roth IRA, joint, $250K → over limit", () => {
    const result = checkIncomeEligibility("schwab", "Roth IRA", 250000, "joint");
    expect(result).not.toBeNull();
    expect(result!.eligible).toBe(false);
    expect(result!.overLimit).toBe(true);
  });

  it("Traditional IRA → returns null (no income limit)", () => {
    expect(checkIncomeEligibility("schwab", "Traditional IRA", 200000, "single")).toBeNull();
  });

  it("Individual → returns null", () => {
    expect(checkIncomeEligibility("schwab", "Individual Brokerage", 200000, "single")).toBeNull();
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. NIGO PREVENTION TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("getPreventedNIGORisks", () => {
  const defaultFields = {
    hasBeneficiary: false,
    signerCount: 1,
    incomeVerified: false,
    hasRolloverRec: false,
  };

  it("IRA with beneficiary completed → missing beneficiary risk is prevented", () => {
    const prevented = getPreventedNIGORisks("schwab", "Traditional IRA", {
      ...defaultFields,
      hasBeneficiary: true,
    });
    const risks = prevented.map((r) => r.risk);
    expect(risks).toContain("Missing beneficiary designation");
  });

  it("JTWROS with 2 signers → only one owner signed risk is prevented", () => {
    const prevented = getPreventedNIGORisks("schwab", "JTWROS", {
      ...defaultFields,
      signerCount: 2,
    });
    const risks = prevented.map((r) => r.risk);
    expect(risks).toContain("Only one owner signed");
  });

  it("Roth with income verified → income eligibility risk is prevented", () => {
    const prevented = getPreventedNIGORisks("schwab", "Roth IRA", {
      ...defaultFields,
      incomeVerified: true,
    });
    const risks = prevented.map((r) => r.risk);
    expect(risks).toContain("Income eligibility not verified");
  });

  it("IRA without beneficiary → missing beneficiary is NOT prevented", () => {
    const prevented = getPreventedNIGORisks("schwab", "Traditional IRA", {
      ...defaultFields,
      hasBeneficiary: false,
    });
    const risks = prevented.map((r) => r.risk);
    expect(risks).not.toContain("Missing beneficiary designation");
  });

  it("Rollover IRA with rollover rec → missing rollover recommendation is prevented", () => {
    const prevented = getPreventedNIGORisks("schwab", "Rollover IRA", {
      ...defaultFields,
      hasRolloverRec: true,
    });
    const risks = prevented.map((r) => r.risk);
    expect(risks).toContain("Missing rollover recommendation");
  });

  it("returns empty array for unknown account type", () => {
    expect(getPreventedNIGORisks("schwab", "Nonexistent", defaultFields)).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. CROSS-ACCOUNT-TYPE CONSISTENCY TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("Cross-account-type consistency", () => {
  const allRules = getAccountTypesList("schwab");

  const retirementTypes = ["Traditional IRA", "Roth IRA", "Rollover IRA", "SEP IRA"];
  const nonRetirementTypes = ["Individual Brokerage", "JTWROS"];
  const jointTypes = ["JTWROS", "Joint TIC"];
  const singleOwnerTypes = ["Individual Brokerage", "Traditional IRA", "Roth IRA", "Rollover IRA", "SEP IRA", "Trust"];

  it("all retirement accounts require beneficiary", () => {
    for (const type of retirementTypes) {
      const rules = getRulesForAccountType("schwab", type)!;
      expect(rules.requiresBeneficiary).toBe(true);
    }
  });

  it("non-retirement accounts (Individual, JTWROS) don't require beneficiary", () => {
    for (const type of nonRetirementTypes) {
      const rules = getRulesForAccountType("schwab", type)!;
      expect(rules.requiresBeneficiary).toBe(false);
    }
  });

  it("all joint accounts have signerCount = 2", () => {
    for (const type of jointTypes) {
      const rules = getRulesForAccountType("schwab", type)!;
      expect(rules.signerCount).toBe(2);
    }
  });

  it("all single-owner accounts have signerCount = 1", () => {
    for (const type of singleOwnerTypes) {
      const rules = getRulesForAccountType("schwab", type)!;
      expect(rules.signerCount).toBe(1);
    }
  });

  it("every account type has Form CRS in required documents", () => {
    for (const rules of allRules) {
      const docNames = rules.requiredDocuments.map((d) => d.name);
      expect(docNames).toContain("Form CRS");
    }
  });

  it("every account type has at least one NIGO risk", () => {
    for (const rules of allRules) {
      expect(rules.nigoRisks.length).toBeGreaterThan(0);
    }
  });

  it("no two account types share the exact same document list", () => {
    const docSignatures = allRules.map((r) =>
      r.requiredDocuments.map((d) => d.name).sort().join("|"),
    );
    const unique = new Set(docSignatures);
    expect(unique.size).toBe(docSignatures.length);
  });

  it("every account type has a displayName", () => {
    for (const rules of allRules) {
      expect(rules.displayName.length).toBeGreaterThan(0);
    }
  });

  it("every account type has estimatedMinutes > 0", () => {
    for (const rules of allRules) {
      expect(rules.estimatedMinutes).toBeGreaterThan(0);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getNIGORisks function tests
// ═════════════════════════════════════════════════════════════════════════════

describe("getNIGORisks", () => {
  it("returns sorted risks for JTWROS", () => {
    const risks = getNIGORisks("schwab", "JTWROS");
    expect(risks.length).toBeGreaterThan(0);
    assertNIGOFrequencyOrder(risks);
  });

  it("returns empty for unknown account type", () => {
    expect(getNIGORisks("schwab", "Nonexistent")).toEqual([]);
  });

  it("returns empty for custodian without rules", () => {
    expect(getNIGORisks("fidelity", "Traditional IRA")).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// Helpers
// ═════════════════════════════════════════════════════════════════════════════

const FREQ_ORDER: Record<NIGORisk["frequency"], number> = {
  most_common: 0,
  common: 1,
  occasional: 2,
};

function assertNIGOFrequencyOrder(risks: NIGORisk[]) {
  for (let i = 1; i < risks.length; i++) {
    expect(FREQ_ORDER[risks[i].frequency]).toBeGreaterThanOrEqual(
      FREQ_ORDER[risks[i - 1].frequency],
    );
  }
}
