import { PHASE1A9_LANE_CONTRACT_VERSION } from "../shared/versions";
import type { LaneStage } from "../contracts/lane-stage";

export type LaneCapacityDecisionValue =
  | "CAPACITY_AVAILABLE"
  | "CAPACITY_EXHAUSTED"
  | "SERIALIZATION_REQUIRED"
  | "STAGE_NOT_AUTHORIZED"
  | "REDUCTION_REQUIRED"
  | "RECONCILIATION_REQUIRED"
  | "PROHIBITED";

export type TaskToLaneCompatibilityClassification =
  | "COMPATIBLE"
  | "COMPATIBLE_WITH_SERIALIZATION"
  | "CAPACITY_LIMITED"
  | "REQUIRES_APPROVAL"
  | "REQUIRES_RECONCILIATION"
  | "INCOMPATIBLE"
  | "PROHIBITED";

export type ResourceCollisionClassification =
  | "NO_COLLISION"
  | "READ_COMPATIBLE"
  | "DISJOINT_WRITE_COMPATIBLE"
  | "SERIALIZATION_REQUIRED"
  | "EXCLUSIVE_SCOPE_REQUIRED"
  | "REQUIRES_RECONCILIATION"
  | "PROHIBITED";

export type SafeReductionDecision = "NO_REDUCTION" | "REDUCE_TO_S4" | "REDUCE_TO_S0" | "STOP_AND_RECONCILE" | "PROHIBITED_CONTINUATION";

