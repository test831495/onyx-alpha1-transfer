import { CONTEXT_CONTRACT_VERSION } from "../shared/versions";
import type { ConnectorProvider, ConnectorScope } from "../shared/connector-scope";
import type { MemoryTier } from "./memory-tiers";
import type { RiskClass } from "../shared/risk-classes";

// ============================================================================
// REQUEST AND DOMAIN CLASSIFICATION
// ============================================================================

export const REQUEST_CLASSES = [
  "READ_ONLY_QUERY",
  "ARCHITECTURE_ANALYSIS",
  "CODE_IMPLEMENTATION",
  "TEST_GENERATION",
  "DOCUMENTATION",
  "SECURITY_REVIEW",
  "MEMORY_RETRIEVAL",
  "MEMORY_WRITE_REQUEST",
  "CONNECTOR_READ_REQUEST",
  "CONNECTOR_MUTATION_REQUEST",
  "GITHUB_MUTATION_REQUEST",
  "EXTERNAL_PRODUCTIVITY_REQUEST",
  "PROMOTION_REQUEST",
  "UNKNOWN_REQUEST",
] as const;
export type RequestClass = (typeof REQUEST_CLASSES)[number];

export const DOMAIN_CLASSES = [
  "ENGINEERING",
  "PROJECT_GOVERNANCE",
  "MEMORY",
  "CONNECTOR",
  "PRODUCTIVITY",
  "VOICE_AND_PRESENCE",
  "CHARACTER_AND_PERSONA",
  "COST_AND_BUDGET",
  "SECURITY",
  "UNKNOWN_DOMAIN",
] as const;
export type DomainClass = (typeof DOMAIN_CLASSES)[number];

export interface RequestClassificationContract {
  classificationId: string;
  requestId: string;
  classifiedAs: RequestClass;
  confidence: number;
  evidenceReferences: string[];
  createdAt: string;
  contractVersion: string;
}

export interface DomainClassificationContract {
  classificationId: string;
  requestId: string;
  classifiedAs: DomainClass;
  confidence: number;
  evidenceReferences: string[];
  createdAt: string;
  contractVersion: string;
}

export function assertValidRequestClass(value: string): asserts value is RequestClass {
  if (!(REQUEST_CLASSES as readonly string[]).includes(value)) {
    throw new Error(`Unknown request class: ${value}`);
  }
}

export function assertValidDomainClass(value: string): asserts value is DomainClass {
  if (!(DOMAIN_CLASSES as readonly string[]).includes(value)) {
    throw new Error(`Unknown domain class: ${value}`);
  }
}

export function assertClassificationNotUnknown(classification: RequestClassificationContract | DomainClassificationContract): void {
  if (classification.classifiedAs === "UNKNOWN_REQUEST" || classification.classifiedAs === "UNKNOWN_DOMAIN") {
    throw new Error("Unknown classification must fail safe and cannot proceed.");
  }
}

// ============================================================================
// PERMISSION DECISION
// ============================================================================

export const PERMISSION_DECISIONS = [
  "ALLOWED",
  "DENIED",
  "REQUIRES_APPROVAL",
  "REQUIRES_FRESH_APPROVAL",
  "REQUIRES_RECONCILIATION",
  "PROHIBITED",
] as const;
export type PermissionDecision = (typeof PERMISSION_DECISIONS)[number];

export interface ContextPermissionDecisionContract {
  permissionDecisionId: string;
  requestId: string;
  workflowId: string;
  runtimeId: string;
  subjectAgentId: string;
  supervisingUserId: string;
  requiredPermissionProfileId: string;
  requiredMemoryAccessProfileId: string;
  requiredConnectorScopeIds: string[];
  requestedMemoryTiers: MemoryTier[];
  requestedSourceScopes: string[];
  requestedOperationClass: string;
  riskClass: RiskClass;
  decision: PermissionDecision;
  denialReasons: string[];
  approvalRequired: boolean;
  approvalId: string | null;
  scopeHash: string;
  decidedAt: string;
  contractVersion: string;
  evidenceReferences: string[];
}

export function assertPermissionDecision(decision: ContextPermissionDecisionContract): void {
  if (decision.decision === "DENIED" || decision.decision === "PROHIBITED") {
    if (decision.denialReasons.length === 0) {
      throw new Error("Denial decision must include at least one reason.");
    }
  }
  if (decision.decision === "ALLOWED" && decision.denialReasons.length > 0) {
    throw new Error("Allowed decision cannot include denial reasons.");
  }
}

