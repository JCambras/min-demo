// ─── Training Track Data ────────────────────────────────────────────────────
// Role-specific onboarding tracks for team members.
// Extracted from TeamTraining component for reuse and testability.

import {
  UserPlus, Briefcase, Shield, ListTodo, Upload,
  BookOpen, MessageSquare, ClipboardCheck,
  BarChart3, Play,
} from "lucide-react";
import type { Screen } from "@/lib/types";

export interface TrainingStep {
  id: string;
  label: string;
  description: string;
  screen: Screen;
  icon: React.ElementType;
}

export interface TrainingTrack {
  id: string;
  role: string;
  label: string;
  description: string;
  steps: TrainingStep[];
  estimatedMinutes: number;
}

export const TRACKS: TrainingTrack[] = [
  {
    id: "ops",
    role: "operations",
    label: "Operations Training",
    description: "Master client onboarding, account opening, compliance reviews, and task management.",
    estimatedMinutes: 25,
    steps: [
      { id: "ops-1", label: "Onboard a New Client", description: "Walk through the client onboarding workflow — data entry, KYC, and Salesforce recording.", screen: "onboard", icon: UserPlus },
      { id: "ops-2", label: "Open an Account", description: "Complete the account opening flow — paperwork generation and DocuSign integration.", screen: "flow", icon: Briefcase },
      { id: "ops-3", label: "Run a Compliance Review", description: "Search a household and run the 12-check automated compliance scan.", screen: "compliance", icon: Shield },
      { id: "ops-4", label: "Manage Tasks", description: "View, filter, and complete tasks across all households.", screen: "taskManager", icon: ListTodo },
      { id: "ops-5", label: "Process Documents", description: "Use document intake to scan, classify, and file client documents.", screen: "documents", icon: Upload },
    ],
  },
  {
    id: "advisor",
    role: "advisor",
    label: "Advisor Training",
    description: "Learn client briefings, meeting notes, compliance reviews, and financial planning.",
    estimatedMinutes: 20,
    steps: [
      { id: "adv-1", label: "Prepare a Client Briefing", description: "Generate a comprehensive briefing before your next client meeting.", screen: "briefing", icon: BookOpen },
      { id: "adv-2", label: "Log Meeting Notes", description: "Record meeting notes with automated follow-up task creation.", screen: "meeting", icon: MessageSquare },
      { id: "adv-3", label: "Review Compliance", description: "Run a compliance scan on your households to ensure regulatory coverage.", screen: "compliance", icon: Shield },
      { id: "adv-4", label: "Track Planning Goals", description: "Review financial planning milestones and goal progress for clients.", screen: "planning", icon: ClipboardCheck },
    ],
  },
  {
    id: "principal",
    role: "principal",
    label: "Principal Training",
    description: "Understand the practice dashboard, analytics, risk management, and team oversight.",
    estimatedMinutes: 15,
    steps: [
      { id: "pri-1", label: "Review Practice Health", description: "Understand the health score, benchmarks, and operational metrics.", screen: "dashboard", icon: BarChart3 },
      { id: "pri-2", label: "Monitor Activity", description: "Use the activity feed to track team actions across all workflows.", screen: "activity", icon: Play },
      { id: "pri-3", label: "Audit Compliance Trail", description: "Review the audit log for regulatory readiness.", screen: "audit", icon: Shield },
    ],
  },
];

export const TRAINING_KEY = "min-training-progress";

export interface TrainingProgress {
  [trackId: string]: { completed: string[]; completedAt?: string };
}

export function loadProgress(): TrainingProgress {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(TRAINING_KEY) || "{}"); } catch { return {}; }
}

export function saveProgress(p: TrainingProgress) {
  localStorage.setItem(TRAINING_KEY, JSON.stringify(p));
}
