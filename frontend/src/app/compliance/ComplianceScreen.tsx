"use client";
import { useReducer, useEffect, useCallback, useRef, useState } from "react";
import { Search, Loader2, Check, X, AlertTriangle, ExternalLink, Shield, ChevronDown, ChevronUp, Download, MessageSquare, Fingerprint, BarChart3, FileText, Briefcase, Scale, Calendar, Clock, Plus, Trash2, Settings } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ContinueBtn } from "@/components/shared/FormControls";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { ProgressSteps } from "@/components/shared/ProgressSteps";
import { WhyBubble } from "@/components/shared/WhyBubble";
import { callSF } from "@/lib/salesforce";
import { timestamp } from "@/lib/format";
import { custodian } from "@/lib/custodian";
import type { ComplianceStep, SFEvidence, Screen, WorkflowContext } from "@/lib/types";

// ─── Compliance Check Definitions ────────────────────────────────────────────

interface CheckResult {
  id: string;
  category: "identity" | "suitability" | "documents" | "account" | "regulatory" | "firm";
  label: string;
  regulation: string;
  status: "pass" | "warn" | "fail";
  detail: string;
  evidence?: string[];
  whyItMatters: string;
}

// ─── Custom Compliance Checks ─────────────────────────────────────────────────

interface CustomCheck {
  id: string;
  label: string;
  keyword: string;        // keyword to search for in task text
  regulation: string;     // e.g. "Firm Internal Policy"
  whyItMatters: string;
  failStatus: "fail" | "warn";  // severity when keyword not found
}

const CUSTOM_CHECKS_KEY = "min-custom-compliance-checks";

function loadCustomChecks(): CustomCheck[] {
  if (typeof window === "undefined") return [];
  try { return JSON.parse(localStorage.getItem(CUSTOM_CHECKS_KEY) || "[]"); } catch { return []; }
}

