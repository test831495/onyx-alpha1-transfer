import { inspectRecordSnapshot } from "../factory-constitution";

export const ALPHA0_BOUNDS = Object.freeze({
  MAX_DEPTH: 10,
  MAX_OBJECT_KEYS: 64,
  MAX_COLLECTION_ITEMS: 64,
  MAX_PROFILES: 8,
  MAX_LANES: 8,
  MAX_STRING_LENGTH: 1024,
  MAX_CHANGE_PATHS: 128,
  MAX_SELECTED_IDS: 256,
  MAX_BLOCKERS: 64,
  MAX_EVIDENCE_ITEMS: 64,
  MAX_REFS: 64,
  MAX_TAGS: 32,
  MAX_OWNER_DECISIONS: 16,
} as const);

export const ALPHA0_LANES = Object.freeze([
  "IDENTITY_AND_SESSION",
  "MEMORY_AND_ISOLATION",
  "GOVERNANCE_AND_APPROVAL",
  "TRUSTWORTHY_INTELLIGENCE",
  "RECOVERY_AND_CONTINUITY",
  "CROSS_PLATFORM_AND_DEVICE_TRUST",
  "END_TO_END_AND_NEGATIVE_SIDE_EFFECTS",
  "PERFORMANCE_STABILITY_COST_AND_ACCESSIBILITY",
] as const);
export type Alpha0Lane = (typeof ALPHA0_LANES)[number];

export const ALPHA0_RISK_TIERS = Object.freeze([
  "R0_INFORMATIONAL",
  "R1_LOW",
  "R2_MODERATE",
  "R3_HIGH",
  "R4_CRITICAL",
] as const);
export type Alpha0RiskTier = (typeof ALPHA0_RISK_TIERS)[number];

export const ALPHA0_PROFILES = Object.freeze([
  "ALPHA_0_SMOKE",
  "ALPHA_0_STANDARD",
  "ALPHA_0_HIGH_RISK",
  "ALPHA_0_ADVERSARIAL",
  "ALPHA_0_CROSS_PLATFORM",
  "ALPHA_0_RECOVERY_EXERCISE",
  "ALPHA_0_FULL_READINESS",
] as const);
export type Alpha0Profile = (typeof ALPHA0_PROFILES)[number];

export const ALPHA0_TEST_METHODS = Object.freeze([
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
] as const);
export type Alpha0TestMethod = (typeof ALPHA0_TEST_METHODS)[number];

export const ALPHA0_EVIDENCE_CLASSES = Object.freeze([
  "TARGET_LOCK",
  "CANDIDATE_IDENTITY",
  "REGISTRY",
  "PROFILE_SELECTION",
  "DEPENDENCY_PLAN",
  "UNIT_AND_CONTRACT",
  "PROPERTY",
  "MUTATION",
  "ADVERSARIAL",
  "REPLAY_AND_CONCURRENCY",
  "NEGATIVE_SIDE_EFFECT",
  "IDENTITY_AND_SESSION",
  "MEMORY_AND_ISOLATION",
  "APPROVAL_AND_GOVERNANCE",
  "TRUSTWORTHY_INTELLIGENCE",
  "RECOVERY_AND_RESTORE",
  "CROSS_PLATFORM",
  "PHYSICAL_DEVICE",
  "END_TO_END",
  "ACCESSIBILITY",
  "PERFORMANCE_AND_STABILITY",
  "COST_AND_BUDGET",
  "SCHEMA_AND_BOUNDS",
  "REAL_RESTORE",
  "SECURITY_REVIEW",
  "RESIDUAL_RISK",
] as const);
export type Alpha0EvidenceClass = (typeof ALPHA0_EVIDENCE_CLASSES)[number];

