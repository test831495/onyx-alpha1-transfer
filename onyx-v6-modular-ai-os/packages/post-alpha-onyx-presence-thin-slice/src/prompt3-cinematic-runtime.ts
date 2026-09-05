export const SEMANTIC_STATES = Object.freeze([
  "IDLE",
  "LISTENING",
  "UNDERSTANDING",
  "THINKING",
  "SPEAKING",
  "APPROVAL_REQUIRED",
  "PRIVACY_RESTRICTED",
  "RECOVERING",
] as const);

export type SemanticState = (typeof SEMANTIC_STATES)[number];
export type CharacterId = "ONYX" | "NOVA";
export type Prompt3PerformanceTier = "PREMIUM" | "BALANCED" | "LIGHTWEIGHT" | "SAFE";
export type RendererState = "UNINITIALIZED" | "LOADING" | "READY" | "FAILED" | "RECOVERING" | "PLACEHOLDER_READY";

export const DRONE_ROLES = Object.freeze(["RESEARCH", "VALIDATION", "BUILD", "TEST", "MEMORY", "GOVERNANCE", "SYNC", "RECOVERY", "SECURITY", "COST", "REPORTING", "ROUTING"] as const);
export const DRONE_STATES = Object.freeze(["IDLE", "RECEIVING_TASK", "WORKING", "WAITING", "VALIDATING", "HANDOFF", "COMPLETED", "BLOCKED", "RECOVERING", "OFFLINE"] as const);
export const AUDIO_CLASSES = Object.freeze(["IDENTITY_ONYX", "IDENTITY_NOVA", "AMBIENT_OPERATIONS_CENTER", "STATE_LISTENING", "STATE_THINKING", "STATE_SPEAKING", "APPROVAL_ALERT", "PRIVACY_ALERT", "RECOVERY_ALERT", "HANDOFF", "COMPLETION", "OFFLINE"] as const);

export type DroneRole = (typeof DRONE_ROLES)[number];
export type DroneState = (typeof DRONE_STATES)[number];
export type AudioClass = (typeof AUDIO_CLASSES)[number];

const fallbackLadder = Object.freeze(["FULL_CINEMATIC", "REDUCED_CINEMATIC", "STATIC_CHARACTER", "TEXT_SAFE_PRESENCE"] as const);
const allowedAssetStatuses = Object.freeze(["REFERENCE_ONLY", "DESIGN_ACCEPTED", "NON_FINAL_REFERENCE_PLACEHOLDER"] as const);
const allowedPromotionStatuses = Object.freeze(["PLACEHOLDER_READY", "REFERENCE_ONLY", "DESIGN_ACCEPTED"] as const);

export const PROMPT3_ACCEPTANCE_RECORDS = Object.freeze(
  ["P3-HERO-RIVE", "P3-HERO-STATES", "P3-DRONE-DOTLOTTIE", "P3-DRONE-ROLE", "P3-OPERATIONS-CENTER", "P3-HUD", "P3-WORLD", "P3-AUDIO", "P3-PERFORMANCE", "P3-TV", "P3-ACCESSIBILITY", "P3-REDUCED-MOTION", "P3-OFFLINE-FALLBACK", "P3-ASSET-GOVERNANCE", "P3-PRIVACY", "P3-INTEGRATION", "P3-CINEMATIC-SLICE"].map((family) => Object.freeze({
    requirementId: family,
    family,
    risk: family === "P3-PRIVACY" || family === "P3-ASSET-GOVERNANCE" ? "HIGH" : "MEDIUM",
    owner: "@onyx/post-alpha-onyx-presence-thin-slice",
    implementationPath: "packages/post-alpha-onyx-presence-thin-slice/src/prompt3-cinematic-runtime.ts",
    testPath: "packages/post-alpha-onyx-presence-thin-slice/tests/prompt3-cinematic-runtime.test.ts",
    evidenceReceipt: `/tmp/onyx-nova-prompt3-${family.toLowerCase()}.json`,
    assetDependency: family.includes("RIVE") || family.includes("DOTLOTTIE") || family === "P3-WORLD" || family === "P3-AUDIO" ? "DEFERRED_BY_ACCEPTED_BOUNDARY" : "NONE",
    providerDependency: "NONE",
    activationDependency: "NONE",
    blockerState: "NONE",
    reopeningTrigger: "contract, baseline, provenance, license, or activation boundary changes",
    coverage: family.includes("RIVE") || family.includes("DOTLOTTIE") || family === "P3-WORLD" || family === "P3-AUDIO" ? "DEFERRED_BY_ACCEPTED_BOUNDARY" : "COVERED",
  })),
);

