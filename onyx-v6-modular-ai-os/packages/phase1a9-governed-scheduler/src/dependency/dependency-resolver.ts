import type { TaskDependencyGraph, TaskDependencyEdge, TaskDependencyEdgeType } from "@onyx/phase1a8-governed-contracts";
import { topologicalSortDependencyGraph, TASK_DEPENDENCY_EDGE_TYPES } from "@onyx/phase1a8-governed-contracts";
import { PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION } from "../shared/versions";
import { makeSchedulerIdentifier, assertSchedulerIdentifier } from "../shared/identifiers";

export type DependencyResolutionResultClassification =
  | "VALID"
  | "VALID_WITH_OPTIONAL_FAILURES"
  | "BLOCKED"
  | "FAILED_SAFE"
  | "RECONCILIATION_REQUIRED"
  | "PROHIBITED";

export const DEPENDENCY_RESOLUTION_RESULT_CLASSIFICATIONS: readonly DependencyResolutionResultClassification[] = [
  "VALID",
  "VALID_WITH_OPTIONAL_FAILURES",
  "BLOCKED",
  "FAILED_SAFE",
  "RECONCILIATION_REQUIRED",
  "PROHIBITED",
];

export interface DependencyResolutionRequest {
  dependencyResolutionRequestId: string;
  schedulerConfigId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  dependencyGraphId: string;
  taskReferenceIds: readonly string[];
  currentWorkflowState: string;
  approvalDecisionIds: readonly string[];
  permissionDecisionIds: readonly string[];
  memoryDecisionIds: readonly string[];
  connectorDecisionIds: readonly string[];
  contextPackageIds: readonly string[];
  checkpointDigests: readonly string[];
  evidenceArtifactIds: readonly string[];
  reconciliationRecordIds: readonly string[];
  promotionEligibilityIds: readonly string[];
  laneStage: string;
  scopeHash: string;
  requestedAt: string;
  contractVersion: string;
}

export interface DependencyResolutionResult {
  dependencyResolutionResultId: string;
  dependencyResolutionRequestId: string;
  workflowId: string;
  dependencyGraphId: string;
  orderedTaskIds: readonly string[];
  readyCandidateTaskIds: readonly string[];
  blockedTaskIds: readonly string[];
  failedDependencyTaskIds: readonly string[];
  cancelledDependencyTaskIds: readonly string[];
  optionalDependencyTaskIds: readonly string[];
  cycleDetected: boolean;
  unknownTaskReferenceIds: readonly string[];
  missingDependencyReferenceIds: readonly string[];
  materialDependencyChangeDetected: boolean;
  reconciliationRequired: boolean;
  resultClassification: DependencyResolutionResultClassification;
  decisionReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
  resolvedAt: string;
  contractVersion: string;
}

export function assertDependencyResolutionRequest(request: DependencyResolutionRequest): void {
  if (request.contractVersion !== PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION) {
    throw new Error("Dependency resolution request contract version mismatch.");
  }
  if (!request.dependencyResolutionRequestId || !request.schedulerConfigId || !request.workflowId || !request.runtimeId || !request.dependencyGraphId) {
    throw new Error("Dependency resolution request missing required identifiers.");
  }
  if (!Array.isArray(request.taskReferenceIds) || request.taskReferenceIds.length === 0) {
    throw new Error("Dependency resolution request requires at least one task reference.");
  }
}

export function assertDependencyResolutionResult(result: DependencyResolutionResult): void {
  if (result.contractVersion !== PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION) {
    throw new Error("Dependency resolution result contract version mismatch.");
  }
  if (!DEPENDENCY_RESOLUTION_RESULT_CLASSIFICATIONS.includes(result.resultClassification)) {
    throw new Error(`Invalid dependency resolution result classification: ${result.resultClassification}`);
  }
  if (!result.dependencyResolutionResultId || !result.dependencyResolutionRequestId || !result.workflowId || !result.dependencyGraphId) {
    throw new Error("Dependency resolution result missing required identifiers.");
  }
  if (!Array.isArray(result.orderedTaskIds) || !Array.isArray(result.readyCandidateTaskIds)) {
    throw new Error("Dependency resolution result missing required arrays.");
  }
}

