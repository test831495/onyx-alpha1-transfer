/**
 * LANE_A shared Train 2 integration contracts.
 * Pure, provider-neutral, fail-closed. No I/O, no ambient time, no authority.
 */

export const CONTRACT_SCHEMA_VERSION = "t2.v1";

export const SEMANTIC_STATES = [
  "IDLE",
  "LISTENING",
  "UNDERSTANDING",
  "THINKING",
  "SPEAKING",
  "APPROVAL_REQUIRED",
  "PRIVACY_RESTRICTED",
  "RECOVERING",
] as const;
export type SemanticState = (typeof SEMANTIC_STATES)[number];

export const CHARACTERS = ["ONYX", "NOVA"] as const;
export type CharacterId = (typeof CHARACTERS)[number];

export const DEVICE_CLASSES = ["desktop", "tv", "mobile", "tablet"] as const;
export type DeviceClass = (typeof DEVICE_CLASSES)[number];

export const DEVICE_ADAPTERS = ["DESKTOP", "TV", "MOBILE_OR_TABLET_SIMULATION"] as const;
export type DeviceAdapter = (typeof DEVICE_ADAPTERS)[number];

export const PERFORMANCE_TIERS = [
  "PREMIUM_CINEMATIC",
  "BALANCED",
  "LIGHTWEIGHT",
  "REDUCED_MOTION",
  "STATIC_ALIVE_FALLBACK",
] as const;
export type PerformanceTier = (typeof PERFORMANCE_TIERS)[number];

export const ASSET_CLASSIFICATIONS = [
  "REFERENCE_ONLY",
  "DESIGN_ACCEPTED",
  "EXPORT_CANDIDATE",
  "RUNTIME_CANDIDATE",
  "REJECTED",
  "SUPERSEDED",
] as const;
export type AssetClassification = (typeof ASSET_CLASSIFICATIONS)[number];

export const REGISTRY_KINDS = ["DESIGN", "AVATAR", "WORLD"] as const;
export type RegistryKind = (typeof REGISTRY_KINDS)[number];

export const PROJECTION_CONFIDENCE = ["VERIFIED", "PROJECTED", "UNKNOWN"] as const;
export type ProjectionConfidence = (typeof PROJECTION_CONFIDENCE)[number];

export const WORLDS = ["OPERATIONS_CENTER", "FUTURE_CITY"] as const;
export type WorldId = (typeof WORLDS)[number];

export const MAX_IDENTIFIER_LENGTH = 256;
export const MAX_COLLECTION_SIZE = 64;
export const MAX_SEQUENCE = 2 ** 31 - 1;
export const DEFAULT_FRESHNESS_LIMIT_MS = 5_000;

/** Keys that would let a presentation payload imply authority. Always rejected. */
export const FORBIDDEN_AUTHORITY_KEYS = [
  "authority",
  "authorized",
  "authorization",
  "approval",
  "approved",
  "grant",
  "grants",
  "permission",
  "permissions",
  "role",
  "roles",
  "token",
  "secret",
  "credential",
  "credentials",
  "password",
  "sessionOwner",
  "biometric",
] as const;

export const ENVELOPE_ALLOWED_KEYS = new Set([
  "schemaVersion",
  "accountId",
  "deviceId",
  "cursor",
  "character",
  "state",
  "world",
  "deviceClass",
  "tier",
  "integrityHash",
  "items",
  ...FORBIDDEN_AUTHORITY_KEYS,
]);

export type ValidationOutcome = Readonly<{ valid: boolean; errors: readonly string[] }>;

export function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isBoundedString(value: unknown, max: number = MAX_IDENTIFIER_LENGTH): value is string {
  return typeof value === "string" && value.length > 0 && value.length <= max;
}

export function isMember<T extends readonly string[]>(vocabulary: T, value: unknown): value is T[number] {
  return typeof value === "string" && (vocabulary as readonly string[]).includes(value);
}

export function isCursor(value: unknown): value is number {
  return typeof value === "number" && Number.isInteger(value) && value >= 0 && value <= MAX_SEQUENCE;
}

export function isUnitInterval(value: unknown): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 && value <= 1;
}

export function isSha256Hex(value: unknown): value is string {
  return typeof value === "string" && /^[0-9a-f]{64}$/.test(value);
}

