// ─── Manual Mapping Module ──────────────────────────────────────────────────
//
// When schema discovery produces low-confidence results (< 0.70), the user
// answers 3 simple questions to correct the mapping. This module converts
// those answers into a corrected OrgMapping and extracts available choices
// from the raw bundle for the UI to present.

import type { OrgMetadataBundle, OrgMapping } from "./schema-discovery";
import { classifyOrgHeuristic } from "./schema-discovery";

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ManualMappingAnswers {
  householdObject: string;           // "Account" or custom object name
  householdFilter: "recordType" | "typePicklist" | "allAccounts" | "customObject";
  householdFilterValue: string;      // RecordType dev name or Type value
  advisorField: string;              // field API name or "OwnerId"
  aumField: string | null;           // field API name or null
}

export interface MappingChoice {
  value: string;
  label: string;
  confidence: number;
}

export interface MappingChoices {
  householdOptions: MappingChoice[];
  advisorFieldOptions: MappingChoice[];
  aumFieldOptions: MappingChoice[];
}

// ─── Build choices from bundle ──────────────────────────────────────────────
// Extracts available options from the metadata bundle for the UI to present.

export function buildMappingChoices(bundle: OrgMetadataBundle): MappingChoices {
  const householdOptions: MappingChoice[] = [];
  const advisorFieldOptions: MappingChoice[] = [];
  const aumFieldOptions: MappingChoice[] = [];

  const acct = bundle.accountDescribe;

  // ── Household options ─────────────────────────────────────────────────

  // Active RecordTypes on Account
  if (acct) {
    const rts = acct.recordTypeInfos.filter(rt => rt.active && rt.developerName !== "Master");
    for (const rt of rts) {
      const isHousehold = /household/i.test(rt.developerName);
      householdOptions.push({
        value: `recordType:${rt.developerName}`,
        label: `Account (RecordType: ${rt.name})`,
        confidence: isHousehold ? 0.95 : 0.50,
      });
    }
  }

  // Account Type picklist values
  if (acct) {
    const typeField = acct.fields.find(f => f.name === "Type");
    if (typeField) {
      for (const pv of typeField.picklistValues) {
        if (!pv.active) continue;
        const isHousehold = /household/i.test(pv.value);
        householdOptions.push({
          value: `typePicklist:${pv.value}`,
          label: `Account (Type = "${pv.value}")`,
          confidence: isHousehold ? 0.85 : 0.40,
        });
      }
    }
  }

  // Data-level Account Type values (unrestricted picklists)
  for (const tv of bundle.accountTypeValues) {
    const alreadyListed = householdOptions.some(o => o.value === `typePicklist:${tv.value}`);
    if (!alreadyListed) {
      const isHousehold = /household/i.test(tv.value);
      householdOptions.push({
        value: `typePicklist:${tv.value}`,
        label: `Account (Type = "${tv.value}" — ${tv.count} records)`,
        confidence: isHousehold ? 0.90 : 0.35,
      });
    }
  }

  // Candidate custom objects
  for (const obj of bundle.candidateCustomObjects) {
    const isHousehold = /household|hh_|family|client_group|relationship_group/i.test(obj.name);
    householdOptions.push({
      value: `customObject:${obj.name}`,
      label: `${obj.label} (${obj.name})`,
      confidence: isHousehold ? 0.65 : 0.30,
    });
  }

  // "All Accounts" fallback
  householdOptions.push({
    value: "allAccounts:",
    label: "All Accounts (no filter)",
    confidence: 0.40,
  });

  // Sort by confidence descending
  householdOptions.sort((a, b) => b.confidence - a.confidence);

  // ── Advisor field options ─────────────────────────────────────────────

  // OwnerId is always available
  advisorFieldOptions.push({
    value: "OwnerId",
    label: "Record Owner (OwnerId)",
    confidence: 0.70,
  });

  // User-reference fields on Account
  if (acct) {
    for (const f of acct.fields) {
      if (f.name === "OwnerId") continue;
      if (f.type === "reference" && f.referenceTo.includes("User")) {
        const isAdvisor = /advisor|rm|planner|rep|manager/i.test(f.label);
        advisorFieldOptions.push({
          value: f.name,
          label: `${f.label} (${f.name})`,
          confidence: isAdvisor ? 0.90 : 0.50,
        });
      }
    }
  }

  advisorFieldOptions.sort((a, b) => b.confidence - a.confidence);

  // ── AUM field options ─────────────────────────────────────────────────

  // "Not tracked" option
  aumFieldOptions.push({
    value: "__none__",
    label: "Not tracked in Salesforce",
    confidence: 0.30,
  });

  // Currency fields on Account
  if (acct) {
    for (const f of acct.fields) {
      if (f.type === "currency") {
        const isAum = /aum|asset.*under|total.*asset|total.*aum|total.*financial|book.*size|portfolio.*value/i.test(f.label);
        aumFieldOptions.push({
          value: f.name,
          label: `${f.label} (${f.name})`,
          confidence: isAum ? 0.85 : 0.40,
        });
      }
    }
  }

  aumFieldOptions.sort((a, b) => b.confidence - a.confidence);

  return { householdOptions, advisorFieldOptions, aumFieldOptions };
}

