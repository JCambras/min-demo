// ─── Discovery Demo Seed ────────────────────────────────────────────────────
//
// Creates rich synthetic data that makes Schema Discovery look impressive.
// This is ADDITIVE — it won't delete existing data, and skips records that
// already exist (safe to run multiple times).
//
// What it creates:
//   • 8 households (Account, Type=Household) with Service Tiers and advisor assignments
//   • 18 contacts across those households (primary + spouse + dependents)
//   • 30+ financial accounts (IRA, Roth, Joint, 401k, 529) with realistic balances
//   • Compliance review tasks
//   • Meeting note tasks
//   • DocuSign tasks (some completed, some pending)
//   • Opportunities for pipeline detection
//
// POST /api/salesforce/seed/discovery

import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/sf-connection";
import { query, create } from "@/lib/sf-client";
import type { SFContext } from "@/lib/sf-client";

// ─── Demo Data ──────────────────────────────────────────────────────────────

const HOUSEHOLDS = [
  { name: "Shakespeare Family", advisor: "Jon Cambras", tier: "Platinum", status: "Active" },
  { name: "Austen Family", advisor: "Jon Cambras", tier: "Gold", status: "Active" },
  { name: "Hemingway Family", advisor: "Marcus Rivera", tier: "Platinum", status: "Active" },
  { name: "Fitzgerald Family", advisor: "Marcus Rivera", tier: "Gold", status: "Active" },
  { name: "Morrison Family", advisor: "Diane Rivera", tier: "Platinum", status: "Active" },
  { name: "Woolf Family", advisor: "Diane Rivera", tier: "Standard", status: "Active" },
  { name: "Tolkien Family", advisor: "Jon Cambras", tier: "Standard", status: "Active" },
  { name: "García Márquez Family", advisor: "Marcus Rivera", tier: "Gold", status: "Prospect" },
];

const CONTACTS: { household: string; first: string; last: string; email: string; phone: string; isPrimary: boolean }[] = [
  { household: "Shakespeare Family", first: "William", last: "Shakespeare", email: "will@avon.com", phone: "555-0101", isPrimary: true },
  { household: "Shakespeare Family", first: "Anne", last: "Hathaway", email: "anne@avon.com", phone: "555-0102", isPrimary: false },
  { household: "Austen Family", first: "Jane", last: "Austen", email: "jane@bath.com", phone: "555-0201", isPrimary: true },
  { household: "Austen Family", first: "Cassandra", last: "Austen", email: "cass@bath.com", phone: "555-0202", isPrimary: false },
  { household: "Hemingway Family", first: "Ernest", last: "Hemingway", email: "ernest@keywest.com", phone: "555-0301", isPrimary: true },
  { household: "Hemingway Family", first: "Mary", last: "Hemingway", email: "mary@keywest.com", phone: "555-0302", isPrimary: false },
  { household: "Fitzgerald Family", first: "F. Scott", last: "Fitzgerald", email: "scott@gatsby.com", phone: "555-0401", isPrimary: true },
  { household: "Fitzgerald Family", first: "Zelda", last: "Fitzgerald", email: "zelda@gatsby.com", phone: "555-0402", isPrimary: false },
  { household: "Morrison Family", first: "Toni", last: "Morrison", email: "toni@lorain.com", phone: "555-0501", isPrimary: true },
  { household: "Morrison Family", first: "Harold", last: "Morrison", email: "harold@lorain.com", phone: "555-0502", isPrimary: false },
  { household: "Morrison Family", first: "Slade", last: "Morrison", email: "slade@lorain.com", phone: "555-0503", isPrimary: false },
  { household: "Woolf Family", first: "Virginia", last: "Woolf", email: "virginia@bloomsbury.com", phone: "555-0601", isPrimary: true },
  { household: "Woolf Family", first: "Leonard", last: "Woolf", email: "leonard@bloomsbury.com", phone: "555-0602", isPrimary: false },
  { household: "Tolkien Family", first: "J.R.R.", last: "Tolkien", email: "jrr@shire.com", phone: "555-0701", isPrimary: true },
  { household: "Tolkien Family", first: "Edith", last: "Tolkien", email: "edith@shire.com", phone: "555-0702", isPrimary: false },
  { household: "Tolkien Family", first: "Christopher", last: "Tolkien", email: "chris@shire.com", phone: "555-0703", isPrimary: false },
  { household: "García Márquez Family", first: "Gabriel", last: "García Márquez", email: "gabo@macondo.com", phone: "555-0801", isPrimary: true },
  { household: "García Márquez Family", first: "Mercedes", last: "Barcha", email: "mercedes@macondo.com", phone: "555-0802", isPrimary: false },
];

