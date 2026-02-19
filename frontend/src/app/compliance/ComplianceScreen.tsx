"use client";
import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import { Search, Loader2, Shield, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { ProgressSteps } from "@/components/shared/ProgressSteps";
import { callSF } from "@/lib/salesforce";
import { timestamp } from "@/lib/format";
import {
  runComplianceChecks,
} from "@/lib/compliance-engine";
import type {
  CheckResult,
  SFHousehold,
  SFContact,
  SFTask,
  AccountType,
} from "@/lib/compliance-engine";
import type { ComplianceStep, SFEvidence, Screen, WorkflowContext } from "@/lib/types";
import { EvidencePanel } from "./components/EvidencePanel";
import { BatchScan } from "./components/BatchScan";
import { ComplianceConfig } from "./components/ComplianceConfig";
import { ResultsStep, CompleteStep } from "./components/ComplianceResults";

interface HouseholdSearchResult {
  id: string;
  name: string;
  description: string;
  createdDate: string;
  contactNames: string;
}

// ─── State ───────────────────────────────────────────────────────────────────

interface CCState {
  step: ComplianceStep;
  searchQuery: string;
  isSearching: boolean;
  searchResults: HouseholdSearchResult[];
  selectedHousehold: HouseholdSearchResult | null;
  contacts: SFContact[];
  tasks: SFTask[];
  checks: CheckResult[];
  scanStep: number;
  evidence: SFEvidence[];
  householdUrl: string;
  showRightPane: boolean;
  expandedCategories: string[];
}

const initialState: CCState = {
  step: "cc-search",
  searchQuery: "",
  isSearching: false,
  searchResults: [],
  selectedHousehold: null,
  contacts: [],
  tasks: [],
  checks: [],
  scanStep: 0,
  evidence: [],
  householdUrl: "",
  showRightPane: false,
  expandedCategories: [],
};

type CCAction =
  | { type: "SET_STEP"; step: ComplianceStep }
  | { type: "SET_SEARCH_QUERY"; value: string }
  | { type: "SET_IS_SEARCHING"; value: boolean }
  | { type: "SET_SEARCH_RESULTS"; value: HouseholdSearchResult[] }
  | { type: "SET_SELECTED"; value: HouseholdSearchResult }
  | { type: "SET_HOUSEHOLD_DATA"; contacts: SFContact[]; tasks: SFTask[]; url: string }
  | { type: "SET_CHECKS"; value: CheckResult[] }
  | { type: "SET_SCAN_STEP"; value: number }
  | { type: "ADD_EVIDENCE"; ev: SFEvidence }
  | { type: "SET_SHOW_RIGHT_PANE"; value: boolean }
  | { type: "TOGGLE_CATEGORY"; category: string }
  | { type: "RESET" };

function reducer(state: CCState, action: CCAction): CCState {
  switch (action.type) {
    case "SET_STEP": return { ...state, step: action.step };
    case "SET_SEARCH_QUERY": return { ...state, searchQuery: action.value };
    case "SET_IS_SEARCHING": return { ...state, isSearching: action.value };
    case "SET_SEARCH_RESULTS": return { ...state, searchResults: action.value };
    case "SET_SELECTED": return { ...state, selectedHousehold: action.value };
    case "SET_HOUSEHOLD_DATA": return { ...state, contacts: action.contacts, tasks: action.tasks, householdUrl: action.url };
    case "SET_CHECKS": return { ...state, checks: action.value };
    case "SET_SCAN_STEP": return { ...state, scanStep: action.value };
    case "ADD_EVIDENCE": return { ...state, evidence: [...state.evidence, action.ev] };
    case "SET_SHOW_RIGHT_PANE": return { ...state, showRightPane: action.value };
    case "TOGGLE_CATEGORY": {
      const has = state.expandedCategories.includes(action.category);
      return { ...state, expandedCategories: has ? state.expandedCategories.filter(c => c !== action.category) : [...state.expandedCategories, action.category] };
    }
    case "RESET": return { ...initialState };
    default: return state;
  }
}

// ─── Constants ───────────────────────────────────────────────────────────────

const SCAN_STEPS = [
  "Pulling household records",
  "Checking KYC & identity",
  "Verifying suitability",
  "Scanning document delivery",
  "Reviewing account setup",
  "Checking regulatory compliance",
  "Done",
];

const STEP_LABELS: Record<string, string> = {
  "cc-search": "Search", "cc-scanning": "Scanning", "cc-results": "Results",
  "cc-recording": "Recording", "cc-complete": "Complete",
};

// ─── Component ───────────────────────────────────────────────────────────────

export function ComplianceScreen({ onExit, initialContext, onNavigate, firmName }: { onExit: () => void; initialContext?: WorkflowContext | null; onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void; firmName?: string }) {
  const [state, d] = useReducer(reducer, initialState);
  const householdRef = useRef<SFHousehold | null>(null);
  const contactsRef = useRef<SFContact[]>([]);
  const tasksRef = useRef<SFTask[]>([]);
  const stepsOrder = ["cc-search", "cc-scanning", "cc-results", "cc-recording", "cc-complete"];
  const progressPct = (stepsOrder.indexOf(state.step) + 1) / stepsOrder.length * 100;
  const familyName = state.selectedHousehold?.name?.replace(" Household", "") || "Client";

  const [batchMode, setBatchMode] = useState(false);
  const [searchError, setSearchError] = useState(false);
  const [accountType, setAccountType] = useState<AccountType>("unknown");

  const addEv = useCallback((label: string, url?: string) => {
    d({ type: "ADD_EVIDENCE", ev: { label, url, timestamp: timestamp() } });
  }, []);

  // Auto-select household from workflow context
  useEffect(() => {
    if (initialContext && state.step === "cc-search" && !state.selectedHousehold) {
      const hh = { id: initialContext.householdId, name: `${initialContext.familyName} Household`, description: "", createdDate: "", contactNames: "" };
      runScan(hh);
    }
  }, [initialContext, state.step]);

  // Debounced household search
  useEffect(() => {
    if (state.searchQuery.length < 2 || state.step !== "cc-search") {
      d({ type: "SET_SEARCH_RESULTS", value: [] });
      return;
    }
    d({ type: "SET_IS_SEARCHING", value: true });
    setSearchError(false);
    const timer = setTimeout(async () => {
      try {
        const res = await callSF("searchHouseholds", { query: state.searchQuery });
        if (res.success) {
          d({ type: "SET_SEARCH_RESULTS", value: (res.households as SFHousehold[]).map((h) => ({
            id: h.id, name: h.name, description: h.description || "",
            createdDate: new Date(h.createdAt).toLocaleDateString(),
            contactNames: "",
          })) });
        }
      } catch {
        setSearchError(true);
      }
      d({ type: "SET_IS_SEARCHING", value: false });
    }, 400);
    return () => clearTimeout(timer);
  }, [state.searchQuery, state.step]);

  // Run compliance scan
  const runScan = async (household: HouseholdSearchResult) => {
    d({ type: "SET_SELECTED", value: household });
    d({ type: "SET_STEP", step: "cc-scanning" });

    const steps: { label: string; fn: () => Promise<void> }[] = [
      {
        label: "Pulling household records",
        fn: async () => {
          const res = await callSF("getHouseholdDetail", { householdId: household.id });
          if (!res.success) throw new Error("Failed to load household");
          householdRef.current = res.household as SFHousehold;
          contactsRef.current = (res.contacts || []) as SFContact[];
          tasksRef.current = (res.tasks || []) as SFTask[];
          d({ type: "SET_HOUSEHOLD_DATA", contacts: contactsRef.current, tasks: tasksRef.current, url: res.householdUrl as string });
          addEv(`Loaded ${household.name}`, res.householdUrl as string);
          addEv(`${contactsRef.current.length} contacts, ${tasksRef.current.length} task records`);
        },
      },
      { label: "Checking KYC & identity", fn: async () => { await new Promise(r => setTimeout(r, 400)); } },
      { label: "Verifying suitability", fn: async () => { await new Promise(r => setTimeout(r, 350)); } },
      { label: "Scanning document delivery", fn: async () => { await new Promise(r => setTimeout(r, 300)); } },
      { label: "Reviewing account setup", fn: async () => { await new Promise(r => setTimeout(r, 350)); } },
      {
        label: "Checking regulatory compliance",
        fn: async () => {
          if (!householdRef.current) throw new Error("No household data");
          const checks = runComplianceChecks(householdRef.current, contactsRef.current, tasksRef.current, undefined, accountType);
          d({ type: "SET_CHECKS", value: checks });
          const passed = checks.filter(c => c.status === "pass").length;
          const warned = checks.filter(c => c.status === "warn").length;
          const failed = checks.filter(c => c.status === "fail").length;
          addEv(`${checks.length} checks complete: ${passed} passed, ${warned} warnings, ${failed} failed`);
        },
      },
    ];

    try {
      for (const [i, step] of steps.entries()) {
        d({ type: "SET_SCAN_STEP", value: i + 1 });
        await step.fn();
      }
      d({ type: "SET_SCAN_STEP", value: steps.length + 1 });
      setTimeout(() => d({ type: "SET_STEP", step: "cc-results" }), 500);
    } catch (err) {
      console.error(err);
      addEv(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
      d({ type: "SET_STEP", step: "cc-search" });
    }
  };

  // Record the review in Salesforce
  const recordReview = async () => {
    d({ type: "SET_STEP", step: "cc-recording" });
    try {
      const failCount = state.checks.filter(c => c.status === "fail").length;
      const res = await callSF("recordComplianceReview", {
        householdId: state.selectedHousehold!.id,
        familyName,
        passed: failCount === 0,
        failCount,
        checks: state.checks.map(c => ({ label: c.label, status: c.status, detail: c.detail })),
        nextReviewDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      });
      if (res.success) addEv("Compliance review recorded", (res.task as { url: string })?.url);
      d({ type: "SET_STEP", step: "cc-complete" });
    } catch (err) {
      addEv(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
      d({ type: "SET_STEP", step: "cc-results" });
    }
  };

  // Download compliance PDF
  const downloadPDF = async () => {
    try {
      const reviewDate = new Date().toLocaleDateString();
      const nextReviewDate = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString();
      const res = await fetch("/api/pdf/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyName,
          householdUrl: state.householdUrl,
          contacts: state.contacts.map(c => ({ name: `${c.firstName} ${c.lastName}`, email: c.email })),
          tasksScanned: state.tasks.length,
          checks: state.checks.map(c => ({
            label: c.label, category: c.category, regulation: c.regulation, status: c.status,
            detail: c.evidence && c.evidence.length > 0
              ? `${c.detail}\nEvidence: ${c.evidence.join("; ")}`
              : c.detail,
            remediation: c.remediation,
          })),
          reviewDate,
          nextReviewDate,
          firmName: firmName || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.pdf) {
        const link = document.createElement("a");
        link.href = data.pdf;
        link.download = data.filename;
        link.click();
        addEv(`PDF downloaded: ${data.filename}`);
      }
    } catch (err) {
      addEv(`PDF error: ${err instanceof Error ? err.message : "Unknown"}`);
    }
  };

  const goBack = () => {
    if (batchMode) { setBatchMode(false); return; }
    if (state.step === "cc-search") { d({ type: "RESET" }); onExit(); }
    else if (state.step === "cc-scanning") { d({ type: "RESET" }); if (initialContext) onExit(); else d({ type: "SET_STEP", step: "cc-search" }); }
    else if (state.step === "cc-results") { if (initialContext) { d({ type: "RESET" }); onExit(); } else d({ type: "SET_STEP", step: "cc-search" }); }
    else if (state.step === "cc-complete") d({ type: "SET_STEP", step: "cc-results" });
    else { d({ type: "RESET" }); onExit(); }
  };

  return (
    <div className="flex h-screen bg-surface">
      <div className="w-full lg:w-[70%] flex flex-col">
        <FlowHeader title="Compliance Reviews" familyName={state.selectedHousehold ? familyName : undefined} stepLabel={STEP_LABELS[state.step] || ""} progressPct={progressPct} onBack={goBack} onShowPane={() => d({ type: "SET_SHOW_RIGHT_PANE", value: true })} hasIndicator={state.evidence.length > 0} accent="green" />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-4 pb-16">
          <div className="max-w-xl w-full mx-auto">

            {state.step === "cc-search" && !batchMode && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Which household?</h2>
                <p className="text-slate-400 mb-8">Search for a client household to run a compliance review.</p>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input className="h-14 text-lg rounded-xl pl-11" placeholder="Search households..." value={state.searchQuery} onChange={e => d({ type: "SET_SEARCH_QUERY", value: e.target.value })} autoFocus />
                  {state.isSearching && <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                </div>
                {/* Account Type Selector */}
                <div className="mt-4 flex items-center gap-2">
                  <span className="text-xs text-slate-400">Account type:</span>
                  {(["unknown", "individual", "trust", "entity", "retirement", "joint"] as AccountType[]).map(t => (
                    <button key={t} onClick={() => setAccountType(t)}
                      className={`text-[10px] px-2.5 py-1 rounded-lg font-medium transition-colors ${accountType === t ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500 hover:text-slate-700"}`}>
                      {t === "unknown" ? "All" : t.charAt(0).toUpperCase() + t.slice(1)}
                    </button>
                  ))}
                </div>

                {state.searchQuery.length >= 2 && (
                  <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {state.searchResults.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-center">
                        {state.isSearching ? (
                          <span className="text-slate-400">Searching Salesforce...</span>
                        ) : searchError ? (
                          <span className="text-red-500 flex items-center justify-center gap-2"><AlertTriangle size={14} /> Search failed — check your Salesforce connection</span>
                        ) : (
                          <span className="text-slate-400">No households matching &ldquo;{state.searchQuery}&rdquo;</span>
                        )}
                      </p>
                    ) : state.searchResults.map((h, i) => (
                      <button key={i} onClick={() => runScan(h)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-800">{h.name}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-600">Salesforce</span>
                        </div>
                        <p className="text-sm text-slate-500">{h.contactNames ? `${h.contactNames} · ` : ""}Created {h.createdDate}</p>
                        {h.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{h.description.split("\n")[0].slice(0, 80)}</p>}
                      </button>
                    ))}
                  </div>
                )}

                {/* Batch Scan Option */}
                <div className="mt-8 pt-6 border-t border-slate-200">
                  <button onClick={() => setBatchMode(true)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-green-300 hover:bg-green-50/50 transition-colors text-left">
                    <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center flex-shrink-0">
                      <Shield size={20} className="text-green-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Scan All Households</p>
                      <p className="text-xs text-slate-400">Run compliance checks across every household in Salesforce. Export firm-wide report.</p>
                    </div>
                  </button>
                </div>

                <ComplianceConfig />
              </div>
            )}

            {/* Batch scan mode */}
            {batchMode && state.step === "cc-search" && (
              <BatchScan
                onBack={() => setBatchMode(false)}
                onNavigate={onNavigate}
                firmName={firmName}
              />
            )}

            {state.step === "cc-scanning" && (
              <div className="animate-fade-in" data-tour="compliance-progress">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Scanning {familyName}...</h2>
                <p className="text-slate-400 mb-8">Checking Salesforce records against SEC, FINRA, and DOL requirements.</p>
                <ProgressSteps steps={SCAN_STEPS} currentStep={state.scanStep} />
              </div>
            )}

            {state.step === "cc-results" && (
              <ResultsStep
                checks={state.checks}
                familyName={familyName}
                expandedCategories={state.expandedCategories}
                onToggleCategory={(cat) => d({ type: "TOGGLE_CATEGORY", category: cat })}
                onRecordReview={recordReview}
                onDownloadPDF={downloadPDF}
                householdUrl={state.householdUrl}
              />
            )}

            {state.step === "cc-recording" && (
              <div className="animate-fade-in text-center pt-16">
                <Loader2 size={40} className="animate-spin text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">Recording compliance review...</p>
              </div>
            )}

            {state.step === "cc-complete" && (
              <CompleteStep
                checks={state.checks}
                contacts={state.contacts}
                tasks={state.tasks}
                familyName={familyName}
                householdId={state.selectedHousehold?.id || ""}
                householdUrl={state.householdUrl}
                onNavigate={onNavigate}
                onDownloadPDF={downloadPDF}
                onReset={() => d({ type: "RESET" })}
                onExit={() => { d({ type: "RESET" }); onExit(); }}
              />
            )}

          </div>
        </div>
      </div>

      <EvidencePanel
        evidence={state.evidence}
        showRightPane={state.showRightPane}
        onClose={() => d({ type: "SET_SHOW_RIGHT_PANE", value: false })}
      />
    </div>
  );
}
