import type { AcceptanceFamily, ArchiveSetHealth, CopyHealthState, ContinuityGapType, EvidenceState, IntegrityState, JourneyEventKind, OperatingMode, RecoveryPackageState, RecoveryRouteClass, RetentionDecision, SanitizationDecision, StoragePressureState, SummaryQuality } from "./model";
import type { RecoveryArtifactClass, RecoveryEvidencePresence, RecoveryEvidenceRequirement, RecoveryMetadataKind } from "./model";
import type { RecoveryCompletenessAssessmentState, RecoveryCompletenessGapReason, RecoveryCryptoMigrationClass, RecoveryDeviceLifecycleEvidenceClass, RecoveryEvidencePrecedenceResult, RecoveryPortabilityEvidenceClass, RecoveryProhibitedContentClass, RecoveryRestorationStage } from "./model";
import type { RecoveryMetadataValidationState } from "./recovery-metadata";
import { boundedFreeze } from "./capture-policy";
import { RECOVERY_COMPLETENESS_ASSESSMENT_STATES, RECOVERY_COMPLETENESS_GAP_REASONS, RECOVERY_CRYPTO_MIGRATION_CLASSES, RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASSES, RECOVERY_EVIDENCE_PRECEDENCE_RESULTS, RECOVERY_PORTABILITY_EVIDENCE_CLASSES, RECOVERY_PROHIBITED_CONTENT_CLASSES, RECOVERY_RESTORATION_STAGES } from "./recovery-completeness-policy";

export interface FriendlyLabel {
  readonly title: string;
  readonly explanation: string;
  readonly safeNextAction: string;
  readonly severity: "INFO" | "NOTICE" | "WARNING" | "CRITICAL";
  readonly technicalInformation: { readonly available: boolean; readonly defaultVisible: false; readonly notes: string };
  readonly createsAuthority: false;
}

const label = (title: string, explanation: string, safeNextAction: string, severity: FriendlyLabel["severity"] = "INFO"): FriendlyLabel => boundedFreeze({
  title,
  explanation,
  safeNextAction,
  severity,
  technicalInformation: { available: true, defaultVisible: false, notes: "Technical Information is shown only when policy permits." },
  createsAuthority: false
});

