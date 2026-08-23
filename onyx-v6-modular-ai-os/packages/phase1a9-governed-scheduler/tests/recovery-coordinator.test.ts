import { describe, expect, it } from "vitest";
import {
  FAILURE_CLASSES,
  RECOVERY_DISPOSITIONS,
  evaluateRecoveryCoordinator,
  projectRecoveryFailureDisposition,
  type RecoveryCoordinatorRequest,
} from "../src";

const baseRequest = (overrides: Partial<RecoveryCoordinatorRequest> = {}): RecoveryCoordinatorRequest => ({
  recoveryDecisionId: "1a9:recovery:decision:1",
  schedulerRunId: "1a9:run:1",
  schedulerTaskReferenceId: "1a9:task-ref:1",
  taskId: "task-1",
  workflowId: "workflow-1",
  runtimeId: "runtime-1",
  runtimeSessionId: "session-1",
  failureClass: "LEASE_LOST",
  failureReferenceIds: ["ref-1"],
  currentWorkflowState: "RUNNING",
  currentRuntimeState: "ACTIVE",
  lastTrustedWorkflowState: "RUNNING",
  lastTrustedRuntimeState: "ACTIVE",
  leaseId: "lease-1",
  leaseGeneration: 2,
  heartbeatDecisionId: "hb-1",
  lockIds: [],
  lockDecisionIds: [],
  checkpointId: "cp-1",
  checkpointVersion: 3,
  checkpointDigest: "sha256:checkpoint-3",
  safeResumeDecisionId: "safe-resume-1",
  dependencyResolutionResultId: "dep-1",
  readySetDecisionId: "ready-1",
  laneControllerDecisionId: "lane-1",
  cancellationDecisionId: "cancel-1",
  joinDecisionId: "join-1",
  budgetDecisionId: "budget-1",
  budgetExhaustionDecisionId: "budget-exhaust-1",
  approvalId: "approval-1",
  approvalStatus: "VALID",
  permissionDecisionId: "perm-1",
  memoryAccessProfileId: "memory-1",
  memoryDecisionIds: [],
  connectorScopeIds: [],
  connectorDecisionIds: [],
  contextPackageId: "context-1",
  contextProvenanceDecisionId: "ctx-prov-1",
  poisoningDecisionId: "poison-1",
  tombstoneDecisionIds: [],
  councilRecommendationId: "council-1",
  councilDisagreementId: "council-disagree-1",
  savedDraftId: "draft-1",
  savedDraftVersionId: "draft-version-1",
  draftApprovalValid: true,
  promotionCandidateId: "promo-1",
  promotionDecisionId: "promo-decision-1",
  providerOutcome: "SUCCESS",
  remoteSideEffectStatus: "NOT_APPLIED",
  idempotencyKey: "idem-1",
  scopeHash: "scope-hash",
  targetEnvironment: "LOCAL",
  riskClass: "R2",
  operationClass: "NORMAL",
  parallelSafetyClass: "READ_ONLY_PARALLEL_SAFE",
  attemptNumber: 1,
  maximumAttempts: 3,
  requestedAt: "2026-08-21T00:00:00.000Z",
  contractVersion: "1.0.0",
  evidenceArtifactIds: ["evidence-1"],
  ...overrides,
});

describe("Wave 3C recovery coordinator contracts", () => {
  it("defines supported failure classes and recovery dispositions", () => {
    expect(FAILURE_CLASSES).toContain("LEASE_LOST");
    expect(FAILURE_CLASSES).toContain("WORKFLOW_STATE_DIVERGENCE");
    expect(RECOVERY_DISPOSITIONS).toContain("RESUME_CANDIDATE");
    expect(RECOVERY_DISPOSITIONS).toContain("ESCALATE_TO_RAHUL");
  });

  it("treats uncertain external effects as recovery-blocked with provider truth requirement", () => {
    const result = evaluateRecoveryCoordinator(baseRequest({ failureClass: "UNKNOWN_EXTERNAL_WRITE", providerOutcome: "UNKNOWN", remoteSideEffectStatus: "UNCERTAIN" }));
    expect(result.primaryDisposition).toBe("RECONCILE_PROVIDER_TRUTH");
    expect(result.providerTruthRequired).toBe(true);
    expect(result.automaticRetryPermitted).toBe(false);
    expect(result.reconciliationRequired).toBe(true);
  });

  it("returns a resume candidate for lease loss with valid local checkpoint and no uncertainty", () => {
    const result = evaluateRecoveryCoordinator(baseRequest({ failureClass: "LEASE_LOST", providerOutcome: "SUCCESS", remoteSideEffectStatus: "NOT_APPLIED", approvalStatus: "VALID", idempotencyKey: "idem-1" }));
    expect(result.primaryDisposition).toBe("RESUME_CANDIDATE");
    expect(result.automaticResumePermitted).toBe(true);
    expect(result.automaticRetryPermitted).toBe(false);
  });

  it("requires reconciliation when lease loss has uncertain effects", () => {
    const result = evaluateRecoveryCoordinator(baseRequest({ failureClass: "LEASE_LOST", remoteSideEffectStatus: "UNCERTAIN" }));
    expect(result.primaryDisposition).toBe("RECONCILE_PROVIDER_TRUTH");
    expect(result.reconciliationRequired).toBe(true);
    expect(result.automaticResumePermitted).toBe(false);
  });

  it("blocks continuation when approval is invalidated", () => {
    const result = evaluateRecoveryCoordinator(baseRequest({ failureClass: "APPROVAL_INVALIDATED", approvalStatus: "INVALIDATED" }));
    expect(result.primaryDisposition).toBe("RECONCILE_APPROVAL");
    expect(result.approvalRevalidationRequired).toBe(true);
    expect(result.classification).toBe("RECOVERY_BLOCKED");
  });

  it("escalates council disagreement requiring Rahul decision", () => {
    const result = evaluateRecoveryCoordinator(baseRequest({ failureClass: "COUNCIL_DECISION_REQUIRED", councilDisagreementId: "c-1" }));
    expect(result.primaryDisposition).toBe("ESCALATE_TO_RAHUL");
    expect(result.RahulDecisionRequired).toBe(true);
    expect(result.automaticRetryPermitted).toBe(false);
  });

  it("maps failure classes to deterministic recovery recommendations", () => {
    expect(projectRecoveryFailureDisposition("CHECKPOINT_CAS_CONFLICT").primaryDisposition).toBe("RELOAD_AND_REPLAN");
    expect(projectRecoveryFailureDisposition("BUDGET_HARD_STOP").primaryDisposition).toBe("CHECKPOINT_AND_STOP");
    expect(projectRecoveryFailureDisposition("WORKFLOW_STATE_DIVERGENCE").primaryDisposition).toBe("REDUCE_TO_S0");
    expect(projectRecoveryFailureDisposition("DRAFT_APPROVAL_INVALIDATED").primaryDisposition).toBe("REVALIDATE_DRAFT");
  });
});