// Financial accounts — realistic RIA portfolio structure
const FINANCIAL_ACCOUNTS: { household: string; owner: string; type: string; name: string; balance: number }[] = [
  // Shakespeare — Platinum, ~$8.2M total
  { household: "Shakespeare Family", owner: "William Shakespeare", type: "Traditional IRA", name: "Will's IRA", balance: 2850000 },
  { household: "Shakespeare Family", owner: "William Shakespeare", type: "Roth IRA", name: "Will's Roth", balance: 750000 },
  { household: "Shakespeare Family", owner: "Anne Hathaway", type: "Traditional IRA", name: "Anne's IRA", balance: 1200000 },
  { household: "Shakespeare Family", owner: "Anne Hathaway", type: "Roth IRA", name: "Anne's Roth", balance: 425000 },
  { household: "Shakespeare Family", owner: "William Shakespeare", type: "Joint Brokerage", name: "Shakespeare Joint", balance: 2975000 },

  // Austen — Gold, ~$3.4M total
  { household: "Austen Family", owner: "Jane Austen", type: "Traditional IRA", name: "Jane's IRA", balance: 1450000 },
  { household: "Austen Family", owner: "Jane Austen", type: "Roth IRA", name: "Jane's Roth", balance: 680000 },
  { household: "Austen Family", owner: "Cassandra Austen", type: "Traditional IRA", name: "Cassandra's IRA", balance: 920000 },
  { household: "Austen Family", owner: "Jane Austen", type: "Joint Brokerage", name: "Austen Joint", balance: 350000 },

  // Hemingway — Platinum, ~$12.1M total
  { household: "Hemingway Family", owner: "Ernest Hemingway", type: "Traditional IRA", name: "Ernest's IRA", balance: 3200000 },
  { household: "Hemingway Family", owner: "Ernest Hemingway", type: "Roth IRA", name: "Ernest's Roth", balance: 890000 },
  { household: "Hemingway Family", owner: "Mary Hemingway", type: "Traditional IRA", name: "Mary's IRA", balance: 1750000 },
  { household: "Hemingway Family", owner: "Ernest Hemingway", type: "Joint Brokerage", name: "Hemingway Joint", balance: 4250000 },
  { household: "Hemingway Family", owner: "Ernest Hemingway", type: "Trust", name: "Hemingway Family Trust", balance: 2010000 },

  // Fitzgerald — Gold, ~$4.8M total
  { household: "Fitzgerald Family", owner: "F. Scott Fitzgerald", type: "Traditional IRA", name: "Scott's IRA", balance: 1850000 },
  { household: "Fitzgerald Family", owner: "Zelda Fitzgerald", type: "Traditional IRA", name: "Zelda's IRA", balance: 975000 },
  { household: "Fitzgerald Family", owner: "F. Scott Fitzgerald", type: "Joint Brokerage", name: "Fitzgerald Joint", balance: 1975000 },

  // Morrison — Platinum, ~$9.5M total
  { household: "Morrison Family", owner: "Toni Morrison", type: "Traditional IRA", name: "Toni's IRA", balance: 3100000 },
  { household: "Morrison Family", owner: "Toni Morrison", type: "Roth IRA", name: "Toni's Roth", balance: 950000 },
  { household: "Morrison Family", owner: "Harold Morrison", type: "401(k)", name: "Harold's 401k", balance: 2200000 },
  { household: "Morrison Family", owner: "Toni Morrison", type: "Joint Brokerage", name: "Morrison Joint", balance: 2150000 },
  { household: "Morrison Family", owner: "Slade Morrison", type: "529 Plan", name: "Slade's 529", balance: 1100000 },

  // Woolf — Standard, ~$1.2M total
  { household: "Woolf Family", owner: "Virginia Woolf", type: "Traditional IRA", name: "Virginia's IRA", balance: 520000 },
  { household: "Woolf Family", owner: "Leonard Woolf", type: "Traditional IRA", name: "Leonard's IRA", balance: 380000 },
  { household: "Woolf Family", owner: "Virginia Woolf", type: "Joint Brokerage", name: "Woolf Joint", balance: 300000 },

  // Tolkien — Standard, ~$2.3M total
  { household: "Tolkien Family", owner: "J.R.R. Tolkien", type: "Traditional IRA", name: "JRR's IRA", balance: 850000 },
  { household: "Tolkien Family", owner: "Edith Tolkien", type: "Traditional IRA", name: "Edith's IRA", balance: 450000 },
  { household: "Tolkien Family", owner: "J.R.R. Tolkien", type: "Roth IRA", name: "JRR's Roth", balance: 325000 },
  { household: "Tolkien Family", owner: "J.R.R. Tolkien", type: "Joint Brokerage", name: "Tolkien Joint", balance: 675000 },

  // García Márquez — Gold (Prospect), ~$5.7M total
  { household: "García Márquez Family", owner: "Gabriel García Márquez", type: "Traditional IRA", name: "Gabriel's IRA", balance: 2100000 },
  { household: "García Márquez Family", owner: "Mercedes Barcha", type: "Traditional IRA", name: "Mercedes's IRA", balance: 1350000 },
  { household: "García Márquez Family", owner: "Gabriel García Márquez", type: "Joint Brokerage", name: "García Márquez Joint", balance: 2250000 },
];

