import type { MemoryBindingResult } from "./memory-binding";

export interface MemoryRevalidationRequest {
  schedulerTaskReferenceId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  memoryRecordIds: readonly string[];
  memoryTierIds: readonly string[];
  memoryAccessProfileId: string;
  contextPackageId: string;
  contextProvenanceDecisionId: string;
  permissionDecisionId: string;
  retentionPolicyId: string;
  poisoningDecisionIds: readonly string[];
  quarantineDecisionIds: readonly string[];
  tombstoneDecisionIds: readonly string[];
  canonicalSourceReferenceIds: readonly string[];
  operationalLedgerReferenceIds: readonly string[];
  scopeHash: string;
  reason: string;
  evaluatedAt: string;
  contractVersion: string;
  evidenceArtifactIds: readonly string[];
}

export interface MemoryRevalidationResult {
  schedulerTaskReferenceId: string;
  workflowId: string;
  runtimeId: string;
  memoryAuthorityGranted: false;
  approvalAuthorityGranted: false;
  executionAuthorityGranted: false;
  P0WriterPathPresent: false;
  revalidationRequired: boolean;
  reconciliationRequired: boolean;
  denialReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export function revalidateMemoryReferences(request: MemoryRevalidationRequest): MemoryRevalidationResult {
  const denialReasons = new Set<string>();
  const invalid = request.memoryRecordIds.some((id) => /deleted|tombstoned|quarantined/i.test(id)) || request.tombstoneDecisionIds.length > 0 || request.quarantineDecisionIds.length > 0;

  if (invalid) {
    denialReasons.add("deleted-memory-or-tombstone");
  }
  if (!request.memoryAccessProfileId) {
    denialReasons.add("missing-memory-access-profile");
  }
  if (!request.contextProvenanceDecisionId) {
    denialReasons.add("missing-context-provenance");
  }
  if (!request.permissionDecisionId) {
    denialReasons.add("missing-permission-decision");
  }
  if (!request.retentionPolicyId) {
    denialReasons.add("missing-retention-policy");
  }
  if (request.memoryTierIds.includes("P0")) {
    denialReasons.add("p0-writer-path-rejected");
  }

  const result: MemoryRevalidationResult = {
    schedulerTaskReferenceId: request.schedulerTaskReferenceId,
    workflowId: request.workflowId,
    runtimeId: request.runtimeId,
    memoryAuthorityGranted: false,
    approvalAuthorityGranted: false,
    executionAuthorityGranted: false,
    P0WriterPathPresent: false,
    revalidationRequired: invalid || denialReasons.size > 0,
    reconciliationRequired: invalid,
    denialReasons: [...denialReasons],
    evidenceArtifactIds: [...request.evidenceArtifactIds],
    evaluatedAt: request.evaluatedAt,
    contractVersion: request.contractVersion,
  };

  return result;
}
