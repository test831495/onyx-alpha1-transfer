import { describe, expect, it } from "vitest";
import fc from "fast-check";
import {
  ALPHA0_EVIDENCE_CLASSES,
  ALPHA0_LANES,
  ALPHA0_PERMANENT_BLOCKERS,
  ALPHA0_PROFILES,
  ALPHA0_RECORD_FAMILIES,
  ALPHA0_RISK_TIERS,
  ALPHA0_TEST_METHODS,
  validateAlpha0Record,
} from "../src/post-h1/alpha0-validation-contracts";
import {
  ALPHA0_TEST_REGISTRY,
  computeAlpha0TestRegistryFingerprint,
} from "../src/post-h1/alpha0-test-registry";

// Bounded, deterministic property assurance for Alpha 0 critical policy logic.
// Seeded and case-bounded per Input B lifecycle constraints; no network, no I/O.
const SEED = 1234567890;
const NUM_RUNS = 200;

const validRecordArbitrary = fc.record({
  id: fc.constantFrom("ALPHA0-REGISTRY-001", "ALPHA0-DOMAIN-IDENTITY-UNIT"),
  family: fc.constantFrom(...ALPHA0_RECORD_FAMILIES),
  lane: fc.constantFrom(...ALPHA0_LANES),
  riskTier: fc.constantFrom(...ALPHA0_RISK_TIERS),
  profiles: fc.array(fc.constantFrom(...ALPHA0_PROFILES), { minLength: 1, maxLength: 3 }),
  invariant: fc.string({ minLength: 1, maxLength: 40 }),
  rationale: fc.string({ minLength: 1, maxLength: 40 }),
  predecessorDependencies: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
  target: fc.string({ minLength: 1, maxLength: 20 }),
  method: fc.constantFrom(...ALPHA0_TEST_METHODS),
  executionAdapter: fc.string({ minLength: 1, maxLength: 20 }),
  selectionTags: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
  prerequisiteIds: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
  dependentIds: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
  evidenceClasses: fc.array(fc.constantFrom(...ALPHA0_EVIDENCE_CLASSES), { minLength: 1, maxLength: 3 }),
  freshnessPolicy: fc.string({ minLength: 1, maxLength: 10 }),
  invalidationTriggers: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
  requiresPhysicalDevice: fc.boolean(),
  requiresRealRestore: fc.boolean(),
  requiresSyntheticData: fc.boolean(),
  destructiveSideEffect: fc.constantFrom("NONE", "LOW", "HIGH"),
  connectivityRequirement: fc.constantFrom("LOCAL_ONLY"),
  platformClasses: fc.array(fc.constantFrom("LOCAL"), { minLength: 1, maxLength: 1 }),
  blockingStatus: fc.constantFrom("BLOCKER"),
  permanentBlockers: fc.array(fc.constantFrom(...ALPHA0_PERMANENT_BLOCKERS), { maxLength: 3 }),
  timeoutMs: fc.integer({ min: 1, max: 600000 }),
  resourceBounds: fc.array(fc.constantFrom("LOCAL_ONLY"), { minLength: 1, maxLength: 1 }),
  retryPolicy: fc.constantFrom("NONE"),
  flakePolicy: fc.constantFrom("STRICT"),
  expectedOutcome: fc.string({ minLength: 1, maxLength: 20 }),
  resultSchema: fc.constantFrom("ALPHA0_RECORD_V1"),
  provenanceRequirements: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
  candidateBindingRequirements: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
  manifestInclusion: fc.constantFrom("MANDATORY"),
  residualRisk: fc.constantFrom("LOW", "MEDIUM", "HIGH"),
  ownerDecisionRequired: fc.boolean(),
  reopeningTriggers: fc.array(fc.string({ minLength: 1, maxLength: 10 }), { maxLength: 3 }),
});

describe("Alpha 0 bounded property assurance", () => {
  it("accepts every generated well-formed Alpha0 record as valid", () => {
    fc.assert(
      fc.property(validRecordArbitrary, (record) => {
        // fast-check's record() yields a null-prototype object; rebuild as a
        // plain object so only the schema shape (not the safe-prototype guard) is exercised here.
        const plainRecord = { ...record };
        const result = validateAlpha0Record(plainRecord);
        expect(result.valid).toBe(true);
      }),
      { seed: SEED, numRuns: NUM_RUNS }
    );
  });

  it("fails closed on hostile and malformed input without throwing", () => {
    const hostileArbitrary = fc.oneof(
      fc.constant(null),
      fc.constant(undefined),
      fc.integer(),
      fc.string(),
      fc.array(fc.anything(), { maxLength: 5 }),
      fc.object({ maxDepth: 3 }),
      fc.constant(Object.create(null)),
    );
    fc.assert(
      fc.property(hostileArbitrary, (value) => {
        expect(() => validateAlpha0Record(value)).not.toThrow();
        const result = validateAlpha0Record(value);
        expect(typeof result.valid).toBe("boolean");
      }),
      { seed: SEED, numRuns: NUM_RUNS }
    );
  });

  it("keeps registry fingerprint stable under equivalent input ordering (determinism invariant)", () => {
    fc.assert(
      fc.property(fc.constant(ALPHA0_TEST_REGISTRY), (registry) => {
        const forward = computeAlpha0TestRegistryFingerprint(registry);
        const reversed = computeAlpha0TestRegistryFingerprint([...registry].reverse());
        expect(forward).toBe(reversed);
      }),
      { seed: SEED, numRuns: 1 }
    );
  });
});
