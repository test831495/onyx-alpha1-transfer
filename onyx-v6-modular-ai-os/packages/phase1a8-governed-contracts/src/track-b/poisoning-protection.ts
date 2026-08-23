import { MEMORY_CONTRACT_VERSION } from "../shared/versions";
import { type MemorySourceType, type MemoryTrustClassification, type MemoryTier, assertMemoryTier } from "./memory-tiers";

const required = (value: string | undefined, name: string): void => {
  if (!value) throw new Error(`${name} is required.`);
};

const validDate = (value: string, name: string): void => {
  required(value, name);
  if (Number.isNaN(Date.parse(value))) throw new Error(`${name} must be an ISO date.`);
};

// ============================================================
// INSTRUCTION-VERSUS-CONTENT CLASSIFICATION
// ============================================================

export const INSTRUCTION_CLASSES = [
  "TRUSTED_USER_INSTRUCTION",
  "GOVERNANCE_INSTRUCTION",
  "REPOSITORY_INSTRUCTION",
  "SOURCE_CONTENT",
  "QUOTED_INSTRUCTION",
  "EMBEDDED_INSTRUCTION",
  "UNTRUSTED_EXTERNAL_INSTRUCTION",
  "MODEL_GENERATED_INSTRUCTION",
  "UNKNOWN_INSTRUCTION_CLASS",
] as const;

export type InstructionClass = (typeof INSTRUCTION_CLASSES)[number];

export interface InstructionContentClassificationContract {
  classificationId: string;
  sourceReference: string;
  sourceType: MemorySourceType;
  detectedClass: InstructionClass;
  context: string;
  confidence: number;
  classifiedAt: string;
  contractVersion: string;
}

export function assertInstructionClassification(
  contract: InstructionContentClassificationContract
): void {
  required(contract.classificationId, "classificationId");
  required(contract.sourceReference, "sourceReference");
  required(contract.sourceType, "sourceType");
  required(contract.detectedClass, "detectedClass");
  required(contract.context, "context");
  validDate(contract.classifiedAt, "classifiedAt");
  if (contract.confidence < 0 || contract.confidence > 1) {
    throw new Error("confidence must be between 0 and 1.");
  }
  if (!(INSTRUCTION_CLASSES as readonly string[]).includes(contract.detectedClass)) {
    throw new Error("detectedClass must be a valid instruction class.");
  }
}

// ============================================================
// PROMPT-INJECTION INDICATORS
// ============================================================

export const PROMPT_INJECTION_INDICATORS = [
  "ATTEMPT_OVERRIDE_PRIOR_INSTRUCTIONS",
  "CLAIM_HIDDEN_APPROVAL",
  "CLAIM_ADMINISTRATOR_AUTHORITY",
  "REQUEST_EXPOSE_SECRETS",
  "REQUEST_BYPASS_PERMISSIONS",
  "REQUEST_IGNORE_POLICY",
  "REQUEST_MODIFY_PERSONA",
  "REQUEST_EXECUTE_EXTERNAL_ACTIONS",
  "REQUEST_EXPAND_AGENT_AUTHORITY",
  "REQUEST_DURABLE_MEMORY_WRITE_UNGOERNED",
  "REQUEST_SUPPRESS_EVIDENCE",
  "REQUEST_ALTER_CHECKPOINT_LINEAGE",
  "TREAT_SOURCE_AS_SYSTEM_INSTRUCTION",
] as const;

export type PromptInjectionIndicator = (typeof PROMPT_INJECTION_INDICATORS)[number];

export interface PromptInjectionIndicatorContract {
  indicatorId: string;
  sourceReference: string;
  detectedIndicators: PromptInjectionIndicator[];
  confidence: number;
  excerpt: string;
  detectedAt: string;
  contractVersion: string;
}

export function assertPromptInjectionIndicatorContract(
  contract: PromptInjectionIndicatorContract
): void {
  required(contract.indicatorId, "indicatorId");
  required(contract.sourceReference, "sourceReference");
  if (!Array.isArray(contract.detectedIndicators) || contract.detectedIndicators.length === 0) {
    throw new Error("detectedIndicators must be a non-empty array.");
  }
  for (const indicator of contract.detectedIndicators) {
    if (!(PROMPT_INJECTION_INDICATORS as readonly string[]).includes(indicator)) {
      throw new Error(`${indicator} is not a valid prompt injection indicator.`);
    }
  }
  if (contract.confidence < 0 || contract.confidence > 1) {
    throw new Error("confidence must be between 0 and 1.");
  }
  required(contract.excerpt, "excerpt");
  validDate(contract.detectedAt, "detectedAt");
}

// ============================================================
// AUTHORITY-CLAIM REJECTION
// ============================================================

