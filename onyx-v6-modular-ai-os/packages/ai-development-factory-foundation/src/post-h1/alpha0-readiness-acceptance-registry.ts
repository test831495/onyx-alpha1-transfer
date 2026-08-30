import { ALPHA0_BOUNDS } from "./alpha0-validation-contracts";

export type Alpha0AcceptanceFamily = "ALPHA0-REGISTRY" | "ALPHA0-PROFILE" | "ALPHA0-SELECT" | "ALPHA0-EVIDENCE" | "ALPHA0-SAFE" | "ALPHA0-READINESS";

export type Alpha0AcceptanceDefinition = Readonly<{
  id: string;
  family: Alpha0AcceptanceFamily;
  invariant: string;
  rationale: string;
  lane: string;
  riskTier: string;
  profiles: readonly string[];
  predecessorDependencies: readonly string[];
  implementationWave: "ALPHA0-A" | "ALPHA0-B" | "ALPHA0-C" | "ALPHA0-D";
  testTitles: readonly string[];
  blocking: true;
  evidenceRequirement: string;
  testFiles: readonly string[];
}>;

const definition = (
  id: string,
  family: Alpha0AcceptanceFamily,
  invariant: string,
  lane: string,
  riskTier: string,
  profiles: readonly string[],
  predecessorDependencies: readonly string[],
  implementationWave: Alpha0AcceptanceDefinition["implementationWave"],
  testTitles: string | readonly string[],
  evidenceRequirement: string,
  testFiles: string | readonly string[]
): Alpha0AcceptanceDefinition => Object.freeze({
  id,
  family,
  invariant,
  rationale: invariant,
  lane,
  riskTier,
  profiles: Object.freeze([...profiles]),
  predecessorDependencies: Object.freeze([...predecessorDependencies]),
  implementationWave,
  testTitles: Object.freeze(typeof testTitles === "string" ? [testTitles] : [...testTitles]),
  blocking: true,
  evidenceRequirement,
  testFiles: Object.freeze(typeof testFiles === "string" ? [testFiles] : [...testFiles]),
});

