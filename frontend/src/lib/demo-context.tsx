"use client";
import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { seedDemoNotes } from "./demo-data";

// ─── Demo Mode Context ───────────────────────────────────────────────────
// Provides demo mode state to the entire app.
// Default: active when sfConnected === false.
// Keyboard: Ctrl+Shift+D (toggle), Ctrl+Shift+R (reset).

interface DemoModeState {
  isDemoMode: boolean;
  toggleDemo: () => void;
  resetDemo: () => void;
  markSentToCrm: (id: string) => void;
  undoCrmSend: (id: string) => void;
  sentToCrm: Set<string>;
  resetKey: number;
}

const DemoContext = createContext<DemoModeState>({
  isDemoMode: false,
  toggleDemo: () => {},
  resetDemo: () => {},
  markSentToCrm: () => {},
  undoCrmSend: () => {},
  sentToCrm: new Set(),
  resetKey: 0,
});

export function useDemoMode() {
  return useContext(DemoContext);
}

const STORAGE_KEY = "min-demo-mode";

export function DemoProvider({ children, sfConnected }: { children: ReactNode; sfConnected: boolean | null }) {
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [sentToCrm, setSentToCrm] = useState<Set<string>>(new Set());
  const [resetKey, setResetKey] = useState(0);
  // Restore demo mode from sessionStorage on mount
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(STORAGE_KEY);
      if (stored === "true") setIsDemoMode(true);
    } catch {}
  }, []);

  // Auto-activate demo mode when SF not connected
  useEffect(() => {
    if (sfConnected === false) {
      setIsDemoMode(true);
      try { sessionStorage.setItem(STORAGE_KEY, "true"); } catch {}
    }
  }, [sfConnected]);

  // Seed demo data when demo mode activates
  useEffect(() => {
    if (isDemoMode) seedDemoNotes();
  }, [isDemoMode]);

  const toggleDemo = useCallback(() => {
    setIsDemoMode(prev => {
      const next = !prev;
      try { sessionStorage.setItem(STORAGE_KEY, String(next)); } catch {}
      return next;
    });
  }, []);

  const resetDemo = useCallback(() => {
    setSentToCrm(new Set());
    setResetKey(k => k + 1);
  }, []);

  const markSentToCrm = useCallback((id: string) => {
    setSentToCrm(prev => { const s = new Set(prev); s.add(id); return s; });
  }, []);

  const undoCrmSend = useCallback((id: string) => {
    setSentToCrm(prev => { const s = new Set(prev); s.delete(id); return s; });
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.shiftKey && e.key === "D") {
        e.preventDefault();
        toggleDemo();
      }
      if (e.ctrlKey && e.shiftKey && e.key === "R") {
        e.preventDefault();
        resetDemo();
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [toggleDemo, resetDemo]);

  return (
    <DemoContext.Provider value={{ isDemoMode, toggleDemo, resetDemo, markSentToCrm, undoCrmSend, sentToCrm, resetKey }}>
      {children}
      <div
        className="fixed bottom-4 right-4 z-50 px-3 py-1.5 rounded-full bg-slate-800/80 text-white text-[10px] font-medium tracking-wider uppercase backdrop-blur-sm select-none pointer-events-none"
        hidden={!isDemoMode}
        suppressHydrationWarning
      >
        DEMO
      </div>
    </DemoContext.Provider>
  );
}
