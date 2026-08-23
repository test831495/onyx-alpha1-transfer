import type { ModelRoutingClass, ModelRoutingProfileContract, PrivacyRequirement, DataResidencyRequirement } from "@onyx/phase1a8-governed-contracts";
import type { ParallelSafetyClass, RiskClass } from "@onyx/phase1a8-governed-contracts";
import { PHASE1A9_SCHEDULER_CONTRACT_VERSION } from "../shared/versions";

export const BUDGET_TYPES = ["TIME", "TOKENS", "MODEL_CLASS", "API_CALLS", "MONEY", "ATTEMPTS", "EVIDENCE_STORAGE", "LANE_CAPACITY"] as const;
export type BudgetType = (typeof BUDGET_TYPES)[number];
export const BUDGET_DECISION_VALUES = ["WITHIN_BUDGET", "WITHIN_BUDGET_WITH_WARNING", "RESERVATION_ELIGIBLE_AS_PROJECTION", "CONSUMPTION_ELIGIBLE_AS_PROJECTION", "FALLBACK_REQUIRED", "APPROVAL_REQUIRED", "HARD_STOP", "EXHAUSTED", "REQUIRES_RECONCILIATION", "FAILED_SAFE", "PROHIBITED"] as const;
export type BudgetDecision = (typeof BUDGET_DECISION_VALUES)[number];
type OperationClass = string;

export interface BudgetMeasure { budgetType: BudgetType; budgetId: string; unit: string; consumed: number; reserved: number; estimated: number; warningThreshold: number; hardLimit: number; }
export interface BudgetGovernorRequest {
  budgetDecisionId: string; schedulerRunId: string; schedulerTaskReferenceId: string; taskId: string; workflowId: string; runtimeId: string; runtimeSessionId: string; agentId: string; leaseId: string; leaseGeneration: number; laneStage: string; operationClass: OperationClass; parallelSafetyClass: ParallelSafetyClass; riskClass: RiskClass;
  timeBudgetId: string; tokenBudgetId: string; costBudgetId: string; modelRoutingProfileId: string; apiCallBudgetId: string; attemptBudgetId: string; evidenceBudgetId: string; laneCapacityBudgetId: string;
  reservedTime: number; estimatedTime: number; consumedTime: number; reservedTokens: number; estimatedTokens: number; consumedTokens: number; reservedCost: number; estimatedCost: number; consumedCost: number; reservedApiCalls: number; estimatedApiCalls: number; consumedApiCalls: number; reservedAttempts: number; consumedAttempts: number; reservedEvidenceBytes: number; estimatedEvidenceBytes: number; consumedEvidenceBytes: number; requestedModelClass: ModelRoutingClass; requestedLaneCapacity: number; approvalId: string; permissionDecisionId: string; memoryAccessProfileId: string; connectorScopeIds: readonly string[]; contextPackageId: string; scopeHash: string; requestedAt: string; contractVersion: string; evidenceArtifactIds: readonly string[];
}
export interface BudgetTypeDecision { budgetType: BudgetType; budgetId: string; unit: string; consumed: number; reserved: number; estimated: number; remaining: number; warning: boolean; hardStop: boolean; decision: BudgetDecision; reason: string; evidenceArtifactIds: readonly string[]; }
export interface BudgetGovernorResult { budgetDecisionId: string; schedulerTaskReferenceId: string; taskId: string; workflowId: string; decision: BudgetDecision; budgetTypeDecisions: readonly BudgetTypeDecision[]; warningBudgetIds: readonly string[]; hardStopBudgetIds: readonly string[]; reservationEligible: boolean; consumptionEligible: boolean; fallbackRequired: boolean; approvalRequired: boolean; approvalId: string; selectedModelClass: ModelRoutingClass | null; fallbackModelClasses: readonly ModelRoutingClass[]; selectedLaneCapacity: number; remainingTime: number; remainingTokens: number; remainingCost: number; remainingApiCalls: number; remainingAttempts: number; remainingEvidenceBytes: number; denialReasons: readonly string[]; recoveryDisposition: string; reconciliationRequired: boolean; evidenceArtifactIds: readonly string[]; evaluatedAt: string; contractVersion: string; }
export const APPROVAL_DECISION_VALUES = ["APPROVAL_VALID_AS_PROJECTION", "APPROVAL_REQUIRED", "DENIED_MISSING_APPROVAL", "DENIED_EXPIRED_APPROVAL", "DENIED_SCOPE_MISMATCH", "DENIED_MODEL_CLASS", "DENIED_TOKEN_BOUNDARY", "DENIED_COST_BOUNDARY", "DENIED_POLICY_VERSION", "DENIED_MATERIAL_CHANGE", "DENIED_RISK_CLASS", "PROHIBITED"] as const;
export type ApprovalBoundaryDecision = (typeof APPROVAL_DECISION_VALUES)[number];
export interface ApprovalBoundaryEvaluation {
  approvalId: string;
  approvalStatus: string;
  decision: ApprovalBoundaryDecision;
  approvalValid: boolean;
  approvalRequired: boolean;
  scopeValid: boolean;
  modelClassValid: boolean;
  tokenBoundaryValid: boolean;
  costBoundaryValid: boolean;
  policyVersionValid: boolean;
  materialChangeValid: boolean;
  riskClassValid: boolean;
  denialReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}
