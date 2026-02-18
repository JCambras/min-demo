"use client";
import { useState, useEffect, useMemo } from "react";
import { FileText, BookOpen, MessageSquare, Briefcase, Shield, Clock, CheckCircle, Send, ExternalLink, Loader2, Users, Mail, Phone, AlertTriangle, ChevronDown, ChevronUp, Building2, ArrowRight, Eye, EyeOff } from "lucide-react";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { callSF } from "@/lib/salesforce";
import { classifyTask, TASK_TYPE_LABELS, isComplianceReview, isMeetingNote } from "@/lib/task-subjects";
import { custodian } from "@/lib/custodian";
import type { Screen, WorkflowContext } from "@/lib/types";

interface Contact {
  id: string; firstName: string; lastName: string;
  email: string; phone: string;
}

interface Task {
  id: string; subject: string; status: string;
  priority: string; createdAt: string; dueDate: string;
  description?: string;
}

interface FamilyData {
  household: { id: string; name: string; createdAt: string; description?: string };
  contacts: Contact[];
  tasks: Task[];
  instanceUrl: string;
}

// Parse structured info from Account Description
function parseDescription(desc: string | undefined) {
  if (!desc) return null;
  const lines = desc.split("\n").map(l => l.trim()).filter(Boolean);
  const sections: { advisor?: string; accounts?: string; pte?: boolean; funding?: string[]; notes: string[] } = { notes: [] };

  for (const line of lines) {
    if (line.startsWith("Assigned Advisor:")) sections.advisor = line.replace("Assigned Advisor:", "").trim();
    else if (line.startsWith("Accounts planned:")) sections.accounts = line.replace("Accounts planned:", "").trim();
    else if (line.includes("PTE Required: YES")) sections.pte = true;
    else if (line.startsWith("•") || line.startsWith("·")) {
      if (!sections.funding) sections.funding = [];
      sections.funding.push(line.replace(/^[•·]\s*/, ""));
    }
    else if (!line.startsWith("Account opening") && !line.startsWith("───") && !line.startsWith("FUNDING DETAILS") && line.length > 3) {
      sections.notes.push(line);
    }
  }
  return sections;
}

// Mask sequences of 4+ digits, showing only the last 4
function maskDigits(text: string, show: boolean): string {
  if (show) return text;
  return text.replace(/\b(\d{4,})\b/g, (m) => "••••" + m.slice(-4));
}

function taskTypeIcon(type: string) {
  if (type === "compliance") return <Shield size={13} className="text-green-500" />;
  if (type === "docusign") return <Send size={13} className="text-blue-500" />;
  if (type === "meeting") return <MessageSquare size={13} className="text-purple-500" />;
  if (type === "followup") return <Clock size={13} className="text-orange-500" />;
  if (type === "goal") return <CheckCircle size={13} className="text-teal-500" />;
  return <Clock size={13} className="text-amber-500" />;
}

const TYPE_LABEL: Record<string, string> = { ...TASK_TYPE_LABELS, kyc: "KYC" };

