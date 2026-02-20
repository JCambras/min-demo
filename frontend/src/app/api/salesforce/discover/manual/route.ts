// ─── Manual Mapping API ─────────────────────────────────────────────────────
//
// POST /api/salesforce/discover/manual
//   Accepts ManualMappingAnswers from the user, produces a corrected OrgMapping,
//   persists it, and returns the same shape as auto-discovery.

import { NextResponse } from "next/server";
import { getAccessToken } from "@/lib/sf-connection";
import { setOrgMapping } from "@/lib/org-query";
import { getDb, ensureSchema } from "@/lib/db";
import { classifyOrgHeuristic } from "@/lib/schema-discovery";
import { applyManualMapping } from "@/lib/manual-mapping";
import type { ManualMappingAnswers } from "@/lib/manual-mapping";
import type { OrgMetadataBundle } from "@/lib/schema-discovery";

export async function POST(request: Request) {
  try {
    await getAccessToken(); // validate connection

    const answers: ManualMappingAnswers = await request.json();

    // Validate required fields
    if (!answers.householdObject || !answers.householdFilter || !answers.advisorField) {
      return NextResponse.json(
        { success: false, error: { code: "INVALID_INPUT", message: "Missing required fields: householdObject, householdFilter, advisorField" } },
        { status: 400 }
      );
    }

    // Load the stored bundle from Turso
    await ensureSchema();
    const db = getDb();
    const row = await db.execute({
      sql: "SELECT bundle_summary_json, mapping_json, org_id FROM org_patterns ORDER BY updated_at DESC LIMIT 1",
      args: [],
    });

    if (row.rows.length === 0) {
      return NextResponse.json(
        { success: false, error: { code: "NO_DISCOVERY", message: "No discovery data found. Run discovery first." } },
        { status: 404 }
      );
    }

    const orgId = row.rows[0].org_id as string;
    const bundleSummary = JSON.parse(row.rows[0].bundle_summary_json as string);
    const existingMapping = JSON.parse(row.rows[0].mapping_json as string);

    // Reconstruct a minimal OrgMetadataBundle from the stored summary + existing mapping
    // This is sufficient for applyManualMapping which delegates most detection to the base heuristic
    const minimalBundle: OrgMetadataBundle = {
      orgId: bundleSummary.orgId || orgId,
      discoveredAt: new Date().toISOString(),
      allObjects: [],
      accountDescribe: bundleSummary.accountFields ? {
        name: "Account",
        label: "Account",
        custom: false,
        fields: bundleSummary.accountFields,
        recordTypeInfos: bundleSummary.accountRecordTypeInfos || [],
        childRelationships: [],
      } : null,
      contactDescribe: null,
      financialAccountDescribe: null,
      fscObjectsFound: [],
      personAccountsEnabled: bundleSummary.personAccountsEnabled || false,
      managedPackagesDetected: [],
      candidateCustomObjects: (bundleSummary.candidateCustomObjects || []).map((o: { name: string; label: string }) => ({
        name: o.name,
        label: o.label,
        fields: [],
        childRelationships: [],
      })),
      activeFlows: [],
      activeTriggers: [],
      activeValidationRules: [],
      recordCounts: bundleSummary.recordCounts || {
        accounts: 0,
        accountsByRecordType: {},
        contacts: 0,
        financialAccounts: 0,
        opportunities: 0,
        recentTasks: 0,
      },
      accountTypeValues: bundleSummary.accountTypeValues || [],
      accountHierarchyDetected: false,
      apiCallsMade: 0,
      durationMs: 0,
      errors: [],
    };

    // Apply manual mapping corrections
    const mapping = applyManualMapping(minimalBundle, answers);
    mapping.orgId = orgId;

    // Persist corrected mapping
    const now = new Date().toISOString();
    await db.execute({
      sql: `UPDATE org_patterns SET mapping_json = ?, updated_at = ? WHERE org_id = ?`,
      args: [JSON.stringify(mapping), now, orgId],
    });

    // Update in-memory mapping for query engine
    setOrgMapping(mapping);

    // Track manual mapping event
    db.execute({
      sql: "INSERT INTO events (org_id, event_name, properties_json) VALUES (?, ?, ?)",
      args: [orgId, "manual_mapping_applied", JSON.stringify({
        householdFilter: answers.householdFilter,
        confidence: mapping.confidence,
      })],
    }).catch(() => {}); // fire-and-forget

    // Build health report (simplified — reuse existing mapping data)
    const healthReport = {
      orgType: "Manual Override",
      householdCount: bundleSummary.recordCounts?.accounts || 0,
      contactCount: bundleSummary.recordCounts?.contacts || 0,
      financialAccountCount: bundleSummary.recordCounts?.financialAccounts || 0,
      opportunityCount: bundleSummary.recordCounts?.opportunities || 0,
      recentTaskCount: bundleSummary.recordCounts?.recentTasks || 0,
      fscInstalled: (bundleSummary.fscObjectsFound || 0) > 0,
      personAccountsEnabled: bundleSummary.personAccountsEnabled || false,
      managedPackage: existingMapping.managedPackage?.platform || null,
      customObjectsFound: (bundleSummary.candidateCustomObjects || []).map((o: { name: string }) => o.name),
      automationRiskLevel: mapping.automationRisks.riskLevel,
      taskFlowCount: mapping.automationRisks.taskFlowCount,
      validationRuleCount: mapping.automationRisks.blockingValidationRules.length,
      requiredFieldGaps: mapping.requiredFieldGaps,
      flsWarnings: mapping.flsWarnings,
      overallConfidence: mapping.confidence,
      warnings: mapping.warnings,
    };

    return NextResponse.json({ success: true, mapping, healthReport });

  } catch (error) {
    console.error("[Manual Mapping Error]", error);
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "MANUAL_MAPPING_FAILED",
          message: error instanceof Error ? error.message : "Manual mapping failed",
        },
      },
      { status: 500 }
    );
  }
}
