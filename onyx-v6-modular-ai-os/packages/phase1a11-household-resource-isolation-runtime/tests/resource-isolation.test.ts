import { describe, expect, it } from "vitest";
import { evaluateResourceAccess } from "../src/resource-evaluation";
import { validGrant, resourceFixtures } from "../src/fixtures";
import { validateOwnershipRecord } from "../src/model";
import { evaluateSharingGrant } from "../src/sharing-grants";

describe("Wave B3 resource isolation", () => {
  const baseHousehold = {
    householdId: "household_rahul",
    primaryOwnerAccountId: "acct_rahul",
    memberAccountIds: ["acct_rahul", "acct_family"],
    status: "active" as const
  };
  const rahulIdentity = {
    accountId: "acct_rahul",
    householdId: "household_rahul",
    membershipId: "membership_rahul",
    roleId: "PRIMARY_OWNER" as const,
    status: "active" as const,
    policyVersion: "policy-1",
    roleVersion: "role-1",
    membershipStatus: "active" as const
  };
  const familyIdentity = {
    accountId: "acct_family",
    householdId: "household_rahul",
    membershipId: "membership_family",
    roleId: "STANDARD_FAMILY_MEMBER" as const,
    status: "active" as const,
    policyVersion: "policy-1",
    roleVersion: "role-1",
    membershipStatus: "active" as const
  };
  const liveSession = {
    sessionId: "session_001",
    accountId: "acct_rahul",
    householdId: "household_rahul",
    status: "active" as const,
    activityState: "fresh" as const,
    policyVersion: "policy-1",
    roleVersion: "role-1",
    auditAvailable: true
  };

  it("allows owner access with independent authorization and denies cross-account access", () => {
    const allowed = evaluateResourceAccess({
      requestingAccount: "acct_rahul",
      currentIdentity: rahulIdentity,
      currentSession: liveSession,
      household: baseHousehold,
      ownershipRecord: resourceFixtures.rahulMemory,
      requestedOperation: "read",
      declaredPurpose: "memory-ownership",
      currentPolicyVersions: { resourcePolicy: "resource-policy-1" },
      currentTime: "2026-08-23T12:05:00.000Z",
      auditAvailable: true,
      technicalInformationEligible: true,
      operatingMode: "ACTIVE"
    });
    expect(allowed.allowed).toBe(true);
    expect(evaluateResourceAccess({
      requestingAccount: "acct_family",
      currentIdentity: familyIdentity,
      currentSession: liveSession,
      household: baseHousehold,
      ownershipRecord: resourceFixtures.rahulMemory,
      requestedOperation: "read",
      declaredPurpose: "memory-ownership",
      currentPolicyVersions: { resourcePolicy: "resource-policy-1" },
      currentTime: "2026-08-23T12:05:00.000Z",
      auditAvailable: true,
      technicalInformationEligible: false,
      operatingMode: "ACTIVE"
    }).allowed).toBe(false);
  });

  it("denies cross-household and unknown owner and resource cases", () => {
    expect(evaluateResourceAccess({
      requestingAccount: "acct_rahul",
      currentIdentity: rahulIdentity,
      currentSession: liveSession,
      household: { ...baseHousehold, householdId: "household_other" },
      ownershipRecord: { ...resourceFixtures.rahulMemory, householdId: "household_other" },
      requestedOperation: "read",
      declaredPurpose: "memory-ownership",
      currentPolicyVersions: { resourcePolicy: "resource-policy-1" },
      currentTime: "2026-08-23T12:05:00.000Z",
      auditAvailable: true,
      technicalInformationEligible: true,
      operatingMode: "ACTIVE"
    }).decisionCode).toBe("CROSS_HOUSEHOLD_RESOURCE_DENIED");
    expect(evaluateResourceAccess({
      requestingAccount: "acct_rahul",
      currentIdentity: { ...rahulIdentity, householdId: "household_other" },
      currentSession: { ...liveSession, householdId: "household_other" },
      household: baseHousehold,
      ownershipRecord: { ...resourceFixtures.rahulMemory, owningAccountId: "acct_rahul" },
      requestedOperation: "read",
      declaredPurpose: "memory-ownership",
      currentPolicyVersions: { resourcePolicy: "resource-policy-1" },
      currentTime: "2026-08-23T12:05:00.000Z",
      auditAvailable: true,
      technicalInformationEligible: true,
      operatingMode: "ACTIVE"
    }).decisionCode).toBe("CROSS_HOUSEHOLD_RESOURCE_DENIED");
    expect(evaluateResourceAccess({
      requestingAccount: "acct_rahul",
      currentIdentity: rahulIdentity,
      currentSession: liveSession,
      household: baseHousehold,
      ownershipRecord: { ...resourceFixtures.rahulMemory, owningAccountId: "unknown" },
      requestedOperation: "read",
      declaredPurpose: "memory-ownership",
      currentPolicyVersions: { resourcePolicy: "resource-policy-1" },
      currentTime: "2026-08-23T12:05:00.000Z",
      auditAvailable: true,
      technicalInformationEligible: true,
      operatingMode: "ACTIVE"
    }).decisionCode).toBe("UNKNOWN_OWNER_DENIED");
    expect(evaluateResourceAccess({
      requestingAccount: "acct_rahul",
      currentIdentity: rahulIdentity,
      currentSession: liveSession,
      household: baseHousehold,
      ownershipRecord: { ...resourceFixtures.rahulMemory, resourceId: "" },
      requestedOperation: "read",
      declaredPurpose: "memory-ownership",
      currentPolicyVersions: { resourcePolicy: "resource-policy-1" },
      currentTime: "2026-08-23T12:05:00.000Z",
      auditAvailable: true,
      technicalInformationEligible: true,
      operatingMode: "ACTIVE"
    }).decisionCode).toBe("UNKNOWN_RESOURCE_DENIED");
  });

  it("enforces visibility, purpose, audit, and Technical Information constraints", () => {
    expect(evaluateResourceAccess({
      requestingAccount: "acct_rahul",
      currentIdentity: rahulIdentity,
      currentSession: liveSession,
      household: baseHousehold,
      ownershipRecord: { ...resourceFixtures.rahulMemory, visibility: "denied" },
      requestedOperation: "read",
      declaredPurpose: "memory-ownership",
      currentPolicyVersions: { resourcePolicy: "resource-policy-1" },
      currentTime: "2026-08-23T12:05:00.000Z",
      auditAvailable: true,
      technicalInformationEligible: true,
      operatingMode: "ACTIVE"
    }).decisionCode).toBe("VISIBILITY_POLICY_DENIED");
    expect(evaluateResourceAccess({
      requestingAccount: "acct_rahul",
      currentIdentity: rahulIdentity,
      currentSession: liveSession,
      household: baseHousehold,
      ownershipRecord: { ...resourceFixtures.rahulMemory, purpose: "other" },
      requestedOperation: "read",
      declaredPurpose: "memory-ownership",
      currentPolicyVersions: { resourcePolicy: "resource-policy-1" },
      currentTime: "2026-08-23T12:05:00.000Z",
      auditAvailable: true,
      technicalInformationEligible: true,
      operatingMode: "ACTIVE"
    }).decisionCode).toBe("PURPOSE_MISMATCH");
    expect(evaluateResourceAccess({
      requestingAccount: "acct_rahul",
      currentIdentity: rahulIdentity,
      currentSession: liveSession,
      household: baseHousehold,
      ownershipRecord: { ...resourceFixtures.rahulMemory, auditRequired: true },
      requestedOperation: "read",
      declaredPurpose: "memory-ownership",
      currentPolicyVersions: { resourcePolicy: "resource-policy-1" },
      currentTime: "2026-08-23T12:05:00.000Z",
      auditAvailable: false,
      technicalInformationEligible: true,
      operatingMode: "ACTIVE"
    }).decisionCode).toBe("AUDIT_UNAVAILABLE");
    expect(evaluateResourceAccess({
      requestingAccount: "acct_rahul",
      currentIdentity: rahulIdentity,
      currentSession: liveSession,
      household: baseHousehold,
      ownershipRecord: resourceFixtures.projectJourney,
      requestedOperation: "read",
      declaredPurpose: "history-boundary",
      currentPolicyVersions: { resourcePolicy: "resource-policy-1" },
      currentTime: "2026-08-23T12:05:00.000Z",
      auditAvailable: true,
      technicalInformationEligible: false,
      operatingMode: "ACTIVE"
    }).decisionCode).toBe("TECHNICAL_INFORMATION_DENIED");
  });

  it("separates memory, conversations, connectors, caches, evidence, and Project Journey access", () => {
    const privateConversation = {
      ...resourceFixtures.rahulMemory,
      resourceId: "conversation_001",
      resourceClass: "conversation" as const,
      purpose: "conversation-ownership",
      visibility: "private" as const,
      owningAccountId: "acct_rahul"
    };
    const connectorResult = {
      ...resourceFixtures.connector,
      resourceId: "connector_result_001",
      resourceClass: "connector-result-reference" as const,
      purpose: "connector-result-isolation",
      visibility: "private" as const
    };
    const cacheRecord = {
      ...resourceFixtures.cache,
      resourceId: "cache_002",
      resourceClass: "cache" as const,
      owningAccountId: "acct_rahul",
      visibility: "private" as const
    };
    expect(evaluateResourceAccess({ requestingAccount: "acct_family", currentIdentity: familyIdentity, currentSession: liveSession, household: baseHousehold, ownershipRecord: privateConversation, requestedOperation: "read", declaredPurpose: "conversation-ownership", currentPolicyVersions: { resourcePolicy: "resource-policy-1" }, currentTime: "2026-08-23T12:05:00.000Z", auditAvailable: true, technicalInformationEligible: false, operatingMode: "ACTIVE" }).decisionCode).toBe("CROSS_ACCOUNT_RESOURCE_DENIED");
    expect(evaluateResourceAccess({ requestingAccount: "acct_rahul", currentIdentity: rahulIdentity, currentSession: liveSession, household: baseHousehold, ownershipRecord: connectorResult, requestedOperation: "read", declaredPurpose: "connector-result-isolation", currentPolicyVersions: { resourcePolicy: "resource-policy-1" }, currentTime: "2026-08-23T12:05:00.000Z", auditAvailable: true, technicalInformationEligible: true, operatingMode: "ACTIVE" }).allowed).toBe(true);
    expect(evaluateResourceAccess({ requestingAccount: "acct_rahul", currentIdentity: rahulIdentity, currentSession: { ...liveSession, accountId: "acct_family" }, household: baseHousehold, ownershipRecord: cacheRecord, requestedOperation: "read", declaredPurpose: "cache-isolation", currentPolicyVersions: { resourcePolicy: "resource-policy-1" }, currentTime: "2026-08-23T12:05:00.000Z", auditAvailable: true, technicalInformationEligible: true, operatingMode: "ACTIVE" }).decisionCode).toBe("CROSS_ACCOUNT_RESOURCE_DENIED");
    expect(evaluateResourceAccess({ requestingAccount: "acct_rahul", currentIdentity: rahulIdentity, currentSession: liveSession, household: baseHousehold, ownershipRecord: resourceFixtures.evidenceRecord, requestedOperation: "read", declaredPurpose: "evidence-integrity", currentPolicyVersions: { resourcePolicy: "resource-policy-1" }, currentTime: "2026-08-23T12:05:00.000Z", auditAvailable: true, technicalInformationEligible: true, operatingMode: "ACTIVE" }).allowed).toBe(true);
    expect(evaluateResourceAccess({ requestingAccount: "acct_family", currentIdentity: familyIdentity, currentSession: liveSession, household: baseHousehold, ownershipRecord: resourceFixtures.projectJourney, requestedOperation: "read", declaredPurpose: "history-boundary", currentPolicyVersions: { resourcePolicy: "resource-policy-1" }, currentTime: "2026-08-23T12:05:00.000Z", auditAvailable: true, technicalInformationEligible: true, operatingMode: "ACTIVE" }).decisionCode).toBe("PROJECT_JOURNEY_DENIED");
  });

  it("validates exact sharing grants and their boundary failures", () => {
    const valid = evaluateResourceAccess({
      requestingAccount: "acct_family",
      currentIdentity: familyIdentity,
      currentSession: liveSession,
      household: baseHousehold,
      ownershipRecord: { ...resourceFixtures.rahulMemory, owningAccountId: "acct_rahul", visibility: "household-shared", disclosureClassification: "household-shared", purpose: "memory-ownership", sharingGrantRequired: true },
      requestedOperation: "read",
      declaredPurpose: "memory-ownership",
      sharingGrant: { ...validGrant, receivingAccountId: "acct_family", exactPurpose: "memory-ownership", resourceClass: "memory-namespace" },
      currentPolicyVersions: { resourcePolicy: "resource-policy-1" },
      currentTime: "2026-08-23T12:05:00.000Z",
      auditAvailable: true,
      technicalInformationEligible: true,
      operatingMode: "ACTIVE"
    });
    expect(valid.allowed).toBe(true);
    expect(evaluateResourceAccess({ requestingAccount: "acct_family", currentIdentity: familyIdentity, currentSession: liveSession, household: baseHousehold, ownershipRecord: { ...resourceFixtures.rahulMemory, owningAccountId: "acct_rahul", visibility: "household-shared", disclosureClassification: "household-shared", purpose: "memory-ownership", sharingGrantRequired: true }, requestedOperation: "read", declaredPurpose: "memory-ownership", sharingGrant: { ...validGrant, status: "expired", expiry: "2026-08-22T12:00:00.000Z" }, currentPolicyVersions: { resourcePolicy: "resource-policy-1" }, currentTime: "2026-08-23T12:05:00.000Z", auditAvailable: true, technicalInformationEligible: true, operatingMode: "ACTIVE" }).decisionCode).toBe("SHARING_GRANT_EXPIRED");
    expect(evaluateResourceAccess({ requestingAccount: "acct_family", currentIdentity: familyIdentity, currentSession: liveSession, household: baseHousehold, ownershipRecord: { ...resourceFixtures.rahulMemory, owningAccountId: "acct_rahul", visibility: "household-shared", disclosureClassification: "household-shared", purpose: "memory-ownership", sharingGrantRequired: true }, requestedOperation: "read", declaredPurpose: "memory-ownership", sharingGrant: { ...validGrant, exactPurpose: "different-purpose" }, currentPolicyVersions: { resourcePolicy: "resource-policy-1" }, currentTime: "2026-08-23T12:05:00.000Z", auditAvailable: true, technicalInformationEligible: true, operatingMode: "ACTIVE" }).decisionCode).toBe("SHARING_GRANT_PURPOSE_MISMATCH");
    expect(evaluateResourceAccess({ requestingAccount: "acct_family", currentIdentity: familyIdentity, currentSession: liveSession, household: { ...baseHousehold, householdId: "household_other" }, ownershipRecord: { ...resourceFixtures.rahulMemory, householdId: "household_other", owningAccountId: "acct_rahul", visibility: "household-shared", disclosureClassification: "household-shared", purpose: "memory-ownership", sharingGrantRequired: true }, requestedOperation: "read", declaredPurpose: "memory-ownership", sharingGrant: { ...validGrant, householdScope: "household_other" }, currentPolicyVersions: { resourcePolicy: "resource-policy-1" }, currentTime: "2026-08-23T12:05:00.000Z", auditAvailable: true, technicalInformationEligible: true, operatingMode: "ACTIVE" }).decisionCode).toBe("CROSS_HOUSEHOLD_RESOURCE_DENIED");
  });

  it("rejects malformed ownership records before authorization", () => {
    const valid = resourceFixtures.rahulMemory;
    const cases = [
      ["resourceClass", "unknown"], ["ownerType", "unknown"], ["visibility", "unknown"],
      ["disclosureClassification", "unknown"], ["sourceClassification", "unknown"],
      ["retentionClassification", "unknown"], ["redactionClassification", "unknown"],
      ["creationTime", "not-a-time"], ["expiry", "not-a-time"],
      ["provenanceReference", ""], ["evidenceReference", ""]
    ] as const;
    for (const [field, value] of cases) {
      const record = { ...valid, [field]: value };
      expect(validateOwnershipRecord(record).valid, field).toBe(false);
      expect(evaluateResourceAccess({ requestingAccount: "acct_rahul", currentIdentity: rahulIdentity, currentSession: liveSession, household: baseHousehold, ownershipRecord: record, requestedOperation: "read", declaredPurpose: "memory-ownership", currentPolicyVersions: { resourcePolicy: "resource-policy-1" }, currentTime: "2026-08-23T12:05:00.000Z", auditAvailable: true, technicalInformationEligible: true, operatingMode: "ACTIVE" }).allowed, field).toBe(false);
    }
    expect(validateOwnershipRecord(valid).valid).toBe(true);
    expect(evaluateResourceAccess({ requestingAccount: "acct_rahul", currentIdentity: rahulIdentity, currentSession: liveSession, household: baseHousehold, ownershipRecord: { ...valid, expiry: "2026-08-23T12:00:00.000Z" }, requestedOperation: "read", declaredPurpose: "memory-ownership", currentPolicyVersions: { resourcePolicy: "resource-policy-1" }, currentTime: "2026-08-23T12:05:00.000Z", auditAvailable: true, technicalInformationEligible: true, operatingMode: "ACTIVE" }).decisionCode).toBe("RESOURCE_EXPIRED");
  });

  it("enforces active household membership before shared access", () => {
    const request = { requestingAccount: "acct_family", currentIdentity: familyIdentity, currentSession: liveSession, household: baseHousehold, ownershipRecord: resourceFixtures.householdSharedMemory, requestedOperation: "read", declaredPurpose: "memory-ownership", currentPolicyVersions: { resourcePolicy: "resource-policy-1" }, currentTime: "2026-08-23T12:05:00.000Z", auditAvailable: true, technicalInformationEligible: true, operatingMode: "ACTIVE" };
    expect(evaluateResourceAccess({ ...request, requestingAccount: "acct_other", currentIdentity: { ...familyIdentity, accountId: "acct_other" } }).decisionCode).toBe("HOUSEHOLD_MEMBERSHIP_DENIED");
    expect(evaluateResourceAccess({ ...request, household: { ...baseHousehold, status: "restricted" } }).decisionCode).toBe("HOUSEHOLD_INACTIVE");
    expect(evaluateResourceAccess({ ...request, household: { ...baseHousehold, memberAccountIds: ["acct_rahul"] } }).decisionCode).toBe("HOUSEHOLD_MEMBERSHIP_DENIED");
    expect(evaluateResourceAccess({ ...request, ownershipRecord: { ...resourceFixtures.householdSharedMemory, owningAccountId: "acct_other" } }).decisionCode).toBe("OWNER_HOUSEHOLD_MEMBERSHIP_DENIED");
  });

  it("covers account-bound and gateway-ready resource classes without authority transfer", () => {
    const classes = [
      ["memory-namespace", "memory-ownership", "owner"], ["conversation", "conversation-ownership", "owner"],
      ["connector-registration", "connector-governance", "connector"], ["connector-result-reference", "connector-result-isolation", "connector"],
      ["cache", "cache-isolation", "memory"], ["generated-document", "document-governance", "generated"],
      ["artifact", "artifact-ownership", "generated"], ["evidence", "evidence-integrity", "evidence"],
      ["project-journey", "history-boundary", "project-journey"], ["retrieved-result", "retrieval-boundary", "connector"],
      ["character-preference", "account-bound-presentation", "owner"], ["pending-gateway-request", "gateway-readiness", "owner"],
      ["contribution-envelope-reference", "advisory-boundary", "owner"], ["backup-manifest", "continuity-preservation", "connector"],
      ["recovery-artifact", "recovery-preservation", "connector"]
    ] as const;
    for (const [resourceClass, purpose, sourceClassification] of classes) {
      const record = { ...resourceFixtures.rahulMemory, resourceId: `${resourceClass}-001`, resourceClass, purpose, sourceClassification, visibility: resourceClass === "project-journey" ? "rahul-only" as const : "private" as const, disclosureClassification: resourceClass === "project-journey" ? "rahul-only" as const : "private" as const };
      const base = { requestingAccount: "acct_rahul", currentIdentity: rahulIdentity, currentSession: liveSession, household: baseHousehold, ownershipRecord: record, requestedOperation: "read", declaredPurpose: purpose, currentPolicyVersions: { resourcePolicy: "resource-policy-1" }, currentTime: "2026-08-23T12:05:00.000Z", auditAvailable: true, technicalInformationEligible: true, operatingMode: "ACTIVE" };
      expect(evaluateResourceAccess(base).allowed, resourceClass).toBe(true);
      expect(evaluateResourceAccess({ ...base, requestingAccount: "acct_family", currentIdentity: familyIdentity }).allowed, resourceClass).toBe(false);
    }
  });

  it("rejects stale policy and incompatible source disclosure", () => {
    const base = { requestingAccount: "acct_rahul", currentIdentity: rahulIdentity, currentSession: liveSession, household: baseHousehold, ownershipRecord: resourceFixtures.rahulMemory, requestedOperation: "read", declaredPurpose: "memory-ownership", currentTime: "2026-08-23T12:05:00.000Z", auditAvailable: true, technicalInformationEligible: true, operatingMode: "ACTIVE" };
    expect(evaluateResourceAccess({ ...base, currentPolicyVersions: { resourcePolicy: "resource-policy-0" } }).decisionCode).toBe("RESOURCE_POLICY_STALE");
    expect(evaluateResourceAccess({ ...base, currentPolicyVersions: { resourcePolicy: "resource-policy-1" }, ownershipRecord: { ...resourceFixtures.rahulMemory, sourceClassification: "project-journey", disclosureClassification: "private" } }).decisionCode).toBe("SOURCE_DISCLOSURE_MISMATCH");
    expect(evaluateResourceAccess({ ...base, currentPolicyVersions: { resourcePolicy: "resource-policy-1" }, ownershipRecord: { ...resourceFixtures.rahulMemory, policyVersion: "resource-policy-0" } }).decisionCode).toBe("RESOURCE_POLICY_STALE");
  });

  it("returns precise decisions for every sharing-grant boundary", () => {
    const base = { currentTime: "2026-08-23T12:05:00.000Z", requestingAccountId: "acct_family", householdId: "household_rahul", resourceClass: "memory-namespace" as const, operation: "read", purpose: "memory-ownership", disclosureClass: "household-shared" as const, sourceClass: "owner" as const, auditAvailable: true };
    const cases = {
      malformed: [{}, "SHARING_GRANT_MALFORMED"], expired: [{ ...validGrant, expiry: "2026-08-22T00:00:00.000Z" }, "SHARING_GRANT_EXPIRED"],
      revoked: [{ ...validGrant, status: "revoked" }, "SHARING_GRANT_REVOKED"], consumed: [{ ...validGrant, status: "consumed" }, "SHARING_GRANT_CONSUMED"], unknownStatus: [{ ...validGrant, status: "unknown" }, "SHARING_GRANT_REQUIRED"],
      grantingMismatch: [{ ...validGrant, grantingAccountId: "acct_family" }, "SHARING_GRANT_ACCOUNT_MISMATCH"], receivingMismatch: [{ ...validGrant, receivingAccountId: "acct_other" }, "SHARING_GRANT_ACCOUNT_MISMATCH"], householdMismatch: [{ ...validGrant, householdScope: "other" }, "SHARING_GRANT_HOUSEHOLD_MISMATCH"], resourceMismatch: [{ ...validGrant, resourceClass: "cache" }, "SHARING_GRANT_RESOURCE_MISMATCH"], operationMismatch: [{ ...validGrant, exactOperation: "write" }, "SHARING_GRANT_OPERATION_MISMATCH"], purposeMismatch: [{ ...validGrant, exactPurpose: "other" }, "SHARING_GRANT_PURPOSE_MISMATCH"], disclosureMismatch: [{ ...validGrant, disclosureClass: "private" }, "SHARING_GRANT_DISCLOSURE_MISMATCH"], sourceMismatch: [{ ...validGrant, sourceClasses: ["connector"] }, "SHARING_GRANT_SOURCE_MISMATCH"], stalePolicy: [{ ...validGrant, policyVersion: "resource-policy-0" }, "SHARING_GRANT_POLICY_STALE"], auditUnavailable: [{ ...validGrant, auditRequired: true }, "AUDIT_UNAVAILABLE"]
    } as const;
    for (const [name, [grant, expected]] of Object.entries(cases)) expect(evaluateSharingGrant({ ...base, grant: grant as any, auditAvailable: name !== "auditUnavailable" }).decisionCode, name).toBe(expected);
    expect(evaluateSharingGrant({ ...base, grant: validGrant }).valid).toBe(true);
  });
});
