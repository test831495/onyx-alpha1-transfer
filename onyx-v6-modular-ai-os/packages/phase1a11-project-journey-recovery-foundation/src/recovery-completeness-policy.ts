import { boundedFreeze } from "./capture-policy";
import type {
  RecoveryCompletenessAssessment,
  RecoveryCompletenessAssessmentInput,
  RecoveryCompletenessAssessmentState,
  RecoveryCompletenessGap,
  RecoveryCompletenessGapReason,
  RecoveryCryptoMigrationClass,
  RecoveryCryptoMigrationEvidence,
  RecoveryDeviceLifecycleEvidence,
  RecoveryDeviceLifecycleEvidenceClass,
  RecoveryEvidencePrecedenceResult,
  RecoveryEvidencePresence,
  RecoveryPortabilityEvidence,
  RecoveryPortabilityEvidenceClass,
  RecoveryProhibitedContentClass,
  RecoveryProhibitedContentDescriptor,
  RecoveryRestorationDependency,
  RecoveryRestorationStage,
} from "./model";

export type RecoveryCompletenessValidationState = "VALID" | "INVALID" | "MISSING" | "PROHIBITED" | "NOT_ASSESSABLE";

export interface RecoveryCompletenessValidationResult {
  readonly state: RecoveryCompletenessValidationState;
  readonly createsAuthority: false;
  readonly reasons: readonly string[];
  readonly value?: Readonly<Record<string, unknown>>;
}

export const MAX_RECOVERY_COMPLETENESS_GAPS = 32;
export const MAX_RESTORATION_DEPENDENCIES = 32;
export const MAX_EVIDENCE_REFERENCES = 64;
export const MAX_BLOCKED_BY_REFERENCES = 64;
export const MAX_PROHIBITED_CONTENT_FINDINGS = 32;

export const RECOVERY_COMPLETENESS_GAP_REASONS = boundedFreeze([
  "REQUIRED_EVIDENCE_MISSING",
  "REQUIRED_EVIDENCE_STALE",
  "REQUIRED_EVIDENCE_PROHIBITED",
  "DEVICE_KEY_ROTATION_EVIDENCE_MISSING",
  "REMOTE_ERASURE_ACK_MISSING",
  "BIOMETRIC_DELETION_EVIDENCE_MISSING",
  "SYNC_INTEGRITY_EVIDENCE_MISSING",
  "DELETION_TOMBSTONE_EVIDENCE_MISSING",
  "TRUSTED_TIME_EVIDENCE_MISSING",
  "APPLICATION_INTEGRITY_EVIDENCE_MISSING",
  "REVOCATION_EVIDENCE_MISSING",
  "RESTORATION_DEPENDENCY_UNRESOLVED",
  "PORTABILITY_EVIDENCE_MISSING",
  "CRYPTOGRAPHIC_MIGRATION_EVIDENCE_MISSING",
  "EVIDENCE_NOT_ASSESSABLE",
] as const satisfies readonly RecoveryCompletenessGapReason[]);

export const RECOVERY_RESTORATION_STAGES = boundedFreeze([
  "TRUST_ANCHORS_AND_CRYPTO_POLICY",
  "HOUSEHOLD_IDENTITIES_AND_MEMBERSHIPS",
  "REVOCATIONS_AND_INCIDENTS",
  "ROLES_AND_CURRENT_AUTHORIZATION_POLICIES",
  "DEVICE_REGISTRY_AND_SUPPORTED_CLIENT_POLICY",
  "SESSIONS_INVALIDATED_HISTORY_ONLY",
  "APPROVAL_AND_CONSUMPTION_STATE",
  "DELETION_TOMBSTONES",
  "MEMORY_AND_SYNCHRONIZATION_METADATA",
  "CONNECTORS_OPTIONAL_RUNTIME_SERVICES_LAST",
] as const satisfies readonly RecoveryRestorationStage[]);

