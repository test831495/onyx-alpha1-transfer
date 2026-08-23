import { describe, expect, it } from "vitest";
import { evaluateReconciliationDecision, evaluateRestartReconstruction, evaluateStateDivergence } from "../src";

describe("Wave 3C reconciliation and restart reconstruction", () => {
  it("requires provider truth before retry under uncertain external effect", () => {
    const decision = evaluateReconciliationDecision({
      failureClass: "UNKNOWN_EXTERNAL_WRITE",
      providerOutcome: "UNKNOWN",
      remoteSideEffectStatus: "UNCERTAIN",
      idempotencyKey: "idem-1",
      checkpointLineageValid: true,
      approvalValid: true,
      permissionValid: true,
      scopeValid: true,
      evidenceArtifactIds: ["e-1"],
      contractVersion: "1.0.0",
    });
    expect(decision.required).toBe(true);
    expect(decision.disposition).toBe("RECONCILE_PROVIDER_TRUTH");
    expect(decision.retryPermitted).toBe(false);
  });

  it("validates restart reconstruction without reviving expired or invalid state", () => {
    const result = evaluateRestartReconstruction({
      restartReconstructionDecisionId: "1a9:restart:decision:1",
      schedulerRunId: "1a9:run:1",
      workflowIds: ["wf-1"],
      runtimeIds: ["rt-1"],
      taskReferenceIds: ["taskref-1"],
      leaseIds: ["lease-expired"],
      heartbeatDecisionIds: ["hb-1"],
      lockIds: ["lock-invalid"],
      checkpointIds: ["cp-1"],
      dependencySnapshotIds: ["dep-1"],
      joinDecisionIds: ["join-1"],
      budgetDecisionIds: ["budget-1"],
      cancellationDecisionIds: ["cancel-1"],
      approvalIds: ["approval-invalid"],
      permissionDecisionIds: ["perm-invalid"],
      memoryDecisionIds: ["memory-invalid"],
      connectorDecisionIds: ["connector-invalid"],
      contextPackageIds: ["context-invalid"],
      tombstoneDecisionIds: ["tombstone-1"],
      evidenceArtifactIds: ["evidence-1"],
      restartDetectedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
      invalidLeaseIds: ["lease-expired"],
      invalidLockIds: ["lock-invalid"],
      invalidApprovalIds: ["approval-invalid"],
      invalidPermissionDecisionIds: ["perm-invalid"],
      invalidMemoryDecisionIds: ["memory-invalid"],
      invalidConnectorDecisionIds: ["connector-invalid"],
      invalidContextPackageIds: ["context-invalid"],
    });
    expect(result.recommendedLaneStage).toBe("S0_SINGLE");
    expect(result.automaticReconstructionPermitted).toBe(false);
    expect(result.reconciliationRequired).toBe(true);
    expect(result.denialReasons.length).toBeGreaterThan(0);
  });

  it("detects critical state divergence and recommends safe reduction", () => {
    const result = evaluateStateDivergence({
      workflowStateDiverged: true,
      runtimeStateDiverged: true,
      checkpointStateDiverged: true,
      approvalStateDiverged: false,
      permissionStateDiverged: false,
      memoryStateDiverged: false,
      connectorStateDiverged: false,
      contextStateDiverged: false,
      evidenceStateDiverged: false,
      stabilizationCompatible: false,
    });
    expect(result.classification).toBe("MULTI_DOMAIN_DIVERGENCE");
    expect(result.recommendedDisposition).toBe("REDUCE_TO_S0");
    expect(result.requiresReconciliation).toBe(true);
  });

  it("allows S4 stabilization only under compatible conditions", () => {
    const result = evaluateStateDivergence({
      workflowStateDiverged: false,
      runtimeStateDiverged: false,
      checkpointStateDiverged: false,
      approvalStateDiverged: false,
      permissionStateDiverged: false,
      memoryStateDiverged: false,
      connectorStateDiverged: false,
      contextStateDiverged: false,
      evidenceStateDiverged: false,
      stabilizationCompatible: true,
    });
    expect(result.recommendedDisposition).toBe("S4_STABILIZE_TWO");
  });
});
