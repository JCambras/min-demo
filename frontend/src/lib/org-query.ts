// ─── Schema-Aware Query Builder ─────────────────────────────────────────────
//
// Reads the cached OrgMapping from Schema Discovery and generates SOQL
// that works for THIS org's configuration. If no mapping exists, falls back
// to the hardcoded demo patterns (Type = 'Household').
//
// Persistence: OrgMapping is stored in an encrypted httpOnly cookie
// (min_org_mapping) so it survives server restarts. On first query after
// restart, the mapping is restored from the cookie automatically.

import type { OrgMapping } from "./schema-discovery";

// ─── In-Memory Mapping Cache ────────────────────────────────────────────────
// Hot cache for the current process. Backed by encrypted cookie.

let cachedMapping: OrgMapping | null = null;

export function setOrgMapping(mapping: OrgMapping): void {
  cachedMapping = mapping;
  // Persist to cookie (fire-and-forget, called from server context)
  persistMapping(mapping).catch(err =>
    console.error("[org-query] Failed to persist mapping:", err)
  );
}

export function getOrgMapping(): OrgMapping | null {
  return cachedMapping;
}

export function clearOrgMapping(): void {
  cachedMapping = null;
  clearPersistedMapping().catch(() => {});
}

/**
 * Restore mapping from cookie into memory. Called by handlers on first request
 * after server restart. No-op if mapping is already in memory.
 */
export async function ensureMappingLoaded(): Promise<void> {
  if (cachedMapping) return;
  try {
    const restored = await restoreMapping();
    if (restored) {
      cachedMapping = restored;
      console.log("[org-query] Restored OrgMapping from cookie (org:", restored.orgId, "confidence:", restored.confidence, ")");
    }
  } catch {
    // Cookie missing or corrupted — no mapping, use defaults
  }
}

// ─── Cookie Persistence ─────────────────────────────────────────────────────
// Uses dynamic import to avoid pulling Node crypto into client bundles.

const MAPPING_COOKIE_NAME = "min_org_mapping";

async function persistMapping(mapping: OrgMapping): Promise<void> {
  // Lazy import — only runs on server
  const { cookies } = await import("next/headers");
  const crypto = await import("crypto");

  const key = deriveKey(crypto);
  const json = JSON.stringify(mapping);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const encrypted = Buffer.concat([cipher.update(json, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  const value = `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted.toString("hex")}`;

  const cookieStore = await cookies();
  cookieStore.set(MAPPING_COOKIE_NAME, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 90 * 24 * 60 * 60, // 90 days — mapping is stable
    path: "/",
  });
}

async function restoreMapping(): Promise<OrgMapping | null> {
  const { cookies } = await import("next/headers");
  const crypto = await import("crypto");

  const cookieStore = await cookies();
  const cookie = cookieStore.get(MAPPING_COOKIE_NAME);
  if (!cookie?.value) return null;

  const [ivHex, tagHex, encHex] = cookie.value.split(":");
  const key = deriveKey(crypto);
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivHex, "hex"));
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const json = decipher.update(Buffer.from(encHex, "hex"), undefined, "utf8") + decipher.final("utf8");
  return JSON.parse(json) as OrgMapping;
}

async function clearPersistedMapping(): Promise<void> {
  try {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.delete(MAPPING_COOKIE_NAME);
  } catch { /* not in server context */ }
}

function deriveKey(crypto: typeof import("crypto")): Buffer {
  const secret = process.env.SF_COOKIE_SECRET || "min-demo-dev-key-change-in-prod!!";
  return crypto.scryptSync(secret, "min-mapping-salt", 32);
}

// ─── Default Mapping (Demo Fallback) ────────────────────────────────────────
// When no discovery has been run, use the original hardcoded assumptions.
// This ensures zero breaking changes — handlers work identically until
// discovery is run, then they upgrade automatically.

const DEMO_DEFAULTS = {
  householdObject: "Account",
  householdFilter: "Type = 'Household'",
  householdType: "Household",
  contactLookup: "AccountId",
  advisorField: "OwnerId",
};

// ─── Query Helpers ──────────────────────────────────────────────────────────

