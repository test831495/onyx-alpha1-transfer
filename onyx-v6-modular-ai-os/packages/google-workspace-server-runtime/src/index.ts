import { CodeChallengeMethod, OAuth2Client } from "google-auth-library";
import type { DatabaseConnection } from "@netlify/database";
import {
  SqlCredentialStore,
  SqlOAuthPendingStore,
  SqlServerSessionRepository,
  ServerSessionGateway,
  TokenBroker,
  createDatabaseRuntimePolicy,
  type CredentialEncryptionKey,
  type OnyxSessionAuthority,
} from "@onyx/provider-neutral-credential-store-session-foundation";
import { createGoogleReadAdapter, type GoogleReadAdapter } from "@onyx/workspace-connectors";
import type { CredentialBinding } from "@onyx/provider-neutral-credential-store-session-foundation";
import type { AuthenticationProvider, AuthenticatedRequestContext } from "@onyx/account-authentication-server-authority";
import { createOnyxSessionAuthorityFactory, type OnyxAuthorityRuntimeContext, type OnyxSessionContext } from "./authority-factory.js";

export const GOOGLE_PROVIDER_ID = "google" as const;
export const GOOGLE_PURPOSE = "google-workspace-connector-v1" as const;
export const GOOGLE_CAPABILITY_FINGERPRINT = "calendar.events.read|files.metadata.read|mail.messages.read" as const;
export const GOOGLE_OAUTH_SCOPES = [
  "openid",
  "https://www.googleapis.com/auth/calendar.events.readonly",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/drive.metadata.readonly",
] as const;

export type GoogleServerConfig = {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly redirectUri: string;
};

export function readGoogleServerConfig(environment: Record<string, string | undefined> = process.env): GoogleServerConfig {
  const clientId = environment.ONYX_GOOGLE_CLIENT_ID;
  const clientSecret = environment.ONYX_GOOGLE_CLIENT_SECRET;
  const redirectUri = environment.ONYX_GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) throw new Error("Google server configuration is unavailable.");
  let parsed: URL;
  try { parsed = new URL(redirectUri); } catch { throw new Error("Google server configuration is unavailable."); }
  if (parsed.protocol !== "https:" || parsed.hostname !== "onyx-alpha0.netlify.app" || !redirectUri.endsWith("/.netlify/functions/oauth-google-callback")) throw new Error("Google server configuration is unavailable.");
  if (!clientId.trim() || clientId.length > 512 || clientSecret.length > 4096) throw new Error("Google server configuration is unavailable.");
  return { clientId, clientSecret, redirectUri };
}

export type GoogleOAuthToken = {
  readonly accessToken: string;
  readonly refreshToken?: string;
  readonly expiresInSeconds: number;
  readonly grantedScopes: readonly string[];
  readonly subject?: string;
};

export interface GoogleOAuthTransport {
  authorizationUrl(input: { readonly state: string; readonly codeChallenge: string; readonly reconnect: boolean }): string;
  exchangeCode(code: string, codeVerifier: string): Promise<GoogleOAuthToken>;
  refresh(refreshToken: string): Promise<GoogleOAuthToken>;
  revoke(refreshToken: string): Promise<void>;
}

export function createGoogleOAuthTransport(config: GoogleServerConfig, client: OAuth2Client = new OAuth2Client(config.clientId, config.clientSecret, config.redirectUri)): GoogleOAuthTransport {
  return {
    authorizationUrl: ({ state, codeChallenge, reconnect }) => client.generateAuthUrl({
      access_type: "offline", prompt: reconnect ? "consent" : "select_account", state,
      scope: [...GOOGLE_OAUTH_SCOPES], code_challenge: codeChallenge, code_challenge_method: CodeChallengeMethod.S256,
    }),
    exchangeCode: async (code, codeVerifier) => {
      const response = await client.getToken({ code, codeVerifier, redirect_uri: config.redirectUri });
      const tokens = response.tokens;
      if (!tokens.access_token || !tokens.expiry_date) throw new Error("Google token response is invalid.");
      return {
        accessToken: tokens.access_token,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiresInSeconds: Math.max(1, Math.floor((tokens.expiry_date - Date.now()) / 1000)),
        grantedScopes: typeof tokens.scope === "string" ? tokens.scope.split(" ").filter(Boolean) : [],
      };
    },
    refresh: async (refreshToken) => {
      client.setCredentials({ refresh_token: refreshToken });
      const response = await client.refreshAccessToken();
      const tokens = response.credentials;
      if (!tokens.access_token || !tokens.expiry_date) throw new Error("Google refresh response is invalid.");
      return {
        accessToken: tokens.access_token,
        ...(tokens.refresh_token ? { refreshToken: tokens.refresh_token } : {}),
        expiresInSeconds: Math.max(1, Math.floor((tokens.expiry_date - Date.now()) / 1000)),
        grantedScopes: typeof tokens.scope === "string" ? tokens.scope.split(" ").filter(Boolean) : [],
      };
    },
    revoke: async (refreshToken) => { await client.revokeToken(refreshToken); },
  };
}

