import type { HouseholdIdentityContext, ResourceAccessDecision, ResourceOwnershipRecord, SessionContext } from "./model";
import { validateOwnershipRecord } from "./model";
import { RESOURCE_POLICY_VERSION, RESOURCE_VISIBILITY_DENY_CODES, SERVICE_OWNED_RESOURCE_CLASSES, isPurposeCompatible, isSourceDisclosureCompatible } from "./resource-policy";
import { evaluateSharingGrant } from "./sharing-grants";

export const RESOURCE_ACCESS_DECISION_CODES = {
  allowed: "RESOURCE_ACCESS_ALLOWED",
  denyUnknownOwner: "UNKNOWN_OWNER_DENIED",
  denyUnknownResource: "UNKNOWN_RESOURCE_DENIED",
  denyCrossAccount: "CROSS_ACCOUNT_RESOURCE_DENIED",
  denyCrossHousehold: "CROSS_HOUSEHOLD_RESOURCE_DENIED",
  denyVisibility: "VISIBILITY_POLICY_DENIED",
  denyPurpose: "PURPOSE_MISMATCH",
  denyAudit: "AUDIT_UNAVAILABLE",
  denyMode: "MODE_CAPABILITY_DENIED",
  denyTechnical: "TECHNICAL_INFORMATION_DENIED"
} as const;

