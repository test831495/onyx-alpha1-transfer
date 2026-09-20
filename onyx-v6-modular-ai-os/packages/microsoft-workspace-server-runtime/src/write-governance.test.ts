import { describe, expect, it } from "vitest";
import { evaluateMicrosoftSyntheticWriteValidation, evaluateMicrosoftWriteExecution, type MicrosoftWriteApprovalRecord, type MicrosoftWriteExecutionRequest } from "./write-governance";

const now = Date.parse("2026-01-01T00:00:00.000Z");

const baseRequest: MicrosoftWriteExecutionRequest = {
  canonicalAccountRef: "account-1",
  tenantId: "tenant-1",
  sessionRef: "session-1",
  targetFingerprint: "drive-1:item-1",
  requestFingerprint: "request-hash-1",
  oauthScopeGranted: true,
  capabilityEligible: true,
  auditAvailable: true,
  policyAvailable: true,
  now,
};

const baseApproval: MicrosoftWriteApprovalRecord = {
  approvalId: "approval-1",
  canonicalAccountRef: "account-1",
  tenantId: "tenant-1",
  sessionRef: "session-1",
  targetFingerprint: "drive-1:item-1",
  requestFingerprint: "request-hash-1",
  issuedAt: "2025-12-31T23:00:00.000Z",
  expiresAt: "2026-01-01T01:00:00.000Z",
};

describe("Microsoft write-execution governance", () => {
  it("denies when the OAuth scope is not granted", () => {
    expect(evaluateMicrosoftWriteExecution({ ...baseRequest, oauthScopeGranted: false }, baseApproval)).toEqual({ allowed: false, reason: "OAUTH_SCOPE_NOT_GRANTED" });
  });

  it("denies when capability is not eligible", () => {
    expect(evaluateMicrosoftWriteExecution({ ...baseRequest, capabilityEligible: false }, baseApproval)).toEqual({ allowed: false, reason: "CAPABILITY_NOT_ELIGIBLE" });
  });

  it("denies when approval is absent", () => {
    expect(evaluateMicrosoftWriteExecution(baseRequest, undefined)).toEqual({ allowed: false, reason: "APPROVAL_ABSENT" });
  });

  it("denies an expired approval", () => {
    expect(evaluateMicrosoftWriteExecution(baseRequest, { ...baseApproval, expiresAt: "2025-12-31T00:00:00.000Z" })).toEqual({ allowed: false, reason: "APPROVAL_EXPIRED" });
  });

  it("fails closed when the approval expiresAt timestamp is malformed rather than treating it as non-expired", () => {
    expect(evaluateMicrosoftWriteExecution(baseRequest, { ...baseApproval, expiresAt: "not-a-timestamp" })).toEqual({ allowed: false, reason: "APPROVAL_EXPIRED" });
  });

  it("denies a replayed (already consumed) approval", () => {
    expect(evaluateMicrosoftWriteExecution(baseRequest, { ...baseApproval, consumedAt: "2026-01-01T00:00:00.000Z" })).toEqual({ allowed: false, reason: "APPROVAL_REPLAYED" });
  });

  it("denies an account-mismatched approval", () => {
    expect(evaluateMicrosoftWriteExecution(baseRequest, { ...baseApproval, canonicalAccountRef: "account-2" })).toEqual({ allowed: false, reason: "APPROVAL_ACCOUNT_MISMATCH" });
  });

  it("denies a tenant-mismatched approval", () => {
    expect(evaluateMicrosoftWriteExecution(baseRequest, { ...baseApproval, tenantId: "tenant-2" })).toEqual({ allowed: false, reason: "APPROVAL_TENANT_MISMATCH" });
  });

  it("denies a session-mismatched approval", () => {
    expect(evaluateMicrosoftWriteExecution(baseRequest, { ...baseApproval, sessionRef: "session-2" })).toEqual({ allowed: false, reason: "APPROVAL_SESSION_MISMATCH" });
  });

  it("denies a target-mismatched approval", () => {
    expect(evaluateMicrosoftWriteExecution(baseRequest, { ...baseApproval, targetFingerprint: "drive-1:item-2" })).toEqual({ allowed: false, reason: "APPROVAL_TARGET_MISMATCH" });
  });

  it("denies when the underlying request materially changed after approval", () => {
    expect(evaluateMicrosoftWriteExecution(baseRequest, { ...baseApproval, requestFingerprint: "request-hash-2" })).toEqual({ allowed: false, reason: "APPROVAL_REQUEST_CHANGED" });
  });

  it("denies when audit is unavailable", () => {
    expect(evaluateMicrosoftWriteExecution({ ...baseRequest, auditAvailable: false }, baseApproval)).toEqual({ allowed: false, reason: "AUDIT_UNAVAILABLE" });
  });

  it("denies when policy is unavailable", () => {
    expect(evaluateMicrosoftWriteExecution({ ...baseRequest, policyAvailable: false }, baseApproval)).toEqual({ allowed: false, reason: "POLICY_UNAVAILABLE" });
  });

  it("allows execution only when every fact is satisfied", () => {
    expect(evaluateMicrosoftWriteExecution(baseRequest, baseApproval)).toEqual({ allowed: true });
  });

  it("evaluates synthetic write-validation proposals with the identical invariant but never marks them as executing", () => {
    const decision = evaluateMicrosoftSyntheticWriteValidation(baseRequest, baseApproval);
    expect(decision).toEqual({ allowed: true });
    expect(decision).not.toHaveProperty("executed");
  });

  it("exposes no general write endpoint surface from this module", async () => {
    const moduleExports = Object.keys(await import("./write-governance"));
    expect(moduleExports).not.toContain("executeMicrosoftWrite");
    expect(moduleExports).not.toContain("writeMicrosoftFile");
  });
});
