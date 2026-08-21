export const PROMOTION_LANE_LIMIT = 1 as const;

export const PROMOTION_LANE_STATES = [
  "QUEUED",
  "LEASE_ACQUIRED",
  "VALIDATING",
  "AWAITING_FRESH_APPROVAL",
  "APPROVED",
  "EXECUTING",
  "COMPLETED",
  "FAILED_SAFE",
  "EXPIRED",
  "RECONCILIATION_REQUIRED",
] as const;
export type PromotionLaneState = (typeof PROMOTION_LANE_STATES)[number];

export interface ProtectedPromotionLane {
  promotionLaneId: string;
  workflowId: string;
  runtimeId: string;
  laneLimit: number;
  eligibleTaskClasses: string[];
  requiredApproval: string;
  requiredRiskClass: "R4";
  requiredJoinBarriers: string[];
  requiredEvidence: string[];
  requiredValidation: string[];
  requiredSecurityReview: string;
  requiredRollbackPlan: string;
  requiredRecoveryPlan: string;
  activeLease: string;
  queueOrder: number;
  releasePolicy: string;
  status: PromotionLaneState;
  createdAt: string;
  updatedAt: string;
  contractVersion: string;
  approvalScopeHash: string;
  workflowIdExact: string;
  targetEnvironment: string;
  externalSystemScope: string;
  evidenceComplete: boolean;
  validationComplete: boolean;
  securityReviewComplete: boolean;
  rollbackPlanComplete: boolean;
  recoveryPlanComplete: boolean;
  joinsComplete: boolean;
  approvalFresh: boolean;
  approvalValid: boolean;
  approvalExpiresAt: string;
  scopeHashMatches: boolean;
  exactWorkflowMatch: boolean;
  exactEnvironmentMatch: boolean;
  exactExternalSystemScopeMatch: boolean;
  approvalNotExpired: boolean;
  materialChangeAbsent: boolean;
  riskClassAllowed: boolean;
  activeRuntimeLimitOne: boolean;
  mergeAllowed: false;
  productionDeployAllowed: false;
  forcePushAllowed: false;
  branchDeletionAllowed: false;
  secretAccessAllowed: false;
  permissionChangeAllowed: false;
  liveConnectorMutationAllowed: false;
  paidActionAllowed: false;
}

export function createProtectedPromotionLane(input: Omit<ProtectedPromotionLane, "contractVersion" | "mergeAllowed" | "productionDeployAllowed" | "forcePushAllowed" | "branchDeletionAllowed" | "secretAccessAllowed" | "permissionChangeAllowed" | "liveConnectorMutationAllowed" | "paidActionAllowed"> & { contractVersion?: string }): ProtectedPromotionLane {
  if (!input.promotionLaneId || !input.workflowId || !input.runtimeId) {
    throw new Error("Promotion lane requires promotionLaneId, workflowId, and runtimeId.");
  }
  if (input.laneLimit !== PROMOTION_LANE_LIMIT) {
    throw new Error("Promotion lane limit must remain 1.");
  }
  if (input.requiredRiskClass !== "R4") {
    throw new Error("Protected promotion requires an R4 approval gate.");
  }
  return {
    ...input,
    laneLimit: PROMOTION_LANE_LIMIT,
    requiredRiskClass: "R4",
    contractVersion: input.contractVersion ?? "1.0.0",
    mergeAllowed: false,
    productionDeployAllowed: false,
    forcePushAllowed: false,
    branchDeletionAllowed: false,
    secretAccessAllowed: false,
    permissionChangeAllowed: false,
    liveConnectorMutationAllowed: false,
    paidActionAllowed: false,
  };
}

export function assertPromotionLanePrerequisites(lane: ProtectedPromotionLane): void {
  if (lane.laneLimit !== PROMOTION_LANE_LIMIT) {
    throw new Error("Protected promotion lane limit must remain 1.");
  }
  if (lane.requiredRiskClass !== "R4") {
    throw new Error("Protected promotion requires fresh R4 approval.");
  }
  if (!lane.approvalFresh || !lane.approvalValid || !lane.approvalNotExpired) {
    throw new Error("Protected promotion requires a fresh, valid, unexpired approval.");
  }
  if (!lane.scopeHashMatches || !lane.exactWorkflowMatch || !lane.exactEnvironmentMatch || !lane.exactExternalSystemScopeMatch) {
    throw new Error("Protected promotion requires exact workflow, environment, and external-system scope matching.");
  }
  if (!lane.evidenceComplete || !lane.validationComplete || !lane.securityReviewComplete || !lane.rollbackPlanComplete || !lane.recoveryPlanComplete || !lane.joinsComplete) {
    throw new Error("Protected promotion requires complete evidence, validation, security, and recovery prerequisites.");
  }
  if (!lane.riskClassAllowed || !lane.activeRuntimeLimitOne || !lane.materialChangeAbsent) {
    throw new Error("Protected promotion blocked by required governance checks.");
  }
  if (lane.mergeAllowed || lane.productionDeployAllowed || lane.forcePushAllowed || lane.branchDeletionAllowed || lane.secretAccessAllowed || lane.permissionChangeAllowed || lane.liveConnectorMutationAllowed || lane.paidActionAllowed) {
    throw new Error("Protected promotion lane must keep all live-write safety flags false.");
  }
}
