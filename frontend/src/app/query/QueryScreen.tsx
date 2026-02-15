"use client";
import { useReducer, useRef, useEffect } from "react";
import { Search, Loader2, ChevronRight, ExternalLink, Users, FileText, Shield, MessageSquare, Briefcase } from "lucide-react";
import { Input } from "@/components/ui/input";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { callSF } from "@/lib/salesforce";

// ─── NL Query Engine ─────────────────────────────────────────────────────────
// Translates advisor questions into task filters and narrative answers.
// This is NOT a general NL-to-SQL engine. It understands the ~15 task subjects
// that Min creates, and matches questions to known patterns.

interface QueryResult {
  answer: string;
  items: { label: string; detail: string; url?: string; type: string }[];
  stats?: { label: string; value: string | number }[];
}

interface SFTask {
  Id: string;
  Subject: string;
  Status: string;
  Priority: string;
  Description: string;
  CreatedDate: string;
  ActivityDate: string;
  What?: { Name: string };
}

interface SFHousehold {
  Id: string;
  Name: string;
  CreatedDate: string;
}

// Pattern matchers — each one checks the question and returns results if it matches
type PatternMatcher = (q: string, tasks: SFTask[], households: SFHousehold[], instanceUrl: string) => QueryResult | null;

const patterns: PatternMatcher[] = [
  // Unsigned / pending DocuSign
  (q, tasks, _hh, url) => {
    if (!/(unsign|pending|waiting|outstanding).*(docu|sign|envelope|signature)/i.test(q) &&
        !/(docu|sign|envelope).*(unsign|pending|waiting|outstanding|open)/i.test(q)) return null;
    const pending = tasks.filter(t => t.Subject?.startsWith("SEND DOCU") && t.Status !== "Completed");
    return {
      answer: pending.length === 0
        ? "All DocuSign envelopes have been sent. No pending signatures found."
        : `${pending.length} DocuSign envelope${pending.length > 1 ? "s are" : " is"} pending signature.`,
      items: pending.map(t => ({
        label: t.Subject.replace("SEND DOCU — ", ""),
        detail: `${t.What?.Name || "Unknown"} · Sent ${new Date(t.CreatedDate).toLocaleDateString()}`,
        url: `${url}/${t.Id}`,
        type: "docusign",
      })),
    };
  },

  // Compliance reviews — due, overdue, flagged
  (q, tasks, households, url) => {
    if (!/(compliance|review).*(due|overdue|flag|fail|need|missing|run|status)/i.test(q) &&
        !/(due|overdue|need|missing).*(compliance|review)/i.test(q) &&
        !/(who|which).*(need|haven).*(compliance|review)/i.test(q)) return null;
    const reviewed = new Set<string>();
    tasks.filter(t => t.Subject?.includes("COMPLIANCE REVIEW")).forEach(t => {
      if (t.What?.Name) reviewed.add(t.What.Name);
    });
    const flagged = tasks.filter(t => t.Subject?.includes("COMPLIANCE REVIEW FLAGGED"));
    const notReviewed = households.filter(h => !reviewed.has(h.Name));
    const items = [
      ...flagged.map(t => ({
        label: `${t.What?.Name || "Unknown"} — FLAGGED`,
        detail: `Reviewed ${new Date(t.CreatedDate).toLocaleDateString()}`,
        url: `${url}/${t.Id}`,
        type: "compliance-fail",
      })),
      ...notReviewed.map(h => ({
        label: `${h.Name} — No review on file`,
        detail: `Onboarded ${new Date(h.CreatedDate).toLocaleDateString()}`,
        url: `${url}/${h.Id}`,
        type: "compliance-missing",
      })),
    ];
    return {
      answer: items.length === 0
        ? "All households have passed compliance reviews. Looking good."
        : `${flagged.length} flagged review${flagged.length !== 1 ? "s" : ""} and ${notReviewed.length} household${notReviewed.length !== 1 ? "s" : ""} without a compliance review.`,
      items,
    };
  },

  // Onboarded this week/month/quarter
  (q, tasks, households, url) => {
    const weekMatch = /(onboard|new|added|created).*(this week|past week|last 7|recent)/i.test(q);
    const monthMatch = /(onboard|new|added|created).*(this month|past month|last 30)/i.test(q);
    const quarterMatch = /(onboard|new|added|created).*(this quarter|past quarter|last 90|q[1-4])/i.test(q);
    const allMatch = /(how many|total|all).*(household|client|famil)/i.test(q);
    if (!weekMatch && !monthMatch && !quarterMatch && !allMatch) return null;
    const now = Date.now();
    const cutoff = weekMatch ? 7 : monthMatch ? 30 : quarterMatch ? 90 : 9999;
    const filtered = households.filter(h => {
      const age = (now - new Date(h.CreatedDate).getTime()) / (1000 * 60 * 60 * 24);
      return age <= cutoff;
    });
    const period = weekMatch ? "this week" : monthMatch ? "this month" : quarterMatch ? "this quarter" : "total";
    return {
      answer: `${filtered.length} household${filtered.length !== 1 ? "s" : ""} onboarded ${period}.`,
      items: filtered.map(h => ({
        label: h.Name,
        detail: `Created ${new Date(h.CreatedDate).toLocaleDateString()}`,
        url: `${url}/${h.Id}`,
        type: "household",
      })),
      stats: [
        { label: "Total households", value: households.length },
        { label: `Onboarded ${period}`, value: filtered.length },
      ],
    };
  },

  // Rollovers / PTE
  (q, tasks, _hh, url) => {
    if (!/(rollover|pte|401k|pension|transfer.*asset)/i.test(q)) return null;
    const rollovers = tasks.filter(t =>
      t.Subject?.includes("Funding") && t.Description?.toLowerCase().includes("rollover") ||
      t.Description?.toLowerCase().includes("pte")
    );
    return {
      answer: rollovers.length === 0
        ? "No rollovers or PTE documentation found in recent activity."
        : `${rollovers.length} rollover/PTE-related record${rollovers.length > 1 ? "s" : ""} found.`,
      items: rollovers.map(t => ({
        label: t.What?.Name || "Unknown household",
        detail: t.Subject + ` · ${new Date(t.CreatedDate).toLocaleDateString()}`,
        url: `${url}/${t.Id}`,
        type: "funding",
      })),
    };
  },

  // Open / pending follow-ups
  (q, tasks, _hh, url) => {
    if (!/(open|pending|outstanding|overdue|due).*(task|follow|item|action)/i.test(q) &&
        !/(follow.up|action item|to.do|task).*(open|pending|due|outstanding)/i.test(q) &&
        !/(what.*do i need|what.s (on|pending)|to.do list)/i.test(q)) return null;
    const open = tasks.filter(t => t.Status !== "Completed" && t.Priority);
    const highPri = open.filter(t => t.Priority === "High");
    return {
      answer: open.length === 0
        ? "No open tasks. All clear!"
        : `${open.length} open task${open.length > 1 ? "s" : ""}${highPri.length > 0 ? ` (${highPri.length} high priority)` : ""}.`,
      items: open.map(t => ({
        label: t.Subject,
        detail: `${t.What?.Name || ""} · ${t.Priority}${t.ActivityDate ? ` · Due ${new Date(t.ActivityDate).toLocaleDateString()}` : ""}`,
        url: `${url}/${t.Id}`,
        type: t.Priority === "High" ? "task-high" : "task",
      })),
    };
  },

  // Meeting notes
  (q, tasks, _hh, url) => {
    if (!/(meeting|note|met with|last.*(call|conversation|touch))/i.test(q)) return null;
    const meetings = tasks.filter(t => t.Subject?.includes("MEETING NOTE"));
    return {
      answer: meetings.length === 0
        ? "No meeting notes recorded yet."
        : `${meetings.length} meeting note${meetings.length > 1 ? "s" : ""} on file.`,
      items: meetings.slice(0, 10).map(t => ({
        label: t.Subject.replace("MEETING NOTE — ", ""),
        detail: `${new Date(t.CreatedDate).toLocaleDateString()}${t.What?.Name ? ` · ${t.What.Name}` : ""}`,
        url: `${url}/${t.Id}`,
        type: "meeting",
      })),
    };
  },

  // Accounts opened
  (q, tasks, _hh, url) => {
    if (!/(account|opened|paperwork|envelope).*(open|generat|creat|sent|this)/i.test(q) &&
        !/(how many|total).*(account|envelope)/i.test(q)) return null;
    const paperwork = tasks.filter(t => t.Subject?.includes("Paperwork generated") || t.Subject?.includes("SEND DOCU"));
    return {
      answer: paperwork.length === 0
        ? "No account paperwork generated yet."
        : `${paperwork.length} account paperwork / DocuSign record${paperwork.length > 1 ? "s" : ""} found.`,
      items: paperwork.slice(0, 10).map(t => ({
        label: t.Subject,
        detail: `${t.What?.Name || ""} · ${new Date(t.CreatedDate).toLocaleDateString()}`,
        url: `${url}/${t.Id}`,
        type: "account",
      })),
    };
  },

  // Practice overview / summary
  (q, tasks, households, _url) => {
    if (!/(overview|summary|dashboard|how.*(doing|look|practice|business)|status|state of)/i.test(q)) return null;
    const completed = tasks.filter(t => t.Status === "Completed").length;
    const open = tasks.filter(t => t.Status !== "Completed").length;
    const docuSent = tasks.filter(t => t.Subject?.includes("SEND DOCU")).length;
    const compReviews = tasks.filter(t => t.Subject?.includes("COMPLIANCE REVIEW")).length;
    const meetings = tasks.filter(t => t.Subject?.includes("MEETING NOTE")).length;
    return {
      answer: `Your practice has ${households.length} household${households.length !== 1 ? "s" : ""}, ${completed} completed tasks, and ${open} open items.`,
      items: [],
      stats: [
        { label: "Households", value: households.length },
        { label: "Tasks completed", value: completed },
        { label: "Open items", value: open },
        { label: "DocuSign sent", value: docuSent },
        { label: "Compliance reviews", value: compReviews },
        { label: "Meeting notes", value: meetings },
      ],
    };
  },
];

