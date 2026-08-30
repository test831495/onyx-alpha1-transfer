import { describe, expect, it } from "vitest";
import {
  ALPHA0_BOUNDS,
  ALPHA0_EVIDENCE_CLASSES,
  ALPHA0_LANES,
  ALPHA0_PERMANENT_BLOCKERS,
  ALPHA0_PROFILES,
  ALPHA0_RISK_TIERS,
  ALPHA0_TEST_METHODS,
  validateAlpha0Record,
} from "../src/post-h1/alpha0-validation-contracts";
import {
  ALPHA0_TEST_REGISTRY,
  computeAlpha0TestRegistryFingerprint,
  validateAlpha0TestRegistry,
} from "../src/post-h1/alpha0-test-registry";
import {
  ALPHA0_ACCEPTANCE_IDS,
  ALPHA0_ACCEPTANCE_REGISTRY,
  validateAlpha0AcceptanceRegistry,
} from "../src/post-h1/alpha0-readiness-acceptance-registry";

describe("Post-H1 Alpha 0 validation foundation contracts and registries", () => {
  it("defines the frozen local Alpha 0 vocabulary and bounds", () => {
    expect(ALPHA0_LANES).toEqual([
      "IDENTITY_AND_SESSION",
      "MEMORY_AND_ISOLATION",
      "GOVERNANCE_AND_APPROVAL",
      "TRUSTWORTHY_INTELLIGENCE",
      "RECOVERY_AND_CONTINUITY",
      "CROSS_PLATFORM_AND_DEVICE_TRUST",
      "END_TO_END_AND_NEGATIVE_SIDE_EFFECTS",
      "PERFORMANCE_STABILITY_COST_AND_ACCESSIBILITY",
    ]);

    expect(ALPHA0_RISK_TIERS).toEqual([
      "R0_INFORMATIONAL",
      "R1_LOW",
      "R2_MODERATE",
      "R3_HIGH",
      "R4_CRITICAL",
    ]);

    expect(ALPHA0_PROFILES).toEqual([
      "ALPHA_0_SMOKE",
      "ALPHA_0_STANDARD",
      "ALPHA_0_HIGH_RISK",
      "ALPHA_0_ADVERSARIAL",
      "ALPHA_0_CROSS_PLATFORM",
      "ALPHA_0_RECOVERY_EXERCISE",
      "ALPHA_0_FULL_READINESS",
    ]);

    expect(ALPHA0_TEST_METHODS).toEqual([
      "DETERMINISTIC_UNIT",
      "INTEGRATION",
      "CONTRACT",
      "SCHEMA_AND_BOUNDS",
      "PROPERTY_BASED",
      "MUTATION",
      "ADVERSARIAL",
      "PROMPT_INJECTION",
      "REPLAY",
      "CONCURRENCY",
      "RACE_AND_ATOMICITY",
      "FAILURE_INJECTION",
      "NEGATIVE_SIDE_EFFECT",
      "END_TO_END",
      "CROSS_PLATFORM",
      "PHYSICAL_DEVICE",
      "REAL_RESTORE",
      "ACCESSIBILITY",
      "PERFORMANCE_AND_STABILITY",
      "COST_AND_BUDGET",
      "MANUAL_OWNER_INSPECTION",
      "INDEPENDENT_SECURITY_REVIEW",
    ]);

    expect(ALPHA0_EVIDENCE_CLASSES).toContain("TARGET_LOCK");
    expect(ALPHA0_EVIDENCE_CLASSES).toContain("CANDIDATE_IDENTITY");
    expect(ALPHA0_EVIDENCE_CLASSES).toContain("RESIDUAL_RISK");
    expect(ALPHA0_PERMANENT_BLOCKERS).toContain("CRITICAL_FINDING");
    expect(ALPHA0_PERMANENT_BLOCKERS).toContain("PROHIBITED_VALIDATION_SIDE_EFFECT");
    expect(ALPHA0_BOUNDS.MAX_STRING_LENGTH).toBe(1024);
    expect(ALPHA0_BOUNDS.MAX_OBJECT_KEYS).toBe(64);
  });

  it("validates the test registry and acceptance registry contracts", () => {
    const registryCheck = validateAlpha0TestRegistry(ALPHA0_TEST_REGISTRY);
    expect(registryCheck.valid).toBe(true);
    expect(registryCheck.missingIds).toEqual([]);

    const acceptanceCheck = validateAlpha0AcceptanceRegistry(ALPHA0_ACCEPTANCE_REGISTRY);
    expect(acceptanceCheck.valid).toBe(true);
    expect(acceptanceCheck.missingIds).toEqual([]);
    expect(ALPHA0_ACCEPTANCE_IDS.length).toBeGreaterThanOrEqual(24);
    expect(ALPHA0_ACCEPTANCE_IDS.length).toBeLessThanOrEqual(32);

    const fingerprint = computeAlpha0TestRegistryFingerprint(ALPHA0_TEST_REGISTRY);
    expect(typeof fingerprint).toBe("string");
    expect(fingerprint.length).toBeGreaterThan(20);
  });

  it("rejects malformed or hostile registry entries without favorable truncation", () => {
    const malformedRecord = {
      id: "ALPHA0-REGISTRY-FAULT-001",
      family: "ALPHA0-REGISTRY",
      lane: "IDENTITY_AND_SESSION",
      riskTier: "R4_CRITICAL",
      profiles: ["ALPHA_0_FULL_READINESS"],
      invariant: "bad",
      rationale: "bad",
      predecessorDependencies: ["ALPHA0-REGISTRY-FAULT-001"],
      target: "@onyx/ai-development-factory-foundation",
      method: "PHYSICAL_DEVICE",
      executionAdapter: "LOCAL_ONLY",
      selectionTags: ["tag"],
      prerequisiteIds: ["ALPHA0-REGISTRY-FAULT-001"],
      dependentIds: [],
      evidenceClasses: ["TARGET_LOCK"],
      freshnessPolicy: "BOUNDED",
      invalidationTriggers: ["SELF"],
      requiresPhysicalDevice: true,
      requiresRealRestore: true,
      requiresSyntheticData: false,
      destructiveSideEffect: "RESTRICTED",
      connectivityRequirement: "LOCAL_ONLY",
      platformClasses: ["LOCAL"],
      blockingStatus: "BLOCKER",
      permanentBlockers: ["CRITICAL_FINDING"],
      timeoutMs: 500,
      resourceBounds: ["LOCAL_ONLY"],
      retryPolicy: "NONE",
      flakePolicy: "STRICT",
      expectedOutcome: "PREVENT",
      resultSchema: "ALPHA0_RESULT_V1",
      provenanceRequirements: ["LOCAL"],
      candidateBindingRequirements: ["EXACT"],
      manifestInclusion: "MANDATORY",
      residualRisk: "LOW",
      ownerDecisionRequired: true,
      reopeningTriggers: ["CHANGE"],
      __proto__: null,
    } as any;

    const validation = validateAlpha0Record(malformedRecord);
    expect(validation.valid).toBe(false);
    expect(validation.reasonCodes).toContain("ALPHA0_RECORD_INVALID");
  });

  it("reports missing canonical registry IDs instead of always returning an empty list", () => {
    const strippedRegistry = ALPHA0_TEST_REGISTRY.filter((entry) => entry.id !== "ALPHA0-REGISTRY-017");
    const registryCheck = validateAlpha0TestRegistry(strippedRegistry);
    expect(registryCheck.valid).toBe(false);
    expect(registryCheck.missingIds).toContain("ALPHA0-REGISTRY-017");
  });

  it("rejects permanent blocker values outside the closed vocabulary", () => {
    const baseRecord = ALPHA0_TEST_REGISTRY[0]!;
    const recordWithUnknownBlocker = {
      ...baseRecord,
      permanentBlockers: [...baseRecord.permanentBlockers, "NOT_A_REAL_BLOCKER"],
    };

    const validation = validateAlpha0Record(recordWithUnknownBlocker);
    expect(validation.valid).toBe(false);
    expect(validation.reasonCodes).toContain("ALPHA0_PERMANENT_BLOCKERS_INVALID");
  });
});
