import { createHash } from "node:crypto";
import { OAuthPendingBindingMismatch, type CredentialBinding, type CredentialRecord, type GatewayRequest } from "@onyx/provider-neutral-credential-store-session-foundation";
import { GOOGLE_CAPABILITIES, GOOGLE_SCOPES, type CalendarQuery, type FileQuery, type MailQuery } from "@onyx/workspace-connectors";
import { GOOGLE_CAPABILITY_FINGERPRINT, GOOGLE_PROVIDER_ID, GOOGLE_PURPOSE, type GoogleServerRuntime } from "./index";

export type GoogleFunctionEvent = {
  readonly httpMethod?: string;
  readonly headers?: Record<string, string | undefined>;
  readonly body?: string | null;
  readonly queryStringParameters?: Record<string, string | undefined>;
};
export type GoogleFunctionResponse = { readonly statusCode: number; readonly headers?: Record<string, string>; readonly body: string };
export type GoogleFunctionHandler = (event: GoogleFunctionEvent) => Promise<GoogleFunctionResponse>;

const json = (statusCode: number, value: unknown, headers: Record<string, string> = { "content-type": "application/json" }): GoogleFunctionResponse => ({ statusCode, headers, body: JSON.stringify(value) });
const header = (event: GoogleFunctionEvent, name: string): string | undefined => Object.entries(event.headers ?? {}).find(([key]) => key.toLowerCase() === name.toLowerCase())?.[1];
const expectedOrigin = (event: GoogleFunctionEvent): string => process.env.ONYX_APP_ORIGIN ?? "https://onyx-alpha0.netlify.app";
const parseBody = (event: GoogleFunctionEvent): Record<string, unknown> => {
  if (!event.body) return {};
  const value: unknown = JSON.parse(event.body);
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("Request body rejected.");
  return value as Record<string, unknown>;
};
const sessionRequest = (event: GoogleFunctionEvent): GatewayRequest => {
  const authHeader = header(event, "authorization");
  const bearerProof = authHeader?.toLowerCase().startsWith("bearer ") ? authHeader.slice(7).trim() : undefined;
  return {
    method: event.httpMethod ?? "",
    cookieHeader: header(event, "cookie"),
    sessionProof: header(event, "x-onyx-session-proof") ?? bearerProof,
    origin: header(event, "origin"),
    expectedOrigin: expectedOrigin(event),
    csrfToken: header(event, "x-csrf-token"),
    idempotencyKey: header(event, "idempotency-key"),
    contentType: header(event, "content-type")?.split(";", 1)[0],
  };
};
const redirectFingerprint = (redirectUri: string): string => createHash("sha256").update(redirectUri).digest("base64url");
const codeChallenge = (verifier: string): string => createHash("sha256").update(verifier).digest("base64url");
export const canonicalizeGoogleCapabilities = (capabilities: readonly string[]): readonly string[] => {
  const normalized = new Set<string>();
  for (const capability of capabilities) {
    if (!GOOGLE_CAPABILITIES.includes(capability as (typeof GOOGLE_CAPABILITIES)[number])) throw new Error("Google capability request rejected.");
    normalized.add(capability);
  }
  if (normalized.size === 0) throw new Error("Google capability set is empty.");
  return Object.freeze([...normalized].sort((left, right) => left.localeCompare(right)));
};
export const fingerprintForCapabilities = (capabilities: readonly string[]): string => canonicalizeGoogleCapabilities(capabilities).join("|");
const googleCapabilityFingerprints = (() => {
  const fingerprints = new Set<string>();
  for (let mask = 1; mask < 1 << GOOGLE_CAPABILITIES.length; mask += 1) {
    const subset = canonicalizeGoogleCapabilities(GOOGLE_CAPABILITIES.filter((_, index) => (mask & (1 << index)) !== 0));
    fingerprints.add(fingerprintForCapabilities(subset));
  }
  return Object.freeze([...fingerprints].sort((left, right) => right.split("|").length - left.split("|").length || left.localeCompare(right)));
})();
const googleCapabilityToScope = (capability: string): string | undefined => {
  const index = GOOGLE_CAPABILITIES.indexOf(capability as (typeof GOOGLE_CAPABILITIES)[number]);
  return index >= 0 ? GOOGLE_SCOPES[index + 1] : undefined;
};
const matchingGoogleCapabilityFingerprints = (requiredCapability: string): readonly string[] => googleCapabilityFingerprints.filter((fingerprint) => fingerprint.split("|").includes(requiredCapability));
const active = (runtime: GoogleServerRuntime): GoogleFunctionResponse | undefined => runtime.policy.credentialOperationsEnabled ? undefined : json(503, { status: "UNAVAILABLE", message: "Google Workspace is not active in this environment." });
const failure = (error: unknown): GoogleFunctionResponse => json(400, { status: "ERROR_SAFE", message: error instanceof Error ? error.message : "Google request was rejected." });