export function findAuthorityKeys(input: unknown): readonly string[] {
  if (!isPlainObject(input)) return [];
  const found: string[] = [];
  for (const key of Object.keys(input)) {
    if ((FORBIDDEN_AUTHORITY_KEYS as readonly string[]).includes(key)) found.push(key);
  }
  return found;
}

export function deepFreeze<T>(value: T): T {
  if (Array.isArray(value)) {
    for (const entry of value) deepFreeze(entry);
    return Object.freeze(value);
  }
  if (isPlainObject(value)) {
    for (const key of Object.keys(value)) deepFreeze(value[key]);
    return Object.freeze(value) as T;
  }
  return value;
}

function outcome(errors: readonly string[]): ValidationOutcome {
  return deepFreeze({ valid: errors.length === 0, errors });
}

/**
 * Core cross-lane envelope validator. Every synchronized projection must pass this
 * before any lane consumes it.
 */
export function validateIntegrationEnvelope(input: unknown): ValidationOutcome {
  const errors: string[] = [];
  if (!isPlainObject(input)) return outcome(["ENVELOPE_NOT_OBJECT"]);

  if (input["schemaVersion"] !== CONTRACT_SCHEMA_VERSION) errors.push("SCHEMA_VERSION_INVALID");
  if (!isBoundedString(input["accountId"])) errors.push("ACCOUNT_ID_INVALID");
  if (!isBoundedString(input["deviceId"])) errors.push("DEVICE_ID_INVALID");
  if (!isCursor(input["cursor"])) errors.push("CURSOR_INVALID");

  if ("character" in input && !isMember(CHARACTERS, input["character"])) errors.push("CHARACTER_UNKNOWN");
  if ("state" in input && !isMember(SEMANTIC_STATES, input["state"])) errors.push("STATE_UNKNOWN");
  if ("world" in input && !isMember(WORLDS, input["world"])) errors.push("WORLD_UNKNOWN");
  if ("deviceClass" in input && !isMember(DEVICE_CLASSES, input["deviceClass"])) errors.push("DEVICE_CLASS_UNKNOWN");
  if ("tier" in input && !isMember(PERFORMANCE_TIERS, input["tier"])) errors.push("TIER_UNKNOWN");
  if ("integrityHash" in input && !isSha256Hex(input["integrityHash"])) errors.push("INTEGRITY_HASH_INVALID");

  const items = input["items"];
  if (items !== undefined) {
    if (!Array.isArray(items)) errors.push("ITEMS_NOT_ARRAY");
    else if (items.length > MAX_COLLECTION_SIZE) errors.push("ITEMS_OVER_BOUND");
  }

  for (const key of findAuthorityKeys(input)) errors.push(`AUTHORITY_FIELD_FORBIDDEN:${key}`);
  for (const key of Object.keys(input).sort()) {
    if (!ENVELOPE_ALLOWED_KEYS.has(key)) errors.push(`UNKNOWN_FIELD:${key}`);
  }

  return outcome(errors);
}

/** Presentation projections must never assert operational truth. */
export function validatePresenceStateProjection(input: unknown): ValidationOutcome {
  const errors: string[] = [];
  if (!isPlainObject(input)) return outcome(["PROJECTION_NOT_OBJECT"]);
  if (!isMember(SEMANTIC_STATES, input["state"])) errors.push("STATE_UNKNOWN");
  if (!isMember(CHARACTERS, input["character"])) errors.push("CHARACTER_UNKNOWN");
  if (!isMember(PROJECTION_CONFIDENCE, input["confidence"])) errors.push("CONFIDENCE_UNKNOWN");
  if (input["operationalTruth"] !== undefined) errors.push("OPERATIONAL_TRUTH_FORBIDDEN");
  for (const key of findAuthorityKeys(input)) errors.push(`AUTHORITY_FIELD_FORBIDDEN:${key}`);
  return outcome(errors);
}

/** Freshness is always decided from supplied facts, never ambient clocks. */
export function resolveConfidence(
  freshnessMs: number,
  limitMs: number = DEFAULT_FRESHNESS_LIMIT_MS,
): ProjectionConfidence {
  if (!Number.isFinite(freshnessMs) || freshnessMs < 0) return "UNKNOWN";
  if (freshnessMs > limitMs) return "UNKNOWN";
  return freshnessMs === 0 ? "VERIFIED" : "PROJECTED";
}

