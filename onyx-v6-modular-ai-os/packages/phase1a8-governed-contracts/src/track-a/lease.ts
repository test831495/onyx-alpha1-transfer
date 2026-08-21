import { AGENT_COORDINATION_CONTRACT_VERSION } from "../shared/versions";
import { RISK_CLASSES } from "../shared/risk-classes";
import { makeId } from "../shared/identifiers";
import type { AgentIdentity } from "./agent-identity";
import type { CapabilityDeclaration } from "./capability-declaration";
import type { Task } from "./task";

export const LEASE_STATUSES = [
  "AVAILABLE",
  "ACQUIRED",
  "ACTIVE",
  "RENEWAL_PENDING",
  "EXPIRED",
  "RELEASED",
  "ABANDONED",
  "REVOKED",
  "RECONCILIATION_REQUIRED",
] as const;
export const LEASING_STATUSES = LEASE_STATUSES;
export type LeaseStatus = (typeof LEASE_STATUSES)[number];

export interface TaskLease {
  leaseId: string;
  taskId: string;
  agentId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  acquiredAt: string;
  expiresAt: string;
  heartbeatDeadline: string;
  leaseVersion: number;
  attemptNumber: number;
  checkpointDigest: string;
  scopeHash: string;
  approvalId: string;
  permissionProfileId: string;
  memoryAccessProfileId: string;
  connectorScopeIds: string[];
  status: LeaseStatus;
  releaseReason?: string;
  evidenceReferences: string[];
  contractVersion: string;
}

export const LEASE_TRANSITION_AUTHORITY: Record<string, readonly string[]> = {
  "AVAILABLE->ACQUIRED": ["GOVERNED_ACQUISITION"],
  "ACQUIRED->ACTIVE": ["FIRST_VALID_HEARTBEAT"],
  "ACTIVE->RENEWAL_PENDING": ["EXPLICIT_RENEWAL_REQUEST"],
  "RENEWAL_PENDING->ACTIVE": ["POLICY_APPROVAL"],
  "RENEWAL_PENDING->EXPIRED": ["RENEWAL_WINDOW_CLOSED"],
  "ACTIVE->EXPIRED": ["HEARTBEAT_DEADLINE"],
  "ACTIVE->RELEASED": ["GOVERNED_VOLUNTARY_RELEASE"],
  "ACTIVE->REVOKED": ["GOVERNANCE_REVOCATION", "SECURITY_REVOCATION"],
  "ACTIVE->RECONCILIATION_REQUIRED": ["SCOPE_INVALIDATION", "APPROVAL_INVALIDATION", "PERMISSION_INVALIDATION", "CONNECTOR_INVALIDATION", "MEMORY_INVALIDATION", "CHECKPOINT_INVALIDATION"],
  "EXPIRED->ABANDONED": ["RECOVERY_NOT_STARTED"],
  "EXPIRED->AVAILABLE": ["SAFE_REASSIGNMENT_PROVEN"],
  "EXPIRED->RECONCILIATION_REQUIRED": ["REMOTE_OUTCOME_UNCERTAIN"],
  "ABANDONED->AVAILABLE": ["SAFE_REASSIGNMENT_PROVEN"],
  "ABANDONED->RECONCILIATION_REQUIRED": ["RECONCILIATION_REQUIRED"],
  "RELEASED->AVAILABLE": ["GOVERNED_REQUEUE_ELIGIBLE"],
  "REVOKED->RECONCILIATION_REQUIRED": ["REMOTE_STATE_INSPECTION_REQUIRED"],
  "RECONCILIATION_REQUIRED->AVAILABLE": ["EXPLICIT_MANUAL_RECONCILIATION"],
};

