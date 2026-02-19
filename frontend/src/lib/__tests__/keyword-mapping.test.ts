// ─── Keyword Mapping Tests ──────────────────────────────────────────────────
//
// Tests for the configurable compliance keyword mapping system.
// Covers: DEFAULT_KEYWORD_MAP structure, getEffectiveKeywordMap merge logic,
// persistence (load/save), and runComplianceChecks integration with overrides.

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  DEFAULT_KEYWORD_MAP,
  KEYWORD_CHECK_LABELS,
  KEYWORD_MAP_KEY,
  loadKeywordMap,
  saveKeywordMap,
  getEffectiveKeywordMap,
  runComplianceChecks,
} from "@/lib/compliance-engine";
import type { KeywordMap, SFHousehold, SFContact, SFTask } from "@/lib/compliance-engine";

// ─── Mock localStorage ──────────────────────────────────────────────────────

const mockStorage: Record<string, string> = {};

beforeEach(() => {
  Object.keys(mockStorage).forEach(k => delete mockStorage[k]);
  // Stub window so typeof window !== "undefined" guard passes
  vi.stubGlobal("window", globalThis);
  vi.stubGlobal("localStorage", {
    getItem: vi.fn((key: string) => mockStorage[key] ?? null),
    setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
    removeItem: vi.fn((key: string) => { delete mockStorage[key]; }),
  });
});

// ─── Fixtures ───────────────────────────────────────────────────────────────

const makeHousehold = (overrides?: Partial<SFHousehold>): SFHousehold => ({
  id: "001-hh", name: "Test Household", description: "", createdAt: new Date().toISOString(), ...overrides,
});

const makeTask = (subject: string, description = "", status = "Completed"): SFTask => ({
  id: `t-${Date.now()}-${Math.random()}`, subject, status, priority: "Normal", description, createdAt: new Date().toISOString(), dueDate: "",
});

const makeContact = (first = "Jane", last = "Doe"): SFContact => ({
  id: `c-${Date.now()}`, firstName: first, lastName: last, email: "jane@example.com", phone: "555-1234", createdAt: new Date().toISOString(),
});

// ─── DEFAULT_KEYWORD_MAP ────────────────────────────────────────────────────

describe("DEFAULT_KEYWORD_MAP", () => {
  it("contains all 13 built-in check IDs", () => {
    const expectedIds = [
      "kyc-profile", "trusted-contact", "identity-verified",
      "suitability-profile", "pte-trigger", "pte-compliance",
      "form-crs", "adv-delivery", "privacy-notice",
      "beneficiary-designation", "signatures", "ach-authorization",
      "completeness-check",
    ];
    expect(Object.keys(DEFAULT_KEYWORD_MAP).sort()).toEqual(expectedIds.sort());
  });

  it("every check has at least one keyword", () => {
    for (const [checkId, keywords] of Object.entries(DEFAULT_KEYWORD_MAP)) {
      expect(keywords.length, `${checkId} should have keywords`).toBeGreaterThan(0);
    }
  });

  it("all keywords are lowercase strings", () => {
    for (const keywords of Object.values(DEFAULT_KEYWORD_MAP)) {
      for (const kw of keywords) {
        expect(typeof kw).toBe("string");
        expect(kw).toBe(kw.toLowerCase());
        expect(kw.trim()).toBe(kw);
      }
    }
  });
});

// ─── KEYWORD_CHECK_LABELS ───────────────────────────────────────────────────

describe("KEYWORD_CHECK_LABELS", () => {
  it("has a label for every DEFAULT_KEYWORD_MAP entry", () => {
    for (const checkId of Object.keys(DEFAULT_KEYWORD_MAP)) {
      expect(KEYWORD_CHECK_LABELS[checkId], `Missing label for ${checkId}`).toBeTruthy();
    }
  });

  it("labels are non-empty strings", () => {
    for (const label of Object.values(KEYWORD_CHECK_LABELS)) {
      expect(typeof label).toBe("string");
      expect(label.trim().length).toBeGreaterThan(0);
    }
  });
});

// ─── loadKeywordMap / saveKeywordMap ────────────────────────────────────────

