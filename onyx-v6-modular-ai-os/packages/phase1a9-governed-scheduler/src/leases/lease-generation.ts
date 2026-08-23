import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";
import { makeId } from "../shared/identifiers";

/**
 * LeaseGeneration: Deterministic lease generation sequencing for governed ownership.
 * 
 * Wave 2C: Lease generation validation ensures:
 * - First acquisition uses a fixed valid initial generation
 * - Every governed reassignment increments exactly once
 * - Renewal preserves generation
 * - Release preserves the closed generation
 * - Stale generations are rejected
 * - Skipped generations are rejected unless policy permits
 * - Duplicate generation with different owner is rejected
 * - Late worker results from older generations never overwrite current state
 */

export const LEASE_GENERATION_INITIAL = 1 as const;

export interface LeaseGenerationValidation {
  leaseGenerationValidationId: string;
  taskId: string;
  workflowId: string;
  runtimeId: string;
  currentGeneration: number;
  requestedGeneration: number;
  currentOwnerId: string;
  requestedOwnerId: string;
  acquisitionContext: "INITIAL_ACQUISITION" | "GOVERNED_REASSIGNMENT" | "RENEWAL" | "RELEASE";
  decision:
    | "GENERATION_VALID_INITIAL"
    | "GENERATION_VALID_INCREMENT"
    | "GENERATION_VALID_PRESERVED"
    | "GENERATION_VALID_CLOSED"
    | "DENIED_STALE_GENERATION"
    | "DENIED_SKIPPED_GENERATION"
    | "DENIED_DUPLICATE_GENERATION_DIFFERENT_OWNER"
    | "DENIED_OWNER_MISMATCH_SAME_GENERATION"
    | "REQUIRES_RECONCILIATION";
  isValid: boolean;
  denialReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

/**
 * Validate lease generation for initial acquisition.
 * First acquisition MUST use LEASE_GENERATION_INITIAL.
 */
export function validateLeaseGenerationInitialAcquisition(
  taskId: string,
  workflowId: string,
  runtimeId: string,
  requestedGeneration: number,
  requestingAgentId: string,
): LeaseGenerationValidation {
  const validation: LeaseGenerationValidation = {
    leaseGenerationValidationId: makeId("lease-gen-val", { taskId, action: "initial" }),
    taskId,
    workflowId,
    runtimeId,
    currentGeneration: 0,
    requestedGeneration,
    currentOwnerId: "",
    requestedOwnerId: requestingAgentId,
    acquisitionContext: "INITIAL_ACQUISITION",
    decision: "DENIED_STALE_GENERATION",
    isValid: false,
    denialReasons: [],
    evidenceArtifactIds: [],
    evaluatedAt: new Date("2026-08-21T00:00:00.000Z").toISOString(),
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  };

  if (requestedGeneration !== LEASE_GENERATION_INITIAL) {
    validation.denialReasons = [
      `Initial acquisition must use generation ${LEASE_GENERATION_INITIAL}, got ${requestedGeneration}`,
    ];
    validation.decision = "DENIED_STALE_GENERATION";
    return validation;
  }

  validation.decision = "GENERATION_VALID_INITIAL";
  validation.isValid = true;
  validation.denialReasons = [];
  return validation;
}

/**
 * Validate lease generation for governed reassignment.
 * Reassignment MUST increment generation by exactly 1.
 */
export function validateLeaseGenerationReassignment(
  taskId: string,
  workflowId: string,
  runtimeId: string,
  currentGeneration: number,
  requestedGeneration: number,
  currentOwnerId: string,
  requestingAgentId: string,
  ownershipTransition: boolean,
): LeaseGenerationValidation {
  const validation: LeaseGenerationValidation = {
    leaseGenerationValidationId: makeId("lease-gen-val", { taskId, action: "reassign" }),
    taskId,
    workflowId,
    runtimeId,
    currentGeneration,
    requestedGeneration,
    currentOwnerId,
    requestedOwnerId: requestingAgentId,
    acquisitionContext: "GOVERNED_REASSIGNMENT",
    decision: "DENIED_STALE_GENERATION",
    isValid: false,
    denialReasons: [],
    evidenceArtifactIds: [],
    evaluatedAt: new Date("2026-08-21T00:00:00.000Z").toISOString(),
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  };

  const expectedNextGeneration = currentGeneration + 1;

  if (requestedGeneration < currentGeneration) {
    validation.denialReasons = [
      `Requested generation ${requestedGeneration} is stale (current: ${currentGeneration})`,
    ];
    validation.decision = "DENIED_STALE_GENERATION";
    return validation;
  }

  if (requestedGeneration > expectedNextGeneration) {
    validation.denialReasons = [
      `Requested generation ${requestedGeneration} skips expected ${expectedNextGeneration}`,
    ];
    validation.decision = "DENIED_SKIPPED_GENERATION";
    return validation;
  }

  if (requestedGeneration === currentGeneration && requestingAgentId !== currentOwnerId) {
    validation.denialReasons = [
      `Generation ${currentGeneration} already owned by ${currentOwnerId}; cannot reassign same generation to different owner`,
    ];
    validation.decision = "DENIED_DUPLICATE_GENERATION_DIFFERENT_OWNER";
    return validation;
  }

  if (requestedGeneration !== expectedNextGeneration) {
    validation.denialReasons = [
      `Requested generation ${requestedGeneration} does not increment by 1 from ${currentGeneration}`,
    ];
    validation.decision = "DENIED_SKIPPED_GENERATION";
    return validation;
  }

  if (!ownershipTransition && requestingAgentId !== currentOwnerId) {
    validation.denialReasons = [
      `Owner mismatch: current owner ${currentOwnerId}, requesting ${requestingAgentId}, but ownership is not transitioning`,
    ];
    validation.decision = "DENIED_OWNER_MISMATCH_SAME_GENERATION";
    return validation;
  }

  validation.decision = "GENERATION_VALID_INCREMENT";
  validation.isValid = true;
  validation.denialReasons = [];
  return validation;
}

/**
 * Validate lease generation for renewal.
 * Renewal MUST preserve generation (no increment).
 */
export function validateLeaseGenerationRenewal(
  taskId: string,
  workflowId: string,
  runtimeId: string,
  currentGeneration: number,
  requestedGeneration: number,
  currentOwnerId: string,
  requestingAgentId: string,
): LeaseGenerationValidation {
  const validation: LeaseGenerationValidation = {
    leaseGenerationValidationId: makeId("lease-gen-val", { taskId, action: "renewal" }),
    taskId,
    workflowId,
    runtimeId,
    currentGeneration,
    requestedGeneration,
    currentOwnerId,
    requestedOwnerId: requestingAgentId,
    acquisitionContext: "RENEWAL",
    decision: "DENIED_STALE_GENERATION",
    isValid: false,
    denialReasons: [],
    evidenceArtifactIds: [],
    evaluatedAt: new Date("2026-08-21T00:00:00.000Z").toISOString(),
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  };

  if (requestedGeneration !== currentGeneration) {
    validation.denialReasons = [
      `Renewal must preserve generation; current: ${currentGeneration}, requested: ${requestedGeneration}`,
    ];
    validation.decision = "DENIED_STALE_GENERATION";
    return validation;
  }

  if (requestingAgentId !== currentOwnerId) {
    validation.denialReasons = [
      `Only current owner ${currentOwnerId} can renew; requested by ${requestingAgentId}`,
    ];
    validation.decision = "DENIED_OWNER_MISMATCH_SAME_GENERATION";
    return validation;
  }

  validation.decision = "GENERATION_VALID_PRESERVED";
  validation.isValid = true;
  validation.denialReasons = [];
  return validation;
}

/**
 * Validate lease generation for release.
 * Release must preserve the closed generation.
 */
export function validateLeaseGenerationRelease(
  taskId: string,
  workflowId: string,
  runtimeId: string,
  currentGeneration: number,
  requestedGeneration: number,
  currentOwnerId: string,
  requestingAgentId: string,
): LeaseGenerationValidation {
  const validation: LeaseGenerationValidation = {
    leaseGenerationValidationId: makeId("lease-gen-val", { taskId, action: "release" }),
    taskId,
    workflowId,
    runtimeId,
    currentGeneration,
    requestedGeneration,
    currentOwnerId,
    requestedOwnerId: requestingAgentId,
    acquisitionContext: "RELEASE",
    decision: "DENIED_STALE_GENERATION",
    isValid: false,
    denialReasons: [],
    evidenceArtifactIds: [],
    evaluatedAt: new Date("2026-08-21T00:00:00.000Z").toISOString(),
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  };

  if (requestedGeneration !== currentGeneration) {
    validation.denialReasons = [
      `Release must preserve generation; current: ${currentGeneration}, requested: ${requestedGeneration}`,
    ];
    validation.decision = "DENIED_STALE_GENERATION";
    return validation;
  }

  if (requestingAgentId !== currentOwnerId) {
    validation.denialReasons = [
      `Only current owner ${currentOwnerId} can release; requested by ${requestingAgentId}`,
    ];
    validation.decision = "DENIED_OWNER_MISMATCH_SAME_GENERATION";
    return validation;
  }

  validation.decision = "GENERATION_VALID_CLOSED";
  validation.isValid = true;
  validation.denialReasons = [];
  return validation;
}

/**
 * Classify a late worker result based on generation.
 * Older-generation results must never overwrite current state.
 */
export interface StaleResultClassification {
  resultGeneration: number;
  currentGeneration: number;
  isStale: boolean;
  canReuse: boolean;
  reconciliationRequired: boolean;
  reason: string;
}

export function classifyWorkerResultGeneration(
  resultGeneration: number,
  currentGeneration: number,
  resultOwnerId: string,
  currentOwnerId: string,
): StaleResultClassification {
  if (resultGeneration < currentGeneration) {
    return {
      resultGeneration,
      currentGeneration,
      isStale: true,
      canReuse: false,
      reconciliationRequired: true,
      reason: `Result from old generation ${resultGeneration} cannot overwrite current generation ${currentGeneration}`,
    };
  }

  if (resultGeneration > currentGeneration) {
    return {
      resultGeneration,
      currentGeneration,
      isStale: true,
      canReuse: false,
      reconciliationRequired: true,
      reason: `Result from future generation ${resultGeneration} is invalid (current: ${currentGeneration})`,
    };
  }

  if (resultOwnerId !== currentOwnerId) {
    return {
      resultGeneration,
      currentGeneration,
      isStale: true,
      canReuse: false,
      reconciliationRequired: true,
      reason: `Result from different owner for same generation is not acceptable`,
    };
  }

  return {
    resultGeneration,
    currentGeneration,
    isStale: false,
    canReuse: true,
    reconciliationRequired: false,
    reason: "Result matches current generation and owner",
  };
}
