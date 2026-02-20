"use client";
import { useState, useCallback, useMemo } from "react";
import { Loader2, Pin, PinOff, FileDown, X, ChevronDown, ChevronRight as ChevronR } from "lucide-react";
import { FlowHeader } from "@/components/shared/FlowHeader";
import type { Screen, WorkflowContext } from "@/lib/types";
import { usePracticeData, addRiskDisposition, loadRiskDispositions, filterDispositionedRisks } from "./usePracticeData";
import { callSF } from "@/lib/salesforce";
import { DEMO_RECONCILIATION } from "@/lib/demo-data";
import { AlertTriangle as ReconcileAlert, Check as ReconcileCheck, HelpCircle } from "lucide-react";
import type { PracticeData, RiskDisposition } from "./usePracticeData";
import { HealthScoreSection } from "./components/HealthScoreSection";
import { RevenueSection } from "./components/RevenueSection";
import { AdvisorScoreboard } from "./components/AdvisorScoreboard";
import { PipelineSection } from "./components/PipelineSection";
import { RiskRadar } from "./components/RiskRadar";
import { WeeklyComparison } from "./components/WeeklyComparison";
import { OpsWorkload } from "./components/OpsWorkload";
import { DataQuality } from "./components/DataQuality";
import { HouseholdRiskScore } from "./components/HouseholdRiskScore";
import { StaffWorkload } from "./components/StaffWorkload";
import { SuccessionPlanning } from "./components/SuccessionPlanning";
import { PracticePlaybook } from "@/components/shared/PracticePlaybook";
import { HouseholdHealthCards } from "./components/HouseholdHealthCards";
import { useDemoMode } from "@/lib/demo-context";

// ─── Section Definitions ────────────────────────────────────────────────────

type SectionId = "health" | "revenue" | "advisors" | "staff" | "ops" | "quality" | "risk" | "pipeline" | "radar" | "weekly";

const SECTION_LABELS: Record<SectionId, string> = {
  health: "Practice Health Score",
  revenue: "Revenue Intelligence",
  advisors: "Advisor Scoreboard",
  staff: "Staff Workload",
  ops: "Ops Task Queue",
  quality: "Data Quality",
  risk: "Households at Risk",
  pipeline: "Pipeline",
  radar: "Risk Radar",
  weekly: "Weekly Comparison",
};

const LAYOUT_KEY = "min-dashboard-layout";

function loadLayout(): Set<SectionId> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(LAYOUT_KEY);
    return raw ? new Set(JSON.parse(raw)) : new Set();
  } catch { return new Set(); }
}

function saveLayout(hidden: Set<SectionId>) {
  localStorage.setItem(LAYOUT_KEY, JSON.stringify(Array.from(hidden)));
}

// ─── Board Report Builder ───────────────────────────────────────────────────

