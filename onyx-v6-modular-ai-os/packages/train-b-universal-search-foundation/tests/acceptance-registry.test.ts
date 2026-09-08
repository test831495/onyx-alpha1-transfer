import { describe, expect, it } from "vitest";
import { ACCEPTANCE_REGISTRY, validateAcceptanceRegistry } from "../src/acceptance-registry";

describe("train-b universal search acceptance registry", () => {
  it("contains the exact 122 acceptance IDs and families", () => {
    const validation = validateAcceptanceRegistry();
    expect(validation.valid).toBe(true);
    expect(validation.count).toBe(122);
    expect(ACCEPTANCE_REGISTRY.length).toBe(122);
    expect(new Set(ACCEPTANCE_REGISTRY).size).toBe(122);
  });
});
