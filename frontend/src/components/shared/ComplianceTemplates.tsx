"use client";
import { useState } from "react";
import { Shield, Download, Check, ChevronRight, BookOpen, Users } from "lucide-react";
import { TEMPLATES, CATEGORY_COLORS } from "@/lib/compliance-templates";
import type { TemplateCheck, ComplianceTemplate } from "@/lib/compliance-templates";

// ─── Component ──────────────────────────────────────────────────────────────

export function ComplianceTemplates({ onAdopt }: {
  onAdopt: (checks: TemplateCheck[]) => void;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const [adopted, setAdopted] = useState<Set<string>>(new Set());

  const handleAdopt = (template: ComplianceTemplate) => {
    onAdopt(template.checks);
    setAdopted(prev => { const s = new Set(prev); s.add(template.id); return s; });
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 mb-4">
        <BookOpen size={16} className="text-slate-400" />
        <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Compliance Templates</h3>
        <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">{TEMPLATES.length} frameworks</span>
      </div>

      {TEMPLATES.map(t => (
        <div key={t.id} className="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <button onClick={() => setExpanded(expanded === t.id ? null : t.id)}
            className="w-full flex items-center gap-4 px-4 py-3 text-left hover:bg-slate-50 transition-colors">
            <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
              <Shield size={18} className="text-slate-500" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="text-sm font-medium text-slate-700">{t.name}</p>
                <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${CATEGORY_COLORS[t.category]}`}>{t.category}</span>
              </div>
              <p className="text-xs text-slate-400 mt-0.5 truncate">{t.author}</p>
            </div>
            <div className="flex items-center gap-3 flex-shrink-0">
              <div className="text-right">
                <p className="text-xs font-medium text-slate-600">{t.checks.length} checks</p>
                <div className="flex items-center gap-1 mt-0.5">
                  <Users size={10} className="text-slate-300" />
                  <span className="text-[10px] text-slate-300">{t.firms} firms</span>
                </div>
              </div>
              <ChevronRight size={14} className={`text-slate-400 transition-transform ${expanded === t.id ? "rotate-90" : ""}`} />
            </div>
          </button>

          {expanded === t.id && (
            <div className="px-4 pb-4 border-t border-slate-100 pt-3 animate-fade-in">
              <p className="text-xs text-slate-500 mb-3">{t.description}</p>
              <div className="space-y-1.5 mb-3">
                {t.checks.map(c => (
                  <div key={c.id} className="flex items-center gap-2 text-xs">
                    <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${c.failStatus === "fail" ? "bg-red-400" : "bg-amber-400"}`} />
                    <span className="text-slate-600">{c.label}</span>
                    <span className="text-slate-300">·</span>
                    <span className="text-slate-400">{c.regulation}</span>
                  </div>
                ))}
              </div>
              <button onClick={() => handleAdopt(t)} disabled={adopted.has(t.id)}
                className={`w-full py-2 rounded-lg text-sm font-medium transition-colors ${adopted.has(t.id)
                  ? "bg-green-100 text-green-700 cursor-default"
                  : "bg-slate-900 text-white hover:bg-slate-800"}`}>
                {adopted.has(t.id) ? <><Check size={14} className="inline mr-1" /> Adopted</> : <><Download size={14} className="inline mr-1" /> Adopt Framework</>}
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
