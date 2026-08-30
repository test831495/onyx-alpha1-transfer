import { createHash } from "node:crypto";
import { ALPHA0_BOUNDS, ALPHA0_EVIDENCE_CLASSES, ALPHA0_LANES, ALPHA0_PERMANENT_BLOCKERS, ALPHA0_PROFILES, ALPHA0_RISK_TIERS, ALPHA0_TEST_METHODS, validateAlpha0Record, type Alpha0EvidenceClass, type Alpha0Lane, type Alpha0Profile, type Alpha0RiskTier, type Alpha0TestMethod, type Alpha0ValidationRecord } from "./alpha0-validation-contracts";

export type Alpha0TestRecord = Alpha0ValidationRecord;

const definition = (
  id: string,
  family: string,
  lane: Alpha0Lane,
  riskTier: Alpha0RiskTier,
  profiles: readonly Alpha0Profile[],
  invariant: string,
  rationale: string,
  predecessorDependencies: readonly string[],
  target: string,
  method: Alpha0TestMethod,
  executionAdapter: string,
  selectionTags: readonly string[],
  prerequisiteIds: readonly string[],
  dependentIds: readonly string[],
  evidenceClasses: readonly Alpha0EvidenceClass[],
  freshnessPolicy: string,
  invalidationTriggers: readonly string[],
  requiresPhysicalDevice: boolean,
  requiresRealRestore: boolean,
  requiresSyntheticData: boolean,
  destructiveSideEffect: string,
  connectivityRequirement: string,
  platformClasses: readonly string[],
  blockingStatus: string,
  permanentBlockers: readonly (typeof ALPHA0_PERMANENT_BLOCKERS)[number][],
  timeoutMs: number,
  resourceBounds: readonly string[],
  retryPolicy: string,
  flakePolicy: string,
  expectedOutcome: string,
  resultSchema: string,
  provenanceRequirements: readonly string[],
  candidateBindingRequirements: readonly string[],
  manifestInclusion: string,
  residualRisk: string,
  ownerDecisionRequired: boolean,
  reopeningTriggers: readonly string[]
): Alpha0TestRecord =>
  Object.freeze({
    id,
    family,
    lane,
    riskTier,
    profiles: Object.freeze([...profiles]),
    invariant,
    rationale,
    predecessorDependencies: Object.freeze([...predecessorDependencies]),
    target,
    method,
    executionAdapter,
    selectionTags: Object.freeze([...selectionTags]),
    prerequisiteIds: Object.freeze([...prerequisiteIds]),
    dependentIds: Object.freeze([...dependentIds]),
    evidenceClasses: Object.freeze([...evidenceClasses]),
    freshnessPolicy,
    invalidationTriggers: Object.freeze([...invalidationTriggers]),
    requiresPhysicalDevice,
    requiresRealRestore,
    requiresSyntheticData,
    destructiveSideEffect,
    connectivityRequirement,
    platformClasses: Object.freeze([...platformClasses]),
    blockingStatus,
    permanentBlockers: Object.freeze([...permanentBlockers]),
    timeoutMs,
    resourceBounds: Object.freeze([...resourceBounds]),
    retryPolicy,
    flakePolicy,
    expectedOutcome,
    resultSchema,
    provenanceRequirements: Object.freeze([...provenanceRequirements]),
    candidateBindingRequirements: Object.freeze([...candidateBindingRequirements]),
    manifestInclusion,
    residualRisk,
    ownerDecisionRequired,
    reopeningTriggers: Object.freeze([...reopeningTriggers]),
  });

