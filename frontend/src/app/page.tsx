"use client";
import { useState, useEffect } from "react";
import { Briefcase, UserPlus, FileText, ChevronRight, Settings, Cloud, CloudOff, BookOpen } from "lucide-react";
import { FlowScreen } from "./flow/FlowScreen";
import { OnboardScreen } from "./onboard/OnboardScreen";
import { ComplianceScreen } from "./compliance/ComplianceScreen";
import { BriefingScreen } from "./briefing/BriefingScreen";
import { SettingsScreen } from "./settings/SettingsScreen";
import { ErrorBoundary } from "@/components/shared/ErrorBoundary";
import type { Screen, ClientInfo } from "@/lib/types";

const QUICK_ACTIONS = [
  { id: "open", label: "Open Accounts", desc: "New accounts, paperwork, and e-signatures", Icon: Briefcase, live: true },
  { id: "onboard", label: "Onboard New Family", desc: "Create client records and initial setup", Icon: UserPlus, live: true },
  { id: "compliance", label: "Compliance Check", desc: "Run ADV, KYC, and suitability checks", Icon: FileText, live: true },
  { id: "briefing", label: "Client Briefing", desc: "Full client picture from Salesforce", Icon: BookOpen, live: true },
];

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [handoff, setHandoff] = useState<{ p1: ClientInfo; p2: ClientInfo; hasP2: boolean } | null>(null);
  const [sfConnected, setSfConnected] = useState<boolean | null>(null);
  const [sfInstance, setSfInstance] = useState("");

  // Check SF connection on mount
  useEffect(() => {
    fetch("/api/salesforce/connection")
      .then(r => r.json())
      .then(d => { setSfConnected(d.connected); setSfInstance(d.instanceUrl?.replace("https://", "").split(".")[0] || ""); })
      .catch(() => setSfConnected(false));
  }, [screen]); // Re-check when returning from settings

  if (screen === "flow") {
    return (
      <ErrorBoundary fallbackLabel="The account opening flow encountered an error.">
        <FlowScreen
          onExit={() => { setScreen("home"); setHandoff(null); }}
          initialClient={handoff || undefined}
        />
      </ErrorBoundary>
    );
  }

  if (screen === "onboard") {
    return (
      <ErrorBoundary fallbackLabel="The onboarding flow encountered an error.">
        <OnboardScreen
          onExit={() => setScreen("home")}
          onOpenAccounts={(p1, p2, hasP2) => {
            setHandoff({ p1, p2, hasP2 });
            setScreen("flow");
          }}
        />
      </ErrorBoundary>
    );
  }

  if (screen === "compliance") {
    return (
      <ErrorBoundary fallbackLabel="The compliance check encountered an error.">
        <ComplianceScreen onExit={() => setScreen("home")} />
      </ErrorBoundary>
    );
  }

  if (screen === "settings") {
    return (
      <ErrorBoundary fallbackLabel="Settings encountered an error.">
        <SettingsScreen onExit={() => setScreen("home")} />
      </ErrorBoundary>
    );
  }

  if (screen === "briefing") {
    return (
      <ErrorBoundary fallbackLabel="Client briefing encountered an error.">
        <BriefingScreen onExit={() => setScreen("home")} />
      </ErrorBoundary>
    );
  }

  return (
    <div className="flex h-screen bg-[#fafafa]">
      <div className="flex-1 flex flex-col items-center justify-center px-8">
        <div className="max-w-xl w-full">
          <div className="text-center mb-12">
            <h1 className="text-5xl font-light tracking-tight text-slate-900 mb-3">Min</h1>
            <p className="text-lg text-slate-400 font-light">Your back office, handled.</p>
          </div>
          {/* SF Connection Status */}
          <button onClick={() => setScreen("settings")} className="w-full flex items-center justify-between px-4 py-2.5 mb-4 rounded-xl bg-white border border-slate-200/80 hover:border-slate-300 transition-colors group">
            <div className="flex items-center gap-2">
              {sfConnected === null ? (
                <div className="w-2 h-2 rounded-full bg-slate-300 animate-pulse" />
              ) : sfConnected ? (
                <Cloud size={14} className="text-green-500" />
              ) : (
                <CloudOff size={14} className="text-slate-300" />
              )}
              <span className="text-xs text-slate-400">
                {sfConnected === null ? "Checking..." : sfConnected ? `Connected to ${sfInstance || "Salesforce"}` : "Not connected to Salesforce"}
              </span>
            </div>
            <Settings size={14} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
          </button>
          <div className="space-y-3">
            {QUICK_ACTIONS.map(a => (
              <button key={a.id}
                onClick={() => { if (a.id === "open") setScreen("flow"); else if (a.id === "onboard") setScreen("onboard"); else if (a.id === "compliance") setScreen("compliance"); else if (a.id === "briefing") setScreen("briefing"); }}
                className={`group w-full flex items-center gap-5 p-5 rounded-2xl text-left transition-all duration-200 bg-white border border-slate-200/80 ${a.live ? "hover:border-slate-400 hover:shadow-lg hover:scale-[1.01] cursor-pointer" : "hover:border-slate-300 hover:shadow-md cursor-default"}`}>
                <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 transition-all duration-200 bg-slate-100 text-slate-500 group-hover:bg-slate-900 group-hover:text-white">
                  <a.Icon size={22} strokeWidth={1.5} />
                </div>
                <div className="flex-1">
                  <p className="text-[17px] text-slate-600 transition-all duration-200 group-hover:text-slate-900 group-hover:font-bold">{a.label}</p>
                  <p className="text-sm text-slate-400">{a.desc}</p>
                </div>
                {a.live ? (
                  <ChevronRight size={20} className="text-slate-300 group-hover:text-slate-500 transition-colors" />
                ) : (
                  <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-400 font-medium whitespace-nowrap">Coming Soon</span>
                )}
              </button>
            ))}
          </div>
          <p className="text-center text-xs text-slate-300 mt-12">Built by AdviceOne</p>
        </div>
      </div>
    </div>
  );
}
