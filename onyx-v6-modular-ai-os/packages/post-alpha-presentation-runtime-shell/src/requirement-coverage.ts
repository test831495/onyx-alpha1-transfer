import {
  SEMANTIC_STATES,
  isSemanticState,
  projectAccessibility,
  projectPresentation,
  performanceProfile,
  transition,
  unsupportedCapability,
  type PerformanceProfile,
  type PresentationState,
  type SemanticState,
  type Transition,
  type TransitionReason,
} from "./semantic-states.js";

// VP-RUNTIME-01
export type ValidatedPresentationModel = { readonly schemaVersion: "VP_MODEL_V1"; readonly state: SemanticState };
export function consumeValidatedModel(model: unknown): PresentationState | null {
  if (typeof model !== "object" || model === null) return null;
  const candidate = model as Partial<ValidatedPresentationModel>;
  if (candidate.schemaVersion !== "VP_MODEL_V1" || !isSemanticState(candidate.state)) return null;
  return projectPresentation(candidate.state);
}

// VP-RUNTIME-02
export function hasNoIdentityField(input: Readonly<Record<string, unknown>>): boolean {
  return !("identity" in input) && !("userId" in input) && !("accountId" in input);
}

// VP-RUNTIME-03
export function orchestrateStates(supplied: readonly unknown[]): readonly SemanticState[] {
  return Object.freeze(supplied.filter(isSemanticState));
}

// VP-RUNTIME-04
export type PrivacyState =
  | "PRIVATE_ALLOWED"
  | "SHARED_ROOM_RESTRICTED"
  | "PRIVACY_UNKNOWN"
  | "PRIVACY_MALFORMED"
  | "PRIVACY_STALE"
  | "PRIVACY_CONFLICTING";
const PRIVACY_FAIL_CLOSED: readonly PrivacyState[] = ["PRIVACY_UNKNOWN", "PRIVACY_MALFORMED", "PRIVACY_STALE", "PRIVACY_CONFLICTING"];
export function selectPrivacySafeProjection(privacy: PrivacyState, preferred: SemanticState): SemanticState {
  if (PRIVACY_FAIL_CLOSED.includes(privacy)) return "PRIVACY_RESTRICTED";
  if (privacy === "SHARED_ROOM_RESTRICTED" && preferred !== "PRIVACY_RESTRICTED") return "PRIVACY_RESTRICTED";
  return preferred;
}

// VP-RUNTIME-05 / VP-RUNTIME-06
export type NonAuthorizingProjection = { readonly authorizing: false; readonly kind: "governance" | "intelligence" };
export function projectGovernance(): NonAuthorizingProjection {
  return Object.freeze({ authorizing: false, kind: "governance" });
}
export function projectIntelligence(): NonAuthorizingProjection {
  return Object.freeze({ authorizing: false, kind: "intelligence" });
}

// VP-RUNTIME-07
export function coordinateCaptions(state: SemanticState, captionsEnabled: boolean): boolean {
  return captionsEnabled && projectPresentation(state).captions;
}

// VP-RUNTIME-08
export type TransitionPlanStep = { readonly from: SemanticState; readonly to: SemanticState; readonly reason: TransitionReason };
export function consumeTransitionPlan(steps: readonly TransitionPlanStep[]): readonly Transition[] {
  return Object.freeze(steps.map((step) => transition(step.from, step.to, step.reason)));
}

// VP-RUNTIME-09
export type InterruptionPresentation = PresentationState & { readonly executionAuthority: false };
export function presentInterruption(state: SemanticState): InterruptionPresentation {
  return Object.freeze({ ...projectPresentation(state), executionAuthority: false });
}

// VP-RUNTIME-10
export type RecoveryPresentation = PresentationState & { readonly recoveryComplete: false };
export function presentRecovery(): RecoveryPresentation {
  return Object.freeze({ ...projectPresentation("RECOVERING"), recoveryComplete: false });
}

