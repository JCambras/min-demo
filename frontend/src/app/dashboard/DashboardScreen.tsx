"use client";
import { useState } from "react";
import { Loader2 } from "lucide-react";
import { FlowHeader } from "@/components/shared/FlowHeader";
import type { Screen, WorkflowContext } from "@/lib/types";
import { usePracticeData } from "./usePracticeData";
import { HealthScoreSection } from "./components/HealthScoreSection";
import { RevenueSection } from "./components/RevenueSection";
import { AdvisorScoreboard } from "./components/AdvisorScoreboard";
import { PipelineSection } from "./components/PipelineSection";
import { RiskRadar } from "./components/RiskRadar";
import { WeeklyComparison } from "./components/WeeklyComparison";

export function DashboardScreen({ onExit, onNavigate, firmName, role, advisorName }: {
  onExit: () => void;
  onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void;
  firmName?: string;
  role?: string | null;
  advisorName?: string;
}) {
  const isAdvisor = role === "advisor";
  const { loading, data, error } = usePracticeData();
  const [detailPanel, setDetailPanel] = useState<string | null>(null);
  const toggleDetail = (id: string) => setDetailPanel(prev => prev === id ? null : id);

  const goToFamily = (householdId: string, name: string) => {
    if (onNavigate) onNavigate("family" as Screen, { householdId, familyName: name.replace(" Household", "") });
  };

  const goToCompliance = (householdId: string, name: string) => {
    if (onNavigate) onNavigate("compliance", { householdId, familyName: name.replace(" Household", "") });
  };

  return (
    <div className="flex h-screen bg-[#fafafa]">
      <div className="w-full flex flex-col">
        <FlowHeader title="Practice Intelligence" familyName={undefined} stepLabel="Weekly Operations Report" progressPct={100} onBack={onExit} onShowPane={() => {}} hasIndicator={false} />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 pb-16">
          <div className="max-w-6xl w-full mx-auto">

            {loading && (
              <div className="animate-fade-in space-y-8">
                {/* Health Score skeleton */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <div className="flex items-center gap-4 mb-6">
                    <div className="w-20 h-20 rounded-full bg-slate-100 animate-pulse" />
                    <div className="space-y-2 flex-1">
                      <div className="h-5 w-48 bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-4">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
                    ))}
                  </div>
                </div>
                {/* Revenue skeleton */}
                <div className="grid grid-cols-3 gap-4">
                  {[...Array(3)].map((_, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                      <div className="h-3 w-20 bg-slate-100 rounded animate-pulse" />
                      <div className="h-8 w-28 bg-slate-100 rounded animate-pulse" />
                      <div className="h-3 w-16 bg-slate-100 rounded animate-pulse" />
                    </div>
                  ))}
                </div>
                {/* Scoreboard skeleton */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5">
                  <div className="h-4 w-36 bg-slate-100 rounded animate-pulse mb-4" />
                  <div className="space-y-3">
                    {[...Array(3)].map((_, i) => (
                      <div key={i} className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-full bg-slate-100 animate-pulse" />
                        <div className="h-4 flex-1 bg-slate-50 rounded animate-pulse" />
                        <div className="h-4 w-16 bg-slate-100 rounded animate-pulse" />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Bottom row skeleton */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {[...Array(2)].map((_, i) => (
                    <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                      <div className="h-4 w-28 bg-slate-100 rounded animate-pulse" />
                      <div className="space-y-2">
                        {[...Array(3)].map((_, j) => (
                          <div key={j} className="h-10 bg-slate-50 rounded-xl animate-pulse" />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <div className="text-center pt-16">
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-6 text-2xl">!</div>
                <p className="text-slate-600 mb-2">{error}</p>
                <button onClick={onExit} className="text-sm text-slate-400 hover:text-slate-600">Back to Home</button>
              </div>
            )}

            {data && (
              <div className="animate-fade-in space-y-8">
                <HealthScoreSection data={data} detailPanel={detailPanel} toggleDetail={toggleDetail} firmName={firmName} />
                <RevenueSection data={data} detailPanel={detailPanel} toggleDetail={toggleDetail} />
                <AdvisorScoreboard data={data} advisorName={advisorName} isAdvisor={isAdvisor} />
                <PipelineSection data={data} detailPanel={detailPanel} toggleDetail={toggleDetail} goToFamily={goToFamily} />
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <RiskRadar data={data} goToFamily={goToFamily} goToCompliance={goToCompliance} />
                  <WeeklyComparison data={data} detailPanel={detailPanel} toggleDetail={toggleDetail} />
                </div>
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
