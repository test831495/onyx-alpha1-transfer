export const AVATAR_FLAGS = Object.freeze({ avatar_runtime: "OFF", tv_presence_runtime: "OFF", ambient_world_engine: "OFF", threejs_adapter: "OFF", renderer_adapter_v2: "OFF" } as const);
export const SEMANTIC_STATES = ["IDLE", "LISTENING", "UNDERSTANDING", "THINKING", "WORKING", "SPEAKING", "PRESENTING", "APPROVAL_REQUIRED", "PRIVACY_RESTRICTED", "INTERRUPTED", "RECOVERING", "OFFLINE"] as const;
export type SemanticState = typeof SEMANTIC_STATES[number];
export const CANONICAL_CHARACTERS = Object.freeze({ ONYX: { id: "ONYX", gender: "MALE", role: "STRATEGIC_COMPANION_AND_INTEGRATOR", accountBound: true }, NOVA: { id: "NOVA", gender: "FEMALE", role: "CREATIVE_ANALYST_AND_EXPLORER", accountBound: true } } as const);

function deepFreeze<T>(value: T): Readonly<T> {
  if (value !== null && typeof value === "object" && !Object.isFrozen(value)) { for (const entry of Object.values(value as Record<string, unknown>)) deepFreeze(entry); Object.freeze(value); }
  return value;
}

type Selection = { readonly accountId: string; readonly character: "ONYX" | "NOVA"; readonly avatarId: string; readonly canonicalVersion: string; readonly integrityHash: string };
export function validateAvatarSelection(selection: Selection): Readonly<Selection> {
  if (!selection.accountId || !selection.canonicalVersion || !selection.integrityHash || !selection.avatarId.toLowerCase().startsWith(selection.character.toLowerCase())) throw new TypeError("Avatar selection does not preserve character identity");
  return deepFreeze(structuredClone(selection));
}

export function validateVariantIntegrity(binding: { readonly canonicalVersion: string; readonly canonicalIntegrityHash: string; readonly variantVersion: string; readonly variantIntegrityHash: string }): boolean {
  return binding.canonicalVersion === binding.variantVersion && binding.canonicalIntegrityHash === binding.variantIntegrityHash;
}

export type AvatarLifecycleState = "DRAFT" | "REGISTERED" | "ACCEPTED" | "ACTIVE" | "SUPERSEDED" | "REVOKED" | "REJECTED" | "ROLLED_BACK";
export type AvatarClassification = "CANONICAL" | "ACCOUNT_SELECTED" | "DEVICE_VARIANT";
export interface AvatarRegistryCandidate { readonly stableId: string; readonly character: "ONYX" | "NOVA"; readonly version: string; readonly integrityHash: string; readonly classification: AvatarClassification; readonly lifecycle: AvatarLifecycleState; readonly accountBound: true; }

const AVATAR_CLASSIFICATIONS: readonly AvatarClassification[] = ["CANONICAL", "ACCOUNT_SELECTED", "DEVICE_VARIANT"];
const AVATAR_LIFECYCLE_TRANSITIONS: Record<AvatarLifecycleState, readonly AvatarLifecycleState[]> = {
  DRAFT: ["REGISTERED", "REJECTED"],
  REGISTERED: ["ACCEPTED", "REJECTED"],
  ACCEPTED: ["ACTIVE", "REVOKED"],
  ACTIVE: ["SUPERSEDED", "REVOKED", "ROLLED_BACK"],
  SUPERSEDED: ["ROLLED_BACK"],
  REVOKED: [],
  REJECTED: [],
  ROLLED_BACK: ["ACTIVE"],
};

export function validateAvatarRegistryCandidate(candidate: AvatarRegistryCandidate, existing: readonly AvatarRegistryCandidate[] = []): Readonly<AvatarRegistryCandidate> {
  if (!candidate.stableId.startsWith(candidate.character.toLowerCase()) || !candidate.version || !candidate.integrityHash || candidate.accountBound !== true) throw new TypeError("Avatar registry candidate must preserve canonical character identity");
  if (!AVATAR_CLASSIFICATIONS.includes(candidate.classification)) throw new TypeError("Unknown avatar classification");
  if (!Object.keys(AVATAR_LIFECYCLE_TRANSITIONS).includes(candidate.lifecycle)) throw new TypeError("Unknown avatar lifecycle");
  if (existing.some((entry) => entry.stableId === candidate.stableId)) throw new TypeError("Duplicate avatar stable ID");
  return deepFreeze(structuredClone(candidate));
}

export function projectAvatarRegistryTransition(candidate: AvatarRegistryCandidate, nextLifecycle: AvatarLifecycleState): Readonly<AvatarRegistryCandidate> {
  if (!AVATAR_LIFECYCLE_TRANSITIONS[candidate.lifecycle].includes(nextLifecycle)) throw new TypeError("Invalid avatar lifecycle transition");
  return deepFreeze({ ...structuredClone(candidate), lifecycle: nextLifecycle });
}

