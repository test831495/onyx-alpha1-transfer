/**
 * LANE_C Operations Center projections.
 * Presentation-only: these builders never execute agents and never infer completion.
 */

import {
  CONTRACT_SCHEMA_VERSION,
  DEFAULT_FRESHNESS_LIMIT_MS,
  MAX_COLLECTION_SIZE,
  SEMANTIC_STATES,
  TEN_FOOT_MINIMUM_SCALE,
  WORLDS,
  deepFreeze,
  isBoundedString,
  isMember,
  isPlainObject,
  isUnitInterval,
  redactAccessibilityForSharedRoom,
  resolveConfidence,
  type AccessibilityProjection,
  type ApprovalPrivacyProjection,
  type CharacterId,
  type DeviceClass,
  type DevicePresenceProjection,
  type SemanticState,
  type WorldId,
  type WorldTransitionProjection,
} from "../../post-alpha-visible-presence-integration-contracts/src/index";

export type TaskStatus =
  | "UNKNOWN"
  | "PRIVACY_RESTRICTED"
  | "APPROVAL_REQUIRED"
  | "RECOVERING"
  | "FAILED"
  | "COMPLETE"
  | "IN_PROGRESS";

export type TaskFacts = Readonly<{
  id: string;
  requestedProgress: number;
  evidenceProgress: number;
  freshnessMs: number;
  privacyRestricted?: boolean;
  approvalRequired?: boolean;
  recovering?: boolean;
  failed?: boolean;
  freshnessLimitMs?: number;
}>;

export type TaskProjection = Readonly<{
  id: string;
  status: TaskStatus;
  progress: number;
  confidence: "VERIFIED" | "PROJECTED" | "UNKNOWN";
  evidenceBacked: boolean;
}>;

/**
 * Progress is clamped to verified evidence, so a requested or optimistic value can
 * never render as a completion the evidence does not support.
 */
export function projectTask(facts: unknown): TaskProjection {
  if (
    !isPlainObject(facts) ||
    !isBoundedString(facts["id"]) ||
    !isUnitInterval(facts["evidenceProgress"]) ||
    !isUnitInterval(facts["requestedProgress"]) ||
    typeof facts["freshnessMs"] !== "number"
  ) {
    return deepFreeze({
      id: isPlainObject(facts) && isBoundedString(facts["id"]) ? (facts["id"] as string) : "",
      status: "UNKNOWN",
      progress: 0,
      confidence: "UNKNOWN",
      evidenceBacked: false,
    });
  }

  const typed = facts as unknown as TaskFacts;
  const limit = typeof typed.freshnessLimitMs === "number" ? typed.freshnessLimitMs : DEFAULT_FRESHNESS_LIMIT_MS;
  const confidence = resolveConfidence(typed.freshnessMs, limit);
  const progress = Math.min(typed.requestedProgress, typed.evidenceProgress);

  const base = { id: typed.id, progress, confidence, evidenceBacked: confidence !== "UNKNOWN" };

  if (typed.privacyRestricted === true) {
    return deepFreeze({ ...base, status: "PRIVACY_RESTRICTED", progress: 0 });
  }
  if (typed.approvalRequired === true) {
    return deepFreeze({ ...base, status: "APPROVAL_REQUIRED" });
  }
  if (confidence === "UNKNOWN") {
    return deepFreeze({ ...base, status: "UNKNOWN", progress: 0, evidenceBacked: false });
  }
  if (typed.failed === true) return deepFreeze({ ...base, status: "FAILED" });
  if (typed.recovering === true) return deepFreeze({ ...base, status: "RECOVERING" });
  if (progress >= 1) return deepFreeze({ ...base, status: "COMPLETE" });
  return deepFreeze({ ...base, status: "IN_PROGRESS" });
}

