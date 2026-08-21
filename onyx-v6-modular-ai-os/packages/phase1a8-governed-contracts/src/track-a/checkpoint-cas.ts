import { AGENT_COORDINATION_CONTRACT_VERSION } from "../shared/versions";

export const CHECKPOINT_CAS_RESULTS = [
  "SUBMITTED",
  "APPLIED",
  "STALE_WRITER",
  "SEQUENCE_CONFLICT",
  "VERSION_CONFLICT",
  "SCOPE_CONFLICT",
  "APPROVAL_CONFLICT",
  "LEASE_CONFLICT",
  "RECONCILIATION_REQUIRED",
  "PROHIBITED",
] as const;
export type CheckpointCasResult = (typeof CHECKPOINT_CAS_RESULTS)[number];

export interface CheckpointRecord {
  checkpointId: string;
  workflowId: string;
  runtimeId: string;
  taskId: string;
  agentId: string;
  leaseId: string;
  sequence: number;
  version: number;
  previousDigest: string;
  digest: string;
  scopeHash: string;
  approvalDigest: string;
  contractVersion: string;
  hashChainValid: boolean;
  immutableGovernanceMetadata: boolean;
  prohibitedAction: boolean;
  changesPermissions: boolean;
  changesApprovalAuthority: boolean;
  changesPersonaP0: boolean;
  mergeEnabled: boolean;
  productionEnabled: boolean;
  forcePushEnabled: boolean;
  branchDeletionEnabled: boolean;
  secretAccessEnabled: boolean;
  permissionChangeEnabled: boolean;
  liveConnectorMutationEnabled: boolean;
  paidActionEnabled: boolean;
}

export interface CheckpointCasRequest {
  casRequestId: string;
  workflowId: string;
  runtimeId: string;
  taskId: string;
  agentId: string;
  leaseId: string;
  expectedCheckpointDigest: string;
  expectedSequence: number;
  expectedVersion: number;
  replacementCheckpoint: CheckpointRecord;
  scopeHash: string;
  approvalDigest: string;
  result: CheckpointCasResult;
  conflictDigest?: string;
  createdAt: string;
  evidenceReference: string;
  contractVersion: string;
  approvedLeaseStatus?: string;
}

export interface CheckpointCasOutcome extends CheckpointCasRequest {
  result: CheckpointCasResult;
  conflictDigest: string;
}

export function createCheckpointCasRequest(input: Partial<CheckpointCasRequest> & {
  casRequestId: string;
  workflowId: string;
  runtimeId: string;
  taskId: string;
  agentId: string;
  leaseId: string;
  expectedCheckpointDigest: string;
  expectedSequence: number;
  expectedVersion: number;
  replacementCheckpoint: CheckpointRecord;
  scopeHash: string;
  approvalDigest: string;
  createdAt: string;
  evidenceReference: string;
  canonicalLatest?: CheckpointRecord;
  approvedLeaseStatus?: string;
}): CheckpointCasRequest {
  const canonical = input.canonicalLatest ?? input.replacementCheckpoint;
  return {
    casRequestId: input.casRequestId,
    workflowId: input.workflowId,
    runtimeId: input.runtimeId,
    taskId: input.taskId,
    agentId: input.agentId,
    leaseId: input.leaseId,
    expectedCheckpointDigest: input.expectedCheckpointDigest,
    expectedSequence: input.expectedSequence,
    expectedVersion: input.expectedVersion,
    replacementCheckpoint: input.replacementCheckpoint,
    scopeHash: input.scopeHash,
    approvalDigest: input.approvalDigest,
    result: input.result ?? "SUBMITTED",
    conflictDigest: input.conflictDigest ?? "",
    createdAt: input.createdAt,
    evidenceReference: input.evidenceReference,
    contractVersion: AGENT_COORDINATION_CONTRACT_VERSION,
    approvedLeaseStatus: input.approvedLeaseStatus ?? (canonical ? "ACTIVE" : undefined),
  };
}

export function canLocalRetryCheckpointCas(request: CheckpointCasRequest): boolean {
  return request.result === "SEQUENCE_CONFLICT" || request.result === "VERSION_CONFLICT";
}

export function retryCheckpointCasLocally(
  request: CheckpointCasRequest,
  canonicalLatest: CheckpointRecord,
  nextCasRequestId: string,
): CheckpointCasRequest {
  if (!canLocalRetryCheckpointCas(request)) {
    throw new Error("Only deterministic sequence or version conflicts are eligible for a local CAS retry.");
  }

  return {
    ...request,
    casRequestId: nextCasRequestId,
    expectedCheckpointDigest: canonicalLatest.digest,
    expectedSequence: canonicalLatest.sequence,
    expectedVersion: canonicalLatest.version,
    result: "SUBMITTED",
    conflictDigest: "",
    evidenceReference: `${request.evidenceReference}-retry`,
  };
}

