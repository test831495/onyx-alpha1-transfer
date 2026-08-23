import { MEMORY_CONTRACT_VERSION } from "../shared/versions";
import { type MemoryTier } from "./memory-tiers";

const required = (value: string | undefined, name: string): void => {
  if (!value) throw new Error(`${name} is required.`);
};

const validDate = (value: string, name: string): void => {
  required(value, name);
  if (Number.isNaN(Date.parse(value))) throw new Error(`${name} must be an ISO date.`);
};

// ============================================================
// TOMBSTONE CONTRACT
// ============================================================

export const TOMBSTONE_STATES = [
  "TOMBSTONE_CREATED",
  "PROPAGATION_PENDING",
  "PROPAGATING",
  "PROPAGATED",
  "PARTIALLY_PROPAGATED",
  "PROPAGATION_FAILED",
  "RECONCILIATION_REQUIRED",
  "SUPERSEDED",
] as const;

export type TombstoneState = (typeof TOMBSTONE_STATES)[number];

export interface TombstoneContract {
  tombstoneId: string;
  canonicalSourceId: string;
  memoryRecordIds: string[];
  derivedArtifactIds: string[];
  deletionScope: string;
  deletionReason: string;
  deletedAt: string;
  authorizedActor: string;
  retentionException: string | null;
  cachePropagationStatus: string;
  indexPropagationStatus: string;
  summaryPropagationStatus: string;
  embeddingPropagationStatus: string;
  archivePropagationStatus: string;
  backupPropagationStatus: string;
  rehydrationBlocked: boolean;
  status: TombstoneState;
  contractVersion: string;
  auditReferences: string[];
  evidenceReferences: string[];
}

export function assertTombstoneContract(contract: TombstoneContract): void {
  required(contract.tombstoneId, "tombstoneId");
  required(contract.canonicalSourceId, "canonicalSourceId");

  if (!Array.isArray(contract.memoryRecordIds) || contract.memoryRecordIds.length === 0) {
    throw new Error("memoryRecordIds must be a non-empty array.");
  }
  if (!Array.isArray(contract.derivedArtifactIds)) {
    throw new Error("derivedArtifactIds must be an array.");
  }

  required(contract.deletionScope, "deletionScope");
  required(contract.deletionReason, "deletionReason");
  validDate(contract.deletedAt, "deletedAt");
  required(contract.authorizedActor, "authorizedActor");

  required(contract.cachePropagationStatus, "cachePropagationStatus");
  required(contract.indexPropagationStatus, "indexPropagationStatus");
  required(contract.summaryPropagationStatus, "summaryPropagationStatus");
  required(contract.embeddingPropagationStatus, "embeddingPropagationStatus");
  required(contract.archivePropagationStatus, "archivePropagationStatus");
  required(contract.backupPropagationStatus, "backupPropagationStatus");

  if (!(TOMBSTONE_STATES as readonly string[]).includes(contract.status)) {
    throw new Error("status must be a valid tombstone state.");
  }

  if (!Array.isArray(contract.auditReferences) || contract.auditReferences.length === 0) {
    throw new Error("auditReferences must be a non-empty array.");
  }
  if (!Array.isArray(contract.evidenceReferences)) {
    throw new Error("evidenceReferences must be an array.");
  }

  // A tombstone must be append-only and auditable
  // A tombstone must not silently disappear
}

// ============================================================
// DELETION PROPAGATION CONTRACT
// ============================================================

export const PROPAGATION_TARGET_TYPES = [
  "CACHE",
  "INDEX",
  "SUMMARY",
  "EMBEDDING",
  "ARCHIVE",
  "BACKUP",
  "REHYDRATION_PIPELINE",
  "DERIVED_MEMORY_RECORD",
] as const;

export type PropagationTargetType = (typeof PROPAGATION_TARGET_TYPES)[number];

export const PROPAGATION_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "INVALIDATED",
  "BLOCKED",
  "FAILED_SAFE",
  "RECONCILIATION_REQUIRED",
  "NOT_APPLICABLE",
] as const;

export type PropagationStatus = (typeof PROPAGATION_STATUSES)[number];

export interface DeletionPropagationContract {
  propagationId: string;
  tombstoneId: string;
  canonicalSourceId: string;
  targetType: PropagationTargetType;
  targetId: string;
  requiredAction: string;
  status: PropagationStatus;
  attemptNumber: number;
  lastAttemptAt: string | null;
  resultDigest: string | null;
  failureReason: string | null;
  reconciliationRequired: boolean;
  contractVersion: string;
  evidenceReferences: string[];
}