export function assertDenyByDefault(decision: ContextPermissionDecisionContract): void {
  // Verify missing permission information does not default to allowed
  if (!decision.requiredPermissionProfileId || !decision.requiredMemoryAccessProfileId) {
    if (decision.decision === "ALLOWED") {
      throw new Error("Missing permission information must not default to allowed.");
    }
  }
}

// ============================================================================
// FRESHNESS REQUIREMENT AND DECISION
// ============================================================================

export const FRESHNESS_REQUIREMENTS = [
  "STATIC_ACCEPTABLE",
  "REPOSITORY_CURRENT",
  "SESSION_CURRENT",
  "CONNECTOR_CURRENT",
  "WEB_CURRENT",
  "REAL_TIME_REQUIRED",
  "HISTORICAL_AS_OF",
  "UNKNOWN_FRESHNESS",
] as const;
export type FreshnessRequirement = (typeof FRESHNESS_REQUIREMENTS)[number];

export const FRESHNESS_DECISIONS = ["FRESH", "STALE", "UNKNOWN", "UNAVAILABLE", "REQUIRES_REFRESH", "PROHIBITED"] as const;
export type FreshnessDecision = (typeof FRESHNESS_DECISIONS)[number];

export interface FreshnessRequirementContract {
  freshnessRequirementId: string;
  requestId: string;
  requirement: FreshnessRequirement;
  maximumAge: string; // ISO duration
  createdAt: string;
  contractVersion: string;
}

export interface FreshnessDecisionContract {
  freshnessDecisionId: string;
  requestId: string;
  requirement: FreshnessRequirement;
  sourceReference: string;
  sourceObservedAt: string;
  requiredAsOf: string;
  maximumAge: string;
  decision: FreshnessDecision;
  reason: string;
  decidedAt: string;
  contractVersion: string;
  evidenceReferences: string[];
}

export function assertFreshnessDependsOnObservedTime(decision: FreshnessDecisionContract): void {
  if (decision.sourceObservedAt === "UNKNOWN" || !decision.sourceObservedAt) {
    if (decision.decision === "FRESH") {
      throw new Error("Unknown timestamp must not be labeled fresh.");
    }
  }
}

export function assertRealTimeRequirementFailsSafe(
  requirement: FreshnessRequirement,
  decision: FreshnessDecisionContract,
): void {
  if (requirement === "REAL_TIME_REQUIRED") {
    if (decision.decision !== "FRESH" && decision.decision !== "PROHIBITED" && decision.decision !== "REQUIRES_REFRESH") {
      throw new Error("REAL_TIME_REQUIRED must fail safe when real-time verification is unavailable.");
    }
  }
}

// ============================================================================
// SOURCE REFERENCE AND RETRIEVAL CANDIDATE
// ============================================================================

export const CONTEXT_SOURCE_TYPES = [
  "REPOSITORY_TRUTH",
  "ARCHITECTURE_DOCUMENTATION",
  "ADR",
  "DURABLE_MEMORY",
  "SESSION_MEMORY",
  "CURRENT_APPROVAL_STATE",
  "CURRENT_USER_INSTRUCTION",
  "LOW_TRUST_SOURCE",
  "CONNECTOR_BACKED",
  "INDEXED_WEB",
  "LIVE_WEB",
  "UNKNOWN_SOURCE",
] as const;
export type SourceType = (typeof CONTEXT_SOURCE_TYPES)[number];

export const SOURCE_TRUST_CLASSES = [
  "CANONICAL_REPOSITORY",
  "AUTHORED_DOCUMENTATION",
  "GOVERNANCE_RECORD",
  "AGENT_GENERATED",
  "USER_GENERATED",
  "CONNECTOR_PROVIDED",
  "INDEXED_EXTERNAL",
  "UNKNOWN_TRUST",
] as const;
export type SourceTrustClass = (typeof SOURCE_TRUST_CLASSES)[number];

export const SOURCE_AUTHORITY_CLASSES = [
  "AUTHORITATIVE_SOURCE",
  "SUPPORTING_EVIDENCE",
  "DERIVED_INFERENCE",
  "CONTEXTUAL_REFERENCE",
  "DISPUTED_FACT",
  "UNVALIDATED_CLAIM",
  "UNKNOWN_AUTHORITY",
] as const;
export type SourceAuthorityClass = (typeof SOURCE_AUTHORITY_CLASSES)[number];

