/**
 * Idea Authorization Evaluator
 *
 * Deterministic, pure, fail-closed evaluator for Wave B3 Idea governance actions.
 */

import type { IdeaRecord } from "./idea-model.js";

export type IdeaOperation =
  | "create_draft"
  | "read"
  | "update"
  | "submit"
  | "assess"
  | "request_clarification"
  | "decide_disposition"
  | "request_preflight"
  | "create_readiness_record"
  | "archive"
  | "soft_delete"
  | "restore"
  | "permanently_delete"
  | "view_detailed_history"
  | "create_sanitized_summary";

export type IdeaPurpose =
  | "idea_governance"
  | "owner_decision"
  | "privacy_preserving_summary"
  | "audit_compliance"
  | "implementation_planning";

export type IdeaActorKind =
  | "owner"
  | "family"
  | "guest"
  | "service"
  | "device"
  | "character"
  | "agent"
  | "unknown";

export type OperatingMode = "ACTIVE" | "LIGHT" | "VACATION" | "HIBERNATION" | "UNKNOWN";

export interface IdentitySnapshot {
  readonly accountId: string;
  readonly householdId: string;
  readonly actorKind: IdeaActorKind;
  readonly active: boolean;
  readonly householdMember: boolean;
  readonly roleVersionFresh: boolean;
  readonly policyVersionFresh: boolean;
  readonly characterContextBound: boolean;
}

export interface SessionSnapshot {
  readonly sessionId: string;
  readonly status: "active" | "expired" | "revoked" | "replaced" | "unknown";
  readonly boundAccountId: string;
  readonly boundHouseholdId: string;
}

export interface SanitizedSharingContext {
  readonly requested: boolean;
  readonly policyAuthorized: boolean;
  readonly excludesProtectedSourceContent: boolean;
}

export interface IdeaGovernanceResourceReference {
  readonly ownerAccountId: string;
  readonly householdId: string;
  readonly privacyClassification: "public_summary_only" | "household_only" | "owner_only";
}

export interface IdeaAuthorizationInput {
  readonly requestingAccountId: string;
  readonly activeHouseholdId: string;
  readonly identity: IdentitySnapshot;
  readonly session: SessionSnapshot;
  readonly idea: IdeaRecord | IdeaGovernanceResourceReference;
  readonly operation: IdeaOperation;
  readonly purpose: IdeaPurpose;
  readonly architectureVersion: string;
  readonly policyVersion: string;
  readonly operatingMode: OperatingMode;
  readonly auditAvailable: boolean;
  readonly technicalInformationEligible: boolean;
  readonly ownerDecisionRequired: boolean;
  readonly sanitizedSharingContext?: SanitizedSharingContext;
  readonly canonicalPrimaryOwnerAccountId: string;
  readonly householdActive: boolean;
}

export interface IdeaAuthorizationDecision {
  readonly allowed: boolean;
  readonly decisionCode: string;
  readonly friendlyTitle: string;
  readonly explanation: string;
  readonly safeNextAction: string;
  readonly workPreservationStatement: string;
  readonly auditRequirement: "required" | "not_required";
  readonly redactionRequirement: "required" | "not_required";
  readonly technicalReasons: readonly string[];
  readonly policyReferences: readonly string[];
  readonly evidenceReference: string;
}

const OWNER_ONLY_OPERATIONS = new Set<IdeaOperation>([
  "decide_disposition",
  "create_readiness_record",
  "permanently_delete",
  "view_detailed_history",
]);

const PROTECTED_BY_AUDIT = new Set<IdeaOperation>([
  "decide_disposition",
  "create_readiness_record",
  "view_detailed_history",
  "permanently_delete",
]);

const ARCHITECTURE_IMPACTING = new Set<IdeaOperation>([
  "decide_disposition",
  "create_readiness_record",
]);

function deny(
  decisionCode: string,
  friendlyTitle: string,
  explanation: string,
  technicalReasons: readonly string[],
): IdeaAuthorizationDecision {
  return {
    allowed: false,
    decisionCode,
    friendlyTitle,
    explanation,
    safeNextAction: "Verify identity, membership, policy scope, and retry with an authorized account.",
    workPreservationStatement: "No Idea content was modified. Existing work remains preserved.",
    auditRequirement: "required",
    redactionRequirement: "required",
    technicalReasons,
    policyReferences: [
      "phase1a11.single_primary_owner",
      "phase1a11.deny_by_default",
      "phase1a11.account_household_isolation",
      "phase1a11.advisory_only_assessment_preflight_readiness",
    ],
    evidenceReference: "phase1a11-wave-b3-idea-authorization",
  };
}

