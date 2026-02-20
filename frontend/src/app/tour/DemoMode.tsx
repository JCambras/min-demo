"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Play, X, ChevronRight, ChevronDown, Sparkles, User, Wrench, Crown, CheckCircle2 } from "lucide-react";
import { useDemoMode } from "@/lib/demo-context";
import { DEMO_HOUSEHOLDS } from "@/lib/demo-data";
import type { Screen, WorkflowContext, UserRole } from "@/lib/types";
import type { HomeStats } from "@/lib/home-stats";
import type { AppAction } from "@/lib/app-state";

// ─── Tour Step Definitions ─────────────────────────────────────────────────

export interface TourStep {
  id: string;
  target: string;
  title: string;
  body: string;
  advance: "next" | "navigate";
  position: "top" | "bottom" | "left" | "right";
  screen?: string;
  navigateTo?: { screen: Screen; ctxSource?: "firstHousehold" };
  waitFor?: string;
  requiresData?: boolean;
  buttonLabel?: string;
  clickTarget?: boolean;
  autoDelay?: number;
  clickDelay?: number;
  waitTimeout?: number;
  targetTimeout?: number;
  // Guided tour extensions (all optional, backward compatible)
  act?: 1 | 2 | 3;
  actLabel?: string;
  role?: UserRole;
  prompt?: string;
  narrative?: string;
  isTransition?: boolean;
  transitionTo?: string;
  isCheckpoint?: boolean;
  checkpointItems?: string[];
  waitForUserAction?: boolean;
  userActionTarget?: string;
  userActionLabel?: string;
  width?: "normal" | "wide";
}

export const GOLDEN_PATH: TourStep[] = [
  {
    id: "welcome",
    target: "[data-tour='stat-cards']",
    title: "Your morning dashboard",
    body: "These cards show your entire practice at a glance — overdue tasks, compliance reviews, unsigned documents.",
    advance: "navigate",
    position: "bottom",
    screen: "home",
    navigateTo: { screen: "compliance", ctxSource: "firstHousehold" },
    buttonLabel: "See Compliance →",
  },
  {
    id: "compliance-running",
    target: "[data-tour='compliance-progress']",
    title: "12 checks. 30 seconds.",
    body: "One click launches a full compliance review — KYC, suitability, Reg BI, FINRA 4512. Watch it work.",
    advance: "next",
    position: "bottom",
    screen: "compliance",
    waitFor: "[data-tour='compliance-actions']",
    requiresData: true,
  },
  {
    id: "compliance-done",
    target: "[data-tour='compliance-actions']",
    title: "Review complete. What's next?",
    body: "Download the PDF, view the family, or log a meeting. Every next step is one click away.",
    advance: "navigate",
    position: "top",
    screen: "compliance",
    navigateTo: { screen: "family", ctxSource: "firstHousehold" },
    requiresData: true,
    buttonLabel: "See Family →",
  },
  {
    id: "family-overview",
    target: "[data-tour='family-header']",
    title: "The complete client picture",
    body: "Contacts, tasks, compliance history, account details — everything you need before a client call.",
    advance: "next",
    position: "bottom",
    screen: "family",
    requiresData: true,
  },
  {
    id: "family-actions",
    target: "[data-tour='family-actions']",
    title: "Every workflow, one click away",
    body: "Briefing, compliance, meeting logs, planning — all with context pre-loaded.",
    advance: "navigate",
    position: "bottom",
    screen: "family",
    navigateTo: { screen: "briefing", ctxSource: "firstHousehold" },
    requiresData: true,
    buttonLabel: "See Briefing →",
  },
  {
    id: "briefing",
    target: "[data-tour='briefing-summary']",
    title: "15 minutes of prep, done in 5 seconds",
    body: "A structured summary replaces digging through your CRM. Read this before every client call.",
    advance: "navigate",
    position: "bottom",
    screen: "briefing",
    navigateTo: { screen: "home" },
    requiresData: true,
    buttonLabel: "Back to Home →",
  },
  {
    id: "finale",
    target: "[data-tour='home-greeting']",
    title: "This is your practice. Every morning.",
    body: "Stat cards, family search, one-click workflows. Min replaces the spreadsheets and the 60-hour weeks.",
    advance: "next",
    position: "bottom",
    screen: "home",
  },
];

