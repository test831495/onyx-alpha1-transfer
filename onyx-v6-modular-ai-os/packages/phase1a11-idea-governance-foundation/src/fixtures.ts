/**
 * Test Fixtures for Idea Governance Testing
 *
 * Deterministic test data for contracts, lifecycle, assessment, preflight, and readiness.
 */

import {
  createIdeaId,
  createIdeaVersion,
  createIdeaVersionId,
  createHouseholdId,
  createAccountId,
  type IdeaRecord,
  type IdeaDraft,
  type IdeaSubmission,
  type IdeaAssessment,
  type IdeaPreflightRequest,
  type IdeaPreflightResult,
  type ImplementationReadinessRecord,
  type IdeaAuditEvent,
  IdeaLifecycleState,
  IdeaDisposition,
  IdeaFreshness,
  IdeaAuditEventType,
  IdeaDeletionState,
} from "./idea-model.js";

const FIXTURE_HOUSEHOLD_ID = createHouseholdId("household_test_001");
const FIXTURE_OWNER_ID = createAccountId("account_test_owner_001");
const FIXTURE_ACTOR_ID = createAccountId("account_test_actor_001");

export const FIXTURE_IDEA_ID = createIdeaId("idea_fixture_001");
export const FIXTURE_VERSION_V1 = createIdeaVersion("1.0.0");
export const FIXTURE_VERSION_V2 = createIdeaVersion("2.0.0");
export const FIXTURE_VERSION_ID = createIdeaVersionId("version_fixture_001");

export function createFixtureDraft(): IdeaDraft {
  return {
    ideaId: FIXTURE_IDEA_ID,
    ideaVersion: FIXTURE_VERSION_V1,
    householdId: FIXTURE_HOUSEHOLD_ID,
    ownerAccountId: FIXTURE_OWNER_ID,
    friendlyTitle: "Test Idea: Improve Home Automation",
    naturalLanguageDescription: "I'd like to improve the home automation system to better handle device offline scenarios.",
    attachmentReferences: [],
    voiceNoteReferences: [],
    lifecycleState: IdeaLifecycleState.DRAFT,
    disposition: undefined,
    createdAt: new Date("2026-08-24T10:00:00Z"),
    updatedAt: new Date("2026-08-24T10:00:00Z"),
    policyVersion: "1.0",
    provenance: "test_fixture",
    auditRequired: false,
    privacyClassification: "owner_only",
    retentionClassification: "long_term",
    deletionState: IdeaDeletionState.ACTIVE,
    extractedRequirements: [
      {
        index: 0,
        text: "Improve offline device handling",
        confidence: "high",
        extractedAt: new Date("2026-08-24T10:00:00Z"),
        extractionMethod: "nlp",
      },
    ],
  };
}

export function createFixtureSubmission(): IdeaSubmission {
  return {
    ideaId: FIXTURE_IDEA_ID,
    ideaVersion: FIXTURE_VERSION_V1,
    householdId: FIXTURE_HOUSEHOLD_ID,
    ownerAccountId: FIXTURE_OWNER_ID,
    friendlyTitle: "Test Idea: Improve Home Automation",
    naturalLanguageDescription: "I'd like to improve the home automation system to better handle device offline scenarios.",
    attachmentReferences: [],
    voiceNoteReferences: [],
    lifecycleState: IdeaLifecycleState.READY_FOR_REVIEW,
    disposition: undefined,
    createdAt: new Date("2026-08-24T10:00:00Z"),
    updatedAt: new Date("2026-08-24T11:00:00Z"),
    submittedAt: new Date("2026-08-24T11:00:00Z"),
    policyVersion: "1.0",
    provenance: "test_fixture",
    auditRequired: true,
    privacyClassification: "household_only",
    retentionClassification: "long_term",
    deletionState: IdeaDeletionState.ACTIVE,
  };
}

