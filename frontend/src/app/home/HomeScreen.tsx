"use client";
import { useState, useEffect, useCallback } from "react";
import { Briefcase, UserPlus, FileText, BookOpen, MessageSquare, Search, ChevronRight, Loader2, Users, Shield, Clock, ExternalLink, Settings, CheckCircle, Send, ArrowUpDown, ClipboardCheck, ListTodo, Zap } from "lucide-react";
import { TourButton } from "../tour/DemoMode";
import { callSF } from "@/lib/salesforce";
import { log } from "@/lib/logger";
import { formatDate } from "@/lib/format";
import type { AppState, AppAction } from "@/lib/app-state";
import type { Screen, WorkflowContext, UserRole } from "@/lib/types";
import type { HomeStats } from "@/lib/home-stats";

// ─── Constants ──────────────────────────────────────────────────────────────

export const DEMO_ADVISORS = [
  { id: "jon", name: "Jon Cambras" }, { id: "marcus", name: "Marcus Rivera" },
  { id: "diane", name: "Diane Rivera" }, { id: "james", name: "James Wilder" },
  { id: "amy", name: "Amy Sato" }, { id: "kevin", name: "Kevin Trịnh" },
  { id: "michelle", name: "Michelle Osei" },
];

export const ROLES: { id: UserRole; label: string; desc: string }[] = [
  { id: "advisor", label: "Advisor", desc: "Client meetings, briefings, compliance, and queries" },
  { id: "operations", label: "Operations", desc: "Onboarding, account opening, compliance, and dashboards" },
  { id: "principal", label: "Principal", desc: "Full practice visibility across all workflows" },
];

const ALL_ACTIONS: { id: string; label: string; desc: string; Icon: React.ElementType; roles: UserRole[] }[] = [
  { id: "briefing", label: "Client Briefing", desc: "Full client picture", Icon: BookOpen, roles: ["advisor", "principal"] },
  { id: "meeting", label: "Meeting Logs", desc: "Record notes & follow-ups", Icon: MessageSquare, roles: ["advisor", "principal"] },
  { id: "compliance", label: "Compliance Reviews", desc: "ADV, KYC, suitability", Icon: FileText, roles: ["advisor", "operations", "principal"] },
  { id: "planning", label: "Planning & Goals", desc: "Financial plan progress & milestones", Icon: ClipboardCheck, roles: ["advisor", "principal"] },
  { id: "onboard", label: "Onboard New Client", desc: "Client records & setup", Icon: UserPlus, roles: ["operations", "principal"] },
  { id: "open", label: "Open Account", desc: "Paperwork & e-signatures", Icon: Briefcase, roles: ["operations", "principal"] },
  { id: "taskManager", label: "Task Manager", desc: "View, assign & complete tasks", Icon: ListTodo, roles: ["operations", "principal"] },
  { id: "workflows", label: "Workflow Automation", desc: "Active chains & templates", Icon: Zap, roles: ["operations", "principal"] },
  { id: "dashboard", label: "Full Dashboard", desc: "Detailed practice view", Icon: ChevronRight, roles: ["principal"] },
];

// ─── Types ──────────────────────────────────────────────────────────────────

interface FamilyResult { id: string; name: string; createdDate: string; contactNames: string }

interface HomeScreenProps {
  state: AppState;
  dispatch: React.Dispatch<AppAction>;
  goTo: (screen: Screen, ctx?: WorkflowContext) => void;
  goHome: () => void;
  loadStats: (filterAdv?: string) => void;
  showToast: (msg: string) => void;
}

// ─── Extracted Sub-Components ────────────────────────────────────────────────

