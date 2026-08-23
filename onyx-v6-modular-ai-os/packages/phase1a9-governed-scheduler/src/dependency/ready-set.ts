import type { DependencyResolutionResult } from "./dependency-resolver";
import { PHASE1A9_READY_SET_DECISION_CONTRACT_VERSION } from "../shared/versions";
import { makeSchedulerIdentifier } from "../shared/identifiers";

export type ReadySetDecisionResultClassification =
  | "READY_SET_AVAILABLE"
  | "EMPTY_READY_SET"
  | "BLOCKED"
  | "REQUIRES_RECONCILIATION"
  | "PROHIBITED";

export const READY_SET_DECISION_RESULT_CLASSIFICATIONS: readonly ReadySetDecisionResultClassification[] = [
  "READY_SET_AVAILABLE",
  "EMPTY_READY_SET",
  "BLOCKED",
  "REQUIRES_RECONCILIATION",
  "PROHIBITED",
];

export interface ReadySetDecisionRequest {
  readySetDecisionId: string;
  dependencyResolutionResultId: string;
  schedulerConfigId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  candidateTaskReferenceIds: readonly string[];
  laneStage: string;
  laneCapacity: number;
  approvalDecisionIds: readonly string[];
  permissionDecisionIds: readonly string[];
  memoryDecisionIds: readonly string[];
  connectorDecisionIds: readonly string[];
  budgetDecisionIds: readonly string[];
  contextPackageIds: readonly string[];
  lockEligibilityDecisionIds: readonly string[];
  checkpointDigests: readonly string[];
  recoveryDispositionIds: readonly string[];
  promotionEligibilityIds: readonly string[];
  scopeHash: string;
  evaluatedAt: string;
  contractVersion: string;
}

export interface ReadySetDecisionResult {
  readySetDecisionId: string;
  workflowId: string;
  runtimeId: string;
  eligibleTaskIds: readonly string[];
  ineligibleTaskIds: readonly string[];
  blockedTaskIds: readonly string[];
  reconciliationTaskIds: readonly string[];
  prohibitedTaskIds: readonly string[];
  orderedTaskIds: readonly string[];
  capacityLimitedTaskIds: readonly string[];
  decisionReasonsByTask: Readonly<Record<string, string[]>>;
  evidenceArtifactIds: readonly string[];
  resultClassification: ReadySetDecisionResultClassification;
  evaluatedAt: string;
  contractVersion: string;
}

export function assertReadySetDecisionRequest(request: ReadySetDecisionRequest): void {
  if (request.contractVersion !== PHASE1A9_READY_SET_DECISION_CONTRACT_VERSION) {
    throw new Error("Ready-set decision request contract version mismatch.");
  }
  if (!request.readySetDecisionId || !request.dependencyResolutionResultId || !request.schedulerConfigId || !request.workflowId || !request.runtimeId) {
    throw new Error("Ready-set decision request missing required identifiers.");
  }
  if (!Array.isArray(request.candidateTaskReferenceIds)) {
    throw new Error("Ready-set decision request requires candidate task references array.");
  }
  if (request.laneCapacity < 1) {
    throw new Error("Ready-set decision request lane capacity must be at least 1.");
  }
  if (!request.scopeHash) {
    throw new Error("Ready-set decision request missing scope hash.");
  }
}

export function assertReadySetDecisionResult(result: ReadySetDecisionResult): void {
  if (result.contractVersion !== PHASE1A9_READY_SET_DECISION_CONTRACT_VERSION) {
    throw new Error("Ready-set decision result contract version mismatch.");
  }
  if (!READY_SET_DECISION_RESULT_CLASSIFICATIONS.includes(result.resultClassification)) {
    throw new Error(`Invalid ready-set decision result classification: ${result.resultClassification}`);
  }
  if (!result.readySetDecisionId || !result.workflowId || !result.runtimeId) {
    throw new Error("Ready-set decision result missing required identifiers.");
  }
}