function BoardReportModal({ data, firmName, onClose }: { data: PracticeData; firmName?: string; onClose: () => void }) {
  const [sections, setSections] = useState<Set<string>>(new Set(["health", "revenue", "advisors", "risk"]));
  const toggle = (id: string) => setSections(prev => { const s = new Set(prev); if (s.has(id)) s.delete(id); else s.add(id); return s; });

  const exportReport = () => {
    const lines: string[] = [
      "═".repeat(60),
      `  ${firmName || "Practice"} — Board Report`,
      `  Generated: ${new Date().toLocaleString()}`,
      "═".repeat(60),
      "",
    ];

    if (sections.has("health")) {
      lines.push("─── Practice Health Score ───────────────────────────────");
      lines.push(`Overall Score: ${data.healthScore}/100`);
      data.healthBreakdown.forEach(b => lines.push(`  ${b.label}: ${b.score}/100 (weight: ${Math.round(b.weight * 100)}%)`));
      lines.push(`Households: ${data.totalHouseholds}  |  Open Tasks: ${data.openTasks}  |  Unsigned: ${data.unsigned}`);
      lines.push("");
    }

    if (sections.has("revenue")) {
      lines.push("─── Revenue Intelligence ───────────────────────────────");
      lines.push(`Estimated AUM: $${(data.revenue.estimatedAum / 1e6).toFixed(1)}M`);
      lines.push(`Annual Fee Income: $${(data.revenue.annualFeeIncome / 1e3).toFixed(0)}K`);
      if (data.revenue.quarterlyTrend.length > 0) {
        lines.push("Quarterly Trend:");
        data.revenue.quarterlyTrend.forEach(q => lines.push(`  ${q.label}: $${(q.value / 1e3).toFixed(0)}K`));
      }
      lines.push("");
    }

    if (sections.has("advisors")) {
      lines.push("─── Advisor Scoreboard ─────────────────────────────────");
      data.advisors.forEach(a => {
        lines.push(`  ${a.name}: ${a.households} HH | ${a.openTasks} tasks | ${a.compliancePct}% compliance | Score: ${a.score}`);
      });
      lines.push("");
    }

    if (sections.has("risk")) {
      lines.push("─── Risk Summary ───────────────────────────────────────");
      const critical = data.risks.filter(r => r.severity === "critical").length;
      const high = data.risks.filter(r => r.severity === "high").length;
      const medium = data.risks.filter(r => r.severity === "medium").length;
      lines.push(`Critical: ${critical}  |  High: ${high}  |  Medium: ${medium}`);
      data.risks.slice(0, 10).forEach(r => lines.push(`  [${r.severity.toUpperCase()}] ${r.label} — ${r.household}`));
      lines.push("");
    }

    if (sections.has("pipeline")) {
      lines.push("─── Pipeline ───────────────────────────────────────────");
      data.pipeline.forEach(p => lines.push(`  ${p.label}: ${p.count} households (avg ${p.avgDays} days)`));
      lines.push("");
    }

    lines.push("═".repeat(60));
    lines.push("Generated by Min — Powered by Impacting Advisors");

    const blob = new Blob([lines.join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `board-report-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
    onClose();
  };

  const reportSections = [
    { id: "health", label: "Practice Health Score" },
    { id: "revenue", label: "Revenue Intelligence" },
    { id: "advisors", label: "Advisor Scoreboard" },
    { id: "risk", label: "Risk Summary" },
    { id: "pipeline", label: "Pipeline Overview" },
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40" />
      <div className="relative w-full max-w-md mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-fade-in" onClick={e => e.stopPropagation()}>
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-700">Board Report</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={16} /></button>
        </div>
        <div className="px-6 py-4 space-y-3">
          <p className="text-xs text-slate-400">Select sections to include in your report.</p>
          {reportSections.map(s => (
            <label key={s.id} className="flex items-center gap-3 cursor-pointer">
              <input type="checkbox" checked={sections.has(s.id)} onChange={() => toggle(s.id)}
                className="w-4 h-4 rounded border-slate-300 text-slate-900 focus:ring-slate-900" />
              <span className="text-sm text-slate-700">{s.label}</span>
            </label>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-slate-100 flex justify-end gap-3">
          <button onClick={onClose} className="text-sm px-4 py-2 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-400 transition-colors">Cancel</button>
          <button onClick={exportReport} disabled={sections.size === 0}
            className="text-sm px-4 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 disabled:opacity-30 transition-colors flex items-center gap-2">
            <FileDown size={14} /> Export Report
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Reconciliation Section ──────────────────────────────────────────────────

function ReconciliationSection() {
  const [expanded, setExpanded] = useState(false);
  const r = DEMO_RECONCILIATION;

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <button onClick={() => setExpanded(!expanded)} className="w-full px-5 py-4 flex items-center gap-3 hover:bg-slate-50 transition-colors">
        <HelpCircle size={16} className="text-blue-500" />
        <div className="text-left">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Custodian-CRM Reconciliation</h3>
          <p className="text-xs text-slate-400">Account matching between custodian and Salesforce</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">{r.matched.length} matched</span>
          {r.orphanCustodial.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-600 font-medium">{r.orphanCustodial.length} orphan</span>}
          {r.orphanCrm.length > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">{r.orphanCrm.length} CRM only</span>}
        </div>
        <ChevronDown size={16} className={`text-slate-400 transition-transform ${expanded ? "rotate-180" : ""}`} />
      </button>
      {expanded && (
        <div className="border-t border-slate-100 px-5 py-3 animate-fade-in">
          <p className="text-xs text-slate-500 font-medium mb-2">Matched Accounts</p>
          <div className="space-y-1 mb-4">
            {r.matched.map((m, i) => (
              <div key={i} className="flex items-center gap-2 text-xs text-slate-600">
                <ReconcileCheck size={12} className="text-green-500 flex-shrink-0" />
                <span className="flex-1">{m.custodialName}</span>
                <span className="text-slate-400">→ {m.crmHousehold}</span>
                <span className="tabular-nums text-slate-300">${(m.balance / 1e6).toFixed(1)}M</span>
              </div>
            ))}
          </div>
          {r.orphanCustodial.length > 0 && (
            <>
              <p className="text-xs text-amber-600 font-medium mb-2">Orphaned Custodial (no CRM match)</p>
              <div className="space-y-1 mb-4">
                {r.orphanCustodial.map((o, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-amber-700">
                    <ReconcileAlert size={12} className="text-amber-500 flex-shrink-0" />
                    <span className="flex-1">{o.custodialName}</span>
                    <span className="tabular-nums text-amber-400">${(o.balance / 1e6).toFixed(1)}M</span>
                  </div>
                ))}
              </div>
            </>
          )}
          {r.orphanCrm.length > 0 && (
            <>
              <p className="text-xs text-red-600 font-medium mb-2">CRM Only (no custodial match)</p>
              <div className="space-y-1">
                {r.orphanCrm.map((o, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs text-red-700">
                    <ReconcileAlert size={12} className="text-red-500 flex-shrink-0" />
                    <span>{o.crmHousehold}</span>
                    <span className="text-red-300 text-[10px]">{o.notes}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Dashboard Screen ───────────────────────────────────────────────────────

export function DashboardScreen({ onExit, onNavigate, firmName, role, advisorName }: {
  onExit: () => void;
  onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void;
  firmName?: string;
  role?: string | null;
  advisorName?: string;
}) {
  const isAdvisor = role === "advisor";
  const { isDemoMode } = useDemoMode();
  const { loading, data: rawData, error } = usePracticeData();
  const [detailPanel, setDetailPanel] = useState<string | null>(null);
  const toggleDetail = (id: string) => setDetailPanel(prev => prev === id ? null : id);
  const [hiddenSections, setHiddenSections] = useState<Set<SectionId>>(loadLayout);
  const [showReport, setShowReport] = useState(false);

  const togglePin = useCallback((id: SectionId) => {
    setHiddenSections(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      saveLayout(next);
      return next;
    });
  }, []);

  const [dispositionVersion, setDispositionVersion] = useState(0);

  // Re-filter risks when dispositions change (without full page reload)
  const data = useMemo(() => {
    if (!rawData) return rawData;
    // eslint-disable-next-line @typescript-eslint/no-unused-expressions
    dispositionVersion; // trigger dependency
    const disps = loadRiskDispositions();
    const { visible, dispositionedCount: dc } = filterDispositionedRisks(rawData.allRisks, disps);
    return { ...rawData, risks: visible, riskDispositions: disps, dispositionedCount: dc };
  }, [rawData, dispositionVersion]);

  const goToFamily = (householdId: string, name: string) => {
    if (onNavigate) onNavigate("family" as Screen, { householdId, familyName: name.replace(" Household", "") });
  };

  const goToCompliance = (householdId: string, name: string) => {
    if (onNavigate) onNavigate("compliance", { householdId, familyName: name.replace(" Household", "") });
  };

  const handleRiskDisposition = useCallback((riskId: string, action: "resolved" | "snoozed" | "dismissed", reason: string, snoozeDays?: number) => {
    const risk = rawData?.allRisks.find(r => r.id === riskId);
    if (!risk) return;
    const disposition: RiskDisposition = {
      riskId,
      action,
      reason,
      actor: firmName || "User",
      timestamp: new Date().toISOString(),
      snoozeUntil: snoozeDays ? new Date(Date.now() + snoozeDays * 86400000).toISOString() : undefined,
      householdId: risk.householdId,
      label: risk.label,
    };
    addRiskDisposition(disposition);
    // Write to SF audit trail (fire-and-forget)
    callSF("createTask", {
      subject: `MIN:AUDIT — riskDisposition — success`,
      description: `Action: ${action}\nReason: ${reason}\nRisk: ${risk.label}\nHousehold: ${risk.householdId}\nActor: ${firmName || "User"}\nTimestamp: ${disposition.timestamp}`,
      householdId: risk.householdId,
    }).catch(() => {});
    // Trigger re-render by bumping version counter
    setDispositionVersion(v => v + 1);
  }, [rawData, firmName]);

  const isVisible = (id: SectionId) => !hiddenSections.has(id);

  const SectionWrapper = ({ id, children }: { id: SectionId; children: React.ReactNode }) => {
    const hidden = hiddenSections.has(id);
    return (
      <div className="relative group">
        {!hidden && children}
        {hidden && (
          <button onClick={() => togglePin(id)}
            className="w-full flex items-center gap-3 px-4 py-3 bg-slate-50 border border-slate-200 rounded-2xl text-left hover:bg-slate-100 transition-colors">
            <PinOff size={14} className="text-slate-300" />
            <span className="text-sm text-slate-400">{SECTION_LABELS[id]}</span>
            <span className="text-[10px] text-slate-300 ml-auto">Click to show</span>
          </button>
        )}
        <button onClick={() => togglePin(id)} title={hidden ? "Show section" : "Hide section"}
          className="absolute top-2 right-2 z-10 w-7 h-7 rounded-lg bg-white/80 border border-slate-200 flex items-center justify-center text-slate-300 hover:text-slate-600 opacity-0 group-hover:opacity-100 transition-all">
          {hidden ? <Pin size={12} /> : <PinOff size={12} />}
        </button>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-surface">
      <div className="w-full flex flex-col">
        <div className="px-4 sm:px-8 py-4 flex items-center gap-4 print:hidden">
          <FlowHeader
            title={role === "advisor" ? "Advisor Dashboard" : role === "operations" ? "Operations Dashboard" : role === "principal" ? "Principal Dashboard" : "Practice Intelligence"}
            familyName={undefined} stepLabel="Weekly Operations Report" onBack={onExit}
          />
          {data && (
            <button onClick={() => setShowReport(true)}
              className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors flex-shrink-0">
              <FileDown size={12} /> Board Report
            </button>
          )}
        </div>

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-2 pb-16">
          <div className="max-w-6xl w-full mx-auto">

            {loading && (
              <div className="animate-fade-in space-y-8">
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-slate-100 animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-5 w-48 bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />)}
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                      <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                      <div className="h-8 w-28 bg-slate-100 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
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
                <SectionWrapper id="health"><HealthScoreSection data={data} detailPanel={detailPanel} toggleDetail={toggleDetail} firmName={firmName} /></SectionWrapper>
                {isDemoMode && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <HouseholdHealthCards onNavigate={onNavigate} dataQualityByHousehold={data.dataQualityByHousehold} />
                  </div>
                )}
                <SectionWrapper id="revenue"><RevenueSection data={data} detailPanel={detailPanel} toggleDetail={toggleDetail} /></SectionWrapper>
                <SectionWrapper id="advisors"><AdvisorScoreboard data={data} advisorName={advisorName} isAdvisor={isAdvisor} /></SectionWrapper>
                {(role === "operations" || role === "principal") && <SectionWrapper id="staff"><StaffWorkload data={data} /></SectionWrapper>}
                {(role === "operations" || role === "principal") && <SectionWrapper id="ops"><OpsWorkload data={data} firmName={firmName} /></SectionWrapper>}
                {(role === "operations" || role === "principal") && <SectionWrapper id="quality"><div data-tour="data-quality"><DataQuality data={data} goToFamily={goToFamily} /></div></SectionWrapper>}
                {(role === "operations" || role === "principal") && <SectionWrapper id="risk"><HouseholdRiskScore data={data} goToFamily={goToFamily} goToCompliance={goToCompliance} /></SectionWrapper>}
                <SectionWrapper id="pipeline"><PipelineSection data={data} detailPanel={detailPanel} toggleDetail={toggleDetail} goToFamily={goToFamily} /></SectionWrapper>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <SectionWrapper id="radar"><RiskRadar data={data} goToFamily={goToFamily} goToCompliance={goToCompliance} onDisposition={handleRiskDisposition} /></SectionWrapper>
                  <SectionWrapper id="weekly"><WeeklyComparison data={data} detailPanel={detailPanel} toggleDetail={toggleDetail} /></SectionWrapper>
                </div>
                {(role === "principal") && <SuccessionPlanning data={data} />}

                {/* Reconciliation (ops/principal only) */}
                {isDemoMode && (role === "operations" || role === "principal") && (
                  <div data-tour="reconciliation"><ReconciliationSection /></div>
                )}

                <PracticePlaybook data={data} firmName={firmName} />
              </div>
            )}

          </div>
        </div>
      </div>

      {showReport && data && <BoardReportModal data={data} firmName={firmName} onClose={() => setShowReport(false)} />}
    </div>
  );
}
