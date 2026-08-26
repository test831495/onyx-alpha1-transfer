import { boundedFreeze } from "./journey-events";
import type {
  ContinuitySensitivityClass,
  RecoveryArtifactClass,
  RecoveryArtifactReference,
  RecoveryEvidenceExpectation,
  RecoveryEvidencePresence,
  RecoveryEvidenceReference,
  RecoveryMetadataDescriptor,
  RecoveryMetadataKind,
  RecoveryValidationDescriptor,
} from "./model";

export type RecoveryMetadataValidationState = "VALID" | "INVALID" | "MISSING" | "PROHIBITED" | "NOT_ASSESSABLE";

export interface RecoveryMetadataValidationResult {
  readonly state: RecoveryMetadataValidationState;
  readonly createsAuthority: false;
  readonly reasons: readonly string[];
  readonly value?: Readonly<Record<string, unknown>>;
}

const METADATA_KINDS: readonly RecoveryMetadataKind[] = boundedFreeze([
  "RECOVERY_DESCRIPTOR", "ARTIFACT_REFERENCE", "EVIDENCE_REFERENCE", "VALIDATION_DESCRIPTOR",
]);
const ARTIFACT_CLASSES: readonly RecoveryArtifactClass[] = boundedFreeze([
  "JOURNEY_RECORD_SET", "POLICY_METADATA_SET", "IDENTITY_METADATA_SET", "REVOCATION_METADATA_SET",
  "DEVICE_REGISTRY_METADATA_SET", "TOMBSTONE_METADATA_SET", "MEMORY_SYNC_METADATA_SET", "CONNECTOR_METADATA_SET",
]);
const PRESENCE_STATES: readonly RecoveryEvidencePresence[] = boundedFreeze([
  "PRESENT", "MISSING", "STALE", "CONFLICTED", "PROHIBITED", "NOT_ASSESSABLE",
]);
const REQUIREMENTS = ["REQUIRED", "OPTIONAL", "PROHIBITED"] as const;
const SENSITIVITIES = [
  "PUBLIC_PROJECT_METADATA", "HOUSEHOLD_SAFE_METADATA", "OWNER_PRIVATE_PROJECT_HISTORY",
  "SECURITY_SENSITIVE_METADATA", "CREDENTIAL_ADJACENT_METADATA", "PROHIBITED_SECRET_CONTENT",
  "PROHIBITED_PRIVATE_HOUSEHOLD_CONTENT", "PROHIBITED_CAMERA_OR_BIOMETRIC_CONTENT", "UNKNOWN_SENSITIVITY",
] as const;
const hasText = (value: unknown): value is string => typeof value === "string" && value.trim().length > 0;
const opaqueReferencePattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/;
const isOpaqueIdentifierOrReference = (value: unknown): value is string =>
  typeof value === "string" && opaqueReferencePattern.test(value);