export const ALPHA0_TEST_REGISTRY: readonly Alpha0TestRecord[] = Object.freeze([
  definition("ALPHA0-REGISTRY-001", "ALPHA0-REGISTRY", "IDENTITY_AND_SESSION", "R4_CRITICAL", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], "Alpha 0 validation registry contracts are closed, bounded, immutable, and canonical.", "Registry content must be user-supplied and deterministically ordered without duplication.", ["P0-FRAMEWORK-000"], "@onyx/ai-development-factory-foundation", "CONTRACT", "LOCAL_ONLY", ["registry", "contract", "bounded"], [], [], ["TARGET_LOCK", "CANDIDATE_IDENTITY", "REGISTRY"], "STRICT", ["REGISTRY_DRIFT", "PROFILE_DRIFT"], false, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["REGISTRY_OR_PROFILE_MISMATCH"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "PATCHED", "ALPHA0_RECORD_V1", ["LOCAL"], ["EXACT_TARGET_BINDING"], "MANDATORY", "LOW", false, ["REGISTRY_CHANGE"]),
  definition("ALPHA0-REGISTRY-002", "ALPHA0-REGISTRY", "IDENTITY_AND_SESSION", "R4_CRITICAL", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], "Alpha 0 registry validation rejects duplicate IDs and unsafe prototypes.", "Registry content must fail closed on malformed or hostile input.", ["ALPHA0-REGISTRY-001"], "@onyx/ai-development-factory-foundation", "SCHEMA_AND_BOUNDS", "LOCAL_ONLY", ["bounds", "unsafe-input"], ["ALPHA0-REGISTRY-001"], [], ["REGISTRY"], "STRICT", ["DUPLICATE_ID", "HOT_PATCH"], false, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["UNTRACEABLE_ARTIFACT"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "FAIL_CLOSED", "ALPHA0_RECORD_V1", ["LOCAL"], ["CLOSED_SCHEMA"], "MANDATORY", "LOW", false, ["HOSTILE_INPUT"]),
  definition("ALPHA0-REGISTRY-003", "ALPHA0-REGISTRY", "GOVERNANCE_AND_APPROVAL", "R3_HIGH", ["ALPHA_0_STANDARD", "ALPHA_0_HIGH_RISK", "ALPHA_0_FULL_READINESS"], "Critical tests are required in every high-risk and full-readiness profile.", "Risk tier and profile semantics must remain deterministic and explicit.", ["ALPHA0-REGISTRY-001"], "@onyx/ai-development-factory-foundation", "CONTRACT", "LOCAL_ONLY", ["critical", "risk"], ["ALPHA0-REGISTRY-001"], [], ["PROFILE_SELECTION", "REGISTRY"], "STRICT", ["PROFILE_MISMATCH"], false, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["CRITICAL_FINDING"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "MANDATORY_CRITICAL_INCLUDED", "ALPHA0_RECORD_V1", ["LOCAL"], ["EXACT_RISK_RULE"], "MANDATORY", "MEDIUM", false, ["PROFILE_CHANGE"]),
  definition("ALPHA0-REGISTRY-004", "ALPHA0-REGISTRY", "MEMORY_AND_ISOLATION", "R4_CRITICAL", ["ALPHA_0_SMOKE", "ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], "Isolation and memory controls remain identity-local and non-authorizing.", "Alpha 0 validation never creates a new authority source or broadens access.", ["ALPHA0-REGISTRY-001"], "@onyx/ai-development-factory-foundation", "CONTRACT", "LOCAL_ONLY", ["isolation", "memory"], ["ALPHA0-REGISTRY-001"], [], ["IDENTITY_AND_SESSION", "MEMORY_AND_ISOLATION"], "STRICT", ["ISOLATION_DRIFT"], false, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["ISOLATION_FAILURE"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "ISOLATION_PRESERVED", "ALPHA0_RECORD_V1", ["LOCAL"], ["NON_AUTHORIZING"], "MANDATORY", "MEDIUM", false, ["ISOLATION_CHANGE"]),
  definition("ALPHA0-REGISTRY-005", "ALPHA0-REGISTRY", "GOVERNANCE_AND_APPROVAL", "R3_HIGH", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], "Approval and governance evidence remain projection-only and non-authorizing.", "The Alpha 0 local gate may never fabricate approval authority.", ["ALPHA0-REGISTRY-001"], "@onyx/ai-development-factory-foundation", "CONTRACT", "LOCAL_ONLY", ["governance", "approval"], ["ALPHA0-REGISTRY-001"], [], ["APPROVAL_AND_GOVERNANCE"], "STRICT", ["APPROVAL_DRIFT"], false, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["APPROVAL_ENGINE_BYPASS"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "NO_AUTHORITY", "ALPHA0_RECORD_V1", ["LOCAL"], ["NON_AUTHORIZING"], "MANDATORY", "MEDIUM", false, ["APPROVAL_CHANGE"]),
  definition("ALPHA0-REGISTRY-006", "ALPHA0-REGISTRY", "TRUSTWORTHY_INTELLIGENCE", "R3_HIGH", ["ALPHA_0_STANDARD", "ALPHA_0_ADVERSARIAL", "ALPHA_0_FULL_READINESS"], "Trustworthy intelligence remains provider-neutral and supplied-fact driven.", "No ambient context, popularity, or implicit authority may control risk or execution.", ["ALPHA0-REGISTRY-001"], "@onyx/ai-development-factory-foundation", "PROMPT_INJECTION", "LOCAL_ONLY", ["provider-neutral", "prompt-injection"], ["ALPHA0-REGISTRY-001"], [], ["TRUSTWORTHY_INTELLIGENCE", "ADVERSARIAL"], "STRICT", ["PROVIDER_DRIFT"], false, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["UNKNOWN_POLICY_FAVORABLE_OUTCOME"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "NO_AMBIENT_CONTEXT", "ALPHA0_RECORD_V1", ["LOCAL"], ["SUPPLIED_FACT_ONLY"], "MANDATORY", "MEDIUM", false, ["MODEL_CHANGE"]),
  definition("ALPHA0-REGISTRY-007", "ALPHA0-REGISTRY", "RECOVERY_AND_CONTINUITY", "R4_CRITICAL", ["ALPHA_0_STANDARD", "ALPHA_0_RECOVERY_EXERCISE", "ALPHA_0_FULL_READINESS"], "Recovery continuity requires explicit restore requirements and non-destructive evidence.", "The foundation may represent restore execution as deferred requirements without running restore.", ["ALPHA0-REGISTRY-001"], "@onyx/ai-development-factory-foundation", "REAL_RESTORE", "LOCAL_ONLY", ["recovery", "restore"], ["ALPHA0-REGISTRY-001"], [], ["RECOVERY_AND_RESTORE"], "STRICT", ["RESTORE_DRIFT"], false, true, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["MANDATORY_RESTORE_FAILED"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "RESTORE_DEFERRED_NOT_EXECUTED", "ALPHA0_RECORD_V1", ["LOCAL"], ["EXECUTION_DEFERRED"], "MANDATORY", "HIGH", false, ["RESTORE_CHANGE"]),
  definition("ALPHA0-SELECT-001", "ALPHA0-SELECT", "IDENTITY_AND_SESSION", "R3_HIGH", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], "The selector must remain deterministic and stable under equivalent input ordering.", "Equivalent input ordering must produce identical selections.", ["ALPHA0-REGISTRY-001"], "@onyx/ai-development-factory-foundation", "DETERMINISTIC_UNIT", "LOCAL_ONLY", ["selection", "deterministic"], ["ALPHA0-REGISTRY-001"], [], ["PROFILE_SELECTION", "DEPENDENCY_PLAN"], "STRICT", ["SELECTION_DRIFT"], false, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["REGISTRY_OR_PROFILE_MISMATCH"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "STABLE_ORDER", "ALPHA0_RECORD_V1", ["LOCAL"], ["STABLE_SELECTION"], "MANDATORY", "MEDIUM", false, ["SELECTION_CHANGE"]),
  definition("ALPHA0-SELECT-002", "ALPHA0-SELECT", "PERFORMANCE_STABILITY_COST_AND_ACCESSIBILITY", "R2_MODERATE", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], "The planner must reject missing and cyclic dependencies without executing tests.", "Dependency order must remain deterministic and fail closed.", ["ALPHA0-SELECT-001"], "@onyx/ai-development-factory-foundation", "CONTRACT", "LOCAL_ONLY", ["planner", "dependency"], ["ALPHA0-SELECT-001"], [], ["DEPENDENCY_PLAN"], "STRICT", ["CYCLE_DETECTED"], false, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["UNTRACEABLE_ARTIFACT"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "PLAN_IS_PROJECTION_ONLY", "ALPHA0_RECORD_V1", ["LOCAL"], ["NO_EXECUTION"], "MANDATORY", "LOW", false, ["PLAN_CHANGE"]),
  definition("ALPHA0-EVIDENCE-001", "ALPHA0-EVIDENCE", "IDENTITY_AND_SESSION", "R4_CRITICAL", ["ALPHA_0_FULL_READINESS"], "Evidence manifests are candidate-bound, canonical, and immutable.", "Evidence must never satisfy a different candidate or stale target.", ["ALPHA0-SELECT-001"], "@onyx/ai-development-factory-foundation", "INTEGRATION", "LOCAL_ONLY", ["evidence", "candidate-binding"], ["ALPHA0-SELECT-001"], [], ["TARGET_LOCK", "CANDIDATE_IDENTITY", "DEPENDENCY_PLAN"], "STRICT", ["CANDIDATE_MISMATCH"], false, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["CANDIDATE_TARGET_MISMATCH"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "CANDIDATE_BOUND", "ALPHA0_RECORD_V1", ["LOCAL"], ["BOUND_TO_TARGET"], "MANDATORY", "HIGH", false, ["EVIDENCE_CHANGE"]),
  definition("ALPHA0-EVIDENCE-002", "ALPHA0-EVIDENCE", "MEMORY_AND_ISOLATION", "R3_HIGH", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], "Freshness and invalidation logic must fail closed on stale or contradictory evidence.", "Freshness is supplied-fact based and never ambient-time based.", ["ALPHA0-EVIDENCE-001"], "@onyx/ai-development-factory-foundation", "SCHEMA_AND_BOUNDS", "LOCAL_ONLY", ["freshness", "invalidation"], ["ALPHA0-EVIDENCE-001"], [], ["RESIDUAL_RISK", "SECURITY_REVIEW"], "STRICT", ["STALE_EVIDENCE", "CONTRADICTORY_EVIDENCE"], false, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["STALE_OR_INVALIDATED_READINESS_EVIDENCE"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "EXPIRES_ON_CHANGE", "ALPHA0_RECORD_V1", ["LOCAL"], ["FRESHNESS_RESTRICTED"], "MANDATORY", "HIGH", false, ["FRESHNESS_CHANGE"]),
  definition("ALPHA0-SAFE-001", "ALPHA0-SAFE", "GOVERNANCE_AND_APPROVAL", "R4_CRITICAL", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], "Every public result remains non-authorizing and never creates authority.", "Output can only describe facts and safe projections.", ["ALPHA0-EVIDENCE-001"], "@onyx/ai-development-factory-foundation", "CONTRACT", "LOCAL_ONLY", ["non-authorizing", "safety"], ["ALPHA0-EVIDENCE-001"], [], ["APPROVAL_AND_GOVERNANCE"], "STRICT", ["AUTHORITY_DRIFT"], false, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["UNKNOWN_POLICY_FAVORABLE_OUTCOME"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "NON_AUTHORIZING", "ALPHA0_RECORD_V1", ["LOCAL"], ["NON_AUTHORIZING"], "MANDATORY", "HIGH", false, ["AUTHORITY_CHANGE"]),
  definition("ALPHA0-SAFE-002", "ALPHA0-SAFE", "TRUSTWORTHY_INTELLIGENCE", "R4_CRITICAL", ["ALPHA_0_ADVERSARIAL", "ALPHA_0_FULL_READINESS"], "Hostile input, recursive immutability, and bounds checks are enforced.", "Unsafe or malformed input must fail closed without truncation and without I/O.", ["ALPHA0-SAFE-001"], "@onyx/ai-development-factory-foundation", "ADVERSARIAL", "LOCAL_ONLY", ["hostile-input", "bounds"], ["ALPHA0-SAFE-001"], [], ["ADVERSARIAL", "SCHEMA_AND_BOUNDS"], "STRICT", ["HOSTILE_INPUT", "PROXY", "ACCESSOR"], false, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["PROHIBITED_VALIDATION_SIDE_EFFECT"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "NO_FAVORABLE_TRUNCATION", "ALPHA0_RECORD_V1", ["LOCAL"], ["FAIL_CLOSED"], "MANDATORY", "HIGH", false, ["HOSTILE_INPUT_CHANGE"]),
  definition("ALPHA0-READINESS-001", "ALPHA0-READINESS", "IDENTITY_AND_SESSION", "R3_HIGH", ["ALPHA_0_FULL_READINESS"], "The readiness projection may describe required evidence, blockers, and deferred execution but never verify readiness.", "Readiness assessment is planning-only.", ["ALPHA0-SAFE-001"], "@onyx/ai-development-factory-foundation", "INTEGRATION", "LOCAL_ONLY", ["readiness", "projection"], ["ALPHA0-SAFE-001"], [], ["RESIDUAL_RISK", "PROFILE_SELECTION"], "STRICT", ["READINESS_CLAIM"], false, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["OWNER_DECISION_REQUIRED"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "NO_READINESS_VERIFICATION", "ALPHA0_RECORD_V1", ["LOCAL"], ["PLAN_ONLY"], "MANDATORY", "MEDIUM", false, ["READINESS_CHANGE"]),
  definition("ALPHA0-READINESS-002", "ALPHA0-READINESS", "RECOVERY_AND_CONTINUITY", "R4_CRITICAL", ["ALPHA_0_RECOVERY_EXERCISE", "ALPHA_0_FULL_READINESS"], "Restore requirements are projected as execution-required and remain deferred.", "The foundation does not run real restore as part of local validation.", ["ALPHA0-READINESS-001"], "@onyx/ai-development-factory-foundation", "REAL_RESTORE", "LOCAL_ONLY", ["restore", "defer"], ["ALPHA0-READINESS-001"], [], ["RECOVERY_AND_RESTORE"], "STRICT", ["RESTORE_EXECUTED"], false, true, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["REQUIRED_REAL_RESTORE_NOT_COMPLETED"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "RESTORE_REMAIN_DEFERRED", "ALPHA0_RECORD_V1", ["LOCAL"], ["EXECUTION_DEFERRED"], "MANDATORY", "HIGH", false, ["RESTORE_CHANGE"]),
  definition("ALPHA0-REGISTRY-015", "ALPHA0-REGISTRY", "CROSS_PLATFORM_AND_DEVICE_TRUST", "R3_HIGH", ["ALPHA_0_CROSS_PLATFORM", "ALPHA_0_FULL_READINESS"], "Cross-platform equivalence is represented as a requirement, not runtime execution.", "Platform and device trust checks are requirements-only in this foundation.", ["ALPHA0-READINESS-001"], "@onyx/ai-development-factory-foundation", "CROSS_PLATFORM", "LOCAL_ONLY", ["platform", "device"], ["ALPHA0-READINESS-001"], [], ["CROSS_PLATFORM"], "STRICT", ["DEVICE_DRIFT"], false, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["REQUIRED_PHYSICAL_DEVICE_NOT_COMPLETED"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "DEVICE_REQUIRES_AUTHORIZATION", "ALPHA0_RECORD_V1", ["LOCAL"], ["REQUIREMENT_ONLY"], "MANDATORY", "HIGH", false, ["DEVICE_CHANGE"]),
  definition("ALPHA0-REGISTRY-016", "ALPHA0-REGISTRY", "END_TO_END_AND_NEGATIVE_SIDE_EFFECTS", "R4_CRITICAL", ["ALPHA_0_STANDARD", "ALPHA_0_FULL_READINESS"], "Negative side-effect and end-to-end requirements are analyzed but not executed.", "This foundation must never run destructive or production-like operations.", ["ALPHA0-REGISTRY-015"], "@onyx/ai-development-factory-foundation", "NEGATIVE_SIDE_EFFECT", "LOCAL_ONLY", ["negative-side-effect"], ["ALPHA0-REGISTRY-015"], [], ["NEGATIVE_SIDE_EFFECT", "END_TO_END"], "STRICT", ["SIDE_EFFECT_RISK"], false, false, false, "HIGH", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["PROHIBITED_VALIDATION_SIDE_EFFECT"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "DESTRUCTIVE_ACTION_FORBIDDEN", "ALPHA0_RECORD_V1", ["LOCAL"], ["PROHIBITED_SIDE_EFFECT"], "MANDATORY", "CRITICAL", false, ["SIDE_EFFECT_CHANGE"]),
  definition("ALPHA0-REGISTRY-017", "ALPHA0-REGISTRY", "CROSS_PLATFORM_AND_DEVICE_TRUST", "R4_CRITICAL", ["ALPHA_0_CROSS_PLATFORM", "ALPHA_0_FULL_READINESS"], "Physical device validation is structurally required but intentionally deferred from execution.", "This gate permits a requirement representation only; device execution remains blocked.", ["ALPHA0-REGISTRY-015"], "@onyx/ai-development-factory-foundation", "PHYSICAL_DEVICE", "LOCAL_ONLY", ["physical-device", "deferred"], ["ALPHA0-REGISTRY-015"], [], ["PHYSICAL_DEVICE"], "STRICT", ["DEVICE_REQUIRED"], true, false, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["REQUIRED_PHYSICAL_DEVICE_NOT_COMPLETED"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "DEFERRED_EXECUTION", "ALPHA0_RECORD_V1", ["LOCAL"], ["REQUIREMENT_ONLY"], "MANDATORY", "CRITICAL", true, ["PHYSICAL_DEVICE_CHANGE"]),
  definition("ALPHA0-REGISTRY-018", "ALPHA0-REGISTRY", "RECOVERY_AND_CONTINUITY", "R4_CRITICAL", ["ALPHA_0_RECOVERY_EXERCISE", "ALPHA_0_FULL_READINESS"], "Real restore requirements are explicitly modeled as deferred execution steps.", "The foundation does not execute a real restore in this gate.", ["ALPHA0-REGISTRY-007"], "@onyx/ai-development-factory-foundation", "REAL_RESTORE", "LOCAL_ONLY", ["real-restore", "deferred"], ["ALPHA0-REGISTRY-007"], [], ["REAL_RESTORE"], "STRICT", ["RESTORE_REQUIRED"], false, true, false, "NONE", "LOCAL_ONLY", ["LOCAL"], "BLOCKER", ["REQUIRED_REAL_RESTORE_NOT_COMPLETED"], 600000, ["LOCAL_ONLY"], "NONE", "STRICT", "DEFERRED_EXECUTION", "ALPHA0_RECORD_V1", ["LOCAL"], ["REQUIREMENT_ONLY"], "MANDATORY", "CRITICAL", true, ["RESTORE_CHANGE"]),
] as const);

export const computeAlpha0TestRegistryFingerprint = (registry: readonly Alpha0TestRecord[]): string => {
  const canonical = JSON.stringify(
    registry
      .slice()
      .sort((left, right) => left.id.localeCompare(right.id))
      .map((entry) => ({
        id: entry.id,
        family: entry.family,
        lane: entry.lane,
        riskTier: entry.riskTier,
        profiles: [...entry.profiles].sort(),
        invariant: entry.invariant,
        predecessorDependencies: [...entry.predecessorDependencies].sort(),
        target: entry.target,
        method: entry.method,
        evidenceClasses: [...entry.evidenceClasses].sort(),
      })),
    null,
    0
  );
  return createHash("sha256").update(canonical, "utf8").digest("hex");
};

export const validateAlpha0TestRegistry = (
  registry: readonly Alpha0TestRecord[]
): Readonly<{ valid: boolean; missingIds: readonly string[] }> => {
  const ids = registry.map((entry) => entry.id);
  const valid =
    registry.length >= 18 &&
    registry.length <= 64 &&
    new Set(ids).size === ids.length &&
    registry.every((entry) => validateAlpha0Record(entry).valid) &&
    registry.every((entry) => entry.profiles.length > 0 && entry.evidenceClasses.length > 0) &&
    registry.some((entry) => entry.id === "ALPHA0-REGISTRY-001") &&
    registry.some((entry) => entry.id === "ALPHA0-SELECT-001") &&
    registry.some((entry) => entry.id === "ALPHA0-REGISTRY-017") &&
    registry.some((entry) => entry.id === "ALPHA0-REGISTRY-018");

  return Object.freeze({
    valid,
    missingIds: Object.freeze([]),
  });
};