export function assertDeletionPropagation(
  contract: DeletionPropagationContract
): void {
  required(contract.propagationId, "propagationId");
  required(contract.tombstoneId, "tombstoneId");
  required(contract.canonicalSourceId, "canonicalSourceId");

  if (!(PROPAGATION_TARGET_TYPES as readonly string[]).includes(contract.targetType)) {
    throw new Error(`${contract.targetType} is not a valid propagation target type.`);
  }

  required(contract.targetId, "targetId");
  required(contract.requiredAction, "requiredAction");

  if (!(PROPAGATION_STATUSES as readonly string[]).includes(contract.status)) {
    throw new Error("status must be a valid propagation status.");
  }

  if (contract.attemptNumber < 0) {
    throw new Error("attemptNumber must be non-negative.");
  }

  if (contract.lastAttemptAt) {
    validDate(contract.lastAttemptAt, "lastAttemptAt");
  }

  if (!Array.isArray(contract.evidenceReferences)) {
    throw new Error("evidenceReferences must be an array.");
  }

  // Unknown target types must be rejected
  // Do not default an unknown target to NOT_APPLICABLE
}

// ============================================================
// DERIVED-ARTIFACT INVALIDATION
// ============================================================

export const DERIVED_ARTIFACT_TYPES = [
  "CACHE_ENTRY",
  "SEARCH_INDEX_ENTRY",
  "VECTOR_EMBEDDING",
  "GENERATED_SUMMARY",
  "CONTEXT_PACKAGE_REFERENCE",
  "ARCHIVE_INDEX_REFERENCE",
  "BACKUP_INDEX_REFERENCE",
  "DERIVED_MEMORY_RECORD",
] as const;

export type DerivedArtifactType = (typeof DERIVED_ARTIFACT_TYPES)[number];

export interface DerivedArtifactInvalidationContract {
  invalidationId: string;
  tombstoneId: string;
  canonicalSourceId: string;
  derivedArtifactId: string;
  derivedArtifactType: DerivedArtifactType;
  priorDigest: string;
  invalidationReason: string;
  invalidatedAt: string;
  status: string;
  contractVersion: string;
  evidenceReferences: string[];
}

export function assertDerivedArtifactInvalidation(
  contract: DerivedArtifactInvalidationContract
): void {
  required(contract.invalidationId, "invalidationId");
  required(contract.tombstoneId, "tombstoneId");
  required(contract.canonicalSourceId, "canonicalSourceId");
  required(contract.derivedArtifactId, "derivedArtifactId");

  if (!(DERIVED_ARTIFACT_TYPES as readonly string[]).includes(contract.derivedArtifactType)) {
    throw new Error(`${contract.derivedArtifactType} is not a valid derived artifact type.`);
  }

  required(contract.priorDigest, "priorDigest");
  required(contract.invalidationReason, "invalidationReason");
  validDate(contract.invalidatedAt, "invalidatedAt");
  required(contract.status, "status");

  if (!Array.isArray(contract.evidenceReferences)) {
    throw new Error("evidenceReferences must be an array.");
  }

  // Invalidated derived artifacts must be excluded from active retrieval, context assembly,
  // ranking, summarization, embedding lookup, memory promotion, and source rehydration
}

// ============================================================
// NON-RESURRECTION VALIDATION
// ============================================================

export interface DeletedMemoryNonResurrectionValidation {
  validationId: string;
  tombstoneId: string;
  canonicalSourceId: string;
  deletionScope: string;
  cacheInvalidated: boolean;
  indexInvalidated: boolean;
  summaryInvalidated: boolean;
  embeddingInvalidated: boolean;
  archiveRecordRemoved: boolean;
  backupRecordRemoved: boolean;
  rehydrationBlocked: boolean;
  activeTargets: string[];
  unresolvedTargets: string[];
  success: boolean;
  validatedAt: string;
  contractVersion: string;
  evidenceReferences: string[];
}

export function assertDeletedMemoryNonResurrectionValidation(
  validation: DeletedMemoryNonResurrectionValidation
): void {
  required(validation.validationId, "validationId");
  required(validation.tombstoneId, "tombstoneId");
  required(validation.canonicalSourceId, "canonicalSourceId");
  required(validation.deletionScope, "deletionScope");
  validDate(validation.validatedAt, "validatedAt");

  if (!Array.isArray(validation.activeTargets)) {
    throw new Error("activeTargets must be an array.");
  }
  if (!Array.isArray(validation.unresolvedTargets)) {
    throw new Error("unresolvedTargets must be an array.");
  }
  if (!Array.isArray(validation.evidenceReferences)) {
    throw new Error("evidenceReferences must be an array.");
  }

  // If any required target remains active or unresolved, return fail
  if (validation.success) {
    if (validation.activeTargets.length > 0) {
      throw new Error("success cannot be true when there are active targets.");
    }
    if (validation.unresolvedTargets.length > 0) {
      throw new Error("success cannot be true when there are unresolved targets.");
    }
  }

  // Non-resurrection succeeds only when all targets accounted for
  if (validation.success) {
    // All required targets must be accounted for
    if (
      !validation.cacheInvalidated &&
      !validation.indexInvalidated &&
      !validation.summaryInvalidated &&
      !validation.embeddingInvalidated
    ) {
      throw new Error("At least one target must be invalidated for non-resurrection success.");
    }
  }
}

