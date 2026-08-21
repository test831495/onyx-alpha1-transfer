import { describe, expect, it } from "vitest";
import type { Task } from "../src/track-a/task";
import {
  createTaskDependencyGraph,
  assertValidDependencyGraph,
  topologicalSortDependencyGraph,
  evaluateDependencySatisfaction,
  isParallelSafeBranch,
  assertSequentialBarrierValid,
  validatePromotionDependency,
  validateApprovalDependency,
  validateEvidenceDependency,
  validateCheckpointDependency,
  validateContextDependency,
  validateReconciliationDependency,
  TASK_DEPENDENCY_EDGE_TYPES,
} from "../src/track-a/dependency-graph";
import {
  createWorkflowConcurrencyLock,
  assertValidWorkflowLock,
  classifyWorkflowLockConflict,
  LOCK_MODES,
  LOCK_STATES,
} from "../src/track-a/concurrency-lock";
import {
  createCheckpointCasRequest,
  evaluateCheckpointCas,
  CHECKPOINT_CAS_RESULTS,
} from "../src/track-a/checkpoint-cas";

function taskFactory(overrides: Partial<Task> = {}): Task {
  return {
    taskId: "task-1",
    workflowId: "workflow-1",
    runtimeId: "runtime-1",
    runtimeSessionId: "session-1",
    stepId: "step-1",
    capabilityId: "READ_EVIDENCE",
    scopeHash: "scope-hash-1",
    approvalId: "approval-1",
    approvalPolicyVersion: "1.0.0",
    riskClass: "R0",
    inputDigest: "digest-1",
    idempotencyKey: "idempotency-1",
    dependencyTaskIds: [],
    requiredAgentCapabilities: ["READ_EVIDENCE"],
    requiredPermissions: ["read:evidence"],
    requiredConnectorScopes: [],
    requiredMemoryScopes: [],
    requiredContextPackageId: undefined,
    priority: 1,
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
    ...overrides,
  } as Task;
}

describe("Wave 2C dependency graph contract", () => {
  it("accepts valid dependency graphs and enforces uniqueness and cycle rejection", () => {
    const a = taskFactory({ taskId: "task-a" });
    const b = taskFactory({ taskId: "task-b" });
    const c = taskFactory({ taskId: "task-c" });
    const graph = createTaskDependencyGraph({
      graphId: "graph-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      tasks: [a, b, c],
      dependencyEdges: [
        { edgeId: "edge-1", fromTaskId: "task-a", toTaskId: "task-b", edgeType: "REQUIRES_COMPLETION", required: true },
        { edgeId: "edge-2", fromTaskId: "task-b", toTaskId: "task-c", edgeType: "REQUIRES_SUCCESS", required: true },
      ],
    });

    expect(() => assertValidDependencyGraph(graph)).not.toThrow();
    expect(topologicalSortDependencyGraph(graph).map((node) => node.taskId)).toEqual(["task-a", "task-b", "task-c"]);

    expect(() => createTaskDependencyGraph({
      graphId: "graph-2",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      tasks: [a, a],
      dependencyEdges: [],
    })).toThrow();

    expect(() => createTaskDependencyGraph({
      graphId: "graph-3",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      tasks: [a, b],
      dependencyEdges: [{ edgeId: "edge-1", fromTaskId: "task-a", toTaskId: "task-a", edgeType: "REQUIRES_COMPLETION", required: true }],
    })).toThrow();

    expect(() => createTaskDependencyGraph({
      graphId: "graph-4",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      tasks: [a, b],
      dependencyEdges: [
        { edgeId: "edge-1", fromTaskId: "task-a", toTaskId: "task-b", edgeType: "REQUIRES_COMPLETION", required: true },
        { edgeId: "edge-2", fromTaskId: "task-b", toTaskId: "task-a", edgeType: "REQUIRES_COMPLETION", required: true },
      ],
    })).toThrow();

    expect(TASK_DEPENDENCY_EDGE_TYPES).toContain("REQUIRES_CHECKPOINT");
  });

  it("evaluates dependency satisfaction and parallel safety behavior", () => {
    const root = taskFactory({ taskId: "root", parallelSafetyClass: "READ_ONLY_PARALLEL_SAFE" });
    const branchA = taskFactory({ taskId: "branch-a", operationClass: "READ", parallelSafetyClass: "READ_ONLY_PARALLEL_SAFE" });
    const branchB = taskFactory({ taskId: "branch-b", operationClass: "DOCUMENTATION", parallelSafetyClass: "DOCUMENTATION_PARALLEL_SAFE" });
    const seq = taskFactory({ taskId: "seq", operationClass: "CHECKPOINT_WRITE", parallelSafetyClass: "SEQUENTIAL_CHECKPOINT_REQUIRED" });
    const graph = createTaskDependencyGraph({
      graphId: "graph-5",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      tasks: [root, branchA, branchB, seq],
      dependencyEdges: [
        { edgeId: "edge-1", fromTaskId: "root", toTaskId: "branch-a", edgeType: "REQUIRES_SUCCESS", required: true },
        { edgeId: "edge-2", fromTaskId: "root", toTaskId: "branch-b", edgeType: "REQUIRES_EVIDENCE", required: true },
        { edgeId: "edge-3", fromTaskId: "branch-a", toTaskId: "seq", edgeType: "REQUIRES_CHECKPOINT", required: true },
      ],
    });

    expect(evaluateDependencySatisfaction(graph, { taskId: "branch-a", status: "COMPLETED" })).toBe(true);
    expect(isParallelSafeBranch(graph, [root, branchA, branchB])).toBe(true);
    expect(() => assertSequentialBarrierValid(graph, root, seq)).not.toThrow();
    expect(() => validatePromotionDependency(graph, seq, { promotionRequired: true })).not.toThrow();
    expect(() => validateApprovalDependency(graph, seq, { approvalId: "approval-1", isFresh: true })).not.toThrow();
    expect(() => validateEvidenceDependency(graph, branchA, { evidenceReferences: ["ev-1"] })).not.toThrow();
    expect(() => validateCheckpointDependency(graph, seq, { checkpointDigest: "cp-1" })).not.toThrow();
    expect(() => validateContextDependency(graph, branchA, { contextPackageId: "ctx-1" })).not.toThrow();
    expect(() => validateReconciliationDependency(graph, seq, { required: true })).not.toThrow();
  });
});

