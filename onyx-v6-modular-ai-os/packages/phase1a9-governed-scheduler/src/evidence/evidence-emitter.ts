import { PHASE1A9_EVIDENCE_CONTRACT_VERSION } from "../shared/versions";
import { validateEvidenceSequence, type EvidenceSequenceValidationResult, type SequentialEvidenceEvent } from "./evidence-sequencing";

export type EvidenceEventType =
  | "PROMOTION_CANDIDATE_REGISTERED"
  | "PROMOTION_CANDIDATE_REJECTED"
  | "PROMOTION_ELIGIBILITY_EVALUATED"
  | "PROMOTION_SERIALIZATION_EVALUATED"
  | "PROMOTION_CANCELLATION_EVALUATED"
  | "PROMOTION_FAILURE_EVALUATED"
  | "PROMOTION_RECONCILIATION_REQUIRED"
  | "FRESH_PROMOTION_APPROVAL_REQUIRED"
  | "EVIDENCE_EVENT_REGISTERED"
  | "EVIDENCE_EVENT_REJECTED"
  | "EVIDENCE_SEQUENCE_VALIDATED"
  | "EVIDENCE_SEQUENCE_REJECTED"
  | "EVIDENCE_ARTIFACT_REGISTERED"
  | "EVIDENCE_ARTIFACT_REJECTED"
  | "EVIDENCE_PACKAGE_EVALUATED"
  | "EVIDENCE_PACKAGE_INCOMPLETE"
  | "EVIDENCE_MANIFEST_EVALUATED"
  | "EVIDENCE_SEALING_ELIGIBILITY_EVALUATED";

export interface SchedulerEvidenceEvent {
  evidenceEventId: string;
  schedulerRunId: string;
  workflowId: string;
  runtimeId: string;
  runtimeSessionId: string;
  taskId: string;
  agentId: string;
  promotionCandidateId: string;
  eventType: EvidenceEventType | string;
  logicalSequence: number;
  causalParentEventIds: readonly string[];
  artifactIds: readonly string[];
  decisionReferenceIds: readonly string[];
  approvalId: string;
  permissionDecisionId: string;
  memoryDecisionId: string;
  connectorDecisionId: string;
  contextDecisionId: string;
  checkpointDigest: string;
  scopeHash: string;
  redactionStatus: string;
  permissionStatus: string;
  provenanceStatus: string;
  integrityStatus: string;
  recordedAt: string;
  contractVersion: string;
}

export interface EvidenceArtifactRegistration {
  evidenceArtifactRegistrationId: string;
  artifactId: string;
  artifactClass: string;
  fileName: string;
  format: string;
  schemaVersion: string;
  producerComponent: string;
  producerDecisionId: string;
  workflowId: string;
  taskId: string;
  promotionCandidateId: string;
  contentDigest: string;
  hashAlgorithm: string;
  sizeBytes: number;
  provenanceReferenceIds: readonly string[];
  sourceReferenceIds: readonly string[];
  permissionDecisionIds: readonly string[];
  redactionDecisionIds: readonly string[];
  retentionPolicyId: string;
  createdAt: string;
  contractVersion: string;
  decision: "REGISTERED_AS_PROJECTION" | "DUPLICATE_COMPATIBLE" | "DENIED_MISSING_DIGEST" | "DENIED_INVALID_FORMAT" | "DENIED_SCHEMA" | "DENIED_PROVENANCE" | "DENIED_PERMISSION" | "DENIED_REDACTION" | "DENIED_RETENTION" | "CONFLICTING_ARTIFACT" | "REQUIRES_RECONCILIATION" | "PROHIBITED";
}

