"use client";
import { useState } from "react";
import { Users, AlertTriangle, Shield, TrendingUp, ChevronDown, ChevronUp } from "lucide-react";
import type { PracticeData, AdvisorScore } from "../usePracticeData";

// ─── Succession Risk Analysis ────────────────────────────────────────────────

interface SuccessionRisk {
  type: "key-person" | "concentration" | "age-gap" | "coverage";
  severity: "critical" | "high" | "medium";
  label: string;
  detail: string;
  advisor?: string;
}

function analyzeSuccessionRisks(data: PracticeData): SuccessionRisk[] {
  const risks: SuccessionRisk[] = [];
  const total = data.totalHouseholds || 1;

  // Key-person risk: any advisor with >40% of households
  for (const adv of data.advisors) {
    if (adv.name === "Unassigned") continue;
    const pct = Math.round((adv.households / total) * 100);
    if (pct >= 40) {
      risks.push({
        type: "key-person",
        severity: "critical",
        label: `${adv.name} manages ${pct}% of households`,
        detail: `${adv.households} of ${total} households. Loss of this advisor would impact the majority of your practice.`,
        advisor: adv.name,
      });
    } else if (pct >= 25) {
      risks.push({
        type: "key-person",
        severity: "high",
        label: `${adv.name} manages ${pct}% of households`,
        detail: `${adv.households} of ${total} households. Consider cross-training another advisor on these relationships.`,
        advisor: adv.name,
      });
    }
  }

  // Concentration risk: single advisor has >50% of open tasks
  const totalOpenTasks = data.advisors.reduce((s, a) => s + a.openTasks, 0) || 1;
  for (const adv of data.advisors) {
    if (adv.name === "Unassigned") continue;
    const taskPct = Math.round((adv.openTasks / totalOpenTasks) * 100);
    if (taskPct >= 50 && adv.openTasks > 3) {
      risks.push({
        type: "concentration",
        severity: "high",
        label: `${adv.name} carries ${taskPct}% of all open tasks`,
        detail: `${adv.openTasks} open tasks out of ${totalOpenTasks}. Workload concentration creates bottleneck risk.`,
        advisor: adv.name,
      });
    }
  }

  // Compliance coverage gap
  const lowCompliance = data.advisors.filter(a => a.name !== "Unassigned" && a.compliancePct < 50 && a.households > 0);
  if (lowCompliance.length > 0) {
    risks.push({
      type: "coverage",
      severity: "high",
      label: `${lowCompliance.length} advisor(s) below 50% compliance coverage`,
      detail: lowCompliance.map(a => `${a.name}: ${a.compliancePct}%`).join(", "),
    });
  }

  // Meeting coverage gap — advisors with no meetings in 90 days
  const noMeetings = data.advisors.filter(a => a.name !== "Unassigned" && a.meetingsLast90 === 0 && a.households > 0);
  if (noMeetings.length > 0) {
    risks.push({
      type: "age-gap",
      severity: "medium",
      label: `${noMeetings.length} advisor(s) with no meetings in 90 days`,
      detail: `Inactive advisors may indicate relationship decay or data gaps.`,
    });
  }

  risks.sort((a, b) => {
    const sev = { critical: 0, high: 1, medium: 2 };
    return sev[a.severity] - sev[b.severity];
  });

  return risks;
}

function computeReadinessScore(data: PracticeData): number {
  const advisors = data.advisors.filter(a => a.name !== "Unassigned" && a.households > 0);
  if (advisors.length === 0) return 100;

  const total = data.totalHouseholds || 1;

  // Diversification score (0-30): how evenly are households distributed?
  const maxConcentration = Math.max(...advisors.map(a => a.households / total));
  const diversScore = Math.round((1 - maxConcentration) * 30 / 0.8); // 0.8 = max possible spread

  // Compliance score (0-30): average compliance coverage
  const avgCompliance = advisors.reduce((s, a) => s + a.compliancePct, 0) / advisors.length;
  const compScore = Math.round(avgCompliance * 0.3);

  // Activity score (0-20): advisors with recent meetings
  const activeAdvisors = advisors.filter(a => a.meetingsLast90 > 0).length;
  const actScore = Math.round((activeAdvisors / advisors.length) * 20);

  // Task health score (0-20): low overdue ratio
  const totalOverdue = advisors.reduce((s, a) => s + a.overdueTasks, 0);
  const overdueRatio = totalOverdue / Math.max(data.openTasks, 1);
  const taskScore = Math.round((1 - overdueRatio) * 20);

  return Math.min(100, Math.max(0, diversScore + compScore + actScore + taskScore));
}

