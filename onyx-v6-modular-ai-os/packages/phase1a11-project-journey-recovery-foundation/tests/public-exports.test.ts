import * as foundation from "../src/index";
import { describe, expect, it } from "vitest";

describe("B4-1 public exports", () => {
  it("exports contracts, labels, registry, and synthetic fixtures", () => {
    for (const name of ["ACCEPTANCE_REGISTRY", "validateAcceptanceRegistry", "FRIENDLY_LABELS", "CONTINUITY_EVIDENCE_LABELS", "CONTINUITY_GAP_LABELS", "JOURNEY_EVENT_LABELS", "SUMMARY_QUALITY_LABELS", "RECOVERY_PACKAGE_LABELS", "INTEGRITY_LABELS", "COPY_HEALTH_LABELS", "ARCHIVE_HEALTH_LABELS", "RECOVERY_ROUTE_LABELS", "STORAGE_PRESSURE_LABELS", "RETENTION_LABELS", "SANITIZATION_LABELS", "OPERATING_MODE_LABELS", "JOURNEY_EVENT_KIND_LABELS", "SIGNIFICANCE_CLASSIFICATION_LABELS", "SOURCE_KIND_LABELS", "SOURCE_PRECEDENCE_LABELS", "PRIVACY_CLASSIFICATION_LABELS", "NOISE_DECISION_LABELS", "VALID_JOURNEY_RECORD", "MISSING_EVIDENCE_RECORD", "CONFLICTING_EVIDENCE_RECORD", "VALID_RECOVERY_PACKAGE", "INVALID_RECOVERY_PACKAGE", "INTEGRITY_MANIFEST", "CORRUPT_PACKAGE_STATUS", "VERIFIED_LOCAL_COPY_RECEIPT", "UNAVAILABLE_OFFLINE_COPY_RECEIPT", "DEGRADED_ARCHIVE_SET", "CRITICAL_STORAGE_PRESSURE", "SANITIZATION_DENIAL", "OPERATING_MODES", "createsAuthority"]) expect(name in foundation).toBe(true);
    expect(foundation.validateAcceptanceRegistry(foundation.ACCEPTANCE_REGISTRY)).toMatchObject({ valid: true, totalCount: 92 });
  });

  it("does not expose prohibited runtime operations", () => {
    for (const name of ["captureJourney", "processJourneyEvent", "compressHistory", "deduplicateArtifacts", "constructManifest", "generateRecoveryPackage", "hashArtifact", "copyRecoveryPackage", "evaluateCopyHealth", "evaluateStoragePressure", "evaluateRetention", "executeRetention", "executeSanitization", "evaluateOperatingMode", "transitionOperatingMode", "persistJourney", "restore", "writeArchive", "git", "github", "writeFile", "fetchRemote", "scheduleRecovery", "runConnector", "runAgent", "runCouncil", "deploy", "activateSuccession", "restoreSecrets", "cleanDestructively"]) expect(name in foundation).toBe(false);
  });
});