// ─── AUM Coverage Tests ──────────────────────────────────────────────────────
//
// Tests for the aumCoverage computation in buildPracticeData + FSC overlay:
//   1. No FSC data → mode "none", blendedAum = estimated
//   2. Full FSC coverage → mode "full", blendedAum = actualAum
//   3. Partial FSC coverage → mode "partial", correct breakdown
//   4. Zero-balance FSC accounts treated as "without FSC"
//   5. Per-advisor AUM uses real data for FSC households, estimated for others
//   6. Revenue metrics (annual fee, monthly fee) derived from blended AUM

import { describe, it, expect } from "vitest";
import { buildPracticeData, DEFAULT_REVENUE_ASSUMPTIONS } from "@/app/dashboard/usePracticeData";
import type { SFTask, SFHousehold, PracticeData } from "@/app/dashboard/usePracticeData";

const mockInstanceUrl = "https://test.salesforce.com";

function makeHousehold(name: string, daysAgo: number, desc?: string): SFHousehold {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  return { id: `001${name.replace(/\s/g, "")}`, name, createdAt: d.toISOString(), description: desc };
}

function makeTask(subject: string, hhName: string, status: string, daysAgo: number): SFTask {
  const d = new Date(); d.setDate(d.getDate() - daysAgo);
  return {
    id: `00T${subject.slice(0, 8).replace(/\s/g, "")}${Math.random().toString(36).slice(2, 6)}`,
    subject, status, priority: "Normal", description: "",
    createdAt: d.toISOString(), dueDate: "",
    householdName: hhName, householdId: `001${hhName.replace(/\s/g, "")}`,
  };
}

// Helper to simulate what the hook does: build practice data then apply FSC overlay
function applyFscOverlay(
  practiceData: PracticeData,
  households: SFHousehold[],
  aumByHousehold: Record<string, number>,
  accountCount: number,
): PracticeData {
  const bps = practiceData.assumptions.feeScheduleBps;
  const avgAum = practiceData.assumptions.avgAumPerHousehold;

  practiceData.fscAvailable = true;
  practiceData.aumByHousehold = aumByHousehold;
  practiceData.financialAccountCount = accountCount;

  const totalAum = Object.values(aumByHousehold).reduce((s, v) => s + v, 0);
  practiceData.realAum = totalAum;

  // Determine which households have real FSC data (balance > 0)
  const hhIdsWithFsc = new Set<string>();
  for (const [hhId, balance] of Object.entries(aumByHousehold)) {
    if (balance > 0) hhIdsWithFsc.add(hhId);
  }

  const householdsWithFsc = households.filter(h => hhIdsWithFsc.has(h.id)).length;
  const householdsWithoutFsc = households.length - householdsWithFsc;

  let actualAum = 0;
  for (const balance of Object.values(aumByHousehold)) {
    if (balance > 0) actualAum += balance;
  }

  const estimatedGapAum = householdsWithoutFsc * avgAum;
  const blendedAum = actualAum + estimatedGapAum;

  const mode: "full" | "partial" | "none" =
    householdsWithFsc === 0 ? "none" :
    householdsWithoutFsc === 0 ? "full" : "partial";

  practiceData.aumCoverage = {
    mode, actualAum, householdsWithFsc, estimatedGapAum,
    householdsWithoutFsc, blendedAum, accountCount,
  };

  if (blendedAum > 0) {
    practiceData.revenue.estimatedAum = blendedAum;
    practiceData.revenue.annualFeeIncome = blendedAum * (bps / 10000);
    practiceData.revenue.monthlyFeeIncome = practiceData.revenue.annualFeeIncome / 12;
  }

  // Per-advisor overlay
  const hhNameToId = new Map<string, string>();
  for (const h of households) { hhNameToId.set(h.name, h.id); }

  const advisorRealAum = new Map<string, number>();
  const advisorEstAum = new Map<string, number>();
  for (const [hhName, advName] of practiceData.hhAdvisorMap) {
    const hhId = hhNameToId.get(hhName);
    if (!hhId) continue;
    if (hhIdsWithFsc.has(hhId)) {
      const hhAum = aumByHousehold[hhId] || 0;
      advisorRealAum.set(advName, (advisorRealAum.get(advName) || 0) + hhAum);
    } else {
      advisorEstAum.set(advName, (advisorEstAum.get(advName) || 0) + avgAum);
    }
  }

  for (const advisor of practiceData.revenue.revenuePerAdvisor) {
    const real = advisorRealAum.get(advisor.name) || 0;
    const est = advisorEstAum.get(advisor.name) || 0;
    advisor.estimatedAum = Math.round(real + est);
    advisor.annualFee = Math.round((real + est) * (bps / 10000));
  }
  practiceData.revenue.revenuePerAdvisor.sort((a, b) => b.annualFee - a.annualFee);

  return practiceData;
}

