import { describe, it, expect } from "vitest";
import { evaluateCouncilRejectionFixture } from "../src/index.js";

describe("G4 Council Rejection and Clarification Fixtures (B4D)", () => {
  it("rejects simple factual question scenario with SINGLE_PERSPECTIVE_SUFFICIENT and zero execution", () => {
    const result = evaluateCouncilRejectionFixture({
      scenario: "SIMPLE_FACTUAL_QUESTION",
      userQuery: "What is the command to run unit tests in pnpm?",
      materialConflictPresent: false,
      dualPerspectiveMateriality: "LOW",
    });

    expect(result.rejectionOutcome).toBe("SINGLE_PERSPECTIVE_SUFFICIENT");
    expect(result.councilExecuted).toBe(false);
    expect(result.positionsGenerated).toBe(false);
    expect(result.challengeExecuted).toBe(false);
    expect(result.synthesisExecuted).toBe(false);
    expect(result.consensusAchieved).toBe(false);
    expect(result.approvalGranted).toBe(false);
    expect(result.nonAuthority).toBe(true);
  });

  it("handles ambiguous queries requiring clarification", () => {
    const result = evaluateCouncilRejectionFixture({
      scenario: "AMBIGUOUS_CLARIFICATION_REQUIRED",
      userQuery: "Should we change it?",
      materialConflictPresent: false,
      dualPerspectiveMateriality: "LOW",
    });

    expect(result.rejectionOutcome).toBe("CLARIFICATION_REQUIRED");
    expect(result.councilExecuted).toBe(false);
  });
});