export type HeroStateTokens = Readonly<{ bodyMotionClass: string; facialMotionClass: string; auraClass: string; lightingClass: string; hudClass: string; audioClass: AudioClass | "SILENT"; captionClass: string; attentionClass: string; transitionClass: string; reducedMotionClass: string; staticFallbackClass: string; textSafeLabel: string; sharedRoomPrivacyClass: string }>;

function token(bodyMotionClass: string, facialMotionClass: string, auraClass: string, lightingClass: string, hudClass: string, audioClass: AudioClass | "SILENT", captionClass: string, attentionClass: string, transitionClass: string, reducedMotionClass: string, staticFallbackClass: string, textSafeLabel: string, sharedRoomPrivacyClass: string): HeroStateTokens {
  return Object.freeze({ bodyMotionClass, facialMotionClass, auraClass, lightingClass, hudClass, audioClass, captionClass, attentionClass, transitionClass, reducedMotionClass, staticFallbackClass, textSafeLabel, sharedRoomPrivacyClass });
}

const heroTokens: Readonly<Record<SemanticState, HeroStateTokens>> = Object.freeze({
  IDLE: token("breathing", "neutral", "none", "calm", "available", "AMBIENT_OPERATIONS_CENTER", "none", "ambient", "settled", "reduced-idle", "static-idle", "Ready", "shared-room-normal"),
  LISTENING: token("attentive", "listening", "focus", "focused", "listening", "STATE_LISTENING", "listening", "user", "wake", "reduced-listening", "static-listening", "Listening", "shared-room-normal"),
  UNDERSTANDING: token("bounded-scan", "processing", "analysis", "analytical", "understanding", "STATE_THINKING", "processing", "content", "analyze", "reduced-understanding", "static-understanding", "Understanding", "shared-room-normal"),
  THINKING: token("bounded-orbit", "thinking", "analysis", "analytical", "thinking", "STATE_THINKING", "thinking", "content", "compose", "reduced-thinking", "static-thinking", "Thinking", "shared-room-normal"),
  SPEAKING: token("timed-speech", "speaking", "voice", "speaking", "speaking", "STATE_SPEAKING", "captioned", "room", "speak", "reduced-speaking", "static-speaking", "Speaking", "shared-room-normal"),
  APPROVAL_REQUIRED: token("hold-for-approval", "attentive", "approval", "approval", "approval-required", "APPROVAL_ALERT", "approval", "owner", "pause", "reduced-approval", "static-approval", "Approval required", "shared-room-approval"),
  PRIVACY_RESTRICTED: token("minimized", "minimized", "privacy", "shielded", "privacy-restricted", "PRIVACY_ALERT", "privacy", "private", "redact", "reduced-privacy", "static-privacy", "Privacy restricted", "shared-room-private"),
  RECOVERING: token("restoring", "steady", "recovery", "restoration", "recovering", "RECOVERY_ALERT", "recovery", "system", "restore", "reduced-recovery", "static-recovery", "Recovering", "shared-room-recovery"),
});

function isMember(values: readonly string[], value: unknown): value is string {
  return typeof value === "string" && values.includes(value);
}

function isSemanticStateValue(value: unknown): value is SemanticState {
  return isMember(SEMANTIC_STATES, value);
}

function isAudioClass(value: unknown): value is AudioClass {
  return isMember(AUDIO_CLASSES, value);
}

export function mapHeroStateTokens(state: unknown, reducedMotion = false): HeroStateTokens {
  if (!isSemanticStateValue(state)) return token("static", "neutral", "unknown", "safe", "unknown", "SILENT", "unknown", "none", "fail-closed", "reduced-unknown", "static-unknown", "Unknown presentation state", "shared-room-unknown");
  const mapped = heroTokens[state];
  return Object.freeze(reducedMotion ? { ...mapped, bodyMotionClass: mapped.reducedMotionClass, transitionClass: "instant" } : mapped);
}