export type GoogleServerRuntime = {
  readonly policy: ReturnType<typeof createDatabaseRuntimePolicy>;
  readonly config: GoogleServerConfig;
  readonly sessionGateway: ServerSessionGateway;
  readonly credentialStore: SqlCredentialStore;
  readonly oauthPendingStore: SqlOAuthPendingStore;
  readonly tokenBroker: TokenBroker;
  readonly oauth: GoogleOAuthTransport;
  readonly now: () => number;
  readonly createReadAdapter: (binding: CredentialBinding, fetcher?: typeof globalThis.fetch) => Promise<GoogleReadAdapter>;
  readonly authorityFactory?: ReturnType<typeof createOnyxSessionAuthorityFactory>;
};

export function createGoogleServerRuntime(input: {
  readonly database: DatabaseConnection;
  readonly authority: OnyxSessionAuthority;
  readonly authorityFactory?: ReturnType<typeof createOnyxSessionAuthorityFactory>;
  readonly encryptionKey: CredentialEncryptionKey;
  readonly environment?: Record<string, string | undefined>;
  readonly now?: () => number;
  readonly oauth?: GoogleOAuthTransport;
}): GoogleServerRuntime {
  const environment = input.environment ?? process.env;
  const context = environment.CONTEXT === "production" ? "production" : environment.NODE_ENV === "test" ? "test" : "unknown";
  if (context === "unknown") throw new Error("Google runtime context denied.");
  const config = readGoogleServerConfig(environment);
  const now = input.now ?? Date.now;
  const policy = createDatabaseRuntimePolicy(context, context === "production", false, false);
  const repository = new SqlServerSessionRepository(input.database);
  const credentialStore = new SqlCredentialStore(input.database, input.encryptionKey);
  const oauthPendingStore = new SqlOAuthPendingStore(input.database, input.encryptionKey, now);
  return {
    policy, config, now,
    sessionGateway: new ServerSessionGateway(input.authorityFactory?.authority ?? input.authority, now, repository),
    credentialStore,
    oauthPendingStore,
    tokenBroker: new TokenBroker(credentialStore, input.encryptionKey),
    oauth: input.oauth ?? createGoogleOAuthTransport(config),
    authorityFactory: input.authorityFactory,
    createReadAdapter: async (binding, fetcher = globalThis.fetch) => {
      const record = await credentialStore.findActive(binding);
      if (!record) throw new Error("Google connection is not available.");
      const context = { ...binding, recordId: record.recordId, expectedVersion: record.recordVersion };
      return createGoogleReadAdapter({
        fetch: fetcher,
        accessToken: async () => (await new TokenBroker(credentialStore, input.encryptionKey).withAccessToken(
          context,
          async (refreshToken) => input.oauth?.refresh(refreshToken) ?? (await createGoogleOAuthTransport(config).refresh(refreshToken)),
          async (accessToken) => ({ value: accessToken, expiresInSeconds: 300 }),
        )).value,
      });
    },
  };
}

export function createGoogleServerRuntimeWithCanonicalAuthority(input: Omit<Parameters<typeof createGoogleServerRuntime>[0], "authority" | "authorityFactory"> & {
  readonly authenticationProvider: AuthenticationProvider;
  readonly mapContext: (context: AuthenticatedRequestContext) => OnyxSessionContext;
  readonly runtimeContext: OnyxAuthorityRuntimeContext;
}): GoogleServerRuntime {
  const authorityFactory = createOnyxSessionAuthorityFactory({
    authenticationProvider: input.authenticationProvider,
    mapContext: input.mapContext,
    runtimeContext: input.runtimeContext,
    now: input.now,
  });
  return createGoogleServerRuntime({ ...input, authority: authorityFactory.authority, authorityFactory });
}

export * from "./handlers.js";
export * from "./authority-factory.js";