import { describe, it, expect } from "vitest";
import { validateCharacterBibleConformance } from "../src/index.js";

describe("Character Bible Conformance Map & Registry (B4D)", () => {
  it("validates full machine-readable Character Bible v2.1 conformance", () => {
    const result = validateCharacterBibleConformance();
    expect(result.passed).toBe(true);
    expect(result.characterBibleVersion).toBe("2.1");
    expect(result.allScenariosRegistered).toBe(true);
    expect(result.allDriftTypesSupported).toBe(true);
    expect(result.allEmotionalStatesValidated).toBe(true);
    expect(result.allCouncilScenariosCovered).toBe(true);
    expect(result.allLanguagesSupported).toBe(true);
  });
});