// Task templates for workflow richness
function buildTasks(householdId: string, householdName: string, advisor: string): Record<string, unknown>[] {
  const now = new Date();
  const daysAgo = (d: number) => { const dt = new Date(now); dt.setDate(dt.getDate() - d); return dt.toISOString().split("T")[0]; };
  const daysOut = (d: number) => { const dt = new Date(now); dt.setDate(dt.getDate() + d); return dt.toISOString().split("T")[0]; };

  return [
    // Compliance review (completed)
    { Subject: `COMPLIANCE REVIEW — ${householdName}`, WhatId: householdId, Status: "Completed", Priority: "High", ActivityDate: daysAgo(15), Description: `Annual compliance review completed.\nReviewed by: ${advisor}\nAssigned Advisor: ${advisor}` },
    // Meeting note
    { Subject: `MEETING NOTE — ${householdName} quarterly check-in`, WhatId: householdId, Status: "Completed", Priority: "Normal", ActivityDate: daysAgo(10), Description: `Quarterly review meeting.\nAttendees: ${advisor}\nTopics: Portfolio performance, rebalancing, tax planning\nAssigned Advisor: ${advisor}` },
    // DocuSign (completed)
    { Subject: `SEND DOCU — ${householdName} IPS update`, WhatId: householdId, Status: "Completed", Priority: "Normal", ActivityDate: daysAgo(20), Description: `Investment Policy Statement update sent and signed.\nAssigned Advisor: ${advisor}` },
    // Account opening
    { Subject: `ACCOUNT opening checklist — ${householdName}`, WhatId: householdId, Status: "Completed", Priority: "Normal", ActivityDate: daysAgo(45), Description: `Account opening completed.\nAssigned Advisor: ${advisor}` },
  ];
}

