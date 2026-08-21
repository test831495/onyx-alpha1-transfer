import { describe, expect, it } from "vitest";
import { classifyAbandonedTaskRecovery, type RecoveryInput } from "../src/track-a/abandoned-task-recovery";

describe("abandoned task recovery contract", () => {
  const makeRecovery = (overrides: Partial<RecoveryInput> = {}): RecoveryInput => ({
    taskId: "task-1",
    expiredLeaseId: "lease-1",
    lastAgentId: "agent-1",
    lastTrustedCheckpoint: "checkpoint-1",
    lastEvidenceSequence: 7,
    providerOutcome: "DETERMINISTIC_FAILURE",
    remoteSideEffectStatus: "NONE",
    recoveryClassification: undefined,
    automaticReassignmentPermitted: true,
    manualReconciliationRequired: false,
    idempotencyKey: "idem-1",
    resourceReferences: ["https://example.test/resource"],
    recommendedReadOnlyChecks: ["verify remote status"],
    recommendedAction: "READ_ONLY_CHECK",
    approvalRequired: false,
    createdAt: "2026-08-21T00:00:00.000Z",
    evidenceReferences: ["evidence-1"],
    contractVersion: "1.0.0",
    scopeHash: "scope-hash-1",
    approvalValid: true,
    permissionsValid: true,
    connectorScopesValid: true,
    memoryAccessValid: true,
    checkpointChainValid: true,
    taskPromotionRequired: false,
    riskClassRequiresFreshApproval: false,
    agentRevocationRequiresSecurityReview: false,
    resourceOwnershipCertain: true,
    ...overrides,
  });

  it("classifies deterministic failure and compatible reuse deterministically", () => {
    const deterministicFailure = classifyAbandonedTaskRecovery(makeRecovery({ providerOutcome: "DETERMINISTIC_FAILURE", remoteSideEffectStatus: "NONE", automaticReassignmentPermitted: true }));
    expect(deterministicFailure.recoveryClassification).toBe("SAFE_REASSIGNMENT");
    expect(deterministicFailure.automaticReassignmentPermitted).toBe(true);

    const compatibleReuse = classifyAbandonedTaskRecovery(makeRecovery({ providerOutcome: "COMPATIBLE_REUSE", remoteSideEffectStatus: "NONE", automaticReassignmentPermitted: false, recoveryClassification: "SAFE_RESUME" }));
    expect(compatibleReuse.recoveryClassification).toBe("SAFE_RESUME");
  });

  it("marks uncertain outcomes and prohibited operations as non-reassignable", () => {
    const uncertain = classifyAbandonedTaskRecovery(makeRecovery({ providerOutcome: "UNCERTAIN_RESULT", remoteSideEffectStatus: "UNKNOWN" }));
    expect(uncertain.automaticReassignmentPermitted).toBe(false);
    expect(uncertain.manualReconciliationRequired).toBe(true);
    expect(["UNCERTAIN_REMOTE_OUTCOME", "MANUAL_RECONCILIATION"]).toContain(uncertain.recoveryClassification);

    const prohibited = classifyAbandonedTaskRecovery(makeRecovery({ providerOutcome: "PROHIBITED_OPERATION", remoteSideEffectStatus: "APPLIED" }));
    expect(prohibited.automaticReassignmentPermitted).toBe(false);
    expect(prohibited.recoveryClassification).toBe("PROHIBITED_RECOVERY");
  });

  it("blocks reassignment when approval, scope, permissions, connector scope, memory scope, checkpoint, or idempotency are invalid", () => {
    expect(classifyAbandonedTaskRecovery(makeRecovery({ approvalValid: false })).automaticReassignmentPermitted).toBe(false);
    expect(classifyAbandonedTaskRecovery(makeRecovery({ scopeHash: "different-scope" })).automaticReassignmentPermitted).toBe(false);
    expect(classifyAbandonedTaskRecovery(makeRecovery({ permissionsValid: false })).automaticReassignmentPermitted).toBe(false);
    expect(classifyAbandonedTaskRecovery(makeRecovery({ connectorScopesValid: false })).automaticReassignmentPermitted).toBe(false);
    expect(classifyAbandonedTaskRecovery(makeRecovery({ memoryAccessValid: false })).automaticReassignmentPermitted).toBe(false);
    expect(classifyAbandonedTaskRecovery(makeRecovery({ checkpointChainValid: false })).automaticReassignmentPermitted).toBe(false);
    expect(classifyAbandonedTaskRecovery(makeRecovery({ idempotencyKey: undefined })).automaticReassignmentPermitted).toBe(false);
  });

  it("never repeats completed work or retries uncertain remote operations", () => {
    const result = classifyAbandonedTaskRecovery(makeRecovery({ providerOutcome: "DETERMINISTIC_SUCCESS", remoteSideEffectStatus: "NONE", recommendedAction: "RESUME_FROM_LAST_CHECKPOINT" }));
    expect(result.recoveryClassification).toBe("SAFE_RESUME");
    expect(result.recommendedReadOnlyChecks.every((value) => value.toLowerCase().includes("read") || value.toLowerCase().includes("verify") || value.toLowerCase().includes("inspect"))).toBe(true);
    expect(result.recommendedAction).toBe("READ_ONLY_CHECK");
  });
});
