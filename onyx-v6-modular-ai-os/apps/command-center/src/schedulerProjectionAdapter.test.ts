/**
 * Phase 1A.9 Scheduler Projection Adapter Tests
 * 
 * Focused tests for adapter functions:
 * - Projection to view model conversion
 * - Action eligibility adaptation
 * - Safety verification
 * - No execution handlers
 */

import { describe, it, expect } from "vitest";
import {
  adaptSchedulerProjectionToViewModel,
  adaptActionEligibilityToSummary,
  verifySchedulerProjectionSafety,
  type SchedulerProjectionViewModel,
} from "./schedulerProjectionAdapter";
import {
  createEmptySchedulerProjection,
  createEmptyOperatorActionEligibilityProjection,
} from "@onyx/phase1a9-governed-scheduler";

describe("Scheduler Projection Adapter", () => {
  it("should convert projection to view model", () => {
    const projection = createEmptySchedulerProjection("test-proj-1", 1000);
    const viewModel = adaptSchedulerProjectionToViewModel(projection);

    expect(viewModel.schedulerProjectionId).toBe("test-proj-1");
    expect(viewModel.workflowId).toBe("UNKNOWN");
    expect(viewModel.schedulerEnabled).toBe(false);
    expect(viewModel.activeLaneStage).toBe("S0_SINGLE");
  });

  it("should preserve frozen scheduler configuration in view model", () => {
    const projection = createEmptySchedulerProjection("test-proj-2", 1000);
    const viewModel = adaptSchedulerProjectionToViewModel(projection);

    expect(viewModel.runtimeLaneLimit).toBe(1);
    expect(viewModel.promotionLaneLimit).toBe(1);
  });

  it("should calculate task count from projection", () => {
    const projection = createEmptySchedulerProjection("test-proj-3", 1000);
    const viewModel = adaptSchedulerProjectionToViewModel(projection);

    expect(viewModel.taskCount).toBe(projection.taskGraphSummary.taskNodeCount);
    expect(viewModel.readyTaskCount).toBe(projection.readySetSummary.eligibleCount);
  });

  it("should calculate warning and blocking decision counts", () => {
    const projection = createEmptySchedulerProjection("test-proj-4", 1000);
    const viewModel = adaptSchedulerProjectionToViewModel(projection);

    expect(viewModel.warningCount).toBe(0);
    expect(viewModel.blockingDecisionCount).toBe(0);
  });

  it("should include last evaluated timestamp", () => {
    const now = 1234567890;
    const projection = createEmptySchedulerProjection("test-proj-5", now);
    const viewModel = adaptSchedulerProjectionToViewModel(projection);

    expect(viewModel.lastEvaluatedAtMs).toBe(now);
    expect(viewModel.projectionUpdatedAt).toBeDefined();
  });

  it("should adapt action eligibility to summary", () => {
    const eligibility = createEmptyOperatorActionEligibilityProjection("proj-1", "sched-proj-1", 0);
    const summary = adaptActionEligibilityToSummary(eligibility);

    expect(summary.enabledActionCount).toBe(0);
    expect(summary.totalActionCount).toBe(0);
    expect(summary.hasBlockingReasons).toBe(true);
    expect(summary.blockingReasonSummary).toBeTruthy();
  });

  it("should preserve accessibility of blocking reasons", () => {
    const eligibility = createEmptyOperatorActionEligibilityProjection("proj-2", "sched-proj-2", 0);
    const summary = adaptActionEligibilityToSummary(eligibility);

    expect(summary.blockingReasonSummary.length).toBeGreaterThan(0);
    expect(summary.blockingReasonSummary).toContain("Scheduler");
  });

  it("should verify safe projection (all frozen values correct)", () => {
    const projection = createEmptySchedulerProjection("test-proj-6", 1000);
    const result = verifySchedulerProjectionSafety(projection);

    expect(result.isSafe).toBe(true);
    expect(result.reasons).toHaveLength(0);
  });

  it("should detect scheduler enabled as unsafe", () => {
    const projection = createEmptySchedulerProjection("test-proj-7", 1000);
    // Manually create an unsafe projection by copying and modifying
    const unsafe = {
      ...projection,
      schedulerEnabled: true,
    };
    const result = verifySchedulerProjectionSafety(unsafe);

    expect(result.isSafe).toBe(false);
    expect(result.reasons.length).toBeGreaterThan(0);
    expect(result.reasons.some((r) => r.includes("enabled"))).toBe(true);
  });

  it("should detect non-S0 stage as unsafe", () => {
    const projection = createEmptySchedulerProjection("test-proj-8", 1000);
    const unsafe = {
      ...projection,
      activeLaneStage: "S1_FOUR",
    };
    const result = verifySchedulerProjectionSafety(unsafe);

    expect(result.isSafe).toBe(false);
    expect(result.reasons.some((r) => r.includes("Lane stage"))).toBe(true);
  });

  it("should detect incorrect lane limit as unsafe", () => {
    const projection = createEmptySchedulerProjection("test-proj-9", 1000);
    const unsafe = {
      ...projection,
      runtimeLaneLimit: 4,
    };
    const result = verifySchedulerProjectionSafety(unsafe);

    expect(result.isSafe).toBe(false);
    expect(result.reasons.some((r) => r.includes("lane limit"))).toBe(true);
  });

  it("should detect P0 writer path not absent as unsafe", () => {
    const projection = createEmptySchedulerProjection("test-proj-10", 1000);
    const unsafe = {
      ...projection,
      memoryBoundarySummary: {
        ...projection.memoryBoundarySummary,
        p0WriterPathAbsent: false,
      },
    };
    const result = verifySchedulerProjectionSafety(unsafe);

    expect(result.isSafe).toBe(false);
    expect(result.reasons.some((r) => r.includes("P0 writer"))).toBe(true);
  });

  it("should have no execution handlers in adapter", () => {
    const projection = createEmptySchedulerProjection("test-proj-11", 1000);
    const viewModel = adaptSchedulerProjectionToViewModel(projection);

    const keys = Object.keys(viewModel) as (keyof typeof viewModel)[];
    const hasHandler = keys.some((k) => {
      const val = viewModel[k];
      return (
        typeof val === "function" &&
        (k.toString().includes("execute") ||
          k.toString().includes("run") ||
          k.toString().includes("dispatch"))
      );
    });

    expect(hasHandler).toBe(false);
  });
});
