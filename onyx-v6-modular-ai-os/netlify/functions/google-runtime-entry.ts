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
// @ts-ignore
import type { DatabaseConnection } from "@netlify/database";
import {
  createEntraExternalIdProductionProvider,
  type AuthenticatedRequestContext,
  type AuthenticationProvider,
  type TrustedJwk,
} from "@onyx/account-authentication-server-authority";

export type GoogleRuntimeInitializationReason =
  | "INVALID_RUNTIME_CONTEXT"
  | "AUTHENTICATION_PROVIDER_UNAVAILABLE"
  | "CREDENTIAL_KEY_CONFIGURATION_INVALID"
  | "DATABASE_CONFIGURATION_UNAVAILABLE"
  | "CANONICAL_AUTHORITY_INITIALIZATION_FAILED"
  | "GOOGLE_RUNTIME_INITIALIZATION_FAILED";

const buildGoogleRuntimeDiagnostics = (environment: Record<string, string | undefined>) => ({
  hasGoogleClientId: Boolean(environment.ONYX_GOOGLE_CLIENT_ID),
  hasGoogleClientSecret: Boolean(environment.ONYX_GOOGLE_CLIENT_SECRET),
  hasGoogleRedirectUri: Boolean(environment.ONYX_GOOGLE_REDIRECT_URI),
  hasAuthIssuer: Boolean(environment.ONYX_AUTH_ISSUER ?? environment.ONYX_AUTH_EXPECTED_ISSUER),
  hasAuthAudience: Boolean(environment.ONYX_AUTH_AUDIENCE ?? environment.ONYX_AUTH_EXPECTED_AUDIENCE),
  hasCredentialKey: Boolean(environment.ONYX_CREDENTIAL_ENCRYPTION_KEY),
  hasCredentialKeyVersion: Boolean(environment.ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION),
  runtimeContext: readDatabaseRuntimeContext(environment),
});

const safeGoogleRuntimeMessage = (reasonCode: GoogleRuntimeInitializationReason): string => {
  switch (reasonCode) {
    case "INVALID_RUNTIME_CONTEXT":
      return "Google runtime is unavailable outside the production context.";
    case "AUTHENTICATION_PROVIDER_UNAVAILABLE":
      return "Google authentication provider configuration is unavailable.";
    case "CREDENTIAL_KEY_CONFIGURATION_INVALID":
      return "Google credential key configuration is invalid or missing.";
    case "DATABASE_CONFIGURATION_UNAVAILABLE":
      return "Google database configuration is unavailable.";
    case "CANONICAL_AUTHORITY_INITIALIZATION_FAILED":
      return "Google canonical authority initialization failed.";
    case "GOOGLE_RUNTIME_INITIALIZATION_FAILED":
      return "Google runtime initialization failed.";
    default:
      return "Google runtime initialization failed.";
  }
};

const logGoogleRuntimeInitializationFailure = (
  environment: Record<string, string | undefined>,
  reasonCode: GoogleRuntimeInitializationReason,
  error?: unknown,
): void => {
  console.error("[GOOGLE_RUNTIME_INIT]", {
    reasonCode,
    errorName: error instanceof Error ? error.name : "UnknownError",
    safeMessage: safeGoogleRuntimeMessage(reasonCode),
    diagnostics: buildGoogleRuntimeDiagnostics(environment),
  });
};

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
  const requiredScope = environment.ONYX_AUTH_REQUIRED_SCOPE ?? "account.preference.readwrite";
  const scopeSalt = environment.ONYX_AUTH_SCOPE_SALT ?? "onyx-production-scope-salt-v1";
  const jwksJson = environment.ONYX_AUTH_JWKS_KEYS;

  if (!issuer || !audience) {
    return undefined;
  }

  try {
    const jwksKeys = jwksJson ? (JSON.parse(jwksJson) as TrustedJwk[]) : undefined;
    return createEntraExternalIdProductionProvider({
      issuer,
      audience,
      requiredScope,
      ...(jwksKeys ? { jwksKeys } : {}),
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
  const runtimeContext = readDatabaseRuntimeContext(environment);

  if (runtimeContext !== "production") {
    logGoogleRuntimeInitializationFailure(environment, "INVALID_RUNTIME_CONTEXT");
    return undefined;
  }

  const authenticationProvider =
    options.authenticationProvider ?? createProductionAuthenticationProvider(environment);

  if (!authenticationProvider) {
    logGoogleRuntimeInitializationFailure(environment, "AUTHENTICATION_PROVIDER_UNAVAILABLE");
    return undefined;
  }

  try {
    const keyRing = parseCredentialKeyRing(environment, "production");
    const database = options.database ?? createConfiguredNetlifyDatabase(environment);

    return createGoogleServerRuntimeWithCanonicalAuthority({
      database,
      authenticationProvider,
      mapContext: defaultOnyxContextMapper,
      runtimeContext,
      encryptionKey: keyRing.active,
      environment,
    });
  } catch (error) {
    if (error instanceof Error && /credential.*key|encoded|required|version/i.test(error.message)) {
      logGoogleRuntimeInitializationFailure(environment, "CREDENTIAL_KEY_CONFIGURATION_INVALID", error);
      return undefined;
    }
    if (error instanceof Error && /database|connection|runtime context|getDatabase/i.test(error.message)) {
      logGoogleRuntimeInitializationFailure(environment, "DATABASE_CONFIGURATION_UNAVAILABLE", error);
      return undefined;
    }

    logGoogleRuntimeInitializationFailure(environment, "CANONICAL_AUTHORITY_INITIALIZATION_FAILED", error);
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