/* ------------------------------------------------------------------------- */
/* Shared Train 2 contract surface. LANE_A is the sole owner of these shapes. */
/* ------------------------------------------------------------------------- */

export const SHARED_CONTRACT_NAMES = [
  "AccountCharacterAvatarSelection",
  "AvatarSelectionVersion",
  "AvatarVariantProjection",
  "AvatarSelectionChangeRequest",
  "AvatarSelectionChangeResult",
  "AvatarSelectionSyncEnvelope",
  "AvatarSelectionAcknowledgement",
  "AvatarSelectionConflict",
  "AvatarSelectionRollback",
  "AvatarSelectionRevocation",
  "AvatarSelectionIntegrityReceipt",
  "PresenceSyncEnvelope",
  "PresenceProjectionCursor",
  "PresenceStateProjection",
  "WorldTransitionProjection",
  "SpeakingCaptionProjection",
  "AccessibilityProjection",
  "ApprovalPrivacyProjection",
  "DevicePresenceProjection",
  "ReconnectReconciliationRequest",
  "ReconnectReconciliationResult",
  "DeviceHandoffProjection",
  "OperationsCenterSnapshot",
  "OperationsCenterEvent",
  "OperationsCenterSyncCursor",
  "OperationsCenterPerformanceTier",
  "OfflineProjectionSnapshot",
  "OfflineProjectionEvent",
  "OfflineProjectionJournalCursor",
  "ProjectionCompactionPolicy",
  "ProjectionReconciliationResult",
  "PerformanceGovernorSignal",
  "PerformanceGovernorPolicy",
  "PerformanceTierDecision",
  "CanvaAssetInventoryRecord",
  "CanvaDuplicateClassification",
  "DesignRegistryCandidate",
  "AvatarRegistryCandidate",
  "WorldRegistryCandidate",
  "AssetProvenanceRecord",
] as const;

export const CAPTION_STATES = ["SPEAKING", "CAPTION_INACTIVE"] as const;
export type CaptionState = (typeof CAPTION_STATES)[number];

export const PRIVACY_CLASSIFICATIONS = ["PUBLIC_SAFE", "HOUSEHOLD_ONLY", "PRIVATE_RESTRICTED"] as const;
export type PrivacyClassification = (typeof PRIVACY_CLASSIFICATIONS)[number];

export const READABILITY_CLASSES = ["DESKTOP", "HANDHELD", "TEN_FOOT"] as const;
export type ReadabilityClass = (typeof READABILITY_CLASSES)[number];

export const FLASHING_POLICIES = ["NO_FLASHING"] as const;
export const LIVE_REGION_POLITENESS = ["OFF", "POLITE", "ASSERTIVE"] as const;
export const WORLD_TRANSITION_PHASES = ["IDLE", "IN_PROGRESS", "INSTANT_FALLBACK", "COMPLETE", "UNKNOWN"] as const;
export const APPROVAL_PRIVACY_EFFECTIVE = ["NONE", "APPROVAL_REQUIRED", "PRIVACY_RESTRICTED"] as const;
export const RECONCILIATION_OUTCOMES = ["ACCEPTED", "REJECTED", "CONFLICT", "REVOKED", "STALE", "UNKNOWN"] as const;

export const MAX_CAPTION_TEXT_LENGTH = 512;
export const MAX_LABEL_LENGTH = 160;
export const TEN_FOOT_MINIMUM_SCALE = 1.5;

export type AccountCharacterAvatarSelection = Readonly<{
  accountId: string;
  character: CharacterId;
  avatarId: string;
  version: number;
  hash: string;
  revoked: boolean;
}>;

export type AvatarSelectionVersion = Readonly<{ version: number; supersedes: number | null; integrityHash: string }>;

export type AvatarVariantProjection = Readonly<{
  accountId: string;
  character: CharacterId;
  avatarId: string;
  version: number;
  deviceVariant: DeviceClass;
  canonical: true;
}>;

export type AvatarSelectionChangeRequest = Readonly<{
  schemaVersion: string;
  accountId: string;
  character: CharacterId;
  requestedAvatarId: string;
  expectedVersion: number;
  authenticated: boolean;
}>;

