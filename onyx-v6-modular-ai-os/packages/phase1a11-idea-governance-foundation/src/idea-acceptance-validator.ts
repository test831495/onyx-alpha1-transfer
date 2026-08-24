/**
 * Deterministic acceptance registry validator for Wave B3 Idea governance.
 */

import {
  IDEA_ACCEPTANCE_REGISTRY,
  getAllAcceptanceIds,
  getAcceptanceIdsByCategory,
} from "./idea-acceptance.js";
import type { IdeaAcceptanceEntry } from "./idea-model.js";

export type AcceptanceStatus = IdeaAcceptanceEntry["implementationStatus"];

export const APPROVED_ACCEPTANCE_STATUSES: readonly AcceptanceStatus[] = [
  "CONTRACT_DEFINED",
  "POLICY_VALIDATED",
  "DETERMINISTICALLY_TESTED",
  "RUNTIME_DEFERRED",
  "UI_DEFERRED",
  "NOT_IMPLEMENTED",
] as const;

export const IDEA_ACCEPTANCE_TEST_MANIFEST: Readonly<Record<string, readonly string[]>> = {
  "idea-governance.test.ts": [
    "natural_language_intake",
    "technical_fields_optional",
    "extracted_requirements_unconfirmed",
    "one_clarification_at_time",
    "result_field_ordering",
    "disposition_friendly_titles",
    "reject_explains_why",
    "implement_with_controls_lists_safeguards",
    "defer_has_phase_or_trigger",
    "technical_details_hidden_by_default",
    "prompt_injection_denied",
    "family_profiles_cannot_change_roadmap",
    "only_rahul_approves_architecture",
  ],
  "idea-preflight.test.ts": [
    "old_assessments_cannot_bypass_preflight",
    "blocked_preflight_explains_changes",
    "preflight_does_not_authorize_git",
    "fresh_preflight_required",
    "preflight_binds_exact_context",
    "blocked_preflight_shows_blockers",
    "seven_preflight_outcomes",
    "preflight_creates_no_authority",
  ],
  "idea-readiness.test.ts": [
    "material_changes_invalidate_readiness",
    "readiness_expires",
    "readiness_does_not_authorize_execution",
    "readiness_short_lived",
    "stale_readiness_denies",
    "material_change_invalidates",
    "security_finding_invalidates",
    "mode_restoration_cannot_revive",
    "readiness_advisory_only",
    "scope_hash_validation",
    "invalidation_triggers",
  ],
  "idea-deletion.test.ts": [
    "deletion_removes_derived_content",
  ],
  "idea-audit.test.ts": [
    "audit_failure_blocks_protected_decisions",
  ],
  "idea-lifecycle.test.ts": [
    "friendly_lifecycle_labels",
    "twenty_lifecycle_states",
    "unknown_state_denies",
    "allowed_transitions_pass",
    "invalid_transitions_deny",
    "terminal_states_protected",
    "protected_states_controlled",
    "state_has_friendly_label",
    "draft_to_submission_flow",
    "preflight_requirement",
  ],
  "idea-assessment.test.ts": [
    "version_binding",
  ],
  "idea-freshness.test.ts": [
    "freshness_policies",
  ],
  "idea-authorization.test.ts": [
    "owner_architecture_decision_allowed",
    "family_architecture_decision_denied",
    "guest_architecture_decision_denied",
    "service_architecture_decision_denied",
    "device_architecture_decision_denied",
    "character_architecture_decision_denied",
    "agent_architecture_decision_denied",
  ],
};

function generateExpectedIds(): readonly string[] {
  const ids: string[] = [];
  for (let i = 1; i <= 20; i++) {
    ids.push(`IDEA-${String(i).padStart(3, "0")}`);
  }
  for (let i = 1; i <= 20; i++) {
    ids.push(`IDEA-UX-${String(i).padStart(3, "0")}`);
  }
  for (let i = 1; i <= 10; i++) {
    ids.push(`IDEA-LIFE-${String(i).padStart(3, "0")}`);
  }
  for (let i = 1; i <= 15; i++) {
    ids.push(`IDEA-PRE-${String(i).padStart(3, "0")}`);
  }
  return ids;
}

function isTestingRequired(status: AcceptanceStatus): boolean {
  return status === "DETERMINISTICALLY_TESTED" || status === "POLICY_VALIDATED";
}

function isDeferredStatusPreserved(entry: IdeaAcceptanceEntry): boolean {
  if (entry.implementationStatus === "UI_DEFERRED") {
    return entry.uiStatus === "deferred";
  }
  if (entry.implementationStatus === "RUNTIME_DEFERRED") {
    return entry.runtimeStatus === "deferred";
  }
  if (entry.implementationStatus === "NOT_IMPLEMENTED") {
    return entry.uiStatus === "deferred" || entry.runtimeStatus === "deferred";
  }
  return true;
}

