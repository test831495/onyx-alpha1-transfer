import { describe, expect, it } from "vitest";
import { deriveMicrosoftAuthority, resolveMicrosoftPublicConfig, resolveMicrosoftProviderHealthState, resolveRuntimeMicrosoftConfig } from "./microsoft-config";

describe("microsoft config normalization", () => {
  it("CONFIGURATION-001 resolves canonical ONYX_MS values", () => {
    const config = resolveMicrosoftPublicConfig({
      ONYX_MS_CLIENT_ID: "canonical-client",
      ONYX_MS_TENANT_ID: "canonical-tenant",
      ONYX_MS_REDIRECT_URI: "https://example.com/callback",
      ONYX_MS_AUTHORITY: "https://login.microsoftonline.com/canonical-tenant",
    });

    expect(config).toEqual({
      clientId: "canonical-client",
      tenantId: "canonical-tenant",
      redirectUri: "https://example.com/callback",
      authority: "https://login.microsoftonline.com/canonical-tenant",
    });
  });

  it("CONFIGURATION-002 maps compatibility aliases to runtime-safe values", () => {
    const config = resolveRuntimeMicrosoftConfig({
      ONYX_MS_CLIENT_ID: "canonical-client",
      ONYX_MS_TENANT_ID: "canonical-tenant",
      ONYX_MS_REDIRECT_URI: "https://example.com/callback",
      ONYX_MS_AUTHORITY: "https://login.microsoftonline.com/canonical-tenant",
    });

    expect(config).toEqual({
      VITE_MS_CLIENT_ID: "canonical-client",
      VITE_MS_TENANT_ID: "canonical-tenant",
      VITE_MS_REDIRECT_URI: "https://example.com/callback",
      VITE_MS_AUTHORITY: "https://login.microsoftonline.com/canonical-tenant",
    });
  });

  it("CONFIGURATION-003 rejects legacy MICROSOFT names for runtime resolution", () => {
    expect(() =>
      resolveMicrosoftPublicConfig({
        MICROSOFT_CLIENT_ID: "legacy-client",
        MICROSOFT_TENANT_ID: "common",
        MICROSOFT_CLIENT_SECRET: "legacy-secret",
      }),
    ).toThrow(/legacy|deprecated|MICROSOFT/i);
  });

  it("CONFIGURATION-004 prohibits client-secret references in browser runtime", () => {
    expect(() =>
      resolveRuntimeMicrosoftConfig({
        ONYX_MS_CLIENT_ID: "client",
        ONYX_MS_TENANT_ID: "tenant",
        ONYX_MS_REDIRECT_URI: "https://example.com",
        VITE_MS_CLIENT_SECRET: "not-allowed",
      }),
    ).toThrow(/secret|client secret|browser/i);
  });

  it("CONFIGURATION-005 aligns provider health state with config state", () => {
    const health = resolveMicrosoftProviderHealthState({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant",
      ONYX_MS_REDIRECT_URI: "https://example.com/callback",
    });

    expect(health.state).toBe("configured");
    expect(health.missing).toEqual([]);
  });

  it("CONFIGURATION-006 detects missing configuration", () => {
    const health = resolveMicrosoftProviderHealthState({
      ONYX_MS_CLIENT_ID: "client",
    });

    expect(health.state).toBe("unconfigured");
    expect(health.missing).toContain("ONYX_MS_TENANT_ID");
  });

  it("CONFIGURATION-007 detects partial configuration", () => {
    const config = resolveMicrosoftPublicConfig({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant",
    });

    expect(config).toEqual({
      clientId: "client",
      tenantId: "tenant",
      redirectUri: "",
      authority: "https://login.microsoftonline.com/tenant",
    });
  });

  it("CONFIGURATION-008 resolves configured state when canonical values are present", () => {
    const state = resolveMicrosoftProviderHealthState({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant",
      ONYX_MS_REDIRECT_URI: "https://example.com",
      ONYX_MS_AUTHORITY: "https://login.microsoftonline.com/common",
    });

    expect(state.state).toBe("configured");
  });

  it("CONFIGURATION-009 preserves regression behavior for a missing runtime bridge", () => {
    expect(() => resolveMicrosoftPublicConfig({})).toThrow();
    expect(deriveMicrosoftAuthority("tenant-id")).toBe("https://login.microsoftonline.com/tenant-id");
  });
});
