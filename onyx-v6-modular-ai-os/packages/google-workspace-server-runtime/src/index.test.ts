import { describe, expect, it, vi } from "vitest";
import { generateKeyPairSync, sign } from "node:crypto";
import * as googleRuntimeModule from "@onyx/google-workspace-server-runtime";
import {
  createGoogleCsrfHandler,
  createGoogleOAuthTransport,
  createGoogleServerRuntime,
  createGoogleStatusHandler,
  GOOGLE_OAUTH_SCOPES,
  readGoogleServerConfig,
} from "./index";
import {
  buildGoogleDatabaseInitializationFailureDiagnostic,
  classifyAuthenticationProviderConfiguration,
  classifyGoogleDatabaseInitializationFailure,
  classifyGoogleOAuthConfiguration,
  createGoogleRouteHandler,
  createGoogleRuntimeFromEnvironment,
  createProductionAuthenticationProvider,
  getGoogleRuntimePreflight,
// @ts-ignore
} from "../../../netlify/functions/google-runtime-entry";
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
    scp: "account.preference.readwrite",
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

    // 6. Missing ONYX required scope is rejected -> HTTP 400 Session rejected
    const missingScopeToken = makeRs256Token({ scp: "other.read" });
    const missingScopeRes = await statusHandler({ httpMethod: "GET", headers: { authorization: `Bearer ${missingScopeToken}` } });
    expect(missingScopeRes.statusCode).toBe(400);
    expect(JSON.parse(missingScopeRes.body).message).toBe("Session rejected");
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
    type RuntimeAuthorityInspection = { readonly validator: { readonly authority: { verify(proof: string): Promise<{ readonly canonicalAccountRef: string }> } } };
    const inspectedGateway = runtime?.sessionGateway as unknown as RuntimeAuthorityInspection;
    const verified = await inspectedGateway.validator.authority.verify(validProof);
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

  it("logs normalized runtimeContext without raw CONTEXT or NODE_ENV values", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const previewEnvironment = {
      ...prodEnvironment,
      CONTEXT: "deploy-preview",
      NODE_ENV: "production",
      ONYX_GOOGLE_CLIENT_SECRET: "super-secret-client-secret-value",
      ONYX_CREDENTIAL_ENCRYPTION_KEY: "super-secret-key-value",
    };

    createGoogleRuntimeFromEnvironment(previewEnvironment);

    const initLog = consoleSpy.mock.calls.find(([tag]) => tag === "[GOOGLE_RUNTIME_INIT]");
    expect(initLog).toBeDefined();
    const payload = initLog?.[1] as Record<string, unknown>;
    expect(payload).toMatchObject({
      diagnostics: { runtimeContext: "deploy-preview" },
    });
    expect(payload).not.toHaveProperty("diagnostics.netlifyContext");
    expect(payload).not.toHaveProperty("diagnostics.nodeEnv");
    expect(JSON.stringify(payload)).not.toContain("super-secret-client-secret-value");
    expect(JSON.stringify(payload)).not.toContain("super-secret-key-value");

    consoleSpy.mockRestore();
  });

  it("successfully returns the canonical runtime without falling through to a failure log", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const configuredProdEnv = {
      ...prodEnvironment,
      ONYX_AUTH_ISSUER: issuerUrl,
      ONYX_AUTH_AUDIENCE: audienceUri,
      ONYX_AUTH_JWKS_KEYS: JSON.stringify([rsaJwk]),
      ONYX_AUTH_SCOPE_SALT: "onyx-production-scope-salt-v1",
    };

    const runtime = createGoogleRuntimeFromEnvironment(configuredProdEnv, { database: createMockDatabase() });
    expect(runtime).toBeDefined();
    expect(runtime?.runtimeKind).toBe("ACTIVE_PRODUCTION_RUNTIME");
    expect(consoleSpy).not.toHaveBeenCalledWith(
      "[GOOGLE_RUNTIME_INIT]",
      expect.objectContaining({ reasonCode: "CANONICAL_AUTHORITY_INITIALIZATION_FAILED" }),
    );

    consoleSpy.mockRestore();
  });

  it("logs bounded initialization reasons and never emits raw secrets", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const secretEnvironment = {
      ...prodEnvironment,
      ONYX_GOOGLE_CLIENT_ID: "synthetic-client-id",
      ONYX_GOOGLE_CLIENT_SECRET: "super-secret-client-secret-value",
      ONYX_CREDENTIAL_ENCRYPTION_KEY: "super-secret-key-value",
      ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1",
    };

    const runtime = createGoogleRuntimeFromEnvironment(secretEnvironment);
    expect(runtime).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[GOOGLE_RUNTIME_INIT]",
      expect.objectContaining({
        reasonCode: "AUTHENTICATION_PROVIDER_UNAVAILABLE",
        errorName: expect.any(String),
        safeMessage: expect.any(String),
        diagnostics: expect.objectContaining({
          hasGoogleClientId: true,
          hasGoogleClientSecret: true,
          hasAuthIssuer: false,
          hasAuthAudience: false,
          hasCredentialKey: true,
          hasCredentialKeyVersion: true,
        }),
      }),
    );

    const logged = JSON.stringify(consoleSpy.mock.calls);
    expect(logged).not.toContain("super-secret-client-secret-value");
    expect(logged).not.toContain("super-secret-key-value");
    expect(logged).not.toContain("synthetic-client-secret");
    expect(logged).not.toContain("stack");

    consoleSpy.mockRestore();
  });

  it("classifies Google database initialization failures with closed, secret-safe diagnostics", async () => {
    const connectionString = "postgres://user:password@db.internal.example:5432/onyx";
    const credentialKey = "database-test-secret-credential-key";
    const oauthSecret = "database-test-oauth-secret";
    const missingDatabaseConnection = new Error("Netlify database metadata unavailable");
    missingDatabaseConnection.name = "MissingDatabaseConnectionError";
    const genericConstructionFailure = new Error(`${connectionString} ${credentialKey} ${oauthSecret}`);

    expect(classifyGoogleDatabaseInitializationFailure(missingDatabaseConnection)).toBe("NETLIFY_DATABASE_CONNECTION_METADATA_MISSING");
    expect(classifyGoogleDatabaseInitializationFailure({ name: "MissingDatabaseConnectionError" })).toBe("NETLIFY_DATABASE_CONNECTION_METADATA_MISSING");
    expect(classifyGoogleDatabaseInitializationFailure(genericConstructionFailure)).toBe("NETLIFY_DATABASE_CLIENT_INITIALIZATION_FAILED");
    expect(classifyGoogleDatabaseInitializationFailure(genericConstructionFailure, "runtime-integration")).toBe("NETLIFY_DATABASE_RUNTIME_UNAVAILABLE");
    expect(classifyGoogleDatabaseInitializationFailure(genericConstructionFailure, "canonical-runtime")).toBe("GOOGLE_CANONICAL_RUNTIME_DATABASE_FAILURE");

    const genericDiagnostic = buildGoogleDatabaseInitializationFailureDiagnostic(genericConstructionFailure);
    const arbitraryThrownDiagnostic = buildGoogleDatabaseInitializationFailureDiagnostic({ message: connectionString, stack: credentialKey });
    expect(genericDiagnostic).toEqual({ reasonCode: "NETLIFY_DATABASE_CLIENT_INITIALIZATION_FAILED", errorName: "Error" });
    expect(arbitraryThrownDiagnostic).toEqual({ reasonCode: "NETLIFY_DATABASE_CLIENT_INITIALIZATION_FAILED", errorName: "UnknownError" });
    const serializedDiagnostics = JSON.stringify([genericDiagnostic, arbitraryThrownDiagnostic]);
    expect(serializedDiagnostics).not.toContain(connectionString);
    expect(serializedDiagnostics).not.toContain(credentialKey);
    expect(serializedDiagnostics).not.toContain(oauthSecret);
    expect(serializedDiagnostics).not.toContain("stack");
    expect(serializedDiagnostics).not.toContain(genericConstructionFailure.message);

    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const configuredProdEnv = {
      ...prodEnvironment,
      ONYX_AUTH_ISSUER: issuerUrl,
      ONYX_AUTH_AUDIENCE: audienceUri,
      ONYX_AUTH_JWKS_KEYS: JSON.stringify([rsaJwk]),
      ONYX_AUTH_SCOPE_SALT: "onyx-production-scope-salt-v1",
      ONYX_GOOGLE_CLIENT_SECRET: oauthSecret,
      ONYX_CREDENTIAL_ENCRYPTION_KEY: productionKey,
    };

    expect(createGoogleRuntimeFromEnvironment(configuredProdEnv)).toBeUndefined();
    const databaseLog = consoleSpy.mock.calls.find(([tag]) => tag === "[GOOGLE_DATABASE_INIT]");
    expect(databaseLog).toEqual([
      "[GOOGLE_DATABASE_INIT]",
      { reasonCode: "NETLIFY_DATABASE_CONNECTION_METADATA_MISSING", errorName: "MissingDatabaseConnectionError" },
    ]);
    const missingDatabaseMessage = missingDatabaseConnection.message;
    const loggedDatabaseFailure = JSON.stringify(consoleSpy.mock.calls);
    expect(loggedDatabaseFailure).not.toContain(missingDatabaseMessage);
    expect(loggedDatabaseFailure).not.toContain("stack");
    expect(loggedDatabaseFailure).not.toContain(connectionString);
    expect(loggedDatabaseFailure).not.toContain(credentialKey);
    expect(loggedDatabaseFailure).not.toContain(oauthSecret);
    consoleSpy.mockRestore();

    const canonicalConsoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const canonicalFailureRuntime = createGoogleRuntimeFromEnvironment(
      { ...configuredProdEnv, ONYX_GOOGLE_REDIRECT_URI: "https://onyx-alpha0.netlify.app/.netlify/functions/not-google-callback" },
      { database: createMockDatabase() },
    );
    expect(canonicalFailureRuntime).toBeUndefined();
    expect(canonicalConsoleSpy.mock.calls.some(([tag]) => tag === "[GOOGLE_DATABASE_INIT]")).toBe(false);
    expect(canonicalConsoleSpy).toHaveBeenCalledWith(
      "[GOOGLE_RUNTIME_INIT]",
      expect.objectContaining({ reasonCode: "CANONICAL_AUTHORITY_INITIALIZATION_FAILED" }),
    );
    canonicalConsoleSpy.mockRestore();

    const successConsoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const runtime = createGoogleRuntimeFromEnvironment(configuredProdEnv, { database: createMockDatabase() });
    expect(runtime).toBeDefined();
    expect(runtime?.runtimeKind).toBe("ACTIVE_PRODUCTION_RUNTIME");
    expect(successConsoleSpy).not.toHaveBeenCalled();

    const route = createGoogleRouteHandler(createGoogleStatusHandler, configuredProdEnv);
    const response = await route({ httpMethod: "GET", headers: {} });
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toEqual({ status: "UNAVAILABLE", message: "Google Workspace is not active in this environment." });

    expect(GOOGLE_OAUTH_SCOPES).toEqual([
      "openid",
      "https://www.googleapis.com/auth/calendar.events.readonly",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ]);
    expect(GOOGLE_OAUTH_SCOPES.every((scope) => !/write|modify|full|compose|send/i.test(scope))).toBe(true);

    successConsoleSpy.mockRestore();
  });

  it("A. recognizes production via ONYX_RUNTIME_CONTEXT when CONTEXT is unavailable to the Functions runtime", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { CONTEXT: _omit, ...withoutContext } = prodEnvironment as Record<string, string | undefined>;
    const overrideEnvironment = {
      ...withoutContext,
      ONYX_RUNTIME_CONTEXT: "production",
      ONYX_AUTH_ISSUER: issuerUrl,
      ONYX_AUTH_AUDIENCE: audienceUri,
      ONYX_AUTH_JWKS_KEYS: JSON.stringify([rsaJwk]),
      ONYX_AUTH_SCOPE_SALT: "onyx-production-scope-salt-v1",
    };

    const runtime = createGoogleRuntimeFromEnvironment(overrideEnvironment, { database: createMockDatabase() });
    expect(runtime).toBeDefined();
    expect(runtime?.runtimeKind).toBe("ACTIVE_PRODUCTION_RUNTIME");
    expect(consoleSpy).not.toHaveBeenCalledWith("[GOOGLE_RUNTIME_INIT]", expect.objectContaining({ reasonCode: "INVALID_RUNTIME_CONTEXT" }));

    consoleSpy.mockRestore();
  });

  it("B. rejects an unknown runtime context even when every other credential is fully configured", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const { CONTEXT: _omit, ...withoutContext } = prodEnvironment as Record<string, string | undefined>;

    const runtime = createGoogleRuntimeFromEnvironment(withoutContext, { database: createMockDatabase() });
    expect(runtime).toBeUndefined();
    expect(consoleSpy).toHaveBeenCalledWith(
      "[GOOGLE_RUNTIME_INIT]",
      expect.objectContaining({ reasonCode: "INVALID_RUNTIME_CONTEXT", diagnostics: expect.objectContaining({ runtimeContext: "unknown" }) }),
    );

    consoleSpy.mockRestore();
  });

  it("C. detects a correctly configured credential key version", () => {
    const diagnosticsEnvironment = { ...prodEnvironment, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: "v1" };
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    createGoogleRuntimeFromEnvironment(diagnosticsEnvironment);

    const initLog = consoleSpy.mock.calls.find(([tag]) => tag === "[GOOGLE_RUNTIME_INIT]");
    expect((initLog?.[1] as Record<string, unknown>)?.diagnostics).toMatchObject({ hasCredentialKeyVersion: true });

    consoleSpy.mockRestore();
  });

  it("D. treats a missing or whitespace-only credential key version as absent and keeps activation rejected", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    for (const version of [undefined, "", "   "]) {
      const environmentUnderTest = { ...prodEnvironment, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: version };
      const runtime = createGoogleRuntimeFromEnvironment(environmentUnderTest);
      expect(runtime).toBeUndefined();

      const initLog = consoleSpy.mock.calls.find(([tag]) => tag === "[GOOGLE_RUNTIME_INIT]");
      expect((initLog?.[1] as Record<string, unknown>)?.diagnostics).toMatchObject({ hasCredentialKeyVersion: false });
      consoleSpy.mockClear();
    }

    consoleSpy.mockRestore();
  });

  it("E. activates the Google runtime only once runtime context, authentication, and credential key requirements are all satisfied", () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const completeEnvironment = {
      ...prodEnvironment,
      ONYX_AUTH_ISSUER: issuerUrl,
      ONYX_AUTH_AUDIENCE: audienceUri,
      ONYX_AUTH_JWKS_KEYS: JSON.stringify([rsaJwk]),
      ONYX_AUTH_SCOPE_SALT: "onyx-production-scope-salt-v1",
    };

    // Missing runtime context alone blocks activation even though every other requirement is satisfied.
    const { CONTEXT: _omit, ...missingContext } = completeEnvironment as Record<string, string | undefined>;
    expect(createGoogleRuntimeFromEnvironment(missingContext, { database: createMockDatabase() })).toBeUndefined();

    // Missing credential key version alone blocks activation even though the runtime context is valid.
    expect(createGoogleRuntimeFromEnvironment({ ...completeEnvironment, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: undefined }, { database: createMockDatabase() })).toBeUndefined();

    // All requirements satisfied together activate the runtime.
    const runtime = createGoogleRuntimeFromEnvironment(completeEnvironment, { database: createMockDatabase() });
    expect(runtime).toBeDefined();
    expect(runtime?.runtimeKind).toBe("ACTIVE_PRODUCTION_RUNTIME");

    consoleSpy.mockRestore();
  });

  it("classifies authentication provider configuration for every bounded outcome without logging issuer, audience, JWKS, or scope salt", () => {
    expect(classifyAuthenticationProviderConfiguration({})).toBe("AUTH_ISSUER_MISSING");
    expect(classifyAuthenticationProviderConfiguration({ ONYX_AUTH_ISSUER: issuerUrl })).toBe("AUTH_AUDIENCE_MISSING");
    expect(classifyAuthenticationProviderConfiguration({ ONYX_AUTH_ISSUER: issuerUrl, ONYX_AUTH_AUDIENCE: audienceUri, ONYX_AUTH_JWKS_KEYS: "{not json" })).toBe("AUTH_JWKS_JSON_INVALID");
    expect(classifyAuthenticationProviderConfiguration({ ONYX_AUTH_ISSUER: issuerUrl, ONYX_AUTH_AUDIENCE: audienceUri, ONYX_AUTH_SCOPE_SALT: "too-short" })).toBe("AUTH_PROVIDER_INITIALIZATION_FAILED");
    expect(classifyAuthenticationProviderConfiguration({
      ONYX_AUTH_ISSUER: issuerUrl,
      ONYX_AUTH_AUDIENCE: audienceUri,
      ONYX_AUTH_JWKS_KEYS: JSON.stringify([rsaJwk]),
      ONYX_AUTH_SCOPE_SALT: "onyx-production-scope-salt-v1",
    })).toBe("AUTH_PROVIDER_AVAILABLE");
    expect(classifyAuthenticationProviderConfiguration({}, createTestAuthenticationProvider())).toBe("AUTH_PROVIDER_AVAILABLE");
  });

  it("classifies Google OAuth configuration for every bounded outcome without logging client ID, secret, or redirect URI", () => {
    const validRedirectUri = "https://onyx-alpha0.netlify.app/.netlify/functions/oauth-google-callback";
    const base = { ONYX_GOOGLE_CLIENT_ID: "id", ONYX_GOOGLE_CLIENT_SECRET: "secret" };

    expect(classifyGoogleOAuthConfiguration({})).toBe("GOOGLE_CLIENT_ID_MISSING");
    expect(classifyGoogleOAuthConfiguration({ ONYX_GOOGLE_CLIENT_ID: "id" })).toBe("GOOGLE_CLIENT_SECRET_MISSING");
    expect(classifyGoogleOAuthConfiguration(base)).toBe("GOOGLE_REDIRECT_URI_MISSING");
    expect(classifyGoogleOAuthConfiguration({ ...base, ONYX_GOOGLE_REDIRECT_URI: "" })).toBe("GOOGLE_REDIRECT_URI_MISSING");
    // 1. HTTP callback URI.
    expect(classifyGoogleOAuthConfiguration({ ...base, ONYX_GOOGLE_REDIRECT_URI: "http://onyx-alpha0.netlify.app/.netlify/functions/oauth-google-callback" })).toBe("GOOGLE_REDIRECT_URI_INVALID");
    // 2. Malformed URI.
    expect(classifyGoogleOAuthConfiguration({ ...base, ONYX_GOOGLE_REDIRECT_URI: "not-a-url" })).toBe("GOOGLE_REDIRECT_URI_INVALID");
    // 3. Unexpected hostname.
    expect(classifyGoogleOAuthConfiguration({ ...base, ONYX_GOOGLE_REDIRECT_URI: "https://attacker.example/.netlify/functions/oauth-google-callback" })).toBe("GOOGLE_REDIRECT_URI_INVALID");
    // 4. Expected hostname used as a suffix of another hostname.
    expect(classifyGoogleOAuthConfiguration({ ...base, ONYX_GOOGLE_REDIRECT_URI: "https://evil-onyx-alpha0.netlify.app/.netlify/functions/oauth-google-callback" })).toBe("GOOGLE_REDIRECT_URI_INVALID");
    expect(classifyGoogleOAuthConfiguration({ ...base, ONYX_GOOGLE_REDIRECT_URI: "https://onyx-alpha0.netlify.app.attacker.example/.netlify/functions/oauth-google-callback" })).toBe("GOOGLE_REDIRECT_URI_INVALID");
    // 5. Unexpected port.
    expect(classifyGoogleOAuthConfiguration({ ...base, ONYX_GOOGLE_REDIRECT_URI: "https://onyx-alpha0.netlify.app:8443/.netlify/functions/oauth-google-callback" })).toBe("GOOGLE_REDIRECT_URI_INVALID");
    // 6. Username or password in URL.
    expect(classifyGoogleOAuthConfiguration({ ...base, ONYX_GOOGLE_REDIRECT_URI: "https://user@onyx-alpha0.netlify.app/.netlify/functions/oauth-google-callback" })).toBe("GOOGLE_REDIRECT_URI_INVALID");
    expect(classifyGoogleOAuthConfiguration({ ...base, ONYX_GOOGLE_REDIRECT_URI: "https://user:pass@onyx-alpha0.netlify.app/.netlify/functions/oauth-google-callback" })).toBe("GOOGLE_REDIRECT_URI_INVALID");
    // 7. Incorrect callback pathname.
    expect(classifyGoogleOAuthConfiguration({ ...base, ONYX_GOOGLE_REDIRECT_URI: "https://onyx-alpha0.netlify.app/.netlify/functions/oauth-microsoft-callback" })).toBe("GOOGLE_REDIRECT_URI_INVALID");
    // 8. Additional pathname suffix.
    expect(classifyGoogleOAuthConfiguration({ ...base, ONYX_GOOGLE_REDIRECT_URI: "https://onyx-alpha0.netlify.app/.netlify/functions/oauth-google-callback/extra" })).toBe("GOOGLE_REDIRECT_URI_INVALID");
    // 9. Query string.
    expect(classifyGoogleOAuthConfiguration({ ...base, ONYX_GOOGLE_REDIRECT_URI: `${validRedirectUri}?next=/dashboard` })).toBe("GOOGLE_REDIRECT_URI_INVALID");
    // 10. Fragment.
    expect(classifyGoogleOAuthConfiguration({ ...base, ONYX_GOOGLE_REDIRECT_URI: `${validRedirectUri}#fragment` })).toBe("GOOGLE_REDIRECT_URI_INVALID");
    // 11. Empty redirect URI already covered above (GOOGLE_REDIRECT_URI_MISSING).

    // Positive: exactly the expected production callback destination is accepted.
    expect(classifyGoogleOAuthConfiguration({ ...base, ONYX_GOOGLE_REDIRECT_URI: validRedirectUri })).toBe("GOOGLE_OAUTH_CONFIGURATION_AVAILABLE");
    expect(classifyGoogleOAuthConfiguration({ ONYX_GOOGLE_CLIENT_ID: "id", ONYX_GOOGLE_CLIENT_SECRET: "secret", ONYX_GOOGLE_REDIRECT_URI: environment.ONYX_GOOGLE_REDIRECT_URI })).toBe("GOOGLE_OAUTH_CONFIGURATION_AVAILABLE");
  });

  it("reports a bounded, secret-free, and deterministic preflight result that only reports ready once every prerequisite is satisfied", () => {
    const incompletePreflight = getGoogleRuntimePreflight({});
    expect(incompletePreflight.ready).toBe(false);
    expect(incompletePreflight.runtimeContext).toBe("unknown");
    // 1 & 2. Every ready:false result includes a non-empty top-level reasonCode; missing key returns CREDENTIAL_KEY_MISSING once runtime context is production.
    expect(incompletePreflight.reasonCode).toBeTruthy();
    expect(incompletePreflight.reasonCode).toBe("INVALID_RUNTIME_CONTEXT");

    const missingKey = getGoogleRuntimePreflight({ ...prodEnvironment, ONYX_CREDENTIAL_ENCRYPTION_KEY: undefined });
    expect(missingKey.ready).toBe(false);
    expect(missingKey.reasonCode).toBe("CREDENTIAL_KEY_MISSING");

    // 3. Missing version.
    const missingVersion = getGoogleRuntimePreflight({ ...prodEnvironment, ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION: undefined });
    expect(missingVersion.reasonCode).toBe("CREDENTIAL_KEY_VERSION_MISSING");

    // 4. Invalid base64url.
    const invalidBase64Url = getGoogleRuntimePreflight({ ...prodEnvironment, ONYX_CREDENTIAL_ENCRYPTION_KEY: "not-base64url!!" });
    expect(invalidBase64Url.reasonCode).toBe("CREDENTIAL_KEY_NOT_STRICT_BASE64URL");

    // 5. Wrong decoded length.
    const wrongLength = getGoogleRuntimePreflight({ ...prodEnvironment, ONYX_CREDENTIAL_ENCRYPTION_KEY: Buffer.alloc(31).toString("base64url") });
    expect(wrongLength.reasonCode).toBe("CREDENTIAL_KEY_WRONG_DECODED_LENGTH");

    // 6. Preview key in production.
    const previewKeyInProduction = getGoogleRuntimePreflight({ ...prodEnvironment, ONYX_CREDENTIAL_PREVIEW_ENCRYPTION_KEY: productionKey });
    expect(previewKeyInProduction.reasonCode).toBe("PREVIEW_KEY_FORBIDDEN_IN_PRODUCTION");

    // 7. Invalid previous-ring JSON.
    const invalidPreviousRing = getGoogleRuntimePreflight({ ...prodEnvironment, ONYX_CREDENTIAL_PREVIOUS_KEY_RING: "{not json" });
    expect(invalidPreviousRing.reasonCode).toBe("PREVIOUS_KEY_RING_INVALID_JSON");

    // 8. Duplicate version.
    const duplicateVersion = getGoogleRuntimePreflight({ ...prodEnvironment, ONYX_CREDENTIAL_PREVIOUS_KEY_RING: JSON.stringify([{ key: productionKey, version: "v1" }]) });
    expect(duplicateVersion.reasonCode).toBe("DUPLICATE_KEY_VERSION");

    // 9. Authentication-provider failure returns its exact bounded reason.
    const missingIssuer = getGoogleRuntimePreflight(prodEnvironment);
    expect(missingIssuer.reasonCode).toBe("AUTH_ISSUER_MISSING");

    // 10. Google OAuth configuration failure returns its exact bounded reason.
    const missingRedirectUri = getGoogleRuntimePreflight({
      ...prodEnvironment,
      ONYX_GOOGLE_REDIRECT_URI: undefined,
      ONYX_AUTH_ISSUER: issuerUrl,
      ONYX_AUTH_AUDIENCE: audienceUri,
      ONYX_AUTH_JWKS_KEYS: JSON.stringify([rsaJwk]),
      ONYX_AUTH_SCOPE_SALT: "onyx-production-scope-salt-v1",
    });
    expect(missingRedirectUri.reasonCode).toBe("GOOGLE_REDIRECT_URI_MISSING");

    // 11. A valid complete preflight returns ready:true and reasonCode: GOOGLE_RUNTIME_READY.
    const completeEnvironment = {
      ...prodEnvironment,
      ONYX_AUTH_ISSUER: issuerUrl,
      ONYX_AUTH_AUDIENCE: audienceUri,
      ONYX_AUTH_JWKS_KEYS: JSON.stringify([rsaJwk]),
      ONYX_AUTH_SCOPE_SALT: "onyx-production-scope-salt-v1",
    };
    const readyPreflight = getGoogleRuntimePreflight(completeEnvironment);
    expect(readyPreflight.ready).toBe(true);
    expect(readyPreflight.reasonCode).toBe("GOOGLE_RUNTIME_READY");
    expect(readyPreflight.diagnostics.credentialKeyClassification).toBe("CREDENTIAL_KEY_CONFIGURATION_VALID");

    // 12. JSON.stringify(result) always retains reasonCode (never dropped as undefined).
    for (const result of [incompletePreflight, missingKey, missingVersion, invalidBase64Url, wrongLength, previewKeyInProduction, invalidPreviousRing, duplicateVersion, missingIssuer, missingRedirectUri, readyPreflight]) {
      expect(JSON.parse(JSON.stringify(result))).toHaveProperty("reasonCode");
      expect(JSON.parse(JSON.stringify(result)).reasonCode).toBe(result.reasonCode);
    }

    // 13. The serialized response contains no secret values.
    const serialized = JSON.stringify([incompletePreflight, missingKey, missingVersion, invalidBase64Url, wrongLength, previewKeyInProduction, invalidPreviousRing, duplicateVersion, missingIssuer, missingRedirectUri, readyPreflight]);
    expect(serialized).not.toContain(productionKey);
    expect(serialized).not.toContain("synthetic-client-secret");
  });

  it("14. keeps the browser-facing inactive response generic and unchanged regardless of the specific preflight failure reason", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const route = createGoogleRouteHandler(createGoogleStatusHandler, { ...prodEnvironment, ONYX_CREDENTIAL_PREVIOUS_KEY_RING: "{not json" });
    const response = await route({ httpMethod: "GET", headers: {} });
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toEqual({ status: "UNAVAILABLE", message: "Google Workspace is not active in this environment." });
    consoleSpy.mockRestore();
  });

  it("never returns secrets or raw errors to the browser and keeps Google connectors read-only", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);
    const secretEnvironment = { ...prodEnvironment, ONYX_GOOGLE_CLIENT_SECRET: "super-secret-client-secret-value", ONYX_CREDENTIAL_ENCRYPTION_KEY: "super-secret-key-value" };

    const route = createGoogleRouteHandler(createGoogleStatusHandler, secretEnvironment);
    const response = await route({ httpMethod: "GET", headers: {} });
    expect(response.statusCode).toBe(503);
    expect(JSON.parse(response.body)).toEqual({ status: "UNAVAILABLE", message: "Google Workspace is not active in this environment." });
    expect(response.body).not.toContain("super-secret-client-secret-value");
    expect(response.body).not.toContain("super-secret-key-value");

    expect(GOOGLE_OAUTH_SCOPES).toEqual([
      "openid",
      "https://www.googleapis.com/auth/calendar.events.readonly",
      "https://www.googleapis.com/auth/gmail.readonly",
      "https://www.googleapis.com/auth/drive.metadata.readonly",
    ]);
    expect(GOOGLE_OAUTH_SCOPES.every((scope) => !/write|modify|full|compose|send/i.test(scope))).toBe(true);

    consoleSpy.mockRestore();
  });
});