export const RECOVERY_PROHIBITED_CONTENT_CLASSES = boundedFreeze([
  "PASSWORDS",
  "PINS",
  "PASSKEYS",
  "SESSION_AND_APPROVAL_TOKENS",
  "OAUTH_CREDENTIALS",
  "CONNECTOR_AND_API_SECRETS",
  "DEVICE_PRIVATE_KEYS",
  "RAW_BIOMETRIC_DATA_OR_TEMPLATES",
  "RAW_CAMERA_FOOTAGE",
  "DECRYPTED_CACHES",
  "SENSITIVE_NOTIFICATION_CONTENT",
  "UNRESTRICTED_PRIVATE_PROMPTS",
  "RAW_HOUSEHOLD_PRIVATE_PAYLOADS",
] as const satisfies readonly RecoveryProhibitedContentClass[]);

export const RECOVERY_PORTABILITY_EVIDENCE_CLASSES = boundedFreeze([
  "PROVIDER_EXIT_READINESS",
  "FORMAT_COMPATIBILITY",
  "SOURCE_PROVENANCE",
  "TARGET_COMPATIBILITY",
] as const satisfies readonly RecoveryPortabilityEvidenceClass[]);

export const RECOVERY_CRYPTO_MIGRATION_CLASSES = boundedFreeze([
  "POLICY_TRANSITION",
  "ALGORITHM_CLASS_TRANSITION",
  "KEY_LIFECYCLE_TRANSITION_EVIDENCE",
  "COMPATIBILITY_EVIDENCE",
] as const satisfies readonly RecoveryCryptoMigrationClass[]);

export const RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASSES = boundedFreeze([
  "TERMINAL_DECOMMISSIONING",
  "DEVICE_REVOCATION",
  "DEVICE_KEY_ROTATION",
  "REPLACEMENT_DEVICE_NEW_KEY",
  "REMOTE_ERASURE_ACKNOWLEDGEMENT",
  "BIOMETRIC_DELETION",
  "APPLICATION_INTEGRITY",
  "SYNC_INTEGRITY",
  "DELETION_TOMBSTONE",
] as const satisfies readonly RecoveryDeviceLifecycleEvidenceClass[]);

export const RECOVERY_COMPLETENESS_ASSESSMENT_STATES = boundedFreeze([
  "COMPLETE_FOR_METADATA_SCOPE",
  "INCOMPLETE_VISIBLE_GAPS",
  "NOT_ASSESSABLE",
  "REJECTED_PROHIBITED_CONTENT",
] as const satisfies readonly RecoveryCompletenessAssessmentState[]);

export const RECOVERY_EVIDENCE_PRECEDENCE_RESULTS = boundedFreeze([
  "NO_OVERRIDE_REQUIRED",
  "TOMBSTONE_PRECEDENCE_APPLIED",
  "REVOCATION_PRECEDENCE_APPLIED",
  "TOMBSTONE_AND_REVOCATION_PRECEDENCE_APPLIED",
] as const satisfies readonly RecoveryEvidencePrecedenceResult[]);

const RECOVERY_EVIDENCE_PRESENCE_STATES = boundedFreeze([
  "PRESENT",
  "MISSING",
  "STALE",
  "CONFLICTED",
  "PROHIBITED",
  "NOT_ASSESSABLE",
] as const satisfies readonly RecoveryEvidencePresence[]);

const opaqueReferencePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const isOpaqueIdentifierOrReference = (value: unknown): value is string =>
  typeof value === "string" && opaqueReferencePattern.test(value);
const isSafeOpaqueIdentifierOrReference = (value: unknown): value is string =>
  isOpaqueIdentifierOrReference(value) && !/^(?:command|execute|restore)(?:[-_.]|$)/i.test(value);
const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === "string" && values.includes(value as T);
const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean =>
  Reflect.ownKeys(value).every((key) => typeof key === "string" && allowed.includes(key));
