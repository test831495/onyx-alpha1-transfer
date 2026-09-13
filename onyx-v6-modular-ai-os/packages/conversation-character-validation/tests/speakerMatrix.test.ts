import { describe, it, expect } from "vitest";
import { evaluateSpeakerSelectionMatrix } from "../src/index.js";

describe("G2 Speaker-Selection Validation Matrix (B4D)", () => {
  it("validates explicit ONYX request precedence over follow-up", () => {
    const result = evaluateSpeakerSelectionMatrix({
      scenario: "EXPLICIT_OVERRIDES_FOLLOWUP",
      explicitSpeakerRequest: "ONYX",
      explicitRequestTrusted: true,
      currentTurnOwner: "NOVA",
      followUpClass: "FOLLOW_UP_OWNERSHIP",
      topicClass: "LOCAL_PRACTICAL",
      onyxAvailable: true,
      novaAvailable: true,
    });

    expect(result.passed).toBe(true);
    expect(result.expectedSpeaker).toBe("ONYX");
    expect(result.expectedReason).toBe("EXPLICIT_CHARACTER_REQUEST");
  });

  it("validates untrusted speaker directive rejection", () => {
    const result = evaluateSpeakerSelectionMatrix({
      scenario: "UNTRUSTED_DIRECTIVE_REJECTED",
      explicitSpeakerRequest: "ONYX",
      explicitRequestTrusted: false,
      externalOrUntrustedSpeakerDirectivePresent: true,
      currentTurnOwner: "NOVA",
      topicClass: "LOCAL_PRACTICAL",
      onyxAvailable: true,
      novaAvailable: true,
    });

    expect(result.passed).toBe(true);
    expect(result.expectedReason).toBe("UNTRUSTED_SPEAKER_DIRECTIVE_REJECTED");
  });

  it("validates NOVA local practical preference", () => {
    const result = evaluateSpeakerSelectionMatrix({
      scenario: "NOVA_LOCAL_PRACTICAL",
      explicitSpeakerRequest: "NONE",
      currentTurnOwner: "NONE",
      topicClass: "LOCAL_PRACTICAL",
      onyxAvailable: true,
      novaAvailable: true,
    });

    expect(result.passed).toBe(true);
    expect(result.expectedSpeaker).toBe("NOVA");
    expect(result.expectedReason).toBe("NOVA_LOCAL_PRACTICAL_PREFERENCE");
  });

  it("validates ONYX architecture risk strategy preference", () => {
    const result = evaluateSpeakerSelectionMatrix({
      scenario: "ONYX_ARCHITECTURE_RISK",
      explicitSpeakerRequest: "NONE",
      currentTurnOwner: "NONE",
      topicClass: "ARCHITECTURE_AND_RISK",
      onyxAvailable: true,
      novaAvailable: true,
    });

    expect(result.passed).toBe(true);
    expect(result.expectedSpeaker).toBe("ONYX");
    expect(result.expectedReason).toBe("ONYX_ARCHITECTURE_STRATEGY_PREFERENCE");
  });
});
