import { describe, expect, it } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
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
  createProductionAuthenticationProvider,
} from "../../netlify/functions/google-runtime-entry";
import {
  createEntraExternalIdProductionProvider,
  signSyntheticToken,
  syntheticClaims,
  SYNTHETIC_AUDIENCE,
  SYNTHETIC_ISSUER,
  SYNTHETIC_KEYS,
  SyntheticAuthenticationProvider,
  SyntheticHmacTokenVerifier,
  type AuthenticationProvider,
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

const base64url = (value: string) => Buffer.from(value).toString("base64url");
const rsaKeyPair = generateKeyPairSync("rsa", { modulusLength: 2048 });
const rsaJwk = {
  ...(rsaKeyPair.publicKey.export({ format: "jwk" }) as { kty: "RSA"; n: string; e: string }),
  kid: "prod-key-1",
  alg: "RS256" as const,
  use: "sig" as const,
};

const issuerUrl = "https://onyx-nova-auth.example/tenant";
const audienceUri = "https://server-authority.onyx.invalid";

const makeRs256Token = (claimsOverrides: Record<string, any> = {}, headerOverrides: Record<string, any> = {}) => {
  const nowSec = Math.floor(Date.now() / 1000);
  const claims = {
    sub: "canonical-owner-id",
    sid: "session-ref-1",
    sv: 1,
    dv: "device-ref-1",
    rv: 0,
    assurance: "strong",
    iss: issuerUrl,
    aud: audienceUri,
    iat: nowSec - 10,
    exp: nowSec + 3600,
    nbf: nowSec - 10,
    ...claimsOverrides,
  };
  const header = { alg: "RS256", kid: "prod-key-1", ...headerOverrides };
  const encHeader = base64url(JSON.stringify(header));
  const encClaims = base64url(JSON.stringify(claims));
  const signature = sign("RSA-SHA256", Buffer.from(`${encHeader}.${encClaims}`), rsaKeyPair.privateKey).toString("base64url");
  return `${encHeader}.${encClaims}.${signature}`;
};

function createTestAuthenticationProvider(
  issuer = SYNTHETIC_ISSUER,
  audience = SYNTHETIC_AUDIENCE,
): AuthenticationProvider {
  const verifier = new SyntheticHmacTokenVerifier(
    issuer,
    audience,
    { current: SYNTHETIC_KEYS.current, rotated: SYNTHETIC_KEYS.rotated },
    ["HS256"],
    30,
  );
  return new SyntheticAuthenticationProvider(verifier, "test-scope-salt");
}

function createMockDatabase(): DatabaseConnection {
  const sessions = new Map<string, any>();
  const sql = async (strings: TemplateStringsArray, ...values: any[]) => {
    const query = strings.join("?");
    if (query.includes("SELECT") && query.includes("server_sessions")) {
      const ref = values[0];
      const row = sessions.get(ref);
      if (row) return { rows: [row] };
      return {
        rows: [
          {
            session_ref: ref,
            canonical_account_ref: typeof ref === "string" && ref.includes("session-ref-1")
              ? "account-scope_0PlFHXdqdi7X-HNLjpBNyZdy_aKAPUUda2k6eABntfA"
              : "account-scope_fCHi6JOBnULgAWEjNJNq0UyfcmrwD65OV3ObaE1ZqQw",
            household_scope_ref: "household-1",
            account_switch_generation: 1,
            authentication_assurance: "strong",
            device_trust: "trusted",
            role_class: "owner",
            policy_version: "policy-1",
            session_version: 1,
            issued_at: new Date(Date.now() - 10000).toISOString(),
            expires_at: new Date(Date.now() + 3600000).toISOString(),
            revoked_at: null,
          },
        ],
      };
    }
    if (query.includes("INSERT INTO server_sessions") || query.includes("session_csrf_tokens")) {
      if (values[0]) {
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
    if (query.includes("DELETE FROM session_csrf_tokens")) {
      return { rows: [{ session_ref: values[0] }] };
    }
    return { rows: [] };
  };
  return {
    sql,
    pool: {
      connect: async () => ({
        query: async () => ({ rows: [] }),
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

  it("fails closed in production composition without explicitly configured canonical OIDC/JWKS variables", () => {
    // Production Netlify function entrypoint must NOT import or instantiate SyntheticAuthenticationProvider
    const runtime = createGoogleRuntimeFromEnvironment(prodEnvironment);
    expect(runtime).toBeUndefined();

    const route = createGoogleRouteHandler(createGoogleStatusHandler, prodEnvironment);
    expect(typeof route).toBe("function");
  });

  it("instantiates canonical EntraExternalIdAuthenticationProvider when production OIDC variables are supplied", () => {
    const configuredProdEnv = {
      ...prodEnvironment,
      ONYX_AUTH_ISSUER: issuerUrl,
      ONYX_AUTH_AUDIENCE: audienceUri,
      ONYX_AUTH_JWKS_KEYS: JSON.stringify([rsaJwk]),
      ONYX_AUTH_SCOPE_SALT: "onyx-production-scope-salt-v1",
    };
    const provider = createProductionAuthenticationProvider(configuredProdEnv);
    expect(provider).toBeDefined();
    expect(provider?.describeCapabilities()).toContain("entra-external-id-verification");

    const runtime = createGoogleRuntimeFromEnvironment(configuredProdEnv, { database: createMockDatabase() });
    expect(runtime).toBeDefined();
    expect(runtime?.runtimeKind).toBe("ACTIVE_PRODUCTION_RUNTIME");
  });

  it("verifies canonical RS256 token and rejects synthetic HS256, Graph, and Google tokens in production provider", async () => {
    const configuredProdEnv = {
      ...prodEnvironment,
      ONYX_AUTH_ISSUER: issuerUrl,
      ONYX_AUTH_AUDIENCE: audienceUri,
      ONYX_AUTH_JWKS_KEYS: JSON.stringify([rsaJwk]),
      ONYX_AUTH_SCOPE_SALT: "onyx-production-scope-salt-v1",
    };
    const database = createMockDatabase();
    const statusHandler = createGoogleRouteHandler(createGoogleStatusHandler, configuredProdEnv, { database });

    // 1. Valid canonical RS256 token is accepted -> HTTP 200 NOT_CONNECTED
    const rs256Proof = makeRs256Token();
    const validRes = await statusHandler({ httpMethod: "GET", headers: { authorization: `Bearer ${rs256Proof}` } });
    expect(validRes.statusCode).toBe(200);
    expect(JSON.parse(validRes.body).status).toBe("NOT_CONNECTED");

    // 2. Synthetic HS256 proof is rejected by production RS256 provider -> HTTP 400 Session rejected
    const hs256SyntheticProof = signSyntheticToken();
    const syntheticRes = await statusHandler({ httpMethod: "GET", headers: { authorization: `Bearer ${hs256SyntheticProof}` } });
    expect(syntheticRes.statusCode).toBe(400);
    expect(JSON.parse(syntheticRes.body).message).toBe("Session rejected");

    // 3. Microsoft Graph token (wrong audience) is rejected -> HTTP 400 Session rejected
    const graphToken = makeRs256Token({ aud: "https://graph.microsoft.com" });
    const graphRes = await statusHandler({ httpMethod: "GET", headers: { authorization: `Bearer ${graphToken}` } });
    expect(graphRes.statusCode).toBe(400);
    expect(JSON.parse(graphRes.body).message).toBe("Session rejected");

    // 4. Google ID token (wrong audience and issuer) is rejected -> HTTP 400 Session rejected
    const googleToken = makeRs256Token({ iss: "https://accounts.google.com", aud: "google-client-id" });
    const googleRes = await statusHandler({ httpMethod: "GET", headers: { authorization: `Bearer ${googleToken}` } });
    expect(googleRes.statusCode).toBe(400);
    expect(JSON.parse(googleRes.body).message).toBe("Session rejected");

    // 5. Expired RS256 token is rejected -> HTTP 400 Session rejected
    const nowSec = Math.floor(Date.now() / 1000);
    const expiredToken = makeRs256Token({ exp: nowSec - 300 });
    const expiredRes = await statusHandler({ httpMethod: "GET", headers: { authorization: `Bearer ${expiredToken}` } });
    expect(expiredRes.statusCode).toBe(400);
    expect(JSON.parse(expiredRes.body).message).toBe("Session rejected");
  });

  it("creates an OAuth URL without exposing the client secret", () => {
    const transport = createGoogleOAuthTransport(readGoogleServerConfig(environment));
    const url = transport.authorizationUrl({ state: "synthetic-state", codeChallenge: "synthetic-challenge", reconnect: false });
    expect(url).toContain("access_type=offline");
    expect(url).toContain("code_challenge_method=S256");
    expect(url).toContain("synthetic-state");
    expect(url).not.toContain("synthetic-client-secret");
  });

  it("creates an active production runtime when authenticationProvider is explicitly injected for test fixtures", async () => {
    const database = createMockDatabase();
    const authenticationProvider = createTestAuthenticationProvider();
    const runtime = createGoogleRuntimeFromEnvironment(prodEnvironment, { database, authenticationProvider });
    expect(runtime).toBeDefined();
    expect(runtime?.runtimeKind).toBe("ACTIVE_PRODUCTION_RUNTIME");

    expect(runtime?.authorityFactory).toBeDefined();
    const nowSec = Math.floor(Date.now() / 1000);
    const validProof = signSyntheticToken(syntheticClaims({ iat: nowSec - 10, exp: nowSec + 3600 }));
    const verified = await runtime?.sessionGateway.validator["authority"].verify(validProof);
    expect(verified).toBeDefined();
    expect(verified?.canonicalAccountRef).toContain("account-scope_");
  });

  it("verifies canonical proof acceptance and rejects missing, malformed, expired, or invalid proof", async () => {
    const database = createMockDatabase();
    const authenticationProvider = createTestAuthenticationProvider();
    const statusHandler = createGoogleRouteHandler(createGoogleStatusHandler, prodEnvironment, { database, authenticationProvider });

    const nowSec = Math.floor(Date.now() / 1000);
    const validProof = signSyntheticToken(syntheticClaims({ iat: nowSec - 10, exp: nowSec + 3600 }));

    // Valid canonical proof is accepted and status returns NOT_CONNECTED before Google consent
    const validRes = await statusHandler({ httpMethod: "GET", headers: { authorization: `Bearer ${validProof}` } });
    expect(validRes.statusCode).toBe(200);
    expect(JSON.parse(validRes.body).status).toBe("NOT_CONNECTED");

    // Missing proof rejected
    const missingRes = await statusHandler({ httpMethod: "GET", headers: {} });
    expect(missingRes.statusCode).toBe(400);
    expect(JSON.parse(missingRes.body).message).toBe("Session required");

    // Malformed proof rejected
    const malformedRes = await statusHandler({ httpMethod: "GET", headers: { authorization: "Bearer invalid.token.value" } });
    expect(malformedRes.statusCode).toBe(400);
    expect(JSON.parse(malformedRes.body).message).toBe("Session rejected");

    // Expired proof rejected
    const expiredProof = signSyntheticToken(syntheticClaims({ exp: nowSec - 300 }));
    const expiredRes = await statusHandler({ httpMethod: "GET", headers: { authorization: `Bearer ${expiredProof}` } });
    expect(expiredRes.statusCode).toBe(400);
    expect(JSON.parse(expiredRes.body).message).toBe("Session rejected");

    // Wrong issuer rejected
    const wrongIssuerProof = signSyntheticToken(syntheticClaims({ iss: "https://wrong.issuer.invalid" }));
    const wrongIssuerRes = await statusHandler({ httpMethod: "GET", headers: { authorization: `Bearer ${wrongIssuerProof}` } });
    expect(wrongIssuerRes.statusCode).toBe(400);
    expect(JSON.parse(wrongIssuerRes.body).message).toBe("Session rejected");

    // Wrong audience rejected
    const wrongAudienceProof = signSyntheticToken(syntheticClaims({ aud: "wrong-audience" }));
    const wrongAudienceRes = await statusHandler({ httpMethod: "GET", headers: { authorization: `Bearer ${wrongAudienceProof}` } });
    expect(wrongAudienceRes.statusCode).toBe(400);
    expect(JSON.parse(wrongAudienceRes.body).message).toBe("Session rejected");

    // nf_edge header alone does not authorize
    const nfEdgeRes = await statusHandler({ httpMethod: "GET", headers: { "x-nf-edge-functions": "true" } });
    expect(nfEdgeRes.statusCode).toBe(400);
    expect(JSON.parse(nfEdgeRes.body).message).toBe("Session required");
  });

  it("issues CSRF token only after valid canonical authentication", async () => {
    const database = createMockDatabase();
    const authenticationProvider = createTestAuthenticationProvider();
    const csrfHandler = createGoogleRouteHandler(createGoogleCsrfHandler, prodEnvironment, { database, authenticationProvider });

    const nowSec = Math.floor(Date.now() / 1000);
    const validProof = signSyntheticToken(syntheticClaims({ iat: nowSec - 10, exp: nowSec + 3600 }));

    // Valid canonical proof gets CSRF token
    const validRes = await csrfHandler({ httpMethod: "GET", headers: { authorization: `Bearer ${validProof}` } });
    expect(validRes.statusCode).toBe(200);
    const body = JSON.parse(validRes.body);
    expect(body.csrfToken).toBeDefined();
    expect(body.expiresInSeconds).toBe(900);

    // Missing proof rejected for CSRF
    const missingRes = await csrfHandler({ httpMethod: "GET", headers: {} });
    expect(missingRes.statusCode).toBe(400);
    expect(JSON.parse(missingRes.body).message).toBe("Session required");
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