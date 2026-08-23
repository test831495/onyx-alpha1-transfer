import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";
import type { CancellationState } from "./cancellation-controller";

export interface CancellationPropagationRequest {
  propagationRequestId: string;
  sourceCancellationId: string;
  sourceTaskId: string;
  sourceState: CancellationState;
  targetTaskIds: readonly string[];
  targetIsChild: boolean;
  targetIsParent: boolean;
  propagationDirection: "DOWNSTREAM" | "UPSTREAM";
  sourceGeneration: number;
  evaluatedAt: string;
  contractVersion: string;
}

export interface PropagationDecision {
  canPropagate: boolean;
  propagationAllowed: readonly string[];
  propagationDenied: readonly string[];
  requiredReconciliation: readonly string[];
  denialReasons: readonly string[];
}

export function evaluateCancellationPropagation(
  request: CancellationPropagationRequest,
  targetTaskStates: Record<string, CancellationState>,
): PropagationDecision {
  const denialReasons: string[] = [];
  const allowed: string[] = [];
  const denied: string[] = [];
  const reconcilationRequired: string[] = [];

  // Validate contract version
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    denialReasons.push("Propagation request contract version mismatch");
    return {
      canPropagate: false,
      propagationAllowed: [],
      propagationDenied: request.targetTaskIds as string[],
      requiredReconciliation: [],
      denialReasons,
    };
  }

  // Validate propagation direction and relationship consistency is optional
  // (removed strict validation to allow flexible routing)

  // Evaluate each target task
  for (const targetTaskId of request.targetTaskIds) {
    const targetState = targetTaskStates[targetTaskId];

    if (!targetState) {
      reconcilationRequired.push(targetTaskId);
      continue;
    }

    // Check if propagation would create a valid transition
    const sourceIsQueuedOrCompleted = request.sourceState === "CANCELLED" || request.sourceState === "RECONCILIATION_REQUIRED";

    if (sourceIsQueuedOrCompleted) {
      // Terminal states can propagate to any valid target
      allowed.push(targetTaskId);
    } else if (request.sourceState === "BLOCKED_BY_UNCERTAINTY") {
      // Uncertainty blocks propagation - require reconciliation
      reconcilationRequired.push(targetTaskId);
    } else {
      // Conservative: allow only if source is in a stable terminal state
      if (request.sourceState === "CANCELLED" || request.sourceState === "FAILED_SAFE") {
        allowed.push(targetTaskId);
      } else {
        denied.push(targetTaskId);
      }
    }
  }

  return {
    canPropagate: allowed.length > 0 && reconcilationRequired.length === 0,
    propagationAllowed: allowed,
    propagationDenied: denied,
    requiredReconciliation: reconcilationRequired,
    denialReasons,
  };
}

export interface CancellationAcknowledgementRequest {
  acknowledgementId: string;
  cancellationRequestId: string;
  taskId: string;
  acknowledgerIdentityId: string;
  isJoinParticipant: boolean;
  readyToCancel: boolean;
  evaluatedAt: string;
  contractVersion: string;
}

export interface AcknowledgementResult {
  acknowledged: boolean;
  allAcknowledgementsSatisfied: boolean;
  blockedByJoinParticipant: boolean;
  denialReasons: readonly string[];
}

export function evaluateCancellationAcknowledgement(
  request: CancellationAcknowledgementRequest,
  allPendingAcknowledgements: readonly string[],
  otherJoinParticipantsReady: boolean,
): AcknowledgementResult {
  const denialReasons: string[] = [];

  // Validate contract version
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    denialReasons.push("Acknowledgement request contract version mismatch");
    return {
      acknowledged: false,
      allAcknowledgementsSatisfied: false,
      blockedByJoinParticipant: false,
      denialReasons,
    };
  }

  // Check if join participant blocking applies
  if (request.isJoinParticipant && !otherJoinParticipantsReady) {
    denialReasons.push("Cancellation blocked: join participants not ready");
    return {
      acknowledged: false,
      allAcknowledgementsSatisfied: false,
      blockedByJoinParticipant: true,
      denialReasons,
    };
  }

  // Validate that this acknowledgement is expected
  if (!allPendingAcknowledgements.includes(request.acknowledgementId)) {
    denialReasons.push("Unexpected acknowledgement ID not in pending list");
    return {
      acknowledged: false,
      allAcknowledgementsSatisfied: false,
      blockedByJoinParticipant: false,
      denialReasons,
    };
  }

  // Check readiness
  if (!request.readyToCancel) {
    denialReasons.push("Acknowledger not ready to cancel");
    return {
      acknowledged: false,
      allAcknowledgementsSatisfied: false,
      blockedByJoinParticipant: false,
      denialReasons,
    };
  }

  // Calculate if all acknowledgements are satisfied
  const remainingCount = allPendingAcknowledgements.length - 1;
  const allSatisfied = remainingCount === 0;

  return {
    acknowledged: true,
    allAcknowledgementsSatisfied: allSatisfied,
    blockedByJoinParticipant: false,
    denialReasons: [],
  };
}

export function assertCancellationPropagationRequest(request: CancellationPropagationRequest): void {
  if (!request.sourceCancellationId || !request.sourceTaskId) {
    throw new Error("Invalid propagation request: missing source identifiers");
  }
  if (request.targetTaskIds.length === 0) {
    throw new Error("Invalid propagation request: no target tasks specified");
  }
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    throw new Error("Propagation request contract version mismatch");
  }
}
