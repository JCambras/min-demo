"use client";
import { useState, useEffect, useCallback } from "react";
import { Cloud, CloudOff, ExternalLink, Loader2, Check, AlertTriangle, Search, ChevronDown, ChevronUp, Shield, Zap, Database, Users, DollarSign, BarChart3, FileCheck, GitBranch, Bell, Palette, Plug, Plus, Trash2, TestTube, Calendar, LineChart, PenTool } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ContinueBtn } from "@/components/shared/FormControls";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { loadTriageConfig, saveTriageConfig, DEFAULT_TRIAGE_CONFIG } from "@/lib/triage-config";
import type { TriageThresholdConfig } from "@/lib/triage-config";

interface ConnectionStatus {
  connected: boolean;
  instanceUrl?: string;
  userName?: string;
  orgId?: string;
  connectedAt?: string;
  source?: "oauth" | "env";
}

// ─── Discovery Types ────────────────────────────────────────────────────────

interface DiscoveryMapping {
  confidence: number;
  household: { object: string; recordTypeDeveloperName: string | null; filterField: string | null; filterValue: string | null; primaryAdvisorField: string | null; totalAumField: string | null; serviceTierField: string | null; clientStatusField: string | null; confidence: number };
  contact: { object: string; householdLookup: string; isPrimaryField: string | null; confidence: number };
  financialAccount: { available: boolean; object: string | null; balanceField: string | null; confidence: number };
  aum: { source: string; object: string | null; field: string | null; confidence: number };
  complianceReview: { type: string; object: string | null; confidence: number };
  pipeline: { type: string; object: string | null; stageField: string | null; confidence: number };
  automationRisks: { riskLevel: string; taskFlowCount: number; accountTriggerCount: number; blockingValidationRules: string[] };
  warnings: string[];
}

interface HealthReport {
  orgType: string;
  householdCount: number;
  contactCount: number;
  financialAccountCount: number;
  opportunityCount: number;
  recentTaskCount: number;
  fscInstalled: boolean;
  personAccountsEnabled: boolean;
  customObjectsFound: string[];
  automationRiskLevel: string;
  taskFlowCount: number;
  validationRuleCount: number;
  overallConfidence: number;
  apiCallsMade: number;
  discoveryDurationMs: number;
  errors: string[];
  warnings: string[];
}

// ─── Confidence Badge ───────────────────────────────────────────────────────

function ConfidenceBadge({ confidence }: { confidence: number }) {
  const pct = Math.round(confidence * 100);
  const color = pct >= 85 ? "bg-green-100 text-green-700 border-green-200" :
                pct >= 65 ? "bg-amber-100 text-amber-700 border-amber-200" :
                            "bg-red-100 text-red-700 border-red-200";
  const icon = pct >= 85 ? <Check size={12} /> :
               pct >= 65 ? <AlertTriangle size={12} /> :
                           <AlertTriangle size={12} />;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      {icon} {pct}%
    </span>
  );
}

// ─── Risk Badge ─────────────────────────────────────────────────────────────

