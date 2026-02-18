"use client";
import { useState } from "react";
import { AlertTriangle, CheckCircle, Database, Mail, Phone, User, FileText, Clock, ChevronDown, ChevronUp } from "lucide-react";
import type { PracticeData } from "../usePracticeData";

interface QualityIssue {
  category: string;
  label: string;
  household: string;
  householdId: string;
  severity: "critical" | "warning" | "info";
  field: string;
}

export function DataQuality({ data, goToFamily }: { data: PracticeData; goToFamily?: (id: string, name: string) => void }) {
  const [expanded, setExpanded] = useState(false);

  // Build data quality issues from practice data
  const issues: QualityIssue[] = [];

  // 1. Stale accounts — no activity in 30+ days
  for (const risk of data.risks) {
    if (risk.category === "Stale Account") {
      issues.push({
        category: "Stale Record",
        label: `No activity in ${risk.daysStale} days`,
        household: risk.household,
        householdId: risk.householdId,
        severity: risk.daysStale > 60 ? "critical" : "warning",
        field: "Last Activity",
      });
    }
  }

  // 2. Open tasks never closed — tasks open > 30 days
  for (const task of data.openTaskItems) {
    if (task.daysOld > 30) {
      issues.push({
        category: "Stale Task",
        label: `"${task.subject.slice(0, 40)}${task.subject.length > 40 ? "..." : ""}" open ${task.daysOld}d`,
        household: task.household,
        householdId: task.householdId,
        severity: task.daysOld > 60 ? "critical" : "warning",
        field: "Task Status",
      });
    }
  }

  // 3. Missing compliance reviews
  const missingCompliance = Math.max(0, data.totalHouseholds - data.complianceReviews);
  if (missingCompliance > 0) {
    issues.push({
      category: "Missing Data",
      label: `${missingCompliance} household${missingCompliance > 1 ? "s" : ""} without compliance review`,
      household: "",
      householdId: "",
      severity: missingCompliance > 5 ? "critical" : "warning",
      field: "Compliance Review",
    });
  }

  // 4. Unsigned documents lingering
  for (const item of data.unsignedItems) {
    if (item.daysOld > 7) {
      issues.push({
        category: "Pending Signature",
        label: `DocuSign unsigned for ${item.daysOld} days`,
        household: item.household,
        householdId: item.householdId,
        severity: item.daysOld > 14 ? "critical" : "warning",
        field: "DocuSign",
      });
    }
  }

  // 5. Advisors with data warnings
  for (const adv of data.advisors) {
    if (adv.dataWarning) {
      issues.push({
        category: "Data Completeness",
        label: adv.dataWarning,
        household: adv.name,
        householdId: "",
        severity: "info",
        field: "Advisor Data",
      });
    }
  }

  // Sort by severity
  const sevOrder = { critical: 0, warning: 1, info: 2 };
  issues.sort((a, b) => sevOrder[a.severity] - sevOrder[b.severity]);

  const criticalCount = issues.filter(i => i.severity === "critical").length;
  const warningCount = issues.filter(i => i.severity === "warning").length;
  const infoCount = issues.filter(i => i.severity === "info").length;
  const score = issues.length === 0 ? 100 : Math.max(0, 100 - criticalCount * 15 - warningCount * 5 - infoCount * 2);
  const scoreColor = score >= 80 ? "text-green-600" : score >= 60 ? "text-amber-600" : "text-red-600";
  const scoreBg = score >= 80 ? "bg-green-50" : score >= 60 ? "bg-amber-50" : "bg-red-50";

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Data Quality Monitor</h3>
          <p className="text-xs text-slate-400 mt-0.5">Salesforce record completeness and hygiene</p>
        </div>
        <div className="flex items-center gap-2">
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full ${scoreBg}`}>
            <Database size={12} className={scoreColor} />
            <span className={`text-xs font-semibold ${scoreColor}`}>{score}/100</span>
          </div>
        </div>
      </div>

      {/* Summary row */}
      <div className="px-6 py-3 bg-slate-50 border-b border-slate-100 flex items-center gap-6 text-xs text-slate-500">
        {criticalCount > 0 && (
          <span className="flex items-center gap-1 text-red-500">
            <AlertTriangle size={12} /> {criticalCount} critical
          </span>
        )}
        {warningCount > 0 && (
          <span className="flex items-center gap-1 text-amber-500">
            <AlertTriangle size={12} /> {warningCount} warnings
          </span>
        )}
        {infoCount > 0 && (
          <span className="flex items-center gap-1 text-slate-400">
            <Database size={12} /> {infoCount} info
          </span>
        )}
        {issues.length === 0 && (
          <span className="flex items-center gap-1 text-green-500">
            <CheckCircle size={12} /> All records healthy
          </span>
        )}
        <span className="ml-auto text-slate-400">{data.totalHouseholds} households · {data.totalTasks} records scanned</span>
      </div>

      {/* Issue list */}
      <div>
        {issues.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <CheckCircle size={24} className="text-green-400 mx-auto mb-2" />
            <p className="text-sm text-slate-500">Salesforce data looks clean</p>
            <p className="text-xs text-slate-400 mt-1">No missing fields, stale records, or data quality issues detected.</p>
          </div>
        ) : (
          <>
            {(expanded ? issues : issues.slice(0, 5)).map((issue, i) => (
              <div key={i} className="flex items-center gap-3 px-6 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <div className={`w-2 h-2 rounded-full flex-shrink-0 ${issue.severity === "critical" ? "bg-red-500" : issue.severity === "warning" ? "bg-amber-400" : "bg-slate-300"}`} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-700">{issue.label}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[10px] text-slate-400">{issue.category}</span>
                    {issue.household && (
                      <>
                        <span className="text-[10px] text-slate-300">·</span>
                        {issue.householdId && goToFamily ? (
                          <button onClick={() => goToFamily(issue.householdId, issue.household)} className="text-[10px] text-blue-500 hover:text-blue-700">{issue.household}</button>
                        ) : (
                          <span className="text-[10px] text-slate-400">{issue.household}</span>
                        )}
                      </>
                    )}
                  </div>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${issue.severity === "critical" ? "bg-red-100 text-red-600" : issue.severity === "warning" ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
                  {issue.field}
                </span>
              </div>
            ))}
            {issues.length > 5 && (
              <button onClick={() => setExpanded(e => !e)} className="w-full px-6 py-2 text-center text-[11px] text-slate-400 hover:text-slate-600 border-t border-slate-100 flex items-center justify-center gap-1">
                {expanded ? <><ChevronUp size={12} /> Show less</> : <><ChevronDown size={12} /> Show {issues.length - 5} more</>}
              </button>
            )}
          </>
        )}
      </div>
    </div>
  );
}
