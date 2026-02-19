"use client";
import { useState } from "react";
import { Check, X, AlertTriangle, ExternalLink, Shield, ChevronDown, ChevronUp, Download, MessageSquare, Calendar, Clock } from "lucide-react";
import { ContinueBtn } from "@/components/shared/FormControls";
import { WhyBubble } from "@/components/shared/WhyBubble";
import type { CheckResult, SFTask, RemediationStep } from "@/lib/compliance-engine";
import { callSF } from "@/lib/salesforce";
import { Clipboard, ListChecks, User, Building, UserCircle, Wrench } from "lucide-react";
import type { Screen, WorkflowContext } from "@/lib/types";
import { Fingerprint, BarChart3, FileText, Briefcase, Scale, Settings } from "lucide-react";

const CATEGORY_LABELS: Record<string, { label: string; icon: React.ReactNode; title?: string }> = {
  identity: { label: "Identity & KYC", icon: <Fingerprint size={18} className="text-slate-500" />, title: "Know Your Customer — identity verification requirements" },
  suitability: { label: "Suitability & Recommendations", icon: <BarChart3 size={18} className="text-slate-500" /> },
  documents: { label: "Disclosures & Delivery", icon: <FileText size={18} className="text-slate-500" /> },
  account: { label: "Account Setup", icon: <Briefcase size={18} className="text-slate-500" /> },
  regulatory: { label: "Regulatory Readiness", icon: <Scale size={18} className="text-slate-500" /> },
  firm: { label: "Firm Policies", icon: <Settings size={18} className="text-purple-500" />, title: "Custom compliance checks defined by your firm" },
};

// ─── Remediation Section ────────────────────────────────────────────────────

const ASSIGN_COLORS: Record<string, string> = {
  advisor: "bg-blue-100 text-blue-700",
  ops: "bg-purple-100 text-purple-700",
  client: "bg-amber-100 text-amber-700",
  custodian: "bg-slate-100 text-slate-600",
};

