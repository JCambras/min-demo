"use client";
import { useEffect, useRef, useState } from "react";
import { Check, Loader2 } from "lucide-react";

export function ProgressSteps({ steps, currentStep }: { steps: string[]; currentStep: number }) {
  const startTimes = useRef<Record<number, number>>({});
  const [completedTimes, setCompletedTimes] = useState<Record<number, string>>({});
  const [elapsed, setElapsed] = useState("");

  // Track when each step starts
  useEffect(() => {
    if (currentStep > 0 && !startTimes.current[currentStep]) {
      startTimes.current[currentStep] = Date.now();
    }
    // Mark previous step as completed
    const prev = currentStep - 1;
    if (prev > 0 && startTimes.current[prev] && !completedTimes[prev]) {
      const ms = Date.now() - startTimes.current[prev];
      setCompletedTimes(t => ({ ...t, [prev]: ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s` }));
    }
  }, [currentStep]); // eslint-disable-line react-hooks/exhaustive-deps

  // Live elapsed counter for active step
  useEffect(() => {
    if (currentStep <= 0 || currentStep > steps.length) return;
    const start = startTimes.current[currentStep] || Date.now();
    const interval = setInterval(() => {
      const ms = Date.now() - start;
      setElapsed(ms < 1000 ? `${ms}ms` : `${(ms / 1000).toFixed(1)}s`);
    }, 100);
    return () => clearInterval(interval);
  }, [currentStep, steps.length]);

  return (
    <div className="space-y-3">
      {steps.map((s, i) => {
        const stepNum = i + 1;
        const isDone = currentStep > stepNum;
        const isActive = currentStep === stepNum;
        return (
          <div key={i} className={`flex items-center gap-4 p-4 rounded-xl transition-all duration-500 ${isDone ? "opacity-100" : isActive ? "opacity-100 bg-blue-50" : "opacity-30"}`}>
            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0">
              {isDone ? (
                <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center"><Check size={16} /></div>
              ) : isActive ? (
                <Loader2 size={22} className="animate-spin text-blue-500" />
              ) : (
                <div className="w-8 h-8 rounded-full bg-slate-100 text-slate-300 flex items-center justify-center text-sm">{stepNum}</div>
              )}
            </div>
            <span className={`flex-1 text-[15px] ${isDone ? "text-slate-500" : isActive ? "text-slate-900 font-medium" : "text-slate-300"}`}>{s}</span>
            {isDone && completedTimes[stepNum] && (
              <span className="text-xs text-slate-300 font-mono">{completedTimes[stepNum]}</span>
            )}
            {isActive && (
              <span className="text-xs text-blue-400 font-mono">{elapsed}</span>
            )}
          </div>
        );
      })}
    </div>
  );
}
