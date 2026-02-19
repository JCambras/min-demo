"use client";
import { useState } from "react";
import { HelpCircle, CheckCircle, Undo2 } from "lucide-react";
import { MiniHealthRing } from "@/app/dashboard/components/DashboardPrimitives";
import { useDemoMode } from "@/lib/demo-context";
import type { DemoHouseholdHealth } from "@/lib/demo-data";

export function WhyDecomposition({ household, showToast }: {
  household: DemoHouseholdHealth;
  showToast?: (msg: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const { markSentToCrm, undoCrmSend, sentToCrm } = useDemoMode();

  const handleSend = (actionId: string) => {
    markSentToCrm(actionId);
    showToast?.("Task created in Salesforce");
  };

  const handleUndo = (actionId: string) => {
    undoCrmSend(actionId);
    showToast?.("Task removed from Salesforce");
  };

  return (
    <div>
      <button
        data-tour="why-button"
        onClick={() => setOpen(!open)}
        className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 transition-colors"
      >
        <HelpCircle size={14} />
        <span>Why this score?</span>
      </button>

      {open && (
        <div className="mt-4 bg-white border border-slate-200 rounded-2xl overflow-hidden animate-fade-in">
          {/* Score Header */}
          <div className="px-5 py-4 flex items-center gap-4 border-b border-slate-100">
            <MiniHealthRing score={household.healthScore} size={48} />
            <div>
              <p className="text-sm font-medium text-slate-800">{household.name.replace(" Household", "")} Health Score</p>
              <p className="text-xs text-slate-400">Weighted composite of 4 factors</p>
            </div>
          </div>

          {/* Breakdown Table */}
          <div className="px-5 py-4 space-y-3">
            {household.breakdown.map((b, i) => {
              const barColor = b.score >= 80 ? "bg-green-400" : b.score >= 60 ? "bg-amber-400" : "bg-red-400";
              return (
                <div key={i}>
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-xs font-medium text-slate-700">{b.label}</p>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] text-slate-400">{b.weight}%</span>
                      <span className="text-xs font-medium text-slate-600">{b.score}</span>
                    </div>
                  </div>
                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${b.score}%` }} />
                  </div>
                  <p className="text-[10px] text-slate-400 mt-0.5">{b.detail}</p>
                </div>
              );
            })}
          </div>

          {/* Suggested Actions */}
          {household.suggestedActions.length > 0 && (
            <>
              <div className="border-t border-slate-100" />
              <div className="px-5 py-4" data-tour="suggested-actions">
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mb-3">Suggested Actions</p>
                <div className="space-y-2.5">
                  {household.suggestedActions.map(action => {
                    const isSent = sentToCrm.has(action.id);
                    return (
                      <div key={action.id} className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm text-slate-700">{action.label}</p>
                          <p className="text-[11px] text-slate-400">{action.detail}</p>
                        </div>
                        <div className="flex-shrink-0">
                          {isSent ? (
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 text-[11px] text-green-600 font-medium">
                                <CheckCircle size={12} /> Sent
                              </span>
                              <button onClick={() => handleUndo(action.id)} className="inline-flex items-center gap-0.5 text-[11px] text-slate-400 hover:text-slate-600 transition-colors">
                                <Undo2 size={11} /> Undo
                              </button>
                            </div>
                          ) : (
                            <button
                              onClick={() => handleSend(action.id)}
                              className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors whitespace-nowrap"
                            >
                              Send to CRM
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
