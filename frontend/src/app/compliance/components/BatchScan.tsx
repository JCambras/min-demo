"use client";
import { useState, useRef } from "react";
import { Loader2, Shield, AlertTriangle, Check, X, Download } from "lucide-react";
import { callSF } from "@/lib/salesforce";
import { runComplianceChecks } from "@/lib/compliance-engine";
import type { CheckResult, SFHousehold, SFContact, SFTask, AccountType } from "@/lib/compliance-engine";
import type { Screen, WorkflowContext } from "@/lib/types";

interface BatchResult {
  household: string;
  householdId: string;
  checks: CheckResult[];
  pass: number;
  warn: number;
  fail: number;
}

const BATCH_SCAN_KEY = "min-last-batch-scan";
const CHUNK_SIZE = 3;

function detectAccountType(desc: string): AccountType {
  const d = desc.toLowerCase();
  if (/trust|trustee/.test(d)) return "trust";
  if (/entity|llc|corp|endowment|foundation/.test(d)) return "entity";
  if (/ira|roth|401k|retirement|rmd/.test(d)) return "retirement";
  if (/joint|jtwros|jtic/.test(d)) return "joint";
  if (/individual/.test(d)) return "individual";
  return "unknown";
}

export function BatchScan({ onBack, onNavigate, firmName }: {
  onBack: () => void;
  onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void;
  firmName?: string;
}) {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [results, setResults] = useState<BatchResult[]>([]);
  const [skippedCount, setSkippedCount] = useState(0);
  const [scanError, setScanError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);
  const [individualPdfLoading, setIndividualPdfLoading] = useState(false);
  const [individualPdfProgress, setIndividualPdfProgress] = useState({ current: 0, total: 0 });
  const [individualPdfFailed, setIndividualPdfFailed] = useState(0);
  const [estimatedTimeRemaining, setEstimatedTimeRemaining] = useState<string | null>(null);
  const cancelRef = useRef(false);
  const [cancelled, setCancelled] = useState(false);

  // Check for cached results
  const [showCachedOption, setShowCachedOption] = useState(() => {
    if (typeof window === "undefined") return false;
    try {
      const cached = localStorage.getItem(BATCH_SCAN_KEY);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - (parsed.timestamp || 0);
        return age < 24 * 60 * 60 * 1000; // less than 24 hours old
      }
    } catch { /* */ }
    return false;
  });

  const loadCachedResults = () => {
    try {
      const cached = JSON.parse(localStorage.getItem(BATCH_SCAN_KEY) || "{}");
      if (cached.results) {
        setResults(cached.results);
        setSkippedCount(cached.skippedCount || 0);
        setLoading(false);
      }
    } catch { /* */ }
  };

  // Start batch scan on mount
  const [started, setStarted] = useState(false);
  if (!started && !showCachedOption) {
    setStarted(true);
    runBatchScan();
  }

  function runBatchScan() {
    setStarted(true);
    setShowCachedOption(false);
    cancelRef.current = false;
    setCancelled(false);
    setLoading(true);

    (async () => {
      const startTime = Date.now();
      try {
        const res = await callSF("queryTasks", { limit: 200 });
        if (!res.success) { setScanError("Failed to load households from Salesforce"); setLoading(false); return; }
        const households = (res.households || []) as SFHousehold[];
        setProgress({ current: 0, total: households.length });
        const batch: BatchResult[] = [];
        let skipped = 0;

        // Process in chunks of CHUNK_SIZE in parallel
        for (let chunkStart = 0; chunkStart < households.length; chunkStart += CHUNK_SIZE) {
          if (cancelRef.current) { setCancelled(true); break; }

          const chunk = households.slice(chunkStart, chunkStart + CHUNK_SIZE);
          const chunkResults = await Promise.allSettled(
            chunk.map(async (hh) => {
              const detail = await callSF("getHouseholdDetail", { householdId: hh.id });
              if (detail.success) {
                const detectedType = detectAccountType(hh.description || "");
                const checks = runComplianceChecks(
                  { id: hh.id, name: hh.name, description: hh.description || "", createdAt: hh.createdAt },
                  (detail.contacts || []) as SFContact[],
                  (detail.tasks || []) as SFTask[],
                  undefined,
                  detectedType,
                );
                return {
                  household: hh.name.replace(" Household", ""),
                  householdId: hh.id,
                  checks,
                  pass: checks.filter(c => c.status === "pass").length,
                  warn: checks.filter(c => c.status === "warn").length,
                  fail: checks.filter(c => c.status === "fail").length,
                } as BatchResult;
              }
              return null;
            })
          );

          for (const r of chunkResults) {
            if (r.status === "fulfilled" && r.value) batch.push(r.value);
            else skipped++;
          }

          const done = chunkStart + chunk.length;
          setProgress({ current: done, total: households.length });

          // Estimate time remaining
          const elapsed = Date.now() - startTime;
          const perItem = elapsed / done;
          const remaining = (households.length - done) * perItem;
          if (remaining > 1000) {
            const mins = Math.ceil(remaining / 60000);
            setEstimatedTimeRemaining(mins > 1 ? `~${mins} min remaining` : "< 1 min remaining");
          } else {
            setEstimatedTimeRemaining("Almost done...");
          }

          // Yield to main thread between chunks
          if (chunkStart + CHUNK_SIZE < households.length) {
            await new Promise<void>(resolve => {
              if (typeof requestIdleCallback !== "undefined") {
                requestIdleCallback(() => resolve());
              } else {
                setTimeout(resolve, 10);
              }
            });
          }
        }

        setSkippedCount(skipped);
        batch.sort((a, b) => b.fail - a.fail || b.warn - a.warn);
        setResults(batch);

        // Persist results to localStorage
        try {
          localStorage.setItem(BATCH_SCAN_KEY, JSON.stringify({ results: batch, skippedCount: skipped, timestamp: Date.now() }));
        } catch { /* quota exceeded — that's fine */ }
      } catch (err) {
        setScanError(err instanceof Error ? err.message : "Batch scan failed");
      }
      setLoading(false);
      setEstimatedTimeRemaining(null);
    })();
  }

  const handleCancel = () => {
    cancelRef.current = true;
  };

  const downloadBatchPDF = async () => {
    setPdfLoading(true);
    setPdfError(null);
    try {
      const reviewDate = new Date().toLocaleDateString();
      const checks = results.flatMap(r => r.checks.map(c => ({
        label: c.label, category: c.category, regulation: c.regulation, status: c.status,
        detail: `[${r.household}] ${c.detail}`,
      })));
      const res = await fetch("/api/pdf/compliance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyName: `Firm-Wide (${results.length} Households)`,
          householdUrl: "",
          contacts: [],
          tasksScanned: results.length,
          checks: checks.slice(0, 100),
          reviewDate,
          nextReviewDate: new Date(Date.now() + 90 * 86400000).toLocaleDateString(),
          firmName: firmName || undefined,
        }),
      });
      const data = await res.json();
      if (data.success && data.pdf) {
        const link = document.createElement("a");
        link.href = data.pdf;
        link.download = `Firm-Wide-Compliance-${reviewDate.replace(/\//g, "-")}.pdf`;
        link.click();
      } else {
        setPdfError("PDF generation failed");
      }
    } catch {
      setPdfError("Failed to download firm report");
    }
    setPdfLoading(false);
  };

  const downloadIndividualPDFs = async () => {
    setIndividualPdfLoading(true);
    setIndividualPdfProgress({ current: 0, total: results.length });
    setIndividualPdfFailed(0);
    const reviewDate = new Date().toLocaleDateString();
    const quarter = `Q${Math.ceil((new Date().getMonth() + 1) / 3)}-${new Date().getFullYear()}`;
    let failed = 0;

    for (let i = 0; i < results.length; i++) {
      setIndividualPdfProgress({ current: i + 1, total: results.length });
      const r = results[i];
      try {
        const res = await fetch("/api/pdf/compliance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            familyName: r.household,
            householdUrl: "",
            contacts: [],
            tasksScanned: r.checks.length,
            checks: r.checks.map(c => ({
              label: c.label, category: c.category, regulation: c.regulation,
              status: c.status, detail: c.detail,
            })),
            reviewDate,
            nextReviewDate: new Date(Date.now() + 90 * 86400000).toLocaleDateString(),
            firmName: firmName || undefined,
          }),
        });
        const data = await res.json();
        if (data.success && data.pdf) {
          const link = document.createElement("a");
          link.href = data.pdf;
          link.download = `${r.household.replace(/\s+/g, "_")}_Compliance_${quarter}.pdf`;
          link.click();
        } else {
          failed++;
        }
        if (i < results.length - 1) await new Promise(r => setTimeout(r, 300));
      } catch {
        failed++;
      }
    }
    setIndividualPdfFailed(failed);
    setIndividualPdfLoading(false);
  };

  // Show cached results option
  if (showCachedOption && !started) {
    return (
      <div className="animate-fade-in text-center pt-8">
        <Shield size={40} className="text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-light text-slate-900 mb-2">Previous Scan Available</h2>
        <p className="text-sm text-slate-400 mb-6">A recent batch scan is cached. You can view those results or run a new scan.</p>
        <div className="flex gap-3 justify-center">
          <button onClick={loadCachedResults}
            className="px-5 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm">
            View Last Results
          </button>
          <button onClick={runBatchScan}
            className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">
            Run New Scan
          </button>
          <button onClick={onBack}
            className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 font-medium hover:bg-slate-50 transition-colors text-sm">Back</button>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="animate-fade-in text-center pt-8">
        <Loader2 size={40} className="animate-spin text-green-500 mx-auto mb-4" />
        <h2 className="text-2xl font-light text-slate-900 mb-2">Scanning All Households</h2>
        <p className="text-slate-400 mb-4">Checking {progress.current} of {progress.total} households...</p>
        <div className="max-w-xs mx-auto">
          <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
            <div className="h-full bg-green-400 rounded-full transition-all duration-300" style={{ width: `${progress.total > 0 ? (progress.current / progress.total) * 100 : 0}%` }} />
          </div>
          {estimatedTimeRemaining && (
            <p className="text-xs text-slate-400 mt-2">{estimatedTimeRemaining}</p>
          )}
        </div>
        <button onClick={handleCancel}
          className="mt-4 px-4 py-2 rounded-xl border border-red-200 text-red-500 text-sm font-medium hover:bg-red-50 transition-colors">
          Cancel Scan
        </button>
      </div>
    );
  }

  if (scanError) {
    return (
      <div className="animate-fade-in text-center pt-8">
        <AlertTriangle size={40} className="text-red-400 mx-auto mb-4" />
        <h2 className="text-2xl font-light text-slate-900 mb-2">Scan Failed</h2>
        <p className="text-sm text-slate-500 mb-6">{scanError}</p>
        <button onClick={onBack} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 font-medium hover:bg-slate-50 transition-colors text-sm">Back to Search</button>
      </div>
    );
  }

  if (results.length === 0) return null;

  const totalFails = results.reduce((s, r) => s + r.fail, 0);
  const totalWarns = results.reduce((s, r) => s + r.warn, 0);
  const totalPasses = results.reduce((s, r) => s + r.pass, 0);
  const cleanHouseholds = results.filter(r => r.fail === 0).length;

  return (
    <div className="animate-fade-in">
      <h2 className="text-3xl font-light text-slate-900 mb-2">Firm-Wide Compliance</h2>
      <p className="text-slate-400 mb-6">{results.length} households scanned · {new Date().toLocaleDateString()}{cancelled ? " (partial — scan cancelled)" : ""}</p>

      {skippedCount > 0 && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 mb-4 animate-fade-in">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">{skippedCount} household{skippedCount > 1 ? "s" : ""} skipped due to errors. Results below reflect {results.length} successfully scanned.</p>
        </div>
      )}

      {pdfError && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-red-50 border border-red-200 mb-4 animate-fade-in">
          <AlertTriangle size={16} className="text-red-500 flex-shrink-0" />
          <p className="text-xs text-red-700">{pdfError}</p>
          <button onClick={() => setPdfError(null)} className="text-red-400 hover:text-red-600 ml-auto flex-shrink-0"><X size={14} /></button>
        </div>
      )}

      {individualPdfFailed > 0 && !individualPdfLoading && (
        <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-amber-50 border border-amber-200 mb-4 animate-fade-in">
          <AlertTriangle size={16} className="text-amber-500 flex-shrink-0" />
          <p className="text-xs text-amber-700">{individualPdfFailed} of {results.length} individual PDF{individualPdfFailed > 1 ? "s" : ""} failed to generate.</p>
        </div>
      )}

      {/* Summary card */}
      <div className={`rounded-2xl p-5 mb-6 ${totalFails === 0 ? "bg-green-50 border border-green-200" : "bg-amber-50 border border-amber-200"}`}>
        <div className="flex items-center gap-4 mb-3">
          <div className={`w-12 h-12 rounded-full flex items-center justify-center ${totalFails === 0 ? "bg-green-500" : "bg-amber-500"} text-white`}>
            {totalFails === 0 ? <Shield size={24} /> : <AlertTriangle size={24} />}
          </div>
          <div>
            <p className={`text-lg font-medium ${totalFails === 0 ? "text-green-900" : "text-amber-900"}`}>
              {totalFails === 0 ? "All Households Pass" : `${results.length - cleanHouseholds} Household${results.length - cleanHouseholds > 1 ? "s" : ""} Need Attention`}
            </p>
            <p className="text-xs text-slate-500">{cleanHouseholds}/{results.length} fully compliant</p>
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-white/60 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-green-700">{totalPasses}</p>
            <p className="text-[10px] text-slate-500">Passed</p>
          </div>
          <div className="bg-white/60 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-amber-600">{totalWarns}</p>
            <p className="text-[10px] text-slate-500">Warnings</p>
          </div>
          <div className="bg-white/60 rounded-xl p-3 text-center">
            <p className="text-lg font-semibold text-red-600">{totalFails}</p>
            <p className="text-[10px] text-slate-500">Failed</p>
          </div>
        </div>
      </div>

      {/* Household-level results */}
      <div className="space-y-2 mb-6">
        {results.map((r, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-4 flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${r.fail === 0 ? "bg-green-100" : "bg-red-100"}`}>
              {r.fail === 0 ? <Check size={14} className="text-green-600" /> : <X size={14} className="text-red-600" />}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-slate-800">{r.household}</p>
              <div className="flex items-center gap-3 text-[10px] mt-0.5">
                <span className="text-green-600">{r.pass} pass</span>
                {r.warn > 0 && <span className="text-amber-500">{r.warn} warn</span>}
                {r.fail > 0 && <span className="text-red-500">{r.fail} fail</span>}
              </div>
            </div>
            {onNavigate && (
              <button onClick={() => onNavigate("compliance", { householdId: r.householdId, familyName: r.household })}
                className="text-[10px] text-blue-600 hover:text-blue-800 font-medium">Details →</button>
            )}
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-3 justify-center">
        <button onClick={downloadBatchPDF} disabled={pdfLoading}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm disabled:opacity-50">
          {pdfLoading ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />} Download Firm Report
        </button>
        <button onClick={downloadIndividualPDFs} disabled={individualPdfLoading}
          className="inline-flex items-center gap-2 px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm disabled:opacity-50">
          {individualPdfLoading ? <><Loader2 size={16} className="animate-spin" /> {individualPdfProgress.current}/{individualPdfProgress.total}</> : <><Download size={16} /> Individual PDFs</>}
        </button>
        <button onClick={onBack}
          className="px-5 py-3 rounded-xl border border-slate-200 text-slate-500 font-medium hover:bg-slate-50 transition-colors text-sm">Back to Search</button>
      </div>
    </div>
  );
}
