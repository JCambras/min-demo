// ─── Financial Account Domain Handlers ───────────────────────────────────────
//
// Creates and queries FinServ__FinancialAccount__c records.
// These are FSC-standard objects that hold actual account data: type, AUM,
// custodian account number, and ownership roles.
//
// Graceful degradation: if org doesn't have FSC installed, creation fails
// silently and Min falls back to assumption-based revenue estimates.

import { NextResponse } from "next/server";
import type { CRMPort, CRMContext } from "@/lib/crm/port";
import { validate } from "@/lib/sf-validation";

type Handler = (data: unknown, adapter: CRMPort, ctx: CRMContext) => Promise<NextResponse>;

// ─── Handlers ───────────────────────────────────────────────────────────────

export const financialAccountHandlers: Record<string, Handler> = {

  /**
   * Create FinancialAccount records for a household's planned accounts.
   * Called after confirmIntent creates the household and contacts.
   *
   * Input: { householdId, primaryContactId, accounts: [{ type, owner, amount? }] }
   */
  createFinancialAccounts: async (raw, adapter, ctx) => {
    const data = validate.createFinancialAccounts(raw);

    const result = await adapter.createFinancialAccounts!(ctx,
      data.accounts.map(acct => ({
        name: `${acct.owner} — ${acct.type}`,
        accountType: acct.type,
        owner: acct.owner,
        amount: acct.amount ? parseFloat(acct.amount.replace(/[,$]/g, "")) : 0,
        householdId: data.householdId,
        primaryContactId: data.primaryContactId,
      }))
    );

    return NextResponse.json({
      success: true,
      financialAccounts: result.accounts,
      fscAvailable: result.fscAvailable,
      count: result.accounts.length,
    });
  },

  /**
   * Query FinancialAccounts for dashboard revenue intelligence.
   * Returns real AUM data when FSC is available.
   *
   * Input: { householdIds?: string[] } (optional filter; omit for all)
   */
  queryFinancialAccounts: async (raw, adapter, ctx) => {
    const data = validate.queryFinancialAccounts(raw);

    const result = await adapter.queryFinancialAccounts!(ctx, data.householdIds);

    return NextResponse.json({
      success: true,
      fscAvailable: result.fscAvailable,
      accounts: result.accounts.map(a => a.raw),
      totalAum: result.totalAum,
      aumByHousehold: result.aumByHousehold,
      count: result.accounts.length,
    });
  },
};
