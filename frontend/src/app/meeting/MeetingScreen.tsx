"use client";
import { useReducer, useEffect, useRef, useState } from "react";
import { Search, Loader2, Plus, Trash2, Check, ExternalLink, ChevronRight, Calendar, Clock, Users, MessageSquare, Shield, FileText, Camera, Sparkles, ArrowRightLeft } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ContinueBtn, FieldLabel, SelectField } from "@/components/shared/FormControls";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { ProgressSteps } from "@/components/shared/ProgressSteps";
import { callSF } from "@/lib/salesforce";
import type { Screen, WorkflowContext } from "@/lib/types";

// ─── Types ───────────────────────────────────────────────────────────────────

interface HHResult {
  id: string;
  name: string;
  contactNames: string;
  createdDate: string;
  primaryContactId?: string;
}

// ─── State ───────────────────────────────────────────────────────────────────

type Step = "search" | "compose" | "saving" | "complete";

const MEETING_TYPES = ["Annual Review", "Quarterly Check-in", "Financial Plan Update", "Tax Planning", "Estate Planning", "Insurance Review", "New Money Discussion", "Onboarding Follow-up", "Phone Call", "Other"];
const DURATIONS = ["15 min", "30 min", "45 min", "60 min", "90 min"];

interface State {
  step: Step;
  searchQuery: string;
  isSearching: boolean;
  searchResults: HHResult[];
  selectedHousehold: HHResult | null;
  meetingType: string;
  meetingDate: string;
  duration: string;
  attendees: string;
  notes: string;
  followUps: string[];
  newFollowUp: string;
  followUpDays: number;
  isProcessing: boolean;
  saveStep: number;
  evidence: { label: string; url?: string }[];
  showRightPane: boolean;
}

const today = new Date().toISOString().split("T")[0];

const init: State = {
  step: "search", searchQuery: "", isSearching: false, searchResults: [],
  selectedHousehold: null, meetingType: "", meetingDate: today,
  duration: "30 min", attendees: "", notes: "", followUps: [],
  newFollowUp: "", followUpDays: 7, isProcessing: false, saveStep: 0,
  evidence: [], showRightPane: false,
};

type Action =
  | { type: "SET_STEP"; step: Step }
  | { type: "SET_QUERY"; v: string }
  | { type: "SET_SEARCHING"; v: boolean }
  | { type: "SET_RESULTS"; v: HHResult[] }
  | { type: "SET_HOUSEHOLD"; v: HHResult }
  | { type: "SET_MEETING_TYPE"; v: string }
  | { type: "SET_DATE"; v: string }
  | { type: "SET_DURATION"; v: string }
  | { type: "SET_ATTENDEES"; v: string }
  | { type: "SET_NOTES"; v: string }
  | { type: "ADD_FOLLOW_UP" }
  | { type: "REMOVE_FOLLOW_UP"; idx: number }
  | { type: "SET_NEW_FOLLOW_UP"; v: string }
  | { type: "SET_FOLLOW_UP_DAYS"; v: number }
  | { type: "SET_PROCESSING"; v: boolean }
  | { type: "SET_SAVE_STEP"; v: number }
  | { type: "ADD_EVIDENCE"; ev: { label: string; url?: string } }
  | { type: "SET_RIGHT_PANE"; v: boolean }
  | { type: "RESET" };

