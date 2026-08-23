import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";

export const JOIN_POLICIES = ["ALL_SUCCESS", "MINIMUM_SUCCESS", "FIRST_VALID", "COLLECT_ALL", "ORDERED_MERGE", "REVIEW_GATE"] as const;
export type JoinPolicy = (typeof JOIN_POLICIES)[number];

export const JOIN_STATES = ["WAITING", "PARTIALLY_SATISFIED", "SATISFIED", "BLOCKED", "FAILED_SAFE", "RECONCILIATION_REQUIRED", "CANCELLED", "RELEASED"] as const;
export type JoinState = (typeof JOIN_STATES)[number];

export interface JoinParticipant {
  participantId: string;
  taskId: string;
  state: "PENDING" | "SATISFIED" | "FAILED" | "CANCELLED";
  sequenceOrder: number;
  resultDigest?: string;
}

export interface JoinCoordinatorRequest {
  joinCoordinatorId: string;
  parentTaskId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  policy: JoinPolicy;
  participants: readonly JoinParticipant[];
  currentState: JoinState;
  satisfiedCount: number;
  failedCount: number;
  cancelledCount: number;
  timeout?: string;
  evaluatedAt: string;
  contractVersion: string;
}

export interface JoinEvaluationResult {
  decision:
    | "JOIN_WAITING"
    | "JOIN_PARTIALLY_SATISFIED"
    | "JOIN_SATISFIED"
    | "JOIN_BLOCKED"
    | "JOIN_FAILED"
    | "JOIN_CANCELLED"
    | "JOIN_RECONCILIATION_REQUIRED"
    | "JOIN_RELEASED";
  targetState: JoinState;
  isValidTransition: boolean;
  canReleaseParentTask: boolean;
  satisfiedParticipantIds: readonly string[];
  blockedParticipantIds: readonly string[];
  affectedTaskIds: readonly string[];
  denialReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
}

function isJoinTransitionValid(from: JoinState, to: JoinState): boolean {
  const validTransitions: Record<JoinState, JoinState[]> = {
    WAITING: ["PARTIALLY_SATISFIED", "SATISFIED", "BLOCKED", "CANCELLED"],
    PARTIALLY_SATISFIED: ["SATISFIED", "BLOCKED", "FAILED_SAFE", "CANCELLED"],
    SATISFIED: ["RELEASED", "RECONCILIATION_REQUIRED"],
    BLOCKED: ["FAILED_SAFE", "RECONCILIATION_REQUIRED"],
    FAILED_SAFE: ["RECONCILIATION_REQUIRED"],
    RECONCILIATION_REQUIRED: [],
    CANCELLED: ["RECONCILIATION_REQUIRED"],
    RELEASED: [],
  };

  return validTransitions[from]?.includes(to) ?? false;
}

function evaluateAllSuccessPolicy(request: JoinCoordinatorRequest): JoinEvaluationResult {
  const affectedTaskIds = request.participants.map(p => p.taskId);

  // ALL_SUCCESS requires all participants to succeed
  if (request.failedCount > 0 || request.cancelledCount > 0) {
    const satisfied = request.participants.filter(p => p.state === "SATISFIED");
    const notSatisfied = request.participants.filter(p => p.state !== "SATISFIED");

    return {
      decision: "JOIN_FAILED",
      targetState: "FAILED_SAFE",
      isValidTransition: isJoinTransitionValid(request.currentState, "FAILED_SAFE"),
      canReleaseParentTask: false,
      satisfiedParticipantIds: satisfied.map(p => p.participantId),
      blockedParticipantIds: notSatisfied.map(p => p.participantId),
      affectedTaskIds,
      denialReasons: [
        request.failedCount > 0 ? `${request.failedCount} participants failed` : "",
        request.cancelledCount > 0 ? `${request.cancelledCount} participants cancelled` : "",
      ].filter(Boolean),
      evidenceArtifactIds: [],
    };
  }

  if (request.satisfiedCount === request.participants.length) {
    return {
      decision: "JOIN_SATISFIED",
      targetState: "SATISFIED",
      isValidTransition: isJoinTransitionValid(request.currentState, "SATISFIED"),
      canReleaseParentTask: true,
      satisfiedParticipantIds: request.participants.map(p => p.participantId),
      blockedParticipantIds: [],
      affectedTaskIds,
      denialReasons: [],
      evidenceArtifactIds: [],
    };
  }

  const satisfied = request.participants.filter(p => p.state === "SATISFIED");
  const notSatisfied = request.participants.filter(p => p.state !== "SATISFIED");

  return {
    decision: "JOIN_WAITING",
    targetState: "WAITING",
    isValidTransition: isJoinTransitionValid(request.currentState, "WAITING"),
    canReleaseParentTask: false,
    satisfiedParticipantIds: satisfied.map(p => p.participantId),
    blockedParticipantIds: notSatisfied.map(p => p.participantId),
    affectedTaskIds,
    denialReasons: [],
    evidenceArtifactIds: [],
  };
}

