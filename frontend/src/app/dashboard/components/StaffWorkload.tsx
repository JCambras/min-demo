"use client";
import { useState } from "react";
import { Users, AlertTriangle, Clock, CheckCircle } from "lucide-react";
import type { PracticeData, OpsStaffScore } from "../usePracticeData";

export function StaffWorkload({ data }: { data: PracticeData }) {
  const [view, setView] = useState<"individual" | "team">("individual");
  const staff = data.opsStaff;

  if (staff.length === 0) return null;

  const avg = (fn: (s: OpsStaffScore) => number) => {
    return staff.length ? Math.round(staff.reduce((sum, s) => sum + fn(s), 0) / staff.length) : 0;
  };

  const scoreColor = (s: number) => s >= 80 ? "text-green-600" : s >= 60 ? "text-amber-600" : "text-red-600";
  const scoreBg = (s: number) => s >= 80 ? "bg-green-100" : s >= 60 ? "bg-amber-100" : "bg-red-100";
  const dotColor = (s: number) => s >= 80 ? "bg-green-500" : s >= 60 ? "bg-amber-500" : "bg-red-500";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Staff Workload</h3>
          <p className="text-xs text-slate-400 mt-0.5">Operations staff capacity and throughput</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
            <button onClick={() => setView("individual")} className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${view === "individual" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>Individual</button>
            <button onClick={() => setView("team")} className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all ${view === "team" ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>Team</button>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-500">{staff.length} staff</span>
        </div>
      </div>

      {/* Table header */}
      <div className="grid grid-cols-9 gap-2 px-6 py-2.5 bg-slate-50 text-[10px] uppercase tracking-widest text-slate-400 font-medium">
        <span className="col-span-2">{view === "team" ? "Metric" : "Staff"}</span>
        <span className="text-center">Open</span>
        <span className="text-center">Overdue</span>
        <span className="text-center">Done/wk</span>
        <span className="text-center">Avg Age</span>
        <span className="text-center">Onboard</span>
        <span className="text-center">DocuSign</span>
        <span className="text-center">Score</span>
      </div>

      {view === "team" ? (
        <>
          <div className="grid grid-cols-9 gap-2 px-6 py-3.5 border-b border-slate-100 items-center">
            <div className="col-span-2"><span className="text-sm font-medium text-slate-700">Team Total</span></div>
            <span className="text-sm text-slate-700 text-center font-medium">{staff.reduce((s, o) => s + o.openTasks, 0)}</span>
            <span className={`text-sm text-center font-medium ${staff.reduce((s, o) => s + o.overdueTasks, 0) > 0 ? "text-red-600" : "text-slate-400"}`}>{staff.reduce((s, o) => s + o.overdueTasks, 0)}</span>
            <span className="text-sm text-slate-700 text-center font-medium">{staff.reduce((s, o) => s + o.completedThisWeek, 0)}</span>
            <span className="text-sm text-slate-700 text-center font-medium">{avg(s => s.avgTaskAgeDays)}d</span>
            <span className="text-sm text-slate-700 text-center font-medium">{staff.reduce((s, o) => s + o.onboardings, 0)}</span>
            <span className="text-sm text-slate-700 text-center font-medium">{staff.reduce((s, o) => s + o.docusign, 0)}</span>
            <span className={`text-lg font-light text-center ${scoreColor(avg(s => s.score))}`}>{avg(s => s.score)}</span>
          </div>
          {staff.some(s => s.overdueTasks > 0) && (
            <div className="px-6 py-3 bg-amber-50/50 border-t border-amber-100 flex items-start gap-2">
              <AlertTriangle size={13} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <p className="text-[11px] text-amber-600">{staff.filter(s => s.overdueTasks > 0).length} staff member(s) have overdue tasks. Consider redistributing workload.</p>
            </div>
          )}
        </>
      ) : (
        <>
          {staff.map((s, i) => {
            const rowColor = s.score >= 80 ? "" : s.score >= 60 ? "bg-amber-50/50" : "bg-red-50/50";
            return (
              <div key={i} className={`grid grid-cols-9 gap-2 px-6 py-3 border-b border-slate-50 last:border-0 items-center hover:bg-slate-50 transition-colors ${rowColor}`}>
                <div className="col-span-2 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${dotColor(s.score)}`} />
                  <div>
                    <span className="text-sm font-medium text-slate-700">{s.name}</span>
                    {s.avgTaskAgeDays > 7 && (
                      <p className="text-[9px] text-amber-500 leading-tight">Avg task age {s.avgTaskAgeDays}d</p>
                    )}
                  </div>
                </div>
                <span className="text-sm text-slate-600 text-center">{s.openTasks}</span>
                <span className={`text-sm text-center font-medium ${s.overdueTasks > 0 ? "text-red-600" : "text-slate-400"}`}>{s.overdueTasks}</span>
                <span className={`text-sm text-center font-medium ${s.completedThisWeek > 0 ? "text-green-600" : "text-slate-400"}`}>{s.completedThisWeek}</span>
                <span className="text-sm text-slate-600 text-center">{s.avgTaskAgeDays}d</span>
                <span className="text-sm text-slate-600 text-center">{s.onboardings}</span>
                <span className="text-sm text-slate-600 text-center">{s.docusign}</span>
                <span className="text-center">
                  <span className={`text-lg font-light ${scoreColor(s.score)}`}>{s.score}</span>
                </span>
              </div>
            );
          })}

          {/* Team Average footer */}
          {staff.length > 1 && (
            <div className="grid grid-cols-9 gap-2 px-6 py-3 bg-slate-50 items-center border-t border-slate-200">
              <div className="col-span-2 flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-slate-400" />
                <span className="text-sm font-semibold text-slate-500">Team Average</span>
              </div>
              <span className="text-sm text-slate-500 text-center font-medium">{avg(s => s.openTasks)}</span>
              <span className="text-sm text-slate-500 text-center font-medium">{avg(s => s.overdueTasks)}</span>
              <span className="text-sm text-slate-500 text-center font-medium">{avg(s => s.completedThisWeek)}</span>
              <span className="text-sm text-slate-500 text-center font-medium">{avg(s => s.avgTaskAgeDays)}d</span>
              <span className="text-sm text-slate-500 text-center font-medium">{avg(s => s.onboardings)}</span>
              <span className="text-sm text-slate-500 text-center font-medium">{avg(s => s.docusign)}</span>
              <span className="text-lg font-light text-slate-500 text-center">{avg(s => s.score)}</span>
            </div>
          )}
        </>
      )}
    </div>
  );
}
