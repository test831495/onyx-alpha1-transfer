import { createHash } from "node:crypto";
import { SAVED_DRAFT_CONTRACT_VERSION } from "../shared/versions";
import { isApprovalInvalidated } from "../shared/approval";
import { digest, makeId } from "../shared/identifiers";

export const DRAFT_LIFECYCLE_STATES = [
  "DRAFT",
  "SAVED",
  "RESUMED",
  "UPDATED",
  "SUPERSEDED",
  "DELETION_REQUESTED",
  "DELETED",
  "EXPORTED",
  "FAILED_SAFE",
  "RECONCILIATION_REQUIRED",
] as const;
export type DraftLifecycleState = (typeof DRAFT_LIFECYCLE_STATES)[number];

export const DRAFT_SCOPE_CHANGE_CLASSIFICATIONS = ["NO_CHANGE", "MINOR_EDIT", "MATERIAL_SCOPE_CHANGE"] as const;
export type DraftScopeChangeClassification = (typeof DRAFT_SCOPE_CHANGE_CLASSIFICATIONS)[number];

export const DRAFT_SUPERSESSION_STATES = ["REQUESTED", "AUTHORIZED", "APPLIED", "REJECTED", "RECONCILIATION_REQUIRED"] as const;
export type DraftSupersessionState = (typeof DRAFT_SUPERSESSION_STATES)[number];

export interface SavedDraftLifecycleContract {
  draftId: string;
  currentVersionId: string;
  workflowId: string;
  runtimeId: string;
  supervisingUserId: string;
  objective: string;
  scopeHash: string;
  status: DraftLifecycleState;
  createdAt: string;
  updatedAt: string;
  resumedAt?: string;
  supersededAt?: string;
  deletedAt?: string;
  approvalStatus: "PENDING" | "VALID" | "INVALID" | "REVOKED";
  evidenceReferences: string[];
  contractVersion: string;
}

const LEGAL_DRAFT_TRANSITIONS: Record<DraftLifecycleState, readonly DraftLifecycleState[]> = {
  DRAFT: ["SAVED", "FAILED_SAFE", "RECONCILIATION_REQUIRED"],
  SAVED: ["RESUMED", "UPDATED", "SUPERSEDED", "DELETION_REQUESTED", "FAILED_SAFE"],
  RESUMED: ["UPDATED", "SUPERSEDED", "DELETION_REQUESTED", "FAILED_SAFE"],
  UPDATED: ["SAVED", "RESUMED", "SUPERSEDED", "DELETION_REQUESTED", "FAILED_SAFE"],
  SUPERSEDED: ["DELETION_REQUESTED", "FAILED_SAFE"],
  DELETION_REQUESTED: ["DELETED", "FAILED_SAFE", "RECONCILIATION_REQUIRED"],
  DELETED: [],
  EXPORTED: [],
  FAILED_SAFE: [],
  RECONCILIATION_REQUIRED: ["SAVED", "RESUMED", "UPDATED", "FAILED_SAFE"],
};

export function canTransitionDraftLifecycle(from: DraftLifecycleState, to: DraftLifecycleState): boolean {
  return LEGAL_DRAFT_TRANSITIONS[from]?.includes(to) ?? false;
}

export function assertDraftLifecycleTransition(from: DraftLifecycleState, to: DraftLifecycleState): void {
  if (!canTransitionDraftLifecycle(from, to)) {
    throw new Error(`Illegal draft transition: ${from} -> ${to}`);
  }
}

export function createSavedDraftLifecycle(input: Partial<SavedDraftLifecycleContract>): SavedDraftLifecycleContract {
  const draftId = input.draftId ?? makeId("draft", { workflowId: input.workflowId ?? "wf-1", runtimeId: input.runtimeId ?? "rt-1" });
  const versionId = input.currentVersionId ?? makeId("draft-version", { draftId });
  const now = "2026-01-01T00:00:00.000Z";
  return {
    draftId,
    currentVersionId: versionId,
    workflowId: input.workflowId ?? "wf-1",
    runtimeId: input.runtimeId ?? "rt-1",
    supervisingUserId: input.supervisingUserId ?? "user-7",
    objective: input.objective ?? "draft objective",
    scopeHash: input.scopeHash ?? "scope-v1",
    status: input.status ?? "DRAFT",
    createdAt: input.createdAt ?? now,
    updatedAt: input.updatedAt ?? now,
    resumedAt: input.resumedAt,
    supersededAt: input.supersededAt,
    deletedAt: input.deletedAt,
    approvalStatus: input.approvalStatus ?? "PENDING",
    evidenceReferences: input.evidenceReferences ?? [],
    contractVersion: input.contractVersion ?? SAVED_DRAFT_CONTRACT_VERSION,
  };
}

