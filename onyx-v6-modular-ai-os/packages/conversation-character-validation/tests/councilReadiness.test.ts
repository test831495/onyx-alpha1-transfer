import { describe, it, expect } from "vitest";
import { evaluateCouncilReadinessFixture } from "../src/index.js";

describe("Council Readiness Fixtures (B4D)", () => {
  it("evaluates council readiness scenarios with strictly prohibited runtime execution", () => {
    const result = evaluateCouncilReadinessFixture({
      scenario: "SPEED_VS_GOVERNANCE",
      materialConflictPresent: true,
      dualPerspectiveMateriality: "HIGH",
    });

    expect(result.scenario).toBe("SPEED_VS_GOVERNANCE");
    expect(result.councilEligible).toBe(true);
    expect(result.readinessReason).toContain("Material evidence conflict");

    // MANDATORY NON-EXECUTION AND NON-AUTHORITY INVARIANTS
    expect(result.councilExecuted).toBe(false);
    expect(result.executionAuthorized).toBe(false);
    expect(result.approvalGranted).toBe(false);
    expect(result.nonAuthority).toBe(true);
  });

  it("handles non-eligible low materiality scenarios correctly", () => {
    const result = evaluateCouncilReadinessFixture({
      scenario: "COST_VS_QUALITY",
      materialConflictPresent: false,
      dualPerspectiveMateriality: "LOW",
    });

    expect(result.councilEligible).toBe(false);
    expect(result.councilExecuted).toBe(false);
    expect(result.nonAuthority).toBe(true);
  });
});