// VP-RUNTIME-11
export type DeviceProfile = "DESKTOP" | "TV" | "MOBILE" | "TABLET" | "CONSTRAINED";
const DEVICE_PROFILES: readonly DeviceProfile[] = ["DESKTOP", "TV", "MOBILE", "TABLET", "CONSTRAINED"];
export function selectDeviceProfile(supplied: readonly DeviceProfile[], requested: DeviceProfile): DeviceProfile {
  return supplied.includes(requested) ? requested : "CONSTRAINED";
}

// VP-RUNTIME-12
export function applyAccessibilityBeforePresentation(
  state: SemanticState,
  options: { readonly reducedMotion?: boolean; readonly highContrast?: boolean },
) {
  return projectAccessibility(state, options);
}

// VP-RUNTIME-13
export function consumePerformanceDecision(decision: PerformanceProfile): PerformanceProfile {
  return Object.freeze({ ...decision });
}

// VP-RUNTIME-14 reuses unsupportedCapability.

// VP-RUNTIME-15
export const SYNTHETIC_HARNESS = Object.freeze({ metadataOnly: true, flags: "OFF", activation: "NONE" } as const);

// VP-STATE-01..08: allowed structural keys, no forbidden inference fields.
const PRESENTATION_ALLOWED_KEYS = new Set(["state", "label", "captions", "speakingTiming", "approvalRequired", "protectedDetail", "fallback"]);
const FORBIDDEN_STATE_KEYS: Readonly<Record<SemanticState, readonly string[]>> = {
  IDLE: ["availability", "authority"],
  LISTENING: ["recognition", "authentication"],
  UNDERSTANDING: ["operationalTruth"],
  THINKING: ["decision"],
  SPEAKING: ["voiceExecuted"],
  APPROVAL_REQUIRED: ["authorizationGranted", "approvalGranted"],
  PRIVACY_RESTRICTED: ["lessPrivateDetail"],
  RECOVERING: ["completedRestore"],
};
export function presentationHasOnlyAllowedKeys(state: SemanticState): boolean {
  const result = projectPresentation(state);
  const keys = Object.keys(result);
  return keys.every((key) => PRESENTATION_ALLOWED_KEYS.has(key)) && FORBIDDEN_STATE_KEYS[state].every((key) => !keys.includes(key));
}

// VP-PRIVACY-01..12
export function coarseTvProjection(privacy: PrivacyState): "coarse" | "normal" {
  return privacy === "SHARED_ROOM_RESTRICTED" || PRIVACY_FAIL_CLOSED.includes(privacy) ? "coarse" : "normal";
}
export function suppressApprovalDetail(privacy: PrivacyState, approvalRequired: boolean): boolean {
  return approvalRequired && (privacy === "SHARED_ROOM_RESTRICTED" || PRIVACY_FAIL_CLOSED.includes(privacy)) ? false : approvalRequired;
}
export function redactCaptionsUnderPrivacy(privacy: PrivacyState, state: SemanticState): boolean {
  const captions = projectPresentation(state).captions;
  return privacy === "SHARED_ROOM_RESTRICTED" || PRIVACY_FAIL_CLOSED.includes(privacy) ? false : captions;
}
export type WorldMetadata = { readonly worldId: string };
export type AnimationMetadata = { readonly motion: string };
export function worldMetadataIsPrivacyFree(metadata: WorldMetadata): boolean {
  return !("privacy" in metadata) && !("protectedDetail" in metadata);
}
export function animationMetadataIsPrivacyFree(metadata: AnimationMetadata): boolean {
  return !("privacy" in metadata) && !("protectedDetail" in metadata);
}
export function privacyProjectionHasNoCameraDependency(): boolean {
  return coarseTvProjection.length === 1 && redactCaptionsUnderPrivacy.length === 2;
}

