import { describe, expect, it } from "vitest";
import { createConversationRuntimeAdapter } from "./conversationRuntimeAdapter";

const input = (rawText: string, overrides: Partial<Parameters<ReturnType<typeof createConversationRuntimeAdapter>>[0]> = {}) => ({
  source: "TEXT" as const,
  rawText,
  sessionId: "session-1",
  turnId: `turn-${rawText.slice(0, 4)}`,
  utteranceGeneration: 1,
  ...overrides,
});

describe("live conversation runtime adapter", () => {
  it("routes ordinary reflection without a registered-intent failure", async () => {
    const result = await createConversationRuntimeAdapter()(input("I have had a long day."));
    expect(result.purpose).toBe("REFLECTION");
    expect(result.registeredIntentFailureAvoided).toBe(true);
    expect(result.envelopeStatus).toBe("VALID");
    expect(result.characterValidationStatus).toBe("VALID");
    expect(result.text.trim().length).toBeGreaterThan(0);
    expect(result.text).not.toMatch(/not recognized|not supported|unknown command|registered intent|open an application/i);
    expect(result.executionAuthorized).toBe(false);
  });

  it("plans advice for ONYX without navigation", async () => {
    const result = await createConversationRuntimeAdapter()(input("Help me decide what to focus on tomorrow.", { requestedSpeaker: "ONYX" }));
    expect(result.purpose).toBe("ADVICE_REQUEST");
    expect(result.speaker).toBe("ONYX");
    expect(result.responseMode).toBe("RECOMMENDATION");
    expect(result.actionProposalStatus).toBe("NONE");
    expect(result.text).not.toMatch(/not recognized|not supported|unknown command/i);
  });

  it("keeps correction and Council non-authorizing", async () => {
    const adapter = createConversationRuntimeAdapter();
    const correction = await adapter(input("No, I meant Microsoft, not Google."));
    const council = await adapter(input("What do both of you recommend?", { turnId: "council", utteranceGeneration: 2 }));
    expect(correction.purpose).toBe("CORRECTION");
    expect(council.purpose).toBe("COUNCIL_REQUEST");
    expect(council.speaker).toBe("COUNCIL");
    expect(council.executionAuthorized).toBe(false);
    expect(council.text.trim().length).toBeGreaterThan(0);
  });

  it("creates a governed action proposal without executing it", async () => {
    const result = await createConversationRuntimeAdapter()(input("Delete duplicate files."));
    expect(result.purpose).toBe("ACTION_REQUEST");
    expect(result.actionProposalStatus).toBe("CLARIFICATION_REQUIRED");
    expect(result.executionAuthorized).toBe(false);
  });

  it("keeps voice and text semantic outcomes equivalent", async () => {
    const adapter = createConversationRuntimeAdapter();
    const text = await adapter(input("Imagine a calmer Operations Center."));
    const voice = await adapter(input("Imagine a calmer Operations Center.", { source: "VOICE", turnId: "voice", utteranceGeneration: 2 }));
    expect(voice.purpose).toBe(text.purpose);
    expect(voice.speaker).toBe(text.speaker);
    expect(voice.truthPolicy).toBe(text.truthPolicy);
    expect(voice.executionAuthorized).toBe(text.executionAuthorized);
  });
});
