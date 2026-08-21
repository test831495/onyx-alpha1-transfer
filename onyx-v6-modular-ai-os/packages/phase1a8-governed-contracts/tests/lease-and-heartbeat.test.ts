import { describe, expect, it } from "vitest";
import type { ApprovalPolicy, ApprovalScope } from "../src/shared/approval";
import type { PerAgentPermissionContract } from "../src/shared/permission";
import type { AgentIdentity } from "../src/track-a/agent-identity";
import type { CapabilityDeclaration } from "../src/track-a/capability-declaration";
import type { Task } from "../src/track-a/task";
import {
  assertLegalLeaseTransition,
  canTransitionLeaseStatus,
  createTaskLease,
  transitionLeaseStatus,
  assertTaskLeaseAcquisitionEligible,
  assertLeaseRenewalEligible,
  type TaskLease,
} from "../src/track-a/lease";
import {
  assertLegalHeartbeatTransition,
  canTransitionHeartbeatStatus,
  createHeartbeat,
  transitionHeartbeatStatus,
  assertValidHeartbeat,
  type Heartbeat,
} from "../src/track-a/heartbeat";

type ValidationContext = {
  task: Task;
  agent: AgentIdentity;
  capability: CapabilityDeclaration;
  permissionProfile: PerAgentPermissionContract;
  connectorScopes: { connectorScopeId: string; provider: string; accountId: string; readScope: string[]; writeScope: string[]; memoryWriteEligibility: boolean; parallelReadEligibility: boolean; permissionMode: string; approvalRequirement: string; contractVersion: string; }[];
  memoryProfile: { profileId: string; readScopes: string[]; writeScopes: string[]; contractVersion: string; };
  approval: ApprovalPolicy;
};

function baseTask(overrides: Partial<Task> = {}): Task {
  const base: Task = {
    taskId: "task-1",
    workflowId: "workflow-1",
    runtimeId: "runtime-1",
    runtimeSessionId: "session-1",
    stepId: "step-1",
    capabilityId: "READ_EVIDENCE",
    scopeHash: "scope-hash-1",
    approvalId: "approval-1",
    approvalPolicyVersion: "1.0.0",
    riskClass: "R1",
    inputDigest: "input-digest-1",
    idempotencyKey: "idempotency-1",
    dependencyTaskIds: [],
    requiredAgentCapabilities: ["READ_EVIDENCE"],
    requiredPermissions: ["read:evidence"],
    requiredConnectorScopes: ["connector-scope-1"],
    requiredMemoryScopes: ["memory-scope-1"],
    priority: 0,
    operationClass: "READ",
    parallelSafetyClass: "READ_ONLY_PARALLEL_SAFE",
    promotionRequired: false,
    tokenBudgetId: "token-budget-1",
    costBudgetId: "cost-budget-1",
    createdAt: "2026-08-21T00:00:00.000Z",
    expiresAt: "2026-08-22T00:00:00.000Z",
    contractVersion: "1.0.0",
    status: "READY",
    evidenceReferences: [],
  };
  return { ...base, ...overrides };
}

function baseAgent(overrides: Partial<AgentIdentity> = {}): AgentIdentity {
  const base: AgentIdentity = {
    agentId: "agent-1",
    agentType: "EXECUTOR",
    displayName: "Agent 1",
    engineeringIdentity: "eng-1",
    runtimeIdentity: "runtime-1",
    characterAttribution: "ONYX",
    presenceMode: "ONYX",
    supervisingUserId: "user-1",
    runtimeId: "runtime-1",
    runtimeSessionId: "session-1",
    workflowId: "workflow-1",
    capabilityDeclarationIds: ["cap-1"],
    permissionProfileId: "profile-1",
    memoryAccessProfileId: "memory-profile-1",
    connectorScopeIds: ["connector-scope-1"],
    modelRoutingProfileId: "routing-1",
    tokenBudgetId: "token-budget-1",
    costBudgetId: "cost-budget-1",
    registeredAt: "2026-08-21T00:00:00.000Z",
    updatedAt: "2026-08-21T00:00:00.000Z",
    contractVersion: "1.0.0",
    status: "ACTIVE",
    evidenceReferences: [],
  };
  return { ...base, ...overrides };
}

