import { LANE_MAXIMA, LANE_STAGES, type LaneStage } from "../contracts/lane-stage";
import { PHASE1A9_LANE_CONTRACT_VERSION } from "../shared/versions";

export type LaneControllerDecisionValue =
  | "ALLOWED_AS_PROJECTION"
  | "DENIED"
  | "REQUIRES_EVIDENCE"
  | "REQUIRES_APPROVAL"
  | "REQUIRES_STABILITY_PROOF"
  | "REQUIRES_RECONCILIATION"
  | "REDUCE_TO_S0"
  | "REDUCE_TO_S4"
  | "PROHIBITED";

export interface LaneControllerEvaluationRequest {
  laneControllerEvaluationId: string;
  schedulerConfigId: string;
  schedulerRunId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  currentStage: LaneStage;
  requestedStage: LaneStage;
  readySetDecisionId: string;
  candidateTaskReferenceIds: readonly string[];
  currentActiveLaneCount: number;
  currentReservedLaneCount: number;
  requestedLaneCount: number;
  availableLaneCount: number;
  stageEvidenceIds: readonly string[];
  stageApprovalId?: string;
  stabilityEvidenceIds: readonly string[];
  recoveryDispositionIds: readonly string[];
  reconciliationRecordIds: readonly string[];
  resourceConflictDecisionIds: readonly string[];
  permissionDecisionIds: readonly string[];
  memoryDecisionIds: readonly string[];
  connectorDecisionIds: readonly string[];
  budgetDecisionIds: readonly string[];
  scopeHash: string;
  evaluatedAt: string;
  contractVersion: string;
}

