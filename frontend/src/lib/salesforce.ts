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
  | "createTask";

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

// ─── API Call ───────────────────────────────────────────────────────────────

/**
 * Call the Salesforce API proxy.
 *
 * Returns a normalized SFResponse:
 * - On success: { success: true, ...data }
 * - On failure: { success: false, error: "human-readable string", errorCode: "MACHINE_CODE" }
 *
 * The `error` field is always a string (even though the server may return a structured object),
 * so existing code that reads `res.error` continues to work.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callSF(action: SFAction, data: Record<string, any>): Promise<SFResponse> {
  return _callSF(action, data, false);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function _callSF(action: SFAction, data: Record<string, any>, isRetry: boolean): Promise<SFResponse> {
  try {
    const token = await getCsrfToken();

    const res = await fetch("/api/salesforce", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(token ? { "x-csrf-token": token } : {}),
      },
      body: JSON.stringify({ action, data }),
    });

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
    if (res.status === 403 && parsed.errorCode === "CSRF_ERROR" && !isRetry) {
      log.info("callSF", "CSRF token expired, refreshing and retrying");
      await getCsrfToken(true);
      return _callSF(action, data, true);
    }

    const normalized = normalizeResponse(parsed);

    // Log errors (not validation errors — those are expected user mistakes)
    if (!normalized.success && normalized.errorCode !== "VALIDATION_ERROR") {
      log.error("callSF", `${action} failed`, { errorCode: normalized.errorCode, error: normalized.error });
    }

    return normalized;

  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    log.error("callSF", `Network error for ${action}`, { error: message });
    return {
      success: false,
      error: message,
      errorCode: "NETWORK_ERROR",
    };
  }
}