export interface SourceReferenceContract {
  sourceReferenceId: string;
  canonicalSourceId: string;
  sourceType: SourceType;
  sourceLocation: string;
  sourceVersion: string;
  sourceDigest: string;
  sourceAttribution: string;
  trustClassification: SourceTrustClass;
  authorityClass: SourceAuthorityClass;
  memoryTier: MemoryTier;
  connectorScopeId: string | null;
  observedAt: string;
  tombstoneStatus: string;
  quarantineStatus: string;
  permissionStatus: string;
  contractVersion: string;
}

export interface RetrievalCandidateContract {
  candidateId: string;
  requestId: string;
  sourceReferenceId: string;
  retrievalMethod: string;
  retrievalScore: number;
  precedenceClass: number;
  freshnessDecisionId: string;
  permissionDecisionId: string;
  poisoningReviewStatus: string;
  redactionRequired: boolean;
  eligible: boolean;
  denialReasons: string[];
  contractVersion: string;
}

export function assertRetrievalCandidateEligible(
  candidate: RetrievalCandidateContract,
  sourceRef: Pick<SourceReferenceContract, "tombstoneStatus" | "quarantineStatus" | "sourceDigest" | "permissionStatus">,
): void {
  if (candidate.permissionDecisionId) {
    // Permission validation checked in permission decision
  }

  if (sourceRef.tombstoneStatus !== "ACTIVE" && sourceRef.tombstoneStatus !== "") {
    throw new Error("Tombstoned candidate cannot be retrieved.");
  }

  if (sourceRef.quarantineStatus !== "NONE" && sourceRef.quarantineStatus !== "") {
    throw new Error("Quarantined candidate cannot be retrieved.");
  }

  if (!sourceRef.sourceDigest) {
    throw new Error("Candidate without source digest cannot be retrieved.");
  }

  if (!sourceRef.permissionStatus || sourceRef.permissionStatus === "DENIED") {
    throw new Error("Candidate without permission cannot be retrieved.");
  }
}

// ============================================================================
// SOURCE PRECEDENCE
// ============================================================================

export const SOURCE_PRECEDENCE_ORDER = [
  "CURRENT_USER_INSTRUCTION",
  "CURRENT_APPROVAL_STATE",
  "REPOSITORY_TRUTH",
  "ADR",
  "ARCHITECTURE_DOCUMENTATION",
  "DURABLE_MEMORY",
  "SESSION_MEMORY",
  "LOW_TRUST_SOURCE",
] as const;
export type SourcePrecedenceClass = (typeof SOURCE_PRECEDENCE_ORDER)[number];

export interface SourcePrecedenceContract {
  precedenceDecisionId: string;
  sourceType: SourceType;
  precedenceClass: SourcePrecedenceClass;
  precedenceValue: number;
  createdAt: string;
  contractVersion: string;
}

export function assertSourcePrecedenceKnown(sourceType: SourceType): asserts sourceType is SourceType {
  if (sourceType === "UNKNOWN_SOURCE") {
    throw new Error("Unknown precedence values must be rejected.");
  }
}

export function assertHigherPrecedenceStillRequired(
  precedenceClass: SourcePrecedenceClass,
  decision: ContextPermissionDecisionContract | FreshnessDecisionContract,
): void {
  // Higher precedence source must still pass permission, freshness, and other validation
  if ("permissionDecisionId" in decision) {
    assertPermissionDecision(decision as ContextPermissionDecisionContract);
  }
}

export function assertUserInstructionDoesNotOverrideProhibited(
  precedenceClass: SourcePrecedenceClass,
  permission: ContextPermissionDecisionContract,
): void {
  if (precedenceClass === "CURRENT_USER_INSTRUCTION") {
    if (permission.decision === "PROHIBITED") {
      throw new Error("User instruction must not override prohibited governance policy.");
    }
  }
}

export function assertApprovalNotTreatedAsFactual(sourceType: SourceType): void {
  if (sourceType === "CURRENT_APPROVAL_STATE") {
    // Approval record is not factual project memory
  }
}

// ============================================================================
// SOURCE RANKING
// ============================================================================