const LEASE_TRANSITIONS: Record<LeaseStatus, readonly LeaseStatus[]> = {
  AVAILABLE: ["ACQUIRED"],
  ACQUIRED: ["ACTIVE"],
  ACTIVE: ["RENEWAL_PENDING", "EXPIRED", "RELEASED", "REVOKED", "RECONCILIATION_REQUIRED"],
  RENEWAL_PENDING: ["ACTIVE", "EXPIRED"],
  EXPIRED: ["ABANDONED", "AVAILABLE", "RECONCILIATION_REQUIRED"],
  RELEASED: ["AVAILABLE"],
  ABANDONED: ["AVAILABLE", "RECONCILIATION_REQUIRED"],
  REVOKED: ["RECONCILIATION_REQUIRED"],
  RECONCILIATION_REQUIRED: ["AVAILABLE"],
};

export function canTransitionLeaseStatus(from: LeaseStatus, to: LeaseStatus): boolean {
  return LEASE_TRANSITIONS[from].includes(to);
}

export function assertLegalLeaseTransition(from: LeaseStatus, to: LeaseStatus): void {
  if (!canTransitionLeaseStatus(from, to)) {
    throw new Error(`Illegal lease transition: ${from} -> ${to}`);
  }
}

export function transitionLeaseStatus(lease: TaskLease, nextStatus: LeaseStatus, authority?: string): TaskLease {
  assertLegalLeaseTransition(lease.status, nextStatus);
  const key = `${lease.status}->${nextStatus}`;
  if (authority) {
    const allowedAuthorities = LEASE_TRANSITION_AUTHORITY[key] ?? [];
    if (allowedAuthorities.length > 0 && !allowedAuthorities.includes(authority)) {
      throw new Error(`Lease transition ${key} requires one of: ${allowedAuthorities.join(", ")}.`);
    }
  }
  return { ...lease, status: nextStatus };
}

export interface LeaseRenewalValidation {
  scopeHash: string;
  approvalValid: boolean;
  permissionValid: boolean;
  connectorScopesAuthorized: boolean;
  memoryScopeAuthorized: boolean;
  checkpointLineageValid: boolean;
  agentEligible: boolean;
  promotionLaneValid: boolean;
}

export function assertLeaseRenewalEligible(lease: TaskLease, validation: LeaseRenewalValidation, authority: string = "EXPLICIT_RENEWAL_REQUEST"): void {
  if (authority !== "EXPLICIT_RENEWAL_REQUEST") {
    throw new Error("Lease renewal requires explicit renewal approval; heartbeat alone must not renew a lease.");
  }
  if (lease.status !== "ACTIVE" && lease.status !== "RENEWAL_PENDING") {
    throw new Error("Lease renewal is only valid for ACTIVE or RENEWAL_PENDING leases.");
  }
  if (validation.scopeHash !== lease.scopeHash) throw new Error("Lease scope is not stable for renewal.");
  if (!validation.approvalValid) throw new Error("Lease renewal requires valid approval.");
  if (!validation.permissionValid) throw new Error("Lease renewal requires valid permissions.");
  if (!validation.connectorScopesAuthorized) throw new Error("Lease renewal requires authorized connector scopes.");
  if (!validation.memoryScopeAuthorized) throw new Error("Lease renewal requires authorized memory scope.");
  if (!validation.checkpointLineageValid) throw new Error("Lease renewal requires valid checkpoint lineage.");
  if (!validation.agentEligible) throw new Error("Lease renewal requires an eligible agent.");
  if (!validation.promotionLaneValid) throw new Error("Lease renewal requires promotion-lane validity.");
}

export interface TaskLeaseEligibilityContext {
  task: Task;
  agent: AgentIdentity;
  capability: CapabilityDeclaration;
  permissionProfile: {
    permissionProfileId: string;
    agentId: string;
    capabilityAllowlist: string[];
    capabilityDenylist?: string[];
    connectorScopes: string[];
    memoryReadScopes: string[];
    memoryWriteScopes: string[];
    readPermissions: string[];
    writePermissions: string[];
    riskClassLimit: string;
    promotionPermissions: boolean;
    secretAccessProhibited: true;
    productionProhibited: true;
    contractVersion: string;
  };
  connectorScopes: Array<{
    connectorScopeId: string;
    provider: string;
    accountId: string;
    readScope: string[];
    writeScope: string[];
    permissionMode: string;
    memoryWriteEligibility: boolean;
    parallelReadEligibility: boolean;
    approvalRequirement: string;
    contractVersion: string;
  }>;
  memoryProfile: {
    profileId: string;
    readScopes: string[];
    writeScopes: string[];
    contractVersion: string;
  };
  approval: {
    approvalId: string;
    scopeHash: string;
    expiresAt: string;
    riskClass: string;
    promotionEligible: boolean;
    approvalReason: string;
    issuedAt: string;
    consumedState: "UNCONSUMED" | "CONSUMED";
    approverId: string;
    evidenceReferences: string[];
    workflowId: string;
    policyVersion: string;
  };
}

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function riskRank(value: string): number {
  const index = RISK_CLASSES.indexOf(value as (typeof RISK_CLASSES)[number]);
  return index >= 0 ? index : Number.MAX_SAFE_INTEGER;
}