export function createHeroPresentation(input: Readonly<{ character: CharacterId; state: unknown; reducedMotion?: boolean; sharedRoom?: boolean }>) {
  const state = isSemanticStateValue(input.state) ? input.state : "IDLE";
  return Object.freeze({ character: input.character, canonicalAvatarId: `${input.character.toLowerCase()}-prompt3-canonical`, canonicalAvatarVersion: "1.0.0", state, tokens: mapHeroStateTokens(state, input.reducedMotion === true), sharedRoom: input.sharedRoom === true, grantsAuthority: false as const, mutatesRouting: false as const, mutatesApproval: false as const });
}

export type Prompt3AssetCandidate = Readonly<{ stableId: string; version: string; classification: string; provenanceStatus: string; licenseStatus: string; integrityHashOrPlaceholderHash: string; promotionStatus: string; revocationStatus: string }>;

export function validatePrompt3AssetCandidate(candidate: Prompt3AssetCandidate) {
  const accepted = allowedAssetStatuses.includes(candidate.classification as never) && allowedPromotionStatuses.includes(candidate.promotionStatus as never) && candidate.revocationStatus === "NOT_REVOKED" && candidate.provenanceStatus !== "UNKNOWN" && /^sha256:[a-f0-9]{64}$/.test(candidate.integrityHashOrPlaceholderHash);
  return Object.freeze({ accepted, candidate: Object.freeze({ ...candidate }), reasons: accepted ? [] : ["PROMPT3_ASSET_CANDIDATE_FAIL_CLOSED"] });
}

export function createRiveHeroAdapter(input: Readonly<{ character: CharacterId; assetAvailable: boolean; integrityOk: boolean; revoked: boolean }>) {
  const rendererState: RendererState = input.revoked || (input.assetAvailable && !input.integrityOk) ? "FAILED" : input.assetAvailable ? "READY" : "PLACEHOLDER_READY";
  return Object.freeze({ adapter: "RIVE_HERO_ADAPTER_CONTRACT", character: input.character, rendererState, executableAsset: input.assetAvailable && input.integrityOk && !input.revoked, placeholder: !(input.assetAvailable && input.integrityOk && !input.revoked), transition: (state: unknown) => !isSemanticStateValue(state) || rendererState === "FAILED" ? Object.freeze({ accepted: false, rendererState: "FAILED" as const, grantsAuthority: false as const }) : Object.freeze({ accepted: true, rendererState, command: mapHeroStateTokens(state).transitionClass, grantsAuthority: false as const }) });
}

export function createDroneProjection(input: Record<string, unknown>) {
  const role = isMember(DRONE_ROLES, input.role) ? input.role : "REPORTING";
  const state = isMember(DRONE_STATES, input.state) ? input.state : "OFFLINE";
  const stale = typeof input.freshnessMs !== "number" || input.freshnessMs > 60_000;
  return Object.freeze({ role, state: stale ? "OFFLINE" : state, skin: Object.freeze({ colorClass: `drone-${role.toLowerCase()}`, icon: role.toLowerCase(), prop: "base-shell", aura: state.toLowerCase(), statusClass: `status-${state.toLowerCase()}` }), privateFieldsAccepted: false, grantsAuthority: false as const, rawPromptIncluded: false });
}

export function createWorldProjection(input: Readonly<{ world: "OPERATIONS_CENTER" | "FUTURE_CITY_REFERENCE_READY" | "STATIC_SAFE_WORLD" | "TEXT_SAFE_WORLD"; reducedMotion?: boolean; revoked?: boolean }>) {
  return Object.freeze({ world: input.world, theme: input.world === "OPERATIONS_CENTER" ? "operations-center" : "reference-placeholder", mood: "bounded-cinematic", lighting: input.reducedMotion ? "static" : "adaptive", audioClass: "AMBIENT_OPERATIONS_CENTER" as const, qualityTier: input.reducedMotion ? "SAFE" : "BALANCED", provenanceStatus: "REFERENCE_METADATA_INCOMPLETE", licenseStatus: "NOT_PROMOTED", integrityHash: "sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb", fallbackWorld: input.revoked === true || input.reducedMotion === true ? "STATIC_SAFE_WORLD" : "TEXT_SAFE_WORLD", revocationStatus: input.revoked === true ? "REVOKED" : "NOT_REVOKED", grantsAuthority: false as const });
}

