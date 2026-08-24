/**
 * Phase 1A.11 Wave B3 Idea Governance Foundation
 *
 * Typed contracts for idea intake, lifecycle, assessment, preflight, readiness,
 * and governance. All Idea records are account-bound and support full version history.
 */

// Account and Household identity types (local definitions for self-contained package)
export type HouseholdId = string & { readonly __brand: "HouseholdId" };
export type AccountId = string & { readonly __brand: "AccountId" };

export function createHouseholdId(value: string): HouseholdId {
  return value as HouseholdId;
}

export function createAccountId(value: string): AccountId {
  return value as AccountId;
}

/** Unique identifier for an idea */
export type IdeaId = string & { readonly __brand: "IdeaId" };

export function createIdeaId(id: string): IdeaId {
  if (!id || typeof id !== "string") {
    throw new Error("IdeaId must be a non-empty string");
  }
  return id as IdeaId;
}

/** Unique version identifier for an idea */
export type IdeaVersionId = string & { readonly __brand: "IdeaVersionId" };

export function createIdeaVersionId(id: string): IdeaVersionId {
  if (!id || typeof id !== "string") {
    throw new Error("IdeaVersionId must be a non-empty string");
  }
  return id as IdeaVersionId;
}

/** Semantic version for idea modifications */
export type IdeaVersion = string & { readonly __brand: "IdeaVersion" };

export function createIdeaVersion(version: string): IdeaVersion {
  if (!version || !version.match(/^\d+\.\d+\.\d+$/)) {
    throw new Error("IdeaVersion must be in semver format (e.g., 1.0.0)");
  }
  return version as IdeaVersion;
}

/** Owning account of an idea */
export type IdeaOwner = AccountId;

/** Attachment reference (never stores raw content) */
export interface IdeaAttachmentReference {
  readonly attachmentId: string;
  readonly fileName: string;
  readonly mediaType: string;
  readonly sizeBytes: number;
  readonly uploadedAt: Date;
  readonly resourceReference: string;
}

/** Voice note reference (never stores raw content) */
export interface IdeaVoiceNoteReference {
  readonly voiceNoteId: string;
  readonly durationMs: number;
  readonly uploadedAt: Date;
  readonly resourceReference: string;
}

/** Raw extracted requirement from idea text (unconfirmed interpretation) */
export interface ExtractedRequirement {
  readonly index: number;
  readonly text: string;
  readonly confidence: "high" | "medium" | "low";
  readonly extractedAt: Date;
  readonly extractionMethod: "nlp" | "structured_input";
}

/** Idea lifecycle states */
export enum IdeaLifecycleState {
  DRAFT = "DRAFT",
  READY_FOR_REVIEW = "READY_FOR_REVIEW",
  UNDER_REVIEW = "UNDER_REVIEW",
  REVIEWED = "REVIEWED",
  NEEDS_CLARIFICATION = "NEEDS_CLARIFICATION",
  RESEARCH_REQUIRED = "RESEARCH_REQUIRED",
  SAFE_TO_IMPLEMENT = "SAFE_TO_IMPLEMENT",
  SAFE_WITH_SAFEGUARDS = "SAFE_WITH_SAFEGUARDS",
  FOUNDATION_ONLY = "FOUNDATION_ONLY",
  PLANNED_FOR_FUTURE_PHASE = "PLANNED_FOR_FUTURE_PHASE",
  PARKED = "PARKED",
  IMPLEMENTATION_PREFLIGHT_REQUIRED = "IMPLEMENTATION_PREFLIGHT_REQUIRED",
  READY_FOR_IMPLEMENTATION = "READY_FOR_IMPLEMENTATION",
  IMPLEMENTATION_IN_PROGRESS = "IMPLEMENTATION_IN_PROGRESS",
  IMPLEMENTED = "IMPLEMENTED",
  BLOCKED = "BLOCKED",
  REJECTED = "REJECTED",
  ARCHIVED = "ARCHIVED",
  DELETED = "DELETED",
  SUPERSEDED = "SUPERSEDED",
}

export interface IdeaLifecycleLabel {
  readonly state: IdeaLifecycleState;
  readonly friendlyName: string;
  readonly explanation: string;
  readonly canTransitionTo: readonly IdeaLifecycleState[];
}

/** Idea disposition after assessment */
export enum IdeaDisposition {
  IMPLEMENT_NOW = "IMPLEMENT_NOW",
  IMPLEMENT_WITH_CONTROLS = "IMPLEMENT_WITH_CONTROLS",
  PREPARE_FOUNDATION_ONLY = "PREPARE_FOUNDATION_ONLY",
  DEFER_TO_ROADMAP = "DEFER_TO_ROADMAP",
  RESEARCH_REQUIRED = "RESEARCH_REQUIRED",
  ARCHITECTURE_REVIEW_REQUIRED = "ARCHITECTURE_REVIEW_REQUIRED",
  PARK = "PARK",
  REJECT = "REJECT",
}

