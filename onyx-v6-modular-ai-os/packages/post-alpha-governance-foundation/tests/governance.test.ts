import { describe, expect, it } from "vitest";
import {
  appendAuditEvent,
  canonicalConflictKey,
  classifyConcurrentRequest,
  evaluateGovernanceFreshness,
  GOV_FRESHNESS_DEPENDENCIES,
  GOV_INVALIDATION_TRIGGERS,
  GOVERNANCE_FLAGS,
  OVERRIDE_LIFECYCLE_STATES,
  projectAuthorization,
  projectLease,
  projectSessionRevocation,
  redisCompareAndDelete,
  transitionOverrideLifecycle,
  validateOverrideRequest,
} from "../src/index";

const request = { requestId: "r1", ownerId: "rahul-kumar", actorClass: "PRIMARY_OWNER", decision: "APPROVE", riskClass: "R3", exactScope: ["repo:x", "action:integration-review"], candidate: { head: "h", tree: "t" }, policyVersion: "v2", evidenceHash: "e", consequencePreviewHash: "p", observedVersion: 3, expiresAt: "2026-09-02T00:00:00.000Z" } as const;

describe("PA-GOV authority and concurrency contracts", () => {
  it("keeps blockers, evidence, disposition, and authorization separate", () => {
    const result = projectAuthorization({ request, now: "2026-09-01T00:00:00.000Z", currentVersion: 3, blockerStatus: "BLOCKED", verificationOutcome: "PASS", ownerDisposition: "APPROVED", currentBindings: request });
    expect(result.blockerStatus).toBe("BLOCKED");
    expect(result.verificationOutcome).toBe("PASS");
    expect(result.ownerDisposition).toBe("APPROVED");
    expect(result.effectiveAuthorization).toBe("DENIED");
  });

  it("permits only Rahul and exact current bounded scope", () => {
    expect(validateOverrideRequest(request).ownerId).toBe("rahul-kumar");
    expect(() => validateOverrideRequest({ ...request, actorClass: "ONYX" as never })).toThrow();
    expect(() => validateOverrideRequest({ ...request, actorClass: "NOVA" as never })).toThrow();
    expect(() => validateOverrideRequest({ ...request, actorClass: "AGENT" as never })).toThrow();
    expect(() => validateOverrideRequest({ ...request, riskClass: "R5" as never })).toThrow();
    expect(() => validateOverrideRequest({ ...request, exactScope: [] })).toThrow();
    expect(projectAuthorization({ request, now: "2026-09-03T00:00:00.000Z", currentVersion: 3, blockerStatus: "CLEAR", verificationOutcome: "PASS", ownerDisposition: "APPROVED", currentBindings: request }).effectiveAuthorization).toBe("DENIED");
    expect(projectAuthorization({ request, now: "2026-09-01T00:00:00.000Z", currentVersion: 3, blockerStatus: "CLEAR", verificationOutcome: "PASS", ownerDisposition: "APPROVED", currentBindings: { ...request, evidenceHash: "changed" } }).effectiveAuthorization).toBe("DENIED");
    expect(projectAuthorization({ request, now: "2026-09-01T00:00:00.000Z", currentVersion: 3, blockerStatus: "CLEAR", verificationOutcome: "PASS", ownerDisposition: "APPROVED", currentBindings: { ...request, candidate: { head: "h2", tree: "t" } } }).effectiveAuthorization).toBe("DENIED");
    expect(projectAuthorization({ request, now: "2026-09-01T00:00:00.000Z", currentVersion: 3, blockerStatus: "CLEAR", verificationOutcome: "PASS", ownerDisposition: "APPROVED", currentBindings: { ...request, candidate: { head: "h", tree: "t2" } } }).effectiveAuthorization).toBe("DENIED");
    expect(projectAuthorization({ request, now: "2026-09-01T00:00:00.000Z", currentVersion: 3, blockerStatus: "CLEAR", verificationOutcome: "PASS", ownerDisposition: "APPROVED", currentBindings: { ...request, policyVersion: "v3" } }).effectiveAuthorization).toBe("DENIED");
    expect(projectAuthorization({ request, now: "2026-09-01T00:00:00.000Z", currentVersion: 3, blockerStatus: "CLEAR", verificationOutcome: "PASS", ownerDisposition: "APPROVED", currentBindings: { ...request, consequencePreviewHash: "changed" } }).effectiveAuthorization).toBe("DENIED");
  });

  it("uses stable conflict domains, idempotency, and no last-write-wins", () => {
    expect(canonicalConflictKey(["b", "a"])).toBe(canonicalConflictKey(["a", "b"]));
    expect(classifyConcurrentRequest(request, request)).toBe("EXACT_DUPLICATE");
    expect(classifyConcurrentRequest(request, { ...request, requestId: "r2", decision: "REJECT" })).toBe("CONTRADICTORY_CONFLICT");
    expect(classifyConcurrentRequest(request, { ...request, requestId: "r3", observedVersion: 2 })).toBe("STALE_REVIEW_REQUIRED");
  });

  it("projects session, lease, fencing, compare-delete, and append-only audit semantics", () => {
    expect(projectSessionRevocation(["s1", "s2"], "s1", "REVOKE_OTHER")).toEqual(["s1"]);
    expect(projectSessionRevocation(["s1", "s2"], "s1", "REVOKE_ALL")).toEqual([]);
    expect(projectLease({ leaseId: "l", ownerToken: "o", fencingToken: 4, expiresAt: "2026-09-02T00:00:00.000Z" }, "2026-09-01T00:00:00.000Z").authorizing).toBe(false);
    expect(projectLease({ leaseId: "l", ownerToken: "o", fencingToken: 4, expiresAt: "2026-09-02T00:00:00.000Z" }, "2026-09-03T00:00:00.000Z").state).toBe("EXPIRED");
    expect(redisCompareAndDelete("token-a", "token-b")).toBe(false);
    expect(redisCompareAndDelete("token-a", "token-a")).toBe(true);
    const log = appendAuditEvent([], { id: "a1", type: "OVERRIDE_REQUESTED", previousHash: null });
    expect(log).toHaveLength(1);
    expect(() => (log as unknown as object[]).push({})).toThrow();
  });

  it("owns one proposed flag and leaves it OFF", () => {
    expect(GOVERNANCE_FLAGS).toEqual({ owner_override_runtime: "OFF" });
  });

  it("binds full freshness dependencies and invalidation triggers (CORR-GOV-001)", () => {
    expect(GOV_FRESHNESS_DEPENDENCIES).toHaveLength(11);
    expect(GOV_INVALIDATION_TRIGGERS).toHaveLength(12);
    const binding = { candidateHead: "h", candidateTree: "t", protectedFingerprint: "f", policyVersion: "v2", acceptanceRegistryVersion: "ar1", dependencyLockHash: "lock1", toolchainProfile: "node20", environmentProfile: "local-dev", featureFlagSnapshotHash: "flags1", dependentEvidenceIds: ["e1"] } as const;
    expect(evaluateGovernanceFreshness(undefined, { ...binding, now: "2026-09-01T00:00:00.000Z" })).toBe("NOT_ASSESSABLE");
    expect(evaluateGovernanceFreshness(binding, { ...binding, now: "2026-09-01T00:00:00.000Z" })).toBe("CURRENT");
    expect(evaluateGovernanceFreshness(binding, { ...binding, dependencyLockHash: "lock2", now: "2026-09-01T00:00:00.000Z" })).toBe("STALE");
    expect(evaluateGovernanceFreshness(binding, { ...binding, toolchainProfile: "node22", now: "2026-09-01T00:00:00.000Z" })).toBe("STALE");
    expect(evaluateGovernanceFreshness(binding, { ...binding, ownerScopeChanged: true, now: "2026-09-01T00:00:00.000Z" })).toBe("STALE");
    expect(evaluateGovernanceFreshness(binding, { ...binding, conflictingCurrentEvidence: true, now: "2026-09-01T00:00:00.000Z" })).toBe("INVALIDATED");
    expect(evaluateGovernanceFreshness(binding, { ...binding, securityIncident: true, now: "2026-09-01T00:00:00.000Z" })).toBe("INVALIDATED");
    expect(evaluateGovernanceFreshness(binding, { ...binding, superseded: true, now: "2026-09-01T00:00:00.000Z" })).toBe("SUPERSEDED");
    expect(evaluateGovernanceFreshness({ ...binding, validUntil: "2026-09-02T00:00:00.000Z" }, { ...binding, now: "2026-09-03T00:00:00.000Z" })).toBe("EXPIRED");
  });

  it("supports full override lifecycle including suspension, revocation, expiry, and reopening (CORR-GOV-002)", () => {
    expect(OVERRIDE_LIFECYCLE_STATES).toEqual(["REQUESTED", "ACTIVE", "EXPIRED", "SUSPENDED", "REVOKED", "REOPENED", "CLOSED"]);
    expect(transitionOverrideLifecycle("REQUESTED", "APPROVE", "PRIMARY_OWNER")).toBe("ACTIVE");
    expect(transitionOverrideLifecycle("ACTIVE", "SUSPEND", "PRIMARY_OWNER")).toBe("SUSPENDED");
    expect(transitionOverrideLifecycle("SUSPENDED", "REOPEN", "PRIMARY_OWNER")).toBe("REOPENED");
    expect(transitionOverrideLifecycle("REOPENED", "EXPIRE", "PRIMARY_OWNER")).toBe("EXPIRED");
    expect(transitionOverrideLifecycle("EXPIRED", "REOPEN", "PRIMARY_OWNER")).toBe("REOPENED");
    expect(transitionOverrideLifecycle("ACTIVE", "REVOKE", "PRIMARY_OWNER")).toBe("REVOKED");
    expect(() => transitionOverrideLifecycle("REVOKED", "REOPEN", "PRIMARY_OWNER")).toThrow();
    expect(() => transitionOverrideLifecycle("REQUESTED", "APPROVE", "AGENT")).toThrow();
    expect(() => transitionOverrideLifecycle("REQUESTED", "APPROVE", "ONYX")).toThrow();
    expect(() => transitionOverrideLifecycle("REQUESTED", "APPROVE", "NOVA")).toThrow();
  });

  it("preserves append-only audit conflict semantics with no last-write-wins on exact duplicates", () => {
    const first = appendAuditEvent<{ id: string; type: string; previousHash: string | null }>([], { id: "a1", type: "OVERRIDE_REQUESTED", previousHash: null });
    expect(() => appendAuditEvent(first, { id: "a1", type: "OVERRIDE_REQUESTED", previousHash: null })).toThrow();
    const second = appendAuditEvent(first, { id: "a2", type: "OVERRIDE_APPROVED", previousHash: "a1" });
    expect(second.map((entry) => entry.id)).toEqual(["a1", "a2"]);
  });
});