function reducer(s: State, a: Action): State {
  switch (a.type) {
    case "SET_STEP": return { ...s, step: a.step };
    case "SET_QUERY": return { ...s, searchQuery: a.v };
    case "SET_SEARCHING": return { ...s, isSearching: a.v };
    case "SET_RESULTS": return { ...s, searchResults: a.v };
    case "SET_HOUSEHOLD": return { ...s, selectedHousehold: a.v, step: "compose" };
    case "SET_MEETING_TYPE": return { ...s, meetingType: a.v };
    case "SET_DATE": return { ...s, meetingDate: a.v };
    case "SET_DURATION": return { ...s, duration: a.v };
    case "SET_ATTENDEES": return { ...s, attendees: a.v };
    case "SET_NOTES": return { ...s, notes: a.v };
    case "ADD_FOLLOW_UP": return s.newFollowUp.trim() ? { ...s, followUps: [...s.followUps, s.newFollowUp.trim()], newFollowUp: "" } : s;
    case "REMOVE_FOLLOW_UP": return { ...s, followUps: s.followUps.filter((_, i) => i !== a.idx) };
    case "SET_NEW_FOLLOW_UP": return { ...s, newFollowUp: a.v };
    case "SET_FOLLOW_UP_DAYS": return { ...s, followUpDays: a.v };
    case "SET_PROCESSING": return { ...s, isProcessing: a.v };
    case "SET_SAVE_STEP": return { ...s, saveStep: a.v };
    case "ADD_EVIDENCE": return { ...s, evidence: [...s.evidence, a.ev] };
    case "SET_RIGHT_PANE": return { ...s, showRightPane: a.v };
    case "RESET": clearMeetingDraft(); return { ...init };
    default: return s;
  }
}

// ─── Draft Persistence ──────────────────────────────────────────────────────

const DRAFT_KEY = "min-meeting-draft";

function saveMeetingDraft(s: State) {
  try {
    if (s.step !== "compose") return;
    sessionStorage.setItem(DRAFT_KEY, JSON.stringify({
      selectedHousehold: s.selectedHousehold,
      meetingType: s.meetingType,
      meetingDate: s.meetingDate,
      duration: s.duration,
      attendees: s.attendees,
      notes: s.notes,
      followUps: s.followUps,
      followUpDays: s.followUpDays,
    }));
  } catch { /* quota exceeded — ignore */ }
}

