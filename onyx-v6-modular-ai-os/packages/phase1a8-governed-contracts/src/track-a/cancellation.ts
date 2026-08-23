export const CANCELLATION_STATES = [
  "REQUESTED",
  "ACKNOWLEDGING",
  "WAITING_FOR_SAFE_BOUNDARY",
  "PARTIALLY_ACKNOWLEDGED",
  "BLOCKED_BY_UNCERTAINTY",
  "CANCELLED",
  "FAILED_SAFE",
  "RECONCILIATION_REQUIRED",
  "PROHIBITED",
] as const;
export type CancellationState = (typeof CANCELLATION_STATES)[number];

export const CANCELLATION_TRANSITIONS: Record<CancellationState, readonly CancellationState[]> = {
  REQUESTED: ["ACKNOWLEDGING", "WAITING_FOR_SAFE_BOUNDARY", "BLOCKED_BY_UNCERTAINTY", "PROHIBITED"],
  ACKNOWLEDGING: ["WAITING_FOR_SAFE_BOUNDARY", "PARTIALLY_ACKNOWLEDGED", "BLOCKED_BY_UNCERTAINTY", "PROHIBITED"],
  WAITING_FOR_SAFE_BOUNDARY: ["PARTIALLY_ACKNOWLEDGED", "CANCELLED", "FAILED_SAFE", "RECONCILIATION_REQUIRED"],
  PARTIALLY_ACKNOWLEDGED: ["CANCELLED", "FAILED_SAFE", "RECONCILIATION_REQUIRED"],
  BLOCKED_BY_UNCERTAINTY: ["FAILED_SAFE", "RECONCILIATION_REQUIRED", "PROHIBITED"],
  CANCELLED: [],
  FAILED_SAFE: [],
  RECONCILIATION_REQUIRED: ["PROHIBITED"],
  PROHIBITED: [],
};

export interface CancellationRequest {
  cancellationRequestId: string;
  workflowId: string;
  runtimeId: string;
  taskId: string;
  requestingActor: string;
  requestingAgentId: string;
  targetAgentIds: string[];
  targetLeaseIds: string[];
  reason: string;
  riskClass: "R0" | "R1" | "R2" | "R3" | "R4" | "R5";
  safeBoundaryRequired: boolean;
  requestedAt: string;
  expiresAt: string;
  acknowledgements: string[];
  blockedAgents: string[];
  remoteUncertaintyStatus: "NONE" | "UNCERTAIN" | "KNOWN";
  finalCancellationState: CancellationState;
  approvalId: string;
  evidenceReferences: string[];
  contractVersion: string;
}

export function createCancellationRequest(input: Omit<CancellationRequest, "contractVersion"> & { contractVersion?: string }): CancellationRequest {
  if (!input.cancellationRequestId || !input.workflowId || !input.runtimeId || !input.taskId || !input.requestingActor || !input.requestingAgentId) {
    throw new Error("Cancellation requests require cancellationRequestId, workflowId, runtimeId, taskId, requestingActor, and requestingAgentId.");
  }
  if (input.targetAgentIds.length === 0 || input.targetLeaseIds.length === 0) {
    throw new Error("Cancellation requests require at least one target agent and one target lease.");
  }
  if (input.reason.trim().length === 0) {
    throw new Error("Cancellation request requires a reason.");
  }
  if (!(CANCELLATION_STATES as readonly string[]).includes(input.finalCancellationState)) {
    throw new Error(`Unsupported initial cancellation state: ${input.finalCancellationState}`);
  }
  return {
    ...input,
    evidenceReferences: [...input.evidenceReferences],
    targetAgentIds: [...input.targetAgentIds],
    targetLeaseIds: [...input.targetLeaseIds],
    acknowledgements: [...input.acknowledgements],
    blockedAgents: [...input.blockedAgents],
    contractVersion: input.contractVersion ?? "1.0.0",
  };
}

export function canTransitionCancellation(from: CancellationState, to: CancellationState): boolean {
  return (CANCELLATION_TRANSITIONS[from] ?? []).includes(to);
}

export function assertLegalCancellationTransition(from: CancellationState, to: CancellationState): void {
  if (!canTransitionCancellation(from, to)) {
    throw new Error(`Illegal cancellation transition: ${from} -> ${to}`);
  }
}

export function transitionCancellation(request: CancellationRequest, nextState: CancellationState): CancellationRequest {
  assertLegalCancellationTransition(request.finalCancellationState, nextState);
  return { ...request, finalCancellationState: nextState };
}

export function assertCancellationPermitted(
  request: CancellationRequest,
  options: { allowUncertainCancellation?: boolean; knownAgents?: readonly string[]; knownLeaseIds?: readonly string[]; leaseTaskMap?: Record<string, string> } = {},
): boolean {
  if (!request.requestingAgentId || !request.requestingActor) return false;
  const knownAgents = options.knownAgents ?? [];
  const knownLeaseIds = options.knownLeaseIds ?? [];
  if (knownAgents.length > 0 && !knownAgents.includes(request.requestingAgentId)) return false;
  if (knownLeaseIds.length > 0 && !request.targetLeaseIds.every((leaseId) => knownLeaseIds.includes(leaseId))) return false;
  if (options.leaseTaskMap) {
    for (const leaseId of request.targetLeaseIds) {
      const mappedTaskId = options.leaseTaskMap[leaseId];
      if (mappedTaskId && mappedTaskId !== request.taskId) {
        throw new Error(`Cancellation request rejected: target lease ${leaseId} does not belong to task ${request.taskId}.`);
      }
    }
  }
  if (request.safeBoundaryRequired && request.remoteUncertaintyStatus === "UNCERTAIN") {
    return options.allowUncertainCancellation ?? false;
  }
  return true;
}

export function evaluateCancellationState(request: CancellationRequest): CancellationState {
  if (request.remoteUncertaintyStatus === "UNCERTAIN" && request.safeBoundaryRequired) {
    return "BLOCKED_BY_UNCERTAINTY";
  }
  if (request.finalCancellationState === "REQUESTED") {
    return "REQUESTED";
  }
  return request.finalCancellationState;
}
