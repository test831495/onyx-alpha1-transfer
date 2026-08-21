import type { RiskClass } from "./risk-classes";
import { assertNotProhibited } from "./risk-classes";

export const APPROVAL_CONSUMED_STATES = ["UNCONSUMED", "CONSUMED"] as const;
export type ApprovalConsumedState = (typeof APPROVAL_CONSUMED_STATES)[number];

export interface ApprovalScope {
  approvedActions: string[];
  approvedTools: string[];
  approvedFiles: string[];
  approvedBranch: string;
  approvedTargetEnvironment: string;
  approvedExternalSystems: string[];
  approvedConnectorScopes: string[];
  approvedPermissionScopes: string[];
  approvedMemoryScopes: string[];
  approvedModelRoutingClasses: string[];
  approvedTokenBudget: number;
  approvedCostBudget: number;
  taskDependencyIds: string[];
  riskClass: RiskClass;
  promotionEligible: boolean;
  policyPinnedAgentId?: string;
}

export interface ApprovalPolicy extends ApprovalScope {
  scopeHash: string;
  approvalId: string;
  workflowId: string;
  policyVersion: string;
  approvalReason: string;
  issuedAt: string;
  expiresAt: string;
  consumedState: ApprovalConsumedState;
  approverId: string;
  evidenceReferences: string[];
}

export function extractApprovalScope(policy: ApprovalPolicy): ApprovalScope {
  const { scopeHash, approvalId, workflowId, policyVersion, approvalReason, issuedAt, expiresAt, consumedState, approverId, evidenceReferences, ...scope } =
    policy;
  return scope;
}

export const MATERIAL_CHANGE_FIELDS = [
  "files",
  "actions",
  "tools",
  "branch",
  "targetEnvironment",
  "externalSystems",
  "connectorAccount",
  "permissionScope",
  "memoryScope",
  "modelRoutingClass",
  "tokenBudget",
  "costBudget",
  "taskDependencySet",
  "riskClass",
  "promotionEligibility",
  "policyPinnedAgentIdentity",
] as const;
export type MaterialChangeField = (typeof MATERIAL_CHANGE_FIELDS)[number];

function sameSet(a: readonly string[], b: readonly string[]): boolean {
  if (a.length !== b.length) return false;
  const sortedA = [...a].sort();
  const sortedB = [...b].sort();
  return sortedA.every((value, index) => value === sortedB[index]);
}

/** Detects every material-change category between two approval scopes; never silently ignores a change. */
export function classifyMaterialChange(prior: ApprovalScope, next: ApprovalScope): MaterialChangeField[] {
  const changes: MaterialChangeField[] = [];
  if (!sameSet(prior.approvedFiles, next.approvedFiles)) changes.push("files");
  if (!sameSet(prior.approvedActions, next.approvedActions)) changes.push("actions");
  if (!sameSet(prior.approvedTools, next.approvedTools)) changes.push("tools");
  if (prior.approvedBranch !== next.approvedBranch) changes.push("branch");
  if (prior.approvedTargetEnvironment !== next.approvedTargetEnvironment) changes.push("targetEnvironment");
  if (!sameSet(prior.approvedExternalSystems, next.approvedExternalSystems)) changes.push("externalSystems");
  if (!sameSet(prior.approvedConnectorScopes, next.approvedConnectorScopes)) changes.push("connectorAccount");
  if (!sameSet(prior.approvedPermissionScopes, next.approvedPermissionScopes)) changes.push("permissionScope");
  if (!sameSet(prior.approvedMemoryScopes, next.approvedMemoryScopes)) changes.push("memoryScope");
  if (!sameSet(prior.approvedModelRoutingClasses, next.approvedModelRoutingClasses)) changes.push("modelRoutingClass");
  if (prior.approvedTokenBudget !== next.approvedTokenBudget) changes.push("tokenBudget");
  if (prior.approvedCostBudget !== next.approvedCostBudget) changes.push("costBudget");
  if (!sameSet(prior.taskDependencyIds, next.taskDependencyIds)) changes.push("taskDependencySet");
  if (prior.riskClass !== next.riskClass) changes.push("riskClass");
  if (prior.promotionEligible !== next.promotionEligible) changes.push("promotionEligibility");
  if (prior.policyPinnedAgentId !== next.policyPinnedAgentId) changes.push("policyPinnedAgentIdentity");
  return changes;
}

export function isApprovalInvalidated(prior: ApprovalScope, next: ApprovalScope): boolean {
  return classifyMaterialChange(prior, next).length > 0;
}

export function isApprovalExpired(policy: Pick<ApprovalPolicy, "expiresAt">, now: Date): boolean {
  return now.getTime() >= Date.parse(policy.expiresAt);
}

/** R4 requires a fresh approval issued immediately before execution; R5 is always rejected. */
export function assertFreshApproval(policy: ApprovalPolicy, now: Date, maxAgeMsForR4: number): void {
  assertNotProhibited(policy.riskClass);
  if (policy.consumedState === "CONSUMED") {
    throw new Error("Approval has already been consumed.");
  }
  if (isApprovalExpired(policy, now)) {
    throw new Error("Approval has expired.");
  }
  if (policy.riskClass === "R4") {
    const ageMs = now.getTime() - Date.parse(policy.issuedAt);
    if (ageMs > maxAgeMsForR4) {
      throw new Error("R4 requires a fresh approval issued immediately before execution.");
    }
  }
}
