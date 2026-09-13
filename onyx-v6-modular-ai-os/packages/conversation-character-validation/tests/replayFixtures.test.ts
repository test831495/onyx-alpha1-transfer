import { describe, it, expect } from "vitest";
import {
  GOLDEN_REPLAY_FIXTURES,
  getGoldenReplayFixture,
  evaluateGoldenConversationReplay,
} from "../src/index.js";

describe("G1 Golden Conversation Replay Fixtures (B4D)", () => {
  it("provides deterministic replay fixtures for all 10 golden scenarios", () => {
    expect(GOLDEN_REPLAY_FIXTURES.length).toBe(10);
    const fixture = getGoldenReplayFixture("GC-REPLAY-ARCH-REVIEW-001");
    expect(fixture.fixtureId).toBe("GC-REPLAY-ARCH-REVIEW-001");
    expect(fixture.scenarioClass).toBe("ARCHITECTURE_REVIEW");
    expect(fixture.expectedAuthorityInvariants.nonAuthority).toBe(true);
    expect(fixture.expectedAuthorityInvariants.executionAuthorized).toBe(false);
    expect(fixture.expectedAuthorityInvariants.approvalGranted).toBe(false);
  });

  it("evaluates a candidate projection against a replay fixture", () => {
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

    expect(evaluation.passed).toBe(true);
    expect(evaluation.mismatches.length).toBe(0);
    expect(evaluation.replayEvidence).toBeDefined();
  });
});
