// ─── Salesforce API Input Validation ─────────────────────────────────────────
//
// Every handler in api/salesforce/route.ts validates its input through here.
// No zod dependency — lightweight validators that throw SFValidationError.
//
// Pattern:
//   const v = validate.searchContacts(data);  // throws if invalid
//   // v is now typed — no more `any`

import { SFValidationError, isValidSalesforceId } from "./sf-client";

// ─── Helpers ────────────────────────────────────────────────────────────────

function requireString(data: Record<string, unknown>, field: string, maxLen = 500): string {
  const val = data[field];
  if (typeof val !== "string" || val.trim().length === 0) {
    throw new SFValidationError(`Missing required field: ${field}`);
  }
  if (val.length > maxLen) {
    throw new SFValidationError(`Field ${field} exceeds max length of ${maxLen}`);
  }
  return val.trim();
}

function optionalString(data: Record<string, unknown>, field: string, maxLen = 500): string | undefined {
  const val = data[field];
  if (val === undefined || val === null || val === "") return undefined;
  if (typeof val !== "string") throw new SFValidationError(`Field ${field} must be a string`);
  if (val.length > maxLen) throw new SFValidationError(`Field ${field} exceeds max length of ${maxLen}`);
  return val.trim();
}

function requireSfId(data: Record<string, unknown>, field: string): string {
  const val = data[field];
  if (!isValidSalesforceId(val)) {
    throw new SFValidationError(`Invalid Salesforce ID for ${field}`);
  }
  return val;
}

function optionalSfId(data: Record<string, unknown>, field: string): string | undefined {
  const val = data[field];
  if (val === undefined || val === null || val === "") return undefined;
  if (!isValidSalesforceId(val)) {
    throw new SFValidationError(`Invalid Salesforce ID for ${field}`);
  }
  return val;
}

function requireArray(data: Record<string, unknown>, field: string, maxLength = 100): unknown[] {
  const val = data[field];
  if (!Array.isArray(val)) throw new SFValidationError(`Missing required array: ${field}`);
  if (val.length > maxLength) throw new SFValidationError(`Array ${field} exceeds maximum of ${maxLength} items`);
  return val;
}

function optionalArray(data: Record<string, unknown>, field: string, maxLength = 100): unknown[] {
  const val = data[field];
  if (val === undefined || val === null) return [];
  if (!Array.isArray(val)) throw new SFValidationError(`Field ${field} must be an array`);
  if (val.length > maxLength) throw new SFValidationError(`Array ${field} exceeds maximum of ${maxLength} items`);
  return val;
}

function requireBoolean(data: Record<string, unknown>, field: string): boolean {
  const val = data[field];
  if (typeof val !== "boolean") throw new SFValidationError(`Missing required boolean: ${field}`);
  return val;
}

function optionalNumber(data: Record<string, unknown>, field: string, defaultVal?: number): number | undefined {
  const val = data[field];
  if (val === undefined || val === null) return defaultVal;
  if (typeof val !== "number" || !Number.isFinite(val)) throw new SFValidationError(`Field ${field} must be a number`);
  return val;
}

// ─── Validated Input Types ──────────────────────────────────────────────────

export interface SearchContactsInput { query: string }
export interface ConfirmIntentInput {
  familyName: string;
  force?: boolean;
  assignedAdvisor?: string;
  accounts: { type: string; owner: string }[];
  members: { firstName: string; lastName: string; email: string; phone: string }[];
}
export interface RecordFundingInput {
  householdId: string;
  familyName: string;
  fundingDetails: { account: string; detail: string }[];
  pteRequired: boolean;
}
export interface RecordMoneyLinkInput {
  householdId: string;
  bankName: string;
  lastFour: string;
  routingLastFour: string;
}
export interface RecordBeneficiariesInput {
  householdId: string;
  familyName: string;
  designations: { account: string; beneficiary: string }[];
}
export interface RecordCompletenessInput {
  householdId: string;
  familyName: string;
  checks: string[];
}
export interface RecordPaperworkInput {
  householdId: string;
  envelopes: { name: string; documents: string[] }[];
}
export interface RecordDocusignConfigInput {
  householdId: string;
  familyName: string;
  envelopeCount: number;
  config: { envelope: string; recipients: string }[];
}
export interface SendDocusignInput {
  householdId: string;
  primaryContactId?: string;
  envelopes: { name: string; signers: string[]; emailSubject: string }[];
}
export interface SearchHouseholdsInput { query: string; limit: number; offset: number }
export interface GetHouseholdDetailInput { householdId: string }
export interface RecordComplianceReviewInput {
  householdId: string;
  familyName: string;
  passed: boolean;
  failCount: number;
  checks: { label: string; status: string; detail: string }[];
  reviewerName?: string;
  nextReviewDate?: string;
}
export interface QueryTasksInput { limit: number; offset: number }
export interface RecordMeetingNoteInput {
  householdId: string;
  familyName: string;
  contactId?: string;
  meetingType?: string;
  meetingDate?: string;
  attendees?: string;
  duration?: string;
  notes: string;
  followUps: string[];
  followUpDays?: number;
}
export interface CompleteTaskInput { taskId: string }
export interface CreateTaskInput {
  householdId: string;
  subject: string;
  status?: string;
  priority?: string;
  dueDate?: string;
  description?: string;
}