export function projectAgentPresence(input: unknown): Readonly<{
  agentId: string;
  state: string;
  animationClass: "LIVELY" | "CALM" | "STATIC_ALIVE";
  grantsAuthority: false;
}> {
  const valid = isPlainObject(input) && isBoundedString(input["agentId"]) && isMember(SEMANTIC_STATES, input["state"]);
  const reducedMotion = isPlainObject(input) && input["reducedMotion"] === true;
  const state = valid ? (input["state"] as string) : "IDLE";
  return deepFreeze({
    agentId: valid ? (input["agentId"] as string) : "",
    state,
    animationClass: reducedMotion ? "STATIC_ALIVE" : state === "SPEAKING" ? "LIVELY" : "CALM",
    grantsAuthority: false as const,
  });
}

export function projectAgentHealth(freshnessMs: number, degraded: boolean): Readonly<{
  status: "HEALTHY" | "DEGRADED" | "UNKNOWN";
  confidence: string;
}> {
  const confidence = resolveConfidence(freshnessMs);
  if (confidence === "UNKNOWN") return deepFreeze({ status: "UNKNOWN", confidence });
  return deepFreeze({ status: degraded ? "DEGRADED" : "HEALTHY", confidence });
}

/** Shared-room mode emits coarse counts only, never per-task detail. */
export function buildOperationsCenterSnapshot(
  tasks: readonly unknown[],
  options: Readonly<{ sharedRoom?: boolean; cursor: number }>,
): Readonly<{
  cursor: number;
  bounded: boolean;
  sharedRoom: boolean;
  tasks: readonly TaskProjection[];
  summaryOnly: boolean;
  activeCount: number;
}> {
  const bounded = tasks.length <= MAX_COLLECTION_SIZE;
  const projected = tasks.slice(0, MAX_COLLECTION_SIZE).map(projectTask);
  const sharedRoom = options.sharedRoom === true;
  return deepFreeze({
    cursor: options.cursor,
    bounded,
    sharedRoom,
    tasks: sharedRoom ? [] : projected,
    summaryOnly: sharedRoom,
    activeCount: projected.filter((task) => task.status === "IN_PROGRESS").length,
  });
}

export function projectForTenFootTv(projection: TaskProjection): Readonly<{
  id: string;
  status: TaskStatus;
  colorIndependentLabel: string;
  safeZone: true;
  minimumScale: number;
}> {
  return deepFreeze({
    id: projection.id,
    status: projection.status,
    colorIndependentLabel: projection.status.replace(/_/g, " "),
    safeZone: true as const,
    minimumScale: 1.5,
  });
}

/* Deterministic builders over the LANE_A shared accessibility and device contracts. */

const FOCUS_LABELS: Readonly<Record<SemanticState, string>> = {
  IDLE: "idle and available",
  LISTENING: "listening",
  UNDERSTANDING: "understanding your request",
  THINKING: "thinking",
  SPEAKING: "speaking",
  APPROVAL_REQUIRED: "waiting for your approval",
  PRIVACY_RESTRICTED: "privacy restricted",
  RECOVERING: "recovering",
};

export type AccessibilityInputs = Readonly<{
  character: CharacterId;
  state: SemanticState;
  deviceClass: DeviceClass;
  targets: readonly string[];
  sourceVersion: number;
  freshnessMs: number;
  reducedMotion?: boolean;
  captionsEnabled?: boolean;
  sharedRoom?: boolean;
}>;

/** Builds a screen-reader and focus projection for any semantic state and device class. */
export function projectAccessibilityForState(inputs: AccessibilityInputs): AccessibilityProjection {
  const tv = inputs.deviceClass === "tv";
  const handheld = inputs.deviceClass === "mobile" || inputs.deviceClass === "tablet";
  const targets = inputs.targets.length > 0 ? inputs.targets : ["root"];
  const first = targets[0] ?? "root";
  const second = targets[1] ?? first;

  const projection: AccessibilityProjection = {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    reducedMotion: inputs.reducedMotion === true,
    captionsEnabled: inputs.captionsEnabled !== false,
    screenReaderLabel: `${inputs.character} presence`,
    screenReaderDescription: `${inputs.character} is ${FOCUS_LABELS[inputs.state]}`,
    colorIndependentStateLabel: inputs.state,
    keyboardFocusTarget: first,
    keyboardFocusOrder: [...targets],
    remoteFocusTarget: tv ? second : first,
    remoteFocusOrder: tv ? [second, ...targets.filter((t) => t !== second)] : [...targets],
    focusVisible: true,
    tvSafeZone: tv,
    minimumScale: tv ? TEN_FOOT_MINIMUM_SCALE : handheld ? 1.2 : 1,
    readabilityClass: tv ? "TEN_FOOT" : handheld ? "HANDHELD" : "DESKTOP",
    sharedRoomPrivacyMode: false,
    flashingPolicy: "NO_FLASHING",
    liveRegionPoliteness: inputs.state === "APPROVAL_REQUIRED" ? "ASSERTIVE" : "POLITE",
    languageTag: "en-GB",
    sourceVersion: inputs.sourceVersion,
    freshnessMs: inputs.freshnessMs,
  };

  return deepFreeze(inputs.sharedRoom === true ? redactAccessibilityForSharedRoom(projection) : projection);
}

