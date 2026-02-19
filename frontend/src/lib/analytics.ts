import type { HomeStats } from "@/lib/home-stats";

// ─── PII Sanitization ─────────────────────────────────────────────────────────

/** Allowlisted numeric fields safe to persist in analytics. */
const SAFE_STAT_KEYS: readonly (keyof HomeStats)[] = [
  "overdueTasks",
  "openTasks",
  "readyForReview",
  "unsignedEnvelopes",
  "upcomingMeetings",
];

/**
 * Strips PII from HomeStats before analytics persistence.
 * Only permits known-safe aggregate numeric fields.
 */
export function sanitizeStatsForAnalytics(
  stats: HomeStats | null | undefined,
): Record<string, number> {
  if (!stats) return {};
  const out: Record<string, number> = {};
  for (const key of SAFE_STAT_KEYS) {
    const val = stats[key];
    if (typeof val === "number") out[key] = val;
  }
  return out;
}

/** Key patterns that indicate PII — matched case-insensitively. */
const PII_KEY_PATTERNS =
  /^(name|email|phone|address|household|accountId|contactId|ssn)$/i;

/**
 * Strips PII and unsafe structures from event properties.
 * - Removes keys matching PII patterns
 * - Rejects nested objects/arrays
 * - Truncates strings > 200 chars
 * - Passes numbers, booleans, and short strings
 */
export function sanitizeEventProperties(
  props: Record<string, unknown> | null | undefined,
): Record<string, unknown> {
  if (!props || typeof props !== "object") return {};
  const out: Record<string, unknown> = {};
  for (const [key, val] of Object.entries(props)) {
    if (PII_KEY_PATTERNS.test(key)) continue;
    if (val === null || val === undefined) continue;
    if (typeof val === "object") continue; // arrays and nested objects
    if (typeof val === "string") {
      out[key] = val.length > 200 ? val.slice(0, 200) : val;
    } else if (typeof val === "number" || typeof val === "boolean") {
      out[key] = val;
    }
    // other types (functions, symbols) are silently dropped
  }
  return out;
}

// ─── Event Tracking ───────────────────────────────────────────────────────────

/** Fire-and-forget event tracking. Never throws. */
export function trackEvent(eventName: string, properties?: Record<string, unknown>) {
  const sanitized = properties ? sanitizeEventProperties(properties) : undefined;
  fetch("/api/analytics/event", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ eventName, properties: sanitized }),
  }).catch(() => {}); // never block UI
}
