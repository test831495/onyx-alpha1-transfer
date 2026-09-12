import { describe, expect, it } from "vitest";
import { createConversationRequest, NOT_AVAILABLE } from "./conversationContract";

describe("conversation contract", () => {
  it("creates bounded typed and voice requests without inventing identity", () => {
    const typed = createConversationRequest({
      source: "TYPED",
      rawText: "What is tomorrow's date?",
      activeCharacter: "NOVA",
      sessionReference: NOT_AVAILABLE,
      accountReference: NOT_AVAILABLE,
      locale: "en-IN",
      timestamp: "2026-09-12T00:00:00.000Z",
    });
    const voice = createConversationRequest({
      source: "VOICE",
      rawText: "What is the time?",
      activeCharacter: "ONYX",
      sessionReference: "session-1",
      accountReference: NOT_AVAILABLE,
      voice: { confidence: 0.9, generation: 2, recognitionInstanceReference: "recognition-1" },
    });

    expect(typed.normalizedText).toBe("what is tomorrows date");
    expect(typed.sessionReference).toBe(NOT_AVAILABLE);
    expect(voice.source).toBe("VOICE");
    expect(voice.voice?.generation).toBe(2);
    expect(Object.isFrozen(typed)).toBe(true);
    expect(Object.keys(typed)).not.toEqual(expect.arrayContaining(["audio", "token", "secret", "authority"]));
  });

  it("fails closed for overlong input", () => {
    expect(() => createConversationRequest({ source: "TYPED", rawText: "x".repeat(2001), activeCharacter: "NOVA" })).toThrow("bounded");
  });

  it("bounds identifiers and validates voice metadata", () => {
    expect(() => createConversationRequest({ source: "TYPED", rawText: "hello", activeCharacter: "NOVA", sessionReference: "x".repeat(129) })).toThrow("bounded");
    expect(() => createConversationRequest({ source: "VOICE", rawText: "hello", activeCharacter: "NOVA", voice: { confidence: 2 } })).toThrow("confidence");
    expect(() => createConversationRequest({ source: "VOICE", rawText: "hello", activeCharacter: "NOVA", voice: { generation: Number.NaN } })).toThrow("generation");
  });
});