export type SyncDevice = "DESKTOP" | "MOBILE" | "TABLET" | "TV";
export interface AvatarDeviceSelection { readonly device: SyncDevice; readonly accountId: string; readonly character: "ONYX" | "NOVA"; readonly avatarId: string; readonly canonicalVersion: string; readonly integrityHash: string; readonly stale: boolean; }

export function projectCrossDeviceAvatarSync(selections: readonly AvatarDeviceSelection[]) {
  const first = selections[0];
  if (!first || selections.length < 4) throw new TypeError("Cross-device sync requires desktop, mobile, tablet, and TV selections");
  const devices = new Set(selections.map((selection) => selection.device));
  const requiredDevices: readonly SyncDevice[] = ["DESKTOP", "MOBILE", "TABLET", "TV"];
  const consistent = requiredDevices.every((device) => devices.has(device))
    && selections.every((selection) => selection.accountId === first.accountId && selection.character === first.character && selection.avatarId === first.avatarId && selection.canonicalVersion === first.canonicalVersion && selection.integrityHash === first.integrityHash && !selection.stale);
  return deepFreeze({
    status: consistent ? "SYNC_ACCEPTED" as const : "SYNC_REJECTED" as const,
    canonicalAvatarId: consistent ? first.avatarId : null,
    canonicalVersion: consistent ? first.canonicalVersion : null,
    identityUnchanged: consistent,
    memoryScopeChanged: false as const,
    authorizationChanged: false as const,
    approvalChanged: false as const,
    sessionOwnershipChanged: false as const,
    reconnectProjectionOnly: true as const,
    rollbackProjectionOnly: true as const,
    revocationProjectionOnly: true as const,
  });
}

const TRANSITIONS: Partial<Record<SemanticState, Partial<Record<"USER_STARTED_SPEAKING" | "INPUT_UNDERSTOOD" | "REASONING_STARTED" | "WORK_STARTED" | "RESPONSE_STARTED" | "PRESENTATION_STARTED" | "OWNER_APPROVAL_NEEDED" | "PRIVACY_REQUIRED" | "INTERRUPT" | "RECOVER" | "DISCONNECT", SemanticState>>>> = {
  IDLE: { USER_STARTED_SPEAKING: "LISTENING", DISCONNECT: "OFFLINE" }, LISTENING: { INPUT_UNDERSTOOD: "UNDERSTANDING", INTERRUPT: "INTERRUPTED" }, UNDERSTANDING: { REASONING_STARTED: "THINKING" }, THINKING: { WORK_STARTED: "WORKING", RESPONSE_STARTED: "SPEAKING", OWNER_APPROVAL_NEEDED: "APPROVAL_REQUIRED" }, WORKING: { RESPONSE_STARTED: "SPEAKING", OWNER_APPROVAL_NEEDED: "APPROVAL_REQUIRED" }, SPEAKING: { PRESENTATION_STARTED: "PRESENTING", PRIVACY_REQUIRED: "PRIVACY_RESTRICTED", INTERRUPT: "INTERRUPTED" }, INTERRUPTED: { RECOVER: "RECOVERING" }, RECOVERING: { RECOVER: "IDLE" }, OFFLINE: { RECOVER: "RECOVERING" },
};

export function transitionSemanticState(state: SemanticState, event: keyof NonNullable<typeof TRANSITIONS[SemanticState]>): SemanticState {
  if (!SEMANTIC_STATES.includes(state)) throw new TypeError("Unknown semantic state");
  const next = TRANSITIONS[state]?.[event];
  if (!next) throw new TypeError("Invalid semantic transition");
  return next;
}

type DeviceInput = { readonly device: "TV" | "DESKTOP" | "MOBILE"; readonly renderers: readonly ("AVATAR_2D" | "TEXT" | "AUDIO")[]; readonly audio: boolean; readonly privateDisplay: boolean };
export function negotiateCapabilities(input: DeviceInput) {
  return deepFreeze({ ...structuredClone(input), interfaceClass: "PRESENCE_INTERFACE" as const, mirroring: false as const, selectedRenderer: input.renderers[0] ?? "TEXT", fallbackHierarchy: ["AVATAR_2D", "TEXT", "AUDIO", "OFFLINE"] });
}

export function projectPresentation(input: { readonly state: SemanticState; readonly device: ReturnType<typeof negotiateCapabilities>; readonly accessibility: { readonly reducedMotion: boolean; readonly highContrast: boolean; readonly captions: boolean; readonly textOnly: boolean } }) {
  return deepFreeze({ semanticState: input.state, renderer: input.accessibility.textOnly ? "TEXT" : input.device.selectedRenderer, motion: input.accessibility.reducedMotion ? "REDUCED_SEMANTIC_CUES" : "STANDARD_SEMANTIC_CUES", contrast: input.accessibility.highContrast ? "HIGH" : "STANDARD", captions: input.accessibility.captions, privateOutputAllowed: input.device.privateDisplay });
}