function baseCapability(overrides: Partial<CapabilityDeclaration> = {}): CapabilityDeclaration {
  const base: CapabilityDeclaration = {
    capabilityId: "READ_EVIDENCE",
    capabilityVersion: "1.0.0",
    agentId: "agent-1",
    operationClass: "READ",
    riskClass: "R1",
    parallelSafetyClass: "READ_ONLY_PARALLEL_SAFE",
    readOnly: true,
    localReversible: true,
    remoteMutation: false,
    requiresApproval: false,
    requiresFreshApproval: false,
    requiredPermissions: ["read:evidence"],
    requiredConnectorScopes: ["connector-scope-1"],
    requiredMemoryScopes: ["memory-scope-1"],
    requiredTools: [],
    requiredModelRoutingClass: "LOCAL_SMALL",
    estimatedTokenCost: 0,
    estimatedFinancialCost: 0,
    supportsIdempotency: true,
    supportsRecovery: true,
    supportsCancellation: true,
    supportsParallelExecution: true,
    supportsCompensation: false,
    promotionRequired: false,
    contractVersion: "1.0.0",
    evidenceReferences: [],
  };
  return { ...base, ...overrides };
}

function buildContext(overrides: Partial<ValidationContext> = {}): ValidationContext {
  const task = baseTask();
  const agent = baseAgent();
  const capability = baseCapability();
  const permissionProfile = {
    permissionProfileId: "profile-1",
    agentId: "agent-1",
    capabilityAllowlist: ["READ_EVIDENCE"],
    capabilityDenylist: [],
    connectorScopes: ["connector-scope-1"],
    memoryReadScopes: ["memory-scope-1"],
    memoryWriteScopes: [],
    toolScopes: [],
    networkScopes: [],
    readPermissions: ["read:evidence"],
    writePermissions: [],
    approvalRequirements: [],
    riskClassLimit: "R3",
    promotionPermissions: false,
    paidActionLimit: 100,
    secretAccessProhibited: true,
    productionProhibited: true,
    contractVersion: "1.0.0",
  } satisfies PerAgentPermissionContract;
  const connectorScopes = [{
    connectorScopeId: "connector-scope-1",
    provider: "Gmail",
    accountId: "acct-1",
    readScope: ["mail.read"],
    writeScope: [],
    memoryWriteEligibility: false,
    parallelReadEligibility: true,
    permissionMode: "READ_ONLY",
    approvalRequirement: "NONE",
    contractVersion: "1.0.0",
  }];
  const memoryProfile = { profileId: "memory-profile-1", readScopes: ["memory-scope-1"], writeScopes: [], contractVersion: "1.0.0" };
  const approval = {
    approvedActions: ["READ"],
    approvedTools: [],
    approvedFiles: ["README.md"],
    approvedBranch: "main",
    approvedTargetEnvironment: "LOCAL",
    approvedExternalSystems: [],
    approvedConnectorScopes: ["connector-scope-1"],
    approvedPermissionScopes: ["read:evidence"],
    approvedMemoryScopes: ["memory-scope-1"],
    approvedModelRoutingClasses: ["LOCAL_SMALL"],
    approvedTokenBudget: 100,
    approvedCostBudget: 10,
    taskDependencyIds: [],
    riskClass: "R1",
    promotionEligible: false,
    scopeHash: "scope-hash-1",
    approvalId: "approval-1",
    workflowId: "workflow-1",
    policyVersion: "1.0.0",
    approvalReason: "read-only evidence",
    issuedAt: "2026-08-21T00:00:00.000Z",
    expiresAt: "2026-08-30T00:00:00.000Z",
    consumedState: "UNCONSUMED",
    approverId: "approver-1",
    evidenceReferences: [],
  } satisfies ApprovalPolicy;
  return {
    task: task,
    agent,
    capability,
    permissionProfile,
    connectorScopes,
    memoryProfile,
    approval,
    ...overrides,
  };
}

