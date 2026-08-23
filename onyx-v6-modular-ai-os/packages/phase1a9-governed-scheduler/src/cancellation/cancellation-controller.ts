import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";

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

export const CANCELLATION_CONTEXT_TYPES = ["QUEUED_TASK", "LEASED_TASK", "PARENT", "PROMOTION", "REPEAT"] as const;
export type CancellationContextType = (typeof CANCELLATION_CONTEXT_TYPES)[number];

export interface CancellationRequest {
  cancellationRequestId: string;
  taskId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  agentIdentityId: string;
  requesterIdentityId: string;
  contextType: CancellationContextType;
  currentState: CancellationState;
  currentGeneration: number;
  hasParentCancellation: boolean;
  hasLiveJoinParticipants: boolean;
  hasPromotionInFlight: boolean;
  hasRepeatScheduled: boolean;
  pendingAcknowledgements: readonly string[];
  requestedAt: string;
  evaluatedAt: string;
  contractVersion: string;
  denialReasons: readonly string[];
}

export interface CancellationEvaluationResult {
  decision:
    | "CANCELLATION_ACKNOWLEDGED"
    | "AWAITING_SAFE_BOUNDARY"
    | "PARTIALLY_ACKNOWLEDGED_CONTINUE"
    | "BLOCKED_DEFER_DECISION"
    | "CANCELLATION_COMPLETE"
    | "FAILED_SAFE_REQUIRED"
    | "RECONCILIATION_REQUIRED"
    | "CANCELLATION_PROHIBITED";
  targetState: CancellationState;
  isTransitionValid: boolean;
  nextActionId?: string;
  propagateToChildren: boolean;
  propagateToParent: boolean;
  affectedTaskIds: readonly string[];
  denialReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
}

