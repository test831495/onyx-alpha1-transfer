import { describe, expect, it } from "vitest";
import { LANE_MAXIMA, LANE_STAGES, defaultSchedulerConfig } from "../src";
import { evaluateLaneController, evaluateStageTransition } from "../src/lanes";

describe("lane controller gate evaluation", () => {
  it("defines the exact lane set and maxima", () => {
    expect(LANE_STAGES).toEqual(["S0_SINGLE", "S1_FOUR", "S2_SIX", "S3_EIGHT", "S4_STABILIZE_TWO", "S5_PROMOTE_ONE"]);
    expect(Object.values(LANE_MAXIMA)).toEqual([1, 4, 6, 8, 2, 1]);
  });

  it("keeps the scheduler off and S0 as the active default", () => {
    const config = defaultSchedulerConfig();
    expect(config.enabled).toBe(false);
    expect(config.activeLaneStage).toBe("S0_SINGLE");
    expect(config.authoringLaneLimit).toBe(1);
    expect(config.promotionLaneLimit).toBe(1);
  });

  it("requires evidence before S1 and denies activation", () => {
    const result = evaluateLaneController({
      laneControllerEvaluationId: "1a9:lane-eval:s1-missing-evidence",
      schedulerConfigId: "1a9:schedulerConfigId:config",
      schedulerRunId: "1a9:schedulerRunId:run-a",
      workflowId: "wf-1",
      runtimeId: "rt-1",
      runtimeSessionId: "session-1",
      currentStage: "S0_SINGLE",
      requestedStage: "S1_FOUR",
      readySetDecisionId: "1a9:readySetDecisionId:ready-1",
      candidateTaskReferenceIds: ["task-1", "task-2"],
      currentActiveLaneCount: 0,
      currentReservedLaneCount: 0,
      requestedLaneCount: 1,
      availableLaneCount: 1,
      stageEvidenceIds: [],
      stageApprovalId: undefined,
      stabilityEvidenceIds: [],
      recoveryDispositionIds: [],
      reconciliationRecordIds: [],
      resourceConflictDecisionIds: [],
      permissionDecisionIds: [],
      memoryDecisionIds: [],
      connectorDecisionIds: [],
      budgetDecisionIds: [],
      scopeHash: "scope-1",
      evaluatedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
    });
    expect(result.decision).toBe("REQUIRES_EVIDENCE");
    expect(result.stageEligible).toBe(false);
    expect(result.currentStage).toBe("S0_SINGLE");
    expect(result.effectiveMaximum).toBe(1);
  });

  it("denies direct S0-to-S2 and S0-to-S3 skips", () => {
    expect(evaluateStageTransition("S0_SINGLE", "S2_SIX", [], undefined, "scope-1").decision).toBe("DENIED");
    expect(evaluateStageTransition("S0_SINGLE", "S3_EIGHT", [], undefined, "scope-1").decision).toBe("DENIED");
  });

  it("requires Rahul approval for S2 before projection and denies skip-gates", () => {
    const approvedS1 = evaluateStageTransition("S0_SINGLE", "S1_FOUR", ["ev-s1"], undefined, "scope-1");
    expect(approvedS1.decision).toBe("ALLOWED_AS_PROJECTION");
    const s2 = evaluateStageTransition("S1_FOUR", "S2_SIX", ["ev-s1", "ev-s2"], undefined, "scope-1");
    expect(s2.decision).toBe("REQUIRES_APPROVAL");
    const s3 = evaluateStageTransition("S1_FOUR", "S3_EIGHT", ["ev-s1", "ev-s3"], undefined, "scope-1");
    expect(s3.decision).toBe("DENIED");
  });
});
