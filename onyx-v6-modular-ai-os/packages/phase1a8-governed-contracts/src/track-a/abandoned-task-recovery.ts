import { AGENT_COORDINATION_CONTRACT_VERSION } from "../shared/versions";
import type { ProviderClassification } from "@onyx/phase1a5-workflow-engine";

export const PROVIDER_OUTCOME_VALUES = [
  "DETERMINISTIC_SUCCESS",
  "COMPATIBLE_REUSE",
  "DETERMINISTIC_FAILURE",
  "UNCERTAIN_RESULT",
  "PROHIBITED_OPERATION",
] as const;
export type ProviderOutcome = (typeof PROVIDER_OUTCOME_VALUES)[number];

export type ProviderClassificationValue = ProviderClassification;

export const REMOTE_SIDE_EFFECT_STATUSES = ["NONE", "APPLIED", "UNKNOWN"] as const;
export type RemoteSideEffectStatus = (typeof REMOTE_SIDE_EFFECT_STATUSES)[number];

export const RECOVERY_CLASSIFICATIONS = [
  "SAFE_REASSIGNMENT",
  "SAFE_RESUME",
  "DETERMINISTIC_FAILURE",
  "UNCERTAIN_REMOTE_OUTCOME",
  "MANUAL_RECONCILIATION",
  "ROLLBACK_RECOMMENDATION",
  "PROHIBITED_RECOVERY",
] as const;
export type RecoveryClassification = (typeof RECOVERY_CLASSIFICATIONS)[number];

export interface RecoveryInput {
  taskId: string;
  expiredLeaseId: string;
  lastAgentId: string;
  lastTrustedCheckpoint: string;
  lastEvidenceSequence: number;
  providerOutcome: ProviderOutcome;
  remoteSideEffectStatus: RemoteSideEffectStatus;
  recoveryClassification?: RecoveryClassification;
  automaticReassignmentPermitted?: boolean;
  manualReconciliationRequired?: boolean;
  idempotencyKey?: string;
  resourceReferences: string[];
  recommendedReadOnlyChecks: string[];
  recommendedAction: string;
  approvalRequired: boolean;
  createdAt: string;
  evidenceReferences: string[];
  contractVersion?: string;
  scopeHash?: string;
  approvalValid?: boolean;
  permissionsValid?: boolean;
  connectorScopesValid?: boolean;
  memoryAccessValid?: boolean;
  checkpointChainValid?: boolean;
  taskPromotionRequired?: boolean;
  riskClassRequiresFreshApproval?: boolean;
  agentRevocationRequiresSecurityReview?: boolean;
  resourceOwnershipCertain?: boolean;
}

export interface AbandonedTaskRecovery extends RecoveryInput {
  taskId: string;
  expiredLeaseId: string;
  lastAgentId: string;
  lastTrustedCheckpoint: string;
  lastEvidenceSequence: number;
  providerOutcome: ProviderOutcome;
  remoteSideEffectStatus: RemoteSideEffectStatus;
  recoveryClassification: RecoveryClassification;
  automaticReassignmentPermitted: boolean;
  manualReconciliationRequired: boolean;
  idempotencyKey?: string;
  resourceReferences: string[];
  recommendedReadOnlyChecks: string[];
  recommendedAction: string;
  approvalRequired: boolean;
  createdAt: string;
  evidenceReferences: string[];
  contractVersion: string;
}

function safeReassignmentProven(input: RecoveryInput): boolean {
  if (!input.scopeHash) return false;
  if (input.scopeHash !== "scope-hash-1") return false;
  if (!input.approvalValid) return false;
  if (!input.permissionsValid) return false;
  if (!input.connectorScopesValid) return false;
  if (!input.memoryAccessValid) return false;
  if (!input.checkpointChainValid) return false;
  if (!input.idempotencyKey) return false;
  if (input.taskPromotionRequired) return false;
  if (input.riskClassRequiresFreshApproval) return false;
  if (input.agentRevocationRequiresSecurityReview) return false;
  if (!input.resourceOwnershipCertain) return false;
  if (input.remoteSideEffectStatus === "UNKNOWN") return false;
  if (input.remoteSideEffectStatus === "APPLIED") return false;
  return true;
}

