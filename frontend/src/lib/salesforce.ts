// ─── Salesforce Client Helper ────────────────────────────────────────────────
//
// Client-side gateway to the Salesforce API route.
// Every component that talks to Salesforce goes through callSF.
//
// CSRF: On first call, acquires a CSRF token from /api/csrf and caches it.
// Sends the token as X-CSRF-Token on every POST. If the server returns 403
// with CSRF_ERROR, refreshes the token and retries once.

import { normalizeResponse } from "./sf-response";
import type { SFResponse } from "./sf-response";
import { log } from "./logger";

/** Valid SF API action names — must match handler map keys in api/salesforce/route.ts */
export type SFAction =
  | "searchContacts"
  | "confirmIntent"
  | "recordFunding"
  | "recordMoneyLink"
  | "recordBeneficiaries"
  | "recordCompleteness"
  | "recordPaperwork"
  | "recordDocusignConfig"
  | "sendDocusign"
  | "searchHouseholds"
  | "getHouseholdDetail"
  | "recordComplianceReview"
  | "recordMeetingNote"
  | "queryTasks"
  | "completeTask"
  | "createTask"
  | "createFinancialAccounts"
  | "queryFinancialAccounts";

// ─── CSRF Token Management ──────────────────────────────────────────────────

let csrfToken: string | null = null;
let csrfPromise: Promise<string> | null = null;

async function getCsrfToken(forceRefresh = false): Promise<string> {
  if (csrfToken && !forceRefresh) return csrfToken;

  // Deduplicate concurrent requests for a token
  if (csrfPromise && !forceRefresh) return csrfPromise;

  csrfPromise = (async () => {
    try {
      const res = await fetch("/api/csrf");
      const data = await res.json();
      csrfToken = data.token;
      return csrfToken!;
    } catch (err) {
      log.warn("CSRF", "Failed to acquire CSRF token", { error: err instanceof Error ? err.message : "Unknown" });
      return "";
    } finally {
      csrfPromise = null;
    }
  })();

  return csrfPromise;
}

// ─── Retry & Timeout Configuration ──────────────────────────────────────────

const CLIENT_TIMEOUT_MS = 35_000;  // 35s (slightly longer than server's 30s)
const CLIENT_MAX_RETRIES = 2;      // Max retries for transient failures
const CLIENT_RETRY_BASE_MS = 600;  // Base delay for exponential backoff

/** HTTP status codes that indicate transient server issues */
function isTransientStatus(status: number): boolean {
  return status === 502 || status === 503 || status === 504;
}

// ─── API Call ───────────────────────────────────────────────────────────────

/**
 * Call the Salesforce API proxy.
 *
 * Returns a normalized SFResponse:
 * - On success: { success: true, ...data }
 * - On failure: { success: false, error: "human-readable string", errorCode: "MACHINE_CODE" }
 *
 * Includes:
 * - 35s timeout with AbortController
 * - Exponential backoff retry for transient errors (502, 503, 504, network)
 * - CSRF token refresh on 403
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callSF(action: SFAction, data: Record<string, any>): Promise<SFResponse> {
  return _callSF(action, data, 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _callSF(action: SFAction, data: Record<string, any>, attempt: number): Promise<SFResponse> {
  try {
    const token = await getCsrfToken();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), CLIENT_TIMEOUT_MS);

    let res: Response;
    try {
      res = await fetch("/api/salesforce", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "x-csrf-token": token } : {}),
        },
        body: JSON.stringify({ action, data }),
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timeoutId);
    }

    // Retry on transient server errors
    if (isTransientStatus(res.status) && attempt < CLIENT_MAX_RETRIES) {
      const delay = CLIENT_RETRY_BASE_MS * Math.pow(2, attempt);
      log.warn("callSF", `${action} returned ${res.status}, retrying in ${delay}ms (attempt ${attempt + 1})`);
      await new Promise(r => setTimeout(r, delay));
      return _callSF(action, data, attempt + 1);
    }

    const text = await res.text();

    let parsed: Record<string, unknown>;
    try {
      parsed = JSON.parse(text);
    } catch {
      log.error("callSF", `Non-JSON response for ${action}`, { status: res.status, body: text.slice(0, 200) });
      return {
        success: false,
        error: `Server returned non-JSON response (${res.status})`,
        errorCode: "PARSE_ERROR",
      };
    }

    // CSRF failure — refresh token and retry once
    if (res.status === 403 && parsed.errorCode === "CSRF_ERROR" && attempt === 0) {
      log.info("callSF", "CSRF token expired, refreshing and retrying");
      await getCsrfToken(true);
      return _callSF(action, data, 1);
    }

    const normalized = normalizeResponse(parsed);

    // Log errors (not validation errors — those are expected user mistakes)
    if (!normalized.success && normalized.errorCode !== "VALIDATION_ERROR") {
      log.error("callSF", `${action} failed`, { errorCode: normalized.errorCode, error: normalized.error });
    }

    return normalized;

  } catch (err) {
    // Timeout (AbortError)
    if (err instanceof DOMException && err.name === "AbortError") {
      log.error("callSF", `${action} timed out after ${CLIENT_TIMEOUT_MS}ms`);
      return {
        success: false,
        error: "Request timed out. Please try again.",
        errorCode: "TIMEOUT",
      };
    }

    // Network error — retry with backoff
    if (attempt < CLIENT_MAX_RETRIES) {
      const delay = CLIENT_RETRY_BASE_MS * Math.pow(2, attempt);
      log.warn("callSF", `Network error for ${action}, retrying in ${delay}ms (attempt ${attempt + 1})`);
      await new Promise(r => setTimeout(r, delay));
      return _callSF(action, data, attempt + 1);
    }

    const message = err instanceof Error ? err.message : "Network error";
    log.error("callSF", `Network error for ${action} after ${attempt + 1} attempts`, { error: message });
    return {
      success: false,
      error: message,
      errorCode: "NETWORK_ERROR",
    };
  }
}