export function assertTaskLeaseAcquisitionEligible(
  task: Task,
  agent: AgentIdentity,
  capability: CapabilityDeclaration,
  permissionProfile: TaskLeaseEligibilityContext["permissionProfile"],
  connectorScopes: TaskLeaseEligibilityContext["connectorScopes"],
  memoryProfile: TaskLeaseEligibilityContext["memoryProfile"],
  approval: TaskLeaseEligibilityContext["approval"],
): void {
  if (!task || !agent || !capability || !permissionProfile || !approval) {
    throw new Error("Task lease acquisition requires task, agent, capability, permission profile, and approval.");
  }
  if (!task.taskId || !task.scopeHash || !task.approvalId) {
    throw new Error("Task lease acquisition requires a valid task identity and scope lineage.");
  }
  if (task.status === "LEASED" || task.status === "IN_PROGRESS" || task.status === "COMPLETED" || task.status === "FAILED_SAFE" || task.status === "CANCELLED") {
    throw new Error(`Task ${task.taskId} already has an active or terminal lease status.`);
  }
  if (task.status !== "READY" && task.status !== "BLOCKED") {
    throw new Error(`Task ${task.taskId} is not eligible for lease acquisition.`);
  }
  if (agent.status !== "ACTIVE" && agent.status !== "REGISTERED") {
    throw new Error(`Agent ${agent.agentId} is not eligible to acquire a lease.`);
  }
  if (capability.agentId !== agent.agentId || capability.capabilityId !== task.capabilityId) {
    throw new Error("Capability declaration does not belong to the leasing agent or task capability.");
  }
  if (capability.operationClass !== task.operationClass || capability.parallelSafetyClass !== task.parallelSafetyClass || capability.riskClass !== task.riskClass) {
    throw new Error("Capability declaration does not match task operation, safety, or risk class.");
  }
  if (permissionProfile.capabilityAllowlist.includes(capability.capabilityId) === false) {
    throw new Error("Permission profile does not authorize the required capability.");
  }
  if (task.requiredPermissions.some((permission) => !permissionProfile.readPermissions.includes(permission) && !permissionProfile.writePermissions.includes(permission))) {
    throw new Error("Permission profile does not satisfy task permission requirements.");
  }
  if (task.requiredConnectorScopes.length > 0 && !sameSet(task.requiredConnectorScopes, connectorScopes.map((scope) => scope.connectorScopeId))) {
    throw new Error("Connector scopes do not satisfy task connector requirements.");
  }
  if (task.requiredMemoryScopes.length > 0 && !sameSet(task.requiredMemoryScopes, memoryProfile.readScopes)) {
    throw new Error("Memory access profile does not satisfy task memory requirements.");
  }
  if (riskRank(task.riskClass) > riskRank(permissionProfile.riskClassLimit)) {
    throw new Error("Permission profile risk limit is insufficient for the task.");
  }
  if (approval.approvalId !== task.approvalId) {
    throw new Error("Approval does not match the task approval lineage.");
  }
  if (approval.scopeHash !== task.scopeHash) {
    throw new Error("Approval scope hash does not match the task scope hash.");
  }
  if (approval.riskClass !== task.riskClass) {
    throw new Error("Approval risk class does not match the task risk class.");
  }
  if (approval.promotionEligible !== (task.promotionRequired ? true : approval.promotionEligible)) {
    throw new Error("Approval promotional eligibility does not match task promotion requirements.");
  }
  if (new Date(approval.expiresAt).getTime() <= new Date(approval.issuedAt).getTime()) {
    throw new Error("Approval has expired and cannot be leased.");
  }
  if (task.promotionRequired && !approval.promotionEligible) {
    throw new Error("Promotion-only task requires a promotion-eligible approval.");
  }
  if (task.requiredConnectorScopes.length > 0 && !task.requiredConnectorScopes.every((requiredScope) => connectorScopes.some((scope) => scope.connectorScopeId === requiredScope))) {
    throw new Error("Connector scope authorization for the task is incomplete.");
  }
  if (task.requiredMemoryScopes.length > 0 && !task.requiredMemoryScopes.every((requiredScope) => memoryProfile.readScopes.includes(requiredScope))) {
    throw new Error("Memory scope authorization for the task is incomplete.");
  }
  if (agent.connectorScopeIds.length > 0 && !sameSet(agent.connectorScopeIds, connectorScopes.map((scope) => scope.connectorScopeId))) {
    throw new Error("Agent connector scope set does not match the authorized lease connector scopes.");
  }
  if (agent.memoryAccessProfileId !== memoryProfile.profileId) {
    throw new Error("Agent memory access profile does not match the lease memory profile.");
  }
  if (agent.permissionProfileId !== permissionProfile.permissionProfileId) {
    throw new Error("Agent permission profile does not match the lease permission profile.");
  }
}

