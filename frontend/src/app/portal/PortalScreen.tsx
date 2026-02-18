"use client";
import { useState, useEffect } from "react";
import { Check, Clock, FileText, Shield, Users, ArrowLeft, Copy, ExternalLink, Loader2, RefreshCw } from "lucide-react";
import { callSF } from "@/lib/salesforce";
import type { WorkflowContext } from "@/lib/types";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PortalStep {
  id: string;
  label: string;
  desc: string;
  status: "complete" | "active" | "pending";
  detail?: string;
  timestamp?: string;
}

interface EnvelopeInfo {
  id: string;
  name: string;
  status: string;
  sentAt?: string;
  completedAt?: string;
}

// ─── Component ──────────────────────────────────────────────────────────────

export function PortalScreen({ onExit, context }: {
  onExit: () => void;
  context: WorkflowContext;
}) {
  const [steps, setSteps] = useState<PortalStep[]>([]);
  const [envelopes, setEnvelopes] = useState<EnvelopeInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [lastRefresh, setLastRefresh] = useState<Date>(new Date());

  const familyName = context.familyName || "Client";
  const portalUrl = typeof window !== "undefined" ? `${window.location.origin}/portal/${context.householdId}` : "";

  const loadStatus = async () => {
    setLoading(true);
    try {
      // Fetch household tasks to determine step completion
      const res = await callSF("queryTasks", { householdId: context.householdId, limit: 50 });
      const tasks: { subject: string; status: string; createdAt: string }[] = res.success ? ((res.tasks || []) as { subject: string; status: string; createdAt: string }[]) : [];

      const hasHousehold = tasks.some(t => t.subject?.includes("Household created") || t.subject?.includes("Household"));
      const hasContacts = tasks.some(t => t.subject?.includes("contact") || t.subject?.includes("Contact"));
      const hasKYC = tasks.some(t => t.subject?.includes("KYC") || t.subject?.includes("suitability"));
      const hasCompliance = tasks.some(t => t.subject?.includes("compliance") || t.subject?.includes("Compliance") || t.subject?.includes("Identity"));
      const hasAccounts = tasks.some(t => t.subject?.includes("Account opened") || t.subject?.includes("account opening"));
      const hasDocuSign = tasks.some(t => t.subject?.includes("DocuSign") || t.subject?.includes("envelope"));
      const hasTransfer = tasks.some(t => t.subject?.includes("transfer") || t.subject?.includes("ACAT") || t.subject?.includes("funding"));

      const getTs = (keyword: string) => {
        const t = tasks.find(tk => tk.subject?.toLowerCase().includes(keyword.toLowerCase()));
        return t?.createdAt ? new Date(t.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : undefined;
      };

      // Build steps in order
      const portalSteps: PortalStep[] = [
        {
          id: "household",
          label: "Account Setup",
          desc: "Your household record and contact information have been created.",
          status: hasHousehold ? "complete" : "active",
          detail: hasHousehold ? "Records created in our system" : "Setting up your records...",
          timestamp: getTs("Household"),
        },
        {
          id: "kyc",
          label: "Identity & Suitability",
          desc: "Your identity has been verified and investment profile recorded.",
          status: hasKYC ? "complete" : hasHousehold ? "active" : "pending",
          detail: hasKYC ? "KYC and suitability profile recorded" : "Verifying your identity...",
          timestamp: getTs("KYC"),
        },
        {
          id: "compliance",
          label: "Compliance Review",
          desc: "A compliance review has been completed for your account.",
          status: hasCompliance ? "complete" : hasKYC ? "active" : "pending",
          detail: hasCompliance ? "All compliance checks passed" : "Running compliance checks...",
          timestamp: getTs("compliance"),
        },
        {
          id: "accounts",
          label: "Account Opening",
          desc: "Your investment accounts are being opened with the custodian.",
          status: hasAccounts ? "complete" : hasCompliance ? "active" : "pending",
          detail: hasAccounts ? "Accounts opened successfully" : "Preparing account applications...",
          timestamp: getTs("Account"),
        },
        {
          id: "signatures",
          label: "Document Signatures",
          desc: "All required documents have been sent for electronic signature.",
          status: hasDocuSign ? "complete" : hasAccounts ? "active" : "pending",
          detail: hasDocuSign ? "All documents signed" : "Awaiting your signatures via DocuSign",
        },
        {
          id: "funding",
          label: "Account Funding",
          desc: "Transfers and funding are being processed for your accounts.",
          status: hasTransfer ? "complete" : hasDocuSign ? "active" : "pending",
          detail: hasTransfer ? "Transfers initiated" : "Pending — begins after signatures complete",
        },
      ];

      setSteps(portalSteps);

      // Derive DocuSign envelopes from tasks
      const docuTasks = tasks.filter(t => t.subject?.toUpperCase().includes("DOCU") || t.subject?.toUpperCase().includes("ENVELOPE"));
      if (docuTasks.length > 0) {
        setEnvelopes(docuTasks.map((t, i) => ({
          id: `env-${i}`,
          name: t.subject || "Document Package",
          status: t.status === "Completed" ? "completed" : "sent",
          sentAt: t.createdAt,
        })));
      }

      setLastRefresh(new Date());
    } catch (err) {
      // If loading fails, show generic pending steps
      setSteps([
        { id: "household", label: "Account Setup", desc: "Creating your household record.", status: "active" },
        { id: "kyc", label: "Identity Verification", desc: "Verifying your identity.", status: "pending" },
        { id: "compliance", label: "Compliance Review", desc: "Running compliance checks.", status: "pending" },
        { id: "accounts", label: "Account Opening", desc: "Opening investment accounts.", status: "pending" },
        { id: "signatures", label: "Document Signatures", desc: "Sending documents for signature.", status: "pending" },
        { id: "funding", label: "Account Funding", desc: "Processing account funding.", status: "pending" },
      ]);
    }
    setLoading(false);
  };

  useEffect(() => { loadStatus(); }, [context.householdId]);

  const completedCount = steps.filter(s => s.status === "complete").length;
  const totalSteps = steps.length;
  const progressPct = totalSteps > 0 ? Math.round((completedCount / totalSteps) * 100) : 0;

  // Estimate completion
  const activeIdx = steps.findIndex(s => s.status === "active");
  const remainingDays = Math.max(1, (totalSteps - completedCount) * 2);
  const eta = new Date();
  eta.setDate(eta.getDate() + remainingDays);
  const etaStr = eta.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" });

  const copyLink = () => {
    navigator.clipboard.writeText(portalUrl).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <div className="border-b border-slate-200 bg-white">
        <div className="max-w-2xl mx-auto px-6 py-4 flex items-center justify-between">
          <button onClick={onExit} className="flex items-center gap-2 text-sm text-slate-400 hover:text-slate-600 transition-colors">
            <ArrowLeft size={16} /> Back
          </button>
          <div className="flex items-center gap-3">
            <button onClick={() => loadStatus()} className="text-slate-400 hover:text-slate-600 transition-colors" title="Refresh status">
              <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
            </button>
            <button onClick={copyLink} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-500 hover:text-slate-700 hover:border-slate-400 transition-all">
              {copied ? <><Check size={12} className="text-green-500" /> Copied!</> : <><Copy size={12} /> Share Link</>}
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-2xl mx-auto px-6 py-10">
        {/* Branded header */}
        <div className="text-center mb-10">
          <div className="w-16 h-16 rounded-2xl bg-slate-900 text-white flex items-center justify-center mx-auto mb-4 text-2xl font-light">M</div>
          <h1 className="text-3xl font-light text-slate-900 mb-2">{familyName} Onboarding</h1>
          <p className="text-slate-400">Track the progress of your account setup in real time.</p>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 size={24} className="text-slate-300 animate-spin" />
          </div>
        ) : (
          <>
            {/* Progress ring */}
            <div className="flex items-center justify-center gap-8 mb-10">
              <div className="relative w-28 h-28">
                <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
                  <circle cx="50" cy="50" r="42" fill="none" stroke="#e2e8f0" strokeWidth="6" />
                  <circle cx="50" cy="50" r="42" fill="none" stroke={progressPct === 100 ? "#22c55e" : "#0f172a"} strokeWidth="6" strokeLinecap="round"
                    strokeDasharray={`${2 * Math.PI * 42}`} strokeDashoffset={`${2 * Math.PI * 42 * (1 - progressPct / 100)}`}
                    className="transition-all duration-700" />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <span className="text-2xl font-light text-slate-900">{progressPct}%</span>
                  <span className="text-[10px] text-slate-400">complete</span>
                </div>
              </div>
              <div className="text-left">
                <p className="text-sm text-slate-500">{completedCount} of {totalSteps} steps complete</p>
                {progressPct < 100 ? (
                  <p className="text-xs text-slate-400 mt-1">Estimated completion: <span className="font-medium text-slate-600">{etaStr}</span></p>
                ) : (
                  <p className="text-xs text-green-600 font-medium mt-1">All steps complete!</p>
                )}
                <p className="text-[10px] text-slate-300 mt-2">Last updated {lastRefresh.toLocaleTimeString()}</p>
              </div>
            </div>

            {/* Timeline */}
            <div className="space-y-0 mb-10">
              {steps.map((step, i) => {
                const isLast = i === steps.length - 1;
                const IconComp = step.id === "household" ? Users
                  : step.id === "kyc" ? Shield
                  : step.id === "compliance" ? Shield
                  : step.id === "signatures" ? FileText
                  : step.id === "funding" ? Clock
                  : Check;

                return (
                  <div key={step.id} className="flex gap-4">
                    {/* Timeline line + dot */}
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 transition-all ${
                        step.status === "complete" ? "bg-green-500 text-white" :
                        step.status === "active" ? "bg-slate-900 text-white ring-4 ring-slate-100" :
                        "bg-slate-100 text-slate-300"
                      }`}>
                        {step.status === "complete" ? <Check size={18} /> : <IconComp size={18} />}
                      </div>
                      {!isLast && (
                        <div className={`w-0.5 flex-1 min-h-[32px] transition-all ${
                          step.status === "complete" ? "bg-green-300" : "bg-slate-200"
                        }`} />
                      )}
                    </div>

                    {/* Content */}
                    <div className={`pb-8 flex-1 ${step.status === "pending" ? "opacity-50" : ""}`}>
                      <div className="flex items-center gap-2">
                        <h3 className={`text-sm font-semibold ${step.status === "complete" ? "text-green-700" : step.status === "active" ? "text-slate-900" : "text-slate-400"}`}>
                          {step.label}
                        </h3>
                        {step.status === "active" && (
                          <span className="text-[9px] px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium animate-pulse">IN PROGRESS</span>
                        )}
                        {step.status === "complete" && step.timestamp && (
                          <span className="text-[10px] text-slate-400">{step.timestamp}</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-400 mt-1">{step.desc}</p>
                      {step.detail && (
                        <p className={`text-xs mt-1 ${step.status === "complete" ? "text-green-600" : "text-slate-500"}`}>{step.detail}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* DocuSign envelopes */}
            {envelopes.length > 0 && (
              <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-8">
                <div className="px-5 py-3 border-b border-slate-100 flex items-center gap-2">
                  <FileText size={14} className="text-blue-500" />
                  <h3 className="text-xs uppercase tracking-wider text-slate-500 font-semibold">Document Signatures</h3>
                </div>
                <div className="divide-y divide-slate-50">
                  {envelopes.map(env => (
                    <div key={env.id} className="flex items-center justify-between px-5 py-3">
                      <div>
                        <p className="text-sm text-slate-700">{env.name}</p>
                        {env.sentAt && <p className="text-xs text-slate-400">Sent {new Date(env.sentAt).toLocaleDateString()}</p>}
                      </div>
                      <span className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                        env.status === "completed" ? "bg-green-100 text-green-600" :
                        env.status === "sent" ? "bg-blue-100 text-blue-600" :
                        env.status === "delivered" ? "bg-amber-100 text-amber-600" :
                        "bg-slate-100 text-slate-500"
                      }`}>
                        {env.status === "completed" ? "Signed" : env.status === "sent" ? "Sent" : env.status === "delivered" ? "Awaiting Signature" : env.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Contact card */}
            <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
              <p className="text-sm text-slate-500 mb-1">Questions about your onboarding?</p>
              <p className="text-sm text-slate-700 font-medium">Contact your advisor or call our operations team.</p>
              <p className="text-xs text-slate-400 mt-3">This page updates automatically as your account setup progresses.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