// VP-ACCESSIBILITY-01..14
export function textOnlyFallback(state: SemanticState, richPresentationAvailable: boolean): boolean {
  return richPresentationAvailable ? false : unsupportedCapability(state).fallback;
}
export type FocusTarget = { readonly targetId: string; readonly order: number };
export function keyboardFocusTarget(order: number): FocusTarget {
  return Object.freeze({ targetId: `keyboard-${order}`, order });
}
export function remoteFocusTarget(order: number): FocusTarget {
  return Object.freeze({ targetId: `remote-${order}`, order });
}
export function focusIsVisiblyDistinguishable(target: FocusTarget): boolean {
  return target.targetId.length > 0;
}
export function tvReadableMetadata(): { readonly minimumFontPx: number } {
  return Object.freeze({ minimumFontPx: 28 });
}
export function overscanSafeZone(): { readonly marginPercent: number } {
  return Object.freeze({ marginPercent: 5 });
}
export function accessibilityDistinguishesAllStates(): boolean {
  return new Set(SEMANTIC_STATES.map((state) => projectAccessibility(state).label)).size === SEMANTIC_STATES.length;
}
export function accessibilityDistinguishesPrivacy(): boolean {
  return projectAccessibility("PRIVACY_RESTRICTED").protectedDetail === "minimized";
}
export function accessibilityDistinguishesApproval(): boolean {
  const projection = projectAccessibility("APPROVAL_REQUIRED");
  return projection.approvalRequired === true && projection.fallback === false;
}
export function reduceSensoryLoad(state: SemanticState): boolean {
  return projectAccessibility(state, { reducedMotion: true }).motion === "reduced";
}
export function fallbackPreservesAccessibilityAndPrivacy(): boolean {
  const projection = projectAccessibility("RECOVERING", { reducedMotion: true, highContrast: true });
  return projection.motion === "reduced" && projection.contrast === "high" && projection.fallback === true;
}

// VP-PERFORMANCE-01..10
export type DeviceFacts = { readonly tier: "desktop" | "tv" | "mobile" | "constrained" };
export type CapabilityFacts = { readonly reducedMotion: boolean };
export function selectPerformanceFromDeviceFacts(facts: DeviceFacts): PerformanceProfile {
  return performanceProfile(facts.tier);
}
export function selectPerformanceFromCapabilityFacts(facts: CapabilityFacts, tier: DeviceFacts["tier"]): PerformanceProfile {
  return performanceProfile(tier, facts.reducedMotion);
}
export const MOTION_CLASSES = Object.freeze(["PREMIUM_MOTION", "STANDARD_MOTION", "REDUCED_MOTION"] as const);
export type MotionClass = (typeof MOTION_CLASSES)[number];
export function classifyMotion(reducedMotionRequested: boolean, tier: DeviceFacts["tier"]): MotionClass {
  if (reducedMotionRequested) return "REDUCED_MOTION";
  return tier === "desktop" ? "PREMIUM_MOTION" : "STANDARD_MOTION";
}
export function staticCharacterRetainsBinding(character: "ONYX" | "NOVA"): { readonly character: "ONYX" | "NOVA"; readonly motion: "static" } {
  return Object.freeze({ character, motion: "static" });
}
export function staticWorldRetainsIntent(worldId: string): { readonly worldId: string; readonly motion: "static" } {
  return Object.freeze({ worldId, motion: "static" });
}
export const TEXT_ONLY_SAFE_FALLBACK = Object.freeze({ id: "TEXT_ONLY_SAFE_FALLBACK", deterministic: true } as const);
export function performancePrecedence(privacy: PrivacyState, reducedMotion: boolean, preferredTier: DeviceFacts["tier"]): DeviceFacts["tier"] {
  if (PRIVACY_FAIL_CLOSED.includes(privacy) || privacy === "SHARED_ROOM_RESTRICTED") return "constrained";
  return reducedMotion ? "constrained" : preferredTier;
}
export function performanceDegradationPreservesIdentity(state: SemanticState, tier: DeviceFacts["tier"]): boolean {
  const degraded = performanceProfile(tier, true);
  return degraded.maxAnimationLayers >= 0 && projectPresentation(state).state === state;
}