export interface LeaseInput extends Partial<TaskLease> {
  task: Task;
  agent: AgentIdentity;
  capability: CapabilityDeclaration;
  permissionProfile: TaskLeaseEligibilityContext["permissionProfile"];
  connectorScopes: TaskLeaseEligibilityContext["connectorScopes"];
  memoryProfile: TaskLeaseEligibilityContext["memoryProfile"];
  approval: TaskLeaseEligibilityContext["approval"];
  leaseId?: string;
  leaseVersion?: number;
  attemptNumber?: number;
  status?: LeaseStatus;
}

export function createTaskLease(input: LeaseInput): TaskLease {
  const { task, agent, capability, permissionProfile, connectorScopes, memoryProfile, approval, leaseId, leaseVersion, attemptNumber, status, ...rest } = input;
  assertTaskLeaseAcquisitionEligible(task, agent, capability, permissionProfile, connectorScopes, memoryProfile, approval);
  const nextLeaseVersion = leaseVersion ?? 1;
  const nextAttemptNumber = attemptNumber ?? 1;
  const lease: TaskLease = {
    leaseId: leaseId ?? makeId("lease", { taskId: task.taskId, agentId: agent.agentId, attemptNumber: nextAttemptNumber }),
    taskId: task.taskId,
    agentId: agent.agentId,
    workflowId: task.workflowId,
    runtimeId: task.runtimeId,
    runtimeSessionId: task.runtimeSessionId,
    acquiredAt: rest.acquiredAt ?? new Date("2026-08-21T00:00:00.000Z").toISOString(),
    expiresAt: rest.expiresAt ?? new Date("2026-08-21T00:05:00.000Z").toISOString(),
    heartbeatDeadline: rest.heartbeatDeadline ?? new Date("2026-08-21T00:03:00.000Z").toISOString(),
    leaseVersion: nextLeaseVersion,
    attemptNumber: nextAttemptNumber,
    checkpointDigest: rest.checkpointDigest ?? "checkpoint-1",
    scopeHash: task.scopeHash,
    approvalId: task.approvalId,
    permissionProfileId: permissionProfile.permissionProfileId,
    memoryAccessProfileId: memoryProfile.profileId,
    connectorScopeIds: connectorScopes.map((scope) => scope.connectorScopeId),
    status: status ?? "ACQUIRED",
    releaseReason: rest.releaseReason,
    evidenceReferences: rest.evidenceReferences ?? [],
    contractVersion: AGENT_COORDINATION_CONTRACT_VERSION,
  };
  return lease;
}
