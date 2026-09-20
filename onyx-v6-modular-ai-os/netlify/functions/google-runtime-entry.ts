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
  classifyCredentialKeyConfiguration,
  classifyDatabaseConfiguration,
  createConfiguredNetlifyDatabase,
  parseCredentialKeyRing,
  readDatabaseRuntimeContext,
  type CredentialKeyClassification,
} from "@onyx/provider-neutral-credential-store-session-foundation";
// @ts-ignore
import { getConnectionString, MissingDatabaseConnectionError, type DatabaseConnection } from "@netlify/database";
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

export type AuthenticationProviderClassification =
  | "AUTH_ISSUER_MISSING"
  | "AUTH_AUDIENCE_MISSING"
  | "AUTH_JWKS_JSON_INVALID"
  | "AUTH_PROVIDER_INITIALIZATION_FAILED"
  | "AUTH_PROVIDER_AVAILABLE";

export type GoogleOAuthConfigurationClassification =
  | "GOOGLE_CLIENT_ID_MISSING"
  | "GOOGLE_CLIENT_SECRET_MISSING"
  | "GOOGLE_REDIRECT_URI_MISSING"
  | "GOOGLE_REDIRECT_URI_INVALID"
  | "GOOGLE_OAUTH_CONFIGURATION_AVAILABLE";

export type CanonicalRuntimeClassification =
  | "SESSION_AUTHORITY_INITIALIZATION_FAILED"
  | "CREDENTIAL_STORE_INITIALIZATION_FAILED"
  | "OAUTH_PENDING_STORE_INITIALIZATION_FAILED"
  | "TOKEN_BROKER_INITIALIZATION_FAILED"
  | "GOOGLE_RUNTIME_INITIALIZATION_FAILED"
  | "GOOGLE_RUNTIME_READY";

export type GoogleDatabaseInitializationFailureReason =
  | "NETLIFY_DATABASE_CONNECTION_METADATA_MISSING"
  | "NETLIFY_DATABASE_CLIENT_INITIALIZATION_FAILED"
  | "NETLIFY_DATABASE_RUNTIME_UNAVAILABLE"
  | "GOOGLE_CANONICAL_RUNTIME_DATABASE_FAILURE";

export type GoogleDatabaseRuntimeMetadataDiagnostic = {
  readonly hasConnectionString: boolean;
  readonly connectionStringLength: number;
};

type BoundedDatabaseErrorName = "MissingDatabaseConnectionError" | "Error" | "UnknownError";

type GoogleDatabaseInitializationFailureBoundary = "client-construction" | "runtime-integration" | "canonical-runtime";
type DatabaseConfigurationClassification = ReturnType<typeof classifyDatabaseConfiguration>;

const boundedDatabaseErrorName = (error: unknown): BoundedDatabaseErrorName => {
  if (typeof error === "object" && error !== null && "name" in error && error.name === "MissingDatabaseConnectionError") {
    return "MissingDatabaseConnectionError";
  }
  if (error instanceof Error && error.name === "MissingDatabaseConnectionError") return "MissingDatabaseConnectionError";
  if (error instanceof Error) return "Error";
  return "UnknownError";
};

export const classifyGoogleDatabaseInitializationFailure = (
  error: unknown,
  boundary: GoogleDatabaseInitializationFailureBoundary = "client-construction",
): GoogleDatabaseInitializationFailureReason => {
  if (boundary === "canonical-runtime") return "GOOGLE_CANONICAL_RUNTIME_DATABASE_FAILURE";
  if (boundedDatabaseErrorName(error) === "MissingDatabaseConnectionError") {
    return "NETLIFY_DATABASE_CONNECTION_METADATA_MISSING";
  }
  if (boundary === "runtime-integration") return "NETLIFY_DATABASE_RUNTIME_UNAVAILABLE";
  return "NETLIFY_DATABASE_CLIENT_INITIALIZATION_FAILED";
};

export const buildGoogleDatabaseInitializationFailureDiagnostic = (
  error: unknown,
  boundary: GoogleDatabaseInitializationFailureBoundary = "client-construction",
): { readonly reasonCode: GoogleDatabaseInitializationFailureReason; readonly errorName: BoundedDatabaseErrorName } => ({
  reasonCode: classifyGoogleDatabaseInitializationFailure(error, boundary),
  errorName: boundedDatabaseErrorName(error),
});

const logGoogleDatabaseInitializationFailure = (_reasonCode: GoogleDatabaseInitializationFailureReason, error: unknown): void => {
  console.error("[GOOGLE_DATABASE_INIT]", buildGoogleDatabaseInitializationFailureDiagnostic(error));
};