// Extra tasks for some households to create variety
function buildExtraTasks(householdId: string, householdName: string, advisor: string, tier: string): Record<string, unknown>[] {
  const now = new Date();
  const daysAgo = (d: number) => { const dt = new Date(now); dt.setDate(dt.getDate() - d); return dt.toISOString().split("T")[0]; };
  const daysOut = (d: number) => { const dt = new Date(now); dt.setDate(dt.getDate() + d); return dt.toISOString().split("T")[0]; };

  const extras: Record<string, unknown>[] = [];

  if (tier === "Platinum") {
    // Extra meeting, pending DocuSign
    extras.push(
      { Subject: `MEETING NOTE — ${householdName} estate planning`, WhatId: householdId, Status: "Completed", Priority: "High", ActivityDate: daysAgo(5), Description: `Estate planning session with attorney.\nAssigned Advisor: ${advisor}` },
      { Subject: `SEND DOCU — ${householdName} trust amendment`, WhatId: householdId, Status: "Not Started", Priority: "High", ActivityDate: daysOut(3), Description: `Trust amendment awaiting signature.\nAssigned Advisor: ${advisor}` },
    );
  }

  if (tier === "Gold") {
    extras.push(
      { Subject: `SEND DOCU — ${householdName} beneficiary update`, WhatId: householdId, Status: "Not Started", Priority: "Normal", ActivityDate: daysOut(7), Description: `Beneficiary designation update pending.\nAssigned Advisor: ${advisor}` },
    );
  }

  return extras;
}

// ─── Main Seed Logic ────────────────────────────────────────────────────────

