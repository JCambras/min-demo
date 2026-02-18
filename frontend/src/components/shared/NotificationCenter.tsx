"use client";
import { useState, useEffect, useRef, useMemo } from "react";
import { Bell, AlertTriangle, Clock, Send, Shield, CheckCircle, X, ChevronRight } from "lucide-react";
import type { HomeStats } from "@/lib/home-stats";
import type { Screen, WorkflowContext } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface Notification {
  id: string;
  type: "overdue" | "unsigned" | "compliance" | "info";
  title: string;
  detail: string;
  screen?: Screen;
  ctx?: WorkflowContext;
  timestamp: Date;
}

const TYPE_CONFIG: Record<Notification["type"], { icon: React.ElementType; color: string; bg: string }> = {
  overdue: { icon: AlertTriangle, color: "text-red-500", bg: "bg-red-50" },
  unsigned: { icon: Send, color: "text-blue-500", bg: "bg-blue-50" },
  compliance: { icon: Shield, color: "text-amber-500", bg: "bg-amber-50" },
  info: { icon: CheckCircle, color: "text-green-500", bg: "bg-green-50" },
};

// ─── Component ──────────────────────────────────────────────────────────────

export function NotificationCenter({ stats, onNavigate }: {
  stats: HomeStats | null;
  onNavigate: (screen: Screen, ctx?: WorkflowContext) => void;
}) {
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(new Set());
  const ref = useRef<HTMLDivElement>(null);

  // Close on click outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const notifications = useMemo((): Notification[] => {
    if (!stats) return [];
    const notifs: Notification[] = [];
    const now = new Date();

    // Overdue tasks
    if (stats.overdueTasks > 0) {
      notifs.push({
        id: "overdue-tasks",
        type: "overdue",
        title: `${stats.overdueTasks} overdue task${stats.overdueTasks !== 1 ? "s" : ""}`,
        detail: stats.overdueTaskItems.slice(0, 2).map(t => t.label).join(", "),
        screen: "taskManager",
        timestamp: now,
      });
    }

    // Unsigned envelopes
    if (stats.unsignedEnvelopes > 0) {
      notifs.push({
        id: "unsigned-envelopes",
        type: "unsigned",
        title: `${stats.unsignedEnvelopes} unsigned envelope${stats.unsignedEnvelopes !== 1 ? "s" : ""}`,
        detail: stats.unsignedItems.slice(0, 2).map(t => t.label).join(", "),
        screen: "taskManager",
        timestamp: now,
      });
    }

    // Compliance reviews needed
    if (stats.readyForReview > 0) {
      notifs.push({
        id: "compliance-reviews",
        type: "compliance",
        title: `${stats.readyForReview} household${stats.readyForReview !== 1 ? "s" : ""} need${stats.readyForReview === 1 ? "s" : ""} review`,
        detail: stats.readyForReviewItems.slice(0, 2).map(t => t.label).join(", "),
        screen: "compliance",
        timestamp: now,
      });
    }

    // High priority triage items
    const criticalTriage = stats.triageItems?.filter(t => t.urgency === "now") || [];
    if (criticalTriage.length > 0) {
      notifs.push({
        id: "critical-triage",
        type: "overdue",
        title: `${criticalTriage.length} item${criticalTriage.length !== 1 ? "s" : ""} need immediate attention`,
        detail: criticalTriage.slice(0, 2).map(t => t.label).join(", "),
        timestamp: now,
      });
    }

    // Recent meetings (info)
    if (stats.upcomingMeetings > 0) {
      notifs.push({
        id: "meetings",
        type: "info",
        title: `${stats.upcomingMeetings} meeting${stats.upcomingMeetings !== 1 ? "s" : ""} logged this week`,
        detail: "",
        timestamp: now,
      });
    }

    return notifs.filter(n => !dismissed.has(n.id));
  }, [stats, dismissed]);

  const unreadCount = notifications.length;

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(!open)} className="relative text-slate-400 hover:text-slate-600 transition-colors p-1" aria-label="Notifications">
        <Bell size={18} />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-slate-200 rounded-2xl shadow-xl overflow-hidden z-50 animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-700">Notifications</h3>
            {notifications.length > 0 && (
              <button onClick={() => { setDismissed(new Set(notifications.map(n => n.id))); }}
                className="text-[10px] text-slate-400 hover:text-slate-600">Clear all</button>
            )}
          </div>

          {/* Notifications */}
          <div className="max-h-80 overflow-y-auto">
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <CheckCircle size={20} className="text-green-300 mx-auto mb-2" />
                <p className="text-sm text-slate-400">All caught up</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-50">
                {notifications.map(n => {
                  const config = TYPE_CONFIG[n.type];
                  const Icon = config.icon;
                  return (
                    <div key={n.id} className="px-4 py-3 hover:bg-slate-50 transition-colors group">
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 rounded-lg ${config.bg} ${config.color} flex items-center justify-center flex-shrink-0 mt-0.5`}>
                          <Icon size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700 font-medium">{n.title}</p>
                          {n.detail && <p className="text-xs text-slate-400 mt-0.5 truncate">{n.detail}</p>}
                          <div className="flex items-center gap-2 mt-1.5">
                            {n.screen && (
                              <button onClick={() => { onNavigate(n.screen!, n.ctx); setOpen(false); }}
                                className="text-[10px] text-blue-600 hover:underline flex items-center gap-0.5">
                                View <ChevronRight size={10} />
                              </button>
                            )}
                          </div>
                        </div>
                        <button onClick={() => setDismissed(prev => { const s = new Set(prev); s.add(n.id); return s; })}
                          className="text-slate-300 hover:text-slate-500 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
                          <X size={12} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