export function createFixtureAssessment(): IdeaAssessment {
  return {
    assessmentId: "assessment_fixture_001",
    ideaId: FIXTURE_IDEA_ID,
    ideaVersion: FIXTURE_VERSION_V1,
    assessmentTime: new Date("2026-08-24T12:00:00Z"),
    assessmentMethod: "deterministic_local",
    roadmapFit: { status: "verified_fact", value: "Aligns with Phase 1A.11 home automation roadmap" },
    currentPhaseFit: { status: "verified_fact", value: "Appropriate for current wave" },
    architecture: { status: "verified_fact", value: "Compatible with plugin architecture" },
    dependencies: { status: "verified_fact", value: "Home Assistant connector available" },
    securityThreats: { status: "assumption", value: "Potential offline state injection risk" },
    householdPrivacy: { status: "verified_fact", value: "Device state is household-only data" },
    authorizationRoles: { status: "verified_fact", value: "Owner can modify device automation" },
    sessionBehavior: { status: "verified_fact", value: "No session state impacts" },
    memoryNamespaces: { status: "verified_fact", value: "Uses standard device memory namespace" },
    connectorOwnership: { status: "verified_fact", value: "Home Assistant connector is governed" },
    characterScope: { status: "verified_fact", value: "All characters see same device state" },
    councilBoundaries: { status: "verified_fact", value: "No cross-household impact" },
    approvalEngineCompat: { status: "verified_fact", value: "No approval requirements" },
    costOperatingModes: { status: "verified_fact", value: "Minimal cost impact" },
    uxAccessibility: { status: "verified_fact", value: "Improves UX for all users" },
    recoveryRollback: { status: "verified_fact", value: "Can roll back to previous settings" },
    deploymentPhase: { status: "verified_fact", value: "Can deploy immediately" },
    provenance: "test_fixture_assessment",
    confidence: "high",
    missingInformation: [],
  };
}

export function createFixturePreflightRequest(): IdeaPreflightRequest {
  return {
    preflightId: "preflight_fixture_001",
    ideaId: FIXTURE_IDEA_ID,
    ideaVersion: FIXTURE_VERSION_V1,
    requestedAt: new Date("2026-08-24T13:00:00Z"),
    requestedFor: "implementation",
    repositoryCommit: "fcf6236c139aec672c8345248f6eacee8eed3333",
    branch: "feature/phase1a11-waveb3-resource-isolation",
  };
}

export function createFixturePreflightResult(): IdeaPreflightResult {
  return {
    preflightId: "preflight_fixture_001",
    ideaId: FIXTURE_IDEA_ID,
    ideaVersion: FIXTURE_VERSION_V1,
    preflightTime: new Date("2026-08-24T13:30:00Z"),
    result: "ready_for_implementation",
    exactVersionMatches: true,
    repositoryCommitValid: true,
    branchValid: true,
    phaseWaveValid: true,
    architectureVersionsCompatible: true,
    policyVersionsCompatible: true,
    ownerRoleInvariantsHeld: true,
    privacyBoundariesIntact: true,
    sessionValidityConfirmed: true,
    memoryConnectorIsolationValid: true,
    approvalEngineRequirementsMet: true,
    dependenciesResolvable: true,
    securityFindingsAbsent: true,
    knownLimitationsAccepted: true,
    providerCapabilityValid: true,
    operatingModeBudgetsAllow: true,
    recoveryReadinessConfirmed: true,
    acceptanceExpectationsMet: true,
    blockers: [],
    safeAlternatives: [],
    confidence: "high",
  };
}

