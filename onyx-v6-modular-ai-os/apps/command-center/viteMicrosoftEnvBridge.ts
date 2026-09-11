export const FORBIDDEN_BROWSER_ENV_KEYS = [
  "MICROSOFT_CLIENT_SECRET",
  "ONYX_MS_CLIENT_SECRET",
  "VITE_MS_CLIENT_SECRET",
] as const;

// Only these exact names are bridged into import.meta.env; no other ONYX_* variable is exposed.
export const APPROVED_MICROSOFT_PUBLIC_ENV_KEYS = [
  "ONYX_MS_CLIENT_ID",
  "ONYX_MS_TENANT_ID",
  "ONYX_MS_REDIRECT_URI",
  "ONYX_MS_AUTHORITY",
  "ONYX_AUTH_CLIENT_ID",
  "ONYX_AUTH_SCOPE",
  "ONYX_AUTH_AUTHORITY",
] as const;

export function ensureNoForbiddenBrowserEnv(env: Record<string, string | undefined>): void {
  const forbidden = FORBIDDEN_BROWSER_ENV_KEYS.filter((key) => {
    const value = env[key];
    return typeof value === "string" && value.trim().length > 0;
  });

  if (forbidden.length > 0) {
    throw new Error(
      `Forbidden secret-bearing Microsoft environment variables detected: ${forbidden.join(", ")}. Browser builds must fail closed.`,
    );
  }
}

export function buildApprovedMicrosoftPublicDefine(env: Record<string, string | undefined>): Record<string, string> {
  const define: Record<string, string> = {};
  for (const key of APPROVED_MICROSOFT_PUBLIC_ENV_KEYS) {
    define[`import.meta.env.${key}`] = JSON.stringify(env[key] ?? "");
  }
  return define;
}

export interface MicrosoftRuntimePublicEnv {
  ONYX_MS_CLIENT_ID: string;
  ONYX_MS_TENANT_ID: string;
  ONYX_MS_REDIRECT_URI: string;
  ONYX_MS_AUTHORITY: string;
  ONYX_AUTH_CLIENT_ID?: string;
  ONYX_AUTH_SCOPE?: string;
  ONYX_AUTH_AUTHORITY?: string;
}

// Static property references so Vite's `define` can replace them at build time; never spread or index import.meta.env.
export function readMicrosoftRuntimeEnv(overrides?: MicrosoftRuntimePublicEnv): MicrosoftRuntimePublicEnv {
  if (overrides) {
    return {
      ONYX_MS_CLIENT_ID: overrides.ONYX_MS_CLIENT_ID,
      ONYX_MS_TENANT_ID: overrides.ONYX_MS_TENANT_ID,
      ONYX_MS_REDIRECT_URI: overrides.ONYX_MS_REDIRECT_URI,
      ONYX_MS_AUTHORITY: overrides.ONYX_MS_AUTHORITY,
      ONYX_AUTH_CLIENT_ID: overrides.ONYX_AUTH_CLIENT_ID ?? "",
      ONYX_AUTH_SCOPE: overrides.ONYX_AUTH_SCOPE ?? "",
      ONYX_AUTH_AUTHORITY: overrides.ONYX_AUTH_AUTHORITY ?? "",
    };
  }
  return {
    ONYX_MS_CLIENT_ID: import.meta.env.ONYX_MS_CLIENT_ID ?? "",
    ONYX_MS_TENANT_ID: import.meta.env.ONYX_MS_TENANT_ID ?? "",
    ONYX_MS_REDIRECT_URI: import.meta.env.ONYX_MS_REDIRECT_URI ?? "",
    ONYX_MS_AUTHORITY: import.meta.env.ONYX_MS_AUTHORITY ?? "",
    ONYX_AUTH_CLIENT_ID: import.meta.env.ONYX_AUTH_CLIENT_ID ?? "",
    ONYX_AUTH_SCOPE: import.meta.env.ONYX_AUTH_SCOPE ?? "",
    ONYX_AUTH_AUTHORITY: import.meta.env.ONYX_AUTH_AUTHORITY ?? "",
  };
}
