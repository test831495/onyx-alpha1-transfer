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
  createEntraExternalIdProductionProvider,
  type AuthenticatedRequestContext,
  type AuthenticationProvider,
  type TrustedJwk,
} from "@onyx/account-authentication-server-authority";

export const inactiveGoogleHandler: GoogleFunctionHandler = async (_event: GoogleFunctionEvent): Promise<GoogleFunctionResponse> => ({
  statusCode: 503,
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ status: "UNAVAILABLE", message: "Google Workspace is not active in this environment." }),
});

export function createProductionAuthenticationProvider(
  environment: Record<string, string | undefined> = process.env,
): AuthenticationProvider | undefined {
  const issuer = environment.ONYX_AUTH_ISSUER ?? environment.ONYX_AUTH_EXPECTED_ISSUER;
  const audience = environment.ONYX_AUTH_AUDIENCE ?? environment.ONYX_AUTH_EXPECTED_AUDIENCE;
  const jwksJson = environment.ONYX_AUTH_JWKS_KEYS;
  const scopeSalt = environment.ONYX_AUTH_SCOPE_SALT;

  if (!issuer || !audience || !jwksJson || !scopeSalt) {
    return undefined;
  }

  try {
    const jwksKeys = JSON.parse(jwksJson) as TrustedJwk[];
    return createEntraExternalIdProductionProvider({
      issuer,
      audience,
      jwksKeys,
      scopeSalt,
    });
  } catch {
    return undefined;
  }
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

  const authenticationProvider =
    options.authenticationProvider ?? createProductionAuthenticationProvider(environment);

  if (!authenticationProvider) {
    return undefined;
  }

  try {
    const keyRing = parseCredentialKeyRing(environment, "production");
    const database = options.database ?? createConfiguredNetlifyDatabase(environment);
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