const hasDenseIndexesOnly = (array: readonly unknown[]): boolean => {
  const names = Object.getOwnPropertyNames(array);
  if (!names.every((name) => name === "length" || (Number.isInteger(Number(name)) && Number(name) >= 0 && Number(name) < array.length))) return false;
  return names.filter((name) => name !== "length").length === array.length;
};
const validateBase = (value: unknown, required: readonly string[], allowed: readonly string[]): string[] => {
  if (!isPlainRecord(value)) return ["value must be a plain record"];
  if (!hasOnlyKeys(value, allowed)) return ["value contains an unsupported property"];
  const reasons = required.filter((field) => !isSafeOpaqueIdentifierOrReference(value[field]) && field !== "createsAuthority").map((field) => `${field} is required`);
  if (value.createsAuthority !== false) reasons.push("createsAuthority must be false");
  return reasons;
};
const result = (
  state: RecoveryCompletenessValidationState,
  reasons: readonly string[],
  value?: Readonly<Record<string, unknown>>,
): RecoveryCompletenessValidationResult =>
  boundedFreeze({ state, createsAuthority: false, reasons: [...reasons], ...(value === undefined ? {} : { value }) });

const copyRecord = (value: Record<string, unknown>): Readonly<Record<string, unknown>> => boundedFreeze({ ...value });
const hasDuplicates = (values: readonly string[]): boolean => new Set(values).size !== values.length;

const stageOrder: Readonly<Record<RecoveryRestorationStage, number>> = boundedFreeze(
  Object.fromEntries(RECOVERY_RESTORATION_STAGES.map((stage, index) => [stage, index])) as Record<RecoveryRestorationStage, number>,
);

const gapKeys = ["requirementId", "reason", "evidenceReference", "createsAuthority"] as const;
const dependencyKeys = ["stage", "dependsOnStage", "unresolvedGapReason", "createsAuthority"] as const;
const prohibitedKeys = ["findingId", "contentClass", "disposition", "evidenceReference", "createsAuthority"] as const;
const portabilityKeys = ["evidenceId", "evidenceClass", "presence", "policyVersion", "providerNeutralReference", "createsAuthority"] as const;
const cryptoKeys = ["evidenceId", "migrationClass", "presence", "policyVersion", "evidenceReference", "createsAuthority"] as const;
const deviceKeys = ["evidenceId", "lifecycleClass", "presence", "policyVersion", "evidenceReference", "createsAuthority"] as const;
const assessmentInputKeys = [
  "gaps",
  "restorationDependencies",
  "prohibitedContentFindings",
  "portabilityEvidence",
  "cryptoMigrationEvidence",
  "deviceLifecycleEvidence",
  "tombstoneReferences",
  "revocationReferences",
  "blockedByReferences",
  "policyVersion",
  "createsAuthority",
] as const;

export const validateRecoveryCompletenessGap = (value: RecoveryCompletenessGap): RecoveryCompletenessValidationResult => {
  const input = value as unknown;
  const reasons = validateBase(input, ["requirementId", "reason"], gapKeys);
  if (!isPlainRecord(input)) return result("INVALID", reasons);
  if (!isSafeOpaqueIdentifierOrReference(input.requirementId)) reasons.push("requirementId must be an opaque identifier");
  if (!isOneOf(RECOVERY_COMPLETENESS_GAP_REASONS, input.reason)) reasons.push("reason is unsupported");
  if (input.evidenceReference !== undefined && !isSafeOpaqueIdentifierOrReference(input.evidenceReference)) reasons.push("evidenceReference must be an opaque identifier");
  return result(reasons.length === 0 ? "VALID" : "INVALID", reasons, reasons.length === 0 ? copyRecord(input) : undefined);
};

