import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";
import { makeId } from "../shared/identifiers";

/**
 * StaleWorkerResult: Deterministic evaluation of late stale worker results for Wave 2C.
 *
 * Rules:
 * - Older-generation results must never overwrite current state
 * - Wrong-owner results must never overwrite current state
 * - Uncertain remote results must require reconciliation
 * - A compatible-reuse candidate must still require validation
 * - Duplicate deterministic results must remain auditable
 * - Do not merge or accept results automatically
 * - Do not perform provider reconciliation
 */

export interface StaleWorkerResultRequest {
  staleWorkerResultDecisionId: string;
  taskId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  resultAgentId: string;
  resultLeaseId: string;
  resultLeaseGeneration: number;
  currentLeaseId: string;
  currentLeaseGeneration: number;
  currentOwnerAgentId: string;
  resultCheckpointDigest: string;
  currentCheckpointDigest: string;
  providerOutcome: "SUCCESS" | "FAILURE" | "UNCERTAIN" | "UNKNOWN";
  remoteSideEffectStatus: "APPLIED" | "NOT_APPLIED" | "UNCERTAIN" | "UNKNOWN";
  idempotencyKey: string;
  resultEvidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export type StaleWorkerResultDecision =
  | "CURRENT_OWNER_RESULT"
  | "STALE_RESULT_QUARANTINED"
  | "LATE_RESULT_COMPATIBLE_REUSE_CANDIDATE"
  | "DUPLICATE_RESULT"
  | "CONFLICTING_RESULT"
  | "UNCERTAIN_REMOTE_RESULT"
  | "REQUIRES_RECONCILIATION"
  | "PROHIBITED";

export interface StaleWorkerResultResponse {
  staleWorkerResultDecisionId: string;
  taskId: string;
  decision: StaleWorkerResultDecision;
  reconciliationRequired: boolean;
  canApplyResult: boolean;
  quarantineRecommended: boolean;
  manualReviewRequired: boolean;
  reasonCodes: readonly string[];
  evidenceArtifactIds: readonly string[];
  contractVersion: string;
}

/**
 * Evaluate a late or stale worker result.
 *
 * Rules:
 * - Older-generation results must never overwrite current state
 * - Wrong-owner results must never overwrite current state
 * - Uncertain remote results must require reconciliation
 * - A compatible-reuse candidate must still require validation
 * - Duplicate deterministic results must remain auditable
 * - Do not merge or accept results automatically
 * - Do not perform provider reconciliation
 */
export function evaluateStaleWorkerResult(request: StaleWorkerResultRequest): StaleWorkerResultResponse {
  const result: StaleWorkerResultResponse = {
    staleWorkerResultDecisionId: request.staleWorkerResultDecisionId,
    taskId: request.taskId,
    decision: "PROHIBITED",
    reconciliationRequired: false,
    canApplyResult: false,
    quarantineRecommended: false,
    manualReviewRequired: false,
    reasonCodes: [],
    evidenceArtifactIds: request.resultEvidenceArtifactIds,
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  };

  const reasonCodes: string[] = [];

  // Validate contract version
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    reasonCodes.push("CONTRACT_VERSION_MISMATCH");
    result.decision = "PROHIBITED";
    result.reasonCodes = reasonCodes;
    return result;
  }

  // Check if result is from current lease and owner
  const isCurrentGeneration = request.resultLeaseGeneration === request.currentLeaseGeneration;
  const isCurrentOwner = request.resultAgentId === request.currentOwnerAgentId;
  const isCurrentLease = request.resultLeaseId === request.currentLeaseId;

  // Current owner result - can apply if all other conditions are met
  if (isCurrentGeneration && isCurrentOwner && isCurrentLease) {
    // Check provider outcome
    if (request.providerOutcome === "UNCERTAIN" || request.remoteSideEffectStatus === "UNCERTAIN") {
      reasonCodes.push("UNCERTAIN_REMOTE_OUTCOME");
      result.decision = "UNCERTAIN_REMOTE_RESULT";
      result.reconciliationRequired = true;
      result.canApplyResult = false;
      result.quarantineRecommended = false;
      result.manualReviewRequired = true;
      result.reasonCodes = reasonCodes;
      return result;
    }

    // Check for duplicate or conflicting results
    if (request.resultCheckpointDigest === request.currentCheckpointDigest) {
      reasonCodes.push("DUPLICATE_CHECKPOINT");
      result.decision = "DUPLICATE_RESULT";
      result.reconciliationRequired = false;
      result.canApplyResult = true;
      result.quarantineRecommended = false;
      result.manualReviewRequired = false;
      result.reasonCodes = reasonCodes;
      return result;
    }

    if (request.resultCheckpointDigest !== request.currentCheckpointDigest && request.currentCheckpointDigest) {
      // Checkpoint changed from what we had
      reasonCodes.push("CHECKPOINT_MISMATCH");
      result.decision = "CONFLICTING_RESULT";
      result.reconciliationRequired = true;
      result.canApplyResult = false;
      result.quarantineRecommended = true;
      result.manualReviewRequired = true;
      result.reasonCodes = reasonCodes;
      return result;
    }

    // Current owner result - can be applied
    result.decision = "CURRENT_OWNER_RESULT";
    result.reconciliationRequired = false;
    result.canApplyResult = true;
    result.quarantineRecommended = false;
    result.manualReviewRequired = false;
    result.reasonCodes = [];
    return result;
  }