export interface CreateFinancialAccountsInput {
  householdId: string;
  primaryContactId?: string;
  accounts: { type: string; owner: string; amount?: string }[];
}

export interface QueryFinancialAccountsInput {
  householdIds?: string[];
}

// ─── Validators ─────────────────────────────────────────────────────────────

function asRecord(data: unknown): Record<string, unknown> {
  if (data === null || data === undefined || typeof data !== "object" || Array.isArray(data)) {
    throw new SFValidationError("Request data must be an object");
  }
  return data as Record<string, unknown>;
}

export const validate = {
  searchContacts(raw: unknown): SearchContactsInput {
    const d = asRecord(raw);
    return { query: requireString(d, "query", 100) };
  },

  confirmIntent(raw: unknown): ConfirmIntentInput {
    const d = asRecord(raw);
    const accounts = requireArray(d, "accounts", 20).map(a => {
      const acc = asRecord(a);
      return { type: requireString(acc, "type"), owner: requireString(acc, "owner") };
    });
    const members = requireArray(d, "members", 50).map(m => {
      const mem = asRecord(m);
      return {
        firstName: requireString(mem, "firstName"),
        lastName: requireString(mem, "lastName"),
        email: requireString(mem, "email"),
        phone: requireString(mem, "phone"),
      };
    });
    return {
      familyName: requireString(d, "familyName"),
      force: d.force === true,
      assignedAdvisor: optionalString(d, "assignedAdvisor"),
      accounts,
      members,
    };
  },

  recordFunding(raw: unknown): RecordFundingInput {
    const d = asRecord(raw);
    const fundingDetails = requireArray(d, "fundingDetails").map(f => {
      const fd = asRecord(f);
      return { account: requireString(fd, "account"), detail: requireString(fd, "detail") };
    });
    return {
      householdId: requireSfId(d, "householdId"),
      familyName: requireString(d, "familyName"),
      fundingDetails,
      pteRequired: d.pteRequired === true,
    };
  },

  recordMoneyLink(raw: unknown): RecordMoneyLinkInput {
    const d = asRecord(raw);
    return {
      householdId: requireSfId(d, "householdId"),
      bankName: requireString(d, "bankName"),
      lastFour: requireString(d, "lastFour", 4),
      routingLastFour: requireString(d, "routingLastFour", 4),
    };
  },

  recordBeneficiaries(raw: unknown): RecordBeneficiariesInput {
    const d = asRecord(raw);
    const designations = requireArray(d, "designations").map(x => {
      const des = asRecord(x);
      return { account: requireString(des, "account"), beneficiary: requireString(des, "beneficiary") };
    });
    return { householdId: requireSfId(d, "householdId"), familyName: requireString(d, "familyName"), designations };
  },

  recordCompleteness(raw: unknown): RecordCompletenessInput {
    const d = asRecord(raw);
    const checks = requireArray(d, "checks").map(c => {
      if (typeof c !== "string") throw new SFValidationError("Each check must be a string");
      return c;
    });
    return { householdId: requireSfId(d, "householdId"), familyName: requireString(d, "familyName"), checks };
  },

  recordPaperwork(raw: unknown): RecordPaperworkInput {
    const d = asRecord(raw);
    const envelopes = requireArray(d, "envelopes", 25).map(e => {
      const env = asRecord(e);
      const docs = requireArray(env, "documents").map(doc => {
        if (typeof doc !== "string") throw new SFValidationError("Each document must be a string");
        return doc;
      });
      return { name: requireString(env, "name"), documents: docs };
    });
    return { householdId: requireSfId(d, "householdId"), envelopes };
  },

  recordDocusignConfig(raw: unknown): RecordDocusignConfigInput {
    const d = asRecord(raw);
    const config = requireArray(d, "config").map(c => {
      const cfg = asRecord(c);
      return { envelope: requireString(cfg, "envelope"), recipients: requireString(cfg, "recipients") };
    });
    return {
      householdId: requireSfId(d, "householdId"),
      familyName: requireString(d, "familyName"),
      envelopeCount: optionalNumber(d, "envelopeCount", 0) || 0,
      config,
    };
  },

  sendDocusign(raw: unknown): SendDocusignInput {
    const d = asRecord(raw);
    const envelopes = requireArray(d, "envelopes", 25).map(e => {
      const env = asRecord(e);
      const signers = requireArray(env, "signers").map(s => {
        if (typeof s !== "string") throw new SFValidationError("Each signer must be a string");
        return s;
      });
      return { name: requireString(env, "name"), signers, emailSubject: requireString(env, "emailSubject") };
    });
    return {
      householdId: requireSfId(d, "householdId"),
      primaryContactId: optionalSfId(d, "primaryContactId"),
      envelopes,
    };
  },

  searchHouseholds(raw: unknown): SearchHouseholdsInput {
    const d = asRecord(raw);
    const limit = optionalNumber(d, "limit", 10);
    const offset = optionalNumber(d, "offset", 0);
    return {
      query: requireString(d, "query", 100),
      limit: Math.min(Math.max(limit || 10, 1), 50),
      offset: Math.min(Math.max(offset || 0, 0), 2000),
    };
  },

  getHouseholdDetail(raw: unknown): GetHouseholdDetailInput {
    const d = asRecord(raw);
    return { householdId: requireSfId(d, "householdId") };
  },

  recordComplianceReview(raw: unknown): RecordComplianceReviewInput {
    const d = asRecord(raw);
    const checks = requireArray(d, "checks", 100).map(c => {
      const ch = asRecord(c);
      return {
        label: requireString(ch, "label"),
        status: requireString(ch, "status"),
        detail: requireString(ch, "detail", 1000),
      };
    });
    return {
      householdId: requireSfId(d, "householdId"),
      familyName: requireString(d, "familyName"),
      passed: requireBoolean(d, "passed"),
      failCount: optionalNumber(d, "failCount", 0) || 0,
      checks,
      reviewerName: optionalString(d, "reviewerName"),
      nextReviewDate: optionalString(d, "nextReviewDate"),
    };
  },

  queryTasks(raw: unknown): QueryTasksInput {
    const d = asRecord(raw);
    const limit = optionalNumber(d, "limit", 200);
    const offset = optionalNumber(d, "offset", 0);
    return {
      limit: Math.min(Math.max(limit || 200, 1), 500),
      offset: Math.min(Math.max(offset || 0, 0), 2000),
    };
  },

  recordMeetingNote(raw: unknown): RecordMeetingNoteInput {
    const d = asRecord(raw);
    const followUps = optionalArray(d, "followUps", 50).map(f => {
      if (typeof f !== "string") throw new SFValidationError("Each follow-up must be a string");
      return f;
    });
    return {
      householdId: requireSfId(d, "householdId"),
      familyName: requireString(d, "familyName"),
      contactId: optionalSfId(d, "contactId"),
      meetingType: optionalString(d, "meetingType"),
      meetingDate: optionalString(d, "meetingDate"),
      attendees: optionalString(d, "attendees"),
      duration: optionalString(d, "duration"),
      notes: requireString(d, "notes", 10000),
      followUps,
      followUpDays: optionalNumber(d, "followUpDays", 7),
    };
  },

  completeTask(raw: unknown): CompleteTaskInput {
    const d = asRecord(raw);
    return { taskId: requireSfId(d, "taskId") };
  },

  createTask(raw: unknown): CreateTaskInput {
    const d = asRecord(raw);
    return {
      householdId: requireSfId(d, "householdId"),
      subject: requireString(d, "subject"),
      status: optionalString(d, "status"),
      priority: optionalString(d, "priority"),
      dueDate: optionalString(d, "dueDate"),
      description: optionalString(d, "description", 5000),
    };
  },

  createFinancialAccounts(raw: unknown): CreateFinancialAccountsInput {
    const d = asRecord(raw);
    const householdId = requireSfId(d, "householdId");
    const primaryContactId = optionalSfId(d, "primaryContactId");
    const accounts = requireArray(d, "accounts").map((item, i) => {
      if (!item || typeof item !== "object") throw new SFValidationError(`accounts[${i}] must be an object`);
      const a = item as Record<string, unknown>;
      return {
        type: requireString(a, "type", 100),
        owner: requireString(a, "owner", 200),
        amount: optionalString(a, "amount", 50),
      };
    });
    if (accounts.length === 0) throw new SFValidationError("accounts array must not be empty");
    if (accounts.length > 20) throw new SFValidationError("accounts array exceeds maximum of 20");
    return { householdId, primaryContactId, accounts };
  },

  queryFinancialAccounts(raw: unknown): QueryFinancialAccountsInput {
    const d = asRecord(raw);
    const householdIds = optionalArray(d, "householdIds");
    // Validate each ID if provided
    for (let i = 0; i < householdIds.length; i++) {
      if (!isValidSalesforceId(householdIds[i])) {
        throw new SFValidationError(`householdIds[${i}] is not a valid Salesforce ID`);
      }
    }
    return { householdIds: householdIds.length > 0 ? (householdIds as string[]) : undefined };
  },
};
