"use client";
import { useState } from "react";
import { Loader2, Settings, Calendar, Plus, Trash2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ComplianceTemplates } from "@/components/shared/ComplianceTemplates";
import { callSF } from "@/lib/salesforce";
import {
  loadCustomChecks,
  saveCustomChecks,
  loadSchedules,
  saveSchedules,
  runComplianceChecks,
} from "@/lib/compliance-engine";
import type { CustomCheck, ComplianceSchedule, SFHousehold, SFContact, SFTask } from "@/lib/compliance-engine";

export function ComplianceConfig() {
  // Custom checks
  const [showCustomChecks, setShowCustomChecks] = useState(false);
  const [customChecks, setCustomChecks] = useState<CustomCheck[]>(loadCustomChecks);
  const [newCheck, setNewCheck] = useState({ label: "", keyword: "", regulation: "Firm Internal Policy", whyItMatters: "", failStatus: "warn" as "fail" | "warn" });
  const [showAddForm, setShowAddForm] = useState(false);

  // Schedules
  const [showSchedules, setShowSchedules] = useState(false);
  const [schedules, setSchedules] = useState<ComplianceSchedule[]>(loadSchedules);
  const [showAddSchedule, setShowAddSchedule] = useState(false);
  const [newSchedule, setNewSchedule] = useState<{ name: string; frequency: "daily" | "weekly" | "monthly"; criteria: "all" | "below-threshold"; threshold: number; emailReport: boolean; emailTo: string }>({ name: "", frequency: "weekly", criteria: "all", threshold: 70, emailReport: true, emailTo: "" });
  const [runningScheduleId, setRunningScheduleId] = useState<string | null>(null);

  const addCustomCheck = () => {
    if (!newCheck.label.trim() || !newCheck.keyword.trim()) return;
    const check: CustomCheck = { ...newCheck, id: Date.now().toString(36) };
    const updated = [...customChecks, check];
    setCustomChecks(updated);
    saveCustomChecks(updated);
    setNewCheck({ label: "", keyword: "", regulation: "Firm Internal Policy", whyItMatters: "", failStatus: "warn" });
    setShowAddForm(false);
  };

  const removeCustomCheck = (id: string) => {
    const updated = customChecks.filter(c => c.id !== id);
    setCustomChecks(updated);
    saveCustomChecks(updated);
  };

  const addSchedule = () => {
    if (!newSchedule.name.trim()) return;
    const sched: ComplianceSchedule = {
      id: Date.now().toString(36),
      ...newSchedule,
      enabled: true,
      createdAt: new Date().toISOString(),
    };
    const updated = [...schedules, sched];
    setSchedules(updated);
    saveSchedules(updated);
    setNewSchedule({ name: "", frequency: "weekly", criteria: "all", threshold: 70, emailReport: true, emailTo: "" });
    setShowAddSchedule(false);
  };

  const removeSchedule = (id: string) => {
    const updated = schedules.filter(s => s.id !== id);
    setSchedules(updated);
    saveSchedules(updated);
  };

  const toggleSchedule = (id: string) => {
    const updated = schedules.map(s => s.id === id ? { ...s, enabled: !s.enabled } : s);
    setSchedules(updated);
    saveSchedules(updated);
  };

  const runScheduleNow = async (schedId: string) => {
    setRunningScheduleId(schedId);
    try {
      const res = await callSF("queryTasks", { limit: 200 });
      if (!res.success) { setRunningScheduleId(null); return; }
      const households = (res.households || []) as SFHousehold[];
      let failCount = 0;
      let scannedCount = 0;
      for (const h of households) {
        try {
          const detail = await callSF("getHouseholdDetail", { householdId: h.id });
          if (detail.success) {
            const checks = runComplianceChecks(
              { id: h.id, name: h.name, description: h.description || "", createdAt: h.createdAt },
              (detail.contacts || []) as SFContact[], (detail.tasks || []) as SFTask[],
            );
            failCount += checks.filter(c => c.status === "fail").length;
            scannedCount++;
          }
        } catch { /* skip */ }
      }
      const updated = schedules.map(s => s.id === schedId ? { ...s, lastRunAt: new Date().toISOString(), lastRunHouseholds: scannedCount, lastRunFails: failCount } : s);
      setSchedules(updated);
      saveSchedules(updated);
    } catch { /* swallow */ }
    setRunningScheduleId(null);
  };

  return (
    <>
      {/* Custom Compliance Checks */}
      <div className="mt-4">
        <button onClick={() => setShowCustomChecks(!showCustomChecks)}
          className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-purple-300 hover:bg-purple-50/50 transition-colors text-left">
          <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Settings size={20} className="text-purple-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800">Custom Firm Checks</p>
            <p className="text-xs text-slate-400">Define internal policies that run alongside the {12} regulatory checks.</p>
          </div>
          {customChecks.length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-purple-100 text-purple-600 font-medium">{customChecks.length}</span>
          )}
        </button>

        {showCustomChecks && (
          <div className="mt-3 bg-white border border-slate-200 rounded-2xl overflow-hidden animate-fade-in">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Firm Policy Checks</p>
              <button onClick={() => setShowAddForm(true)} className="text-xs px-2.5 py-1 rounded-lg bg-purple-100 text-purple-600 font-medium hover:bg-purple-200 transition-colors flex items-center gap-1">
                <Plus size={12} /> Add Check
              </button>
            </div>

            {customChecks.length === 0 && !showAddForm && (
              <div className="px-4 py-6 text-center">
                <Settings size={20} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No custom checks defined yet</p>
                <p className="text-xs text-slate-300 mt-1">Add your firm&apos;s internal policies to run alongside regulatory checks.</p>
              </div>
            )}

            {customChecks.map(cc => (
              <div key={cc.id} className="flex items-center gap-3 px-4 py-3 border-b border-slate-50 last:border-0 hover:bg-slate-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{cc.label}</p>
                  <p className="text-[10px] text-slate-400">Keyword: &quot;{cc.keyword}&quot; · {cc.failStatus === "fail" ? "Fails" : "Warns"} if missing</p>
                </div>
                <button onClick={() => removeCustomCheck(cc.id)} className="text-slate-300 hover:text-red-500 transition-colors flex-shrink-0">
                  <Trash2 size={14} />
                </button>
              </div>
            ))}

            {showAddForm && (
              <div className="px-4 py-4 border-t border-slate-100 bg-slate-50 space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Check Name</label>
                  <Input className="h-9 rounded-lg text-sm mt-1" placeholder="e.g. Senior Client Risk Assessment" value={newCheck.label}
                    onChange={e => setNewCheck(p => ({ ...p, label: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Keyword to Match</label>
                  <Input className="h-9 rounded-lg text-sm mt-1" placeholder="e.g. senior risk assessment" value={newCheck.keyword}
                    onChange={e => setNewCheck(p => ({ ...p, keyword: e.target.value }))} />
                  <p className="text-[10px] text-slate-300 mt-0.5">Searches task subjects and descriptions for this text</p>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Policy Reference</label>
                  <Input className="h-9 rounded-lg text-sm mt-1" placeholder="e.g. Firm Policy §4.2" value={newCheck.regulation}
                    onChange={e => setNewCheck(p => ({ ...p, regulation: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Why It Matters</label>
                  <Input className="h-9 rounded-lg text-sm mt-1" placeholder="Why this check is important..." value={newCheck.whyItMatters}
                    onChange={e => setNewCheck(p => ({ ...p, whyItMatters: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Severity if Missing</label>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setNewCheck(p => ({ ...p, failStatus: "warn" }))}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${newCheck.failStatus === "warn" ? "bg-amber-100 text-amber-700" : "bg-slate-100 text-slate-400"}`}>Warning</button>
                    <button onClick={() => setNewCheck(p => ({ ...p, failStatus: "fail" }))}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${newCheck.failStatus === "fail" ? "bg-red-100 text-red-700" : "bg-slate-100 text-slate-400"}`}>Fail</button>
                  </div>
                </div>
                <div className="flex gap-2 pt-1">
                  <button onClick={addCustomCheck} disabled={!newCheck.label.trim() || !newCheck.keyword.trim()}
                    className="text-xs px-4 py-2 rounded-lg bg-purple-600 text-white font-medium hover:bg-purple-700 transition-colors disabled:opacity-50">Save Check</button>
                  <button onClick={() => setShowAddForm(false)} className="text-xs px-4 py-2 rounded-lg border border-slate-200 text-slate-400 font-medium hover:bg-white transition-colors">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Scheduled Compliance Scans */}
      <div className="mt-4">
        <button onClick={() => setShowSchedules(!showSchedules)}
          className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-left">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Calendar size={20} className="text-blue-600" />
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-slate-800">Scheduled Scans</p>
            <p className="text-xs text-slate-400">Automate recurring compliance reviews with email summaries.</p>
          </div>
          {schedules.filter(s => s.enabled).length > 0 && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">{schedules.filter(s => s.enabled).length} active</span>
          )}
        </button>

        {showSchedules && (
          <div className="mt-3 bg-white border border-slate-200 rounded-2xl overflow-hidden animate-fade-in">
            <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-medium">Scan Schedules</p>
              <button onClick={() => setShowAddSchedule(true)} className="text-xs px-2.5 py-1 rounded-lg bg-blue-100 text-blue-600 font-medium hover:bg-blue-200 transition-colors flex items-center gap-1">
                <Plus size={12} /> New Schedule
              </button>
            </div>

            {schedules.length === 0 && !showAddSchedule && (
              <div className="px-4 py-6 text-center">
                <Calendar size={20} className="mx-auto text-slate-200 mb-2" />
                <p className="text-sm text-slate-400">No scheduled scans</p>
                <p className="text-xs text-slate-300 mt-1">Create a schedule to automatically run compliance reviews on a recurring basis.</p>
              </div>
            )}

            {schedules.map(sched => (
              <div key={sched.id} className={`px-4 py-3 border-b border-slate-50 last:border-0 ${sched.enabled ? "" : "opacity-50"}`}>
                <div className="flex items-center gap-3">
                  <button onClick={() => toggleSchedule(sched.id)}
                    className={`w-8 h-5 rounded-full transition-all flex-shrink-0 ${sched.enabled ? "bg-green-500" : "bg-slate-300"}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${sched.enabled ? "ml-[14px]" : "ml-[3px]"}`} />
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-700">{sched.name}</p>
                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                      <span className="capitalize">{sched.frequency}</span>
                      <span>·</span>
                      <span>{sched.criteria === "all" ? "All households" : `Score below ${sched.threshold}`}</span>
                      {sched.emailReport && <><span>·</span><span>Email: {sched.emailTo || "configured"}</span></>}
                    </div>
                    {sched.lastRunAt && (
                      <p className="text-[10px] text-green-600 mt-0.5">
                        Last run: {new Date(sched.lastRunAt).toLocaleDateString()} — {sched.lastRunHouseholds} scanned, {sched.lastRunFails} fails
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 flex-shrink-0">
                    <button onClick={() => runScheduleNow(sched.id)} disabled={runningScheduleId === sched.id}
                      className="text-[10px] px-2 py-1 rounded-lg bg-blue-100 text-blue-600 hover:bg-blue-200 transition-colors font-medium disabled:opacity-50">
                      {runningScheduleId === sched.id ? <Loader2 size={10} className="animate-spin inline" /> : "Run Now"}
                    </button>
                    <button onClick={() => removeSchedule(sched.id)} className="text-slate-300 hover:text-red-500 transition-colors">
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}

            {showAddSchedule && (
              <div className="px-4 py-4 border-t border-slate-100 bg-slate-50 space-y-3">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Schedule Name</label>
                  <Input className="h-9 rounded-lg text-sm mt-1" placeholder="e.g. Friday Compliance Sweep" value={newSchedule.name}
                    onChange={e => setNewSchedule(p => ({ ...p, name: e.target.value }))} />
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Frequency</label>
                  <div className="flex gap-2 mt-1">
                    {(["daily", "weekly", "monthly"] as const).map(f => (
                      <button key={f} onClick={() => setNewSchedule(p => ({ ...p, frequency: f }))}
                        className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors capitalize ${newSchedule.frequency === f ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>{f}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="text-[10px] text-slate-400 uppercase tracking-wider">Scope</label>
                  <div className="flex gap-2 mt-1">
                    <button onClick={() => setNewSchedule(p => ({ ...p, criteria: "all" }))}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${newSchedule.criteria === "all" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>All Households</button>
                    <button onClick={() => setNewSchedule(p => ({ ...p, criteria: "below-threshold" }))}
                      className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${newSchedule.criteria === "below-threshold" ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"}`}>Below Threshold</button>
                  </div>
                </div>
                {newSchedule.criteria === "below-threshold" && (
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider">Score Threshold</label>
                    <Input type="number" className="h-9 rounded-lg text-sm mt-1 w-24" value={newSchedule.threshold}
                      onChange={e => setNewSchedule(p => ({ ...p, threshold: parseInt(e.target.value) || 70 }))} />
                    <p className="text-[10px] text-slate-300 mt-0.5">Only scan households with compliance score below this value</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <button onClick={() => setNewSchedule(p => ({ ...p, emailReport: !p.emailReport }))}
                    className={`w-8 h-5 rounded-full transition-all flex-shrink-0 ${newSchedule.emailReport ? "bg-green-500" : "bg-slate-300"}`}>
                    <div className={`w-3.5 h-3.5 rounded-full bg-white shadow transition-all ${newSchedule.emailReport ? "ml-[14px]" : "ml-[3px]"}`} />
                  </button>
                  <span className="text-xs text-slate-500">Email summary report</span>
                </div>
                {newSchedule.emailReport && (
                  <div>
                    <label className="text-[10px] text-slate-400 uppercase tracking-wider">Email To</label>
                    <Input type="email" className="h-9 rounded-lg text-sm mt-1" placeholder="ops@yourfirm.com" value={newSchedule.emailTo}
                      onChange={e => setNewSchedule(p => ({ ...p, emailTo: e.target.value }))} />
                  </div>
                )}
                <div className="flex gap-2 pt-1">
                  <button onClick={addSchedule} disabled={!newSchedule.name.trim()}
                    className="text-xs px-4 py-2 rounded-lg bg-blue-600 text-white font-medium hover:bg-blue-700 transition-colors disabled:opacity-50">Create Schedule</button>
                  <button onClick={() => setShowAddSchedule(false)} className="text-xs px-4 py-2 rounded-lg border border-slate-200 text-slate-400 font-medium hover:bg-white transition-colors">Cancel</button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Compliance Templates Library */}
      <div className="mt-6">
        <ComplianceTemplates onAdopt={(checks) => {
          const existing = loadCustomChecks();
          const existingIds = new Set(existing.map(c => c.id));
          const newChecks = checks
            .filter(c => !existingIds.has(c.id))
            .map(c => ({ id: c.id, label: c.label, keyword: c.keyword, regulation: c.regulation, whyItMatters: c.whyItMatters, failStatus: c.failStatus }));
          if (newChecks.length > 0) {
            const updated = [...existing, ...newChecks];
            setCustomChecks(updated);
            saveCustomChecks(updated);
          }
        }} />
      </div>
    </>
  );
}
