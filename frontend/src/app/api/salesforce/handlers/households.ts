// ─── Household Domain Handlers ───────────────────────────────────────────────
//
// All operations on households and contacts.
// Extracted from the monolith route for per-domain maintainability.
//
// Queries use orgQuery helpers which read from Schema Discovery's OrgMapping
// when available, falling back to hardcoded defaults when no discovery has run.

import { NextResponse } from "next/server";
import { query, create, sanitizeSOQL, createContactsBatch } from "@/lib/sf-client";
import type { SFContext } from "@/lib/sf-client";
import { validate } from "@/lib/sf-validation";
import { fireWorkflowTrigger } from "@/lib/workflows";
import { orgQuery } from "@/lib/org-query";

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
    const obj = orgQuery.householdObject();
    const filter = orgQuery.householdFilter();
    const filterClause = filter ? ` AND ${filter}` : "";
    const existing = await query(ctx,
      `SELECT Id, Name FROM ${obj} WHERE Name = '${safeName} Household'${filterClause} ORDER BY CreatedDate DESC LIMIT 1`
    );
    if (existing.length > 0 && !data.force) {
      return NextResponse.json({
        success: false, isDuplicate: true,
        existingId: existing[0].Id, existingUrl: `${ctx.instanceUrl}/${existing[0].Id}`,
        error: `${data.familyName} Household already exists. Click "Create Anyway" to proceed.`,
      });
    }
    const descParts = [`Account opening initiated by Min.`];
    if (data.assignedAdvisor) descParts.push(`Assigned Advisor: ${data.assignedAdvisor}`);
    descParts.push(`Accounts planned: ${data.accounts.map(a => `${a.type} (${a.owner})`).join(", ") || "None yet"}`);

    const householdFields = orgQuery.newHouseholdFields(`${data.familyName} Household`, descParts.join("\n"));
    const household = await create(ctx, obj, householdFields, { allowDuplicates: true });

    const { records: contacts } = await createContactsBatch(ctx,
      data.members.map(m => ({ firstName: m.firstName, lastName: m.lastName, email: m.email, phone: m.phone, accountId: household.id }))
    );

    // FSC Contact Relationship: if 2+ contacts, link P1 ↔ P2 as Spouse
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
        // FSC not installed — degrade gracefully
      }
    }

    const wf = await fireWorkflowTrigger(ctx, "household_created", household.id, `${data.familyName} Household`);
    return NextResponse.json({ success: true, household, contacts, relationship, workflows: wf });
  },

  searchHouseholds: async (raw, ctx) => {
    const data = validate.searchHouseholds(raw);
    const q = sanitizeSOQL(data.query);
    const fetchLimit = data.limit + 1;
    const soql = orgQuery.searchHouseholds(
      `Id, Name, Description, CreatedDate, (SELECT FirstName FROM Contacts ORDER BY CreatedDate ASC LIMIT 4)`,
      q, fetchLimit, data.offset
    );
    const allHouseholds = await query(ctx, soql);
    const hasMore = allHouseholds.length > data.limit;
    return NextResponse.json({
      success: true,
      households: hasMore ? allHouseholds.slice(0, data.limit) : allHouseholds,
      pagination: { offset: data.offset, limit: data.limit, hasMore },
    });
  },

  getHouseholdDetail: async (raw, ctx) => {
    const data = validate.getHouseholdDetail(raw);
    const safeId = sanitizeSOQL(data.householdId);
    const obj = orgQuery.householdObject();
    const contactLookup = orgQuery.contactHouseholdLookup();
    const [household, contacts, tasks] = await Promise.all([
      query(ctx, `SELECT Id, Name, Description, CreatedDate FROM ${obj} WHERE Id = '${safeId}' LIMIT 1`),
      query(ctx, `SELECT Id, FirstName, LastName, Email, Phone, CreatedDate FROM Contact WHERE ${contactLookup} = '${safeId}' ORDER BY CreatedDate ASC`),
      query(ctx, `SELECT Id, Subject, Status, Priority, Description, CreatedDate, ActivityDate FROM Task WHERE WhatId = '${safeId}' ORDER BY CreatedDate ASC`),
    ]);
    return NextResponse.json({ success: true, household: household[0] || null, contacts, tasks, householdUrl: `${ctx.instanceUrl}/${data.householdId}` });
  },
};
