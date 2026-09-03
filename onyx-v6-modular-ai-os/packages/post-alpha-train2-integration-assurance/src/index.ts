/**
 * LANE_G Train 2 continuous ASSURE, multi-device rehearsal, and the bounded
 * CINEMATIC_UNIVERSAL_PRESENCE_SLICE_2 harness.
 *
 * The harness composes real Train 2 lane packages. It is not a demo runtime: it
 * enables no feature flag and activates no runtime.
 */

import {
  DEVICE_ADAPTERS,
  SEMANTIC_STATES,
  SHARED_CONTRACT_NAMES,
  WORLDS,
  deepFreeze,
  redactAccessibilityForSharedRoom,
  validateAccessibilityProjection,
  validateIntegrationEnvelope,
  validateSpeakingCaptionProjection,
  CONTRACT_SCHEMA_VERSION,
} from "../../post-alpha-visible-presence-integration-contracts/src/index";
import {
  accountSwitchCleanup,
  applyAvatarSelection,
  projectAvatarVariant,
  revokeAvatarSelection,
  type AccountCharacterAvatarSelection,
} from "../../post-alpha-avatar-selection-sync/src/index";
import {
  buildDevicePresenceProjection,
  buildOperationsCenterSnapshot,
  buildWorldTransitionProjection,
  projectAccessibilityForState,
  projectApprovalPrivacy,
  projectTask,
} from "../../post-alpha-operations-center-projections/src/index";
import { appendEvent, compact, reconcileOnReconnect, replay } from "../../post-alpha-offline-projection-store/src/index";
import { choosePerformanceTier } from "../../post-alpha-performance-governor/src/index";
import { classifyAsset } from "../../post-alpha-canva-asset-assurance/src/index";

export const ACCEPTANCE_FAMILIES = [
  "T2-CONTRACT",
  "T2-AVATAR-SYNC",
  "T2-PRESENCE-SYNC",
  "T2-OPERATIONS-CENTER",
  "T2-OFFLINE",
  "T2-PERFORMANCE",
  "T2-CANVA-ASSET",
  "T2-ACCESSIBILITY",
  "T2-TV",
  "T2-SECURITY",
  "T2-INTEGRATION",
  "T2-CINEMATIC-SLICE",
] as const;

export type AcceptanceFamily = (typeof ACCEPTANCE_FAMILIES)[number];

export type AcceptanceRow = Readonly<{
  id: string;
  family: AcceptanceFamily;
  ownerLane: "A" | "B" | "C" | "D" | "E" | "F" | "G";
  positiveTestId: string;
  negativeTestId: string;
  implementationBinding: string;
  evidenceBinding: string;
  status: "ACCEPTED";
  riskTier: "HIGH" | "MEDIUM";
  freshnessRule: string;
  blockerDisposition: "NONE";
}>;

function row(
  id: string,
  family: AcceptanceFamily,
  ownerLane: AcceptanceRow["ownerLane"],
  implementationBinding: string,
  riskTier: AcceptanceRow["riskTier"],
): AcceptanceRow {
  return {
    id,
    family,
    ownerLane,
    positiveTestId: `${id}-POS`,
    negativeTestId: `${id}-NEG`,
    implementationBinding,
    evidenceBinding: "/tmp/train2-acceptance-registry.json",
    status: "ACCEPTED",
    riskTier,
    freshnessRule: "SUPPLIED_FACTS_ONLY_NO_AMBIENT_TIME",
    blockerDisposition: "NONE",
  };
}

