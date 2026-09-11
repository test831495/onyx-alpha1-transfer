import { describe, expect, it } from "vitest";
import { classifyRefreshError, PrivacySafeAuditSink } from "./audit.js";
import { createDatabaseRuntimePolicy } from "./database.js";
import { parseEncryptionKey } from "./crypto.js";
import { CredentialLifecycleService } from "./lifecycle.js";
import { ServerSessionGateway } from "./session-gateway.js";
import { InMemoryCredentialStore } from "./store.js";
import { InMemoryServerSessionRepository } from "./session-issuer.js";

const binding = { canonicalAccountRef: "account-1", providerId: "google", connectorAccountRef: "connector-1", credentialType: "oauth-refresh-token", purpose: "calendar.read", capabilityFingerprint: "cap-1" };
const key = parseEncryptionKey(Buffer.alloc(32, 9).toString("base64url"), "test-v1");

describe("foundation integration boundaries", () => {
  it("requires same-origin CSRF for state changes and rejects revoked sessions", async () => {
    const context = { sessionRef: "session-1", canonicalAccountRef: "account-1", accountSwitchGeneration: 2, authenticationAssurance: "strong", deviceTrust: "trusted", roleClass: "member", policyVersion: "policy-1", issuedAt: "2026-01-01T00:00:00.000Z", expiresAt: "2027-01-01T00:00:00.000Z", sessionVersion: 3 };
    const authority = { issue: async () => "proof", verify: async (proof: string) => proof === "proof" ? context : undefined };
    const repository = new InMemoryServerSessionRepository();
    await repository.create(context);
    const gateway = new ServerSessionGateway(authority, () => Date.parse("2026-06-01T00:00:00.000Z"), repository);
    const csrf = await gateway.issueCsrf(context.sessionRef);
    await expect(gateway.validate({ sessionProof: "proof", method: "POST", origin: "https://app.example", expectedOrigin: "https://app.example", contentType: "application/json", idempotencyKey: "request-1", csrfToken: csrf }, "credential.disconnect", "cap-1", "account-1")).resolves.toMatchObject({ sessionVersion: 3, accountSwitchGeneration: 2 });
    await expect(gateway.validate({ sessionProof: "proof", method: "POST", origin: "https://app.example", expectedOrigin: "https://app.example", contentType: "application/json", idempotencyKey: "request-1", csrfToken: csrf }, "credential.disconnect", "cap-1", "account-1")).rejects.toThrow("CSRF");
    await gateway.revoke(context);
    await expect(gateway.validate({ sessionProof: "proof", method: "GET" }, "credential.read", "cap-1", "account-1")).rejects.toThrow("revoked");
  });

  it("classifies provider failures without recording raw errors", () => {
    expect(classifyRefreshError(new Error("invalid_grant"))).toBe("invalid_grant");
    expect(classifyRefreshError(new Error("HTTP 429 rate limit"))).toBe("rate_limited_429");
    const audit = new PrivacySafeAuditSink();
    audit.record({ event: "TOKEN_REFRESH_FAILED", recordId: "record-1", canonicalAccountRef: "account-1", providerId: "google", purpose: "calendar.read", errorClass: "invalid_grant" });
    expect(JSON.stringify(audit.getEvents())).not.toContain("invalid_grant-secret");
  });

  it("keeps disconnect idempotent and preview provider operations disabled", () => {
    const store = new InMemoryCredentialStore();
    const record = store.create(binding, "refresh-token", key);
    const audit = new PrivacySafeAuditSink();
    const lifecycle = new CredentialLifecycleService(store, audit);
    lifecycle.disconnect(record.recordId, binding);
    expect(() => lifecycle.disconnect(record.recordId, binding)).not.toThrow();
    expect(createDatabaseRuntimePolicy("deploy-preview", false)).toMatchObject({ credentialOperationsEnabled: false, providerCallsEnabled: false });
  });
});