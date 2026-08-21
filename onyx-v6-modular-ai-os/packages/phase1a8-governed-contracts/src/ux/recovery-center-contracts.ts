import { AUTOMATION_CENTER_V2_CONTRACT_VERSION } from "../shared/versions";

export interface RecoveryOperationProjection {
  enabled: boolean;
  reason?: string;
}

export interface RecoveryCenterProjection {
  retry: RecoveryOperationProjection;
  resume: RecoveryOperationProjection;
  reconcile: RecoveryOperationProjection;
  rollback: RecoveryOperationProjection;
  compensation: RecoveryOperationProjection;
  escalation: RecoveryOperationProjection;
  latestTrustedCheckpoint: string;
  externalState: string;
  workflowJournal: string[];
  evidenceLinks: string[];
  approvalRequirements: string[];
  riskClass: string;
  connectorScope: string;
  memoryImpact: string;
  budgetImpact: string;
  lastAgent: string;
  lastLease: string;
  uncertainOperation: boolean;
  idempotencyKey: string;
  resourceReferences: string[];
  recommendedReadOnlyChecks: string[];
  automaticRetryPermitted: boolean;
  contractVersion: string;
}

export function createRecoveryCenterProjection(input: Partial<RecoveryCenterProjection> & { retry?: RecoveryOperationProjection; resume?: RecoveryOperationProjection; reconcile?: RecoveryOperationProjection; rollback?: RecoveryOperationProjection; compensation?: RecoveryOperationProjection; escalation?: RecoveryOperationProjection; latestTrustedCheckpoint?: string; externalState?: string; workflowJournal?: string[]; evidenceLinks?: string[]; approvalRequirements?: string[]; riskClass?: string; connectorScope?: string; memoryImpact?: string; budgetImpact?: string; lastAgent?: string; lastLease?: string; uncertainOperation?: boolean; idempotencyKey?: string; resourceReferences?: string[]; recommendedReadOnlyChecks?: string[]; automaticRetryPermitted?: boolean; contractVersion?: string }): RecoveryCenterProjection {
  const retry = input.retry ?? { enabled: false, reason: "uncertain remote mutation" };
  const resume = input.resume ?? { enabled: true };
  const reconcile = input.reconcile ?? { enabled: false };
  const rollback = input.rollback ?? { enabled: false };
  const compensation = input.compensation ?? { enabled: false };
  const escalation = input.escalation ?? { enabled: false };
  if (retry.enabled && input.uncertainOperation === true) {
    throw new Error("Uncertain remote mutation must disable automatic retry.");
  }
  return {
    retry,
    resume,
    reconcile,
    rollback,
    compensation,
    escalation,
    latestTrustedCheckpoint: input.latestTrustedCheckpoint ?? "cp-1",
    externalState: input.externalState ?? "remote-ok",
    workflowJournal: input.workflowJournal ?? ["step-1"],
    evidenceLinks: input.evidenceLinks ?? ["ev-1"],
    approvalRequirements: input.approvalRequirements ?? ["fresh approval"],
    riskClass: input.riskClass ?? "R2",
    connectorScope: input.connectorScope ?? "github",
    memoryImpact: input.memoryImpact ?? "low",
    budgetImpact: input.budgetImpact ?? "0.00",
    lastAgent: input.lastAgent ?? "agent-1",
    lastLease: input.lastLease ?? "lease-1",
    uncertainOperation: input.uncertainOperation ?? false,
    idempotencyKey: input.idempotencyKey ?? "idem-1",
    resourceReferences: input.resourceReferences ?? ["resource-1"],
    recommendedReadOnlyChecks: input.recommendedReadOnlyChecks ?? ["check-1"],
    automaticRetryPermitted: input.automaticRetryPermitted ?? !retry.enabled,
    contractVersion: input.contractVersion ?? AUTOMATION_CENTER_V2_CONTRACT_VERSION,
  };
}