export function FamilyScreen({ onExit, context, onNavigate }: {
  onExit: () => void;
  context: WorkflowContext;
  onNavigate: (screen: Screen, ctx?: WorkflowContext) => void;
}) {
  const [data, setData] = useState<FamilyData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showAllActivity, setShowAllActivity] = useState(false);
  const [completing, setCompleting] = useState<string | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [showAcctNumbers, setShowAcctNumbers] = useState(false);

  useEffect(() => {
    loadFamilyData();
  }, [context.householdId]);

  const loadFamilyData = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await callSF("getHouseholdDetail", { householdId: context.householdId });
      if (res.success) {
        setData({
          household: (res.household as FamilyData["household"]) || { id: context.householdId, name: context.familyName + " Household", createdAt: "" },
          contacts: (res.contacts || []) as FamilyData["contacts"],
          tasks: (res.tasks || []) as FamilyData["tasks"],
          instanceUrl: res.householdUrl ? (res.householdUrl as string).replace(`/${context.householdId}`, "") : "",
        });
      } else {
        setError("Could not load family data.");
      }
    } catch {
      setError("Could not load family data.");
    }
    setLoading(false);
  };

  const handleCompleteTask = async (taskId: string) => {
    setCompleting(taskId);
    try {
      await callSF("completeTask", { taskId });
      setCompleted(prev => { const s = new Set(prev); s.add(taskId); return s; });
      // Reload family data after a brief pause so the user sees the checkmark
      setTimeout(() => loadFamilyData(), 600);
    } catch {
      // silently fail — the user can still click "Open in Salesforce"
    }
    setCompleting(null);
  };

  const familyName = context.familyName || "Client";
  const baseUrl = data?.instanceUrl || "";

  // Derived data
  const parsed = useMemo(() => parseDescription(data?.household.description), [data]);
  const allTasks = data?.tasks || [];
  const openTasks = allTasks.filter(t => t.status !== "Completed");
  const completedTasks = allTasks.filter(t => t.status === "Completed");
  const unsignedTasks = openTasks.filter(t => classifyTask(t.subject) === "docusign");
  const followUps = openTasks.filter(t => classifyTask(t.subject) === "followup");

  const complianceReviews = allTasks
    .filter(t => isComplianceReview(t.subject))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  const hasComplianceReview = complianceReviews.length > 0;

  const meetingNotes = allTasks
    .filter(t => isMeetingNote(t.subject))
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  const totalTasks = allTasks.length;
  const completionPct = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 100) : 0;

  const lastActivity = allTasks.length > 0
    ? new Date(Math.max(...allTasks.map(t => new Date(t.createdAt).getTime())))
    : null;

  const daysSinceOnboard = data?.household.createdAt
    ? Math.floor((Date.now() - new Date(data.household.createdAt).getTime()) / 86400000)
    : null;

  if (loading) return (
    <div className="flex h-screen bg-surface items-center justify-center">
      <div className="flex items-center gap-3 text-slate-400">
        <Loader2 size={22} className="animate-spin" />
        <span className="text-sm">Loading {familyName} household...</span>
      </div>
    </div>
  );

  return (
    <div className="flex h-screen bg-surface">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-3xl w-full mx-auto px-6 py-10">

          <div className="mb-2">
            <FlowHeader title={`${familyName} Household`} stepLabel="Household Detail" onBack={onExit} />
          </div>

          {/* Header */}
          <div className="flex items-start justify-between mb-6" data-tour="family-header">
            <div>
              <div className="flex items-center gap-2 text-sm text-slate-400 flex-wrap">
                {data?.household.createdAt && (
                  <span>Client since {new Date(data.household.createdAt).toLocaleDateString()}</span>
                )}
                {daysSinceOnboard !== null && <span>· {daysSinceOnboard === 0 ? "Today" : `${daysSinceOnboard}d ago`}</span>}
                {parsed?.advisor && <span>· Assigned Advisor: <span className="text-slate-600 font-medium">{parsed.advisor}</span></span>}
              </div>
            </div>
            {baseUrl && (
              <a href={`${baseUrl}/${context.householdId}`} target="_blank" rel="noopener noreferrer"
                className="text-xs px-3 py-1.5 rounded-lg border border-slate-200 text-slate-400 hover:text-slate-600 hover:border-slate-400 transition-all inline-flex items-center gap-1.5 flex-shrink-0 mt-1">
                View in Salesforce <ExternalLink size={11} />
              </a>
            )}
          </div>

          {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-600">{error}</div>}

          {/* Quick Actions */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6" data-tour="family-actions">
            {[
              { l: "Compliance Reviews", i: FileText, a: () => onNavigate("compliance", context) },
              { l: "Client Briefing", i: BookOpen, a: () => onNavigate("briefing", context) },
              { l: "Meeting Logs", i: MessageSquare, a: () => onNavigate("meeting", context) },
              { l: "Planning & Goals", i: CheckCircle, a: () => onNavigate("planning" as Screen, context) },
              { l: "Client Portal", i: ExternalLink, a: () => onNavigate("portal" as Screen, context) },
            ].map((x, idx) => (
              <button key={idx} onClick={x.a}
                className="group flex flex-col items-center gap-2 p-4 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:shadow-md transition-all text-center">
                <x.i size={20} className="text-slate-400 group-hover:text-slate-900 transition-colors" />
                <span className="text-xs text-slate-600 group-hover:text-slate-900 font-medium">{x.l}</span>
              </button>
            ))}
          </div>

          {/* Status Summary — 5 cards */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 mb-6">
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className={`text-2xl font-light ${openTasks.length > 0 ? "text-amber-600" : "text-slate-900"}`}>{openTasks.length}</p>
              <p className="text-[10px] text-slate-400">Open Tasks</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className={`text-2xl font-light ${unsignedTasks.length > 0 ? "text-blue-600" : "text-slate-900"}`}>{unsignedTasks.length}</p>
              <p className="text-[10px] text-slate-400">Unsigned</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className={`text-2xl font-light ${followUps.length > 0 ? "text-orange-600" : "text-slate-900"}`}>{followUps.length}</p>
              <p className="text-[10px] text-slate-400">Follow-ups</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className={`text-2xl font-light ${hasComplianceReview ? "text-green-600" : "text-amber-600"}`}>{hasComplianceReview ? "✓" : "—"}</p>
              <p className="text-[10px] text-slate-400">Compliance</p>
            </div>
            <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
              <p className="text-2xl font-light text-slate-900">{meetingNotes.length}</p>
              <p className="text-[10px] text-slate-400">Meetings</p>
            </div>
          </div>

          {/* Progress Bar */}
          {totalTasks > 0 && (
            <div className="mb-6 bg-white border border-slate-200 rounded-xl p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs text-slate-400 font-medium">Workflow Progress</p>
                <p className="text-xs text-slate-500">{completedTasks.length} of {totalTasks} tasks · {completionPct}%</p>
              </div>
              <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full transition-all" style={{ width: `${completionPct}%` }} />
              </div>
              {lastActivity && (
                <p className="text-[11px] text-slate-400 mt-2">Last activity: {lastActivity.toLocaleDateString()} at {lastActivity.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
              )}
            </div>
          )}

          {/* PTE Warning */}
          {parsed?.pte && (
            <div className="mb-6 bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
              <AlertTriangle size={18} className="text-amber-500 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-amber-800">PTE 2020-02 Required</p>
                <p className="text-xs text-amber-600 mt-1">This household has rollover accounts requiring Prohibited Transaction Exemption documentation.</p>
              </div>
            </div>
          )}

          {/* Contacts */}
          {data && data.contacts.length > 0 && (
            <div className="mb-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
                <Users size={12} className="text-slate-400" /><p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Contacts</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{data.contacts.length}</span>
              </div>
              {data.contacts.map((c, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-3 border-b border-slate-50 last:border-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"><Users size={16} /></div>
                    <div>
                      <p className="text-sm font-medium text-slate-700">{c.firstName} {c.lastName}</p>
                      <div className="flex items-center gap-3 text-xs text-slate-400">
                        {c.email && <span className="inline-flex items-center gap-1"><Mail size={10} />{c.email}</span>}
                        {c.phone && <span className="inline-flex items-center gap-1"><Phone size={10} />{c.phone}</span>}
                      </div>
                    </div>
                  </div>
                  {baseUrl && <a href={`${baseUrl}/${c.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} className="text-slate-400 hover:text-blue-500 transition-colors" /></a>}
                </div>
              ))}
            </div>
          )}

          {/* Compliance History */}
          {complianceReviews.length > 0 && (
            <div className="mb-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
                <Shield size={12} className="text-slate-400" /><p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Compliance History</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{complianceReviews.length}</span>
              </div>
              {complianceReviews.map((t, i) => {
                const passed = t.subject.includes("PASSED");
                return (
                  <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      {passed ? <CheckCircle size={14} className="text-green-500 flex-shrink-0" /> : <AlertTriangle size={14} className="text-amber-500 flex-shrink-0" />}
                      <div className="min-w-0">
                        <p className="text-sm text-slate-700">{passed ? "All checks passed" : "Items flagged for attention"}</p>
                        <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()} at {new Date(t.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${passed ? "bg-green-100 text-green-600" : "bg-amber-100 text-amber-600"}`}>{passed ? "Passed" : "Flagged"}</span>
                      {baseUrl && <a href={`${baseUrl}/${t.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} className="text-slate-400 hover:text-blue-500 transition-colors" /></a>}
                    </div>
                  </div>
                );
              })}
              <div className="px-4 py-2.5">
                <button onClick={() => onNavigate("compliance", context)} className="text-xs text-slate-500 hover:text-slate-700 transition-colors">Run new review →</button>
              </div>
            </div>
          )}

          {/* Meeting Timeline */}
          {meetingNotes.length > 0 && (
            <div className="mb-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
                <MessageSquare size={12} className="text-slate-400" /><p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Meeting History</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{meetingNotes.length}</span>
                <div className="flex-1" />
                <button onClick={() => onNavigate("meeting", context)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors">Log meeting →</button>
              </div>
              <div className="relative px-4 py-3">
                <div className="absolute left-[25px] top-6 bottom-6 w-px bg-slate-200" />
                <div className="space-y-4">
                  {meetingNotes.slice(0, showAllActivity ? meetingNotes.length : 5).map((m, i) => {
                    const date = new Date(m.createdAt);
                    const typeMatch = m.subject.match(/MEETING NOTE:\s*(.+?)(?:\s*—|$)/);
                    const meetingType = typeMatch ? typeMatch[1] : "Meeting";
                    const descLines = m.description?.split("\n").filter(l => l.trim() && !l.startsWith("MEETING NOTE")) || [];
                    const notePreview = descLines.slice(0, 2).join(" ").slice(0, 120);
                    return (
                      <div key={i} className="relative flex items-start gap-3 pl-6">
                        <div className={`absolute left-0 top-0.5 w-[19px] h-[19px] rounded-full border-2 flex items-center justify-center ${i === 0 ? "border-purple-400 bg-purple-50" : "border-slate-200 bg-white"}`}>
                          <MessageSquare size={9} className={i === 0 ? "text-purple-500" : "text-slate-400"} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <p className="text-sm font-medium text-slate-700">{meetingType}</p>
                            <span className="text-[10px] text-slate-400">{date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span>
                          </div>
                          {notePreview && <p className="text-xs text-slate-500 mt-0.5 truncate">{notePreview}{notePreview.length >= 120 ? "..." : ""}</p>}
                        </div>
                        {baseUrl && <a href={`${baseUrl}/${m.id}`} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 mt-0.5"><ExternalLink size={12} className="text-slate-300 hover:text-blue-500 transition-colors" /></a>}
                      </div>
                    );
                  })}
                </div>
              </div>
              {meetingNotes.length > 5 && (
                <button onClick={() => setShowAllActivity(!showAllActivity)} className="w-full px-4 py-2 text-center text-[11px] text-slate-400 hover:text-slate-600 border-t border-slate-100">
                  {showAllActivity ? "Show recent" : `Show all ${meetingNotes.length}`}
                </button>
              )}
            </div>
          )}

          {/* Account Details (from Description) */}
          {parsed && (parsed.accounts || parsed.funding) && (
            <div className="mb-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
                <Briefcase size={12} className="text-slate-400" /><p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Account Details</p>
                <div className="flex-1" />
                <button onClick={() => setShowAcctNumbers(!showAcctNumbers)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
                  {showAcctNumbers ? <><EyeOff size={12} />Hide</> : <><Eye size={12} />Show</>} numbers
                </button>
              </div>
              <div className="px-4 py-3 space-y-3">
                {parsed.accounts && parsed.accounts !== "None yet" && (
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1">Accounts Planned</p>
                    <p className="text-sm text-slate-700">{maskDigits(parsed.accounts, showAcctNumbers)}</p>
                  </div>
                )}
                {parsed.funding && parsed.funding.length > 0 && (
                  <div>
                    <p className="text-[11px] text-slate-400 mb-1">Funding</p>
                    {parsed.funding.map((f, i) => (
                      <p key={i} className="text-sm text-slate-700">· {maskDigits(f, showAcctNumbers)}</p>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Custodian Status (Schwab Advisor Center) */}
          {data && (() => {
            // Derive custodian processing status from SF task data
            const docuTasks = data.tasks.filter(t => t.subject.toUpperCase().includes("DOCU"));
            const hasSigned = docuTasks.some(t => t.status === "Completed");
            const hasAcctOpen = data.tasks.some(t => t.subject.toUpperCase().includes("ACCOUNT") && t.status === "Completed");
            const hasFunding = data.tasks.some(t => t.subject.toUpperCase().includes("FUND") || t.subject.toUpperCase().includes("MONEYLINK"));
            const hasACAT = data.tasks.some(t => t.subject.toUpperCase().includes("TRANSFER") || t.subject.toUpperCase().includes("ACAT"));

            // Only show if there's some custodian activity
            if (!hasSigned && docuTasks.length === 0) return null;

            const steps = [
              { label: "Application Submitted", done: docuTasks.length > 0, detail: docuTasks.length > 0 ? `${docuTasks.length} envelope(s) sent` : "Pending" },
              { label: "Signatures Complete", done: hasSigned, detail: hasSigned ? "All parties signed" : "Awaiting signatures" },
              { label: "Account Number Assigned", done: hasAcctOpen, detail: hasAcctOpen ? `Account active at ${custodian.shortName}` : "Processing (1-2 business days)" },
              { label: "Funding Initiated", done: hasFunding, detail: hasFunding ? "Transfer/contribution in progress" : "Pending account setup" },
              ...(hasACAT ? [{ label: "ACAT Transfer", done: false, detail: "In transit (3-5 business days typical)" }] : []),
            ];

            const completedSteps = steps.filter(s => s.done).length;

            return (
              <div className="mb-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <Building2 size={12} className="text-slate-400" />
                    <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">{custodian.platform}</p>
                  </div>
                  <span className="text-[10px] text-slate-400">{completedSteps}/{steps.length} complete</span>
                </div>
                <div className="px-4 py-3">
                  {/* Progress bar */}
                  <div className="flex h-1.5 rounded-full overflow-hidden bg-slate-100 mb-4">
                    <div className="bg-green-400 rounded-full transition-all duration-500" style={{ width: `${(completedSteps / steps.length) * 100}%` }} />
                  </div>
                  {/* Steps */}
                  <div className="relative">
                    <div className="absolute left-[9px] top-3 bottom-3 w-px bg-slate-200" />
                    <div className="space-y-3">
                      {steps.map((step, i) => (
                        <div key={i} className="relative flex items-start gap-3 pl-7">
                          <div className={`absolute left-0 top-0.5 w-[19px] h-[19px] rounded-full border-2 flex items-center justify-center ${step.done ? "border-green-400 bg-green-50" : i === completedSteps ? "border-blue-400 bg-blue-50 animate-pulse" : "border-slate-200 bg-white"}`}>
                            {step.done && <CheckCircle size={11} className="text-green-500" />}
                            {!step.done && i === completedSteps && <ArrowRight size={9} className="text-blue-500" />}
                          </div>
                          <div>
                            <p className={`text-sm ${step.done ? "text-slate-700 font-medium" : i === completedSteps ? "text-blue-700 font-medium" : "text-slate-400"}`}>{step.label}</p>
                            <p className="text-[10px] text-slate-400">{maskDigits(step.detail, showAcctNumbers)}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Open Action Items */}
          <div className="mb-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
              <Clock size={12} className="text-slate-400" /><p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Open Action Items</p>
              <span className="text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 font-medium">{openTasks.length}</span>
            </div>
            {openTasks.length === 0 ? (
              <div className="px-4 py-8 text-center"><CheckCircle size={24} className="mx-auto text-green-200 mb-2" /><p className="text-sm font-medium text-slate-500">All clear</p><p className="text-xs text-slate-400 mt-1">No open action items for this family.</p></div>
            ) : openTasks.filter(t => !completed.has(t.id)).map((t, i) => {
              const type = classifyTask(t.subject);
              const isLoading = completing === t.id;
              return (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <button onClick={() => handleCompleteTask(t.id)} disabled={isLoading}
                    className={`w-5 h-5 rounded-full border-2 flex-shrink-0 mr-3 flex items-center justify-center transition-all ${isLoading ? "border-green-400 bg-green-50" : "border-slate-300 hover:border-green-500 hover:bg-green-50"}`}>
                    {isLoading && <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />}
                  </button>
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    {taskTypeIcon(type)}
                    <div className="min-w-0">
                      <p className="text-sm text-slate-700 truncate">{t.subject}</p>
                      <p className="text-xs text-slate-400">
                        {t.dueDate ? `Due ${new Date(t.dueDate).toLocaleDateString()}` : `Created ${new Date(t.createdAt).toLocaleDateString()}`}
                        {TYPE_LABEL[type] && <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400">{TYPE_LABEL[type]}</span>}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 ml-3">
                    {t.priority === "High" && <span className="text-[10px] px-2 py-0.5 rounded-full bg-red-100 text-red-600 font-medium">High</span>}
                    {baseUrl && <a href={`${baseUrl}/${t.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} className="text-slate-400 hover:text-blue-500 transition-colors" /></a>}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Next Best Action */}
          {(() => {
            if (!hasComplianceReview && daysSinceOnboard !== null && daysSinceOnboard >= 1) {
              return (
                <div className="mb-6 bg-emerald-50 border border-emerald-200/60 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0"><Shield size={16} className="text-emerald-600" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-emerald-900">Run first compliance review</p>
                    <p className="text-xs text-emerald-700/70 mt-0.5">No compliance review on file yet. Running one now documents your fiduciary due diligence.</p>
                    <button onClick={() => onNavigate("compliance", context)} className="text-xs font-medium text-emerald-700 mt-2 hover:text-emerald-900 transition-colors">Run Compliance Review →</button>
                  </div>
                </div>
              );
            }
            const now = Date.now();
            const recentMeeting = meetingNotes.find(t => (now - new Date(t.createdAt).getTime()) < 60 * 86400000);
            if (!recentMeeting && daysSinceOnboard !== null && daysSinceOnboard >= 7) {
              return (
                <div className="mb-6 bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3">
                  <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0"><MessageSquare size={16} className="text-amber-600" /></div>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-900">No meeting logged in 60+ days</p>
                    <p className="text-xs text-amber-700/70 mt-0.5">Schedule a check-in to keep the relationship strong and document your advisory touchpoints.</p>
                    <button onClick={() => onNavigate("meeting", context)} className="text-xs font-medium text-amber-700 mt-2 hover:text-amber-900 transition-colors">Log Meeting →</button>
                  </div>
                </div>
              );
            }
            return null;
          })()}

          {/* Completed Tasks */}
          {completedTasks.length > 0 && (
            <div className="mb-6 bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-4 py-2.5 border-b border-slate-100 flex items-center gap-3">
                <CheckCircle size={12} className="text-slate-400" /><p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Completed</p>
                <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-600 font-medium">{completedTasks.length}</span>
                <div className="flex-1" />
                {completedTasks.length > 5 && (
                  <button onClick={() => setShowAllActivity(!showAllActivity)} className="text-xs text-slate-400 hover:text-slate-600 transition-colors flex items-center gap-1">
                    {showAllActivity ? <><ChevronUp size={12} />Show less</> : <><ChevronDown size={12} />Show all</>}
                  </button>
                )}
              </div>
              {(showAllActivity ? completedTasks : completedTasks.slice(0, 5)).map((t, i) => (
                <div key={i} className="flex items-center justify-between px-4 py-2.5 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <CheckCircle size={13} className="text-green-500" />
                    <div className="min-w-0">
                      <p className="text-sm text-slate-600 truncate">{t.subject}</p>
                      <p className="text-xs text-slate-400">{new Date(t.createdAt).toLocaleDateString()}</p>
                    </div>
                  </div>
                  {baseUrl && <a href={`${baseUrl}/${t.id}`} target="_blank" rel="noopener noreferrer"><ExternalLink size={14} className="text-slate-400 hover:text-blue-500 transition-colors" /></a>}
                </div>
              ))}
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
