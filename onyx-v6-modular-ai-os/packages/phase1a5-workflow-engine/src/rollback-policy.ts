import type { RollbackClassification, RollbackPolicyResult } from "./contracts";

export const ROLLBACK_POLICY_ACTIONS = ["document escalation", "persist evidence", "notify manual reviewer"] as const;

export function classifyRollback(workflowId: string, stepId: string, reason: string, evidenceReferences: string[] = []): RollbackPolicyResult {
  const classification: RollbackClassification = "COMPENSATING_ACTION_RECOMMENDED";
  return {
    workflowId,
    stepId,
    classification,
    reason,
    recommendedCompensatingActions: [...ROLLBACK_POLICY_ACTIONS],
    remoteDeletionPermitted: false,
    forcePushPermitted: false,
    mergePermitted: false,
    productionActionPermitted: false,
    evidenceReferences,
    timestamp: new Date().toISOString(),
  };
}

export function assertSupportedCompensatingAction(action: string): void {
  if (!ROLLBACK_POLICY_ACTIONS.includes(action as (typeof ROLLBACK_POLICY_ACTIONS)[number])) {
    throw new Error(`Unsupported compensating action: ${action}`);
  }
}