function evaluateMinimumSuccessPolicy(request: JoinCoordinatorRequest, minimumRequired: number): JoinEvaluationResult {
  const affectedTaskIds = request.participants.map(p => p.taskId);

  if (request.cancelledCount === request.participants.length) {
    return {
      decision: "JOIN_CANCELLED",
      targetState: "CANCELLED",
      isValidTransition: isJoinTransitionValid(request.currentState, "CANCELLED"),
      canReleaseParentTask: false,
      satisfiedParticipantIds: [],
      blockedParticipantIds: request.participants.map(p => p.participantId),
      affectedTaskIds,
      denialReasons: ["All participants cancelled"],
      evidenceArtifactIds: [],
    };
  }

  // Calculate remaining possible successes (not yet terminal)
  const terminalCount = request.satisfiedCount + request.failedCount + request.cancelledCount;
  const pendingCount = request.participants.length - terminalCount;
  const remainingPossible = request.satisfiedCount + pendingCount;

  if (remainingPossible < minimumRequired) {
    return {
      decision: "JOIN_FAILED",
      targetState: "FAILED_SAFE",
      isValidTransition: isJoinTransitionValid(request.currentState, "FAILED_SAFE"),
      canReleaseParentTask: false,
      satisfiedParticipantIds: request.participants
        .filter(p => p.state === "SATISFIED")
        .map(p => p.participantId),
      blockedParticipantIds: request.participants
        .filter(p => p.state !== "SATISFIED")
        .map(p => p.participantId),
      affectedTaskIds,
      denialReasons: [`Cannot reach minimum of ${minimumRequired} satisfied participants`],
      evidenceArtifactIds: [],
    };
  }

  if (request.satisfiedCount >= minimumRequired) {
    return {
      decision: "JOIN_SATISFIED",
      targetState: "SATISFIED",
      isValidTransition: isJoinTransitionValid(request.currentState, "SATISFIED"),
      canReleaseParentTask: true,
      satisfiedParticipantIds: request.participants
        .filter(p => p.state === "SATISFIED")
        .map(p => p.participantId),
      blockedParticipantIds: [],
      affectedTaskIds,
      denialReasons: [],
      evidenceArtifactIds: [],
    };
  }

  return {
    decision: "JOIN_WAITING",
    targetState: "WAITING",
    isValidTransition: isJoinTransitionValid(request.currentState, "WAITING"),
    canReleaseParentTask: false,
    satisfiedParticipantIds: request.participants
      .filter(p => p.state === "SATISFIED")
      .map(p => p.participantId),
    blockedParticipantIds: request.participants
      .filter(p => p.state !== "SATISFIED")
      .map(p => p.participantId),
    affectedTaskIds,
    denialReasons: [],
    evidenceArtifactIds: [],
  };
}

