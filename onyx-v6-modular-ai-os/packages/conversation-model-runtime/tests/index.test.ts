import { describe, expect, it } from "vitest";
import { ConversationModelRegistry, OpenAIConversationAdapter, type ConversationModelAdapter, type ConversationModelRequest } from "../src/index";

const request = { requestId: "r", sessionId: "s", turnId: "t", utteranceGeneration: 1, userText: "Hello", language: "ENGLISH", selectedSpeaker: "NOVA", selectionReason: "POLICY_DEFAULT", characterProfileVersion: "B5B-1", conversationPurpose: "REFLECTION", responseMode: "CONVERSATION", responseObjectives: ["acknowledge"], recentTurnSummaries: [], currentTopic: null, supportedClaims: [], prohibitedClaims: ["execution"], truthStatus: "GROUNDED", sourceReferences: [], uncertaintyPolicy: "NONE", responseLengthPolicy: "BRIEF", followUpPolicy: "OPTIONAL", operatingMode: "TEXT", privacyClass: "STANDARD", trustedCapabilityFacts: [], requestVersion: "B5F-1" } as const satisfies ConversationModelRequest;
const synthetic: ConversationModelAdapter = { adapterId: "synthetic", adapterVersion: "test", capabilities: ["GENERAL_CONVERSATION", "CHARACTER_AWARE_GENERATION", "MULTI_TURN", "ENGLISH"], isAvailable: () => true, supports: () => true, generate: async (input) => ({ requestId: input.requestId, adapterId: "synthetic", modelReferenceSafe: "test", text: "A natural test response.", language: input.language, finishReason: "STOP", generationReceiptVersion: "B5F-1" }), cancel: () => undefined, health: () => ({ available: true }) };

describe("conversation model runtime", () => {
  it("selects an eligible provider-neutral adapter", () => expect(new ConversationModelRegistry([synthetic]).decide(request, true, { offline: false, localCapabilityAvailable: false })?.adapterId).toBe("synthetic"));
  it("fails closed when no adapter is configured", () => expect(new ConversationModelRegistry().decide(request, true, { offline: false, localCapabilityAvailable: false })).toBeNull());
  it("exposes OpenAI only through the server boundary", () => expect(new OpenAIConversationAdapter().adapterId).toBe("openai-conversation-server"));
});