// ═════════════════════════════════════════════════════════════════════════════
// 1. NO FSC DATA → mode "none"
// ═════════════════════════════════════════════════════════════════════════════

describe("aumCoverage — no FSC data", () => {
  it("defaults to mode none with correct estimated values", () => {
    const hh = [makeHousehold("HH1", 10), makeHousehold("HH2", 10)];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    expect(data.aumCoverage.mode).toBe("none");
    expect(data.aumCoverage.actualAum).toBe(0);
    expect(data.aumCoverage.householdsWithFsc).toBe(0);
    expect(data.aumCoverage.householdsWithoutFsc).toBe(2);
    expect(data.aumCoverage.estimatedGapAum).toBe(2 * DEFAULT_REVENUE_ASSUMPTIONS.avgAumPerHousehold);
    expect(data.aumCoverage.blendedAum).toBe(2 * DEFAULT_REVENUE_ASSUMPTIONS.avgAumPerHousehold);
    expect(data.aumCoverage.accountCount).toBe(0);
  });

  it("empty households → mode none, all values 0", () => {
    const data = buildPracticeData([], [], mockInstanceUrl);
    expect(data.aumCoverage.mode).toBe("none");
    expect(data.aumCoverage.actualAum).toBe(0);
    expect(data.aumCoverage.blendedAum).toBe(0);
    expect(data.aumCoverage.householdsWithFsc).toBe(0);
    expect(data.aumCoverage.householdsWithoutFsc).toBe(0);
  });

  it("blendedAum matches revenue.estimatedAum when no FSC", () => {
    const hh = [makeHousehold("HH1", 10), makeHousehold("HH2", 10), makeHousehold("HH3", 10)];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    expect(data.aumCoverage.blendedAum).toBe(data.revenue.estimatedAum);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 2. FULL FSC COVERAGE → mode "full"
// ═════════════════════════════════════════════════════════════════════════════

describe("aumCoverage — full FSC coverage", () => {
  it("all households with FSC data → mode full", () => {
    const hh = [makeHousehold("Alpha", 10), makeHousehold("Beta", 10)];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const aumByHousehold: Record<string, number> = {
      "001Alpha": 3_000_000,
      "001Beta": 5_000_000,
    };
    const result = applyFscOverlay(data, hh, aumByHousehold, 4);

    expect(result.aumCoverage.mode).toBe("full");
    expect(result.aumCoverage.actualAum).toBe(8_000_000);
    expect(result.aumCoverage.householdsWithFsc).toBe(2);
    expect(result.aumCoverage.householdsWithoutFsc).toBe(0);
    expect(result.aumCoverage.estimatedGapAum).toBe(0);
    expect(result.aumCoverage.blendedAum).toBe(8_000_000);
    expect(result.aumCoverage.accountCount).toBe(4);
  });

  it("revenue uses actual AUM when fully covered", () => {
    const hh = [makeHousehold("Alpha", 10), makeHousehold("Beta", 10)];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const aumByHousehold: Record<string, number> = {
      "001Alpha": 3_000_000,
      "001Beta": 5_000_000,
    };
    const result = applyFscOverlay(data, hh, aumByHousehold, 4);
    const bps = DEFAULT_REVENUE_ASSUMPTIONS.feeScheduleBps;

    expect(result.revenue.estimatedAum).toBe(8_000_000);
    expect(result.revenue.annualFeeIncome).toBe(8_000_000 * (bps / 10000));
    expect(result.revenue.monthlyFeeIncome).toBe(result.revenue.annualFeeIncome / 12);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 3. PARTIAL FSC COVERAGE → mode "partial"
// ═════════════════════════════════════════════════════════════════════════════

describe("aumCoverage — partial FSC coverage", () => {
  it("some households with FSC, some without → mode partial", () => {
    const hh = [
      makeHousehold("WithFSC", 10),
      makeHousehold("WithoutFSC", 10),
      makeHousehold("AlsoWithout", 10),
    ];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const aumByHousehold: Record<string, number> = { "001WithFSC": 4_000_000 };
    const result = applyFscOverlay(data, hh, aumByHousehold, 2);

    expect(result.aumCoverage.mode).toBe("partial");
    expect(result.aumCoverage.householdsWithFsc).toBe(1);
    expect(result.aumCoverage.householdsWithoutFsc).toBe(2);
    expect(result.aumCoverage.actualAum).toBe(4_000_000);
    expect(result.aumCoverage.estimatedGapAum).toBe(2 * DEFAULT_REVENUE_ASSUMPTIONS.avgAumPerHousehold);
    expect(result.aumCoverage.blendedAum).toBe(4_000_000 + 2 * DEFAULT_REVENUE_ASSUMPTIONS.avgAumPerHousehold);
  });

  it("blended AUM flows through to revenue calculations", () => {
    const hh = [makeHousehold("Real", 10), makeHousehold("Est", 10)];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const aumByHousehold: Record<string, number> = { "001Real": 6_000_000 };
    const result = applyFscOverlay(data, hh, aumByHousehold, 3);
    const bps = DEFAULT_REVENUE_ASSUMPTIONS.feeScheduleBps;
    const expectedBlended = 6_000_000 + DEFAULT_REVENUE_ASSUMPTIONS.avgAumPerHousehold;

    expect(result.revenue.estimatedAum).toBe(expectedBlended);
    expect(result.revenue.annualFeeIncome).toBe(expectedBlended * (bps / 10000));
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 4. ZERO-BALANCE FSC ACCOUNTS → treated as "without FSC"
// ═════════════════════════════════════════════════════════════════════════════

describe("aumCoverage — zero-balance FSC accounts", () => {
  it("zero-balance accounts are excluded from actual AUM", () => {
    const hh = [makeHousehold("HH1", 10), makeHousehold("HH2", 10)];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const aumByHousehold: Record<string, number> = {
      "001HH1": 5_000_000,
      "001HH2": 0,   // zero balance — should not count as FSC-covered
    };
    const result = applyFscOverlay(data, hh, aumByHousehold, 3);

    expect(result.aumCoverage.mode).toBe("partial");
    expect(result.aumCoverage.householdsWithFsc).toBe(1);
    expect(result.aumCoverage.householdsWithoutFsc).toBe(1);
    expect(result.aumCoverage.actualAum).toBe(5_000_000);
  });

  it("all FSC accounts zero balance → mode none", () => {
    const hh = [makeHousehold("HH1", 10), makeHousehold("HH2", 10)];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const aumByHousehold: Record<string, number> = {
      "001HH1": 0,
      "001HH2": 0,
    };
    const result = applyFscOverlay(data, hh, aumByHousehold, 2);

    expect(result.aumCoverage.mode).toBe("none");
    expect(result.aumCoverage.householdsWithFsc).toBe(0);
    expect(result.aumCoverage.actualAum).toBe(0);
    expect(result.aumCoverage.blendedAum).toBe(2 * DEFAULT_REVENUE_ASSUMPTIONS.avgAumPerHousehold);
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 5. PER-ADVISOR AUM — source-aware
// ═════════════════════════════════════════════════════════════════════════════

describe("aumCoverage — per-advisor AUM", () => {
  it("advisor with FSC household gets real AUM, advisor without gets estimated", () => {
    const hh = [
      makeHousehold("AdvisorA HH", 10, "Assigned Advisor: Marcus Rivera"),
      makeHousehold("AdvisorB HH", 10, "Assigned Advisor: Amy Sato"),
    ];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const aumByHousehold: Record<string, number> = {
      "001AdvisorAHH": 7_500_000,
    };
    const result = applyFscOverlay(data, hh, aumByHousehold, 2);

    const marcus = result.revenue.revenuePerAdvisor.find(a => a.name === "Marcus Rivera");
    const amy = result.revenue.revenuePerAdvisor.find(a => a.name === "Amy Sato");

    expect(marcus).toBeDefined();
    expect(marcus!.estimatedAum).toBe(7_500_000);

    expect(amy).toBeDefined();
    expect(amy!.estimatedAum).toBe(DEFAULT_REVENUE_ASSUMPTIONS.avgAumPerHousehold);
  });

  it("advisors are re-sorted by AUM after FSC overlay", () => {
    const hh = [
      makeHousehold("BigFSC HH", 10, "Assigned Advisor: Amy Sato"),
      makeHousehold("SmallEst HH", 10, "Assigned Advisor: Marcus Rivera"),
    ];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const aumByHousehold: Record<string, number> = {
      "001BigFSCHH": 10_000_000,
    };
    const result = applyFscOverlay(data, hh, aumByHousehold, 3);

    // Amy should be first since her FSC AUM > Marcus's estimated AUM
    expect(result.revenue.revenuePerAdvisor[0].name).toBe("Amy Sato");
  });
});

// ═════════════════════════════════════════════════════════════════════════════
// 6. REVENUE METRICS — derived from blended AUM
// ═════════════════════════════════════════════════════════════════════════════

describe("aumCoverage — revenue metrics", () => {
  it("annual fee uses blended AUM in partial mode", () => {
    const hh = [makeHousehold("R1", 10), makeHousehold("R2", 10)];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const aumByHousehold: Record<string, number> = { "001R1": 3_000_000 };
    const result = applyFscOverlay(data, hh, aumByHousehold, 1);
    const bps = DEFAULT_REVENUE_ASSUMPTIONS.feeScheduleBps;

    const expectedBlended = 3_000_000 + DEFAULT_REVENUE_ASSUMPTIONS.avgAumPerHousehold;
    expect(result.revenue.annualFeeIncome).toBe(expectedBlended * (bps / 10000));
  });

  it("monthly fee = annual / 12", () => {
    const hh = [makeHousehold("M1", 10)];
    const data = buildPracticeData([], hh, mockInstanceUrl);
    const aumByHousehold: Record<string, number> = { "001M1": 5_000_000 };
    const result = applyFscOverlay(data, hh, aumByHousehold, 2);

    expect(result.revenue.monthlyFeeIncome).toBe(result.revenue.annualFeeIncome / 12);
  });

  it("per-advisor annual fee uses correct bps", () => {
    const customBps = 100;
    const hh = [makeHousehold("Custom HH", 10, "Assigned Advisor: Marcus Rivera")];
    const data = buildPracticeData([], hh, mockInstanceUrl, { feeScheduleBps: customBps });
    const aumByHousehold: Record<string, number> = { "001CustomHH": 4_000_000 };
    const result = applyFscOverlay(data, hh, aumByHousehold, 1);

    const marcus = result.revenue.revenuePerAdvisor.find(a => a.name === "Marcus Rivera");
    expect(marcus).toBeDefined();
    expect(marcus!.annualFee).toBe(Math.round(4_000_000 * (customBps / 10000)));
  });
});
