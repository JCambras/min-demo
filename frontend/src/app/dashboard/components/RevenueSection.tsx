"use client";
import { DollarSign, BarChart3, Users } from "lucide-react";
import type { PracticeData } from "../usePracticeData";
import { DetailDrawer } from "./DashboardPrimitives";

export function RevenueSection({ data, detailPanel, toggleDetail }: {
  data: PracticeData;
  detailPanel: string | null;
  toggleDetail: (id: string) => void;
}) {
  return (
    <div className="bg-white border border-slate-200 rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Revenue Intelligence</h3>
          <p className="text-xs text-slate-400 mt-0.5">{data.fscAvailable && data.realAum ? `Real AUM from ${data.financialAccountCount} accounts` : `Estimated from ${data.totalHouseholds} households`} · {data.assumptions.feeScheduleBps}bps blended fee</p>
        </div>
        <DollarSign size={18} className="text-emerald-500" />
      </div>

      {/* Revenue headline cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        <button onClick={() => toggleDetail("rev-aum")} className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-4 text-left hover:shadow-sm transition-all">
          <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wider">Est. <abbr title="Assets Under Management" className="no-underline cursor-help">AUM</abbr><span className="text-emerald-400 ml-0.5">▾</span></p>
          <p className="text-2xl font-light text-emerald-700 mt-1">${(data.revenue.estimatedAum / 1_000_000).toFixed(0)}M</p>
        </button>
        <button onClick={() => toggleDetail("rev-fee")} className="bg-gradient-to-br from-emerald-50 to-green-50 border border-emerald-100 rounded-xl p-4 text-left hover:shadow-sm transition-all">
          <p className="text-[10px] text-emerald-600 font-medium uppercase tracking-wider">Annual Fee Income<span className="text-emerald-400 ml-0.5">▾</span></p>
          <p className="text-2xl font-light text-emerald-700 mt-1">${(data.revenue.annualFeeIncome / 1_000_000).toFixed(2)}M</p>
        </button>
        <button onClick={() => toggleDetail("rev-pipe")} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 text-left hover:shadow-sm transition-all">
          <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wider">Pipeline <abbr title="Assets Under Management" className="no-underline cursor-help">AUM</abbr><span className="text-blue-400 ml-0.5">▾</span></p>
          <p className="text-2xl font-light text-blue-700 mt-1">${(data.revenue.pipelineForecast.totalPipelineAum / 1_000_000).toFixed(1)}M</p>
        </button>
        <button onClick={() => toggleDetail("rev-proj")} className="bg-gradient-to-br from-blue-50 to-indigo-50 border border-blue-100 rounded-xl p-4 text-left hover:shadow-sm transition-all">
          <p className="text-[10px] text-blue-600 font-medium uppercase tracking-wider">Projected New Revenue<span className="text-blue-400 ml-0.5">▾</span></p>
          <p className="text-2xl font-light text-blue-700 mt-1">${(data.revenue.pipelineForecast.projectedNewRevenue / 1_000).toFixed(0)}K</p>
          <p className="text-[9px] text-blue-400 mt-0.5">{Math.round(data.assumptions.pipelineConversionRate * 100)}% conversion</p>
        </button>
      </div>

      {/* Revenue detail drawers */}
      <DetailDrawer id="rev-aum" activeId={detailPanel}>
        <p className="text-xs text-slate-600">{data.fscAvailable && data.realAum ? <>AUM = <strong>${(data.realAum / 1_000_000).toFixed(1)}M</strong> from {data.financialAccountCount} financial accounts in Salesforce FSC. This is live data from your custodial feed.</> : <>Estimated AUM = <strong>{data.totalHouseholds} households</strong> × <strong>${(data.assumptions.avgAumPerHousehold / 1_000_000).toFixed(1)}M</strong> average AUM per household. Connect FSC Financial Accounts for real AUM data.</>}</p>
      </DetailDrawer>
      <DetailDrawer id="rev-fee" activeId={detailPanel}>
        <p className="text-xs text-slate-600">Annual fee income = ${(data.revenue.estimatedAum / 1_000_000).toFixed(0)}M AUM × <strong>{data.assumptions.feeScheduleBps} basis points</strong> blended advisory fee = <strong>${(data.revenue.monthlyFeeIncome / 1_000).toFixed(0)}K/month</strong>. Adjust fee schedule to match your tiered pricing.</p>
      </DetailDrawer>
      <DetailDrawer id="rev-pipe" activeId={detailPanel}>
        <p className="text-xs text-slate-600">Pipeline AUM = <strong>{data.pipeline.reduce((s, st) => s + st.count, 0) - (data.pipeline[data.pipeline.length - 1]?.count || 0)} active pipeline households</strong> × ${(data.assumptions.pipelineAvgAum / 1_000_000).toFixed(1)}M average new client AUM. See Pipeline section below for stage breakdown.</p>
      </DetailDrawer>
      <DetailDrawer id="rev-proj" activeId={detailPanel}>
        <p className="text-xs text-slate-600">Projected revenue applies a <strong>{Math.round(data.assumptions.pipelineConversionRate * 100)}% conversion rate</strong> to pipeline AUM, then calculates annual fees at {data.assumptions.feeScheduleBps}bps. This is conservative — adjust conversion rate based on your historical close rate.</p>
      </DetailDrawer>

      {/* Two-column: Quarterly Trend + Revenue per Advisor */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="border border-slate-100 rounded-xl p-4">
          <button onClick={() => toggleDetail("rev-trend")} className="w-full">
            <div className="flex items-center gap-2 mb-3">
              <BarChart3 size={14} className="text-slate-400" />
              <span className="text-xs font-medium text-slate-600">Quarterly Fee Income Trend<span className="text-slate-300 ml-0.5">▾</span></span>
            </div>
            <div className="flex items-end gap-2 h-24">
              {data.revenue.quarterlyTrend.map((q, i) => {
                const max = Math.max(...data.revenue.quarterlyTrend.map(x => x.value));
                const pct = max > 0 ? (q.value / max) * 100 : 0;
                const isCurrent = i === data.revenue.quarterlyTrend.length - 1;
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] text-slate-500 font-medium">${q.value}K</span>
                    <div className={`w-full rounded-t-md transition-all duration-500 ${isCurrent ? "bg-emerald-500" : "bg-slate-200"}`} style={{ height: `${Math.max(pct, 8)}%` }} />
                    <span className="text-[9px] text-slate-400">{q.label}</span>
                  </div>
                );
              })}
            </div>
          </button>
          <DetailDrawer id="rev-trend" activeId={detailPanel}>
            <p className="text-xs text-slate-600">Quarterly fee income estimated from cumulative household count at each quarter-end. Growth from Q-3 to Current reflects new household onboarding velocity. Connect actual AUM data for precise tracking.</p>
          </DetailDrawer>
        </div>

        <div className="border border-slate-100 rounded-xl p-4">
          <div className="flex items-center gap-2 mb-3">
            <Users size={14} className="text-slate-400" />
            <span className="text-xs font-medium text-slate-600">Revenue by Advisor</span>
          </div>
          <div className="space-y-2">
            {data.revenue.revenuePerAdvisor.slice(0, 5).map((a, i) => {
              const maxFee = data.revenue.revenuePerAdvisor[0]?.annualFee || 1;
              return (
                <div key={i}>
                  <button onClick={() => toggleDetail(`rev-adv-${i}`)} className="w-full flex items-center gap-3 hover:bg-slate-50 rounded-lg p-1 -mx-1 transition-colors">
                    <span className="text-xs text-slate-600 w-28 truncate text-left">{a.name}<span className="text-slate-300 ml-0.5">▾</span></span>
                    <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${(a.annualFee / maxFee) * 100}%` }} />
                    </div>
                    <span className="text-xs font-medium text-slate-700 w-16 text-right">${(a.annualFee / 1_000).toFixed(0)}K</span>
                  </button>
                  <DetailDrawer id={`rev-adv-${i}`} activeId={detailPanel}>
                    <p className="text-xs text-slate-600"><strong>{a.name}</strong>: {a.households} households × ${(data.assumptions.avgAumPerHousehold / 1_000_000).toFixed(1)}M avg = ${(a.estimatedAum / 1_000_000).toFixed(1)}M AUM → <strong>${(a.annualFee / 1_000).toFixed(0)}K/year</strong> in fees ({Math.round(a.annualFee / (data.revenue.annualFeeIncome || 1) * 100)}% of firm total).</p>
                  </DetailDrawer>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
