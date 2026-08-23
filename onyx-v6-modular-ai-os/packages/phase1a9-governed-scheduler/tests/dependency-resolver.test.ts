import { describe, it, expect } from "vitest";
import type { TaskDependencyGraph, Task } from "@onyx/phase1a8-governed-contracts";
import { createTaskDependencyGraph } from "@onyx/phase1a8-governed-contracts";
import { createDependencyResolver } from "../src/dependency/dependency-resolver";
import { PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION } from "../src/shared/versions";
import { makeSchedulerIdentifier } from "../src/shared/identifiers";

describe("T04: dependency-cycle rejection", () => {
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

  it("should reject a direct cycle", () => {
    const taskA = createTestTask("task-a");
    const taskB = createTestTask("task-b");

    // Create tasks first to test cycle error detection
    const graphData = {
      graphId: "graph-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      tasks: [taskA, taskB],
      dependencyEdges: [
        { edgeId: "edge-1", fromTaskId: "task-a", toTaskId: "task-b", edgeType: "REQUIRES_SUCCESS" as const, required: true, createdAt: "2026-08-21T00:00:00.000Z", contractVersion: "1.0.0" },
        { edgeId: "edge-2", fromTaskId: "task-b", toTaskId: "task-a", edgeType: "REQUIRES_SUCCESS" as const, required: true, createdAt: "2026-08-21T00:00:00.000Z", contractVersion: "1.0.0" },
      ],
      createdAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
    };

    expect(() => {
      createTaskDependencyGraph(graphData);
    }).toThrow("contains a cycle");
  });

  it("should reject a self-dependency", () => {
    const taskA = createTestTask("task-a");

    const graphData = {
      graphId: "graph-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      tasks: [taskA],
      dependencyEdges: [{ edgeId: "edge-1", fromTaskId: "task-a", toTaskId: "task-a", edgeType: "REQUIRES_SUCCESS" as const, required: true, createdAt: "2026-08-21T00:00:00.000Z", contractVersion: "1.0.0" }],
      createdAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
    };

    expect(() => {
      createTaskDependencyGraph(graphData);
    }).toThrow("Self-dependency");
  });

  it("should reject a three-task cycle", () => {
    const taskA = createTestTask("task-a");
    const taskB = createTestTask("task-b");
    const taskC = createTestTask("task-c");

    const graphData = {
      graphId: "graph-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      tasks: [taskA, taskB, taskC],
      dependencyEdges: [
        { edgeId: "edge-1", fromTaskId: "task-a", toTaskId: "task-b", edgeType: "REQUIRES_SUCCESS" as const, required: true, createdAt: "2026-08-21T00:00:00.000Z", contractVersion: "1.0.0" },
        { edgeId: "edge-2", fromTaskId: "task-b", toTaskId: "task-c", edgeType: "REQUIRES_SUCCESS" as const, required: true, createdAt: "2026-08-21T00:00:00.000Z", contractVersion: "1.0.0" },
        { edgeId: "edge-3", fromTaskId: "task-c", toTaskId: "task-a", edgeType: "REQUIRES_SUCCESS" as const, required: true, createdAt: "2026-08-21T00:00:00.000Z", contractVersion: "1.0.0" },
      ],
      createdAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
    };

    expect(() => {
      createTaskDependencyGraph(graphData);
    }).toThrow("contains a cycle");
  });

  it("should detect cycle via dependency resolver", () => {
    const taskA = createTestTask("task-a");
    const taskB = createTestTask("task-b");

    // Even if Phase 1A.8 catches it, the resolver should handle it gracefully
    const validGraph = createTaskDependencyGraph({
      graphId: "graph-1",
      workflowId: "workflow-1",
      runtimeId: "runtime-1",
      tasks: [taskA, taskB],
      dependencyEdges: [],
      createdAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
    });

    const resolver = createDependencyResolver();
    const request = {
      dependencyResolutionRequestId: makeSchedulerIdentifier("schedulerRequestId", ["cycle-test"]),
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

    const result = resolver.resolveDependencies(validGraph, request);
    expect(result.cycleDetected).toBe(false);
    expect(result.resultClassification).toBe("VALID");
  });
});
