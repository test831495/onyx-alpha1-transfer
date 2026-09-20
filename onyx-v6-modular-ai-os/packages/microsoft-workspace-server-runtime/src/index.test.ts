import { describe, expect, it } from "vitest";
import { createMicrosoftServerRuntime, readMicrosoftServerConfig } from "./index";

const environment = {
  CONTEXT: "test",
  NODE_ENV: "test",
  ONYX_MS_CLIENT_ID: "synthetic-client-id",
  ONYX_MS_CLIENT_SECRET: "synthetic-client-secret",
  ONYX_MS_TENANT_ID: "synthetic-tenant-id",
  ONYX_MS_REDIRECT_URI: "https://onyx-alpha0.netlify.app/.netlify/functions/oauth-microsoft-callback",
};

const stubRepository = {
  get: async () => undefined,
  issueCsrf: async () => undefined,
  consumeCsrf: async () => true,
  revoke: async () => undefined,
} as never;

const stubCredentialStore = {
  findActive: async () => undefined,
  create: async () => { throw new Error("not implemented"); },
  delete: async () => undefined,
} as never;

const stubAuthority = { verify: async () => undefined, issue: async () => "" };

describe("Microsoft server runtime foundation", () => {
  it("reads server configuration and rejects incomplete values", () => {
    expect(readMicrosoftServerConfig(environment)).toMatchObject({ clientId: "synthetic-client-id", tenantId: "synthetic-tenant-id" });
    expect(() => readMicrosoftServerConfig({ ...environment, ONYX_MS_CLIENT_ID: undefined })).toThrow();
    expect(() => readMicrosoftServerConfig({ ...environment, ONYX_MS_REDIRECT_URI: "http://insecure" })).toThrow();
  });

  it("defaults runtime activation to DISABLED", () => {
    const runtime = createMicrosoftServerRuntime({ authority: stubAuthority, sessionRepository: stubRepository, credentialStore: stubCredentialStore, environment });
    expect(runtime.activation).toBe("DISABLED");
    expect(runtime.policy.credentialOperationsEnabled).toBe(false);
  });

  it("keeps credentialOperationsEnabled false even when explicitly enabled for test construction", () => {
    const runtime = createMicrosoftServerRuntime({ activation: "ENABLED_FOR_TEST", authority: stubAuthority, sessionRepository: stubRepository, credentialStore: stubCredentialStore, environment });
    expect(runtime.activation).toBe("ENABLED_FOR_TEST");
    expect(runtime.policy.credentialOperationsEnabled).toBe(false);
  });

  it("denies an unknown runtime context", () => {
    expect(() => createMicrosoftServerRuntime({ authority: stubAuthority, sessionRepository: stubRepository, credentialStore: stubCredentialStore, environment: { ...environment, CONTEXT: "deploy-preview", NODE_ENV: "production" } })).toThrow("Microsoft runtime context denied.");
  });
});
