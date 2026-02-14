// ─── DataSourcePort Interface ──────────────────────────────────────────────────
//
// BridgeFT (and similar services) are not CRMs — they're supplementary data
// sources for financial accounts. This interface composes with CRMPort:
// if a CRM lacks financial data (e.g. Wealthbox), a DataSource fills the gap.

import type { CRMFinancialAccount } from "./types";

export interface DataSourceContext {
  auth: unknown;
}

export interface DataSourcePort {
  /** Unique source identifier, e.g. "bridgeft". */
  readonly sourceId: string;

  /** Human-readable source name, e.g. "BridgeFT". */
  readonly sourceName: string;

  /** Query financial accounts, optionally filtered by household IDs. */
  queryFinancialAccounts(
    ctx: DataSourceContext,
    householdIds?: string[],
  ): Promise<{
    accounts: CRMFinancialAccount[];
    totalAum: number;
    aumByHousehold: Record<string, number>;
  }>;
}