export const DEMO_GOLDEN_PATH: TourStep[] = [
  {
    id: "demo-households",
    target: "[data-tour='household-cards']",
    title: "Your Monday morning",
    body: "8 households at a glance — color-coded by health. Red means something needs your attention today.",
    advance: "next",
    position: "bottom",
    screen: "dashboard",
    autoDelay: 5000,
  },
  {
    id: "demo-drill",
    target: "[data-tour='household-cards']",
    title: "Accounts stuck in process",
    body: "The pipeline shows where every household sits in your onboarding flow — and which ones are stuck.",
    advance: "navigate",
    position: "bottom",
    screen: "dashboard",
    navigateTo: { screen: "family", ctxSource: "firstHousehold" },
    buttonLabel: "Drill into a problem →",
    autoDelay: 6000,
  },
  {
    id: "demo-family",
    target: "[data-tour='family-header']",
    title: "Drill into the problem",
    body: "Click any red household to see the full picture — contacts, tasks, compliance gaps, custodian status.",
    advance: "next",
    position: "bottom",
    screen: "family",
    requiresData: true,
    autoDelay: 5000,
    targetTimeout: 3000,
  },
  {
    id: "demo-why",
    target: "[data-tour='why-button']",
    title: "Plain English decomposition",
    body: "Click 'Why this score?' to see exactly what's dragging this household's health down — weighted and sourced.",
    advance: "next",
    position: "bottom",
    screen: "family",
    requiresData: true,
    clickTarget: true,
    autoDelay: 6000,
    clickDelay: 800,
    targetTimeout: 3000,
  },
  {
    id: "demo-actions",
    target: "[data-tour='suggested-actions']",
    title: "One click: send to CRM",
    body: "Each suggested action becomes a task in Salesforce with one click. Undo within 10 seconds if you change your mind.",
    advance: "navigate",
    position: "bottom",
    screen: "family",
    navigateTo: { screen: "flow" as Screen },
    requiresData: true,
    buttonLabel: "See Account Opening →",
    autoDelay: 6000,
    targetTimeout: 5000,
  },
  {
    id: "demo-quickfill",
    target: "[data-tour='quick-fill']",
    title: "One click: paperwork done",
    body: "Quick-fill pulls CRM data into every form field. No retyping names, SSNs, or addresses.",
    advance: "next",
    position: "bottom",
    screen: "flow",
    requiresData: true,
    clickTarget: true,
    clickDelay: 800,
    waitFor: "[data-tour='nigo-summary']",
    waitTimeout: 5000,
    autoDelay: 7000,
    targetTimeout: 3000,
  },
  {
    id: "demo-nigo",
    target: "[data-tour='nigo-summary']",
    title: "The custodian knows",
    body: "Min embeds Schwab's NIGO rejection rules directly into the paperwork flow. No more kicked-back applications.",
    advance: "next",
    position: "top",
    screen: "flow",
    requiresData: true,
    autoDelay: 5000,
    targetTimeout: 3000,
  },
];

// ─── Guided Tour Path (22 steps, 3 acts) ─────────────────────────────────