function binding(account: string, capabilityFingerprint: string = GOOGLE_CAPABILITY_FINGERPRINT, connectorAccountRef = `google-account:${account}`): CredentialBinding {
  return { canonicalAccountRef: account, providerId: GOOGLE_PROVIDER_ID, connectorAccountRef, credentialType: "oauth-refresh-token", purpose: GOOGLE_PURPOSE, capabilityFingerprint };
}

export async function resolveGoogleCredentialBinding(runtime: GoogleServerRuntime, account: string, requiredCapability: string): Promise<{ binding: CredentialBinding; record: CredentialRecord } | undefined> {
  const capability = GOOGLE_CAPABILITIES.includes(requiredCapability as (typeof GOOGLE_CAPABILITIES)[number]) ? requiredCapability : undefined;
  if (!capability) return undefined;
  for (const capabilityFingerprint of matchingGoogleCapabilityFingerprints(capability)) {
    const candidateBinding = binding(account, capabilityFingerprint);
    const record = await runtime.credentialStore.findActive(candidateBinding);
    if (!record || !(record.state === "ACTIVE" || record.state === "ROTATING")) continue;
    if (record.canonicalAccountRef !== account || record.providerId !== GOOGLE_PROVIDER_ID || record.connectorAccountRef !== candidateBinding.connectorAccountRef || record.credentialType !== candidateBinding.credentialType || record.purpose !== GOOGLE_PURPOSE || record.capabilityFingerprint !== capabilityFingerprint) continue;
    return { binding: candidateBinding, record };
  }
  return undefined;
}

async function consumePendingOAuth(runtime: GoogleServerRuntime, state: string, account: string, sessionRef: string): Promise<string> {
  let lastError: unknown;
  for (const capabilityFingerprint of googleCapabilityFingerprints) {
    try {
      return await runtime.oauthPendingStore.consume(state, {
        providerId: GOOGLE_PROVIDER_ID,
        canonicalAccountRef: account,
        sessionRef,
        purpose: GOOGLE_PURPOSE,
        capabilityFingerprint,
        redirectUriFingerprint: redirectFingerprint(runtime.config.redirectUri),
      });
    } catch (error) {
      if (!(error instanceof OAuthPendingBindingMismatch)) throw error;
      lastError = error;
    }
  }
  throw lastError instanceof Error ? lastError : new Error("OAuth transaction unavailable");
}