function isCancellationTransitionValid(
  from: CancellationState,
  to: CancellationState,
): boolean {
  const validTransitions: Record<CancellationState, CancellationState[]> = {
    REQUESTED: ["ACKNOWLEDGING", "CANCELLED", "PROHIBITED", "FAILED_SAFE"],
    ACKNOWLEDGING: ["WAITING_FOR_SAFE_BOUNDARY", "PARTIALLY_ACKNOWLEDGED", "BLOCKED_BY_UNCERTAINTY", "CANCELLED", "PROHIBITED", "FAILED_SAFE"],
    WAITING_FOR_SAFE_BOUNDARY: ["PARTIALLY_ACKNOWLEDGED", "BLOCKED_BY_UNCERTAINTY", "CANCELLED", "FAILED_SAFE"],
    PARTIALLY_ACKNOWLEDGED: ["CANCELLED", "BLOCKED_BY_UNCERTAINTY", "RECONCILIATION_REQUIRED", "FAILED_SAFE"],
    BLOCKED_BY_UNCERTAINTY: ["RECONCILIATION_REQUIRED", "FAILED_SAFE"],
    CANCELLED: ["RECONCILIATION_REQUIRED"],
    FAILED_SAFE: ["RECONCILIATION_REQUIRED"],
    RECONCILIATION_REQUIRED: [],
    PROHIBITED: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

export function evaluateCancellationStateTransition(
  request: CancellationRequest,
  requesterIsAuthorized: boolean,
  isRequesterSameAgent: boolean,
): CancellationEvaluationResult {
  const denialReasons: string[] = [];
  const affectedTaskIds: string[] = [request.taskId];

  // Validate contract version
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    return {
      decision: "CANCELLATION_PROHIBITED",
      targetState: "PROHIBITED",
      isTransitionValid: false,
      propagateToChildren: false,
      propagateToParent: false,
      affectedTaskIds,
      denialReasons: ["Contract version mismatch"],
      evidenceArtifactIds: [],
    };
  }

  // Authorize cancellation request
  if (!requesterIsAuthorized) {
    denialReasons.push("Requester is not authorized to cancel this task");
    return {
      decision: "CANCELLATION_PROHIBITED",
      targetState: "PROHIBITED",
      isTransitionValid: false,
      propagateToChildren: false,
      propagateToParent: false,
      affectedTaskIds,
      denialReasons,
      evidenceArtifactIds: [],
    };
  }

  // Check for uncertainty blocking
  if (request.hasLiveJoinParticipants && request.contextType === "LEASED_TASK") {
    denialReasons.push("Cannot cancel task with live join participants under uncertainty");
    return {
      decision: "BLOCKED_DEFER_DECISION",
      targetState: "BLOCKED_BY_UNCERTAINTY",
      isTransitionValid: isCancellationTransitionValid(request.currentState, "BLOCKED_BY_UNCERTAINTY"),
      propagateToChildren: false,
      propagateToParent: false,
      affectedTaskIds,
      denialReasons,
      evidenceArtifactIds: [],
    };
  }

  // Handle parent cancellation cascading
  if (request.hasParentCancellation) {
    if (!isRequesterSameAgent) {
      denialReasons.push("Child cancellation propagation requires same-agent authorization");
      return {
        decision: "BLOCKED_DEFER_DECISION",
        targetState: "BLOCKED_BY_UNCERTAINTY",
        isTransitionValid: isCancellationTransitionValid(request.currentState, "BLOCKED_BY_UNCERTAINTY"),
        propagateToChildren: false,
        propagateToParent: false,
        affectedTaskIds,
        denialReasons,
        evidenceArtifactIds: [],
      };
    }

    return {
      decision: "CANCELLATION_ACKNOWLEDGED",
      targetState: "ACKNOWLEDGING",
      isTransitionValid: isCancellationTransitionValid(request.currentState, "ACKNOWLEDGING"),
      propagateToChildren: true,
      propagateToParent: false,
      affectedTaskIds,
      denialReasons: [],
      evidenceArtifactIds: [],
    };
  }

  // Handle safe boundary waiting
  if (request.contextType === "LEASED_TASK" && request.pendingAcknowledgements.length > 0) {
    return {
      decision: "AWAITING_SAFE_BOUNDARY",
      targetState: "WAITING_FOR_SAFE_BOUNDARY",
      isTransitionValid: isCancellationTransitionValid(request.currentState, "WAITING_FOR_SAFE_BOUNDARY"),
      propagateToChildren: false,
      propagateToParent: false,
      affectedTaskIds,
      denialReasons: [],
      evidenceArtifactIds: [],
    };
  }

  // Partial acknowledgement handling
  if (request.pendingAcknowledgements.length > 0 && request.pendingAcknowledgements.length < 3) {
    return {
      decision: "PARTIALLY_ACKNOWLEDGED_CONTINUE",
      targetState: "PARTIALLY_ACKNOWLEDGED",
      isTransitionValid: isCancellationTransitionValid(request.currentState, "PARTIALLY_ACKNOWLEDGED"),
      propagateToChildren: true,
      propagateToParent: false,
      affectedTaskIds,
      denialReasons: [],
      evidenceArtifactIds: [],
    };
  }

  // Check for failed safe conditions
  if (request.hasPromotionInFlight && request.contextType !== "PROMOTION") {
    denialReasons.push("Cannot safely cancel task with promotion in flight");
    return {
      decision: "FAILED_SAFE_REQUIRED",
      targetState: "FAILED_SAFE",
      isTransitionValid: isCancellationTransitionValid(request.currentState, "FAILED_SAFE"),
      propagateToChildren: false,
      propagateToParent: false,
      affectedTaskIds,
      denialReasons,
      evidenceArtifactIds: [],
    };
  }

  // Check for repeat cancellation idempotency
  if (request.hasRepeatScheduled && request.currentState === "CANCELLED") {
    // Idempotent repeat cancellation - already cancelled
    return {
      decision: "CANCELLATION_COMPLETE",
      targetState: "CANCELLED",
      isTransitionValid: true,
      propagateToChildren: false,
      propagateToParent: false,
      affectedTaskIds,
      denialReasons: [],
      evidenceArtifactIds: [],
    };
  }

  // Normal completion path
  if (request.pendingAcknowledgements.length === 0) {
    return {
      decision: "CANCELLATION_COMPLETE",
      targetState: "CANCELLED",
      isTransitionValid: isCancellationTransitionValid(request.currentState, "CANCELLED"),
      propagateToChildren: true,
      propagateToParent: request.hasParentCancellation,
      affectedTaskIds,
      denialReasons: [],
      evidenceArtifactIds: [],
    };
  }

  // Default: reconciliation required
  return {
    decision: "RECONCILIATION_REQUIRED",
    targetState: "RECONCILIATION_REQUIRED",
    isTransitionValid: isCancellationTransitionValid(request.currentState, "RECONCILIATION_REQUIRED"),
    propagateToChildren: false,
    propagateToParent: false,
    affectedTaskIds,
    denialReasons: ["Unexpected cancellation state requires reconciliation"],
    evidenceArtifactIds: [],
  };
}

export function assertCancellationRequest(request: CancellationRequest): void {
  if (!request.taskId || !request.workflowId || !request.runtimeId) {
    throw new Error("Invalid cancellation request: missing required identifiers");
  }
  if (!CANCELLATION_STATES.includes(request.currentState)) {
    throw new Error(`Invalid cancellation state: ${request.currentState}`);
  }
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    throw new Error("Cancellation request contract version mismatch");
  }
}