export interface EvidenceStoragePressureInput {
  mandatoryEvidenceBytes: number;
  optionalEvidenceBytes: number;
  duplicateOptionalEvidenceBytes: number;
  reservedEvidenceBytes: number;
  consumedEvidenceBytes: number;
  hardLimitBytes: number;
  warningThresholdBytes: number;
  requiredEvidenceArtifactIds: readonly string[];
  optionalEvidenceArtifactIds: readonly string[];
  provenanceReferenceIds: readonly string[];
  auditReferenceIds: readonly string[];
  redactionDecisionIds: readonly string[];
  evaluatedAt: string;
}
export type EvidenceStorageDecision = "WITHIN_EVIDENCE_BUDGET" | "WARNING" | "OPTIONAL_DUPLICATE_REDUCTION_CANDIDATE" | "MANDATORY_EVIDENCE_OVERFLOW" | "COMPLETION_BLOCKED" | "REQUIRES_RECONCILIATION" | "PROHIBITED";
export interface EvidenceStoragePressureResult {
  decision: EvidenceStorageDecision;
  evidenceArtifactIds: readonly string[];
  provenanceReferenceIds: readonly string[];
  auditReferenceIds: readonly string[];
  redactionDecisionIds: readonly string[];
  mandatoryEvidenceBytes: number;
  optionalEvidenceBytes: number;
  duplicateOptionalEvidenceBytes: number;
  reservedEvidenceBytes: number;
  consumedEvidenceBytes: number;
  hardLimitBytes: number;
  warningThresholdBytes: number;
  requiredEvidenceArtifactIds: readonly string[];
  optionalEvidenceArtifactIds: readonly string[];
  noMutationOccurred: boolean;
  evaluatedAt: string;
  contractVersion: string;
}

