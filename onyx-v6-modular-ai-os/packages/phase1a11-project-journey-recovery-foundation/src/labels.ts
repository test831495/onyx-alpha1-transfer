import type { AcceptanceFamily, ArchiveSetHealth, CopyHealthState, ContinuityGapType, EvidenceState, IntegrityState, JourneyEventKind, OperatingMode, RecoveryPackageState, RecoveryRouteClass, RetentionDecision, SanitizationDecision, StoragePressureState, SummaryQuality } from "./model";
import { boundedFreeze } from "./capture-policy";

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
export const ACCEPTANCE_FAMILY_LABELS: Readonly<Record<AcceptanceFamily, FriendlyLabel>> = boundedFreeze({ JOURNEY: FRIENDLY_LABELS.MILESTONE, RECOVERY: FRIENDLY_LABELS.DESCRIBED, INTEGRITY: FRIENDLY_LABELS.EXPECTED, ARCHIVE: FRIENDLY_LABELS.HEALTHY_PROJECTION, CAPTURE: FRIENDLY_LABELS.MILESTONE, CONTINUITY: label("Continuity assessment", "A continuity assessment is described without granting runtime authority or permission.", "Keep evidence visible and do not treat this as an operational decision.") });