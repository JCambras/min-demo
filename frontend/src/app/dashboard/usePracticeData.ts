"use client";
import { useState, useEffect } from "react";
import { callSF } from "@/lib/salesforce";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface SFTask {
  Id: string; Subject: string; Status: string; Priority: string;
  Description: string; CreatedDate: string; ActivityDate: string;
  What?: { Name: string; Id?: string };
}

export interface SFHousehold {
  Id: string; Name: string; CreatedDate: string; Description?: string;
}

export interface AdvisorScore {
  name: string;
  households: number;
  openTasks: number;
  overdueTasks: number;
  unsigned: number;
  compliancePct: number;
  meetingsLast90: number;
  score: number;
  dataWarning?: string;
}

export interface RiskItem {
  id: string;
  label: string;
  household: string;
  householdId: string;
  severity: "critical" | "high" | "medium";
  category: string;
  action: string;
  daysStale: number;
  url: string;
}

export interface PipelineStage {
  label: string;
  count: number;
  stuck: number;
  households: { name: string; id: string; days: number }[];
  avgDays: number;
  benchmarkDays: number;
  velocityRatio: number;
  conversionRate: number;
}

export interface RevenueData {
  estimatedAum: number;
  annualFeeIncome: number;
  monthlyFeeIncome: number;
  revenuePerAdvisor: { name: string; households: number; estimatedAum: number; annualFee: number }[];
  pipelineForecast: { totalPipelineAum: number; projectedNewAum: number; projectedNewRevenue: number };
  quarterlyTrend: { label: string; value: number }[];
}

export interface TaskSummary {
  id: string;
  subject: string;
  household: string;
  householdId: string;
  daysOld: number;
  status: string;
  priority: string;
}

export interface PracticeData {
  healthScore: number;
  healthBreakdown: { label: string; score: number; weight: number }[];
  advisors: AdvisorScore[];
  pipeline: PipelineStage[];
  risks: RiskItem[];
  totalHouseholds: number;
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  complianceReviews: number;
  meetingNotes: number;
  unsigned: number;
  revenue: RevenueData;
  assumptions: RevenueAssumptions;
  weeklyComparison: { label: string; thisWeek: number; lastWeek: number }[];
  instanceUrl: string;
  // Detail drawer data: actual items behind the stat counts
  openTaskItems: TaskSummary[];
  unsignedItems: TaskSummary[];
  reviewItems: TaskSummary[];
  meetingItems: TaskSummary[];
  // FSC Financial Account data (when available)
  fscAvailable: boolean;
  realAum: number | null;        // null = FSC not available, use assumptions
  aumByHousehold: Record<string, number>;
  financialAccountCount: number;
  // Internal: household name → advisor name mapping (used for FSC AUM overlay)
  hhAdvisorMap: Map<string, string>;
}

// ─── Constants ───────────────────────────────────────────────────────────────

export const KNOWN_ADVISORS = ["Jon Cambras", "Marcus Rivera", "Diane Rivera", "James Wilder", "Amy Sato", "Kevin Trịnh", "Michelle Osei"];

export interface RevenueAssumptions {
  avgAumPerHousehold: number;
  feeScheduleBps: number;
  pipelineConversionRate: number;
  pipelineAvgAum: number;
}

export const DEFAULT_REVENUE_ASSUMPTIONS: RevenueAssumptions = {
  avgAumPerHousehold: 2_000_000,
  feeScheduleBps: 85,
  pipelineConversionRate: 0.65,
  pipelineAvgAum: 1_500_000,
};

/** @deprecated Use DEFAULT_REVENUE_ASSUMPTIONS — kept for backward compat */
export const REVENUE_ASSUMPTIONS = DEFAULT_REVENUE_ASSUMPTIONS;

// ─── Advisor Assignment ──────────────────────────────────────────────────────

function getAdvisor(desc?: string): string {
  if (!desc) return "";
  const patterns = [
    /Assigned Advisor:\s*(.+)/i, /Advisor Name:\s*(.+)/i, /Advisor:\s*(.+)/i,
    /Rep(?:resentative)?:\s*(.+)/i, /Assigned To:\s*(.+)/i,
  ];
  for (const pat of patterns) {
    const m = desc.match(pat);
    if (m) { const name = m[1].split("\n")[0].trim(); if (name) return name; }
  }
  return "";
}

