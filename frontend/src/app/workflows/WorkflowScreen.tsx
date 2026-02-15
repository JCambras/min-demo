"use client";
import { useState, useEffect } from "react";
import { Loader2, Zap, CheckCircle, Clock, AlertTriangle, ChevronRight, Play, Pause, ArrowRight } from "lucide-react";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { callSF } from "@/lib/salesforce";
import { WORKFLOW_TEMPLATES } from "@/lib/workflows";
import type { Screen, WorkflowContext } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface WorkflowTask {
  Id: string;
  Subject: string;
  Status: string;
  Priority: string;
  ActivityDate: string;
  CreatedDate: string;
  Description: string;
  What?: { Name: string; Id: string };
}

interface GroupedWorkflow {
  templateId: string;
  templateName: string;
  householdName: string;
  householdId: string;
  tasks: WorkflowTask[];
  totalSteps: number;
  completedSteps: number;
  nextDue?: string;
  status: "active" | "completed" | "overdue";
}

// ─── Workflow Screen ────────────────────────────────────────────────────────

export function WorkflowScreen({ onExit, onNavigate }: {
  onExit: () => void;
  onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [workflows, setWorkflows] = useState<GroupedWorkflow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [expandedWf, setExpandedWf] = useState<string | null>(null);
  const [viewFilter, setViewFilter] = useState<"active" | "completed" | "all">("active");

  useEffect(() => {
    (async () => {
      try {
        const res = await callSF("queryTasks", { limit: 500 });
        if (res.success) {
          const workflowTasks = (res.tasks as WorkflowTask[]).filter(t =>
            t.Subject?.startsWith("WORKFLOW —")
          );
          const grouped = groupByWorkflow(workflowTasks);
          setWorkflows(grouped);
        } else {
          setError("Could not load workflow data.");
        }
      } catch {
        setError("Failed to connect to Salesforce.");
      }
      setLoading(false);
    })();
  }, []);

  function groupByWorkflow(tasks: WorkflowTask[]): GroupedWorkflow[] {
    const groups = new Map<string, GroupedWorkflow>();
    const now = Date.now();

    for (const task of tasks) {
      const hhName = task.What?.Name || "Unknown";
      const hhId = task.What?.Id || "";

      // Match to template by parsing description
      const descMatch = (task.Description || "").match(/Workflow: (.+)/);
      const templateName = descMatch?.[1]?.split("\n")[0] || "Unknown Workflow";
      const template = WORKFLOW_TEMPLATES.find(t => t.name === templateName);

      const key = `${template?.id || "unknown"}-${hhId}`;

      if (!groups.has(key)) {
        groups.set(key, {
          templateId: template?.id || "unknown",
          templateName,
          householdName: hhName,
          householdId: hhId,
          tasks: [],
          totalSteps: template?.steps.length || 0,
          completedSteps: 0,
          status: "active",
        });
      }

      const group = groups.get(key)!;
      group.tasks.push(task);
      if (task.Status === "Completed") group.completedSteps++;
    }

    // Compute status and next due
    for (const wf of groups.values()) {
      wf.tasks.sort((a, b) => new Date(a.ActivityDate || a.CreatedDate).getTime() - new Date(b.ActivityDate || b.CreatedDate).getTime());

      if (wf.completedSteps >= wf.totalSteps && wf.totalSteps > 0) {
        wf.status = "completed";
      } else {
        const openTasks = wf.tasks.filter(t => t.Status !== "Completed");
        const nextOpen = openTasks[0];
        if (nextOpen?.ActivityDate) {
          wf.nextDue = nextOpen.ActivityDate;
          if (new Date(nextOpen.ActivityDate).getTime() < now) wf.status = "overdue";
        }
      }
    }

    return Array.from(groups.values()).sort((a, b) => {
      const statusOrder = { overdue: 0, active: 1, completed: 2 };
      return (statusOrder[a.status] - statusOrder[b.status]);
    });
  }

  const filteredWorkflows = workflows.filter(wf =>
    viewFilter === "all" ? true : viewFilter === "completed" ? wf.status === "completed" : wf.status !== "completed"
  );

  const activeCount = workflows.filter(w => w.status !== "completed").length;
  const overdueCount = workflows.filter(w => w.status === "overdue").length;
  const completedCount = workflows.filter(w => w.status === "completed").length;

  const goToFamily = (householdId: string, name: string) => {
    if (onNavigate) onNavigate("family" as Screen, { householdId, familyName: name.replace(" Household", "") });
  };

  return (
    <div className="flex h-screen bg-surface">
      <div className="w-full flex flex-col">
        <FlowHeader title="Workflow Automation" familyName={undefined} stepLabel="Active Chains & Templates" onBack={onExit} />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 pb-16">
          <div className="max-w-4xl w-full mx-auto">

            {loading && (
              <div className="text-center pt-16">
                <Loader2 size={36} className="animate-spin text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">Loading workflow data...</p>
              </div>
            )}

            {error && (
              <div className="text-center pt-16">
                <div className="w-16 h-16 rounded-full bg-red-100 text-red-500 flex items-center justify-center mx-auto mb-6 text-2xl">!</div>
                <p className="text-slate-600 mb-2">{error}</p>
                <button onClick={onExit} className="text-sm text-slate-400 hover:text-slate-600">Back</button>
              </div>
            )}

            {!loading && !error && (
              <div className="animate-fade-in space-y-6">

                {/* Summary stats */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <Zap size={16} className="text-blue-500 mx-auto mb-2" />
                    <p className="text-2xl font-light text-blue-600">{activeCount}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Active Workflows</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <AlertTriangle size={16} className="text-amber-500 mx-auto mb-2" />
                    <p className="text-2xl font-light text-amber-600">{overdueCount}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Overdue Steps</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                    <CheckCircle size={16} className="text-green-500 mx-auto mb-2" />
                    <p className="text-2xl font-light text-green-600">{completedCount}</p>
                    <p className="text-[10px] text-slate-400 mt-1">Completed</p>
                  </div>
                </div>

                {/* Workflow Templates */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Workflow Templates</h3>
                    <p className="text-xs text-slate-400 mt-0.5">Automated chains that trigger from Min actions</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {WORKFLOW_TEMPLATES.map(t => (
                      <div key={t.id} className="px-6 py-4 flex items-center gap-4">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${t.enabled ? "bg-blue-50 text-blue-500" : "bg-slate-50 text-slate-300"}`}>
                          <Zap size={18} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-slate-700">{t.name}</p>
                          <p className="text-xs text-slate-400 mt-0.5 truncate">{t.description}</p>
                        </div>
                        <div className="flex items-center gap-3 flex-shrink-0">
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{t.steps.length} steps</span>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">on: {t.trigger.replace("_", " ")}</span>
                          <div className={`w-2 h-2 rounded-full ${t.enabled ? "bg-green-500" : "bg-slate-300"}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Active Workflows */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                      <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Workflow Instances</h3>
                      <p className="text-xs text-slate-400 mt-0.5">{workflows.length} total across all households</p>
                    </div>
                    <div className="flex items-center bg-slate-100 rounded-lg p-0.5">
                      {(["active", "completed", "all"] as const).map(f => (
                        <button key={f} onClick={() => setViewFilter(f)} className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-all capitalize ${viewFilter === f ? "bg-white text-slate-700 shadow-sm" : "text-slate-400 hover:text-slate-600"}`}>{f}</button>
                      ))}
                    </div>
                  </div>

                  {filteredWorkflows.length === 0 ? (
                    <div className="px-6 py-12 text-center">
                      <Zap size={24} className="text-slate-300 mx-auto mb-3" />
                      <p className="text-sm text-slate-400">
                        {viewFilter === "active" ? "No active workflows. Create a new household to trigger the onboarding chain." :
                         viewFilter === "completed" ? "No completed workflows yet." :
                         "No workflows found. Workflows are created automatically when you onboard new clients."}
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-50">
                      {filteredWorkflows.map((wf, i) => {
                        const key = `${wf.templateId}-${wf.householdId}`;
                        const isExpanded = expandedWf === key;
                        const pct = wf.totalSteps > 0 ? Math.round((wf.completedSteps / wf.totalSteps) * 100) : 0;

                        return (
                          <div key={i}>
                            <button onClick={() => setExpandedWf(isExpanded ? null : key)} className="w-full px-6 py-4 flex items-center gap-4 hover:bg-slate-50 transition-colors text-left">
                              {/* Status indicator */}
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                                wf.status === "completed" ? "bg-green-50 text-green-500" :
                                wf.status === "overdue" ? "bg-red-50 text-red-500" :
                                "bg-blue-50 text-blue-500"
                              }`}>
                                {wf.status === "completed" ? <CheckCircle size={18} /> :
                                 wf.status === "overdue" ? <AlertTriangle size={18} /> :
                                 <Play size={18} />}
                              </div>

                              {/* Info */}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <p className="text-sm font-medium text-slate-700 truncate">{wf.householdName}</p>
                                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                                    wf.status === "completed" ? "bg-green-100 text-green-600" :
                                    wf.status === "overdue" ? "bg-red-100 text-red-600" :
                                    "bg-blue-100 text-blue-600"
                                  }`}>{wf.status}</span>
                                </div>
                                <p className="text-xs text-slate-400 mt-0.5">{wf.templateName}</p>
                              </div>

                              {/* Progress */}
                              <div className="flex items-center gap-3 flex-shrink-0">
                                <div className="w-24">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[10px] text-slate-400">{wf.completedSteps}/{wf.totalSteps}</span>
                                    <span className="text-[10px] font-medium text-slate-500">{pct}%</span>
                                  </div>
                                  <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className={`h-full rounded-full transition-all duration-500 ${
                                      wf.status === "completed" ? "bg-green-500" :
                                      wf.status === "overdue" ? "bg-red-500" :
                                      "bg-blue-500"
                                    }`} style={{ width: `${pct}%` }} />
                                  </div>
                                </div>
                                <ChevronRight size={14} className={`text-slate-400 transition-transform ${isExpanded ? "rotate-90" : ""}`} />
                              </div>
                            </button>

                            {/* Expanded: step-by-step chain view */}
                            {isExpanded && (
                              <div className="px-6 pb-4 bg-slate-50/50 animate-fade-in">
                                <div className="pl-5 border-l-2 border-slate-200 space-y-3 py-2">
                                  {wf.tasks.map((task, ti) => {
                                    const isComplete = task.Status === "Completed";
                                    const isOverdue = !isComplete && task.ActivityDate && new Date(task.ActivityDate).getTime() < Date.now();
                                    const stepLabel = task.Subject.replace("WORKFLOW —", "").replace(` — ${wf.householdName}`, "").trim();
                                    return (
                                      <div key={ti} className="flex items-start gap-3 relative">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center flex-shrink-0 -ml-[21px] ${
                                          isComplete ? "bg-green-500 text-white" :
                                          isOverdue ? "bg-red-500 text-white" :
                                          "bg-white border-2 border-slate-300"
                                        }`}>
                                          {isComplete ? <CheckCircle size={12} /> :
                                           isOverdue ? <AlertTriangle size={10} /> :
                                           <Clock size={10} className="text-slate-400" />}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                          <p className={`text-sm ${isComplete ? "text-slate-400 line-through" : "text-slate-700"}`}>{stepLabel}</p>
                                          <div className="flex items-center gap-2 mt-0.5">
                                            {task.ActivityDate && <span className="text-[10px] text-slate-400">Due: {new Date(task.ActivityDate).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span>}
                                            {task.Priority === "High" && !isComplete && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">High</span>}
                                            {isOverdue && <span className="text-[10px] px-1.5 py-0.5 rounded bg-red-100 text-red-600">Overdue</span>}
                                          </div>
                                        </div>
                                      </div>
                                    );
                                  })}
                                </div>
                                <div className="mt-3 flex gap-2">
                                  <button onClick={() => goToFamily(wf.householdId, wf.householdName)} className="text-[11px] px-3 py-1.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800">View Family</button>
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>

              </div>
            )}

          </div>
        </div>
      </div>
    </div>
  );
}
