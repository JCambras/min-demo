// ─── Schema-Aware Query Builder ─────────────────────────────────────────────
//
// Reads the cached OrgMapping from Schema Discovery and generates SOQL
// that works for THIS org's configuration. If no mapping exists, falls back
// to the hardcoded demo patterns (Type = 'Household').
//
// This is the bridge between Schema Discovery and the query engine.
// Handlers call orgQuery.householdFilter() instead of hardcoding WHERE clauses.
//
// Usage:
//   import { orgQuery } from "@/lib/org-query";
//   const filter = orgQuery.householdFilter();
//   // → "RecordType.DeveloperName = 'IndustriesHousehold'" (FSC org)
//   // → "Type = 'Household'" (standard org)
//   // → "" (fallback, all accounts)

import type { OrgMapping } from "./schema-discovery";

// ─── In-Memory Mapping Store ────────────────────────────────────────────────
// Set by the discovery endpoint after classification.
// In production: encrypted cookie or database per-tenant.

let cachedMapping: OrgMapping | null = null;

export function setOrgMapping(mapping: OrgMapping): void {
  cachedMapping = mapping;
}

export function getOrgMapping(): OrgMapping | null {
  return cachedMapping;
}

export function clearOrgMapping(): void {
  cachedMapping = null;
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
   * Build a complete SOQL query to list households.
   * Replaces hardcoded queries in handlers.
   */
  listHouseholds(fields: string, limit: number): string {
    const obj = orgQuery.householdObject();
    const filter = orgQuery.householdFilterWhere();
    return `SELECT ${fields} FROM ${obj}${filter} ORDER BY CreatedDate DESC LIMIT ${limit}`;
  },

  /**
   * Build a SOQL query to search households by name.
   */
  searchHouseholds(fields: string, nameQuery: string, limit: number): string {
    const obj = orgQuery.householdObject();
    const baseFilter = orgQuery.householdFilter();
    const nameClause = `Name LIKE '%${nameQuery}%'`;
    const where = baseFilter ? `WHERE ${baseFilter} AND ${nameClause}` : `WHERE ${nameClause}`;
    return `SELECT ${fields} FROM ${obj} ${where} ORDER BY CreatedDate DESC LIMIT ${limit}`;
  },

  /**
   * Build fields for creating a new household record.
   */
  newHouseholdFields(name: string, description: string): Record<string, unknown> {
    const fields: Record<string, unknown> = { Name: name, Description: description };
    const typeValue = orgQuery.householdTypeValue();
    if (typeValue) fields.Type = typeValue;
    // RecordType would need Id resolution — left for caller
    return fields;
  },
};