const isBoundedSafeText = (value: unknown): value is string => {
  if (typeof value !== "string" || value.length === 0 || value.length > 256 || value !== value.trim()) return false;
  if (/[[\]{}<>`;$|\\]|[\u0000-\u001F\u007F]/.test(value)) return false;
  if (/[?#%]/.test(value) || /(?:^|\b)[A-Za-z][A-Za-z0-9+.-]*:/.test(value)) return false;
  if (/^(?:\.{1,2}\/|\/|[A-Za-z]:[\\/])/.test(value)) return false;
  if (/(?:^|\s)[A-Za-z0-9_.-]+[ \t]*=/.test(value) || /\b[\w.-]+:[^\s]+@/i.test(value)) return false;
  if (/\b(?:command|execute|execution|restore|run)\b/i.test(value)) return false;
  return true;
};
const isOneOf = <T extends string>(values: readonly T[], value: unknown): value is T =>
  typeof value === "string" && values.includes(value as T);
const result = (state: RecoveryMetadataValidationState, reasons: readonly string[], value?: Readonly<Record<string, unknown>>): RecoveryMetadataValidationResult =>
  boundedFreeze({ state, createsAuthority: false, reasons: [...reasons], ...(value === undefined ? {} : { value }) });
const isPlainRecord = (value: unknown): value is Record<string, unknown> => {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
const hasOnlyKeys = (value: Record<string, unknown>, allowed: readonly string[]): boolean =>
  Reflect.ownKeys(value).every((key) => typeof key === "string" && allowed.includes(key));
const validateBase = (value: unknown, required: readonly string[], allowed: readonly string[]): string[] => {
  if (!isPlainRecord(value)) return ["value must be a plain record"];
  if (!hasOnlyKeys(value, allowed)) return ["value contains an unsupported property"];
  const reasons = required.filter((field) => !hasText(value[field])).map((field) => `${field} is required`);
  if (value.createsAuthority !== false) reasons.push("createsAuthority must be false");
  return reasons;
};
const descriptorKeys = ["metadataId", "metadataKind", "classification", "sensitivity", "policyVersion", "sourceReference", "createsAuthority"] as const;
const artifactKeys = ["referenceId", "artifactClass", "providerNeutralReference", "sensitivity", "createsAuthority"] as const;
const evidenceKeys = ["evidenceId", "evidenceType", "provenanceReference", "presence", "sensitivity", "policyVersion", "createsAuthority"] as const;
const validationKeys = ["descriptorId", "purpose", "evidenceExpectations", "missingEvidenceOutcome", "policyVersion", "createsAuthority"] as const;
const expectationKeys = ["evidenceType", "requirement"] as const;
const copyRecord = (value: Record<string, unknown>): Readonly<Record<string, unknown>> =>
  boundedFreeze({ ...value });

export const RECOVERY_METADATA_KINDS = METADATA_KINDS;
export const RECOVERY_ARTIFACT_CLASSES = ARTIFACT_CLASSES;
export const RECOVERY_EVIDENCE_PRESENCE_STATES = PRESENCE_STATES;
export const RECOVERY_EVIDENCE_REQUIREMENTS = boundedFreeze(REQUIREMENTS);

export const validateRecoveryMetadataDescriptor = (value: RecoveryMetadataDescriptor): RecoveryMetadataValidationResult => {
  const input = value as unknown;
  const reasons = validateBase(input, ["metadataId", "classification", "policyVersion"], descriptorKeys);
  if (!isPlainRecord(input)) return result("INVALID", reasons);
  if (!isOpaqueIdentifierOrReference(input.metadataId)) reasons.push("metadataId must be an opaque identifier");
  if (!isOpaqueIdentifierOrReference(input.classification)) reasons.push("classification must be an opaque identifier");
  if (!isOpaqueIdentifierOrReference(input.policyVersion)) reasons.push("policyVersion must be an opaque identifier");
  if (input.sourceReference !== undefined && !isOpaqueIdentifierOrReference(input.sourceReference)) reasons.push("sourceReference must be an opaque identifier");
  if (!isOneOf(METADATA_KINDS, input.metadataKind)) reasons.push("metadataKind is unsupported");
  if (!isOneOf(SENSITIVITIES, input.sensitivity)) reasons.push("sensitivity is unsupported");
  return result(reasons.length === 0 ? "VALID" : "INVALID", reasons, reasons.length === 0 ? copyRecord(input) : undefined);
};

export const validateRecoveryArtifactReference = (value: RecoveryArtifactReference): RecoveryMetadataValidationResult => {
  const input = value as unknown;
  const reasons = validateBase(input, ["referenceId", "providerNeutralReference"], artifactKeys);
  if (!isPlainRecord(input)) return result("INVALID", reasons);
  if (!isOpaqueIdentifierOrReference(input.referenceId)) reasons.push("referenceId must be an opaque identifier");
  if (!isOneOf(ARTIFACT_CLASSES, input.artifactClass)) reasons.push("artifactClass is unsupported");
  if (!isOneOf(SENSITIVITIES, input.sensitivity)) reasons.push("sensitivity is unsupported");
  if (!isOpaqueIdentifierOrReference(input.providerNeutralReference)) reasons.push("providerNeutralReference must be an opaque identifier");
  return result(reasons.length === 0 ? "VALID" : "INVALID", reasons, reasons.length === 0 ? copyRecord(input) : undefined);
};

export const validateRecoveryEvidenceReference = (value: RecoveryEvidenceReference): RecoveryMetadataValidationResult => {
  const input = value as unknown;
  const reasons = validateBase(input, ["evidenceId", "evidenceType", "provenanceReference", "policyVersion"], evidenceKeys);
  if (!isPlainRecord(input)) return result("INVALID", reasons);
  if (!isOpaqueIdentifierOrReference(input.evidenceId)) reasons.push("evidenceId must be an opaque identifier");
  if (!isOpaqueIdentifierOrReference(input.evidenceType)) reasons.push("evidenceType must be an opaque identifier");
  if (!isOpaqueIdentifierOrReference(input.provenanceReference)) reasons.push("provenanceReference must be an opaque identifier");
  if (!isOpaqueIdentifierOrReference(input.policyVersion)) reasons.push("policyVersion must be an opaque identifier");
  if (!isOneOf(PRESENCE_STATES, input.presence)) reasons.push("presence is unsupported");
  if (!isOneOf(SENSITIVITIES, input.sensitivity)) reasons.push("sensitivity is unsupported");
  return result(reasons.length === 0 ? "VALID" : "INVALID", reasons, reasons.length === 0 ? copyRecord(input) : undefined);
};

export const validateRecoveryValidationDescriptor = (value: RecoveryValidationDescriptor): RecoveryMetadataValidationResult => {
  const input = value as unknown;
  const reasons = validateBase(input, ["descriptorId", "purpose", "missingEvidenceOutcome", "policyVersion"], validationKeys);
  if (!isPlainRecord(input)) return result("INVALID", reasons);
  if (!isOpaqueIdentifierOrReference(input.descriptorId)) reasons.push("descriptorId must be an opaque identifier");
  if (!isBoundedSafeText(input.purpose)) reasons.push("purpose must be bounded safe text");
  if (!isBoundedSafeText(input.missingEvidenceOutcome)) reasons.push("missingEvidenceOutcome must be bounded safe text");
  if (!isOpaqueIdentifierOrReference(input.policyVersion)) reasons.push("policyVersion must be an opaque identifier");
  const expectations = input.evidenceExpectations;
  if (!Array.isArray(expectations)) reasons.push("evidenceExpectations must be an array");
  else expectations.forEach((expectation: RecoveryEvidenceExpectation) => {
    if (!isPlainRecord(expectation) || !hasOnlyKeys(expectation, expectationKeys)) reasons.push("evidence expectation is malformed");
    else {
      if (!isOpaqueIdentifierOrReference(expectation.evidenceType)) reasons.push("evidenceType must be an opaque identifier");
      if (!isOneOf(REQUIREMENTS, expectation.requirement)) reasons.push("requirement is unsupported");
    }
  });
  const copiedExpectations = reasons.length === 0 ? boundedFreeze((expectations as RecoveryEvidenceExpectation[]).map((expectation) => boundedFreeze({ ...expectation }))) : undefined;
  const copiedValue = reasons.length === 0 ? boundedFreeze({ ...input, evidenceExpectations: copiedExpectations }) : undefined;
  return result(reasons.length === 0 ? "VALID" : "INVALID", reasons, copiedValue);
};