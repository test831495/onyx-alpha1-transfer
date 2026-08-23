import { describe, expect, it } from "vitest";
import {
  PromotionController,
  type PromotionCandidate,
  type PromotionEligibilityRequest,
} from "../src";

const baseCandidate = (): PromotionCandidate => ({
  promotionCandidateId: "promo-candidate-001",
  schedulerRunId: "run-001",
  workflowId: "workflow-001",
  runtimeId: "runtime-001",
  runtimeSessionId: "session-001",
  sourceTaskReferenceIds: ["task-001"],
  sourceArtifactIds: ["artifact-001"],
  sourceCheckpointIds: ["checkpoint-001"],
  sourceCheckpointDigests: ["sha256:cp-001"],
  sourceContractVersions: ["1.0.0"],
  sourceEvidenceArtifactIds: ["evidence-validation-001"],
  validationEvidenceArtifactIds: ["evidence-validation-001"],
  predecessorRegressionEvidenceArtifactIds: ["evidence-regression-001"],
  securityEvidenceArtifactIds: ["evidence-security-001"],
  secretScanEvidenceArtifactIds: ["evidence-secret-001"],
  accessibilityEvidenceArtifactIds: ["evidence-access-001"],
  budgetEvidenceArtifactIds: ["evidence-budget-001"],
  costEvidenceArtifactIds: ["evidence-cost-001"],
  rollbackPlanReferenceId: "rollback-plan-001",
  recoveryPlanReferenceId: "recovery-plan-001",
  reconciliationRecordIds: [],
  approvalId: "approval-001",
  approvalPolicyVersion: "1.0.0",
  approvedScopeHash: "scope-hash-001",
  currentScopeHash: "scope-hash-001",
  approvalExpiresAt: "2099-01-01T00:00:00.000Z",
  evaluatedAt: "2026-08-21T00:00:00.000Z",
  riskClass: "R4",
  operationClass: "NORMAL",
  parallelSafetyClass: "PROTECTED_PROMOTION_ONLY",
  targetEnvironment: "LOCAL",
  targetBranchReference: "main",
  promotionLockResourceKey: "promotion:lock:workflow-001",
  promotionLaneStage: "S5_PROMOTE_ONE",
  promotionLaneLimit: 1,
  materialChangeDetected: false,
  candidateVersion: 1,
  supersedesCandidateId: "",
  createdAt: "2026-08-21T00:00:00.000Z",
  contractVersion: "1.0.0",
  evidenceArtifactIds: ["evidence-validation-001", "evidence-security-001"],
});

const baseEligibilityRequest = (overrides: Partial<PromotionEligibilityRequest> = {}): PromotionEligibilityRequest => ({
  promotionDecisionId: "promo-decision-001",
  promotionCandidateId: "promo-candidate-001",
  schedulerConfigId: "config-001",
  laneControllerDecisionId: "lane-001",
  promotionLockDecisionId: "lock-001",
  checkpointDecisionIds: ["checkpoint-001"],
  joinDecisionIds: ["join-001"],
  cancellationDecisionIds: ["cancel-001"],
  budgetDecisionIds: ["budget-001"],
  recoveryDecisionIds: ["recovery-001"],
  approvalId: "approval-001",
  permissionDecisionId: "permission-001",
  memoryDecisionIds: ["memory-001"],
  connectorDecisionIds: ["connector-001"],
  contextDecisionIds: ["context-001"],
  validationEvidenceArtifactIds: ["evidence-validation-001"],
  securityEvidenceArtifactIds: ["evidence-security-001"],
  rollbackPlanReferenceId: "rollback-plan-001",
  recoveryPlanReferenceId: "recovery-plan-001",
  evidencePackageId: "evidence-package-001",
  evidenceManifestId: "evidence-manifest-001",
  requestedAt: "2026-08-21T00:00:00.000Z",
  contractVersion: "1.0.0",
  ...overrides,
});

