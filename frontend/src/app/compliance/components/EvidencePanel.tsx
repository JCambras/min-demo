"use client";
import { Shield } from "lucide-react";
import type { SFEvidence } from "@/lib/types";

export function EvidencePanel({ evidence, showRightPane, onClose }: {
  evidence: SFEvidence[];
  showRightPane: boolean;
  onClose: () => void;
}) {
  return (
    <div className={`${showRightPane ? "fixed inset-0 z-50 bg-white" : "hidden"} lg:block lg:static lg:w-[30%] border-l border-slate-200 bg-white flex flex-col print:hidden`}>
      <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-slate-400">Compliance Log</p>
        <button onClick={onClose} aria-label="Close panel" className="lg:hidden text-slate-400 hover:text-slate-600">✕</button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4">
        {evidence.length === 0 ? (
          <div className="text-center mt-12"><Shield size={28} className="mx-auto text-slate-200 mb-3" /><p className="text-sm text-slate-400">Compliance activity will appear here</p><p className="text-xs text-slate-300 mt-1">Run a check to see results in real time.</p></div>
        ) : (
          <div className="space-y-1.5">
            {evidence.map((e, i) => (
              <div key={i} className="flex items-start gap-2 animate-fade-in">
                <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block truncate">{e.label} →</a>
                  ) : (
                    <p className="text-xs text-slate-500 truncate">{e.label}</p>
                  )}
                  {e.timestamp && <p className="text-[10px] text-slate-300">{e.timestamp}</p>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
