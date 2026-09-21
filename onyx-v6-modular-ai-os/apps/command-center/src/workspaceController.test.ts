import{describe,expect,it,vi}from"vitest";import{authenticatedFunctionFetch,connectMicrosoftMail,disconnectedWorkspaceSnapshot,loadMicrosoftMailMessagesWithDiagnostic,resolveMicrosoftRedirectUri,resolveOnyxServerAuthorityScope,runGoogleWorkspaceActionWithClient}from"./workspaceController";
import { MicrosoftWorkspaceConnector, resolveRuntimeMicrosoftConfig } from "@onyx/workspace-connectors";
import { readMicrosoftRuntimeEnv } from "../viteMicrosoftEnvBridge";
import { readFileSync } from "node:fs";
describe("workspace foundation",()=>{it("declares all providers",()=>expect(disconnectedWorkspaceSnapshot().providers.map(v=>v.provider)).toEqual(["microsoft","google","yahoo"]));it("keeps planned provider capabilities disabled while presenting friendly statuses",()=>{const snapshot=disconnectedWorkspaceSnapshot();expect(snapshot.providers.filter(v=>v.provider!=="microsoft").flatMap(v=>v.capabilities).every(v=>!v.enabled)).toBe(true);expect(snapshot.providers.find(v=>v.provider==="microsoft")?.state).toBe("unconfigured");expect(snapshot.providers.map(v=>v.label)).toContain("Microsoft 365");expect(snapshot.providers.map(v=>v.label)).toContain("Google");expect(snapshot.providers.map(v=>v.label)).toContain("Yahoo");});});

it("exports the non-UI Microsoft Mail foundation projection", () => {
  expect(typeof connectMicrosoftMail).toBe("function");
  expect(typeof loadMicrosoftMailMessagesWithDiagnostic).toBe("function");
});

describe("Microsoft redirect ownership", () => {
  it("keeps preview authentication on the current preview origin", () => {
    expect(resolveMicrosoftRedirectUri("https://deploy-preview-103--onyx-alpha0.netlify.app", "https://onyx-alpha0.netlify.app/microsoft-callback")).toBe("https://deploy-preview-103--onyx-alpha0.netlify.app");
  });

  it("preserves the approved configured production redirect on production", () => {
    expect(resolveMicrosoftRedirectUri("https://onyx-alpha0.netlify.app", "https://onyx-alpha0.netlify.app/microsoft-callback")).toBe("https://onyx-alpha0.netlify.app/microsoft-callback");
  });

  it("falls back to the current origin when no redirect is configured", () => {
    expect(resolveMicrosoftRedirectUri("http://localhost:5173", "https://onyx-alpha0.netlify.app/microsoft-callback")).toBe("http://localhost:5173");
  });

  it("does not treat a non-approved preview hostname as a preview origin", () => {
    expect(resolveMicrosoftRedirectUri("https://deploy-preview-103--other-site.netlify.app", "https://onyx-alpha0.netlify.app/microsoft-callback")).toBe("https://onyx-alpha0.netlify.app/microsoft-callback");
  });
});

it("clears Mail trace before disconnect can reject", () => {
  const source = readFileSync(new URL("./App.tsx", import.meta.url), "utf8");
  const handlerStart = source.indexOf("onWorkspaceDisconnect:");
  const clearIndex = source.indexOf("setMailRuntimeTrace(undefined)", handlerStart);
  const disconnectIndex = source.indexOf("await disconnectMicrosoft()", handlerStart);
  expect(handlerStart).toBeGreaterThanOrEqual(0);
  expect(clearIndex).toBeGreaterThan(handlerStart);
  expect(clearIndex).toBeLessThan(disconnectIndex);
});