export interface DraftVersionContract {
  draftVersionId: string;
  draftId: string;
  versionNumber: number;
  parentVersionId?: string;
  scopeHash: string;
  objectiveDigest: string;
  planDigest: string;
  contentDigest: string;
  scopeChangeClassification: DraftScopeChangeClassification;
  createdAt: string;
  createdBy: string;
  status: "ACTIVE" | "SUPERSEDED" | "DELETED";
  approvalId: string;
  approvalValid: boolean;
  supersedesVersionId?: string;
  evidenceReferences: string[];
  contractVersion: string;
}

export function createDraftVersion(input: Partial<DraftVersionContract> & { draftId: string; versionNumber: number; objectiveDigest: string; planDigest: string; contentDigest: string; scopeHash: string; createdBy: string; approvalId: string; approvalValid: boolean; evidenceReferences: string[] }): DraftVersionContract {
  const versionNumber = input.versionNumber ?? 1;
  if (versionNumber < 1) throw new Error("Version numbers must be monotonic and positive.");
  const createdAt = input.createdAt ?? "2026-01-01T00:00:00.000Z";
  const draftVersionId = input.draftVersionId ?? makeId("draft-version", { draftId: input.draftId, versionNumber, createdAt });
  const parentVersionId = input.parentVersionId ?? (versionNumber > 1 ? makeId("draft-version", { draftId: input.draftId, versionNumber: versionNumber - 1 }) : undefined);
  if (versionNumber > 1 && !parentVersionId) throw new Error("Parent version must exist for versions after version one.");
  return {
    draftVersionId,
    draftId: input.draftId,
    versionNumber,
    parentVersionId,
    scopeHash: input.scopeHash,
    objectiveDigest: input.objectiveDigest,
    planDigest: input.planDigest,
    contentDigest: input.contentDigest,
    scopeChangeClassification: input.scopeChangeClassification ?? "NO_CHANGE",
    createdAt,
    createdBy: input.createdBy,
    status: input.status ?? "ACTIVE",
    approvalId: input.approvalId,
    approvalValid: input.approvalValid,
    supersedesVersionId: input.supersedesVersionId,
    evidenceReferences: input.evidenceReferences,
    contractVersion: input.contractVersion ?? SAVED_DRAFT_CONTRACT_VERSION,
  };
}

export interface DraftScopeComparison {
  scopeHash?: string;
  objective: string;
  files: string[];
  actions: string[];
  tools: string[];
  branch: string;
  targetEnvironment: string;
  externalSystems: string[];
  connectorProvider: string;
  connectorAccount: string;
  permissionScope: string[];
  memoryAccessScope: string[];
  modelRoutingClass: string;
  tokenBudget: number;
  costBudget: number;
  taskDependencySet: string[];
  riskClass: string;
  promotionEligibility: boolean;
  policyPinnedAgentIdentity?: string;
}

function stableOrder(value: readonly string[]): string[] {
  return [...value].sort();
}

