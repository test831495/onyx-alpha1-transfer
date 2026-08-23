import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";
import type { JoinState } from "./join-coordinator";

export type TimeoutClassification = "HEALTHY" | "WARNING" | "APPROACHING_DEADLINE" | "EXCEEDED" | "INDETERMINATE";

export interface JoinTimeoutRequest {
  timeoutRequestId: string;
  joinCoordinatorId: string;
  createdAt: string;
  deadline: string;
  evaluatedAt: string;
  warningThreshold: number; // milliseconds before deadline
  contractVersion: string;
}

export interface TimeoutClassificationResult {
  classification: TimeoutClassification;
  timeRemainingMs: number;
  hasExceeded: boolean;
  shouldInitiateRecovery: boolean;
  denialReasons: readonly string[];
}

export function classifyJoinTimeout(request: JoinTimeoutRequest): TimeoutClassificationResult {
  const denialReasons: string[] = [];

  // Validate contract version
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    denialReasons.push("Join timeout contract version mismatch");
    return {
      classification: "INDETERMINATE",
      timeRemainingMs: 0,
      hasExceeded: false,
      shouldInitiateRecovery: true,
      denialReasons,
    };
  }

  // Parse timestamps
  const createdTime = new Date(request.createdAt);
  const deadlineTime = new Date(request.deadline);
  const evaluatedTime = new Date(request.evaluatedAt);

  // Validate timestamp ordering
  if (createdTime >= deadlineTime) {
    denialReasons.push("Creation time must be before deadline");
    return {
      classification: "INDETERMINATE",
      timeRemainingMs: 0,
      hasExceeded: false,
      shouldInitiateRecovery: true,
      denialReasons,
    };
  }

  // Calculate time remaining
  const timeRemainingMs = deadlineTime.getTime() - evaluatedTime.getTime();

  if (timeRemainingMs < 0) {
    return {
      classification: "EXCEEDED",
      timeRemainingMs: 0,
      hasExceeded: true,
      shouldInitiateRecovery: true,
      denialReasons: [],
    };
  }

  // Approaching deadline: less than 1x threshold
  if (timeRemainingMs < request.warningThreshold) {
    return {
      classification: "APPROACHING_DEADLINE",
      timeRemainingMs,
      hasExceeded: false,
      shouldInitiateRecovery: false,
      denialReasons: [],
    };
  }

  // Warning: between 1x and 2x threshold
  if (timeRemainingMs <= request.warningThreshold * 2) {
    return {
      classification: "WARNING",
      timeRemainingMs,
      hasExceeded: false,
      shouldInitiateRecovery: false,
      denialReasons: [],
    };
  }

  // Healthy: more than 2x threshold
  return {
    classification: "HEALTHY",
    timeRemainingMs,
    hasExceeded: false,
    shouldInitiateRecovery: false,
    denialReasons: [],
  };
}

export interface JoinStateRecoveryRequest {
  recoveryRequestId: string;
  joinCoordinatorId: string;
  currentState: JoinState;
  previousState?: JoinState;
  timeoutClassification: TimeoutClassification;
  satisfiedCount: number;
  failedCount: number;
  totalParticipants: number;
  hasActiveLease: boolean;
  evaluatedAt: string;
  contractVersion: string;
}

export interface RecoveryDecision {
  recoveryAction: "CONTINUE_WAITING" | "INITIATE_RECOVERY_PROTOCOL" | "ESCALATE_TO_RECONCILIATION" | "SAFE_STOP";
  recommendedState: JoinState;
  isRecoveryFeasible: boolean;
  denialReasons: readonly string[];
}

export function evaluateJoinStateRecovery(request: JoinStateRecoveryRequest): RecoveryDecision {
  const denialReasons: string[] = [];

  // Validate contract version
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    denialReasons.push("Recovery request contract version mismatch");
    return {
      recoveryAction: "ESCALATE_TO_RECONCILIATION",
      recommendedState: "RECONCILIATION_REQUIRED",
      isRecoveryFeasible: false,
      denialReasons,
    };
  }

  // Determine recovery action based on timeout classification
  switch (request.timeoutClassification) {
    case "HEALTHY":
      return {
        recoveryAction: "CONTINUE_WAITING",
        recommendedState: request.currentState,
        isRecoveryFeasible: true,
        denialReasons: [],
      };

    case "WARNING":
      return {
        recoveryAction: "CONTINUE_WAITING",
        recommendedState: request.currentState,
        isRecoveryFeasible: true,
        denialReasons: [],
      };

    case "APPROACHING_DEADLINE":
      // Start recovery protocol if we have made progress
      if (request.satisfiedCount > 0 && request.satisfiedCount < request.totalParticipants) {
        return {
          recoveryAction: "INITIATE_RECOVERY_PROTOCOL",
          recommendedState: "BLOCKED",
          isRecoveryFeasible: true,
          denialReasons: [],
        };
      }

      // If no progress, escalate
      return {
        recoveryAction: "ESCALATE_TO_RECONCILIATION",
        recommendedState: "RECONCILIATION_REQUIRED",
        isRecoveryFeasible: false,
        denialReasons: ["Join timeout approaching with insufficient progress"],
      };

    case "EXCEEDED":
      // Timeout has been exceeded - escalate to reconciliation
      denialReasons.push("Join timeout deadline exceeded");
      return {
        recoveryAction: "ESCALATE_TO_RECONCILIATION",
        recommendedState: "RECONCILIATION_REQUIRED",
        isRecoveryFeasible: false,
        denialReasons,
      };

    case "INDETERMINATE":
      // Unable to determine - safe stop
      denialReasons.push("Cannot determine timeout status");
      return {
        recoveryAction: "SAFE_STOP",
        recommendedState: "RECONCILIATION_REQUIRED",
        isRecoveryFeasible: false,
        denialReasons,
      };

    default:
      denialReasons.push(`Unknown timeout classification: ${request.timeoutClassification}`);
      return {
        recoveryAction: "SAFE_STOP",
        recommendedState: "RECONCILIATION_REQUIRED",
        isRecoveryFeasible: false,
        denialReasons,
      };
  }
}

export function assertJoinTimeoutRequest(request: JoinTimeoutRequest): void {
  if (!request.timeoutRequestId || !request.joinCoordinatorId) {
    throw new Error("Invalid join timeout request: missing required identifiers");
  }
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    throw new Error("Join timeout request contract version mismatch");
  }
}