export const GUIDED_TOUR_PATH: TourStep[] = [
  // ── Act 1: Advisor View ──
  {
    id: "gt-act1-intro", target: "body", title: "Act 1: The Advisor's Morning",
    body: "Step into the advisor's shoes. See how Min transforms a 60-minute morning routine into 5 minutes of clarity.",
    advance: "next", position: "bottom",
    isTransition: true, act: 1, actLabel: "Advisor View", role: "advisor",
    transitionTo: "Home dashboard, stat cards, AI insights, client drill-down, health score decomposition, and briefing prep.",
    navigateTo: { screen: "home" }, targetTimeout: 5000,
  },
  {
    id: "gt-adv-home", target: "[data-tour='home-greeting']", title: "The advisor's command center",
    body: "Every morning starts here. Stat cards surface what needs attention — overdue tasks, unsigned documents, compliance gaps.",
    advance: "next", position: "bottom", act: 1, actLabel: "Advisor View",
    narrative: "The greeting, stat cards, and insights are personalized to this advisor's book of business.",
    width: "wide", targetTimeout: 3000,
  },
  {
    id: "gt-adv-insights", target: "[data-tour='insights']", title: "AI-generated insights",
    body: "Min scans your practice data overnight and surfaces the most urgent items — no digging required.",
    advance: "next", position: "bottom", act: 1, actLabel: "Advisor View",
    prompt: "Read the insight cards to see what Min flagged.",
    width: "wide", targetTimeout: 3000,
  },
  {
    id: "gt-adv-drill", target: "[data-tour='stat-readyForReview']", title: "Drill into Thompson",
    body: "The 'Needs Review' card shows households that haven't had a compliance review. Let's look at Thompson.",
    advance: "navigate", position: "bottom", act: 1, actLabel: "Advisor View",
    navigateTo: { screen: "family", ctxSource: "firstHousehold" },
    buttonLabel: "Open Thompson →", targetTimeout: 3000,
  },
  {
    id: "gt-adv-family", target: "[data-tour='family-header']", title: "The complete client picture",
    body: "Contacts, tasks, compliance history, account details — everything before a client call, in one screen.",
    advance: "next", position: "bottom", act: 1, actLabel: "Advisor View",
    narrative: "Notice the health score badge. Red means this household needs attention.",
    width: "wide", targetTimeout: 3000,
  },
  {
    id: "gt-adv-why", target: "[data-tour='why-button']", title: "Health score decomposition",
    body: "Click 'Why this score?' to see exactly what's dragging Thompson's health down — weighted and sourced.",
    advance: "next", position: "bottom", act: 1, actLabel: "Advisor View",
    prompt: "Click the 'Why this score?' button", waitForUserAction: true,
    userActionTarget: "[data-tour='why-button']", userActionLabel: "Click 'Why this score?'",
    targetTimeout: 3000,
  },
  {
    id: "gt-adv-actions", target: "[data-tour='suggested-actions']", title: "One-click CRM task creation",
    body: "Each suggested action becomes a task in Salesforce with one click. Let's head to the briefing next.",
    advance: "navigate", position: "bottom", act: 1, actLabel: "Advisor View",
    navigateTo: { screen: "briefing", ctxSource: "firstHousehold" },
    buttonLabel: "See Briefing →", targetTimeout: 5000,
  },
  {
    id: "gt-act1-end", target: "body", title: "Act 1 Complete",
    body: "You've seen the advisor's morning workflow — from dashboard to client drill-down to briefing prep.",
    advance: "next", position: "bottom",
    isCheckpoint: true, act: 1, actLabel: "Advisor View",
    checkpointItems: [
      "Personalized home dashboard with stat cards",
      "AI-generated insights surfacing urgent items",
      "One-click drill into any household",
      "Health score with weighted decomposition",
      "Suggested actions that sync to Salesforce",
      "Structured briefing for client calls",
    ],
    buttonLabel: "Continue to Act 2 →", targetTimeout: 5000,
  },

  // ── Act 2: Operations View ──
  {
    id: "gt-act2-intro", target: "body", title: "Act 2: Operations Opens an Account",
    body: "Now switch to operations. See how Min eliminates NIGO rejections and cuts account opening from days to minutes.",
    advance: "next", position: "bottom",
    isTransition: true, act: 2, actLabel: "Operations View", role: "operations",
    transitionTo: "Operations home, account opening flow, quick-fill from CRM, NIGO prevention, and compliance checks.",
    navigateTo: { screen: "home" }, targetTimeout: 5000,
  },
  {
    id: "gt-ops-home", target: "[data-tour='home-greeting']", title: "The operations home screen",
    body: "Operations sees a different action grid — onboarding, account opening, compliance, task management, and workflows.",
    advance: "navigate", position: "bottom", act: 2, actLabel: "Operations View",
    narrative: "Notice: the actions grid is role-specific. Operators see operational tools, not advisory ones.",
    navigateTo: { screen: "flow" as Screen },
    buttonLabel: "Open an Account →", width: "wide", targetTimeout: 3000,
  },
  {
    id: "gt-ops-quickfill", target: "[data-tour='quick-fill']", title: "Quick-fill: CRM data in one click",
    body: "Quick-fill pulls the client's CRM data into every form field. No retyping names, SSNs, or addresses.",
    advance: "next", position: "bottom", act: 2, actLabel: "Operations View",
    prompt: "Click the Quick-fill button", waitForUserAction: true,
    userActionTarget: "[data-tour='quick-fill']", userActionLabel: "Click Quick-fill",
    targetTimeout: 3000,
  },
  {
    id: "gt-ops-nigo", target: "[data-tour='nigo-summary']", title: "NIGO prevention built in",
    body: "Min embeds Schwab's NIGO rejection rules directly into the form. Errors are caught before submission.",
    advance: "next", position: "top", act: 2, actLabel: "Operations View",
    waitFor: "[data-tour='nigo-summary']", waitTimeout: 5000,
    narrative: "This single feature eliminates the #1 cause of account opening delays.",
    width: "wide", targetTimeout: 5000,
  },
  {
    id: "gt-ops-compliance-nav", target: "[data-tour='nigo-summary']", title: "Post-account: run compliance",
    body: "After paperwork is done, run a compliance review to catch any remaining gaps before the account goes live.",
    advance: "navigate", position: "top", act: 2, actLabel: "Operations View",
    navigateTo: { screen: "compliance", ctxSource: "firstHousehold" },
    buttonLabel: "Run Compliance →", targetTimeout: 3000,
  },
  {
    id: "gt-ops-compliance-scan", target: "[data-tour='compliance-progress']", title: "12 automated checks",
    body: "KYC, suitability, Reg BI, FINRA 4512 — all checked automatically. Watch the scan run in real time.",
    advance: "next", position: "bottom", act: 2, actLabel: "Operations View",
    waitFor: "[data-tour='compliance-actions']", waitTimeout: 8000,
    targetTimeout: 3000,
  },
  {
    id: "gt-act2-end", target: "body", title: "Act 2 Complete",
    body: "You've seen the full operations workflow — from account opening to compliance review.",
    advance: "next", position: "bottom",
    isCheckpoint: true, act: 2, actLabel: "Operations View",
    checkpointItems: [
      "Role-specific operations home screen",
      "Quick-fill pulls CRM data into forms",
      "Built-in NIGO prevention catches errors",
      "One-click compliance review post-account",
      "12 automated compliance checks in 30 seconds",
    ],
    buttonLabel: "Continue to Act 3 →", targetTimeout: 5000,
  },

  // ── Act 3: Principal View ──
  {
    id: "gt-act3-intro", target: "body", title: "Act 3: The Principal's Dashboard",
    body: "Finally, the principal's view. Full practice visibility — health scores, risk radar, data quality, and reconciliation.",
    advance: "next", position: "bottom",
    isTransition: true, act: 3, actLabel: "Principal View", role: "principal",
    transitionTo: "Practice dashboard, AUM-weighted scores, Risk Radar with snooze/dismiss, data quality, and reconciliation.",
    navigateTo: { screen: "dashboard" }, targetTimeout: 5000,
  },
  {
    id: "gt-prin-cards", target: "[data-tour='household-cards']", title: "Practice-wide household health",
    body: "Every household color-coded by health. Red means something needs your attention today.",
    advance: "next", position: "bottom", act: 3, actLabel: "Principal View",
    width: "wide", targetTimeout: 3000,
  },
  {
    id: "gt-prin-aum", target: "[data-tour='aum-weight-toggle']", title: "AUM-weighted health score",
    body: "Toggle to AUM-weighted view to prioritize high-value client health in your practice score.",
    advance: "next", position: "bottom", act: 3, actLabel: "Principal View",
    prompt: "Click the weight toggle", waitForUserAction: true,
    userActionTarget: "[data-tour='aum-weight-toggle']", userActionLabel: "Click toggle",
    targetTimeout: 3000,
  },
  {
    id: "gt-prin-radar", target: "[data-tour='risk-radar']", title: "Risk Radar: snooze & dismiss",
    body: "Critical risks surfaced automatically. Snooze items you're tracking, dismiss false positives.",
    advance: "next", position: "top", act: 3, actLabel: "Principal View",
    narrative: "The Risk Radar pulls from compliance gaps, overdue tasks, and unsigned documents.",
    width: "wide", targetTimeout: 3000,
  },
  {
    id: "gt-prin-quality", target: "[data-tour='data-quality']", title: "Data quality monitoring",
    body: "Track missing fields, stale data, and CRM hygiene across your entire practice.",
    advance: "next", position: "top", act: 3, actLabel: "Principal View",
    targetTimeout: 3000,
  },
  {
    id: "gt-prin-recon", target: "[data-tour='reconciliation']", title: "Custodian-CRM reconciliation",
    body: "Compare custodian records against your CRM to catch discrepancies before they become audit findings.",
    advance: "next", position: "top", act: 3, actLabel: "Principal View",
    targetTimeout: 3000,
  },
  {
    id: "gt-finale", target: "body", title: "Tour Complete",
    body: "You've seen Min from every angle — advisor, operations, and principal. This is your practice, simplified.",
    advance: "next", position: "bottom",
    isCheckpoint: true, act: 3, actLabel: "Principal View",
    checkpointItems: [
      "Practice-wide household health dashboard",
      "AUM-weighted scoring for high-value clients",
      "Risk Radar with snooze and dismiss",
      "Data quality monitoring across the practice",
      "Custodian-CRM reconciliation",
    ],
    buttonLabel: "Finish Tour", targetTimeout: 5000,
  },
];