function baseLease(overrides: Partial<TaskLease> = {}): TaskLease {
  const base: TaskLease = {
    leaseId: "lease-1",
    taskId: "task-1",
    agentId: "agent-1",
    workflowId: "workflow-1",
    runtimeId: "runtime-1",
    runtimeSessionId: "session-1",
    acquiredAt: "2026-08-21T00:00:00.000Z",
    expiresAt: "2026-08-21T00:05:00.000Z",
    heartbeatDeadline: "2026-08-21T00:03:00.000Z",
    leaseVersion: 1,
    attemptNumber: 1,
    checkpointDigest: "checkpoint-1",
    scopeHash: "scope-hash-1",
    approvalId: "approval-1",
    permissionProfileId: "profile-1",
    memoryAccessProfileId: "memory-profile-1",
    connectorScopeIds: ["connector-scope-1"],
    status: "ACQUIRED",
    releaseReason: undefined,
    evidenceReferences: [],
    contractVersion: "1.0.0",
  };
  return { ...base, ...overrides };
}

function baseHeartbeat(overrides: Partial<Heartbeat> = {}): Heartbeat {
  const base: Heartbeat = {
    heartbeatId: "hb-1",
    leaseId: "lease-1",
    taskId: "task-1",
    agentId: "agent-1",
    runtimeId: "runtime-1",
    runtimeSessionId: "session-1",
    sequence: 1,
    reportedAt: "2026-08-21T00:00:30.000Z",
    leaseExpiry: "2026-08-21T00:05:00.000Z",
    checkpointDigest: "checkpoint-1",
    progressDigest: "progress-digest-1",
    healthStatus: "HEALTHY",
    currentOperationClass: "READ",
    tokenUsage: 10,
    costUsage: 1,
    evidenceSequence: 1,
    renewalPolicy: "EXPLICIT_RENEWAL_REQUIRED",
    contractVersion: "1.0.0",
  };
  return { ...base, ...overrides };
}

describe("lease contract", () => {
  it("allows all valid lease transitions", () => {
    const lease = baseLease({ status: "AVAILABLE" });
    expect(canTransitionLeaseStatus("AVAILABLE", "ACQUIRED")).toBe(true);
    expect(canTransitionLeaseStatus("ACQUIRED", "ACTIVE")).toBe(true);
    expect(canTransitionLeaseStatus("ACTIVE", "RENEWAL_PENDING")).toBe(true);
    expect(canTransitionLeaseStatus("RENEWAL_PENDING", "ACTIVE")).toBe(true);
    expect(canTransitionLeaseStatus("ACTIVE", "EXPIRED")).toBe(true);
    expect(canTransitionLeaseStatus("EXPIRED", "ABANDONED")).toBe(true);
    expect(canTransitionLeaseStatus("ABANDONED", "AVAILABLE")).toBe(true);
    expect(canTransitionLeaseStatus("RELEASED", "AVAILABLE")).toBe(true);
    expect(() => assertLegalLeaseTransition("AVAILABLE", "ACQUIRED")).not.toThrow();
    expect(() => transitionLeaseStatus(lease, "ACQUIRED", "GOVERNED_ACQUISITION")).not.toThrow();
  });

  it("rejects illegal lease transitions", () => {
    expect(canTransitionLeaseStatus("AVAILABLE", "ACTIVE")).toBe(false);
    expect(() => assertLegalLeaseTransition("AVAILABLE", "ACTIVE")).toThrow();
    expect(() => transitionLeaseStatus(baseLease({ status: "ACTIVE" }), "AVAILABLE", "GOVERNED_ACQUISITION")).toThrow();
  });

  it("enforces acquisition eligibility and double-lease rejection", () => {
    const ctx = buildContext();
    expect(() => assertTaskLeaseAcquisitionEligible(ctx.task, ctx.agent, ctx.capability, ctx.permissionProfile, ctx.connectorScopes, ctx.memoryProfile, ctx.approval)).not.toThrow();
    expect(() => assertTaskLeaseAcquisitionEligible({ ...ctx.task, status: "LEASED" }, ctx.agent, ctx.capability, ctx.permissionProfile, ctx.connectorScopes, ctx.memoryProfile, ctx.approval)).toThrow();
    expect(() => createTaskLease({ ...ctx, leaseId: "lease-1", status: "ACQUIRED" })).not.toThrow();
  });

  it("requires monotonic lease version and attempt numbers", () => {
    const lease = baseLease({ leaseVersion: 2, attemptNumber: 2 });
    expect(lease.leaseVersion).toBeGreaterThanOrEqual(1);
    expect(lease.attemptNumber).toBeGreaterThanOrEqual(1);
    expect(() => transitionLeaseStatus(baseLease({ status: "ACTIVE", attemptNumber: 2 }), "RENEWAL_PENDING", "EXPLICIT_RENEWAL_REQUEST")).not.toThrow();
  });

  it("requires explicit renewal and rejects heartbeat-only renewal", () => {
    const lease = baseLease({ status: "ACTIVE" });
    expect(() => assertLeaseRenewalEligible(lease, { scopeHash: "scope-hash-1", approvalValid: true, permissionValid: true, connectorScopesAuthorized: true, memoryScopeAuthorized: true, checkpointLineageValid: true, agentEligible: true, promotionLaneValid: true })).not.toThrow();
    expect(() => assertLeaseRenewalEligible(lease, { scopeHash: "scope-hash-1", approvalValid: true, permissionValid: true, connectorScopesAuthorized: true, memoryScopeAuthorized: true, checkpointLineageValid: true, agentEligible: true, promotionLaneValid: true }, "HEARTBEAT_ONLY")).toThrow();
  });

  it("invalidates on scope, approval, permission, connector, memory, and checkpoint changes", () => {
    const lease = baseLease({ status: "ACTIVE" });
    expect(() => assertTaskLeaseAcquisitionEligible({ ...baseTask(), scopeHash: "new-scope" }, baseAgent(), baseCapability(), { ...buildContext().permissionProfile, capabilityAllowlist: ["READ_EVIDENCE"] }, buildContext().connectorScopes, buildContext().memoryProfile, buildContext().approval)).toThrow();
    expect(() => transitionLeaseStatus(lease, "RECONCILIATION_REQUIRED", "SCOPE_INVALIDATION")).not.toThrow();
  });
});

