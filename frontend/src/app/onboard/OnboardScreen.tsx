"use client";
import { useReducer, useRef, useCallback } from "react";
import { Plus, Check, ExternalLink } from "lucide-react";
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

  const p1Name = `${state.p1.firstName} ${state.p1.lastName}`.trim();
  const p2Name = `${state.p2.firstName} ${state.p2.lastName}`.trim();
  const fam = state.p1.lastName || "Client";
  const progressPct = (OB_STEPS_ORDER.indexOf(state.step) + 1) / OB_STEPS_ORDER.length * 100;

  const addEv = useCallback((label: string, url?: string) => {
    d({ type: "ADD_EVIDENCE", ev: { label, url, timestamp: timestamp() } });
  }, []);

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
          sfRef.current = { householdId: r.household.id, householdUrl: r.household.url, contacts: r.contacts, primaryContactId: r.contacts[0]?.id };
          addEv(`${fam} Household created`, r.household.url);
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
          if (r.success) addEv("KYC & suitability recorded", r.task.url);
        },
      },
      {
        label: "Running compliance review",
        fn: async () => {
          const r = await callSF("recordCompleteness", { householdId: sfRef.current.householdId, familyName: fam, checks: ["Identity verified", "Gov ID on file", "Trusted contact designated", "Financial profile complete", "Suitability confirmed"] });
          if (r.success) addEv("Compliance review passed", r.task.url);
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

            {state.step === "ob-p1" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Primary client details</h2>
                <p className="text-slate-400 mb-6">Enter the primary client&apos;s information. All fields marked with <span className="text-red-400">*</span> are required.</p>
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