export type AvatarSelectionChangeResult = Readonly<{
  ok: boolean;
  reason: string | null;
  idempotent: boolean;
  selection: AccountCharacterAvatarSelection;
}>;

export type AvatarSelectionSyncEnvelope = Readonly<{
  schemaVersion: string;
  accountId: string;
  deviceId: string;
  cursor: number;
  selection: AccountCharacterAvatarSelection;
  integrityHash: string;
}>;

export type AvatarSelectionAcknowledgement = Readonly<{
  deviceId: string;
  cursor: number;
  acceptedVersion: number;
  integrityVerified: boolean;
}>;

export type AvatarSelectionConflict = Readonly<{
  conflict: boolean;
  baseVersion: number;
  competingAvatarIds: readonly string[];
  winner: AccountCharacterAvatarSelection;
}>;

export type AvatarSelectionRollback = Readonly<{
  targetVersion: number;
  allowedPriorVersions: readonly number[];
  resultingVersion: number;
}>;

export type AvatarSelectionRevocation = Readonly<{
  revokedAvatarId: string;
  revoked: boolean;
  precedesStaleDevices: true;
}>;

export type AvatarSelectionIntegrityReceipt = Readonly<{
  accountId: string;
  character: CharacterId;
  version: number;
  integrityHash: string;
  verified: boolean;
}>;

export type PresenceProjectionCursor = Readonly<{ accountId: string; deviceId: string; cursor: number }>;

export type PresenceStateProjection = Readonly<{
  schemaVersion: string;
  character: CharacterId;
  state: SemanticState;
  confidence: ProjectionConfidence;
  sourceVersion: number;
  operationalTruth?: never;
}>;

export type PresenceSyncEnvelope = Readonly<{
  schemaVersion: string;
  accountId: string;
  deviceId: string;
  cursor: number;
  presence: PresenceStateProjection;
  integrityHash: string;
}>;

export type WorldTransitionProjection = Readonly<{
  from: WorldId;
  to: WorldId | null;
  phase: (typeof WORLD_TRANSITION_PHASES)[number];
  progress: number;
  reducedMotionFallback: boolean;
}>;

export type SpeakingCaptionProjection = Readonly<{
  schemaVersion: string;
  accountId: string;
  characterId: CharacterId;
  state: CaptionState;
  utteranceId: string;
  captionText: string;
  languageTag: string;
  startOffsetMs: number;
  durationMs: number;
  segments: readonly Readonly<{ startOffsetMs: number; durationMs: number; text: string }>[];
  sourceVersion: number;
  freshnessMs: number;
  privacyClassification: PrivacyClassification;
  evidenceRefs: readonly string[];
  reducedMotionCompatible: boolean;
}>;

export type AccessibilityProjection = Readonly<{
  schemaVersion: string;
  reducedMotion: boolean;
  captionsEnabled: boolean;
  screenReaderLabel: string;
  screenReaderDescription: string;
  colorIndependentStateLabel: string;
  keyboardFocusTarget: string;
  keyboardFocusOrder: readonly string[];
  remoteFocusTarget: string;
  remoteFocusOrder: readonly string[];
  focusVisible: boolean;
  tvSafeZone: boolean;
  minimumScale: number;
  readabilityClass: ReadabilityClass;
  sharedRoomPrivacyMode: boolean;
  flashingPolicy: (typeof FLASHING_POLICIES)[number];
  liveRegionPoliteness: (typeof LIVE_REGION_POLITENESS)[number];
  languageTag: string;
  sourceVersion: number;
  freshnessMs: number;
}>;

export type ApprovalPrivacyProjection = Readonly<{
  approvalRequired: boolean;
  privacyRestricted: boolean;
  effective: (typeof APPROVAL_PRIVACY_EFFECTIVE)[number];
  grantsAuthority: false;
}>;

export type DevicePresenceProjection = Readonly<{
  schemaVersion: string;
  deviceId: string;
  deviceClass: DeviceClass;
  character: CharacterId;
  state: SemanticState;
  avatarId: string;
  avatarVersion: number;
  accessibility: AccessibilityProjection;
  captionRef: string | null;
  approvalPrivacy: ApprovalPrivacyProjection;
  grantsAuthority: false;
}>;

