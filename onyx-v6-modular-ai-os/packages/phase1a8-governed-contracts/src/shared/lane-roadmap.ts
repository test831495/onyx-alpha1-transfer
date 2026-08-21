import { ACTIVE_PHASE1A8_RUNTIME_LIMIT } from "./versions";

export const EARLY_PARALLEL_LIMIT = 4 as const;
export const POST_CONTRACT_FREEZE_LIMIT = 6 as const;
export const ALPHA_STABLE_LIMIT = 8 as const;
export const STABILIZATION_LIMIT = 2 as const;
export const PROMOTION_LANE_LIMIT = 1 as const;

if (PROMOTION_LANE_LIMIT !== 1) {
  throw new Error("Promotion lane limit must remain exactly 1.");
}
if (ACTIVE_PHASE1A8_RUNTIME_LIMIT > EARLY_PARALLEL_LIMIT) {
  throw new Error("Active Phase 1A.8 runtime limit must not exceed the lane roadmap.");
}

export type LaneRoadmapStage = "EARLY_PARALLEL" | "POST_CONTRACT_FREEZE" | "ALPHA_STABLE" | "STABILIZATION";

export const LANE_ROADMAP_PREREQUISITES: Record<LaneRoadmapStage, readonly string[]> = {
  EARLY_PARALLEL: [
    "All Track A contracts validated (identity, capability, task, lease, heartbeat, recovery, dependency graph, locks, CAS, evidence, cancellation, join, aggregation)",
    "Read-only and isolated-compute parallel classes proven in simulation",
    "Zero live mutation",
  ],
  POST_CONTRACT_FREEZE: [
    "Track B contracts validated (memory tiers, context assembly, poisoning protection, persona protection)",
    "Connector isolation and budgets validated",
    "One full mock-simulation cycle accepted",
  ],
  ALPHA_STABLE: [
    "Automation Center V2 UX implemented",
    "Accessibility gates passed",
    "Bounded scheduler stable at 6 lanes for a defined soak period",
    "Council Mode and Saved Draft validated",
  ],
  STABILIZATION: [
    "Triggered only by instability at 8 lanes",
    "Root-cause and reconciliation completed before re-increasing",
  ],
};

/** Phase 1A.8 must never increase the active runtime lane limit above 1. */
export function assertActiveRuntimeLimitFrozen(limit: number): void {
  if (limit !== ACTIVE_PHASE1A8_RUNTIME_LIMIT) {
    throw new Error("Phase 1A.8 must not increase the active runtime lane limit.");
  }
}
