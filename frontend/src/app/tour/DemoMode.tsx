"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Play, X, ChevronRight, Sparkles } from "lucide-react";

// ─── Tour Step Definitions ─────────────────────────────────────────────────

export interface TourStep {
  id: string;
  target: string;
  title: string;
  body: string;
  advance: "click" | "next" | "auto";
  position: "top" | "bottom" | "left" | "right";
  screen?: string;
}

export const GOLDEN_PATH: TourStep[] = [
  {
    id: "welcome",
    target: "[data-tour='stat-cards']",
    title: "Your morning dashboard",
    body: "These cards show your entire practice at a glance. See which households need attention right now.",
    advance: "next",
    position: "bottom",
  },
  {
    id: "ready-for-review",
    target: "[data-tour='stat-readyForReview']",
    title: "Households need a compliance review",
    body: "Click this card to see which families are missing a review.",
    advance: "click",
    position: "bottom",
  },
  {
    id: "run-check",
    target: "[data-tour='run-check-btn']",
    title: "One click to launch a full review",
    body: "Pick any household and hit Run Check. Min runs 12 regulatory checks in under 30 seconds.",
    advance: "click",
    position: "left",
  },
  {
    id: "compliance-running",
    target: "[data-tour='compliance-progress']",
    title: "12 checks. 30 seconds.",
    body: "KYC, suitability, Reg BI, FINRA 4512, PTE 2020-02 — the full regulatory sweep. Watch it work.",
    advance: "auto",
    position: "bottom",
    screen: "compliance",
  },
  {
    id: "compliance-done",
    target: "[data-tour='compliance-actions']",
    title: "Review complete. What's next?",
    body: "Download the PDF for your records, or click View Family to see everything about this household.",
    advance: "click",
    position: "top",
    screen: "compliance",
  },
  {
    id: "family-overview",
    target: "[data-tour='family-header']",
    title: "The complete client picture",
    body: "Contacts, tasks, compliance history, account details — everything you need before a client call.",
    advance: "next",
    position: "bottom",
    screen: "family",
  },
  {
    id: "family-actions",
    target: "[data-tour='family-actions']",
    title: "Every workflow, one click away",
    body: "Jump to briefing, compliance, meeting logs, or account opening — all with context pre-loaded.",
    advance: "click",
    position: "bottom",
    screen: "family",
  },
  {
    id: "briefing",
    target: "[data-tour='briefing-summary']",
    title: "15 minutes of prep, done in 5 seconds",
    body: "Structured summary replaces digging through your CRM. Read this before every client call.",
    advance: "next",
    position: "bottom",
    screen: "briefing",
  },
  {
    id: "finale",
    target: "[data-tour='home-greeting']",
    title: "This is your practice. Every morning.",
    body: "Stat cards, family search, one-click workflows. Min replaces the spreadsheets, the context switching, and the 60-hour weeks.",
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
            <button onClick={onSkip} className="text-slate-300 hover:text-slate-500 transition-colors">
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

          {step.advance === "click" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-amber-500 font-medium">Try it →</span>
              <button onClick={onNext} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100">
                Next <ChevronRight size={10} />
              </button>
            </div>
          ) : step.advance === "auto" ? (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400 italic">Watching...</span>
              <button onClick={onNext} className="flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-600 transition-colors px-2 py-1 rounded-lg hover:bg-slate-100">
                Next <ChevronRight size={10} />
              </button>
            </div>
          ) : (
            <button onClick={onNext} className="flex items-center gap-1 text-xs font-medium text-white bg-slate-900 hover:bg-slate-800 transition-colors px-3 py-1.5 rounded-lg">
              {stepIndex === totalSteps - 1 ? "Finish" : "Next"} <ChevronRight size={12} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main DemoMode Component ──────────────────────────────────────────────

export function DemoMode({ active, onEnd, screen }: {
  active: boolean;
  onEnd: () => void;
  screen: string;
}) {
  const [stepIndex, setStepIndex] = useState(0);
  const [rect, setRect] = useState<DOMRect | null>(null);
  const prevScreen = useRef(screen);

  const step = GOLDEN_PATH[stepIndex];
  const isLastStep = stepIndex === GOLDEN_PATH.length - 1;

  const advance = useCallback(() => {
    if (isLastStep) {
      onEnd();
    } else {
      setStepIndex(prev => prev + 1);
    }
  }, [isLastStep, onEnd]);

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

  // ─── Screen change → advance or jump ───
  useEffect(() => {
    if (!active || !step) return;
    if (prevScreen.current === screen) return;

    if (step.advance === "auto") {
      const timer = setTimeout(() => advance(), 500);
      prevScreen.current = screen;
      return () => clearTimeout(timer);
    }

    // Jump to matching step for this screen
    if (step.screen && step.screen !== screen) {
      const matchingStep = GOLDEN_PATH.findIndex((s, i) => i >= stepIndex && s.screen === screen);
      if (matchingStep !== -1 && matchingStep !== stepIndex) {
        setStepIndex(matchingStep);
      }
    }

    prevScreen.current = screen;
  }, [screen, active, step, stepIndex, advance]);

  // ─── Compliance scan auto-advance ───
  // Watch for compliance-actions element to appear (scan finished)
  useEffect(() => {
    if (!active || !step || step.id !== "compliance-running") return;

    const check = setInterval(() => {
      const doneEl = document.querySelector("[data-tour='compliance-actions']");
      if (doneEl) {
        clearInterval(check);
        setTimeout(() => advance(), 500);
      }
    }, 500);

    // Failsafe: auto-advance after 45 seconds
    const failsafe = setTimeout(() => {
      clearInterval(check);
      advance();
    }, 45000);

    return () => { clearInterval(check); clearTimeout(failsafe); };
  }, [active, step, advance]);

  // ─── Click detection for "click" steps ───
  // ALL overlay layers are pointer-events-none, so clicks reach the real page.
  // We listen in capture phase to detect when user clicks the target.
  useEffect(() => {
    if (!active || !step || step.advance !== "click") return;

    const handler = (e: MouseEvent) => {
      const targetEl = document.querySelector(step.target);
      if (!targetEl) return;

      // Check if the clicked element is inside the target
      if (targetEl.contains(e.target as Node) || targetEl === e.target) {
        setTimeout(() => advance(), 400);
      }
    };

    document.addEventListener("click", handler, true);
    return () => document.removeEventListener("click", handler, true);
  }, [active, step, stepIndex, advance]);

  // ─── Reset on tour start ───
  useEffect(() => {
    if (active) {
      setStepIndex(0);
      prevScreen.current = screen;
    }
  }, [active]);

  if (!active || !step) return null;

  return (
    <>
      {/* 
        KEY DESIGN: Everything is pointer-events-none.
        The user clicks THROUGH the overlay directly onto page elements.
        The overlay is purely visual — dim + spotlight + amber ring.
      */}

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

      {/* Tooltip — this IS interactive (buttons work) */}
      <TooltipCard
        step={step}
        stepIndex={stepIndex}
        totalSteps={GOLDEN_PATH.length}
        onNext={advance}
        onSkip={onEnd}
        rect={rect}
      />
    </>
  );
}

// ─── Tour Launcher Button ────────────────────────────────────────────────

export function TourButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      data-tour="tour-button"
      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/60 text-amber-800 text-sm font-medium hover:shadow-md hover:border-amber-300 transition-all group"
    >
      <Play size={14} className="text-amber-600 group-hover:scale-110 transition-transform" />
      Take a tour
      <span className="text-[10px] text-amber-500 font-normal ml-1">90 sec</span>
    </button>
  );
}
