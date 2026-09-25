import type { PresenceSpeaker, PresenceState } from "./PresenceState.js";

export type CharacterId = "ONYX" | "NOVA";
export type FocusMode = "AMBIENT" | "ONYX" | "NOVA" | "COUNCIL";
export type AuraKind = "CALM" | "LISTENING" | "THINKING" | "SPEAKING" | "APPROVAL" | "PRIVACY" | "RECOVERY";
export type ReactorMode = "SYSTEM_READY" | "LISTENING" | "UNDERSTANDING" | "THINKING" | "SPEAKING" | "COUNCIL";

export type AuraProfile = Readonly<{
  kind: AuraKind;
  cssClass: string;
  intensity: "LOW" | "MEDIUM" | "HIGH";
}>;

export type ReactorProfile = Readonly<{
  mode: ReactorMode;
  cssClass: string;
  animated: boolean;
}>;

export type CaptionProfile = Readonly<{
  visible: boolean;
  label: string;
  ariaLive: "off" | "polite" | "assertive";
}>;

export type CouncilProfile = Readonly<{
  visible: boolean;
  cssClass: string;
  members: readonly CharacterId[];
  advisoryOnly: true;
  grantsAuthority: false;
}>;

export type MotionProfile = Readonly<{
  enabled: boolean;
  durationMs: number;
  intervalMs: number;
  cssClass: string;
}>;

export type CharacterProjection = Readonly<{
  activeSpeaker: PresenceSpeaker;
  state: PresenceState;
  focusMode: FocusMode;
  auraProfile: AuraProfile;
  reactorProfile: ReactorProfile;
  captionProfile: CaptionProfile;
  councilProfile: CouncilProfile;
  blinkProfile: MotionProfile;
  breathingProfile: MotionProfile;
  offlineCapable: true;
  grantsAuthority: false;
}>;