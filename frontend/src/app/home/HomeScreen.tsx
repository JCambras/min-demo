"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Briefcase, UserPlus, FileText, BookOpen, MessageSquare, Search, ChevronRight, ChevronDown, Loader2, Users, Shield, Clock, ExternalLink, Settings, CheckCircle, Send, ArrowUpDown, ClipboardCheck, ListTodo, Zap, AlertTriangle, ArrowRight, RotateCcw, X, DollarSign, Upload, Activity } from "lucide-react";
import { TourButton } from "../tour/DemoMode";
import { NotificationCenter } from "@/components/shared/NotificationCenter";
import { TeamTraining } from "@/components/shared/TeamTraining";
import { RegulatoryFeed } from "@/components/shared/RegulatoryFeed";
import { loadCustomChecks, saveCustomChecks } from "@/lib/compliance-engine";
import { callSF } from "@/lib/salesforce";
import { log } from "@/lib/logger";
import { formatDate } from "@/lib/format";
import type { AppState, AppAction } from "@/lib/app-state";
import { loadLastSession, clearLastSession } from "@/lib/app-state";
import type { Screen, WorkflowContext, UserRole } from "@/lib/types";
import type { HomeStats } from "@/lib/home-stats";
import { buildHomeStats } from "@/lib/home-stats";
import { useDemoMode } from "@/lib/demo-context";
import { getDemoSFData } from "@/lib/demo-data";

// ─── Constants ──────────────────────────────────────────────────────────────

export const DEMO_ADVISORS = [
  { id: "jon", name: "Jon Cambras" }, { id: "marcus", name: "Marcus Rivera" },
  { id: "diane", name: "Diane Rivera" }, { id: "james", name: "James Wilder" },
  { id: "amy", name: "Amy Sato" }, { id: "kevin", name: "Kevin Trịnh" },
  { id: "michelle", name: "Michelle Osei" },
];

export const ROLES: { id: UserRole; label: string; desc: string }[] = [
  { id: "operations", label: "Operators", desc: "Onboarding, account opening, compliance, and dashboards" },
  { id: "advisor", label: "Advisors", desc: "Client meetings, briefings, compliance, and queries" },
  { id: "principal", label: "Principals", desc: "Full practice visibility across all workflows" },
];

const ALL_ACTIONS: { id: string; label: string; desc: string; Icon: React.ElementType; roles: UserRole[] }[] = [
  { id: "onboard", label: "Onboard New Client", desc: "Client records & setup", Icon: UserPlus, roles: ["operations", "principal"] },
  { id: "open", label: "Open Account", desc: "Paperwork & e-signatures", Icon: Briefcase, roles: ["operations", "principal"] },
  { id: "compliance", label: "Compliance Reviews", desc: "ADV, KYC, suitability", Icon: FileText, roles: ["advisor", "operations", "principal"] },
  { id: "briefing", label: "Client Briefing", desc: "Full client picture", Icon: BookOpen, roles: ["advisor", "principal"] },
  { id: "meeting", label: "Meeting Logs", desc: "Record notes & follow-ups", Icon: MessageSquare, roles: ["advisor", "principal"] },
  { id: "planning", label: "Planning & Goals", desc: "Financial plan progress & milestones", Icon: ClipboardCheck, roles: ["advisor", "principal"] },
  { id: "money", label: "Money Movement", desc: "Wires, journals & distributions", Icon: DollarSign, roles: ["operations", "principal"] },
  { id: "documents", label: "Document Intake", desc: "Scan, classify & file documents", Icon: Upload, roles: ["operations", "principal"] },
  { id: "taskManager", label: "Task Manager", desc: "View, assign & complete tasks", Icon: ListTodo, roles: ["operations", "principal"] },
  { id: "workflows", label: "Workflow Automation", desc: "Active chains & templates", Icon: Zap, roles: ["operations", "principal"] },
  { id: "activity", label: "Activity Feed", desc: "Timeline of all actions", Icon: Activity, roles: ["operations", "principal"] },
  { id: "audit", label: "Audit Trail", desc: "Compliance audit log", Icon: Shield, roles: ["principal"] },
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
  firmName?: string;
}

// ─── Extracted Sub-Components ────────────────────────────────────────────────

function StatCard({ label, value, Icon, color, vColor, expanded, tourKey, onClick, peekItems, subtitle, tier }: {
  label: string; value: number; Icon: React.ElementType; color: string; vColor: string;
  expanded: boolean; tourKey: string; onClick: () => void; peekItems?: { label: string }[];
  subtitle?: string; tier?: "good" | "ok" | "bad";
}) {
  const tierStyles = tier === "bad" ? "border-l-4 border-l-red-400 bg-red-50/40"
    : tier === "ok" ? "border-l-4 border-l-amber-400 bg-amber-50/40"
    : tier === "good" ? "border-l-4 border-l-green-400 bg-green-50/40" : "";
  return (
    <button data-tour={`stat-${tourKey}`} onClick={onClick}
      className={`border rounded-2xl p-4 text-left transition-all hover:shadow-md ${tierStyles} ${expanded ? "border-slate-900 shadow-md" : tierStyles ? "" : "bg-white border-slate-200"}`}>
      <div className="flex items-center gap-1.5 mb-2">
        <Icon size={16} className={color} />
        <span className="text-sm font-semibold text-slate-600 truncate">{label}</span>
      </div>
      <p className={`text-2xl font-light ${vColor || "text-slate-900"}`}>{value}</p>
      {subtitle && <p className="text-[10px] text-slate-500">{subtitle}</p>}
      {peekItems && peekItems.length > 0 && !expanded && (
        <div className="mt-2 pt-2 border-t border-slate-100 space-y-0.5">
          {peekItems.slice(0, 2).map((item, i) => (
            <p key={i} className="text-[10px] text-slate-500 truncate">{item.label}</p>
          ))}
        </div>
      )}
    </button>
  );
}