export const ALPHA0_ACCEPTANCE_REGISTRY = Object.freeze([
  definition("ALPHA0-REGISTRY-001", "ALPHA0-REGISTRY", "Alpha 0 registry records are closed, bounded, immutable, and canonical.", "IDENTITY_AND_SESSION", "R4_CRITICAL", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], [], "ALPHA0-A", ["registry-valid-case"], "Mandatory local registry evidence is required.", ["tests/post-h1-alpha0-validation-foundation.test.ts"]),
  definition("ALPHA0-REGISTRY-002", "ALPHA0-REGISTRY", "Registry validation rejects duplicate IDs, hostile prototypes, and unsafe accessors.", "IDENTITY_AND_SESSION", "R4_CRITICAL", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], ["ALPHA0-REGISTRY-001"], "ALPHA0-A", ["registry-hostile-input"], "Mandatory hostile-input evidence is required.", ["tests/post-h1-alpha0-validation-foundation.test.ts"]),
  definition("ALPHA0-REGISTRY-003", "ALPHA0-REGISTRY", "Critical tests remain present in all elevated profiles and cannot be omitted.", "GOVERNANCE_AND_APPROVAL", "R3_HIGH", ["ALPHA_0_HIGH_RISK", "ALPHA_0_FULL_READINESS"], ["ALPHA0-REGISTRY-001"], "ALPHA0-A", ["critical-profile-selection"], "Mandatory profile evidence is required.", ["tests/post-h1-alpha0-validation-foundation.test.ts"]),
  definition("ALPHA0-REGISTRY-004", "ALPHA0-REGISTRY", "Isolation and memory controls stay local and non-authorizing.", "MEMORY_AND_ISOLATION", "R4_CRITICAL", ["ALPHA_0_SMOKE", "ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], ["ALPHA0-REGISTRY-001"], "ALPHA0-A", ["memory-and-isolation"], "Mandatory isolation evidence is required.", ["tests/post-h1-alpha0-validation-foundation.test.ts"]),
  definition("ALPHA0-REGISTRY-005", "ALPHA0-REGISTRY", "Approval and governance outputs remain projections-only.", "GOVERNANCE_AND_APPROVAL", "R3_HIGH", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], ["ALPHA0-REGISTRY-001"], "ALPHA0-A", ["governance-safety"], "Mandatory governance evidence is required.", ["tests/post-h1-alpha0-validation-foundation.test.ts"]),
  definition("ALPHA0-REGISTRY-006", "ALPHA0-REGISTRY", "Trustworthy intelligence remains provider-neutral and supplied-fact driven.", "TRUSTWORTHY_INTELLIGENCE", "R3_HIGH", ["ALPHA_0_STANDARD", "ALPHA_0_ADVERSARIAL", "ALPHA_0_FULL_READINESS"], ["ALPHA0-REGISTRY-001"], "ALPHA0-A", ["provider-neutral"], "Mandatory model-neutral evidence is required.", ["tests/post-h1-alpha0-validation-foundation.test.ts"]),
  definition("ALPHA0-REGISTRY-007", "ALPHA0-REGISTRY", "Recovery continuity is represented as deferred requirements, not executed restore.", "RECOVERY_AND_CONTINUITY", "R4_CRITICAL", ["ALPHA_0_RECOVERY_EXERCISE", "ALPHA_0_FULL_READINESS"], ["ALPHA0-REGISTRY-001"], "ALPHA0-A", ["deferred-restore"], "Mandatory restore-defer evidence is required.", ["tests/post-h1-alpha0-validation-foundation.test.ts"]),
  definition("ALPHA0-PROFILE-001", "ALPHA0-PROFILE", "Smoke, standard, high-risk, adversarial, cross-platform, recovery, and full-readiness profiles are fixed and deterministic.", "GOVERNANCE_AND_APPROVAL", "R2_MODERATE", ["ALPHA_0_SMOKE", "ALPHA_0_STANDARD", "ALPHA_0_HIGH_RISK", "ALPHA_0_ADVERSARIAL", "ALPHA_0_CROSS_PLATFORM", "ALPHA_0_RECOVERY_EXERCISE", "ALPHA_0_FULL_READINESS"], ["ALPHA0-REGISTRY-001"], "ALPHA0-A", ["profile-vocabulary"], "Mandatory profile evidence is required.", ["tests/post-h1-alpha0-validation-foundation.test.ts"]),
  definition("ALPHA0-PROFILE-002", "ALPHA0-PROFILE", "High-risk and full-readiness profiles include all applicable R3 and R4 tests.", "GOVERNANCE_AND_APPROVAL", "R3_HIGH", ["ALPHA_0_HIGH_RISK", "ALPHA_0_FULL_READINESS"], ["ALPHA0-PROFILE-001"], "ALPHA0-B", ["high-risk-selection"], "Mandatory high-risk evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-PROFILE-003", "ALPHA0-PROFILE", "Adversarial profile selects hostile, mutation, replay, concurrency, injection, and negative-side-effect checks.", "TRUSTWORTHY_INTELLIGENCE", "R4_CRITICAL", ["ALPHA_0_ADVERSARIAL", "ALPHA_0_FULL_READINESS"], ["ALPHA0-PROFILE-001"], "ALPHA0-B", ["adversarial-selection"], "Mandatory adversarial evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-PROFILE-004", "ALPHA0-PROFILE", "Cross-platform profile selects platform and device equivalence requirements without executing them.", "CROSS_PLATFORM_AND_DEVICE_TRUST", "R3_HIGH", ["ALPHA_0_CROSS_PLATFORM", "ALPHA_0_FULL_READINESS"], ["ALPHA0-PROFILE-001"], "ALPHA0-B", ["platform-selection"], "Mandatory platform evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-PROFILE-005", "ALPHA0-PROFILE", "Recovery-exercise profile projects restore requirements but never executes restore.", "RECOVERY_AND_CONTINUITY", "R4_CRITICAL", ["ALPHA_0_RECOVERY_EXERCISE", "ALPHA_0_FULL_READINESS"], ["ALPHA0-PROFILE-001"], "ALPHA0-B", ["restore-profile"], "Mandatory restore-profile evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-SELECT-001", "ALPHA0-SELECT", "The selector is deterministic, stable, and fail-closed on missing registry facts.", "IDENTITY_AND_SESSION", "R3_HIGH", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], ["ALPHA0-PROFILE-001"], "ALPHA0-B", ["selection-determinism"], "Mandatory selection evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-SELECT-002", "ALPHA0-SELECT", "The dependency planner rejects cycles and missing dependencies and preserves stable stages.", "PERFORMANCE_STABILITY_COST_AND_ACCESSIBILITY", "R2_MODERATE", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], ["ALPHA0-SELECT-001"], "ALPHA0-B", ["dependency-plan"], "Mandatory dependency evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-SELECT-003", "ALPHA0-SELECT", "Selected tests are ordered canonically and projected with reasons and exclusions.", "IDENTITY_AND_SESSION", "R2_MODERATE", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], ["ALPHA0-SELECT-001"], "ALPHA0-B", ["selection-reasons"], "Mandatory selection-reason evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-SELECT-004", "ALPHA0-SELECT", "Cost cannot deselect security, approval, isolation, or recovery requirements.", "GOVERNANCE_AND_APPROVAL", "R4_CRITICAL", ["ALPHA_0_FULL_READINESS"], ["ALPHA0-SELECT-001"], "ALPHA0-B", ["cost-barrier"], "Mandatory cost-barrier evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-EVIDENCE-001", "ALPHA0-EVIDENCE", "Evidence manifests remain candidate-bound and hashable without inventing facts.", "IDENTITY_AND_SESSION", "R4_CRITICAL", ["ALPHA_0_FULL_READINESS"], ["ALPHA0-SELECT-002"], "ALPHA0-C", ["evidence-manifest"], "Mandatory evidence-manifest evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-EVIDENCE-002", "ALPHA0-EVIDENCE", "Freshness and invalidation logic expire stale evidence and reject contradictions.", "MEMORY_AND_ISOLATION", "R3_HIGH", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], ["ALPHA0-EVIDENCE-001"], "ALPHA0-C", ["freshness-and-invalidation"], "Mandatory freshness evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-EVIDENCE-003", "ALPHA0-EVIDENCE", "Cross-candidate evidence cannot satisfy another candidate target or registry fingerprint.", "IDENTITY_AND_SESSION", "R4_CRITICAL", ["ALPHA_0_FULL_READINESS"], ["ALPHA0-EVIDENCE-001"], "ALPHA0-C", ["cross-candidate-evidence"], "Mandatory cross-candidate evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-EVIDENCE-004", "ALPHA0-EVIDENCE", "Duplicate evidence entries and missing evidence score zero and produce invalidation.", "GOVERNANCE_AND_APPROVAL", "R3_HIGH", ["ALPHA_0_FULL_READINESS"], ["ALPHA0-EVIDENCE-001"], "ALPHA0-C", ["duplicate-evidence"], "Mandatory duplicate-evidence evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-SAFE-001", "ALPHA0-SAFE", "Public Alpha 0 outputs declare authority NON_AUTHORIZING and no execution authority.", "GOVERNANCE_AND_APPROVAL", "R4_CRITICAL", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], ["ALPHA0-EVIDENCE-002"], "ALPHA0-C", ["non-authorizing-output"], "Mandatory non-authorizing output evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-SAFE-002", "ALPHA0-SAFE", "Hostile input, proxy, accessor, over-bounds, and uninspectable behavior fail closed.", "TRUSTWORTHY_INTELLIGENCE", "R4_CRITICAL", ["ALPHA_0_ADVERSARIAL", "ALPHA_0_FULL_READINESS"], ["ALPHA0-SAFE-001"], "ALPHA0-D", ["hostile-input"], "Mandatory hostile-input evidence is required.", ["tests/post-h1-alpha0-validation-foundation.test.ts"]),
  definition("ALPHA0-SAFE-003", "ALPHA0-SAFE", "No runtime I/O, random timing, filesystem access, or external mutation is used by this foundation.", "MEMORY_AND_ISOLATION", "R4_CRITICAL", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], ["ALPHA0-SAFE-001"], "ALPHA0-D", ["no-io"], "Mandatory no-I/O evidence is required.", ["tests/post-h1-alpha0-validation-foundation.test.ts"]),
  definition("ALPHA0-SAFE-004", "ALPHA0-SAFE", "Recursive immutability and deterministic output on equivalent supplied input are preserved.", "PERFORMANCE_STABILITY_COST_AND_ACCESSIBILITY", "R2_MODERATE", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], ["ALPHA0-SAFE-001"], "ALPHA0-D", ["immutability"], "Mandatory determinism evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-READINESS-001", "ALPHA0-READINESS", "Readiness projections are planning-only and never claim ALPHA_0_READINESS_VERIFIED or ALPHA_0_DECLARED.", "IDENTITY_AND_SESSION", "R3_HIGH", ["ALPHA_0_FULL_READINESS"], ["ALPHA0-SAFE-004"], "ALPHA0-C", ["readiness-foundation"], "Mandatory readiness-foundation evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-READINESS-002", "ALPHA0-READINESS", "Permanent blockers override scores, pass counts, and favorable aggregate outcomes.", "GOVERNANCE_AND_APPROVAL", "R4_CRITICAL", ["ALPHA_0_FULL_READINESS"], ["ALPHA0-READINESS-001"], "ALPHA0-C", ["persistent-blockers"], "Mandatory blocker evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-READINESS-003", "ALPHA0-READINESS", "Required physical-device and real-restore items are projected as deferred requirements, not executed steps.", "CROSS_PLATFORM_AND_DEVICE_TRUST", "R4_CRITICAL", ["ALPHA_0_CROSS_PLATFORM", "ALPHA_0_RECOVERY_EXERCISE", "ALPHA_0_FULL_READINESS"], ["ALPHA0-READINESS-001"], "ALPHA0-C", ["deferred-execution"], "Mandatory deferred-execution evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
  definition("ALPHA0-READINESS-004", "ALPHA0-READINESS", "Final readiness output is a non-authorizing local planning result and must remain ineligible for declaration.", "RECOVERY_AND_CONTINUITY", "R4_CRITICAL", ["ALPHA_0_FULL_READINESS"], ["ALPHA0-READINESS-001"], "ALPHA0-D", ["readiness-eligible"], "Mandatory local acceptance evidence is required.", ["tests/post-h1-alpha0-selection-evidence.test.ts"]),
] as const);

