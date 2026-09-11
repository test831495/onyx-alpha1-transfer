import { describe, expect, it } from "vitest";
import type { AuthenticationProvider, AuthenticatedRequestContext } from "@onyx/account-authentication-server-authority";
import type { ServerSessionContext } from "@onyx/provider-neutral-credential-store-session-foundation";
import {
  createOnyxSessionAuthorityFactory,
  type OnyxSessionContext,
} from "./authority-factory";

const authenticatedContext: AuthenticatedRequestContext = {
  schemaVersion: "ACCOUNT_AUTHORITY_CONTEXT_V1",
  opaqueAccountScope: "account-scope_owner",
  sessionId: "session_session-1",
  sessionVersion: 3,
  authenticationAssurance: "strong",
  deviceReference: "device_device-1",
  issuedAt: "2026-09-11T00:00:00.000Z",
  expiresAt: "2026-09-11T01:00:00.000Z",
  policyVersion: "policy-1",
  revocationVersion: 4,
  requestId: "request_test-1",
  issuer: "https://issuer.example",
  audience: "onyx-command-center",
};

const serverSession: ServerSessionContext = {
  sessionRef: "session_session-1",
  canonicalAccountRef: "account-owner",
  accountSwitchGeneration: 4,
  authenticationAssurance: "strong",
  deviceTrust: "trusted",
  roleClass: "owner",
  policyVersion: "policy-1",
  issuedAt: authenticatedContext.issuedAt,
  expiresAt: authenticatedContext.expiresAt,
  sessionVersion: 3,
};

const provider = (decision: "allow" | "deny" | "expired" | "revoked"): AuthenticationProvider => ({
  verifyProof: () => decision === "allow"
    ? { allowed: true, code: "AUTHENTICATED", proof: { claims: {}, keyId: "key-1" } }
    : { allowed: false, code: decision === "expired" ? "TOKEN_EXPIRED" : decision === "revoked" ? "SESSION_REVOKED" : "UNAUTHENTICATED" },
  deriveAuthenticatedContext: () => authenticatedContext,
  invalidateSessionProjection: () => undefined,
  invalidateDeviceProjection: () => undefined,
  describeCapabilities: () => ["canonical-verification"],
});

const mapper = (context: AuthenticatedRequestContext): OnyxSessionContext => ({
  ...serverSession,
  actorId: context.opaqueAccountScope,
  authorizationState: "AUTHORIZED",
  capabilityState: ["calendar.events.read"],
  auditContext: { requestId: context.requestId, policyVersion: context.policyVersion },
});

describe("OnyxSessionAuthorityFactory", () => {
  it("accepts a canonical verified session and preserves enriched authority context", async () => {
    const factory = createOnyxSessionAuthorityFactory({
      authenticationProvider: provider("allow"),
      mapContext: mapper,
      runtimeContext: "production",
      now: () => Date.parse("2026-09-11T00:30:00.000Z"),
    });
    await expect(factory.verifyContext("canonical-proof")).resolves.toMatchObject({
      canonicalAccountRef: "account-owner",
      actorId: "account-scope_owner",
      authorizationState: "AUTHORIZED",
      capabilityState: ["calendar.events.read"],
    });
    await expect(factory.authority.verify("canonical-proof")).resolves.toMatchObject(serverSession);
  });

  it.each([
    ["missing", undefined],
    ["expired", provider("expired")],
    ["revoked", provider("revoked")],
    ["mismatch", provider("deny")],
  ])("rejects %s canonical proof", async (_label, canonicalProvider) => {
    const factory = createOnyxSessionAuthorityFactory({
      authenticationProvider: canonicalProvider ?? provider("deny"),
      mapContext: mapper,
      runtimeContext: "production",
    });
    await expect(factory.verifyContext(undefined)).resolves.toBeUndefined();
    if (canonicalProvider) await expect(factory.verifyContext("proof")).resolves.toBeUndefined();
  });

  it.each(["deploy-preview", "branch-deploy", "local", "test", "unknown"] as const)(
    "denies %s runtime before canonical verification",
    async (runtimeContext) => {
      const verifyProof = () => ({ allowed: true as const, code: "AUTHENTICATED" as const, proof: { claims: {}, keyId: "key-1" } });
      const factory = createOnyxSessionAuthorityFactory({
        authenticationProvider: { ...provider("allow"), verifyProof },
        mapContext: mapper,
        runtimeContext,
      });
      await expect(factory.verifyContext("proof")).resolves.toBeUndefined();
    },
  );
});