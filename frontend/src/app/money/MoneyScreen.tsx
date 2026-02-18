"use client";
import { useReducer, useEffect, useCallback, useRef, useState, useMemo } from "react";
import { Search, Loader2, Check, ChevronRight, DollarSign, ArrowRight, ArrowLeftRight, Building2, AlertTriangle, ExternalLink, Shield, BookmarkPlus, Bookmark, Trash2, ArrowUpDown } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ContinueBtn, FieldLabel, SelectField } from "@/components/shared/FormControls";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { ProgressSteps } from "@/components/shared/ProgressSteps";
import { callSF } from "@/lib/salesforce";
import { timestamp } from "@/lib/format";
import { custodian } from "@/lib/custodian";
import type { Screen, WorkflowContext, SFEvidence } from "@/lib/types";

// ─── Types ────────────────────────────────────────────────────────────────────

type MoneyStep = "search" | "type" | "details" | "review" | "submitting" | "complete";

type MovementType = "wire" | "journal" | "ach-distribution" | "ach-contribution" | "check";

interface MovementDetails {
  movementType: MovementType | "";
  fromAccount: string;
  toAccount: string;
  amount: string;
  memo: string;
  // Wire-specific
  receivingBank: string;
  routingNumber: string;
  accountNumber: string;
  beneficiaryName: string;
  // IRA distribution-specific
  distributionReason: string;
  federalWithholding: string;
  stateWithholding: string;
  withholdingState: string;
  // Journal-specific
  journalType: string;
}

const EMPTY_DETAILS: MovementDetails = {
  movementType: "", fromAccount: "", toAccount: "", amount: "", memo: "",
  receivingBank: "", routingNumber: "", accountNumber: "", beneficiaryName: "",
  distributionReason: "", federalWithholding: "10", stateWithholding: "0", withholdingState: "",
  journalType: "full",
};

const MOVEMENT_TYPES: { id: MovementType; label: string; desc: string; icon: React.ReactNode }[] = [
  { id: "wire", label: "Wire Transfer", desc: "Outgoing wire to external bank", icon: <ArrowRight size={20} /> },
  { id: "journal", label: "Journal", desc: "Move between accounts at custodian", icon: <ArrowLeftRight size={20} /> },
  { id: "ach-distribution", label: "ACH Distribution", desc: "IRA/retirement distribution via ACH", icon: <DollarSign size={20} /> },
  { id: "ach-contribution", label: "ACH Contribution", desc: "Incoming contribution via ACH", icon: <DollarSign size={20} /> },
  { id: "check", label: "Check Request", desc: "Issue custodian check", icon: <Building2 size={20} /> },
];

const IRA_DISTRIBUTION_REASONS = [
  "Normal Distribution (59½+)",
  "Early Distribution (under 59½)",
  "Roth Conversion",
  "Required Minimum Distribution (RMD)",
  "Death Distribution",
  "Disability",
  "Substantially Equal Periodic Payments (72t)",
  "Excess Contribution Removal",
];

const IRA_ACCOUNT_TYPES = ["IRA", "Roth IRA", "SEP IRA", "Rollover IRA", "Inherited IRA", "Traditional IRA"];

// ─── State ────────────────────────────────────────────────────────────────────

interface HouseholdResult {
  id: string; name: string; description: string; createdDate: string; contactNames: string;
}

interface MoneyState {
  step: MoneyStep;
  searchQuery: string;
  isSearching: boolean;
  searchResults: HouseholdResult[];
  selectedHousehold: HouseholdResult | null;
  accounts: string[];
  details: MovementDetails;
  evidence: SFEvidence[];
  householdUrl: string;
  showRightPane: boolean;
}

const initialState: MoneyState = {
  step: "search",
  searchQuery: "",
  isSearching: false,
  searchResults: [],
  selectedHousehold: null,
  accounts: [],
  details: { ...EMPTY_DETAILS },
  evidence: [],
  householdUrl: "",
  showRightPane: false,
};

type MoneyAction =
  | { type: "SET_STEP"; step: MoneyStep }
  | { type: "SET_SEARCH_QUERY"; value: string }
  | { type: "SET_IS_SEARCHING"; value: boolean }
  | { type: "SET_SEARCH_RESULTS"; value: HouseholdResult[] }
  | { type: "SET_SELECTED"; value: HouseholdResult; accounts: string[]; url: string }
  | { type: "SET_DETAILS"; details: Partial<MovementDetails> }
  | { type: "ADD_EVIDENCE"; ev: SFEvidence }
  | { type: "SET_SHOW_RIGHT_PANE"; value: boolean }
  | { type: "RESET" };