export const validateRecoveryRestorationDependency = (value: RecoveryRestorationDependency): RecoveryCompletenessValidationResult => {
  const input = value as unknown;
  const reasons = validateBase(input, ["stage", "dependsOnStage", "unresolvedGapReason"], dependencyKeys);
  if (!isPlainRecord(input)) return result("INVALID", reasons);
  if (!isOneOf(RECOVERY_RESTORATION_STAGES, input.stage)) reasons.push("stage is unsupported");
  if (!isOneOf(RECOVERY_RESTORATION_STAGES, input.dependsOnStage)) reasons.push("dependsOnStage is unsupported");
  if (input.unresolvedGapReason !== "RESTORATION_DEPENDENCY_UNRESOLVED") reasons.push("unresolvedGapReason must be RESTORATION_DEPENDENCY_UNRESOLVED");
  if (isOneOf(RECOVERY_RESTORATION_STAGES, input.stage) && isOneOf(RECOVERY_RESTORATION_STAGES, input.dependsOnStage)) {
    const stageIndex = stageOrder[input.stage];
    const dependencyIndex = stageOrder[input.dependsOnStage];
    if (stageIndex === dependencyIndex) reasons.push("restoration dependency cannot reference the same stage");
    if (dependencyIndex > stageIndex) reasons.push("restoration dependencies must only target earlier stages");
  }
  return result(reasons.length === 0 ? "VALID" : "INVALID", reasons, reasons.length === 0 ? copyRecord(input) : undefined);
};

export const validateRecoveryProhibitedContentDescriptor = (value: RecoveryProhibitedContentDescriptor): RecoveryCompletenessValidationResult => {
  const input = value as unknown;
  const reasons = validateBase(input, ["findingId", "contentClass", "disposition"], prohibitedKeys);
  if (!isPlainRecord(input)) return result("INVALID", reasons);
  if (!isSafeOpaqueIdentifierOrReference(input.findingId)) reasons.push("findingId must be an opaque identifier");
  if (!isOneOf(RECOVERY_PROHIBITED_CONTENT_CLASSES, input.contentClass)) reasons.push("contentClass is unsupported");
  if (input.disposition !== "PROHIBITED") reasons.push("disposition must be PROHIBITED");
  if (input.evidenceReference !== undefined && !isSafeOpaqueIdentifierOrReference(input.evidenceReference)) reasons.push("evidenceReference must be an opaque identifier");
  return result(reasons.length === 0 ? "VALID" : "INVALID", reasons, reasons.length === 0 ? copyRecord(input) : undefined);
};

export const validateRecoveryPortabilityEvidence = (value: RecoveryPortabilityEvidence): RecoveryCompletenessValidationResult => {
  const input = value as unknown;
  const reasons = validateBase(input, ["evidenceId", "evidenceClass", "presence", "policyVersion", "providerNeutralReference"], portabilityKeys);
  if (!isPlainRecord(input)) return result("INVALID", reasons);
  if (!isSafeOpaqueIdentifierOrReference(input.evidenceId)) reasons.push("evidenceId must be an opaque identifier");
  if (!isOneOf(RECOVERY_PORTABILITY_EVIDENCE_CLASSES, input.evidenceClass)) reasons.push("evidenceClass is unsupported");
  if (!isOneOf(RECOVERY_EVIDENCE_PRESENCE_STATES, input.presence)) reasons.push("presence is unsupported");
  if (!isSafeOpaqueIdentifierOrReference(input.policyVersion)) reasons.push("policyVersion must be an opaque identifier");
  if (!isSafeOpaqueIdentifierOrReference(input.providerNeutralReference)) reasons.push("providerNeutralReference must be an opaque identifier");
  return result(reasons.length === 0 ? "VALID" : "INVALID", reasons, reasons.length === 0 ? copyRecord(input) : undefined);
};

export const validateRecoveryCryptoMigrationEvidence = (value: RecoveryCryptoMigrationEvidence): RecoveryCompletenessValidationResult => {
  const input = value as unknown;
  const reasons = validateBase(input, ["evidenceId", "migrationClass", "presence", "policyVersion", "evidenceReference"], cryptoKeys);
  if (!isPlainRecord(input)) return result("INVALID", reasons);
  if (!isSafeOpaqueIdentifierOrReference(input.evidenceId)) reasons.push("evidenceId must be an opaque identifier");
  if (!isOneOf(RECOVERY_CRYPTO_MIGRATION_CLASSES, input.migrationClass)) reasons.push("migrationClass is unsupported");
  if (!isOneOf(RECOVERY_EVIDENCE_PRESENCE_STATES, input.presence)) reasons.push("presence is unsupported");
  if (!isSafeOpaqueIdentifierOrReference(input.policyVersion)) reasons.push("policyVersion must be an opaque identifier");
  if (!isSafeOpaqueIdentifierOrReference(input.evidenceReference)) reasons.push("evidenceReference must be an opaque identifier");
  return result(reasons.length === 0 ? "VALID" : "INVALID", reasons, reasons.length === 0 ? copyRecord(input) : undefined);
};

