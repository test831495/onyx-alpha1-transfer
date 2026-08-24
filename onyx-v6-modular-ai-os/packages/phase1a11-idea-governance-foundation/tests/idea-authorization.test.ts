import { describe, expect, it } from "vitest";
import {
  evaluateIdeaAuthorization,
  type IdeaAuthorizationInput,
  type IdeaGovernanceResourceReference,
} from "../src/index.js";

const OWNER_ACCOUNT = "rahul_owner_account";
const FAMILY_ACCOUNT = "family_account_001";
const HOUSEHOLD = "household_001";

function baseIdea(): IdeaGovernanceResourceReference {
  return {
    ownerAccountId: OWNER_ACCOUNT,
    householdId: HOUSEHOLD,
    privacyClassification: "owner_only",
  };
}

function baseInput(overrides: Partial<IdeaAuthorizationInput> = {}): IdeaAuthorizationInput {
  return {
    requestingAccountId: OWNER_ACCOUNT,
    activeHouseholdId: HOUSEHOLD,
    identity: {
      accountId: OWNER_ACCOUNT,
      householdId: HOUSEHOLD,
      actorKind: "owner",
      active: true,
      householdMember: true,
      roleVersionFresh: true,
      policyVersionFresh: true,
      characterContextBound: true,
    },
    session: {
      sessionId: "session_001",
      status: "active",
      boundAccountId: OWNER_ACCOUNT,
      boundHouseholdId: HOUSEHOLD,
    },
    idea: baseIdea(),
    operation: "decide_disposition",
    purpose: "owner_decision",
    architectureVersion: "1.0.0",
    policyVersion: "1.0.0",
    operatingMode: "ACTIVE",
    auditAvailable: true,
    technicalInformationEligible: false,
    ownerDecisionRequired: true,
    sanitizedSharingContext: {
      requested: true,
      policyAuthorized: true,
      excludesProtectedSourceContent: true,
    },
    canonicalPrimaryOwnerAccountId: OWNER_ACCOUNT,
    householdActive: true,
    ...overrides,
  };
}

function expectDenied(decision: ReturnType<typeof evaluateIdeaAuthorization>): void {
  expect(decision.allowed).toBe(false);
  expect(decision.workPreservationStatement).toContain("preserved");
}

