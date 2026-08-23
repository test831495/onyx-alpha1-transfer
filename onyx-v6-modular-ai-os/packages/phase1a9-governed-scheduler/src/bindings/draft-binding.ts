export const DRAFT_BINDING_DECISION_VALUES = [
  "DRAFT_SCHEDULING_ELIGIBLE_AS_PROJECTION",
  "DRAFT_RESUME_ELIGIBLE_AS_PROJECTION",
  "SAME_SCOPE_UPDATE_ELIGIBLE_AS_PROJECTION",
  "NEW_VERSION_REQUIRED",
  "FRESH_APPROVAL_REQUIRED",
  "DENIED_DELETED",
  "DENIED_SUPERSEDED",
  "DENIED_VERSION",
  "DENIED_SCOPE",
  "DENIED_APPROVAL",
  "DENIED_PERMISSION",
  "DENIED_MEMORY_SCOPE",
  "DENIED_CONNECTOR_SCOPE",
  "DENIED_DEPENDENCY",
  "DENIED_BUDGET",
  "DENIED_TARGET_ENVIRONMENT",
  "DENIED_RISK_CLASS",
  "REQUIRES_REVALIDATION",
  "REQUIRES_RECONCILIATION",
  "PROHIBITED",
] as const;

export type DraftBindingDecision = (typeof DRAFT_BINDING_DECISION_VALUES)[number];

export interface DraftBindingRequest {
  draftBindingDecisionId: string;
  schedulerTaskReferenceId: string;
  workflowId: string;
  draftId: string;
  draftLineageId: string;
  currentDraftVersionId: string;
  requestedDraftVersionId: string;
  draftLifecycleState: string;
  currentScopeHash: string;
  requestedScopeHash: string;
  materialChangeClassification: string;
  approvalId: string;
  approvalScopeHash: string;
  approvalExpiresAt: string;
  evaluatedAt: string;
  approvalPolicyVersion: string;
  currentPolicyVersion: string;
  permissionDecisionId: string;
  memoryAccessProfileId: string;
  connectorScopeIds: readonly string[];
  dependencyGraphId: string;
  budgetDecisionId: string;
  targetEnvironment: string;
  riskClass: string;
  deletedAt: string | null;
  supersededByVersionId: string | null;
  requestedOperation: string;
  contractVersion: string;
  evidenceArtifactIds: readonly string[];
}