export function createGoogleInitiateHandler(runtime: GoogleServerRuntime): GoogleFunctionHandler {
  return async (event) => {
    if (event.httpMethod !== "POST") return json(405, { status: "ERROR_SAFE", message: "Method not allowed." }, { allow: "POST", "content-type": "application/json" });
    const inactive = active(runtime); if (inactive) return inactive;
    try {
      const body = parseBody(event);
      const reconnect = body.reconnect === true;
      const requested = Array.isArray(body.capabilities) ? body.capabilities.filter((value): value is string => typeof value === "string") : [...GOOGLE_CAPABILITIES];
      if (requested.some((capability) => !GOOGLE_CAPABILITIES.includes(capability as (typeof GOOGLE_CAPABILITIES)[number]))) throw new Error("Google capability request rejected.");
      const validation = await runtime.sessionGateway.validate(sessionRequest(event), GOOGLE_PURPOSE, GOOGLE_CAPABILITY_FINGERPRINT);
      const capabilityFingerprint = fingerprintForCapabilities(requested);
      const idempotencyKey = header(event, "idempotency-key");
      if (!idempotencyKey) throw new Error("Idempotency key required.");
      const pending = await runtime.oauthPendingStore.createOrReplay({ providerId: GOOGLE_PROVIDER_ID, canonicalAccountRef: validation.context.canonicalAccountRef, sessionRef: validation.context.sessionRef, purpose: GOOGLE_PURPOSE, capabilityFingerprint, redirectUriFingerprint: redirectFingerprint(runtime.config.redirectUri) }, idempotencyKey, (state, verifier) => runtime.oauth.authorizationUrl({ state, codeChallenge: codeChallenge(verifier), reconnect }));
      return json(200, { status: "CONNECTING", authorizationUrl: pending.authorizationUrl, replayed: pending.replayed });
    } catch (error) { return failure(error); }
  };
}

export function createGoogleCsrfHandler(runtime: GoogleServerRuntime): GoogleFunctionHandler {
  return async (event) => {
    if (event.httpMethod !== "GET") return json(405, { status: "ERROR_SAFE", message: "Method not allowed." }, { allow: "GET", "content-type": "application/json" });
    const inactive = active(runtime); if (inactive) return inactive;
    try {
      const validation = await runtime.sessionGateway.validate(sessionRequest(event), `${GOOGLE_PURPOSE}:csrf`, GOOGLE_CAPABILITY_FINGERPRINT);
      const csrfToken = await runtime.sessionGateway.issueCsrf(validation.context.sessionRef);
      return json(200, { csrfToken, expiresInSeconds: 900 });
    } catch (error) { return failure(error); }
  };
}

export function createGoogleCallbackHandler(runtime: GoogleServerRuntime): GoogleFunctionHandler {
  return async (event) => {
    if (event.httpMethod !== "GET") return json(405, { status: "ERROR_SAFE", message: "Method not allowed." }, { allow: "GET", "content-type": "application/json" });
    const inactive = active(runtime); if (inactive) return inactive;
    const params = event.queryStringParameters ?? {};
    if (!params.state || !params.code) return failure(new Error("Google authorization could not be completed."));
    try {
      const validation = await runtime.sessionGateway.validate(sessionRequest(event), GOOGLE_PURPOSE, GOOGLE_CAPABILITY_FINGERPRINT);
      const codeVerifier = await consumePendingOAuth(runtime, params.state, validation.context.canonicalAccountRef, validation.context.sessionRef);
      const token = await runtime.oauth.exchangeCode(params.code, codeVerifier);
      const grantedCapabilities = GOOGLE_CAPABILITIES.filter((capability) => {
        const scope = googleCapabilityToScope(capability);
        return scope ? token.grantedScopes.includes(scope) : false;
      });
      const capabilities = canonicalizeGoogleCapabilities(grantedCapabilities);
      if (capabilities.length === 0) throw new Error("Google authorization granted no supported readonly capabilities.");
      if (!token.refreshToken) throw new Error("Google reauthentication is required.");
      const capabilityFingerprint = fingerprintForCapabilities(capabilities);
      await runtime.credentialStore.create(binding(validation.context.canonicalAccountRef, capabilityFingerprint), token.refreshToken);
      const status = capabilities.length === GOOGLE_CAPABILITIES.length ? "connected" : "connected-partial";
      return { statusCode: 302, headers: { location: `https://onyx-alpha0.netlify.app/?google_status=${status}` }, body: "" };
    } catch (error) { return { statusCode: 302, headers: { location: "https://onyx-alpha0.netlify.app/?google_status=error-safe" }, body: "" }; }
  };
}

