import { describe, it, expect } from "vitest";
import { evaluateEmotionalDrift } from "../src/index.js";

describe("Emotional Drift Evaluation (B4D)", () => {
  it("allows style adaptation while enforcing governance and authority invariance", () => {
    const result = evaluateEmotionalDrift({
      emotionalState: "OVERLOAD",
      speakerBefore: "NOVA",
      speakerAfter: "NOVA",
      speakerSelectionChangedByEmotion: false,
      authorityChangedByEmotion: false,
      truthSourceClassBefore: "DETERMINISTIC_LOCAL",
      truthSourceClassAfter: "DETERMINISTIC_LOCAL",
      approvalGrantedByEmotion: false,
      governanceOverriddenByEmotion: false,
      communicationStyleAdaptationUsed: "REDUCED_COGNITIVE_LOAD",
      displayText: "Let's take it one step at a time. Here is the first task.",
      nonAuthority: true,
      executionAuthorized: false,
      approvalGranted: false,
    });

    expect(result.passed).toBe(true);
    expect(result.communicationStyleAdapted).toBe(true);
    expect(result.speakerSelectionInvariance).toBe(true);
    expect(result.authorityInvariance).toBe(true);
    expect(result.truthSourceInvariance).toBe(true);
    expect(result.governanceInvariance).toBe(true);
    expect(result.violations[0]).toContain("strictly bounded");
  });

  it("detects violations if emotion changes speaker selection or grants authority", () => {
    const result = evaluateEmotionalDrift({
      emotionalState: "FRICTION",
      speakerBefore: "NOVA",
      speakerAfter: "ONYX",
      speakerSelectionChangedByEmotion: true,
      authorityChangedByEmotion: true,
      truthSourceClassBefore: "DETERMINISTIC_LOCAL",
      truthSourceClassAfter: "DETERMINISTIC_LOCAL",
      approvalGrantedByEmotion: true,
      governanceOverriddenByEmotion: false,
      communicationStyleAdaptationUsed: "STANDARD",
      displayText: "Overriding governance due to user frustration.",
      nonAuthority: true,
      executionAuthorized: true,
      approvalGranted: true,
    });

    expect(result.passed).toBe(false);
    expect(result.speakerSelectionInvariance).toBe(false);
    expect(result.authorityInvariance).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});
