import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";
import { FAILURE_CLASSES, projectRecoveryFailureDisposition, type RecoveryFailureClass } from "./failure-disposition";

export interface RecoveryCoordinatorRequest {
  recoveryDecisionId: string;
  schedulerRunId: string;
  schedulerTaskReferenceId: string;
  taskId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  failureClass: RecoveryFailureClass | string;
  failureReferenceIds: readonly string[];
  currentWorkflowState: string;
  currentRuntimeState: string;
  lastTrustedWorkflowState: string;
  lastTrustedRuntimeState: string;
  leaseId: string;
  leaseGeneration: number;
  heartbeatDecisionId: string;
  lockIds: readonly string[];
  lockDecisionIds: readonly string[];
  checkpointId: string;
  checkpointVersion: number;
  checkpointDigest: string;
  safeResumeDecisionId: string;
  dependencyResolutionResultId: string;
  readySetDecisionId: string;
  laneControllerDecisionId: string;
  cancellationDecisionId: string;
  joinDecisionId: string;
  budgetDecisionId: string;
  budgetExhaustionDecisionId: string;
  approvalId: string;
  approvalStatus: string;
  permissionDecisionId: string;
  memoryAccessProfileId: string;
  memoryDecisionIds: readonly string[];
  connectorScopeIds: readonly string[];
  connectorDecisionIds: readonly string[];
  contextPackageId: string;
  contextProvenanceDecisionId: string;
  poisoningDecisionId: string;
  tombstoneDecisionIds: readonly string[];
  councilRecommendationId: string;
  councilDisagreementId: string;
  savedDraftId: string;
  savedDraftVersionId: string;
  draftApprovalValid: boolean;
  promotionCandidateId: string;
  promotionDecisionId: string;
  providerOutcome: "SUCCESS" | "FAILURE" | "UNCERTAIN" | "UNKNOWN";
  remoteSideEffectStatus: "NONE" | "KNOWN" | "NOT_APPLIED" | "UNCERTAIN" | "UNKNOWN";
  idempotencyKey: string;
  scopeHash: string;
  targetEnvironment: string;
  riskClass: string;
  operationClass: string;
  parallelSafetyClass: string;
  attemptNumber: number;
  maximumAttempts: number;
  requestedAt: string;
  contractVersion: string;
  evidenceArtifactIds: readonly string[];
}

export type RecoveryClassification =
  | "RECOVERY_NOT_REQUIRED"
  | "RECOVERY_CANDIDATE"
  | "RECOVERY_BLOCKED"
  | "RECONCILIATION_REQUIRED"
  | "ESCALATION_REQUIRED"
  | "FAILED_SAFE"
  | "PROHIBITED";

export interface RecoveryCoordinatorResult {
  recoveryDecisionId: string;
  schedulerTaskReferenceId: string;
  taskId: string;
  workflowId: string;
  failureClass: string;
  primaryDisposition: string;
  secondaryDispositionCandidates: readonly string[];
  automaticRetryPermitted: boolean;
  automaticResumePermitted: boolean;
  automaticReassignmentPermitted: boolean;
  rollbackCandidate: boolean;
  compensationCandidate: boolean;
  providerTruthRequired: boolean;
  RahulDecisionRequired: boolean;
  laneReductionRequired: boolean;
  recommendedLaneStage: string;
  reconciliationRequired: boolean;
  checkpointRequired: boolean;
  evidenceRequired: boolean;
  approvalRevalidationRequired: boolean;
  permissionRevalidationRequired: boolean;
  memoryRevalidationRequired: boolean;
  connectorRevalidationRequired: boolean;
  contextRevalidationRequired: boolean;
  draftRevalidationRequired: boolean;
  promotionBlocked: boolean;
  denialReasons: readonly string[];
  recoveryReasonCodes: readonly string[];
  reconciliationRecordIds: readonly string[];
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
  classification: RecoveryClassification;
}