function RemediationSection({ steps, checkId, checkLabel }: { steps: RemediationStep[]; checkId: string; checkLabel: string }) {
  const [expanded, setExpanded] = useState(false);
  const [copying, setCopying] = useState(false);

  const copyPlan = () => {
    const text = steps.map(s => `${s.order}. ${s.action} [${s.assignTo}] — follow up in ${s.followUpDays}d`).join("\n");
    navigator.clipboard.writeText(`Remediation: ${checkLabel}\n${text}`);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  return (
    <div className="mt-2">
      <button onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-1.5 text-[10px] text-blue-600 hover:text-blue-800 font-medium">
        <Wrench size={10} />
        {expanded ? "Hide remediation" : "Remediation steps"}
        {expanded ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
      </button>
      {expanded && (
        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-lg p-3 animate-fade-in">
          <div className="space-y-2">
            {steps.map((s, i) => (
              <div key={i} className="flex items-start gap-2">
                <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-600 text-[10px] font-bold flex items-center justify-center flex-shrink-0 mt-0.5">{s.order}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-xs text-slate-700">{s.action}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`text-[9px] px-1.5 py-0.5 rounded font-medium ${ASSIGN_COLORS[s.assignTo] || "bg-slate-100 text-slate-600"}`}>{s.assignTo}</span>
                    {s.followUpDays > 0 && <span className="text-[9px] text-slate-400">follow up in {s.followUpDays}d</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-3 pt-2 border-t border-slate-200 flex gap-2">
            <button onClick={copyPlan} className="text-[10px] px-2.5 py-1 rounded-lg border border-slate-200 text-slate-500 hover:bg-white transition-colors flex items-center gap-1">
              <Clipboard size={10} /> {copying ? "Copied!" : "Copy plan"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Results Step ───────────────────────────────────────────────────────────

export function ResultsStep({ checks, familyName, expandedCategories, onToggleCategory, onRecordReview, onDownloadPDF, householdUrl }: {
  checks: CheckResult[];
  familyName: string;
  expandedCategories: string[];
  onToggleCategory: (cat: string) => void;
  onRecordReview: () => void;
  onDownloadPDF: () => void;
  householdUrl: string;
}) {
  const passCount = checks.filter(c => c.status === "pass").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const failCount = checks.filter(c => c.status === "fail").length;
  const categories = [...new Set(checks.map(c => c.category))];

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-light text-slate-900 mb-2">Compliance Review</h2>
      <p className="text-slate-400 mb-6">{familyName} Household · {checks.length} checks run</p>

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
          const catChecks = checks.filter(c => c.category === cat);
          const catInfo = CATEGORY_LABELS[cat] || { label: cat, icon: "📋" };
          const catFails = catChecks.filter(c => c.status === "fail").length;
          const catWarns = catChecks.filter(c => c.status === "warn").length;
          const isExpanded = expandedCategories.includes(cat);

          return (
            <div key={cat} className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <button onClick={() => onToggleCategory(cat)}
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
                        {check.remediation && check.remediation.length > 0 && (
                          <RemediationSection steps={check.remediation} checkId={check.id} checkLabel={check.label} />
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

      <ContinueBtn onClick={onRecordReview} label="Record Review in Salesforce" />
      <button onClick={onDownloadPDF} className="mt-3 w-full flex items-center justify-center gap-2 py-3 rounded-2xl border border-slate-200 text-slate-500 font-medium hover:bg-slate-50 transition-colors">
        <Download size={16} /> Download PDF Report
      </button>
    </div>
  );
}

// ─── Complete Step ──────────────────────────────────────────────────────────

export function CompleteStep({ checks, contacts, tasks, familyName, householdId, householdUrl, onNavigate, onDownloadPDF, onReset, onExit }: {
  checks: CheckResult[];
  contacts: { length: number };
  tasks: SFTask[];
  familyName: string;
  householdId: string;
  householdUrl: string;
  onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void;
  onDownloadPDF: () => void;
  onReset: () => void;
  onExit: () => void;
}) {
  const passCount = checks.filter(c => c.status === "pass").length;
  const warnCount = checks.filter(c => c.status === "warn").length;
  const failCount = checks.filter(c => c.status === "fail").length;

  // Compliance timeline tasks
  const complianceTasks = tasks
    .filter(t => {
      const subj = (t.subject || "").toUpperCase();
      return subj.includes("COMPLIANCE") || subj.includes("KYC") || subj.includes("SUITABILITY") ||
        subj.includes("FORM CRS") || subj.includes("ADV") || subj.includes("IDENTITY") ||
        subj.includes("TRUSTED CONTACT") || subj.includes("BENEFICIAR") || subj.includes("COMPLETENESS");
    })
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // Next best action
  const meetingTasks = tasks.filter(t => t.subject?.toUpperCase().includes("MEETING NOTE"));
  const now = Date.now();
  const recentMeeting = meetingTasks.find(t => (now - new Date(t.createdAt).getTime()) < 60 * 86400000);
  const hasFlags = checks.some(c => c.status === "warn" || c.status === "fail");
  const daysSince = (d: string) => Math.floor((Date.now() - new Date(d).getTime()) / 86400000);

  return (
    <div className="animate-fade-in text-center pt-8">
      <div className={`w-20 h-20 rounded-full text-white flex items-center justify-center mx-auto mb-6 ${failCount === 0 ? "bg-green-500" : "bg-amber-500"}`}>
        <Shield size={36} strokeWidth={2} />
      </div>
      <h2 className="text-3xl font-light text-slate-900 mb-3">Review Recorded</h2>
      <p className="text-lg text-slate-400 mb-1">{familyName} Household — {checks.length} compliance reviews</p>
      <p className="text-base text-slate-400 mb-6">
        {failCount === 0 ? "All checks passed. Audit-ready." : `${failCount} item${failCount > 1 ? "s" : ""} flagged for follow-up.`}
      </p>

      {/* Audit trail */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left max-w-md mx-auto mb-8">
        <p className="text-xs uppercase tracking-wider text-slate-400 mb-4 text-center">Audit Trail</p>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-slate-50">
            <span className="text-slate-500">Checks run</span>
            <span className="font-medium text-slate-900">{checks.length}</span>
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
            <span className="font-medium text-slate-900">{contacts.length}</span>
          </div>
          <div className="flex justify-between py-2 border-b border-slate-50">
            <span className="text-slate-500">SF records scanned</span>
            <span className="font-medium text-slate-900">{tasks.length}</span>
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

      {/* Compliance timeline */}
      {complianceTasks.length > 0 && (
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
      )}

      {/* Next best action */}
      {onNavigate && !recentMeeting && (
        <div className="bg-amber-50 border border-amber-200/60 rounded-2xl p-4 flex items-start gap-3 text-left max-w-md mx-auto mb-4">
          <div className="w-8 h-8 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5"><MessageSquare size={16} className="text-amber-600" /></div>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-900">No meeting logged in 60+ days</p>
            <p className="text-xs text-amber-700/70 mt-0.5">Schedule a check-in with {familyName} to review {hasFlags ? "the flagged compliance items" : "their financial plan progress"}.</p>
            <button onClick={() => onNavigate("meeting", { householdId, familyName })} className="mt-2 text-xs font-medium text-amber-800 bg-amber-100 hover:bg-amber-200 px-3 py-1.5 rounded-lg transition-colors">Log Meeting →</button>
          </div>
        </div>
      )}
      {onNavigate && recentMeeting && hasFlags && (
        <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4 flex items-start gap-3 text-left max-w-md mx-auto mb-4">
          <div className="w-8 h-8 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0 mt-0.5"><Shield size={16} className="text-slate-500" /></div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-700">Review flagged items with {familyName}</p>
            <p className="text-xs text-slate-400 mt-0.5">Open the family overview to see full context before addressing compliance gaps.</p>
            <button onClick={() => onNavigate("family" as Screen, { householdId, familyName })} className="mt-2 text-xs font-medium text-slate-600 bg-slate-100 hover:bg-slate-200 px-3 py-1.5 rounded-lg transition-colors">View Family →</button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3 justify-center" data-tour="compliance-actions">
        <button onClick={onDownloadPDF} className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm"><Download size={16} /> Download Report</button>
        {onNavigate && (
          <>
            <button onClick={() => onNavigate("family" as Screen, { householdId, familyName })} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">View Family</button>
            <button onClick={() => onNavigate("meeting", { householdId, familyName })} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">Meeting Logs</button>
            <button onClick={() => onNavigate("briefing", { householdId, familyName })} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">View Briefing</button>
          </>
        )}
        {householdUrl && <a href={householdUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">Salesforce <ExternalLink size={14} /></a>}
        <button onClick={onReset} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 font-medium hover:bg-slate-50 transition-colors text-sm">Check Another</button>
        <button onClick={onExit} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-400 font-medium hover:bg-slate-50 transition-colors text-sm">Home</button>
      </div>
    </div>
  );
}