export const FRIENDLY_LABELS = boundedFreeze({
  COMPLETENESS: label("Recovery metadata completeness", "Recovery metadata describes references and expectations without performing recovery.", "Keep recovery deferred until separately authorized."),
  AUTHORITATIVE: label("Authoritative record", "This record has an identified trusted source.", "Review the source when you need technical detail."),
  INCOMPLETE: label("Incomplete evidence", "Some supporting evidence is missing.", "Treat the gap as unresolved and seek an authoritative record.", "WARNING"),
  CONFLICTING: label("Conflicting evidence", "Sources disagree, so history is not silently resolved.", "Review the sources before relying on this record.", "WARNING"),
  UNVERIFIED: label("Not verified", "The available information cannot currently be confirmed.", "Do not treat this as proof of an operation.", "WARNING"),
  NOT_VERIFIED: label("Not verified", "The available information cannot currently be confirmed.", "Do not treat this as proof of an operation.", "WARNING"),
  MISSING_EVIDENCE: label("Continuity gap", "A historical interval has no recorded supporting evidence.", "Leave the gap visible and record new evidence separately.", "WARNING"),
  CONFLICTING_EVIDENCE: label("Evidence conflict", "Recorded sources do not agree.", "Preserve both sources and request review.", "WARNING"),
  UNVERIFIED_SOURCE: label("Source not verified", "The source identity or reliability is not established.", "Do not use it as authoritative history.", "WARNING"),
  UNRECORDED_INTERVAL: label("Unrecorded interval", "No historical record is available for this interval.", "Mark it as not recorded rather than reconstructing it.", "NOTICE"),
  MILESTONE: label("Milestone", "A project milestone is described without granting authority.", "Review its provenance."),
  ROADMAP_DECISION: label("Roadmap decision", "A roadmap choice is preserved with its reason.", "Review the decision evidence."),
  ARCHITECTURE_DECISION: label("Architecture decision", "An architecture choice is preserved with provenance.", "Review the decision evidence."),
  ACCEPTANCE_CHANGE: label("Acceptance change", "A requirement or acceptance record changed with history preserved.", "Review the supersession chain."),
  IMPLEMENTATION_OUTCOME: label("Implementation outcome", "A reported outcome is described, not independently proven.", "Check authoritative evidence before relying on it."),
  POLICY_EXERCISE: label("Policy exercise", "A policy exercise is recorded as historical information.", "Do not treat it as live authorization."),
  RECOVERY_EXERCISE: label("Recovery exercise", "A recovery exercise record is described without claiming recoverability.", "Review its evidence and limitations."),
  COMPLETE: label("Complete summary", "The available summary is marked complete for its declared scope.", "Review provenance if needed."),
  COMPRESSED: label("Compressed summary", "The history is shortened and may omit detail.", "Use the detailed owner view when permitted."),
  PARTIAL: label("Partial summary", "Only part of the expected history is available.", "Keep the missing portion visible.", "WARNING"),
  NOT_RECORDED: label("Not recorded", "No historical fact is asserted for this item.", "Do not infer what happened.", "NOTICE"),
  DESCRIBED: label("Package described", "A package contract is described; no package has been created.", "Treat this as a contract only."),
  ELIGIBLE_PENDING: label("Eligibility pending", "Eligibility is a future policy result, not restore permission.", "Await a separately authorized policy evaluation."),
  READY_PENDING: label("Readiness pending", "Readiness has not been established by runtime evidence.", "Do not begin restoration."),
  INVALID: label("Invalid package", "The package description cannot be accepted.", "Keep it unavailable and investigate the evidence.", "CRITICAL"),
  NOT_IMPLEMENTED: label("Not implemented", "This capability is intentionally deferred.", "Do not represent it as operational.", "NOTICE"),
  LOCAL: label("Local route", "A local route is part of the future recovery contract.", "Do not infer that a local copy exists."),
  OFFLINE: label("Offline route", "An offline route is part of the future recovery contract.", "Do not infer that an offline copy exists."),
  REMOTE_SUPPLEMENT: label("Remote supplement", "A remote route may supplement local and offline routes.", "Keep local and offline routes mandatory."),
  EXPECTED: label("Integrity expected", "Expected artifact metadata is described without performing hashing.", "Wait for authoritative verification."),
  CORRUPT: label("Corrupt package", "The projection indicates integrity cannot be trusted.", "Block restoration until authoritative evidence exists.", "CRITICAL"),
  MALFORMED: label("Malformed integrity evidence", "Integrity metadata is not usable.", "Fail closed and request corrected evidence.", "CRITICAL"),
  AVAILABLE_PROJECTION: label("Copy available (projection)", "A synthetic status projection describes a copy route.", "Do not treat this as proof that a copy exists."),
  UNAVAILABLE: label("Copy unavailable", "No usable copy evidence is available for this route.", "Preserve the continuity gap.", "WARNING"),
  STALE: label("Copy evidence stale", "The receipt may no longer describe current state.", "Require fresh authoritative evidence.", "WARNING"),
  HEALTHY_PROJECTION: label("Archive health projected", "The archive set is described as healthy for contract purposes.", "Do not infer archive recoverability."),
  DEGRADED: label("Archive set degraded", "One or more archive conditions need attention.", "Preserve local and offline routes and review evidence.", "WARNING"),
  CRITICAL: label("Critical storage pressure", "The projection indicates urgent storage policy attention.", "Use a reversible, non-destructive policy review.", "CRITICAL"),
  NORMAL: label("Storage pressure normal", "No elevated pressure is represented in this projection.", "Continue observing policy state."),
  ELEVATED: label("Storage pressure elevated", "Storage policy attention may be needed.", "Review configurable limits without deleting data.", "WARNING"),
  RETAIN: label("Retain", "Retention policy describes keeping the record.", "Keep the decision auditable."),
  RETAIN_PENDING_REVIEW: label("Retention review pending", "Retention requires a future policy review.", "Do not delete or overwrite data."),
  DEFER: label("Retention deferred", "No retention action is represented.", "Preserve the current record."),
  DENY_DESTRUCTIVE_ACTION: label("Destructive action denied", "Destructive cleanup is not implemented and is denied.", "Keep data intact and review policy.", "CRITICAL"),
  ALLOWED_METADATA_ONLY: label("Safe metadata only", "Only non-secret metadata is permitted by this contract.", "Keep private and sensitive content out."),
  DENIED_PRIVATE_DATA: label("Private data denied", "Private data is outside the safe recovery boundary.", "Remove it without exposing its contents.", "CRITICAL"),
  DENIED_CREDENTIALS: label("Credentials denied", "Credential material is never part of this foundation.", "Do not store or display it.", "CRITICAL"),
  DENIED_UNKNOWN: label("Unknown content denied", "Unknown sensitive content fails closed.", "Keep it excluded until policy classifies it.", "CRITICAL"),
  ACTIVE: label("Active mode", "Normal governed operation is described by the B3 mode contract.", "Follow server-authoritative policy."),
  LIGHT: label("Light mode", "Reduced governed operation is described by the B3 mode contract.", "Follow server-authoritative policy."),
  VACATION: label("Vacation mode", "Only the B3-defined critical and owner-only scope is described.", "Follow server-authoritative policy."),
  HIBERNATION: label("Hibernation mode", "Only the B3-defined critical and owner-only scope is described.", "Follow server-authoritative policy.")
} as const satisfies Record<string, FriendlyLabel>);

