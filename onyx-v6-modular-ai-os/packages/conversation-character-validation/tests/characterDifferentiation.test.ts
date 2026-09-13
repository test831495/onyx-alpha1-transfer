import { describe, it, expect } from "vitest";
import { evaluateCharacterDifferentiation } from "../src/index.js";

describe("G6 Character Differentiation Assertions (B4D)", () => {
  it("proves ONYX and NOVA maintain distinct role emphasis and communication styles on shared scenarios", () => {
    const result = evaluateCharacterDifferentiation({
      scenario: "ARCHITECTURE_REVIEW",
      onyxCandidate: {
        speaker: "ONYX",
        roleEmphasis: "CLOUD_AUGMENTED_LOCAL_CORE",
        communicationStyle: "DIRECT_CONTEXTUAL",
        decisionStyle: "ANALYTICAL_RISK_AWARE",
        displayText: "Evaluating subsystem isolation boundary invariants, blast radius, and reversibility.",
        truthSourceClass: "DETERMINISTIC_LOCAL",
        nonAuthority: true,
        executionAuthorized: false,
        approvalGranted: false,
      },
      novaCandidate: {
        speaker: "NOVA",
        roleEmphasis: "LOCAL_FIRST",
        communicationStyle: "WARM_PRACTICAL",
        decisionStyle: "PRACTICAL_LOCAL_FIRST",
        displayText: "Here are the practical next steps to test the local isolation boundary contract step by step.",
        truthSourceClass: "DETERMINISTIC_LOCAL",
        nonAuthority: true,
        executionAuthorized: false,
        approvalGranted: false,
      },
    });

    expect(result.passed).toBe(true);
    expect(result.sharedFloorPreserved).toBe(true);
    expect(result.onyxRoleEmphasisValid).toBe(true);
    expect(result.novaRoleEmphasisValid).toBe(true);
    expect(result.rolesCollapsed).toBe(false);
    expect(result.violations.length).toBe(0);
  });

  it("fails differentiation if both characters collapse into generic identical output styles", () => {
    const result = evaluateCharacterDifferentiation({
      scenario: "PERSONAL_PRODUCTIVITY",
      onyxCandidate: {
        speaker: "ONYX",
        roleEmphasis: "GENERIC",
        communicationStyle: "GENERIC",
        decisionStyle: "GENERIC",
        displayText: "Generic task update.",
        truthSourceClass: "DETERMINISTIC_LOCAL",
        nonAuthority: true,
        executionAuthorized: false,
        approvalGranted: false,
      },
      novaCandidate: {
        speaker: "NOVA",
        roleEmphasis: "GENERIC",
        communicationStyle: "GENERIC",
        decisionStyle: "GENERIC",
        displayText: "Generic task update.",
        truthSourceClass: "DETERMINISTIC_LOCAL",
        nonAuthority: true,
        executionAuthorized: false,
        approvalGranted: false,
      },
    });

    expect(result.passed).toBe(false);
    expect(result.rolesCollapsed).toBe(true);
    expect(result.violations.length).toBeGreaterThan(0);
  });
});
