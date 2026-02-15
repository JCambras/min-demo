"use client";
import { useReducer, useEffect, useCallback } from "react";
import { Search, Loader2, User, FileText, Shield, Clock, AlertTriangle, CheckCircle, ExternalLink, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { callSF } from "@/lib/salesforce";
import { custodian } from "@/lib/custodian";
import type { Screen, WorkflowContext } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

type SFContact = { Id: string; FirstName: string; LastName: string; Email: string; Phone: string; CreatedDate: string };
type SFTask = { Id: string; Subject: string; Status: string; Priority: string; Description: string; CreatedDate: string; ActivityDate: string };

interface HHResult { id: string; name: string; description: string; createdDate: string; contactNames: string }

// Parsed intelligence from raw SF data
interface ClientIntel {
  householdName: string;
  onboardedDate: string;
  daysSinceOnboard: number;
  contacts: { name: string; email: string; phone: string }[];
  accountsOpened: { type: string; owner: string; date: string }[];
  fundingMethods: { type: string; detail: string }[];
  docuSignStatus: { name: string; status: string; date: string }[];
  complianceReviews: { result: string; date: string }[];
  openItems: { id: string; subject: string; priority: string; dueDate: string }[];
  completedTasks: number;
  totalTasks: number;
  description: string;
  lastActivity: string;
  hasACH: boolean;
  hasBeneficiaries: boolean;
  hasComplianceReview: boolean;
}

// ─── Intelligence Engine ─────────────────────────────────────────────────────
// Synthesizes raw SF records into advisor-readable narrative.

function buildIntel(
  household: { Name: string; Description: string; CreatedDate: string },
  contacts: SFContact[],
  tasks: SFTask[],
): ClientIntel {
  const created = new Date(household.CreatedDate);
  const daysSince = Math.floor((Date.now() - created.getTime()) / (1000 * 60 * 60 * 24));

  const subj = (t: SFTask) => (t.Subject || "").toLowerCase();
  const desc = (t: SFTask) => (t.Description || "").toLowerCase();

  // Parse accounts opened from task subjects
  const accountTasks = tasks.filter(t => subj(t).includes("account plan") || subj(t).includes("paperwork generated"));
  const accountsOpened: ClientIntel["accountsOpened"] = [];
  for (const t of accountTasks) {
    const match = t.Subject?.match(/Paperwork generated — (.+)/i);
    if (match) {
      // Extract owner from description or use household
      const ownerMatch = t.Description?.match(/Envelope: (.+)/);
      accountsOpened.push({ type: match[1], owner: ownerMatch?.[1] || household.Name, date: new Date(t.CreatedDate).toLocaleDateString() });
    }
  }

  // Parse funding
  const fundingTasks = tasks.filter(t => subj(t).includes("funding"));
  const fundingMethods: ClientIntel["fundingMethods"] = fundingTasks.map(t => {
    const d = t.Description || "";
    const typeMatch = d.match(/Funding method: (.+)/i);
    return { type: typeMatch?.[1] || "Configured", detail: t.Subject };
  });

  // DocuSign status
  const docuTasks = tasks.filter(t => subj(t).includes("send docu") || subj(t).includes("docusign"));
  const docuSignStatus: ClientIntel["docuSignStatus"] = docuTasks.map(t => ({
    name: t.Subject.replace(/^SEND DOCU — /i, ""),
    status: t.Status === "Completed" ? "Signed" : "Pending",
    date: new Date(t.CreatedDate).toLocaleDateString(),
  }));

  // Compliance reviews
  const compTasks = tasks.filter(t => subj(t).includes("compliance review"));
  const complianceReviews: ClientIntel["complianceReviews"] = compTasks.map(t => ({
    result: subj(t).includes("passed") ? "Passed" : "Flagged",
    date: new Date(t.CreatedDate).toLocaleDateString(),
  }));

  // Open items (not completed, not "informational")
  const openItems = tasks
    .filter(t => t.Status !== "Completed" && t.Priority)
    .map(t => ({ id: t.Id, subject: t.Subject, priority: t.Priority, dueDate: t.ActivityDate ? new Date(t.ActivityDate).toLocaleDateString() : "" }));

  // Flags
  const allText = tasks.map(t => `${t.Subject} ${t.Description}`).join(" ").toLowerCase();
  const hasACH = allText.includes("moneylink") || allText.includes("ach") || allText.includes("eft");
  const hasBeneficiaries = allText.includes("beneficiar");
  const hasComplianceReview = compTasks.length > 0;

  // Last activity
  const sorted = [...tasks].sort((a, b) => new Date(b.CreatedDate).getTime() - new Date(a.CreatedDate).getTime());
  const lastActivity = sorted[0] ? new Date(sorted[0].CreatedDate).toLocaleDateString() : "No activity";

  return {
    householdName: household.Name,
    onboardedDate: created.toLocaleDateString(),
    daysSinceOnboard: daysSince,
    contacts: contacts.map(c => ({ name: `${c.FirstName} ${c.LastName}`, email: c.Email || "", phone: c.Phone || "" })),
    accountsOpened,
    fundingMethods,
    docuSignStatus,
    complianceReviews,
    openItems,
    completedTasks: tasks.filter(t => t.Status === "Completed").length,
    totalTasks: tasks.length,
    description: household.Description || "",
    lastActivity,
    hasACH,
    hasBeneficiaries,
    hasComplianceReview,
  };
}

// ─── Narrative Builder ───────────────────────────────────────────────────────

function buildNarrative(intel: ClientIntel): string {
  const parts: string[] = [];
  const familyName = intel.householdName.replace(" Household", "");

  parts.push(`The ${familyName} household was onboarded ${intel.daysSinceOnboard === 0 ? "today" : `${intel.daysSinceOnboard} day${intel.daysSinceOnboard === 1 ? "" : "s"} ago`} with ${intel.contacts.length} contact${intel.contacts.length === 1 ? "" : "s"} on file.`);

  if (intel.accountsOpened.length > 0) {
    parts.push(`${intel.accountsOpened.length} account${intel.accountsOpened.length === 1 ? " was" : "s were"} opened, with paperwork generated and sent via DocuSign.`);
  }

  if (intel.docuSignStatus.length > 0) {
    const pending = intel.docuSignStatus.filter(d => d.status === "Pending").length;
    const signed = intel.docuSignStatus.filter(d => d.status === "Signed").length;
    if (pending > 0) parts.push(`${pending} DocuSign envelope${pending > 1 ? "s are" : " is"} still awaiting signature.`);
    else if (signed > 0) parts.push(`All ${signed} DocuSign envelope${signed > 1 ? "s have" : " has"} been sent.`);
  }

  if (intel.hasACH) parts.push(`${custodian.achLabel} bank link is configured.`);
  if (intel.hasBeneficiaries) parts.push("Beneficiary designations are on file.");

  if (intel.hasComplianceReview) {
    const latest = intel.complianceReviews[intel.complianceReviews.length - 1];
    parts.push(`Last compliance review: ${latest.result.toLowerCase()} on ${latest.date}.`);
  } else if (intel.daysSinceOnboard > 1) {
    parts.push("No compliance review has been run yet.");
  }

  if (intel.openItems.length > 0) {
    const highPri = intel.openItems.filter(i => i.priority === "High").length;
    parts.push(`${intel.openItems.length} open task${intel.openItems.length > 1 ? "s" : ""}${highPri > 0 ? ` (${highPri} high priority)` : ""} require attention.`);
  } else {
    parts.push("No open tasks — all clear.");
  }

  return parts.join(" ");
}

// ─── State ───────────────────────────────────────────────────────────────────

type Step = "search" | "loading" | "briefing";

interface State {
  step: Step;
  searchQuery: string;
  isSearching: boolean;
  searchResults: HHResult[];
  selected: HHResult | null;
  intel: ClientIntel | null;
  narrative: string;
  householdUrl: string;
  showRightPane: boolean;
}

const init: State = {
  step: "search", searchQuery: "", isSearching: false, searchResults: [],
  selected: null, intel: null, narrative: "", householdUrl: "", showRightPane: false,
};

type Action =
  | { type: "SET_STEP"; step: Step }
  | { type: "SET_QUERY"; v: string }
  | { type: "SET_SEARCHING"; v: boolean }
  | { type: "SET_RESULTS"; v: HHResult[] }
  | { type: "SET_SELECTED"; v: HHResult }
  | { type: "SET_INTEL"; intel: ClientIntel; narrative: string; url: string }
  | { type: "SET_RIGHT_PANE"; v: boolean }
  | { type: "RESET" };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "SET_STEP": return { ...s, step: a.step };
    case "SET_QUERY": return { ...s, searchQuery: a.v };
    case "SET_SEARCHING": return { ...s, isSearching: a.v };
    case "SET_RESULTS": return { ...s, searchResults: a.v };
    case "SET_SELECTED": return { ...s, selected: a.v };
    case "SET_INTEL": return { ...s, intel: a.intel, narrative: a.narrative, householdUrl: a.url };
    case "SET_RIGHT_PANE": return { ...s, showRightPane: a.v };
    case "RESET": return { ...init };
    default: return s;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function BriefingScreen({ onExit, initialContext, onNavigate }: { onExit: () => void; initialContext?: WorkflowContext | null; onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void }) {
  const [s, d] = useReducer(reducer, init);
  const familyName = s.selected?.name?.replace(" Household", "") || "Client";

  // Auto-load from workflow context
  useEffect(() => {
    if (initialContext && s.step === "search") {
      const hh: HHResult = { id: initialContext.householdId, name: `${initialContext.familyName} Household`, description: "", createdDate: "", contactNames: "" };
      loadBriefing(hh);
    }
  }, [initialContext]); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced search
  useEffect(() => {
    if (s.searchQuery.length < 2 || s.step !== "search") { d({ type: "SET_RESULTS", v: [] }); return; }
    d({ type: "SET_SEARCHING", v: true });
    const t = setTimeout(async () => {
      try {
        const res = await callSF("searchHouseholds", { query: s.searchQuery });
        if (res.success) d({ type: "SET_RESULTS", v: res.households.map((h: { Id: string; Name: string; Description: string; CreatedDate: string; Contacts?: { records: { FirstName: string }[] } }) => ({
          id: h.Id, name: h.Name, description: h.Description || "", createdDate: new Date(h.CreatedDate).toLocaleDateString(),
          contactNames: h.Contacts?.records?.map(c => c.FirstName).filter(Boolean).join(" & ") || "",
        })) });
      } catch { /* swallow */ }
      d({ type: "SET_SEARCHING", v: false });
    }, 400);
    return () => clearTimeout(t);
  }, [s.searchQuery, s.step]);

  const loadBriefing = useCallback(async (hh: HHResult) => {
    d({ type: "SET_SELECTED", v: hh });
    d({ type: "SET_STEP", step: "loading" });
    try {
      const res = await callSF("getHouseholdDetail", { householdId: hh.id });
      if (!res.success) throw new Error("Failed to load");
      const intel = buildIntel(res.household, res.contacts, res.tasks);
      const narrative = buildNarrative(intel);
      d({ type: "SET_INTEL", intel, narrative, url: res.householdUrl });
      d({ type: "SET_STEP", step: "briefing" });
    } catch {
      d({ type: "SET_STEP", step: "search" });
    }
  }, []);

  const goBack = () => {
    if (s.step === "search") { d({ type: "RESET" }); onExit(); }
    else if (s.step === "briefing") d({ type: "SET_STEP", step: "search" });
    else { d({ type: "RESET" }); onExit(); }
  };

  const stepLabels: Record<string, string> = { search: "Search", loading: "Loading", briefing: "Briefing" };
  const pct = s.step === "search" ? 33 : s.step === "loading" ? 66 : 100;

  return (
    <div className="flex h-screen bg-surface">
      <div className="w-full lg:w-[70%] flex flex-col">
        <FlowHeader title="Client Briefing" familyName={s.step !== "search" ? familyName : undefined} stepLabel={stepLabels[s.step] || ""} progressPct={pct} onBack={goBack} onShowPane={() => d({ type: "SET_RIGHT_PANE", v: true })} hasIndicator={!!s.intel} accent="amber" />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-4 pb-16">
          <div className="max-w-2xl w-full mx-auto">

            {s.step === "search" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Client Briefing</h2>
                <p className="text-slate-400 mb-8">Search for a household to see their complete picture.</p>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input className="h-14 text-lg rounded-xl pl-11" placeholder="Search households..." value={s.searchQuery} onChange={e => d({ type: "SET_QUERY", v: e.target.value })} autoFocus />
                  {s.isSearching && <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                </div>
                {s.searchQuery.length >= 2 && (
                  <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {s.searchResults.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-slate-400 text-center">{s.isSearching ? "Searching Salesforce..." : `No households matching \u201c${s.searchQuery}\u201d`}</p>
                    ) : s.searchResults.map((h, i) => (
                      <button key={i} onClick={() => loadBriefing(h)}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-800">{h.name}</p>
                          <ChevronRight size={16} className="text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-500">{h.contactNames ? `${h.contactNames} · ` : ""}Created {h.createdDate}</p>
                        {h.description && <p className="text-xs text-slate-400 mt-0.5 truncate">{h.description.split("\n")[0].slice(0, 80)}</p>}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {s.step === "loading" && (
              <div className="animate-fade-in space-y-5">
                {/* Header skeleton */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-6 pt-6 pb-4">
                    <div className="h-6 w-48 bg-slate-100 rounded animate-pulse mb-2" />
                    <div className="h-3 w-32 bg-slate-100 rounded animate-pulse" />
                  </div>
                  <div className="grid grid-cols-4 border-t border-slate-100">
                    {[...Array(4)].map((_, i) => (
                      <div key={i} className="px-4 py-3 text-center border-r border-slate-100 last:border-0">
                        <div className="h-6 w-8 bg-slate-100 rounded animate-pulse mx-auto mb-1" />
                        <div className="h-2 w-12 bg-slate-50 rounded animate-pulse mx-auto" />
                      </div>
                    ))}
                  </div>
                </div>
                {/* Narrative skeleton */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-2">
                  <div className="h-3 w-full bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-5/6 bg-slate-100 rounded animate-pulse" />
                  <div className="h-3 w-4/6 bg-slate-100 rounded animate-pulse" />
                </div>
                {/* Section skeletons */}
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-5 space-y-3">
                    <div className="h-3 w-24 bg-slate-100 rounded animate-pulse" />
                    <div className="space-y-2">
                      <div className="h-8 bg-slate-50 rounded-xl animate-pulse" />
                      <div className="h-8 bg-slate-50 rounded-xl animate-pulse" />
                    </div>
                  </div>
                ))}
              </div>
            )}

            {s.step === "briefing" && s.intel && (
              <div className="animate-fade-in space-y-5" data-tour="briefing-summary">
                {/* Summary Header */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                  <div className="px-6 pt-6 pb-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h2 className="text-2xl font-light text-slate-900">{s.intel.householdName.replace(" Household", "")}</h2>
                        <p className="text-sm text-slate-400 mt-1">Client since {s.intel.onboardedDate} · {s.intel.daysSinceOnboard} day{s.intel.daysSinceOnboard !== 1 ? "s" : ""}</p>
                      </div>
                      {s.householdUrl && <a href={s.householdUrl} target="_blank" rel="noopener noreferrer" className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-all inline-flex items-center gap-1.5">Salesforce <ExternalLink size={11} /></a>}
                    </div>
                  </div>
                  {/* At-a-glance stats */}
                  <div className="grid grid-cols-4 border-t border-slate-100">
                    <div className="px-4 py-3 text-center border-r border-slate-100">
                      <p className="text-xl font-light text-slate-900">{s.intel.contacts.length}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Contacts</p>
                    </div>
                    <div className="px-4 py-3 text-center border-r border-slate-100">
                      <p className="text-xl font-light text-slate-900">{s.intel.accountsOpened.length}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Accounts</p>
                    </div>
                    <div className="px-4 py-3 text-center border-r border-slate-100">
                      <p className={`text-xl font-light ${s.intel.openItems.length > 0 ? "text-amber-600" : "text-green-600"}`}>{s.intel.openItems.length}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Open Items</p>
                    </div>
                    <div className="px-4 py-3 text-center">
                      <p className={`text-xl font-light ${s.intel.hasComplianceReview ? "text-green-600" : "text-amber-600"}`} aria-label={s.intel.hasComplianceReview ? "Compliance: on file" : "Compliance: none"}>{s.intel.hasComplianceReview ? "✓" : "—"}</p>
                      <p className="text-[10px] text-slate-400 uppercase tracking-wider">Compliance</p>
                    </div>
                  </div>
                </div>

                {/* Key Highlights */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-4"><CheckCircle size={12} className="inline mr-1" /> Key Highlights</p>
                  <div className="space-y-3">
                    {s.intel.accountsOpened.length > 0 && (
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-blue-50 flex items-center justify-center flex-shrink-0 mt-0.5"><FileText size={12} className="text-blue-500" /></div>
                        <div><p className="text-sm text-slate-700">{s.intel.accountsOpened.length} account{s.intel.accountsOpened.length > 1 ? "s" : ""} opened</p><p className="text-xs text-slate-400">{s.intel.accountsOpened.map(a => a.type).join(", ")}</p></div>
                      </div>
                    )}
                    {s.intel.docuSignStatus.length > 0 && (() => {
                      const pending = s.intel.docuSignStatus.filter(d => d.status === "Pending").length;
                      return (
                        <div className="flex items-start gap-3">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${pending > 0 ? "bg-amber-50" : "bg-green-50"}`}><FileText size={12} className={pending > 0 ? "text-amber-500" : "text-green-500"} /></div>
                          <div><p className="text-sm text-slate-700">{s.intel.docuSignStatus.length} DocuSign envelope{s.intel.docuSignStatus.length > 1 ? "s" : ""}</p><p className="text-xs text-slate-400">{pending > 0 ? `${pending} awaiting signature` : "All sent"}</p></div>
                        </div>
                      );
                    })()}
                    {s.intel.hasComplianceReview ? (
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0 mt-0.5"><Shield size={12} className="text-green-500" /></div>
                        <div><p className="text-sm text-slate-700">Compliance review on file</p><p className="text-xs text-slate-400">Last: {s.intel.complianceReviews[s.intel.complianceReviews.length-1]?.result} on {s.intel.complianceReviews[s.intel.complianceReviews.length-1]?.date}</p></div>
                      </div>
                    ) : (
                      <div className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-amber-50 flex items-center justify-center flex-shrink-0 mt-0.5"><Shield size={12} className="text-amber-500" /></div>
                        <div><p className="text-sm text-amber-700">No compliance review on file</p><p className="text-xs text-slate-400">Recommend running a review</p></div>
                      </div>
                    )}
                    <div className="flex items-start gap-3">
                      <div className="w-6 h-6 rounded-full bg-slate-50 flex items-center justify-center flex-shrink-0 mt-0.5"><Clock size={12} className="text-slate-400" /></div>
                      <div><p className="text-sm text-slate-700">Last activity: {s.intel.lastActivity}</p><p className="text-xs text-slate-400">{s.intel.completedTasks} of {s.intel.totalTasks} tasks completed</p></div>
                    </div>
                  </div>
                </div>

                {/* Contacts */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">
                    <User size={12} className="inline mr-1" /> Contacts ({s.intel.contacts.length})
                  </p>
                  <div className="space-y-2">
                    {s.intel.contacts.map((c, i) => (
                      <div key={i} className="flex items-center justify-between py-2 border-b border-slate-50 last:border-0">
                        <div>
                          <p className="text-sm font-medium text-slate-800">{c.name}</p>
                          <p className="text-xs text-slate-400">{c.email}</p>
                        </div>
                        <p className="text-xs text-slate-400">{c.phone}</p>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Status Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  {/* DocuSign */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">
                      <FileText size={12} className="inline mr-1" /> DocuSign
                    </p>
                    {s.intel.docuSignStatus.length === 0 ? (
                      <p className="text-sm text-slate-400">No envelopes</p>
                    ) : (
                      <div className="space-y-2">
                        {s.intel.docuSignStatus.map((d, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <p className="text-sm text-slate-700 truncate max-w-[140px]">{d.name}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${d.status === "Signed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{d.status}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Compliance */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">
                      <Shield size={12} className="inline mr-1" /> Compliance
                    </p>
                    {s.intel.complianceReviews.length === 0 ? (
                      <div>
                        <p className="text-sm text-amber-600">No review on file</p>
                        <p className="text-xs text-slate-400 mt-1">Run a compliance review →</p>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {s.intel.complianceReviews.map((r, i) => (
                          <div key={i} className="flex items-center justify-between">
                            <p className="text-sm text-slate-700">{r.date}</p>
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${r.result === "Passed" ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"}`}>{r.result}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Quick Flags */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">
                      <CheckCircle size={12} className="inline mr-1" /> Setup Status
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${s.intel.hasACH ? "bg-green-500" : "bg-slate-200"}`} role="img" aria-label={s.intel.hasACH ? "Complete" : "Incomplete"} />
                        <span className={s.intel.hasACH ? "text-slate-700" : "text-slate-400"}>{custodian.achLabel}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${s.intel.hasBeneficiaries ? "bg-green-500" : "bg-slate-200"}`} role="img" aria-label={s.intel.hasBeneficiaries ? "Complete" : "Incomplete"} />
                        <span className={s.intel.hasBeneficiaries ? "text-slate-700" : "text-slate-400"}>Beneficiaries</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${s.intel.hasComplianceReview ? "bg-green-500" : "bg-slate-200"}`} role="img" aria-label={s.intel.hasComplianceReview ? "Complete" : "Incomplete"} />
                        <span className={s.intel.hasComplianceReview ? "text-slate-700" : "text-slate-400"}>Compliance review</span>
                      </div>
                    </div>
                  </div>

                  {/* Timeline */}
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">
                      <Clock size={12} className="inline mr-1" /> Timeline
                    </p>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-500">Onboarded</span>
                        <span className="text-slate-800 font-medium">{s.intel.onboardedDate}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Last activity</span>
                        <span className="text-slate-800 font-medium">{s.intel.lastActivity}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-500">Total records</span>
                        <span className="text-slate-800 font-medium">{s.intel.totalTasks}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Open Items */}
                {s.intel.openItems.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-2xl p-6">
                    <p className="text-xs uppercase tracking-wider text-amber-600 mb-3">
                      <AlertTriangle size={12} className="inline mr-1" /> Open Items ({s.intel.openItems.length})
                    </p>
                    <div className="space-y-2">
                      {s.intel.openItems.map((item, i) => (
                        <a key={i} href={`${s.householdUrl.replace(/\/[^/]+$/, "")}/${item.id}`} target="_blank" rel="noopener noreferrer" className="flex items-center justify-between py-1.5 group cursor-pointer hover:bg-amber-100/50 -mx-2 px-2 rounded-lg transition-colors">
                          <p className="text-sm text-amber-900 group-hover:underline">{item.subject}</p>
                          <div className="flex items-center gap-2">
                            {item.dueDate && <span className="text-xs text-amber-600">Due {item.dueDate}</span>}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${item.priority === "High" ? "bg-red-100 text-red-700" : "bg-amber-100 text-amber-700"}`}>{item.priority}</span>
                            <ExternalLink size={12} className="text-amber-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}

                {/* Account Plan (from Description) */}
                {s.intel.description && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-6">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-3"><FileText size={12} className="inline mr-1" /> Account Plan</p>
                    <p className="text-sm text-slate-600 whitespace-pre-line leading-relaxed">{s.intel.description}</p>
                  </div>
                )}

                {/* Actions */}
                <div className="flex flex-wrap gap-3">
                  {onNavigate && s.selected && (
                    <>
                      <button onClick={() => onNavigate("family" as Screen, { householdId: s.selected!.id, familyName })} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors">View Family</button>
                      <button onClick={() => onNavigate("meeting", { householdId: s.selected!.id, familyName })} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">Log Meeting</button>
                      <button onClick={() => onNavigate("compliance", { householdId: s.selected!.id, familyName })} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">Run Compliance Review</button>
                    </>
                  )}
                  {s.householdUrl && <a href={s.householdUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-slate-200 text-slate-600 text-sm font-medium hover:bg-slate-50 transition-colors">Salesforce <ExternalLink size={14} /></a>}
                  <button onClick={() => { d({ type: "RESET" }); }} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors">Search Another</button>
                  <button onClick={() => { d({ type: "RESET" }); onExit(); }} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-400 text-sm font-medium hover:bg-slate-50 transition-colors">Home</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Right pane — raw SF data for power users */}
      <div className={`${s.showRightPane ? "fixed inset-0 z-50 bg-white" : "hidden"} lg:block lg:static lg:w-[30%] border-l border-slate-200 bg-white flex flex-col print:hidden`}>
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-slate-400">Salesforce Records</p>
          <button onClick={() => d({ type: "SET_RIGHT_PANE", v: false })} aria-label="Close panel" className="lg:hidden text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {!s.intel ? (
            <p className="text-sm text-slate-300 text-center mt-8">Select a household to view records</p>
          ) : (
            <div className="space-y-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Household</p>
                <p className="text-sm text-slate-700 font-medium">{s.intel.householdName}</p>
                <p className="text-xs text-slate-400">Created {s.intel.onboardedDate}</p>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Task History ({s.intel.totalTasks})</p>
                <div className="space-y-1">
                  {s.intel.completedTasks > 0 && <p className="text-xs text-green-600">{s.intel.completedTasks} completed</p>}
                  {s.intel.openItems.length > 0 && <p className="text-xs text-amber-600">{s.intel.openItems.length} open</p>}
                </div>
              </div>
              {s.intel.accountsOpened.length > 0 && (
                <div>
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Accounts</p>
                  <div className="space-y-1">
                    {s.intel.accountsOpened.map((a, i) => (
                      <p key={i} className="text-xs text-slate-500">{a.type} — {a.date}</p>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