export const OPERATING_MODE_LABELS: Readonly<Record<OperatingMode, FriendlyLabel>> = boundedFreeze({
  ACTIVE: FRIENDLY_LABELS.ACTIVE,
  LIGHT: FRIENDLY_LABELS.LIGHT,
  VACATION: FRIENDLY_LABELS.VACATION,
  HIBERNATION: FRIENDLY_LABELS.HIBERNATION
});

export const RECOVERY_METADATA_LABELS = boundedFreeze({
  RECOVERY_DESCRIPTOR: label("Recovery descriptor", "A bounded description of recovery metadata.", "Treat this as descriptive metadata only."),
  ARTIFACT_REFERENCE: label("Artifact reference", "A provider-neutral reference without artifact access.", "Do not retrieve or restore the artifact."),
  EVIDENCE_REFERENCE: label("Evidence reference", "A reference that preserves evidence identity and presence.", "Keep missing or prohibited evidence visible."),
  VALIDATION_DESCRIPTOR: label("Validation descriptor", "A description of evidence expectations.", "Do not treat expectations as validation or authorization."),
  PRESENT: label("Evidence present", "Evidence presence is recorded by reference only.", "Review its provenance."),
  MISSING: label("Evidence missing", "No evidence is recorded for this reference.", "Keep the gap visible." , "WARNING"),
  STALE: label("Evidence stale", "Recorded evidence is marked stale.", "Require fresh provenance." , "WARNING"),
  CONFLICTED: label("Evidence conflicted", "Evidence references disagree.", "Preserve the conflict for review." , "WARNING"),
  PROHIBITED: label("Evidence prohibited", "The evidence class is outside this boundary.", "Keep prohibited content excluded." , "CRITICAL"),
  NOT_ASSESSABLE: label("Evidence not assessable", "The evidence state cannot be safely assessed.", "Keep the result unresolved." , "WARNING"),
  REQUIRED: label("Required evidence", "This evidence expectation is required.", "Keep absence visible."),
  OPTIONAL: label("Optional evidence", "This evidence may support an assessment but is not required.", "Do not treat it as required."),
  PROHIBITED_EXPECTATION: label("Prohibited evidence", "This evidence class must remain outside the boundary.", "Do not accept or collect it.", "CRITICAL"),
});

export const RECOVERY_METADATA_KIND_LABELS: Readonly<Record<RecoveryMetadataKind, FriendlyLabel>> = boundedFreeze({
  RECOVERY_DESCRIPTOR: RECOVERY_METADATA_LABELS.RECOVERY_DESCRIPTOR,
  ARTIFACT_REFERENCE: RECOVERY_METADATA_LABELS.ARTIFACT_REFERENCE,
  EVIDENCE_REFERENCE: RECOVERY_METADATA_LABELS.EVIDENCE_REFERENCE,
  VALIDATION_DESCRIPTOR: RECOVERY_METADATA_LABELS.VALIDATION_DESCRIPTOR,
});
export const RECOVERY_ARTIFACT_LABELS: Readonly<Record<RecoveryArtifactClass, FriendlyLabel>> = boundedFreeze({
  JOURNEY_RECORD_SET: label("Journey record set", "A reference to Journey metadata only.", "Do not retrieve or restore its contents."),
  POLICY_METADATA_SET: label("Policy metadata set", "A reference to policy metadata only.", "Treat it as descriptive metadata."),
  IDENTITY_METADATA_SET: label("Identity metadata set", "A reference to identity metadata only.", "Do not infer identity authority."),
  REVOCATION_METADATA_SET: label("Revocation metadata set", "A reference to revocation metadata only.", "Preserve revocation boundaries."),
  DEVICE_REGISTRY_METADATA_SET: label("Device registry metadata set", "A reference to device registry metadata only.", "Do not establish device trust."),
  TOMBSTONE_METADATA_SET: label("Tombstone metadata set", "A reference to deletion metadata only.", "Do not override deletion state."),
  MEMORY_SYNC_METADATA_SET: label("Memory synchronization metadata set", "A reference to synchronization metadata only.", "Do not synchronize or restore data."),
  CONNECTOR_METADATA_SET: label("Connector metadata set", "A reference to connector metadata only.", "Do not connect or retrieve content."),
});
export const RECOVERY_EVIDENCE_PRESENCE_LABELS: Readonly<Record<RecoveryEvidencePresence, FriendlyLabel>> = boundedFreeze({
  PRESENT: RECOVERY_METADATA_LABELS.PRESENT,
  MISSING: RECOVERY_METADATA_LABELS.MISSING,
  STALE: RECOVERY_METADATA_LABELS.STALE,
  CONFLICTED: RECOVERY_METADATA_LABELS.CONFLICTED,
  PROHIBITED: RECOVERY_METADATA_LABELS.PROHIBITED,
  NOT_ASSESSABLE: RECOVERY_METADATA_LABELS.NOT_ASSESSABLE,
});
export const RECOVERY_EVIDENCE_REQUIREMENT_LABELS: Readonly<Record<RecoveryEvidenceRequirement, FriendlyLabel>> = boundedFreeze({
  REQUIRED: RECOVERY_METADATA_LABELS.REQUIRED,
  OPTIONAL: RECOVERY_METADATA_LABELS.OPTIONAL,
  PROHIBITED: RECOVERY_METADATA_LABELS.PROHIBITED_EXPECTATION,
});
export const RECOVERY_METADATA_VALIDATION_LABELS: Readonly<Record<RecoveryMetadataValidationState, FriendlyLabel>> = boundedFreeze({
  VALID: label("Metadata valid", "The supplied metadata matches its closed contract.", "Keep it descriptive and non-authorizing."),
  INVALID: FRIENDLY_LABELS.INVALID,
  MISSING: FRIENDLY_LABELS.MISSING_EVIDENCE,
  PROHIBITED: RECOVERY_METADATA_LABELS.PROHIBITED,
  NOT_ASSESSABLE: RECOVERY_METADATA_LABELS.NOT_ASSESSABLE,
});

