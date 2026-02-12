"use client";
import { useState, useMemo } from "react";
import { Search, ArrowUpDown, ExternalLink, CheckCircle, Clock, Shield, MessageSquare, Send, Loader2, X, ChevronDown, ChevronRight, AlertTriangle } from "lucide-react";
import { callSF } from "@/lib/salesforce";
import { classifyTask, TASK_TYPE_LABELS } from "@/lib/task-subjects";
import type { TaskType } from "@/lib/task-subjects";
import type { Screen, WorkflowContext } from "@/lib/types";
import type { HomeStats, StatDetailItem } from "@/lib/home-stats";

type TypeFilter = "all" | TaskType;
type ViewMode = "grouped" | "flat";

function typeIcon(t: TypeFilter) {
  if (t === "compliance") return <Shield size={14} className="text-green-500" />;
  if (t === "docusign") return <Send size={14} className="text-blue-500" />;
  if (t === "meeting") return <MessageSquare size={14} className="text-purple-500" />;
  return <Clock size={14} className="text-amber-500" />;
}

const TYPE_LABELS: Record<TypeFilter, string> = { all: "All", ...TASK_TYPE_LABELS };

// ─── Time Bucket Logic ─────────────────────────────────────────────────────

type Bucket = "overdue" | "today" | "thisWeek" | "upcoming" | "noDue";

function getBucket(due?: string): Bucket {
  if (!due) return "noDue";
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const endOfWeek = new Date(today);
  endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

  // Parse the due date — it comes in as locale string like "2/14/2026"
  const dueDate = new Date(due);
  if (isNaN(dueDate.getTime())) return "noDue";

  const dueDay = new Date(dueDate.getFullYear(), dueDate.getMonth(), dueDate.getDate());

  if (dueDay < today) return "overdue";
  if (dueDay.getTime() === today.getTime()) return "today";
  if (dueDay <= endOfWeek) return "thisWeek";
  return "upcoming";
}

const BUCKET_CONFIG: Record<Bucket, { label: string; color: string; icon: React.ReactNode }> = {
  overdue: { label: "Overdue", color: "text-red-600", icon: <AlertTriangle size={14} className="text-red-500" /> },
  today: { label: "Due Today", color: "text-amber-600", icon: <Clock size={14} className="text-amber-500" /> },
  thisWeek: { label: "This Week", color: "text-blue-600", icon: <Clock size={14} className="text-blue-500" /> },
  upcoming: { label: "Upcoming", color: "text-slate-600", icon: <Clock size={14} className="text-slate-400" /> },
  noDue: { label: "No Due Date", color: "text-slate-400", icon: <Clock size={14} className="text-slate-300" /> },
};

const BUCKET_ORDER: Bucket[] = ["overdue", "today", "thisWeek", "upcoming", "noDue"];

// ─── Component ──────────────────────────────────────────────────────────────