export interface IdeaDispositionDetail {
  readonly disposition: IdeaDisposition;
  readonly friendlyTitle: string;
  readonly explanation: string;
  readonly reasons: readonly string[];
  readonly benefits: readonly string[];
  readonly risks: readonly string[];
  readonly safeguards?: readonly string[];
  readonly recommendedPhase?: string;
  readonly confidence: "high" | "medium" | "low";
  readonly missingInformation: readonly string[];
  readonly prerequisites?: readonly string[];
  readonly safeNextAction: string;
}

/** Freshness of assessment or preflight */
export enum IdeaFreshness {
  CURRENT = "CURRENT",
  REVIEW_RECOMMENDED = "REVIEW_RECOMMENDED",
  STALE = "STALE",
  INVALIDATED = "INVALIDATED",
}

export interface IdeaFreshnessPolicy {
  readonly freshness: IdeaFreshness;
  readonly reason: string;
  readonly reviewWindowDays?: number;
  readonly invalidatedAt?: Date;
  readonly invalidationReason?: string;
}

/** Material change that invalidates prior assessments/readiness */
export interface MaterialChange {
  readonly changedAt: Date;
  readonly previousVersion: IdeaVersion;
  readonly newVersion: IdeaVersion;
  readonly changeType: "users" | "household_scope" | "data_categories" | "connectors" | "external_recipients" | "behavior" | "authority" | "biometric" | "cost_frequency" | "phase" | "environment" | "permissions" | "retention" | "disclosure" | "memory" | "session" | "approval_engine" | "mode_impact" | "recovery" | "other";
  readonly description: string;
  readonly invalidatesReadiness: boolean;
  readonly triggersReassessment: boolean;
}

/** Reassessment trigger condition */
export type ReassessmentTrigger = "material_change" | "schedule" | "phase_transition" | "architecture_change" | "policy_change" | "security_finding" | "provider_fact_change" | "cost_budget_change" | "recovery_readiness_change" | "user_request";

/** Assessment result for an idea */
export interface IdeaAssessment {
  readonly assessmentId: string;
  readonly ideaId: IdeaId;
  readonly ideaVersion: IdeaVersion;
  readonly assessmentTime: Date;
  readonly assessmentMethod: "deterministic_local";

  /** Assessment dimensions */
  readonly roadmapFit: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly currentPhaseFit: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly architecture: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly dependencies: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly securityThreats: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly householdPrivacy: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly authorizationRoles: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly sessionBehavior: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly memoryNamespaces: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly connectorOwnership: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly characterScope: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly councilBoundaries: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly approvalEngineCompat: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly costOperatingModes: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly uxAccessibility: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly recoveryRollback: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };
  readonly deploymentPhase: { status: "verified_fact" | "assumption" | "missing" | "disagreement"; value: string };

  /** Overall assessment */
  readonly provenance: string;
  readonly confidence: "high" | "medium" | "low";
  readonly missingInformation: readonly string[];
}

/** Owner decision on an idea (never automatic) */
export interface IdeaDecision {
  readonly decisionId: string;
  readonly ideaId: IdeaId;
  readonly ideaVersion: IdeaVersion;
  readonly decisionTime: Date;
  readonly decisionType: "approved" | "approved_with_controls" | "foundation_only" | "deferred" | "parked" | "rejected" | "archived";
  readonly decisionReason: string;
  readonly additionalContext?: string;
}

/** Preflight request to validate readiness for implementation */
export interface IdeaPreflightRequest {
  readonly preflightId: string;
  readonly ideaId: IdeaId;
  readonly ideaVersion: IdeaVersion;
  readonly requestedAt: Date;
  readonly requestedFor: "implementation" | "foundation_work";
  readonly repositoryCommit: string;
  readonly branch: string;
}

/** Result of preflight validation */
export interface IdeaPreflightResult {
  readonly preflightId: string;
  readonly ideaId: IdeaId;
  readonly ideaVersion: IdeaVersion;
  readonly preflightTime: Date;
  readonly result: "ready_for_implementation" | "ready_with_updated_safeguards" | "not_safe_in_current_wave" | "previously_safe_now_blocked" | "research_required" | "architecture_decision_required" | "should_not_implement";