export function evaluateResourceAccess(input: {
  requestingAccount: string;
  currentIdentity: Partial<HouseholdIdentityContext> | undefined;
  currentSession: Partial<SessionContext> | undefined;
  household: { householdId: string; primaryOwnerAccountId: string; memberAccountIds: string[]; status: string };
  ownershipRecord: Partial<ResourceOwnershipRecord>;
  requestedOperation: string;
  declaredPurpose: string;
  sharingGrant?: any;
  currentPolicyVersions: { resourcePolicy?: string };
  currentTime: string;
  auditAvailable: boolean;
  technicalInformationEligible: boolean;
  operatingMode: string;
}): ResourceAccessDecision {
  const record = input.ownershipRecord ?? {} as Partial<ResourceOwnershipRecord>;
  const technicalReasons: string[] = [];

  if (!input.requestingAccount || input.requestingAccount.trim() === "") {
    return deny("INVALID_REQUEST_ACCOUNT", "Request account is missing.", "Request account is missing; no resource access can be evaluated.", "No work is lost.", "Provide a valid requesting account.", "unknown", "unknown", "required", true, ["INVALID_REQUEST_ACCOUNT"], [RESOURCE_POLICY_VERSION]);
  }
  if (!record.resourceId || !input.requestingAccount) {
    return deny("UNKNOWN_RESOURCE_DENIED", "Resource ownership is missing or malformed.", "The resource cannot be evaluated safely.", "No work is lost.", "Verify the resource ownership record before continuing.", String(record.resourceClass ?? "unknown"), "unknown", "required", true, ["RESOURCE_ID_MISSING"], [RESOURCE_POLICY_VERSION]);
  }

  if (input.currentPolicyVersions.resourcePolicy !== RESOURCE_POLICY_VERSION) {
    return deny("RESOURCE_POLICY_STALE", "Resource policy is stale or unsupported.", "The resource cannot be authorized under the current policy.", "No work is lost.", "Refresh the policy and retry the request.", String(record.resourceClass ?? "unknown"), String(record.disclosureClassification ?? "unknown"), "required", true, ["RESOURCE_POLICY_STALE"], [RESOURCE_POLICY_VERSION]);
  }
  const ownershipValidation = validateOwnershipRecord(record);
  if (!ownershipValidation.valid) {
    const code = ownershipValidation.reason === "RESOURCE_CLASS_UNKNOWN" ? "UNKNOWN_RESOURCE_DENIED" : ownershipValidation.reason === "OWNER_TYPE_UNKNOWN" ? "UNKNOWN_OWNER_TYPE_DENIED" : "OWNERSHIP_RECORD_INVALID";
    return deny(code, "Resource ownership is incomplete or unknown.", "The resource remains denied until its ownership, classification, and evidence fields are valid.", "No work is lost.", "Provide a complete, current ownership record before retrying.", String(record.resourceClass ?? "unknown"), String(record.disclosureClassification ?? "unknown"), "required", true, [ownershipValidation.reason], [RESOURCE_POLICY_VERSION]);
  }
  const ownership = record as ResourceOwnershipRecord;
  if (ownership.policyVersion !== RESOURCE_POLICY_VERSION) {
    return deny("RESOURCE_POLICY_STALE", "Resource ownership policy is stale or unsupported.", "The ownership record cannot be authorized under the current resource policy.", "No work is lost.", "Refresh the ownership record before retrying.", ownership.resourceClass, ownership.disclosureClassification, ownership.redactionClassification, ownership.auditRequired, ["RESOURCE_RECORD_POLICY_STALE"], [RESOURCE_POLICY_VERSION]);
  }
  if (ownership.expiry && new Date(ownership.expiry).getTime() <= new Date(input.currentTime).getTime()) {
    return deny("RESOURCE_EXPIRED", "The resource reference has expired.", "Expired resource references cannot authorize access.", "No work is lost.", "Obtain a current resource reference before retrying.", ownership.resourceClass, ownership.disclosureClassification, ownership.redactionClassification, ownership.auditRequired, ["RESOURCE_EXPIRED"], [RESOURCE_POLICY_VERSION]);
  }
  if (!isSourceDisclosureCompatible(ownership.sourceClassification, ownership.disclosureClassification)) {
    return deny("SOURCE_DISCLOSURE_MISMATCH", "Resource disclosure classification is incompatible.", "The source and disclosure classifications do not permit this resource to be used.", "No work is lost.", "Correct the resource classification before retrying.", ownership.resourceClass, ownership.disclosureClassification, ownership.redactionClassification, ownership.auditRequired, ["SOURCE_DISCLOSURE_MISMATCH"], [RESOURCE_POLICY_VERSION]);
  }

  const sameAccount = record.owningAccountId === input.requestingAccount;
  const householdMismatch = record.householdId !== input.household.householdId || (input.currentIdentity && input.currentIdentity.householdId && input.currentIdentity.householdId !== input.household.householdId) || (input.currentSession && input.currentSession.householdId && input.currentSession.householdId !== input.household.householdId);
  const sessionAccountMismatch = !!input.currentSession?.accountId && input.currentSession.accountId !== input.requestingAccount && input.currentSession.accountId !== record.owningAccountId;
  const identityAccountMismatch = !!input.currentIdentity?.accountId && input.currentIdentity.accountId !== input.requestingAccount && input.currentIdentity.accountId !== record.owningAccountId;
  if (!record.owningAccountId || record.owningAccountId === "unknown") {
    return deny("UNKNOWN_OWNER_DENIED", "Resource owner is unknown.", "Resource ownership cannot be trusted without a known owner.", "No work is lost.", "Use an approved ownership record before proceeding.", String(record.resourceClass ?? "unknown"), "unknown", "required", true, ["OWNER_ACCOUNT_ID_UNKNOWN"], [RESOURCE_POLICY_VERSION]);
  }
  if (householdMismatch) {
    return deny("CROSS_HOUSEHOLD_RESOURCE_DENIED", "The requester is outside the owning household.", "Resources are isolated by household and remain denied by default across households.", "No work is lost.", "Request access only within the approved household scope.", String(record.resourceClass ?? "unknown"), String(record.disclosureClassification ?? "unknown"), "required", true, ["CROSS_HOUSEHOLD_RESOURCE_DENIED"], [RESOURCE_POLICY_VERSION]);
  }
  if (input.household.status !== "active") {
    return deny("HOUSEHOLD_INACTIVE", "The household is not active.", "Resource access is denied while household membership is inactive or restricted.", "No work is lost.", "Restore an active household state before retrying.", ownership.resourceClass, ownership.disclosureClassification, ownership.redactionClassification, ownership.auditRequired, ["HOUSEHOLD_INACTIVE"], [RESOURCE_POLICY_VERSION]);
  }
  if (!input.household.memberAccountIds.includes(input.requestingAccount)) {
    return deny("HOUSEHOLD_MEMBERSHIP_DENIED", "The requesting account is not an active household member.", "A household identifier alone cannot authorize resource access.", "No work is lost.", "Use an account with current household membership.", ownership.resourceClass, ownership.disclosureClassification, ownership.redactionClassification, ownership.auditRequired, ["REQUESTER_NOT_HOUSEHOLD_MEMBER"], [RESOURCE_POLICY_VERSION]);
  }
  if (!SERVICE_OWNED_RESOURCE_CLASSES.includes(ownership.resourceClass) && !input.household.memberAccountIds.includes(ownership.owningAccountId)) {
    return deny("OWNER_HOUSEHOLD_MEMBERSHIP_DENIED", "The resource owner is not an active household member.", "Human-owned resources require an owner bound to the declared household.", "No work is lost.", "Use a valid household-bound ownership record.", ownership.resourceClass, ownership.disclosureClassification, ownership.redactionClassification, ownership.auditRequired, ["OWNER_NOT_HOUSEHOLD_MEMBER"], [RESOURCE_POLICY_VERSION]);
  }
  if (sessionAccountMismatch || identityAccountMismatch) {
    return deny("CROSS_ACCOUNT_RESOURCE_DENIED", "The active session or identity is not the owning account.", "Account-bound resources require the active identity or session to stay aligned with the owning account.", "No work is lost.", "Use the correct account-bound session or identity before retrying.", String(record.resourceClass ?? "unknown"), String(record.disclosureClassification ?? "unknown"), "required", true, ["ACCOUNT_BOUNDARY_VIOLATION"], [RESOURCE_POLICY_VERSION]);
  }
  if (record.resourceClass === "project-journey" && input.requestingAccount !== record.owningAccountId && input.currentIdentity?.accountId !== record.owningAccountId) {
    return deny("PROJECT_JOURNEY_DENIED", "Detailed Project Journey data remains Rahul-only.", "History access is restricted to the owner account and governed basic summaries.", "No work is lost.", "Use only the separately curated basic information available for others.", "project-journey", "rahul-only", "required", true, ["DETAIL_HISTORY_RESTRICTED"], [RESOURCE_POLICY_VERSION]);
  }
  if (!sameAccount && (record.visibility === "private" || record.visibility === "rahul-only" || record.visibility === "service-internal" || record.visibility === "denied" || record.visibility === "unknown")) {
    return deny("CROSS_ACCOUNT_RESOURCE_DENIED", "The requester is not the owning account.", "Private resources stay account-bound and are denied by default.", "No work is lost.", "Use an explicit, policy-bound grant for cross-account access.", String(record.resourceClass ?? "unknown"), String(record.disclosureClassification ?? "unknown"), "required", true, ["ACCOUNT_BOUNDARY_VIOLATION"], [RESOURCE_POLICY_VERSION]);
  }
  if (!sameAccount && record.sharingGrantRequired && !input.sharingGrant) {
    return deny("SHARING_GRANT_REQUIRED", "A valid sharing grant is required for this resource.", "Shared access requires a grant that matches the exact resource, purpose, and operation.", "No work is lost.", "Request a valid grant before retrying the action.", String(record.resourceClass ?? "unknown"), String(record.disclosureClassification ?? "unknown"), "required", true, ["SHARING_GRANT_REQUIRED"], [RESOURCE_POLICY_VERSION]);
  }

  if (record.visibility === "denied" || record.visibility === "unknown") {
    return deny("VISIBILITY_POLICY_DENIED", "Resource visibility is denied or unknown.", "The resource is not authorized for use in the current state.", "No work is lost.", "Stop and confirm policy or ownership before access.", String(record.resourceClass ?? "unknown"), String(record.disclosureClassification ?? "unknown"), "required", true, [RESOURCE_VISIBILITY_DENY_CODES[record.visibility ?? "unknown"] ?? "VISIBILITY_UNKNOWN"], [RESOURCE_POLICY_VERSION]);
  }

  if (!isPurposeCompatible(record, input.declaredPurpose)) {
    return deny("PURPOSE_MISMATCH", "The declared purpose does not match the ownership record.", "Purpose is required and must match the resource policy.", "No work is lost.", "Use the correct bound purpose or request a new grant.", String(record.resourceClass ?? "unknown"), String(record.disclosureClassification ?? "unknown"), "required", true, ["PURPOSE_MISMATCH"], [RESOURCE_POLICY_VERSION]);
  }

  if (input.currentSession && input.currentSession.status && input.currentSession.status !== "active") {
    technicalReasons.push("SESSION_NOT_ACTIVE");
    return deny("SESSION_NOT_ACTIVE", "The current session is not active.", "An inactive session cannot authorize resource access.", "No work is lost.", "Use a valid active session before continuing.", String(record.resourceClass ?? "unknown"), String(record.disclosureClassification ?? "unknown"), "required", true, technicalReasons, [RESOURCE_POLICY_VERSION]);
  }

  if (input.currentIdentity && input.currentIdentity.status && input.currentIdentity.status !== "active") {
    technicalReasons.push("IDENTITY_NOT_ACTIVE");
    return deny("IDENTITY_NOT_ACTIVE", "The current identity is not active.", "An inactive identity cannot justify access.", "No work is lost.", "Refresh the identity or request reauthorization.", String(record.resourceClass ?? "unknown"), String(record.disclosureClassification ?? "unknown"), "required", true, technicalReasons, [RESOURCE_POLICY_VERSION]);
  }

  if (input.auditAvailable === false && record.auditRequired) {
    return deny("AUDIT_UNAVAILABLE", "Audit is required and currently unavailable.", "Protected resource access is denied without audit availability.", "No work is lost.", "Restore audit capability and retry the request.", String(record.resourceClass ?? "unknown"), String(record.disclosureClassification ?? "unknown"), "required", true, ["AUDIT_UNAVAILABLE"], [RESOURCE_POLICY_VERSION]);
  }

  if (input.operatingMode && !["ACTIVE", "LIGHT", "VACATION", "HIBERNATION"].includes(input.operatingMode)) {
    return deny("MODE_CAPABILITY_DENIED", "The operating mode is unknown or unsupported.", "Protected resources remain denied when the operating mode is unsupported.", "No work is lost.", "Use a supported operating mode before continuing.", String(record.resourceClass ?? "unknown"), String(record.disclosureClassification ?? "unknown"), "required", true, ["UNKNOWN_MODE"], [RESOURCE_POLICY_VERSION]);
  }

  if (input.sharingGrant) {
    const grantResult = evaluateSharingGrant({
      grant: input.sharingGrant,
      currentTime: input.currentTime,
      requestingAccountId: input.requestingAccount,
      householdId: input.household.householdId,
      resourceClass: String(record.resourceClass ?? "unknown") as any,
      operation: input.requestedOperation,
      purpose: input.declaredPurpose,
      disclosureClass: record.disclosureClassification,
      sourceClass: record.sourceClassification,
      auditAvailable: input.auditAvailable
    });
    if (!grantResult.valid) {
      return deny(grantResult.decisionCode, "The required sharing grant is invalid for this request.", grantResult.explanation, "No work is lost.", "Fix the grant to match the exact resource, operation, purpose, disclosure, and household before retrying.", String(record.resourceClass ?? "unknown"), String(record.disclosureClassification ?? "unknown"), "required", true, [grantResult.decisionCode], [RESOURCE_POLICY_VERSION]);
    }
  }

  if (record.resourceClass === "project-journey" && input.requestingAccount !== record.owningAccountId && input.currentIdentity?.accountId !== record.owningAccountId) {
    return deny("PROJECT_JOURNEY_DENIED", "Detailed Project Journey data remains Rahul-only.", "History access is restricted to the owner account and governed basic summaries.", "No work is lost.", "Use only the separately curated basic information available for others.", "project-journey", "rahul-only", "required", true, ["DETAIL_HISTORY_RESTRICTED"], [RESOURCE_POLICY_VERSION]);
  }

  if (!input.technicalInformationEligible && record.resourceClass === "project-journey") {
    return deny("TECHNICAL_INFORMATION_DENIED", "Technical Information is gated.", "No additional technical metadata is disclosed without explicit policy eligibility.", "No work is lost.", "Request explicit Technical Information eligibility before viewing details.", "project-journey", "rahul-only", "required", true, ["TECHNICAL_INFORMATION_DISABLED"], [RESOURCE_POLICY_VERSION]);
  }

  return {
    allowed: true,
    decisionCode: "RESOURCE_ACCESS_ALLOWED",
    friendlyTitle: "Access permitted",
    explanation: "The resource ownership and purpose match the current account, session, and policy state.",
    workPreservation: "Current work is preserved and no data is modified.",
    safeNextAction: "Continue with the permitted request using the same scope and audit trail.",
    resourceClassification: String(record.resourceClass ?? "unknown"),
    disclosureDecision: String(record.disclosureClassification ?? "unknown"),
    redactionRequirement: String(record.redactionClassification ?? "none"),
    auditRequirement: Boolean(record.auditRequired ?? false),
    technicalReasons: technicalReasons.length > 0 ? technicalReasons : ["RESOURCE_POLICY_VALID"],
    policyReferences: [RESOURCE_POLICY_VERSION],
    evidenceReference: String(record.evidenceReference ?? "evidence-missing")
  };
}

function deny(
  decisionCode: string,
  friendlyTitle: string,
  explanation: string,
  workPreservation: string,
  safeNextAction: string,
  resourceClassification: string,
  disclosureDecision: string,
  redactionRequirement: string,
  auditRequirement: boolean,
  technicalReasons: string[],
  policyReferences: string[]
): ResourceAccessDecision {
  return {
    allowed: false,
    decisionCode,
    friendlyTitle,
    explanation,
    workPreservation,
    safeNextAction,
    resourceClassification,
    disclosureDecision,
    redactionRequirement,
    auditRequirement,
    technicalReasons,
    policyReferences,
    evidenceReference: "evidence-denied"
  };
}
