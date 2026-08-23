import { PHASE1A9_PROMOTION_CONTRACT_VERSION } from "../shared/versions";
import type { PromotionCandidate, PromotionCandidateValidationResult } from "./promotion-candidate";

export type PromotionDecisionValue =
  | "PROMOTION_ELIGIBLE_AS_PROJECTION"
  | "PROMOTION_BLOCKED"
  | "FRESH_APPROVAL_REQUIRED"
  | "EVIDENCE_INCOMPLETE"
  | "VALIDATION_INCOMPLETE"
  | "SECURITY_INCOMPLETE"
  | "ROLLBACK_INCOMPLETE"
  | "RECOVERY_INCOMPLETE"
  | "JOIN_INCOMPLETE"
  | "CHECKPOINT_INVALID"
  | "LOCK_UNAVAILABLE"
  | "BUDGET_INVALID"
  | "SCOPE_INVALID"
  | "PERMISSION_INVALID"
  | "MEMORY_BOUNDARY_INVALID"
  | "CONNECTOR_BOUNDARY_INVALID"
  | "CONTEXT_INVALID"
  | "REQUIRES_RECONCILIATION"
  | "FAILED_SAFE"
  | "PROHIBITED";

export type PromotionSerializationDecisionValue =
  | "ONE_CANDIDATE_SELECTED_AS_PROJECTION"
  | "NO_ELIGIBLE_CANDIDATE"
  | "CANDIDATES_QUEUED"
  | "REQUIRES_RECONCILIATION"
  | "PROHIBITED";

export interface PromotionEligibilityRequest {
  promotionDecisionId: string;
  promotionCandidateId: string;
  schedulerConfigId: string;
  laneControllerDecisionId: string;
  promotionLockDecisionId: string;
  checkpointDecisionIds: readonly string[];
  joinDecisionIds: readonly string[];
  cancellationDecisionIds: readonly string[];
  budgetDecisionIds: readonly string[];
  recoveryDecisionIds: readonly string[];
  approvalId: string;
  permissionDecisionId: string;
  memoryDecisionIds: readonly string[];
  connectorDecisionIds: readonly string[];
  contextDecisionIds: readonly string[];
  validationEvidenceArtifactIds: readonly string[];
  securityEvidenceArtifactIds: readonly string[];
  rollbackPlanReferenceId: string;
  recoveryPlanReferenceId: string;
  evidencePackageId: string;
  evidenceManifestId: string;
  requestedAt: string;
  contractVersion: string;
}

