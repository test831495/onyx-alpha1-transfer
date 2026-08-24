export const OPERATING_MODES = ["ACTIVE", "LIGHT", "VACATION", "HIBERNATION"] as const;
export type OperatingMode = (typeof OPERATING_MODES)[number];
export const createsAuthority = false as const;

export type AcceptanceFamily = "JOURNEY" | "RECOVERY" | "INTEGRITY" | "ARCHIVE";
export type AcceptanceStatus =
  | "CONTRACT_DEFINED"
  | "POLICY_VALIDATED"
  | "DETERMINISTICALLY_TESTED"
  | "RUNTIME_DEFERRED"
  | "UI_DEFERRED"
  | "NOT_IMPLEMENTED";

export type EvidenceState = "AUTHORITATIVE" | "INCOMPLETE" | "CONFLICTING" | "UNVERIFIED";
export type ContinuityGapType = "MISSING_EVIDENCE" | "CONFLICTING_EVIDENCE" | "UNVERIFIED_SOURCE" | "UNRECORDED_INTERVAL";
export type JourneyEventKind = "MILESTONE" | "ROADMAP_DECISION" | "ARCHITECTURE_DECISION" | "ACCEPTANCE_CHANGE" | "IMPLEMENTATION_OUTCOME" | "POLICY_EXERCISE" | "RECOVERY_EXERCISE";
export type SummaryQuality = "COMPLETE" | "COMPRESSED" | "PARTIAL" | "NOT_RECORDED";
export type RecoveryPackageState = "DESCRIBED" | "ELIGIBLE_PENDING" | "READY_PENDING" | "INVALID" | "NOT_IMPLEMENTED";
export type RecoveryRouteClass = "LOCAL" | "OFFLINE" | "REMOTE_SUPPLEMENT";
export type SanitizationContentClass = "SAFE_METADATA" | "PRIVATE_DATA" | "CREDENTIAL_MATERIAL" | "UNKNOWN_SENSITIVE_CONTENT";
export type SanitizationDecision = "ALLOWED_METADATA_ONLY" | "DENIED_PRIVATE_DATA" | "DENIED_CREDENTIALS" | "DENIED_UNKNOWN";
export type IntegrityState = "EXPECTED" | "UNVERIFIED" | "CORRUPT" | "MALFORMED" | "NOT_IMPLEMENTED";
export type CopyHealthState = "AVAILABLE_PROJECTION" | "UNAVAILABLE" | "STALE" | "CONFLICTING" | "NOT_VERIFIED";
export type ArchiveSetHealth = "HEALTHY_PROJECTION" | "DEGRADED" | "CRITICAL" | "UNVERIFIED";
export type StoragePressureState = "NORMAL" | "ELEVATED" | "CRITICAL" | "UNVERIFIED";
export type RetentionDecision = "RETAIN" | "RETAIN_PENDING_REVIEW" | "DEFER" | "DENY_DESTRUCTIVE_ACTION";