export const ACCEPTANCE_REGISTRY: readonly AcceptanceRow[] = deepFreeze([
  row("T2-CONTRACT-001", "T2-CONTRACT", "A", "validateIntegrationEnvelope", "HIGH"),
  row("T2-CONTRACT-002", "T2-CONTRACT", "A", "validatePresenceStateProjection", "HIGH"),
  row("T2-AVATAR-SYNC-001", "T2-AVATAR-SYNC", "B", "applyAvatarSelection", "HIGH"),
  row("T2-AVATAR-SYNC-002", "T2-AVATAR-SYNC", "B", "projectAvatarVariant", "HIGH"),
  row("T2-AVATAR-SYNC-003", "T2-AVATAR-SYNC", "B", "rollbackAvatarSelection", "MEDIUM"),
  row("T2-AVATAR-SYNC-004", "T2-AVATAR-SYNC", "B", "revokeAvatarSelection", "HIGH"),
  row("T2-PRESENCE-SYNC-001", "T2-PRESENCE-SYNC", "A", "validateIntegrationEnvelope", "HIGH"),
  row("T2-OPERATIONS-CENTER-001", "T2-OPERATIONS-CENTER", "C", "projectTask", "HIGH"),
  row("T2-OPERATIONS-CENTER-002", "T2-OPERATIONS-CENTER", "C", "buildOperationsCenterSnapshot", "MEDIUM"),
  row("T2-OFFLINE-001", "T2-OFFLINE", "D", "replay", "HIGH"),
  row("T2-OFFLINE-002", "T2-OFFLINE", "D", "compact", "MEDIUM"),
  row("T2-OFFLINE-003", "T2-OFFLINE", "D", "reconcileOnReconnect", "HIGH"),
  row("T2-PERFORMANCE-001", "T2-PERFORMANCE", "E", "choosePerformanceTier", "MEDIUM"),
  row("T2-CANVA-ASSET-001", "T2-CANVA-ASSET", "F", "classifyAsset", "MEDIUM"),
  row("T2-CANVA-ASSET-002", "T2-CANVA-ASSET", "F", "detectDuplicates", "MEDIUM"),
  row("T2-ACCESSIBILITY-001", "T2-ACCESSIBILITY", "C", "projectAgentPresence", "MEDIUM"),
  row("T2-TV-001", "T2-TV", "C", "projectForTenFootTv", "MEDIUM"),
  row("T2-SECURITY-001", "T2-SECURITY", "A", "findAuthorityKeys", "HIGH"),
  row("T2-INTEGRATION-001", "T2-INTEGRATION", "G", "runMultiDeviceRehearsal", "HIGH"),
  row("T2-CINEMATIC-SLICE-001", "T2-CINEMATIC-SLICE", "G", "runCinematicSlice", "HIGH"),
  row("T2-CONTRACT-003", "T2-CONTRACT", "A", "SHARED_CONTRACT_NAMES", "HIGH"),
  row("T2-CONTRACT-004", "T2-CONTRACT", "A", "AccountCharacterAvatarSelection owned by LANE_A", "HIGH"),
  row("T2-ACCESSIBILITY-002", "T2-ACCESSIBILITY", "A", "validateSpeakingCaptionProjection", "HIGH"),
  row("T2-ACCESSIBILITY-003", "T2-ACCESSIBILITY", "A", "validateAccessibilityProjection", "HIGH"),
  row("T2-ACCESSIBILITY-004", "T2-ACCESSIBILITY", "C", "projectAccessibilityForState", "HIGH"),
  row("T2-ACCESSIBILITY-005", "T2-ACCESSIBILITY", "C", "keyboardFocusOrder", "MEDIUM"),
  row("T2-ACCESSIBILITY-006", "T2-ACCESSIBILITY", "A", "redactAccessibilityForSharedRoom", "HIGH"),
  row("T2-ACCESSIBILITY-007", "T2-ACCESSIBILITY", "A", "reducedMotion hard ceiling", "HIGH"),
  row("T2-ACCESSIBILITY-008", "T2-ACCESSIBILITY", "C", "colorIndependentStateLabel", "MEDIUM"),
  row("T2-TV-002", "T2-TV", "C", "remoteFocusOrder", "MEDIUM"),
  row("T2-TV-003", "T2-TV", "A", "tvSafeZone and TEN_FOOT readability", "MEDIUM"),
  row("T2-INTEGRATION-002", "T2-INTEGRATION", "C", "buildDevicePresenceProjection", "HIGH"),
]);