export function createDependencyResolver() {
  return {
    resolveDependencies(graph: TaskDependencyGraph, request: DependencyResolutionRequest): DependencyResolutionResult {
      assertDependencyResolutionRequest(request);

      const reasons: string[] = [];
      const evidenceIds: string[] = [];

      // Validate task node uniqueness
      const taskIds = graph.taskNodes.map((t) => t.taskId);
      const uniqueTaskIds = new Set(taskIds);
      if (uniqueTaskIds.size !== taskIds.length) {
        const resultId = makeSchedulerIdentifier("schedulerRequestId", ["dep-res", request.dependencyResolutionRequestId, "failed-duplicate-nodes"]);
        return {
          dependencyResolutionResultId: resultId,
          dependencyResolutionRequestId: request.dependencyResolutionRequestId,
          workflowId: request.workflowId,
          dependencyGraphId: request.dependencyGraphId,
          orderedTaskIds: [],
          readyCandidateTaskIds: [],
          blockedTaskIds: [],
          failedDependencyTaskIds: [],
          cancelledDependencyTaskIds: [],
          optionalDependencyTaskIds: [],
          cycleDetected: false,
          unknownTaskReferenceIds: [],
          missingDependencyReferenceIds: [],
          materialDependencyChangeDetected: false,
          reconciliationRequired: false,
          resultClassification: "FAILED_SAFE",
          decisionReasons: ["Task node IDs are not unique."],
          evidenceArtifactIds: [makeSchedulerIdentifier("schedulerEvidenceArtifactId", ["unique-node-validation", request.dependencyGraphId])],
          resolvedAt: new Date().toISOString(),
          contractVersion: PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION,
        };
      }

      // Validate edge uniqueness and supported types
      const taskMap = new Map(graph.taskNodes.map((t) => [t.taskId, t]));
      const edgeKeySet = new Set<string>();

      for (const edge of graph.dependencyEdges) {
        // Validate supported edge type
        if (!(TASK_DEPENDENCY_EDGE_TYPES as readonly string[]).includes(edge.edgeType)) {
          reasons.push(`Unsupported edge type: ${edge.edgeType}`);
          evidenceIds.push(makeSchedulerIdentifier("schedulerEvidenceArtifactId", ["edge-type-validation", edge.edgeId]));
        }

        // Check for self-dependency
        if (edge.fromTaskId === edge.toTaskId) {
          reasons.push(`Self-dependency rejected for task ${edge.fromTaskId}.`);
          evidenceIds.push(makeSchedulerIdentifier("schedulerEvidenceArtifactId", ["self-dependency-check", edge.edgeId]));
        }

        // Check for missing task references
        if (!taskMap.has(edge.fromTaskId) || !taskMap.has(edge.toTaskId)) {
          reasons.push(`Dependency edge references missing task: ${edge.fromTaskId} -> ${edge.toTaskId}`);
          evidenceIds.push(makeSchedulerIdentifier("schedulerEvidenceArtifactId", ["missing-reference-check", edge.edgeId]));
        }

        // Check for duplicate edges
        const edgeKey = `${edge.fromTaskId}|${edge.toTaskId}|${edge.edgeType}|${edge.required}`;
        if (edgeKeySet.has(edgeKey)) {
          reasons.push(`Duplicate edge rejected: ${edgeKey}`);
          evidenceIds.push(makeSchedulerIdentifier("schedulerEvidenceArtifactId", ["duplicate-edge-check", edge.edgeId]));
        }
        edgeKeySet.add(edgeKey);
      }

      if (reasons.length > 0) {
        const resultId = makeSchedulerIdentifier("schedulerRequestId", ["dep-res", request.dependencyResolutionRequestId, "failed-validation"]);
        return {
          dependencyResolutionResultId: resultId,
          dependencyResolutionRequestId: request.dependencyResolutionRequestId,
          workflowId: request.workflowId,
          dependencyGraphId: request.dependencyGraphId,
          orderedTaskIds: [],
          readyCandidateTaskIds: [],
          blockedTaskIds: [],
          failedDependencyTaskIds: [],
          cancelledDependencyTaskIds: [],
          optionalDependencyTaskIds: [],
          cycleDetected: false,
          unknownTaskReferenceIds: [],
          missingDependencyReferenceIds: [],
          materialDependencyChangeDetected: false,
          reconciliationRequired: false,
          resultClassification: "FAILED_SAFE",
          decisionReasons: reasons,
          evidenceArtifactIds: evidenceIds,
          resolvedAt: new Date().toISOString(),
          contractVersion: PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION,
        };
      }

      // Perform topological sort to detect cycles
      let orderedTasks: typeof graph.taskNodes;
      let cycleDetected = false;
      try {
        orderedTasks = topologicalSortDependencyGraph(graph);
      } catch (error) {
        cycleDetected = true;
        reasons.push("Dependency graph contains a cycle.");
        evidenceIds.push(makeSchedulerIdentifier("schedulerEvidenceArtifactId", ["cycle-detection", request.dependencyGraphId]));

        const resultId = makeSchedulerIdentifier("schedulerRequestId", ["dep-res", request.dependencyResolutionRequestId, "cycle-detected"]);
        return {
          dependencyResolutionResultId: resultId,
          dependencyResolutionRequestId: request.dependencyResolutionRequestId,
          workflowId: request.workflowId,
          dependencyGraphId: request.dependencyGraphId,
          orderedTaskIds: [],
          readyCandidateTaskIds: [],
          blockedTaskIds: [],
          failedDependencyTaskIds: [],
          cancelledDependencyTaskIds: [],
          optionalDependencyTaskIds: [],
          cycleDetected: true,
          unknownTaskReferenceIds: [],
          missingDependencyReferenceIds: [],
          materialDependencyChangeDetected: false,
          reconciliationRequired: false,
          resultClassification: "FAILED_SAFE",
          decisionReasons: reasons,
          evidenceArtifactIds: evidenceIds,
          resolvedAt: new Date().toISOString(),
          contractVersion: PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION,
        };
      }

      // Validate all requested task references exist
      const unknownTasks: string[] = [];
      for (const taskRef of request.taskReferenceIds) {
        if (!taskMap.has(taskRef)) {
          unknownTasks.push(taskRef);
          evidenceIds.push(makeSchedulerIdentifier("schedulerEvidenceArtifactId", ["unknown-task-check", taskRef]));
        }
      }

      if (unknownTasks.length > 0) {
        reasons.push(`Unknown task references: ${unknownTasks.join(", ")}`);
        const resultId = makeSchedulerIdentifier("schedulerRequestId", ["dep-res", request.dependencyResolutionRequestId, "unknown-tasks"]);
        return {
          dependencyResolutionResultId: resultId,
          dependencyResolutionRequestId: request.dependencyResolutionRequestId,
          workflowId: request.workflowId,
          dependencyGraphId: request.dependencyGraphId,
          orderedTaskIds: [],
          readyCandidateTaskIds: [],
          blockedTaskIds: [],
          failedDependencyTaskIds: [],
          cancelledDependencyTaskIds: [],
          optionalDependencyTaskIds: [],
          cycleDetected: false,
          unknownTaskReferenceIds: unknownTasks,
          missingDependencyReferenceIds: [],
          materialDependencyChangeDetected: false,
          reconciliationRequired: false,
          resultClassification: "FAILED_SAFE",
          decisionReasons: reasons,
          evidenceArtifactIds: evidenceIds,
          resolvedAt: new Date().toISOString(),
          contractVersion: PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION,
        };
      }

      // Create ordered task ID list
      const orderedTaskIds = orderedTasks.map((t) => t.taskId);
      evidenceIds.push(makeSchedulerIdentifier("schedulerEvidenceArtifactId", ["topological-ordering", request.dependencyGraphId]));

      // All candidates are ready at this phase (actual eligibility filtering happens in ready-set evaluation)
      const readyCandidateTaskIds = request.taskReferenceIds.slice();
      reasons.push("All task references validated. Dependency resolution completed successfully.");

      const resultId = makeSchedulerIdentifier("schedulerRequestId", ["dep-res", request.dependencyResolutionRequestId, "valid"]);
      return {
        dependencyResolutionResultId: resultId,
        dependencyResolutionRequestId: request.dependencyResolutionRequestId,
        workflowId: request.workflowId,
        dependencyGraphId: request.dependencyGraphId,
        orderedTaskIds,
        readyCandidateTaskIds,
        blockedTaskIds: [],
        failedDependencyTaskIds: [],
        cancelledDependencyTaskIds: [],
        optionalDependencyTaskIds: [],
        cycleDetected: false,
        unknownTaskReferenceIds: [],
        missingDependencyReferenceIds: [],
        materialDependencyChangeDetected: false,
        reconciliationRequired: false,
        resultClassification: "VALID",
        decisionReasons: reasons,
        evidenceArtifactIds: evidenceIds,
        resolvedAt: new Date().toISOString(),
        contractVersion: PHASE1A9_DEPENDENCY_RESOLUTION_CONTRACT_VERSION,
      };
    },
  };
}
