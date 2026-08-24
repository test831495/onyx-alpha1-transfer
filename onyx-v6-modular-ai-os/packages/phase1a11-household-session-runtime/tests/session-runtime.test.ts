import { describe, expect, it } from "vitest";
import { createSession, evaluateConcurrentSessions, evaluateSession, evaluateStepUp, revokeSession, rotateSession, switchAccount } from "../src";
import { sessionCreationInput, sessionVersions, SESSION_POLICY, verifiedAuthentication, identities, accounts } from "../src/fixtures";
const created = createSession(sessionCreationInput);
const session = created.session!;
const evaluation = (overrides: Partial<Parameters<typeof evaluateSession>[0]> = {}) => evaluateSession({ session, identity: identities.rahul, currentTime: "2026-08-23T12:05:00.000Z", expectedVersions: sessionVersions, deviceClassification: "private", auditAvailable: true, ...overrides });
describe("Wave B2 session foundation", () => {
  it("creates only from verified authentication", () => { expect(created.created).toBe(true); expect(createSession({ ...sessionCreationInput, authentication: { ...verifiedAuthentication, verificationResult: "unverified" } }).technicalReason).toBe("AUTHENTICATION_UNVERIFIED"); });
  it("denies invalid identity, stale version, audit, and malformed time", () => { expect(createSession({ ...sessionCreationInput, identity: { ...identities.rahul, account: accounts.disabled } }).created).toBe(false); expect(createSession({ ...sessionCreationInput, versions: { ...sessionVersions, policyVersion: "policy-old" } }).created).toBe(false); expect(createSession({ ...sessionCreationInput, auditAvailable: false }).created).toBe(false); expect(createSession({ ...sessionCreationInput, currentTime: "bad" }).created).toBe(false); });
  it("allows active sessions and denies terminal or unknown states", () => { expect(evaluation().allowed).toBe(true); expect(evaluation({ session: { ...session, status: "revoked" } }).decisionCode).toBe("SESSION_REVOKED"); expect(evaluation({ session: { ...session, status: "invalid" } }).allowed).toBe(false); });
  it("handles exact inactivity and absolute expiry boundaries", () => { expect(evaluation({ currentTime: session.timing.inactivityDeadline }).decisionCode).toBe("SESSION_EXPIRED_INACTIVITY"); expect(evaluation({ currentTime: session.timing.absoluteDeadline }).decisionCode).toBe("SESSION_EXPIRED_ABSOLUTE"); });
  it("rejects malformed timestamps and stale versions", () => { expect(evaluation({ currentTime: "bad" }).technicalReason).toBe("INVALID_SESSION_TIME"); expect(evaluation({ expectedVersions: { ...sessionVersions, roleVersion: "role-old" } }).technicalReason).toBe("STALE_SESSION_VERSION"); });
  it("rotates revision without changing family or authority", () => { const result = rotateSession({ session, currentTime: "2026-08-23T12:05:00.000Z", trigger: "scheduled" }); expect(result.rotated).toBe(true); expect(result.newSession?.familyId).toBe(session.familyId); expect(result.newSession?.revision).toBe(2); expect(result.oldSession.status).toBe("replaced"); expect(result.newSession?.binding.roleId).toBe(session.binding.roleId); });
  it("makes revocation terminal and attributable", () => { expect(revokeSession({ session, currentTime: "2026-08-23T12:10:00.000Z", actorAccountId: session.binding.accountId, purpose: "logout", auditAvailable: true }).revoked).toBe(false); const result = revokeSession({ session, currentTime: "2026-08-23T12:10:00.000Z", reason: "logout", actorAccountId: session.binding.accountId, purpose: "logout", auditAvailable: true }); expect(result.revoked).toBe(true); });
  it("switches account with complete cleanup projection", () => { const targetAuth = { ...verifiedAuthentication, accountId: accounts.family.accountId }; const target = { ...identities.family, membership: { ...identities.family.membership } }; const result = switchAccount({ session, targetIdentity: target, targetAuthentication: targetAuth, currentTime: "2026-08-23T12:10:00.000Z", policy: SESSION_POLICY, auditAvailable: true }); expect(result.switched).toBe(true); expect(result.priorSession.status).toBe("replaced"); expect(Object.values(result.cleanupManifest).every(Boolean)).toBe(true); });
  it("requires bound, scoped step-up and preserves authority", () => { const grant = { requiredAssurance: "strong" as const, currentAssurance: "strong" as const, protectedOperation: "owner-inspection", createdAt: session.timing.createdAt, expiresAt: "2026-08-23T12:20:00.000Z", purpose: "owner-oversight", resourceScope: "owner-record", accountId: session.binding.accountId, sessionId: session.sessionId, auditRequired: true }; expect(evaluateStepUp(session, grant, "2026-08-23T12:05:00.000Z", "owner-inspection", session.binding.accountId, "owner-oversight", "owner-record", true).allowed).toBe(true); expect(evaluateStepUp(session, grant, "2026-08-23T12:05:00.000Z", "other", session.binding.accountId, "owner-oversight", "owner-record", true).allowed).toBe(false); });
  it("denies unknown devices, audit failures, and preserves user-safe fields", () => { expect(evaluation({ deviceClassification: "unknown" }).technicalReason).toBe("SHARED_DEVICE_RESTRICTED"); expect(evaluation({ auditAvailable: false }).technicalReason).toBe("AUDIT_UNAVAILABLE"); expect(JSON.stringify(evaluation())).not.toContain(session.sessionId); });
  it("fails closed for malformed timing and stale versions", () => {
    for (const field of ["createdAt", "lastActivityAt", "inactivityDeadline", "absoluteDeadline", "rotationAt"] as const) expect(evaluation({ session: { ...session, timing: { ...session.timing, [field]: "bad" } } }).technicalReason).toBe("INVALID_SESSION_TIME");
    expect(evaluation({ expectedVersions: { ...sessionVersions, policyVersion: "policy-old" } }).technicalReason).toBe("STALE_SESSION_VERSION");
    expect(evaluation({ expectedVersions: { ...sessionVersions, permissionCatalogVersion: "permission-catalog-old" } }).technicalReason).toBe("STALE_SESSION_VERSION");
  });
  it("denies unsafe rotation and preserves expiry", () => {
    expect(rotateSession({ session, currentTime: session.timing.inactivityDeadline, trigger: "scheduled" }).rotated).toBe(false);
    expect(rotateSession({ session, currentTime: session.timing.createdAt, trigger: "scheduled", auditAvailable: false }).technicalReason).toBe("AUDIT_UNAVAILABLE");
    expect(rotateSession({ session, currentTime: session.timing.createdAt, trigger: "scheduled", expectedVersions: { ...sessionVersions, roleVersion: "role-old" } }).rotated).toBe(false);
    const result = rotateSession({ session, currentTime: "2026-08-23T12:05:00.000Z", trigger: "scheduled" });
    expect(result.newSession?.timing.absoluteDeadline).toBe(session.timing.absoluteDeadline);
  });
  it("records revocation evidence and denies cross-account or device revocation", () => {
    const result = revokeSession({ session, currentTime: "2026-08-23T12:05:00.000Z", reason: "logout", actorAccountId: session.binding.accountId, purpose: "logout", familyWide: true, auditAvailable: true });
    expect(result.session.revocationActorAccountId).toBe(session.binding.accountId);
    expect(result.session.revocationFamilyWide).toBe(true);
    expect(revokeSession({ session, currentTime: session.timing.createdAt, reason: "logout", actorAccountId: accounts.family.accountId, purpose: "logout", familyWide: true, auditAvailable: true }).technicalReason).toBe("CROSS_ACCOUNT_REVOCATION_DENIED");
    expect(revokeSession({ session: { ...session, binding: { ...session.binding, roleId: "DEVICE_SERVICE_IDENTITY" } }, currentTime: session.timing.createdAt, reason: "logout", actorAccountId: session.binding.accountId, purpose: "logout", auditAvailable: true }).technicalReason).toBe("DEVICE_REVOCATION_DENIED");
  });
  it("denies malformed, expired, mismatched, or non-expanding step-up", () => {
    const grant = { requiredAssurance: "strong" as const, currentAssurance: "strong" as const, protectedOperation: "owner-inspection", createdAt: session.timing.createdAt, expiresAt: "2026-08-23T12:20:00.000Z", purpose: "owner-oversight", resourceScope: "owner-record", accountId: session.binding.accountId, sessionId: session.sessionId, auditRequired: true };
    expect(evaluateStepUp(session, { ...grant, expiresAt: "bad" }, "2026-08-23T12:05:00.000Z", grant.protectedOperation, grant.accountId, grant.purpose, grant.resourceScope, true).allowed).toBe(false);
    expect(evaluateStepUp(session, { ...grant, accountId: accounts.family.accountId }, "2026-08-23T12:05:00.000Z", grant.protectedOperation, grant.accountId, grant.purpose, grant.resourceScope, true).allowed).toBe(false);
    expect(evaluateStepUp(session, { ...grant, currentAssurance: "low" }, "2026-08-23T12:05:00.000Z", grant.protectedOperation, grant.accountId, grant.purpose, grant.resourceScope, true).allowed).toBe(false);
  });
  it("projects concurrency uncertainty and account isolation", () => {
    const reference = { sessionId: session.sessionId, accountId: session.binding.accountId, householdId: session.binding.householdId, deviceContextId: session.binding.deviceContextId, status: "active" as const, createdAt: session.timing.createdAt, roleId: session.binding.roleId, identityKind: "human" as const, replacementEligible: true };
    expect(evaluateConcurrentSessions(SESSION_POLICY, session.binding.accountId, session.binding.householdId, [reference], session.binding.deviceContextId, session.binding.roleId, "human").allowed).toBe(true);
    expect(evaluateConcurrentSessions(SESSION_POLICY, session.binding.accountId, session.binding.householdId, [{ ...reference, status: "pending" as const }], session.binding.deviceContextId, session.binding.roleId, "human").decisionCode).toBe("CONCURRENCY_UNCERTAIN");
    expect(evaluateConcurrentSessions(SESSION_POLICY, session.binding.accountId, session.binding.householdId, [{ ...reference, createdAt: "bad" }], session.binding.deviceContextId, session.binding.roleId, "human").decisionCode).toBe("CONCURRENCY_UNCERTAIN");
    expect(evaluateConcurrentSessions(SESSION_POLICY, session.binding.accountId, session.binding.householdId, [{ ...reference, accountId: accounts.family.accountId }], session.binding.deviceContextId, session.binding.roleId, "human").decisionCode).toBe("CROSS_ACCOUNT_CONCURRENCY_DENIED");
    expect(evaluateConcurrentSessions(SESSION_POLICY, session.binding.accountId, "household_other", [reference], session.binding.deviceContextId, session.binding.roleId, "human").decisionCode).toBe("CROSS_HOUSEHOLD_CONCURRENCY_DENIED");
    expect(evaluateConcurrentSessions(SESSION_POLICY, session.binding.accountId, session.binding.householdId, [], session.binding.deviceContextId, session.binding.roleId, "human").allowed).toBe(true);
    expect(evaluateConcurrentSessions({ ...SESSION_POLICY, concurrentSessionScope: "device" }, session.binding.accountId, session.binding.householdId, [reference], "device-context_other", session.binding.roleId, "human").allowed).toBe(true);
  });
  it("blocks terminal sessions before step-up and enforces role and audit bindings", () => {
    const grant = { requiredAssurance: "strong" as const, currentAssurance: "strong" as const, protectedOperation: "owner-inspection", createdAt: session.timing.createdAt, expiresAt: "2026-08-23T12:20:00.000Z", purpose: "owner-oversight", resourceScope: "owner-record", accountId: session.binding.accountId, sessionId: session.sessionId, auditRequired: true };
    for (const status of ["revoked", "replaced", "expired-by-inactivity", "expired-by-absolute-limit", "invalid"] as const) expect(evaluateStepUp({ ...session, status }, grant, "2026-08-23T12:05:00.000Z", grant.protectedOperation, grant.accountId, grant.purpose, grant.resourceScope, true).decisionCode).not.toBe("STEP_UP_GRANTED");
    const familyRole = { ...identities.rahul, membership: { ...identities.rahul.membership, roleId: "STANDARD_FAMILY_MEMBER" as const } };
    expect(evaluation({ identity: familyRole }).technicalReason).toBe("SESSION_ROLE_BINDING_MISMATCH");
    expect(evaluateStepUp(session, grant, "2026-08-23T12:05:00.000Z", grant.protectedOperation, grant.accountId, grant.purpose, grant.resourceScope, true, familyRole).technicalReason).toBe("SESSION_ROLE_BINDING_MISMATCH");
    expect(evaluateStepUp(session, grant, "2026-08-23T12:05:00.000Z", grant.protectedOperation, grant.accountId, grant.purpose, grant.resourceScope, false).technicalReason).toBe("AUDIT_UNAVAILABLE");
    expect(evaluateStepUp(session, grant, "2026-08-23T12:05:00.000Z", grant.protectedOperation, grant.accountId, grant.purpose, grant.resourceScope, undefined).technicalReason).toBe("AUDIT_UNAVAILABLE");
    expect(evaluateStepUp(session, { ...grant, auditRequired: false }, "2026-08-23T12:05:00.000Z", grant.protectedOperation, grant.accountId, grant.purpose, grant.resourceScope, true).allowed).toBe(true);
  });
  it("fails closed for revocation chronology and preserves terminal evidence", () => {
    expect(revokeSession({ session: { ...session, timing: { ...session.timing, createdAt: "bad" } }, currentTime: session.timing.createdAt, reason: "logout", actorAccountId: session.binding.accountId, purpose: "logout", auditAvailable: true }).technicalReason).toBe("INVALID_SESSION_CREATION_TIME");
    expect(revokeSession({ session, currentTime: "bad", reason: "logout", actorAccountId: session.binding.accountId, purpose: "logout", auditAvailable: true }).technicalReason).toBe("INVALID_REVOCATION_TIME");
    expect(revokeSession({ session, currentTime: "2026-08-23T11:59:00.000Z", reason: "logout", actorAccountId: session.binding.accountId, purpose: "logout", auditAvailable: true }).technicalReason).toBe("REVOCATION_BEFORE_SESSION_CREATION");
    const result = revokeSession({ session, currentTime: "2026-08-23T12:05:00.000Z", reason: "logout", actorAccountId: session.binding.accountId, purpose: "logout", auditAvailable: true });
    expect(result.session.status).toBe("revoked");
    expect(result.session.revocationPurpose).toBe("logout");
  });
  it("uses explicit deterministic concurrency replacement policy", () => {
    const reference = { sessionId: session.sessionId, accountId: session.binding.accountId, householdId: session.binding.householdId, deviceContextId: session.binding.deviceContextId, status: "active" as const, createdAt: session.timing.createdAt, roleId: session.binding.roleId, identityKind: "human" as const, replacementEligible: true };
    const limited = { ...SESSION_POLICY, concurrentSessionLimit: 1 };
    const first = evaluateConcurrentSessions(limited, session.binding.accountId, session.binding.householdId, [reference], session.binding.deviceContextId, session.binding.roleId, "human");
    const second = evaluateConcurrentSessions(limited, session.binding.accountId, session.binding.householdId, [reference], session.binding.deviceContextId, session.binding.roleId, "human");
    expect(first).toEqual(second);
    expect(first.replaceSessionId).toBe(session.sessionId);
    expect(evaluateConcurrentSessions(limited, session.binding.accountId, session.binding.householdId, [{ ...reference, replacementEligible: false }], session.binding.deviceContextId, session.binding.roleId, "human").decisionCode).toBe("CONCURRENT_SESSION_LIMIT_REACHED");
    expect(evaluateConcurrentSessions(limited, session.binding.accountId, session.binding.householdId, [{ ...reference, roleId: "PRIMARY_OWNER" as const }], session.binding.deviceContextId, "STANDARD_FAMILY_MEMBER", "human").decisionCode).toBe("CONCURRENT_SESSION_LIMIT_REACHED");
    expect(evaluateConcurrentSessions(limited, session.binding.accountId, session.binding.householdId, [{ ...reference, identityKind: "human" as const }], session.binding.deviceContextId, session.binding.roleId, "device").decisionCode).toBe("CONCURRENT_SESSION_LIMIT_REACHED");
    expect(SESSION_POLICY.concurrentSessionScope).toBe("account");
  });
});