export const buildGoogleDatabaseRuntimeMetadataDiagnostic = (
  readConnectionString: () => string | undefined = getConnectionString,
): GoogleDatabaseRuntimeMetadataDiagnostic => {
  try {
    const connectionString = readConnectionString();
    return {
      hasConnectionString: Boolean(connectionString),
      connectionStringLength: connectionString?.length ?? 0,
    };
  } catch (error) {
    if (error instanceof MissingDatabaseConnectionError || boundedDatabaseErrorName(error) === "MissingDatabaseConnectionError") {
      return { hasConnectionString: false, connectionStringLength: 0 };
    }
    throw error;
  }
};

export const googleDatabaseRuntimeMetadataDiagnosticHandler: GoogleFunctionHandler = async (): Promise<GoogleFunctionResponse> => {
  const diagnostic = buildGoogleDatabaseRuntimeMetadataDiagnostic();
  console.error(diagnostic);
  return {
    statusCode: 200,
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ status: "LOGGED" }),
  };
};

export const handler = googleDatabaseRuntimeMetadataDiagnosticHandler;

// Bounded, non-throwing classification. Never logs the issuer, audience, JWKS data, scope salt, or key material.
export function classifyAuthenticationProviderConfiguration(
  environment: Record<string, string | undefined>,
  providerOverride?: AuthenticationProvider,
): AuthenticationProviderClassification {
  if (providerOverride) return "AUTH_PROVIDER_AVAILABLE";
  const issuer = environment.ONYX_AUTH_ISSUER ?? environment.ONYX_AUTH_EXPECTED_ISSUER;
  const audience = environment.ONYX_AUTH_AUDIENCE ?? environment.ONYX_AUTH_EXPECTED_AUDIENCE;
  if (!issuer) return "AUTH_ISSUER_MISSING";
  if (!audience) return "AUTH_AUDIENCE_MISSING";
  const jwksJson = environment.ONYX_AUTH_JWKS_KEYS;
  if (jwksJson) {
    try {
      JSON.parse(jwksJson);
    } catch {
      return "AUTH_JWKS_JSON_INVALID";
    }
  }
  return createProductionAuthenticationProvider(environment) ? "AUTH_PROVIDER_AVAILABLE" : "AUTH_PROVIDER_INITIALIZATION_FAILED";
}

// Bounded, non-throwing classification. Never logs client ID, client secret, or redirect URI values. Read-only
// OAuth scopes (GOOGLE_OAUTH_SCOPES) are validated for presence elsewhere and are never widened by this check.
const PRODUCTION_GOOGLE_REDIRECT_HOSTNAME = "onyx-alpha0.netlify.app";
const PRODUCTION_GOOGLE_REDIRECT_PATHNAME = "/.netlify/functions/oauth-google-callback";

export function classifyGoogleOAuthConfiguration(environment: Record<string, string | undefined>): GoogleOAuthConfigurationClassification {
  const clientId = environment.ONYX_GOOGLE_CLIENT_ID;
  const clientSecret = environment.ONYX_GOOGLE_CLIENT_SECRET;
  const redirectUri = environment.ONYX_GOOGLE_REDIRECT_URI;
  if (!clientId) return "GOOGLE_CLIENT_ID_MISSING";
  if (!clientSecret) return "GOOGLE_CLIENT_SECRET_MISSING";
  if (!redirectUri) return "GOOGLE_REDIRECT_URI_MISSING";
  let parsed: URL;
  try {
    parsed = new URL(redirectUri);
  } catch {
    return "GOOGLE_REDIRECT_URI_INVALID";
  }
  // Exact-match every component: a suffix, prefix, or partial match on hostname or pathname is never accepted.
  const isExactProductionCallback =
    parsed.protocol === "https:" &&
    parsed.hostname === PRODUCTION_GOOGLE_REDIRECT_HOSTNAME &&
    parsed.port === "" &&
    parsed.username === "" &&
    parsed.password === "" &&
    parsed.pathname === PRODUCTION_GOOGLE_REDIRECT_PATHNAME &&
    parsed.search === "" &&
    parsed.hash === "";
  if (!isExactProductionCallback) return "GOOGLE_REDIRECT_URI_INVALID";
  return "GOOGLE_OAUTH_CONFIGURATION_AVAILABLE";
}

