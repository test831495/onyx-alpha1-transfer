export const MEMORY_BINDING_DECISION_VALUES = [
  "MEMORY_REFERENCE_ELIGIBLE_AS_PROJECTION",
  "CONTEXT_REFERENCE_ELIGIBLE_AS_PROJECTION",
  "READ_ONLY_MEMORY_ELIGIBLE_AS_PROJECTION",
  "DENIED_ACCESS_PROFILE",
  "DENIED_PERMISSION",
  "DENIED_RETENTION",
  "DENIED_PROVENANCE",
  "DENIED_POISONED",
  "DENIED_QUARANTINED",
  "DENIED_TOMBSTONED",
  "DENIED_CANONICAL_SOURCE",
  "DENIED_PERSONA_BOUNDARY",
  "REQUIRES_REVALIDATION",
  "REQUIRES_RECONCILIATION",
  "FAILED_SAFE",
  "PROHIBITED",
] as const;

export type MemoryBindingDecision = (typeof MEMORY_BINDING_DECISION_VALUES)[number];

export interface MemoryBindingRequest {
  memoryBindingDecisionId: string;
  schedulerTaskReferenceId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  agentIdentityId: string;
  personaContextId: string;
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
  requestedOperation: string;
  requestedAt: string;
  contractVersion: string;
  evidenceArtifactIds: readonly string[];
}

export interface MemoryBindingResult {
  memoryBindingDecisionId: string;
  schedulerTaskReferenceId: string;
  decision: MemoryBindingDecision;
  validatedMemoryRecordIds: readonly string[];
  rejectedMemoryRecordIds: readonly string[];
  validatedContextPackageId: string;
  memoryTierCompatibility: readonly string[];
  accessProfileValid: boolean;
  permissionValid: boolean;
  retentionValid: boolean;
  provenanceValid: boolean;
  poisoningClear: boolean;
  quarantineClear: boolean;
  tombstoneClear: boolean;
  canonicalSourceAuthorityPreserved: boolean;
  operationalLedgerBoundaryPreserved: boolean;
  P0WriterPathPresent: false;
  memoryAuthorityGranted: false;
  approvalAuthorityGranted: false;
  executionAuthorityGranted: false;
  revalidationRequired: boolean;
  reconciliationRequired: boolean;
  denialReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export function evaluateMemoryBinding(request: MemoryBindingRequest): MemoryBindingResult {
  const denialReasons: string[] = [];
  const memoryRecordIds = [...request.memoryRecordIds];
  const validRecords = memoryRecordIds.filter((id) => !/deleted|tombstoned|quarantined/i.test(id));
  const rejected = memoryRecordIds.filter((id) => /deleted|tombstoned|quarantined/i.test(id));

  const accessProfileValid = Boolean(request.memoryAccessProfileId && request.memoryAccessProfileId.startsWith("mem-access"));
  const permissionValid = Boolean(request.permissionDecisionId && request.permissionDecisionId.startsWith("perm-"));
  const retentionValid = Boolean(request.retentionPolicyId && request.retentionPolicyId.startsWith("ret-"));
  const provenanceValid = Boolean(request.contextProvenanceDecisionId && request.contextProvenanceDecisionId.startsWith("ctx-prov-"));
  const poisoningClear = request.poisoningDecisionIds.length === 0;
  const quarantineClear = request.quarantineDecisionIds.length === 0;
  const tombstoneClear = request.tombstoneDecisionIds.length === 0 && rejected.length === 0;
  const canonicalSourceAuthorityPreserved = request.canonicalSourceReferenceIds.length > 0;
  const operationalLedgerBoundaryPreserved = request.operationalLedgerReferenceIds.length > 0;

  if (!accessProfileValid) denialReasons.push("access-profile-invalid");
  if (!permissionValid) denialReasons.push("permission-invalid");
  if (!retentionValid) denialReasons.push("retention-invalid");
  if (!provenanceValid) denialReasons.push("provenance-invalid");
  if (!poisoningClear) denialReasons.push("poisoned-memory");
  if (!quarantineClear) denialReasons.push("quarantined-memory");
  if (!tombstoneClear) denialReasons.push("tombstoned-memory");
  if (!canonicalSourceAuthorityPreserved) denialReasons.push("canonical-source-invalid");
  if (!operationalLedgerBoundaryPreserved) denialReasons.push("operational-ledger-boundary-invalid");
  if (request.memoryTierIds.includes("P0")) denialReasons.push("p0-writer-path-rejected");

  let decision: MemoryBindingDecision = "MEMORY_REFERENCE_ELIGIBLE_AS_PROJECTION";
  if (!accessProfileValid) decision = "DENIED_ACCESS_PROFILE";
  else if (!permissionValid) decision = "DENIED_PERMISSION";
  else if (!retentionValid) decision = "DENIED_RETENTION";
  else if (!provenanceValid) decision = "DENIED_PROVENANCE";
  else if (!poisoningClear) decision = "DENIED_POISONED";
  else if (!quarantineClear) decision = "DENIED_QUARANTINED";
  else if (!tombstoneClear) decision = "DENIED_TOMBSTONED";
  else if (!canonicalSourceAuthorityPreserved) decision = "DENIED_CANONICAL_SOURCE";
  else if (!operationalLedgerBoundaryPreserved) decision = "DENIED_PERSONA_BOUNDARY";
  else if (request.memoryTierIds.includes("P0")) decision = "PROHIBITED";
  else if (request.requestedOperation === "CONTEXT_REFERENCE_ELIGIBLE_AS_PROJECTION") decision = "CONTEXT_REFERENCE_ELIGIBLE_AS_PROJECTION";
  else if (request.requestedOperation === "READ_ONLY_MEMORY_ELIGIBLE_AS_PROJECTION" && request.memoryRecordIds.length === 0) decision = "READ_ONLY_MEMORY_ELIGIBLE_AS_PROJECTION";

  const result: MemoryBindingResult = {
    memoryBindingDecisionId: request.memoryBindingDecisionId,
    schedulerTaskReferenceId: request.schedulerTaskReferenceId,
    decision,
    validatedMemoryRecordIds: validRecords,
    rejectedMemoryRecordIds: rejected,
    validatedContextPackageId: request.contextPackageId,
    memoryTierCompatibility: [...request.memoryTierIds],
    accessProfileValid,
    permissionValid,
    retentionValid,
    provenanceValid,
    poisoningClear,
    quarantineClear,
    tombstoneClear,
    canonicalSourceAuthorityPreserved,
    operationalLedgerBoundaryPreserved,
    P0WriterPathPresent: false,
    memoryAuthorityGranted: false,
    approvalAuthorityGranted: false,
    executionAuthorityGranted: false,
    revalidationRequired: denialReasons.length > 0 || request.tombstoneDecisionIds.length > 0,
    reconciliationRequired: denialReasons.length > 0,
    denialReasons,
    evidenceArtifactIds: [...request.evidenceArtifactIds],
    evaluatedAt: new Date().toISOString(),
    contractVersion: request.contractVersion,
  };

  return result;
}
