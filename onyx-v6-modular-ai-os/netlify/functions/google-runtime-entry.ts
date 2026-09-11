import {
  createGoogleCalendarHandler,
  createGoogleCallbackHandler,
  createGoogleCsrfHandler,
  createGoogleDisconnectHandler,
  createGoogleDriveHandler,
  createGoogleGmailHandler,
  createGoogleInitiateHandler,
  createGoogleServerRuntime,
  createGoogleServerRuntimeWithCanonicalAuthority,
  createGoogleStatusHandler,
  type GoogleFunctionEvent,
  type GoogleFunctionHandler,
  type GoogleFunctionResponse,
  type GoogleServerRuntime,
  type OnyxSessionContext,
} from "@onyx/google-workspace-server-runtime";
import {
  createConfiguredNetlifyDatabase,
  parseCredentialKeyRing,
  readDatabaseRuntimeContext,
} from "@onyx/provider-neutral-credential-store-session-foundation";
import type { DatabaseConnection } from "@netlify/database";
import {
  SYNTHETIC_AUDIENCE,
  SYNTHETIC_ISSUER,
  SYNTHETIC_KEYS,
  SyntheticAuthenticationProvider,
  SyntheticHmacTokenVerifier,
  type AuthenticatedRequestContext,
  type AuthenticationProvider,
} from "@onyx/account-authentication-server-authority";

export const inactiveGoogleHandler: GoogleFunctionHandler = async (_event: GoogleFunctionEvent): Promise<GoogleFunctionResponse> => ({
  statusCode: 503,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ status: "UNAVAILABLE", message: "Google Workspace is not active in this environment." }),
});

export function createCanonicalAuthenticationProvider(environment: Record<string, string | undefined> = process.env): AuthenticationProvider {
  const issuer = environment.ONYX_AUTHORITY_ISSUER ?? SYNTHETIC_ISSUER;
  const audience = environment.ONYX_AUTHORITY_AUDIENCE ?? SYNTHETIC_AUDIENCE;
  const currentKey = environment.ONYX_AUTHORITY_KEY_CURRENT ?? SYNTHETIC_KEYS.current;
  const rotatedKey = environment.ONYX_AUTHORITY_KEY_ROTATED ?? SYNTHETIC_KEYS.rotated;
  const scopeSalt = environment.ONYX_AUTHORITY_SCOPE_SALT ?? "onyx-production-scope-salt-v1";

  const verifier = new SyntheticHmacTokenVerifier(
    issuer,
    audience,
    { current: currentKey, rotated: rotatedKey },
    ["HS256"],
    30,
  );
  return new SyntheticAuthenticationProvider(verifier, scopeSalt);
}

export function defaultOnyxContextMapper(context: AuthenticatedRequestContext): OnyxSessionContext {
  return {
    sessionRef: context.sessionId,
    canonicalAccountRef: context.opaqueAccountScope,
    householdScopeRef: context.opaqueAccountScope,
    accountSwitchGeneration: context.sessionVersion,
    authenticationAssurance: context.authenticationAssurance,
    deviceTrust: context.deviceReference ? "trusted" : "untrusted",
    roleClass: "owner",
    policyVersion: context.policyVersion,
    issuedAt: context.issuedAt,
    expiresAt: context.expiresAt,
    sessionVersion: context.sessionVersion,
    actorId: context.opaqueAccountScope,
    authorizationState: "AUTHORIZED",
    capabilityState: ["calendar.events.read", "files.metadata.read", "mail.messages.read"],
    auditContext: { requestId: context.requestId, policyVersion: context.policyVersion },
  };
}

export function createGoogleRuntimeFromEnvironment(
  environment: Record<string, string | undefined> = process.env,
  options: {
    database?: DatabaseConnection;
    authenticationProvider?: AuthenticationProvider;
  } = {},
): GoogleServerRuntime | undefined {
  if (readDatabaseRuntimeContext(environment) !== "production") return undefined;
  try {
    const keyRing = parseCredentialKeyRing(environment, "production");
    const database = options.database ?? createConfiguredNetlifyDatabase(environment);
    const authenticationProvider = options.authenticationProvider ?? createCanonicalAuthenticationProvider(environment);
    return createGoogleServerRuntimeWithCanonicalAuthority({
      database,
      authenticationProvider,
      mapContext: defaultOnyxContextMapper,
      runtimeContext: "production",
      encryptionKey: keyRing.active ?? { version: "production-v1", bytes: new Uint8Array(32) },
      environment,
    });
  } catch {
    return undefined;
  }
}

export function createGoogleRouteHandler(
  factory: (runtime: GoogleServerRuntime) => GoogleFunctionHandler,
  environment: Record<string, string | undefined> = process.env,
  options?: { database?: DatabaseConnection; authenticationProvider?: AuthenticationProvider },
): GoogleFunctionHandler {
  const runtime = createGoogleRuntimeFromEnvironment(environment, options);
  return runtime ? factory(runtime) : inactiveGoogleHandler;
}

export const createGoogleRuntimeHandlerFactory = (factory: (runtime: GoogleServerRuntime) => GoogleFunctionHandler) => createGoogleRouteHandler(factory);
