"use client";
import { useState, useEffect, useMemo } from "react";
import { Loader2, Activity, CheckCircle, Shield, Send, MessageSquare, UserPlus, FileText, Clock, DollarSign, Search, X, ExternalLink, ChevronDown, AlertTriangle } from "lucide-react";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { callSF } from "@/lib/salesforce";
import type { Screen, WorkflowContext } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface ActivityItem {
  id: string;
  action: string;
  category: "compliance" | "docusign" | "meeting" | "onboard" | "task" | "money" | "audit" | "workflow";
  label: string;
  household: string;
  householdId?: string;
  timestamp: string;
  result?: "success" | "error";
  url: string;
}

type CategoryFilter = "all" | ActivityItem["category"];

const CATEGORY_CONFIG: Record<ActivityItem["category"], { label: string; icon: React.ElementType; color: string }> = {
  compliance: { label: "Compliance", icon: Shield, color: "text-green-500" },
  docusign: { label: "DocuSign", icon: Send, color: "text-blue-500" },
  meeting: { label: "Meeting", icon: MessageSquare, color: "text-purple-500" },
  onboard: { label: "Onboard", icon: UserPlus, color: "text-teal-500" },
  task: { label: "Task", icon: CheckCircle, color: "text-amber-500" },
  money: { label: "Money", icon: DollarSign, color: "text-emerald-500" },
  audit: { label: "Audit", icon: FileText, color: "text-slate-500" },
  workflow: { label: "Workflow", icon: Activity, color: "text-indigo-500" },
};

// ─── Classify Task into Activity ─────────────────────────────────────────────

function classifyActivity(subject: string): ActivityItem["category"] {
  const s = subject.toUpperCase();
  if (s.includes("MIN:AUDIT")) return "audit";
  if (s.includes("COMPLIANCE REVIEW") || s.includes("KYC") || s.includes("ADV")) return "compliance";
  if (s.includes("SEND DOCU") || s.includes("DOCUSIGN")) return "docusign";
  if (s.includes("MEETING NOTE")) return "meeting";
  if (s.includes("CONFIRM INTENT") || s.includes("RECORD COMPLETENESS") || s.startsWith("MIN:")) return "onboard";
  if (s.includes("WORKFLOW")) return "workflow";
  if (s.includes("WIRE") || s.includes("JOURNAL") || s.includes("DISTRIBUTION")) return "money";
  return "task";
}