export type ReconnectReconciliationRequest = Readonly<{
  accountId: string;
  deviceId: string;
  localCursor: number;
  queuedCount: number;
}>;

export type ReconnectReconciliationResult = Readonly<{
  outcome: (typeof RECONCILIATION_OUTCOMES)[number];
  authoritativeCursor: number;
  accepted: number;
  droppedPrivileged: number;
  authorityGranted: false;
}>;

export type DeviceHandoffProjection = Readonly<{
  fromDeviceId: string;
  toDeviceId: string;
  cursor: number;
  cleanupRequired: boolean;
  authorityTransferred: false;
}>;

export type OperationsCenterSyncCursor = Readonly<{ cursor: number; accountId: string }>;
export type OperationsCenterPerformanceTier = Readonly<{ tier: PerformanceTier; degraded: boolean }>;

export type OperationsCenterEvent = Readonly<{
  schemaVersion: string;
  cursor: number;
  kind: string;
  evidenceBacked: boolean;
}>;

export type OperationsCenterSnapshot = Readonly<{
  schemaVersion: string;
  cursor: number;
  bounded: boolean;
  sharedRoom: boolean;
  activeCount: number;
}>;

export type OfflineProjectionEvent = Readonly<{
  accountId: string;
  deviceId: string;
  sequence: number;
  kind: string;
  value: string;
}>;

export type OfflineProjectionSnapshot = Readonly<{
  schemaVersion: string;
  migrationVersion: number;
  integrityHash: string;
  cursor: number;
  authoritative: false;
}>;

export type OfflineProjectionJournalCursor = Readonly<{ sequence: number; accountId: string; deviceId: string }>;

export type ProjectionCompactionPolicy = Readonly<{
  maxEntries: number;
  retainTombstones: boolean;
  compactedCount: number;
}>;

export type ProjectionReconciliationResult = Readonly<{
  outcome: (typeof RECONCILIATION_OUTCOMES)[number];
  cursor: number;
  authoritative: false;
}>;

export type PerformanceGovernorSignal = Readonly<{
  fps: number;
  frameTimeMs: number;
  reducedMotion: boolean;
  tv: boolean;
  memoryPressure: boolean;
}>;

export type PerformanceGovernorPolicy = Readonly<{
  degradationOrder: readonly string[];
  reducedMotionIsCeiling: true;
  neverDead: true;
}>;

export type PerformanceTierDecision = Readonly<{
  tier: PerformanceTier;
  reasons: readonly string[];
  semanticStatePreserved: true;
}>;

export type AssetProvenanceRecord = Readonly<{
  provenance: string;
  license: string;
  aiDisclosed: boolean;
  sourceBoard: string | null;
}>;

export type CanvaAssetInventoryRecord = Readonly<{
  id: string;
  sha256: string;
  width: number;
  height: number;
  format: string;
  classification: AssetClassification;
  provenanceRecord: AssetProvenanceRecord;
}>;

export type CanvaDuplicateClassification = Readonly<{
  exactGroups: readonly (readonly string[])[];
  nearDuplicates: readonly (readonly string[])[];
  functionalDuplicates: readonly (readonly string[])[];
}>;

type RegistryCandidateBase = Readonly<{
  kind: RegistryKind;
  candidateId: string | null;
  accepted: boolean;
  immutable: true;
}>;

export type DesignRegistryCandidate = RegistryCandidateBase & Readonly<{ kind: "DESIGN" }>;
export type AvatarRegistryCandidate = RegistryCandidateBase & Readonly<{ kind: "AVATAR" }>;
export type WorldRegistryCandidate = RegistryCandidateBase & Readonly<{ kind: "WORLD" }>;

export type CaptionSourceFacts = Readonly<{
  accountId: string;
  characterId: CharacterId;
  sourceVersion: number;
  revoked: boolean;
}>;