describe("heartbeat contract", () => {
  it("allows all valid heartbeat transitions", () => {
    expect(canTransitionHeartbeatStatus("UNKNOWN", "HEALTHY")).toBe(true);
    expect(canTransitionHeartbeatStatus("HEALTHY", "DEGRADED")).toBe(true);
    expect(canTransitionHeartbeatStatus("DEGRADED", "HEALTHY")).toBe(true);
    expect(canTransitionHeartbeatStatus("DEGRADED", "STALE")).toBe(true);
    expect(canTransitionHeartbeatStatus("STALE", "DEGRADED")).toBe(true);
    expect(canTransitionHeartbeatStatus("HEALTHY", "REVOKED")).toBe(true);
    expect(() => assertLegalHeartbeatTransition("UNKNOWN", "HEALTHY")).not.toThrow();
    expect(() => transitionHeartbeatStatus(baseHeartbeat({ healthStatus: "UNKNOWN" }), "HEALTHY")).not.toThrow();
  });

  it("rejects illegal heartbeat transitions and invalid payloads", () => {
    expect(canTransitionHeartbeatStatus("UNKNOWN", "EXPIRED")).toBe(false);
    expect(() => assertLegalHeartbeatTransition("UNKNOWN", "EXPIRED")).toThrow();
    expect(() => assertValidHeartbeat(baseHeartbeat({ sequence: 1, heartbeatId: "hb-1" }), baseLease({ leaseId: "lease-1" }), baseTask(), baseAgent(), "runtime-1", "session-1")).not.toThrow();
    expect(() => assertValidHeartbeat({ ...baseHeartbeat(), leaseId: "wrong-lease" }, baseLease({ leaseId: "lease-1" }), baseTask(), baseAgent(), "runtime-1", "session-1")).toThrow();
    expect(() => assertValidHeartbeat({ ...baseHeartbeat(), progressDigest: "token=abc123 secret=very-secret" }, baseLease({ leaseId: "lease-1" }), baseTask(), baseAgent(), "runtime-1", "session-1")).toThrow();
  });

  it("enforces monotonic sequence and blocks terminal lease states", () => {
    const lease = baseLease({ status: "ACTIVE" });
    expect(() => assertValidHeartbeat(baseHeartbeat({ sequence: 2 }), lease, baseTask(), baseAgent(), "runtime-1", "session-1")).not.toThrow();
    expect(() => assertValidHeartbeat(baseHeartbeat({ sequence: 1, leaseId: "lease-1" }), { ...lease, status: "RELEASED" }, baseTask(), baseAgent(), "runtime-1", "session-1")).toThrow();
  });
});
