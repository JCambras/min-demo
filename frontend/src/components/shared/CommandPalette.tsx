"use client";
import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { Search, Briefcase, UserPlus, FileText, BookOpen, MessageSquare, ClipboardCheck, DollarSign, Upload, ListTodo, Zap, Shield, Activity, ChevronRight, BarChart3, Command, Users } from "lucide-react";
import type { Screen, WorkflowContext } from "@/lib/types";
import { callSF } from "@/lib/salesforce";

// ─── Types ──────────────────────────────────────────────────────────────────

interface PaletteAction {
  id: string;
  label: string;
  description: string;
  icon: React.ElementType;
  screen?: Screen;
  category: "navigate" | "household" | "search";
  householdId?: string;
  familyName?: string;
}

const SCREEN_ACTIONS: PaletteAction[] = [
  { id: "home", label: "Home", description: "Go to home screen", icon: ChevronRight, screen: "home", category: "navigate" },
  { id: "briefing", label: "Client Briefing", description: "Full client picture before meetings", icon: BookOpen, screen: "briefing", category: "navigate" },
  { id: "meeting", label: "Meeting Logs", description: "Record notes & follow-ups", icon: MessageSquare, screen: "meeting", category: "navigate" },
  { id: "compliance", label: "Compliance Reviews", description: "ADV, KYC, suitability checks", icon: FileText, screen: "compliance", category: "navigate" },
  { id: "planning", label: "Planning & Goals", description: "Financial plan progress", icon: ClipboardCheck, screen: "planning", category: "navigate" },
  { id: "onboard", label: "Onboard New Client", description: "Client records & setup", icon: UserPlus, screen: "onboard", category: "navigate" },
  { id: "flow", label: "Open Account", description: "Paperwork & e-signatures", icon: Briefcase, screen: "flow", category: "navigate" },
  { id: "money", label: "Money Movement", description: "Wires, journals & distributions", icon: DollarSign, screen: "money", category: "navigate" },
  { id: "documents", label: "Document Intake", description: "Scan, classify & file documents", icon: Upload, screen: "documents", category: "navigate" },
  { id: "taskManager", label: "Task Manager", description: "View, assign & complete tasks", icon: ListTodo, screen: "taskManager", category: "navigate" },
  { id: "workflows", label: "Workflow Automation", description: "Active chains & templates", icon: Zap, screen: "workflows", category: "navigate" },
  { id: "dashboard", label: "Dashboard", description: "Practice intelligence dashboard", icon: BarChart3, screen: "dashboard", category: "navigate" },
  { id: "activity", label: "Activity Feed", description: "Global timeline of all actions", icon: Activity, screen: "activity", category: "navigate" },
  { id: "audit", label: "Audit Trail", description: "Searchable compliance audit log", icon: Shield, screen: "audit", category: "navigate" },
];

// ─── Component ──────────────────────────────────────────────────────────────