  // Old generation result
  if (request.resultLeaseGeneration < request.currentLeaseGeneration) {
    reasonCodes.push("STALE_GENERATION");
    reasonCodes.push(`Result from generation ${request.resultLeaseGeneration}, current is ${request.currentLeaseGeneration}`);
    result.decision = "STALE_RESULT_QUARANTINED";
    result.reconciliationRequired = true;
    result.canApplyResult = false;
    result.quarantineRecommended = true;
    result.manualReviewRequired = true;
    result.reasonCodes = reasonCodes;
    return result;
  }

  // Future generation result (should not happen)
  if (request.resultLeaseGeneration > request.currentLeaseGeneration) {
    reasonCodes.push("FUTURE_GENERATION");
    reasonCodes.push(`Result from future generation ${request.resultLeaseGeneration}, current is ${request.currentLeaseGeneration}`);
    result.decision = "REQUIRES_RECONCILIATION";
    result.reconciliationRequired = true;
    result.canApplyResult = false;
    result.quarantineRecommended = true;
    result.manualReviewRequired = true;
    result.reasonCodes = reasonCodes;
    return result;
  }

  // Same generation but different owner
  if (isCurrentGeneration && !isCurrentOwner) {
    reasonCodes.push("WRONG_OWNER");
    reasonCodes.push(`Result from ${request.resultAgentId}, current owner is ${request.currentOwnerAgentId}`);
    result.decision = "STALE_RESULT_QUARANTINED";
    result.reconciliationRequired = true;
    result.canApplyResult = false;
    result.quarantineRecommended = true;
    result.manualReviewRequired = true;
    result.reasonCodes = reasonCodes;
    return result;
  }

  // Uncertain remote outcome
  if (request.providerOutcome === "UNCERTAIN" || request.remoteSideEffectStatus === "UNCERTAIN") {
    reasonCodes.push("UNCERTAIN_REMOTE_OUTCOME");
    result.decision = "UNCERTAIN_REMOTE_RESULT";
    result.reconciliationRequired = true;
    result.canApplyResult = false;
    result.quarantineRecommended = true;
    result.manualReviewRequired = true;
    result.reasonCodes = reasonCodes;
    return result;
  }

  // Check idempotency key
  if (!request.idempotencyKey) {
    reasonCodes.push("MISSING_IDEMPOTENCY_KEY");
    result.decision = "LATE_RESULT_COMPATIBLE_REUSE_CANDIDATE";
    result.reconciliationRequired = true;
    result.canApplyResult = false;
    result.quarantineRecommended = true;
    result.manualReviewRequired = true;
    result.reasonCodes = reasonCodes;
    return result;
  }

  // Compatible reuse candidate but still requires validation
  reasonCodes.push("COMPATIBLE_REUSE_CANDIDATE");
  reasonCodes.push("Manual validation required despite compatibility");
  result.decision = "LATE_RESULT_COMPATIBLE_REUSE_CANDIDATE";
  result.reconciliationRequired = true;
  result.canApplyResult = false;
  result.quarantineRecommended = false;
  result.manualReviewRequired = true;
  result.reasonCodes = reasonCodes;
  return result;
}

/**
 * Recovery Handoff Projection - recommend disposition for expired lease recovery.
 *
 * Reuses Phase 1A.8 Abandoned Task Recovery contract.
 * Evaluates recovery eligibility without performing actual reassignment.
 */