export interface EvidencePackageProjection {
  evidencePackageId: string;
  schedulerRunId: string;
  workflowId: string;
  promotionCandidateId: string;
  mandatoryEvidenceClasses: readonly string[];
  artifactIdsByClass: Record<string, readonly string[]>;
  missingEvidenceClasses: readonly string[];
  invalidEvidenceArtifactIds: readonly string[];
  conflictingEvidenceArtifactIds: readonly string[];
  unredactedEvidenceArtifactIds: readonly string[];
  unauthorizedEvidenceArtifactIds: readonly string[];
  provenanceInvalidArtifactIds: readonly string[];
  retentionInvalidArtifactIds: readonly string[];
  sequenceValid: boolean;
  causalGraphValid: boolean;
  completenessStatus: "COMPLETE" | "INCOMPLETE" | "INVALID" | "CONFLICTING" | "REDACTION_REQUIRED" | "PERMISSION_REQUIRED" | "PROVENANCE_REQUIRED" | "RETENTION_REQUIRED" | "REQUIRES_RECONCILIATION" | "PROHIBITED";
  sealingEligible: boolean;
  promotionEligible: boolean;
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export interface EvidenceManifestProjection {
  evidenceManifestId: string;
  evidencePackageId: string;
  workflowId: string;
  promotionCandidateId: string;
  artifactEntries: readonly { evidenceClass: string; artifactId: string }[];
  eventEntries: readonly { evidenceClass: string; eventId: string; logicalSequence: number }[];
  artifactCount: number;
  eventCount: number;
  manifestDigest: string;
  hashAlgorithm: string;
  contractVersions: readonly string[];
  producerComponents: readonly string[];
  requiredClassCoverage: readonly string[];
  missingClassCoverage: readonly string[];
  invalidArtifactIds: readonly string[];
  conflictingArtifactIds: readonly string[];
  provenanceStatus: string;
  permissionStatus: string;
  redactionStatus: string;
  retentionStatus: string;
  sequenceStatus: string;
  completenessStatus: string;
  manifestEligibleForSealing: boolean;
  promotionUseEligible: boolean;
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export class EvidenceEmitter {
  static validateSequence(events: readonly SchedulerEvidenceEvent[]): EvidenceSequenceValidationResult {
    const simple = events.map((event) => ({ evidenceEventId: event.evidenceEventId, schedulerRunId: event.schedulerRunId, workflowId: event.workflowId, logicalSequence: event.logicalSequence, causalParentEventIds: event.causalParentEventIds })) as readonly SequentialEvidenceEvent[];
    return validateEvidenceSequence(simple, PHASE1A9_EVIDENCE_CONTRACT_VERSION);
  }

  static registerArtifact(artifact: EvidenceArtifactRegistration): EvidenceArtifactRegistration {
    const missing = !artifact.contentDigest || !artifact.artifactId || !artifact.fileName;
    if (missing) return { ...artifact, decision: "DENIED_MISSING_DIGEST" };
    if (!artifact.format || !/^(json|text|markdown|ndjson)$/i.test(artifact.format)) return { ...artifact, decision: "DENIED_INVALID_FORMAT" };
    if (!artifact.provenanceReferenceIds.length) return { ...artifact, decision: "DENIED_PROVENANCE" };
    if (!artifact.permissionDecisionIds.length) return { ...artifact, decision: "DENIED_PERMISSION" };
    if (!artifact.redactionDecisionIds.length) return { ...artifact, decision: "DENIED_REDACTION" };
    if (!artifact.retentionPolicyId) return { ...artifact, decision: "DENIED_RETENTION" };
    return { ...artifact, decision: "REGISTERED_AS_PROJECTION" };
  }

  static evaluatePackage(input: EvidencePackageProjection): EvidencePackageProjection {
    const packageComplete = input.missingEvidenceClasses.length === 0 && input.invalidEvidenceArtifactIds.length === 0 && input.conflictingEvidenceArtifactIds.length === 0 && input.sequenceValid && input.causalGraphValid;
    return {
      ...input,
      completenessStatus: packageComplete ? "COMPLETE" : "INCOMPLETE",
      promotionEligible: packageComplete,
      contractVersion: input.contractVersion || PHASE1A9_EVIDENCE_CONTRACT_VERSION,
    };
  }

  static evaluateManifest(input: EvidenceManifestProjection): EvidenceManifestProjection {
    const sortedArtifactEntries = [...input.artifactEntries].sort((a, b) => `${a.evidenceClass}:${a.artifactId}`.localeCompare(`${b.evidenceClass}:${b.artifactId}`));
    const sortedEventEntries = [...input.eventEntries].sort((a, b) => `${a.evidenceClass}:${a.logicalSequence}:${a.eventId}`.localeCompare(`${b.evidenceClass}:${b.logicalSequence}:${b.eventId}`));
    return {
      ...input,
      artifactEntries: sortedArtifactEntries,
      eventEntries: sortedEventEntries,
      contractVersion: input.contractVersion || PHASE1A9_EVIDENCE_CONTRACT_VERSION,
    };
  }
}
