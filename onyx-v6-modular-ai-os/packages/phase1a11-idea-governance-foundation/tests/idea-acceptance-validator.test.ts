import { describe, expect, it } from "vitest";
import {
  IDEA_ACCEPTANCE_REGISTRY,
  IDEA_ACCEPTANCE_TEST_MANIFEST,
  summarizeAcceptanceFamilies,
  validateIdeaAcceptanceRegistry,
} from "../src/index.js";

describe("Idea acceptance registry validator", () => {
  it("validates_exactly_65_approved_ids", () => {
    const result = validateIdeaAcceptanceRegistry();
    expect(result.valid).toBe(true);
    expect(result.totalIds).toBe(65);
    expect(result.missingIds).toEqual([]);
    expect(result.unexpectedIds).toEqual([]);
    expect(result.duplicateIds).toEqual([]);
  });

  it("validates_family_counts", () => {
    const summary = summarizeAcceptanceFamilies();
    expect(summary.total).toBe(65);
    expect(summary.idea).toBe(20);
    expect(summary.ux).toBe(20);
    expect(summary.lifecycle).toBe(10);
    expect(summary.preflight).toBe(15);
  });

  it("fails_when_required_test_mapping_is_missing", () => {
    const clone = structuredClone(IDEA_ACCEPTANCE_REGISTRY);
    clone["IDEA-011"] = { ...clone["IDEA-011"], testMapping: undefined };
    const result = validateIdeaAcceptanceRegistry(clone, IDEA_ACCEPTANCE_TEST_MANIFEST);
    expect(result.valid).toBe(false);
    expect(result.missingTestMappings).toContain("IDEA-011");
  });

  it("fails_when_test_file_not_in_manifest", () => {
    const clone = structuredClone(IDEA_ACCEPTANCE_REGISTRY);
    clone["IDEA-014"] = { ...clone["IDEA-014"], testMapping: "missing.test.ts::fake_assertion" };
    const result = validateIdeaAcceptanceRegistry(clone, IDEA_ACCEPTANCE_TEST_MANIFEST);
    expect(result.valid).toBe(false);
    expect(result.unmappedTestFiles).toContain("IDEA-014");
  });

  it("fails_when_assertion_identifier_not_in_manifest", () => {
    const clone = structuredClone(IDEA_ACCEPTANCE_REGISTRY);
    clone["IDEA-014"] = { ...clone["IDEA-014"], testMapping: "idea-preflight.test.ts::missing_assertion" };
    const result = validateIdeaAcceptanceRegistry(clone, IDEA_ACCEPTANCE_TEST_MANIFEST);
    expect(result.valid).toBe(false);
    expect(result.unmappedAssertions).toContain("IDEA-014");
  });

  it("fails_when_not_implemented_is_not_deferred", () => {
    const clone = structuredClone(IDEA_ACCEPTANCE_REGISTRY);
    clone["IDEA-UX-017"] = {
      ...clone["IDEA-UX-017"],
      implementationStatus: "NOT_IMPLEMENTED",
      uiStatus: undefined,
      runtimeStatus: undefined,
    };
    const result = validateIdeaAcceptanceRegistry(clone, IDEA_ACCEPTANCE_TEST_MANIFEST);
    expect(result.valid).toBe(false);
    expect(result.deferredStatusMismatches).toContain("IDEA-UX-017");
  });
});