export const CONTINUITY_EVIDENCE_LABELS: Readonly<Record<EvidenceState, FriendlyLabel>> = boundedFreeze({ AUTHORITATIVE: FRIENDLY_LABELS.AUTHORITATIVE, INCOMPLETE: FRIENDLY_LABELS.INCOMPLETE, CONFLICTING: FRIENDLY_LABELS.CONFLICTING, UNVERIFIED: FRIENDLY_LABELS.UNVERIFIED });
export const CONTINUITY_GAP_LABELS: Readonly<Record<ContinuityGapType, FriendlyLabel>> = boundedFreeze({ MISSING_EVIDENCE: FRIENDLY_LABELS.MISSING_EVIDENCE, CONFLICTING_EVIDENCE: FRIENDLY_LABELS.CONFLICTING_EVIDENCE, UNVERIFIED_SOURCE: FRIENDLY_LABELS.UNVERIFIED_SOURCE, UNRECORDED_INTERVAL: FRIENDLY_LABELS.UNRECORDED_INTERVAL });
export const JOURNEY_EVENT_LABELS: Readonly<Record<JourneyEventKind, FriendlyLabel>> = boundedFreeze({ MILESTONE: FRIENDLY_LABELS.MILESTONE, ROADMAP_DECISION: FRIENDLY_LABELS.ROADMAP_DECISION, ARCHITECTURE_DECISION: FRIENDLY_LABELS.ARCHITECTURE_DECISION, ACCEPTANCE_CHANGE: FRIENDLY_LABELS.ACCEPTANCE_CHANGE, IMPLEMENTATION_OUTCOME: FRIENDLY_LABELS.IMPLEMENTATION_OUTCOME, POLICY_EXERCISE: FRIENDLY_LABELS.POLICY_EXERCISE, RECOVERY_EXERCISE: FRIENDLY_LABELS.RECOVERY_EXERCISE });
export const SUMMARY_QUALITY_LABELS: Readonly<Record<SummaryQuality, FriendlyLabel>> = boundedFreeze({ COMPLETE: FRIENDLY_LABELS.COMPLETE, COMPRESSED: FRIENDLY_LABELS.COMPRESSED, PARTIAL: FRIENDLY_LABELS.PARTIAL, NOT_RECORDED: FRIENDLY_LABELS.NOT_RECORDED });
export const RECOVERY_PACKAGE_LABELS: Readonly<Record<RecoveryPackageState, FriendlyLabel>> = boundedFreeze({ DESCRIBED: FRIENDLY_LABELS.DESCRIBED, ELIGIBLE_PENDING: FRIENDLY_LABELS.ELIGIBLE_PENDING, READY_PENDING: FRIENDLY_LABELS.READY_PENDING, INVALID: FRIENDLY_LABELS.INVALID, NOT_IMPLEMENTED: FRIENDLY_LABELS.NOT_IMPLEMENTED });
export const INTEGRITY_LABELS: Readonly<Record<IntegrityState, FriendlyLabel>> = boundedFreeze({ EXPECTED: FRIENDLY_LABELS.EXPECTED, UNVERIFIED: FRIENDLY_LABELS.NOT_VERIFIED, CORRUPT: FRIENDLY_LABELS.CORRUPT, MALFORMED: FRIENDLY_LABELS.MALFORMED, NOT_IMPLEMENTED: FRIENDLY_LABELS.NOT_IMPLEMENTED });
export const COPY_HEALTH_LABELS: Readonly<Record<CopyHealthState, FriendlyLabel>> = boundedFreeze({ AVAILABLE_PROJECTION: FRIENDLY_LABELS.AVAILABLE_PROJECTION, UNAVAILABLE: FRIENDLY_LABELS.UNAVAILABLE, STALE: FRIENDLY_LABELS.STALE, CONFLICTING: FRIENDLY_LABELS.CONFLICTING, NOT_VERIFIED: FRIENDLY_LABELS.NOT_VERIFIED });
export const ARCHIVE_HEALTH_LABELS: Readonly<Record<ArchiveSetHealth, FriendlyLabel>> = boundedFreeze({ HEALTHY_PROJECTION: FRIENDLY_LABELS.HEALTHY_PROJECTION, DEGRADED: FRIENDLY_LABELS.DEGRADED, CRITICAL: FRIENDLY_LABELS.CRITICAL, UNVERIFIED: FRIENDLY_LABELS.NOT_VERIFIED });
export const RECOVERY_ROUTE_LABELS: Readonly<Record<RecoveryRouteClass, FriendlyLabel>> = boundedFreeze({ LOCAL: FRIENDLY_LABELS.LOCAL, OFFLINE: FRIENDLY_LABELS.OFFLINE, REMOTE_SUPPLEMENT: FRIENDLY_LABELS.REMOTE_SUPPLEMENT });
export const STORAGE_PRESSURE_LABELS: Readonly<Record<StoragePressureState, FriendlyLabel>> = boundedFreeze({ NORMAL: FRIENDLY_LABELS.NORMAL, ELEVATED: FRIENDLY_LABELS.ELEVATED, CRITICAL: FRIENDLY_LABELS.CRITICAL, UNVERIFIED: FRIENDLY_LABELS.NOT_VERIFIED });
export const RETENTION_LABELS: Readonly<Record<RetentionDecision, FriendlyLabel>> = boundedFreeze({ RETAIN: FRIENDLY_LABELS.RETAIN, RETAIN_PENDING_REVIEW: FRIENDLY_LABELS.RETAIN_PENDING_REVIEW, DEFER: FRIENDLY_LABELS.DEFER, DENY_DESTRUCTIVE_ACTION: FRIENDLY_LABELS.DENY_DESTRUCTIVE_ACTION });
export const SANITIZATION_LABELS: Readonly<Record<SanitizationDecision, FriendlyLabel>> = boundedFreeze({ ALLOWED_METADATA_ONLY: FRIENDLY_LABELS.ALLOWED_METADATA_ONLY, DENIED_PRIVATE_DATA: FRIENDLY_LABELS.DENIED_PRIVATE_DATA, DENIED_CREDENTIALS: FRIENDLY_LABELS.DENIED_CREDENTIALS, DENIED_UNKNOWN: FRIENDLY_LABELS.DENIED_UNKNOWN });
export const ACCEPTANCE_FAMILY_LABELS: Readonly<Record<AcceptanceFamily, FriendlyLabel>> = boundedFreeze({ JOURNEY: FRIENDLY_LABELS.MILESTONE, RECOVERY: FRIENDLY_LABELS.DESCRIBED, INTEGRITY: FRIENDLY_LABELS.EXPECTED, ARCHIVE: FRIENDLY_LABELS.HEALTHY_PROJECTION, CAPTURE: FRIENDLY_LABELS.MILESTONE, CONTINUITY: label("Continuity assessment", "A continuity assessment is described without granting runtime authority or permission.", "Keep evidence visible and do not treat this as an operational decision."), COMPLETENESS: FRIENDLY_LABELS.DESCRIBED });

