import { describe, expect, it } from "vitest";
import { createSession, evaluateSession, evaluateStepUp, revokeSession, rotateSession, switchAccount } from "../src";
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
  it("requires bound, scoped step-up and preserves authority", () => { const grant = { requiredAssurance: "strong" as const, currentAssurance: "strong" as const, protectedOperation: "owner-inspection", createdAt: session.timing.createdAt, expiresAt: "2026-08-23T12:20:00.000Z", purpose: "owner-oversight", resourceScope: "owner-record", accountId: session.binding.accountId, sessionId: session.sessionId, auditRequired: true }; expect(evaluateStepUp(session, grant, "2026-08-23T12:05:00.000Z", "owner-inspection", session.binding.accountId, "owner-oversight", "owner-record").allowed).toBe(true); expect(evaluateStepUp(session, grant, "2026-08-23T12:05:00.000Z", "other", session.binding.accountId, "owner-oversight", "owner-record").allowed).toBe(false); });
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
    expect(evaluateStepUp(session, { ...grant, expiresAt: "bad" }, "2026-08-23T12:05:00.000Z", grant.protectedOperation, grant.accountId, grant.purpose, grant.resourceScope).allowed).toBe(false);
    expect(evaluateStepUp(session, { ...grant, accountId: accounts.family.accountId }, "2026-08-23T12:05:00.000Z", grant.protectedOperation, grant.accountId, grant.purpose, grant.resourceScope).allowed).toBe(false);
    expect(evaluateStepUp(session, { ...grant, currentAssurance: "low" }, "2026-08-23T12:05:00.000Z", grant.protectedOperation, grant.accountId, grant.purpose, grant.resourceScope).allowed).toBe(false);
  });
  it("projects concurrency uncertainty and account isolation", async () => {
    const { evaluateConcurrentSessions } = await import("../src");
    expect(evaluateConcurrentSessions(SESSION_POLICY, session.binding.accountId, [{ accountId: session.binding.accountId, sessionId: session.sessionId }], "unknown").decisionCode).toBe("CONCURRENCY_UNCERTAIN");
    expect(evaluateConcurrentSessions(SESSION_POLICY, session.binding.accountId, [{ accountId: accounts.family.accountId, sessionId: session.sessionId }], "private").decisionCode).toBe("CROSS_ACCOUNT_CONCURRENCY_DENIED");
    expect(evaluateConcurrentSessions(SESSION_POLICY, session.binding.accountId, [], "private").allowed).toBe(true);
  });
});