export interface PromotionEligibilityResult {
  promotionDecisionId: string;
  promotionCandidateId: string;
  decision: PromotionDecisionValue;
  candidateValid: boolean;
  approvalValid: boolean;
  scopeValid: boolean;
  laneValid: boolean;
  promotionLockEligible: boolean;
  checkpointsValid: boolean;
  joinsComplete: boolean;
  cancellationClear: boolean;
  budgetValid: boolean;
  recoveryClear: boolean;
  permissionsValid: boolean;
  memoryBoundaryValid: boolean;
  connectorBoundaryValid: boolean;
  contextValid: boolean;
  validationEvidenceComplete: boolean;
  securityEvidenceComplete: boolean;
  rollbackPlanPresent: boolean;
  recoveryPlanPresent: boolean;
  evidencePackageComplete: boolean;
  evidenceManifestComplete: boolean;
  promotionExecutable: false;
  freshApprovalRequired: boolean;
  reconciliationRequired: boolean;
  denialReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export interface PromotionSerializationDecision {
  promotionSerializationDecisionId: string;
  candidateIds: readonly string[];
  eligibleCandidateIds: readonly string[];
  blockedCandidateIds: readonly string[];
  reconciliationCandidateIds: readonly string[];
  selectedCandidateId: string;
  queuedCandidateIds: readonly string[];
  orderingReason: string;
  promotionLaneLimit: number;
  decision: PromotionSerializationDecisionValue;
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export interface PromotionCancellationDecision {
  candidateId: string;
  promotionDecisionId: string;
  scope: string;
  approval: string;
  promotionLockReference: string;
  checkpointLineage: readonly string[];
  evidencePackage: string;
  cancellationReason: string;
  externalEffectStatus: "NONE" | "KNOWN" | "UNKNOWN" | "UNCERTAIN";
  decision: "CANCELLATION_ELIGIBLE_AS_PROJECTION" | "ALREADY_CANCELLED" | "BLOCKED_BY_UNCERTAINTY" | "RECONCILIATION_REQUIRED" | "PROHIBITED";
  contractVersion: string;
}

export interface PromotionFailureProjection {
  promotionFailureDecisionId: string;
  promotionCandidateId: string;
  promotionDecisionId: string;
  failureClass: string;
  sourceTaskReferenceIds: readonly string[];
  sourceArtifactIds: readonly string[];
  sourceCheckpointIds: readonly string[];
  validationEvidenceArtifactIds: readonly string[];
  securityEvidenceArtifactIds: readonly string[];
  rollbackPlanReferenceId: string;
  recoveryPlanReferenceId: string;
  approvalId: string;
  scopeHash: string;
  targetEnvironment: string;
  remoteSideEffectStatus: "NONE" | "KNOWN" | "NOT_APPLIED" | "UNCERTAIN" | "UNKNOWN";
  providerOutcome: "SUCCESS" | "FAILURE" | "UNCERTAIN" | "UNKNOWN";
  idempotencyKey: string;
  recommendedDisposition: string;
  rollbackCandidate: string;
  recoveryCandidate: string;
  compensationCandidate: string;
  automaticRollbackPermitted: boolean;
  automaticRecoveryPermitted: boolean;
  automaticCompensationPermitted: boolean;
  promotionBlocked: boolean;
  mergeBlocked: boolean;
  deploymentBlocked: boolean;
  reconciliationRequired: boolean;
  RahulDecisionRequired: boolean;
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export class PromotionController {
  static validateCandidate(candidate: PromotionCandidate): PromotionCandidateValidationResult {
    const denialReasons: string[] = [];
    if (!candidate.promotionCandidateId) denialReasons.push("missing-candidate-id");
    if (!candidate.workflowId || !candidate.runtimeId || !candidate.runtimeSessionId) denialReasons.push("missing-workflow-or-runtime-identity");
    if (!candidate.sourceTaskReferenceIds.length) denialReasons.push("missing-source-task");
    if (!candidate.sourceArtifactIds.length) denialReasons.push("missing-source-artifact");
    if (!candidate.sourceCheckpointIds.length || !candidate.sourceCheckpointDigests.length) denialReasons.push("missing-checkpoint-lineage");
    if (!candidate.validationEvidenceArtifactIds.length) denialReasons.push("missing-validation-evidence");
    if (!candidate.predecessorRegressionEvidenceArtifactIds.length) denialReasons.push("missing-regression-evidence");
    if (!candidate.securityEvidenceArtifactIds.length) denialReasons.push("missing-security-evidence");
    if (!candidate.secretScanEvidenceArtifactIds.length) denialReasons.push("missing-secret-scan-evidence");
    if (!candidate.rollbackPlanReferenceId) denialReasons.push("missing-rollback-plan");
    if (!candidate.recoveryPlanReferenceId) denialReasons.push("missing-recovery-plan");
    if (!candidate.approvalId) denialReasons.push("missing-approval");
    if (candidate.riskClass === "R5") denialReasons.push("r5-prohibited");
    if (candidate.parallelSafetyClass !== "PROTECTED_PROMOTION_ONLY") denialReasons.push("wrong-parallel-safety-class");
    if (candidate.promotionLaneLimit > 1) denialReasons.push("promotion-lane-limit-invalid");
    if (candidate.approvalExpiresAt <= candidate.evaluatedAt) denialReasons.push("expired-approval");
    if (candidate.approvedScopeHash !== candidate.currentScopeHash) denialReasons.push("scope-mismatch");
    if (candidate.approvalPolicyVersion !== "1.0.0") denialReasons.push("policy-version-mismatch");
    if (candidate.targetEnvironment !== "LOCAL") denialReasons.push("target-mismatch");
    if (candidate.riskClass !== "R4") denialReasons.push("risk-class-other-than-r4");
    if (candidate.candidateVersion < 1) denialReasons.push("invalid-version");
    if (candidate.materialChangeDetected && candidate.candidateVersion === 1) denialReasons.push("material-change-under-old-approval");
    return {
      valid: denialReasons.length === 0,
      denialReasons,
      candidateId: candidate.promotionCandidateId,
      contractVersion: candidate.contractVersion || PHASE1A9_PROMOTION_CONTRACT_VERSION,
    };
  }

  static evaluateEligibility(request: PromotionEligibilityRequest): PromotionEligibilityResult {
    const candidateValid = request.promotionCandidateId.length > 0;
    const scopeValid = true;
    const approvalValid = request.approvalId.length > 0;
    const laneValid = true;
    const promotionLockEligible = request.promotionLockDecisionId.length > 0;
    const checkpointsValid = request.checkpointDecisionIds.length > 0;
    const joinsComplete = request.joinDecisionIds.length > 0;
    const cancellationClear = request.cancellationDecisionIds.length > 0;
    const budgetValid = request.budgetDecisionIds.length > 0;
    const recoveryClear = request.recoveryDecisionIds.length > 0;
    const permissionsValid = request.permissionDecisionId.length > 0;
    const memoryBoundaryValid = request.memoryDecisionIds.length > 0;
    const connectorBoundaryValid = request.connectorDecisionIds.length > 0;
    const contextValid = request.contextDecisionIds.length > 0;
    const validationEvidenceComplete = request.validationEvidenceArtifactIds.length > 0;
    const securityEvidenceComplete = request.securityEvidenceArtifactIds.length > 0;
    const rollbackPlanPresent = Boolean(request.rollbackPlanReferenceId);
    const recoveryPlanPresent = Boolean(request.recoveryPlanReferenceId);
    const evidencePackageComplete = Boolean(request.evidencePackageId);
    const evidenceManifestComplete = Boolean(request.evidenceManifestId);
    const freshApprovalRequired = false;
    const reconciliationRequired = false;
    const denialReasons: string[] = [];

    if (!candidateValid) denialReasons.push("candidate-invalid");
    if (!approvalValid) denialReasons.push("approval-invalid");
    if (!scopeValid) denialReasons.push("scope-invalid");
    if (!laneValid) denialReasons.push("lane-invalid");
    if (!promotionLockEligible) denialReasons.push("promotion-lock-unavailable");
    if (!checkpointsValid) denialReasons.push("checkpoints-invalid");
    if (!joinsComplete) denialReasons.push("join-incomplete");
    if (!cancellationClear) denialReasons.push("cancellation-not-clear");
    if (!budgetValid) denialReasons.push("budget-invalid");
    if (!recoveryClear) denialReasons.push("recovery-not-clear");
    if (!permissionsValid) denialReasons.push("permission-invalid");
    if (!memoryBoundaryValid) denialReasons.push("memory-boundary-invalid");
    if (!connectorBoundaryValid) denialReasons.push("connector-boundary-invalid");
    if (!contextValid) denialReasons.push("context-invalid");
    if (!validationEvidenceComplete) denialReasons.push("validation-evidence-incomplete");
    if (!securityEvidenceComplete) denialReasons.push("security-evidence-incomplete");
    if (!rollbackPlanPresent) denialReasons.push("rollback-plan-incomplete");
    if (!recoveryPlanPresent) denialReasons.push("recovery-plan-incomplete");
    if (!evidencePackageComplete) denialReasons.push("evidence-package-incomplete");
    if (!evidenceManifestComplete) denialReasons.push("evidence-manifest-incomplete");

    const decision: PromotionDecisionValue = denialReasons.length ? "PROMOTION_BLOCKED" : "PROMOTION_ELIGIBLE_AS_PROJECTION";
    return {
      promotionDecisionId: request.promotionDecisionId,
      promotionCandidateId: request.promotionCandidateId,
      decision,
      candidateValid,
      approvalValid,
      scopeValid,
      laneValid,
      promotionLockEligible,
      checkpointsValid,
      joinsComplete,
      cancellationClear,
      budgetValid,
      recoveryClear,
      permissionsValid,
      memoryBoundaryValid,
      connectorBoundaryValid,
      contextValid,
      validationEvidenceComplete,
      securityEvidenceComplete,
      rollbackPlanPresent,
      recoveryPlanPresent,
      evidencePackageComplete,
      evidenceManifestComplete,
      promotionExecutable: false,
      freshApprovalRequired,
      reconciliationRequired,
      denialReasons,
      evidenceArtifactIds: [...new Set([
        ...request.validationEvidenceArtifactIds,
        ...request.securityEvidenceArtifactIds,
      ])],
      evaluatedAt: request.requestedAt,
      contractVersion: request.contractVersion || PHASE1A9_PROMOTION_CONTRACT_VERSION,
    };
  }

  static evaluateSerialization(candidates: readonly PromotionCandidate[]): PromotionSerializationDecision {
    const sorted = [...candidates].sort((a, b) => a.promotionCandidateId.localeCompare(b.promotionCandidateId));
    const eligible = sorted.filter((candidate) => this.validateCandidate(candidate).valid);
    const selectedCandidateId = eligible[0]?.promotionCandidateId ?? "";
    const blockedCandidateIds = sorted.filter((candidate) => !this.validateCandidate(candidate).valid).map((candidate) => candidate.promotionCandidateId);
    const queuedCandidateIds = eligible.slice(1).map((candidate) => candidate.promotionCandidateId);
    const decision: PromotionSerializationDecisionValue = selectedCandidateId ? "ONE_CANDIDATE_SELECTED_AS_PROJECTION" : "NO_ELIGIBLE_CANDIDATE";
    return {
      promotionSerializationDecisionId: `1a9:promotion-serialization:${selectedCandidateId || "none"}`,
      candidateIds: sorted.map((candidate) => candidate.promotionCandidateId),
      eligibleCandidateIds: eligible.map((candidate) => candidate.promotionCandidateId),
      blockedCandidateIds,
      reconciliationCandidateIds: [],
      selectedCandidateId,
      queuedCandidateIds,
      orderingReason: "stable-candidate-ordering-after-governance-validation",
      promotionLaneLimit: 1,
      decision,
      evidenceArtifactIds: eligible.flatMap((candidate) => candidate.evidenceArtifactIds),
      evaluatedAt: new Date().toISOString(),
      contractVersion: PHASE1A9_PROMOTION_CONTRACT_VERSION,
    };
  }

  static projectCancellation(input: PromotionCancellationDecision): PromotionCancellationDecision {
    return {
      ...input,
      contractVersion: input.contractVersion || PHASE1A9_PROMOTION_CONTRACT_VERSION,
      decision: input.externalEffectStatus === "UNCERTAIN" ? "RECONCILIATION_REQUIRED" : "CANCELLATION_ELIGIBLE_AS_PROJECTION",
    };
  }

  static projectFailure(input: PromotionFailureProjection): PromotionFailureProjection {
    return {
      ...input,
      promotionBlocked: true,
      mergeBlocked: true,
      deploymentBlocked: true,
      automaticRollbackPermitted: false,
      automaticRecoveryPermitted: false,
      automaticCompensationPermitted: false,
      contractVersion: input.contractVersion || PHASE1A9_PROMOTION_CONTRACT_VERSION,
    };
  }
}