export function classifyDraftScopeChange(prior: DraftScopeComparison, next: DraftScopeComparison): DraftScopeChangeClassification {
  if (
    prior.objective === next.objective &&
    prior.branch === next.branch &&
    prior.targetEnvironment === next.targetEnvironment &&
    prior.connectorProvider === next.connectorProvider &&
    prior.connectorAccount === next.connectorAccount &&
    prior.modelRoutingClass === next.modelRoutingClass &&
    prior.riskClass === next.riskClass &&
    prior.promotionEligibility === next.promotionEligibility &&
    prior.policyPinnedAgentIdentity === next.policyPinnedAgentIdentity &&
    prior.tokenBudget === next.tokenBudget &&
    prior.costBudget === next.costBudget &&
    JSON.stringify(stableOrder(prior.files)) === JSON.stringify(stableOrder(next.files)) &&
    JSON.stringify(stableOrder(prior.actions)) === JSON.stringify(stableOrder(next.actions)) &&
    JSON.stringify(stableOrder(prior.tools)) === JSON.stringify(stableOrder(next.tools)) &&
    JSON.stringify(stableOrder(prior.externalSystems)) === JSON.stringify(stableOrder(next.externalSystems)) &&
    JSON.stringify(stableOrder(prior.permissionScope)) === JSON.stringify(stableOrder(next.permissionScope)) &&
    JSON.stringify(stableOrder(prior.memoryAccessScope)) === JSON.stringify(stableOrder(next.memoryAccessScope)) &&
    JSON.stringify(stableOrder(prior.taskDependencySet)) === JSON.stringify(stableOrder(next.taskDependencySet))
  ) {
    return "NO_CHANGE";
  }

  const material = [
    prior.branch !== next.branch,
    prior.targetEnvironment !== next.targetEnvironment,
    prior.externalSystems.join(",") !== next.externalSystems.join(","),
    prior.connectorAccount !== next.connectorAccount,
    prior.permissionScope.join(",") !== next.permissionScope.join(","),
    prior.memoryAccessScope.join(",") !== next.memoryAccessScope.join(","),
    prior.modelRoutingClass !== next.modelRoutingClass,
    prior.tokenBudget !== next.tokenBudget,
    prior.costBudget !== next.costBudget,
    prior.taskDependencySet.join(",") !== next.taskDependencySet.join(","),
    prior.riskClass !== next.riskClass,
    prior.promotionEligibility !== next.promotionEligibility,
    prior.policyPinnedAgentIdentity !== next.policyPinnedAgentIdentity,
  ].some(Boolean);

  if (material) return "MATERIAL_SCOPE_CHANGE";
  return "MINOR_EDIT";
}

export function sameScopeDraftUpdate(input: {
  draft: SavedDraftLifecycleContract;
  currentVersion: DraftVersionContract;
  expectedVersionNumber: number;
  nextScopeHash: string;
  nextObjective: string;
  nextEvidenceReferences: string[];
}): { action: "UPDATE_CURRENT_VERSION"; draftId: string; updatesCurrentDraft: boolean; nextVersionNumber: number } {
  if (input.currentVersion.versionNumber !== input.expectedVersionNumber) {
    throw new Error("Expected version number mismatch.");
  }
  if (input.nextScopeHash !== input.currentVersion.scopeHash && input.nextScopeHash !== input.draft.scopeHash) {
    throw new Error("Same-scope update must not create a different scope hash.");
  }
  if (input.nextObjective !== input.draft.objective && input.nextObjective !== input.currentVersion.objectiveDigest) {
    throw new Error("Same-scope update must match the current draft objective.");
  }
  return { action: "UPDATE_CURRENT_VERSION", draftId: input.draft.draftId, updatesCurrentDraft: true, nextVersionNumber: input.currentVersion.versionNumber };
}

export function materialDraftScope(input: {
  draft: SavedDraftLifecycleContract;
  currentVersion: DraftVersionContract;
  nextScopeHash: string;
  nextObjective: string;
  nextEvidenceReferences: string[];
}): { action: "CREATE_NEW_VERSION"; draftId: string; createsNewVersion: boolean; nextVersionNumber: number } {
  const nextVersionNumber = input.currentVersion.versionNumber + 1;
  if (input.nextScopeHash === input.currentVersion.scopeHash && input.nextObjective === input.draft.objective) {
    return { action: "CREATE_NEW_VERSION", draftId: input.draft.draftId, createsNewVersion: false, nextVersionNumber };
  }
  return { action: "CREATE_NEW_VERSION", draftId: input.draft.draftId, createsNewVersion: true, nextVersionNumber };
}

