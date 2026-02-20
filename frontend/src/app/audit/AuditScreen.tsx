"use client";
import { useState, useEffect, useMemo } from "react";
import { Loader2, FileText, Search, X, Download, Shield, AlertTriangle, CheckCircle, Clock, Filter, ChevronDown } from "lucide-react";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { callSF } from "@/lib/salesforce";
import type { Screen, WorkflowContext } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface AuditRecord {
  id: string;
  action: string;
  result: "success" | "error";
  actor?: string;
  household: string;
  householdId?: string;
  timestamp: string;
  detail?: string;
  requestId?: string;
  durationMs?: number;
}

type ResultFilter = "all" | "success" | "error";

// ─── Parse Audit Records from SF Tasks ──────────────────────────────────────

function parseAuditTask(task: { id: string; subject: string; description?: string; createdAt: string; householdName?: string; householdId?: string; priority?: string }): AuditRecord | null {
  if (!task.subject?.includes("MIN:AUDIT")) return null;

  // Parse subject: "MIN:AUDIT — confirmIntent — success"
  const parts = task.subject.replace("MIN:AUDIT — ", "").split(" — ");
  const action = parts[0] || "unknown";
  const result = (parts[1]?.toLowerCase() === "error" ? "error" : "success") as AuditRecord["result"];

  // Parse description for metadata
  const desc = task.description || "";
  const actorMatch = desc.match(/Actor: (.+)/);
  const detailMatch = desc.match(/Detail: (.+)/);
  const requestIdMatch = desc.match(/RequestId: (.+)/);
  const durationMatch = desc.match(/Duration: (\d+)ms/);

  return {
    id: task.id,
    action,
    result,
    actor: actorMatch?.[1],
    household: (task.householdName || "").replace(" Household", ""),
    householdId: task.householdId,
    timestamp: desc.match(/Timestamp: (.+)/)?.[1] || task.createdAt,
    detail: detailMatch?.[1],
    requestId: requestIdMatch?.[1],
    durationMs: durationMatch ? parseInt(durationMatch[1]) : undefined,
  };
}

// ─── PDF Export ─────────────────────────────────────────────────────────────

