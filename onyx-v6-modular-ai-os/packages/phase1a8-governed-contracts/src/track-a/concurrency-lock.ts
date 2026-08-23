import { AGENT_COORDINATION_CONTRACT_VERSION } from "../shared/versions";

export const LOCK_MODES = [
  "READ_SHARED",
  "WRITE_EXCLUSIVE",
  "CHECKPOINT_EXCLUSIVE",
  "APPROVAL_EXCLUSIVE",
  "CONNECTOR_ACCOUNT_EXCLUSIVE",
  "GITHUB_RESOURCE_EXCLUSIVE",
  "PROMOTION_EXCLUSIVE",
] as const;
export type WorkflowLockMode = (typeof LOCK_MODES)[number];

export const LOCK_STATES = ["UNLOCKED", "HELD", "EXPIRED", "RECONCILIATION_REQUIRED"] as const;
export type WorkflowLockState = (typeof LOCK_STATES)[number];

export interface WorkflowConcurrencyLock {
  lockId: string;
  workflowId: string;
  runtimeId: string;
  resourceScope: string;
  capabilityId: string;
  taskId: string;
  ownerAgentId: string;
  leaseId: string;
  lockMode: WorkflowLockMode;
  lockVersion: number;
  acquiredAt: string;
  expiresAt: string;
  checkpointDigest: string;
  scopeHash: string;
  approvalId: string;
  status: WorkflowLockState;
  evidenceReferences: string[];
  contractVersion: string;
}

const LOCK_TRANSITIONS: Record<WorkflowLockState, readonly WorkflowLockState[]> = {
  UNLOCKED: ["HELD"],
  HELD: ["HELD", "UNLOCKED", "EXPIRED"],
  EXPIRED: ["UNLOCKED", "RECONCILIATION_REQUIRED"],
  RECONCILIATION_REQUIRED: ["UNLOCKED"],
};

export function assertSupportedLockMode(mode: string): asserts mode is WorkflowLockMode {
  if (!(LOCK_MODES as readonly string[]).includes(mode)) {
    throw new Error(`Unsupported lock mode: ${mode}`);
  }
}

export function assertSupportedLockState(state: string): asserts state is WorkflowLockState {
  if (!(LOCK_STATES as readonly string[]).includes(state)) {
    throw new Error(`Unsupported lock state: ${state}`);
  }
}

export function canTransitionWorkflowLockStatus(from: WorkflowLockState, to: WorkflowLockState): boolean {
  return LOCK_TRANSITIONS[from].includes(to);
}

export function assertLegalWorkflowLockTransition(from: WorkflowLockState, to: WorkflowLockState): void {
  if (!canTransitionWorkflowLockStatus(from, to)) {
    throw new Error(`Illegal workflow lock transition: ${from} -> ${to}`);
  }
}

export function transitionWorkflowLock(lock: WorkflowConcurrencyLock, nextStatus: WorkflowLockState, authority?: string): WorkflowConcurrencyLock {
  assertLegalWorkflowLockTransition(lock.status, nextStatus);
  if (authority && nextStatus === "HELD" && lock.status === "UNLOCKED") {
    if (authority !== "GOVERNED_ACQUISITION") {
      throw new Error("UNLOCKED->HELD requires GOVERNED_ACQUISITION.");
    }
  }
  if (authority && nextStatus === "UNLOCKED" && lock.status === "HELD") {
    if (authority !== "GOVERNED_RELEASE") {
      throw new Error("HELD->UNLOCKED requires GOVERNED_RELEASE.");
    }
  }
  return { ...lock, status: nextStatus };
}

export function assertValidWorkflowLock(lock: WorkflowConcurrencyLock): void {
  if (!lock.lockId || !lock.workflowId || !lock.runtimeId) {
    throw new Error("Workflow lock requires identity fields.");
  }
  if (!lock.resourceScope || !lock.capabilityId || !lock.taskId || !lock.ownerAgentId || !lock.leaseId) {
    throw new Error("Workflow lock requires resource, capability, task, owner, and lease identity.");
  }
  assertSupportedLockMode(lock.lockMode);
  assertSupportedLockState(lock.status);
  if (!Number.isInteger(lock.lockVersion) || lock.lockVersion < 1) {
    throw new Error("Workflow lock version must be a positive integer.");
  }
  if (new Date(lock.acquiredAt).getTime() > new Date(lock.expiresAt).getTime()) {
    throw new Error("Workflow lock expiration must be after acquisition.");
  }
  if (!lock.checkpointDigest || !lock.scopeHash || !lock.approvalId) {
    throw new Error("Workflow lock requires checkpoint, scope, and approval lineage.");
  }
}

