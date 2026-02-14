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
import type { OrgMapping, OrgMetadataBundle } from "@/lib/schema-discovery";

// In-memory cache of discovery results (per org).
// In production, this would be stored in encrypted cookies or a database.
const discoveryCache = new Map<string, {
  mapping: OrgMapping;
  bundle: OrgMetadataBundle;
  cachedAt: string;
}>();

// POST: Run discovery + classification
export async function POST() {
  try {
    const ctx = await getAccessToken();

    // Run discovery
    const bundle = await discoverOrg(ctx);

    // Classify using heuristics (Phase 2 will add LLM option)
    const mapping = classifyOrgHeuristic(bundle);

    // Cache the result
    discoveryCache.set(bundle.orgId || "default", {
      mapping,
      bundle,
      cachedAt: new Date().toISOString(),
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
    const ctx = await getAccessToken();

    // Try to find cached result
    // In demo mode, use "default" key since we might not have orgId
    const cached = discoveryCache.get("default") ||
      Array.from(discoveryCache.values())[0];

    if (cached) {
      return NextResponse.json({
        success: true,
        mapping: cached.mapping,
        cachedAt: cached.cachedAt,
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
