import { AGENT_COORDINATION_CONTRACT_VERSION } from "../shared/versions";
import { assertParallelSafetyClass, requiresSequentialLock } from "../shared/parallel-safety";
import type { Task } from "./task";

export const TASK_DEPENDENCY_EDGE_TYPES = [
  "REQUIRES_COMPLETION",
  "REQUIRES_SUCCESS",
  "REQUIRES_EVIDENCE",
  "REQUIRES_APPROVAL",
  "REQUIRES_CHECKPOINT",
  "REQUIRES_CONTEXT",
  "REQUIRES_RECONCILIATION",
  "REQUIRES_PROMOTION",
  "OPTIONAL_INPUT",
] as const;
export type TaskDependencyEdgeType = (typeof TASK_DEPENDENCY_EDGE_TYPES)[number];

export interface TaskDependencyEdge {
  edgeId: string;
  fromTaskId: string;
  toTaskId: string;
  edgeType: TaskDependencyEdgeType;
  required: boolean;
  createdAt: string;
  contractVersion: string;
}

export interface TaskDependencyGraph {
  graphId: string;
  workflowId: string;
  runtimeId: string;
  taskNodes: Task[];
  dependencyEdges: TaskDependencyEdge[];
  createdAt: string;
  updatedAt: string;
  contractVersion: string;
  evidenceReferences: string[];
}

function sameStringSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

function assertSupportedEdgeType(edgeType: string): asserts edgeType is TaskDependencyEdgeType {
  if (!(TASK_DEPENDENCY_EDGE_TYPES as readonly string[]).includes(edgeType)) {
    throw new Error(`Unsupported dependency edge type: ${edgeType}`);
  }
}

export function createTaskDependencyGraph(input: {
  graphId: string;
  workflowId: string;
  runtimeId: string;
  tasks: Task[];
  dependencyEdges?: Array<Omit<TaskDependencyEdge, "contractVersion" | "createdAt"> & { createdAt?: string; contractVersion?: string }>;
  createdAt?: string;
  updatedAt?: string;
  evidenceReferences?: string[];
  contractVersion?: string;
}): TaskDependencyGraph {
  if (!input.graphId || !input.workflowId || !input.runtimeId) {
    throw new Error("Task dependency graph requires graphId, workflowId, and runtimeId.");
  }
  if (!Array.isArray(input.tasks) || input.tasks.length === 0) {
    throw new Error("Task dependency graph requires at least one task node.");
  }

  const taskIds = input.tasks.map((task) => task.taskId);
  const uniqueTaskIds = new Set(taskIds);
  if (uniqueTaskIds.size !== taskIds.length) {
    throw new Error("Task dependency graph rejected: task node IDs must be unique.");
  }

  const taskMap = new Map(input.tasks.map((task) => [task.taskId, task]));
  const graph: TaskDependencyGraph = {
    graphId: input.graphId,
    workflowId: input.workflowId,
    runtimeId: input.runtimeId,
    taskNodes: [...input.tasks].sort((left, right) => left.taskId.localeCompare(right.taskId)),
    dependencyEdges: (input.dependencyEdges ?? []).map((edge) => {
      const validatedType = edge.edgeType;
      assertSupportedEdgeType(validatedType);
      if (!edge.edgeId || !edge.fromTaskId || !edge.toTaskId) {
        throw new Error("Every dependency edge requires edgeId, fromTaskId, and toTaskId.");
      }
      if (edge.fromTaskId === edge.toTaskId) {
        throw new Error(`Self-dependency rejected for task ${edge.fromTaskId}.`);
      }
      if (!taskMap.has(edge.fromTaskId) || !taskMap.has(edge.toTaskId)) {
        throw new Error(`Dependency edge references missing task node: ${edge.fromTaskId} -> ${edge.toTaskId}`);
      }
      return {
        edgeId: edge.edgeId,
        fromTaskId: edge.fromTaskId,
        toTaskId: edge.toTaskId,
        edgeType: validatedType,
        required: edge.required,
        createdAt: edge.createdAt ?? input.createdAt ?? "2026-08-21T00:00:00.000Z",
        contractVersion: edge.contractVersion ?? input.contractVersion ?? AGENT_COORDINATION_CONTRACT_VERSION,
      };
    }),
    createdAt: input.createdAt ?? "2026-08-21T00:00:00.000Z",
    updatedAt: input.updatedAt ?? input.createdAt ?? "2026-08-21T00:00:00.000Z",
    contractVersion: input.contractVersion ?? AGENT_COORDINATION_CONTRACT_VERSION,
    evidenceReferences: input.evidenceReferences ?? [],
  };

  const edgeKeySet = new Set<string>();
  for (const edge of graph.dependencyEdges) {
    const key = `${edge.fromTaskId}|${edge.toTaskId}|${edge.edgeType}|${edge.required}`;
    if (edgeKeySet.has(key)) {
      throw new Error(`Duplicate dependency edge rejected: ${key}`);
    }
    edgeKeySet.add(key);
  }

  topologicalSortDependencyGraph(graph);
  assertValidDependencyGraph(graph);
  return graph;
}

