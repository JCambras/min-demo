"use client";
import { useState } from "react";
import { AlertTriangle, Shield, ChevronDown, ChevronUp, ArrowRight } from "lucide-react";
import type { PracticeData } from "../usePracticeData";

interface HouseholdScore {
  name: string;
  id: string;
  score: number;
  signals: { label: string; severity: "critical" | "high" | "medium" }[];
}

function computeHouseholdScores(data: PracticeData): HouseholdScore[] {
  // Group risk items by household
  const hhMap = new Map<string, { name: string; id: string; criticals: string[]; highs: string[]; mediums: string[] }>();

  for (const risk of data.risks) {
    if (!risk.householdId) continue;
    if (!hhMap.has(risk.householdId)) {
      hhMap.set(risk.householdId, { name: risk.household, id: risk.householdId, criticals: [], highs: [], mediums: [] });
    }
    const entry = hhMap.get(risk.householdId)!;
    if (risk.severity === "critical") entry.criticals.push(risk.label);
    else if (risk.severity === "high") entry.highs.push(risk.label);
    else entry.mediums.push(risk.label);
  }

  // Also check for unsigned items not in risk radar yet
  for (const item of data.unsignedItems) {
    if (!item.householdId) continue;
    if (!hhMap.has(item.householdId)) {
      hhMap.set(item.householdId, { name: item.household, id: item.householdId, criticals: [], highs: [], mediums: [] });
    }
  }

  const scores: HouseholdScore[] = [];
  for (const [, entry] of hhMap) {
    const score = Math.max(0, 100 - entry.criticals.length * 25 - entry.highs.length * 15 - entry.mediums.length * 8);
    const signals: HouseholdScore["signals"] = [
      ...entry.criticals.map(l => ({ label: l, severity: "critical" as const })),
      ...entry.highs.map(l => ({ label: l, severity: "high" as const })),
      ...entry.mediums.map(l => ({ label: l, severity: "medium" as const })),
    ];
    scores.push({ name: entry.name, id: entry.id, score, signals });
  }

  scores.sort((a, b) => a.score - b.score);
  return scores;
}

export function HouseholdRiskScore({ data, goToFamily, goToCompliance }: {
  data: PracticeData;
  goToFamily: (id: string, name: string) => void;
  goToCompliance: (id: string, name: string) => void;
}) {
  const [showAll, setShowAll] = useState(false);
  const [expandedHH, setExpandedHH] = useState<string | null>(null);

  const scores = computeHouseholdScores(data);
  const atRisk = scores.filter(s => s.score < 100);
  const displayScores = showAll ? atRisk : atRisk.slice(0, 10);

  if (atRisk.length === 0) return null;

  const avgScore = atRisk.length > 0 ? Math.round(atRisk.reduce((s, h) => s + h.score, 0) / atRisk.length) : 100;
  const criticalCount = atRisk.filter(s => s.score < 40).length;
  const scoreColor = (s: number) => s >= 70 ? "text-green-600" : s >= 40 ? "text-amber-600" : "text-red-600";
  const scoreBg = (s: number) => s >= 70 ? "bg-green-100" : s >= 40 ? "bg-amber-100" : "bg-red-100";
  const barColor = (s: number) => s >= 70 ? "bg-green-400" : s >= 40 ? "bg-amber-400" : "bg-red-400";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <AlertTriangle size={16} className="text-amber-500" />
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Households at Risk</h3>
          <p className="text-xs text-slate-400">Composite score: compliance, data quality, operations, DocuSign</p>
        </div>
        <div className="flex-1" />
        <div className="flex items-center gap-2">
          {criticalCount > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">{criticalCount} critical</span>
          )}
          <span className="text-xs px-2.5 py-1 rounded-full bg-amber-100 text-amber-600 font-medium">{atRisk.length} at risk</span>
        </div>
      </div>

      {/* Average score bar */}
      <div className="px-5 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-4">
        <span className="text-xs text-slate-400 w-28 flex-shrink-0">Avg risk score</span>
        <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barColor(avgScore)}`} style={{ width: `${avgScore}%` }} />
        </div>
        <span className={`text-xs font-semibold w-10 text-right ${scoreColor(avgScore)}`}>{avgScore}</span>
      </div>

      {/* Household list */}
      {displayScores.map((hh, i) => (
        <div key={hh.id} className="border-b border-slate-50 last:border-0">
          <button
            onClick={() => setExpandedHH(expandedHH === hh.id ? null : hh.id)}
            className="w-full flex items-center gap-3 px-5 py-3 hover:bg-slate-50 transition-colors"
          >
            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${scoreBg(hh.score)} ${scoreColor(hh.score)}`}>
              {hh.score}
            </span>
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium text-slate-700 truncate">{hh.name.replace(" Household", "")}</p>
              <div className="flex items-center gap-2 mt-0.5">
                {hh.signals.slice(0, 2).map((s, j) => (
                  <span key={j} className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${
                    s.severity === "critical" ? "bg-red-100 text-red-600" : s.severity === "high" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"
                  }`}>{s.severity}</span>
                ))}
                <span className="text-[10px] text-slate-400">{hh.signals.length} issue{hh.signals.length !== 1 ? "s" : ""}</span>
              </div>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <div className="w-16 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${barColor(hh.score)}`} style={{ width: `${hh.score}%` }} />
              </div>
              {expandedHH === hh.id ? <ChevronUp size={14} className="text-slate-400" /> : <ChevronDown size={14} className="text-slate-400" />}
            </div>
          </button>
          {expandedHH === hh.id && (
            <div className="px-5 pb-3 animate-fade-in">
              <div className="bg-slate-50 rounded-xl p-3 space-y-1.5">
                {hh.signals.map((s, j) => (
                  <div key={j} className="flex items-center gap-2">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${
                      s.severity === "critical" ? "bg-red-500" : s.severity === "high" ? "bg-amber-400" : "bg-slate-300"
                    }`} />
                    <p className="text-xs text-slate-600">{s.label}</p>
                  </div>
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <button onClick={() => goToFamily(hh.id, hh.name)} className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 transition-colors flex items-center gap-1">
                  View Family <ArrowRight size={10} />
                </button>
                <button onClick={() => goToCompliance(hh.id, hh.name)} className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors flex items-center gap-1">
                  <Shield size={10} /> Run Review
                </button>
              </div>
            </div>
          )}
        </div>
      ))}

      {atRisk.length > 10 && (
        <button onClick={() => setShowAll(!showAll)} className="w-full px-5 py-2 text-center text-[11px] text-slate-400 hover:text-slate-600 border-t border-slate-100 flex items-center justify-center gap-1">
          {showAll ? <><ChevronUp size={12} /> Show top 10</> : <><ChevronDown size={12} /> Show all {atRisk.length}</>}
        </button>
      )}
    </div>
  );
}
