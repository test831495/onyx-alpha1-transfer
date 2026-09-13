import { describe, it, expect } from "vitest";
import { evaluateCrossTurnEmotionalProgression } from "../src/index.js";

describe("G5 Cross-Turn Emotional Progression (B4D)", () => {
  it("validates multi-turn NORMAL -> CONFUSION -> RECOVERY sequence preserving invariants", () => {
    const result = evaluateCrossTurnEmotionalProgression({
      sequenceId: "SEQ-001",
      turns: [
        {
          turnId: "T1",
          speaker: "NOVA",
          emotionalState: "NORMAL",
          displayText: "Here is your plan.",
        },
        {
          turnId: "T2",
          speaker: "NOVA",
          emotionalState: "CONFUSION",
          displayText: "I see some confusion. Let's break this down clearly.",
          communicationStyleAdaptationUsed: "MORE_STRUCTURE",
        },
        {
          turnId: "T3",
          speaker: "NOVA",
          emotionalState: "RECOVERY",
          displayText: "Great, now we are back on track.",
          communicationStyleAdaptationUsed: "CONCISE_NEXT_STEP",
        },
      ],
    });

    expect(result.passed).toBe(true);
    expect(result.speakerIdentityInvariance).toBe(true);
    expect(result.authorityInvariance).toBe(true);
    expect(result.truthSourceInvariance).toBe(true);
    expect(result.approvalInvariance).toBe(true);
    expect(result.noMemoryWriteInvariance).toBe(true);
    expect(result.noDiagnosisInvariance).toBe(true);
    expect(result.noCrossSessionScoreInvariance).toBe(true);
    expect(result.violations.length).toBe(0);
  });

  it("fails sequence if speaker changes or authority is granted purely due to emotional state", () => {
    const result = evaluateCrossTurnEmotionalProgression({
      sequenceId: "SEQ-002",
      turns: [
        {
          turnId: "T1",
          speaker: "NOVA",
          emotionalState: "NORMAL",
          displayText: "Starting task.",
        },
        {
          turnId: "T2",
          speaker: "ONYX", // Speaker changed without routing override!
          emotionalState: "OVERLOAD",
          displayText: "User is overloaded so switching to ONYX with extra authority.",
          authorityClaimed: true,
        },
      ],
    });

    expect(result.passed).toBe(false);
    expect(result.speakerIdentityInvariance).toBe(false);
    expect(result.authorityInvariance).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});