  /** Validation results */
  readonly exactVersionMatches: boolean;
  readonly repositoryCommitValid: boolean;
  readonly branchValid: boolean;
  readonly phaseWaveValid: boolean;
  readonly architectureVersionsCompatible: boolean;
  readonly policyVersionsCompatible: boolean;
  readonly ownerRoleInvariantsHeld: boolean;
  readonly privacyBoundariesIntact: boolean;
  readonly sessionValidityConfirmed: boolean;
  readonly memoryConnectorIsolationValid: boolean;
  readonly approvalEngineRequirementsMet: boolean;
  readonly dependenciesResolvable: boolean;
  readonly securityFindingsAbsent: boolean;
  readonly knownLimitationsAccepted: boolean;
  readonly providerCapabilityValid: boolean;
  readonly operatingModeBudgetsAllow: boolean;
  readonly recoveryReadinessConfirmed: boolean;
  readonly acceptanceExpectationsMet: boolean;

  /** Blocks and recommendations */
  readonly blockers: readonly string[];
  readonly whatChanged?: string;
  readonly whyUnsafe?: string;
  readonly safeAlternatives: readonly string[];
  readonly recommendedPhase?: string;
  readonly actionRequired?: string;
  readonly confidence: "high" | "medium" | "low";
}

/** Implementation readiness record (advisory, short-lived, scope-bound) */
export interface ImplementationReadinessRecord {
  readonly readinessId: string;
  readonly ideaId: IdeaId;
  readonly ideaVersion: IdeaVersion;
  readonly preflightId: string;
  readonly recordedAt: Date;
  readonly repositoryCommit: string;
  readonly branch: string;
  readonly phaseWave: string;
  readonly architectureVersion: string;
  readonly policyVersion: string;
  readonly dependencyVersions: Record<string, string>;
  readonly researchTimestamp: Date;
  readonly canonicalScopeHash: string;
  readonly safeguards: readonly string[];
  readonly acceptanceRequirements: readonly string[];
  readonly validUntilTime: Date;
  readonly invalidationTriggers: readonly ReassessmentTrigger[];
  readonly evidenceReference: string;
  readonly auditRequired: boolean;
  readonly clearStatement: "This record does not authorize file changes, branch creation, staging, commit, push, PR creation/modification, merge, deployment, permissions, secrets, connectors, budgets, cloud, or external actions.";
}

/** Idea deletion state */
export enum IdeaDeletionState {
  ACTIVE = "ACTIVE",
  SOFT_DELETED = "SOFT_DELETED",
  PERMANENTLY_DELETED = "PERMANENTLY_DELETED",
}

/** Tombstone for permanently deleted idea */
export interface IdeaDeletionTombstone {
  readonly tombstoneId: string;
  readonly ideaId: IdeaId;
  readonly deletedAt: Date;
  readonly deleteReason: string;
  readonly deletedByAccountId: AccountId;
  readonly requiresAuditPreservation: boolean;
  readonly sanitizedSummaryReference?: string;
  readonly minimumAuditEvents: readonly string[];
}

/** Audit event related to idea */
export enum IdeaAuditEventType {
  IDEA_DRAFT_CREATED = "IDEA_DRAFT_CREATED",
  IDEA_DRAFT_UPDATED = "IDEA_DRAFT_UPDATED",
  IDEA_VERSION_CREATED = "IDEA_VERSION_CREATED",
  IDEA_SUBMITTED = "IDEA_SUBMITTED",
  IDEA_ASSESSMENT_STARTED = "IDEA_ASSESSMENT_STARTED",
  IDEA_ASSESSMENT_COMPLETED = "IDEA_ASSESSMENT_COMPLETED",
  IDEA_OWNER_DECISION_REQUIRED = "IDEA_OWNER_DECISION_REQUIRED",
  IDEA_APPROVED = "IDEA_APPROVED",
  IDEA_APPROVED_WITH_CONTROLS = "IDEA_APPROVED_WITH_CONTROLS",
  IDEA_FOUNDATION_ONLY = "IDEA_FOUNDATION_ONLY",
  IDEA_DEFERRED = "IDEA_DEFERRED",
  IDEA_PARKED = "IDEA_PARKED",
  IDEA_REJECTED = "IDEA_REJECTED",
  IDEA_ARCHIVED = "IDEA_ARCHIVED",
  IDEA_DELETE_REQUESTED = "IDEA_DELETE_REQUESTED",
  IDEA_SOFT_DELETED = "IDEA_SOFT_DELETED",
  IDEA_RESTORED = "IDEA_RESTORED",
  IDEA_PERMANENTLY_DELETED = "IDEA_PERMANENTLY_DELETED",
  IDEA_REASSESSMENT_TRIGGERED = "IDEA_REASSESSMENT_TRIGGERED",
  IDEA_PREFLIGHT_REQUESTED = "IDEA_PREFLIGHT_REQUESTED",
  IDEA_PREFLIGHT_STARTED = "IDEA_PREFLIGHT_STARTED",
  IDEA_PREFLIGHT_COMPLETED = "IDEA_PREFLIGHT_COMPLETED",
  IDEA_PREFLIGHT_PASSED = "IDEA_PREFLIGHT_PASSED",
  IDEA_PREFLIGHT_PASSED_WITH_CONTROLS = "IDEA_PREFLIGHT_PASSED_WITH_CONTROLS",
  IDEA_PREFLIGHT_BLOCKED = "IDEA_PREFLIGHT_BLOCKED",
  IDEA_PREFLIGHT_INVALIDATED = "IDEA_PREFLIGHT_INVALIDATED",
  IDEA_PREFLIGHT_EXPIRED = "IDEA_PREFLIGHT_EXPIRED",
  IDEA_IMPLEMENTATION_PLAN_REQUESTED = "IDEA_IMPLEMENTATION_PLAN_REQUESTED",
  IDEA_IMPLEMENTATION_STARTED = "IDEA_IMPLEMENTATION_STARTED",
  IDEA_IMPLEMENTATION_SCOPE_CHANGED = "IDEA_IMPLEMENTATION_SCOPE_CHANGED",
  IDEA_IMPLEMENTATION_REVALIDATION_REQUIRED = "IDEA_IMPLEMENTATION_REVALIDATION_REQUIRED",
  IDEA_IMPLEMENTED = "IDEA_IMPLEMENTED",
  IDEA_SUPERSEDED = "IDEA_SUPERSEDED",
}

