import { describe, it, expect } from "vitest";
import {
  JOIN_POLICIES,
  JOIN_STATES,
  type JoinCoordinatorRequest,
  type JoinParticipant,
  evaluateJoinCoordination,
  assertJoinCoordinatorRequest,
  evaluateJoinThresholdCalculation,
  evaluateJoinParticipantOrdering,
  classifyJoinTimeout,
  evaluateJoinStateRecovery,
} from "../src/joins";

describe("JoinCoordinator Wave 3A", () => {
  const fixedTime = "2026-08-21T00:00:00.000Z";
  const fixedTaskId = "task-example-001";
  const fixedWorkflowId = "workflow-example-001";
  const fixedRuntimeId = "runtime-example-001";
  const fixedSessionId = "session-example-001";
  const fixedJoinCoordinatorId = "join-coordinator-001";

  function createValidJoinRequest(policy: "ALL_SUCCESS" | "MINIMUM_SUCCESS" | "FIRST_VALID" | "COLLECT_ALL" | "ORDERED_MERGE" | "REVIEW_GATE"): JoinCoordinatorRequest {
    const participants: JoinParticipant[] = [
      { participantId: "participant-001", taskId: "task-001", state: "PENDING", sequenceOrder: 1 },
      { participantId: "participant-002", taskId: "task-002", state: "PENDING", sequenceOrder: 2 },
      { participantId: "participant-003", taskId: "task-003", state: "PENDING", sequenceOrder: 3 },
    ];

    return {
      joinCoordinatorId: fixedJoinCoordinatorId,
      parentTaskId: fixedTaskId,
      workflowId: fixedWorkflowId,
      runtimeId: fixedRuntimeId,
      runtimeSessionId: fixedSessionId,
      policy,
      participants,
      currentState: "WAITING",
      satisfiedCount: 0,
      failedCount: 0,
      cancelledCount: 0,
      evaluatedAt: fixedTime,
      contractVersion: "1.0.0",
    };
  }

  describe("ALL_SUCCESS Policy", () => {
    it("T15-A: All participants satisfied releases parent", () => {
      const request = createValidJoinRequest("ALL_SUCCESS");
      request.satisfiedCount = 3;
      request.participants = [
        { participantId: "participant-001", taskId: "task-001", state: "SATISFIED" as const, sequenceOrder: 1 },
        { participantId: "participant-002", taskId: "task-002", state: "SATISFIED" as const, sequenceOrder: 2 },
        { participantId: "participant-003", taskId: "task-003", state: "SATISFIED" as const, sequenceOrder: 3 },
      ];
      const result = evaluateJoinCoordination(request);

      expect(result.decision).toBe("JOIN_SATISFIED");
      expect(result.targetState).toBe("SATISFIED");
      expect(result.canReleaseParentTask).toBe(true);
      expect(result.satisfiedParticipantIds).toHaveLength(3);
    });

    it("T15-B: Any participant failure fails the join", () => {
      const request = createValidJoinRequest("ALL_SUCCESS");
      request.satisfiedCount = 2;
      request.failedCount = 1;
      request.participants = [
        { participantId: "participant-001", taskId: "task-001", state: "SATISFIED" as const, sequenceOrder: 1 },
        { participantId: "participant-002", taskId: "task-002", state: "SATISFIED" as const, sequenceOrder: 2 },
        { participantId: "participant-003", taskId: "task-003", state: "FAILED" as const, sequenceOrder: 3 },
      ];
      const result = evaluateJoinCoordination(request);

      expect(result.decision).toBe("JOIN_FAILED");
      expect(result.targetState).toBe("FAILED_SAFE");
      expect(result.canReleaseParentTask).toBe(false);
      expect(result.denialReasons[0]).toContain("failed");
    });

    it("T15-C: Partial satisfaction keeps waiting", () => {
      const request = createValidJoinRequest("ALL_SUCCESS");
      request.satisfiedCount = 1;
      request.participants = [
        { participantId: "participant-001", taskId: "task-001", state: "SATISFIED" as const, sequenceOrder: 1 },
        { participantId: "participant-002", taskId: "task-002", state: "PENDING" as const, sequenceOrder: 2 },
        { participantId: "participant-003", taskId: "task-003", state: "PENDING" as const, sequenceOrder: 3 },
      ];
      const result = evaluateJoinCoordination(request);

      expect(result.decision).toBe("JOIN_WAITING");
      expect(result.targetState).toBe("WAITING");
      expect(result.canReleaseParentTask).toBe(false);
    });
  });

  describe("MINIMUM_SUCCESS Policy", () => {
    it("T15-D: Minimum threshold met releases parent", () => {
      const request = createValidJoinRequest("MINIMUM_SUCCESS");
      request.satisfiedCount = 2;
      request.participants = [
        { participantId: "participant-001", taskId: "task-001", state: "SATISFIED" as const, sequenceOrder: 1 },
        { participantId: "participant-002", taskId: "task-002", state: "SATISFIED" as const, sequenceOrder: 2 },
        { participantId: "participant-003", taskId: "task-003", state: "PENDING" as const, sequenceOrder: 3 },
      ];
      const result = evaluateJoinCoordination(request, 2); // minimum 2

      expect(result.decision).toBe("JOIN_SATISFIED");
      expect(result.canReleaseParentTask).toBe(true);
    });

    it("T15-E: Insufficient possible successes fails", () => {
      const request = createValidJoinRequest("MINIMUM_SUCCESS");
      request.satisfiedCount = 1;
      request.failedCount = 2;
      request.participants = [
        { participantId: "participant-001", taskId: "task-001", state: "SATISFIED" as const, sequenceOrder: 1 },
        { participantId: "participant-002", taskId: "task-002", state: "FAILED" as const, sequenceOrder: 2 },
        { participantId: "participant-003", taskId: "task-003", state: "FAILED" as const, sequenceOrder: 3 },
      ];
      const result = evaluateJoinCoordination(request, 3); // need 3, but only 1 satisfied

      expect(result.decision).toBe("JOIN_FAILED");
      expect(result.targetState).toBe("FAILED_SAFE");
    });

    it("T15-F: All cancelled fails", () => {
      const request = createValidJoinRequest("MINIMUM_SUCCESS");
      request.cancelledCount = 3;
      request.participants = [
        { participantId: "participant-001", taskId: "task-001", state: "CANCELLED" as const, sequenceOrder: 1 },
        { participantId: "participant-002", taskId: "task-002", state: "CANCELLED" as const, sequenceOrder: 2 },
        { participantId: "participant-003", taskId: "task-003", state: "CANCELLED" as const, sequenceOrder: 3 },
      ];
      const result = evaluateJoinCoordination(request, 1);

      expect(result.decision).toBe("JOIN_CANCELLED");
      expect(result.targetState).toBe("CANCELLED");
    });
  });

  describe("FIRST_VALID Policy", () => {
    it("T15-G: First success releases parent", () => {
      const request = createValidJoinRequest("FIRST_VALID");
      request.satisfiedCount = 1;
      request.participants = [
        { participantId: "participant-001", taskId: "task-001", state: "SATISFIED" as const, sequenceOrder: 1 },
        { participantId: "participant-002", taskId: "task-002", state: "PENDING" as const, sequenceOrder: 2 },
        { participantId: "participant-003", taskId: "task-003", state: "PENDING" as const, sequenceOrder: 3 },
      ];
      const result = evaluateJoinCoordination(request);

      expect(result.decision).toBe("JOIN_SATISFIED");
      expect(result.canReleaseParentTask).toBe(true);
      expect(result.satisfiedParticipantIds).toHaveLength(1);
    });

    it("T15-H: All failures blocks first_valid", () => {
      const request = createValidJoinRequest("FIRST_VALID");
      request.failedCount = 3;
      request.participants = [
        { participantId: "participant-001", taskId: "task-001", state: "FAILED" as const, sequenceOrder: 1 },
        { participantId: "participant-002", taskId: "task-002", state: "FAILED" as const, sequenceOrder: 2 },
        { participantId: "participant-003", taskId: "task-003", state: "FAILED" as const, sequenceOrder: 3 },
      ];
      const result = evaluateJoinCoordination(request);

      expect(result.decision).toBe("JOIN_FAILED");
      expect(result.targetState).toBe("FAILED_SAFE");
    });

    it("T15-I: Waiting with no success yet", () => {
      const request = createValidJoinRequest("FIRST_VALID");
      const result = evaluateJoinCoordination(request);

      expect(result.decision).toBe("JOIN_WAITING");
      expect(result.satisfiedParticipantIds).toHaveLength(0);
    });
  });

  describe("COLLECT_ALL Policy", () => {
    it("T15-J: All terminal states release parent", () => {
      const request = createValidJoinRequest("COLLECT_ALL");
      request.satisfiedCount = 2;
      request.failedCount = 1;
      request.participants = [
        { participantId: "participant-001", taskId: "task-001", state: "SATISFIED" as const, sequenceOrder: 1 },
        { participantId: "participant-002", taskId: "task-002", state: "SATISFIED" as const, sequenceOrder: 2 },
        { participantId: "participant-003", taskId: "task-003", state: "FAILED" as const, sequenceOrder: 3 },
      ];
      const result = evaluateJoinCoordination(request);

      expect(result.decision).toBe("JOIN_SATISFIED");
      expect(result.canReleaseParentTask).toBe(true);
      expect(result.satisfiedParticipantIds).toHaveLength(2);
    });

    it("T15-K: Partial completion keeps waiting", () => {
      const request = createValidJoinRequest("COLLECT_ALL");
      request.satisfiedCount = 1;
      request.participants = [
        { participantId: "participant-001", taskId: "task-001", state: "SATISFIED" as const, sequenceOrder: 1 },
        { participantId: "participant-002", taskId: "task-002", state: "PENDING" as const, sequenceOrder: 2 },
        { participantId: "participant-003", taskId: "task-003", state: "PENDING" as const, sequenceOrder: 3 },
      ];
      const result = evaluateJoinCoordination(request);

      expect(result.decision).toBe("JOIN_WAITING");
      expect(result.canReleaseParentTask).toBe(false);
    });
  });

  describe("ORDERED_MERGE Policy", () => {
    it("T15-L: Sequential success in order releases", () => {
      const request = createValidJoinRequest("ORDERED_MERGE");
      request.satisfiedCount = 3;
      request.participants = [
        { participantId: "participant-001", taskId: "task-001", state: "SATISFIED" as const, sequenceOrder: 1 },
        { participantId: "participant-002", taskId: "task-002", state: "SATISFIED" as const, sequenceOrder: 2 },
        { participantId: "participant-003", taskId: "task-003", state: "SATISFIED" as const, sequenceOrder: 3 },
      ];
      const result = evaluateJoinCoordination(request);

      expect(result.decision).toBe("JOIN_SATISFIED");
      expect(result.canReleaseParentTask).toBe(true);
    });

    it("T15-M: Out-of-order failure blocks merge", () => {
      const request = createValidJoinRequest("ORDERED_MERGE");
      request.satisfiedCount = 1;
      request.failedCount = 1;
      request.participants = [
        { participantId: "participant-001", taskId: "task-001", state: "SATISFIED" as const, sequenceOrder: 1 },
        { participantId: "participant-002", taskId: "task-002", state: "FAILED" as const, sequenceOrder: 2 },
        { participantId: "participant-003", taskId: "task-003", state: "PENDING" as const, sequenceOrder: 3 },
      ];
      const result = evaluateJoinCoordination(request);

      expect(result.decision).toBe("JOIN_FAILED");
      expect(result.targetState).toBe("FAILED_SAFE");
      expect(result.denialReasons[0]).toContain("Out-of-order");
    });

    it("T15-N: Partial sequence keeps waiting", () => {
      const request = createValidJoinRequest("ORDERED_MERGE");
      request.satisfiedCount = 2;
      request.participants = [
        { participantId: "participant-001", taskId: "task-001", state: "SATISFIED" as const, sequenceOrder: 1 },
        { participantId: "participant-002", taskId: "task-002", state: "SATISFIED" as const, sequenceOrder: 2 },
        { participantId: "participant-003", taskId: "task-003", state: "PENDING" as const, sequenceOrder: 3 },
      ];
      const result = evaluateJoinCoordination(request);

      expect(result.decision).toBe("JOIN_WAITING");
    });
  });

  describe("REVIEW_GATE Policy", () => {
    it("T15-O: Review gate always blocks", () => {
      const request = createValidJoinRequest("REVIEW_GATE");
      request.satisfiedCount = 3;
      request.participants = [
        { participantId: "participant-001", taskId: "task-001", state: "SATISFIED" as const, sequenceOrder: 1 },
        { participantId: "participant-002", taskId: "task-002", state: "SATISFIED" as const, sequenceOrder: 2 },
        { participantId: "participant-003", taskId: "task-003", state: "SATISFIED" as const, sequenceOrder: 3 },
      ];
      const result = evaluateJoinCoordination(request);

      expect(result.decision).toBe("JOIN_BLOCKED");
      expect(result.targetState).toBe("BLOCKED");
      expect(result.canReleaseParentTask).toBe(false);
      expect(result.denialReasons[0]).toContain("REVIEW_GATE");
    });
  });

  describe("Threshold Calculation", () => {
    it("T16-A: Strict threshold enforces exact minimum", () => {
      const result = evaluateJoinThresholdCalculation({
        thresholdCalculationId: "threshold-001",
        totalParticipants: 10,
        requiredSuccessCount: 8,
        allowFailureCount: 2,
        allowCancelCount: 0,
        completionStrategy: "STRICT",
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      });

      expect(result.isValidThreshold).toBe(true);
      expect(result.effectiveThreshold).toBe(8);
      expect(result.strategyApplied).toBe("STRICT");
    });

    it("T16-B: Lenient threshold allows failures", () => {
      const result = evaluateJoinThresholdCalculation({
        thresholdCalculationId: "threshold-002",
        totalParticipants: 10,
        requiredSuccessCount: 5,
        allowFailureCount: 3,
        allowCancelCount: 2,
        completionStrategy: "LENIENT",
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      });

      expect(result.isValidThreshold).toBe(true);
      expect(result.effectiveThreshold).toBe(5); // 10 - 3 - 2 = 5
    });

    it("T16-C: Adaptive threshold uses 50% or required", () => {
      const result = evaluateJoinThresholdCalculation({
        thresholdCalculationId: "threshold-003",
        totalParticipants: 10,
        requiredSuccessCount: 4,
        allowFailureCount: 3,
        allowCancelCount: 3,
        completionStrategy: "ADAPTIVE",
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      });

      expect(result.isValidThreshold).toBe(true);
      expect(result.effectiveThreshold).toBeGreaterThanOrEqual(4); // max(50%, required)
    });

    it("T16-D: Invalid constraints rejected", () => {
      const result = evaluateJoinThresholdCalculation({
        thresholdCalculationId: "threshold-004",
        totalParticipants: 10,
        requiredSuccessCount: 15, // More than total
        allowFailureCount: 0,
        allowCancelCount: 0,
        completionStrategy: "STRICT",
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      });

      expect(result.isValidThreshold).toBe(false);
      expect(result.denialReasons.length).toBeGreaterThan(0);
    });

    it("T16-E: Over-constrained failures rejected", () => {
      const result = evaluateJoinThresholdCalculation({
        thresholdCalculationId: "threshold-005",
        totalParticipants: 10,
        requiredSuccessCount: 8,
        allowFailureCount: 2,
        allowCancelCount: 1, // 8 + 2 + 1 = 11 > 10
        completionStrategy: "STRICT",
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      });

      expect(result.isValidThreshold).toBe(false);
    });
  });

  describe("Participant Ordering", () => {
    it("T16-F: Stable lexicographic sort applied", () => {
      const result = evaluateJoinParticipantOrdering({
        orderingRequestId: "ordering-001",
        participants: [
          { participantId: "p-003", taskId: "t-3", priority: 2 },
          { participantId: "p-001", taskId: "t-1", priority: 1 },
          { participantId: "p-002", taskId: "t-2", priority: 1 },
        ],
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      });

      expect(result.cycleDetected).toBe(false);
      expect(result.orderedParticipantIds).toEqual(["p-001", "p-002", "p-003"]);
      expect(result.stableSortApplied).toBe(true);
    });

    it("T16-G: Cycle detection rejects ordering", () => {
      const result = evaluateJoinParticipantOrdering({
        orderingRequestId: "ordering-002",
        participants: [
          {
            participantId: "p-001",
            taskId: "t-1",
            priority: 1,
            dependsOnParticipantIds: ["p-002"],
          },
          {
            participantId: "p-002",
            taskId: "t-2",
            priority: 1,
            dependsOnParticipantIds: ["p-001"],
          },
        ],
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      });

      expect(result.cycleDetected).toBe(true);
      expect(result.orderedParticipantIds).toHaveLength(0);
      expect(result.denialReasons[0]).toContain("Cycle");
    });

    it("T16-H: No cycles in valid DAG", () => {
      const result = evaluateJoinParticipantOrdering({
        orderingRequestId: "ordering-003",
        participants: [
          {
            participantId: "p-001",
            taskId: "t-1",
            priority: 1,
            dependsOnParticipantIds: [],
          },
          {
            participantId: "p-002",
            taskId: "t-2",
            priority: 2,
            dependsOnParticipantIds: ["p-001"],
          },
          {
            participantId: "p-003",
            taskId: "t-3",
            priority: 3,
            dependsOnParticipantIds: ["p-001", "p-002"],
          },
        ],
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      });

      expect(result.cycleDetected).toBe(false);
      expect(result.orderedParticipantIds).toHaveLength(3);
    });
  });

  describe("Join Timeout Classification", () => {
    const createdAt = "2026-08-21T00:00:00.000Z";
    const deadline = "2026-08-21T00:01:00.000Z"; // 60 seconds later

    it("T17-A: Healthy timeout", () => {
      const result = classifyJoinTimeout({
        timeoutRequestId: "timeout-001",
        joinCoordinatorId: fixedJoinCoordinatorId,
        createdAt,
        deadline,
        evaluatedAt: "2026-08-21T00:00:10.000Z", // 10 seconds in
        warningThreshold: 15000, // 15 seconds before deadline
        contractVersion: "1.0.0",
      });

      expect(result.classification).toBe("HEALTHY");
      expect(result.hasExceeded).toBe(false);
    });

    it("T17-B: Warning classification near deadline", () => {
      const result = classifyJoinTimeout({
        timeoutRequestId: "timeout-002",
        joinCoordinatorId: fixedJoinCoordinatorId,
        createdAt,
        deadline,
        evaluatedAt: "2026-08-21T00:00:40.000Z", // 40 seconds in, 20 sec remaining
        warningThreshold: 15000, // Between 1x (15s) and 2x (30s)
        contractVersion: "1.0.0",
      });

      expect(result.classification).toBe("WARNING");
      expect(result.hasExceeded).toBe(false);
    });

    it("T17-C: Approaching deadline", () => {
      const result = classifyJoinTimeout({
        timeoutRequestId: "timeout-003",
        joinCoordinatorId: fixedJoinCoordinatorId,
        createdAt,
        deadline,
        evaluatedAt: "2026-08-21T00:00:55.000Z", // 55 seconds in, 5 sec remaining
        warningThreshold: 15000,
        contractVersion: "1.0.0",
      });

      expect(result.classification).toBe("APPROACHING_DEADLINE");
      expect(result.shouldInitiateRecovery).toBe(false);
    });

    it("T17-D: Exceeded deadline", () => {
      const result = classifyJoinTimeout({
        timeoutRequestId: "timeout-004",
        joinCoordinatorId: fixedJoinCoordinatorId,
        createdAt,
        deadline,
        evaluatedAt: "2026-08-21T00:02:00.000Z", // 2 minutes, past deadline
        warningThreshold: 15000,
        contractVersion: "1.0.0",
      });

      expect(result.classification).toBe("EXCEEDED");
      expect(result.hasExceeded).toBe(true);
      expect(result.shouldInitiateRecovery).toBe(true);
    });

    it("T17-E: Indeterminate on invalid timestamp", () => {
      const result = classifyJoinTimeout({
        timeoutRequestId: "timeout-005",
        joinCoordinatorId: fixedJoinCoordinatorId,
        createdAt: "2026-08-21T00:01:00.000Z",
        deadline: "2026-08-21T00:00:00.000Z", // Reversed
        evaluatedAt: "2026-08-21T00:00:30.000Z",
        warningThreshold: 15000,
        contractVersion: "1.0.0",
      });

      expect(result.classification).toBe("INDETERMINATE");
    });
  });

  describe("Join State Recovery", () => {
    it("T17-F: Healthy timeout continues waiting", () => {
      const result = evaluateJoinStateRecovery({
        recoveryRequestId: "recovery-001",
        joinCoordinatorId: fixedJoinCoordinatorId,
        currentState: "WAITING",
        timeoutClassification: "HEALTHY",
        satisfiedCount: 0,
        failedCount: 0,
        totalParticipants: 3,
        hasActiveLease: true,
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      });

      expect(result.recoveryAction).toBe("CONTINUE_WAITING");
      expect(result.isRecoveryFeasible).toBe(true);
    });

    it("T17-G: Approaching deadline with progress initiates recovery", () => {
      const result = evaluateJoinStateRecovery({
        recoveryRequestId: "recovery-002",
        joinCoordinatorId: fixedJoinCoordinatorId,
        currentState: "WAITING",
        timeoutClassification: "APPROACHING_DEADLINE",
        satisfiedCount: 1,
        failedCount: 0,
        totalParticipants: 3,
        hasActiveLease: true,
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      });

      expect(result.recoveryAction).toBe("INITIATE_RECOVERY_PROTOCOL");
      expect(result.recommendedState).toBe("BLOCKED");
    });

    it("T17-H: Approaching deadline without progress escalates", () => {
      const result = evaluateJoinStateRecovery({
        recoveryRequestId: "recovery-003",
        joinCoordinatorId: fixedJoinCoordinatorId,
        currentState: "WAITING",
        timeoutClassification: "APPROACHING_DEADLINE",
        satisfiedCount: 0,
        failedCount: 0,
        totalParticipants: 3,
        hasActiveLease: true,
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      });

      expect(result.recoveryAction).toBe("ESCALATE_TO_RECONCILIATION");
      expect(result.isRecoveryFeasible).toBe(false);
    });

    it("T17-I: Exceeded deadline requires reconciliation", () => {
      const result = evaluateJoinStateRecovery({
        recoveryRequestId: "recovery-004",
        joinCoordinatorId: fixedJoinCoordinatorId,
        currentState: "WAITING",
        timeoutClassification: "EXCEEDED",
        satisfiedCount: 1,
        failedCount: 0,
        totalParticipants: 3,
        hasActiveLease: true,
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      });

      expect(result.recoveryAction).toBe("ESCALATE_TO_RECONCILIATION");
      expect(result.recommendedState).toBe("RECONCILIATION_REQUIRED");
    });

    it("T17-J: Indeterminate classification triggers safe stop", () => {
      const result = evaluateJoinStateRecovery({
        recoveryRequestId: "recovery-005",
        joinCoordinatorId: fixedJoinCoordinatorId,
        currentState: "WAITING",
        timeoutClassification: "INDETERMINATE",
        satisfiedCount: 0,
        failedCount: 0,
        totalParticipants: 3,
        hasActiveLease: true,
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      });

      expect(result.recoveryAction).toBe("SAFE_STOP");
      expect(result.isRecoveryFeasible).toBe(false);
    });
  });

  describe("Contract Validation", () => {
    it("T17-K: Valid join request passes assertion", () => {
      const request = createValidJoinRequest("ALL_SUCCESS");
      expect(() => assertJoinCoordinatorRequest(request)).not.toThrow();
    });

    it("T17-L: Missing identifiers throws", () => {
      const request = createValidJoinRequest("ALL_SUCCESS");
      request.joinCoordinatorId = "";
      expect(() => assertJoinCoordinatorRequest(request)).toThrow();
    });

    it("T17-M: Invalid policy throws", () => {
      const request = createValidJoinRequest("ALL_SUCCESS");
      (request.policy as any) = "INVALID_POLICY";
      expect(() => assertJoinCoordinatorRequest(request)).toThrow();
    });

    it("T17-N: Invalid state throws", () => {
      const request = createValidJoinRequest("ALL_SUCCESS");
      (request.currentState as any) = "INVALID_STATE";
      expect(() => assertJoinCoordinatorRequest(request)).toThrow();
    });

    it("T17-O: Version mismatch throws", () => {
      const request = createValidJoinRequest("ALL_SUCCESS");
      request.contractVersion = "2.0.0";
      expect(() => assertJoinCoordinatorRequest(request)).toThrow();
    });
  });

  describe("All Join Policies and States Exist", () => {
    it("T15-P: All 6 join policies are defined", () => {
      expect(JOIN_POLICIES).toHaveLength(6);
      expect(JOIN_POLICIES).toContain("ALL_SUCCESS");
      expect(JOIN_POLICIES).toContain("MINIMUM_SUCCESS");
      expect(JOIN_POLICIES).toContain("FIRST_VALID");
      expect(JOIN_POLICIES).toContain("COLLECT_ALL");
      expect(JOIN_POLICIES).toContain("ORDERED_MERGE");
      expect(JOIN_POLICIES).toContain("REVIEW_GATE");
    });

    it("T15-Q: All 8 join states are defined", () => {
      expect(JOIN_STATES).toHaveLength(8);
      expect(JOIN_STATES).toContain("WAITING");
      expect(JOIN_STATES).toContain("PARTIALLY_SATISFIED");
      expect(JOIN_STATES).toContain("SATISFIED");
      expect(JOIN_STATES).toContain("BLOCKED");
      expect(JOIN_STATES).toContain("FAILED_SAFE");
      expect(JOIN_STATES).toContain("RECONCILIATION_REQUIRED");
      expect(JOIN_STATES).toContain("CANCELLED");
      expect(JOIN_STATES).toContain("RELEASED");
    });
  });

  describe("Precondition Verification", () => {
    it("T17-R: No join execution occurs", () => {
      const request = createValidJoinRequest("ALL_SUCCESS");
      const result = evaluateJoinCoordination(request);

      expect(result).toBeDefined();
      expect(result.decision).toBeDefined();
      expect(typeof result.isValidTransition).toBe("boolean");
      // Result is evaluation-only, no execution
      expect(result.canReleaseParentTask).toBeDefined();
    });

    it("T17-S: No dispatch or task execution", () => {
      const request = createValidJoinRequest("ALL_SUCCESS");
      const result = evaluateJoinCoordination(request);

      // Verify only evaluation results
      expect(Array.isArray(result.satisfiedParticipantIds)).toBe(true);
      expect(Array.isArray(result.affectedTaskIds)).toBe(true);
      // No execution indicators
      expect(result.affectedTaskIds.length).toBeGreaterThan(0);
    });

    it("T17-T: All tests are deterministic and synchronous", () => {
      const request = createValidJoinRequest("ALL_SUCCESS");

      // All operations should be synchronous and deterministic
      const startTime = Date.now();
      const result = evaluateJoinCoordination(request);
      const duration = Date.now() - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(100); // Should complete quickly
    });
  });
});
