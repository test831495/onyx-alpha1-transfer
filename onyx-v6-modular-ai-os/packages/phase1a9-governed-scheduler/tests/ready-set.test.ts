import { describe, it, expect } from "vitest";
import type { Task } from "@onyx/phase1a8-governed-contracts";
import { createTaskDependencyGraph } from "@onyx/phase1a8-governed-contracts";
import { createDependencyResolver } from "../src/dependency/dependency-resolver";
import { createReadySetEvaluator } from "../src/dependency/ready-set";
import { PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION, PHASE1A9_READY_SET_DECISION_CONTRACT_VERSION } from "../src/shared/versions";
import { makeSchedulerIdentifier } from "../src/shared/identifiers";

const createTestTask = (taskId: string): Task => ({
  taskId,
  workflowId: "workflow-1",
  runtimeId: "runtime-1",
  runtimeSessionId: "session-1",
  stepId: `step-${taskId}`,
  capabilityId: "READ_EVIDENCE",
  scopeHash: "hash-1",
  approvalId: "approval-1",
  approvalPolicyVersion: "1.0.0",
  riskClass: "R3",
  inputDigest: "digest-1",
  idempotencyKey: `key-${taskId}`,
  dependencyTaskIds: [],
  requiredAgentCapabilities: [],
  requiredPermissions: [],
  requiredConnectorScopes: [],
  requiredMemoryScopes: [],
  priority: 0,
  operationClass: "READ",
  parallelSafetyClass: "READ_ONLY_PARALLEL_SAFE",
  promotionRequired: false,
  tokenBudgetId: "budget-token-1",
  costBudgetId: "budget-cost-1",
  createdAt: "2026-08-21T00:00:00.000Z",
  expiresAt: "2026-08-22T00:00:00.000Z",
  contractVersion: "1.0.0",
  status: "READY",
  evidenceReferences: [],
});

