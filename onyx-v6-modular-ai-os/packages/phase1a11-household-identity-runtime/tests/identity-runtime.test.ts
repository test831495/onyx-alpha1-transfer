import { describe, expect, it } from "vitest";
import { baseAuthorizationInput, accounts, identities, membership, householdId } from "../src/fixtures";
import { evaluateAuthorization } from "../src/authorization";
import { CANONICAL_OWNER_BINDING, CURRENT_PERMISSION_CATALOG_VERSION, CURRENT_POLICY_VERSION, CURRENT_ROLE_VERSION, RAHUL_CANONICAL_ACCOUNT, validateCanonicalOwner, validateIdentity, validateRoleAssignment } from "../src/model";
import { friendlyLabel } from "../src/labels";

const decision = (overrides: Partial<typeof baseAuthorizationInput> = {}) => evaluateAuthorization({ ...baseAuthorizationInput, ...overrides });

describe("Wave B1 identity foundation", () => {
  it("enforces exactly one canonical Rahul owner", () => {
    expect(validateCanonicalOwner([CANONICAL_OWNER_BINDING]).valid).toBe(true);
    expect(validateCanonicalOwner([]).technicalReason).toBe("MISSING_CANONICAL_OWNER");
    expect(validateCanonicalOwner([CANONICAL_OWNER_BINDING, CANONICAL_OWNER_BINDING]).technicalReason).toBe("DUPLICATE_PRIMARY_OWNER");
    expect(validateCanonicalOwner([{ ...CANONICAL_OWNER_BINDING, accountId: "account_other" as typeof RAHUL_CANONICAL_ACCOUNT }]).valid).toBe(false);
    expect(validateRoleAssignment(accounts.device, "PRIMARY_OWNER").valid).toBe(false);
    expect(validateRoleAssignment({ ...accounts.rahul, identityKind: "character" }, "PRIMARY_OWNER").valid).toBe(false);
  });
  it("validates active identity and denies invalid account or membership states", () => {
    expect(validateIdentity(identities.rahul, baseAuthorizationInput.currentTime!).valid).toBe(true);
    expect(validateIdentity({ ...identities.rahul, account: accounts.suspended }, baseAuthorizationInput.currentTime!).valid).toBe(false);
    expect(validateIdentity({ ...identities.rahul, account: accounts.disabled }, baseAuthorizationInput.currentTime!).valid).toBe(false);
    expect(validateIdentity({ ...identities.rahul, membership: membership(accounts.rahul, "GUEST", { status: "expired" }) }, baseAuthorizationInput.currentTime!).valid).toBe(false);
    expect(validateIdentity({ ...identities.rahul, membership: { ...identities.rahul.membership, householdId: "household_other" } }, baseAuthorizationInput.currentTime!).valid).toBe(false);
    expect(validateIdentity({ ...identities.rahul, membership: { ...identities.rahul.membership, accountId: "account_other" } }, baseAuthorizationInput.currentTime!).valid).toBe(false);
  });
  it("denies missing, unknown, prohibited, empty, and stale permissions", () => {
    expect(decision({ requestedPermission: undefined }).allowed).toBe(false);
    expect(decision({ requestedPermission: "UNKNOWN" }).technicalReason).toBe("UNKNOWN_PERMISSION");
    expect(decision({ assignedPermissions: [] }).allowed).toBe(false);
    expect(decision({ identity: identities.administrator, requestedPermission: "DETAILED_PROJECT_JOURNEY_ACCESS", assignedPermissions: ["DETAILED_PROJECT_JOURNEY_ACCESS"], explicitHistoricalIntent: true }).allowed).toBe(false);
    expect(decision({ permissionCatalogVersion: "permission-catalog-old" }).technicalReason).toBe("STALE_PERMISSION_CATALOG_VERSION");
  });
  it("denies stale policy and role versions", () => {
    expect(decision({ policyVersion: "policy-old" }).technicalReason).toBe("STALE_POLICY_VERSION");
    expect(decision({ roleVersion: "role-old" }).technicalReason).toBe("STALE_ROLE_VERSION");
    expect(decision({ policyVersion: CURRENT_POLICY_VERSION, roleVersion: CURRENT_ROLE_VERSION, permissionCatalogVersion: CURRENT_PERMISSION_CATALOG_VERSION }).allowed).toBe(true);
  });
  it("requires valid session and sufficient assurance without issuing a session", () => {
    expect(decision({ sessionValidity: "missing" }).allowed).toBe(false);
    expect(decision({ sessionValidity: "invalid" }).allowed).toBe(false);
    expect(decision({ authenticationAssurance: "insufficient" }).allowed).toBe(false);
    expect(decision({ authenticationAssurance: "missing" }).allowed).toBe(false);
    expect("sessionId" in baseAuthorizationInput).toBe(false);
  });
  it("separates detailed history from basic project information", () => {
    expect(decision({ requestedPermission: "DETAILED_PROJECT_JOURNEY_ACCESS", assignedPermissions: ["DETAILED_PROJECT_JOURNEY_ACCESS"], resourceClassification: "project_detailed", purpose: "project_information", explicitHistoricalIntent: true }).allowed).toBe(true);
    expect(decision({ identity: identities.administrator, requestedPermission: "DETAILED_PROJECT_JOURNEY_ACCESS", assignedPermissions: ["DETAILED_PROJECT_JOURNEY_ACCESS"], resourceClassification: "project_detailed", purpose: "project_information", explicitHistoricalIntent: true }).allowed).toBe(false);
    expect(decision({ identity: identities.administrator, requestedPermission: "BASIC_PROJECT_INFORMATION_ACCESS", assignedPermissions: ["BASIC_PROJECT_INFORMATION_ACCESS"], resourceClassification: "project_basic", purpose: "project_information" }).allowed).toBe(true);
    expect(decision({ requestedPermission: "BASIC_PROJECT_INFORMATION_ACCESS", assignedPermissions: ["BASIC_PROJECT_INFORMATION_ACCESS"], resourceClassification: "project_detailed", purpose: "project_information", explicitHistoricalIntent: true }).allowed).toBe(false);
  });
  it("keeps character presentation outside authorization", () => {
    const onyx = decision({ characterPresentationIdentity: "ONYX" });
    const nova = decision({ characterPresentationIdentity: "NOVA" });
    const alias = decision({ characterPresentationIdentity: "ALIAS" });
    expect([onyx.allowed, onyx.decisionCode]).toEqual([nova.allowed, nova.decisionCode]);
    expect([onyx.allowed, onyx.decisionCode]).toEqual([alias.allowed, alias.decisionCode]);
    expect(validateRoleAssignment({ ...accounts.rahul, identityKind: "character" }, "PRIMARY_OWNER").valid).toBe(false);
  });
  it("protects private resources, Technical Information, devices, and audit actions", () => {
    expect(decision({ targetResourceOwner: "account_other", resourceClassification: "private" }).allowed).toBe(false);
    expect(decision({ requestedPermission: "TECHNICAL_INFORMATION_ACCESS", assignedPermissions: ["TECHNICAL_INFORMATION_ACCESS"], resourceClassification: "technical", purpose: "technical_review", technicalInformationRequest: true }).allowed).toBe(true);
    expect(decision({ requestedPermission: "TECHNICAL_INFORMATION_ACCESS", assignedPermissions: [], technicalInformationRequest: true }).allowed).toBe(false);
    expect(decision({ identity: identities.device, requestedPermission: "DETAILED_PROJECT_JOURNEY_ACCESS", assignedPermissions: ["DETAILED_PROJECT_JOURNEY_ACCESS"], resourceClassification: "project_detailed", purpose: "project_information", explicitHistoricalIntent: true }).allowed).toBe(false);
    expect(decision({ requestedPermission: "PROTECTED_OWNER_INSPECTION", assignedPermissions: ["PROTECTED_OWNER_INSPECTION"], resourceClassification: "owner_protected", purpose: "owner_oversight", auditAvailable: false }).technicalReason).toBe("AUDIT_UNAVAILABLE");
  });
  it("returns friendly labels separately from technical decision identifiers", () => {
    expect(friendlyLabel("PRIMARY_OWNER")).toBe("Primary Owner");
    const denied = decision({ requestedPermission: "TECHNICAL_INFORMATION_ACCESS", assignedPermissions: [] });
    expect(denied.title).toBe("You do not have permission to view this information");
    expect(denied.safeNextAction.length).toBeGreaterThan(0);
    expect(denied.title).not.toContain("permission-catalog-");
  });
});
