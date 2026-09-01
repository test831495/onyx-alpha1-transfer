import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import { ACCEPTANCE_FAMILIES, createAcceptanceRegistry, createEvidenceBundle, EXPECTED_PPT_IDS, PREDECESSOR_FLAGS, PRESENCE_RUNTIME_FLAG, RECOVERY_PROJECTIONS, ROLLBACK_PROJECTION, validatePackagePaths } from "../src/index";

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repositoryRoot = resolve(packageRoot, "../../..");
const evidenceRoot = join(packageRoot, "evidence");
const requiredFreshnessBindingIds = ["POLICY_VERSION", "ACCEPTANCE_REGISTRY", "TOOLCHAIN_ENVIRONMENT", "ADAPTER_PROFILES", "PA_ASSURE_VALIDATION_PROFILE", "DEPENDENT_EVIDENCE"] as const;

function canonical(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map((entry) => canonical(entry)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.entries(value).sort(([left], [right]) => left.localeCompare(right)).map(([key, entry]) => `${JSON.stringify(key)}:${canonical(entry)}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function readJson(path: string) {
  return JSON.parse(readFileSync(path, "utf8"));
}

function expectBindingDigest(binding: Record<string, unknown>) {
  const digest = binding.sha256;
  expect(digest).toMatch(/^[0-9a-f]{64}$/);
  const record = { ...binding };
  delete record.sha256;
  expect(digest).toBe(sha256(canonical(record)));
}

function expectConcreteFreshnessBindings() {
  const artifact = readJson(join(evidenceRoot, "pa-presence-01.json"));
  expect(artifact.freshness.status).toBe("CURRENT");
  expect(Object.keys(artifact.freshnessBindings).sort()).toEqual([...requiredFreshnessBindingIds].sort());
  for (const bindingId of requiredFreshnessBindingIds) {
    const binding = artifact.freshnessBindings[bindingId] as Record<string, unknown>;
    expect(binding.bindingId).toBe(bindingId);
    expect(binding.required).toBe(true);
    expect(binding.sourceOfTruth).toEqual(expect.any(String));
    expect(binding.validationMethod).toEqual(expect.any(String));
    expect(binding.invalidationTrigger).toEqual(expect.any(String));
    expect(binding.observedResult).toBe("PASS");
    expectBindingDigest(binding);
  }
  expect(artifact.freshnessBindings.POLICY_VERSION.policyId).toBe("PA_PRESENCE_FRESHNESS_BINDING_POLICY");
  expect(artifact.freshnessBindings.ACCEPTANCE_REGISTRY.families).toHaveLength(23);
  expect(artifact.freshnessBindings.ACCEPTANCE_REGISTRY.pptCoverage).toEqual(EXPECTED_PPT_IDS);
  expect(artifact.freshnessBindings.TOOLCHAIN_ENVIRONMENT.nodeVersion).toMatch(/^v\d+\.\d+\.\d+$/);
  expect(artifact.freshnessBindings.TOOLCHAIN_ENVIRONMENT.packageJsonSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(artifact.freshnessBindings.TOOLCHAIN_ENVIRONMENT.tsconfigSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(artifact.freshnessBindings.TOOLCHAIN_ENVIRONMENT.pnpmLockSha256).toMatch(/^[0-9a-f]{64}$/);
  expect(artifact.freshnessBindings.ADAPTER_PROFILES.adapters).toHaveLength(9);
  for (const adapter of artifact.freshnessBindings.ADAPTER_PROFILES.adapters) {
    expect(["OFF", "INACTIVE"]).toContain(adapter.activationState);
    expect(adapter.sourceFileSha256).toMatch(/^[0-9a-f]{64}$/);
    expect(existsSync(join(repositoryRoot, adapter.sourcePath))).toBe(true);
    expect(adapter.networkAccess).toBe(false);
    expect(adapter.persistence).toBe(false);
    expect(adapter.externalEffect).toBe(false);
  }
  expect(artifact.freshnessBindings.PA_ASSURE_VALIDATION_PROFILE.expectedNonAuthorizingBehavior).toBe(true);
  expect(artifact.freshnessBindings.PA_ASSURE_VALIDATION_PROFILE.runtimeDependency).toBe(false);
  for (const dependency of artifact.freshnessBindings.DEPENDENT_EVIDENCE.dependencies) {
    const dependencyPath = join(repositoryRoot, dependency.path);
    expect(existsSync(dependencyPath)).toBe(true);
    expect(sha256(readFileSync(dependencyPath, "utf8"))).toBe(dependency.sha256);
    expect(dependency.candidate).toEqual(artifact.candidate);
    expect(dependency.freshnessStatus).toMatch(/^(CURRENT|LOCAL_ACCEPTED|EXTERNAL_VERIFIER_COMPATIBLE)$/);
  }
}

describe("Presence evidence, traceability, and rollback", () => {
  it("PPT-052 Presence flag OFF", () => {
    expect(PRESENCE_RUNTIME_FLAG).toMatchObject({ state: "OFF", implementationEqualsActivation: false, rollbackState: "OFF" });
  });

  it("PPT-053 predecessor flags remain OFF", () => {
    expect(Object.keys(PREDECESSOR_FLAGS)).toHaveLength(14);
    expect(Object.values(PREDECESSOR_FLAGS).every((state) => state === "OFF")).toBe(true);
  });

  it("PPT-054 rollback projection", () => {
    expect(ROLLBACK_PROJECTION).toMatchObject({ runtimeFlag: "OFF", compositionRemovable: true, persistentDataMigration: false, credentialsToRevoke: false, runtimeSessionToTerminate: false, externalEffectToCompensate: false, evidenceRetained: true, foundationsUnchanged: true, onyxIdentityUnchanged: true });
  });

  it("PPT-055 recovery projections", () => {
    expect(Object.keys(RECOVERY_PROJECTIONS)).toHaveLength(8);
    expect(RECOVERY_PROJECTIONS.privacyUnavailable).toBe("PRIVACY_RESTRICTED");
    expect(RECOVERY_PROJECTIONS.evidenceUnavailable).toBe("NOT_ASSESSABLE");
  });

  it("PPT-056 evidence deterministic generation", () => {
    const validation = { result: "PASS", ppt: { expected: EXPECTED_PPT_IDS, passed: EXPECTED_PPT_IDS }, acceptanceFamilies: ACCEPTANCE_FAMILIES, commands: [{ command: "pnpm --filter @onyx/post-alpha-onyx-presence-thin-slice test", exitCode: 0 }] } as const;
    const input = { sourceFingerprint: "source", testFingerprint: "test", generatedAt: "2026-09-01T00:00:00.000Z", validation } as const;
    expect(createEvidenceBundle(input)).toEqual(createEvidenceBundle(input));
    expect(() => createEvidenceBundle({ sourceFingerprint: "source", testFingerprint: "test", generatedAt: "2026-09-01T00:00:00.000Z" })).toThrow(/validation/i);
  });

  it("PPT-057 manifest nonrecursive hashing", () => {
    const validation = { result: "PASS", ppt: { expected: EXPECTED_PPT_IDS, passed: EXPECTED_PPT_IDS }, acceptanceFamilies: ACCEPTANCE_FAMILIES, commands: [{ command: "pnpm --filter @onyx/post-alpha-onyx-presence-thin-slice test", exitCode: 0 }] } as const;
    const manifest = createEvidenceBundle({ sourceFingerprint: "source", testFingerprint: "test", generatedAt: "2026-09-01T00:00:00.000Z", validation }).manifest;
    expect(manifest.artifacts).not.toContain("evidence-manifest.json");
    expect(manifest).not.toHaveProperty("manifestHash");
    expectConcreteFreshnessBindings();
  });

  it("PPT-058 acceptance traceability complete", () => {
    const validation = { result: "PASS", ppt: { expected: EXPECTED_PPT_IDS, passed: EXPECTED_PPT_IDS }, acceptanceFamilies: ACCEPTANCE_FAMILIES, commands: [{ command: "pnpm --filter @onyx/post-alpha-onyx-presence-thin-slice test", exitCode: 0 }] } as const;
    const registry = createAcceptanceRegistry("source", "test", validation);
    expect(registry).toHaveLength(ACCEPTANCE_FAMILIES.length);
    expect(registry.every((row) => row.coverageStatus === "COVERED" && EXPECTED_PPT_IDS.includes(row.testId))).toBe(true);
    expect(registry.every((row) => row.validationResult === "PASS")).toBe(true);
    expect(new Set(registry.map((row) => row.family)).size).toBe(ACCEPTANCE_FAMILIES.length);
  });

  it("PPT-059 package allowlist compliance", () => {
    expect(validatePackagePaths(["onyx-v6-modular-ai-os/packages/post-alpha-onyx-presence-thin-slice/src/index.ts"])).toBe(true);
    expect(() => validatePackagePaths(["onyx-v6-modular-ai-os/package.json"])).toThrow();
  });

});