const finite = (value: number, name: string, integral = false): void => { if (!Number.isFinite(value) || value < 0 || (integral && !Number.isInteger(value))) throw new Error(`Invalid ${name}.`); };
const indexed = (values: readonly number[], index: number): number => values[index] ?? 0;
const decisionAt = (decisions: readonly BudgetTypeDecision[], index: number): BudgetTypeDecision => decisions[index] ?? { budgetType: "TIME", budgetId: "", unit: "milliseconds", consumed: 0, reserved: 0, estimated: 0, remaining: 0, warning: false, hardStop: true, decision: "FAILED_SAFE", reason: "missing-budget-decision", evidenceArtifactIds: [] };
export function validateBudgetMeasure(measure: BudgetMeasure): void {
  if (!BUDGET_TYPES.includes(measure.budgetType) || !measure.budgetId || !measure.unit) throw new Error("Budget type, identifier, and unit are required.");
  const integral = measure.budgetType === "API_CALLS" || measure.budgetType === "ATTEMPTS" || measure.budgetType === "LANE_CAPACITY";
  for (const [name, value] of Object.entries(measure)) if (typeof value === "number") finite(value, name, integral);
  if (measure.warningThreshold > measure.hardLimit || measure.reserved > measure.hardLimit || measure.consumed + measure.reserved + measure.estimated > measure.hardLimit) throw new Error("Budget threshold or projection exceeds hard limit.");
}
export function evaluateBudgetMeasure(measure: BudgetMeasure, evidenceArtifactIds: readonly string[]): BudgetTypeDecision {
  validateBudgetMeasure(measure);
  const remaining = measure.hardLimit - measure.consumed - measure.reserved;
  if (measure.consumed + measure.reserved >= measure.hardLimit) return { ...measure, remaining, warning: false, hardStop: true, decision: "HARD_STOP", reason: "hard-limit-exhausted", evidenceArtifactIds };
  if (measure.consumed + measure.reserved + measure.estimated > measure.hardLimit) return { ...measure, remaining, warning: false, hardStop: true, decision: "HARD_STOP", reason: "estimate-reaches-hard-limit", evidenceArtifactIds };
  const warning = measure.consumed + measure.reserved + measure.estimated >= measure.warningThreshold;
  return { ...measure, remaining, warning, hardStop: false, decision: warning ? "WITHIN_BUDGET_WITH_WARNING" : "WITHIN_BUDGET", reason: warning ? "warning-threshold-reached" : "below-warning-threshold", evidenceArtifactIds };
}
export function evaluateBudgetGovernor(request: BudgetGovernorRequest, evaluatedAt: string): BudgetGovernorResult {
  if (!request.evidenceArtifactIds.length || !request.scopeHash) throw new Error("Budget evaluation requires evidence and scope.");
  const measures: BudgetMeasure[] = [
    { budgetType: "TIME", budgetId: request.timeBudgetId, unit: "milliseconds", consumed: request.consumedTime, reserved: request.reservedTime, estimated: request.estimatedTime, warningThreshold: request.reservedTime + request.estimatedTime, hardLimit: request.reservedTime + request.estimatedTime + Math.max(request.estimatedTime, 1) },
    { budgetType: "TOKENS", budgetId: request.tokenBudgetId, unit: "tokens", consumed: request.consumedTokens, reserved: request.reservedTokens, estimated: request.estimatedTokens, warningThreshold: request.reservedTokens + request.estimatedTokens, hardLimit: request.reservedTokens + request.estimatedTokens + Math.max(request.estimatedTokens, 1) },
    { budgetType: "MONEY", budgetId: request.costBudgetId, unit: "smallest-currency-unit", consumed: request.consumedCost, reserved: request.reservedCost, estimated: request.estimatedCost, warningThreshold: request.reservedCost + request.estimatedCost, hardLimit: request.reservedCost + request.estimatedCost + Math.max(request.estimatedCost, 1) },
    { budgetType: "API_CALLS", budgetId: request.apiCallBudgetId, unit: "calls", consumed: request.consumedApiCalls, reserved: request.reservedApiCalls, estimated: request.estimatedApiCalls, warningThreshold: request.reservedApiCalls + request.estimatedApiCalls, hardLimit: request.reservedApiCalls + request.estimatedApiCalls + 1 },
    { budgetType: "ATTEMPTS", budgetId: request.attemptBudgetId, unit: "attempts", consumed: request.consumedAttempts, reserved: request.reservedAttempts, estimated: 0, warningThreshold: request.consumedAttempts + 1, hardLimit: request.consumedAttempts + 1 },
    { budgetType: "EVIDENCE_STORAGE", budgetId: request.evidenceBudgetId, unit: "bytes", consumed: request.consumedEvidenceBytes, reserved: request.reservedEvidenceBytes, estimated: request.estimatedEvidenceBytes, warningThreshold: request.reservedEvidenceBytes + request.estimatedEvidenceBytes, hardLimit: request.reservedEvidenceBytes + request.estimatedEvidenceBytes + Math.max(request.estimatedEvidenceBytes, 1) },
    { budgetType: "LANE_CAPACITY", budgetId: request.laneCapacityBudgetId, unit: "lanes", consumed: 0, reserved: 0, estimated: request.requestedLaneCapacity, warningThreshold: 1, hardLimit: 1 },
  ];
  const decisions = measures.map((measure) => evaluateBudgetMeasure(measure, request.evidenceArtifactIds));
  const hardStops = decisions.filter((item) => item.hardStop).map((item) => item.budgetId);
  const warnings = decisions.filter((item) => item.warning).map((item) => item.budgetId);
  const laneDenied = request.requestedLaneCapacity > 1;
  if (laneDenied) hardStops.push(request.laneCapacityBudgetId);
  const decision = hardStops.length ? (request.requestedLaneCapacity > 1 ? "HARD_STOP" : "EXHAUSTED") : warnings.length ? "WITHIN_BUDGET_WITH_WARNING" : "WITHIN_BUDGET";
  return { budgetDecisionId: request.budgetDecisionId, schedulerTaskReferenceId: request.schedulerTaskReferenceId, taskId: request.taskId, workflowId: request.workflowId, decision, budgetTypeDecisions: decisions, warningBudgetIds: warnings, hardStopBudgetIds: hardStops, reservationEligible: !hardStops.length, consumptionEligible: !hardStops.length, fallbackRequired: hardStops.includes(request.tokenBudgetId), approvalRequired: request.riskClass === "R4" || request.requestedModelClass === "CLOUD_PREMIUM", approvalId: request.approvalId, selectedModelClass: hardStops.length ? null : request.requestedModelClass, fallbackModelClasses: [], selectedLaneCapacity: laneDenied ? 0 : 1, remainingTime: decisionAt(decisions, 0).remaining, remainingTokens: decisionAt(decisions, 1).remaining, remainingCost: decisionAt(decisions, 2).remaining, remainingApiCalls: decisionAt(decisions, 3).remaining, remainingAttempts: decisionAt(decisions, 4).remaining, remainingEvidenceBytes: decisionAt(decisions, 5).remaining, denialReasons: laneDenied ? ["S0_SINGLE-allows-one-lane"] : [], recoveryDisposition: hardStops.length ? "CHECKPOINT_AND_STOP" : "CONTINUE_WITH_WARNING", reconciliationRequired: false, evidenceArtifactIds: request.evidenceArtifactIds, evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
}

export interface BudgetReservationProjection { budgetReservationDecisionId: string; budgetDecisionId: string; schedulerTaskReferenceId: string; budgetIds: readonly string[]; requestedReservations: readonly number[]; existingReservations: readonly number[]; remainingBefore: readonly number[]; remainingAfterProjection: readonly number[]; reservationDecision: "RESERVATION_ELIGIBLE_AS_PROJECTION" | "PARTIAL_RESERVATION_REQUIRES_REPLAN" | "DENIED_INSUFFICIENT_BUDGET" | "DENIED_APPROVAL" | "DENIED_SCOPE" | "DENIED_PERMISSION" | "DENIED_MEMORY_SCOPE" | "DENIED_CONNECTOR_SCOPE" | "REQUIRES_RECONCILIATION" | "PROHIBITED"; expiryReference: string; releaseRequirement: string; approvalId: string; scopeHash: string; evidenceArtifactIds: readonly string[]; evaluatedAt: string; contractVersion: string; }
export function projectBudgetReservation(input: Omit<BudgetReservationProjection, "remainingAfterProjection" | "contractVersion">): BudgetReservationProjection { if (!input.scopeHash || !input.evidenceArtifactIds.length) throw new Error("Reservation projection requires scope and evidence."); const remainingAfterProjection = input.remainingBefore.map((value, index) => value - indexed(input.requestedReservations, index)); if (remainingAfterProjection.some((value) => value < 0) && input.reservationDecision === "RESERVATION_ELIGIBLE_AS_PROJECTION") throw new Error("Insufficient budget cannot be eligible."); return { ...input, remainingAfterProjection, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION }; }
export interface BudgetConsumptionProjection { budgetConsumptionDecisionId: string; budgetDecisionId: string; schedulerTaskReferenceId: string; budgetIds: readonly string[]; reservedAmounts: readonly number[]; reportedConsumption: readonly number[]; remainingBefore: readonly number[]; remainingAfterProjection: readonly number[]; consumptionDecision: "CONSUMPTION_ELIGIBLE_AS_PROJECTION" | "REQUIRES_RECONCILIATION" | "HARD_STOP"; overageDetected: boolean; hardStopTriggered: boolean; reconciliationRequired: boolean; evidenceArtifactIds: readonly string[]; evaluatedAt: string; contractVersion: string; }
export function projectBudgetConsumption(input: Omit<BudgetConsumptionProjection, "remainingAfterProjection" | "contractVersion" | "consumptionDecision">): BudgetConsumptionProjection { const overageDetected = input.reportedConsumption.some((value, index) => value > indexed(input.reservedAmounts, index)); const remainingAfterProjection = input.remainingBefore.map((value, index) => value - indexed(input.reportedConsumption, index)); const hardStopTriggered = remainingAfterProjection.some((value) => value < 0); return { ...input, remainingAfterProjection, overageDetected, hardStopTriggered, reconciliationRequired: input.reconciliationRequired || overageDetected, consumptionDecision: hardStopTriggered ? "HARD_STOP" : overageDetected ? "REQUIRES_RECONCILIATION" : "CONSUMPTION_ELIGIBLE_AS_PROJECTION", contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION }; }
export interface BudgetReleaseProjection { releaseDecisionId: string; budgetDecisionId: string; schedulerTaskReferenceId: string; workflowId: string; budgetIds: readonly string[]; reservationDecisionId: string; releasedAmounts: readonly number[]; terminalDisposition: "TERMINAL" | "GOVERNED_CANCELLATION"; consumedEvidenceArtifactIds: readonly string[]; scopeHash: string; eligible: boolean; evaluatedAt: string; contractVersion: string; }
export function projectBudgetRelease(input: Omit<BudgetReleaseProjection, "eligible" | "contractVersion">): BudgetReleaseProjection { const eligible = Boolean(input.schedulerTaskReferenceId && input.workflowId && input.budgetIds.length && input.reservationDecisionId && input.scopeHash && input.consumedEvidenceArtifactIds.length); return { ...input, eligible, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION }; }

export function evaluateApprovalBoundary(input: {
  approvalId: string;
  approvalStatus: string;
  approvedScopeHash: string;
  currentScopeHash: string;
  approvedModelClasses: readonly ModelRoutingClass[];
  requestedModelClass: ModelRoutingClass;
  approvedTokenMaximum: number;
  requestedTokenMaximum: number;
  approvedCostMaximum: number;
  requestedCostMaximum: number;
  approvalExpiresAt: string;
  evaluatedAt: string;
  approvalPolicyVersion: string;
  currentPolicyVersion: string;
  materialChangeDetected: boolean;
  riskClass: RiskClass;
  paidActionRequested: boolean;
  evidenceArtifactIds: readonly string[];
}): ApprovalBoundaryEvaluation {
  const denialReasons: string[] = [];
  const validApproval = Boolean(input.approvalId && (input.approvalStatus === "APPROVED" || input.approvalStatus === "RAHUL_APPROVED"));
  if (!input.approvalId || input.approvalStatus === "PENDING" || input.approvalStatus === "REVOKED") {
    denialReasons.push("missing-approval");
    return {
      approvalId: input.approvalId,
      approvalStatus: input.approvalStatus,
      decision: "DENIED_MISSING_APPROVAL",
      approvalValid: false,
      approvalRequired: true,
      scopeValid: input.approvedScopeHash === input.currentScopeHash,
      modelClassValid: input.approvedModelClasses.includes(input.requestedModelClass),
      tokenBoundaryValid: input.requestedTokenMaximum <= input.approvedTokenMaximum,
      costBoundaryValid: input.requestedCostMaximum <= input.approvedCostMaximum,
      policyVersionValid: input.approvalPolicyVersion === input.currentPolicyVersion,
      materialChangeValid: !input.materialChangeDetected,
      riskClassValid: input.riskClass !== "R5",
      denialReasons,
      evidenceArtifactIds: input.evidenceArtifactIds,
      evaluatedAt: input.evaluatedAt,
      contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION,
    };
  }
  if (input.approvalExpiresAt <= input.evaluatedAt) {
    denialReasons.push("approval-expired");
    return { approvalId: input.approvalId, approvalStatus: input.approvalStatus, decision: "DENIED_EXPIRED_APPROVAL", approvalValid: false, approvalRequired: true, scopeValid: input.approvedScopeHash === input.currentScopeHash, modelClassValid: input.approvedModelClasses.includes(input.requestedModelClass), tokenBoundaryValid: input.requestedTokenMaximum <= input.approvedTokenMaximum, costBoundaryValid: input.requestedCostMaximum <= input.approvedCostMaximum, policyVersionValid: input.approvalPolicyVersion === input.currentPolicyVersion, materialChangeValid: !input.materialChangeDetected, riskClassValid: input.riskClass !== "R5", denialReasons, evidenceArtifactIds: input.evidenceArtifactIds, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  if (input.approvedScopeHash !== input.currentScopeHash) {
    denialReasons.push("scope-mismatch");
    return { approvalId: input.approvalId, approvalStatus: input.approvalStatus, decision: "DENIED_SCOPE_MISMATCH", approvalValid: false, approvalRequired: true, scopeValid: false, modelClassValid: input.approvedModelClasses.includes(input.requestedModelClass), tokenBoundaryValid: input.requestedTokenMaximum <= input.approvedTokenMaximum, costBoundaryValid: input.requestedCostMaximum <= input.approvedCostMaximum, policyVersionValid: input.approvalPolicyVersion === input.currentPolicyVersion, materialChangeValid: !input.materialChangeDetected, riskClassValid: input.riskClass !== "R5", denialReasons, evidenceArtifactIds: input.evidenceArtifactIds, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  if (!input.approvedModelClasses.includes(input.requestedModelClass)) {
    denialReasons.push("model-class-not-approved");
    return { approvalId: input.approvalId, approvalStatus: input.approvalStatus, decision: "DENIED_MODEL_CLASS", approvalValid: false, approvalRequired: true, scopeValid: true, modelClassValid: false, tokenBoundaryValid: input.requestedTokenMaximum <= input.approvedTokenMaximum, costBoundaryValid: input.requestedCostMaximum <= input.approvedCostMaximum, policyVersionValid: input.approvalPolicyVersion === input.currentPolicyVersion, materialChangeValid: !input.materialChangeDetected, riskClassValid: input.riskClass !== "R5", denialReasons, evidenceArtifactIds: input.evidenceArtifactIds, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  if (input.requestedTokenMaximum > input.approvedTokenMaximum) {
    denialReasons.push("token-boundary-exceeded");
    return { approvalId: input.approvalId, approvalStatus: input.approvalStatus, decision: "DENIED_TOKEN_BOUNDARY", approvalValid: false, approvalRequired: true, scopeValid: true, modelClassValid: true, tokenBoundaryValid: false, costBoundaryValid: input.requestedCostMaximum <= input.approvedCostMaximum, policyVersionValid: input.approvalPolicyVersion === input.currentPolicyVersion, materialChangeValid: !input.materialChangeDetected, riskClassValid: input.riskClass !== "R5", denialReasons, evidenceArtifactIds: input.evidenceArtifactIds, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  if (input.requestedCostMaximum > input.approvedCostMaximum) {
    denialReasons.push("cost-boundary-exceeded");
    return { approvalId: input.approvalId, approvalStatus: input.approvalStatus, decision: "DENIED_COST_BOUNDARY", approvalValid: false, approvalRequired: true, scopeValid: true, modelClassValid: true, tokenBoundaryValid: true, costBoundaryValid: false, policyVersionValid: input.approvalPolicyVersion === input.currentPolicyVersion, materialChangeValid: !input.materialChangeDetected, riskClassValid: input.riskClass !== "R5", denialReasons, evidenceArtifactIds: input.evidenceArtifactIds, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  if (input.approvalPolicyVersion !== input.currentPolicyVersion) {
    denialReasons.push("policy-version-mismatch");
    return { approvalId: input.approvalId, approvalStatus: input.approvalStatus, decision: "DENIED_POLICY_VERSION", approvalValid: false, approvalRequired: true, scopeValid: true, modelClassValid: true, tokenBoundaryValid: true, costBoundaryValid: true, policyVersionValid: false, materialChangeValid: !input.materialChangeDetected, riskClassValid: input.riskClass !== "R5", denialReasons, evidenceArtifactIds: input.evidenceArtifactIds, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  if (input.materialChangeDetected) {
    denialReasons.push("material-change-detected");
    return { approvalId: input.approvalId, approvalStatus: input.approvalStatus, decision: "DENIED_MATERIAL_CHANGE", approvalValid: false, approvalRequired: true, scopeValid: true, modelClassValid: true, tokenBoundaryValid: true, costBoundaryValid: true, policyVersionValid: true, materialChangeValid: false, riskClassValid: input.riskClass !== "R5", denialReasons, evidenceArtifactIds: input.evidenceArtifactIds, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  if (input.riskClass === "R5") {
    return { approvalId: input.approvalId, approvalStatus: input.approvalStatus, decision: "PROHIBITED", approvalValid: false, approvalRequired: true, scopeValid: true, modelClassValid: true, tokenBoundaryValid: true, costBoundaryValid: true, policyVersionValid: true, materialChangeValid: true, riskClassValid: false, denialReasons: ["r5-prohibited"], evidenceArtifactIds: input.evidenceArtifactIds, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  if (input.riskClass === "R4" && input.approvalStatus !== "RAHUL_APPROVED") {
    return { approvalId: input.approvalId, approvalStatus: input.approvalStatus, decision: "DENIED_RISK_CLASS", approvalValid: false, approvalRequired: true, scopeValid: true, modelClassValid: true, tokenBoundaryValid: true, costBoundaryValid: true, policyVersionValid: true, materialChangeValid: true, riskClassValid: false, denialReasons: ["fresh-rahul-approval-required"], evidenceArtifactIds: input.evidenceArtifactIds, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  if (input.paidActionRequested && input.approvalStatus !== "RAHUL_APPROVED" && input.approvalStatus !== "APPROVED") {
    return { approvalId: input.approvalId, approvalStatus: input.approvalStatus, decision: "APPROVAL_REQUIRED", approvalValid: false, approvalRequired: true, scopeValid: true, modelClassValid: true, tokenBoundaryValid: true, costBoundaryValid: true, policyVersionValid: true, materialChangeValid: true, riskClassValid: true, denialReasons: ["paid-action-approval-required"], evidenceArtifactIds: input.evidenceArtifactIds, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  return { approvalId: input.approvalId, approvalStatus: input.approvalStatus, decision: validApproval ? "APPROVAL_VALID_AS_PROJECTION" : "APPROVAL_REQUIRED", approvalValid: validApproval, approvalRequired: !validApproval, scopeValid: true, modelClassValid: true, tokenBoundaryValid: true, costBoundaryValid: true, policyVersionValid: true, materialChangeValid: true, riskClassValid: true, denialReasons: [], evidenceArtifactIds: input.evidenceArtifactIds, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
}

export function evaluateEvidenceStoragePressure(input: EvidenceStoragePressureInput): EvidenceStoragePressureResult {
  const requiredEvidenceArtifactIds = [...input.requiredEvidenceArtifactIds].sort();
  const optionalEvidenceArtifactIds = [...input.optionalEvidenceArtifactIds].sort();
  const provenanceReferenceIds = [...input.provenanceReferenceIds].sort();
  const auditReferenceIds = [...input.auditReferenceIds].sort();
  const redactionDecisionIds = [...input.redactionDecisionIds].sort();
  const evidenceArtifactIds = [...new Set([...requiredEvidenceArtifactIds, ...optionalEvidenceArtifactIds])].sort();
  const mandatoryFootprint = input.mandatoryEvidenceBytes + input.reservedEvidenceBytes + input.consumedEvidenceBytes;
  const optionalFootprint = input.optionalEvidenceBytes + input.duplicateOptionalEvidenceBytes;
  const totalFootprint = mandatoryFootprint + optionalFootprint;
  if (!requiredEvidenceArtifactIds.length && input.mandatoryEvidenceBytes > 0) {
    return { decision: "PROHIBITED", evidenceArtifactIds, provenanceReferenceIds, auditReferenceIds, redactionDecisionIds, mandatoryEvidenceBytes: input.mandatoryEvidenceBytes, optionalEvidenceBytes: input.optionalEvidenceBytes, duplicateOptionalEvidenceBytes: input.duplicateOptionalEvidenceBytes, reservedEvidenceBytes: input.reservedEvidenceBytes, consumedEvidenceBytes: input.consumedEvidenceBytes, hardLimitBytes: input.hardLimitBytes, warningThresholdBytes: input.warningThresholdBytes, requiredEvidenceArtifactIds, optionalEvidenceArtifactIds, noMutationOccurred: true, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  if (!provenanceReferenceIds.length || !auditReferenceIds.length) {
    return { decision: "PROHIBITED", evidenceArtifactIds, provenanceReferenceIds, auditReferenceIds, redactionDecisionIds, mandatoryEvidenceBytes: input.mandatoryEvidenceBytes, optionalEvidenceBytes: input.optionalEvidenceBytes, duplicateOptionalEvidenceBytes: input.duplicateOptionalEvidenceBytes, reservedEvidenceBytes: input.reservedEvidenceBytes, consumedEvidenceBytes: input.consumedEvidenceBytes, hardLimitBytes: input.hardLimitBytes, warningThresholdBytes: input.warningThresholdBytes, requiredEvidenceArtifactIds, optionalEvidenceArtifactIds, noMutationOccurred: true, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  if (input.mandatoryEvidenceBytes > input.hardLimitBytes || mandatoryFootprint > input.hardLimitBytes) {
    return { decision: "COMPLETION_BLOCKED", evidenceArtifactIds, provenanceReferenceIds, auditReferenceIds, redactionDecisionIds, mandatoryEvidenceBytes: input.mandatoryEvidenceBytes, optionalEvidenceBytes: input.optionalEvidenceBytes, duplicateOptionalEvidenceBytes: input.duplicateOptionalEvidenceBytes, reservedEvidenceBytes: input.reservedEvidenceBytes, consumedEvidenceBytes: input.consumedEvidenceBytes, hardLimitBytes: input.hardLimitBytes, warningThresholdBytes: input.warningThresholdBytes, requiredEvidenceArtifactIds, optionalEvidenceArtifactIds, noMutationOccurred: true, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  if (input.mandatoryEvidenceBytes > input.warningThresholdBytes || mandatoryFootprint > input.warningThresholdBytes) {
    return { decision: "MANDATORY_EVIDENCE_OVERFLOW", evidenceArtifactIds, provenanceReferenceIds, auditReferenceIds, redactionDecisionIds, mandatoryEvidenceBytes: input.mandatoryEvidenceBytes, optionalEvidenceBytes: input.optionalEvidenceBytes, duplicateOptionalEvidenceBytes: input.duplicateOptionalEvidenceBytes, reservedEvidenceBytes: input.reservedEvidenceBytes, consumedEvidenceBytes: input.consumedEvidenceBytes, hardLimitBytes: input.hardLimitBytes, warningThresholdBytes: input.warningThresholdBytes, requiredEvidenceArtifactIds, optionalEvidenceArtifactIds, noMutationOccurred: true, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  if (input.duplicateOptionalEvidenceBytes > 0 && input.optionalEvidenceBytes > 0 && optionalFootprint >= input.warningThresholdBytes * 0.5) {
    return { decision: "OPTIONAL_DUPLICATE_REDUCTION_CANDIDATE", evidenceArtifactIds, provenanceReferenceIds, auditReferenceIds, redactionDecisionIds, mandatoryEvidenceBytes: input.mandatoryEvidenceBytes, optionalEvidenceBytes: input.optionalEvidenceBytes, duplicateOptionalEvidenceBytes: input.duplicateOptionalEvidenceBytes, reservedEvidenceBytes: input.reservedEvidenceBytes, consumedEvidenceBytes: input.consumedEvidenceBytes, hardLimitBytes: input.hardLimitBytes, warningThresholdBytes: input.warningThresholdBytes, requiredEvidenceArtifactIds, optionalEvidenceArtifactIds, noMutationOccurred: true, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  if (totalFootprint > input.warningThresholdBytes) {
    return { decision: "WARNING", evidenceArtifactIds, provenanceReferenceIds, auditReferenceIds, redactionDecisionIds, mandatoryEvidenceBytes: input.mandatoryEvidenceBytes, optionalEvidenceBytes: input.optionalEvidenceBytes, duplicateOptionalEvidenceBytes: input.duplicateOptionalEvidenceBytes, reservedEvidenceBytes: input.reservedEvidenceBytes, consumedEvidenceBytes: input.consumedEvidenceBytes, hardLimitBytes: input.hardLimitBytes, warningThresholdBytes: input.warningThresholdBytes, requiredEvidenceArtifactIds, optionalEvidenceArtifactIds, noMutationOccurred: true, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
  }
  return { decision: "WITHIN_EVIDENCE_BUDGET", evidenceArtifactIds, provenanceReferenceIds, auditReferenceIds, redactionDecisionIds, mandatoryEvidenceBytes: input.mandatoryEvidenceBytes, optionalEvidenceBytes: input.optionalEvidenceBytes, duplicateOptionalEvidenceBytes: input.duplicateOptionalEvidenceBytes, reservedEvidenceBytes: input.reservedEvidenceBytes, consumedEvidenceBytes: input.consumedEvidenceBytes, hardLimitBytes: input.hardLimitBytes, warningThresholdBytes: input.warningThresholdBytes, requiredEvidenceArtifactIds, optionalEvidenceArtifactIds, noMutationOccurred: true, evaluatedAt: input.evaluatedAt, contractVersion: PHASE1A9_SCHEDULER_CONTRACT_VERSION };
}

export type { ModelRoutingClass, ModelRoutingProfileContract, PrivacyRequirement, DataResidencyRequirement };
