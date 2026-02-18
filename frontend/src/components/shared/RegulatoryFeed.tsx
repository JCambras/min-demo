"use client";
import { useState } from "react";
import { Scale, AlertTriangle, ChevronRight, X, ExternalLink, Plus } from "lucide-react";

// ─── Regulatory Updates ─────────────────────────────────────────────────────

interface RegulatoryUpdate {
  id: string;
  date: string;
  agency: "SEC" | "FINRA" | "DOL";
  title: string;
  summary: string;
  impact: "high" | "medium" | "low";
  actionRequired: string;
  checkSuggestion?: { label: string; keyword: string };
}

const UPDATES: RegulatoryUpdate[] = [
  {
    id: "reg-1",
    date: "2026-02-10",
    agency: "SEC",
    title: "Updated Marketing Rule Guidance",
    summary: "SEC staff issued new FAQ guidance on testimonial and endorsement arrangements under Rule 206(4)-1. Clarifies documentation requirements for social media testimonials and third-party ratings.",
    impact: "high",
    actionRequired: "Review all marketing materials and social media policies. Document any testimonial or endorsement arrangements. Update compliance manual section on advertising.",
    checkSuggestion: { label: "Marketing Rule Compliance", keyword: "marketing rule" },
  },
  {
    id: "reg-2",
    date: "2026-01-28",
    agency: "SEC",
    title: "Cybersecurity Risk Management Rule Effective",
    summary: "New Rule 10 under the Exchange Act requires written cybersecurity incident response policies and annual risk assessments. Applies to all registered investment advisers.",
    impact: "high",
    actionRequired: "Conduct annual cybersecurity risk assessment. Document incident response procedures. Train all staff on cyber hygiene protocols.",
    checkSuggestion: { label: "Cybersecurity Risk Assessment", keyword: "cybersecurity" },
  },
  {
    id: "reg-3",
    date: "2026-01-15",
    agency: "FINRA",
    title: "Consolidated Audit Trail (CAT) Reporting Update",
    summary: "FINRA extended the Phase 2d implementation timeline for small introducing brokers. New deadline for full CAT compliance is Q3 2026.",
    impact: "low",
    actionRequired: "Review CAT reporting obligations. Confirm your clearing firm handles CAT submissions. No immediate action for most RIAs.",
  },
  {
    id: "reg-4",
    date: "2025-12-20",
    agency: "DOL",
    title: "Retirement Security Rule (Fiduciary Rule 2.0)",
    summary: "DOL published final rule expanding the definition of fiduciary advice for retirement accounts. Affects rollover recommendations and annuity sales.",
    impact: "high",
    actionRequired: "Review all rollover recommendation procedures. Update IRA rollover documentation to include comparative analysis. Train advisors on new fiduciary obligations for retirement assets.",
    checkSuggestion: { label: "Rollover Fiduciary Compliance", keyword: "rollover" },
  },
  {
    id: "reg-5",
    date: "2025-12-05",
    agency: "SEC",
    title: "Form ADV Annual Amendment Reminder",
    summary: "Firms with December fiscal year-end must file their annual ADV amendment by March 31, 2026. Updated instructions include new Item 5 fee reporting requirements.",
    impact: "medium",
    actionRequired: "Begin compiling ADV amendment data. Review Item 5 fee disclosures for accuracy. Schedule ADV delivery to existing clients within 120 days.",
  },
];

const IMPACT_COLORS: Record<string, string> = {
  high: "bg-red-100 text-red-600",
  medium: "bg-amber-100 text-amber-600",
  low: "bg-slate-100 text-slate-500",
};

const AGENCY_COLORS: Record<string, string> = {
  SEC: "bg-blue-100 text-blue-600",
  FINRA: "bg-purple-100 text-purple-600",
  DOL: "bg-teal-100 text-teal-600",
};

const DISMISSED_KEY = "min-reg-dismissed";

// ─── Component ──────────────────────────────────────────────────────────────

export function RegulatoryFeed({ onAddCheck }: {
  onAddCheck?: (label: string, keyword: string) => void;
}) {
  const [dismissed, setDismissed] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(DISMISSED_KEY) || "[]")); } catch { return new Set(); }
  });
  const [expanded, setExpanded] = useState<string | null>(null);

  const dismiss = (id: string) => {
    setDismissed(prev => {
      const next = new Set(prev);
      next.add(id);
      localStorage.setItem(DISMISSED_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  const visible = UPDATES.filter(u => !dismissed.has(u.id));
  if (visible.length === 0) return null;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <Scale size={14} className="text-slate-400" />
        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Regulatory Updates</span>
        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-slate-100 text-slate-400">{visible.length}</span>
      </div>

      {visible.slice(0, 3).map(update => (
        <div key={update.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <div className="flex items-start gap-3 px-4 py-3">
            <div className="mt-0.5">
              <span className={`text-[10px] px-1.5 py-0.5 rounded font-medium ${AGENCY_COLORS[update.agency]}`}>{update.agency}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-700">{update.title}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${IMPACT_COLORS[update.impact]}`}>{update.impact}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">{new Date(update.date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</p>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => setExpanded(expanded === update.id ? null : update.id)}
                className="text-slate-300 hover:text-slate-500">
                <ChevronRight size={14} className={`transition-transform ${expanded === update.id ? "rotate-90" : ""}`} />
              </button>
              <button onClick={() => dismiss(update.id)} className="text-slate-300 hover:text-slate-500">
                <X size={14} />
              </button>
            </div>
          </div>

          {expanded === update.id && (
            <div className="px-4 pb-3 border-t border-slate-100 pt-3 animate-fade-in">
              <p className="text-xs text-slate-600 mb-2">{update.summary}</p>
              <div className="bg-slate-50 rounded-lg p-2.5 mb-2">
                <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Action Required</p>
                <p className="text-xs text-slate-600">{update.actionRequired}</p>
              </div>
              {update.checkSuggestion && onAddCheck && (
                <button onClick={() => { onAddCheck(update.checkSuggestion!.label, update.checkSuggestion!.keyword); dismiss(update.id); }}
                  className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1">
                  <Plus size={10} /> Add compliance check
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
