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
import { getAccessToken, getConnectionSource } from "@/lib/sf-connection";
import { SFValidationError, SFQueryError, SFMutationError, SFTimeoutError } from "@/lib/sf-client";
import { CRMAuthError, CRMQueryError, CRMMutationError, CRMNotSupportedError } from "@/lib/crm/errors";
import type { SFContext } from "@/lib/sf-client";
import { shouldAudit, writeAuditLog } from "@/lib/audit";
import { getCRMAdapter, getCRMContext } from "@/lib/crm/factory";
import type { CRMPort } from "@/lib/crm/port";
import type { CRMContext } from "@/lib/crm/port";

import { householdHandlers } from "./handlers/households";
import { taskHandlers } from "./handlers/tasks";
import { onboardingHandlers } from "./handlers/onboarding";
import { complianceHandlers, meetingHandlers } from "./handlers/compliance-meetings";
import { financialAccountHandlers } from "./handlers/financial-accounts";
import { ensureMappingLoaded } from "@/lib/org-query";
import type { UserRole } from "@/lib/types";

// ─── RBAC Permission Matrix ─────────────────────────────────────────────────
// Maps each action to the roles that are allowed to call it.
// Read-only actions are allowed for all authenticated roles.
// Mutations are restricted based on the UI's role → action mapping.

const VALID_ROLES = new Set<string>(["advisor", "operations", "principal"]);

const ACTION_ROLES: Record<string, UserRole[]> = {
  // Read-only — all roles
  searchContacts:         ["advisor", "operations", "principal"],
  searchHouseholds:       ["advisor", "operations", "principal"],
  getHouseholdDetail:     ["advisor", "operations", "principal"],
  queryTasks:             ["advisor", "operations", "principal"],
  queryFinancialAccounts: ["advisor", "operations", "principal"],

  // Onboarding & account opening — operations + principal
  confirmIntent:          ["operations", "principal"],
  recordFunding:          ["operations", "principal"],
  recordMoneyLink:        ["operations", "principal"],
  recordBeneficiaries:    ["operations", "principal"],
  recordCompleteness:     ["operations", "principal"],
  recordPaperwork:        ["operations", "principal"],
  recordDocusignConfig:   ["operations", "principal"],
  sendDocusign:           ["operations", "principal"],
  createFinancialAccounts:["operations", "principal"],

  // Task management — operations + principal
  completeTask:           ["operations", "principal"],
  createTask:             ["operations", "principal"],

  // Compliance — all roles
  recordComplianceReview: ["advisor", "operations", "principal"],

  // Meeting notes — advisor + principal
  recordMeetingNote:      ["advisor", "principal"],
};

// ─── Error Sanitization ──────────────────────────────────────────────────────
// Strip Salesforce instance URLs and custom field names from error messages
// sent to the client to prevent information leakage.

function sanitizeErrorMessage(msg: string): string {
  return msg
    .replace(/https?:\/\/[a-zA-Z0-9.-]+\.(salesforce|force)\.com[^\s]*/g, "[salesforce]")
    .replace(/\b\w+__[cr]\b/g, "[field]");
}

// ─── Merged Handler Map ──────────────────────────────────────────────────────
// Single lookup table assembled from domain modules.
// The client-side callSF() still POSTs to /api/salesforce with { action, data }
// — zero client changes required.

type Handler = (data: unknown, adapter: CRMPort, ctx: CRMContext) => Promise<NextResponse>;

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

    // ── RBAC: validate role has permission for this action ──
    const role = request.headers.get("x-user-role");
    const allowedRoles = ACTION_ROLES[action];
    if (allowedRoles) {
      if (!role || !VALID_ROLES.has(role)) {
        return NextResponse.json(
          { success: false, error: { code: "ROLE_REQUIRED", message: "A valid user role is required" }, requestId },
          { status: 403 }
        );
      }
      if (!allowedRoles.includes(role as UserRole)) {
        console.warn(`[authz] RBAC denied: role="${role}" action="${action}" requestId=${requestId}`);
        return NextResponse.json(
          { success: false, error: { code: "FORBIDDEN", message: "Your role does not have permission for this action" }, requestId },
          { status: 403 }
        );
      }
    }

    const adapter = getCRMAdapter();
    const crmCtx = await getCRMContext();
    const sfAuth = crmCtx.auth as SFContext;

    // Restore OrgMapping from cookie if server restarted
    await ensureMappingLoaded();

    // AuthZ: log when using env fallback (client_credentials bypasses sharing rules)
    if (await getConnectionSource() === "env") {
      console.warn(`[authz] "${action}" using client_credentials — sharing rules NOT enforced`);
    }

    const start = Date.now();
    const response = await handlers[action](data, adapter, crmCtx);
    const durationMs = Date.now() - start;

    // Audit: log every mutation action (fire-and-forget)
    if (shouldAudit(action)) {
      const resBody = await response.clone().json();
      writeAuditLog(sfAuth, action, data, resBody.success ? "success" : "error", undefined, durationMs, requestId);
    }

    // Inject requestId into response
    const resBody = await response.json();
    return NextResponse.json({ ...resBody, requestId }, { status: response.status });

  } catch (error) {
    // Attempt to get sfAuth for audit logging (may fail if auth is the error)
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
        { success: false, error: { code: error.code, message: sanitizeErrorMessage(error.message) }, requestId },
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

    if (error instanceof CRMAuthError) {
      console.error(`[CRM Auth Error] requestId=${requestId}: ${error.message}`);
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message }, requestId },
        { status: error.httpStatus }
      );
    }

    if (error instanceof CRMQueryError) {
      console.error(`[CRM Query Error] requestId=${requestId} status=${error.status}: ${error.message}`);
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message }, requestId },
        { status: error.httpStatus }
      );
    }

    if (error instanceof CRMMutationError) {
      console.error(`[CRM Mutation Error] requestId=${requestId} object=${error.objectType} status=${error.status}: ${error.message}`);
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message }, requestId },
        { status: error.httpStatus }
      );
    }

    if (error instanceof CRMNotSupportedError) {
      return NextResponse.json(
        { success: false, error: { code: error.code, message: error.message }, requestId },
        { status: error.httpStatus }
      );
    }

    console.error(`[Salesforce Error] requestId=${requestId}`, error);
    return NextResponse.json(
      { success: false, error: { code: "INTERNAL_ERROR", message: sanitizeErrorMessage(error instanceof Error ? error.message : "Failed to connect to Salesforce") }, requestId },
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