export interface LaneCapacityDecision {
  laneCapacityDecisionId: string;
  laneControllerEvaluationId: string;
  stage: LaneStage;
  configuredMaximum: number;
  governedEffectiveMaximum: number;
  activeCount: number;
  reservedCount: number;
  availableCount: number;
  candidateTaskReferenceIds: readonly string[];
  compatibleTaskReferenceIds: readonly string[];
  serializedTaskReferenceIds: readonly string[];
  selectedTaskReferenceIds: readonly string[];
  capacityLimitedTaskReferenceIds: readonly string[];
  blockedTaskReferenceIds: readonly string[];
  orderingReason: string;
  decision: LaneCapacityDecisionValue;
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export interface TaskToLaneCompatibilityInput {
  schedulerTaskReferenceId: string;
  operationClass: string;
  parallelSafetyClass: string;
  riskClass: string;
  resourceScopeIds: readonly string[];
  permissionProfileId: string;
  memoryAccessProfileId: string;
  connectorScopeIds: readonly string[];
  approvalId?: string;
  promotionRequired: boolean;
  requestedStage: LaneStage;
  scopeHash: string;
  evidenceReferences: readonly string[];
}

export interface TaskToLaneCompatibilityResult {
  schedulerTaskReferenceId: string;
  classification: TaskToLaneCompatibilityClassification;
  reasonCodes: readonly string[];
  evidenceReferences: readonly string[];
}

export interface ResourceCollisionInput {
  resourceKind: string;
  relation: string;
  scopeHash?: string;
}

export interface ResourceCollisionResult {
  resourceKind: string;
  classification: ResourceCollisionClassification;
  reasonCodes: readonly string[];
}

export function evaluateLaneCapacity(input: LaneCapacityDecision): LaneCapacityDecision {
  const selected = input.candidateTaskReferenceIds.slice(0, Math.min(input.availableCount, input.governedEffectiveMaximum, 1));
  const limited = input.candidateTaskReferenceIds.filter((id) => !selected.includes(id));
  const decision: LaneCapacityDecisionValue = input.governedEffectiveMaximum <= 0 ? "REDUCTION_REQUIRED" : selected.length > 0 ? "CAPACITY_AVAILABLE" : "CAPACITY_EXHAUSTED";
  return {
    ...input,
    compatibleTaskReferenceIds: input.compatibleTaskReferenceIds.length > 0 ? input.compatibleTaskReferenceIds : selected,
    serializedTaskReferenceIds: input.serializedTaskReferenceIds,
    selectedTaskReferenceIds: selected,
    capacityLimitedTaskReferenceIds: limited,
    blockedTaskReferenceIds: input.blockedTaskReferenceIds,
    decision,
    contractVersion: input.contractVersion || PHASE1A9_LANE_CONTRACT_VERSION,
  };
}

export function evaluateTaskToLaneCompatibility(input: TaskToLaneCompatibilityInput): TaskToLaneCompatibilityResult {
  if (!input.scopeHash || !input.scopeHash.trim()) {
    return { schedulerTaskReferenceId: input.schedulerTaskReferenceId, classification: "REQUIRES_RECONCILIATION", reasonCodes: ["missing-scope-hash"], evidenceReferences: input.evidenceReferences };
  }
  if (input.riskClass === "R5") return { schedulerTaskReferenceId: input.schedulerTaskReferenceId, classification: "PROHIBITED", reasonCodes: ["R5-is-prohibited"], evidenceReferences: input.evidenceReferences };
  if (input.parallelSafetyClass === "PROHIBITED") return { schedulerTaskReferenceId: input.schedulerTaskReferenceId, classification: "PROHIBITED", reasonCodes: ["parallel-safety-prohibited"], evidenceReferences: input.evidenceReferences };
  if (input.requestedStage === "S5_PROMOTE_ONE" && input.parallelSafetyClass !== "PROTECTED_PROMOTION_ONLY") {
    return { schedulerTaskReferenceId: input.schedulerTaskReferenceId, classification: "PROHIBITED", reasonCodes: ["promotion-ready-work-must-be-protected"], evidenceReferences: input.evidenceReferences };
  }
  if (input.parallelSafetyClass.startsWith("SEQUENTIAL_")) {
    return { schedulerTaskReferenceId: input.schedulerTaskReferenceId, classification: "COMPATIBLE_WITH_SERIALIZATION", reasonCodes: ["serialized-by-class"], evidenceReferences: input.evidenceReferences };
  }
  if (input.riskClass === "R4") {
    return { schedulerTaskReferenceId: input.schedulerTaskReferenceId, classification: "COMPATIBLE_WITH_SERIALIZATION", reasonCodes: ["R4-requires-serialized-review"], evidenceReferences: input.evidenceReferences };
  }
  if (!input.approvalId && input.requestedStage !== "S0_SINGLE" && input.promotionRequired) {
    return { schedulerTaskReferenceId: input.schedulerTaskReferenceId, classification: "REQUIRES_APPROVAL", reasonCodes: ["approval-required"], evidenceReferences: input.evidenceReferences };
  }
  if (input.parallelSafetyClass === "CONTEXT_RETRIEVAL_PARALLEL_CONDITIONAL" || input.parallelSafetyClass === "CONNECTOR_READ_PARALLEL_CONDITIONAL") {
    return { schedulerTaskReferenceId: input.schedulerTaskReferenceId, classification: "REQUIRES_RECONCILIATION", reasonCodes: ["conditional-parallel-safe-needs-governance-check"], evidenceReferences: input.evidenceReferences };
  }
  if (input.resourceScopeIds.length === 0) {
    return { schedulerTaskReferenceId: input.schedulerTaskReferenceId, classification: "REQUIRES_RECONCILIATION", reasonCodes: ["missing-resource-scope"], evidenceReferences: input.evidenceReferences };
  }
  return { schedulerTaskReferenceId: input.schedulerTaskReferenceId, classification: "COMPATIBLE", reasonCodes: ["no-gate-failure"], evidenceReferences: input.evidenceReferences };
}

export function evaluateResourceCollision(input: ResourceCollisionInput): ResourceCollisionResult {
  if (!input.scopeHash || !input.scopeHash.trim()) {
    return { resourceKind: input.resourceKind, classification: "REQUIRES_RECONCILIATION", reasonCodes: ["missing-resource-scope"] };
  }
  switch (input.relation) {
    case "unknown":
      return { resourceKind: input.resourceKind, classification: "REQUIRES_RECONCILIATION", reasonCodes: ["unknown-resource-relationship"] };
    case "shared":
      return { resourceKind: input.resourceKind, classification: "SERIALIZATION_REQUIRED", reasonCodes: ["shared-write-collision"] };
    case "read-compatible":
      return { resourceKind: input.resourceKind, classification: "READ_COMPATIBLE", reasonCodes: ["read-compatible"] };
    case "disjoint":
      return { resourceKind: input.resourceKind, classification: "DISJOINT_WRITE_COMPATIBLE", reasonCodes: ["disjoint-write-proof"] };
    case "exclusive":
      return { resourceKind: input.resourceKind, classification: "EXCLUSIVE_SCOPE_REQUIRED", reasonCodes: ["exclusive-scope-required"] };
    case "prohibited":
      return { resourceKind: input.resourceKind, classification: "PROHIBITED", reasonCodes: ["prohibited-resource-use"] };
    default:
      return { resourceKind: input.resourceKind, classification: "REQUIRES_RECONCILIATION", reasonCodes: ["unknown-resource-relationship"] };
  }
}

export function evaluateSafeReduction(input: {
  criticalAuthorityUncertainty?: boolean;
  stateDivergence?: boolean;
  checkpointConflict?: boolean;
  leaseOwnershipUncertainty?: boolean;
  lockUncertainty?: boolean;
  evidenceGap?: boolean;
  approvalScopeConflict?: boolean;
  permissionConflict?: boolean;
  memoryScopeConflict?: boolean;
  connectorAccountConflict?: boolean;
  budgetHardStop?: boolean;
  recoveryFailure?: boolean;
  reconciliationRequired?: boolean;
  securityFailure?: boolean;
  promotionConflict?: boolean;
  stabilizationCompatible?: boolean;
  policyConflict?: boolean;
  accessibilityReleaseBlocker?: boolean;
}): SafeReductionDecision {
  if (input.criticalAuthorityUncertainty || input.stateDivergence || input.checkpointConflict || input.leaseOwnershipUncertainty || input.lockUncertainty || input.evidenceGap || input.approvalScopeConflict || input.permissionConflict || input.memoryScopeConflict || input.connectorAccountConflict || input.budgetHardStop || input.recoveryFailure || input.reconciliationRequired || input.securityFailure || input.accessibilityReleaseBlocker || input.promotionConflict) {
    return "REDUCE_TO_S0";
  }
  if (input.stabilizationCompatible || input.policyConflict) {
    return "REDUCE_TO_S4";
  }
  return "NO_REDUCTION";
}