export function CommandPalette({ open, onClose, onNavigate }: {
  open: boolean;
  onClose: () => void;
  onNavigate: (screen: Screen, ctx?: WorkflowContext) => void;
}) {
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [householdResults, setHouseholdResults] = useState<PaletteAction[]>([]);
  const [searching, setSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery("");
      setSelectedIndex(0);
      setHouseholdResults([]);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  // Debounced household search
  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!query || query.length < 2) {
      setHouseholdResults([]);
      return;
    }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await callSF("searchHouseholds", { query });
        if (res.success) {
          const hhs = res.households as { id: string; name: string }[];
          setHouseholdResults(hhs.slice(0, 5).map(h => ({
            id: `hh-${h.id}`,
            label: h.name.replace(" Household", ""),
            description: "Open household",
            icon: Users,
            screen: "family" as Screen,
            category: "household" as const,
            householdId: h.id,
            familyName: h.name.replace(" Household", ""),
          })));
        }
      } catch {}
      setSearching(false);
    }, 300);
  }, [query]);

  const results = useMemo(() => {
    const q = query.toLowerCase();
    const screenResults = q
      ? SCREEN_ACTIONS.filter(a => a.label.toLowerCase().includes(q) || a.description.toLowerCase().includes(q))
      : SCREEN_ACTIONS;
    return [...screenResults, ...householdResults];
  }, [query, householdResults]);

  // Clamp selected index
  useEffect(() => {
    if (selectedIndex >= results.length) setSelectedIndex(Math.max(0, results.length - 1));
  }, [results.length, selectedIndex]);

  const handleSelect = useCallback((action: PaletteAction) => {
    onClose();
    if (action.screen === "family" && action.householdId) {
      onNavigate(action.screen, { householdId: action.householdId, familyName: action.familyName || "" });
    } else if (action.screen) {
      onNavigate(action.screen);
    }
  }, [onClose, onNavigate]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex(i => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex(i => Math.max(i - 1, 0));
    } else if (e.key === "Enter" && results[selectedIndex]) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    } else if (e.key === "Escape") {
      onClose();
    }
  }, [results, selectedIndex, handleSelect, onClose]);

  // Global Cmd+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (open) onClose();
        // The parent handles toggling open state
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]" onClick={onClose}>
      <div className="fixed inset-0 bg-black/40 animate-fade-in" />
      <div className="relative w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden animate-fade-in"
        onClick={e => e.stopPropagation()}>

        {/* Search input */}
        <div className="flex items-center gap-3 px-4 border-b border-slate-100">
          <Search size={18} className="text-slate-400 flex-shrink-0" />
          <input ref={inputRef} value={query} onChange={e => { setQuery(e.target.value); setSelectedIndex(0); }}
            onKeyDown={handleKeyDown}
            className="flex-1 h-14 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none bg-transparent"
            placeholder="Search screens, households, actions..." />
          <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 text-slate-400 font-mono">ESC</kbd>
        </div>

        {/* Results */}
        <div className="max-h-80 overflow-y-auto py-2">
          {results.length === 0 ? (
            <div className="px-4 py-8 text-center">
              <p className="text-sm text-slate-400">{searching ? "Searching..." : "No results found"}</p>
            </div>
          ) : (
            <>
              {/* Screen actions */}
              {results.filter(r => r.category === "navigate").length > 0 && (
                <div className="px-3 pt-2 pb-1">
                  <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider px-1">Screens</p>
                </div>
              )}
              {results.filter(r => r.category === "navigate").map((action, i) => {
                const globalIndex = results.indexOf(action);
                const Icon = action.icon;
                return (
                  <button key={action.id} onClick={() => handleSelect(action)}
                    onMouseEnter={() => setSelectedIndex(globalIndex)}
                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${globalIndex === selectedIndex ? "bg-slate-100" : "hover:bg-slate-50"}`}>
                    <Icon size={16} className="text-slate-400 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-slate-700">{action.label}</p>
                      <p className="text-xs text-slate-400 truncate">{action.description}</p>
                    </div>
                    {globalIndex === selectedIndex && <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-400 font-mono">↵</kbd>}
                  </button>
                );
              })}

              {/* Household results */}
              {householdResults.length > 0 && (
                <>
                  <div className="px-3 pt-3 pb-1">
                    <p className="text-[10px] font-semibold text-slate-300 uppercase tracking-wider px-1">Households</p>
                  </div>
                  {householdResults.map(action => {
                    const globalIndex = results.indexOf(action);
                    const Icon = action.icon;
                    return (
                      <button key={action.id} onClick={() => handleSelect(action)}
                        onMouseEnter={() => setSelectedIndex(globalIndex)}
                        className={`w-full flex items-center gap-3 px-4 py-2.5 text-left transition-colors ${globalIndex === selectedIndex ? "bg-slate-100" : "hover:bg-slate-50"}`}>
                        <Icon size={16} className="text-blue-500 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-700">{action.label}</p>
                          <p className="text-xs text-slate-400">{action.description}</p>
                        </div>
                        {globalIndex === selectedIndex && <kbd className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-400 font-mono">↵</kbd>}
                      </button>
                    );
                  })}
                </>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 py-2 border-t border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-3 text-[10px] text-slate-300">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <div className="flex items-center gap-1 text-[10px] text-slate-300">
            <Command size={10} />K
          </div>
        </div>
      </div>
    </div>
  );
}
