import { describe, expect, it } from "vitest";
import {
  createGoogleCsrfHandler,
  createGoogleOAuthTransport,
  createGoogleServerRuntime,
  createGoogleStatusHandler,
  readGoogleServerConfig,
} from "./index";
import {
  createGoogleRouteHandler,
  createGoogleRuntimeFromEnvironment,
} from "../../netlify/functions/google-runtime-entry";
import {
  signSyntheticToken,
  syntheticClaims,
  SYNTHETIC_KEYS,
} from "@onyx/account-authentication-server-authority";
import type { DatabaseConnection } from "@netlify/database";

const environment = {
  CONTEXT: "test",
  NODE_ENV: "test",
  ONYX_GOOGLE_CLIENT_ID: "synthetic-client-id",
  ONYX_GOOGLE_CLIENT_SECRET: "synthetic-client-secret",
  ONYX_GOOGLE_REDIRECT_URI: "https://onyx-alpha0.netlify.app/.netlify/functions/oauth-google-callback",
};

const productionKey = Buffer.alloc(32, 7).toString("base64url");
const prodEnvironment = {
  ...environment,
  CONTEXT: "production",
  NODE_ENV: "production",
  ONYX_CREDENTIAL_ENCRYPTION_KEY: productionKey,
  ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1",
};

function createMockDatabase(): DatabaseConnection {
  const sessions = new Map<string, any>();
  return {
    pool: {
      connect: async () => ({
        query: async (text: string, values?: any[]) => {
          if (text.includes("SELECT") && text.includes("server_sessions")) {
            const ref = values?.[0];
            const row = sessions.get(ref);
            return { rows: row ? [row] : [] };
          }
          if (text.includes("INSERT INTO server_sessions") || text.includes("UPSERT") || text.includes("UPDATE")) {
            if (values?.[0]) {
              sessions.set(values[0], {
                session_ref: values[0],
                canonical_account_ref: values[1],
                household_scope_ref: values[2] ?? values[1],
                account_switch_generation: values[3] ?? 1,
                authentication_assurance: values[4] ?? "strong",
                device_trust: values[5] ?? "trusted",
                role_class: values[6] ?? "owner",
                policy_version: values[7] ?? "policy-1",
                session_version: values[8] ?? 1,
                issued_at: values[9] ?? new Date().toISOString(),
                expires_at: values[10] ?? new Date(Date.now() + 3600000).toISOString(),
                revoked_at: null,
              });
            }
            return { rows: [] };
          }
          return { rows: [] };
        },
        release: () => undefined,
      }),
    },
  } as any;
}

describe("Google server runtime", () => {
  it("activates production credential operations when the runtime is valid and production-scoped", () => {
    const runtime = createGoogleServerRuntime({
      database: {} as never,
      authority: { verify: async () => undefined, issue: async () => "" },
      encryptionKey: { version: "test-v1", bytes: new Uint8Array(32) },
      environment: { ...environment, CONTEXT: "production", NODE_ENV: "production" },
    });
    expect(runtime.policy.context).toBe("production");
    expect(runtime.policy.credentialOperationsEnabled).toBe(true);
  });

  it("fails closed for unknown or non-production redirect configuration", () => {
    expect(() => readGoogleServerConfig({ ...environment, ONYX_GOOGLE_REDIRECT_URI: "http://localhost/callback" })).toThrow();
    expect(() => createGoogleServerRuntime({
      database: {} as never,
      authority: { verify: async () => undefined, issue: async () => "" },
      encryptionKey: { version: "test-v1", bytes: new Uint8Array(32) },
      environment: { ...environment, CONTEXT: "deploy-preview", NODE_ENV: "production" },
    })).toThrow("Google runtime context denied");
  });

  it("routes production requests through the real Google runtime only when the environment is production-scoped", () => {
    const route = createGoogleRouteHandler(createGoogleStatusHandler, { ...environment, CONTEXT: "production", NODE_ENV: "production" });
    expect(typeof route).toBe("function");
    expect(route).not.toBeNull();
  });

  it("creates an OAuth URL without exposing the client secret", () => {
    const transport = createGoogleOAuthTransport(readGoogleServerConfig(environment));
    const url = transport.authorizationUrl({ state: "synthetic-state", codeChallenge: "synthetic-challenge", reconnect: false });
    expect(url).toContain("access_type=offline");
    expect(url).toContain("code_challenge_method=S256");
    expect(url).toContain("synthetic-state");
    expect(url).not.toContain("synthetic-client-secret");
  });

  it("creates an active production runtime with canonical authority and rejects placeholders", async () => {
    const database = createMockDatabase();
    const runtime = createGoogleRuntimeFromEnvironment(prodEnvironment, { database });
    expect(runtime).toBeDefined();
    expect(runtime?.runtimeKind).toBe("ACTIVE_PRODUCTION_RUNTIME");

    expect(runtime?.authorityFactory).toBeDefined();
    const nowSec = Math.floor(Date.now() / 1000);
    const validProof = signSyntheticToken(syntheticClaims({ iat: nowSec - 10, exp: nowSec + 3600 }));
    const verified = await runtime?.sessionGateway.validator["authority"].verify(validProof);
    expect(verified).toBeDefined();
    expect(verified?.canonicalAccountRef).toContain("account-scope_");
  });

  it("rejects missing proof, malformed proof, expired proof, and nf_edge headers", async () => {
    const database = createMockDatabase();
    const statusHandler = createGoogleRouteHandler(createGoogleStatusHandler, prodEnvironment, { database });

    // Missing proof
    const missingRes = await statusHandler({ httpMethod: "GET", headers: {} });
    expect(missingRes.statusCode).toBe(400);
    expect(JSON.parse(missingRes.body).message).toBe("Session required");

    // Malformed proof
    const malformedRes = await statusHandler({ httpMethod: "GET", headers: { authorization: "Bearer invalid.token.value" } });
    expect(malformedRes.statusCode).toBe(400);
    expect(JSON.parse(malformedRes.body).message).toBe("Session rejected");

    // Expired proof
    const expiredProof = signSyntheticToken(syntheticClaims({ exp: Math.floor(Date.now() / 1000) - 300 }));
    const expiredRes = await statusHandler({ httpMethod: "GET", headers: { authorization: `Bearer ${expiredProof}` } });
    expect(expiredRes.statusCode).toBe(400);
    expect(JSON.parse(expiredRes.body).message).toBe("Session rejected");

    // nf_edge header alone
    const nfEdgeRes = await statusHandler({ httpMethod: "GET", headers: { "x-nf-edge-functions": "true" } });
    expect(nfEdgeRes.statusCode).toBe(400);
    expect(JSON.parse(nfEdgeRes.body).message).toBe("Session required");
  });

  it("returns UNAVAILABLE for deploy-preview or unknown contexts", async () => {
    const previewHandler = createGoogleRouteHandler(createGoogleStatusHandler, { ...prodEnvironment, CONTEXT: "deploy-preview" });
    const response = await previewHandler({ httpMethod: "GET", headers: {} });
    expect(response.statusCode).toBe(503);
    const body = JSON.parse(response.body);
    expect(body.status).toBe("UNAVAILABLE");
    expect(body.message).toBe("Google Workspace is not active in this environment.");
  });
});