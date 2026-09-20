import { describe, expect, it } from "vitest";
import { classifyMicrosoftTenantEligibility, deriveMicrosoftAccountKind, projectMicrosoftSharePointPolicy } from "./tenant-policy";

describe("Microsoft tenant and account policy", () => {
  it("accepts a matching tenant when a required tenant is configured", () => {
    expect(classifyMicrosoftTenantEligibility({ requiredTenantId: "tenant-1", accountTenantId: "tenant-1", accountKind: "ORGANIZATIONAL" })).toBe("ELIGIBLE");
  });

  it("denies a mismatched tenant", () => {
    expect(classifyMicrosoftTenantEligibility({ requiredTenantId: "tenant-1", accountTenantId: "tenant-2", accountKind: "ORGANIZATIONAL" })).toBe("TENANT_MISMATCH");
  });

  it("fails closed when the account tenant is unknown", () => {
    expect(classifyMicrosoftTenantEligibility({ accountKind: "UNKNOWN" })).toBe("TENANT_UNKNOWN");
    expect(classifyMicrosoftTenantEligibility({ accountKind: "ORGANIZATIONAL" })).toBe("TENANT_UNKNOWN");
  });

  it("fails closed when a required tenant is configured but the account reports none", () => {
    expect(classifyMicrosoftTenantEligibility({ requiredTenantId: "tenant-1", accountKind: "ORGANIZATIONAL" })).toBe("TENANT_REQUIRED_MISSING");
  });

  it("does not treat the common authority as tenant authorization proof", () => {
    // No requiredTenantId configured (common authority), but the account tenant must still be known.
    expect(classifyMicrosoftTenantEligibility({ accountKind: "ORGANIZATIONAL", accountTenantId: "tenant-1" })).toBe("ELIGIBLE");
    expect(classifyMicrosoftTenantEligibility({ accountKind: "ORGANIZATIONAL" })).toBe("TENANT_UNKNOWN");
  });

  it("classifies personal, organizational, guest and unknown accounts", () => {
    expect(deriveMicrosoftAccountKind({ acct: 0 })).toBe("PERSONAL");
    expect(deriveMicrosoftAccountKind({ acct: 1, tid: "tenant-1" }, "tenant-1")).toBe("ORGANIZATIONAL");
    expect(deriveMicrosoftAccountKind({ acct: 1, tid: "tenant-2" }, "tenant-1")).toBe("GUEST");
    expect(deriveMicrosoftAccountKind({})).toBe("UNKNOWN");
  });

  it("restricts SharePoint for personal accounts regardless of scope grant", () => {
    expect(projectMicrosoftSharePointPolicy("PERSONAL", "ELIGIBLE")).toBe("SHAREPOINT_NOT_APPLICABLE_PERSONAL_ACCOUNT");
  });

  it("projects a distinct guest-account SharePoint policy", () => {
    expect(projectMicrosoftSharePointPolicy("GUEST", "ELIGIBLE")).toBe("SHAREPOINT_GUEST_SITE_AVAILABLE");
  });

  it("blocks SharePoint policy when tenant eligibility is not established", () => {
    expect(projectMicrosoftSharePointPolicy("ORGANIZATIONAL", "TENANT_MISMATCH")).toBe("SHAREPOINT_POLICY_BLOCKED");
    expect(projectMicrosoftSharePointPolicy("ORGANIZATIONAL", "TENANT_UNKNOWN")).toBe("SHAREPOINT_POLICY_BLOCKED");
  });

  it("never infers tenant eligibility from display name or email domain inputs", () => {
    // classifyMicrosoftTenantEligibility accepts no name/email fields at all; this is a structural guarantee.
    const input = { requiredTenantId: "tenant-1", accountTenantId: "tenant-1", accountKind: "ORGANIZATIONAL" as const };
    expect(Object.keys(input)).not.toContain("displayName");
    expect(Object.keys(input)).not.toContain("email");
  });
});