export const RECOVERY_COMPLETENESS_GAP_REASON_LABELS: Readonly<Record<RecoveryCompletenessGapReason, FriendlyLabel>> = boundedFreeze({
  REQUIRED_EVIDENCE_MISSING: label("Required evidence is missing", "A required recovery evidence reference is missing.", "Keep the gap visible and request the required evidence.", "WARNING"),
  REQUIRED_EVIDENCE_STALE: label("Required evidence is stale", "Required evidence is stale for current recovery completeness assessment.", "Require fresh evidence before relying on this assessment.", "WARNING"),
  REQUIRED_EVIDENCE_PROHIBITED: label("Required evidence is prohibited", "The required evidence class is prohibited in this recovery scope.", "Keep prohibited evidence excluded and unresolved.", "CRITICAL"),
  DEVICE_KEY_ROTATION_EVIDENCE_MISSING: label("Device key rotation evidence is missing", "Device key rotation evidence is missing for recovery completeness.", "Record the gap and request authoritative key-rotation evidence.", "WARNING"),
  REMOTE_ERASURE_ACK_MISSING: label("Remote erasure acknowledgement is missing", "Remote erasure acknowledgement evidence is missing.", "Keep deletion state unresolved until evidence is provided.", "WARNING"),
  BIOMETRIC_DELETION_EVIDENCE_MISSING: label("Biometric deletion evidence is missing", "Biometric deletion evidence is missing for the assessed scope.", "Do not infer deletion without attributable evidence.", "WARNING"),
  SYNC_INTEGRITY_EVIDENCE_MISSING: label("Synchronization integrity evidence is missing", "Synchronization integrity evidence is missing for recovery completeness.", "Keep synchronization integrity unresolved.", "WARNING"),
  DELETION_TOMBSTONE_EVIDENCE_MISSING: label("Deletion tombstone evidence is missing", "Deletion tombstone evidence is missing for the assessed subject.", "Preserve the unresolved deletion gap.", "WARNING"),
  TRUSTED_TIME_EVIDENCE_MISSING: label("Trusted time evidence is missing", "Trusted time evidence required for ordered recovery completeness is missing.", "Do not rely on temporal ordering without trusted-time evidence.", "WARNING"),
  APPLICATION_INTEGRITY_EVIDENCE_MISSING: label("Application integrity evidence is missing", "Application integrity evidence is missing for recovery completeness.", "Keep application integrity unresolved.", "WARNING"),
  REVOCATION_EVIDENCE_MISSING: label("Revocation evidence is missing", "Revocation evidence is missing for authoritative recovery completeness.", "Preserve revocation uncertainty as a visible gap.", "WARNING"),
  RESTORATION_DEPENDENCY_UNRESOLVED: label("Restoration dependency is unresolved", "A restoration prerequisite dependency remains unresolved.", "Do not treat restoration ordering as complete.", "WARNING"),
  PORTABILITY_EVIDENCE_MISSING: label("Portability evidence is missing", "Provider-neutral portability evidence is missing.", "Keep portability readiness unresolved.", "WARNING"),
  CRYPTOGRAPHIC_MIGRATION_EVIDENCE_MISSING: label("Cryptographic migration evidence is missing", "Cryptographic migration evidence is missing in this metadata scope.", "Preserve migration uncertainty and request evidence.", "WARNING"),
  EVIDENCE_NOT_ASSESSABLE: label("Evidence is not assessable", "The evidence cannot be safely assessed under current policy input.", "Keep the result unresolved and request owner review.", "WARNING"),
});