describe("Wave 2C lock contract", () => {
  it("rejects conflicts and validates permitted transitions", () => {
    const base = createWorkflowConcurrencyLock({
      lockId: "lock-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      resourceScope: "scope:repo",
      capabilityId: "READ_EVIDENCE",
      taskId: "task-1",
      ownerAgentId: "agent-1",
      leaseId: "lease-1",
      lockMode: "READ_SHARED",
      lockVersion: 1,
      acquiredAt: "2026-08-21T00:00:00.000Z",
      expiresAt: "2026-08-21T00:05:00.000Z",
      checkpointDigest: "checkpoint-1",
      scopeHash: "scope-hash-1",
      approvalId: "approval-1",
      status: "HELD",
      evidenceReferences: ["ev-1"],
    });

    expect(LOCK_MODES).toContain("READ_SHARED");
    expect(LOCK_STATES).toContain("HELD");
    expect(() => assertValidWorkflowLock(base)).not.toThrow();
    expect(classifyWorkflowLockConflict(base, { ...base, lockId: "lock-2", lockMode: "WRITE_EXCLUSIVE" })).toBe("EXCLUSIVE_CONFLICT");
    expect(() => createWorkflowConcurrencyLock({ ...base, lockMode: "UNSUPPORTED" as any })).toThrow();

    const renewed = { ...base, lockVersion: 2, expiresAt: "2026-08-21T00:06:00.000Z" };
    expect(() => assertValidWorkflowLock(renewed)).not.toThrow();
    expect(() => createWorkflowConcurrencyLock({ ...base, status: "EXPIRED" })).not.toThrow();
  });
});

describe("Wave 2C checkpoint compare-and-swap contract", () => {
  it("applies valid compare-and-swap and classifies deterministic conflicts", () => {
    const canonical = {
      checkpointId: "cp-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      taskId: "task-1",
      agentId: "agent-1",
      leaseId: "lease-1",
      sequence: 2,
      version: 1,
      previousDigest: "prev-digest",
      digest: "digest-2",
      scopeHash: "scope-hash-1",
      approvalDigest: "approval-digest-1",
      contractVersion: "1.0.0",
      hashChainValid: true,
      immutableGovernanceMetadata: false,
      prohibitedAction: false,
      changesPermissions: false,
      changesApprovalAuthority: false,
      changesPersonaP0: false,
      mergeEnabled: false,
      productionEnabled: false,
      forcePushEnabled: false,
      branchDeletionEnabled: false,
      secretAccessEnabled: false,
      permissionChangeEnabled: false,
      liveConnectorMutationEnabled: false,
      paidActionEnabled: false,
    };

    const request = createCheckpointCasRequest({
      casRequestId: "cas-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      taskId: "task-1",
      agentId: "agent-1",
      leaseId: "lease-1",
      expectedCheckpointDigest: "digest-2",
      expectedSequence: 2,
      expectedVersion: 1,
      replacementCheckpoint: {
        ...canonical,
        checkpointId: "cp-2",
        previousDigest: "digest-2",
        sequence: 3,
        version: 1,
        digest: "digest-3",
      },
      scopeHash: "scope-hash-1",
      approvalDigest: "approval-digest-1",
      createdAt: "2026-08-21T00:00:00.000Z",
      evidenceReference: "evidence-cas-1",
      approvedLeaseStatus: "ACTIVE",
      canonicalLatest: canonical,
    });

    expect(() => evaluateCheckpointCas({ canonicalLatest: canonical, request })).not.toThrow();
    const outcome = evaluateCheckpointCas({ canonicalLatest: canonical, request });
    expect(outcome.result).toBe("APPLIED");
    expect(CHECKPOINT_CAS_RESULTS).toContain("APPLIED");

    const stale = createCheckpointCasRequest({
      ...request,
      casRequestId: "cas-2",
      expectedCheckpointDigest: "stale-digest",
      evidenceReference: "evidence-stale-1",
      canonicalLatest: canonical,
    });
    expect(evaluateCheckpointCas({ canonicalLatest: canonical, request: stale }).result).toBe("STALE_WRITER");

    const seqConflict = createCheckpointCasRequest({
      ...request,
      casRequestId: "cas-3",
      expectedSequence: 99,
      evidenceReference: "evidence-seq-1",
      canonicalLatest: canonical,
    });
    expect(evaluateCheckpointCas({ canonicalLatest: canonical, request: seqConflict }).result).toBe("SEQUENCE_CONFLICT");
    const versionConflict = createCheckpointCasRequest({
      ...request,
      casRequestId: "cas-4",
      expectedVersion: 9,
      evidenceReference: "evidence-version-1",
      canonicalLatest: canonical,
    });
    expect(evaluateCheckpointCas({ canonicalLatest: canonical, request: versionConflict }).result).toBe("VERSION_CONFLICT");
  });
});
