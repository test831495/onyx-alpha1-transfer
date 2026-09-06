import {
  choosePerformanceTier,
  type PerformanceTier,
} from "@onyx/post-alpha-performance-governor";
import { renderIntent } from "@onyx/post-alpha-character-renderer-native";

export const ACTIVATION_CONTROL_ID =
  "ONYX_NOVA_NATIVE_SEMANTIC_FALLBACK_VISUAL_ACTIVATION_V1" as const;
export const AUTHORIZED_PRIVATE_ALPHA_STATE = "PRIVATE_ALPHA_ENABLED" as const;
export type ActivationState =
  | "OFF"
  | "PRIVATE_ALPHA_CANARY"
  | typeof AUTHORIZED_PRIVATE_ALPHA_STATE;

export type ActivationControl = Readonly<{
  readonly id: typeof ACTIVATION_CONTROL_ID;
  readonly state: ActivationState;
}>;

export const PRIVATE_ALPHA_BUILD_ACTIVATION: ActivationControl = Object.freeze({
  id: ACTIVATION_CONTROL_ID,
  state: AUTHORIZED_PRIVATE_ALPHA_STATE,
});

export const NATIVE_SEMANTIC_STATES = [
  "IDLE",
  "LISTENING",
  "UNDERSTANDING",
  "THINKING",
  "SPEAKING",
  "APPROVAL_REQUIRED",
  "PRIVACY_RESTRICTED",
  "RECOVERING",
] as const;
export type NativeSemanticState = (typeof NATIVE_SEMANTIC_STATES)[number];
export type NativeCharacter = "ONYX" | "NOVA";
export type NativeQuality = "full" | "balanced" | "low";

const labels: Record<NativeSemanticState, string> = {
  IDLE: "ready",
  LISTENING: "listening",
  UNDERSTANDING: "understanding",
  THINKING: "thinking",
  SPEAKING: "speaking",
  APPROVAL_REQUIRED: "approval required",
  PRIVACY_RESTRICTED: "privacy restricted",
  RECOVERING: "recovering",
};

export function resolveActivationState(value?: unknown): ActivationState {
  if (
    value === "OFF" ||
    value === "PRIVATE_ALPHA_CANARY" ||
    value === AUTHORIZED_PRIVATE_ALPHA_STATE
  ) {
    return value;
  }
  return "OFF";
}

export function mapCoreStateToSemanticState(value: unknown): NativeSemanticState {
  if (isNativeSemanticState(value)) {
    return value;
  }

  switch (value) {
    case "listening":
      return "LISTENING";
    case "thinking":
      return "THINKING";
    case "executing":
      return "UNDERSTANDING";
    case "speaking":
      return "SPEAKING";
    case "wake-armed":
      return "IDLE";
    case "error":
    default:
      return "RECOVERING";
  }
}

function isNativeSemanticState(value: unknown): value is NativeSemanticState {
  return (
    typeof value === "string" &&
    (NATIVE_SEMANTIC_STATES as readonly string[]).includes(value)
  );
}

export type NativeSemanticProjection = Readonly<{
  readonly enabled: boolean;
  readonly character: NativeCharacter;
  readonly state: NativeSemanticState;
  readonly label: string;
  readonly truthLabel: "REPOSITORY_NATIVE_SEMANTIC_FALLBACK_ACTIVE";
  readonly fallback: boolean;
  readonly authority: false;
  readonly provider: "none";
  readonly performanceTier: PerformanceTier;
  readonly motion: "subtle" | "focused" | "analytical" | "timed" | "reduced" | "static";
}>;

export function performanceTierForQuality(
  quality: NativeQuality,
  reducedMotion = false,
): PerformanceTier {
  const signals = {
    fps: quality === "full" ? 60 : quality === "balanced" ? 50 : 30,
    frameTimeMs: quality === "full" ? 16 : quality === "balanced" ? 22 : 33,
    reducedMotion,
    tv: false,
    memoryPressure: false,
    stableSamples: 2,
  };
  const previous =
    quality === "full"
      ? "PREMIUM_CINEMATIC"
      : quality === "balanced"
        ? "BALANCED"
        : "LIGHTWEIGHT";
  return choosePerformanceTier(signals, previous).tier;
}

export function projectNativeSemanticFallback(
  control: ActivationControl,
  character: NativeCharacter,
  value: unknown,
  options: Readonly<{ quality?: NativeQuality; reducedMotion?: boolean }> = {},
): NativeSemanticProjection {
  const state = isNativeSemanticState(value) ? value : "RECOVERING";
  const enabled =
    control.id === ACTIVATION_CONTROL_ID &&
    resolveActivationState(control.state) !== "OFF";
  const intent = renderIntent(character, state, {
    reducedMotion: options.reducedMotion,
  });
  return Object.freeze({
    enabled,
    character,
    state,
    label: `${character} ${labels[state]}`,
    truthLabel: "REPOSITORY_NATIVE_SEMANTIC_FALLBACK_ACTIVE" as const,
    fallback: !enabled || state === "RECOVERING",
    authority: false as const,
    provider: "none" as const,
    performanceTier: performanceTierForQuality(
      options.quality ?? "balanced",
      options.reducedMotion ?? false,
    ),
    motion: intent.motion,
  });
}