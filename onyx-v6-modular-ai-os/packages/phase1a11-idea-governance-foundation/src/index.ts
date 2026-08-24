/**
 * Phase 1A.11 Wave B3 Idea Governance Foundation
 *
 * Complete package for idea intake, lifecycle, assessment, preflight, readiness, deletion, and audit.
 * All ideas are account-bound and support full version history.
 */

// Model and contracts
export {
  type IdeaId,
  type IdeaVersion,
  type IdeaVersionId,
  type IdeaOwner,
  type IdeaRecord,
  type IdeaDraft,
  type IdeaSubmission,
  type IdeaAttachmentReference,
  type IdeaVoiceNoteReference,
  type ExtractedRequirement,
  type IdeaAssessment,
  type IdeaDecision,
  type IdeaLifecycleLabel,
  type IdeaFreshnessPolicy,
  type MaterialChange,
  type ReassessmentTrigger,
  type IdeaPreflightRequest,
  type IdeaPreflightResult,
  type ImplementationReadinessRecord,
  type IdeaDeletionTombstone,
  type IdeaAuditEvent,
  IdeaDisposition,
  IdeaLifecycleState,
  IdeaFreshness,
  IdeaDeletionState,
  IdeaAuditEventType,
  createIdeaId,
  createIdeaVersion,
  createIdeaVersionId,
} from "./idea-model.js";

// Lifecycle
export {
  type LifecycleTransitionResult,
  isTransitionAllowed,
  isTerminalState,
  isProtectedState,
  getAllowedTransitions,
  LIFECYCLE_LABELS,
} from "./idea-lifecycle.js";

// Dispositions
export {
  getDispositionDetail,
  isValidDisposition,
  getAllDispositions,
  DISPOSITION_DETAILS,
} from "./idea-dispositions.js";

// Versioning and material changes
export {
  type ChangeType,
  type MaterialChangeClassification,
  MaterialChangeCategory,
  classifyMaterialChange,
  changeInvalidatesReadiness,
  changeTriggersReassessment,
  getChangeTypesInCategory,
  createMaterialChangeRecord,
} from "./idea-versioning.js";

// Freshness
export {
  type FreshnessPolicy,
  determineAssessmentFreshness,
  determinePreflightFreshness,
  determineReadinessExpiration,
  isStaleOrInvalidated,
  canReadinessBeRevived,
} from "./idea-freshness.js";

// Assessment
export {
  type AssessmentDimension,
  type FactStatus,
  isValidDimension,
  isValidAssessment,
  countVerifiedFacts,
  countMissingDimensions,
  getMissingDimensions,
  hasHighConfidence,
  createAssessmentSummary,
  shouldRequestResearch,
  shouldRequestArchitectureReview,
} from "./idea-assessment.js";

// Preflight
export {
  type PreflightCheckResult,
  type PreflightValidationContext,
  determinePreflightResult,
  createBlockerExplanation,
  preflightNeverAuthorizes,
  createPreflightClearStatement,
} from "./idea-preflight.js";

// Readiness
export {
  type ReadinessValidationContext,
  isReadinessValid,
  getReadinessInvalidationReasons,
  canModeRestorationReviveReadiness,
  createReadinessScopeHash,
  isReadinessScopeValid,
  getReadinessExpirationHours,
  createReadinessAuthorizationStatement,
  listReadinessInvalidationTriggers,
} from "./idea-readiness.js";

// Deletion
export {
  type DeletionRequest,
  type DeletionValidationContext,
  canPermanentlyDelete,
  getPermanentDeletionBlockers,
  createDeletionTombstone,
  getPermanentDeletionSteps,
  getSoftDeletionSteps,
  getRestorationSteps,
  getMinimumTombstoneContent,
  getProhibitedTombstoneContent,
  verifyTombstonePrivacy,
  isInDeletableState,
  isDeletionTerminal,
} from "./idea-deletion.js";

// Audit
export {
  type AuditEventMetadata,
  auditAvailabilityRequired,
  ownerAuthorityRequired,
  getEventsRequiringAuditAvailability,
  getSecurityAffectingEvents,
  verifyAuditEventSensitivity,
  AUDIT_EVENT_METADATA,
} from "./idea-audit.js";

// Acceptance Registry
export {
  getAcceptanceEntry,
  getAllAcceptanceIds,
  getAcceptanceIdsByCategory,
  verifyAcceptanceRegistryCompleteness,
  IDEA_ACCEPTANCE_REGISTRY,
} from "./idea-acceptance.js";

// Labels
export {
  type LocalizedLabel,
  getLifecycleLabel,
  getDispositionLabel,
  getFreshnessLabel,
  getModeLabel,
  IDEA_GOVERNANCE_LABELS,
} from "./idea-labels.js";

// Authorization
export {
  type IdeaOperation,
  type IdeaPurpose,
  type IdeaActorKind,
  type OperatingMode,
  type IdentitySnapshot,
  type SessionSnapshot,
  type SanitizedSharingContext,
  type IdeaGovernanceResourceReference,
  type IdeaAuthorizationInput,
  type IdeaAuthorizationDecision,
  evaluateIdeaAuthorization,
} from "./idea-authorization.js";

// Acceptance Validator
export {
  type AcceptanceStatus,
  type IdeaAcceptanceValidationResult,
  APPROVED_ACCEPTANCE_STATUSES,
  IDEA_ACCEPTANCE_TEST_MANIFEST,
  validateIdeaAcceptanceRegistry,
  summarizeAcceptanceFamilies,
} from "./idea-acceptance-validator.js";

// Test Fixtures
export {
  FIXTURES,
  FIXTURE_IDEA_ID,
  FIXTURE_VERSION_V1,
  FIXTURE_VERSION_V2,
  FIXTURE_VERSION_ID,
  createFixtureDraft,
  createFixtureSubmission,
  createFixtureAssessment,
  createFixturePreflightRequest,
  createFixturePreflightResult,
  createFixtureReadiness,
  createFixtureAuditEvent,
  createFixtureBlockedPreflight,
} from "./fixtures.js";
