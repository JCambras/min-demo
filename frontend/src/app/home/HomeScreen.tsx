"use client";
import { useState, useEffect } from "react";
import { Briefcase, UserPlus, FileText, BookOpen, MessageSquare, Search, ChevronRight, Loader2, Users, Shield, Clock, ExternalLink, Settings, CheckCircle, Send, ArrowUpDown, ClipboardCheck, ListTodo, Zap } from "lucide-react";
import { DemoMode, TourButton } from "../tour/DemoMode";
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

// ─── Component ──────────────────────────────────────────────────────────────

export function HomeScreen({ state, dispatch, goTo, goHome, loadStats, showToast }: HomeScreenProps) {
  const { role, advisorName, sfConnected, sfInstance, stats, statsLoading, tourActive, principalAdvisor } = state;

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
        if (res.success) setFamilyResults((res.households as { Id: string; Name: string; CreatedDate: string; Contacts?: { records: { FirstName: string }[] } }[]).map(h => ({
          id: h.Id, name: h.Name, createdDate: formatDate(h.CreatedDate),
          contactNames: h.Contacts?.records?.map((c: { FirstName: string }) => c.FirstName).filter(Boolean).join(" & ") || "",
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
      <div className="flex h-screen bg-[#fafafa] items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400"><Loader2 size={22} className="animate-spin" /><span className="text-sm">Loading your practice data...</span></div>
      </div>
    );
  }

  // ── Tour overlay ──
  const tourOverlay = <DemoMode active={tourActive} onEnd={() => { dispatch({ type: "SET_TOUR", active: false }); }} screen="home" />;

  return (
    <div className="flex h-screen bg-[#fafafa]"><div className="flex-1 overflow-y-auto"><div className="max-w-3xl w-full mx-auto px-6 py-10">

      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div data-tour="home-greeting">
          <h1 className="text-4xl font-light tracking-tight text-slate-900">Hi, {firstName}</h1>
          <p className="text-sm text-slate-400 font-light mt-1">{role === "principal" && principalAdvisor !== "all" ? `Viewing ${principalAdvisor}'s households` : "Your practice, simplified."}</p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <select value={role || ""} onChange={e => { dispatch({ type: "SET_ROLE_INLINE", role: e.target.value as UserRole }); setExpandedStat(null); }}
              className="appearance-none text-xs pl-3 pr-7 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-600 hover:border-slate-400 transition-all bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900"
              style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}>
              {ROLES.map(r => <option key={r.id} value={r.id}>{r.label}</option>)}
            </select>
          </div>
          <span className="text-slate-200">·</span>
          {role === "principal" ? (
            <div className="relative">
              <select value={principalAdvisor} onChange={e => { const v = e.target.value; dispatch({ type: "SET_PRINCIPAL_ADVISOR", advisor: v }); loadStats(v); setExpandedStat(null); }}
                className="appearance-none text-xs pl-3 pr-7 py-1.5 rounded-lg border border-slate-200 text-slate-500 hover:text-slate-600 hover:border-slate-400 transition-all bg-white cursor-pointer focus:outline-none focus:ring-2 focus:ring-slate-900"
                style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 8px center" }}>
                <option value="all">All Advisors</option>
                {DEMO_ADVISORS.map(a => <option key={a.id} value={a.name}>{a.name}</option>)}
              </select>
            </div>
          ) : (
            <button onClick={() => dispatch({ type: "SET_SETUP_STEP", step: "crm" })} className="text-xs px-2.5 py-1.5 rounded-lg text-slate-400 hover:text-slate-600 transition-all">{advisorName || "Settings"}</button>
          )}
          <button onClick={() => dispatch({ type: "SET_SCREEN", screen: "settings" })} className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-all"><Settings size={16} /></button>
        </div>
      </div>

      {/* Tour Button */}
      {!tourActive && sfConnected && stats && (
        <div className="mb-6"><TourButton onClick={() => dispatch({ type: "SET_TOUR", active: true })} /></div>
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
        <div className="grid grid-cols-5 gap-3">
          {([
            { key: "overdueTasks", label: "Overdue", value: stats.overdueTasks, Icon: Clock, color: stats.overdueTasks > 0 ? "text-red-500" : "text-green-500", vColor: stats.overdueTasks > 0 ? "text-red-600" : "text-green-600" },
            { key: "openTasks", label: "Open Tasks", value: stats.openTasks, Icon: CheckCircle, color: "text-amber-500", vColor: stats.openTasks > 0 ? "text-amber-600" : "" },
            { key: "readyForReview", label: "Ready for Review", value: stats.readyForReview, Icon: Shield, color: stats.readyForReview > 0 ? "text-amber-500" : "text-green-500", vColor: stats.readyForReview > 0 ? "text-amber-600" : "" },
            { key: "unsignedEnvelopes", label: "Unsigned", value: stats.unsignedEnvelopes, Icon: Send, color: stats.unsignedEnvelopes > 0 ? "text-blue-500" : "text-slate-400", vColor: stats.unsignedEnvelopes > 0 ? "text-blue-600" : "" },
            { key: "upcomingMeetings", label: "Meetings (7d)", value: stats.upcomingMeetings, Icon: MessageSquare, color: "text-purple-500", vColor: "" },
          ] as const).map(s => (
            <button key={s.key} data-tour={`stat-${s.key}`} onClick={() => { setExpandedStat(expandedStat === s.key ? null : s.key); setPanelFilter(""); setPanelSort("alpha"); }}
              className={`bg-white border rounded-2xl p-4 text-left transition-all hover:shadow-md ${expandedStat === s.key ? "border-slate-400 shadow-md ring-1 ring-slate-200" : "border-slate-200"}`}>
              <div className="flex items-center gap-1.5 mb-2"><s.Icon size={14} className={s.color} /><span className="text-[11px] text-slate-400 truncate">{s.label}</span></div>
              <p className={`text-2xl font-light ${s.vColor || "text-slate-900"}`}>{s.value}</p>
            </button>))}
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
          if (p.items.length === 0) return <div className="mt-3 bg-white border border-slate-200 rounded-2xl p-6 text-center animate-slide-down"><p className="text-sm text-slate-400">No items.</p></div>;
          return (<div className="mt-3 bg-white border border-slate-200 rounded-2xl overflow-hidden animate-slide-down">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">{p.title}</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{filtered.length}</span>
              <div className="flex-1" />
              {p.sortable && <button onClick={() => setPanelSort(panelSort === "alpha" ? "priority" : panelSort === "priority" ? "due" : "alpha")} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600"><ArrowUpDown size={11} /><span>{panelSort === "alpha" ? "A→Z" : panelSort === "priority" ? "Priority" : "Due"}</span></button>}
            </div>
            {p.items.length > 4 && <div className="px-4 py-2 border-b border-slate-100"><input className="w-full text-sm text-slate-700 placeholder:text-slate-300 outline-none bg-transparent" placeholder="Filter..." value={panelFilter} onChange={e => setPanelFilter(e.target.value)} autoFocus /></div>}
            {filtered.length === 0 ? <div className="px-4 py-4 text-center"><p className="text-sm text-slate-400">No matches</p></div>
            : filtered.map((item, i) => (<div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="min-w-0 flex-1"><p className="text-sm text-slate-700 truncate">{item.label}</p><p className="text-xs text-slate-400">{item.sub}</p></a>
              <div className="flex items-center gap-2 ml-3 flex-shrink-0">
                {item.priority === "High" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">High</span>}
                {p.showAction === "compliance" && item.householdId && <button data-tour="run-check-btn" onClick={() => goTo("compliance", { householdId: item.householdId!, familyName: (item.householdName || "").replace(" Household", "") })} className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors whitespace-nowrap">Run Check</button>}
                {p.showReminder && <button onClick={() => { setReminderSent(prev => { const s = new Set(prev); s.add(item.url); return s; }); showToast("DocuSign reminder sent to signers"); }} disabled={reminderSent.has(item.url)} className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap ${reminderSent.has(item.url) ? "bg-green-100 text-green-600 cursor-default" : "bg-blue-600 text-white hover:bg-blue-700"}`}>{reminderSent.has(item.url) ? "Sent ✓" : "Send Reminder"}</button>}
                <a href={item.url} target="_blank" rel="noopener noreferrer"><ExternalLink size={12} className="text-slate-300" /></a>
              </div>
            </div>))}
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
          {familyResults.length === 0 ? <p className="px-4 py-4 text-sm text-slate-400 text-center">{familySearching ? "Searching..." : `No families matching "${familyQuery}"`}</p>
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
          <div className="px-4 py-2.5 border-b border-slate-100"><p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Recent Activity</p></div>
          {stats.recentItems.map((t, i) => (<a key={i} href={t.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
            {iconForType(t.type)}<div className="min-w-0 flex-1"><p className="text-sm text-slate-700 truncate">{t.subject}</p><p className="text-xs text-slate-400">{t.household}</p></div>
          </a>))}
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-center gap-3 text-xs text-slate-500 font-medium">
        <button onClick={() => dispatch({ type: "SET_SCREEN", screen: "settings" })} className="inline-flex items-center gap-1.5 hover:text-slate-600 transition-colors">
          {sfConnected === null ? <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" /> : sfConnected ? <div className="w-1.5 h-1.5 rounded-full bg-green-500" /> : <div className="w-1.5 h-1.5 rounded-full bg-red-400" />}
          <span>{sfConnected === null ? "Checking..." : sfConnected ? `Connected to Salesforce: ${sfInstance || "Org"}` : "Not connected"}</span>
        </button>
        <span>·</span><span>Powered by Impacting Advisors</span>
      </div>

    </div></div>
    {tourOverlay}
    </div>
  );
}
