"use client";
import { useState, useEffect } from "react";
import { Loader2, Users, Shield, MessageSquare, CheckCircle, AlertTriangle, Clock, TrendingUp, TrendingDown, Send, Download, Activity, DollarSign, BarChart3 } from "lucide-react";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { callSF } from "@/lib/salesforce";
import type { Screen, WorkflowContext } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface SFTask {
  Id: string; Subject: string; Status: string; Priority: string;
  Description: string; CreatedDate: string; ActivityDate: string;
  What?: { Name: string; Id?: string };
}

interface SFHousehold {
  Id: string; Name: string; CreatedDate: string; Description?: string;
}

// Known demo advisors for round-robin assignment when Description doesn't have explicit advisor
const KNOWN_ADVISORS = ["Jon Cambras", "Marcus Rivera", "Diane Rivera", "James Wilder", "Amy Sato", "Kevin Trịnh", "Michelle Osei"];

// Advisor assignment: parsed from household Description — handles multiple formats
function getAdvisor(desc?: string): string {
  if (!desc) return "";
  // Try multiple patterns: "Assigned Advisor: X", "Advisor: X", "Rep: X", "Advisor Name: X"
  const patterns = [
    /Assigned Advisor:\s*(.+)/i,
    /Advisor Name:\s*(.+)/i,
    /Advisor:\s*(.+)/i,
    /Rep(?:resentative)?:\s*(.+)/i,
    /Assigned To:\s*(.+)/i,
  ];
  for (const pat of patterns) {
    const m = desc.match(pat);
    if (m) {
      // Extract just the first line (stop at newline)
      const name = m[1].split("\n")[0].trim();
      if (name) return name;
    }
  }
  return "";
}

// For demo: distribute unassigned households round-robin across known advisors
function assignDemoAdvisors(households: SFHousehold[]): Map<string, string> {
  const assignments = new Map<string, string>();
  let rrIdx = 0;
  for (const h of households) {
    const parsed = getAdvisor(h.Description);
    if (parsed) {
      assignments.set(h.Name, parsed);
    } else {
      // Round-robin across known advisors
      assignments.set(h.Name, KNOWN_ADVISORS[rrIdx % KNOWN_ADVISORS.length]);
      rrIdx++;
    }
  }
  return assignments;
}

function classifyTask(s: string): "compliance" | "docusign" | "meeting" | "followup" | "kyc" | "task" {
  const u = s.toUpperCase();
  if (u.includes("COMPLIANCE REVIEW")) return "compliance";
  if (u.includes("DOCU") || u.includes("DOCUSIGN")) return "docusign";
  if (u.includes("MEETING NOTE")) return "meeting";
  if (u.includes("FOLLOW-UP")) return "followup";
  if (u.includes("KYC") || u.includes("COMPLETENESS")) return "kyc";
  return "task";
}

// ─── Analytics Engine ────────────────────────────────────────────────────────

interface AdvisorScore {
  name: string;
  households: number;
  openTasks: number;
  overdueTasks: number;
  unsigned: number;
  compliancePct: number;
  meetingsLast90: number;
  score: number; // 0-100
  dataWarning?: string; // e.g. "0 meetings logged — may indicate missing data"
}

interface RiskItem {
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

interface PipelineStage {
  label: string;
  count: number;
  stuck: number;
  households: { name: string; id: string; days: number }[];
  // Velocity metrics
  avgDays: number;        // Average days households spend in this stage
  benchmarkDays: number;  // Expected days (benchmark)
  velocityRatio: number;  // avgDays / benchmarkDays — >1 means slower than normal
  conversionRate: number; // % that moved past this stage
}

interface PracticeData {
  healthScore: number;
  healthBreakdown: { label: string; score: number; weight: number }[];
  advisors: AdvisorScore[];
  pipeline: PipelineStage[];
  risks: RiskItem[];
  // Summary stats
  totalHouseholds: number;
  totalTasks: number;
  completedTasks: number;
  openTasks: number;
  complianceReviews: number;
  meetingNotes: number;
  unsigned: number;
  // Revenue intelligence
  revenue: RevenueData;
  // Weekly comparison
  weeklyComparison: { label: string; thisWeek: number; lastWeek: number }[];
  instanceUrl: string;
}

// ─── Revenue Intelligence ──────────────────────────────────────────────────
//
// Revenue is the #1 gap Michael Grossman identified: "Where's the money?"
// Since standard SF objects don't carry AUM, we estimate from household data
// using configurable assumptions. This is "paired modeling" — sensible defaults
// that firms customize to match their fee schedule.

const REVENUE_ASSUMPTIONS = {
  avgAumPerHousehold: 2_000_000,  // $2M average — typical for $420M/210HH firm
  feeScheduleBps: 85,              // 85 basis points (0.85%) — blended advisory fee
  pipelineConversionRate: 0.65,    // 65% of pipeline converts
  pipelineAvgAum: 1_500_000,       // New clients tend to start smaller
};

interface RevenueData {
  estimatedAum: number;           // Total estimated AUM
  annualFeeIncome: number;        // Estimated annual fee income
  monthlyFeeIncome: number;       // Monthly
  revenuePerAdvisor: { name: string; households: number; estimatedAum: number; annualFee: number }[];
  pipelineForecast: {
    totalPipelineAum: number;     // Raw pipeline value
    projectedNewAum: number;      // After conversion rate
    projectedNewRevenue: number;  // Annual fee from new AUM
  };
  quarterlyTrend: { label: string; value: number }[];  // 4-quarter estimated trend
}

function buildRevenueData(households: SFHousehold[], pipeline: PipelineStage[], advisorMap: Map<string, string>): RevenueData {
  const { avgAumPerHousehold, feeScheduleBps, pipelineConversionRate, pipelineAvgAum } = REVENUE_ASSUMPTIONS;

  const estimatedAum = households.length * avgAumPerHousehold;
  const annualFeeIncome = estimatedAum * (feeScheduleBps / 10000);
  const monthlyFeeIncome = annualFeeIncome / 12;

  // Revenue per advisor
  const advHouseholds = new Map<string, number>();
  for (const h of households) {
    const adv = advisorMap.get(h.Name) || "Unassigned";
    advHouseholds.set(adv, (advHouseholds.get(adv) || 0) + 1);
  }
  const revenuePerAdvisor = Array.from(advHouseholds.entries())
    .map(([name, count]) => ({
      name,
      households: count,
      estimatedAum: count * avgAumPerHousehold,
      annualFee: count * avgAumPerHousehold * (feeScheduleBps / 10000),
    }))
    .sort((a, b) => b.annualFee - a.annualFee);

  // Pipeline forecast from pipeline stages
  const totalInPipeline = pipeline.reduce((sum, s) => sum + s.count, 0);
  const totalPipelineAum = totalInPipeline * pipelineAvgAum;
  const projectedNewAum = totalPipelineAum * pipelineConversionRate;
  const projectedNewRevenue = projectedNewAum * (feeScheduleBps / 10000);

  // Simulated quarterly trend (based on household onboarding dates)
  const now = Date.now();
  const msQuarter = 90 * 86400000;
  const quarters = ["Q-3", "Q-2", "Q-1", "Current"];
  const quarterlyTrend = quarters.map((label, i) => {
    const quarterEnd = now - (3 - i) * msQuarter;
    const hhInPeriod = households.filter(h => new Date(h.CreatedDate).getTime() <= quarterEnd).length;
    return { label, value: Math.round(hhInPeriod * avgAumPerHousehold * (feeScheduleBps / 10000) / 1000) }; // in $K
  });

  return {
    estimatedAum,
    annualFeeIncome,
    monthlyFeeIncome,
    revenuePerAdvisor,
    pipelineForecast: { totalPipelineAum, projectedNewAum, projectedNewRevenue },
    quarterlyTrend,
  };
}

function buildPracticeData(tasks: SFTask[], households: SFHousehold[], instanceUrl: string): PracticeData {
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

  // Reviewed households
  const reviewedSet = new Set<string>();
  compReviews.forEach(t => { if (t.What?.Name) reviewedSet.add(t.What.Name); });

  // Meeting coverage (last 90 days)
  const metLast90 = new Set<string>();
  meetingNotes.forEach(t => { if (daysSince(t.CreatedDate) <= 90 && t.What?.Name) metLast90.add(t.What.Name); });

  // ─── Health Score ───
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

  // ─── Advisor Scoreboard ───
  const advisorMap = new Map<string, { households: Set<string>; openTasks: number; overdue: number; unsigned: number; reviewed: Set<string>; meetings90: Set<string> }>();
  
  // Pre-populate all known advisors so they appear even with 0 households
  for (const adv of KNOWN_ADVISORS) {
    advisorMap.set(adv, { households: new Set(), openTasks: 0, overdue: 0, unsigned: 0, reviewed: new Set(), meetings90: new Set() });
  }

  // Use smart assignment: parses Description, round-robins unassigned
  const hhAdvisorMap = assignDemoAdvisors(households);

  for (const h of households) {
    const adv = hhAdvisorMap.get(h.Name) || "Unassigned";
    if (!advisorMap.has(adv)) advisorMap.set(adv, { households: new Set(), openTasks: 0, overdue: 0, unsigned: 0, reviewed: new Set(), meetings90: new Set() });
    advisorMap.get(adv)!.households.add(h.Name);
  }

  // Assign tasks to advisors via household
  for (const t of tasks) {
    const hhName = t.What?.Name;
    if (!hhName) continue;
    let advName = "Unassigned";
    for (const [name, data] of advisorMap) {
      if (data.households.has(hhName)) { advName = name; break; }
    }
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
      // Data quality warning: advisor with households but 0 meetings and 0 completed tasks
      let dataWarning: string | undefined;
      if (d.households.size > 0 && d.meetings90.size === 0 && d.openTasks === 0) {
        dataWarning = "No activity logged — may indicate missing data rather than inactivity";
      } else if (d.households.size >= 2 && d.meetings90.size === 0) {
        dataWarning = "0 meetings in 90 days — verify data completeness";
      }
      return { name, households: d.households.size, openTasks: d.openTasks, overdueTasks: d.overdue, unsigned: d.unsigned, compliancePct: compPct, meetingsLast90: d.meetings90.size, score: Math.min(advScore, 100), dataWarning };
    })
    .sort((a, b) => b.score - a.score);