export function evaluateRecoveryCoordinator(request: RecoveryCoordinatorRequest): RecoveryCoordinatorResult {
  const reasonSet = projectRecoveryFailureDisposition(request.failureClass);
  const uncertainExternal = request.remoteSideEffectStatus === "UNCERTAIN" || request.providerOutcome === "UNKNOWN" || request.providerOutcome === "UNCERTAIN";
  const invalidApproval = request.approvalStatus === "INVALIDATED" || request.approvalStatus === "EXPIRED" || request.approvalStatus === "MISMATCHED" || !request.draftApprovalValid;
  const hasCouncilDisagreement = !!request.councilDisagreementId && request.failureClass === "COUNCIL_DECISION_REQUIRED";
  const hasWorkflowDivergence = ["WORKFLOW_STATE_DIVERGENCE", "RUNTIME_STATE_DIVERGENCE", "SCOPE_DIVERGENCE"].includes(request.failureClass);

  let primaryDisposition = reasonSet.primaryDisposition;
  let classification: RecoveryClassification = "RECOVERY_CANDIDATE";
  let automaticRetryPermitted = true;
  let automaticResumePermitted = true;
  let automaticReassignmentPermitted = true;
  let rollbackCandidate = false;
  let compensationCandidate = false;
  let providerTruthRequired = false;
  let RahulDecisionRequired = false;
  let laneReductionRequired = false;
  let recommendedLaneStage = "S0_SINGLE";
  let reconciliationRequired = reasonSet.reconciliationRequired;
  let checkpointRequired = false;
  let evidenceRequired = request.evidenceArtifactIds.length > 0;
  let approvalRevalidationRequired = false;
  let permissionRevalidationRequired = false;
  let memoryRevalidationRequired = false;
  let connectorRevalidationRequired = false;
  let contextRevalidationRequired = false;
  let draftRevalidationRequired = false;
  let promotionBlocked = false;
  const denialReasons: string[] = [];
  const recoveryReasonCodes = [...reasonSet.recoveryReasonCodes];

  if (!(FAILURE_CLASSES as readonly string[]).includes(request.failureClass)) {
    primaryDisposition = "FAILED_SAFE";
    classification = "FAILED_SAFE";
    automaticRetryPermitted = false;
    automaticResumePermitted = false;
    automaticReassignmentPermitted = false;
    denialReasons.push("unknown-failure-class");
  }

  if (uncertainExternal || request.failureClass === "UNKNOWN_EXTERNAL_WRITE" || request.failureClass === "UNCERTAIN_REMOTE_EFFECT") {
    primaryDisposition = "RECONCILE_PROVIDER_TRUTH";
    providerTruthRequired = true;
    reconciliationRequired = true;
    automaticRetryPermitted = false;
    automaticResumePermitted = false;
    automaticReassignmentPermitted = false;
    classification = "RECONCILIATION_REQUIRED";
    denialReasons.push("provider-truth-required");
  }

  if (invalidApproval) {
    primaryDisposition = "RECONCILE_APPROVAL";
    approvalRevalidationRequired = true;
    automaticRetryPermitted = false;
    automaticResumePermitted = false;
    automaticReassignmentPermitted = false;
    classification = "RECOVERY_BLOCKED";
    denialReasons.push("approval-invalidated");
  }

  if (request.failureClass === "DRAFT_APPROVAL_INVALIDATED" || !request.draftApprovalValid) {
    primaryDisposition = "REVALIDATE_DRAFT";
    draftRevalidationRequired = true;
    automaticRetryPermitted = false;
    automaticResumePermitted = false;
    automaticReassignmentPermitted = false;
    classification = "RECOVERY_BLOCKED";
    denialReasons.push("draft-approval-invalidated");
  }

  if (hasCouncilDisagreement) {
    primaryDisposition = "ESCALATE_TO_RAHUL";
    RahulDecisionRequired = true;
    automaticRetryPermitted = false;
    automaticResumePermitted = false;
    automaticReassignmentPermitted = false;
    classification = "ESCALATION_REQUIRED";
    denialReasons.push("council-disagreement-required-rahul");
  }

  if (request.failureClass === "CHECKPOINT_CAS_CONFLICT") {
    primaryDisposition = "RELOAD_AND_REPLAN";
    automaticRetryPermitted = false;
    automaticResumePermitted = false;
    automaticReassignmentPermitted = false;
    checkpointRequired = true;
    classification = "RECOVERY_BLOCKED";
  }

  if (request.failureClass === "BUDGET_HARD_STOP") {
    primaryDisposition = "CHECKPOINT_AND_STOP";
    automaticRetryPermitted = false;
    automaticResumePermitted = false;
    checkpointRequired = true;
    classification = "RECOVERY_BLOCKED";
  }

  if (request.failureClass === "LEASE_LOST") {
    if (!uncertainExternal && request.approvalStatus === "VALID" && request.idempotencyKey) {
      primaryDisposition = "RESUME_CANDIDATE";
      automaticResumePermitted = true;
      automaticRetryPermitted = false;
      classification = "RECOVERY_CANDIDATE";
    } else {
      primaryDisposition = "RECONCILE_PROVIDER_TRUTH";
      providerTruthRequired = true;
      automaticResumePermitted = false;
      automaticRetryPermitted = false;
      classification = "RECONCILIATION_REQUIRED";
    }
  }

  if (hasWorkflowDivergence) {
    primaryDisposition = "REDUCE_TO_S0";
    laneReductionRequired = true;
    recommendedLaneStage = "S0_SINGLE";
    automaticRetryPermitted = false;
    automaticResumePermitted = false;
    automaticReassignmentPermitted = false;
    classification = "RECOVERY_BLOCKED";
    denialReasons.push("state-divergence-requires-s0");
  }

  if (request.failureClass === "PROMOTION_FAILED") {
    primaryDisposition = "ROLLBACK_CANDIDATE";
    promotionBlocked = true;
    rollbackCandidate = true;
    automaticRetryPermitted = false;
    automaticResumePermitted = false;
    automaticReassignmentPermitted = false;
    classification = "RECOVERY_BLOCKED";
  }

  if (request.failureClass === "WORKER_CRASHED") {
    primaryDisposition = "RECONCILE_RUNTIME_STATE";
    automaticRetryPermitted = false;
    automaticResumePermitted = false;
    automaticReassignmentPermitted = false;
    classification = "RECOVERY_BLOCKED";
  }

  if (request.failureClass === "LOCK_OWNER_LOST") {
    primaryDisposition = "RECONCILE_SCOPE";
    automaticRetryPermitted = false;
    automaticResumePermitted = false;
    automaticReassignmentPermitted = false;
    classification = "RECONCILIATION_REQUIRED";
  }

  if (request.failureClass === "ATTEMPT_EXHAUSTED") {
    automaticRetryPermitted = false;
    automaticResumePermitted = false;
    automaticReassignmentPermitted = false;
    classification = "RECOVERY_BLOCKED";
  }

  if (request.failureClass === "EVIDENCE_MISSING" || request.failureClass === "EVIDENCE_INVALID") {
    primaryDisposition = "FAILED_SAFE";
    evidenceRequired = true;
    classification = "RECOVERY_BLOCKED";
    automaticRetryPermitted = false;
    automaticResumePermitted = false;
    automaticReassignmentPermitted = false;
  }

  if (request.failureClass === "MEMORY_SCOPE_INVALIDATED") memoryRevalidationRequired = true;
  if (request.failureClass === "CONNECTOR_SCOPE_INVALIDATED") connectorRevalidationRequired = true;
  if (request.failureClass === "APPROVAL_INVALIDATED") approvalRevalidationRequired = true;
  if (request.failureClass === "PERMISSION_INVALIDATED") permissionRevalidationRequired = true;
  if (request.failureClass === "CONTEXT_PROVENANCE_INVALID" || request.failureClass === "CONTEXT_POISONED" || request.failureClass === "CONTEXT_QUARANTINED") contextRevalidationRequired = true;

  return {
    recoveryDecisionId: request.recoveryDecisionId,
    schedulerTaskReferenceId: request.schedulerTaskReferenceId,
    taskId: request.taskId,
    workflowId: request.workflowId,
    failureClass: request.failureClass,
    primaryDisposition,
    secondaryDispositionCandidates: reasonSet.secondaryDispositionCandidates,
    automaticRetryPermitted,
    automaticResumePermitted,
    automaticReassignmentPermitted,
    rollbackCandidate,
    compensationCandidate,
    providerTruthRequired,
    RahulDecisionRequired,
    laneReductionRequired,
    recommendedLaneStage,
    reconciliationRequired,
    checkpointRequired,
    evidenceRequired,
    approvalRevalidationRequired,
    permissionRevalidationRequired,
    memoryRevalidationRequired,
    connectorRevalidationRequired,
    contextRevalidationRequired,
    draftRevalidationRequired,
    promotionBlocked,
    denialReasons: [...denialReasons],
    recoveryReasonCodes,
    reconciliationRecordIds: request.failureReferenceIds,
    evidenceArtifactIds: request.evidenceArtifactIds,
    evaluatedAt: request.requestedAt,
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
    classification,
  };
}
