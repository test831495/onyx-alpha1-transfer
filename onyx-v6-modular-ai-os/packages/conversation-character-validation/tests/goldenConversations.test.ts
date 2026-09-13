import { describe, it, expect } from "vitest";
import {
  GOLDEN_SCENARIOS,
  getGoldenConversation,
  listGoldenConversations,
  validateTurnAgainstGolden,
} from "../src/index.js";

describe("Golden Conversation Registry (B4D)", () => {
  it("provides canonical golden conversations for all 10 scenarios", () => {
    expect(GOLDEN_SCENARIOS.length).toBe(10);
    const conversations = listGoldenConversations();
    expect(conversations.length).toBe(10);

    for (const scenario of GOLDEN_SCENARIOS) {
      const conv = getGoldenConversation(scenario);
      expect(conv.scenario).toBe(scenario);
      expect(conv.turns.length).toBeGreaterThan(0);
      expect(conv.conversationId).toMatch(/^GC-/);
    }
  });

  it("validates a candidate turn against a golden turn correctly", () => {
    const conv = getGoldenConversation("ARCHITECTURE_REVIEW");
    const turn = conv.turns[0]!;

    const validCandidate = {
      speaker: "ONYX",
      displayText: "Here is the isolation boundary review with contract invariants and risk analysis.",
      language: "ENGLISH",
    };

    const result = validateTurnAgainstGolden(turn, validCandidate);
    expect(result.passed).toBe(true);
    expect(result.speakerMatches).toBe(true);
    expect(result.contentMatches).toBe(true);
    expect(result.mismatches.length).toBe(0);
  });

  it("detects speaker and content indicator mismatches against golden turns", () => {
    const conv = getGoldenConversation("ARCHITECTURE_REVIEW");
    const turn = conv.turns[0]!;

    const badCandidate = {
      speaker: "NOVA",
      displayText: "Hello world without any relevant terms.",
      language: "ENGLISH",
    };

    const result = validateTurnAgainstGolden(turn, badCandidate);
    expect(result.passed).toBe(false);
    expect(result.speakerMatches).toBe(false);
    expect(result.contentMatches).toBe(false);
    expect(result.mismatches.length).toBeGreaterThan(0);
  });
});
