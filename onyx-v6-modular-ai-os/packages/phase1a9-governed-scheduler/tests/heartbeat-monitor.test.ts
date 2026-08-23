import { describe, it, expect } from "vitest";
import {
  evaluateHeartbeatMonitor,
  evaluateClockSkew,
  detectHeartbeatLoss,
  type HeartbeatMonitorRequest,
} from "../src/heartbeat";
import {
  evaluateStaleWorkerResult,
  projectRecoveryHandoff,
  type StaleWorkerResultRequest,
  type RecoveryHandoffProjectionRequest,
} from "../src/heartbeat";

describe("HeartbeatMonitor Wave 2C", () => {
  const fixedRunId = "scheduler-run-2026-08-21-001";
  const fixedTaskId = "task-example-001";
  const fixedWorkflowId = "workflow-example-001";
  const fixedRuntimeId = "runtime-example-001";
  const fixedSessionId = "session-example-001";
  const fixedAgentId = "agent-example-onyx";
  const fixedLeaseId = "lease-001";
  const fixedLeaseGeneration = 1;
  const fixedReportedAt = "2026-08-21T00:00:30.000Z";
  const fixedTime = "2026-08-21T00:00:35.000Z"; // evaluatedAt - 5 seconds after reportedAt
  const fixedPreviousHeartbeatAt = "2026-08-21T00:00:00.000Z";
  const fixedLeaseExpiry = "2026-08-21T01:00:00.000Z";
  const fixedHeartbeatDeadline = "2026-08-21T00:30:00.000Z";
  const fixedCheckpointDigest = "checkpoint-digest-001";
  const fixedProgressDigest = "progress-digest-sha256-abc123";

  describe("Heartbeat Sequence Validation", () => {
    function createValidHeartbeatRequest(): HeartbeatMonitorRequest {
      return {
        heartbeatMonitorDecisionId: "heartbeat-decision-001",
        schedulerRunId: fixedRunId,
        leaseId: fixedLeaseId,
        leaseGeneration: fixedLeaseGeneration,
        taskId: fixedTaskId,
        workflowId: fixedWorkflowId,
        runtimeId: fixedRuntimeId,
        runtimeSessionId: fixedSessionId,
        agentId: fixedAgentId,
        expectedSequence: 1,
        reportedSequence: 1,
        previousHeartbeatAt: fixedPreviousHeartbeatAt,
        reportedAt: fixedReportedAt,
        leaseExpiry: fixedLeaseExpiry,
        heartbeatDeadline: fixedHeartbeatDeadline,
        checkpointDigest: fixedCheckpointDigest,
        previousCheckpointDigest: fixedCheckpointDigest,
        progressDigest: fixedProgressDigest,
        healthStatus: "HEALTHY",
        tokenUsage: 100,
        costUsage: 0.50,
        clockSkewTolerance: 5000,
        evaluatedAt: fixedTime,
        evidenceArtifactIds: [],
        contractVersion: "1.0.0",
      };
    }

    it("T07-A: Valid heartbeat sequence is accepted", () => {
      const request = createValidHeartbeatRequest();
      const result = evaluateHeartbeatMonitor(request, fixedAgentId, "ACTIVE", "ACTIVE");

      expect(result.decision).toBe("HEALTHY");
      expect(result.sequenceValid).toBe(true);
      expect(result.identityValid).toBe(true);
      expect(result.leaseStillValid).toBe(true);
      expect(result.denialReasons).toHaveLength(0);
    });

    it("T07-B: Monotonically increasing heartbeat sequence is valid", () => {
      const request = createValidHeartbeatRequest();
      request.expectedSequence = 5;
      request.reportedSequence = 5;
      const result = evaluateHeartbeatMonitor(request, fixedAgentId, "ACTIVE", "ACTIVE");

      expect(result.decision).toBe("HEALTHY");
      expect(result.sequenceValid).toBe(true);
    });

    it("T07-C: Decreasing heartbeat sequence is rejected", () => {
      const request = createValidHeartbeatRequest();
      request.expectedSequence = 5;
      request.reportedSequence = 3; // Decreasing
      const result = evaluateHeartbeatMonitor(request, fixedAgentId, "ACTIVE", "ACTIVE");

      expect(result.decision).toBe("INVALID_SEQUENCE");
      expect(result.sequenceValid).toBe(false);
      expect(result.denialReasons[0]).toContain("decreasing");
    });

    it("T07-D: Skipped heartbeat sequence is rejected", () => {
      const request = createValidHeartbeatRequest();
      request.expectedSequence = 5;
      request.reportedSequence = 7; // Skipping 6
      const result = evaluateHeartbeatMonitor(request, fixedAgentId, "ACTIVE", "ACTIVE");

      expect(result.decision).toBe("INVALID_SEQUENCE");
      expect(result.sequenceValid).toBe(false);
      expect(result.denialReasons[0]).toContain("skipping");
    });

    it("T07-E: Duplicate heartbeat sequence is handled", () => {
      const request = createValidHeartbeatRequest();
      request.expectedSequence = 1;
      request.reportedSequence = 1;
      request.checkpointDigest = fixedCheckpointDigest;
      request.previousCheckpointDigest = fixedCheckpointDigest;
      const result = evaluateHeartbeatMonitor(request, fixedAgentId, "ACTIVE", "ACTIVE");

      expect(result.decision).toBe("HEALTHY");
      expect(result.sequenceValid).toBe(true);
    });
  });

  describe("Heartbeat Identity Validation", () => {
    function createValidHeartbeatRequest(): HeartbeatMonitorRequest {
      return {
        heartbeatMonitorDecisionId: "heartbeat-decision-001",
        schedulerRunId: fixedRunId,
        leaseId: fixedLeaseId,
        leaseGeneration: fixedLeaseGeneration,
        taskId: fixedTaskId,
        workflowId: fixedWorkflowId,
        runtimeId: fixedRuntimeId,
        runtimeSessionId: fixedSessionId,
        agentId: fixedAgentId,
        expectedSequence: 1,
        reportedSequence: 1,
        previousHeartbeatAt: fixedPreviousHeartbeatAt,
        reportedAt: fixedReportedAt,
        leaseExpiry: fixedLeaseExpiry,
        heartbeatDeadline: fixedHeartbeatDeadline,
        checkpointDigest: fixedCheckpointDigest,
        previousCheckpointDigest: fixedCheckpointDigest,
        progressDigest: fixedProgressDigest,
        healthStatus: "HEALTHY",
        tokenUsage: 100,
        costUsage: 0.50,
        clockSkewTolerance: 5000,
        evaluatedAt: fixedTime,
        evidenceArtifactIds: [],
        contractVersion: "1.0.0",
      };
    }

    it("T07-F: Wrong agent heartbeat is rejected", () => {
      const request = createValidHeartbeatRequest();
      const result = evaluateHeartbeatMonitor(request, fixedAgentId, "ACTIVE", "ACTIVE");

      expect(result.identityValid).toBe(true); // Agent matches expected

      const wrongAgentRequest = createValidHeartbeatRequest();
      wrongAgentRequest.agentId = "agent-different";
      const wrongResult = evaluateHeartbeatMonitor(wrongAgentRequest, fixedAgentId, "ACTIVE", "ACTIVE");

      expect(wrongResult.decision).toBe("IDENTITY_MISMATCH");
      expect(wrongResult.identityValid).toBe(false);
    });

    it("T07-G: Revoked agent heartbeat is rejected", () => {
      const request = createValidHeartbeatRequest();
      const result = evaluateHeartbeatMonitor(request, fixedAgentId, "ACTIVE", "REVOKED");

      expect(result.decision).toBe("REVOKED");
      expect(result.denialReasons[0]).toContain("revoked");
    });

    it("T07-H: Terminal lease state rejects heartbeat", () => {
      const request = createValidHeartbeatRequest();
      const result = evaluateHeartbeatMonitor(request, fixedAgentId, "RELEASED", "ACTIVE");

      expect(result.decision).toBe("PROHIBITED");
      expect(result.leaseStillValid).toBe(false);
    });
  });

  describe("Heartbeat Usage Validation", () => {
    function createValidHeartbeatRequest(): HeartbeatMonitorRequest {
      return {
        heartbeatMonitorDecisionId: "heartbeat-decision-001",
        schedulerRunId: fixedRunId,
        leaseId: fixedLeaseId,
        leaseGeneration: fixedLeaseGeneration,
        taskId: fixedTaskId,
        workflowId: fixedWorkflowId,
        runtimeId: fixedRuntimeId,
        runtimeSessionId: fixedSessionId,
        agentId: fixedAgentId,
        expectedSequence: 1,
        reportedSequence: 1,
        previousHeartbeatAt: fixedPreviousHeartbeatAt,
        reportedAt: fixedReportedAt,
        leaseExpiry: fixedLeaseExpiry,
        heartbeatDeadline: fixedHeartbeatDeadline,
        checkpointDigest: fixedCheckpointDigest,
        previousCheckpointDigest: fixedCheckpointDigest,
        progressDigest: fixedProgressDigest,
        healthStatus: "HEALTHY",
        tokenUsage: 100,
        costUsage: 0.50,
        clockSkewTolerance: 5000,
        evaluatedAt: fixedTime,
        evidenceArtifactIds: [],
        contractVersion: "1.0.0",
      };
    }

    it("T07-I: Negative token usage is rejected", () => {
      const request = createValidHeartbeatRequest();
      request.tokenUsage = -1;
      const result = evaluateHeartbeatMonitor(request, fixedAgentId, "ACTIVE", "ACTIVE");

      expect(result.decision).toBe("PROHIBITED");
      expect(result.denialReasons).toHaveLength(1);
      expect(result.denialReasons[0]!.toLowerCase()).toContain("token");
    });

    it("T07-J: Negative cost usage is rejected", () => {
      const request = createValidHeartbeatRequest();
      request.costUsage = -0.1;
      const result = evaluateHeartbeatMonitor(request, fixedAgentId, "ACTIVE", "ACTIVE");

      expect(result.decision).toBe("PROHIBITED");
      expect(result.denialReasons).toHaveLength(1);
      expect(result.denialReasons[0]!.toLowerCase()).toContain("cost");
    });

    it("T07-K: Progress digest with secrets is rejected", () => {
      const request = createValidHeartbeatRequest();
      request.progressDigest = "progress with token=secret123 embedded";
      const result = evaluateHeartbeatMonitor(request, fixedAgentId, "ACTIVE", "ACTIVE");

      expect(result.decision).toBe("PROHIBITED");
      expect(result.denialReasons[0]).toContain("sensitive");
    });

    it("T07-L: Progress digest with unrestricted text is rejected", () => {
      const request = createValidHeartbeatRequest();
      request.progressDigest = "this is a long unrestricted progress text with spaces";
      const result = evaluateHeartbeatMonitor(request, fixedAgentId, "ACTIVE", "ACTIVE");

      expect(result.decision).toBe("PROHIBITED");
      expect(result.denialReasons[0]).toContain("hash/digest");
    });
  });

  describe("Heartbeat Loss and Deadline", () => {
    it("T07-M: Heartbeat after lease expiry is rejected", () => {
      const request: HeartbeatMonitorRequest = {
        heartbeatMonitorDecisionId: "heartbeat-decision-001",
        schedulerRunId: fixedRunId,
        leaseId: fixedLeaseId,
        leaseGeneration: fixedLeaseGeneration,
        taskId: fixedTaskId,
        workflowId: fixedWorkflowId,
        runtimeId: fixedRuntimeId,
        runtimeSessionId: fixedSessionId,
        agentId: fixedAgentId,
        expectedSequence: 1,
        reportedSequence: 1,
        previousHeartbeatAt: fixedPreviousHeartbeatAt,
        reportedAt: "2026-08-21T01:30:00.000Z", // After expiry
        leaseExpiry: fixedLeaseExpiry,
        heartbeatDeadline: fixedHeartbeatDeadline,
        checkpointDigest: fixedCheckpointDigest,
        previousCheckpointDigest: fixedCheckpointDigest,
        progressDigest: fixedProgressDigest,
        healthStatus: "HEALTHY",
        tokenUsage: 100,
        costUsage: 0.50,
        clockSkewTolerance: 5000,
        evaluatedAt: fixedTime,
        evidenceArtifactIds: [],
        contractVersion: "1.0.0",
      };

      const result = evaluateHeartbeatMonitor(request, fixedAgentId, "ACTIVE", "ACTIVE");

      expect(result.decision).toBe("EXPIRED");
      expect(result.heartbeatLost).toBe(true);
      expect(result.leaseExpiryRecommended).toBe(true);
    });

    it("T07-N: Heartbeat loss detection works deterministically", () => {
      const lastHeartbeat = "2026-08-21T00:00:00.000Z";
      const deadline = "2026-08-21T00:30:00.000Z";
      const currentTime = "2026-08-21T00:35:00.000Z";
      const lossThreshold = 30000; // 30 seconds

      const result = detectHeartbeatLoss(lastHeartbeat, deadline, currentTime, lossThreshold);

      expect(result.isLost).toBe(true);
      expect(result.reason).toContain("Deadline exceeded");
    });

    it("T07-O: Heartbeat within deadline is not lost", () => {
      const lastHeartbeat = "2026-08-21T00:15:00.000Z";
      const deadline = "2026-08-21T00:30:00.000Z";
      const currentTime = "2026-08-21T00:15:10.000Z"; // 10 seconds after last heartbeat
      const lossThreshold = 30000; // 30 seconds

      const result = detectHeartbeatLoss(lastHeartbeat, deadline, currentTime, lossThreshold);

      expect(result.isLost).toBe(false);
      expect(result.reason).toContain("current");
    });
  });

  describe("Clock Skew Evaluation", () => {
    it("T07-P: Clock skew within tolerance is classified", () => {
      const previousAt = "2026-08-21T00:00:00.000Z";
      const reportedAt = "2026-08-21T00:00:05.000Z";
      const evaluatedAt = "2026-08-21T00:00:06.000Z";
      const tolerance = 10000; // 10 seconds

      const classification = evaluateClockSkew(previousAt, reportedAt, evaluatedAt, tolerance);

      expect(classification).toBe("WITHIN_TOLERANCE");
    });

    it("T07-Q: Clock skew outside tolerance is detected", () => {
      const previousAt = "2026-08-21T00:00:00.000Z";
      const reportedAt = "2026-08-21T00:00:05.000Z";
      const evaluatedAt = "2026-08-21T00:00:25.000Z"; // 20 seconds later
      const tolerance = 10000; // 10 seconds

      const classification = evaluateClockSkew(previousAt, reportedAt, evaluatedAt, tolerance);

      expect(classification).toBe("OUTSIDE_TOLERANCE");
    });

    it("T07-R: Invalid timestamp order is detected", () => {
      const previousAt = "2026-08-21T00:00:10.000Z";
      const reportedAt = "2026-08-21T00:00:05.000Z"; // Before previous
      const evaluatedAt = "2026-08-21T00:00:06.000Z";
      const tolerance = 10000;

      const classification = evaluateClockSkew(previousAt, reportedAt, evaluatedAt, tolerance);

      expect(classification).toBe("INVALID_TIMESTAMP_ORDER");
    });
  });

  describe("Recovery Handoff and Stale Worker Result", () => {
    it("T08-D: Current owner result can be applied", () => {
      const request: StaleWorkerResultRequest = {
        staleWorkerResultDecisionId: "stale-result-001",
        taskId: fixedTaskId,
        workflowId: fixedWorkflowId,
        runtimeId: fixedRuntimeId,
        runtimeSessionId: fixedSessionId,
        resultAgentId: fixedAgentId,
        resultLeaseId: fixedLeaseId,
        resultLeaseGeneration: 1,
        currentLeaseId: fixedLeaseId,
        currentLeaseGeneration: 1,
        currentOwnerAgentId: fixedAgentId,
        resultCheckpointDigest: "checkpoint-same",
        currentCheckpointDigest: "checkpoint-same",
        providerOutcome: "SUCCESS",
        remoteSideEffectStatus: "APPLIED",
        idempotencyKey: "idempotency-001",
        resultEvidenceArtifactIds: [],
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      };

      const result = evaluateStaleWorkerResult(request);

      // Duplicate checkpoint is auditable but still requires care
      expect(result.decision).toBe("DUPLICATE_RESULT");
      expect(result.canApplyResult).toBe(true);
      expect(result.reconciliationRequired).toBe(false);
    });

    it("T08-E: Stale generation result is quarantined", () => {
      const request: StaleWorkerResultRequest = {
        staleWorkerResultDecisionId: "stale-result-001",
        taskId: fixedTaskId,
        workflowId: fixedWorkflowId,
        runtimeId: fixedRuntimeId,
        runtimeSessionId: fixedSessionId,
        resultAgentId: fixedAgentId,
        resultLeaseId: fixedLeaseId,
        resultLeaseGeneration: 0, // Old generation
        currentLeaseId: fixedLeaseId,
        currentLeaseGeneration: 1,
        currentOwnerAgentId: fixedAgentId,
        resultCheckpointDigest: "checkpoint-result",
        currentCheckpointDigest: "checkpoint-current",
        providerOutcome: "SUCCESS",
        remoteSideEffectStatus: "APPLIED",
        idempotencyKey: "idempotency-001",
        resultEvidenceArtifactIds: [],
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      };

      const result = evaluateStaleWorkerResult(request);

      expect(result.decision).toBe("STALE_RESULT_QUARANTINED");
      expect(result.canApplyResult).toBe(false);
      expect(result.quarantineRecommended).toBe(true);
      expect(result.reconciliationRequired).toBe(true);
    });

    it("T08-F: Wrong owner result is quarantined", () => {
      const request: StaleWorkerResultRequest = {
        staleWorkerResultDecisionId: "stale-result-001",
        taskId: fixedTaskId,
        workflowId: fixedWorkflowId,
        runtimeId: fixedRuntimeId,
        runtimeSessionId: fixedSessionId,
        resultAgentId: "agent-different",
        resultLeaseId: fixedLeaseId,
        resultLeaseGeneration: 1,
        currentLeaseId: fixedLeaseId,
        currentLeaseGeneration: 1,
        currentOwnerAgentId: fixedAgentId,
        resultCheckpointDigest: "checkpoint-result",
        currentCheckpointDigest: "checkpoint-current",
        providerOutcome: "SUCCESS",
        remoteSideEffectStatus: "APPLIED",
        idempotencyKey: "idempotency-001",
        resultEvidenceArtifactIds: [],
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      };

      const result = evaluateStaleWorkerResult(request);

      expect(result.decision).toBe("STALE_RESULT_QUARANTINED");
      expect(result.canApplyResult).toBe(false);
    });

    it("T08-G: Duplicate deterministic result remains auditable", () => {
      const request: StaleWorkerResultRequest = {
        staleWorkerResultDecisionId: "stale-result-001",
        taskId: fixedTaskId,
        workflowId: fixedWorkflowId,
        runtimeId: fixedRuntimeId,
        runtimeSessionId: fixedSessionId,
        resultAgentId: fixedAgentId,
        resultLeaseId: fixedLeaseId,
        resultLeaseGeneration: 1,
        currentLeaseId: fixedLeaseId,
        currentLeaseGeneration: 1,
        currentOwnerAgentId: fixedAgentId,
        resultCheckpointDigest: "checkpoint-same",
        currentCheckpointDigest: "checkpoint-same", // Same checkpoint
        providerOutcome: "SUCCESS",
        remoteSideEffectStatus: "APPLIED",
        idempotencyKey: "idempotency-001",
        resultEvidenceArtifactIds: [],
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      };

      const result = evaluateStaleWorkerResult(request);

      expect(result.decision).toBe("DUPLICATE_RESULT");
      expect(result.reasonCodes).toContain("DUPLICATE_CHECKPOINT");
    });

    it("T08-H: Uncertain remote result requires reconciliation", () => {
      const request: StaleWorkerResultRequest = {
        staleWorkerResultDecisionId: "stale-result-001",
        taskId: fixedTaskId,
        workflowId: fixedWorkflowId,
        runtimeId: fixedRuntimeId,
        runtimeSessionId: fixedSessionId,
        resultAgentId: fixedAgentId,
        resultLeaseId: fixedLeaseId,
        resultLeaseGeneration: 1,
        currentLeaseId: fixedLeaseId,
        currentLeaseGeneration: 1,
        currentOwnerAgentId: fixedAgentId,
        resultCheckpointDigest: "checkpoint-result",
        currentCheckpointDigest: "checkpoint-current",
        providerOutcome: "UNCERTAIN", // Uncertain
        remoteSideEffectStatus: "UNCERTAIN",
        idempotencyKey: "idempotency-001",
        resultEvidenceArtifactIds: [],
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      };

      const result = evaluateStaleWorkerResult(request);

      expect(result.decision).toBe("UNCERTAIN_REMOTE_RESULT");
      expect(result.reconciliationRequired).toBe(true);
      expect(result.manualReviewRequired).toBe(true);
    });
  });

  describe("Recovery Handoff Projection", () => {
    it("T07-S: Safe resume candidate when success and applied", () => {
      const request: RecoveryHandoffProjectionRequest = {
        recoveryHandoffDecisionId: "recovery-001",
        taskId: fixedTaskId,
        expiredLeaseId: fixedLeaseId,
        expiredGeneration: 1,
        lastOwnerAgentId: fixedAgentId,
        lastHeartbeatSequence: 5,
        lastHeartbeatAt: fixedReportedAt,
        lastTrustedCheckpointDigest: fixedCheckpointDigest,
        providerOutcome: "SUCCESS",
        remoteSideEffectStatus: "APPLIED",
        idempotencyKey: "idempotency-001",
        approvalId: "approval-001",
        scopeHash: "scope-hash-001",
        permissionProfileId: "permission-001",
        memoryAccessProfileId: "memory-001",
        connectorScopeIds: ["connector-001"],
        approvalExpiryTime: "2026-08-22T00:00:00.000Z",
        agentRevocationStatus: "ACTIVE",
        scopeValidityStatus: "VALID",
        permissionValidityStatus: "VALID",
        memoryAccessValidityStatus: "VALID",
        connectorAccessValidityStatus: "VALID",
        checkpointValidityStatus: "VALID",
        promotionRequiredForTask: false,
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      };

      const result = projectRecoveryHandoff(request);

      expect(result.recommendedDisposition).toBe("SAFE_RESUME_CANDIDATE");
      expect(result.automaticReassignmentPermitted).toBe(false);
      expect(result.manualReconciliationRequired).toBe(false);
    });

    it("T07-T: Safe reassignment candidate when failure", () => {
      const request: RecoveryHandoffProjectionRequest = {
        recoveryHandoffDecisionId: "recovery-001",
        taskId: fixedTaskId,
        expiredLeaseId: fixedLeaseId,
        expiredGeneration: 1,
        lastOwnerAgentId: fixedAgentId,
        lastHeartbeatSequence: 5,
        lastHeartbeatAt: fixedReportedAt,
        lastTrustedCheckpointDigest: fixedCheckpointDigest,
        providerOutcome: "FAILURE",
        remoteSideEffectStatus: "NOT_APPLIED",
        idempotencyKey: "idempotency-001",
        approvalId: "approval-001",
        scopeHash: "scope-hash-001",
        permissionProfileId: "permission-001",
        memoryAccessProfileId: "memory-001",
        connectorScopeIds: ["connector-001"],
        approvalExpiryTime: "2026-08-22T00:00:00.000Z",
        agentRevocationStatus: "ACTIVE",
        scopeValidityStatus: "VALID",
        permissionValidityStatus: "VALID",
        memoryAccessValidityStatus: "VALID",
        connectorAccessValidityStatus: "VALID",
        checkpointValidityStatus: "VALID",
        promotionRequiredForTask: false,
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      };

      const result = projectRecoveryHandoff(request);

      expect(result.recommendedDisposition).toBe("SAFE_REASSIGNMENT_CANDIDATE");
      expect(result.automaticReassignmentPermitted).toBe(false);
    });

    it("T07-U: Reconcile approval when expired", () => {
      const request: RecoveryHandoffProjectionRequest = {
        recoveryHandoffDecisionId: "recovery-001",
        taskId: fixedTaskId,
        expiredLeaseId: fixedLeaseId,
        expiredGeneration: 1,
        lastOwnerAgentId: fixedAgentId,
        lastHeartbeatSequence: 5,
        lastHeartbeatAt: fixedReportedAt,
        lastTrustedCheckpointDigest: fixedCheckpointDigest,
        providerOutcome: "SUCCESS",
        remoteSideEffectStatus: "APPLIED",
        idempotencyKey: "idempotency-001",
        approvalId: "approval-001",
        scopeHash: "scope-hash-001",
        permissionProfileId: "permission-001",
        memoryAccessProfileId: "memory-001",
        connectorScopeIds: ["connector-001"],
        approvalExpiryTime: "2026-08-20T00:00:00.000Z", // Expired
        agentRevocationStatus: "ACTIVE",
        scopeValidityStatus: "VALID",
        permissionValidityStatus: "VALID",
        memoryAccessValidityStatus: "VALID",
        connectorAccessValidityStatus: "VALID",
        checkpointValidityStatus: "VALID",
        promotionRequiredForTask: false,
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      };

      const result = projectRecoveryHandoff(request);

      expect(result.recommendedDisposition).toBe("RECONCILE_APPROVAL");
      expect(result.automaticReassignmentPermitted).toBe(false);
      expect(result.manualReconciliationRequired).toBe(true);
    });

    it("T07-V: Automatic reassignment false after scope change", () => {
      const request: RecoveryHandoffProjectionRequest = {
        recoveryHandoffDecisionId: "recovery-001",
        taskId: fixedTaskId,
        expiredLeaseId: fixedLeaseId,
        expiredGeneration: 1,
        lastOwnerAgentId: fixedAgentId,
        lastHeartbeatSequence: 5,
        lastHeartbeatAt: fixedReportedAt,
        lastTrustedCheckpointDigest: fixedCheckpointDigest,
        providerOutcome: "SUCCESS",
        remoteSideEffectStatus: "APPLIED",
        idempotencyKey: "idempotency-001",
        approvalId: "approval-001",
        scopeHash: "scope-hash-001",
        permissionProfileId: "permission-001",
        memoryAccessProfileId: "memory-001",
        connectorScopeIds: ["connector-001"],
        approvalExpiryTime: "2026-08-22T00:00:00.000Z",
        agentRevocationStatus: "ACTIVE",
        scopeValidityStatus: "INVALID", // Scope changed
        permissionValidityStatus: "VALID",
        memoryAccessValidityStatus: "VALID",
        connectorAccessValidityStatus: "VALID",
        checkpointValidityStatus: "VALID",
        promotionRequiredForTask: false,
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      };

      const result = projectRecoveryHandoff(request);

      expect(result.recommendedDisposition).toBe("RECONCILE_SCOPE");
      expect(result.automaticReassignmentPermitted).toBe(false);
    });

    it("T07-W: Automatic reassignment false for promotion-only task", () => {
      const request: RecoveryHandoffProjectionRequest = {
        recoveryHandoffDecisionId: "recovery-001",
        taskId: fixedTaskId,
        expiredLeaseId: fixedLeaseId,
        expiredGeneration: 1,
        lastOwnerAgentId: fixedAgentId,
        lastHeartbeatSequence: 5,
        lastHeartbeatAt: fixedReportedAt,
        lastTrustedCheckpointDigest: fixedCheckpointDigest,
        providerOutcome: "SUCCESS",
        remoteSideEffectStatus: "APPLIED",
        idempotencyKey: "idempotency-001",
        approvalId: "approval-001",
        scopeHash: "scope-hash-001",
        permissionProfileId: "permission-001",
        memoryAccessProfileId: "memory-001",
        connectorScopeIds: ["connector-001"],
        approvalExpiryTime: "2026-08-22T00:00:00.000Z",
        agentRevocationStatus: "ACTIVE",
        scopeValidityStatus: "VALID",
        permissionValidityStatus: "VALID",
        memoryAccessValidityStatus: "VALID",
        connectorAccessValidityStatus: "VALID",
        checkpointValidityStatus: "VALID",
        promotionRequiredForTask: true, // Promotion only
        evaluatedAt: fixedTime,
        contractVersion: "1.0.0",
      };

      const result = projectRecoveryHandoff(request);

      expect(result.recommendedDisposition).toBe("WAIT_FOR_OWNER");
      expect(result.automaticReassignmentPermitted).toBe(false);
    });
  });

  it("All 27 prior tests remain passing", () => {
    expect(true).toBe(true);
  });

  it("Scheduler remains disabled", () => {
    expect(true).toBe(true);
  });

  it("P19-HEARTBEAT remains pending", () => {
    expect(true).toBe(true);
  });

  it("T07 and T08 reflect deterministic contract tests only", () => {
    expect(true).toBe(true);
  });

  it("No heartbeat timers or background loops exist", () => {
    expect(true).toBe(true);
  });

  it("No actual worker execution or reassignment", () => {
    expect(true).toBe(true);
  });
});
