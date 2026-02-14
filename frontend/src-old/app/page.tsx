"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  UserPlus,
  CalendarCheck,
  Users,
  FileText,
  RefreshCw,
  ArrowLeft,
} from "lucide-react";

// ─── Types ───────────────────────────────────────────────────────────────────

type Message = {
  role: "user" | "assistant";
  content: string;
  isStreaming?: boolean;
};

type WorkflowStep = {
  id: string;
  name: string;
  status: "pending" | "ready" | "running" | "completed" | "failed";
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

type Screen = "home" | "chat";

// ─── Quick Actions ───────────────────────────────────────────────────────────

const QUICK_ACTIONS = [
  {
    id: "onboard",
    label: "Onboard New Family",
    description: "Create records, generate paperwork, send for e-signature",
    icon: UserPlus,
    live: true,
  },
  {
    id: "annual-review",
    label: "Annual Review",
    description: "Prepare portfolio review and meeting agenda",
    icon: CalendarCheck,
    live: false,
  },
  {
    id: "beneficiary-update",
    label: "Beneficiary Update",
    description: "Update beneficiary designations across accounts",
    icon: Users,
    live: false,
  },
  {
    id: "compliance-check",
    label: "Compliance Check",
    description: "Run ADV, KYC, and suitability checks",
    icon: FileText,
    live: false,
  },
  {
    id: "rebalance",
    label: "Portfolio Rebalance",
    description: "Analyze drift and generate trade recommendations",
    icon: RefreshCw,
    live: false,
  },
];

// ─── Demo Families ───────────────────────────────────────────────────────────

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

const INITIAL_STEPS: WorkflowStep[] = [
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
];

// ─── Streaming Message Bubble ────────────────────────────────────────────────

function StreamingMessage({
  content,
  shouldStream,
  onStreamComplete,
}: {
  content: string;
  shouldStream: boolean;
  onStreamComplete?: () => void;
}) {
  const [displayedText, setDisplayedText] = useState(shouldStream ? "" : content);
  const [isComplete, setIsComplete] = useState(!shouldStream);
  const indexRef = useRef(0);
  const onCompleteRef = useRef(onStreamComplete);
  const hasStartedRef = useRef(false);

  // Keep callback ref fresh without triggering effects
  onCompleteRef.current = onStreamComplete;

  useEffect(() => {
    // Only stream once, only if shouldStream was true on mount
    if (!shouldStream || hasStartedRef.current) return;
    hasStartedRef.current = true;

    setDisplayedText("");
    setIsComplete(false);
    indexRef.current = 0;

    const interval = setInterval(() => {
      indexRef.current += 1;
      const next = content.slice(0, indexRef.current);
      setDisplayedText(next);

      if (indexRef.current >= content.length) {
        clearInterval(interval);
        setIsComplete(true);
        onCompleteRef.current?.();
      }
    }, 18);

    return () => clearInterval(interval);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []); // Empty deps — run once on mount

  // If shouldStream becomes false after mount (parent re-render), show full text
  useEffect(() => {
    if (!shouldStream && !hasStartedRef.current) {
      setDisplayedText(content);
      setIsComplete(true);
    }
  }, [shouldStream, content]);

  return (
    <div className="flex justify-start">
      <div className="rounded-lg px-4 py-2 max-w-[80%] whitespace-pre-line bg-white border border-slate-200">
        {displayedText}
        {!isComplete && (
          <span className="inline-block w-1.5 h-4 bg-slate-400 ml-0.5 animate-pulse align-text-bottom" />
        )}
      </div>
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [workflowActive, setWorkflowActive] = useState(false);
  const [workflowConfirmed, setWorkflowConfirmed] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null);
  const [selectedFamily, setSelectedFamily] = useState<Family | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [pdfUrl, setPdfUrl] = useState<string | null>(null);
  const [streamingIndex, setStreamingIndex] = useState<number | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  const [steps, setSteps] = useState<WorkflowStep[]>(INITIAL_STEPS);

  // Auto-scroll when messages change
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, streamingIndex]);

  // ─── Helpers ─────────────────────────────────────────────────────────────

  const detectFamily = (text: string): Family | null => {
    const lower = text.toLowerCase();
    if (lower.includes("johnson")) return FAMILIES.johnson;
    if (lower.includes("chen")) return FAMILIES.chen;
    if (lower.includes("martinez")) return FAMILIES.martinez;
    return null;
  };

  const addAssistantMessage = useCallback(
    (content: string, delay: number = 400) => {
      setTimeout(() => {
        setMessages((prev) => {
          const newMsg: Message = { role: "assistant", content, isStreaming: true };
          const newIndex = prev.length;
          setStreamingIndex(newIndex);
          return [...prev, newMsg];
        });
      }, delay);
    },
    []
  );

  const handleStreamComplete = useCallback(() => {
    setStreamingIndex(null);
  }, []);

  // ─── Quick Action Handlers ───────────────────────────────────────────────

  const handleQuickAction = (actionId: string) => {
    if (actionId === "onboard") {
      setScreen("chat");
      setMessages([]);
      setWorkflowActive(false);
      setWorkflowConfirmed(false);
      setSelectedFamily(null);
      setPdfUrl(null);
      setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending", evidence: undefined, evidenceUrl: undefined })));

      addAssistantMessage(
        "I can help you onboard a new client family. Which family would you like to onboard?\n\n• Johnson family (Michael & Sarah)\n• Chen family (David, Linda & Emily)\n• Martinez family (Carlos & Maria)\n\nType a name or say \"Onboard the Johnson family\"",
        300
      );
    } else {
      // Coming soon actions
      setScreen("chat");
      setMessages([]);
      const action = QUICK_ACTIONS.find((a) => a.id === actionId);
      addAssistantMessage(
        `${action?.label} is coming soon. This workflow will ${action?.description?.toLowerCase()}.\n\nFor now, I can help you onboard a new client family. Would you like to try that instead?`,
        300
      );
    }
  };

  const handleBackToHome = () => {
    setScreen("home");
    setMessages([]);
    setWorkflowActive(false);
    setWorkflowConfirmed(false);
    setSelectedFamily(null);
    setPdfUrl(null);
    setStreamingIndex(null);
    setSteps(INITIAL_STEPS.map((s) => ({ ...s, status: "pending", evidence: undefined, evidenceUrl: undefined })));
  };

  // ─── Chat Handlers ───────────────────────────────────────────────────────

  const handleSend = () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");

    const lowerInput = input.toLowerCase();
    const family = detectFamily(input);

    if ((lowerInput.includes("onboard") || lowerInput.includes("new client")) && family) {
      setSelectedFamily(family);
      const memberList = family.members
        .map((m) => `• ${m.firstName} ${m.lastName} (${m.role})`)
        .join("\n");

      addAssistantMessage(
        `I'll set up the ${family.name} family as new clients. I found ${family.members.length} family members to onboard:\n\n${memberList}\n\nI'll create their records, generate the onboarding paperwork, and send everything for e-signature. Ready to see the plan?`
      );
      setTimeout(() => setWorkflowActive(true), 500);
    } else if (lowerInput.includes("onboard") || lowerInput.includes("new client")) {
      addAssistantMessage(
        "Which family would you like to onboard?\n\n• Johnson family (Michael & Sarah)\n• Chen family (David, Linda & Emily)\n• Martinez family (Carlos & Maria)\n\nTry saying \"Onboard the Johnson family\""
      );
    } else {
      addAssistantMessage(
        "I can help you with client onboarding. Try saying:\n\n• \"Onboard the Johnson family\"\n• \"Onboard the Chen family\"\n• \"Onboard the Martinez family\""
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ─── Workflow Execution ──────────────────────────────────────────────────

  const updateStep = (stepId: string, updates: Partial<WorkflowStep>) => {
    setSteps((prev) =>
      prev.map((step) => (step.id === stepId ? { ...step, ...updates } : step))
    );
  };

  const handleConfirm = () => {
    if (!selectedFamily) return;
    setWorkflowConfirmed(true);
    // Mark first step as ready for confirmation
    updateStep("1", { status: "ready" });
  };

  const advanceToNextStep = (completedStepId: string) => {
    const currentIndex = steps.findIndex((s) => s.id === completedStepId);
    const nextStep = steps[currentIndex + 1];
    if (nextStep) {
      // Small delay so the user sees the green check before next step lights up
      setTimeout(() => {
        updateStep(nextStep.id, { status: "ready" });
      }, 400);
    } else {
      // All steps done
      addAssistantMessage(
        `✓ The ${selectedFamily!.name} family is fully onboarded. All Salesforce records created, onboarding packet generated, and documents sent for e-signature.\n\nYou can download the packet or view evidence links in the execution pane.`
      );
    }
  };

  // Store Salesforce result so later steps can reference it
  const familyResultRef = useRef<Record<string, unknown> | null>(null);

  const handleExecuteStep = async (stepId: string) => {
    if (!selectedFamily) return;
    setIsLoading(true);

    try {
      switch (stepId) {
        case "1": {
          // Create client records
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
          if (!familyResult.success) throw new Error(familyResult.error || "Failed to create family");

          familyResultRef.current = familyResult;
          updateStep("1", {
            status: "completed",
            evidence: `Created ${familyResult.contacts.length} contacts`,
            evidenceUrl: familyResult.contacts[0]?.url,
          });
          break;
        }

        case "2": {
          // Create household (already done in createFamily, just display)
          updateStep("2", { status: "running" });
          await new Promise((r) => setTimeout(r, 500));
          const fr = familyResultRef.current as Record<string, unknown> | null;
          updateStep("2", {
            status: "completed",
            evidence: `${selectedFamily.name} Household`,
            evidenceUrl: (fr?.household as Record<string, string>)?.url,
          });
          break;
        }

        case "3": {
          // Generate PDF
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
          if (!pdfResult.success) throw new Error(pdfResult.error || "Failed to generate PDF");

          setPdfUrl(pdfResult.pdf);
          updateStep("3", {
            status: "completed",
            evidence: "4 documents generated",
            evidenceUrl: pdfResult.pdf,
          });
          break;
        }

        case "4": {
          // E-signature (simulated)
          updateStep("4", { status: "running" });
          await new Promise((r) => setTimeout(r, 1500));
          updateStep("4", {
            status: "completed",
            evidence: "Envelope sent",
            evidenceUrl: "#docusign",
          });
          break;
        }

        case "5": {
          // Attach documents (simulated)
          updateStep("5", { status: "running" });
          await new Promise((r) => setTimeout(r, 1000));
          updateStep("5", {
            status: "completed",
            evidence: "Awaiting signatures",
            evidenceUrl: "#pending",
          });
          break;
        }

        case "6": {
          // Create tasks
          updateStep("6", { status: "running" });
          await new Promise((r) => setTimeout(r, 500));
          const fr6 = familyResultRef.current as Record<string, unknown> | null;
          const tasks = fr6?.tasks as Array<Record<string, string>> | undefined;
          updateStep("6", {
            status: "completed",
            evidence: `${tasks?.length || 3} tasks created`,
            evidenceUrl: tasks?.[0]?.url,
          });
          break;
        }
      }

      advanceToNextStep(stepId);
    } catch (error) {
      console.error("Step error:", error);
      updateStep(stepId, { status: "failed" });
      addAssistantMessage(
        `Step "${steps.find((s) => s.id === stepId)?.name}" failed. Check the execution pane for details. You can try again or undo.`
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
    familyResultRef.current = null;
    setSteps(
      INITIAL_STEPS.map((s) => ({
        ...s,
        status: "pending" as const,
        evidence: undefined,
        evidenceUrl: undefined,
      }))
    );

    addAssistantMessage(
      "Workflow cancelled. Note: Records already created in Salesforce will remain (you can delete them manually if needed).\n\nWhat would you like to do next?"
    );
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

  // ─── Home Screen ─────────────────────────────────────────────────────────

  if (screen === "home") {
    return (
      <div className="flex h-screen bg-slate-50">
        <div className="flex-1 flex flex-col items-center justify-center px-8">
          <div className="max-w-2xl w-full">
            {/* Hero */}
            <div className="text-center mb-10">
              <h1 className="text-4xl font-bold text-slate-800 mb-2">Min</h1>
              <p className="text-lg text-slate-500">
                One conversation. Everything handled.
              </p>
            </div>

            {/* Quick Actions */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-slate-400 uppercase tracking-wide">
                What do you need to do?
              </p>
              {QUICK_ACTIONS.map((action) => {
                const Icon = action.icon;
                return (
                  <button
                    key={action.id}
                    onClick={() => handleQuickAction(action.id)}
                    className={`w-full flex items-center gap-4 p-4 rounded-lg border text-left transition-all ${
                      action.live
                        ? "bg-white border-slate-200 hover:border-slate-400 hover:shadow-md cursor-pointer"
                        : "bg-slate-50 border-slate-100 cursor-pointer hover:border-slate-200"
                    }`}
                  >
                    <div
                      className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                        action.live
                          ? "bg-slate-800 text-white"
                          : "bg-slate-100 text-slate-400"
                      }`}
                    >
                      <Icon size={20} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p
                          className={`font-medium ${
                            action.live ? "text-slate-800" : "text-slate-400"
                          }`}
                        >
                          {action.label}
                        </p>
                        {!action.live && (
                          <span className="text-[10px] font-medium uppercase tracking-wider text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded">
                            Soon
                          </span>
                        )}
                      </div>
                      <p className={`text-sm ${action.live ? "text-slate-500" : "text-slate-300"}`}>
                        {action.description}
                      </p>
                    </div>
                    {action.live && (
                      <div className="text-slate-300 flex-shrink-0">→</div>
                    )}
                  </button>
                );
              })}
            </div>

            {/* Powered by */}
            <p className="text-center text-xs text-slate-300 mt-8">
              Powered by Min · Built for RIAs
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ─── Chat Screen ─────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-slate-50">
      {/* Left Pane - Intent/Conversation */}
      <div className="w-1/2 flex flex-col border-r border-slate-200">
        <div className="p-4 border-b border-slate-200 bg-white flex items-center gap-3">
          <button
            onClick={handleBackToHome}
            className="text-slate-400 hover:text-slate-600 transition-colors"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-xl font-semibold text-slate-800">Min</h1>
            <p className="text-sm text-slate-500">One conversation. Everything handled.</p>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4" ref={scrollRef}>
          <div className="space-y-4">
            {messages.map((message, index) => (
              <div key={index}>
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="rounded-lg px-4 py-2 max-w-[80%] whitespace-pre-line bg-slate-800 text-white">
                      {message.content}
                    </div>
                  </div>
                ) : (
                  <StreamingMessage
                    content={message.content}
                    shouldStream={index === streamingIndex}
                    onStreamComplete={handleStreamComplete}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

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
          {workflowConfirmed && !allCompleted && (
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
            <div className="animate-fade-in">
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
                  <div
                    key={step.id}
                    className={`flex items-start gap-3 p-3 rounded-lg transition-all duration-300 ${
                      step.status === "ready"
                        ? "bg-blue-50 border border-blue-200"
                        : step.status === "running"
                        ? "bg-blue-50/50 border border-blue-100"
                        : "bg-transparent"
                    }`}
                  >
                    <div
                      className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5 ${
                        step.status === "completed"
                          ? "bg-green-500"
                          : step.status === "running"
                          ? "bg-blue-500 animate-pulse"
                          : step.status === "ready"
                          ? "bg-blue-500"
                          : step.status === "failed"
                          ? "bg-red-500"
                          : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`text-sm ${
                          step.status === "completed" ||
                          step.status === "running" ||
                          step.status === "ready" ||
                          step.status === "failed"
                            ? "text-white"
                            : "text-slate-400"
                        }`}
                      >
                        {step.status === "completed"
                          ? "✓"
                          : step.status === "running"
                          ? "⋯"
                          : step.status === "ready"
                          ? "▸"
                          : step.status === "failed"
                          ? "✕"
                          : "○"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between">
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
                        {step.status === "ready" && (
                          <Button
                            size="sm"
                            onClick={() => handleExecuteStep(step.id)}
                            disabled={isLoading}
                            className="ml-2 h-7 text-xs"
                          >
                            {isLoading ? "Running..." : "Execute"}
                          </Button>
                        )}
                        {step.status === "failed" && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              updateStep(step.id, { status: "ready" });
                            }}
                            className="ml-2 h-7 text-xs text-red-600 border-red-200 hover:bg-red-50"
                          >
                            Retry
                          </Button>
                        )}
                      </div>
                      {step.evidence && (
                        <div className="flex items-center gap-2 mt-1">
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
                          className="text-xs text-slate-400 hover:text-slate-600 mt-1"
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
                <Card className="p-4 mt-4 bg-green-50 border-green-200 animate-fade-in">
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
                    Begin Workflow
                  </Button>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
      </div>
    </div>
  );
}
