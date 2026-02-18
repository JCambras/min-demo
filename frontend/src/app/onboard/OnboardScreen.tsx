"use client";
import { useReducer, useRef, useCallback, useState } from "react";
import { Plus, Check, ExternalLink, Upload, Loader2, Users, FileText, X } from "lucide-react";
import { ContinueBtn } from "@/components/shared/FormControls";
import { ClientForm } from "@/components/shared/ClientForm";
import { ClientReviewCard } from "@/components/shared/ClientReviewCard";
import { ProgressSteps } from "@/components/shared/ProgressSteps";
import { RightPane } from "@/components/shared/RightPane";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { callSF } from "@/lib/salesforce";
import { isClientValid, missingFields, timestamp } from "@/lib/format";
import { OB_GEN_STEPS, OB_STEP_LABELS, OB_STEPS_ORDER } from "@/lib/constants";
import type { OnboardStep, ClientInfo, SFEvidence, SFRefs, Screen, WorkflowContext } from "@/lib/types";
import { emptyClient } from "@/lib/types";

// ─── State ───────────────────────────────────────────────────────────────────

interface ObState {
  step: OnboardStep;
  p1: ClientInfo;
  p2: ClientInfo;
  showP1SSN: boolean;
  showP2SSN: boolean;
  hasP2: boolean;
  assignedAdvisor: string;
  isProcessing: boolean;
  evidence: SFEvidence[];
  genStep: number;
  lastError: string;
  showRightPane: boolean;
}

const initialState: ObState = {
  step: "ob-p1",
  p1: emptyClient(),
  p2: emptyClient(),
  showP1SSN: false,
  showP2SSN: false,
  hasP2: false,
  assignedAdvisor: "",
  isProcessing: false,
  evidence: [],
  genStep: 0,
  lastError: "",
  showRightPane: false,
};

type ObAction =
  | { type: "SET_STEP"; step: OnboardStep }
  | { type: "SET_P1"; value: ClientInfo }
  | { type: "SET_P2"; value: ClientInfo }
  | { type: "ADD_EVIDENCE"; ev: SFEvidence }
  | { type: "SET_SHOW_P1_SSN"; value: boolean }
  | { type: "SET_SHOW_P2_SSN"; value: boolean }
  | { type: "SET_HAS_P2"; value: boolean }
  | { type: "SET_ASSIGNED_ADVISOR"; value: string }
  | { type: "SET_IS_PROCESSING"; value: boolean }
  | { type: "SET_GEN_STEP"; value: number }
  | { type: "SET_LAST_ERROR"; value: string }
  | { type: "SET_SHOW_RIGHT_PANE"; value: boolean }
  | { type: "RESET" };

function reducer(state: ObState, action: ObAction): ObState {
  switch (action.type) {
    case "SET_STEP": return { ...state, step: action.step };
    case "SET_P1": return { ...state, p1: action.value };
    case "SET_P2": return { ...state, p2: action.value };
    case "ADD_EVIDENCE": return { ...state, evidence: [...state.evidence, action.ev] };
    case "SET_SHOW_P1_SSN": return { ...state, showP1SSN: action.value };
    case "SET_SHOW_P2_SSN": return { ...state, showP2SSN: action.value };
    case "SET_HAS_P2": return { ...state, hasP2: action.value };
    case "SET_ASSIGNED_ADVISOR": return { ...state, assignedAdvisor: action.value };
    case "SET_IS_PROCESSING": return { ...state, isProcessing: action.value };
    case "SET_GEN_STEP": return { ...state, genStep: action.value };
    case "SET_LAST_ERROR": return { ...state, lastError: action.value };
    case "SET_SHOW_RIGHT_PANE": return { ...state, showRightPane: action.value };
    case "RESET": return { ...initialState };
    default: return state;
  }
}

// ─── Batch types ──────────────────────────────────────────────────────────────

