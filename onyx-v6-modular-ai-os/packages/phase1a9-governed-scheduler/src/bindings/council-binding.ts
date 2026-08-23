export const COUNCIL_BINDING_DECISION_VALUES = [
  "COUNCIL_BINDING_ELIGIBLE_AS_PROJECTION",
  "SINGLE_PERSONA_BINDING_ELIGIBLE_AS_PROJECTION",
  "RAHUL_DECISION_REQUIRED",
  "DENIED_IDENTITY",
  "DENIED_PERSONA_BOUNDARY",
  "DENIED_SHARED_FACTS",
  "DENIED_APPROVAL",
  "DENIED_PERMISSION_EXPANSION",
  "DENIED_MEMORY_EXPANSION",
  "DENIED_CONNECTOR_EXPANSION",
  "DENIED_BUDGET_EXPANSION",
  "DENIED_PROMOTION_EXPANSION",
  "REQUIRES_RECONCILIATION",
  "PROHIBITED",
] as const;

export type CouncilBindingDecision = (typeof COUNCIL_BINDING_DECISION_VALUES)[number];

export interface CouncilBindingRequest {
  councilBindingDecisionId: string;
  schedulerTaskReferenceId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  presenceMode: "ONYX_ONLY" | "NOVA_ONLY" | "ONYX_AND_NOVA_COUNCIL";
  ONYXAgentIdentityId: string;
  NOVAAgentIdentityId: string;
  ONYXPersonaContextId: string;
  NOVAPersonaContextId: string;
  sharedTaskFactPackageId: string;
  ONYXContributionId: string;
  NOVAContributionId: string;
  agreementRecordIds: readonly string[];
  disagreementRecordIds: readonly string[];
  councilRecommendationId: string;
  approvalId: string;
  scopeHash: string;
  permissionDecisionIds: readonly string[];
  memoryDecisionIds: readonly string[];
  connectorDecisionIds: readonly string[];
  checkpointId: string;
  evidenceLineageId: string;
  promotionCandidateId: string;
  evaluatedAt: string;
  contractVersion: string;
  evidenceArtifactIds: readonly string[];
}

export interface CouncilBindingResult {
  councilBindingDecisionId: string;
  decision: CouncilBindingDecision;
  presenceModeValid: boolean;
  ONYXIdentityValid: boolean;
  NOVAIdentityValid: boolean;
  personaContextsSeparated: boolean;
  sharedFactsValid: boolean;
  agreementVisible: boolean;
  disagreementVisible: boolean;
  authoritativeWorkflowId: string;
  authoritativeApprovalId: string;
  authoritativeCheckpointId: string;
  authoritativeEvidenceLineageId: string;
  authoritativePromotionCandidateId: string;
  RahulDecisionRequired: boolean;
  selfApprovalDetected: boolean;
  permissionExpansionDetected: boolean;
  memoryExpansionDetected: boolean;
  connectorExpansionDetected: boolean;
  budgetExpansionDetected: boolean;
  promotionAuthorityExpansionDetected: boolean;
  reconciliationRequired: boolean;
  denialReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export function evaluateCouncilBinding(request: CouncilBindingRequest): CouncilBindingResult {
  const denialReasons: string[] = [];
  const presenceModeValid = ["ONYX_ONLY", "NOVA_ONLY", "ONYX_AND_NOVA_COUNCIL"].includes(request.presenceMode);
  const ONYXIdentityValid = Boolean(request.ONYXAgentIdentityId && request.ONYXAgentIdentityId.startsWith("onyx"));
  const NOVAIdentityValid = Boolean(request.NOVAAgentIdentityId && request.NOVAAgentIdentityId.startsWith("nova"));
  const personaContextsSeparated = Boolean(request.ONYXPersonaContextId && request.NOVAPersonaContextId && request.ONYXPersonaContextId !== request.NOVAPersonaContextId);
  const sharedFactsValid = Boolean(request.sharedTaskFactPackageId && request.sharedTaskFactPackageId.startsWith("facts-"));
  const agreementVisible = request.agreementRecordIds.length > 0;
  const disagreementVisible = request.disagreementRecordIds.length > 0;
  const selfApprovalDetected = request.approvalId === request.ONYXContributionId || request.approvalId === request.NOVAContributionId || request.approvalId.includes("self");
  const permissionExpansionDetected = request.permissionDecisionIds.length > 1;
  const memoryExpansionDetected = request.memoryDecisionIds.length > 1;
  const connectorExpansionDetected = request.connectorDecisionIds.length > 1;
  const budgetExpansionDetected = request.permissionDecisionIds.length > 1 && request.memoryDecisionIds.length > 1;
  const promotionAuthorityExpansionDetected = Boolean(request.promotionCandidateId && request.promotionCandidateId.startsWith("promo-") && request.disagreementRecordIds.length > 0);

  if (!presenceModeValid) denialReasons.push("invalid-presence-mode");
  if (!ONYXIdentityValid) denialReasons.push("invalid-onyx-identity");
  if (!NOVAIdentityValid) denialReasons.push("invalid-nova-identity");
  if (!personaContextsSeparated) denialReasons.push("persona-boundaries-not-separated");
  if (!sharedFactsValid) denialReasons.push("shared-facts-invalid");
  if (!agreementVisible) denialReasons.push("agreement-not-visible");
  if (selfApprovalDetected) denialReasons.push("self-approval-detected");

  let decision: CouncilBindingDecision = "COUNCIL_BINDING_ELIGIBLE_AS_PROJECTION";
  if (!presenceModeValid || !ONYXIdentityValid || !NOVAIdentityValid) decision = "DENIED_IDENTITY";
  else if (!personaContextsSeparated) decision = "DENIED_PERSONA_BOUNDARY";
  else if (!sharedFactsValid) decision = "DENIED_SHARED_FACTS";
  else if (selfApprovalDetected) decision = "DENIED_APPROVAL";
  else if (permissionExpansionDetected) decision = "DENIED_PERMISSION_EXPANSION";
  else if (memoryExpansionDetected) decision = "DENIED_MEMORY_EXPANSION";
  else if (connectorExpansionDetected) decision = "DENIED_CONNECTOR_EXPANSION";
  else if (budgetExpansionDetected) decision = "DENIED_BUDGET_EXPANSION";
  else if (promotionAuthorityExpansionDetected) decision = "DENIED_PROMOTION_EXPANSION";
  else if (disagreementVisible) decision = "RAHUL_DECISION_REQUIRED";

  const result: CouncilBindingResult = {
    councilBindingDecisionId: request.councilBindingDecisionId,
    decision,
    presenceModeValid,
    ONYXIdentityValid,
    NOVAIdentityValid,
    personaContextsSeparated,
    sharedFactsValid,
    agreementVisible,
    disagreementVisible,
    authoritativeWorkflowId: request.workflowId,
    authoritativeApprovalId: request.approvalId,
    authoritativeCheckpointId: request.checkpointId,
    authoritativeEvidenceLineageId: request.evidenceLineageId,
    authoritativePromotionCandidateId: request.promotionCandidateId,
    RahulDecisionRequired: disagreementVisible,
    selfApprovalDetected,
    permissionExpansionDetected,
    memoryExpansionDetected,
    connectorExpansionDetected,
    budgetExpansionDetected,
    promotionAuthorityExpansionDetected,
    reconciliationRequired: disagreementVisible || denialReasons.length > 0,
    denialReasons,
    evidenceArtifactIds: [...request.evidenceArtifactIds],
    evaluatedAt: request.evaluatedAt,
    contractVersion: request.contractVersion,
  };

  return result;
}