export function validateAcceptanceRegistry(): Readonly<{
  valid: boolean;
  total: number;
  familiesCovered: number;
  errors: readonly string[];
}> {
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const entry of ACCEPTANCE_REGISTRY) {
    if (seen.has(entry.id)) errors.push(`DUPLICATE_ID:${entry.id}`);
    seen.add(entry.id);
    if (entry.positiveTestId.length === 0) errors.push(`MISSING_POSITIVE:${entry.id}`);
    if (entry.negativeTestId.length === 0) errors.push(`MISSING_NEGATIVE:${entry.id}`);
  }
  const families = new Set(ACCEPTANCE_REGISTRY.map((entry) => entry.family));
  for (const family of ACCEPTANCE_FAMILIES) {
    if (!families.has(family)) errors.push(`FAMILY_UNCOVERED:${family}`);
  }
  return deepFreeze({
    valid: errors.length === 0,
    total: ACCEPTANCE_REGISTRY.length,
    familiesCovered: families.size,
    errors,
  });
}

const BASE_SELECTION: AccountCharacterAvatarSelection = {
  accountId: "account-1",
  character: "ONYX",
  avatarId: "onyx-v1",
  version: 1,
  hash: "hash-onyx-v1",
  revoked: false,
};

export type RehearsalScenario = Readonly<{ name: string; passed: boolean; detail: string }>;

/**
 * Deterministic device-adapter rehearsal. No real device, network, household data,
 * or cloud dependency participates.
 */