function StatCard({ label, value, Icon, color, vColor, expanded, tourKey, onClick, peekItems }: {
  label: string; value: number; Icon: React.ElementType; color: string; vColor: string;
  expanded: boolean; tourKey: string; onClick: () => void; peekItems?: { label: string }[];
}) {
  return (
    <button data-tour={`stat-${tourKey}`} onClick={onClick}
      className={`bg-white border rounded-2xl p-4 text-left transition-all hover:shadow-md ${expanded ? "border-slate-900 shadow-md" : "border-slate-200"}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={14} className={color} />
        <span className="text-[11px] text-slate-400 truncate">{label}</span>
      </div>
      <p className={`text-2xl font-light ${vColor || "text-slate-900"}`}>{value}</p>
      {peekItems && peekItems.length > 0 && !expanded && (
        <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5">
          {peekItems.slice(0, 2).map((item, i) => (
            <p key={i} className="text-[10px] text-slate-400 truncate">{item.label}</p>
          ))}
        </div>
      )}
    </button>
  );
}

function StatPanelRow({ item, showAction, showReminder, reminderSent, onRemind, goTo }: {
  item: { url: string; label: string; sub: string; priority?: string; householdId?: string; householdName?: string };
  showAction?: string; showReminder?: boolean; reminderSent: Set<string>;
  onRemind: (url: string) => void; goTo: (screen: Screen, ctx?: WorkflowContext) => void;
}) {
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
      <a href={item.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1">
        <p className="text-sm text-slate-700 truncate">{item.label}</p>
        <p className="text-xs text-slate-400">{item.sub}</p>
      </a>
      <div className="flex items-center gap-2 ml-3 flex-shrink-0">
        {item.priority === "High" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">High</span>}
        {showAction === "compliance" && item.householdId && (
          <button data-tour="run-check-btn" onClick={() => goTo("compliance", { householdId: item.householdId!, familyName: (item.householdName || "").replace(" Household", "") })}
            className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors whitespace-nowrap">Run Check</button>
        )}
        {showReminder && (
          <button onClick={() => onRemind(item.url)} disabled={reminderSent.has(item.url)}
            className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${reminderSent.has(item.url) ? "bg-green-100 text-green-600 cursor-default" : "bg-blue-600 text-white hover:bg-blue-700"}`}>
            {reminderSent.has(item.url) ? "Sent \u2713" : "Send Reminder"}
          </button>
        )}
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} className="text-slate-400 hover:text-blue-500 transition-colors" />
        </a>
      </div>
    </div>
  );
}

function RecentActivityRow({ item, icon }: {
  item: { url: string; subject: string; household: string };
  icon: React.ReactNode;
}) {
  return (
    <a href={item.url} target="_blank" rel="noopener noreferrer"
      className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
      {icon}
      <div className="min-w-0 flex-1">
        <p className="text-sm text-slate-700 truncate">{item.subject}</p>
        <p className="text-xs text-slate-400">{item.household}</p>
      </div>
    </a>
  );
}

// ─── Component ──────────────────────────────────────────────────────────────

