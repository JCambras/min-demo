"use client";
import { useState, useRef, useCallback } from "react";
import { Upload, FileText, Loader2, Check, X, Search, Building2, FileWarning, ArrowRight, ExternalLink, Sparkles } from "lucide-react";
import { FlowHeader } from "@/components/shared/FlowHeader";
import { ContinueBtn } from "@/components/shared/FormControls";
import { Input } from "@/components/ui/input";
import { callSF } from "@/lib/salesforce";
import { timestamp } from "@/lib/format";
import type { Screen, WorkflowContext, SFEvidence } from "@/lib/types";

// ─── Document Types ──────────────────────────────────────────────────────────

interface ExtractedField {
  label: string;
  value: string;
  confidence: "high" | "medium" | "low";
}

interface DocumentClassification {
  type: string;
  subtype: string;
  description: string;
  icon: React.ReactNode;
}

const DOCUMENT_TYPES: DocumentClassification[] = [
  { type: "acat", subtype: "ACAT Transfer Notice", description: "Incoming account transfer notification from custodian", icon: <ArrowRight size={16} /> },
  { type: "trust", subtype: "Trust Amendment", description: "Trust document modification or restatement", icon: <FileText size={16} /> },
  { type: "letter", subtype: "Client Correspondence", description: "Letter or communication from client", icon: <FileText size={16} /> },
  { type: "tax", subtype: "Tax Document", description: "1099, K-1, or other tax form", icon: <FileText size={16} /> },
  { type: "custodian", subtype: "Custodian Notice", description: "Account statement, fee notice, or regulatory update", icon: <Building2 size={16} /> },
  { type: "application", subtype: "Account Application", description: "New account or service application", icon: <FileText size={16} /> },
  { type: "beneficiary", subtype: "Beneficiary Change", description: "Beneficiary designation update", icon: <FileText size={16} /> },
  { type: "other", subtype: "Other Document", description: "Unclassified document", icon: <FileWarning size={16} /> },
];

// Simulated extraction results based on document type
function simulateExtraction(docType: string, familyName: string): ExtractedField[] {
  switch (docType) {
    case "acat":
      return [
        { label: "Transfer Type", value: "Full ACAT", confidence: "high" },
        { label: "Delivering Firm", value: "Fidelity Investments", confidence: "high" },
        { label: "Account Number", value: `****${Math.floor(1000 + Math.random() * 9000)}`, confidence: "high" },
        { label: "Estimated Value", value: `$${(200000 + Math.floor(Math.random() * 800000)).toLocaleString()}`, confidence: "medium" },
        { label: "Client Name", value: familyName || "Unknown", confidence: "high" },
        { label: "Expected Completion", value: new Date(Date.now() + 5 * 86400000).toLocaleDateString(), confidence: "medium" },
        { label: "Asset Types", value: "Equities, Mutual Funds, Cash", confidence: "medium" },
      ];
    case "trust":
      return [
        { label: "Trust Name", value: `${familyName || "Client"} Family Trust`, confidence: "high" },
        { label: "Amendment Date", value: new Date().toLocaleDateString(), confidence: "high" },
        { label: "Amendment Type", value: "Trustee Change", confidence: "medium" },
        { label: "Successor Trustee", value: "Named in document", confidence: "low" },
        { label: "EIN", value: `**-***${Math.floor(1000 + Math.random() * 9000)}`, confidence: "medium" },
      ];
    case "tax":
      return [
        { label: "Form Type", value: "1099-DIV", confidence: "high" },
        { label: "Tax Year", value: `${new Date().getFullYear() - 1}`, confidence: "high" },
        { label: "Total Dividends", value: `$${(5000 + Math.floor(Math.random() * 20000)).toLocaleString()}`, confidence: "high" },
        { label: "Qualified Dividends", value: `$${(3000 + Math.floor(Math.random() * 15000)).toLocaleString()}`, confidence: "high" },
        { label: "Payer", value: "Charles Schwab & Co.", confidence: "high" },
      ];
    case "beneficiary":
      return [
        { label: "Account Type", value: "Traditional IRA", confidence: "high" },
        { label: "Primary Beneficiary", value: "Spouse (100%)", confidence: "medium" },
        { label: "Contingent Beneficiary", value: "Children (equal shares)", confidence: "medium" },
        { label: "Effective Date", value: new Date().toLocaleDateString(), confidence: "high" },
      ];
    default:
      return [
        { label: "Document Date", value: new Date().toLocaleDateString(), confidence: "high" },
        { label: "Client Reference", value: familyName || "Unknown", confidence: "medium" },
        { label: "Pages", value: `${1 + Math.floor(Math.random() * 5)}`, confidence: "high" },
      ];
  }
}

