import type { FileRuntimeTrace, WorkspaceSnapshot } from "@onyx/workspace-contracts";
import {
  MicrosoftWorkspaceConnector,
  plannedProviderSnapshots,
  resolveRuntimeMicrosoftConfig,
  type MicrosoftCalendarRange,
  type MicrosoftCalendarReadResult,
  type MicrosoftMailReadResult,
  type MicrosoftMailRuntimeTrace,
  type MicrosoftMailRuntimeTraceOptions,
  type MicrosoftMailTraceBuildIdentity,
} from "@onyx/workspace-connectors";
import { MicrosoftFilesAdapter, type MicrosoftAccountClassification, type SharePointResolution } from "@onyx/workspace-connectors";
import { readMicrosoftRuntimeEnv } from "../viteMicrosoftEnvBridge";

const browserOrigin =
  typeof window !== "undefined"
    ? window.location.origin
    : "http://localhost:5200";

const PREVIEW_ORIGIN_PATTERN = /^https:\/\/deploy-preview-\d+--onyx-alpha0\.netlify\.app$/i;

export function resolveMicrosoftRedirectUri(currentOrigin: string, configuredRedirectUri: string): string {
  const normalizedOrigin = currentOrigin.replace(/\/$/, "");
  if (/^https?:\/\/localhost(?::\d+)?$/i.test(normalizedOrigin) || PREVIEW_ORIGIN_PATTERN.test(normalizedOrigin)) {
    return normalizedOrigin;
  }
  return configuredRedirectUri.trim() || normalizedOrigin;
}

const microsoftRuntimeEnv = readMicrosoftRuntimeEnv();
const runtimeMicrosoftConfig = resolveRuntimeMicrosoftConfig({
  ONYX_MS_CLIENT_ID: microsoftRuntimeEnv.ONYX_MS_CLIENT_ID,
  ONYX_MS_TENANT_ID: microsoftRuntimeEnv.ONYX_MS_TENANT_ID,
  ONYX_MS_REDIRECT_URI: resolveMicrosoftRedirectUri(browserOrigin, microsoftRuntimeEnv.ONYX_MS_REDIRECT_URI),
  ONYX_MS_AUTHORITY: microsoftRuntimeEnv.ONYX_MS_AUTHORITY,
});

