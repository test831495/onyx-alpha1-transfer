export type PromotionRiskClass = "R4" | "R5" | string;
export type PromotionOperationClass = string;
export type PromotionParallelSafetyClass = "PROTECTED_PROMOTION_ONLY" | string;
export type PromotionTargetEnvironment = string;
export type PromotionLaneStage = "S5_PROMOTE_ONE" | string;
export type PromotionMaterialChangeClassification =
  | "NO_CHANGE"
  | "NON_MATERIAL_METADATA_CHANGE"
  | "MATERIAL_CHANGE"
  | "NEW_APPROVAL_REQUIRED"
  | "NEW_CANDIDATE_VERSION_REQUIRED"
  | "RECONCILIATION_REQUIRED"
  | "PROHIBITED";

export interface PromotionCandidate {
  promotionCandidateId: string;
  schedulerRunId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  sourceTaskReferenceIds: readonly string[];
  sourceArtifactIds: readonly string[];
  sourceCheckpointIds: readonly string[];
  sourceCheckpointDigests: readonly string[];
  sourceContractVersions: readonly string[];
  sourceEvidenceArtifactIds: readonly string[];
  validationEvidenceArtifactIds: readonly string[];
  predecessorRegressionEvidenceArtifactIds: readonly string[];
  securityEvidenceArtifactIds: readonly string[];
  secretScanEvidenceArtifactIds: readonly string[];
  accessibilityEvidenceArtifactIds: readonly string[];
  budgetEvidenceArtifactIds: readonly string[];
  costEvidenceArtifactIds: readonly string[];
  rollbackPlanReferenceId: string;
  recoveryPlanReferenceId: string;
  reconciliationRecordIds: readonly string[];
  approvalId: string;
  approvalPolicyVersion: string;
  approvedScopeHash: string;
  currentScopeHash: string;
  approvalExpiresAt: string;
  evaluatedAt: string;
  riskClass: PromotionRiskClass;
  operationClass: PromotionOperationClass;
  parallelSafetyClass: PromotionParallelSafetyClass;
  targetEnvironment: PromotionTargetEnvironment;
  targetBranchReference: string;
  promotionLockResourceKey: string;
  promotionLaneStage: PromotionLaneStage;
  promotionLaneLimit: number;
  materialChangeDetected: boolean;
  candidateVersion: number;
  supersedesCandidateId: string;
  createdAt: string;
  contractVersion: string;
  evidenceArtifactIds: readonly string[];
}

export interface PromotionCandidateValidationResult {
  valid: boolean;
  denialReasons: readonly string[];
  candidateId: string;
  contractVersion: string;
}

export const PROMOTION_CANDIDATE_CLASSIFICATIONS: readonly PromotionMaterialChangeClassification[] = [
  "NO_CHANGE",
  "NON_MATERIAL_METADATA_CHANGE",
  "MATERIAL_CHANGE",
  "NEW_APPROVAL_REQUIRED",
  "NEW_CANDIDATE_VERSION_REQUIRED",
  "RECONCILIATION_REQUIRED",
  "PROHIBITED",
] as const;

export function classifyMaterialChange(candidate: Pick<PromotionCandidate, "sourceTaskReferenceIds" | "sourceArtifactIds" | "sourceCheckpointIds" | "sourceContractVersions" | "currentScopeHash" | "approvedScopeHash" | "riskClass" | "approvalPolicyVersion" | "targetEnvironment" | "materialChangeDetected" | "candidateVersion">): PromotionMaterialChangeClassification {
  const sourceTaskCount = candidate.sourceTaskReferenceIds.length;
  const sourceArtifactCount = candidate.sourceArtifactIds.length;
  const sourceCheckpointCount = candidate.sourceCheckpointIds.length;
  const contractVersionsPresent = candidate.sourceContractVersions.length > 0;
  if (!sourceTaskCount || !sourceArtifactCount || !sourceCheckpointCount || !contractVersionsPresent) return "PROHIBITED";
  if (candidate.materialChangeDetected) return "MATERIAL_CHANGE";
  if (candidate.approvedScopeHash !== candidate.currentScopeHash) return "NEW_APPROVAL_REQUIRED";
  if (candidate.candidateVersion <= 0) return "NEW_CANDIDATE_VERSION_REQUIRED";
  if (candidate.riskClass === "R5") return "PROHIBITED";
  if (candidate.targetEnvironment.trim().length === 0) return "RECONCILIATION_REQUIRED";
  return "NO_CHANGE";
}