export const AUTHORITY_CLAIM_CLASSES = [
  "CLAIMS_APPROVAL",
  "CLAIMS_RAHUL_AUTHORITY",
  "CLAIMS_SYSTEM_AUTHORITY",
  "CLAIMS_CONNECTOR_AUTHORITY",
  "CLAIMS_MEMORY_WRITE_AUTHORITY",
  "CLAIMS_SECRET_ACCESS",
  "CLAIMS_PERMISSION_CHANGE",
  "CLAIMS_PROMOTION_AUTHORITY",
  "CLAIMS_MERGE_AUTHORITY",
  "CLAIMS_PRODUCTION_AUTHORITY",
  "CLAIMS_PAID_ACTION_AUTHORITY",
  "CLAIMS_PERSONA_MODIFICATION_AUTHORITY",
  "UNKNOWN_AUTHORITY_CLAIM",
] as const;

export type AuthorityClaimClass = (typeof AUTHORITY_CLAIM_CLASSES)[number];

export interface AuthorityClaimRejectionContract {
  rejectionId: string;
  sourceReference: string;
  detectedClaims: AuthorityClaimClass[];
  rejectedAt: string;
  contractVersion: string;
}

export function assertAuthorityClaims(
  claims: AuthorityClaimClass[]
): void {
  if (!Array.isArray(claims)) {
    throw new Error("claims must be an array.");
  }
  for (const claim of claims) {
    if (!(AUTHORITY_CLAIM_CLASSES as readonly string[]).includes(claim)) {
      throw new Error(`${claim} is not a valid authority claim class.`);
    }
  }
}

export function assertAuthorityClaimRejection(
  contract: AuthorityClaimRejectionContract
): void {
  required(contract.rejectionId, "rejectionId");
  required(contract.sourceReference, "sourceReference");
  assertAuthorityClaims(contract.detectedClaims);
  validDate(contract.rejectedAt, "rejectedAt");
}

// ============================================================
// SOURCE TRUST EVALUATION
// ============================================================

export interface SourceTrustEvaluationContract {
  trustEvaluationId: string;
  sourceReference: string;
  sourceType: MemorySourceType;
  sourceAttribution: string;
  declaredTrustClassification: MemoryTrustClassification;
  evaluatedTrustClassification: MemoryTrustClassification;
  instructionContentClassification: InstructionClass;
  authorityClaims: AuthorityClaimClass[];
  promptInjectionIndicators: PromptInjectionIndicator[];
  provenanceVerified: boolean;
  permissionVerified: boolean;
  freshnessVerified: boolean;
  redactionRequired: boolean;
  quarantineRequired: boolean;
  reviewRequired: boolean;
  durableWriteEligible: boolean;
  evaluatorId: string;
  evaluatedAt: string;
  contractVersion: string;
  evidenceReferences: string[];
}

export function assertSourceTrustEvaluation(
  contract: SourceTrustEvaluationContract
): void {
  required(contract.trustEvaluationId, "trustEvaluationId");
  required(contract.sourceReference, "sourceReference");
  required(contract.sourceType, "sourceType");
  required(contract.sourceAttribution, "sourceAttribution");
  required(contract.declaredTrustClassification, "declaredTrustClassification");
  required(contract.evaluatedTrustClassification, "evaluatedTrustClassification");
  required(contract.instructionContentClassification, "instructionContentClassification");
  required(contract.evaluatorId, "evaluatorId");
  validDate(contract.evaluatedAt, "evaluatedAt");

  assertAuthorityClaims(contract.authorityClaims);
  if (!Array.isArray(contract.promptInjectionIndicators)) {
    throw new Error("promptInjectionIndicators must be an array.");
  }
  if (!Array.isArray(contract.evidenceReferences)) {
    throw new Error("evidenceReferences must be an array.");
  }

  // Trust classification does not automatically grant authority
  // A trusted source still requires scope, freshness, permission, and provenance validation
  if (
    contract.quarantineRequired ||
    !contract.provenanceVerified ||
    !contract.permissionVerified ||
    !contract.freshnessVerified ||
    contract.authorityClaims.length > 0 ||
    contract.promptInjectionIndicators.length > 0
  ) {
    contract.durableWriteEligible = false;
  }
}

// ============================================================
// MEMORY QUARANTINE
// ============================================================

export const QUARANTINE_STATES = [
  "QUARANTINE_REQUIRED",
  "QUARANTINED",
  "UNDER_REVIEW",
  "RELEASED_AS_CONTENT_ONLY",
  "RELEASED_FOR_GOVERNED_USE",
  "REJECTED",
  "DELETION_REQUIRED",
  "RECONCILIATION_REQUIRED",
] as const;

export type QuarantineState = (typeof QUARANTINE_STATES)[number];

export interface MemoryQuarantineContract {
  quarantineId: string;
  sourceReference: string;
  memoryRecordId: string | null;
  reasonCodes: string[];
  detectedIndicators: PromptInjectionIndicator[];
  authorityClaims: AuthorityClaimClass[];
  quarantinedBy: string;
  quarantinedAt: string;
  reviewRequired: boolean;
  reviewerId: string | null;
  reviewedAt: string | null;
  reviewDecision: string | null;
  releaseRestrictions: string[];
  status: QuarantineState;
  contractVersion: string;
  evidenceReferences: string[];
}

