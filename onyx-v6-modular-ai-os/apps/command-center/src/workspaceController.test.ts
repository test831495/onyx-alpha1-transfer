import{describe,expect,it}from"vitest";import{connectMicrosoftMail,disconnectedWorkspaceSnapshot,loadMicrosoftMailMessagesWithDiagnostic}from"./workspaceController";
import { MicrosoftWorkspaceConnector, resolveRuntimeMicrosoftConfig } from "@onyx/workspace-connectors";
import { readMicrosoftRuntimeEnv } from "../viteMicrosoftEnvBridge";
describe("workspace foundation",()=>{it("declares all providers",()=>expect(disconnectedWorkspaceSnapshot().providers.map(v=>v.provider)).toEqual(["microsoft","google","yahoo"]));it("keeps planned provider capabilities disabled while presenting friendly statuses",()=>{const snapshot=disconnectedWorkspaceSnapshot();expect(snapshot.providers.filter(v=>v.provider!=="microsoft").flatMap(v=>v.capabilities).every(v=>!v.enabled)).toBe(true);expect(snapshot.providers.find(v=>v.provider==="microsoft")?.state).toBe("unconfigured");expect(snapshot.providers.map(v=>v.label)).toContain("Microsoft 365");expect(snapshot.providers.map(v=>v.label)).toContain("Google");expect(snapshot.providers.map(v=>v.label)).toContain("Yahoo");});});

it("exports the non-UI Microsoft Mail foundation projection", () => {
  expect(typeof connectMicrosoftMail).toBe("function");
  expect(typeof loadMicrosoftMailMessagesWithDiagnostic).toBe("function");
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
