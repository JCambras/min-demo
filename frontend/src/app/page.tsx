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

export default function Home() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [workflowActive, setWorkflowActive] = useState(false);
  const [workflowConfirmed, setWorkflowConfirmed] = useState(false);
  const [expandedReasoning, setExpandedReasoning] = useState<string | null>(null);
  
  const [steps, setSteps] = useState<WorkflowStep[]>([
    { 
      id: "1", 
      name: "Create client records", 
      status: "pending",
      reasoning: "Each family member needs a Contact record in Salesforce to track their individual information, documents, and communication history."
    },
    { 
      id: "2", 
      name: "Create household", 
      status: "pending",
      reasoning: "A Household groups related contacts together, making it easier to see the full family picture and manage shared accounts."
    },
    { 
      id: "3", 
      name: "Generate onboarding packet", 
      status: "pending",
      reasoning: "The packet includes IPS template, risk questionnaire, ADV disclosure, and privacy policy — all required documents for new clients."
    },
    { 
      id: "4", 
      name: "Send for e-signature", 
      status: "pending",
      reasoning: "E-signature via DocuSign creates a legally binding record and automatically tracks who signed what and when."
    },
    { 
      id: "5", 
      name: "Attach signed documents", 
      status: "pending",
      reasoning: "Signed documents are stored in Salesforce and linked to the client record for easy retrieval during audits or reviews."
    },
    { 
      id: "6", 
      name: "Create follow-up tasks", 
      status: "pending",
      reasoning: "Automated tasks ensure nothing falls through the cracks — scheduling the first meeting, collecting missing info, etc."
    },
  ]);

  const handleSend = () => {
    if (!input.trim()) return;
    
    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    
    const lowerInput = input.toLowerCase();
    if (lowerInput.includes("onboard") || lowerInput.includes("new client") || lowerInput.includes("new family")) {
      setTimeout(() => {
        const assistantMessage: Message = {
          role: "assistant",
          content: "I'll set up the Johnson family as new clients. I found two family members to onboard:\n\n• Michael Johnson (primary)\n• Sarah Johnson (spouse)\n\nI'll create their records, generate the onboarding paperwork, and send everything for e-signature. Ready to see the plan?",
        };
        setMessages((prev) => [...prev, assistantMessage]);
        setWorkflowActive(true);
      }, 1000);
    } else {
      setTimeout(() => {
        const assistantMessage: Message = {
          role: "assistant",
          content: `I understand you want to "${input}". Try saying "Onboard the Johnson family as new clients" to see the workflow in action.`,
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

  const handleConfirm = () => {
    setWorkflowConfirmed(true);
    
    const stepDelays = [1000, 2500, 4000, 6000, 8000, 9500];
    
    stepDelays.forEach((delay, index) => {
      setTimeout(() => {
        setSteps((prev) =>
          prev.map((step, i) => {
            if (i === index) {
              return { ...step, status: "running" };
            }
            if (i === index - 1) {
              const evidenceLinks = [
                { evidence: "Created 2 contacts", evidenceUrl: "#salesforce" },
                { evidence: "Johnson Household", evidenceUrl: "#salesforce" },
                { evidence: "4 documents generated", evidenceUrl: "#documents" },
                { evidence: "Envelope sent", evidenceUrl: "#docusign" },
                { evidence: "Awaiting signatures", evidenceUrl: "#docusign" },
                { evidence: "3 tasks created", evidenceUrl: "#salesforce" },
              ];
              return { ...step, status: "completed", ...evidenceLinks[i] };
            }
            return step;
          })
        );
      }, delay);
    });

    setTimeout(() => {
      setSteps((prev) =>
        prev.map((step, i) => {
          if (i === prev.length - 1) {
            return { ...step, status: "completed", evidence: "3 tasks created", evidenceUrl: "#salesforce" };
          }
          return step;
        })
      );
    }, 11000);
  };

  const handleUndo = () => {
    setWorkflowActive(false);
    setWorkflowConfirmed(false);
    setSteps((prev) => prev.map((step) => ({ ...step, status: "pending", evidence: undefined, evidenceUrl: undefined })));
    
    const undoMessage: Message = {
      role: "assistant",
      content: "Workflow cancelled. I've reversed the completed steps:\n\n• Archived generated documents\n• Marked contacts as inactive\n• Voided pending e-signature requests\n• Cancelled follow-up tasks\n\nThe audit log shows this reversal with your timestamp.",
    };
    setMessages((prev) => [...prev, undoMessage]);
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
            />
            <Button onClick={handleSend}>Send</Button>
          </div>
        </div>
      </div>

      {/* Right Pane - Execution */}
      <div className="w-1/2 flex flex-col bg-white">
        <div className="p-4 border-b border-slate-200 flex justify-between items-center">
          <h2 className="text-lg font-semibold text-slate-800">
            {workflowActive ? "New Client Onboarding — Johnson Family" : "Execution"}
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
            <>
              <Card className="p-4 mb-4">
                <h3 className="font-medium text-slate-800 mb-2">This will:</h3>
                <ul className="space-y-1 text-sm text-slate-600">
                  <li>• Create contact records for Michael & Sarah Johnson</li>
                  <li>• Set up the Johnson Household in Salesforce</li>
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
                          : "bg-slate-200"
                      }`}
                    >
                      <span
                        className={`text-sm ${
                          step.status === "completed" || step.status === "running"
                            ? "text-white"
                            : "text-slate-400"
                        }`}
                      >
                        {step.status === "completed" ? "✓" : step.status === "running" ? "⋯" : "○"}
                      </span>
                    </div>
                    <div className="flex-1">
                      <p
                        className={`text-sm font-medium ${
                          step.status === "pending" ? "text-slate-400" : "text-slate-800"
                        }`}
                      >
                        {step.name}
                      </p>
                      {step.evidence && (
                        <a href={step.evidenceUrl} className="text-xs text-blue-600 hover:underline">
                          {step.evidence} →
                        </a>
                      )}
                      {step.reasoning && (
                        <button
                          onClick={() =>
                            setExpandedReasoning(expandedReasoning === step.id ? null : step.id)
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
                    All documents sent. You'll be notified when signatures are received.
                  </p>
                  <Button variant="outline" size="sm" className="mt-3">
                    View Replay
                  </Button>
                </Card>
              )}
              
              {!workflowConfirmed && (
                <div className="mt-6">
                  <Button className="w-full" size="lg" onClick={handleConfirm}>
                    Confirm & Execute
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
