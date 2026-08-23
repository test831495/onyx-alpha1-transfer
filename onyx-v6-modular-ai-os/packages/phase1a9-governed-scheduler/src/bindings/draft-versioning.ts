import type { DraftBindingRequest, DraftBindingResult } from "./draft-binding";

export function evaluateDraftVersioning(request: DraftBindingRequest): DraftBindingResult {
  const base = evaluateDraftVersioningBase(request);
  return base;
}

function evaluateDraftVersioningBase(request: DraftBindingRequest): DraftBindingResult {
  const materialChangeDetected = request.materialChangeClassification === "MATERIAL_SCOPE_CHANGE" || request.currentScopeHash !== request.requestedScopeHash;
  const sameScope = request.currentScopeHash === request.requestedScopeHash;
  const approvalValid = Boolean(request.approvalId && request.approvalScopeHash === request.requestedScopeHash && Date.parse(request.approvalExpiresAt) > Date.parse(request.evaluatedAt));
  const decision = materialChangeDetected ? "NEW_VERSION_REQUIRED" : sameScope ? "SAME_SCOPE_UPDATE_ELIGIBLE_AS_PROJECTION" : "DRAFT_RESUME_ELIGIBLE_AS_PROJECTION";

  return {
    draftBindingDecisionId: request.draftBindingDecisionId,
    draftId: request.draftId,
    draftLineageId: request.draftLineageId,
    currentDraftVersionId: request.currentDraftVersionId,
    decision,
    draftLifecycleValid: !["DELETED", "SUPERSEDED"].includes(request.draftLifecycleState),
    versionCurrent: request.currentDraftVersionId === request.requestedDraftVersionId,
    sameScope,
    materialChangeDetected,
    newVersionRequired: materialChangeDetected,
    approvalValid,
    approvalInvalidated: materialChangeDetected && !approvalValid,
    permissionValid: Boolean(request.permissionDecisionId),
    memoryScopeValid: Boolean(request.memoryAccessProfileId),
    connectorScopeValid: request.connectorScopeIds.length > 0,
    dependencyGraphValid: Boolean(request.dependencyGraphId),
    budgetValid: Boolean(request.budgetDecisionId),
    targetEnvironmentValid: Boolean(request.targetEnvironment),
    riskClassValid: Boolean(request.riskClass),
    deletedDraft: Boolean(request.deletedAt),
    supersededDraft: Boolean(request.supersededByVersionId),
    schedulingEligible: !materialChangeDetected && approvalValid,
    resumeEligible: sameScope && !Boolean(request.deletedAt),
    lineagePreserved: Boolean(request.draftLineageId),
    revalidationRequired: materialChangeDetected || Boolean(request.deletedAt) || Boolean(request.supersededByVersionId),
    reconciliationRequired: materialChangeDetected || Boolean(request.deletedAt),
    denialReasons: materialChangeDetected ? ["material-change-requires-new-version"] : [],
    evidenceArtifactIds: [...request.evidenceArtifactIds],
    evaluatedAt: request.evaluatedAt,
    contractVersion: request.contractVersion,
  };
}