export function createFixtureReadiness(): ImplementationReadinessRecord {
  const now = new Date("2026-08-24T14:00:00Z");
  const validUntil = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

  return {
    readinessId: "readiness_fixture_001",
    ideaId: FIXTURE_IDEA_ID,
    ideaVersion: FIXTURE_VERSION_V1,
    preflightId: "preflight_fixture_001",
    recordedAt: now,
    repositoryCommit: "fcf6236c139aec672c8345248f6eacee8eed3333",
    branch: "feature/phase1a11-waveb3-resource-isolation",
    phaseWave: "1A.11-B3",
    architectureVersion: "1.0.0",
    policyVersion: "1.0",
    dependencyVersions: {
      "home-assistant": "2024.8.0",
      "@onyx/core": "1.0.0",
    },
    researchTimestamp: new Date("2026-08-24T12:00:00Z"),
    canonicalScopeHash: "abc123def456",
    safeguards: ["Offline state validation", "Rate limiting on state changes"],
    acceptanceRequirements: ["IDEA-PRE-001", "IDEA-PRE-002"],
    validUntilTime: validUntil,
    invalidationTriggers: ["material_change", "security_finding", "provider_fact_change"],
    evidenceReference: "evidence_001",
    auditRequired: true,
    clearStatement: "This record does not authorize file changes, branch creation, staging, commit, push, PR creation/modification, merge, deployment, permissions, secrets, connectors, budgets, cloud, or external actions.",
  };
}

export function createFixtureAuditEvent(eventType: IdeaAuditEventType): IdeaAuditEvent {
  return {
    eventId: `audit_fixture_${eventType}`,
    eventType,
    ideaId: FIXTURE_IDEA_ID,
    ideaVersion: FIXTURE_VERSION_V1,
    actorAccountId: FIXTURE_ACTOR_ID,
    householdId: FIXTURE_HOUSEHOLD_ID,
    eventTime: new Date("2026-08-24T14:30:00Z"),
    policyVersion: "1.0",
    result: "success",
    evidenceReference: "evidence_fixture_001",
    redactionDecision: "include_all",
    friendlySummary: `Fixture event: ${eventType}`,
  };
}

export function createFixtureBlockedPreflight(): IdeaPreflightResult {
  return {
    preflightId: "preflight_blocked_fixture",
    ideaId: FIXTURE_IDEA_ID,
    ideaVersion: FIXTURE_VERSION_V1,
    preflightTime: new Date("2026-08-24T15:00:00Z"),
    result: "previously_safe_now_blocked",
    exactVersionMatches: true,
    repositoryCommitValid: false,
    branchValid: false,
    phaseWaveValid: true,
    architectureVersionsCompatible: true,
    policyVersionsCompatible: true,
    ownerRoleInvariantsHeld: true,
    privacyBoundariesIntact: true,
    sessionValidityConfirmed: true,
    memoryConnectorIsolationValid: true,
    approvalEngineRequirementsMet: true,
    dependenciesResolvable: false,
    securityFindingsAbsent: false,
    knownLimitationsAccepted: true,
    providerCapabilityValid: true,
    operatingModeBudgetsAllow: true,
    recoveryReadinessConfirmed: true,
    acceptanceExpectationsMet: true,
    blockers: [
      "Repository commit has changed to 9999999999999999999999999999999999999999",
      "Branch has been deleted",
      "Security findings discovered",
      "Dependencies can no longer be resolved",
    ],
    whatChanged: "Repository state has changed significantly since approval",
    whyUnsafe: "Commit and dependencies no longer match approved baseline",
    safeAlternatives: ["Request fresh assessment and preflight", "Rollback to previous approved commit"],
    recommendedPhase: "After dependencies are resolved",
    actionRequired: "Resolve blockers before attempting preflight again",
    confidence: "high",
  };
}

export const FIXTURES = {
  ideaId: FIXTURE_IDEA_ID,
  versionV1: FIXTURE_VERSION_V1,
  versionV2: FIXTURE_VERSION_V2,
  versionId: FIXTURE_VERSION_ID,
  householdId: FIXTURE_HOUSEHOLD_ID,
  ownerId: FIXTURE_OWNER_ID,
  actorId: FIXTURE_ACTOR_ID,
  draft: createFixtureDraft,
  submission: createFixtureSubmission,
  assessment: createFixtureAssessment,
  preflightRequest: createFixturePreflightRequest,
  preflightResult: createFixturePreflightResult,
  readiness: createFixtureReadiness,
  auditEvent: createFixtureAuditEvent,
  blockedPreflight: createFixtureBlockedPreflight,
};
