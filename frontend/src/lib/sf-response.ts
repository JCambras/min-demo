// ─── Salesforce API Response Types ───────────────────────────────────────────
//
// Matches the structured error responses from api/salesforce/route.ts (Day 1).
// Used by callSF to provide typed responses to all client-side consumers.

// ─── Error Codes ────────────────────────────────────────────────────────────
// These match the codes returned by the server's catch block.

export type SFErrorCode =
  | "VALIDATION_ERROR"    // Bad input — client sent malformed data
  | "SF_QUERY_FAILED"     // Salesforce query failed (SOQL error, permissions, etc.)
  | "SF_MUTATION_FAILED"  // Salesforce create/update failed
  | "UNKNOWN_ACTION"      // Action name not recognized
  | "AUTH_FAILED"         // Salesforce auth/token issue
  | "INTERNAL_ERROR"      // Unexpected server error
  | "NETWORK_ERROR"       // Client couldn't reach the server
  | "PARSE_ERROR"         // Server returned non-JSON
  | "TIMEOUT";            // Client-side request timeout

// ─── Response Shape ─────────────────────────────────────────────────────────

export interface SFSuccessResponse {
  success: true;
  [key: string]: unknown;
}

export interface SFErrorResponse {
  success: false;
  /** Human-readable error message (always a string on the client) */
  error: string;
  /** Machine-readable error code for programmatic handling */
  errorCode: SFErrorCode;
  /** Additional fields from server (isDuplicate, existingId, etc.) */
  [key: string]: unknown;
}

export type SFResponse = SFSuccessResponse | SFErrorResponse;

// ─── Error Extraction ───────────────────────────────────────────────────────
//
// The server returns errors in two shapes:
//   Old: { success: false, error: "string message" }
//   New: { success: false, error: { code: "VALIDATION_ERROR", message: "..." } }
//
// This normalizer handles both so existing client code (which reads .error as string)
// continues to work, while new code can also use .errorCode.

export function normalizeResponse(raw: Record<string, unknown>): SFResponse {
  if (raw.success === true) return raw as SFSuccessResponse;

  // Extract error message and code
  let errorMessage: string;
  let errorCode: SFErrorCode;

  if (typeof raw.error === "object" && raw.error !== null) {
    // New structured format: { error: { code, message } }
    const err = raw.error as { code?: string; message?: string };
    errorMessage = err.message || "Unknown error";
    errorCode = (err.code as SFErrorCode) || "INTERNAL_ERROR";
  } else if (typeof raw.error === "string") {
    // Old flat format: { error: "string" }
    errorMessage = raw.error;
    errorCode = guessErrorCode(errorMessage);
  } else {
    errorMessage = "Unknown error";
    errorCode = "INTERNAL_ERROR";
  }

  return {
    ...raw,
    success: false as const,
    error: errorMessage,
    errorCode,
  };
}

// ─── Code Guessing (for legacy responses) ───────────────────────────────────

function guessErrorCode(message: string): SFErrorCode {
  const m = message.toLowerCase();
  if (m.includes("network") || m.includes("fetch")) return "NETWORK_ERROR";
  if (m.includes("non-json")) return "PARSE_ERROR";
  if (m.includes("auth") || m.includes("token") || m.includes("session")) return "AUTH_FAILED";
  if (m.includes("invalid") || m.includes("missing") || m.includes("required")) return "VALIDATION_ERROR";
  return "INTERNAL_ERROR";
}

// ─── User-Friendly Error Messages ───────────────────────────────────────────
//
// Maps error codes to messages suitable for showing in the UI.
// The raw error.message is often too technical for end users.

export function userFriendlyError(code: SFErrorCode, detail?: string): string {
  switch (code) {
    case "VALIDATION_ERROR":
      return detail || "Please check your input and try again.";
    case "SF_QUERY_FAILED":
      return "Couldn't load data from Salesforce. Please try again.";
    case "SF_MUTATION_FAILED":
      return "Couldn't save to Salesforce. Please try again.";
    case "AUTH_FAILED":
      return "Salesforce connection expired. Please reconnect in Settings.";
    case "NETWORK_ERROR":
      return "Can't reach the server. Check your connection.";
    case "PARSE_ERROR":
      return "Received an unexpected response. Please try again.";
    case "UNKNOWN_ACTION":
      return "Something went wrong. Please refresh and try again.";
    case "INTERNAL_ERROR":
    default:
      return "Something went wrong. Please try again.";
  }
}
