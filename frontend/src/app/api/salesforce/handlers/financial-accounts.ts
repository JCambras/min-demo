// ─── Financial Account Domain Handlers ───────────────────────────────────────
//
// Creates and queries FinServ__FinancialAccount__c records.
// These are FSC-standard objects that hold actual account data: type, AUM,
// custodian account number, and ownership roles.
//
// Graceful degradation: if org doesn't have FSC installed, creation fails
// silently and Min falls back to assumption-based revenue estimates.

import { NextResponse } from "next/server";
import { query, create, sanitizeSOQL } from "@/lib/sf-client";
import type { SFContext, SFRecord } from "@/lib/sf-client";
import { validate } from "@/lib/sf-validation";
import { custodian } from "@/lib/custodian";

type Handler = (data: unknown, ctx: SFContext) => Promise<NextResponse>;

// ─── FSC Account Type Mapping ───────────────────────────────────────────────
// Maps Min account types to FSC FinancialAccount RecordType names

const ACCOUNT_TYPE_MAP: Record<string, { fscType: string; taxStatus: string }> = {
  "IRA":              { fscType: "Individual Retirement", taxStatus: "Tax-Deferred" },
  "Roth IRA":         { fscType: "Roth IRA",            taxStatus: "Tax-Free" },
  "Individual":       { fscType: "Brokerage",           taxStatus: "Taxable" },
  "Individual TOD":   { fscType: "Brokerage",           taxStatus: "Taxable" },
  "SEP IRA":          { fscType: "SEP IRA",             taxStatus: "Tax-Deferred" },
  "SIMPLE IRA":       { fscType: "SIMPLE IRA",          taxStatus: "Tax-Deferred" },
  "401(k)":           { fscType: "401k",                taxStatus: "Tax-Deferred" },
  "529 Plan":         { fscType: "529 Education",       taxStatus: "Tax-Free" },
  "JTWROS":           { fscType: "Joint Brokerage",     taxStatus: "Taxable" },
  "JTWROS TOD":       { fscType: "Joint Brokerage",     taxStatus: "Taxable" },
  "Joint TIC":        { fscType: "Joint Brokerage",     taxStatus: "Taxable" },
  "Community Property": { fscType: "Joint Brokerage",   taxStatus: "Taxable" },
};

// ─── Handlers ───────────────────────────────────────────────────────────────

export const financialAccountHandlers: Record<string, Handler> = {

  /**
   * Create FinancialAccount records for a household's planned accounts.
   * Called after confirmIntent creates the household and contacts.
   *
   * Input: { householdId, primaryContactId, accounts: [{ type, owner, amount? }] }
   */
  createFinancialAccounts: async (raw, ctx) => {
    const data = validate.createFinancialAccounts(raw);

    const created: (SFRecord & { accountType: string })[] = [];
    let fscAvailable = true;

    for (const acct of data.accounts) {
      const mapping = ACCOUNT_TYPE_MAP[acct.type] || { fscType: "Brokerage", taxStatus: "Taxable" };
      const amount = acct.amount ? parseFloat(acct.amount.replace(/[,$]/g, "")) : 0;

      try {
        const record = await create(ctx, "FinServ__FinancialAccount__c", {
          Name: `${acct.owner} — ${acct.type}`,
          FinServ__FinancialAccountType__c: mapping.fscType,
          FinServ__TaxStatus__c: mapping.taxStatus,
          FinServ__Household__c: data.householdId,
          FinServ__PrimaryOwner__c: data.primaryContactId || undefined,
          FinServ__Balance__c: amount || undefined,
          FinServ__Status__c: "New",
          FinServ__OpenDate__c: new Date().toISOString().split("T")[0],
          Description: `Created by Min during account opening.\nCustodian: ${custodian.name}\nAccount Type: ${acct.type}\nOwner: ${acct.owner}`,
        });
        created.push({ ...record, accountType: acct.type });
      } catch (err) {
        // FSC not installed — this is expected for non-FSC orgs
        const msg = err instanceof Error ? err.message : "";
        if (msg.includes("INVALID_TYPE") || msg.includes("NOT_FOUND") || msg.includes("sObject type")) {
          fscAvailable = false;
          break; // No point trying more accounts if FSC isn't there
        }
        // Other errors: log and continue (partial success is better than none)
        console.error(`[FinancialAccount] Failed to create ${acct.type}:`, msg);
      }
    }

    return NextResponse.json({
      success: true,
      financialAccounts: created,
      fscAvailable,
      count: created.length,
    });
  },

  /**
   * Query FinancialAccounts for dashboard revenue intelligence.
   * Returns real AUM data when FSC is available.
   *
   * Input: { householdIds?: string[] } (optional filter; omit for all)
   */
  queryFinancialAccounts: async (raw, ctx) => {
    const data = validate.queryFinancialAccounts(raw);

    try {
      let soql = `SELECT Id, Name, FinServ__FinancialAccountType__c, FinServ__TaxStatus__c,
        FinServ__Balance__c, FinServ__Household__c, FinServ__Household__r.Name,
        FinServ__PrimaryOwner__c, FinServ__PrimaryOwner__r.Name,
        FinServ__Status__c, FinServ__OpenDate__c
        FROM FinServ__FinancialAccount__c`;

      if (data.householdIds && data.householdIds.length > 0) {
        const ids = data.householdIds.map(id => `'${sanitizeSOQL(id)}'`).join(",");
        soql += ` WHERE FinServ__Household__c IN (${ids})`;
      }

      soql += ` ORDER BY FinServ__Household__r.Name, Name LIMIT 500`;

      const accounts = await query(ctx, soql);

      // Compute real AUM
      const totalAum = accounts.reduce((sum, a) => sum + (Number(a.FinServ__Balance__c) || 0), 0);
      const byHousehold = new Map<string, number>();
      for (const a of accounts) {
        const hhId = a.FinServ__Household__c as string;
        byHousehold.set(hhId, (byHousehold.get(hhId) || 0) + (Number(a.FinServ__Balance__c) || 0));
      }

      return NextResponse.json({
        success: true,
        fscAvailable: true,
        accounts,
        totalAum,
        aumByHousehold: Object.fromEntries(byHousehold),
        count: accounts.length,
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      if (msg.includes("INVALID_TYPE") || msg.includes("NOT_FOUND") || msg.includes("sObject type")) {
        // FSC not installed — return empty with flag
        return NextResponse.json({
          success: true,
          fscAvailable: false,
          accounts: [],
          totalAum: 0,
          aumByHousehold: {},
          count: 0,
        });
      }
      throw err; // Re-throw unexpected errors for the dispatcher to handle
    }
  },
};