export const orgQuery = {
  /**
   * The object name for households (usually "Account", could be custom).
   */
  householdObject(): string {
    return cachedMapping?.household.object || DEMO_DEFAULTS.householdObject;
  },

  /**
   * WHERE clause fragment to filter for household records.
   * Examples:
   *   "RecordType.DeveloperName = 'IndustriesHousehold'"
   *   "Type = 'Household'"
   *   "" (empty = all records of the object)
   */
  householdFilter(): string {
    if (!cachedMapping) return DEMO_DEFAULTS.householdFilter;

    const hh = cachedMapping.household;

    // Pattern 1: RecordType-based filtering
    if (hh.recordTypeDeveloperName) {
      return `RecordType.DeveloperName = '${hh.recordTypeDeveloperName}'`;
    }

    // Pattern 2: Field-based filtering (e.g., Type = 'Household')
    if (hh.filterField && hh.filterValue) {
      return `${hh.filterField} = '${hh.filterValue}'`;
    }

    // Pattern 3: No filter (all records in the object are households)
    return "";
  },

  /**
   * Full WHERE clause with AND prefix (safe to append to existing WHERE).
   * Returns empty string if no filter needed.
   */
  householdFilterAnd(): string {
    const filter = orgQuery.householdFilter();
    return filter ? ` AND ${filter}` : "";
  },

  /**
   * Full WHERE clause with WHERE prefix (for queries that start fresh).
   * Returns empty string if no filter needed.
   */
  householdFilterWhere(): string {
    const filter = orgQuery.householdFilter();
    return filter ? ` WHERE ${filter}` : "";
  },

  /**
   * The Type value to set when CREATING a new household.
   * Returns null if the org doesn't use Type-based filtering.
   */
  householdTypeValue(): string | null {
    if (!cachedMapping) return DEMO_DEFAULTS.householdType;

    const hh = cachedMapping.household;
    if (hh.filterField === "Type" && hh.filterValue) {
      return hh.filterValue;
    }
    return null;
  },

  /**
   * The RecordTypeId to set when CREATING a new household.
   * Returns null if the org doesn't use RecordType-based filtering.
   * NOTE: This returns the DeveloperName — caller needs to resolve to Id.
   */
  householdRecordTypeDeveloperName(): string | null {
    return cachedMapping?.household.recordTypeDeveloperName || null;
  },

  /**
   * The RecordTypeId to set when CREATING a new household.
   * Returns null if the org doesn't use RecordType-based filtering.
   */
  householdRecordTypeId(): string | null {
    return cachedMapping?.household.recordTypeId || null;
  },

  /**
   * The field on Contact that points to the household.
   */
  contactHouseholdLookup(): string {
    return cachedMapping?.contact.householdLookup || DEMO_DEFAULTS.contactLookup;
  },

  /**
   * The field for advisor assignment on the household object.
   */
  advisorField(): string {
    return cachedMapping?.household.primaryAdvisorField || DEMO_DEFAULTS.advisorField;
  },

  /**
   * Whether the org has Person Accounts enabled.
   * When true, queries must also search Account WHERE IsPersonAccount = true.
   */
  personAccountsEnabled(): boolean {
    return cachedMapping?.personAccountsEnabled || false;
  },

  /**
   * Build a complete SOQL query to list households.
   * Replaces hardcoded queries in handlers.
   */
  listHouseholds(fields: string, limit: number, offset?: number): string {
    const obj = orgQuery.householdObject();
    const filter = orgQuery.householdFilterWhere();
    const offsetClause = offset ? ` OFFSET ${offset}` : "";
    return `SELECT ${fields} FROM ${obj}${filter} ORDER BY CreatedDate DESC LIMIT ${limit}${offsetClause}`;
  },

  /**
   * Build a SOQL query to search households by name.
   */
  searchHouseholds(fields: string, nameQuery: string, limit: number, offset?: number): string {
    const obj = orgQuery.householdObject();
    const baseFilter = orgQuery.householdFilter();
    const nameClause = `Name LIKE '%${nameQuery}%'`;
    const where = baseFilter ? `WHERE ${baseFilter} AND ${nameClause}` : `WHERE ${nameClause}`;
    const offsetClause = offset ? ` OFFSET ${offset}` : "";
    return `SELECT ${fields} FROM ${obj} ${where} ORDER BY CreatedDate DESC LIMIT ${limit}${offsetClause}`;
  },

  /**
   * Build fields for creating a new household record.
   */
  newHouseholdFields(name: string, description: string): Record<string, unknown> {
    const fields: Record<string, unknown> = { Name: name, Description: description };
    const typeValue = orgQuery.householdTypeValue();
    if (typeValue) fields.Type = typeValue;
    const rtId = orgQuery.householdRecordTypeId();
    if (rtId) fields.RecordTypeId = rtId;
    return fields;
  },
};
