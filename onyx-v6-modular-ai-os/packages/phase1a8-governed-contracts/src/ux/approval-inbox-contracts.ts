import { AUTOMATION_CENTER_V2_CONTRACT_VERSION } from "../shared/versions";
import { assertRiskClass } from "../shared/risk-classes";

export interface ApprovalCardContract {
  objective: string;
  scope: string;
  repository: string;
  branch: string;
  riskClass: string;
  actions: string[];
  tools: string[];
  cost: string;
  tokenBudget: string;
  connectorScopes: string[];
  memoryScopes: string[];
  externalSystems: string[];
  targetEnvironment: string;
  approvalExpiry: string;
  rollbackPath: string;
  recoveryPath: string;
  validationPlan: string;
  evidenceRequirement: string;
  freshApprovalRequirement: string;
  materialChangeStatus: string;
  prohibitionStatus: string;
  contractVersion: string;
}

export function createApprovalCard(input: Partial<ApprovalCardContract> & { objective?: string; scope?: string; repository?: string; branch?: string; riskClass?: string; actions?: string[]; tools?: string[]; cost?: string; tokenBudget?: string; connectorScopes?: string[]; memoryScopes?: string[]; externalSystems?: string[]; targetEnvironment?: string; approvalExpiry?: string; rollbackPath?: string; recoveryPath?: string; validationPlan?: string; evidenceRequirement?: string; freshApprovalRequirement?: string; materialChangeStatus?: string; prohibitionStatus?: string; contractVersion?: string }): ApprovalCardContract {
  const riskClass = input.riskClass ?? "R2";
  assertRiskClass(riskClass);
  return {
    objective: input.objective ?? "objective",
    scope: input.scope ?? "scope",
    repository: input.repository ?? "repo",
    branch: input.branch ?? "main",
    riskClass,
    actions: input.actions ?? ["read"],
    tools: input.tools ?? ["git"],
    cost: input.cost ?? "0.00",
    tokenBudget: input.tokenBudget ?? "0",
    connectorScopes: input.connectorScopes ?? ["github"],
    memoryScopes: input.memoryScopes ?? ["workspace"],
    externalSystems: input.externalSystems ?? ["github"],
    targetEnvironment: input.targetEnvironment ?? "development",
    approvalExpiry: input.approvalExpiry ?? "2026-01-02T00:00:00.000Z",
    rollbackPath: input.rollbackPath ?? "revert",
    recoveryPath: input.recoveryPath ?? "rollback",
    validationPlan: input.validationPlan ?? "run-tests",
    evidenceRequirement: input.evidenceRequirement ?? "MANDATORY",
    freshApprovalRequirement: input.freshApprovalRequirement ?? "R4",
    materialChangeStatus: input.materialChangeStatus ?? "NO_MATERIAL_CHANGE",
    prohibitionStatus: input.prohibitionStatus ?? "R5_PROHIBITED",
    contractVersion: input.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}

export interface ApprovalInboxProjection {
  cardIds: string[];
  pendingCount: number;
  urgentCount: number;
  contractVersion: string;
}

export function createApprovalInboxProjection(input: Partial<ApprovalInboxProjection> & { cardIds?: string[]; pendingCount?: number; urgentCount?: number; contractVersion?: string }): ApprovalInboxProjection {
  return {
    cardIds: input.cardIds ?? [],
    pendingCount: input.pendingCount ?? 0,
    urgentCount: input.urgentCount ?? 0,
    contractVersion: input.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}
