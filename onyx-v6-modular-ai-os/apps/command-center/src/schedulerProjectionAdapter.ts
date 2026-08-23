/**
 * Phase 1A.9 Scheduler Projection Adapter for Command Center
 * 
 * Adapts phase1a9 scheduler projection contracts to Command Center UI models.
 * Deterministic, read-only reference adapter. No state mutation occurs.
 */

import type {
  AutomationCenterSchedulerProjection,
  SchedulerOperatorActionEligibilityProjection,
} from "@onyx/phase1a9-governed-scheduler/projections";

/**
 * Scheduler projection view model for Automation Center.
 * Simplified summary that includes only essential read-only information.
 */
export interface SchedulerProjectionViewModel {
  readonly schedulerProjectionId: string;
  readonly workflowId: string;
  readonly runtimeId: string;

  // Scheduler state
  readonly schedulerEnabled: false;
  readonly activeLaneStage: "S0_SINGLE";
  readonly runtimeLaneLimit: 1;
  readonly promotionLaneLimit: 1;
  readonly schedulerHealthStatus: string;

  // Summary counts for dashboard display
  readonly taskCount: number;
  readonly readyTaskCount: number;
  readonly activeLeaseCount: number;
  readonly warningCount: number;
  readonly blockingDecisionCount: number;

  // Staleness indicator
  readonly stalenessStatus: string;
  readonly lastEvaluatedAtMs: number;

  // Redacted references
  readonly pendingApprovalCount: number;
  readonly reconciliationRequired: boolean;
  readonly projectionUpdatedAt: string;
}

/**
 * Convert scheduler projection to a simpler view model for UI rendering.
 */
export function adaptSchedulerProjectionToViewModel(
  projection: AutomationCenterSchedulerProjection
): SchedulerProjectionViewModel {
  return {
    schedulerProjectionId: projection.schedulerProjectionId,
    workflowId: projection.workflowId,
    runtimeId: projection.runtimeId,
    schedulerEnabled: projection.schedulerEnabled,
    activeLaneStage: projection.activeLaneStage,
    runtimeLaneLimit: projection.runtimeLaneLimit,
    promotionLaneLimit: projection.promotionLaneLimit,
    schedulerHealthStatus: projection.schedulerHealthStatus,
    taskCount: projection.taskGraphSummary.taskNodeCount,
    readyTaskCount: projection.readySetSummary.eligibleCount,
    activeLeaseCount: projection.leaseSummary.activeLeaseCount,
    warningCount: projection.warningIds.length,
    blockingDecisionCount: projection.blockingDecisionIds.length,
    stalenessStatus: projection.stalenessStatus,
    lastEvaluatedAtMs: projection.lastEvaluatedAt,
    pendingApprovalCount: projection.pendingApprovalIds.length,
    reconciliationRequired: projection.stalenessStatus === "STALE",
    projectionUpdatedAt: new Date(projection.lastEvaluatedAt).toISOString(),
  };
}

/**
 * Action eligibility summary for operators.
 */
export interface OperatorActionEligibilitySummary {
  readonly enabledActionCount: number;
  readonly totalActionCount: number;
  readonly hasBlockingReasons: boolean;
  readonly blockingReasonSummary: string;
}

interface SchedulerSafetyProjection {
  readonly schedulerEnabled: boolean;
  readonly activeLaneStage: string;
  readonly runtimeLaneLimit: number;
  readonly promotionLaneLimit: number;
  readonly memoryBoundarySummary: {
    readonly p0WriterPathAbsent: boolean;
    readonly memoryAuthorityFalse: boolean;
  };
}

/**
 * Adapt action eligibility to UI summary.
 */
export function adaptActionEligibilityToSummary(
  eligibility: SchedulerOperatorActionEligibilityProjection
): OperatorActionEligibilitySummary {
  const hasBlocking = eligibility.globalBlockingReasons.length > 0;
  const blockingSummary = hasBlocking
    ? eligibility.globalBlockingReasons.map((r) => r.humanReadableMessage).join("; ")
    : "No blocking reasons";

  return {
    enabledActionCount: eligibility.enabledActionCount,
    totalActionCount: eligibility.actionDecisions.length,
    hasBlockingReasons: hasBlocking,
    blockingReasonSummary: blockingSummary,
  };
}

/**
 * Verify that a projection is safe to display without exposing execution controls.
 */
export function verifySchedulerProjectionSafety(
  projection: SchedulerSafetyProjection
): { isSafe: boolean; reasons: string[] } {
  const reasons: string[] = [];

  // Verify scheduler is disabled
  if (projection.schedulerEnabled !== false) {
    reasons.push("Scheduler is enabled; must remain disabled for Wave 4B display.");
  }

  // Verify S0_SINGLE stage
  if (projection.activeLaneStage !== "S0_SINGLE") {
    reasons.push("Lane stage is not S0_SINGLE; must remain single-lane.");
  }

  // Verify runtime lane limit
  if (projection.runtimeLaneLimit !== 1) {
    reasons.push("Runtime lane limit is not 1; must remain at 1.");
  }

  // Verify promotion lane limit
  if (projection.promotionLaneLimit !== 1) {
    reasons.push("Promotion lane limit is not 1; must remain at 1.");
  }

  // Verify no sensitive content in memory summaries
  if (projection.memoryBoundarySummary.p0WriterPathAbsent !== true) {
    reasons.push("P0 writer path is not marked absent; potential security issue.");
  }

  if (projection.memoryBoundarySummary.memoryAuthorityFalse !== true) {
    reasons.push("Memory authority flag is not false; potential security issue.");
  }

  return {
    isSafe: reasons.length === 0,
    reasons,
  };
}