  // ─── Pipeline Stages ───
  // Determine stage for each household based on tasks
  const hhTasks = new Map<string, { id: string; hasCompliance: boolean; hasDocuSent: boolean; hasDocuSigned: boolean; hasAcctOpen: boolean; hasMeeting: boolean; days: number }>();
  for (const h of households) {
    hhTasks.set(h.Name, { id: h.Id, hasCompliance: false, hasDocuSent: false, hasDocuSigned: false, hasAcctOpen: false, hasMeeting: false, days: daysSince(h.CreatedDate) });
  }
  for (const t of tasks) {
    const hhName = t.What?.Name;
    if (!hhName || !hhTasks.has(hhName)) continue;
    const hh = hhTasks.get(hhName)!;
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

  // Compute velocity metrics per stage
  for (const stage of stages) {
    if (stage.households.length > 0) {
      stage.avgDays = Math.round(stage.households.reduce((s, h) => s + h.days, 0) / stage.households.length);
      stage.velocityRatio = stage.benchmarkDays > 0 ? Math.round((stage.avgDays / stage.benchmarkDays) * 10) / 10 : 0;
    }
  }
  // Conversion rate: % of all households that progressed past each stage
  const totalHH = hhTasks.size || 1;
  stages[0].conversionRate = Math.round(((stages[1].count + stages[2].count + stages[3].count + stages[4].count) / totalHH) * 100);
  stages[1].conversionRate = Math.round(((stages[2].count + stages[3].count + stages[4].count) / totalHH) * 100);
  stages[2].conversionRate = Math.round(((stages[3].count + stages[4].count) / totalHH) * 100);
  stages[3].conversionRate = Math.round((stages[4].count / totalHH) * 100);

  // ─── Risk Radar ───
  const risks: RiskItem[] = [];

  // Unsigned > 5 days
  for (const t of unsigned) {
    const ds = daysSince(t.CreatedDate);
    if (ds >= 5) risks.push({
      id: t.Id, label: `DocuSign unsigned for ${ds} days`, household: t.What?.Name || "", householdId: t.What?.Id || "",
      severity: ds > 10 ? "critical" : "high", category: "DocuSign", action: "Send Reminder", daysStale: ds, url: `${instanceUrl}/${t.Id}`,
    });
  }
  // Missing compliance
  for (const h of households) {
    if (!reviewedSet.has(h.Name)) {
      const ds = daysSince(h.CreatedDate);
      if (ds >= 7) risks.push({
        id: h.Id, label: `No compliance review on file`, household: h.Name, householdId: h.Id,
        severity: ds > 30 ? "critical" : ds > 14 ? "high" : "medium", category: "Compliance", action: "Run Review", daysStale: ds, url: `${instanceUrl}/${h.Id}`,
      });
    }
  }
  // High-priority overdue
  for (const t of overdue) {
    if (t.Priority === "High") {
      const ds = daysSince(t.ActivityDate);
      risks.push({
        id: t.Id, label: t.Subject, household: t.What?.Name || "", householdId: t.What?.Id || "",
        severity: ds > 7 ? "critical" : "high", category: "Overdue Task", action: "View Task", daysStale: ds, url: `${instanceUrl}/${t.Id}`,
      });
    }
  }
  // No activity 30+ days
  const lastActivityMap = new Map<string, number>();
  for (const t of tasks) {
    if (t.What?.Name) {
      const existing = lastActivityMap.get(t.What.Name) || 0;
      lastActivityMap.set(t.What.Name, Math.max(existing, new Date(t.CreatedDate).getTime()));
    }
  }
  for (const h of households) {
    const lastAct = lastActivityMap.get(h.Name);
    const stale = lastAct ? Math.floor((now - lastAct) / msDay) : daysSince(h.CreatedDate);
    if (stale >= 30) risks.push({
      id: h.Id, label: `No activity in ${stale} days`, household: h.Name, householdId: h.Id,
      severity: stale > 60 ? "critical" : "medium", category: "Stale Account", action: "View Family", daysStale: stale, url: `${instanceUrl}/${h.Id}`,
    });
  }

  risks.sort((a, b) => {
    const sev = { critical: 0, high: 1, medium: 2 };
    return (sev[a.severity] - sev[b.severity]) || (b.daysStale - a.daysStale);
  });

  // ─── Weekly Comparison ───
  const thisWeekCompleted = completed.filter(t => thisWeek(t.CreatedDate)).length;
  const lastWeekCompleted = completed.filter(t => lastWeek(t.CreatedDate)).length;
  const thisWeekOnboarded = households.filter(h => thisWeek(h.CreatedDate)).length;
  const lastWeekOnboarded = households.filter(h => lastWeek(h.CreatedDate)).length;
  const thisWeekReviews = compReviews.filter(t => thisWeek(t.CreatedDate)).length;
  const lastWeekReviews = compReviews.filter(t => lastWeek(t.CreatedDate)).length;
  const thisWeekSigned = completed.filter(t => thisWeek(t.CreatedDate) && (t.Subject?.includes("DocuSign") || t.Subject?.includes("SEND DOCU"))).length;
  const lastWeekSigned = completed.filter(t => lastWeek(t.CreatedDate) && (t.Subject?.includes("DocuSign") || t.Subject?.includes("SEND DOCU"))).length;

  // ─── Revenue Intelligence ───
  const revenue = buildRevenueData(households, stages, hhAdvisorMap);

  return {
    healthScore, healthBreakdown, advisors, pipeline: stages,
    risks: risks.slice(0, 30),
    totalHouseholds: households.length, totalTasks: tasks.length,
    completedTasks: completed.length, openTasks: open.length,
    complianceReviews: compReviews.length, meetingNotes: meetingNotes.length,
    unsigned: unsigned.length,
    revenue,
    weeklyComparison: [
      { label: "Tasks Completed", thisWeek: thisWeekCompleted, lastWeek: lastWeekCompleted },
      { label: "Onboarded", thisWeek: thisWeekOnboarded, lastWeek: lastWeekOnboarded },
      { label: "Compliance Reviews", thisWeek: thisWeekReviews, lastWeek: lastWeekReviews },
      { label: "DocuSign Signed", thisWeek: thisWeekSigned, lastWeek: lastWeekSigned },
    ],
    instanceUrl,
  };
}

// ─── Health Score Ring ───────────────────────────────────────────────────────

function HealthRing({ score }: { score: number }) {
  const r = 80, cx = 100, cy = 100, stroke = 12;
  const circ = 2 * Math.PI * r;
  const offset = circ * (1 - score / 100);
  const color = score >= 80 ? "#22c55e" : score >= 60 ? "#f59e0b" : "#ef4444";
  const bg = score >= 80 ? "from-green-50 to-emerald-50" : score >= 60 ? "from-amber-50 to-orange-50" : "from-red-50 to-rose-50";

  return (
    <div className={`relative flex items-center justify-center w-[200px] h-[200px] rounded-full bg-gradient-to-br ${bg}`}>
      <svg width="200" height="200" viewBox="0 0 200 200" className="absolute">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e2e8f0" strokeWidth={stroke} />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke={color} strokeWidth={stroke}
          strokeLinecap="round" strokeDasharray={circ} strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cy})`}
          className="transition-all duration-1000 ease-out" />
      </svg>
      <div className="text-center z-10">
        <p className="text-5xl font-light" style={{ color }}>{score}</p>
        <p className="text-xs text-slate-400 mt-1 font-medium">HEALTH</p>
      </div>
    </div>
  );
}

// ─── Delta Badge ─────────────────────────────────────────────────────────────

function Delta({ thisWeek, lastWeek }: { thisWeek: number; lastWeek: number }) {
  const diff = thisWeek - lastWeek;
  if (diff === 0) return <span className="text-xs text-slate-400">—</span>;
  const up = diff > 0;
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${up ? "text-green-600" : "text-red-500"}`}>
      {up ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
      {up ? "+" : ""}{diff}
    </span>
  );
}

