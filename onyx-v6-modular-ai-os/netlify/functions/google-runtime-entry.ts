import {
  createGoogleCalendarHandler,
  createGoogleCallbackHandler,
  createGoogleCsrfHandler,
  createGoogleDisconnectHandler,
  createGoogleDriveHandler,
  createGoogleGmailHandler,
  createGoogleInitiateHandler,
  createGoogleServerRuntime,
  createGoogleStatusHandler,
  type GoogleFunctionEvent,
  type GoogleFunctionHandler,
  type GoogleFunctionResponse,
  type GoogleServerRuntime,
} from "@onyx/google-workspace-server-runtime";
import { createConfiguredNetlifyDatabase, parseCredentialKeyRing, readDatabaseRuntimeContext } from "@onyx/provider-neutral-credential-store-session-foundation";

export const inactiveGoogleHandler: GoogleFunctionHandler = async (_event: GoogleFunctionEvent): Promise<GoogleFunctionResponse> => ({
  statusCode: 503,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ status: "UNAVAILABLE", message: "Google Workspace is not active in this environment." }),
});

export function createGoogleRuntimeFromEnvironment(environment: Record<string, string | undefined> = process.env): GoogleServerRuntime | undefined {
  if (readDatabaseRuntimeContext(environment) !== "production") return undefined;
  try {
    const keyRing = parseCredentialKeyRing(environment, "production");
    const database = createConfiguredNetlifyDatabase(environment);
    return createGoogleServerRuntime({
      database,
      authority: { verify: async () => undefined, issue: async () => "" },
      encryptionKey: keyRing.active ?? { version: "production-v1", bytes: new Uint8Array(32) },
      environment,
    });
  } catch {
    return undefined;
  }
}

export function createGoogleRouteHandler(factory: (runtime: GoogleServerRuntime) => GoogleFunctionHandler, environment: Record<string, string | undefined> = process.env): GoogleFunctionHandler {
  const runtime = createGoogleRuntimeFromEnvironment(environment);
  return runtime ? factory(runtime) : inactiveGoogleHandler;
}

export const createGoogleRuntimeHandlerFactory = (factory: (runtime: GoogleServerRuntime) => GoogleFunctionHandler) => createGoogleRouteHandler(factory);
