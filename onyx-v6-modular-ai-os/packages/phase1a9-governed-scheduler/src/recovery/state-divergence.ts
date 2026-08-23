export type StateDivergenceClassification =
  | "NO_DIVERGENCE"
  | "WORKFLOW_STATE_DIVERGENCE"
  | "RUNTIME_STATE_DIVERGENCE"
  | "TASK_STATE_DIVERGENCE"
  | "LEASE_STATE_DIVERGENCE"
  | "LOCK_STATE_DIVERGENCE"
  | "CHECKPOINT_STATE_DIVERGENCE"
  | "APPROVAL_STATE_DIVERGENCE"
  | "PERMISSION_STATE_DIVERGENCE"
  | "MEMORY_STATE_DIVERGENCE"
  | "CONNECTOR_STATE_DIVERGENCE"
  | "CONTEXT_STATE_DIVERGENCE"
  | "EVIDENCE_STATE_DIVERGENCE"
  | "MULTI_DOMAIN_DIVERGENCE"
  | "PROHIBITED_STATE";

export interface StateDivergenceInput {
  workflowStateDiverged: boolean;
  runtimeStateDiverged: boolean;
  checkpointStateDiverged?: boolean;
  approvalStateDiverged?: boolean;
  permissionStateDiverged?: boolean;
  memoryStateDiverged?: boolean;
  connectorStateDiverged?: boolean;
  contextStateDiverged?: boolean;
  evidenceStateDiverged?: boolean;
  stabilizationCompatible?: boolean;
}

export interface StateDivergenceResult {
  classification: StateDivergenceClassification;
  recommendedDisposition: "NO_DIVERGENCE" | "REDUCE_TO_S0" | "STOP_AND_RECONCILE" | "S4_STABILIZE_TWO";
  requiresReconciliation: boolean;
  denialReasons: readonly string[];
}

export function evaluateStateDivergence(input: StateDivergenceInput): StateDivergenceResult {
  const checkpoint = input.checkpointStateDiverged ?? false;
  const approval = input.approvalStateDiverged ?? false;
  const permission = input.permissionStateDiverged ?? false;
  const memory = input.memoryStateDiverged ?? false;
  const connector = input.connectorStateDiverged ?? false;
  const context = input.contextStateDiverged ?? false;
  const evidence = input.evidenceStateDiverged ?? false;

  const divergentFlags = [
    input.workflowStateDiverged,
    input.runtimeStateDiverged,
    checkpoint,
    approval,
    permission,
    memory,
    connector,
    context,
    evidence,
  ].filter(Boolean);

  if (divergentFlags.length === 0) {
    return {
      classification: "NO_DIVERGENCE",
      recommendedDisposition: input.stabilizationCompatible ? "S4_STABILIZE_TWO" : "NO_DIVERGENCE",
      requiresReconciliation: false,
      denialReasons: [],
    };
  }

  if (input.workflowStateDiverged && input.runtimeStateDiverged && checkpoint) {
    return {
      classification: "MULTI_DOMAIN_DIVERGENCE",
      recommendedDisposition: "REDUCE_TO_S0",
      requiresReconciliation: true,
      denialReasons: ["critical-divergence-detected"],
    };
  }

  let classification: StateDivergenceClassification = "WORKFLOW_STATE_DIVERGENCE";
  if (input.workflowStateDiverged) classification = "WORKFLOW_STATE_DIVERGENCE";
  else if (input.runtimeStateDiverged) classification = "RUNTIME_STATE_DIVERGENCE";
  else if (checkpoint) classification = "CHECKPOINT_STATE_DIVERGENCE";
  else if (approval) classification = "APPROVAL_STATE_DIVERGENCE";
  else if (permission) classification = "PERMISSION_STATE_DIVERGENCE";
  else if (memory) classification = "MEMORY_STATE_DIVERGENCE";
  else if (connector) classification = "CONNECTOR_STATE_DIVERGENCE";
  else if (context) classification = "CONTEXT_STATE_DIVERGENCE";
  else if (evidence) classification = "EVIDENCE_STATE_DIVERGENCE";
  else classification = "MULTI_DOMAIN_DIVERGENCE";

  const recommendedDisposition = input.stabilizationCompatible && divergentFlags.length <= 2 ? "S4_STABILIZE_TWO" : "REDUCE_TO_S0";

  return {
    classification,
    recommendedDisposition,
    requiresReconciliation: true,
    denialReasons: ["state-divergence-detected"],
  };
}
