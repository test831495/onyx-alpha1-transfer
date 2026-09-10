import type { WorkspaceSnapshot } from "@onyx/workspace-contracts";
import {
  MicrosoftWorkspaceConnector,
  plannedProviderSnapshots,
  resolveRuntimeMicrosoftConfig,
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
export const connectMicrosoft=()=>microsoft.connect();
export const disconnectMicrosoft=()=>microsoft.disconnect();
export function disconnectedWorkspaceSnapshot():WorkspaceSnapshot{return{providers:[microsoft.snapshot(),...plannedProviderSnapshots()],updatedAt:Date.now()};}
