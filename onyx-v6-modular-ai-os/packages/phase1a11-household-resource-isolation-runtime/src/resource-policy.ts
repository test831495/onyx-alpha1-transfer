import type { ResourceClass, ResourceOwnershipRecord, VisibilityClassification } from "./model";

export const RESOURCE_POLICY_VERSION = "resource-policy-1";
export const SERVICE_OWNED_RESOURCE_CLASSES: ResourceClass[] = ["connector-registration", "connector-result-reference", "backup-manifest", "recovery-artifact"];

export const RESOURCE_VISIBILITY_DENY_CODES: Record<VisibilityClassification, string> = {
  private: "PRIVATE_RESOURCE_ACCESS_REQUIRES_ACCOUNT_OWNER",
  "rahul-only": "RAHUL_ONLY_RESOURCE",
  "household-shared": "HOUSEHOLD_SHARED_RESOURCE",
  "purpose-bound": "PURPOSE_BOUND_RESOURCE",
  supervised: "SUPERVISED_RESOURCE",
  "guest-safe": "GUEST_SAFE_RESOURCE",
  "service-internal": "SERVICE_INTERNAL_RESOURCE",
  "public-safe": "PUBLIC_SAFE_RESOURCE",
  denied: "RESOURCE_DENIED",
  unknown: "RESOURCE_VISIBILITY_UNKNOWN"
};

export function getResourceDefaultPurpose(resourceClass: ResourceClass): string {
  const map: Record<ResourceClass, string> = {
    "memory-namespace": "memory-ownership",
    conversation: "conversation-ownership",
    "connector-registration": "connector-governance",
    "connector-result-reference": "connector-result-isolation",
    cache: "cache-isolation",
    artifact: "artifact-ownership",
    "generated-document": "document-governance",
    evidence: "evidence-integrity",
    "project-journey": "history-boundary",
    "retrieved-result": "retrieval-boundary",
    "character-preference": "account-bound-presentation",
    "pending-gateway-request": "gateway-readiness",
    "contribution-envelope-reference": "advisory-boundary",
    "backup-manifest": "continuity-preservation",
    "recovery-artifact": "recovery-preservation",
    unknown: "unknown-resource"
  };
  return map[resourceClass] ?? "resource-governance";
}

export function isPurposeCompatible(record: Partial<ResourceOwnershipRecord>, declaredPurpose: string): boolean {
  if (!declaredPurpose || !record.purpose) return false;
  return record.purpose === declaredPurpose || record.visibility === "household-shared" || record.visibility === "public-safe";
}

export function isSourceDisclosureCompatible(source: string, disclosure: string): boolean {
  const allowed: Record<string, string[]> = {
    owner: ["rahul-only", "private", "purpose-bound", "household-shared"],
    household: ["household-shared", "guest-safe"],
    connector: ["private", "purpose-bound", "service-internal"],
    memory: ["private", "rahul-only", "household-shared", "purpose-bound"],
    "project-journey": ["rahul-only"],
    generated: ["private", "purpose-bound", "household-shared"],
    evidence: ["private", "rahul-only", "purpose-bound"],
    unknown: []
  };
  return allowed[source]?.includes(disclosure) ?? false;
}