export interface LaneControllerEvaluationResult {
  laneControllerEvaluationId: string;
  schedulerConfigId: string;
  currentStage: LaneStage;
  requestedStage: LaneStage;
  configuredMaximum: number;
  effectiveMaximum: number;
  currentActiveLaneCount: number;
  requestedLaneCount: number;
  capacityAvailable: boolean;
  stageEligible: boolean;
  selectedTaskReferenceIds: readonly string[];
  capacityLimitedTaskReferenceIds: readonly string[];
  serializedTaskReferenceIds: readonly string[];
  blockedTaskReferenceIds: readonly string[];
  reconciliationTaskReferenceIds: readonly string[];
  promotionTaskReferenceIds: readonly string[];
  decision: LaneControllerDecisionValue;
  denialReasons: readonly string[];
  fallbackStage: LaneStage;
  reductionRequired: boolean;
  reductionReasonCodes: readonly string[];
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export interface LaneTransitionEvaluation {
  decision: LaneControllerDecisionValue;
  denialReasons: readonly string[];
  fallbackStage: LaneStage;
  evidenceArtifactIds: readonly string[];
}

const REQUIRED_S1_EVIDENCE = ["scheduler-acceptance", "shared-contracts-frozen", "isolated-fixtures", "collision-tests", "recovery-tests"];
const REQUIRED_S2_EVIDENCE = ["accepted-s1-evidence", "measured-throughput", "failure-recovery-evidence"];
const REQUIRED_S3_EVIDENCE = ["alpha-stability-evidence", "measured-contention", "no-regression"]; 

export function evaluateStageTransition(
  currentStage: LaneStage,
  requestedStage: LaneStage,
  evidenceIds: readonly string[],
  approvalId?: string,
  scopeHash?: string,
): LaneTransitionEvaluation {
  if (!(LANE_STAGES as readonly string[]).includes(currentStage)) {
    return { decision: "DENIED", denialReasons: ["Unknown current stage."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: [] };
  }
  if (!(LANE_STAGES as readonly string[]).includes(requestedStage)) {
    return { decision: "DENIED", denialReasons: ["Unknown requested stage."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: [] };
  }
  if (!scopeHash || !scopeHash.trim()) {
    return { decision: "DENIED", denialReasons: ["Material scope mismatch."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: [] };
  }

  if (requestedStage === "S0_SINGLE") {
    return {
      decision: currentStage === "S0_SINGLE" ? "ALLOWED_AS_PROJECTION" : "REDUCE_TO_S0",
      denialReasons: currentStage === "S0_SINGLE" ? [] : ["Safe reduction to S0 is required."],
      fallbackStage: "S0_SINGLE",
      evidenceArtifactIds: evidenceIds,
    };
  }

  if (requestedStage === "S1_FOUR") {
    if (currentStage !== "S0_SINGLE") return { decision: "DENIED", denialReasons: ["S1 requires a valid S0 baseline."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
    if (evidenceIds.length === 0) return { decision: "REQUIRES_EVIDENCE", denialReasons: ["S1 requires focused scheduler acceptance evidence."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
    return { decision: "ALLOWED_AS_PROJECTION", denialReasons: [], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
  }

  if (requestedStage === "S2_SIX") {
    if (currentStage !== "S1_FOUR") return { decision: "DENIED", denialReasons: ["S2 requires S1 authorization as the immediate predecessor stage."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
    if (evidenceIds.length === 0) return { decision: "REQUIRES_EVIDENCE", denialReasons: ["S2 requires accepted S1 evidence and measured throughput evidence."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
    if (!approvalId || approvalId.length === 0) return { decision: "REQUIRES_APPROVAL", denialReasons: ["S2 requires explicit Rahul approval for the exact stage and scope."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
    return { decision: "ALLOWED_AS_PROJECTION", denialReasons: [], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
  }

  if (requestedStage === "S3_EIGHT") {
    if (currentStage !== "S2_SIX") return { decision: "DENIED", denialReasons: ["S3 requires S2 as the immediate predecessor stage."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
    if (evidenceIds.length === 0) return { decision: "REQUIRES_STABILITY_PROOF", denialReasons: ["S3 requires alpha-stability evidence."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
    if (!approvalId || approvalId.length === 0) return { decision: "REQUIRES_APPROVAL", denialReasons: ["S3 requires explicit Rahul approval."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
    return { decision: "ALLOWED_AS_PROJECTION", denialReasons: [], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
  }

  if (requestedStage === "S4_STABILIZE_TWO") {
    if (currentStage === "S0_SINGLE") return { decision: "ALLOWED_AS_PROJECTION", denialReasons: [], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
    if (["S1_FOUR", "S2_SIX", "S3_EIGHT"].includes(currentStage)) return { decision: "REDUCE_TO_S4", denialReasons: ["Stabilization recommendation only."], fallbackStage: "S4_STABILIZE_TWO", evidenceArtifactIds: evidenceIds };
    return { decision: "DENIED", denialReasons: ["S4 is a reduction and stabilization stage only."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
  }

  if (requestedStage === "S5_PROMOTE_ONE") {
    if (currentStage !== "S4_STABILIZE_TWO") {
      return { decision: "DENIED", denialReasons: ["S5 requires a governed promotion path from S4."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
    }
    if (!approvalId || !approvalId.includes("R4") && !approvalId.includes("promotion")) {
      return { decision: "REQUIRES_APPROVAL", denialReasons: ["Promotion requires fresh R4 Rahul approval for the exact scope."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
    }
    return { decision: "ALLOWED_AS_PROJECTION", denialReasons: [], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
  }

  return { decision: "DENIED", denialReasons: ["Unknown or unsupported stage transition."], fallbackStage: "S0_SINGLE", evidenceArtifactIds: evidenceIds };
}

export function evaluateLaneController(request: LaneControllerEvaluationRequest): LaneControllerEvaluationResult {
  const transition = evaluateStageTransition(
    request.currentStage,
    request.requestedStage,
    request.stageEvidenceIds,
    request.stageApprovalId,
    request.scopeHash,
  );
  const selected = request.candidateTaskReferenceIds.slice(0, Math.min(request.availableLaneCount, 1));
  const limited = request.candidateTaskReferenceIds.slice(selected.length);
  const stageEligible = transition.decision === "ALLOWED_AS_PROJECTION";
  const configuredMaximum = LANE_MAXIMA[request.currentStage] ?? 1;
  const effectiveMaximum = 1;
  return {
    laneControllerEvaluationId: request.laneControllerEvaluationId,
    schedulerConfigId: request.schedulerConfigId,
    currentStage: request.currentStage,
    requestedStage: request.requestedStage,
    configuredMaximum,
    effectiveMaximum,
    currentActiveLaneCount: request.currentActiveLaneCount,
    requestedLaneCount: request.requestedLaneCount,
    capacityAvailable: request.availableLaneCount > 0,
    stageEligible,
    selectedTaskReferenceIds: selected,
    capacityLimitedTaskReferenceIds: limited,
    serializedTaskReferenceIds: [],
    blockedTaskReferenceIds: [],
    reconciliationTaskReferenceIds: request.reconciliationRecordIds,
    promotionTaskReferenceIds: request.requestedStage === "S5_PROMOTE_ONE" ? request.candidateTaskReferenceIds : [],
    decision: transition.decision,
    denialReasons: transition.denialReasons,
    fallbackStage: transition.fallbackStage,
    reductionRequired: transition.decision === "REDUCE_TO_S0" || transition.decision === "REDUCE_TO_S4",
    reductionReasonCodes: transition.decision === "REDUCE_TO_S0" ? ["CRITICAL_UNCERTAINTY"] : transition.decision === "REDUCE_TO_S4" ? ["STABILIZATION"] : [],
    evidenceArtifactIds: transition.evidenceArtifactIds,
    evaluatedAt: request.evaluatedAt,
    contractVersion: request.contractVersion || PHASE1A9_LANE_CONTRACT_VERSION,
  };
}