function allow(decisionCode: string, explanation: string): IdeaAuthorizationDecision {
  return {
    allowed: true,
    decisionCode,
    friendlyTitle: "Request allowed",
    explanation,
    safeNextAction: "Proceed with the bounded Idea governance action and record audit evidence.",
    workPreservationStatement: "Only the requested bounded governance action is permitted.",
    auditRequirement: "required",
    redactionRequirement: "required",
    technicalReasons: [
      "All deny-by-default gates passed in deterministic order.",
      "Authorization is limited to Idea governance only; no execution authority is granted.",
    ],
    policyReferences: [
      "phase1a11.single_primary_owner",
      "phase1a11.deny_by_default",
      "phase1a11.audit_required_for_protected_operations",
      "phase1a11.technical_information_not_authority",
    ],
    evidenceReference: "phase1a11-wave-b3-idea-authorization",
  };
}

function getIdeaOwnerAndHousehold(idea: IdeaRecord | IdeaGovernanceResourceReference): {
  ownerAccountId: string;
  householdId: string;
  privacyClassification: "public_summary_only" | "household_only" | "owner_only";
} {
  return {
    ownerAccountId: idea.ownerAccountId,
    householdId: idea.householdId,
    privacyClassification: idea.privacyClassification,
  };
}

export function evaluateIdeaAuthorization(input: IdeaAuthorizationInput): IdeaAuthorizationDecision {
  const resource = getIdeaOwnerAndHousehold(input.idea);

  // 1) Input structure
  if (!input.requestingAccountId || !input.activeHouseholdId || !input.architectureVersion || !input.policyVersion) {
    return deny("AUTH_INPUT_INVALID", "Request denied", "The request is missing required authorization context.", ["Required input fields are missing."]);
  }

  // 2) Idea ownership structure
  if (!resource.ownerAccountId || !resource.householdId) {
    return deny("AUTH_IDEA_OWNER_INVALID", "Request denied", "The Idea ownership structure is invalid.", ["Idea owner/household binding missing."]);
  }

  // 3) Identity validity
  if (!input.identity.active || input.identity.actorKind === "unknown") {
    return deny("AUTH_IDENTITY_INVALID", "Request denied", "The requester identity is invalid or inactive.", ["Identity is inactive or unknown."]);
  }

  // 4) Session validity
  if (input.session.status !== "active") {
    return deny("AUTH_SESSION_INVALID", "Request denied", "The session is not active.", [`Session status is ${input.session.status}.`]);
  }

  // 5) Account and household binding
  if (
    input.session.boundAccountId !== input.requestingAccountId ||
    input.session.boundHouseholdId !== input.activeHouseholdId ||
    input.identity.accountId !== input.requestingAccountId ||
    input.identity.householdId !== input.activeHouseholdId
  ) {
    return deny("AUTH_BINDING_MISMATCH", "Request denied", "The account or household binding is inconsistent.", ["Identity/session binding mismatch detected."]);
  }

  // 6) Household membership
  if (!input.householdActive || !input.identity.householdMember) {
    return deny("AUTH_MEMBERSHIP_DENIED", "Request denied", "The requester is not an active household member.", ["Inactive household or missing membership."]);
  }

  // 7) Role and policy-version freshness
  if (!input.identity.roleVersionFresh || !input.identity.policyVersionFresh) {
    return deny("AUTH_POLICY_STALE", "Request denied", "Authorization policy or role data is stale.", ["Role/policy version freshness gate failed."]);
  }

  // 8) Idea ownership and isolation
  if (resource.householdId !== input.activeHouseholdId) {
    return deny("AUTH_CROSS_HOUSEHOLD_DENY", "Request denied", "Cross-household Idea access is not allowed.", ["Idea household differs from active household."]);
  }

  const requesterOwnsIdea = resource.ownerAccountId === input.requestingAccountId;
  if (!requesterOwnsIdea && resource.privacyClassification !== "public_summary_only") {
    return deny("AUTH_CROSS_ACCOUNT_PRIVATE_DENY", "Request denied", "Private Idea access from another account is not allowed.", ["Requester does not own private or household-only Idea resource."]);
  }

  // 9) Requested operation
  const knownOperations: readonly IdeaOperation[] = [
    "create_draft",
    "read",
    "update",
    "submit",
    "assess",
    "request_clarification",
    "decide_disposition",
    "request_preflight",
    "create_readiness_record",
    "archive",
    "soft_delete",
    "restore",
    "permanently_delete",
    "view_detailed_history",
    "create_sanitized_summary",
  ];
  if (!knownOperations.includes(input.operation)) {
    return deny("AUTH_OPERATION_UNKNOWN", "Request denied", "The requested operation is not supported.", ["Unknown Idea operation."]);
  }

  // 10) Purpose
  const knownPurposes: readonly IdeaPurpose[] = [
    "idea_governance",
    "owner_decision",
    "privacy_preserving_summary",
    "audit_compliance",
    "implementation_planning",
  ];
  if (!knownPurposes.includes(input.purpose)) {
    return deny("AUTH_PURPOSE_UNKNOWN", "Request denied", "The declared purpose is not supported.", ["Unknown or unsupported purpose."]);
  }

  // 11) Rahul-only decision requirement
  if (input.ownerDecisionRequired || ARCHITECTURE_IMPACTING.has(input.operation)) {
    if (input.requestingAccountId !== input.canonicalPrimaryOwnerAccountId) {
      return deny("AUTH_OWNER_ONLY_DECISION", "Owner decision required", "Only Rahul may approve architecture-impacting decisions.", ["Owner-only decision gate failed."]);
    }
  }

  if (OWNER_ONLY_OPERATIONS.has(input.operation) && !requesterOwnsIdea) {
    return deny("AUTH_OWNER_OPERATION_DENY", "Request denied", "This operation requires ownership of the Idea.", ["Owner-only operation attempted by non-owner."]);
  }

  if (
    input.operation === "decide_disposition" ||
    input.operation === "create_readiness_record"
  ) {
    if (["family", "guest", "service", "device", "character", "agent"].includes(input.identity.actorKind)) {
      return deny("AUTH_ACTOR_NOT_ELIGIBLE", "Request denied", "This actor type cannot approve architecture-impacting decisions.", ["Actor kind is not eligible for owner-only approval."]);
    }
  }

  // 12) Resource and disclosure policy
  if (input.operation === "create_sanitized_summary") {
    const sharing = input.sanitizedSharingContext;
    if (!sharing?.requested || !sharing.policyAuthorized || !sharing.excludesProtectedSourceContent) {
      return deny("AUTH_SANITIZED_SUMMARY_POLICY", "Request denied", "Sanitized summary policy requirements are not satisfied.", ["Sanitized sharing context is missing or unauthorized."]);
    }
    if (input.requestingAccountId !== input.canonicalPrimaryOwnerAccountId) {
      return deny("AUTH_SANITIZED_SUMMARY_OWNER_ONLY", "Request denied", "Only Rahul may authorize sanitized Idea summaries.", ["Owner-only sanitized summary gate failed."]);
    }
  }

  if (input.operation === "view_detailed_history" && input.requestingAccountId !== input.canonicalPrimaryOwnerAccountId) {
    return deny("AUTH_HISTORY_OWNER_ONLY", "Request denied", "Detailed Idea history is Rahul-only.", ["Detailed history access requires canonical owner."]);
  }

  // 13) Operating-mode capability
  if (input.operatingMode === "UNKNOWN") {
    return deny("AUTH_MODE_UNKNOWN", "Request denied", "The current operating mode is unknown.", ["Unknown operating mode denies by default."]);
  }

  if (input.operatingMode === "HIBERNATION") {
    if (input.operation === "assess" || input.operation === "create_readiness_record") {
      return deny("AUTH_HIBERNATION_CAPABILITY_DENY", "Request denied", "HIBERNATION does not allow active assessment or readiness creation.", ["Mode capability boundary denies operation."]);
    }
  }

  // 14) Audit availability
  if (PROTECTED_BY_AUDIT.has(input.operation) && !input.auditAvailable) {
    return deny("AUTH_AUDIT_UNAVAILABLE", "Request denied", "Audit availability is required for this protected operation.", ["Protected operation blocked while audit is unavailable."]);
  }

  // 15) Technical Information presentation
  if (input.technicalInformationEligible && input.identity.characterContextBound === false) {
    return deny("AUTH_TECH_INFO_CONTEXT", "Request denied", "Technical Information context is invalid.", ["Technical Information eligibility cannot bypass invalid context."]);
  }

  return allow(
    "AUTH_ALLOWED",
    "The Idea governance request is authorized within deny-by-default policy boundaries. No Git, deployment, connector, permission, secret, budget, cloud, or external authority is granted.",
  );
}
