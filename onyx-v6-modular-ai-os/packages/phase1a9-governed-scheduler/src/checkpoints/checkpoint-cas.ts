export const CHECKPOINT_DECISIONS = ["CREATE_ELIGIBLE_AS_PROJECTION", "CAS_UPDATE_ELIGIBLE_AS_PROJECTION", "READ_COMPATIBLE", "DENIED_STALE_WRITER", "DENIED_VERSION_GAP", "DENIED_HASH_MISMATCH", "DENIED_PAYLOAD_DIGEST", "DENIED_SCHEMA", "DENIED_LINEAGE", "DENIED_LEASE", "DENIED_LOCK", "DENIED_SCOPE", "DENIED_APPROVAL", "DENIED_PERMISSION", "DENIED_MEMORY_SCOPE", "DENIED_CONNECTOR_SCOPE", "DENIED_RESUME_POINT", "REQUIRES_RECONCILIATION", "PROHIBITED"] as const;
export type CheckpointDecision = (typeof CHECKPOINT_DECISIONS)[number];
export const CHECKPOINT_INITIAL_VERSION = 0 as const;
export const CHECKPOINT_FIRST_VERSION = 1 as const;

export interface CheckpointValidationContext { expectedWorkflowId: string; expectedRuntimeId: string; expectedRuntimeSessionId: string; expectedTaskId: string; expectedLeaseId: string; expectedLeaseGeneration: number; expectedScopeHash: string; expectedLockIds: readonly string[]; expectedSchemaVersion: string; }
export interface CheckpointValidationInput { checkpointId: string; workflowId: string; runtimeId: string; runtimeSessionId: string; taskId: string; leaseId: string; leaseGeneration: number; lockIds: readonly string[]; stateHash: string; payloadReference: string; payloadDigest: string; scopeHash: string; schemaVersion: string; resumePoint: string; evidenceArtifactIds: readonly string[]; }
export interface CheckpointValidationResult { valid: boolean; stateHashValid: boolean; payloadDigestValid: boolean; scopeValid: boolean; lineageValid: boolean; resumePointValid: boolean; denialReasons: readonly string[]; }

export function validateCheckpointReferences(input: CheckpointValidationInput, context: CheckpointValidationContext): CheckpointValidationResult {
  const reasons: string[] = [];
  const stateHashValid = /^sha256:[a-f0-9]{64}$/.test(input.stateHash);
  const payloadDigestValid = /^sha256:[a-f0-9]{64}$/.test(input.payloadDigest) && /^ref:[A-Za-z0-9._:-]+$/.test(input.payloadReference);
  const scopeValid = input.scopeHash !== "" && input.scopeHash === context.expectedScopeHash;
  const lineageValid = input.workflowId === context.expectedWorkflowId && input.runtimeId === context.expectedRuntimeId && input.runtimeSessionId === context.expectedRuntimeSessionId && input.taskId === context.expectedTaskId && input.leaseId === context.expectedLeaseId && input.leaseGeneration === context.expectedLeaseGeneration && context.expectedLockIds.every((lockId) => input.lockIds.includes(lockId));
  const resumePointValid = /^[A-Za-z][A-Za-z0-9._:-]{0,127}$/.test(input.resumePoint);
  if (!input.checkpointId) reasons.push("checkpoint-identity-missing");
  if (!stateHashValid) reasons.push("state-hash-invalid");
  if (!payloadDigestValid) reasons.push("payload-reference-or-digest-invalid");
  if (!scopeValid) reasons.push("scope-mismatch");
  if (!lineageValid) reasons.push("lineage-mismatch");
  if (input.schemaVersion !== context.expectedSchemaVersion) reasons.push("schema-mismatch");
  if (!resumePointValid) reasons.push("resume-point-invalid");
  if (input.evidenceArtifactIds.length === 0) reasons.push("evidence-reference-missing");
  return { valid: reasons.length === 0, stateHashValid, payloadDigestValid, scopeValid, lineageValid, resumePointValid, denialReasons: reasons };
}

export type SchemaCompatibility = "EXACT_MATCH" | "BACKWARD_COMPATIBLE" | "FORWARD_COMPATIBLE_READ_ONLY" | "MIGRATION_REQUIRED" | "UNSUPPORTED" | "REQUIRES_RECONCILIATION";
export function evaluateSchemaCompatibility(current: string, candidate: string, mode: "read" | "write" = "write"): SchemaCompatibility { if (current === candidate) return "EXACT_MATCH"; const currentMajor = Number(current.split(".")[0]); const candidateMajor = Number(candidate.split(".")[0]); if (!Number.isInteger(currentMajor) || !Number.isInteger(candidateMajor)) return "UNSUPPORTED"; if (candidateMajor === currentMajor && candidateMajor < 2) return mode === "read" ? "BACKWARD_COMPATIBLE" : "MIGRATION_REQUIRED"; if (candidateMajor > currentMajor && mode === "read") return "FORWARD_COMPATIBLE_READ_ONLY"; return candidateMajor === currentMajor + 1 ? "MIGRATION_REQUIRED" : "UNSUPPORTED"; }

export interface SchedulerCheckpointCreateRequest { checkpointDecisionId: string; schedulerRunId: string; schedulerTaskReferenceId: string; taskId: string; workflowId: string; runtimeId: string; runtimeSessionId: string; agentId: string; leaseId: string; leaseGeneration: number; lockIds: readonly string[]; currentCheckpointId: string; currentCheckpointVersion: number; requestedCheckpointId: string; requestedCheckpointVersion: number; stateHash: string; payloadReference: string; payloadDigest: string; schemaVersion: string; resumePoint: string; scopeHash: string; approvalId: string; permissionProfileId: string; memoryAccessProfileId: string; connectorScopeIds: readonly string[]; evidenceArtifactIds: readonly string[]; requestedAt: string; contractVersion: string; }
export interface SchedulerCheckpointDecisionResult { checkpointDecisionId: string; schedulerTaskReferenceId: string; taskId: string; workflowId: string; currentCheckpointId: string; currentCheckpointVersion: number; requestedCheckpointId: string; requestedCheckpointVersion: number; decision: CheckpointDecision; expectedVersion: number; observedVersion: number; nextVersion: number; stateHashValid: boolean; payloadDigestValid: boolean; schemaCompatible: boolean; lineageValid: boolean; leaseValid: boolean; lockValid: boolean; scopeValid: boolean; resumePointValid: boolean; reconciliationRequired: boolean; denialReasons: readonly string[]; recoveryDisposition: string; evidenceArtifactIds: readonly string[]; evaluatedAt: string; contractVersion: string; }