function assignDemoAdvisors(households: SFHousehold[]): Map<string, string> {
  const assignments = new Map<string, string>();
  let rrIdx = 0;
  for (const h of households) {
    const parsed = getAdvisor(h.Description);
    if (parsed) { assignments.set(h.Name, parsed); }
    else { assignments.set(h.Name, KNOWN_ADVISORS[rrIdx % KNOWN_ADVISORS.length]); rrIdx++; }
  }
  return assignments;
}

// ─── Revenue Builder ─────────────────────────────────────────────────────────

function buildRevenueData(households: SFHousehold[], pipeline: PipelineStage[], advisorMap: Map<string, string>, assumptions: RevenueAssumptions): RevenueData {
  const { avgAumPerHousehold, feeScheduleBps, pipelineConversionRate, pipelineAvgAum } = assumptions;
  const estimatedAum = households.length * avgAumPerHousehold;
  const annualFeeIncome = estimatedAum * (feeScheduleBps / 10000);
  const monthlyFeeIncome = annualFeeIncome / 12;

  const advHouseholds = new Map<string, number>();
  for (const h of households) {
    const adv = advisorMap.get(h.Name) || "Unassigned";
    advHouseholds.set(adv, (advHouseholds.get(adv) || 0) + 1);
  }
  const revenuePerAdvisor = Array.from(advHouseholds.entries())
    .map(([name, count]) => ({ name, households: count, estimatedAum: count * avgAumPerHousehold, annualFee: count * avgAumPerHousehold * (feeScheduleBps / 10000) }))
    .sort((a, b) => b.annualFee - a.annualFee);

  const totalInPipeline = pipeline.reduce((sum, s) => sum + s.count, 0);
  const totalPipelineAum = totalInPipeline * pipelineAvgAum;
  const projectedNewAum = totalPipelineAum * pipelineConversionRate;
  const projectedNewRevenue = projectedNewAum * (feeScheduleBps / 10000);

  const now = Date.now();
  const msQuarter = 90 * 86400000;
  const quarters = ["Q-3", "Q-2", "Q-1", "Current"];
  const quarterlyTrend = quarters.map((label, i) => {
    const quarterEnd = now - (3 - i) * msQuarter;
    const hhInPeriod = households.filter(h => new Date(h.CreatedDate).getTime() <= quarterEnd).length;
    return { label, value: Math.round(hhInPeriod * avgAumPerHousehold * (feeScheduleBps / 10000) / 1000) };
  });

  return { estimatedAum, annualFeeIncome, monthlyFeeIncome, revenuePerAdvisor, pipelineForecast: { totalPipelineAum, projectedNewAum, projectedNewRevenue }, quarterlyTrend };
}

// ─── Practice Data Builder ───────────────────────────────────────────────────

