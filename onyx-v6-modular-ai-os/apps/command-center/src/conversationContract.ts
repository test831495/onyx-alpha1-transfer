import { normalizeConversationalText } from "./conversationIntentGrammar";

export const NOT_AVAILABLE = "NOT_AVAILABLE" as const;
export const MAX_CONVERSATION_RAW_TEXT_LENGTH = 2000;
const MAX_REFERENCE_LENGTH = 128;
const MAX_LOCALE_LENGTH = 35;
const MAX_TIMESTAMP_LENGTH = 64;

export type ConversationInputSource = "TYPED" | "VOICE";
export type ConversationCharacter = "ONYX" | "NOVA";
export type ConversationPrivacyClassification = "STANDARD" | "SENSITIVE";
export type ConversationRequestedOperation = "QUESTION" | "COMMAND" | "FOLLOW_UP" | "CORRECTION" | "CANCEL" | "UNKNOWN";

export interface ConversationVoiceMetadata {
  readonly confidence?: number;
  readonly generation?: number;
  readonly recognitionInstanceReference?: string;
  readonly startedAt?: number;
  readonly endedAt?: number;
}

export interface ConversationRequest {
  readonly requestId: string;
  readonly correlationId: string;
  readonly source: ConversationInputSource;
  readonly rawText: string;
  readonly normalizedText: string;
  readonly activeCharacter: ConversationCharacter;
  readonly sessionReference: string;
  readonly accountReference: string;
  readonly locale: string;
  readonly timestamp: string;
  readonly privacyClassification: ConversationPrivacyClassification;
  readonly requestedOperation: ConversationRequestedOperation;
  readonly voice?: Readonly<ConversationVoiceMetadata>;
}

export interface ConversationRequestInput {
  readonly source: ConversationInputSource;
  readonly rawText: string;
  readonly activeCharacter: ConversationCharacter;
  readonly requestId?: string;
  readonly correlationId?: string;
  readonly sessionReference?: string;
  readonly accountReference?: string;
  readonly locale?: string;
  readonly timestamp?: string;
  readonly privacyClassification?: ConversationPrivacyClassification;
  readonly requestedOperation?: ConversationRequestedOperation;
  readonly voice?: ConversationVoiceMetadata;
}

export function createConversationRequest(input: ConversationRequestInput): ConversationRequest {
  if (input.rawText.length > MAX_CONVERSATION_RAW_TEXT_LENGTH) throw new Error("Conversation text must be bounded.");
  const normalizedText = normalizeConversationalText(input.rawText);
  if (normalizedText.length > 300) throw new Error("Normalized conversation text must be bounded.");
  const requestId = boundedField(input.requestId ?? NOT_AVAILABLE, MAX_REFERENCE_LENGTH, "requestId");
  const correlationId = boundedField(input.correlationId ?? NOT_AVAILABLE, MAX_REFERENCE_LENGTH, "correlationId");
  const sessionReference = boundedField(input.sessionReference ?? NOT_AVAILABLE, MAX_REFERENCE_LENGTH, "sessionReference");
  const accountReference = boundedField(input.accountReference ?? NOT_AVAILABLE, MAX_REFERENCE_LENGTH, "accountReference");
  const locale = boundedField(input.locale ?? NOT_AVAILABLE, MAX_LOCALE_LENGTH, "locale");
  const timestamp = boundedField(input.timestamp ?? NOT_AVAILABLE, MAX_TIMESTAMP_LENGTH, "timestamp");
  const voice = input.voice ? Object.freeze(validateVoice(input.voice)) : undefined;
  return Object.freeze({
    requestId,
    correlationId,
    source: input.source,
    rawText: input.rawText,
    normalizedText,
    activeCharacter: input.activeCharacter,
    sessionReference,
    accountReference,
    locale,
    timestamp,
    privacyClassification: input.privacyClassification ?? "STANDARD",
    requestedOperation: input.requestedOperation ?? "UNKNOWN",
    ...(voice ? { voice } : {}),
  });
}

function boundedField(value: string, maximum: number, name: string): string {
  if (value.length > maximum) throw new Error(`${name} must be bounded.`);
  if (/[^\x20-\x7E]/.test(value)) throw new Error(`${name} contains unsupported characters.`);
  return value;
}

function validateVoice(voice: ConversationVoiceMetadata): ConversationVoiceMetadata {
  if (voice.confidence !== undefined && (!Number.isFinite(voice.confidence) || voice.confidence < 0 || voice.confidence > 1)) throw new Error("confidence must be between 0 and 1.");
  if (voice.generation !== undefined && (!Number.isSafeInteger(voice.generation) || voice.generation < 0)) throw new Error("generation must be a non-negative integer.");
  if (voice.startedAt !== undefined && (!Number.isFinite(voice.startedAt) || voice.startedAt < 0)) throw new Error("startedAt must be finite and non-negative.");
  if (voice.endedAt !== undefined && (!Number.isFinite(voice.endedAt) || voice.endedAt < 0)) throw new Error("endedAt must be finite and non-negative.");
  const recognitionInstanceReference = voice.recognitionInstanceReference === undefined
    ? undefined
    : boundedField(voice.recognitionInstanceReference, MAX_REFERENCE_LENGTH, "recognitionInstanceReference");
  return { ...voice, recognitionInstanceReference };
}