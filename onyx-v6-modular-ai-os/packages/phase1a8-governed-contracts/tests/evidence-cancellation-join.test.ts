import { describe, expect, it } from "vitest";
import {
  createEvidenceSequenceRecord,
  orderEvidenceSequenceRecords,
  assertValidEvidenceSequenceRecord,
} from "../src/track-a/evidence-sequencing";
import {
  createCancellationRequest,
  transitionCancellation,
  assertCancellationPermitted,
} from "../src/track-a/cancellation";
import { createJoinBarrier, evaluateJoinBarrier } from "../src/track-a/join-barrier";

describe("Wave 2D evidence sequencing contract", () => {
  it("orders evidence deterministically and rejects duplicates and prohibited content", () => {
    const baseEvidence = {
      evidenceId: "ev-2",
      workflowId: "wf-1",
      runtimeId: "runtime-1",
      runtimeSessionId: "session-1",
      agentId: "agent-b",
      taskId: "task-2",
      leaseId: "lease-2",
      agentLocalSequence: 2,
      taskLocalSequence: 2,
      workflowLogicalSequence: 20,
      checkpointDigest: "cp-2",
      causalParentIds: ["ev-1"],
      capabilityId: "READ_EVIDENCE",
      providerClassification: "DETERMINISTIC_SUCCESS",
      resourceReferences: ["local://resource-2"],
      permissionDecision: "PERMITTED",
      memoryAccessDecision: "READ_ONLY",
      connectorScopeDecision: "APPROVED",
      budgetDecision: "WITHIN_BUDGET",
      modelRoutingDecision: "LOCAL_MODEL",
      redactedDetail: "Evidence summary for [REDACTED] resource.",
      createdAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
      taskDependencyOrder: 2,
      checkpointOrder: 2,
    } as const;

    const record = createEvidenceSequenceRecord({
      ...baseEvidence,
      opportunityScope: "approved-scope",
      causalParentIds: ["ev-1"],
      taskDependencyOrder: 2,
      checkpointOrder: 2,
    });

    expect(assertValidEvidenceSequenceRecord(record)).toBeUndefined();
    expect(orderEvidenceSequenceRecords([record, createEvidenceSequenceRecord({
      ...baseEvidence,
      evidenceId: "ev-1",
      taskId: "task-1",
      leaseId: "lease-1",
      agentId: "agent-a",
      workflowLogicalSequence: 10,
      taskLocalSequence: 1,
      agentLocalSequence: 1,
      checkpointDigest: "cp-1",
      causalParentIds: [],
      resourceReferences: ["local://resource-1"],
      opportunityScope: "approved-scope",
      taskDependencyOrder: 1,
      checkpointOrder: 1,
    })])).toEqual(["ev-1", "ev-2"]);

    expect(() => createEvidenceSequenceRecord({
      ...baseEvidence,
      evidenceId: "ev-2",
      taskId: "task-2",
      leaseId: "lease-2",
      agentId: "agent-a",
      agentLocalSequence: 2,
      taskLocalSequence: 2,
      workflowLogicalSequence: 20,
      checkpointDigest: "cp-2",
      causalParentIds: ["ev-1"],
      redactedDetail: "password=secret123",
      opportunityScope: "approved-scope",
      taskDependencyOrder: 2,
      checkpointOrder: 2,
    })).toThrow();

    expect(() => createEvidenceSequenceRecord({
      ...baseEvidence,
      evidenceId: "ev-3",
      agentId: "agent-c",
      taskId: "task-3",
      leaseId: "lease-3",
      agentLocalSequence: 3,
      taskLocalSequence: 3,
      workflowLogicalSequence: 30,
      checkpointDigest: "cp-3",
      causalParentIds: ["ev-999"],
      redactedDetail: "Prior conversation: think step by step; secret note.",
      opportunityScope: "approved-scope",
      taskDependencyOrder: 3,
      checkpointOrder: 3,
    })).toThrow();
  });
});

describe("Wave 2D cancellation contract", () => {
  it("accepts only permitted transitions and blocks uncertain work", () => {
    const request = createCancellationRequest({
      cancellationRequestId: "cancel-1",
      workflowId: "wf-1",
      runtimeId: "runtime-1",
      taskId: "task-2",
      requestingActor: "Rahul Kumar",
      requestingAgentId: "agent-a",
      targetAgentIds: ["agent-b"],
      targetLeaseIds: ["lease-2"],
      reason: "Uncertain remote mutation",
      riskClass: "R2",
      safeBoundaryRequired: true,
      requestedAt: "2026-08-21T00:00:00.000Z",
      expiresAt: "2026-08-21T00:05:00.000Z",
      acknowledgements: ["agent-b:acknowledged"],
      blockedAgents: [],
      remoteUncertaintyStatus: "UNCERTAIN",
      finalCancellationState: "REQUESTED",
      approvalId: "approval-2",
      evidenceReferences: ["ev-2"],
      contractVersion: "1.0.0",
    });

    expect(assertCancellationPermitted(request)).toBe(false);
    expect(assertCancellationPermitted({ ...request, remoteUncertaintyStatus: "KNOWN" as const })).toBe(true);
    expect(transitionCancellation(request, "ACKNOWLEDGING").finalCancellationState).toBe("ACKNOWLEDGING");
    expect(() => transitionCancellation(request, "CANCELLED")).toThrow();
    expect(() => {
      const uncertain = { ...request, remoteUncertaintyStatus: "UNCERTAIN" as const };
      return assertCancellationPermitted(uncertain, { allowUncertainCancellation: false });
    }).not.toThrow();
  });
});

describe("Wave 2D join barrier contract", () => {
  it("releases only when evidence, validation, and approval prerequisites are complete", () => {
    const barrier = createJoinBarrier({
      barrierId: "barrier-1",
      workflowId: "wf-1",
      runtimeId: "runtime-1",
      requiredTaskIds: ["task-1", "task-2"],
      completedTaskIds: ["task-1", "task-2"],
      failedTaskIds: [],
      uncertainTaskIds: [],
      cancelledTaskIds: [],
      minimumSuccessRule: 2,
      allRequiredRule: true,
      evidenceRequired: true,
      validationRequired: true,
      promotionEligibility: true,
      releaseStatus: "WAITING",
      contractVersion: "1.0.0",
      evidenceReferences: ["ev-1", "ev-2"],
      validationReferences: ["validation-1", "validation-2"],
      approvalId: "approval-2",
      approvalValid: true,
      checkpointLineageValid: true,
      scopeVersionMatches: true,
      securityReviewComplete: true,
      budgetSufficient: true,
      connectorScopeVerified: true,
      memoryScopeVerified: true,
      personaProtected: true,
      promotionRequirementsComplete: true,
      reconciliationComplete: true,
    });

    expect(evaluateJoinBarrier(barrier).releaseStatus).toBe("RELEASED");
    expect(() => evaluateJoinBarrier({ ...barrier, uncertainTaskIds: ["task-2"], evidenceRequired: true })).toThrow();
  });
});