export function evaluateCheckpointCas(input: {
  canonicalLatest: CheckpointRecord;
  request: CheckpointCasRequest;
}): CheckpointCasOutcome {
  const { canonicalLatest, request } = input;
  const base: CheckpointCasOutcome = {
    ...request,
    result: request.result ?? "SUBMITTED",
    conflictDigest: request.conflictDigest ?? "",
  };

  if (!canonicalLatest || !canonicalLatest.hashChainValid) {
    return { ...base, result: "RECONCILIATION_REQUIRED", conflictDigest: "hash-chain-invalid" };
  }
  if (request.workflowId !== canonicalLatest.workflowId) {
    return { ...base, result: "RECONCILIATION_REQUIRED", conflictDigest: "workflow-mismatch" };
  }
  if (request.runtimeId !== canonicalLatest.runtimeId) {
    return { ...base, result: "RECONCILIATION_REQUIRED", conflictDigest: "runtime-mismatch" };
  }
  if (request.expectedCheckpointDigest !== canonicalLatest.digest) {
    return { ...base, result: "STALE_WRITER", conflictDigest: "stale-writer" };
  }
  if (request.expectedSequence !== canonicalLatest.sequence) {
    return { ...base, result: "SEQUENCE_CONFLICT", conflictDigest: "sequence-conflict" };
  }
  if (request.expectedVersion !== canonicalLatest.version) {
    return { ...base, result: "VERSION_CONFLICT", conflictDigest: "version-conflict" };
  }
  if (request.scopeHash !== canonicalLatest.scopeHash) {
    return { ...base, result: "SCOPE_CONFLICT", conflictDigest: "scope-conflict" };
  }
  if (request.approvalDigest !== canonicalLatest.approvalDigest) {
    return { ...base, result: "APPROVAL_CONFLICT", conflictDigest: "approval-conflict" };
  }
  if (request.leaseId !== canonicalLatest.leaseId || request.agentId !== canonicalLatest.agentId || request.taskId !== canonicalLatest.taskId) {
    return { ...base, result: "LEASE_CONFLICT", conflictDigest: "lease-conflict" };
  }
  if (request.approvedLeaseStatus !== "ACTIVE") {
    return { ...base, result: "LEASE_CONFLICT", conflictDigest: "lease-not-active" };
  }

  if (request.replacementCheckpoint.previousDigest !== canonicalLatest.digest) {
    return { ...base, result: "STALE_WRITER", conflictDigest: "replacement-previous-digest-mismatch" };
  }
  if (request.replacementCheckpoint.sequence !== canonicalLatest.sequence + 1) {
    return { ...base, result: "SEQUENCE_CONFLICT", conflictDigest: "replacement-sequence-mismatch" };
  }
  if (request.replacementCheckpoint.contractVersion !== "1.0.0") {
    return { ...base, result: "VERSION_CONFLICT", conflictDigest: "replacement-version-mismatch" };
  }
  if (
    request.replacementCheckpoint.immutableGovernanceMetadata ||
    request.replacementCheckpoint.prohibitedAction ||
    request.replacementCheckpoint.changesPermissions ||
    request.replacementCheckpoint.changesApprovalAuthority ||
    request.replacementCheckpoint.changesPersonaP0 ||
    request.replacementCheckpoint.mergeEnabled ||
    request.replacementCheckpoint.productionEnabled ||
    request.replacementCheckpoint.forcePushEnabled ||
    request.replacementCheckpoint.branchDeletionEnabled ||
    request.replacementCheckpoint.secretAccessEnabled ||
    request.replacementCheckpoint.permissionChangeEnabled ||
    request.replacementCheckpoint.liveConnectorMutationEnabled ||
    request.replacementCheckpoint.paidActionEnabled
  ) {
    return { ...base, result: "PROHIBITED", conflictDigest: "prohibited-action" };
  }

  const valid =
    request.workflowId === request.replacementCheckpoint.workflowId &&
    request.runtimeId === request.replacementCheckpoint.runtimeId &&
    request.taskId === request.replacementCheckpoint.taskId &&
    request.agentId === request.replacementCheckpoint.agentId &&
    request.leaseId === request.replacementCheckpoint.leaseId &&
    request.scopeHash === request.replacementCheckpoint.scopeHash &&
    request.approvalDigest === request.replacementCheckpoint.approvalDigest &&
    request.expectedCheckpointDigest === request.replacementCheckpoint.previousDigest &&
    request.expectedSequence === canonicalLatest.sequence &&
    request.expectedVersion === canonicalLatest.version;

  if (!valid) {
    return { ...base, result: "RECONCILIATION_REQUIRED", conflictDigest: "inconsistent-apply-state" };
  }

  return {
    ...base,
    result: "APPLIED",
    conflictDigest: "applied",
  };
}
