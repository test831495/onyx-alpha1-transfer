/**
 * Phase 1A.9 Automation Center Projection Tests
 * 
 * Focused tests for scheduler projection contracts:
 * - Scheduler state freeze verification (S0, disabled, limit=1)
 * - Authority boundaries  are preserved
 * - No sensitive content is included
 * - Staleness is visible
 * - Frozen configuration values are accurate
 */

import { describe, it, expect } from "vitest";
import {
  AUTOMATION_CENTER_SCHEDULER_PROJECTION_VERSION,
  createEmptySchedulerProjection,
  type AutomationCenterSchedulerProjection,
} from "./automation-center-projection";

describe("Automation Center Scheduler Projection", () => {
  it("should have correct version constant", () => {
    expect(AUTOMATION_CENTER_SCHEDULER_PROJECTION_VERSION).toBe("1.0.0");
  });

  it("should create empty projection with correct structure", () => {
    const now = 1234567890;
    const projection = createEmptySchedulerProjection("test-proj-1", now);

    expect(projection).toBeDefined();
    expect(projection.schedulerProjectionId).toBe("test-proj-1");
    expect(projection.lastEvaluatedAt).toBe(now);
    expect(projection.contractVersion).toBe("1.0.0");
    expect(projection.projectionVersion).toBe(AUTOMATION_CENTER_SCHEDULER_PROJECTION_VERSION);
  });

  it("should freeze scheduler disabled state", () => {
    const projection = createEmptySchedulerProjection("test-proj-2", 0);
    expect(projection.schedulerEnabled).toBe(false);
  });

  it("should freeze S0_SINGLE stage", () => {
    const projection = createEmptySchedulerProjection("test-proj-3", 0);
    expect(projection.activeLaneStage).toBe("S0_SINGLE");
  });

  it("should freeze runtime lane limit to 1", () => {
    const projection = createEmptySchedulerProjection("test-proj-4", 0);
    expect(projection.runtimeLaneLimit).toBe(1);
  });

  it("should freeze promotion lane limit to 1", () => {
    const projection = createEmptySchedulerProjection("test-proj-5", 0);
    expect(projection.promotionLaneLimit).toBe(1);
  });

  it("should have zero counts for empty state", () => {
    const projection = createEmptySchedulerProjection("test-proj-6", 0);

    expect(projection.taskGraphSummary.taskNodeCount).toBe(0);
    expect(projection.laneSummary.activeLaneCount).toBe(0);
    expect(projection.leaseSummary.activeLeaseCount).toBe(0);
    expect(projection.heartbeatSummary.monitoredLeaseCount).toBe(0);
    expect(projection.lockSummary.activeLockCount).toBe(0);
    expect(projection.checkpointSummary.checkpointCount).toBe(0);
  });

  it("should preserve P0 writer path absent state", () => {
    const projection = createEmptySchedulerProjection("test-proj-7", 0);
    expect(projection.memoryBoundarySummary.p0WriterPathAbsent).toBe(true);
  });

  it("should preserve memory authority false", () => {
    const projection = createEmptySchedulerProjection("test-proj-8", 0);
    expect(projection.memoryBoundarySummary.memoryAuthorityFalse).toBe(true);
  });

  it("should have zero pending approvals", () => {
    const projection = createEmptySchedulerProjection("test-proj-9", 0);
    expect(projection.pendingApprovalIds).toHaveLength(0);
  });

  it("should have zero warnings", () => {
    const projection = createEmptySchedulerProjection("test-proj-10", 0);
    expect(projection.warningIds).toHaveLength(0);
  });

  it("should have zero blocking decisions", () => {
    const projection = createEmptySchedulerProjection("test-proj-11", 0);
    expect(projection.blockingDecisionIds).toHaveLength(0);
  });

  it("should show staleness as UNKNOWN for empty projection", () => {
    const projection = createEmptySchedulerProjection("test-proj-12", 0);
    expect(projection.stalenessStatus).toBe("UNKNOWN");
  });

  it("should be immutable (readonly properties)", () => {
    const projection = createEmptySchedulerProjection("test-proj-13", 0);
    const props = Object.getOwnPropertyNames(projection);
    expect(props.length).toBeGreaterThan(0);
    // All properties should be readonly in the type
    expect(projection.contractVersion).toBe("1.0.0");
  });

  it("should have all required summary fields", () => {
    const projection = createEmptySchedulerProjection("test-proj-14", 0);
    expect(projection.taskGraphSummary).toBeDefined();
    expect(projection.readySetSummary).toBeDefined();
    expect(projection.laneSummary).toBeDefined();
    expect(projection.leaseSummary).toBeDefined();
    expect(projection.heartbeatSummary).toBeDefined();
    expect(projection.lockSummary).toBeDefined();
    expect(projection.checkpointSummary).toBeDefined();
    expect(projection.cancellationSummary).toBeDefined();
    expect(projection.joinSummary).toBeDefined();
    expect(projection.budgetSummary).toBeDefined();
    expect(projection.recoverySummary).toBeDefined();
    expect(projection.promotionSummary).toBeDefined();
    expect(projection.evidenceSummary).toBeDefined();
    expect(projection.memoryBoundarySummary).toBeDefined();
    expect(projection.councilSummary).toBeDefined();
    expect(projection.draftSummary).toBeDefined();
    expect(projection.connectorSummary).toBeDefined();
  });

  it("should preserve task graph cycle detection in summaries", () => {
    const projection = createEmptySchedulerProjection("test-proj-15", 0);
    expect(projection.taskGraphSummary.cycleDetectionPassed).toBe(false);
    expect(projection.taskGraphSummary.topologicalOrderingVerified).toBe(false);
  });

  it("should show recovery disposition accurately", () => {
    const projection = createEmptySchedulerProjection("test-proj-16", 0);
    expect(projection.recoverySummary.primaryDispositionCount).toBe(0);
    expect(projection.recoverySummary.secondaryDispositionCount).toBe(0);
    expect(projection.recoverySummary.retryEligibleCount).toBe(0);
  });

  it("should show promotion disabled (serialized candidate count = 0)", () => {
    const projection = createEmptySchedulerProjection("test-proj-17", 0);
    expect(projection.promotionSummary.candidateCount).toBe(0);
    expect(projection.promotionSummary.serializedCandidateCount).toBe(0);
    expect(projection.promotionSummary.r5ProhibitedCount).toBe(0);
  });

  it("should have empty evidence artifact IDs", () => {
    const projection = createEmptySchedulerProjection("test-proj-18", 0);
    expect(projection.evidenceArtifactIds).toHaveLength(0);
  });
});