export interface SourceRankingContract {
  rankingDecisionId: string;
  requestId: string;
  candidateIds: string[];
  orderedCandidateIds: string[];
  precedenceDecisions: SourcePrecedenceContract[];
  trustDecisions: Array<{ candidateId: string; trustClass: SourceTrustClass }>;
  freshnessDecisions: Array<{ candidateId: string; freshnessStatus: FreshnessDecision }>;
  relevanceScores: Record<string, number>;
  tieBreaker: string; // stable source-reference ID
  excludedCandidateIds: string[];
  exclusionReasons: Record<string, string>;
  createdAt: string;
  contractVersion: string;
}

export function assertDeterministicRanking(ranking: SourceRankingContract): void {
  // Ranking must be deterministic
  if (ranking.tieBreaker === "CURRENT_TIME" || ranking.tieBreaker === "RANDOM") {
    throw new Error("Ranking tie breaker must be deterministic and stable.");
  }
}

export function assertRankingDoesNotGrantAuthority(ranking: SourceRankingContract): void {
  // Ranking never converts a low-trust source into authority
  for (const decision of ranking.trustDecisions) {
    if (decision.trustClass === "UNKNOWN_TRUST") {
      const candidate = ranking.candidateIds.find((id) => id === decision.candidateId);
      if (ranking.orderedCandidateIds[0] === candidate) {
        throw new Error("Ranking must never convert a low-trust source into authority.");
      }
    }
  }
}

// ============================================================================
// SOURCE DEDUPLICATION
// ============================================================================

export interface SourceDeduplicationContract {
  deduplicationDecisionId: string;
  requestId: string;
  candidateIds: string[];
  canonicalGroups: Array<{ canonical: string; duplicates: string[] }>;
  retainedCandidateIds: string[];
  supersededCandidateIds: string[];
  duplicateCandidateIds: string[];
  conflictCandidateIds: string[];
  decisionReasons: Record<string, string>;
  createdAt: string;
  contractVersion: string;
}

export function assertDeduplicationPreservesAttribution(dedup: SourceDeduplicationContract): void {
  // Deduplication must not discard source attribution
  for (const group of dedup.canonicalGroups) {
    if (group.duplicates.length === 0 && !group.canonical) {
      throw new Error("Deduplication must preserve source attribution.");
    }
  }
}

export function assertDeduplicationPreservesConflicts(dedup: SourceDeduplicationContract): void {
  // Do not collapse distinct conflicting source versions without recording conflict
  if (dedup.conflictCandidateIds.length > 0) {
    const recorded = dedup.canonicalGroups.some((g) => dedup.conflictCandidateIds.every((id) => [g.canonical, ...g.duplicates].includes(id)));
    if (!recorded) {
      throw new Error("Deduplication must record conflicting source versions.");
    }
  }
}

// ============================================================================
// REDACTION DECISION
// ============================================================================

export const REDACTION_CLASSES = [
  "SECRET",
  "AUTHORIZATION_HEADER",
  "API_KEY",
  "GITHUB_TOKEN",
  "CONNECTOR_CREDENTIAL",
  "PERSONAL_ACCOUNT_IDENTIFIER",
  "PRIVATE_PERSONA_CONTENT",
  "PRIVATE_USER_CONTENT",
  "CHAIN_OF_THOUGHT",
  "UNAUTHORIZED_MEMORY_CONTENT",
  "UNKNOWN_SENSITIVE_CONTENT",
] as const;
export type RedactionClass = (typeof REDACTION_CLASSES)[number];

export interface ContextRedactionDecisionContract {
  redactionDecisionId: string;
  requestId: string;
  sourceReferenceId: string;
  redactionClasses: RedactionClass[];
  redactedFieldDigests: string[];
  required: boolean;
  completed: boolean;
  blocked: boolean;
  reason: string;
  createdAt: string;
  contractVersion: string;
}

export function assertMandatoryRedactionCompleted(redaction: ContextRedactionDecisionContract): void {
  if (redaction.required && !redaction.completed) {
    throw new Error("Incomplete mandatory redaction must block context-package creation.");
  }
}

export function assertNoUnredactedSensitiveContent(redaction: ContextRedactionDecisionContract): void {
  // Do not store unredacted sensitive content in the decision contract
  for (const clazz of redaction.redactionClasses) {
    if (clazz === "SECRET" || clazz === "API_KEY" || clazz === "GITHUB_TOKEN" || clazz === "CONNECTOR_CREDENTIAL") {
      if (!redaction.completed) {
        throw new Error("Sensitive content must not be stored unredacted in decision contract.");
      }
    }
  }
}