describe("PromotionController", () => {
  it("accepts a valid protected promotion candidate", () => {
    const candidate = baseCandidate();
    const validation = PromotionController.validateCandidate(candidate);
    expect(validation.valid).toBe(true);
    expect(validation.denialReasons).toEqual([]);
  });

  it("rejects missing source task and validation evidence", () => {
    const invalid = { ...baseCandidate(), sourceTaskReferenceIds: [], validationEvidenceArtifactIds: [] };
    const validation = PromotionController.validateCandidate(invalid);
    expect(validation.valid).toBe(false);
    expect(validation.denialReasons).toContain("missing-source-task");
    expect(validation.denialReasons).toContain("missing-validation-evidence");
  });

  it("rejects R5 and wrong promotion safety class", () => {
    const r5 = { ...baseCandidate(), riskClass: "R5" as const };
    const pure = { ...baseCandidate(), parallelSafetyClass: "READ_ONLY_PARALLEL_SAFE" as const };
    expect(PromotionController.validateCandidate(r5).valid).toBe(false);
    expect(PromotionController.validateCandidate(pure).valid).toBe(false);
  });

  it("requires fresh Rahul approval and scope validation", () => {
    const expired = { ...baseCandidate(), approvalExpiresAt: "2020-01-01T00:00:00.000Z" };
    const mismatch = { ...baseCandidate(), currentScopeHash: "scope-hash-999" };
    expect(PromotionController.validateCandidate(expired).valid).toBe(false);
    expect(PromotionController.validateCandidate(mismatch).valid).toBe(false);
  });

  it("serializes candidates deterministically and keeps queue visible", () => {
    const decision = PromotionController.evaluateSerialization([
      { ...baseCandidate(), promotionCandidateId: "promo-a" },
      { ...baseCandidate(), promotionCandidateId: "promo-b" },
      { ...baseCandidate(), promotionCandidateId: "promo-c" },
    ]);
    expect(decision.selectedCandidateId).toBe("promo-a");
    expect(decision.queuedCandidateIds).toEqual(["promo-b", "promo-c"]);
    expect(decision.decision).toBe("ONE_CANDIDATE_SELECTED_AS_PROJECTION");
  });

  it("projects failure without executing rollback or recovery", () => {
    const failure = PromotionController.projectFailure({
      promotionFailureDecisionId: "promo-failure-001",
      promotionCandidateId: "promo-candidate-001",
      promotionDecisionId: "promo-decision-001",
      failureClass: "PROMOTION_BLOCKED",
      sourceTaskReferenceIds: ["task-001"],
      sourceArtifactIds: ["artifact-001"],
      sourceCheckpointIds: ["checkpoint-001"],
      validationEvidenceArtifactIds: ["evidence-validation-001"],
      securityEvidenceArtifactIds: ["evidence-security-001"],
      rollbackPlanReferenceId: "rollback-plan-001",
      recoveryPlanReferenceId: "recovery-plan-001",
      approvalId: "approval-001",
      scopeHash: "scope-hash-001",
      targetEnvironment: "LOCAL",
      remoteSideEffectStatus: "NONE",
      providerOutcome: "SUCCESS",
      idempotencyKey: "idem-001",
      recommendedDisposition: "PRESERVE_CANDIDATE",
      rollbackCandidate: "rollback-candidate-001",
      recoveryCandidate: "recovery-candidate-001",
      compensationCandidate: "compensation-candidate-001",
      automaticRollbackPermitted: false,
      automaticRecoveryPermitted: false,
      automaticCompensationPermitted: false,
      promotionBlocked: true,
      mergeBlocked: true,
      deploymentBlocked: true,
      reconciliationRequired: false,
      RahulDecisionRequired: false,
      evidenceArtifactIds: ["evidence-validation-001"],
      evaluatedAt: "2026-08-21T00:00:00.000Z",
      contractVersion: "1.0.0",
    });
    expect(failure.promotionBlocked).toBe(true);
    expect(failure.automaticRollbackPermitted).toBe(false);
    expect(failure.mergeBlocked).toBe(true);
    expect(failure.deploymentBlocked).toBe(true);
  });

  it("evaluates eligibility without allowing promotion execution", () => {
    const result = PromotionController.evaluateEligibility(baseEligibilityRequest());
    expect(result.promotionExecutable).toBe(false);
    expect(result.decision).toBe("PROMOTION_ELIGIBLE_AS_PROJECTION");
  });
});
