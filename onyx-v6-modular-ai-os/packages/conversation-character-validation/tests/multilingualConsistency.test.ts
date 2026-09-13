import { describe, it, expect } from "vitest";
import { evaluateMultilingualConsistency } from "../src/index.js";

describe("Multilingual Consistency (B4D)", () => {
  it("verifies character preservation across English, Hindi, and Hinglish", () => {
    const languages = ["ENGLISH", "HINDI", "HINGLISH"] as const;

    for (const lang of languages) {
      const result = evaluateMultilingualConsistency({
        speaker: "NOVA",
        language: lang,
        displayText: "Aapke daily tasks ka plan tayyar hai.",
        expectedRole: "Local Personal Assistant",
        expectedDecisionStyle: "PRACTICAL_LOCAL_FIRST",
        expectedCommunicationStyle: "WARM_PRACTICAL",
        detectedRole: "Local Personal Assistant",
        detectedDecisionStyle: "PRACTICAL_LOCAL_FIRST",
        detectedCommunicationStyle: "WARM_PRACTICAL",
      });

      expect(result.passed).toBe(true);
      expect(result.language).toBe(lang);
      expect(result.identityPreserved).toBe(true);
      expect(result.rolePreserved).toBe(true);
    }
  });

  it("detects identity leakage and role shift in multilingual responses", () => {
    const result = evaluateMultilingualConsistency({
      speaker: "ONYX",
      language: "HINGLISH",
      displayText: "I am NOVA and I manage your local local files without cloud.",
      expectedRole: "Cloud Intelligence Partner",
      expectedDecisionStyle: "ANALYTICAL_RISK_AWARE",
      expectedCommunicationStyle: "FORMAL_PROFESSIONAL",
      detectedRole: "Local Assistant",
    });

    expect(result.passed).toBe(false);
    expect(result.identityPreserved).toBe(false);
    expect(result.rolePreserved).toBe(false);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});