export function HomeScreen({ state, dispatch, goTo, goHome, loadStats, showToast }: HomeScreenProps) {
  const { role, advisorName, sfConnected, sfInstance, stats, statsLoading, tourActive, principalAdvisor } = state;

  // ── Keyboard shortcut: Cmd+R / Ctrl+R to cycle role ──
  const cycleRole = useCallback(() => {
    const ids = ROLES.map(r => r.id);
    const next = ids[(ids.indexOf(role || "advisor") + 1) % ids.length];
    dispatch({ type: "SET_ROLE_INLINE", role: next as UserRole });
  }, [role, dispatch]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "r") {
        e.preventDefault();
        cycleRole();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cycleRole]);

  // ── Local UI state (not app-level) ──
  const [expandedStat, setExpandedStat] = useState<string | null>(null);
  const [panelFilter, setPanelFilter] = useState("");
  const [panelSort, setPanelSort] = useState<"alpha" | "priority" | "due">("alpha");
  const [reminderSent, setReminderSent] = useState<Set<string>>(new Set());
  const [familyQuery, setFamilyQuery] = useState("");
  const [familyResults, setFamilyResults] = useState<FamilyResult[]>([]);
  const [familySearching, setFamilySearching] = useState(false);

  // ── Family search debounce ──
  useEffect(() => {
    if (familyQuery.length < 2) { setFamilyResults([]); return; }
    setFamilySearching(true);
    const t = setTimeout(async () => {
      try {
        const res = await callSF("searchHouseholds", { query: familyQuery });
        if (res.success) setFamilyResults((res.households as { id: string; name: string; createdAt: string; contacts?: { firstName: string }[] }[]).map(h => ({
          id: h.id, name: h.name, createdDate: formatDate(h.createdAt),
          contactNames: h.contacts?.map((c: { firstName: string }) => c.firstName).filter(Boolean).join(" & ") || "",
        })));
      } catch (err) {
        log.warn("HomeScreen", "Family search failed", { query: familyQuery, error: err instanceof Error ? err.message : "Unknown" });
      }
      setFamilySearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [familyQuery]);

  // ── Derived values ──
  const actions = ALL_ACTIONS.filter(a => a.roles.includes(role!));
  const roleLabel = ROLES.find(r => r.id === role)?.label || "User";
  const firstName = advisorName.split(" ")[0] || roleLabel;
  const isAdvisor = role === "advisor";
  const isOps = role === "operations";

  const iconForType = (t: string) =>
    t === "compliance" ? <Shield size={13} className="text-green-500" /> :
    t === "meeting" ? <MessageSquare size={13} className="text-purple-500" /> :
    t === "docusign" ? <FileText size={13} className="text-blue-500" /> :
    <CheckCircle size={13} className="text-slate-400" />;

  const openFamily = (f: FamilyResult) => {
    setFamilyQuery(""); setFamilyResults([]);
    goTo("family", { householdId: f.id, familyName: f.name.replace(" Household", "") });
  };

  const handleAction = (id: string) => {
    if (id === "open") dispatch({ type: "SET_SCREEN", screen: "flow" });
    else if (id === "onboard") dispatch({ type: "SET_SCREEN", screen: "onboard" });
    else if (id === "dashboard") dispatch({ type: "SET_SCREEN", screen: "dashboard" });
    else if (id === "taskManager") dispatch({ type: "SET_SCREEN", screen: "taskManager" });
    else if (id === "workflows") dispatch({ type: "SET_SCREEN", screen: "workflows" });
    else goTo(id as Screen);
  };

  // ── Loading state ──
  if ((isAdvisor || role === "principal") && sfConnected && statsLoading) {
    return (
      <div className="flex h-screen bg-surface items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400"><Loader2 size={22} className="animate-spin" /><span className="text-sm">Loading your practice data...</span></div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-surface"><div className="flex-1 overflow-y-auto"><div className="max-w-3xl w-full mx-auto px-6 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div data-tour="home-greeting">
          <h1 className="text-4xl font-light tracking-tight text-slate-900">Hi, {firstName}</h1>
          <p className="text-sm text-slate-400 font-light mt-1">{role === "principal" && principalAdvisor !== "all" ? `Viewing ${principalAdvisor}'s households` : "Your practice, simplified."}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => { cycleRole(); setExpandedStat(null); }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-all" title="Click or ⌘R to switch role">
            {ROLES.find(r => r.id === role)?.label || "Advisor"}{role === "principal" && principalAdvisor !== "all" ? ` · ${principalAdvisor}` : ""}
          </button>
          <button onClick={() => dispatch({ type: "SET_SCREEN", screen: "settings" })} aria-label="Settings" className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-all"><Settings size={16} /></button>
        </div>
      </div>

      {/* Tour Button */}
      {!tourActive && (
        <div className="mb-6"><TourButton onClick={() => dispatch({ type: "SET_TOUR", active: true })} hasData={!!stats && stats.readyForReviewItems.length > 0} /></div>
      )}

      {/* Zero-data welcome state */}
      {(isAdvisor || role === "principal") && sfConnected && stats && stats.openTasks === 0 && stats.readyForReview === 0 && stats.unsignedEnvelopes === 0 && stats.upcomingMeetings === 0 && stats.recentItems.length === 0 && (
        <div className="mb-8 bg-white border border-slate-200 rounded-2xl p-8 text-center">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mx-auto mb-4"><Users size={24} className="text-slate-400" /></div>
          <h2 className="text-lg font-medium text-slate-900 mb-2">Welcome to Min</h2>
          <p className="text-sm text-slate-400 mb-6 max-w-md mx-auto">Your Salesforce is connected but Min doesn&apos;t see any activity yet. Start by onboarding a family or seeding demo data.</p>
          <div className="flex items-center justify-center gap-3">
            <button onClick={() => dispatch({ type: "SET_SCREEN", screen: "onboard" })} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">Onboard Your First Family</button>
            <button onClick={() => dispatch({ type: "SET_SCREEN", screen: "settings" })} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors">Seed Demo Data</button>
          </div>
        </div>
      )}

      {/* Stat Cards (Advisor + Principal only) */}
      {(isAdvisor || role === "principal") && sfConnected && stats && (<div className="mb-8" data-tour="stat-cards">
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
          {([
            { key: "overdueTasks", label: "Overdue", value: stats.overdueTasks, Icon: Clock, color: stats.overdueTasks > 0 ? "text-red-500" : "text-green-500", vColor: stats.overdueTasks > 0 ? "text-red-600" : "text-green-600", peek: stats.overdueTaskItems },
            { key: "openTasks", label: "Open Tasks", value: stats.openTasks, Icon: CheckCircle, color: "text-amber-500", vColor: stats.openTasks > 0 ? "text-amber-600" : "", peek: stats.openTaskItems },
            { key: "readyForReview", label: "Ready for Review", value: stats.readyForReview, Icon: Shield, color: stats.readyForReview > 0 ? "text-amber-500" : "text-green-500", vColor: stats.readyForReview > 0 ? "text-amber-600" : "", peek: stats.readyForReviewItems },
            { key: "unsignedEnvelopes", label: "Unsigned", value: stats.unsignedEnvelopes, Icon: Send, color: stats.unsignedEnvelopes > 0 ? "text-blue-500" : "text-slate-400", vColor: stats.unsignedEnvelopes > 0 ? "text-blue-600" : "", peek: stats.unsignedItems },
            { key: "upcomingMeetings", label: "Meetings (7d)", value: stats.upcomingMeetings, Icon: MessageSquare, color: "text-purple-500", vColor: "", peek: stats.upcomingMeetingItems },
          ] as const).map(s => (
            <StatCard key={s.key} tourKey={s.key} label={s.label} value={s.value} Icon={s.Icon}
              color={s.color} vColor={s.vColor} expanded={expandedStat === s.key}
              peekItems={s.value > 0 ? s.peek : undefined}
              onClick={() => { setExpandedStat(expandedStat === s.key ? null : s.key); setPanelFilter(""); setPanelSort("alpha"); }}
            />))}
        </div>

        {/* Expanded stat panel */}
        {expandedStat && (() => {
          const pm: Record<string, { title: string; items: typeof stats.openTaskItems; showAction?: string; showReminder?: boolean; sortable?: boolean }> = {
            overdueTasks: { title: "Overdue Tasks", items: stats.overdueTaskItems, sortable: true },
            openTasks: { title: "Open Tasks", items: stats.openTaskItems, sortable: true },
            readyForReview: { title: "Ready for Review", items: stats.readyForReviewItems, showAction: "compliance" },
            unsignedEnvelopes: { title: "Unsigned Envelopes", items: stats.unsignedItems, showReminder: true },
            upcomingMeetings: { title: "Meetings This Week", items: stats.upcomingMeetingItems },
          };
          const p = pm[expandedStat]; if (!p) return null;
          const q = panelFilter.toLowerCase();
          let filtered = q ? p.items.filter(it => it.label.toLowerCase().includes(q) || it.sub.toLowerCase().includes(q)) : [...p.items];
          if (panelSort === "alpha") filtered.sort((a, b) => a.label.localeCompare(b.label));
          else if (panelSort === "priority") filtered.sort((a, b) => { const pr = (v: string | undefined) => v === "High" ? 0 : v === "Normal" ? 1 : 2; return pr(a.priority) - pr(b.priority); });
          else if (panelSort === "due") filtered.sort((a, b) => (a.due || "9999").localeCompare(b.due || "9999"));
          if (p.items.length === 0) return <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-8 text-center animate-slide-down"><CheckCircle size={24} className="mx-auto text-slate-200 mb-2" /><p className="text-sm font-medium text-slate-500">Nothing here</p><p className="text-xs text-slate-400 mt-1">No {p.title.toLowerCase()} to show right now.</p></div>;
          return (<div className="mt-3 bg-white border border-slate-200 rounded-2xl overflow-hidden animate-slide-down">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">{p.title}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{filtered.length}</span>
              <div className="flex-1" />
              {p.sortable && <button onClick={() => setPanelSort(panelSort === "alpha" ? "priority" : panelSort === "priority" ? "due" : "alpha")} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600"><ArrowUpDown size={11} /><span>{panelSort === "alpha" ? "A→Z" : panelSort === "priority" ? "Priority" : "Due"}</span></button>}
            </div>
            {p.items.length > 4 && <div className="px-4 py-2 border-b border-slate-100"><input className="w-full text-sm text-slate-700 placeholder:text-slate-300 outline-none bg-transparent" placeholder="Filter..." value={panelFilter} onChange={e => setPanelFilter(e.target.value)} autoFocus /></div>}
            {filtered.length === 0 ? <div className="px-4 py-6 text-center"><Search size={20} className="mx-auto text-slate-200 mb-2" /><p className="text-sm text-slate-400">No items match your filter.</p></div>
            : filtered.map((item, i) => (
              <StatPanelRow key={i} item={item} showAction={p.showAction} showReminder={p.showReminder}
                reminderSent={reminderSent} goTo={goTo}
                onRemind={(url) => { setReminderSent(prev => { const s = new Set(prev); s.add(url); return s; }); showToast("DocuSign reminder sent to signers"); }}
              />))}
          </div>);
        })()}
      </div>)}

      {/* Search for Family */}
      <div className="mb-6 relative">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input className="w-full h-12 rounded-xl border border-slate-200 bg-white pl-11 pr-4 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="Search for a family..." value={familyQuery} onChange={e => setFamilyQuery(e.target.value)} />
          {familySearching && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
        </div>
        {familyQuery.length >= 2 && (<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20 animate-slide-down">
          {familyResults.length === 0 ? <div className="px-4 py-6 text-center">{familySearching ? <p className="text-sm text-slate-400">Searching...</p> : <><Users size={20} className="mx-auto text-slate-200 mb-2" /><p className="text-sm text-slate-500">No families found</p><p className="text-xs text-slate-400 mt-1">Try a different name or check your Salesforce households.</p></>}</div>
          : <div className="stagger-list">{familyResults.map((f, i) => (<button key={i} onClick={() => openFamily(f)} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
            <div className="flex items-center justify-between"><p className="font-medium text-slate-800">{f.name}</p><ChevronRight size={16} className="text-slate-300" /></div>
            <p className="text-sm text-slate-500">{f.contactNames ? `${f.contactNames} · ` : ""}Created {f.createdDate}</p>
          </button>))}</div>}
        </div>)}
      </div>

      {/* Action Grid */}
      <div className={`grid gap-3 mb-8 ${actions.length <= 4 ? "grid-cols-2" : "grid-cols-2 sm:grid-cols-3"}`}>
        {actions.map(a => (<button key={a.id} onClick={() => handleAction(a.id)}
          className="group flex flex-col items-start gap-3 p-4 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-400 hover:shadow-md transition-all text-left">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-all"><a.Icon size={20} strokeWidth={1.5} /></div>
          <div>
            <p className="text-sm font-medium text-slate-700 group-hover:text-slate-900">{a.label}</p>
            <p className="text-xs text-slate-400">{a.desc}</p>
          </div>
        </button>))}
      </div>

      {/* Recent Activity */}
      {sfConnected && stats && stats.recentItems.length > 0 && (isOps || !expandedStat) && (
        <div className="mb-8 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3"><Clock size={12} className="text-slate-400" /><p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Recent Activity</p></div>
          {stats.recentItems.map((t, i) => (
            <RecentActivityRow key={i} item={t} icon={iconForType(t.type)} />
          ))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-center gap-3 text-xs text-slate-500 font-medium">
        <button onClick={() => dispatch({ type: "SET_SCREEN", screen: "settings" })} className="inline-flex items-center gap-1.5 hover:text-slate-600 transition-colors">
          {sfConnected === null ? <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" role="img" aria-label="Checking connection" /> : sfConnected ? <div className="w-1.5 h-1.5 rounded-full bg-green-500" role="img" aria-label="Connected" /> : <div className="w-1.5 h-1.5 rounded-full bg-red-400" role="img" aria-label="Not connected" />}
          <span>{sfConnected === null ? "Checking..." : sfConnected ? `Connected to Salesforce: ${sfInstance || "Org"}` : "Not connected"}</span>
        </button>
        <span>·</span><span>Powered by Impacting Advisors</span>
      </div>

    </div></div>
    </div>
  );
}
