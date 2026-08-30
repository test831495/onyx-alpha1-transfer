import { describe, expect, it } from "vitest";
import { validateAlpha0Record } from "../src/post-h1/alpha0-validation-contracts";

// Bounded, deterministic mutation-assurance target: validateAlpha0Record is
// the critical-policy fail-closed gate for every Alpha 0 record. This suite
// exercises the valid baseline plus one negative case per branch so mutation
// testing can distinguish "always true"/"always false"/off-by-one mutants.
const validRecord = Object.freeze({
  id: "ALPHA0-REGISTRY-001",
  family: "ALPHA0-REGISTRY",
  lane: "IDENTITY_AND_SESSION",
  riskTier: "R4_CRITICAL",
  profiles: ["ALPHA_0_STANDARD"],
  invariant: "x",
  rationale: "x",
  predecessorDependencies: [],
  target: "@onyx/ai-development-factory-foundation",
  method: "CONTRACT",
  executionAdapter: "LOCAL_ONLY",
  selectionTags: [],
  prerequisiteIds: [],
  dependentIds: [],
  evidenceClasses: ["TARGET_LOCK"],
  freshnessPolicy: "STRICT",
  invalidationTriggers: [],
  requiresPhysicalDevice: false,
  requiresRealRestore: false,
  requiresSyntheticData: false,
  destructiveSideEffect: "NONE",
  connectivityRequirement: "LOCAL_ONLY",
  platformClasses: ["LOCAL"],
  blockingStatus: "BLOCKER",
  permanentBlockers: [],
  timeoutMs: 600000,
  resourceBounds: ["LOCAL_ONLY"],
  retryPolicy: "NONE",
  flakePolicy: "STRICT",
  expectedOutcome: "PASS",
  resultSchema: "ALPHA0_RECORD_V1",
  provenanceRequirements: [],
  candidateBindingRequirements: [],
  manifestInclusion: "MANDATORY",
  residualRisk: "LOW",
  ownerDecisionRequired: false,
  reopeningTriggers: [],
});