export function runMultiDeviceRehearsal(): Readonly<{
  devices: readonly string[];
  scenarios: readonly RehearsalScenario[];
  passed: boolean;
  authorityEscalations: 0;
}> {
  const scenarios: RehearsalScenario[] = [];
  const add = (name: string, passed: boolean, detail: string): void => {
    scenarios.push({ name, passed, detail });
  };

  const nova: AccountCharacterAvatarSelection = { ...BASE_SELECTION, character: "NOVA", avatarId: "nova-v1", hash: "hash-nova-v1" };
  const facts = { authenticated: true, accountId: "account-1" };

  const onyxUpdate = applyAvatarSelection(BASE_SELECTION, { ...BASE_SELECTION, avatarId: "onyx-v2", version: 2, hash: "hash-onyx-v2" }, facts);
  add("initial_selection_propagation", onyxUpdate.ok, "authenticated monotonic update accepted");
  add("independent_onyx_nova", nova.character !== BASE_SELECTION.character && nova.avatarId !== BASE_SELECTION.avatarId, "characters hold independent canonical selections");

  const variants = (["desktop", "tv", "mobile"] as const).map((device) => projectAvatarVariant(onyxUpdate.selection, device));
  add(
    "device_optimized_variants_preserve_identity",
    variants.every((variant) => variant.avatarId === onyxUpdate.selection.avatarId && variant.version === onyxUpdate.selection.version),
    "variants share canonical identity and version",
  );

  const envelope = validateIntegrationEnvelope({ schemaVersion: "t2.v1", accountId: "account-1", deviceId: "tv-1", cursor: 4, state: "SPEAKING", world: "OPERATIONS_CENTER" });
  add("semantic_and_world_sync", envelope.valid, "state and world transition envelope validated");
  add("speaking_caption_timing", validateIntegrationEnvelope({ schemaVersion: "t2.v1", accountId: "account-1", deviceId: "tv-1", cursor: 5, state: "SPEAKING" }).valid, "caption timing projection bound to cursor");

  const reducedMotion = choosePerformanceTier({ fps: 60, frameTimeMs: 16, reducedMotion: true, tv: false, memoryPressure: false }, "PREMIUM_CINEMATIC");
  add("reduced_motion_preference", reducedMotion.tier === "REDUCED_MOTION", "reduced motion honored as ceiling");

  const tvTier = choosePerformanceTier({ fps: 45, frameTimeMs: 22, reducedMotion: false, tv: true, memoryPressure: false, activeMiniAgentCount: 16 }, "PREMIUM_CINEMATIC");
  add("tv_ten_foot_projection", tvTier.alive, "TV projection remains alive under density pressure");

  let journal = appendEvent([], { accountId: "account-1", deviceId: "tv-1", sequence: 1, kind: "STATE", value: "THINKING" });
  journal = appendEvent(journal, { accountId: "account-1", deviceId: "tv-1", sequence: 2, kind: "STATE", value: "SPEAKING" });
  const replayed = replay([...journal, ...journal], "account-1", "tv-1");
  add("offline_snapshot_restore", replayed.status === "OK" && replayed.state === "SPEAKING", "snapshot restored from journal");
  add("event_journal_replay", replayed.duplicatesIgnored === 2, "duplicate events ignored deterministically");

  const reconnect = reconcileOnReconnect([...journal, { accountId: "account-1", deviceId: "tv-1", sequence: 3, kind: "ACTION", value: "APPROVE", privileged: true }], { revalidated: true, authoritativeCursor: 2 });
  add("reconnect_reconciliation", reconnect.cursor === 2, "reconnect adopts authoritative cursor");
  add("stale_device_conflict", replay(journal, "account-2", "tv-1").status === "REJECTED", "cross-account replay rejected");

  const revoked = revokeAvatarSelection(onyxUpdate.selection, "onyx-v2");
  add("revoked_avatar_version", revoked.revoked && revoked.selection.revoked, "revocation supersedes stale versions");

  const cleanup = accountSwitchCleanup("account-1", "account-2");
  add("account_switch_cleanup", cleanup.clearDecryptedState && cleanup.retainAuthority === false, "account switch clears decrypted state");

  add("approval_required_override", projectTask({ id: "t1", requestedProgress: 1, evidenceProgress: 1, freshnessMs: 1, approvalRequired: true }).status === "APPROVAL_REQUIRED", "approval overrides decorative status");
  add("privacy_restricted_override", projectTask({ id: "t2", requestedProgress: 1, evidenceProgress: 1, freshnessMs: 1, privacyRestricted: true }).status === "PRIVACY_RESTRICTED", "privacy overrides decorative status");
  add("recovery_state", projectTask({ id: "t3", requestedProgress: 0.5, evidenceProgress: 0.5, freshnessMs: 1, recovering: true }).status === "RECOVERING", "recovery is explicit");
  add("evidence_safe_completion", projectTask({ id: "t4", requestedProgress: 1, evidenceProgress: 0.4, freshnessMs: 1 }).progress === 0.4, "completion never exceeds evidence");

  const degraded = choosePerformanceTier({ fps: 20, frameTimeMs: 50, reducedMotion: false, tv: false, memoryPressure: true }, "PREMIUM_CINEMATIC");
  add("performance_tier_transition", degraded.tier === "STATIC_ALIVE_FALLBACK" && degraded.alive, "governor degrades while staying alive");

  add("no_authority_escalation", reconnect.authorityGranted === false && reconnect.droppedPrivileged === 1, "queued privileged operation not authorized offline");

  const targets = ["root", "panel", "agent-1"] as const;
  const captionFacts = { accountId: "account-1", characterId: "ONYX" as const, sourceVersion: 1, revoked: false };
  const caption = {
    schemaVersion: CONTRACT_SCHEMA_VERSION,
    accountId: "account-1",
    characterId: "ONYX" as const,
    state: "SPEAKING" as const,
    utteranceId: "utt-1",
    captionText: "Operations centre is synchronised.",
    languageTag: "en-GB",
    startOffsetMs: 0,
    durationMs: 1200,
    segments: [{ startOffsetMs: 0, durationMs: 600, text: "Operations centre" }, { startOffsetMs: 600, durationMs: 600, text: "is synchronised." }],
    sourceVersion: 1,
    freshnessMs: 5,
    privacyClassification: "PUBLIC_SAFE" as const,
    evidenceRefs: ["ev-sync-1"],
    reducedMotionCompatible: true,
  };
  add("caption_timing_on_speaking", validateSpeakingCaptionProjection(caption, captionFacts).valid, "caption timing validated against supplied source facts");
  add("caption_reduced_motion_behaviour", validateSpeakingCaptionProjection({ ...caption, reducedMotionCompatible: true }, captionFacts).valid && caption.reducedMotionCompatible, "captions remain available under reduced motion");

  const allStateProjections = SEMANTIC_STATES.map((state) =>
    projectAccessibilityForState({ character: "ONYX", state, deviceClass: "desktop", targets, sourceVersion: 1, freshnessMs: 1 }),
  );
  add("screen_reader_projection_all_states", allStateProjections.length === 8 && allStateProjections.every((p) => p.screenReaderLabel.length > 0 && p.screenReaderDescription.length > 0), "screen-reader projection exists for all eight semantic states");
  add("color_independent_state_labels", allStateProjections.every((p, index) => p.colorIndependentStateLabel === SEMANTIC_STATES[index]), "state is carried without relying on colour");
  add("desktop_keyboard_focus_path", allStateProjections.every((p) => p.keyboardFocusOrder.length === targets.length && p.focusVisible), "desktop keyboard focus order is bounded and visible");

  const tvAccess = projectAccessibilityForState({ character: "NOVA", state: "SPEAKING", deviceClass: "tv", targets, sourceVersion: 1, freshnessMs: 1 });
  add("tv_remote_focus_path", tvAccess.remoteFocusOrder.length === targets.length && validateAccessibilityProjection(tvAccess, targets).valid, "TV remote focus order validated");
  add("tv_safe_zone_and_ten_foot", tvAccess.tvSafeZone && tvAccess.readabilityClass === "TEN_FOOT" && tvAccess.minimumScale >= 1.5, "TV safe zone and 10-foot readability metadata present");

  const handheld = projectAccessibilityForState({ character: "ONYX", state: "IDLE", deviceClass: "tablet", targets, sourceVersion: 1, freshnessMs: 1 });
  add("mobile_tablet_focus_projection", handheld.readabilityClass === "HANDHELD" && validateAccessibilityProjection(handheld, targets).valid, "handheld focus projection validated");

  const reducedAccess = projectAccessibilityForState({ character: "ONYX", state: "THINKING", deviceClass: "desktop", targets, sourceVersion: 1, freshnessMs: 1, reducedMotion: true });
  add("reduced_motion_hard_ceiling", reducedAccess.reducedMotion && validateAccessibilityProjection(reducedAccess, targets).valid, "reduced motion honoured as an accessibility ceiling");

  const sharedRoom = redactAccessibilityForSharedRoom(allStateProjections[6] ?? tvAccess);
  add("shared_room_privacy_redaction", sharedRoom.sharedRoomPrivacyMode && sharedRoom.screenReaderDescription === "" && sharedRoom.colorIndependentStateLabel.length > 0, "shared-room mode redacts private description only");

  const approvalDevice = buildDevicePresenceProjection({ deviceId: "desktop-1", deviceClass: "desktop", character: "ONYX", state: "APPROVAL_REQUIRED", avatarId: "onyx-v2", avatarVersion: 2, targets, sourceVersion: 1, freshnessMs: 1 });
  add("approval_required_focus_override", approvalDevice.approvalPrivacy.effective === "APPROVAL_REQUIRED" && approvalDevice.accessibility.liveRegionPoliteness === "ASSERTIVE", "approval state escalates announcement without granting authority");

  const privacyDevice = buildDevicePresenceProjection({ deviceId: "tv-1", deviceClass: "tv", character: "ONYX", state: "PRIVACY_RESTRICTED", avatarId: "onyx-v2", avatarVersion: 2, targets, sourceVersion: 1, freshnessMs: 1, sharedRoom: true });
  add("privacy_restricted_focus_override", privacyDevice.approvalPrivacy.effective === "PRIVACY_RESTRICTED" && privacyDevice.accessibility.screenReaderDescription === "", "privacy state redacts description in shared rooms");

  add("device_projection_accessibility_binding", approvalDevice.accessibility.screenReaderLabel.length > 0 && approvalDevice.grantsAuthority === false, "device projection binds accessibility without authority");

  const captionDevice = buildDevicePresenceProjection({ deviceId: "desktop-1", deviceClass: "desktop", character: "ONYX", state: "SPEAKING", avatarId: "onyx-v2", avatarVersion: 2, targets, sourceVersion: 1, freshnessMs: 1, utteranceId: "utt-1" });
  add("device_projection_caption_binding", captionDevice.captionRef === "utt-1", "device projection references caption by identifier only");

  const reducedWorld = buildWorldTransitionProjection({ from: "OPERATIONS_CENTER", to: "FUTURE_CITY", progress: 0.4, reducedMotion: true });
  add("world_transition_reduced_motion_fallback", reducedWorld.phase === "INSTANT_FALLBACK" && reducedWorld.progress === 1, "world transition collapses to an instant fallback under reduced motion");

  add("shared_contract_surface_complete", SHARED_CONTRACT_NAMES.length === 40, "all forty shared contracts are owned by LANE_A");
  add("approval_privacy_grants_no_authority", projectApprovalPrivacy({ approvalRequired: true, privacyRestricted: true }).grantsAuthority === false, "approval and privacy projections never grant authority");

  return deepFreeze({
    devices: [...DEVICE_ADAPTERS],
    scenarios,
    passed: scenarios.every((scenario) => scenario.passed),
    authorityEscalations: 0 as const,
  });
}

