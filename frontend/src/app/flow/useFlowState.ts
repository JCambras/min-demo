"use client";
import { useReducer, useRef, useEffect, useCallback } from "react";
import type { FlowStep, ClientInfo, AccountRequest, Beneficiary, SFEvidence, SFRefs, EnvStatus, SearchResult } from "@/lib/types";
import { emptyClient } from "@/lib/types";
import { callSF } from "@/lib/salesforce";
import { timestamp, docsFor } from "@/lib/format";
import { FLOW_STEPS_ORDER, ROUTING_DB } from "@/lib/constants";

// ─── State ───────────────────────────────────────────────────────────────────

interface FlowState {
  step: FlowStep;
  selectedIntents: string[];
  freeText: string;
  clientType: "new" | "existing" | null;
  searchQuery: string;
  p1: ClientInfo;
  p2: ClientInfo;
  showP1SSN: boolean;
  showP2SSN: boolean;
  hasP2: boolean;
  hasJoint: boolean;
  accounts: AccountRequest[];
  fundIdx: number;
  setupACH: boolean | null;
  bankLast4: string;
  bankAcct: string;
  matchedBank: string | null;
  routingMatches: { name: string; full: string }[];
  showRoutingDD: boolean;
  showBrokerDD: boolean;
  beneficiaries: Beneficiary[];
  editBene: string | null;
  newBName: string;
  newBRel: string;
  newBPct: string;
  newBType: "primary" | "contingent";
  signerEmail: string;
  followUpDays: string;
  isProcessing: boolean;
  evidence: SFEvidence[];
  genStep: number;
  envStatuses: EnvStatus[];
  sfSearchResults: SearchResult[];
  isSearching: boolean;
  showRightPane: boolean;
}

const initialState: FlowState = {
  step: "context",
  selectedIntents: [],
  freeText: "",
  clientType: null,
  searchQuery: "",
  p1: emptyClient(),
  p2: emptyClient(),
  showP1SSN: false,
  showP2SSN: false,
  hasP2: false,
  hasJoint: false,
  accounts: [],
  fundIdx: 0,
  setupACH: null,
  bankLast4: "",
  bankAcct: "",
  matchedBank: null,
  routingMatches: [],
  showRoutingDD: false,
  showBrokerDD: false,
  beneficiaries: [],
  editBene: null,
  newBName: "",
  newBRel: "Spouse",
  newBPct: "100",
  newBType: "primary",
  signerEmail: "",
  followUpDays: "3",
  isProcessing: false,
  evidence: [],
  genStep: 0,
  envStatuses: [],
  sfSearchResults: [],
  isSearching: false,
  showRightPane: false,
};

// ─── Actions ─────────────────────────────────────────────────────────────────

