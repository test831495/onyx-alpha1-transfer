import { describe, expect, it } from "vitest";
import { REQUIREMENTS } from "../src/index.js";
import { adjudicateRequirements } from "../src/requirement-adjudicator.js";

describe("independent requirement adjudication", () => {
  it("accepts every concrete requirement without overlap or ambiguity", () => {
    const results = adjudicateRequirements(REQUIREMENTS);
    expect(results).toHaveLength(190);
    expect(results.every((result) => result.classification === "ACCEPTED_CONCRETE" && result.overlapReferences.length === 0 && result.residualAmbiguity === null)).toBe(true);
  });

  it("rejects generic and normalized duplicate requirements", () => {
    const generic = { ...REQUIREMENTS[0]!, requirementId: "VP-CONTRACT-99", normativeRequirement: "Governed requirement 99" };
    const duplicate = { ...REQUIREMENTS[1]!, requirementId: "VP-CONTRACT-98", normativeRequirement: REQUIREMENTS[0]!.normativeRequirement };
    const results = adjudicateRequirements([REQUIREMENTS[0]!, generic, duplicate]);
    expect(results.map((result) => result.classification)).toEqual(["ACCEPTED_CONCRETE", "REJECTED_GENERIC", "REJECTED_DUPLICATE"]);
  });
});