export const RECOVERY_RESTORATION_STAGE_LABELS: Readonly<Record<RecoveryRestorationStage, FriendlyLabel>> = boundedFreeze({
  TRUST_ANCHORS_AND_CRYPTO_POLICY: label("Trust anchors and cryptographic policy", "This stage describes trust anchors and cryptographic policy prerequisites.", "Preserve prerequisite evidence before later stages."),
  HOUSEHOLD_IDENTITIES_AND_MEMBERSHIPS: label("Household identities and memberships", "This stage describes household identity and membership prerequisites.", "Keep identity and membership prerequisites explicit."),
  REVOCATIONS_AND_INCIDENTS: label("Revocations and incidents", "This stage describes revocation and incident prerequisites.", "Preserve revocation evidence before policy interpretation."),
  ROLES_AND_CURRENT_AUTHORIZATION_POLICIES: label("Roles and current authorization policies", "This stage describes role and authorization policy prerequisites.", "Do not infer authorization from recovery metadata."),
  DEVICE_REGISTRY_AND_SUPPORTED_CLIENT_POLICY: label("Device registry and supported client policy", "This stage describes device registry and supported-client policy prerequisites.", "Preserve device policy evidence without creating trust."),
  SESSIONS_INVALIDATED_HISTORY_ONLY: label("Sessions as invalidated history only", "This stage keeps sessions as invalidated historical metadata only.", "Do not reactivate expired or invalidated sessions."),
  APPROVAL_AND_CONSUMPTION_STATE: label("Approval and consumption state", "This stage describes approval and consumption prerequisites.", "Consumed approvals remain consumed."),
  DELETION_TOMBSTONES: label("Deletion tombstones", "This stage describes deletion tombstone prerequisites.", "Deletion tombstones remain authoritative precedence evidence."),
  MEMORY_AND_SYNCHRONIZATION_METADATA: label("Memory and synchronization metadata", "This stage describes memory and synchronization metadata prerequisites.", "Keep synchronization metadata descriptive only."),
  CONNECTORS_OPTIONAL_RUNTIME_SERVICES_LAST: label("Connectors and optional runtime services", "This stage is last and remains descriptive metadata only.", "Do not activate connectors from recovery completeness metadata."),
});