export interface RecoveryHandoffProjectionRequest {
  recoveryHandoffDecisionId: string;
  taskId: string;
  expiredLeaseId: string;
  expiredGeneration: number;
  lastOwnerAgentId: string;
  lastHeartbeatSequence: number;
  lastHeartbeatAt: string;
  lastTrustedCheckpointDigest: string;
  providerOutcome: "SUCCESS" | "FAILURE" | "UNCERTAIN" | "UNKNOWN";
  remoteSideEffectStatus: "APPLIED" | "NOT_APPLIED" | "UNCERTAIN" | "UNKNOWN";
  idempotencyKey: string;
  approvalId: string;
  scopeHash: string;
  permissionProfileId: string;
  memoryAccessProfileId: string;
  connectorScopeIds: readonly string[];
  approvalExpiryTime: string;
  agentRevocationStatus: string;
  scopeValidityStatus: string;
  permissionValidityStatus: string;
  memoryAccessValidityStatus: string;
  connectorAccessValidityStatus: string;
  checkpointValidityStatus: string;
  promotionRequiredForTask: boolean;
  evaluatedAt: string;
  contractVersion: string;
}

export type RecoveryDisposition =
  | "SAFE_RESUME_CANDIDATE"
  | "SAFE_REASSIGNMENT_CANDIDATE"
  | "WAIT_FOR_OWNER"
  | "FAILED_SAFE"
  | "RECONCILE_REMOTE_EFFECT"
  | "RECONCILE_CHECKPOINT"
  | "RECONCILE_SCOPE"
  | "RECONCILE_APPROVAL"
  | "RECONCILE_PERMISSION"
  | "RECONCILE_MEMORY_SCOPE"
  | "RECONCILE_CONNECTOR_SCOPE"
  | "PROHIBITED";

export interface RecoveryHandoffProjectionResult {
  recoveryHandoffDecisionId: string;
  taskId: string;
  recommendedDisposition: RecoveryDisposition;
  automaticReassignmentPermitted: boolean;
  manualReconciliationRequired: boolean;
  dispositionReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
  contractVersion: string;
}

/**
 * Project recovery handoff recommendation for an expired lease.
 *
 * Automatic reassignment must be false when:
 * - Remote result is uncertain
 * - Remote side effect is unknown
 * - Approval expired or changed
 * - Scope changed
 * - Permission changed
 * - Memory scope changed
 * - Connector scope changed
 * - Checkpoint lineage is invalid
 * - Idempotency key is missing where required
 * - Task is promotion only
 * - Risk class requires fresh approval
 * - Agent revocation requires review
 *
 * Recovery handoff is a recommendation only.
 * Do not execute recovery or reassignment.
 */