export async function POST() {
  try {
    const ctx: SFContext = await getAccessToken();
    const log: string[] = [];
    let created = { households: 0, contacts: 0, financialAccounts: 0, tasks: 0, opportunities: 0 };

    // ── 1. Create Households ──────────────────────────────────────────────
    const hhIdMap = new Map<string, string>(); // name → SF Id

    for (const hh of HOUSEHOLDS) {
      // Check if already exists
      const existing = await query(ctx,
        `SELECT Id FROM Account WHERE Name = '${hh.name}' LIMIT 1`
      );

      if (existing.length > 0) {
        hhIdMap.set(hh.name, existing[0].Id as string);
        log.push(`✓ ${hh.name} already exists`);
      } else {
        const result = await create(ctx, "Account", {
          Name: hh.name,
          Type: "Household",
          Description: `Assigned Advisor: ${hh.advisor}\nService Tier: ${hh.tier}\nClient Status: ${hh.status}`,
        });
        hhIdMap.set(hh.name, result.id);
        created.households++;
        log.push(`+ Created ${hh.name} (${hh.tier})`);
      }
    }

    // ── 2. Create Contacts ────────────────────────────────────────────────
    for (const c of CONTACTS) {
      const hhId = hhIdMap.get(c.household);
      if (!hhId) continue;

      const existing = await query(ctx,
        `SELECT Id FROM Contact WHERE FirstName = '${c.first}' AND LastName = '${c.last}' LIMIT 1`
      );

      if (existing.length > 0) {
        log.push(`✓ ${c.first} ${c.last} already exists`);
      } else {
        await create(ctx, "Contact", {
          FirstName: c.first,
          LastName: c.last,
          Email: c.email,
          Phone: c.phone,
          AccountId: hhId,
        }, { allowDuplicates: true });
        created.contacts++;
        log.push(`+ Created contact ${c.first} ${c.last}`);
      }
    }

    // ── 3. Create Financial Accounts (FSC) ────────────────────────────────
    // Only attempt if FSC is installed
    let fscAvailable = false;
    try {
      await query(ctx, "SELECT Id FROM FinServ__FinancialAccount__c LIMIT 1");
      fscAvailable = true;
    } catch {
      log.push("⚠ FSC FinancialAccount not available — skipping financial accounts");
    }

    if (fscAvailable) {
      for (const fa of FINANCIAL_ACCOUNTS) {
        const hhId = hhIdMap.get(fa.household);
        if (!hhId) continue;

        // Check if already exists by name
        const existing = await query(ctx,
          `SELECT Id FROM FinServ__FinancialAccount__c WHERE Name = '${fa.name.replace(/'/g, "\\'")}' LIMIT 1`
        );

        if (existing.length > 0) {
          log.push(`✓ FA "${fa.name}" already exists`);
        } else {
          try {
            await create(ctx, "FinServ__FinancialAccount__c", {
              Name: fa.name,
              FinServ__PrimaryOwner__c: hhId,
              FinServ__Balance__c: fa.balance,
              FinServ__FinancialAccountType__c: fa.type,
              FinServ__Status__c: "Open",
            });
            created.financialAccounts++;
            log.push(`+ Created FA "${fa.name}" ($${(fa.balance / 1000000).toFixed(1)}M)`);
          } catch (err) {
            log.push(`⚠ Failed to create FA "${fa.name}": ${err instanceof Error ? err.message : "unknown"}`);
          }
        }
      }
    }

    // ── 4. Create Tasks (workflows, compliance, meetings) ─────────────────
    for (const hh of HOUSEHOLDS) {
      const hhId = hhIdMap.get(hh.name);
      if (!hhId) continue;

      // Check if tasks already seeded (use COMPLIANCE REVIEW as marker)
      const existing = await query(ctx,
        `SELECT Id FROM Task WHERE WhatId = '${hhId}' AND Subject LIKE 'COMPLIANCE REVIEW%' LIMIT 1`
      );

      if (existing.length > 0) {
        log.push(`✓ ${hh.name} tasks already seeded`);
        continue;
      }

      const tasks = [
        ...buildTasks(hhId, hh.name, hh.advisor),
        ...buildExtraTasks(hhId, hh.name, hh.advisor, hh.tier),
      ];

      for (const t of tasks) {
        await create(ctx, "Task", t);
        created.tasks++;
      }
      log.push(`+ Seeded ${tasks.length} tasks for ${hh.name}`);
    }

    // ── 5. Create Opportunities (pipeline) ────────────────────────────────
    // Only for prospect households
    const prospectHouseholds = HOUSEHOLDS.filter(h => h.status === "Prospect");
    for (const hh of prospectHouseholds) {
      const hhId = hhIdMap.get(hh.name);
      if (!hhId) continue;

      const existing = await query(ctx,
        `SELECT Id FROM Opportunity WHERE AccountId = '${hhId}' LIMIT 1`
      );

      if (existing.length > 0) {
        log.push(`✓ ${hh.name} opportunity already exists`);
        continue;
      }

      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + 45);

      await create(ctx, "Opportunity", {
        Name: `${hh.name} — New Client Onboarding`,
        AccountId: hhId,
        StageName: "Proposal",
        Amount: FINANCIAL_ACCOUNTS.filter(f => f.household === hh.name).reduce((s, f) => s + f.balance, 0),
        CloseDate: closeDate.toISOString().split("T")[0],
        Description: `Prospect pipeline for ${hh.name}.\nAssigned Advisor: ${hh.advisor}`,
      });
      created.opportunities++;
      log.push(`+ Created opportunity for ${hh.name}`);
    }

    // ── Summary ───────────────────────────────────────────────────────────
    const totalAum = FINANCIAL_ACCOUNTS.reduce((s, f) => s + f.balance, 0);

    return NextResponse.json({
      success: true,
      message: `Discovery demo data seeded: ${created.households} households, ${created.contacts} contacts, ${created.financialAccounts} financial accounts ($${(totalAum / 1000000).toFixed(1)}M AUM), ${created.tasks} tasks, ${created.opportunities} opportunities`,
      created,
      details: log,
    });
  } catch (error) {
    console.error("[Discovery Seed Error]", error);
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Seed failed",
    }, { status: 500 });
  }
}
