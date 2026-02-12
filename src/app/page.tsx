"use client";
import { useState } from "react";
import { User, Wrench, Crown, Database, ChevronDown, CheckCircle } from "lucide-react";
import { useAppState } from "@/lib/app-state";
import { HomeScreen, DEMO_ADVISORS, ROLES } from "./home/HomeScreen";
import { FlowScreen } from "./flow/FlowScreen";
import { OnboardScreen } from "./onboard/OnboardScreen";
import { ComplianceScreen } from "./compliance/ComplianceScreen";
import { BriefingScreen } from "./briefing/BriefingScreen";
import { MeetingScreen } from "./meeting/MeetingScreen";
import { QueryScreen } from "./query/QueryScreen";
import { DashboardScreen } from "./dashboard/DashboardScreen";
import { FamilyScreen } from "./family/FamilyScreen";
import { TaskManager } from "./tasks/TaskManager";
import { PlanningScreen } from "./planning/PlanningScreen";
import { DemoMode } from "./tour/DemoMode";
import { SettingsScreen } from "./settings/SettingsScreen";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { assertNever } from "@/lib/types";
import type { UserRole } from "@/lib/types";

// ─── Constants ──────────────────────────────────────────────────────────────

const ROLE_ICONS: Record<UserRole, React.ElementType> = { advisor: User, operations: Wrench, principal: Crown };
const FIRM_NAME = "Bridgepoint Advisors";

const CRMS = [
  { id: "salesforce", label: "Salesforce", desc: "Connect your Salesforce org", Icon: Database, live: true },
  { id: "redtail", label: "Redtail", desc: "Redtail CRM integration", Icon: Database, live: false },
  { id: "wealthbox", label: "Wealthbox", desc: "Wealthbox CRM integration", Icon: Database, live: false },
];

// ─── NamePicker ─────────────────────────────────────────────────────────────

