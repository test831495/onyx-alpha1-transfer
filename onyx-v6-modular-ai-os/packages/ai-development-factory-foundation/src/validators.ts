import { FACTORY_CONSTITUTION, cloneFreeze, isSafeRecord } from "./factory-constitution";
import { isFactoryStage } from "./factory-stage";
import { isFactoryMode } from "./factory-operating-mode";
import { isValidTaskEnvelope } from "./factory-task-envelope";
import { isValidCapabilityManifest } from "./factory-capability-manifest";
import { EVIDENCE_STATUSES, REVIEW_STATUSES, AUTHORITY_STATUSES, isValidEvidenceRecord } from "./evidence-record";
import { CONTINUITY_GAP_REASONS, isValidContinuityGap } from "./continuity-gap";
import { isValidCommandPolicy } from "./read-only-command-policy";
import { isValidDecisionPackage } from "./decision-package";
import { isValidContinuityDraft } from "./continuity-draft";
export type ValidationOutcome = "VALID" | "INVALID" | "DENIED" | "QUARANTINED" | "EXPIRED" | "NOT_ASSESSABLE" | "CONFLICTING";
export type ValidationResult = Readonly<{ outcome: ValidationOutcome; status: ValidationOutcome; reasonCodes: readonly string[]; reasonCode: string; subject: string; policyVersion: string; schemaVersion: string; createsAuthority: false; authorityStatus: "NON_AUTHORIZING" }>;
const result = (outcome: ValidationOutcome, reasonCodes: readonly string[] | string, subject = "unknown"): ValidationResult => { const codes = typeof reasonCodes === "string" ? [reasonCodes] : [...reasonCodes].sort(); return cloneFreeze({ outcome, status: outcome, reasonCodes: codes, reasonCode: codes[0] ?? "VALID", subject, policyVersion: FACTORY_CONSTITUTION.contractVersion, schemaVersion: FACTORY_CONSTITUTION.contractVersion, createsAuthority: false as const, authorityStatus: "NON_AUTHORIZING" as const }); };
const record = (input: unknown): input is Record<string, unknown> => isSafeRecord(input);
const constitutionKeys = Object.keys(FACTORY_CONSTITUTION);
export const validateConstitution = (input: unknown): ValidationResult => {
  if (!record(input) || Object.keys(input).length !== constitutionKeys.length || Object.keys(input).some((key) => !constitutionKeys.includes(key))) return result("DENIED", ["CONSTITUTION_SCHEMA_INVALID"], "constitution");
  for (const key of constitutionKeys) if (input[key] !== FACTORY_CONSTITUTION[key as keyof typeof FACTORY_CONSTITUTION]) return result("DENIED", ["CONSTITUTION_INVARIANT_FAILED"], "constitution");
  return result("VALID", ["CONSTITUTION_VALID"], "constitution");
};
export const validateFactoryStage = (input: unknown): ValidationResult => isFactoryStage(input) ? result("VALID", "STAGE_VALID") : result("DENIED", "UNKNOWN_STAGE");
export const validateFactoryMode = (input: unknown): ValidationResult => isFactoryMode(input) ? result("VALID", "MODE_VALID") : result("DENIED", "UNKNOWN_MODE");
export const validateTaskEnvelope = (input: unknown): ValidationResult => isValidTaskEnvelope(input) ? result("VALID", "TASK_ENVELOPE_VALID") : result("DENIED", "TASK_ENVELOPE_INVALID");
export const validateCapabilityManifest = (input: unknown): ValidationResult => isValidCapabilityManifest(input) ? result("VALID", "CAPABILITY_VALID") : result("QUARANTINED", "CAPABILITY_INVALID_OR_UNSAFE");
export const validateEvidence = (input: unknown): ValidationResult => {
  if (!record(input) || !EVIDENCE_STATUSES.includes(input.status as never)) return result("INVALID", "EVIDENCE_STATUS_INVALID");
  if (input.status === "ACCEPTED" && input.authorityStatus !== "EXTERNALLY_ACCEPTED") return result("DENIED", "FACTORY_CANNOT_ACCEPT_EVIDENCE");
  if (!isValidEvidenceRecord(input)) return result((input as Record<string, unknown>).status === "VERIFIED" ? "NOT_ASSESSABLE" : "INVALID", "EVIDENCE_PROVENANCE_OR_SCHEMA_INVALID");
  return result("VALID", "EVIDENCE_VALID");
};
const validHistoricalRelationships = (records: readonly Record<string, unknown>[]): boolean => {
  const ids = new Set(records.map((entry) => String(entry.evidenceId)));
  const supersedes = new Map<string, string[]>();
  for (const entry of records) {
    const id = String(entry.evidenceId);
    for (const key of ["supersedes", "contradictionIds"]) {
      if (Array.isArray(entry[key]) && (entry[key] as unknown[]).some((reference) => !ids.has(String(reference)))) return false;
    }
    if (entry.status === "SUPERSEDED") supersedes.set(id, entry.supersedes as string[]);
  }
  const visit = (id: string, path: Set<string>): boolean => {
    if (path.has(id)) return false;
    const next = supersedes.get(id);
    if (!next) return true;
    const branch = new Set(path).add(id);
    return next.every((reference) => visit(String(reference), branch));
  };
  return [...supersedes.keys()].every((id) => visit(id, new Set()));
};
export const validateInventory = (input: unknown): ValidationResult => {
  if (!record(input) || !Array.isArray(input.records) || input.authorityStatus !== "NON_AUTHORIZING") return result("INVALID", "INVENTORY_INVALID");
  const records = input.records as Record<string, unknown>[];
  return records.every(isValidEvidenceRecord) && new Set(records.map((entry) => String(entry.evidenceId))).size === records.length && validHistoricalRelationships(records) ? result("VALID", "INVENTORY_VALID") : result("INVALID", "INVENTORY_INVALID");
};
export const validateGap = (input: unknown): ValidationResult => isValidContinuityGap(input) ? result("VALID", "CONTINUITY_GAP_VALID") : result("INVALID", CONTINUITY_GAP_REASONS.includes((input as Record<string, unknown> | null)?.reasonCode as never) ? "CONTINUITY_GAP_SCHEMA_INVALID" : "UNKNOWN_GAP_REASON");
export const validateCommand = (input: unknown): ValidationResult => isValidCommandPolicy(input) ? result("VALID", "COMMAND_POLICY_VALID") : result("DENIED", "COMMAND_POLICY_DENIED");
export const validateDecision = (input: unknown): ValidationResult => isValidDecisionPackage(input) ? result("VALID", "DECISION_PACKAGE_VALID") : result("INVALID", "DECISION_PACKAGE_INCOMPLETE");
export const validateContinuityDraft = (input: unknown): ValidationResult => isValidContinuityDraft(input) ? result("VALID", "CONTINUITY_DRAFT_VALID") : result("DENIED", "CONTINUITY_DRAFT_NON_AUTHORITATIVE_REQUIRED");
export const SENSITIVE_DATA_CLASSES = ["PRODUCTION_SECRETS", "PASSWORDS", "PINS", "PASSKEYS", "AUTHENTICATION_TOKENS", "SESSION_TOKENS", "APPROVAL_TOKENS", "CONNECTOR_CREDENTIALS", "OAUTH_CREDENTIALS", "HOUSEHOLD_PRIVATE_DATA", "PRIVATE_CONVERSATIONS", "PRIVATE_MEMORY", "BIOMETRIC_DATA", "CAMERA_FOOTAGE", "NOTIFICATION_CONTENTS", "DECRYPTED_CACHES", "RECOVERY_SECRETS", "DEVICE_PRIVATE_KEYS", "PRODUCTION_RECORDS", "RAW_SENSITIVE_EVIDENCE"] as const;
export const SOURCE_ORIGINS = ["FACTORY_CONSTITUTION", "OWNER_TASK_ENVELOPE", "REPOSITORY_SOURCE", "REPOSITORY_DOCUMENTATION", "ISSUE", "PULL_REQUEST", "REVIEW_COMMENT", "GENERATED_FILE", "PACKAGE_METADATA", "EXTERNAL_DOCUMENT", "MODEL_OUTPUT", "TOOL_OUTPUT", "SYNTHETIC_FIXTURE", "APPROVED_EVIDENCE"] as const;
export const TRUST_CLASSIFICATIONS = ["AUTHORITY_SOURCE", "GOVERNANCE_INPUT", "TRUSTED_EVIDENCE_REFERENCE", "UNTRUSTED_CONTENT", "SYNTHETIC_TEST_DATA"] as const;
export const SOURCE_TRUST_MAPPING = Object.freeze({
  FACTORY_CONSTITUTION: "AUTHORITY_SOURCE",
  OWNER_TASK_ENVELOPE: "GOVERNANCE_INPUT",
  REPOSITORY_SOURCE: "UNTRUSTED_CONTENT",
  REPOSITORY_DOCUMENTATION: "UNTRUSTED_CONTENT",
  ISSUE: "UNTRUSTED_CONTENT",
  PULL_REQUEST: "UNTRUSTED_CONTENT",
  REVIEW_COMMENT: "UNTRUSTED_CONTENT",
  GENERATED_FILE: "UNTRUSTED_CONTENT",
  PACKAGE_METADATA: "UNTRUSTED_CONTENT",
  EXTERNAL_DOCUMENT: "UNTRUSTED_CONTENT",
  MODEL_OUTPUT: "UNTRUSTED_CONTENT",
  TOOL_OUTPUT: "UNTRUSTED_CONTENT",
  SYNTHETIC_FIXTURE: "SYNTHETIC_TEST_DATA",
  APPROVED_EVIDENCE: "TRUSTED_EVIDENCE_REFERENCE",
} as const);
export const resolveSourceTrustClassification = (sourceOrigin: unknown): (typeof TRUST_CLASSIFICATIONS)[number] | undefined => {
  if (typeof sourceOrigin !== "string") return undefined;
  return SOURCE_TRUST_MAPPING[sourceOrigin as keyof typeof SOURCE_TRUST_MAPPING] as (typeof TRUST_CLASSIFICATIONS)[number] | undefined;
};
export const validateSensitiveExclusion = (input: unknown): ValidationResult => record(input) && SENSITIVE_DATA_CLASSES.includes(input.excludedClass as never) && SOURCE_ORIGINS.includes(input.sourceOrigin as never) && typeof input.subject === "string" && input.collectionStopped === true && input.ingested === false && input.echoed === false && input.persisted === false && input.reasonCode === "SENSITIVE_EVIDENCE_EXCLUDED" && input.authorityStatus === "NON_AUTHORIZING" && typeof input.ownerVisibleEscalation === "boolean" ? result("DENIED", "SENSITIVE_EVIDENCE_EXCLUDED") : result("INVALID", "SENSITIVE_EXCLUSION_INVALID");
export const validateSourceClassification = (input: unknown): ValidationResult => {
  if (!record(input)) return result("DENIED", "UNTRUSTED_SOURCE_POLICY_OVERRIDE");
  if (!SOURCE_ORIGINS.includes(input.sourceOrigin as never)) return result("DENIED", "UNTRUSTED_SOURCE_POLICY_OVERRIDE");
  if (!TRUST_CLASSIFICATIONS.includes(input.trustClassification as never)) return result("DENIED", "UNTRUSTED_SOURCE_POLICY_OVERRIDE");
  const expectedTrust = resolveSourceTrustClassification(input.sourceOrigin);
  if (!expectedTrust || input.trustClassification !== expectedTrust) return result("DENIED", "UNTRUSTED_SOURCE_POLICY_OVERRIDE");
  if (input.canOverridePolicy !== false || input.canExecuteInstructions !== false) return result("DENIED", "UNTRUSTED_SOURCE_POLICY_OVERRIDE");
  if ("createsAuthority" in input && input.createsAuthority !== false) return result("DENIED", "UNTRUSTED_SOURCE_POLICY_OVERRIDE");
  if ("authorityStatus" in input && input.authorityStatus !== "NON_AUTHORIZING") return result("DENIED", "UNTRUSTED_SOURCE_POLICY_OVERRIDE");
  return result("VALID", "UNTRUSTED_SOURCE_BOUND");
};
const PROMPT_EXTRACTION_STATUSES = ["NOT_REQUESTED", "COMPLETE_WITHIN_BOUND", "INCOMPLETE_BOUND_REACHED", "REJECTED_SENSITIVE", "REJECTED_UNTRUSTED", "NOT_ASSESSABLE"] as const;
const PROMPT_CONFLICT_STATES = ["NO_CONFLICT", "CONSTITUTION_CONFLICT", "PURPOSE_CONFLICT", "PROHIBITED_ACTION_CONFLICT", "AUTHORITY_ESCALATION_ATTEMPT", "EVIDENCE_STATUS_CONFLICT", "REVIEW_REQUIREMENT_CONFLICT", "NETWORK_POLICY_CONFLICT", "MUTATION_POLICY_CONFLICT", "PRIVACY_POLICY_CONFLICT", "NOT_ASSESSABLE"] as const;
const PROMPT_ESCALATION_STATES = ["NOT_REQUIRED", "OWNER_REVIEW_REQUIRED", "INDEPENDENT_REVIEW_REQUIRED", "SECURITY_REVIEW_REQUIRED", "PRIVACY_REVIEW_REQUIRED"] as const;
export const validatePromptClassification = (input: unknown): ValidationResult => {
  if (!record(input)) return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  const required = ["sourceOrigin", "trustClassification", "instructionDataClassification", "requestedPurpose", "immutableTaskPurpose", "prohibitedActionReference", "extractionStatus", "citationReferences", "conflictStatus", "escalationRequired", "createsAuthority", "authorityStatus"] as const;
  if (required.some((key) => !(key in input))) return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  if (!SOURCE_ORIGINS.includes(input.sourceOrigin as never)) return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  if (!TRUST_CLASSIFICATIONS.includes(input.trustClassification as never)) return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  const expectedTrust = resolveSourceTrustClassification(input.sourceOrigin);
  if (!expectedTrust || input.trustClassification !== expectedTrust) return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  if (typeof input.requestedPurpose !== "string" || input.requestedPurpose.trim() === "") return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  if (typeof input.immutableTaskPurpose !== "string" || input.immutableTaskPurpose.trim() === "") return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  if (input.requestedPurpose !== input.immutableTaskPurpose) return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  if (!/^[A-Za-z0-9._:-]+$/.test(String(input.prohibitedActionReference))) return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  if (!PROMPT_EXTRACTION_STATUSES.includes(input.extractionStatus as never)) return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  if (!Array.isArray(input.citationReferences) || input.citationReferences.length === 0 || new Set(input.citationReferences).size !== input.citationReferences.length || input.citationReferences.some((reference) => typeof reference !== "string" || !/^[A-Za-z0-9._:-]+$/.test(reference))) return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  if (!PROMPT_CONFLICT_STATES.includes(input.conflictStatus as never)) return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  if (!PROMPT_ESCALATION_STATES.includes(input.escalationRequired as never)) return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  if (input.conflictStatus === "AUTHORITY_ESCALATION_ATTEMPT" && input.escalationRequired === "NOT_REQUIRED") return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  if (input.createsAuthority !== false || input.authorityStatus !== "NON_AUTHORIZING") return result("DENIED", "PROMPT_CLASSIFICATION_INVALID");
  return result("VALID", "PROMPT_CLASSIFICATION_VALID");
};
export const constitution = FACTORY_CONSTITUTION;
export { REVIEW_STATUSES, AUTHORITY_STATUSES };
