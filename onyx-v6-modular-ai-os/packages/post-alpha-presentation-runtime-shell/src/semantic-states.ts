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

export type TransitionReason =
  | "input-received"
  | "input-understood"
  | "response-prepared"
  | "speech-started"
  | "approval-needed"
  | "privacy-requested"
  | "recovery-needed"
  | "recovery-complete"
  | "cancelled"
  | "unsupported-capability";

export type PresentationState = {
  readonly state: SemanticState;
  readonly label: string;
  readonly captions: boolean;
  readonly speakingTiming: "none" | "planned";
  readonly approvalRequired: boolean;
  readonly protectedDetail: "minimized" | "none" | "normal";
  readonly fallback: boolean;
};

export type AccessibilityOptions = {
  readonly reducedMotion?: boolean;
  readonly highContrast?: boolean;
  readonly captions?: boolean;
};

export type AccessibilityProjection = PresentationState & {
  readonly motion: "subtle" | "reduced" | "static";
  readonly contrast: "standard" | "high";
};

export type Transition = {
  readonly from: SemanticState;
  readonly to: SemanticState;
  readonly reason: TransitionReason;
  readonly accepted: boolean;
};

export type PerformanceProfile = {
  readonly startup: "STARTUP_FAST" | "STARTUP_BALANCED" | "STARTUP_CONSTRAINED";
  readonly frame: "FRAME_FULL" | "FRAME_REDUCED" | "FRAME_STATIC";
  readonly memory: "MEMORY_DESKTOP" | "MEMORY_TV" | "MEMORY_MOBILE" | "MEMORY_CONSTRAINED";
  readonly maxAnimationLayers: number;
  readonly maxAmbientAudioLayers: number;
};

export type CinematicSession = {
  readonly state: SemanticState;
  readonly character: "ONYX" | "NOVA";
  readonly world: "OPERATIONS_CENTER" | "FUTURE_CITY";
  readonly cancelled: boolean;
  readonly presentation: AccessibilityProjection;
};

const transitions: Readonly<Record<SemanticState, readonly SemanticState[]>> = {
  IDLE: ["LISTENING", "RECOVERING"],
  LISTENING: ["UNDERSTANDING", "PRIVACY_RESTRICTED", "RECOVERING"],
  UNDERSTANDING: ["THINKING", "APPROVAL_REQUIRED", "PRIVACY_RESTRICTED", "RECOVERING"],
  THINKING: ["SPEAKING", "APPROVAL_REQUIRED", "PRIVACY_RESTRICTED", "RECOVERING"],
  SPEAKING: ["IDLE", "APPROVAL_REQUIRED", "PRIVACY_RESTRICTED", "RECOVERING"],
  APPROVAL_REQUIRED: ["SPEAKING", "PRIVACY_RESTRICTED", "RECOVERING", "IDLE"],
  PRIVACY_RESTRICTED: ["IDLE", "RECOVERING"],
  RECOVERING: ["IDLE", "LISTENING"],
};

const labels: Readonly<Record<SemanticState, string>> = {
  IDLE: "Ready",
  LISTENING: "Listening",
  UNDERSTANDING: "Understanding",
  THINKING: "Thinking",
  SPEAKING: "Speaking",
  APPROVAL_REQUIRED: "Approval required",
  PRIVACY_RESTRICTED: "Privacy restricted",
  RECOVERING: "Recovering",
};

export function isSemanticState(value: unknown): value is SemanticState {
  return typeof value === "string" && (SEMANTIC_STATES as readonly string[]).includes(value);
}

export function transition(
  from: SemanticState,
  to: SemanticState,
  reason: TransitionReason,
): Transition {
  return Object.freeze({ from, to, reason, accepted: transitions[from].includes(to) });
}

export function projectPresentation(state: SemanticState): PresentationState {
  return Object.freeze({
    state,
    label: labels[state],
    captions: state === "SPEAKING",
    speakingTiming: state === "SPEAKING" ? "planned" : "none",
    approvalRequired: state === "APPROVAL_REQUIRED",
    protectedDetail: state === "PRIVACY_RESTRICTED" ? "minimized" : "normal",
    fallback: state === "RECOVERING",
  });
}

export function projectAccessibility(
  state: SemanticState,
  options: AccessibilityOptions = {},
): AccessibilityProjection {
  const presentation = projectPresentation(state);
  return Object.freeze({
    ...presentation,
    captions: options.captions ?? presentation.captions,
    motion: options.reducedMotion ? "reduced" : state === "IDLE" ? "subtle" : "static",
    contrast: options.highContrast ? "high" : "standard",
  });
}

export function performanceProfile(
  tier: "desktop" | "tv" | "mobile" | "constrained",
  reducedMotion = false,
): PerformanceProfile {
  const profiles: Record<typeof tier, PerformanceProfile> = {
    desktop: { startup: "STARTUP_FAST", frame: "FRAME_FULL", memory: "MEMORY_DESKTOP", maxAnimationLayers: 4, maxAmbientAudioLayers: 3 },
    tv: { startup: "STARTUP_BALANCED", frame: "FRAME_REDUCED", memory: "MEMORY_TV", maxAnimationLayers: 3, maxAmbientAudioLayers: 2 },
    mobile: { startup: "STARTUP_BALANCED", frame: "FRAME_REDUCED", memory: "MEMORY_MOBILE", maxAnimationLayers: 2, maxAmbientAudioLayers: 1 },
    constrained: { startup: "STARTUP_CONSTRAINED", frame: "FRAME_STATIC", memory: "MEMORY_CONSTRAINED", maxAnimationLayers: 0, maxAmbientAudioLayers: 0 },
  };
  const profile = profiles[tier];
  return Object.freeze(reducedMotion ? { ...profile, frame: "FRAME_STATIC", maxAnimationLayers: 0 } : profile);
}

export function createCinematicSession(
  character: "ONYX" | "NOVA" = "ONYX",
  world: "OPERATIONS_CENTER" | "FUTURE_CITY" = "OPERATIONS_CENTER",
  state: SemanticState = "IDLE",
  options: AccessibilityOptions = {},
): CinematicSession {
  return Object.freeze({ state, character, world, cancelled: false, presentation: projectAccessibility(state, options) });
}

export function cancelSession(session: CinematicSession): CinematicSession {
  return Object.freeze({ ...session, cancelled: true });
}

export function unsupportedCapability(state: SemanticState): PresentationState {
  return Object.freeze({ ...projectPresentation(state), fallback: true, speakingTiming: "none" });
}