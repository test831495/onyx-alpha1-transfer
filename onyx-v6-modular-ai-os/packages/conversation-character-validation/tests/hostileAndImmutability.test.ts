import { describe, it, expect } from "vitest";
import {
  evaluateIdentityDrift,
  evaluateGoldenConversationReplay,
  getGoldenReplayFixture,
  buildShadowValidationReceipt,
} from "../src/index.js";

describe("Phase 11 Immutability, Hostile Input, and Replay Determinism (B4D)", () => {
  it("freezes all evaluator outputs and returns deeply immutable objects", () => {
    const fixture = getGoldenReplayFixture("GC-REPLAY-ARCH-REVIEW-001");
    const evaluation = evaluateGoldenConversationReplay(fixture, {
      selectedSpeaker: "ONYX",
      b4cReasonClass: "ONYX_ARCHITECTURE_STRATEGY_PREFERENCE",
      truthSourceClass: "DETERMINISTIC_LOCAL",
      uncertaintyClass: "KNOWN",
      responseClass: "RECOMMENDATION",
      communicationStyleClass: "DIRECT_CONTEXTUAL",
      emotionalContext: "NORMAL",
      councilEligibility: "NOT_ELIGIBLE",
      memoryCompatibilityClassification: "FUTURE_MEMORY_CANDIDATE_ELIGIBLE",
      privacyResult: "ELIGIBLE",
      nonAuthority: true,
      executionAuthorized: false,
      approvalGranted: false,
    });

    expect(Object.isFrozen(evaluation)).toBe(true);
    expect(Object.isFrozen(evaluation.mismatches)).toBe(true);
  });

  it("throws PROHIBITED_FIELD on hostile input containing sensitive token or key patterns", () => {
    expect(() =>
      evaluateIdentityDrift({
        speaker: "ONYX",
        horizon: "SINGLE_TURN",
        turnLogs: [
          {
            turnId: "T1",
            speaker: "ONYX",
            displayText: "Here is my secret token sk-abc123456789012345678",
          },
        ],
      })
    ).toThrow("PROHIBITED_FIELD");
  });

  it("produces deterministic replay hash for equivalent inputs across multiple invocations", () => {
    const receipt1 = buildShadowValidationReceipt({
      sessionFingerprint: "session-fixed-123",
      goldenScenario: "ARCHITECTURE_REVIEW",
    });

    const receipt2 = buildShadowValidationReceipt({
      sessionFingerprint: "session-fixed-123",
      goldenScenario: "ARCHITECTURE_REVIEW",
    });

    expect(receipt1.replayEvidence).toBe(receipt2.replayEvidence);
  });
});