export function createGoogleStatusHandler(runtime: GoogleServerRuntime): GoogleFunctionHandler {
  return async (event) => {
    if (event.httpMethod !== "GET") return json(405, { status: "ERROR_SAFE", message: "Method not allowed." });
    const inactive = active(runtime); if (inactive) return inactive;
    try {
      const validation = await runtime.sessionGateway.validate(sessionRequest(event), GOOGLE_PURPOSE, GOOGLE_CAPABILITY_FINGERPRINT);
      const capabilities = await Promise.all(GOOGLE_CAPABILITIES.map(async (capability) => {
        const resolved = await resolveGoogleCredentialBinding(runtime, validation.context.canonicalAccountRef, capability);
        return [capability, resolved ? "connected" : "insufficient-scope"] as const;
      }));
      const connected = capabilities.filter(([, state]) => state === "connected").length;
      return json(200, { status: connected === 0 ? "NOT_CONNECTED" : connected === GOOGLE_CAPABILITIES.length ? "CONNECTED" : "CONNECTED_PARTIAL", capabilities: Object.fromEntries(capabilities), freshness: "CURRENT" });
    } catch (error) { return failure(error); }
  };
}

export function createGoogleDisconnectHandler(runtime: GoogleServerRuntime): GoogleFunctionHandler {
  return async (event) => {
    if (event.httpMethod !== "POST") return json(405, { status: "ERROR_SAFE", message: "Method not allowed." });
    const inactive = active(runtime); if (inactive) return inactive;
    try {
      const validation = await runtime.sessionGateway.validate(sessionRequest(event), GOOGLE_PURPOSE, GOOGLE_CAPABILITY_FINGERPRINT);
      const deleted = new Set<string>();
      for (const capability of GOOGLE_CAPABILITIES) {
        const resolved = await resolveGoogleCredentialBinding(runtime, validation.context.canonicalAccountRef, capability);
        if (resolved && !deleted.has(resolved.record.recordId)) {
          await runtime.credentialStore.delete(resolved.record.recordId, resolved.binding);
          deleted.add(resolved.record.recordId);
        }
      }
      return json(200, { status: "DISCONNECTED" });
    } catch (error) { return failure(error); }
  };
}

async function queryHandler(runtime: GoogleServerRuntime, event: GoogleFunctionEvent, capability: string, run: (adapter: Awaited<ReturnType<GoogleServerRuntime["createReadAdapter"]>>, body: Record<string, unknown>) => Promise<unknown>): Promise<GoogleFunctionResponse> {
  if (event.httpMethod !== "POST") return json(405, { status: "ERROR_SAFE", message: "Method not allowed." });
  const inactive = active(runtime); if (inactive) return inactive;
  try {
    const validation = await runtime.sessionGateway.validate(sessionRequest(event), `${GOOGLE_PURPOSE}:${capability}`, capability);
    const resolved = await resolveGoogleCredentialBinding(runtime, validation.context.canonicalAccountRef, capability);
    if (!resolved) throw new Error("Google connection is not available for this capability.");
    const adapter = await runtime.createReadAdapter(resolved.binding);
    return json(200, { status: "CONNECTED", result: await run(adapter, parseBody(event)) });
  } catch (error) { return failure(error); }
}

export const createGoogleCalendarHandler = (runtime: GoogleServerRuntime): GoogleFunctionHandler => (event) => queryHandler(runtime, event, "calendar.events.read", (adapter, body) => adapter.listCalendar(body as unknown as CalendarQuery));
export const createGoogleGmailHandler = (runtime: GoogleServerRuntime): GoogleFunctionHandler => (event) => queryHandler(runtime, event, "mail.messages.read", (adapter, body) => adapter.listMail(body as unknown as MailQuery));
export const createGoogleDriveHandler = (runtime: GoogleServerRuntime): GoogleFunctionHandler => (event) => queryHandler(runtime, event, "files.metadata.read", (adapter, body) => adapter.listFiles(body as unknown as FileQuery));