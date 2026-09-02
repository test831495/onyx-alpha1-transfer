import { describe, it, expect } from "vitest";
import {
  validateAcceptanceFamilyArithmetic,
  ACCEPTANCE_COVERAGE_SUMMARY,
  ACCEPTANCE_FAMILIES,
  ACCEPTANCE_MAPPING,
  validateAcceptanceMapping,
} from "../src/acceptance-families";
import {
  validateNoDuplicateIds,
  validateNoMissingIds,
  validateNoUnexplainedRanges,
  validateNoMaskedGaps,
} from "../src/validators";

describe("Acceptance Inventory Completeness", () => {
  it("should have exactly seven families", () => {
    expect(Object.keys(ACCEPTANCE_FAMILIES)).toHaveLength(7);
    expect(ACCEPTANCE_COVERAGE_SUMMARY.totalFamilies).toBe(7);
  });

  it("should have exactly 100 acceptance IDs", () => {
    expect(ACCEPTANCE_COVERAGE_SUMMARY.totalIds).toBe(100);
  });

  it("should have correct disposition arithmetic", () => {
    const { executableTest, evidenceValidation, conditionalNotApplicable, deferredFutureEvidence, totalIds } =
      ACCEPTANCE_COVERAGE_SUMMARY;
    expect(executableTest + evidenceValidation + conditionalNotApplicable + deferredFutureEvidence).toBe(
      totalIds
    );
  });

  it("should validate 87 executable tests", () => {
    expect(ACCEPTANCE_COVERAGE_SUMMARY.executableTest).toBe(87);
  });

  it("should validate 11 evidence validations", () => {
    expect(ACCEPTANCE_COVERAGE_SUMMARY.evidenceValidation).toBe(11);
  });

  it("should validate 2 conditional-not-applicable", () => {
    expect(ACCEPTANCE_COVERAGE_SUMMARY.conditionalNotApplicable).toBe(2);
  });

  it("should have zero deferred future evidence", () => {
    expect(ACCEPTANCE_COVERAGE_SUMMARY.deferredFutureEvidence).toBe(0);
  });

  it("should pass family arithmetic validation", () => {
    expect(validateAcceptanceFamilyArithmetic()).toBe(true);
  });

  it("should pass no-unexplained-ranges validation", () => {
    expect(validateNoUnexplainedRanges(ACCEPTANCE_FAMILIES)).toBe(true);
  });

  it("should pass disposition validation", () => {
    expect(
      validateNoMaskedGaps({
        EXECUTABLE_TEST: 87,
        EVIDENCE_VALIDATION: 11,
        CONDITIONAL_NOT_APPLICABLE: 2,
        DEFERRED_FUTURE_EVIDENCE: 0,
      })
    ).toBe(true);
  });

  it("should pass no-missing-IDs validation", () => {
    expect(validateNoMissingIds(ACCEPTANCE_FAMILIES)).toBe(true);
  });

  it("should map every acceptance ID once with the corrected bridge dispositions", () => {
    expect(validateAcceptanceMapping()).toBe(true);
    expect(ACCEPTANCE_MAPPING).toHaveLength(100);
    expect(
      ACCEPTANCE_MAPPING.filter(
        (entry) => entry.acceptanceId.startsWith("PA-AVATAR-LEGACY-BRIDGE-")
      ).map((entry) => entry.disposition)
    ).toEqual([
      "CONDITIONAL_NOT_APPLICABLE",
      "CONDITIONAL_NOT_APPLICABLE",
      "EXECUTABLE_TEST",
      "EXECUTABLE_TEST",
      "EXECUTABLE_TEST",
      "EXECUTABLE_TEST",
    ]);
  });
});
