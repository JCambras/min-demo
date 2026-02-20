"use client";
import { useState } from "react";
import { ArrowUpDown, StickyNote, AlertTriangle } from "lucide-react";
import { loadNotes } from "@/lib/types";
import { MiniHealthRing } from "./DashboardPrimitives";
import { DEMO_HOUSEHOLDS, type DemoHouseholdHealth } from "@/lib/demo-data";
import type { Screen, WorkflowContext } from "@/lib/types";

type SortKey = "health" | "aum" | "name" | "aumHealth";

const STATUS_PILLS: Record<string, { label: string; cls: string }> = {
  "on-track": { label: "On track", cls: "bg-green-100 text-green-700" },
  "needs-attention": { label: "Needs attention", cls: "bg-amber-100 text-amber-700" },
  "at-risk": { label: "At risk", cls: "bg-red-100 text-red-700" },
};

function borderColor(score: number) {
  if (score >= 80) return "border-l-green-400";
  if (score >= 60) return "border-l-amber-400";
  return "border-l-red-400";
}

function fmtAum(v: number) {
  return `$${(v / 1_000_000).toFixed(1)}M`;
}

export function HouseholdHealthCards({ onNavigate, dataQualityByHousehold }: {
  onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void;
  dataQualityByHousehold?: Record<string, { score: number; flags: string[] }>;
}) {
  const [sort, setSort] = useState<SortKey>("health");
  const allNotes = typeof window !== "undefined" ? loadNotes() : [];
  const notesByHousehold = new Map<string, number>();
  const holdByHousehold = new Set<string>();
  for (const n of allNotes) {
    notesByHousehold.set(n.householdId, (notesByHousehold.get(n.householdId) || 0) + 1);
    if (n.category === "hold") holdByHousehold.add(n.householdId);
  }

  const sorted = [...DEMO_HOUSEHOLDS].sort((a, b) => {
    if (sort === "health") return a.healthScore - b.healthScore;
    if (sort === "aum") return b.aum - a.aum;
    if (sort === "aumHealth") return (b.aum * (100 - b.healthScore)) - (a.aum * (100 - a.healthScore));
    return a.name.localeCompare(b.name);
  });

  const cycleSort = () => setSort(prev => prev === "health" ? "aum" : prev === "aum" ? "aumHealth" : prev === "aumHealth" ? "name" : "health");
  const sortLabel = sort === "health" ? "Health" : sort === "aum" ? "AUM" : sort === "aumHealth" ? "AUM Health" : "Name";

  const handleClick = (hh: DemoHouseholdHealth) => {
    if (onNavigate) {
      onNavigate("family" as Screen, {
        householdId: hh.id,
        familyName: hh.name.replace(" Household", ""),
      });
    }
  };

  return (
    <div data-tour="household-cards">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-slate-700">Household Health</h3>
          <p className="text-xs text-slate-400">{DEMO_HOUSEHOLDS.length} households</p>
        </div>
        <button onClick={cycleSort} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600 transition-colors">
          <ArrowUpDown size={11} /> {sortLabel}
        </button>
      </div>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {sorted.map(hh => {
          const pill = STATUS_PILLS[hh.status];
          return (
            <button
              key={hh.id}
              onClick={() => handleClick(hh)}
              className={`border-l-4 ${borderColor(hh.healthScore)} bg-white border border-slate-200 rounded-xl p-4 text-left hover:shadow-md hover:border-slate-300 transition-all group`}
            >
              <div className="flex items-start gap-3">
                <MiniHealthRing score={hh.healthScore} size={52} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-slate-800 truncate group-hover:text-slate-900">
                    {hh.name.replace(" Household", "")}
                  </p>
                  <p className="text-xs tabular-nums text-slate-400">{fmtAum(hh.aum)}</p>
                  <p className="text-[10px] text-slate-400 truncate">{hh.advisor}</p>
                </div>
              </div>
              <div className="mt-2 flex items-center gap-1.5">
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${pill.cls}`}>
                  {pill.label}
                </span>
                {(notesByHousehold.get(hh.id) || 0) > 0 && (
                  <StickyNote size={11} className={holdByHousehold.has(hh.id) ? "text-amber-500" : "text-slate-400"} />
                )}
                {dataQualityByHousehold && dataQualityByHousehold[hh.id]?.score < 60 && (
                  <span title={dataQualityByHousehold[hh.id].flags.join("; ")}>
                    <AlertTriangle size={11} className="text-amber-500" />
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