export function createWorkflowConcurrencyLock(input: Partial<WorkflowConcurrencyLock> & {
  lockId: string;
  workflowId: string;
  runtimeId: string;
  resourceScope: string;
  capabilityId: string;
  taskId: string;
  ownerAgentId: string;
  leaseId: string;
  lockMode: WorkflowLockMode | string;
  lockVersion: number;
  acquiredAt: string;
  expiresAt: string;
  checkpointDigest: string;
  scopeHash: string;
  approvalId: string;
  status: WorkflowLockState | string;
  evidenceReferences?: string[];
}): WorkflowConcurrencyLock {
  const lockMode = input.lockMode;
  const status = input.status;
  assertSupportedLockMode(lockMode as string);
  assertSupportedLockState(status as string);
  const created: WorkflowConcurrencyLock = {
    lockId: input.lockId,
    workflowId: input.workflowId,
    runtimeId: input.runtimeId,
    resourceScope: input.resourceScope,
    capabilityId: input.capabilityId,
    taskId: input.taskId,
    ownerAgentId: input.ownerAgentId,
    leaseId: input.leaseId,
    lockMode: lockMode as WorkflowLockMode,
    lockVersion: input.lockVersion,
    acquiredAt: input.acquiredAt,
    expiresAt: input.expiresAt,
    checkpointDigest: input.checkpointDigest,
    scopeHash: input.scopeHash,
    approvalId: input.approvalId,
    status: status as WorkflowLockState,
    evidenceReferences: input.evidenceReferences ?? [],
    contractVersion: AGENT_COORDINATION_CONTRACT_VERSION,
  };
  assertValidWorkflowLock(created);
  return created;
}

export function classifyWorkflowLockConflict(current: WorkflowConcurrencyLock, candidate: WorkflowConcurrencyLock): string {
  if (current.resourceScope !== candidate.resourceScope) {
    return "RESOURCE_SCOPE_DIFFERS";
  }
  if (current.lockMode === "READ_SHARED" && candidate.lockMode === "READ_SHARED") {
    return "READ_SHARED_COMPATIBLE";
  }
  if (current.status !== "HELD" || candidate.status !== "HELD") {
    return "NO_CONFLICT";
  }
  if (current.lockMode === "READ_SHARED" || candidate.lockMode === "READ_SHARED") {
    return "EXCLUSIVE_CONFLICT";
  }
  return "EXCLUSIVE_CONFLICT";
}

export function assertLockAcquisitionEligible(lock: WorkflowConcurrencyLock, activeLock?: WorkflowConcurrencyLock): void {
  if (!lock || !lock.lockId) {
    throw new Error("Workflow lock acquisition requires lock identity.");
  }
  if (lock.status !== "UNLOCKED" && lock.status !== "HELD") {
    throw new Error("Workflow lock acquisition requires a valid status.");
  }
  if (activeLock && classifyWorkflowLockConflict(activeLock, lock) !== "NO_CONFLICT") {
    throw new Error("Workflow lock acquisition is rejected by an active conflict.");
  }
}

export function assertLockRenewalEligible(lock: WorkflowConcurrencyLock, previous: WorkflowConcurrencyLock): void {
  if (lock.status !== "HELD" || previous.status !== "HELD") {
    throw new Error("Workflow lock renewal is only valid for held locks.");
  }
  if (lock.lockVersion <= previous.lockVersion) {
    throw new Error("Workflow lock version must be monotonic for renewal.");
  }
  if (lock.scopeHash !== previous.scopeHash) {
    throw new Error("Workflow lock scopeHash must remain stable for renewal.");
  }
}

export function assertLockReleaseEligible(lock: WorkflowConcurrencyLock): void {
  if (lock.status !== "HELD") {
    throw new Error("Workflow lock release is only valid for a held lock.");
  }
}

export function classifyLockExpiry(lock: WorkflowConcurrencyLock, now: Date): "ACTIVE" | "EXPIRED" {
  return new Date(lock.expiresAt).getTime() <= now.getTime() ? "EXPIRED" : "ACTIVE";
}

export function classifyAbandonedLockRecovery(lock: WorkflowConcurrencyLock): "SAFE_RECOVERABLE" | "RECONCILIATION_REQUIRED" {
  if (lock.status === "EXPIRED") {
    return "SAFE_RECOVERABLE";
  }
  return "RECONCILIATION_REQUIRED";
}

export function assertLockScopeMatches(lock: WorkflowConcurrencyLock, expectedScope: string): void {
  if (lock.resourceScope !== expectedScope) {
    throw new Error("Workflow lock resourceScope mismatch.");
  }
}

export function assertLockApprovalValid(lock: WorkflowConcurrencyLock, expectedApprovalId: string): void {
  if (lock.approvalId !== expectedApprovalId) {
    throw new Error("Workflow lock approval mismatch.");
  }
}

export function assertLockLeaseValid(lock: WorkflowConcurrencyLock, expectedLeaseId: string, expectedAgentId: string): void {
  if (lock.leaseId !== expectedLeaseId) {
    throw new Error("Workflow lock lease mismatch.");
  }
  if (lock.ownerAgentId !== expectedAgentId) {
    throw new Error("Workflow lock owner agent mismatch.");
  }
}

export function assertLockCheckpointValid(lock: WorkflowConcurrencyLock, expectedCheckpointDigest: string): void {
  if (lock.checkpointDigest !== expectedCheckpointDigest) {
    throw new Error("Workflow lock checkpoint mismatch.");
  }
}