export function assertMemoryQuarantine(
  contract: MemoryQuarantineContract
): void {
  required(contract.quarantineId, "quarantineId");
  required(contract.sourceReference, "sourceReference");
  if (!Array.isArray(contract.reasonCodes) || contract.reasonCodes.length === 0) {
    throw new Error("reasonCodes must be a non-empty array.");
  }
  required(contract.quarantinedBy, "quarantinedBy");
  validDate(contract.quarantinedAt, "quarantinedAt");

  assertAuthorityClaims(contract.authorityClaims);
  if (!Array.isArray(contract.detectedIndicators)) {
    throw new Error("detectedIndicators must be an array.");
  }
  if (!Array.isArray(contract.releaseRestrictions)) {
    throw new Error("releaseRestrictions must be an array.");
  }
  if (!(QUARANTINE_STATES as readonly string[]).includes(contract.status)) {
    throw new Error("status must be a valid quarantine state.");
  }

  // Quarantined content must not enter active context, grant permissions, or modify governance
  if (contract.status === "QUARANTINED" || contract.status === "UNDER_REVIEW") {
    if (contract.reviewRequired && !contract.reviewerId) {
      throw new Error("If reviewRequired is true, reviewerId must be provided.");
    }
  }

  if (contract.status === "RELEASED_FOR_GOVERNED_USE") {
    if (!contract.reviewerId) {
      throw new Error("reviewerId must be provided when released for governed use.");
    }
    if (!contract.reviewedAt) {
      throw new Error("reviewedAt must be provided when released for governed use.");
    }
    if (!contract.reviewDecision) {
      throw new Error("reviewDecision must be provided when released for governed use.");
    }
  }

  if (contract.reviewedAt) validDate(contract.reviewedAt, "reviewedAt");
}

// ============================================================
// DURABLE-MEMORY WRITE ELIGIBILITY
// ============================================================

export interface DurableMemoryWriteEligibilityContract {
  eligibilityDecisionId: string;
  sourceReference: string;
  sourceTrustEvaluationId: string;
  targetMemoryTier: MemoryTier;
  ownerScope: string;
  projectScope: string;
  characterScope: string;
  permissionDecision: string;
  retentionPolicyId: string;
  canonicalSourceId: string;
  sourceAuthorityClass: string;
  derivedLabel: string;
  poisoningReviewStatus: string;
  redactionStatus: string;
  scopeHash: string;
  approvalRequired: boolean;
  approvalId: string | null;
  eligible: boolean;
  denialReasons: string[];
  decidedAt: string;
  contractVersion: string;
  evidenceReferences: string[];
}

export function assertDurableMemoryWriteEligibility(
  contract: DurableMemoryWriteEligibilityContract
): void {
  required(contract.eligibilityDecisionId, "eligibilityDecisionId");
  required(contract.sourceReference, "sourceReference");
  required(contract.sourceTrustEvaluationId, "sourceTrustEvaluationId");
  assertMemoryTier(contract.targetMemoryTier);
  required(contract.ownerScope, "ownerScope");
  required(contract.projectScope, "projectScope");
  required(contract.characterScope, "characterScope");
  required(contract.permissionDecision, "permissionDecision");
  required(contract.retentionPolicyId, "retentionPolicyId");
  required(contract.canonicalSourceId, "canonicalSourceId");
  required(contract.sourceAuthorityClass, "sourceAuthorityClass");
  required(contract.derivedLabel, "derivedLabel");
  required(contract.poisoningReviewStatus, "poisoningReviewStatus");
  required(contract.redactionStatus, "redactionStatus");
  required(contract.scopeHash, "scopeHash");
  required(contract.decidedAt, "decidedAt");
  validDate(contract.decidedAt, "decidedAt");

  if (!Array.isArray(contract.denialReasons)) {
    throw new Error("denialReasons must be an array.");
  }
  if (!Array.isArray(contract.evidenceReferences)) {
    throw new Error("evidenceReferences must be an array.");
  }

  // P0 must never be eligible
  if (contract.targetMemoryTier === "P0" && contract.eligible) {
    throw new Error("P0 must never be eligible for durable memory write.");
  }

  // Only M2 or governed M4 append operations may be eligible
  if (contract.eligible && contract.targetMemoryTier !== "M2" && contract.targetMemoryTier !== "M4") {
    throw new Error("Only M2 or M4 may be eligible for durable memory write.");
  }

  // Eligibility must be false when conditions are not met
  if (contract.eligible) {
    if (!contract.permissionDecision || contract.permissionDecision === "DENY") {
      throw new Error("Eligibility requires permission decision of ALLOW.");
    }
    if (contract.approvalRequired && !contract.approvalId) {
      throw new Error("Eligibility requires approval when approval is required.");
    }
    if (contract.denialReasons.length > 0) {
      throw new Error("Eligibility cannot be true when there are denial reasons.");
    }
  }
}