export function assertApprovalInvalidatedAfterMaterialDraftChange(
  priorVersion: DraftVersionContract,
  nextScope: Partial<DraftScopeComparison>,
): void {
  const materialFields = [
    nextScope.branch,
    nextScope.targetEnvironment,
    nextScope.externalSystems,
    nextScope.connectorAccount,
    nextScope.permissionScope,
    nextScope.memoryAccessScope,
    nextScope.modelRoutingClass,
    nextScope.tokenBudget,
    nextScope.costBudget,
    nextScope.taskDependencySet,
    nextScope.riskClass,
    nextScope.promotionEligibility,
    nextScope.policyPinnedAgentIdentity,
  ].filter((value) => value !== undefined);
  if (materialFields.length > 0 && priorVersion.approvalValid) {
    const invalidated = isApprovalInvalidated(
      { approvedFiles: [], approvedActions: [], approvedTools: [], approvedBranch: priorVersion.scopeHash, approvedTargetEnvironment: "dev", approvedExternalSystems: [], approvedConnectorScopes: [], approvedPermissionScopes: [], approvedMemoryScopes: [], approvedModelRoutingClasses: [], approvedTokenBudget: 0, approvedCostBudget: 0, taskDependencyIds: [], riskClass: "R2", promotionEligible: true },
      { approvedFiles: [], approvedActions: [], approvedTools: [], approvedBranch: nextScope.branch ?? "dev", approvedTargetEnvironment: nextScope.targetEnvironment ?? "dev", approvedExternalSystems: nextScope.externalSystems ?? [], approvedConnectorScopes: [], approvedPermissionScopes: nextScope.permissionScope ?? [], approvedMemoryScopes: nextScope.memoryAccessScope ?? [], approvedModelRoutingClasses: nextScope.modelRoutingClass ? [nextScope.modelRoutingClass] : [], approvedTokenBudget: nextScope.tokenBudget ?? 0, approvedCostBudget: nextScope.costBudget ?? 0, taskDependencyIds: nextScope.taskDependencySet ?? [], riskClass: (nextScope.riskClass as any) ?? "R2", promotionEligible: nextScope.promotionEligibility ?? true, policyPinnedAgentId: nextScope.policyPinnedAgentIdentity },
    );
    if (invalidated) {
      return;
    }
  }
  if (nextScope.branch || nextScope.targetEnvironment || nextScope.externalSystems || nextScope.connectorAccount || nextScope.permissionScope || nextScope.memoryAccessScope || nextScope.modelRoutingClass || nextScope.tokenBudget || nextScope.costBudget || nextScope.taskDependencySet || nextScope.riskClass || nextScope.promotionEligibility || nextScope.policyPinnedAgentIdentity) {
    throw new Error("Approval invalidation after material draft change is required.");
  }
}

export interface DraftSupersessionContract {
  supersessionId: string;
  draftId: string;
  priorVersionId: string;
  replacementVersionId: string;
  reason: string;
  scopeChangeClassification: DraftScopeChangeClassification;
  authorizedBy: string;
  effectiveAt: string;
  status: DraftSupersessionState;
  evidenceReferences: string[];
  contractVersion: string;
}

export function assertDraftSupersession(supersession: DraftSupersessionContract): void {
  if (supersession.status !== "APPLIED") {
    throw new Error("Supersession must be applied to preserve history.");
  }
  if (!supersession.priorVersionId || !supersession.replacementVersionId) {
    throw new Error("Supersession requires both prior and replacement version IDs.");
  }
}

export interface DraftDeletionBoundary {
  requestedBy: string;
  permission: boolean;
  scopeValidated: boolean;
  auditReference: string;
  evidenceReference: string;
  nonProduction: boolean;
  activeGovernedExecutionDependency: boolean;
}

export function assertDeletionBoundary(boundary: DraftDeletionBoundary): void {
  if (!boundary.permission) throw new Error("Draft deletion requires permission.");
  if (!boundary.scopeValidated) throw new Error("Draft deletion requires scope validation.");
  if (!boundary.auditReference) throw new Error("Draft deletion requires an audit reference.");
  if (!boundary.evidenceReference) throw new Error("Draft deletion requires an evidence reference.");
  if (!boundary.nonProduction) throw new Error("Draft deletion requires non-production status.");
  if (boundary.activeGovernedExecutionDependency) throw new Error("Draft deletion cannot proceed with an active governed execution dependency.");
}

