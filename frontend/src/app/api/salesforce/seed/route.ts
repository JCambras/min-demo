import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/sf-connection";
import { query, create, update } from "@/lib/sf-client";
import type { SFContext } from "@/lib/sf-client";

// Demo advisors to distribute across households
const ADVISORS = ["Jon Cambras", "Marcus Rivera", "Diane Rivera"];

// Planning goals to seed per household
const GOAL_SETS: { subject: string; priority: string; status: string; daysOut: number }[][] = [
  [
    { subject: "GOAL: Retirement readiness review", priority: "High", status: "In Progress", daysOut: 30 },
    { subject: "GOAL: Estate plan update — review beneficiaries", priority: "Normal", status: "Not Started", daysOut: 60 },
    { subject: "GOAL: Tax loss harvesting review Q1", priority: "Normal", status: "Completed", daysOut: -7 },
  ],
  [
    { subject: "GOAL: 529 contribution strategy for 2026", priority: "Normal", status: "In Progress", daysOut: 45 },
    { subject: "GOAL: Insurance coverage review — LTC options", priority: "High", status: "Not Started", daysOut: 21 },
  ],
  [
    { subject: "GOAL: Roth conversion analysis before year-end", priority: "High", status: "Not Started", daysOut: 90 },
    { subject: "GOAL: Social Security timing analysis", priority: "Normal", status: "In Progress", daysOut: 60 },
    { subject: "GOAL: Emergency fund target — 6 months", priority: "Normal", status: "Completed", daysOut: -14 },
    { subject: "GOAL: Beneficiary designation review", priority: "Normal", status: "Completed", daysOut: -3 },
  ],
  [
    { subject: "GOAL: Debt payoff milestone — student loans", priority: "High", status: "In Progress", daysOut: 120 },
    { subject: "GOAL: Cash flow optimization — reduce expenses 10%", priority: "Normal", status: "Not Started", daysOut: 30 },
  ],
  [
    { subject: "GOAL: Retirement income plan — distribution strategy", priority: "High", status: "In Progress", daysOut: 14 },
    { subject: "GOAL: Estate plan update — trust review", priority: "Normal", status: "Not Started", daysOut: 45 },
  ],
];

export async function POST() {
  try {
    const ctx: SFContext = await getAccessToken();

    // Get all existing households
    const households = await query(ctx,
      `SELECT Id, Name, Description FROM Account WHERE Type = 'Household' ORDER BY CreatedDate ASC LIMIT 50`
    );

    if (households.length === 0) {
      return NextResponse.json({ success: false, error: "No households found. Onboard some clients first." });
    }

    const results: string[] = [];

    // 1. Distribute advisor assignments across households
    for (let i = 0; i < households.length; i++) {
      const hh = households[i];
      const advisor = ADVISORS[i % ADVISORS.length];
      const desc = (hh.Description as string) || "";

      // Only update if no advisor assigned yet
      if (!desc.includes("Assigned Advisor:")) {
        const newDesc = desc ? `${desc}\nAssigned Advisor: ${advisor}` : `Assigned Advisor: ${advisor}`;
        await update(ctx, "Account", hh.Id as string, { Description: newDesc });
        results.push(`Assigned ${hh.Name} → ${advisor}`);
      } else {
        results.push(`${hh.Name} already has advisor assigned`);
      }
    }

    // 2. Seed planning goals for each household
    for (let i = 0; i < households.length; i++) {
      const hh = households[i];
      const goalSet = GOAL_SETS[i % GOAL_SETS.length];

      // Check if goals already exist for this household
      const existing = await query(ctx,
        `SELECT Id FROM Task WHERE WhatId = '${hh.Id}' AND Subject LIKE 'GOAL:%' LIMIT 1`
      );

      if (existing.length > 0) {
        results.push(`${hh.Name} already has goals`);
        continue;
      }

      for (const goal of goalSet) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + goal.daysOut);

        await create(ctx, "Task", {
          Subject: goal.subject,
          WhatId: hh.Id,
          Status: goal.status,
          Priority: goal.priority,
          ActivityDate: dueDate.toISOString().split("T")[0],
          Description: `Planning goal created by Min demo seed at ${new Date().toISOString()}`,
        });
      }
      results.push(`Seeded ${goalSet.length} goals for ${hh.Name}`);
    }

    return NextResponse.json({
      success: true,
      message: `Seeded ${households.length} households with advisor assignments and planning goals`,
      details: results,
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : "Seed failed",
    }, { status: 500 });
  }
}
