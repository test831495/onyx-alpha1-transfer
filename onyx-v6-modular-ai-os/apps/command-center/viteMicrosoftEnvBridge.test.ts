import { describe, expect, it } from "vitest";
import {
  APPROVED_MICROSOFT_PUBLIC_ENV_KEYS,
  buildApprovedMicrosoftPublicDefine,
  ensureNoForbiddenBrowserEnv,
} from "./viteMicrosoftEnvBridge";

describe("Microsoft runtime config visibility bridge", () => {
  it("bridges ONYX_MS_CLIENT_ID into import.meta.env", () => {
    const define = buildApprovedMicrosoftPublicDefine({ ONYX_MS_CLIENT_ID: "client" });
    expect(define["import.meta.env.ONYX_MS_CLIENT_ID"]).toBe(JSON.stringify("client"));
  });

  it("bridges ONYX_MS_TENANT_ID into import.meta.env", () => {
    const define = buildApprovedMicrosoftPublicDefine({ ONYX_MS_TENANT_ID: "tenant" });
    expect(define["import.meta.env.ONYX_MS_TENANT_ID"]).toBe(JSON.stringify("tenant"));
  });

  it("bridges ONYX_MS_REDIRECT_URI into import.meta.env", () => {
    const define = buildApprovedMicrosoftPublicDefine({ ONYX_MS_REDIRECT_URI: "https://example.com/callback" });
    expect(define["import.meta.env.ONYX_MS_REDIRECT_URI"]).toBe(JSON.stringify("https://example.com/callback"));
  });

  it("bridges optional ONYX_MS_AUTHORITY into import.meta.env", () => {
    const define = buildApprovedMicrosoftPublicDefine({ ONYX_MS_AUTHORITY: "https://login.microsoftonline.com/common" });
    expect(Object.keys(define)).toEqual(
      APPROVED_MICROSOFT_PUBLIC_ENV_KEYS.map((key) => `import.meta.env.${key}`),
    );
    expect(define["import.meta.env.ONYX_MS_AUTHORITY"]).toBe(
      JSON.stringify("https://login.microsoftonline.com/common"),
    );
  });

  it("does not bridge arbitrary ONYX_* variables", () => {
    const define = buildApprovedMicrosoftPublicDefine({ ONYX_UNRELATED_SETTING: "value" });
    expect(Object.keys(define)).toEqual(
      APPROVED_MICROSOFT_PUBLIC_ENV_KEYS.map((key) => `import.meta.env.${key}`),
    );
    expect(define["import.meta.env.ONYX_UNRELATED_SETTING"]).toBeUndefined();
  });

  it("does not bridge ONYX_MS_CLIENT_SECRET even if present", () => {
    const define = buildApprovedMicrosoftPublicDefine({ ONYX_MS_CLIENT_SECRET: "secret-value" });
    expect(Object.values(define).some((value) => value.includes("secret-value"))).toBe(false);
  });

  it("fails closed when ONYX_MS_CLIENT_SECRET is present", () => {
    expect(() => ensureNoForbiddenBrowserEnv({ ONYX_MS_CLIENT_SECRET: "secret-value" })).toThrow(
      /forbidden|secret/i,
    );
  });

  it("fails closed when VITE_MS_CLIENT_SECRET is present", () => {
    expect(() => ensureNoForbiddenBrowserEnv({ VITE_MS_CLIENT_SECRET: "secret-value" })).toThrow(
      /forbidden|secret/i,
    );
  });

  it("does not throw when no forbidden secret keys are present", () => {
    expect(() =>
      ensureNoForbiddenBrowserEnv({ ONYX_MS_CLIENT_ID: "client", ONYX_MS_TENANT_ID: "tenant" }),
    ).not.toThrow();
  });
});
