// ─── Salesforce Client Primitives ────────────────────────────────────────────
//
// Single source of truth for all Salesforce CRUD operations.
// Every API route imports from here — no more duplicated query/create/update.
//
// Design decisions:
// 1. Functions take a context object, not 3 positional strings
// 2. Error handling distinguishes SF error shapes (array vs object)
// 3. SOQL sanitization is centralized and mandatory
// 4. Salesforce ID validation prevents injection via record IDs

const SF_API_VERSION = "v59.0";
const SF_FETCH_TIMEOUT_MS = 30_000;  // 30s timeout for all SF API calls
const SF_MAX_RETRIES = 2;            // Max retries for transient failures
const SF_RETRY_BASE_MS = 500;        // Base delay for exponential backoff

// ─── Types ──────────────────────────────────────────────────────────────────

export interface SFContext {
  accessToken: string;
  instanceUrl: string;
}

export interface SFRecord {
  id: string;
  url: string;
}

// ─── Salesforce ID Validation ───────────────────────────────────────────────
// Salesforce IDs are either 15 or 18 character alphanumeric strings.
// Validating this prevents ID-based injection in SOQL and REST paths.

const SF_ID_PATTERN = /^[a-zA-Z0-9]{15}([a-zA-Z0-9]{3})?$/;

export function isValidSalesforceId(id: unknown): id is string {
  return typeof id === "string" && SF_ID_PATTERN.test(id);
}

export function requireSalesforceId(id: unknown, label = "ID"): string {
  if (!isValidSalesforceId(id)) {
    throw new SFValidationError(`Invalid Salesforce ${label}: ${String(id).slice(0, 30)}`);
  }
  return id;
}

// ─── SOQL Sanitization ─────────────────────────────────────────────────────
// Applied to any user-provided string interpolated into SOQL.
// Escapes single quotes, strips LIKE wildcards, removes control characters.

export function sanitizeSOQL(input: unknown): string {
  if (typeof input !== "string") return "";
  return input
    .replace(/\\/g, "\\\\")     // escape backslashes first
    .replace(/'/g, "\\'")       // escape single quotes
    .replace(/[%_]/g, "")       // strip LIKE wildcards
    .replace(/[\x00-\x1f]/g, "") // strip control characters
    .slice(0, 200);              // length limit prevents abuse
}

// ─── Error Types ────────────────────────────────────────────────────────────

export class SFValidationError extends Error {
  readonly code = "VALIDATION_ERROR" as const;
  constructor(message: string) {
    super(message);
    this.name = "SFValidationError";
  }
}

export class SFQueryError extends Error {
  readonly code = "SF_QUERY_FAILED" as const;
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "SFQueryError";
    this.status = status;
  }
}

export class SFMutationError extends Error {
  readonly code = "SF_MUTATION_FAILED" as const;
  readonly status: number;
  readonly objectType: string;
  constructor(message: string, status: number, objectType: string) {
    super(message);
    this.name = "SFMutationError";
    this.status = status;
    this.objectType = objectType;
  }
}

export class SFTimeoutError extends Error {
  readonly code = "SF_TIMEOUT" as const;
  constructor(url: string, timeoutMs: number) {
    super(`Salesforce request timed out after ${timeoutMs}ms: ${url.split("?")[0]}`);
    this.name = "SFTimeoutError";
  }
}

// ─── Fetch with Timeout + Retry ─────────────────────────────────────────────
// All SF API calls go through this wrapper. Retries on transient errors
// (429 Too Many Requests, 503 Service Unavailable, network failures).

function isRetryable(status: number): boolean {
  return status === 429 || status === 503;
}

async function sfFetch(url: string, init?: RequestInit): Promise<Response> {
  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= SF_MAX_RETRIES; attempt++) {
    if (attempt > 0) {
      const delay = SF_RETRY_BASE_MS * Math.pow(2, attempt - 1); // 500ms, 1000ms
      await new Promise(r => setTimeout(r, delay));
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), SF_FETCH_TIMEOUT_MS);

    try {
      const response = await fetch(url, {
        ...init,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // Retry on transient HTTP errors (429, 503)
      if (isRetryable(response.status) && attempt < SF_MAX_RETRIES) {
        lastError = new Error(`SF returned ${response.status}`);
        continue;
      }

      return response;
    } catch (err) {
      clearTimeout(timeoutId);

      if (err instanceof DOMException && err.name === "AbortError") {
        throw new SFTimeoutError(url, SF_FETCH_TIMEOUT_MS);
      }

      // Retry network errors
      if (attempt < SF_MAX_RETRIES) {
        lastError = err instanceof Error ? err : new Error("Network error");
        continue;
      }

      throw err;
    }
  }

  // Should not reach here, but safety net
  throw lastError || new Error("SF fetch failed after retries");
}

