import { describe, expect, it } from "vitest";
import * as exported from "./index.js";
import { InMemoryServerSessionRepository, SqlServerSessionRepository } from "./session-issuer.js";
import { ServerSessionGateway } from "./session-gateway.js";
import { OnyxServerSessionValidator } from "./session.js";

const context = {
  sessionRef: "session-1",
  canonicalAccountRef: "account-1",
  accountSwitchGeneration: 1,
  authenticationAssurance: "strong",
  deviceTrust: "trusted",
  roleClass: "owner",
  policyVersion: "policy-1",
  issuedAt: "2026-01-01T00:00:00.000Z",
  expiresAt: "2027-01-01T00:00:00.000Z",
  sessionVersion: 0,
};

const authority = {
  issue: async (value: { sessionRef: string }) => `proof-${value.sessionRef}`,
  verify: async (proof: string) => proof === "proof-session-1" ? context : undefined,
};

describe("PR87 review regressions", () => {
  it("does not export a direct database accessor", () => {
    expect("getNetlifyDatabase" in exported).toBe(false);
    expect("createNetlifyDatabase" in exported).toBe(false);
    expect("createTestNetlifyDatabase" in exported).toBe(true);
  });

  it("shares CSRF and revocation state through the repository", async () => {
    const repository = new InMemoryServerSessionRepository();
    await repository.create(context);
    const first = new ServerSessionGateway(authority, () => Date.parse("2026-06-01T00:00:00.000Z"), repository);
    const second = new ServerSessionGateway(authority, () => Date.parse("2026-06-01T00:00:00.000Z"), repository);
    const csrf = await first.issueCsrf(context.sessionRef);
    await expect(second.validate({ sessionProof: "proof-session-1", method: "POST", origin: "https://app.example", expectedOrigin: "https://app.example", contentType: "application/json", idempotencyKey: "id-1", csrfToken: csrf }, "credential.disconnect", "cap-1", "account-1")).resolves.toBeDefined();
    await first.revoke(context);
    await expect(second.validate({ sessionProof: "proof-session-1", method: "GET" }, "credential.read", "cap-1", "account-1")).rejects.toThrow("revoked");
  });

  it("rejects malformed cookie encoding without throwing URI errors", async () => {
    const validator = new OnyxServerSessionValidator(authority, () => Date.parse("2026-06-01T00:00:00.000Z"));
    await expect(validator.validate({ cookieHeader: "onyx_session=%ZZ" }, "credential.read", "cap-1")).rejects.toThrow("Session required");
    await expect(validator.validate({ cookieHeader: "other=value; onyx_session=valid%20proof" }, "credential.read", "cap-1")).rejects.toThrow("Session rejected");
  });

  it("uses the injected gateway clock at the expiry boundary", async () => {
    const repository = new InMemoryServerSessionRepository();
    const expiring = { ...context, expiresAt: "2026-06-01T00:00:01.000Z" };
    await repository.create(expiring);
    const expiringAuthority = { issue: authority.issue, verify: async (proof: string) => proof === "proof-session-1" ? expiring : undefined };
    const before = new ServerSessionGateway(expiringAuthority, () => Date.parse("2026-06-01T00:00:00.999Z"), repository);
    await expect(before.validate({ sessionProof: "proof-session-1", method: "GET" }, "credential.read", "cap-1", "account-1")).resolves.toBeDefined();
    const atBoundary = new ServerSessionGateway(expiringAuthority, () => Date.parse("2026-06-01T00:00:01.000Z"), repository);
    await expect(atBoundary.validate({ sessionProof: "proof-session-1", method: "GET" }, "credential.read", "cap-1", "account-1")).rejects.toThrow("expired");
  });

  it("persists SQL account-switch reason and generation state", async () => {
    const queries: Array<{ text: string; values?: readonly unknown[] }> = [];
    const database = {
      pool: { connect: async () => ({ query: async (text: string, values?: readonly unknown[]) => { queries.push({ text, values }); return { rows: [] }; }, release: () => undefined }) },
      sql: async () => ({ rows: [] }),
    } as never;
    const repository = new SqlServerSessionRepository(database);
    await repository.invalidateAccountSwitch("account-1", 2);
    expect(queries.some((query) => query.text.includes("revocation_reason") && query.text.includes("account_switch_generation"))).toBe(true);
  });
});