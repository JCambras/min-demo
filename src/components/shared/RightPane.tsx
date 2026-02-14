"use client";
import { useRef, useEffect } from "react";
import { ArrowLeft } from "lucide-react";
import type { ClientInfo, AccountRequest, SFEvidence } from "@/lib/types";

interface RightPaneProps {
  showMobile: boolean;
  onCloseMobile: () => void;
  title: string;
  mode: "flow" | "onboard";
  // Client data
  p1?: ClientInfo;
  p2?: ClientInfo;
  hasP2?: boolean;
  // Open Accounts specific
  selectedIntents?: string[];
  freeText?: string;
  accounts?: AccountRequest[];
  setupACH?: boolean | null;
  matchedBank?: string | null;
  bankAcct?: string;
  // Shared
  evidence: SFEvidence[];
}

export function RightPane({
  showMobile, onCloseMobile, title, mode,
  p1, p2, hasP2,
  selectedIntents, freeText, accounts,
  setupACH, matchedBank, bankAcct,
  evidence,
}: RightPaneProps) {
  const rpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (rpRef.current) rpRef.current.scrollTop = rpRef.current.scrollHeight;
  }, [evidence, accounts]);

  const p1Name = p1 ? `${p1.firstName} ${p1.lastName}`.trim() : "";
  const p2Name = p2 ? `${p2.firstName} ${p2.lastName}`.trim() : "";
  const isFlow = mode === "flow";
  const hasContent = isFlow
    ? ((accounts?.length || 0) > 0 || (selectedIntents?.length || 0) > 0)
    : !!p1Name;

  return (
    <div className={`${showMobile ? "fixed inset-0 z-50 bg-white" : "hidden"} lg:block lg:static lg:w-[30%] border-l border-slate-200 bg-white flex flex-col`}>
      <div className="px-5 py-5 border-b border-slate-100 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-slate-400">{title}</p>
        <button onClick={onCloseMobile} className="lg:hidden text-slate-400 hover:text-slate-600"><ArrowLeft size={18} /></button>
      </div>
      <div className="flex-1 overflow-y-auto px-5 py-4" ref={rpRef}>
        {!hasContent ? (
          <p className="text-sm text-slate-300 text-center mt-8">
            {isFlow ? "Your plan will build here" : "Client details will appear here"}
          </p>
        ) : (
          <div className="space-y-5">
            {/* Intents (flow only) */}
            {isFlow && selectedIntents && selectedIntents.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Intent</p>
                <div className="flex flex-wrap gap-1.5">
                  {selectedIntents.filter((i) => i !== "Something else").map((i) => (
                    <span key={i} className="text-xs px-2.5 py-1 rounded-full bg-slate-100 text-slate-600">{i}</span>
                  ))}
                  {freeText && <span className="text-xs px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 italic">Note: {freeText}</span>}
                </div>
              </div>
            )}

            {/* Primary Client */}
            {p1Name && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">{isFlow ? "Clients" : "Primary"}</p>
                {isFlow ? (
                  <>
                    <p className="text-sm text-slate-700">{p1Name} {p1?.email && <span className="text-slate-400">· {p1.email}</span>}</p>
                    {hasP2 && p2Name && <p className="text-sm text-slate-700">{p2Name} {p2?.email && <span className="text-slate-400">· {p2.email}</span>}</p>}
                  </>
                ) : (
                  <div className="bg-slate-50 rounded-xl p-3">
                    <p className="text-sm font-medium text-slate-800">{p1Name}</p>
                    {p1?.email && <p className="text-xs text-slate-400 mt-0.5">{p1.email}</p>}
                    {p1?.phone && <p className="text-xs text-slate-400">{p1.phone}</p>}
                    {p1?.riskTolerance && <p className="text-xs text-slate-500 mt-1">{p1.riskTolerance} · {p1.investmentObjective}</p>}
                  </div>
                )}
              </div>
            )}

            {/* Spouse (onboard only) */}
            {!isFlow && hasP2 && p2Name && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Spouse</p>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-sm font-medium text-slate-800">{p2Name}</p>
                  {p2?.email && <p className="text-xs text-slate-400 mt-0.5">{p2.email}</p>}
                  {p2?.phone && <p className="text-xs text-slate-400">{p2.phone}</p>}
                </div>
              </div>
            )}

            {/* Accounts (flow only) */}
            {isFlow && accounts && accounts.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Accounts ({accounts.length})</p>
                <div className="space-y-2">
                  {accounts.map((a) => (
                    <div key={a.id} className="bg-slate-50 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-sm text-slate-800">{a.type}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${a.signers === 2 ? "bg-blue-100 text-blue-700" : "bg-slate-200 text-slate-500"}`}>
                          {a.signers === 2 ? "2-Sign" : "1-Sign"}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-0.5">{a.owner}</p>
                      {a.funding && <p className="text-xs text-slate-500 mt-1">{a.funding}{a.fundingAmount ? ` · $${Number(a.fundingAmount).toLocaleString() || a.fundingAmount}` : ""}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ACH (flow only) */}
            {isFlow && setupACH && matchedBank && bankAcct && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">ACH</p>
                <div className="bg-slate-50 rounded-xl p-3">
                  <p className="text-sm font-medium text-slate-800">{matchedBank}</p>
                  <p className="text-xs text-slate-400 mt-0.5">****{bankAcct.slice(-4)}</p>
                </div>
              </div>
            )}

            {/* Evidence (shared) */}
            {evidence.length > 0 && (
              <div>
                <p className="text-xs uppercase tracking-wider text-slate-400 mb-2">Salesforce Activity</p>
                <div className="space-y-1.5">
                  {evidence.map((e, i) => (
                    <div key={i} className="flex items-start gap-2 animate-fade-in">
                      <div className="w-1.5 h-1.5 rounded-full bg-green-400 mt-1.5 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        {e.url ? (
                          <a href={e.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-600 hover:underline block truncate">{e.label} →</a>
                        ) : (
                          <p className="text-xs text-slate-500 truncate">{e.label}</p>
                        )}
                        {e.timestamp && <p className="text-[10px] text-slate-300">{e.timestamp}</p>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
