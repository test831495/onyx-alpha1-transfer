import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";

export interface RestartReconstructionRequest {
  restartReconstructionDecisionId: string;
  schedulerRunId: string;
  workflowIds: readonly string[];
  runtimeIds: readonly string[];
  taskReferenceIds: readonly string[];
  leaseIds: readonly string[];
  heartbeatDecisionIds: readonly string[];
  lockIds: readonly string[];
  checkpointIds: readonly string[];
  dependencySnapshotIds: readonly string[];
  joinDecisionIds: readonly string[];
  budgetDecisionIds: readonly string[];
  cancellationDecisionIds: readonly string[];
  approvalIds: readonly string[];
  permissionDecisionIds: readonly string[];
  memoryDecisionIds: readonly string[];
  connectorDecisionIds: readonly string[];
  contextPackageIds: readonly string[];
  tombstoneDecisionIds: readonly string[];
  evidenceArtifactIds: readonly string[];
  restartDetectedAt: string;
  contractVersion: string;
  invalidLeaseIds?: readonly string[];
  invalidLockIds?: readonly string[];
  invalidApprovalIds?: readonly string[];
  invalidPermissionDecisionIds?: readonly string[];
  invalidMemoryDecisionIds?: readonly string[];
  invalidConnectorDecisionIds?: readonly string[];
  invalidContextPackageIds?: readonly string[];
}

export interface RestartReconstructionResult {
  restartReconstructionDecisionId: string;
  validatedWorkflowIds: readonly string[];
  validatedRuntimeIds: readonly string[];
  reconstructableTaskReferenceIds: readonly string[];
  blockedTaskReferenceIds: readonly string[];
  reconciliationTaskReferenceIds: readonly string[];
  invalidLeaseIds: readonly string[];
  invalidLockIds: readonly string[];
  trustedCheckpointIds: readonly string[];
  invalidCheckpointIds: readonly string[];
  invalidApprovalIds: readonly string[];
  invalidPermissionDecisionIds: readonly string[];
  invalidMemoryDecisionIds: readonly string[];
  invalidConnectorDecisionIds: readonly string[];
  invalidContextPackageIds: readonly string[];
  missingEvidenceArtifactIds: readonly string[];
  recommendedLaneStage: "S0_SINGLE" | "S4_STABILIZE_TWO" | "PROHIBITED";
  automaticReconstructionPermitted: boolean;
  reconciliationRequired: boolean;
  denialReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export function evaluateRestartReconstruction(
  request: RestartReconstructionRequest,
): RestartReconstructionResult {
  const invalidLeaseIds = request.invalidLeaseIds ?? [];
  const invalidLockIds = request.invalidLockIds ?? [];
  const invalidApprovalIds = request.invalidApprovalIds ?? [];
  const invalidPermissionDecisionIds = request.invalidPermissionDecisionIds ?? [];
  const invalidMemoryDecisionIds = request.invalidMemoryDecisionIds ?? [];
  const invalidConnectorDecisionIds = request.invalidConnectorDecisionIds ?? [];
  const invalidContextPackageIds = request.invalidContextPackageIds ?? [];

  const denialReasons: string[] = [];
  if (invalidLeaseIds.length) denialReasons.push("expired-lease-detected");
  if (invalidLockIds.length) denialReasons.push("invalid-lock-detected");
  if (invalidApprovalIds.length) denialReasons.push("invalid-approval-detected");
  if (invalidPermissionDecisionIds.length) denialReasons.push("invalid-permission-detected");
  if (invalidMemoryDecisionIds.length) denialReasons.push("invalid-memory-detected");
  if (invalidConnectorDecisionIds.length) denialReasons.push("invalid-connector-detected");
  if (invalidContextPackageIds.length) denialReasons.push("invalid-context-detected");
  if (request.tombstoneDecisionIds.length) denialReasons.push("tombstoned-memory-resisted");
  if (request.evidenceArtifactIds.length === 0) denialReasons.push("missing-evidence");

  const automaticReconstructionPermitted = denialReasons.length === 0;

  return {
    restartReconstructionDecisionId: request.restartReconstructionDecisionId,
    validatedWorkflowIds: request.workflowIds,
    validatedRuntimeIds: request.runtimeIds,
    reconstructableTaskReferenceIds: request.taskReferenceIds,
    blockedTaskReferenceIds: request.taskReferenceIds.filter(() => !automaticReconstructionPermitted),
    reconciliationTaskReferenceIds: request.taskReferenceIds.filter(() => !automaticReconstructionPermitted),
    invalidLeaseIds,
    invalidLockIds,
    trustedCheckpointIds: request.checkpointIds,
    invalidCheckpointIds: [],
    invalidApprovalIds,
    invalidPermissionDecisionIds,
    invalidMemoryDecisionIds,
    invalidConnectorDecisionIds,
    invalidContextPackageIds,
    missingEvidenceArtifactIds: request.evidenceArtifactIds.length === 0 ? ["evidence-missing"] : [],
    recommendedLaneStage: "S0_SINGLE",
    automaticReconstructionPermitted,
    reconciliationRequired: denialReasons.length > 0 || request.taskReferenceIds.length > 0,
    denialReasons,
    evidenceArtifactIds: request.evidenceArtifactIds,
    evaluatedAt: request.restartDetectedAt,
    contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
  };
}
