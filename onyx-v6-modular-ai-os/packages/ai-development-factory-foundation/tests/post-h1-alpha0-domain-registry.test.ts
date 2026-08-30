import { describe, expect, it } from "vitest";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  ALPHA0_DOMAIN_ACCEPTANCE_REGISTRY,
  ALPHA0_DOMAIN_EXECUTION_REGISTRY,
  ALPHA0_DOMAIN_RECORD_IDS,
  validateAlpha0DomainAcceptanceRegistry,
  validateAlpha0DomainExecutionRegistry,
} from "../src/post-h1/alpha0-domain-execution-registry";
import {
  ALPHA0_TEST_REGISTRY,
  validateAlpha0TestRegistry,
} from "../src/post-h1/alpha0-test-registry";
import { validateAlpha0Record } from "../src/post-h1/alpha0-validation-contracts";
import { selectAlpha0Tests } from "../src/post-h1/alpha0-selection-and-dependency-planner";

const candidate = Object.freeze({
  repository: "test831495/onyx-alpha1-transfer",
  branch: "feature/post-h1-alpha0-domain-execution-registry-completeness",
  baseSha: "5526e745ee942798da31bdd0b59d78971c6b7466",
  headSha: "5526e745ee942798da31bdd0b59d78971c6b7466",
  changedPaths: [],
  profiles: ["ALPHA_0_FULL_READINESS"],
});

