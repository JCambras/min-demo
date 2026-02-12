"use client";
import { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Cloud, CloudOff, ExternalLink, Loader2, Check, AlertTriangle } from "lucide-react";
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
    <div className="flex h-screen bg-[#fafafa]">
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