export const validateRecoveryDeviceLifecycleEvidence = (value: RecoveryDeviceLifecycleEvidence): RecoveryCompletenessValidationResult => {
  const input = value as unknown;
  const reasons = validateBase(input, ["evidenceId", "lifecycleClass", "presence", "policyVersion", "evidenceReference"], deviceKeys);
  if (!isPlainRecord(input)) return result("INVALID", reasons);
  if (!isSafeOpaqueIdentifierOrReference(input.evidenceId)) reasons.push("evidenceId must be an opaque identifier");
  if (!isOneOf(RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASSES, input.lifecycleClass)) reasons.push("lifecycleClass is unsupported");
  if (!isOneOf(RECOVERY_EVIDENCE_PRESENCE_STATES, input.presence)) reasons.push("presence is unsupported");
  if (!isSafeOpaqueIdentifierOrReference(input.policyVersion)) reasons.push("policyVersion must be an opaque identifier");
  if (!isSafeOpaqueIdentifierOrReference(input.evidenceReference)) reasons.push("evidenceReference must be an opaque identifier");
  return result(reasons.length === 0 ? "VALID" : "INVALID", reasons, reasons.length === 0 ? copyRecord(input) : undefined);
};

const hasCycle = (dependencies: readonly RecoveryRestorationDependency[]): boolean => {
  const graph = new Map<RecoveryRestorationStage, RecoveryRestorationStage[]>();
  for (const stage of RECOVERY_RESTORATION_STAGES) graph.set(stage, []);
  for (const dependency of dependencies) {
    graph.get(dependency.stage)?.push(dependency.dependsOnStage);
  }

  const visiting = new Set<RecoveryRestorationStage>();
  const visited = new Set<RecoveryRestorationStage>();
  const visit = (stage: RecoveryRestorationStage): boolean => {
    if (visiting.has(stage)) return true;
    if (visited.has(stage)) return false;
    visiting.add(stage);
    for (const dependency of graph.get(stage) ?? []) {
      if (visit(dependency)) return true;
    }
    visiting.delete(stage);
    visited.add(stage);
    return false;
  };

  return RECOVERY_RESTORATION_STAGES.some((stage) => visit(stage));
};

const copyGapArray = (values: readonly RecoveryCompletenessGap[]): readonly RecoveryCompletenessGap[] =>
  boundedFreeze(values.map((value) => boundedFreeze({ ...value })));
const copyDependencyArray = (values: readonly RecoveryRestorationDependency[]): readonly RecoveryRestorationDependency[] =>
  boundedFreeze(values.map((value) => boundedFreeze({ ...value })));
const copyProhibitedArray = (values: readonly RecoveryProhibitedContentDescriptor[]): readonly RecoveryProhibitedContentDescriptor[] =>
  boundedFreeze(values.map((value) => boundedFreeze({ ...value })));
const copyPortabilityArray = (values: readonly RecoveryPortabilityEvidence[]): readonly RecoveryPortabilityEvidence[] =>
  boundedFreeze(values.map((value) => boundedFreeze({ ...value })));
const copyCryptoArray = (values: readonly RecoveryCryptoMigrationEvidence[]): readonly RecoveryCryptoMigrationEvidence[] =>
  boundedFreeze(values.map((value) => boundedFreeze({ ...value })));
