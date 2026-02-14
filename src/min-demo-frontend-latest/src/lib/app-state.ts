"use client";
import { useReducer, useEffect, useCallback, useRef } from "react";
import { callSF } from "@/lib/salesforce";
import { buildHomeStats } from "@/lib/home-stats";
import { log } from "@/lib/logger";
import type { HomeStats, SFTask, SFHousehold } from "@/lib/home-stats";
import type { Screen, ClientInfo, WorkflowContext, UserRole } from "@/lib/types";

// ─── State Shape ────────────────────────────────────────────────────────────

export interface AppState {
  // Setup
  setupStep: "role" | "name" | "crm" | "connect" | "ready";
  role: UserRole | null;
  advisorName: string;

  // Navigation
  screen: Screen;
  navStack: { screen: Screen; ctx: WorkflowContext | null }[];
  wfCtx: WorkflowContext | null;
  handoff: { p1: ClientInfo; p2: ClientInfo; hasP2: boolean } | null;

  // Salesforce connection
  sfConnected: boolean | null;
  sfInstance: string;

  // Practice data
  stats: HomeStats | null;
  statsLoading: boolean;
  rawTasks: SFTask[];
  rawHouseholds: SFHousehold[];
  rawInstanceUrl: string;
  principalAdvisor: string;

  // UI
  toast: string | null;
  tourActive: boolean;
}

// ─── Actions ────────────────────────────────────────────────────────────────

export type AppAction =
  // Setup
  | { type: "SET_ROLE"; role: UserRole }
  | { type: "SET_ADVISOR_NAME"; name: string }
  | { type: "SET_SETUP_STEP"; step: AppState["setupStep"] }

  // Navigation
  | { type: "NAVIGATE"; screen: Screen; ctx?: WorkflowContext }
  | { type: "GO_BACK" }
  | { type: "GO_HOME" }
  | { type: "SET_HANDOFF"; handoff: AppState["handoff"] }
  | { type: "SET_SCREEN"; screen: Screen }

  // Salesforce
  | { type: "SF_STATUS"; connected: boolean; instance: string }
  | { type: "STATS_LOADING" }
  | { type: "STATS_LOADED"; stats: HomeStats; tasks: SFTask[]; households: SFHousehold[]; instanceUrl: string }
  | { type: "STATS_RECOMPUTED"; stats: HomeStats }
  | { type: "STATS_FAILED" }
  | { type: "SET_PRINCIPAL_ADVISOR"; advisor: string }

  // UI
  | { type: "SHOW_TOAST"; message: string }
  | { type: "CLEAR_TOAST" }
  | { type: "SET_TOUR"; active: boolean }
  | { type: "SET_ROLE_INLINE"; role: UserRole }; // role switcher on home screen

// ─── Initial State ──────────────────────────────────────────────────────────

const initialState: AppState = {
  setupStep: "role",
  role: null,
  advisorName: "",
  screen: "home",
  navStack: [],
  wfCtx: null,
  handoff: null,
  sfConnected: null,
  sfInstance: "",
  stats: null,
  statsLoading: true,
  rawTasks: [],
  rawHouseholds: [],
  rawInstanceUrl: "",
  principalAdvisor: "all",
  toast: null,
  tourActive: false,
};

// ─── Reducer ────────────────────────────────────────────────────────────────

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    // ── Setup ──
    case "SET_ROLE":
      return { ...state, role: action.role };
    case "SET_ADVISOR_NAME":
      return { ...state, advisorName: action.name };
    case "SET_SETUP_STEP":
      // Principals land directly on the Practice Intelligence Dashboard
      if (action.step === "ready" && state.role === "principal") {
        return { ...state, setupStep: action.step, screen: "dashboard" };
      }
      return { ...state, setupStep: action.step };

    // ── Navigation ──
    case "NAVIGATE": {
      const newStack = state.screen !== "home"
        ? [...state.navStack, { screen: state.screen, ctx: state.wfCtx }]
        : state.navStack;
      return { ...state, screen: action.screen, wfCtx: action.ctx || null, navStack: newStack };
    }
    case "GO_BACK": {
      if (state.navStack.length > 0) {
        const prev = state.navStack[state.navStack.length - 1];
        return { ...state, screen: prev.screen, wfCtx: prev.ctx, navStack: state.navStack.slice(0, -1) };
      }
      return { ...state, screen: "home", wfCtx: null, handoff: null, navStack: [] };
    }
    case "GO_HOME":
      return { ...state, screen: "home", wfCtx: null, handoff: null, navStack: [] };
    case "SET_HANDOFF":
      return { ...state, handoff: action.handoff };
    case "SET_SCREEN":
      return { ...state, screen: action.screen };

    // ── Salesforce ──
    case "SF_STATUS":
      return { ...state, sfConnected: action.connected, sfInstance: action.instance };
    case "STATS_LOADING":
      return { ...state, statsLoading: true };
    case "STATS_LOADED":
      return { ...state, stats: action.stats, rawTasks: action.tasks, rawHouseholds: action.households, rawInstanceUrl: action.instanceUrl, statsLoading: false };
    case "STATS_RECOMPUTED":
      return { ...state, stats: action.stats, statsLoading: false };
    case "STATS_FAILED":
      return { ...state, statsLoading: false };
    case "SET_PRINCIPAL_ADVISOR":
      return { ...state, principalAdvisor: action.advisor };

    // ── UI ──
    case "SHOW_TOAST":
      return { ...state, toast: action.message };
    case "CLEAR_TOAST":
      return { ...state, toast: null };
    case "SET_TOUR":
      return { ...state, tourActive: action.active };
    case "SET_ROLE_INLINE":
      return { ...state, role: action.role };

    default:
      return state;
  }
}

