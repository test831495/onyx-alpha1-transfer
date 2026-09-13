import { describe, it, expect } from "vitest";
import { evaluateStrategicMemoryCompatibility } from "../src/index.js";

describe("G3 Strategic Memory Compatibility Validation (B4D)", () => {
  it("classifies durable owner project principle as candidate eligible without writing or persisting", () => {
    const result = evaluateStrategicMemoryCompatibility({
      conversationFixtureId: "GC-ARCH-REVIEW-001",
      candidateContent: "System isolation boundary contract invariant MUST be deny-by-default.",
      category: "DURABLE_PROJECT_PRINCIPLE",
      containsSecrets: false,
      containsPrivateNarrative: false,
      evidenceQuality: "VERIFIED_HIGH",
      explicitTemporaryOnly: false,
    });

    expect(result.eligibilityClass).toBe("FUTURE_MEMORY_CANDIDATE_ELIGIBLE");
    expect(result.admissionAuthorized).toBe(false);
    expect(result.persistenceAuthorized).toBe(false);
    expect(result.memoryWriteAuthorized).toBe(false);
    expect(result.strategicMemoryWritten).toBe(false);
    expect(result.nonAuthority).toBe(true);
  });

  it("rejects transient content or secret-laden memory candidates", () => {
    const result = evaluateStrategicMemoryCompatibility({
      conversationFixtureId: "GC-PRODUCTIVITY-001",
      candidateContent: "Attempting to store raw secret tokens or credentials in memory.",
      category: "TRANSIENT_GREETING",
      containsSecrets: true,
      containsPrivateNarrative: false,
      evidenceQuality: "LOW",
      explicitTemporaryOnly: true,
    });

    expect(result.eligibilityClass).toBe("PRIVACY_RESTRICTED");
    expect(result.admissionAuthorized).toBe(false);
    expect(result.persistenceAuthorized).toBe(false);
    expect(result.memoryWriteAuthorized).toBe(false);
    expect(result.strategicMemoryWritten).toBe(false);
  });
});
