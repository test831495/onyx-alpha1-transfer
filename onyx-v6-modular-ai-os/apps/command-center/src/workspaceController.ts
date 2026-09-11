import type { WorkspaceSnapshot } from "@onyx/workspace-contracts";
import {
  MicrosoftWorkspaceConnector,
  plannedProviderSnapshots,
  resolveRuntimeMicrosoftConfig,
  type MicrosoftCalendarRange,
  type MicrosoftCalendarReadResult,
} from "@onyx/workspace-connectors";
import { readMicrosoftRuntimeEnv } from "../viteMicrosoftEnvBridge";

const browserOrigin =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:5200";

const microsoftRuntimeEnv = readMicrosoftRuntimeEnv();
const runtimeMicrosoftConfig = resolveRuntimeMicrosoftConfig({
  ONYX_MS_CLIENT_ID: microsoftRuntimeEnv.ONYX_MS_CLIENT_ID,
  ONYX_MS_TENANT_ID: microsoftRuntimeEnv.ONYX_MS_TENANT_ID,
  ONYX_MS_REDIRECT_URI: microsoftRuntimeEnv.ONYX_MS_REDIRECT_URI || browserOrigin,
  ONYX_MS_AUTHORITY: microsoftRuntimeEnv.ONYX_MS_AUTHORITY,
});

const microsoft = new MicrosoftWorkspaceConnector({
  clientId: runtimeMicrosoftConfig.VITE_MS_CLIENT_ID,
  tenantId: runtimeMicrosoftConfig.VITE_MS_TENANT_ID,
  authority:
    runtimeMicrosoftConfig.VITE_MS_AUTHORITY ||
    "https://login.microsoftonline.com/common",
  redirectUri:
    runtimeMicrosoftConfig.VITE_MS_REDIRECT_URI || browserOrigin,
});
export async function loadWorkspaceSnapshot(): Promise<WorkspaceSnapshot> { let state = await microsoft.initialize(); if (state.state === "connected") { try { const profile=await microsoft.loadProfile(); state=microsoft.snapshot("connected",profile); } catch(error){ state={...microsoft.snapshot("error"),diagnostic:error instanceof Error?error.message:"Microsoft profile could not be loaded."}; } } return {providers:[state,...plannedProviderSnapshots()],activeProvider:state.state==="connected"?"microsoft":undefined,updatedAt:Date.now()}; }
export const getMicrosoftAccessToken=(scopes:string[])=>microsoft.getAccessToken(scopes);
export const loadMicrosoftCalendarEvents=(range:{start:string;end:string;timeZone:string})=>microsoft.loadCalendarEvents(range);
export const loadMicrosoftCalendarEventsWithDiagnostic=(range:MicrosoftCalendarRange):Promise<MicrosoftCalendarReadResult>=>microsoft.loadCalendarEventsWithDiagnostic(range);
export const connectMicrosoft=()=>microsoft.connect();
export const reconnectMicrosoft=()=>microsoft.reconnect();
export const disconnectMicrosoft=()=>microsoft.disconnect();
type GoogleAction = "connect" | "reconnect" | "disconnect" | "refresh";
const googleHeaders = async (mutating: boolean): Promise<HeadersInit> => {
  if (!mutating) return { "content-type": "application/json" };
  const csrfResponse = await fetch("/.netlify/functions/google-csrf", { method: "GET", credentials: "include" });
  const csrf = await csrfResponse.json() as { csrfToken?: string };
  if (!csrfResponse.ok || !csrf.csrfToken) throw new Error("Google action authorization is unavailable.");
  return { "content-type": "application/json", "x-csrf-token": csrf.csrfToken, "idempotency-key": crypto.randomUUID() };
};
export async function runGoogleWorkspaceAction(action: GoogleAction): Promise<void> {
  if (action === "connect" || action === "reconnect") {
    const response = await fetch("/.netlify/functions/oauth-google-initiate", { method: "POST", credentials: "include", headers: await googleHeaders(true), body: JSON.stringify({ reconnect: action === "reconnect" }) });
    const payload = await response.json() as { authorizationUrl?: string; message?: string };
    if (!response.ok || !payload.authorizationUrl) throw new Error(payload.message ?? "Google connection is unavailable.");
    window.location.assign(payload.authorizationUrl);
    return;
  }
  const response = await fetch(action === "disconnect" ? "/.netlify/functions/google-workspace-disconnect" : "/.netlify/functions/google-workspace-status", { method: action === "disconnect" ? "POST" : "GET", credentials: "include", headers: await googleHeaders(action === "disconnect"), ...(action === "disconnect" ? { body: "{}" } : {}) });
  const payload = await response.json() as { message?: string };
  if (!response.ok) throw new Error(payload.message ?? "Google Workspace status is unavailable.");
}
export function disconnectedWorkspaceSnapshot():WorkspaceSnapshot{return{providers:[microsoft.snapshot(),...plannedProviderSnapshots()],updatedAt:Date.now()};}
