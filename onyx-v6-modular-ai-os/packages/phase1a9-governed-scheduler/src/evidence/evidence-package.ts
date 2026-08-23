export type EvidenceCompletenessStatus = "COMPLETE" | "INCOMPLETE" | "INVALID" | "CONFLICTING" | "REDACTION_REQUIRED" | "PERMISSION_REQUIRED" | "PROVENANCE_REQUIRED" | "RETENTION_REQUIRED" | "REQUIRES_RECONCILIATION" | "PROHIBITED";

export interface EvidencePackageProjectionInput {
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
  completenessStatus: EvidenceCompletenessStatus;
  sealingEligible: boolean;
  promotionEligible: boolean;
  evidenceArtifactIds: readonly string[];
  evaluatedAt: string;
  contractVersion: string;
}

export function projectEvidencePackage(input: EvidencePackageProjectionInput): EvidencePackageProjectionInput {
  const complete = input.missingEvidenceClasses.length === 0 && !input.sequenceValid && !input.causalGraphValid ? false : input.missingEvidenceClasses.length === 0 && input.invalidEvidenceArtifactIds.length === 0 && input.conflictingEvidenceArtifactIds.length === 0 && input.sequenceValid && input.causalGraphValid;
  return {
    ...input,
    completenessStatus: complete ? "COMPLETE" : "INCOMPLETE",
    promotionEligible: complete,
  };
}
