export const MODEL_CAPABILITIES = Object.freeze([
  "GENERAL_CONVERSATION", "CHARACTER_AWARE_GENERATION", "MULTI_TURN", "ENGLISH", "HINDI", "HINGLISH", "LOCAL_EXECUTION", "CLOUD_EXECUTION", "STREAMING_OPTIONAL",
] as const);
export type ModelCapability = (typeof MODEL_CAPABILITIES)[number];
export type ConversationModelRequest = Readonly<{
  requestId: string; sessionId: string; turnId: string; utteranceGeneration: number;
  userText: string;
  language: "ENGLISH" | "HINDI" | "HINGLISH"; selectedSpeaker: "ONYX" | "NOVA";
  selectionReason: string;
  characterProfileVersion: string; conversationPurpose: string; responseMode: string;
  responseObjectives: readonly string[]; recentTurnSummaries: readonly string[]; currentTopic: string | null;
  supportedClaims: readonly string[]; prohibitedClaims: readonly string[]; truthStatus: string;
  sourceReferences: readonly string[]; uncertaintyPolicy: string; responseLengthPolicy: "BRIEF" | "STANDARD";
  followUpPolicy: string; operatingMode: string; privacyClass: "STANDARD" | "SENSITIVE";
  trustedCapabilityFacts: readonly string[]; requestVersion: "B5F-1";
}>;
export type GenerationMode = "MODEL_GENERATED" | "DETERMINISTIC_FALLBACK" | "SAFE_LIMITATION";
export type ConversationModelResult = Readonly<{ requestId: string; adapterId: string; modelReferenceSafe: string; text: string; spokenText?: string; language: ConversationModelRequest["language"]; finishReason: "STOP" | "LENGTH"; generationReceiptVersion: "B5F-1"; generationMode?: GenerationMode; selectedSpeaker?: ConversationModelRequest["selectedSpeaker"]; selectionReason?: string; providerRequestSucceeded?: boolean; fallbackReason?: string }>;
export interface ConversationModelAdapter {
  readonly adapterId: string; readonly adapterVersion: string; readonly capabilities: readonly ModelCapability[];
  isAvailable(context: Readonly<{ offline: boolean; localCapabilityAvailable: boolean }>): boolean;
  supports(request: ConversationModelRequest): boolean;
  generate(request: ConversationModelRequest, abortSignal: AbortSignal): Promise<ConversationModelResult>;
  cancel(requestId: string): void;
  health(): Readonly<{ available: boolean; reason?: string }>;
}
export class ConversationModelRegistry {
  private readonly adapters: readonly ConversationModelAdapter[];
  constructor(adapters: readonly ConversationModelAdapter[] = []) { this.adapters = Object.freeze([...adapters]); }
  decide(request: ConversationModelRequest, enabled: boolean, context: { offline: boolean; localCapabilityAvailable: boolean }): ConversationModelAdapter | null {
    if (!enabled) return null;
    return this.adapters.find((adapter) => adapter.isAvailable(context) && adapter.supports(request)) ?? null;
  }
}
export class OpenAIConversationAdapter implements ConversationModelAdapter {
  readonly adapterId = "openai-conversation-server";
  readonly adapterVersion = "B5F-OPENAI-1";
  readonly capabilities = Object.freeze(["GENERAL_CONVERSATION", "CHARACTER_AWARE_GENERATION", "MULTI_TURN", "ENGLISH", "HINDI", "HINGLISH", "CLOUD_EXECUTION"] as ModelCapability[]);
  isAvailable(): boolean { return typeof fetch === "function"; }
  supports(request: ConversationModelRequest): boolean { return request.requestVersion === "B5F-1"; }
  async generate(request: ConversationModelRequest, abortSignal: AbortSignal): Promise<ConversationModelResult> {
    const response = await fetch("/.netlify/functions/conversation-model", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(request), signal: abortSignal });
    if (!response.ok) throw new Error("MODEL_PROVIDER_UNAVAILABLE");
    const result = await response.json() as ConversationModelResult;
    if (result.requestId !== request.requestId || !result.text || result.text.length > 1200) throw new Error("MODEL_MALFORMED_RESULT");
    return Object.freeze(result);
  }
  cancel(): void { return; }
  health(): Readonly<{ available: boolean }> { return { available: true }; }
}