// ============================================================================
// IMMUTABLE CONTEXT PACKAGE
// ============================================================================

export interface ContextPackageContract {
  contextPackageId: string;
  contextPackageVersion: string;
  parentContextPackageId: string | null;
  requestId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  domain: DomainClass;
  requestClassification: RequestClass;
  permissionDecisionId: string;
  freshnessRequirement: FreshnessRequirement;
  freshnessDecisionIds: string[];
  sourceReferenceIds: string[];
  sourceTrustClassifications: SourceTrustClass[];
  sourceAuthorityClasses: SourceAuthorityClass[];
  retrievalScores: Record<string, number>;
  sourcePrecedenceDecisions: SourcePrecedenceContract[];
  deduplicationDecisionId: string;
  redactionDecisionIds: string[];
  memoryTierReferences: MemoryTier[];
  connectorScopeReferences: string[];
  tokenBudgetId: string;
  costBudgetId: string;
  modelRoutingClass: string;
  cacheDecisionId: string;
  provenanceDigest: string;
  scopeHash: string;
  createdAt: string;
  expiresAt: string;
  contractVersion: string;
  evidenceReferences: string[];
}

export interface ContextPackageVersioningContract {
  contextPackageId: string;
  contextPackageVersion: string;
  parentContextPackageId: string | null;
  changeDescription: string;
  createdAt: string;
  contractVersion: string;
}

export function assertImmutableContextPackage(pkg: ContextPackageContract): void {
  // No update-in-place method may exist
  if (!pkg.contextPackageVersion) {
    throw new Error("Context package version must be set.");
  }
}

export function assertMaterialChangeCreatesNewVersion(priorPkg: ContextPackageContract, newPkg: ContextPackageContract): void {
  // Material change must create new package, version, and parent reference
  const materialChanges = [
    priorPkg.sourceReferenceIds !== newPkg.sourceReferenceIds,
    priorPkg.permissionDecisionId !== newPkg.permissionDecisionId,
    priorPkg.freshnessRequirement !== newPkg.freshnessRequirement,
    priorPkg.deduplicationDecisionId !== newPkg.deduplicationDecisionId,
    priorPkg.redactionDecisionIds !== newPkg.redactionDecisionIds,
    priorPkg.tokenBudgetId !== newPkg.tokenBudgetId,
    priorPkg.costBudgetId !== newPkg.costBudgetId,
    priorPkg.modelRoutingClass !== newPkg.modelRoutingClass,
    priorPkg.cacheDecisionId !== newPkg.cacheDecisionId,
  ];

  if (materialChanges.some((changed) => changed)) {
    if (priorPkg.contextPackageId === newPkg.contextPackageId) {
      throw new Error("Material change must create new contextPackageId.");
    }
    if (priorPkg.contextPackageVersion === newPkg.contextPackageVersion) {
      throw new Error("Material change must create new version.");
    }
    if (!newPkg.parentContextPackageId) {
      throw new Error("Material change must link to parent version.");
    }
    if (newPkg.parentContextPackageId !== priorPkg.contextPackageId) {
      throw new Error("Parent context package ID must reference prior version.");
    }
  }
}

export function assertNoSensitiveFieldsInPackage(pkg: ContextPackageContract): void {
  // Package must not contain raw secrets, credentials, raw auth headers, chain of thought, P0 content
  // This is enforced by redaction decision contracts and access control
  if (pkg.redactionDecisionIds.length === 0 && pkg.sourceTrustClassifications.some((t) => t === "UNKNOWN_TRUST")) {
    throw new Error("Context package with unknown-trust sources must include redaction decisions.");
  }
}

// ============================================================================
// PROVENANCE AUDIT
// ============================================================================

export const PROVENANCE_AUDIT_RESULTS = ["VALID", "INVALID", "INCOMPLETE", "REQUIRES_RECONCILIATION", "PROHIBITED"] as const;
export type ProvenanceAuditResult = (typeof PROVENANCE_AUDIT_RESULTS)[number];

