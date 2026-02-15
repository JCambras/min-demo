"use client";
import { useState, useEffect } from "react";
import { Loader2, Target, CheckCircle, Circle, Plus, X, ChevronRight, Calendar, AlertTriangle, Search, ExternalLink } from "lucide-react";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { callSF } from "@/lib/salesforce";
import type { Screen, WorkflowContext } from "@/lib/types";

interface Goal {
  id: string;
  subject: string;
  household: string;
  householdId: string;
  status: "Not Started" | "In Progress" | "Completed";
  priority: string;
  dueDate: string;
  category: string;
  url: string;
}

interface Household {
  id: string;
  name: string;
}

function parseCategory(subject: string): string {
  const s = subject.toUpperCase();
  if (s.includes("RETIRE")) return "Retirement";
  if (s.includes("ESTATE") || s.includes("TRUST")) return "Estate Planning";
  if (s.includes("TAX")) return "Tax Strategy";
  if (s.includes("EDUCATION") || s.includes("529") || s.includes("COLLEGE")) return "Education";
  if (s.includes("INSURANCE") || s.includes("LIFE") || s.includes("LTC")) return "Insurance";
  if (s.includes("DEBT") || s.includes("MORTGAGE")) return "Debt Management";
  if (s.includes("BUDGET") || s.includes("CASH FLOW")) return "Cash Flow";
  return "Financial Goal";
}

const CATEGORY_COLORS: Record<string, string> = {
  "Retirement": "bg-blue-100 text-blue-700",
  "Estate Planning": "bg-purple-100 text-purple-700",
  "Tax Strategy": "bg-emerald-100 text-emerald-700",
  "Education": "bg-amber-100 text-amber-700",
  "Insurance": "bg-pink-100 text-pink-700",
  "Debt Management": "bg-red-100 text-red-700",
  "Cash Flow": "bg-teal-100 text-teal-700",
  "Financial Goal": "bg-slate-100 text-slate-600",
};

const GOAL_TEMPLATES = [
  "Retirement readiness review",
  "Estate plan update",
  "Tax loss harvesting review",
  "529 contribution strategy",
  "Insurance coverage review",
  "Debt payoff milestone",
  "Emergency fund target",
  "Roth conversion analysis",
  "Social Security timing analysis",
  "Beneficiary designation review",
];