export const ALPHA0_ACCEPTANCE_IDS = Object.freeze(ALPHA0_ACCEPTANCE_REGISTRY.map((entry) => entry.id));

export const validateAlpha0AcceptanceRegistry = (
  registry: readonly Alpha0AcceptanceDefinition[]
): Readonly<{ valid: boolean; missingIds: readonly string[] }> => {
  const familyCounts = [7, 5, 4, 4, 4, 4];
  const expectedFamilies: readonly Alpha0AcceptanceFamily[] = [
    "ALPHA0-REGISTRY",
    "ALPHA0-PROFILE",
    "ALPHA0-SELECT",
    "ALPHA0-EVIDENCE",
    "ALPHA0-SAFE",
    "ALPHA0-READINESS",
  ];

  const actualCounts = expectedFamilies.map((family) =>
    registry.filter((entry) => entry.family === family).length
  );
  const ids = registry.map((entry) => entry.id);
  const valid =
    registry.length === 28 &&
    new Set(ids).size === 28 &&
    actualCounts.every((count, index) => count === familyCounts[index]) &&
    registry.every((entry) => entry.testTitles.length > 0 && entry.testFiles.length > 0) &&
    registry.every((entry) => entry.evidenceRequirement.length > 0);

  return Object.freeze({
    valid,
    missingIds: Object.freeze(ALPHA0_ACCEPTANCE_IDS.filter((id) => !ids.includes(id))),
  });
};

export const ALPHA0_ACCEPTANCE_TOTAL = Object.freeze(ALPHA0_ACCEPTANCE_IDS.length);
export const ALPHA0_ACCEPTANCE_BOUNDS = Object.freeze({
  min: 24,
  max: 32,
  current: ALPHA0_ACCEPTANCE_TOTAL,
});

export const isAlpha0AcceptanceRegistryWithinBounds = (count: number): boolean =>
  count >= ALPHA0_ACCEPTANCE_BOUNDS.min && count <= ALPHA0_ACCEPTANCE_BOUNDS.max;

export const ALPHA0_ACCEPTANCE_CONFIG = Object.freeze({
  strictEnterpriseMode: false,
  maximumReviewDepth: ALPHA0_BOUNDS.MAX_DEPTH,
  maximumObjectKeys: ALPHA0_BOUNDS.MAX_OBJECT_KEYS,
});
