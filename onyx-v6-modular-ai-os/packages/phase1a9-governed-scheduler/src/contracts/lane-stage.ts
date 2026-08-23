import { PHASE1A9_LANE_CONTRACT_VERSION } from "../shared/versions";
export const LANE_STAGES = ["S0_SINGLE", "S1_FOUR", "S2_SIX", "S3_EIGHT", "S4_STABILIZE_TWO", "S5_PROMOTE_ONE"] as const;
export type LaneStage = (typeof LANE_STAGES)[number];
export const LANE_MAXIMA: Record<LaneStage, number> = { S0_SINGLE: 1, S1_FOUR: 4, S2_SIX: 6, S3_EIGHT: 8, S4_STABILIZE_TWO: 2, S5_PROMOTE_ONE: 1 };
export const LANE_DECISIONS = ["ALLOWED", "DENIED", "REQUIRES_EVIDENCE", "REQUIRES_APPROVAL", "REQUIRES_RECONCILIATION", "PROHIBITED"] as const;
export type LaneStageDecisionValue = (typeof LANE_DECISIONS)[number];
export interface LaneStageDecision { laneStageDecisionId: string; currentStage: LaneStage; requestedStage: LaneStage; currentMaximum: number; requestedMaximum: number; entryGateIds: readonly string[]; evidenceIds: readonly string[]; approvalRequired: boolean; approvalId?: string; decision: LaneStageDecisionValue; denialReasons: readonly string[]; fallbackStage: LaneStage; decidedAt: string; contractVersion: string; }
export function assertLaneStageDecision(decision: LaneStageDecision): void {
  if (decision.contractVersion !== PHASE1A9_LANE_CONTRACT_VERSION || decision.currentMaximum !== LANE_MAXIMA[decision.currentStage] || decision.requestedMaximum !== LANE_MAXIMA[decision.requestedStage]) throw new Error("Invalid lane-stage decision.");
  if (decision.currentStage === "S0_SINGLE" && decision.requestedStage !== "S0_SINGLE" && decision.decision === "ALLOWED") throw new Error("Wave 1 denies every stage change away from S0_SINGLE.");
  if (decision.requestedStage === "S5_PROMOTE_ONE" && decision.requestedMaximum !== 1) throw new Error("Promotion must remain serialized.");
}
export function evaluateWave1StageChange(currentStage: LaneStage, requestedStage: LaneStage): LaneStageDecisionValue { return currentStage === requestedStage ? "ALLOWED" : "DENIED"; }