export const DEFERRED_CAPABILITIES = [
  "ACTIVE_ENVIRONMENT_OVERWRITE", "AUTOMATIC_SUCCESSION", "CHARACTER_AGENT_GATEWAY_RUNTIME", "CLOUD_UPLOAD", "CONNECTOR_EXECUTION", "CONTINUITY_DASHBOARD", "COPY_HEALTH_EVALUATION", "COUNCIL_RUNTIME", "DESTRUCTIVE_CLEANUP", "DEPLOYMENT", "EVENT_LISTENERS", "EXTERNAL_DRIVE_WRITING", "FILESYSTEM_ARCHIVE_WRITING", "FILESYSTEM_WATCHERS", "GITHUB_WEBHOOKS", "GIT_BUNDLE_GENERATION", "GIT_INTEGRATION", "INFRASTRUCTURE_MUTATION", "INTEGRITY_EVALUATION", "LEGACY_STEWARD_ACTIVATION", "LIVE_JOURNEY_CAPTURE", "MODE_TRANSITION_EXECUTION", "OPERATING_MODE_EVALUATION", "PACKAGE_ELIGIBILITY_EVALUATION", "PRODUCTION_JOURNEY_RETRIEVAL", "PRODUCTION_PERSISTENCE", "PROVIDER_BACKUP_INTEGRATION", "REAL_HASHING", "REAL_RESTORATION", "RECOVERY_DASHBOARD", "RECOVERY_MANIFEST_CONSTRUCTION", "RECOVERY_PACKAGE_GENERATION", "RESTORE_PLAN_EXECUTION", "RETENTION_EVALUATION", "RETENTION_EXECUTION", "SANITIZATION_EVALUATION", "SCHEDULERS", "SECRET_RESTORATION", "SEMANTIC_COMPRESSION", "SEMANTIC_DEDUPLICATION", "SPECIALIST_AGENT_RUNTIME", "STORAGE_PRESSURE_EVALUATION"
] as const;
export type DeferredCapability = (typeof DEFERRED_CAPABILITIES)[number];
export const ACCEPTANCE_IDS = [
  "JOURNEY-001", "JOURNEY-002", "JOURNEY-003", "JOURNEY-004", "JOURNEY-005", "JOURNEY-006", "JOURNEY-007", "JOURNEY-008",
  "JOURNEY-009", "JOURNEY-010", "JOURNEY-011", "JOURNEY-012", "JOURNEY-013", "JOURNEY-014", "JOURNEY-015", "JOURNEY-016",
  "RECOVERY-001", "RECOVERY-002", "RECOVERY-003", "RECOVERY-004", "RECOVERY-005", "RECOVERY-006", "RECOVERY-007", "RECOVERY-008",
  "RECOVERY-009", "RECOVERY-010", "RECOVERY-011", "RECOVERY-012", "RECOVERY-013", "RECOVERY-014", "RECOVERY-015", "RECOVERY-016",
  "RECOVERY-017", "RECOVERY-018", "RECOVERY-019", "RECOVERY-020",
  "INTEGRITY-001", "INTEGRITY-002", "INTEGRITY-003", "INTEGRITY-004", "INTEGRITY-005", "INTEGRITY-006", "INTEGRITY-007", "INTEGRITY-008",
  "INTEGRITY-009", "INTEGRITY-010", "INTEGRITY-011", "INTEGRITY-012", "INTEGRITY-013", "INTEGRITY-014", "INTEGRITY-015", "INTEGRITY-016",
  "ARCHIVE-001", "ARCHIVE-002", "ARCHIVE-003", "ARCHIVE-004", "ARCHIVE-005", "ARCHIVE-006", "ARCHIVE-007", "ARCHIVE-008",
  "ARCHIVE-009", "ARCHIVE-010", "ARCHIVE-011", "ARCHIVE-012", "ARCHIVE-013", "ARCHIVE-014", "ARCHIVE-015", "ARCHIVE-016"
] as const;
export type AcceptanceId = (typeof ACCEPTANCE_IDS)[number];
export type ExternalDependencyIdentifier =
  | "B3-OPERATING-MODES"
  | "PRIMARY-OWNER-AUTHORITY"
  | "APPROVAL-ENGINE-FAIL-CLOSED"
  | "HOUSEHOLD-PRIVACY-ISOLATION"
  | "PROJECT-JOURNEY-OWNER-ONLY"
  | "DIGITAL-CONTINUITY-POLICY";
export type DependencyIdentifier = AcceptanceId | ExternalDependencyIdentifier;

export interface TechnicalInformationMetadata {
  available: boolean;
  defaultVisible: false;
  notes: string;
}

