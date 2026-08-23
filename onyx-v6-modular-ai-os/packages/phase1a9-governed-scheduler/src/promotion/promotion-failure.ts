export type PromotionFailureClass =
  | "PROMOTION_BLOCKED"
  | "VALIDATION_FAILED"
  | "SECURITY_FAILED"
  | "ROLLBACK_INCOMPLETE"
  | "RECOVERY_INCOMPLETE"
  | "RECONCILIATION_REQUIRED"
  | "FAILED_SAFE"
  | "PROHIBITED";

export interface PromotionFailureProjectionInput {
  promotionFailureDecisionId: string;
  promotionCandidateId: string;
  promotionDecisionId: string;
  failureClass: PromotionFailureClass | string;
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

export function projectPromotionFailure(input: PromotionFailureProjectionInput): PromotionFailureProjectionInput {
  return {
    ...input,
    promotionBlocked: true,
    mergeBlocked: true,
    deploymentBlocked: true,
    automaticRollbackPermitted: false,
    automaticRecoveryPermitted: false,
    automaticCompensationPermitted: false,
  };
}
