"use client";
import { useState, useRef, useEffect } from "react";
import { Activity, CheckCircle, MoreVertical, Check, Clock, X, Eye, EyeOff } from "lucide-react";
import type { PracticeData, RiskItem, RiskDisposition } from "../usePracticeData";
import { SeverityBadge } from "./DashboardPrimitives";

type SnoozeOption = { label: string; days: number };
const SNOOZE_OPTIONS: SnoozeOption[] = [
  { label: "7 days", days: 7 },
  { label: "14 days", days: 14 },
  { label: "30 days", days: 30 },
];

function DispositionMenu({ risk, onDisposition, onClose }: {
  risk: RiskItem;
  onDisposition: (riskId: string, action: "resolved" | "snoozed" | "dismissed", reason: string, snoozeDays?: number) => void;
  onClose: () => void;
}) {
  const [mode, setMode] = useState<"menu" | "snooze" | "dismiss">("menu");
  const [reason, setReason] = useState("");
  const [snoozeDays, setSnoozeDays] = useState(7);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [onClose]);

  if (mode === "menu") {
    return (
      <div ref={ref} className="absolute right-0 top-8 z-20 w-48 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden animate-fade-in">
        <button onClick={() => { onDisposition(risk.id, "resolved", "Resolved"); onClose(); }}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-green-50 transition-colors">
          <Check size={12} className="text-green-500" /> Resolve
        </button>
        <button onClick={() => setMode("snooze")}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-blue-50 transition-colors">
          <Clock size={12} className="text-blue-500" /> Snooze...
        </button>
        <button onClick={() => setMode("dismiss")}
          className="w-full flex items-center gap-2 px-3 py-2.5 text-left text-xs text-slate-700 hover:bg-slate-50 transition-colors border-t border-slate-100">
          <X size={12} className="text-slate-400" /> Dismiss...
        </button>
      </div>
    );
  }

  return (
    <div ref={ref} className="absolute right-0 top-8 z-20 w-64 bg-white border border-slate-200 rounded-xl shadow-lg p-3 animate-fade-in">
      <p className="text-xs font-medium text-slate-700 mb-2">{mode === "snooze" ? "Snooze" : "Dismiss"} this alert</p>
      {mode === "snooze" && (
        <div className="flex gap-1 mb-2">
          {SNOOZE_OPTIONS.map(opt => (
            <button key={opt.days} onClick={() => setSnoozeDays(opt.days)}
              className={`text-[10px] px-2 py-1 rounded-lg font-medium transition-colors ${snoozeDays === opt.days ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
              {opt.label}
            </button>
          ))}
        </div>
      )}
      <textarea
        value={reason} onChange={e => setReason(e.target.value)}
        placeholder="Reason (e.g., client hospitalized)"
        className="w-full text-xs border border-slate-200 rounded-lg p-2 h-16 resize-none focus:outline-none focus:ring-1 focus:ring-slate-300 mb-2"
      />
      <div className="flex gap-2">
        <button onClick={onClose} className="text-[10px] px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50">Cancel</button>
        <button
          onClick={() => { onDisposition(risk.id, mode === "snooze" ? "snoozed" : "dismissed", reason || `${mode} by user`, mode === "snooze" ? snoozeDays : undefined); onClose(); }}
          className="text-[10px] px-3 py-1.5 rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex-1">
          {mode === "snooze" ? `Snooze ${snoozeDays}d` : "Dismiss"}
        </button>
      </div>
    </div>
  );
}

export function RiskRadar({ data, goToFamily, goToCompliance, onDisposition }: {
  data: PracticeData;
  goToFamily: (householdId: string, name: string) => void;
  goToCompliance: (householdId: string, name: string) => void;
  onDisposition?: (riskId: string, action: "resolved" | "snoozed" | "dismissed", reason: string, snoozeDays?: number) => void;
}) {
  const [riskFilter, setRiskFilter] = useState<"all" | "critical" | "high" | "medium">("all");
  const [showAllRisks, setShowAllRisks] = useState(false);
  const [menuRiskId, setMenuRiskId] = useState<string | null>(null);
  const [showSuppressed, setShowSuppressed] = useState(false);

  const handleDisposition = (riskId: string, action: "resolved" | "snoozed" | "dismissed", reason: string, snoozeDays?: number) => {
    if (onDisposition) onDisposition(riskId, action, reason, snoozeDays);
  };

  // When showing suppressed, show all risks including dispositioned ones
  const displaySource = showSuppressed ? data.allRisks : data.risks;

  return (
    <div data-tour="risk-radar" className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <Activity size={16} className="text-red-500" />
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Risk Radar</h3>
          <p className="text-xs text-slate-400">Items requiring immediate attention</p>
        </div>
        <div className="flex-1" />
        <span className="text-xs px-2.5 py-1 rounded-full bg-red-100 text-red-600 font-medium">{data.risks.length}</span>
        {data.dispositionedCount > 0 && (
          <button onClick={() => setShowSuppressed(!showSuppressed)}
            className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
            {showSuppressed ? <EyeOff size={11} /> : <Eye size={11} />}
            {data.dispositionedCount} suppressed
          </button>
        )}
      </div>

      {/* Severity filter pills */}
      {displaySource.length > 3 && (
        <div className="px-5 py-2 border-b border-slate-100 flex items-center gap-1.5">
          {(["all", "critical", "high", "medium"] as const).map(f => {
            const count = f === "all" ? displaySource.length : displaySource.filter(r => r.severity === f).length;
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
        const filteredRisks = riskFilter === "all" ? displaySource : displaySource.filter(r => r.severity === riskFilter);
        const displayRisks = showAllRisks ? filteredRisks : filteredRisks.slice(0, 10);
        const dispositionedIds = new Set(data.riskDispositions.map(d => d.riskId));

        return filteredRisks.length === 0 ? (
          <div className="px-5 py-8 text-center">
            <CheckCircle size={28} className="text-green-500 mx-auto mb-2" />
            <p className="text-sm text-slate-500">All clear — no risks detected</p>
          </div>
        ) : (<>
          {displayRisks.map((r, i) => {
            const isSuppressed = dispositionedIds.has(r.id);
            return (
            <div key={i} className={`flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors ${isSuppressed ? "opacity-40" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <SeverityBadge severity={r.severity} />
                  <span className="text-[10px] text-slate-400">{r.category}</span>
                  {isSuppressed && <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">suppressed</span>}
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
                {onDisposition && !isSuppressed && (
                  <div className="relative">
                    <button onClick={() => setMenuRiskId(menuRiskId === r.id ? null : r.id)}
                      className="w-6 h-6 rounded-lg flex items-center justify-center text-slate-300 hover:text-slate-600 hover:bg-slate-100 transition-colors">
                      <MoreVertical size={14} />
                    </button>
                    {menuRiskId === r.id && (
                      <DispositionMenu risk={r} onDisposition={handleDisposition} onClose={() => setMenuRiskId(null)} />
                    )}
                  </div>
                )}
              </div>
            </div>
            );
          })}
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