interface BatchFamily {
  familyName: string;
  p1: ClientInfo;
  p2: ClientInfo | null;
  status: "pending" | "processing" | "done" | "error";
  error?: string;
  householdUrl?: string;
}

function parseCSVFamilies(csv: string): BatchFamily[] {
  const lines = csv.split("\n").map(l => l.trim()).filter(Boolean);
  if (lines.length < 2) return [];
  const hdr = lines[0].split(",").map(h => h.trim().toLowerCase().replace(/[^a-z]/g, ""));
  const col = (row: string[], key: string) => {
    const i = hdr.indexOf(key);
    return i >= 0 ? row[i]?.trim() || "" : "";
  };
  const rows = lines.slice(1).map(l => {
    const parts: string[] = [];
    let cur = "", inQ = false;
    for (const ch of l) {
      if (ch === '"') { inQ = !inQ; continue; }
      if (ch === "," && !inQ) { parts.push(cur.trim()); cur = ""; continue; }
      cur += ch;
    }
    parts.push(cur.trim());
    return parts;
  });

  // Group by lastName
  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const ln = col(r, "lastname") || "Unknown";
    if (!groups.has(ln)) groups.set(ln, []);
    groups.get(ln)!.push(r);
  }

  const families: BatchFamily[] = [];
  for (const [ln, members] of groups) {
    const fill = (r: string[]): ClientInfo => ({
      ...emptyClient(),
      firstName: col(r, "firstname"), lastName: col(r, "lastname"),
      email: col(r, "email"), phone: col(r, "phone"),
      ssn: col(r, "ssn"), dob: col(r, "dob"),
      street: col(r, "address") || col(r, "street"), city: col(r, "city"),
      state: col(r, "state"), zip: col(r, "zip"),
      annualIncome: col(r, "annualincome") || "$100,001 – $200,000",
      netWorth: col(r, "networth") || "$250,001 – $500,000",
      liquidNetWorth: col(r, "liquidnetworth") || "$100,001 – $200,000",
      riskTolerance: (col(r, "risktolerance") as ClientInfo["riskTolerance"]) || "Moderate",
      investmentObjective: (col(r, "investmentobjective") as ClientInfo["investmentObjective"]) || "Growth",
      investmentExperience: (col(r, "investmentexperience") as ClientInfo["investmentExperience"]) || "5-10 years",
      employmentStatus: (col(r, "employmentstatus") as ClientInfo["employmentStatus"]) || "Employed",
      employer: col(r, "employer"),
      maritalStatus: (col(r, "maritalstatus") as ClientInfo["maritalStatus"]) || "Single",
    });
    const primary = members.find(r => col(r, "role") === "primary") || members[0];
    const spouse = members.find(r => col(r, "role") === "spouse") || (members.length > 1 ? members[1] : null);
    families.push({ familyName: ln, p1: fill(primary), p2: spouse ? fill(spouse) : null, status: "pending" });
  }
  return families;
}

// ─── Screen Component ────────────────────────────────────────────────────────