const microsoft = new MicrosoftWorkspaceConnector({
  clientId: runtimeMicrosoftConfig.VITE_MS_CLIENT_ID,
  tenantId: runtimeMicrosoftConfig.VITE_MS_TENANT_ID,
  authority:
    runtimeMicrosoftConfig.VITE_MS_AUTHORITY ||
    "https://login.microsoftonline.com/common",
  redirectUri: runtimeMicrosoftConfig.VITE_MS_REDIRECT_URI || browserOrigin,
});
export async function loadWorkspaceSnapshot(): Promise<WorkspaceSnapshot> { let state = await microsoft.initialize(); if (state.state === "connected") { try { const profile=await microsoft.loadProfile(); state=microsoft.snapshot("connected",profile); } catch(error){ state={...microsoft.snapshot("error"),diagnostic:error instanceof Error?error.message:"Microsoft profile could not be loaded."}; } } return {providers:[state,...plannedProviderSnapshots()],activeProvider:state.state==="connected"?"microsoft":undefined,updatedAt:Date.now()}; }
export const getMicrosoftAccessToken=(scopes:string[])=>microsoft.getAccessToken(scopes);
export const loadMicrosoftCalendarEvents=(range:{start:string;end:string;timeZone:string})=>microsoft.loadCalendarEvents(range);
export const loadMicrosoftCalendarEventsWithDiagnostic=(range:MicrosoftCalendarRange):Promise<MicrosoftCalendarReadResult>=>microsoft.loadCalendarEventsWithDiagnostic(range);
export const getMailBuildIdentity=():MicrosoftMailTraceBuildIdentity=>({sha:typeof import.meta.env.VITE_GIT_SHA === "string" ? import.meta.env.VITE_GIT_SHA : "UNKNOWN",context:import.meta.env.DEV ? "local" : /^deploy-preview-\d+--onyx-alpha0\.netlify\.app$/i.test(browserOrigin.replace(/^https?:\/\//, "").split("/")[0] ?? "") ? "preview" : "unknown",version:"6.0.0-alpha.3.1.1b"});
export async function loadMicrosoftMailMessagesWithDiagnostic(options?: MicrosoftMailRuntimeTraceOptions): Promise<MicrosoftMailReadResult> {
  if (!options?.diagnosticsEnabled) return microsoft.loadMailMessagesWithDiagnostic();
  let latest: MicrosoftMailRuntimeTrace | undefined;
  const result = await microsoft.loadMailMessagesWithDiagnostic({ ...options, onTrace: (trace) => { latest = trace; options.onTrace(trace); } });
  if (latest) options.onTrace(Object.freeze({ ...latest, stage: "CONTROLLER_RESULT_ASSIGNED" }));
  return result;
}
export const connectMicrosoftMail=()=>microsoft.connectMail();
export const connectMicrosoft=()=>microsoft.connect();
export const reconnectMicrosoft=()=>microsoft.reconnect();
export const reconnectMicrosoftFiles=()=>microsoft.reconnectFiles();
export const disconnectMicrosoft=()=>microsoft.disconnect();
let microsoftFilesTrace: readonly FileRuntimeTrace[] = Object.freeze([]);
const recordMicrosoftFilesTrace = (trace: FileRuntimeTrace): void => {
  microsoftFilesTrace = Object.freeze([...microsoftFilesTrace, Object.freeze(trace)].slice(-64));
};
export const getMicrosoftFilesTrace = (): readonly FileRuntimeTrace[] => microsoftFilesTrace;
export const clearMicrosoftFilesTrace = (): void => { microsoftFilesTrace = Object.freeze([]); };
const microsoftFiles = (action: "OPEN_ONEDRIVE" | "BOUNDED_ONEDRIVE_TEST" = "OPEN_ONEDRIVE", accountKind: MicrosoftAccountClassification = microsoft.getFilesAccountKind()) => new MicrosoftFilesAdapter({ accessToken: (scopes) => microsoft.getAccessToken(scopes), accountKind, action, onTrace: recordMicrosoftFilesTrace, buildIdentity: getMailBuildIdentity().sha });
export async function loadMicrosoftOneDriveRoot(continuation?: string) {
  const adapter = microsoftFiles("OPEN_ONEDRIVE");
  const { drive } = await adapter.getOneDrive();
  return adapter.listChildren(drive.driveId, "root", "ONEDRIVE", continuation);
}
export async function runBoundedMicrosoftOneDriveTest() {
  const adapter = microsoftFiles("BOUNDED_ONEDRIVE_TEST");
  return adapter.runBoundedWriteValidation({
    operationId: crypto.randomUUID(),
    idempotencyKey: `onyx-files-${crypto.randomUUID()}`,
    provider: "microsoft",
    driveId: (await adapter.getOneDrive()).drive.driveId,
    parentItemId: "root",
    testFolderName: "ONYX-NOVA-Connector-Test",
    artifactName: `onyx-nova-connector-test-${crypto.randomUUID()}.txt`,
    consequencePreview: "Create, verify, rename, move, and delete one synthetic test artifact; remove only folders created by this run.",
    explicitTestMode: true,
    confirmed: true,
    sourcePathClass: "ONEDRIVE",
  });
}
export const getMicrosoftFilesAccountKind = (): MicrosoftAccountClassification => microsoft.getFilesAccountKind();
export async function resolveMicrosoftSharePoint(hostname: string, sitePath: string): Promise<SharePointResolution> {
  return (await microsoftFiles().resolveSharePoint({ hostname, sitePath: sitePath.startsWith("/") ? sitePath : `/${sitePath}` }));
}
export async function loadMicrosoftSharePointFolder(siteId: string, driveId: string, itemId: string, continuation?: string) {
  return (await microsoftFiles().listChildren(driveId, itemId, "SHAREPOINT_LIBRARY", continuation, { siteId, libraryId: driveId })).listing;
}
export async function runBoundedMicrosoftSharePointTest(driveId: string, parentItemId: string) {
  return microsoftFiles().runBoundedWriteValidation({
    operationId: crypto.randomUUID(),
    idempotencyKey: `onyx-sharepoint-files-${crypto.randomUUID()}`,
    provider: "microsoft",
    driveId,
    parentItemId,
    testFolderName: "ONYX-NOVA-Connector-Test",
    artifactName: `onyx-nova-connector-test-${crypto.randomUUID()}.txt`,
    consequencePreview: "Create, verify, rename, move, and delete one synthetic SharePoint test artifact; remove only folders created by this run.",
    explicitTestMode: true,
    confirmed: true,
    sourcePathClass: "SHAREPOINT_LIBRARY",
  });
}
type GoogleAction = "connect" | "reconnect" | "disconnect" | "refresh";
const googleHeaders = async (mutating: boolean): Promise<HeadersInit> => {
  let proof = "";
  try {
    const scope = microsoftRuntimeEnv.ONYX_AUTH_SCOPE || "account.preference.readwrite";
    proof = await microsoft.getAccessToken([scope]);
  } catch {
    // Proof omitted if MSAL token unavailable
  }

  if (!mutating) {
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (proof) {
      headers["authorization"] = `Bearer ${proof}`;
      headers["x-onyx-session-proof"] = proof;
    }
    return headers;
  }

  const csrfResponse = await fetch("/.netlify/functions/google-csrf", {
    method: "GET",
    credentials: "include",
    headers: proof ? { authorization: `Bearer ${proof}`, "x-onyx-session-proof": proof } : {},
  });
  const csrf = (await csrfResponse.json()) as { csrfToken?: string };
  if (!csrfResponse.ok || !csrf.csrfToken) throw new Error("Google action authorization is unavailable.");

  const headers: Record<string, string> = {
    "content-type": "application/json",
    "x-csrf-token": csrf.csrfToken,
    "idempotency-key": crypto.randomUUID(),
  };
  if (proof) {
    headers["authorization"] = `Bearer ${proof}`;
    headers["x-onyx-session-proof"] = proof;
  }
  return headers;
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
