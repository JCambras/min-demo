"use client";
import { useState } from "react";
import { HelpCircle, X } from "lucide-react";

interface WhyBubbleProps {
  reason: string;
  regulation?: string;  // Optional regulation citation
  compact?: boolean;    // Smaller variant for inline use
}

export function WhyBubble({ reason, regulation, compact }: WhyBubbleProps) {
  const [open, setOpen] = useState(false);

  if (compact) {
    return (
      <span className="relative inline-flex items-center">
        <button onClick={() => setOpen(!open)} className="text-slate-300 hover:text-blue-500 transition-colors ml-1" aria-label="Why did Min do this?">
          <HelpCircle size={13} />
        </button>
        {open && (
          <span className="absolute left-0 bottom-full mb-2 z-30 w-64 bg-slate-900 text-white text-xs rounded-xl p-3 shadow-xl animate-fade-in">
            <button onClick={() => setOpen(false)} className="absolute top-2 right-2 text-slate-400 hover:text-white"><X size={12} /></button>
            <span className="block mb-1 font-medium text-blue-300">Why?</span>
            <span className="block leading-relaxed">{reason}</span>
            {regulation && <span className="block mt-1.5 text-slate-400 text-[10px]">{regulation}</span>}
          </span>
        )}
      </span>
    );
  }

  return (
    <div className="mt-2">
      <button onClick={() => setOpen(!open)} className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-blue-500 transition-colors group">
        <HelpCircle size={14} className="group-hover:text-blue-500" />
        <span>{open ? "Hide explanation" : "Why did Min do this?"}</span>
      </button>
      {open && (
        <div className="mt-2 bg-slate-50 border border-slate-200 rounded-xl p-4 animate-fade-in">
          <p className="text-sm text-slate-700 leading-relaxed">{reason}</p>
          {regulation && <p className="text-xs text-slate-400 mt-2">{regulation}</p>}
        </div>
      )}
    </div>
  );
}