export function OnboardScreen({ onExit, onOpenAccounts, onNavigate, defaultAdvisor }: {
  onExit: () => void;
  onOpenAccounts: (p1: ClientInfo, p2: ClientInfo, hasP2: boolean) => void;
  onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void;
  defaultAdvisor?: string;
}) {
  const [state, d] = useReducer(reducer, { ...initialState, assignedAdvisor: defaultAdvisor || "" });
  const sfRef = useRef<SFRefs>({});
  const obStepLabelsRef = useRef<string[]>(OB_GEN_STEPS);

  // ── Batch onboarding state ──
  const [batchMode, setBatchMode] = useState(false);
  const [batchFamilies, setBatchFamilies] = useState<BatchFamily[]>([]);
  const [batchRunning, setBatchRunning] = useState(false);
  const [batchDone, setBatchDone] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const p1Name = `${state.p1.firstName} ${state.p1.lastName}`.trim();
  const p2Name = `${state.p2.firstName} ${state.p2.lastName}`.trim();
  const fam = state.p1.lastName || "Client";
  const progressPct = (OB_STEPS_ORDER.indexOf(state.step) + 1) / OB_STEPS_ORDER.length * 100;

  const addEv = useCallback((label: string, url?: string) => {
    d({ type: "ADD_EVIDENCE", ev: { label, url, timestamp: timestamp() } });
  }, []);

  // ── Batch handlers ──
  const handleBatchCSV = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const families = parseCSVFamilies(reader.result as string);
      if (families.length === 0) return;
      setBatchFamilies(families);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const runBatch = async () => {
    setBatchRunning(true);
    const updated = [...batchFamilies];
    for (let i = 0; i < updated.length; i++) {
      updated[i] = { ...updated[i], status: "processing" };
      setBatchFamilies([...updated]);
      try {
        const fam = updated[i];
        const members = [{ firstName: fam.p1.firstName, lastName: fam.p1.lastName, email: fam.p1.email, phone: fam.p1.phone }];
        if (fam.p2) members.push({ firstName: fam.p2.firstName, lastName: fam.p2.lastName, email: fam.p2.email, phone: fam.p2.phone });
        const r = await callSF("confirmIntent", { familyName: fam.familyName, force: true, accounts: [], members, assignedAdvisor: state.assignedAdvisor || defaultAdvisor || "" });
        if (!r.success) throw new Error(r.error || "SF error");
        const hh = r.household as { id: string; url: string };
        // Record KYC
        const kycChecks = [`KYC: ${fam.p1.firstName} — ${fam.p1.annualIncome} income, ${fam.p1.netWorth} NW, ${fam.p1.riskTolerance} risk`];
        if (fam.p2) kycChecks.push(`KYC: ${fam.p2.firstName} — ${fam.p2.annualIncome} income, ${fam.p2.netWorth} NW, ${fam.p2.riskTolerance} risk`);
        await callSF("recordCompleteness", { householdId: hh.id, familyName: fam.familyName, checks: kycChecks });
        await callSF("recordCompleteness", { householdId: hh.id, familyName: fam.familyName, checks: ["Identity verified", "Gov ID on file", "Trusted contact designated", "Financial profile complete", "Suitability confirmed"] });
        updated[i] = { ...updated[i], status: "done", householdUrl: hh.url };
      } catch (err) {
        updated[i] = { ...updated[i], status: "error", error: err instanceof Error ? err.message : "Unknown error" };
      }
      setBatchFamilies([...updated]);
    }
    setBatchRunning(false);
    setBatchDone(true);
  };

  const goBack = () => {
    const m: Partial<Record<OnboardStep, OnboardStep>> = { "ob-p2": "ob-p1", "ob-review": state.hasP2 ? "ob-p2" : "ob-p1" };
    if (m[state.step]) d({ type: "SET_STEP", step: m[state.step]! });
    else if (state.step === "ob-p1") { d({ type: "RESET" }); onExit(); }
    else if (state.step === "ob-complete") { d({ type: "RESET" }); onExit(); }
    else { d({ type: "RESET" }); onExit(); }
  };

  const executeOnboard = async () => {
    d({ type: "SET_STEP", step: "ob-generating" });
    d({ type: "SET_IS_PROCESSING", value: true });
    d({ type: "SET_LAST_ERROR", value: "" });

    const steps: { label: string; fn: () => Promise<void> }[] = [
      {
        label: "Creating household record",
        fn: async () => {
          const members = [{ firstName: state.p1.firstName, lastName: state.p1.lastName, email: state.p1.email, phone: state.p1.phone }];
          if (state.hasP2 && state.p2.firstName) members.push({ firstName: state.p2.firstName, lastName: state.p2.lastName, email: state.p2.email, phone: state.p2.phone });
          const r = await callSF("confirmIntent", { familyName: fam, force: true, accounts: [], members, assignedAdvisor: state.assignedAdvisor });
          if (!r.success) throw new Error(r.error || "Failed to create records");
          const obHH = r.household as { id: string; url: string };
          const obCts = r.contacts as { id: string; url: string; name: string }[];
          sfRef.current = { householdId: obHH.id, householdUrl: obHH.url, contacts: obCts, primaryContactId: obCts[0]?.id };
          addEv(`${fam} Household created`, obHH.url);
        },
      },
      {
        label: "Creating contact records",
        fn: async () => {
          addEv(`${sfRef.current.contacts?.length || 1} contact${(sfRef.current.contacts?.length || 1) > 1 ? "s" : ""} created`, sfRef.current.contacts?.[0]?.url);
        },
      },
      {
        label: "Recording KYC & suitability",
        fn: async () => {
          const kycChecks = [`KYC: ${state.p1.firstName} — ${state.p1.annualIncome} income, ${state.p1.netWorth} NW, ${state.p1.riskTolerance} risk`];
          if (state.hasP2 && state.p2.firstName) kycChecks.push(`KYC: ${state.p2.firstName} — ${state.p2.annualIncome} income, ${state.p2.netWorth} NW, ${state.p2.riskTolerance} risk`);
          const r = await callSF("recordCompleteness", { householdId: sfRef.current.householdId, familyName: fam, checks: kycChecks });
          if (r.success) addEv("KYC & suitability recorded", (r.task as { url: string }).url);
        },
      },
      {
        label: "Running compliance review",
        fn: async () => {
          const r = await callSF("recordCompleteness", { householdId: sfRef.current.householdId, familyName: fam, checks: ["Identity verified", "Gov ID on file", "Trusted contact designated", "Financial profile complete", "Suitability confirmed"] });
          if (r.success) addEv("Compliance review passed", (r.task as { url: string }).url);
        },
      },
    ];

    // Derive labels for ProgressSteps — always in sync
    obStepLabelsRef.current = [...steps.map(s => s.label), "Done"];

    try {
      for (const [i, step] of steps.entries()) {
        d({ type: "SET_GEN_STEP", value: i + 1 });
        await step.fn();
      }
      d({ type: "SET_GEN_STEP", value: steps.length + 1 });
      setTimeout(() => d({ type: "SET_STEP", step: "ob-complete" }), 600);
    } catch (err) {
      console.error(err);
      const msg = err instanceof Error ? err.message : "Unknown error";
      d({ type: "SET_LAST_ERROR", value: msg });
      addEv(`❌ Error: ${msg}`);
      d({ type: "SET_STEP", step: "ob-review" });
    } finally {
      d({ type: "SET_IS_PROCESSING", value: false });
    }
  };

  return (
    <div className="flex h-screen bg-surface">
      <div className="w-full lg:w-[70%] flex flex-col">
        <FlowHeader title="Onboard New Family" familyName={fam} stepLabel={OB_STEP_LABELS[state.step] || ""} progressPct={progressPct} onBack={goBack} onShowPane={() => d({ type: "SET_SHOW_RIGHT_PANE", value: true })} hasIndicator={state.evidence.length > 0} accent="blue" />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-4 pb-16">
          <div className="max-w-xl w-full mx-auto">

            {state.step === "ob-p1" && !batchMode && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Primary client details</h2>
                <p className="text-slate-400 mb-6">Enter the primary client&apos;s information. All fields marked with <span className="text-red-400">*</span> are required.</p>

                {/* Batch import toggle */}
                <button onClick={() => setBatchMode(true)} className="mb-6 w-full flex items-center gap-3 p-4 rounded-2xl border border-blue-200 bg-blue-50 text-blue-700 hover:bg-blue-100 transition-all">
                  <Users size={18} />
                  <div className="text-left flex-1">
                    <p className="text-sm font-medium">Batch import multiple families</p>
                    <p className="text-xs text-blue-500">Upload a CSV to onboard many families at once</p>
                  </div>
                  <Upload size={16} className="text-blue-400" />
                </button>

                <ClientForm client={state.p1} setClient={v => d({ type: "SET_P1", value: v })} showSSN={state.showP1SSN} setShowSSN={v => d({ type: "SET_SHOW_P1_SSN", value: v })} label="Primary Client" />
                <div className="mt-8 pt-6 border-t border-slate-100">
                  {!state.hasP2 ? (
                    <button onClick={() => d({ type: "SET_HAS_P2", value: true })} className="group w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                      <Plus size={20} /> <span className="font-medium">Add spouse or partner</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-slate-500">Second person added</p>
                      <button onClick={() => { d({ type: "SET_HAS_P2", value: false }); d({ type: "SET_P2", value: emptyClient() }); }} className="text-sm text-red-400 hover:text-red-600">Remove</button>
                    </div>
                  )}
                </div>
                {!isClientValid(state.p1) && missingFields(state.p1).length > 0 && missingFields(state.p1).length <= 5 && (
                  <p className="text-xs text-amber-500 mt-4 text-center">Missing: {missingFields(state.p1).join(", ")}</p>
                )}
                <ContinueBtn onClick={() => d({ type: "SET_STEP", step: state.hasP2 ? "ob-p2" : "ob-review" })} disabled={!isClientValid(state.p1)} label={state.hasP2 ? "Continue to Spouse" : "Review & Create"} />
              </div>
            )}

            {/* ── Batch Mode ── */}
            {state.step === "ob-p1" && batchMode && (
              <div className="animate-fade-in">
                <div className="flex items-center justify-between mb-2">
                  <h2 className="text-3xl font-light text-slate-900">Batch Family Import</h2>
                  <button onClick={() => { setBatchMode(false); setBatchFamilies([]); setBatchDone(false); }} className="text-sm text-slate-400 hover:text-slate-600 flex items-center gap-1"><X size={14} /> Single mode</button>
                </div>
                <p className="text-slate-400 mb-6">Upload a CSV with columns: firstName, lastName, email, phone, role (primary/spouse), and optional fields (ssn, dob, address, city, state, zip, annualIncome, netWorth, riskTolerance, etc.)</p>

                <input ref={fileRef} type="file" accept=".csv" onChange={handleBatchCSV} className="hidden" />

                {batchFamilies.length === 0 && (
                  <button onClick={() => fileRef.current?.click()} className="w-full flex flex-col items-center gap-3 p-10 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-all">
                    <Upload size={28} />
                    <p className="font-medium">Choose CSV file</p>
                    <p className="text-xs">Families are grouped by last name</p>
                  </button>
                )}

                {batchFamilies.length > 0 && (
                  <div className="space-y-3">
                    {/* Summary bar */}
                    <div className="flex items-center gap-4 px-4 py-3 rounded-xl bg-slate-50 border border-slate-200">
                      <Users size={16} className="text-slate-500" />
                      <span className="text-sm font-medium text-slate-700">{batchFamilies.length} {batchFamilies.length === 1 ? "family" : "families"} detected</span>
                      <span className="text-xs text-slate-400">{batchFamilies.reduce((s, f) => s + (f.p2 ? 2 : 1), 0)} total contacts</span>
                      {!batchRunning && !batchDone && (
                        <button onClick={() => { setBatchFamilies([]); fileRef.current?.click(); }} className="ml-auto text-xs text-blue-500 hover:text-blue-700">Re-upload</button>
                      )}
                    </div>

                    {/* Family queue */}
                    <div className="space-y-2 max-h-[50vh] overflow-y-auto">
                      {batchFamilies.map((fam, i) => (
                        <div key={i} className={`flex items-center gap-3 px-4 py-3 rounded-xl border transition-all ${
                          fam.status === "done" ? "bg-green-50 border-green-200" :
                          fam.status === "error" ? "bg-red-50 border-red-200" :
                          fam.status === "processing" ? "bg-blue-50 border-blue-200" :
                          "bg-white border-slate-200"
                        }`}>
                          {fam.status === "processing" && <Loader2 size={16} className="text-blue-500 animate-spin" />}
                          {fam.status === "done" && <Check size={16} className="text-green-500" />}
                          {fam.status === "error" && <X size={16} className="text-red-500" />}
                          {fam.status === "pending" && <FileText size={16} className="text-slate-300" />}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700 truncate">{fam.familyName} Household</p>
                            <p className="text-xs text-slate-400">{fam.p1.firstName}{fam.p2 ? ` & ${fam.p2.firstName}` : ""} · {fam.p2 ? "2 contacts" : "1 contact"}</p>
                          </div>
                          {fam.status === "done" && fam.householdUrl && (
                            <a href={fam.householdUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-green-600 hover:underline flex items-center gap-1">SF <ExternalLink size={10} /></a>
                          )}
                          {fam.status === "error" && <p className="text-xs text-red-500 truncate max-w-[140px]">{fam.error}</p>}
                        </div>
                      ))}
                    </div>

                    {/* Progress bar when running */}
                    {batchRunning && (
                      <div className="rounded-lg overflow-hidden h-1.5 bg-slate-100">
                        <div className="h-full bg-blue-500 transition-all duration-300" style={{ width: `${Math.round(batchFamilies.filter(f => f.status === "done" || f.status === "error").length / batchFamilies.length * 100)}%` }} />
                      </div>
                    )}

                    {/* Completion summary */}
                    {batchDone && (
                      <div className="text-center py-4 space-y-3">
                        <div className="flex items-center justify-center gap-2 text-green-600">
                          <Check size={18} />
                          <span className="font-medium">{batchFamilies.filter(f => f.status === "done").length} of {batchFamilies.length} families created</span>
                        </div>
                        {batchFamilies.some(f => f.status === "error") && (
                          <p className="text-xs text-red-500">{batchFamilies.filter(f => f.status === "error").length} failed — check errors above</p>
                        )}
                        <button onClick={() => { setBatchMode(false); setBatchFamilies([]); setBatchDone(false); d({ type: "RESET" }); onExit(); }} className="px-5 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm">Done</button>
                      </div>
                    )}

                    {/* Run button */}
                    {!batchRunning && !batchDone && (
                      <ContinueBtn onClick={runBatch} label={`Onboard ${batchFamilies.length} ${batchFamilies.length === 1 ? "Family" : "Families"}`} />
                    )}
                  </div>
                )}
              </div>
            )}

            {state.step === "ob-p2" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Second client details</h2>
                <p className="text-slate-400 mb-6">All fields marked with <span className="text-red-400">*</span> are required.</p>
                <ClientForm client={state.p2} setClient={v => d({ type: "SET_P2", value: v })} showSSN={state.showP2SSN} setShowSSN={v => d({ type: "SET_SHOW_P2_SSN", value: v })} label="Second Client" autofillFrom={state.p1} />
                {!isClientValid(state.p2) && missingFields(state.p2).length > 0 && missingFields(state.p2).length <= 5 && (
                  <p className="text-xs text-amber-500 mt-4 text-center">Missing: {missingFields(state.p2).join(", ")}</p>
                )}
                <ContinueBtn onClick={() => d({ type: "SET_STEP", step: "ob-review" })} disabled={!isClientValid(state.p2)} label="Review & Create" />
              </div>
            )}

            {state.step === "ob-review" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Review & Create</h2>
                <p className="text-slate-400 mb-8">Tap to go back and edit. This will create the household and contacts in Salesforce.</p>
                {state.lastError && (
                  <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-xl">
                    <p className="text-sm text-red-700 font-medium">Failed to create records</p>
                    <p className="text-xs text-red-500 mt-1">{state.lastError}</p>
                  </div>
                )}
                <div className="space-y-4">
                  <ClientReviewCard client={state.p1} label="Primary Client" onClick={() => d({ type: "SET_STEP", step: "ob-p1" })} showFinancials />
                  {state.hasP2 && p2Name && (
                    <ClientReviewCard client={state.p2} label="Second Client" onClick={() => d({ type: "SET_STEP", step: "ob-p2" })} />
                  )}
                  {/* Assigned Advisor */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">Assigned Advisor</p>
                    <select
                      value={state.assignedAdvisor}
                      onChange={e => d({ type: "SET_ASSIGNED_ADVISOR", value: e.target.value })}
                      className="w-full h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent appearance-none cursor-pointer"
                      style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='16' height='16' viewBox='0 0 24 24' fill='none' stroke='%2394a3b8' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E\")", backgroundRepeat: "no-repeat", backgroundPosition: "right 12px center" }}
                    >
                      <option value="">Select an advisor...</option>
                      <option value="Jon Cambras">Jon Cambras</option>
                    </select>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">What will be created</p>
                    <div className="space-y-1.5 text-sm text-slate-600">
                      <p>· {fam} Household record</p>
                      <p>· {p1Name} Contact record</p>
                      {state.hasP2 && p2Name && <p>· {p2Name} Contact record</p>}
                      <p>· KYC & suitability profile</p>
                      <p>· Compliance review task</p>
                      {state.assignedAdvisor && <p>· Assigned to {state.assignedAdvisor}</p>}
                    </div>
                  </div>
                </div>
                <ContinueBtn onClick={executeOnboard} label="Create in Salesforce" processing={state.isProcessing} />
              </div>
            )}

            {state.step === "ob-generating" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Creating records...</h2>
                <p className="text-slate-400 mb-8">Writing to Salesforce.</p>
                <ProgressSteps steps={obStepLabelsRef.current} currentStep={state.genStep} />
              </div>
            )}

            {state.step === "ob-complete" && (
              <div className="animate-fade-in text-center pt-8">
                <div className="w-20 h-20 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto mb-6"><Check size={36} strokeWidth={2} /></div>
                <h2 className="text-3xl font-light text-slate-900 mb-3">{fam} household created.</h2>
                <p className="text-lg text-slate-400 mb-1">{state.hasP2 ? "2 contacts" : "1 contact"} added to Salesforce.</p>
                <p className="text-base text-slate-400 mb-8">KYC, suitability, and compliance reviews recorded.</p>
                <div className="flex flex-wrap gap-3 justify-center">
                  <button onClick={() => onOpenAccounts(state.p1, state.p2, state.hasP2)} className="px-5 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm">Open Accounts →</button>
                  {onNavigate && sfRef.current.householdId && (
                    <button onClick={() => onNavigate("compliance", { householdId: sfRef.current.householdId!, familyName: fam })} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">Run Compliance Review</button>
                  )}
                  {onNavigate && sfRef.current.householdId && (
                    <button onClick={() => onNavigate("portal", { householdId: sfRef.current.householdId!, familyName: fam })} className="px-5 py-3 rounded-xl border border-blue-200 bg-blue-50 text-blue-700 font-medium hover:bg-blue-100 transition-colors text-sm">Client Portal</button>
                  )}
                  {sfRef.current.householdUrl && <a href={sfRef.current.householdUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">Salesforce <ExternalLink size={14} /></a>}
                  <button onClick={() => { d({ type: "RESET" }); onExit(); }} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-400 font-medium hover:bg-slate-50 transition-colors text-sm">Home</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <RightPane
        showMobile={state.showRightPane}
        onCloseMobile={() => d({ type: "SET_SHOW_RIGHT_PANE", value: false })}
        mode="onboard" title="Client Record"
        p1={state.p1} p2={state.p2} hasP2={state.hasP2}
        evidence={state.evidence}
      />
    </div>
  );
}
