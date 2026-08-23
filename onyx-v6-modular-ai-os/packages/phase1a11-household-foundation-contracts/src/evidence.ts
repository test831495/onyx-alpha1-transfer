export type EvidenceClass = "source" | "summarized" | "derived" | "validation" | "recovery" | "audit";
export type EvidenceCompleteness = "complete" | "partial" | "missing" | "not_verified";

export interface EvidenceSource {
  sourceType: string;
  sourceReference: string;
  sourceVersion?: string;
  sourceHash?: string;
}

export interface EvidenceReference {
  evidenceId: string;
  source: EvidenceSource;
  classification: string;
  accessPolicy: string;
  provenance: string;
  retentionClass: string;
  redactionRequired: boolean;
}

export interface EvidenceIntegrity {
  digest: string;
  algorithm: string;
  verifiedAt?: string;
}

export interface EvidenceClassification {
  category: string;
  sensitivity: "public_basic" | "owner_only" | "restricted";
}

export interface EvidenceRedaction {
  required: boolean;
  reason: string;
  fields: string[];
}

export interface EvidenceRetention {
  retentionClass: string;
  expiresAt?: string;
  tombstoneRequired: boolean;
}

export interface EvidenceManifestProjection {
  evidenceId: string;
  sourceType: string;
  sourceReference: string;
  classification: string;
  accessPolicy: string;
  completedAt?: string;
}

export interface EvidenceValidationResult {
  complete: boolean;
  completeness: EvidenceCompleteness;
  errors: string[];
}

export function validateEvidenceReference(reference: EvidenceReference): EvidenceValidationResult {
  const errors: string[] = [];

  if (!reference.source.sourceType) {
    errors.push("sourceType is required");
  }
  if (!reference.source.sourceReference) {
    errors.push("sourceReference is required");
  }
  if (!reference.classification) {
    errors.push("classification is required");
  }
  if (!reference.accessPolicy) {
    errors.push("accessPolicy is required");
  }
  if (!reference.provenance) {
    errors.push("provenance is required");
  }

  return {
    complete: errors.length === 0,
    completeness: errors.length === 0 ? "complete" : "missing",
    errors,
  };
}
