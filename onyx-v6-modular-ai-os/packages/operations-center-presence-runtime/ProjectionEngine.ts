import type {
  AuraProfile,
  CaptionProfile,
  CharacterProjection,
  MotionProfile,
  ReactorMode,
} from "./CharacterProjection.js";
import {
  PRESENCE_SPEAKERS,
  PRESENCE_STATES,
  type PresenceInput,
  type PresenceSpeaker,
  type PresenceState,
} from "./PresenceState.js";

const AURA_PROFILES: Readonly<Record<PresenceState, AuraProfile>> = Object.freeze({
  IDLE: Object.freeze({ kind: "CALM", cssClass: "aura-calm", intensity: "LOW" }),
  LISTENING: Object.freeze({ kind: "LISTENING", cssClass: "aura-listening listening-glow", intensity: "MEDIUM" }),
  UNDERSTANDING: Object.freeze({ kind: "THINKING", cssClass: "aura-understanding thinking-pulse", intensity: "MEDIUM" }),
  THINKING: Object.freeze({ kind: "THINKING", cssClass: "aura-thinking thinking-pulse", intensity: "HIGH" }),
  SPEAKING: Object.freeze({ kind: "SPEAKING", cssClass: "aura-speaking speaking-glow", intensity: "HIGH" }),
  APPROVAL_REQUIRED: Object.freeze({ kind: "APPROVAL", cssClass: "aura-approval approval-amber", intensity: "HIGH" }),
  PRIVACY_RESTRICTED: Object.freeze({ kind: "PRIVACY", cssClass: "aura-privacy privacy-shield", intensity: "MEDIUM" }),
  RECOVERING: Object.freeze({ kind: "RECOVERY", cssClass: "aura-recovering recovery-visualization", intensity: "MEDIUM" }),
});

const CAPTION_LABELS: Readonly<Record<PresenceState, string>> = Object.freeze({
  IDLE: "Ready",
  LISTENING: "Listening",
  UNDERSTANDING: "Understanding",
  THINKING: "Thinking",
  SPEAKING: "Speaking",
  APPROVAL_REQUIRED: "Approval required",
  PRIVACY_RESTRICTED: "Privacy restricted",
  RECOVERING: "Recovering",
});

const REACTOR_MODES: Readonly<Record<PresenceState, ReactorMode>> = Object.freeze({
  IDLE: "SYSTEM_READY",
  LISTENING: "LISTENING",
  UNDERSTANDING: "UNDERSTANDING",
  THINKING: "THINKING",
  SPEAKING: "SPEAKING",
  APPROVAL_REQUIRED: "SYSTEM_READY",
  PRIVACY_RESTRICTED: "SYSTEM_READY",
  RECOVERING: "SYSTEM_READY",
});

const BLINK_PROFILE: MotionProfile = Object.freeze({
  enabled: true,
  durationMs: 140,
  intervalMs: 4_200,
  cssClass: "blink-scheduler",
});

const BREATHING_PROFILE: MotionProfile = Object.freeze({
  enabled: true,
  durationMs: 4_000,
  intervalMs: 4_000,
  cssClass: "breathing-scheduler",
});

function isPresenceState(value: unknown): value is PresenceState {
  return typeof value === "string" && (PRESENCE_STATES as readonly string[]).includes(value);
}

function isPresenceSpeaker(value: unknown): value is PresenceSpeaker {
  return typeof value === "string" && (PRESENCE_SPEAKERS as readonly string[]).includes(value);
}

function normalizeInput(input: unknown): PresenceInput {
  if (
    typeof input === "object" &&
    input !== null &&
    isPresenceSpeaker(Reflect.get(input, "speaker")) &&
    isPresenceState(Reflect.get(input, "state"))
  ) {
    return Object.freeze({
      speaker: Reflect.get(input, "speaker") as PresenceSpeaker,
      state: Reflect.get(input, "state") as PresenceState,
    });
  }

  return Object.freeze({ speaker: "NONE", state: "PRIVACY_RESTRICTED" });
}

export function projectCharacterPresence(input: unknown): CharacterProjection {
  const normalized = normalizeInput(input);
  const reactorMode = normalized.speaker === "COUNCIL" ? "COUNCIL" : REACTOR_MODES[normalized.state];
  const captionProfile: CaptionProfile = Object.freeze({
    visible: normalized.state !== "IDLE",
    label: CAPTION_LABELS[normalized.state],
    ariaLive: normalized.state === "APPROVAL_REQUIRED" ? "assertive" : normalized.state === "IDLE" ? "off" : "polite",
  });

  return Object.freeze({
    activeSpeaker: normalized.speaker,
    state: normalized.state,
    focusMode: normalized.speaker === "NONE" ? "AMBIENT" : normalized.speaker,
    auraProfile: AURA_PROFILES[normalized.state],
    reactorProfile: Object.freeze({
      mode: reactorMode,
      cssClass: `reactor-${reactorMode.toLowerCase().replace(/_/g, "-")}`,
      animated: reactorMode !== "SYSTEM_READY",
    }),
    captionProfile,
    councilProfile: Object.freeze({
      visible: normalized.speaker === "COUNCIL",
      cssClass: normalized.speaker === "COUNCIL" ? "council-active" : "council-hidden",
      members: Object.freeze(["ONYX", "NOVA"] as const),
      advisoryOnly: true,
      grantsAuthority: false,
    }),
    blinkProfile: BLINK_PROFILE,
    breathingProfile: BREATHING_PROFILE,
    offlineCapable: true,
    grantsAuthority: false,
  });
}

export function blinkAt(profile: MotionProfile, elapsedMs: number): boolean {
  if (!profile.enabled || !Number.isFinite(elapsedMs) || elapsedMs < 0) return false;
  return elapsedMs % profile.intervalMs < profile.durationMs;
}

export function breathingScaleAt(profile: MotionProfile, elapsedMs: number): number {
  if (!profile.enabled || !Number.isFinite(elapsedMs) || elapsedMs < 0) return 1;
  const phase = (elapsedMs % profile.intervalMs) / profile.durationMs;
  return 1 + Math.sin(phase * Math.PI * 2) * 0.012;
}