type FlowAction =
  | { type: "SET_STEP"; step: FlowStep }
  | { type: "SET_P1"; value: ClientInfo }
  | { type: "SET_P2"; value: ClientInfo }
  | { type: "TOGGLE_INTENT"; intent: string }
  | { type: "ADD_ACCOUNT"; owner: string; acctType: string; signers: number }
  | { type: "UPDATE_ACCOUNT"; id: string; update: Partial<AccountRequest> }
  | { type: "SET_BENEFICIARIES"; value: Beneficiary[] }
  | { type: "ADD_BENEFICIARY"; bene: Beneficiary }
  | { type: "REMOVE_BENEFICIARY"; accountId: string; name: string }
  | { type: "ADD_EVIDENCE"; ev: SFEvidence }
  | { type: "SET_ENV_STATUSES"; statuses: EnvStatus[] }
  | { type: "SET_SF_RESULTS"; results: SearchResult[] }
  // Typed field setters — no `unknown` values
  | { type: "SET_CLIENT_TYPE"; value: "new" | "existing" | null }
  | { type: "SET_SEARCH_QUERY"; value: string }
  | { type: "SET_SHOW_P1_SSN"; value: boolean }
  | { type: "SET_SHOW_P2_SSN"; value: boolean }
  | { type: "SET_HAS_P2"; value: boolean }
  | { type: "SET_HAS_JOINT"; value: boolean }
  | { type: "SET_FUND_IDX"; value: number }
  | { type: "SET_SETUP_ACH"; value: boolean | null }
  | { type: "SET_BANK_LAST4"; value: string }
  | { type: "SET_BANK_ACCT"; value: string }
  | { type: "SET_MATCHED_BANK"; value: string | null }
  | { type: "SET_ROUTING_MATCHES"; value: { name: string; full: string }[] }
  | { type: "SET_SHOW_ROUTING_DD"; value: boolean }
  | { type: "SET_SHOW_BROKER_DD"; value: boolean }
  | { type: "SET_EDIT_BENE"; value: string | null }
  | { type: "SET_NEW_BNAME"; value: string }
  | { type: "SET_NEW_BREL"; value: string }
  | { type: "SET_NEW_BPCT"; value: string }
  | { type: "SET_NEW_BTYPE"; value: "primary" | "contingent" }
  | { type: "SET_SIGNER_EMAIL"; value: string }
  | { type: "SET_FOLLOW_UP_DAYS"; value: string }
  | { type: "SET_IS_PROCESSING"; value: boolean }
  | { type: "SET_GEN_STEP"; value: number }
  | { type: "SET_IS_SEARCHING"; value: boolean }
  | { type: "SET_SHOW_RIGHT_PANE"; value: boolean }
  | { type: "SET_FREE_TEXT"; value: string }
  | { type: "RESET" };

function reducer(state: FlowState, action: FlowAction): FlowState {
  switch (action.type) {
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_P1":
      return { ...state, p1: action.value };
    case "SET_P2":
      return { ...state, p2: action.value };
    case "TOGGLE_INTENT": {
      const has = state.selectedIntents.includes(action.intent);
      return { ...state, selectedIntents: has ? state.selectedIntents.filter(x => x !== action.intent) : [...state.selectedIntents, action.intent] };
    }
    case "ADD_ACCOUNT": {
      const id = `${action.owner}-${action.acctType}`.toLowerCase().replace(/\s/g, "-");
      const exists = state.accounts.find(a => a.id === id);
      return { ...state, accounts: exists ? state.accounts.filter(a => a.id !== id) : [...state.accounts, { id, owner: action.owner, type: action.acctType, signers: action.signers }] };
    }
    case "UPDATE_ACCOUNT":
      return { ...state, accounts: state.accounts.map(a => a.id === action.id ? { ...a, ...action.update } : a) };
    case "SET_BENEFICIARIES":
      return { ...state, beneficiaries: action.value };
    case "ADD_BENEFICIARY":
      return { ...state, beneficiaries: [...state.beneficiaries, action.bene], newBName: "", newBRel: "Spouse", newBPct: "100", newBType: "primary", editBene: null };
    case "REMOVE_BENEFICIARY":
      return { ...state, beneficiaries: state.beneficiaries.filter(b => !(b.accountId === action.accountId && b.name === action.name)) };
    case "ADD_EVIDENCE":
      return { ...state, evidence: [...state.evidence, action.ev] };
    case "SET_ENV_STATUSES":
      return { ...state, envStatuses: action.statuses };
    case "SET_SF_RESULTS":
      return { ...state, sfSearchResults: action.results };
    // Typed field setters
    case "SET_CLIENT_TYPE": return { ...state, clientType: action.value };
    case "SET_SEARCH_QUERY": return { ...state, searchQuery: action.value };
    case "SET_SHOW_P1_SSN": return { ...state, showP1SSN: action.value };
    case "SET_SHOW_P2_SSN": return { ...state, showP2SSN: action.value };
    case "SET_HAS_P2": return { ...state, hasP2: action.value };
    case "SET_HAS_JOINT": return { ...state, hasJoint: action.value };
    case "SET_FUND_IDX": return { ...state, fundIdx: action.value };
    case "SET_SETUP_ACH": return { ...state, setupACH: action.value };
    case "SET_BANK_LAST4": return { ...state, bankLast4: action.value };
    case "SET_BANK_ACCT": return { ...state, bankAcct: action.value };
    case "SET_MATCHED_BANK": return { ...state, matchedBank: action.value };
    case "SET_ROUTING_MATCHES": return { ...state, routingMatches: action.value };
    case "SET_SHOW_ROUTING_DD": return { ...state, showRoutingDD: action.value };
    case "SET_SHOW_BROKER_DD": return { ...state, showBrokerDD: action.value };
    case "SET_EDIT_BENE": return { ...state, editBene: action.value };
    case "SET_NEW_BNAME": return { ...state, newBName: action.value };
    case "SET_NEW_BREL": return { ...state, newBRel: action.value };
    case "SET_NEW_BPCT": return { ...state, newBPct: action.value };
    case "SET_NEW_BTYPE": return { ...state, newBType: action.value };
    case "SET_SIGNER_EMAIL": return { ...state, signerEmail: action.value };
    case "SET_FOLLOW_UP_DAYS": return { ...state, followUpDays: action.value };
    case "SET_IS_PROCESSING": return { ...state, isProcessing: action.value };
    case "SET_GEN_STEP": return { ...state, genStep: action.value };
    case "SET_IS_SEARCHING": return { ...state, isSearching: action.value };
    case "SET_SHOW_RIGHT_PANE": return { ...state, showRightPane: action.value };
    case "SET_FREE_TEXT": return { ...state, freeText: action.value };
    case "RESET":
      return { ...initialState };
    default:
      return state;
  }
}

