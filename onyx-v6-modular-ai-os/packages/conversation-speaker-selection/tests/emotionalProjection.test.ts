import { describe, expect, it } from "vitest";
import { buildEmotionalContextProjection, type EmotionalContextProjectionInput } from "../src/index";

const baseInput = (overrides: Partial<EmotionalContextProjectionInput> = {}): EmotionalContextProjectionInput => ({
  projectionVersion: "B4C-1",
  sessionFingerprint: "session-abc",
  emotionalEvidence: [],
  featureMode: "OFF",
  privacyResult: "ELIGIBLE",
  ...overrides,
});

describe("emotional projection", () => {
  it("maps confusion to confusion context", () => {
    const result = buildEmotionalContextProjection(baseInput({ emotionalEvidence: ["EXPLICIT_CONFUSION"] }));
    expect(result.context).toBe("CONFUSION");
    expect(result.sessionBound).toBe(true);
    expect(result.speakerSelectedByEmotion).toBe(false);
  });

  it("returns NORMAL for weak evidence", () => {
    const result = buildEmotionalContextProjection(baseInput({ emotionalEvidence: ["WEAK_SIGNAL"] }));
    expect(result.context).toBe("NORMAL");
  });

  it("stays session-bound and non-diagnostic", () => {
    const result = buildEmotionalContextProjection(baseInput({ emotionalEvidence: ["EXPLICIT_RECOVERY"] }));
    expect(result.crossSessionScoring).toBe(false);
    expect(result.psychologicalDiagnosis).toBe(false);
    expect(result.authorityChanged).toBe(false);
  });
});
