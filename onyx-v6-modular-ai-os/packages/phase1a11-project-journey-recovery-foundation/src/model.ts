export const OPERATING_MODES = ["ACTIVE", "LIGHT", "VACATION", "HIBERNATION"] as const;
export type OperatingMode = (typeof OPERATING_MODES)[number];
export const createsAuthority = false as const;

export type AcceptanceFamily = "JOURNEY" | "RECOVERY" | "INTEGRITY" | "ARCHIVE" | "CAPTURE" | "CONTINUITY" | "COMPLETENESS";
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
  "ARCHIVE-009", "ARCHIVE-010", "ARCHIVE-011", "ARCHIVE-012", "ARCHIVE-013", "ARCHIVE-014", "ARCHIVE-015", "ARCHIVE-016",
  "CAPTURE-001", "CAPTURE-002", "CAPTURE-003", "CAPTURE-004", "CAPTURE-005", "CAPTURE-006", "CAPTURE-007", "CAPTURE-008",
  "CAPTURE-009", "CAPTURE-010", "CAPTURE-011", "CAPTURE-012", "CAPTURE-013", "CAPTURE-014", "CAPTURE-015", "CAPTURE-016",
  "CAPTURE-017", "CAPTURE-018", "CAPTURE-019", "CAPTURE-020", "CAPTURE-021", "CAPTURE-022", "CAPTURE-023", "CAPTURE-024",
  "COMPLETENESS-001", "COMPLETENESS-002", "COMPLETENESS-003", "COMPLETENESS-004", "COMPLETENESS-005", "COMPLETENESS-006",
  "COMPLETENESS-007", "COMPLETENESS-008", "COMPLETENESS-009", "COMPLETENESS-010"
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
  readonly available: boolean;
  readonly defaultVisible: false;
  readonly notes: string;
}

export interface NonAuthorityMarker { readonly createsAuthority: false; }
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

export type ContinuityState =
  | "COMPLETE_CONTINUITY"
  | "PARTIAL_CONTINUITY"
  | "GAP_PRESENT"
  | "INSUFFICIENT_EVIDENCE"
  | "CONFLICTED_CONTINUITY"
  | "UNKNOWN_CONTINUITY"
  | "MALFORMED_ASSESSMENT";
export type EvidenceSufficiencyState =
  | "SUFFICIENT"
  | "PARTIALLY_SUFFICIENT"
  | "INSUFFICIENT"
  | "MISSING"
  | "PROHIBITED"
  | "STALE"
  | "CONFLICTED"
  | "NOT_ASSESSABLE";
export type HistoricalConfidenceBand =
  | "HIGH_CONFIDENCE"
  | "MEDIUM_CONFIDENCE"
  | "LOW_CONFIDENCE"
  | "UNVERIFIED"
  | "CONFLICTED"
  | "NOT_ASSESSABLE";
export type JourneyProjectionPurpose =
  | "PROJECT_PHASE_HISTORY"
  | "ARCHITECTURE_HISTORY"
  | "IMPLEMENTATION_HISTORY"
  | "VALIDATION_HISTORY"
  | "DECISION_HISTORY"
  | "RELEASE_HISTORY"
  | "RECOVERY_HISTORY"
  | "CONTINUITY_SUMMARY";
export type ProjectionEligibilityState =
  | "ELIGIBLE"
  | "PARTIALLY_ELIGIBLE"
  | "OWNER_REVIEW_REQUIRED"
  | "DENIED"
  | "UNVERIFIED"
  | "MALFORMED";
export type ContinuitySensitivityClass =
  | "PUBLIC_PROJECT_METADATA"
  | "HOUSEHOLD_SAFE_METADATA"
  | "OWNER_PRIVATE_PROJECT_HISTORY"
  | "SECURITY_SENSITIVE_METADATA"
  | "CREDENTIAL_ADJACENT_METADATA"
  | "PROHIBITED_SECRET_CONTENT"
  | "PROHIBITED_PRIVATE_HOUSEHOLD_CONTENT"
  | "PROHIBITED_CAMERA_OR_BIOMETRIC_CONTENT"
  | "UNKNOWN_SENSITIVITY";

