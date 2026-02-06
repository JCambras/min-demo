"use client";

import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";

type Message = {
  role: "user" | "assistant";
  content: string;
};

type WorkflowStep = {
  id: string;
  name: string;
  status: "pending" | "running" | "completed" | "failed";
  evidence?: string;
  evidenceUrl?: string;
  reasoning?: string;
};

type FamilyMember = {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
};

type Family = {
  name: string;
  members: FamilyMember[];
};

const FAMILIES: Record<string, Family> = {
  johnson: {
    name: "Johnson",
    members: [
      { firstName: "Michael", lastName: "Johnson", email: "michael@johnson.com", phone: "555-123-4567", role: "Primary" },
      { firstName: "Sarah", lastName: "Johnson", email: "sarah@johnson.com", phone: "555-123-4568", role: "Spouse" },
    ],
  },
  chen: {
    name: "Chen",
    members: [
      { firstName: "David", lastName: "Chen", email: "david@chen.com", phone: "555-234-5678", role: "Primary" },
      { firstName: "Linda", lastName: "Chen", email: "linda@chen.com", phone: "555-234-5679", role: "Spouse" },
      { firstName: "Emily", lastName: "Chen", email: "emily@chen.com", phone: "555-234-5680", role: "Daughter" },
    ],
  },
  martinez: {
    name: "Martinez",
    members: [
      { firstName: "Carlos", lastName: "Martinez", email: "carlos@martinez.com", phone: "555-345-6789", role: "Primary" },
      { firstName: "Maria", lastName: "Martinez", email: "maria@martinez.com", phone: "555-345-6790", role: "Spouse" },
    ],
  },
};

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [workflowActive, setWorkflowActive] = useState(false);
  const [workflowConfirmed, setWorkflowConfirmed] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);

  const [steps, setSteps] = useState<WorkflowStep[]>([
    {
      id: "1",
      name: "Create client records",
      status: "pending",
      reasoning: "Each family member needs a Contact record in Salesforce to track their individual information, documents, and communication history.",
    },
    {
      id: "2",
      name: "Create household",
      status: "pending",
      reasoning: "A Household groups related contacts together, making it easier to see the full family picture and manage shared accounts.",
    },
    {
      id: "3",
      name: "Generate onboarding packet",
      status: "pending",
      reasoning: "The packet includes IPS template, risk questionnaire, ADV disclosure, and privacy policy — all required documents for new clients.",
    },
    {
      id: "4",
      name: "Send for e-signature",
      status: "pending",
      reasoning: "E-signature via DocuSign creates a legally binding record and automatically tracks who signed what and when.",
    },
    {
      id: "5",
      name: "Attach signed documents",
      status: "pending",
      reasoning: "Signed documents are stored in Salesforce and linked to the client record for easy retrieval during audits or reviews.",
    },
    {
      id: "6",
      name: "Create follow-up tasks",
      status: "pending",
      reasoning: "Automated tasks ensure nothing falls through the cracks — scheduling the first meeting, collecting missing info, etc.",
    },
  ]);

  const detectFamily = (text: string): Family | null => {
    const lower = text.toLowerCase();
    if (lower.includes("johnson")) return FAMILIES.johnson;
    if (lower.includes("chen")) return FAMILIES.chen;
    if (lower.includes("martinez")) return FAMILIES.martinez;
    return null;
  };

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const lowerInput = input.toLowerCase();
    const family = detectFamily(input);

    if ((lowerInput.includes("onboard") || lowerInput.includes("new client")) && family) {
      setSelectedFamily(family);
      setTimeout(() => {
        const memberList = family.members
          .map((m) => `• ${m.firstName} ${m.lastName} (${m.role})`)
          .join("\n");

        const assistantMessage: Message = {
          role: "assistant",
          content: `I'll set up the ${family.name} family as new clients. I found ${family.members.length} family members to onboard:\n\n${memberList}\n\nI'll create their records, generate the onboarding paperwork, and send everything for e-signature. Ready to see the plan?`,
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setWorkflowActive(true);
      }, 1000);
    } else if (lowerInput.includes("onboard") || lowerInput.includes("new client")) {
      setTimeout(() => {
        const assistantMessage: Message = {
          role: "assistant",
          content: `I can help you onboard a new client. Which family would you like to onboard?\n\n• Johnson family (Michael & Sarah)\n• Chen family (David, Linda & Emily)\n• Martinez family (Carlos & Maria)\n\nTry saying "Onboard the Johnson family"`,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }, 1000);
    } else {
      setTimeout(() => {
        const assistantMessage: Message = {
          role: "assistant",
          content: `I can help you with client onboarding. Try saying:\n\n• "Onboard the Johnson family"\n• "Onboard the Chen family"\n• "Onboard the Martinez family"`,
        };
        setMessages((prev) => [...prev, assistantMessage]);
      }, 1000);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, ...updates } : step))
    );
  };

  const handleConfirm = async () => {
    if (!selectedFamily) return;

    setWorkflowConfirmed(true);
    setIsLoading(true);

    try {
      // Step 1: Create client records
      updateStep("1", { status: "running" });
      
      const familyResponse = await fetch("/api/salesforce", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "createFamily",
          data: {
            familyName: selectedFamily.name,
            members: selectedFamily.members,
          },
        }),
      });

      const familyResult = await familyResponse.json();

      if (!familyResult.success) {
        throw new Error(familyResult.error || "Failed to create family");
      }

      // Update step 1 - contacts created
      updateStep("1", {
        status: "completed",
        evidence: `Created ${familyResult.contacts.length} contacts`,
        evidenceUrl: familyResult.contacts[0]?.url,
      });

      // Step 2: Household (already created in createFamily)
      updateStep("2", { status: "running" });
      await new Promise((r) => setTimeout(r, 500));
      updateStep("2", {
        status: "completed",
        evidence: `${selectedFamily.name} Household`,
        evidenceUrl: familyResult.household?.url,
      });

      // Step 3: Generate PDF
      updateStep("3", { status: "running" });
      
      const pdfResponse = await fetch("/api/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          familyName: selectedFamily.name,
          members: selectedFamily.members,
          date: new Date().toLocaleDateString(),
        }),
      });

      const pdfResult = await pdfResponse.json();

      if (!pdfResult.success) {
        throw new Error(pdfResult.error || "Failed to generate PDF");
      }

      setPdfUrl(pdfResult.pdf);
      updateStep("3", {
        status: "completed",
        evidence: "4 documents generated",
        evidenceUrl: pdfResult.pdf,
      });

      // Step 4: E-signature (simulated)
      updateStep("4", { status: "running" });
      await new Promise((r) => setTimeout(r, 1500));
      updateStep("4", {
        status: "completed",
        evidence: "Envelope sent",
        evidenceUrl: "#docusign",
      });

      // Step 5: Attach documents (simulated)
      updateStep("5", { status: "running" });
      await new Promise((r) => setTimeout(r, 1000));
      updateStep("5", {
        status: "completed",
        evidence: "Awaiting signatures",
        evidenceUrl: "#pending",
      });

      // Step 6: Tasks (already created in createFamily)
      updateStep("6", { status: "running" });
      await new Promise((r) => setTimeout(r, 500));
      updateStep("6", {
        status: "completed",
        evidence: `${familyResult.tasks?.length || 3} tasks created`,
        evidenceUrl: familyResult.tasks?.[0]?.url,
      });

    } catch (error) {
      console.error("Workflow error:", error);
      // Find the running step and mark it failed
      setSteps((prev) =>
        prev.map((step) =>
          step.status === "running" ? { ...step, status: "failed" } : step
        )
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleUndo = () => {
    setWorkflowActive(false);
    setWorkflowConfirmed(false);
    setSelectedFamily(null);
    setPdfUrl(null);
    setSteps((prev) =>
      prev.map((step) => ({
        ...step,
        status: "pending",
        evidence: undefined,
        evidenceUrl: undefined,
      }))
    );

    const undoMessage: Message = {
      role: "assistant",
      content:
        "Workflow cancelled. Note: Records already created in Salesforce will remain (you can delete them manually if needed).\n\nWhat would you like to do next?",
    };
    setMessages((prev) => [...prev, undoMessage]);
  };

  const handleDownloadPdf = () => {
    if (pdfUrl) {
      const link = document.createElement("a");
      link.href = pdfUrl;
      link.download = `${selectedFamily?.name || "Client"}_Onboarding_Packet.pdf`;
      link.click();
    }
  };

  const allCompleted = steps.every((step) => step.status === "completed");

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Left Pane - Intent/Conversation */}
      <div className="w-1/2 flex flex-col border-r border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-white">
          <h1 className="text-xl font-semibold text-slate-800">Min</h1>
          <p className="text-sm text-slate-500">One conversation. Everything handled.</p>
        </div>

        <ScrollArea className="flex-1 p-4">
          <div className="space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-slate-400 mt-8">
                <p>Tell Min what you need.</p>
                <p className="text-sm mt-2">Try: "Onboard the Johnson family as new clients"</p>
              </div>
            )}
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`rounded-lg px-4 py-2 max-w-[80%] whitespace-pre-line ${
                    message.role === "user"
                      ? "bg-slate-800 text-white"
                      : "bg-white border border-slate-200"
                  }`}
                >
                  {message.content}
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>

        <div className="p-4 border-t border-slate-200 bg-white">
          <div className="flex gap-2">
            <Input
              placeholder="Tell Min what you need..."
              className="flex-1"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <Button onClick={handleSend} disabled={isLoading}>
              Send
            </Button>
          </div>
        </div>
      </div>

      {/* Right Pane - Execution */}
      <div className="w-1/2 flex flex-col bg-white">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">
            {workflowActive && selectedFamily
              ? `New Client Onboarding — ${selectedFamily.name} Family`
              : "Execution"}
          </h2>
          {workflowConfirmed && !allCompleted && !isLoading && (
            <Button variant="outline" size="sm" onClick={handleUndo}>
              Undo
            </Button>
          )}
        </div>

        <ScrollArea className="flex-1 p-4">
          {!workflowActive ? (
            <div className="text-center text-slate-400 mt-8">
              <p>Your workflow will appear here</p>
              <p className="text-sm mt-2">Start a conversation to see the plan</p>
            </div>
          ) : (
            <>
              <Card className="p-4 mb-4">
                <h3 className="font-medium text-slate-800 mb-2">This will:</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  {selectedFamily && (
                    <>
                      <li>
                        • Create contact records for{" "}
                        {selectedFamily.members.map((m) => m.firstName).join(" & ")}
                      </li>
                      <li>• Set up the {selectedFamily.name} Household in Salesforce</li>
                    </>
                  )}
                  <li>• Generate onboarding packet (IPS, risk questionnaire, ADV, privacy policy)</li>
                  <li>• Send all documents for e-signature via DocuSign</li>
                  <li>• Attach signed documents to client records</li>
                  <li>• Create follow-up tasks for first meeting</li>
                </ul>
              </Card>

              <div className="space-y-3">
                {steps.map((step) => (
                  <div key={step.id} className="flex items-start gap-3">
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        step.status === "completed"
                          ? "bg-green-500"
                          : step.status === "running"
                          ? "bg-blue-500 animate-pulse"
                          : step.status === "failed"
                          ? "bg-red-500"
                          : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`text-sm ${
                          step.status === "completed" ||
                          step.status === "running" ||
                          step.status === "failed"
                            ? "text-white"
                            : "text-slate-400"
                        }`}
                      >
                        {step.status === "completed"
                          ? "✓"
                          : step.status === "running"
                          ? "⋯"
                          : step.status === "failed"
                          ? "✕"
                          : "○"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          step.status === "pending"
                            ? "text-slate-400"
                            : step.status === "failed"
                            ? "text-red-600"
                            : "text-slate-800"
                        }`}
                      >
                        {step.name}
                      </p>
                      {step.evidence && (
                        <div className="flex items-center gap-2">
                          {step.evidenceUrl?.startsWith("data:") ? (
                            <button
                              onClick={handleDownloadPdf}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {step.evidence} — Download PDF →
                            </button>
                          ) : step.evidenceUrl?.startsWith("#") ? (
                            <span className="text-xs text-slate-500">{step.evidence}</span>
                          ) : (
                            <a
                              href={step.evidenceUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-xs text-blue-600 hover:underline"
                            >
                              {step.evidence} →
                            </a>
                          )}
                        </div>
                      )}
                      {step.reasoning && (
                        <button
                          onClick={() =>
                            setExpandedReasoning(
                              expandedReasoning === step.id ? null : step.id
                            )
                          }
                          className="text-xs text-slate-400 hover:text-slate-600 ml-2"
                        >
                          {expandedReasoning === step.id ? "hide why" : "why?"}
                        </button>
                      )}
                      {expandedReasoning === step.id && (
                        <p className="text-xs text-slate-500 mt-1 bg-slate-50 p-2 rounded">
                          {step.reasoning}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {allCompleted && (
                <Card className="p-4 mt-4 bg-green-50 border-green-200">
                  <p className="text-green-800 font-medium">✓ Onboarding complete</p>
                  <p className="text-sm text-green-600 mt-1">
                    All records created. Documents sent for signature.
                  </p>
                  <div className="flex gap-2 mt-3">
                    {pdfUrl && (
                      <Button variant="outline" size="sm" onClick={handleDownloadPdf}>
                        Download Packet
                      </Button>
                    )}
                    <Button variant="outline" size="sm">
                      View Replay
                    </Button>
                  </div>
                </Card>
              )}

              {!workflowConfirmed && (
                <div className="mt-6">
                  <Button
                    className="w-full"
                    size="lg"
                    onClick={handleConfirm}
                    disabled={isLoading}
                  >
                    {isLoading ? "Working..." : "Confirm & Execute"}
                  </Button>
                </div>
              )}
            </>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
