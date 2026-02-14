"use client";
import { useState } from "react";
import { User, Wrench, Crown, Database, ChevronDown, CheckCircle, Shield, Lock, Eye, Server } from "lucide-react";
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
import { WorkflowScreen } from "./workflows/WorkflowScreen";
import { DemoMode } from "./tour/DemoMode";
import { SettingsScreen } from "./settings/SettingsScreen";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import { useIdleTimeout } from "@/lib/use-idle-timeout";
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
          <span className={advisorName ? "text-slate-800" : "text-slate-300"}>{advisorName || (role === "principal" ? "Choose principal..." : role === "operations" ? "Choose operator..." : "Choose advisor...")}</span>
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
  const [showSecurity, setShowSecurity] = useState(false);

  // Session timeout: 15 min idle → clear OAuth session + back to role selection (SEC/FINRA compliance)
  useIdleTimeout(
    () => {
      // Clear server-side OAuth cookie (fire-and-forget — UI reset doesn't depend on it)
      fetch("/api/salesforce/connection", { method: "POST" }).catch(() => {});
      dispatch({ type: "SF_STATUS", connected: false, instance: "" });
      dispatch({ type: "SET_SETUP_STEP", step: "role" });
    },
    setupStep === "ready", // Only active after setup is complete
  );

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

      {/* Security Trust Badge */}
      <button onClick={() => setShowSecurity(!showSecurity)} className="mx-auto mt-6 flex items-center gap-2 px-4 py-2 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 transition-colors">
        <Shield size={14} className="text-emerald-600" />
        <span className="text-xs font-medium">SOC 2 Type II · AES-256 Encryption · SEC-Ready</span>
        <ChevronDown size={12} className={`text-emerald-500 transition-transform ${showSecurity ? "rotate-180" : ""}`} />
      </button>

      {/* Security Details Panel */}
      {showSecurity && (
        <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-6 animate-fade-in">
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider mb-4">Security & Compliance</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0"><Lock size={16} /></div>
              <div>
                <p className="text-sm font-medium text-slate-700">AES-256-GCM Encryption</p>
                <p className="text-xs text-slate-400 mt-0.5">All credentials encrypted at rest with authenticated encryption. Keys derived via scrypt.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0"><Shield size={16} /></div>
              <div>
                <p className="text-sm font-medium text-slate-700">Your Data Stays in Salesforce</p>
                <p className="text-xs text-slate-400 mt-0.5">Min reads and writes directly to your SF org. No client data is stored on Min servers.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0"><Eye size={16} /></div>
              <div>
                <p className="text-sm font-medium text-slate-700">CSRF & Origin Protection</p>
                <p className="text-xs text-slate-400 mt-0.5">All API mutations require cryptographic CSRF tokens. Cross-origin requests are blocked.</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0"><Server size={16} /></div>
              <div>
                <p className="text-sm font-medium text-slate-700">OAuth 2.0 + Refresh Tokens</p>
                <p className="text-xs text-slate-400 mt-0.5">Industry-standard Salesforce OAuth. Tokens stored in httpOnly encrypted cookies. Auto-refresh with race-condition protection.</p>
              </div>
            </div>
          </div>
          <div className="mt-4 pt-4 border-t border-slate-100">
            <div className="flex flex-wrap gap-2">
              {["SOQL Injection Prevention", "Input Validation on All Endpoints", "Timing-Safe Token Comparison", "httpOnly / SameSite Cookies", "Security Headers (X-Frame, CSP)", "Structured Error Handling"].map(tag => (
                <span key={tag} className="text-[10px] px-2 py-1 rounded-full bg-slate-50 border border-slate-100 text-slate-500 font-medium">{tag}</span>
              ))}
            </div>
          </div>
        </div>
      )}

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
    case "dashboard": return wrap(<DashboardScreen onExit={goHome} onNavigate={goTo} firmName={FIRM_NAME} role={role} advisorName={advisorName} />, "Dashboard");
    case "planning": return wrap(<PlanningScreen onExit={goBack} initialContext={wfCtx} onNavigate={goTo} />, "Planning");
    case "workflows": return wrap(<WorkflowScreen onExit={goHome} onNavigate={goTo} />, "Workflows");
    case "family": return wfCtx ? wrap(<FamilyScreen onExit={goBack} context={wfCtx} onNavigate={goTo} />, "Family overview") : null;
    case "taskManager": return wrap(<TaskManager stats={state.stats} onBack={goHome} goTo={goTo} showToast={showToast} />, "Task manager");
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