function saveCustomChecks(checks: CustomCheck[]) {
  localStorage.setItem(CUSTOM_CHECKS_KEY, JSON.stringify(checks));
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SFHousehold = { id: string; name: string; description: string; createdAt: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SFContact = { id: string; firstName: string; lastName: string; email: string; phone: string; createdAt: string };
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SFTask = { id: string; subject: string; status: string; priority: string; description: string; createdAt: string; dueDate: string };

interface HouseholdSearchResult {
  id: string;
  name: string;
  description: string;
  createdDate: string;
  contactNames: string;
}

// ─── Compliance Engine ───────────────────────────────────────────────────────
// This is the core logic: given a household's SF data, produce compliance checks.

function runComplianceChecks(
  household: SFHousehold,
  contacts: SFContact[],
  tasks: SFTask[],
): CheckResult[] {
  const checks: CheckResult[] = [];
  const taskSubjects = tasks.map(t => (t.subject || "").toLowerCase());
  const taskDescs = tasks.map(t => (t.description || "").toLowerCase());
  const allTaskText = [...taskSubjects, ...taskDescs].join(" ");

  // Helper: does any task mention this keyword?
  const hasTask = (keyword: string) => allTaskText.includes(keyword.toLowerCase());

  // ── IDENTITY & KYC ──

  const kycEvidence: string[] = [];
  if (contacts.length > 0) kycEvidence.push(`${contacts.length} contact(s) on file`);
  contacts.forEach(c => {
    const fields = [c.firstName && c.lastName ? `Name: ${c.firstName} ${c.lastName}` : null, c.email ? "Email populated" : null, c.phone ? "Phone populated" : null].filter(Boolean);
    if (fields.length > 0) kycEvidence.push(fields.join(", "));
  });

  checks.push({
    id: "kyc-profile",
    category: "identity",
    label: "KYC Profile Completed",
    regulation: "FINRA Rule 2090 (Know Your Customer)",
    status: hasTask("kyc") || hasTask("suitability") ? "pass" : "fail",
    detail: hasTask("kyc") || hasTask("suitability")
      ? `KYC recorded for ${contacts.length} contact(s)`
      : "No KYC/suitability record found — required before account activity",
    evidence: hasTask("kyc") || hasTask("suitability") ? kycEvidence : undefined,
    whyItMatters: "FINRA requires firms to know the essential facts about every customer. Without a KYC profile, the firm cannot demonstrate suitability of recommendations during an examination.",
  });

  checks.push({
    id: "trusted-contact",
    category: "identity",
    label: "Trusted Contact Designated",
    regulation: "FINRA Rule 4512",
    status: hasTask("trusted contact") ? "pass" : "warn",
    detail: hasTask("trusted contact")
      ? "Trusted contact on file"
      : "No trusted contact task found — required for new accounts opened after Feb 2018",
    whyItMatters: "A trusted contact allows the firm to reach someone if there are concerns about the client's wellbeing or potential financial exploitation. Required for all accounts opened after February 5, 2018.",
  });

  checks.push({
    id: "identity-verified",
    category: "identity",
    label: "Identity Verification",
    regulation: "USA PATRIOT Act / CIP Rule",
    status: hasTask("identity verified") || hasTask("gov id") ? "pass" : "fail",
    detail: hasTask("identity verified") || hasTask("gov id")
      ? "Government ID verified and on file"
      : "No identity verification record — required by Customer Identification Program",
    whyItMatters: "The Customer Identification Program (CIP) requires firms to verify each customer's identity using government-issued documents. Failure creates AML compliance risk and potential enforcement action.",
  });

  // ── SUITABILITY ──

  const hasSuitability = hasTask("risk") || hasTask("investment objective") || hasTask("suitability");
  const suitEvidence: string[] = [];
  if (hasTask("risk")) suitEvidence.push("Risk tolerance documented");
  if (hasTask("investment objective")) suitEvidence.push("Investment objectives documented");
  if (hasTask("suitability")) suitEvidence.push("Suitability questionnaire completed");

  checks.push({
    id: "suitability-profile",
    category: "suitability",
    label: "Suitability Profile Current",
    regulation: "FINRA Rule 2111 / Reg BI",
    status: hasSuitability ? "pass" : "fail",
    detail: hasSuitability
      ? "Risk tolerance, investment objective, and financial profile on file"
      : "No suitability profile found — required before investment recommendations",
    evidence: hasSuitability ? suitEvidence : undefined,
    whyItMatters: "Reg BI requires a reasonable basis to believe any recommendation is in the client's best interest. Without a documented suitability profile, every recommendation is indefensible in an exam.",
  });

  // Check if any rollover was done — needs PTE documentation
  const hasRollover = hasTask("rollover") || hasTask("pte");
  if (hasRollover) {
    checks.push({
      id: "pte-compliance",
      category: "suitability",
      label: "PTE 2020-02 Documentation",
      regulation: "DOL Prohibited Transaction Exemption",
      status: hasTask("pte") ? "pass" : "warn",
      detail: hasTask("pte")
        ? "Rollover Recommendation + PTE form generated and signed"
        : "Rollover detected but no PTE documentation found",
      whyItMatters: "DOL PTE 2020-02 requires documented proof that a rollover recommendation is in the client's best interest. Missing PTE documentation is a top enforcement priority — fines can exceed $100K per violation.",
    });
  }

  // ── DOCUMENTS ──

  checks.push({
    id: "form-crs",
    category: "documents",
    label: "Form CRS Delivered",
    regulation: "SEC Rule 17a-14 / Reg BI",
    status: hasTask("form crs") || hasTask("client relationship summary") ? "pass" : "fail",
    detail: hasTask("form crs") || hasTask("client relationship summary")
      ? "Form CRS delivered and acknowledged"
      : "No Form CRS delivery record — required at or before account opening",
    whyItMatters: "Form CRS must be delivered before or at the time of an investment recommendation. SEC examiners check for delivery records as a priority item. Missing CRS is a common deficiency finding.",
  });

  checks.push({
    id: "adv-delivery",
    category: "documents",
    label: "ADV Part 2A Disclosure",
    regulation: "SEC Rule 204-3 (Brochure Rule)",
    status: hasTask("adv") || hasTask("advisory") || hasTask("brochure") ? "pass" : "warn",
    detail: hasTask("adv") || hasTask("advisory") || hasTask("brochure")
      ? "Advisory business practices addendum delivered"
      : "No ADV delivery record found — required within 48 hours of engagement",
    whyItMatters: "The Brochure Rule requires delivery of ADV Part 2A before or at the time of entering an advisory contract. It must also be offered annually. This is one of the first items SEC examiners request.",
  });

  checks.push({
    id: "privacy-notice",
    category: "documents",
    label: "Privacy Notice Delivered",
    regulation: "Regulation S-P",
    status: hasTask("privacy") ? "pass" : "warn",
    detail: hasTask("privacy")
      ? "Privacy notice delivered"
      : "No privacy notice record — required annually and at account opening",
    whyItMatters: "Regulation S-P requires initial and annual privacy notice delivery. While often overlooked, missing privacy notices can result in enforcement actions during routine examinations.",
  });

  // ── ACCOUNT SETUP ──

  checks.push({
    id: "beneficiary-designation",
    category: "account",
    label: "Beneficiary Designations Complete",
    regulation: "Firm Best Practice / ERISA",
    status: hasTask("beneficiar") ? "pass" : "warn",
    detail: hasTask("beneficiar")
      ? "Beneficiary designations recorded for all applicable accounts"
      : "No beneficiary designation record — recommended for all retirement accounts",
    whyItMatters: "Missing beneficiary designations cause assets to default to the estate, potentially conflicting with the client's planning intent. This is also the #1 Schwab NIGO rejection reason for IRA applications.",
  });

  const hasDocusign = hasTask("docusign") || hasTask("docu");
  const docuTasks = tasks.filter(t => (t.subject || "").toLowerCase().includes("docu"));
  checks.push({
    id: "signatures",
    category: "account",
    label: "All Signatures Obtained",
    regulation: `Custodial Requirement / ${custodian.shortName}`,
    status: hasDocusign ? "pass" : "fail",
    detail: hasDocusign
      ? "DocuSign envelopes sent and tracked"
      : "No signature record found — accounts cannot be funded without signed applications",
    evidence: hasDocusign ? docuTasks.slice(0, 3).map(t => `Envelope: ${t.subject} (${t.status})`) : undefined,
    whyItMatters: `${custodian.shortName} requires signed originals (or DocuSign equivalents) for all account applications. Unsigned applications will be rejected as NIGO.`,
  });

  if (hasTask("moneylink") || hasTask("ach")) {
    checks.push({
      id: "ach-authorization",
      category: "account",
      label: "ACH Authorization on File",
      regulation: "NACHA Operating Rules",
      status: "pass",
      detail: "MoneyLink/ACH authorization recorded",
      whyItMatters: "NACHA rules require explicit authorization before initiating ACH debits. The authorization form must be retained for 2 years after revocation.",
    });
  }

  // ── REGULATORY ──

  const complEvidence: string[] = [];
  if (hasTask("completeness")) {
    complEvidence.push(`${tasks.length} total SF records scanned`);
    complEvidence.push(`${contacts.length} contact(s) on file`);
    const compCount = tasks.filter(t => t.status === "Completed").length;
    if (compCount > 0) complEvidence.push(`${compCount} tasks completed`);
  }

  checks.push({
    id: "completeness-check",
    category: "regulatory",
    label: "Completeness Check Passed",
    regulation: "SEC Examination Readiness",
    status: hasTask("completeness") ? "pass" : "fail",
    detail: hasTask("completeness")
      ? "All required information verified and completeness check recorded"
      : "No completeness check on file — creates audit risk during SEC examination",
    evidence: hasTask("completeness") ? complEvidence : undefined,
    whyItMatters: "SEC examiners expect a documented completeness check showing all client information was verified before account funding. This is your first line of defense during an exam.",
  });

  // Household creation date — check staleness
  const createdDate = new Date(household.createdAt);
  const daysSinceCreation = Math.floor((Date.now() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
  if (daysSinceCreation > 365) {
    checks.push({
      id: "annual-review",
      category: "regulatory",
      label: "Annual Review Due",
      regulation: "SEC Examination Best Practice",
      status: "warn",
      detail: `Household created ${daysSinceCreation} days ago — annual review recommended`,
      whyItMatters: "The SEC expects firms to conduct regular reviews of client accounts and relationships. A household without a review in over a year signals inadequate supervision to examiners.",
    });
  }

  // ── FIRM CUSTOM CHECKS ──
  const customChecks = loadCustomChecks();
  for (const cc of customChecks) {
    const found = hasTask(cc.keyword);
    checks.push({
      id: `custom-${cc.id}`,
      category: "firm",
      label: cc.label,
      regulation: cc.regulation,
      status: found ? "pass" : cc.failStatus,
      detail: found
        ? `"${cc.keyword}" found in household records`
        : `No record matching "${cc.keyword}" — required by firm policy`,
      whyItMatters: cc.whyItMatters,
    });
  }

  return checks;
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

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode; title?: string }> = {
  identity: { label: "Identity & KYC", icon: <Fingerprint size={18} className="text-slate-500" />, title: "Know Your Customer — identity verification requirements" },
  suitability: { label: "Suitability & Recommendations", icon: <BarChart3 size={18} className="text-slate-500" /> },
  documents: { label: "Disclosures & Delivery", icon: <FileText size={18} className="text-slate-500" /> },
  account: { label: "Account Setup", icon: <Briefcase size={18} className="text-slate-500" /> },
  regulatory: { label: "Regulatory Readiness", icon: <Scale size={18} className="text-slate-500" /> },
  firm: { label: "Firm Policies", icon: <Settings size={18} className="text-purple-500" />, title: "Custom compliance checks defined by your firm" },
};

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

  // Batch scan state
  interface BatchResult { household: string; householdId: string; checks: CheckResult[]; pass: number; warn: number; fail: number }
  const [batchMode, setBatchMode] = useState(false);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [batchResults, setBatchResults] = useState<BatchResult[]>([]);
  const [batchPdfLoading, setBatchPdfLoading] = useState(false);
  const [individualPdfLoading, setIndividualPdfLoading] = useState(false);
  const [individualPdfProgress, setIndividualPdfProgress] = useState({ current: 0, total: 0 });

  // Custom checks management
  const [showCustomChecks, setShowCustomChecks] = useState(false);
  const [customChecks, setCustomChecks] = useState<CustomCheck[]>(loadCustomChecks);
  const [newCheck, setNewCheck] = useState({ label: "", keyword: "", regulation: "Firm Internal Policy", whyItMatters: "", failStatus: "warn" as "fail" | "warn" });
  const [showAddForm, setShowAddForm] = useState(false);

  const addCustomCheck = () => {
    if (!newCheck.label.trim() || !newCheck.keyword.trim()) return;
    const check: CustomCheck = { ...newCheck, id: Date.now().toString(36) };
    const updated = [...customChecks, check];
    setCustomChecks(updated);
    saveCustomChecks(updated);
    setNewCheck({ label: "", keyword: "", regulation: "Firm Internal Policy", whyItMatters: "", failStatus: "warn" });
    setShowAddForm(false);
  };

  const removeCustomCheck = (id: string) => {
    const updated = customChecks.filter(c => c.id !== id);
    setCustomChecks(updated);
    saveCustomChecks(updated);
  };

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
    const timer = setTimeout(async () => {
      try {
        const res = await callSF("searchHouseholds", { query: state.searchQuery });
        if (res.success) {
          d({ type: "SET_SEARCH_RESULTS", value: res.households.map((h: SFHousehold) => ({
            id: h.id, name: h.name, description: h.description || "",
            createdDate: new Date(h.createdAt).toLocaleDateString(),
            contactNames: "",
          })) });
        }
      } catch { /* swallow */ }
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
          householdRef.current = res.household;
          contactsRef.current = res.contacts || [];
          tasksRef.current = res.tasks || [];
          d({ type: "SET_HOUSEHOLD_DATA", contacts: res.contacts, tasks: res.tasks, url: res.householdUrl });
          addEv(`Loaded ${household.name}`, res.householdUrl);
          addEv(`${res.contacts.length} contacts, ${res.tasks.length} task records`);
        },
      },
      {
        label: "Checking KYC & identity",
        fn: async () => { await new Promise(r => setTimeout(r, 400)); },
      },
      {
        label: "Verifying suitability",
        fn: async () => { await new Promise(r => setTimeout(r, 350)); },
      },
      {
        label: "Scanning document delivery",
        fn: async () => { await new Promise(r => setTimeout(r, 300)); },
      },
      {
        label: "Reviewing account setup",
        fn: async () => { await new Promise(r => setTimeout(r, 350)); },
      },
      {
        label: "Checking regulatory compliance",
        fn: async () => {
          if (!householdRef.current) throw new Error("No household data");
          const checks = runComplianceChecks(householdRef.current, contactsRef.current, tasksRef.current);
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

  // Batch scan all households
  const runBatchScan = async () => {
    setBatchLoading(true);
    setBatchResults([]);
    try {
      const res = await callSF("queryTasks", { limit: 200 });
      if (!res.success) { setBatchLoading(false); return; }
      const households = (res.households || []) as SFHousehold[];
      setBatchProgress({ current: 0, total: households.length });
      const results: BatchResult[] = [];
      for (let i = 0; i < households.length; i++) {
        setBatchProgress({ current: i + 1, total: households.length });
        try {
          const detail = await callSF("getHouseholdDetail", { householdId: households[i].id });
          if (detail.success) {
            const checks = runComplianceChecks(
              { id: households[i].id, name: households[i].name, description: households[i].description || "", createdAt: households[i].createdAt },
              detail.contacts || [],
              detail.tasks || [],
            );
            results.push({
              household: households[i].name.replace(" Household", ""),
              householdId: households[i].id,
              checks,
              pass: checks.filter(c => c.status === "pass").length,
              warn: checks.filter(c => c.status === "warn").length,
              fail: checks.filter(c => c.status === "fail").length,
            });
          }
        } catch { /* skip failed household */ }
      }
      results.sort((a, b) => b.fail - a.fail || b.warn - a.warn);
      setBatchResults(results);
    } catch { /* swallow */ }
    setBatchLoading(false);
  };

  const downloadBatchPDF = async () => {
    setBatchPdfLoading(true);
    try {
      const reviewDate = new Date().toLocaleDateString();
      const checks = batchResults.flatMap(r => r.checks.map(c => ({
        label: c.label, category: c.category, regulation: c.regulation, status: c.status,
        detail: `[${r.household}] ${c.detail}`,
      })));
      const totalFail = batchResults.reduce((s, r) => s + r.fail, 0);
      const res = await fetch("/api/pdf/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyName: `Firm-Wide (${batchResults.length} Households)`,
          householdUrl: "",
          contacts: [],
          tasksScanned: batchResults.length,
          checks: checks.slice(0, 100),
          reviewDate,
          nextReviewDate: new Date(Date.now() + 90 * 86400000).toLocaleDateString(),
          firmName: firmName || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.pdf) {
        const link = document.createElement("a");
        link.href = data.pdf;
        link.download = `Firm-Wide-Compliance-${reviewDate.replace(/\//g, "-")}.pdf`;
        link.click();
      }
    } catch { /* swallow */ }
    setBatchPdfLoading(false);
  };

  const downloadIndividualPDFs = async () => {
    setIndividualPdfLoading(true);
    setIndividualPdfProgress({ current: 0, total: batchResults.length });
    const reviewDate = new Date().toLocaleDateString();
    const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${new Date().getFullYear()}`;

    for (let i = 0; i < batchResults.length; i++) {
      setIndividualPdfProgress({ current: i + 1, total: batchResults.length });
      const r = batchResults[i];
      try {
        const res = await fetch("/api/pdf/compliance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            familyName: r.household,
            householdUrl: "",
            contacts: [],
            tasksScanned: r.checks.length,
            checks: r.checks.map(c => ({
              label: c.label, category: c.category, regulation: c.regulation,
              status: c.status, detail: c.detail,
            })),
            reviewDate,
            nextReviewDate: new Date(Date.now() + 90 * 86400000).toLocaleDateString(),
            firmName: firmName || undefined,
          }),
        });
        const data = await res.json();
        if (data.success && data.pdf) {
          const link = document.createElement("a");
          link.href = data.pdf;
          link.download = `${r.household.replace(/\s+/g, "_")}_Compliance_${quarter}.pdf`;
          link.click();
        }
        // Small delay between downloads to prevent browser blocking
        if (i < batchResults.length - 1) await new Promise(r => setTimeout(r, 300));
      } catch { /* skip failed household */ }
    }
    setIndividualPdfLoading(false);
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
      if (res.success) addEv("Compliance review recorded", res.task.url);
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

  // ─── Derived ──────────────────────────────────────────────────────────────
  const passCount = state.checks.filter(c => c.status === "pass").length;
  const warnCount = state.checks.filter(c => c.status === "warn").length;
  const failCount = state.checks.filter(c => c.status === "fail").length;
  const categories = [...new Set(state.checks.map(c => c.category))];

  const goBack = () => {
    if (batchMode) { setBatchMode(false); setBatchResults([]); setBatchLoading(false); return; }
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
                {state.searchQuery.length >= 2 && (
                  <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {state.searchResults.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-slate-400 text-center">{state.isSearching ? "Searching Salesforce..." : `No households matching \u201c${state.searchQuery}\u201d`}</p>
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
                  <button onClick={() => { setBatchMode(true); runBatchScan(); }}
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

                {/* Custom Compliance Checks */}
                <div className="mt-4">
                  <button onClick={() => setShowCustomChecks(!showCustomChecks)}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors text-left">
                    <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
                      <Settings size={20} className="text-purple-600" />
                    </div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-slate-800">Custom Firm Checks</p>
                      <p className="text-xs text-slate-400">Define internal policies that run alongside the {12} regulatory checks.</p>
                    </div>
                    {customChecks.length > 0 && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">{customChecks.length}</span>
                    )}
                  </button>

                  {showCustomChecks && (
                    <div className="mt-3 bg-white border border-slate-200 rounded-2xl overflow-hidden animate-fade-in">
                      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                        <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Firm Policy Checks</p>
                        <button onClick={() => setShowAddForm(true)} className="text-xs px-2.5 py-1 rounded-lg bg-purple-100 text-purple-600 font-medium hover:bg-purple-200 transition-colors flex items-center gap-1">
                          <Plus size={12} /> Add Check
                        </button>
                      </div>

                      {customChecks.length === 0 && !showAddForm && (
                        <div className="px-4 py-6 text-center">
                          <Settings size={20} className="mx-auto text-slate-200 mb-2" />
                          <p className="text-sm text-slate-400">No custom checks defined yet</p>
                          <p className="text-xs text-slate-300 mt-1">Add your firm&apos;s internal policies to run alongside regulatory checks.</p>
                        </div>
                      )}

                      {customChecks.map(cc => (
                        <div key={cc.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-700">{cc.label}</p>
                            <p className="text-[10px] text-slate-400">Keyword: &quot;{cc.keyword}&quot; · {cc.failStatus === "fail" ? "Fails" : "Warns"} if missing</p>
                          </div>
                          <button onClick={() => removeCustomCheck(cc.id)} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}

                      {showAddForm && (
                        <div className="px-4 py-4 border-t border-slate-100 bg-slate-50 space-y-3">
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider">Check Name</label>
                            <Input className="h-9 rounded-lg text-sm mt-1" placeholder="e.g. Senior Client Risk Assessment" value={newCheck.label}
                              onChange={e => setNewCheck(p => ({ ...p, label: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider">Keyword to Match</label>
                            <Input className="h-9 rounded-lg text-sm mt-1" placeholder="e.g. senior risk assessment" value={newCheck.keyword}
                              onChange={e => setNewCheck(p => ({ ...p, keyword: e.target.value }))} />
                            <p className="text-[10px] text-slate-300 mt-0.5">Searches task subjects and descriptions for this text</p>
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider">Policy Reference</label>
                            <Input className="h-9 rounded-lg text-sm mt-1" placeholder="e.g. Firm Policy §4.2" value={newCheck.regulation}
                              onChange={e => setNewCheck(p => ({ ...p, regulation: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider">Why It Matters</label>
                            <Input className="h-9 rounded-lg text-sm mt-1" placeholder="Why this check is important..." value={newCheck.whyItMatters}
                              onChange={e => setNewCheck(p => ({ ...p, whyItMatters: e.target.value }))} />
                          </div>
                          <div>
                            <label className="text-[10px] text-slate-400 uppercase tracking-wider">Severity if Missing</label>
                            <div className="flex gap-2 mt-1">
                              <button onClick={() => setNewCheck(p => ({ ...p, failStatus: "warn" }))}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${newCheck.failStatus === "warn" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>Warning</button>
                              <button onClick={() => setNewCheck(p => ({ ...p, failStatus: "fail" }))}
                                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${newCheck.failStatus === "fail" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-400"}`}>Fail</button>
                            </div>
                          </div>
                          <div className="flex gap-2 pt-1">
                            <button onClick={addCustomCheck} disabled={!newCheck.label.trim() || !newCheck.keyword.trim()}
                              className="text-xs px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors disabled:opacity-50">Save Check</button>
                            <button onClick={() => setShowAddForm(false)} className="text-xs px-4 py-2 rounded-lg border border-slate-200 text-slate-400 font-medium hover:bg-white transition-colors">Cancel</button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Batch scan mode */}
            {batchMode && state.step === "cc-search" && (
              <div className="animate-fade-in">
                {batchLoading ? (
                  <div className="text-center pt-8">
                    <Loader2 size={40} className="animate-spin text-green-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-light text-slate-900 mb-2">Scanning All Households</h2>
                    <p className="text-slate-400 mb-4">Checking {batchProgress.current} of {batchProgress.total} households...</p>
                    <div className="max-w-xs mx-auto">
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-green-400 rounded-full transition-all duration-300" style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                ) : batchResults.length > 0 ? (
                  <div>
                    <h2 className="text-3xl font-light text-slate-900 mb-2">Firm-Wide Compliance</h2>
                    <p className="text-slate-400 mb-6">{batchResults.length} households scanned · {new Date().toLocaleDateString()}</p>

                    {/* Summary card */}
                    {(() => {
                      const totalFails = batchResults.reduce((s, r) => s + r.fail, 0);
                      const totalWarns = batchResults.reduce((s, r) => s + r.warn, 0);
                      const totalPasses = batchResults.reduce((s, r) => s + r.pass, 0);
                      const cleanHouseholds = batchResults.filter(r => r.fail === 0).length;
                      return (
                        <div className={`rounded-2xl p-5 mb-6 ${totalFails === 0 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
                          <div className="flex items-center gap-4 mb-3">
                            <div className={`w-12 h-12 rounded-full flex items-center justify-center ${totalFails === 0 ? "bg-green-500" : "bg-amber-500"} text-white`}>
                              {totalFails === 0 ? <Shield size={24} /> : <AlertTriangle size={24} />}
                            </div>
                            <div>
                              <p className={`text-lg font-medium ${totalFails === 0 ? "text-green-900" : "text-amber-900"}`}>
                                {totalFails === 0 ? "All Households Pass" : `${batchResults.length - cleanHouseholds} Household${batchResults.length - cleanHouseholds > 1 ? "s" : ""} Need Attention`}
                              </p>
                              <p className="text-xs text-slate-500">{cleanHouseholds}/{batchResults.length} fully compliant</p>
                            </div>
                          </div>
                          <div className="grid grid-cols-3 gap-3">
                            <div className="bg-white/60 rounded-xl p-3 text-center">
                              <p className="text-lg font-semibold text-green-700">{totalPasses}</p>
                              <p className="text-[10px] text-slate-500">Passed</p>
                            </div>
                            <div className="bg-white/60 rounded-xl p-3 text-center">
                              <p className="text-lg font-semibold text-amber-600">{totalWarns}</p>
                              <p className="text-[10px] text-slate-500">Warnings</p>
                            </div>
                            <div className="bg-white/60 rounded-xl p-3 text-center">
                              <p className="text-lg font-semibold text-red-600">{totalFails}</p>
                              <p className="text-[10px] text-slate-500">Failed</p>
                            </div>
                          </div>
                        </div>
                      );
                    })()}

                    {/* Household-level results */}
                    <div className="space-y-2 mb-6">
                      {batchResults.map((r, i) => (
                        <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${r.fail === 0 ? "bg-green-100" : "bg-red-100"}`}>
                            {r.fail === 0 ? <Check size={14} className="text-green-600" /> : <X size={14} className="text-red-600" />}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800">{r.household}</p>
                            <div className="flex items-center gap-3 text-[10px] mt-0.5">
                              <span className="text-green-600">{r.pass} pass</span>
                              {r.warn > 0 && <span className="text-amber-500">{r.warn} warn</span>}
                              {r.fail > 0 && <span className="text-red-500">{r.fail} fail</span>}
                            </div>
                          </div>
                          {onNavigate && (
                            <button onClick={() => onNavigate("compliance", { householdId: r.householdId, familyName: r.household })}
                              className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">Details →</button>
                          )}
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-wrap gap-3 justify-center">
                      <button onClick={downloadBatchPDF} disabled={batchPdfLoading}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm disabled:opacity-50">
                        {batchPdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download Firm Report
                      </button>
                      <button onClick={downloadIndividualPDFs} disabled={individualPdfLoading}
                        className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm disabled:opacity-50">
                        {individualPdfLoading ? <><Loader2 size={16} className="animate-spin" /> {individualPdfProgress.current}/{individualPdfProgress.total}</> : <><Download size={16} /> Individual PDFs</>}
                      </button>
                      <button onClick={() => { setBatchMode(false); setBatchResults([]); }}
                        className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 font-medium hover:bg-slate-50 transition-colors text-sm">Back to Search</button>
                      <button onClick={() => { setBatchMode(false); setBatchResults([]); onExit(); }}
                        className="px-5 py-3 rounded-xl border border-slate-200 text-slate-400 font-medium hover:bg-slate-50 transition-colors text-sm">Home</button>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {state.step === "cc-scanning" && (
              <div className="animate-fade-in" data-tour="compliance-progress">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Scanning {familyName}...</h2>
                <p className="text-slate-400 mb-8">Checking Salesforce records against SEC, FINRA, and DOL requirements.</p>
                <ProgressSteps steps={SCAN_STEPS} currentStep={state.scanStep} />
              </div>
            )}

            {state.step === "cc-results" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Compliance Review</h2>
                <p className="text-slate-400 mb-6">{familyName} Household · {state.checks.length} checks run</p>

                {/* Score card */}
                <div className={`rounded-2xl p-6 mb-6 ${failCount === 0 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
                  <div className="flex items-center gap-4">
                    <div className={`w-14 h-14 rounded-full flex items-center justify-center ${failCount === 0 ? "bg-green-500" : "bg-amber-500"} text-white`}>
                      {failCount === 0 ? <Shield size={28} /> : <AlertTriangle size={28} />}
                    </div>
                    <div>
                      <p className={`text-xl font-medium ${failCount === 0 ? "text-green-900" : "text-amber-900"}`}>
                        {failCount === 0 ? "All Checks Passed" : `${failCount} Item${failCount > 1 ? "s" : ""} Need Attention`}
                      </p>
                      <div className="flex gap-4 mt-1 text-sm">
                        <span className="text-green-700">{passCount} passed</span>
                        {warnCount > 0 && <span className="text-amber-600">{warnCount} warnings</span>}
                        {failCount > 0 && <span className="text-red-600">{failCount} failed</span>}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Check results by category */}
                <div className="space-y-3">
                  {categories.map(cat => {
                    const catChecks = state.checks.filter(c => c.category === cat);
                    const catInfo = CATEGORY_LABELS[cat] || { label: cat, icon: "📋" };
                    const catFails = catChecks.filter(c => c.status === "fail").length;
                    const catWarns = catChecks.filter(c => c.status === "warn").length;
                    const isExpanded = state.expandedCategories.includes(cat);

                    return (
                      <div key={cat} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                        <button onClick={() => d({ type: "TOGGLE_CATEGORY", category: cat })}
                          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors">
                          <div className="flex items-center gap-3">
                            <span className="flex-shrink-0">{catInfo.icon}</span>
                            <span className="font-medium text-slate-800" title={catInfo.title}>{catInfo.label}</span>
                            <span className="text-xs text-slate-400">{catChecks.length} checks</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {catFails > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium">{catFails} fail</span>}
                            {catWarns > 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 font-medium">{catWarns} warn</span>}
                            {catFails === 0 && catWarns === 0 && <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">all pass</span>}
                            {isExpanded ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="border-t border-slate-100 px-4 pb-3 animate-slide-down">
                            {catChecks.map(check => (
                              <div key={check.id} className="flex items-start gap-3 py-3 border-b border-slate-50 last:border-0">
                                <div className="mt-0.5 flex-shrink-0">
                                  {check.status === "pass" && <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center" role="img" aria-label="Passed"><Check size={12} /></div>}
                                  {check.status === "warn" && <div className="w-5 h-5 rounded-full bg-amber-400 text-white flex items-center justify-center" role="img" aria-label="Warning"><AlertTriangle size={11} /></div>}
                                  {check.status === "fail" && <div className="w-5 h-5 rounded-full bg-red-500 text-white flex items-center justify-center" role="img" aria-label="Failed"><X size={12} /></div>}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-slate-800">{check.label}<WhyBubble reason={check.whyItMatters} regulation={check.regulation} compact /></p>
                                  <p className="text-xs text-slate-500 mt-0.5">{check.detail}</p>
                                  {check.evidence && check.evidence.length > 0 && (
                                    <div className="mt-1 space-y-0.5">
                                      {check.evidence.map((e, ei) => (
                                        <p key={ei} className="text-[10px] text-green-600 font-mono">✓ {e}</p>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                <ContinueBtn onClick={recordReview} label="Record Review in Salesforce" />
                <button onClick={downloadPDF} className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 text-slate-500 font-medium hover:bg-slate-50 transition-colors">
                  <Download size={16} /> Download PDF Report
                </button>
              </div>
            )}

            {state.step === "cc-recording" && (
              <div className="animate-fade-in text-center pt-16">
                <Loader2 size={40} className="animate-spin text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">Recording compliance review...</p>
              </div>
            )}

            {state.step === "cc-complete" && (
              <div className="animate-fade-in text-center pt-8">
                <div className={`w-20 h-20 rounded-full text-white flex items-center justify-center mx-auto mb-6 ${failCount === 0 ? "bg-green-500" : "bg-amber-500"}`}>
                  <Shield size={36} strokeWidth={2} />
                </div>
                <h2 className="text-3xl font-light text-slate-900 mb-3">Review Recorded</h2>
                <p className="text-lg text-slate-400 mb-1">{familyName} Household — {state.checks.length} compliance reviews</p>
                <p className="text-base text-slate-400 mb-6">
                  {failCount === 0 ? "All checks passed. Audit-ready." : `${failCount} item${failCount > 1 ? "s" : ""} flagged for follow-up.`}
                </p>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left max-w-md mx-auto mb-8">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-4 text-center">Audit Trail</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-500">Checks run</span>
                      <span className="font-medium text-slate-900">{state.checks.length}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-500">Passed</span>
                      <span className="font-medium text-green-700">{passCount}</span>
                    </div>
                    {warnCount > 0 && (
                      <div className="flex justify-between py-2 border-b border-slate-50">
                        <span className="text-slate-500">Warnings</span>
                        <span className="font-medium text-amber-600">{warnCount}</span>
                      </div>
                    )}
                    {failCount > 0 && (
                      <div className="flex justify-between py-2 border-b border-slate-50">
                        <span className="text-slate-500">Failed</span>
                        <span className="font-medium text-red-600">{failCount}</span>
                      </div>
                    )}
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-500">Contacts reviewed</span>
                      <span className="font-medium text-slate-900">{state.contacts.length}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-500">SF records scanned</span>
                      <span className="font-medium text-slate-900">{state.tasks.length}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">Next review due</span>
                      <span className="font-medium text-slate-900">{new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-slate-100 text-center">
                    <p className="text-xs text-slate-400">Manual review time: ~30 minutes per household</p>
                  </div>
                </div>

                {/* Compliance Audit Timeline */}
                {(() => {
                  const complianceTasks = state.tasks
                    .filter(t => {
                      const subj = (t.subject || "").toUpperCase();
                      return subj.includes("COMPLIANCE") || subj.includes("KYC") || subj.includes("SUITABILITY") ||
                        subj.includes("FORM CRS") || subj.includes("ADV") || subj.includes("IDENTITY") ||
                        subj.includes("TRUSTED CONTACT") || subj.includes("BENEFICIAR") || subj.includes("COMPLETENESS");
                    })
                    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

                  if (complianceTasks.length === 0) return null;

                  const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

                  return (
                    <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left max-w-md mx-auto mb-8">
                      <div className="flex items-center gap-2 mb-4">
                        <Calendar size={14} className="text-slate-400" />
                        <p className="text-xs uppercase tracking-wider text-slate-400">Compliance Timeline</p>
                      </div>
                      <div className="relative">
                        <div className="absolute left-[7px] top-2 bottom-2 w-px bg-slate-200" />
                        <div className="space-y-4">
                          {complianceTasks.slice(0, 8).map((t, i) => {
                            const isCompleted = t.status === "Completed";
                            const ds = daysSince(t.createdAt);
                            return (
                              <div key={i} className="relative flex items-start gap-3 pl-6">
                                <div className={`absolute left-0 top-1 w-[15px] h-[15px] rounded-full border-2 ${isCompleted ? "border-green-400 bg-green-50" : "border-amber-400 bg-amber-50"}`}>
                                  {isCompleted && <Check size={9} className="text-green-600 absolute top-[1px] left-[1px]" />}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm text-slate-700 leading-tight">{t.subject}</p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    <span className="text-[10px] text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</span>
                                    <span className="text-[10px] text-slate-300">·</span>
                                    <span className={`text-[10px] font-medium ${isCompleted ? "text-green-600" : ds > 14 ? "text-red-500" : "text-amber-500"}`}>
                                      {isCompleted ? "Completed" : `Open ${ds}d`}
                                    </span>
                                    {t.priority === "High" && <span className="text-[10px] text-red-400 font-medium">High Priority</span>}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                      {complianceTasks.length > 8 && (
                        <p className="text-[10px] text-slate-400 text-center mt-3">+ {complianceTasks.length - 8} more compliance records</p>
                      )}
                      <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
                          <Clock size={10} />
                          <span>Earliest: {new Date(complianceTasks[complianceTasks.length - 1].createdAt).toLocaleDateString()}</span>
                        </div>
                        <span className="text-[10px] text-slate-400">{complianceTasks.filter(t => t.status === "Completed").length}/{complianceTasks.length} resolved</span>
                      </div>
                    </div>
                  );
                })()}

                {/* Next Best Action */}
                {onNavigate && state.selectedHousehold && (() => {
                  // Check meeting recency — suggest meeting if no recent meetings
                  const meetingTasks = state.tasks.filter(t => t.subject?.toUpperCase().includes("MEETING NOTE"));
                  const now = Date.now();
                  const recentMeeting = meetingTasks.find(t => (now - new Date(t.createdAt).getTime()) < 60 * 86400000);
                  const hasFlags = state.checks.some(c => c.status === "warn" || c.status === "fail");

                  if (!recentMeeting) {
                    return (
                      <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5"><MessageSquare size={16} className="text-amber-600" /></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-amber-900">No meeting logged in 60+ days</p>
                          <p className="text-xs text-amber-700/70 mt-0.5">Schedule a check-in with {familyName} to review {hasFlags ? "the flagged compliance items" : "their financial plan progress"}.</p>
                          <button onClick={() => onNavigate!("meeting", { householdId: state.selectedHousehold!.id, familyName })} className="mt-2 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">Log Meeting →</button>
                        </div>
                      </div>
                    );
                  }
                  if (hasFlags) {
                    return (
                      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3">
                        <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5"><Shield size={16} className="text-slate-500" /></div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-slate-700">Review flagged items with {familyName}</p>
                          <p className="text-xs text-slate-400 mt-0.5">Open the family overview to see full context before addressing compliance gaps.</p>
                          <button onClick={() => onNavigate!("family" as Screen, { householdId: state.selectedHousehold!.id, familyName })} className="mt-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">View Family →</button>
                        </div>
                      </div>
                    );
                  }
                  return null;
                })()}

                <div className="flex flex-wrap gap-3 justify-center" data-tour="compliance-actions">
                  <button onClick={downloadPDF} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm"><Download size={16} /> Download Report</button>
                  {onNavigate && state.selectedHousehold && (
                    <>
                      <button onClick={() => onNavigate("family" as Screen, { householdId: state.selectedHousehold!.id, familyName })} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">View Family</button>
                      <button onClick={() => onNavigate("meeting", { householdId: state.selectedHousehold!.id, familyName })} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">Meeting Logs</button>
                      <button onClick={() => onNavigate("briefing", { householdId: state.selectedHousehold!.id, familyName })} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">View Briefing</button>
                    </>
                  )}
                  {state.householdUrl && <a href={state.householdUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">Salesforce <ExternalLink size={14} /></a>}
                  <button onClick={() => { d({ type: "RESET" }); }} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 font-medium hover:bg-slate-50 transition-colors text-sm">Check Another</button>
                  <button onClick={() => { d({ type: "RESET" }); onExit(); }} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-400 font-medium hover:bg-slate-50 transition-colors text-sm">Home</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Right pane — evidence log */}
      <div className={`${state.showRightPane ? "fixed inset-0 z-50 bg-white" : "hidden"} lg:block lg:static lg:w-[30%] border-l border-slate-200 bg-white flex flex-col print:hidden`}>
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-slate-400">Compliance Log</p>
          <button onClick={() => d({ type: "SET_SHOW_RIGHT_PANE", value: false })} aria-label="Close panel" className="lg:hidden text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {state.evidence.length === 0 ? (
            <div className="text-center mt-12"><Shield size={28} className="mx-auto text-slate-200 mb-3" /><p className="text-sm text-slate-400">Compliance activity will appear here</p><p className="text-xs text-slate-300 mt-1">Run a check to see results in real time.</p></div>
          ) : (
            <div className="space-y-1.5">
              {state.evidence.map((e, i) => (
                <div key={i} className="flex items-start gap-2 animate-fade-in">
                  <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {e.url ? (
                      <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block truncate">{e.label} →</a>
                    ) : (
                      <p className="text-xs text-slate-500 truncate">{e.label}</p>
                    )}
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