describe("Alpha 0 bounded mutation assurance target: validateAlpha0Record", () => {
  it("accepts the canonical valid record", () => {
    expect(validateAlpha0Record(validRecord).valid).toBe(true);
  });

  it("rejects null and non-object input", () => {
    expect(validateAlpha0Record(null).valid).toBe(false);
    expect(validateAlpha0Record(undefined).valid).toBe(false);
    expect(validateAlpha0Record("string").valid).toBe(false);
    expect(validateAlpha0Record(42).valid).toBe(false);
  });

  it("rejects an id that fails the ALPHA0 pattern", () => {
    expect(validateAlpha0Record({ ...validRecord, id: "not-alpha0" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, id: "" }).valid).toBe(false);
  });

  it("rejects an unknown family, lane, riskTier, or method", () => {
    expect(validateAlpha0Record({ ...validRecord, family: "UNKNOWN" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, lane: "UNKNOWN" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, riskTier: "UNKNOWN" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, method: "UNKNOWN" }).valid).toBe(false);
  });

  it("rejects empty or over-bound profiles", () => {
    expect(validateAlpha0Record({ ...validRecord, profiles: [] }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, profiles: ["NOT_A_PROFILE"] }).valid).toBe(false);
    expect(
      validateAlpha0Record({ ...validRecord, profiles: Array(9).fill("ALPHA_0_STANDARD") }).valid
    ).toBe(false);
    // exact-boundary: 8 valid profiles must pass, 9 must fail (kills > vs >= boundary mutants)
    expect(
      validateAlpha0Record({ ...validRecord, profiles: Array(8).fill("ALPHA_0_STANDARD") }).valid
    ).toBe(true);
  });

  it("rejects profiles containing even one invalid member (kills .some()-for-.every() mutants)", () => {
    expect(
      validateAlpha0Record({ ...validRecord, profiles: ["ALPHA_0_STANDARD", "NOT_A_PROFILE"] })
        .valid
    ).toBe(false);
  });

  it("rejects empty invariant, rationale, target, and executionAdapter", () => {
    expect(validateAlpha0Record({ ...validRecord, invariant: "" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, rationale: "" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, target: "" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, executionAdapter: "" }).valid).toBe(false);
  });

  it("rejects unsafe string-array fields", () => {
    expect(validateAlpha0Record({ ...validRecord, predecessorDependencies: [123] }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, selectionTags: [null] }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, prerequisiteIds: "not-an-array" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, dependentIds: "not-an-array" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, invalidationTriggers: [{}] }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, resourceBounds: "not-an-array" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, provenanceRequirements: [1] }).valid).toBe(false);
    expect(
      validateAlpha0Record({ ...validRecord, candidateBindingRequirements: "not-an-array" }).valid
    ).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, reopeningTriggers: "not-an-array" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, platformClasses: "not-an-array" }).valid).toBe(false);
  });

  it("rejects empty or invalid evidenceClasses", () => {
    expect(validateAlpha0Record({ ...validRecord, evidenceClasses: [] }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, evidenceClasses: ["NOT_REAL"] }).valid).toBe(false);
  });

  it("rejects evidenceClasses containing even one invalid member (kills .some()-for-.every() mutants)", () => {
    expect(
      validateAlpha0Record({ ...validRecord, evidenceClasses: ["TARGET_LOCK", "NOT_REAL"] }).valid
    ).toBe(false);
  });

  it("rejects empty freshnessPolicy, blockingStatus, expectedOutcome, and resultSchema", () => {
    expect(validateAlpha0Record({ ...validRecord, freshnessPolicy: "" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, blockingStatus: "" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, expectedOutcome: "" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, resultSchema: "" }).valid).toBe(false);
  });

  it("rejects unknown permanentBlockers values", () => {
    expect(validateAlpha0Record({ ...validRecord, permanentBlockers: ["NOT_A_BLOCKER"] }).valid).toBe(
      false
    );
  });

  it("rejects a non-string destructiveSideEffect or connectivityRequirement", () => {
    expect(validateAlpha0Record({ ...validRecord, destructiveSideEffect: 1 }).valid).toBe(false);
    expect(
      validateAlpha0Record({ ...validRecord, destructiveSideEffect: "x".repeat(1025) }).valid
    ).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, connectivityRequirement: 1 }).valid).toBe(false);
  });

  it("rejects out-of-range or non-numeric timeoutMs", () => {
    expect(validateAlpha0Record({ ...validRecord, timeoutMs: 0 }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, timeoutMs: -1 }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, timeoutMs: 3600001 }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, timeoutMs: Number.NaN }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, timeoutMs: "600000" }).valid).toBe(false);
    // exact-boundary: 3600000 must pass (kills > vs >= boundary mutant)
    expect(validateAlpha0Record({ ...validRecord, timeoutMs: 3600000 }).valid).toBe(true);
  });

  it("rejects non-string retryPolicy, flakePolicy, manifestInclusion, and residualRisk", () => {
    expect(validateAlpha0Record({ ...validRecord, retryPolicy: 1 }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, flakePolicy: 1 }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, manifestInclusion: 1 }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, residualRisk: 1 }).valid).toBe(false);
  });

  it("rejects non-boolean requires/owner-decision fields", () => {
    expect(validateAlpha0Record({ ...validRecord, requiresPhysicalDevice: "false" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, requiresRealRestore: "false" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, requiresSyntheticData: "false" }).valid).toBe(false);
    expect(validateAlpha0Record({ ...validRecord, ownerDecisionRequired: "false" }).valid).toBe(false);
  });

  it("rejects a non-Object.prototype record (prototype pollution guard)", () => {
    const hostile = Object.create(null);
    Object.assign(hostile, validRecord);
    expect(validateAlpha0Record(hostile).valid).toBe(false);
  });
});