function loadMeetingDraft(): Partial<State> | null {
  try {
    const raw = sessionStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch { return null; }
}

function clearMeetingDraft() {
  try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

// ─── Component ───────────────────────────────────────────────────────────────

export function MeetingScreen({ onExit, initialContext, onNavigate }: { onExit: () => void; initialContext?: WorkflowContext | null; onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void }) {
  const draft = !initialContext ? loadMeetingDraft() : null;
  const initState: State = draft?.selectedHousehold
    ? { ...init, step: "compose", selectedHousehold: draft.selectedHousehold as HHResult, meetingType: draft.meetingType || "", meetingDate: draft.meetingDate || today, duration: draft.duration || "30 min", attendees: draft.attendees || "", notes: draft.notes || "", followUps: draft.followUps || [], followUpDays: draft.followUpDays || 7 }
    : init;
  const [s, d] = useReducer(reducer, initState);
  const hasDraft = !!draft?.selectedHousehold;
  const notesRef = useRef<HTMLTextAreaElement>(null);
  const familyName = s.selectedHousehold?.name?.replace(" Household", "") || "Client";

  // Recent meetings state
  const [recentMeetings, setRecentMeetings] = useState<{ household: string; householdId: string; type: string; date: string; notes: string; primaryContactId?: string }[]>([]);
  const [recentLoading, setRecentLoading] = useState(false);
  const [expandedMeeting, setExpandedMeeting] = useState<number | null>(null);

  // Image-to-notes state
  const [imageExtracting, setImageExtracting] = useState(false);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = async (file: File) => {
    // Show preview
    const reader = new FileReader();
    reader.onload = e => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);

    setImageExtracting(true);
    // Simulate OCR extraction (in production, this would call an API like Claude Vision)
    await new Promise(r => setTimeout(r, 2000));

    // Extract structured data from the "handwritten notes"
    // For demo: generate realistic meeting notes based on the family name
    const extractedNotes = [
      `Discussed ${familyName}'s retirement timeline and current savings rate.`,
      `${familyName} mentioned concern about market volatility — wants to review allocation.`,
      `Reviewed RMD requirements for next year. Need to calculate by December.`,
      `Spouse interested in Roth conversion strategy — run tax projection.`,
      `Action: Update beneficiary designations on IRA accounts.`,
    ].join("\n\n");

    const extractedFollowUps = [
      "Run Roth conversion tax projection",
      "Update beneficiary designations on IRA",
      "Calculate RMD for next calendar year",
    ];

    // Merge with existing notes
    if (s.notes.trim()) {
      d({ type: "SET_NOTES", v: s.notes + "\n\n--- Extracted from handwritten notes ---\n\n" + extractedNotes });
    } else {
      d({ type: "SET_NOTES", v: extractedNotes });
    }

    // Add follow-ups
    for (const fu of extractedFollowUps) {
      d({ type: "SET_NEW_FOLLOW_UP", v: fu });
      d({ type: "ADD_FOLLOW_UP" });
    }

    setImageExtracting(false);
  };

  // Advisor-to-ops handoff
  const [handoffSending, setHandoffSending] = useState(false);
  const [handoffSent, setHandoffSent] = useState(false);

  const sendHandoff = async () => {
    if (!s.selectedHousehold || handoffSending) return;
    setHandoffSending(true);
    try {
      const description = [
        `ADVISOR HANDOFF — ${familyName} Household`,
        `\nMeeting: ${s.meetingType || "Meeting"} on ${s.meetingDate}`,
        s.attendees ? `Attendees: ${s.attendees}` : "",
        `\n── Meeting Notes ──`,
        s.notes || "(no notes)",
        s.followUps.length > 0 ? `\n── Follow-ups ──\n${s.followUps.map((f, i) => `${i + 1}. ${f}`).join("\n")}` : "",
        `\n── Action Required ──`,
        `Please review and process any account openings, compliance reviews, or document tasks for this household.`,
      ].filter(Boolean).join("\n");

      await callSF("createTask", {
        householdId: s.selectedHousehold.id,
        subject: `OPS HANDOFF: ${familyName} — ${s.meetingType || "Post-Meeting"} Action Items`,
        description,
        priority: "High",
        status: "Open",
      });
      setHandoffSent(true);
      d({ type: "ADD_EVIDENCE", ev: { label: `Ops handoff created for ${familyName}` } });
    } catch { /* swallow */ }
    setHandoffSending(false);
  };

  // Load recent meetings on mount (search step, no initial context)
  useEffect(() => {
    if (s.step !== "search" || initialContext) return;
    setRecentLoading(true);
    callSF("queryTasks", {}).then(res => {
      if (res.success && res.tasks) {
        const meetings = (res.tasks as { subject: string; createdAt: string; household: string; householdId: string; description?: string; primaryContactId?: string }[])
          .filter(t => t.subject?.toUpperCase().includes("MEETING NOTE"))
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 10)
          .map(t => ({
            household: t.household || "Unknown",
            householdId: t.householdId || "",
            type: t.subject.match(/\(([^)]+)\)/)?.[1] || "Meeting",
            date: new Date(t.createdAt).toLocaleDateString(),
            notes: (t.description || "").replace(/^Meeting Type:.*\n?/m, "").replace(/^Duration:.*\n?/m, "").replace(/^Attendees:.*\n?/m, "").replace(/^Date:.*\n?/m, "").trim().slice(0, 300),
            primaryContactId: t.primaryContactId,
          }));
        setRecentMeetings(meetings);
      }
    }).catch(() => {}).finally(() => setRecentLoading(false));
  }, [s.step, initialContext]);

  // Persist draft on state changes
  useEffect(() => {
    if (s.step === "complete" || s.step === "search") clearMeetingDraft();
    else saveMeetingDraft(s);
  }, [s]);

  // Auto-select household from workflow context
  useEffect(() => {
    if (initialContext && s.step === "search") {
      d({ type: "SET_HOUSEHOLD", v: { id: initialContext.householdId, name: `${initialContext.familyName} Household`, createdDate: "", contactNames: "", primaryContactId: initialContext.primaryContactId } });
    }
  }, [initialContext, s.step]);

  // Debounced search
  useEffect(() => {
    if (s.searchQuery.length < 2 || s.step !== "search") { d({ type: "SET_RESULTS", v: [] }); return; }
    d({ type: "SET_SEARCHING", v: true });
    const t = setTimeout(async () => {
      try {
        const res = await callSF("searchHouseholds", { query: s.searchQuery });
        if (res.success) d({ type: "SET_RESULTS", v: (res.households as { id: string; name: string; description: string; createdAt: string; contacts?: { firstName: string; id: string }[] }[]).map((h) => ({
          id: h.id, name: h.name, createdDate: new Date(h.createdAt).toLocaleDateString(),
          contactNames: h.contacts?.map(c => c.firstName).filter(Boolean).join(" & ") || "",
          primaryContactId: h.contacts?.[0]?.id || undefined,
        })) });
      } catch { /* swallow */ }
      d({ type: "SET_SEARCHING", v: false });
    }, 400);
    return () => clearTimeout(t);
  }, [s.searchQuery, s.step]);

  // Auto-focus notes when entering compose
  useEffect(() => {
    if (s.step === "compose" && notesRef.current) {
      setTimeout(() => notesRef.current?.focus(), 300);
    }
  }, [s.step]);

  const saveMeeting = async () => {
    if (!s.selectedHousehold || !s.notes.trim()) return;
    d({ type: "SET_PROCESSING", v: true });
    d({ type: "SET_STEP", step: "saving" });

    const steps = [
      {
        label: "Saving meeting note",
        fn: async () => {
          const res = await callSF("recordMeetingNote", {
            householdId: s.selectedHousehold!.id,
            contactId: s.selectedHousehold!.primaryContactId,
            familyName,
            meetingType: s.meetingType,
            meetingDate: s.meetingDate,
            duration: s.duration,
            attendees: s.attendees || `Advisor + ${familyName}`,
            notes: s.notes,
            followUps: s.followUps,
            followUpDays: s.followUpDays,
          });
          if (res.success) {
            d({ type: "ADD_EVIDENCE", ev: { label: "Meeting note recorded", url: (res.task as { url: string }).url } });
            const fuc = res.followUpCount as number;
            if (fuc > 0) {
              d({ type: "ADD_EVIDENCE", ev: { label: `${fuc} follow-up task${fuc > 1 ? "s" : ""} created` } });
            }
          }
        },
      },
    ];

    try {
      for (const [i, step] of steps.entries()) {
        d({ type: "SET_SAVE_STEP", v: i + 1 });
        await step.fn();
      }
      d({ type: "SET_SAVE_STEP", v: steps.length + 1 });
      setTimeout(() => d({ type: "SET_STEP", step: "complete" }), 600);
    } catch (err) {
      console.error(err);
      d({ type: "ADD_EVIDENCE", ev: { label: `Error: ${err instanceof Error ? err.message : "Unknown"}` } });
      d({ type: "SET_STEP", step: "compose" });
    } finally {
      d({ type: "SET_PROCESSING", v: false });
    }
  };

  const goBack = () => {
    if (s.step === "search") { d({ type: "RESET" }); onExit(); }
    else if (s.step === "compose") {
      // If we arrived with context from another screen, back exits directly
      if (initialContext) { d({ type: "RESET" }); onExit(); }
      else d({ type: "SET_STEP", step: "search" });
    }
    else if (s.step === "complete") { d({ type: "RESET" }); onExit(); }
    else { d({ type: "RESET" }); onExit(); }
  };

  const stepLabels: Record<string, string> = { search: "Select Client", compose: "Write Notes", saving: "Saving", complete: "Done" };
  const pct = s.step === "search" ? 25 : s.step === "compose" ? 50 : s.step === "saving" ? 75 : 100;
  const canSave = s.notes.trim().length > 0;

  return (
    <div className="flex h-screen bg-surface">
      <div className="w-full lg:w-[70%] flex flex-col">
        <FlowHeader title="Meeting Logs" familyName={s.step !== "search" ? familyName : undefined} stepLabel={stepLabels[s.step] || ""} progressPct={pct} onBack={goBack} onShowPane={() => d({ type: "SET_RIGHT_PANE", v: true })} hasIndicator={s.evidence.length > 0} accent="purple" />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-4 pb-16">
          <div className="max-w-2xl w-full mx-auto">

            {/* ─── Search ─── */}
            {s.step === "search" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Meeting Logs</h2>
                <p className="text-slate-400 mb-8">Which client did you meet with?</p>
                <div className="relative">
                  <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                  <Input className="h-14 text-lg rounded-xl pl-11" placeholder="Search households..." value={s.searchQuery} onChange={e => d({ type: "SET_QUERY", v: e.target.value })} autoFocus />
                  {s.isSearching && <Loader2 size={18} className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                </div>
                {s.searchQuery.length >= 2 && (
                  <div className="mt-3 border border-slate-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    {s.searchResults.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-slate-400 text-center">{s.isSearching ? "Searching Salesforce..." : `No households matching \u201c${s.searchQuery}\u201d`}</p>
                    ) : s.searchResults.map((h, i) => (
                      <button key={i} onClick={() => d({ type: "SET_HOUSEHOLD", v: h })}
                        className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0">
                        <div className="flex items-center justify-between">
                          <p className="font-medium text-slate-800">{h.name}</p>
                          <ChevronRight size={16} className="text-slate-300" />
                        </div>
                        <p className="text-sm text-slate-500">{h.contactNames ? `${h.contactNames} · ` : ""}Created {h.createdDate}</p>
                      </button>
                    ))}
                  </div>
                )}

                {/* Recent Meetings */}
                {s.searchQuery.length < 2 && !initialContext && (
                  <div className="mt-8">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-3 flex items-center gap-2">
                      <Clock size={12} /> Recent Meetings
                    </p>
                    {recentLoading ? (
                      <div className="flex items-center gap-2 text-sm text-slate-400"><Loader2 size={14} className="animate-spin" /> Loading...</div>
                    ) : recentMeetings.length === 0 ? (
                      <p className="text-sm text-slate-400">No meetings logged yet.</p>
                    ) : (
                      <div className="border border-slate-200 rounded-xl overflow-hidden bg-white">
                        {recentMeetings.map((m, i) => (
                          <div key={i} className="border-b border-slate-50 last:border-0">
                            <button onClick={() => setExpandedMeeting(expandedMeeting === i ? null : i)}
                              className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors">
                              <div className="flex items-center justify-between">
                                <div className="min-w-0">
                                  <p className="text-sm font-medium text-slate-800 truncate">{m.household.replace(" Household", "")}</p>
                                  <p className="text-xs text-slate-400">{m.type} · {m.date}</p>
                                </div>
                                <ChevronRight size={14} className={`text-slate-300 transition-transform ${expandedMeeting === i ? "rotate-90" : ""}`} />
                              </div>
                            </button>
                            {expandedMeeting === i && (
                              <div className="px-4 pb-3 animate-fade-in">
                                <p className="text-xs text-slate-500 whitespace-pre-line mb-2">{m.notes || "No notes recorded."}</p>
                                {m.householdId && (
                                  <button onClick={() => d({ type: "SET_HOUSEHOLD", v: { id: m.householdId, name: m.household, createdDate: "", contactNames: "", primaryContactId: m.primaryContactId } })}
                                    className="text-[11px] text-blue-600 hover:text-blue-800 font-medium">Log new meeting for {m.household.replace(" Household", "")} →</button>
                                )}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* ─── Compose ─── */}
            {s.step === "compose" && (
              <div className="animate-fade-in space-y-6">
                {hasDraft && (
                  <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-4 py-2.5 animate-fade-in">
                    <p className="text-xs text-blue-700">Resumed your draft meeting notes.</p>
                    <button onClick={() => { clearMeetingDraft(); d({ type: "RESET" }); }} className="text-xs text-blue-500 hover:text-blue-700 font-medium">Start Over</button>
                  </div>
                )}
                <div>
                  <h2 className="text-3xl font-light text-slate-900 mb-2">{familyName} Meeting</h2>
                  <p className="text-slate-400">Capture what happened and any follow-ups.</p>
                </div>

                {/* Meeting metadata — compact row */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <FieldLabel label="Meeting type" />
                    <SelectField value={s.meetingType} onChange={v => d({ type: "SET_MEETING_TYPE", v })} options={MEETING_TYPES} />
                  </div>
                  <div>
                    <FieldLabel label="Date" />
                    <Input type="date" className="h-11 rounded-xl" value={s.meetingDate} onChange={e => d({ type: "SET_DATE", v: e.target.value })} />
                  </div>
                  <div>
                    <FieldLabel label="Duration" />
                    <SelectField value={s.duration} onChange={v => d({ type: "SET_DURATION", v })} options={DURATIONS} />
                  </div>
                  <div>
                    <FieldLabel label="Attendees" />
                    <Input className="h-11 rounded-xl" placeholder={`Advisor + ${familyName}`} value={s.attendees} onChange={e => d({ type: "SET_ATTENDEES", v: e.target.value })} />
                  </div>
                </div>

                {/* Notes — the main event */}
                <div>
                  <FieldLabel label="Meeting notes" required />
                  <textarea
                    ref={notesRef}
                    className="w-full min-h-[200px] rounded-xl border border-slate-200 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:border-transparent resize-y"
                    placeholder="What did you discuss? Key decisions, concerns raised, changes to plan..."
                    value={s.notes}
                    onChange={e => d({ type: "SET_NOTES", v: e.target.value })}
                  />
                  <p className="text-xs text-slate-300 mt-1 text-right">{s.notes.length > 0 ? `${s.notes.split(/\s+/).filter(Boolean).length} words` : ""}</p>

                  {/* Image-to-notes upload */}
                  <input ref={fileInputRef} type="file" accept="image/*" capture="environment" className="hidden"
                    onChange={e => { const f = e.target.files?.[0]; if (f) handleImageUpload(f); e.target.value = ""; }} />
                  {imageExtracting ? (
                    <div className="mt-3 bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3 animate-fade-in">
                      <Loader2 size={16} className="animate-spin text-blue-500" />
                      <div>
                        <p className="text-sm font-medium text-blue-800">Extracting handwritten notes...</p>
                        <p className="text-xs text-blue-600/70">Reading text, identifying topics and action items</p>
                      </div>
                    </div>
                  ) : (
                    <div className="mt-3 flex gap-2">
                      <button onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-3 py-2 rounded-xl border border-dashed border-slate-300 text-xs text-slate-500 hover:border-blue-400 hover:text-blue-600 hover:bg-blue-50/30 transition-colors">
                        <Camera size={14} /> Upload handwritten notes
                      </button>
                      {imagePreview && (
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-green-50 border border-green-200 text-xs text-green-700">
                          <Sparkles size={14} /> Notes extracted successfully
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Follow-ups */}
                <div>
                  <FieldLabel label="Follow-up items" />
                  {s.followUps.length > 0 && (
                    <div className="space-y-2 mb-3">
                      {s.followUps.map((f, i) => (
                        <div key={i} className="flex items-center justify-between bg-white border border-slate-200 rounded-xl px-4 py-2.5">
                          <div className="flex items-center gap-3">
                            <span className="text-xs bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full font-medium">{i + 1}</span>
                            <span className="text-sm text-slate-700">{f}</span>
                          </div>
                          <button onClick={() => d({ type: "REMOVE_FOLLOW_UP", idx: i })} aria-label="Remove follow-up item" className="text-slate-300 hover:text-red-400 transition-colors"><Trash2 size={14} /></button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Input className="h-11 rounded-xl flex-1" placeholder="Add a follow-up item..." value={s.newFollowUp}
                      onChange={e => d({ type: "SET_NEW_FOLLOW_UP", v: e.target.value })}
                      onKeyDown={e => { if (e.key === "Enter" && s.newFollowUp.trim()) { e.preventDefault(); d({ type: "ADD_FOLLOW_UP" }); } }} />
                    <button onClick={() => d({ type: "ADD_FOLLOW_UP" })} disabled={!s.newFollowUp.trim()} aria-label="Add follow-up item"
                      className="h-11 w-11 rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200 disabled:opacity-30 transition-colors"><Plus size={18} /></button>
                  </div>
                  {s.followUps.length > 0 && (
                    <div className="mt-3 flex items-center gap-3">
                      <p className="text-xs text-slate-400">Follow-up due in:</p>
                      <div className="flex gap-2">
                        {[3, 7, 14, 30].map(n => (
                          <button key={n} onClick={() => d({ type: "SET_FOLLOW_UP_DAYS", v: n })}
                            className={`text-xs px-3 py-1.5 rounded-lg transition-all ${s.followUpDays === n ? "bg-slate-900 text-white" : "bg-slate-100 text-slate-500 hover:bg-slate-200"}`}>
                            {n} days
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Preview card */}
                {s.notes.trim() && (
                  <div className="bg-white border border-slate-200 rounded-2xl p-5">
                    <p className="text-xs uppercase tracking-wider text-slate-400 mb-3"><FileText size={12} className="inline mr-1" /> Salesforce Preview</p>
                    <p className="text-sm font-medium text-slate-800 mb-1">MEETING NOTE — {familyName}{s.meetingType ? ` (${s.meetingType})` : ""}</p>
                    <p className="text-xs text-slate-400 mb-2">{s.meetingDate} · {s.duration} · {s.attendees || `Advisor + ${familyName}`}</p>
                    <p className="text-sm text-slate-600 line-clamp-3">{s.notes}</p>
                    {s.followUps.length > 0 && (
                      <div className="mt-2 pt-2 border-t border-slate-100">
                        <p className="text-xs text-slate-400">{s.followUps.length} follow-up task{s.followUps.length > 1 ? "s" : ""} will be created (due in {s.followUpDays} days)</p>
                      </div>
                    )}
                  </div>
                )}

                <ContinueBtn onClick={saveMeeting} disabled={!canSave} processing={s.isProcessing} label="Save to Salesforce" />
              </div>
            )}

            {/* ─── Saving ─── */}
            {s.step === "saving" && (
              <div className="animate-fade-in pt-8">
                <h2 className="text-3xl font-light text-slate-900 mb-8">Saving to Salesforce</h2>
                <ProgressSteps steps={["Saving meeting note", "Done"]} currentStep={s.saveStep} />
              </div>
            )}

            {/* ─── Complete ─── */}
            {s.step === "complete" && (
              <div className="animate-fade-in text-center pt-12">
                <div className="w-20 h-20 rounded-full bg-green-100 text-green-600 flex items-center justify-center mx-auto mb-6"><Check size={36} /></div>
                <h2 className="text-3xl font-light text-slate-900 mb-2">Meeting Logged</h2>
                <p className="text-slate-400 mb-2">{familyName} · {s.meetingType || "Meeting"} · {s.meetingDate}</p>
                {s.followUps.length > 0 && (
                  <p className="text-sm text-blue-600 mb-6">{s.followUps.length} follow-up task{s.followUps.length > 1 ? "s" : ""} created — due in {s.followUpDays} days</p>
                )}
                <div className="space-y-2 max-w-sm mx-auto mt-8">
                  {s.evidence.filter(e => e.url).map((e, i) => (
                    <a key={i} href={e.url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center justify-between px-4 py-3 rounded-xl bg-white border border-slate-200 hover:border-slate-400 transition-colors text-sm">
                      <span className="text-slate-700">{e.label}</span>
                      <ExternalLink size={14} className="text-slate-400" />
                    </a>
                  ))}
                </div>
                {/* Next Best Action */}
                {onNavigate && s.selectedHousehold && (
                  <div className="max-w-sm mx-auto mt-8 mb-2 bg-emerald-50 border border-emerald-200/60 rounded-2xl p-4 flex items-start gap-3 text-left">
                    <div className="w-8 h-8 rounded-xl bg-emerald-100 flex items-center justify-center flex-shrink-0"><Shield size={16} className="text-emerald-600" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-emerald-900">Run compliance review</p>
                      <p className="text-xs text-emerald-700/70 mt-0.5">Good time to verify compliance while the meeting details are fresh.</p>
                      <button onClick={() => onNavigate!("compliance", { householdId: s.selectedHousehold!.id, familyName })} className="text-xs font-medium text-emerald-700 mt-2 hover:text-emerald-900 transition-colors">Run Compliance Review →</button>
                    </div>
                  </div>
                )}
                {/* Ops Handoff */}
                {s.selectedHousehold && !handoffSent && (
                  <div className="max-w-sm mx-auto mt-4 mb-2 bg-blue-50 border border-blue-200/60 rounded-2xl p-4 flex items-start gap-3 text-left">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0"><ArrowRightLeft size={16} className="text-blue-600" /></div>
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900">Hand off to operations</p>
                      <p className="text-xs text-blue-700/70 mt-0.5">Send meeting notes, follow-ups, and context to the ops team for processing.</p>
                      <button onClick={sendHandoff} disabled={handoffSending} className="text-xs font-medium text-blue-700 mt-2 hover:text-blue-900 transition-colors inline-flex items-center gap-1">
                        {handoffSending ? <><Loader2 size={10} className="animate-spin" /> Sending...</> : "Create Ops Handoff →"}
                      </button>
                    </div>
                  </div>
                )}
                {handoffSent && (
                  <div className="max-w-sm mx-auto mt-4 mb-2 bg-green-50 border border-green-200/60 rounded-2xl p-4 flex items-center gap-3 text-left">
                    <Check size={16} className="text-green-600 flex-shrink-0" />
                    <p className="text-sm text-green-800">Ops handoff created — task added to operations queue</p>
                  </div>
                )}
                <div className="flex flex-wrap gap-3 justify-center mt-8">
                  {onNavigate && s.selectedHousehold && (
                    <>
                      <button onClick={() => onNavigate("family" as Screen, { householdId: s.selectedHousehold!.id, familyName })} className="px-5 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm">View Family</button>
                      <button onClick={() => onNavigate("compliance", { householdId: s.selectedHousehold!.id, familyName })} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">Run Compliance Review</button>
                      <button onClick={() => onNavigate("briefing", { householdId: s.selectedHousehold!.id, familyName })} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">View Briefing</button>
                    </>
                  )}
                  <button onClick={() => d({ type: "RESET" })} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 font-medium hover:bg-slate-50 transition-colors text-sm">Log Another</button>
                  <button onClick={() => { d({ type: "RESET" }); onExit(); }} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-400 font-medium hover:bg-slate-50 transition-colors text-sm">Home</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* ─── Right Pane ─── */}
      <div className={`${s.showRightPane ? "fixed inset-0 z-50 bg-white" : "hidden"} lg:block lg:static lg:w-[30%] border-l border-slate-200 bg-white flex flex-col`}>
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-slate-400">Activity Log</p>
          <button onClick={() => d({ type: "SET_RIGHT_PANE", v: false })} aria-label="Close panel" className="lg:hidden text-slate-400 hover:text-slate-600">✕</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {s.evidence.length === 0 ? (
            <div className="text-center mt-12"><FileText size={28} className="mx-auto text-slate-200 mb-3" /><p className="text-sm text-slate-400">Notes will appear here as you compose</p><p className="text-xs text-slate-300 mt-1">Everything saves to Salesforce automatically.</p></div>
          ) : (
            <div className="space-y-2">
              {s.evidence.map((e, i) => (
                <div key={i} className="flex items-start gap-2 py-2 border-b border-slate-50 last:border-0">
                  <Check size={14} className="text-green-500 mt-0.5 flex-shrink-0" />
                  {e.url ? (
                    <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline">{e.label}</a>
                  ) : (
                    <span className="text-sm text-slate-600">{e.label}</span>
                  )}
                </div>
              ))}
            </div>
          )}
          {/* Live preview */}
          {s.step === "compose" && s.notes.trim() && (
            <div className="mt-6 pt-4 border-t border-slate-100">
              <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Preview</p>
              <div className="space-y-1">
                {s.meetingType && <div className="flex items-center gap-2 text-xs text-slate-500"><MessageSquare size={11} />{s.meetingType}</div>}
                <div className="flex items-center gap-2 text-xs text-slate-500"><Calendar size={11} />{s.meetingDate}</div>
                <div className="flex items-center gap-2 text-xs text-slate-500"><Clock size={11} />{s.duration}</div>
                <div className="flex items-center gap-2 text-xs text-slate-500"><Users size={11} />{s.attendees || `Advisor + ${familyName}`}</div>
              </div>
              <p className="text-xs text-slate-400 mt-3">{s.notes.split(/\s+/).filter(Boolean).length} words · {s.followUps.length} follow-up{s.followUps.length !== 1 ? "s" : ""}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
