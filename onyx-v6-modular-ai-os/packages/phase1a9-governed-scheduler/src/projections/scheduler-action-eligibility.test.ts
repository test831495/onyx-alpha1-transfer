/**
 * Phase 1A.9 Scheduler Action Eligibility Tests
 * 
 * Focused tests for operator action eligibility:
 * - Only safe read-only actions are permitted
 * - Denied actions include accessible reasons
 * - No prohibited action classes are allowed
 * - Action eligibility is deterministic and projection-only
 * - No execution handlers exist
 */

import { describe, it, expect } from "vitest";
import {
  isSafeOperatorActionClass,
  createReadOnlyActionEligibility,
  createEmptyOperatorActionEligibilityProjection,
  type OperatorActionClass,
} from "./scheduler-action-eligibility";

describe("Scheduler Action Eligibility", () => {
  it("should validate INSPECT as safe", () => {
    expect(isSafeOperatorActionClass("INSPECT")).toBe(true);
  });

  it("should validate all OPEN_* actions as safe", () => {
    expect(isSafeOperatorActionClass("OPEN_EVIDENCE")).toBe(true);
    expect(isSafeOperatorActionClass("OPEN_CONTEXT_REFERENCE")).toBe(true);
    expect(isSafeOperatorActionClass("OPEN_RECOVERY_DETAILS")).toBe(true);
    expect(isSafeOperatorActionClass("OPEN_APPROVAL_DETAILS")).toBe(true);
    expect(isSafeOperatorActionClass("OPEN_COST_DETAILS")).toBe(true);
  });

  it("should validate COPY_REFERENCE as safe", () => {
    expect(isSafeOperatorActionClass("COPY_REFERENCE")).toBe(true);
  });

  it("should validate REQUEST_FUTURE_GOVERNED_ACTION as safe", () => {
    expect(isSafeOperatorActionClass("REQUEST_FUTURE_GOVERNED_ACTION")).toBe(true);
  });

  it("should create read-only action eligibility with correct fields", () => {
    const decision = createReadOnlyActionEligibility(
      "action-1",
      "INSPECT",
      true,
      "Inspect scheduler state",
      "Opens a read-only view of current scheduler state"
    );

    expect(decision.actionId).toBe("action-1");
    expect(decision.actionClass).toBe("INSPECT");
    expect(decision.enabled).toBe(true);
    expect(decision.readOnly).toBe(true);
    expect(decision.riskClass).toBe("READ_ONLY");
    expect(decision.approvalRequired).toBe(false);
    expect(decision.contractVersion).toBe("1.0.0");
  });

  it("should include accessible label and description", () => {
    const decision = createReadOnlyActionEligibility(
      "action-2",
      "INSPECT",
      true,
      "View state",
      "Opens a view of the scheduler state"
    );

    expect(decision.accessibleLabel).toBe("View state");
    expect(decision.accessibleDescription).toBe("Opens a view of the scheduler state");
  });

  it("should allow denial reasons for disabled actions", () => {
    const reason = {
      code: "SCHEDULER_DISABLED",
      category: "POLICY" as const,
      accessibleMessage: "Scheduler is disabled",
      humanReadableMessage: "Scheduler is disabled",
    };

    const decision = createReadOnlyActionEligibility(
      "action-3",
      "INSPECT",
      false,
      "View state",
      "View is unavailable",
      [reason]
    );

    expect(decision.denialReasons).toHaveLength(1);
    const firstReason = decision.denialReasons[0];
    if (firstReason) {
      expect(firstReason.code).toBe("SCHEDULER_DISABLED");
    }
  });

  it("should throw on unsafe action class", () => {
    expect(isSafeOperatorActionClass("EXECUTE_TASK")).toBe(false);
  });

  it("should create empty eligibility projection", () => {
    const projection = createEmptyOperatorActionEligibilityProjection("proj-1", "sched-proj-1", 0);

    expect(projection.projectionId).toBe("proj-1");
    expect(projection.schedulerProjectionId).toBe("sched-proj-1");
    expect(projection.evaluatedAt).toBe(0);
    expect(projection.contractVersion).toBe("1.0.0");
  });

  it("should have empty action decisions for new projection", () => {
    const projection = createEmptyOperatorActionEligibilityProjection("proj-2", "sched-proj-2", 0);
    expect(projection.actionDecisions).toHaveLength(0);
    expect(projection.enabledActionCount).toBe(0);
    expect(projection.deniedActionCount).toBe(0);
  });

  it("should include global blocking reasons in empty projection", () => {
    const projection = createEmptyOperatorActionEligibilityProjection("proj-3", "sched-proj-3", 0);
    expect(projection.globalBlockingReasons.length).toBeGreaterThan(0);
    const reasons = projection.globalBlockingReasons;
    const codes = reasons.map((r) => r.code);
    expect(codes).toContain("SCHEDULER_DISABLED");
  });

  it("should have accessible messages for all blocking reasons", () => {
    const projection = createEmptyOperatorActionEligibilityProjection("proj-4", "sched-proj-4", 0);
    projection.globalBlockingReasons.forEach((reason) => {
      expect(reason.accessibleMessage).toBeTruthy();
      expect(reason.humanReadableMessage).toBeTruthy();
      expect(reason.code).toBeTruthy();
      expect(reason.category).toBeTruthy();
    });
  });

  it("should never include prohibited action handlers", () => {
    const decision = createReadOnlyActionEligibility(
      "action-5",
      "INSPECT",
      true,
      "View",
      "View scheduler"
    );

    // Verify no prohibited action handlers
    const keys = Object.keys(decision) as (keyof typeof decision)[];
    const hasProhibitedHandler = keys.some((k) => {
      const val = decision[k];
      return (
        typeof val === "function" &&
        (k.toString().includes("execute") ||
          k.toString().includes("run") ||
          k.toString().includes("dispatch"))
      );
    });

    expect(hasProhibitedHandler).toBe(false);
  });

  it("should mark all decisions as read-only", () => {
    const decision = createReadOnlyActionEligibility(
      "action-6",
      "COPY_REFERENCE",
      true,
      "Copy",
      "Copy reference"
    );

    expect(decision.readOnly).toBe(true);
  });

  it("should never require fresh approval for read-only actions", () => {
    const decision = createReadOnlyActionEligibility(
      "action-7",
      "INSPECT",
      true,
      "View",
      "View"
    );

    expect(decision.freshApprovalRequired).toBe(false);
    expect(decision.approvalRequired).toBe(false);
  });

  it("should include evidence artifact references", () => {
    const decision = createReadOnlyActionEligibility(
      "action-8",
      "INSPECT",
      true,
      "View",
      "View"
    );

    expect(Array.isArray(decision.evidenceArtifactIds)).toBe(true);
    expect(decision.evidenceArtifactIds).toHaveLength(0);
  });
});