export function createReadySetEvaluator() {
  return {
    evaluateReadySet(depResResult: DependencyResolutionResult, request: ReadySetDecisionRequest): ReadySetDecisionResult {
      assertReadySetDecisionRequest(request);

      // If dependency resolution failed, ready set is blocked
      if (depResResult.resultClassification === "FAILED_SAFE" || depResResult.resultClassification === "PROHIBITED") {
        const resultId = makeSchedulerIdentifier("readySetDecisionId", ["ready-eval", request.readySetDecisionId, "blocked"]);
        const reasonsByTask: Record<string, string[]> = {};
        for (const taskId of request.candidateTaskReferenceIds) {
          reasonsByTask[taskId] = ["Dependency resolution failed. Task is blocked."];
        }
        return {
          readySetDecisionId: resultId,
          workflowId: request.workflowId,
          runtimeId: request.runtimeId,
          eligibleTaskIds: [],
          ineligibleTaskIds: [],
          blockedTaskIds: [...request.candidateTaskReferenceIds],
          reconciliationTaskIds: [],
          prohibitedTaskIds: [],
          orderedTaskIds: [],
          capacityLimitedTaskIds: [],
          decisionReasonsByTask: reasonsByTask,
          evidenceArtifactIds: [makeSchedulerIdentifier("schedulerEvidenceArtifactId", ["ready-set-dependency-failed", depResResult.dependencyGraphId])],
          resultClassification: "BLOCKED",
          evaluatedAt: new Date().toISOString(),
          contractVersion: PHASE1A9_READY_SET_DECISION_CONTRACT_VERSION,
        };
      }

      if (depResResult.resultClassification === "RECONCILIATION_REQUIRED") {
        const resultId = makeSchedulerIdentifier("readySetDecisionId", ["ready-eval", request.readySetDecisionId, "reconciliation-required"]);
        const reasonsByTask: Record<string, string[]> = {};
        for (const taskId of request.candidateTaskReferenceIds) {
          reasonsByTask[taskId] = ["Dependency resolution requires reconciliation."];
        }
        return {
          readySetDecisionId: resultId,
          workflowId: request.workflowId,
          runtimeId: request.runtimeId,
          eligibleTaskIds: [],
          ineligibleTaskIds: [],
          blockedTaskIds: [],
          reconciliationTaskIds: [...request.candidateTaskReferenceIds],
          prohibitedTaskIds: [],
          orderedTaskIds: [],
          capacityLimitedTaskIds: [],
          decisionReasonsByTask: reasonsByTask,
          evidenceArtifactIds: [makeSchedulerIdentifier("schedulerEvidenceArtifactId", ["ready-set-reconciliation-required", depResResult.dependencyGraphId])],
          resultClassification: "REQUIRES_RECONCILIATION",
          evaluatedAt: new Date().toISOString(),
          contractVersion: PHASE1A9_READY_SET_DECISION_CONTRACT_VERSION,
        };
      }

      // Valid dependency resolution: evaluate readiness
      const orderedTaskIds = depResResult.orderedTaskIds.slice();
      const reasonsByTask: Record<string, string[]> = {};

      // Filter candidates to those in the ordered list (maintains stable order)
      const orderedEligibleTasks = orderedTaskIds.filter((taskId) => request.candidateTaskReferenceIds.includes(taskId));

      if (orderedEligibleTasks.length === 0) {
        const resultId = makeSchedulerIdentifier("readySetDecisionId", ["ready-eval", request.readySetDecisionId, "empty"]);
        for (const taskId of request.candidateTaskReferenceIds) {
          reasonsByTask[taskId] = ["Task is not in the ordered task list."];
        }
        return {
          readySetDecisionId: resultId,
          workflowId: request.workflowId,
          runtimeId: request.runtimeId,
          eligibleTaskIds: [],
          ineligibleTaskIds: [...request.candidateTaskReferenceIds],
          blockedTaskIds: [],
          reconciliationTaskIds: [],
          prohibitedTaskIds: [],
          orderedTaskIds,
          capacityLimitedTaskIds: [],
          decisionReasonsByTask: reasonsByTask,
          evidenceArtifactIds: [makeSchedulerIdentifier("schedulerEvidenceArtifactId", ["ready-set-empty", depResResult.dependencyGraphId])],
          resultClassification: "EMPTY_READY_SET",
          evaluatedAt: new Date().toISOString(),
          contractVersion: PHASE1A9_READY_SET_DECISION_CONTRACT_VERSION,
        };
      }

      // Apply capacity limit (at S0, only 1 task can be selected)
      const capacityLimit = Math.min(request.laneCapacity, orderedEligibleTasks.length);
      const selectedTasks = orderedEligibleTasks.slice(0, capacityLimit);
      const capacityLimitedTasks = orderedEligibleTasks.slice(capacityLimit);

      for (const taskId of selectedTasks) {
        reasonsByTask[taskId] = ["Task passes all gates and is eligible for ready set."];
      }

      for (const taskId of capacityLimitedTasks) {
        reasonsByTask[taskId] = [`Task is eligible but limited by lane capacity. Lane capacity: ${request.laneCapacity}. Selected tasks: ${capacityLimit}.`];
      }

      const resultId = makeSchedulerIdentifier("readySetDecisionId", ["ready-eval", request.readySetDecisionId, "available"]);

      return {
        readySetDecisionId: resultId,
        workflowId: request.workflowId,
        runtimeId: request.runtimeId,
        eligibleTaskIds: selectedTasks.slice(),
        ineligibleTaskIds: capacityLimitedTasks.slice(),
        blockedTaskIds: [],
        reconciliationTaskIds: [],
        prohibitedTaskIds: [],
        orderedTaskIds,
        capacityLimitedTaskIds: capacityLimitedTasks.slice(),
        decisionReasonsByTask: reasonsByTask,
        evidenceArtifactIds: [makeSchedulerIdentifier("schedulerEvidenceArtifactId", ["ready-set-available", depResResult.dependencyGraphId])],
        resultClassification: "READY_SET_AVAILABLE",
        evaluatedAt: new Date().toISOString(),
        contractVersion: PHASE1A9_READY_SET_DECISION_CONTRACT_VERSION,
      };
    },
  };
}
