"use client";
import { useState } from "react";
import { TrendingUp, AlertTriangle } from "lucide-react";
import type { PracticeData } from "../usePracticeData";
import { DetailDrawer } from "./DashboardPrimitives";

export function PipelineSection({ data, detailPanel, toggleDetail, goToFamily }: {
  data: PracticeData;
  detailPanel: string | null;
  toggleDetail: (id: string) => void;
  goToFamily: (householdId: string, name: string) => void;
}) {
  const [expandedPipeline, setExpandedPipeline] = useState<number | null>(null);
  const [showAllPipeline, setShowAllPipeline] = useState(false);

  return (
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
                <DetailDrawer id={`vel-${i}`} activeId={detailPanel}>
                  {isLast ? (
                    <p className="text-xs text-slate-600"><strong>{stage.count} households</strong> have completed all stages (DocuSign signed, compliance reviewed, initial meeting held). These are fully active clients.</p>
                  ) : stage.count > 0 ? (
                    <p className="text-xs text-slate-600"><strong>{stage.label}</strong>: {stage.count} households averaging {stage.avgDays} days in this stage (benchmark: {stage.benchmarkDays}d). {stage.stuck > 0 ? `${stage.stuck} are stuck (>${stage.benchmarkDays}d).` : "None stuck."} {stage.conversionRate}% of all households have progressed past this point.</p>
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
  );
}