export function buildPracticeData(tasks: SFTask[], households: SFHousehold[], instanceUrl: string, overrides?: Partial<RevenueAssumptions>): PracticeData {
  const assumptions: RevenueAssumptions = { ...DEFAULT_REVENUE_ASSUMPTIONS, ...overrides };
  const now = Date.now();
  const msDay = 86400000;
  const daysSince = (d: string) => Math.floor((now - new Date(d).getTime()) / msDay);
  const thisWeek = (d: string) => daysSince(d) <= 7;
  const lastWeek = (d: string) => { const ds = daysSince(d); return ds > 7 && ds <= 14; };

  const open = tasks.filter(t => t.Status !== "Completed");
  const completed = tasks.filter(t => t.Status === "Completed");
  const compReviews = tasks.filter(t => t.Subject?.includes("COMPLIANCE REVIEW"));
  const meetingNotes = tasks.filter(t => t.Subject?.includes("MEETING NOTE"));
  const unsigned = open.filter(t => t.Subject?.includes("SEND DOCU") || t.Subject?.includes("DocuSign"));
  const overdue = open.filter(t => t.ActivityDate && new Date(t.ActivityDate).getTime() < now);

  const reviewedSet = new Set<string>();
  compReviews.forEach(t => { if (t.What?.Name) reviewedSet.add(t.What.Name); });
  const metLast90 = new Set<string>();
  meetingNotes.forEach(t => { if (daysSince(t.CreatedDate) <= 90 && t.What?.Name) metLast90.add(t.What.Name); });

  // Health Score
  const complianceCoverage = households.length > 0 ? reviewedSet.size / households.length : 1;
  const docusignVelocity = unsigned.length === 0 ? 1 : Math.max(0, 1 - unsigned.filter(t => daysSince(t.CreatedDate) > 7).length / Math.max(unsigned.length, 1));
  const taskOnTime = completed.length > 0 ? 1 - Math.min(overdue.length / Math.max(open.length + completed.length, 1), 1) : 1;
  const meetingCoverage = households.length > 0 ? metLast90.size / households.length : 1;

  const healthBreakdown = [
    { label: "Compliance Coverage", score: Math.round(complianceCoverage * 100), weight: 30 },
    { label: "DocuSign Velocity", score: Math.round(docusignVelocity * 100), weight: 25 },
    { label: "Tasks On Time", score: Math.round(taskOnTime * 100), weight: 25 },
    { label: "Meeting Coverage (90d)", score: Math.round(meetingCoverage * 100), weight: 20 },
  ];
  const healthScore = Math.round(healthBreakdown.reduce((s, b) => s + b.score * b.weight / 100, 0));

  // Advisor Scoreboard
  const advisorMap = new Map<string, { households: Set<string>; openTasks: number; overdue: number; unsigned: number; reviewed: Set<string>; meetings90: Set<string> }>();
  for (const adv of KNOWN_ADVISORS) { advisorMap.set(adv, { households: new Set(), openTasks: 0, overdue: 0, unsigned: 0, reviewed: new Set(), meetings90: new Set() }); }
  const hhAdvisorMap = assignDemoAdvisors(households);
  for (const h of households) {
    const adv = hhAdvisorMap.get(h.Name) || "Unassigned";
    if (!advisorMap.has(adv)) advisorMap.set(adv, { households: new Set(), openTasks: 0, overdue: 0, unsigned: 0, reviewed: new Set(), meetings90: new Set() });
    advisorMap.get(adv)!.households.add(h.Name);
  }
  for (const t of tasks) {
    const hhName = t.What?.Name;
    if (!hhName) continue;
    let advName = "Unassigned";
    for (const [name, data] of advisorMap) { if (data.households.has(hhName)) { advName = name; break; } }
    if (!advisorMap.has(advName)) advisorMap.set(advName, { households: new Set(), openTasks: 0, overdue: 0, unsigned: 0, reviewed: new Set(), meetings90: new Set() });
    const ad = advisorMap.get(advName)!;
    if (t.Status !== "Completed") {
      ad.openTasks++;
      if (t.ActivityDate && new Date(t.ActivityDate).getTime() < now) ad.overdue++;
      if (t.Subject?.includes("SEND DOCU") || t.Subject?.includes("DocuSign")) ad.unsigned++;
    }
    if (t.Subject?.includes("COMPLIANCE REVIEW")) ad.reviewed.add(hhName);
    if (t.Subject?.includes("MEETING NOTE") && daysSince(t.CreatedDate) <= 90) ad.meetings90.add(hhName);
  }
  const advisors: AdvisorScore[] = Array.from(advisorMap.entries())
    .filter(([name]) => name !== "Unassigned" || advisorMap.get(name)!.households.size > 0)
    .map(([name, d]) => {
      const compPct = d.households.size > 0 ? Math.round(d.reviewed.size / d.households.size * 100) : 100;
      const advScore = Math.round((compPct * 0.3) + (Math.max(0, 100 - d.overdue * 20) * 0.3) + (Math.max(0, 100 - d.unsigned * 15) * 0.2) + (d.households.size > 0 ? d.meetings90.size / d.households.size * 100 * 0.2 : 100 * 0.2));
      let dataWarning: string | undefined;
      if (d.households.size > 0 && d.meetings90.size === 0 && d.openTasks === 0) dataWarning = "No activity logged — may indicate missing data rather than inactivity";
      else if (d.households.size >= 2 && d.meetings90.size === 0) dataWarning = "0 meetings in 90 days — verify data completeness";
      return { name, households: d.households.size, openTasks: d.openTasks, overdueTasks: d.overdue, unsigned: d.unsigned, compliancePct: compPct, meetingsLast90: d.meetings90.size, score: Math.min(advScore, 100), dataWarning };
    })
    .sort((a, b) => b.score - a.score);

  // Pipeline
  const hhTasks = new Map<string, { id: string; hasCompliance: boolean; hasDocuSent: boolean; hasDocuSigned: boolean; hasAcctOpen: boolean; hasMeeting: boolean; days: number }>();
  for (const h of households) { hhTasks.set(h.Name, { id: h.Id, hasCompliance: false, hasDocuSent: false, hasDocuSigned: false, hasAcctOpen: false, hasMeeting: false, days: daysSince(h.CreatedDate) }); }
  for (const t of tasks) {
    const hhName = t.What?.Name; if (!hhName || !hhTasks.has(hhName)) continue; const hh = hhTasks.get(hhName)!;
    if (t.Subject?.includes("COMPLIANCE REVIEW")) hh.hasCompliance = true;
    if (t.Subject?.includes("SEND DOCU") || t.Subject?.includes("DocuSign")) { hh.hasDocuSent = true; if (t.Status === "Completed") hh.hasDocuSigned = true; }
    if (t.Subject?.includes("MEETING NOTE")) hh.hasMeeting = true;
    if (t.Subject?.includes("Account opening") || t.Subject?.includes("ACCOUNT")) hh.hasAcctOpen = true;
  }
  const stages: PipelineStage[] = [
    { label: "Just Onboarded", count: 0, stuck: 0, households: [], avgDays: 0, benchmarkDays: 7, velocityRatio: 0, conversionRate: 0 },
    { label: "DocuSign Sent", count: 0, stuck: 0, households: [], avgDays: 0, benchmarkDays: 5, velocityRatio: 0, conversionRate: 0 },
    { label: "DocuSign Signed", count: 0, stuck: 0, households: [], avgDays: 0, benchmarkDays: 10, velocityRatio: 0, conversionRate: 0 },
    { label: "Compliance Done", count: 0, stuck: 0, households: [], avgDays: 0, benchmarkDays: 14, velocityRatio: 0, conversionRate: 0 },
    { label: "Fully Active", count: 0, stuck: 0, households: [], avgDays: 0, benchmarkDays: 0, velocityRatio: 0, conversionRate: 1 },
  ];
  for (const [name, hh] of hhTasks) {
    const entry = { name, id: hh.id, days: hh.days };
    if (hh.hasCompliance && hh.hasDocuSigned && hh.hasMeeting) { stages[4].count++; stages[4].households.push(entry); }
    else if (hh.hasCompliance) { stages[3].count++; if (hh.days > 14) stages[3].stuck++; stages[3].households.push(entry); }
    else if (hh.hasDocuSigned) { stages[2].count++; if (hh.days > 14) stages[2].stuck++; stages[2].households.push(entry); }
    else if (hh.hasDocuSent) { stages[1].count++; if (hh.days > 7) stages[1].stuck++; stages[1].households.push(entry); }
    else { stages[0].count++; if (hh.days > 14) stages[0].stuck++; stages[0].households.push(entry); }
  }
  for (const stage of stages) {
    if (stage.households.length > 0) {
      stage.avgDays = Math.round(stage.households.reduce((s, h) => s + h.days, 0) / stage.households.length);
      stage.velocityRatio = stage.benchmarkDays > 0 ? Math.round((stage.avgDays / stage.benchmarkDays) * 10) / 10 : 0;
    }
  }
  const totalHH = hhTasks.size || 1;
  stages[0].conversionRate = Math.round(((stages[1].count + stages[2].count + stages[3].count + stages[4].count) / totalHH) * 100);
  stages[1].conversionRate = Math.round(((stages[2].count + stages[3].count + stages[4].count) / totalHH) * 100);
  stages[2].conversionRate = Math.round(((stages[3].count + stages[4].count) / totalHH) * 100);
  stages[3].conversionRate = Math.round((stages[4].count / totalHH) * 100);

  // Risk Radar
  const risks: RiskItem[] = [];
  for (const t of unsigned) { const ds = daysSince(t.CreatedDate); if (ds >= 5) risks.push({ id: t.Id, label: `DocuSign unsigned for ${ds} days`, household: t.What?.Name || "", householdId: t.What?.Id || "", severity: ds > 10 ? "critical" : "high", category: "DocuSign", action: "Send Reminder", daysStale: ds, url: `${instanceUrl}/${t.Id}` }); }
  for (const h of households) { if (!reviewedSet.has(h.Name)) { const ds = daysSince(h.CreatedDate); if (ds >= 7) risks.push({ id: h.Id, label: `No compliance review on file`, household: h.Name, householdId: h.Id, severity: ds > 30 ? "critical" : ds > 14 ? "high" : "medium", category: "Compliance", action: "Run Review", daysStale: ds, url: `${instanceUrl}/${h.Id}` }); } }
  for (const t of overdue) { if (t.Priority === "High") { const ds = daysSince(t.ActivityDate); risks.push({ id: t.Id, label: t.Subject, household: t.What?.Name || "", householdId: t.What?.Id || "", severity: ds > 7 ? "critical" : "high", category: "Overdue Task", action: "View Task", daysStale: ds, url: `${instanceUrl}/${t.Id}` }); } }
  const lastActivityMap = new Map<string, number>();
  for (const t of tasks) { if (t.What?.Name) { lastActivityMap.set(t.What.Name, Math.max(lastActivityMap.get(t.What.Name) || 0, new Date(t.CreatedDate).getTime())); } }
  for (const h of households) { const lastAct = lastActivityMap.get(h.Name); const stale = lastAct ? Math.floor((now - lastAct) / msDay) : daysSince(h.CreatedDate); if (stale >= 30) risks.push({ id: h.Id, label: `No activity in ${stale} days`, household: h.Name, householdId: h.Id, severity: stale > 60 ? "critical" : "medium", category: "Stale Account", action: "View Family", daysStale: stale, url: `${instanceUrl}/${h.Id}` }); }
  risks.sort((a, b) => { const sev = { critical: 0, high: 1, medium: 2 }; return (sev[a.severity] - sev[b.severity]) || (b.daysStale - a.daysStale); });

  // Weekly Comparison
  const thisWeekCompleted = completed.filter(t => thisWeek(t.CreatedDate)).length;
  const lastWeekCompleted = completed.filter(t => lastWeek(t.CreatedDate)).length;
  const thisWeekOnboarded = households.filter(h => thisWeek(h.CreatedDate)).length;
  const lastWeekOnboarded = households.filter(h => lastWeek(h.CreatedDate)).length;
  const thisWeekReviews = compReviews.filter(t => thisWeek(t.CreatedDate)).length;
  const lastWeekReviews = compReviews.filter(t => lastWeek(t.CreatedDate)).length;
  const thisWeekSigned = completed.filter(t => thisWeek(t.CreatedDate) && (t.Subject?.includes("DocuSign") || t.Subject?.includes("SEND DOCU"))).length;
  const lastWeekSigned = completed.filter(t => lastWeek(t.CreatedDate) && (t.Subject?.includes("DocuSign") || t.Subject?.includes("SEND DOCU"))).length;

  const revenue = buildRevenueData(households, stages, hhAdvisorMap, assumptions);

  // Detail drawer items: actual task lists behind the stat counts
  const toSummary = (t: SFTask): TaskSummary => ({
    id: t.Id, subject: t.Subject, household: t.What?.Name || "", householdId: t.What?.Id || "",
    daysOld: daysSince(t.CreatedDate), status: t.Status, priority: t.Priority,
  });
  const openTaskItems = open.sort((a, b) => daysSince(b.CreatedDate) - daysSince(a.CreatedDate)).slice(0, 10).map(toSummary);
  const unsignedItems = unsigned.sort((a, b) => daysSince(b.CreatedDate) - daysSince(a.CreatedDate)).slice(0, 10).map(toSummary);
  const reviewItems = compReviews.sort((a, b) => daysSince(a.CreatedDate) - daysSince(b.CreatedDate)).slice(0, 10).map(toSummary);
  const meetingItems = meetingNotes.sort((a, b) => daysSince(a.CreatedDate) - daysSince(b.CreatedDate)).slice(0, 10).map(toSummary);

  return {
    healthScore, healthBreakdown, advisors, pipeline: stages, risks: risks.slice(0, 30),
    totalHouseholds: households.length, totalTasks: tasks.length, completedTasks: completed.length, openTasks: open.length,
    complianceReviews: compReviews.length, meetingNotes: meetingNotes.length, unsigned: unsigned.length,
    revenue, assumptions,
    openTaskItems, unsignedItems, reviewItems, meetingItems,
    fscAvailable: false, realAum: null, aumByHousehold: {}, financialAccountCount: 0,
    hhAdvisorMap,
    weeklyComparison: [
      { label: "Tasks Completed", thisWeek: thisWeekCompleted, lastWeek: lastWeekCompleted },
      { label: "Onboarded", thisWeek: thisWeekOnboarded, lastWeek: lastWeekOnboarded },
      { label: "Compliance Reviews", thisWeek: thisWeekReviews, lastWeek: lastWeekReviews },
      { label: "DocuSign Signed", thisWeek: thisWeekSigned, lastWeek: lastWeekSigned },
    ],
    instanceUrl,
  };
}

