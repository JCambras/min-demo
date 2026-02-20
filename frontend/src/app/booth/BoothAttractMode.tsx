"use client";
import { useState, useEffect, useRef } from "react";
import { getDemoSFData } from "@/lib/demo-data";
import { buildHomeStats } from "@/lib/home-stats";
import type { HomeStats, TriageItem } from "@/lib/home-stats";
import { Shield, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

// ─── Types ──────────────────────────────────────────────────────────────────

interface BoothProps {
  firmName: string;
}

interface HouseholdHealth {
  name: string;
  aum: string;
  healthScore: number;
}

interface ComplianceItem {
  label: string;
  regulation: string;
  status: "pass" | "warn" | "fail";
}

// ─── Static Compliance Demo Data ────────────────────────────────────────────

const DEMO_COMPLIANCE: ComplianceItem[] = [
  { label: "KYC / CIP Verification", regulation: "USA PATRIOT Act §326", status: "pass" },
  { label: "Suitability Assessment", regulation: "SEC Rule 15c2-11", status: "pass" },
  { label: "Risk Tolerance Documentation", regulation: "Reg BI §240.15l-1", status: "pass" },
  { label: "ADV Part 2 Delivery", regulation: "SEC Rule 204-3", status: "warn" },
  { label: "Privacy Notice (Reg S-P)", regulation: "17 CFR §248.4", status: "pass" },
  { label: "Anti-Money Laundering", regulation: "BSA / FinCEN", status: "pass" },
  { label: "Account Agreement Signed", regulation: "FINRA Rule 4311", status: "pass" },
  { label: "RMD Tracking", regulation: "IRC §401(a)(9)", status: "fail" },
  { label: "Beneficiary Designation", regulation: "ERISA §514", status: "pass" },
  { label: "Fee Disclosure", regulation: "SEC Rule 206(4)-7", status: "pass" },
];

// ─── Household Health Data ──────────────────────────────────────────────────

const DEMO_HOUSEHOLDS: HouseholdHealth[] = [
  { name: "Thompson", aum: "$4.2M", healthScore: 92 },
  { name: "Chen", aum: "$6.8M", healthScore: 78 },
  { name: "Patel", aum: "$3.1M", healthScore: 65 },
  { name: "Williams", aum: "$8.4M", healthScore: 88 },
  { name: "Rodriguez", aum: "$5.5M", healthScore: 95 },
  { name: "Kim", aum: "$2.9M", healthScore: 71 },
];

// ─── View Components ────────────────────────────────────────────────────────

function BoothTriageView({ items }: { items: TriageItem[] }) {
  const urgencyColor: Record<string, string> = {
    now: "border-l-red-500 bg-red-50/60",
    today: "border-l-amber-500 bg-amber-50/60",
    "this-week": "border-l-blue-500 bg-blue-50/60",
  };
  const urgencyLabel: Record<string, string> = {
    now: "NOW",
    today: "TODAY",
    "this-week": "THIS WEEK",
  };

  return (
    <div className="booth-crossfade px-12 py-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-light text-slate-900 mb-2">Morning Triage</h2>
      <p className="text-slate-400 mb-8">Prioritized action queue — handle before noon.</p>
      <div className="space-y-4">
        {items.slice(0, 6).map((item, i) => (
          <div key={i} className={`border-l-4 rounded-2xl bg-white border border-slate-200 p-5 ${urgencyColor[item.urgency] || ""}`}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-lg font-medium text-slate-900">{item.label}</span>
              <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                item.urgency === "now" ? "bg-red-100 text-red-700" :
                item.urgency === "today" ? "bg-amber-100 text-amber-700" :
                "bg-blue-100 text-blue-700"
              }`}>{urgencyLabel[item.urgency]}</span>
            </div>
            <p className="text-sm text-slate-500">{item.reason}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoothDashboardView({ households }: { households: HouseholdHealth[] }) {
  const ringColor = (score: number) =>
    score >= 85 ? "text-green-500" : score >= 70 ? "text-amber-500" : "text-red-500";
  const ringBg = (score: number) =>
    score >= 85 ? "text-green-100" : score >= 70 ? "text-amber-100" : "text-red-100";

  return (
    <div className="booth-crossfade px-12 py-8 max-w-4xl mx-auto">
      <h2 className="text-3xl font-light text-slate-900 mb-2">Practice Health</h2>
      <p className="text-slate-400 mb-8">Household health scores across the practice.</p>
      <div className="grid grid-cols-3 gap-5">
        {households.map((hh, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-2xl p-6 text-center">
            {/* Health ring */}
            <div className="relative w-24 h-24 mx-auto mb-4">
              <svg className="w-24 h-24 -rotate-90" viewBox="0 0 36 36">
                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" className={`stroke-current ${ringBg(hh.healthScore)}`} />
                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" strokeLinecap="round"
                  className={`stroke-current ${ringColor(hh.healthScore)}`}
                  strokeDasharray={`${hh.healthScore} ${100 - hh.healthScore}`} />
              </svg>
              <span className="absolute inset-0 flex items-center justify-center text-2xl font-light text-slate-900 tabular-nums">
                {hh.healthScore}
              </span>
            </div>
            <p className="text-lg font-medium text-slate-900">{hh.name}</p>
            <p className="text-sm text-slate-400 tabular-nums">{hh.aum}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function BoothComplianceView({ items }: { items: ComplianceItem[] }) {
  const icon = (s: string) =>
    s === "pass" ? <CheckCircle size={20} className="text-green-500" /> :
    s === "warn" ? <AlertTriangle size={20} className="text-amber-500" /> :
    <XCircle size={20} className="text-red-500" />;

  return (
    <div className="booth-crossfade px-12 py-8 max-w-4xl mx-auto">
      <div className="flex items-center gap-3 mb-2">
        <Shield size={28} className="text-slate-400" />
        <h2 className="text-3xl font-light text-slate-900">Compliance Scan</h2>
      </div>
      <p className="text-slate-400 mb-8">Thompson Household — automated regulatory check.</p>
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
        {items.map((item, i) => (
          <div key={i} className={`flex items-center gap-4 px-6 py-4 ${i > 0 ? "border-t border-slate-50" : ""}`}
            style={{ animationDelay: `${i * 80}ms`, animation: "booth-crossfade 0.4s ease-in-out both" }}>
            {icon(item.status)}
            <div className="flex-1">
              <p className="text-base font-medium text-slate-900">{item.label}</p>
              <p className="text-sm text-slate-400">{item.regulation}</p>
            </div>
            <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${
              item.status === "pass" ? "bg-green-100 text-green-700" :
              item.status === "warn" ? "bg-amber-100 text-amber-700" :
              "bg-red-100 text-red-700"
            }`}>{item.status.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main Booth Component ───────────────────────────────────────────────────

const VIEWS = ["triage", "dashboard", "compliance"] as const;
type BoothView = typeof VIEWS[number];

export function BoothAttractMode({ firmName }: BoothProps) {
  const [activeView, setActiveView] = useState<BoothView>("triage");
  const [stats, setStats] = useState<HomeStats | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval>>(null);

  // Load demo data on mount
  useEffect(() => {
    const { tasks, households, instanceUrl } = getDemoSFData();
    const demoStats = buildHomeStats(tasks, households, instanceUrl);
    setStats(demoStats);
  }, []);

  // Auto-cycle every 8 seconds
  useEffect(() => {
    timerRef.current = setInterval(() => {
      setActiveView(prev => {
        const idx = VIEWS.indexOf(prev);
        return VIEWS[(idx + 1) % VIEWS.length];
      });
    }, 8000);
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, []);

  if (!stats) return null;

  return (
    <div className="booth flex flex-col h-screen bg-surface overflow-hidden">
      {/* Top bar — branding + dots */}
      <div className="flex items-center justify-between px-8 pt-6 pb-2">
        <div>
          <h1 className="text-5xl font-light tracking-tight text-slate-900">Min</h1>
          <p className="text-sm text-slate-400 mt-1">{firmName}</p>
        </div>
        <div className="flex items-center gap-2">
          {VIEWS.map(v => (
            <button key={v} onClick={() => setActiveView(v)}
              className={`w-3 h-3 rounded-full transition-all ${v === activeView ? "bg-slate-900 scale-125" : "bg-slate-300"}`}
              aria-label={`View ${v}`} />
          ))}
        </div>
      </div>

      {/* Active view */}
      <div className="flex-1 overflow-hidden" key={activeView}>
        {activeView === "triage" && <BoothTriageView items={stats.triageItems} />}
        {activeView === "dashboard" && <BoothDashboardView households={DEMO_HOUSEHOLDS} />}
        {activeView === "compliance" && <BoothComplianceView items={DEMO_COMPLIANCE} />}
      </div>

      {/* Bottom bar */}
      <div className="px-8 py-4 text-center">
        <p className="text-xs text-slate-300">Operations intelligence for multi-advisor Salesforce practices</p>
      </div>
    </div>
  );
}