// Best-effort, keyword-bounded sub-classification of a single canonical-authority construction failure.
// Construction failures at this stage are not expected in normal operation (dependency constructors do not
// perform I/O), so most outcomes resolve to GOOGLE_RUNTIME_READY or the generic initialization-failed fallback.
const classifyCanonicalRuntimeFailure = (error: unknown): CanonicalRuntimeClassification => {
  const message = error instanceof Error ? error.message : "";
  if (/authority|session/i.test(message)) return "SESSION_AUTHORITY_INITIALIZATION_FAILED";
  if (/credential store/i.test(message)) return "CREDENTIAL_STORE_INITIALIZATION_FAILED";
  if (/oauth pending/i.test(message)) return "OAUTH_PENDING_STORE_INITIALIZATION_FAILED";
  if (/token broker/i.test(message)) return "TOKEN_BROKER_INITIALIZATION_FAILED";
  return "GOOGLE_RUNTIME_INITIALIZATION_FAILED";
};

const buildGoogleRuntimeDiagnostics = (
  environment: Record<string, string | undefined>,
  options: { authenticationProvider?: AuthenticationProvider; database?: DatabaseConnection } = {},
) => {
  const credentialKeyClassification: CredentialKeyClassification = classifyCredentialKeyConfiguration(environment);
  const databaseConfigurationClassification: DatabaseConfigurationClassification = classifyDatabaseConfiguration(environment);
  const authenticationProviderClassification = classifyAuthenticationProviderConfiguration(environment, options.authenticationProvider);
  const googleOAuthConfigurationClassification = classifyGoogleOAuthConfiguration(environment);
  const runtimeContext = readDatabaseRuntimeContext(environment);

  return {
    hasGoogleClientId: Boolean(environment.ONYX_GOOGLE_CLIENT_ID),
    hasGoogleClientSecret: Boolean(environment.ONYX_GOOGLE_CLIENT_SECRET),
    hasGoogleRedirectUri: Boolean(environment.ONYX_GOOGLE_REDIRECT_URI),
    hasAuthIssuer: Boolean(environment.ONYX_AUTH_ISSUER ?? environment.ONYX_AUTH_EXPECTED_ISSUER),
    hasAuthAudience: Boolean(environment.ONYX_AUTH_AUDIENCE ?? environment.ONYX_AUTH_EXPECTED_AUDIENCE),
    hasCredentialKey: Boolean(environment.ONYX_CREDENTIAL_ENCRYPTION_KEY),
    // Match parseCredentialKeyRing's whitespace-only rejection so diagnostics never report a version as present when validation would reject it.
    hasCredentialKeyVersion: Boolean(environment.ONYX_CREDENTIAL_ENCRYPTION_KEY_VERSION?.trim()),
    runtimeContext,
    credentialKeyClassification,
    databaseConfigurationClassification,
    authenticationProviderClassification,
    googleOAuthConfigurationClassification,
    prerequisitesSatisfied:
      runtimeContext === "production" &&
      credentialKeyClassification === "CREDENTIAL_KEY_CONFIGURATION_VALID" &&
      databaseConfigurationClassification === "DATABASE_CONFIGURATION_AVAILABLE" &&
      authenticationProviderClassification === "AUTH_PROVIDER_AVAILABLE" &&
      googleOAuthConfigurationClassification === "GOOGLE_OAUTH_CONFIGURATION_AVAILABLE",
  };
};

// Single safe preflight result: bounded booleans and reason codes only, suitable for protected Function logs
// or an already authenticated status route. Never returns secrets or raw errors to the browser. reasonCode is
// always a concrete, non-empty literal (never undefined) so JSON.stringify never silently drops the field.
export type GoogleRuntimePreflightFailureReason =
  | "INVALID_RUNTIME_CONTEXT"
  | Exclude<CredentialKeyClassification, "CREDENTIAL_KEY_CONFIGURATION_VALID">
  | Exclude<DatabaseConfigurationClassification, "DATABASE_CONFIGURATION_AVAILABLE">
  | Exclude<AuthenticationProviderClassification, "AUTH_PROVIDER_AVAILABLE">
  | Exclude<GoogleOAuthConfigurationClassification, "GOOGLE_OAUTH_CONFIGURATION_AVAILABLE">;

type GoogleRuntimeDiagnostics = ReturnType<typeof buildGoogleRuntimeDiagnostics>;

export type GoogleRuntimePreflightResult =
  | {
      readonly ready: true;
      readonly reasonCode: "GOOGLE_RUNTIME_READY";
      readonly runtimeContext: GoogleRuntimeDiagnostics["runtimeContext"];
      readonly diagnostics: GoogleRuntimeDiagnostics;
    }
  | {
      readonly ready: false;
      readonly reasonCode: GoogleRuntimePreflightFailureReason;
      readonly runtimeContext: GoogleRuntimeDiagnostics["runtimeContext"];
      readonly diagnostics: GoogleRuntimeDiagnostics;
    };

