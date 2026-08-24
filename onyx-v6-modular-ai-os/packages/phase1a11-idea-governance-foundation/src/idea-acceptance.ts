/**
 * Idea Governance Acceptance Registry
 *
 * Exactly 65 acceptance IDs mapping to contract definitions and tests.
 * IDEA-001 through IDEA-020 (20)
 * IDEA-UX-001 through IDEA-UX-020 (20)
 * IDEA-LIFE-001 through IDEA-LIFE-010 (10)
 * IDEA-PRE-001 through IDEA-PRE-015 (15)
 */

import type { IdeaAcceptanceEntry } from "./idea-model.js";

export const IDEA_ACCEPTANCE_REGISTRY: Record<string, IdeaAcceptanceEntry> = {
  // IDEA-001 through IDEA-020: Core Idea Governance
  "IDEA-001": {
    acceptanceId: "IDEA-001",
    title: "Natural Language Input Sufficient",
    description: "Single large natural-language input field is sufficient for idea intake",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-governance.test.ts::natural_language_intake",
    evidenceMapping: "idea-model.ts::IdeaRecord",
  },
  "IDEA-002": {
    acceptanceId: "IDEA-002",
    title: "Technical Fields Optional",
    description: "All technical questionnaire fields are optional",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-governance.test.ts::technical_fields_optional",
    evidenceMapping: "idea-model.ts::IdeaDraft",
  },
  "IDEA-003": {
    acceptanceId: "IDEA-003",
    title: "Extracted Requirements Unconfirmed",
    description: "Extracted requirements remain unconfirmed interpretations",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-governance.test.ts::extracted_requirements_unconfirmed",
    evidenceMapping: "idea-model.ts::ExtractedRequirement",
  },
  "IDEA-004": {
    acceptanceId: "IDEA-004",
    title: "One Clarification at a Time",
    description: "Only one focused clarification appears at a time",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-governance.test.ts::one_clarification_at_time",
    evidenceMapping: "idea-assessment.ts",
  },
  "IDEA-005": {
    acceptanceId: "IDEA-005",
    title: "Result Field Ordering",
    description: "Results ordered: Recommendation, Why, Benefits, Risks, Safeguards, Phase, Confidence, Next Action",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-governance.test.ts::result_field_ordering",
    evidenceMapping: "idea-dispositions.ts::IdeaDispositionDetail",
  },
  "IDEA-006": {
    acceptanceId: "IDEA-006",
    title: "Friendly Disposition Titles",
    description: "Every disposition has friendly title and explanation",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-governance.test.ts::disposition_friendly_titles",
    evidenceMapping: "idea-dispositions.ts::DISPOSITION_DETAILS",
  },
  "IDEA-007": {
    acceptanceId: "IDEA-007",
    title: "Rejected Ideas Explain Why",
    description: "Rejected disposition explains why and offers safe alternative",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-governance.test.ts::reject_explains_why",
    evidenceMapping: "idea-dispositions.ts::DISPOSITION_DETAILS[REJECT]",
  },
  "IDEA-008": {
    acceptanceId: "IDEA-008",
    title: "Controlled Implementation Lists Safeguards",
    description: "IMPLEMENT_WITH_CONTROLS disposition lists required safeguards",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-governance.test.ts::implement_with_controls_lists_safeguards",
    evidenceMapping: "idea-dispositions.ts::DISPOSITION_DETAILS[IMPLEMENT_WITH_CONTROLS]",
  },
  "IDEA-009": {
    acceptanceId: "IDEA-009",
    title: "Deferred Ideas Have Phase or Trigger",
    description: "DEFER_TO_ROADMAP includes target phase or reassessment trigger",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-governance.test.ts::defer_has_phase_or_trigger",
    evidenceMapping: "idea-dispositions.ts::DISPOSITION_DETAILS[DEFER_TO_ROADMAP]",
  },
  "IDEA-010": {
    acceptanceId: "IDEA-010",
    title: "Technical Details Hidden by Default",
    description: "Technical details remain hidden unless Technical Information explicitly enabled",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-governance.test.ts::technical_details_hidden_by_default",
    evidenceMapping: "idea-labels.ts::IDEA_GOVERNANCE_LABELS",
    runtimeStatus: "deferred",
  },
  "IDEA-011": {
    acceptanceId: "IDEA-011",
    title: "Prompt Injection Cannot Change Policy",
    description: "Prompt injection in idea text cannot alter policy, authority, or rules",
    implementationStatus: "POLICY_VALIDATED",
    testMapping: "idea-governance.test.ts::prompt_injection_denied",
    evidenceMapping: "idea-model.ts::IdeaRecord (immutable policies)",
  },
  "IDEA-012": {
    acceptanceId: "IDEA-012",
    title: "Family Profiles Cannot Change Roadmap",
    description: "Family profiles and agents cannot approve architecture or change roadmap",
    implementationStatus: "POLICY_VALIDATED",
    testMapping: "idea-governance.test.ts::family_profiles_cannot_change_roadmap",
    evidenceMapping: "idea-model.ts::IdeaOwner (account-bound)",
  },
  "IDEA-013": {
    acceptanceId: "IDEA-013",
    title: "Only Rahul Approves Architecture",
    description: "Only Rahul can approve architecture-impacting decisions",
    implementationStatus: "POLICY_VALIDATED",
    testMapping: "idea-governance.test.ts::only_rahul_approves_architecture",
    evidenceMapping: "idea-model.ts::IdeaOwner (requires canonical account)",
  },
  "IDEA-014": {
    acceptanceId: "IDEA-014",
    title: "Old Assessments Cannot Bypass Preflight",
    description: "Previous assessments cannot bypass fresh implementation preflight",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-preflight.test.ts::old_assessments_cannot_bypass_preflight",
    evidenceMapping: "idea-preflight.ts::determinePreflight Result",
  },
  "IDEA-015": {
    acceptanceId: "IDEA-015",
    title: "Material Changes Invalidate Readiness",
    description: "Material changes invalidate prior readiness and trigger reassessment",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-readiness.test.ts::material_changes_invalidate_readiness",
    evidenceMapping: "idea-versioning.ts::MaterialChange",
  },
  "IDEA-016": {
    acceptanceId: "IDEA-016",
    title: "Readiness Expires",
    description: "Readiness records expire after configurable windows",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-readiness.test.ts::readiness_expires",
    evidenceMapping: "idea-freshness.ts::determineReadinessExpiration",
  },
  "IDEA-017": {
    acceptanceId: "IDEA-017",
    title: "Blocked Preflight Explains Changes",
    description: "Blocked preflight explains what changed and why it's unsafe",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-preflight.test.ts::blocked_preflight_explains_changes",
    evidenceMapping: "idea-preflight.ts::createBlockerExplanation",
  },
  "IDEA-018": {
    acceptanceId: "IDEA-018",
    title: "Preflight Does Not Authorize Git",
    description: "Preflight does not authorize Git operations or deployment",
    implementationStatus: "POLICY_VALIDATED",
    testMapping: "idea-preflight.test.ts::preflight_does_not_authorize_git",
    evidenceMapping: "idea-preflight.ts::preflightNeverAuthorizes",
  },
  "IDEA-019": {
    acceptanceId: "IDEA-019",
    title: "Deletion Removes Derived Content",
    description: "Permanent deletion removes governed content and derived indexes",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-deletion.test.ts::deletion_removes_derived_content",
    evidenceMapping: "idea-deletion.ts::getPermanentDeletionSteps",
  },
  "IDEA-020": {
    acceptanceId: "IDEA-020",
    title: "Audit Failure Blocks Protected Decisions",
    description: "Audit system unavailability blocks high-risk decisions and readiness",
    implementationStatus: "POLICY_VALIDATED",
    testMapping: "idea-audit.test.ts::audit_failure_blocks_protected_decisions",
    evidenceMapping: "idea-audit.ts::auditAvailabilityRequired",
  },

  // IDEA-UX-001 through IDEA-UX-020: User Experience
  "IDEA-UX-001": {
    acceptanceId: "IDEA-UX-001",
    title: "Default Experience - Large Input",
    description: "Default experience has one large natural-language input field",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-model.ts::IdeaDraft",
    uiStatus: "deferred",
  },
  "IDEA-UX-002": {
    acceptanceId: "IDEA-UX-002",
    title: "Default Experience - Optional Attachments",
    description: "Optional attachment support in default experience",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-model.ts::IdeaAttachmentReference",
    uiStatus: "deferred",
  },
  "IDEA-UX-003": {
    acceptanceId: "IDEA-UX-003",
    title: "Default Experience - Optional Voice Notes",
    description: "Optional voice note support in default experience",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-model.ts::IdeaVoiceNoteReference",
    uiStatus: "deferred",
  },
  "IDEA-UX-004": {
    acceptanceId: "IDEA-UX-004",
    title: "Default Experience - Save Draft Button",
    description: "Save Draft button available in default experience",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-model.ts::IdeaDraft",
    uiStatus: "deferred",
  },
  "IDEA-UX-005": {
    acceptanceId: "IDEA-UX-005",
    title: "Default Experience - Review Button",
    description: "Review My Idea button in default experience",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-model.ts::IdeaSubmission",
    uiStatus: "deferred",
  },
  "IDEA-UX-006": {
    acceptanceId: "IDEA-UX-006",
    title: "Default Experience - No Mandatory Technical",
    description: "No mandatory technical questionnaire in default experience",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-model.ts::IdeaDraft",
    uiStatus: "deferred",
  },
  "IDEA-UX-007": {
    acceptanceId: "IDEA-UX-007",
    title: "Default Experience - Progressive Disclosure",
    description: "Progressive disclosure of optional fields in default experience",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-model.ts::ExtractedRequirement",
    uiStatus: "deferred",
  },
  "IDEA-UX-008": {
    acceptanceId: "IDEA-UX-008",
    title: "Technical Information Gating",
    description: "Technical Information behind explicit user action",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-labels.ts::getModeLabel",
    uiStatus: "deferred",
  },
  "IDEA-UX-009": {
    acceptanceId: "IDEA-UX-009",
    title: "Friendly Presentation - Disposition",
    description: "Friendly presentation of disposition results",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-dispositions.ts::DISPOSITION_DETAILS",
    uiStatus: "deferred",
  },
  "IDEA-UX-010": {
    acceptanceId: "IDEA-UX-010",
    title: "Friendly Presentation - Lifecycle",
    description: "Friendly labels for all lifecycle states",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-lifecycle.test.ts::friendly_lifecycle_labels",
    evidenceMapping: "idea-lifecycle.ts::LIFECYCLE_LABELS",
  },
  "IDEA-UX-011": {
    acceptanceId: "IDEA-UX-011",
    title: "Result Recommendation First",
    description: "Review results begin with friendly recommendation",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-dispositions.ts::IdeaDispositionDetail",
    uiStatus: "deferred",
  },
  "IDEA-UX-012": {
    acceptanceId: "IDEA-UX-012",
    title: "Clear Status Communication",
    description: "Every status explains what happened and what happens next",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-lifecycle.ts::LIFECYCLE_LABELS",
    uiStatus: "deferred",
  },
  "IDEA-UX-013": {
    acceptanceId: "IDEA-UX-013",
    title: "Error Explains Impact and Recovery",
    description: "Every error explains impact, work preservation, and safe recovery",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-preflight.ts::createBlockerExplanation",
    uiStatus: "deferred",
  },
  "IDEA-UX-014": {
    acceptanceId: "IDEA-UX-014",
    title: "Default Friendly Language",
    description: "Default screens use clear, friendly, user-readable language",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-labels.ts::IDEA_GOVERNANCE_LABELS",
    uiStatus: "deferred",
  },
  "IDEA-UX-015": {
    acceptanceId: "IDEA-UX-015",
    title: "Hide Raw Identifiers by Default",
    description: "Raw engineering identifiers remain hidden by default",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-labels.ts::getLifecycleLabel",
    uiStatus: "deferred",
  },
  "IDEA-UX-016": {
    acceptanceId: "IDEA-UX-016",
    title: "Technical Information User Action",
    description: "Technical Information visible only on explicit user action",
    implementationStatus: "CONTRACT_DEFINED",
    evidenceMapping: "idea-labels.ts::getModeLabel",
    uiStatus: "deferred",
  },
  "IDEA-UX-017": {
    acceptanceId: "IDEA-UX-017",
    title: "No Idea Review Center UI",
    description: "Visual Idea Review Center is not implemented",
    implementationStatus: "NOT_IMPLEMENTED",
    evidenceMapping: "phase1a11-wave-b3-idea-acceptance-registry.md::UI_DEFERRED",
    runtimeStatus: "deferred",
  },
  "IDEA-UX-018": {
    acceptanceId: "IDEA-UX-018",
    title: "No Attachment Processing",
    description: "Attachment/voice processing runtime not implemented",
    implementationStatus: "NOT_IMPLEMENTED",
    evidenceMapping: "phase1a11-wave-b3-idea-acceptance-registry.md::RUNTIME_DEFERRED",
    runtimeStatus: "deferred",
  },
  "IDEA-UX-019": {
    acceptanceId: "IDEA-UX-019",
    title: "No Autonomous Product Manager",
    description: "Autonomous Product Manager not implemented",
    implementationStatus: "NOT_IMPLEMENTED",
    evidenceMapping: "phase1a11-wave-b3-idea-acceptance-registry.md::RUNTIME_DEFERRED",
    runtimeStatus: "deferred",
  },
  "IDEA-UX-020": {
    acceptanceId: "IDEA-UX-020",
    title: "No Specialist Agents",
    description: "Specialist agent runtime not implemented",
    implementationStatus: "NOT_IMPLEMENTED",
    evidenceMapping: "phase1a11-wave-b3-idea-acceptance-registry.md::RUNTIME_DEFERRED",
    runtimeStatus: "deferred",
  },

  // IDEA-LIFE-001 through IDEA-LIFE-010: Lifecycle
  "IDEA-LIFE-001": {
    acceptanceId: "IDEA-LIFE-001",
    title: "Twenty Lifecycle States",
    description: "All 20 lifecycle states defined with allowed transitions",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-lifecycle.test.ts::twenty_lifecycle_states",
    evidenceMapping: "idea-model.ts::IdeaLifecycleState",
  },
  "IDEA-LIFE-002": {
    acceptanceId: "IDEA-LIFE-002",
    title: "Unknown State Denies",
    description: "Unknown lifecycle state denies transitions",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-lifecycle.test.ts::unknown_state_denies",
    evidenceMapping: "idea-lifecycle.ts::isTransitionAllowed",
  },
  "IDEA-LIFE-003": {
    acceptanceId: "IDEA-LIFE-003",
    title: "Allowed Transitions Pass",
    description: "Allowed transitions between states pass",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-lifecycle.test.ts::allowed_transitions_pass",
    evidenceMapping: "idea-lifecycle.ts::ALLOWED_TRANSITIONS",
  },
  "IDEA-LIFE-004": {
    acceptanceId: "IDEA-LIFE-004",
    title: "Invalid Transitions Deny",
    description: "Invalid transitions are denied",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-lifecycle.test.ts::invalid_transitions_deny",
    evidenceMapping: "idea-lifecycle.ts::isTransitionAllowed",
  },
  "IDEA-LIFE-005": {
    acceptanceId: "IDEA-LIFE-005",
    title: "Readiness Does Not Authorize Execution",
    description: "Lifecycle states never grant execution permission",
    implementationStatus: "POLICY_VALIDATED",
    testMapping: "idea-readiness.test.ts::readiness_does_not_authorize_execution",
    evidenceMapping: "idea-readiness.ts::createReadinessAuthorizationStatement",
  },
  "IDEA-LIFE-006": {
    acceptanceId: "IDEA-LIFE-006",
    title: "Terminal States Protected",
    description: "Terminal states cannot transition back to active implementation",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-lifecycle.test.ts::terminal_states_protected",
    evidenceMapping: "idea-lifecycle.ts::isTerminalState",
  },
  "IDEA-LIFE-007": {
    acceptanceId: "IDEA-LIFE-007",
    title: "Protected States Controlled",
    description: "Protected states prevent transition to active implementation",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-lifecycle.test.ts::protected_states_controlled",
    evidenceMapping: "idea-lifecycle.ts::isProtectedState",
  },
  "IDEA-LIFE-008": {
    acceptanceId: "IDEA-LIFE-008",
    title: "State Has Friendly Label",
    description: "Every state has friendly name and explanation",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-lifecycle.test.ts::state_has_friendly_label",
    evidenceMapping: "idea-lifecycle.ts::LIFECYCLE_LABELS",
  },
  "IDEA-LIFE-009": {
    acceptanceId: "IDEA-LIFE-009",
    title: "Draft to Submission Flow",
    description: "Idea can flow from DRAFT through READY_FOR_REVIEW to reviewed states",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-lifecycle.test.ts::draft_to_submission_flow",
    evidenceMapping: "idea-lifecycle.ts::ALLOWED_TRANSITIONS",
  },
  "IDEA-LIFE-010": {
    acceptanceId: "IDEA-LIFE-010",
    title: "Implementation Preflight Requirement",
    description: "Safe states must complete IMPLEMENTATION_PREFLIGHT_REQUIRED before ready",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-lifecycle.test.ts::preflight_requirement",
    evidenceMapping: "idea-lifecycle.ts::ALLOWED_TRANSITIONS",
  },

  // IDEA-PRE-001 through IDEA-PRE-015: Preflight and Readiness
  "IDEA-PRE-001": {
    acceptanceId: "IDEA-PRE-001",
    title: "Fresh Preflight Required",
    description: "Every implementation request requires fresh preflight validation",
    implementationStatus: "POLICY_VALIDATED",
    testMapping: "idea-preflight.test.ts::fresh_preflight_required",
    evidenceMapping: "idea-preflight.ts",
  },
  "IDEA-PRE-002": {
    acceptanceId: "IDEA-PRE-002",
    title: "Preflight Binds Exact Context",
    description: "Preflight binds exact idea version, commit, branch, phase, dependencies",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-preflight.test.ts::preflight_binds_exact_context",
    evidenceMapping: "idea-model.ts::IdeaPreflightRequest",
  },
  "IDEA-PRE-003": {
    acceptanceId: "IDEA-PRE-003",
    title: "Blocked Preflight Shows Blocker",
    description: "Blocked preflight explains every material blocker",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-preflight.test.ts::blocked_preflight_shows_blockers",
    evidenceMapping: "idea-preflight.ts::createBlockerExplanation",
  },
  "IDEA-PRE-004": {
    acceptanceId: "IDEA-PRE-004",
    title: "Seven Preflight Outcomes",
    description: "Seven distinct friendly preflight outcomes defined",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-preflight.test.ts::seven_preflight_outcomes",
    evidenceMapping: "idea-preflight.ts::determinePreflight Result",
  },
  "IDEA-PRE-005": {
    acceptanceId: "IDEA-PRE-005",
    title: "Readiness Short-Lived",
    description: "Readiness records expire and are scope-bound",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-readiness.test.ts::readiness_short_lived",
    evidenceMapping: "idea-readiness.ts::getReadinessExpirationHours",
  },
  "IDEA-PRE-006": {
    acceptanceId: "IDEA-PRE-006",
    title: "Stale Readiness Denies",
    description: "Stale or invalidated readiness denies operations",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-readiness.test.ts::stale_readiness_denies",
    evidenceMapping: "idea-readiness.ts::isReadinessValid",
  },
  "IDEA-PRE-007": {
    acceptanceId: "IDEA-PRE-007",
    title: "Material Change Invalidates",
    description: "Material changes immediately invalidate readiness",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-readiness.test.ts::material_change_invalidates",
    evidenceMapping: "idea-versioning.ts::MaterialChange",
  },
  "IDEA-PRE-008": {
    acceptanceId: "IDEA-PRE-008",
    title: "Security Finding Invalidates",
    description: "Security findings invalidate readiness immediately",
    implementationStatus: "POLICY_VALIDATED",
    testMapping: "idea-readiness.test.ts::security_finding_invalidates",
    evidenceMapping: "idea-freshness.ts",
  },
  "IDEA-PRE-009": {
    acceptanceId: "IDEA-PRE-009",
    title: "Mode Restoration Cannot Revive",
    description: "Mode restoration never revives stale or invalidated readiness",
    implementationStatus: "POLICY_VALIDATED",
    testMapping: "idea-readiness.test.ts::mode_restoration_cannot_revive",
    evidenceMapping: "idea-readiness.ts::canModeRestorationReviveReadiness",
  },
  "IDEA-PRE-010": {
    acceptanceId: "IDEA-PRE-010",
    title: "Readiness Advisory Only",
    description: "Readiness is advisory and authorizes no prohibited actions",
    implementationStatus: "POLICY_VALIDATED",
    testMapping: "idea-readiness.test.ts::readiness_advisory_only",
    evidenceMapping: "idea-readiness.ts::createReadinessAuthorizationStatement",
  },
  "IDEA-PRE-011": {
    acceptanceId: "IDEA-PRE-011",
    title: "Version Binding",
    description: "Assessment and preflight bind to exact idea version",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-assessment.test.ts::version_binding",
    evidenceMapping: "idea-model.ts::IdeaAssessment",
  },
  "IDEA-PRE-012": {
    acceptanceId: "IDEA-PRE-012",
    title: "Freshness Policies",
    description: "All four freshness states with deterministic policies",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-freshness.test.ts::freshness_policies",
    evidenceMapping: "idea-freshness.ts",
  },
  "IDEA-PRE-013": {
    acceptanceId: "IDEA-PRE-013",
    title: "Scope Hash Validation",
    description: "Readiness scope hash validates scope integrity",
    implementationStatus: "DETERMINISTICALLY_TESTED",
    testMapping: "idea-readiness.test.ts::scope_hash_validation",
    evidenceMapping: "idea-readiness.ts::isReadinessScopeValid",
  },
  "IDEA-PRE-014": {
    acceptanceId: "IDEA-PRE-014",
    title: "Preflight Does Not Create Authority",
    description: "Preflight validation creates no authorization for Git, deployment, or external actions",
    implementationStatus: "POLICY_VALIDATED",
    testMapping: "idea-preflight.test.ts::preflight_creates_no_authority",
    evidenceMapping: "idea-preflight.ts::preflightNeverAuthorizes",
  },
  "IDEA-PRE-015": {
    acceptanceId: "IDEA-PRE-015",
    title: "Invalidation Triggers Defined",
    description: "All readiness invalidation triggers documented",
    implementationStatus: "CONTRACT_DEFINED",
    testMapping: "idea-readiness.test.ts::invalidation_triggers",
    evidenceMapping: "idea-readiness.ts::listReadinessInvalidationTriggers",
  },
};

