import { describe, expect, it } from "vitest";
import { FIXTURES } from "../src/fixtures.js";

describe("Idea assessment contracts", () => {
  it("version_binding", () => {
    const assessment = FIXTURES.assessment();
    expect(assessment.ideaVersion).toBe(FIXTURES.versionV1);
  });
});