export function PlanningScreen({ onExit, initialContext, onNavigate }: {
  onExit: () => void;
  initialContext?: WorkflowContext | null;
  onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [households, setHouseholds] = useState<Household[]>([]);
  const [instanceUrl, setInstanceUrl] = useState("");
  const [filter, setFilter] = useState<"all" | "active" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [newGoal, setNewGoal] = useState({ subject: "", householdId: "", dueDate: "", priority: "Normal" });
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    loadGoals();
  }, []);

  const loadGoals = async () => {
    setLoading(true);
    try {
      const res = await callSF("queryTasks", { limit: 200 });
      if (res.success) {
        const goalTasks = (res.tasks || []).filter((t: { Subject: string }) => {
          const s = t.Subject?.toUpperCase() || "";
          return s.includes("GOAL:") || s.includes("PLAN:") || s.includes("MILESTONE:");
        });
        setGoals(goalTasks.map((t: { Id: string; Subject: string; Status: string; Priority: string; ActivityDate: string; What?: { Name: string; Id?: string } }) => ({
          id: t.Id,
          subject: t.Subject.replace(/^(GOAL|PLAN|MILESTONE):\s*/i, ""),
          household: t.What?.Name || "",
          householdId: t.What?.Id || "",
          status: t.Status as Goal["status"],
          priority: t.Priority,
          dueDate: t.ActivityDate || "",
          category: parseCategory(t.Subject),
          url: `${res.instanceUrl}/${t.Id}`,
        })));
        setHouseholds((res.households || []).map((h: { Id: string; Name: string }) => ({ id: h.Id, name: h.Name })));
        setInstanceUrl(res.instanceUrl);
      }
    } catch { /* */ }
    setLoading(false);
  };

  const addGoal = async () => {
    if (!newGoal.subject.trim() || !newGoal.householdId) return;
    setSaving(true);
    try {
      const household = households.find(h => h.id === newGoal.householdId);
      const res = await callSF("createTask", {
        subject: `GOAL: ${newGoal.subject}`,
        householdId: newGoal.householdId,
        status: "Not Started",
        priority: newGoal.priority,
        dueDate: newGoal.dueDate || undefined,
      });
      if (res.success) {
        setGoals(prev => [{
          id: res.taskId || `temp-${Date.now()}`,
          subject: newGoal.subject,
          household: household?.name || "",
          householdId: newGoal.householdId,
          status: "Not Started",
          priority: newGoal.priority,
          dueDate: newGoal.dueDate,
          category: parseCategory(newGoal.subject),
          url: `${instanceUrl}/${res.taskId || ""}`,
        }, ...prev]);
        setNewGoal({ subject: "", householdId: "", dueDate: "", priority: "Normal" });
        setShowAdd(false);
        showToast("Goal added to Salesforce");
      }
    } catch { showToast("Failed to save goal"); }
    setSaving(false);
  };

  const toggleComplete = async (goal: Goal) => {
    const newStatus = goal.status === "Completed" ? "Not Started" : "Completed";
    try {
      if (newStatus === "Completed") {
        await callSF("completeTask", { taskId: goal.id });
      }
      setGoals(prev => prev.map(g => g.id === goal.id ? { ...g, status: newStatus } : g));
      showToast(newStatus === "Completed" ? "Goal completed!" : "Goal reopened");
    } catch { showToast("Failed to update"); }
  };

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  // Filter + search
  const filtered = goals.filter(g => {
    if (filter === "active" && g.status === "Completed") return false;
    if (filter === "completed" && g.status !== "Completed") return false;
    if (initialContext && g.householdId !== initialContext.householdId) return false;
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      return g.subject.toLowerCase().includes(q) || g.household.toLowerCase().includes(q) || g.category.toLowerCase().includes(q);
    }
    return true;
  });

  // Group by household
  const grouped = new Map<string, Goal[]>();
  for (const g of filtered) {
    const key = g.household || "Unassigned";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(g);
  }

  // Stats
  const activeGoals = goals.filter(g => g.status !== "Completed" && (!initialContext || g.householdId === initialContext.householdId));
  const completedGoals = goals.filter(g => g.status === "Completed" && (!initialContext || g.householdId === initialContext.householdId));
  const overdueGoals = activeGoals.filter(g => g.dueDate && new Date(g.dueDate).getTime() < Date.now());
  const categories = [...new Set(filtered.map(g => g.category))];

  const familyName = initialContext?.familyName;
  const progressPct = goals.length > 0 ? Math.round(completedGoals.length / (activeGoals.length + completedGoals.length) * 100) : 0;

  return (
    <div className="flex h-screen bg-[#fafafa]">
      <div className="w-full flex flex-col">
        <FlowHeader title="Planning & Goals" familyName={familyName} stepLabel={familyName ? "Household Goals" : "All Households"} progressPct={progressPct} onBack={onExit} onShowPane={() => {}} hasIndicator={false} />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 pb-16">
          <div className="max-w-3xl w-full mx-auto">

            {loading ? (
              <div className="text-center pt-16">
                <Loader2 size={36} className="animate-spin text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">Loading goals from Salesforce...</p>
              </div>
            ) : (
              <div className="animate-fade-in space-y-6">

                {/* Stats row */}
                <div className="grid grid-cols-4 gap-3">
                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-light text-slate-900">{activeGoals.length}</p>
                    <p className="text-[10px] text-slate-400">Active</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-light text-green-600">{completedGoals.length}</p>
                    <p className="text-[10px] text-slate-400">Completed</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                    <p className={`text-2xl font-light ${overdueGoals.length > 0 ? "text-red-600" : "text-slate-900"}`}>{overdueGoals.length}</p>
                    <p className="text-[10px] text-slate-400">Overdue</p>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                    <p className="text-2xl font-light text-slate-900">{categories.length}</p>
                    <p className="text-[10px] text-slate-400">Categories</p>
                  </div>
                </div>

                {/* Progress bar */}
                {(activeGoals.length + completedGoals.length) > 0 && (
                  <div className="bg-white border border-slate-200 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                      <p className="text-xs text-slate-400 font-medium">Overall Progress</p>
                      <p className="text-xs text-slate-500">{completedGoals.length} of {activeGoals.length + completedGoals.length} · {progressPct}%</p>
                    </div>
                    <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${progressPct}%` }} />
                    </div>
                  </div>
                )}

                {/* Toolbar */}
                <div className="flex items-center gap-3 flex-wrap">
                  {/* Filter pills */}
                  <div className="flex items-center gap-1.5">
                    {(["all", "active", "completed"] as const).map(f => (
                      <button key={f} onClick={() => setFilter(f)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${filter === f ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:text-slate-700"}`}>
                        {f === "all" ? "All" : f === "active" ? "Active" : "Completed"}
                      </button>
                    ))}
                  </div>
                  <div className="flex-1" />
                  {/* Search */}
                  <div className="relative">
                    <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                      placeholder="Search goals..." className="pl-8 pr-3 py-1.5 text-sm rounded-lg border border-slate-200 bg-white text-slate-700 placeholder:text-slate-300 outline-none focus:border-slate-400 w-48" />
                  </div>
                  {/* Add button */}
                  <button onClick={() => setShowAdd(!showAdd)}
                    className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors">
                    <Plus size={14} /> Add Goal
                  </button>
                </div>

                {/* Add Goal Form */}
                {showAdd && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-4 animate-fade-in">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold text-slate-700">New Goal</p>
                      <button onClick={() => setShowAdd(false)}><X size={16} className="text-slate-400" /></button>
                    </div>

                    {/* Quick templates */}
                    <div className="flex flex-wrap gap-2">
                      {GOAL_TEMPLATES.map((t, i) => (
                        <button key={i} onClick={() => setNewGoal(prev => ({ ...prev, subject: t }))}
                          className={`text-xs px-2.5 py-1 rounded-lg border transition-colors ${newGoal.subject === t ? "bg-slate-900 text-white border-slate-900" : "bg-white border-slate-200 text-slate-500 hover:border-slate-400"}`}>
                          {t}
                        </button>
                      ))}
                    </div>

                    <input value={newGoal.subject} onChange={e => setNewGoal(prev => ({ ...prev, subject: e.target.value }))}
                      placeholder="Goal description..." className="w-full px-4 py-2.5 text-sm rounded-xl border border-slate-200 text-slate-700 placeholder:text-slate-300 outline-none focus:border-slate-400" />

                    <div className="grid grid-cols-3 gap-3">
                      <select value={newGoal.householdId} onChange={e => setNewGoal(prev => ({ ...prev, householdId: e.target.value }))}
                        className="px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-700 outline-none focus:border-slate-400 bg-white">
                        <option value="">Select household...</option>
                        {households.map(h => <option key={h.id} value={h.id}>{h.name}</option>)}
                      </select>
                      <input type="date" value={newGoal.dueDate} onChange={e => setNewGoal(prev => ({ ...prev, dueDate: e.target.value }))}
                        className="px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-700 outline-none focus:border-slate-400" />
                      <select value={newGoal.priority} onChange={e => setNewGoal(prev => ({ ...prev, priority: e.target.value }))}
                        className="px-3 py-2 text-sm rounded-xl border border-slate-200 text-slate-700 outline-none focus:border-slate-400 bg-white">
                        <option value="Normal">Normal</option>
                        <option value="High">High Priority</option>
                      </select>
                    </div>

                    <button onClick={addGoal} disabled={!newGoal.subject.trim() || !newGoal.householdId || saving}
                      className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-30 transition-colors text-sm">
                      {saving ? "Saving..." : "Add Goal to Salesforce"}
                    </button>
                  </div>
                )}

                {/* Empty state */}
                {filtered.length === 0 && !showAdd && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-12 text-center">
                    <Target size={36} className="text-slate-300 mx-auto mb-4" />
                    <p className="text-slate-600 font-medium mb-1">No planning goals found</p>
                    <p className="text-sm text-slate-400 mb-2">Goals are Salesforce tasks prefixed with <span className="font-mono bg-slate-100 px-1.5 py-0.5 rounded text-xs">GOAL:</span></p>
                    <p className="text-xs text-slate-300 mb-5">Seed demo data from Settings, or add your first goal below.</p>
                    <button onClick={() => setShowAdd(true)} className="text-sm px-4 py-2 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors">
                      Add Your First Goal
                    </button>
                  </div>
                )}

                {/* Goals grouped by household */}
                {Array.from(grouped.entries()).map(([hhName, hhGoals]) => (
                  <div key={hhName} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Target size={14} className="text-slate-400" />
                        <span className="text-sm font-semibold text-slate-700">{hhName.replace(" Household", "")}</span>
                        <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{hhGoals.length}</span>
                      </div>
                      {onNavigate && hhGoals[0]?.householdId && (
                        <button onClick={() => onNavigate("family" as Screen, { householdId: hhGoals[0].householdId, familyName: hhName.replace(" Household", "") })}
                          className="text-[11px] text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
                          View Family <ChevronRight size={12} />
                        </button>
                      )}
                    </div>

                    {hhGoals.map((g, i) => {
                      const isOverdue = g.status !== "Completed" && g.dueDate && new Date(g.dueDate).getTime() < Date.now();
                      return (
                        <div key={i} className="flex items-center gap-3 px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                          {/* Check circle */}
                          <button onClick={() => toggleComplete(g)} className="flex-shrink-0">
                            {g.status === "Completed"
                              ? <CheckCircle size={18} className="text-green-500" />
                              : <Circle size={18} className="text-slate-300 hover:text-slate-500 transition-colors" />}
                          </button>

                          {/* Content */}
                          <div className="min-w-0 flex-1">
                            <p className={`text-sm ${g.status === "Completed" ? "text-slate-400 line-through" : "text-slate-700"}`}>{g.subject}</p>
                            <div className="flex items-center gap-2 mt-0.5">
                              <span className={`text-[10px] px-1.5 py-0.5 rounded ${CATEGORY_COLORS[g.category] || CATEGORY_COLORS["Financial Goal"]}`}>{g.category}</span>
                              {g.dueDate && (
                                <span className={`text-[10px] flex items-center gap-0.5 ${isOverdue ? "text-red-500 font-medium" : "text-slate-400"}`}>
                                  {isOverdue && <AlertTriangle size={9} />}
                                  <Calendar size={9} /> {new Date(g.dueDate).toLocaleDateString()}
                                </span>
                              )}
                              {g.priority === "High" && <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">High</span>}
                            </div>
                          </div>

                          {/* SF link */}
                          {g.url && <a href={g.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} className="text-slate-400 hover:text-blue-500 transition-colors" /></a>}
                        </div>
                      );
                    })}
                  </div>
                ))}

              </div>
            )}
          </div>
        </div>

        {/* Toast */}
        {toast && (
          <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-sm shadow-lg">
            <CheckCircle size={14} className="text-green-400" /> {toast}
          </div>
        )}
      </div>
    </div>
  );
}
