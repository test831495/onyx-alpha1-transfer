import { createHash } from "node:crypto";
import type { BudgetTypeDecision } from "./budget-governor";

export interface BudgetAllocationSummary {
  budgetId: string;
  budgetType: string;
  unit: string;
  workflowId: string;
  taskId?: string;
  agentId?: string;
  modelClass?: string;
  reserved: number;
  estimated: number;
  consumed: number;
  remaining: number;
  warning: boolean;
  hardStop: boolean;
  decision: string;
}

export interface BudgetAggregation {
  workflowId: string;
  agentId: string;
  modelClass: string;
  byType: Readonly<Record<string, { budgetIds: readonly string[]; consumed: number; reserved: number; remaining: number; warnings: number; hardStops: number; units: readonly string[] }>>;
  deniedBudgetIds: readonly string[];
  reconciliationBudgetIds: readonly string[];
  failedTaskIds: readonly string[];
  workflowBudgetSummary: readonly BudgetAllocationSummary[];
  agentAllocationSummaries: readonly BudgetAllocationSummary[];
  taskAllocationSummaries: readonly BudgetAllocationSummary[];
  modelClassSummaries: readonly BudgetAllocationSummary[];
  apiCallSummaries: readonly BudgetAllocationSummary[];
  costSummaries: readonly BudgetAllocationSummary[];
  attemptSummaries: readonly BudgetAllocationSummary[];
  evidenceStorageSummaries: readonly BudgetAllocationSummary[];
  laneCapacitySummaries: readonly BudgetAllocationSummary[];
  warningBudgetIds: readonly string[];
  hardStopBudgetIds: readonly string[];
  deniedDecisionIds: readonly string[];
  reconciliationDecisionIds: readonly string[];
  overageDecisionIds: readonly string[];
  evidenceArtifactIds: readonly string[];
  aggregateDigest: string;
}

const stable = <T>(values: readonly T[]): readonly T[] => [...values].sort((a, b) => String(a).localeCompare(String(b)));
const summarize = (workflowId: string, agentId: string, modelClass: string, taskId: string | undefined, decision: BudgetTypeDecision): BudgetAllocationSummary => ({
  budgetId: decision.budgetId,
  budgetType: decision.budgetType,
  unit: decision.unit,
  workflowId,
  taskId,
  agentId,
  modelClass,
  reserved: decision.reserved,
  estimated: decision.estimated,
  consumed: decision.consumed,
  remaining: decision.remaining,
  warning: decision.warning,
  hardStop: decision.hardStop,
  decision: decision.decision,
});

export function aggregateBudgetDecisions(workflowId: string, agentId: string, modelClass: string, taskIds: readonly string[], decisions: readonly BudgetTypeDecision[]): BudgetAggregation {
  const sorted = [...decisions].sort((a, b) => `${a.budgetType}:${a.budgetId}`.localeCompare(`${b.budgetType}:${b.budgetId}`));
  const byType: Record<string, { budgetIds: string[]; consumed: number; reserved: number; remaining: number; warnings: number; hardStops: number; units: string[] }> = {};
  for (const item of sorted) {
    const group = byType[item.budgetType] ??= { budgetIds: [], consumed: 0, reserved: 0, remaining: 0, warnings: 0, hardStops: 0, units: [] };
    group.budgetIds.push(item.budgetId);
    group.consumed += item.consumed;
    group.reserved += item.reserved;
    group.remaining += item.remaining;
    group.warnings += item.warning ? 1 : 0;
    group.hardStops += item.hardStop ? 1 : 0;
    group.units.push(item.unit);
  }
  const workflowBudgetSummary = sorted.map((decision, index) => summarize(workflowId, agentId, modelClass, taskIds[index] ?? taskIds[0], decision));
  const agentAllocationSummaries = workflowBudgetSummary.map((summary) => ({ ...summary, taskId: undefined }));
  const taskAllocationSummaries = workflowBudgetSummary.map((summary, index) => ({ ...summary, taskId: taskIds[index] ?? taskIds[0] }));
  const modelClassSummaries = workflowBudgetSummary.filter((summary) => summary.modelClass === modelClass);
  const apiCallSummaries = workflowBudgetSummary.filter((summary) => summary.budgetType === "API_CALLS");
  const costSummaries = workflowBudgetSummary.filter((summary) => summary.budgetType === "MONEY");
  const attemptSummaries = workflowBudgetSummary.filter((summary) => summary.budgetType === "ATTEMPTS");
  const evidenceStorageSummaries = workflowBudgetSummary.filter((summary) => summary.budgetType === "EVIDENCE_STORAGE");
  const laneCapacitySummaries = workflowBudgetSummary.filter((summary) => summary.budgetType === "LANE_CAPACITY");
  const warningBudgetIds = stable(sorted.filter((item) => item.warning).map((item) => item.budgetId));
  const hardStopBudgetIds = stable(sorted.filter((item) => item.hardStop).map((item) => item.budgetId));
  const deniedDecisionIds = stable(sorted.filter((item) => item.decision.startsWith("DENIED") || item.decision === "PROHIBITED" || item.decision === "FAILED_SAFE").map((item) => item.budgetId));
  const reconciliationDecisionIds = stable(sorted.filter((item) => item.decision === "REQUIRES_RECONCILIATION").map((item) => item.budgetId));
  const overageDecisionIds = stable(sorted.filter((item) => item.remaining < 0 || item.decision === "HARD_STOP").map((item) => item.budgetId));
  const evidenceArtifactIds = stable(Array.from(new Set(sorted.flatMap((item) => [...item.evidenceArtifactIds]))));
  const aggregateDigest = createHash("sha256").update(JSON.stringify({ workflowId, agentId, modelClass, taskIds: stable(taskIds), decisions: sorted.map((item) => ({ budgetId: item.budgetId, budgetType: item.budgetType, reserved: item.reserved, estimated: item.estimated, consumed: item.consumed, remaining: item.remaining, warning: item.warning, hardStop: item.hardStop, decision: item.decision })) })).digest("hex");

  return {
    workflowId,
    agentId,
    modelClass,
    byType,
    deniedBudgetIds: stable(sorted.filter((item) => item.decision.startsWith("DENIED") || item.hardStop).map((item) => item.budgetId)),
    reconciliationBudgetIds: reconciliationDecisionIds,
    failedTaskIds: stable(taskIds),
    workflowBudgetSummary,
    agentAllocationSummaries,
    taskAllocationSummaries,
    modelClassSummaries,
    apiCallSummaries,
    costSummaries,
    attemptSummaries,
    evidenceStorageSummaries,
    laneCapacitySummaries,
    warningBudgetIds,
    hardStopBudgetIds,
    deniedDecisionIds,
    reconciliationDecisionIds,
    overageDecisionIds,
    evidenceArtifactIds,
    aggregateDigest,
  };
}

export function aggregateWorkflowBudget(workflowId: string, agentId: string, modelClass: string, taskIds: readonly string[], decisions: readonly BudgetTypeDecision[]): BudgetAggregation {
  return aggregateBudgetDecisions(workflowId, agentId, modelClass, taskIds, decisions);
}