function NamePicker({ advisorName, onSelect, onContinue, onBack, role }: { advisorName: string; onSelect: (n: string) => void; onContinue: () => void; onBack: () => void; role: UserRole | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen bg-[#fafafa]"><div className="flex-1 flex flex-col items-center justify-center px-8"><div className="max-w-md w-full">
      <div className="text-center mb-10"><h1 className="text-5xl font-light tracking-tight text-slate-900 mb-3">Min</h1><p className="text-lg text-slate-400 font-light">Welcome, {ROLES.find(r => r.id === role)?.label}.</p></div>
      <p className="text-sm text-slate-500 text-center mb-6">Select your name</p>
      <div className="relative">
        <button onClick={() => setOpen(!open)} className="w-full h-14 text-lg rounded-xl border border-slate-200 bg-white px-5 text-slate-800 text-center flex items-center justify-between hover:border-slate-400 transition-colors">
          <span className={advisorName ? "text-slate-800" : "text-slate-300"}>{advisorName || "Choose advisor..."}</span>
          <ChevronDown size={18} className="text-slate-400" />
        </button>
        {open && (<div className="absolute top-full left-0 right-0 mt-1 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-10">
          {DEMO_ADVISORS.map(a => (<button key={a.id} onClick={() => { onSelect(a.name); setOpen(false); }} className="w-full text-left px-5 py-3 text-slate-700 hover:bg-slate-50 transition-colors">{a.name}</button>))}
        </div>)}
      </div>
      <button onClick={onContinue} disabled={!advisorName.trim()} className="w-full mt-4 h-12 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-30 transition-colors">Continue</button>
      <button onClick={onBack} className="block mx-auto mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors">← Back</button>
      <p className="text-xs text-slate-300 text-center mt-6">Powered by Impacting Advisors</p>
    </div></div></div>
  );
}

// ─── Main Application ───────────────────────────────────────────────────────

export default function Home() {
  const { state, dispatch, goTo, goBack, goHome, loadStats, showToast } = useAppState();
  const { setupStep, role, advisorName, screen, wfCtx, handoff, sfConnected, toast, tourActive } = state;

  // ═══════════════════════════════════════════════════════════════════════════
  // SETUP SCREENS
  // ═══════════════════════════════════════════════════════════════════════════

  if (setupStep === "role") return (
    <div className="flex h-screen bg-[#fafafa]"><div className="flex-1 flex flex-col items-center justify-center px-8"><div className="max-w-2xl w-full">
      <div className="text-center mb-10"><h1 className="text-5xl font-light tracking-tight text-slate-900 mb-3">Min</h1><p className="text-lg text-slate-400 font-light">Your practice, simplified.</p></div>
      <p className="text-sm text-slate-500 text-center mb-6">What&rsquo;s your role?</p>
      <div className="grid grid-cols-3 gap-4">
        {ROLES.map(r => { const Icon = ROLE_ICONS[r.id]; return (
          <button key={r.id} onClick={() => { dispatch({ type: "SET_ROLE", role: r.id }); if (DEMO_ADVISORS.length === 1) { dispatch({ type: "SET_ADVISOR_NAME", name: DEMO_ADVISORS[0].name }); dispatch({ type: "SET_SETUP_STEP", step: "crm" }); } else { dispatch({ type: "SET_SETUP_STEP", step: "name" }); } }}
            className="group flex flex-col items-center text-center gap-4 p-6 pt-10 pb-8 rounded-2xl bg-white border border-slate-200/80 hover:border-slate-400 hover:shadow-lg hover:scale-[1.02] transition-all">
            <div className="w-14 h-14 rounded-xl flex items-center justify-center bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white transition-all"><Icon size={26} strokeWidth={1.5} /></div>
            <div><p className="text-lg text-slate-600 group-hover:text-slate-900 group-hover:font-bold transition-all mb-1">{r.label}</p><p className="text-xs text-slate-400 leading-relaxed">{r.desc}</p></div>
          </button>); })}
      </div>
      <p className="text-xs text-slate-300 text-center mt-8">Powered by Impacting Advisors</p>
    </div></div></div>
  );

  if (setupStep === "name") return <NamePicker advisorName={advisorName} onSelect={n => dispatch({ type: "SET_ADVISOR_NAME", name: n })} onContinue={() => dispatch({ type: "SET_SETUP_STEP", step: "crm" })} onBack={() => dispatch({ type: "SET_SETUP_STEP", step: "role" })} role={role} />;

  if (setupStep === "crm") return (
    <div className="flex h-screen bg-[#fafafa]"><div className="flex-1 flex flex-col items-center justify-center px-8"><div className="max-w-2xl w-full">
      <div className="text-center mb-10"><h1 className="text-5xl font-light tracking-tight text-slate-900 mb-3">Min</h1><p className="text-lg text-slate-400 font-light">Connect your CRM</p></div>
      <p className="text-sm text-slate-500 text-center mb-6">Which CRM does your firm use?</p>
      <div className="grid grid-cols-3 gap-4">
        {CRMS.map(c => (<button key={c.id} onClick={() => c.live && (sfConnected ? dispatch({ type: "SET_SETUP_STEP", step: "ready" }) : dispatch({ type: "SET_SETUP_STEP", step: "connect" }))} disabled={!c.live}
          className={`group flex flex-col items-center text-center gap-4 p-6 pt-10 pb-8 rounded-2xl bg-white border border-slate-200/80 transition-all ${c.live ? "hover:border-slate-400 hover:shadow-lg hover:scale-[1.02] cursor-pointer" : "opacity-60 cursor-default"}`}>
          <div className={`w-14 h-14 rounded-xl flex items-center justify-center transition-all ${c.live ? "bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white" : "bg-slate-50 text-slate-300"}`}><c.Icon size={26} strokeWidth={1.5} /></div>
          <div><p className={`text-lg transition-all mb-1 ${c.live ? "text-slate-600 group-hover:text-slate-900 group-hover:font-bold" : "text-slate-400"}`}>{c.label}</p><p className="text-xs text-slate-400 leading-relaxed">{c.desc}</p></div>
          {c.live ? (sfConnected && c.id === "salesforce" ? <span className="text-xs px-2.5 py-1 rounded-full bg-green-100 text-green-600 font-medium">Connected</span> : null) : <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-400 font-medium">Coming Soon</span>}
        </button>))}
      </div>
      <button onClick={() => dispatch({ type: "SET_SETUP_STEP", step: DEMO_ADVISORS.length === 1 ? "role" : "name" })} className="block mx-auto mt-6 text-sm text-slate-400 hover:text-slate-600 transition-colors">← Back</button>
      <p className="text-xs text-slate-300 text-center mt-6">Powered by Impacting Advisors</p>
    </div></div></div>
  );

  if (setupStep === "connect") return (
    <ErrorBoundary fallbackLabel="Settings encountered an error.">
      <SettingsScreen onExit={() => { fetch("/api/salesforce/connection").then(r => r.json()).then(d => {
        const inst = d.instanceUrl?.replace("https://", "").split(".")[0].replace(/-[a-f0-9]{10,}-dev-ed$/i, "").replace(/-/g, " ") || "";
        dispatch({ type: "SF_STATUS", connected: d.connected, instance: inst });
        dispatch({ type: "SET_SETUP_STEP", step: d.connected ? "ready" : "crm" });
      }).catch(() => { dispatch({ type: "SF_STATUS", connected: false, instance: "" }); dispatch({ type: "SET_SETUP_STEP", step: "crm" }); }); }} />
    </ErrorBoundary>
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN ROUTER
  // ═══════════════════════════════════════════════════════════════════════════

  const tourOverlay = <DemoMode active={tourActive} onEnd={() => { dispatch({ type: "SET_TOUR", active: false }); if (screen !== "home") goHome(); }} screen={screen} />;
  const wrap = (el: React.ReactNode, label: string, withTour = true) => <>{withTour && tourOverlay}<ErrorBoundary fallbackLabel={`${label} error.`}>{el}</ErrorBoundary></>;

  switch (screen) {
    case "flow": return wrap(<FlowScreen onExit={goHome} initialClient={handoff || undefined} onNavigate={goTo} />, "Account opening");
    case "onboard": return wrap(<OnboardScreen onExit={goHome} onOpenAccounts={(p1, p2, hasP2) => { dispatch({ type: "SET_HANDOFF", handoff: { p1, p2, hasP2 } }); dispatch({ type: "SET_SCREEN", screen: "flow" }); }} onNavigate={goTo} defaultAdvisor={advisorName} />, "Onboarding");
    case "compliance": return wrap(<ComplianceScreen onExit={goBack} initialContext={wfCtx} onNavigate={goTo} firmName={FIRM_NAME} />, "Compliance");
    case "briefing": return wrap(<BriefingScreen onExit={goBack} initialContext={wfCtx} onNavigate={goTo} />, "Briefing");
    case "meeting": return wrap(<MeetingScreen onExit={goBack} initialContext={wfCtx} onNavigate={goTo} />, "Meeting");
    case "query": return wrap(<QueryScreen onExit={goHome} initialQuery="" />, "Query", false);
    case "dashboard": return wrap(<DashboardScreen onExit={goHome} onNavigate={goTo} firmName={FIRM_NAME} />, "Dashboard");
    case "planning": return wrap(<PlanningScreen onExit={goBack} initialContext={wfCtx} onNavigate={goTo} />, "Planning");
    case "family": return wfCtx ? wrap(<FamilyScreen onExit={goBack} context={wfCtx} onNavigate={goTo} />, "Family overview") : null;
    case "taskManager": return <TaskManager stats={state.stats} onBack={goHome} goTo={goTo} showToast={showToast} />;
    case "settings": return <ErrorBoundary fallbackLabel="Settings error."><SettingsScreen onExit={goHome} /></ErrorBoundary>;
    case "home": break; // falls through to HomeScreen render below
    default: assertNever(screen, `Unhandled screen: ${screen}`);
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // HOME SCREEN
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <>
      <HomeScreen state={state} dispatch={dispatch} goTo={goTo} goHome={goHome} loadStats={loadStats} showToast={showToast} />
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium shadow-lg animate-fade-in z-50 flex items-center gap-2"><CheckCircle size={16} className="text-green-400" />{toast}</div>}
    </>
  );
}
