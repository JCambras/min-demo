"use client";
import { Input } from "@/components/ui/input";
import { ClientReviewCard } from "@/components/shared/ClientReviewCard";
import { Plus, Pencil, Trash2, Check, ExternalLink, Search, Clock, Loader2 } from "lucide-react";
import { Choice, ContinueBtn, BypassLink, FieldLabel, SelectField } from "@/components/shared/FormControls";
import { ClientForm } from "@/components/shared/ClientForm";
import { ProgressSteps } from "@/components/shared/ProgressSteps";
import { RightPane } from "@/components/shared/RightPane";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { WhyBubble } from "@/components/shared/WhyBubble";
import { useFlowState } from "./useFlowState";
import { isClientValid, missingFields, fmtDollar, docsFor, isValidEmail } from "@/lib/format";
import { INTENT_CHIPS, INDIV_TYPES, JOINT_TYPES, BROKERAGES, RELATIONSHIPS, STEP_LABELS } from "@/lib/constants";
import { emptyClient } from "@/lib/types";

export function FlowScreen({ onExit, initialClient }: {
  onExit: () => void;
  initialClient?: { p1: import("@/lib/types").ClientInfo; p2: import("@/lib/types").ClientInfo; hasP2: boolean };
}) {
  const flow = useFlowState(initialClient);
  const { state, dispatch: d, p1Name, p2Name, fam, jLabel, progressPct, curFund, hasAcct, acctsFor, totalDocs, estMinutes, genStepLabels, householdUrl, goBack, nextFund, nextP1, nextP2, nextJoint, executeGen } = flow;

  const combinedResults = state.sfSearchResults;

  const handleBack = () => {
    if (state.step === "context") { d({ type: "RESET" }); onExit(); }
    else goBack();
  };

  const isTOAValid = () => {
    if (!curFund) return true;
    if (curFund.funding === "In-kind TOA" || curFund.funding === "Cash TOA") return !!(curFund.purpose && curFund.amount && curFund.fundingAmount);
    return true;
  };

  return (
    <div className="flex h-screen bg-[#fafafa]">
      <div className="w-full lg:w-[70%] flex flex-col">
        <FlowHeader title="Open Accounts" familyName={fam} stepLabel={STEP_LABELS[state.step] || ""} progressPct={progressPct} onBack={handleBack} onShowPane={() => d({ type: "SET_SHOW_RIGHT_PANE", value: true })} hasIndicator={state.accounts.length > 0 || state.evidence.length > 0} />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-4 pb-16">
          <div className="max-w-xl w-full mx-auto">

            {state.step === "context" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">What are we doing today?</h2>
                <p className="text-slate-400 mb-8">Select all that apply.</p>
                <div className="grid grid-cols-2 gap-3">
                  {INTENT_CHIPS.map(c => <Choice key={c} label={c} selected={state.selectedIntents.includes(c)} onClick={() => d({ type: "TOGGLE_INTENT", intent: c })} large />)}
                </div>
                {state.selectedIntents.includes("Something else") && (
                  <textarea className="mt-4 w-full h-24 p-4 text-base rounded-2xl border-2 border-slate-200 bg-white text-slate-800 resize-none focus:outline-none focus:border-slate-400 placeholder:text-slate-300" placeholder="Describe what else is needed..." value={state.freeText} onChange={e => d({ type: "SET_FREE_TEXT", value: e.target.value })} />
                )}
                <ContinueBtn onClick={() => d({ type: "SET_STEP", step: "client-type" })} disabled={state.selectedIntents.length === 0} />
              </div>
            )}

            {state.step === "client-type" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Who is this for?</h2>
                <p className="text-slate-400 mb-8">Are we working with someone new or an existing client?</p>
                <div className="space-y-3">
                  <Choice label="New Client" subtitle="Enter all client information from scratch" selected={state.clientType === "new"} onClick={() => d({ type: "SET_CLIENT_TYPE", value: "new" })} large />
                  <Choice label="Existing Client" subtitle="Search your CRM and pull up their record" selected={state.clientType === "existing"} onClick={() => d({ type: "SET_CLIENT_TYPE", value: "existing" })} large />
                </div>
                <ContinueBtn onClick={() => d({ type: "SET_STEP", step: state.clientType === "existing" ? "search-existing" : "enter-client-p1" })} disabled={!state.clientType} />
              </div>
            )}

            {state.step === "search-existing" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Find your client</h2>
                <p className="text-slate-400 mb-8">Search by name, email, or household.</p>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input className="h-14 text-lg rounded-xl pl-11" placeholder="Start typing..." value={state.searchQuery} onChange={e => d({ type: "SET_SEARCH_QUERY", value: e.target.value })} autoFocus />
                  {state.isSearching && <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                </div>
                {state.searchQuery.length >= 2 && (
                  <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {combinedResults.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-slate-400 text-center">{state.isSearching ? "Searching Salesforce..." : `No clients found matching \u201c${state.searchQuery}\u201d`}</p>
                    ) : combinedResults.map((c, i) => (
                      <button key={i} onClick={() => { d({ type: "SET_P1", value: { ...emptyClient(), firstName: c.firstName, lastName: c.lastName, email: c.email, phone: c.phone } }); d({ type: "SET_STEP", step: "enter-client-p1" }); }}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-800">{c.firstName} {c.lastName}</p>
                          <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-100 text-blue-600">Salesforce</span>
                        </div>
                        <p className="text-sm text-slate-400">{c.email} · {c.household}</p>
                      </button>
                    ))}
                  </div>
                )}
                <BypassLink onClick={() => { d({ type: "SET_CLIENT_TYPE", value: "new" }); d({ type: "SET_STEP", step: "enter-client-p1" }); }} label="Client not found? Enter manually →" />
              </div>
            )}

            {state.step === "enter-client-p1" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Primary client details</h2>
                <p className="text-slate-400 mb-6">All fields marked with <span className="text-red-400">*</span> are required for account opening.</p>
                <ClientForm client={state.p1} setClient={v => d({ type: "SET_P1", value: v })} showSSN={state.showP1SSN} setShowSSN={v => d({ type: "SET_SHOW_P1_SSN", value: v })} label="Primary Client" />
                <div className="mt-8 pt-6 border-t border-slate-100">
                  {!state.hasP2 ? (
                    <button onClick={() => d({ type: "SET_HAS_P2", value: true })} className="group w-full flex items-center gap-3 p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-400 hover:border-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-all">
                      <Plus size={20} /> <span className="font-medium">Add a second person (spouse, partner)</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-sm font-medium text-slate-500">Second person added</p>
                      <button onClick={() => { d({ type: "SET_HAS_P2", value: false }); d({ type: "SET_P2", value: emptyClient() }); d({ type: "SET_HAS_JOINT", value: false }); }} className="text-sm text-red-400 hover:text-red-600">Remove</button>
                    </div>
                  )}
                  {state.hasP2 && state.p1.firstName && state.p2.firstName && <Choice label={`Also open joint accounts for ${state.p1.firstName} & ${state.p2.firstName}`} selected={state.hasJoint} onClick={() => d({ type: "SET_HAS_JOINT", value: !state.hasJoint })} />}
                </div>
                {!isClientValid(state.p1) && missingFields(state.p1).length > 0 && missingFields(state.p1).length <= 5 && (
                  <p className="text-xs text-amber-500 mt-4 text-center">Missing: {missingFields(state.p1).join(", ")}</p>
                )}
                <ContinueBtn onClick={() => d({ type: "SET_STEP", step: state.hasP2 ? "enter-client-p2" : "select-accounts-p1" })} disabled={!isClientValid(state.p1)} label={state.hasP2 ? "Continue to Second Client" : "Continue to Accounts"} />
              </div>
            )}

            {state.step === "enter-client-p2" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Second client details</h2>
                <p className="text-slate-400 mb-6">All fields marked with <span className="text-red-400">*</span> are required.</p>
                <ClientForm client={state.p2} setClient={v => d({ type: "SET_P2", value: v })} showSSN={state.showP2SSN} setShowSSN={v => d({ type: "SET_SHOW_P2_SSN", value: v })} label="Second Client" autofillFrom={state.p1} />
                {!isClientValid(state.p2) && missingFields(state.p2).length > 0 && missingFields(state.p2).length <= 5 && (
                  <p className="text-xs text-amber-500 mt-4 text-center">Missing: {missingFields(state.p2).join(", ")}</p>
                )}
                <ContinueBtn onClick={() => d({ type: "SET_STEP", step: "select-accounts-p1" })} disabled={!isClientValid(state.p2)} />
                <BypassLink onClick={() => { d({ type: "SET_HAS_P2", value: false }); d({ type: "SET_P2", value: emptyClient() }); d({ type: "SET_HAS_JOINT", value: false }); d({ type: "SET_STEP", step: "select-accounts-p1" }); }} label="Remove second client — continue with individual accounts only" />
              </div>
            )}

            {state.step === "select-accounts-p1" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Accounts for {state.p1.firstName}</h2>
                <p className="text-slate-400 mb-8">Select one or more account types.</p>
                <div className="grid grid-cols-2 gap-3">{INDIV_TYPES.map(t => <Choice key={t} label={t} selected={hasAcct(p1Name, t)} onClick={() => d({ type: "ADD_ACCOUNT", owner: p1Name, acctType: t, signers: 1 })} large />)}</div>
                {acctsFor(p1Name).length > 0 && <p className="mt-4 text-sm text-slate-500 text-center">{acctsFor(p1Name).length} account{acctsFor(p1Name).length > 1 ? "s" : ""} selected</p>}
                <ContinueBtn onClick={nextP1} disabled={acctsFor(p1Name).length === 0} />
              </div>
            )}

            {state.step === "select-accounts-p2" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Accounts for {state.p2.firstName}</h2>
                <p className="text-slate-400 mb-8">Select one or more account types.</p>
                <div className="grid grid-cols-2 gap-3">{INDIV_TYPES.map(t => <Choice key={t} label={t} selected={hasAcct(p2Name, t)} onClick={() => d({ type: "ADD_ACCOUNT", owner: p2Name, acctType: t, signers: 1 })} large />)}</div>
                {acctsFor(p2Name).length > 0 && <p className="mt-4 text-sm text-slate-500 text-center">{acctsFor(p2Name).length} account{acctsFor(p2Name).length > 1 ? "s" : ""} selected</p>}
                <ContinueBtn onClick={nextP2} disabled={acctsFor(p2Name).length === 0} />
              </div>
            )}

            {state.step === "select-accounts-joint" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Joint accounts</h2>
                <p className="text-slate-400 mb-8">For {state.p1.firstName} & {state.p2.firstName}. Both signatures required.</p>
                <div className="space-y-3">{JOINT_TYPES.map(t => <Choice key={t.abbr} label={t.label} subtitle={t.abbr} selected={hasAcct(jLabel, t.abbr)} onClick={() => d({ type: "ADD_ACCOUNT", owner: jLabel, acctType: t.abbr, signers: 2 })} large />)}</div>
                <ContinueBtn onClick={nextJoint} disabled={acctsFor(jLabel).length === 0} />
              </div>
            )}

            {state.step === "funding" && curFund && (
              <div className="animate-fade-in" key={curFund.id}>
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm text-slate-400">Account {state.fundIdx + 1} of {state.accounts.length}</p>
                  <div className="flex gap-1">{state.accounts.map((_, i) => <div key={i} className={`w-2 h-2 rounded-full transition-all ${i === state.fundIdx ? "bg-slate-900" : i < state.fundIdx ? "bg-green-400" : "bg-slate-200"}`} />)}</div>
                </div>
                <h2 className="text-3xl font-light text-slate-900 mb-2">{curFund.owner}&rsquo;s {curFund.type}</h2>
                <p className="text-slate-400 mb-8">How will this account be funded?</p>
                <div className="space-y-3">
                  {["Rollover", "In-kind TOA", "Cash TOA", "New Money", "None"].map(f => (
                    <Choice key={f} label={f === "Rollover" ? "Rollover" : f === "In-kind TOA" ? "Transfer of Assets — In-Kind" : f === "Cash TOA" ? "Transfer of Assets — Cash" : f === "New Money" ? "New Money / Contribution" : "None — Fund Later"}
                      subtitle={f === "Rollover" ? "From 401(k), TSP, 403(b), pension" : f === "In-kind TOA" ? "Move existing positions from another brokerage" : f === "Cash TOA" ? "Liquidate and transfer cash" : f === "New Money" ? "Direct contribution or deposit" : "No funding at this time"}
                      selected={curFund.funding === f} onClick={() => d({ type: "UPDATE_ACCOUNT", id: curFund.id, update: { funding: f } })} large />
                  ))}
                </div>
                {curFund.funding === "Rollover" && (
                  <div className="mt-6 space-y-4 animate-fade-in">
                    <div><FieldLabel label="Approximate amount" required /><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span><Input placeholder="150,000" className="h-12 rounded-xl pl-7" value={curFund.fundingAmount || ""} onChange={e => d({ type: "UPDATE_ACCOUNT", id: curFund.id, update: { fundingAmount: fmtDollar(e.target.value) } })} /></div></div>
                    <div><FieldLabel label="Allocation" /><div className="grid grid-cols-3 gap-3">{["Equity", "Fixed Income", "Both"].map(a => <Choice key={a} label={a} selected={curFund.allocation === a} onClick={() => d({ type: "UPDATE_ACCOUNT", id: curFund.id, update: { allocation: a } })} />)}</div></div>
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4"><p className="text-sm text-amber-800 font-medium">PTE documentation required</p><p className="text-sm text-amber-600 mt-1">Rollover Recommendation + PTE form will be auto-generated.</p><WhyBubble reason="When an advisor recommends rolling assets from a 401(k) or employer plan into an IRA, the DOL requires documentation that the recommendation is in the client's best interest. Min auto-generates both the Rollover Recommendation Form and the PTE 2020-02 exemption form." regulation="DOL Prohibited Transaction Exemption 2020-02" /></div>
                  </div>
                )}
                {curFund.funding === "New Money" && (
                  <div className="mt-6 space-y-4 animate-fade-in">
                    <div><FieldLabel label="Contribution amount" /><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span><Input placeholder="7,000" className="h-12 rounded-xl pl-7" value={curFund.fundingAmount || ""} onChange={e => d({ type: "UPDATE_ACCOUNT", id: curFund.id, update: { fundingAmount: fmtDollar(e.target.value) } })} /></div></div>
                    {(curFund.type === "IRA" || curFund.type === "Roth IRA") && (
                      <>
                        <div><FieldLabel label="Contribution year" /><div className="grid grid-cols-2 gap-3">{[String(new Date().getFullYear()), String(new Date().getFullYear() - 1)].map(y => <Choice key={y} label={y} selected={curFund.allocation === y} onClick={() => d({ type: "UPDATE_ACCOUNT", id: curFund.id, update: { allocation: y } })} />)}</div></div>
                        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                          <p className="text-sm text-blue-800 font-medium">IRA contribution limits</p>
                          <p className="text-sm text-blue-600 mt-1">{new Date().getFullYear()} limit: $7,000 ($8,000 if age 50+). Min will flag over-contributions.</p>
                          <WhyBubble reason="The IRS sets annual contribution limits for Traditional and Roth IRAs. For 2025, the limit is $7,000 per person ($8,000 for those 50+). Min tracks the contribution amount and year to help avoid excess contribution penalties." regulation="IRC §219(b)(5), IRC §408A(c)(2)" />
                        </div>
                      </>
                    )}
                  </div>
                )}
                {(curFund.funding === "In-kind TOA" || curFund.funding === "Cash TOA") && (
                  <div className="mt-6 space-y-4 animate-fade-in">
                    <div className="relative">
                      <FieldLabel label="Source institution" required />
                      <Input placeholder="Start typing..." className="h-12 rounded-xl" value={curFund.purpose || ""}
                        onChange={e => { d({ type: "UPDATE_ACCOUNT", id: curFund.id, update: { purpose: e.target.value } }); d({ type: "SET_SHOW_BROKER_DD", value: true }); }}
                        onFocus={() => curFund.purpose && d({ type: "SET_SHOW_BROKER_DD", value: true })}
                        onBlur={() => setTimeout(() => d({ type: "SET_SHOW_BROKER_DD", value: false }), 200)} />
                      {state.showBrokerDD && curFund.purpose && curFund.purpose.length >= 1 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden max-h-48 overflow-y-auto">
                          {BROKERAGES.filter(b => b.toLowerCase().includes((curFund.purpose || "").toLowerCase())).map((b, i) => (
                            <button key={i} onMouseDown={e => e.preventDefault()} onClick={() => { d({ type: "UPDATE_ACCOUNT", id: curFund.id, update: { purpose: b } }); d({ type: "SET_SHOW_BROKER_DD", value: false }); }}
                              className="w-full text-left px-4 py-2.5 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0 text-sm text-slate-800">{b}</button>
                          ))}
                          {BROKERAGES.filter(b => b.toLowerCase().includes((curFund.purpose || "").toLowerCase())).length === 0 && (
                            <p className="px-4 py-2.5 text-sm text-slate-400">No match — using custom entry</p>
                          )}
                        </div>
                      )}
                    </div>
                    <div><FieldLabel label="Source account number" required /><Input placeholder="Full account number" className="h-12 rounded-xl font-mono" value={curFund.amount || ""} onChange={e => d({ type: "UPDATE_ACCOUNT", id: curFund.id, update: { amount: e.target.value } })} /></div>
                    <div><FieldLabel label="Approximate value" required /><div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">$</span><Input placeholder="250,000" className="h-12 rounded-xl pl-7" value={curFund.fundingAmount || ""} onChange={e => d({ type: "UPDATE_ACCOUNT", id: curFund.id, update: { fundingAmount: fmtDollar(e.target.value) } })} /></div></div>
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4"><p className="text-sm text-blue-800 font-medium">Recent statement required</p><p className="text-sm text-blue-600 mt-1">A recent statement must be on file for TOA processing.</p><WhyBubble reason="The receiving custodian requires a recent account statement from the delivering firm to validate account ownership, verify asset positions, and process the transfer. Statements must typically be within the last 90 days." regulation="FINRA Rule 11870 (ACAT)" /></div>
                  </div>
                )}
                <ContinueBtn onClick={nextFund} disabled={!curFund.funding || ((curFund.funding === "In-kind TOA" || curFund.funding === "Cash TOA") && !isTOAValid())} />
                {(curFund.funding === "In-kind TOA" || curFund.funding === "Cash TOA") && !isTOAValid() && (
                  <BypassLink onClick={nextFund} label="Skip — enter transfer details later" />
                )}
              </div>
            )}

            {state.step === "moneylink" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">ACH Setup</h2>
                <p className="text-slate-400 mb-8">Will we be linking a bank account for ACH transfers?</p>
                {state.setupACH === null && (
                  <div className="space-y-3">
                    <Choice label="Yes, set up ACH now" subtitle="Link a bank account for contributions and distributions" selected={false} onClick={() => d({ type: "SET_SETUP_ACH", value: true })} large />
                    <Choice label="No, skip for now" subtitle="ACH can be set up later" selected={false} onClick={() => { d({ type: "SET_SETUP_ACH", value: false }); d({ type: "SET_STEP", step: "beneficiaries" }); }} large />
                  </div>
                )}
                {state.setupACH === true && (
                  <div className="space-y-5 animate-fade-in">
                    <div className="relative">
                      <FieldLabel label="Routing number" required />
                      <Input placeholder="Start typing..." maxLength={4} className="h-14 text-lg rounded-xl font-mono" value={state.bankLast4}
                        onChange={e => d({ type: "SET_BANK_LAST4", value: e.target.value.replace(/\D/g, "") })} onFocus={() => state.routingMatches.length > 0 && d({ type: "SET_SHOW_ROUTING_DD", value: true })} />
                      {state.showRoutingDD && state.routingMatches.length > 0 && (
                        <div className="absolute z-10 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden animate-fade-in">
                          {state.routingMatches.map((m, i) => (
                            <button key={i} onClick={() => { d({ type: "SET_MATCHED_BANK", value: m.name }); d({ type: "SET_BANK_LAST4", value: m.full.slice(-4) }); d({ type: "SET_SHOW_ROUTING_DD", value: false }); }}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                              <p className="font-medium text-slate-800">{m.name}</p><p className="text-sm text-slate-400 font-mono">{m.full}</p>
                            </button>
                          ))}
                        </div>
                      )}
                      {state.matchedBank && <div className="mt-3 bg-green-50 border border-green-200 rounded-xl p-4 animate-fade-in"><p className="text-green-800 font-medium flex items-center gap-2"><Check size={18} /> {state.matchedBank}</p></div>}
                    </div>
                    <div><FieldLabel label="Bank account number" required /><Input placeholder="Enter account number" className="h-14 text-lg rounded-xl font-mono" value={state.bankAcct} onChange={e => d({ type: "SET_BANK_ACCT", value: e.target.value })} /></div>
                    <ContinueBtn onClick={() => d({ type: "SET_STEP", step: "beneficiaries" })} disabled={!state.bankAcct || state.bankLast4.length < 4} />
                  </div>
                )}
              </div>
            )}

            {state.step === "beneficiaries" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Beneficiary Designations</h2>
                <p className="text-slate-400 mb-8">Prefilled from ownership. Tap the pencil to edit, add, or remove.</p>
                <div className="space-y-4">
                  {state.accounts.map(acc => {
                    const surv = acc.type.includes("JTWROS") || acc.type === "Community Property";
                    const ab = state.beneficiaries.filter(b => b.accountId === acc.id);
                    const editing = state.editBene === acc.id;
                    const totalPct = ab.reduce((s, b) => s + b.percentage, 0);
                    return (
                      <div key={acc.id} className={`bg-white border rounded-2xl p-5 transition-all ${!surv && ab.length > 0 && totalPct !== 100 ? "border-amber-300" : "border-slate-200"}`}>
                        <div className="flex items-center justify-between mb-2">
                          <p className="font-medium text-slate-900">{acc.owner}&rsquo;s {acc.type}</p>
                          {!surv && <button onClick={() => d({ type: "SET_EDIT_BENE", value: editing ? null : acc.id })} className={`transition-colors ${editing ? "text-blue-500" : "text-slate-400 hover:text-slate-600"}`}><Pencil size={15} /></button>}
                        </div>
                        {surv ? <div><p className="text-sm text-slate-500">Survivorship rights — no beneficiary needed</p><WhyBubble reason="JTWROS and Community Property accounts pass automatically to the surviving account holder at death. A separate beneficiary designation is not needed and could create conflicting instructions." regulation="UCC Article 6 / State Property Law" compact /></div> : (
                          <div className="space-y-2">
                            {ab.map((b, i) => (
                              <div key={i} className="flex items-center justify-between text-sm py-1.5 border-b border-slate-50 last:border-0">
                                <div className="flex items-center gap-3">
                                  <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${b.beneType === "primary" ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"}`}>{b.beneType === "primary" ? "P" : "C"}</span>
                                  <span className="text-slate-700"><span className="font-medium">{b.name}</span> <span className="text-slate-400">· {b.relationship}</span></span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <span className="text-slate-500 font-medium">{b.percentage}%</span>
                                  {editing && <button onClick={() => d({ type: "REMOVE_BENEFICIARY", accountId: acc.id, name: b.name })} className="text-red-300 hover:text-red-500 ml-1"><Trash2 size={14} /></button>}
                                </div>
                              </div>
                            ))}
                            {ab.length === 0 && <p className="text-sm text-slate-400 italic">No beneficiary — tap edit to add</p>}
                            {ab.length > 0 && totalPct !== 100 && <p className="text-xs text-amber-600 mt-1">Total: {totalPct}% — should equal 100%</p>}
                            {editing && (
                              <div className="mt-3 pt-3 border-t border-slate-100 space-y-3">
                                <p className="text-xs text-slate-500 font-medium uppercase tracking-wider">Add Beneficiary</p>
                                <div className="grid grid-cols-2 gap-2">
                                  <Input placeholder="Full name" className="h-10 text-sm rounded-lg" value={state.newBName} onChange={e => d({ type: "SET_NEW_BNAME", value: e.target.value })} />
                                  <SelectField value={state.newBRel} onChange={v => d({ type: "SET_NEW_BREL", value: v })} options={RELATIONSHIPS} />
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                  <div><FieldLabel label="%" /><Input type="number" placeholder="100" className="h-10 text-sm rounded-lg" value={state.newBPct} onChange={e => d({ type: "SET_NEW_BPCT", value: e.target.value })} /></div>
                                  <div className="col-span-2"><FieldLabel label="Type" /><div className="grid grid-cols-2 gap-2">
                                    <button onClick={() => d({ type: "SET_NEW_BTYPE", value: "primary" })} className={`h-10 rounded-lg text-sm font-medium transition-all ${state.newBType === "primary" ? "bg-green-100 text-green-700 border-2 border-green-300" : "bg-slate-50 text-slate-500 border border-slate-200"}`}>Primary</button>
                                    <button onClick={() => d({ type: "SET_NEW_BTYPE", value: "contingent" })} className={`h-10 rounded-lg text-sm font-medium transition-all ${state.newBType === "contingent" ? "bg-slate-200 text-slate-700 border-2 border-slate-400" : "bg-slate-50 text-slate-500 border border-slate-200"}`}>Contingent</button>
                                  </div></div>
                                </div>
                                <button onClick={() => { if (state.newBName) d({ type: "ADD_BENEFICIARY", bene: { accountId: acc.id, name: state.newBName, relationship: state.newBRel, percentage: parseInt(state.newBPct) || 100, beneType: state.newBType } }); }} disabled={!state.newBName} className="text-sm text-blue-600 hover:text-blue-800 font-medium disabled:text-slate-300">+ Add beneficiary</button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                <ContinueBtn onClick={() => d({ type: "SET_STEP", step: "review" })} label="Looks Good" />
              </div>
            )}

            {state.step === "review" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Review & Generate</h2>
                <p className="text-slate-400 mb-8">Tap any section to go back and edit.</p>
                <div className="space-y-4">
                  <ClientReviewCard client={state.p1} label={`Client${state.hasP2 ? "s" : ""}`} onClick={() => d({ type: "SET_STEP", step: "enter-client-p1" })} showFinancials />
                  {state.hasP2 && p2Name && (
                    <ClientReviewCard client={state.p2} label="Second Client" onClick={() => d({ type: "SET_STEP", step: "enter-client-p2" })} />
                  )}
                  <button onClick={() => d({ type: "SET_STEP", step: "select-accounts-p1" })} className="w-full text-left bg-white border border-slate-200 rounded-2xl p-5 hover:border-slate-400 hover:shadow-sm transition-all">
                    <div className="flex items-center justify-between mb-2"><p className="text-xs uppercase tracking-wider text-slate-400">Accounts ({state.accounts.length})</p><Pencil size={14} className="text-slate-300" /></div>
                    {state.accounts.map(a => <div key={a.id} className="flex items-center justify-between py-1.5 text-sm"><span><span className="font-medium text-slate-800">{a.type}</span> <span className="text-slate-400">· {a.owner}</span></span><span className="text-xs text-slate-400">{a.funding ? `${a.funding}${a.fundingAmount ? ` · $${a.fundingAmount}` : ""}` : "—"}</span></div>)}
                  </button>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <div className="flex items-center justify-between mb-3">
                      <p className="text-xs uppercase tracking-wider text-slate-400">Documents ({totalDocs} total)</p>
                      <WhyBubble reason="Min generates the exact documents required for each account type: the custodial application, Form CRS (required by SEC at account opening), the Advisory Business Practices Addendum, and beneficiary forms for accounts without survivorship rights. Additional forms are added for rollovers (PTE), transfers (TOA/LOA), and ACH setup." regulation="SEC Reg BI, FINRA Rules 2111 & 4512, DOL PTE 2020-02" compact />
                    </div>
                    {state.accounts.map(a => <div key={a.id} className="mb-3 last:mb-0"><p className="text-sm font-medium text-slate-700 mb-1">{a.owner}&rsquo;s {a.type}</p><div className="pl-3 space-y-0.5">{docsFor(a, state.setupACH ?? false).map((dd, i) => <p key={i} className="text-xs text-slate-500">· {dd}</p>)}</div></div>)}
                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-sm text-slate-500"><Clock size={14} /> Estimated signing time: ~{estMinutes} minutes</div>
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">Send DocuSign To</p>
                    <Input placeholder="Primary signer email" type="email" className={`h-12 rounded-xl ${(state.signerEmail && !isValidEmail(state.signerEmail)) ? "border-red-300" : ""}`} value={state.signerEmail || state.p1.email} onChange={e => d({ type: "SET_SIGNER_EMAIL", value: e.target.value })} />
                    {state.signerEmail && !isValidEmail(state.signerEmail) && <p className="text-xs text-red-400 mt-1">Enter a valid email address</p>}
                    {state.hasP2 && state.p2.email && <p className="text-sm text-slate-500 mt-2">Also sending to: {state.p2.email}</p>}
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">Follow-up Reminder</p>
                    <div className="flex items-center gap-3"><p className="text-sm text-slate-600">Remind me if not signed in</p>
                      <div className="w-28"><SelectField value={state.followUpDays} onChange={v => d({ type: "SET_FOLLOW_UP_DAYS", value: v })} options={["1", "2", "3", "5", "7"]} /></div>
                      <p className="text-sm text-slate-400">days</p>
                    </div>
                  </div>
                </div>
                <ContinueBtn onClick={executeGen} label="Generate Paperwork & Send" disabled={!isValidEmail(state.signerEmail || state.p1.email)} processing={state.isProcessing} />
              </div>
            )}

            {state.step === "generating" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Writing to Salesforce...</h2>
                <p className="text-slate-400 mb-8">Creating records, generating paperwork, and configuring DocuSign.</p>
                <ProgressSteps steps={genStepLabels} currentStep={state.genStep} />
              </div>
            )}

            {state.step === "complete" && (
              <div className="animate-fade-in text-center pt-8">
                <div className="w-20 h-20 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto mb-6"><Check size={36} strokeWidth={2} /></div>
                <h2 className="text-3xl font-light text-slate-900 mb-3">All done.</h2>
                <p className="text-lg text-slate-400 mb-6">{state.accounts.length} accounts opened for the {fam} household.</p>

                {/* Value summary — the money shot */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left max-w-md mx-auto mb-8">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-4 text-center">What Min just did</p>
                  <div className="grid grid-cols-2 gap-y-3 gap-x-6 text-sm">
                    <div className="flex justify-between col-span-2 py-2 border-b border-slate-50">
                      <span className="text-slate-500">Salesforce records created</span>
                      <span className="font-medium text-slate-900">{1 + (state.hasP2 ? 2 : 1) + state.accounts.length * 2 + 3}</span>
                    </div>
                    <div className="flex justify-between col-span-2 py-2 border-b border-slate-50">
                      <span className="text-slate-500">Compliance documents generated</span>
                      <span className="font-medium text-slate-900">{totalDocs}</span>
                    </div>
                    <div className="flex justify-between col-span-2 py-2 border-b border-slate-50">
                      <span className="text-slate-500">DocuSign envelopes sent</span>
                      <span className="font-medium text-slate-900">{state.accounts.length}</span>
                    </div>
                    <div className="flex justify-between col-span-2 py-2 border-b border-slate-50">
                      <span className="text-slate-500">Sent to</span>
                      <span className="font-medium text-slate-900">{state.signerEmail || state.p1.email}</span>
                    </div>
                    <div className="flex justify-between col-span-2 py-2">
                      <span className="text-slate-500">Follow-up reminder</span>
                      <span className="font-medium text-slate-900">{state.followUpDays} days</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">Typical manual time: ~{state.accounts.length * 25 + 15} minutes</p>
                  </div>
                </div>
                {state.envStatuses.length > 0 && (
                  <div className="text-left max-w-md mx-auto mb-8">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-3 text-center">Envelope Status · Live</p>
                    <div className="space-y-2">
                      {state.envStatuses.map((env, i) => {
                        const s = env.status?.toLowerCase() || "sent";
                        const steps = ["sent", "delivered", "completed"];
                        const idx = steps.indexOf(s);
                        const colors: Record<string, string> = { sent: "bg-blue-500", delivered: "bg-amber-500", completed: "bg-green-500", declined: "bg-red-500", voided: "bg-red-500" };
                        return (
                          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4">
                            <div className="flex items-center justify-between mb-2">
                              <p className="text-sm font-medium text-slate-800">{state.accounts[i]?.type || `Envelope ${i + 1}`}</p>
                              <span className={`text-xs px-2.5 py-1 rounded-full text-white font-medium ${colors[s] || "bg-slate-400"}`}>{s.charAt(0).toUpperCase() + s.slice(1)}</span>
                            </div>
                            <div className="flex gap-1">{steps.map((step, si) => <div key={si} className={`h-1.5 flex-1 rounded-full transition-all duration-500 ${si <= idx ? (s === "completed" ? "bg-green-400" : "bg-blue-400") : "bg-slate-100"}`} />)}</div>
                            <div className="flex justify-between mt-1">{steps.map(step => <span key={step} className="text-[10px] text-slate-300">{step.charAt(0).toUpperCase() + step.slice(1)}</span>)}</div>
                          </div>
                        );
                      })}
                    </div>
                    <p className="text-[10px] text-slate-300 text-center mt-2">Auto-refreshing every 10 seconds</p>
                  </div>
                )}
                <div className="flex gap-3 justify-center">
                  {householdUrl && <a href={householdUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors">View in Salesforce <ExternalLink size={16} /></a>}
                  <button onClick={() => { d({ type: "RESET" }); }} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors">Start New Opening</button>
                  <button onClick={() => { d({ type: "RESET" }); onExit(); }} className="px-6 py-3 rounded-xl border border-slate-200 text-slate-400 font-medium hover:bg-slate-50 transition-colors">Home</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      <RightPane
        showMobile={state.showRightPane}
        onCloseMobile={() => d({ type: "SET_SHOW_RIGHT_PANE", value: false })}
        mode="flow" title="Account Plan"
        p1={state.p1} p2={state.p2} hasP2={state.hasP2}
        selectedIntents={state.selectedIntents} freeText={state.freeText}
        accounts={state.accounts}
        setupACH={state.setupACH} matchedBank={state.matchedBank} bankAcct={state.bankAcct}
        evidence={state.evidence}
      />
    </div>
  );
}
