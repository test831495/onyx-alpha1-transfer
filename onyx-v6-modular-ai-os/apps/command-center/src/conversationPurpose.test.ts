import { describe, expect, it } from "vitest";
import { DialogueContextBuilder } from "./dialogueContext";
import { ConversationalPurposeResolver } from "./conversationPurpose";
import { classifyConversationRequest, classifyUnifiedConversationRequest } from "./conversationClassifierBoundary";
import { createConversationRequest } from "./conversationContract";

const resolver = new ConversationalPurposeResolver();
const request = (rawText: string) => createConversationRequest({ source: "TYPED", rawText, activeCharacter: "NOVA" });

describe("ConversationalPurposeResolver", () => {
  it.each([
    ["I have had a long day.", "REFLECTION"],
    ["Help me decide what to focus on tomorrow.", "ADVICE_REQUEST"],
    ["Imagine a calmer Operations Center.", "CREATIVE_COLLABORATION"],
    ["Open Calendar.", "NAVIGATION_REQUEST"],
    ["What do both of you recommend?", "COUNCIL_REQUEST"],
  ])("resolves %s as %s", (rawText, purpose) => {
    expect(resolver.resolve({ rawText }).purpose).toBe(purpose);
  });

  it.each([
    ["hello", "GENERAL_CONVERSATION", {}],
    ["What is the weather?", "INFORMATION_REQUEST", {}],
    ["I have had a long day.", "REFLECTION", {}],
    ["Help me decide what to focus on tomorrow.", "ADVICE_REQUEST", {}],
    ["Imagine a calmer Operations Center.", "CREATIVE_COLLABORATION", {}],
    ["Send the report.", "ACTION_REQUEST", {}],
    ["Open Calendar.", "NAVIGATION_REQUEST", {}],
    ["Yes", "CLARIFICATION_RESPONSE", { unresolvedClarification: true }],
    ["Tell me more", "FOLLOW_UP", { hasActiveTopic: true }],
    ["I meant Microsoft", "CORRECTION", {}],
    ["Wait", "INTERRUPTION", {}],
    ["What do both of you recommend?", "COUNCIL_REQUEST", {}],
    ["blorp zzz", "UNKNOWN", {}],
  ] as const)("directly resolves purpose %s", (rawText, purpose, context) => {
    expect(resolver.resolve({ rawText, ...context }).purpose).toBe(purpose);
  });

  it("does not let generic I am or I just override other purposes", () => {
    expect(resolver.resolve({ rawText: "I am opening Calendar" }).purpose).toBe("NAVIGATION_REQUEST");
    expect(resolver.resolve({ rawText: "I just sent the report" }).purpose).toBe("ACTION_REQUEST");
    expect(resolver.resolve({ rawText: "I am asking what happened" }).purpose).toBe("INFORMATION_REQUEST");
    expect(resolver.resolve({ rawText: "I am tired" }).purpose).toBe("UNKNOWN");
  });

  it.each(["and then what", "what next", "tell me more", "can you explain that"]) (
    "requires active context for bounded follow-up: %s",
    (rawText) => {
      expect(resolver.resolve({ rawText }).purpose).toBe("UNKNOWN");
      expect(resolver.resolve({ rawText, hasActiveTopic: true }).purpose).toBe("FOLLOW_UP");
    },
  );

  it("resolves why as a follow-up only with an active topic", () => {
    expect(resolver.resolve({ rawText: "Why?" }).purpose).toBe("UNKNOWN");
    expect(resolver.resolve({ rawText: "Why?", hasActiveTopic: true })).toEqual({
      purpose: "FOLLOW_UP",
      clarificationRequired: false,
      activeTopicUsed: true,
    });
  });

  it("extracts the corrected entity without restarting dialogue", () => {
    for (const rawText of ["I meant Microsoft", "Actually, Microsoft", "No, Microsoft, not Google"]) {
      expect(resolver.resolve({ rawText }).purpose).toBe("CORRECTION");
    }
    expect(resolver.resolve({ rawText: "No, Microsoft, not Google" }).correctedEntity).toBe("Microsoft");
  });

  it("uses UNKNOWN for empty and semantically insufficient input", () => {
    expect(resolver.resolve({ rawText: "   " }).purpose).toBe("UNKNOWN");
    expect(resolver.resolve({ rawText: "Why?" }).clarificationRequired).toBe(true);
  });

  it("preserves ordinary dialogue without a registered-intent failure", () => {
    const result = classifyConversationRequest(request("I have had a long day."));
    expect(result.kind).toBe("GENERAL_CONVERSATION");
    expect(result.purpose).toBe("REFLECTION");
    expect(result.sideEffect).toBe("GENERAL_CONVERSATION");
  });

  it("recognizes language preference and ordinary conversational requests without a policy-template fallback", () => {
    expect(resolver.resolve({ rawText: "can you speak Hindi" }).purpose).toBe("LANGUAGE_PREFERENCE");
    expect(resolver.resolve({ rawText: "can you speak in Hindi with me" }).purpose).toBe("LANGUAGE_PREFERENCE");
    expect(resolver.resolve({ rawText: "Hindi mein baat karo" }).purpose).toBe("LANGUAGE_PREFERENCE");
    expect(resolver.resolve({ rawText: "talk to me in Hinglish" }).purpose).toBe("LANGUAGE_PREFERENCE");
    expect(resolver.resolve({ rawText: "switch back to English" }).purpose).toBe("LANGUAGE_PREFERENCE");
    expect(resolver.resolve({ rawText: "tell me a joke" }).purpose).toBe("CREATIVE_COLLABORATION");
    expect(resolver.resolve({ rawText: "can you tell me a story" }).purpose).toBe("CREATIVE_COLLABORATION");
    expect(resolver.resolve({ rawText: "how is your day going" }).purpose).toBe("GENERAL_CONVERSATION");
    expect(resolver.resolve({ rawText: "what can you do for me" }).purpose).toBe("GENERAL_CONVERSATION");
    expect(resolver.resolve({ rawText: "tell me what is in my Workspace" }).purpose).toBe("OPERATIONAL_QUERY");
    expect(resolver.resolve({ rawText: "hello there" }).clarificationRequired).toBe(false);
  });

  it("preserves deterministic navigation outcomes", () => {
    const result = classifyConversationRequest(request("Open Calendar."));
    expect(result.kind).toBe("NAVIGATION");
    expect(result.purpose).toBe("NAVIGATION_REQUEST");
    expect(result.sideEffect).toBe("NAVIGATION");
  });

  it("keeps council requests non-authorizing", () => {
    const result = classifyUnifiedConversationRequest(request("What do both of you recommend?"));
    expect(result.purpose).toBe("COUNCIL_REQUEST");
    expect(result.executionAuthorized).toBe(false);
    expect(result.approvalGranted).toBe(false);
    expect(result.sideEffectPerformed).toBe(false);
  });
});

