export const RESOURCE_CLASSES = [
  "memory-namespace",
  "conversation",
  "connector-registration",
  "connector-result-reference",
  "cache",
  "artifact",
  "generated-document",
  "evidence",
  "project-journey",
  "retrieved-result",
  "character-preference",
  "pending-gateway-request",
  "contribution-envelope-reference",
  "backup-manifest",
  "recovery-artifact",
  "unknown"
] as const;

export const VISIBILITY_CLASSIFICATIONS = [
  "private",
  "rahul-only",
  "household-shared",
  "purpose-bound",
  "supervised",
  "guest-safe",
  "service-internal",
  "public-safe",
  "denied",
  "unknown"
] as const;

export const DISCLOSURE_CLASSIFICATIONS = [...VISIBILITY_CLASSIFICATIONS] as const;
export const SOURCE_CLASSIFICATIONS = [
  "owner",
  "household",
  "connector",
  "memory",
  "project-journey",
  "generated",
  "evidence",
  "unknown"
] as const;
export const OWNER_TYPES = ["rahul", "account", "membership", "household", "service", "character", "unknown"] as const;
export const RETENTION_CLASSIFICATIONS = ["owner-only-retention", "household-retention", "evidence-retention", "account-retention", "service-retention", "backup-retention", "recovery-retention"] as const;
export const REDACTION_CLASSIFICATIONS = ["none", "summary-only", "detailed-history-hidden", "evidence-redacted", "credential-hidden", "cache-metadata-hidden", "secret-hidden", "recovery-metadata-hidden"] as const;

export type ResourceClass = (typeof RESOURCE_CLASSES)[number];
export type VisibilityClassification = (typeof VISIBILITY_CLASSIFICATIONS)[number];
export type DisclosureClassification = (typeof DISCLOSURE_CLASSIFICATIONS)[number];
export type SourceClassification = (typeof SOURCE_CLASSIFICATIONS)[number];
export type OwnerType = (typeof OWNER_TYPES)[number];
export type RetentionClassification = (typeof RETENTION_CLASSIFICATIONS)[number];
export type RedactionClassification = (typeof REDACTION_CLASSIFICATIONS)[number];

export interface HouseholdRecord {
  householdId: string;
  primaryOwnerAccountId: string;
  memberAccountIds: string[];
  status: "active" | "restricted" | "unknown";
}

export interface HouseholdIdentityContext {
  accountId: string;
  householdId: string;
  membershipId: string;
  roleId: string;
  status: "active" | "suspended" | "expired" | "unknown";
  policyVersion: string;
  roleVersion: string;
  membershipStatus: "active" | "expired" | "unknown";
}

export interface SessionContext {
  sessionId: string;
  accountId: string;
  householdId: string;
  status: "active" | "pending" | "revoked" | "expired" | "unknown";
  activityState: "fresh" | "stale" | "unknown";
  policyVersion: string;
  roleVersion: string;
  auditAvailable: boolean;
}

export interface ResourceOwnershipRecord {
  resourceId: string;
  resourceClass: ResourceClass;
  householdId: string;
  owningAccountId: string;
  owningMembershipId?: string;
  ownerType: OwnerType;
  visibility: VisibilityClassification;
  disclosureClassification: DisclosureClassification;
  sourceClassification: SourceClassification;
  purpose: string;
  policyVersion: string;
  creationTime: string;
  expiry?: string;
  provenanceReference: string;
  evidenceReference: string;
  retentionClassification: RetentionClassification;
  redactionClassification: RedactionClassification;
  sharingGrantRequired: boolean;
  auditRequired: boolean;
}

export interface SharingGrant {
  grantId: string;
  grantingAccountId: string;
  receivingAccountId: string;
  householdScope?: string;
  resourceClass: ResourceClass;
  exactOperation: string;
  exactPurpose: string;
  disclosureClass: DisclosureClassification;
  sourceClasses: SourceClassification[];
  expiry: string;
  policyVersion: string;
  status: "active" | "revoked" | "consumed" | "expired" | "unknown";
  auditRequired: boolean;
  evidenceReference: string;
}

export interface ResourceAccessDecision {
  allowed: boolean;
  decisionCode: string;
  friendlyTitle: string;
  explanation: string;
  workPreservation: string;
  safeNextAction: string;
  resourceClassification: string;
  disclosureDecision: string;
  redactionRequirement: string;
  auditRequirement: boolean;
  technicalReasons: string[];
  policyReferences: string[];
  evidenceReference: string;
}

export function isKnownResourceClass(value: string): value is ResourceClass {
  return RESOURCE_CLASSES.includes(value as ResourceClass);
}

export function isKnownVisibility(value: string): value is VisibilityClassification {
  return VISIBILITY_CLASSIFICATIONS.includes(value as VisibilityClassification);
}

export function isKnownOwnerType(value: string): value is OwnerType {
  return OWNER_TYPES.includes(value as OwnerType);
}

export function isKnownSourceClassification(value: string): value is SourceClassification {
  return SOURCE_CLASSIFICATIONS.includes(value as SourceClassification);
}

export function isKnownRetentionClassification(value: string): value is RetentionClassification {
  return RETENTION_CLASSIFICATIONS.includes(value as RetentionClassification);
}

export function isKnownRedactionClassification(value: string): value is RedactionClassification {
  return REDACTION_CLASSIFICATIONS.includes(value as RedactionClassification);
}

