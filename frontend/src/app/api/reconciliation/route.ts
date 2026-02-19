import { NextResponse } from "next/server";

// POST /api/reconciliation
// MVP: Accept CSV-style custodial account data, fuzzy-match against Salesforce households.
// Returns matched, orphaned-custodial, orphaned-CRM, and mismatched records.

interface CustodialAccount {
  accountNumber: string;
  ownerName: string;
  accountType: string;
  balance: number;
}

interface MatchResult {
  status: "matched" | "orphan-custodial" | "orphan-crm" | "mismatch";
  custodialAccount?: CustodialAccount;
  crmHousehold?: string;
  crmHouseholdId?: string;
  notes?: string;
}

function fuzzyMatch(a: string, b: string): number {
  const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "");
  const na = normalize(a);
  const nb = normalize(b);
  if (na === nb) return 1;
  if (na.includes(nb) || nb.includes(na)) return 0.8;
  // Simple overlap score
  const words = na.split(/\s+/);
  const hits = words.filter(w => nb.includes(w)).length;
  return words.length > 0 ? hits / words.length : 0;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { custodialAccounts, crmHouseholds } = body as {
      custodialAccounts: CustodialAccount[];
      crmHouseholds: { id: string; name: string }[];
    };

    if (!custodialAccounts || !crmHouseholds) {
      return NextResponse.json({ error: "custodialAccounts and crmHouseholds are required" }, { status: 400 });
    }

    const results: MatchResult[] = [];
    const matchedCrmIds = new Set<string>();

    // Match custodial accounts to CRM households
    for (const acct of custodialAccounts) {
      let bestMatch: { id: string; name: string; score: number } | null = null;
      for (const hh of crmHouseholds) {
        const score = fuzzyMatch(acct.ownerName, hh.name);
        if (score > 0.5 && (!bestMatch || score > bestMatch.score)) {
          bestMatch = { id: hh.id, name: hh.name, score };
        }
      }

      if (bestMatch) {
        matchedCrmIds.add(bestMatch.id);
        if (bestMatch.score < 0.8) {
          results.push({
            status: "mismatch",
            custodialAccount: acct,
            crmHousehold: bestMatch.name,
            crmHouseholdId: bestMatch.id,
            notes: `Partial match (${Math.round(bestMatch.score * 100)}%) — verify manually`,
          });
        } else {
          results.push({
            status: "matched",
            custodialAccount: acct,
            crmHousehold: bestMatch.name,
            crmHouseholdId: bestMatch.id,
          });
        }
      } else {
        results.push({
          status: "orphan-custodial",
          custodialAccount: acct,
          notes: "Account exists at custodian but no matching CRM household found",
        });
      }
    }

    // Find orphaned CRM households (not matched to any custodial account)
    for (const hh of crmHouseholds) {
      if (!matchedCrmIds.has(hh.id)) {
        results.push({
          status: "orphan-crm",
          crmHousehold: hh.name,
          crmHouseholdId: hh.id,
          notes: "CRM household has no matching custodial account",
        });
      }
    }

    const summary = {
      matched: results.filter(r => r.status === "matched").length,
      orphanCustodial: results.filter(r => r.status === "orphan-custodial").length,
      orphanCrm: results.filter(r => r.status === "orphan-crm").length,
      mismatched: results.filter(r => r.status === "mismatch").length,
      total: results.length,
    };

    return NextResponse.json({ success: true, summary, results });
  } catch (error) {
    console.error("Reconciliation error:", error);
    return NextResponse.json({ error: "Reconciliation failed" }, { status: 500 });
  }
}
