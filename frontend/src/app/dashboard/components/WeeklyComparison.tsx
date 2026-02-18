"use client";
import { useState } from "react";
import { TrendingUp, Activity } from "lucide-react";
import type { PracticeData, WeeklyMetric } from "../usePracticeData";
import { DetailDrawer, Delta } from "./DashboardPrimitives";

function Sparkline({ data, width = 140, height = 32 }: { data: number[]; width?: number; height?: number }) {
  if (data.length < 2) return null;
  const max = Math.max(...data, 1);
  const pad = 2;
  const w = width - pad * 2;
  const h = height - pad * 2;
  const points = data.map((v, i) => ({
    x: pad + (i / (data.length - 1)) * w,
    y: pad + h - (v / max) * h,
  }));
  const pathD = points.map((p, i) => `${i === 0 ? "M" : "L"}${p.x},${p.y}`).join(" ");
  const areaD = `${pathD} L${points[points.length - 1].x},${height} L${points[0].x},${height} Z`;

  // Trend direction for color
  const recent = data.slice(-3).reduce((s, v) => s + v, 0);
  const earlier = data.slice(0, 3).reduce((s, v) => s + v, 0);
  const color = recent >= earlier ? "#22c55e" : "#ef4444";
  const fill = recent >= earlier ? "#22c55e15" : "#ef444415";

  return (
    <svg width={width} height={height} className="flex-shrink-0">
      <path d={areaD} fill={fill} />
      <path d={pathD} fill="none" stroke={color} strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
      <circle cx={points[points.length - 1].x} cy={points[points.length - 1].y} r={2.5} fill={color} />
    </svg>
  );
}

function TrendDrawer({ metric, range }: { metric: WeeklyMetric; range: number }) {
  const weeks = metric.history.slice(-range);
  const avg = weeks.length > 0 ? Math.round(weeks.reduce((s, v) => s + v, 0) / weeks.length * 10) / 10 : 0;
  const max = Math.max(...weeks, 0);
  const min = Math.min(...weeks);
  const total = weeks.reduce((s, v) => s + v, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-4">
        <Sparkline data={weeks} width={200} height={40} />
        <div className="flex-1 grid grid-cols-4 gap-3 text-center">
          <div>
            <p className="text-lg font-light text-slate-900">{total}</p>
            <p className="text-[10px] text-slate-400">Total</p>
          </div>
          <div>
            <p className="text-lg font-light text-slate-900">{avg}</p>
            <p className="text-[10px] text-slate-400">Avg/wk</p>
          </div>
          <div>
            <p className="text-lg font-light text-green-600">{max}</p>
            <p className="text-[10px] text-slate-400">Peak</p>
          </div>
          <div>
            <p className="text-lg font-light text-slate-500">{min}</p>
            <p className="text-[10px] text-slate-400">Low</p>
          </div>
        </div>
      </div>
      {/* Week-by-week bar chart */}
      <div className="flex items-end gap-1 h-10">
        {weeks.map((v, i) => {
          const barMax = Math.max(...weeks, 1);
          const pct = (v / barMax) * 100;
          return (
            <div key={i} className="flex-1 flex flex-col items-center gap-0.5">
              <div className="w-full rounded-sm bg-blue-400/70 transition-all" style={{ height: `${Math.max(pct, 4)}%` }} />
              {i === weeks.length - 1 && <span className="text-[8px] text-slate-400">now</span>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function WeeklyComparison({ data, detailPanel, toggleDetail }: {
  data: PracticeData;
  detailPanel: string | null;
  toggleDetail: (id: string) => void;
}) {
  const [range, setRange] = useState<4 | 8 | 12>(12);

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <TrendingUp size={16} className="text-green-500" />
          <div>
            <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Weekly Trends</h3>
            <p className="text-xs text-slate-400">7-day rolling comparison with history</p>
          </div>
        </div>
        <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
          {([4, 8, 12] as const).map(r => (
            <button key={r} onClick={() => setRange(r)}
              className={`text-[10px] px-2 py-1 rounded-md font-medium transition-all ${range === r ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>
              {r}w
            </button>
          ))}
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        {data.weeklyComparison.map((w, i) => (
          <div key={i}>
            <button onClick={() => toggleDetail(`week-${i}`)} className="w-full flex items-center justify-between px-5 py-4 hover:bg-slate-50 transition-colors">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-600">{w.label}<span className="text-slate-300 ml-1">▾</span></span>
                <Sparkline data={w.history.slice(-range)} width={80} height={20} />
              </div>
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
                <TrendDrawer metric={w} range={range} />
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