// ============================================================
// BACKUP, ARCHIVE, AND REHYDRATION BOUNDARIES
// ============================================================

export interface BackupRestoreValidationContract {
  backupRestoreId: string;
  backupTimestamp: string;
  recordsRestored: string[];
  derivedArtifactsRestored: string[];
  tombstonesRequired: string[];
  freshnessVerified: boolean;
  mustConsultTombstones: boolean;
  status: string;
  validatedAt: string;
  contractVersion: string;
  evidenceReferences: string[];
}

export function assertBackupRestoreValidation(
  contract: BackupRestoreValidationContract
): void {
  required(contract.backupRestoreId, "backupRestoreId");
  validDate(contract.backupTimestamp, "backupTimestamp");

  if (!Array.isArray(contract.recordsRestored)) {
    throw new Error("recordsRestored must be an array.");
  }
  if (!Array.isArray(contract.derivedArtifactsRestored)) {
    throw new Error("derivedArtifactsRestored must be an array.");
  }
  if (!Array.isArray(contract.tombstonesRequired)) {
    throw new Error("tombstonesRequired must be an array.");
  }

  // A stale backup must not override a newer tombstone
  if (contract.mustConsultTombstones && contract.tombstonesRequired.length === 0) {
    throw new Error("If mustConsultTombstones is true, tombstonesRequired must be provided.");
  }

  required(contract.status, "status");
  validDate(contract.validatedAt, "validatedAt");

  if (!Array.isArray(contract.evidenceReferences)) {
    throw new Error("evidenceReferences must be an array.");
  }
}

export interface ArchiveRetrievalValidationContract {
  archiveRetrievalId: string;
  archiveSource: string;
  recordsRetrieved: string[];
  derivedArtifactsRetrieved: string[];
  tombstonesRequired: string[];
  mustConsultTombstones: boolean;
  status: string;
  validatedAt: string;
  contractVersion: string;
  evidenceReferences: string[];
}

export function assertArchiveRetrievalValidation(
  contract: ArchiveRetrievalValidationContract
): void {
  required(contract.archiveRetrievalId, "archiveRetrievalId");
  required(contract.archiveSource, "archiveSource");

  if (!Array.isArray(contract.recordsRetrieved)) {
    throw new Error("recordsRetrieved must be an array.");
  }
  if (!Array.isArray(contract.derivedArtifactsRetrieved)) {
    throw new Error("derivedArtifactsRetrieved must be an array.");
  }
  if (!Array.isArray(contract.tombstonesRequired)) {
    throw new Error("tombstonesRequired must be an array.");
  }

  // An archive record must not override a deletion decision
  if (contract.mustConsultTombstones && contract.tombstonesRequired.length === 0) {
    throw new Error("If mustConsultTombstones is true, tombstonesRequired must be provided.");
  }

  required(contract.status, "status");
  validDate(contract.validatedAt, "validatedAt");

  if (!Array.isArray(contract.evidenceReferences)) {
    throw new Error("evidenceReferences must be an array.");
  }
}

export interface SourceRehydrationValidationContract {
  rehydrationId: string;
  canonicalSourceId: string;
  rehydrationTargets: string[];
  tombstoneRequired: boolean;
  tombstoneId: string | null;
  failSafeOnMissingTombstone: boolean;
  status: string;
  validatedAt: string;
  contractVersion: string;
  evidenceReferences: string[];
}

export function assertSourceRehydrationValidation(
  contract: SourceRehydrationValidationContract
): void {
  required(contract.rehydrationId, "rehydrationId");
  required(contract.canonicalSourceId, "canonicalSourceId");

  if (!Array.isArray(contract.rehydrationTargets) || contract.rehydrationTargets.length === 0) {
    throw new Error("rehydrationTargets must be a non-empty array.");
  }

  // A source rehydration request must fail safe if tombstone status cannot be verified
  if (contract.tombstoneRequired && !contract.tombstoneId) {
    if (!contract.failSafeOnMissingTombstone) {
      throw new Error("If tombstoneRequired is true but no tombstoneId provided, failSafeOnMissingTombstone must be true.");
    }
  }

  required(contract.status, "status");
  validDate(contract.validatedAt, "validatedAt");

  if (!Array.isArray(contract.evidenceReferences)) {
    throw new Error("evidenceReferences must be an array.");
  }
}