function runQuery(question: string, tasks: SFTask[], households: SFHousehold[], instanceUrl: string): QueryResult {
  for (const pattern of patterns) {
    const result = pattern(question, tasks, households, instanceUrl);
    if (result) return result;
  }
  return {
    answer: "I couldn't find a match for that question. Try asking about DocuSign status, compliance reviews, onboarded clients, open tasks, meeting notes, or a practice overview.",
    items: [],
  };
}

// ─── Suggested Questions ─────────────────────────────────────────────────────

const SUGGESTIONS = [
  { label: "Practice overview", icon: Briefcase },
  { label: "Any unsigned DocuSign envelopes?", icon: FileText },
  { label: "Who needs a compliance review?", icon: Shield },
  { label: "What are my open follow-ups?", icon: ChevronRight },
  { label: "Households onboarded this month", icon: Users },
  { label: "Recent meeting notes", icon: MessageSquare },
];

// ─── State ───────────────────────────────────────────────────────────────────

interface State {
  question: string;
  isLoading: boolean;
  result: QueryResult | null;
  history: { q: string; r: QueryResult }[];
  showRightPane: boolean;
}

const init: State = { question: "", isLoading: false, result: null, history: [], showRightPane: false };

type Action =
  | { type: "SET_QUESTION"; v: string }
  | { type: "SET_LOADING"; v: boolean }
  | { type: "SET_RESULT"; q: string; r: QueryResult }
  | { type: "SET_RIGHT_PANE"; v: boolean }
  | { type: "RESET" };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "SET_QUESTION": return { ...s, question: a.v };
    case "SET_LOADING": return { ...s, isLoading: a.v };
    case "SET_RESULT": return { ...s, result: a.r, isLoading: false, history: [...s.history, { q: a.q, r: a.r }] };
    case "SET_RIGHT_PANE": return { ...s, showRightPane: a.v };
    case "RESET": return { ...init };
    default: return s;
  }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function QueryScreen({ onExit, initialQuery }: { onExit: () => void; initialQuery?: string }) {
  const [s, d] = useReducer(reducer, init);
  const inputRef = useRef<HTMLInputElement>(null);
  const hasAutoAsked = useRef(false);

  useEffect(() => { inputRef.current?.focus(); }, []);

  // Auto-ask from home screen search bar
  useEffect(() => {
    if (initialQuery && initialQuery.trim() && !hasAutoAsked.current) {
      hasAutoAsked.current = true;
      d({ type: "SET_QUESTION", v: initialQuery });
      ask(initialQuery);
    }
  }, [initialQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  const ask = async (question: string) => {
    if (!question.trim()) return;
    d({ type: "SET_QUESTION", v: question });
    d({ type: "SET_LOADING", v: true });
    try {
      const res = await callSF("queryTasks", {});
      if (res.success) {
        const result = runQuery(question, res.tasks, res.households, res.instanceUrl);
        d({ type: "SET_RESULT", q: question, r: result });
      } else {
        d({ type: "SET_RESULT", q: question, r: { answer: "Couldn't connect to Salesforce. Check your connection.", items: [] } });
      }
    } catch {
      d({ type: "SET_RESULT", q: question, r: { answer: "Something went wrong. Please try again.", items: [] } });
    }
  };

  const handleSubmit = () => { ask(s.question); };
  const iconForType = (t: string) => {
    if (t.includes("docu")) return <FileText size={14} className="text-blue-500" />;
    if (t.includes("compliance")) return <Shield size={14} className={t.includes("fail") || t.includes("missing") ? "text-amber-500" : "text-green-500"} />;
    if (t.includes("meeting")) return <MessageSquare size={14} className="text-purple-500" />;
    if (t.includes("task-high")) return <ChevronRight size={14} className="text-red-500" />;
    if (t.includes("task")) return <ChevronRight size={14} className="text-amber-500" />;
    if (t.includes("household")) return <Users size={14} className="text-slate-500" />;
    return <Briefcase size={14} className="text-slate-400" />;
  };

  return (
    <div className="flex h-screen bg-[#fafafa]">
      <div className="w-full lg:w-[70%] flex flex-col">
        <FlowHeader title="Ask Min" familyName={undefined} stepLabel="" progressPct={s.result ? 100 : 50} onBack={() => { d({ type: "RESET" }); onExit(); }} onShowPane={() => d({ type: "SET_RIGHT_PANE", v: true })} hasIndicator={s.history.length > 0} />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-4 pb-16">
          <div className="max-w-2xl w-full mx-auto">

            {/* Search bar — always visible */}
            <div className="mb-8">
              <h2 className="text-3xl font-light text-slate-900 mb-2">Ask Min</h2>
              <p className="text-slate-400 mb-6">Ask about your practice in plain English.</p>
              <div className="relative">
                <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input ref={inputRef} className="h-14 text-lg rounded-xl pl-11 pr-24" placeholder="e.g. Any unsigned DocuSign envelopes?"
                  value={s.question}
                  onChange={e => d({ type: "SET_QUESTION", v: e.target.value })}
                  onKeyDown={e => { if (e.key === "Enter") handleSubmit(); }} />
                <button onClick={handleSubmit} disabled={!s.question.trim() || s.isLoading}
                  className="absolute right-2 top-1/2 -translate-y-1/2 px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-30 transition-colors">
                  {s.isLoading ? <Loader2 size={16} className="animate-spin" /> : "Ask"}
                </button>
              </div>
            </div>

            {/* Suggestions — show when no result */}
            {!s.result && !s.isLoading && (
              <div className="animate-fade-in">
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">Try asking</p>
                <div className="grid grid-cols-2 gap-2">
                  {SUGGESTIONS.map((sg, i) => (
                    <button key={i} onClick={() => { d({ type: "SET_QUESTION", v: sg.label }); ask(sg.label); }}
                      className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-400 hover:shadow-sm transition-all text-left">
                      <sg.icon size={16} className="text-slate-400 flex-shrink-0" />
                      <span className="text-sm text-slate-600">{sg.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading */}
            {s.isLoading && (
              <div className="animate-fade-in text-center pt-8">
                <Loader2 size={32} className="animate-spin text-slate-400 mx-auto mb-3" />
                <p className="text-slate-400">Searching Salesforce...</p>
              </div>
            )}

            {/* Result */}
            {s.result && !s.isLoading && (
              <div className="animate-fade-in space-y-4">
                {/* Answer */}
                <div className="bg-white border border-slate-200 rounded-2xl p-6">
                  <p className="text-base text-slate-800 leading-relaxed">{s.result.answer}</p>
                </div>

                {/* Stats grid */}
                {s.result.stats && s.result.stats.length > 0 && (
                  <div className="grid grid-cols-3 gap-3">
                    {s.result.stats.map((st, i) => (
                      <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                        <p className="text-2xl font-light text-slate-900">{st.value}</p>
                        <p className="text-xs text-slate-400 mt-1">{st.label}</p>
                      </div>
                    ))}
                  </div>
                )}

                {/* Items list */}
                {s.result.items.length > 0 && (
                  <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
                    {s.result.items.map((item, i) => (
                      <div key={i} className="flex items-center justify-between px-5 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                        <div className="flex items-center gap-3 min-w-0">
                          {iconForType(item.type)}
                          <div className="min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate">{item.label}</p>
                            <p className="text-xs text-slate-400 truncate">{item.detail}</p>
                          </div>
                        </div>
                        {item.url && (
                          <a href={item.url} target="_blank" rel="noopener noreferrer" className="flex-shrink-0 ml-3 text-slate-300 hover:text-blue-500 transition-colors">
                            <ExternalLink size={14} />
                          </a>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Ask another */}
                <button onClick={() => { d({ type: "SET_QUESTION", v: "" }); inputRef.current?.focus(); }}
                  className="text-sm text-slate-400 hover:text-slate-600 transition-colors">Ask another question →</button>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Right pane — query history */}
      <div className={`${s.showRightPane ? "fixed inset-0 z-50 bg-white" : "hidden"} lg:block lg:static lg:w-[30%] border-l border-slate-200 bg-white flex flex-col`}>
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-slate-400">Query History</p>
          <button onClick={() => d({ type: "SET_RIGHT_PANE", v: false })} className="lg:hidden text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {s.history.length === 0 ? (
            <div className="text-center mt-12"><MessageSquare size={28} className="mx-auto text-slate-200 mb-3" /><p className="text-sm text-slate-400">Questions will appear here</p><p className="text-xs text-slate-300 mt-1">Ask anything about your book of business.</p></div>
          ) : (
            <div className="space-y-3">
              {[...s.history].reverse().map((h, i) => (
                <button key={i} onClick={() => { d({ type: "SET_QUESTION", v: h.q }); ask(h.q); }}
                  className="w-full text-left p-3 rounded-xl border border-slate-100 hover:border-slate-300 transition-colors">
                  <p className="text-sm font-medium text-slate-700 truncate">{h.q}</p>
                  <p className="text-xs text-slate-400 mt-1 truncate">{h.r.answer}</p>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
