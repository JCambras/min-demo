// ─── Idle Session Timeout ────────────────────────────────────────────────────
//
// SEC/FINRA requires session management for systems with client data access.
// After 15 minutes of no interaction, the user is returned to the role
// selection screen (effectively a soft logout that requires re-confirming
// identity before accessing client data again).
//
// "Interaction" = mouse move, click, keypress, scroll, or touch.
// The timer resets on every interaction.
//
// Usage in page.tsx:
//   useIdleTimeout(() => dispatch({ type: "SET_SETUP_STEP", step: "role" }));

"use client";
import { useEffect, useRef, useCallback } from "react";

const IDLE_TIMEOUT_MS = 15 * 60 * 1000; // 15 minutes
const ACTIVITY_EVENTS = ["mousemove", "mousedown", "keydown", "scroll", "touchstart", "click"];

/**
 * Calls `onIdle` after 15 minutes of no user interaction.
 * Automatically cleans up listeners on unmount.
 *
 * @param onIdle - Callback fired when session times out
 * @param enabled - Set false to disable (e.g. during setup screens)
 */
export function useIdleTimeout(onIdle: () => void, enabled = true) {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const onIdleRef = useRef(onIdle);
  onIdleRef.current = onIdle;

  const resetTimer = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onIdleRef.current();
    }, IDLE_TIMEOUT_MS);
  }, []);

  useEffect(() => {
    if (!enabled) {
      if (timerRef.current) clearTimeout(timerRef.current);
      return;
    }

    // Start timer
    resetTimer();

    // Reset on any user interaction
    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, resetTimer, { passive: true });
    }

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, resetTimer);
      }
    };
  }, [enabled, resetTimer]);
}
