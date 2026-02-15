// ─── Household Domain Handlers ───────────────────────────────────────────────
//
// All operations on households and contacts.
// Extracted from the monolith route for per-domain maintainability.
//
// Queries use the CRM adapter which delegates to orgQuery helpers internally.

import { NextResponse } from "next/server";
import type { CRMPort, CRMContext } from "@/lib/crm/port";
import { validate } from "@/lib/sf-validation";
import { fireWorkflowTrigger } from "@/lib/workflows";

type Handler = (data: unknown, adapter: CRMPort, ctx: CRMContext) => Promise<NextResponse>;

export const householdHandlers: Record<string, Handler> = {
  searchContacts: async (raw, adapter, ctx) => {
    const data = validate.searchContacts(raw);
    const contacts = await adapter.searchContacts(ctx, data.query);
    return NextResponse.json({ success: true, contacts });
  },

  confirmIntent: async (raw, adapter, ctx) => {
    const data = validate.confirmIntent(raw);
    const existing = await adapter.findHouseholdByName(ctx, `${data.familyName} Household`);
    if (existing && !data.force) {
      return NextResponse.json({
        success: false, isDuplicate: true,
        existingId: existing.id, existingUrl: `${ctx.instanceUrl}/${existing.id}`,
        error: `${data.familyName} Household already exists. Click "Create Anyway" to proceed.`,
      });
    }
    const descParts = [`Account opening initiated by Min.`];
    if (data.assignedAdvisor) descParts.push(`Assigned Advisor: ${data.assignedAdvisor}`);
    descParts.push(`Accounts planned: ${data.accounts.map(a => `${a.type} (${a.owner})`).join(", ") || "None yet"}`);

    const household = await adapter.createHousehold(ctx, { name: `${data.familyName} Household`, description: descParts.join("\n") });

    const { records: contacts } = await adapter.createContacts(ctx,
      data.members.map(m => ({ firstName: m.firstName, lastName: m.lastName, email: m.email, phone: m.phone, householdId: household.id }))
    );

    // FSC Contact Relationship: if 2+ contacts, link P1 ↔ P2 as Spouse
    let relationship = null;
    if (contacts.length >= 2) {
      relationship = await adapter.createContactRelationship?.(ctx, contacts[0].id, contacts[1].id, "Spouse") ?? null;
    }

    const wf = await fireWorkflowTrigger(adapter, ctx, "household_created", household.id, `${data.familyName} Household`);
    return NextResponse.json({ success: true, household, contacts, relationship, workflows: wf });
  },

  searchHouseholds: async (raw, adapter, ctx) => {
    const data = validate.searchHouseholds(raw);
    const result = await adapter.searchHouseholds(ctx, data.query, data.limit, data.offset);
    return NextResponse.json({
      success: true,
      households: result.households,
      pagination: { offset: data.offset, limit: data.limit, hasMore: result.hasMore },
    });
  },

  getHouseholdDetail: async (raw, adapter, ctx) => {
    const data = validate.getHouseholdDetail(raw);
    const result = await adapter.getHouseholdDetail(ctx, data.householdId);
    return NextResponse.json({
      success: true,
      household: result.household || null,
      contacts: result.contacts,
      tasks: result.tasks,
      householdUrl: `${ctx.instanceUrl}/${data.householdId}`,
    });
  },
};