// ─── Hook ───────────────────────────────────────────────────────────────────

export function useAppState() {
  const [state, dispatch] = useReducer(appReducer, initialState);
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Salesforce connection check (on mount) ──
  useEffect(() => {
    fetch("/api/salesforce/connection")
      .then(r => r.json())
      .then(d => {
        const instance = d.instanceUrl
          ?.replace("https://", "")
          .split(".")[0]
          .replace(/-[a-f0-9]{10,}-dev-ed$/i, "")
          .replace(/-/g, " ") || "";
        dispatch({ type: "SF_STATUS", connected: d.connected, instance });
      })
      .catch(() => {
        log.warn("AppState", "Salesforce connection check failed");
        dispatch({ type: "SF_STATUS", connected: false, instance: "" });
      });
  }, []);

  // ── Auto-load stats when ready ──
  useEffect(() => {
    if (state.setupStep === "ready" && state.screen === "home" && state.sfConnected && !state.stats) {
      loadStats();
    } else if (state.setupStep === "ready" && state.screen === "home" && !state.sfConnected) {
      dispatch({ type: "STATS_FAILED" });
    }
  }, [state.setupStep, state.screen, state.sfConnected]);

  // ── Data loading ──
  const loadStats = useCallback(async (filterAdv?: string) => {
    dispatch({ type: "STATS_LOADING" });
    try {
      // If we already have raw data and just need to re-filter, skip the API call
      if (state.rawTasks.length > 0 && state.rawHouseholds.length > 0 && filterAdv !== undefined) {
        const stats = buildHomeStats(state.rawTasks, state.rawHouseholds, state.rawInstanceUrl, filterAdv === "all" ? undefined : filterAdv);
        dispatch({ type: "STATS_RECOMPUTED", stats });
        return;
      }
      const res = await callSF("queryTasks", { limit: 200 });
      if (res.success) {
        const stats = buildHomeStats(res.tasks as SFTask[], res.households as SFHousehold[], res.instanceUrl as string, filterAdv === "all" ? undefined : filterAdv);
        dispatch({ type: "STATS_LOADED", stats, tasks: res.tasks as SFTask[], households: res.households as SFHousehold[], instanceUrl: res.instanceUrl as string });
      } else {
        log.error("AppState", "Failed to load stats", { error: res.error, errorCode: res.errorCode });
        dispatch({ type: "STATS_FAILED" });
      }
    } catch (err) {
      log.error("AppState", "Stats loading crashed", { error: err instanceof Error ? err.message : "Unknown" });
      dispatch({ type: "STATS_FAILED" });
    }
  }, [state.rawTasks, state.rawHouseholds, state.rawInstanceUrl]);

  // ── Navigation helpers ──
  const goTo = useCallback((screen: Screen, ctx?: WorkflowContext) => {
    dispatch({ type: "NAVIGATE", screen, ctx });
  }, []);

  const goBack = useCallback(() => {
    dispatch({ type: "GO_BACK" });
  }, []);

  const goHome = useCallback(() => {
    dispatch({ type: "GO_HOME" });
  }, []);

  // ── Toast ──
  const showToast = useCallback((message: string) => {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    dispatch({ type: "SHOW_TOAST", message });
    toastTimer.current = setTimeout(() => dispatch({ type: "CLEAR_TOAST" }), 3000);
  }, []);

  return { state, dispatch, goTo, goBack, goHome, loadStats, showToast };
}