export interface DraftBindingResult {
  draftBindingDecisionId: string;
  draftId: string;
  draftLineageId: string;
  currentDraftVersionId: string;
  decision: DraftBindingDecision;
  draftLifecycleValid: boolean;
  versionCurrent: boolean;
  sameScope: boolean;
  materialChangeDetected: boolean;
  newVersionRequired: boolean;
  approvalValid: boolean;
  approvalInvalidated: boolean;
  permissionValid: boolean;
  memoryScopeValid: boolean;
  connectorScopeValid: boolean;
  dependencyGraphValid: boolean;
  budgetValid: boolean;
  targetEnvironmentValid: boolean;
  riskClassValid: boolean;
  deletedDraft: boolean;
  supersededDraft: boolean;
  schedulingEligible: boolean;
  resumeEligible: boolean;
  lineagePreserved: boolean;
  revalidationRequired: boolean;
  reconciliationRequired: boolean;
  denialReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export function evaluateDraftBinding(request: DraftBindingRequest): DraftBindingResult {
  const draftLifecycleValid = !["DELETED", "SUPERSEDED"].includes(request.draftLifecycleState);
  const versionCurrent = request.currentDraftVersionId === request.requestedDraftVersionId;
  const sameScope = request.currentScopeHash === request.requestedScopeHash && request.currentScopeHash === request.approvalScopeHash;
  const materialChangeDetected = request.materialChangeClassification === "MATERIAL_SCOPE_CHANGE" || request.currentScopeHash !== request.requestedScopeHash;
  const newVersionRequired = materialChangeDetected || request.requestedScopeHash !== request.currentScopeHash;
  const approvalValid = Boolean(request.approvalId && request.approvalScopeHash === request.currentScopeHash && Date.parse(request.approvalExpiresAt) > Date.parse(request.evaluatedAt));
  const approvalInvalidated = materialChangeDetected && !approvalValid;
  const permissionValid = Boolean(request.permissionDecisionId && request.permissionDecisionId.startsWith("perm-"));
  const memoryScopeValid = Boolean(request.memoryAccessProfileId && request.memoryAccessProfileId.startsWith("mem-access-"));
  const connectorScopeValid = request.connectorScopeIds.length > 0;
  const dependencyGraphValid = Boolean(request.dependencyGraphId && request.dependencyGraphId.startsWith("dep-"));
  const budgetValid = Boolean(request.budgetDecisionId && request.budgetDecisionId.startsWith("budget-"));
  const targetEnvironmentValid = Boolean(request.targetEnvironment && request.targetEnvironment.length > 0);
  const riskClassValid = Boolean(request.riskClass && request.riskClass.startsWith("R"));
  const deletedDraft = Boolean(request.deletedAt);
  const supersededDraft = Boolean(request.supersededByVersionId);
  const schedulingEligible = draftLifecycleValid && versionCurrent && !deletedDraft && !supersededDraft && permissionValid && memoryScopeValid && connectorScopeValid && dependencyGraphValid && budgetValid && targetEnvironmentValid && riskClassValid && (!newVersionRequired || approvalValid);
  const resumeEligible = draftLifecycleValid && !deletedDraft && !supersededDraft && sameScope && versionCurrent;
  const lineagePreserved = Boolean(request.draftLineageId && request.draftLineageId.startsWith("lineage-"));

  const denialReasons: string[] = [];
  if (deletedDraft) denialReasons.push("draft-deleted");
  if (supersededDraft) denialReasons.push("draft-superseded");
  if (!versionCurrent) denialReasons.push("draft-version-mismatch");
  if (!sameScope) denialReasons.push("draft-scope-mismatch");
  if (!approvalValid) denialReasons.push("approval-invalid");
  if (!permissionValid) denialReasons.push("permission-invalid");
  if (!memoryScopeValid) denialReasons.push("memory-scope-invalid");
  if (!connectorScopeValid) denialReasons.push("connector-scope-invalid");
  if (!dependencyGraphValid) denialReasons.push("dependency-graph-invalid");
  if (!budgetValid) denialReasons.push("budget-invalid");
  if (!targetEnvironmentValid) denialReasons.push("target-environment-invalid");
  if (!riskClassValid) denialReasons.push("risk-class-invalid");

  let decision: DraftBindingDecision = "DRAFT_SCHEDULING_ELIGIBLE_AS_PROJECTION";
  if (deletedDraft) decision = "DENIED_DELETED";
  else if (supersededDraft) decision = "DENIED_SUPERSEDED";
  else if (!versionCurrent) decision = "DENIED_VERSION";
  else if (!sameScope) decision = "DENIED_SCOPE";
  else if (newVersionRequired && !approvalValid) decision = "FRESH_APPROVAL_REQUIRED";
  else if (newVersionRequired) decision = "NEW_VERSION_REQUIRED";
  else if (!permissionValid) decision = "DENIED_PERMISSION";
  else if (!memoryScopeValid) decision = "DENIED_MEMORY_SCOPE";
  else if (!connectorScopeValid) decision = "DENIED_CONNECTOR_SCOPE";
  else if (!dependencyGraphValid) decision = "DENIED_DEPENDENCY";
  else if (!budgetValid) decision = "DENIED_BUDGET";
  else if (!targetEnvironmentValid) decision = "DENIED_TARGET_ENVIRONMENT";
  else if (!riskClassValid) decision = "DENIED_RISK_CLASS";
  else if (request.requestedOperation === "RESUME" && resumeEligible) decision = "DRAFT_RESUME_ELIGIBLE_AS_PROJECTION";
  else if (request.requestedOperation === "SAME_SCOPE_UPDATE" && sameScope) decision = "SAME_SCOPE_UPDATE_ELIGIBLE_AS_PROJECTION";

  return {
    draftBindingDecisionId: request.draftBindingDecisionId,
    draftId: request.draftId,
    draftLineageId: request.draftLineageId,
    currentDraftVersionId: request.currentDraftVersionId,
    decision,
    draftLifecycleValid,
    versionCurrent,
    sameScope,
    materialChangeDetected,
    newVersionRequired,
    approvalValid,
    approvalInvalidated,
    permissionValid,
    memoryScopeValid,
    connectorScopeValid,
    dependencyGraphValid,
    budgetValid,
    targetEnvironmentValid,
    riskClassValid,
    deletedDraft,
    supersededDraft,
    schedulingEligible,
    resumeEligible,
    lineagePreserved,
    revalidationRequired: denialReasons.length > 0 || newVersionRequired,
    reconciliationRequired: newVersionRequired || denialReasons.length > 0,
    denialReasons,
    evidenceArtifactIds: [...request.evidenceArtifactIds],
    evaluatedAt: request.evaluatedAt,
    contractVersion: request.contractVersion,
  };
}
