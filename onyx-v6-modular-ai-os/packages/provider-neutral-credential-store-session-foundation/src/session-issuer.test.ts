import { describe, expect, it } from "vitest";
import { InMemoryServerSessionRepository, OnyxServerSessionIssuer } from "./session-issuer.js";
import { OnyxServerSessionValidator } from "./session.js";
import { ServerSessionGateway } from "./session-gateway.js";

const authentication = {
  authenticated: true,
  canonicalAccountRef: "account-1",
  householdScopeRef: "household-1",
  accountSwitchGeneration: 4,
  authenticationAssurance: "strong",
  deviceTrust: "trusted",
  roleClass: "owner",
  policyVersion: "policy-1",
};

describe("ONYX server session issuer", () => {
  it("issues an opaque secure cookie and stores only bounded server context", async () => {
    const repository = new InMemoryServerSessionRepository();
    const authority = {
      issue: async (context: { sessionRef: string }) => `proof-${context.sessionRef}`,
      verify: async (proof: string) => repository.get(proof.replace("proof-", "")),
    } as never;
    const issuer = new OnyxServerSessionIssuer(authority, repository, () => Date.parse("2026-09-11T00:00:00.000Z"));
    const issued = await issuer.issue(authentication, 900, true);
    expect(issued.cookie).toContain("HttpOnly");
    expect(issued.cookie).toContain("Secure");
    expect(issued.cookie).toContain("SameSite=Lax");
    expect(issued.cookie).not.toContain(authentication.canonicalAccountRef);
    expect(issued.context.expiresAt).toBe("2026-09-11T00:15:00.000Z");
    expect(await repository.get(issued.context.sessionRef)).toMatchObject({ canonicalAccountRef: "account-1", sessionVersion: 0 });
  });

  it("enforces repository state, account-switch generation, and CSRF/origin guards", async () => {
    const repository = new InMemoryServerSessionRepository();
    const authority = {
      issue: async (context: { sessionRef: string }) => `proof-${context.sessionRef}`,
      verify: async (proof: string) => repository.get(proof.replace("proof-", "")),
    };
    const issuer = new OnyxServerSessionIssuer(authority, repository, () => Date.parse("2026-09-11T00:00:00.000Z"));
    const issued = await issuer.issue(authentication, 900, true);
    const gateway = new ServerSessionGateway(authority, () => Date.parse("2026-09-11T00:00:00.000Z"), repository);
    const csrf = await gateway.issueCsrf(issued.context.sessionRef);
    await expect(gateway.validate({ cookieHeader: `onyx_session=${issued.proof}`, method: "POST", origin: "https://app.example", expectedOrigin: "https://app.example", contentType: "application/json", idempotencyKey: "request-1", csrfToken: csrf }, "credential.disconnect", "cap-1", "account-1", 4)).resolves.toMatchObject({ sessionVersion: 0 });
    await issuer.switchAccount("account-1", 5);
    await expect(gateway.validate({ cookieHeader: `onyx_session=${issued.proof}`, method: "GET" }, "credential.read", "cap-1", "account-1", 4)).rejects.toThrow("account switch");
    await issuer.revoke(issued.context.sessionRef);
    await expect(gateway.validate({ cookieHeader: `onyx_session=${issued.proof}`, method: "GET" }, "credential.read", "cap-1", "account-1")).rejects.toThrow("revoked");
  });
});