function StatPanelRow({ item, showAction, showReminder, showComplete, reminderSent, onRemind, onComplete, completing, completed, goTo }: {
  item: { url: string; label: string; sub: string; priority?: string; householdId?: string; householdName?: string };
  showAction?: string; showReminder?: boolean; showComplete?: boolean; reminderSent: Set<string>;
  onRemind: (url: string) => void; onComplete?: (url: string) => void;
  completing?: string | null; completed?: Set<string>;
  goTo: (screen: Screen, ctx?: WorkflowContext) => void;
}) {
  const isDone = completed?.has(item.url);
  const isLoading = completing === item.url;
  if (isDone) return null;
  return (
    <div className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
      {showComplete && onComplete && (
        <button onClick={() => onComplete(item.url)} disabled={isLoading}
          className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mr-3 flex items-center justify-center transition-all ${isLoading ? "border-green-400 bg-green-50" : "border-slate-300 hover:border-green-500 hover:bg-green-50"}`}>
          {isLoading && <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />}
        </button>
      )}
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
          <a href={item.url} target="_blank" rel="noopener noreferrer"
            className="text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors whitespace-nowrap bg-blue-600 text-white hover:bg-blue-700">
            Open in Salesforce
          </a>
        )}
        <a href={item.url} target="_blank" rel="noopener noreferrer">
          <ExternalLink size={14} className="text-slate-400 hover:text-blue-500 transition-colors" />
        </a>
      </div>
    </div>
  );
}

function RecentActivityRow({ item, icon, isDemoMode, goTo }: {
  item: { url: string; subject: string; household: string; householdId?: string; householdName?: string };
  icon: React.ReactNode;
  isDemoMode?: boolean;
  goTo?: (screen: Screen, ctx?: WorkflowContext) => void;
}) {
  // In demo mode, navigate to the family screen instead of opening a dead Salesforce link
  if (isDemoMode && goTo && item.householdId) {
    return (
      <button onClick={() => goTo("family", { householdId: item.householdId!, familyName: (item.householdName || item.household || "").replace(" Household", "") })}
        className="w-full flex items-center gap-3 px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors text-left">
        {icon}
        <div className="min-w-0 flex-1">
          <p className="text-sm text-slate-700 truncate">{item.subject}</p>
          <p className="text-xs text-slate-400">{item.household}</p>
        </div>
        <ChevronRight size={14} className="text-slate-300 flex-shrink-0" />
      </button>
    );
  }
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

export function HomeScreen({ state, dispatch, goTo, goHome, loadStats, showToast, firmName }: HomeScreenProps) {
  const { role, advisorName, sfConnected, sfInstance, stats, statsLoading, tourActive, principalAdvisor } = state;
  const demoCtx = useDemoMode();
  const { isDemoMode } = demoCtx;

  // Demo mode: inject demo data when demo activates or resets
  useEffect(() => {
    if (isDemoMode) {
      const { tasks, households, instanceUrl } = getDemoSFData();
      const demoStats = buildHomeStats(tasks, households, instanceUrl);
      dispatch({ type: "STATS_LOADED", stats: demoStats, tasks, households, instanceUrl });
    }
  }, [isDemoMode, demoCtx.resetKey, dispatch]);

  // ── Keyboard shortcut: Cmd+R / Ctrl+R to cycle role ──
  const cycleRole = useCallback(() => {
    const ids = ROLES.map(r => r.id);
    const next = ids[(ids.indexOf(role || "advisor") + 1) % ids.length];
    dispatch({ type: "SET_ROLE_INLINE", role: next as UserRole });
  }, [role, dispatch]);

  const statKeys = ["overdueTasks", "openTasks", "readyForReview", "unsignedEnvelopes", "upcomingMeetings"];

  const searchRef = useRef<HTMLInputElement>(null);

  // ── Local UI state (not app-level) ──
  const [expandedStat, setExpandedStat] = useState<string | null>(null);
  const [panelFilter, setPanelFilter] = useState("");
  const [panelSort, setPanelSort] = useState<"alpha" | "priority" | "due">("alpha");
  const [reminderSent] = useState<Set<string>>(new Set());
  const [completing, setCompleting] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [bulkCompleting, setBulkCompleting] = useState(false);
  const [lastSession, setLastSession] = useState<{ screen: Screen; ctx?: WorkflowContext; ts: number } | null>(null);
  const [familyQuery, setFamilyQuery] = useState("");
  const [familyResults, setFamilyResults] = useState<FamilyResult[]>([]);
  const [familySearching, setFamilySearching] = useState(false);
  const [familySearchError, setFamilySearchError] = useState<string | null>(null);
  const [regOpen, setRegOpen] = useState(false);
  const [recentOpen, setRecentOpen] = useState(false);
  // ── Triage interaction state (Tweaks 2,3,5,8,9,10,11) ──
  // Persist resolved/snoozed IDs to sessionStorage so page refresh doesn't restore them
  const [resolvedTriageIds, setResolvedTriageIds] = useState<Set<string>>(() => {
    try { const raw = sessionStorage.getItem("min_triage_resolved"); return raw ? new Set(JSON.parse(raw)) : new Set(); } catch { return new Set(); }
  });
  const [snoozedTriageIds, setSnoozedTriageIds] = useState<Set<string>>(() => {
    try { const raw = sessionStorage.getItem("min_triage_snoozed"); return raw ? new Set(JSON.parse(raw)) : new Set(); } catch { return new Set(); }
  });
  useEffect(() => { try { sessionStorage.setItem("min_triage_resolved", JSON.stringify([...resolvedTriageIds])); } catch {} }, [resolvedTriageIds]);
  useEffect(() => { try { sessionStorage.setItem("min_triage_snoozed", JSON.stringify([...snoozedTriageIds])); } catch {} }, [snoozedTriageIds]);
  const [expandedTriageId, setExpandedTriageId] = useState<string | null>(null);
  const [triageProcessing, setTriageProcessing] = useState<string | null>(null);
  const [hasInteracted, setHasInteracted] = useState(false);
  const [showEmptyState, setShowEmptyState] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Cmd+R: cycle role
      if ((e.metaKey || e.ctrlKey) && e.key === "r") {
        e.preventDefault();
        cycleRole();
        return;
      }
      // Cmd+K: focus search
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        searchRef.current?.focus();
        return;
      }
      // Cmd+1-5: toggle stat panels
      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "5") {
        e.preventDefault();
        const idx = parseInt(e.key) - 1;
        const key = statKeys[idx];
        if (key) setExpandedStat(prev => prev === key ? null : key);
        return;
      }
      // Escape: collapse panel, clear search, or go back
      if (e.key === "Escape") {
        if (familyQuery) { setFamilyQuery(""); setFamilyResults([]); setFamilySearchError(null); return; }
        if (expandedStat) { setExpandedStat(null); return; }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cycleRole, expandedStat, familyQuery]);

  // ── Family search debounce ──
  useEffect(() => {
    if (familyQuery.length < 2) { setFamilyResults([]); setFamilySearchError(null); return; }
    setFamilySearching(true);
    setFamilySearchError(null);
    const t = setTimeout(async () => {
      try {
        const res = await callSF("searchHouseholds", { query: familyQuery });
        if (res.success) {
          setFamilyResults((res.households as { id: string; name: string; createdAt: string; contacts?: { firstName: string }[] }[]).map(h => ({
            id: h.id, name: h.name, createdDate: formatDate(h.createdAt),
            contactNames: h.contacts?.map((c: { firstName: string }) => c.firstName).filter(Boolean).join(" & ") || "",
          })));
          setFamilySearchError(null);
        } else {
          setFamilyResults([]);
          const errMsg = typeof res.error === "string" ? res.error : (res.error as { message?: string })?.message || "Search failed";
          setFamilySearchError(errMsg);
          log.warn("HomeScreen", "Family search returned error", { query: familyQuery, error: errMsg, errorCode: res.errorCode });
        }
      } catch (err) {
        setFamilyResults([]);
        setFamilySearchError("Network error — check your connection");
        log.warn("HomeScreen", "Family search failed", { query: familyQuery, error: err instanceof Error ? err.message : "Unknown" });
      }
      setFamilySearching(false);
    }, 400);
    return () => clearTimeout(t);
  }, [familyQuery]);

  // ── Session resume (read once on mount) ──
  useEffect(() => {
    const s = loadLastSession();
    if (s) setLastSession(s);
  }, []);

  // ── Active triage items (exclude resolved/snoozed) ──
  const activeTriageItems = (stats?.triageItems || []).filter(
    item => !resolvedTriageIds.has(item.id) && !snoozedTriageIds.has(item.id)
  );
  const totalTriageItems = stats?.triageItems?.length || 0;

  // ── Empty state with deliberate beat (Tweak 3) ──
  useEffect(() => {
    if (activeTriageItems.length === 0 && (resolvedTriageIds.size > 0 || snoozedTriageIds.size > 0)) {
      const timer = setTimeout(() => setShowEmptyState(true), 400);
      return () => clearTimeout(timer);
    }
    setShowEmptyState(false);
  }, [activeTriageItems.length, resolvedTriageIds.size, snoozedTriageIds.size]);

  // ── Triage action handlers ──
  const handleTriageResolve = (item: { id: string; category: string; householdId?: string; householdName?: string }) => {
    if (triageProcessing) return;
    setTriageProcessing(item.id);
    setExpandedTriageId(null);
    if (!hasInteracted) setHasInteracted(true);
    // Navigate to the relevant workflow screen based on category
    const screen: Screen = item.category === "compliance" ? "compliance" : "family";
    const ctx: WorkflowContext = {
      householdId: item.householdId || "",
      familyName: (item.householdName || "").replace(" Household", ""),
    };
    goTo(screen, ctx);
  };
  const handleTriageDismiss = (id: string) => {
    if (triageProcessing) return;
    setTriageProcessing(id);
    setResolvedTriageIds(prev => { const s = new Set(prev); s.add(id); return s; });
    setExpandedTriageId(null);
    if (!hasInteracted) setHasInteracted(true);
    showToast("Item dismissed");
    setTimeout(() => setTriageProcessing(null), 300);
  };
  const handleTriageSnooze = (id: string, label: string) => {
    if (triageProcessing) return;
    setTriageProcessing(id);
    setSnoozedTriageIds(prev => { const s = new Set(prev); s.add(id); return s; });
    setExpandedTriageId(null);
    if (!hasInteracted) setHasInteracted(true);
    showToast(`Snoozed: ${label}`);
    setTimeout(() => setTriageProcessing(null), 300);
  };

  // ── Derived values ──
  const actions = ALL_ACTIONS.filter(a => a.roles.includes(role!));
  const roleLabel = ROLES.find(r => r.id === role)?.label || "User";
  const firstName = advisorName.split(" ")[0] || roleLabel;

  // Time-of-day greeting
  const hour = new Date().getHours();
  const timeGreeting = hour < 12 ? "Good morning" : hour < 17 ? "Good afternoon" : "Good evening";
  const isAdvisor = role === "advisor";
  const isOps = role === "operations";

  const describeSession = (s: { screen: Screen; ctx?: WorkflowContext }) => {
    const screenNames: Partial<Record<Screen, string>> = {
      family: "viewing", briefing: "reviewing briefing for", meeting: "logging meeting for",
      compliance: "reviewing compliance for", planning: "planning for", flow: "opening account",
      onboard: "onboarding a client", taskManager: "managing tasks", dashboard: "the dashboard",
      settings: "settings", workflows: "workflows",
    };
    const verb = screenNames[s.screen] || s.screen;
    const name = s.ctx?.familyName;
    return name ? `You were ${verb} ${name}` : `You were in ${verb}`;
  };

  const iconForType = (t: string) =>
    t === "compliance" ? <Shield size={13} className="text-green-500" /> :
    t === "meeting" ? <MessageSquare size={13} className="text-purple-500" /> :
    t === "docusign" ? <FileText size={13} className="text-blue-500" /> :
    <CheckCircle size={13} className="text-slate-400" />;

  const openFamily = (f: FamilyResult) => {
    setFamilyQuery(""); setFamilyResults([]); setFamilySearchError(null);
    goTo("family", { householdId: f.id, familyName: f.name.replace(" Household", "") });
  };

  const handleAction = (id: string) => {
    goTo(id as Screen);
  };

  // ── Task completion from stat panels ──
  const handleCompleteTask = async (url: string) => {
    setCompleting(url);
    try {
      const taskId = url.split("/").pop();
      if (taskId) await callSF("completeTask", { taskId });
      setCompleted(prev => { const s = new Set(prev); s.add(url); return s; });
      showToast("Task marked complete");
      // Refresh stats after a brief moment so the user sees the checkmark
      setTimeout(() => loadStats(), 600);
    } catch (err) {
      log.error("HomeScreen", "Failed to complete task", { error: err instanceof Error ? err.message : "Unknown" });
      showToast("Failed to complete task");
    }
    setCompleting(null);
  };

  // ── Bulk complete all visible tasks in panel ──
  const handleBulkComplete = async (items: { url: string }[]) => {
    const remaining = items.filter(it => !completed.has(it.url));
    if (remaining.length === 0) return;
    setBulkCompleting(true);
    let count = 0;
    for (const item of remaining) {
      try {
        const taskId = item.url.split("/").pop();
        if (taskId) await callSF("completeTask", { taskId });
        setCompleted(prev => { const s = new Set(prev); s.add(item.url); return s; });
        count++;
      } catch {
        // continue with remaining tasks
      }
    }
    setBulkCompleting(false);
    showToast(`${count} task${count !== 1 ? "s" : ""} marked complete`);
    setTimeout(() => loadStats(), 400);
  };

  // ── Loading state ──
  if ((isAdvisor || role === "principal") && !isDemoMode && sfConnected && statsLoading) {
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
          <h1 className="text-4xl font-light tracking-tight text-slate-900">{timeGreeting}, {firstName}</h1>
          <p className="text-sm text-slate-400 font-light mt-1">
            {role === "principal" && principalAdvisor !== "all"
              ? `Viewing ${principalAdvisor}'s households`
              : stats && (stats.overdueTasks > 0 || stats.unsignedEnvelopes > 0 || stats.readyForReview > 0)
                ? `${[stats.overdueTasks > 0 ? `${stats.overdueTasks} overdue` : "", stats.unsignedEnvelopes > 0 ? `${stats.unsignedEnvelopes} unsigned` : "", stats.readyForReview > 0 ? `${stats.readyForReview} need review` : ""].filter(Boolean).join(", ")}`
                : firmName || "Your practice, simplified."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Tweak 5: Hide mode/role switcher until first triage interaction */}
          <button onClick={() => { cycleRole(); setExpandedStat(null); }}
            className="text-xs text-slate-400 hover:text-slate-600 transition-all" title="Click or ⌘R to switch role"
            style={{ opacity: hasInteracted ? 1 : 0, transition: "opacity 300ms ease", pointerEvents: hasInteracted ? "auto" : "none" }}>
            {ROLES.find(r => r.id === role)?.label || "Advisor"}{role === "principal" && principalAdvisor !== "all" ? ` · ${principalAdvisor}` : ""}
          </button>
          <NotificationCenter stats={stats} onNavigate={goTo} />
          <button onClick={() => dispatch({ type: "SET_SCREEN", screen: "settings" })} aria-label="Settings" className="w-9 h-9 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-all"><Settings size={16} /></button>
        </div>
      </div>

      {/* Tour + Demo Buttons */}
      {!tourActive && (
        <div className="mb-6 flex items-center gap-3">
          <TourButton
            onClick={() => dispatch({ type: "SET_TOUR", active: true })}
            hasData={!!stats && stats.readyForReviewItems.length > 0}
            onGuidedTour={() => {
              // Activate demo mode if not already on
              if (!isDemoMode) demoCtx.toggleDemo();
              // Inject demo data
              const demoData = getDemoSFData();
              const demoStats = buildHomeStats(demoData.tasks, demoData.households, demoData.instanceUrl);
              dispatch({ type: "STATS_LOADED", stats: demoStats, tasks: demoData.tasks, households: demoData.households, instanceUrl: demoData.instanceUrl });
              // Set tour type and role
              dispatch({ type: "SET_TOUR_TYPE", tourType: "guided" });
              dispatch({ type: "SET_ROLE_INLINE", role: "advisor" });
              dispatch({ type: "SET_TOUR", active: true });
            }}
          />
          {!isDemoMode && (
            <button
              onClick={() => {
                demoCtx.toggleDemo();
                // Immediately load demo data — don't rely on effect chain
                const { tasks, households, instanceUrl } = getDemoSFData();
                const demoStats = buildHomeStats(tasks, households, instanceUrl);
                dispatch({ type: "STATS_LOADED", stats: demoStats, tasks, households, instanceUrl });
                showToast("Demo mode activated — 8 households loaded");
              }}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/60 text-indigo-800 text-sm font-medium hover:shadow-md hover:border-indigo-300 transition-all"
            >
              <Zap size={14} className="text-indigo-600" />
              Try Demo
            </button>
          )}
          {isDemoMode && (
            <>
              <button
                onClick={() => {
                  demoCtx.resetDemo();
                  // Clear stats so the effect reloads fresh demo data with a visible flash
                  dispatch({ type: "STATS_LOADED", stats: null as unknown as HomeStats, tasks: [], households: [], instanceUrl: "" });
                  setTimeout(() => {
                    const { tasks, households, instanceUrl } = getDemoSFData();
                    const demoStats = buildHomeStats(tasks, households, instanceUrl);
                    dispatch({ type: "STATS_LOADED", stats: demoStats, tasks, households, instanceUrl });
                    showToast("Demo reset");
                  }, 150);
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-50 to-violet-50 border border-indigo-200/60 text-indigo-800 text-sm font-medium hover:shadow-md hover:border-indigo-300 transition-all"
              >
                <RotateCcw size={14} className="text-indigo-600" />
                Reset Demo
              </button>
              <button
                onClick={() => {
                  demoCtx.toggleDemo();
                  dispatch({ type: "STATS_LOADED", stats: null as unknown as HomeStats, tasks: [], households: [], instanceUrl: "" });
                  showToast("Demo mode off");
                }}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-50 border border-slate-200/60 text-slate-600 text-sm font-medium hover:shadow-md hover:border-slate-300 transition-all"
              >
                <X size={14} className="text-slate-500" />
                Exit Demo
              </button>
            </>
          )}
        </div>
      )}

      {/* Insights — the "surprise" moment */}
      {(isAdvisor || role === "principal") && (sfConnected || isDemoMode) && stats && stats.insights.length > 0 && (
        <div className="mb-6 space-y-2" data-tour="insights">
          {stats.insights.map((insight, i) => {
            const colors = insight.severity === "critical"
              ? "border-red-200 bg-red-50"
              : insight.severity === "high"
              ? "border-amber-200 bg-amber-50"
              : "border-slate-200 bg-slate-50";
            const iconColor = insight.severity === "critical"
              ? "text-red-500"
              : insight.severity === "high"
              ? "text-amber-500"
              : "text-slate-400";
            const headlineColor = insight.severity === "critical"
              ? "text-red-800"
              : insight.severity === "high"
              ? "text-amber-800"
              : "text-slate-700";
            return (
              <button key={i} onClick={() => {
                if (insight.householdId) goTo("family", { householdId: insight.householdId, familyName: insight.headline.split(":")[0] });
                else if (insight.action === "Run reviews") goTo("compliance");
              }}
                className={`w-full text-left px-4 py-3 rounded-xl border ${colors} hover:shadow-sm transition-all group`}>
                <div className="flex items-start gap-3">
                  <AlertTriangle size={16} className={`${iconColor} mt-0.5 flex-shrink-0`} />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium ${headlineColor}`}>{insight.headline}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{insight.detail}</p>
                  </div>
                  {(insight.householdId || insight.action) && (
                    <ArrowRight size={14} className="text-slate-300 group-hover:text-slate-500 mt-1 flex-shrink-0 transition-colors" />
                  )}
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Triage Queue — interactive cards (Tweaks 2,3,6,8,9,10,11) */}
      {(isAdvisor || isOps || role === "principal") && (sfConnected || isDemoMode) && stats && totalTriageItems > 0 && (
        <div className="mb-6" data-tour="triage">
          {/* Tweak 11: Simplified header — just the count */}
          <h2 className="text-lg font-medium text-slate-900 mb-3">
            {activeTriageItems.length} {activeTriageItems.length === 1 ? "item needs" : "items need"} you
          </h2>

          {activeTriageItems.length > 0 ? (
            <div className="space-y-3">
              {activeTriageItems.map((item) => {
                const isExpanded = expandedTriageId === item.id;
                const someExpanded = expandedTriageId !== null;
                const isDimmed = someExpanded && !isExpanded;
                // Tweak 2: No badge text — only colored left border
                const borderColor = item.urgency === "now"
                  ? "border-l-red-400"
                  : item.urgency === "today"
                  ? "border-l-amber-400"
                  : "border-l-slate-300";
                // Default snooze fallback
                const snoozeOpts = item.snoozeOptions || [
                  { label: "Tomorrow" }, { label: "Next Monday" }, { label: "In 2 weeks" },
                ];
                return (
                  <div key={item.id}
                    className={`bg-white border border-slate-200 rounded-2xl overflow-hidden border-l-[3px] ${borderColor}`}
                    style={{
                      opacity: isDimmed ? 0.4 : 1,
                      boxShadow: isExpanded ? "0 4px 16px rgba(0,0,0,0.08)" : "none",
                      transition: "opacity 200ms ease, box-shadow 200ms ease",
                    }}>
                    {/* Card content — no badge, no "View household" link (Tweaks 2, 9) */}
                    <div className="px-4 py-3">
                      <p className="text-sm font-medium text-slate-700">{item.label}</p>
                      {/* Tweak 6: Sources on a single line with pipe separator */}
                      {item.sources && item.sources.length > 0 ? (
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          {item.sources.map((s, si) => (
                            <span key={si} style={{ opacity: s.fresh === false ? 0.7 : 1 }}>
                              {si > 0 && <span className="mx-1">|</span>}
                              {s.system} · {s.timestamp}
                            </span>
                          ))}
                        </p>
                      ) : (
                        <p className="text-[11px] text-slate-500 mt-0.5">{item.reason}</p>
                      )}
                      {/* Action buttons — Resolve, Snooze, Dismiss */}
                      <div className="flex items-center gap-2 mt-2.5">
                        <button onClick={() => handleTriageResolve(item)} disabled={triageProcessing === item.id}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors">
                          {item.action}
                        </button>
                        <button onClick={() => setExpandedTriageId(isExpanded ? null : item.id)} disabled={!!triageProcessing}
                          className={`text-[11px] px-2.5 py-1 rounded-lg font-medium transition-colors ${isExpanded ? "bg-blue-100 text-blue-700" : "bg-slate-100 text-slate-600 hover:bg-slate-200"} disabled:opacity-50`}>
                          Snooze
                        </button>
                        <button onClick={() => handleTriageDismiss(item.id)} disabled={triageProcessing === item.id}
                          className="text-[11px] px-2.5 py-1 rounded-lg bg-slate-100 text-slate-600 font-medium hover:bg-slate-200 disabled:opacity-50 transition-colors">
                          Dismiss
                        </button>
                      </div>
                    </div>
                    {/* Expanded snooze panel — no "Min's Recommendation" header (Tweak 4) */}
                    {isExpanded && (
                      <div className="px-4 py-3 bg-[#F8FAFC] border-t border-slate-100 animate-fade-in">
                        <p className="text-sm text-slate-600 mb-3">Snooze this item and get reminded later.</p>
                        {/* Tweak 10: Contextual snooze options */}
                        <div className="flex flex-wrap gap-2">
                          {snoozeOpts.map((opt, oi) => (
                            <button key={oi} onClick={() => handleTriageSnooze(item.id, opt.label)}
                              className="text-[11px] px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-slate-600 font-medium hover:bg-blue-50 hover:border-blue-200 hover:text-blue-700 transition-colors">
                              {opt.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : showEmptyState ? (
            /* Tweak 3: Empty state with deliberate beat */
            <div className="bg-white border border-slate-200 rounded-2xl p-8 text-center animate-empty-state-in">
              <div className="w-14 h-14 rounded-2xl bg-green-50 flex items-center justify-center mx-auto mb-4">
                <CheckCircle size={24} className="text-green-400" />
              </div>
              <p className="text-sm font-medium text-slate-600">All clear. {stats ? `${stats.readyForReviewItems.length + stats.openTaskItems.length} households` : ""} — no issues detected.</p>
            </div>
          ) : (
            /* 400ms pause — empty space before the empty state appears */
            <div className="h-24" />
          )}
        </div>
      )}

      {/* Session Resume */}
      {lastSession && (
        <div className="mb-6 flex items-center gap-3 px-4 py-3 rounded-xl border border-blue-100 bg-blue-50/50 group">
          <RotateCcw size={15} className="text-blue-400 flex-shrink-0" />
          <button onClick={() => { goTo(lastSession.screen, lastSession.ctx); setLastSession(null); clearLastSession(); }}
            className="flex-1 text-left">
            <p className="text-sm text-blue-700 font-medium">{describeSession(lastSession)}</p>
            <p className="text-[11px] text-blue-400">Pick up where you left off</p>
          </button>
          <button onClick={() => { setLastSession(null); clearLastSession(); }}
            className="text-blue-300 hover:text-blue-500 transition-colors flex-shrink-0"><X size={14} /></button>
        </div>
      )}

      {/* Zero-data welcome state */}
      {(isAdvisor || role === "principal") && (sfConnected || isDemoMode) && stats && stats.openTasks === 0 && stats.readyForReview === 0 && stats.unsignedEnvelopes === 0 && stats.upcomingMeetings === 0 && stats.recentItems.length === 0 && (
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
      {(isAdvisor || role === "principal") && (sfConnected || isDemoMode) && stats && (<div className="mb-8" data-tour="stat-cards">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {([
            { key: "overdueTasks", label: "Overdue", value: stats.overdueTasks, Icon: Clock, color: stats.overdueTasks > 0 ? "text-red-500" : "text-green-500", vColor: stats.overdueTasks > 0 ? "text-red-600" : "text-green-600", peek: stats.overdueTaskItems, subtitle: "past due", tier: (stats.overdueTasks === 0 ? "good" : stats.overdueTasks <= 3 ? "ok" : "bad") as "good" | "ok" | "bad" },
            { key: "openTasks", label: "Open Tasks", value: stats.openTasks, Icon: CheckCircle, color: "text-amber-500", vColor: stats.openTasks > 0 ? "text-amber-600" : "", peek: stats.openTaskItems, subtitle: "in progress", tier: (stats.openTasks === 0 ? "good" : stats.openTasks <= 5 ? "ok" : "bad") as "good" | "ok" | "bad" },
            { key: "readyForReview", label: "Needs Review", value: stats.readyForReview, Icon: Shield, color: stats.readyForReview > 0 ? "text-amber-500" : "text-green-500", vColor: stats.readyForReview > 0 ? "text-amber-600" : "", peek: stats.readyForReviewItems, subtitle: "never reviewed", tier: (stats.readyForReview === 0 ? "good" : stats.readyForReview <= 3 ? "ok" : "bad") as "good" | "ok" | "bad" },
            { key: "unsignedEnvelopes", label: "Unsigned", value: stats.unsignedEnvelopes, Icon: Send, color: stats.unsignedEnvelopes > 0 ? "text-blue-500" : "text-slate-400", vColor: stats.unsignedEnvelopes > 0 ? "text-blue-600" : "", peek: stats.unsignedItems, subtitle: "awaiting signature", tier: (stats.unsignedEnvelopes === 0 ? "good" : stats.unsignedEnvelopes <= 2 ? "ok" : "bad") as "good" | "ok" | "bad" },
            { key: "upcomingMeetings", label: "Meetings Logged", value: stats.upcomingMeetings, Icon: MessageSquare, color: "text-purple-500", vColor: "", peek: stats.upcomingMeetingItems, subtitle: "past 7 days", tier: "good" as const },
          ] as const).map(s => (
            <StatCard key={s.key} tourKey={s.key} label={s.label} value={s.value} Icon={s.Icon}
              color={s.color} vColor={s.vColor} expanded={expandedStat === s.key}
              peekItems={s.value > 0 ? s.peek : undefined}
              subtitle={s.subtitle} tier={s.tier}
              onClick={() => { setExpandedStat(expandedStat === s.key ? null : s.key); setPanelFilter(""); setPanelSort("alpha"); }}
            />))}
        </div>

        {/* Expanded stat panel */}
        {expandedStat && (() => {
          const pm: Record<string, { title: string; items: typeof stats.openTaskItems; showAction?: string; showReminder?: boolean; sortable?: boolean }> = {
            overdueTasks: { title: "Overdue Tasks", items: stats.overdueTaskItems, sortable: true },
            openTasks: { title: "Open Tasks", items: stats.openTaskItems, sortable: true },
            readyForReview: { title: "Needs Review", items: stats.readyForReviewItems, showAction: "compliance" },
            unsignedEnvelopes: { title: "Unsigned Envelopes", items: stats.unsignedItems, showReminder: true },
            upcomingMeetings: { title: "Meetings Logged (Past 7 Days)", items: stats.upcomingMeetingItems },
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
              {(expandedStat === "overdueTasks" || expandedStat === "openTasks") && filtered.length > 1 && (
                <button onClick={() => handleBulkComplete(filtered)} disabled={bulkCompleting}
                  className="flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-lg font-medium transition-colors bg-green-50 text-green-600 hover:bg-green-100 disabled:opacity-50">
                  {bulkCompleting ? <><Loader2 size={10} className="animate-spin" />Completing...</> : <>Complete All ({filtered.filter(it => !completed.has(it.url)).length})</>}
                </button>
              )}
              {p.sortable && <button onClick={() => setPanelSort(panelSort === "alpha" ? "priority" : panelSort === "priority" ? "due" : "alpha")} className="flex items-center gap-1 text-[10px] text-slate-400 hover:text-slate-600"><ArrowUpDown size={11} /><span>{panelSort === "alpha" ? "A→Z" : panelSort === "priority" ? "Priority" : "Due"}</span></button>}
            </div>
            {p.items.length > 4 && <div className="px-4 py-2 border-b border-slate-100"><input className="w-full text-sm text-slate-700 placeholder:text-slate-300 outline-none bg-transparent" placeholder="Filter..." value={panelFilter} onChange={e => setPanelFilter(e.target.value)} autoFocus /></div>}
            {filtered.length === 0 ? <div className="px-4 py-6 text-center"><Search size={20} className="mx-auto text-slate-200 mb-2" /><p className="text-sm text-slate-400">No items match your filter.</p></div>
            : filtered.map((item, i) => (
              <StatPanelRow key={i} item={item} showAction={p.showAction} showReminder={p.showReminder}
                showComplete={expandedStat === "overdueTasks" || expandedStat === "openTasks"}
                reminderSent={reminderSent} goTo={goTo}
                onRemind={() => {}}
                onComplete={handleCompleteTask} completing={completing} completed={completed}
              />))}
          </div>);
        })()}
      </div>)}

      {/* Search for Family */}
      <div className="mb-6 relative">
        <div className="relative">
          <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
          <input ref={searchRef} className="w-full h-12 rounded-xl border border-slate-200 bg-white pl-11 pr-16 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent" placeholder="Search for a family..." value={familyQuery} onChange={e => setFamilyQuery(e.target.value)} />
          {!familyQuery && !familySearching && <kbd className="absolute right-4 top-1/2 -translate-y-1/2 text-[10px] text-slate-300 border border-slate-200 rounded px-1.5 py-0.5 font-mono pointer-events-none">⌘K</kbd>}
          {familySearching && <Loader2 size={16} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
        </div>
        {familyQuery.length >= 2 && (<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20 animate-slide-down">
          {familySearchError ? <div className="px-4 py-6 text-center"><AlertTriangle size={20} className="mx-auto text-amber-400 mb-2" /><p className="text-sm text-slate-600">Search failed</p><p className="text-xs text-slate-400 mt-1">{familySearchError}</p></div>
          : familyResults.length === 0 ? <div className="px-4 py-6 text-center">{familySearching ? <p className="text-sm text-slate-400">Searching...</p> : <><Users size={20} className="mx-auto text-slate-200 mb-2" /><p className="text-sm text-slate-500">No families found</p><p className="text-xs text-slate-400 mt-1">Try a different name or check your Salesforce households.</p></>}</div>
          : <div className="stagger-list">{familyResults.map((f, i) => (<button key={i} onClick={() => openFamily(f)} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
            <div className="flex items-center justify-between"><p className="font-medium text-slate-800">{f.name}</p><ChevronRight size={16} className="text-slate-300" /></div>
            <p className="text-sm text-slate-500">{f.contactNames ? `${f.contactNames} · ` : ""}Created {f.createdDate}</p>
          </button>))}</div>}
        </div>)}
      </div>

      {/* Action Grid */}
      <div className={`grid grid-cols-2 ${actions.length > 4 ? "sm:grid-cols-3" : ""} gap-3 mb-8`}>
        {actions.map(a => (<button key={a.id} onClick={() => handleAction(a.id)}
          className="group flex flex-col items-start gap-3 p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-400 hover:shadow-md transition-all text-left">
          <div className="w-11 h-11 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-all"><a.Icon size={22} strokeWidth={1.5} /></div>
          <div>
            <p className="text-base font-semibold text-slate-700 group-hover:text-slate-900">{a.label}</p>
            <p className="text-sm text-slate-400 mt-0.5">{a.desc}</p>
          </div>
        </button>))}
      </div>

      {/* Recent Activity — collapsed by default */}
      {(sfConnected || isDemoMode) && stats && stats.recentItems.length > 0 && (isOps || !expandedStat) && (
        <div className="mb-8 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <button onClick={() => setRecentOpen(!recentOpen)} className="w-full px-4 py-2.5 border-b border-slate-100 flex items-center gap-3 hover:bg-slate-50 transition-colors">
            <Clock size={12} className="text-slate-400" />
            <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Recent Activity</p>
            <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-400 font-medium">{stats.recentItems.length}</span>
            <ChevronDown size={14} className={`ml-auto text-slate-400 transition-transform ${recentOpen ? "rotate-180" : ""}`} />
          </button>
          {recentOpen && stats.recentItems.map((t, i) => (
            <RecentActivityRow key={i} item={t} icon={iconForType(t.type)} isDemoMode={isDemoMode} goTo={goTo} />
          ))}
        </div>
      )}

      {/* Regulatory Feed + Team Training */}
      <div className="mb-8 space-y-6">
        <RegulatoryFeed collapsed={!regOpen} onToggle={() => setRegOpen(!regOpen)} onAddCheck={(label, keyword) => {
          const existing = loadCustomChecks();
          const alreadyExists = existing.some(c => c.keyword === keyword);
          if (!alreadyExists) {
            saveCustomChecks([...existing, { id: Date.now().toString(36), label, keyword, regulation: "Regulatory Update", whyItMatters: `Added from regulatory feed: ${label}`, failStatus: "warn" }]);
          }
        }} />
        {role === "principal" && <TeamTraining onNavigate={goTo} advisorName={advisorName} />}
      </div>

      {/* Footer */}
      <div className="flex items-center justify-center gap-3 text-xs text-slate-500 font-medium">
        <button onClick={() => dispatch({ type: "SET_SCREEN", screen: "settings" })} className="inline-flex items-center gap-1.5 hover:text-slate-600 transition-colors">
          {isDemoMode ? <div className="w-1.5 h-1.5 rounded-full bg-amber-400" role="img" aria-label="Demo mode" /> : sfConnected === null ? <div className="w-1.5 h-1.5 rounded-full bg-slate-300 animate-pulse" role="img" aria-label="Checking connection" /> : sfConnected ? <div className="w-1.5 h-1.5 rounded-full bg-green-500" role="img" aria-label="Connected" /> : <div className="w-1.5 h-1.5 rounded-full bg-red-400" role="img" aria-label="Not connected" />}
          <span>{isDemoMode ? "Demo Mode — Ctrl+Shift+D to toggle" : sfConnected === null ? "Checking..." : sfConnected ? `Connected to Salesforce: ${sfInstance || "Org"}` : "Not connected"}</span>
        </button>
        <span>·</span><span>Powered by Impacting Advisors</span>
      </div>

    </div></div>
    </div>
  );
}