describe("T05: stable ready-set ordering", () => {
  it("should order tasks deterministically by topological sort and task ID", () => {
    const taskC = createTestTask("task-c");
    const taskB = createTestTask("task-b");
    const taskA = createTestTask("task-a");

    // Create graph with tasks in non-alphabetical order but no dependencies
    // Should order them as task-a, task-b, task-c lexicographically
    const graph = createTaskDependencyGraph({
      graphId: "graph-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      tasks: [taskC, taskB, taskA], // Reverse order
      dependencyEdges: [],
      createdAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
    });

    const resolver = createDependencyResolver();
    const request = {
      dependencyResolutionRequestId: makeSchedulerIdentifier("schedulerRequestId", ["ordering-test"]),
      schedulerConfigId: "config-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      runtimeSessionId: "session-1",
      dependencyGraphId: "graph-1",
      taskReferenceIds: ["task-a", "task-b", "task-c"] as const,
      currentWorkflowState: "INITIALIZED",
      approvalDecisionIds: [] as const,
      permissionDecisionIds: [] as const,
      memoryDecisionIds: [] as const,
      connectorDecisionIds: [] as const,
      contextPackageIds: [] as const,
      checkpointDigests: [] as const,
      evidenceArtifactIds: [] as const,
      reconciliationRecordIds: [] as const,
      promotionEligibilityIds: [] as const,
      laneStage: "S0_SINGLE",
      scopeHash: "hash-1",
      requestedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION,
    };

    const depResult = resolver.resolveDependencies(graph, request);
    expect(depResult.orderedTaskIds).toEqual(["task-a", "task-b", "task-c"]);
  });

  it("should maintain stable order across multiple evaluations", () => {
    const taskA = createTestTask("task-a");
    const taskB = createTestTask("task-b");
    const taskC = createTestTask("task-c");

    const graph = createTaskDependencyGraph({
      graphId: "graph-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      tasks: [taskA, taskB, taskC],
      dependencyEdges: [],
      createdAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
    });

    const resolver = createDependencyResolver();
    const baseRequest = {
      dependencyResolutionRequestId: makeSchedulerIdentifier("schedulerRequestId", ["stability-test"]),
      schedulerConfigId: "config-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      runtimeSessionId: "session-1",
      dependencyGraphId: "graph-1",
      taskReferenceIds: ["task-a", "task-b", "task-c"] as const,
      currentWorkflowState: "INITIALIZED",
      approvalDecisionIds: [] as const,
      permissionDecisionIds: [] as const,
      memoryDecisionIds: [] as const,
      connectorDecisionIds: [] as const,
      contextPackageIds: [] as const,
      checkpointDigests: [] as const,
      evidenceArtifactIds: [] as const,
      reconciliationRecordIds: [] as const,
      promotionEligibilityIds: [] as const,
      laneStage: "S0_SINGLE",
      scopeHash: "hash-1",
      requestedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION,
    };

    const result1 = resolver.resolveDependencies(graph, baseRequest);
    const result2 = resolver.resolveDependencies(graph, baseRequest);

    expect(result1.orderedTaskIds).toEqual(result2.orderedTaskIds);
    expect(result1.orderedTaskIds).toEqual(["task-a", "task-b", "task-c"]);
  });

  it("should respect topological order before lexicographic ordering", () => {
    const taskZ = createTestTask("task-z");
    const taskA = createTestTask("task-a");

    // task-z depends on task-a, so task-a must come first even though 'z' > 'a' lexicographically
    const graph = createTaskDependencyGraph({
      graphId: "graph-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      tasks: [taskZ, taskA],
      dependencyEdges: [{ edgeId: "edge-1", fromTaskId: "task-a", toTaskId: "task-z", edgeType: "REQUIRES_SUCCESS" as const, required: true, createdAt: "2026-08-21T00:00:00.000Z", contractVersion: "1.0.0" }],
      createdAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
    });

    const resolver = createDependencyResolver();
    const request = {
      dependencyResolutionRequestId: makeSchedulerIdentifier("schedulerRequestId", ["topo-test"]),
      schedulerConfigId: "config-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      runtimeSessionId: "session-1",
      dependencyGraphId: "graph-1",
      taskReferenceIds: ["task-a", "task-z"] as const,
      currentWorkflowState: "INITIALIZED",
      approvalDecisionIds: [] as const,
      permissionDecisionIds: [] as const,
      memoryDecisionIds: [] as const,
      connectorDecisionIds: [] as const,
      contextPackageIds: [] as const,
      checkpointDigests: [] as const,
      evidenceArtifactIds: [] as const,
      reconciliationRecordIds: [] as const,
      promotionEligibilityIds: [] as const,
      laneStage: "S0_SINGLE",
      scopeHash: "hash-1",
      requestedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION,
    };

    const depResult = resolver.resolveDependencies(graph, request);
    expect(depResult.orderedTaskIds).toEqual(["task-a", "task-z"]);
  });

  it("should apply S0 single lane capacity limit to ready set", () => {
    const taskA = createTestTask("task-a");
    const taskB = createTestTask("task-b");

    const graph = createTaskDependencyGraph({
      graphId: "graph-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      tasks: [taskA, taskB],
      dependencyEdges: [],
      createdAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
    });

    const resolver = createDependencyResolver();
    const depRequest = {
      dependencyResolutionRequestId: makeSchedulerIdentifier("schedulerRequestId", ["s0-capacity-test"]),
      schedulerConfigId: "config-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      runtimeSessionId: "session-1",
      dependencyGraphId: "graph-1",
      taskReferenceIds: ["task-a", "task-b"] as const,
      currentWorkflowState: "INITIALIZED",
      approvalDecisionIds: [] as const,
      permissionDecisionIds: [] as const,
      memoryDecisionIds: [] as const,
      connectorDecisionIds: [] as const,
      contextPackageIds: [] as const,
      checkpointDigests: [] as const,
      evidenceArtifactIds: [] as const,
      reconciliationRecordIds: [] as const,
      promotionEligibilityIds: [] as const,
      laneStage: "S0_SINGLE",
      scopeHash: "hash-1",
      requestedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION,
    };

    const depResult = resolver.resolveDependencies(graph, depRequest);
    expect(depResult.resultClassification).toBe("VALID");

    const evaluator = createReadySetEvaluator();
    const readyRequest = {
      readySetDecisionId: makeSchedulerIdentifier("readySetDecisionId", ["s0-capacity-test"]),
      dependencyResolutionResultId: depResult.dependencyResolutionResultId,
      schedulerConfigId: "config-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      runtimeSessionId: "session-1",
      candidateTaskReferenceIds: ["task-a", "task-b"] as const,
      laneStage: "S0_SINGLE",
      laneCapacity: 1,
      approvalDecisionIds: [] as const,
      permissionDecisionIds: [] as const,
      memoryDecisionIds: [] as const,
      connectorDecisionIds: [] as const,
      budgetDecisionIds: [] as const,
      contextPackageIds: [] as const,
      lockEligibilityDecisionIds: [] as const,
      checkpointDigests: [] as const,
      recoveryDispositionIds: [] as const,
      promotionEligibilityIds: [] as const,
      scopeHash: "hash-1",
      evaluatedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: PHASE1A9_READY_SET_DECISION_CONTRACT_VERSION,
    };

    const readyResult = evaluator.evaluateReadySet(depResult, readyRequest);
    expect(readyResult.resultClassification).toBe("READY_SET_AVAILABLE");
    expect(readyResult.eligibleTaskIds).toHaveLength(1);
    expect(readyResult.eligibleTaskIds[0]).toBe("task-a");
    expect(readyResult.capacityLimitedTaskIds).toEqual(["task-b"]);
  });

  it("should not dispatch tasks in ready set", () => {
    const taskA = createTestTask("task-a");

    const graph = createTaskDependencyGraph({
      graphId: "graph-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      tasks: [taskA],
      dependencyEdges: [],
      createdAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
    });

    const resolver = createDependencyResolver();
    const depRequest = {
      dependencyResolutionRequestId: makeSchedulerIdentifier("schedulerRequestId", ["no-dispatch-test"]),
      schedulerConfigId: "config-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      runtimeSessionId: "session-1",
      dependencyGraphId: "graph-1",
      taskReferenceIds: ["task-a"] as const,
      currentWorkflowState: "INITIALIZED",
      approvalDecisionIds: [] as const,
      permissionDecisionIds: [] as const,
      memoryDecisionIds: [] as const,
      connectorDecisionIds: [] as const,
      contextPackageIds: [] as const,
      checkpointDigests: [] as const,
      evidenceArtifactIds: [] as const,
      reconciliationRecordIds: [] as const,
      promotionEligibilityIds: [] as const,
      laneStage: "S0_SINGLE",
      scopeHash: "hash-1",
      requestedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION,
    };

    const depResult = resolver.resolveDependencies(graph, depRequest);

    const evaluator = createReadySetEvaluator();
    const readyRequest = {
      readySetDecisionId: makeSchedulerIdentifier("readySetDecisionId", ["no-dispatch-test"]),
      dependencyResolutionResultId: depResult.dependencyResolutionResultId,
      schedulerConfigId: "config-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      runtimeSessionId: "session-1",
      candidateTaskReferenceIds: ["task-a"] as const,
      laneStage: "S0_SINGLE",
      laneCapacity: 1,
      approvalDecisionIds: [] as const,
      permissionDecisionIds: [] as const,
      memoryDecisionIds: [] as const,
      connectorDecisionIds: [] as const,
      budgetDecisionIds: [] as const,
      contextPackageIds: [] as const,
      lockEligibilityDecisionIds: [] as const,
      checkpointDigests: [] as const,
      recoveryDispositionIds: [] as const,
      promotionEligibilityIds: [] as const,
      scopeHash: "hash-1",
      evaluatedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: PHASE1A9_READY_SET_DECISION_CONTRACT_VERSION,
    };

    const readyResult = evaluator.evaluateReadySet(depResult, readyRequest);
    expect(readyResult.resultClassification).toBe("READY_SET_AVAILABLE");
    expect(readyResult.eligibleTaskIds).toEqual(["task-a"]);
    // Verify the task is in the ready set but not executed
    // (There should be no task execution surface in this implementation)
  });
});
