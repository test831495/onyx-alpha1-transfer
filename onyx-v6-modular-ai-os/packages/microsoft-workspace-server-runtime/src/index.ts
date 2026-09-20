import {
  createDatabaseRuntimePolicy,
  readDatabaseRuntimeContext,
  ServerSessionGateway,
  type CredentialBinding,
  type CredentialRecord,
  type OnyxSessionAuthority,
  type ServerSessionRepository,
} from "@onyx/provider-neutral-credential-store-session-foundation";
import type { SqlCredentialStore } from "@onyx/provider-neutral-credential-store-session-foundation";

export const MICROSOFT_PROVIDER_ID = "microsoft" as const;
export const MICROSOFT_PURPOSE = "microsoft-workspace-connector-v1" as const;
export const MICROSOFT_RUNTIME_ACTIVATION_STATES = ["DISABLED", "ENABLED_FOR_TEST"] as const;
export type MicrosoftRuntimeActivation = (typeof MICROSOFT_RUNTIME_ACTIVATION_STATES)[number];

export type MicrosoftServerConfig = {
  readonly clientId: string;
  readonly clientSecret: string;
  readonly tenantId: string;
  readonly redirectUri: string;
  readonly requiredTenantId?: string;
};

export function readMicrosoftServerConfig(environment: Record<string, string | undefined> = process.env): MicrosoftServerConfig {
  const clientId = environment.ONYX_MS_CLIENT_ID;
  const clientSecret = environment.ONYX_MS_CLIENT_SECRET;
  const tenantId = environment.ONYX_MS_TENANT_ID;
  const redirectUri = environment.ONYX_MS_REDIRECT_URI;
  if (!clientId || !clientSecret || !tenantId || !redirectUri) throw new Error("Microsoft server configuration is unavailable.");
  let parsed: URL;
  try { parsed = new URL(redirectUri); } catch { throw new Error("Microsoft server configuration is unavailable."); }
  if (parsed.protocol !== "https:") throw new Error("Microsoft server configuration is unavailable.");
  if (!clientId.trim() || clientId.length > 512 || clientSecret.length > 4096) throw new Error("Microsoft server configuration is unavailable.");
  const requiredTenantId = environment.ONYX_MS_REQUIRED_TENANT_ID?.trim() || undefined;
  return Object.freeze({ clientId, clientSecret, tenantId, redirectUri, requiredTenantId });
}

export interface MicrosoftCredentialStoreLike {
  findActive(binding: CredentialBinding): Promise<CredentialRecord | undefined>;
  create(binding: CredentialBinding, plaintext: string): Promise<CredentialRecord>;
  delete(recordId: string, binding: CredentialBinding): Promise<void>;
}

export type MicrosoftServerRuntime = {
  readonly runtimeKind: "MICROSOFT_SERVER_RUNTIME_FOUNDATION";
  readonly activation: MicrosoftRuntimeActivation;
  readonly policy: ReturnType<typeof createDatabaseRuntimePolicy>;
  readonly config: MicrosoftServerConfig;
  readonly sessionGateway: ServerSessionGateway;
  readonly credentialStore: MicrosoftCredentialStoreLike;
  readonly now: () => number;
};

export function createMicrosoftServerRuntime(input: {
  readonly activation?: MicrosoftRuntimeActivation;
  readonly authority: OnyxSessionAuthority;
  readonly sessionRepository: ServerSessionRepository;
  readonly credentialStore: MicrosoftCredentialStoreLike | SqlCredentialStore;
  readonly environment?: Record<string, string | undefined>;
  readonly now?: () => number;
}): MicrosoftServerRuntime {
  const environment = input.environment ?? process.env;
  const context = readDatabaseRuntimeContext(environment);
  if (context !== "production" && context !== "test") throw new Error("Microsoft runtime context denied.");
  const config = readMicrosoftServerConfig(environment);
  const now = input.now ?? Date.now;
  // credentialOperationsEnabled deliberately stays false here: activation is disabled by
  // default, and this foundation is never wired to production tokens or live Graph calls.
  const activation = input.activation ?? "DISABLED";
  const policy = createDatabaseRuntimePolicy(context, false, false, false);
  return Object.freeze({
    runtimeKind: "MICROSOFT_SERVER_RUNTIME_FOUNDATION",
    activation,
    policy,
    config,
    sessionGateway: new ServerSessionGateway(input.authority, now, input.sessionRepository),
    credentialStore: input.credentialStore as MicrosoftCredentialStoreLike,
    now,
  });
}
