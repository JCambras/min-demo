// ─── Schema Discovery API ───────────────────────────────────────────────────
//
// POST /api/salesforce/discover
//   Introspects the connected Salesforce org, classifies its data model,
//   and returns an OrgMapping + health report.
//
// GET /api/salesforce/discover
//   Returns the stored OrgMapping for the current connection (if any).
//
// This endpoint is READ-ONLY against the Salesforce org.
// It never creates, updates, or deletes any records.

import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/sf-connection";
import { discoverOrg, classifyOrgHeuristic } from "@/lib/schema-discovery";
import { setOrgMapping } from "@/lib/org-query";
import { getDb, ensureSchema } from "@/lib/db";
import type { OrgMetadataBundle } from "@/lib/schema-discovery";

// POST: Run discovery + classification
export async function POST() {
  try {
    const ctx = await getAccessToken();

    // Run discovery
    const bundle = await discoverOrg(ctx);

    // Classify using heuristics (Phase 2 will add LLM option)
    const mapping = classifyOrgHeuristic(bundle);

    // Persist to Turso
    await ensureSchema();
    const db = getDb();
    const orgId = bundle.orgId || "default";
    const now = new Date().toISOString();
    await db.execute({
      sql: `INSERT INTO org_patterns (org_id, mapping_json, bundle_summary_json, discovered_at, updated_at)
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(org_id) DO UPDATE SET
              mapping_json = excluded.mapping_json,
              bundle_summary_json = excluded.bundle_summary_json,
              updated_at = excluded.updated_at`,
      args: [orgId, JSON.stringify(mapping), JSON.stringify({
        orgId: bundle.orgId,
        apiCallsMade: bundle.apiCallsMade,
        durationMs: bundle.durationMs,
        recordCounts: bundle.recordCounts,
        fscObjectsFound: bundle.fscObjectsFound.length,
        personAccountsEnabled: bundle.personAccountsEnabled,
      }), now, now],
    });

    // Store mapping for query engine to consume
    setOrgMapping(mapping);

    // Build health report summary
    const healthReport = {
      orgType: detectOrgType(bundle),
      householdCount: bundle.recordCounts.accounts,
      contactCount: bundle.recordCounts.contacts,
      financialAccountCount: bundle.recordCounts.financialAccounts,
      opportunityCount: bundle.recordCounts.opportunities,
      recentTaskCount: bundle.recordCounts.recentTasks,
      fscInstalled: bundle.fscObjectsFound.length > 0,
      personAccountsEnabled: bundle.personAccountsEnabled,
      customObjectsFound: bundle.candidateCustomObjects.map(o => o.name),
      automationRiskLevel: mapping.automationRisks.riskLevel,
      taskFlowCount: mapping.automationRisks.taskFlowCount,
      validationRuleCount: mapping.automationRisks.blockingValidationRules.length,
      overallConfidence: mapping.confidence,
      apiCallsMade: bundle.apiCallsMade,
      discoveryDurationMs: bundle.durationMs,
      errors: bundle.errors,
      warnings: mapping.warnings,
    };

    // Track discovery event (server-side, direct insert)
    db.execute({
      sql: "INSERT INTO events (org_id, event_name, properties_json) VALUES (?, ?, ?)",
      args: [orgId, "discovery_completed", JSON.stringify({ orgType: healthReport.orgType, confidence: mapping.confidence })],
    }).catch(() => {}); // fire-and-forget

    return NextResponse.json({
      success: true,
      mapping,
      healthReport,
      // Include raw metadata for debugging (strip in production)
      _debug: {
        recordTypeInfos: bundle.accountDescribe?.recordTypeInfos.filter(rt => rt.active),
        fscObjects: bundle.fscObjectsFound,
        accountTypeValues: bundle.accountTypeValues,
        candidateObjects: bundle.candidateCustomObjects.map(o => ({
          name: o.name,
          label: o.label,
          fieldCount: o.fields.length,
        })),
      },
    });

  } catch (error) {
    console.error("[Schema Discovery Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DISCOVERY_FAILED",
          message: error instanceof Error ? error.message : "Schema discovery failed",
        },
      },
      { status: 500 }
    );
  }
}

// GET: Return cached mapping
export async function GET() {
  try {
    await getAccessToken(); // validate connection

    await ensureSchema();
    const db = getDb();
    const row = await db.execute({
      sql: "SELECT mapping_json, discovered_at FROM org_patterns ORDER BY updated_at DESC LIMIT 1",
      args: [],
    });

    if (row.rows.length > 0) {
      return NextResponse.json({
        success: true,
        mapping: JSON.parse(row.rows[0].mapping_json as string),
        cachedAt: row.rows[0].discovered_at,
        stale: false,
      });
    }

    return NextResponse.json({
      success: true,
      mapping: null,
      message: "No discovery has been run. POST to /api/salesforce/discover to start.",
    });

  } catch (error) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "DISCOVERY_FETCH_FAILED",
          message: error instanceof Error ? error.message : "Failed to fetch discovery results",
        },
      },
      { status: 500 }
    );
  }
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function detectOrgType(bundle: OrgMetadataBundle): string {
  if (bundle.fscObjectsFound.length > 0 && bundle.personAccountsEnabled) {
    return "FSC with Person Accounts";
  }
  if (bundle.fscObjectsFound.length > 0) {
    return "FSC (Individual Model)";
  }
  if (bundle.personAccountsEnabled) {
    return "Standard Salesforce with Person Accounts";
  }
  if (bundle.candidateCustomObjects.length > 0) {
    return "Custom/Hybrid";
  }
  return "Standard Salesforce";
}