// ─── Act step counting helper ───────────────────────────────────────────

function getActStepInfo(steps: TourStep[], stepIndex: number): { actNum: number; actStep: number; actTotal: number } | null {
  const step = steps[stepIndex];
  if (!step?.act) return null;
  const actSteps = steps.filter(s => s.act === step.act && !s.isTransition && !s.isCheckpoint);
  const actIdx = actSteps.findIndex(s => s.id === step.id);
  return { actNum: step.act, actStep: actIdx + 1, actTotal: actSteps.length };
}

// ─── Role Icons ────────────────────────────────────────────────────────────

const ROLE_ICON: Record<string, React.ElementType> = { advisor: User, operations: Wrench, principal: Crown };

// ─── TransitionCard ────────────────────────────────────────────────────────

function TransitionCard({ step, onNext, onSkip }: { step: TourStep; onNext: () => void; onSkip: () => void }) {
  const RoleIcon = step.role ? ROLE_ICON[step.role] || User : User;
  return (
    <div className="fixed inset-0 z-[10003] flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-[520px] mx-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Amber gradient accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500" />

          <div className="px-8 pt-8 pb-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center">
                  <span className="text-sm font-bold text-amber-700">ACT {step.act}</span>
                </div>
                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center">
                  <RoleIcon size={20} className="text-slate-600" />
                </div>
                {step.actLabel && (
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{step.actLabel}</span>
                )}
              </div>
              <button onClick={onSkip} aria-label="Skip tour" className="text-slate-300 hover:text-slate-500 transition-colors">
                <X size={16} />
              </button>
            </div>

            <h2 className="text-2xl font-semibold text-slate-900 mb-3">{step.title}</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">{step.body}</p>

            {step.transitionTo && (
              <div className="bg-slate-50 rounded-xl px-4 py-3 mb-2">
                <p className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mb-1">What we&apos;ll cover</p>
                <p className="text-xs text-slate-600 leading-relaxed">{step.transitionTo}</p>
              </div>
            )}
          </div>

          <div className="px-8 pb-6 pt-4">
            <button onClick={onNext} className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm">
              {step.buttonLabel || "Begin"} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── CheckpointCard ────────────────────────────────────────────────────────

function CheckpointCard({ step, onNext, onSkip }: { step: TourStep; onNext: () => void; onSkip: () => void }) {
  return (
    <div className="fixed inset-0 z-[10003] flex items-center justify-center animate-fade-in">
      <div className="w-full max-w-[520px] mx-4">
        <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
          {/* Green accent bar */}
          <div className="h-1.5 bg-gradient-to-r from-green-400 via-emerald-400 to-green-500" />

          <div className="px-8 pt-8 pb-2">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-green-100 flex items-center justify-center">
                  <CheckCircle2 size={20} className="text-green-600" />
                </div>
                {step.actLabel && (
                  <span className="text-xs font-medium text-slate-400 uppercase tracking-wider">{step.actLabel}</span>
                )}
              </div>
              <button onClick={onSkip} aria-label="Skip tour" className="text-slate-300 hover:text-slate-500 transition-colors">
                <X size={16} />
              </button>
            </div>

            <h2 className="text-2xl font-semibold text-slate-900 mb-3">{step.title}</h2>
            <p className="text-sm text-slate-500 leading-relaxed mb-4">{step.body}</p>

            {step.checkpointItems && step.checkpointItems.length > 0 && (
              <div className="space-y-2 mb-2">
                {step.checkpointItems.map((item, i) => (
                  <div key={i} className="flex items-start gap-2.5">
                    <CheckCircle2 size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                    <span className="text-sm text-slate-600">{item}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="px-8 pb-6 pt-4">
            <button onClick={onNext} className="w-full flex items-center justify-center gap-2 h-11 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm">
              {step.buttonLabel || "Continue"} <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tooltip ────────────────────────────────────────────────────────────────

function TooltipCard({ step, stepIndex, totalSteps, onNext, onSkip, rect, hasData, autoPlay, tourType, actInfo, waitingForUser }: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  rect: DOMRect | null;
  hasData: boolean;
  autoPlay?: boolean;
  tourType?: "quick" | "demo" | "guided";
  actInfo?: { actNum: number; actStep: number; actTotal: number } | null;
  waitingForUser?: boolean;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });
  const isGuided = tourType === "guided";
  const tooltipWidth = isGuided && step.width === "wide" ? 420 : 340;

  useEffect(() => {
    if (!rect || !tooltipRef.current) return;
    const tw = tooltipRef.current.offsetWidth;
    const th = tooltipRef.current.offsetHeight;
    const pad = 16;
    let top = 0, left = 0;

    if (step.position === "bottom") {
      top = rect.bottom + pad;
      left = rect.left + rect.width / 2 - tw / 2;
    } else if (step.position === "top") {
      top = rect.top - th - pad;
      left = rect.left + rect.width / 2 - tw / 2;
    } else if (step.position === "right") {
      top = rect.top + rect.height / 2 - th / 2;
      left = rect.right + pad;
    } else {
      top = rect.top + rect.height / 2 - th / 2;
      left = rect.left - tw - pad;
    }

    left = Math.max(16, Math.min(left, window.innerWidth - tw - 16));
    top = Math.max(16, Math.min(top, window.innerHeight - th - 16));

    setPos({ top, left });
  }, [rect, step.position, tooltipWidth]);

  const style = rect
    ? { top: `${pos.top}px`, left: `${pos.left}px` }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  const isLast = stepIndex === totalSteps - 1;
  const showNavLabel = step.advance === "navigate" && step.buttonLabel && hasData;
  const buttonText = showNavLabel
    ? step.buttonLabel!
    : isLast ? "Finish" : "Next";

  // Step indicator text
  const stepLabel = isGuided && actInfo
    ? `Act ${actInfo.actNum} · Step ${actInfo.actStep} of ${actInfo.actTotal}`
    : `Step ${stepIndex + 1} of ${totalSteps}`;

  return (
    <div ref={tooltipRef} className={`fixed z-[10003] animate-fade-in`} style={{ ...style, width: `${tooltipWidth}px` }}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 pt-5 pb-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500" />
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                {stepLabel}
              </span>
            </div>
            <button onClick={onSkip} aria-label="Skip tour" className="text-slate-300 hover:text-slate-500 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 pt-2">
          {/* Prompt badge (guided mode) */}
          {isGuided && step.prompt && (
            <div className="mb-3 px-3 py-2 rounded-lg bg-cyan-50 border border-cyan-200">
              <p className="text-xs font-medium text-cyan-700">{step.prompt}</p>
            </div>
          )}

          <p className="text-base font-semibold text-slate-900 mb-1.5">{step.title}</p>
          <p className="text-sm text-slate-500 leading-relaxed">{step.body}</p>

          {/* Narrative (guided mode) */}
          {isGuided && step.narrative && (
            <p className="text-xs text-slate-400 italic leading-relaxed mt-2">{step.narrative}</p>
          )}
        </div>

        <div className="px-5 pb-4 flex items-center justify-between">
          {/* User action indicator or progress dots */}
          {isGuided && waitingForUser && step.userActionLabel ? (
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
              <span className="text-[10px] text-cyan-600 font-medium">{step.userActionLabel}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5">
              {!isGuided && Array.from({ length: totalSteps }).map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-4 bg-slate-900" : i < stepIndex ? "w-1.5 bg-slate-400" : "w-1.5 bg-slate-200"}`} />
              ))}
              {isGuided && actInfo && Array.from({ length: actInfo.actTotal }).map((_, i) => (
                <div key={i} className={`h-1.5 rounded-full transition-all ${i === actInfo.actStep - 1 ? "w-4 bg-slate-900" : i < actInfo.actStep - 1 ? "w-1.5 bg-slate-400" : "w-1.5 bg-slate-200"}`} />
              ))}
            </div>
          )}

          {/* Hide Next button when waiting for user action */}
          {!(isGuided && waitingForUser) && (
            <button onClick={onNext} className="flex items-center gap-1 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors px-3 py-1.5 rounded-lg">
              {buttonText} <ChevronRight size={12} />
            </button>
          )}
        </div>

        {/* Auto-play progress bar (not in guided mode) */}
        {autoPlay && !isGuided && (
          <div className="h-0.5 bg-slate-100">
            <div
              key={stepIndex}
              className="h-full bg-amber-400"
              style={{ animation: `demo-progress ${(step.autoDelay ?? (step.advance === "navigate" ? 6000 : 5000)) / 1000}s linear forwards` }}
            />
            <style>{`@keyframes demo-progress { from { width: 0% } to { width: 100% } }`}</style>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Main DemoMode Component ──────────────────────────────────────────────

export function DemoMode({ active, onEnd, screen, navigateTo, stats, autoPlay = false, dispatch, tourType = "quick" }: {
  active: boolean;
  onEnd: () => void;
  screen: string;
  navigateTo: (screen: Screen, ctx?: WorkflowContext) => void;
  stats: HomeStats | null;
  autoPlay?: boolean;
  dispatch?: React.Dispatch<AppAction>;
  tourType?: "quick" | "demo" | "guided";
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [waitSatisfied, setWaitSatisfied] = useState(false);
  const [targetReady, setTargetReady] = useState(false);
  const [userActionDone, setUserActionDone] = useState(false);
  const { isDemoMode } = useDemoMode();
  const isGuided = tourType === "guided";

  const hasData = !!(stats && stats.readyForReviewItems.length > 0);

  const tourPath = isGuided
    ? GUIDED_TOUR_PATH
    : isDemoMode ? DEMO_GOLDEN_PATH : GOLDEN_PATH;
  const activeSteps = tourPath.filter(s => !s.requiresData || hasData || isDemoMode);
  const step = activeSteps[stepIndex];
  const isLastStep = stepIndex === activeSteps.length - 1;

  // Act step info for guided mode
  const actInfo = isGuided ? getActStepInfo(activeSteps, stepIndex) : null;

  // ─── Resolve household context from stats or demo data ───
  const resolveContext = useCallback((): WorkflowContext | undefined => {
    if (isDemoMode) {
      const thompson = DEMO_HOUSEHOLDS.find(h => h.id === "hh-thompson");
      if (thompson) {
        return { householdId: thompson.id, familyName: thompson.name.replace(" Household", "") };
      }
    }
    if (!stats) return undefined;
    const lists = [
      stats.readyForReviewItems,
      stats.overdueTaskItems,
      stats.openTaskItems,
      stats.unsignedItems,
      stats.upcomingMeetingItems,
    ];
    for (const list of lists) {
      const item = list.find(it => it.householdId);
      if (item) {
        return {
          householdId: item.householdId!,
          familyName: (item.householdName || "").replace(" Household", ""),
        };
      }
    }
    return undefined;
  }, [stats, isDemoMode]);

  const advance = useCallback(() => {
    if (!step) return;
    if (isLastStep) {
      onEnd();
      return;
    }

    const nextStep = activeSteps[stepIndex + 1];

    // Role switching for guided mode
    if (isGuided && dispatch && nextStep?.role) {
      const currentRole = step.role;
      if (nextStep.role !== currentRole) {
        dispatch({ type: "SET_ROLE_INLINE", role: nextStep.role });
      }
    }

    // If this step navigates somewhere, do it
    if (step.advance === "navigate" && step.navigateTo) {
      const needsCtx = step.navigateTo.ctxSource === "firstHousehold";
      const ctx = needsCtx ? resolveContext() : undefined;
      if (!needsCtx || ctx) {
        navigateTo(step.navigateTo.screen, ctx);
      }
    }

    // For transition steps that have navigateTo, navigate when advancing past them
    if (step.isTransition && step.navigateTo) {
      const needsCtx = step.navigateTo.ctxSource === "firstHousehold";
      const ctx = needsCtx ? resolveContext() : undefined;
      if (!needsCtx || ctx) {
        navigateTo(step.navigateTo.screen, ctx);
      } else {
        navigateTo(step.navigateTo.screen);
      }
    }

    setStepIndex(prev => prev + 1);
    setWaitSatisfied(false);
    setTargetReady(false);
    setUserActionDone(false);
  }, [step, isLastStep, onEnd, navigateTo, resolveContext, activeSteps, stepIndex, isGuided, dispatch]);

  // ─── Target readiness: poll for target element with graceful skip ───
  useEffect(() => {
    if (!active || !step) return;
    // Transition and checkpoint cards target "body" — they're always ready
    if (step.isTransition || step.isCheckpoint) {
      setTargetReady(true);
      return;
    }
    setTargetReady(false);

    const timeout = step.targetTimeout ?? 3000;
    let found = false;

    const poll = setInterval(() => {
      const el = document.querySelector(step.target);
      if (el) {
        found = true;
        clearInterval(poll);
        setTargetReady(true);
      }
    }, 150);

    const failsafe = setTimeout(() => {
      clearInterval(poll);
      if (!found) {
        console.warn(`[DemoMode] Target not found for step "${step.id}" (${step.target}), skipping`);
        if (!isLastStep) {
          setStepIndex(prev => prev + 1);
          setWaitSatisfied(false);
          setTargetReady(false);
          setUserActionDone(false);
        } else {
          onEnd();
        }
      }
    }, timeout);

    return () => { clearInterval(poll); clearTimeout(failsafe); };
  }, [active, step?.id, stepIndex]);

  // ─── Scroll into view for guided mode ───
  useEffect(() => {
    if (!active || !isGuided || !targetReady || !step || step.isTransition || step.isCheckpoint) return;
    const el = document.querySelector(step.target);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [active, isGuided, targetReady, step?.id]);

  // ─── Auto-click target when step has clickTarget (only after targetReady) ───
  const clickedRef = useRef<string | null>(null);
  useEffect(() => {
    if (!active || !step?.clickTarget || !targetReady) return;
    if (clickedRef.current === step.id) return;
    const delay = step.clickDelay ?? 600;
    const timer = setTimeout(() => {
      const el = document.querySelector(step.target) as HTMLElement | null;
      if (el) {
        clickedRef.current = step.id;
        el.click();
      }
    }, delay);
    return () => clearTimeout(timer);
  }, [active, step, stepIndex, targetReady]);

  // ─── User action detection (guided mode) ───
  useEffect(() => {
    if (!active || !isGuided || !step?.waitForUserAction || !step.userActionTarget || userActionDone) return;

    const handler = (e: MouseEvent) => {
      const target = document.querySelector(step.userActionTarget!);
      if (!target) return;
      // Check if click landed directly on the target element
      const directHit = target === e.target || target.contains(e.target as Node);
      // Also check coordinates — the overlay/glow ring intercepts clicks,
      // so e.target may be the overlay, not the actual button
      const targetRect = target.getBoundingClientRect();
      const inBounds = e.clientX >= targetRect.left && e.clientX <= targetRect.right &&
                       e.clientY >= targetRect.top && e.clientY <= targetRect.bottom;
      if (directHit || inBounds) {
        setUserActionDone(true);
        // Trigger the actual click on the underlying element
        if (!directHit) (target as HTMLElement).click();
      }
    };

    // Use capture phase to detect clicks even through the overlay
    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [active, isGuided, step?.id, step?.waitForUserAction, step?.userActionTarget, userActionDone]);

  // Auto-advance after user action detected
  useEffect(() => {
    if (!userActionDone || !step?.waitForUserAction) return;
    const timer = setTimeout(advance, 800);
    return () => clearTimeout(timer);
  }, [userActionDone, step?.waitForUserAction, advance]);

  // ─── Rect tracking (poll for target element) ───
  const updateRect = useCallback(() => {
    if (!step || step.isTransition || step.isCheckpoint) {
      setRect(null);
      return;
    }
    const el = document.querySelector(step.target);
    if (el) {
      setRect(el.getBoundingClientRect());
    } else {
      setRect(null);
    }
  }, [step]);

  useEffect(() => {
    if (!active) return;
    updateRect();
    const interval = setInterval(updateRect, 300);
    window.addEventListener("scroll", updateRect, true);
    window.addEventListener("resize", updateRect);
    return () => {
      clearInterval(interval);
      window.removeEventListener("scroll", updateRect, true);
      window.removeEventListener("resize", updateRect);
    };
  }, [active, stepIndex, updateRect]);

  // ─── waitFor polling (per-step timeout) ───
  useEffect(() => {
    if (!active || !step || !step.waitFor || waitSatisfied) return;

    const timeout = step.waitTimeout ?? 5000;

    const check = setInterval(() => {
      const el = document.querySelector(step.waitFor!);
      if (el) {
        clearInterval(check);
        setWaitSatisfied(true);
      }
    }, 150);

    const failsafe = setTimeout(() => {
      clearInterval(check);
      console.warn(`[DemoMode] waitFor timeout for step "${step.id}" (${step.waitFor})`);
      setWaitSatisfied(true);
    }, timeout);

    return () => { clearInterval(check); clearTimeout(failsafe); };
  }, [active, step, waitSatisfied]);

  // When waitFor is satisfied, auto-advance to next step
  useEffect(() => {
    if (!waitSatisfied || !step?.waitFor) return;
    // In guided mode, don't auto-advance on waitFor — show the tooltip instead
    if (isGuided) return;
    const timer = setTimeout(() => {
      if (isLastStep) {
        onEnd();
      } else {
        setStepIndex(prev => prev + 1);
        setWaitSatisfied(false);
        setTargetReady(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [waitSatisfied, step, isLastStep, onEnd, isGuided]);

  // ─── Auto-advance in autoPlay mode (per-step delay) — suppress for guided ───
  useEffect(() => {
    if (!active || !autoPlay || !step || !targetReady || isGuided) return;
    if (step.waitFor && !waitSatisfied) return;
    const delay = step.autoDelay ?? (step.advance === "navigate" ? 6000 : 5000);
    const timer = setTimeout(advance, delay);
    return () => clearTimeout(timer);
  }, [active, autoPlay, step, stepIndex, waitSatisfied, targetReady, advance, isGuided]);

  // ─── Reset on tour start ───
  useEffect(() => {
    if (active) {
      setStepIndex(0);
      setWaitSatisfied(false);
      setTargetReady(false);
      setUserActionDone(false);
    }
  }, [active]);

  if (!active || !step) return null;

  // ─── Transition / Checkpoint cards ───
  if (step.isTransition) {
    return (
      <>
        <div className="fixed inset-0 z-[10000] bg-slate-900/50" />
        <TransitionCard step={step} onNext={advance} onSkip={onEnd} />
      </>
    );
  }

  if (step.isCheckpoint) {
    return (
      <>
        <div className="fixed inset-0 z-[10000] bg-slate-900/50" />
        <CheckpointCard step={step} onNext={advance} onSkip={onEnd} />
      </>
    );
  }

  // Determine if the user action target should be clickable through the overlay
  const isWaitingForUser = isGuided && step.waitForUserAction && !userActionDone;

  return (
    <>
      {/* Dim overlay with spotlight cutout */}
      <div className={`fixed inset-0 z-[10000] ${isWaitingForUser ? "" : "pointer-events-none"}`}>
        {rect ? (
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg" style={{ pointerEvents: isWaitingForUser ? "none" : undefined }}>
            <defs>
              <mask id="spotlight-mask">
                <rect width="100%" height="100%" fill="white" />
                <rect
                  x={rect.left - 8} y={rect.top - 8}
                  width={rect.width + 16} height={rect.height + 16}
                  rx="16" fill="black"
                />
              </mask>
            </defs>
            <rect
              width="100%" height="100%"
              fill="rgba(15,23,42,0.45)"
              mask="url(#spotlight-mask)"
            />
          </svg>
        ) : (
          <div className="w-full h-full bg-slate-900/30" />
        )}
      </div>

      {/* Amber glow ring around target */}
      {rect && (
        <div
          className={`fixed z-[10001] transition-all duration-300 ${isWaitingForUser ? "" : "pointer-events-none"}`}
          style={{
            top: `${rect.top - 8}px`,
            left: `${rect.left - 8}px`,
            width: `${rect.width + 16}px`,
            height: `${rect.height + 16}px`,
            borderRadius: "16px",
            boxShadow: isWaitingForUser
              ? "0 0 0 3px rgba(6, 182, 212, 0.5), 0 0 24px rgba(6, 182, 212, 0.3)"
              : "0 0 0 3px rgba(251, 191, 36, 0.5), 0 0 24px rgba(251, 191, 36, 0.2)",
          }}
        />
      )}

      {/* Tooltip */}
      <TooltipCard
        step={step}
        stepIndex={stepIndex}
        totalSteps={activeSteps.length}
        onNext={advance}
        onSkip={onEnd}
        rect={rect}
        hasData={hasData}
        autoPlay={autoPlay}
        tourType={tourType}
        actInfo={actInfo}
        waitingForUser={isWaitingForUser}
      />
    </>
  );
}

// ─── Tour Launcher Button (Dropdown) ──────────────────────────────────────

export function TourButton({ onClick, hasData, onGuidedTour }: {
  onClick: () => void;
  hasData: boolean;
  onGuidedTour?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  if (!onGuidedTour) {
    // No guided tour available — render simple button
    return (
      <button
        onClick={onClick}
        data-tour="tour-button"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 text-amber-800 text-sm font-medium hover:shadow-md hover:border-amber-300 transition-all group"
      >
        <Play size={14} className="text-amber-600 group-hover:scale-110 transition-transform" />
        Take a tour
        <span className="text-[10px] text-amber-500 font-normal ml-1">{hasData ? "90 sec" : "30 sec"}</span>
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        data-tour="tour-button"
        className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 text-amber-800 text-sm font-medium hover:shadow-md hover:border-amber-300 transition-all group"
      >
        <Play size={14} className="text-amber-600 group-hover:scale-110 transition-transform" />
        Take a tour
        <ChevronDown size={12} className={`text-amber-500 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="absolute top-full left-0 mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg overflow-hidden z-20 animate-fade-in">
          <button
            onClick={() => { setOpen(false); onClick(); }}
            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-100"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Quick Tour</span>
              <span className="text-[10px] text-slate-400">{hasData ? "90 sec" : "30 sec"}</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Highlights of the key features</p>
          </button>
          <button
            onClick={() => { setOpen(false); onGuidedTour(); }}
            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-slate-700">Guided Tour</span>
              <span className="text-[10px] text-amber-500 font-medium">~15 min</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">3-act walkthrough: advisor, operations, principal</p>
          </button>
        </div>
      )}
    </div>
  );
}