// ─── Error Extraction ───────────────────────────────────────────────────────
// Salesforce returns errors in inconsistent shapes:
//   Query errors:  [{ message: "...", errorCode: "..." }]
//   DML errors:    [{ message: "...", statusCode: "...", fields: [...] }]
//   Auth errors:   { error: "...", error_description: "..." }

function extractSFError(result: unknown, fallback: string): string {
  if (Array.isArray(result) && result[0]?.message) return result[0].message;
  if (typeof result === "object" && result !== null) {
    const r = result as Record<string, unknown>;
    if (typeof r.message === "string") return r.message;
    if (typeof r.error_description === "string") return r.error_description;
    if (typeof r.error === "string") return r.error;
  }
  return fallback;
}

// ─── CRUD Primitives ────────────────────────────────────────────────────────

/**
 * Execute a SOQL query and return the records array.
 * The SOQL string should already have user inputs sanitized via sanitizeSOQL().
 */
export async function query(ctx: SFContext, soql: string): Promise<Record<string, unknown>[]> {
  const response = await sfFetch(
    `${ctx.instanceUrl}/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${ctx.accessToken}` } }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new SFQueryError(
      extractSFError(result, "Query failed"),
      response.status
    );
  }

  return (result.records as Record<string, unknown>[]) || [];
}

/**
 * Execute a SOQL query and return records with pagination metadata.
 * Used by handlers that need to communicate page boundaries to the client.
 */
export interface PaginatedResult {
  records: Record<string, unknown>[];
  totalSize: number;
  done: boolean;
}

export async function queryPaginated(ctx: SFContext, soql: string): Promise<PaginatedResult> {
  const response = await sfFetch(
    `${ctx.instanceUrl}/services/data/${SF_API_VERSION}/query?q=${encodeURIComponent(soql)}`,
    { headers: { Authorization: `Bearer ${ctx.accessToken}` } }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new SFQueryError(
      extractSFError(result, "Query failed"),
      response.status
    );
  }

  return {
    records: (result.records as Record<string, unknown>[]) || [],
    totalSize: result.totalSize ?? 0,
    done: result.done ?? true,
  };
}

/**
 * Create a new Salesforce record. Returns { id, url }.
 */
export async function create(
  ctx: SFContext,
  objectType: string,
  data: Record<string, unknown>,
  options?: { allowDuplicates?: boolean }
): Promise<SFRecord> {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${ctx.accessToken}`,
    "Content-Type": "application/json",
  };
  if (options?.allowDuplicates) {
    headers["Sforce-Duplicate-Rule-Header"] = "allowSave=true";
  }

  const response = await sfFetch(
    `${ctx.instanceUrl}/services/data/${SF_API_VERSION}/sobjects/${objectType}`,
    { method: "POST", headers, body: JSON.stringify(data) }
  );

  const result = await response.json();

  if (!response.ok) {
    throw new SFMutationError(
      extractSFError(result, `Failed to create ${objectType}`),
      response.status,
      objectType
    );
  }

  return {
    id: result.id as string,
    url: `${ctx.instanceUrl}/${result.id}`,
  };
}

/**
 * Update an existing Salesforce record by ID. Returns { id, url }.
 * The recordId is validated before use.
 */
export async function update(
  ctx: SFContext,
  objectType: string,
  recordId: string,
  data: Record<string, unknown>
): Promise<SFRecord> {
  requireSalesforceId(recordId, `${objectType} ID`);

  const response = await sfFetch(
    `${ctx.instanceUrl}/services/data/${SF_API_VERSION}/sobjects/${objectType}/${recordId}`,
    {
      method: "PATCH",
      headers: {
        Authorization: `Bearer ${ctx.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(data),
    }
  );

  if (!response.ok) {
    const result = await response.json();
    throw new SFMutationError(
      extractSFError(result, `Failed to update ${objectType}`),
      response.status,
      objectType
    );
  }

  return {
    id: recordId,
    url: `${ctx.instanceUrl}/${recordId}`,
  };
}

// ─── Convenience: Create a Task ─────────────────────────────────────────────
// Most handlers create tasks — this encodes the common pattern.

export interface TaskInput {
  subject: string;
  householdId: string;
  status?: "Completed" | "Not Started" | "In Progress";
  priority?: "High" | "Normal" | "Low";
  description?: string;
  contactId?: string;
  activityDate?: string;  // ISO date string (YYYY-MM-DD)
}

export async function createTask(ctx: SFContext, input: TaskInput): Promise<SFRecord> {
  requireSalesforceId(input.householdId, "household ID");
  if (input.contactId) requireSalesforceId(input.contactId, "contact ID");

  return create(ctx, "Task", {
    Subject: input.subject,
    WhatId: input.householdId,
    WhoId: input.contactId || undefined,
    Status: input.status || "Completed",
    Priority: input.priority || "Normal",
    ActivityDate: input.activityDate || undefined,
    Description: input.description || `Recorded by Min at ${new Date().toISOString()}`,
  });
}