export function getAcceptanceEntry(acceptanceId: string): IdeaAcceptanceEntry | null {
  return IDEA_ACCEPTANCE_REGISTRY[acceptanceId] ?? null;
}

export function getAllAcceptanceIds(): readonly string[] {
  return Object.keys(IDEA_ACCEPTANCE_REGISTRY);
}

export function getAcceptanceIdsByCategory(prefix: string): readonly string[] {
  return Object.keys(IDEA_ACCEPTANCE_REGISTRY).filter((id) => {
    // For "IDEA-", match only IDEA-001 through IDEA-020 (not IDEA-UX, IDEA-LIFE, IDEA-PRE)
    if (prefix === "IDEA-") {
      return /^IDEA-\d{3}$/.test(id);
    }
    // For other prefixes, use standard startsWith
    return id.startsWith(prefix);
  });
}

export function verifyAcceptanceRegistryCompleteness(): {
  totalCount: number;
  ideaCount: number;
  uxCount: number;
  lifecycleCount: number;
  preflightCount: number;
  allUnique: boolean;
  allDefined: boolean;
} {
  const allIds = getAllAcceptanceIds();
  const ideaIds = getAcceptanceIdsByCategory("IDEA-");
  const uxIds = getAcceptanceIdsByCategory("IDEA-UX-");
  const lifeIds = getAcceptanceIdsByCategory("IDEA-LIFE-");
  const preIds = getAcceptanceIdsByCategory("IDEA-PRE-");

  const allUnique = new Set(allIds).size === allIds.length;
  const allDefined = allIds.every((id) => IDEA_ACCEPTANCE_REGISTRY[id] !== undefined);

  return {
    totalCount: allIds.length,
    ideaCount: ideaIds.length,
    uxCount: uxIds.length,
    lifecycleCount: lifeIds.length,
    preflightCount: preIds.length,
    allUnique,
    allDefined,
  };
}
