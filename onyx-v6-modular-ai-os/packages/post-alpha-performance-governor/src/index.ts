/**
 * LANE_E Performance Governor.
 * Pure tier policy over supplied signals. No browser APIs, no telemetry upload.
 */

import { PERFORMANCE_TIERS, deepFreeze, isPlainObject } from "../../post-alpha-visible-presence-integration-contracts/src/index";

export type PerformanceTier = (typeof PERFORMANCE_TIERS)[number];

const TIER_LADDER: readonly PerformanceTier[] = PERFORMANCE_TIERS;
const REDUCED_MOTION_INDEX = 3;
const FALLBACK_INDEX = 4;

/** Ordered degradation steps, applied before the final static-but-alive fallback. */
export const DEGRADATION_ORDER = [
  "REDUCE_DECORATIVE_PARTICLES",
  "LOWER_AMBIENT_EFFECT_DENSITY",
  "REDUCE_MINI_AGENT_COMPLEXITY",
  "REDUCE_WORLD_VIDEO_QUALITY",
  "REDUCE_SECONDARY_MOTION",
  "LIGHTWEIGHT_RIVE_STATES",
  "REDUCED_MOTION_PRESENTATION",
  "STATIC_ALIVE_PROJECTION",
] as const;

export type PerformanceSignals = Readonly<{
  fps: number;
  frameTimeMs: number;
  reducedMotion: boolean;
  tv: boolean;
  memoryPressure: boolean;
  networkOffline?: boolean;
  journalPressure?: boolean;
  activeAvatarCount?: number;
  activeMiniAgentCount?: number;
  stableSamples?: number;
}>;

export type TierDecision = Readonly<{
  tier: PerformanceTier;
  reasons: readonly string[];
  degradationSteps: readonly string[];
  reducedMotionCeiling: boolean;
  semanticStatePreserved: true;
  alive: true;
}>;

function tierAt(index: number): PerformanceTier {
  const clamped = Math.min(Math.max(index, 0), TIER_LADDER.length - 1);
  return TIER_LADDER[clamped] ?? "STATIC_ALIVE_FALLBACK";
}

function indexOfTier(tier: unknown): number {
  const found = TIER_LADDER.indexOf(tier as PerformanceTier);
  return found === -1 ? 0 : found;
}

/**
 * Degradation applies immediately; recovery requires sustained healthy samples and
 * moves at most one tier per decision so the presentation cannot oscillate.
 */
export function choosePerformanceTier(signals: unknown, previousTier: unknown): TierDecision {
  if (!isPlainObject(signals) || typeof signals["fps"] !== "number" || typeof signals["frameTimeMs"] !== "number") {
    return deepFreeze({
      tier: "STATIC_ALIVE_FALLBACK",
      reasons: ["MALFORMED_SIGNALS"],
      degradationSteps: [...DEGRADATION_ORDER],
      reducedMotionCeiling: false,
      semanticStatePreserved: true as const,
      alive: true as const,
    });
  }

  const typed = signals as unknown as PerformanceSignals;
  const reasons: string[] = [];
  let pressure = 0;

  if (typed.fps < 24 || typed.frameTimeMs > 40) {
    pressure += 3;
    reasons.push("SEVERE_FRAME_PRESSURE");
  } else if (typed.fps < 40 || typed.frameTimeMs > 28) {
    pressure += 2;
    reasons.push("MODERATE_FRAME_PRESSURE");
  } else if (typed.fps < 55 || typed.frameTimeMs > 20) {
    pressure += 1;
    reasons.push("MILD_FRAME_PRESSURE");
  }

  if (typed.memoryPressure) {
    pressure += 1;
    reasons.push("MEMORY_PRESSURE");
  }
  if (typed.journalPressure === true) {
    pressure += 1;
    reasons.push("JOURNAL_PRESSURE");
  }
  if (typed.tv && (typed.activeMiniAgentCount ?? 0) > 12) {
    pressure += 1;
    reasons.push("TV_AGENT_DENSITY");
  }
  if (typed.networkOffline === true) reasons.push("OFFLINE_PRESENTATION_RETAINED");

  let target = Math.min(pressure, FALLBACK_INDEX);

  const reducedMotionCeiling = typed.reducedMotion === true;
  if (reducedMotionCeiling) {
    target = Math.max(target, REDUCED_MOTION_INDEX);
    reasons.push("REDUCED_MOTION_CEILING");
  }

  const previousIndex = indexOfTier(previousTier);
  let finalIndex = target;

  if (target < previousIndex) {
    const stable = typed.stableSamples ?? 0;
    finalIndex = stable >= 2 ? previousIndex - 1 : previousIndex;
    reasons.push(stable >= 2 ? "BOUNDED_RECOVERY" : "HYSTERESIS_HOLD");
  }

  if (reducedMotionCeiling) finalIndex = Math.max(finalIndex, REDUCED_MOTION_INDEX);

  return deepFreeze({
    tier: tierAt(finalIndex),
    reasons,
    degradationSteps: DEGRADATION_ORDER.slice(0, finalIndex + (finalIndex === FALLBACK_INDEX ? 4 : 3)),
    reducedMotionCeiling,
    semanticStatePreserved: true as const,
    alive: true as const,
  });
}

/** Privacy and approval treatments are never dimmed away by a degraded tier. */
export function tierPreservesCriticalStates(tier: PerformanceTier): Readonly<{
  privacyVisible: true;
  approvalVisible: true;
  tier: PerformanceTier;
}> {
  return deepFreeze({ privacyVisible: true as const, approvalVisible: true as const, tier });
}