/** Caption timing is validated against supplied source facts only; never ambient time. */
export function validateSpeakingCaptionProjection(input: unknown, facts: CaptionSourceFacts): ValidationOutcome {
  const errors: string[] = [];
  if (!isPlainObject(input)) return outcome(["CAPTION_NOT_OBJECT"]);

  const state = input["state"];
  if (!isMember(CAPTION_STATES, state)) errors.push("CAPTION_STATE_UNSUPPORTED");
  const active = state === "SPEAKING";

  if (input["schemaVersion"] !== CONTRACT_SCHEMA_VERSION) errors.push("CAPTION_SCHEMA_INVALID");
  if (!isBoundedString(input["accountId"])) errors.push("CAPTION_ACCOUNT_INVALID");
  if (!isMember(CHARACTERS, input["characterId"])) errors.push("CAPTION_CHARACTER_UNKNOWN");
  if (!isBoundedString(input["utteranceId"])) errors.push("CAPTION_UTTERANCE_INVALID");
  if (!isBoundedString(input["languageTag"], 35)) errors.push("CAPTION_LANGUAGE_INVALID");

  const text = input["captionText"];
  const textOk = typeof text === "string" && text.length <= MAX_CAPTION_TEXT_LENGTH && (!active || text.length > 0);
  if (!textOk) errors.push("CAPTION_TEXT_INVALID");

  const start = input["startOffsetMs"];
  const duration = input["durationMs"];
  if (typeof start !== "number" || !Number.isFinite(start) || start < 0) errors.push("CAPTION_OFFSET_INVALID");
  if (typeof duration !== "number" || !Number.isFinite(duration) || duration < 0) errors.push("CAPTION_DURATION_INVALID");

  const segments = input["segments"];
  if (!Array.isArray(segments)) errors.push("CAPTION_SEGMENTS_INVALID");
  else if (segments.length > MAX_COLLECTION_SIZE) errors.push("CAPTION_SEGMENTS_OVER_BOUND");
  else if (typeof duration === "number") {
    let previousStart = -1;
    for (const segment of segments) {
      if (!isPlainObject(segment)) {
        errors.push("CAPTION_SEGMENTS_INVALID");
        break;
      }
      const segStart = segment["startOffsetMs"];
      const segDuration = segment["durationMs"];
      if (typeof segStart !== "number" || typeof segDuration !== "number" || segStart < 0 || segDuration < 0) {
        errors.push("CAPTION_SEGMENTS_INVALID");
        break;
      }
      if (segStart <= previousStart) {
        errors.push("CAPTION_SEGMENTS_UNSORTED");
        break;
      }
      if (segStart + segDuration > duration) {
        errors.push("CAPTION_SEGMENT_OUT_OF_RANGE");
        break;
      }
      previousStart = segStart;
    }
  }

  if (!isMember(PRIVACY_CLASSIFICATIONS, input["privacyClassification"])) errors.push("CAPTION_PRIVACY_UNSUPPORTED");

  const refs = input["evidenceRefs"];
  if (!Array.isArray(refs) || refs.length > MAX_COLLECTION_SIZE || !refs.every((r) => isBoundedString(r))) {
    errors.push("CAPTION_EVIDENCE_REFS_INVALID");
  }

  const freshness = input["freshnessMs"];
  if (typeof freshness !== "number" || resolveConfidence(freshness) === "UNKNOWN") errors.push("CAPTION_STALE");

  if (facts.revoked) errors.push("CAPTION_SOURCE_REVOKED");
  if (input["sourceVersion"] !== facts.sourceVersion) errors.push("CAPTION_SOURCE_STALE");
  if (input["accountId"] !== facts.accountId) errors.push("CAPTION_ACCOUNT_MISMATCH");
  if (input["characterId"] !== facts.characterId) errors.push("CAPTION_CHARACTER_MISMATCH");

  for (const key of findAuthorityKeys(input)) errors.push(`AUTHORITY_FIELD_FORBIDDEN:${key}`);
  for (const key of Object.keys(input)) {
    if (/audio|voiceprint|waveform|pcm|biometric/i.test(key)) errors.push(`CAPTION_RAW_MEDIA_FORBIDDEN:${key}`);
  }

  return outcome(errors);
}

