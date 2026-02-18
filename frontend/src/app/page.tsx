"use client";
import { useState, useEffect } from "react";
import { User, Wrench, Crown, Database, ChevronDown, CheckCircle, Shield, Lock, Eye, Server, AlertTriangle, X } from "lucide-react";
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
import { MoneyScreen } from "./money/MoneyScreen";
import { DocumentScreen } from "./documents/DocumentScreen";
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

// ─── OAuth Error Messages ───────────────────────────────────────────────────
// Maps sf_error URL params from the OAuth callback to human-readable messages.
// Each message tells the COO: what happened, why, and what to do next.

interface OAuthError {
  title: string;
  detail: string;
  action: string;
}

function parseOAuthError(raw: string): OAuthError {
  const lower = raw.toLowerCase();

  if (lower.includes("denied") || lower.includes("end-user denied") || lower.includes("user_denied")) {
    return {
      title: "Salesforce access was denied",
      detail: "Someone clicked \"Deny\" on the Salesforce authorization screen. Min needs read/write access to your Salesforce org to pull in households, tasks, and compliance data.",
      action: "Click \"Salesforce\" below to try again. When Salesforce asks for permission, click \"Allow.\"",
    };
  }

  if (lower === "no_code") {
    return {
      title: "Salesforce didn't send an authorization code",
      detail: "The connection started but Salesforce didn't complete the handshake. This usually happens if the browser window was closed during sign-in or if a popup blocker interfered.",
      action: "Try connecting again. Make sure popups are allowed for this site.",
    };
  }

  if (lower === "session_expired") {
    return {
      title: "Your connection session timed out",
      detail: "The Salesforce sign-in took longer than 10 minutes, so the session expired for security. This is normal — it just means you need to start the connection again.",
      action: "Click \"Salesforce\" below to reconnect. The sign-in usually takes under a minute.",
    };
  }

  if (lower.includes("invalid_grant")) {
    return {
      title: "Salesforce rejected the login credentials",
      detail: "The authorization code was invalid or expired. This can happen if you used the browser back button during sign-in, or if the same code was used twice.",
      action: "Try connecting again from scratch. If this keeps happening, check that your Salesforce Connected App is configured correctly.",
    };
  }

  // Generic fallback
  return {
    title: "Something went wrong connecting to Salesforce",
    detail: `Salesforce returned an error: "${raw}". This is usually temporary.`,
    action: "Try connecting again. If this keeps happening, contact your Salesforce admin or reach out to Min support.",
  };
}

// ─── OAuthErrorBanner ───────────────────────────────────────────────────────

function OAuthErrorBanner({ error, onDismiss }: { error: OAuthError; onDismiss: () => void }) {
  return (
    <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 w-full max-w-lg animate-fade-in">
      <div className="mx-4 bg-white border border-red-200 rounded-2xl shadow-lg overflow-hidden">
        <div className="bg-red-50 px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle size={16} className="text-red-500" />
            <span className="text-sm font-semibold text-red-800">{error.title}</span>
          </div>
          <button onClick={onDismiss} className="text-red-400 hover:text-red-600 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-2">
          <p className="text-sm text-slate-600 leading-relaxed">{error.detail}</p>
          <p className="text-sm text-slate-800 font-medium">{error.action}</p>
        </div>
      </div>
    </div>
  );
}

// ─── DiscoveryInterstitial ───────────────────────────────────────────────────
// Shown after Salesforce connects. Runs schema discovery automatically and
// shows the COO what Min is finding in their org — in real time.

interface DiscoveryStep {
  label: string;
  status: "pending" | "active" | "done" | "error";
  detail?: string;
}

