export interface ManifestArtifactEntry {
  evidenceClass: string;
  artifactId: string;
}

export interface ManifestEventEntry {
  evidenceClass: string;
  eventId: string;
  logicalSequence: number;
}

export interface EvidenceManifestProjectionInput {
  evidenceManifestId: string;
  evidencePackageId: string;
  workflowId: string;
  promotionCandidateId: string;
  artifactEntries: readonly ManifestArtifactEntry[];
  eventEntries: readonly ManifestEventEntry[];
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

export function projectEvidenceManifest(input: EvidenceManifestProjectionInput): EvidenceManifestProjectionInput {
  const artifactEntries = [...input.artifactEntries].sort((a, b) => `${a.evidenceClass}:${a.artifactId}`.localeCompare(`${b.evidenceClass}:${b.artifactId}`));
  const eventEntries = [...input.eventEntries].sort((a, b) => `${a.evidenceClass}:${a.logicalSequence}:${a.eventId}`.localeCompare(`${b.evidenceClass}:${b.logicalSequence}:${b.eventId}`));
  return { ...input, artifactEntries, eventEntries, artifactCount: artifactEntries.length, eventCount: eventEntries.length };
}
