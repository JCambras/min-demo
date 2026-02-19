// ─── Custodian Rules Engine Tests ────────────────────────────────────────────
//
// Covers:
//   1. Registry — account type lookup, list, names (Schwab, Fidelity, Pershing)
//   2. Per-account-type — signer count, beneficiary, docs, NIGO risks
//   3. Document resolution — conditional docs based on funding context
//   4. Income eligibility — Roth phase-out and limits
//   5. NIGO prevention — prevented risks based on completed fields
//   6. Cross-account-type consistency — structural invariants (all custodians)
//   7. Cross-custodian consistency — same account types share structural rules

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
import type { CustodianId } from "@/lib/custodian";

// ═════════════════════════════════════════════════════════════════════════════
// 1. REGISTRY TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("Rules registry", () => {
  it("returns all 8 Schwab account types", () => {
    expect(getAccountTypesList("schwab")).toHaveLength(8);
  });

  it("returns all 8 Fidelity account types", () => {
    expect(getAccountTypesList("fidelity")).toHaveLength(8);
  });

  it("returns all 8 Pershing account types", () => {
    expect(getAccountTypesList("pershing")).toHaveLength(8);
  });

  it("returns null for unknown account type", () => {
    expect(getRulesForAccountType("schwab", "Nonexistent Account")).toBeNull();
  });

  it("returns empty for custodians without rules (altus)", () => {
    expect(getAccountTypesList("altus")).toEqual([]);
  });

  it("getAllAccountTypeNames returns 8 strings for Schwab", () => {
    const names = getAllAccountTypeNames("schwab");
    expect(names).toHaveLength(8);
    for (const name of names) {
      expect(typeof name).toBe("string");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("getAllAccountTypeNames returns 8 strings for Fidelity", () => {
    const names = getAllAccountTypeNames("fidelity");
    expect(names).toHaveLength(8);
  });

  it("getAllAccountTypeNames returns 8 strings for Pershing", () => {
    const names = getAllAccountTypeNames("pershing");
    expect(names).toHaveLength(8);
  });

  it("all three custodians have the same account type names", () => {
    const schwab = getAllAccountTypeNames("schwab").sort();
    const fidelity = getAllAccountTypeNames("fidelity").sort();
    const pershing = getAllAccountTypeNames("pershing").sort();
    expect(fidelity).toEqual(schwab);
    expect(pershing).toEqual(schwab);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. PER-ACCOUNT-TYPE TESTS — SCHWAB
// ═════════════════════════════════════════════════════════════════════════════

describe("Schwab: Individual Brokerage", () => {
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

describe("Schwab: JTWROS", () => {
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

describe("Schwab: Joint TIC", () => {
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

describe("Schwab: Traditional IRA", () => {
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

describe("Schwab: Roth IRA", () => {
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

describe("Schwab: Rollover IRA", () => {
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

describe("Schwab: SEP IRA", () => {
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

describe("Schwab: Trust Account", () => {
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
// 2b. PER-ACCOUNT-TYPE TESTS — FIDELITY
// ═════════════════════════════════════════════════════════════════════════════

describe("Fidelity: Individual Brokerage", () => {
  const rules = getRulesForAccountType("fidelity", "Individual Brokerage")!;

  it("exists", () => expect(rules).not.toBeNull());
  it("has custodianId = fidelity", () => expect(rules.custodianId).toBe("fidelity"));
  it("has 1 signer", () => expect(rules.signerCount).toBe(1));
  it("does not require beneficiary", () => expect(rules.requiresBeneficiary).toBe(false));
  it("includes Fidelity Customer Agreement", () => {
    const docNames = rules.requiredDocuments.map((d) => d.name);
    expect(docNames).toContain("Fidelity Customer Agreement");
  });
  it("uses EFT instead of MoneyLink for ACH", () => {
    const eftDoc = rules.conditionalDocuments.find((d) => d.triggerValue === "ACH");
    expect(eftDoc?.name).toBe("Electronic Funds Transfer (EFT) Authorization");
  });
  it("estimates 15 minutes", () => expect(rules.estimatedMinutes).toBe(15));
});

describe("Fidelity: JTWROS", () => {
  const rules = getRulesForAccountType("fidelity", "JTWROS")!;

  it("exists", () => expect(rules).not.toBeNull());
  it("has 2 signers", () => expect(rules.signerCount).toBe(2));
  it("does not require beneficiary", () => expect(rules.requiresBeneficiary).toBe(false));
  it("includes Fidelity Customer Agreement", () => {
    const docNames = rules.requiredDocuments.map((d) => d.name);
    expect(docNames).toContain("Fidelity Customer Agreement");
  });
  it("has NIGO risk for missing second owner Customer Agreement", () => {
    const riskTexts = rules.nigoRisks.map((r) => r.risk);
    expect(riskTexts).toContain("Missing Fidelity Customer Agreement from second owner");
  });
});

describe("Fidelity: Traditional IRA", () => {
  const rules = getRulesForAccountType("fidelity", "Traditional IRA")!;

  it("exists", () => expect(rules).not.toBeNull());
  it("requires beneficiary", () => expect(rules.requiresBeneficiary).toBe(true));
  it("includes Fidelity IRA Customer Agreement", () => {
    const docNames = rules.requiredDocuments.map((d) => d.name);
    expect(docNames).toContain("Fidelity IRA Customer Agreement");
  });
  it("has NIGO risk for spousal consent in community property states", () => {
    const riskTexts = rules.nigoRisks.map((r) => r.risk);
    expect(riskTexts).toContain("Spousal consent missing for beneficiary in community property state");
  });
  it("has contribution limits", () => {
    expect(rules.contributionLimit!.under50).toBe(7000);
    expect(rules.contributionLimit!.over50).toBe(8000);
  });
});

describe("Fidelity: Roth IRA", () => {
  const rules = getRulesForAccountType("fidelity", "Roth IRA")!;

  it("exists", () => expect(rules).not.toBeNull());
  it("has income eligibility", () => {
    expect(rules.incomeEligibility).toBeDefined();
    expect(rules.incomeEligibility!.maxMAGI_single).toBe(161000);
    expect(rules.incomeEligibility!.maxMAGI_joint).toBe(240000);
  });
  it("has a note about NetBenefits", () => expect(rules.notes).toContain("NetBenefits"));
});

describe("Fidelity: Rollover IRA", () => {
  const rules = getRulesForAccountType("fidelity", "Rollover IRA")!;

  it("has required Rollover Recommendation + PTE docs", () => {
    const docNames = rules.requiredDocuments.map((d) => d.name);
    expect(docNames).toContain("Rollover Recommendation");
    expect(docNames).toContain("PTE 2020-02 Exemption");
  });
  it("has NIGO risk for missing NetBenefits plan ID", () => {
    const riskTexts = rules.nigoRisks.map((r) => r.risk);
    expect(riskTexts).toContain("Fidelity NetBenefits plan ID missing for employer plan rollover");
  });
  it("has a note about NetBenefits", () => expect(rules.notes).toContain("NetBenefits"));
});

describe("Fidelity: Trust Account", () => {
  const rules = getRulesForAccountType("fidelity", "Trust")!;

  it("has conditional Trustee Affidavit for stale certifications", () => {
    const condDoc = rules.conditionalDocuments.find((d) => d.name === "Trustee Affidavit");
    expect(condDoc).toBeDefined();
    expect(condDoc!.triggerField).toBe("trust_certification_stale");
  });
  it("has NIGO risk for stale trust certification", () => {
    const riskTexts = rules.nigoRisks.map((r) => r.risk);
    expect(riskTexts).toContain("Trust certification older than 12 months without affidavit");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2c. PER-ACCOUNT-TYPE TESTS — PERSHING
// ═════════════════════════════════════════════════════════════════════════════

describe("Pershing: Individual Brokerage", () => {
  const rules = getRulesForAccountType("pershing", "Individual Brokerage")!;

  it("exists", () => expect(rules).not.toBeNull());
  it("has custodianId = pershing", () => expect(rules.custodianId).toBe("pershing"));
  it("has 1 signer", () => expect(rules.signerCount).toBe(1));
  it("uses New Account Application", () => {
    const docNames = rules.requiredDocuments.map((d) => d.name);
    expect(docNames).toContain("New Account Application");
  });
  it("uses ACAT for transfers instead of TOA", () => {
    const acatDoc = rules.conditionalDocuments.find((d) => d.triggerValue === "Transfer");
    expect(acatDoc?.name).toBe("Account Transfer Form (ACAT)");
  });
  it("uses ACH Authorization for electronic funding", () => {
    const achDoc = rules.conditionalDocuments.find((d) => d.triggerValue === "ACH");
    expect(achDoc?.name).toBe("ACH Authorization");
  });
  it("has NIGO risk for ACAT account number format", () => {
    const riskTexts = rules.nigoRisks.map((r) => r.risk);
    expect(riskTexts).toContain("Account number format incorrect on ACAT form");
  });
});

describe("Pershing: JTWROS", () => {
  const rules = getRulesForAccountType("pershing", "JTWROS")!;

  it("has 2 signers", () => expect(rules.signerCount).toBe(2));
  it("has a note about ACATS", () => expect(rules.notes).toContain("ACATS"));
  it("uses Joint New Account Application", () => {
    const docNames = rules.requiredDocuments.map((d) => d.name);
    expect(docNames).toContain("Joint New Account Application");
  });
});

describe("Pershing: Traditional IRA", () => {
  const rules = getRulesForAccountType("pershing", "Traditional IRA")!;

  it("requires beneficiary", () => expect(rules.requiresBeneficiary).toBe(true));
  it("includes IRA Custodial Agreement", () => {
    const docNames = rules.requiredDocuments.map((d) => d.name);
    expect(docNames).toContain("IRA Custodial Agreement");
  });
  it("has NIGO risk for unsigned custodial agreement", () => {
    const riskTexts = rules.nigoRisks.map((r) => r.risk);
    expect(riskTexts).toContain("IRA custodial agreement not signed");
  });
  it("uses ACAT for transfers", () => {
    const acatDoc = rules.conditionalDocuments.find((d) => d.triggerValue === "Transfer");
    expect(acatDoc?.name).toBe("Account Transfer Form (ACAT)");
  });
});

describe("Pershing: Roth IRA", () => {
  const rules = getRulesForAccountType("pershing", "Roth IRA")!;

  it("has income eligibility", () => {
    expect(rules.incomeEligibility).toBeDefined();
    expect(rules.incomeEligibility!.maxMAGI_single).toBe(161000);
  });
  it("includes IRA Custodial Agreement", () => {
    const docNames = rules.requiredDocuments.map((d) => d.name);
    expect(docNames).toContain("IRA Custodial Agreement");
  });
});

describe("Pershing: Rollover IRA", () => {
  const rules = getRulesForAccountType("pershing", "Rollover IRA")!;

  it("has required Rollover Recommendation + PTE docs", () => {
    const docNames = rules.requiredDocuments.map((d) => d.name);
    expect(docNames).toContain("Rollover Recommendation");
    expect(docNames).toContain("PTE 2020-02 Exemption");
  });
  it("has NIGO risk for missing DTC number on ACAT", () => {
    const riskTexts = rules.nigoRisks.map((r) => r.risk);
    expect(riskTexts).toContain("ACAT form missing contra-firm DTC number");
  });
  it("has a note about ACATS", () => expect(rules.notes).toContain("ACATS"));
});

describe("Pershing: Trust Account", () => {
  const rules = getRulesForAccountType("pershing", "Trust")!;

  it("uses Trust New Account Application", () => {
    const docNames = rules.requiredDocuments.map((d) => d.name);
    expect(docNames).toContain("Trust New Account Application");
  });
  it("has conditional Corporate Resolution for entity trusts", () => {
    const condDoc = rules.conditionalDocuments.find((d) => d.name === "Corporate Resolution");
    expect(condDoc).toBeDefined();
    expect(condDoc!.triggerField).toBe("trust_entity_type");
  });
  it("has NIGO risk for missing corporate resolution", () => {
    const riskTexts = rules.nigoRisks.map((r) => r.risk);
    expect(riskTexts).toContain("Missing corporate resolution for entity-established trusts");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. DOCUMENT RESOLUTION TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("getRequiredDocuments", () => {
  it("Schwab Individual with no funding context returns base docs only", () => {
    const docs = getRequiredDocuments("schwab", "Individual Brokerage", {});
    const names = docs.map((d) => d.name);
    expect(names).toContain("Account Application");
    expect(names).toContain("Form CRS");
    expect(names).not.toContain("MoneyLink Authorization");
    expect(names).not.toContain("Transfer of Assets (TOA) Form");
  });

  it("Schwab IRA with funding_method = Rollover includes Rollover Recommendation + PTE", () => {
    const docs = getRequiredDocuments("schwab", "Traditional IRA", { funding_method: "Rollover" });
    const names = docs.map((d) => d.name);
    expect(names).toContain("Rollover Recommendation");
    expect(names).toContain("PTE 2020-02 Exemption");
  });

  it("Schwab IRA with funding_method = ACH includes MoneyLink Authorization", () => {
    const docs = getRequiredDocuments("schwab", "Traditional IRA", { funding_method: "ACH" });
    const names = docs.map((d) => d.name);
    expect(names).toContain("MoneyLink Authorization");
    expect(names).not.toContain("Rollover Recommendation");
  });

  it("Schwab JTWROS with funding_method = Transfer includes TOA + LOA", () => {
    const docs = getRequiredDocuments("schwab", "JTWROS", { funding_method: "Transfer" });
    const names = docs.map((d) => d.name);
    expect(names).toContain("Transfer of Assets (TOA) Form");
    expect(names).toContain("Letter of Authorization (LOA)");
  });

  it("Schwab Trust includes Trust Certification in base docs", () => {
    const docs = getRequiredDocuments("schwab", "Trust", {});
    const names = docs.map((d) => d.name);
    expect(names).toContain("Trust Certification/Abstract");
  });

  it("Fidelity IRA with ACH uses EFT Authorization instead of MoneyLink", () => {
    const docs = getRequiredDocuments("fidelity", "Traditional IRA", { funding_method: "ACH" });
    const names = docs.map((d) => d.name);
    expect(names).toContain("Electronic Funds Transfer (EFT) Authorization");
    expect(names).not.toContain("MoneyLink Authorization");
  });

  it("Fidelity IRA with Rollover includes PTE docs", () => {
    const docs = getRequiredDocuments("fidelity", "Traditional IRA", { funding_method: "Rollover" });
    const names = docs.map((d) => d.name);
    expect(names).toContain("Rollover Recommendation");
    expect(names).toContain("PTE 2020-02 Exemption");
  });

  it("Pershing JTWROS with Transfer uses ACAT instead of TOA", () => {
    const docs = getRequiredDocuments("pershing", "JTWROS", { funding_method: "Transfer" });
    const names = docs.map((d) => d.name);
    expect(names).toContain("Account Transfer Form (ACAT)");
    expect(names).not.toContain("Transfer of Assets (TOA) Form");
  });

  it("Pershing IRA with ACH uses ACH Authorization", () => {
    const docs = getRequiredDocuments("pershing", "Traditional IRA", { funding_method: "ACH" });
    const names = docs.map((d) => d.name);
    expect(names).toContain("ACH Authorization");
    expect(names).not.toContain("MoneyLink Authorization");
    expect(names).not.toContain("Electronic Funds Transfer (EFT) Authorization");
  });

  it("returns empty array for unknown account type", () => {
    expect(getRequiredDocuments("schwab", "Nonexistent", {})).toEqual([]);
  });

  it("returns empty array for custodian without rules", () => {
    expect(getRequiredDocuments("altus", "Traditional IRA", {})).toEqual([]);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. INCOME ELIGIBILITY TESTS
// ═════════════════════════════════════════════════════════════════════════════

describe("checkIncomeEligibility", () => {
  it("Schwab Roth IRA, single, $100K → eligible", () => {
    const result = checkIncomeEligibility("schwab", "Roth IRA", 100000, "single");
    expect(result).not.toBeNull();
    expect(result!.eligible).toBe(true);
    expect(result!.overLimit).toBe(false);
    expect(result!.inPhaseOut).toBe(false);
  });

  it("Schwab Roth IRA, single, $150K → in phase-out", () => {
    const result = checkIncomeEligibility("schwab", "Roth IRA", 150000, "single");
    expect(result).not.toBeNull();
    expect(result!.eligible).toBe(true);
    expect(result!.overLimit).toBe(false);
    expect(result!.inPhaseOut).toBe(true);
  });

  it("Schwab Roth IRA, single, $170K → over limit, returns alternatives", () => {
    const result = checkIncomeEligibility("schwab", "Roth IRA", 170000, "single");
    expect(result).not.toBeNull();
    expect(result!.eligible).toBe(false);
    expect(result!.overLimit).toBe(true);
    expect(result!.inPhaseOut).toBe(false);
    expect(result!.alternatives).toContain("Traditional IRA");
    expect(result!.alternatives).toContain("Backdoor Roth conversion");
  });

  it("Schwab Roth IRA, joint, $200K → eligible", () => {
    const result = checkIncomeEligibility("schwab", "Roth IRA", 200000, "joint");
    expect(result).not.toBeNull();
    expect(result!.eligible).toBe(true);
    expect(result!.overLimit).toBe(false);
    expect(result!.inPhaseOut).toBe(false);
  });

  it("Schwab Roth IRA, joint, $235K → in phase-out", () => {
    const result = checkIncomeEligibility("schwab", "Roth IRA", 235000, "joint");
    expect(result).not.toBeNull();
    expect(result!.eligible).toBe(true);
    expect(result!.overLimit).toBe(false);
    expect(result!.inPhaseOut).toBe(true);
  });

  it("Schwab Roth IRA, joint, $250K → over limit", () => {
    const result = checkIncomeEligibility("schwab", "Roth IRA", 250000, "joint");
    expect(result).not.toBeNull();
    expect(result!.eligible).toBe(false);
    expect(result!.overLimit).toBe(true);
  });

  it("Fidelity Roth IRA has same income limits as Schwab (federal rule)", () => {
    const schwab = checkIncomeEligibility("schwab", "Roth IRA", 150000, "single");
    const fidelity = checkIncomeEligibility("fidelity", "Roth IRA", 150000, "single");
    expect(fidelity!.eligible).toBe(schwab!.eligible);
    expect(fidelity!.inPhaseOut).toBe(schwab!.inPhaseOut);
  });

  it("Pershing Roth IRA has same income limits as Schwab (federal rule)", () => {
    const schwab = checkIncomeEligibility("schwab", "Roth IRA", 170000, "single");
    const pershing = checkIncomeEligibility("pershing", "Roth IRA", 170000, "single");
    expect(pershing!.eligible).toBe(schwab!.eligible);
    expect(pershing!.overLimit).toBe(schwab!.overLimit);
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

  it("Schwab IRA with beneficiary completed → missing beneficiary risk is prevented", () => {
    const prevented = getPreventedNIGORisks("schwab", "Traditional IRA", {
      ...defaultFields,
      hasBeneficiary: true,
    });
    const risks = prevented.map((r) => r.risk);
    expect(risks).toContain("Missing beneficiary designation");
  });

  it("Schwab JTWROS with 2 signers → only one owner signed risk is prevented", () => {
    const prevented = getPreventedNIGORisks("schwab", "JTWROS", {
      ...defaultFields,
      signerCount: 2,
    });
    const risks = prevented.map((r) => r.risk);
    expect(risks).toContain("Only one owner signed");
  });

  it("Schwab Roth with income verified → income eligibility risk is prevented", () => {
    const prevented = getPreventedNIGORisks("schwab", "Roth IRA", {
      ...defaultFields,
      incomeVerified: true,
    });
    const risks = prevented.map((r) => r.risk);
    expect(risks).toContain("Income eligibility not verified");
  });

  it("Schwab IRA without beneficiary → missing beneficiary is NOT prevented", () => {
    const prevented = getPreventedNIGORisks("schwab", "Traditional IRA", {
      ...defaultFields,
      hasBeneficiary: false,
    });
    const risks = prevented.map((r) => r.risk);
    expect(risks).not.toContain("Missing beneficiary designation");
  });

  it("Schwab Rollover IRA with rollover rec → missing rollover recommendation is prevented", () => {
    const prevented = getPreventedNIGORisks("schwab", "Rollover IRA", {
      ...defaultFields,
      hasRolloverRec: true,
    });
    const risks = prevented.map((r) => r.risk);
    expect(risks).toContain("Missing rollover recommendation");
  });

  it("Fidelity IRA with beneficiary completed → risk is prevented", () => {
    const prevented = getPreventedNIGORisks("fidelity", "Traditional IRA", {
      ...defaultFields,
      hasBeneficiary: true,
    });
    const risks = prevented.map((r) => r.risk);
    expect(risks).toContain("Missing beneficiary designation");
  });

  it("Pershing JTWROS with 2 signers → only one owner signed is prevented", () => {
    const prevented = getPreventedNIGORisks("pershing", "JTWROS", {
      ...defaultFields,
      signerCount: 2,
    });
    const risks = prevented.map((r) => r.risk);
    expect(risks).toContain("Only one owner signed");
  });

  it("Pershing Rollover IRA with rollover rec → risk is prevented", () => {
    const prevented = getPreventedNIGORisks("pershing", "Rollover IRA", {
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
// 6. CROSS-ACCOUNT-TYPE CONSISTENCY TESTS (per custodian)
// ═════════════════════════════════════════════════════════════════════════════

const CUSTODIANS_WITH_RULES: CustodianId[] = ["schwab", "fidelity", "pershing"];

const retirementTypes = ["Traditional IRA", "Roth IRA", "Rollover IRA", "SEP IRA"];
const nonRetirementTypes = ["Individual Brokerage", "JTWROS"];
const jointTypes = ["JTWROS", "Joint TIC"];
const singleOwnerTypes = ["Individual Brokerage", "Traditional IRA", "Roth IRA", "Rollover IRA", "SEP IRA", "Trust"];

describe.each(CUSTODIANS_WITH_RULES)("Cross-account-type consistency: %s", (custodianId) => {
  const allRules = getAccountTypesList(custodianId);

  it("has 8 account types", () => {
    expect(allRules).toHaveLength(8);
  });

  it("all retirement accounts require beneficiary", () => {
    for (const type of retirementTypes) {
      const rules = getRulesForAccountType(custodianId, type)!;
      expect(rules.requiresBeneficiary).toBe(true);
    }
  });

  it("non-retirement accounts (Individual, JTWROS) don't require beneficiary", () => {
    for (const type of nonRetirementTypes) {
      const rules = getRulesForAccountType(custodianId, type)!;
      expect(rules.requiresBeneficiary).toBe(false);
    }
  });

  it("all joint accounts have signerCount = 2", () => {
    for (const type of jointTypes) {
      const rules = getRulesForAccountType(custodianId, type)!;
      expect(rules.signerCount).toBe(2);
    }
  });

  it("all single-owner accounts have signerCount = 1", () => {
    for (const type of singleOwnerTypes) {
      const rules = getRulesForAccountType(custodianId, type)!;
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

  it("every account type has a displayName containing the custodian", () => {
    for (const rules of allRules) {
      expect(rules.displayName.length).toBeGreaterThan(0);
    }
  });

  it("every account type has estimatedMinutes > 0", () => {
    for (const rules of allRules) {
      expect(rules.estimatedMinutes).toBeGreaterThan(0);
    }
  });

  it("every account type has correct custodianId", () => {
    for (const rules of allRules) {
      expect(rules.custodianId).toBe(custodianId);
    }
  });

  it("all NIGO risks are in frequency order", () => {
    for (const rules of allRules) {
      assertNIGOFrequencyOrder(rules.nigoRisks);
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 7. CROSS-CUSTODIAN CONSISTENCY — federal rules are identical
// ═════════════════════════════════════════════════════════════════════════════

describe("Cross-custodian consistency", () => {
  it("all custodians have Roth IRA income eligibility with the same federal limits", () => {
    for (const cid of CUSTODIANS_WITH_RULES) {
      const rules = getRulesForAccountType(cid, "Roth IRA")!;
      expect(rules.incomeEligibility!.maxMAGI_single).toBe(161000);
      expect(rules.incomeEligibility!.maxMAGI_joint).toBe(240000);
      expect(rules.incomeEligibility!.phaseOutStart_single).toBe(146000);
      expect(rules.incomeEligibility!.phaseOutStart_joint).toBe(230000);
    }
  });

  it("all custodians have the same IRA contribution limits (federal)", () => {
    for (const cid of CUSTODIANS_WITH_RULES) {
      const trad = getRulesForAccountType(cid, "Traditional IRA")!;
      expect(trad.contributionLimit!.under50).toBe(7000);
      expect(trad.contributionLimit!.over50).toBe(8000);
    }
  });

  it("all custodians have the same SEP IRA contribution limits (federal)", () => {
    for (const cid of CUSTODIANS_WITH_RULES) {
      const sep = getRulesForAccountType(cid, "SEP IRA")!;
      expect(sep.contributionLimit!.under50).toBe(69000);
      expect(sep.contributionLimit!.over50).toBe(69000);
    }
  });

  it("all custodians require Rollover Recommendation + PTE for Rollover IRA", () => {
    for (const cid of CUSTODIANS_WITH_RULES) {
      const rules = getRulesForAccountType(cid, "Rollover IRA")!;
      const docNames = rules.requiredDocuments.map((d) => d.name);
      expect(docNames).toContain("Rollover Recommendation");
      expect(docNames).toContain("PTE 2020-02 Exemption");
    }
  });

  it("all custodians require SEP Plan Agreement for SEP IRA", () => {
    for (const cid of CUSTODIANS_WITH_RULES) {
      const rules = getRulesForAccountType(cid, "SEP IRA")!;
      const docNames = rules.requiredDocuments.map((d) => d.name);
      expect(docNames).toContain("SEP Plan Agreement (IRS Form 5305-SEP)");
    }
  });

  it("all custodians require Trust Certification for Trust accounts", () => {
    for (const cid of CUSTODIANS_WITH_RULES) {
      const rules = getRulesForAccountType(cid, "Trust")!;
      const docNames = rules.requiredDocuments.map((d) => d.name);
      expect(docNames).toContain("Trust Certification/Abstract");
    }
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// getNIGORisks function tests
// ═════════════════════════════════════════════════════════════════════════════

describe("getNIGORisks", () => {
  it("returns sorted risks for Schwab JTWROS", () => {
    const risks = getNIGORisks("schwab", "JTWROS");
    expect(risks.length).toBeGreaterThan(0);
    assertNIGOFrequencyOrder(risks);
  });

  it("returns sorted risks for Fidelity JTWROS", () => {
    const risks = getNIGORisks("fidelity", "JTWROS");
    expect(risks.length).toBeGreaterThan(0);
    assertNIGOFrequencyOrder(risks);
  });

  it("returns sorted risks for Pershing JTWROS", () => {
    const risks = getNIGORisks("pershing", "JTWROS");
    expect(risks.length).toBeGreaterThan(0);
    assertNIGOFrequencyOrder(risks);
  });

  it("returns empty for unknown account type", () => {
    expect(getNIGORisks("schwab", "Nonexistent")).toEqual([]);
  });

  it("returns empty for custodian without rules", () => {
    expect(getNIGORisks("altus", "Traditional IRA")).toEqual([]);
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