export function assertValidDependencyGraph(graph: TaskDependencyGraph): void {
  if (!graph || !Array.isArray(graph.taskNodes) || graph.taskNodes.length === 0) {
    throw new Error("Task dependency graph is missing task nodes.");
  }

  const taskIds = graph.taskNodes.map((task) => task.taskId);
  if (new Set(taskIds).size !== taskIds.length) {
    throw new Error("Task dependency graph task nodes must be unique.");
  }

  const byTask = new Map(graph.taskNodes.map((task) => [task.taskId, task]));
  const edgeKeySet = new Set<string>();
  for (const edge of graph.dependencyEdges) {
    assertSupportedEdgeType(edge.edgeType);
    if (!edge.edgeId || !edge.fromTaskId || !edge.toTaskId) {
      throw new Error("Dependency edge is missing required IDs.");
    }
    if (edge.fromTaskId === edge.toTaskId) {
      throw new Error(`Self-dependency rejected for task ${edge.fromTaskId}.`);
    }
    if (!byTask.has(edge.fromTaskId) || !byTask.has(edge.toTaskId)) {
      throw new Error(`Dependency edge references missing task node: ${edge.fromTaskId} -> ${edge.toTaskId}`);
    }
    const key = `${edge.fromTaskId}|${edge.toTaskId}|${edge.edgeType}|${edge.required}`;
    if (edgeKeySet.has(key)) {
      throw new Error(`Duplicate dependency edge rejected: ${key}`);
    }
    edgeKeySet.add(key);
  }

  topologicalSortDependencyGraph(graph);
}

export function topologicalSortDependencyGraph(graph: TaskDependencyGraph): Task[] {
  const incoming = new Map<string, number>();
  const adjacency = new Map<string, string[]>();
  for (const task of graph.taskNodes) {
    incoming.set(task.taskId, 0);
    adjacency.set(task.taskId, []);
  }

  for (const edge of graph.dependencyEdges) {
    if (!incoming.has(edge.toTaskId)) {
      throw new Error(`Dependency edge references missing task node: ${edge.fromTaskId} -> ${edge.toTaskId}`);
    }
    if (edge.fromTaskId === edge.toTaskId) {
      throw new Error(`Self-dependency rejected for task ${edge.fromTaskId}.`);
    }
    adjacency.get(edge.fromTaskId)?.push(edge.toTaskId);
    incoming.set(edge.toTaskId, (incoming.get(edge.toTaskId) ?? 0) + 1);
  }

  const ready = [...graph.taskNodes]
    .map((task) => task.taskId)
    .filter((taskId) => (incoming.get(taskId) ?? 0) === 0)
    .sort((left, right) => left.localeCompare(right));

  const order: string[] = [];
  while (ready.length > 0) {
    const current = ready.shift()!;
    order.push(current);
    for (const neighbor of [...(adjacency.get(current) ?? [])].sort((left, right) => left.localeCompare(right))) {
      const nextCount = (incoming.get(neighbor) ?? 0) - 1;
      incoming.set(neighbor, nextCount);
      if (nextCount === 0) {
        ready.push(neighbor);
        ready.sort((left, right) => left.localeCompare(right));
      }
    }
  }

  if (order.length !== graph.taskNodes.length) {
    throw new Error("Dependency graph contains a cycle.");
  }

  const orderedTaskMap = new Map(graph.taskNodes.map((task) => [task.taskId, task]));
  return order.map((taskId) => orderedTaskMap.get(taskId)!).filter(Boolean);
}

