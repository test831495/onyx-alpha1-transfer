import { describe, expect, it } from "vitest";
import { createResultAggregation, deriveAggregateDigest, evaluateAggregation } from "../src/track-a/aggregation";
import { createProtectedPromotionLane, assertPromotionLanePrerequisites, PROMOTION_LANE_LIMIT } from "../src/track-a/promotion-lane";

describe("Wave 2D aggregation contract", () => {
  it("sorts deterministically and preserves disagreement while escalating Rahul decisions", () => {
    const result = createResultAggregation({
      aggregationId: "agg-1",
      workflowId: "wf-1",
      runtimeId: "runtime-1",
      barrierId: "barrier-1",
      orderedTaskOutputs: [
        { taskId: "task-b", output: { status: "ok" } },
        { taskId: "task-a", output: { status: "ok" } },
      ],
      outputDigests: ["digest-b", "digest-a"],
      evidenceReferences: ["ev-2", "ev-1"],
      conflictPolicy: "FAIL_ON_CONFLICT",
      partialResultPolicy: "ALLOW_VALIDATED_PARTIAL",
      aggregateDigest: "digest-agg",
      resultClassification: "COMPLETE",
      agreementPoints: ["task-a:agreement"],
      disagreementPoints: ["task-b:disagreement"],
      openQuestions: ["Need RahuI decision"],
      escalationRequired: false,
      createdAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
      dependencyOrder: ["task-a", "task-b"],
      barrierTaskOrder: ["task-a", "task-b"],
      evidenceOrder: ["ev-1", "ev-2"],
    });

    expect(result.orderedTaskOutputs.map((entry) => entry.taskId)).toEqual(["task-a", "task-b"]);
    expect(deriveAggregateDigest(result)).toBeTruthy();
    expect(evaluateAggregation({
      ...result,
      conflictPolicy: "REQUIRE_RAHUL_DECISION",
      agreementPoints: ["council-agreement"],
      disagreementPoints: ["consensus-uncertain"],
    }).escalationRequired).toBe(true);
  });
});

describe("Wave 2D protected promotion lane", () => {
  it("enforces lane limit, R4 freshness, and no live-write safety flags", () => {
    expect(PROMOTION_LANE_LIMIT).toBe(1);

    const lane = createProtectedPromotionLane({
      promotionLaneId: "lane-1",
      workflowId: "wf-1",
      runtimeId: "runtime-1",
      laneLimit: 1,
      eligibleTaskClasses: ["SAFE_RELEASE"],
      requiredApproval: "approval-r4",
      requiredRiskClass: "R4",
      requiredJoinBarriers: ["barrier-1"],
      requiredEvidence: ["ev-1", "ev-2"],
      requiredValidation: ["validation-1", "validation-2"],
      requiredSecurityReview: "security-review-1",
      requiredRollbackPlan: "rollback-plan-1",
      requiredRecoveryPlan: "recovery-plan-1",
      activeLease: "lease-2",
      queueOrder: 1,
      releasePolicy: "REQUIRES_FRESH_R4_APPROVAL",
      status: "QUEUED",
      createdAt: "2026-08-21T00:00:00.000Z",
      updatedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
      approvalScopeHash: "scope-hash-1",
      workflowIdExact: "wf-1",
      targetEnvironment: "production",
      externalSystemScope: "github.com/org/repo",
      evidenceComplete: true,
      validationComplete: true,
      securityReviewComplete: true,
      rollbackPlanComplete: true,
      recoveryPlanComplete: true,
      joinsComplete: true,
      approvalFresh: true,
      approvalValid: true,
      approvalExpiresAt: "2026-08-21T00:05:00.000Z",
      scopeHashMatches: true,
      exactWorkflowMatch: true,
      exactEnvironmentMatch: true,
      exactExternalSystemScopeMatch: true,
      approvalNotExpired: true,
      materialChangeAbsent: true,
      riskClassAllowed: true,
      activeRuntimeLimitOne: true,
    });

    expect(assertPromotionLanePrerequisites(lane)).toBeUndefined();
    expect(lane.mergeAllowed).toBe(false);
    expect(lane.productionDeployAllowed).toBe(false);
    expect(lane.forcePushAllowed).toBe(false);
    expect(lane.branchDeletionAllowed).toBe(false);
    expect(lane.secretAccessAllowed).toBe(false);
    expect(lane.permissionChangeAllowed).toBe(false);
    expect(lane.liveConnectorMutationAllowed).toBe(false);
    expect(lane.paidActionAllowed).toBe(false);
  });
});