function humanizeAction(subject: string): string {
  const s = subject;
  if (s.includes("MIN:AUDIT")) {
    const match = s.match(/MIN:AUDIT — (\w+) — (\w+)/);
    return match ? `Audit: ${match[1]} (${match[2]})` : "Audit log recorded";
  }
  if (s.includes("COMPLIANCE REVIEW PASSED")) return "Compliance review passed";
  if (s.includes("COMPLIANCE REVIEW")) return "Compliance review completed";
  if (s.includes("SEND DOCU")) return "DocuSign envelope sent";
  if (s.includes("MEETING NOTE")) return "Meeting notes recorded";
  if (s.includes("CONFIRM INTENT")) return "Client onboarding confirmed";
  if (s.includes("RECORD COMPLETENESS")) return "Completeness check recorded";
  if (s.includes("WORKFLOW")) return "Workflow step completed";
  return subject.length > 60 ? subject.slice(0, 57) + "…" : subject;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function ActivityFeedScreen({ onExit, onNavigate }: {
  onExit: () => void;
  onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ActivityItem[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [showCount, setShowCount] = useState(50);

  useEffect(() => {
    (async () => {
      try {
        const res = await callSF("queryTasks", { limit: 500 });
        if (res.success) {
          const tasks = res.tasks as { id: string; subject: string; status: string; createdAt: string; householdName?: string; householdId?: string; description?: string }[];
          // Include both completed and recent open tasks as activity
          const activityItems: ActivityItem[] = tasks
            .filter(t => t.status === "Completed" || t.subject?.includes("MIN:"))
            .map(t => ({
              id: t.id,
              action: humanizeAction(t.subject || ""),
              category: classifyActivity(t.subject || ""),
              label: t.subject || "",
              household: (t.householdName || "").replace(" Household", ""),
              householdId: t.householdId,
              timestamp: t.createdAt,
              result: t.subject?.includes("FAILED") || t.subject?.includes("error") ? "error" as const : "success" as const,
              url: t.id ? `${(res as Record<string, unknown>).instanceUrl || ""}/lightning/r/Task/${t.id}/view` : "",
            }))
            .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
          setItems(activityItems);
        }
      } catch {
        setLoadError("Could not load activity feed. Check your connection and try again.");
      }
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    let list = items;
    if (categoryFilter !== "all") list = list.filter(i => i.category === categoryFilter);
    if (filter) {
      const q = filter.toLowerCase();
      list = list.filter(i => i.action.toLowerCase().includes(q) || i.household.toLowerCase().includes(q) || i.label.toLowerCase().includes(q));
    }
    return list;
  }, [items, categoryFilter, filter]);

  const categoryCounts = useMemo(() => {
    const counts: Record<string, number> = { all: items.length };
    for (const item of items) {
      counts[item.category] = (counts[item.category] || 0) + 1;
    }
    return counts;
  }, [items]);

  // Group by date
  const grouped = useMemo(() => {
    const groups = new Map<string, ActivityItem[]>();
    for (const item of filtered.slice(0, showCount)) {
      const d = new Date(item.timestamp);
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      let key: string;
      if (d.toDateString() === today.toDateString()) key = "Today";
      else if (d.toDateString() === yesterday.toDateString()) key = "Yesterday";
      else key = d.toLocaleDateString("en-US", { weekday: "long", month: "short", day: "numeric" });

      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(item);
    }
    return groups;
  }, [filtered, showCount]);

  if (loading) return (
    <div className="flex h-screen bg-surface items-center justify-center">
      <div className="flex items-center gap-3 text-slate-400"><Loader2 size={22} className="animate-spin" /><span className="text-sm">Loading activity...</span></div>
    </div>
  );

  if (loadError) return (
    <div className="flex h-screen bg-surface items-center justify-center">
      <div className="max-w-sm text-center">
        <AlertTriangle size={24} className="mx-auto text-amber-400 mb-3" />
        <p className="text-sm text-slate-700 font-medium mb-1">Activity feed unavailable</p>
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
        <FlowHeader title="Activity Feed" stepLabel={`${filtered.length} events`} onBack={onExit} />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-6 pb-16">
          <div className="max-w-3xl w-full mx-auto">

            <p className="text-slate-400 text-sm mb-6">Everything that happened across your practice, in real time.</p>

            {/* Category pills */}
            <div className="flex items-center gap-2 mb-4 flex-wrap">
              {(["all", "compliance", "docusign", "meeting", "onboard", "task", "money"] as CategoryFilter[]).map(c => (
                <button key={c} onClick={() => setCategoryFilter(c)}
                  className={`text-xs px-3 py-1.5 rounded-full font-medium transition-all ${categoryFilter === c
                    ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:border-slate-400"}`}>
                  {c === "all" ? "All" : CATEGORY_CONFIG[c].label}
                  {(categoryCounts[c] || 0) > 0 && <span className="ml-1 opacity-70">({categoryCounts[c]})</span>}
                </button>
              ))}
            </div>

            {/* Search */}
            <div className="relative mb-6">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <input className="w-full h-10 rounded-xl border border-slate-200 bg-white pl-9 pr-8 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent"
                placeholder="Search activity..." value={filter} onChange={e => setFilter(e.target.value)} />
              {filter && <button onClick={() => setFilter("")} aria-label="Clear search" className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500"><X size={14} /></button>}
            </div>

            {/* Timeline */}
            {filtered.length === 0 ? (
              <div className="bg-white border border-slate-200 rounded-2xl p-10 text-center">
                <Activity size={24} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm font-medium text-slate-500">No activity yet</p>
                <p className="text-xs text-slate-400 mt-1">Completed tasks and Min actions will appear here.</p>
              </div>
            ) : (
              <div className="space-y-6">
                {Array.from(grouped.entries()).map(([dateLabel, dateItems]) => (
                  <div key={dateLabel}>
                    <div className="flex items-center gap-3 mb-3">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">{dateLabel}</span>
                      <div className="flex-1 h-px bg-slate-100" />
                      <span className="text-xs text-slate-500">{dateItems.length}</span>
                    </div>
                    <ul className="space-y-1" role="list">
                      {dateItems.map((item, i) => {
                        const config = CATEGORY_CONFIG[item.category];
                        const Icon = config.icon;
                        return (
                          <li key={`${item.id}-${i}`} className="flex items-center gap-3 px-4 py-3 bg-white border border-slate-200 rounded-xl hover:shadow-sm transition-all group">
                            <div className={`flex-shrink-0 ${config.color}`} aria-hidden="true"><Icon size={16} /></div>
                            <div className="min-w-0 flex-1">
                              <p className="text-sm text-slate-700">{item.action}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {item.household && <span className="text-xs text-slate-400">{item.household}</span>}
                                <span className="text-xs text-slate-500">·</span>
                                <span className="text-xs text-slate-500">{new Date(item.timestamp).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</span>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                              {item.result === "error" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">Error</span>}
                              {item.householdId && onNavigate && (
                                <button onClick={() => onNavigate("family", { householdId: item.householdId!, familyName: item.household })}
                                  aria-label={`View ${item.household} family`}
                                  className="text-[11px] px-2 py-1 rounded-lg border border-slate-200 text-slate-500 hover:border-slate-400 transition-colors whitespace-nowrap sm:opacity-0 sm:group-hover:opacity-100">
                                  View Family
                                </button>
                              )}
                              {item.url && (
                                <a href={item.url} target="_blank" rel="noopener noreferrer" aria-label={`Open ${item.action} in Salesforce`} className="sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                                  <ExternalLink size={14} className="text-slate-400 hover:text-blue-500 transition-colors" />
                                </a>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}

                {filtered.length > showCount && (
                  <button onClick={() => setShowCount(s => s + 50)}
                    className="w-full py-3 text-sm text-slate-400 hover:text-slate-600 transition-colors flex items-center justify-center gap-2">
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