// ─── Firm Config Parser ──────────────────────────────────────────────────────
// Parses revenue assumptions from household descriptions.
// Format in any household Description: "Revenue Config: avgAum=3000000 bps=90 conversion=0.70 pipelineAum=2000000"
// In production, this would be a SF Custom Setting or Custom Metadata Type.

function parseFirmConfig(households: SFHousehold[]): Partial<RevenueAssumptions> {
  for (const h of households) {
    const desc = h.Description || "";
    const match = desc.match(/Revenue Config:\s*(.+)/i);
    if (!match) continue;
    const config = match[1];
    const overrides: Partial<RevenueAssumptions> = {};
    const avgAum = config.match(/avgAum=(\d+)/);
    if (avgAum) overrides.avgAumPerHousehold = parseInt(avgAum[1]);
    const bps = config.match(/bps=(\d+)/);
    if (bps) overrides.feeScheduleBps = parseInt(bps[1]);
    const conv = config.match(/conversion=([\d.]+)/);
    if (conv) overrides.pipelineConversionRate = parseFloat(conv[1]);
    const pAum = config.match(/pipelineAum=(\d+)/);
    if (pAum) overrides.pipelineAvgAum = parseInt(pAum[1]);
    return overrides;
  }
  return {};
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function usePracticeData() {
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PracticeData | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await callSF("queryTasks", { limit: 200 });
        if (res.success) {
          const households = res.households as SFHousehold[];
          const firmOverrides = parseFirmConfig(households);
          const practiceData = buildPracticeData(res.tasks as SFTask[], households, res.instanceUrl as string, firmOverrides);

          // Try to get real AUM from FSC FinancialAccounts
          try {
            const fscRes = await callSF("queryFinancialAccounts", {});
            if (fscRes.success && fscRes.fscAvailable) {
              practiceData.fscAvailable = true;
              practiceData.realAum = fscRes.totalAum as number;
              practiceData.aumByHousehold = (fscRes.aumByHousehold as Record<string, number>) || {};
              practiceData.financialAccountCount = (fscRes.count as number) || 0;

              // Override revenue with real AUM if available and non-zero
              if (practiceData.realAum > 0) {
                const bps = practiceData.assumptions.feeScheduleBps;
                practiceData.revenue.estimatedAum = practiceData.realAum;
                practiceData.revenue.annualFeeIncome = practiceData.realAum * (bps / 10000);
                practiceData.revenue.monthlyFeeIncome = practiceData.revenue.annualFeeIncome / 12;

                // Build advisor → real AUM using household-level data.
                // aumByHousehold is keyed by SF Account Id.
                // hhAdvisorMap is keyed by household Name.
                // We need Name→Id to bridge them.
                const hhNameToId = new Map<string, string>();
                for (const h of households) { hhNameToId.set(h.Name, h.Id); }

                const advisorRealAum = new Map<string, number>();
                for (const [hhName, advName] of practiceData.hhAdvisorMap) {
                  const hhId = hhNameToId.get(hhName);
                  if (!hhId) continue;
                  const hhAum = practiceData.aumByHousehold[hhId] || 0;
                  advisorRealAum.set(advName, (advisorRealAum.get(advName) || 0) + hhAum);
                }

                for (const advisor of practiceData.revenue.revenuePerAdvisor) {
                  const realAum = advisorRealAum.get(advisor.name);
                  if (realAum !== undefined) {
                    advisor.estimatedAum = Math.round(realAum);
                    advisor.annualFee = Math.round(realAum * (bps / 10000));
                  }
                }
                // Re-sort by actual AUM
                practiceData.revenue.revenuePerAdvisor.sort((a, b) => b.annualFee - a.annualFee);
              }
            }
          } catch {
            // FSC query failed — continue with assumption-based data
          }

          setData(practiceData);
        } else { setError("Could not connect to Salesforce."); }
      } catch { setError("Failed to load dashboard data."); }
      setLoading(false);
    })();
  }, []);

  return { loading, data, error };
}
