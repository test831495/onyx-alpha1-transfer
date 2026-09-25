export type DialogueOperatingMode = "TEXT" | "VOICE" | "UNKNOWN";
export type DialogueSpeaker = "USER" | "ONYX" | "NOVA" | "COUNCIL" | "NONE" | "UNKNOWN";

export interface DialogueContextInput {
  readonly recentTurnSummaries?: readonly string[];
  readonly currentTopic?: string;
  readonly unresolvedClarification?: string;
  readonly activeUserObjectives?: readonly string[];
  readonly previousSpeaker?: DialogueSpeaker;
  readonly suppliedTruthReferences?: readonly string[];
  readonly availableCapabilityIdentifiers?: readonly string[];
  readonly operatingMode?: DialogueOperatingMode;
  readonly privacyClass?: "STANDARD" | "SENSITIVE";
}

export interface DialogueContext {
  readonly recentTurnSummaries: readonly string[];
  readonly currentTopic: string | null;
  readonly unresolvedClarification: string | null;
  readonly activeUserObjectives: readonly string[];
  readonly previousSpeaker: DialogueSpeaker;
  readonly suppliedTruthReferences: readonly string[];
  readonly availableCapabilityIdentifiers: readonly string[];
  readonly operatingMode: DialogueOperatingMode;
  readonly privacyClass: "STANDARD" | "SENSITIVE";
  readonly contextVersion: "b5a-v1";
}

const MAX_SUMMARIES = 5;
const MAX_OBJECTIVES = 3;
const MAX_REFERENCES = 8;
const MAX_CAPABILITIES = 32;
const MAX_FIELD_LENGTH = 160;
// Defence-in-depth only: callers must supply already projected context, never arbitrary raw memory.
const SECRET_PATTERN = /(?:bearer|token|secret|password|credential|private[_ -]?key|api[_ -]?key)/i;
const SPEAKERS = new Set<DialogueSpeaker>(["USER", "ONYX", "NOVA", "COUNCIL", "NONE", "UNKNOWN"]);
const OPERATING_MODES = new Set<DialogueOperatingMode>(["TEXT", "VOICE", "UNKNOWN"]);
const PRIVACY_CLASSES = new Set(["STANDARD", "SENSITIVE"] as const);

export class DialogueContextBuilder {
  build(input: DialogueContextInput = {}): DialogueContext {
    return Object.freeze({
      recentTurnSummaries: freezeList(input.recentTurnSummaries, MAX_SUMMARIES),
      currentTopic: safeField(input.currentTopic),
      unresolvedClarification: safeField(input.unresolvedClarification),
      activeUserObjectives: freezeList(input.activeUserObjectives, MAX_OBJECTIVES),
      previousSpeaker: runtimeSpeaker(input.previousSpeaker),
      suppliedTruthReferences: freezeList(input.suppliedTruthReferences, MAX_REFERENCES),
      availableCapabilityIdentifiers: freezeList(input.availableCapabilityIdentifiers, MAX_CAPABILITIES),
      operatingMode: runtimeOperatingMode(input.operatingMode),
      privacyClass: runtimePrivacyClass(input.privacyClass),
      contextVersion: "b5a-v1",
    });
  }
}

function runtimeSpeaker(value: unknown): DialogueSpeaker {
  return typeof value === "string" && SPEAKERS.has(value as DialogueSpeaker) ? value as DialogueSpeaker : "UNKNOWN";
}

function runtimeOperatingMode(value: unknown): DialogueOperatingMode {
  return typeof value === "string" && OPERATING_MODES.has(value as DialogueOperatingMode) ? value as DialogueOperatingMode : "UNKNOWN";
}

function runtimePrivacyClass(value: unknown): "STANDARD" | "SENSITIVE" {
  return typeof value === "string" && PRIVACY_CLASSES.has(value as "STANDARD" | "SENSITIVE") ? value as "STANDARD" | "SENSITIVE" : "SENSITIVE";
}

function safeField(value: string | undefined): string | null {
  if (!value || value.length > MAX_FIELD_LENGTH || SECRET_PATTERN.test(value)) return null;
  return value;
}

function freezeList(values: readonly string[] | undefined, maximum: number): readonly string[] {
  return Object.freeze((values ?? []).slice(0, maximum).filter((value) => value.length <= MAX_FIELD_LENGTH && !SECRET_PATTERN.test(value)));
}