export function getGoogleRuntimePreflight(
  environment: Record<string, string | undefined> = process.env,
  options: { authenticationProvider?: AuthenticationProvider; database?: DatabaseConnection } = {},
): GoogleRuntimePreflightResult {
  const diagnostics = buildGoogleRuntimeDiagnostics(environment, options);
  const { runtimeContext } = diagnostics;

  if (runtimeContext !== "production") {
    return { ready: false, reasonCode: "INVALID_RUNTIME_CONTEXT", runtimeContext, diagnostics };
  }
  if (diagnostics.credentialKeyClassification !== "CREDENTIAL_KEY_CONFIGURATION_VALID") {
    return { ready: false, reasonCode: diagnostics.credentialKeyClassification, runtimeContext, diagnostics };
  }
  if (diagnostics.databaseConfigurationClassification !== "DATABASE_CONFIGURATION_AVAILABLE") {
    return { ready: false, reasonCode: diagnostics.databaseConfigurationClassification, runtimeContext, diagnostics };
  }
  if (diagnostics.authenticationProviderClassification !== "AUTH_PROVIDER_AVAILABLE") {
    return { ready: false, reasonCode: diagnostics.authenticationProviderClassification, runtimeContext, diagnostics };
  }
  if (diagnostics.googleOAuthConfigurationClassification !== "GOOGLE_OAUTH_CONFIGURATION_AVAILABLE") {
    return { ready: false, reasonCode: diagnostics.googleOAuthConfigurationClassification, runtimeContext, diagnostics };
  }
  return { ready: true, reasonCode: "GOOGLE_RUNTIME_READY", runtimeContext, diagnostics };
}

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
  options: { authenticationProvider?: AuthenticationProvider; database?: DatabaseConnection; canonicalRuntimeClassification?: CanonicalRuntimeClassification } = {},
): void => {
  console.error("[GOOGLE_RUNTIME_INIT]", {
    reasonCode,
    errorName: error instanceof Error ? error.name : "UnknownError",
    safeMessage: safeGoogleRuntimeMessage(reasonCode),
    diagnostics: {
      ...buildGoogleRuntimeDiagnostics(environment, options),
      ...(options.canonicalRuntimeClassification ? { canonicalRuntimeClassification: options.canonicalRuntimeClassification } : {}),
    },
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
    logGoogleRuntimeInitializationFailure(environment, "INVALID_RUNTIME_CONTEXT", undefined, options);
    return undefined;
  }

  const authenticationProvider =
    options.authenticationProvider ?? createProductionAuthenticationProvider(environment);

  if (!authenticationProvider) {
    logGoogleRuntimeInitializationFailure(environment, "AUTHENTICATION_PROVIDER_UNAVAILABLE", undefined, options);
    return undefined;
  }

  let keyRing: ReturnType<typeof parseCredentialKeyRing>;
  try {
    keyRing = parseCredentialKeyRing(environment, "production");
  } catch (error) {
    logGoogleRuntimeInitializationFailure(environment, "CREDENTIAL_KEY_CONFIGURATION_INVALID", error, options);
    return undefined;
  }
  if (!keyRing.active) {
    logGoogleRuntimeInitializationFailure(environment, "CREDENTIAL_KEY_CONFIGURATION_INVALID", undefined, options);
    return undefined;
  }

  let database: DatabaseConnection;
  try {
    database = options.database ?? createConfiguredNetlifyDatabase(environment);
  } catch (error) {
    const reasonCode = classifyGoogleDatabaseInitializationFailure(error);
    logGoogleDatabaseInitializationFailure(reasonCode, error);
    logGoogleRuntimeInitializationFailure(environment, "DATABASE_CONFIGURATION_UNAVAILABLE", undefined, options);
    return undefined;
  }

  try {
    return createGoogleServerRuntimeWithCanonicalAuthority({
      database,
      authenticationProvider,
      mapContext: defaultOnyxContextMapper,
      runtimeContext,
      encryptionKey: keyRing.active,
      environment,
    });
  } catch (error) {
    logGoogleRuntimeInitializationFailure(environment, "CANONICAL_AUTHORITY_INITIALIZATION_FAILED", error, {
      ...options,
      canonicalRuntimeClassification: classifyCanonicalRuntimeFailure(error),
    });
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
