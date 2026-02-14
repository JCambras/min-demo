// ─── Household Domain Handlers ───────────────────────────────────────────────
//
// All operations on households and contacts.
// Extracted from the monolith route for per-domain maintainability.

import { NextResponse } from "next/server";
import { query, create, sanitizeSOQL, createContactsBatch } from "@/lib/sf-client";
import type { SFContext } from "@/lib/sf-client";
import { validate } from "@/lib/sf-validation";
import { fireWorkflowTrigger } from "@/lib/workflows";

type Handler = (data: unknown, ctx: SFContext) => Promise<NextResponse>;

export const householdHandlers: Record<string, Handler> = {
  searchContacts: async (raw, ctx) => {
    const data = validate.searchContacts(raw);
    const q = sanitizeSOQL(data.query);
    const contacts = await query(ctx,
      `SELECT Id, FirstName, LastName, Email, Phone, Account.Name FROM Contact WHERE FirstName LIKE '%${q}%' OR LastName LIKE '%${q}%' OR Email LIKE '%${q}%' OR Account.Name LIKE '%${q}%' ORDER BY LastName ASC LIMIT 10`
    );
    return NextResponse.json({ success: true, contacts });
  },

  confirmIntent: async (raw, ctx) => {
    const data = validate.confirmIntent(raw);
    const safeName = sanitizeSOQL(data.familyName);
    const existing = await query(ctx,
      `SELECT Id, Name FROM Account WHERE Name = '${safeName} Household' AND Type = 'Household' ORDER BY CreatedDate DESC LIMIT 1`
    );
    if (existing.length > 0 && !data.force) {
      return NextResponse.json({
        success: false, isDuplicate: true,
        existingId: existing[0].Id, existingUrl: `${ctx.instanceUrl}/${existing[0].Id}`,
        error: `${data.familyName} Household already exists. Click "Create Anyway" to proceed.`,
      });
    }
    const household = await create(ctx, "Account", {
      Name: `${data.familyName} Household`,
      Type: "Household",
      Description: `Account opening initiated by Min.${data.assignedAdvisor ? `\nAssigned Advisor: ${data.assignedAdvisor}` : ""}\nAccounts planned: ${data.accounts.map(a => `${a.type} (${a.owner})`).join(", ") || "None yet"}`,
    }, { allowDuplicates: true });

    const { records: contacts } = await createContactsBatch(ctx,
      data.members.map(m => ({ firstName: m.firstName, lastName: m.lastName, email: m.email, phone: m.phone, accountId: household.id }))
    );

    // FSC Contact Relationship: if 2+ contacts, link P1 ↔ P2 as Spouse
    // Uses FSC standard object FinServ__ContactContactRelation__c if available,
    // falls back silently if org doesn't have FSC installed.
    let relationship = null;
    if (contacts.length >= 2) {
      try {
        relationship = await create(ctx, "FinServ__ContactContactRelation__c", {
          FinServ__Contact__c: contacts[0].id,
          FinServ__RelatedContact__c: contacts[1].id,
          FinServ__Role__c: "Spouse",
          FinServ__InverseRole__c: "Spouse",
          FinServ__AssociationType__c: "Household Member",
        });
      } catch {
        // FSC not installed or object not available — degrade gracefully
        // The contacts are still created and linked to the household
      }
    }

    const wf = await fireWorkflowTrigger(ctx, "household_created", household.id, `${data.familyName} Household`);
    return NextResponse.json({ success: true, household, contacts, relationship, workflows: wf });
  },

  searchHouseholds: async (raw, ctx) => {
    const data = validate.searchHouseholds(raw);
    const q = sanitizeSOQL(data.query);
    const households = await query(ctx,
      `SELECT Id, Name, Description, CreatedDate, (SELECT FirstName FROM Contacts ORDER BY CreatedDate ASC LIMIT 4) FROM Account WHERE Type = 'Household' AND Name LIKE '%${q}%' ORDER BY CreatedDate DESC LIMIT 10`
    );
    return NextResponse.json({ success: true, households });
  },

  getHouseholdDetail: async (raw, ctx) => {
    const data = validate.getHouseholdDetail(raw);
    const safeId = sanitizeSOQL(data.householdId);
    const [household, contacts, tasks] = await Promise.all([
      query(ctx, `SELECT Id, Name, Description, CreatedDate FROM Account WHERE Id = '${safeId}' LIMIT 1`),
      query(ctx, `SELECT Id, FirstName, LastName, Email, Phone, CreatedDate FROM Contact WHERE AccountId = '${safeId}' ORDER BY CreatedDate ASC`),
      query(ctx, `SELECT Id, Subject, Status, Priority, Description, CreatedDate, ActivityDate FROM Task WHERE WhatId = '${safeId}' ORDER BY CreatedDate ASC`),
    ]);
    return NextResponse.json({ success: true, household: household[0] || null, contacts, tasks, householdUrl: `${ctx.instanceUrl}/${data.householdId}` });
  },
};