export interface NonAuthorityMarker { createsAuthority: false; }
export type EvidenceSourceClass = "REPOSITORY_RECORD" | "OWNER_RECORD" | "SYNTHETIC_FIXTURE" | "UNKNOWN";
export type PrivacyClassification = "OWNER_ONLY" | "CURATED_BASIC" | "SAFE_METADATA";
export interface OwnerOnlyAccessMetadata extends NonAuthorityMarker {
  ownerOnly: boolean;
  accessClassification: "OWNER_ONLY" | "CURATED_BASIC";
  authenticationRequired: "DESCRIPTIVE_ONLY";
  defaultDisclosure: "RESTRICTED" | "CURATED";
  restrictedView: "DENY_UNAUTHORIZED_DETAIL" | "SHOW_CURATED_BASIC";
  technicalInformation: TechnicalInformationMetadata;
}
export interface EvidenceSourceDescriptor extends NonAuthorityMarker {
  sourceKind: EvidenceSourceClass;
  sourceId: string;
  capturedAt?: string;
  trust: "AUTHORITATIVE" | "UNVERIFIED" | "CONFLICTING";
}
export interface AuthoritativeEvidenceReference extends NonAuthorityMarker {
  evidenceReferenceId: string;
  sourceClass: EvidenceSourceClass;
  sourceLocator: string;
  sequence: number;
  verificationState: "AUTHORITATIVE" | "UNVERIFIED" | "CONFLICTING";
  continuityGapType?: ContinuityGapType;
  privacyClassification: PrivacyClassification;
  ownerOnly: boolean;
  technicalInformation: TechnicalInformationMetadata;
}
export interface ProvenanceDescriptor extends NonAuthorityMarker {
  recordedBy: string;
  reason: string;
  evidence: readonly EvidenceSourceDescriptor[];
}
export interface ContinuityGap extends NonAuthorityMarker { type: ContinuityGapType; explanation: string; }
export interface CorrectionSupersessionDescriptor extends NonAuthorityMarker {
  correctedRecordReference: string;
  supersedingRecordReference: string;
  reasonCategory: "MISSING_EVIDENCE" | "CONFLICT_RESOLUTION" | "OWNER_CORRECTION" | "POLICY_CORRECTION";
  provenanceReference: string;
  correctionSequence: number;
  preservesPriorRecord: true;
  ownerOnly: boolean;
  technicalInformation: TechnicalInformationMetadata;
}
export interface JourneyRecordDescriptor extends NonAuthorityMarker {
  recordId: string;
  eventKind: JourneyEventKind;
  evidenceState: EvidenceState;
  summaryQuality: SummaryQuality;
  title: string;
  ownerOnly: boolean;
  privacyClass: "OWNER_ONLY" | "CURATED_BASIC";
  attribution: string;
  provenance: ProvenanceDescriptor;
  authoritativeEvidence?: readonly AuthoritativeEvidenceReference[];
  continuityGaps: readonly ContinuityGap[];
  access: OwnerOnlyAccessMetadata;
  correction?: CorrectionSupersessionDescriptor;
  supersedes?: string;
}
export interface ExpectedArtifactDescriptor extends NonAuthorityMarker {
  artifactId: string;
  artifactClass: "CONTRACT" | "SAFE_METADATA" | "SYNTHETIC_FIXTURE";
  integrityState: IntegrityState;
  ownerOnly: boolean;
}
export interface RecoveryPackageDescriptor extends NonAuthorityMarker {
  packageId: string;
  state: RecoveryPackageState;
  contentsPolicy: "SAFE_METADATA_ONLY" | "PROHIBITED_CONTENT_PRESENT" | "UNVERIFIED";
  routes: readonly RecoveryRouteClass[];
  providerIndependent: boolean;
  subscriptionIndependent: boolean;
  internetIndependent: boolean;
  manifestId: string;
  restorePlanId: string;
}
export interface RecoveryManifestDescriptor extends NonAuthorityMarker {
  manifestId: string;
  packageId: string;
  provenanceReferences: readonly string[];
  expectedArtifacts: readonly ExpectedArtifactDescriptor[];
  prohibitedContentStatus: "SAFE_METADATA_ONLY" | "PROHIBITED_CONTENT_PRESENT" | "UNVERIFIED";
  sanitizationDecisionReference: string;
  integrityMetadata: IntegrityManifestDescriptor;
  eligibleRoutes: readonly RecoveryRouteClass[];
  continuityGapReferences: readonly string[];
  ownerOnly: boolean;
}
export interface RestorePlanDescriptor extends NonAuthorityMarker {
  restorePlanId: string;
  sourcePackageReference: string;
  requiredIntegrityState: IntegrityState;
  requiredRoute: "LOCAL" | "OFFLINE";
  blockingContinuityGaps: readonly string[];
  overwritesActiveEnvironment: false;
  requiredExerciseEvidenceReference: string;
  approvalRequirement: "DESCRIPTIVE_ONLY";
  ownerOnly: boolean;
}
export interface IntegrityManifestDescriptor extends NonAuthorityMarker { manifestId: string; expectedArtifacts: readonly string[]; state: IntegrityState; hashing: "DEFERRED"; provenanceReferences?: readonly string[]; }
export interface CopyReceiptDescriptor extends NonAuthorityMarker { receiptId: string; route: RecoveryRouteClass; health: CopyHealthState; syntheticProjection: true; }
export interface ArchiveSetDescriptor extends NonAuthorityMarker { archiveSetId: string; health: ArchiveSetHealth; storagePressure: StoragePressureState; retention: RetentionDecision; operatingMode: OperatingMode; }
export interface SanitizationDescriptor extends NonAuthorityMarker { contentClass: SanitizationContentClass; decision: SanitizationDecision; }

export interface AcceptanceEntry extends NonAuthorityMarker {
  id: string;
  family: AcceptanceFamily;
  friendlyTitle: string;
  userMeaning: string;
  authoritativeRequirement: string;
  contractStatus: AcceptanceStatus;
  runtimeStatus: AcceptanceStatus;
  uiStatus: AcceptanceStatus;
  contractLocation: string;
  plannedImplementationLocation: string;
  plannedTestMapping: string;
  plannedEvidenceMapping: string;
  dependencies: readonly DependencyIdentifier[];
  deferredCapabilities: readonly DeferredCapability[];
  failClosedRequirement: string;
  ownerOnly?: boolean;
  technicalInformation: TechnicalInformationMetadata;
}

export interface RegistryValidationResult {
  valid: boolean;
  totalCount: number;
  familyCounts: Record<AcceptanceFamily, number>;
  duplicateIds: string[];
  missingIds: string[];
  unexpectedIds: string[];
  invalidOrder: string[];
  invalidEntries: string[];
  statusViolations: string[];
  authorityViolations: string[];
  runtimeViolations: string[];
  uiViolations: string[];
  prohibitedImplementationViolations: string[];
  invalidContractLocations: string[];
  invalidImplementationMappings: string[];
  invalidTestMappings: string[];
  invalidEvidenceMappings: string[];
  invalidDependencyIdentifiers: string[];
  duplicateDependencies: string[];
  nondeterministicDependencies: string[];
  selfDependencies: string[];
  invalidDeferredCapabilities: string[];
  duplicateDeferredCapabilities: string[];
  nondeterministicDeferredCapabilities: string[];
}