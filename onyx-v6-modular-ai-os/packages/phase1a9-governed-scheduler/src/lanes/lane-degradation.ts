import type { LaneStage } from "../contracts/lane-stage";

export type LaneDegradationReason =
  | "NO_REDUCTION"
  | "REDUCE_TO_S4"
  | "REDUCE_TO_S0"
  | "STOP_AND_RECONCILE"
  | "PROHIBITED_CONTINUATION";

export interface LaneDegradationDecision {
  fallbackStage: LaneStage;
  decision: LaneDegradationReason;
  reasonCodes: readonly string[];
}

export function evaluateLaneDegradation(input: {
  resourceCollision?: boolean;
  workflowDivergence?: boolean;
  runtimeDivergence?: boolean;
  checkpointConflict?: boolean;
  evidenceGap?: boolean;
  approvalConflict?: boolean;
  permissionConflict?: boolean;
  memoryConflict?: boolean;
  connectorConflict?: boolean;
  budgetHardStop?: boolean;
  recoveryFailure?: boolean;
  securityFailure?: boolean;
  stabilizationCompatible?: boolean;
  promotionConflict?: boolean;
}): LaneDegradationDecision {
  if (input.resourceCollision || input.workflowDivergence || input.runtimeDivergence || input.checkpointConflict || input.evidenceGap || input.approvalConflict || input.permissionConflict || input.memoryConflict || input.connectorConflict || input.budgetHardStop || input.recoveryFailure || input.securityFailure || input.promotionConflict) {
    return { fallbackStage: "S0_SINGLE", decision: "REDUCE_TO_S0", reasonCodes: ["critical-uncertainty"] };
  }
  if (input.stabilizationCompatible) {
    return { fallbackStage: "S4_STABILIZE_TWO", decision: "REDUCE_TO_S4", reasonCodes: ["stabilization-compatible"] };
  }
  return { fallbackStage: "S0_SINGLE", decision: "NO_REDUCTION", reasonCodes: [] };
}