export function projectRecoveryHandoff(request: RecoveryHandoffProjectionRequest): RecoveryHandoffProjectionResult {
  const result: RecoveryHandoffProjectionResult = {
    recoveryHandoffDecisionId: request.recoveryHandoffDecisionId,
    taskId: request.taskId,
    recommendedDisposition: "PROHIBITED",
    automaticReassignmentPermitted: false,
    manualReconciliationRequired: false,
    dispositionReasons: [],
    evidenceArtifactIds: [],
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  };

  const reasons: string[] = [];

  // Check contract version
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    reasons.push("Contract version mismatch");
    result.recommendedDisposition = "PROHIBITED";
    result.dispositionReasons = reasons;
    return result;
  }

  // Remote result is uncertain
  if (request.providerOutcome === "UNCERTAIN" || request.remoteSideEffectStatus === "UNCERTAIN") {
    reasons.push("Remote outcome is uncertain");
    result.recommendedDisposition = "RECONCILE_REMOTE_EFFECT";
    result.automaticReassignmentPermitted = false;
    result.manualReconciliationRequired = true;
    result.dispositionReasons = reasons;
    return result;
  }

  // Idempotency key missing
  if (!request.idempotencyKey) {
    reasons.push("Idempotency key missing");
    result.recommendedDisposition = "RECONCILE_REMOTE_EFFECT";
    result.automaticReassignmentPermitted = false;
    result.manualReconciliationRequired = true;
    result.dispositionReasons = reasons;
    return result;
  }

  // Approval expired or invalid
  const approvalExpiry = new Date(request.approvalExpiryTime).getTime();
  const evaluatedTime = new Date(request.evaluatedAt).getTime();

  if (approvalExpiry <= evaluatedTime) {
    reasons.push("Approval has expired");
    result.recommendedDisposition = "RECONCILE_APPROVAL";
    result.automaticReassignmentPermitted = false;
    result.manualReconciliationRequired = true;
    result.dispositionReasons = reasons;
    return result;
  }

  if (!request.approvalId) {
    reasons.push("Approval ID missing");
    result.recommendedDisposition = "RECONCILE_APPROVAL";
    result.automaticReassignmentPermitted = false;
    result.manualReconciliationRequired = true;
    result.dispositionReasons = reasons;
    return result;
  }

  // Scope invalidated
  if (request.scopeValidityStatus !== "VALID") {
    reasons.push(`Scope is invalid: ${request.scopeValidityStatus}`);
    result.recommendedDisposition = "RECONCILE_SCOPE";
    result.automaticReassignmentPermitted = false;
    result.manualReconciliationRequired = true;
    result.dispositionReasons = reasons;
    return result;
  }

  // Permission invalidated
  if (request.permissionValidityStatus !== "VALID") {
    reasons.push(`Permission is invalid: ${request.permissionValidityStatus}`);
    result.recommendedDisposition = "RECONCILE_PERMISSION";
    result.automaticReassignmentPermitted = false;
    result.manualReconciliationRequired = true;
    result.dispositionReasons = reasons;
    return result;
  }

  // Memory access invalidated
  if (request.memoryAccessValidityStatus !== "VALID") {
    reasons.push(`Memory access is invalid: ${request.memoryAccessValidityStatus}`);
    result.recommendedDisposition = "RECONCILE_MEMORY_SCOPE";
    result.automaticReassignmentPermitted = false;
    result.manualReconciliationRequired = true;
    result.dispositionReasons = reasons;
    return result;
  }

  // Connector access invalidated
  if (request.connectorAccessValidityStatus !== "VALID") {
    reasons.push(`Connector access is invalid: ${request.connectorAccessValidityStatus}`);
    result.recommendedDisposition = "RECONCILE_CONNECTOR_SCOPE";
    result.automaticReassignmentPermitted = false;
    result.manualReconciliationRequired = true;
    result.dispositionReasons = reasons;
    return result;
  }

  // Checkpoint invalidated
  if (request.checkpointValidityStatus !== "VALID") {
    reasons.push(`Checkpoint is invalid: ${request.checkpointValidityStatus}`);
    result.recommendedDisposition = "RECONCILE_CHECKPOINT";
    result.automaticReassignmentPermitted = false;
    result.manualReconciliationRequired = true;
    result.dispositionReasons = reasons;
    return result;
  }

  // Task is promotion-only
  if (request.promotionRequiredForTask) {
    reasons.push("Task is promotion-only and cannot be automatically reassigned");
    result.recommendedDisposition = "WAIT_FOR_OWNER";
    result.automaticReassignmentPermitted = false;
    result.manualReconciliationRequired = true;
    result.dispositionReasons = reasons;
    return result;
  }

  // Agent revocation status requires review
  if (request.agentRevocationStatus === "REVOKED" || request.agentRevocationStatus === "DEREGISTERED") {
    reasons.push(`Agent status: ${request.agentRevocationStatus}`);
    result.recommendedDisposition = "WAIT_FOR_OWNER";
    result.automaticReassignmentPermitted = false;
    result.manualReconciliationRequired = true;
    result.dispositionReasons = reasons;
    return result;
  }

  // If we have a successful result with clear checkpoint and all valid, can resume or reassign
  if (request.providerOutcome === "SUCCESS") {
    reasons.push("Provider outcome is SUCCESS");
    if (request.remoteSideEffectStatus === "APPLIED") {
      reasons.push("Remote side effect was applied");
      result.recommendedDisposition = "SAFE_RESUME_CANDIDATE";
      result.automaticReassignmentPermitted = false; // Still requires manual review
      result.manualReconciliationRequired = false;
      result.dispositionReasons = reasons;
      return result;
    } else if (request.remoteSideEffectStatus === "NOT_APPLIED") {
      reasons.push("Remote side effect was not applied");
      result.recommendedDisposition = "SAFE_REASSIGNMENT_CANDIDATE";
      result.automaticReassignmentPermitted = false; // Still requires manual review
      result.manualReconciliationRequired = false;
      result.dispositionReasons = reasons;
      return result;
    }
  }

  // Default to safe handling
  if (request.providerOutcome === "FAILURE") {
    reasons.push("Provider outcome is FAILURE");
    result.recommendedDisposition = "SAFE_REASSIGNMENT_CANDIDATE";
    result.automaticReassignmentPermitted = false;
    result.manualReconciliationRequired = false;
    result.dispositionReasons = reasons;
    return result;
  }

  // Unknown or missing outcome
  reasons.push("Provider outcome is unknown or missing");
  result.recommendedDisposition = "FAILED_SAFE";
  result.automaticReassignmentPermitted = false;
  result.manualReconciliationRequired = true;
  result.dispositionReasons = reasons;
  return result;
}
