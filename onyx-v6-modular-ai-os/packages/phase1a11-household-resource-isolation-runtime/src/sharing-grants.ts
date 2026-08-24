import type { DisclosureClassification, ResourceClass, SharingGrant, SourceClassification } from "./model";
import { validateSharingGrantGrant } from "./model";

export function evaluateSharingGrant(input: {
  grant: Partial<SharingGrant>;
  currentTime: string;
  requestingAccountId: string;
  householdId: string;
  resourceClass: ResourceClass;
  operation: string;
  purpose: string;
  disclosureClass?: DisclosureClassification;
  sourceClass?: SourceClassification;
  auditAvailable: boolean;
}): { valid: boolean; decisionCode: string; explanation: string; auditRequired: boolean; evidenceReference: string } {
  const validation = validateSharingGrantGrant(input.grant);
  if (!validation.valid) return { valid: false, decisionCode: "SHARING_GRANT_MALFORMED", explanation: "Sharing grant is missing or malformed.", auditRequired: true, evidenceReference: input.grant.evidenceReference ?? "grant-evidence-missing" };

  const grant = input.grant as SharingGrant;
  const now = new Date(input.currentTime).getTime();
  const expiry = new Date(grant.expiry).getTime();

  if (grant.status === "revoked") return { valid: false, decisionCode: "SHARING_GRANT_REVOKED", explanation: "Grant has been revoked.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
  if (grant.status === "consumed") return { valid: false, decisionCode: "SHARING_GRANT_CONSUMED", explanation: "Grant has already been consumed.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
  if (Number.isNaN(expiry)) return { valid: false, decisionCode: "SHARING_GRANT_MALFORMED", explanation: "Grant expiry is malformed.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
  if (expiry <= now) return { valid: false, decisionCode: "SHARING_GRANT_EXPIRED", explanation: "Grant has expired.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
  if (grant.status !== "active") return { valid: false, decisionCode: "SHARING_GRANT_REQUIRED", explanation: "Grant is not active for use.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
  if (grant.grantingAccountId === input.requestingAccountId) return { valid: false, decisionCode: "SHARING_GRANT_ACCOUNT_MISMATCH", explanation: "Grant was issued by the same account and cannot be reused.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
  if (grant.receivingAccountId !== input.requestingAccountId) return { valid: false, decisionCode: "SHARING_GRANT_ACCOUNT_MISMATCH", explanation: "The grant was issued to a different account.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
  if (grant.householdScope && grant.householdScope !== input.householdId) return { valid: false, decisionCode: "SHARING_GRANT_HOUSEHOLD_MISMATCH", explanation: "The grant is bound to a different household.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
  if (grant.resourceClass !== input.resourceClass) return { valid: false, decisionCode: "SHARING_GRANT_RESOURCE_MISMATCH", explanation: "Grant does not match the requested resource class.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
  if (grant.exactOperation !== input.operation) return { valid: false, decisionCode: "SHARING_GRANT_OPERATION_MISMATCH", explanation: "Grant operation does not match the requested operation.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
  if (grant.exactPurpose !== input.purpose) return { valid: false, decisionCode: "SHARING_GRANT_PURPOSE_MISMATCH", explanation: "Grant purpose does not match the requested purpose.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
  if (input.disclosureClass && grant.disclosureClass !== input.disclosureClass) return { valid: false, decisionCode: "SHARING_GRANT_DISCLOSURE_MISMATCH", explanation: "Grant disclosure class does not match the requested disclosure class.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
  if (input.sourceClass && grant.sourceClasses.length > 0 && !grant.sourceClasses.includes(input.sourceClass)) return { valid: false, decisionCode: "SHARING_GRANT_SOURCE_MISMATCH", explanation: "Grant source classes do not permit the requested source class.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
  if (grant.policyVersion !== "resource-policy-1") return { valid: false, decisionCode: "SHARING_GRANT_POLICY_STALE", explanation: "Grant policy version is stale or unsupported.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
  if (!input.auditAvailable && grant.auditRequired) return { valid: false, decisionCode: "AUDIT_UNAVAILABLE", explanation: "The grant requires audit availability.", auditRequired: true, evidenceReference: grant.evidenceReference };

  return { valid: true, decisionCode: "SHARING_GRANT_VALID", explanation: "Grant is valid for the current request.", auditRequired: grant.auditRequired, evidenceReference: grant.evidenceReference };
}

export function isDisclosurePermitted(disclosureClass: DisclosureClassification, grant: Partial<SharingGrant>): boolean {
  if (!grant || !grant.disclosureClass) return false;
  return grant.disclosureClass === disclosureClass || grant.disclosureClass === "public-safe";
}