describe("Post-H1 Alpha 0 domain execution registry", () => {
  it("adds a closed, separately identifiable domain family without changing foundation records", () => {
    expect(ALPHA0_TEST_REGISTRY).toHaveLength(19);
    expect(ALPHA0_DOMAIN_EXECUTION_REGISTRY.length).toBeGreaterThan(0);
    expect(ALPHA0_DOMAIN_EXECUTION_REGISTRY.every((record) => record.family === "ALPHA0-DOMAIN")).toBe(true);
    expect(new Set([...ALPHA0_TEST_REGISTRY, ...ALPHA0_DOMAIN_EXECUTION_REGISTRY].map((record) => record.id)).size)
      .toBe(ALPHA0_TEST_REGISTRY.length + ALPHA0_DOMAIN_EXECUTION_REGISTRY.length);
  });

  it("requires exact test mappings or a truthful non-executing external requirement", () => {
    const validation = validateAlpha0DomainExecutionRegistry(ALPHA0_DOMAIN_EXECUTION_REGISTRY);
    expect(validation.valid).toBe(true);
    expect(validation.missingMappings).toEqual([]);
    expect(ALPHA0_DOMAIN_EXECUTION_REGISTRY.every((record) =>
      record.executionClass !== "LOCAL_EXISTING_TEST" || record.testMappings.length > 0
    )).toBe(true);
  });

  it("keeps domain acceptance traceability separate and one-to-one with domain records", () => {
    expect(ALPHA0_DOMAIN_ACCEPTANCE_REGISTRY).toHaveLength(ALPHA0_DOMAIN_EXECUTION_REGISTRY.length);
    expect(validateAlpha0DomainAcceptanceRegistry(ALPHA0_DOMAIN_ACCEPTANCE_REGISTRY).valid).toBe(true);
    expect(ALPHA0_DOMAIN_ACCEPTANCE_REGISTRY.every((entry) =>
      ALPHA0_DOMAIN_RECORD_IDS.includes(entry.recordId)
    )).toBe(true);
  });

  it("maps every local domain record to an existing exact title and source symbol", () => {
    const workspaceRoot = resolve(import.meta.dirname, "../../..");
    for (const record of ALPHA0_DOMAIN_EXECUTION_REGISTRY.filter((entry) => entry.executionClass === "LOCAL_EXISTING_TEST")) {
      for (const mapping of record.testMappings) {
        const testPath = resolve(workspaceRoot, mapping.testFile);
        expect(existsSync(testPath), `${record.id} test file`).toBe(true);
        const contents = readFileSync(testPath, "utf8");
        expect(contents, `${record.id} suite title`).toContain(`describe("${mapping.suiteTitle}"`);
        expect(contents, `${record.id} test title`).toContain(mapping.testTitle);
        expect(contents, `${record.id} source symbol`).toContain(mapping.sourceSymbol);
      }
    }
  });

  it("keeps the combined registry valid and selects all domain records for full readiness", () => {
    const combined = Object.freeze([...ALPHA0_TEST_REGISTRY, ...ALPHA0_DOMAIN_EXECUTION_REGISTRY]);
    expect(validateAlpha0TestRegistry(ALPHA0_TEST_REGISTRY).valid).toBe(true);
    expect(validateAlpha0DomainExecutionRegistry(ALPHA0_DOMAIN_EXECUTION_REGISTRY).valid).toBe(true);

    const selection = selectAlpha0Tests({
      candidate,
      registry: combined,
      profiles: ["ALPHA_0_FULL_READINESS"],
      blockers: [],
      evidence: [],
    });

    expect(ALPHA0_DOMAIN_RECORD_IDS.every((id) => selection.selectedIds.includes(id))).toBe(true);
    expect(selection.requiredPhysicalDeviceIds).toContain("ALPHA0-DOMAIN-DEVICE-PHYSICAL");
    expect(selection.requiredRestoreIds).toContain("ALPHA0-DOMAIN-RECOVERY-REAL-RESTORE");
    expect(selection.requiredOwnerDecisionIds).toContain("ALPHA0-DOMAIN-INDEPENDENT-SECURITY");
  });

  it("accepts every canonical ID and rejects empty or non-canonical ID segments", () => {
    const base = ALPHA0_TEST_REGISTRY[0]!;
    for (const record of [...ALPHA0_TEST_REGISTRY, ...ALPHA0_DOMAIN_EXECUTION_REGISTRY]) {
      expect(validateAlpha0Record({ ...base, id: record.id }).valid, record.id).toBe(true);
    }
    for (const id of ["ALPHA0-DOMAIN-FOO-BAR-", "ALPHA0-DOMAIN-", "-ALPHA0-DOMAIN-FOO", "ALPHA0--DOMAIN-FOO", "ALPHA0-DOMAIN--FOO", "ALPHA0-DOMAIN-FOO--BAR", "alpha0-DOMAIN-FOO", "ALPHA0-domain-FOO", "ALPHA0-DOMAIN- foo", "ALPHA0-DOMAIN-FOO BAR", "ALPHA0-DOMAIN-FOO_BAR", "ALPHA0-DOMAIN-FOO.", ""]) {
      expect(validateAlpha0Record({ ...base, id }).valid, id).toBe(false);
    }
  });

  it("rejects malformed domain-specific fields and cross-field contradictions", () => {
    const mutate = (change: Partial<(typeof ALPHA0_DOMAIN_EXECUTION_REGISTRY)[number]>) =>
      ALPHA0_DOMAIN_EXECUTION_REGISTRY.map((record, index) => index === 0 ? { ...record, ...change } : record);
    for (const change of [
      { displayName: "" },
      { domainRequirementId: "" },
      { executionClass: "UNKNOWN" as never },
      { testMappings: Object.freeze([{} as never]) },
      { requiresToolAuthorization: "yes" as never },
      { executionClass: "LOCAL_EXISTING_TEST" as const, testMappings: Object.freeze([]) },
      { executionClass: "EXTERNAL_AUTHORIZATION_REQUIRED" as const, testMappings: Object.freeze([ALPHA0_DOMAIN_EXECUTION_REGISTRY[0]!.testMappings[0]!]) },
      { requiresPhysicalDevice: true, executionClass: "LOCAL_EXISTING_TEST" as const },
    ]) {
      expect(validateAlpha0DomainExecutionRegistry(mutate(change)).valid, JSON.stringify(change)).toBe(false);
    }
  });
});