import * as foundation from "../src/index";
import { describe, expect, it } from "vitest";

describe("B4-1 public exports", () => {
  it("exports contracts, labels, registry, and synthetic fixtures", () => {
    for (const name of ["ACCEPTANCE_REGISTRY", "validateAcceptanceRegistry", "FRIENDLY_LABELS", "CONTINUITY_EVIDENCE_LABELS", "CONTINUITY_GAP_LABELS", "JOURNEY_EVENT_LABELS", "SUMMARY_QUALITY_LABELS", "RECOVERY_PACKAGE_LABELS", "INTEGRITY_LABELS", "COPY_HEALTH_LABELS", "ARCHIVE_HEALTH_LABELS", "RECOVERY_ROUTE_LABELS", "STORAGE_PRESSURE_LABELS", "RETENTION_LABELS", "SANITIZATION_LABELS", "OPERATING_MODE_LABELS", "JOURNEY_EVENT_KIND_LABELS", "SIGNIFICANCE_CLASSIFICATION_LABELS", "SOURCE_KIND_LABELS", "SOURCE_PRECEDENCE_LABELS", "PRIVACY_CLASSIFICATION_LABELS", "NOISE_DECISION_LABELS", "CONTINUITY_STATES", "EVIDENCE_SUFFICIENCY_STATES", "HISTORICAL_CONFIDENCE_BANDS", "JOURNEY_PROJECTION_PURPOSES", "PROJECTION_ELIGIBILITY_STATES", "CONTINUITY_POLICY_CONFIGURATION", "VALID_JOURNEY_RECORD", "MISSING_EVIDENCE_RECORD", "CONFLICTING_EVIDENCE_RECORD", "VALID_RECOVERY_PACKAGE", "INVALID_RECOVERY_PACKAGE", "INTEGRITY_MANIFEST", "CORRUPT_PACKAGE_STATUS", "VERIFIED_LOCAL_COPY_RECEIPT", "UNAVAILABLE_OFFLINE_COPY_RECEIPT", "DEGRADED_ARCHIVE_SET", "CRITICAL_STORAGE_PRESSURE", "SANITIZATION_DENIAL", "OPERATING_MODES", "createsAuthority", "RECOVERY_COMPLETENESS_GAP_REASONS", "RECOVERY_RESTORATION_STAGES", "RECOVERY_PROHIBITED_CONTENT_CLASSES", "RECOVERY_PORTABILITY_EVIDENCE_CLASSES", "RECOVERY_CRYPTO_MIGRATION_CLASSES", "RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASSES", "RECOVERY_COMPLETENESS_ASSESSMENT_STATES", "RECOVERY_EVIDENCE_PRECEDENCE_RESULTS", "MAX_RECOVERY_COMPLETENESS_GAPS", "MAX_RESTORATION_DEPENDENCIES", "MAX_EVIDENCE_REFERENCES", "MAX_BLOCKED_BY_REFERENCES", "MAX_PROHIBITED_CONTENT_FINDINGS", "validateRecoveryCompletenessGap", "validateRecoveryRestorationDependency", "validateRecoveryProhibitedContentDescriptor", "validateRecoveryPortabilityEvidence", "validateRecoveryCryptoMigrationEvidence", "validateRecoveryDeviceLifecycleEvidence", "validateRecoveryCompletenessAssessmentInput", "assessRecoveryCompleteness", "RECOVERY_COMPLETENESS_GAP_REASON_LABELS", "RECOVERY_RESTORATION_STAGE_LABELS", "RECOVERY_PROHIBITED_CONTENT_CLASS_LABELS", "RECOVERY_PORTABILITY_EVIDENCE_CLASS_LABELS", "RECOVERY_CRYPTO_MIGRATION_CLASS_LABELS", "RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASS_LABELS", "RECOVERY_COMPLETENESS_ASSESSMENT_STATE_LABELS", "RECOVERY_EVIDENCE_PRECEDENCE_RESULT_LABELS"]) expect(name in foundation).toBe(true);
    expect(foundation.validateAcceptanceRegistry(foundation.ACCEPTANCE_REGISTRY)).toMatchObject({ valid: true, totalCount: 128 });
    for (const name of ["RECOVERY_COMPLETENESS_GAP_REASONS", "RECOVERY_RESTORATION_STAGES", "RECOVERY_PROHIBITED_CONTENT_CLASSES", "RECOVERY_PORTABILITY_EVIDENCE_CLASSES", "RECOVERY_CRYPTO_MIGRATION_CLASSES", "RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASSES", "RECOVERY_COMPLETENESS_ASSESSMENT_STATES", "RECOVERY_EVIDENCE_PRECEDENCE_RESULTS", "RECOVERY_COMPLETENESS_GAP_REASON_LABELS", "RECOVERY_RESTORATION_STAGE_LABELS", "RECOVERY_PROHIBITED_CONTENT_CLASS_LABELS", "RECOVERY_PORTABILITY_EVIDENCE_CLASS_LABELS", "RECOVERY_CRYPTO_MIGRATION_CLASS_LABELS", "RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASS_LABELS", "RECOVERY_COMPLETENESS_ASSESSMENT_STATE_LABELS", "RECOVERY_EVIDENCE_PRECEDENCE_RESULT_LABELS"]) expect(Object.isFrozen((foundation as Record<string, unknown>)[name])).toBe(true);
  });

  it("does not expose prohibited runtime operations", () => {
    for (const name of ["captureJourney", "processJourneyEvent", "compressHistory", "deduplicateArtifacts", "constructManifest", "generateRecoveryPackage", "hashArtifact", "copyRecoveryPackage", "evaluateCopyHealth", "evaluateStoragePressure", "evaluateRetention", "executeRetention", "executeSanitization", "evaluateOperatingMode", "transitionOperatingMode", "persistJourney", "restore", "writeArchive", "git", "github", "writeFile", "fetchRemote", "scheduleRecovery", "runConnector", "runAgent", "runCouncil", "deploy", "activateSuccession", "restoreSecrets", "cleanDestructively", "executeMigration", "performProviderExit", "activateReplacementDevice", "rotateDeviceKeys", "runRecoveryCompletenessWorkflow"]) expect(name in foundation).toBe(false);
  });

  it("exports the B4-4A.3 readiness values and operations", () => {
    for (const name of ["RECOVERY_DEPENDENCY_ARTIFACT_CLASSES", "RECOVERY_DEPENDENCY_ARTIFACT_STAGE_BY_CLASS", "RECOVERY_DEPENDENCY_ARTIFACT_EVIDENCE_STATUSES", "RECOVERY_DEPENDENCY_READINESS_STATES", "validateRecoveryDependencyReadinessInput", "assessRecoveryDependencyReadiness", "projectRecoveryArtifactsInRestorationOrder", "RECOVERY_DEPENDENCY_ARTIFACT_CLASS_LABELS", "RECOVERY_DEPENDENCY_READINESS_STATE_LABELS"]) expect(name in foundation).toBe(true);
    expect(Object.isFrozen(foundation.RECOVERY_DEPENDENCY_ARTIFACT_STAGE_BY_CLASS)).toBe(true);
    expect(Object.isFrozen(foundation.RECOVERY_DEPENDENCY_ARTIFACT_CLASS_LABELS)).toBe(true);
  });

  it("preserves the legacy artifact vocabulary beside the distinct dependency vocabulary", () => {
    expect(foundation.RECOVERY_ARTIFACT_CLASSES).toHaveLength(8);
    expect(foundation.RECOVERY_DEPENDENCY_ARTIFACT_CLASSES).toHaveLength(17);
    expect(foundation.RECOVERY_ARTIFACT_CLASSES).not.toBe(foundation.RECOVERY_DEPENDENCY_ARTIFACT_CLASSES);
  });

  it("does not export B4-4A.3 runtime capability names", () => {
    for (const name of ["restoreArtifacts", "executeRestorePlan", "activateRecoveredState", "persistRecoveryMetadata", "runRecoveryDependencyReadiness"]) expect(name in foundation).toBe(false);
  });
});