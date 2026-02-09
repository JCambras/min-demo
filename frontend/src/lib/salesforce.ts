// ─── Salesforce Client Helper ────────────────────────────────────────────────

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
  | "recordComplianceReview";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function callSF(action: SFAction, data: Record<string, any>) {
  try {
    const res = await fetch("/api/salesforce", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, data }),
    });
    const text = await res.text();
    try {
      return JSON.parse(text);
    } catch {
      console.error("SF non-JSON response:", text.slice(0, 200));
      return { success: false, error: `Server returned non-JSON response (${res.status})` };
    }
  } catch (err) {
    console.error("SF fetch error:", err);
    return { success: false, error: err instanceof Error ? err.message : "Network error" };
  }
}
