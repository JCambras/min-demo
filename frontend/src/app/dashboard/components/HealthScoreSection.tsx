"use client";
import { useState } from "react";
import { Loader2, Users, Shield, MessageSquare, Clock, Send, AlertTriangle, CheckCircle, Download, TrendingUp } from "lucide-react";
import type { PracticeData } from "../usePracticeData";
import { HealthRing, DetailDrawer, ComingSoon } from "./DashboardPrimitives";

// ─── Industry Benchmarks ────────────────────────────────────────────────────
// Source: IAA compliance survey, Schwab/Fidelity practice management data,
// FINRA exam deficiency rates (reverse-engineered). For firms with 100-500 HH.

const INDUSTRY_BENCHMARKS: Record<string, { avg: number; top: number; label: string }> = {
  "Compliance Coverage": { avg: 58, top: 85, label: "200-500 HH firms" },
  "DocuSign Velocity": { avg: 72, top: 92, label: "e-signature turnaround" },
  "Tasks On Time": { avg: 65, top: 88, label: "task completion rate" },
  "Meeting Coverage (90d)": { avg: 45, top: 75, label: "client meeting frequency" },
};

const OVERALL_BENCHMARK = { avg: 62, top: 85 };

export function HealthScoreSection({ data, detailPanel, toggleDetail, firmName }: {
  data: PracticeData;
  detailPanel: string | null;
  toggleDetail: (id: string) => void;
  firmName?: string;
}) {
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showAumWeighted, setShowAumWeighted] = useState(false);
  const displayScore = showAumWeighted ? data.aumWeightedHealthScore : data.healthScore;

  const downloadPDF = async () => {
    setPdfLoading(true);
    try {
      const res = await fetch("/api/pdf/dashboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          healthScore: data.healthScore, healthBreakdown: data.healthBreakdown,
          advisors: data.advisors, pipeline: data.pipeline, risks: data.risks.slice(0, 10),
          weeklyComparison: data.weeklyComparison, totalHouseholds: data.totalHouseholds,
          openTasks: data.openTasks, complianceReviews: data.complianceReviews,
          unsigned: data.unsigned, firmName: firmName || undefined,
        }),
      });
      const result = await res.json();
      if (result.success && result.pdf) {
        const link = document.createElement("a");
        link.href = result.pdf;
        link.download = result.filename;
        link.click();
      }
    } catch { /* */ }
    setPdfLoading(false);
  };

  return (
    <>
      {/* Practice Health Score */}
      <div className="bg-white border border-slate-200 rounded-2xl p-8">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <HealthRing score={displayScore} />
          <div className="flex-1 w-full">
            <div className="flex items-center justify-between mb-4">
              <div>
                <div className="flex items-center gap-3">
                  <h2 className="text-xl font-semibold text-slate-900">Practice Health Score</h2>
                  <button data-tour="aum-weight-toggle" onClick={() => setShowAumWeighted(!showAumWeighted)} title="Prioritizes high-value client health"
                    className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-colors ${showAumWeighted ? "bg-blue-500 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                    {showAumWeighted ? "AUM-Weighted" : "Equal Weight"}
                  </button>
                </div>
                <p className="text-sm text-slate-400 mt-0.5">{showAumWeighted ? "AUM-weighted composite — prioritizes high-value client health" : "Weighted composite of 4 operational metrics"}</p>
                {data.healthScore >= OVERALL_BENCHMARK.avg && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <TrendingUp size={12} className="text-green-500" />
                    <span className="text-[10px] text-green-600 font-medium">
                      {data.healthScore >= OVERALL_BENCHMARK.top ? "Top quartile" : "Above average"} — industry avg: {OVERALL_BENCHMARK.avg}
                    </span>
                  </div>
                )}
              </div>
              <button onClick={downloadPDF} disabled={pdfLoading} className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
                {pdfLoading ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                Weekly Report
              </button>
            </div>
            <div className="space-y-3">
              {data.healthBreakdown.map((b, i) => {
                const bench = INDUSTRY_BENCHMARKS[b.label];
                return (
                <div key={i}>
                  <button onClick={() => toggleDetail(`health-${i}`)} className="w-full text-left hover:bg-slate-50 rounded-lg px-2 py-1 -mx-2 transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-slate-600">{b.label}<span className="text-[10px] text-slate-300 ml-1.5">▾</span></span>
                      <div className="flex items-center gap-2">
                        {bench && (
                          <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${b.score >= bench.top ? "bg-green-100 text-green-600" : b.score >= bench.avg ? "bg-blue-100 text-blue-600" : "bg-amber-100 text-amber-600"}`}>
                            {b.score >= bench.top ? "Top quartile" : b.score >= bench.avg ? "Above avg" : "Below avg"}
                          </span>
                        )}
                        <span className="text-sm font-medium text-slate-700">{b.score}%<span className="text-xs text-slate-400 ml-1">({b.weight}% weight)</span></span>
                      </div>
                    </div>
                    <div className="relative w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all duration-700 ${b.score >= 80 ? "bg-green-500" : b.score >= 60 ? "bg-amber-500" : "bg-red-500"}`} style={{ width: `${b.score}%` }} />
                      {bench && <div className="absolute top-0 h-full w-0.5 bg-slate-400/50" style={{ left: `${bench.avg}%` }} title={`Industry avg: ${bench.avg}%`} />}
                    </div>
                    {bench && <p className="text-[10px] text-slate-300 mt-0.5">Industry avg: {bench.avg}% · Top quartile: {bench.top}%+ ({bench.label})</p>}
                  </button>
                  <DetailDrawer id={`health-${i}`} activeId={detailPanel}>
                    {b.label === "Compliance Coverage" ? (
                      <div>
                        <p className="text-xs text-slate-600 mb-1"><strong>{b.score}%</strong> of households have a completed compliance review.</p>
                        <p className="text-xs text-slate-400">This metric is weighted at {b.weight}% of your Health Score. Improve it by running compliance reviews on remaining households.</p>
                      </div>
                    ) : b.label === "Tasks On Time" ? (
                      <div>
                        <p className="text-xs text-slate-600 mb-1"><strong>{data.openTasks}</strong> open tasks, <strong>{b.score}%</strong> on-time rate based on overdue ratio.</p>
                        <p className="text-xs text-slate-400">Weighted at {b.weight}%. Reduce overdue tasks to improve this score.</p>
                      </div>
                    ) : <ComingSoon />}
                  </DetailDrawer>
                </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
        {[
          { label: "Households", value: data.totalHouseholds, Icon: Users, color: "text-slate-600", id: "stat-hh" },
          { label: "Open Tasks", value: data.openTasks, Icon: Clock, color: data.openTasks > 0 ? "text-amber-600" : "text-slate-600", id: "stat-open" },
          { label: "Unsigned", value: data.unsigned, Icon: Send, color: data.unsigned > 0 ? "text-blue-600" : "text-slate-600", id: "stat-unsigned" },
          { label: "Reviews", value: data.complianceReviews, Icon: Shield, color: "text-green-600", id: "stat-reviews" },
          { label: "Meetings", value: data.meetingNotes, Icon: MessageSquare, color: "text-purple-600", id: "stat-meetings" },
        ].map((s) => (
          <div key={s.id}>
            <button onClick={() => toggleDetail(s.id)} className="w-full bg-white border border-slate-200 rounded-xl p-4 text-center hover:border-slate-300 hover:shadow-sm transition-all">
              <s.Icon size={16} className={`${s.color} mx-auto mb-2`} />
              <p className={`text-2xl font-light ${s.color}`}>{s.value}</p>
              <p className="text-sm font-semibold text-slate-600 mt-1">{s.label}<span className="text-slate-300 ml-0.5">▾</span></p>
            </button>
            <DetailDrawer id={s.id} activeId={detailPanel}>
              {s.id === "stat-open" && data.openTaskItems.length > 0 ? (
                <div>
                  <p className="text-xs text-slate-500 mb-2">{data.openTasks} open tasks across {data.totalHouseholds} households</p>
                  <div className="space-y-1.5">
                    {data.openTaskItems.map(t => (
                      <div key={t.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-2 min-w-0">
                          {t.priority === "High" && <AlertTriangle size={10} className="text-red-500 flex-shrink-0" />}
                          <span className="text-xs text-slate-700 truncate">{t.subject}</span>
                        </div>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-[10px] text-slate-400">{t.household}</span>
                          <span className="text-[10px] text-slate-300">{t.daysOld}d</span>
                        </div>
                      </div>
                    ))}
                    {data.openTasks > 10 && <p className="text-[10px] text-slate-400 pt-1">+ {data.openTasks - 10} more</p>}
                  </div>
                </div>
              ) : s.id === "stat-unsigned" && data.unsignedItems.length > 0 ? (
                <div>
                  <p className="text-xs text-slate-500 mb-2">{data.unsigned} envelopes awaiting signature</p>
                  <div className="space-y-1.5">
                    {data.unsignedItems.map(t => (
                      <div key={t.id} className="flex items-center justify-between">
                        <span className="text-xs text-slate-700 truncate">{t.subject.replace(/^SEND DOCU — /, "DocuSign: ")}</span>
                        <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                          <span className="text-[10px] text-slate-400">{t.household}</span>
                          <span className={`text-[10px] font-medium ${t.daysOld > 7 ? "text-red-500" : "text-slate-400"}`}>{t.daysOld}d</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : s.id === "stat-reviews" && data.reviewItems.length > 0 ? (
                <div>
                  <p className="text-xs text-slate-500 mb-2">{data.complianceReviews} reviews · {data.totalHouseholds > 0 ? `${Math.round(data.complianceReviews / data.totalHouseholds * 100)}% coverage` : ""}</p>
                  <div className="space-y-1.5">
                    {data.reviewItems.map(t => (
                      <div key={t.id} className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5">
                          <CheckCircle size={10} className="text-green-500 flex-shrink-0" />
                          <span className="text-xs text-slate-700">{t.household}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{t.daysOld}d ago</span>
                      </div>
                    ))}
                    {data.complianceReviews > 10 && <p className="text-[10px] text-slate-400 pt-1">+ {data.complianceReviews - 10} more</p>}
                  </div>
                </div>
              ) : s.id === "stat-meetings" && data.meetingItems.length > 0 ? (
                <div>
                  <p className="text-xs text-slate-500 mb-2">{data.meetingNotes} meetings logged</p>
                  <div className="space-y-1.5">
                    {data.meetingItems.map(t => (
                      <div key={t.id} className="flex items-center justify-between">
                        <span className="text-xs text-slate-700 truncate">{t.subject.replace("MEETING NOTE — ", "")}</span>
                        <span className="text-[10px] text-slate-400">{t.daysOld}d ago</span>
                      </div>
                    ))}
                    {data.meetingNotes > 10 && <p className="text-[10px] text-slate-400 pt-1">+ {data.meetingNotes - 10} more</p>}
                  </div>
                </div>
              ) : s.id === "stat-hh" ? (
                <p className="text-xs text-slate-600">{data.totalHouseholds} households managed across {data.advisors.filter(a => a.name !== "Unassigned").length} advisors.</p>
              ) : <ComingSoon />}
            </DetailDrawer>
          </div>
        ))}
      </div>
    </>
  );
}
