export const MICROSOFT_PUBLIC_CONFIG_KEYS = [
  "ONYX_MS_CLIENT_ID",
  "ONYX_MS_TENANT_ID",
  "ONYX_MS_REDIRECT_URI",
  "ONYX_MS_AUTHORITY",
] as const;

export const MICROSOFT_RUNTIME_COMPATIBILITY_KEYS = {
  clientId: "VITE_MS_CLIENT_ID",
  tenantId: "VITE_MS_TENANT_ID",
  redirectUri: "VITE_MS_REDIRECT_URI",
  authority: "VITE_MS_AUTHORITY",
} as const;

export const LEGACY_MICROSOFT_KEYS = [
  "MICROSOFT_CLIENT_ID",
  "MICROSOFT_CLIENT_SECRET",
  "MICROSOFT_TENANT_ID",
] as const;

export const FORBIDDEN_SECRET_KEYS = [
  "MICROSOFT_CLIENT_SECRET",
  "ONYX_MS_CLIENT_SECRET",
  "VITE_MS_CLIENT_SECRET",
] as const;

export type MicrosoftPublicConfig = {
  clientId: string;
  tenantId: string;
  redirectUri: string;
  authority: string;
};

export type MicrosoftProviderHealthState = {
  provider: "microsoft";
  state: "disabled" | "unconfigured" | "configured";
  missing: string[];
  credentialDetected: boolean;
  diagnostic: string;
};

const CANONICAL_PUBLIC_NAMES = {
  clientId: "ONYX_MS_CLIENT_ID",
  tenantId: "ONYX_MS_TENANT_ID",
  redirectUri: "ONYX_MS_REDIRECT_URI",
  authority: "ONYX_MS_AUTHORITY",
} as const satisfies Record<keyof typeof MICROSOFT_RUNTIME_COMPATIBILITY_KEYS, string>;

function readString(input: Record<string, unknown>, key: string): string {
  const value = input[key];
  return typeof value === "string" ? value.trim() : "";
}

function ensureNoLegacyOrSecret(input: Record<string, unknown>): void {
  const legacyUsed = LEGACY_MICROSOFT_KEYS.filter((key) => readString(input, key).length > 0);
  if (legacyUsed.length > 0) {
    throw new Error(
      `Deprecated legacy MICROSOFT_* names are not allowed in the browser runtime: ${legacyUsed.join(", ")}`,
    );
  }

  const forbiddenSecret = FORBIDDEN_SECRET_KEYS.filter((key) => readString(input, key).length > 0);
  if (forbiddenSecret.length > 0) {
    throw new Error(
      `Client-secret values are not permitted in browser runtime configuration: ${forbiddenSecret.join(", ")}`,
    );
  }
}

function readCanonicalOrCompatibility(input: Record<string, unknown>, field: keyof typeof MICROSOFT_RUNTIME_COMPATIBILITY_KEYS): string {
  const canonicalKey = CANONICAL_PUBLIC_NAMES[field];
  const canonicalValue = readString(input, canonicalKey);
  const compatibilityKey = MICROSOFT_RUNTIME_COMPATIBILITY_KEYS[field];
  const compatibilityValue = readString(input, compatibilityKey);

  if (canonicalValue && compatibilityValue && canonicalValue !== compatibilityValue) {
    throw new Error(
      `Conflicting Microsoft configuration values for ${canonicalKey} and ${compatibilityKey}.`,
    );
  }

  if (canonicalValue) {
    return canonicalValue;
  }

  return compatibilityValue;
}

export function deriveMicrosoftAuthority(tenantId: string): string {
  const normalizedTenant = tenantId.trim();
  if (!normalizedTenant) {
    return "";
  }
  return `https://login.microsoftonline.com/${normalizedTenant}`;
}

export function resolveMicrosoftPublicConfig(input: Record<string, unknown> = {}): MicrosoftPublicConfig {
  if (Object.keys(input).length === 0) {
    throw new Error("Microsoft public configuration is missing.");
  }

  ensureNoLegacyOrSecret(input);

  const clientId = readCanonicalOrCompatibility(input, "clientId");
  const tenantId = readCanonicalOrCompatibility(input, "tenantId");
  const redirectUri = readCanonicalOrCompatibility(input, "redirectUri");
  const explicitAuthority = readCanonicalOrCompatibility(input, "authority");
  const authority = explicitAuthority || deriveMicrosoftAuthority(tenantId);

  return Object.freeze({
    clientId,
    tenantId,
    redirectUri,
    authority,
  });
}

export function resolveRuntimeMicrosoftConfig(input: Record<string, unknown> = {}): Record<string, string> {
  ensureNoLegacyOrSecret(input);

  const config = resolveMicrosoftPublicConfig(input);
  const runtimeConfig = {
    VITE_MS_CLIENT_ID: config.clientId,
    VITE_MS_TENANT_ID: config.tenantId,
    VITE_MS_REDIRECT_URI: config.redirectUri,
    VITE_MS_AUTHORITY: config.authority,
  };

  return Object.freeze(runtimeConfig);
}

export function resolveMicrosoftProviderHealthState(
  input: Record<string, unknown> = {},
  enabled = true,
): MicrosoftProviderHealthState {
  if (!enabled) {
    return Object.freeze({
      provider: "microsoft",
      state: "disabled",
      missing: [],
      credentialDetected: false,
      diagnostic: "Microsoft provider is disabled by configuration.",
    });
  }

  const config = resolveMicrosoftPublicConfig(input);
  const required = [
    ["ONYX_MS_CLIENT_ID", config.clientId],
    ["ONYX_MS_TENANT_ID", config.tenantId],
    ["ONYX_MS_REDIRECT_URI", config.redirectUri],
  ] as const;

  const missing = required
    .filter(([, value]) => !value || value.trim().length === 0)
    .map(([key]) => key);

  const state: MicrosoftProviderHealthState["state"] = missing.length === 0 ? "configured" : "unconfigured";

  return Object.freeze({
    provider: "microsoft",
    state,
    missing,
    credentialDetected: false,
    diagnostic:
      missing.length === 0
        ? "Microsoft public configuration is present and ready for runtime alignment."
        : `Missing required Microsoft public configuration values: ${missing.join(", ")}.`,
  });
}
