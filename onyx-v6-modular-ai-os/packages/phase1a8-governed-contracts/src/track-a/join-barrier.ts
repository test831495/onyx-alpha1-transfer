export const JOIN_BARRIER_STATES = [
  "WAITING",
  "PARTIALLY_SATISFIED",
  "SATISFIED",
  "BLOCKED",
  "FAILED_SAFE",
  "RECONCILIATION_REQUIRED",
  "CANCELLED",
  "RELEASED",
] as const;
export type JoinBarrierState = (typeof JOIN_BARRIER_STATES)[number];

export const JOIN_TRANSITIONS: Record<JoinBarrierState, readonly JoinBarrierState[]> = {
  WAITING: ["PARTIALLY_SATISFIED", "SATISFIED", "BLOCKED", "RECONCILIATION_REQUIRED", "CANCELLED", "RELEASED"],
  PARTIALLY_SATISFIED: ["SATISFIED", "BLOCKED", "RECONCILIATION_REQUIRED", "CANCELLED", "RELEASED"],
  SATISFIED: ["RELEASED", "BLOCKED"],
  BLOCKED: ["WAITING", "RECONCILIATION_REQUIRED", "CANCELLED"],
  FAILED_SAFE: [],
  RECONCILIATION_REQUIRED: ["WAITING", "BLOCKED", "CANCELLED"],
  CANCELLED: [],
  RELEASED: [],
};

export interface JoinBarrier {
  barrierId: string;
  workflowId: string;
  runtimeId: string;
  requiredTaskIds: string[];
  completedTaskIds: string[];
  failedTaskIds: string[];
  uncertainTaskIds: string[];
  cancelledTaskIds: string[];
  minimumSuccessRule: number;
  allRequiredRule: boolean;
  evidenceRequired: boolean;
  validationRequired: boolean;
  promotionEligibility: boolean;
  releaseStatus: JoinBarrierState;
  releasedAt?: string;
  contractVersion: string;
  evidenceReferences: string[];
  validationReferences: string[];
  approvalId: string;
  approvalValid: boolean;
  checkpointLineageValid: boolean;
  scopeVersionMatches: boolean;
  securityReviewComplete: boolean;
  budgetSufficient: boolean;
  connectorScopeVerified: boolean;
  memoryScopeVerified: boolean;
  personaProtected: boolean;
  promotionRequirementsComplete: boolean;
  reconciliationComplete: boolean;
}

export function createJoinBarrier(input: Omit<JoinBarrier, "releaseStatus" | "contractVersion"> & { releaseStatus?: JoinBarrierState; contractVersion?: string }): JoinBarrier {
  if (!input.barrierId || !input.workflowId || !input.runtimeId) {
    throw new Error("Join barrier requires barrierId, workflowId, and runtimeId.");
  }
  if (!Array.isArray(input.requiredTaskIds) || input.requiredTaskIds.length === 0) {
    throw new Error("Join barrier requires at least one required task.");
  }
  if (!Number.isFinite(input.minimumSuccessRule) || input.minimumSuccessRule < 0) {
    throw new Error("Join barrier minimumSuccessRule must be a non-negative number.");
  }
  return {
    ...input,
    releaseStatus: input.releaseStatus ?? "WAITING",
    contractVersion: input.contractVersion ?? "1.0.0",
    requiredTaskIds: [...input.requiredTaskIds],
    completedTaskIds: [...input.completedTaskIds],
    failedTaskIds: [...input.failedTaskIds],
    uncertainTaskIds: [...input.uncertainTaskIds],
    cancelledTaskIds: [...input.cancelledTaskIds],
    evidenceReferences: [...input.evidenceReferences],
    validationReferences: [...input.validationReferences],
  };
}

export function canTransitionJoinBarrier(from: JoinBarrierState, to: JoinBarrierState): boolean {
  return (JOIN_TRANSITIONS[from] ?? []).includes(to);
}

export function assertLegalJoinTransition(from: JoinBarrierState, to: JoinBarrierState): void {
  if (!canTransitionJoinBarrier(from, to)) {
    throw new Error(`Illegal join barrier transition: ${from} -> ${to}`);
  }
}

export function evaluateJoinBarrier(barrier: JoinBarrier): JoinBarrier {
  if (barrier.uncertainTaskIds.length > 0) {
    throw new Error("Join barrier is blocked by uncertain required tasks.");
  }
  if (barrier.cancelledTaskIds.length > 0) {
    throw new Error("Join barrier is blocked by cancelled required tasks.");
  }
  if (barrier.failedTaskIds.length > 0 && barrier.allRequiredRule) {
    throw new Error("Join barrier is blocked by failed required tasks.");
  }
  if (barrier.evidenceRequired && barrier.evidenceReferences.length === 0) {
    throw new Error("Join barrier cannot release without required evidence.");
  }
  if (barrier.validationRequired && barrier.validationReferences.length === 0) {
    throw new Error("Join barrier cannot release without required validation.");
  }
  if (!barrier.approvalValid || !barrier.checkpointLineageValid || !barrier.scopeVersionMatches) {
    throw new Error("Join barrier cannot release without valid approval and checkpoint lineage.");
  }
  if (!barrier.securityReviewComplete || !barrier.budgetSufficient || !barrier.connectorScopeVerified || !barrier.memoryScopeVerified || !barrier.personaProtected) {
    throw new Error("Join barrier cannot release without complete governance and security checks.");
  }
  if (!barrier.promotionRequirementsComplete || !barrier.reconciliationComplete) {
    throw new Error("Join barrier cannot release without complete promotion or reconciliation prerequisites.");
  }

  const requiredSet = new Set(barrier.requiredTaskIds);
  const completedSet = new Set(barrier.completedTaskIds);
  const matched = [...requiredSet].filter((taskId) => completedSet.has(taskId));
  if (matched.length < barrier.minimumSuccessRule) {
    throw new Error("Join barrier cannot release because minimum success rule is not satisfied.");
  }

  const finalBarrier = { ...barrier, releaseStatus: "RELEASED" as const, releasedAt: barrier.releasedAt ?? "2026-08-21T00:00:00.000Z" };
  assertLegalJoinTransition(barrier.releaseStatus, finalBarrier.releaseStatus);
  return finalBarrier;
}
