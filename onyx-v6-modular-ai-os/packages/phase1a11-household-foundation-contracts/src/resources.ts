export type ResourceVisibility = "private" | "household_shared" | "public_basic" | "owner_only";
export type ResourceClassification =
  | "memory"
  | "conversation"
  | "connector_grant"
  | "cache"
  | "file_or_artifact"
  | "approval"
  | "voice_session"
  | "character_preference"
  | "generated_document"
  | "journey_record"
  | "council_contribution";

export interface ProtectedResource {
  resourceId: string;
  householdId: string;
  owningAccountId: string;
  classification: ResourceClassification;
  visibility: ResourceVisibility;
  allowedAudience: string[];
  purpose: string;
  provenance: string;
  retentionClass: string;
  policyVersion: string;
  deletionState: "active" | "tombstoned" | "deleted";
  superseded: boolean;
  auditReference: string;
  technicalInformationVisible: boolean;
  shareStatus: "not_shared" | "shared" | "shared_with_grant";
}

export function createProtectedResource(input: Partial<ProtectedResource> & Pick<ProtectedResource, "resourceId" | "householdId" | "owningAccountId" | "classification" | "visibility" | "purpose" | "provenance" | "retentionClass" | "policyVersion" | "auditReference">): ProtectedResource {
  return {
    classification: input.classification,
    householdId: input.householdId,
    owningAccountId: input.owningAccountId,
    resourceId: input.resourceId,
    visibility: input.visibility,
    allowedAudience: input.allowedAudience ?? [],
    purpose: input.purpose,
    provenance: input.provenance,
    retentionClass: input.retentionClass,
    policyVersion: input.policyVersion,
    deletionState: input.deletionState ?? "active",
    superseded: input.superseded ?? false,
    auditReference: input.auditReference,
    technicalInformationVisible: input.technicalInformationVisible ?? false,
    shareStatus: input.shareStatus ?? "not_shared",
  };
}
