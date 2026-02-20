// ─── Triage Threshold Configuration ─────────────────────────────────────────
//
// Allows firms to customize the hardcoded urgency thresholds used by
// buildHomeStats. Persisted in localStorage so changes survive reloads.

export interface TriageThresholdConfig {
  /** Days before an unsigned DocuSign triggers urgency "now" (default 5) */
  unsignedDocuSignDays: number;
  /** Days until due to qualify as "due soon" (default 1) */
  dueSoonDays: number;
  /** Days without compliance review to appear in triage (default 7) */
  complianceUnreviewedDays: number;
  /** Days of inactivity for a household to be considered stale (default 30) */
  staleHouseholdDays: number;
  /** Max triage items shown (default 7) */
  triageCap: number;
  /** Compliance coverage % below which insight triggers as critical (default 50) */
  complianceCriticalPct: number;
  /** Compliance coverage % below which insight triggers at all (default 80) */
  complianceHighPct: number;
  /** Days unsigned before insight severity is "critical" (default 10) */
  unsignedCriticalDays: number;
  /** Days stale before severity is "critical" (default 60) */
  staleCriticalDays: number;
  /** Days overdue on high-priority before severity is "critical" (default 7) */
  highPriOverdueCriticalDays: number;
}

const STORAGE_KEY = "min-triage-thresholds";

export const DEFAULT_TRIAGE_CONFIG: TriageThresholdConfig = {
  unsignedDocuSignDays: 5,
  dueSoonDays: 1,
  complianceUnreviewedDays: 7,
  staleHouseholdDays: 30,
  triageCap: 7,
  complianceCriticalPct: 50,
  complianceHighPct: 80,
  unsignedCriticalDays: 10,
  staleCriticalDays: 60,
  highPriOverdueCriticalDays: 7,
};

export function loadTriageConfig(): TriageThresholdConfig {
  if (typeof window === "undefined") return { ...DEFAULT_TRIAGE_CONFIG };
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_TRIAGE_CONFIG };
    return { ...DEFAULT_TRIAGE_CONFIG, ...JSON.parse(raw) };
  } catch {
    return { ...DEFAULT_TRIAGE_CONFIG };
  }
}

export function saveTriageConfig(config: TriageThresholdConfig): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}
