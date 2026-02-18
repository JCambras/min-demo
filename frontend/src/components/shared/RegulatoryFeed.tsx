"use client";
import { useState } from "react";
import { Scale, ChevronRight, X, Plus } from "lucide-react";
import { UPDATES, IMPACT_COLORS, AGENCY_COLORS, DISMISSED_KEY } from "@/lib/regulatory-updates";

// ─── Component ──────────────────────────────────────────────────────────────

export function RegulatoryFeed({ onAddCheck }: {
  onAddCheck?: (label: string, keyword: string) => void;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]")); } catch { return new Set(); }
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const dismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const visible = UPDATES.filter(u => !dismissed.has(u.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Scale size={14} className="text-slate-400" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Regulatory Updates</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">{visible.length}</span>
      </div>

      {visible.slice(0, 3).map(update => (
        <div key={update.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="mt-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${AGENCY_COLORS[update.agency]}`}>{update.agency}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-700">{update.title}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${IMPACT_COLORS[update.impact]}`}>{update.impact}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{new Date(update.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setExpanded(expanded === update.id ? null : update.id)}
                className="text-slate-300 hover:text-slate-500">
                <ChevronRight size={14} className={`transition-transform ${expanded === update.id ? "rotate-90" : ""}`} />
              </button>
              <button onClick={() => dismiss(update.id)} className="text-slate-300 hover:text-slate-500">
                <X size={14} />
              </button>
            </div>
          </div>

          {expanded === update.id && (
            <div className="px-4 pb-3 border-t border-slate-100 pt-3 animate-fade-in">
              <p className="text-xs text-slate-600 mb-2">{update.summary}</p>
              <div className="bg-slate-50 rounded-lg p-2.5 mb-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Action Required</p>
                <p className="text-xs text-slate-600">{update.actionRequired}</p>
              </div>
              {update.checkSuggestion && onAddCheck && (
                <button onClick={() => { onAddCheck(update.checkSuggestion!.label, update.checkSuggestion!.keyword); dismiss(update.id); }}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1">
                  <Plus size={10} /> Add compliance check
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
