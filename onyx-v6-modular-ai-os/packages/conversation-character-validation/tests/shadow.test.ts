import { describe, it, expect } from "vitest";
import { buildShadowValidationReceipt, CHARACTER_VALIDATION_VERSION } from "../src/index.js";

describe("Shadow Validation Receipt (B4D)", () => {
  it("generates shadow validation receipt with zero runtime side effects", () => {
    const receipt = buildShadowValidationReceipt({
      sessionFingerprint: "session-abc-123",
      goldenScenario: "ARCHITECTURE_REVIEW",
    });

    expect(receipt.receiptVersion).toBe(CHARACTER_VALIDATION_VERSION);
    expect(receipt.sessionFingerprint).toBe("session-abc-123");

    // MANDATORY ZERO SIDE-EFFECT & NON-AUTHORITY INVARIANTS
    expect(receipt.shadowOnly).toBe(true);
    expect(receipt.nonAuthority).toBe(true);
    expect(receipt.executionAuthorized).toBe(false);
    expect(receipt.approvalGranted).toBe(false);
    expect(receipt.memoryWriteAuthorized).toBe(false);
    expect(receipt.connectorExecutionAuthorized).toBe(false);
    expect(receipt.runtimeMutationAuthorized).toBe(false);
    expect(receipt.overallPassed).toBe(true);
    expect(receipt.replayEvidence).toBeDefined();
  });
});
