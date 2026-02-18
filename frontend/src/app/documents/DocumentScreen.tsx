"use client";
import { useState, useRef, useCallback } from "react";
import { Upload, FileText, Loader2, Check, X, Search, Building2, FileWarning, ArrowRight, ExternalLink, Sparkles, Pencil, Files, CheckCircle, XCircle } from "lucide-react";
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

interface BatchDoc {
  id: string;
  fileName: string;
  classification: DocumentClassification | null;
  fields: ExtractedField[];
  editedValues: Record<number, string>;
  status: "processing" | "ready" | "approved" | "rejected" | "saving" | "saved";
}

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
  const [editedValues, setEditedValues] = useState<Record<number, string>>({});

  // Batch mode
  const [batchMode, setBatchMode] = useState(false);
  const [batchDocs, setBatchDocs] = useState<BatchDoc[]>([]);
  const [batchProcessing, setBatchProcessing] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ current: 0, total: 0 });
  const [expandedBatchDoc, setExpandedBatchDoc] = useState<string | null>(null);
  const [batchSaving, setBatchSaving] = useState(false);

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
      const finalFields = extractedFields.map((f, i) => ({
        ...f,
        value: i in editedValues ? editedValues[i] : f.value,
      }));
      const editCount = Object.keys(editedValues).length;
      const description = [
        `Document Type: ${classification?.subtype || "Unknown"}`,
        `File: ${fileName}`,
        ...(editCount > 0 ? [`${editCount} field(s) manually corrected`] : []),
        `\nExtracted Fields:`,
        ...finalFields.map(f => `${f.label}: ${f.value} (${f.confidence} confidence)`),
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
    setEditedValues({});
    setLinkedHousehold(initialContext ? { id: initialContext.householdId, name: initialContext.familyName + " Household" } : null);
    setSearchQuery("");
    setSearchResults([]);
  };

  // Batch upload handler
  const handleBatchUpload = async (files: File[]) => {
    setBatchMode(true);
    setBatchProcessing(true);
    setBatchProgress({ current: 0, total: files.length });

    const docs: BatchDoc[] = files.map(f => ({
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      fileName: f.name,
      classification: null,
      fields: [],
      editedValues: {},
      status: "processing" as const,
    }));
    setBatchDocs(docs);

    for (let i = 0; i < files.length; i++) {
      setBatchProgress({ current: i + 1, total: files.length });
      addEv(`Processing: ${files[i].name}`);

      // Simulate classification
      await new Promise(r => setTimeout(r, 600));
      const name = files[i].name.toLowerCase();
      let docType = DOCUMENT_TYPES.find(d => d.type === "other")!;
      if (name.includes("acat") || name.includes("transfer")) docType = DOCUMENT_TYPES.find(d => d.type === "acat")!;
      else if (name.includes("trust")) docType = DOCUMENT_TYPES.find(d => d.type === "trust")!;
      else if (name.includes("1099") || name.includes("tax")) docType = DOCUMENT_TYPES.find(d => d.type === "tax")!;
      else if (name.includes("beneficiary") || name.includes("bene")) docType = DOCUMENT_TYPES.find(d => d.type === "beneficiary")!;
      else if (name.includes("letter") || name.includes("correspondence")) docType = DOCUMENT_TYPES.find(d => d.type === "letter")!;
      else {
        const types = DOCUMENT_TYPES.filter(d => d.type !== "other");
        docType = types[Math.floor(Math.random() * types.length)];
      }

      // Simulate extraction
      await new Promise(r => setTimeout(r, 400));
      const fields = simulateExtraction(docType.type, familyName);

      docs[i] = { ...docs[i], classification: docType, fields, status: "ready" };
      setBatchDocs([...docs]);
      addEv(`Classified: ${files[i].name} → ${docType.subtype}`);
    }

    setBatchProcessing(false);
    addEv(`${files.length} documents processed`);
  };

  const updateBatchDocEdit = (docId: string, fieldIdx: number, value: string) => {
    setBatchDocs(prev => prev.map(d => d.id === docId ? { ...d, editedValues: { ...d.editedValues, [fieldIdx]: value } } : d));
  };

  const setBatchDocStatus = (docId: string, status: BatchDoc["status"]) => {
    setBatchDocs(prev => prev.map(d => d.id === docId ? { ...d, status } : d));
  };

  const saveBatchApproved = async () => {
    if (!linkedHousehold) return;
    setBatchSaving(true);
    const approved = batchDocs.filter(d => d.status === "approved");
    for (const doc of approved) {
      setBatchDocStatus(doc.id, "saving");
      try {
        const finalFields = doc.fields.map((f, i) => ({
          ...f, value: i in doc.editedValues ? doc.editedValues[i] : f.value,
        }));
        const editCount = Object.keys(doc.editedValues).length;
        const description = [
          `Document Type: ${doc.classification?.subtype || "Unknown"}`,
          `File: ${doc.fileName}`,
          ...(editCount > 0 ? [`${editCount} field(s) manually corrected`] : []),
          `\nExtracted Fields:`,
          ...finalFields.map(f => `${f.label}: ${f.value} (${f.confidence} confidence)`),
        ].join("\n");

        const res = await callSF("createTask", {
          householdId: linkedHousehold.id,
          subject: `DOCUMENT INGESTED: ${doc.classification?.subtype || "Document"} — ${familyName || "Unlinked"}`,
          description,
          priority: doc.classification?.type === "acat" ? "High" : "Normal",
          status: "Open",
        });
        if (res.success) addEv(`Saved: ${doc.fileName}`, res.task?.url);
        setBatchDocStatus(doc.id, "saved");
      } catch {
        setBatchDocStatus(doc.id, "approved"); // revert on error
      }
    }
    setBatchSaving(false);
  };

  const resetBatch = () => {
    setBatchMode(false);
    setBatchDocs([]);
    setBatchProcessing(false);
    setExpandedBatchDoc(null);
    setBatchSaving(false);
  };

  const stepsOrder: Step[] = ["upload", "classifying", "review", "linking", "complete"];
  const progressPct = (stepsOrder.indexOf(step) + 1) / stepsOrder.length * 100;

  const goBack = () => {
    if (batchMode) { resetBatch(); return; }
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
            {step === "upload" && !batchMode && (
              <div className="animate-fade-in">
                <h2 className="text-3xl font-light text-slate-900 mb-2">Ingest Document</h2>
                <p className="text-slate-400 mb-8">Upload a document, fax, or image. Min will classify it and extract structured data.</p>

                <input ref={fileInputRef} type="file" accept="image/*,.pdf,.jpg,.jpeg,.png,.tiff,.tif" className="hidden"
                  onChange={e => { const f = e.target.files?.[0]; if (f) handleFileUpload(f); e.target.value = ""; }} />
                <input id="batch-file-input" type="file" accept="image/*,.pdf,.jpg,.jpeg,.png,.tiff,.tif" multiple className="hidden"
                  onChange={e => { const files = e.target.files; if (files && files.length > 0) handleBatchUpload(Array.from(files)); e.target.value = ""; }} />

                <button onClick={() => fileInputRef.current?.click()}
                  className="w-full border-2 border-dashed border-slate-300 rounded-2xl p-12 text-center hover:border-blue-400 hover:bg-blue-50/20 transition-colors cursor-pointer">
                  <Upload size={40} className="mx-auto text-slate-300 mb-4" />
                  <p className="text-lg font-medium text-slate-600 mb-1">Drop a file or click to upload</p>
                  <p className="text-sm text-slate-400">PDF, image, or scanned document</p>
                  <p className="text-xs text-slate-300 mt-2">ACAT notices, trust amendments, client letters, tax documents, faxes</p>
                </button>

                {/* Batch upload option */}
                <div className="mt-6">
                  <button onClick={() => document.getElementById("batch-file-input")?.click()}
                    className="w-full flex items-center gap-4 p-4 rounded-2xl border border-slate-200 hover:border-blue-300 hover:bg-blue-50/50 transition-colors text-left">
                    <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                      <Files size={20} className="text-blue-600" />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-slate-800">Batch Upload</p>
                      <p className="text-xs text-slate-400">Select multiple files to classify and extract all at once. Review in a queue.</p>
                    </div>
                  </button>
                </div>

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
            {step === "classifying" && !batchMode && (
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
            {step === "review" && !batchMode && classification && (
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
                    {extractedFields.map((field, i) => {
                      const isEdited = i in editedValues;
                      const displayValue = isEdited ? editedValues[i] : field.value;
                      return (
                        <div key={i} className="flex items-center justify-between px-5 py-3 group">
                          <div className="flex-1 min-w-0 mr-3">
                            <div className="flex items-center gap-1.5">
                              <p className="text-xs text-slate-400">{field.label}</p>
                              {isEdited && <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-medium">edited</span>}
                            </div>
                            <div className="flex items-center gap-2 mt-0.5">
                              <input
                                type="text"
                                value={displayValue}
                                onChange={e => setEditedValues(prev => ({ ...prev, [i]: e.target.value }))}
                                className={`text-sm font-medium text-slate-800 bg-transparent border-b border-transparent focus:border-blue-400 focus:outline-none w-full py-0.5 transition-colors ${isEdited ? "border-blue-200" : "hover:border-slate-200"}`}
                              />
                              <Pencil size={12} className="text-slate-300 group-hover:text-slate-400 flex-shrink-0 transition-colors" />
                            </div>
                          </div>
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium flex-shrink-0 ${
                            field.confidence === "high" ? "bg-green-100 text-green-700" :
                            field.confidence === "medium" ? "bg-amber-100 text-amber-700" :
                            "bg-red-100 text-red-700"
                          }`}>{field.confidence}</span>
                        </div>
                      );
                    })}
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
            {step === "linking" && !batchMode && (
              <div className="animate-fade-in text-center pt-16">
                <Loader2 size={40} className="animate-spin text-slate-400 mx-auto mb-4" />
                <p className="text-slate-400">Saving to Salesforce...</p>
              </div>
            )}

            {/* ── Complete ── */}
            {step === "complete" && !batchMode && (
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

            {/* ── Batch Mode ── */}
            {batchMode && (
              <div className="animate-fade-in">
                {batchProcessing ? (
                  <div className="text-center pt-8">
                    <Loader2 size={40} className="animate-spin text-blue-500 mx-auto mb-4" />
                    <h2 className="text-2xl font-light text-slate-900 mb-2">Processing Documents</h2>
                    <p className="text-slate-400 mb-4">{batchProgress.current} of {batchProgress.total} files...</p>
                    <div className="max-w-xs mx-auto">
                      <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                        <div className="h-full bg-blue-400 rounded-full transition-all duration-300" style={{ width: `${batchProgress.total > 0 ? (batchProgress.current / batchProgress.total) * 100 : 0}%` }} />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <h2 className="text-3xl font-light text-slate-900 mb-2">Review Queue</h2>
                    <p className="text-slate-400 mb-4">{batchDocs.length} documents processed. Approve or reject each before saving.</p>

                    {/* Summary */}
                    <div className="grid grid-cols-4 gap-3 mb-6">
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                        <p className="text-lg font-light text-slate-900">{batchDocs.length}</p>
                        <p className="text-[10px] text-slate-400">Total</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                        <p className="text-lg font-light text-blue-600">{batchDocs.filter(d => d.status === "ready").length}</p>
                        <p className="text-[10px] text-slate-400">Pending</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                        <p className="text-lg font-light text-green-600">{batchDocs.filter(d => d.status === "approved" || d.status === "saved").length}</p>
                        <p className="text-[10px] text-slate-400">Approved</p>
                      </div>
                      <div className="bg-white border border-slate-200 rounded-xl p-3 text-center">
                        <p className="text-lg font-light text-red-600">{batchDocs.filter(d => d.status === "rejected").length}</p>
                        <p className="text-[10px] text-slate-400">Rejected</p>
                      </div>
                    </div>

                    {/* Household linking for batch */}
                    <div className="bg-white border border-slate-200 rounded-2xl p-4 mb-4">
                      <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Link All to Household</p>
                      {linkedHousehold ? (
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <Check size={16} className="text-green-500" />
                            <span className="text-sm font-medium text-slate-800">{linkedHousehold.name}</span>
                          </div>
                          <button onClick={() => setLinkedHousehold(null)} className="text-xs text-slate-400 hover:text-slate-600">Change</button>
                        </div>
                      ) : (
                        <div className="relative">
                          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                          <Input className="h-9 rounded-xl pl-9 text-sm" placeholder="Search households..." value={searchQuery}
                            onChange={e => searchHouseholds(e.target.value)} />
                          {searchResults.length > 0 && (
                            <div className="mt-2 border border-slate-200 rounded-xl overflow-hidden">
                              {searchResults.slice(0, 5).map((h, i) => (
                                <button key={i} onClick={() => { setLinkedHousehold(h); setSearchResults([]); setSearchQuery(""); }}
                                  className="w-full text-left px-3 py-2 text-sm hover:bg-slate-50 border-b border-slate-50 last:border-0">{h.name}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Document queue */}
                    <div className="space-y-2 mb-6">
                      {batchDocs.map(doc => (
                        <div key={doc.id} className={`bg-white border rounded-2xl overflow-hidden transition-colors ${
                          doc.status === "rejected" ? "border-red-200 opacity-60" :
                          doc.status === "approved" || doc.status === "saved" ? "border-green-200" :
                          "border-slate-200"
                        }`}>
                          <div className="flex items-center gap-3 px-4 py-3">
                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${
                              doc.status === "saved" ? "bg-green-100" :
                              doc.status === "approved" ? "bg-green-50" :
                              doc.status === "rejected" ? "bg-red-50" :
                              "bg-blue-50"
                            }`}>
                              {doc.status === "saved" ? <CheckCircle size={16} className="text-green-600" /> :
                               doc.status === "saving" ? <Loader2 size={16} className="text-green-500 animate-spin" /> :
                               doc.classification ? <span className="text-blue-600">{doc.classification.icon}</span> :
                               <FileText size={16} className="text-slate-400" />}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium text-slate-700 truncate">{doc.fileName}</p>
                              <div className="flex items-center gap-2 mt-0.5">
                                {doc.classification && <span className="text-[10px] text-slate-400">{doc.classification.subtype}</span>}
                                <span className="text-[10px] text-slate-300">·</span>
                                <span className="text-[10px] text-slate-400">{doc.fields.length} fields</span>
                                {Object.keys(doc.editedValues).length > 0 && (
                                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-blue-100 text-blue-600 font-medium">{Object.keys(doc.editedValues).length} edited</span>
                                )}
                              </div>
                            </div>
                            <div className="flex items-center gap-1.5 flex-shrink-0">
                              {doc.status === "ready" && (
                                <>
                                  <button onClick={() => setExpandedBatchDoc(expandedBatchDoc === doc.id ? null : doc.id)}
                                    className="text-[10px] px-2 py-1 rounded-lg bg-slate-100 text-slate-500 hover:bg-slate-200 transition-colors">
                                    {expandedBatchDoc === doc.id ? "Hide" : "Review"}
                                  </button>
                                  <button onClick={() => setBatchDocStatus(doc.id, "approved")}
                                    className="text-[10px] px-2 py-1 rounded-lg bg-green-100 text-green-700 hover:bg-green-200 transition-colors font-medium">Approve</button>
                                  <button onClick={() => setBatchDocStatus(doc.id, "rejected")}
                                    className="text-[10px] px-2 py-1 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors">Reject</button>
                                </>
                              )}
                              {doc.status === "approved" && (
                                <>
                                  <span className="text-[10px] text-green-600 font-medium">Approved</span>
                                  <button onClick={() => setBatchDocStatus(doc.id, "ready")} className="text-[10px] text-slate-400 hover:text-slate-600">Undo</button>
                                </>
                              )}
                              {doc.status === "rejected" && (
                                <>
                                  <span className="text-[10px] text-red-500 font-medium">Rejected</span>
                                  <button onClick={() => setBatchDocStatus(doc.id, "ready")} className="text-[10px] text-slate-400 hover:text-slate-600">Undo</button>
                                </>
                              )}
                              {doc.status === "saved" && <span className="text-[10px] text-green-600 font-medium">Saved</span>}
                              {doc.status === "saving" && <span className="text-[10px] text-slate-400">Saving...</span>}
                            </div>
                          </div>

                          {/* Expanded review */}
                          {expandedBatchDoc === doc.id && doc.status === "ready" && (
                            <div className="border-t border-slate-100 px-4 py-3 bg-slate-50 animate-fade-in">
                              <div className="space-y-2">
                                {doc.fields.map((field, fi) => {
                                  const isEdited = fi in doc.editedValues;
                                  const displayValue = isEdited ? doc.editedValues[fi] : field.value;
                                  return (
                                    <div key={fi} className="flex items-center gap-3">
                                      <p className="text-[10px] text-slate-400 w-28 flex-shrink-0">{field.label}</p>
                                      <input type="text" value={displayValue}
                                        onChange={e => updateBatchDocEdit(doc.id, fi, e.target.value)}
                                        className={`text-xs text-slate-700 bg-white border rounded-lg px-2 py-1 flex-1 focus:border-blue-400 focus:outline-none ${isEdited ? "border-blue-200" : "border-slate-200"}`} />
                                      <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium flex-shrink-0 ${
                                        field.confidence === "high" ? "bg-green-100 text-green-700" :
                                        field.confidence === "medium" ? "bg-amber-100 text-amber-700" :
                                        "bg-red-100 text-red-700"
                                      }`}>{field.confidence}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Batch actions */}
                    <div className="flex flex-wrap gap-3 justify-center">
                      {batchDocs.some(d => d.status === "ready") && (
                        <button onClick={() => setBatchDocs(prev => prev.map(d => d.status === "ready" ? { ...d, status: "approved" } : d))}
                          className="text-xs px-4 py-2.5 rounded-xl border border-green-200 text-green-700 font-medium hover:bg-green-50 transition-colors">Approve All Remaining</button>
                      )}
                      {batchDocs.some(d => d.status === "approved") && linkedHousehold && (
                        <button onClick={saveBatchApproved} disabled={batchSaving}
                          className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm disabled:opacity-50">
                          {batchSaving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                          Save {batchDocs.filter(d => d.status === "approved").length} to Salesforce
                        </button>
                      )}
                      {batchDocs.every(d => d.status === "saved" || d.status === "rejected") && (
                        <button onClick={() => { resetBatch(); }} className="px-5 py-2.5 rounded-xl bg-slate-900 text-white font-medium hover:bg-slate-800 transition-colors text-sm">Done</button>
                      )}
                      <button onClick={() => { resetBatch(); }} className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-400 font-medium hover:bg-slate-50 transition-colors text-sm">
                        {batchDocs.every(d => d.status === "saved" || d.status === "rejected") ? "Home" : "Cancel"}
                      </button>
                    </div>

                    {!linkedHousehold && batchDocs.some(d => d.status === "approved") && (
                      <p className="text-xs text-slate-400 text-center mt-2">Link to a household above to save approved documents</p>
                    )}
                  </div>
                )}
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