// ─── Batch Operations ───────────────────────────────────────────────────────
//
// Salesforce Composite API: create up to 25 records in one HTTP round-trip.
// Used by handlers that create N tasks (recordPaperwork, sendDocusign, recordMeetingNote).
//
// Falls back to sequential creates if the Composite API fails (e.g., API version mismatch).

export interface BatchResult {
  records: SFRecord[];
  errors: string[];
}

/**
 * Create multiple tasks in a single Composite API call.
 * Each input is validated individually. Returns all created records + any errors.
 * Maximum 25 tasks per batch (Salesforce Composite limit).
 */
export async function createTasksBatch(ctx: SFContext, inputs: TaskInput[]): Promise<BatchResult> {
  if (inputs.length === 0) return { records: [], errors: [] };

  // Validate all inputs upfront
  for (const input of inputs) {
    requireSalesforceId(input.householdId, "household ID");
    if (input.contactId) requireSalesforceId(input.contactId, "contact ID");
  }

  // If only 1 task, skip Composite overhead
  if (inputs.length === 1) {
    try {
      const record = await createTask(ctx, inputs[0]);
      return { records: [record], errors: [] };
    } catch (err) {
      return { records: [], errors: [err instanceof Error ? err.message : "Create failed"] };
    }
  }

  // Build Composite API request (max 25 subrequests)
  const batch = inputs.slice(0, 25);
  const subrequests = batch.map((input, i) => ({
    method: "POST" as const,
    url: `/services/data/${SF_API_VERSION}/sobjects/Task`,
    referenceId: `task_${i}`,
    body: {
      Subject: input.subject,
      WhatId: input.householdId,
      WhoId: input.contactId || undefined,
      Status: input.status || "Completed",
      Priority: input.priority || "Normal",
      ActivityDate: input.activityDate || undefined,
      Description: input.description || `Recorded by Min at ${new Date().toISOString()}`,
    },
  }));

  try {
    const response = await sfFetch(
      `${ctx.instanceUrl}/services/data/${SF_API_VERSION}/composite`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${ctx.accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ allOrNone: false, compositeRequest: subrequests }),
      }
    );

    if (!response.ok) {
      // Composite API not available or auth issue — fall back to sequential
      console.warn("[sf-client] Composite API failed, falling back to sequential creates");
      return _createTasksSequential(ctx, inputs);
    }

    const result = await response.json();
    const records: SFRecord[] = [];
    const errors: string[] = [];

    for (const sub of result.compositeResponse || []) {
      if (sub.httpStatusCode >= 200 && sub.httpStatusCode < 300 && sub.body?.id) {
        records.push({ id: sub.body.id, url: `${ctx.instanceUrl}/${sub.body.id}` });
      } else {
        const errMsg = Array.isArray(sub.body) ? sub.body[0]?.message : sub.body?.message || "Create failed";
        errors.push(errMsg);
      }
    }

    return { records, errors };
  } catch {
    // Network error on Composite — fall back to sequential
    console.warn("[sf-client] Composite API network error, falling back to sequential creates");
    return _createTasksSequential(ctx, inputs);
  }
}

/**
 * Fallback: create tasks one at a time using Promise.allSettled.
 * At least parallelizes the requests even without Composite API.
 */
async function _createTasksSequential(ctx: SFContext, inputs: TaskInput[]): Promise<BatchResult> {
  const results = await Promise.allSettled(inputs.map(input => createTask(ctx, input)));
  const records: SFRecord[] = [];
  const errors: string[] = [];

  for (const r of results) {
    if (r.status === "fulfilled") records.push(r.value);
    else errors.push(r.reason?.message || "Create failed");
  }

  return { records, errors };
}

/**
 * Create multiple contacts in parallel. Used by confirmIntent after household creation.
 * Contacts don't depend on each other, only on the household ID.
 */
export async function createContactsBatch(
  ctx: SFContext,
  contacts: { firstName: string; lastName: string; email: string; phone: string; accountId: string }[]
): Promise<{ records: (SFRecord & { name: string })[]; errors: string[] }> {
  const results = await Promise.allSettled(
    contacts.map(c =>
      create(ctx, "Contact", {
        FirstName: c.firstName,
        LastName: c.lastName,
        Email: c.email,
        Phone: c.phone,
        AccountId: c.accountId,
      }, { allowDuplicates: true }).then(r => ({ ...r, name: `${c.firstName} ${c.lastName}` }))
    )
  );

  const records: (SFRecord & { name: string })[] = [];
  const errors: string[] = [];
  for (const r of results) {
    if (r.status === "fulfilled") records.push(r.value);
    else errors.push(r.reason?.message || "Contact create failed");
  }
  return { records, errors };
}
