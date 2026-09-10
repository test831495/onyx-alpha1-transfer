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

  it("CONFIGURATION-010 fail-closes on secret-bearing browser env names", () => {
    expect(() =>
      resolveRuntimeMicrosoftConfig({
        ONYX_MS_CLIENT_ID: "client",
        ONYX_MS_TENANT_ID: "tenant",
        ONYX_MS_REDIRECT_URI: "https://example.com",
        ONYX_MS_CLIENT_SECRET: "should-fail",
      }),
    ).toThrow(/secret|forbidden|browser/i);
  });

  it("CONFIGURATION-011 derives authority from tenant when authority is absent", () => {
    const config = resolveMicrosoftPublicConfig({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant-id",
      ONYX_MS_REDIRECT_URI: "https://example.com/callback",
    });

    expect(config.authority).toBe("https://login.microsoftonline.com/tenant-id");
    expect(resolveMicrosoftProviderHealthState({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant-id",
      ONYX_MS_REDIRECT_URI: "https://example.com/callback",
    }).state).toBe("configured");
  });

  it("CONFIGURATION-012 returns deterministic unconfigured state for missing provider-health input", () => {
    expect(() => resolveMicrosoftProviderHealthState()).not.toThrow();
    expect(() => resolveMicrosoftProviderHealthState(undefined)).not.toThrow();
    expect(() => resolveMicrosoftProviderHealthState({})).not.toThrow();

    const emptyCases = [
      resolveMicrosoftProviderHealthState(),
      resolveMicrosoftProviderHealthState(undefined),
      resolveMicrosoftProviderHealthState({}),
    ];

    for (const state of emptyCases) {
      expect(state.provider).toBe("microsoft");
      expect(state.state).toBe("unconfigured");
      expect(state.credentialDetected).toBe(false);
      expect(state.missing).toEqual([
        "ONYX_MS_CLIENT_ID",
        "ONYX_MS_TENANT_ID",
        "ONYX_MS_REDIRECT_URI",
      ]);
      expect(state.missing).not.toContain("ONYX_MS_AUTHORITY");
      expect(state.diagnostic).toBe("Microsoft public configuration is missing.");
      expect(Object.isFrozen(state)).toBe(true);
      expect(Object.isFrozen(state.missing)).toBe(true);
    }
  });

  it("CONFIGURATION-013 classifies partial and complete provider health states correctly", () => {
    const partial = resolveMicrosoftProviderHealthState({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant",
    });

    expect(partial.state).toBe("unconfigured");
    expect(partial.missing).toEqual(["ONYX_MS_REDIRECT_URI"]);
    expect(partial.missing).not.toContain("ONYX_MS_AUTHORITY");

    const configuredWithoutAuthority = resolveMicrosoftProviderHealthState({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant",
      ONYX_MS_REDIRECT_URI: "https://example.com/callback",
    });

    expect(configuredWithoutAuthority.state).toBe("configured");
    expect(configuredWithoutAuthority.missing).toEqual([]);

    const configuredWithAuthority = resolveMicrosoftProviderHealthState({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant",
      ONYX_MS_REDIRECT_URI: "https://example.com/callback",
      ONYX_MS_AUTHORITY: "https://login.microsoftonline.com/tenant",
    });

    expect(configuredWithAuthority.state).toBe("configured");
    expect(configuredWithAuthority.missing).toEqual([]);
  });

  it("CONFIGURATION-014 keeps authority optional and preserves explicit values", () => {
    const derived = resolveMicrosoftPublicConfig({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant-id",
      ONYX_MS_REDIRECT_URI: "https://example.com/callback",
    });

    expect(derived.authority).toBe("https://login.microsoftonline.com/tenant-id");

    const explicit = resolveMicrosoftPublicConfig({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant-id",
      ONYX_MS_REDIRECT_URI: "https://example.com/callback",
      ONYX_MS_AUTHORITY: "https://login.microsoftonline.com/common",
    });

    expect(explicit.authority).toBe("https://login.microsoftonline.com/common");
    expect(resolveMicrosoftProviderHealthState({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant-id",
      ONYX_MS_REDIRECT_URI: "https://example.com/callback",
    }).missing).toEqual([]);
    expect(resolveMicrosoftProviderHealthState({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant-id",
      ONYX_MS_REDIRECT_URI: "https://example.com/callback",
    }).state).toBe("configured");
  });

  it("CONFIGURATION-015 treats secret-bearing inputs as non-authenticated public configuration only", () => {
    const health = resolveMicrosoftProviderHealthState({
      ONYX_MS_CLIENT_ID: "client",
      ONYX_MS_TENANT_ID: "tenant",
      ONYX_MS_REDIRECT_URI: "https://example.com/callback",
      VITE_MS_CLIENT_SECRET: "should-not-authenticate",
    });

    expect(health.state).toBe("configured");
    expect(health.credentialDetected).toBe(false);
    expect(health.missing).toEqual([]);
    expect(health.diagnostic).toBe("Microsoft public configuration is available.");
  });
});