export function projectSharedRoom(input: { readonly classification: "PUBLIC" | "HOUSEHOLD" | "PRIVATE"; readonly text: string }) {
  return input.classification === "PRIVATE" ? deepFreeze({ classification: "RESTRICTED" as const, text: "Private content available on an authorized personal device." }) : deepFreeze(structuredClone(input));
}

export interface AvatarRegistryRecord { readonly avatarId: string; readonly character: "ONYX" | "NOVA"; readonly classification: "CANONICAL" | "ACCOUNT_SELECTED" | "DEVICE_VARIANT"; readonly lifecycle: "REGISTERED" | "ACTIVE_SELECTION" | "SUPERSEDED" | "ROLLED_BACK"; readonly accountBound: true; }
export interface RendererAdapter { readonly kind: "AVATAR" | "WORLD" | "AUDIO" | "DEVICE"; readonly optional: true; readonly changesSemantics: false; }
export interface AmbientWorldProjection { readonly semanticState: SemanticState; readonly syntheticOnly: true; readonly canDisclosePrivateContent: false; }

// CORR-AVATAR-001: complete freshness dependency/invalidation vocabulary, mirroring PA-GOV.
export const AVATAR_FRESHNESS_DEPENDENCIES = Object.freeze([
  "CANDIDATE_HEAD_AND_TREE",
  "PROTECTED_SOURCE_AND_TEST_FINGERPRINTS",
  "POLICY_VERSION",
  "ACCEPTANCE_REGISTRY_VERSION",
  "DEPENDENCY_LOCK_BINDING",
  "TOOLCHAIN_AND_VALIDATION_PROFILE",
  "ENVIRONMENT_PROFILE",
  "FEATURE_FLAG_SNAPSHOT",
  "DEPENDENT_EVIDENCE_IDS",
  "GENERATION_TIMESTAMP",
  "VALIDITY_WINDOW",
] as const);

export const AVATAR_INVALIDATION_TRIGGERS = Object.freeze([
  "CANDIDATE_HEAD_OR_TREE_CHANGE",
  "PROTECTED_HASH_CHANGE",
  "POLICY_VERSION_CHANGE",
  "ACCEPTANCE_REGISTRY_CHANGE",
  "DEPENDENCY_LOCK_CHANGE",
  "TOOLCHAIN_OR_PROFILE_CHANGE",
  "ENVIRONMENT_PROFILE_CHANGE",
  "FEATURE_FLAG_SNAPSHOT_CHANGE",
  "CONFLICTING_CURRENT_EVIDENCE",
  "SECURITY_INCIDENT",
  "OWNER_SCOPE_CHANGE",
  "SUPERSEDING_ACCEPTED_EVIDENCE",
] as const);

// CORR-AVATAR-003: closed Presentation Envelope evidence-reference boundary toward future PA-PRESENCE composition.
export interface PresentationEvidenceReference { readonly id: string; readonly hash: string; readonly classification: "CURRENT" | "STALE" | "INVALIDATED" | "NOT_ASSESSABLE"; }

export interface PresentationEnvelope {
  readonly candidateHead: string;
  readonly candidateTree: string;
  readonly correlationId: string;
  readonly characterId: "ONYX" | "NOVA";
  readonly avatarVersion: string;
  readonly semanticState: SemanticState;
  readonly privacyProjection: "PUBLIC" | "HOUSEHOLD" | "RESTRICTED";
  readonly accessibilityProjection: { readonly reducedMotion: boolean; readonly highContrast: boolean; readonly captions: boolean; readonly textOnly: boolean };
  readonly worldProjection: "NONE" | "AMBIENT_SYNTHETIC_ONLY";
  readonly evidenceReferences: readonly PresentationEvidenceReference[];
  readonly freshness: "CURRENT" | "STALE" | "INVALIDATED" | "NOT_ASSESSABLE";
}

const FORBIDDEN_PRESENTATION_FIELD_FRAGMENTS = ["rawmemory", "credential", "secret", "token", "password", "apikey", "unrestrictedevidence"];

export function validatePresentationEnvelope(envelope: PresentationEnvelope): Readonly<PresentationEnvelope> {
  if (!SEMANTIC_STATES.includes(envelope.semanticState)) throw new TypeError("Presentation envelope carries an unknown semantic state");
  for (const key of Object.keys(envelope)) {
    if (FORBIDDEN_PRESENTATION_FIELD_FRAGMENTS.some((forbidden) => key.toLowerCase().includes(forbidden))) throw new TypeError("Presentation envelope must not carry raw memory, credentials, secrets, or tokens");
  }
  for (const reference of envelope.evidenceReferences) {
    if (!reference.id || !reference.hash || !["CURRENT", "STALE", "INVALIDATED", "NOT_ASSESSABLE"].includes(reference.classification)) throw new TypeError("Evidence reference must be bounded to id, hash, and classification only");
  }
  if (envelope.privacyProjection === "RESTRICTED" && envelope.worldProjection !== "NONE") throw new TypeError("Shared or ambient projection must suppress restricted-privacy content");
  return deepFreeze(structuredClone(envelope));
}