describe("loadKeywordMap", () => {
  it("returns empty object when localStorage is empty", () => {
    expect(loadKeywordMap()).toEqual({});
  });

  it("returns parsed overrides from localStorage", () => {
    const overrides: KeywordMap = { "kyc-profile": ["client profile update"] };
    mockStorage[KEYWORD_MAP_KEY] = JSON.stringify(overrides);
    expect(loadKeywordMap()).toEqual(overrides);
  });

  it("returns empty object on corrupted JSON", () => {
    mockStorage[KEYWORD_MAP_KEY] = "not valid json{{{";
    expect(loadKeywordMap()).toEqual({});
  });
});

describe("saveKeywordMap", () => {
  it("persists overrides to localStorage", () => {
    const overrides: KeywordMap = { "form-crs": ["crs delivery", "relationship summary"] };
    saveKeywordMap(overrides);
    expect(mockStorage[KEYWORD_MAP_KEY]).toBe(JSON.stringify(overrides));
  });

  it("persists empty object (clears all overrides)", () => {
    saveKeywordMap({});
    expect(mockStorage[KEYWORD_MAP_KEY]).toBe("{}");
  });
});

// ─── getEffectiveKeywordMap ────────────────────────────────────────────────

describe("getEffectiveKeywordMap", () => {
  it("returns defaults when no overrides exist", () => {
    expect(getEffectiveKeywordMap({})).toEqual(DEFAULT_KEYWORD_MAP);
  });

  it("overrides replace defaults entirely for a given check", () => {
    const overrides: KeywordMap = { "kyc-profile": ["client profile update", "kyc review"] };
    const effective = getEffectiveKeywordMap(overrides);
    expect(effective["kyc-profile"]).toEqual(["client profile update", "kyc review"]);
    // Other checks unchanged
    expect(effective["form-crs"]).toEqual(DEFAULT_KEYWORD_MAP["form-crs"]);
  });

  it("merges multiple overrides", () => {
    const overrides: KeywordMap = {
      "kyc-profile": ["client profile"],
      "signatures": ["esign", "e-signature"],
    };
    const effective = getEffectiveKeywordMap(overrides);
    expect(effective["kyc-profile"]).toEqual(["client profile"]);
    expect(effective["signatures"]).toEqual(["esign", "e-signature"]);
    expect(effective["trusted-contact"]).toEqual(DEFAULT_KEYWORD_MAP["trusted-contact"]);
  });

  it("reads from localStorage when no argument given", () => {
    const overrides: KeywordMap = { "privacy-notice": ["privacy policy"] };
    mockStorage[KEYWORD_MAP_KEY] = JSON.stringify(overrides);
    const effective = getEffectiveKeywordMap();
    expect(effective["privacy-notice"]).toEqual(["privacy policy"]);
  });

  it("override with empty array makes check always fail", () => {
    const effective = getEffectiveKeywordMap({ "kyc-profile": [] });
    expect(effective["kyc-profile"]).toEqual([]);
  });
});

// ─── runComplianceChecks with keyword overrides ─────────────────────────────