export const RECOVERY_PROHIBITED_CONTENT_CLASS_LABELS: Readonly<Record<RecoveryProhibitedContentClass, FriendlyLabel>> = boundedFreeze({
  PASSWORDS: label("Passwords", "Passwords are prohibited from recovery completeness metadata.", "Keep password material excluded.", "CRITICAL"),
  PINS: label("PINs", "PIN values are prohibited from recovery completeness metadata.", "Keep PIN material excluded.", "CRITICAL"),
  PASSKEYS: label("Passkeys", "Passkey material is prohibited from recovery completeness metadata.", "Keep passkey material excluded.", "CRITICAL"),
  SESSION_AND_APPROVAL_TOKENS: label("Session and approval tokens", "Session and approval tokens are prohibited content.", "Do not include token material in metadata.", "CRITICAL"),
  OAUTH_CREDENTIALS: label("OAuth credentials", "OAuth credentials are prohibited content.", "Exclude OAuth credential payloads.", "CRITICAL"),
  CONNECTOR_AND_API_SECRETS: label("Connector and API secrets", "Connector and API secrets are prohibited content.", "Exclude secret payloads and keep boundaries enforced.", "CRITICAL"),
  DEVICE_PRIVATE_KEYS: label("Device private keys", "Device private keys are prohibited from this metadata scope.", "Never include private keys in recovery completeness metadata.", "CRITICAL"),
  RAW_BIOMETRIC_DATA_OR_TEMPLATES: label("Raw biometric data or templates", "Raw biometric material is prohibited content.", "Exclude biometric values and templates.", "CRITICAL"),
  RAW_CAMERA_FOOTAGE: label("Raw camera footage", "Raw camera footage is prohibited content.", "Exclude raw camera content.", "CRITICAL"),
  DECRYPTED_CACHES: label("Decrypted caches", "Decrypted cache payloads are prohibited content.", "Keep decrypted cache content excluded.", "CRITICAL"),
  SENSITIVE_NOTIFICATION_CONTENT: label("Sensitive notification content", "Sensitive notification content is prohibited content.", "Exclude sensitive notification payloads.", "CRITICAL"),
  UNRESTRICTED_PRIVATE_PROMPTS: label("Unrestricted private prompts", "Unrestricted private prompts are prohibited content.", "Exclude private prompt payloads.", "CRITICAL"),
  RAW_HOUSEHOLD_PRIVATE_PAYLOADS: label("Raw household private payloads", "Raw household-private payloads are prohibited content.", "Keep household-private payloads outside recovery completeness metadata.", "CRITICAL"),
});

export const RECOVERY_PORTABILITY_EVIDENCE_CLASS_LABELS: Readonly<Record<RecoveryPortabilityEvidenceClass, FriendlyLabel>> = boundedFreeze({
  PROVIDER_EXIT_READINESS: label("Provider exit readiness", "Provider-exit readiness evidence is metadata-only and provider-neutral.", "Keep readiness descriptive and non-operational."),
  FORMAT_COMPATIBILITY: label("Format compatibility", "Format compatibility evidence is metadata-only.", "Do not treat format evidence as migration execution."),
  SOURCE_PROVENANCE: label("Source provenance", "Source provenance evidence identifies metadata provenance only.", "Preserve provenance references and keep payloads excluded."),
  TARGET_COMPATIBILITY: label("Target compatibility", "Target compatibility evidence is descriptive metadata only.", "Do not infer runtime migration capability."),
});

export const RECOVERY_CRYPTO_MIGRATION_CLASS_LABELS: Readonly<Record<RecoveryCryptoMigrationClass, FriendlyLabel>> = boundedFreeze({
  POLICY_TRANSITION: label("Policy transition", "Cryptographic policy transition evidence is descriptive metadata only.", "Do not execute policy transition from this metadata."),
  ALGORITHM_CLASS_TRANSITION: label("Algorithm class transition", "Algorithm-class transition evidence is descriptive metadata only.", "Do not infer key migration execution."),
  KEY_LIFECYCLE_TRANSITION_EVIDENCE: label("Key lifecycle transition evidence", "Key lifecycle transition evidence is metadata-only.", "Never expose key material in this metadata scope."),
  COMPATIBILITY_EVIDENCE: label("Compatibility evidence", "Compatibility evidence is descriptive and non-operational.", "Keep compatibility evidence provider-neutral and non-authorizing."),
});