describe("Microsoft runtime config factory (production consumer path)", () => {
  const browserOrigin = "http://localhost:5200";

  function connectorFor(env: Parameters<typeof readMicrosoftRuntimeEnv>[0]) {
    const runtimeEnv = readMicrosoftRuntimeEnv(env);
    const runtimeConfig = resolveRuntimeMicrosoftConfig({
      ONYX_MS_CLIENT_ID: runtimeEnv.ONYX_MS_CLIENT_ID,
      ONYX_MS_TENANT_ID: runtimeEnv.ONYX_MS_TENANT_ID,
      ONYX_MS_REDIRECT_URI: runtimeEnv.ONYX_MS_REDIRECT_URI || browserOrigin,
      ONYX_MS_AUTHORITY: runtimeEnv.ONYX_MS_AUTHORITY,
    });
    return new MicrosoftWorkspaceConnector({
      clientId: runtimeConfig.VITE_MS_CLIENT_ID,
      tenantId: runtimeConfig.VITE_MS_TENANT_ID,
      authority: runtimeConfig.VITE_MS_AUTHORITY,
      redirectUri: runtimeConfig.VITE_MS_REDIRECT_URI,
    });
  }

  it("Test A: becomes configured when required public values are available", () => {
    const connector = connectorFor({
      ONYX_MS_CLIENT_ID: "test-client",
      ONYX_MS_TENANT_ID: "test-tenant",
      ONYX_MS_REDIRECT_URI: "https://example.invalid/microsoft-callback",
      ONYX_MS_AUTHORITY: "",
    });

    expect(connector.configured).toBe(true);
  });

  it("Test B: preserves an explicit authority alongside the required values", () => {
    const connector = connectorFor({
      ONYX_MS_CLIENT_ID: "test-client",
      ONYX_MS_TENANT_ID: "test-tenant",
      ONYX_MS_REDIRECT_URI: "https://example.invalid/microsoft-callback",
      ONYX_MS_AUTHORITY: "https://login.microsoftonline.com/test-tenant",
    });

    expect(connector.configured).toBe(true);
  });

  it("Test C: derives authority from tenant when authority is absent", () => {
    const runtimeEnv = readMicrosoftRuntimeEnv({
      ONYX_MS_CLIENT_ID: "test-client",
      ONYX_MS_TENANT_ID: "test-tenant",
      ONYX_MS_REDIRECT_URI: "https://example.invalid/microsoft-callback",
      ONYX_MS_AUTHORITY: "",
    });
    const runtimeConfig = resolveRuntimeMicrosoftConfig({
      ONYX_MS_CLIENT_ID: runtimeEnv.ONYX_MS_CLIENT_ID,
      ONYX_MS_TENANT_ID: runtimeEnv.ONYX_MS_TENANT_ID,
      ONYX_MS_REDIRECT_URI: runtimeEnv.ONYX_MS_REDIRECT_URI || browserOrigin,
      ONYX_MS_AUTHORITY: runtimeEnv.ONYX_MS_AUTHORITY,
    });

    expect(runtimeConfig.VITE_MS_AUTHORITY).toBe("https://login.microsoftonline.com/test-tenant");
  });

  it("Test D: remains unconfigured when client ID is absent", () => {
    const connector = connectorFor({
      ONYX_MS_CLIENT_ID: "",
      ONYX_MS_TENANT_ID: "test-tenant",
      ONYX_MS_REDIRECT_URI: "https://example.invalid/microsoft-callback",
      ONYX_MS_AUTHORITY: "",
    });

    expect(connector.configured).toBe(false);
  });

  it("Test E: remains unconfigured when tenant ID is absent", () => {
    const connector = connectorFor({
      ONYX_MS_CLIENT_ID: "test-client",
      ONYX_MS_TENANT_ID: "",
      ONYX_MS_REDIRECT_URI: "https://example.invalid/microsoft-callback",
      ONYX_MS_AUTHORITY: "",
    });

    expect(connector.configured).toBe(false);
  });

  it("Test F: falls back to the browser origin and stays configured when redirect URI is absent", () => {
    const connector = connectorFor({
      ONYX_MS_CLIENT_ID: "test-client",
      ONYX_MS_TENANT_ID: "test-tenant",
      ONYX_MS_REDIRECT_URI: "",
      ONYX_MS_AUTHORITY: "",
    });

    expect(connector.configured).toBe(true);
  });

  it("Test G: remains unconfigured with no approved values available", () => {
    const connector = connectorFor({
      ONYX_MS_CLIENT_ID: "",
      ONYX_MS_TENANT_ID: "",
      ONYX_MS_REDIRECT_URI: "",
      ONYX_MS_AUTHORITY: "",
    });

    expect(connector.configured).toBe(false);
    expect(connector.snapshot().state).toBe("unconfigured");
  });
});

