export const CONNECTOR_BINDING_DECISION_VALUES = [
  "CONNECTOR_READ_ELIGIBLE_AS_PROJECTION",
  "CONNECTOR_MUTATION_ELIGIBLE_AS_PROJECTION",
  "SERIALIZATION_REQUIRED",
  "ACCOUNT_EXCLUSIVE_REQUIRED",
  "DENIED_PROVIDER",
  "DENIED_ACCOUNT",
  "DENIED_ACCOUNT_CATEGORY",
  "DENIED_SCOPE",
  "DENIED_PERMISSION",
  "DENIED_APPROVAL",
  "DENIED_ATTRIBUTION",
  "DENIED_ACCOUNT_ISOLATION",
  "DENIED_CREDENTIAL_MATERIAL",
  "RECONCILE_REMOTE_EFFECT",
  "RECONCILE_PROVIDER_TRUTH",
  "FAILED_SAFE",
  "PROHIBITED",
] as const;

export type ConnectorBindingDecision = (typeof CONNECTOR_BINDING_DECISION_VALUES)[number];

export interface ConnectorBindingRequest {
  connectorBindingDecisionId: string;
  schedulerTaskReferenceId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  providerId: string;
  accountId: string;
  accountLabel: string;
  accountCategory: string;
  connectorScopeId: string;
  permissionMode: string;
  readScopeIds: readonly string[];
  writeScopeIds: readonly string[];
  approvalId: string;
  sourceAttributionId: string;
  parallelReadRequested: boolean;
  mutationRequested: boolean;
  mutationClassification: string;
  professionalContext: boolean;
  personalContext: boolean;
  scopeHash: string;
  remoteSideEffectStatus: string;
  providerOutcome: string;
  idempotencyKey: string;
  evaluatedAt: string;
  contractVersion: string;
  evidenceArtifactIds: readonly string[];
}

export interface ConnectorBindingResult {
  connectorBindingDecisionId: string;
  decision: ConnectorBindingDecision;
  providerValid: boolean;
  accountValid: boolean;
  accountCategoryValid: boolean;
  accountIsolationPreserved: boolean;
  scopeValid: boolean;
  permissionValid: boolean;
  approvalValid: boolean;
  sourceAttributionValid: boolean;
  parallelReadEligible: boolean;
  mutationSerializationRequired: boolean;
  accountExclusiveMutationRequired: boolean;
  professionalPersonalBoundaryPreserved: boolean;
  credentialMaterialDetected: boolean;
  remoteUncertaintyDetected: boolean;
  providerTruthRequired: boolean;
  reconciliationRequired: boolean;
  denialReasons: readonly string[];
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export function evaluateConnectorBinding(request: ConnectorBindingRequest): ConnectorBindingResult {
  const providerValid = ["Outlook", "Gmail", "Yahoo", "OneDrive", "SharePoint", "Google Drive"].includes(request.providerId);
  const accountValid = Boolean(request.accountId && request.accountLabel && request.accountId.startsWith("acct-"));
  const accountCategoryValid = ["PROFESSIONAL_OUTLOOK", "PERSONAL_OUTLOOK", "GMAIL", "YAHOO", "ONEDRIVE", "SHAREPOINT", "GOOGLE_DRIVE", "OTHER_GOVERNED"].includes(request.accountCategory);
  const accountIsolationPreserved = !(request.providerId === "Outlook" && request.professionalContext && request.personalContext);
  const scopeValid = Boolean(request.connectorScopeId && request.scopeHash);
  const permissionValid = request.permissionMode === "READ_ONLY" || request.permissionMode === "ACTION_APPROVAL_REQUIRED";
  const approvalValid = Boolean(request.approvalId && request.approvalId.startsWith("approval-"));
  const sourceAttributionValid = Boolean(request.sourceAttributionId && request.sourceAttributionId.startsWith("source-"));
  const professionalPersonalBoundaryPreserved = request.professionalContext !== request.personalContext;
  const credentialMaterialDetected = /token|secret|password|credential/i.test(request.accountLabel) || /token|secret|password|credential/i.test(request.accountId);
  const remoteUncertaintyDetected = ["UNKNOWN", "UNCERTAIN"].includes(request.remoteSideEffectStatus) || ["UNKNOWN", "UNCERTAIN"].includes(request.providerOutcome);
  const parallelReadEligible = request.parallelReadRequested && request.permissionMode === "READ_ONLY" && request.writeScopeIds.length === 0;
  const mutationSerializationRequired = request.mutationRequested && request.providerId.length > 0;
  const accountExclusiveMutationRequired = request.mutationRequested && request.accountId.length > 0;
  const providerTruthRequired = remoteUncertaintyDetected;
  const denialReasons: string[] = [];

  if (!providerValid) denialReasons.push("provider-invalid");
  if (!accountValid) denialReasons.push("account-invalid");
  if (!accountCategoryValid) denialReasons.push("account-category-invalid");
  if (!accountIsolationPreserved) denialReasons.push("account-isolation-violated");
  if (!scopeValid) denialReasons.push("scope-invalid");
  if (!permissionValid) denialReasons.push("permission-invalid");
  if (!approvalValid) denialReasons.push("approval-invalid");
  if (!sourceAttributionValid) denialReasons.push("source-attribution-invalid");
  if (!professionalPersonalBoundaryPreserved) denialReasons.push("professional-personal-boundary-invalid");
  if (credentialMaterialDetected) denialReasons.push("credential-material-detected");

  let decision: ConnectorBindingDecision = "CONNECTOR_READ_ELIGIBLE_AS_PROJECTION";
  if (!providerValid) decision = "DENIED_PROVIDER";
  else if (!accountValid) decision = "DENIED_ACCOUNT";
  else if (!accountCategoryValid) decision = "DENIED_ACCOUNT_CATEGORY";
  else if (!accountIsolationPreserved) decision = "DENIED_ACCOUNT_ISOLATION";
  else if (!scopeValid) decision = "DENIED_SCOPE";
  else if (!permissionValid) decision = "DENIED_PERMISSION";
  else if (!approvalValid) decision = "DENIED_APPROVAL";
  else if (!sourceAttributionValid) decision = "DENIED_ATTRIBUTION";
  else if (!professionalPersonalBoundaryPreserved) decision = "DENIED_ACCOUNT_ISOLATION";
  else if (credentialMaterialDetected) decision = "DENIED_CREDENTIAL_MATERIAL";
  else if (request.mutationRequested) decision = request.mutationRequested ? "SERIALIZATION_REQUIRED" : "CONNECTOR_MUTATION_ELIGIBLE_AS_PROJECTION";
  else if (parallelReadEligible) decision = "CONNECTOR_READ_ELIGIBLE_AS_PROJECTION";
  else if (remoteUncertaintyDetected) decision = "RECONCILE_REMOTE_EFFECT";

  return {
    connectorBindingDecisionId: request.connectorBindingDecisionId,
    decision,
    providerValid,
    accountValid,
    accountCategoryValid,
    accountIsolationPreserved,
    scopeValid,
    permissionValid,
    approvalValid,
    sourceAttributionValid,
    parallelReadEligible,
    mutationSerializationRequired,
    accountExclusiveMutationRequired,
    professionalPersonalBoundaryPreserved,
    credentialMaterialDetected,
    remoteUncertaintyDetected,
    providerTruthRequired,
    reconciliationRequired: remoteUncertaintyDetected || denialReasons.length > 0,
    denialReasons,
    evidenceArtifactIds: [...request.evidenceArtifactIds],
    evaluatedAt: request.evaluatedAt,
    contractVersion: request.contractVersion,
  };
}