export function validateOwnershipRecord(record: Partial<ResourceOwnershipRecord>): { valid: boolean; reason: string } {
  if (!record || typeof record !== "object") return { valid: false, reason: "RESOURCE_RECORD_MISSING" };
  const required: Array<[keyof ResourceOwnershipRecord, string]> = [
    ["resourceId", "RESOURCE_ID_MISSING"],
    ["resourceClass", "RESOURCE_CLASS_MISSING"],
    ["householdId", "HOUSEHOLD_ID_MISSING"],
    ["owningAccountId", "OWNER_ACCOUNT_ID_MISSING"],
    ["ownerType", "OWNER_TYPE_MISSING"],
    ["visibility", "VISIBILITY_MISSING"],
    ["disclosureClassification", "DISCLOSURE_CLASSIFICATION_MISSING"],
    ["sourceClassification", "SOURCE_CLASSIFICATION_MISSING"],
    ["purpose", "PURPOSE_MISSING"],
    ["policyVersion", "POLICY_VERSION_MISSING"],
    ["creationTime", "CREATION_TIME_MISSING"],
    ["provenanceReference", "PROVENANCE_REFERENCE_MISSING"],
    ["evidenceReference", "EVIDENCE_REFERENCE_MISSING"],
    ["retentionClassification", "RETENTION_CLASSIFICATION_MISSING"],
    ["redactionClassification", "REDACTION_CLASSIFICATION_MISSING"]
  ];

  for (const [field, reason] of required) {
    if (!record[field] || String(record[field]).trim() === "") return { valid: false, reason };
  }

  if (!isKnownResourceClass(String(record.resourceClass ?? "")) || record.resourceClass === "unknown") return { valid: false, reason: "RESOURCE_CLASS_UNKNOWN" };
  if (!isKnownVisibility(String(record.visibility ?? "")) || record.visibility === "unknown") return { valid: false, reason: "VISIBILITY_UNKNOWN" };
  if (!isKnownVisibility(String(record.disclosureClassification ?? "")) || record.disclosureClassification === "unknown") return { valid: false, reason: "DISCLOSURE_CLASSIFICATION_UNKNOWN" };
  if (!isKnownOwnerType(String(record.ownerType ?? "")) || record.ownerType === "unknown") return { valid: false, reason: "OWNER_TYPE_UNKNOWN" };
  if (!isKnownSourceClassification(String(record.sourceClassification ?? "")) || record.sourceClassification === "unknown") return { valid: false, reason: "SOURCE_CLASSIFICATION_UNKNOWN" };
  if (!isKnownRetentionClassification(String(record.retentionClassification ?? ""))) return { valid: false, reason: "RETENTION_CLASSIFICATION_UNKNOWN" };
  if (!isKnownRedactionClassification(String(record.redactionClassification ?? ""))) return { valid: false, reason: "REDACTION_CLASSIFICATION_UNKNOWN" };
  if (record.ownerType !== "service" && !record.owningMembershipId) return { valid: false, reason: "OWNING_MEMBERSHIP_ID_MISSING" };
  if (typeof record.sharingGrantRequired !== "boolean") return { valid: false, reason: "SHARING_GRANT_REQUIREMENT_INVALID" };
  if (typeof record.auditRequired !== "boolean") return { valid: false, reason: "AUDIT_REQUIREMENT_INVALID" };

  if (record.creationTime && Number.isNaN(new Date(record.creationTime).getTime())) return { valid: false, reason: "INVALID_CREATION_TIME" };
  if (record.expiry && Number.isNaN(new Date(record.expiry).getTime())) return { valid: false, reason: "INVALID_EXPIRY_TIME" };

  return { valid: true, reason: "RESOURCE_RECORD_VALID" };
}

export function validateSharingGrantGrant(grant: Partial<SharingGrant>): { valid: boolean; reason: string } {
  if (!grant || typeof grant !== "object") return { valid: false, reason: "SHARING_GRANT_MISSING" };
  const required: Array<[keyof SharingGrant, string]> = [
    ["grantId", "GRANT_ID_MISSING"],
    ["grantingAccountId", "GRANTING_ACCOUNT_ID_MISSING"],
    ["receivingAccountId", "RECEIVING_ACCOUNT_ID_MISSING"],
    ["resourceClass", "RESTRICTED_RESOURCE_CLASS_MISSING"],
    ["exactOperation", "EXACT_OPERATION_MISSING"],
    ["exactPurpose", "EXACT_PURPOSE_MISSING"],
    ["disclosureClass", "DISCLOSURE_CLASS_MISSING"],
    ["expiry", "EXPIRY_MISSING"],
    ["policyVersion", "POLICY_VERSION_MISSING"],
    ["status", "STATUS_MISSING"],
    ["evidenceReference", "EVIDENCE_REFERENCE_MISSING"]
  ];

  for (const [field, reason] of required) {
    if (!grant[field] || String(grant[field]).trim() === "") return { valid: false, reason };
  }

  if (!isKnownResourceClass(String(grant.resourceClass ?? ""))) return { valid: false, reason: "RESOURCE_CLASS_UNKNOWN" };
  if (grant.sourceClasses && grant.sourceClasses.length === 0) return { valid: false, reason: "SOURCE_CLASS_LIST_EMPTY" };
  if (!isKnownVisibility(String(grant.disclosureClass ?? ""))) return { valid: false, reason: "DISCLOSURE_CLASS_UNKNOWN" };
  if (Number.isNaN(new Date(grant.expiry as string).getTime())) return { valid: false, reason: "INVALID_GRANT_EXPIRY" };
  return { valid: true, reason: "SHARING_GRANT_VALID" };
}