export interface DraftExportBoundary {
  permission: boolean;
  redactionDecision: string;
  provenanceReferences: string[];
  versionHistoryPolicy: string;
  content: string;
}

export function assertDraftExportPermitted(boundary: DraftExportBoundary): void {
  if (!boundary.permission) throw new Error("Draft export requires permission.");
  if (!boundary.redactionDecision || boundary.redactionDecision !== "REDACTED") throw new Error("Draft export requires a redaction decision.");
  if (!boundary.provenanceReferences || boundary.provenanceReferences.length === 0) throw new Error("Draft export requires provenance references.");
  if (!boundary.versionHistoryPolicy || boundary.versionHistoryPolicy !== "INCLUDE") throw new Error("Draft export requires version history inclusion policy.");
  const content = boundary.content.toLowerCase();
  if (content.includes("secret") || content.includes("password") || content.includes("token") || content.includes("credential") || content.includes("p0:") || content.includes("chain-of-thought") || content.includes("private user")) {
    throw new Error("Draft export must not expose secrets or private user content.");
  }
}

export function assertDraftResumeAllowed(input: {
  draft: SavedDraftLifecycleContract;
  versionChainValid: boolean;
  permissionsValid: boolean;
  scopeAccessible: boolean;
  provenanceValid: boolean;
  notDeleted: boolean;
  notSuperseded: boolean;
}): void {
  if (!input.draft || !input.draft.draftId) throw new Error("Draft must exist.");
  if (!input.notDeleted || input.draft.status === "DELETED") throw new Error("Deleted draft cannot resume.");
  if (!input.notSuperseded || input.draft.status === "SUPERSEDED") throw new Error("Superseded draft cannot resume.");
  if (!input.permissionsValid) throw new Error("Resume requires valid permissions.");
  if (!input.scopeAccessible) throw new Error("Resume requires accessible scope.");
  if (!input.provenanceValid) throw new Error("Resume requires valid provenance.");
  if (!input.versionChainValid) throw new Error("Resume requires a valid version chain.");
}

export function evaluateDraftResumeAndUpdate(input: {
  draft: SavedDraftLifecycleContract;
  currentVersion: DraftVersionContract;
  expectedVersionNumber: number;
  nextScopeHash: string;
  nextObjective: string;
  nextEvidenceReferences: string[];
  approvalStatus: "VALID" | "INVALID" | "PENDING" | "REVOKED";
  scopeComparison: DraftScopeChangeClassification;
}): { action: string; draftId: string; updatesCurrentDraft: boolean; createsNewVersion: boolean; nextVersionNumber: number } {
  if (input.currentVersion.versionNumber !== input.expectedVersionNumber) {
    throw new Error("Expected draft version mismatch.");
  }
  if (input.scopeComparison === "NO_CHANGE") {
    return { action: "UPDATE_CURRENT_VERSION", draftId: input.draft.draftId, updatesCurrentDraft: true, createsNewVersion: false, nextVersionNumber: input.currentVersion.versionNumber };
  }
  if (input.scopeComparison === "MATERIAL_SCOPE_CHANGE") {
    return { action: "CREATE_NEW_VERSION", draftId: input.draft.draftId, updatesCurrentDraft: false, createsNewVersion: true, nextVersionNumber: input.currentVersion.versionNumber + 1 };
  }
  return { action: "UPDATE_CURRENT_VERSION", draftId: input.draft.draftId, updatesCurrentDraft: true, createsNewVersion: false, nextVersionNumber: input.currentVersion.versionNumber };
}

export function assertValidDraftVersion(version: DraftVersionContract): void {
  if (version.versionNumber < 1) throw new Error("Version numbers must be monotonic.");
  if (version.versionNumber > 1 && !version.parentVersionId) throw new Error("Parent version required for versions after one.");
  if (version.versionNumber === 1 && version.parentVersionId) throw new Error("Version one must not have a parent version.");
}