const copyDeviceArray = (values: readonly RecoveryDeviceLifecycleEvidence[]): readonly RecoveryDeviceLifecycleEvidence[] =>
  boundedFreeze(values.map((value) => boundedFreeze({ ...value })));

const copyStringArray = (values: readonly string[]): readonly string[] => boundedFreeze([...values]);

export const validateRecoveryCompletenessAssessmentInput = (
  value: RecoveryCompletenessAssessmentInput,
): RecoveryCompletenessValidationResult => {
  const input = value as unknown;
  const reasons = validateBase(input, ["policyVersion"], assessmentInputKeys);
  if (!isPlainRecord(input)) return result("INVALID", reasons);

  if (!isSafeOpaqueIdentifierOrReference(input.policyVersion)) reasons.push("policyVersion must be an opaque identifier");

  const gaps = input.gaps;
  if (!Array.isArray(gaps) || !hasDenseIndexesOnly(gaps)) reasons.push("gaps must be a dense array");
  else {
    if (gaps.length > MAX_RECOVERY_COMPLETENESS_GAPS) reasons.push("gaps exceed maximum bound");
    for (const gap of gaps) {
      const validated = validateRecoveryCompletenessGap(gap as RecoveryCompletenessGap);
      if (validated.state !== "VALID") reasons.push("gaps contain an invalid item");
    }
    const keys = gaps.map((gap) => {
      const item = gap as RecoveryCompletenessGap;
      return `${item.requirementId}|${item.reason}|${item.evidenceReference ?? ""}`;
    });
    if (hasDuplicates(keys)) reasons.push("gaps contain duplicates");
  }

  const dependencies = input.restorationDependencies;
  if (!Array.isArray(dependencies) || !hasDenseIndexesOnly(dependencies)) reasons.push("restorationDependencies must be a dense array");
  else {
    if (dependencies.length > MAX_RESTORATION_DEPENDENCIES) reasons.push("restorationDependencies exceed maximum bound");
    for (const dependency of dependencies) {
      const validated = validateRecoveryRestorationDependency(dependency as RecoveryRestorationDependency);
      if (validated.state !== "VALID") reasons.push("restorationDependencies contain an invalid item");
    }
    const keys = dependencies.map((dependency) => {
      const item = dependency as RecoveryRestorationDependency;
      return `${item.stage}|${item.dependsOnStage}`;
    });
    if (hasDuplicates(keys)) reasons.push("restorationDependencies contain duplicates");
    if (hasCycle(dependencies as RecoveryRestorationDependency[])) reasons.push("restorationDependencies contain a cycle");
  }

  const prohibitedFindings = input.prohibitedContentFindings;
  if (!Array.isArray(prohibitedFindings) || !hasDenseIndexesOnly(prohibitedFindings)) reasons.push("prohibitedContentFindings must be a dense array");
  else {
    if (prohibitedFindings.length > MAX_PROHIBITED_CONTENT_FINDINGS) reasons.push("prohibitedContentFindings exceed maximum bound");
    for (const finding of prohibitedFindings) {
      const validated = validateRecoveryProhibitedContentDescriptor(finding as RecoveryProhibitedContentDescriptor);
      if (validated.state !== "VALID") reasons.push("prohibitedContentFindings contain an invalid item");
    }
    const ids = prohibitedFindings.map((finding) => (finding as RecoveryProhibitedContentDescriptor).findingId);
    if (ids.some((id) => !isSafeOpaqueIdentifierOrReference(id))) reasons.push("prohibitedContentFindings include an invalid findingId");
    if (hasDuplicates(ids)) reasons.push("prohibitedContentFindings include duplicate findingId values");
  }

  const portabilityEvidence = input.portabilityEvidence;
  if (!Array.isArray(portabilityEvidence) || !hasDenseIndexesOnly(portabilityEvidence)) reasons.push("portabilityEvidence must be a dense array");
  else {
    if (portabilityEvidence.length > MAX_EVIDENCE_REFERENCES) reasons.push("portabilityEvidence exceed maximum bound");
    for (const item of portabilityEvidence) {
      const validated = validateRecoveryPortabilityEvidence(item as RecoveryPortabilityEvidence);
      if (validated.state !== "VALID") reasons.push("portabilityEvidence contains an invalid item");
    }
    const ids = portabilityEvidence.map((item) => (item as RecoveryPortabilityEvidence).evidenceId);
    if (hasDuplicates(ids)) reasons.push("portabilityEvidence include duplicate evidenceId values");
  }

  const cryptoEvidence = input.cryptoMigrationEvidence;
  if (!Array.isArray(cryptoEvidence) || !hasDenseIndexesOnly(cryptoEvidence)) reasons.push("cryptoMigrationEvidence must be a dense array");
  else {
    if (cryptoEvidence.length > MAX_EVIDENCE_REFERENCES) reasons.push("cryptoMigrationEvidence exceed maximum bound");
    for (const item of cryptoEvidence) {
      const validated = validateRecoveryCryptoMigrationEvidence(item as RecoveryCryptoMigrationEvidence);
      if (validated.state !== "VALID") reasons.push("cryptoMigrationEvidence contains an invalid item");
    }
    const ids = cryptoEvidence.map((item) => (item as RecoveryCryptoMigrationEvidence).evidenceId);
    if (hasDuplicates(ids)) reasons.push("cryptoMigrationEvidence include duplicate evidenceId values");
  }

  const deviceEvidence = input.deviceLifecycleEvidence;
  if (!Array.isArray(deviceEvidence) || !hasDenseIndexesOnly(deviceEvidence)) reasons.push("deviceLifecycleEvidence must be a dense array");
  else {
    if (deviceEvidence.length > MAX_EVIDENCE_REFERENCES) reasons.push("deviceLifecycleEvidence exceed maximum bound");
    for (const item of deviceEvidence) {
      const validated = validateRecoveryDeviceLifecycleEvidence(item as RecoveryDeviceLifecycleEvidence);
      if (validated.state !== "VALID") reasons.push("deviceLifecycleEvidence contains an invalid item");
    }
    const ids = deviceEvidence.map((item) => (item as RecoveryDeviceLifecycleEvidence).evidenceId);
    if (hasDuplicates(ids)) reasons.push("deviceLifecycleEvidence include duplicate evidenceId values");
  }

  const validateOpaqueStringArray = (
    field: string,
    values: unknown,
    maximum: number,
  ): values is readonly string[] => {
    if (!Array.isArray(values) || !hasDenseIndexesOnly(values)) {
      reasons.push(`${field} must be a dense array`);
      return false;
    }
    if (values.length > maximum) reasons.push(`${field} exceed maximum bound`);
    const strings = values as unknown[];
    if (strings.some((item) => !isSafeOpaqueIdentifierOrReference(item))) reasons.push(`${field} contain invalid opaque identifiers`);
    if (hasDuplicates(strings.filter((item): item is string => typeof item === "string"))) reasons.push(`${field} contain duplicates`);
    return true;
  };

  validateOpaqueStringArray("tombstoneReferences", input.tombstoneReferences, MAX_EVIDENCE_REFERENCES);
  validateOpaqueStringArray("revocationReferences", input.revocationReferences, MAX_EVIDENCE_REFERENCES);
  validateOpaqueStringArray("blockedByReferences", input.blockedByReferences, MAX_BLOCKED_BY_REFERENCES);

  if (reasons.length > 0) return result("INVALID", reasons);

  const copied = boundedFreeze({
    gaps: copyGapArray(input.gaps as RecoveryCompletenessGap[]),
    restorationDependencies: copyDependencyArray(input.restorationDependencies as RecoveryRestorationDependency[]),
    prohibitedContentFindings: copyProhibitedArray(input.prohibitedContentFindings as RecoveryProhibitedContentDescriptor[]),
    portabilityEvidence: copyPortabilityArray(input.portabilityEvidence as RecoveryPortabilityEvidence[]),
    cryptoMigrationEvidence: copyCryptoArray(input.cryptoMigrationEvidence as RecoveryCryptoMigrationEvidence[]),
    deviceLifecycleEvidence: copyDeviceArray(input.deviceLifecycleEvidence as RecoveryDeviceLifecycleEvidence[]),
    tombstoneReferences: copyStringArray(input.tombstoneReferences as string[]),
    revocationReferences: copyStringArray(input.revocationReferences as string[]),
    blockedByReferences: copyStringArray(input.blockedByReferences as string[]),
    policyVersion: input.policyVersion,
    createsAuthority: false as const,
  });

  return result("VALID", [], copied);
};