export function evaluateDependencySatisfaction(graph: TaskDependencyGraph, taskState: { taskId: string; status: string }): boolean {
  const task = graph.taskNodes.find((node) => node.taskId === taskState.taskId);
  if (!task) {
    return false;
  }

  const incoming = graph.dependencyEdges.filter((edge) => edge.toTaskId === task.taskId);
  if (incoming.length === 0) {
    return true;
  }

  for (const edge of incoming) {
    const dependencyTask = graph.taskNodes.find((node) => node.taskId === edge.fromTaskId);
    if (dependencyTask && edge.required && taskState.status === "COMPLETED") {
      return true;
    }
  }

  return taskState.status === "COMPLETED" || taskState.status === "READY";
}

export function isParallelSafeBranch(graph: TaskDependencyGraph, tasks: readonly Task[]): boolean {
  if (tasks.length === 0) return true;

  const uniqueTaskIds = new Set<string>();
  for (const task of tasks) {
    if (!task || !task.taskId) return false;
    if (uniqueTaskIds.has(task.taskId)) return false;
    uniqueTaskIds.add(task.taskId);

    if (!task.parallelSafetyClass) return false;
    try {
      assertParallelSafetyClass(task.parallelSafetyClass);
    } catch {
      return false;
    }
    if (requiresSequentialLock(task.parallelSafetyClass as any) || task.promotionRequired) {
      return false;
    }
  }

  const sharedConnectorScopes = new Map<string, string>();
  const sharedMemoryScopes = new Map<string, string>();

  for (const task of tasks) {
    for (const connectorScope of task.requiredConnectorScopes) {
      if (sharedConnectorScopes.has(connectorScope)) return false;
      sharedConnectorScopes.set(connectorScope, task.taskId);
    }
    for (const memoryScope of task.requiredMemoryScopes) {
      if (sharedMemoryScopes.has(memoryScope)) return false;
      sharedMemoryScopes.set(memoryScope, task.taskId);
    }
  }

  const taskIds = tasks.map((task) => task.taskId).sort();
  const resolved = topologicalSortDependencyGraph(graph);
  const branchIds = resolved.map((task) => task.taskId).filter((taskId) => taskIds.includes(taskId));
  return branchIds.length === taskIds.length && sameStringSet(taskIds, branchIds);
}

export function assertSequentialBarrierValid(graph: TaskDependencyGraph, fromTask: Task, toTask: Task): void {
  const adjacency = new Map<string, string[]>();
  for (const task of graph.taskNodes) {
    adjacency.set(task.taskId, []);
  }
  for (const edge of graph.dependencyEdges) {
    adjacency.get(edge.fromTaskId)?.push(edge.toTaskId);
  }

  const queue = [fromTask.taskId];
  const visited = new Set<string>([fromTask.taskId]);
  let foundSequentialBarrier = false;

  while (queue.length > 0) {
    const currentTaskId = queue.shift()!;
    const outgoing = adjacency.get(currentTaskId) ?? [];
    for (const nextTaskId of outgoing) {
      const edge = graph.dependencyEdges.find(
        (candidate) => candidate.fromTaskId === currentTaskId && candidate.toTaskId === nextTaskId,
      );
      if (edge && (edge.edgeType === "REQUIRES_CHECKPOINT" || edge.edgeType === "REQUIRES_PROMOTION" || edge.edgeType === "REQUIRES_APPROVAL")) {
        foundSequentialBarrier = true;
        break;
      }
      if (!visited.has(nextTaskId)) {
        visited.add(nextTaskId);
        queue.push(nextTaskId);
      }
    }
    if (foundSequentialBarrier) break;
  }

  if (!foundSequentialBarrier && toTask.taskId !== fromTask.taskId) {
    throw new Error("Sequential barrier validation requires an explicit dependency edge.");
  }
}