/** Keyboard and remote focus are validated as separate, deterministic, bounded orders. */
export function validateAccessibilityProjection(input: unknown, presentationTargets: readonly string[]): ValidationOutcome {
  const errors: string[] = [];
  if (!isPlainObject(input)) return outcome(["ACCESSIBILITY_NOT_OBJECT"]);

  if (input["schemaVersion"] !== CONTRACT_SCHEMA_VERSION) errors.push("ACCESSIBILITY_SCHEMA_INVALID");
  if (typeof input["reducedMotion"] !== "boolean") errors.push("REDUCED_MOTION_INVALID");
  if (typeof input["captionsEnabled"] !== "boolean") errors.push("CAPTIONS_ENABLED_INVALID");

  if (!isBoundedString(input["screenReaderLabel"], MAX_LABEL_LENGTH)) errors.push("SCREEN_READER_LABEL_MISSING");
  const description = input["screenReaderDescription"];
  if (typeof description !== "string" || description.length > MAX_LABEL_LENGTH) errors.push("SCREEN_READER_DESCRIPTION_INVALID");
  if (!isBoundedString(input["colorIndependentStateLabel"], MAX_LABEL_LENGTH)) errors.push("COLOR_INDEPENDENT_LABEL_MISSING");

  const checkOrder = (value: unknown, label: "KEYBOARD" | "REMOTE"): void => {
    if (!Array.isArray(value) || value.length === 0 || value.length > MAX_COLLECTION_SIZE) {
      errors.push(`${label}_FOCUS_ORDER_INVALID`);
      return;
    }
    if (new Set(value).size !== value.length) errors.push(`${label}_FOCUS_ORDER_DUPLICATE`);
    if (!value.every((entry) => typeof entry === "string" && presentationTargets.includes(entry))) {
      errors.push(`${label}_FOCUS_ORDER_TARGET_UNKNOWN`);
    }
  };
  checkOrder(input["keyboardFocusOrder"], "KEYBOARD");
  checkOrder(input["remoteFocusOrder"], "REMOTE");

  const keyboardTarget = input["keyboardFocusTarget"];
  if (typeof keyboardTarget !== "string" || !presentationTargets.includes(keyboardTarget)) errors.push("KEYBOARD_FOCUS_TARGET_UNKNOWN");
  const remoteTarget = input["remoteFocusTarget"];
  if (typeof remoteTarget !== "string" || !presentationTargets.includes(remoteTarget)) errors.push("REMOTE_FOCUS_TARGET_UNKNOWN");

  if (input["focusVisible"] !== true) errors.push("FOCUS_NOT_VISIBLE");
  if (!isMember(FLASHING_POLICIES, input["flashingPolicy"])) errors.push("FLASHING_POLICY_UNSUPPORTED");
  if (!isMember(LIVE_REGION_POLITENESS, input["liveRegionPoliteness"])) errors.push("LIVE_REGION_POLITENESS_UNSUPPORTED");
  if (!isMember(READABILITY_CLASSES, input["readabilityClass"])) errors.push("READABILITY_CLASS_UNSUPPORTED");
  if (!isBoundedString(input["languageTag"], 35)) errors.push("ACCESSIBILITY_LANGUAGE_INVALID");
  if (typeof input["sharedRoomPrivacyMode"] !== "boolean") errors.push("SHARED_ROOM_MODE_INVALID");

  const scale = input["minimumScale"];
  if (typeof scale !== "number" || !Number.isFinite(scale) || scale <= 0) errors.push("MINIMUM_SCALE_INVALID");

  if (input["readabilityClass"] === "TEN_FOOT") {
    if (input["tvSafeZone"] !== true) errors.push("TV_SAFE_ZONE_REQUIRED");
    if (typeof scale === "number" && scale < TEN_FOOT_MINIMUM_SCALE) errors.push("TEN_FOOT_SCALE_INSUFFICIENT");
  }

  if (input["sharedRoomPrivacyMode"] === true && typeof description === "string" && description.length > 0) {
    errors.push("SHARED_ROOM_DESCRIPTION_NOT_REDACTED");
  }

  const freshness = input["freshnessMs"];
  if (typeof freshness !== "number" || resolveConfidence(freshness) === "UNKNOWN") errors.push("ACCESSIBILITY_STALE");

  for (const key of findAuthorityKeys(input)) errors.push(`AUTHORITY_FIELD_FORBIDDEN:${key}`);
  return outcome(errors);
}

/** Shared-room mode drops private description while retaining semantic state. */
export function redactAccessibilityForSharedRoom(projection: AccessibilityProjection): AccessibilityProjection {
  return deepFreeze({ ...projection, sharedRoomPrivacyMode: true, screenReaderDescription: "" });
}
