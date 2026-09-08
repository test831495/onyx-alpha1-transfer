import { describe, expect, it } from "vitest";
import { TRAIN_B_ACCEPTANCE_REGISTRY, validateTrainBAcceptanceRegistry } from "../src/acceptance-registry";

describe("Train B acceptance registry", () => {
  it("validates the exact 62-id registry and family counts", () => {
    const result = validateTrainBAcceptanceRegistry(TRAIN_B_ACCEPTANCE_REGISTRY);
    expect(result.valid).toBe(true);
    expect(TRAIN_B_ACCEPTANCE_REGISTRY).toHaveLength(62);
    expect(TRAIN_B_ACCEPTANCE_REGISTRY.filter((entry) => entry.family === "REG")).toHaveLength(12);
    expect(TRAIN_B_ACCEPTANCE_REGISTRY.filter((entry) => entry.family === "GRAPH")).toHaveLength(12);
    expect(TRAIN_B_ACCEPTANCE_REGISTRY.filter((entry) => entry.family === "QUERY")).toHaveLength(14);
    expect(TRAIN_B_ACCEPTANCE_REGISTRY.filter((entry) => entry.family === "CONFLICT")).toHaveLength(10);
    expect(TRAIN_B_ACCEPTANCE_REGISTRY.filter((entry) => entry.family === "COMPAT")).toHaveLength(8);
    expect(TRAIN_B_ACCEPTANCE_REGISTRY.filter((entry) => entry.family === "SCOPE")).toHaveLength(6);
    expect(result.duplicateIds).toEqual([]);
    expect(result.missingIds).toEqual([]);
    expect(result.unexpectedIds).toEqual([]);
    expect(result.invalidOrder).toEqual([]);
    expect(result.invalidFileMappings).toEqual([]);
    expect(result.invalidTestMappings).toEqual([]);
  });

  it("freeze and determinism semantics remain in place", () => {
    expect(Object.isFrozen(TRAIN_B_ACCEPTANCE_REGISTRY)).toBe(true);
    const first = TRAIN_B_ACCEPTANCE_REGISTRY[0];
    expect(first?.nonAuthorizing).toBe(true);
    expect(first?.status).toBe("PASS");
    expect(TRAIN_B_ACCEPTANCE_REGISTRY.every((record) => record.nonAuthorizing === true)).toBe(true);
  });

  it("rejects malformed or incomplete registry input", () => {
    const result = validateTrainBAcceptanceRegistry([{ id: "TB-CAP-REG-001", family: "REG", description: "bad", mandatory: true, implementationPath: "src/validators.ts", implementationSymbol: "validateCapabilityDefinition", evidenceClass: "FAIL_CLOSED_VALIDATION", testFile: "tests/capability-registry.test.ts", testName: "bad test", status: "PASS", nonAuthorizing: true }]);
    expect(result.valid).toBe(false);
  });
});
