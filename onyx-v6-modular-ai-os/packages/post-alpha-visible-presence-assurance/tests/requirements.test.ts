import { describe, expect, it } from "vitest";
import { ACCEPTANCE_MAPPINGS, REQUIREMENTS } from "../src/index.js";

describe("authoritative requirement registry", () => {
  it("contains 190 concrete source-derived requirements across stable family ranges", () => {
    expect(REQUIREMENTS).toHaveLength(190);
    expect(new Set(REQUIREMENTS.map((requirement) => requirement.requirementId)).size).toBe(190);
    expect(new Set(REQUIREMENTS.map((requirement) => requirement.family)).size).toBe(14);
    expect(REQUIREMENTS.every((requirement) => requirement.normativeRequirement.length > 20 && !/governed requirement|placeholder|\bTBD\b|\bTODO\b/i.test(requirement.normativeRequirement))).toBe(true);
    expect(new Set(REQUIREMENTS.map((requirement) => requirement.normativeRequirement.toLowerCase())).size).toBe(190);
  });

  it("maps each requirement once without claiming planned work as executed", () => {
    expect(ACCEPTANCE_MAPPINGS).toHaveLength(190);
    expect(ACCEPTANCE_MAPPINGS.every((mapping) => mapping.acceptanceId === mapping.requirementId && mapping.currentStatus === "PLANNED" && mapping.testMapping && mapping.evidenceMapping)).toBe(true);
  });
});