function RiskBadge({ level }: { level: string }) {
  const color = level === "high" ? "bg-red-100 text-red-700 border-red-200" :
                level === "medium" ? "bg-amber-100 text-amber-700 border-amber-200" :
                                     "bg-green-100 text-green-700 border-green-200";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${color}`}>
      <Zap size={10} /> {level}
    </span>
  );
}

// ─── Mapping Row ────────────────────────────────────────────────────────────

function MappingRow({ icon: Icon, label, value, detail, confidence, warning }: {
  icon: React.ElementType;
  label: string;
  value: string;
  detail?: string;
  confidence: number;
  warning?: boolean;
}) {
  return (
    <div className={`flex items-start gap-3 py-3 ${warning ? "bg-amber-50 -mx-4 px-4 rounded-lg" : ""}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${warning ? "bg-amber-100 text-amber-600" : "bg-slate-100 text-slate-500"}`}>
        <Icon size={16} />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-sm font-medium text-slate-700">{label}</span>
          <ConfidenceBadge confidence={confidence} />
        </div>
        <p className="text-sm text-slate-900 mt-0.5">{value}</p>
        {detail && <p className="text-xs text-slate-400 mt-0.5">{detail}</p>}
      </div>
    </div>
  );
}

// ─── Schema Discovery Panel ─────────────────────────────────────────────────

function SchemaDiscoveryPanel() {
  const [discovering, setDiscovering] = useState(false);
  const [mapping, setMapping] = useState<DiscoveryMapping | null>(null);
  const [healthReport, setHealthReport] = useState<HealthReport | null>(null);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState(true);

  const runDiscovery = async () => {
    setDiscovering(true);
    setError("");
    setMapping(null);
    setHealthReport(null);
    try {
      // Acquire CSRF token (same pattern as callSF)
      const csrfRes = await fetch("/api/csrf");
      const csrfData = await csrfRes.json();
      const token = csrfData.token || "";

      const res = await fetch("/api/salesforce/discover", {
        method: "POST",
        headers: { "x-csrf-token": token },
      });
      const data = await res.json();
      if (data.success) {
        setMapping(data.mapping);
        setHealthReport(data.healthReport);
      } else {
        setError(data.error?.message || data.error || "Discovery failed");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Discovery failed");
    }
    setDiscovering(false);
  };

  // Format household detection as readable string
  const formatHousehold = (h: DiscoveryMapping["household"]) => {
    if (h.recordTypeDeveloperName) return `${h.object} (RecordType: ${h.recordTypeDeveloperName})`;
    if (h.filterField) return `${h.object} where ${h.filterField} = '${h.filterValue}'`;
    if (h.object !== "Account") return h.object;
    return "Account (all records)";
  };

  const formatAum = (a: DiscoveryMapping["aum"]) => {
    if (a.source === "financial_account_rollup") return `Rollup from ${a.object}.${a.field}`;
    if (a.source === "account_field") return `${a.object}.${a.field}`;
    if (a.source === "not_found") return "Not tracked in Salesforce";
    return a.source;
  };

  return (
    <div className="mt-10 animate-fade-in">
      <h2 className="text-2xl font-light text-slate-900 mb-2">Schema Discovery</h2>
      <p className="text-slate-400 mb-6">
        Scan your Salesforce org to detect how households, AUM, advisors, and compliance are configured.
        This is read-only — nothing in your org will be modified.
      </p>

      {/* Run Discovery Button */}
      {!mapping && (
        <button
          onClick={runDiscovery}
          disabled={discovering}
          className="w-full py-4 rounded-2xl bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
        >
          {discovering ? (
            <><Loader2 size={18} className="animate-spin" /> Scanning your org...</>
          ) : (
            <><Search size={18} /> Discover Schema</>
          )}
        </button>
      )}

      {error && (
        <div className="mt-4 bg-red-50 border border-red-200 rounded-xl p-4">
          <p className="text-sm text-red-700"><AlertTriangle size={14} className="inline mr-1.5" />{error}</p>
        </div>
      )}

      {/* Health Report Summary */}
      {healthReport && (
        <div className="mt-4 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-medium text-slate-900">Health Report</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                {healthReport.orgType} · {healthReport.apiCallsMade} API calls · {(healthReport.discoveryDurationMs / 1000).toFixed(1)}s
              </p>
            </div>
            <ConfidenceBadge confidence={healthReport.overallConfidence} />
          </div>

          {/* Stats Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {[
              { label: "Households", value: healthReport.householdCount, icon: Users },
              { label: "Contacts", value: healthReport.contactCount, icon: Users },
              { label: "Financial Accts", value: healthReport.financialAccountCount, icon: DollarSign },
              { label: "Opportunities", value: healthReport.opportunityCount, icon: BarChart3 },
              { label: "Tasks (90d)", value: healthReport.recentTaskCount, icon: FileCheck },
              { label: "FSC Installed", value: healthReport.fscInstalled ? "Yes" : "No", icon: Database },
            ].map(s => (
              <div key={s.label} className="bg-slate-50 rounded-xl p-3">
                <div className="flex items-center gap-1.5 mb-1">
                  <s.icon size={12} className="text-slate-400" />
                  <span className="text-[11px] text-slate-400 uppercase tracking-wide">{s.label}</span>
                </div>
                <p className="text-lg font-semibold text-slate-900">{typeof s.value === "number" ? s.value.toLocaleString() : s.value}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Schema Mapping Detail */}
      {mapping && (
        <div className="mt-4 bg-white border border-slate-200 rounded-2xl overflow-hidden">
          <button
            onClick={() => setExpanded(!expanded)}
            className="w-full px-6 py-4 flex items-center justify-between hover:bg-slate-50 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Database size={18} className="text-slate-400" />
              <span className="font-medium text-slate-900">Schema Mapping</span>
              <ConfidenceBadge confidence={mapping.confidence} />
            </div>
            {expanded ? <ChevronUp size={18} className="text-slate-400" /> : <ChevronDown size={18} className="text-slate-400" />}
          </button>

          {expanded && (
            <div className="px-6 pb-6 space-y-1 border-t border-slate-100 pt-4">
              <MappingRow
                icon={Users}
                label="Households"
                value={formatHousehold(mapping.household)}
                detail={[
                  mapping.household.primaryAdvisorField && `Advisor: ${mapping.household.primaryAdvisorField}`,
                  mapping.household.serviceTierField && `Tier: ${mapping.household.serviceTierField}`,
                ].filter(Boolean).join(" · ") || undefined}
                confidence={mapping.household.confidence}
                warning={mapping.household.confidence < 0.65}
              />

              <MappingRow
                icon={DollarSign}
                label="AUM Source"
                value={formatAum(mapping.aum)}
                confidence={mapping.aum.confidence}
                warning={mapping.aum.source === "not_found"}
              />

              <MappingRow
                icon={Database}
                label="Financial Accounts"
                value={mapping.financialAccount.available ? `${mapping.financialAccount.object}` : "Not available"}
                detail={mapping.financialAccount.balanceField ? `Balance: ${mapping.financialAccount.balanceField}` : undefined}
                confidence={mapping.financialAccount.confidence}
              />

              <MappingRow
                icon={Users}
                label="Contacts"
                value={`${mapping.contact.object} → ${mapping.contact.householdLookup}`}
                detail={mapping.contact.isPrimaryField ? `Primary flag: ${mapping.contact.isPrimaryField}` : "No primary contact flag detected"}
                confidence={mapping.contact.confidence}
              />

              <MappingRow
                icon={FileCheck}
                label="Compliance Reviews"
                value={mapping.complianceReview.type === "custom_object" ? `Custom: ${mapping.complianceReview.object}` :
                       mapping.complianceReview.type === "task_pattern" ? "Task-based (Subject pattern)" :
                       "Not tracked"}
                confidence={mapping.complianceReview.confidence}
                warning={mapping.complianceReview.type === "not_tracked"}
              />

              <MappingRow
                icon={BarChart3}
                label="Pipeline"
                value={mapping.pipeline.type === "opportunity" ? "Opportunity" :
                       mapping.pipeline.type === "custom_object" ? `Custom: ${mapping.pipeline.object}` :
                       mapping.pipeline.type === "task_pattern" ? "Task-based" : "Not tracked"}
                detail={mapping.pipeline.stageField ? `Stage: ${mapping.pipeline.stageField}` : undefined}
                confidence={mapping.pipeline.confidence}
              />

              {/* Automation Risks */}
              <div className="flex items-start gap-3 py-3 mt-2 border-t border-slate-100">
                <div className="w-8 h-8 rounded-lg bg-slate-100 text-slate-500 flex items-center justify-center flex-shrink-0">
                  <Zap size={16} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-slate-700">Automation Risk</span>
                    <RiskBadge level={mapping.automationRisks.riskLevel} />
                  </div>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {mapping.automationRisks.taskFlowCount} Flows on Task · {mapping.automationRisks.accountTriggerCount} Triggers on Account · {mapping.automationRisks.blockingValidationRules.length} Validation Rules
                  </p>
                </div>
              </div>

              {/* Warnings */}
              {mapping.warnings.length > 0 && (
                <div className="mt-3 bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-1.5">
                  <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">Needs Review</p>
                  {mapping.warnings.map((w, i) => (
                    <p key={i} className="text-sm text-amber-800">{w}</p>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Re-run */}
      {mapping && (
        <button
          onClick={runDiscovery}
          disabled={discovering}
          className="mt-4 w-full py-3 rounded-2xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2"
        >
          {discovering ? <><Loader2 size={16} className="animate-spin" /> Re-scanning...</> : <><Search size={16} /> Re-run Discovery</>}
        </button>
      )}

      {/* Seed Discovery Demo Data */}
      <SeedDiscoveryButton onSeeded={runDiscovery} />
    </div>
  );
}

// ─── Seed Discovery Demo Data Button ────────────────────────────────────────

function SeedDiscoveryButton({ onSeeded }: { onSeeded: () => void }) {
  const [seeding, setSeeding] = useState(false);
  const [result, setResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [details, setDetails] = useState<string[]>([]);

  const handleSeed = async () => {
    setSeeding(true);
    setResult(null);
    setDetails([]);
    try {
      const csrfRes = await fetch("/api/csrf");
      const csrfData = await csrfRes.json();
      const token = csrfData.token || "";

      const res = await fetch("/api/salesforce/seed/discovery", {
        method: "POST",
        headers: { "x-csrf-token": token },
      });
      const data = await res.json();
      setResult({ success: data.success, message: data.message || data.error || "Done" });
      if (data.details) setDetails(data.details);
      if (data.success) {
        // Auto-run discovery after seeding to show the new data
        setTimeout(onSeeded, 500);
      }
    } catch (err) {
      setResult({ success: false, message: err instanceof Error ? err.message : "Seed failed" });
    }
    setSeeding(false);
  };

  return (
    <div className="mt-6 bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
      <div>
        <p className="text-sm font-medium text-slate-700 mb-1">Seed Discovery Demo Data</p>
        <p className="text-xs text-slate-400">
          Creates 8 households with contacts, financial accounts ($47M AUM across 30+ accounts),
          compliance reviews, meeting notes, DocuSign tasks, and pipeline opportunities.
          Safe to run multiple times — skips existing records.
        </p>
      </div>

      <button
        onClick={handleSeed}
        disabled={seeding}
        className="w-full py-3 rounded-2xl bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
      >
        {seeding ? <><Loader2 size={16} className="animate-spin" /> Seeding demo data...</> : <><Database size={16} /> Seed Discovery Data</>}
      </button>

      {result && (
        <div className={`p-4 rounded-xl text-sm ${result.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
          <p>{result.success ? <Check size={14} className="inline mr-1.5" /> : <AlertTriangle size={14} className="inline mr-1.5" />}{result.message}</p>
          {details.length > 0 && (
            <>
              <button onClick={() => setShowDetails(!showDetails)} className="text-xs underline mt-2 opacity-70 hover:opacity-100">
                {showDetails ? "Hide details" : "Show details"}
              </button>
              {showDetails && (
                <div className="mt-2 max-h-48 overflow-y-auto text-xs font-mono space-y-0.5 bg-white/50 rounded-lg p-2">
                  {details.map((d, i) => <p key={i}>{d}</p>)}
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Webhook Configuration Panel ────────────────────────────────────────────

const WEBHOOK_KEY = "min-webhooks";
const WEBHOOK_EVENTS = ["onboard_complete", "compliance_review", "task_overdue", "docusign_sent", "meeting_logged"];

interface WebhookConfig { id: string; url: string; events: string[]; enabled: boolean; lastDelivery?: string }

function WebhookPanel() {
  const [webhooks, setWebhooks] = useState<WebhookConfig[]>(() => {
    if (typeof window === "undefined") return [];
    try { return JSON.parse(localStorage.getItem(WEBHOOK_KEY) || "[]"); } catch { return []; }
  });
  const [newUrl, setNewUrl] = useState("");
  const [newEvents, setNewEvents] = useState<Set<string>>(new Set(["onboard_complete"]));

  const save = (wh: WebhookConfig[]) => { setWebhooks(wh); localStorage.setItem(WEBHOOK_KEY, JSON.stringify(wh)); };

  const addWebhook = () => {
    if (!newUrl.trim()) return;
    const wh: WebhookConfig = { id: Date.now().toString(), url: newUrl.trim(), events: Array.from(newEvents), enabled: true };
    save([...webhooks, wh]);
    setNewUrl("");
    setNewEvents(new Set(["onboard_complete"]));
  };

  const removeWebhook = (id: string) => save(webhooks.filter(w => w.id !== id));
  const toggleWebhook = (id: string) => save(webhooks.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));

  return (
    <div className="mt-10 animate-fade-in">
      <h2 className="text-2xl font-light text-slate-900 mb-2">Webhook Notifications</h2>
      <p className="text-slate-400 mb-6">Send POST requests to external URLs when events happen in Min.</p>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        {webhooks.map(wh => (
          <div key={wh.id} className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl">
            <button onClick={() => toggleWebhook(wh.id)}
              aria-label={`${wh.enabled ? "Disable" : "Enable"} webhook`} aria-pressed={wh.enabled}
              className={`w-2 h-2 rounded-full flex-shrink-0 ${wh.enabled ? "bg-green-500" : "bg-slate-300"}`} />
            <div className="flex-1 min-w-0">
              <p className="text-sm text-slate-700 truncate font-mono">{wh.url}</p>
              <div className="flex items-center gap-1 mt-0.5">
                {wh.events.map(e => <span key={e} className="text-[10px] px-1.5 py-0.5 rounded bg-slate-200 text-slate-500">{e}</span>)}
              </div>
            </div>
            <button onClick={() => removeWebhook(wh.id)} aria-label={`Remove webhook ${wh.url}`} className="text-slate-300 hover:text-red-500"><Trash2 size={14} /></button>
          </div>
        ))}

        <div className="space-y-3 pt-2 border-t border-slate-100">
          <input value={newUrl} onChange={e => setNewUrl(e.target.value)} placeholder="https://hooks.slack.com/services/..."
            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900" />
          <div className="flex flex-wrap gap-2">
            {WEBHOOK_EVENTS.map(e => (
              <button key={e} onClick={() => setNewEvents(prev => { const s = new Set(prev); if (s.has(e)) s.delete(e); else s.add(e); return s; })}
                className={`text-[10px] px-2.5 py-1 rounded-full font-medium transition-all ${newEvents.has(e) ? "bg-slate-900 text-white" : "bg-white border border-slate-200 text-slate-500"}`}>
                {e.replace(/_/g, " ")}
              </button>
            ))}
          </div>
          <button onClick={addWebhook} disabled={!newUrl.trim()}
            className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 disabled:opacity-30 transition-colors flex items-center justify-center gap-2">
            <Plus size={14} /> Add Webhook
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── White-Label Portal Panel ───────────────────────────────────────────────

const BRANDING_KEY = "min-portal-branding";

interface PortalBranding { firmName: string; primaryColor: string; logoUrl: string }

function PortalBrandingPanel() {
  const [branding, setBranding] = useState<PortalBranding>(() => {
    if (typeof window === "undefined") return { firmName: "", primaryColor: "#0f172a", logoUrl: "" };
    try { return JSON.parse(localStorage.getItem(BRANDING_KEY) || "null") || { firmName: "", primaryColor: "#0f172a", logoUrl: "" }; } catch { return { firmName: "", primaryColor: "#0f172a", logoUrl: "" }; }
  });
  const [saved, setSaved] = useState(false);

  const save = () => {
    localStorage.setItem(BRANDING_KEY, JSON.stringify(branding));
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mt-10 animate-fade-in">
      <h2 className="text-2xl font-light text-slate-900 mb-2">Portal Branding</h2>
      <p className="text-slate-400 mb-6">Customize the client-facing onboarding portal with your firm's branding.</p>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">Firm Display Name</label>
          <input value={branding.firmName} onChange={e => setBranding({ ...branding, firmName: e.target.value })}
            placeholder="Calloway Capital Partners"
            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">Primary Color</label>
          <div className="flex items-center gap-3">
            <input type="color" value={branding.primaryColor} onChange={e => setBranding({ ...branding, primaryColor: e.target.value })}
              className="w-10 h-10 rounded-lg border border-slate-200 cursor-pointer" />
            <input value={branding.primaryColor} onChange={e => setBranding({ ...branding, primaryColor: e.target.value })}
              className="flex-1 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 font-mono focus:outline-none focus:ring-2 focus:ring-slate-900" />
          </div>
        </div>
        <div>
          <label className="text-xs text-slate-500 mb-1.5 block">Logo URL (optional)</label>
          <input value={branding.logoUrl} onChange={e => setBranding({ ...branding, logoUrl: e.target.value })}
            placeholder="https://example.com/logo.png"
            className="w-full h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 placeholder:text-slate-300 focus:outline-none focus:ring-2 focus:ring-slate-900" />
        </div>

        {/* Preview */}
        <div className="p-4 rounded-xl border border-slate-200 bg-slate-50">
          <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-2">Preview</p>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl flex items-center justify-center text-white font-bold" style={{ backgroundColor: branding.primaryColor }}>
              {branding.firmName ? branding.firmName[0].toUpperCase() : "M"}
            </div>
            <div>
              <p className="text-sm font-medium text-slate-700">{branding.firmName || "Your Firm"}</p>
              <p className="text-xs text-slate-400">Client Onboarding Portal</p>
            </div>
          </div>
        </div>

        <button onClick={save}
          className="w-full py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
          {saved ? <><Check size={14} /> Saved</> : "Save Branding"}
        </button>
      </div>
    </div>
  );
}

// ─── Integration Marketplace Panel ──────────────────────────────────────────

const INTEGRATIONS_KEY = "min-integrations";

interface Integration { id: string; name: string; description: string; icon: React.ElementType; category: string; connected: boolean }

const AVAILABLE_INTEGRATIONS: Omit<Integration, "connected">[] = [
  { id: "calendly", name: "Calendly", description: "Sync meeting schedules and auto-create briefings", icon: Calendar, category: "Scheduling" },
  { id: "orion", name: "Orion", description: "Import portfolio data and performance reporting", icon: LineChart, category: "Portfolio" },
  { id: "moneyguide", name: "MoneyGuidePro", description: "Sync financial plans and goal tracking", icon: BarChart3, category: "Planning" },
  { id: "docusign", name: "DocuSign", description: "E-signature status and document tracking", icon: PenTool, category: "Documents" },
  { id: "slack", name: "Slack", description: "Push notifications and activity feed to channels", icon: Bell, category: "Communication" },
];

function IntegrationMarketplace() {
  const [connected, setConnected] = useState<Set<string>>(() => {
    if (typeof window === "undefined") return new Set();
    try { return new Set(JSON.parse(localStorage.getItem(INTEGRATIONS_KEY) || "[]")); } catch { return new Set(); }
  });

  const toggle = (id: string) => {
    setConnected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      localStorage.setItem(INTEGRATIONS_KEY, JSON.stringify(Array.from(next)));
      return next;
    });
  };

  return (
    <div className="mt-10 animate-fade-in">
      <h2 className="text-2xl font-light text-slate-900 mb-2">Integrations</h2>
      <p className="text-slate-400 mb-6">Connect Min to your existing tools and services.</p>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-50">
        {AVAILABLE_INTEGRATIONS.map(int => {
          const isConnected = connected.has(int.id);
          const Icon = int.icon;
          return (
            <div key={int.id} className="flex items-center gap-4 px-6 py-4">
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isConnected ? "bg-green-50 text-green-600" : "bg-slate-100 text-slate-400"}`}>
                <Icon size={18} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium text-slate-700">{int.name}</p>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-400">{int.category}</span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">{int.description}</p>
              </div>
              <button onClick={() => toggle(int.id)}
                className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-all ${isConnected
                  ? "bg-green-100 text-green-700 hover:bg-red-100 hover:text-red-700"
                  : "bg-slate-900 text-white hover:bg-slate-800"}`}>
                {isConnected ? "Connected" : "Connect"}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Triage Threshold Panel ──────────────────────────────────────────────────

const THRESHOLD_FIELDS: { key: keyof TriageThresholdConfig; label: string; desc: string; unit: string }[] = [
  { key: "unsignedDocuSignDays", label: "Unsigned DocuSign", desc: "Days before unsigned envelopes trigger urgency", unit: "days" },
  { key: "dueSoonDays", label: "Due Soon Window", desc: "Days until due to appear as 'due soon'", unit: "days" },
  { key: "complianceUnreviewedDays", label: "Compliance Unreviewed", desc: "Days without review before triage alert", unit: "days" },
  { key: "staleHouseholdDays", label: "Stale Household", desc: "Days of inactivity before household flagged", unit: "days" },
  { key: "triageCap", label: "Triage Queue Limit", desc: "Max items shown in triage queue", unit: "items" },
  { key: "complianceCriticalPct", label: "Compliance Critical %", desc: "Coverage below this % is critical severity", unit: "%" },
  { key: "complianceHighPct", label: "Compliance High %", desc: "Coverage below this % triggers insight", unit: "%" },
  { key: "unsignedCriticalDays", label: "Unsigned Critical", desc: "Days unsigned before severity is critical", unit: "days" },
  { key: "staleCriticalDays", label: "Stale Critical", desc: "Days stale before severity is critical", unit: "days" },
  { key: "highPriOverdueCriticalDays", label: "High-Pri Overdue Critical", desc: "Days overdue on high-priority before critical", unit: "days" },
];

function TriageThresholdPanel() {
  const [config, setConfig] = useState<TriageThresholdConfig>(() => loadTriageConfig());
  const [saved, setSaved] = useState(false);

  const save = () => {
    saveTriageConfig(config);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const reset = () => {
    setConfig({ ...DEFAULT_TRIAGE_CONFIG });
    saveTriageConfig({ ...DEFAULT_TRIAGE_CONFIG });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="mt-10 animate-fade-in">
      <h2 className="text-2xl font-light text-slate-900 mb-2">Triage &amp; Alerts</h2>
      <p className="text-slate-400 mb-6">Customize urgency thresholds for triage queue and practice insights.</p>

      <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
        {THRESHOLD_FIELDS.map(f => (
          <div key={f.key}>
            <label className="text-xs text-slate-500 mb-1 block">{f.label}</label>
            <div className="flex items-center gap-3">
              <input
                type="number"
                min={0}
                value={config[f.key]}
                onChange={e => setConfig({ ...config, [f.key]: Math.max(0, Number(e.target.value)) })}
                className="w-24 h-10 rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 text-right tabular-nums focus:outline-none focus:ring-2 focus:ring-slate-900"
              />
              <span className="text-xs text-slate-400">{f.unit}</span>
              <span className="flex-1 text-xs text-slate-400 text-right">{f.desc}</span>
            </div>
          </div>
        ))}

        <div className="flex gap-3 pt-2 border-t border-slate-100">
          <button onClick={save}
            className="flex-1 py-2.5 rounded-xl bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition-colors flex items-center justify-center gap-2">
            {saved ? <><Check size={14} /> Saved</> : "Save Thresholds"}
          </button>
          <button onClick={reset}
            className="py-2.5 px-4 rounded-xl border border-slate-200 text-slate-500 text-sm font-medium hover:bg-slate-50 transition-colors">
            Reset to Defaults
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Settings Screen ────────────────────────────────────────────────────────

export function SettingsScreen({ onExit }: { onExit: () => void }) {
  const [status, setStatus] = useState<ConnectionStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [sfDomain, setSfDomain] = useState("");
  const [connecting, setConnecting] = useState(false);
  const [disconnecting, setDisconnecting] = useState(false);
  const [error, setError] = useState("");
  const [testResult, setTestResult] = useState<"pass" | "fail" | null>(null);
  const [testing, setTesting] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<{ success: boolean; message: string } | null>(null);

  const fetchStatus = useCallback(async () => {
    try {
      const res = await fetch("/api/salesforce/connection");
      const data = await res.json();
      setStatus(data);
    } catch {
      setStatus({ connected: false });
    }
    setLoading(false);
  }, []);

  useEffect(() => { fetchStatus(); }, [fetchStatus]);

  const handleConnect = async () => {
    if (!sfDomain.trim()) { setError("Enter your Salesforce domain"); return; }
    setConnecting(true);
    setError("");
    try {
      const res = await fetch("/api/salesforce/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ domain: sfDomain.trim() }),
      });
      const data = await res.json();
      if (data.success && data.authUrl) {
        // Redirect to Salesforce for authorization
        window.location.href = data.authUrl;
      } else {
        setError(data.error || "Failed to start authorization");
        setConnecting(false);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Connection failed");
      setConnecting(false);
    }
  };

  const handleDisconnect = async () => {
    setDisconnecting(true);
    try {
      await fetch("/api/salesforce/connection", { method: "DELETE" });
      setStatus({ connected: false });
      setTestResult(null);
    } catch { /* swallow */ }
    setDisconnecting(false);
  };

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/salesforce");
      const data = await res.json();
      setTestResult(data.success ? "pass" : "fail");
    } catch {
      setTestResult("fail");
    }
    setTesting(false);
  };

  const fmtDate = (iso: string) => new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });

  return (
    <div className="flex h-screen bg-surface">
      <div className="flex-1 flex flex-col">
        <FlowHeader title="Settings" stepLabel="Configuration" onBack={onExit} />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-4 pb-16">
          <div className="max-w-xl w-full mx-auto">

            {/* Connection Status Card */}
            <div className="animate-fade-in">
              <h2 className="text-3xl font-light text-slate-900 mb-2">Salesforce Connection</h2>
              <p className="text-slate-400 mb-8">Connect Min to your Salesforce org to read and write client records.</p>

              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 size={24} className="animate-spin text-slate-400" />
                </div>
              ) : status?.connected ? (
                <div className="space-y-4">
                  {/* Connected state */}
                  <div className="bg-green-50 border border-green-200 rounded-2xl p-6">
                    <div className="flex items-center gap-4 mb-4">
                      <div className="w-12 h-12 rounded-xl bg-green-500 text-white flex items-center justify-center">
                        <Cloud size={24} />
                      </div>
                      <div>
                        <p className="font-medium text-green-900">Connected</p>
                        <p className="text-sm text-green-700">
                          {status.source === "oauth" ? "Authenticated via OAuth" : "Using environment configuration"}
                        </p>
                      </div>
                    </div>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between py-1.5 border-b border-green-100">
                        <span className="text-green-700">Instance</span>
                        <a href={status.instanceUrl} target="_blank" rel="noopener noreferrer" className="text-green-900 font-medium flex items-center gap-1 hover:underline">
                          {status.instanceUrl?.replace("https://", "").split(".")[0]} <ExternalLink size={12} />
                        </a>
                      </div>
                      {status.userName && (
                        <div className="flex justify-between py-1.5 border-b border-green-100">
                          <span className="text-green-700">User</span>
                          <span className="text-green-900 font-medium">{status.userName}</span>
                        </div>
                      )}
                      {status.connectedAt && (
                        <div className="flex justify-between py-1.5">
                          <span className="text-green-700">Connected</span>
                          <span className="text-green-900 font-medium">{fmtDate(status.connectedAt)}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Test Connection */}
                  <button onClick={handleTest} disabled={testing}
                    className="w-full py-3 rounded-2xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors flex items-center justify-center gap-2">
                    {testing ? <><Loader2 size={16} className="animate-spin" /> Testing...</> :
                     testResult === "pass" ? <><Check size={16} className="text-green-500" /> Connection verified</> :
                     testResult === "fail" ? <><AlertTriangle size={16} className="text-red-500" /> Connection failed</> :
                     "Test Connection"}
                  </button>

                  {/* Disconnect (only for OAuth connections) */}
                  {status.source === "oauth" && (
                    <button onClick={handleDisconnect} disabled={disconnecting}
                      className="w-full py-3 rounded-2xl border border-red-200 text-red-500 font-medium hover:bg-red-50 transition-colors">
                      {disconnecting ? "Disconnecting..." : "Disconnect"}
                    </button>
                  )}

                  {status.source === "env" && (
                    <p className="text-xs text-slate-400 text-center mt-2">
                      Connected via environment variables. To use a different org, connect via OAuth below.
                    </p>
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Disconnected state */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center">
                    <CloudOff size={40} className="text-slate-300 mx-auto mb-3" />
                    <p className="font-medium text-slate-600">Not Connected</p>
                    <p className="text-sm text-slate-400 mt-1">Enter your Salesforce domain to connect.</p>
                  </div>

                  <div>
                    <label className="text-sm text-slate-500 mb-1.5 block">Salesforce Domain</label>
                    <Input
                      className="h-14 text-lg rounded-xl"
                      placeholder="yourfirm.my.salesforce.com"
                      value={sfDomain}
                      onChange={e => { setSfDomain(e.target.value); setError(""); }}
                      onKeyDown={e => e.key === "Enter" && handleConnect()}
                    />
                    <p className="text-xs text-slate-400 mt-2">Found in your browser URL bar when logged into Salesforce.</p>
                  </div>

                  {error && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  )}

                  <ContinueBtn onClick={handleConnect} label={connecting ? "Redirecting to Salesforce..." : "Connect to Salesforce"} disabled={connecting || !sfDomain.trim()} processing={connecting} />

                  <div className="text-center">
                    <p className="text-xs text-slate-400">
                      Min will request read/write access to your Salesforce data.
                      <br />You can revoke access at any time from this screen.
                    </p>
                  </div>
                </div>
              )}
            </div>

            {/* Schema Discovery — only show when connected */}
            {status?.connected && <SchemaDiscoveryPanel />}

            {/* Demo Data Section */}
            {status?.connected && (
              <div className="mt-10 animate-fade-in">
                <h2 className="text-2xl font-light text-slate-900 mb-2">Demo Data</h2>
                <p className="text-slate-400 mb-6">Populate your Salesforce org with advisor assignments and planning goals for demo purposes.</p>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 space-y-4">
                  <div>
                    <p className="text-sm font-medium text-slate-700 mb-1">Seed Demo Data</p>
                    <p className="text-xs text-slate-400">Distributes existing households across demo advisors (Jon Cambras, Marcus Rivera, Diane Rivera) and creates planning goals for each household. Safe to run multiple times — skips already-configured households.</p>
                  </div>

                  <button
                    onClick={async () => {
                      setSeeding(true);
                      setSeedResult(null);
                      try {
                        const res = await fetch("/api/salesforce/seed", { method: "POST" });
                        const data = await res.json();
                        setSeedResult({ success: data.success, message: data.message || data.error || "Done" });
                      } catch (err) {
                        setSeedResult({ success: false, message: err instanceof Error ? err.message : "Seed failed" });
                      }
                      setSeeding(false);
                    }}
                    disabled={seeding}
                    className="w-full py-3 rounded-2xl bg-slate-900 text-white font-medium hover:bg-slate-800 disabled:opacity-50 transition-colors flex items-center justify-center gap-2"
                  >
                    {seeding ? <><Loader2 size={16} className="animate-spin" /> Seeding...</> : "Seed Demo Data"}
                  </button>

                  {seedResult && (
                    <div className={`p-4 rounded-xl text-sm ${seedResult.success ? "bg-green-50 border border-green-200 text-green-700" : "bg-red-50 border border-red-200 text-red-700"}`}>
                      {seedResult.success ? <Check size={14} className="inline mr-1.5" /> : <AlertTriangle size={14} className="inline mr-1.5" />}
                      {seedResult.message}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Integrations — always visible */}
            <IntegrationMarketplace />

            {/* Webhooks — visible when connected */}
            {status?.connected && <WebhookPanel />}

            {/* Portal Branding — always visible */}
            <PortalBrandingPanel />

            {/* Triage & Alert Thresholds — always visible */}
            <TriageThresholdPanel />

            {/* Roadmap — Coming Soon Features */}
            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
                <Zap size={16} className="text-slate-500" />
                <div>
                  <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Roadmap</h3>
                  <p className="text-xs text-slate-400">Features in development — request early access</p>
                </div>
              </div>
              <div className="divide-y divide-slate-50">
                {[
                  { icon: FileCheck, label: "Regulatory Filing Assistant", desc: "Auto-generate ADV amendments, Form CRS updates, and annual compliance filings from your Min data. Pre-fills IARD submissions.", status: "In Development" },
                  { icon: BarChart3, label: "Industry Benchmarking Network", desc: "Anonymized peer comparisons across 200+ RIA firms. See how your health score, compliance coverage, and task velocity rank.", status: "Beta Q2 2026" },
                  { icon: Shield, label: "Practice Certification Badge", desc: "Earn a verified 'Min Certified' badge for your website when your practice maintains a health score above 80 for 90 consecutive days.", status: "Coming Q3 2026" },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-4 px-5 py-4">
                    <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center flex-shrink-0">
                      <item.icon size={18} className="text-slate-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium text-slate-700">{item.label}</p>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-blue-100 text-blue-600 font-medium">{item.status}</span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

          </div>
        </div>
      </div>
    </div>
  );
}
