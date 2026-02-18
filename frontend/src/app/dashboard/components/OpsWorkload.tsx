"use client";
import { useState } from "react";
import { Clock, AlertTriangle, Users, CheckCircle, Download, Loader2 } from "lucide-react";
import type { PracticeData } from "../usePracticeData";

interface TaskCategory {
  label: string;
  count: number;
  urgent: number;
  estMinutes: number;
  color: string;
  bgColor: string;
}

export function OpsWorkload({ data, firmName }: { data: PracticeData; firmName?: string }) {
  const [expanded, setExpanded] = useState(false);
  const [pdfLoading, setPdfLoading] = useState(false);

  // Build task categories from practice data
  const categories: TaskCategory[] = [
    {
      label: "DocuSign Follow-up",
      count: data.unsigned,
      urgent: data.unsignedItems.filter(t => t.daysOld > 5).length,
      estMinutes: data.unsigned * 5,
      color: "text-blue-600",
      bgColor: "bg-blue-50",
    },
    {
      label: "Compliance Reviews",
      count: Math.max(0, data.totalHouseholds - data.complianceReviews),
      urgent: data.risks.filter(r => r.category === "Compliance" && r.severity === "critical").length,
      estMinutes: Math.max(0, data.totalHouseholds - data.complianceReviews) * 15,
      color: "text-purple-600",
      bgColor: "bg-purple-50",
    },
    {
      label: "Overdue Tasks",
      count: data.openTaskItems.filter(t => t.status !== "Completed" && t.priority === "High").length,
      urgent: data.openTaskItems.filter(t => t.daysOld > 7 && t.priority === "High").length,
      estMinutes: data.openTaskItems.filter(t => t.priority === "High").length * 10,
      color: "text-red-600",
      bgColor: "bg-red-50",
    },
    {
      label: "Stale Accounts",
      count: data.risks.filter(r => r.category === "Stale Account").length,
      urgent: data.risks.filter(r => r.category === "Stale Account" && r.severity === "critical").length,
      estMinutes: data.risks.filter(r => r.category === "Stale Account").length * 8,
      color: "text-amber-600",
      bgColor: "bg-amber-50",
    },
  ];

  const totalItems = categories.reduce((s, c) => s + c.count, 0);
  const totalUrgent = categories.reduce((s, c) => s + c.urgent, 0);
  const totalMinutes = categories.reduce((s, c) => s + c.estMinutes, 0);
  const totalHours = Math.round(totalMinutes / 60 * 10) / 10;
  const active = categories.filter(c => c.count > 0);

  // Capacity indicator
  const capacityPct = Math.min(Math.round((totalMinutes / 480) * 100), 100); // 480 min = 8hr day
  const capacityColor = capacityPct >= 80 ? "bg-red-400" : capacityPct >= 50 ? "bg-amber-400" : "bg-green-400";
  const capacityLabel = capacityPct >= 80 ? "Heavy" : capacityPct >= 50 ? "Moderate" : "Light";

  const downloadOpsReport = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch("/api/pdf/operations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firmName,
          reportDate: new Date().toLocaleDateString(),
          healthScore: data.healthScore,
          healthBreakdown: data.healthBreakdown,
          categories: categories.map(c => ({ label: c.label, count: c.count, urgent: c.urgent, estMinutes: c.estMinutes })),
          totalItems, totalUrgent, totalHours, capacityPct,
          risks: data.risks.slice(0, 15).map(r => ({ label: r.label, household: r.household, severity: r.severity, category: r.category, daysStale: r.daysStale })),
          advisors: data.advisors.map(a => ({ name: a.name, households: a.households, openTasks: a.openTasks, overdueTasks: a.overdueTasks, unsigned: a.unsigned, compliancePct: a.compliancePct, score: a.score })),
          weeklyComparison: data.weeklyComparison,
          totalHouseholds: data.totalHouseholds,
          openTasks: data.openTasks,
          completedTasks: data.completedTasks,
          complianceReviews: data.complianceReviews,
          unsigned: data.unsigned,
        }),
      });
      const result = await res.json();
      if (result.success && result.pdf) {
        const link = document.createElement("a");
        link.href = result.pdf;
        link.download = result.filename;
        link.click();
      }
    } catch { /* swallow */ }
    setPdfLoading(false);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Operations Workload</h3>
          <p className="text-xs text-slate-400 mt-0.5">Task queue by category with capacity estimate</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={downloadOpsReport} disabled={pdfLoading} className="flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors disabled:opacity-50">
            {pdfLoading ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />} Ops Report
          </button>
          <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${capacityPct >= 80 ? "bg-red-100 text-red-600" : capacityPct >= 50 ? "bg-amber-100 text-amber-600" : "bg-green-100 text-green-600"}`}>
            {capacityLabel} Load
          </span>
        </div>
      </div>

      {/* Capacity bar */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100">
        <div className="flex items-center justify-between mb-1.5">
          <div className="flex items-center gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1"><Users size={12} /> {totalItems} items</span>
            {totalUrgent > 0 && <span className="flex items-center gap-1 text-red-500"><AlertTriangle size={12} /> {totalUrgent} urgent</span>}
            <span className="flex items-center gap-1"><Clock size={12} /> ~{totalHours}h estimated</span>
          </div>
          <span className="text-[10px] text-slate-400">{capacityPct}% of daily capacity</span>
        </div>
        <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all duration-700 ${capacityColor}`} style={{ width: `${capacityPct}%` }} />
        </div>
      </div>

      {/* Category rows */}
      <div>
        {active.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <CheckCircle size={24} className="text-green-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">All clear — no outstanding operations work</p>
          </div>
        ) : (
          <>
            {(expanded ? active : active.slice(0, 3)).map((cat, i) => (
              <div key={i} className="flex items-center gap-4 px-6 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <div className={`w-8 h-8 rounded-lg ${cat.bgColor} flex items-center justify-center`}>
                  <span className={`text-sm font-semibold ${cat.color}`}>{cat.count}</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{cat.label}</p>
                  <div className="flex items-center gap-3 mt-0.5">
                    {cat.urgent > 0 && <span className="text-[10px] text-red-500 font-medium">{cat.urgent} urgent</span>}
                    <span className="text-[10px] text-slate-400">~{cat.estMinutes} min estimated</span>
                  </div>
                </div>
                {/* Mini bar showing proportion */}
                <div className="w-20 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${cat.color.replace("text-", "bg-").replace("-600", "-400")}`}
                    style={{ width: `${totalItems > 0 ? Math.max(10, (cat.count / totalItems) * 100) : 0}%` }} />
                </div>
              </div>
            ))}
            {active.length > 3 && (
              <button onClick={() => setExpanded(e => !e)} className="w-full px-6 py-2 text-center text-[11px] text-slate-400 hover:text-slate-600 border-t border-slate-100">
                {expanded ? "Show less" : `Show ${active.length - 3} more`}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