// ─── Apply manual answers to produce corrected OrgMapping ───────────────────

export function applyManualMapping(
  bundle: OrgMetadataBundle,
  answers: ManualMappingAnswers,
): OrgMapping {
  // Start with the heuristic mapping as a base — contact, financial account,
  // pipeline, compliance, automation risks are usually correct even when
  // household detection fails
  const base = classifyOrgHeuristic(bundle);

  // Override household based on user's answers
  const household = { ...base.household };

  if (answers.householdFilter === "recordType") {
    household.object = "Account";
    household.recordTypeDeveloperName = answers.householdFilterValue;
    const rt = bundle.accountDescribe?.recordTypeInfos.find(
      r => r.developerName === answers.householdFilterValue
    );
    household.recordTypeId = rt?.recordTypeId || null;
    household.filterField = null;
    household.filterValue = null;
    household.confidence = 1.0;
  } else if (answers.householdFilter === "typePicklist") {
    household.object = "Account";
    household.recordTypeDeveloperName = null;
    household.recordTypeId = null;
    household.filterField = "Type";
    household.filterValue = answers.householdFilterValue;
    household.confidence = 1.0;
  } else if (answers.householdFilter === "customObject") {
    household.object = answers.householdObject;
    household.recordTypeDeveloperName = null;
    household.recordTypeId = null;
    household.filterField = null;
    household.filterValue = null;
    household.confidence = 1.0;
  } else {
    // allAccounts
    household.object = "Account";
    household.recordTypeDeveloperName = null;
    household.recordTypeId = null;
    household.filterField = null;
    household.filterValue = null;
    household.confidence = 1.0;
  }

  // Override advisor field
  household.primaryAdvisorField = answers.advisorField;

  // Override AUM field
  const aum = { ...base.aum };
  if (answers.aumField) {
    aum.source = "account_field";
    aum.object = household.object;
    aum.field = answers.aumField;
    aum.confidence = 1.0;
  } else {
    aum.source = "not_found";
    aum.object = null;
    aum.field = null;
    aum.confidence = 1.0;
  }

  // Recalculate overall confidence with user-confirmed fields
  const confidences = [
    household.confidence,
    base.contact.confidence,
    base.financialAccount.confidence,
    aum.confidence,
  ];
  const overallConfidence = Math.round(
    (confidences.reduce((s, c) => s + c, 0) / confidences.length) * 100
  ) / 100;

  return {
    ...base,
    household,
    aum,
    confidence: overallConfidence,
    warnings: base.warnings.filter(w => !w.includes("No household pattern detected")),
  };
}