function evaluateFirstValidPolicy(request: JoinCoordinatorRequest): JoinEvaluationResult {
  const affectedTaskIds = request.participants.map(p => p.taskId);
  const firstSatisfied = request.participants.find(p => p.state === "SATISFIED");

  if (firstSatisfied) {
    return {
      decision: "JOIN_SATISFIED",
      targetState: "SATISFIED",
      isValidTransition: isJoinTransitionValid(request.currentState, "SATISFIED"),
      canReleaseParentTask: true,
      satisfiedParticipantIds: [firstSatisfied.participantId],
      blockedParticipantIds: request.participants
        .filter(p => p.participantId !== firstSatisfied.participantId)
        .map(p => p.participantId),
      affectedTaskIds,
      denialReasons: [],
      evidenceArtifactIds: [],
    };
  }

  if (request.failedCount === request.participants.length || request.cancelledCount === request.participants.length) {
    return {
      decision: "JOIN_FAILED",
      targetState: "FAILED_SAFE",
      isValidTransition: isJoinTransitionValid(request.currentState, "FAILED_SAFE"),
      canReleaseParentTask: false,
      satisfiedParticipantIds: [],
      blockedParticipantIds: request.participants.map(p => p.participantId),
      affectedTaskIds,
      denialReasons: ["All participants failed or cancelled"],
      evidenceArtifactIds: [],
    };
  }

  return {
    decision: "JOIN_WAITING",
    targetState: "WAITING",
    isValidTransition: isJoinTransitionValid(request.currentState, "WAITING"),
    canReleaseParentTask: false,
    satisfiedParticipantIds: [],
    blockedParticipantIds: request.participants.map(p => p.participantId),
    affectedTaskIds,
    denialReasons: [],
    evidenceArtifactIds: [],
  };
}

function evaluateCollectAllPolicy(request: JoinCoordinatorRequest): JoinEvaluationResult {
  const affectedTaskIds = request.participants.map(p => p.taskId);

  // COLLECT_ALL waits for all participants to reach terminal state, regardless of outcome
  const allTerminal = request.satisfiedCount + request.failedCount + request.cancelledCount === request.participants.length;

  if (allTerminal) {
    return {
      decision: "JOIN_SATISFIED",
      targetState: "SATISFIED",
      isValidTransition: isJoinTransitionValid(request.currentState, "SATISFIED"),
      canReleaseParentTask: true,
      satisfiedParticipantIds: request.participants
        .filter(p => p.state === "SATISFIED")
        .map(p => p.participantId),
      blockedParticipantIds: [],
      affectedTaskIds,
      denialReasons: [],
      evidenceArtifactIds: [],
    };
  }

  return {
    decision: "JOIN_WAITING",
    targetState: "WAITING",
    isValidTransition: isJoinTransitionValid(request.currentState, "WAITING"),
    canReleaseParentTask: false,
    satisfiedParticipantIds: request.participants
      .filter(p => p.state === "SATISFIED")
      .map(p => p.participantId),
    blockedParticipantIds: request.participants
      .filter(p => p.state !== "SATISFIED")
      .map(p => p.participantId),
    affectedTaskIds,
    denialReasons: [],
    evidenceArtifactIds: [],
  };
}

function evaluateOrderedMergePolicy(request: JoinCoordinatorRequest): JoinEvaluationResult {
  const affectedTaskIds = request.participants.map(p => p.taskId);

  // ORDERED_MERGE requires participants to succeed in sequence order
  const sortedBySequence = [...request.participants].sort((a, b) => a.sequenceOrder - b.sequenceOrder);

  let lastSatisfiedIndex = -1;
  for (let i = 0; i < sortedBySequence.length; i++) {
    const participant = sortedBySequence[i]!;
    if (participant.state === "SATISFIED") {
      lastSatisfiedIndex = i;
    } else {
      break;
    }
  }

  // Check if any out-of-order failures occurred
  for (let i = lastSatisfiedIndex + 1; i < sortedBySequence.length; i++) {
    const participant = sortedBySequence[i]!;
    if (participant.state === "FAILED" || participant.state === "CANCELLED") {
      return {
        decision: "JOIN_FAILED",
        targetState: "FAILED_SAFE",
        isValidTransition: isJoinTransitionValid(request.currentState, "FAILED_SAFE"),
        canReleaseParentTask: false,
        satisfiedParticipantIds: sortedBySequence
          .slice(0, lastSatisfiedIndex + 1)
          .map(p => p.participantId),
        blockedParticipantIds: sortedBySequence
          .slice(lastSatisfiedIndex + 1)
          .map(p => p.participantId),
        affectedTaskIds,
        denialReasons: [`Out-of-order failure at sequence ${participant.sequenceOrder}`],
        evidenceArtifactIds: [],
      };
    }
  }

  if (lastSatisfiedIndex === sortedBySequence.length - 1) {
    return {
      decision: "JOIN_SATISFIED",
      targetState: "SATISFIED",
      isValidTransition: isJoinTransitionValid(request.currentState, "SATISFIED"),
      canReleaseParentTask: true,
      satisfiedParticipantIds: sortedBySequence.map(p => p.participantId),
      blockedParticipantIds: [],
      affectedTaskIds,
      denialReasons: [],
      evidenceArtifactIds: [],
    };
  }

  return {
    decision: "JOIN_WAITING",
    targetState: "WAITING",
    isValidTransition: isJoinTransitionValid(request.currentState, "WAITING"),
    canReleaseParentTask: false,
    satisfiedParticipantIds: sortedBySequence
      .slice(0, lastSatisfiedIndex + 1)
      .map(p => p.participantId),
    blockedParticipantIds: sortedBySequence
      .slice(lastSatisfiedIndex + 1)
      .map(p => p.participantId),
    affectedTaskIds,
    denialReasons: [],
    evidenceArtifactIds: [],
  };
}