describe("DialogueContextBuilder", () => {
  it("creates a bounded, versioned context without secrets or raw unrelated memory", () => {
    const context = new DialogueContextBuilder().build({
      recentTurnSummaries: ["one", "two", "three", "four", "five", "six"],
      currentTopic: "Track B isolation",
      unresolvedClarification: "Which account?",
      activeUserObjectives: ["preserve isolation", "bearer token should disappear", "third objective", "extra"],
      previousSpeaker: "NOVA",
      suppliedTruthReferences: ["truth-1", "api-key-secret"],
      availableCapabilityIdentifiers: ["calendar.open"],
      operatingMode: "TEXT",
      privacyClass: "SENSITIVE",
    });

    expect(context.recentTurnSummaries).toHaveLength(5);
    expect(context.activeUserObjectives).toEqual(["preserve isolation", "third objective"]);
    expect(context.suppliedTruthReferences).toEqual(["truth-1"]);
    expect(context.contextVersion).toBe("b5a-v1");
    expect(JSON.stringify(context)).not.toMatch(/token|secret|key/i);
    expect(Object.isFrozen(context)).toBe(true);
    expect(Object.isFrozen(context.recentTurnSummaries)).toBe(true);
  });

  it("preserves council and none speakers and fails closed on invalid runtime values", () => {
    const builder = new DialogueContextBuilder();
    expect(builder.build({ previousSpeaker: "COUNCIL" }).previousSpeaker).toBe("COUNCIL");
    expect(builder.build({ previousSpeaker: "NONE" }).previousSpeaker).toBe("NONE");
    const invalid = builder.build({
      previousSpeaker: "ADMIN" as never,
      operatingMode: "AUDIO" as never,
      privacyClass: "PUBLIC" as never,
    });
    expect(invalid.previousSpeaker).toBe("UNKNOWN");
    expect(invalid.operatingMode).toBe("UNKNOWN");
    expect(invalid.privacyClass).toBe("SENSITIVE");
  });

  it("carries context version into unified classification without authorizing it", () => {
    const context = new DialogueContextBuilder().build({ currentTopic: "Track B isolation" });
    const result = classifyUnifiedConversationRequest(request("Why?"), { dialogueContext: context });
    expect(result.purpose).toBe("FOLLOW_UP");
    expect(result.contextVersion).toBe("b5a-v1");
    expect(result.executionAuthorized).toBe(false);
  });
});