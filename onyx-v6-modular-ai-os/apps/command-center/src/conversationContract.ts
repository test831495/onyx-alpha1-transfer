import { normalizeConversationalText } from "./conversationIntentGrammar";

export const NOT_AVAILABLE = "NOT_AVAILABLE" as const;
export const MAX_CONVERSATION_RAW_TEXT_LENGTH = 2000;

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
  const voice = input.voice ? Object.freeze({ ...input.voice }) : undefined;
  return Object.freeze({
    requestId: input.requestId ?? NOT_AVAILABLE,
    correlationId: input.correlationId ?? NOT_AVAILABLE,
    source: input.source,
    rawText: input.rawText,
    normalizedText,
    activeCharacter: input.activeCharacter,
    sessionReference: input.sessionReference ?? NOT_AVAILABLE,
    accountReference: input.accountReference ?? NOT_AVAILABLE,
    locale: input.locale ?? NOT_AVAILABLE,
    timestamp: input.timestamp ?? NOT_AVAILABLE,
    privacyClassification: input.privacyClassification ?? "STANDARD",
    requestedOperation: input.requestedOperation ?? "UNKNOWN",
    ...(voice ? { voice } : {}),
  });
}