"use client";
import { useState } from "react";
import { GraduationCap, CheckCircle, Play } from "lucide-react";
import { TRACKS, loadProgress, saveProgress } from "@/lib/training-tracks";
import type { TrainingStep, TrainingProgress } from "@/lib/training-tracks";
import type { Screen } from "@/lib/types";

// ─── Component ──────────────────────────────────────────────────────────────

export function TeamTraining({ onNavigate, advisorName }: {
  onNavigate: (screen: Screen) => void;
  advisorName?: string;
}) {
  const [progress, setProgress] = useState<TrainingProgress>(loadProgress);
  const [expandedTrack, setExpandedTrack] = useState<string | null>(null);

  const markComplete = (trackId: string, stepId: string) => {
    setProgress(prev => {
      const track = prev[trackId] || { completed: [] };
      if (track.completed.includes(stepId)) return prev;
      const completed = [...track.completed, stepId];
      const trackDef = TRACKS.find(t => t.id === trackId)!;
      const next = { ...prev, [trackId]: { completed, completedAt: completed.length >= trackDef.steps.length ? new Date().toISOString() : undefined } };
      saveProgress(next);
      return next;
    });
  };

  const startStep = (trackId: string, step: TrainingStep) => {
    markComplete(trackId, step.id);
    onNavigate(step.screen);
  };

  return (
    <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden">
      <div className="px-5 py-4 border-b border-slate-100 flex items-center gap-3">
        <GraduationCap size={16} className="text-slate-500" />
        <div>
          <h3 className="text-sm font-semibold text-slate-700 uppercase tracking-wider">Team Training</h3>
          <p className="text-xs text-slate-400">Role-specific onboarding paths for new team members</p>
        </div>
      </div>

      <div className="divide-y divide-slate-50">
        {TRACKS.map(track => {
          const tp = progress[track.id] || { completed: [] };
          const completedCount = tp.completed.length;
          const totalSteps = track.steps.length;
          const pct = Math.round((completedCount / totalSteps) * 100);
          const isComplete = tp.completedAt;
          const isExpanded = expandedTrack === track.id;

          return (
            <div key={track.id}>
              <button onClick={() => setExpandedTrack(isExpanded ? null : track.id)}
                className="w-full flex items-center gap-4 px-5 py-4 text-left hover:bg-slate-50 transition-colors">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${isComplete ? "bg-green-50 text-green-500" : "bg-slate-100 text-slate-400"}`}>
                  {isComplete ? <CheckCircle size={18} /> : <GraduationCap size={18} />}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-slate-700">{track.label}</p>
                  <p className="text-xs text-slate-400 mt-0.5">{track.description}</p>
                </div>
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="w-20 text-right">
                    <p className="text-[10px] text-slate-400 mb-1">{completedCount}/{totalSteps}</p>
                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                      <div className={`h-full rounded-full transition-all ${isComplete ? "bg-green-500" : "bg-blue-500"}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                  <span className="text-[10px] text-slate-300">{track.estimatedMinutes}m</span>
                </div>
              </button>

              {isExpanded && (
                <div className="px-5 pb-4 animate-fade-in">
                  <div className="pl-5 border-l-2 border-slate-200 space-y-2">
                    {track.steps.map((step, i) => {
                      const done = tp.completed.includes(step.id);
                      const Icon = step.icon;
                      return (
                        <div key={step.id} className="flex items-start gap-3 relative">
                          <div className={`w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 -ml-[17px] ${done ? "bg-green-500 text-white" : "bg-white border-2 border-slate-300"}`}>
                            {done ? <CheckCircle size={12} /> : <span className="text-[10px] text-slate-400">{i + 1}</span>}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <Icon size={12} className="text-slate-400" />
                              <p className={`text-sm ${done ? "text-slate-400 line-through" : "text-slate-700"}`}>{step.label}</p>
                            </div>
                            <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                          </div>
                          {!done && (
                            <button onClick={() => startStep(track.id, step)}
                              className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-900 text-white hover:bg-slate-800 flex items-center gap-1 flex-shrink-0">
                              <Play size={10} /> Start
                            </button>
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {isComplete && (
                    <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-xl text-center">
                      <CheckCircle size={16} className="text-green-500 mx-auto mb-1" />
                      <p className="text-sm font-medium text-green-700">Training Complete</p>
                      <p className="text-xs text-green-600 mt-0.5">
                        {advisorName || "Team member"} completed {track.label} on {new Date(tp.completedAt!).toLocaleDateString()}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
