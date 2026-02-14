// ─── Salesforce API Route ────────────────────────────────────────────────────
//
// Thin dispatcher: receives { action, data }, resolves auth, delegates to
// domain-specific handler files. No business logic lives here.
//
// Domain files:
//   handlers/households.ts   — searchContacts, confirmIntent, searchHouseholds, getHouseholdDetail
//   handlers/tasks.ts        — queryTasks, completeTask, createTask
//   handlers/onboarding.ts   — recordFunding → sendDocusign (7 handlers)
//   handlers/compliance-meetings.ts — recordComplianceReview, recordMeetingNote

import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/sf-connection";
import { SFValidationError, SFQueryError, SFMutationError, SFTimeoutError } from "@/lib/sf-client";
import type { SFContext } from "@/lib/sf-client";
import { shouldAudit, writeAuditLog } from "@/lib/audit";
import { getCRMAdapter } from "@/lib/crm/factory";

import { householdHandlers } from "./handlers/households";
import { taskHandlers } from "./handlers/tasks";
import { onboardingHandlers } from "./handlers/onboarding";
import { complianceHandlers, meetingHandlers } from "./handlers/compliance-meetings";
import { financialAccountHandlers } from "./handlers/financial-accounts";
import { ensureMappingLoaded } from "@/lib/org-query";

// ─── Merged Handler Map ──────────────────────────────────────────────────────
// Single lookup table assembled from domain modules.
// The client-side callSF() still POSTs to /api/salesforce with { action, data }
// — zero client changes required.

type Handler = (data: unknown, ctx: SFContext) => Promise<NextResponse>;

const handlers: Record<string, Handler> = {
  ...householdHandlers,
  ...taskHandlers,
  ...onboardingHandlers,
  ...complianceHandlers,
  ...meetingHandlers,
  ...financialAccountHandlers,
};

// ─── Route ───────────────────────────────────────────────────────────────────

export async function POST(request: Request) {
  let action: string | undefined;
  let data: unknown;
  const requestId = crypto.randomUUID();

  try {
    const body = await request.json();
    action = body.action;
    data = body.data;

    if (typeof action !== "string" || !handlers[action]) {
      return NextResponse.json(
        { success: false, error: { code: "UNKNOWN_ACTION", message: `Unknown action: ${action}` }, requestId },
        { status: 400 }
      );
    }

    // Adapter gate: when a non-Salesforce adapter is configured, future
    // adapters will dispatch through the CRMPort interface here.
    // For now, no non-SF adapters exist so this branch is dead code.
    const adapter = getCRMAdapter();
    if (adapter.providerId !== "salesforce") {
      return NextResponse.json(
        { success: false, error: { code: "UNSUPPORTED_PROVIDER", message: `Provider ${adapter.providerId} not yet routed` }, requestId },
        { status: 501 }
      );
    }

    const ctx = await getAccessToken();

    // Restore OrgMapping from cookie if server restarted
    await ensureMappingLoaded();

    const start = Date.now();
    const response = await handlers[action](data, ctx);
    const durationMs = Date.now() - start;

    // Audit: log every mutation action (fire-and-forget)
    if (shouldAudit(action)) {
      const resBody = await response.clone().json();
      writeAuditLog(ctx, action, data, resBody.success ? "success" : "error", undefined, durationMs, requestId);
    }

    // Inject requestId into response
    const resBody = await response.json();
    return NextResponse.json({ ...resBody, requestId }, { status: response.status });

  } catch (error) {
    // Attempt to get ctx for audit logging (may fail if auth is the error)
    let auditCtx: SFContext | null = null;
    try { auditCtx = await getAccessToken(); } catch { /* auth failed — can't audit to SF */ }

    if (error instanceof SFValidationError) {
      if (auditCtx && action && shouldAudit(action)) writeAuditLog(auditCtx, action, data, "error", error.message, undefined, requestId);
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message }, requestId },
        { status: 400 }
      );
    }

    if (error instanceof SFTimeoutError) {
      console.error(`[SF Timeout] requestId=${requestId}: ${error.message}`);
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message }, requestId },
        { status: 504 }
      );
    }

    if (error instanceof SFQueryError) {
      console.error(`[SF Query Error] requestId=${requestId} status=${error.status}: ${error.message}`);
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message }, requestId },
        { status: 502 }
      );
    }

    if (error instanceof SFMutationError) {
      console.error(`[SF Mutation Error] requestId=${requestId} object=${error.objectType} status=${error.status}: ${error.message}`);
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message }, requestId },
        { status: 502 }
      );
    }

    console.error(`[Salesforce Error] requestId=${requestId}`, error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: error instanceof Error ? error.message : "Failed to connect to Salesforce" }, requestId },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const { instanceUrl } = await getAccessToken();
    return NextResponse.json({ success: true, instanceUrl, message: "Connected to Salesforce!" });
  } catch (error) {
    console.error("[Salesforce Connection Error]", error);
    return NextResponse.json(
      { success: false, error: { code: "AUTH_FAILED", message: "Failed to connect to Salesforce" } },
      { status: 500 }
    );
  }
}