function reducer(state: MoneyState, action: MoneyAction): MoneyState {
  switch (action.type) {
    case "SET_STEP": return { ...state, step: action.step };
    case "SET_SEARCH_QUERY": return { ...state, searchQuery: action.value };
    case "SET_IS_SEARCHING": return { ...state, isSearching: action.value };
    case "SET_SEARCH_RESULTS": return { ...state, searchResults: action.value };
    case "SET_SELECTED": return { ...state, selectedHousehold: action.value, accounts: action.accounts, householdUrl: action.url, step: "type" };
    case "SET_DETAILS": return { ...state, details: { ...state.details, ...action.details } };
    case "ADD_EVIDENCE": return { ...state, evidence: [...state.evidence, action.ev] };
    case "SET_SHOW_RIGHT_PANE": return { ...state, showRightPane: action.value };
    case "RESET": return { ...initialState };
    default: return state;
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseAccounts(description: string): string[] {
  const accounts: string[] = [];
  const lines = description.split("\n");
  for (const line of lines) {
    const match = line.match(/Account\s*(?:Type)?:\s*(.+)/i) || line.match(/^\s*-\s*(Individual|IRA|Roth|Joint|Trust|SEP|Rollover|JTWROS|TOD)/i);
    if (match) accounts.push(match[1].trim());
  }
  if (accounts.length === 0) {
    // Fallback: detect from common keywords in description
    const types = ["Individual Brokerage", "Traditional IRA", "Roth IRA", "Joint JTWROS", "Trust", "SEP IRA", "Rollover IRA"];
    for (const t of types) {
      if (description.toLowerCase().includes(t.toLowerCase().split(" ")[0].toLowerCase())) accounts.push(t);
    }
  }
  if (accounts.length === 0) accounts.push("Primary Account");
  return accounts;
}

function validateRouting(routing: string): boolean {
  if (routing.length !== 9 || !/^\d{9}$/.test(routing)) return false;
  // ABA routing checksum
  const d = routing.split("").map(Number);
  const sum = 3 * (d[0] + d[3] + d[6]) + 7 * (d[1] + d[4] + d[7]) + (d[2] + d[5] + d[8]);
  return sum % 10 === 0;
}

function isIraAccount(account: string): boolean {
  return IRA_ACCOUNT_TYPES.some(t => account.toLowerCase().includes(t.toLowerCase().replace(" ira", "").replace("traditional ", "")));
}

function computeWithholding(amount: number, fedPct: number, statePct: number): { gross: number; fedTax: number; stateTax: number; net: number } {
  const fedTax = Math.round(amount * fedPct / 100 * 100) / 100;
  const stateTax = Math.round(amount * statePct / 100 * 100) / 100;
  return { gross: amount, fedTax, stateTax, net: Math.round((amount - fedTax - stateTax) * 100) / 100 };
}

function computeGrossFromNet(desiredNet: number, fedPct: number, statePct: number): { gross: number; fedTax: number; stateTax: number; net: number } {
  const factor = 1 - fedPct / 100 - statePct / 100;
  if (factor <= 0) return { gross: 0, fedTax: 0, stateTax: 0, net: 0 };
  const gross = Math.round(desiredNet / factor * 100) / 100;
  const fedTax = Math.round(gross * fedPct / 100 * 100) / 100;
  const stateTax = Math.round(gross * statePct / 100 * 100) / 100;
  return { gross, fedTax, stateTax, net: Math.round((gross - fedTax - stateTax) * 100) / 100 };
}

// ─── Wire Templates ──────────────────────────────────────────────────────────

interface WireTemplate {
  id: string;
  name: string;
  receivingBank: string;
  routingNumber: string;
  accountNumber: string;
  beneficiaryName: string;
}

const WIRE_TEMPLATES_KEY = "min-wire-templates";

function loadWireTemplates(): WireTemplate[] {
  try { return JSON.parse(localStorage.getItem(WIRE_TEMPLATES_KEY) || "[]"); } catch { return []; }
}

function saveWireTemplates(templates: WireTemplate[]) {
  try { localStorage.setItem(WIRE_TEMPLATES_KEY, JSON.stringify(templates)); } catch {}
}

// ─── Constants ────────────────────────────────────────────────────────────────

const STEP_LABELS: Record<MoneyStep, string> = {
  search: "Search", type: "Type", details: "Details", review: "Review", submitting: "Submitting", complete: "Complete",
};

const STEPS_ORDER: MoneyStep[] = ["search", "type", "details", "review", "submitting", "complete"];

// ─── Component ────────────────────────────────────────────────────────────────

export function MoneyScreen({ onExit, initialContext, onNavigate }: {
  onExit: () => void;
  initialContext?: WorkflowContext | null;
  onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void;
}) {
  const [state, d] = useReducer(reducer, initialState);
  const progressPct = (STEPS_ORDER.indexOf(state.step) + 1) / STEPS_ORDER.length * 100;
  const familyName = state.selectedHousehold?.name?.replace(" Household", "") || "Client";

  // Wire templates
  const [wireTemplates, setWireTemplates] = useState<WireTemplate[]>(() => loadWireTemplates());
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [templateName, setTemplateName] = useState("");

  // Net-to-gross calculator mode
  const [calcMode, setCalcMode] = useState<"gross-to-net" | "net-to-gross">("gross-to-net");

  const addEv = useCallback((label: string, url?: string) => {
    d({ type: "ADD_EVIDENCE", ev: { label, url, timestamp: timestamp() } });
  }, []);

  // Auto-select household from context
  useEffect(() => {
    if (initialContext && state.step === "search" && !state.selectedHousehold) {
      selectHousehold({ id: initialContext.householdId, name: `${initialContext.familyName} Household`, description: "", createdDate: "", contactNames: "" });
    }
  }, [initialContext, state.step]);

  // Debounced search
  useEffect(() => {
    if (state.searchQuery.length < 2 || state.step !== "search") {
      d({ type: "SET_SEARCH_RESULTS", value: [] });
      return;
    }
    d({ type: "SET_IS_SEARCHING", value: true });
    const timer = setTimeout(async () => {
      try {
        const res = await callSF("searchHouseholds", { query: state.searchQuery });
        if (res.success) {
          d({ type: "SET_SEARCH_RESULTS", value: (res.households as { id: string; name: string; description?: string; createdAt: string }[]).map(h => ({
            id: h.id, name: h.name, description: h.description || "",
            createdDate: new Date(h.createdAt).toLocaleDateString(), contactNames: "",
          })) });
        }
      } catch { /* swallow */ }
      d({ type: "SET_IS_SEARCHING", value: false });
    }, 400);
    return () => clearTimeout(timer);
  }, [state.searchQuery, state.step]);

  const selectHousehold = async (hh: HouseholdResult) => {
    try {
      const res = await callSF("getHouseholdDetail", { householdId: hh.id });
      if (res.success) {
        const accounts = parseAccounts(res.household?.description || hh.description || "");
        d({ type: "SET_SELECTED", value: { ...hh, description: res.household?.description || hh.description }, accounts, url: res.householdUrl || "" });
        addEv(`Loaded ${hh.name}`, res.householdUrl);
        addEv(`${accounts.length} account(s) found`);
      } else {
        d({ type: "SET_SELECTED", value: hh, accounts: parseAccounts(hh.description), url: "" });
      }
    } catch {
      d({ type: "SET_SELECTED", value: hh, accounts: ["Primary Account"], url: "" });
    }
  };

  // Submit money movement
  const submit = async () => {
    d({ type: "SET_STEP", step: "submitting" });
    try {
      const det = state.details;
      const typeLabel = MOVEMENT_TYPES.find(t => t.id === det.movementType)?.label || det.movementType;

      let description = `Money Movement: ${typeLabel}\n`;
      description += `From: ${det.fromAccount}\n`;
      if (det.toAccount) description += `To: ${det.toAccount}\n`;
      description += `Amount: $${Number(det.amount).toLocaleString()}\n`;
      if (det.memo) description += `Memo: ${det.memo}\n`;

      if (det.movementType === "wire") {
        description += `\nWire Details:\nReceiving Bank: ${det.receivingBank}\nRouting: ${det.routingNumber}\nAccount: ${det.accountNumber}\nBeneficiary: ${det.beneficiaryName}\n`;
      }

      if (det.movementType === "ach-distribution" && isIraAccount(det.fromAccount)) {
        const wh = computeWithholding(Number(det.amount), Number(det.federalWithholding), Number(det.stateWithholding));
        description += `\nIRA Distribution:\nReason: ${det.distributionReason}\nFederal Withholding: ${det.federalWithholding}% ($${wh.fedTax.toLocaleString()})\n`;
        if (Number(det.stateWithholding) > 0) description += `State Withholding (${det.withholdingState}): ${det.stateWithholding}% ($${wh.stateTax.toLocaleString()})\n`;
        description += `Net Distribution: $${wh.net.toLocaleString()}\n`;
      }

      if (det.movementType === "journal") {
        description += `Journal Type: ${det.journalType === "full" ? "Full Transfer" : "Partial Transfer"}\n`;
      }

      const res = await callSF("createTask", {
        householdId: state.selectedHousehold!.id,
        subject: `MONEY MOVEMENT: ${typeLabel} — $${Number(det.amount).toLocaleString()} — ${familyName}`,
        description,
        priority: Number(det.amount) >= 50000 ? "High" : "Normal",
        status: "Open",
      });

      if (res.success) {
        addEv(`${typeLabel} request created`, res.task?.url);
        addEv(`$${Number(det.amount).toLocaleString()} from ${det.fromAccount}`);
      }
      d({ type: "SET_STEP", step: "complete" });
    } catch (err) {
      addEv(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
      d({ type: "SET_STEP", step: "review" });
    }
  };

  // Validation
  const det = state.details;
  const typeInfo = MOVEMENT_TYPES.find(t => t.id === det.movementType);
  const isIra = det.fromAccount ? isIraAccount(det.fromAccount) : false;
  const amountNum = Number(det.amount) || 0;

  const detailsValid = (() => {
    if (!det.amount || amountNum <= 0) return false;
    if (!det.fromAccount) return false;
    if (det.movementType === "wire") {
      if (!det.receivingBank || !det.routingNumber || !det.accountNumber || !det.beneficiaryName) return false;
      if (!validateRouting(det.routingNumber)) return false;
    }
    if (det.movementType === "journal" && !det.toAccount) return false;
    if (det.movementType === "ach-distribution" && isIra && !det.distributionReason) return false;
    return true;
  })();

  const goBack = () => {
    if (state.step === "search") onExit();
    else if (state.step === "type") { if (initialContext) onExit(); else d({ type: "SET_STEP", step: "search" }); }
    else if (state.step === "details") d({ type: "SET_STEP", step: "type" });
    else if (state.step === "review") d({ type: "SET_STEP", step: "details" });
    else if (state.step === "complete") d({ type: "RESET" });
    else onExit();
  };

  return (
    <div className="flex h-screen bg-surface">
      <div className="w-full lg:w-[70%] flex flex-col">
        <FlowHeader title="Money Movement" familyName={state.selectedHousehold ? familyName : undefined} stepLabel={STEP_LABELS[state.step]} progressPct={progressPct} onBack={goBack} onShowPane={() => d({ type: "SET_SHOW_RIGHT_PANE", value: true })} hasIndicator={state.evidence.length > 0} />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-4 pb-16">
          <div className="max-w-xl w-full mx-auto">

            {/* ── Search ── */}
            {state.step === "search" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Which household?</h2>
                <p className="text-slate-400 mb-8">Search for a client to initiate a money movement.</p>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input className="h-14 text-lg rounded-xl pl-11" placeholder="Search households..." value={state.searchQuery} onChange={e => d({ type: "SET_SEARCH_QUERY", value: e.target.value })} autoFocus />
                  {state.isSearching && <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                </div>
                {state.searchQuery.length >= 2 && (
                  <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {state.searchResults.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-slate-400 text-center">{state.isSearching ? "Searching..." : `No matches for \u201c${state.searchQuery}\u201d`}</p>
                    ) : state.searchResults.map((h, i) => (
                      <button key={i} onClick={() => selectHousehold(h)} className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                        <p className="font-medium text-slate-800">{h.name}</p>
                        <p className="text-sm text-slate-500">Created {h.createdDate}</p>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* ── Movement Type ── */}
            {state.step === "type" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Movement Type</h2>
                <p className="text-slate-400 mb-8">{familyName} Household — select the type of money movement.</p>
                <div className="space-y-3">
                  {MOVEMENT_TYPES.map(t => (
                    <button key={t.id} onClick={() => { d({ type: "SET_DETAILS", details: { movementType: t.id } }); d({ type: "SET_STEP", step: "details" }); }}
                      className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/30 transition-colors text-left">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center flex-shrink-0">{t.icon}</div>
                      <div className="flex-1">
                        <p className="text-sm font-medium text-slate-800">{t.label}</p>
                        <p className="text-xs text-slate-400">{t.desc}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-300" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── Details ── */}
            {state.step === "details" && typeInfo && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">{typeInfo.label}</h2>
                <p className="text-slate-400 mb-8">{familyName} Household — enter movement details.</p>

                <div className="space-y-5">
                  {/* From Account */}
                  <div>
                    <FieldLabel>From Account</FieldLabel>
                    <SelectField value={det.fromAccount} onChange={v => d({ type: "SET_DETAILS", details: { fromAccount: v } })} options={["", ...state.accounts]} labels={["Select account...", ...state.accounts]} />
                  </div>

                  {/* To Account (journal) */}
                  {det.movementType === "journal" && (
                    <div>
                      <FieldLabel>To Account</FieldLabel>
                      <SelectField value={det.toAccount} onChange={v => d({ type: "SET_DETAILS", details: { toAccount: v } })} options={["", ...state.accounts.filter(a => a !== det.fromAccount)]} labels={["Select destination...", ...state.accounts.filter(a => a !== det.fromAccount)]} />
                    </div>
                  )}

                  {/* Amount */}
                  <div>
                    <FieldLabel>{det.movementType === "ach-distribution" && isIra && calcMode === "net-to-gross" ? "Desired Net Amount ($)" : "Amount ($)"}</FieldLabel>
                    <Input type="number" min="0" step="0.01" className="h-12 text-lg rounded-xl" placeholder="0.00" value={det.amount} onChange={e => d({ type: "SET_DETAILS", details: { amount: e.target.value } })} />
                    {amountNum >= 100000 && (
                      <p className="text-xs text-amber-500 mt-1 flex items-center gap-1"><AlertTriangle size={12} /> Large transaction — may require additional verification</p>
                    )}
                  </div>

                  {/* Wire-specific fields */}
                  {det.movementType === "wire" && (
                    <div className="bg-slate-50 rounded-2xl p-5 space-y-4">
                      <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Wire Details</p>
                      {wireTemplates.length > 0 && (
                        <div className="bg-white rounded-xl p-3 space-y-2">
                          <p className="text-[10px] uppercase tracking-wider text-slate-400 flex items-center gap-1"><Bookmark size={10} /> Saved Templates</p>
                          {wireTemplates.map(t => (
                            <div key={t.id} className="flex items-center justify-between">
                              <button onClick={() => d({ type: "SET_DETAILS", details: { receivingBank: t.receivingBank, routingNumber: t.routingNumber, accountNumber: t.accountNumber, beneficiaryName: t.beneficiaryName } })}
                                className="text-xs text-blue-600 hover:text-blue-800 font-medium truncate">{t.name}</button>
                              <button onClick={() => { const updated = wireTemplates.filter(x => x.id !== t.id); setWireTemplates(updated); saveWireTemplates(updated); }}
                                className="text-slate-300 hover:text-red-400 flex-shrink-0"><Trash2 size={12} /></button>
                            </div>
                          ))}
                        </div>
                      )}
                      <div>
                        <FieldLabel>Receiving Bank Name</FieldLabel>
                        <Input className="h-11 rounded-xl" placeholder="e.g. JP Morgan Chase" value={det.receivingBank} onChange={e => d({ type: "SET_DETAILS", details: { receivingBank: e.target.value } })} />
                      </div>
                      <div>
                        <FieldLabel>ABA Routing Number</FieldLabel>
                        <Input className="h-11 rounded-xl" placeholder="9 digits" maxLength={9} value={det.routingNumber} onChange={e => d({ type: "SET_DETAILS", details: { routingNumber: e.target.value.replace(/\D/g, "") } })} />
                        {det.routingNumber.length === 9 && !validateRouting(det.routingNumber) && (
                          <p className="text-xs text-red-500 mt-1">Invalid routing number — check digits don't pass ABA checksum</p>
                        )}
                        {det.routingNumber.length === 9 && validateRouting(det.routingNumber) && (
                          <p className="text-xs text-green-600 mt-1 flex items-center gap-1"><Check size={12} /> Valid routing number</p>
                        )}
                      </div>
                      <div>
                        <FieldLabel>Account Number</FieldLabel>
                        <Input className="h-11 rounded-xl" placeholder="Receiving account number" value={det.accountNumber} onChange={e => d({ type: "SET_DETAILS", details: { accountNumber: e.target.value } })} />
                      </div>
                      <div>
                        <FieldLabel>Beneficiary Name</FieldLabel>
                        <Input className="h-11 rounded-xl" placeholder="Name on receiving account" value={det.beneficiaryName} onChange={e => d({ type: "SET_DETAILS", details: { beneficiaryName: e.target.value } })} />
                      </div>
                    </div>
                  )}

                  {/* IRA distribution fields */}
                  {det.movementType === "ach-distribution" && det.fromAccount && isIra && (
                    <div className="bg-amber-50 rounded-2xl p-5 space-y-4 border border-amber-200/60">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Shield size={16} className="text-amber-600" />
                          <p className="text-xs uppercase tracking-wider text-amber-600 font-semibold">IRA Distribution — Tax Withholding</p>
                        </div>
                        <button onClick={() => setCalcMode(m => m === "gross-to-net" ? "net-to-gross" : "gross-to-net")}
                          className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-lg bg-amber-100 text-amber-700 hover:bg-amber-200 transition-colors font-medium">
                          <ArrowUpDown size={10} /> {calcMode === "gross-to-net" ? "Gross → Net" : "Net → Gross"}
                        </button>
                      </div>
                      <div>
                        <FieldLabel>Distribution Reason</FieldLabel>
                        <SelectField value={det.distributionReason} onChange={v => d({ type: "SET_DETAILS", details: { distributionReason: v } })} options={["", ...IRA_DISTRIBUTION_REASONS]} labels={["Select reason...", ...IRA_DISTRIBUTION_REASONS]} />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <FieldLabel>Federal Withholding %</FieldLabel>
                          <Input type="number" min="0" max="100" className="h-11 rounded-xl" value={det.federalWithholding} onChange={e => d({ type: "SET_DETAILS", details: { federalWithholding: e.target.value } })} />
                        </div>
                        <div>
                          <FieldLabel>State Withholding %</FieldLabel>
                          <Input type="number" min="0" max="100" className="h-11 rounded-xl" value={det.stateWithholding} onChange={e => d({ type: "SET_DETAILS", details: { stateWithholding: e.target.value } })} />
                        </div>
                      </div>
                      {Number(det.stateWithholding) > 0 && (
                        <div>
                          <FieldLabel>Withholding State</FieldLabel>
                          <Input className="h-11 rounded-xl" placeholder="e.g. CA, NY" maxLength={2} value={det.withholdingState} onChange={e => d({ type: "SET_DETAILS", details: { withholdingState: e.target.value.toUpperCase() } })} />
                        </div>
                      )}
                      {amountNum > 0 && (
                        <div className="bg-white rounded-xl p-3 space-y-1 text-sm">
                          {(() => {
                            const wh = calcMode === "gross-to-net"
                              ? computeWithholding(amountNum, Number(det.federalWithholding), Number(det.stateWithholding))
                              : computeGrossFromNet(amountNum, Number(det.federalWithholding), Number(det.stateWithholding));
                            return (
                              <>
                                {calcMode === "net-to-gross" && (
                                  <div className="flex justify-between text-[10px] text-amber-600 pb-1 mb-1 border-b border-amber-100">
                                    <span>Desired net amount</span><span className="font-medium">${amountNum.toLocaleString()}</span>
                                  </div>
                                )}
                                <div className="flex justify-between"><span className="text-slate-500">Gross distribution</span><span className="font-medium">${wh.gross.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span className="text-slate-500">Federal tax ({det.federalWithholding}%)</span><span className="text-red-600">-${wh.fedTax.toLocaleString()}</span></div>
                                {wh.stateTax > 0 && <div className="flex justify-between"><span className="text-slate-500">State tax ({det.stateWithholding}%)</span><span className="text-red-600">-${wh.stateTax.toLocaleString()}</span></div>}
                                <div className="flex justify-between pt-1 border-t border-slate-100"><span className="text-slate-700 font-medium">Net to client</span><span className="font-semibold text-green-700">${wh.net.toLocaleString()}</span></div>
                              </>
                            );
                          })()}
                        </div>
                      )}
                      {det.distributionReason === "Early Distribution (under 59½)" && (
                        <p className="text-xs text-red-600 flex items-center gap-1"><AlertTriangle size={12} /> Subject to 10% early withdrawal penalty unless an exception applies (IRS Form 5329)</p>
                      )}
                    </div>
                  )}

                  {/* Journal type */}
                  {det.movementType === "journal" && (
                    <div>
                      <FieldLabel>Journal Type</FieldLabel>
                      <SelectField value={det.journalType} onChange={v => d({ type: "SET_DETAILS", details: { journalType: v } })} options={["full", "partial"]} labels={["Full Transfer", "Partial Transfer"]} />
                    </div>
                  )}

                  {/* Memo */}
                  <div>
                    <FieldLabel>Memo / Notes (optional)</FieldLabel>
                    <Input className="h-11 rounded-xl" placeholder="Internal reference or instructions" value={det.memo} onChange={e => d({ type: "SET_DETAILS", details: { memo: e.target.value } })} />
                  </div>
                </div>

                <ContinueBtn onClick={() => d({ type: "SET_STEP", step: "review" })} disabled={!detailsValid} label="Review" />
              </div>
            )}

            {/* ── Review ── */}
            {state.step === "review" && typeInfo && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Review & Submit</h2>
                <p className="text-slate-400 mb-6">{familyName} Household — confirm details before submitting.</p>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4 mb-6">
                  <div className="flex items-center gap-3 pb-3 border-b border-slate-100">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">{typeInfo.icon}</div>
                    <div>
                      <p className="font-medium text-slate-900">{typeInfo.label}</p>
                      <p className="text-xs text-slate-400">{custodian.shortName} — {familyName}</p>
                    </div>
                    <p className="ml-auto text-xl font-semibold text-slate-900">${Number(det.amount).toLocaleString()}</p>
                  </div>

                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-slate-400 text-xs">From</span><p className="font-medium text-slate-700">{det.fromAccount}</p></div>
                    {det.toAccount && <div><span className="text-slate-400 text-xs">To</span><p className="font-medium text-slate-700">{det.toAccount}</p></div>}
                  </div>

                  {det.movementType === "wire" && (
                    <div className="bg-slate-50 rounded-xl p-4 space-y-2 text-sm">
                      <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold">Wire Details</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div><span className="text-slate-400 text-xs">Bank</span><p className="font-medium text-slate-700">{det.receivingBank}</p></div>
                        <div><span className="text-slate-400 text-xs">Routing</span><p className="font-medium text-slate-700">{det.routingNumber}</p></div>
                        <div><span className="text-slate-400 text-xs">Account</span><p className="font-medium text-slate-700">{det.accountNumber}</p></div>
                        <div><span className="text-slate-400 text-xs">Beneficiary</span><p className="font-medium text-slate-700">{det.beneficiaryName}</p></div>
                      </div>
                    </div>
                  )}

                  {det.movementType === "ach-distribution" && isIra && (
                    <div className="bg-amber-50 rounded-xl p-4 space-y-2 text-sm border border-amber-200/60">
                      <p className="text-xs uppercase tracking-wider text-amber-600 font-semibold">Tax Withholding</p>
                      {(() => {
                        const wh = computeWithholding(amountNum, Number(det.federalWithholding), Number(det.stateWithholding));
                        return (
                          <div className="space-y-1">
                            <div className="flex justify-between"><span className="text-slate-500">Reason</span><span className="font-medium">{det.distributionReason}</span></div>
                            <div className="flex justify-between"><span className="text-slate-500">Federal</span><span className="text-red-600">-${wh.fedTax.toLocaleString()}</span></div>
                            {wh.stateTax > 0 && <div className="flex justify-between"><span className="text-slate-500">State ({det.withholdingState})</span><span className="text-red-600">-${wh.stateTax.toLocaleString()}</span></div>}
                            <div className="flex justify-between font-medium pt-1 border-t border-amber-200"><span>Net to client</span><span className="text-green-700">${wh.net.toLocaleString()}</span></div>
                          </div>
                        );
                      })()}
                    </div>
                  )}

                  {det.memo && <div className="text-sm"><span className="text-slate-400 text-xs">Memo</span><p className="text-slate-700">{det.memo}</p></div>}
                </div>

                {amountNum >= 50000 && (
                  <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 mb-4 flex items-start gap-3">
                    <AlertTriangle size={18} className="text-amber-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-amber-900">Large Transaction Review</p>
                      <p className="text-xs text-amber-700/70">Transactions over $50,000 are flagged for supervisor review per firm policy.</p>
                    </div>
                  </div>
                )}

                {det.movementType === "wire" && !showSaveTemplate && (
                  <button onClick={() => setShowSaveTemplate(true)} className="w-full mb-3 flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-500 hover:bg-slate-50 transition-colors">
                    <BookmarkPlus size={14} /> Save wire details as template
                  </button>
                )}
                {showSaveTemplate && (
                  <div className="mb-3 bg-slate-50 rounded-xl p-4 space-y-3 animate-fade-in">
                    <p className="text-xs font-medium text-slate-600">Template Name</p>
                    <div className="flex gap-2">
                      <Input className="h-9 rounded-lg text-sm flex-1" placeholder={`e.g. ${det.beneficiaryName || "Recipient"}`} value={templateName} onChange={e => setTemplateName(e.target.value)} autoFocus />
                      <button onClick={() => {
                        if (!templateName.trim()) return;
                        const t: WireTemplate = { id: Date.now().toString(), name: templateName.trim(), receivingBank: det.receivingBank, routingNumber: det.routingNumber, accountNumber: det.accountNumber, beneficiaryName: det.beneficiaryName };
                        const updated = [...wireTemplates, t];
                        setWireTemplates(updated); saveWireTemplates(updated);
                        setShowSaveTemplate(false); setTemplateName("");
                      }} disabled={!templateName.trim()} className="h-9 px-3 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 disabled:opacity-30 transition-colors">Save</button>
                      <button onClick={() => { setShowSaveTemplate(false); setTemplateName(""); }} className="h-9 px-3 rounded-lg border border-slate-200 text-xs text-slate-400 hover:bg-slate-50 transition-colors">Cancel</button>
                    </div>
                  </div>
                )}

                <ContinueBtn onClick={submit} label={`Submit ${typeInfo.label}`} />
                <button onClick={() => d({ type: "SET_STEP", step: "details" })} className="mt-3 w-full text-center text-sm text-slate-400 hover:text-slate-600">Edit Details</button>
              </div>
            )}

            {/* ── Submitting ── */}
            {state.step === "submitting" && (
              <div className="animate-fade-in text-center pt-16">
                <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
                <p className="text-slate-400">Recording money movement in Salesforce...</p>
              </div>
            )}

            {/* ── Complete ── */}
            {state.step === "complete" && (
              <div className="animate-fade-in text-center pt-8">
                <div className="w-20 h-20 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto mb-6">
                  <DollarSign size={36} strokeWidth={2} />
                </div>
                <h2 className="text-3xl font-light text-slate-900 mb-3">Movement Submitted</h2>
                <p className="text-lg text-slate-400 mb-1">{typeInfo?.label} — ${Number(det.amount).toLocaleString()}</p>
                <p className="text-base text-slate-400 mb-8">{familyName} Household — recorded in Salesforce</p>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left max-w-md mx-auto mb-8">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-4 text-center">Audit Trail</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-500">Type</span>
                      <span className="font-medium text-slate-900">{typeInfo?.label}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-500">Amount</span>
                      <span className="font-medium text-slate-900">${Number(det.amount).toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-500">From</span>
                      <span className="font-medium text-slate-900">{det.fromAccount}</span>
                    </div>
                    {det.movementType === "ach-distribution" && isIra && (
                      <div className="flex justify-between py-2 border-b border-slate-50">
                        <span className="text-slate-500">Net after withholding</span>
                        <span className="font-medium text-green-700">${computeWithholding(amountNum, Number(det.federalWithholding), Number(det.stateWithholding)).net.toLocaleString()}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Custodian</span>
                      <span className="font-medium text-slate-900">{custodian.shortName}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 justify-center">
                  {onNavigate && state.selectedHousehold && (
                    <button onClick={() => onNavigate("family" as Screen, { householdId: state.selectedHousehold!.id, familyName })} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">View Family</button>
                  )}
                  {state.householdUrl && <a href={state.householdUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">Salesforce <ExternalLink size={14} /></a>}
                  <button onClick={() => d({ type: "RESET" })} className="px-5 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm">New Movement</button>
                  <button onClick={() => { d({ type: "RESET" }); onExit(); }} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-400 font-medium hover:bg-slate-50 transition-colors text-sm">Home</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Right pane — evidence */}
      <div className={`${state.showRightPane ? "fixed inset-0 z-50 bg-white" : "hidden"} lg:block lg:static lg:w-[30%] border-l border-slate-200 bg-white flex flex-col print:hidden`}>
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-slate-400">Activity Log</p>
          <button onClick={() => d({ type: "SET_SHOW_RIGHT_PANE", value: false })} aria-label="Close panel" className="lg:hidden text-slate-400 hover:text-slate-600">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {state.evidence.length === 0 ? (
            <div className="text-center mt-12"><DollarSign size={28} className="mx-auto text-slate-200 mb-3" /><p className="text-sm text-slate-400">Movement activity will appear here</p></div>
          ) : (
            <div className="space-y-1.5">
              {state.evidence.map((e, i) => (
                <div key={i} className="flex items-start gap-2 animate-fade-in">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block truncate">{e.label} &rarr;</a> : <p className="text-xs text-slate-500 truncate">{e.label}</p>}
                    {e.timestamp && <p className="text-[10px] text-slate-300">{e.timestamp}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
