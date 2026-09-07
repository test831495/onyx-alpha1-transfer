import { describe, expect, it } from "vitest";
import { createConversationPolicy, DEFAULT_CONVERSATION_POLICY } from "./conversationPolicy";

describe("conversation policy", () => {
  it("provides the immutable Lane A1 defaults", () => {
    expect(DEFAULT_CONVERSATION_POLICY).toEqual({
      maxAcceptedTurns: 10,
      followUpSilenceTimeoutMs: 15000,
      foregroundSessionMaxMs: 300000,
      recognitionRestartLimit: 1,
    });
    expect(Object.isFrozen(DEFAULT_CONVERSATION_POLICY)).toBe(true);
  });

  it("rejects policy values outside bounded integer ranges", () => {
    expect(() => createConversationPolicy({ ...DEFAULT_CONVERSATION_POLICY, maxAcceptedTurns: 0 })).toThrow();
    expect(() => createConversationPolicy({ ...DEFAULT_CONVERSATION_POLICY, followUpSilenceTimeoutMs: 30001 })).toThrow();
    expect(() => createConversationPolicy({ ...DEFAULT_CONVERSATION_POLICY, foregroundSessionMaxMs: 59999 })).toThrow();
    expect(() => createConversationPolicy({ ...DEFAULT_CONVERSATION_POLICY, recognitionRestartLimit: 3 })).toThrow();
  });
});