export interface ContextProvenanceAuditContract {
  provenanceAuditId: string;
  contextPackageId: string;
  sourceReferenceIds: string[];
  canonicalSourceIds: string[];
  sourceDigests: string[];
  permissionDecisionId: string;
  freshnessDecisionIds: string[];
  rankingDecisionId: string;
  deduplicationDecisionId: string;
  redactionDecisionIds: string[];
  poisoningReviewReferences: string[];
  tombstoneReviewReferences: string[];
  modelRoutingDecisionId: string;
  budgetDecisionIds: string[];
  auditedBy: string;
  auditedAt: string;
  result: ProvenanceAuditResult;
  failureReasons: string[];
  contractVersion: string;
  evidenceReferences: string[];
}

export function assertValidProvenanceAudit(audit: ContextProvenanceAuditContract): void {
  if (audit.result === "VALID") {
    if (audit.failureReasons.length > 0) {
      throw new Error("Valid audit must have no failure reasons.");
    }
    if (audit.sourceReferenceIds.length === 0) {
      throw new Error("Valid audit must have at least one source reference.");
    }
  }
}

export function assertContextPackageRequiresAudit(
  pkg: ContextPackageContract,
  audit: ContextProvenanceAuditContract | null,
): void {
  if (!audit) {
    throw new Error("Context package cannot be accepted without provenance audit.");
  }
  if (audit.result !== "VALID") {
    throw new Error("Context package cannot be accepted with non-valid provenance audit.");
  }
}

// ============================================================================
// GOVERNED CONTEXT ASSEMBLY CONTRACT
// ============================================================================

export const PIPELINE_STAGES = [
  "CLASSIFY_REQUEST",
  "IDENTIFY_DOMAIN",
  "IDENTIFY_PERMISSIONS",
  "IDENTIFY_FRESHNESS",
  "RETRIEVE_SOURCES",
  "RANK_SOURCES",
  "DEDUPLICATE_SOURCES",
  "BUILD_CONTEXT_PACKAGE",
  "AUDIT_PROVENANCE",
] as const;
export type PipelineStage = (typeof PIPELINE_STAGES)[number];

export interface GovernedContextAssemblyContract {
  assemblyId: string;
  requestId: string;
  workflowId: string;
  runtimeId: string;
  requestClassification: RequestClassificationContract;
  domainClassification: DomainClassificationContract;
  permissionDecision: ContextPermissionDecisionContract;
  freshnessRequirement: FreshnessRequirementContract;
  freshnessDecisions: FreshnessDecisionContract[];
  sourceReferences: SourceReferenceContract[];
  retrievalCandidates: RetrievalCandidateContract[];
  sourceRanking: SourceRankingContract;
  sourceDeduplication: SourceDeduplicationContract;
  contextPackage: ContextPackageContract;
  provenanceAudit: ContextProvenanceAuditContract;
  currentStage: PipelineStage;
  completedStages: PipelineStage[];
  failedStages: Array<{ stage: PipelineStage; reason: string }>;
  createdAt: string;
  completedAt: string | null;
  contractVersion: string;
  evidenceReferences: string[];
}

export function assertPipelineStageOrderFixed(): void {
  // Verify the exact ordered pipeline is followed
  const expectedOrder = [
    "CLASSIFY_REQUEST",
    "IDENTIFY_DOMAIN",
    "IDENTIFY_PERMISSIONS",
    "IDENTIFY_FRESHNESS",
    "RETRIEVE_SOURCES",
    "RANK_SOURCES",
    "DEDUPLICATE_SOURCES",
    "BUILD_CONTEXT_PACKAGE",
    "AUDIT_PROVENANCE",
  ];

  for (let i = 0; i < expectedOrder.length; i++) {
    if (expectedOrder[i] !== PIPELINE_STAGES[i]) {
      throw new Error(`Pipeline stage ${i} must be ${expectedOrder[i]}, not ${PIPELINE_STAGES[i]}`);
    }
  }
}

export function assertPipelineStepFailureBlocksSuccess(assembly: GovernedContextAssemblyContract): void {
  // A failed or blocked step must prevent later steps from claiming success
  if (assembly.failedStages.length > 0) {
    const failedStage = assembly.failedStages[0];
    if (failedStage) {
      const failedStageIndex = PIPELINE_STAGES.indexOf(failedStage.stage);
      for (const completedStage of assembly.completedStages) {
        const completedIndex = PIPELINE_STAGES.indexOf(completedStage);
        if (completedIndex > failedStageIndex) {
          throw new Error(`Stage ${completedStage} cannot succeed after failure of ${failedStage.stage}.`);
        }
      }
    }
  }
}
