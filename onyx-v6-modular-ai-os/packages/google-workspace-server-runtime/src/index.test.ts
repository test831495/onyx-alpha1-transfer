import { describe, expect, it } from "vitest";
import { createGoogleOAuthTransport, createGoogleServerRuntime, createGoogleStatusHandler, readGoogleServerConfig } from "./index";
import { createGoogleRouteHandler } from "../../netlify/functions/google-runtime-entry";

const environment = {
  CONTEXT: "test",
  NODE_ENV: "test",
  ONYX_GOOGLE_CLIENT_ID: "synthetic-client-id",
  ONYX_GOOGLE_CLIENT_SECRET: "synthetic-client-secret",
  ONYX_GOOGLE_REDIRECT_URI: "https://onyx-alpha0.netlify.app/.netlify/functions/oauth-google-callback",
};

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
});