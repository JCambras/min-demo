"use client";
import { useState } from "react";
import { Activity, CheckCircle } from "lucide-react";
import type { PracticeData } from "../usePracticeData";
import { SeverityBadge } from "./DashboardPrimitives";

export function RiskRadar({ data, goToFamily, goToCompliance }: {
  data: PracticeData;
  goToFamily: (householdId: string, name: string) => void;
  goToCompliance: (householdId: string, name: string) => void;
}) {
  const [riskFilter, setRiskFilter] = useState<"all" | "critical" | "high" | "medium">("all");
  const [showAllRisks, setShowAllRisks] = useState(false);

  return (
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
  );
}