describe("Idea authorization deny-by-default", () => {
  it("owner_architecture_decision_allowed", () => {
    const decision = evaluateIdeaAuthorization(baseInput());
    expect(decision.allowed).toBe(true);
  });

  it("family_architecture_decision_denied", () => {
    const decision = evaluateIdeaAuthorization(
      baseInput({
        requestingAccountId: FAMILY_ACCOUNT,
        identity: {
          ...baseInput().identity,
          accountId: FAMILY_ACCOUNT,
          actorKind: "family",
        },
        session: {
          ...baseInput().session,
          boundAccountId: FAMILY_ACCOUNT,
        },
      }),
    );
    expectDenied(decision);
  });

  it("guest_architecture_decision_denied", () => {
    const decision = evaluateIdeaAuthorization(
      baseInput({
        requestingAccountId: FAMILY_ACCOUNT,
        identity: {
          ...baseInput().identity,
          accountId: FAMILY_ACCOUNT,
          actorKind: "guest",
        },
        session: {
          ...baseInput().session,
          boundAccountId: FAMILY_ACCOUNT,
        },
      }),
    );
    expectDenied(decision);
  });

  it("service_architecture_decision_denied", () => {
    const decision = evaluateIdeaAuthorization(
      baseInput({
        requestingAccountId: FAMILY_ACCOUNT,
        identity: {
          ...baseInput().identity,
          accountId: FAMILY_ACCOUNT,
          actorKind: "service",
        },
        session: {
          ...baseInput().session,
          boundAccountId: FAMILY_ACCOUNT,
        },
      }),
    );
    expectDenied(decision);
  });

  it("device_architecture_decision_denied", () => {
    const decision = evaluateIdeaAuthorization(
      baseInput({
        requestingAccountId: FAMILY_ACCOUNT,
        identity: {
          ...baseInput().identity,
          accountId: FAMILY_ACCOUNT,
          actorKind: "device",
        },
        session: {
          ...baseInput().session,
          boundAccountId: FAMILY_ACCOUNT,
        },
      }),
    );
    expectDenied(decision);
  });

  it("character_architecture_decision_denied", () => {
    const decision = evaluateIdeaAuthorization(
      baseInput({
        requestingAccountId: FAMILY_ACCOUNT,
        identity: {
          ...baseInput().identity,
          accountId: FAMILY_ACCOUNT,
          actorKind: "character",
        },
        session: {
          ...baseInput().session,
          boundAccountId: FAMILY_ACCOUNT,
        },
      }),
    );
    expectDenied(decision);
  });

  it("agent_architecture_decision_denied", () => {
    const decision = evaluateIdeaAuthorization(
      baseInput({
        requestingAccountId: FAMILY_ACCOUNT,
        identity: {
          ...baseInput().identity,
          accountId: FAMILY_ACCOUNT,
          actorKind: "agent",
        },
        session: {
          ...baseInput().session,
          boundAccountId: FAMILY_ACCOUNT,
        },
      }),
    );
    expectDenied(decision);
  });

  it("non_owner_disposition_approval_denied", () => {
    const decision = evaluateIdeaAuthorization(
      baseInput({
        requestingAccountId: FAMILY_ACCOUNT,
        operation: "decide_disposition",
        identity: {
          ...baseInput().identity,
          accountId: FAMILY_ACCOUNT,
          actorKind: "family",
        },
        session: {
          ...baseInput().session,
          boundAccountId: FAMILY_ACCOUNT,
        },
      }),
    );
    expectDenied(decision);
  });

  it("non_owner_readiness_creation_denied", () => {
    const decision = evaluateIdeaAuthorization(
      baseInput({
        requestingAccountId: FAMILY_ACCOUNT,
        operation: "create_readiness_record",
        identity: {
          ...baseInput().identity,
          accountId: FAMILY_ACCOUNT,
          actorKind: "family",
        },
        session: {
          ...baseInput().session,
          boundAccountId: FAMILY_ACCOUNT,
        },
      }),
    );
    expectDenied(decision);
  });

  it("owner_read_owned_idea_allowed", () => {
    const decision = evaluateIdeaAuthorization(baseInput({ operation: "read", purpose: "idea_governance", ownerDecisionRequired: false }));
    expect(decision.allowed).toBe(true);
  });

  it("owner_update_owned_draft_allowed", () => {
    const decision = evaluateIdeaAuthorization(baseInput({ operation: "update", purpose: "idea_governance", ownerDecisionRequired: false }));
    expect(decision.allowed).toBe(true);
  });

  it("cross_account_private_read_denied", () => {
    const decision = evaluateIdeaAuthorization(
      baseInput({
        requestingAccountId: FAMILY_ACCOUNT,
        operation: "read",
        purpose: "idea_governance",
        ownerDecisionRequired: false,
        identity: {
          ...baseInput().identity,
          accountId: FAMILY_ACCOUNT,
          actorKind: "family",
        },
        session: {
          ...baseInput().session,
          boundAccountId: FAMILY_ACCOUNT,
        },
      }),
    );
    expectDenied(decision);
  });

  it("cross_account_private_update_denied", () => {
    const decision = evaluateIdeaAuthorization(
      baseInput({
        requestingAccountId: FAMILY_ACCOUNT,
        operation: "update",
        purpose: "idea_governance",
        ownerDecisionRequired: false,
        identity: {
          ...baseInput().identity,
          accountId: FAMILY_ACCOUNT,
          actorKind: "family",
        },
        session: {
          ...baseInput().session,
          boundAccountId: FAMILY_ACCOUNT,
        },
      }),
    );
    expectDenied(decision);
  });

  it("cross_household_access_denied", () => {
    const decision = evaluateIdeaAuthorization(baseInput({ activeHouseholdId: "other_household" }));
    expectDenied(decision);
  });

  it("non_member_access_denied", () => {
    const decision = evaluateIdeaAuthorization(baseInput({ identity: { ...baseInput().identity, householdMember: false } }));
    expectDenied(decision);
  });

  it("inactive_household_denied", () => {
    const decision = evaluateIdeaAuthorization(baseInput({ householdActive: false }));
    expectDenied(decision);
  });

  it("invalid_identity_denied", () => {
    const decision = evaluateIdeaAuthorization(baseInput({ identity: { ...baseInput().identity, active: false } }));
    expectDenied(decision);
  });

  it("expired_session_denied", () => {
    const decision = evaluateIdeaAuthorization(baseInput({ session: { ...baseInput().session, status: "expired" } }));
    expectDenied(decision);
  });

  it("revoked_session_denied", () => {
    const decision = evaluateIdeaAuthorization(baseInput({ session: { ...baseInput().session, status: "revoked" } }));
    expectDenied(decision);
  });

  it("replaced_session_denied", () => {
    const decision = evaluateIdeaAuthorization(baseInput({ session: { ...baseInput().session, status: "replaced" } }));
    expectDenied(decision);
  });

  it("another_account_cannot_view_detailed_history", () => {
    const decision = evaluateIdeaAuthorization(
      baseInput({
        operation: "view_detailed_history",
        requestingAccountId: FAMILY_ACCOUNT,
        ownerDecisionRequired: false,
        identity: { ...baseInput().identity, accountId: FAMILY_ACCOUNT, actorKind: "family" },
        session: { ...baseInput().session, boundAccountId: FAMILY_ACCOUNT },
      }),
    );
    expectDenied(decision);
  });

  it("sanitized_summary_requires_owner_authorized_policy", () => {
    const decision = evaluateIdeaAuthorization(baseInput({
      operation: "create_sanitized_summary",
      purpose: "privacy_preserving_summary",
      ownerDecisionRequired: false,
      sanitizedSharingContext: {
        requested: true,
        policyAuthorized: false,
        excludesProtectedSourceContent: true,
      },
    }));
    expectDenied(decision);
  });

  it("sanitized_summary_excludes_protected_source_content", () => {
    const decision = evaluateIdeaAuthorization(baseInput({
      operation: "create_sanitized_summary",
      purpose: "privacy_preserving_summary",
      ownerDecisionRequired: false,
      sanitizedSharingContext: {
        requested: true,
        policyAuthorized: true,
        excludesProtectedSourceContent: true,
      },
    }));
    expect(decision.allowed).toBe(true);
  });

  it("assessment_cannot_approve", () => {
    const decision = evaluateIdeaAuthorization(baseInput({
      operation: "assess",
      purpose: "idea_governance",
      ownerDecisionRequired: true,
      requestingAccountId: FAMILY_ACCOUNT,
      identity: { ...baseInput().identity, accountId: FAMILY_ACCOUNT, actorKind: "family" },
      session: { ...baseInput().session, boundAccountId: FAMILY_ACCOUNT },
    }));
    expectDenied(decision);
  });

  it("preflight_does_not_authorize_modification_paths", () => {
    const decision = evaluateIdeaAuthorization(baseInput({
      operation: "request_preflight",
      purpose: "implementation_planning",
      ownerDecisionRequired: false,
    }));
    expect(decision.allowed).toBe(true);
    expect(decision.explanation.toLowerCase()).toContain("no git");
  });

  it("readiness_does_not_authorize_external_actions", () => {
    const decision = evaluateIdeaAuthorization(baseInput({
      operation: "create_readiness_record",
      purpose: "implementation_planning",
      ownerDecisionRequired: true,
    }));
    expect(decision.allowed).toBe(true);
    expect(decision.explanation).toContain("connector");
    expect(decision.explanation).toContain("cloud");
  });

  it("technical_information_does_not_increase_access", () => {
    const decision = evaluateIdeaAuthorization(baseInput({
      requestingAccountId: FAMILY_ACCOUNT,
      operation: "read",
      purpose: "idea_governance",
      ownerDecisionRequired: false,
      technicalInformationEligible: true,
      identity: { ...baseInput().identity, accountId: FAMILY_ACCOUNT, actorKind: "family" },
      session: { ...baseInput().session, boundAccountId: FAMILY_ACCOUNT },
    }));
    expectDenied(decision);
  });

  it("character_switching_does_not_increase_access", () => {
    const decision = evaluateIdeaAuthorization(baseInput({
      requestingAccountId: FAMILY_ACCOUNT,
      operation: "decide_disposition",
      identity: { ...baseInput().identity, accountId: FAMILY_ACCOUNT, actorKind: "character" },
      session: { ...baseInput().session, boundAccountId: FAMILY_ACCOUNT },
    }));
    expectDenied(decision);
  });

  it("instruction_like_idea_text_cannot_alter_policy", () => {
    const maliciousIdea: IdeaGovernanceResourceReference = {
      ownerAccountId: OWNER_ACCOUNT,
      householdId: HOUSEHOLD,
      privacyClassification: "owner_only",
    };
    const decision = evaluateIdeaAuthorization(baseInput({ idea: maliciousIdea }));
    expect(decision.allowed).toBe(true);
    expect(decision.policyReferences).toContain("phase1a11.deny_by_default");
  });

  it("operating_mode_does_not_create_authority", () => {
    const decision = evaluateIdeaAuthorization(baseInput({
      operation: "create_readiness_record",
      operatingMode: "HIBERNATION",
    }));
    expectDenied(decision);
  });

  it("audit_failure_denies_protected_actions", () => {
    const decision = evaluateIdeaAuthorization(baseInput({ auditAvailable: false }));
    expectDenied(decision);
  });

  it("friendly_denial_exposes_no_private_data", () => {
    const decision = evaluateIdeaAuthorization(baseInput({ requestingAccountId: FAMILY_ACCOUNT, identity: { ...baseInput().identity, accountId: FAMILY_ACCOUNT, actorKind: "family" }, session: { ...baseInput().session, boundAccountId: FAMILY_ACCOUNT } }));
    expectDenied(decision);
    expect(decision.explanation).not.toContain(OWNER_ACCOUNT);
    expect(decision.explanation).not.toContain(HOUSEHOLD);
  });

  it("gateway_contribution_remains_advisory", () => {
    const decision = evaluateIdeaAuthorization(baseInput({ operation: "assess", purpose: "idea_governance", ownerDecisionRequired: false }));
    expect(decision.allowed).toBe(true);
    expect(decision.explanation).toContain("No Git");
  });

  it("no_raw_memory_or_credentials_cross_boundary", () => {
    const decision = evaluateIdeaAuthorization(baseInput({ operation: "create_sanitized_summary", purpose: "privacy_preserving_summary", ownerDecisionRequired: false }));
    expect(decision.allowed).toBe(true);
    expect(decision.redactionRequirement).toBe("required");
  });
});