function createsAuthority(entry: IdeaAcceptanceEntry): boolean {
  const normalized = `${entry.title} ${entry.description}`.toLowerCase();
  return normalized.includes("grant authority") || normalized.includes("authorizes execution");
}

export interface IdeaAcceptanceValidationResult {
  readonly valid: boolean;
  readonly totalIds: number;
  readonly missingIds: readonly string[];
  readonly unexpectedIds: readonly string[];
  readonly duplicateIds: readonly string[];
  readonly invalidStatuses: readonly string[];
  readonly missingTitles: readonly string[];
  readonly missingTestMappings: readonly string[];
  readonly missingEvidenceMappings: readonly string[];
  readonly unmappedTestFiles: readonly string[];
  readonly unmappedAssertions: readonly string[];
  readonly deferredStatusMismatches: readonly string[];
  readonly authorityViolations: readonly string[];
}

export function validateIdeaAcceptanceRegistry(
  registry: Readonly<Record<string, IdeaAcceptanceEntry>> = IDEA_ACCEPTANCE_REGISTRY,
  testManifest: Readonly<Record<string, readonly string[]>> = IDEA_ACCEPTANCE_TEST_MANIFEST,
): IdeaAcceptanceValidationResult {
  const ids = Object.keys(registry);
  const expected = new Set(generateExpectedIds());
  const seen = new Set<string>();
  const duplicates: string[] = [];
  const missing: string[] = [];
  const unexpected: string[] = [];
  const invalidStatuses: string[] = [];
  const missingTitles: string[] = [];
  const missingTestMappings: string[] = [];
  const missingEvidenceMappings: string[] = [];
  const unmappedTestFiles: string[] = [];
  const unmappedAssertions: string[] = [];
  const deferredStatusMismatches: string[] = [];
  const authorityViolations: string[] = [];

  for (const id of ids) {
    if (seen.has(id)) {
      duplicates.push(id);
    }
    seen.add(id);

    const entry = registry[id];
    if (!entry) {
      missingTitles.push(id);
      missingEvidenceMappings.push(id);
      continue;
    }
    if (!expected.has(id)) {
      unexpected.push(id);
    }

    if (!APPROVED_ACCEPTANCE_STATUSES.includes(entry.implementationStatus)) {
      invalidStatuses.push(id);
    }

    if (!entry.title || !entry.title.trim()) {
      missingTitles.push(id);
    }

    if (!entry.evidenceMapping || !entry.evidenceMapping.trim()) {
      missingEvidenceMappings.push(id);
    }

    if (isTestingRequired(entry.implementationStatus)) {
      if (!entry.testMapping || !entry.testMapping.trim()) {
        missingTestMappings.push(id);
      } else {
        const [fileName, assertionId] = entry.testMapping.split("::");
        if (!fileName || !testManifest[fileName]) {
          unmappedTestFiles.push(id);
        } else if (!assertionId || !testManifest[fileName].includes(assertionId)) {
          unmappedAssertions.push(id);
        }
      }
    }

    if (!isDeferredStatusPreserved(entry)) {
      deferredStatusMismatches.push(id);
    }

    if (createsAuthority(entry)) {
      authorityViolations.push(id);
    }
  }

  for (const id of expected) {
    if (!seen.has(id)) {
      missing.push(id);
    }
  }

  return {
    valid:
      ids.length === 65 &&
      missing.length === 0 &&
      unexpected.length === 0 &&
      duplicates.length === 0 &&
      invalidStatuses.length === 0 &&
      missingTitles.length === 0 &&
      missingTestMappings.length === 0 &&
      missingEvidenceMappings.length === 0 &&
      unmappedTestFiles.length === 0 &&
      unmappedAssertions.length === 0 &&
      deferredStatusMismatches.length === 0 &&
      authorityViolations.length === 0,
    totalIds: ids.length,
    missingIds: missing,
    unexpectedIds: unexpected,
    duplicateIds: duplicates,
    invalidStatuses,
    missingTitles,
    missingTestMappings,
    missingEvidenceMappings,
    unmappedTestFiles,
    unmappedAssertions,
    deferredStatusMismatches,
    authorityViolations,
  };
}

export function summarizeAcceptanceFamilies(): {
  readonly total: number;
  readonly idea: number;
  readonly ux: number;
  readonly lifecycle: number;
  readonly preflight: number;
} {
  return {
    total: getAllAcceptanceIds().length,
    idea: getAcceptanceIdsByCategory("IDEA-").length,
    ux: getAcceptanceIdsByCategory("IDEA-UX-").length,
    lifecycle: getAcceptanceIdsByCategory("IDEA-LIFE-").length,
    preflight: getAcceptanceIdsByCategory("IDEA-PRE-").length,
  };
}