function DiscoveryInterstitial({ onComplete, onSkip }: { onComplete: () => void; onSkip: () => void }) {
  const [steps, setSteps] = useState<DiscoveryStep[]>([
    { label: "Connecting to your Salesforce org", status: "active" },
    { label: "Reading your data model", status: "pending" },
    { label: "Detecting households and accounts", status: "pending" },
    { label: "Checking compliance and automation", status: "pending" },
    { label: "Building your dashboard", status: "pending" },
  ]);
  const [error, setError] = useState<string | null>(null);
  const [healthSummary, setHealthSummary] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function runDiscovery() {
      // Step 1: Check if we already have a cached mapping
      await sleep(400);
      if (cancelled) return;

      try {
        const cached = await fetch("/api/salesforce/discover").then(r => r.json()).catch(() => null);
        if (cancelled) return;

        // If we have a cached mapping, fast-forward through discovery
        if (cached?.success && cached?.mapping) {
          advance(0, "done");
          advance(1, "done");
          advance(2, "done", "Using cached discovery");
          advance(3, "done");
          advance(4, "done", "Ready");
          await sleep(600);
          if (!cancelled) setDone(true);
          return;
        }
      } catch {}

      // No cache — run full discovery
      advance(0, "done");
      advance(1, "active");

      await sleep(400);
      if (cancelled) return;
      advance(1, "done");
      advance(2, "active");

      try {
        const res = await fetch("/api/salesforce/discover", { method: "POST" });
        if (cancelled) return;

        if (!res.ok) {
          const body = await res.json().catch(() => null);
          throw new Error(body?.error?.message || `Discovery failed (${res.status})`);
        }

        const data = await res.json();
        if (cancelled) return;

        const hr = data.healthReport;
        advance(2, "done", hr ? `${hr.householdCount ?? 0} households, ${hr.contactCount ?? 0} contacts` : undefined);
        advance(3, "active");

        await sleep(500);
        if (cancelled) return;

        const riskNote = hr?.automationRiskLevel === "high" ? "Some automation risks detected"
          : hr?.automationRiskLevel === "medium" ? "Low automation risk"
          : "No automation risks";
        advance(3, "done", riskNote);
        advance(4, "active");

        // Build a summary line for the COO
        if (hr) {
          const parts: string[] = [];
          if (hr.householdCount) parts.push(`${hr.householdCount} households`);
          if (hr.contactCount) parts.push(`${hr.contactCount} contacts`);
          if (hr.fscInstalled) parts.push("FSC detected");
          if (hr.orgType) parts.push(hr.orgType);
          setHealthSummary(parts.join(" · "));
        }

        await sleep(600);
        if (cancelled) return;
        advance(4, "done", "Ready");

        await sleep(400);
        if (!cancelled) setDone(true);

      } catch (err) {
        if (cancelled) return;
        const msg = err instanceof Error ? err.message : "Discovery failed";
        setError(msg);
        // Mark current active step as error
        setSteps(prev => prev.map(s => s.status === "active" ? { ...s, status: "error" } : s));
      }
    }

    runDiscovery();
    return () => { cancelled = true; };
  }, []);

  function advance(index: number, status: DiscoveryStep["status"], detail?: string) {
    setSteps(prev => prev.map((s, i) => i === index ? { ...s, status, detail: detail ?? s.detail } : s));
  }

  // ── "You're all set" confirmation ──
  if (done) return (
    <div className="flex h-screen bg-surface">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="max-w-md w-full text-center animate-fade-in">
          <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-6">
            <CheckCircle size={32} className="text-green-600" />
          </div>
          <h1 className="text-3xl font-light tracking-tight text-slate-900 mb-2">You&rsquo;re all set</h1>
          <p className="text-lg text-slate-400 font-light mb-8">Min is connected to your Salesforce org.</p>

          {healthSummary && (
            <div className="bg-white border border-slate-200 rounded-2xl px-6 py-4 mb-6">
              <p className="text-sm text-slate-600">{healthSummary}</p>
            </div>
          )}

          <button onClick={onComplete} className="w-full h-12 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors">
            Open your dashboard
          </button>

          <p className="text-xs text-slate-300 mt-6">You can re-run discovery anytime from Settings.</p>
        </div>
      </div>
    </div>
  );

  // ── Discovery progress ──
  return (
    <div className="flex h-screen bg-surface">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="max-w-md w-full">
          <div className="text-center mb-10">
            <h1 className="text-5xl font-light tracking-tight text-slate-900 mb-3">Min</h1>
            <p className="text-lg text-slate-400 font-light">Reading your firm&rsquo;s Salesforce...</p>
          </div>

          <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
            {steps.map((step, i) => (
              <div key={i} className="flex items-start gap-3">
                <div className="mt-0.5">
                  {step.status === "done" && <CheckCircle size={18} className="text-green-500" />}
                  {step.status === "active" && <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-300 border-t-slate-700 animate-spin" />}
                  {step.status === "pending" && <div className="w-[18px] h-[18px] rounded-full border-2 border-slate-200" />}
                  {step.status === "error" && <AlertTriangle size={18} className="text-red-500" />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm ${step.status === "done" ? "text-slate-700" : step.status === "active" ? "text-slate-900 font-medium" : step.status === "error" ? "text-red-700 font-medium" : "text-slate-400"}`}>
                    {step.label}
                  </p>
                  {step.detail && (
                    <p className="text-xs text-slate-400 mt-0.5">{step.detail}</p>
                  )}
                </div>
              </div>
            ))}
          </div>

          {healthSummary && !error && (
            <div className="mt-4 text-center">
              <p className="text-xs text-slate-400">{healthSummary}</p>
            </div>
          )}

          {error && (
            <div className="mt-4 space-y-3">
              <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                <p className="text-sm text-red-800 font-medium">Discovery hit a snag</p>
                <p className="text-xs text-red-600 mt-1">{error}</p>
                <p className="text-xs text-slate-600 mt-2">You can skip this step and run discovery later from Settings, or try again.</p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => window.location.reload()} className="flex-1 h-10 rounded-xl border border-slate-200 text-sm text-slate-600 hover:bg-slate-50 transition-colors">Try again</button>
                <button onClick={onSkip} className="flex-1 h-10 rounded-xl bg-slate-900 text-sm text-white hover:bg-slate-800 transition-colors">Skip for now</button>
              </div>
            </div>
          )}

          <p className="text-xs text-slate-300 text-center mt-8">This is read-only — nothing in your Salesforce will be changed.</p>
        </div>
      </div>
    </div>
  );
}

function sleep(ms: number) { return new Promise(r => setTimeout(r, ms)); }

// ─── NamePicker ─────────────────────────────────────────────────────────────

function NamePicker({ advisorName, onSelect, onContinue, onBack, role }: { advisorName: string; onSelect: (n: string) => void; onContinue: () => void; onBack: () => void; role: UserRole | null }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="flex h-screen bg-surface"><div className="flex-1 flex flex-col items-center justify-center px-8"><div className="max-w-md w-full">
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
  const [oauthError, setOauthError] = useState<OAuthError | null>(null);

  // Read OAuth callback URL params on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    // Error case: sf_error present
    const rawError = params.get("sf_error");
    if (rawError) {
      setOauthError(parseOAuthError(rawError));
      const cleaned = new URL(window.location.href);
      cleaned.searchParams.delete("sf_error");
      window.history.replaceState({}, "", cleaned.pathname + cleaned.search);
      return;
    }

    // Success case: sf_connected present — skip setup, auto-discover
    const connected = params.get("sf_connected");
    if (connected === "true") {
      const orgUrl = params.get("sf_org") || "";
      const inst = orgUrl.replace("https://", "").split(".")[0]
        .replace(/-[a-f0-9]{10,}-dev-ed$/i, "").replace(/-/g, " ") || "";
      dispatch({ type: "SF_STATUS", connected: true, instance: inst });

      // Restore role + name that were saved before the OAuth redirect
      try {
        const savedRole = localStorage.getItem("min_setup_role");
        const savedName = localStorage.getItem("min_setup_name");
        if (savedRole) dispatch({ type: "SET_ROLE", role: savedRole as UserRole });
        if (savedName) dispatch({ type: "SET_ADVISOR_NAME", name: savedName });
        localStorage.removeItem("min_setup_role");
        localStorage.removeItem("min_setup_name");
      } catch {}

      dispatch({ type: "SET_SETUP_STEP", step: "discovering" });
      // Clean URL
      const cleaned = new URL(window.location.href);
      cleaned.searchParams.delete("sf_connected");
      cleaned.searchParams.delete("sf_org");
      window.history.replaceState({}, "", cleaned.pathname + cleaned.search);
    }
  }, []);

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

  // OAuth error banner — rendered as a fixed overlay on any setup screen
  const errorBanner = oauthError ? <OAuthErrorBanner error={oauthError} onDismiss={() => setOauthError(null)} /> : null;

  if (setupStep === "role") return (
    <div className="flex h-screen bg-surface"><div className="flex-1 flex flex-col items-center justify-center px-8"><div className="max-w-2xl w-full">
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
    </div></div>{errorBanner}</div>
  );

  if (setupStep === "name") return <NamePicker advisorName={advisorName} onSelect={n => dispatch({ type: "SET_ADVISOR_NAME", name: n })} onContinue={() => dispatch({ type: "SET_SETUP_STEP", step: "crm" })} onBack={() => dispatch({ type: "SET_SETUP_STEP", step: "role" })} role={role} />;

  const handleCrmSelect = async () => {
    // If we already know SF is connected, go to discovery
    if (sfConnected) {
      dispatch({ type: "SET_SETUP_STEP", step: "discovering" });
      return;
    }
    // sfConnected is null (still loading) or false — check fresh
    try {
      const res = await fetch("/api/salesforce/connection");
      const d = await res.json();
      if (d.connected) {
        const inst = d.instanceUrl?.replace("https://", "").split(".")[0]
          .replace(/-[a-f0-9]{10,}-dev-ed$/i, "").replace(/-/g, " ") || "";
        dispatch({ type: "SF_STATUS", connected: true, instance: inst });
        dispatch({ type: "SET_SETUP_STEP", step: "discovering" });
      } else {
        dispatch({ type: "SET_SETUP_STEP", step: "connect" });
      }
    } catch {
      dispatch({ type: "SET_SETUP_STEP", step: "connect" });
    }
  };

  if (setupStep === "crm") return (
    <div className="flex h-screen bg-surface"><div className="flex-1 flex flex-col items-center justify-center px-8"><div className="max-w-2xl w-full">
      <div className="text-center mb-10"><h1 className="text-5xl font-light tracking-tight text-slate-900 mb-3">Min</h1><p className="text-lg text-slate-400 font-light">Connect your CRM</p></div>
      <p className="text-sm text-slate-500 text-center mb-6">Which CRM does your firm use?</p>
      <div className="grid grid-cols-3 gap-4">
        {CRMS.map(c => (<button key={c.id} onClick={() => c.live && handleCrmSelect()} disabled={!c.live}
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

  if (setupStep === "connect") {
    // Persist role + name before OAuth redirect so they survive the page reload
    try {
      if (role) localStorage.setItem("min_setup_role", role);
      if (advisorName) localStorage.setItem("min_setup_name", advisorName);
    } catch {}
    return (
    <ErrorBoundary fallbackLabel="Settings encountered an error.">
      <SettingsScreen onExit={() => { fetch("/api/salesforce/connection").then(r => r.json()).then(d => {
        const inst = d.instanceUrl?.replace("https://", "").split(".")[0].replace(/-[a-f0-9]{10,}-dev-ed$/i, "").replace(/-/g, " ") || "";
        dispatch({ type: "SF_STATUS", connected: d.connected, instance: inst });
        dispatch({ type: "SET_SETUP_STEP", step: d.connected ? "discovering" : "crm" });
      }).catch(() => { dispatch({ type: "SF_STATUS", connected: false, instance: "" }); dispatch({ type: "SET_SETUP_STEP", step: "crm" }); }); }} />
    </ErrorBoundary>
    );
  }

  if (setupStep === "discovering") return (
    <DiscoveryInterstitial
      onComplete={() => dispatch({ type: "SET_SETUP_STEP", step: "ready" })}
      onSkip={() => dispatch({ type: "SET_SETUP_STEP", step: "ready" })}
    />
  );

  // ═══════════════════════════════════════════════════════════════════════════
  // SCREEN ROUTER
  // ═══════════════════════════════════════════════════════════════════════════

  const tourOverlay = (
    <DemoMode
      active={tourActive}
      onEnd={() => { dispatch({ type: "SET_TOUR", active: false }); if (screen !== "home") goHome(); }}
      screen={screen}
      navigateTo={goTo}
      stats={state.stats}
    />
  );
  const wrap = (el: React.ReactNode, label: string, withTour = true) => <><ErrorBoundary fallbackLabel={`${label} error.`}>{el}</ErrorBoundary>{withTour && tourOverlay}</>;

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
    case "money": return wrap(<MoneyScreen onExit={goBack} initialContext={wfCtx} onNavigate={goTo} />, "Money Movement");
    case "documents": return wrap(<DocumentScreen onExit={goBack} initialContext={wfCtx} onNavigate={goTo} />, "Documents");
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
      <HomeScreen state={state} dispatch={dispatch} goTo={goTo} goHome={goHome} loadStats={loadStats} showToast={showToast} firmName={FIRM_NAME} />
      {tourOverlay}
      {toast && <div className="fixed bottom-6 left-1/2 -translate-x-1/2 px-5 py-3 rounded-xl bg-slate-900 text-white text-sm font-medium shadow-lg animate-fade-in z-50 flex items-center gap-2"><CheckCircle size={16} className="text-green-400" />{toast}</div>}
    </>
  );
}