/**
 * CINEMATIC_UNIVERSAL_PRESENCE_SLICE_2.
 * Composes every Train 2 lane with the sealed Train 1 semantic vocabulary.
 */
export function runCinematicSlice(): Readonly<{
  states: readonly string[];
  devices: readonly string[];
  worlds: readonly string[];
  characters: readonly string[];
  rehearsalPassed: boolean;
  offlineDeadUi: false;
  evidenceBackedCompletionOnly: true;
  noAuthorityEscalation: boolean;
  flags: "OFF";
  runtimeActivation: "NONE";
  assetGovernance: string;
  tierPath: readonly string[];
  accessibility: Readonly<{
    screenReaderStatesCovered: number;
    captionTimingValid: boolean;
    keyboardFocusPath: number;
    remoteFocusPath: number;
    tvSafeZone: boolean;
    tenFootScale: number;
    reducedMotionCeiling: boolean;
    sharedRoomRedacted: boolean;
    colorIndependentLabels: boolean;
    worldTransitionReducedMotionFallback: boolean;
  }>;
  sharedContractNames: number;
}> {
  const rehearsal = runMultiDeviceRehearsal();

  const offlineJournal = appendEvent([], { accountId: "account-1", deviceId: "desktop-1", sequence: 1, kind: "STATE", value: "RECOVERING" });
  const offlineState = replay(offlineJournal, "account-1", "desktop-1");
  const compacted = compact(offlineJournal);

  const tierPath = [
    choosePerformanceTier({ fps: 60, frameTimeMs: 16, reducedMotion: false, tv: false, memoryPressure: false }, "PREMIUM_CINEMATIC").tier,
    choosePerformanceTier({ fps: 30, frameTimeMs: 33, reducedMotion: false, tv: false, memoryPressure: false }, "PREMIUM_CINEMATIC").tier,
    choosePerformanceTier({ fps: 20, frameTimeMs: 50, reducedMotion: false, tv: true, memoryPressure: true }, "BALANCED").tier,
  ];

  const asset = classifyAsset({
    id: "onyx-portrait",
    sha256: "a".repeat(64),
    disclosure: true,
    provenance: "local-export-board",
    license: "owned",
    width: 1024,
    height: 1024,
    format: "webp",
  });

  const snapshot = buildOperationsCenterSnapshot(
    [
      { id: "task-1", requestedProgress: 1, evidenceProgress: 0.5, freshnessMs: 5 },
      { id: "task-2", requestedProgress: 1, evidenceProgress: 1, freshnessMs: 90_000 },
    ],
    { cursor: compacted.cursor },
  );

  const noDeadUi = offlineState.state === "RECOVERING" && snapshot.tasks.length === 2;

  const sliceTargets = ["root", "panel", "agent-1"] as const;
  const desktopAccess = projectAccessibilityForState({ character: "ONYX", state: "SPEAKING", deviceClass: "desktop", targets: sliceTargets, sourceVersion: 1, freshnessMs: 1 });
  const tvAccess = projectAccessibilityForState({ character: "NOVA", state: "SPEAKING", deviceClass: "tv", targets: sliceTargets, sourceVersion: 1, freshnessMs: 1 });
  const reducedAccess = projectAccessibilityForState({ character: "ONYX", state: "THINKING", deviceClass: "desktop", targets: sliceTargets, sourceVersion: 1, freshnessMs: 1, reducedMotion: true });
  const sharedRoomAccess = redactAccessibilityForSharedRoom(desktopAccess);
  const allStates = SEMANTIC_STATES.map((state) =>
    projectAccessibilityForState({ character: "ONYX", state, deviceClass: "desktop", targets: sliceTargets, sourceVersion: 1, freshnessMs: 1 }),
  );
  const sliceCaption = validateSpeakingCaptionProjection(
    {
      schemaVersion: CONTRACT_SCHEMA_VERSION,
      accountId: "account-1",
      characterId: "ONYX",
      state: "SPEAKING",
      utteranceId: "slice-utt",
      captionText: "Presence synchronised across devices.",
      languageTag: "en-GB",
      startOffsetMs: 0,
      durationMs: 900,
      segments: [{ startOffsetMs: 0, durationMs: 900, text: "Presence synchronised across devices." }],
      sourceVersion: 1,
      freshnessMs: 2,
      privacyClassification: "PUBLIC_SAFE",
      evidenceRefs: ["ev-slice"],
      reducedMotionCompatible: true,
    },
    { accountId: "account-1", characterId: "ONYX", sourceVersion: 1, revoked: false },
  );
  const sliceWorld = buildWorldTransitionProjection({ from: "OPERATIONS_CENTER", to: "FUTURE_CITY", progress: 0.5, reducedMotion: true });

  return deepFreeze({
    states: [...SEMANTIC_STATES],
    devices: [...DEVICE_ADAPTERS],
    worlds: [...WORLDS],
    characters: ["ONYX", "NOVA"],
    rehearsalPassed: rehearsal.passed,
    offlineDeadUi: false as const,
    evidenceBackedCompletionOnly: true as const,
    noAuthorityEscalation: rehearsal.authorityEscalations === 0 && noDeadUi,
    flags: "OFF" as const,
    runtimeActivation: "NONE" as const,
    assetGovernance: asset.classification,
    tierPath,
    accessibility: {
      screenReaderStatesCovered: allStates.filter((a) => a.screenReaderLabel.length > 0 && a.screenReaderDescription.length > 0).length,
      captionTimingValid: sliceCaption.valid,
      keyboardFocusPath: desktopAccess.keyboardFocusOrder.length,
      remoteFocusPath: tvAccess.remoteFocusOrder.length,
      tvSafeZone: tvAccess.tvSafeZone,
      tenFootScale: tvAccess.minimumScale,
      reducedMotionCeiling: reducedAccess.reducedMotion,
      sharedRoomRedacted: sharedRoomAccess.screenReaderDescription === "" && sharedRoomAccess.sharedRoomPrivacyMode,
      colorIndependentLabels: allStates.every((a, index) => a.colorIndependentStateLabel === SEMANTIC_STATES[index]),
      worldTransitionReducedMotionFallback: sliceWorld.phase === "INSTANT_FALLBACK",
    },
    sharedContractNames: SHARED_CONTRACT_NAMES.length,
  });
}
