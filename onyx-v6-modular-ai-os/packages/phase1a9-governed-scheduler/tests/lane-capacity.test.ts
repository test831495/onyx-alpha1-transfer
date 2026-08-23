import { describe, expect, it } from "vitest";
import { evaluateLaneCapacity, evaluateTaskToLaneCompatibility, evaluateResourceCollision, evaluateSafeReduction } from "../src/lanes";

describe("lane capacity and compatibility", () => {
  it("keeps the effective maximum at one and only selects one S0 task", () => {
    const decision = evaluateLaneCapacity({
      laneCapacityDecisionId: "1a9:lane-capacity:s0",
      laneControllerEvaluationId: "1a9:lane-eval:s0",
      stage: "S0_SINGLE",
      configuredMaximum: 1,
      governedEffectiveMaximum: 1,
      activeCount: 0,
      reservedCount: 0,
      availableCount: 1,
      candidateTaskReferenceIds: ["task-1", "task-2", "task-3"],
      compatibleTaskReferenceIds: ["task-1", "task-2", "task-3"],
      serializedTaskReferenceIds: [],
      selectedTaskReferenceIds: [],
      capacityLimitedTaskReferenceIds: [],
      blockedTaskReferenceIds: [],
      orderingReason: "wave2a-ready-set-order",
      decision: "CAPACITY_AVAILABLE",
      evidenceArtifactIds: ["ev-cap-1"],
      evaluatedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
    });
    expect(decision.decision).toBe("CAPACITY_AVAILABLE");
    expect(decision.governedEffectiveMaximum).toBe(1);
    expect(decision.selectedTaskReferenceIds).toHaveLength(1);
    expect(decision.capacityLimitedTaskReferenceIds).toHaveLength(2);
  });

  it("treats R4 as serialized and R5 as prohibited", () => {
    expect(evaluateTaskToLaneCompatibility({ schedulerTaskReferenceId: "t1", operationClass: "AUTHORING", parallelSafetyClass: "SEQUENTIAL_APPROVAL_REQUIRED", riskClass: "R4", resourceScopeIds: ["scope-1"], permissionProfileId: "perm-1", memoryAccessProfileId: "mem-1", connectorScopeIds: [], approvalId: "approval-1", promotionRequired: false, requestedStage: "S0_SINGLE", scopeHash: "scope-1", evidenceReferences: ["ev-1"] }).classification).toBe("COMPATIBLE_WITH_SERIALIZATION");
    expect(evaluateTaskToLaneCompatibility({ schedulerTaskReferenceId: "t2", operationClass: "PROMOTION", parallelSafetyClass: "PROHIBITED", riskClass: "R5", resourceScopeIds: ["scope-2"], permissionProfileId: "perm-2", memoryAccessProfileId: "mem-2", connectorScopeIds: [], approvalId: "approval-2", promotionRequired: true, requestedStage: "S5_PROMOTE_ONE", scopeHash: "scope-2", evidenceReferences: ["ev-2"] }).classification).toBe("PROHIBITED");
  });

  it("fails safe on unknown or missing resource relationships", () => {
    expect(evaluateResourceCollision({ resourceKind: "shared-file-scope", relation: "unknown" as any, scopeHash: "scope-1" }).classification).toBe("REQUIRES_RECONCILIATION");
    expect(evaluateResourceCollision({ resourceKind: "shared-file-scope", relation: "disjoint" as any, scopeHash: "scope-1" }).classification).toBe("DISJOINT_WRITE_COMPATIBLE");
  });

  it("recommends S0 for critical uncertainty and S4 for controlled stabilization", () => {
    expect(evaluateSafeReduction({ criticalAuthorityUncertainty: true, evidenceGap: false, recoveryFailure: false, reconciliationRequired: false })).toBe("REDUCE_TO_S0");
    expect(evaluateSafeReduction({ criticalAuthorityUncertainty: false, securityFailure: false, policyConflict: false, stabilizationCompatible: true })).toBe("REDUCE_TO_S4");
  });
});
