import type { WorkspaceSnapshot } from "@onyx/workspace-contracts";
import { MicrosoftWorkspaceConnector, plannedProviderSnapshots } from "@onyx/workspace-connectors";
const browserOrigin =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:5200";

const microsoft = new MicrosoftWorkspaceConnector({
  clientId: import.meta.env.VITE_MS_CLIENT_ID,
  tenantId: import.meta.env.VITE_MS_TENANT_ID,
  redirectUri:
    import.meta.env.VITE_MS_REDIRECT_URI || browserOrigin,
});
export async function loadWorkspaceSnapshot(): Promise<WorkspaceSnapshot> { let state = await microsoft.initialize(); if (state.state === "connected") { try { const profile=await microsoft.loadProfile(); state=microsoft.snapshot("connected",profile); } catch(error){ state={...microsoft.snapshot("error"),diagnostic:error instanceof Error?error.message:"Microsoft profile could not be loaded."}; } } return {providers:[state,...plannedProviderSnapshots()],activeProvider:state.state==="connected"?"microsoft":undefined,updatedAt:Date.now()}; }
export const getMicrosoftAccessToken=(scopes:string[])=>microsoft.getAccessToken(scopes);
export const connectMicrosoft=()=>microsoft.connect();
export const disconnectMicrosoft=()=>microsoft.disconnect();
export function disconnectedWorkspaceSnapshot():WorkspaceSnapshot{return{providers:[microsoft.snapshot(),...plannedProviderSnapshots()],updatedAt:Date.now()};}