describe("Google ONYX server session client", () => {
  const runtimeEnv = { ONYX_AUTH_SCOPE: "api://onyx-server-authority/account.preference.readwrite" };

  it("uses the configured ONYX Server Authority scope without Microsoft Graph profile scopes", async () => {
    const getAccessToken = vi.fn().mockResolvedValue("onyx-server-token");
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true }), { status: 200 }));

    await authenticatedFunctionFetch("/.netlify/functions/google-workspace-status", { method: "GET" }, { fetcher, getAccessToken, runtimeEnv });

    expect(getAccessToken).toHaveBeenCalledWith(["api://onyx-server-authority/account.preference.readwrite"], { includeProfileScopes: false });
    const request = fetcher.mock.calls[0]![1] as RequestInit;
    expect(request.credentials).toBe("same-origin");
    expect(new Headers(request.headers).get("authorization")).toBe("Bearer onyx-server-token");
    expect(JSON.stringify(fetcher.mock.calls)).not.toContain("graph.microsoft.com");
  });

  it("fails closed when no ONYX Server Authority scope is configured", () => {
    expect(() => resolveOnyxServerAuthorityScope({ ONYX_AUTH_SCOPE: "" })).toThrow("ONYX Server Authority scope is not configured.");
  });

  it("gets csrf and initiate with Authorization before redirecting to Google", async () => {
    const assign = vi.fn();
    vi.stubGlobal("window", { location: { assign } });
    const getAccessToken = vi.fn().mockResolvedValue("onyx-server-token");
    const fetcher = vi.fn()
      .mockResolvedValueOnce(new Response(JSON.stringify({ csrfToken: "csrf" }), { status: 200 }))
      .mockResolvedValueOnce(new Response(JSON.stringify({ authorizationUrl: "https://accounts.google.com/o/oauth2/v2/auth?state=server-state" }), { status: 200 }));

    await runGoogleWorkspaceActionWithClient("connect", { fetcher, getAccessToken, runtimeEnv, randomUUID: () => "idempotency" });

    expect(fetcher).toHaveBeenNthCalledWith(1, "/.netlify/functions/google-csrf", expect.objectContaining({ method: "GET", credentials: "same-origin" }));
    expect(new Headers((fetcher.mock.calls[0]![1] as RequestInit).headers).get("authorization")).toBe("Bearer onyx-server-token");
    expect(fetcher).toHaveBeenNthCalledWith(2, "/.netlify/functions/oauth-google-initiate", expect.objectContaining({ method: "POST", credentials: "same-origin" }));
    const initiate = fetcher.mock.calls[1]![1] as RequestInit;
    expect(new Headers(initiate.headers).get("authorization")).toBe("Bearer onyx-server-token");
    expect(new Headers(initiate.headers).get("idempotency-key")).toBe("idempotency");
    expect(assign).toHaveBeenCalledWith("https://accounts.google.com/o/oauth2/v2/auth?state=server-state");
    expect(JSON.stringify(fetcher.mock.calls.map(([url]) => url))).not.toContain("onyx-server-token");
    vi.unstubAllGlobals();
  });

  it("attempts silent token first, invokes existing sign-in on interaction-required, and retries once", async () => {
    const getAccessToken = vi.fn()
      .mockRejectedValueOnce(Object.assign(new Error("interaction required"), { errorCode: "interaction_required" }))
      .mockResolvedValueOnce("onyx-server-token");
    const interactiveSignIn = vi.fn().mockResolvedValue(undefined);
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "OK" }), { status: 200 }));

    await authenticatedFunctionFetch("/.netlify/functions/google-workspace-status", { method: "GET" }, { fetcher, getAccessToken, interactiveSignIn, runtimeEnv });

    expect(getAccessToken).toHaveBeenCalledTimes(2);
    expect(interactiveSignIn).toHaveBeenCalledTimes(1);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("starts ONYX sign-in when no account exists and retries the original request once", async () => {
    const getAccessToken = vi.fn()
      .mockRejectedValueOnce(new Error("Microsoft workspace is not connected."))
      .mockResolvedValueOnce("onyx-server-token");
    const interactiveSignIn = vi.fn().mockResolvedValue(undefined);
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ status: "OK" }), { status: 200 }));

    await authenticatedFunctionFetch("/.netlify/functions/google-drive", { method: "GET" }, { fetcher, getAccessToken, interactiveSignIn, runtimeEnv });

    expect(interactiveSignIn).toHaveBeenCalledTimes(1);
    expect(getAccessToken).toHaveBeenCalledTimes(2);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });

  it("does not retry when interactive sign-in is cancelled", async () => {
    const getAccessToken = vi.fn().mockRejectedValue(new Error("Microsoft workspace is not connected."));
    const interactiveSignIn = vi.fn().mockRejectedValue(new Error("cancelled"));
    const fetcher = vi.fn();

    await expect(authenticatedFunctionFetch("/.netlify/functions/google-drive", {}, { fetcher, getAccessToken, interactiveSignIn, runtimeEnv })).rejects.toThrow("Sign-in was cancelled. Google remains disconnected.");

    expect(getAccessToken).toHaveBeenCalledTimes(1);
    expect(interactiveSignIn).toHaveBeenCalledTimes(1);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("fails safely for ambiguous cached accounts instead of silently choosing", async () => {
    const getAccessToken = vi.fn().mockRejectedValue(new Error("Multiple Microsoft accounts are cached; select an account before continuing."));
    const interactiveSignIn = vi.fn();
    const fetcher = vi.fn();

    await expect(authenticatedFunctionFetch("/.netlify/functions/google-drive", {}, { fetcher, getAccessToken, interactiveSignIn, runtimeEnv })).rejects.toThrow("Sign in to ONYX before connecting Google.");

    expect(interactiveSignIn).not.toHaveBeenCalled();
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("surfaces invalid server sessions as sign-in state without leaking tokens", async () => {
    const getAccessToken = vi.fn().mockResolvedValue("onyx-server-token");
    const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ message: "Session required" }), { status: 400 }));
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => undefined);

    await expect(runGoogleWorkspaceActionWithClient("refresh", { fetcher, getAccessToken, runtimeEnv })).rejects.toThrow("Sign in to ONYX before connecting Google.");

    expect(JSON.stringify(fetcher.mock.calls.map(([url]) => url))).not.toContain("onyx-server-token");
    expect(JSON.stringify(consoleSpy.mock.calls)).not.toContain("onyx-server-token");
    consoleSpy.mockRestore();
  });
});
