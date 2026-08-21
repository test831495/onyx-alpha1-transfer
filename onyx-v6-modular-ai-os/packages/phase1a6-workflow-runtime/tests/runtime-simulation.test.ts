import { describe, expect, it } from "vitest";
import { runLocalRuntimeSimulation } from "../src/local-runtime-simulation";

describe("Phase 1A.6 local runtime simulation", () => {
  it("completes the entire mock workflow deterministically with pause, resume, and recovery at every step", async () => {
    const result = await runLocalRuntimeSimulation();
    expect(result.completedWorkflowState).toBe("WORKFLOW_COMPLETED");
    expect(result.pausedAndResumed).toBe(true);
    expect(result.recoveredWithoutDuplication).toBe(true);
    expect(result.statusSequence.length).toBeGreaterThan(0);
  });

  it("simulates a deterministic failure and a policy-only rollback recommendation", async () => {
    const result = await runLocalRuntimeSimulation();
    expect(result.deterministicFailureHandled).toBe(true);
    expect(result.rollbackRecommendationProjected).toBe(true);
  });

  it("simulates an uncertain result, produces a reconciliation handoff, and rejects unsafe cancellation", async () => {
    const result = await runLocalRuntimeSimulation();
    expect(result.uncertainResultHandled).toBe(true);
    expect(result.unsafeCancellationRejected).toBe(true);
    expect(result.reconciliationHandoff).not.toBeNull();
    expect(result.reconciliationHandoff?.automaticRetryPermitted).toBe(false);
    expect(result.reconciliationHandoff?.remoteDeletionPermitted).toBe(false);
    expect(result.reconciliationHandoff?.forcePushPermitted).toBe(false);
    expect(result.reconciliationHandoff?.mergePermitted).toBe(false);
    expect(result.reconciliationHandoff?.productionPermitted).toBe(false);
  });

  it("simulates scope invalidation, approval expiry, and checkpoint corruption rejection", async () => {
    const result = await runLocalRuntimeSimulation();
    expect(result.scopeInvalidationRejected).toBe(true);
    expect(result.approvalExpiryRejected).toBe(true);
    expect(result.checkpointCorruptionRejected).toBe(true);
  });

  it("simulates safe cancellation", async () => {
    const result = await runLocalRuntimeSimulation();
    expect(result.safeCancellationHandled).toBe(true);
  });

  it("proves the execution lane limit remains one and all remote-write flags remain false", async () => {
    const result = await runLocalRuntimeSimulation();
    expect(result.laneLimit).toBe(1);
    expect(result.mergeAllowed).toBe(false);
    expect(result.productionDeployAllowed).toBe(false);
    expect(result.forcePushAllowed).toBe(false);
    expect(result.branchDeletionAllowed).toBe(false);
  });
});