// ─── Component ────────────────────────────────────────────────────────────────

type Step = "upload" | "classifying" | "review" | "linking" | "complete";

export function DocumentScreen({ onExit, initialContext, onNavigate }: {
  onExit: () => void;
  initialContext?: WorkflowContext | null;
  onNavigate?: (screen: Screen, ctx?: WorkflowContext) => void;
}) {
  const [step, setStep] = useState<Step>("upload");
  const [fileName, setFileName] = useState("");
  const [filePreview, setFilePreview] = useState<string | null>(null);
  const [classification, setClassification] = useState<DocumentClassification | null>(null);
  const [extractedFields, setExtractedFields] = useState<ExtractedField[]>([]);
  const [evidence, setEvidence] = useState<SFEvidence[]>([]);
  const [showRightPane, setShowRightPane] = useState(false);

  // Household linking
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchResults, setSearchResults] = useState<{ id: string; name: string }[]>([]);
  const [linkedHousehold, setLinkedHousehold] = useState<{ id: string; name: string } | null>(
    initialContext ? { id: initialContext.householdId, name: initialContext.familyName + " Household" } : null
  );

  const fileInputRef = useRef<HTMLInputElement>(null);
  const familyName = linkedHousehold?.name?.replace(" Household", "") || "";

  const addEv = useCallback((label: string, url?: string) => {
    setEvidence(prev => [...prev, { label, url, timestamp: timestamp() }]);
  }, []);

  // File upload handler
  const handleFileUpload = async (file: File) => {
    setFileName(file.name);
    if (file.type.startsWith("image/")) {
      const reader = new FileReader();
      reader.onload = e => setFilePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    }
    addEv(`Uploaded: ${file.name} (${(file.size / 1024).toFixed(0)} KB)`);
    setStep("classifying");

    // Simulate classification
    await new Promise(r => setTimeout(r, 1500));

    // Pick a classification based on filename heuristics or random
    const name = file.name.toLowerCase();
    let docType = DOCUMENT_TYPES.find(d => d.type === "other")!;
    if (name.includes("acat") || name.includes("transfer")) docType = DOCUMENT_TYPES.find(d => d.type === "acat")!;
    else if (name.includes("trust")) docType = DOCUMENT_TYPES.find(d => d.type === "trust")!;
    else if (name.includes("1099") || name.includes("tax")) docType = DOCUMENT_TYPES.find(d => d.type === "tax")!;
    else if (name.includes("beneficiary") || name.includes("bene")) docType = DOCUMENT_TYPES.find(d => d.type === "beneficiary")!;
    else if (name.includes("letter") || name.includes("correspondence")) docType = DOCUMENT_TYPES.find(d => d.type === "letter")!;
    else {
      // Random classification for demo
      const types = DOCUMENT_TYPES.filter(d => d.type !== "other");
      docType = types[Math.floor(Math.random() * types.length)];
    }

    setClassification(docType);
    addEv(`Classified as: ${docType.subtype}`);

    // Simulate extraction
    await new Promise(r => setTimeout(r, 1000));
    const fields = simulateExtraction(docType.type, familyName);
    setExtractedFields(fields);
    addEv(`${fields.length} fields extracted`);

    setStep("review");
  };

  // Household search
  const searchHouseholds = async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) { setSearchResults([]); return; }
    setIsSearching(true);
    try {
      const res = await callSF("searchHouseholds", { query });
      if (res.success) {
        setSearchResults((res.households as { id: string; name: string }[]).map(h => ({ id: h.id, name: h.name })));
      }
    } catch { /* swallow */ }
    setIsSearching(false);
  };

  // Save to Salesforce
  const saveToSalesforce = async () => {
    setStep("linking");
    try {
      const description = [
        `Document Type: ${classification?.subtype || "Unknown"}`,
        `File: ${fileName}`,
        `\nExtracted Fields:`,
        ...extractedFields.map(f => `${f.label}: ${f.value} (${f.confidence} confidence)`),
      ].join("\n");

      const res = await callSF("createTask", {
        householdId: linkedHousehold?.id || "",
        subject: `DOCUMENT INGESTED: ${classification?.subtype || "Document"} — ${familyName || "Unlinked"}`,
        description,
        priority: classification?.type === "acat" ? "High" : "Normal",
        status: "Open",
      });

      if (res.success) {
        addEv("Saved to Salesforce", res.task?.url);
      }
      setStep("complete");
    } catch (err) {
      addEv(`Error: ${err instanceof Error ? err.message : "Unknown"}`);
      setStep("review");
    }
  };

  const reset = () => {
    setStep("upload");
    setFileName("");
    setFilePreview(null);
    setClassification(null);
    setExtractedFields([]);
    setLinkedHousehold(initialContext ? { id: initialContext.householdId, name: initialContext.familyName + " Household" } : null);
    setSearchQuery("");
    setSearchResults([]);
  };

  const stepsOrder: Step[] = ["upload", "classifying", "review", "linking", "complete"];
  const progressPct = (stepsOrder.indexOf(step) + 1) / stepsOrder.length * 100;

  const goBack = () => {
    if (step === "upload") onExit();
    else if (step === "review") reset();
    else if (step === "complete") reset();
    else onExit();
  };

  return (
    <div className="flex h-screen bg-surface">
      <div className="w-full lg:w-[70%] flex flex-col">
        <FlowHeader title="Document Ingestion" familyName={linkedHousehold ? familyName : undefined} stepLabel={step === "upload" ? "Upload" : step === "classifying" ? "Classifying" : step === "review" ? "Review" : step === "linking" ? "Saving" : "Complete"} progressPct={progressPct} onBack={goBack} onShowPane={() => setShowRightPane(true)} hasIndicator={evidence.length > 0} />

        <div className="flex-1 overflow-y-auto px-4 sm:px-8 pt-4 pb-16">
          <div className="max-w-xl w-full mx-auto">

            {/* ── Upload ── */}
            {step === "upload" && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Ingest Document</h2>
                <p className="text-slate-400 mb-8">Upload a document, fax, or image. Min will classify it and extract structured data.</p>

                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.jpg,.jpeg,.png,.tiff,.tif" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />

                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/20 transition-colors cursor-pointer">
                  <Upload size={40} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600 mb-1">Drop a file or click to upload</p>
                  <p className="text-sm text-slate-400">PDF, image, or scanned document</p>
                  <p className="text-xs text-slate-300 mt-2">ACAT notices, trust amendments, client letters, tax documents, faxes</p>
                </button>

                {/* Common document types hint */}
                <div className="mt-8">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">Supported Document Types</p>
                  <div className="grid grid-cols-2 gap-2">
                    {DOCUMENT_TYPES.filter(d => d.type !== "other").map(d => (
                      <div key={d.type} className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white border border-slate-100 text-sm">
                        <span className="text-slate-400">{d.icon}</span>
                        <span className="text-slate-600">{d.subtype}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ── Classifying ── */}
            {step === "classifying" && (
              <div className="animate-fade-in text-center pt-12">
                <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
                <h2 className="text-2xl font-light text-slate-900 mb-2">Analyzing Document</h2>
                <p className="text-slate-400 mb-2">{fileName}</p>
                <div className="max-w-xs mx-auto space-y-2 mt-6 text-left">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <Sparkles size={14} className="text-blue-500" /> Classifying document type...
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Sparkles size={14} className="text-slate-300" /> Extracting structured data...
                  </div>
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Sparkles size={14} className="text-slate-300" /> Matching to household...
                  </div>
                </div>
              </div>
            )}

            {/* ── Review ── */}
            {step === "review" && classification && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Review Extraction</h2>
                <p className="text-slate-400 mb-6">Verify the extracted data before saving to Salesforce.</p>

                {/* Classification card */}
                <div className="bg-blue-50 border border-blue-200 rounded-2xl p-5 mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center">{classification.icon}</div>
                    <div>
                      <p className="font-medium text-blue-900">{classification.subtype}</p>
                      <p className="text-xs text-blue-600/70">{classification.description}</p>
                    </div>
                  </div>
                </div>

                {/* Extracted fields */}
                <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden mb-6">
                  <div className="px-5 py-3 border-b border-slate-100">
                    <p className="text-xs uppercase tracking-wider text-slate-400">Extracted Fields</p>
                  </div>
                  <div className="divide-y divide-slate-50">
                    {extractedFields.map((field, i) => (
                      <div key={i} className="flex items-center justify-between px-5 py-3">
                        <div>
                          <p className="text-xs text-slate-400">{field.label}</p>
                          <p className="text-sm font-medium text-slate-800">{field.value}</p>
                        </div>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                          field.confidence === "high" ? "bg-green-100 text-green-700" :
                          field.confidence === "medium" ? "bg-amber-100 text-amber-700" :
                          "bg-red-100 text-red-700"
                        }`}>{field.confidence}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Household linking */}
                <div className="bg-white border border-slate-200 rounded-2xl p-5 mb-6">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-3">Link to Household</p>
                  {linkedHousehold ? (
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Check size={16} className="text-green-500" />
                        <span className="text-sm font-medium text-slate-800">{linkedHousehold.name}</span>
                      </div>
                      <button onClick={() => setLinkedHousehold(null)} className="text-xs text-slate-400 hover:text-slate-600">Change</button>
                    </div>
                  ) : (
                    <div>
                      <div className="relative">
                        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                        <Input className="h-10 rounded-xl pl-9 text-sm" placeholder="Search households..." value={searchQuery}
                          onChange={e => searchHouseholds(e.target.value)} />
                        {isSearching && <Loader2 size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 animate-spin" />}
                      </div>
                      {searchResults.length > 0 && (
                        <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                          {searchResults.slice(0, 5).map((h, i) => (
                            <button key={i} onClick={() => { setLinkedHousehold(h); setSearchResults([]); setSearchQuery(""); addEv(`Linked to ${h.name}`); }}
                              className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0">{h.name}</button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                <ContinueBtn onClick={saveToSalesforce} disabled={!linkedHousehold} label="Save to Salesforce" />
                {!linkedHousehold && <p className="text-xs text-slate-400 text-center mt-2">Link to a household to continue</p>}
              </div>
            )}

            {/* ── Linking/Saving ── */}
            {step === "linking" && (
              <div className="animate-fade-in text-center pt-16">
                <Loader2 size={40} className="animate-spin text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">Saving to Salesforce...</p>
              </div>
            )}

            {/* ── Complete ── */}
            {step === "complete" && (
              <div className="animate-fade-in text-center pt-8">
                <div className="w-20 h-20 rounded-full bg-green-500 text-white flex items-center justify-center mx-auto mb-6">
                  <FileText size={36} strokeWidth={2} />
                </div>
                <h2 className="text-3xl font-light text-slate-900 mb-3">Document Ingested</h2>
                <p className="text-lg text-slate-400 mb-1">{classification?.subtype}</p>
                <p className="text-base text-slate-400 mb-8">
                  {linkedHousehold ? `Linked to ${linkedHousehold.name.replace(" Household", "")} Household` : "Saved"} — {extractedFields.length} fields extracted
                </p>

                <div className="bg-white border border-slate-200 rounded-2xl p-6 text-left max-w-md mx-auto mb-8">
                  <p className="text-xs uppercase tracking-wider text-slate-400 mb-4 text-center">Extraction Summary</p>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-500">Document</span>
                      <span className="font-medium text-slate-900">{classification?.subtype}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-500">File</span>
                      <span className="font-medium text-slate-900">{fileName}</span>
                    </div>
                    <div className="flex justify-between py-2 border-b border-slate-50">
                      <span className="text-slate-500">Fields extracted</span>
                      <span className="font-medium text-slate-900">{extractedFields.length}</span>
                    </div>
                    <div className="flex justify-between py-2">
                      <span className="text-slate-500">High confidence</span>
                      <span className="font-medium text-green-700">{extractedFields.filter(f => f.confidence === "high").length}/{extractedFields.length}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-3 justify-center">
                  {onNavigate && linkedHousehold && (
                    <button onClick={() => onNavigate("family" as Screen, { householdId: linkedHousehold.id, familyName: linkedHousehold.name.replace(" Household", "") })}
                      className="px-5 py-3 rounded-xl border border-slate-200 text-slate-600 font-medium hover:bg-slate-50 transition-colors text-sm">View Family</button>
                  )}
                  <button onClick={reset} className="px-5 py-3 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm">Ingest Another</button>
                  <button onClick={() => { reset(); onExit(); }} className="px-5 py-3 rounded-xl border border-slate-200 text-slate-400 font-medium hover:bg-slate-50 transition-colors text-sm">Home</button>
                </div>
              </div>
            )}

          </div>
        </div>
      </div>

      {/* Right pane — evidence */}
      <div className={`${showRightPane ? "fixed inset-0 z-50 bg-white" : "hidden"} lg:block lg:static lg:w-[30%] border-l border-slate-200 bg-white flex flex-col print:hidden`}>
        <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
          <p className="text-xs uppercase tracking-wider text-slate-400">Activity Log</p>
          <button onClick={() => setShowRightPane(false)} aria-label="Close panel" className="lg:hidden text-slate-400 hover:text-slate-600">&times;</button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {evidence.length === 0 ? (
            <div className="text-center mt-12"><FileText size={28} className="mx-auto text-slate-200 mb-3" /><p className="text-sm text-slate-400">Upload a document to begin</p></div>
          ) : (
            <div className="space-y-1.5">
              {evidence.map((e, i) => (
                <div key={i} className="flex items-start gap-2 animate-fade-in">
                  <div className="w-1.5 h-1.5 rounded-full bg-blue-400 mt-1.5 flex-shrink-0" />
                  <div className="flex-1 min-w-0">
                    {e.url ? <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block truncate">{e.label} &rarr;</a> : <p className="text-xs text-slate-500 truncate">{e.label}</p>}
                    {e.timestamp && <p className="text-[10px] text-slate-300">{e.timestamp}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
