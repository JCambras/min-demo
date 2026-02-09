"use client";
import { ArrowLeft, FileText } from "lucide-react";

interface FlowHeaderProps {
  title: string;
  familyName?: string;
  stepLabel: string;
  progressPct: number;
  onBack: () => void;
  onShowPane: () => void;
  hasIndicator: boolean;
}

export function FlowHeader({ title, familyName, stepLabel, progressPct, onBack, onShowPane, hasIndicator }: FlowHeaderProps) {
  const displayTitle = familyName && familyName !== "Client" ? `${title} · ${familyName}` : title;

  return (
    <div className="px-4 sm:px-8 py-4 flex items-center gap-4">
      <button onClick={onBack} className="text-slate-300 hover:text-slate-600 transition-colors">
        <ArrowLeft size={22} strokeWidth={1.5} />
      </button>
      <div className="flex-1">
        <div className="flex items-center justify-between">
          <h1 className="text-lg sm:text-xl font-light text-slate-900">{displayTitle}</h1>
          <span className="text-xs text-slate-400 hidden sm:inline">{stepLabel}</span>
        </div>
        <div className="mt-2 h-1 bg-slate-100 rounded-full overflow-hidden">
          <div className="h-full bg-slate-900 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
        </div>
      </div>
      <button onClick={onShowPane} className="lg:hidden text-slate-400 hover:text-slate-600 relative">
        <FileText size={20} />
        {hasIndicator && <span className="absolute -top-1 -right-1 w-2 h-2 bg-green-400 rounded-full" />}
      </button>
    </div>
  );
}
