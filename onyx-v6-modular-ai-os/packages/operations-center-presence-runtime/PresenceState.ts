export const PRESENCE_STATES = Object.freeze([
  "IDLE",
  "LISTENING",
  "UNDERSTANDING",
  "THINKING",
  "SPEAKING",
  "APPROVAL_REQUIRED",
  "PRIVACY_RESTRICTED",
  "RECOVERING",
] as const);

export type PresenceState = (typeof PRESENCE_STATES)[number];

export const PRESENCE_SPEAKERS = Object.freeze([
  "NONE",
  "ONYX",
  "NOVA",
  "COUNCIL",
] as const);

export type PresenceSpeaker = (typeof PRESENCE_SPEAKERS)[number];

export type PresenceInput = Readonly<{
  speaker: PresenceSpeaker;
  state: PresenceState;
}>;