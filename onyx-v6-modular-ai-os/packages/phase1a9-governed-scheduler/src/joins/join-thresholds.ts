import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";

export interface JoinThresholdCalculationRequest {
  thresholdCalculationId: string;
  totalParticipants: number;
  requiredSuccessCount: number;
  allowFailureCount: number;
  allowCancelCount: number;
  completionStrategy: "STRICT" | "LENIENT" | "ADAPTIVE";
  evaluatedAt: string;
  contractVersion: string;
}

export interface ThresholdCalculationResult {
  isValidThreshold: boolean;
  minimumRequiredSuccesses: number;
  maximumAllowableFailures: number;
  effectiveThreshold: number;
  strategyApplied: "STRICT" | "LENIENT" | "ADAPTIVE";
  denialReasons: readonly string[];
}

export function evaluateJoinThresholdCalculation(request: JoinThresholdCalculationRequest): ThresholdCalculationResult {
  const denialReasons: string[] = [];

  // Validate contract version
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    denialReasons.push("Threshold calculation contract version mismatch");
    return {
      isValidThreshold: false,
      minimumRequiredSuccesses: 0,
      maximumAllowableFailures: 0,
      effectiveThreshold: 0,
      strategyApplied: request.completionStrategy,
      denialReasons,
    };
  }

  // Validate basic constraints
  if (request.totalParticipants <= 0) {
    denialReasons.push("Total participants must be positive");
    return {
      isValidThreshold: false,
      minimumRequiredSuccesses: 0,
      maximumAllowableFailures: 0,
      effectiveThreshold: 0,
      strategyApplied: request.completionStrategy,
      denialReasons,
    };
  }

  if (request.requiredSuccessCount <= 0 || request.requiredSuccessCount > request.totalParticipants) {
    denialReasons.push("Required success count must be between 1 and total participants");
    return {
      isValidThreshold: false,
      minimumRequiredSuccesses: 0,
      maximumAllowableFailures: 0,
      effectiveThreshold: 0,
      strategyApplied: request.completionStrategy,
      denialReasons,
    };
  }

  // Validate failure and cancel counts
  const totalUnsuccessful = request.allowFailureCount + request.allowCancelCount;
  if (totalUnsuccessful + request.requiredSuccessCount > request.totalParticipants) {
    denialReasons.push("Combined allowed failures/cancels and required successes exceed total participants");
    return {
      isValidThreshold: false,
      minimumRequiredSuccesses: request.requiredSuccessCount,
      maximumAllowableFailures: request.allowFailureCount,
      effectiveThreshold: 0,
      strategyApplied: request.completionStrategy,
      denialReasons,
    };
  }

  // Apply strategy-specific threshold calculation
  let effectiveThreshold: number;
  let strategyApplied: "STRICT" | "LENIENT" | "ADAPTIVE" = request.completionStrategy;

  switch (request.completionStrategy) {
    case "STRICT":
      // STRICT: require all specified successes, no failures allowed beyond specified
      effectiveThreshold = request.requiredSuccessCount;
      break;

    case "LENIENT":
      // LENIENT: allow failures up to the maximum allowable
      effectiveThreshold = Math.max(1, request.totalParticipants - request.allowFailureCount - request.allowCancelCount);
      break;

    case "ADAPTIVE":
      // ADAPTIVE: dynamically determine based on current state
      // Use at least 50% success or required count, whichever is higher
      effectiveThreshold = Math.max(Math.ceil(request.totalParticipants / 2), request.requiredSuccessCount);
      break;

    default:
      denialReasons.push(`Unknown completion strategy: ${request.completionStrategy}`);
      return {
        isValidThreshold: false,
        minimumRequiredSuccesses: 0,
        maximumAllowableFailures: 0,
        effectiveThreshold: 0,
        strategyApplied: "STRICT",
        denialReasons,
      };
  }

  return {
    isValidThreshold: true,
    minimumRequiredSuccesses: request.requiredSuccessCount,
    maximumAllowableFailures: request.allowFailureCount,
    effectiveThreshold,
    strategyApplied,
    denialReasons: [],
  };
}

export interface JoinParticipantOrderingRequest {
  orderingRequestId: string;
  participants: readonly {
    participantId: string;
    taskId: string;
    priority: number;
    dependsOnParticipantIds?: readonly string[];
  }[];
  evaluatedAt: string;
  contractVersion: string;
}

export interface ParticipantOrderingResult {
  orderedParticipantIds: readonly string[];
  stableSortApplied: boolean;
  cycleDetected: boolean;
  denialReasons: readonly string[];
}

export function evaluateJoinParticipantOrdering(request: JoinParticipantOrderingRequest): ParticipantOrderingResult {
  const denialReasons: string[] = [];

  // Validate contract version
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    denialReasons.push("Participant ordering contract version mismatch");
    return {
      orderedParticipantIds: [],
      stableSortApplied: false,
      cycleDetected: false,
      denialReasons,
    };
  }

  // Detect cycles in dependencies
  const visited = new Set<string>();
  const recursionStack = new Set<string>();

  function hasCycle(participantId: string, participantMap: Map<string, any>): boolean {
    visited.add(participantId);
    recursionStack.add(participantId);

    const participant = participantMap.get(participantId);
    if (participant?.dependsOnParticipantIds) {
      for (const dependency of participant.dependsOnParticipantIds) {
        if (!visited.has(dependency)) {
          if (hasCycle(dependency, participantMap)) {
            return true;
          }
        } else if (recursionStack.has(dependency)) {
          return true;
        }
      }
    }

    recursionStack.delete(participantId);
    return false;
  }

  const participantMap = new Map(request.participants.map(p => [p.participantId, p]));

  for (const participant of request.participants) {
    if (!visited.has(participant.participantId)) {
      if (hasCycle(participant.participantId, participantMap)) {
        return {
          orderedParticipantIds: [],
          stableSortApplied: false,
          cycleDetected: true,
          denialReasons: ["Cycle detected in participant dependencies"],
        };
      }
    }
  }

  // Stable lexicographic sort by (priority ascending, participantId ascending)
  const sortedParticipants = [...request.participants].sort((a, b) => {
    if (a.priority !== b.priority) {
      return a.priority - b.priority;
    }
    return a.participantId.localeCompare(b.participantId);
  });

  return {
    orderedParticipantIds: sortedParticipants.map(p => p.participantId),
    stableSortApplied: true,
    cycleDetected: false,
    denialReasons: [],
  };
}

export function assertJoinThresholdCalculationRequest(request: JoinThresholdCalculationRequest): void {
  if (!request.thresholdCalculationId) {
    throw new Error("Invalid threshold calculation request: missing ID");
  }
  if (request.contractVersion !== PHASE1A9_SCHEDULER_CONTRACT_VERSION) {
    throw new Error("Threshold calculation contract version mismatch");
  }
}