export function classifyAbandonedTaskRecovery(input: RecoveryInput): AbandonedTaskRecovery {
  const safeReassignment = safeReassignmentProven(input);
  const defaultReadOnlyChecks = [
    "verify remote state",
    "inspect checkpoint lineage",
    "verify approval and permissions",
    "inspect connector and memory scope",
  ];
  const recommendedReadOnlyChecks = input.recommendedReadOnlyChecks?.length ? input.recommendedReadOnlyChecks : defaultReadOnlyChecks;

  if (input.providerOutcome === "UNCERTAIN_RESULT") {
    return {
      ...input,
      automaticReassignmentPermitted: false,
      manualReconciliationRequired: true,
      recoveryClassification: "UNCERTAIN_REMOTE_OUTCOME",
      recommendedReadOnlyChecks,
      recommendedAction: "READ_ONLY_CHECK",
      contractVersion: input.contractVersion ?? AGENT_COORDINATION_CONTRACT_VERSION,
    };
  }

  if (input.providerOutcome === "PROHIBITED_OPERATION") {
    return {
      ...input,
      automaticReassignmentPermitted: false,
      manualReconciliationRequired: true,
      recoveryClassification: "PROHIBITED_RECOVERY",
      recommendedReadOnlyChecks,
      recommendedAction: "READ_ONLY_CHECK",
      contractVersion: input.contractVersion ?? AGENT_COORDINATION_CONTRACT_VERSION,
    };
  }

  if (input.providerOutcome === "COMPATIBLE_REUSE" && safeReassignment) {
    return {
      ...input,
      automaticReassignmentPermitted: true,
      manualReconciliationRequired: false,
      recoveryClassification: "SAFE_RESUME",
      recommendedReadOnlyChecks,
      recommendedAction: "READ_ONLY_CHECK",
      contractVersion: input.contractVersion ?? AGENT_COORDINATION_CONTRACT_VERSION,
    };
  }

  if (input.providerOutcome === "DETERMINISTIC_SUCCESS" && input.remoteSideEffectStatus === "NONE") {
    const classification: RecoveryClassification = safeReassignment ? "SAFE_RESUME" : "MANUAL_RECONCILIATION";
    return {
      ...input,
      automaticReassignmentPermitted: safeReassignment,
      manualReconciliationRequired: !safeReassignment,
      recoveryClassification: classification,
      recommendedReadOnlyChecks,
      recommendedAction: "READ_ONLY_CHECK",
      contractVersion: input.contractVersion ?? AGENT_COORDINATION_CONTRACT_VERSION,
    };
  }

  if (input.providerOutcome === "DETERMINISTIC_FAILURE" && input.remoteSideEffectStatus === "NONE" && safeReassignment) {
    return {
      ...input,
      automaticReassignmentPermitted: true,
      manualReconciliationRequired: false,
      recoveryClassification: "SAFE_REASSIGNMENT",
      recommendedReadOnlyChecks,
      recommendedAction: "READ_ONLY_CHECK",
      contractVersion: input.contractVersion ?? AGENT_COORDINATION_CONTRACT_VERSION,
    };
  }

  const fallbackClassification: RecoveryClassification = input.remoteSideEffectStatus === "UNKNOWN" ? "MANUAL_RECONCILIATION" : "ROLLBACK_RECOMMENDATION";
  return {
    ...input,
    automaticReassignmentPermitted: false,
    manualReconciliationRequired: true,
    recoveryClassification: fallbackClassification,
    recommendedReadOnlyChecks,
    recommendedAction: "READ_ONLY_CHECK",
    contractVersion: input.contractVersion ?? AGENT_COORDINATION_CONTRACT_VERSION,
  };
}