export function validatePromotionDependency(graph: TaskDependencyGraph, task: Task, input: { promotionRequired: boolean }): void {
  if (task.promotionRequired && !input.promotionRequired) {
    throw new Error(`Promotion dependency for task ${task.taskId} is unresolved.`);
  }
  const hasPromotionEdge = graph.dependencyEdges.some((edge) => edge.toTaskId === task.taskId && edge.edgeType === "REQUIRES_PROMOTION");
  if (task.promotionRequired && !hasPromotionEdge) {
    throw new Error(`Promotion dependency for task ${task.taskId} must be explicit.`);
  }
}

export function validateApprovalDependency(graph: TaskDependencyGraph, task: Task, input: { approvalId: string; isFresh: boolean }): void {
  const hasApprovalEdge = graph.dependencyEdges.some((edge) => edge.toTaskId === task.taskId && edge.edgeType === "REQUIRES_APPROVAL");
  if (task.approvalId && !hasApprovalEdge && input.approvalId !== task.approvalId) {
    throw new Error(`Approval dependency for task ${task.taskId} is invalid.`);
  }
  if (!input.isFresh) {
    throw new Error(`Approval dependency for task ${task.taskId} must be fresh.`);
  }
}

export function validateEvidenceDependency(graph: TaskDependencyGraph, task: Task, input: { evidenceReferences: string[] }): void {
  const hasEvidenceEdge = graph.dependencyEdges.some((edge) => edge.toTaskId === task.taskId && edge.edgeType === "REQUIRES_EVIDENCE");
  if (hasEvidenceEdge && (input.evidenceReferences.length === 0 || !input.evidenceReferences.some(Boolean))) {
    throw new Error(`Evidence dependency for task ${task.taskId} is unresolved.`);
  }
}

export function validateCheckpointDependency(graph: TaskDependencyGraph, task: Task, input: { checkpointDigest: string }): void {
  const hasCheckpointEdge = graph.dependencyEdges.some((edge) => edge.toTaskId === task.taskId && edge.edgeType === "REQUIRES_CHECKPOINT");
  if (task.operationClass === "CHECKPOINT_WRITE" || hasCheckpointEdge) {
    if (!input.checkpointDigest) {
      throw new Error(`Checkpoint dependency for task ${task.taskId} is unresolved.`);
    }
  }
}

export function validateContextDependency(graph: TaskDependencyGraph, task: Task, input: { contextPackageId?: string }): void {
  const hasContextEdge = graph.dependencyEdges.some((edge) => edge.toTaskId === task.taskId && edge.edgeType === "REQUIRES_CONTEXT");
  if ((task.requiredContextPackageId || hasContextEdge) && !input.contextPackageId) {
    throw new Error(`Context dependency for task ${task.taskId} is unresolved.`);
  }
}

export function validateReconciliationDependency(graph: TaskDependencyGraph, task: Task, input: { required: boolean }): void {
  const hasReconciliationEdge = graph.dependencyEdges.some((edge) => edge.toTaskId === task.taskId && edge.edgeType === "REQUIRES_RECONCILIATION");
  if ((task.status === "RECONCILIATION_REQUIRED" || hasReconciliationEdge || input.required) && !input.required) {
    throw new Error(`Reconciliation dependency for task ${task.taskId} is unresolved.`);
  }
}
