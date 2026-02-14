// ─── CRM Adapter Factory ──────────────────────────────────────────────────────
//
// Resolves the active CRM adapter based on the NEXT_PUBLIC_CRM_PROVIDER env var.
// Returns a singleton instance — safe to call repeatedly.
//
// Single-tenant resolution: one CRM per deployment.
// Per-tenant dispatch is a future enhancement.

import type { CRMPort, CRMContext } from "./port";
import { SalesforceAdapter } from "./adapters/salesforce";
import { getAccessToken } from "@/lib/sf-connection";

// ─── Singleton Cache ────────────────────────────────────────────────────────

let cachedAdapter: CRMPort | null = null;

/**
 * Returns the CRM adapter for the current deployment.
 * Reads NEXT_PUBLIC_CRM_PROVIDER (defaults to "salesforce").
 */
export function getCRMAdapter(): CRMPort {
  if (cachedAdapter) return cachedAdapter;

  const provider = (process.env.NEXT_PUBLIC_CRM_PROVIDER || "salesforce").toLowerCase();

  switch (provider) {
    case "salesforce":
      cachedAdapter = new SalesforceAdapter();
      break;
    // Future adapters:
    // case "wealthbox":
    //   cachedAdapter = new WealthboxAdapter();
    //   break;
    // case "redtail":
    //   cachedAdapter = new RedtailAdapter();
    //   break;
    default:
      throw new Error(`Unknown CRM provider: ${provider}. Supported: salesforce`);
  }

  return cachedAdapter;
}

/**
 * Builds a CRMContext for the current adapter.
 * For Salesforce, wraps the existing getAccessToken() result.
 */
export async function getCRMContext(): Promise<CRMContext> {
  const adapter = getCRMAdapter();

  if (adapter.providerId === "salesforce") {
    const sfAuth = await getAccessToken();
    return { auth: sfAuth, instanceUrl: sfAuth.instanceUrl };
  }

  // Future: each provider resolves its own auth
  throw new Error(`Auth resolution not implemented for provider: ${adapter.providerId}`);
}

/**
 * Reset the cached adapter. Used in tests.
 * @internal
 */
export function _resetAdapterCache(): void {
  cachedAdapter = null;
}
