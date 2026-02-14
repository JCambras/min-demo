// ─── CRM-Agnostic Error Types ─────────────────────────────────────────────────
//
// These parallel the existing SF error types (SFValidationError, SFQueryError,
// SFMutationError) but are CRM-agnostic. They carry an HTTP status suggestion
// so the route dispatcher can map them consistently regardless of adapter.

/** Adapter doesn't support a requested feature (HTTP 501). */
export class CRMNotSupportedError extends Error {
  readonly code = "CRM_NOT_SUPPORTED" as const;
  readonly httpStatus = 501;
  constructor(provider: string, feature: string) {
    super(`${provider} does not support ${feature}`);
    this.name = "CRMNotSupportedError";
  }
}

/** Authentication / authorization failure. */
export class CRMAuthError extends Error {
  readonly code = "CRM_AUTH_FAILED" as const;
  readonly httpStatus = 401;
  constructor(message: string) {
    super(message);
    this.name = "CRMAuthError";
  }
}

/** Read operation failed. */
export class CRMQueryError extends Error {
  readonly code = "CRM_QUERY_FAILED" as const;
  readonly httpStatus = 502;
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.name = "CRMQueryError";
    this.status = status;
  }
}

/** Write operation failed. */
export class CRMMutationError extends Error {
  readonly code = "CRM_MUTATION_FAILED" as const;
  readonly httpStatus = 502;
  readonly status: number;
  readonly objectType: string;
  constructor(message: string, status: number, objectType: string) {
    super(message);
    this.name = "CRMMutationError";
    this.status = status;
    this.objectType = objectType;
  }
}
