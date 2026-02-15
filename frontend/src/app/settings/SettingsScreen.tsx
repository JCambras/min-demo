"use client";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Cloud, CloudOff, ExternalLink, Loader2, Check, AlertTriangle, Search, ChevronDown, ChevronUp, Shield, Zap, Database, Users, DollarSign, BarChart3, FileCheck, GitBranch } from "lucide-react";
import { Input } from "@/components/ui/input";
import { ContinueBtn } from "@/components/shared/FormControls";

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
        <div className="px-4 sm:px-8 py-4 flex items-center gap-4">
          <button onClick={onExit} className="text-slate-300 hover:text-slate-600 transition-colors">
            <ArrowLeft size={22} strokeWidth={1.5} />
          </button>
          <h1 className="text-lg sm:text-xl font-light text-slate-900">Settings</h1>
        </div>

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

          </div>
        </div>
      </div>
    </div>
  );
}