export const RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASS_LABELS: Readonly<Record<RecoveryDeviceLifecycleEvidenceClass, FriendlyLabel>> = boundedFreeze({
  TERMINAL_DECOMMISSIONING: label("Terminal decommissioning", "Terminal decommissioning evidence is metadata-only.", "Do not infer device trust from decommissioning metadata."),
  DEVICE_REVOCATION: label("Device revocation", "Device revocation evidence is metadata-only.", "Revoked devices remain non-authorized."),
  DEVICE_KEY_ROTATION: label("Device key rotation", "Device key rotation evidence is metadata-only.", "Do not generate or rotate keys in this layer."),
  REPLACEMENT_DEVICE_NEW_KEY: label("Replacement device new key", "Replacement-device new-key evidence is metadata-only.", "Do not clone prior device identity or keys."),
  REMOTE_ERASURE_ACKNOWLEDGEMENT: label("Remote erasure acknowledgement", "Remote erasure acknowledgement evidence is metadata-only.", "Do not claim erasure without evidence."),
  BIOMETRIC_DELETION: label("Biometric deletion", "Biometric deletion evidence is metadata-only.", "Do not include biometric payload values."),
  APPLICATION_INTEGRITY: label("Application integrity", "Application integrity evidence is metadata-only.", "Keep integrity unresolved when evidence is missing."),
  SYNC_INTEGRITY: label("Synchronization integrity", "Synchronization integrity evidence is metadata-only.", "Do not infer synchronization completion without evidence."),
  DELETION_TOMBSTONE: label("Deletion tombstone", "Deletion tombstone evidence is metadata-only.", "Deletion tombstones override stale permissive metadata."),
});

export const RECOVERY_COMPLETENESS_ASSESSMENT_STATE_LABELS: Readonly<Record<RecoveryCompletenessAssessmentState, FriendlyLabel>> = boundedFreeze({
  COMPLETE_FOR_METADATA_SCOPE: label("Complete for metadata scope", "Recovery completeness metadata is complete for the declared policy scope.", "Keep the result descriptive and non-authorizing."),
  INCOMPLETE_VISIBLE_GAPS: label("Incomplete with visible gaps", "Recovery completeness metadata contains visible unresolved gaps.", "Keep all unresolved gaps visible.", "WARNING"),
  NOT_ASSESSABLE: label("Not assessable", "Recovery completeness cannot be safely assessed from supplied metadata.", "Keep the assessment unresolved.", "WARNING"),
  REJECTED_PROHIBITED_CONTENT: label("Rejected prohibited content", "Recovery information contains content that must not be included.", "Exclude prohibited content and keep the result denied.", "CRITICAL"),
});

export const RECOVERY_EVIDENCE_PRECEDENCE_RESULT_LABELS: Readonly<Record<RecoveryEvidencePrecedenceResult, FriendlyLabel>> = boundedFreeze({
  NO_OVERRIDE_REQUIRED: label("No override required", "No tombstone or revocation precedence override is required.", "Continue with descriptive policy-only assessment."),
  TOMBSTONE_PRECEDENCE_APPLIED: label("Tombstone precedence applied", "Deletion tombstone precedence is applied over stale permissive metadata.", "Keep deletion precedence visible.", "WARNING"),
  REVOCATION_PRECEDENCE_APPLIED: label("Revocation precedence applied", "Revocation precedence is applied over stale permissive metadata.", "Keep revocation precedence visible.", "WARNING"),
  TOMBSTONE_AND_REVOCATION_PRECEDENCE_APPLIED: label("Tombstone and revocation precedence applied", "Both tombstone and revocation precedence are applied over permissive metadata.", "Preserve both precedence signals and keep authority denied.", "WARNING"),
});

export const RECOVERY_COMPLETENESS_LABEL_COVERAGE = boundedFreeze({
  RECOVERY_COMPLETENESS_GAP_REASONS,
  RECOVERY_RESTORATION_STAGES,
  RECOVERY_PROHIBITED_CONTENT_CLASSES,
  RECOVERY_PORTABILITY_EVIDENCE_CLASSES,
  RECOVERY_CRYPTO_MIGRATION_CLASSES,
  RECOVERY_DEVICE_LIFECYCLE_EVIDENCE_CLASSES,
  RECOVERY_COMPLETENESS_ASSESSMENT_STATES,
  RECOVERY_EVIDENCE_PRECEDENCE_RESULTS,
});