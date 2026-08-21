import { AGENT_COORDINATION_CONTRACT_VERSION } from "../shared/versions";
import type { RiskClass } from "../shared/risk-classes";
import type { ParallelSafetyClass } from "../shared/parallel-safety";
import type { OperationClass } from "./capability-declaration";

export const TASK_STATUSES = ["DRAFT", "READY", "BLOCKED", "LEASED", "IN_PROGRESS", "COMPLETED", "FAILED_SAFE", "CANCELLED", "RECONCILIATION_REQUIRED"] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export interface Task {
  taskId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  stepId: string;
  capabilityId: string;
  scopeHash: string;
  approvalId: string;
  approvalPolicyVersion: string;
  riskClass: RiskClass;
  inputDigest: string;
  idempotencyKey: string;
  dependencyTaskIds: string[];
  requiredAgentCapabilities: string[];
  requiredPermissions: string[];
  requiredConnectorScopes: string[];
  requiredMemoryScopes: string[];
  requiredContextPackageId?: string;
  priority: number;
  operationClass: OperationClass;
  parallelSafetyClass: ParallelSafetyClass;
  promotionRequired: boolean;
  tokenBudgetId: string;
  costBudgetId: string;
  createdAt: string;
  expiresAt: string;
  contractVersion: string;
  status: TaskStatus;
  evidenceReferences: string[];
}

const TASK_TRANSITIONS: Record<TaskStatus, readonly TaskStatus[]> = {
  DRAFT: ["READY", "BLOCKED", "CANCELLED"],
  READY: ["BLOCKED", "LEASED", "CANCELLED"],
  BLOCKED: ["READY", "CANCELLED"],
  LEASED: ["IN_PROGRESS", "RECONCILIATION_REQUIRED"],
  IN_PROGRESS: ["COMPLETED", "FAILED_SAFE", "CANCELLED", "RECONCILIATION_REQUIRED"],
  RECONCILIATION_REQUIRED: ["READY", "FAILED_SAFE", "CANCELLED"],
  COMPLETED: [],
  FAILED_SAFE: [],
  CANCELLED: [],
};

export function canTransitionTask(from: TaskStatus, to: TaskStatus): boolean {
  return TASK_TRANSITIONS[from].includes(to);
}

export function assertLegalTaskTransition(from: TaskStatus, to: TaskStatus): void {
  if (!canTransitionTask(from, to)) {
    throw new Error(`Illegal task transition: ${from} -> ${to}`);
  }
}

export function transitionTask(task: Task, next: TaskStatus): Task {
  assertLegalTaskTransition(task.status, next);
  return { ...task, status: next };
}

function sameStringSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

/** A reassigned task must never expand or drop its governed scope, approval lineage, or evidence lineage. */
export function assertReassignmentPreservesLineage(before: Task, after: Task): void {
  if (before.scopeHash !== after.scopeHash) throw new Error("Task reassignment must preserve scopeHash.");
  if (before.approvalId !== after.approvalId) throw new Error("Task reassignment must preserve approval lineage.");
  if (!sameStringSet(before.requiredPermissions, after.requiredPermissions)) throw new Error("Task reassignment must preserve permission scope.");
  if (!sameStringSet(before.requiredMemoryScopes, after.requiredMemoryScopes)) throw new Error("Task reassignment must preserve memory scope.");
  if (!sameStringSet(before.requiredConnectorScopes, after.requiredConnectorScopes)) throw new Error("Task reassignment must preserve connector scope.");
  if (before.idempotencyKey !== after.idempotencyKey) throw new Error("Task reassignment must preserve the idempotency key.");
  for (const priorEvidence of before.evidenceReferences) {
    if (!after.evidenceReferences.includes(priorEvidence)) {
      throw new Error("Task reassignment must preserve evidence lineage.");
    }
  }
}

/** A task must never expand its own approval scope beyond what was already approved. */
export function assertTaskDoesNotExpandApprovalScope(task: Task, approvedActions: readonly string[], requestedActions: readonly string[]): void {
  for (const action of requestedActions) {
    if (!approvedActions.includes(action)) {
      throw new Error(`Task ${task.taskId} must not expand its approval scope to include "${action}".`);
    }
  }
}

export function createDraftTask(input: Omit<Task, "contractVersion" | "status" | "evidenceReferences">): Task {
  return { ...input, contractVersion: AGENT_COORDINATION_CONTRACT_VERSION, status: "DRAFT", evidenceReferences: [] };
}
