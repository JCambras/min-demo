"use client";
import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import type { PracticeData, AdvisorScore } from "../usePracticeData";

export function AdvisorScoreboard({ data, advisorName, isAdvisor }: {
  data: PracticeData;
  advisorName?: string;
  isAdvisor: boolean;
}) {
  const [scoreboardView, setScoreboardView] = useState<"team" | "individual" | "my">(isAdvisor ? "my" : "team");

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">{scoreboardView === "my" ? "My Scorecard" : "Advisor Scoreboard"}</h3>
          <p className="text-xs text-slate-400 mt-0.5">{scoreboardView === "my" ? "Your personal performance metrics" : "Performance by assigned advisor"}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            {advisorName && <button onClick={() => setScoreboardView("my")} className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${scoreboardView === "my" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>My Scorecard</button>}
            {!isAdvisor && <button onClick={() => setScoreboardView("team")} className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${scoreboardView === "team" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>Team</button>}
            <button onClick={() => setScoreboardView("individual")} className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${scoreboardView === "individual" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>Individual</button>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">{data.advisors.length} advisors</span>
        </div>
      </div>

      {/* Table header */}
      {scoreboardView !== "my" && (
      <div className="grid grid-cols-8 gap-2 px-6 py-2.5 bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 font-medium">
        <span className="col-span-2">{scoreboardView === "team" ? "Metric" : "Advisor"}</span>
        <span className="text-center">Households</span>
        <span className="text-center">Open</span>
        <span className="text-center">Overdue</span>
        <span className="text-center">Unsigned</span>
        <span className="text-center">Compliance</span>
        <span className="text-center">Score</span>
      </div>
      )}

      {/* My Scorecard View */}
      {scoreboardView === "my" && (() => {
        const me = data.advisors.find(a => a.name === advisorName);
        const teamAvg = (field: (a: AdvisorScore) => number) => {
          const named = data.advisors.filter(a => a.name !== "Unassigned");
          return named.length ? Math.round(named.reduce((s, a) => s + field(a), 0) / named.length) : 0;
        };
        if (!me) return <div className="px-6 py-8 text-center text-sm text-slate-400">No data found for {advisorName}. Check advisor assignments.</div>;
        const metrics = [
          { label: "Households", value: me.households, avg: teamAvg(a => a.households), unit: "" },
          { label: "Open Tasks", value: me.openTasks, avg: teamAvg(a => a.openTasks), unit: "", lowerBetter: true },
          { label: "Overdue", value: me.overdueTasks, avg: teamAvg(a => a.overdueTasks), unit: "", lowerBetter: true },
          { label: "Unsigned Envelopes", value: me.unsigned, avg: teamAvg(a => a.unsigned), unit: "", lowerBetter: true },
          { label: "Compliance Coverage", value: me.compliancePct, avg: teamAvg(a => a.compliancePct), unit: "%" },
          { label: "Meetings (90d)", value: me.meetingsLast90, avg: teamAvg(a => a.meetingsLast90), unit: "" },
        ];
        const scoreColor = me.score >= 80 ? "text-green-600" : me.score >= 60 ? "text-amber-600" : "text-red-600";
        const scoreBg = me.score >= 80 ? "from-green-50 to-emerald-50" : me.score >= 60 ? "from-amber-50 to-orange-50" : "from-red-50 to-rose-50";
        return (
          <div className="p-6">
            {/* Score hero */}
            <div className="flex items-center gap-6 mb-6">
              <div className={`w-20 h-20 rounded-2xl bg-gradient-to-br ${scoreBg} flex items-center justify-center`}>
                <span className={`text-3xl font-light ${scoreColor}`}>{me.score}</span>
              </div>
              <div>
                <p className="text-lg font-medium text-slate-800">{me.name}</p>
                <p className="text-sm text-slate-400">{me.households} households · Composite score {me.score}/100</p>
                {me.score >= teamAvg(a => a.score)
                  ? <p className="text-xs text-green-600 mt-1 font-medium">Above team average ({teamAvg(a => a.score)})</p>
                  : <p className="text-xs text-amber-600 mt-1 font-medium">Team average is {teamAvg(a => a.score)} — {teamAvg(a => a.score) - me.score} points of capacity</p>
                }
              </div>
            </div>

            {/* Metric rows with team comparison */}
            <div className="space-y-3">
              {metrics.map((m, i) => {
                const better = m.lowerBetter ? m.value <= m.avg : m.value >= m.avg;
                return (
                  <div key={i} className="flex items-center gap-4">
                    <span className="text-sm text-slate-600 w-40">{m.label}</span>
                    <div className="flex-1 flex items-center gap-3">
                      <span className={`text-sm font-medium ${better ? "text-green-700" : "text-amber-700"}`}>{m.value}{m.unit}</span>
                      <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden relative">
                        {/* Team average marker */}
                        <div className="absolute top-0 bottom-0 w-0.5 bg-slate-400 z-10" style={{ left: `${Math.min((m.avg / Math.max(m.value, m.avg, 1)) * 100, 100)}%` }} />
                        <div className={`h-full rounded-full transition-all duration-500 ${better ? "bg-green-400" : "bg-amber-400"}`}
                          style={{ width: `${Math.min((m.value / Math.max(m.value, m.avg, 1)) * 100, 100)}%` }} />
                      </div>
                      <span className="text-[10px] text-slate-400 w-16 text-right">avg {m.avg}{m.unit}</span>
                    </div>
                  </div>
                );
              })}
            </div>

            {me.meetingsLast90 === 0 && me.households > 0 && (
              <div className="mt-4 p-3 bg-amber-50 rounded-xl flex items-start gap-2">
                <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                <p className="text-[11px] text-amber-600">No meetings logged in the past 90 days. Recording meetings improves your composite score.</p>
              </div>
            )}
          </div>
        );
      })()}

      {scoreboardView === "team" ? (
        /* Team View: aggregate stats with ranges */
        (() => {
          const named = data.advisors.filter(a => a.name !== "Unassigned");
          if (named.length === 0) return <div className="px-6 py-8 text-center text-sm text-slate-400">No advisor assignments found.</div>;
          const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
          const range = (arr: number[]) => arr.length ? `${Math.min(...arr)}–${Math.max(...arr)}` : "—";
          const totalHH = named.reduce((s, a) => s + a.households, 0);
          const totalOpen = named.reduce((s, a) => s + a.openTasks, 0);
          const totalOverdue = named.reduce((s, a) => s + a.overdueTasks, 0);
          const totalUnsigned = named.reduce((s, a) => s + a.unsigned, 0);
          const avgComp = avg(named.map(a => a.compliancePct));
          const avgScore = avg(named.map(a => a.score));
          return (
            <>
              <div className="grid grid-cols-8 gap-2 px-6 py-3.5 border-b border-slate-100 items-center">
                <div className="col-span-2"><span className="text-sm font-medium text-slate-700">Team Total</span></div>
                <span className="text-sm text-slate-700 text-center font-medium">{totalHH}</span>
                <span className="text-sm text-slate-700 text-center font-medium">{totalOpen}</span>
                <span className={`text-sm text-center font-medium ${totalOverdue > 0 ? "text-red-600" : "text-slate-400"}`}>{totalOverdue}</span>
                <span className={`text-sm text-center font-medium ${totalUnsigned > 0 ? "text-blue-600" : "text-slate-400"}`}>{totalUnsigned}</span>
                <span className="text-sm text-center"><span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${avgComp >= 80 ? "bg-green-100 text-green-700" : avgComp >= 60 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{avgComp}%</span></span>
                <span className={`text-lg font-light text-center ${avgScore >= 80 ? "text-green-600" : avgScore >= 60 ? "text-amber-600" : "text-red-600"}`}>{avgScore}</span>
              </div>
              <div className="grid grid-cols-8 gap-2 px-6 py-3 border-b border-slate-100 items-center bg-slate-50/50">
                <div className="col-span-2"><span className="text-xs text-slate-400">Range across {named.length} advisors</span></div>
                <span className="text-xs text-slate-400 text-center">{range(named.map(a => a.households))}</span>
                <span className="text-xs text-slate-400 text-center">{range(named.map(a => a.openTasks))}</span>
                <span className="text-xs text-slate-400 text-center">{range(named.map(a => a.overdueTasks))}</span>
                <span className="text-xs text-slate-400 text-center">{range(named.map(a => a.unsigned))}</span>
                <span className="text-xs text-slate-400 text-center">{range(named.map(a => a.compliancePct))}%</span>
                <span className="text-xs text-slate-400 text-center">{range(named.map(a => a.score))}</span>
              </div>
              {named.some(a => a.meetingsLast90 === 0 && a.households > 0) && (
                <div className="px-6 py-3 bg-amber-50/50 border-t border-amber-100 flex items-start gap-2">
                  <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
                  <p className="text-[11px] text-amber-600">{named.filter(a => a.meetingsLast90 === 0 && a.households > 0).length} advisor(s) have no meetings logged in 90 days. Switch to Individual view for details.</p>
                </div>
              )}
            </>
          );
        })()
      ) : (
        /* Individual View: per-advisor rows */
        <>

      {data.advisors.map((a, i) => {
        const rowColor = a.score >= 80 ? "" : a.score >= 60 ? "bg-amber-50/50" : "bg-red-50/50";
        const isUnassigned = a.name === "Unassigned";
        return (
          <div key={i} className={`grid grid-cols-8 gap-2 px-6 py-3 border-b border-slate-50 last:border-0 items-center hover:bg-slate-50 transition-colors ${rowColor}`}>
            <div className="col-span-2 flex items-center gap-2">
              <div className={`w-2 h-2 rounded-full ${isUnassigned ? "bg-slate-300" : a.score >= 80 ? "bg-green-500" : a.score >= 60 ? "bg-amber-500" : "bg-red-500"}`} />
              <div>
                <span className={`text-sm font-medium ${isUnassigned ? "text-slate-400 italic" : "text-slate-700"}`}>{a.name}</span>
                {a.meetingsLast90 === 0 && a.households > 0 && !isUnassigned && (
                  <p className="text-[9px] text-amber-500 leading-tight">No meetings logged (90d)</p>
                )}
              </div>
            </div>
            <span className="text-sm text-slate-600 text-center">{a.households}</span>
            <span className="text-sm text-slate-600 text-center">{a.openTasks}</span>
            <span className={`text-sm text-center font-medium ${a.overdueTasks > 0 ? "text-red-600" : "text-slate-400"}`}>{a.overdueTasks}</span>
            <span className={`text-sm text-center font-medium ${a.unsigned > 0 ? "text-blue-600" : "text-slate-400"}`}>{a.unsigned}</span>
            <span className="text-sm text-center">
              <span className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-medium ${a.compliancePct >= 100 ? "bg-green-100 text-green-700" : a.compliancePct >= 50 ? "bg-amber-100 text-amber-700" : "bg-red-100 text-red-700"}`}>{a.compliancePct}%</span>
            </span>
            <span className="text-center">
              <span className={`text-lg font-light ${a.score >= 80 ? "text-green-600" : a.score >= 60 ? "text-amber-600" : "text-red-600"}`}>{a.score}</span>
            </span>
          </div>
        );
      })}

      {data.advisors.length === 0 && (
        <div className="px-6 py-8 text-center text-sm text-slate-400">No advisor assignments found. Assign advisors during onboarding.</div>
      )}

      {/* Data quality note */}
      {data.advisors.some(a => a.name === "Unassigned" && a.households > 0) && (
        <div className="px-6 py-3 bg-amber-50/50 border-t border-amber-100 flex items-start gap-2">
          <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
          <p className="text-[11px] text-amber-600">
            {data.advisors.find(a => a.name === "Unassigned")?.households} household(s) have no advisor assigned.
            Assign advisors during onboarding or run <span className="font-medium">Seed Demo Data</span> from Settings.
          </p>
        </div>
      )}

      {/* Team Average */}
      {data.advisors.length > 1 && (() => {
        const avg = (arr: number[]) => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : 0;
        return (
          <div className="grid grid-cols-8 gap-2 px-6 py-3 bg-slate-50 items-center border-t border-slate-200">
            <div className="col-span-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-slate-400" />
              <span className="text-sm font-semibold text-slate-500">Team Average</span>
            </div>
            <span className="text-sm text-slate-500 text-center font-medium">{avg(data.advisors.map(a => a.households))}</span>
            <span className="text-sm text-slate-500 text-center font-medium">{avg(data.advisors.map(a => a.openTasks))}</span>
            <span className="text-sm text-slate-500 text-center font-medium">{avg(data.advisors.map(a => a.overdueTasks))}</span>
            <span className="text-sm text-slate-500 text-center font-medium">{avg(data.advisors.map(a => a.unsigned))}</span>
            <span className="text-sm text-center"><span className="inline-block px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-200 text-slate-600">{avg(data.advisors.map(a => a.compliancePct))}%</span></span>
            <span className="text-lg font-light text-slate-500 text-center">{avg(data.advisors.map(a => a.score))}</span>
          </div>
        );
      })()}
      </>
      )}
    </div>
  );
}