export function createAudioClassProjection(input: Readonly<{ audioClass: unknown; muted?: boolean; reducedSensory?: boolean; sharedRoom?: boolean }>) {
  const audioClass = isAudioClass(input.audioClass) ? input.audioClass : "OFFLINE";
  const silent = input.muted === true || input.reducedSensory === true || input.sharedRoom === true;
  return Object.freeze({ audioClass, output: silent ? "SILENT_FALLBACK" : "AUDIO_CLASS_REFERENCE", provider: "NONE", volume: silent ? 0 : 0.35, grantsAuthority: false as const });
}

export function governCinematicPerformance(input: Readonly<{ requestedTier: Prompt3PerformanceTier; reducedMotion?: boolean; tv?: boolean; rendererFailed?: boolean; activeDroneCount?: number }>) {
  const tier: Prompt3PerformanceTier = input.rendererFailed || input.reducedMotion ? "SAFE" : input.tv ? "BALANCED" : input.requestedTier;
  const activeDroneLimit = tier === "PREMIUM" ? 12 : tier === "BALANCED" ? 8 : tier === "LIGHTWEIGHT" ? 4 : 2;
  return Object.freeze({ tier, heroVisible: true, semanticStateChanged: false, activeDroneLimit, aggregateDrones: (input.activeDroneCount ?? 0) > activeDroneLimit, transitionComplexity: tier === "SAFE" ? "STATIC" : "BOUNDED" });
}

export function buildOperationsCenterComposition(input: Readonly<{ characterStates: Readonly<Record<CharacterId, SemanticState>>; reducedMotion?: boolean; sharedRoom?: boolean; tv?: boolean; tasks: readonly Record<string, unknown>[]; route: Readonly<{ status: string; candidateCountBand: string }>; offline?: boolean }>) {
  return Object.freeze({ syntheticHarness: true, layers: Object.freeze(["BACKGROUND_WORLD", "HERO", "DRONE_ACTIVITY", "HUD", "ALERTS", "ACCESSIBILITY_OVERLAY"] as const), heroes: Object.freeze([createHeroPresentation({ character: "ONYX", state: input.characterStates.ONYX, reducedMotion: input.reducedMotion, sharedRoom: input.sharedRoom }), createHeroPresentation({ character: "NOVA", state: input.characterStates.NOVA, reducedMotion: input.reducedMotion, sharedRoom: input.sharedRoom })]), hud: Object.freeze({ tasks: Object.freeze(input.tasks.slice(0, 16).map((task) => Object.freeze({ id: String(task.id ?? "unknown"), stage: String(task.stage ?? "UNKNOWN"), status: typeof task.freshnessMs === "number" && task.freshnessMs > 300_000 ? "STALE" : String(task.status ?? "UNKNOWN"), rawPromptIncluded: false, endpointIncluded: false }))), route: Object.freeze({ ...input.route, grantsAuthority: false }), sync: input.offline ? "OFFLINE" : "FRESH" }), tv: Object.freeze({ enabled: input.tv === true, safeZone: input.tv === true, focusVisible: true, noHoverOnlyAction: true }), accessibility: Object.freeze({ reducedMotion: input.reducedMotion === true, captions: true, liveRegion: "BOUNDED", colorOnly: false, focusVisible: true }), world: createWorldProjection({ world: "OPERATIONS_CENTER", reducedMotion: input.reducedMotion }), audio: createAudioClassProjection({ audioClass: input.offline ? "OFFLINE" : "AMBIENT_OPERATIONS_CENTER", muted: input.sharedRoom }), fallbackLadder, noProductionActivation: true });
}

export function buildCinematicHarness() {
  return Object.freeze({ harnessOnly: true, syntheticDataDisclosed: true, noProductionActivation: true, noRealProviderData: true, noSecretData: true, characters: Object.freeze(["ONYX", "NOVA"] as const), states: SEMANTIC_STATES, droneRoles: DRONE_ROLES, droneStates: DRONE_STATES, fallbackLadder, composition: buildOperationsCenterComposition({ characterStates: { ONYX: "IDLE", NOVA: "THINKING" }, tasks: [{ id: "synthetic-task", stage: "BUILD", status: "IN_PROGRESS", freshnessMs: 1 }], route: { status: "EVALUATING", candidateCountBand: "SMALL" } }) });
}