export const ALPHA0_PERMANENT_BLOCKERS = Object.freeze([
  "CRITICAL_FINDING",
  "UNAUTHORIZED_CROSS_ACCOUNT_DISCLOSURE",
  "ISOLATION_FAILURE",
  "APPROVAL_ENGINE_BYPASS",
  "STALE_AUTHORITY_REACTIVATION",
  "MANDATORY_RESTORE_FAILED",
  "SESSION_ISOLATION_FAILURE",
  "CONNECTOR_OWNERSHIP_DEFECT",
  "UNAUDITED_PRIVILEGED_ACTION",
  "CREDENTIAL_OR_SECRET_EXPOSURE",
  "RAW_BIOMETRIC_IN_RECOVERY",
  "UNCERTAIN_DESTRUCTIVE_EXTERNAL_EFFECT",
  "UNTRACEABLE_ARTIFACT",
  "MANDATORY_EVIDENCE_MISSING",
  "EVIDENCE_HASH_MISMATCH",
  "CANDIDATE_TARGET_MISMATCH",
  "REGISTRY_OR_PROFILE_MISMATCH",
  "UNRESOLVED_MANDATORY_REVIEW_FINDING",
  "CONTRADICTORY_EVIDENCE_FAVORABLE_OUTCOME",
  "PROHIBITED_VALIDATION_SIDE_EFFECT",
  "LANGUAGE_OR_PLATFORM_AUTHORIZATION_DRIFT",
  "UNKNOWN_POLICY_FAVORABLE_OUTCOME",
  "AUDIT_UNAVAILABLE_FAVORABLE_OUTCOME",
  "INVALID_APPROVAL_ACCEPTED",
  "REVOKED_OR_DELETED_AUTHORITY_RESTORED",
  "REQUIRED_PHYSICAL_DEVICE_NOT_COMPLETED",
  "REQUIRED_REAL_RESTORE_NOT_COMPLETED",
  "REQUIRED_SECURITY_REVIEW_NOT_COMPLETED",
  "STALE_OR_INVALIDATED_READINESS_EVIDENCE",
  "OWNER_DECISION_REQUIRED",
] as const);
export type Alpha0PermanentBlocker = (typeof ALPHA0_PERMANENT_BLOCKERS)[number];

export type Alpha0ValidationRecord = Readonly<{
  id: string;
  family: string;
  lane: Alpha0Lane;
  riskTier: Alpha0RiskTier;
  profiles: readonly Alpha0Profile[];
  invariant: string;
  rationale: string;
  predecessorDependencies: readonly string[];
  target: string;
  method: Alpha0TestMethod;
  executionAdapter: string;
  selectionTags: readonly string[];
  prerequisiteIds: readonly string[];
  dependentIds: readonly string[];
  evidenceClasses: readonly Alpha0EvidenceClass[];
  freshnessPolicy: string;
  invalidationTriggers: readonly string[];
  requiresPhysicalDevice: boolean;
  requiresRealRestore: boolean;
  requiresSyntheticData: boolean;
  destructiveSideEffect: string;
  connectivityRequirement: string;
  platformClasses: readonly string[];
  blockingStatus: string;
  permanentBlockers: readonly Alpha0PermanentBlocker[];
  timeoutMs: number;
  resourceBounds: readonly string[];
  retryPolicy: string;
  flakePolicy: string;
  expectedOutcome: string;
  resultSchema: string;
  provenanceRequirements: readonly string[];
  candidateBindingRequirements: readonly string[];
  manifestInclusion: string;
  residualRisk: string;
  ownerDecisionRequired: boolean;
  reopeningTriggers: readonly string[];
}>;

const requiredRecordKeys = [
  "id",
  "family",
  "lane",
  "riskTier",
  "profiles",
  "invariant",
  "rationale",
  "predecessorDependencies",
  "target",
  "method",
  "executionAdapter",
  "selectionTags",
  "prerequisiteIds",
  "dependentIds",
  "evidenceClasses",
  "freshnessPolicy",
  "invalidationTriggers",
  "requiresPhysicalDevice",
  "requiresRealRestore",
  "requiresSyntheticData",
  "destructiveSideEffect",
  "connectivityRequirement",
  "platformClasses",
  "blockingStatus",
  "permanentBlockers",
  "timeoutMs",
  "resourceBounds",
  "retryPolicy",
  "flakePolicy",
  "expectedOutcome",
  "resultSchema",
  "provenanceRequirements",
  "candidateBindingRequirements",
  "manifestInclusion",
  "residualRisk",
  "ownerDecisionRequired",
  "reopeningTriggers",
] as const;

const isSafeStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string" && entry.length <= ALPHA0_BOUNDS.MAX_STRING_LENGTH);

export const validateAlpha0Record = (value: unknown): Readonly<{ valid: boolean; reasonCodes: readonly string[] }> => {
  const snapshot = inspectRecordSnapshot(value, requiredRecordKeys as readonly string[]);
  if (!snapshot.valid) {
    return Object.freeze({ valid: false, reasonCodes: Object.freeze(["ALPHA0_RECORD_INVALID", ...(snapshot.reasonCodes ?? [])]) });
  }
  const record = snapshot.snapshot as Record<string, unknown>;
  const reasons: string[] = [];

  if (value === null || typeof value !== "object" || value === undefined) reasons.push("ALPHA0_RECORD_INVALID");
  else {
    try {
      const prototype = Object.getPrototypeOf(value);
      if (prototype !== Object.prototype) {
        reasons.push("ALPHA0_RECORD_INVALID");
        reasons.push("ALPHA0_PROTOTYPE_INVALID");
      }
    } catch {
      reasons.push("ALPHA0_RECORD_INVALID");
      reasons.push("ALPHA0_PROTOTYPE_INVALID");
    }
  }

  if (typeof record.id !== "string" || !/^ALPHA0[-A-Z0-9]+-\d+$/.test(record.id)) reasons.push("ALPHA0_RECORD_INVALID");
  if (typeof record.family !== "string" || record.family.length === 0) reasons.push("ALPHA0_FAMILY_INVALID");
  if (!ALPHA0_LANES.includes(record.lane as Alpha0Lane)) reasons.push("ALPHA0_LANE_INVALID");
  if (!ALPHA0_RISK_TIERS.includes(record.riskTier as Alpha0RiskTier)) reasons.push("ALPHA0_RISK_TIER_INVALID");
  if (!Array.isArray(record.profiles) || record.profiles.length === 0 || record.profiles.length > ALPHA0_BOUNDS.MAX_PROFILES) reasons.push("ALPHA0_PROFILES_INVALID");
  else if (!((record.profiles as unknown[]) as readonly unknown[]).every((item) => ALPHA0_PROFILES.includes(item as Alpha0Profile))) reasons.push("ALPHA0_PROFILE_VALUES_INVALID");
  if (typeof record.invariant !== "string" || record.invariant.length === 0 || record.invariant.length > ALPHA0_BOUNDS.MAX_STRING_LENGTH) reasons.push("ALPHA0_INVARIANT_INVALID");
  if (typeof record.rationale !== "string" || record.rationale.length === 0 || record.rationale.length > ALPHA0_BOUNDS.MAX_STRING_LENGTH) reasons.push("ALPHA0_RATIONALE_INVALID");
  if (!isSafeStringArray(record.predecessorDependencies)) reasons.push("ALPHA0_PREDECESSOR_DEPENDENCIES_INVALID");
  if (typeof record.target !== "string" || record.target.length === 0 || record.target.length > ALPHA0_BOUNDS.MAX_STRING_LENGTH) reasons.push("ALPHA0_TARGET_INVALID");
  if (!ALPHA0_TEST_METHODS.includes(record.method as Alpha0TestMethod)) reasons.push("ALPHA0_METHOD_INVALID");
  if (typeof record.executionAdapter !== "string" || record.executionAdapter.length === 0 || record.executionAdapter.length > ALPHA0_BOUNDS.MAX_STRING_LENGTH) reasons.push("ALPHA0_EXECUTION_ADAPTER_INVALID");
  if (!isSafeStringArray(record.selectionTags)) reasons.push("ALPHA0_SELECTION_TAGS_INVALID");
  if (!isSafeStringArray(record.prerequisiteIds)) reasons.push("ALPHA0_PREREQUISITE_IDS_INVALID");
  if (!isSafeStringArray(record.dependentIds)) reasons.push("ALPHA0_DEPENDENT_IDS_INVALID");
  if (!Array.isArray(record.evidenceClasses) || record.evidenceClasses.length === 0) reasons.push("ALPHA0_EVIDENCE_CLASSES_INVALID");
  else if (!((record.evidenceClasses as unknown[]) as readonly unknown[]).every((item) => ALPHA0_EVIDENCE_CLASSES.includes(item as Alpha0EvidenceClass))) reasons.push("ALPHA0_EVIDENCE_CLASS_VALUES_INVALID");
  if (typeof record.freshnessPolicy !== "string" || record.freshnessPolicy.length === 0) reasons.push("ALPHA0_FRESHNESS_POLICY_INVALID");
  if (!isSafeStringArray(record.invalidationTriggers)) reasons.push("ALPHA0_INVALIDATION_TRIGGERS_INVALID");
  if (typeof record.requiresPhysicalDevice !== "boolean") reasons.push("ALPHA0_REQUIRES_PHYSICAL_DEVICE_INVALID");
  if (typeof record.requiresRealRestore !== "boolean") reasons.push("ALPHA0_REQUIRES_REAL_RESTORE_INVALID");
  if (typeof record.requiresSyntheticData !== "boolean") reasons.push("ALPHA0_REQUIRES_SYNTHETIC_DATA_INVALID");
  if (typeof record.destructiveSideEffect !== "string" || record.destructiveSideEffect.length > ALPHA0_BOUNDS.MAX_STRING_LENGTH) reasons.push("ALPHA0_DESTRUCTIVE_SIDE_EFFECT_INVALID");
  if (typeof record.connectivityRequirement !== "string") reasons.push("ALPHA0_CONNECTIVITY_REQUIREMENT_INVALID");
  if (!isSafeStringArray(record.platformClasses)) reasons.push("ALPHA0_PLATFORM_CLASSES_INVALID");
  if (typeof record.blockingStatus !== "string" || record.blockingStatus.length === 0) reasons.push("ALPHA0_BLOCKING_STATUS_INVALID");
  if (!isSafeStringArray(record.permanentBlockers as any)) reasons.push("ALPHA0_PERMANENT_BLOCKERS_INVALID");
  if (typeof record.timeoutMs !== "number" || !Number.isFinite(record.timeoutMs) || record.timeoutMs <= 0 || record.timeoutMs > 3600000) reasons.push("ALPHA0_TIMEOUT_INVALID");
  if (!isSafeStringArray(record.resourceBounds)) reasons.push("ALPHA0_RESOURCE_BOUNDS_INVALID");
  if (typeof record.retryPolicy !== "string") reasons.push("ALPHA0_RETRY_POLICY_INVALID");
  if (typeof record.flakePolicy !== "string") reasons.push("ALPHA0_FLAKE_POLICY_INVALID");
  if (typeof record.expectedOutcome !== "string" || record.expectedOutcome.length === 0) reasons.push("ALPHA0_EXPECTED_OUTCOME_INVALID");
  if (typeof record.resultSchema !== "string" || record.resultSchema.length === 0) reasons.push("ALPHA0_RESULT_SCHEMA_INVALID");
  if (!isSafeStringArray(record.provenanceRequirements)) reasons.push("ALPHA0_PROVENANCE_REQUIREMENTS_INVALID");
  if (!isSafeStringArray(record.candidateBindingRequirements)) reasons.push("ALPHA0_CANDIDATE_BINDING_REQUIREMENTS_INVALID");
  if (typeof record.manifestInclusion !== "string") reasons.push("ALPHA0_MANIFEST_INCLUSION_INVALID");
  if (typeof record.residualRisk !== "string") reasons.push("ALPHA0_RESIDUAL_RISK_INVALID");
  if (typeof record.ownerDecisionRequired !== "boolean") reasons.push("ALPHA0_OWNER_DECISION_REQUIRED_INVALID");
  if (!isSafeStringArray(record.reopeningTriggers)) reasons.push("ALPHA0_REOPENING_TRIGGERS_INVALID");

  return Object.freeze({ valid: reasons.length === 0, reasonCodes: Object.freeze(reasons.length === 0 ? [] : reasons) });
};