const precedenceResult = (
  tombstoneReferences: readonly string[],
  revocationReferences: readonly string[],
): RecoveryEvidencePrecedenceResult => {
  if (tombstoneReferences.length > 0 && revocationReferences.length > 0) return "TOMBSTONE_AND_REVOCATION_PRECEDENCE_APPLIED";
  if (tombstoneReferences.length > 0) return "TOMBSTONE_PRECEDENCE_APPLIED";
  if (revocationReferences.length > 0) return "REVOCATION_PRECEDENCE_APPLIED";
  return "NO_OVERRIDE_REQUIRED";
};

export const assessRecoveryCompleteness = (
  input: RecoveryCompletenessAssessmentInput,
): RecoveryCompletenessAssessment => {
  const validated = validateRecoveryCompletenessAssessmentInput(input);
  if (validated.state !== "VALID") {
    return boundedFreeze({
      state: "NOT_ASSESSABLE" as const,
      gaps: boundedFreeze([] as RecoveryCompletenessGap[]),
      blockedByReferences: boundedFreeze([] as string[]),
      prohibitedContentFindingIds: boundedFreeze([] as string[]),
      precedenceResult: precedenceResult([], []),
      policyVersion: isSafeOpaqueIdentifierOrReference(input.policyVersion) ? input.policyVersion : "NOT_ASSESSABLE",
      createsAuthority: false as const,
    });
  }

  const hasProhibitedFindings = input.prohibitedContentFindings.length > 0;
  const hasNotAssessable = input.gaps.some((gap) => gap.reason === "EVIDENCE_NOT_ASSESSABLE") ||
    input.portabilityEvidence.some((evidence) => evidence.presence === "NOT_ASSESSABLE") ||
    input.cryptoMigrationEvidence.some((evidence) => evidence.presence === "NOT_ASSESSABLE") ||
    input.deviceLifecycleEvidence.some((evidence) => evidence.presence === "NOT_ASSESSABLE");
  const hasVisibleGaps =
    input.gaps.length > 0 ||
    input.blockedByReferences.length > 0 ||
    input.restorationDependencies.length > 0 ||
    input.portabilityEvidence.some((evidence) => evidence.presence === "MISSING" || evidence.presence === "STALE" || evidence.presence === "PROHIBITED") ||
    input.cryptoMigrationEvidence.some((evidence) => evidence.presence === "MISSING" || evidence.presence === "STALE" || evidence.presence === "PROHIBITED") ||
    input.deviceLifecycleEvidence.some((evidence) => evidence.presence === "MISSING" || evidence.presence === "STALE" || evidence.presence === "PROHIBITED");

  const state: RecoveryCompletenessAssessmentState =
    hasProhibitedFindings
      ? "REJECTED_PROHIBITED_CONTENT"
      : hasNotAssessable
        ? "NOT_ASSESSABLE"
        : hasVisibleGaps
          ? "INCOMPLETE_VISIBLE_GAPS"
          : "COMPLETE_FOR_METADATA_SCOPE";

  return boundedFreeze({
    state,
    gaps: copyGapArray(input.gaps),
    blockedByReferences: copyStringArray(input.blockedByReferences),
    prohibitedContentFindingIds: copyStringArray(input.prohibitedContentFindings.map((finding) => finding.findingId)),
    precedenceResult: precedenceResult(input.tombstoneReferences, input.revocationReferences),
    policyVersion: input.policyVersion,
    createsAuthority: false as const,
  });
};
