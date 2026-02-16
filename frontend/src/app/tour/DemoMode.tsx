"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Play, X, ChevronRight, Sparkles } from "lucide-react";
import type { Screen, WorkflowContext } from "@/lib/types";
import type { HomeStats } from "@/lib/home-stats";

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
    requiresData: true,
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

// ─── Tooltip ────────────────────────────────────────────────────────────────

function TooltipCard({ step, stepIndex, totalSteps, onNext, onSkip, rect }: {
  step: TourStep;
  stepIndex: number;
  totalSteps: number;
  onNext: () => void;
  onSkip: () => void;
  rect: DOMRect | null;
}) {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ top: 0, left: 0 });

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
  }, [rect, step.position]);

  const style = rect
    ? { top: `${pos.top}px`, left: `${pos.left}px` }
    : { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

  const isLast = stepIndex === totalSteps - 1;
  const buttonText = step.advance === "navigate" && step.buttonLabel
    ? step.buttonLabel
    : isLast ? "Finish" : "Next";

  return (
    <div ref={tooltipRef} className="fixed z-[10003] w-[340px] animate-fade-in" style={style}>
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-5 pt-5 pb-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-2">
              <Sparkles size={14} className="text-amber-500" />
              <span className="text-[10px] uppercase tracking-widest text-slate-400 font-medium">
                Step {stepIndex + 1} of {totalSteps}
              </span>
            </div>
            <button onClick={onSkip} aria-label="Skip tour" className="text-slate-300 hover:text-slate-500 transition-colors">
              <X size={14} />
            </button>
          </div>
        </div>

        <div className="px-5 pb-5 pt-2">
          <p className="text-base font-semibold text-slate-900 mb-1.5">{step.title}</p>
          <p className="text-sm text-slate-500 leading-relaxed">{step.body}</p>
        </div>

        <div className="px-5 pb-4 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {Array.from({ length: totalSteps }).map((_, i) => (
              <div key={i} className={`h-1.5 rounded-full transition-all ${i === stepIndex ? "w-4 bg-slate-900" : i < stepIndex ? "w-1.5 bg-slate-400" : "w-1.5 bg-slate-200"}`} />
            ))}
          </div>

          <button onClick={onNext} className="flex items-center gap-1 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors px-3 py-1.5 rounded-lg">
            {buttonText} <ChevronRight size={12} />
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main DemoMode Component ──────────────────────────────────────────────

export function DemoMode({ active, onEnd, screen, navigateTo, stats }: {
  active: boolean;
  onEnd: () => void;
  screen: string;
  navigateTo: (screen: Screen, ctx?: WorkflowContext) => void;
  stats: HomeStats | null;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const [waitSatisfied, setWaitSatisfied] = useState(false);

  const hasData = !!(stats && stats.readyForReviewItems.length > 0);

  const activeSteps = GOLDEN_PATH.filter(s => !s.requiresData || hasData);
  const step = activeSteps[stepIndex];
  const isLastStep = stepIndex === activeSteps.length - 1;

  // ─── Resolve household context from stats ───
  const resolveContext = useCallback((): WorkflowContext | undefined => {
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
  }, [stats]);

  const advance = useCallback(() => {
    if (!step) return;
    if (isLastStep) {
      onEnd();
      return;
    }

    // If this step navigates somewhere, do it
    if (step.advance === "navigate" && step.navigateTo) {
      const ctx = step.navigateTo.ctxSource === "firstHousehold" ? resolveContext() : undefined;
      navigateTo(step.navigateTo.screen, ctx);
    }

    setStepIndex(prev => prev + 1);
    setWaitSatisfied(false);
  }, [step, isLastStep, onEnd, navigateTo, resolveContext]);

  // ─── Rect tracking (poll for target element) ───
  const updateRect = useCallback(() => {
    if (!step) return;
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

  // ─── waitFor polling ───
  useEffect(() => {
    if (!active || !step || !step.waitFor || waitSatisfied) return;

    const check = setInterval(() => {
      const el = document.querySelector(step.waitFor!);
      if (el) {
        clearInterval(check);
        setWaitSatisfied(true);
      }
    }, 300);

    // Failsafe: stop waiting after 35 seconds
    const failsafe = setTimeout(() => {
      clearInterval(check);
      setWaitSatisfied(true);
    }, 35000);

    return () => { clearInterval(check); clearTimeout(failsafe); };
  }, [active, step, waitSatisfied]);

  // When waitFor is satisfied, auto-advance to next step
  useEffect(() => {
    if (!waitSatisfied || !step?.waitFor) return;
    const timer = setTimeout(() => {
      if (isLastStep) {
        onEnd();
      } else {
        setStepIndex(prev => prev + 1);
        setWaitSatisfied(false);
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [waitSatisfied, step, isLastStep, onEnd]);

  // ─── Reset on tour start ───
  useEffect(() => {
    if (active) {
      setStepIndex(0);
      setWaitSatisfied(false);
    }
  }, [active]);

  if (!active || !step) return null;

  return (
    <>
      {/* Dim overlay with spotlight cutout */}
      <div className="fixed inset-0 z-[10000] pointer-events-none">
        {rect ? (
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
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
          className="fixed z-[10001] pointer-events-none transition-all duration-300"
          style={{
            top: `${rect.top - 8}px`,
            left: `${rect.left - 8}px`,
            width: `${rect.width + 16}px`,
            height: `${rect.height + 16}px`,
            borderRadius: "16px",
            boxShadow: "0 0 0 3px rgba(251, 191, 36, 0.5), 0 0 24px rgba(251, 191, 36, 0.2)",
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
      />
    </>
  );
}

// ─── Tour Launcher Button ────────────────────────────────────────────────

export function TourButton({ onClick, hasData }: { onClick: () => void; hasData: boolean }) {
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