function evaluateReviewGatePolicy(request: JoinCoordinatorRequest): JoinEvaluationResult {
  const affectedTaskIds = request.participants.map(p => p.taskId);

  // REVIEW_GATE blocks until external review approval - always returns BLOCKED state
  return {
    decision: "JOIN_BLOCKED",
    targetState: "BLOCKED",
    isValidTransition: isJoinTransitionValid(request.currentState, "BLOCKED"),
    canReleaseParentTask: false,
    satisfiedParticipantIds: request.participants
      .filter(p => p.state === "SATISFIED")
      .map(p => p.participantId),
    blockedParticipantIds: request.participants
      .filter(p => p.state !== "SATISFIED")
      .map(p => p.participantId),
    affectedTaskIds,
    denialReasons: ["REVIEW_GATE policy requires external review approval"],
    evidenceArtifactIds: [],
  };
}

export function evaluateJoinCoordination(
  request: JoinCoordinatorRequest,
  minimumSuccessThreshold?: number,
): JoinEvaluationResult {
  // Validate contract version
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    return {
      decision: "JOIN_RECONCILIATION_REQUIRED",
      targetState: "RECONCILIATION_REQUIRED",
      isValidTransition: isJoinTransitionValid(request.currentState, "RECONCILIATION_REQUIRED"),
      canReleaseParentTask: false,
      satisfiedParticipantIds: [],
      blockedParticipantIds: request.participants.map(p => p.participantId),
      affectedTaskIds: request.participants.map(p => p.taskId),
      denialReasons: ["Contract version mismatch"],
      evidenceArtifactIds: [],
    };
  }

  // Route to policy-specific evaluator
  switch (request.policy) {
    case "ALL_SUCCESS":
      return evaluateAllSuccessPolicy(request);
    case "MINIMUM_SUCCESS":
      return evaluateMinimumSuccessPolicy(request, minimumSuccessThreshold ?? 1);
    case "FIRST_VALID":
      return evaluateFirstValidPolicy(request);
    case "COLLECT_ALL":
      return evaluateCollectAllPolicy(request);
    case "ORDERED_MERGE":
      return evaluateOrderedMergePolicy(request);
    case "REVIEW_GATE":
      return evaluateReviewGatePolicy(request);
    default:
      return {
        decision: "JOIN_RECONCILIATION_REQUIRED",
        targetState: "RECONCILIATION_REQUIRED",
        isValidTransition: isJoinTransitionValid(request.currentState, "RECONCILIATION_REQUIRED"),
        canReleaseParentTask: false,
        satisfiedParticipantIds: [],
        blockedParticipantIds: request.participants.map(p => p.participantId),
        affectedTaskIds: request.participants.map(p => p.taskId),
        denialReasons: [`Unknown policy: ${request.policy}`],
        evidenceArtifactIds: [],
      };
  }
}

export function assertJoinCoordinatorRequest(request: JoinCoordinatorRequest): void {
  if (!request.joinCoordinatorId || !request.parentTaskId || !request.workflowId) {
    throw new Error("Invalid join coordinator request: missing required identifiers");
  }
  if (!JOIN_POLICIES.includes(request.policy)) {
    throw new Error(`Invalid join policy: ${request.policy}`);
  }
  if (!JOIN_STATES.includes(request.currentState)) {
    throw new Error(`Invalid join state: ${request.currentState}`);
  }
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    throw new Error("Join coordinator request contract version mismatch");
  }
}