export type RecoveryMetadataKind =
  | "RECOVERY_DESCRIPTOR"
  | "ARTIFACT_REFERENCE"
  | "EVIDENCE_REFERENCE"
  | "VALIDATION_DESCRIPTOR";

export type RecoveryArtifactClass =
  | "JOURNEY_RECORD_SET"
  | "POLICY_METADATA_SET"
  | "IDENTITY_METADATA_SET"
  | "REVOCATION_METADATA_SET"
  | "DEVICE_REGISTRY_METADATA_SET"
  | "TOMBSTONE_METADATA_SET"
  | "MEMORY_SYNC_METADATA_SET"
  | "CONNECTOR_METADATA_SET";

export type RecoveryEvidencePresence =
  | "PRESENT"
  | "MISSING"
  | "STALE"
  | "CONFLICTED"
  | "PROHIBITED"
  | "NOT_ASSESSABLE";

export type RecoveryEvidenceRequirement = "REQUIRED" | "OPTIONAL" | "PROHIBITED";

export interface RecoveryMetadataDescriptor {
  readonly metadataId: string;
  readonly metadataKind: RecoveryMetadataKind;
  readonly classification: string;
  readonly sensitivity: ContinuitySensitivityClass;
  readonly policyVersion: string;
  readonly sourceReference?: string;
  readonly createsAuthority: false;
}

export interface RecoveryArtifactReference {
  readonly referenceId: string;
  readonly artifactClass: RecoveryArtifactClass;
  readonly providerNeutralReference: string;
  readonly sensitivity: ContinuitySensitivityClass;
  readonly createsAuthority: false;
}

export interface RecoveryEvidenceReference {
  readonly evidenceId: string;
  readonly evidenceType: string;
  readonly provenanceReference: string;
  readonly presence: RecoveryEvidencePresence;
  readonly sensitivity: ContinuitySensitivityClass;
  readonly policyVersion: string;
  readonly createsAuthority: false;
}

export interface RecoveryEvidenceExpectation {
  readonly evidenceType: string;
  readonly requirement: RecoveryEvidenceRequirement;
}

export interface RecoveryValidationDescriptor {
  readonly descriptorId: string;
  readonly purpose: string;
  readonly evidenceExpectations: readonly RecoveryEvidenceExpectation[];
  readonly missingEvidenceOutcome: string;
  readonly policyVersion: string;
  readonly createsAuthority: false;
}

export type RecoveryCompletenessGapReason =
  | "REQUIRED_EVIDENCE_MISSING"
  | "REQUIRED_EVIDENCE_STALE"
  | "REQUIRED_EVIDENCE_PROHIBITED"
  | "DEVICE_KEY_ROTATION_EVIDENCE_MISSING"
  | "REMOTE_ERASURE_ACK_MISSING"
  | "BIOMETRIC_DELETION_EVIDENCE_MISSING"
  | "SYNC_INTEGRITY_EVIDENCE_MISSING"
  | "DELETION_TOMBSTONE_EVIDENCE_MISSING"
  | "TRUSTED_TIME_EVIDENCE_MISSING"
  | "APPLICATION_INTEGRITY_EVIDENCE_MISSING"
  | "REVOCATION_EVIDENCE_MISSING"
  | "RESTORATION_DEPENDENCY_UNRESOLVED"
  | "PORTABILITY_EVIDENCE_MISSING"
  | "CRYPTOGRAPHIC_MIGRATION_EVIDENCE_MISSING"
  | "EVIDENCE_NOT_ASSESSABLE";

export type RecoveryRestorationStage =
  | "TRUST_ANCHORS_AND_CRYPTO_POLICY"
  | "HOUSEHOLD_IDENTITIES_AND_MEMBERSHIPS"
  | "REVOCATIONS_AND_INCIDENTS"
  | "ROLES_AND_CURRENT_AUTHORIZATION_POLICIES"
  | "DEVICE_REGISTRY_AND_SUPPORTED_CLIENT_POLICY"
  | "SESSIONS_INVALIDATED_HISTORY_ONLY"
  | "APPROVAL_AND_CONSUMPTION_STATE"
  | "DELETION_TOMBSTONES"
  | "MEMORY_AND_SYNCHRONIZATION_METADATA"
  | "CONNECTORS_OPTIONAL_RUNTIME_SERVICES_LAST";