export function TaskManager({ stats, onBack, goTo, showToast }: {
  stats: HomeStats | null;
  onBack: () => void;
  goTo: (s: Screen, ctx?: WorkflowContext) => void;
  showToast: (msg: string) => void;
}) {
  const [filter, setFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [viewMode, setViewMode] = useState<ViewMode>("grouped");
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState<string | null>(null);
  const [collapsedBuckets, setCollapsedBuckets] = useState<Set<Bucket>>(new Set());

  const allItems = stats?.openTaskItems || [];

  const toggleBucket = (b: Bucket) => {
    setCollapsedBuckets(prev => {
      const next = new Set(prev);
      if (next.has(b)) next.delete(b); else next.add(b);
      return next;
    });
  };

  const filtered = useMemo(() => {
    let items = allItems.filter(t => !completed.has(t.url));
    if (typeFilter !== "all") items = items.filter(t => classifyTask(t.label) === typeFilter);
    if (filter) {
      const q = filter.toLowerCase();
      items = items.filter(t => t.label.toLowerCase().includes(q) || t.sub.toLowerCase().includes(q));
    }
    return items;
  }, [allItems, filter, typeFilter, completed]);

  // Group by time bucket
  const buckets = useMemo(() => {
    const groups = new Map<Bucket, StatDetailItem[]>();
    for (const b of BUCKET_ORDER) groups.set(b, []);
    for (const item of filtered) {
      const bucket = getBucket(item.due);
      groups.get(bucket)!.push(item);
    }
    // Sort within each bucket: High priority first, then by due date
    for (const items of groups.values()) {
      items.sort((a, b) => {
        const pA = a.priority === "High" ? 0 : 1;
        const pB = b.priority === "High" ? 0 : 1;
        if (pA !== pB) return pA - pB;
        return (a.due || "9999").localeCompare(b.due || "9999");
      });
    }
    return groups;
  }, [filtered]);

  const markComplete = async (item: StatDetailItem) => {
    setCompleting(item.url);
    try {
      const taskId = item.url.split("/").pop();
      if (taskId) await callSF("completeTask", { taskId });
    } catch (err) {
      console.error("Failed to complete task:", err);
    }
    setCompleted(prev => { const s = new Set(prev); s.add(item.url); return s; });
    setCompleting(null);
    showToast(`Task completed in Salesforce`);
  };

  const typeCounts = useMemo(() => {
    const items = allItems.filter(t => !completed.has(t.url));
    const counts: Record<TypeFilter, number> = { all: items.length, compliance: 0, docusign: 0, meeting: 0, task: 0 };
    items.forEach(t => { counts[classifyTask(t.label)]++; });
    return counts;
  }, [allItems, completed]);

  if (!stats) return (
    <div className="flex h-screen bg-[#fafafa] items-center justify-center">
      <div className="flex items-center gap-3 text-slate-400"><Loader2 size={22} className="animate-spin" /><span className="text-sm">Loading tasks...</span></div>
    </div>
  );

  const renderTask = (t: StatDetailItem, i: number) => {
    const taskType = classifyTask(t.label);
    const isCompleting = completing === t.url;
    return (
      <div key={`${t.url}-${i}`} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all group">
        <button onClick={() => markComplete(t)} disabled={isCompleting}
          className="w-5 h-5 rounded-full border-2 border-slate-300 flex items-center justify-center hover:border-green-500 hover:bg-green-50 transition-all flex-shrink-0">
          {isCompleting ? <Loader2 size={12} className="animate-spin text-slate-400" /> : <CheckCircle size={12} className="text-transparent group-hover:text-green-400 transition-colors" />}
        </button>
        <div className="flex-shrink-0">{typeIcon(taskType)}</div>
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-700 truncate">{t.label}</p>
          <p className="text-xs text-slate-400 truncate">{t.sub}</p>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {t.priority === "High" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">High</span>}
          {t.householdId && (
            <button onClick={() => goTo("family" as Screen, { householdId: t.householdId!, familyName: (t.householdName || t.sub || "").replace(" Household", "") })}
              className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-400 transition-colors whitespace-nowrap opacity-0 group-hover:opacity-100">
              View Family
            </button>
          )}
          <a href={t.url} target="_blank" rel="noopener noreferrer" className="opacity-0 group-hover:opacity-100 transition-opacity">
            <ExternalLink size={12} className="text-slate-300" />
          </a>
        </div>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#fafafa]">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto px-6 py-10">

          <button onClick={onBack} className="text-sm text-slate-400 hover:text-slate-600 transition-colors mb-6">← Back</button>

          <div className="flex items-center justify-between mb-2">
            <h1 className="text-3xl font-light text-slate-900">Task Manager</h1>
            <div className="flex items-center gap-3 text-sm text-slate-400">
              <span>{filtered.length} task{filtered.length !== 1 ? "s" : ""}</span>
              {completed.size > 0 && <span className="text-green-500">· {completed.size} done</span>}
              <button onClick={() => setViewMode(viewMode === "grouped" ? "flat" : "grouped")}
                className="text-xs px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-400 transition-all">
                {viewMode === "grouped" ? "Flat View" : "Grouped"}
              </button>
            </div>
          </div>
          <p className="text-slate-400 mb-6">View, sort, and complete tasks across all households.</p>

          {/* Type filter pills */}
          <div className="flex items-center gap-2 mb-4 flex-wrap">
            {(["all", "compliance", "docusign", "meeting", "task"] as TypeFilter[]).map(t => (
              <button key={t} onClick={() => setTypeFilter(t)}
                className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${typeFilter === t
                  ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-400"}`}>
                {TYPE_LABELS[t]} {typeCounts[t] > 0 && <span className="ml-1 opacity-70">({typeCounts[t]})</span>}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
              placeholder="Filter tasks..." value={filter} onChange={e => setFilter(e.target.value)} />
            {filter && <button onClick={() => setFilter("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14} /></button>}
          </div>

          {/* Task list */}
          {filtered.length === 0 ? (
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center">
              <p className="text-sm text-slate-400">{filter || typeFilter !== "all" ? "No tasks match your filters." : "No open tasks — all clear!"}</p>
            </div>
          ) : viewMode === "flat" ? (
            /* Flat view — simple list */
            <div className="space-y-2">
              {filtered.sort((a, b) => {
                const pA = a.priority === "High" ? 0 : 1;
                const pB = b.priority === "High" ? 0 : 1;
                if (pA !== pB) return pA - pB;
                return (a.due || "9999").localeCompare(b.due || "9999");
              }).map((t, i) => renderTask(t, i))}
            </div>
          ) : (
            /* Grouped view — time buckets */
            <div className="space-y-4">
              {BUCKET_ORDER.map(bucket => {
                const items = buckets.get(bucket) || [];
                if (items.length === 0) return null;
                const config = BUCKET_CONFIG[bucket];
                const isCollapsed = collapsedBuckets.has(bucket);

                return (
                  <div key={bucket}>
                    <button onClick={() => toggleBucket(bucket)}
                      className="flex items-center gap-2 mb-2 w-full text-left group">
                      {isCollapsed
                        ? <ChevronRight size={14} className="text-slate-400" />
                        : <ChevronDown size={14} className="text-slate-400" />
                      }
                      {config.icon}
                      <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                        bucket === "overdue" ? "bg-red-100 text-red-600" :
                        bucket === "today" ? "bg-amber-100 text-amber-600" :
                        "bg-slate-100 text-slate-500"
                      }`}>{items.length}</span>
                    </button>
                    {!isCollapsed && (
                      <div className="space-y-2 ml-1">
                        {items.map((t, i) => renderTask(t, i))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Completed this session */}
          {completed.size > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-3 mb-3">
                <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Completed This Session</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">{completed.size}</span>
              </div>
              <div className="space-y-1">
                {allItems.filter(t => completed.has(t.url)).map((t, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-2 bg-slate-50 rounded-xl opacity-60">
                    <CheckCircle size={14} className="text-green-500 flex-shrink-0" />
                    <p className="text-sm text-slate-500 truncate line-through">{t.label}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
