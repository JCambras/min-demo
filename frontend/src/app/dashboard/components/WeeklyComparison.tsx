"use client";
import { TrendingUp, Activity } from "lucide-react";
import type { PracticeData } from "../usePracticeData";
import { DetailDrawer, ComingSoon, Delta } from "./DashboardPrimitives";

export function WeeklyComparison({ data, detailPanel, toggleDetail }: {
  data: PracticeData;
  detailPanel: string | null;
  toggleDetail: (id: string) => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <TrendingUp size={16} className="text-green-500" />
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">This Week vs Last</h3>
          <p className="text-xs text-slate-400">7-day rolling comparison</p>
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        {data.weeklyComparison.map((w, i) => (
          <div key={i}>
            <button onClick={() => toggleDetail(`week-${i}`)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
              <span className="text-sm text-slate-600">{w.label}<span className="text-slate-300 ml-1">▾</span></span>
              <div className="flex items-center gap-4">
                <div className="text-right">
                  <p className="text-lg font-light text-slate-900">{w.thisWeek}</p>
                  <p className="text-[10px] text-slate-400">this week</p>
                </div>
                <div className="text-right w-12">
                  <p className="text-sm text-slate-400">{w.lastWeek}</p>
                  <p className="text-[10px] text-slate-400">last</p>
                </div>
                <div className="w-12 text-right">
                  <Delta thisWeek={w.thisWeek} lastWeek={w.lastWeek} />
                </div>
              </div>
            </button>
            <div className="px-5">
              <DetailDrawer id={`week-${i}`} activeId={detailPanel}>
                <ComingSoon />
              </DetailDrawer>
            </div>
          </div>
        ))}
      </div>

      {/* Summary bar */}
      <div className="px-5 py-3 bg-slate-50 flex items-center justify-center gap-2 text-xs text-slate-400">
        <Activity size={12} />
        <span>Last refreshed {new Date().toLocaleTimeString()}</span>
      </div>
    </div>
  );
}