// ─── Hook ────────────────────────────────────────────────────────────────────

export function useFlowState(initialClient?: { p1: ClientInfo; p2: ClientInfo; hasP2: boolean }) {
  const init: FlowState = initialClient
    ? {
        ...initialState,
        step: "select-accounts-p1" as FlowStep,
        p1: initialClient.p1,
        p2: initialClient.p2,
        hasP2: initialClient.hasP2,
        clientType: "new",
      }
    : initialState;

  const [state, dispatch] = useReducer(reducer, init);
  const sfRef = useRef<SFRefs>({});

  const d = dispatch; // shorthand

  // Derived values
  const p1Name = `${state.p1.firstName} ${state.p1.lastName}`.trim();
  const p2Name = `${state.p2.firstName} ${state.p2.lastName}`.trim();
  const fam = state.p1.lastName || "Client";
  const jLabel = state.p1.firstName && state.p2.firstName ? `${state.p1.firstName} & ${state.p2.firstName}` : "Joint";
  const progressPct = Math.max(0, Math.min(100, ((FLOW_STEPS_ORDER.indexOf(state.step) + 1) / FLOW_STEPS_ORDER.length) * 100));
  const curFund = state.accounts[state.fundIdx];
  const hasAcct = (owner: string, type: string) => state.accounts.some(a => a.id === `${owner}-${type}`.toLowerCase().replace(/\s/g, "-"));
  const acctsFor = (owner: string) => state.accounts.filter(a => a.owner === owner);
  const totalDocs = state.accounts.reduce((n, a) => n + docsFor(a, !!state.setupACH).length, 0);
  const estMinutes = Math.max(3, Math.round(totalDocs * 0.7));

  // Routing number lookup
  useEffect(() => {
    if (state.bankLast4.length >= 2) {
      const m = ROUTING_DB[state.bankLast4] || [];
      d({ type: "SET_ROUTING_MATCHES", value: m });
      d({ type: "SET_SHOW_ROUTING_DD", value: m.length > 0 });
      if (m.length === 1 && state.bankLast4.length === 4) {
        d({ type: "SET_MATCHED_BANK", value: m[0].name });
        d({ type: "SET_SHOW_ROUTING_DD", value: false });
      } else {
        d({ type: "SET_MATCHED_BANK", value: null });
      }
    } else {
      d({ type: "SET_ROUTING_MATCHES", value: [] });
      d({ type: "SET_SHOW_ROUTING_DD", value: false });
      d({ type: "SET_MATCHED_BANK", value: null });
    }
  }, [state.bankLast4]);

  // Auto-populate beneficiaries when entering that step
  useEffect(() => {
    if (state.step === "beneficiaries" && state.beneficiaries.length === 0) {
      const b: Beneficiary[] = [];
      state.accounts.forEach(acc => {
        if (acc.type.includes("JTWROS") || acc.type === "Community Property") return;
        if (state.hasP2) {
          // Married: cross-designate spouse
          const spouse = acc.owner === p2Name ? p1Name : p2Name;
          if (spouse) b.push({ accountId: acc.id, name: spouse, relationship: "Spouse", percentage: 100, beneType: "primary" });
        } else if (state.p1.trustedContactName && state.p1.trustedContactLastName) {
          // Single: use trusted contact as default beneficiary
          const tcName = `${state.p1.trustedContactName} ${state.p1.trustedContactLastName}`;
          const tcRel = state.p1.trustedContactRelationship || "Other";
          b.push({ accountId: acc.id, name: tcName, relationship: tcRel, percentage: 100, beneType: "primary" });
        }
      });
      d({ type: "SET_BENEFICIARIES", value: b });
    }
  }, [state.step]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced SF search
  useEffect(() => {
    if (state.searchQuery.length < 2 || state.step !== "search-existing") {
      d({ type: "SET_SF_RESULTS", results: [] });
      return;
    }
    const timer = setTimeout(async () => {
      d({ type: "SET_IS_SEARCHING", value: true });
      try {
        const res = await callSF("searchContacts", { query: state.searchQuery });
        if (res.success && res.contacts) {
          d({ type: "SET_SF_RESULTS", results: res.contacts.map((c: { FirstName: string; LastName: string; Email: string; Phone: string; Account?: { Name: string } }) => ({
            firstName: c.FirstName || "", lastName: c.LastName || "",
            email: c.Email || "", phone: c.Phone || "",
            household: c.Account?.Name || "No Household", source: "salesforce" as const,
          })) });
        }
      } catch { /* swallow */ }
      d({ type: "SET_IS_SEARCHING", value: false });
    }, 400);
    return () => clearTimeout(timer);
  }, [state.searchQuery, state.step]);

  // Poll DocuSign status
  useEffect(() => {
    if (state.step !== "complete" || !sfRef.current.envelopeIds?.length) return;
    const poll = async () => {
      try {
        const res = await fetch("/api/docusign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "checkStatus", data: { envelopeIds: sfRef.current.envelopeIds } }) });
        const text = await res.text();
        let data;
        try { data = JSON.parse(text); } catch { return; }
        if (data.success && data.statuses) d({ type: "SET_ENV_STATUSES", statuses: data.statuses });
      } catch { /* swallow */ }
    };
    poll();
    const interval = setInterval(poll, 10000);
    return () => clearInterval(interval);
  }, [state.step]);

  const addEv = useCallback((label: string, url?: string) => {
    d({ type: "ADD_EVIDENCE", ev: { label, url, timestamp: timestamp() } });
  }, []);

  // ─── Navigation ────────────────────────────────────────────────────────────

  const goBack = () => {
    const m: Partial<Record<FlowStep, FlowStep>> = {
      "client-type": "context", "search-existing": "client-type",
      "enter-client-p1": "client-type", "enter-client-p2": "enter-client-p1",
      "select-accounts-p1": state.hasP2 ? "enter-client-p2" : "enter-client-p1",
      "select-accounts-p2": "select-accounts-p1",
      "select-accounts-joint": state.hasP2 ? "select-accounts-p2" : "select-accounts-p1",
      funding: state.hasJoint ? "select-accounts-joint" : (state.hasP2 ? "select-accounts-p2" : "select-accounts-p1"),
      moneylink: "funding", beneficiaries: "moneylink", review: "beneficiaries",
    };
    if (m[state.step]) d({ type: "SET_STEP", step: m[state.step]! });
  };

  const nextFund = () => {
    if (state.fundIdx < state.accounts.length - 1) d({ type: "SET_FUND_IDX", value: state.fundIdx + 1 });
    else d({ type: "SET_STEP", step: "moneylink" });
  };
  const nextP1 = () => {
    if (state.hasP2) d({ type: "SET_STEP", step: "select-accounts-p2" });
    else if (state.hasJoint) d({ type: "SET_STEP", step: "select-accounts-joint" });
    else { d({ type: "SET_FUND_IDX", value: 0 }); d({ type: "SET_STEP", step: "funding" }); }
  };
  const nextP2 = () => {
    if (state.hasJoint) d({ type: "SET_STEP", step: "select-accounts-joint" });
    else { d({ type: "SET_FUND_IDX", value: 0 }); d({ type: "SET_STEP", step: "funding" }); }
  };
  const nextJoint = () => { d({ type: "SET_FUND_IDX", value: 0 }); d({ type: "SET_STEP", step: "funding" }); };

  // ─── Execution ─────────────────────────────────────────────────────────────

  const executeGen = async () => {
    d({ type: "SET_STEP", step: "generating" });
    d({ type: "SET_IS_PROCESSING", value: true });

    // Extracted helper: record DocuSign tasks in SF (used by success + both fallback paths)
    const recordSFDocusignTasks = async () => {
      return callSF("sendDocusign", {
        householdId: sfRef.current.householdId,
        primaryContactId: sfRef.current.primaryContactId,
        envelopes: state.accounts.map(a => ({
          name: `${a.owner}'s ${a.type}`,
          signers: a.signers === 2 ? [p1Name, p2Name] : [a.owner],
          emailSubject: `Please sign your ${a.type} paperwork`,
        })),
      });
    };

    // Pipeline: each step is { label, fn }. Adding a step = adding one entry.
    // GEN_STEP_LABELS is derived from this array — no separate constant to keep in sync.
    const steps: { label: string; fn: () => Promise<void> }[] = [
      {
        label: "Creating household & contacts",
        fn: async () => {
          const members = [{ firstName: state.p1.firstName, lastName: state.p1.lastName, email: state.p1.email || state.signerEmail, phone: state.p1.phone }];
          if (state.hasP2 && state.p2.firstName) members.push({ firstName: state.p2.firstName, lastName: state.p2.lastName, email: state.p2.email || "", phone: state.p2.phone });
          const r = await callSF("confirmIntent", { familyName: fam, force: true, accounts: state.accounts.map(a => ({ type: a.type, owner: a.owner })), members });
          if (!r.success) throw new Error(r.error || "Failed");
          sfRef.current = { householdId: r.household.id, householdUrl: r.household.url, contacts: r.contacts, primaryContactId: r.contacts[0]?.id };
          addEv(`${fam} Household created`, r.household.url);
          addEv(`${r.contacts.length} contacts created`, r.contacts[0]?.url);
        },
      },
      {
        label: "Recording funding details",
        fn: async () => {
          const fd = state.accounts.filter(a => a.funding && a.funding !== "None").map(a => ({ account: `${a.owner}'s ${a.type}`, detail: `${a.funding}${a.fundingAmount ? ` — ~$${a.fundingAmount}` : ""}${a.amount ? ` acct#${a.amount}` : ""}${a.allocation ? `, ${a.allocation}` : ""}` }));
          if (fd.length > 0) {
            const r = await callSF("recordFunding", { householdId: sfRef.current.householdId, familyName: fam, pteRequired: state.accounts.some(a => a.funding === "Rollover"), fundingDetails: fd });
            if (r.success) addEv("Funding recorded", r.task.url);
          }
        },
      },
      {
        label: "Setting up MoneyLink",
        fn: async () => {
          if (state.setupACH && state.matchedBank && state.bankAcct) {
            const r = await callSF("recordMoneyLink", { householdId: sfRef.current.householdId, bankName: state.matchedBank, routingLastFour: state.bankLast4, lastFour: state.bankAcct.slice(-4) });
            if (r.success) addEv(`MoneyLink: ${state.matchedBank}`, r.task.url);
          }
        },
      },
      {
        label: "Recording beneficiaries",
        fn: async () => {
          const desig = state.accounts.map(a => {
            if (a.type.includes("JTWROS") || a.type === "Community Property") return { account: `${a.owner}'s ${a.type}`, beneficiary: "Survivorship rights" };
            const ab = state.beneficiaries.filter(b => b.accountId === a.id);
            return { account: `${a.owner}'s ${a.type}`, beneficiary: ab.length > 0 ? ab.map(b => `${b.name} (${b.relationship}) — ${b.percentage}% ${b.beneType}`).join("; ") : "None" };
          });
          const r = await callSF("recordBeneficiaries", { householdId: sfRef.current.householdId, familyName: fam, designations: desig });
          if (r.success) addEv("Beneficiaries recorded", r.task.url);
        },
      },
      {
        label: "Running completeness check",
        fn: async () => {
          const r = await callSF("recordCompleteness", { householdId: sfRef.current.householdId, familyName: fam, checks: ["Account types confirmed", "Funding details entered", "Beneficiaries designated", ...(state.setupACH ? ["ACH configured"] : [])] });
          if (r.success) addEv("Completeness passed", r.task.url);
        },
      },
      {
        label: "Generating paperwork",
        fn: async () => {
          const r = await callSF("recordPaperwork", { householdId: sfRef.current.householdId, envelopes: state.accounts.map(a => ({ name: `${a.owner}'s ${a.type} Envelope`, documents: docsFor(a, !!state.setupACH) })) });
          if (r.success) addEv(`${r.count} envelopes generated`, r.tasks[0]?.url);
        },
      },
      {
        label: "Configuring DocuSign",
        fn: async () => {
          const r = await callSF("recordDocusignConfig", { householdId: sfRef.current.householdId, familyName: fam, envelopeCount: state.accounts.length, config: state.accounts.map(a => ({ envelope: `${a.owner}'s ${a.type} (${a.signers}-Signer)`, recipients: a.signers === 2 ? `${p1Name} → ${p2Name} → AO Ops` : `${a.owner} → AO Ops` })) });
          if (r.success) addEv("DocuSign configured", r.task.url);
        },
      },
      {
        label: "Sending DocuSign envelopes",
        fn: async () => {
          const dsEnvelopes = state.accounts.map(a => {
            const signerNames = a.signers === 2 ? [p1Name, p2Name] : [a.owner];
            const signerEmails = a.signers === 2 ? [state.signerEmail || state.p1.email, state.p2.email].filter(Boolean) : [state.signerEmail || state.p1.email];
            const accBenes = state.beneficiaries.filter(b => b.accountId === a.id).map(b => ({ name: b.name, relationship: b.relationship, percentage: b.percentage, beneType: b.beneType }));
            return { name: `${a.owner}'s ${a.type}`, emailSubject: `${fam} Household — Please sign: ${a.type} Account Paperwork`, documents: docsFor(a, !!state.setupACH), account: { type: a.type, owner: a.owner, funding: a.funding, fundingAmount: a.fundingAmount, purpose: a.purpose, amount: a.amount, allocation: a.allocation }, beneficiaries: accBenes, signerNames, signerEmails };
          });

          try {
            const dsRes = await fetch("/api/docusign", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "sendEnvelopes", data: { familyName: fam, client: state.p1, client2: state.hasP2 ? state.p2 : undefined, bankName: state.matchedBank, envelopes: dsEnvelopes } }) });
            const dsText = await dsRes.text();
            let dsData;
            try { dsData = JSON.parse(dsText); } catch { dsData = { success: false, error: "Non-JSON response" }; }
            if (dsData.success) {
              const envIds = dsData.envelopes?.map((e: { envelopeId: string }) => e.envelopeId) || [];
              sfRef.current = { ...sfRef.current, envelopeIds: envIds };
              addEv(`${dsData.count} DocuSign envelope${dsData.count > 1 ? "s" : ""} sent!`);
              dsData.envelopes?.forEach((env: { name: string; envelopeId: string }) => addEv(`✉ ${env.name}`, `https://appdemo.docusign.com/documents/details/${env.envelopeId}`));
            } else {
              addEv(`DocuSign error: ${dsData.error}`);
            }
          } catch (dsErr) {
            console.error("DocuSign error:", dsErr);
            addEv(`DocuSign failed: ${dsErr instanceof Error ? dsErr.message : "Unknown"}`);
          }
          // Always record SF tasks (primary record of what was sent, regardless of DS success)
          const sfResult = await recordSFDocusignTasks();
          if (sfResult.success) addEv(`${sfResult.count} SF tasks created`, sfResult.tasks[0]?.url);
        },
      },
      {
        label: "Generating PDF packet",
        fn: async () => {
          try {
            const pdfRes = await fetch("/api/pdf", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ familyName: fam, members: [{ firstName: state.p1.firstName, lastName: state.p1.lastName, email: state.p1.email, phone: state.p1.phone, role: "Primary" }, ...(state.hasP2 ? [{ firstName: state.p2.firstName, lastName: state.p2.lastName, email: state.p2.email, phone: state.p2.phone, role: "Spouse" }] : [])], date: new Date().toLocaleDateString() }) });
            const pdfData = await pdfRes.json();
            if (pdfData.success) {
              addEv(`📄 ${pdfData.filename || "Onboarding packet"} generated`);
            }
          } catch { /* PDF generation is optional — swallow failures */ }
        },
      },
    ];

    try {
      for (const [i, step] of steps.entries()) {
        d({ type: "SET_GEN_STEP", value: i + 1 });
        await step.fn();
      }
      // Final "Done" step
      d({ type: "SET_GEN_STEP", value: steps.length + 1 });
      setTimeout(() => d({ type: "SET_STEP", step: "complete" }), 600);
    } catch (err) {
      console.error(err);
      addEv(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
      d({ type: "SET_STEP", step: "review" });
    } finally {
      d({ type: "SET_IS_PROCESSING", value: false });
    }
  };

  // Step labels for the generation pipeline — must be defined outside executeGen so genStepLabels can reference them
  const GEN_PIPELINE_LABELS = [
    "Creating household",
    "Adding contacts",
    "Recording account plan",
    "Recording funding details",
    "Recording beneficiaries",
    "Running completeness check",
    "Generating paperwork",
    "Configuring DocuSign",
    "Sending DocuSign envelopes",
    "Generating PDF packet",
  ];

  // Derived step labels for ProgressSteps — always in sync with pipeline
  const genStepLabels = [...GEN_PIPELINE_LABELS, "Done"];

  // Expose SF record URLs as derived values instead of raw ref (#15)
  const householdUrl = sfRef.current.householdUrl || "";

  const householdId = sfRef.current.householdId || "";
  const primaryContactId = sfRef.current.primaryContactId || "";

  return {
    state, dispatch: d,
    // Derived
    p1Name, p2Name, fam, jLabel, progressPct, curFund,
    hasAcct, acctsFor, totalDocs, estMinutes, genStepLabels,
    householdUrl, householdId, primaryContactId,
    // Actions
    goBack, nextFund, nextP1, nextP2, nextJoint, executeGen, addEv,
  };
}