function exportAuditPDF(records: AuditRecord[], dateRange: string) {
  const lines = [
    "MIN AUDIT TRAIL REPORT",
    `Generated: ${new Date().toLocaleString()}`,
    `Period: ${dateRange}`,
    `Total Records: ${records.length}`,
    "",
    "─".repeat(80),
    "",
  ];

  for (const r of records) {
    lines.push(`[${new Date(r.timestamp).toLocaleString()}] ${r.action} — ${r.result.toUpperCase()}`);
    if (r.actor) lines.push(`  Actor: ${r.actor}`);
    if (r.household) lines.push(`  Household: ${r.household}`);
    if (r.detail) lines.push(`  Detail: ${r.detail}`);
    if (r.durationMs) lines.push(`  Duration: ${r.durationMs}ms`);
    lines.push("");
  }

  const blob = new Blob([lines.join("\n")], { type: "text/plain" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `min-audit-trail-${new Date().toISOString().slice(0, 10)}.txt`;
  a.click();
  URL.revokeObjectURL(url);
}

// ─── Component ──────────────────────────────────────────────────────────────

export function AuditScreen({ onExit, onNavigate }: {
  onExit: () => void;
  onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [records, setRecords] = useState<AuditRecord[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [resultFilter, setResultFilter] = useState<ResultFilter>("all");
  const [actionFilter, setActionFilter] = useState("all");
  const [showCount, setShowCount] = useState(50);

  useEffect(() => {
    (async () => {
      try {
        const res = await callSF("queryTasks", { limit: 500 });
        if (res.success) {
          const tasks = res.tasks as { id: string; subject: string; description?: string; createdAt: string; householdName?: string; householdId?: string; priority?: string }[];
          const auditRecords = tasks
            .map(t => parseAuditTask(t))
            .filter((r): r is AuditRecord => r !== null)
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setRecords(auditRecords);
        }
      } catch {
        setLoadError("Could not load audit records. Check your connection and try again.");
      }
      setLoading(false);
    })();
  }, []);

  const actionTypes = useMemo(() => {
    const set = new Set(records.map(r => r.action));
    return ["all", ...Array.from(set).sort()];
  }, [records]);

  const filtered = useMemo(() => {
    let list = records;
    if (resultFilter !== "all") list = list.filter(r => r.result === resultFilter);
    if (actionFilter !== "all") list = list.filter(r => r.action === actionFilter);
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(r => r.action.toLowerCase().includes(q) || r.household.toLowerCase().includes(q) || r.actor?.toLowerCase().includes(q) || r.detail?.toLowerCase().includes(q));
    }
    return list;
  }, [records, resultFilter, actionFilter, filter]);

  const successCount = records.filter(r => r.result === "success").length;
  const errorCount = records.filter(r => r.result === "error").length;

  if (loading) return (
    <div className="flex h-screen bg-surface items-center justify-center">
      <div className="flex items-center gap-3 text-slate-400"><Loader2 size={22} className="animate-spin" /><span className="text-sm">Loading audit trail...</span></div>
    </div>
  );

  if (loadError) return (
    <div className="flex h-screen bg-surface items-center justify-center">
      <div className="max-w-sm text-center">
        <AlertTriangle size={24} className="mx-auto text-amber-400 mb-3" />
        <p className="text-sm text-slate-700 font-medium mb-1">Audit trail unavailable</p>
        <p className="text-xs text-slate-500 mb-4">{loadError}</p>
        <div className="flex items-center justify-center gap-3">
          <button onClick={() => window.location.reload()} className="px-4 py-2 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">Retry</button>
          <button onClick={onExit} className="px-4 py-2 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors">Back</button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-surface">
      <div className="w-full flex flex-col">
        <FlowHeader title="Audit Trail" stepLabel={`${records.length} records`} onBack={onExit} />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 pb-16">
          <div className="max-w-4xl w-full mx-auto">

            <div className="flex items-center justify-between mb-6">
              <p className="text-slate-400 text-sm">SEC Rule 17a-4 compliant audit log of all Min actions.</p>
              <button onClick={() => exportAuditPDF(filtered, filtered.length > 0 ? `${new Date(filtered[filtered.length - 1].timestamp).toLocaleDateString()} – ${new Date(filtered[0].timestamp).toLocaleDateString()}` : "N/A")}
                aria-label="Export audit trail"
                className="flex items-center gap-2 text-xs px-3 py-2 rounded-lg bg-slate-900 text-white hover:bg-slate-800 transition-colors">
                <Download size={12} /> Export
              </button>
            </div>

            {/* Summary cards */}
            <div className="grid grid-cols-3 gap-3 mb-6">
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <FileText size={16} className="text-slate-400 mx-auto mb-2" />
                <p className="text-2xl font-light tabular-nums text-slate-700">{records.length}</p>
                <p className="text-[10px] text-slate-400 mt-1">Total Records</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <CheckCircle size={16} className="text-green-500 mx-auto mb-2" />
                <p className="text-2xl font-light tabular-nums text-green-600">{successCount}</p>
                <p className="text-[10px] text-slate-400 mt-1">Successful</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <AlertTriangle size={16} className="text-red-500 mx-auto mb-2" />
                <p className="text-2xl font-light tabular-nums text-red-600">{errorCount}</p>
                <p className="text-[10px] text-slate-400 mt-1">Errors</p>
              </div>
            </div>

            {/* Filters */}
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <div className="flex items-center gap-2">
                {(["all", "success", "error"] as ResultFilter[]).map(r => (
                  <button key={r} onClick={() => setResultFilter(r)}
                    className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${resultFilter === r
                      ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-400"}`}>
                    {r === "all" ? "All Results" : r === "success" ? "Success" : "Errors"}
                  </button>
                ))}
              </div>
              <select value={actionFilter} onChange={e => setActionFilter(e.target.value)}
                className="text-xs px-3 py-1.5 rounded-full border border-slate-200 bg-white text-slate-500 focus:outline-none">
                {actionTypes.map(a => <option key={a} value={a}>{a === "all" ? "All Actions" : a}</option>)}
              </select>
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="Search audit records..." value={filter} onChange={e => setFilter(e.target.value)} />
              {filter && <button onClick={() => setFilter("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14} /></button>}
            </div>

            {/* Records */}
            {filtered.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <Shield size={24} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm font-medium text-slate-500">No audit records found</p>
                <p className="text-xs text-slate-400 mt-1">Audit records are created when Min performs actions in Salesforce.</p>
              </div>
            ) : (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <table className="w-full" role="table">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-semibold text-slate-400 uppercase tracking-wider">
                      <th className="px-4 py-2 text-left w-[8%]">Status</th>
                      <th className="px-2 py-2 text-left w-[25%]">Action</th>
                      <th className="px-2 py-2 text-left w-[17%]">Household</th>
                      <th className="px-2 py-2 text-left w-[17%]">Actor</th>
                      <th className="px-2 py-2 text-left w-[17%]">Time</th>
                      <th className="px-2 py-2 text-left w-[16%]">Detail</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {filtered.slice(0, showCount).map((r, i) => (
                      <tr key={`${r.id}-${i}`} className="hover:bg-slate-50/50 transition-colors group">
                        <td className="px-4 py-3">
                          {r.result === "success"
                            ? <CheckCircle size={14} className="text-green-500" aria-label="Success" />
                            : <AlertTriangle size={14} className="text-red-500" aria-label="Error" />
                          }
                        </td>
                        <td className="px-2 py-3">
                          <p className="text-sm text-slate-700 font-medium truncate">{r.action}</p>
                        </td>
                        <td className="px-2 py-3">
                          {r.householdId && onNavigate ? (
                            <button onClick={() => onNavigate("family", { householdId: r.householdId!, familyName: r.household })}
                              className="text-xs text-blue-600 hover:underline truncate block">{r.household || "—"}</button>
                          ) : (
                            <span className="text-xs text-slate-400 truncate block">{r.household || "—"}</span>
                          )}
                        </td>
                        <td className="px-2 py-3">
                          <span className="text-xs text-slate-500 truncate block">{r.actor || "—"}</span>
                        </td>
                        <td className="px-2 py-3">
                          <span className="text-xs text-slate-400">{new Date(r.timestamp).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>
                          <span className="text-xs text-slate-500 ml-1">{new Date(r.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                        </td>
                        <td className="px-2 py-3">
                          <span className="text-xs text-slate-400 truncate block">{r.detail || "—"}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                {filtered.length > showCount && (
                  <button onClick={() => setShowCount(s => s + 50)}
                    className="w-full py-3 text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-2 border-t border-slate-100">
                    <ChevronDown size={14} />
                    Show more ({filtered.length - showCount} remaining)
                  </button>
                )}
              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