// ─── Severity Badge ──────────────────────────────────────────────────────────

function SeverityBadge({ severity }: { severity: string }) {
  const styles: Record<string, string> = {
    critical: "bg-red-100 text-red-700",
    high: "bg-amber-100 text-amber-700",
    medium: "bg-slate-100 text-slate-600",
  };
  return <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${styles[severity] || styles.medium}`}>{severity}</span>;
}

// ─── Main Dashboard ──────────────────────────────────────────────────────────

export function DashboardScreen({ onExit, onNavigate, firmName, role, advisorName }: {
  onExit: () => void;
  onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void;
  firmName?: string;
  role?: string | null;
  advisorName?: string;
}) {
  const isAdvisor = role === "advisor";
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<PracticeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expandedPipeline, setExpandedPipeline] = useState<number | null>(null);
  const [showAllPipeline, setShowAllPipeline] = useState(false);
  const [riskFilter, setRiskFilter] = useState<"all" | "critical" | "high" | "medium">("all");
  const [showAllRisks, setShowAllRisks] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [scoreboardView, setScoreboardView] = useState<"team" | "individual" | "my">(isAdvisor ? "my" : "team");
  const [detailPanel, setDetailPanel] = useState<string | null>(null);
  const toggleDetail = (id: string) => setDetailPanel(prev => prev === id ? null : id);

  useEffect(() => {
    (async () => {
      try {
        const res = await callSF("queryTasks", { limit: 200 });
        if (res.success) {
          setData(buildPracticeData(res.tasks, res.households, res.instanceUrl));
        } else {
          setError("Could not connect to Salesforce.");
        }
      } catch {
        setError("Failed to load dashboard data.");
      }
      setLoading(false);
    })();
  }, []);

  const downloadPDF = async () => {
    if (!data) return;
    setPdfLoading(true);
    try {
      const res = await fetch("/api/pdf/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          healthScore: data.healthScore,
          healthBreakdown: data.healthBreakdown,
          advisors: data.advisors,
          pipeline: data.pipeline,
          risks: data.risks.slice(0, 10),
          weeklyComparison: data.weeklyComparison,
          totalHouseholds: data.totalHouseholds,
          openTasks: data.openTasks,
          complianceReviews: data.complianceReviews,
          unsigned: data.unsigned,
          firmName: firmName || undefined,
        }),
      });
      const result = await res.json();
      if (result.success && result.pdf) {
        const link = document.createElement("a");
        link.href = result.pdf;
        link.download = result.filename;
        link.click();
      }
    } catch { /* */ }
    setPdfLoading(false);
  };

  const goToFamily = (householdId: string, name: string) => {
    if (onNavigate) onNavigate("family" as Screen, { householdId, familyName: name.replace(" Household", "") });
  };

  const goToCompliance = (householdId: string, name: string) => {
    if (onNavigate) onNavigate("compliance", { householdId, familyName: name.replace(" Household", "") });
  };

  // Reusable detail drawer
  const DetailDrawer = ({ id, children }: { id: string; children: React.ReactNode }) =>
    detailPanel === id ? <div className="mt-2 p-4 bg-slate-50 border border-slate-200 rounded-xl animate-fade-in text-sm">{children}</div> : null;

  const ComingSoon = () => <p className="text-xs text-slate-400 italic">Detailed view coming soon — historical trends, breakdowns, and drill-through to source records.</p>;

  return (
    <div className="flex h-screen bg-[#fafafa]">
      <div className="w-full flex flex-col">
        <FlowHeader title="Practice Intelligence" familyName={undefined} stepLabel="Weekly Operations Report" progressPct={100} onBack={onExit} onShowPane={() => {}} hasIndicator={false} />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 pb-16">
          <div className="max-w-6xl w-full mx-auto">

            {loading && (
              <div className="text-center pt-16">
                <Loader2 size={36} className="animate-spin text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">Analyzing practice data from Salesforce...</p>
              </div>
            )}

            {error && (
              <div className="text-center pt-16">
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-6 text-2xl">!</div>
                <p className="text-slate-600 mb-2">{error}</p>
                <button onClick={onExit} className="text-sm text-slate-400 hover:text-slate-600">Back to Home</button>
              </div>
            )}

            {data && (
              <div className="animate-fade-in space-y-8">

                {/* ═══════════════════════════════════════════════════════════════
                    1. PRACTICE HEALTH SCORE
                ═══════════════════════════════════════════════════════════════ */}
                <div className="bg-white border border-slate-200 rounded-2xl p-8">
                  <div className="flex flex-col md:flex-row items-center gap-8">
                    {/* Ring */}
                    <HealthRing score={data.healthScore} />

                    {/* Breakdown */}
                    <div className="flex-1 w-full">
                      <div className="flex items-center justify-between mb-4">
                        <div>
                          <h2 className="text-xl font-semibold text-slate-900">Practice Health Score</h2>
                          <p className="text-sm text-slate-400 mt-0.5">Weighted composite of 4 operational metrics</p>
                        </div>
                        <button onClick={downloadPDF} disabled={pdfLoading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
                          {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                          Weekly Report
                        </button>
                      </div>
                      <div className="space-y-3">
                        {data.healthBreakdown.map((b, i) => (
                          <div key={i}>
                            <button onClick={() => toggleDetail(`health-${i}`)} className="w-full text-left hover:bg-slate-50 rounded-lg px-2 py-1 -mx-2 transition-colors">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm text-slate-600">{b.label}<span className="text-[10px] text-slate-300 ml-1.5">▾</span></span>
                                <span className="text-sm font-medium text-slate-700">{b.score}%<span className="text-xs text-slate-400 ml-1">({b.weight}% weight)</span></span>
                              </div>
                              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all duration-700 ${b.score >= 80 ? "bg-green-500" : b.score >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${b.score}%` }} />
                              </div>
                            </button>
                            <DetailDrawer id={`health-${i}`}>
                              {b.label === "Compliance Coverage" ? (
                                <div>
                                  <p className="text-xs text-slate-600 mb-1"><strong>{b.score}%</strong> of households have a completed compliance review.</p>
                                  <p className="text-xs text-slate-400">This metric is weighted at {b.weight}% of your Health Score. Improve it by running compliance reviews on remaining households.</p>
                                </div>
                              ) : b.label === "Tasks On Time" ? (
                                <div>
                                  <p className="text-xs text-slate-600 mb-1"><strong>{data.openTasks}</strong> open tasks, <strong>{b.score}%</strong> on-time rate based on overdue ratio.</p>
                                  <p className="text-xs text-slate-400">Weighted at {b.weight}%. Reduce overdue tasks to improve this score.</p>
                                </div>
                              ) : <ComingSoon />}
                            </DetailDrawer>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Quick stats row */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                  {[
                    { label: "Households", value: data.totalHouseholds, Icon: Users, color: "text-slate-600", id: "stat-hh" },
                    { label: "Open Tasks", value: data.openTasks, Icon: Clock, color: data.openTasks > 0 ? "text-amber-600" : "text-slate-600", id: "stat-open" },
                    { label: "Unsigned", value: data.unsigned, Icon: Send, color: data.unsigned > 0 ? "text-blue-600" : "text-slate-600", id: "stat-unsigned" },
                    { label: "Reviews", value: data.complianceReviews, Icon: Shield, color: "text-green-600", id: "stat-reviews" },
                    { label: "Meetings", value: data.meetingNotes, Icon: MessageSquare, color: "text-purple-600", id: "stat-meetings" },
                  ].map((s) => (
                    <div key={s.id}>
                      <button onClick={() => toggleDetail(s.id)} className="w-full bg-white border border-slate-200 rounded-xl p-4 text-center hover:border-slate-300 hover:shadow-sm transition-all">
                        <s.Icon size={16} className={`${s.color} mx-auto mb-2`} />
                        <p className={`text-2xl font-light ${s.color}`}>{s.value}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{s.label}<span className="text-slate-300 ml-0.5">▾</span></p>
                      </button>
                      <DetailDrawer id={s.id}>
                        {s.id === "stat-open" && data.openTasks > 0 ? (
                          <p className="text-xs text-slate-600">{data.openTasks} tasks are currently open across {data.totalHouseholds} households. Use the Task Manager to triage and resolve.</p>
                        ) : s.id === "stat-unsigned" && data.unsigned > 0 ? (
                          <p className="text-xs text-slate-600">{data.unsigned} DocuSign envelopes are awaiting signature. Check the pipeline for stuck items.</p>
                        ) : s.id === "stat-reviews" ? (
                          <p className="text-xs text-slate-600">{data.complianceReviews} compliance reviews completed. {data.totalHouseholds > 0 ? `${Math.round(data.complianceReviews / data.totalHouseholds * 100)}% coverage.` : ""}</p>
                        ) : <ComingSoon />}
                      </DetailDrawer>
                    </div>
                  ))}
                </div>

                {/* ═══════════════════════════════════════════════════════════════
                    1.5 REVENUE INTELLIGENCE
                ═══════════════════════════════════════════════════════════════ */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <div className="flex items-center justify-between mb-5">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Revenue Intelligence</h3>
                      <p className="text-xs text-slate-400 mt-0.5">Estimated from {data.totalHouseholds} households · {REVENUE_ASSUMPTIONS.feeScheduleBps}bps blended fee</p>
                    </div>
                    <DollarSign size={18} className="text-emerald-500" />
                  </div>

                  {/* Revenue headline cards */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
                    <button onClick={() => toggleDetail("rev-aum")} className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-4 text-left hover:shadow-sm transition-all">
                      <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wider">Est. AUM<span className="text-emerald-400 ml-0.5">▾</span></p>
                      <p className="text-2xl font-light text-emerald-700 mt-1">${(data.revenue.estimatedAum / 1_000_000).toFixed(0)}M</p>
                    </button>
                    <button onClick={() => toggleDetail("rev-fee")} className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-4 text-left hover:shadow-sm transition-all">
                      <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wider">Annual Fee Income<span className="text-emerald-400 ml-0.5">▾</span></p>
                      <p className="text-2xl font-light text-emerald-700 mt-1">${(data.revenue.annualFeeIncome / 1_000_000).toFixed(2)}M</p>
                    </button>
                    <button onClick={() => toggleDetail("rev-pipe")} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 text-left hover:shadow-sm transition-all">
                      <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wider">Pipeline AUM<span className="text-blue-400 ml-0.5">▾</span></p>
                      <p className="text-2xl font-light text-blue-700 mt-1">${(data.revenue.pipelineForecast.totalPipelineAum / 1_000_000).toFixed(1)}M</p>
                    </button>
                    <button onClick={() => toggleDetail("rev-proj")} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 text-left hover:shadow-sm transition-all">
                      <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wider">Projected New Revenue<span className="text-blue-400 ml-0.5">▾</span></p>
                      <p className="text-2xl font-light text-blue-700 mt-1">${(data.revenue.pipelineForecast.projectedNewRevenue / 1_000).toFixed(0)}K</p>
                      <p className="text-[9px] text-blue-400 mt-0.5">{Math.round(REVENUE_ASSUMPTIONS.pipelineConversionRate * 100)}% conversion</p>
                    </button>
                  </div>
                  {/* Revenue detail drawers */}
                  <DetailDrawer id="rev-aum">
                    <p className="text-xs text-slate-600">Estimated AUM = <strong>{data.totalHouseholds} households</strong> × <strong>${(REVENUE_ASSUMPTIONS.avgAumPerHousehold / 1_000_000).toFixed(1)}M</strong> average AUM per household. Customize this assumption in your firm settings to match your actual book.</p>
                  </DetailDrawer>
                  <DetailDrawer id="rev-fee">
                    <p className="text-xs text-slate-600">Annual fee income = ${(data.revenue.estimatedAum / 1_000_000).toFixed(0)}M AUM × <strong>{REVENUE_ASSUMPTIONS.feeScheduleBps} basis points</strong> blended advisory fee = <strong>${(data.revenue.monthlyFeeIncome / 1_000).toFixed(0)}K/month</strong>. Adjust fee schedule to match your tiered pricing.</p>
                  </DetailDrawer>
                  <DetailDrawer id="rev-pipe">
                    <p className="text-xs text-slate-600">Pipeline AUM = <strong>{data.pipeline.reduce((s, st) => s + st.count, 0) - (data.pipeline[data.pipeline.length - 1]?.count || 0)} active pipeline households</strong> × ${(REVENUE_ASSUMPTIONS.pipelineAvgAum / 1_000_000).toFixed(1)}M average new client AUM. See Pipeline section below for stage breakdown.</p>
                  </DetailDrawer>
                  <DetailDrawer id="rev-proj">
                    <p className="text-xs text-slate-600">Projected revenue applies a <strong>{Math.round(REVENUE_ASSUMPTIONS.pipelineConversionRate * 100)}% conversion rate</strong> to pipeline AUM, then calculates annual fees at {REVENUE_ASSUMPTIONS.feeScheduleBps}bps. This is conservative — adjust conversion rate based on your historical close rate.</p>
                  </DetailDrawer>

                  {/* Two-column: Quarterly Trend + Revenue per Advisor */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Quarterly revenue trend — mini bar chart */}
                    <div className="border border-slate-100 rounded-xl p-4">
                      <button onClick={() => toggleDetail("rev-trend")} className="w-full">
                        <div className="flex items-center gap-2 mb-3">
                          <BarChart3 size={14} className="text-slate-400" />
                          <span className="text-xs font-medium text-slate-600">Quarterly Fee Income Trend<span className="text-slate-300 ml-0.5">▾</span></span>
                        </div>
                        <div className="flex items-end gap-2 h-24">
                          {data.revenue.quarterlyTrend.map((q, i) => {
                            const max = Math.max(...data.revenue.quarterlyTrend.map(x => x.value));
                            const pct = max > 0 ? (q.value / max) * 100 : 0;
                            const isCurrent = i === data.revenue.quarterlyTrend.length - 1;
                            return (
                              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                                <span className="text-[10px] text-slate-500 font-medium">${q.value}K</span>
                                <div className={`w-full rounded-t-md transition-all duration-500 ${isCurrent ? "bg-emerald-500" : "bg-slate-200"}`} style={{ height: `${Math.max(pct, 8)}%` }} />
                                <span className="text-[9px] text-slate-400">{q.label}</span>
                              </div>
                            );
                          })}
                        </div>
                      </button>
                      <DetailDrawer id="rev-trend">
                        <p className="text-xs text-slate-600">Quarterly fee income estimated from cumulative household count at each quarter-end. Growth from Q-3 to Current reflects new household onboarding velocity. Connect actual AUM data for precise tracking.</p>
                      </DetailDrawer>
                    </div>

                    {/* Revenue per advisor */}
                    <div className="border border-slate-100 rounded-xl p-4">
                      <div className="flex items-center gap-2 mb-3">
                        <Users size={14} className="text-slate-400" />
                        <span className="text-xs font-medium text-slate-600">Revenue by Advisor</span>
                      </div>
                      <div className="space-y-2">
                        {data.revenue.revenuePerAdvisor.slice(0, 5).map((a, i) => {
                          const maxFee = data.revenue.revenuePerAdvisor[0]?.annualFee || 1;
                          return (
                            <div key={i}>
                              <button onClick={() => toggleDetail(`rev-adv-${i}`)} className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-lg p-1 -mx-1 transition-colors">
                                <span className="text-xs text-slate-600 w-28 truncate text-left">{a.name}<span className="text-slate-300 ml-0.5">▾</span></span>
                                <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                                  <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${(a.annualFee / maxFee) * 100}%` }} />
                                </div>
                                <span className="text-xs font-medium text-slate-700 w-16 text-right">${(a.annualFee / 1_000).toFixed(0)}K</span>
                              </button>
                              <DetailDrawer id={`rev-adv-${i}`}>
                                <p className="text-xs text-slate-600"><strong>{a.name}</strong>: {a.households} households × ${(REVENUE_ASSUMPTIONS.avgAumPerHousehold / 1_000_000).toFixed(1)}M avg = ${(a.estimatedAum / 1_000_000).toFixed(1)}M AUM → <strong>${(a.annualFee / 1_000).toFixed(0)}K/year</strong> in fees ({Math.round(a.annualFee / (data.revenue.annualFeeIncome || 1) * 100)}% of firm total).</p>
                              </DetailDrawer>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                </div>

                {/* ═══════════════════════════════════════════════════════════════
                    2. ADVISOR SCOREBOARD
                ═══════════════════════════════════════════════════════════════ */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{scoreboardView === "my" ? "My Scorecard" : "Advisor Scoreboard"}</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{scoreboardView === "my" ? "Your personal performance metrics" : "Performance by assigned advisor"}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                        {advisorName && <button onClick={() => setScoreboardView("my")} className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${scoreboardView === "my" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>My Scorecard</button>}
                        {!isAdvisor && <button onClick={() => setScoreboardView("team")} className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${scoreboardView === "team" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>Team</button>}
                        <button onClick={() => setScoreboardView("individual")} className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${scoreboardView === "individual" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>Individual</button>
                      </div>
                      <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">{data.advisors.length} advisors</span>
                    </div>
                  </div>

                  {/* Table header */}
                  {scoreboardView !== "my" && (
                  <div className="grid grid-cols-8 gap-2 px-6 py-2.5 bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                    <span className="col-span-2">{scoreboardView === "team" ? "Metric" : "Advisor"}</span>
                    <span className="text-center">Households</span>
                    <span className="text-center">Open</span>
                    <span className="text-center">Overdue</span>
                    <span className="text-center">Unsigned</span>
                    <span className="text-center">Compliance</span>
                    <span className="text-center">Score</span>
                  </div>
                  )}

                  {/* ─── My Scorecard View ─── */}
                  {scoreboardView === "my" && (() => {
                    const me = data.advisors.find(a => a.name === advisorName);
                    const teamAvg = (field: (a: AdvisorScore) => number) => {
                      const named = data.advisors.filter(a => a.name !== "Unassigned");
                      return named.length ? Math.round(named.reduce((s, a) => s + field(a), 0) / named.length) : 0;
                    };
                    if (!me) return <div className="px-6 py-8 text-center text-sm text-slate-400">No data found for {advisorName}. Check advisor assignments.</div>;
                    const metrics = [
                      { label: "Households", value: me.households, avg: teamAvg(a => a.households), unit: "" },
                      { label: "Open Tasks", value: me.openTasks, avg: teamAvg(a => a.openTasks), unit: "", lowerBetter: true },
                      { label: "Overdue", value: me.overdueTasks, avg: teamAvg(a => a.overdueTasks), unit: "", lowerBetter: true },
                      { label: "Unsigned Envelopes", value: me.unsigned, avg: teamAvg(a => a.unsigned), unit: "", lowerBetter: true },
                      { label: "Compliance Coverage", value: me.compliancePct, avg: teamAvg(a => a.compliancePct), unit: "%" },
                      { label: "Meetings (90d)", value: me.meetingsLast90, avg: teamAvg(a => a.meetingsLast90), unit: "" },
                    ];
                    const scoreColor = me.score >= 80 ? "text-green-600" : me.score >= 60 ? "text-amber-600" : "text-red-600";
                    const scoreBg = me.score >= 80 ? "from-green-50 to-emerald-50" : me.score >= 60 ? "from-amber-50 to-orange-50" : "from-red-50 to-rose-50";
                    return (
                      <div className="p-6">
                        {/* Score hero */}
                        <div className="flex items-center gap-6 mb-6">
                          <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${scoreBg} flex items-center justify-center`}>
                            <span className={`text-3xl font-light ${scoreColor}`}>{me.score}</span>
                          </div>
                          <div>
                            <p className="text-lg font-medium text-slate-800">{me.name}</p>
                            <p className="text-sm text-slate-400">{me.households} households · Composite score {me.score}/100</p>
                            {me.score >= teamAvg(a => a.score)
                              ? <p className="text-xs text-green-600 mt-1 font-medium">Above team average ({teamAvg(a => a.score)})</p>
                              : <p className="text-xs text-amber-600 mt-1 font-medium">Team average is {teamAvg(a => a.score)} — {teamAvg(a => a.score) - me.score} points of capacity</p>
                            }
                          </div>
                        </div>

                        {/* Metric rows with team comparison */}
                        <div className="space-y-3">
                          {metrics.map((m, i) => {
                            const better = m.lowerBetter ? m.value <= m.avg : m.value >= m.avg;
                            return (
                              <div key={i} className="flex items-center gap-4">
                                <span className="text-sm text-slate-600 w-40">{m.label}</span>
                                <div className="flex-1 flex items-center gap-3">
                                  <span className={`text-sm font-medium ${better ? "text-green-700" : "text-amber-700"}`}>{m.value}{m.unit}</span>
                                  <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                                    {/* Team average marker */}
                                    <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10" style={{ left: `${Math.min((m.avg / Math.max(m.value, m.avg, 1)) * 100, 100)}%` }} />
                                    <div className={`h-full rounded-full transition-all duration-500 ${better ? "bg-green-400" : "bg-amber-400"}`}
                                      style={{ width: `${Math.min((m.value / Math.max(m.value, m.avg, 1)) * 100, 100)}%` }} />
                                  </div>
                                  <span className="text-[10px] text-slate-400 w-16 text-right">avg {m.avg}{m.unit}</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>

                        {me.meetingsLast90 === 0 && me.households > 0 && (
                          <div className="mt-4 p-3 bg-amber-50 rounded-xl flex items-start gap-2">
                            <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                            <p className="text-[11px] text-amber-600">No meetings logged in the past 90 days. Recording meetings improves your composite score.</p>
                          </div>
                        )}
                      </div>
                    );
                  })()}

                  {scoreboardView === "team" ? (
                    /* ─── Team View: aggregate stats with ranges ─── */
                    (() => {
                      const named = data.advisors.filter(a => a.name !== "Unassigned");
                      if (named.length === 0) return <div className="px-6 py-8 text-center text-sm text-slate-400">No advisor assignments found.</div>;
                      const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
                      const range = (arr: number[]) => arr.length ? `${Math.min(...arr)}–${Math.max(...arr)}` : "—";
                      const totalHH = named.reduce((s, a) => s + a.households, 0);
                      const totalOpen = named.reduce((s, a) => s + a.openTasks, 0);
                      const totalOverdue = named.reduce((s, a) => s + a.overdueTasks, 0);
                      const totalUnsigned = named.reduce((s, a) => s + a.unsigned, 0);
                      const avgComp = avg(named.map(a => a.compliancePct));
                      const avgScore = avg(named.map(a => a.score));
                      return (
                        <>
                          <div className="grid grid-cols-8 gap-2 px-6 py-3.5 border-b border-slate-100 items-center">
                            <div className="col-span-2"><span className="text-sm font-medium text-slate-700">Team Total</span></div>
                            <span className="text-sm text-slate-700 text-center font-medium">{totalHH}</span>
                            <span className="text-sm text-slate-700 text-center font-medium">{totalOpen}</span>
                            <span className={`text-sm text-center font-medium ${totalOverdue > 0 ? "text-red-600" : "text-slate-400"}`}>{totalOverdue}</span>
                            <span className={`text-sm text-center font-medium ${totalUnsigned > 0 ? "text-blue-600" : "text-slate-400"}`}>{totalUnsigned}</span>
                            <span className="text-sm text-center"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${avgComp >= 80 ? "bg-green-100 text-green-700" : avgComp >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{avgComp}%</span></span>
                            <span className={`text-lg font-light text-center ${avgScore >= 80 ? "text-green-600" : avgScore >= 60 ? "text-amber-600" : "text-red-600"}`}>{avgScore}</span>
                          </div>
                          <div className="grid grid-cols-8 gap-2 px-6 py-3 border-b border-slate-100 items-center bg-slate-50/50">
                            <div className="col-span-2"><span className="text-xs text-slate-400">Range across {named.length} advisors</span></div>
                            <span className="text-xs text-slate-400 text-center">{range(named.map(a => a.households))}</span>
                            <span className="text-xs text-slate-400 text-center">{range(named.map(a => a.openTasks))}</span>
                            <span className="text-xs text-slate-400 text-center">{range(named.map(a => a.overdueTasks))}</span>
                            <span className="text-xs text-slate-400 text-center">{range(named.map(a => a.unsigned))}</span>
                            <span className="text-xs text-slate-400 text-center">{range(named.map(a => a.compliancePct))}%</span>
                            <span className="text-xs text-slate-400 text-center">{range(named.map(a => a.score))}</span>
                          </div>
                          {named.some(a => a.meetingsLast90 === 0 && a.households > 0) && (
                            <div className="px-6 py-3 bg-amber-50/50 border-t border-amber-100 flex items-start gap-2">
                              <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                              <p className="text-[11px] text-amber-600">{named.filter(a => a.meetingsLast90 === 0 && a.households > 0).length} advisor(s) have no meetings logged in 90 days. Switch to Individual view for details.</p>
                            </div>
                          )}
                        </>
                      );
                    })()
                  ) : (
                    /* ─── Individual View: per-advisor rows ─── */
                    <>

                  {data.advisors.map((a, i) => {
                    const rowColor = a.score >= 80 ? "" : a.score >= 60 ? "bg-amber-50/50" : "bg-red-50/50";
                    const isUnassigned = a.name === "Unassigned";
                    return (
                      <div key={i} className={`grid grid-cols-8 gap-2 px-6 py-3 border-b border-slate-50 last:border-0 items-center hover:bg-slate-50 transition-colors ${rowColor}`}>
                        <div className="col-span-2 flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full ${isUnassigned ? "bg-slate-300" : a.score >= 80 ? "bg-green-500" : a.score >= 60 ? "bg-amber-500" : "bg-red-500"}`} />
                          <div>
                            <span className={`text-sm font-medium ${isUnassigned ? "text-slate-400 italic" : "text-slate-700"}`}>{a.name}</span>
                            {a.meetingsLast90 === 0 && a.households > 0 && !isUnassigned && (
                              <p className="text-[9px] text-amber-500 leading-tight">No meetings logged (90d)</p>
                            )}
                          </div>
                        </div>
                        <span className="text-sm text-slate-600 text-center">{a.households}</span>
                        <span className="text-sm text-slate-600 text-center">{a.openTasks}</span>
                        <span className={`text-sm text-center font-medium ${a.overdueTasks > 0 ? "text-red-600" : "text-slate-400"}`}>{a.overdueTasks}</span>
                        <span className={`text-sm text-center font-medium ${a.unsigned > 0 ? "text-blue-600" : "text-slate-400"}`}>{a.unsigned}</span>
                        <span className="text-sm text-center">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${a.compliancePct >= 100 ? "bg-green-100 text-green-700" : a.compliancePct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{a.compliancePct}%</span>
                        </span>
                        <span className="text-center">
                          <span className={`text-lg font-light ${a.score >= 80 ? "text-green-600" : a.score >= 60 ? "text-amber-600" : "text-red-600"}`}>{a.score}</span>
                        </span>
                      </div>
                    );
                  })}

                  {data.advisors.length === 0 && (
                    <div className="px-6 py-8 text-center text-sm text-slate-400">No advisor assignments found. Assign advisors during onboarding.</div>
                  )}

                  {/* Data quality note */}
                  {data.advisors.some(a => a.name === "Unassigned" && a.households > 0) && (
                    <div className="px-6 py-3 bg-amber-50/50 border-t border-amber-100 flex items-start gap-2">
                      <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                      <p className="text-[11px] text-amber-600">
                        {data.advisors.find(a => a.name === "Unassigned")?.households} household(s) have no advisor assigned.
                        Assign advisors during onboarding or run <span className="font-medium">Seed Demo Data</span> from Settings.
                      </p>
                    </div>
                  )}

                  {/* Team Average */}
                  {data.advisors.length > 1 && (() => {
                    const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
                    return (
                      <div className="grid grid-cols-8 gap-2 px-6 py-3 bg-slate-50 items-center border-t border-slate-200">
                        <div className="col-span-2 flex items-center gap-2">
                          <div className="w-2 h-2 rounded-full bg-slate-400" />
                          <span className="text-sm font-semibold text-slate-500">Team Average</span>
                        </div>
                        <span className="text-sm text-slate-500 text-center font-medium">{avg(data.advisors.map(a => a.households))}</span>
                        <span className="text-sm text-slate-500 text-center font-medium">{avg(data.advisors.map(a => a.openTasks))}</span>
                        <span className="text-sm text-slate-500 text-center font-medium">{avg(data.advisors.map(a => a.overdueTasks))}</span>
                        <span className="text-sm text-slate-500 text-center font-medium">{avg(data.advisors.map(a => a.unsigned))}</span>
                        <span className="text-sm text-center"><span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-600">{avg(data.advisors.map(a => a.compliancePct))}%</span></span>
                        <span className="text-lg font-light text-slate-500 text-center">{avg(data.advisors.map(a => a.score))}</span>
                      </div>
                    );
                  })()}
                  </>
                  )}
                </div>

                {/* ═══════════════════════════════════════════════════════════════
                    3. AGING PIPELINE
                ═══════════════════════════════════════════════════════════════ */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Client Pipeline</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Household progression through onboarding stages</p>
                  </div>

                  {/* Funnel visualization */}
                  <div className="px-6 py-5">
                    <div className="flex items-end gap-2">
                      {data.pipeline.map((stage, i) => {
                        const maxCount = Math.max(...data.pipeline.map(s => s.count), 1);
                        const height = Math.max(stage.count / maxCount * 120, 24);
                        const isExpanded = expandedPipeline === i;
                        return (
                          <button key={i} onClick={() => setExpandedPipeline(isExpanded ? null : i)} className="flex-1 group">
                            <div className="text-center mb-2">
                              <p className={`text-2xl font-light ${stage.stuck > 0 ? "text-amber-600" : "text-slate-900"}`}>{stage.count}</p>
                              {stage.stuck > 0 && <p className="text-[10px] text-red-500 font-medium">{stage.stuck} stuck</p>}
                            </div>
                            <div className={`mx-auto rounded-t-xl transition-all group-hover:opacity-90 ${
                              i === data.pipeline.length - 1 ? "bg-green-500" :
                              stage.stuck > 0 ? "bg-gradient-to-t from-amber-500 to-amber-400" :
                              "bg-gradient-to-t from-slate-400 to-slate-300"
                            }`} style={{ height: `${height}px` }} />
                            <div className={`text-center pt-2 pb-1 border-t-2 ${isExpanded ? "border-slate-900" : "border-transparent"}`}>
                              <p className="text-[10px] text-slate-500 font-medium leading-tight">{stage.label}</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Pipeline Velocity Metrics */}
                  <div className="px-6 pb-4 border-t border-slate-100">
                    <div className="flex items-center gap-2 pt-3 mb-3">
                      <TrendingUp size={14} className="text-slate-400" />
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Pipeline Velocity</span>
                    </div>
                    <div className="grid grid-cols-5 gap-2">
                      {data.pipeline.map((stage, i) => {
                        const isLast = i === data.pipeline.length - 1;
                        const isSlow = stage.velocityRatio > 1.5;
                        const isVerySlow = stage.velocityRatio > 2;
                        return (
                          <div key={i}>
                            <button onClick={() => toggleDetail(`vel-${i}`)} className={`w-full text-center rounded-lg p-2 hover:ring-1 hover:ring-slate-300 transition-all ${isLast ? "bg-green-50" : isSlow ? "bg-amber-50" : "bg-slate-50"}`}>
                              {isLast ? (
                                <>
                                  <p className="text-xs font-medium text-green-600">{stage.count}</p>
                                  <p className="text-[9px] text-green-500 mt-0.5">completed</p>
                                </>
                              ) : (
                                <>
                                  <p className={`text-xs font-medium ${isVerySlow ? "text-red-600" : isSlow ? "text-amber-600" : "text-slate-700"}`}>
                                    {stage.avgDays}d <span className="text-[9px] font-normal text-slate-400">avg</span>
                                  </p>
                                  <p className="text-[9px] text-slate-400 mt-0.5">
                                    {stage.benchmarkDays}d benchmark
                                  </p>
                                  {stage.velocityRatio > 1 && stage.count > 0 && (
                                    <p className={`text-[9px] font-medium mt-0.5 ${isVerySlow ? "text-red-500" : "text-amber-500"}`}>
                                      {stage.velocityRatio}x slower
                                    </p>
                                  )}
                                </>
                              )}
                              <p className={`text-[9px] mt-1 ${isLast ? "text-green-500" : "text-slate-400"}`}>
                                {isLast ? "—" : `${stage.conversionRate}% pass`}<span className="text-slate-300 ml-0.5">▾</span>
                              </p>
                            </button>
                            <DetailDrawer id={`vel-${i}`}>
                              {isLast ? (
                                <p className="text-xs text-slate-600"><strong>{stage.count} households</strong> have completed all stages (DocuSign signed, compliance reviewed, initial meeting held). These are fully active clients.</p>
                              ) : stage.count > 0 ? (
                                <p className="text-xs text-slate-600"><strong>{stage.label}</strong>: {stage.count} households averaging {stage.avgDays} days in this stage (benchmark: {stage.benchmarkDays}d). {stage.stuck > 0 ? `${stage.stuck} are stuck (>{stage.benchmarkDays}d).` : "None stuck."} {stage.conversionRate}% of all households have progressed past this point.</p>
                              ) : (
                                <p className="text-xs text-slate-400">No households currently in this stage.</p>
                              )}
                            </DetailDrawer>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Expanded stage detail */}
                  {expandedPipeline !== null && data.pipeline[expandedPipeline].households.length > 0 && (
                    <div className="px-6 pb-4 border-t border-slate-100">
                      <p className="text-xs text-slate-400 font-medium py-2">{data.pipeline[expandedPipeline].label} — {data.pipeline[expandedPipeline].households.length} households</p>
                      {data.pipeline[expandedPipeline].households
                        .sort((a, b) => b.days - a.days)
                        .slice(0, showAllPipeline ? undefined : 8)
                        .map((h, i) => (
                        <div key={i} className="flex items-center justify-between py-1.5">
                          <div className="flex items-center gap-2">
                            {h.days > 14 && <AlertTriangle size={12} className="text-red-500" />}
                            <span className="text-sm text-slate-700">{h.name}</span>
                            <span className="text-xs text-slate-400">{h.days}d</span>
                          </div>
                          <button onClick={() => goToFamily(h.id, h.name)} className="text-[11px] text-slate-500 hover:text-slate-700">View →</button>
                        </div>
                      ))}
                      {data.pipeline[expandedPipeline].households.length > 8 && (
                        <button onClick={() => setShowAllPipeline(!showAllPipeline)} className="text-xs text-slate-400 hover:text-slate-600 mt-2">
                          {showAllPipeline ? "Show less" : `Show all ${data.pipeline[expandedPipeline].households.length}`}
                        </button>
                      )}
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

                  {/* ═══════════════════════════════════════════════════════════════
                      4. RISK RADAR
                  ═══════════════════════════════════════════════════════════════ */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                      <Activity size={16} className="text-red-500" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Risk Radar</h3>
                        <p className="text-xs text-slate-400">Items requiring immediate attention</p>
                      </div>
                      <div className="flex-1" />
                      <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-600 font-medium">{data.risks.length}</span>
                    </div>

                    {/* Severity filter pills */}
                    {data.risks.length > 3 && (
                      <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-1.5">
                        {(["all", "critical", "high", "medium"] as const).map(f => {
                          const count = f === "all" ? data.risks.length : data.risks.filter(r => r.severity === f).length;
                          if (f !== "all" && count === 0) return null;
                          return (
                            <button key={f} onClick={() => setRiskFilter(f)}
                              className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-colors ${riskFilter === f ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:text-slate-700"}`}>
                              {f === "all" ? "All" : f.charAt(0).toUpperCase() + f.slice(1)} {count > 0 && <span className="ml-0.5 opacity-60">{count}</span>}
                            </button>
                          );
                        })}
                      </div>
                    )}

                    {(() => {
                      const filteredRisks = riskFilter === "all" ? data.risks : data.risks.filter(r => r.severity === riskFilter);
                      const displayRisks = showAllRisks ? filteredRisks : filteredRisks.slice(0, 10);

                      return filteredRisks.length === 0 ? (
                        <div className="px-5 py-8 text-center">
                          <CheckCircle size={28} className="text-green-500 mx-auto mb-2" />
                          <p className="text-sm text-slate-500">All clear — no risks detected</p>
                        </div>
                      ) : (<>
                        {displayRisks.map((r, i) => (
                      <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2 mb-0.5">
                            <SeverityBadge severity={r.severity} />
                            <span className="text-[10px] text-slate-400">{r.category}</span>
                          </div>
                          <p className="text-sm text-slate-700 truncate">{r.label}</p>
                          <p className="text-xs text-slate-400">{r.household} · {r.daysStale}d</p>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0">
                          {r.action === "Run Review" && (
                            <button onClick={() => goToCompliance(r.householdId, r.household)} className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800">Run Review</button>
                          )}
                          {r.action === "View Family" && (
                            <button onClick={() => goToFamily(r.householdId, r.household)} className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium hover:bg-slate-200">View</button>
                          )}
                          {r.action === "Send Reminder" && (
                            <a href={r.url} target="_blank" rel="noopener noreferrer" className="text-[10px] px-2.5 py-1 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700">Remind</a>
                          )}
                          {r.action === "View Task" && (
                            <button onClick={() => goToFamily(r.householdId, r.household)} className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium hover:bg-slate-200">View</button>
                          )}
                        </div>
                      </div>
                    ))}
                        {filteredRisks.length > 10 && (
                          <div className="px-5 py-2 border-t border-slate-100">
                            <button onClick={() => setShowAllRisks(!showAllRisks)} className="text-xs text-slate-400 hover:text-slate-600">
                              {showAllRisks ? "Show top 10" : `Show all ${filteredRisks.length}`}
                            </button>
                          </div>
                        )}
                      </>);
                    })()}
                  </div>

                  {/* ═══════════════════════════════════════════════════════════════
                      5. WEEKLY COMPARISON
                  ═══════════════════════════════════════════════════════════════ */}
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                      <TrendingUp size={16} className="text-green-500" />
                      <div>
                        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">This Week vs Last</h3>
                        <p className="text-xs text-slate-400">7-day rolling comparison</p>
                      </div>
                    </div>

                    <div className="divide-y divide-slate-50">
                      {data.weeklyComparison.map((w, i) => (
                        <div key={i}>
                          <button onClick={() => toggleDetail(`week-${i}`)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
                            <span className="text-sm text-slate-600">{w.label}<span className="text-slate-300 ml-1">▾</span></span>
                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-lg font-light text-slate-900">{w.thisWeek}</p>
                                <p className="text-[10px] text-slate-400">this week</p>
                              </div>
                              <div className="text-right w-12">
                                <p className="text-sm text-slate-400">{w.lastWeek}</p>
                                <p className="text-[10px] text-slate-400">last</p>
                              </div>
                              <div className="w-12 text-right">
                                <Delta thisWeek={w.thisWeek} lastWeek={w.lastWeek} />
                              </div>
                            </div>
                          </button>
                          <div className="px-5">
                            <DetailDrawer id={`week-${i}`}>
                              <ComingSoon />
                            </DetailDrawer>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Summary bar */}
                    <div className="px-5 py-3 bg-slate-50 flex items-center justify-center gap-2 text-xs text-slate-400">
                      <Activity size={12} />
                      <span>Last refreshed {new Date().toLocaleTimeString()}</span>
                    </div>
                  </div>

                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