export type RecoveryProhibitedContentClass =
  | "PASSWORDS"
  | "PINS"
  | "PASSKEYS"
  | "SESSION_AND_APPROVAL_TOKENS"
  | "OAUTH_CREDENTIALS"
  | "CONNECTOR_AND_API_SECRETS"
  | "DEVICE_PRIVATE_KEYS"
  | "RAW_BIOMETRIC_DATA_OR_TEMPLATES"
  | "RAW_CAMERA_FOOTAGE"
  | "DECRYPTED_CACHES"
  | "SENSITIVE_NOTIFICATION_CONTENT"
  | "UNRESTRICTED_PRIVATE_PROMPTS"
  | "RAW_HOUSEHOLD_PRIVATE_PAYLOADS";

export type RecoveryPortabilityEvidenceClass =
  | "PROVIDER_EXIT_READINESS"
  | "FORMAT_COMPATIBILITY"
  | "SOURCE_PROVENANCE"
  | "TARGET_COMPATIBILITY";

export type RecoveryCryptoMigrationClass =
  | "POLICY_TRANSITION"
  | "ALGORITHM_CLASS_TRANSITION"
  | "KEY_LIFECYCLE_TRANSITION_EVIDENCE"
  | "COMPATIBILITY_EVIDENCE";

export type RecoveryDeviceLifecycleEvidenceClass =
  | "TERMINAL_DECOMMISSIONING"
  | "DEVICE_REVOCATION"
  | "DEVICE_KEY_ROTATION"
  | "REPLACEMENT_DEVICE_NEW_KEY"
  | "REMOTE_ERASURE_ACKNOWLEDGEMENT"
  | "BIOMETRIC_DELETION"
  | "APPLICATION_INTEGRITY"
  | "SYNC_INTEGRITY"
  | "DELETION_TOMBSTONE";

export type RecoveryCompletenessAssessmentState =
  | "COMPLETE_FOR_METADATA_SCOPE"
  | "INCOMPLETE_VISIBLE_GAPS"
  | "NOT_ASSESSABLE"
  | "REJECTED_PROHIBITED_CONTENT";

export type RecoveryEvidencePrecedenceResult =
  | "NO_OVERRIDE_REQUIRED"
  | "TOMBSTONE_PRECEDENCE_APPLIED"
  | "REVOCATION_PRECEDENCE_APPLIED"
  | "TOMBSTONE_AND_REVOCATION_PRECEDENCE_APPLIED";

export interface RecoveryCompletenessGap {
  readonly requirementId: string;
  readonly reason: RecoveryCompletenessGapReason;
  readonly evidenceReference?: string;
  readonly createsAuthority: false;
}

export interface RecoveryRestorationDependency {
  readonly stage: RecoveryRestorationStage;
  readonly dependsOnStage: RecoveryRestorationStage;
  readonly unresolvedGapReason: "RESTORATION_DEPENDENCY_UNRESOLVED";
  readonly createsAuthority: false;
}

export interface RecoveryProhibitedContentDescriptor {
  readonly findingId: string;
  readonly contentClass: RecoveryProhibitedContentClass;
  readonly disposition: "PROHIBITED";
  readonly evidenceReference?: string;
  readonly createsAuthority: false;
}

export interface RecoveryPortabilityEvidence {
  readonly evidenceId: string;
  readonly evidenceClass: RecoveryPortabilityEvidenceClass;
  readonly presence: RecoveryEvidencePresence;
  readonly policyVersion: string;
  readonly providerNeutralReference: string;
  readonly createsAuthority: false;
}

export interface RecoveryCryptoMigrationEvidence {
  readonly evidenceId: string;
  readonly migrationClass: RecoveryCryptoMigrationClass;
  readonly presence: RecoveryEvidencePresence;
  readonly policyVersion: string;
  readonly evidenceReference: string;
  readonly createsAuthority: false;
}