// ─── Component ──────────────────────────────────────────────────────────────

export function SuccessionPlanning({ data }: { data: PracticeData }) {
  const [expanded, setExpanded] = useState(false);
  const risks = analyzeSuccessionRisks(data);
  const readiness = computeReadinessScore(data);
  const advisors = data.advisors.filter(a => a.name !== "Unassigned" && a.households > 0);
  const total = data.totalHouseholds || 1;

  const scoreColor = readiness >= 75 ? "text-green-600" : readiness >= 50 ? "text-amber-600" : "text-red-600";
  const ringColor = readiness >= 75 ? "stroke-green-500" : readiness >= 50 ? "stroke-amber-500" : "stroke-red-500";

  const sevColors = {
    critical: "bg-red-100 text-red-600",
    high: "bg-amber-100 text-amber-600",
    medium: "bg-slate-100 text-slate-500",
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)}
        className="w-full px-6 py-5 flex items-center gap-5 text-left hover:bg-slate-50 transition-colors">
        {/* Mini ring */}
        <div className="relative w-14 h-14 flex-shrink-0">
          <svg className="w-14 h-14 -rotate-90" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="24" fill="none" strokeWidth="4" className="stroke-slate-100" />
            <circle cx="28" cy="28" r="24" fill="none" strokeWidth="4" className={ringColor}
              strokeDasharray={`${(readiness / 100) * 150.8} 150.8`} strokeLinecap="round" />
          </svg>
          <span className={`absolute inset-0 flex items-center justify-center text-sm font-semibold ${scoreColor}`}>{readiness}</span>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Succession Readiness</h3>
            {risks.filter(r => r.severity === "critical").length > 0 && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">
                {risks.filter(r => r.severity === "critical").length} critical
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            {advisors.length} active advisors · {risks.length} risk{risks.length !== 1 ? "s" : ""} identified
          </p>
        </div>

        <div className="flex-shrink-0">
          {expanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-6 pb-6 border-t border-slate-100 pt-4 animate-fade-in">
          {/* Advisor concentration chart */}
          <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-3">Household Distribution</p>
          <div className="space-y-2 mb-5">
            {advisors.map(adv => {
              const pct = Math.round((adv.households / total) * 100);
              const isRisky = pct >= 30;
              return (
                <div key={adv.name} className="flex items-center gap-3">
                  <span className="text-xs text-slate-600 w-32 truncate">{adv.name}</span>
                  <div className="flex-1 h-3 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${isRisky ? "bg-amber-400" : "bg-blue-400"}`}
                      style={{ width: `${pct}%` }} />
                  </div>
                  <span className={`text-xs font-medium w-10 text-right ${isRisky ? "text-amber-600" : "text-slate-500"}`}>{pct}%</span>
                  <span className="text-[10px] text-slate-300 w-8 text-right">{adv.households}</span>
                </div>
              );
            })}
          </div>

          {/* Risk items */}
          {risks.length > 0 && (
            <>
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium mb-3">Succession Risks</p>
              <div className="space-y-2 mb-4">
                {risks.map((risk, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-slate-50 rounded-xl">
                    <AlertTriangle size={14} className={`mt-0.5 flex-shrink-0 ${risk.severity === "critical" ? "text-red-500" : risk.severity === "high" ? "text-amber-500" : "text-slate-400"}`} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm text-slate-700">{risk.label}</p>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${sevColors[risk.severity]}`}>{risk.severity}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{risk.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Score breakdown */}
          <div className="grid grid-cols-4 gap-3">
            {[
              { label: "Diversification", icon: Users, value: advisors.length > 1 ? "Spread" : "Single" },
              { label: "Compliance", icon: Shield, value: `${Math.round(advisors.reduce((s, a) => s + a.compliancePct, 0) / Math.max(advisors.length, 1))}%` },
              { label: "Active Advisors", icon: TrendingUp, value: `${advisors.filter(a => a.meetingsLast90 > 0).length}/${advisors.length}` },
              { label: "Overdue Ratio", icon: AlertTriangle, value: `${data.openTasks > 0 ? Math.round(advisors.reduce((s, a) => s + a.overdueTasks, 0) / data.openTasks * 100) : 0}%` },
            ].map(s => (
              <div key={s.label} className="text-center p-3 bg-slate-50 rounded-xl">
                <s.icon size={14} className="mx-auto text-slate-400 mb-1" />
                <p className="text-sm font-medium text-slate-700">{s.value}</p>
                <p className="text-[10px] text-slate-400">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
