import { describe, expect, it } from "vitest";
import { createSession, evaluateConcurrentSessions, evaluateSession, evaluateStepUp, revokeSession, rotateSession, switchAccount, validateSessionPolicy } from "../src";
import { sessionCreationInput, sessionVersions, SESSION_POLICY, verifiedAuthentication, identities, accounts } from "../src/fixtures";
const created = createSession(sessionCreationInput);
const session = created.session!;
const revocationContext = { actorAccountId: session.binding.accountId, targetAccountId: session.binding.accountId, targetHouseholdId: session.binding.householdId, targetSessionId: session.sessionId, scope: "single-session" as const };
const evaluation = (overrides: Partial<Parameters<typeof evaluateSession>[0]> = {}) => evaluateSession({ session, identity: identities.rahul, currentTime: "2026-08-23T12:05:00.000Z", expectedVersions: sessionVersions, deviceClassification: "private", auditAvailable: true, ...overrides });
describe("Wave B2 session foundation", () => {
  it("creates only from verified authentication", () => { expect(created.created).toBe(true); expect(createSession({ ...sessionCreationInput, authentication: { ...verifiedAuthentication, verificationResult: "unverified" } }).technicalReason).toBe("AUTHENTICATION_UNVERIFIED"); });
  it("denies invalid identity, stale version, audit, and malformed time", () => { expect(createSession({ ...sessionCreationInput, identity: { ...identities.rahul, account: accounts.disabled } }).created).toBe(false); expect(createSession({ ...sessionCreationInput, versions: { ...sessionVersions, policyVersion: "policy-old" } }).created).toBe(false); expect(createSession({ ...sessionCreationInput, auditAvailable: false }).created).toBe(false); expect(createSession({ ...sessionCreationInput, currentTime: "bad" }).created).toBe(false); });
  it("allows active sessions and denies terminal or unknown states", () => { expect(evaluation().allowed).toBe(true); expect(evaluation({ session: { ...session, status: "revoked" } }).decisionCode).toBe("SESSION_REVOKED"); expect(evaluation({ session: { ...session, status: "invalid" } }).allowed).toBe(false); });
  it("handles exact inactivity and absolute expiry boundaries", () => { expect(evaluation({ currentTime: session.timing.inactivityDeadline }).decisionCode).toBe("SESSION_EXPIRED_INACTIVITY"); expect(evaluation({ currentTime: session.timing.absoluteDeadline }).decisionCode).toBe("SESSION_EXPIRED_ABSOLUTE"); });
  it("rejects malformed timestamps and stale versions", () => { expect(evaluation({ currentTime: "bad" }).technicalReason).toBe("INVALID_SESSION_TIME"); expect(evaluation({ expectedVersions: { ...sessionVersions, roleVersion: "role-old" } }).technicalReason).toBe("STALE_SESSION_VERSION"); });
  it("rotates revision without changing family or authority", () => { const result = rotateSession({ session, currentTime: "2026-08-23T12:05:00.000Z", trigger: "scheduled" }); expect(result.rotated).toBe(true); expect(result.newSession?.familyId).toBe(session.familyId); expect(result.newSession?.revision).toBe(2); expect(result.oldSession.status).toBe("replaced"); expect(result.newSession?.binding.roleId).toBe(session.binding.roleId); });
  it("makes revocation terminal and attributable", () => { expect(revokeSession({ session, currentTime: "2026-08-23T12:10:00.000Z", ...revocationContext, purpose: "logout", auditAvailable: true }).revoked).toBe(false); const result = revokeSession({ session, currentTime: "2026-08-23T12:10:00.000Z", reason: "logout", ...revocationContext, purpose: "logout", auditAvailable: true }); expect(result.revoked).toBe(true); });
  it("switches account with complete cleanup projection", () => { const targetAuth = { ...verifiedAuthentication, accountId: accounts.family.accountId }; const target = { ...identities.family, membership: { ...identities.family.membership } }; const result = switchAccount({ session, targetIdentity: target, targetAuthentication: targetAuth, currentTime: "2026-08-23T12:10:00.000Z", policy: SESSION_POLICY, auditAvailable: true }); expect(result.switched).toBe(true); expect(result.priorSession.status).toBe("replaced"); expect(Object.values(result.cleanupManifest).every(Boolean)).toBe(true); expect(result.cleanupManifest.pendingCharacterAgentGatewayRequestContext).toBe(true); expect(result.cleanupManifest.pendingContributionEnvelopeContext).toBe(true); });
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
    const result = revokeSession({ session, currentTime: "2026-08-23T12:05:00.000Z", reason: "logout", ...revocationContext, scope: "session-family", targetFamilyId: session.familyId, purpose: "logout", auditAvailable: true });
    expect(result.session.revocationActorAccountId).toBe(session.binding.accountId);
    expect(result.session.revocationScope).toBe("session-family");
    expect(revokeSession({ session, currentTime: session.timing.createdAt, reason: "logout", ...revocationContext, actorAccountId: accounts.family.accountId, purpose: "logout", auditAvailable: true }).technicalReason).toBe("CROSS_ACCOUNT_REVOCATION_DENIED");
    expect(revokeSession({ session: { ...session, binding: { ...session.binding, roleId: "DEVICE_SERVICE_IDENTITY" } }, currentTime: session.timing.createdAt, reason: "logout", ...revocationContext, purpose: "logout", auditAvailable: true }).technicalReason).toBe("DEVICE_REVOCATION_DENIED");
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
    expect(evaluateConcurrentSessions(SESSION_POLICY, "bad" as never, session.binding.householdId, [], session.binding.deviceContextId, session.binding.roleId, "human")).toMatchObject({ decisionCode: "INVALID_CANDIDATE_ACCOUNT_ID", allowed: false, safeNextAction: expect.any(String) });
    expect(evaluateConcurrentSessions(SESSION_POLICY, "" as never, session.binding.householdId, [reference], session.binding.deviceContextId, session.binding.roleId, "human").decisionCode).toBe("INVALID_CANDIDATE_ACCOUNT_ID");
    expect(evaluateConcurrentSessions(SESSION_POLICY, session.binding.accountId, "bad", [], session.binding.deviceContextId, session.binding.roleId, "human")).toMatchObject({ decisionCode: "INVALID_CANDIDATE_HOUSEHOLD_ID", allowed: false, explanation: expect.any(String) });
    expect(evaluateConcurrentSessions(SESSION_POLICY, session.binding.accountId, "", [reference], session.binding.deviceContextId, session.binding.roleId, "human").decisionCode).toBe("INVALID_CANDIDATE_HOUSEHOLD_ID");
    expect(evaluateConcurrentSessions(SESSION_POLICY, "bad" as never, "bad", [reference], session.binding.deviceContextId, session.binding.roleId, "human").decisionCode).toBe("INVALID_CANDIDATE_ACCOUNT_ID");
    expect(evaluateConcurrentSessions(SESSION_POLICY, session.binding.accountId, "household_other", [reference], session.binding.deviceContextId, session.binding.roleId, "human").decisionCode).toBe("CROSS_HOUSEHOLD_CONCURRENCY_DENIED");
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
    expect(revokeSession({ session: { ...session, timing: { ...session.timing, createdAt: "bad" } }, currentTime: session.timing.createdAt, reason: "logout", ...revocationContext, purpose: "logout", auditAvailable: true }).technicalReason).toBe("INVALID_SESSION_CREATION_TIME");
    expect(revokeSession({ session, currentTime: "bad", reason: "logout", ...revocationContext, purpose: "logout", auditAvailable: true }).technicalReason).toBe("INVALID_REVOCATION_TIME");
    expect(revokeSession({ session, currentTime: "2026-08-23T11:59:00.000Z", reason: "logout", ...revocationContext, purpose: "logout", auditAvailable: true }).technicalReason).toBe("REVOCATION_BEFORE_SESSION_CREATION");
    const result = revokeSession({ session, currentTime: "2026-08-23T12:05:00.000Z", reason: "logout", ...revocationContext, purpose: "logout", auditAvailable: true });
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
  it("rejects invalid chronology before rotation or revocation", () => {
    const chronologyCases = [
      [{ ...session, timing: { ...session.timing, lastActivityAt: "2026-08-23T13:00:00.000Z" } }, "LAST_ACTIVITY_AFTER_CURRENT_TIME"],
      [{ ...session, timing: { ...session.timing, createdAt: "bad" } }, "INVALID_SESSION_CREATION_TIME"],
      [{ ...session, timing: { ...session.timing, inactivityDeadline: "bad" } }, "INVALID_INACTIVITY_DEADLINE"],
      [{ ...session, timing: { ...session.timing, absoluteDeadline: "bad" } }, "INVALID_ABSOLUTE_DEADLINE"],
      [{ ...session, timing: { ...session.timing, absoluteDeadline: "2026-08-23T11:00:00.000Z" } }, "INVALID_ABSOLUTE_DEADLINE"],
    ] as const;
    for (const [candidate, reason] of chronologyCases) {
      expect(rotateSession({ session: candidate, currentTime: "2026-08-23T12:05:00.000Z", trigger: "scheduled" }).technicalReason).toBe(reason);
    }
    expect(rotateSession({ session, currentTime: "2026-08-23T12:05:00.000Z", trigger: "scheduled" }).rotated).toBe(true);
    expect(revokeSession({ session: { ...session, timing: { ...session.timing, lastActivityAt: "2026-08-23T13:00:00.000Z" } }, currentTime: "2026-08-23T12:05:00.000Z", reason: "logout", ...revocationContext, purpose: "logout", auditAvailable: true }).technicalReason).toBe("LAST_ACTIVITY_AFTER_CURRENT_TIME");
  });
  it("requires explicit revocation scope and matching targets", () => {
    const base = { session, currentTime: session.timing.createdAt, reason: "logout" as const, ...revocationContext, purpose: "logout", auditAvailable: true };
    expect(revokeSession({ ...base, scope: undefined }).technicalReason).toBe("REVOCATION_SCOPE_REQUIRED");
    expect(revokeSession({ ...base, scope: "bad" as never }).technicalReason).toBe("REVOCATION_SCOPE_MISMATCH");
    expect(revokeSession({ ...base, scope: "single-session", targetSessionId: undefined }).technicalReason).toBe("REVOCATION_SCOPE_MISMATCH");
    expect(revokeSession({ ...base, scope: "session-family", targetFamilyId: session.familyId }).revoked).toBe(true);
    expect(revokeSession({ ...base, scope: "account-device", targetDeviceContextId: session.binding.deviceContextId, actorAccountId: accounts.family.accountId }).technicalReason).toBe("CROSS_ACCOUNT_REVOCATION_DENIED");
    expect(revokeSession({ ...base, scope: "account-household", targetHouseholdId: "household_other" as never }).technicalReason).toBe("CROSS_HOUSEHOLD_REVOCATION_DENIED");
    expect(revokeSession({ ...base, scope: "single-session", auditAvailable: false }).technicalReason).toBe("AUDIT_UNAVAILABLE");
  });
  it("validates untrusted concurrency references and preserves permission binding", () => {
    const reference = { sessionId: session.sessionId, accountId: session.binding.accountId, householdId: session.binding.householdId, deviceContextId: session.binding.deviceContextId, status: "active" as const, createdAt: session.timing.createdAt, roleId: session.binding.roleId, identityKind: "human" as const, replacementEligible: true };
    for (const invalid of [{ sessionId: "bad" }, { accountId: "bad" }, { householdId: "bad" }, { deviceContextId: "bad" }, { status: "unknown" }, { roleId: "UNKNOWN" }, { identityKind: "unknown" }, { replacementEligible: "yes" }, { createdAt: "bad" }] as const) expect(evaluateConcurrentSessions(SESSION_POLICY, session.binding.accountId, session.binding.householdId, [{ ...reference, ...invalid } as never], session.binding.deviceContextId, session.binding.roleId, "human")).toMatchObject({ technicalReason: "CONCURRENCY_UNCERTAIN" });
    expect(evaluateConcurrentSessions({ ...SESSION_POLICY, concurrentSessionLimit: 1 }, session.binding.accountId, session.binding.householdId, [reference, reference], session.binding.deviceContextId, session.binding.roleId, "human").technicalReason).toBe("CONCURRENCY_UNCERTAIN");
    const rotated = rotateSession({ session, currentTime: "2026-08-23T12:05:00.000Z", trigger: "scheduled" }).newSession!;
    expect(rotated.permissionBinding).toEqual(session.permissionBinding);
    expect(evaluateStepUp(session, { requiredAssurance: "strong", currentAssurance: "strong", protectedOperation: "x", createdAt: session.timing.createdAt, expiresAt: "2026-08-23T12:20:00.000Z", purpose: "p", resourceScope: "r", accountId: session.binding.accountId, sessionId: session.sessionId, auditRequired: false }, "2026-08-23T12:05:00.000Z", "x", session.binding.accountId, "p", "r", true).status).toBe("elevated");
  });
  it("asserts direct terminal outcomes and successful step-up bindings", () => {
    const grant = { requiredAssurance: "strong" as const, currentAssurance: "strong" as const, protectedOperation: "owner-inspection", createdAt: session.timing.createdAt, expiresAt: "2026-08-23T12:20:00.000Z", purpose: "owner-oversight", resourceScope: "owner-record", accountId: session.binding.accountId, sessionId: session.sessionId, auditRequired: true };
    for (const [status, expected] of [["revoked", "revoked"], ["replaced", "replaced"], ["expired-by-inactivity", "expired-by-inactivity"], ["expired-by-absolute-limit", "expired-by-absolute-limit"], ["invalid", "invalid"]] as const) expect(evaluateStepUp({ ...session, status }, grant, "2026-08-23T12:05:00.000Z", grant.protectedOperation, grant.accountId, grant.purpose, grant.resourceScope, true).status).toBe(expected);
    const result = evaluateStepUp(session, grant, "2026-08-23T12:05:00.000Z", grant.protectedOperation, grant.accountId, grant.purpose, grant.resourceScope, true);
    expect(result.allowed).toBe(true);
    expect(result.versionReferences).toEqual(session.versions);
    expect(session.permissionBinding).toEqual({ permissionCatalogVersion: session.versions.permissionCatalogVersion, roleId: session.binding.roleId, roleVersion: session.versions.roleVersion, membershipId: session.binding.membershipId });
    expect(session.timing.absoluteDeadline).toBe("2026-08-23T20:00:00.000Z");
  });
  it("uses the explicit assurance ranking and approved elevation rule", () => {
    expect(evaluation({ requiredAssurance: "standard" }).allowed).toBe(true);
    expect(evaluation({ session: { ...session, authenticationAssurance: "standard" }, requiredAssurance: "strong" }).technicalReason).toBe("STEP_UP_REQUIRED");
    expect(evaluation({ session: { ...session, authenticationAssurance: "strong" }, requiredAssurance: "standard" }).allowed).toBe(true);
    expect(evaluation({ session: { ...session, authenticationAssurance: "strong" }, requiredAssurance: "strong" }).allowed).toBe(true);
    expect(evaluation({ session: { ...session, status: "elevated", authenticationAssurance: "standard" }, requiredAssurance: "strong" }).allowed).toBe(true);
    expect(evaluation({ session: { ...session, authenticationAssurance: "unknown" } }).technicalReason).toBe("INVALID_AUTHENTICATION_ASSURANCE");
    expect(evaluation({ session: { ...session, status: "revoked", authenticationAssurance: "strong" } }).decisionCode).toBe("SESSION_REVOKED");
    expect(evaluation({ session: { ...session, authenticationAssurance: "strong" }, identity: { ...identities.rahul, membership: { ...identities.rahul.membership, roleId: "STANDARD_FAMILY_MEMBER" } } }).technicalReason).toBe("SESSION_ROLE_BINDING_MISMATCH");
    expect(evaluation({ session: { ...session, authenticationAssurance: "strong" }, auditAvailable: false }).technicalReason).toBe("AUDIT_UNAVAILABLE");
    const strongResult = evaluation({ session: { ...session, authenticationAssurance: "strong" }, requiredAssurance: "strong" });
    expect(strongResult.versionReferences).toEqual(session.versions);
    expect(strongResult.status).toBe("active");
  });
  it("uses deterministic next-deadline rotation semantics and stable family IDs", () => {
    const createdA = createSession({ ...sessionCreationInput, currentTime: "2026-08-23T12:00:00.000Z", provenanceReference: "rotation-seed-a", creationNonce: "nonce-a" });
    const createdB = createSession({ ...sessionCreationInput, currentTime: "2026-08-23T12:00:00.000Z", provenanceReference: "rotation-seed-a", creationNonce: "nonce-a" });
    const createdC = createSession({ ...sessionCreationInput, currentTime: "2026-08-23T12:00:00.000Z", provenanceReference: "rotation-seed-b", creationNonce: "nonce-b" });
    expect(createdA.session!.sessionId).toBe(createdB.session!.sessionId);
    expect(createdA.session!.sessionId).not.toBe(createdC.session!.sessionId);
    expect(createdA.session!.familyId).toBe(createdB.session!.familyId);
    const rotated = rotateSession({ session: createdA.session!, currentTime: "2026-08-23T12:05:00.000Z", trigger: "scheduled", policy: SESSION_POLICY, rotationSeed: "rotation-seed-a" });
    expect(rotated.rotated).toBe(true);
    expect(rotated.newSession!.familyId).toBe(createdA.session!.familyId);
    expect(rotated.newSession!.sessionId).not.toBe(createdA.session!.sessionId);
    expect(new Date(rotated.newSession!.timing.rotationAt).getTime()).toBeGreaterThan(new Date("2026-08-23T12:05:00.000Z").getTime());
    expect(new Date(rotated.newSession!.timing.rotationAt).getTime()).toBe(new Date("2026-08-23T13:05:00.000Z").getTime());
  });
  it("returns operation-specific chronology reasons for malformed and early timing", () => {
    expect(revokeSession({ session: { ...session, timing: { ...session.timing, createdAt: "bad" } }, currentTime: session.timing.createdAt, reason: "logout", ...revocationContext, purpose: "logout", auditAvailable: true }).technicalReason).toBe("INVALID_SESSION_CREATION_TIME");
    expect(revokeSession({ session, currentTime: "bad", reason: "logout", ...revocationContext, purpose: "logout", auditAvailable: true }).technicalReason).toBe("INVALID_REVOCATION_TIME");
    expect(revokeSession({ session, currentTime: "2026-08-23T11:59:00.000Z", reason: "logout", ...revocationContext, purpose: "logout", auditAvailable: true }).technicalReason).toBe("REVOCATION_BEFORE_SESSION_CREATION");
    expect(rotateSession({ session: { ...session, timing: { ...session.timing, createdAt: "bad" } }, currentTime: "2026-08-23T12:05:00.000Z", trigger: "scheduled" }).technicalReason).toBe("INVALID_SESSION_CREATION_TIME");
    expect(rotateSession({ session, currentTime: "2026-08-23T11:59:00.000Z", trigger: "scheduled" }).technicalReason).toBe("ROTATION_BEFORE_SESSION_CREATION");
    expect(rotateSession({ session, currentTime: "2026-08-23T12:05:00.000Z", trigger: "scheduled" }).rotated).toBe(true);
  });
  it("preserves unknown device deny behavior and explicit policy allowlists", () => {
    expect(validateSessionPolicy({ ...SESSION_POLICY, sharedDeviceRestrictions: { ...SESSION_POLICY.sharedDeviceRestrictions, classification: "unknown" as never } }, "policy-1").valid).toBe(false);
    expect(validateSessionPolicy({ ...SESSION_POLICY, allowedAssuranceLevels: ["standard", "strong"] }, "policy-1").valid).toBe(true);
  });
});