export interface RecoveryDeviceLifecycleEvidence {
  readonly evidenceId: string;
  readonly lifecycleClass: RecoveryDeviceLifecycleEvidenceClass;
  readonly presence: RecoveryEvidencePresence;
  readonly policyVersion: string;
  readonly evidenceReference: string;
  readonly createsAuthority: false;
}

export interface RecoveryCompletenessAssessmentInput {
  readonly gaps: readonly RecoveryCompletenessGap[];
  readonly restorationDependencies: readonly RecoveryRestorationDependency[];
  readonly prohibitedContentFindings: readonly RecoveryProhibitedContentDescriptor[];
  readonly portabilityEvidence: readonly RecoveryPortabilityEvidence[];
  readonly cryptoMigrationEvidence: readonly RecoveryCryptoMigrationEvidence[];
  readonly deviceLifecycleEvidence: readonly RecoveryDeviceLifecycleEvidence[];
  readonly tombstoneReferences: readonly string[];
  readonly revocationReferences: readonly string[];
  readonly blockedByReferences: readonly string[];
  readonly policyVersion: string;
  readonly createsAuthority: false;
}

export interface RecoveryCompletenessAssessment {
  readonly state: RecoveryCompletenessAssessmentState;
  readonly gaps: readonly RecoveryCompletenessGap[];
  readonly blockedByReferences: readonly string[];
  readonly prohibitedContentFindingIds: readonly string[];
  readonly precedenceResult: RecoveryEvidencePrecedenceResult;
  readonly policyVersion: string;
  readonly createsAuthority: false;
}
export type SafeNextActionValue =
  | "KEEP_EVIDENCE_VISIBLE_WITH_PROVENANCE"
  | "KEEP_GAPS_VISIBLE"
  | "REQUEST_OWNER_REVIEW"
  | "DENY_PROHIBITED_CONTENT"
  | "REQUIRE_FRESH_PROVENANCE"
  | "DO_NOT_CREATE_AUTHORITY";
export type EvidenceFreshnessState =
  | "CURRENT"
  | "STALE"
  | "MATERIALLY_CHANGED"
  | "UNKNOWN_FRESHNESS";

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

export interface ContinuityRequirement {
  readonly id: string;
  readonly required: boolean;
  readonly title: string;
  readonly mandatory?: boolean;
  readonly evidenceTypes?: readonly string[];
  readonly provenanceRequired?: boolean;
}

export interface ContinuityEvidenceRecord extends NonAuthorityMarker {
  readonly id: string;
  readonly requirementId: string;
  readonly sourceKind: string;
  readonly compatible: boolean;
  readonly precedence: string;
  readonly provenance: string;
  readonly sensitivity: ContinuitySensitivityClass | string;
  readonly ownerOnly: boolean;
  readonly freshness: EvidenceFreshnessState;
}

export interface ContinuityAssessmentInput {
  readonly requirements: readonly ContinuityRequirement[];
  readonly evidence: readonly ContinuityEvidenceRecord[];
  readonly gaps?: readonly unknown[];
  readonly conflicts?: readonly unknown[];
  readonly sensitivity: ContinuitySensitivityClass | string;
  readonly ownerScopeVerified: boolean;
  readonly canonicalPrimaryOwner: boolean;
  readonly policyVersion: string;
}

export interface ContinuityAssessmentResult extends NonAuthorityMarker {
  readonly continuityState: ContinuityState;
  readonly missingEvidence: boolean;
  readonly hasConflicts: boolean;
  readonly policyVersion: string;
}

export interface EvidenceSufficiencyAssessmentResult extends NonAuthorityMarker {
  readonly state: EvidenceSufficiencyState;
  readonly missingEvidence: boolean;
  readonly policyVersion: string;
}

export interface HistoricalConfidenceAssessmentResult extends NonAuthorityMarker {
  readonly band: HistoricalConfidenceBand;
  readonly policyVersion: string;
}

export interface ProjectionEligibilityAssessmentResult extends NonAuthorityMarker {
  readonly eligibility: ProjectionEligibilityState;
  readonly policyVersion: string;
}

export interface ProjectionProvenanceAssessmentResult extends NonAuthorityMarker {
  readonly valid: boolean;
  readonly policyVersion: string;
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