export function projectApprovalPrivacy(
  facts: Readonly<{ approvalRequired: boolean; privacyRestricted: boolean }>,
): ApprovalPrivacyProjection {
  const effective = facts.privacyRestricted ? "PRIVACY_RESTRICTED" : facts.approvalRequired ? "APPROVAL_REQUIRED" : "NONE";
  return deepFreeze({
    approvalRequired: facts.approvalRequired,
    privacyRestricted: facts.privacyRestricted,
    effective,
    grantsAuthority: false as const,
  });
}

/** Reduced motion collapses a world transition to an instant, fully complete fallback. */
export function buildWorldTransitionProjection(
  inputs: Readonly<{ from: WorldId; to: WorldId; progress: number; reducedMotion: boolean }>,
): WorldTransitionProjection {
  if (!isMember(WORLDS, inputs.from) || !isMember(WORLDS, inputs.to)) {
    return deepFreeze({ from: "OPERATIONS_CENTER", to: null, phase: "UNKNOWN", progress: 0, reducedMotionFallback: false });
  }
  if (inputs.reducedMotion) {
    return deepFreeze({ from: inputs.from, to: inputs.to, phase: "INSTANT_FALLBACK", progress: 1, reducedMotionFallback: true });
  }
  const progress = isUnitInterval(inputs.progress) ? inputs.progress : 0;
  return deepFreeze({
    from: inputs.from,
    to: inputs.to,
    phase: progress >= 1 ? "COMPLETE" : progress <= 0 ? "IDLE" : "IN_PROGRESS",
    progress,
    reducedMotionFallback: false,
  });
}

export type DeviceProjectionInputs = Readonly<{
  deviceId: string;
  deviceClass: DeviceClass;
  character: CharacterId;
  state: SemanticState;
  avatarId: string;
  avatarVersion: number;
  targets: readonly string[];
  sourceVersion: number;
  freshnessMs: number;
  utteranceId?: string;
  reducedMotion?: boolean;
  sharedRoom?: boolean;
  approvalRequired?: boolean;
  privacyRestricted?: boolean;
}>;

export function buildDevicePresenceProjection(inputs: DeviceProjectionInputs): DevicePresenceProjection {
  return deepFreeze({
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    deviceId: inputs.deviceId,
    deviceClass: inputs.deviceClass,
    character: inputs.character,
    state: inputs.state,
    avatarId: inputs.avatarId,
    avatarVersion: inputs.avatarVersion,
    accessibility: projectAccessibilityForState({
      character: inputs.character,
      state: inputs.state,
      deviceClass: inputs.deviceClass,
      targets: inputs.targets,
      sourceVersion: inputs.sourceVersion,
      freshnessMs: inputs.freshnessMs,
      reducedMotion: inputs.reducedMotion,
      sharedRoom: inputs.sharedRoom,
    }),
    captionRef: inputs.utteranceId ?? null,
    approvalPrivacy: projectApprovalPrivacy({
      approvalRequired: inputs.approvalRequired === true || inputs.state === "APPROVAL_REQUIRED",
      privacyRestricted: inputs.privacyRestricted === true || inputs.state === "PRIVACY_RESTRICTED",
    }),
    grantsAuthority: false as const,
  });
}