describe("runComplianceChecks with keyword overrides", () => {
  it("uses default keywords when no overrides passed", () => {
    const tasks = [makeTask("KYC Review Completed"), makeTask("Trusted Contact Form Signed")];
    const results = runComplianceChecks(makeHousehold(), [makeContact()], tasks);
    const kyc = results.find(r => r.id === "kyc-profile");
    expect(kyc?.status).toBe("pass");
  });

  it("passes check when custom keyword matches", () => {
    const tasks = [makeTask("Client Profile Update Done")];
    const overrides: KeywordMap = { "kyc-profile": ["client profile update"] };
    const results = runComplianceChecks(makeHousehold(), [makeContact()], tasks, overrides);
    const kyc = results.find(r => r.id === "kyc-profile");
    expect(kyc?.status).toBe("pass");
  });

  it("fails check when default keywords replaced and new ones don't match", () => {
    const tasks = [makeTask("KYC Review Completed")]; // default "kyc" keyword would match
    const overrides: KeywordMap = { "kyc-profile": ["client profile update"] };
    const results = runComplianceChecks(makeHousehold(), [makeContact()], tasks, overrides);
    const kyc = results.find(r => r.id === "kyc-profile");
    expect(kyc?.status).toBe("fail");
  });

  it("supports keyword matching in task descriptions", () => {
    const tasks = [makeTask("Review", "please complete the client profile update")];
    const overrides: KeywordMap = { "kyc-profile": ["client profile update"] };
    const results = runComplianceChecks(makeHousehold(), [makeContact()], tasks, overrides);
    const kyc = results.find(r => r.id === "kyc-profile");
    expect(kyc?.status).toBe("pass");
  });

  it("keyword matching is case-insensitive", () => {
    const tasks = [makeTask("CLIENT PROFILE UPDATE")];
    const overrides: KeywordMap = { "kyc-profile": ["client profile update"] };
    const results = runComplianceChecks(makeHousehold(), [makeContact()], tasks, overrides);
    const kyc = results.find(r => r.id === "kyc-profile");
    expect(kyc?.status).toBe("pass");
  });

  it("override with empty array causes check to fail", () => {
    const tasks = [makeTask("KYC Review"), makeTask("Suitability Questionnaire")];
    const overrides: KeywordMap = { "kyc-profile": [] };
    const results = runComplianceChecks(makeHousehold(), [makeContact()], tasks, overrides);
    const kyc = results.find(r => r.id === "kyc-profile");
    expect(kyc?.status).toBe("fail");
  });

  it("only overridden checks are affected; others keep defaults", () => {
    const tasks = [
      makeTask("Trusted Contact Designation"),
      makeTask("Identity Verified via Gov ID"),
      makeTask("Custom CRS Delivery Complete"),
    ];
    const overrides: KeywordMap = { "form-crs": ["custom crs delivery"] };
    const results = runComplianceChecks(makeHousehold(), [makeContact()], tasks, overrides);

    // Overridden check passes with custom keyword
    const crs = results.find(r => r.id === "form-crs");
    expect(crs?.status).toBe("pass");

    // Non-overridden checks still work with defaults
    const tc = results.find(r => r.id === "trusted-contact");
    expect(tc?.status).toBe("pass");
    const id = results.find(r => r.id === "identity-verified");
    expect(id?.status).toBe("pass");
  });

  it("overrides work for suitability evidence building", () => {
    const tasks = [makeTask("Client Suitability Assessment Q1")];
    const overrides: KeywordMap = { "suitability-profile": ["suitability assessment"] };
    const results = runComplianceChecks(makeHousehold(), [makeContact()], tasks, overrides);
    const suit = results.find(r => r.id === "suitability-profile");
    expect(suit?.status).toBe("pass");
    // Should get generic evidence since custom keyword doesn't match specific evidence keys
    expect(suit?.evidence).toContain("Suitability profile documented");
  });

  it("overrides work for PTE trigger detection", () => {
    const tasks = [makeTask("401k Transfer Request"), makeTask("PTE Analysis Complete")];
    const overrides: KeywordMap = { "pte-trigger": ["401k transfer"], "pte-compliance": ["pte analysis"] };
    const results = runComplianceChecks(makeHousehold(), [makeContact()], tasks, overrides);
    const pte = results.find(r => r.id === "pte-compliance");
    expect(pte).toBeDefined();
    expect(pte?.status).toBe("pass");
  });

  it("overrides work for signature check", () => {
    const tasks = [makeTask("E-Signature Request Sent")];
    const overrides: KeywordMap = { "signatures": ["e-signature"] };
    const results = runComplianceChecks(makeHousehold(), [makeContact()], tasks, overrides);
    const sig = results.find(r => r.id === "signatures");
    expect(sig?.status).toBe("pass");
  });

  it("multiple keywords for one check — any match is sufficient", () => {
    const tasks = [makeTask("Privacy Policy Acknowledgement")];
    const overrides: KeywordMap = { "privacy-notice": ["privacy policy", "reg s-p", "privacy disclosure"] };
    const results = runComplianceChecks(makeHousehold(), [makeContact()], tasks, overrides);
    const pn = results.find(r => r.id === "privacy-notice");
    expect(pn?.status).toBe("pass");
  });
});