export interface IdeaAuditEvent {
  readonly eventId: string;
  readonly eventType: IdeaAuditEventType;
  readonly ideaId: IdeaId;
  readonly ideaVersion?: IdeaVersion;
  readonly actorAccountId: AccountId;
  readonly householdId: HouseholdId;
  readonly eventTime: Date;
  readonly policyVersion: string;
  readonly result: "success" | "denied" | "error";
  readonly reason?: string;
  readonly evidenceReference?: string;
  readonly redactionDecision: "include_all" | "redact_sensitive" | "exclude_private_content";
  readonly technicalReason?: string;
  readonly friendlySummary: string;
}

/** Main idea record */
export interface IdeaRecord {
  readonly ideaId: IdeaId;
  readonly ideaVersion: IdeaVersion;
  readonly householdId: HouseholdId;
  readonly ownerAccountId: IdeaOwner;
  readonly friendlyTitle: string;
  readonly naturalLanguageDescription: string;
  readonly attachmentReferences: readonly IdeaAttachmentReference[];
  readonly voiceNoteReferences: readonly IdeaVoiceNoteReference[];
  readonly lifecycleState: IdeaLifecycleState;
  readonly disposition?: IdeaDisposition;
  readonly createdAt: Date;
  readonly updatedAt: Date;
  readonly policyVersion: string;
  readonly provenance: string;
  readonly auditRequired: boolean;
  readonly privacyClassification: "public_summary_only" | "household_only" | "owner_only";
  readonly retentionClassification: "permanent" | "long_term" | "retention_window" | "delete_after_decision";
  readonly deletionState: IdeaDeletionState;
  readonly latestAssessmentReference?: string;
  readonly latestPreflightReference?: string;
  readonly roadmapPlacement?: string;
}

/** Idea in draft state */
export interface IdeaDraft extends Omit<IdeaRecord, "lifecycleState" | "disposition"> {
  readonly lifecycleState: IdeaLifecycleState.DRAFT;
  readonly disposition: undefined;
  readonly extractedRequirements?: readonly ExtractedRequirement[];
}

/** Idea submitted for review */
export interface IdeaSubmission extends Omit<IdeaRecord, "lifecycleState"> {
  readonly lifecycleState: Exclude<IdeaLifecycleState, IdeaLifecycleState.DRAFT>;
  readonly submittedAt: Date;
}

/** Idea acceptance entry in registry */
export interface IdeaAcceptanceEntry {
  readonly acceptanceId: string;
  readonly title: string;
  readonly description: string;
  readonly implementationStatus: "CONTRACT_DEFINED" | "POLICY_VALIDATED" | "DETERMINISTICALLY_TESTED" | "RUNTIME_DEFERRED" | "UI_DEFERRED" | "NOT_IMPLEMENTED";
  readonly testMapping?: string;
  readonly evidenceMapping?: string;
  readonly runtimeStatus?: "deferred" | "implemented";
  readonly uiStatus?: "deferred" | "implemented";
}
